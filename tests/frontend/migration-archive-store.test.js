import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ensureMigrationArchive, fetchMigrationArchive} from '../../frontend_src/migration-archive-store.js';

const source = '{"config_version":2,"name":"Fixture","pages":[]}';
const record = {version:1, source_kind:'source', source_version:2, original_source:source,
  original_document:JSON.parse(source), supplements:[], yaml:[], accounting:[]};
const archive = {kind:'marao-migration-archive', version:1, record};
const json = JSON.stringify(record);
const ref = {version:3, sha256:createHash('sha256').update(json).digest('hex'), bytes:Buffer.byteLength(json)};
function fixture() {
  const store = new Map(), calls = [];
  const callWS = async message => {
    calls.push(message.type);
    assert.equal(message.key, 'marao.migration.' + ref.sha256);
    if (message.type === 'frontend/get_system_data') return {value:store.get(message.key) ?? null};
    assert.equal(message.type, 'frontend/set_system_data');
    store.set(message.key, message.value);
  };
  return {store, calls, callWS};
}

test('different sessions read the same verified archive and an identical retry does not write it again', async () => {
  const {callWS, calls, store} = fixture();
  await assert.rejects(fetchMigrationArchive(callWS, ref), /missing/i);
  await ensureMigrationArchive(callWS, ref, archive, () => true);
  assert.equal([...store.values()][0], JSON.stringify(archive));
  assert.deepEqual(await fetchMigrationArchive(callWS, ref), archive);
  assert.deepEqual(await ensureMigrationArchive(callWS, ref, archive, () => true), archive);
  assert.equal(calls.filter(call => call === 'frontend/set_system_data').length, 1);
});

test('unavailable, conflicting, corrupt or malformed storage responses never authorize a write', async () => {
  for (const read of [async () => {throw Error('unavailable');}, () => ({}), () => ({value:[]}),
    () => ({value:'invalid JSON'}), () => ({value:JSON.stringify({...archive, record:{...record, unexpected:true}})})]) {
    const calls = [];
    await assert.rejects(ensureMigrationArchive(async message => {
      calls.push(message.type);
      return read();
    }, ref, archive, () => true));
    assert.deepEqual(calls, ['frontend/get_system_data']);
  }
});

test('an uncertain archive write is verified before proceeding and losing session identity stops preparation', async () => {
  for (const saved of [false, true]) {
    const {callWS} = fixture();
    const ensure = ensureMigrationArchive(async message => {
      if (message.type === 'frontend/get_system_data') return callWS(message);
      if (saved) await callWS(message);
      throw Error('lost acknowledgement');
    }, ref, archive, () => true);
    if (saved) assert.deepEqual(await ensure, archive);
    else await assert.rejects(ensure, /lost acknowledgement/);
  }
  const {callWS, calls} = fixture();
  let current = true;
  await assert.rejects(ensureMigrationArchive(async message => {
    current = false;
    return callWS(message);
  }, ref, archive, () => current), /session changed/i);
  assert.deepEqual(calls, ['frontend/get_system_data']);
});
