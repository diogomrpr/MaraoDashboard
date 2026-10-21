import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildJsonSchema, normalizeConfig, serializeConfig } from '../../frontend_src/editor-model.js';
import { publishDiagnostics } from '../../frontend_src/json-language.js';
import { getLanguageService } from '../../node_modules/monaco-editor/esm/external/vscode-json-languageservice/lib/esm/jsonLanguageService.js';
import { TextDocument } from '../../node_modules/monaco-editor/esm/external/vscode-json-languageservice/lib/esm/jsonLanguageTypes.js';
const catalog = JSON.parse(fs.readFileSync(new URL('../../custom_components/marao_dashboard/frontend/MaraoNativeCatalog.js', import.meta.url), 'utf8').replace(/^export const catalog = /, '').trim().replace(/;$/, ''));
const entities = [{ entity_id: 'light.safe' }, { entity_id: 'remote.safe' }, { entity_id: 'sensor.safe', device_class: 'battery' }];
const schema = (draft = {}) => buildJsonSchema(catalog, entities, draft);
const rules = () => schema().$defs.cardOptions.anyOf;
const properties = id => rules().find(rule => rule.properties?.template.const === id).properties;
const resolve = value => value.$ref ? schema().$defs[value.$ref.split('/').at(-1)] : value;
test('diagnostics retain true positions and reject stale versions/models', () => {
  let version = 2, uri = 'inmemory://one.json', disposed = false, markers;
  const api = { MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 }, editor: { setModelMarkers(_model, owner, values) { assert.equal(owner, 'marao-json'); markers = values; } } };
  const model = { uri: { toString: () => uri }, isDisposed: () => disposed, getVersionId: () => version };
  const identity = { uri, version }, issues = [{ severity: 1, message: 'Invalid value', range: { start: { line: 2, character: 4 }, end: { line: 2, character: 8 } } }];
  assert.equal(publishDiagnostics(api, model, identity, issues), true);
  assert.equal(markers[0].startLineNumber, 3); assert.equal(markers[0].startColumn, 5);
  markers = null; version++; assert.equal(publishDiagnostics(api, model, identity, issues), false);
  version--; uri = 'inmemory://other.json'; assert.equal(publishDiagnostics(api, model, identity, issues), false);
  uri = identity.uri; disposed = true; assert.equal(publishDiagnostics(api, model, identity, issues), false);
  assert.equal(markers, null);
});
test('catalog options stay role-specific and nested command data remains opaque', () => {
  assert.ok(properties('hc_light_card').variables.properties.enable_slider);
  assert.ok(!properties('hc_light_card').variables.properties.event_provider);
  assert.ok(properties('hc_camera_card').variables.properties.event_provider.anyOf[0].enum.includes('unifi_protect'));
  assert.deepEqual(resolve(properties('hc_media_card').apple_tv.anyOf[1].properties.remote_entity).anyOf[0].enum, ['remote.safe']);
  assert.ok(properties('hc_media_card').apple_tv.anyOf[1].properties.apps.items.properties.source);
  assert.ok(properties('hc_vacuum_card').variables.properties.action_1.properties.data.description);
  assert.equal(properties('hc_vacuum_card').variables.properties.action_1.properties.data.type, undefined);
  assert.ok(properties('hc_dishwasher_card').variables.properties.progress_entity);
  assert.ok(properties('hc_wallbox_current_card').variables.properties.shortcuts);
  assert.ok(properties('hc_energy_period_card').variables.properties.display_precision);
  assert.deepEqual(properties('hc_energy_period_card').variables.properties.sub_entities.items.required, ['entity_id']);
  assert.ok(properties('hc_energy_period_card').variables.properties.sub_entities.items.properties.cost_entity);
  assert.equal(properties('hc_energy_period_card').variables.properties.cost_per_kwh.minimum, 0);
  assert.deepEqual(resolve(properties('hc_light_card').entity_id).anyOf[0].enum, ['light.safe']);
  assert.equal(resolve(properties('hc_light_card').entity_id).anyOf[1].enum, undefined, 'Manual bindings remain valid');
});
test('shared schema definitions handle a large safe dashboard and entity registry in the installed language service', async () => {
  const draft = JSON.parse(fs.readFileSync(new URL('../../ha-test/json-editor-example.json', import.meta.url), 'utf8'));
  draft.pages[0].sections[0].cards = Array.from({ length: 1200 }, (_, index) => index % 2
    ? { type: 'markdown', content: 'Safe raw card', future: { keep: [] } }
    : { type: 'custom:marao-card', template: 'hc_light_card', entity: 'light.safe_1', variables: { enable_slider: false }, future: [] });
  const registry = Array.from({ length: 3000 }, (_, index) => ({ entity_id: `light.safe_${index}` }));
  const definition = buildJsonSchema(catalog, registry, draft);
  assert.ok(JSON.stringify(definition).length < 1000000, 'Entity choices must not be copied per schema use');
  const service = getLanguageService({});
  service.configure({ schemas: [{ uri: definition.$id, fileMatch: ['*'], schema: definition }] });
  const document = TextDocument.create('file:///safe-large.json', 'json', 1, JSON.stringify(draft)), parsed = service.parseJSONDocument(document);
  assert.deepEqual(await service.findDocumentColors(document, parsed), []);
  assert.ok((await service.getMatchingSchemas(document, parsed)).length < 20000, 'Opaque raw cards must not match every template branch');
  assert.deepEqual(await service.doValidation(document, parsed), []);
});
test('native Portuguese message indices match the installed Monaco widgets', () => {
  const find = fs.readFileSync(new URL('../../node_modules/monaco-editor/esm/vs/editor/contrib/find/browser/findWidget.js', import.meta.url), 'utf8');
  const suggest = fs.readFileSync(new URL('../../node_modules/monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestWidget.js', import.meta.url), 'utf8');
  assert.ok(find.includes('localize(1003, "Find / Replace")'));
  assert.ok(find.includes('localize(1013, "Replace All")'));
  assert.ok(suggest.includes('localize(1534, "Loading...")'));
  assert.ok(suggest.includes('localize(1535, "No suggestions.")'));
});
test('page assistance refreshes with a draft without changing its bytes or inserting defaults', () => {
  const file = new URL('../../ha-test/json-editor-example.json', import.meta.url), bytes = fs.readFileSync(file, 'utf8');
  const draft = JSON.parse(bytes), original = structuredClone(draft);
  assert.deepEqual(schema(draft).allOf[0].then.properties.landing_page.anyOf[0].enum, ['studio']);
  draft.pages[0].path = 'new-studio';
  assert.deepEqual(schema(draft).allOf[0].then.properties.landing_page.anyOf[0].enum, ['new-studio']);
  assert.deepEqual(serializeConfig(normalizeConfig(original)), original);
  assert.equal(fs.readFileSync(file, 'utf8'), bytes);
  assert.ok(!JSON.stringify(schema()).includes('"default":true'));
});
test('schema construction preserves independently specified released conversion fixtures', () => {
  const root = new URL('../../ha-test/upgrade/fixtures/', import.meta.url);
  for (const name of ['v0.5.1-dashboard-format-2-expected.json', 'entity-groups-expected.json']) {
    const bytes = fs.readFileSync(new URL(name, root), 'utf8'), value = JSON.parse(bytes);
    const expected = structuredClone(value); schema(value); assert.deepEqual(value, expected);
    assert.equal(fs.readFileSync(new URL(name, root), 'utf8'), bytes);
  }
});
test('stock Monaco owns presentation while local assistance remains deferred and guarded', () => {
  const adapter = fs.readFileSync(new URL('../../frontend_src/json-editor.js', import.meta.url), 'utf8');
  assert.ok(adapter.includes('monaco.editor.create(host, {'));
  assert.ok(adapter.includes("monaco.editor.setTheme(dark ? 'vs-dark' : 'vs')"));
  assert.ok(adapter.includes('version !== model.getVersionId()'));
  assert.ok(!/fontFamily:|fontSize:|lineHeight:|suggestLineHeight:|defineTheme|addGlyphMarginWidget|changeViewZones|MutationObserver|requestFullscreen/.test(adapter));
  const panel = fs.readFileSync(new URL('../../frontend_src/MaraoDashboardPanel.js', import.meta.url), 'utf8');
  assert.ok(panel.includes('saveViewState') && panel.includes('restoreViewState'));
  assert.ok(!panel.includes('id="json-tools"') && !panel.includes('updateOptions({ fontFamily'));
  assert.ok(!fs.existsSync(new URL('../../frontend_src/json-tools.js', import.meta.url)));
  assert.ok(!fs.existsSync(new URL('../../frontend_src/json-editor.css', import.meta.url)));
});


test('JSON-only preparation is a separately built deferred resource', () => {
  const panel = fs.readFileSync(new URL('../../frontend_src/MaraoDashboardPanel.js', import.meta.url), 'utf8');
  const preparation = fs.readFileSync(new URL('../../frontend_src/json-preparation.js', import.meta.url), 'utf8');
  const builder = fs.readFileSync(new URL('../../frontend_src/build-editor.cjs', import.meta.url), 'utf8');
  assert.ok(panel.includes("this._jsonStage('preparation-module'"));
  assert.ok(preparation.includes("this._jsonStage('schema-model'"));
  assert.ok(preparation.includes('this._jsonModule.createEditor'));
  assert.ok(!panel.includes('this._jsonModule.createEditor'));
  assert.ok(builder.includes('MaraoDashboardJsonPreparation:'));
  assert.ok(builder.includes('MaraoDashboardEditorLabels:'));
  assert.ok(!panel.includes('import { PT_LABELS'));
  assert.ok(panel.includes('this._ensureLabels(force)'));
});
