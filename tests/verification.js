const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const { checksFor, selectComponents, components } = require('./verification-map');

const root = path.resolve(__dirname, '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function parseArgs(argv = process.argv.slice(2)) {
  const options = { components: [], full: false, parallel: false, plan: false, offline: false, release: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (['--full', '--parallel', '--plan', '--offline', '--release', '--help'].includes(arg)) options[arg.slice(2)] = true;
    else if (['--base', '--head', '--component', '--report', '--upgrade-report'].includes(arg)) {
      assert.ok(argv[i + 1] && !argv[i + 1].startsWith('--'), arg + ' requires a value');
      const value = argv[++i];
      if (arg === '--component') options.components.push(...value.split(','));
      else options[arg.slice(2).replace('-report', 'Report')] = value;
    } else throw new Error('Unknown verification option: ' + arg);
  }
  return options;
}

function changedFiles(options, cwd = root) {
  const head = git(['rev-parse', '--verify', (options.head || 'HEAD') + '^{commit}'], cwd);
  let baseRef = options.base;
  if (!baseRef && options.release) {
    let releases;
    try { releases = JSON.parse(execFileSync('gh', ['release', 'list', '--limit', '100', '--json', 'tagName,isDraft,isPrerelease'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })); }
    catch { throw new Error('Cannot resolve published release baseline; provide --base <verified-released-ref>.'); }
    const tags = releases.filter(release => !release.isDraft && !release.isPrerelease && /^v\d+\.\d+\.\d+$/.test(release.tagName)).map(release => release.tagName);
    // A tag on HEAD is the candidate being published, not its preceding release.
    baseRef = tags.find(tag => {
      try { return git(['rev-parse', tag + '^{commit}'], cwd) !== head && execFileSync('git', ['merge-base', '--is-ancestor', tag, head], { cwd, stdio: 'pipe' }) !== null; }
      catch { return false; }
    });
    assert.ok(baseRef, 'No previous release baseline; provide --base <released-ref>.');
  }
  baseRef ||= 'HEAD';
  const base = git(['rev-parse', '--verify', baseRef + '^{commit}'], cwd);
  const split = value => value.split('\0').filter(Boolean);
  const committed = split(execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head], { cwd, encoding: 'utf8' }));
  const working = options.head ? [] : split(execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', head], { cwd, encoding: 'utf8' }));
  const untracked = options.head ? [] : split(execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd, encoding: 'utf8' }));
  return { base, baseRef, head, files: [...new Set([...committed, ...working, ...untracked])].sort() };
}

function makePlan(options = {}, comparison = changedFiles(options)) {
  const selection = options.full ? { components: Object.keys(components), reasons: {}, directTests: [] }
    : selectComponents(comparison.files, options.components || [], { conservativeShared: !!options.offline });
  const checks = checksFor(selection, options);
  const upgradeRequired = selection.components.some(id => components[id].upgrade);
  if (!options.offline && !options.full && options.release && upgradeRequired) {
    checks.push({ id: 'preserved-upgrade', kind: 'upgrade', exclusive: true,
      command: ['node', 'tests/test-ha-upgrade.js', '--scope', selection.components.join(',')], inputs: ['custom_components/marao_dashboard', 'ha-test/upgrade', 'tests/test-ha-upgrade.js', 'tests/upgrade'] });
  }
  return { version: 1, mode: options.full ? 'full' : 'affected', parallel: !!options.parallel, offline: !!options.offline,
    ...comparison, components: selection.components, reasons: selection.reasons, checks, upgradeRequired,
    excluded: options.offline ? ['live browser checks', 'mobile layouts', 'preserved-install upgrades'] : options.full ? [] : ['unrelated suites', 'complete mobile matrix', 'unaffected historical baselines'] };
}

