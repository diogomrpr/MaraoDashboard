import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { prepareFrontend, localHashes } = require('../../ha-test/prepare-frontend');
const { fingerprint } = require('../../ha-test/client');
const { targetKey } = require('../../ha-test/prepare');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-preview-prep-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'repo'), remote = path.join(directory, 'remote');
  const integration = '/custom_components/marao_dashboard';
  const write = (base, file, bytes) => { fs.mkdirSync(path.dirname(base + file), { recursive: true }); fs.writeFileSync(base + file, bytes); };
  for (const base of [root, remote]) {
    write(base, integration + '/manifest.json', '{"domain":"marao_dashboard"}');
    write(base, integration + '/__init__.py', '# unchanged backend');
    for (const name of ['MaraoDashboard.js', 'MaraoCards.js', 'MaraoFrigateEventsCard.js', 'MaraoDashboardPanel.js']) {
      write(base, integration + '/frontend/' + name, (base === root ? 'workspace bytes ' : 'installed bytes ') + name);
    }
  }
  write(root, '/frontend_src/editor.js', '// editor');
  for (const file of ['/dashboard/MaraoDashboard/dashboard.json', '/dashboard/MaraoDashboard/main/dashboard.yaml', '/dashboard/MaraoDashboard/.history/entry.json', '/packages/helpers.yaml', '/configuration.yaml', '/custom_components/safe_fixture/provider.py']) write(remote, file, 'preserve exactly ' + file);
  const config = { url: 'http://192.168.0.28:8123', sshHost: '192.168.0.28', sshPort: 22, disposable: true, remoteConfigPath: remote };
  const receipt = { target: targetKey(config), backend: 'backend-before', frontend: 'frontend-before', fixtures: 'fixtures-before', dashboard: 'dashboard-before', custom: { retained: true } };
  write(remote, '/.marao-test-deployment.json', JSON.stringify(receipt));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'sha256sum'), '#!' + process.execPath + '\nconst fs=require("node:fs"),c=require("node:crypto");for(const f of process.argv.slice(2))console.log(c.createHash("sha256").update(fs.readFileSync(f)).digest("hex")+"  "+f);\n', { mode: 0o700 });
  const calls = [], uploads = [];
  let loadedVersion = fingerprint(remote + integration + '/frontend');
  const dependencies = {
    root, build() { calls.push('build'); },
    delay: async () => {},
    upload(_config, archive, destination) { calls.push('upload'); uploads.push(destination); fs.copyFileSync(archive, destination); },
    ssh(_config, command, options = {}) {
      calls.push('ssh');
      const result = spawnSync('/bin/sh', ['-c', command], { encoding: 'utf8', input: options.input, env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH } });
      if (result.status !== 0 && !options.allowFailure) throw new Error('Prepared installation guard failed');
      return result;
    },
    async connect() {
      return { close() {}, async call(message) {
        calls.push(message.type);
        if (message.type === 'auth/current_user') return { is_admin: true };
        if (message.type === 'config_entries/get') return [{ domain: 'marao_dashboard', state: 'loaded', entry_id: 'safe' }];
        if (message.type === 'lovelace/config') return { views: [{ path: 'card-test' }], loadedVersion };
        if (message.type === 'get_panels') return { 'marao-dashboard': { component_name: 'lovelace' }, 'marao-dashboard-editor': { url: '/MaraoDashboardPanel.js?v=' + loadedVersion } };
        throw new Error('Unexpected mutation: ' + message.type);
      } };
    },
    async api(_config, method, endpoint, body) {
      calls.push(method + ' ' + endpoint);
      if (method === 'GET' && endpoint === '/api/config') return { config_dir: remote };
      if (method === 'POST' && endpoint === '/api/services/homeassistant/reload_config_entry') {
        assert.deepEqual(body, { entry_id: 'safe' }); loadedVersion = fingerprint(remote + integration + '/frontend'); return [];
      }
      if (method === 'GET' && endpoint.startsWith('/api/marao_dashboard/frontend/')) return fs.readFileSync(remote + integration + '/frontend/' + endpoint.split('/').slice(5).join('/').split('?')[0], 'utf8');
      throw new Error('Unexpected mutation: ' + method + ' ' + endpoint);
    },
  };
  function remoteBytes() {
    const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [[path.relative(remote, path.join(dir, entry.name)), fs.readFileSync(path.join(dir, entry.name), 'utf8')]]);
    return Object.fromEntries(walk(remote));
  }
  return { root, remote, integration, config, dependencies, calls, uploads, write, remoteBytes, receipt };
}

