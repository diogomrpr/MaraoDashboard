import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const YAML = require('yaml');
const { concreteCases, expandGallery, expandHelpers, validateCoverage, popupCases, manifest } = require('../../ha-test/cases.js');
const helpers = expandHelpers(YAML.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_card_test_helpers.yaml', import.meta.url), 'utf8')));
const view = expandGallery(YAML.parse(fs.readFileSync(new URL('../../ha-test/dashboard/views/00-card-test.yaml', import.meta.url), 'utf8')));

function roomPages(source) { return source.pages.filter(page => page.subview); }
function roomContent(source, index) {
  const page = typeof index === 'number' ? roomPages(source)[index] : source.pages.find(page => page.path === index);
  return { ...page, ...page.sections.at(-1) };
}
function homeGroups(source) {
  return source.pages.find(page => page.path === 'overview').sections.flatMap(section => section.entities || []).filter(card => card.template === 'hc_entity_group_card');
}

test('every published native family has a canonical safe example and a realistic page', () => {
  const native = require('../../ha-test/native-cases.js').nativeCases(view, manifest, require('../../ha-test/cases.js').walkCards);
  const catalog = JSON.parse(fs.readFileSync(new URL('../../custom_components/marao_dashboard/frontend/MaraoNativeCatalog.js', import.meta.url), 'utf8').replace(/^export const catalog = /, '').trim().replace(/;$/, ''));
  for (const spec of catalog.cards.filter(card => !card.runtime_type)) assert.ok(native.some(card => card.type === spec.type), spec.id);
  const page = require('../../ha-test/marao_dashboard_test_dashboard.json').pages.find(page => page.path === 'native-example');
  assert.equal(page.sections.flatMap(section => section.cards || []).filter(card => card.type?.startsWith('custom:marao-native-')).length, 4);
  assert.ok(native.some(card => card.name === 'Native media duplicate'));
  assert.ok(native.some(card => card.type === 'custom:marao-native-entity-group-card' && card.entities.length === 0));
});

test('native surface stability uses the existing safe climate gallery and rejects missing coverage', () => {
  const example = manifest.nativeSurfaceCase;
  assert.ok(manifest.climateFeedbackCases.some(card => card.name === example.name && card.entity === example.entity));
  assert.ok(view.cards.some(card => card.name === example.name && card.entity === example.entity));
  const incomplete = { ...view, cards: view.cards.filter(card => card.name !== example.name) };
  assert.ok(validateCoverage(incomplete).includes('Missing native-surface retention case'));
});

test('editable page roles are visible descriptors with safe real bindings and independent identities', () => {
  const ids = fixtureIds(helpers);
  assert.equal(new Set(manifest.editablePageCases.map(card => card.id)).size, manifest.editablePageCases.length);
  assert.ok(manifest.editablePageCases.every(card => view.entities.some(entry => entry.id === card.id)));
  assert.ok(manifest.editablePageCases.some(card => card.template === 'hc_scene_collection_card' && card.entities.length === 0));
  assert.deepEqual(manifest.editablePageCases.filter(card => card.template === 'hc_energy_period_card').map(card => card.variables.period), ['day', 'month']);
  for (const card of manifest.editablePageCases) {
    if (card.entity_id) assert.ok(ids.has(card.entity_id));
    for (const entity of card.entities || []) assert.ok(ids.has(entity));
  }
  const scene = helpers.scene.find(scene => scene.name === 'Marao Dashboard Test Native Scene');
  assert.deepEqual(scene.entities, { 'input_boolean.marao_dashboard_test_one': 'on' });
});

test('a saved mixed page reuses safe entities with independent popups and an unpinned shortcut', () => {
  const source = require('../../ha-test/marao_dashboard_test_dashboard.json');
  const studio = source.pages.find(page => page.id === 'studio');
  assert.deepEqual(studio.sections.map(section => section.columns), [1, 2, 1]);
  const cards = studio.sections.flatMap(section => section.entities || []);
  const television = cards.find(card => card.template === 'hc_media_card');
  const energy = cards.find(card => card.template === 'hc_energy_period_card');
  assert.equal(television.entity_id, source.pages.find(page => page.id === 'media').sections[0].entities[0].entity_id);
  assert.equal(energy.entity_id, source.pages.find(page => page.id === 'energy').sections[2].entities[0].entity_id);
  assert.equal(energy.variables.popup_hash, undefined);
  assert.deepEqual(television.apple_tv.apps.map(app => app.source), ['YouTube']);
  assert.ok(studio.sections[2].cards.some(card => card.type === 'markdown'));
  assert.ok(!source.navigation.includes(studio.path));
  assert.ok(source.pages.find(page => page.id === 'overview').sections.flatMap(section => section.entities).some(card => card.tap_action?.navigation_path === '/marao-dashboard/studio'));
});

test('the realistic Active-only lighting group has a repeatable safe baseline', () => {
  const { baseline } = require('../../ha-test/cases.js');
  const source = JSON.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_test_dashboard.json', import.meta.url), 'utf8'));
  const group = homeGroups(source).find(group => group.id === 'overview-lights');
  assert.equal(group.popup_filter, 'active');
  for (const member of group.entities) {
    const entity = typeof member === 'string' ? member : member.entity_id;
    assert.match(entity, /^light\.marao_dashboard_test_/);
    const reset = baseline.find(([domain, , data]) => domain === 'light' && data.entity_id === entity);
    assert.ok(reset, 'Missing explicit baseline for a realistic group member');
    assert.equal(reset[1], entity === 'light.marao_dashboard_test_light' ? 'turn_on' : 'turn_off');
    if (reset[1] === 'turn_on') assert.equal(reset[2].brightness_pct, 50);
  }
});

test('on/off capability fixtures have independent light and fan helpers', () => {
  for (const domain of ['light', 'fan']) {
    const key = `marao_dashboard_test_onoff_${domain}`;
    assert.ok(helpers.input_boolean[key]);
    const fixture = helpers.template.flatMap(block => block[domain] || []).find(entity => entity.unique_id === key);
    assert.match(fixture.state, new RegExp('input_boolean\\.' + key));
    for (const action of ['turn_on', 'turn_off']) assert.equal(fixture[action][0].target.entity_id, 'input_boolean.' + key);
  }
});

test('narrow access examples use safe targets and strict slides for both domains', () => {
  const grid = view.cards.find(card => card.type === 'grid' && card.cards?.some(child => child.name === 'Narrow unlock slide'));
  assert.equal(grid.columns, 2);
  for (const card of grid.cards) {
    assert.equal(card.template, 'hc_access_slide_action_card');
    assert.match(card.entity, /^(lock|cover)\.marao_dashboard_test_/);
    assert.equal(card.variables.action_service, card.entity.startsWith('lock.') ? 'lock.unlock' : 'cover.open_cover');
    assert.equal(card.tap_action, undefined);
  }
});

test('independent room examples keep explicit lists and safe suggestion-area fixtures', () => {
  const source = JSON.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_test_dashboard.json', import.meta.url), 'utf8'));
  assert.equal(source.config_version, 2);
  const fixtures = manifest.editorRoomCases;
  for (const fixture of fixtures.areas) {
    assert.match(fixture.area_id, /^marao_fixture_/);
    assert.match(fixture.name, /^Marao Fixture /);
    const room = roomContent(source, fixture.room);
    assert.equal(room.area, fixture.area_id);
    assert.ok(Object.hasOwn(room, 'entities'));
    for (const id of fixture.entities) assert.match(id, /^[a-z_]+\.marao_dashboard_test_[a-z0-9_]+$/);
  }
  const living = roomContent(source, 'living-room');
  assert.ok(!JSON.stringify(living.entities).includes(fixtures.newEntity));
  assert.ok(concreteCases().some(card => card.entity === fixtures.newEntity));
  const empty = roomContent(source, 'empty-room');
  assert.deepEqual(empty.entities, {});
  assert.ok(JSON.stringify(roomContent(source, 'utility-room').entities).includes(fixtures.offRoomEntity));
});

function fixtureIds(config) {
  const ids = new Set();
  for (const domain of ['input_boolean', 'input_number', 'input_select', 'script']) for (const key of Object.keys(config[domain] || {})) ids.add(`${domain}.${key}`);
  for (const domain of ['camera', 'climate', 'cover', 'media_player', 'remote', 'scene', 'vacuum']) for (const item of config[domain] || []) {
    const name = item.name || (item.platform === 'marao_test_vacuum' ? 'Marao Dashboard Test Vacuum Commands' : '');
    assert.ok(name, 'Synthetic provider must have an explicit or independently known name');
    ids.add(`${domain}.${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`);
  }
  for (const block of config.template) for (const [domain, entries] of Object.entries(block)) {
    if (!Array.isArray(entries) || domain === 'trigger') continue;
    for (const entry of entries) ids.add(entry.default_entity_id || `${domain}.${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`);
  }
  return ids;
}

test('typed group gallery covers both filters, safe capabilities and realistic explicit membership', () => {
  const groups = manifest.entityGroupCases, ids = fixtureIds(helpers);
  assert.equal(new Set(groups.map(group => group.id)).size, groups.length);
  for (const type of ['light', 'cover', 'climate', 'battery']) for (const filter of ['all', 'active']) {
    assert.ok(groups.some(group => group.entity_type === type && group.popup_filter === filter));
  }
  const missing = new Set(concreteCases().filter(card => card.missing).map(card => card.entity));
  for (const group of groups) for (const member of group.entities) {
    const id = typeof member === 'string' ? member : member.entity_id;
    assert.match(id, /^[a-z_]+\.marao_dashboard_test_[a-z0-9_]+$/);
    assert.ok(ids.has(id) || missing.has(id), id + ': safe fixture or deliberate missing reference');
  }
  assert.ok(groups.some(group => group.entities.length === 0));
  const source = JSON.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_test_dashboard.json', import.meta.url), 'utf8'));
  assert.equal(homeGroups(source).length, 4);
  assert.ok(roomContent(source, 'living-room').entities.entity_group.length);
  const legacy = groups.find(group => group.id === 'overview-maintenance');
  assert.deepEqual(legacy.entities, ['sensor.marao_dashboard_test_legacy_battery']);
  assert.ok(homeGroups(source).find(group => group.id === legacy.id).entities.includes(legacy.entities[0]));
  const sensor = helpers.template.flatMap(block => block.sensor || []).find(entity => entity.unique_id === 'marao_dashboard_test_legacy_battery');
  assert.equal(sensor.device_class, undefined);
  assert.equal(sensor.unit_of_measurement, '%');
});

test('every stable state has a separate named gallery card and its own safe fixture', () => {
  assert.deepEqual(validateCoverage(view), []);
  const cases = concreteCases();
  assert.equal(new Set(cases.map((entry) => entry.entity)).size, cases.length);
  const ids = fixtureIds(helpers);
  for (const entry of cases) {
    assert.equal(ids.has(entry.entity), !entry.missing, `${entry.id}: fixture existence`);
    assert.equal(entry.disabled, ['unknown', 'unavailable', 'missing'].includes(entry.state), entry.id);
  }
  for (const family of manifest.families) for (const state of ['unknown', 'unavailable', 'missing']) assert.ok(family.states.includes(state), `${family.id}/${state}`);
  for (const [id, states] of Object.entries({
    lock: ['locked', 'unlocked', 'locking', 'unlocking', 'jammed'],
    cover: ['closed', 'open', 'opening', 'closing'],
    alarm: ['pending', 'triggered', 'arming', 'disarming'],
    climate: ['heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only', 'off'],
  })) for (const state of states) assert.ok(manifest.families.find((family) => family.id === id).states.includes(state), `${id}/${state}`);
});

test('climate feedback examples isolate each delayed or failed behavior and share the delayed sheet', () => {
  const ids = fixtureIds(helpers);
  assert.equal(new Set(manifest.climateFeedbackCases.map(example => example.entity)).size, 9);
  for (const example of manifest.climateFeedbackCases) {
    assert.ok(ids.has(example.entity), example.id);
    assert.ok(view.cards.some(card => card.name === example.name && card.entity === example.entity));
    const fixture = helpers.climate.find(item => item.name.replaceAll(' ', '_') === example.entity.split('.')[1]);
    for (const key of ['ack_delay', 'confirmation_delay', 'behavior', 'initial_state', 'dual_target']) assert.equal(fixture[key], example[key], `${example.id}: ${key}`);
  }
  const delayed = manifest.climateFeedbackCases.find(example => example.id === 'delayed_confirmation');
  const duplicate = view.cards.find(card => card.name === 'Delayed climate duplicate');
  const sheet = view.cards.find(card => card.hash === duplicate.variables.mode_selector_hash);
  assert.equal(duplicate.entity, delayed.entity);
  assert.equal(sheet.cards[0].entity, delayed.entity);
  const source = JSON.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_test_dashboard.json', import.meta.url), 'utf8'));
  assert.ok(roomContent(source, 0).entities.climate.some(entity => entity.entity_id === delayed.entity));
});

test('long titles cover shared controls and separate headers using existing safe fixtures', () => {
  const ids = fixtureIds(helpers);
  assert.deepEqual(new Set(manifest.titleLayoutCases.map(card => card.type)), new Set([
    'custom:marao-card', 'custom:marao-state-timeline-card', 'custom:marao-energy-period-card', 'custom:marao-camera-events-card',
  ]));
  for (const card of manifest.titleLayoutCases) {
    assert.ok(view.cards.some(example => JSON.stringify(example) === JSON.stringify(card)));
    assert.ok((card.name || card.title).length > 30);
    if (card.entity) assert.ok(ids.has(card.entity), card.entity);
  }
  const source = JSON.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_test_dashboard.json', import.meta.url), 'utf8'));
  assert.equal(roomContent(source, 0).entities.light[0].name, 'Living room ceiling lighting');
  assert.equal(roomContent(source, 0).cards[1].name, 'Living room temperature and humidity readings');
});

test('generated template service targets resolve to independent helper entities', () => {
  const ids = fixtureIds(helpers);
  for (const block of helpers.template) for (const entries of Object.values(block)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      for (const ref of JSON.stringify(entry).matchAll(/input_(?:boolean|number|select)\.marao_dashboard_test_[a-z0-9_]+/g)) {
        assert.ok(ids.has(ref[0]), `Unresolved helper ${ref[0]}`);
        if (entry.unique_id?.startsWith('marao_dashboard_test_case_')) assert.ok(ref[0].includes(`${entry.unique_id}_control_`), `Shared helper in ${entry.unique_id}: ${ref[0]}`);
      }
    }
  }
  assert.ok(ids.has('sensor.marao_dashboard_test_person'));
  assert.ok(!ids.has('input_select.marao_dashboard_test_media'));
});

