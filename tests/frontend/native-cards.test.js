import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../../frontend_src/native-model.js';
import { composeNativeCard, createCardComposition, nativeCardDescriptor, nativeCardType, NATIVE_CARD_TYPES, resolveSource, templateForNativeType, validateNativeCardConfig } from '../../frontend_src/card-composition.js';
import { MaraoNativeCard, nativeCardGridOptions, nativeCardSetup, nativeCardStub, registerNativeCards } from '../../frontend_src/native-cards.js';

const domains = [...new Set(catalog.cards.flatMap(card => card.domains))];
const hass = { language: 'en', connected: true, connection: { connected: true }, states: Object.fromEntries(domains.map(domain => [`${domain}.test`, {
  entity_id: `${domain}.test`, state: 'off', attributes: { friendly_name: 'Fixture', source_list: ['TV'], ...(domain === 'sensor' ? { unit_of_measurement: 'kWh' } : {}) },
}])) };
const compose = (config, instanceId = 'one') => composeNativeCard(config, { instanceId, dashboardRoot: 'test-home' });
const config = (template, extra = {}) => ({ type: nativeCardType(template), template, ...extra });

test('all catalog identities expose independent native types, defaults and shared sizing without replacing runtime types', () => {
  assert.equal(Object.keys(NATIVE_CARD_TYPES).length, 36);
  assert.equal(new Set(Object.values(NATIVE_CARD_TYPES)).size, 36);
  for (const entry of catalog.cards) {
    const stub = nativeCardStub(entry.id, hass);
    if (entry.id === 'md_floor_plan_card') stub.variables.image_id = 'a'.repeat(32);
    assert.equal(stub.type, nativeCardType(entry.id));
    assert.equal(templateForNativeType(stub.type), entry.id);
    assert.doesNotThrow(() => validateNativeCardConfig(stub), entry.id);
    const result = compose(stub);
    assert.ok(result.card.type, entry.id);
    assert.ok(Array.isArray(result.popups), entry.id);
    const sizing = nativeCardGridOptions(stub);
    assert.ok([6, 12].includes(sizing.columns));
    assert.ok(sizing.min_rows >= 1);
  }
  assert.equal(nativeCardType('md_energy_period_card'), 'custom:marao-energy-card');
  assert.equal(nativeCardType('md_floor_plan_card'), 'custom:marao-floorplan-card');
});

test('native registration retains existing generic renderers and hides only catalog compatibility identities', t => {
  const previous = { customElements: globalThis.customElements, window: globalThis.window };
  t.after(() => Object.assign(globalThis, previous));
  const runtime = class Runtime {}, registry = new Map([['marao-card', runtime], ['marao-floor-plan-card', runtime], ['marao-energy-period-card', runtime]]);
  globalThis.customElements = { get: name => registry.get(name), define: (name, value) => registry.set(name, value) };
  globalThis.window = { customCards: [] };
  registerNativeCards(); registerNativeCards();
  assert.equal(registry.size, 39);
  assert.equal(registry.get('marao-card'), runtime);
  assert.equal(window.customCards.length, catalog.cards.filter(card => !card.hidden).length);
  for (const entry of catalog.cards) {
    const element = registry.get(nativeCardType(entry.id).slice(7));
    assert.equal(typeof element.getConfigElement, 'function');
    assert.equal(element.getStubConfig(hass).template, entry.id);
  }
});

test('picker defaults prefer the primary domain and keep access covers out of fan defaults', () => {
  const states = { 'cover.garage': { attributes: { device_class: 'garage' } }, 'cover.damper': { attributes: { device_class: 'damper' } }, 'fan.room': { attributes: {} } };
  assert.equal(nativeCardStub('md_fan_card', { states }, ['cover.garage', 'cover.damper', 'fan.room']).entity_id, 'fan.room');
  delete states['fan.room'];
  assert.equal(nativeCardStub('md_fan_card', { states }, ['cover.garage', 'cover.damper']).entity_id, 'cover.damper');
  assert.equal(nativeCardStub('md_fan_card', { states: { 'cover.garage': states['cover.garage'] } }).entity_id, undefined);
});

test('an unconfigured floor plan offers setup but every other invalid option still fails', () => {
  const draft = nativeCardStub('md_floor_plan_card', hass), before = structuredClone(draft);
  assert.equal(nativeCardSetup(draft), 'Upload a floor-plan image.');
  assert.deepEqual(draft, before);
  assert.throws(() => nativeCardSetup({ ...draft, variables: { lights: [{ id: 'light', entity_id: 'light.test', x: -1, y: 5 }] } }), /coordinates/);
  assert.throws(() => nativeCardSetup({ ...draft, variables: { lights: [], full_page: 'yes' } }), /boolean/);
  assert.throws(() => validateNativeCardConfig({ ...draft, variables: { lights: [], image_id: 'invalid-image' } }), /Upload/);
});

test('native resize limits allow compact widths and preserve smaller explicit imported cells', () => {
  const light = config('md_light_card', { entity_id: 'light.test' });
  assert.deepEqual(nativeCardGridOptions(light), { columns: 6, rows: 3, min_columns: 3, min_rows: 2 });
  assert.deepEqual(nativeCardGridOptions({ ...light, grid_options: { columns: 2, rows: 1 } }), { columns: 6, rows: 3, min_columns: 2, min_rows: 1 });
});

