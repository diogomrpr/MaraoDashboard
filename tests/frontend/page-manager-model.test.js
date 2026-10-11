import test from 'node:test';
import assert from 'node:assert/strict';
import { addPageSection, clone, createPage, deletePage, duplicatePage, normalizeConfig, pageReferences, pinPage, renamePage, roomPageTemplate, serializeConfig } from '../../frontend_src/editor-model.js';

const root = '/marao-dashboard';

test('Rooms creation snapshots unsaved room pages and explicit group members without later synchronization', () => {
  const model = normalizeConfig({ config_version: 2, pages: [
    { name: 'Home', path: 'home', entities: [] },
    { name: 'Office draft', path: 'office', area: 'office', sections: [{ entities: ['light.safe', { template: 'hc_entity_group_card', id: 'group', entity_type: 'light', entities: ['light.safe', 'light.grouped'] }] }] },
    { name: 'Empty', path: 'empty', subview: true, entities: [] },
  ] });
  const snapshot = roomPageTemplate(model);
  assert.deepEqual(snapshot.entities.map(card => card.page), ['office', 'empty']);
  assert.deepEqual(snapshot.entities[0].variables.light_entities, ['light.safe', 'light.grouped']);
  assert.equal(snapshot.entities[0].entity_id, 'light.safe');
  assert.ok(!Object.hasOwn(snapshot.entities[1], 'entity_id'));
  model.pages[1].sections[0].entities.push({ entity_id: 'light.added' });
  assert.deepEqual(snapshot.entities[0].variables.light_entities, ['light.safe', 'light.grouped']);
});
const initial = () => normalizeConfig({ config_version: 2, name: 'Safe', landing_page: 'home', navigation: ['home'], pages: [
  { id: 'home', name: 'Home', path: 'home', output_path: 'views/main/00-overview.yaml', extension: { keep: true }, columns: 2, entities: [
    { id: 'link', template: 'hc_navigation_card', name: 'Office', page: 'office' },
    { id: 'reading', template: 'hc_energy_period_card', entity_id: 'sensor.safe', variables: { period: 'month', popup_hash: '#page-home-reading-popup', future: 42 } },
    { id: 'group', template: 'hc_entity_group_card', name: 'Climate', entity_type: 'climate', entities: [{ entity_id: 'climate.safe', variables: { mode_selector_hash: '#saved-modes' } }], variables: { popup_hash: '#saved-group' } },
  ], cards: [{ type: 'markdown', content: 'Saved note', future: true }] },
  { id: 'office', name: 'Office', path: 'office', sections: [{ columns: 1, entities: [{ id: 'back', template: 'hc_navigation_card', page: 'home' }] }] },
] });

test('adding sections preserves flat source, unknown/raw options and explicit empty new section', () => {
  const model = initial(), before = serializeConfig(model).pages[0];
  addPageSection(model.pages[0]);
  const saved = serializeConfig(model).pages[0];
  assert.deepEqual(saved.sections[0], { entities: before.entities, cards: before.cards, columns: before.columns });
  assert.deepEqual(saved.sections[1], { entities: [] });
  assert.deepEqual(saved.extension, before.extension);
  assert.ok(!Object.hasOwn(saved, 'entities'));
  assert.ok(!Object.keys(saved).some(key => key.startsWith('__')));
});

test('page rename updates landing, navbar and nested owned links while preserving files and external URLs', () => {
  const model = initial();
  model.navigation.push({ page: 'home', url: root + '/home', label: 'My home', future: true });
  model.pages[1].sections[0].cards = [{ type: 'custom:marao-card', tap_action: { navigation_path: '#page-home-reading-popup' } }, { type: 'markdown', url: 'https://external.invalid/home', content: 'Do not rewrite' }];
  renamePage(model, 0, 'renamed', root);
  const saved = serializeConfig(model);
  assert.equal(saved.landing_page, 'renamed');
  assert.equal(saved.navigation[0], 'renamed');
  assert.deepEqual(saved.navigation[1], { page: 'renamed', url: root + '/renamed', label: 'My home', future: true });
  assert.equal(saved.pages[0].output_path, 'views/main/00-overview.yaml');
  assert.equal(saved.pages[1].sections[0].entities[0].page, 'renamed');
  assert.equal(saved.pages[1].sections[0].cards[0].tap_action.navigation_path, '#page-renamed-reading-popup');
  assert.equal(saved.pages[1].sections[0].cards[1].url, 'https://external.invalid/home');
  assert.equal(saved.pages[0].entities[2].variables.popup_hash, '#saved-group');
});

