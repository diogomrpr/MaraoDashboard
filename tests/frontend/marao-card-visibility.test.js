import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

globalThis.HTMLElement = class {
  getRootNode() { return {}; }
  attachShadow() {
    this.shadowRoot = {
      innerHTML: "",
      querySelector: () => null,
      querySelectorAll: () => [],
    };
  }
};

globalThis.ResizeObserver = class {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() { this.disconnected = true; }
};
function popupOverlay(close) {
  const overlay = new EventTarget(), properties = new Map();
  overlay.style = { setProperty: (key, value) => properties.set(key, value), getPropertyValue: key => properties.get(key) || '' };
  overlay.header = { height: 80, getBoundingClientRect() { return { height: this.height }; } };
  overlay.querySelector = selector => selector === '.marao-popup-close' ? close : selector === '.marao-popup-head' ? overlay.header : null;
  overlay.remove = () => {};
  return overlay;
}

const source = (await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8")).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url).href));
globalThis.navigationTranslations = (await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js')).navigationTranslations;
const dashboardSource = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoRuntime.js", import.meta.url), "utf8");
const { ACCESS_HOLD_MS, MaraoCard, MaraoPopupCard, callServiceWithNotification, focusRestorer, performAction, registerMaraoCards, binaryState, cardProblem, problemStyle, serviceOutcome, stateAppearance, summaryState, entityGroupState, vacuumActions, mediaAppBrand } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#visibility`);

function retainedCardDOM(t, card) {
  const makeSurface = attributes => ({
    attributes: Object.entries(attributes).map(([name, value]) => ({ name, value })),
    childNodes: [], shadowRoot: { slot: true }, style: { setProperty() {} }, classList: { remove() {} },
    removeAttribute(name) { this.attributes = this.attributes.filter(attribute => attribute.name !== name); },
    setAttribute(name, value) { this.removeAttribute(name); this.attributes.push({ name, value }); },
    append(...children) { this.childNodes.push(...children); },
  });
  const surface = makeSurface({ class: 'obsolete', role: 'group', 'aria-busy': 'true', style: 'old' });
  let replacement;
  const style = { textContent: '' };
  const root = {
    querySelector: selector => selector === 'ha-card' ? surface : selector === 'style' ? style : surface.childNodes[0]?.controls.get(selector) || null,
    querySelectorAll: selector => selector === 'ha-state-icon' && surface.childNodes.length ? [surface.childNodes[0].symbol] : [],
  };
  Object.defineProperty(root, 'innerHTML', { set() { assert.fail('Replacing the shadow root detaches the live HA surface'); } });
  const previousDocument = globalThis.document;
  t.after(() => { globalThis.document = previousDocument; });
  globalThis.document = { createElement(tag) {
    assert.equal(tag, 'template');
    return { set innerHTML(markup) {
      const attributes = Object.fromEntries([...markup.match(/<ha-card([^>]*)>/)[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
      replacement = makeSurface(attributes);
      const controls = new Map(['data-card-action', 'data-history-open'].filter(name => markup.includes(` ${name}`)).map(name => [`[${name}]`, new EventTarget()]));
      replacement.childNodes = [{ markup, controls, symbol: { dataset: {} }, remove() { surface.childNodes = surface.childNodes.filter(node => node !== this); } }];
      this.content = { querySelector: selector => selector === 'ha-card' ? replacement : { textContent: markup.match(/<style>([\s\S]*?)<\/style>/)[1] } };
    } };
  } };
  card.shadowRoot = root;
  return { surface, style, get replacement() { return replacement; } };
}

test('rerenders never detach the native surface while replacing content and obsolete attributes', t => {
  const card = new MaraoCard();
  card._config = { entity: 'sensor.test', name: 'Reading' };
  const dom = retainedCardDOM(t, card), { surface, style } = dom;
  for (const state of ['unavailable', '21']) {
    card._hass = { states: { 'sensor.test': { state, attributes: {} } } };
    card._render();
    assert.equal(card.shadowRoot.querySelector('ha-card'), surface);
    assert.equal(surface.shadowRoot.slot, true);
    assert.deepEqual(surface.attributes, dom.replacement.attributes);
    assert.equal(surface.childNodes[0], dom.replacement.childNodes[0]);
    assert.equal(surface.childNodes.length, 1, 'Old card content must be removed after mounting the replacement');
    assert.equal(surface.attributes.some(attribute => attribute.name === 'data-problem'), state === 'unavailable');
    assert.equal(surface.attributes.some(attribute => attribute.name === 'aria-busy' || attribute.name === 'role' || attribute.name === 'class'), false);
    assert.equal(surface.attributes.some(attribute => attribute.name === 'style'), state === 'unavailable');
    const content = surface.childNodes[0];
    card._hass = { ...card._hass, states: { 'sensor.test': { state, attributes: {}, last_reported: '2026-10-21T14:00:00Z' } } };
    card._render();
    assert.equal(surface.childNodes[0], content, 'An equivalent report must keep the scrolling content mounted');
  }
  card._config = { template: 'hc_alarm_controls_card', entity: 'alarm_control_panel.test' };
  card._hass = { states: { 'alarm_control_panel.test': { state: 'disarmed', attributes: {} } } };
  card._render();
  assert.equal(card.shadowRoot.querySelector('ha-card'), surface);
  assert.match(style.textContent, /\.alarm-body/);
});

test('retained History buttons open once after equivalent state reports', t => {
  const card = new MaraoCard();
  card._config = { template: 'hc_graph_card', entity: 'sensor.test', name: 'Reading' };
  retainedCardDOM(t, card);
  const opened = [];
  card._openHistory = opener => opened.push(opener);
  let button;
  for (let report = 0; report < 4; report++) {
    card._hass = { states: { 'sensor.test': { state: '21', attributes: {}, last_reported: String(report) } } };
    card._render();
    button ||= card.shadowRoot.querySelector('[data-history-open]');
    assert.equal(card.shadowRoot.querySelector('[data-history-open]'), button);
  }
  button.dispatchEvent(new Event('click'));
  assert.deepEqual(opened, [button], 'One tap must open History only once');
});

test('retained card actions dispatch once with current service context and changed bindings', t => {
  const card = new MaraoCard(), calls = [];
  card._config = { template: 'hc_switch_card', entity: 'switch.test', name: 'Switch', tap_action: { action: 'call-service', service: 'switch.turn_on' } };
  retainedCardDOM(t, card);
  let button;
  for (let report = 0; report < 4; report++) {
    card._hass = { states: { 'switch.test': { state: 'off', attributes: {}, last_reported: String(report) } }, callService: async (...args) => calls.push([report, ...args.slice(0, 3)]) };
    card._render();
    button ||= card.shadowRoot.querySelector('[data-card-action]');
    assert.equal(card.shadowRoot.querySelector('[data-card-action]'), button);
  }
  button.dispatchEvent(new Event('click'));
  assert.deepEqual(calls, [[3, 'switch', 'turn_on', { entity_id: 'switch.test' }]]);
  card._config.tap_action = { action: 'call-service', service: 'switch.turn_off' };
  card._render();
  const updated = card.shadowRoot.querySelector('[data-card-action]');
  assert.notEqual(updated, button, 'Changed bindings must replace the old action');
  updated.dispatchEvent(new Event('click'));
  assert.deepEqual(calls, [[3, 'switch', 'turn_on', { entity_id: 'switch.test' }], [3, 'switch', 'turn_off', { entity_id: 'switch.test' }]]);
});

test('retained native icons receive fresh Home Assistant context and state', t => {
  const card = new MaraoCard();
  card._config = { template: 'hc_switch_card', entity: 'switch.test', name: 'Switch' };
  const { surface } = retainedCardDOM(t, card);
  card._hass = { states: { 'switch.test': { state: 'off', attributes: {} } } };
  card._render();
  const content = surface.childNodes[0], symbol = card.shadowRoot.querySelectorAll('ha-state-icon')[0];
  const state = { state: 'off', attributes: { last_report: 'new' } };
  card._hass = { states: { 'switch.test': state } };
  card._render();
  assert.equal(surface.childNodes[0], content);
  assert.equal(card.shadowRoot.querySelectorAll('ha-state-icon')[0], symbol);
  assert.equal(symbol.hass, card._hass);
  assert.equal(symbol.stateObj.attributes, state.attributes);
});

test('unrelated state updates preserve scrolling cards while their own inputs still refresh', () => {
  const card = new MaraoCard();
  let renders = 0;
  card._render = () => { renders++; };
  card.setConfig({
    template: 'hc_dishwasher_card', entity: 'sensor.operation',
    variables: { progress_entity: 'sensor.progress', remaining_time_entity: 'sensor.remaining', active_program_entity: 'sensor.program', salt_entity: 'binary_sensor.salt' },
    tap_action: { action: 'call-service', service: 'switch.turn_on', target: { entity_id: ['switch.target'] } },
  });
  let hass = { connected: true, connection: { connected: true }, callService() {}, states: {
    'sensor.operation': { state: 'ready' }, 'sensor.progress': { state: 'unavailable' },
    'sensor.remaining': { state: 'unavailable' }, 'sensor.program': { state: 'unknown' },
    'binary_sensor.salt': { state: 'off' }, 'switch.target': { state: 'off' },
  } };
  card.hass = hass;
  const initial = renders;
  for (let i = 0; i < 5; i++) {
    hass = { ...hass, states: { ...hass.states, 'sensor.unrelated': { state: String(i) } } };
    card.hass = hass;
  }
  assert.equal(renders, initial, 'An unchanged card must keep the elements under a scrolling finger');
  for (const entity of ['sensor.operation', 'sensor.progress', 'sensor.remaining', 'sensor.program', 'binary_sensor.salt', 'switch.target']) {
    const before = renders;
    hass = { ...hass, states: { ...hass.states, [entity]: { state: 'unavailable' } } };
    card.hass = hass;
    assert.equal(renders, before + 1, entity + ' must refresh the card immediately');
  }
  const before = renders;
  card.hass = { ...hass, language: 'pt' };
  card.hass = { ...hass, connected: false };
  assert.equal(renders, before + 2, 'Localization and disconnection must still refresh');
});

test('typed groups count complete membership independently of filtering and duplicate references', () => {
  for (const [type, values, active, label] of [
    ['light', ['off', 'on', 'unknown'], ['member.1'], '1 active'],
    ['cover', ['closed', 'opening', 'closing', 'open'], ['member.1', 'member.3'], '2 active'],
    ['climate', ['off', 'heat', 'auto', 'unavailable'], ['member.1', 'member.2'], '2 active'],
  ]) {
    const states = Object.fromEntries(values.map((state, index) => [`member.${index}`, { state, attributes: { hvac_action: 'idle' } }]));
    const ids = [...Object.keys(states), 'member.1'];
    const summary = entityGroupState(type, ids, { states });
    assert.deepEqual(summary.activeEntities, active); assert.equal(summary.label, label);
    assert.equal(summary.available, values.filter(state => !['unknown', 'unavailable'].includes(state)).length);
    assert.equal(summary.state, 'on');
  }
  assert.equal(entityGroupState('cover', ['cover.closed', 'cover.closing'], { states: { 'cover.closed': { state: 'closed' }, 'cover.closing': { state: 'closing' } } }).label, 'All closed');
  assert.equal(entityGroupState('climate', ['climate.off'], { states: { 'climate.off': { state: 'off' } } }).label, 'All off');
  assert.equal(entityGroupState('light', ['light.unknown'], { states: { 'light.unknown': { state: 'unknown' } } }).state, 'unknown');
  assert.equal(entityGroupState('light', ['light.unavailable'], { states: { 'light.unavailable': { state: 'unavailable' } } }).state, 'unavailable');
  assert.equal(entityGroupState('light', [], { states: {} }).label, 'No entities configured');
  assert.equal(entityGroupState('light', ['light.on'], {}).state, 'loading');
  assert.deepEqual(summaryState(['climate.idle'], { states: { 'climate.idle': { state: 'idle' } } }), { state: 'off', label: 'All off' });
});

test('battery groups retain first usable reading and count secondary lows and invalid readings', () => {
  const readings = ['unavailable', '75', '10', '20', '80', '0', '100', '-1', '101', '', 'bad', 'unknown'];
  const states = Object.fromEntries(readings.map((state, index) => [`sensor.${index}`, { state }]));
  const summary = entityGroupState('battery', [...Object.keys(states), 'sensor.2'], { states });
  assert.equal(summary.reading, 75); assert.equal(summary.available, 6);
  assert.deepEqual(summary.activeEntities, ['sensor.2', 'sensor.5']);
  assert.equal(summary.label, '75% · 2 low');
  const invalid = { states: { 'sensor.invalid': { state: 'not a number' } } };
  assert.equal(entityGroupState('battery', ['sensor.invalid'], invalid).state, 'unavailable');
  const card = new MaraoCard();
  card.setConfig({ template: 'hc_entity_group_card', name: 'Maintenance', variables: { entity_type: 'battery', summary_entities: ['sensor.invalid'] }, tap_action: { action: 'navigate', navigation_path: '#group' } });
  card.hass = invalid;
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  assert.match(card.shadowRoot.innerHTML, /Unavailable/);
});

test('battery group severity uses all valid readings without changing the first reading', () => {
  for (const [values, expected, low, unavailable] of [
    [['75', '10', '10'], 10, 2, 0], [['100', '0'], 0, 1, 0], [['80', '19.99'], 19.99, 1, 0],
    [['80', '20'], 20, 0, 0], [['100', '79.99'], 79.99, 0, 0], [['100', '80'], 80, 0, 0],
    [['100', 'unknown', '', '-1', '101', 'bad'], 100, 0, 5], [['unavailable', 'bad'], null, 0, 2], [[], null, 0, 0],
  ]) {
    const states = Object.fromEntries(values.map((state, i) => ['sensor.' + i, { state }]));
    const ids = Object.keys(states);
    const group = entityGroupState('battery', [...ids, ...ids], { states });
    assert.equal(group.minimumReading, expected);
    assert.equal(group.activeEntities.length, low);
    assert.equal(group.unavailableEntities.length, unavailable);
    assert.equal(entityGroupState('battery', [...ids].reverse(), { states }).minimumReading, expected);
    if (expected !== null) assert.equal(group.reading, Number(values[0]));
  }
  assert.equal(entityGroupState('battery', ['sensor.first'], {}).minimumReading, null);
});

test('battery group rendered surfaces reconcile thresholds, partial availability and reported errors', () => {
  const card = new MaraoCard(), colors = {};
  card._setMarkup = markup => { card.shadowRoot.innerHTML = markup; for (const key of Object.keys(colors)) delete colors[key]; };
  card.shadowRoot.querySelector = selector => selector === 'ha-card' ? { classList: { remove() {} }, style: { setProperty: (key, value) => { colors[key] = value; } } } : null;
  const config = { template: 'hc_entity_group_card', name: 'Independent battery group', variables: { entity_type: 'battery', summary_entities: ['sensor.first', 'sensor.second'] }, tap_action: { action: 'navigate', navigation_path: '#batteries' } };
  card.setConfig(config);
  const render = (first, second, extra = {}) => { card.hass = { callService() {}, connected: true, states: { 'sensor.first': { state: first }, 'sensor.second': { state: second } }, ...extra }; return card.shadowRoot.innerHTML.split('</style>')[1]; };
  for (const [second, color] of [['10', 'red'], ['20', 'yellow'], ['80', 'green'], ['19.99', 'red']]) {
    render('100', second);
    assert.equal(colors['--marao-card-background'], 'var(--color-' + color + ')');
  }
  let markup = render('10', 'unavailable');
  assert.doesNotMatch(markup, /data-problem=|class="problem"/);
  assert.equal(colors['--marao-card-background'], 'var(--color-red)');
  assert.match(markup, /1 low/);
  assert.doesNotMatch(markup, /data-card-action[^>]* disabled/);
  assert.doesNotMatch(render('80', 'unavailable'), /data-problem=|class="problem"/);
  assert.equal(colors['--marao-card-background'], 'var(--color-green)');
  assert.match(render('unavailable', 'unknown'), /data-problem="neutral"/);
  assert.match(render('10', '80', { connected: false }), /data-problem="neutral"/);
  card._actionError = 'Reported failure';
  markup = render('10', 'unknown');
  assert.match(markup, /data-problem="error" style="background:var\(--marao-problem-error-background/);
  assert.match(markup, /Reported failure/);
  card._actionError = '';
  render('80', '100');
  assert.equal(colors['--marao-card-background'], 'var(--color-green)');
  card.setConfig({ ...config, variables: { ...config.variables, summary_entities: ['sensor.first'] } });
  assert.equal(colors['--marao-card-background'], 'var(--color-green)');
  assert.equal(stateAppearance('hc_battery_card', '10', { variables: { card_color: '#123456' } }).background, '#123456');
});

test('entity-free group cards preserve counts, readable inactive/empty states and connection guards', () => {
  const card = new MaraoCard();
  card.setConfig({ template: 'hc_entity_group_card', name: 'Lights', variables: { entity_type: 'light', summary_entities: ['light.on', 'light.off'] }, tap_action: { action: 'navigate', navigation_path: '#group' } });
  card.hass = { states: { 'light.on': { state: 'on' }, 'light.off': { state: 'off' } } };
  assert.match(card.shadowRoot.innerHTML, /1 active/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  card.hass = { ...card._hass, connected: false };
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  assert.match(card.shadowRoot.innerHTML, /Disconnected/);
  card.hass = { states: { 'light.on': { state: 'off' }, 'light.off': { state: 'off' } } };
  assert.match(card.shadowRoot.innerHTML, /All off/);
  card.setConfig({ ...card._config, variables: { entity_type: 'light', summary_entities: [] } });
  assert.match(card.shadowRoot.innerHTML, /No entities configured/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
});

test("actions disable and decline unavailable service targets independent of their displayed entity", async () => {
  const calls = [];
  const hass = { callService: async (...args) => calls.push(args), states: { "media_player.test": { state: "playing", attributes: {} }, "remote.test": { state: "unavailable" } } };
  const card = new MaraoCard();
  card.setConfig({ entity: "media_player.test", tap_action: { action: "perform-action", perform_action: "remote.send_command", target: { entity_id: "remote.test" } } });
  card.hass = hass;
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  await performAction(hass, card._config.tap_action, "media_player.test");
  await callServiceWithNotification(hass, "light", "turn_off", { entity_id: ["media_player.test", "missing.entity"] });
  assert.equal(calls.length, 0);
  hass.states["remote.test"] = { state: "on" };
  card.hass = { ...hass };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  await performAction(hass, card._config.tap_action, "media_player.test");
  assert.equal(calls.length, 1);
});

test("summaries count every device and keep mixed-availability navigation actionable", () => {
  const states = { "light.off": { state: "off" }, "light.on": { state: "on" }, "light.unavailable": { state: "unavailable" } };
  assert.deepEqual(summaryState(["light.off", "light.on", "light.on"], { states }), { state: "on", label: "1 active" });
  assert.deepEqual(summaryState(["light.unavailable", "light.on"], { states }), { state: "on", label: "1 active" });
  assert.deepEqual(summaryState(["light.off"], { states }), { state: "off", label: "All off" });
  const card = new MaraoCard();
  card.setConfig({ template: "hc_navigation_card", entity: "light.unavailable", variables: { summary_entities: ["light.unavailable", "light.on"] }, tap_action: { action: "navigate", navigation_path: "#lights" } });
  card.hass = { states, callService() {} };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  assert.match(card.shadowRoot.innerHTML, /1 active/);
  card.hass = { states: { "light.unavailable": states["light.unavailable"] }, callService() {} };
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
});

test("vacuum commands honor native capabilities and send each configured segment intact", async () => {
  const state = { state: "docked", attributes: { supported_features: 8192 | 4 | 16 | 256 } };
  const actions = vacuumActions(state, { action_1: { segment: 0 }, action_2: { segment: 22, icon: "mdi:sofa" }, action_3: { segment: 23, on_action: "vacuum.start" } });
  assert.deepEqual(actions.map((action) => action.service), ["vacuum.start", "vacuum.pause", "vacuum.return_to_base", "vacuum.send_command", "vacuum.send_command", "vacuum.start"]);
  assert.deepEqual(actions[3].data, { command: "app_segment_clean", params: [0] });
  assert.deepEqual(actions[5].data, {});
  const calls = [];
  await performAction({ callService: async (...args) => calls.push(args) }, { action: "call-service", service: actions[4].service, data: actions[4].data }, "vacuum.test");
  assert.deepEqual(calls[0].slice(0, 3), ["vacuum", "send_command", { command: "app_segment_clean", params: [22], entity_id: "vacuum.test" }]);
  assert.deepEqual(vacuumActions({ attributes: { supported_features: 8192 } }, { action_1: { segment: 21 } }).map((entry) => entry.key), ["start"]);
});

test("shared builder settings change the rendered labels, icons and power reading", () => {
  const card = new MaraoCard();
  card.setConfig({ template: "hc_switch_card", entity: "switch.test", variables: { custom_label: "Status: ", power_entity: "sensor.power", power_unit: "kW" } });
  card.hass = { callService() {}, states: { "switch.test": { state: "on", attributes: {} }, "sensor.power": { state: "2", attributes: {} } } };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<div class="state">/);
  assert.match(card.shadowRoot.innerHTML, /2 kW/);
  card.setConfig({ template: "hc_sensor_card", entity: "binary_sensor.test", variables: { on_icon: "mdi:check", off_icon: "mdi:close" } });
  card.hass = { callService() {}, states: { "binary_sensor.test": { state: "off", attributes: {}, last_updated: "2026-10-09T12:00:00Z" } } };
  assert.match(card.shadowRoot.innerHTML, /icon="mdi:close"/);
  assert.match(card.shadowRoot.innerHTML, /Updated /);
});

test("unknown custom colors remain neutral and toggle graph presentation honors its builder fields", () => {
  const variables = { toggle_entity: "switch.test", active_content_color: "#111", active_icon_background: "#eee", inactive_background: "#ddd", inactive_name_color: "#222", inactive_state_color: "#333", inactive_icon_color: "#444", inactive_icon_background: "#ccc" };
  assert.deepEqual(stateAppearance("hc_toggle_graph_card", "unknown", { variables }, { states: { "switch.test": { state: "on" } } }), { unavailable: true });
  const active = stateAppearance("hc_toggle_graph_card", "2", { variables }, { states: { "switch.test": { state: "on" } } });
  assert.equal(active.text, "#111"); assert.equal(active.iconBackground, "#eee");
  const inactive = stateAppearance("hc_toggle_graph_card", "2", { variables }, { states: { "switch.test": { state: "off" } } });
  assert.equal(inactive.background, "#ddd"); assert.equal(inactive.stateText, "#333"); assert.equal(inactive.icon, "#444");
});

test("native on-off devices do not offer unsupported value sliders", () => {
  const card = new MaraoCard();
  assert.equal(card._range("light.test", { state: "on", attributes: { supported_color_modes: ["onoff"] } }, "hc_light_card"), "");
  assert.equal(card._range("fan.test", { state: "on", attributes: { supported_features: 0 } }, "hc_fan_card"), "");
  assert.match(card._range("light.test", { state: "off", attributes: { supported_color_modes: ["brightness"] } }, "hc_light_card"), /type="range"/);
});

test("relative media seek uses live position and elapsed playback while respecting both bounds", async () => {
  const calls = [];
  const state = { state: "paused", attributes: { media_position: 5, media_duration: 120 } };
  const hass = { callService: async (...args) => calls.push(args), states: { "media_player.test": state } };
  const action = { action: "perform-action", perform_action: "media_player.media_seek", seek_offset: -10 };
  await performAction(hass, action, "media_player.test");
  assert.equal(calls.at(-1)[2].seek_position, 0);
  state.attributes.media_position = 110;
  await performAction(hass, { ...action, seek_offset: 30 }, "media_player.test");
  assert.equal(calls.at(-1)[2].seek_position, 120);
  state.state = "playing"; state.attributes.media_position = 40;
  state.attributes.media_position_updated_at = new Date(Date.now() - 10000).toISOString();
  await performAction(hass, action, "media_player.test");
  assert.ok(calls.at(-1)[2].seek_position >= 40 && calls.at(-1)[2].seek_position <= 41);
});

test("a dual-action hold dispatches either the tap or the hold and never both", () => {
  const originalTimeout = globalThis.setTimeout;
  const originalClear = globalThis.clearTimeout;
  let timer;
  globalThis.setTimeout = (callback) => { timer = callback; return 1; };
  globalThis.clearTimeout = () => { timer = null; };
  try {
    const card = new MaraoCard(); const button = new EventTarget(); const calls = [];
    button.getBoundingClientRect = () => ({ left: 0, top: 0, right: 50, bottom: 50 });
    card._bindHoldAction(button, null, () => calls.push("hold"), () => calls.push("tap"));
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    button.dispatchEvent(pointerEvent("pointerup")); button.dispatchEvent(new Event("click"));
    assert.deepEqual(calls, ["tap"]);
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 })); timer();
    button.dispatchEvent(pointerEvent("pointerup")); button.dispatchEvent(new Event("click"));
    assert.deepEqual(calls, ["tap", "hold"]);
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    button.dispatchEvent(pointerEvent("pointermove", { clientX: 60, clientY: 25 }));
    button.dispatchEvent(pointerEvent("pointerup")); button.dispatchEvent(new Event("click"));
    assert.deepEqual(calls, ["tap", "hold"]);
    button.dispatchEvent(new Event("click"));
    assert.deepEqual(calls, ["tap", "hold", "tap"], "native semantic click also activates a safe tap");
  } finally { globalThis.setTimeout = originalTimeout; globalThis.clearTimeout = originalClear; }
});

function pointerEvent(type, values = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(values)) Object.defineProperty(event, key, { value });
  return event;
}

test("card registration can be retried after the custom-element registry becomes available", () => {
  const previousRegistry = globalThis.customElements;
  const registered = new Map();
  globalThis.customElements = {
    get: (name) => registered.get(name),
    define: (name, klass) => registered.set(name, klass),
  };
  try {
    registerMaraoCards();
    assert.deepEqual([...registered.keys()], ["marao-card", "marao-power-history-card", "marao-control-grid", "marao-navbar-card", "marao-popup-card"]);
    registerMaraoCards();
    assert.equal(registered.size, 5);
  } finally {
    globalThis.customElements = previousRegistry;
  }
});

test("dashboard waits for Home Assistant's settled registry before loading and registering cards", () => {
  const ready = dashboardSource.indexOf("await waitForHomeAssistantRegistry();");
  const imports = dashboardSource.indexOf("await Promise.all([");
  const cards = dashboardSource.indexOf("registerMaraoCards();");
  const events = dashboardSource.indexOf("registerMaraoCameraEventCards();");
  assert.ok(ready >= 0 && ready < imports);
  assert.ok(imports < cards && cards < events);
  assert.match(dashboardSource, /customElements\?\.get\("home-assistant"\)/);
});

test("energy period cards provide calendar history navigation", () => {
  assert.match(dashboardSource, /customElements\.define\("marao-energy-period-card"/);
  assert.match(dashboardSource, /history\/period\/\$\{start\.toISOString\(\)\}/);
  assert.match(dashboardSource, /data-period="previous"/);
  assert.match(dashboardSource, /data-period="next"/);
  assert.match(dashboardSource, /period === "month"/);
});

test("graph cards keep a single recorder history request and append live data", async () => {
  let requests = 0, query;
  const end=Date.now()-1000;
  const records=[
    { state: "80", attributes: { unit_of_measurement: "W" }, last_updated: new Date(end-60_000).toISOString() },
    { state: "120", attributes: { unit_of_measurement: "W" }, last_updated: new Date(end-10_000).toISOString() },
  ];
  const original=JSON.stringify(records);
  const card = new MaraoCard();
  card.setConfig({ entity: "sensor.power", template: "hc_graph_card", name: "House Power" });
  card.hass = {
    callService() {},
    callApi: async (_method,url) => {
      requests += 1;
      query=url;
      return [records];
    },
    states: { "sensor.power": { state: "125", attributes: { unit_of_measurement: "W" }, last_updated:new Date(end-5_000).toISOString() } },
  };
  await new Promise((resolve) => setImmediate(resolve));
  card.hass = {
    ...card.hass,
    states: { "sensor.power": { state: "130", attributes: { unit_of_measurement: "W" }, last_updated:new Date(end).toISOString() } },
  };

  assert.equal(requests, 1);
  assert.doesNotMatch(query,/no_attributes|minimal_response/,'Energy history must retain each original unit');
  const values=card._graphValues('sensor.power');
  assert.equal(values.error,false);assert.deepEqual(values.values.map(sample=>sample.value),[80,120,125,130]);
  assert.deepEqual(values.values.map(sample=>sample.time),[end-60_000,end-10_000,end-5_000,end]);
  assert.equal(values.values.at(-1).live,true);assert.equal(JSON.stringify(records),original);
  assert.match(card.shadowRoot.innerHTML, /class="graph-background"/);
  assert.match(card.shadowRoot.innerHTML, /<polyline class="line"/);
  assert.match(card.shadowRoot.innerHTML, /130 W/);
  assert.match(source, /history\/period\/\$\{start\.toISOString\(\)\}/);
});

test("graph cards sample full history to a card-scale trace", () => {
  const card = new MaraoCard();
  const now = Date.now();
  card.setConfig({ entity: "sensor.power", template: "hc_graph_card" });
  card.hass = {
    callService() {},
    states: { "sensor.power": { state: "100", attributes: {} } },
  };
  card._graphHistory.set("sensor.power", Array.from({ length: 1_000 }, (_, index) => ({
    state: String(index % 2 ? 1_000 : 0),
    last_updated: new Date(now - (1_000 - index) * 60_000).toISOString(),
  })));
  const markup = card._graphMarkup("sensor.power");
  const points = markup.match(/<polyline class="line" points="([^"]+)"/)?.[1].split(" ") || [];
  assert.ok(points.length <= 240);
  assert.match(markup, /<polygon class="fill"/);
});

test("graph history failures remain readable without repeated requests and recover after reconnect", async () => {
  const card = new MaraoCard();
  card.setConfig({ entity: "sensor.power", template: "hc_graph_card" });
  let requests = 0;
  let reject = true;
  const hass = {
    callService() {},
    states: { "sensor.power": { state: "125", attributes: { unit_of_measurement: "W" } } },
    callApi: async () => { requests += 1; if (reject) throw new Error("history failed"); return []; },
  };
  card.hass = hass;
  assert.match(card.shadowRoot.innerHTML, /data-graph-history-state="loading"/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(card.shadowRoot.innerHTML, /data-graph-history-state="error"/);
  assert.match(card.shadowRoot.innerHTML, /class="problem" role="alert">[\s\S]*History unavailable/);
  assert.match(card.shadowRoot.innerHTML, /data-graph-retry/);
  assert.match(card.shadowRoot.innerHTML, /125 W/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="graph-background"/);
  for (let i = 0; i < 5; i += 1) card.hass = { ...hass };
  assert.equal(requests, 1);
  card.hass = { ...hass, connected: false };
  assert.match(card.shadowRoot.innerHTML, /data-graph-history-state="unavailable"/);
  reject = false;
  card.hass = hass;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 2);
  assert.match(card.shadowRoot.innerHTML, /data-graph-history-state="empty"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /role="alert"/);
});

test("graph history ignores responses after its source becomes neutral or its card detaches", async () => {
  for (const transition of ["unknown", "unavailable", "disconnect", "detach"]) {
    const card = new MaraoCard();
    card.setConfig({ entity: "sensor.power", template: "hc_graph_card" });
    let finish;
    let requests = 0;
    const hass = {
      callService() {},
      states: { "sensor.power": { state: "125", attributes: {} } },
      callApi: () => { requests += 1; return new Promise((resolve) => { finish = resolve; }); },
    };
    card.hass = hass;
    if (transition === "detach") { card.isConnected = false; card.disconnectedCallback(); }
    else card.hass = transition === "disconnect" ? { ...hass, connected: false }
      : { ...hass, states: { "sensor.power": { state: transition, attributes: {} } } };
    finish([[{ state: "125", last_updated: new Date().toISOString() }]]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(card._graphHistory.size, 0, transition);
    assert.equal(requests, 1, transition);
    if (transition !== "detach") {
      assert.doesNotMatch(card.shadowRoot.innerHTML, /class="graph-background"/);
      card.hass = { ...card.hass };
      assert.equal(requests, 1, transition);
    }
    card.isConnected = true;
    card.hass = { ...hass, callApi: async () => [] };
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(card.shadowRoot.innerHTML, /data-graph-history-state="empty"/, transition);
  }
});

test("idle ranges and graph requests detect mutation of Home Assistant's shared connection", async () => {
  const card = new MaraoCard();
  card.setConfig({ entity: "light.main", template: "hc_light_card", variables: { show_graph: true, graph_entity: "sensor.power" } });
  let finish;
  let requests = 0;
  const connection = { connected: true };
  const hass = {
    connected: true, connection, callService() {},
    callApi: () => { requests += 1; return new Promise((resolve) => { finish = resolve; }); },
    states: { "light.main": { state: "on", attributes: { brightness: 128 } }, "sensor.power": { state: "125", attributes: {} } },
  };
  card.hass = hass;
  // The idle-input branch is normally reached through the real shadow DOM.
  card.shadowRoot.querySelector = (selector) => selector === 'input[data-slider-key],.camera-live,.media-artwork img' ? {} : null;
  connection.connected = false;
  card.hass = { ...hass, connected: false };
  assert.match(card.shadowRoot.innerHTML, /type="range"[^>]* disabled/);
  assert.equal(card._graphRequests.size, 0);
  finish([[{ state: "125", last_updated: new Date().toISOString() }]]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(card._graphHistory.size, 0);
  connection.connected = true;
  card.hass = hass;
  assert.doesNotMatch(card.shadowRoot.innerHTML, /type="range"[^>]* disabled/);
  assert.equal(requests, 2);
  card.disconnectedCallback();
});

test("room cards preserve navigation and expose an all-lights-off control", () => {
  const card = new MaraoCard();
  card.setConfig({
    entity: "light.main",
    template: "hc_room_card",
    name: "Living Room",
    icon: "mdi:sofa",
    variables: { light_entities: ["light.main", "light.accent"] },
    tap_action: { action: "navigate", navigation_path: "/marao-dashboard/living-room" },
  });
  card.hass = {
    callService() {},
    states: {
      "light.main": { state: "on", attributes: {} },
      "light.accent": { state: "on", attributes: {} },
    },
  };
  assert.match(card.shadowRoot.innerHTML, /data-room-lights-off/);
  assert.match(card.shadowRoot.innerHTML, /aria-label="Turn off all lights in Living Room"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-room-lights-off[^>]*>[\s\S]*?<span>/);
  assert.match(card.shadowRoot.innerHTML, /class="room-artwork" aria-hidden="true"><ha-icon icon="mdi:sofa"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<div class="icon"/);
  assert.match(source, /\.room-lights-off \{[^}]*width:48px; height:48px;[^}]*border-radius:50%;/);
  assert.match(card.shadowRoot.innerHTML, /icon="mdi:sofa"/);
  assert.match(source, /\.room-lights-off \{[^}]*background:var\(--ha-card-background,var\(--card-background-color\)\); color:var\(--primary-text-color\);/);
  assert.match(source, /\.room-lights-off:disabled \{ opacity:\.6; cursor:default;/);

  card.hass = { ...card.hass, connected: false };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  assert.match(card.shadowRoot.innerHTML, /data-room-lights-off[^>]* disabled/);

  card.hass = {
    ...card.hass,
    states: {
      "light.main": { state: "on", attributes: {} },
      "light.accent": { state: "unavailable", attributes: {} },
    },
  };
  assert.match(card.shadowRoot.innerHTML, /data-room-lights-off[^>]* disabled/);
});

test("room all-lights-off actions target every configured light", async () => {
  const calls = [];
  const lights = ["light.main", "light.accent"];
  await performAction(
    { callService: (...args) => calls.push(args) },
    { action: "call-service", service: "light.turn_off", data: { entity_id: lights } },
    lights[0],
  );
  assert.deepEqual(calls, [["light", "turn_off", { entity_id: lights }, undefined, false]]);
});

test('room lighting uses every unique selected light and ignores an unrelated primary', () => {
  const card = new MaraoCard();
  card._setMarkup = markup => { card.shadowRoot.innerHTML = markup; };
  const colors = {};
  const surface = { classList: { remove() {} }, style: { setProperty(key, value) { colors[key] = value; } } };
  card.shadowRoot.querySelector = selector => selector === 'ha-card' ? surface : null;
  card.setConfig({ template: 'hc_room_card', entity: 'sensor.unrelated', name: 'Bedroom',
    variables: { light_entities: ['light.first', 'light.second', 'light.second', 'sensor.unrelated'] },
    tap_action: { action: 'navigate', navigation_path: '/marao-dashboard/bedroom' } });
  const states = { 'sensor.unrelated': { state: 'unavailable', attributes: {} },
    'light.first': { state: 'off', attributes: {} }, 'light.second': { state: 'on', attributes: {} } };
  card.hass = { callService() {}, states };
  assert.equal(colors['--marao-card-background'], 'var(--room-card-active-background,var(--primary-color))');
  assert.match(card.shadowRoot.innerHTML, /1 active/);
  assert.match(card.shadowRoot.innerHTML, /aria-description="Lighting: 1 active"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<div class="state">|class="binary-cue"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-problem="|data-room-lights-off[^>]* disabled/);
  states['light.second'] = { state: 'off', attributes: {} };
  for (const key of Object.keys(colors)) delete colors[key];
  card.hass = { ...card.hass, states: { ...states } };
  assert.equal(colors['--marao-card-background'], undefined);
  assert.match(card.shadowRoot.innerHTML, /aria-description="Lighting: All off"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<div class="state">|class="binary-cue"/);
  for (const value of ['unknown', 'unavailable', null]) {
    const second = value === null ? undefined : { state: value, attributes: {} };
    card.hass = { ...card.hass, states: { ...states, 'light.second': second } };
    assert.doesNotMatch(card.shadowRoot.innerHTML, /data-problem="|class="problem"/);
    assert.match(card.shadowRoot.innerHTML, /data-room-lights-off[^>]* disabled/);
    assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  }
  card.setConfig({ ...card._config, variables: { light_entities: [] } });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-room-lights-off|binary-cue\"|<div class="state">|data-problem="/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  card.setConfig({ ...card._config, show_icon: false, variables: { light_entities: [], custom_label: 'Reading corner' } });
  assert.match(card.shadowRoot.innerHTML, /<div class="state">Reading corner<\/div>/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="room-artwork"|data-room-lights-off|aria-description="Lighting:/);
  card.setConfig({ ...card._config, tap_action: { action: 'none' }, variables: { light_entities: ['light.first'], custom_label: 'Reading corner' } });
  assert.match(card.shadowRoot.innerHTML, /<ha-card role="group" aria-label="Bedroom" aria-description="Lighting: All off"/);
  assert.match(card.shadowRoot.innerHTML, /<div class="state">Reading corner<\/div>/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action|class="binary-cue"/);
});

test('room child activation dispatches once and rechecks targets without navigating', async () => {
  const previousWindow = globalThis.window;
  const calls = [], haptics = [], routes = [];
  globalThis.window = { dispatchEvent(event) { if (event.type === 'haptic') haptics.push(event.detail); },
    location: { pathname: '/marao-dashboard/rooms' }, history: { pushState(_state, _title, route) { routes.push(route); } } };
  try {
    const card = new MaraoCard();
    let activate;
    const button = { disabled: false, addEventListener(_type, handler) { activate = handler; } };
    card.shadowRoot.querySelector = selector => selector === '[data-room-lights-off]' ? button : null;
    card.setConfig({ template: 'hc_room_card', entity: 'sensor.unrelated', name: 'Bedroom',
      variables: { light_entities: ['light.first', 'light.second', 'light.first'] },
      tap_action: { action: 'navigate', navigation_path: '/marao-dashboard/bedroom' } });
    card.hass = { connected: true, callService: async (...args) => calls.push(args),
      states: { 'light.first': { state: 'off', attributes: {} }, 'light.second': { state: 'on', attributes: {} } } };
    let prevented = 0, stopped = 0;
    const event = { currentTarget: button, preventDefault() { prevented++; }, stopPropagation() { stopped++; } };
    activate(event);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, [['light', 'turn_off', { entity_id: ['light.first', 'light.second'] }, undefined, false]]);
    assert.deepEqual(haptics, ['heavy']);
    assert.deepEqual(routes, []);
    assert.equal(prevented, 1); assert.equal(stopped, 1);
    card._hass.states['light.second'] = { state: 'unavailable', attributes: {} };
    activate(event);
    card._hass = { ...card._hass, connected: false };
    activate(event);
    button.disabled = true;
    card._hass = { ...card._hass, connected: true, states: { 'light.first': { state: 'on' }, 'light.second': { state: 'off' } } };
    activate(event);
    assert.equal(calls.length, 1); assert.equal(haptics.length, 1); assert.deepEqual(routes, []);
    card._hass.connected = false;
    await card._performAction(card._config.tap_action, card._config.entity);
    assert.deepEqual(routes, ['/marao-dashboard/bedroom']);
    assert.equal(calls.length, 1);
  } finally { globalThis.window = previousWindow; }
});

test("toggle graph cards use their toggle availability for control state", () => {
  const card = new MaraoCard();
  card.setConfig({
    entity: "sensor.power",
    template: "hc_toggle_graph_card",
    variables: { toggle_entity: "switch.heater" },
  });
  card.hass = {
    callService() {},
    states: {
      "sensor.power": { state: "unavailable", attributes: {} },
      "switch.heater": { state: "on", attributes: {} },
    },
  };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);

  card.hass = {
    ...card.hass,
    states: {
      "sensor.power": { state: "130", attributes: { unit_of_measurement: "W" } },
      "switch.heater": { state: "unavailable", attributes: {} },
    },
  };
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
});

test("action cards honor icon-only visibility flags", () => {
  const card = new MaraoCard();
  card.setConfig({
    entity: "remote.apple_tv",
    icon: "mdi:chevron-up",
    show_name: false,
    show_state: false,
    show_label: false,
    tap_action: {
      action: "perform-action",
      perform_action: "remote.send_command",
      data: { command: "up" },
    },
  });
  card.hass = { callService() {}, states: { "remote.apple_tv": { state: "on", attributes: { friendly_name: "Apple TV" } } } };

  assert.match(card.shadowRoot.innerHTML, /class="body icon-only"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="title"|class="state"/);
  assert.match(card.shadowRoot.innerHTML, /icon="mdi:chevron-up"/);
  assert.match(card.shadowRoot.innerHTML, /<button class="card-action" type="button" data-card-action aria-label="Up Apple TV" title="Up Apple TV">/);
  assert.match(source, /\.body\.icon-only \{[^}]*display:flex;[^}]*align-items:center;[^}]*justify-content:center;[^}]*gap:0;/);
});

test("title cards render as text-only section headings", () => {
  const card = new MaraoCard();
  card.setConfig({
    template: "hc_title_card",
    name: "Living Room",
    tap_action: { action: "none" },
  });
  card.hass = { states: {} };

  assert.match(card.shadowRoot.innerHTML, /<ha-card class="title-surface">/);
  assert.match(card.shadowRoot.innerHTML, /class="body title-card"/);
  assert.match(card.shadowRoot.innerHTML, /class="title">Living Room/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="state"|class="icon"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action/);
  assert.match(source, /\.body\.title-card \{[^}]*padding:0 0 20px;/);
});

test("slider headers follow family and preserve optional controls and hidden fields", () => {
  const cases = [
    ["hc_light_card", "light.test", { supported_color_modes: ["brightness"], brightness: 128 }, {}, true],
    ["hc_light_card", "light.test", { supported_color_modes: ["brightness"] }, { enable_slider: false }, false],
    ["hc_light_card", "light.test", { supported_color_modes: ["onoff"] }, {}, false],
    ["hc_fan_card", "fan.test", { supported_features: 1, percentage: 50 }, {}, true],
    ["hc_fan_card", "fan.test", { supported_features: 1 }, { enable_slider: false }, false],
    ["hc_fan_card", "fan.test", { supported_features: 0 }, {}, false],
    ["hc_cover_card", "cover.test", { current_position: 50 }, {}, true],
    ["hc_access_slide_action_card", "lock.test", {}, { action_service: "lock.unlock" }, false],
    ["hc_access_action_card", "lock.test", {}, { action_service: "lock.unlock" }, false],
  ];
  for (const [template, entity, attributes, variables, range] of cases) {
    const card = new MaraoCard();
    const config = { template, entity, name: "Long localized title", variables };
    card.setConfig(config);
    card.hass = { states: { [entity]: { state: entity.startsWith("lock.") ? "locked" : "on", attributes } } };
    const markup = () => card.shadowRoot.innerHTML.split("</style>")[1];
    assert.match(markup(), /class="body slider-header/, template);
    assert.equal(markup().includes('type="range"'), range, template);
    if (entity.startsWith("lock.")) {
      assert.match(markup(), /<marao-slide-to-open/);
      assert.doesNotMatch(markup(), /data-card-action/);
    }
    card.setConfig({ ...config, show_icon: false });
    assert.doesNotMatch(markup(), /class="icon"/);
    card.setConfig({ ...config, variables: { ...variables, show_icon: false } });
    assert.doesNotMatch(markup(), /class="icon"/);
    card.setConfig({ ...config, show_name: false, show_state: false, show_label: false });
    assert.match(markup(), /class="body icon-only/);
    assert.doesNotMatch(markup(), /slider-header|class="title"/);
    for (const state of ["unknown", "unavailable"]) {
      card.setConfig(config);
      card.hass = { states: { [entity]: { state, attributes } } };
      assert.match(markup(), /class="body slider-header/);
    }
  }
  for (const template of ["hc_switch_card", "hc_navigation_card", "hc_media_card", "hc_climate_card"]) {
    const card = new MaraoCard();
    card.setConfig({ template, name: "Other family" });
    assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /slider-header/);
  }
});

test("media app shortcuts fill the card with artwork without a visible title", () => {
  const card = new MaraoCard();
  card.setConfig({
    entity: "media_player.apple_tv",
    template: "hc_media_app_card",
    name: "YouTube",
    icon: "mdi:youtube",
    variables: { app_source: "YouTube" },
    tap_action: { action: "call-service", service: "media_player.select_source", data: { source: "YouTube" } },
  });
  card.hass = { callService() {}, states: { "media_player.apple_tv": { state: "idle", attributes: {} } } };

  assert.match(card.shadowRoot.innerHTML, /class="body media-app-card"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<div class="(?:state|title)">/);
  assert.match(card.shadowRoot.innerHTML, /data-card-action aria-label="YouTube"/);
  card.hass = { ...card.hass, states: { "media_player.apple_tv": { state: "unavailable", attributes: {} } } };
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  assert.match(card.shadowRoot.innerHTML, /class="problem"/);
  const unnamed = { ...card._config }; delete unnamed.name;
  card.setConfig(unnamed);
  assert.match(card.shadowRoot.innerHTML, /data-card-action aria-label="YouTube"/);
});

test("media app branding recognizes sources, ships real icons and preserves custom shortcuts", async () => {
  for (const [source, id, extension = "png"] of [["NETFLIX", "netflix", "svg"], ["Spotify", "spotify", "svg"], ["com.google.ios.youtube", "youtube"], ["Disney+", "disney-plus"], ["Amazon Prime Video", "prime-video"], ["com.apple.TVWatchList", "apple-tv"], ["Plex", "plex"], ["MEO", "meo", "svg"], ["meo go", "meo", "svg"], ["pt.sapo.mobile.iphone.tmn.meomobile", "meo", "svg"]]) {
    const config = { template: "hc_media_app_card", entity: "media_player.apple_tv", name: "My app", icon: "mdi:play-box-outline", show_state: false, variables: { app_source: source } };
    const before = structuredClone(config);
    assert.equal(mediaAppBrand(config).id, id);
    const card = new MaraoCard();
    card.setConfig(config);
    card.hass = { states: { "media_player.apple_tv": { state: "idle", attributes: {} } } };
    assert.match(card.shadowRoot.innerHTML, new RegExp(`<img class="app-icon(?: app-symbol)?" src="[^"]*/media-apps/${id}\\.${extension}"`));
    assert.doesNotMatch(card.shadowRoot.innerHTML, /<div class="title">/);
    const bytes = await fs.readFile(new URL(`../../custom_components/marao_dashboard/frontend/media-apps/${id}.${extension}`, import.meta.url));
    if (extension === "svg") assert.match(bytes.toString(), /<svg\b[^>]+viewBox=/);
    else assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.ok(stateAppearance("hc_media_app_card", "idle", config).background);
    assert.deepEqual(stateAppearance("hc_media_app_card", "unavailable", config), { unavailable: true });
    assert.deepEqual(config, before);
  }
  const custom = { template: "hc_media_app_card", name: "Netflix", icon: "mdi:television", variables: { app_source: "My private app" } };
  assert.equal(mediaAppBrand(custom), undefined, "The actual source takes priority over a nickname");
  const card = new MaraoCard(); card.setConfig(custom);
  assert.match(card.shadowRoot.innerHTML, /<ha-icon icon="mdi:television"/);
  assert.equal(stateAppearance("hc_media_app_card", "idle", { variables: { app_source: "Netflix", active_color: "#123456" } }).background, "#123456");
});

test("wallbox current card uses a large stepper and optional shortcuts", () => {
  const calls = [];
  const card = new MaraoCard();
  card.setConfig({
    entity: "input_number.wallbox_current",
    template: "hc_wallbox_current_card",
    name: "Charging Current",
    variables: { shortcuts: [6, 12, 16, 20] },
  });
  card.hass = {
    callService: (...args) => calls.push(args),
    states: { "input_number.wallbox_current": { state: "22", attributes: { unit_of_measurement: "A" } } },
  };
  assert.equal((card.shadowRoot.innerHTML.match(/data-current-shortcut=/g) || []).length, 3);
  assert.match(card.shadowRoot.innerHTML, /class="number-stepper wallbox-stepper"/);
  assert.match(card.shadowRoot.innerHTML, />22 A<\/output>/);
  assert.match(card.shadowRoot.innerHTML, /data-current-shortcut="12"/);
  assert.deepEqual(stateAppearance("hc_wallbox_current_card", "10", {}, card.hass), {
    background: "var(--ha-card-background,var(--card-background-color))",
    text: "var(--primary-text-color)",
    icon: "var(--primary-text-color)",
    accent: "var(--primary-color)",
    unavailable: false,
  });
  assert.match(card.shadowRoot.innerHTML, /<output class="number-value wallbox-value"[^>]*>22 A<\/output><div class="number-stepper wallbox-stepper"/);
  assert.match(source, /\.number-stepper \{[^}]*min-width:84px;[^}]*width:auto;/);
  assert.match(source, /\.body\.wallbox-card \{[^}]*grid-template-areas:'value icon' 'title icon'/);
  assert.doesNotMatch(source, /\.climate-stepper \{[^}]*min-width:/);
  assert.match(source, /\.wallbox-stepper \{[^}]*background:var\(--ha-card-background,var\(--card-background-color,#fff\)\);[^}]*color:var\(--primary-text-color,#141414\);/);
  assert.match(source, /\.wallbox-shortcuts \{[^}]*pointer-events:auto;/);
  assert.match(source, /\.wallbox-shortcuts button \{[^}]*background:var\(--opacity-contrast-100,color-mix\(in srgb,currentColor 14%,transparent\)\);[^}]*color:var\(--primary-text-color,#141414\);/);
  return card._setNumberValue("input_number.wallbox_current", 12).then(() => {
    assert.deepEqual(calls, [["input_number", "set_value", { entity_id: "input_number.wallbox_current", value: 12 }, undefined, false]]);
  });
});

test("climate and Wallbox cards share the same minimum stepper width", () => {
  const climate = new MaraoCard();
  climate.setConfig({ entity: "climate.test", template: "hc_climate_card" });
  climate.hass = {
    callService() {},
    states: {
      "climate.test": {
        state: "heat",
        attributes: { temperature: 22, current_temperature: 20, hvac_modes: ["heat"] },
      },
    },
  };
  assert.match(climate.shadowRoot.innerHTML, /class="number-stepper climate-stepper"/);
  assert.match(climate.shadowRoot.innerHTML, />22<\/output>/);
});

test("scene cards render the actual option count and authoritative selection", () => {
  const card = new MaraoCard();
  card.setConfig({ entity: "input_select.scene", template: "hc_scene_card", name: "Room scene" });
  for (let count = 1; count <= 5; count += 1) {
    const options = ["Relax", "Movie & Night", "Dinner", "Away", "Off"].slice(0, count);
    card.hass = {
      callService() {},
      states: { "input_select.scene": { state: "Relax", attributes: { options } } },
    };
    const markup = card.shadowRoot.innerHTML.split("</style>")[1];
    assert.equal((markup.match(/data-scene-option=/g) || []).length, count);
    assert.match(markup, /data-scene-option="Relax" aria-pressed="true"/);
    assert.doesNotMatch(markup, /data-card-action/);
    if (count > 1) assert.match(markup, /data-scene-option="Movie &amp; Night" aria-pressed="false"/);
  }
  assert.match(source, /\.scene-options button \{[^}]*min-width:48px; min-height:48px;[^}]*overflow-wrap:anywhere/);
  assert.match(source, /\.scene-options button \{[^}]*font-size:var\(--font-size-secondary,1rem\); font-weight:var\(--font-weight-secondary,500\);/);
  assert.match(source, /@container marao-card \(max-width:190px\) \{ \.scene-options \{ grid-template-columns:minmax\(0,1fr\);/);
});

test("scene option activation dispatches once and preserves state until HA responds", async () => {
  const calls = [];
  const card = new MaraoCard();
  const entity = "input_select.scene";
  card.setConfig({ entity, template: "hc_scene_card" });
  card.hass = {
    callService: (...args) => calls.push(args),
    states: { [entity]: { state: "Relax", attributes: { options: ["Relax", "Movie"] } } },
  };
  const button = new EventTarget();
  button.getAttribute = () => "Movie";
  card.shadowRoot.querySelectorAll = (selector) => selector === "[data-scene-option]" ? [button] : [];
  card._render();
  button.dispatchEvent(new Event("click", { bubbles: true }));
  assert.deepEqual(calls, [["input_select", "select_option", { entity_id: entity, option: "Movie" }, undefined, false]]);
  assert.match(card.shadowRoot.innerHTML, /data-scene-option="Relax" aria-pressed="true"/);
  card.shadowRoot.querySelectorAll = () => [];
  card.hass = { ...card.hass, states: { [entity]: { state: "Movie", attributes: { options: ["Relax", "Movie"] } } } };
  assert.match(card.shadowRoot.innerHTML, /data-scene-option="Movie" aria-pressed="true"/);

  await card._selectSceneOption(entity, "Missing option");
  for (const state of ["unknown", "unavailable"]) {
    card.hass = { ...card.hass, states: { [entity]: { state, attributes: { options: ["Relax", "Movie"] } } } };
    assert.match(card.shadowRoot.innerHTML, /data-scene-option="Movie" aria-pressed="false" disabled/);
    await card._selectSceneOption(entity, "Movie");
  }
  card.hass = { ...card.hass, connected: false, states: { [entity]: { state: "Relax", attributes: { options: ["Relax", "Movie"] } } } };
  assert.match(card.shadowRoot.innerHTML, /data-scene-option="Movie" aria-pressed="false" disabled/);
  await card._selectSceneOption(entity, "Movie");
  assert.equal(calls.length, 1);
});

test("native select scene failures use the shared readable error notification", async () => {
  const previousDocument = globalThis.document;
  const target = new EventTarget();
  let message;
  target.addEventListener("hass-notification", (event) => { message = event.detail.message; });
  globalThis.document = { querySelector: () => target };
  try {
    const card = new MaraoCard();
    card.setConfig({ entity: "select.scene", template: "hc_scene_card" });
    card.hass = {
      callService: async (domain, service, data) => {
        assert.equal(domain, "select");
        assert.equal(service, "select_option");
        assert.deepEqual(data, { entity_id: "select.scene", option: "Movie" });
        throw new Error("Selection refused");
      },
      states: { "select.scene": { state: "Relax", attributes: { options: ["Relax", "Movie"] } } },
    };
    await assert.doesNotReject(() => card._selectSceneOption("select.scene", "Movie"));
    assert.match(message, /Selection refused/);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("loading, unknown, and unavailable states stay distinct and disabled", () => {
  const card = new MaraoCard();
  card.setConfig({ entity: "light.test", template: "hc_light_card" });
  assert.match(card.shadowRoot.innerHTML, /<div class="state">Loading…<\/div>/);
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);

  card.hass = { callService() {}, states: {} };
  assert.match(card.shadowRoot.innerHTML, /data-problem="neutral"[^>]*>[\s\S]*Entity missing/);
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);

  card.hass = { callService() {}, states: { "light.test": { state: "unavailable", attributes: {} } } };
  assert.match(card.shadowRoot.innerHTML, /data-problem="neutral"[^>]*>[\s\S]*Unavailable/);
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
});

test("access actions use tap or a cancellable 1.2 second hold as configured", () => {
  const safe = new MaraoCard();
  safe.setConfig({ entity: "lock.test", name: "Lock", template: "hc_access_action_card", variables: { action_service: "lock.lock" } });
  safe.hass = { callService() {}, states: { "lock.test": { state: "unlocked", attributes: {} } } };
  const safeMarkup = safe.shadowRoot.innerHTML.split("</style>")[1];
  assert.match(safeMarkup, /data-card-action/);
  assert.doesNotMatch(safeMarkup, /data-hold-action|class="hold-progress"/);

  const held = new MaraoCard();
  held.setConfig({ entity: "lock.test", name: "Lock", template: "hc_access_hold_action_card", variables: { action_service: "lock.lock" } });
  held.hass = { callService() {}, states: { "lock.test": { state: "unlocked", attributes: {} } } };
  const heldMarkup = held.shadowRoot.innerHTML.split("</style>")[1];
  assert.match(heldMarkup, /data-card-action data-hold-action aria-label="Hold to Lock"/);
  assert.match(heldMarkup, /class="hold-progress"/);
  assert.match(heldMarkup, /<div class="climate">Hold to Lock<\/div>/);
  assert.match(source, /\["pointerup", "pointerleave", "pointercancel"\]/);
  assert.match(source, /\}, ACCESS_HOLD_MS\);/);
  assert.match(source, /this\._holdCompleted = false;\s+haptic\("heavy"\);/);
  assert.match(source, /variables\?\.action_label_key/);
});

test("hold completion runs once while release, departure, and cancellation stop it", () => {
  const original = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  let scheduled;
  let delay;
  globalThis.setTimeout = (callback, timeout) => { scheduled = callback; delay = timeout; return 1; };
  globalThis.clearTimeout = () => { scheduled = null; };
  globalThis.requestAnimationFrame = () => 2;
  globalThis.cancelAnimationFrame = () => {};
  try {
    const card = new MaraoCard();
    const button = new EventTarget();
    button.disabled = false;
    button.getBoundingClientRect = () => ({ left: 0, right: 100, top: 0, bottom: 100 });
    const surface = { classList: { add() {}, remove() {} }, querySelector: selector => selector === ".hold-progress rect" ? progressLine : null };
    const progressLine = { style: {} };
    card.shadowRoot.querySelector = (selector) => selector === ".hold-progress rect" ? progressLine : null;
    let completions = 0;
    card._bindHoldAction(button, surface, () => { completions += 1; });

    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    assert.equal(delay, ACCESS_HOLD_MS);
    assert.equal(progressLine.style.strokeDashoffset, "100");
    assert.equal(progressLine.style.opacity, "0", "idle hold has no stray stroke");
    card._setHoldProgress(25);
    assert.equal(progressLine.style.strokeDashoffset, "75");
    assert.equal(progressLine.style.opacity, "1", "active progress stays visible");
    const complete = scheduled;
    complete();
    complete();
    assert.equal(completions, 1);
    assert.equal(progressLine.style.strokeDashoffset, "0");
    button.dispatchEvent(pointerEvent("pointerup"));
    assert.equal(progressLine.style.strokeDashoffset, "100");
    assert.equal(progressLine.style.opacity, "0");

    for (const eventName of ["pointerup", "pointerleave", "pointercancel"]) {
      button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
      assert.equal(typeof scheduled, "function");
      card._setHoldProgress(50);
      button.dispatchEvent(pointerEvent(eventName));
      assert.equal(scheduled, null, eventName);
      assert.equal(progressLine.style.strokeDashoffset, "100", eventName);
    }
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    button.dispatchEvent(pointerEvent("pointermove", { clientX: 101, clientY: 50 }));
    assert.equal(scheduled, null);
    assert.equal(completions, 1);
  } finally {
    Object.assign(globalThis, original);
  }
});

test("active holds survive unrelated HA updates but cancel when their target or lifecycle changes", () => {
  const original = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  let scheduled;
  globalThis.setTimeout = (callback) => { scheduled = callback; return 1; };
  globalThis.clearTimeout = () => { scheduled = null; };
  globalThis.requestAnimationFrame = () => 2;
  globalThis.cancelAnimationFrame = () => {};
  try {
    const card = new MaraoCard();
    const entity = "alarm_control_panel.test";
    const state = { state: "disarmed", attributes: {} };
    const config = { entity, template: "hc_access_hold_action_card", variables: { action_service: "alarm_control_panel.alarm_arm_away" } };
    const calls = [];
    const hass = { connected: true, callService: (...args) => { calls.push(args); }, states: { [entity]: state } };
    card.setConfig(config);
    card.hass = hass;
    const button = new EventTarget();
    button.disabled = false;
    card._bindHoldAction(button, null, () => performAction(card.hass, { action: "call-service", service: config.variables.action_service }, entity));
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    const complete = scheduled;
    card.shadowRoot.innerHTML = "pressed control";
    card.hass = { ...hass, states: { ...hass.states, "sensor.other": { state: "42" } } };
    assert.equal(card.shadowRoot.innerHTML, "pressed control");
    assert.equal(scheduled, complete);
    assert.equal(card._holdActive, true);
    complete();
    complete();
    assert.deepEqual(calls, [["alarm_control_panel", "alarm_arm_away", { entity_id: entity }, undefined, false]]);
    button.dispatchEvent(pointerEvent("pointerup"));

    const invalidations = {
      changed: () => { card.hass = { ...hass, states: { [entity]: { ...state, state: "armed_away" } } }; },
      unavailable: () => { card.hass = { ...hass, states: { [entity]: { ...state, state: "unavailable" } } }; },
      unknown: () => { card.hass = { ...hass, states: { [entity]: { ...state, state: "unknown" } } }; },
      missing: () => { card.hass = { ...hass, states: {} }; },
      disconnected: () => { card.hass = { ...hass, connection: { connected: false } }; },
      offline: () => { card.hass = { ...hass, connected: false }; },
      configuration: () => card.setConfig({ ...config, name: "Changed action" }),
      removal: () => card.disconnectedCallback(),
    };
    for (const [reason, invalidate] of Object.entries(invalidations)) {
      card.hass = hass;
      button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
      const cancelledCompletion = scheduled;
      invalidate();
      assert.equal(scheduled, null, reason);
      assert.equal(card._holdActive, false, reason);
      cancelledCompletion();
      assert.equal(calls.length, 1, reason);
    }
  } finally {
    Object.assign(globalThis, original);
  }
});

test("popup owns an inert background, trapped focus, and a 48px close button", () => {
  assert.match(source, /for \(const \{ element \} of this\._backgroundState\) element\.inert = true/);
  assert.match(source, /event\.key === "Tab"\) this\._trapFocus\(event\)/);
  assert.match(source, /\.marao-popup-close\{flex:0 0 48px;width:48px;height:48px/);
  assert.match(source, /\.marao-popup-content\{[^}]*isolation:isolate/);
  assert.doesNotMatch(source, /focus-visible/);
});

test("popup headings use the configured name while respecting explicit titles and climate mode sheets", () => {
  const previous = { document: globalThis.document, window: globalThis.window };
  const close = new EventTarget();
  close.focus = () => {};
  const overlay = popupOverlay(close);
  globalThis.document = { querySelectorAll: () => [], createElement: () => overlay, body: { children: [], append() {} } };
  globalThis.window = { location: { hash: "#lights" } };
  try {
    for (const [config, heading] of [
      [{ name: "Lights" }, "Lights"],
      [{ name: "Lights", title: "Room lights" }, "Room lights"],
      [{ name: "Lights", title: "" }, ""],
      [{ name: "Climate", cards: [{ template: "hc_climate_card", variables: { show_mode_buttons: true } }] }, ""],
    ]) {
      const popup = new MaraoPopupCard();
      popup._config = config;
      overlay.header.height = 80;
      popup._openSheet();
      assert.ok(overlay.innerHTML.includes(`<h2>${heading}</h2>`));
      assert.equal(overlay.style.getPropertyValue('--marao-popup-header-height'), '80px');
      const observer = popup._headerObserver;
      overlay.header.height = 112; observer.callback();
      assert.equal(overlay.style.getPropertyValue('--marao-popup-header-height'), '112px', 'Pinned controls follow a wrapped header');
      popup._close(false);
      assert.equal(observer.disconnected, true);
    }
  } finally { Object.assign(globalThis, previous); }
});

test("popups inherit native Home Assistant context while blocking and restoring the background", () => {
  const previous = { document: globalThis.document, window: globalThis.window };
  const close = new EventTarget(); close.focus = () => {};
  const overlay = popupOverlay(close);
  const background = { inert: false };
  const external = { inert: true };
  const app = { inert: false };
  const root = { host: app, children: [background], append(element) { this.children.push(element); } };
  app.shadowRoot = root;
  globalThis.document = { querySelector: () => app, querySelectorAll: () => [], createElement: () => overlay, body: { children: [app, external], append() { throw new Error("Popup escaped the native context provider."); } } };
  globalThis.window = { location: { hash: "#lights" } };
  try {
    const popup = new MaraoPopupCard(); popup._config = { name: "Lights" }; popup._openSheet();
    assert.equal(root.children.at(-1), overlay);
    assert.equal(app.inert, false, "the popup's ancestor must remain interactive");
    assert.equal(background.inert, true);
    popup._close(false);
    assert.equal(background.inert, false);
    assert.equal(external.inert, true, "preserve an existing inert state");
  } finally { Object.assign(globalThis, previous); }
});

test("popup locks dashboard scroll ancestors and restores their exact overflow settings", () => {
  const previousDocument = globalThis.document;
  const previousComputedStyle = globalThis.getComputedStyle;
  const scroller = (value = '', priority = '') => ({
    scrollHeight: 600, clientHeight: 600, overflowY: 'auto',
    style: {
      value, priority,
      getPropertyValue() { return this.value; },
      getPropertyPriority() { return this.priority; },
      setProperty(name, next, importance) { assert.equal(name, 'overflow-y'); this.value = next; this.priority = importance; },
      removeProperty(name) { assert.equal(name, 'overflow-y'); this.value = ''; this.priority = ''; },
    },
  });
  const page = scroller('auto', 'important');
  const dashboard = scroller('scroll');
  const shell = scroller();
  const layout = scroller(); layout.overflowY = 'visible'; layout.scrollHeight = 1200;
  shell.parentElement = page;
  const view = { getRootNode: () => ({ host: dashboard }) };
  dashboard.getRootNode = () => ({ host: layout });
  layout.parentElement = shell;
  const overlay = {};
  const root = { children: [dashboard, overlay] };
  globalThis.document = { body: root, scrollingElement: page };
  globalThis.getComputedStyle = element => ({ overflowY: element.overflowY });
  try {
    const popup = new MaraoPopupCard(); popup._viewOwner = { view };
    popup._setBackgroundInert(overlay, root);
    for (const element of [page, dashboard, shell]) {
      assert.equal(element.style.value, 'hidden');
      assert.equal(element.style.priority, 'important');
    }
    assert.equal(view.style, undefined, 'popup content is not part of the background scroll lock');
    assert.equal(layout.style.value, '', 'visible-overflow layout ancestors must not be clipped or collapse the dashboard');
    popup._restoreBackground();
    assert.equal(dashboard.inert, false);
    assert.deepEqual([page.style.value, page.style.priority], ['auto', 'important']);
    assert.deepEqual([dashboard.style.value, dashboard.style.priority], ['scroll', '']);
    assert.deepEqual([shell.style.value, shell.style.priority], ['', '']);
    assert.equal(popup._backgroundScrollState.length, 0);
  } finally { globalThis.document = previousDocument; globalThis.getComputedStyle = previousComputedStyle; }
});

test("popup freezes the document at its current offset and restores exact body styles on close", () => {
  const previous = { document: globalThis.document, window: globalThis.window };
  const values = new Map([['position', ['relative', 'important']], ['top', ['3px', '']]]);
  const body = { children: [], style: {
    getPropertyValue: property => values.get(property)?.[0] || '',
    getPropertyPriority: property => values.get(property)?.[1] || '',
    setProperty: (property, value, priority) => values.set(property, [value, priority]),
    removeProperty: property => values.delete(property),
  } };
  const restored = [];
  globalThis.document = { body };
  globalThis.window = { scrollX: 24, scrollY: 380, scrollTo: options => restored.push(options) };
  try {
    const popup = new MaraoPopupCard();
    popup._setBackgroundInert({}, body);
    assert.deepEqual([...values], [
      ['position', ['fixed', 'important']], ['top', ['-380px', 'important']],
      ['left', ['-24px', 'important']], ['width', ['100%', 'important']],
    ]);
    popup._restoreBackground();
    assert.deepEqual([...values], [['position', ['relative', 'important']], ['top', ['3px', '']]]);
    assert.deepEqual(restored, [{ left: 24, top: 380, behavior: 'instant' }]);
    popup._restoreBackground();
    assert.equal(restored.length, 1, 'cleanup must not move the page again');
  } finally { Object.assign(globalThis, previous); }
});

test("popup replacement preserves the original opener and installs inert state after closing the old sheet", () => {
  const previous = { document: globalThis.document, window: globalThis.window, ResizeObserver: globalThis.ResizeObserver };
  const close = new EventTarget(); close.focus = () => {};
  const background = { inert: false };
  const root = { children: [background], append(element) { this.children.push(element); } };
  const popups = [new MaraoPopupCard(), new MaraoPopupCard()];
  const view = { shadowRoot: { querySelector: () => null, querySelectorAll: selector => selector === 'marao-popup-card' ? popups : [] } };
  let restored = 0;
  globalThis.document = { querySelectorAll: () => [], createElement: () => {
    const overlay = popupOverlay(close);
    overlay.remove = () => root.children.splice(root.children.indexOf(overlay), 1);
    return overlay;
  }, body: root };
  globalThis.window = { location: { pathname: '/marao-dashboard/card-test', hash: '#child' } };
  try {
    for (const firstListener of [0, 1]) {
      const [parent, child] = popups;
      for (const [index, popup] of popups.entries()) {
        popup._config = { hash: index ? '#child' : '#group' };
        popup._viewOwner = { view }; popup._viewPath = window.location.pathname;
        popup.isConnected = true;
        popup._renderChildren = () => {}; popup._columnObserver = null;
      }
      // Geometry observation is independent of the focus handoff under test.
      globalThis.ResizeObserver = class { observe() {} disconnect() {} };
      parent._open = true; parent._focus = () => { restored += 1; };
      parent._overlay = document.createElement('div'); root.append(parent._overlay);
      parent._setBackgroundInert(parent._overlay, root);
      popups[firstListener]._sync(); popups[1 - firstListener]._sync();
      assert.equal(parent._open, false);
      assert.equal(child._open, true);
      assert.equal(root.children.length, 2, 'only the new overlay remains');
      assert.equal(background.inert, true, 'the new popup keeps the background inert');
      assert.equal(restored, firstListener, 'replacement must not restore focus behind the new popup');
      child._close(false);
      assert.equal(restored, firstListener + 1);
      assert.equal(background.inert, false);
    }
  } finally { Object.assign(globalThis, previous); }
});

test("popup URLs open after attachment and reopen after a native remount", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { location: { hash: "#lights" }, addEventListener() {}, removeEventListener() {} };
  try {
    const popup = new MaraoPopupCard();
    let opened = 0;
    popup._openSheet = () => { opened += 1; };
    popup._close = () => {};
    popup.isConnected = false;
    popup.setConfig({ hash: "#lights" });
    assert.equal(opened, 0, "detached helper cards must not open an overlay");
    popup.isConnected = true;
    popup.connectedCallback();
    assert.equal(opened, 1, "the current popup URL opens on attachment");
    popup.isConnected = false;
    popup.disconnectedCallback();
    popup.isConnected = true;
    popup.connectedCallback();
    assert.equal(opened, 2, "a remount restores the matching popup");
  } finally { globalThis.window = previousWindow; }
});

test("closing a directly linked popup clears only its hash and keeps the dashboard page", () => {
  const previousWindow = globalThis.window;
  let destination;
  globalThis.window = {
    location: { hash: "#lights", pathname: "/marao-dashboard/overview", search: "?preview=1" },
    history: { replaceState(_state, _title, url) { destination = url; }, back() { throw new Error("Closing a direct link must not navigate back."); } },
    dispatchEvent() {},
  };
  try {
    const popup = new MaraoPopupCard();
    popup._config = { hash: "#lights" };
    popup._open = true;
    popup._overlay = { remove() {} };
    popup._close(true);
    assert.equal(destination, "/marao-dashboard/overview?preview=1");
    assert.equal(popup._open, false);
  } finally { globalThis.window = previousWindow; }
});

test("glance readings show names, values and units independently of missing entities", () => {
  const card = new MaraoCard();
  card.setConfig({ template: "hc_glance_card", variables: {
    entity1: "sensor.temperature", entity1_name: "Temperature", entity1_icon: "mdi:thermometer",
    entity2: "sensor.missing", entity2_name: "Humidity",
    entity3: "sensor.power", entity3_name: "Power",
  } });
  card.hass = { states: {
    "sensor.temperature": { state: "21", attributes: { unit_of_measurement: "°C" } },
    "sensor.power": { state: "120", attributes: { unit_of_measurement: "W" } },
  } };
  const markup = card.shadowRoot.innerHTML.split("</style>")[1];
  assert.match(markup, /<dt>Temperature<\/dt><dd>21 °C<\/dd>/);
  assert.match(markup, /<dt>Humidity<\/dt><dd>unknown<\/dd>/);
  assert.match(markup, /<dt>Power<\/dt><dd>120 W<\/dd>/);
  assert.doesNotMatch(markup, /hc_glance_card|aria-disabled="true"/);
});

test("state labels use native domain translations and preserve unitless climate values", () => {
  const formatted = [];
  const hass = { states: {}, formatEntityState: (state) => { formatted.push(state.entity_id); return state.entity_id.startsWith("weather.") ? "Ensolarado" : "21 °C"; } };
  const card = new MaraoCard();
  card.setConfig({ entity: "sensor.weather", template: "hc_weather_card" });
  card.hass = { ...hass, states: { "sensor.weather": { state: "sunny", attributes: {} } } };
  assert.match(card.shadowRoot.innerHTML, /<div class="state">Ensolarado<\/div>/);
  assert.deepEqual(formatted, ["weather.weather"]);
  card.setConfig({ entity: "climate.room", template: "hc_climate_card" });
  card.hass = { ...hass, states: { "climate.room": { state: "heat", attributes: { temperature: 22, current_temperature: 21, unit_of_measurement: "°C" } } } };
  assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /°C/);
});

test("configured weather, header, dishwasher and camera details reach the visible card", () => {
  const states = {
    "sensor.weather": { state: "sunny", attributes: { temperature: 21, temperature_unit: "°C", forecast: [{ datetime: "2026-10-10T12:00:00Z", condition: "cloudy", temperature: 22, templow: 14 }] } },
    "sensor.person": { state: "home", attributes: { friendly_name: "Person" } },
    "sensor.progress": { state: "40", attributes: { unit_of_measurement: "%" } },
    "sensor.dishwasher": { state: "run", attributes: {} },
    "camera.front": { state: "idle", attributes: { entity_picture: "/synthetic-camera.svg" } },
  };
  const card = new MaraoCard();
  card.hass = { states, language: "en" };
  card.setConfig({ entity: "sensor.weather", template: "hc_weather_card" });
  assert.match(card.shadowRoot.innerHTML, /14 °C–22 °C/);
  card.setConfig({ entity: "sensor.weather", template: "hc_weather_card", variables: { show_forecast: false } });
  assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /14 °C–22 °C/);
  card.setConfig({ entity: "sensor.weather", template: "hc_header_card", variables: { person_entity: "sensor.person" } });
  assert.match(card.shadowRoot.innerHTML, /<dt>Person<\/dt><dd>home<\/dd>/);
  assert.match(card.shadowRoot.innerHTML, new RegExp(new Date().getFullYear()));
  card.setConfig({ entity: "sensor.dishwasher", template: "hc_dishwasher_card", variables: { progress_entity: "sensor.progress" } });
  assert.match(card.shadowRoot.innerHTML, /40 %/);
  card.setConfig({ entity: "camera.front", template: "hc_camera_card" });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<img class="camera"/); // Native camera is mounted only when connected; browser harness covers playback.
  for (const state of ["unknown", "unavailable"]) {
    card.hass = { states: { ...states, "camera.front": { state, attributes: states["camera.front"].attributes } } };
    assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /<img /);
  }
  card.hass = { states, connected: false };
  assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /<img /);
  card.hass = { states, connection: { connected: false } };
  assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /<img /);
});

test("media artwork and summary respect the configured opt-out and neutral states", () => {
  const attributes = { entity_picture: "/synthetic-art.svg", media_title: "Test programme", media_artist: "Test artist" };
  const card = new MaraoCard();
  card.setConfig({ entity: "media_player.audio", template: "hc_media_card" });
  card.hass = { states: { "media_player.audio": { state: "playing", attributes } } };
  const markup = () => card.shadowRoot.innerHTML.split("</style>")[1];
  assert.match(markup(), /class="media-artwork"/);
  assert.match(markup(), /Test programme · Test artist/);
  card.setConfig({ entity: "media_player.audio", template: "hc_media_card", variables: { hc_show_background_art: false, hc_background_color: "var(--color-blue)" } });
  assert.doesNotMatch(markup(), /class="media-artwork"/);
  assert.match(markup(), /Test programme · Test artist/);
  assert.equal(stateAppearance("hc_media_card", "playing", card._config).background, "var(--color-blue)");
  card.setConfig({ entity: "media_player.audio", template: "hc_media_card" });
  for (const state of ["off", "unknown", "unavailable"]) {
    card.hass = { states: { "media_player.audio": { state, attributes } } };
    assert.doesNotMatch(markup(), /class="media-artwork"|Test programme/);
    assert.equal(stateAppearance("hc_media_card", state, card._config).background, undefined);
  }
  for (const connection of [{ connected: false }, { connection: { connected: false } }]) {
    card.hass = { states: { "media_player.audio": { state: "playing", attributes } }, ...connection };
    assert.doesNotMatch(markup(), /class="media-artwork"|Test programme/);
  }
});

test("navigation without a primary entity remains available when entity services disconnect", () => {
  const card = new MaraoCard();
  card.setConfig({ template: "hc_navigation_card", name: "Rooms", tap_action: { action: "navigate", navigation_path: "/marao-dashboard/rooms" } });
  card.hass = { states: {}, connected: false };
  const markup = card.shadowRoot.innerHTML.split("</style>")[1];
  assert.match(markup, /data-card-action/);
  assert.doesNotMatch(markup, / disabled|class="state"/);
});

test("popup restores its original control or the live replacement after HA rerenders", () => {
  const previous = { document: globalThis.document, window: globalThis.window };
  try {
    for (const replaced of [false, true]) for (const attributes of [
      { "data-card-action": "", "aria-label": "Open climate" },
      { "aria-label": "Energy history" },
    ]) {
      const root = { activeElement: null, querySelectorAll: () => controls };
      const host = { shadowRoot: root };
      const control = (attrs) => ({
        localName: "button", isConnected: true,
        getRootNode: () => root,
        getAttributeNames: () => Object.keys(attrs),
        getAttribute: (name) => attrs[name] ?? null,
        focus() { root.activeElement = this; document.activeElement = host; },
      });
      const original = control(attributes);
      const replacement = control(attributes);
      let controls = [replacement, original];
      const close = new EventTarget();
      close.focus = () => { root.activeElement = null; document.activeElement = close; };
      const overlay = popupOverlay(close);
      globalThis.document = {
        activeElement: host, querySelectorAll: () => [],
        createElement: () => overlay,
        body: { children: [], append() {} },
      };
      globalThis.window = { location: { hash: "#climate" } };
      original.focus();
      const popup = new MaraoPopupCard();
      popup._openSheet();
      assert.equal(document.activeElement, close, "focus enters the popup");
      if (replaced) {
        original.isConnected = false;
        controls = [control({ "aria-label": "Unrelated action" }), replacement];
      }
      popup._close(false);
      assert.equal(root.activeElement, replaced ? replacement : original);
    }
  } finally {
    Object.assign(globalThis, previous);
  }
});

test("popup preserves child cards while forwarding Home Assistant state updates", () => {
  const popup = new MaraoPopupCard();
  let updates = 0, themes = 0;
  popup._updateChildrenHass = () => updates++;
  popup._syncTheme = () => themes++;
  const hass = { states: {} }; popup.hass = hass;
  assert.equal(popup._hass, hass);
  assert.equal(updates, 1);
  assert.equal(themes, 1);
  assert.match(source, /for \(const card of host\?\.children \|\| \[\]\) card\.hass = this\._hass/);
  assert.doesNotMatch(source, /set hass\(value\) \{ this\._hass = value; this\._renderChildren\(\); \}/);
});

test('live group filtering retains eligible nodes, cancels removed controls and relocates focus', async () => {
  const previousDocument = globalThis.document;
  const host = { children: [], insertions: 0,
    append(card) { this.insertBefore(card, null); },
    insertBefore(card, before) { this.insertions++; this.children = this.children.filter(item => item !== card); const index = before ? this.children.indexOf(before) : this.children.length; this.children.splice(index, 0, card); card.isConnected = true; },
  };
  const node = () => ({ isConnected: false, setAttribute() {}, contains(active) { return active === this.control; },
    remove() { this.cancelled = true; this.isConnected = false; host.children = host.children.filter(item => item !== this); } });
  const close = { getRootNode: () => ({}), focus() { globalThis.document.activeElement = this; } };
  globalThis.document = { activeElement: null, createElement: node };
  try {
    const popup = new MaraoPopupCard();
    popup._config = { entity_group: { entity_type: 'light', popup_filter: 'active', entities: ['light.first', 'light.second'] },
      cards: [{ entity: 'light.first' }, { entity: 'light.second' }] };
    popup._overlay = { querySelector: selector => selector === '.marao-popup-content' ? host : close };
    popup._groupChildren = new Map(); popup._groupHelpers = { createCardElement: node };
    popup.hass = { states: { 'light.first': { state: 'on' }, 'light.second': { state: 'on' } } };
    const [first, second] = host.children; const insertions = host.insertions;
    second.control = { getRootNode: () => ({ host: second }) };
    globalThis.document.activeElement = second.control;
    popup.hass = { states: { 'light.first': { state: 'on' }, 'light.second': { state: 'off' } } };
    assert.deepEqual(host.children, [first]); assert.equal(first.cancelled, undefined);
    assert.equal(host.insertions, insertions); assert.equal(second.cancelled, true);
    assert.equal(globalThis.document.activeElement, close);
    popup.hass = { states: { 'light.first': { state: 'off' }, 'light.second': { state: 'off' } } };
    assert.equal(host.children.length, 1); assert.equal(host.children[0].textContent, 'No active entities');
    popup.hass = { states: { 'light.first': { state: 'on' }, 'light.second': { state: 'off' } } };
    assert.equal(host.children.length, 1); assert.notEqual(host.children[0], first);
    popup._config.entity_group.popup_filter = 'all';
    popup.hass = { states: { 'light.first': { state: 'on' }, 'light.second': { state: 'unavailable' } } };
    assert.equal(host.children.length, 2); assert.equal(host.children[1].hass.states['light.second'].state, 'unavailable');
    popup._config.entity_group.entities = []; popup._config.cards = [];
    popup.hass = { states: {} };
    assert.equal(host.children[0].textContent, 'No entities configured');
  } finally { globalThis.document = previousDocument; }
});

test('popup ignores stale helpers after teardown and shows a readable helper failure', async () => {
  const previousDocument = globalThis.document, previousHelpers = globalThis.loadCardHelpers;
  const host = { children: [], replaceChildren() { this.children = []; }, append(card) { this.children.push(card); } };
  globalThis.document = { createElement: () => ({ setAttribute() {} }) };
  try {
    const popup = new MaraoPopupCard();
    popup._config = { cards: [] };
    popup._overlay = { querySelector: () => host };
    let resolve;
    globalThis.loadCardHelpers = () => new Promise(done => { resolve = done; });
    const rendering = popup._renderChildren();
    assert.equal(host.children[0].textContent, 'Loading…');
    popup._childrenRenderId++; popup._overlay = null;
    resolve({ createCardElement() { assert.fail('A closed popup must not mount children'); } });
    await rendering;
    assert.equal(host.children[0].textContent, 'Loading…', 'Stale completion must not mutate the detached host');
    popup._overlay = { querySelector: () => host };
    globalThis.loadCardHelpers = async () => { throw new Error('Controls unavailable'); };
    await popup._renderChildren();
    assert.equal(host.children[0].textContent, 'Controls unavailable');
  } finally { globalThis.document = previousDocument; globalThis.loadCardHelpers = previousHelpers; }
});

test("focus waits for Home Assistant's native slot render and skips a detached control", async () => {
  for (const detached of [false, true]) {
    let completeRender;
    let rendered = false;
    let focused = false;
    const nativeCard = { updateComplete: new Promise((resolve) => { completeRender = () => { rendered = true; resolve(true); }; }) };
    const button = {
      isConnected: true,
      closest: (selector) => selector === "ha-card" ? nativeCard : null,
      focus() { assert.equal(rendered, true, "unslotted controls cannot receive native focus"); focused = true; },
    };
    const restoration = focusRestorer(button)();
    assert.equal(focused, false);
    if (detached) button.isConnected = false;
    completeRender();
    await restoration;
    assert.equal(focused, !detached);
  }
});

test("focus follows the live replacement when HA rerenders during native slot rendering", async () => {
  let completeRender;
  let focused;
  const nativeCard = { updateComplete: new Promise((resolve) => { completeRender = resolve; }) };
  let controls;
  const root = { querySelectorAll: () => controls };
  const control = (card) => ({
    localName: "button", isConnected: true,
    getRootNode: () => root, getAttributeNames: () => ["data-card-action"],
    getAttribute: () => "", closest: () => card,
    focus() { focused = this; },
  });
  const original = control(nativeCard);
  const replacement = control({ updateComplete: Promise.resolve() });
  controls = [original];
  const restoration = focusRestorer(original)();
  original.isConnected = false;
  controls = [replacement];
  completeRender();
  await restoration;
  assert.equal(focused, replacement);
});

test("touch actions establish their live invoking control before opening a popup", () => {
  const button = new EventTarget();
  let focused = false;
  button.focus = () => { focused = true; };
  new MaraoCard()._bindTapAction(button, null, () => assert.equal(focused, true));
  button.dispatchEvent(new Event("click"));
});

test("HA updates retain focus on the corresponding live card action", () => {
  const previousDocument = globalThis.document;
  try {
    globalThis.document = { activeElement: null };
    const card = new MaraoCard();
    card.setConfig({ entity: "light.test", template: "hc_light_card", variables: { enable_slider: false } });
    let button;
    const root = {
      activeElement: null,
      querySelector: (selector) => selector === "[data-card-action]" ? button : null,
      querySelectorAll: (selector) => selector === "button" ? [button] : [],
      set innerHTML(_value) {
        if (button) button.isConnected = false;
        this.activeElement = null;
        button = Object.assign(new EventTarget(), {
          localName: "button", isConnected: true,
          getRootNode: () => root,
          getAttributeNames: () => ["data-card-action", "aria-label"],
          getAttribute: (name) => name === "data-card-action" ? "" : "Light",
          focus() { root.activeElement = this; document.activeElement = card; },
        });
      },
    };
    card.shadowRoot = root;
    card.hass = { callService() {}, states: { "light.test": { state: "on", attributes: {} } } };
    button.focus();
    const original = button;
    card.hass = { ...card.hass, states: { "light.test": { state: "off", attributes: {} } } };
    assert.equal(original.isConnected, false);
    assert.notEqual(button, original);
    assert.equal(root.activeElement, button);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("light and fan can omit their sliders while cover positions use the native service", async () => {
  const card = new MaraoCard();
  const calls = [];
  card.setConfig({ template: "hc_light_card", variables: { enable_slider: false } });
  card.hass = { callService: (...args) => { calls.push(args); return Promise.resolve(); }, states: { "cover.test": { state: "open", attributes: { current_position: 50 } } } };
  const state = { state: "on", attributes: { brightness: 128, percentage: 50 } };
  assert.equal(card._range("light.test", state, "hc_light_card"), "");
  assert.equal(card._range("fan.test", state, "hc_fan_card"), "");
  card.setConfig({ template: "hc_light_card" });
  assert.match(card._range("light.test", state, "hc_light_card"), /type="range"/);
  await card._setRange("cover.test", "hc_cover_card", 60);
  assert.deepEqual(calls, [["cover", "set_cover_position", { entity_id: "cover.test", position: 60 }, undefined, false]]);
});

test("value slider drags retain their native input across unrelated and confirmed-state updates", () => {
  const card = new MaraoCard();
  const entity = "cover.test";
  card.setConfig({ entity, template: "hc_cover_card" });
  card.hass = { callService() {}, states: { [entity]: { state: "open", attributes: { current_position: 50 } } } };
  const markup = card.shadowRoot.innerHTML;
  const refreshed = [];
  const gesture = { input: { isConnected: true }, key: `hc_cover_card:${entity}`, refresh: (state) => refreshed.push(state) };
  card._sliderGesture = gesture;
  card.hass = { ...card.hass, states: { ...card.hass.states } };
  const confirmed = { state: "open", attributes: { current_position: 40 } };
  card.hass = { ...card.hass, states: { [entity]: confirmed } };
  card._render();
  assert.equal(card._sliderGesture, gesture);
  assert.equal(card.shadowRoot.innerHTML, markup);
  assert.equal(refreshed.length, 2, 'Only confirmed-state updates and explicit refreshes update the held slider');
  assert.equal(refreshed.at(-1), confirmed);
});

test("idle value sliders skip unrelated updates but refresh their state, graph, metadata and connection", () => {
  for (const change of ["unrelated", "own", "graph", "themes", "locale", "language", "localize", "entities", "connection"]) {
    const entity = "light.test", graph = "sensor.power";
    const card = new MaraoCard();
    card.setConfig({ entity, template: "hc_light_card", variables: { graph_entity: graph, show_graph: true } });
    card.hass = { callService() {}, states: { [entity]: { state: "on", attributes: { brightness: 128 } }, [graph]: { state: "20" } } };
    card.shadowRoot.querySelector = (selector) => selector === 'input[data-slider-key],.camera-live,.media-artwork img' ? {} : null;
    let renders = 0;
    card._render = () => { renders += 1; };
    const next = { ...card.hass, states: { ...card.hass.states } };
    if (change === "own") next.states[entity] = { state: "on", attributes: { brightness: 100 } };
    else if (change === "graph") next.states[graph] = { state: "40" };
    else if (change === "connection") next.connected = false;
    else if (change !== "unrelated") next[change] = {};
    card.hass = next;
    assert.equal(renders, change === "unrelated" ? 0 : 1, change);
    assert.equal(card.hass, next, "native service context stays current without rebuilding");
  }
});

test("invalid targets, disconnects and lifecycle changes cancel value slider targets", () => {
  for (const reason of ["unknown", "unavailable", "disconnect", "config", "detach"]) {
    const card = new MaraoCard();
    const entity = "fan.test", config = { entity, template: "hc_fan_card" };
    card.setConfig(config);
    card.hass = { callService() {}, states: { [entity]: { state: "on", attributes: { percentage: 50 } } } };
    const gesture = { input: { isConnected: true }, key: `hc_fan_card:${entity}`, refresh() {} };
    card._sliderGesture = gesture;
    card._sliderTargets.set(gesture.key, 60);
    if (reason === "config") card.setConfig({ ...config, variables: { enable_slider: false } });
    else if (reason === "detach") card.disconnectedCallback();
    else if (reason === "disconnect") card.hass = { ...card.hass, connected: false };
    else card.hass = { ...card.hass, states: { [entity]: { state: reason, attributes: {} } } };
    assert.equal(gesture.cancelled, true, reason);
    assert.equal(card._sliderGesture, null, reason);
    assert.equal(card._sliderTargets.has(gesture.key), false, reason);
  }
});

test("legacy access opening actions always render the strict slider without a tap overlay", () => {
  for (const [entity, service, state] of [["lock.test", "lock.unlock", "locked"], ["cover.test", "cover.open_cover", "closed"]]) {
    for (const template of ["hc_access_action_card", "hc_access_hold_action_card", "hc_access_slide_action_card"]) {
      const card = new MaraoCard();
      card.setConfig({ entity, template, variables: { action_service: service }, tap_action: { action: "call-service", service } });
      card.hass = { callService() {}, states: { [entity]: { state, attributes: {} } } };
      const markup = card.shadowRoot.innerHTML.split("</style>")[1];
      assert.match(markup, /<marao-slide-to-open/);
      assert.doesNotMatch(markup, /data-card-action|data-hold-action/);
    }
  }
});

function renderBinary(config, states, language='en') {
 const card=new MaraoCard(); card.setConfig(config); card.hass={language,callService(){},states}; return card.shadowRoot.innerHTML;
}
test('binary meaning follows native domains and explicit appliance contracts',()=>{
 for(const domain of ['light','fan','switch','input_boolean','binary_sensor']) for(const value of ['on','off']) assert.equal(binaryState(`${domain}.test`,{state:value}),value==='on');
 for(const domain of ['sensor','number','select','input_select','climate','media_player','cover','vacuum','alarm_control_panel']) for(const value of ['on','off']) assert.equal(binaryState(`${domain}.test`,{state:value}),null);
 for(const value of ['unknown','unavailable','locking','unlocking','open','opening','jammed']) assert.equal(binaryState('lock.test',{state:value}),null);
 for(const value of ['locked','unlocked']) assert.equal(binaryState('lock.test',{state:value}),value==='unlocked');
 for(const [value,expected] of [['running',true],['idle',false],['paused',null],['error',null]]) assert.equal(binaryState('sensor.test',{state:value},'hc_washing_machine_card'),expected);
 for(const kind of ['hc_cover_card','hc_climate_card','hc_media_card','hc_media_app_card','hc_camera_card','hc_security_card','hc_weather_card','hc_vacuum_card','hc_dishwasher_card','hc_scene_card','hc_number_card','hc_wallbox_current_card','hc_battery_card']) assert.equal(binaryState('switch.test',{state:'on'},kind),null);
});
test('binary cards omit the round badge and preserve state for native, static and hidden icons',()=>{
 for(const domain of ['light','fan','switch','input_boolean','binary_sensor','lock']) for(const value of domain==='lock'?['locked','unlocked']:['on','off']) for(const variant of [{},{icon:'mdi:test'},{show_icon:false}]) {
  const entity=`${domain}.test`,html=renderBinary({entity,name:'Target',show_state:true,...variant},{[entity]:{state:value,attributes:{device_class:'motion'}}});
  assert.doesNotMatch(html,/<div class="state">|class="binary-cue"/); assert.match(html,/role="img" aria-label="Target:/);
  assert.match(html,new RegExp(`data-binary-state="${value==='on'||value==='unlocked'}"`));
  if (variant.show_icon === false) assert.match(html, /class="binary-state" role="img"/);
 }
});
test('binary state hiding retains configured labels, numeric readings and metadata without dangling prefixes',()=>{
 const entity='switch.test', states={[entity]:{state:'on',attributes:{}},'sensor.power':{state:'120',attributes:{unit_of_measurement:'W'}}};
 for(const variables of [{custom_label:'Status: ',hc_label_prefix:'Power: '},{hc_label_prefix:'Status '}]) assert.doesNotMatch(renderBinary({entity,variables},states),/<div class="state">/);
 assert.match(renderBinary({entity,variables:{custom_label:'Night lighting',power_entity:'sensor.power'}},states),/<div class="state">Night lighting<\/div>/);
 assert.match(renderBinary({template:'hc_switch_card',entity,variables:{power_entity:'sensor.power'}},states),/120 W/);
 const sensor=renderBinary({template:'hc_sensor_card',entity:'binary_sensor.test',variables:{on_icon:'mdi:check',off_icon:'mdi:close'}},{'binary_sensor.test':{state:'off',last_updated:'2026-10-10T12:00:00Z',attributes:{}}});
 assert.match(sensor,/icon="mdi:close"/);assert.match(sensor,/Updated /);
});
test('binary hiding preserves explicit title-hidden and icon-only roles',()=>{
 const entity='switch.test',states={[entity]:{state:'on',attributes:{}}};
 assert.doesNotMatch(renderBinary({entity,show_name:false,show_state:true,show_label:false},states),/body icon-only/);
 assert.match(renderBinary({entity,show_name:false,show_state:false,show_label:false},states),/body icon-only/);
});
test('summaries retain usable counts without member warnings and omit known All off',()=>{
 const entity='switch.test',config={template:'hc_navigation_card',entity,variables:{summary_entities:[entity,'switch.other']}};
 for(const [first,second,expected] of [['on','off','1 active'],['on','unavailable','1 active'],['off','unavailable','All off']]) assert.match(renderBinary(config,{[entity]:{state:first},'switch.other':{state:second}}),new RegExp(`<div class="state">${expected}<`));
 assert.doesNotMatch(renderBinary(config,{[entity]:{state:'off'},'switch.other':{state:'off'}}),/<div class="state">/);
});
test('toggle graphs use their actual toggle while preserving numeric state and header details',()=>{
 const entity='sensor.power',toggle='switch.test',states={[entity]:{state:'42',attributes:{unit_of_measurement:'W'}},[toggle]:{state:'on'}};
 const html=renderBinary({template:'hc_toggle_graph_card',entity,variables:{toggle_entity:toggle}},states);
 assert.match(html,/<div class="state">42 W<\/div>/);assert.match(html,/data-binary-state="true"/);assert.doesNotMatch(html,/class="binary-cue"/);
 const binary=renderBinary({template:'hc_toggle_graph_card',entity:toggle,variables:{toggle_entity:toggle,graph_entity:entity}},states);
 assert.doesNotMatch(binary,/<div class="state">/);
 const header=renderBinary({template:'hc_header_card',entity:toggle},states);
 assert.doesNotMatch(header,/<div class="state">/);assert.match(header,/<div class="climate">/);
});
test('nonbinary and transitional content stays visible, including configured prefixes',()=>{
 for(const [entity,value,template] of [['cover.test','opening','hc_cover_card'],['climate.test','heat','hc_climate_card'],['media_player.test','paused','hc_media_card'],['lock.test','locking','hc_access_card'],['vacuum.test','returning','hc_vacuum_card'],['sensor.test','on','hc_base_card'],['input_select.test','on','hc_scene_card']]) assert.match(renderBinary({entity,template,variables:{custom_label:'State: '}},{[entity]:{state:value,attributes:{}}}),/<div class="state">State: /);
});
test('binary backgrounds distinguish normal active and inactive states through shared and navigation paths',()=>{
 for(const kind of ['hc_base_card','hc_navigation_card','hc_washing_machine_card','hc_room_card']) {
  const config={entity:'binary_sensor.test',variables:{hc_color:'var(--color-orange)'}};
  assert.notEqual(stateAppearance(kind,'on',config).background,stateAppearance(kind,'off',config).background);
 }
});
test('binary accessible state uses Home Assistant localized device-class meanings',()=>{
 for(const [deviceClass,on,off] of [['motion','Detected','Clear'],['moisture','Molhado','Seco'],['opening','Aberto','Fechado']]) for(const value of ['on','off']) for(const template of ['hc_sensor_card','hc_header_card']) {
  const card=new MaraoCard();card.setConfig({template,entity:'binary_sensor.test',name:'Target'});
  card.hass={language:deviceClass==='motion'?'en':'pt',states:{'binary_sensor.test':{state:value,attributes:{device_class:deviceClass}}},formatEntityState:state=>{assert.equal(state.entity_id,'binary_sensor.test');return state.state==='on'?on:off}};
  assert.match(card.shadowRoot.innerHTML,new RegExp(`aria-label="Target: ${value==='on'?on:off}"`));assert.doesNotMatch(card.shadowRoot.innerHTML,/<div class="state">/);
 }
});

const owner=()=>({_config:{},_actionError:'',_hass:{},renders:0,_render(){this.renders++}});
test('local outcomes persist until an explicit successful retry and remain isolated',()=>{
 const first=owner(),second=owner();const old=serviceOutcome(first);old('error',new Error('Rejected'));assert.equal(first._actionError,'Rejected');assert.equal(second._actionError,'');
 const newer=serviceOutcome(first);newer('skipped');assert.equal(first._actionError,'Rejected');old('success');assert.equal(first._actionError,'Rejected');newer('success');assert.equal(first._actionError,'');old('error',new Error('Late'));assert.equal(first._actionError,'');assert.equal(first.renders,2);
});
test('configuration replacement and removal reject obsolete action callbacks',()=>{
 const card=owner();const old=serviceOutcome(card);card._config={entity:'switch.other'};old('error',new Error('Wrong card'));assert.equal(card._actionError,'');const removed=serviceOutcome(card);card._actionLive=false;removed('error',new Error('Removed'));assert.equal(card._actionError,'');
});
test('card service and action paths reuse the centralized single-dispatch error notification',async()=>{
 const card=new MaraoCard();card.setConfig({entity:'switch.test'});let calls=0,notifications=0;
 globalThis.document={querySelector:()=>({dispatchEvent(){notifications++}})};globalThis.window={MaraoDashboard:{}};
 card.hass={states:{'switch.test':{state:'off'}},callService:async()=>{calls++;throw new Error('Fixture rejection')}};
 await card._performAction({action:'toggle'},'switch.test');assert.equal(calls,1);assert.equal(notifications,1);assert.equal(card._actionError,'Fixture rejection');
 card.hass={...card._hass,callService:async()=>{calls++}};await card._performAction({action:'toggle'},'switch.test');assert.equal(calls,2);assert.equal(notifications,1);assert.equal(card._actionError,'');
});
test('native area and device targets retain outcome reporting and skipped connection guards',async()=>{
 const outcomes=[],calls=[];await performAction({connected:false,callService(){}},{action:'toggle'},'switch.test',status=>outcomes.push(status));assert.deepEqual(outcomes,['skipped']);
 await performAction({callService:async(...args)=>calls.push(args)},{action:'perform-action',perform_action:'light.turn_off',target:{area_id:'gallery'}},'',status=>outcomes.push(status));assert.deepEqual(outcomes,['skipped','sent','success']);assert.deepEqual(calls[0].slice(0,4),['light','turn_off',{}, {area_id:'gallery'}]);
});

test('outcome rendering failures cannot invent or hide native service errors',async()=>{
 let notifications=0,calls=0;globalThis.document={querySelector:()=>({dispatchEvent(){notifications++}})};
 const callback=()=>{throw new Error('Rendering failed')};
 await assert.rejects(callServiceWithNotification({callService:async()=>{calls++}},'switch','toggle',{},status=>{if(status==='success')callback()}),/Rendering failed/);
 assert.equal(calls,1);assert.equal(notifications,0);
 await assert.rejects(callServiceWithNotification({callService:async()=>{calls++;throw new Error('Reported failure')}},'switch','toggle',{},status=>{if(status==='error')callback()}),/Rendering failed/);
 assert.equal(calls,2);assert.equal(notifications,1);
});

const entity='light.test';const state=value=>({state:value,attributes:{}});const normal={states:{[entity]:state('on'),'sensor.reading':state('21')}};
test('complete availability has priority over retained action and content errors',()=>{
 for(const [states,reason] of [[{},'Entity missing'],[{[entity]:state('unknown')},'Unknown'],[{[entity]:state('unavailable')},'Unavailable']]) {
  const problem=cardProblem({entity},{states},{error:'Rejected',contentError:'History unavailable'});assert.equal(problem.kind,'neutral');assert.equal(problem.complete,true);assert.equal(problem.reason,reason);
 }
 const disconnected=cardProblem({entity},{...normal,connected:false});assert.equal(disconnected.kind,'neutral');assert.equal(disconnected.reason,'Disconnected');
 assert.equal(cardProblem({entity},{},{error:'Rejected'}).kind,'loading');assert.equal(cardProblem({template:'hc_title_card'},{connected:false}),null);
});
test('usable summaries omit availability warnings while glance data retains a compact cue',()=>{
 const summary={template:'hc_navigation_card',entity,variables:{summary_entities:[entity,'light.missing']}};
 assert.equal(cardProblem(summary,normal),null);
 assert.equal(cardProblem(summary,{states:{}}).kind,'neutral');
 const glance={template:'hc_glance_card',entity:'sensor.missing',variables:{entity1:'sensor.reading'}};assert.equal(cardProblem(glance,normal).kind,'warning');
 assert.equal(cardProblem({template:'hc_room_card',entity,variables:{light_entities:[entity,'light.missing']}},normal),null);
});
test('actual toggle, remote and graph failures remain distinct from readable primary content',()=>{
 for(const config of [
  {template:'hc_toggle_graph_card',entity:'sensor.reading',variables:{toggle_entity:'switch.missing'}},
  {template:'hc_climate_card',entity,variables:{show_graph:true,graph_entity:'sensor.missing'}},
  {entity,tap_action:{action:'perform-action',perform_action:'remote.send_command',target:{entity_id:'remote.missing'}}},
 ])assert.equal(cardProblem(config,normal).kind,'warning');
 assert.equal(cardProblem({entity,variables:{graph_entity:'sensor.missing',show_graph:false}},normal),null);
 assert.equal(cardProblem({entity,tap_action:{action:'navigate',navigation_path:'#missing'}},normal),null);
});
test('only recognized operational faults take error priority over partial content',()=>{
 for(const [template,id,value] of [['hc_vacuum_card','vacuum.test','error'],['hc_dishwasher_card','sensor.test','actionrequired'],['hc_washing_machine_card','sensor.test','error'],['hc_access_card','lock.test','jammed'],['hc_security_card','alarm_control_panel.test','triggered']]) assert.equal(cardProblem({template,entity:id},{states:{[id]:state(value)}}).kind,'error');
 assert.equal(cardProblem({entity:'sensor.test'},{states:{'sensor.test':state('error')}}),null);
 assert.equal(cardProblem({entity},normal,{contentError:'History unavailable',loading:true}).kind,'error');
 assert.equal(cardProblem({entity},normal,{loading:true}).kind,'loading');assert.equal(cardProblem({entity},normal),null);
});

test('problem surfaces override custom colors and hidden normal fields without hiding usable readings', () => {
  const card = new MaraoCard();
  card.setConfig({ entity: 'light.test', template: 'hc_light_card', show_state: false, show_icon: false, variables: { active_color: '#123456' } });
  card.hass = { callService() {}, states: { 'light.test': { state: 'unknown', attributes: {} } } };
  assert.match(card.shadowRoot.innerHTML, /data-problem="neutral" style="background:var\(--marao-problem-neutral-background/);
  assert.match(card.shadowRoot.innerHTML, /class="problem" role="status">[\s\S]*Unknown/);
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /style="[^"]*#123456/);
  card.setConfig({ entity: 'media_player.test', template: 'hc_media_card', variables: { hc_background_color: '#123456' } });
  card._actionError = 'Reported rejection';
  card.hass = { callService() {}, states: { 'media_player.test': { state: 'playing', attributes: { entity_picture: '/synthetic-artwork', media_title: 'Safe programme' } } } };
  assert.match(card.shadowRoot.innerHTML, /data-problem="error" style="background:var\(--marao-problem-error-background/);
  assert.match(card.shadowRoot.innerHTML, /Reported rejection/);
  assert.match(card.shadowRoot.innerHTML, /Safe programme/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="media-artwork"/);
  card.setConfig({ entity: 'sensor.value', template: 'hc_glance_card', variables: { entity1: 'sensor.value', entity2: 'sensor.missing' } });
  card.hass = { states: { 'sensor.value': { state: '21', attributes: { unit_of_measurement: 'W' } } } };
  assert.match(card.shadowRoot.innerHTML, /data-problem="warning"/);
  assert.match(card.shadowRoot.innerHTML, /21 W/);
  assert.match(card.shadowRoot.innerHTML, /Entity missing/);
});

test('failed media stays local, waits for explicit retry, and ignores old resource callbacks', () => {
  const card = new MaraoCard();
  card.setConfig({ entity: 'media_player.test', template: 'hc_media_card' });
  const images = [], retries = [];
  card.shadowRoot.querySelectorAll = selector => {
    if (selector !== 'img.camera,.media-artwork img' || !card.shadowRoot.innerHTML.includes('class="media-artwork"')) return [];
    const image = { isConnected: true, addEventListener(_event, callback) { this.error = callback; } };
    images.push(image); return [image];
  };
  card.shadowRoot.querySelector = selector => {
    if (selector !== '[data-media-retry]' || !card.shadowRoot.innerHTML.includes('data-media-retry')) return null;
    const button = { addEventListener(_event, callback) { this.click = () => callback({ stopPropagation() {} }); } };
    retries.push(button); return button;
  };
  const hass = { callService() {}, states: { 'media_player.test': { state: 'playing', attributes: { entity_picture: '/safe-image' } } } };
  card.hass = hass;
  assert.equal(images.length, 1);
  const firstError = images[0].error;
  firstError();
  assert.match(card.shadowRoot.innerHTML, /data-problem="error"/);
  assert.match(card.shadowRoot.innerHTML, /Media unavailable/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="media-artwork"/);
  card.hass = { ...hass, states: { ...hass.states } };
  assert.equal(images.length, 1);
  retries.at(-1).click();
  assert.equal(images.length, 2);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-problem="error"/);
  images[0].isConnected = false;
  firstError();
  assert.equal(card._mediaError, '');
  card.setConfig({ entity: 'media_player.other', template: 'hc_media_card' });
  images[1].error();
  assert.equal(card._mediaError, '');
});

for (const fail of [false, true]) test(`graph history survives a temporary HA shell move (${fail ? 'error' : 'ready'})`, async () => {
  const card = new MaraoCard();
  card.isConnected = true;
  card.setConfig({entity: 'sensor.power', template: 'hc_graph_card'});
  let calls = 0, finish, reject;
  card.hass = {states: {'sensor.power': {state: '125', attributes: {}}}, callApi: () => {calls++; return new Promise((resolve, fail) => {finish = resolve; reject = fail;});}};
  card.isConnected = false;
  card.disconnectedCallback();
  card.isConnected = true;
  card.connectedCallback();
  assert.equal(calls, 1);
  if (fail) reject(new Error('history failed')); else finish([]);
  await new Promise(resolve => setImmediate(resolve));
  card.isConnected = false;
  card.disconnectedCallback();
  card.isConnected = true;
  card.connectedCallback();
  assert.equal(calls, 1);
  assert.match(card.shadowRoot.innerHTML, new RegExp(`data-graph-history-state="${fail ? 'error' : 'empty'}"`));
});

test('unrelated HA updates retain idle and active strict access slides with the current service context', () => {
  for (const pointerId of [null, 1]) for (const change of ['unrelated', 'target', 'unknown', 'disconnect', 'locale']) {
    const card = new MaraoCard();
    card.setConfig({entity: 'lock.test', template: 'hc_access_slide_action_card', variables: {action_service: 'lock.unlock'}});
    const state = {state: 'locked', attributes: {}};
    const hass = {states: {'lock.test': state}, callService() {}, language: 'en'};
    card.hass = hass;
    const slide = {_pointerId: pointerId};
    card.shadowRoot.querySelector = selector => selector === 'marao-slide-to-open' ? slide : null;
    let renders = 0; card._render = () => renders++;
    const next = {...hass, states: {...hass.states, 'sensor.other': {state: '20'}}};
    if (change === 'target') next.states['lock.test'] = {...state, state: 'unlocked'};
    if (change === 'unknown') next.states['lock.test'] = {...state, state: 'unknown'};
    if (change === 'disconnect') next.connected = false;
    if (change === 'locale') next.language = 'pt';
    card.hass = next;
    assert.equal(renders, change === 'unrelated' ? 0 : 1, change);
    if (change === 'unrelated') assert.equal(slide.hass, next);
  }
});


test('availability labels omit long member names and recover retained errors when the device returns', () => {
  const name = 'A very long auxiliary device name '.repeat(8);
  const hass = { states: { 'switch.main': { state: 'on' }, 'sensor.power': { state: 'unavailable', attributes: { friendly_name: name } } } };
  const config = { entity: 'switch.main', template: 'hc_switch_card', variables: { power_entity: 'sensor.power' } };
  assert.equal(cardProblem(config, hass).reason, 'Unavailable');
  const card = new MaraoCard();card.setConfig(config);card.hass = hass;
  assert.match(card.shadowRoot.innerHTML, /class="problem"[^>]*><ha-icon[^>]*><\/ha-icon><span>Unavailable<\/span>/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, new RegExp(name));
  card._actionError = 'Reported failure';
  card.hass = { states: { 'switch.main': { state: 'unavailable' } } };
  assert.equal(cardProblem(config, card._hass, { error: card._actionError }).reason, 'Unavailable');
  assert.doesNotMatch(card.shadowRoot.innerHTML, /Reported failure/);
  card.hass = hass;
  assert.match(card.shadowRoot.innerHTML, /Reported failure/);
});

test('partially available group tiles keep their counts without adding warning rows', () => {
  for (const type of ['light','cover','climate','battery']) {
    const card = new MaraoCard(), ids = ['sensor.first','sensor.missing'];
    card.setConfig({ template: 'hc_entity_group_card', name: 'Group', variables: { entity_type: type, summary_entities: ids }, tap_action: { action: 'navigate', navigation_path: '#group' } });
    const state = { light: 'on', cover: 'open', climate: 'heat', battery: '10' }[type];
    for (const failure of ['unknown','unavailable',null]) {
      card.hass = { states: { [ids[0]]: { state }, ...(failure ? { [ids[1]]: { state: failure, attributes: { friendly_name: 'Long member name '.repeat(10) } } } : {}) } };
      const markup = card.shadowRoot.innerHTML.split('</style>')[1];
      assert.doesNotMatch(markup, /class="problem"|data-problem=|unavailable|Unknown|Entity missing|Long member name/);
      assert.match(markup, type === 'battery' ? /10% · 1 low/ : /1 active/);
      assert.doesNotMatch(markup, /data-card-action[^>]* disabled/);
      assert.deepEqual(card._config.variables.summary_entities, ids);
    }
  }
});
