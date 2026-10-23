import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

globalThis.HTMLElement = class {
  attachShadow() { this.shadowRoot = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] }; }
  getAttribute(key) { return this.attributes?.[key]; }
  getRootNode() { return {}; }
};
const source = (await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8")).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url).href));
globalThis.navigationTranslations = (await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js')).navigationTranslations;
const dashboard = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoRuntime.js", import.meta.url), "utf8");
const runtime = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const { MaraoCard, alarmActions, alarmCodeRequired, accessOpenerService } = runtime;
const { validateConfig, normalizeConfig, serializeConfig } = await import('../../frontend_src/editor-model.js');
const entity = "alarm_control_panel.safe";
const reported = (state = "disarmed", attributes = {}) => ({ state, attributes: { supported_features: 55, ...attributes } });
function alarm(t, hass) {
  const card = new MaraoCard();
  card.setConfig({ template: "hc_alarm_controls_card", entity });
  card.hass = hass; card.connectedCallback();
  t.after(() => card.disconnectedCallback());
  return card;
}

test("builder round trips explicit openers, rejects bypasses, and keeps generic defaults", () => {
  const catalog = { cards: [{ id: "hc_access_slide_action_card", domains: ["lock", "cover", "button", "switch", "script"] }] };
  for (const domain of ["lock", "cover", "button", "switch", "script"]) {
    const card = { id: "opener", template: "hc_access_slide_action_card", entity_id: domain + ".safe", variables: { future: true } };
    const config = { config_version: 2, name: "Safe", landing_page: "home", pages: [{ path: "home", name: "Home", entities: [card] }] };
    assert.deepEqual(validateConfig(config, 2, undefined, {}, catalog), []);
    assert.deepEqual(serializeConfig(normalizeConfig(config)), config);
    card.variables.action_service = "homeassistant.toggle";
    assert.match(validateConfig(config, 2, undefined, {}, catalog).join(" "), /native opening service/);
    delete card.variables.action_service; card.tap_action = { action: "toggle" };
    assert.match(validateConfig(config, 2, undefined, {}, catalog).join(" "), /strict slide/);
  }
});

test("alarm modes follow advertised features and only risky actions require holds", () => {
  assert.deepEqual(alarmActions(reported("disarmed", { supported_features: 6 })).map(a => a.mode), ["away", "night", "disarm"]);
  assert.deepEqual(alarmActions(reported()).filter(a => a.hold).map(a => a.mode), ["custom_bypass", "disarm"]);
  assert.equal(alarmCodeRequired(reported("armed_away", { code_format: "number", code_arm_required: false }), "alarm_disarm"), true);
  assert.equal(alarmCodeRequired(reported("disarmed", { code_format: "text", code_arm_required: false }), "alarm_arm_away"), false);
});

test("imported dishwasher sensor warnings preserve vendor attention states and neutral availability", () => {
  const config = { template: "hc_dishwasher_card", entity: "sensor.safe", variables: { salt_entity: "sensor.refill" } };
  for (const state of ["on", "present", "confirmed", "2"]) {
    const problem = runtime.cardProblem(config, { states: { "sensor.safe": { state: "run" }, "sensor.refill": { state } } });
    assert.equal(problem.kind, "warning");
    assert.match(problem.reason, /salt/i);
  }
  assert.equal(runtime.dishwasherWarning({ state: "off", attributes: { options: ["off", "confirmed"] } }), false);
  assert.equal(runtime.dishwasherWarning({ state: "unavailable" }), false);
});

test("original vacuum command parameters are retained independently of default segment shorthand", () => {
  const data = { command: "app_segment_clean", params: [{ segments: [21], repeat: 1 }] };
  const variables = { action_1: { segment: 21, data } };
  const actions = runtime.vacuumActions({ state: "docked", attributes: { supported_features: 256 } }, variables);
  assert.deepEqual(actions[0].data, data);
  actions[0].data.params[0].repeat = 2;
  assert.equal(data.params[0].repeat, 1);
  assert.deepEqual(runtime.vacuumActions({ state: "docked", attributes: { supported_features: 256 } }, { action_1: { segment: 21 } })[0].data,
    { command: "app_segment_clean", params: [21] });
});

test("alarm code validation, cleanup, single dispatch and authoritative state survive an attempt", async t => {
  let finish; const calls = [];
  const state = reported("armed_away", { code_format: "number" });
  const card = alarm(t, { states: { [entity]: state }, callService: (...args) => { calls.push(args); return new Promise(resolve => { finish = resolve; }); } });
  assert.match(card.shadowRoot.innerHTML, /type="password" inputmode="numeric"/);
  card._alarmPIN = "text";
  await card._sendAlarm("alarm_disarm", true);
  assert.equal(calls.length, 0); assert.equal(card._alarmPIN, "");
  card._alarmPIN = "1357";
  await card._sendAlarm("alarm_disarm");
  assert.equal(calls.length, 0);
  const pending = card._sendAlarm("alarm_disarm", true);
  assert.equal(card._alarmPIN, "");
  await card._sendAlarm("alarm_disarm", true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 3), ["alarm_control_panel", "alarm_disarm", { entity_id: entity, code: "1357" }]);
  assert.equal(state.state, "armed_away");
  finish(); await pending;
  assert.equal(state.state, "armed_away");
  assert.equal(card._actionError, "");
  assert.doesNotMatch(card.shadowRoot.innerHTML, /1357/);
});

test("text/no-code alarms, failures and loss of availability clear private input", async t => {
  const calls = [], errors = [];
  const card = alarm(t, { states: { [entity]: reported("disarmed", { code_format: "text" }) },
    callService: async (_domain, _service, data) => { calls.push(data); throw new Error("Rejected code " + data.code); } });
  card._alarmPIN = "secret text";
  await card._sendAlarm("alarm_arm_night");
  assert.equal(calls.length, 1);
  assert.match(card._actionError, /Rejected code \[redacted\]/);
  assert.doesNotMatch(card._actionError, /secret text/);
  card._alarmPIN = "another";
  card.hass = { ...card.hass, connected: false };
  assert.equal(card._alarmPIN, "");
  await card._sendAlarm("alarm_arm_away");
  assert.equal(calls.length, 1);
  card.hass = { states: { [entity]: reported() }, callService: async (...args) => errors.push(args) };
  card._alarmPIN = "unused";
  await card._sendAlarm("alarm_arm_away");
  assert.equal(Object.hasOwn(errors[0][2], "code"), false);
  card._alarmPIN = "discard";
  card.setConfig({ template: "hc_alarm_controls_card", entity: "alarm_control_panel.other" });
  assert.equal(card._alarmPIN, "");
  card._alarmPIN = "discard"; card.disconnectedCallback(); assert.equal(card._alarmPIN, "");
});

test("alarm holds cancel on release/outside and complete once with border progress", async t => {
  const card = alarm(t, { states: { [entity]: reported("armed_away") }, callService: async () => {} });
  const originalTimeout = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  const timers = new Map(); let next = 0;
  globalThis.setTimeout = fn => { timers.set(++next, fn); return next; };
  globalThis.clearTimeout = id => timers.delete(id);
  t.after(() => { globalThis.setTimeout = originalTimeout; globalThis.clearTimeout = originalClear; });
  const events = new Map(), line = { style: {} }, wrapper = { classList: { add() {}, remove() {} }, querySelector: () => line };
  const button = { addEventListener: (type, fn) => events.set(type, fn), getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 64 }) };
  let calls = 0;
  card._bindHoldAction(button, wrapper, () => { calls++; });
  events.get("pointerdown")({ button: 0 }); events.get("pointerup")({});
  assert.equal(timers.size, 0); assert.equal(calls, 0);
  events.get("pointerdown")({ button: 0 }); events.get("pointermove")({ clientX: 101, clientY: 10 });
  assert.equal(timers.size, 0); assert.equal(calls, 0);
  events.get("pointerdown")({ button: 0 });
  const complete = timers.values().next().value; complete(); complete();
  assert.equal(calls, 1); assert.equal(line.style.strokeDashoffset, "0");
  events.get("pointercancel")({}); assert.equal(line.style.opacity, "0");
});

