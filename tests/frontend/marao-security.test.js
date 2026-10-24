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
const { validateConfig, normalizeConfig, serializeConfig, cardForEntity } = await import('../../frontend_src/editor-model.js');
const entity = "alarm_control_panel.safe";
const reported = (state = "disarmed", attributes = {}) => ({ state, attributes: { supported_features: 55, ...attributes } });
function alarm(t, hass) {
  const card = new MaraoCard();
  card.setConfig({ template: "md_alarm_controls_card", entity });
  card.hass = hass; card.connectedCallback();
  t.after(() => card.disconnectedCallback());
  return card;
}

test("builder round trips explicit openers, rejects bypasses, and keeps generic defaults", () => {
  const catalog = { cards: [{ id: "md_access_slide_action_card", domains: ["lock", "cover", "button", "switch", "script"] }] };
  for (const domain of ["lock", "cover", "button", "switch", "script"]) {
    const card = { id: "opener", template: "md_access_slide_action_card", entity_id: domain + ".safe", variables: { future: true } };
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
  const config = { template: "md_dishwasher_card", entity: "sensor.safe", variables: { salt_entity: "sensor.refill" } };
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
  await card._sendAlarm("alarm_disarm", "hold");
  assert.equal(calls.length, 0); assert.equal(card._alarmPIN, "");
  card._alarmPIN = "1357";
  await card._sendAlarm("alarm_disarm");
  assert.equal(calls.length, 0);
  const pending = card._sendAlarm("alarm_disarm", "hold");
  assert.equal(card._alarmPIN, "");
  await card._sendAlarm("alarm_disarm", "hold");
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
  card.setConfig({ template: "md_alarm_controls_card", entity: "alarm_control_panel.other" });
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
  await card._sendAlarm("alarm_disarm", "hold");
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
  for (const [domain, service, state] of [["alarm_control_panel", "alarm_disarm", "armed_away"], ["lock", "unlock", "locked"], ["cover", "open_cover", "closed"], ["button", "press", "2026-01-01"], ["switch", "turn_on", "off"], ["script", "turn_on", "off"]]) {
    const id = domain + ".safe", calls = [];
    const slide = new Slide(); slide.attributes = { entity: id }; slide._render = () => {}; slide._setProgress = value => { slide._progress = Math.max(0, Math.min(1, value)); }; slide._animateCompletion = () => {};
    const hass = { states: { [id]: { state } }, callService: async (...args) => { calls.push(args); } };
    Object.defineProperty(slide, 'hass', { value: hass, writable: true, configurable: true });
    if (domain === 'alarm_control_panel') {
      const owner = new MaraoCard(); owner.setConfig({template:'md_alarm_controls_card',entity:id,variables:{alarm_layout:'grid'}});
      owner.hass = hass; owner._actionLive = true;
      slide.getRootNode = () => ({host:owner});
    }
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

test('unified access modes retain strict controls, source options and compact aliases', () => {
  for (const [mode, template] of [['popup', 'md_access_card'], ['slide', 'md_access_slide_action_card'], ['close', 'md_access_action_card']]) {
    const source = { template: 'md_access_card', entity: 'lock.safe', variables: { access_mode: mode, future: [] } };
    const before = structuredClone(source), result = runtime.accessCardConfig(source);
    assert.equal(result.template, template);
    assert.deepEqual(source, before);
    if (mode === 'close') assert.equal(result.variables.action_service, 'lock.lock');
  }
  assert.throws(() => runtime.accessCardConfig({template: 'md_access_card', entity: 'lock.safe', variables: {access_mode: 'slide'}, tap_action: {action:'toggle'}}), /strict slide/);
  assert.throws(() => runtime.accessCardConfig({template: 'md_access_card', entity: 'button.safe', variables: {access_mode: 'popup'}}), /incompatible/);
  assert.equal(runtime.accessCardConfig({template: 'md_access_card', entity: 'button.safe'}).template, 'md_access_hold_action_card');
  const old = {template:'md_access_slide_action_card', entity:'lock.safe', variables:{future:true}};
  assert.equal(runtime.accessCardConfig(old), old);
});

test("legacy access aliases retain strict slide controls without mutating saved configuration", t => {
  const config = { template: "hc_access_slide_action_card", entity: "lock.safe", variables: { hc_background_color: "#123456" } };
  const before = structuredClone(config);
  const card = new MaraoCard();
  card.setConfig(config);
  card.hass = { states: { "lock.safe": { state: "locked", attributes: {} } }, callService: async () => {} };
  card.connectedCallback();
  t.after(() => card.disconnectedCallback());
  assert.equal(card._config.template, "md_access_slide_action_card");
  assert.equal(card._config.variables.md_background_color, "#123456");
  assert.match(card.shadowRoot.innerHTML, /marao-slide-to-open/);
  assert.deepEqual(config, before);
});


test('alarm layout confirmation cannot cross layouts or bypass live and code guards', async t => {
  for (const layout of ['dropdown','grid']) {
    const calls=[];
    const card=alarm(t,{states:{[entity]:reported('armed_away',{code_format:'number'})},callService:async(...args)=>calls.push(args)});
    card.setConfig({template:'md_alarm_controls_card',entity,variables:{alarm_layout:layout}});
    const confirmation=layout==='dropdown'?'dropdown':'slide';
    card._alarmPIN='1234';
    await card._sendAlarm('alarm_disarm','hold');assert.equal(calls.length,0);
    await card._sendAlarm('alarm_disarm',confirmation);assert.equal(calls.length,1);
    assert.deepEqual(calls[0].slice(0,3),['alarm_control_panel','alarm_disarm',{entity_id:entity,code:'1234'}]);
    await card._sendAlarm('alarm_disarm',confirmation);assert.equal(calls.length,1);
    card.hass={...card._hass,connected:false};card._alarmPIN='1234';
    await card._sendAlarm('alarm_disarm',confirmation);assert.equal(calls.length,1);
    assert.equal(accessOpenerService(entity,'alarm_control_panel.alarm_disarm'),'');
  }
  const card=new MaraoCard();
  assert.throws(()=>card.setConfig({template:'md_security_card',entity,variables:{alarm_layout:'row'}}),/dropdown or grid/);
});


test('alarm layout validation and serialization preserve omission, names and unknown fields',()=>{
  const catalog={cards:[{id:'md_security_card',domains:['alarm_control_panel']}]};
  for(const layout of [undefined,'dropdown','grid','invalid']) {
    const config={config_version:2,name:'Safe',landing_page:'home',pages:[{path:'home',name:'Home',entities:[{id:'alarm',template:'md_security_card',entity_id:entity,name:'My alarm',variables:{future:true,...(layout===undefined?{}:{alarm_layout:layout})}}]}]};
    assert.deepEqual(serializeConfig(normalizeConfig(config)),config);
    const errors=validateConfig(config,2,undefined,{},catalog);
    if(layout==='invalid') assert.match(errors.join(' '),/dropdown or grid/);else assert.deepEqual(errors,[]);
  }
});


test('ventilation uses the native value, capability and command while retaining zero and refusing access covers',async()=>{
  for(const domain of ['fan','cover']) {
    const id=`${domain}.ventilation`, calls=[],card=new MaraoCard();
    const state={state:domain==='cover'?'open':'on',attributes:{supported_features:7,current_position:35,percentage:60}};
    card.setConfig({template:'md_fan_card',entity:id});
    card.hass={states:{[id]:state},callService:async(...args)=>calls.push(args)};
    assert.equal(card._sliderCurrent('md_fan_card',state.attributes),domain==='cover'?35:60);
    assert.match(card._range(id,state,'md_fan_card'),/type="range"/);
    await card._setRange(id,'md_fan_card',70);
    assert.deepEqual(calls[0].slice(0,3),[domain,domain==='cover'?'set_cover_position':'set_percentage',{entity_id:id,[domain==='cover'?'position':'percentage']:70}]);
    if(domain==='cover') {
      await card._coverAction(id,'open_cover');await card._coverAction(id,'close_cover');
      assert.deepEqual(calls.slice(1).map(call=>call.slice(0,2)),[['cover','open_cover'],['cover','close_cover']]);
      assert.doesNotMatch(card.shadowRoot.innerHTML,/data-card-action/);
    }
    const key=domain==='cover'?'current_position':'percentage';
    for(const invalid of [undefined,null,'',' ',false,'invalid',-1,101]) {
      state.attributes[key]=invalid;
      assert.equal(card._range(id,state,'md_fan_card'),'');
    }
    state.attributes[key]=0;assert.match(card._range(id,state,'md_fan_card'),/type="range"/);
    state.attributes.supported_features=0;
    assert.equal(card._range(id,state,'md_fan_card'),'');
    const count=calls.length;await card._setRange(id,'md_fan_card',80);assert.equal(calls.length,count);
    if(domain==='cover') {
      for(const attributes of [{device_class:'door'},{friendly_name:'Garage vent'}]) {
        state.attributes={...attributes,current_position:0,supported_features:7};card.hass={...card._hass,states:{[id]:{...state}}};
        await card._setRange(id,'md_fan_card',80);await card._coverAction(id,'open_cover');
        assert.equal(calls.length,count);assert.match(card.shadowRoot.innerHTML,/Use an access card/);
      }
    }
  }
  const card=new MaraoCard();card.setConfig({template:'md_light_card',entity:'light.safe'});
  assert.equal(card._sliderCurrent('md_light_card',{brightness:255}),100);
  assert.equal(card._sliderCurrent('md_cover_card',{current_position:null}),null);
});

test('damper defaults and explicit ventilation selections survive metadata refresh and round trips',()=>{
  const catalog={cards:[{id:'md_fan_card',domains:['fan','cover']},{id:'md_cover_card',domains:['cover']},{id:'md_access_card',domains:['cover','lock']}]};
  assert.equal(cardForEntity(catalog,{entity_id:'cover.airflow',device_class:'damper'}).id,'md_fan_card');
  assert.equal(cardForEntity(catalog,{entity_id:'cover.blind',device_class:'shutter'}).id,'md_cover_card');
  assert.equal(cardForEntity(catalog,{entity_id:'cover.garage_vent',device_class:'damper'}).id,'md_access_card');
  const config={config_version:2,name:'Ventilation',landing_page:'room',pages:[{path:'room',name:'Room',entities:[{id:'valve',entity_id:'cover.airflow',template:'md_fan_card',variables:{enable_slider:false,future:42}}]}]};
  assert.deepEqual(serializeConfig(normalizeConfig(config)),config);
  assert.deepEqual(validateConfig(config,2,[{entity_id:'cover.airflow',device_class:'shutter'}],{},catalog),[]);
  assert.match(validateConfig(config,2,[{entity_id:'cover.airflow',device_class:'gate'}],{},catalog).join(' '),/access card/);
});
