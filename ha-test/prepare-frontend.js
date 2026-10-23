// Update only the owned frontend on the existing disposable installation.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const client = require('./client');

const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
let builtEditor;

function assertTarget(config) {
  client.assertDisposableHaTarget(config, { requireSsh: true });
  assert.equal(new URL(config.url).hostname, '192.168.10.229', 'Frontend preview is restricted to disposable 192.168.10.229');
  assert.equal(config.sshHost, '192.168.10.229');
  assert.ok(path.posix.isAbsolute(config.remoteConfigPath) && config.remoteConfigPath !== '/' && !config.remoteConfigPath.split('/').includes('..'), 'Invalid disposable configuration directory');
}

function localHashes(directory, filter = () => true) {
  assert.ok(!fs.lstatSync(directory).isSymbolicLink(), 'Frontend preview cannot follow symlinked source files');
  function rejectLinks(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!filter(path.relative(directory, path.join(dir, entry.name)).split(path.sep).join('/'))) continue;
      assert.ok(!entry.isSymbolicLink(), 'Frontend preview cannot follow symlinked source files');
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '__pycache__') rejectLinks(path.join(dir, entry.name));
    }
  }
  rejectLinks(directory);
  return Object.fromEntries(client.sourceFiles(directory).filter(filter).map(file => [file, hash(fs.readFileSync(path.join(directory, file)))]));
}

function frontendHashes(config, directory, ssh) {
  const result = ssh(config, `test -d ${quote(directory)} && test ! -L ${quote(directory)} && test -z "$(find ${quote(directory)} -type l -print)" && find ${quote(directory)} -type f -exec sha256sum '{}' '+'`);
  return Object.fromEntries(result.stdout.trim().split('\n').filter(Boolean).map(line => {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match && match[2].startsWith(directory + '/'), 'Invalid frontend identity response');
    const file = match[2].slice(directory.length + 1);
    assert.ok(file.split('/').every(part => part && part !== '.' && part !== '..'), 'Invalid frontend path');
    return [file, match[1]];
  }));
}

function upload(config, archive, destination) {
  try {
    execFileSync('scp', ['-q', '-o', 'BatchMode=yes', ...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []),
      '-P', String(config.sshPort), archive, config.sshUser + '@' + config.sshHost + ':' + destination], { stdio: 'pipe' });
  } catch { throw new Error('Frontend upload failed'); }
}

function backendHashes(config, directory, ssh) {
  const result = ssh(config, `test -d ${quote(directory)} && test ! -L ${quote(directory)} && test -z "$(find ${quote(directory)} -path ${quote(directory + '/frontend')} -prune -o -type l -print)" && find ${quote(directory)} -path ${quote(directory + '/frontend')} -prune -o -type f -exec sha256sum '{}' '+'`);
  const entries = result.stdout.trim().split('\n').filter(Boolean).map(line => {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match && match[2].startsWith(directory + '/'), 'Invalid backend identity response');
    const file = match[2].slice(directory.length + 1);
    assert.ok(file.split('/').every(part => part && part !== '..'), 'Invalid backend path');
    return [file, match[1]];
  }).filter(([file]) => !file.split('/').some(part => part.startsWith('.') || part === '__pycache__') && !/\.py[co]$/.test(file));
  return Object.fromEntries(entries);
}

function sameHashes(left, right) {
  return Object.keys(left).length === Object.keys(right).length && Object.entries(left).every(([file, value]) => right[file] === value);
}

function buildEditor(root) {
  const identity = [client.fingerprint(path.join(root, 'frontend_src')), client.fingerprint(path.join(root, 'custom_components/marao_dashboard'), file => !file.startsWith('frontend/')), hash(fs.readFileSync(path.join(root, 'package-lock.json')))].join(':');
  if (builtEditor !== identity) {
    execFileSync(process.execPath, ['frontend_src/build-editor.cjs'], { cwd: root, stdio: 'inherit' });
    builtEditor = identity;
  }
}

