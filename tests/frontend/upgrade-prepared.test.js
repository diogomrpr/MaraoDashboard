import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { readPreparedReceipt, validatePreparedReceipt } = require('../../ha-test/upgrade/prepared');
const config = { url: 'http://192.168.0.28:8123', disposable: true, sshHost: '192.168.0.28', remoteConfigPath: '/config' };
const candidate = { commit: 'a'.repeat(40), package_sha256: 'b'.repeat(64), frontend_fingerprint: 'c'.repeat(16) };
const receipt = () => ({ version: 1, operation_id: '12345678-1234-1234-1234-123456789abc', target: config.url, remote_config_path: '/config', dashboard_key: 'marao-dashboard',
  entry_id: 'existing-entry', created_at: new Date().toISOString(), candidate: structuredClone(candidate),
  source_sha256: 'd'.repeat(64), expected_config: { name: 'Preserved', rooms: [] },
  output: { slug: 'dashboard', files: { 'dashboard.yaml': 'e'.repeat(64), '.marao-generated.json': 'f'.repeat(64) } },
  fixture_domains: ['marao_test_camera'], fixture_files: { 'packages/marao_dashboard_card_test_helpers.yaml': '1'.repeat(64) } });

test('a private current receipt retains exact source/output identities', () => {
  const value = receipt();
  assert.equal(validatePreparedReceipt(value, config, candidate), value);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-upgrade-receipt-'));
  try {
    const file = path.join(root, 'receipt.json');
    fs.writeFileSync(file, JSON.stringify(value), { mode: 0o600 });
    assert.deepEqual(readPreparedReceipt(file, config, candidate), value);
    fs.chmodSync(file, 0o644);
    assert.throws(() => readPreparedReceipt(file, config, candidate), /private regular file/);
    fs.chmodSync(file, 0o600);
    fs.symlinkSync(file, path.join(root, 'link.json'));
    assert.throws(() => readPreparedReceipt(path.join(root, 'link.json'), config, candidate), /private regular file/);
    assert.throws(() => readPreparedReceipt(path.join(root, 'absent.json'), config, candidate), /ENOENT/);
    assert.throws(() => readPreparedReceipt('relative.json', config, candidate), /absolute path/);
  } finally { fs.rmSync(root, { recursive: true }); }
});

