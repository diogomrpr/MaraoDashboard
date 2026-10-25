import test from 'node:test';
import assert from 'node:assert/strict';
import { NativeSession } from '../../frontend_src/native-session.js';
import { createEnvelope } from '../../custom_components/marao_dashboard/frontend/MaraoSource.js';

const text = '{\n "config_version":2,"name":"Safe","landing_page":"home","navigation":[],"pages":[{"name":"Home","path":"home","entities":[]}],"unknown":{"keep":[]}\n}\n';
function fixture() {
  let document = createEnvelope(text,'marao-dashboard',{extension:{keep:[]}}), listener;
  const calls = [];
  const hass = {config:{version:'2026.10.0'},user:{is_admin:true},states:{},entities:{},areas:{},devices:{},connection:{async subscribeEvents(callback,type) {assert.equal(type,'lovelace_updated');listener=callback;return () => {listener=null;};}},async callWS(message) {
    calls.push(message);
    if (message.type === 'lovelace/config') return structuredClone(document);
    if (message.type === 'lovelace/config/save') {document=structuredClone(message.config);listener?.({data:{url_path:'marao-dashboard'}});return null;}
    if (/^config\/(entity|device|area)_registry\/list$/.test(message.type)) return [];
    assert.fail('Unexpected native request '+message.type);
  }};
  return {hass,calls,get document(){return document;},replace:value => {document=value;},event:data => listener?.({data})};
}
test('native read, unchanged save and notifications preserve exact source text and opaque envelope data', async () => {
  const f = fixture(), session = new NativeSession(f.hass,'marao-dashboard');
  assert.equal((await session.read()).config,text); let notified=0;
  const remove=await session.subscribe(() => {notified++;});
  f.event({url_path:'unrelated-dashboard'});assert.equal(notified,0);
  f.event({url_path:'marao-dashboard'});assert.equal(notified,1);
  const saving=session.save(JSON.stringify(JSON.parse(text)));assert.equal(session.save(text),saving);await saving;
  assert.equal(f.document.strategy.source_json,text);assert.deepEqual(f.document.extension,{keep:[]});
  assert.equal(f.calls.filter(call => call.type === 'lovelace/config/save').length,1);
  assert.equal(notified,1);remove();
  assert.ok(f.calls.every(call => !call.type.startsWith('marao_dashboard/')));
});
test('detected competing native saves retain the original baseline and never write', async () => {
  const f=fixture(), session=new NativeSession(f.hass,'marao-dashboard');await session.read();
  const baseline=structuredClone(session.baseline);f.replace({...f.document,other:'changed'});
  await assert.rejects(session.save(text),/another session/);
  assert.deepEqual(session.baseline,baseline);assert.equal(f.calls.some(call => call.type === 'lovelace/config/save'),false);
});
test('authorization, unsupported HA and reported write errors cannot advance the session baseline', async () => {
  for (const failure of ['admin','version','write']) {
    const f=fixture(), session=new NativeSession(f.hass,'marao-dashboard');await session.read();
    const baseline=structuredClone(session.baseline);
    if (failure==='admin') f.hass.user.is_admin=false;
    if (failure==='version') f.hass.config.version='2026.9.9';
    if (failure==='write') {const original=f.hass.callWS;f.hass.callWS=async message => {if(message.type==='lovelace/config/save') throw new Error('native write error');return original(message);};}
    await assert.rejects(session.save(text));assert.deepEqual(session.baseline,baseline);
  }
});
test('native strategy settings emit a complete config-changed draft without a server write', async () => {
  const f=fixture();let changed;
  const session=new NativeSession(f.hass,'marao-dashboard',{strategy:f.document.strategy,onChange:value => {changed=value;}});
  await session.read();const next=JSON.parse(text);next.name='Changed';await session.save(JSON.stringify(next));
  assert.equal(JSON.parse(changed.source_json).name,'Changed');assert.equal(f.calls.some(call => call.type==='lovelace/config/save'),false);
});
test('a fresh source-free native strategy creates a one-time local starter and writes only on Save', async () => {
  const f=fixture();f.replace({strategy:{type:'custom:marao-dashboard'}});
  const session=new NativeSession(f.hass,'marao-dashboard'), read=await session.read();
  assert.equal(JSON.parse(read.config).config_version,2);assert.equal(f.document.strategy.source_json,undefined);
  assert.ok((await session.read('context')).page_templates);
  await session.save(read.config);assert.equal(f.document.strategy.source_json,read.config);
  assert.equal(f.calls.filter(call=>call.type==='lovelace/config/save').length,1);
});
test('an empty, corrupt or newer native source never falls back to starter content', async () => {
  for (const strategy of [{type:'custom:marao-dashboard',source_json:''},{type:'custom:marao-dashboard',envelope_version:2},{type:'custom:marao-dashboard',source_json:'{broken',envelope_version:1,compiler_contract:1}]) {
    const f=fixture();f.replace({strategy});const before=structuredClone(f.document);
    await assert.rejects(new NativeSession(f.hass,'marao-dashboard').read());
    assert.deepEqual(f.document,before);assert.equal(f.calls.some(call=>call.type==='lovelace/config/save'),false);
    await assert.rejects(new NativeSession(f.hass,'marao-dashboard',{strategy}).read());
  }
});