test('binary presentation cases preserve labels, readings and isolated domain contracts', () => {
  const ids = fixtureIds(helpers);
  for (const example of manifest.binaryPresentationCases) {
    assert.ok(view.cards.some(card => JSON.stringify(card) === JSON.stringify(example)));
    assert.ok(ids.has(example.entity), example.entity);
  }
  for (const variant of ['static icon', 'hidden icon', 'state prefix']) {
    for (const state of ['on', 'off']) assert.ok(manifest.binaryPresentationCases.some(card => card.name === `Binary ${variant} · ${state}`));
  }
  const motion = helpers.template.flatMap(block => block.binary_sensor || []).find(entity => entity.default_entity_id === 'binary_sensor.marao_dashboard_test_case_motion_on');
  assert.equal(motion.device_class, 'motion');
  for (const state of ['idle', 'running', 'error']) {
    const fixture = helpers.input_select[`marao_dashboard_test_case_washer_contract_${state}`];
    assert.equal(fixture.initial, state);
    assert.ok(fixture.options.includes(state));
  }
  const graph = manifest.binaryPresentationCases.find(card => card.template === 'hc_toggle_graph_card');
  assert.ok(graph.entity.startsWith('sensor.'));
  assert.ok(graph.variables.toggle_entity.startsWith('switch.'));
  const source = JSON.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_test_dashboard.json', import.meta.url), 'utf8'));
  assert.equal(roomContent(source, 0).entities.light[0].variables.custom_label, 'Reading corner');
});

