import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseCardYaml, cardYaml, validateCardYaml } from '../../frontend_src/lovelace-model.js';
import { normalizeConfig, serializeConfig, validateConfig, movePageCard, duplicatePage, buildJsonSchema } from '../../frontend_src/editor-model.js';
const fixture = JSON.parse(fs.readFileSync(new URL('./lovelace-cards.fixture.json', import.meta.url)));

function editorLoader() {
  const resourceFailure = new Error('Module download failed');
  const calls = [];
  let nativeFailure = false;
  const resources = [{ type: 'module', url: '/good.js' }, { type: 'module', url: 'https://user:secret@example.invalid/broken.js?token=private#secret' }, { type: 'css', url: '/style.css' }];
  class Element {
    constructor(tag) { this.tag = tag; this.dataset = {}; this.children = []; this.listeners = {}; this.attributes = {}; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    replaceChildren(...children) { this.children = children; }
    querySelector(tag) { return this.children.find(child => child.tag === tag); }
    async _fetchConfig() {}
    dispatchEvent() { this.listeners['show-dialog']({ stopPropagation() {}, detail: { dialogImport: () => nativeFailure ? Promise.reject(new Error('Required native editor failed')) : Promise.resolve() } }); }
  }
  const context = vm.createContext({
    URL, Promise, setTimeout, clearTimeout, location: { origin: 'https://ha.invalid' },
    customElements: { get: () => true }, CustomEvent: class {},
    document: { createElement: tag => new Element(tag) },
    importResource: async url => { calls.push(url); if (url.includes('broken.js')) throw resourceFailure; },
  });
  const loader = fs.readFileSync(new URL('../../frontend_src/lovelace-loader.js', import.meta.url), 'utf8')
    .replace('export function', 'function').replace('import(new URL(resource.url, location.origin).href)', 'importResource(new URL(resource.url, location.origin).href)');
  vm.runInContext(loader, context);
  const editor = fs.readFileSync(new URL('../../frontend_src/lovelace-editor.js', import.meta.url), 'utf8')
    .replace(/^import .*;$/mg, '').replace(/^export \{.*;$/mg, '').replaceAll('export async function', 'async function').replaceAll('export function', 'function');
  vm.runInContext(editor, context);
  const hass = { loadFragmentTranslation: async () => {}, panels: { 'marao-dashboard': {} }, callWS: async () => resources };
  return { context, hass, calls, resources, resourceFailure, Element, failNative: value => { nativeFailure = value; }, load: () => vm.runInContext('loadLovelaceEditor', context)(hass, '/marao-dashboard') };
}

test('successful configured modules load without resource errors', async () => {
  const harness = editorLoader();
  harness.resources.splice(1, 1);
  assert.equal((await harness.load()).resourceErrors.length, 0);
  assert.equal(harness.calls.length, 1);
});

test('failed optional module remains visible beside a usable native picker and is retained on reuse', async () => {
  const harness = editorLoader();
  const loaded = await harness.load();
  assert.equal(loaded.config.views[0].cards[0].type, 'markdown');
  assert.equal(loaded.resourceErrors.length, 1);
  assert.equal(loaded.resourceErrors[0].error, harness.resourceFailure);
  assert.equal(loaded.resourceErrors[0].url, 'https://example.invalid/broken.js');
  assert.equal(await harness.load(), loaded);
  assert.equal(harness.calls.length, 2);
  const panel = { _hass: harness.hass, _dashboardUrl: '/marao-dashboard', _l: text => text };
  const host = new harness.Element('host');
  const dialog = { isConnected: true, open: true, querySelector: () => host };
  await vm.runInContext('mountPicker', harness.context)(panel, dialog, 0, 'page');
  assert.equal(host.children[0].attributes.role, 'alert');
  assert.equal(host.children[0].textContent, 'Could not load dashboard resource: https://example.invalid/broken.js');
  assert.equal(host.children[1].tag, 'hui-card-picker');
  assert.equal(host.children[1].lovelace, loaded.config);
  assert.equal(host.dataset.loading, undefined);
});

test('required native editor failure still rejects and permits an explicit retry', async () => {
  const harness = editorLoader();
  harness.failNative(true);
  await assert.rejects(harness.load(), /Required native editor failed/);
  harness.failNative(false);
  assert.equal((await harness.load()).resourceErrors.length, 1);
  assert.equal(harness.calls.length, 4);
});

test('native YAML parses HA states, aliases and merges without losing custom options', () => {
  assert.deepEqual(parseCardYaml(fixture.source), fixture.expected);
  assert.deepEqual(parseCardYaml(cardYaml(fixture.expected)), fixture.expected);
  assert.deepEqual(parseCardYaml('type: tile\nx: off\ny: "on"'), { type: 'tile', x: false, y: 'on' });
  for (const [source, value] of Object.entries(fixture.scalars)) assert.equal(parseCardYaml(`type: markdown\nx: ${source}`).x, value);
  assert.deepEqual(parseCardYaml(cardYaml({ type: 'markdown', large: 1e21, small: 1e-7 })), { type: 'markdown', large: 1e21, small: 1e-7 });
  for (const source of fixture.invalid) assert.throws(() => parseCardYaml(source), undefined, source);
});

test('native descriptors preserve exact source and opaque options across JSON, moves and duplication', () => {
  const entry = { id: 'external', template: 'ha_card', yaml: fixture.source, future: { keep: true } };
  const source = { config_version: 2, name: 'Test', landing_page: 'home', pages: [{ name: 'Home', path: 'home', sections: [
    { columns: 2, entities: [{ id: 'title', template: 'md_title_card', name: 'Title' }, entry], cards: [{ type: 'markdown', content: 'Raw' }] }, { entities: [] }] }] };
  const model = normalizeConfig(source);
  assert.deepEqual(serializeConfig(model), source);
  assert.equal(movePageCard(model.pages[0], 0, 1, 1, 0, model.pages[0].sections[0].entities[1]), true);
  const saved = serializeConfig(model);
  assert.deepEqual(saved.pages[0].sections[1].entities[0], entry);
  assert.deepEqual(saved.pages[0].sections[0].cards, source.pages[0].sections[0].cards);
  assert.deepEqual(validateConfig(saved, 2), []);
  assert.doesNotThrow(() => validateCardYaml(saved));
  saved.pages[0].sections[1].entities[0].yaml = 'type: [';
  assert.throws(() => validateCardYaml(saved));
  assert.equal(source.pages[0].sections[0].entities[1].yaml, fixture.source);
  const duplicate = duplicatePage(model, 0);
  assert.equal(duplicate.sections[1].entities[0].yaml, fixture.source);
  assert.notEqual(duplicate.sections[1].entities[0].id, entry.id);
  assert.deepEqual(duplicate.sections[1].entities[0].future, entry.future);
  const schema = JSON.stringify(buildJsonSchema({ config_version: 2, cards: [], pages: {} }, []));
  assert.ok(schema.includes('ha_card') && schema.includes('Complete inline Home Assistant card YAML'));
});
