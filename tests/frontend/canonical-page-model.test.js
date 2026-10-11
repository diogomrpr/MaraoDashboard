import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeConfig, serializeConfig, validateConfig, buildJsonSchema, moveItem } from '../../frontend_src/editor-model.js';

const source = JSON.parse(fs.readFileSync(new URL('./canonical-pages.fixture.json', import.meta.url)));
const catalog = { config_version: 2, cards: [
  ['hc_title_card', []], ['hc_room_card', []], ['hc_navigation_card', []], ['hc_scene_collection_card', []],
  ['hc_entity_group_card', []], ['hc_weather_card', ['weather']], ['hc_light_card', ['light']],
  ['hc_energy_period_card', ['sensor']], ['hc_wallbox_current_card', ['number', 'input_number']],
  ['hc_media_app_card', ['media_player']], ['hc_media_card', ['media_player']], ['hc_access_hold_action_card', ['button', 'switch', 'input_boolean']],
].map(([id, domains]) => ({ id, domains })), pages: {} };

for (const [card, message] of [
  [{ template: 'hc_energy_period_card', entity_id: 'sensor.safe', variables: { period: 'year' } }, /period/],
  [{ template: 'hc_wallbox_current_card', entity_id: 'number.safe', variables: { shortcuts: [true] } }, /shortcuts/],
  [{ template: 'hc_wallbox_current_card', entity_id: 'number.safe', variables: { shortcuts: [Infinity] } }, /shortcuts/],
  [{ template: 'hc_wallbox_current_card', entity_id: 'number.safe', variables: { shortcuts: [1, 2, 3, 4] } }, /shortcuts/],
  [{ template: 'hc_media_app_card', entity_id: 'media_player.safe', variables: { app_source: ' ' } }, /source/],
  [{ template: 'hc_room_card', page: 'home', variables: { light_entities: ['switch.safe'] } }, /Room lights/],
  [{ template: 'hc_media_card', entity_id: 'media_player.safe', apple_tv: { remote_entity: 'lock.safe' } }, /remote/],
  [{ template: 'hc_media_card', entity_id: 'media_player.safe', apple_tv: { apps: [{ name: 'Missing source' }] } }, /sources/],
  [{ template: 'hc_access_hold_action_card', entity_id: 'button.safe', tap_action: { action: 'perform-action', perform_action: 'lock.unlock', target: { entity_id: 'lock.safe' } } }, /Security action/],
]) {
  test(`promoted option boundary: ${message}`, () => {
    const config = { config_version: 2, name: 'Safe', landing_page: 'home', pages: [{ name: 'Home', path: 'home', entities: [card] }] };
    const before = structuredClone(config);
    assert.ok(validateConfig(config, 2, [], {}, catalog).some(error => message.test(error)));
    assert.deepEqual(config, before);
  });
}

test('all pages, sections, entity-free cards, unknown values and explicit emptiness round-trip unchanged', () => {
  assert.deepEqual(validateConfig(source, 2, [], {}, catalog), []);
  const model = normalizeConfig(source);
  assert.deepEqual(serializeConfig(model), source);
  assert.equal(model.pages[0].sections[1].entities[0].page, 'office');
  assert.equal(model.pages[0].sections[1].entities[1].entities[0].extension, true);
  assert.ok(!Object.hasOwn(serializeConfig(model).pages[3], 'entities'));
  assert.ok(!Object.hasOwn(model, 'rooms'));
});

test('editing and reordering a grouped page retains mixed order and unrelated section/raw options', () => {
  const model = normalizeConfig(source);
  model.pages[1].entities.push({ template: 'hc_title_card', name: 'Reading corner', id: 'reading' });
  model.pages[1].entities = moveItem(model.pages[1].entities, 2, 0);
  const saved = serializeConfig(model);
  assert.equal(saved.pages[1].entities[0].template, 'hc_title_card');
  assert.deepEqual(saved.pages[1].entities[1], { entity_id: 'sensor.safe', id: 'card-1' });
  assert.deepEqual(saved.pages[0], source.pages[0]);
  assert.deepEqual(saved.pages[2], source.pages[2]);
  assert.deepEqual(saved.extension, source.extension);
});

test('implicit card identities survive section deletion and reordering without changing untouched JSON', () => {
  const config = { config_version: 2, name: 'Stable', landing_page: 'home', pages: [{ name: 'Home', path: 'home', sections: [
    { entities: [{ id: 'heading', template: 'hc_title_card', name: 'Home' }] },
    { entities: ['media_player.same', 'media_player.same'], cards: [{ type: 'markdown', content: 'Keep', tap_action: { action: 'navigate', navigation_path: '#page-home-card-3-popup' } }] },
  ] }] };
  const model = normalizeConfig(config);
  assert.deepEqual(serializeConfig(model), config);
  model.pages[0].sections[1].entities.reverse();
  model.pages[0].sections.splice(0, 1);
  const saved = serializeConfig(model);
  assert.deepEqual(saved.pages[0].sections[0].entities.map(card => card.id), ['card-3', 'card-2']);
  assert.deepEqual(saved.pages[0].sections[0].cards, config.pages[0].sections[1].cards);
  assert.deepEqual(serializeConfig(normalizeConfig(saved)), saved);
});

