import test from 'node:test';
import assert from 'node:assert/strict';
import { OrdinaryConversionSession } from '../../frontend_src/ordinary-session.js';
import { createEnvelope } from '../../custom_components/marao_dashboard/frontend/MaraoSource.js';

const source = '{\n "config_version":2,"name":"Safe","landing_page":"home","navigation":[],"pages":[{"name":"Home","path":"home","entities":[]}],"future":{"keep":[]}\n}\n';
const metadata = { entities: [], areas: [] };
function fixture() {
  let document = createEnvelope(source, 'marao-dashboard', { extension: { keep: [] } });
  const calls = [], archiveStore = new Map();
  const hass = { config: { version: '2025.12.0' }, user: { is_admin: true }, language: 'en', async callWS(message) {
    calls.push(message);
    if (message.type === 'lovelace/config') return structuredClone(document);
    if (message.type === 'lovelace/config/save') { document = structuredClone(message.config); return null; }
    if (message.type === 'frontend/get_system_data') return {value:archiveStore.get(message.key) ?? null};
    if (message.type === 'frontend/set_system_data') { archiveStore.set(message.key, message.value); return null; }
    assert.fail('Unexpected request ' + message.type);
  } };
  const session = new OrdinaryConversionSession(hass, 'marao-dashboard', { compatibility: () => true, packageVersion: 'test' });
  return { hass, session, calls, archiveStore, get document() { return document; }, replace(value) { document = structuredClone(value); }, writes() { return calls.filter(call => call.type === 'lovelace/config/save'); } };
}
const acknowledge = session => session.acknowledge({ recovery: session.recovery, exported: true, backupConfirmed: true, visibilityReviewed: true });

test('staging is read-only and explicit reviewed conversion saves the same registration exactly once', async () => {
  const f = fixture(), original = structuredClone(f.document);
  const { result, recovery } = await f.session.stage(undefined, metadata);
  assert.deepEqual(f.document, original); assert.equal(f.writes().length, 0);
  assert.deepEqual(recovery.original_document, original); assert.equal(recovery.source_text, source);
  await assert.rejects(f.session.save(), /native_recovery_missing/);
  await acknowledge(f.session);
  const saving = f.session.save(); assert.equal(f.session.save(), saving);
  assert.equal((await saving).written, true); assert.equal(f.writes().length, 1);
  assert.equal(f.writes()[0].url_path, 'marao-dashboard'); assert.deepEqual(f.document, result.document);
  assert.deepEqual(f.document.extension, original.extension);
  assert.equal((await f.session.save()).written, false); assert.equal(f.writes().length, 1);
});

test('future source, unsupported host, lost authority and stale saved state never write', async () => {
  for (const failure of ['future', 'host', 'admin', 'version', 'stale']) {
    const f = fixture();
    if (failure === 'future') { f.replace({ ...f.document, strategy: { ...f.document.strategy, source_json: '{"config_version":3}' } }); await assert.rejects(f.session.stage(undefined, metadata)); }
    else {
      await f.session.stage(undefined, metadata); await acknowledge(f.session);
      if (failure === 'host') f.session.compatibility = () => false;
      if (failure === 'admin') f.hass.user.is_admin = false;
      if (failure === 'version') f.hass.config.version = '2025.11.9';
      if (failure === 'stale') f.replace({ ...f.document, future: 'changed by another client' });
      const before = structuredClone(f.document);
      await assert.rejects(f.session.save()); assert.deepEqual(f.document, before);
    }
    assert.equal(f.writes().length, 0, failure);
  }
});

test('uncertain native failures retain both copies and require a fresh classification before explicit retry', async () => {
  for (const accepted of [false, true]) {
    const f = fixture(); await f.session.stage(undefined, metadata); await acknowledge(f.session);
    const recovery = structuredClone(f.session.recovery), native = f.hass.callWS;
    f.hass.callWS = async message => {
      if (message.type === 'lovelace/config/save') { if (accepted) await native(message); throw new Error('connection lost after dispatch'); }
      return native(message);
    };
    await assert.rejects(f.session.save(), /connection lost/); assert.deepEqual(f.session.recovery, recovery);
    await acknowledge(f.session); await assert.rejects(f.session.save(), /native_conversion_recheck/);
    f.hass.callWS = native;
    assert.equal(await f.session.inspectRecovery(), accepted ? 'converted' : 'original');
    await acknowledge(f.session);
    assert.equal((await f.session.save()).written, !accepted);
    assert.deepEqual(f.document, recovery.proposed_document);
  }
});

