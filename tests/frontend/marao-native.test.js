import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { copy, patchForm, formData, entityMetadata, supportsEntity, previewHass } from "../../frontend_src/native-model.js";
import { catalog } from "../../custom_components/marao_dashboard/frontend/MaraoNativeCatalog.js";
import { nativeFields, MaraoNativeCardEditor } from "../../custom_components/marao_dashboard/frontend/MaraoNativeCardEditor.js";
import { MaraoNativeCard, MaraoStarterStrategy } from "../../custom_components/marao_dashboard/frontend/MaraoNativeCards.js";
import { MaraoCard, callServiceWithNotification, performAction } from "../../custom_components/marao_dashboard/frontend/MaraoCards.js";

for (const spec of catalog.cards) test(spec.label + ": editing a controlled field preserves unknown/empty/order data", () => {
  const original = { type: spec.type, name: "Old", future: { keep: [] }, entities: ["light.second", "light.first"],
    variables: { future: null, action_1: { segment: 21, data: { command: "app_segment_clean", params: [{ segments: [21], repeat: 2 }] } } },
    apple_tv: { remote_entity: "remote.safe", apps: [] } };
  const exact = copy(original);
  const { common, advanced } = nativeFields(spec, original);
  const fields = [...common, ...advanced], data = formData(original, fields);
  const result = patchForm(original, fields, data, { ...data, name: "New" });
  assert.deepEqual(original, exact);
  assert.deepEqual(result, { ...exact, name: "New" });
  for (const option of spec.variables.filter(option => !["number_list", "vacuum_action", "energy_sub_entities", "power_devices"].includes(option.kind)))
    assert.ok(fields.some(field => field.path === "variables." + option.key), "Missing native form option: " + option.key);
});

test("advanced vacuum params retain their native shape while another field changes", () => {
  const spec = catalog.cards.find(card => card.id === "md_vacuum_card");
  const config = { type: spec.type, variables: { action_1: { segment: 21, data: { command: "app_segment_clean", params: [{ segments: [21], repeat: 3 }] }, future: [] } } };
  const fields = nativeFields(spec, config).advanced, data = formData(config, fields);
  const changed = patchForm(config, fields, data, { ...data, "variables.action_1.icon": "mdi:sofa" });
  assert.deepEqual(changed.variables.action_1.data, config.variables.action_1.data);
  assert.deepEqual(changed.variables.action_1.future, []);
});

test("basic and advanced forms merge successive edits against the latest draft", () => {
  const previousDocument = globalThis.document;
  const forms = [];
  globalThis.document = { createElement: () => ({ addEventListener: (name, handler) => forms.push(handler) }) };
  try {
    const editor = Object.create(MaraoNativeCardEditor.prototype);
    editor._forms = []; editor._draft = { name: "Before", variables: { custom_label: "Before", future: [] }, future: {} };
    const changed = next => { editor._draft = next; };
    const original = editor._draft;
    const parent = { append() {} };
    editor._form(parent, [{ path: "name" }], original, changed, () => editor._draft);
    editor._form(parent, [{ path: "variables.custom_label" }], original, changed, () => editor._draft);
    forms[0]({ stopPropagation() {}, detail: { value: { name: "New name" } } });
    forms[1]({ stopPropagation() {}, detail: { value: { "variables.custom_label": "New label" } } });
    assert.deepEqual(editor._draft, { name: "New name", variables: { custom_label: "New label", future: [] }, future: {} });
  } finally { globalThis.document = previousDocument; }
});

test("automatic energy options are omitted and zero precision remains numeric", () => {
  const fields = [{ path: "variables.display_precision", kind: "energy_precision" }, { path: "variables.display_unit", kind: "energy_unit" }];
  const config = { variables: { display_precision: 2, display_unit: "kW", future: [] } };
  const data = formData(config, fields);
  assert.equal(patchForm(config, fields, data, { ...data, "variables.display_precision": "0" }).variables.display_precision, 0);
  assert.deepEqual(patchForm(config, fields, data, { "variables.display_precision": "auto", "variables.display_unit": "auto" }).variables, { future: [] });
});