const invalid = [
  ['mixed legacy storage', config => { config.overview = {}; }],
  ['no pages', config => { config.pages = []; }],
  ['missing landing', config => { config.landing_page = 'missing'; }],
  ['duplicate path', config => { config.pages[1].path = 'home'; }],
  ['unsafe path', config => { config.pages[1].path = '../office'; }],
  ['duplicate page identity', config => { config.pages[1].id = 'home'; }],
  ['ambiguous flat content', config => { config.pages[0].entities = []; }],
  ['nested sections', config => { config.pages[0].sections[0].sections = []; }],
  ['boolean columns', config => { config.pages[0].sections[0].columns = true; }],
  ['out of range columns', config => { config.pages[0].sections[0].columns = 7; }],
  ['raw scalar', config => { config.pages[2].cards = ['markdown']; }],
  ['invalid descriptor', config => { config.pages[2].entities = [true]; }],
  ['duplicate local identity', config => { config.pages[0].sections[1].entities[0].id = 'weather'; }],
  ['missing binding', config => { delete config.pages[0].sections[0].entities[1].entity_id; }],
  ['incompatible binding', config => { config.pages[0].sections[0].entities[1].entity_id = 'light.safe'; }],
  ['unsupported template', config => { config.pages[0].sections[0].entities[1].template = 'hc_unrecognized_card'; }],
  ['invalid options', config => { config.pages[0].sections[0].entities[1].variables = []; }],
  ['missing shortcut destination', config => { config.pages[0].sections[1].entities[0].page = 'removed'; }],
  ['unbound shortcut', config => { delete config.pages[0].sections[1].entities[0].page; }],
  ['missing navbar destination', config => { config.navigation = ['removed']; }],
  ['sixth pin', config => { config.navigation = Array(6).fill('home'); }],
  ['invalid scene member', config => { config.pages[0].sections[1].entities[1].entities = ['lock.safe']; }],
];
for (const [name, mutate] of invalid) test(`canonical preflight rejects ${name} without changing the input`, () => {
  const config = structuredClone(source); mutate(config);
  const before = structuredClone(config);
  assert.ok(validateConfig(config, 2, [], {}, catalog).length);
  assert.deepEqual(config, before);
});

test('empty and absent canonical content remains valid without discovery or starter insertion', () => {
  const config = { config_version: 2, name: 'Quiet', landing_page: 'quiet', navigation: [], pages: [{ name: 'Quiet', path: 'quiet' }] };
  assert.deepEqual(validateConfig(config, 2, [], {}, catalog), []);
  assert.deepEqual(serializeConfig(normalizeConfig(config)), config);
});

test('canonical schema offers ordered pages, sections and entity-free roles with separate landing/navbar', () => {
  const formats = buildJsonSchema(catalog, []);
  const schema = formats.allOf[0].then;
  assert.deepEqual(formats.allOf[0].if, { required: ['config_version'], properties: { config_version: { const: 2 } } });
  assert.equal(formats.properties.config_version.maximum, 2);
  const legacy = formats.allOf[0].else.anyOf[0], native = formats.allOf[0].else.anyOf[1];
  assert.deepEqual(legacy.required, ['name', 'rooms']);
  assert.equal(legacy.properties.pages.type, 'object');
  assert.ok(!legacy.required.includes('config_version'));
  assert.deepEqual(native.required, ['title', 'views']);
  assert.equal(native.properties.views.minItems, 1);
  assert.deepEqual(schema.required, ['name', 'config_version', 'pages', 'landing_page']);
  assert.equal(schema.properties.pages.type, 'array');
  assert.equal(schema.properties.navigation.maxItems, 5);
  assert.equal(schema.properties.pages.items.properties.sections.items.properties.columns.maximum, 6);
  assert.ok(!Object.hasOwn(schema.properties, 'rooms'));
  assert.ok(!Object.hasOwn(schema.properties, 'overview'));
  const shortcut = { id: 'office-link', template: 'hc_navigation_card', name: 'Office',
    tap_action: { action: 'navigate', navigation_path: '/marao-dashboard/office' } };
  const config = { config_version: 2, name: 'Safe', landing_page: 'home', pages: [
    { name: 'Home', path: 'home', entities: [shortcut] }, { name: 'Office', path: 'office', entities: [] },
  ] };
  assert.deepEqual(validateConfig(config, 2, [], {}, catalog), []);
  assert.deepEqual(serializeConfig(normalizeConfig(config)), config);
  const choices = schema.properties.pages.items.properties.entities.anyOf[0].items.anyOf;
  assert.ok(choices.some(choice => choice.properties?.template?.enum?.includes(shortcut.template)
    && !choice.required.includes('page') && !choice.required.includes('entity_id')),
  'JSON must accept the same explicit-destination shortcut as Visual and generation');
});
