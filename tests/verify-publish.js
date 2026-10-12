const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { readConfig, repoRoot } = require('../ha-test/client');
const { e2eWithApprovedException, readKnownFailure, undeliveredFix } = require('./native-reconnect-exception');
const assert = require('node:assert/strict');

async function run(script, args = []) {
  console.log('Publication check: ' + script);
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script, ...args], { cwd: repoRoot, stdio: 'inherit', env: process.env });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(script + ' failed')));
  });
}

async function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--upgrade-report'), 'Use verify:publish with no arguments or --upgrade-report /absolute/private/report.json.');
  let upgrade;
  if (args.length) {
    upgrade = require('./verify-release').verifyRelease(args[1], { publish: false });
    const { ssh, referencedEntities } = require('../ha-test/prepare');
    await require('../ha-test/upgrade/prepared').verifyPrepared(readConfig(), path.join(path.dirname(args[1]), 'pretest-receipt.json'), {
      ssh, referencedEntities, operationCompleted: true,
    });
    const exceptions = upgrade.runs.filter(row => row.evidence?.approved_exception);
    for (const filename of new Set(exceptions.map(row => row.evidence.evidence))) readKnownFailure(filename, upgrade.target);
    if (exceptions.length) await undeliveredFix();
  }
  await run('test');
  const directory = path.join(repoRoot, 'tests/.artifacts/publication');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.rmSync(path.join(directory, 'result.json'), { force: true });
  if (upgrade) {
    const { ssh, referencedEntities } = require('../ha-test/prepare');
    await require('../ha-test/upgrade/prepared').verifyPrepared(readConfig(), path.join(path.dirname(args[1]), 'pretest-receipt.json'), {
      ssh, referencedEntities, operationCompleted: true,
    });
    assert.deepEqual(require('../ha-test/upgrade/prepared').candidateIdentity(), upgrade.candidate, 'Candidate changed during publication checks.');
    fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify({ completed_at: new Date().toISOString(), candidate: upgrade.candidate,
      upgrade_operation: upgrade.operation_id, browser_evidence: 'preserved-install', passed: true }), { mode: 0o600 });
    console.log('Publication checks passed using validated exact-candidate preserved-install browser evidence.');
    return;
  }
  const e2e = await e2eWithApprovedException(readConfig(), directory);
  await run('test:ha:accessibility', ['--', '--pages']);
  await run('test:ha:alignment');
  for (const profile of ['iphone-normal', 'android-normal']) await run('test:ha:sliders', ['--', '--scenario', profile]);
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify({ completed_at: new Date().toISOString(), e2e, passed: true }, null, 2), { mode: 0o600 });
  console.log('Publication checks passed' + (e2e.approved_exception ? ' with the explicit native reconnect exception.' : '.'));
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