function inputHashes(inputs, cwd = root) {
  const result = {};
  const visit = relative => {
    const file = path.join(cwd, relative);
    if (!fs.existsSync(file)) { result[relative] = 'missing'; return; }
    const stat = fs.lstatSync(file);
    assert.ok(!stat.isSymbolicLink(), 'Symlinked verification input: ' + relative);
    if (stat.isFile()) result[relative] = digest(fs.readFileSync(file));
    else if (stat.isDirectory()) for (const name of fs.readdirSync(file).sort()) {
      if (name.startsWith('.') || ['__pycache__', 'node_modules', 'ssh', 'local.json', 'local.example.json'].includes(name) || /\.(pyc|pyo)$/.test(name)) continue;
      visit(relative + '/' + name);
    }
  };
  for (const relative of [...new Set(inputs)].sort()) visit(relative);
  return result;
}

function checkIdentity(check, cwd = root) {
  return digest(JSON.stringify({ command: check.command, inputs: inputHashes([...check.inputs, 'tests/verification.js', 'tests/verification-map.js', 'package-lock.json'], cwd) }));
}

function validateEvidence(report, plan, identities, { target, now = Date.now(), exactCommit = false } = {}) {
  assert.equal(report?.version, 3, 'Unsupported scoped verification report');
  assert.equal(report.kind, 'scoped-verification');
  assert.equal(report.passed, true, 'Scoped verification failed');
  assert.equal(report.verified_cleanup, true, 'Verification cleanup is incomplete');
  assert.equal(report.base, plan.base, 'Comparison baseline changed');
  if (exactCommit) assert.equal(report.head, plan.head, 'Final candidate commit changed');
  assert.deepEqual(report.components, plan.components, 'Affected consumers or scope changed');
  assert.equal(report.mode, plan.mode, 'Focused proof cannot be labeled comprehensive');
  if (target !== undefined) assert.equal(report.target, target, 'Verification target changed');
  const completed = Date.parse(report.completed_at);
  assert.ok(Number.isFinite(completed) && completed <= now && now - completed < 86400000, 'Verification proof is stale');
  const ids = plan.checks.map(check => check.id).sort();
  assert.deepEqual(report.required.slice().sort(), ids, 'Required checks were omitted or exclusions edited');
  for (const id of ids) {
    const rows = report.results.filter(row => row.id === id);
    assert.equal(rows.length, 1, 'Missing or duplicate result: ' + id);
    assert.equal(rows[0].passed, true, 'Failed selected check: ' + id);
    assert.equal(rows[0].input_sha256, identities[id], 'Changed code/test/selector inputs: ' + id);
  }
  const requiresCaptures = plan.checks.some(check => check.command?.includes('--screenshots') && check.command.includes('review'));
  if (requiresCaptures || report.results.some(row => Object.keys(row.captures || {}).length)) assert.ok(report.artifact_root, 'Missing captured evidence root');
  if (report.artifact_root) {
    assert.ok(path.isAbsolute(report.artifact_root), 'Invalid private artifact root');
    for (const row of report.results) {
      const check = plan.checks.find(check => check.id === row.id);
      if (check?.command?.includes('--screenshots') && check.command.includes('review')) assert.ok(Object.keys(row.captures || {}).length, 'Missing representative capture');
      for (const [relative, hash] of Object.entries(row.captures || {})) {
      assert.ok(!path.isAbsolute(relative) && relative.split('/').every(part => part && part !== '..' && part !== '.'), 'Invalid capture path');
      const file = path.join(report.artifact_root, relative), stat = fs.lstatSync(file);
      assert.ok(stat.isFile() && !stat.isSymbolicLink() && !(stat.mode & 0o077), 'Capture must be private');
      assert.equal(digest(fs.readFileSync(file)), hash, 'Changed browser capture');
      }
    }
  }
  return report;
}