test('whole-card problem examples resolve safe targets and retain realistic recovery controls', () => {
  const ids = fixtureIds(helpers);
  for (const example of manifest.problemPresentationCases) {
    assert.ok(view.cards.some(card => JSON.stringify(card) === JSON.stringify(example)));
    assert.ok(ids.has(example.entity), example.entity);
    for (const entity of [example.tap_action?.target?.entity_id, example.variables?.salt_entity, example.variables?.progress_entity]) if (entity) assert.ok(ids.has(entity), entity);
  }
  for (const entity of ['input_boolean.marao_dashboard_test_action_failure', 'input_boolean.marao_dashboard_test_media_failure', 'input_boolean.marao_dashboard_test_appliance_warning']) assert.ok(ids.has(entity));
  assert.ok(helpers.camera.some(entity => entity.picture_error === true));
  assert.ok(helpers.media_player.some(entity => entity.picture_error === true && entity.initial_state === 'playing'));
  assert.ok(manifest.eventCases.some(example => example.id === 'media_error' && example.expectedDetailError));
  const source = JSON.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_test_dashboard.json', import.meta.url), 'utf8'));
  assert.ok(source.pages.find(page => page.path === 'appliances').sections.at(-1).cards.some(card => card.tap_action?.service === manifest.actionErrorCase.service));
  assert.ok(roomContent(source, 1).cards.some(card => card.entity === 'camera.marao_dashboard_test_media_error'));
});

