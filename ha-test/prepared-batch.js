const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { connect, readConfig, repoRoot } = require('./client');
const { candidateIdentity, readPreparedReceipt, verifyPrepared } = require('./upgrade/prepared');
const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";

function readBatchSnapshot(config, request, ssh) {
  const base = config.remoteConfigPath;
  assert.match(request.slug, /^[a-z0-9][a-z0-9_-]*$/);
  const directories = ['custom_components/marao_dashboard', 'dashboard/MaraoDashboard/' + request.slug,
    ...request.domains.map(domain => { assert.match(domain, /^(marao_test_[a-z0-9_]+|history|frigate|unifiprotect)$/); return 'custom_components/' + domain; })];
  const files = ['dashboard/MaraoDashboard/dashboard.json', ...request.files];
  for (const file of files) assert.ok(!file.startsWith('/') && file.split('/').every(part => part && !['.', '..'].includes(part)));
  const command = [
    'test ! -e ' + quote(base + '/.marao-upgrade-active.json') + ' || exit 1',
    'test ! -e ' + quote(base + '/dashboard/MaraoDashboard/.history/.operation') + ' || exit 1',
    ...directories.map(directory => {
      const value = quote(base + '/' + directory);
      return `test -d ${value} && test -z "$(find ${value} -type l -print)" && find ${value} -type f -exec sha256sum '{}' '+' || exit 1`;
    }),
    ...files.map(file => 'test ! -L ' + quote(base + '/' + file) + ' && sha256sum ' + quote(base + '/' + file) + ' || exit 1'),
  ].join('\n');
  const hashes = {};
  for (const line of ssh(config, command).stdout.trim().split('\n')) {
    const match = line.match(/^([a-f0-9]{64}) [ *](.+)$/);
    assert.ok(match && match[2].startsWith(base + '/'), 'Invalid private file-hash response');
    hashes[match[2].slice(base.length + 1)] = match[1];
  }
  const tree = (directory, packageFiles = false) => Object.fromEntries(Object.entries(hashes).filter(([file]) => file.startsWith(directory + '/'))
    .map(([file, hash]) => [file.slice(directory.length + 1), hash]).filter(([file]) => !packageFiles || !file.split('/').some(part => part.startsWith('.') || part === '__pycache__') && !/\.py[co]$/.test(file)).sort());
  const providers = Object.fromEntries(request.domains.map(domain => [domain, tree('custom_components/' + domain, true)]));
  const ownerHash = crypto.createHash('sha256').update('{"owner":"marao-dashboard-tests"}\n').digest('hex');
  return { source_sha256: hashes['dashboard/MaraoDashboard/dashboard.json'], operation_id: null, recovering: false,
    output: tree('dashboard/MaraoDashboard/' + request.slug), package: tree('custom_components/marao_dashboard', true),
    providers, owners: Object.fromEntries(request.domains.map(domain => [domain, providers[domain]['marao-fixture.json'] === ownerHash ? 'marao-dashboard-tests' : null])),
    fixtures: Object.fromEntries(request.files.map(file => [file, hashes[file]])) };
}

async function prepareBatch(directory, dependencies = {}) {
  const { prepare, ssh, patchPackages } = dependencies.prepare || require('./prepare');
  const config = (dependencies.readConfig || readConfig)();
  assert.equal(new URL(config.url).hostname, '192.168.0.28');
  assert.equal(config.sshHost, '192.168.0.28');
  await prepare(config);
  const client = await (dependencies.connect || connect)(config);
  try {
    const entries = await client.call({ type: 'config_entries/get' });
    assert.equal(entries.filter(row => row.domain === 'marao_dashboard').length, 1);
    const expected = require('../tests/test-ha-upgrade').plan(config).current;
    assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config), expected, 'Prepared source differs from the safe canonical fixture');
    const remoteYaml = ssh(config, 'cat ' + quote(config.remoteConfigPath + '/configuration.yaml')).stdout;
    const helper = patchPackages(remoteYaml).helperPath;
    const domains = fs.readdirSync(path.join(repoRoot, 'ha-test/custom_components')).sort();
    const snapshot = (dependencies.readBatchSnapshot || readBatchSnapshot)(config, { slug: expected.slug, domains, files: [helper] }, ssh);
    assert.equal(snapshot.operation_id, null, 'Cannot prepare while an upgrade is active');
    const helperStates = Object.fromEntries((await client.call({ type: 'get_states' }))
      .filter(row => /^(input_boolean|input_number|input_select|input_text)\.marao_dashboard_test_/.test(row.entity_id)).map(row => [row.entity_id, row.state]));
    const receipt = { version: 2, kind: 'prepared-browser-batch', operation_id: crypto.randomUUID(), created_at: new Date().toISOString(),
      target: config.url, remote_config_path: config.remoteConfigPath, dashboard_key: 'marao-dashboard',
      entry_id: entries.find(row => row.domain === 'marao_dashboard').entry_id, candidate: candidateIdentity(),
      source_sha256: snapshot.source_sha256, expected_config: expected, output: { slug: expected.slug, files: snapshot.output },
      fixture_domains: domains, fixture_files: snapshot.fixtures, helper_states: helperStates };
    const filename = path.join(directory, 'prepared-batch.json');
    fs.writeFileSync(filename, JSON.stringify(receipt), { mode: 0o600 });
    await (dependencies.verifyBatch || verifyBatch)(filename);
    return filename;
  } finally { client.close(); }
}

async function verifyBatch(filename) {
  const config = readConfig();
  const receipt = readPreparedReceipt(filename, config, candidateIdentity(), { batch: true });
  assert.deepEqual(receipt.expected_config, require('../tests/test-ha-upgrade').plan(config).current, 'Batch source is not the safe canonical fixture');
  return verifyPrepared(config, filename, { ...require('./prepare'), operationCompleted: true, batch: true });
}

async function restoreBatch(filename) {
  const config = readConfig();
  const receipt = readPreparedReceipt(filename, config, candidateIdentity(), { batch: true });
  const client = await connect(config);
  try {
    const current = Object.fromEntries((await client.call({ type: 'get_states' })).filter(row => Object.hasOwn(receipt.helper_states, row.entity_id)).map(row => [row.entity_id, row.state]));
    const changed = changedHelpers(receipt.helper_states, current);
    await require('./prepare').restoreHelperStates(config, changed);
    const states = Object.fromEntries((await client.call({ type: 'get_states' })).filter(row => Object.hasOwn(receipt.helper_states, row.entity_id)).map(row => [row.entity_id, row.state]));
    assert.deepEqual(states, receipt.helper_states, 'Safe helper cleanup is incomplete');
  } finally { client.close(); }
  await verifyBatch(filename);
}

function changedHelpers(baseline, current) {
  assert.deepEqual(Object.keys(current).sort(), Object.keys(baseline).sort(), 'A recorded helper disappeared');
  return Object.fromEntries(Object.entries(baseline).filter(([id, value]) => current[id] !== value));
}

module.exports = { changedHelpers, prepareBatch, readBatchSnapshot, restoreBatch, verifyBatch };