test("entity metadata excludes values, PINs, artwork and unrelated entities", () => {
  const hass = { states: { "light.safe": { state: "on", attributes: { friendly_name: "Safe", supported_features: 1, secret: "hidden" } },
    "camera.private": { state: "streaming", attributes: { access_token: "hidden" } } } };
  const metadata = entityMetadata({ entity: "light.safe", variables: { members: ["light.safe"] } }, hass);
  assert.equal(metadata.length, 1);
  assert.equal(metadata[0].entity_id, "light.safe");
  assert.ok(!JSON.stringify(metadata).includes("hidden"));
  assert.ok(!JSON.stringify(metadata).includes('"state":'));
});

test("entity suggestions distinguish access covers and require deliberate service opener selection", () => {
  const hass = { states: { "cover.gate": { attributes: { device_class: "gate" } }, "cover.blind": { attributes: { device_class: "blind" } } } };
  const get = id => catalog.cards.find(card => card.id === id);
  assert.equal(supportsEntity(get("md_cover_card"), hass, "cover.gate"), false);
  assert.equal(supportsEntity(get("md_access_card"), hass, "cover.gate"), true);
  assert.equal(supportsEntity(get("md_cover_card"), hass, "cover.blind"), true);
  assert.equal(supportsEntity(get("md_access_slide_action_card"), hass, "button.safe"), false);
});

test("preview context disables actions without replacing reported state or history reads", async () => {
  let calls = 0;
  const hass = { connected: true, connection: { connected: true }, states: { "lock.safe": { state: "locked" } },
    callService: () => calls++, callWS: () => Promise.resolve("history") };
  const preview = previewHass(hass, true);
  assert.equal(preview.states, hass.states);
  assert.equal(preview.connected, false);
  assert.equal(preview.connection.connected, false);
  await assert.rejects(preview.callService("lock", "unlock"), /previews/);
  assert.equal(await preview.callWS({ type: "history" }), "history");
  assert.equal(calls, 0);
  assert.equal(previewHass(hass, false), hass);
});

class Probe extends MaraoNativeCard {
  static spec = catalog.cards.find(card => card.id === "md_light_card");
  isConnected = true;
  _status(message) { this.status = message; }
  async _mount(result) { this.result = result; }
}

test("shared native dispatch becomes inert immediately when HA enters edit mode", async () => {
  let calls = 0;
  const native = new Probe();
  const root = { localName: 'hui-root', lovelace: { editMode: false } };
  native.parentElement = root;
  const child = new MaraoCard(); child.nativeOwner = native;
  child._hass = { callService: () => { calls++; return Promise.resolve(); } };
  root.lovelace.editMode = true;
  assert.equal(native.preview, true);
  await child._callService('vacuum', 'start', { entity_id: 'vacuum.safe' });
  assert.equal(calls, 0);
  root.lovelace.editMode = false;
  await child._callService('vacuum', 'start', { entity_id: 'vacuum.safe' });
  assert.equal(calls, 1);
});