test('value sliders have independent minimum, middle and maximum fixtures', () => {
  const cases = concreteCases().filter((entry) => entry.sliderPercentage !== undefined);
  assert.equal(cases.length, 9);
  for (const example of cases) {
    const controls = Object.entries(helpers.input_number).filter(([key]) => key.startsWith(`${example.entity.split('.')[1]}_control_`));
    assert.equal(controls.length, 1, example.id);
    const maximum = example.template === 'hc_light_card' ? 255 : 100;
    assert.equal(controls[0][1].initial, Math.max(controls[0][1].min, Math.round(example.sliderPercentage * maximum / 100)), example.id);
    assert.ok(controls[0][1].initial <= controls[0][1].max, example.id);
  }
});

test('native value sliders also share a scrollable popup with existing safe middle fixtures', () => {
  const popup = view.cards.find((card) => card.hash === '#marao-dashboard-test-value-sliders-popup');
  assert.equal(popup.height, '50dvh');
  assert.deepEqual(popup.cards[0].cards.map((card) => card.entity), concreteCases().filter((entry) => entry.sliderPercentage === 50).map((entry) => entry.entity));
  assert.ok(view.cards.some((card) => card.variables?.popup_hash === popup.hash));
});

test('full-height sheets cover the safe gallery and a realistic appliance page', () => {
  const tall = view.cards.find(card => card.hash === '#marao-dashboard-test-tall-controls-popup');
  assert.equal(tall.height, '100dvh');
  assert.equal(tall.max_height, '100dvh');
  assert.deepEqual(tall.cards.map(card => card.entity), concreteCases().filter(entry => entry.sliderPercentage === 50).map(entry => entry.entity));
  const source = JSON.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_test_dashboard.json', import.meta.url), 'utf8'));
  const appliances = roomContent(source, 'appliances');
  const popup = appliances.cards.find(card => card.type === 'custom:marao-popup-card');
  assert.equal(popup.height, '100dvh');
  assert.equal(popup.max_height, '100dvh');
  assert.ok(appliances.cards.some(card => card.variables?.popup_hash === popup.hash));
  for (const card of popup.cards) assert.ok(fixtureIds(helpers).has(card.entity));
});

