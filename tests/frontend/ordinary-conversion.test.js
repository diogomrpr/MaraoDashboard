import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { canonicalDocument, classifyDashboard, classifyRecovery, convertOrdinaryDocument, createRecoveryExport, sha256, validateRecoveryExport } from '../../frontend_src/ordinary-model.js';
import { createEnvelope } from '../../custom_components/marao_dashboard/frontend/MaraoSource.js';

const directory = new URL('../../ha-test/upgrade/fixtures/', import.meta.url);
const text = name => fs.readFileSync(new URL(name, directory), 'utf8');
const json = name => JSON.parse(text(name));
const context = { dashboardRoot: 'marao-dashboard', entities: [], areas: [], assetBaseURL:'https://ha.invalid/hacsfiles/MaraoDashboard/' };
const source = { config_version: 2, name: 'Safe', landing_page: 'home', navigation: [], pages: [{ name: 'Home', path: 'home', entities: [] }] };
const convert = value => convertOrdinaryDocument(JSON.stringify(value), context);

test('v0.23.4 synthetic released-contract baseline matches an independently specified ordinary target', () => {
  const provenance = json('ordinary-baseline.json');
  for (const [file, hash] of Object.entries(provenance.files)) assert.equal(createHash('sha256').update(text(file)).digest('hex'), hash, file);
  const input = text('v0.23.4-ordinary-envelope.json'), envelope = JSON.parse(input), before = structuredClone(envelope);
  const result = convertOrdinaryDocument(input, context), target = structuredClone(result.document);
  const origin = target.marao.migration; delete target.marao.migration;
  assert.deepEqual(target, json('v0.23.4-ordinary-expected.json'));
  assert.equal(result.originalText, input);
  assert.equal(origin.original_source, text('v0.23.4-ordinary-source.json'));
  assert.deepEqual(origin.original_document, before);
  assert.deepEqual(envelope, before);
  assert.equal(origin.yaml[0].text, JSON.parse(envelope.strategy.source_json).pages[1].sections[0].entities[2].yaml);
  assert.ok(origin.accounting.some(item => item.source === '$.unknown.keep' && item.disposition === 'provenance'));
  assert.ok(origin.accounting.some(item => item.source === '$.pages[1].sections[0].entities[1]' && item.target === '$.views[0].sections[0].cards[1]'));
  assert.equal(Object.hasOwn(target, 'strategy'), false);
  assert.equal(JSON.stringify(target).includes('custom:marao-control-grid'), false);
});

test('ordinary native documents are stable and do not inherit retired layout or source limits', () => {
  const ordinary = { title: 'Native', views: [{ title: 'Any layout', type: 'sections', max_columns: 8, sections: [{ type: 'grid', cards: [{ type: 'markdown', content: 'Untouched', grid_options: { columns: 9 }, future: [] }] }] }], future: { order: [3, 1] } };
  assert.equal(classifyDashboard(ordinary).kind, 'ordinary');
  const result = convert(ordinary); assert.equal(result.changed, false); assert.deepEqual(result.document, ordinary);
  assert.equal(convert(result.document).changed, false);
  assert.throws(() => convertOrdinaryDocument(JSON.stringify(ordinary), { ...context, supplements: [{ page: 'home', yaml: '- type: markdown' }] }), /ordinary_conversion_unneeded/);
});

