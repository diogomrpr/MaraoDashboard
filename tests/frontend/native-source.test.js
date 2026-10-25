import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createEnvelope, formatVersion, migrateSource, parseSource, runMigrationChain, SOURCE_MIGRATIONS, unwrapDocument } from '../../custom_components/marao_dashboard/frontend/MaraoSource.js';
import catalog from '../../custom_components/marao_dashboard/frontend/marao-catalog.json' with {type:'json'};
import labels from '../../custom_components/marao_dashboard/frontend/marao-generator-labels.json' with {type:'json'};

const fixtures = new URL('../../ha-test/upgrade/fixtures/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, fixtures), 'utf8'));
const manifest = read('page-model-expectations.json');

for (const record of manifest.records) test(`native source migration preserves complete historical fixture: ${record.input}`, () => {
  const source = read(record.input), before = structuredClone(source);
  const expected = read(record.expected);
  assert.deepEqual(migrateSource(source), expected);
  assert.deepEqual(migrateSource(expected), expected);
  assert.deepEqual(source, before);
});

test('historical native storage enters the same current source contract', () => {
  const source = read('v0.2.0-storage-dashboard.json');
  assert.deepEqual(migrateSource(source), read('v0.2.0-storage-format-2-expected.json'));
  assert.deepEqual(migrateSource(unwrapDocument({ version: 1, minor_version: 1, key: 'lovelace.marao-dashboard', data: { config: source } }).source), migrateSource(source));
});

test('missing membership reports the exact UI requirement and accepts explicit empty or selected answers', () => {
  const source = { name: 'Safe', rooms: [{ name: 'Office', area: 'office' }], navigation: [] };
  const before = structuredClone(source);
  assert.throws(() => migrateSource(source), error => error.code === 'room_members_needed' && error.details.index === 0);
  const empty = migrateSource(source, { roomEntities: { 0: [] } });
  assert.deepEqual(empty.pages.at(-1).sections[1].entities, []);
  const bound = migrateSource(source, { roomEntities: { 0: ['light.office'] } });
  assert.deepEqual(bound.pages.at(-1).sections[1].entities, ['light.office']);
  assert.deepEqual(source, before);
});

test('each adjacent step preserves source and advances exactly one format', () => {
  const source = { name: 'Safe', rooms: [{ name: 'Office', entities: [], area: 'office' }], navigation: [] };
  const first = runMigrationChain(source, {}, SOURCE_MIGRATIONS.slice(0, 1), 1);
  assert.equal(first.config_version, 1);
  assert.deepEqual(first.rooms[0].entities, []);
  const final = runMigrationChain(first, {}, SOURCE_MIGRATIONS, 2);
  assert.deepEqual(final, migrateSource(source));
  assert.equal(Object.hasOwn(source, 'config_version'), false);
});

test('future steps append without changing earlier results; missing or failing steps never mutate originals', () => {
  const source = { config_version: 0, selections: [], unknown: { retained: true } };
  const one = { from: 0, to: 1, convert: value => ({ ...value, first: true }) };
  const two = { from: 1, to: 2, convert: value => ({ ...value, second: true }) };
  const first = runMigrationChain(source, {}, [one], 1);
  assert.deepEqual(runMigrationChain(source, {}, [one, two], 2), { ...first, config_version: 2, second: true });
  for (const steps of [[two, one], [one, one], [one]]) assert.throws(() => runMigrationChain(source, {}, steps, 2), /migration_chain_invalid/);
  assert.throws(() => runMigrationChain(source, {}, [one, { ...two, convert: value => { value.unknown.retained = false; throw new Error('stop'); } }], 2), /stop/);
  assert.deepEqual(source, { config_version: 0, selections: [], unknown: { retained: true } });
});

test('historical adjacent output is independent of mutable current catalog and presentation labels', () => {
  const record=manifest.records[0], source=read(record.input);
  const savedCard=catalog.cards[0].label, savedLabel=labels.en['overview.lights'];
  try {
    catalog.cards[0].label='A different latest default';labels.en['overview.lights']='A different latest label';
    assert.deepEqual(runMigrationChain(source,{},SOURCE_MIGRATIONS.slice(0,1),1),read(record.predecessor));
    assert.deepEqual(migrateSource(source),read(record.expected));
  } finally {catalog.cards[0].label=savedCard;labels.en['overview.lights']=savedLabel;}
});

test('invalid/future versions and nonfinite JSON fail before conversion', () => {
  for (const version of [true, -1, 0.5, '2', null, 3]) assert.throws(() => formatVersion({ config_version: version }));
  assert.throws(() => parseSource('{"number":1e999}'), /number_invalid/);
  assert.throws(() => parseSource('{"unknown":9007199254740993}'), error => error.code === 'number_precision' && error.path === '$.unknown');
  assert.deepEqual(parseSource('{"unknown":9007199254740991}'), { unknown: Number.MAX_SAFE_INTEGER });
  assert.throws(() => parseSource('[]'), /source_object/);
  assert.throws(() => parseSource('{broken}'), /json_invalid/);
});

test('native envelope retains exact source text and opaque metadata with a noncolliding editor route', () => {
  const sourceText = '{\n "config_version":2,"name":"Safe","landing_page":"marao-editor","navigation":[],"pages":[{"name":"Home","path":"marao-editor","entities":[]}],"unknown":{"empty":[]}\n}';
  const envelope = createEnvelope(sourceText, 'marao-dashboard', { other: { retained: true } });
  assert.equal(envelope.strategy.source_json, sourceText);
  assert.equal(envelope.strategy.editor_path, 'marao-editor-editor');
  for(const path of [42,true,'../outside','']) assert.throws(()=>createEnvelope(sourceText,'marao-dashboard',{strategy:{editor_path:path}}),/native_editor_path_invalid/);
  assert.deepEqual(envelope.other, { retained: true });
  assert.equal(unwrapDocument(envelope).sourceText, sourceText);
  assert.deepEqual(createEnvelope(sourceText, 'marao-dashboard', envelope), envelope);
  assert.throws(() => unwrapDocument({ ...envelope, views: [] }), /native_envelope_invalid/);
  assert.throws(() => unwrapDocument({ strategy: { ...envelope.strategy, envelope_version: 2 } }), /native_envelope_invalid/);
});