test('preserved inspection uses only reads and detects source, output, ownership and asset drift', async () => {
  const client = require('../../ha-test/client');
  const modulePath = fileURLToPath(new URL('../../ha-test/upgrade/prepared.js', import.meta.url));
  const module = { exports: {} };
  const commands = [];
  let saved, snapshot, altered;
  let snapshotCommand;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-upgrade-inspection-'));
  const hashes = directory => Object.fromEntries(client.sourceFiles(directory).map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, file))).digest('hex')]));
  const connection = { close() { commands.push('close'); }, async call(message) {
    commands.push(message.type);
    const results = {
      'auth/current_user': { is_admin: true },
      'config_entries/get': [{ domain: 'marao_dashboard', entry_id: saved.entry_id, state: 'loaded' }],
      'marao_dashboard/config/get': { config: JSON.stringify(saved.expected_config) },
      get_panels: { 'marao-dashboard': { component_name: 'lovelace' }, 'marao-dashboard-editor': { url: '?v=' + saved.candidate.frontend_fingerprint } },
      'lovelace/resources': [{ url: 'https://example.com/hacsfiles/MaraoDashboard/unrelated.js' }],
      'lovelace/config': { views: [{ path: 'card-test' }] },
      get_states: [],
    };
    assert.ok(Object.hasOwn(results, message.type), 'Attempted an unexpected command');
    return altered?.(message.type, structuredClone(results[message.type])) ?? results[message.type];
  } };
  const api = async (_config, method, url) => {
    assert.equal(method, 'GET'); commands.push(url);
    if (url === '/api/config') return { config_dir: config.remoteConfigPath };
    const file = new URL(url, config.url).pathname.split('/').at(-1);
    return altered?.('asset', file) ?? fs.readFileSync(path.join(client.repoRoot, 'custom_components/marao_dashboard/frontend', file), 'utf8');
  };
  vm.runInThisContext('(function(require,module,__dirname){' + fs.readFileSync(modulePath, 'utf8') + '\n})', { filename: modulePath })(
    name => name === '../client' ? { ...client, api, connect: async () => connection } : require(name), module, path.dirname(modulePath));
  const { candidateIdentity, verifyPrepared } = module.exports;
  const options = { referencedEntities: () => [], ssh(_config, command, request) {
    assert.ok(command.startsWith('python3 -c '));
    assert.equal(JSON.parse(request.input).root, config.remoteConfigPath);
    commands.push('read-snapshot');
    snapshotCommand = command;
    return { stdout: JSON.stringify(altered?.('snapshot', structuredClone(snapshot)) ?? snapshot) };
  } };
  const file = path.join(root, 'receipt.json');
  try {
    saved = { ...receipt(), candidate: candidateIdentity(), fixture_domains: fs.readdirSync(path.join(client.repoRoot, 'ha-test/custom_components')).sort() };
    snapshot = { operation_id: saved.operation_id, recovering: false, source_sha256: saved.source_sha256, output: saved.output.files,
      package: hashes(path.join(client.repoRoot, 'custom_components/marao_dashboard')), fixtures: saved.fixture_files,
      owners: Object.fromEntries(saved.fixture_domains.map(domain => [domain, 'marao-dashboard-tests'])),
      providers: Object.fromEntries(saved.fixture_domains.map(domain => [domain, { ...hashes(path.join(client.repoRoot, 'ha-test/custom_components', domain)),
        'marao-fixture.json': crypto.createHash('sha256').update('{"owner":"marao-dashboard-tests"}\n').digest('hex') }])) };
    fs.writeFileSync(file, JSON.stringify(saved), { mode: 0o600 });
    const result = await verifyPrepared(config, file, options);
    assert.equal(result.version, saved.candidate.frontend_fingerprint);
    assert.equal(commands.filter(command => command === 'read-snapshot').length, 2);
    await assert.rejects(verifyPrepared(config, file, { ...options, operationCompleted: true }), /operation changed/);
    altered = (kind, value) => { if (kind === 'snapshot') { value.operation_id = null; return value; } };
    await verifyPrepared(config, file, { ...options, operationCompleted: true });
    await assert.rejects(verifyPrepared(config, file, options), /operation changed/);
    altered = undefined;
    const installed = fs.realpathSync(root);
    const contents = {
      '.marao-upgrade-active.json': JSON.stringify({ operation_id: saved.operation_id }),
      'dashboard/MaraoDashboard/dashboard.json': '{"name":"Exact source","rooms":[]}\r\n',
      'dashboard/MaraoDashboard/dashboard/dashboard.yaml': 'title: Exact output\n',
      'dashboard/MaraoDashboard/dashboard/.marao-generated.json': '{"version":1}\n',
      'dashboard/MaraoDashboard/dashboard/manual/unrelated.yaml': 'untouched\r\n',
      'custom_components/marao_dashboard/__init__.py': '# candidate\n',
      'custom_components/marao_dashboard/__pycache__/ignored.pyc': 'bytecode',
      'custom_components/marao_test_camera/marao-fixture.json': '{"owner":"marao-dashboard-tests"}\n',
      'packages/marao_dashboard_card_test_helpers.yaml': 'safe: true\n',
    };
    for (const [relative, bytes] of Object.entries(contents)) {
      const target=path.join(installed,relative); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,bytes);
    }
    let input=JSON.stringify({root:installed,slug:'dashboard',domains:['marao_test_camera'],files:Object.keys(saved.fixture_files)});
    const read=()=>spawnSync('/bin/sh',['-c',snapshotCommand],{input,encoding:'utf8'});
    const actual=read(); assert.equal(actual.status,0,actual.stderr);
    const document=JSON.parse(actual.stdout);
    assert.equal(document.operation_id,saved.operation_id);
    assert.equal(document.source_sha256,crypto.createHash('sha256').update(contents['dashboard/MaraoDashboard/dashboard.json']).digest('hex'));
    assert.deepEqual(Object.keys(document.output),['.marao-generated.json','dashboard.yaml','manual/unrelated.yaml']);
    assert.deepEqual(Object.keys(document.package),['__init__.py']);
    assert.equal(document.owners.marao_test_camera,'marao-dashboard-tests');
    const alias=path.join(installed,'config-root-alias'); fs.symlinkSync(installed,alias,'dir');
    input=JSON.stringify({root:alias,slug:'dashboard',domains:['marao_test_camera'],files:Object.keys(saved.fixture_files)});
    const aliased=read(); assert.equal(aliased.status,0,aliased.stderr); assert.deepEqual(JSON.parse(aliased.stdout),document);
    fs.symlinkSync(path.join(installed,'packages/marao_dashboard_card_test_helpers.yaml'),path.join(installed,'dashboard/MaraoDashboard/dashboard/outside.yaml'));
    assert.notEqual(read().status,0,'Snapshot followed a symlink');
    for (const [relative, bytes] of Object.entries(contents)) assert.equal(fs.readFileSync(path.join(installed,relative),'utf8'),bytes,'Read-only snapshot changed a file');
    for (const change of [
      value => { value.source_sha256 = '0'.repeat(64); },
      value => { value.output['dashboard.yaml'] = '0'.repeat(64); },
      value => { value.package['__init__.py'] = '0'.repeat(64); },
      value => { value.recovering = true; },
      value => { value.operation_id = 'another-operation'; },
      value => { value.owners[saved.fixture_domains[0]] = 'unrelated'; },
      value => { value.providers[saved.fixture_domains[0]]['manifest.json'] = '0'.repeat(64); },
      value => { value.fixtures[Object.keys(saved.fixture_files)[0]] = '0'.repeat(64); },
    ]) {
      altered = (kind, value) => { if (kind === 'snapshot') change(value); return value; };
      await assert.rejects(verifyPrepared(config, file, options));
    }
    for (const [kind, value] of [
      ['config_entries/get', [{ domain: 'marao_dashboard', entry_id: 'recreated', state: 'loaded' }]],
      ['marao_dashboard/config/get', { config: '{"name":"Reseeded","rooms":[]}' }],
      ['lovelace/resources', [{ url: config.url + '/hacsfiles/MaraoDashboard/MaraoCards.js?v=old' }]],
      ['asset', 'stale code'],
    ]) {
      altered = (request, original) => request === kind ? value : original;
      await assert.rejects(verifyPrepared(config, file, options));
    }
    assert.ok(commands.every(command => !/create|save|generate|restore|call_service/.test(command)), 'Preserved inspection attempted mutation');
  } finally { fs.rmSync(root, { recursive: true }); }
});