async function schedule(checks, execute, { parallel = false, signal } = {}) {
  const results = [];
  const pending = new Set();
  let failed;
  const start = check => {
    const started = Date.now();
    const task = Promise.resolve().then(() => execute(check, signal)).then(value => {
      results.push({ id: check.id, passed: true, duration_ms: Date.now() - started, ...value });
    }, error => { failed ||= error; results.push({ id: check.id, passed: false, duration_ms: Date.now() - started, error: error.message }); })
      .finally(() => pending.delete(task));
    pending.add(task);
    return task;
  };
  for (const check of checks) {
    if (failed || signal?.aborted) break;
    if (!parallel || check.exclusive) {
      await Promise.all(pending);
      if (failed || signal?.aborted) break;
      await start(check);
    } else {
      while (pending.size >= 3) await Promise.race(pending);
      if (!failed && !signal?.aborted) start(check);
    }
  }
  await Promise.all(pending);
  return { results, failure: failed || (signal?.aborted ? new Error('Verification cancelled') : null) };
}

function readPrivate(filename) {
  assert.ok(path.isAbsolute(filename), 'Evidence requires an absolute private path');
  const stat = fs.lstatSync(filename);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && !(stat.mode & 0o077), 'Evidence must be a private regular file');
  return JSON.parse(fs.readFileSync(filename));
}

