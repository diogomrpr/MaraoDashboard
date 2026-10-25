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
  fs.writeFileSync(path.join(bin,'stat'),'#!'+process.execPath+'\nconsole.log((require("node:fs").statSync(process.argv.at(-1)).mode&0o7777).toString(8));\n',{mode:0o700});
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
      if (method === 'GET' && endpoint === '/api/config') return { config_dir: remote, version:'2026.10.0' };
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

async function nativeFixture(t) {
  const f=fixture(t), {createEnvelope}=await import('../../custom_components/marao_dashboard/frontend/MaraoSource.js');
  fs.rmSync(f.remote+f.integration,{recursive:true});
  const document=createEnvelope(JSON.stringify({config_version:2,name:'Safe',landing_page:'card-test',navigation:[],pages:[{name:'Cases',path:'card-test',entities:[]}]}),'marao-dashboard');
  const folder='MaraoFrontend', installed=f.remote+'/www/community/'+folder;
  fs.mkdirSync(installed,{recursive:true});fs.writeFileSync(installed+'/old.js','old');
  const candidate=f.root+'/native-stage', dist=candidate+'/dist';fs.mkdirSync(dist,{recursive:true});
  const identity='b'.repeat(64);
  for(const file of ['MaraoFrontend.js','MaraoFrontend.release.json',identity+'--MaraoNativeDashboard.js',identity+'--MaraoDashboard.js',identity+'--MaraoDashboardJsonWorker.js']) fs.writeFileSync(dist+'/'+file,'native candidate '+file);
  f.dependencies.buildFrontend=async()=>({destination:candidate,identity});
  f.dependencies.connect=async()=>({close(){},async call(message) {
    f.calls.push(message.type);
    if(message.type==='auth/current_user') return {is_admin:true};
    if(message.type==='lovelace/config') return structuredClone(document);
    if(message.type==='config_entries/get') return [];
    if(message.type==='lovelace/resources') return [{url:'/hacsfiles/'+folder+'/MaraoFrontend.js?hacstag=1',type:'module'}];
    throw new Error('Unexpected native mutation: '+message.type);
  }});
  const api=f.dependencies.api;
  f.dependencies.api=async(config,method,endpoint,...args)=> {
    if(method==='GET' && endpoint.startsWith('/hacsfiles/'+folder+'/')) {f.calls.push('GET '+endpoint);return fs.readFileSync(installed+'/'+endpoint.split('/').at(-1),'utf8');}
    return api(config,method,endpoint,...args);
  };
  return {...f,installed,dist,document};
}

test('native sync installs a complete graph without changing source, fixtures or restarting HA; repeat is a no-op',async t=>{
  const f=await nativeFixture(t), before=f.remoteBytes();
  const result=await prepareFrontend(f.config,f.dependencies);
  assert.equal(result.mode,'native');assert.equal(result.installed,true);
  assert.equal(result.editorURL,'/marao-dashboard/marao-editor');assert.equal(result.previewDashboard.views[0].path,'card-test');
  assert.deepEqual(localHashes(f.installed),localHashes(f.dist));
  const preserved=values=>Object.fromEntries(Object.entries(values).filter(([file])=>!file.startsWith('www/community/') && file!=='.marao-test-deployment.json'));
  assert.deepEqual(preserved(f.remoteBytes()),preserved(before));assert.deepEqual(result.dashboard,f.document);
  assert.ok(!f.calls.some(call=>/POST|save|restart|generate|reload/.test(call)));
  assert.equal(f.calls.filter(call=>call==='upload').length,1);
  f.calls.length=0;await prepareFrontend(f.config,f.dependencies);
  assert.ok(!f.calls.includes('upload'));
});

test('native stale serving retains installed candidate and recovery copy without claiming readiness',async t=>{
  const f=await nativeFixture(t), api=f.dependencies.api;
  f.dependencies.api=(config,method,endpoint,...args)=>endpoint.includes('/hacsfiles/')?'stale':api(config,method,endpoint,...args);
  await assert.rejects(prepareFrontend(f.config,f.dependencies),/Served native asset is stale[\s\S]*recovery data retained/);
  assert.deepEqual(localHashes(f.installed),localHashes(f.dist));
  assert.equal(fs.readFileSync(path.dirname(f.uploads[0])+'/frontend-before/old.js','utf8'),'old');
  assert.deepEqual(JSON.parse(fs.readFileSync(f.remote+'/.marao-test-deployment.json')),f.receipt);
});