test('duplicating page creates independent local keys and nested hashes without changing source or navigation', () => {
  const model = initial(), before = serializeConfig(model), original = model.pages[0];
  const copy = duplicatePage(model, 0, 'Home copy', root);
  assert.equal(copy.path, 'home-copy');
  assert.ok(!Object.hasOwn(copy, 'output_path'));
  assert.deepEqual(model.navigation, ['home']);
  assert.deepEqual(serializeConfig(model).pages[0], before.pages[0]);
  for (let index = 0; index < copy.entities.length; index++) assert.notEqual(copy.entities[index].id, original.entities[index].id);
  assert.notEqual(copy.entities[2].variables.popup_hash, original.entities[2].variables.popup_hash);
  assert.notEqual(copy.entities[2].entities[0].variables.mode_selector_hash, original.entities[2].entities[0].variables.mode_selector_hash);
  assert.deepEqual(copy.cards, original.cards);
  assert.equal(copy.entities[0].page, 'office');
  assert.equal(copy.entities[1].variables.future, 42);
});

test('duplicating known raw popups repairs only their owned hashes and links', () => {
  const model = initial();
  model.pages[0].cards.push({ type: 'custom:marao-popup-card', hash: '#raw-saved', cards: [] }, { type: 'custom:marao-card', tap_action: { navigation_path: '#raw-saved' } });
  const copy = duplicatePage(model, 0, 'Copy', root);
  assert.notEqual(copy.cards[1].hash, '#raw-saved');
  assert.equal(copy.cards[2].tap_action.navigation_path, copy.cards[1].hash);
  assert.equal(model.pages[0].cards[1].hash, '#raw-saved');
});

test('unpin preserves the page, a sixth pin fails, and template creation at capacity remains unpinned', () => {
  const model = initial();
  for (const path of ['one', 'two', 'three', 'four']) model.pages.push({ name: path, path, entities: [] });
  model.navigation = ['home', 'one', 'two', 'three', 'four'];
  const template = { icon: 'mdi:chart-line', entities: [{ id: 'draft', template: 'hc_graph_card', name: 'House power' }] };
  const created = createPage(model, { template: 'energy', name: 'Energy', path: 'energy' }, { energy: template });
  assert.equal(created.entities[0].entity_id, undefined);
  assert.equal(model.navigation.length, 5);
  assert.throws(() => pinPage(model, 'energy', true), /sixth/);
  pinPage(model, 'home', false);
  assert.ok(model.pages.some(page => page.path === 'home'));
  pinPage(model, 'energy', true);
  assert.equal(model.navigation.at(-1), 'energy');
  created.entities.splice(0, 1);
  assert.deepEqual(serializeConfig(model).pages.find(page => page.path === 'energy').entities, []);
  assert.equal(template.entities.length, 1);
});

test('whole page deletion requires explicit link resolution and a new landing page', () => {
  const model = initial(), before = clone(model);
  assert.equal(pageReferences(model, 'home', root).length, 3);
  assert.throws(() => deletePage(model, 0, null, root), /replacement/);
  assert.deepEqual(model, before);
  deletePage(model, 0, 'office', root);
  assert.equal(model.landing_page, 'office');
  assert.deepEqual(model.navigation, ['office']);
  assert.equal(model.pages[0].sections[0].entities[0].page, 'office');
  assert.throws(() => deletePage(model, 0, null, root), /at least one/);
});

test('deletion refuses unresolved popup links instead of inventing a target hash', () => {
  const model = initial();
  model.pages[1].sections[0].cards = [{ type: 'custom:marao-card', tap_action: { navigation_path: '#page-home-reading-popup' } }];
  const before = clone(model);
  assert.throws(() => deletePage(model, 0, 'office', root), /popup links/);
  assert.deepEqual(model, before);
});

test('page errors leave saved source unchanged and rename does not materialize absent navigation', () => {
  const model = initial(), before = clone(model);
  assert.throws(() => renamePage(model, 0, 'office', root), /unique/);
  assert.throws(() => renamePage(model, 0, '../home', root), /safe/);
  assert.deepEqual(model, before);
  delete model.navigation;
  renamePage(model, 0, 'renamed', root);
  assert.ok(!Object.hasOwn(serializeConfig(model), 'navigation'));
});