test('duplicated native cards own different automatic sheets despite identical saved identifiers', () => {
  for (const [template, entity_id, variables] of [
    ['md_climate_card', 'climate.test', {}], ['md_media_card', 'media_player.test', {}],
    ['md_camera_card', 'camera.test', { popup_stream_entity: 'camera.high', event_provider: 'frigate' }],
    ['md_access_card', 'lock.test', {}], ['md_security_card', 'alarm_control_panel.test', {}],
    ['md_energy_period_card', 'sensor.test', {}], ['md_graph_card', 'sensor.test', { history_popup: true }],
  ]) {
    const original = config(template, { id: 'same-persisted-id', entity_id, variables, grid_options: { columns: 6 }, future: { values: [], disabled: false } });
    const before = structuredClone(original), first = compose(original, 'first'), second = compose(original, 'second');
    assert.equal(first.popups.length, 1, template);
    assert.equal(second.popups.length, 1, template);
    assert.notEqual(first.popups[0].hash, second.popups[0].hash, template);
    assert.deepEqual(original, before);
    assert.deepEqual(nativeCardDescriptor(original).future, before.future);
  }
  const access = compose(config('md_access_card', { entity_id: 'lock.test' })).popups[0];
  assert.deepEqual(access.cards[0].cards.map(card => [card.template, card.variables.action_service]), [
    ['md_access_slide_action_card', 'lock.unlock'], ['md_access_action_card', 'lock.lock'],
  ]);
});

test('explicit external sheets remain authored while automatic nested group sheets are occurrence-local', () => {
  assert.equal(compose(config('md_media_card', { entity_id: 'media_player.test', variables: { popup_hash: '#authored' } })).popups.length, 0);
  assert.equal(compose(config('md_climate_card', { entity_id: 'climate.test', variables: { mode_selector_hash: '#authored' } })).popups.length, 0);
  const group = config('md_entity_group_card', { id: 'living', name: 'Climate', entity_type: 'climate', entities: [
    { entity_id: 'climate.first', variables: { mode_selector_hash: '#external-mode' } }, { entity_id: 'climate.second', variables: { target_step: .5 } },
  ] });
  const first = compose(group, 'first'), second = compose(group, 'second');
  assert.equal(first.popups.length, 2);
  assert.equal(first.popups[0].cards[0].variables.mode_selector_hash, '#external-mode');
  assert.equal(first.popups[0].cards[1].variables.mode_selector_hash, first.popups[1].hash);
  assert.notEqual(first.popups[1].hash, second.popups[1].hash);
  assert.equal(compose({ ...group, variables: { popup_hash: '#external-group' } }).popups.length, 0);
  assert.equal(compose({ ...group, variables: { popup_hash: null } }).popups.length, 2, 'Historical null hashes keep automatic defaults');
});

test('standalone composition shares compiler details for floor plans, inline media and graph units', () => {
  const floor = config('md_floor_plan_card', { name: 'Room', variables: { image_id: 'a'.repeat(32), full_page: true, lights: [
    { id: 'strip', entity_id: 'light.test', x: 10, y: 20, strip: { points: [{ x: 10, y: 20 }, { x: 30, y: 40 }], width: 8 } },
  ] } });
  const output = compose(floor);
  assert.equal(output.card.lights_popup, output.popups[0].hash);
  assert.deepEqual(output.card.lights, floor.variables.lights);
  assert.equal(output.popups[0].cards[0].entity, 'light.test');
  assert.equal(compose({ ...floor, variables: { ...floor.variables, lights_popup: '#existing-lights' } }).popups.length, 0);
  const media = { template: 'md_media_card', entity_id: 'media_player.test', variables: { media_display: 'inline' }, apple_tv: { remote_entity: 'remote.test', volume_remote_entity: 'media_player.volume', apps: [{ name: 'TV', source: 'TV' }] } };
  const resolved = resolveSource({ name: 'Native card', pages: [{ name: 'Native card', path: 'native-one', entities: [{ ...media, id: 'card' }] }] }).pages[0]._sections[0].ordered_cards[0];
  assert.deepEqual(compose(config(media.template, media)).card, createCardComposition({ root: 'test-home' }).pageCard(resolved));
  assert.equal(compose(config(media.template, media)).popups.length, 0);
  const graph = composeNativeCard(config('md_graph_card', { entity_id: 'sensor.power', variables: { history_popup: true } }), { instanceId: 'power', entities: [{ entity_id: 'sensor.power', unit_of_measurement: 'W' }] });
  assert.equal(graph.popups[0].cards[0].type, 'custom:marao-power-history-card');
});

test('native preview and live native editing forward inert state before hass and close detail owners on removal', async () => {
  const order = [], child = { set preview(value) { order.push(['preview', value]); }, set hass(value) { order.push(['hass', value?.connected]); } };
  const owner = Object.assign(Object.create(MaraoNativeCard.prototype), { _content: {}, _children: [child], _hass: hass, _host: { lovelace: { editMode: true } }, _renderVersion: 0, isConnected: true });
  owner._forward();
  assert.equal(owner._content.inert, true);
  assert.equal(child.nativeOwner, owner);
  assert.deepEqual(order, [['preview', true], ['hass', false]]);
  owner._host.lovelace.editMode = false; order.length = 0; owner._forward();
  assert.deepEqual(order, [['preview', false], ['hass', true]]);
  owner.preview = true; assert.equal(owner._content.inert, true);
  owner.isConnected = false; owner.disconnectedCallback();
  await Promise.resolve();
  assert.equal(owner._host, null);
  assert.equal(owner._compositionKey, null);
  assert.equal(order.at(-1)[0], 'preview');
});

test('invalid access actions and mismatched native identities fail before composition', () => {
  assert.throws(() => validateNativeCardConfig(config('md_access_slide_action_card', { entity_id: 'lock.test', tap_action: { action: 'toggle' } })), /strict slide/);
  assert.throws(() => validateNativeCardConfig({ type: 'custom:marao-light-card', template: 'md_access_card', entity_id: 'lock.test' }), /card type/);
  assert.throws(() => composeNativeCard(config('md_light_card', { entity_id: 'light.test' })), /occurrence identity/);
});