test('each historical source uses the ordered chain once; newer and ambiguous inputs are left untouched', () => {
  for (const record of json('page-model-expectations.json').records) {
    const original = text(record.input), result = convertOrdinaryDocument(original, context);
    assert.deepEqual(result.source, json(record.expected));
    assert.equal(result.originalText, original); assert.equal(Object.hasOwn(result.document, 'strategy'), false);
  }
  const oldNative = json('v0.2.0-storage-dashboard.json');
  assert.equal(classifyDashboard(oldNative).kind, 'historical-native');
  assert.deepEqual(convert(oldNative).source, json('v0.2.0-storage-format-2-expected.json'));
  for (const invalid of [
    { config_version: 3, name: 'Future' },
    { views: [], config_version: 2, pages: [] },
    { strategy: { type: 'custom:unrelated' } },
    { ...createEnvelope(JSON.stringify(source), context.dashboardRoot), marao: { version: 1, navbar: { routes: [] } } },
    { strategy: { ...createEnvelope(JSON.stringify(source), context.dashboardRoot).strategy, envelope_version: 2 } },
  ]) {
    const before = canonicalDocument(invalid); assert.throws(() => convert(invalid)); assert.equal(canonicalDocument(invalid), before);
  }
  assert.throws(() => convertOrdinaryDocument(JSON.stringify(createEnvelope(JSON.stringify(source), 'another-dashboard')), context), /native_root_conflict/);
});

test('automatic details stay occurrence-owned while referenced and custom-extended sheets stay external', () => {
  const value = structuredClone(source);
  value.pages[0].entities = [{ id: 'door', template: 'md_access_card', entity_id: 'lock.safe' }, { id: 'camera', template: 'md_camera_card', entity_id: 'camera.safe' }];
  const yaml = '  # preserve exactly\n  - type: markdown\n    content: Custom safe details\n    unknown: []\n';
  value.pages[0].custom_content = [{ popup_hash: '#page-home-door-popup', yaml }];
  const result = convert(value), sections = result.document.views[0].sections;
  const cards = sections.flatMap(section => section.cards);
  const door = cards.find(card => card.id === 'door'), camera = cards.find(card => card.id === 'camera');
  assert.equal(door.variables.popup_hash, '#page-home-door-popup');
  assert.equal(Object.hasOwn(camera, 'variables'), false);
  const sheet = cards.find(card => card.hash === '#page-home-door-popup');
  assert.equal(sheet.cards.at(-1).content, 'Custom safe details');
  assert.equal(cards.some(card => card.hash === '#page-home-camera-popup'), false);
  assert.equal(result.document.marao.migration.yaml[0].text, yaml);
});

test('automatic domain grouping retains member order and fixed layouts retain exact native widths', () => {
  const value = structuredClone(source);
  value.pages[0].sections = [{ entities: [{ entity_id: 'light.safe_b' }, { entity_id: 'sensor.safe' }, { entity_id: 'light.safe_a' }] }, ...[1, 2, 3, 4, 6].map(columns => ({ columns, entities: [{ entity_id: 'light.safe' }] }))];
  delete value.pages[0].entities;
  const sections = convert(value).document.views[0].sections;
  assert.deepEqual(sections[0].cards.map(card => card.entity_id), ['sensor.safe', 'light.safe_b', 'light.safe_a']);
  assert.deepEqual(sections.slice(1).map(section => section.cards[0].grid_options.columns), [12, 6, 4, 3, 2]);
});

test('embedded YAML links retain external sheets once, including authored raw popups', () => {
  const value = structuredClone(source);
  value.pages[0].entities = [{ id: 'door', template: 'md_access_card', entity_id: 'lock.safe' }, { template: 'ha_card', yaml: 'type: button\ntap_action:\n  action: navigate\n  navigation_path: "#page-home-door-popup"\n' }];
  value.pages[0].cards = [{ type: 'custom:marao-popup-card', hash: '#custom-details', cards: [{ type: 'markdown', content: 'Safe' }] }, { type: 'button', tap_action: { action: 'navigate', navigation_path: '#custom-details' } }];
  const cards = convert(value).document.views[0].sections.flatMap(section => section.cards);
  assert.equal(cards.filter(card => card.hash === '#custom-details').length, 1);
  assert.equal(cards.filter(card => card.hash === '#page-home-door-popup').length, 1);
  assert.equal(cards.find(card => card.id === 'door').variables.popup_hash, '#page-home-door-popup');
});

