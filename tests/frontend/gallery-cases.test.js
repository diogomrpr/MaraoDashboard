import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const YAML = require('yaml');
const { concreteCases, expandGallery, expandHelpers, validateCoverage, popupCases, manifest } = require('../../ha-test/cases.js');
const helpers = expandHelpers(YAML.parse(fs.readFileSync(new URL('../../ha-test/marao_dashboard_card_test_helpers.yaml', import.meta.url), 'utf8')));
const view = expandGallery(YAML.parse(fs.readFileSync(new URL('../../ha-test/dashboard/views/00-card-test.yaml', import.meta.url), 'utf8')));

function fixtureIds(config) {
  const ids = new Set();
  for (const domain of ['input_boolean', 'input_number', 'input_select']) for (const key of Object.keys(config[domain] || {})) ids.add(`${domain}.${key}`);
  for (const domain of ['camera', 'climate', 'media_player', 'remote']) for (const item of config[domain] || []) ids.add(`${domain}.${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`);
  for (const block of config.template) for (const [domain, entries] of Object.entries(block)) {
    if (!Array.isArray(entries) || domain === 'trigger') continue;
    for (const entry of entries) ids.add(entry.default_entity_id || `${domain}.${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`);
  }
  return ids;
}

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