test('gallery covers native on-off devices and all configured vacuum segment actions', () => {
  for (const name of ['On/off light', 'Single-speed fan']) assert.ok(view.cards.some((card) => card.name === name));
  const vacuum = view.cards.find((card) => card.name === 'Vacuum segment commands');
  assert.deepEqual([1, 2, 3].map((index) => vacuum.variables[`action_${index}`].segment), [21, 22, 23]);
  assert.equal(helpers.vacuum[0].platform, 'marao_test_vacuum');
  const ids = fixtureIds(helpers);
  assert.ok(ids.has('light.marao_dashboard_test_onoff_light'));
  assert.ok(ids.has('fan.marao_dashboard_test_onoff_fan'));
});

test('compact navigation covers the Portuguese overview titles with existing safe fixtures', () => {
  const group = view.cards.find((card) => card.cards?.[0]?.name === 'Compact navigation');
  const grid = group.cards[1];
  assert.equal(grid.columns, 2);
  assert.equal(grid.square, false);
  assert.deepEqual(grid.cards.map((card) => card.name), ['Iluminação', 'Persianas', 'Climatização', 'Manutenção', 'Cenários']);
  const ids = fixtureIds(helpers);
  for (const card of grid.cards) {
    assert.ok(ids.has(card.entity), `Missing safe fixture: ${card.entity}`);
    assert.equal(card.template, 'hc_navigation_card');
    assert.equal(card.tap_action.navigation_path, '/marao-dashboard/overview');
  }
});