test("loading and route/visibility changes cannot dispatch or retain alarm codes", async t => {
  let calls = 0;
  const card = alarm(t, { callService: async () => { calls++; } });
  await card._sendAlarm("alarm_disarm", true);
  assert.equal(calls, 0);
  assert.match(card.shadowRoot.innerHTML, /data-alarm-action="alarm_disarm"[^>]* disabled/);
  card._alarmPIN = "discard"; card._holdActive = true;
  card._cancelHiddenControls({ type: "location-changed" });
  assert.equal(card._alarmPIN, ""); assert.equal(card._holdActive, false);
});

test("strict slide routes every native opener once and rejects incompatible overrides", async () => {
  const names = ["HTMLElement", "MARAO_SLIDE_INTENT_PX", "MARAO_SLIDE_COMPLETE_AT", "serviceConnectionReady", "serviceTargetReady", "accessOpenerService", "haptic", "callServiceWithNotification", "serviceOutcome", "fitNativeGrid"];
  const values = [globalThis.HTMLElement, 10, .92, runtime.serviceConnectionReady, runtime.serviceTargetReady, accessOpenerService, () => {}, runtime.callServiceWithNotification, runtime.serviceOutcome, runtime.fitNativeGrid];
  const Slide = new Function(...names, dashboard.slice(dashboard.indexOf("class MaraoSlideToOpen"), dashboard.indexOf('if (!customElements.get("marao-slide-to-open"))')) + "; return MaraoSlideToOpen;")(...values);
  for (const [domain, service, state] of [["lock", "unlock", "locked"], ["cover", "open_cover", "closed"], ["button", "press", "2026-01-01"], ["switch", "turn_on", "off"], ["script", "turn_on", "off"]]) {
    const id = domain + ".safe", calls = [];
    const slide = new Slide(); slide.attributes = { entity: id }; slide._render = () => {}; slide._setProgress = value => { slide._progress = Math.max(0, Math.min(1, value)); }; slide._animateCompletion = () => {};
    const hass = { states: { [id]: { state } }, callService: async (...args) => { calls.push(args); } };
    Object.defineProperty(slide, 'hass', { value: hass, writable: true, configurable: true });
    slide.connectedCallback();
    assert.equal(Object.hasOwn(slide, 'hass'), false, 'Pre-registration assignments must not shadow the setter');
    assert.equal(slide._hass, hass);
    slide.hass = { ...hass, connected: false };
    assert.equal(slide._disabled(), true);
    await slide._trigger(); assert.equal(calls.length, 0);
    slide.hass = hass;
    const track = { clientWidth: 310, classList: { add() {}, remove() {} }, getBoundingClientRect: () => ({ left: 0, right: 310, top: 0, bottom: 64 }), setPointerCapture() {}, releasePointerCapture() {} };
    slide.shadowRoot.querySelector = selector => selector === '.thumb' ? { getBoundingClientRect: () => ({ left: 4, right: 58, top: 5, bottom: 59 }) } : null;
    const event = { currentTarget: track, button: 0, preventDefault() {}, stopPropagation() {} };
    const point = (x, y = 20) => ({ pointerId: 1, clientX: x, clientY: y });
    for (const [x, y] of [[24, 20], [80, 20], [32, 90]]) {
      slide._start(event, point(24)); slide._move(event, point(x, y)); slide._end(event, point(x, y));
    }
    assert.equal(calls.length, 0);
    slide._start(event, point(24)); slide._move(event, point(290)); slide._end(event, point(290));
    await Promise.resolve(); await Promise.resolve();
    assert.deepEqual(calls[0].slice(0, 3), [domain, service, { entity_id: id }]);
    assert.equal(calls.length, 1);
    slide._sending = false;
    slide.hass = { ...slide._hass, states: { [id]: { state: "unavailable" } } };
    await slide._trigger(); assert.equal(calls.length, 1);
    assert.equal(accessOpenerService(id, "homeassistant.toggle"), "");
  }
});

