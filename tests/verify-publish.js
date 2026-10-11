const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { readConfig, repoRoot } = require('../ha-test/client');
const { e2eWithApprovedException } = require('./native-reconnect-exception');

async function run(script, args = []) {
  console.log('Publication check: ' + script);
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script, ...args], { cwd: repoRoot, stdio: 'inherit', env: process.env });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(script + ' failed')));
  });
}

async function main() {
  await run('test');
  const directory = path.join(repoRoot, 'tests/.artifacts/publication');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.rmSync(path.join(directory, 'result.json'), { force: true });
  const e2e = await e2eWithApprovedException(readConfig(), directory);
  await run('test:ha:accessibility', ['--', '--pages']);
  for (const script of ['test:ha:alignment', 'test:ha:sliders']) await run(script);
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify({ completed_at: new Date().toISOString(), e2e, passed: true }, null, 2), { mode: 0o600 });
  console.log('Publication checks passed' + (e2e.approved_exception ? ' with the explicit native reconnect exception.' : '.'));
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
