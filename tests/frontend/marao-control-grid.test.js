import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { gridGeometryIssues } = require('../control-grid-checks');

class Node {
  constructor() { this.children = []; this.childNodes = this.children; this.attributes = new Map(); this.style = { setProperty() {} }; }
  attachShadow() { this.shadowRoot = new Node(); }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  querySelector(selector) { return this.children.find(node => selector === '[role=status]' && node.attributes.get('role') === 'status'); }
}
globalThis.HTMLElement = Node;
globalThis.document = { createElement: () => new Node() };
const source = await fs.readFile(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url), 'utf8');
const { MaraoControlGrid, standardControl, controlGridStyles } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const card = (template = 'hc_light_card', extra = {}) => ({ type: 'custom:marao-card', template, entity: 'light.safe', ...extra });

test('standard control membership uses configured effective roles, independent of state and hidden controls', () => {
  for (const template of ['hc_light_card', 'hc_cover_card', 'hc_access_card', 'hc_access_slide_action_card']) {
    for (const extra of [{}, { entity: undefined }, { show_name: false, show_icon: false, variables: { enable_slider: false } }]) assert.equal(standardControl(card(template, extra)), true);
  }
  assert.equal(standardControl(card('hc_access_action_card', { variables: { action_service: 'lock.lock' } })), true);
  assert.equal(standardControl(card('hc_access_hold_action_card', { entity: 'cover.missing' })), true);
  assert.equal(standardControl(card('hc_access_hold_action_card', { entity: 'switch.safe', variables: { action_service: 'cover.open_cover' } })), true);
  assert.equal(standardControl({ type: 'custom:marao-native-light-card' }), true);
  for (const template of ['hc_fan_card', 'hc_climate_card', 'hc_security_card', 'hc_access_hold_action_card', 'hc_graph_card']) assert.equal(standardControl(card(template)), false);
  assert.match(source, /ha-card\.control-surface \{ display:grid; min-width:0; min-height:var\(--marao-control-min-height,174px\)/);
  assert.match(source, /box-sizing:border-box/);
  assert.match(controlGridStyles(), /auto-fill/);
  assert.match(controlGridStyles(), /grid-auto-rows:minmax\(var\(--marao-control-min-height,174px\),1fr\)/);
});

test('grid validates the whole configuration before replacing working children and forwards without remounting', async () => {
  let creates = 0;
  globalThis.loadCardHelpers = async () => ({ createCardElement() { creates++; return new Node(); } });
  const grid = new MaraoControlGrid(); grid.setConfig({ columns: 2, cards: [card(), card('hc_cover_card')] }); await grid._ready;
  const children = [...grid._children], range = {}; children[0].range = range;
  for (const config of [{ columns: 0, cards: [] }, { columns: 7, cards: [] }, { cards: [card(), { type: 'markdown' }] }, { cards: [card('hc_fan_card')] }, { cards: [card('hc_light_card', { variables: [] })] }]) {
    assert.throws(() => grid.setConfig(config)); assert.deepEqual(grid._children, children);
  }
  const hass = { states: {} }; grid.hass = hass; grid.preview = true; grid.hass = { ...hass };
  assert.equal(creates, 2); assert.equal(grid._children[0].range, range); assert.equal(children[0].preview, true);
  assert.ok(grid.getCardSize() > 0); assert.deepEqual(grid.getGridOptions(), { columns: 12, rows: 'auto' });
  grid.setConfig({ columns: 1, cards: [] }); await grid._ready; assert.equal(grid.hidden, true); assert.equal(grid._children.length, 0); assert.equal(grid.getCardSize(), 0);
});

test('stale factory completion, interruption and failure cannot overwrite current children', async () => {
  let finish;
  globalThis.loadCardHelpers = () => new Promise(resolve => { finish = resolve; });
  const grid = new MaraoControlGrid(); grid.setConfig({ cards: [card()] }); const previous = grid._ready;
  grid.setConfig({ columns: 1, cards: [] }); await grid._ready;
  finish({ createCardElement: () => new Node() }); await previous; assert.equal(grid.hidden, true);
  globalThis.loadCardHelpers = async () => ({ createCardElement: () => new Node() });
  grid.setConfig({ cards: [card()] }); await grid._ready; const child = grid._children[0];
  globalThis.loadCardHelpers = async () => { throw new Error('Readable factory failure'); };
  grid.setConfig({ cards: [card()] }); await grid._ready;
  assert.equal(grid._children[0], child); assert.equal(grid.shadowRoot.querySelector('[role=status]').textContent, 'Readable factory failure');
  globalThis.loadCardHelpers = () => new Promise(resolve => { finish = resolve; });
  grid.setConfig({ cards: [card()] }); const pending = grid._ready; grid.disconnectedCallback(); finish({ createCardElement: () => new Node() }); await pending;
  assert.equal(grid._children[0], child);
});

test('children created before a delayed sibling receive the latest HA context on commit', async () => {
  let finish, started;
  const waiting = new Promise(resolve => { started = resolve; });
  let count = 0;
  globalThis.loadCardHelpers = async () => ({ createCardElement() {
    if (++count === 1) return new Node();
    started(); return new Promise(resolve => { finish = resolve; });
  } });
  const grid = new MaraoControlGrid(), initial = { states: {} }, latest = { states: { ready: true } };
  grid.hass = initial; grid.setConfig({ cards: [card(), card('hc_cover_card')] });
  await waiting; grid.hass = latest; finish(new Node()); await grid._ready;
  assert.equal(count, 2);
  for (const child of grid._children) assert.equal(child.hass, latest);
});

test('independent geometry expectations reject row-only equality, missing markers and shortened surfaces', () => {
  const expected = ['one', 'two', 'three', 'four', 'five'];
  const cells = expected.map((_, index) => ({ width: 200, height: 200, top: Math.floor(index / 2) * 208, left: index % 2 * 208, marker: true,
    surface: { height: 200, left: index % 2 * 208, right: index % 2 * 208 + 200 } }));
  const good = { cells, gap: 8, width: 408, columns: 2, order: expected };
  assert.deepEqual(gridGeometryIssues(good, expected), []);
  for (const patch of [{ marker: false }, { height: 174, surface: { ...cells[0].surface, height: 174 } }, { surface: { ...cells[0].surface, height: 100 } }, { width: 408 }]) {
    const changed = structuredClone(good); Object.assign(changed.cells[0], patch);
    assert.ok(gridGeometryIssues(changed, expected).length);
  }
});