async function runPlan(plan, options = {}) {
  fs.mkdirSync(path.join(root, 'tests/.artifacts/verification'), { recursive: true, mode: 0o700 });
  const directory = fs.mkdtempSync(path.join(root, 'tests/.artifacts/verification/run-'));
  fs.chmodSync(directory, 0o700);
  const identities = Object.fromEntries(plan.checks.map(check => [check.id, checkIdentity(check)]));
  const report = { version: 3, kind: 'scoped-verification', ...plan, required: plan.checks.map(check => check.id), results: [],
    artifact_root: directory, started_at: new Date().toISOString(), passed: false, verified_cleanup: false };
  const filename = path.join(directory, 'report.json');
  const save = () => fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  let receipt, preparation;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
  try {
    if (plan.checks.some(check => check.kind !== 'offline')) {
      const config = require('../ha-test/client').readConfig();
      assert.equal(new URL(config.url).hostname, '192.168.0.28', 'Only the authorized disposable instance is allowed');
      assert.equal(config.sshHost, '192.168.0.28');
      report.target = config.url;
      // Validate prerequisites before builds, deployment or expensive browser work.
      if (plan.checks.some(check => check.id === 'preserved-upgrade')) {
        assert.equal(git(['status', '--porcelain']), '', 'Preserved-upgrade checks require a clean candidate');
        try { require('../ha-test/prepare').ssh(config, 'command -v python3 >/dev/null || exit 1'); }
        catch { throw new Error('Preserved-install preflight requires Python 3 in the configured disposable SSH shell; no expensive checks or deployment were started.'); }
      }
    }
    save();
    const execution = await schedule(plan.checks, async check => {
      if (check.kind === 'browser' && check.id !== 'preserved-upgrade' && !receipt) {
        preparation ||= require('../ha-test/prepared-batch').prepareBatch(directory);
        receipt = await preparation;
        report.prepared_receipt = receipt;
      }
      const jobDirectory = path.join(directory, check.id.replace(/[^a-z0-9_-]/gi, '_'));
      fs.mkdirSync(jobDirectory, { mode: 0o700 });
      const [program, ...args] = check.command;
      const executable = program === 'node' ? process.execPath : program === 'python'
        ? process.env.MARAO_TEST_PYTHON || (fs.existsSync(path.join(root, '.venv/bin/python')) ? path.join(root, '.venv/bin/python') : 'python3') : program;
      console.log('Selected check: ' + check.id);
      if (options.upgradeReport && check.id === 'preserved-upgrade') {
        await require('./verify-release').verifyRelease(options.upgradeReport, { publish: false, scope: plan });
      } else if (check.id.startsWith('e2e:') || check.id === 'native-reconnect') {
        const config = require('../ha-test/client').readConfig();
        await require('./native-reconnect-exception').e2eWithApprovedException(config, jobDirectory, check.id === 'native-reconnect' ? 'light' : check.id.slice(4), {
          MARAO_TEST_ARTIFACT_ROOT: jobDirectory, ...(receipt ? { MARAO_BATCH_RECEIPT: receipt } : {}) }, {
            args: check.id === 'native-reconnect' ? ['--disconnect-only'] : [], signal: controller.signal });
      } else await new Promise((resolve, reject) => {
        const env = { ...process.env, MARAO_TEST_ARTIFACT_ROOT: jobDirectory,
          ...(receipt && check.id !== 'preserved-upgrade' ? { MARAO_BATCH_RECEIPT: receipt } : {}),
          ...(plan.parallel ? { MARAO_TEST_PARALLEL: '1' } : {}) };
        const child = spawn(executable, args, { cwd: root, stdio: 'inherit', env });
        const stop = () => child.kill('SIGTERM');
        controller.signal.addEventListener('abort', stop, { once: true });
        child.once('error', reject);
        child.once('exit', (code, signal) => {
          controller.signal.removeEventListener('abort', stop);
          code === 0 && !signal ? resolve() : reject(new Error(check.id + ' failed' + (signal ? ': ' + signal : '')));
        });
      });
      assert.equal(checkIdentity(check), identities[check.id], 'Inputs changed during check: ' + check.id);
      const captures = {};
      const privateFiles = folder => {
        fs.chmodSync(folder, 0o700);
        for (const name of fs.readdirSync(folder)) {
          const file = path.join(folder, name), stat = fs.lstatSync(file);
          assert.ok(!stat.isSymbolicLink(), 'Symlinked job artifact');
          if (stat.isDirectory()) privateFiles(file);
          else if (stat.isFile()) {
            fs.chmodSync(file, 0o600);
            if (name.endsWith('.png')) captures[path.relative(directory, file)] = digest(fs.readFileSync(file));
          }
        }
      };
      privateFiles(jobDirectory);
      return { input_sha256: identities[check.id], artifacts: path.relative(directory, jobDirectory), captures };
    }, { parallel: plan.parallel, signal: controller.signal });
    report.results = execution.results;
    if (execution.failure) throw execution.failure;
    if (receipt) await require('../ha-test/prepared-batch').restoreBatch(receipt);
    report.verified_cleanup = true;
    report.passed = true;
  } catch (error) { report.failure = error.message; throw error; }
  finally {
    if (!report.verified_cleanup && receipt) {
      try { await require('../ha-test/prepared-batch').restoreBatch(receipt); report.verified_cleanup = true; }
      catch (error) { report.passed = false; report.cleanup_failure = error.message; }
    }
    process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
    report.completed_at = new Date().toISOString();
    save();
    console.log('Scoped verification report: ' + filename);
  }
  return { filename, report };
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('test:affected [--base ref] [--head ref] [--component id] [--plan] [--offline] [--parallel]\n' +
      'test:full [--plan] [--offline] [--parallel]\nDefault: affected checks, serial. Components: ' + Object.keys(components).join(', '));
    return;
  }
  const plan = makePlan(options);
  if (options.plan) {
    console.log(JSON.stringify({ mode: plan.mode, base: plan.baseRef, head: plan.head, components: plan.components, reasons: plan.reasons,
      parallel: plan.parallel, checks: plan.checks.map(({ id, command }) => ({ id, command })), excluded: plan.excluded }, null, 2));
    return plan;
  }
  console.log(`${plan.mode}: ${plan.checks.length} selected checks; ${plan.components.join(', ')}; ${plan.parallel ? 'parallel requested' : 'serial'}. Use --plan for selection reasons.`);
  fs.mkdirSync(path.join(root, 'tests/.artifacts/verification'), { recursive: true, mode: 0o700 });
  return runPlan(plan, options);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { changedFiles, checkIdentity, digest, git, inputHashes, main, makePlan, parseArgs, readPrivate, root, runPlan, schedule, validateEvidence };