test('generic media controls cover available and disabled states with resolvable safe targets', () => {
  const popup = view.cards.find((card) => card.hash === '#marao-dashboard-test-generic-media-popup');
  const disabled = view.cards.filter((card) => card.cards?.[0]?.name?.startsWith('Generic media controls · '));
  assert.equal(disabled.length, 2);
  const ids = fixtureIds(helpers);
  for (const grid of [popup.cards[0], ...disabled.map((group) => group.cards[1])]) {
    assert.deepEqual(grid.cards.map((card) => card.tap_action.perform_action), ['media_player.media_previous_track', 'media_player.media_play_pause', 'media_player.media_next_track']);
    for (const card of grid.cards) {
      assert.ok(ids.has(card.entity), `Missing media fixture: ${card.entity}`);
      assert.equal(card.show_name, false);
      assert.equal(card.show_state, false);
      assert.ok(card.variables.action_label_key);
    }
  }
});

test('history Retry sheets use the existing safe error source and matching triggers', () => {
  const error = manifest.historyCases.find(example => example.id === 'error');
  assert.match(error.entity, /^sensor\.marao_dashboard_test_/);
  for (const kind of ['Energy', 'Timeline']) {
    const name = `${kind} history Retry popup`;
    const popup = view.cards.find(card => card.type === 'custom:marao-popup-card' && card.name === name);
    const trigger = view.cards.find(card => card.template === 'hc_bubble_popup_card' && card.name === name);
    assert.equal(trigger.variables.popup_hash, popup.hash);
    assert.equal(trigger.entity, error.entity);
    assert.equal(popup.cards[0].entity, error.entity);
    assert.equal(popup.cards[0].type, kind === 'Energy' ? 'custom:marao-energy-period-card' : 'custom:marao-state-timeline-card');
    assert.equal(popup.cards[0].popup, kind === 'Energy' ? true : undefined);
  }
});

test('popup manifest covers distinct sizing, providers and repeatable transient states', () => {
  const popups = popupCases(view);
  assert.equal(new Set(popups.map((popup) => popup.hash)).size, popups.length);
  for (const name of ['Fixed-height popup', 'Camera events', 'Multi Mode Climate', 'Lights', 'Blinds', 'Maintenance', 'Apple TV', 'Month Power', 'Today Power', 'Lock', 'Garage Door']) assert.ok(popups.some((popup) => popup.name === name), name);
  for (const id of ['frigate', 'unifi', 'empty', 'loading', 'error']) assert.ok(popups.some((popup) => popup.hash === `#marao-dashboard-test-events-${id}`), id);
  assert.ok(!JSON.stringify(view).includes('!include'));
});

test('unknown cover fixtures clear position as well as state so HA cannot infer open', () => {
  const covers = helpers.template.flatMap((block) => block.cover || []);
  for (const name of ['cover', 'garage']) {
    const fixture = covers.find((entry) => entry.default_entity_id === `cover.marao_dashboard_test_case_${name}_unknown`);
    assert.equal(fixture.state, '{{ none }}');
    assert.equal(fixture.position, '{{ none }}');
  }
  const known = covers.find((entry) => entry.default_entity_id === 'cover.marao_dashboard_test_case_cover_open');
  assert.match(known.position, /states\('input_number\.marao_dashboard_test_case_cover_open_control_0'\)/);
});