test('a flag or stale, mismatched, incomplete receipt cannot skip preparation', () => {
  for (const change of [
    r => { r.version = true; },
    r => { delete r.operation_id; },
    r => { r.target = 'http://192.168.0.29:8123'; },
    r => { r.remote_config_path = '/other'; },
    r => { r.dashboard_key = 'another-dashboard'; },
    r => { delete r.entry_id; },
    r => { r.created_at = new Date(Date.now() - 86400001).toISOString(); },
    r => { r.created_at = new Date(Date.now() + 60000).toISOString(); },
    r => { r.candidate.package_sha256 = '0'.repeat(64); },
    r => { r.source_sha256 = 'changed source'; },
    r => { delete r.expected_config; },
    r => { r.output.slug = '../outside'; },
    r => { r.output.files['../configuration.yaml'] = '0'.repeat(64); },
    r => { delete r.output.files['.marao-generated.json']; },
    r => { r.output.files['dashboard.yaml'] = 'bad'; },
    r => { r.fixture_domains = []; },
    r => { r.fixture_domains = ['real_camera']; },
    r => { r.fixture_domains.push(r.fixture_domains[0]); },
    r => { r.fixture_files = {}; },
    r => { r.fixture_files['../outside.yaml'] = '0'.repeat(64); },
  ]) {
    const value = receipt(); change(value);
    assert.throws(() => validatePreparedReceipt(value, config, candidate));
  }
  assert.throws(() => validatePreparedReceipt(true, config, candidate));
  assert.throws(() => validatePreparedReceipt(receipt(), { ...config, disposable: false }, candidate));
  assert.throws(() => validatePreparedReceipt(receipt(), { ...config, url: 'http://192.168.0.29:8123', sshHost: '192.168.0.29' }, candidate));
});