test('ordinary raw and external popup images use persistent package aliases without changing originals or explicit replacements', () => {
  const value=structuredClone(source),image='/marao_dashboard_static/brand/mark.svg?v=old';
  value.pages[0].entities=[{id:'door',template:'md_access_card',entity_id:'lock.safe'}];
  value.pages[0].cards=[{type:'picture',image},{type:'picture',image:'/marao_dashboard_static/private.jpg'}];
  const yaml=`- type: picture\n  image: ${image}\n`;
  value.pages[0].custom_content=[{popup_hash:'#page-home-door-popup',yaml}];
  const original=JSON.stringify(value),base='https://ha.invalid/hacsfiles/custom-folder/';
  const replacements={'$.pages[0].cards[1].image#0':'/local/private-image.jpg'};
  assert.throws(()=>convertOrdinaryDocument(original,{...context,assetBaseURL:undefined,fileReplacements:replacements}),error=>error.code==='native_asset_base_needed'&&error.details.alias==='MaraoAsset--brand--mark.svg');
  const result=convertOrdinaryDocument(original,{...context,assetBaseURL:base,fileReplacements:{'$.pages[0].cards[1].image#0':'/local/private-image.jpg'}});
  const cards=result.document.views[0].sections.flatMap(section=>section.cards);
  assert.equal(cards.find(card=>card.type==='picture').image,base+'MaraoAsset--brand--mark.svg');
  assert.equal(cards.find(card=>card.hash==='#page-home-door-popup').cards.at(-1).image,base+'MaraoAsset--brand--mark.svg');
  assert.ok(cards.some(card=>card.image==='/local/private-image.jpg'));
  assert.equal(result.originalText,original);assert.equal(result.document.marao.migration.original_source,original);
  assert.equal(result.document.marao.migration.yaml[0].text,yaml);
  assert.deepEqual(convertOrdinaryDocument(original,{...context,assetBaseURL:base+'MaraoFrontend.js?hacstag=1',fileReplacements:replacements}).document,result.document);
  for(const invalid of ['file:///tmp/frontend/','javascript:alert(1)','https://user:password@ha.invalid/hacsfiles/test/','https://ha.invalid/marao_dashboard_static/'])assert.throws(()=>convertOrdinaryDocument(original,{...context,assetBaseURL:invalid,fileReplacements:replacements}),/native_asset_base_invalid/);
});

test('recovery hashes retain exact input and classify original, converted and divergent configurations', async () => {
  const result = convertOrdinaryDocument(text('v0.23.4-ordinary-envelope.json'), context);
  const recovery = await createRecoveryExport(result, { packageVersion: 'test' });
  assert.equal(await validateRecoveryExport(recovery), recovery);
  assert.equal(classifyRecovery(result.originalDocument, recovery), 'original');
  assert.equal(classifyRecovery(result.document, recovery), 'converted');
  assert.equal(classifyRecovery({ ...result.document, title: 'Native edits' }, recovery), 'divergent');
  for (const key of ['original_text', 'source_text', 'original_document', 'proposed_document', 'supplements', 'manifest', 'root']) {
    const changed = structuredClone(recovery);
    if (typeof changed[key] === 'string') changed[key] += key === 'root' ? '-changed' : '\n';
    else if (Array.isArray(changed[key])) changed[key].push({ changed: true });
    else changed[key].changed = true;
    await assert.rejects(validateRecoveryExport(changed), /native_recovery_changed/);
  }
  const incomplete = structuredClone(recovery); delete incomplete.manifest;
  await assert.rejects(validateRecoveryExport(incomplete), /native_recovery_invalid/);
});

test('recovery integrity works on local HTTP without SubtleCrypto', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    for (const sample of ['', 'abc', 'Planta da divisão 🔆', 'safe'.repeat(1000)]) assert.equal(await sha256(sample), createHash('sha256').update(sample).digest('hex'));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor); else delete globalThis.crypto;
  }
});