test("shared dispatch keeps access safe after classification changes while preserving blind actions", async () => {
  const calls = [], outcomes = [];
  const hass = { states: {
    'cover.safe': { state: 'closed', attributes: { device_class: 'blind', current_position: 0 } },
    'lock.safe': { state: 'locked', attributes: {} },
  }, callService: async (...args) => calls.push(args) };
  await performAction(hass, { action: 'call-service', service: 'cover.open_cover', service_data: { entity_id: 'cover.safe', future: [] } });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][2], { entity_id: 'cover.safe', future: [] });
  hass.states['cover.safe'].attributes.device_class = 'gate';
  await callServiceWithNotification(hass, 'cover', 'open_cover', { entity_id: 'cover.safe' }, status => outcomes.push(status));
  await performAction(hass, { action: 'toggle' }, 'cover.safe');
  await callServiceWithNotification(hass, 'lock', 'unlock', { entity_id: 'lock.safe' });
  await callServiceWithNotification(hass, 'cover', 'set_cover_position', { entity_id: 'cover.safe', position: 100 });
  assert.equal(calls.length, 1, 'A classification change bypassed the strict access slide');
  assert.deepEqual(outcomes, ['error']);
  await callServiceWithNotification(hass, 'cover', 'open_cover', { entity_id: 'cover.safe' }, undefined, undefined, { accessSlide: true });
  await callServiceWithNotification(hass, 'cover', 'close_cover', { entity_id: 'cover.safe' });
  assert.equal(calls.length, 3, 'Completed slides and explicit safe closing remain usable');
});