test('downloaded recovery resumes after reload without reconversion and blocks divergent data', async () => {
  const f = fixture(); await f.session.stage(undefined, metadata);
  const recovery = structuredClone(f.session.recovery);
  const resumed = new OrdinaryConversionSession(f.hass, 'marao-dashboard', { compatibility: () => true });
  assert.equal(await resumed.resume(recovery), 'original'); assert.equal(f.writes().length, 0);
  await acknowledge(resumed); await resumed.save();
  assert.equal(await resumed.resume(recovery), 'converted');
  f.replace({ ...f.document, title: 'New native edits' });
  assert.equal(await resumed.resume(recovery), 'divergent'); await acknowledge(resumed);
  await assert.rejects(resumed.save(), /native_conversion_recheck/); assert.equal(f.writes().length, 1);
  const other = new OrdinaryConversionSession(f.hass, 'other-dashboard', { compatibility: () => true });
  await assert.rejects(other.resume(recovery), /native_root_conflict/);
});

test('mismatched or corrupt source/recovery data cannot replace the staged dashboard', async () => {
  const f = fixture();
  await assert.rejects(f.session.stage(source.replace('Safe', 'Changed'), metadata), /native_conversion_stale/);
  await f.session.stage(source, metadata);
  assert.deepEqual(f.session.result.document.extension, { keep: [] });
  assert.equal(f.session.recovery.original_text, source);
  const damaged = structuredClone(f.session.recovery); damaged.proposed_document.title = 'Changed';
  await assert.rejects(f.session.acknowledge({ recovery: damaged, exported: true, backupConfirmed: true, visibilityReviewed: true }), /native_recovery_changed/);
  await assert.rejects(f.session.save(), /native_recovery_missing/); assert.equal(f.writes().length, 0);
});

test('a changed UI identity invalidates an in-flight pre-save read before any write', async () => {
  const f=fixture();await f.session.stage(undefined,metadata);await acknowledge(f.session);
  let release,started;const pending=new Promise(resolve=>{release=resolve;}),reading=new Promise(resolve=>{started=resolve;}),native=f.hass.callWS;
  f.hass.callWS=async message=>{if(message.type==='lovelace/config'){started();await pending;}return native(message);};
  const saving=f.session.save();await reading;f.session.invalidate();release();
  await assert.rejects(saving,/native_conversion_stale/);assert.equal(f.writes().length,0);
});

test('archive publication precedes pointer promotion and a portable receipt repairs a missing archive', async () => {
  const f = fixture();
  const {recovery} = await f.session.stage(undefined, metadata);
  assert.equal(f.archiveStore.size, 0);
  assert.equal(recovery.version, 2);
  await acknowledge(f.session);
  await f.session.save();
  assert.deepEqual(f.calls.slice(-5).map(call => call.type), ['frontend/get_system_data','frontend/set_system_data',
    'frontend/get_system_data','lovelace/config','lovelace/config/save']);
  assert.equal(f.document.marao.migration.version, 3);
  assert.equal(f.archiveStore.size, 1);
  const other = fixture();
  other.replace(f.document);
  const resumed = other.session;
  assert.equal(await resumed.resume(recovery), 'converted');
  assert.equal(other.archiveStore.size, 0);
  await acknowledge(resumed);
  assert.equal((await resumed.save()).written, false);
  assert.deepEqual([...other.archiveStore], [...f.archiveStore]);
  assert.equal(other.writes().length, 0);
});

test('a bad archive readback or a concurrent native edit during publication cannot promote the pointer', async () => {
  for (const reason of ['readback', 'concurrent edit']) {
    const f = fixture(), original = f.document;
    await f.session.stage(undefined, metadata);
    await acknowledge(f.session);
    const native = f.hass.callWS;
    f.hass.callWS = async command => {
      const result = await native(command);
      if (command.type === 'frontend/set_system_data') {
        if (reason === 'readback') f.archiveStore.set(command.key, '{}');
        else f.replace({...original, title:'Another editor'});
      }
      return result;
    };
    await assert.rejects(f.session.save());
    assert.equal(f.writes().length, 0);
    assert.deepEqual(f.document, reason === 'readback' ? original : {...original, title:'Another editor'});
  }
});