test('history, event availability, dual setpoints and mixed groups have concrete visible examples', () => {
  for (const type of ['custom:marao-energy-period-card', 'custom:marao-state-timeline-card']) {
    const cases = concreteCases().filter((entry) => entry.type === type);
    for (const state of ['unknown', 'unavailable', 'missing']) assert.ok(cases.some((entry) => entry.state === state));
  }
  const all = JSON.stringify(view);
  for (const example of manifest.historyCases) {
    assert.ok(all.includes(`Graph history · ${example.id}`));
    assert.ok(all.includes(`Energy history · ${example.id}`));
    assert.ok(all.includes(`Timeline history · ${example.id}`));
  }
  for (const example of manifest.eventCases.filter((entry) => entry.expectedDisabled)) {
    const popup = view.cards.find((card) => card.hash === `#marao-dashboard-test-events-${example.id}`);
    assert.equal(popup.cards[0].entity, example.entity);
  }
  assert.ok(helpers.climate.some((entry) => entry.dual_target === true));
  assert.notEqual(manifest.groupCase.entities[0], manifest.groupCase.entities[1]);
  assert.match(manifest.groupCase.entities[1], /unavailable$/);
  assert.ok(all.includes(manifest.actionErrorCase.service));
});


test('room compositions use safe explicit lights and representative product icons', () => {
  const ids = fixtureIds(helpers);
  const rooms = manifest.roomCompositionCases;
  for (const room of rooms) {
    assert.ok(view.cards.some(card => card.name === room.name));
    assert.equal(room.template, 'hc_room_card');
    assert.equal(room.tap_action.action, room.name === 'Room · custom label' ? 'none' : 'navigate');
    for (const entity of room.variables.light_entities) assert.ok(ids.has(entity), entity);
  }
  const secondary = rooms.find(room => room.name === 'Room · active secondary');
  assert.match(secondary.variables.light_entities[0], /_off$/);
  assert.match(secondary.variables.light_entities[1], /_on$/);
  assert.equal(rooms.find(room => room.name === 'Empty room').variables.light_entities.length, 0);
  assert.ok(rooms.some(room => room.name === 'Room · connection loss'));
  assert.equal(rooms.find(room => room.name === 'Room · custom label').variables.custom_label, 'Reading corner');
  assert.ok(rooms.some(room => room.name.length > 60));
  const source = JSON.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_test_dashboard.json', import.meta.url), 'utf8'));
  for (const icon of ['mdi:bed', 'mdi:door', 'mdi:garage']) assert.ok(roomPages(source).some(room => room.icon === icon));
});

test('weather fixtures use the native domain and condition including neutral states', () => {
  const entities=helpers.template.flatMap(block=>block.weather || []);
  const weather=entities.find(e=>e.default_entity_id==='weather.marao_dashboard_test_weather');
  assert.ok(weather.condition.includes('input_select.marao_dashboard_test_weather_condition'));
  assert.ok(weather.attributes.forecast);
  for(const state of ['sunny','unknown','unavailable']) {
    const entity=entities.find(e=>e.default_entity_id==='weather.marao_dashboard_test_case_weather_'+state);
    assert.equal(entity.state,undefined);
    if(state==='unknown')assert.equal(entity.condition,'{{ none }}');
    if(state==='unavailable')assert.equal(entity.availability,'{{ false }}');
  }
});

test('energy formatting cases use safe readings and carry period choices into their sheets', () => {
  const ids = fixtureIds(helpers);
  const cases = manifest.energyFormattingCases;
  assert.equal(cases.length, 19);
  for (const example of cases) {
    assert.ok(ids.has(example.entity), example.name);
    assert.ok(view.cards.some(card => card.name === example.name && card.entity === example.entity));
    if (!example.popup_hash) continue;
    const sheet = view.cards.find(card => card.hash === example.popup_hash);
    assert.ok(sheet, example.name);
    for (const key of ['entity', 'display_unit', 'display_precision']) assert.equal(sheet.cards[0][key], example[key]);
    assert.equal(sheet.cards[0].popup, true);
  }
  for (const suffix of ['signed export', 'real zero', 'cost precision', 'missing source unit', 'missing history unit', 'incompatible history unit', 'unavailable', 'independent graph source', 'secondary conversion', 'legacy label only']) assert.ok(cases.some(card => card.name === 'Energy format · ' + suffix), suffix);
  const duplicate = cases.filter(card => card.entity === 'sensor.marao_dashboard_test_energy_format_mixed' && card.variables);
  assert.ok(duplicate.some(card => card.variables.display_precision === 0));
  assert.ok(duplicate.some(card => card.variables.display_precision === 2));
  assert.ok(duplicate.some(card => card.variables.display_precision === 6));
});