async function prepareFrontend(config = client.readConfig(), dependencies = {}) {
  assertTarget(config);
  assert.ok(!process.env.MARAO_BATCH_RECEIPT && !process.env.MARAO_UPGRADE_RECEIPT, 'Preview is separate from publication and upgrade verification');
  const root = dependencies.root || client.repoRoot;
  const ssh = dependencies.ssh || require('./prepare').ssh;
  const api = dependencies.api || client.api;
  const connect = dependencies.connect || client.connect;
  const integration = path.join(root, 'custom_components/marao_dashboard');
  const frontendRoot = path.join(integration, 'frontend');
  const remoteIntegration = config.remoteConfigPath + '/custom_components/marao_dashboard';
  const remoteFrontend = remoteIntegration + '/frontend';
  const guards = ['/custom_components', '/custom_components/marao_dashboard', '/custom_components/marao_dashboard/frontend', '/.marao-test-deployment.json'];
  const guard = () => ssh(config, guards.map(file => `test ! -L ${quote(config.remoteConfigPath + file)} || exit 1`).join('\n') + '\n' +
    ['/.marao-upgrade-active.json', '/dashboard/MaraoDashboard/.history/.operation'].map(file => `test ! -e ${quote(config.remoteConfigPath + file)} && test ! -L ${quote(config.remoteConfigPath + file)} || exit 1`).join('\n'));
  guard();
  let receipt;
  try { receipt = JSON.parse(ssh(config, 'cat ' + quote(config.remoteConfigPath + '/.marao-test-deployment.json')).stdout); }
  catch { throw new Error('Missing prepared installation receipt; run ha:sync before preview'); }
  assert.equal(receipt.target, require('./prepare').targetKey(config), 'Prepared installation belongs to another target');
  const localBackend = localHashes(integration, file => file !== 'frontend' && !file.startsWith('frontend/'));
  assert.ok(sameHashes(backendHashes(config, remoteIntegration, ssh), localBackend), 'Installed backend differs; use ha:sync before frontend preview');
  assert.equal((await api(config, 'GET', '/api/config')).config_dir, config.remoteConfigPath, 'Disposable configuration directory differs');
  const connection = await connect(config);
  let dashboard, entry, panels;
  try {
    assert.equal((await connection.call({ type: 'auth/current_user' })).is_admin, true, 'Frontend preview needs the disposable administrator');
    const entries = await connection.call({ type: 'config_entries/get' });
    const owned = entries.filter(row => row.domain === 'marao_dashboard');
    assert.ok(owned.length === 1 && owned[0].state === 'loaded', 'Prepare the disposable Marao installation with ha:sync before preview');
    entry = owned[0];
    assert.ok(!entries.some(row => ['frigate', 'unifiprotect', 'netatmo'].includes(row.domain)), 'Preview requires safe camera fixtures');
    dashboard = await connection.call({ type: 'lovelace/config', url_path: 'marao-dashboard', force: true });
    assert.equal(dashboard.views?.filter(view => view.path === 'card-test').length, 1, 'Prepare the single Cases view before preview');
    panels = await connection.call({ type: 'get_panels' });
  } finally { connection.close(); }
  const editorVersion = client.fingerprint(path.join(root, 'frontend_src'));
  (dependencies.build || buildEditor)(root);
  const assets = localHashes(frontendRoot);
  const version = client.fingerprint(frontendRoot);
  const installed = frontendHashes(config, remoteFrontend, ssh);
  const changed = !sameHashes(installed, assets);
  const frontendIdentity = hash(JSON.stringify(Object.entries(assets).map(([file, digest]) => ['custom_components/marao_dashboard/frontend/' + file, digest])));
  const localStage = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-frontend-'));
  const remoteStage = config.remoteConfigPath + '/.marao-frontend-' + crypto.randomUUID();
  let staged = false;
  const stageRemote = () => { if (!staged) { guard(); ssh(config, 'umask 077 && mkdir ' + quote(remoteStage)); staged = true; } };
  try {
    if (changed) {
      const candidate = path.join(localStage, 'frontend');
      fs.mkdirSync(candidate, { mode: 0o755 });
      for (const file of Object.keys(assets)) {
        fs.mkdirSync(path.dirname(path.join(candidate, file)), { recursive: true });
        fs.copyFileSync(path.join(frontendRoot, file), path.join(candidate, file));
      }
      assert.ok(sameHashes(localHashes(candidate), assets), 'Workspace changed while staging frontend; retry');
      const archive = path.join(localStage, 'frontend.tar.gz');
      execFileSync('tar', ['--no-xattrs', '-czf', archive, '-C', localStage, 'frontend'], { stdio: 'pipe', env: { ...process.env, COPYFILE_DISABLE: '1' } });
      stageRemote();
      (dependencies.upload || upload)(config, archive, remoteStage + '/frontend.tar.gz');
      ssh(config, 'tar -xzf ' + quote(remoteStage + '/frontend.tar.gz') + ' -C ' + quote(remoteStage));
      assert.ok(sameHashes(frontendHashes(config, remoteStage + '/frontend', ssh), assets), 'Staged frontend does not match current assets');
      guard();
      assert.ok(sameHashes(frontendHashes(config, remoteFrontend, ssh), installed), 'Installed frontend changed during preparation; retry');
      const backup = remoteStage + '/frontend-before';
      const swapped = ssh(config, `set -e
restore_missing() { if test ! -e ${quote(remoteFrontend)} && test -d ${quote(backup)}; then mv ${quote(backup)} ${quote(remoteFrontend)} || exit 2; fi; }
trap restore_missing 0
trap 'exit 1' 1 2 15
mv ${quote(remoteFrontend)} ${quote(backup)}
mv ${quote(remoteStage + '/frontend')} ${quote(remoteFrontend)}
trap - 0 1 2 15`, { allowFailure: true });
      assert.equal(swapped.status, 0, swapped.status === 2 ? 'Frontend swap and recovery both failed' : 'Frontend swap failed');
    }
    if (changed || !JSON.stringify(panels['marao-dashboard-editor'] || {}).includes('v=' + version)) {
      guard();
      await api(config, 'POST', '/api/services/homeassistant/reload_config_entry', { entry_id: entry.entry_id });
    }
    const current = await connect(config);
    try {
      let ready = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        const entries = await current.call({ type: 'config_entries/get' });
        panels = await current.call({ type: 'get_panels' });
        if (entries.some(row => row.entry_id === entry.entry_id && row.state === 'loaded')
          && JSON.stringify(panels['marao-dashboard-editor'] || {}).includes('v=' + version)) { ready = true; break; }
        if (attempt < 11) await (dependencies.delay || (ms => new Promise(resolve => setTimeout(resolve, ms))))(250);
      }
      assert.ok(ready, 'Marao did not load the current frontend after reload');
      dashboard = await current.call({ type: 'lovelace/config', url_path: 'marao-dashboard', force: true });
      assert.equal(dashboard.views?.filter(view => view.path === 'card-test').length, 1, 'The current dashboard lost its single Cases view');
    } finally { current.close(); }
    for (const name of ['MaraoDashboard.js', 'MaraoCards.js', 'MaraoFrigateEventsCard.js', 'MaraoDashboardPanel.js']) {
      assert.ok(Object.hasOwn(assets, name), 'Missing frontend entry: ' + name);
      const actual = await api(config, 'GET', client.frontendAssetURL(version, name), undefined, { text: true });
      assert.equal(hash(actual), assets[name], 'The served ' + name + ' is stale');
    }
    assert.ok(sameHashes(localHashes(frontendRoot), assets), 'Workspace changed during frontend preparation; retry');
    assert.equal(client.fingerprint(path.join(root, 'frontend_src')), editorVersion, 'Editor source changed during frontend preparation; retry');
    assert.ok(sameHashes(localHashes(integration, file => file !== 'frontend' && !file.startsWith('frontend/')), localBackend), 'Backend source changed during frontend preparation; retry');
    assert.ok(sameHashes(backendHashes(config, remoteIntegration, ssh), localBackend), 'Installed backend changed during frontend preparation');
    assert.ok(sameHashes(frontendHashes(config, remoteFrontend, ssh), assets), 'Installed frontend changed during verification');
    const receiptPath = config.remoteConfigPath + '/.marao-test-deployment.json';
    assert.deepEqual(JSON.parse(ssh(config, 'cat ' + quote(receiptPath)).stdout), receipt, 'Deployment receipt changed during frontend preparation; retry');
    if (receipt.frontend !== frontendIdentity) {
      stageRemote(); guard();
      ssh(config, 'umask 077 && cat > ' + quote(remoteStage + '/receipt.json'), { input: JSON.stringify({ ...receipt, frontend: frontendIdentity }) + '\n' });
      ssh(config, 'mv ' + quote(remoteStage + '/receipt.json') + ' ' + quote(receiptPath));
    }
    if (staged) ssh(config, 'rm -rf ' + quote(remoteStage));
    return { config, version, dashboard, frontendRoot, assets, installed: true };
  } catch (error) {
    if (staged) throw new Error(error.message + '; recovery data retained at ' + remoteStage);
    throw error;
  } finally { fs.rmSync(localStage, { recursive: true, force: true }); }
}

module.exports = { assertTarget, backendHashes, frontendHashes, localHashes, prepareFrontend, sameHashes };
