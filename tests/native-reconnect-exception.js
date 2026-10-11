const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { repoRoot } = require('../ha-test/client');

const fix = '4c5674c36cc898bbd38abc54b4d89777e37a8496';

function validateKnownFailure(evidence, target) {
  assert.equal(evidence.version, 1); assert.equal(evidence.target, target);
  assert.equal(evidence.functional_completed, true, 'The comprehensive e2e did not finish');
  assert.equal(evidence.safe_actions_disabled, true); assert.equal(evidence.disconnected_dispatches, 0);
  assert.equal(evidence.authoritative_recovery, true);
  assert.equal(evidence.errors.length, 1);
  assert.match(evidence.errors[0], /^Object(?: \(\/frontend_latest\/[^)]+\.js\))?$/);
  assert.deepEqual(evidence.rejections, ['not_found: Subscription not found.']);
  assert.equal(evidence.native_failures.length, 1);
  const failure = evidence.native_failures[0];
  assert.equal(failure.code, 'not_found'); assert.equal(failure.message, 'Subscription not found.');
  assert.ok(Number.isInteger(failure.connection));
  const stale = evidence.subscriptions.find(row => row.connection === failure.connection && row.id === failure.id);
  assert.equal(stale?.type, 'unsubscribe_events');
  const before = evidence.subscriptions.find(row => row.connection < stale.connection && row.id === stale.subscription && ['subscribe_entities', 'persistent_notification/subscribe'].includes(row.type));
  assert.equal(before?.phase, 'connected');
  assert.ok(evidence.subscriptions.some(row => row.type === before.type && row.connection === stale.connection && ['recovering', 'connected'].includes(row.phase) && row.id < stale.id), 'Missing native resubscription before stale cancellation');
}

async function undeliveredFix(get = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  assert.ok(response.ok, 'Official Home Assistant delivery evidence is unavailable');
  return response;
}) {
  const api = 'https://api.github.com/repos/home-assistant/';
  const raw = 'https://raw.githubusercontent.com/home-assistant/';
  const core = await (await get(api + 'core/releases/latest')).json();
  const frontend = await (await get(api + 'frontend/releases/latest')).json();
  assert.equal(core.prerelease, false); assert.equal(frontend.prerelease, false);
  const manifest = await (await get(raw + `core/${core.tag_name}/homeassistant/components/frontend/manifest.json`)).json();
  const delivered = manifest.requirements.find(value => value.startsWith('home-assistant-frontend==')).split('==')[1];
  const checks = [];
  for (const tag of new Set([delivered, frontend.tag_name])) {
    const lock = await (await get(raw + `frontend/${tag}/pnpm-lock.yaml`)).text();
    const version = lock.match(/home-assistant-js-websocket:\n\s+specifier:[^\n]+\n\s+version: ([\d.]+)/)?.[1];
    assert.ok(version, 'Missing stable frontend WebSocket identity');
    const comparison = await (await get(api + `home-assistant-js-websocket/compare/${version}...${fix}`)).json();
    assert.equal(comparison.status, 'ahead', 'The native reconnect fix is now delivered; its publication exception has expired');
    assert.equal(comparison.behind_by, 0); assert.ok(comparison.ahead_by > 0);
    checks.push({ frontend: tag, websocket: version, comparison: comparison.status, ahead_by: comparison.ahead_by });
  }
  return { checked_at: new Date().toISOString(), core: core.tag_name, latest_stable_frontend: frontend.tag_name, delivered_frontend: delivered, fix, checks };
}

async function e2eWithApprovedException(config, directory, theme = 'light', env = {}) {
  const evidencePath = path.join(directory, `native-reconnect-${theme}.json`);
  fs.rmSync(evidencePath, { force: true });
  fs.rmSync(evidencePath + '.exit.json', { force: true });
  const log = path.join(directory, `e2e-${theme}.log`), fd = fs.openSync(log, 'w', 0o600);
  let status;
  try {
    status = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['tests/test-ha-dashboard-e2e.js', '--screenshots', '--theme=' + theme, '--reconnect-evidence=' + evidencePath],
        { cwd: repoRoot, env: { ...process.env, ...env }, stdio: ['ignore', fd, fd] });
      child.on('error', reject); child.on('exit', resolve);
    });
  } finally { fs.closeSync(fd); }
  if (status === 0) return { passed: true, log };
  assert.equal(status, 1, 'E2e process failed without the approved native failure');
  const evidence = JSON.parse(fs.readFileSync(evidencePath));
  validateKnownFailure(evidence, config.url);
  const exit = JSON.parse(fs.readFileSync(evidencePath + '.exit.json'));
  assert.equal(exit.stage, 'disconnect-browser-errors', 'E2e failed at another stage or during cleanup');
  assert.equal(exit.message, `Disconnect scenario produced unexpected browser errors:\n${[...evidence.errors, ...evidence.rejections].join('\n')}\nSubscription lifecycle: ${JSON.stringify(evidence.subscriptions)}`);
  const delivery = await undeliveredFix();
  const result = { passed: true, approved_exception: 'native-ha-stale-unsubscribe', raw_e2e_passed: false, log, evidence: evidencePath, delivery };
  fs.writeFileSync(path.join(directory, 'approved-native-exception-' + theme + '.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log('User-approved native reconnect exception applied; the raw failing assertions are retained in ' + evidencePath);
  return result;
}

module.exports = { e2eWithApprovedException, undeliveredFix, validateKnownFailure };