test('frontend preparation installs current assets, verifies served bytes and leaves the candidate installed', async t => {
  const f = fixture(t), before = f.remoteBytes();
  const result = await prepareFrontend(f.config, f.dependencies);
  assert.equal(result.version, fingerprint(f.root + f.integration + '/frontend'));
  assert.deepEqual(result.assets, localHashes(result.frontendRoot));
  assert.deepEqual(localHashes(f.remote + f.integration + '/frontend'), result.assets);
  assert.equal(result.installed, true); assert.equal(result.dashboard.loadedVersion, result.version);
  const receipt = JSON.parse(fs.readFileSync(f.remote + '/.marao-test-deployment.json'));
  const expectedIdentity = crypto.createHash('sha256').update(JSON.stringify(Object.entries(result.assets).map(([file, hash]) => ['custom_components/marao_dashboard/frontend/' + file, hash]))).digest('hex');
  assert.deepEqual(receipt, { ...f.receipt, frontend: expectedIdentity });
  const preserved = values => Object.fromEntries(Object.entries(values).filter(([file]) => !file.startsWith('custom_components/marao_dashboard/frontend/') && file !== '.marao-test-deployment.json'));
  assert.deepEqual(preserved(f.remoteBytes()), preserved(before));
  assert.equal(f.calls.filter(call => call === 'build').length, 1);
  assert.equal(f.calls.filter(call => call === 'upload').length, 1);
  assert.equal(f.calls.filter(call => call.startsWith('POST ')).length, 1);
  assert.ok(!f.calls.some(call => /restart|generate_dashboard|config\/save/.test(call)));
  f.calls.length = 0;
  await prepareFrontend(f.config, f.dependencies);
  assert.ok(!f.calls.some(call => call === 'upload' || call.startsWith('POST ')), 'Already-current assets need no upload or reload');
});

test('stale served assets retain the candidate and recovery backup without accepting the deployment receipt', async t => {
  const f = fixture(t), api = f.dependencies.api;
  f.dependencies.api = (config, method, endpoint, body) => endpoint.startsWith('/api/marao_dashboard/frontend/') ? 'stale served bytes' : api(config, method, endpoint, body);
  await assert.rejects(prepareFrontend(f.config, f.dependencies), /served MaraoDashboard.js is stale[\s\S]*recovery data retained/);
  assert.deepEqual(localHashes(f.remote + f.integration + '/frontend'), localHashes(f.root + f.integration + '/frontend'));
  assert.deepEqual(JSON.parse(fs.readFileSync(f.remote + '/.marao-test-deployment.json')), f.receipt);
  assert.equal(fs.readFileSync(path.dirname(f.uploads[0]) + '/frontend-before/MaraoCards.js', 'utf8'), 'installed bytes MaraoCards.js');
});

test('a failed directory swap restores only the missing frontend and retains recovery data', async t => {
  const f = fixture(t), ssh = f.dependencies.ssh, installed = localHashes(f.remote + f.integration + '/frontend');
  f.dependencies.ssh = (config, command, options) => {
    if (command.includes('restore_missing()')) fs.renameSync(path.dirname(f.uploads[0]) + '/frontend', path.dirname(f.uploads[0]) + '/blocked-frontend');
    return ssh(config, command, options);
  };
  await assert.rejects(prepareFrontend(f.config, f.dependencies), /Frontend swap failed[\s\S]*recovery data retained/);
  assert.deepEqual(localHashes(f.remote + f.integration + '/frontend'), installed);
  assert.ok(!f.calls.some(call => call.startsWith('POST ')));
});

test('incompatible backend and unsafe targets fail before build or browser preparation', async t => {
  const f = fixture(t), before = f.remoteBytes();
  f.write(f.remote, f.integration + '/__init__.py', '# another backend');
  await assert.rejects(prepareFrontend(f.config, f.dependencies), /Installed backend differs/);
  assert.ok(!f.calls.includes('build'));
  f.calls.length = 0;
  for (const config of [{ ...f.config, url: 'http://192.168.0.99:8123', sshHost: '192.168.0.99' }, { ...f.config, disposable: false }]) await assert.rejects(prepareFrontend(config, f.dependencies));
  assert.deepEqual(f.calls, []);
  assert.equal(f.remoteBytes()['configuration.yaml'], before['configuration.yaml']);
});

test('active upgrade, missing receipt and missing Cases view refuse a preview', async t => {
  const f = fixture(t);
  f.write(f.remote, '/.marao-upgrade-active.json', '{}');
  await assert.rejects(prepareFrontend(f.config, f.dependencies), /guard failed/);
  fs.unlinkSync(f.remote + '/.marao-upgrade-active.json');
  fs.unlinkSync(f.remote + '/.marao-test-deployment.json');
  await assert.rejects(prepareFrontend(f.config, f.dependencies), /Missing prepared installation/);
  f.write(f.remote, '/.marao-test-deployment.json', JSON.stringify({ target: targetKey(f.config) }));
  const connect = f.dependencies.connect;
  f.dependencies.connect = async () => { const ws = await connect(); const call = ws.call; ws.call = msg => msg.type === 'lovelace/config' ? { views: [] } : call(msg); return ws; };
  await assert.rejects(prepareFrontend(f.config, f.dependencies), /single Cases view/);
  assert.ok(!f.calls.includes('build'));
});

test('symlinked workspace assets are refused without changing the remote installation', async t => {
  const f = fixture(t), before = f.remoteBytes();
  fs.symlinkSync('/private', f.root + f.integration + '/frontend/link');
  await assert.rejects(prepareFrontend(f.config, f.dependencies), /symlinked source/);
  assert.deepEqual(f.remoteBytes(), before);
});