test('shared preparation delegates a validated receipt without preparing fixtures', async () => {
  const filename = fileURLToPath(new URL('../../ha-test/prepare.js', import.meta.url));
  const module = { exports: {} }, calls = [];
  const inspected = { config, version: 'current' };
  vm.runInThisContext('(function(require,module,__dirname){' + fs.readFileSync(filename, 'utf8') + '\n})', { filename })(name => {
    if (name === './client') return { ...require('../../ha-test/client'), connect: () => { throw new Error('Fresh preparation attempted'); } };
    if (name === './upgrade/prepared') return {
      candidateIdentity: () => candidate,
      readPreparedReceipt: (file, target, identity) => { assert.equal(file, '/private/receipt.json'); assert.equal(target, config); assert.equal(identity, candidate); calls.push('validate'); },
      verifyPrepared: async (target, file, options) => { assert.equal(target, config); assert.equal(file, '/private/receipt.json'); assert.equal(typeof options.ssh, 'function'); calls.push('inspect'); return inspected; },
    };
    if (name === 'node:child_process') return { spawnSync: (command, args) => {
      assert.equal(command, process.execPath); assert.deepEqual(args, ['frontend_src/build-editor.cjs', '--check']);
      calls.push('check'); return { status: 0 };
    } };
    return require(name);
  }, module, path.dirname(filename));
  const previous = process.env.MARAO_UPGRADE_RECEIPT;
  try {
    process.env.MARAO_UPGRADE_RECEIPT = '/private/receipt.json';
    assert.equal(await module.exports.prepare(config), inspected);
    assert.deepEqual(calls, ['validate', 'check', 'inspect']);
    calls.length = 0;
    assert.deepEqual(await module.exports.prepare(config, { dryRun: true }), { config });
    assert.deepEqual(calls, ['validate']);
    delete process.env.MARAO_UPGRADE_RECEIPT;
    assert.deepEqual(await module.exports.prepare(config, { dryRun: true }), { config });
    assert.deepEqual(calls, ['validate']);
  } finally {
    if (previous === undefined) delete process.env.MARAO_UPGRADE_RECEIPT;
    else process.env.MARAO_UPGRADE_RECEIPT = previous;
  }
});

test('shared preparation fails closed before reseeding an active upgrade', async () => {
  const client = require('../../ha-test/client');
  const filename = fileURLToPath(new URL('../../ha-test/prepare.js', import.meta.url));
  const module = { exports: {} }, calls = [];
  let status = 1;
  const readonly = { ...client,
    connect: async () => ({ close() {}, call: async message => {
      calls.push(message.type);
      if (message.type === 'auth/current_user') return { is_admin: true };
      assert.equal(message.type, 'config_entries/get'); return [];
    } }),
    api: async (_config, method, url) => { assert.equal(method, 'GET'); assert.equal(url, '/api/config'); return { config_dir: config.remoteConfigPath }; },
  };
  vm.runInThisContext('(function(require,module,__dirname){' + fs.readFileSync(filename, 'utf8') + '\n})', { filename })(name => {
    if (name === './client') return readonly;
    if (name === 'node:child_process') return { spawnSync: (command, args) => {
      calls.push(command); assert.equal(command, 'ssh');
      assert.equal(args.at(-1), "test ! -e '/config/.marao-upgrade-active.json' && test ! -L '/config/.marao-upgrade-active.json'");
      return { status, stdout: '', stderr: '' };
    } };
    if (name === './upgrade/prepared') throw new Error('Receipt validation is required');
    return require(name);
  }, module, path.dirname(filename));
  const previous = process.env.MARAO_UPGRADE_RECEIPT;
  try {
    delete process.env.MARAO_UPGRADE_RECEIPT;
    await assert.rejects(module.exports.prepare(config), /upgrade inspection is active/);
    status = 255;
    await assert.rejects(module.exports.prepare(config), /Could not verify/);
    process.env.MARAO_UPGRADE_RECEIPT = '';
    await assert.rejects(module.exports.prepare(config), /requires its private upgrade receipt/);
    process.env.MARAO_UPGRADE_RECEIPT = 'not-a-skip-flag';
    await assert.rejects(module.exports.prepare(config), /Receipt validation is required/);
    assert.ok(!calls.some(command => /node|scp|tar|generate|call_service/.test(command)), 'Active upgrade reached a preparation mutation');
  } finally {
    if (previous === undefined) delete process.env.MARAO_UPGRADE_RECEIPT;
    else process.env.MARAO_UPGRADE_RECEIPT = previous;
  }
});