test('native grids reflow ordinary and access cards without changing owned control grids', t => {
  const styles = [], attributes = new Set();
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ attributes: new Set(), setAttribute(name) { this.attributes.add(name); } }) };
  t.after(() => { globalThis.document = previousDocument; });
  const Slide = new Function('fitNativeGrid', dashboard.slice(dashboard.indexOf('class MaraoSlideToOpen'), dashboard.indexOf('if (!customElements.get("marao-slide-to-open"))')) + '; return MaraoSlideToOpen;')(runtime.fitNativeGrid);
  const root = { host: { localName: 'hui-grid-card', _config: { columns: 2 } }, querySelector: selector => styles.find(style => style.attributes.has(selector.slice(6, -1))), append: style => styles.push(style) };
  const grid = { id: 'root', getRootNode: () => root };
  const item = { parentElement: grid, setAttribute: key => attributes.add(key) };
  for (const nested of [false, true]) {
    const slide = new Slide();
    if (nested) slide.getRootNode = () => ({ host: { parentElement: item } }); else slide.parentElement = item;
    slide._fitAccessGrid(); assert.equal(slide._accessGridItem, item);
  }
  assert.ok(attributes.has('data-marao-grid-144'));
  assert.equal(styles.length, 1); assert.match(styles[0].textContent, /max-width:296px/);
  assert.match(styles[0].textContent, /grid-column:1\/-1/);
  assert.equal(runtime.fitNativeGrid({ parentElement: item }, 76), item);
  assert.equal(styles.length, 2);
  assert.match(styles[1].textContent, /max-width:160px/);
  assert.equal(runtime.fitNativeGrid({ parentElement: { localName: 'marao-control-grid', parentElement: item } }, 76), undefined);
});