test("native compilation deduplicates unrelated updates and rejects obsolete completion", async () => {
  const requests = [];
  const hass = { states: { "light.safe": { state: "off", attributes: { friendly_name: "Safe" } } },
    callWS: message => new Promise(resolve => requests.push({ message, resolve })) };
  const card = new Probe();
  card.setConfig({ type: Probe.spec.type, entity: "light.safe" }); card.hass = hass;
  card.hass = { ...hass, states: { ...hass.states, "sensor.other": { state: "1" } } };
  assert.equal(requests.length, 1);
  card.setConfig({ type: Probe.spec.type, entity: "light.safe", name: "New" });
  assert.equal(requests.length, 2);
  requests[1].resolve({ card: { name: "New" }, popups: [] }); await new Promise(resolve => setImmediate(resolve));
  requests[0].resolve({ card: { name: "Old" }, popups: [] }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(card.result.card.name, "New");
  card.disconnectedCallback();
});

test("duplicate native instances and explicit references remain distinct", () => {
  const one = new Probe(), two = new Probe();
  assert.notEqual(one._instance, two._instance);
  one.setConfig({ type: Probe.spec.type, entity: "light.safe", variables: { popup_hash: "#authored" } });
  assert.equal(one._config.variables.popup_hash, "#authored");
});

test("starter uses native registries and the read-only compiler without dashboard writes", async () => {
  const requests = [];
  const hass = { states: { "light.safe": { state: "off", attributes: { friendly_name: "Safe" } } }, panels: { lovelace: { title: "Native" } },
    callWS: async message => {
      requests.push(message);
      if (message.type.endsWith("entity_registry/list")) return [{ entity_id: "light.safe", device_id: "device" }];
      if (message.type.endsWith("area_registry/list")) return [{ area_id: "area", name: "Room" }];
      if (message.type.endsWith("device_registry/list")) return [{ id: "device", area_id: "area" }];
      assert.equal(message.type, "marao_dashboard/native/starter");
      assert.equal(message.entities[0].area_id, "area");
      return { config: { marao: { mode: "native", version: 1 }, views: [] } };
    } };
  assert.deepEqual(await MaraoStarterStrategy.generate({}, hass), { marao: { mode: "native", version: 1 }, views: [] });
  assert.ok(requests.every(message => !/save|create|generate|restore/.test(message.type)));
});

test("native assets keep content fingerprints and avoid bundling the lazy editor into cards", async () => {
  const source = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoNativeCards.js", import.meta.url), "utf8");
  assert.ok(source.includes("MaraoNativeCardEditor.js"));
  assert.ok(source.includes("import.meta.url"));
  assert.ok(!source.includes("class MaraoNativeCardEditor"));
});

test('camera title controls are basic, default visibly on without a write, and retain retired settings', () => {
  const spec = catalog.cards.find(card => card.id === 'md_camera_card');
  const original = { type: spec.type, name: 'Entrance', icon: 'mdi:cctv', show_state: true, show_label: false, future: [] };
  const { common, advanced } = nativeFields(spec, original), fields = [...common, ...advanced];
  assert.equal(common.find(field => field.path === 'entity').label, 'Dashboard stream');
  assert.deepEqual(common.find(field => field.path === 'variables.popup_stream_entity').domains, ['camera']);
  assert.equal(common.find(field => field.path === 'name').label, 'Title');
  assert.equal(common.find(field => field.path === 'show_name').label, 'Show title');
  assert.equal(fields.some(field => ['icon','show_icon','show_state','show_label'].includes(field.path)), false);
  const data = formData(original, fields);
  assert.equal(data.show_name, true);
  assert.equal(data['variables.preload_stream'], false);
  assert.equal(patchForm(original, fields, data, {...data, 'variables.preload_stream': true}).variables.preload_stream, true);
  assert.deepEqual(patchForm(original, fields, data, {...data}), original);
  const hidden = patchForm(original, fields, data, {...data, show_name: false});
  assert.deepEqual(hidden, {...original, show_name: false});
  const roundtrip = JSON.parse(JSON.stringify(hidden));
  assert.equal(formData(roundtrip, fields).show_name, false);
  assert.deepEqual(patchForm(roundtrip, fields, formData(roundtrip, fields), {...formData(roundtrip, fields), name: 'Front door'}), {...hidden, name: 'Front door'});
});

test('critical native navbar converts locally and preserves complete configuration without a server', async () => {
  const { MaraoNativeNavbar } = await import('../../custom_components/marao_dashboard/frontend/MaraoNativeNavbar.js');
  const { MaraoNavbarCard } = await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js');
  assert.deepEqual(MaraoNativeNavbar.getStubConfig({language:'en'}),{name:'Navbar',routes:[],native:true});
  assert.deepEqual(MaraoNativeNavbar.getStubConfig({language:'pt'}),{name:'Barra de navegação',routes:[],native:true});
  const child = Object.assign(Object.create(MaraoNavbarCard.prototype), { _closeOverflow() {}, _render() {} });
  const owner = { _child: child, _editAccess() {} };
  const source = { type:'custom:marao-native-navbar-card', native:true, show_cache_reset:false, routes:[{path:'/marao-dashboard/rooms',label:'Rooms',future:[]}], future:{keep:[]} };
  MaraoNativeNavbar.prototype.setConfig.call(owner, source);
  assert.deepEqual(child._config, {...source,type:'custom:marao-navbar-card'});
  assert.deepEqual(owner._config,source);assert.notEqual(owner._config,source);
  const fields=nativeFields(catalog.cards.find(spec=>spec.id==='navbar'),source).common;
  assert.equal(formData(source,fields).show_cache_reset,false);
  assert.equal(formData({},fields).show_cache_reset,true);
  assert.throws(()=>MaraoNativeNavbar.prototype.setConfig.call(owner,{...source,show_cache_reset:'false'}),/boolean/);
  assert.throws(()=>MaraoNativeNavbar.prototype.setConfig.call(owner,{...source,routes:[null]}));
  assert.deepEqual(owner._config,source);
  MaraoNativeNavbar.prototype.setConfig.call(owner,{...source,routes:[]});assert.deepEqual(child._config.routes,[]);
});

test('missing presentation metadata does not recompile native cards or retain live readings', async () => {
  let calls=0;
  const hass={states:{'light.safe':{state:'on',attributes:{friendly_name:'Safe light',supported_features:1}}},callWS:async()=>{calls++;return {card:{name:'Safe light'},popups:[]};}};
  const card=new Probe(); card.setConfig({type:Probe.spec.type,entity:'light.safe'});card.hass=hass;
  await new Promise(resolve=>setImmediate(resolve));
  card.hass={...hass,states:{'light.safe':{state:'unavailable',attributes:{}}}};
  card.hass={...hass,states:{}};
  assert.equal(calls,1);
  assert.deepEqual(card._hass.states,{});
  assert.equal(card.result.card.name,'Safe light');
  card.disconnectedCallback();
});