test('explicit native fixture preparation updates only owned code, restarts once and keeps source and helpers',async t=>{
  const f=await nativeFixture(t),{syncNativeFixtures}=require('../../ha-test/prepare-native-frontend');
  for(const [file,contents] of Object.entries({'manifest.json':'{"domain":"marao_test_camera"}','__init__.py':'# fixture code'})) {
    f.write(f.root,'/ha-test/custom_components/marao_test_camera/'+file,contents);
    f.write(f.remote,'/custom_components/marao_test_camera/'+file,'old '+file);
  }
  f.write(f.remote,'/custom_components/marao_test_camera/marao-fixture.json','{"owner":"marao-dashboard-tests"}\n');
  const before=f.remoteBytes();let restarts=0;f.dependencies.restart=async()=>{restarts++;};
  const result=await syncNativeFixtures(f.config,f.dependencies);assert.equal(result.changed,true);assert.equal(restarts,1);
  const after=f.remoteBytes();
  for(const [file,contents] of Object.entries(before))if(!['custom_components/marao_test_camera/manifest.json','custom_components/marao_test_camera/__init__.py'].includes(file))assert.equal(after[file],contents);
  assert.equal(after['custom_components/marao_test_camera/__init__.py'],'# fixture code');
  assert.equal((await syncNativeFixtures(f.config,f.dependencies)).changed,false);assert.equal(restarts,1);
  f.write(f.remote,'/custom_components/marao_test_camera/marao-fixture.json','{"owner":"another-owner"}');
  await assert.rejects(syncNativeFixtures(f.config,f.dependencies),/guard failed/);assert.equal(restarts,1);
});


test('native preparation refuses unsupported HA before building or uploading',async t=>{
  const f=await nativeFixture(t), before=f.remoteBytes(), api=f.dependencies.api;
  f.dependencies.api=(config,method,endpoint,...args)=>endpoint==='/api/config'?{config_dir:f.remote,version:'2026.9.9'}:api(config,method,endpoint,...args);
  await assert.rejects(prepareFrontend(f.config,f.dependencies),/2026.10.0/);
  assert.ok(!f.calls.includes('build'));assert.deepEqual(f.remoteBytes(),before);
});


test('editor preparation rebuilds bundled source helpers but caches generated outputs',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'marao-editor-cache-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const frontend=path.join(directory,'custom_components/marao_dashboard/frontend');fs.mkdirSync(frontend,{recursive:true});fs.mkdirSync(path.join(directory,'frontend_src'));
  fs.writeFileSync(path.join(directory,'package-lock.json'),'{}');fs.writeFileSync(path.join(frontend,'MaraoSource.js'),'first source');
  fs.writeFileSync(path.join(directory,'frontend_src/build-editor.cjs'),"const fs=require('fs');const p='custom_components/marao_dashboard/frontend/';fs.copyFileSync(p+'MaraoSource.js',p+'MaraoNativeModel.js');fs.appendFileSync('build-count','1');");
  const {buildEditor}=require('../../ha-test/prepare-frontend');buildEditor(directory);buildEditor(directory);
  assert.equal(fs.readFileSync(path.join(directory,'build-count'),'utf8'),'1');
  fs.writeFileSync(path.join(frontend,'MaraoSource.js'),'second source');buildEditor(directory);
  assert.equal(fs.readFileSync(path.join(frontend,'MaraoNativeModel.js'),'utf8'),'second source');assert.equal(fs.readFileSync(path.join(directory,'build-count'),'utf8'),'11');
});


test('native preparation refuses an unexpected configured root alias before writing',async t=>{
  const f=await nativeFixture(t), alias=f.remote+'-alias';fs.symlinkSync(f.remote,alias);t.after(()=>fs.rmSync(alias,{force:true}));
  const api=f.dependencies.api;f.dependencies.api=(config,method,endpoint,...args)=>endpoint==='/api/config'?{config_dir:alias,version:'2026.10.0'}:api(config,method,endpoint,...args);
  await assert.rejects(prepareFrontend({...f.config,remoteConfigPath:alias},f.dependencies),/guard failed/);
  assert.ok(!f.calls.includes('upload'));
});
