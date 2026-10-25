import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import * as model from "../../frontend_src/editor-model.js";
import { PT_LABELS, MOVE_PT_LABELS } from "../../frontend_src/editor-labels.js";
import { prepareJson } from '../../frontend_src/json-preparation.js';

const source = await fs.readFile(new URL("../../frontend_src/MaraoDashboardPanel.js", import.meta.url), "utf8");
let Panel;
let confirmations;
const context = vm.createContext({
  ...model,
  cameraTitleFields: model.cameraTitleFields, formData: model.formData,
  patchForm: model.patchForm, sameFormValue: model.sameFormValue,
  performance, URL, AbortController, setTimeout, clearTimeout,
  document: { hidden: false },
  requestAnimationFrame: callback => callback(),
  PT_LABELS, MOVE_PT_LABELS,
  HTMLElement: class { attachShadow() { this.shadowRoot = { querySelector() { return null; } }; } },
  customElements: { get() {}, define(_name, value) { Panel = value; } },
  BRAND_MARK: '/brand/mark.svg?v=test', BRAND_MARK_DARK: '/brand/mark-dark.svg?v=test',
  confirm: (message) => { confirmations.push(message); return false; },
});
// Execute the actual panel with only browser/Monaco imports omitted.
vm.runInContext(source.slice(source.indexOf("const TEXT =")).replaceAll("import.meta.url", '"https://example.invalid/MaraoDashboardPanel.js?v=test"'), context);

test("vacuum native command data is editable and survives sibling option changes", () => {
  const p = new Panel();
  const fields = p._expandedFields([{ key: "action_1", label: "Action 1", kind: "vacuum_action" }]);
  const dataField = fields.find(field => field.key === "action_1.data");
  assert.deepEqual(JSON.parse(JSON.stringify(p._variableSchema(dataField).selector)), { object: {} });
  const data = { command: "app_segment_clean", params: [{ segments: [21], repeat: 1 }] };
  const variables = { action_1: { segment: 21, data } };
  p._writeVariable(variables, fields.find(field => field.key === "action_1.icon"), "mdi:sofa");
  assert.deepEqual(variables.action_1.data, data);
  p._writeVariable(variables, dataField, { command: "app_segment_clean", params: [{ segments: [22], repeat: 1 }] });
  assert.deepEqual(variables.action_1.data.params, [{ segments: [22], repeat: 1 }]);
});

function panel(config) {
  confirmations = [];
  const p = new Panel();
  p._labelModule = { PT_LABELS, MOVE_PT_LABELS };
  p._model = model.normalizeConfig(config);
  p._savedSource = p._source();
  p._catalog = { supported_domains: ["light"] };
  p._contextReady = true;
  p._entities = [{ entity_id: "light.test", domain: "light", area_id: "office" }];
  p._hass = { callWS() { assert.fail("A local deletion must not save or delete an HA entity"); } };
  p._updateHeader = () => {};
  p._setStatus = () => {};
  p._moveHaptic = () => {};
  p._renderVisual = () => { p.renders = (p.renders || 0) + 1; };
  return p;
}

const canonical = () => ({ config_version: 2, name: 'Safe', landing_page: 'home', navigation: ['home'], pages: [
  { name: 'Home', path: 'home', sections: [{ entities: [{ id: 'first', entity_id: 'light.test' }, { id: 'second', entity_id: 'light.test', name: 'Duplicate' }], future: true }] },
  { name: 'Office', path: 'office', entities: [{ page: 'home', name: 'Back home' }], cards: [{ type: 'markdown', content: 'Saved note' }] },
] });

test('General cache reset toggle preserves its default, explicit false and unrelated settings', () => {
  for (const source of [{name:'Legacy',rooms:[]}, canonical()]) {
    const p=panel({...source,future:{keep:[]}}), before=p._source();
    let form;
    p._mountForm=(host,data,schema,changed)=>{form={data,schema,changed};};
    p._mountGeneralForm({});
    assert.equal(form.data.show_cache_reset,true);
    assert.equal(p._source(),before,'Opening General must not write a default');
    assert.deepEqual(JSON.parse(JSON.stringify(form.schema.find(field=>field.name==='show_cache_reset').selector)),{boolean:{}});
    form.changed({...form.data,show_cache_reset:false});
    const saved=JSON.parse(p._source());
    assert.equal(saved.show_cache_reset,false);
    assert.deepEqual(saved.future,{keep:[]});
    p._mountGeneralForm({});assert.equal(form.data.show_cache_reset,false);
    assert.ok(!model.validateConfig(saved,2).some(error=>error.includes('cache reset')));
    assert.ok(model.validateConfig({...saved,show_cache_reset:'false'},2).some(error=>error.includes('must be a boolean')));
  }
  const schema=model.buildJsonSchema({cards:[],pages:{},config_version:2},[]);
  assert.equal(schema.allOf[0].then.properties.show_cache_reset.type,'boolean');
});

test('unchanged Visual/JSON switching retains exact text, model history and view state', async () => {
  const p = panel(canonical()); p._loaded = true; p._tab = 'json'; p.isConnected = true;
  p._catalog = { config_version: 2, cards: [], pages: {} };
  const source = JSON.stringify(canonical()), view = { selection: [4, 9], scrollTop: 120, folds: [2] };
  let restored;
  p._monaco = { getValue: () => source, setValue: () => assert.fail('Unchanged text resets undo history'),
    saveViewState: () => view, restoreViewState: value => { restored = value; }, layout() {} };
  p._ensureMonaco = async () => {};
  p._setStatus = () => {};
  p.shadowRoot = { querySelectorAll: () => [], getElementById: () => ({}) };
  context.requestAnimationFrame = callback => callback();
  await p._switchTab('visual'); assert.equal(p._jsonDraft, source);
  await p._switchTab('json'); assert.equal(restored, view);
});

test('successful legacy preview replaces the JSON draft only after canonical validation', async () => {
  const source = canonical(), p = panel(source);
  p._loaded = true; p._tab = 'json'; p.isConnected = true;
  p._catalog = { config_version: 2, cards: [], pages: {} };
  p._jsonDraft = JSON.stringify({ name: 'Legacy', rooms: [] });
  let json = p._jsonDraft;
  p._monaco = { getValue: () => json, setValue: value => { json = value; } };
  p._hass = { callWS: async () => ({ config: JSON.stringify({ ...source, pages: [{ name: 'Home', path: 'home', entities: [] }] }) }) };
  p.shadowRoot = { querySelectorAll: () => [], getElementById: () => ({}) };
  p._setStatus = () => {}; p._ensureMonaco = async () => {};
  await p._switchTab('visual');
  assert.equal(p._jsonDraft, null);
  context.requestAnimationFrame = callback => callback();
  p._monaco.layout = () => {};
  await p._switchTab('json');
  assert.equal(JSON.parse(json).config_version, 2);
  assert.equal(JSON.parse(json).name, 'Safe');
});

test('canonical section card delete and reorder use the existing local card controls', () => {
  const p = panel(canonical());
  p._roomAction({ dataset: { action: 'card-up', kind: 'page', room: '0:0', card: '1' } });
  assert.equal(JSON.parse(p._source()).pages[0].sections[0].entities[0].id, 'second');
  p._roomAction({ dataset: { action: 'card-delete', kind: 'page', room: '0:0', card: '0' } });
  const saved = JSON.parse(p._source());
  assert.equal(saved.pages[0].sections[0].entities[0].id, 'first');
  assert.equal(saved.pages[0].sections[0].future, true);
  assert.deepEqual(saved.pages[1].cards, [{ type: 'markdown', content: 'Saved note' }]);
  assert.deepEqual(confirmations, []);
});

test('page manager unpin preserves contents and page ordering remains separate from navbar order', () => {
  const p = panel(canonical());
  p._pageAction({ dataset: { action: 'page-pin', room: '0' } });
  assert.deepEqual(JSON.parse(p._source()).navigation, []);
  assert.equal(p._model.pages.length, 2);
  p._pageAction({ dataset: { action: 'page-pin', room: '1' } });
  p._pageAction({ dataset: { action: 'page-up', room: '1' } });
  const saved = JSON.parse(p._source());
  assert.deepEqual(saved.navigation, ['office']);
  assert.deepEqual(saved.pages.map(page => page.path), ['office', 'home']);
  assert.equal(saved.landing_page, 'home');
});

test('page manager duplicates privately and exposes all unpinned pages as shortcut targets', () => {
  const p = panel(canonical()), original = JSON.parse(p._source());
  p._pageAction({ dataset: { action: 'page-duplicate', room: '0' } });
  const saved = JSON.parse(p._source());
  assert.equal(saved.pages[1].path, 'home-copy');
  assert.deepEqual(saved.pages[0], original.pages[0]);
  assert.deepEqual(saved.navigation, original.navigation);
  assert.equal(p._availablePages().length, 3);
  assert.equal(p._container('page', '1:0').entities.length, 2);
});

test('named page deletion requires confirmation and explicit replacement before any source change', () => {
  const p = panel(canonical()), before = p._source();
  let dialog;
  p._openFormDialog = (title, data, schema, save) => { dialog = { title, data, schema, save }; };
  p._openPageDeleteDialog(0);
  assert.match(dialog.title, /Delete page: Home/);
  assert.throws(() => dialog.save({ confirm_delete: false, replacement: 'office' }), /Confirm/);
  assert.throws(() => dialog.save({ confirm_delete: true, replacement: '' }), /replacement/);
  assert.equal(p._source(), before);
  dialog.save({ confirm_delete: true, replacement: 'office' });
  const saved = JSON.parse(p._source());
  assert.equal(saved.landing_page, 'office');
  assert.deepEqual(saved.navigation, ['office']);
  assert.equal(saved.pages[0].entities[0].page, 'office');
});

test('page manager pins a sixth entry without dropping existing selections', () => {
  const p = panel(canonical());
  p._model.navigation = ['home', { url: '/one', label: 'One' }, { url: '/two', label: 'Two' }, { url: '/three', label: 'Three' }, { url: '/four', label: 'Four' }];
  const before = p._source();
  p._setStatus = (message, kind) => { p.status = { message, kind }; };
  p._pageAction({ dataset: { action: 'page-pin', room: '1' } });
  assert.deepEqual(JSON.parse(p._source()).navigation, [...JSON.parse(before).navigation, 'office']);
});

test('shared numeric-list fields retain explicit empty presets and reject invalid input', () => {
  const p = panel(canonical()), field = { key: 'shortcuts', kind: 'number_list', default: [] }, options = { future: true, shortcuts: [] };
  assert.equal(p._readVariable(options, field), '');
  p._writeVariable(options, field, '6, 12, 16');
  assert.deepEqual(JSON.parse(JSON.stringify(options)), { future: true, shortcuts: [6, 12, 16] });
  p._writeVariable(options, field, '');
  assert.deepEqual(JSON.parse(JSON.stringify(options.shortcuts)), []);
  assert.throws(() => p._writeVariable(options, field, '6, incorrect'), /finite/);
  assert.throws(() => p._writeVariable(options, field, '1, 2, 3, 4'), /three/);
  assert.deepEqual(JSON.parse(JSON.stringify(options)), { future: true, shortcuts: [] });
});

test('canonical page rename uses the actual dashboard root and preserves external links', () => {
  const p = panel(canonical());
  p._dashboardUrl = '/marao-custom/home';
  p._model.pages[1].cards.push({ type: 'custom:marao-card', tap_action: { navigation_path: '/marao-custom/home' } });
  let save;
  p._openFormDialog = (_title, _data, _schema, callback) => { save = callback; };
  p._openPageDialog(0);
  save({ name: 'Renamed', path: 'renamed', icon: 'mdi:home' });
  const saved = JSON.parse(p._source());
  assert.equal(saved.pages[1].cards[1].tap_action.navigation_path, '/marao-custom/renamed');
  assert.equal(saved.pages[1].entities[0].page, 'renamed');
  assert.equal(saved.landing_page, 'renamed');
});

const entries = [
  { entity_id: "light.test", name: "First", variables: { future: 42 } },
  { page: "overview", name: "Home", unknown: { keep: true } },
  { entity_id: "light.test", name: "Duplicate", variables: { color: "red" } },
];

for (const kind of ['room', 'custom']) test(`duplicating a ${kind} renews group identity without changing members/options`, () => {
  const group = { template: 'md_entity_group_card', id: 'original', name: 'Group', entity_type: 'light', entities: [{ entity_id: 'light.test', variables: { enable_slider: false }, future: 42 }], future: true };
  const p = panel({ name: 'Home', rooms: [{ name: 'Office', entities: [group] }], pages: { custom: [{ name: 'Studio', path: 'studio', entities: [group] }] } });
  p._roomAction({ dataset: { action: kind === 'room' ? 'room-duplicate' : 'custom-duplicate', kind, room: '0' } });
  const containers = kind === 'room' ? p._model.rooms : p._model.pages.custom;
  assert.equal(containers[0].entities[0].id, 'original');
  assert.match(containers[1].entities[0].id, /^group-[a-f0-9]{32}$/);
  const copy = JSON.parse(JSON.stringify(containers[1].entities[0]));
  copy.id = 'original'; delete copy.__simple;
  assert.deepEqual(copy, group);
});

test('ordered overview group controls reuse local move/delete without backend calls', () => {
  const groups = ['first', 'second'].map(id => ({ template: 'md_entity_group_card', id, name: id, entity_type: 'light', entities: [] }));
  const p = panel({ name: 'Home', rooms: [], overview: { entity_groups: groups, future: true } });
  assert.equal(p._source(), p._savedSource);
  assert.equal(Boolean(p._dirty), false);
  p._roomAction({ dataset: { action: 'card-up', kind: 'overview', room: '0', card: '1' } });
  assert.deepEqual(JSON.parse(p._source()).overview.entity_groups.map(group => group.id), ['second', 'first']);
  p._roomAction({ dataset: { action: 'card-delete', kind: 'overview', room: '0', card: '0' } });
  p._roomAction({ dataset: { action: 'card-delete', kind: 'overview', room: '0', card: '0' } });
  assert.deepEqual(JSON.parse(p._source()).overview, { entity_groups: [], future: true });
  assert.deepEqual(confirmations, []);
});

test('group save errors localize the reason while preserving target identity', () => {
  const p = panel({ name: 'Home', rooms: [] });
  p._hass = { language: 'pt' };
  assert.equal(p._error(new Error('Entity Group has an incompatible member: office, light.test')), 'O grupo tem um membro incompatível: office, light.test');
  assert.equal(p._error(new Error('Entity Group popup hash conflicts with another popup.')), 'A referência do popup do grupo já é usada por outro popup.');
});

test('upgrade resource and recovery errors remain readable in English and Portuguese', () => {
  const p = panel({ name: 'Home', rooms: [] });
  const messages = [
    'Resources changed during dashboard preflight', 'Resources changed during dashboard cleanup',
    'Legacy resource persistence failed', 'A legacy resource changed independently during recovery',
    'A legacy resource has no recoverable identity', 'Cannot retain the existing resource baseline',
    'Invalid dashboard operation targets', 'Dashboard files changed during preflight',
    'Dashboard recovery failed; exact private copies remain in .history/.operation. Resolve the reported file conflict before retrying.',
  ];
  for (const message of messages) {
    p._hass = { language: 'en' };
    assert.equal(p._error(new Error(message)), message);
    p._hass = { language: 'pt-PT' };
    assert.notEqual(p._error(new Error(message)), message);
  }
  assert.match(p._error(new Error(messages.at(-1))), /\.history\/\.operation/);
});
for (const kind of ["room", "custom"]) for (const index of [0, 1, 2]) {
  test(`${kind}: deleting occurrence ${index} is immediate and preserves other content`, () => {
    const config = { name: "Home", overview: {}, extension: { keep: true },
      rooms: [{ name: "Office", columns: 1, entities: entries, cards: [{ type: "markdown", content: "Raw" }] }],
      pages: { custom: [{ name: "Studio", path: "studio", columns: 1, entities: entries, future: [1, 2] }] } };
    const expected = JSON.parse(JSON.stringify(config));
    const container = kind === "room" ? expected.rooms[0] : expected.pages.custom[0];
    container.entities.splice(index, 1);
    const p = panel(config);
    p._roomAction({ dataset: { action: "card-delete", room: "0", kind, card: String(index) } });
    assert.deepEqual(JSON.parse(p._source()), expected);
    assert.equal(p._dirty, true);
    assert.equal(p.renders, 1);
    assert.deepEqual(confirmations, []);
    assert.deepEqual(config.rooms[0].entities, entries);
  });
}

test("deleting an occurrence never reimports the suggestion area", () => {
  const p = panel({ name: "Home", rooms: [{ name: "Office", columns: 1, area: "office", entities: ['light.test'], extension: true }] });
  p._roomAction({ dataset: { action: "card-delete", room: "0", card: "0" } });
  assert.deepEqual(JSON.parse(p._source()).rooms, [{ name: "Office", columns: 1, area: "office", extension: true, entities: [] }]);
  assert.equal(p._dirty, true);
  assert.deepEqual(confirmations, []);
});

test("whole-container deletion and dirty discard still require confirmation", () => {
  const config = { name: "Home", overview: {}, rooms: [{ name: "Office", columns: 1, entities: entries }],
    pages: { custom: [{ name: "Studio", path: "studio", columns: 1, entities: entries }] } };
  const p = panel(config);
  p._roomAction({ dataset: { action: "room-delete", room: "0" } });
  p._roomAction({ dataset: { action: "custom-delete", room: "0", kind: "custom" } });
  assert.deepEqual(JSON.parse(p._source()), config);
  p._dirty = true;
  p._load = () => assert.fail("Cancelled discard must retain the draft");
  p._discard();
  assert.deepEqual(confirmations, ["Delete Office?", "Delete Studio?", "Discard all unsaved changes?"]);
});

function loadingPanel(callWS) {
  const p=panel({name:'Draft',rooms:[],overview:{},pages:{}});
  p.isConnected=true;
  p._hass={callWS};
  p._contextReady=false;
  p._startJsonPreparation=()=>{};
  p._nativeVisualReady=async()=>{p._visualReady=true;};
  p.shadowRoot={getElementById:()=>({href:''}),querySelector:()=>null};
  p._setBusy=value=>{p._busy=value;};
  p._setStatus=(message,kind)=>{p.status={message,kind};};
  return p;
}

test('entity summaries warn for raw references and respect the effective entity area', () => {
  const p = panel({ name: 'Home', rooms: [{ name: 'Office', entities: ['light.test'], cards: [{ type: 'custom:example', entity: 'light.raw' }] }] });
  p._entities.push({ entity_id: 'light.raw', name: 'Raw light', area_id: 'office', device_area_name: 'Other room', state: 'off' });
  const host = {};
  p._renderSummary(host, 'light.raw', { label: 'Light' }, 0, null);
  assert.match(host.innerHTML, /Already added to this page/);
  assert.ok(!host.innerHTML.includes('Other room'));
  p._renderSummary(host, 'light.test', { label: 'Light' }, 0, 0);
  assert.ok(!host.innerHTML.includes('Already added to this page'));
});
const payload={config:JSON.stringify({name:'Saved',rooms:[],overview:{},pages:{}}),
  editor:{catalog:{cards:[]},entities:[],areas:[]},history:[],dashboard_url:'/marao-dashboard'};

test('the decorative header mark follows Home Assistant theme changes', () => {
  const p = panel({ name: 'Home', rooms: [] });
  const mark = {};
  p.shadowRoot.querySelector = () => mark;
  p.hass = { themes: { darkMode: true } };
  assert.equal(mark.src, '/brand/mark-dark.svg?v=test');
  p.hass = { themes: { darkMode: false } };
  assert.equal(mark.src, '/brand/mark.svg?v=test');
});

test('configuration loading is single-flight, early JSON cannot initialize, and failure needs explicit retry',async()=>{
  let reject;let calls=0;
  const p=loadingPanel(()=>{calls++;return new Promise((_resolve,fail)=>{reject=fail;});});
  const first=p._load();assert.equal(p._load(),first);
  await p._switchTab('json');assert.equal(p._tab,'visual');
  assert.equal(calls,1);reject(new Error('Unavailable'));await first;
  const draft=p._source();
  p.hass={callWS:()=>{calls++;return Promise.resolve(payload);}};
  p.hass=p._hass;
  assert.equal(calls,1);assert.equal(p._source(),draft);
  assert.equal(p._retryKind,'config');
  await p._load(true);assert.equal(calls,2);assert.equal(p._loaded,true);
  assert.equal(JSON.parse(p._source()).name,'Saved');
});

test('late configuration response cannot replace a removed panel or its draft',async()=>{
  let resolve;const p=loadingPanel(()=>new Promise(done=>{resolve=done;}));
  const before=p._source();const loading=p._load();await Promise.resolve();
  p.isConnected=false;p._lifecycle++;resolve(payload);await loading;
  assert.equal(p._source(),before);assert.equal(p._loaded,false);
});

test('a failed explicit reload preserves the loaded unsaved document',async()=>{
  const p=loadingPanel(()=>Promise.reject(new Error('Unavailable')));
  p._loaded=true;p._model.name='Unsaved';p._dirty=true;const before=p._source();
  await p._load(true);
  assert.equal(p._source(),before);assert.equal(p._dirty,true);assert.equal(p._loaded,true);
});


test('synchronous configuration errors release the in-flight attempt for retry', async()=>{
 const p=loadingPanel(()=>{throw new Error('Disconnected');});
 await p._load();assert.equal(p._loading,null);
 p._hass={callWS:()=>Promise.resolve(payload)};await p._load(true);
 assert.equal(p._loaded,true);
});

test('Add metadata refresh is single-flight and cannot replace unsaved Visual or JSON state', async () => {
  let resolve, calls = 0;
  const p = loadingPanel(() => { calls++; return new Promise(done => { resolve = done; }); });
  p._loaded = true; p._dirty = true; p._model.name = 'Unsaved'; p._jsonDraft = '{ local JSON draft }';
  p._monaco = { getValue: () => p._jsonDraft, setValue: () => assert.fail('Metadata must not replace Monaco') };
  const before = p._source(), draft = p._jsonDraft, model = p._model;
  const first = p._refreshEditorMetadata(); assert.equal(p._refreshEditorMetadata(), first);
  await Promise.resolve(); assert.equal(calls, 1);
  resolve({ ...payload, editor: { catalog: { cards: [] }, entities: [{ entity_id: 'light.new' }], areas: [{ area_id: 'office' }] } });
  await first;
  assert.equal(p._model, model); assert.equal(p._source(), before); assert.equal(p._jsonDraft, draft); assert.equal(p._dirty, true);
  assert.equal(p._entities[0].entity_id, 'light.new'); assert.equal(p._metadataLoading, null);
});

test('failed metadata refresh retains draft and old metadata until a deliberate retry', async () => {
  let calls = 0;
  const p = loadingPanel(() => { calls++; throw new Error('Disconnected'); });
  p._loaded = true; p._dirty = true;
  const before = p._source(), entities = p._entities;
  await assert.rejects(p._refreshEditorMetadata(), /Disconnected/);
  assert.equal(p._source(), before); assert.equal(p._entities, entities); assert.equal(p._dirty, true);
  assert.equal(p._metadataLoading, null);
  p.hass = { callWS: () => { calls++; return Promise.resolve({ editor: { catalog: { cards: [] }, entities: [], areas: [] } }); } };
  assert.equal(calls, 1);
  await p._refreshEditorMetadata(); assert.equal(calls, 2);
});

test('late metadata responses cannot update a reconnected panel lifecycle', async () => {
  let resolve; const p = loadingPanel(() => new Promise(done => { resolve = done; }));
  const entities = p._entities;
  const loading = p._refreshEditorMetadata(); await Promise.resolve();
  p._lifecycle++;
  resolve({ editor: { catalog: { cards: [] }, entities: [{ entity_id: 'light.stale' }], areas: [] } });
  await loading; assert.equal(p._entities, entities); assert.equal(p._metadataLoading, null);
});

test('HA registry snapshots and new states invalidate metadata, ordinary state changes do not', () => {
  const p = panel(canonical()); p.isConnected = true; p._loaded = true;
  let refreshes = 0;
  p._scheduleMetadataRefresh = () => { refreshes++; };
  const form = {};
  p.shadowRoot.querySelectorAll = () => [form];
  const entities = {}, areas = {}, devices = {}, connection = {};
  p.hass = { entities, areas, devices, connection, connected: true, states: { 'light.test': {} } };
  refreshes = 0;
  const before = p._source();
  p.hass = { ...p._hass, states: { 'light.test': { state: 'on' } } };
  assert.equal(refreshes, 0);
  assert.equal(form.hass, p._hass, 'Native HA forms receive the current hass object');
  p.hass = { ...p._hass, entities: { 'light.new': {} } };
  assert.equal(refreshes, 1);
  p.hass = { ...p._hass, states: { ...p._hass.states, 'light.new': {} } };
  assert.equal(refreshes, 2);
  p.hass = { ...p._hass, areas: { office: {} } };
  p.hass = { ...p._hass, devices: { device: {} } };
  p.hass = { ...p._hass, connected: false };
  p.hass = { ...p._hass, connected: true };
  assert.equal(refreshes, 5);
  assert.equal(p._source(), before);
});

test('live metadata coalesces events, refreshes after older work and cancels on removal', async () => {
  const oldSet = context.setTimeout, oldClear = context.clearTimeout;
  let next = 0;
  const timers = new Map();
  context.setTimeout = callback => { timers.set(++next, callback); return next; };
  context.clearTimeout = id => timers.delete(id);
  try {
    let resolve, calls = 0, updates = 0;
    const p = loadingPanel(() => { calls++; return new Promise(done => { resolve = done; }); });
    p._loaded = true; p._dirty = true; p._jsonDraft = '{ unsaved }';
    const before = p._source();
    p.shadowRoot.querySelectorAll = () => [{ _metadataUpdated() { updates++; } }];
    const older = p._ensureEditorContext(); await Promise.resolve();
    p._scheduleMetadataRefresh(); p._scheduleMetadataRefresh();
    assert.equal(timers.size, 1);
    const callback = [...timers.values()][0]; timers.clear();
    const refreshed = callback();
    resolve({ editor: { entities: [], areas: [], catalog: { cards: [] } } });
    await older; await Promise.resolve(); await Promise.resolve();
    assert.equal(calls, 2, 'A registry change cannot reuse an older in-flight snapshot');
    resolve({ editor: { entities: [{ entity_id: 'light.new' }], areas: [], catalog: { cards: [] } } });
    await refreshed;
    assert.equal(p._entities[0].entity_id, 'light.new'); assert.equal(updates, 2);
    assert.equal(p._source(), before); assert.equal(p._jsonDraft, '{ unsaved }'); assert.equal(p._dirty, true);
    p._scheduleMetadataRefresh(); const cancelled = [...timers.values()][0];
    p.isConnected = false; p.disconnectedCallback();
    assert.equal(timers.size, 0);
    await cancelled(); assert.equal(calls, 2, 'Removed panels cannot request metadata');
  } finally { context.setTimeout = oldSet; context.clearTimeout = oldClear; }
});

test('energy controls retain explicit zero and Auto removes only its override',()=>{
  const p=panel({name:'Energy',rooms:[]});
  const precision={key:'display_precision',kind:'energy_precision',label:'Decimal places'};
  const unit={key:'display_unit',kind:'energy_unit',label:'Display unit'};
  p._catalog.energy_units={W:['power',1],kW:['power',1000],Wh:['energy',1],kWh:['energy',1000]};
  p._entities=[{entity_id:'sensor.power',unit_of_measurement:'W'}];
  assert.equal(p._readVariable({display_precision:0},precision),'0');
  assert.equal(p._readVariable({},precision),'auto');
  const variables={future:true,power_unit:'MW',display_unit:'kW'};
  p._writeVariable(variables,precision,'0');assert.equal(variables.display_precision,0);
  p._writeVariable(variables,unit,'auto');
  assert.deepEqual(variables,{future:true,power_unit:'MW',display_precision:0});
  p._writeVariable(variables,precision,'auto');assert.deepEqual(variables,{future:true,power_unit:'MW'});
  const schema=JSON.parse(JSON.stringify(p._variableSchema(unit,'sensor.power')));
  assert.deepEqual(schema.selector.select.options.map(option=>option.value),['auto','W','kW']);
  const digits=JSON.parse(JSON.stringify(p._variableSchema(precision)));
  assert.deepEqual(digits.selector.select.options.map(option=>option.value),['auto','0','1','2','3','4','5','6']);
});

test('load editor preserves nested source options and makes formatting independent',()=>{
  const config={name:'Energy',rooms:[],pages:{energy:{loads:[{name:'Load',power_entity:{entity_id:'sensor.power',future:true,variables:{display_unit:'kW',display_precision:0,source_retained:true}},variables:{retained:true}}]}}};
  const p=panel(config);
  p._catalog.energy_fields=[{key:'display_unit',kind:'energy_unit'},{key:'display_precision',kind:'energy_precision'}];
  p._openFormDialog=(_title,data,_schema,save)=>{assert.equal(data.var__display_precision,'0');save({...data,var__display_unit:'auto',var__display_precision:'6'});};
  p._openLoadDialog(0);
  const load=JSON.parse(p._source()).pages.energy.loads[0];
  assert.deepEqual(load.power_entity,{entity_id:'sensor.power',future:true,variables:{source_retained:true}});
  assert.deepEqual(load.variables,{retained:true,display_precision:6});
  assert.equal(config.pages.energy.loads[0].power_entity.variables.display_precision,0);
});


test('card arrows and transfers share validated no-op/identity behavior without writes', () => {
  const p = panel(canonical());
  p._model.pages[0].sections.push({ entities: [], future: true });
  p._savedSource = p._source();
  const first = p._cardSource('page', '0:0', 0), before = p._source();
  p._roomAction({ dataset: { action: 'card-up', kind: 'page', room: '0:0', card: '0' } });
  assert.equal(p._source(), before); assert.equal(Boolean(p._dirty), false); assert.equal(p.renders, undefined);
  assert.equal(p._commitCardMove(first, 1, 0), true);
  assert.equal(p._model.pages[0].sections[1].entities[0], first.card);
  assert.equal(p.renders, 1); assert.equal(p._dirty, true);
  assert.equal(p._commitCardMove(first, 0, 0), false, 'A consumed/stale source cannot move twice');
  const second = p._cardSource('page', '0:0', 0); p._setDirty();
  assert.equal(p._commitCardMove(second, 1, 0), false, 'A changed draft invalidates a captured source');
});

test('a replaced document, busy mode or JSON tab rejects a pending move', () => {
  for (const change of [p => { p._model = model.normalizeConfig(canonical()); }, p => { p._busy = true; }, p => { p._tab = 'json'; }, p => { p._lifecycle++; }]) {
    const p = panel(canonical()), source = p._cardSource('page', '0:0', 0); change(p);
    const before = p._source();
    assert.equal(p._commitCardMove(source, 0, 2), false); assert.equal(p._source(), before);
  }
});

test('restored editor focus cannot reveal an off-screen control, while keyboard focus still can', () => {
  const p = panel(canonical()), visual = {}, reveals = [], focuses = [];
  p.shadowRoot = {
    getElementById: () => visual,
    querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 100 }) }),
  };
  const target = {
    localName: 'button', style: {}, getBoundingClientRect: () => ({ top: 0, bottom: 48 }),
    scrollIntoView: options => reveals.push(options),
    focus(options) { focuses.push(options); p._revealFocusedControl({ composedPath: () => [target, visual] }); },
  };
  p._focusWithoutScroll(target);
  assert.equal(focuses[0].preventScroll, true);
  assert.equal(reveals.length, 0, 'Programmatic focus restoration must not move the page');
  assert.equal(p._restoringFocus, false);
  p._revealFocusedControl({ composedPath: () => [target, visual] });
  assert.equal(reveals.length, 1, 'Keyboard focus still reveals a control hidden by the sticky header');
  p._pressedPath = [target];
  p._revealFocusedControl({ composedPath: () => [target, visual] });
  assert.equal(reveals.length, 1, 'Pointer focus cannot shift a button before its click completes');
  target.localName = 'div'; p._pressedPath = [target];
  p._revealFocusedControl({ composedPath: () => [target, visual] });
  assert.equal(reveals.length, 1, 'Safari ancestor focus cannot scroll a pressed child out from under the pointer');
  assert.throws(() => p._focusWithoutScroll({ focus() { throw new Error('Detached focus'); } }), /Detached focus/);
  assert.equal(p._restoringFocus, false, 'A failed restoration must not disable subsequent keyboard reveal');
});

test('card moves restore the handle without scrolling its whole row into view', async () => {
  const p = panel(canonical()), source = p._cardSource('page', '0:0', 0);
  let focused = 0;
  const row = {
    isConnected: true, closest: () => ({ updateComplete: Promise.resolve() }),
    querySelector: () => ({ focus(options) { focused++; assert.equal(options.preventScroll, true); assert.equal(p._restoringFocus, true); } }),
    scrollIntoView() { assert.fail('A drop or arrow action must keep the current viewport'); },
  };
  p.shadowRoot.querySelector = () => row;
  await p._focusMovedCard(source, 0);
  assert.equal(focused, 1);
  row.isConnected = false;
  await p._focusMovedCard(source, 0);
  assert.equal(focused, 1, 'Detached rows cannot steal focus');
});

test('page expansion is presentation-only and reconciles unique identity across accepted documents', () => {
  const p = panel(canonical());
  const source = p._source(); p._reconcilePageExpansion();
  assert.deepEqual([...p._openPages].map(page => page.path), ['home']);
  p._openPages.add(p._model.pages[1]);
  p._model.pages[1].id = 'office-id';
  const next = model.normalizeConfig(JSON.parse(p._source()));
  next.pages.reverse(); next.pages[0].path = 'renamed-office';
  next.pages.push({ name: 'New', path: 'new', entities: [] });
  p._model = next; p._reconcilePageExpansion();
  assert.deepEqual([...p._openPages].map(page => page.path).sort(), ['home', 'renamed-office']);
  const serialized = p._source(); p._openPages.clear(); p._reconcilePageExpansion();
  assert.equal(p._source(), serialized); assert.equal(p._openPages.size, 0);
  assert.ok(!source.includes('_openPages'));
});

test('expansion never guesses ambiguous identities or matches changed explicit IDs by path', () => {
  const p = panel(canonical()); p._model.pages[0].id = 'home-id'; p._reconcilePageExpansion();
  const next = model.normalizeConfig(JSON.parse(p._source())); next.pages[0].id = 'different';
  p._model = next; p._reconcilePageExpansion(); assert.equal(p._openPages.size, 0);
  p._openPages.add(next.pages[1]);
  p._model = { ...next, pages: [{ ...next.pages[1] }, { ...next.pages[1] }] };
  p._reconcilePageExpansion(); assert.equal(p._openPages.size, 0);
});

test('complete unopened raw, empty, nested and duplicate occurrences survive local edits independently', () => {
  const source = canonical(); source.pages[1].unknown = { empty: [], nested: { preserve: true } };
  source.pages.push({ name: 'Raw', path: 'raw', cards: [{ type: 'markdown', content: 'Keep me' }] }, { name: 'Empty', path: 'empty', entities: [] });
  const p = panel(source); p._reconcilePageExpansion();
  p._roomAction({ dataset: { action: 'card-delete', kind: 'page', room: '0:0', card: '0' } });
  const expected = structuredClone(source); expected.pages[0].sections[0].entities.splice(0, 1);
  assert.deepEqual(JSON.parse(p._source()), expected);
  assert.equal(p._openPages.size, 1);
});

test('native icon actions retain semantic labels, boundary state and dispatch coordinates', () => {
  const p = panel(canonical());
  const markup = p._iconButton('mdi:arrow-up', 'Move up', 'card-up', '0:1', true, 2, 'page');
  assert.match(markup, /^<button type="button" class="icon-action"/);
  for (const attribute of ['aria-label="Move up"', 'data-action="card-up"', 'data-room="0:1"', 'data-card="2"', 'data-kind="page"', ' disabled']) assert.ok(markup.includes(attribute));
  assert.match(markup, /<ha-icon icon="mdi:arrow-up"><\/ha-icon><\/button>$/);
  assert.ok(!p._iconButton('mdi:delete-outline', 'Delete card', 'card-delete', '0').includes(' disabled'));
});

test('native scene-order actions receive the shared standalone 48px button and icon rules', async () => {
  const p = panel(canonical()), host = { querySelectorAll: () => [] };
  p._renderSceneOrder(host, [{ entity_id: 'scene.safe', name: 'Safe scene' }], () => {}, () => {});
  assert.match(host.innerHTML, /class="load-row"/);
  assert.equal((host.innerHTML.match(/class="icon-action"/g) || []).length, 3);
  const css = await fs.readFile(new URL('../../frontend_src/panel.css', import.meta.url), 'utf8');
  assert.match(css, /^\.icon-action \{[^}]*box-sizing: border-box;[^}]*width: 48px; height: 48px;[^}]*padding: 12px;/m);
  assert.match(css, /^\.icon-action:disabled \{/m);
  assert.match(css, /(?:^|, )\.icon-action > ha-icon[^\n]*width: 24px; height: 24px;/m);
});

test('owned native clicks give one shared haptic and ignore disabled, inert and busy controls', () => {
  const p = panel(canonical()); let haptics = 0;
  p._moveHaptic = () => { haptics++; };
  const button = { disabled: false, classList: { contains: name => name === 'icon-action' }, closest: () => null };
  const event = { composedPath: () => [{}, button] };
  p._iconActionHaptic(event); assert.equal(haptics, 1);
  p._cardSource = () => ({ section: 0 }); p._commitCardMove = () => true;
  p._roomAction({ dataset: { action: 'card-up', kind: 'page', room: '0:0', card: '1' } });
  assert.equal(haptics, 1, 'The same reorder click must not dispatch a second haptic');
  button.disabled = true; p._iconActionHaptic(event);
  button.disabled = false; p._busy = true; p._iconActionHaptic(event);
  p._busy = false; button.closest = () => ({}); p._iconActionHaptic(event);
  button.closest = () => null; p._iconActionHaptic({ composedPath: () => [{}] });
  assert.equal(haptics, 1);
});

test('busy completion includes owned native actions, retains disabled boundaries and does not enable newly rendered boundaries', () => {
  const p = panel(canonical()), first = { disabled: true, isConnected: true }, enabled = { disabled: false, isConnected: true }, replacement = { disabled: true, isConnected: true };
  p.shadowRoot = { getElementById: () => ({}), querySelectorAll: selector => {
    if (!selector.includes('button.icon-action')) return [];
    return [first, enabled];
  } };
  p._setBusy(true); assert.equal(enabled.disabled, true);
  p.shadowRoot.querySelectorAll = () => [first, enabled, replacement];
  p._setBusy(false); assert.equal(first.disabled, true); assert.equal(enabled.disabled, false); assert.equal(replacement.disabled, true);
});

test('initial loading makes native Visual ready independently of deferred context and History', async () => {
  const messages = [];
  let contextResolve, nativeResolve, nativeStarted;
  const nativePending = new Promise(resolve => { nativeStarted = resolve; });
  const p = loadingPanel(message => {
    messages.push(message);
    if (message.scope === 'context') return new Promise(resolve => { contextResolve = resolve; });
    return Promise.resolve({ ...payload, editor: { ...payload.editor, display_entity_ids: [] } });
  });
  let prepared = 0;
  p._prepareJson = () => { assert.equal(p._busy, false); assert.equal(p._visualReady, true); prepared++; return Promise.resolve(); };
  p.shadowRoot.append = () => assert.fail('Background preparation must not create duplicate speculative requests');
  p._startJsonPreparation = Panel.prototype._startJsonPreparation;
  p._nativeVisualReady = () => new Promise(resolve => {
    nativeResolve = () => { p._visualReady = true; resolve(); };
    nativeStarted();
  });
  const loading = p._load();
  await nativePending;
  assert.deepEqual(messages.map(message => message.scope), ['initial']);
  assert.equal(prepared, 0);
  p._startJsonPreparation();
  assert.equal(prepared, 0);
  nativeResolve();
  await loading;
  assert.equal(p._loaded, true); assert.equal(p._visualReady, true); assert.equal(p._busy, false);
  assert.equal(prepared, 1);
  assert.deepEqual(messages.map(message => message.scope), ['initial', 'context']);
  assert.equal(p._contextReady, false); assert.equal(p._historyLoaded, true);
  contextResolve({ editor: { catalog: { cards: [] }, entities: [], areas: [] } });
  await p._contextRequest;
  assert.equal(p._contextReady, false, 'Transport does not apply optional metadata on its continuation');
});

test('context consumers join one read and a moved occurrence cancels awaited editing', async () => {
  let resolve, calls = 0, edits = 0;
  const p = loadingPanel(message => { assert.equal(message.scope, 'context'); calls++; return new Promise(done => { resolve = done; }); });
  p._loaded = true;
  const first = p._withEditorContext(() => { edits++; });
  const second = p._withEditorContext(() => { edits++; });
  await Promise.resolve(); assert.equal(calls, 1);
  p._setDirty();
  resolve({ editor: { catalog: { cards: [] }, entities: [], areas: [] }, page_templates: { empty: {} } });
  await Promise.all([first, second]);
  assert.equal(edits, 0); assert.equal(p._contextReady, true);
  await p._withEditorContext(() => { edits++; }); assert.equal(edits, 1);
});

test('Save enters its guard before context, preserves latest edits and dispatches once without Monaco', async () => {
  let resolveContext; const messages = [];
  const config = canonical(); config.pages[0].sections[0].entities = []; config.pages[1].entities = [];
  const p = loadingPanel(message => {
    messages.push(message);
    if (message.scope === 'context') return new Promise(done => { resolveContext = done; });
    assert.equal(message.type, 'marao_dashboard/config/generate');
    return Promise.resolve({ config: message.config, history: [], dashboard_url: '/marao-dashboard/home' });
  });
  p._model = model.normalizeConfig(config); p._loaded = true;
  p._model.name = 'Latest before Save'; p._setDirty();
  p._jsonPreparing = new Promise(() => {});
  const saving = p._save(); await Promise.resolve();
  assert.equal(p._busy, true);
  await p._save();
  p._roomAction({ dataset: { action: 'card-delete', kind: 'page', room: '0:0', card: '0' } });
  resolveContext({ editor: { catalog: { cards: [], config_version: 2 }, entities: [], areas: [] } });
  await saving;
  assert.equal(messages.length, 2);
  assert.equal(JSON.parse(messages[1].config).name, 'Latest before Save');
  assert.equal(p._busy, false); assert.equal(p._dirty, false);
  assert.equal(p._monaco, undefined);
});

test('context failure and superseded documents release Save without generation or lost drafts', async () => {
  for (const failure of [true, false]) {
    let resolve, reject; const messages = [];
    const p = loadingPanel(message => { messages.push(message); return new Promise((done, fail) => { resolve = done; reject = fail; }); });
    p._loaded = true; p._dirty = true; const before = p._source();
    const saving = p._save(); await Promise.resolve();
    if (failure) reject(new Error('Context unavailable'));
    else { p._documentEpoch++; resolve({ editor: { catalog: { cards: [] }, entities: [], areas: [] } }); }
    await saving;
    assert.equal(messages.length, 1); assert.equal(p._source(), before);
    assert.equal(p._dirty, true); assert.equal(p._busy, false);
  }
});

test('Discard and Restore during real delayed JSON preparation retain the newest document without stealing Visual', async () => {
  const oldConfirm = context.confirm, oldIdle = context.requestIdleCallback, oldCancelIdle = context.cancelIdleCallback;
  context.confirm = () => true;
  context.requestIdleCallback = callback => { queueMicrotask(() => callback({ timeRemaining: () => 50 })); return 1; };
  context.cancelIdleCallback = () => {};
  try {
    for (const operation of ['Discard', 'Restore']) {
      let releaseEditor, editorStarted, resolveReload, reloadStarted, restoreClick, restoreBound;
      const editorGate = new Promise(resolve => { releaseEditor = resolve; });
      const creating = new Promise(resolve => { editorStarted = resolve; });
      const reloading = new Promise(resolve => { reloadStarted = resolve; });
      const restoreReady = new Promise(resolve => { restoreBound = resolve; });
      const messages = [], next = canonical(); next.name = `${operation} newest saved source`;
      const response = { ...payload, config: JSON.stringify(next), editor: { catalog: { config_version: 2, cards: [] }, entities: [], areas: [] } };
      const p = loadingPanel(message => {
        messages.push(message);
        if (message.type === 'marao_dashboard/history/restore') return Promise.resolve({ history: [] });
        assert.equal(message.type, 'marao_dashboard/config/get'); assert.equal(message.scope, 'initial');
        return new Promise(resolve => { resolveReload = resolve; reloadStarted(); });
      });
      p._model = model.normalizeConfig(canonical()); p._model.name = 'Stale unsaved source';
      p._loaded = true; p._contextReady = true; p._visualReady = true; p._dirty = true;
      p._jsonDraft = JSON.stringify(model.serializeConfig(p._model), null, 4) + '\n';
      const nodes = new Map();
      p.shadowRoot = { querySelector: () => null, querySelectorAll: () => [], getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, { addEventListener() {} }); return nodes.get(id);
      } };
      p._setBusy = Panel.prototype._setBusy;
      p._jsonStyled = true; p._jsonPreparationModule = { prepareJson };
      let value, creates = 0, assistanceDraft;
      const editor = { getValue: () => value, setValue: next => { value = next; }, onDidChangeModelContent() {}, updateOptions() {}, layout() {} };
      p._jsonModule = {
        async createEditor(_host, _source, _catalog, _entities, _workerError, _fontError, options) {
          creates++; editorStarted(); await editorGate; value = options.source(); return editor;
        },
        installJsonAssistance(_editor, _host, _catalog, _entities, draft) { assistanceDraft = draft; return { dispose() {} }; }, setTheme() {},
      };
      const opening = p._switchTab('json'), repeated = p._switchTab('json');
      await creating;
      assert.equal(creates, 1); assert.equal(p._jsonForeground, true); assert.equal(p._busy, false);
      await p._switchTab('visual'); assert.equal(p._jsonForeground, false);
      let restoring;
      if (operation === 'Discard') p._discard();
      else {
        p._historyLoaded = true; p._history = [{ version: 'safe-version', created_at: '2026-10-18T00:00:00Z', reason: 'fixture' }];
        const restoreButton = { dataset: { version: 'safe-version' }, addEventListener(_name, listener) { restoreClick = listener; restoreBound(); } };
        const content = { querySelector: () => ({ addEventListener() {} }), querySelectorAll: () => [restoreButton] };
        p._dialog = () => ({ isConnected: true, open: true, querySelector: () => content });
        p._openHistory(); await restoreReady; restoring = restoreClick();
      }
      await reloading;
      assert.equal(p._busy, true); assert.equal(nodes.get('visual-view').inert, true);
      resolveReload(response); await p._loading; await restoring;
      const newestModel = p._model, newestSource = p._source();
      assert.deepEqual(JSON.parse(newestSource), next); assert.equal(p._jsonDraft, null); assert.equal(p._dirty, false);
      releaseEditor(); await Promise.all([opening, repeated]);
      assert.equal(p._model, newestModel); assert.equal(p._source(), newestSource); assert.equal(p._savedSource, newestSource);
      assert.equal(p._monaco.getValue(), newestSource); assert.deepEqual(JSON.parse(JSON.stringify(assistanceDraft)), next);
      assert.equal(p._tab, 'visual'); assert.equal(p._requestedTab, 'visual'); assert.equal(p._jsonForeground, false);
      assert.equal(p._busy, false); assert.equal(p._dirty, false); assert.equal(p._jsonLoading, null); assert.equal(p._jsonPreparing, null);
      assert.deepEqual(messages.map(message => message.type), operation === 'Discard' ? ['marao_dashboard/config/get'] : ['marao_dashboard/history/restore', 'marao_dashboard/config/get']);
    }
  } finally {
    context.confirm = oldConfirm; context.requestIdleCallback = oldIdle; context.cancelIdleCallback = oldCancelIdle;
  }
});

test('History is single-flight, failed reads require retry and late lists cannot replace Save history', async () => {
  let resolve, reject, calls = 0;
  const p = loadingPanel(message => { assert.equal(message.scope, 'history'); calls++; return new Promise((done, fail) => { resolve = done; reject = fail; }); });
  const first = p._readHistory(); assert.equal(p._readHistory(), first);
  await Promise.resolve(); reject(new Error('History unavailable'));
  await assert.rejects(first, /History unavailable/);
  await assert.rejects(p._readHistory(), /History unavailable/); assert.equal(calls, 1);
  const retried = p._readHistory(true); await Promise.resolve();
  p._historyEpoch++; p._history = [{ version: 'new-save' }]; p._historyLoaded = true;
  resolve({ history: [{ version: 'stale' }] }); await retried;
  assert.equal(p._history[0].version, 'new-save'); assert.equal(calls, 2);
});

test('idle work waits for readiness, idle budget and interaction completion, then foreground promotes it', async () => {
  const p = loadingPanel(() => assert.fail('Idle scheduling cannot fetch'));
  p._visualReady = false;
  let callback, requests = 0;
  context.requestIdleCallback = value => { callback = value; return ++requests; };
  context.cancelIdleCallback = () => {};
  let ran = false;
  const waiting = p._idleStage().then(() => { ran = true; });
  await Promise.resolve(); assert.equal(requests, 0);
  p._visualReady = true; p._resumeJsonPreparation(); assert.equal(requests, 1);
  callback({ timeRemaining: () => 0 }); await Promise.resolve(); assert.equal(ran, false); assert.equal(requests, 2);
  p._interacting = true; callback({ timeRemaining: () => 50 }); await Promise.resolve(); assert.equal(ran, false);
  p._interacting = false; p._jsonForeground = true; p._resumeJsonPreparation(); await waiting;
  assert.equal(ran, true); assert.equal(p._resumeIdleStage, null);
  delete context.requestIdleCallback; delete context.cancelIdleCallback;
});

test('without idle API CPU work waits for explicit selection and disconnect cancels scheduled work', async () => {
  const p = loadingPanel(() => assert.fail('Idle scheduling cannot fetch')); p._visualReady = true;
  let ran = false;
  const waiting = p._idleStage().then(() => { ran = true; });
  await Promise.resolve(); assert.equal(ran, false);
  p._jsonForeground = true; p._resumeJsonPreparation(); await waiting; assert.equal(ran, true);
  p._jsonForeground = false;
  const cancelled = p._idleStage(); p._cancelIdleStage();
  await assert.rejects(cancelled, /Obsolete editor preparation/);
});

test('disconnect clears interrupted activity, cancels idle work and reconnect prepares with the latest draft', async () => {
  const oldIdle = context.requestIdleCallback, oldCancel = context.cancelIdleCallback, oldResize = context.ResizeObserver, oldDrag = context.bindCardDrag;
  const oldDocumentListener = context.document.addEventListener;
  try {
    let idleCallback, requests = 0, resumed = false, freshPreparation;
    context.requestIdleCallback = callback => { idleCallback = callback; return ++requests; };
    context.cancelIdleCallback = () => {};
    context.ResizeObserver = class { observe() {} disconnect() {} };
    context.bindCardDrag = () => ({ dispose() {} });
    context.document.addEventListener = () => {};
    const p = loadingPanel(() => assert.fail('Reconnect must retain the loaded draft'));
    p._loaded = true; p._visualReady = true; p._dirty = true;
    p._model.name = 'Latest unsaved Visual source'; const latestSource = p._source();
    const latestRaw = '{\n  "name": "Latest unsaved JSON draft", "future": []\n}\n';
    p._jsonDraft = 'Older JSON draft';
    let modelsDisposed = 0, editorsDisposed = 0;
    p._monaco = { getValue: () => latestRaw, getModel: () => ({ dispose() { modelsDisposed++; } }), dispose() { editorsDisposed++; } };
    p._activityEvents = new AbortController(); const priorEvents = p._activityEvents;
    p._interacting = true; p._scrolling = true;
    const pending = p._idleStage();
    assert.equal(requests, 0, 'Active gestures must defer background work');
    p.isConnected = false; p.disconnectedCallback();
    await assert.rejects(pending, /Obsolete editor preparation/);
    assert.equal(priorEvents.signal.aborted, true); assert.equal(p._interacting, false); assert.equal(p._scrolling, false);
    assert.equal(p._jsonDraft, latestRaw); assert.equal(p._source(), latestSource); assert.equal(p._dirty, true);
    assert.equal(modelsDisposed, 1); assert.equal(editorsDisposed, 1);
    p._renderShell = () => {}; p.addEventListener = () => {}; p.style = { setProperty() {} };
    p.shadowRoot.getElementById = () => ({ firstElementChild: {} });
    p._startJsonPreparation = () => { freshPreparation = p._idleStage().then(() => { resumed = true; }); };
    p.isConnected = true; p.connectedCallback(); await Promise.resolve();
    assert.equal(requests, 1, 'The fresh connected lifecycle must schedule background idle work');
    assert.equal(p._jsonForeground, false); assert.equal(resumed, false);
    idleCallback({ timeRemaining: () => 50 }); await freshPreparation;
    assert.equal(resumed, true); assert.equal(p._jsonDraft, latestRaw); assert.equal(p._source(), latestSource); assert.equal(p._dirty, true);
    p.isConnected = false; p.disconnectedCallback();
  } finally {
    context.requestIdleCallback = oldIdle; context.cancelIdleCallback = oldCancel; context.ResizeObserver = oldResize; context.bindCardDrag = oldDrag;
    context.document.addEventListener = oldDocumentListener;
  }
});

test('native readiness failure restores the complete unsaved draft and context on reload', async () => {
  const p = loadingPanel(() => Promise.resolve(payload));
  p._loaded = true; p._contextReady = true; p._visualReady = true;
  p._model.name = 'Retain unsaved'; p._savedSource = 'Retain baseline'; p._dirty = true;
  p._jsonDraft = '{ exact retained draft }';
  const catalog = p._catalog, entities = p._entities, model = p._model, source = p._source();
  p._nativeVisualReady = async () => { throw new Error('Required native control failed'); };
  await p._load(true);
  assert.equal(p._model, model); assert.equal(p._catalog, catalog); assert.equal(p._entities, entities);
  assert.equal(p._source(), source); assert.equal(p._jsonDraft, '{ exact retained draft }');
  assert.equal(p._savedSource, 'Retain baseline'); assert.equal(p._dirty, true);
  assert.equal(p._visualReady, true); assert.equal(p._retryKind, 'config'); assert.equal(p._busy, false);
});

test('native readiness reuses mounted fitting and waits independently for form and header renders and a frame', async () => {
  const oldCreate = context.document.createElement, oldDefined = context.customElements.whenDefined, oldFrame = context.requestAnimationFrame;
  try {
    for (const first of ['form', 'header']) {
      let finishForm, finishHeader, frame, frameScheduled;
      const fitting = new Promise(resolve => { finishForm = resolve; });
      const headerReady = new Promise(resolve => { finishHeader = resolve; });
      const scheduled = new Promise(resolve => { frameScheduled = resolve; });
      const p = loadingPanel(() => assert.fail('Native readiness must not fetch'));
      p._visualReady = false;
      const form = { addEventListener() {} };
      context.document.createElement = name => { assert.equal(name, 'ha-form'); return form; };
      let fits = 0;
      p._containForm = target => { assert.equal(target, form); fits++; return fitting; };
      p._mountForm({ replaceChildren(value) { assert.equal(value, form); } }, {}, [], () => {});
      const controls = ['ha-button', 'ha-icon-button', 'ha-expansion-panel'].map(localName => ({ localName, updateComplete: localName === 'ha-expansion-panel' ? headerReady : Promise.resolve() }));
      p.shadowRoot.getElementById = () => ({ querySelectorAll: selector => selector === 'ha-form' ? [form] : controls });
      const definitions = [];
      context.customElements.whenDefined = name => { definitions.push(name); return Promise.resolve(); };
      context.requestAnimationFrame = callback => { frame = callback; frameScheduled(); };
      let ready = false;
      const pending = Panel.prototype._nativeVisualReady.call(p).then(() => { ready = true; });
      (first === 'form' ? finishForm : finishHeader)();
      await Promise.resolve(); await Promise.resolve();
      assert.equal(ready, false); assert.equal(p._visualReady, false); assert.equal(frame, undefined);
      (first === 'form' ? finishHeader : finishForm)();
      await scheduled;
      assert.equal(p._visualReady, false, 'Required controls still need their frame opportunity');
      frame(); await pending;
      assert.equal(p._visualReady, true); assert.equal(fits, 1, 'Mounted General fitting must not be repeated');
      assert.deepEqual(definitions, ['ha-button', 'ha-icon-button', 'ha-expansion-panel']);
    }
  } finally {
    context.document.createElement = oldCreate; context.customElements.whenDefined = oldDefined; context.requestAnimationFrame = oldFrame;
  }
});

test('failed form fitting remains required, later value changes fit afresh, and header failures propagate', async () => {
  const oldCreate = context.document.createElement, oldDefined = context.customElements.whenDefined;
  try {
    const p = loadingPanel(() => assert.fail('Native readiness must not fetch'));
    p._visualReady = false;
    let rejectFit, change, fits = 0, edits = 0;
    const failedFit = new Promise((_resolve, reject) => { rejectFit = reject; });
    const form = { addEventListener(name, listener) { assert.equal(name, 'value-changed'); change = listener; } };
    context.document.createElement = () => form;
    context.customElements.whenDefined = () => Promise.resolve();
    p._containForm = () => { fits++; return fits === 1 ? failedFit : Promise.resolve(); };
    p._mountForm({ replaceChildren() {} }, {}, [], () => { edits++; });
    const header = { localName: 'ha-expansion-panel', updateComplete: Promise.resolve() };
    p.shadowRoot.getElementById = () => ({ querySelectorAll: selector => selector === 'ha-form' ? [form] : [header] });
    const pending = Panel.prototype._nativeVisualReady.call(p);
    rejectFit(new Error('Native form failed'));
    await assert.rejects(pending, /Native form failed/);
    assert.equal(p._visualReady, false); assert.equal(p.status.kind, 'error'); assert.equal(fits, 1);
    change({ detail: { value: { name: 'Changed' } } });
    assert.equal(fits, 2); assert.equal(edits, 1); assert.notEqual(p._formFitting.get(form), failedFit);
    await Panel.prototype._nativeVisualReady.call(p);
    assert.equal(p._visualReady, true); assert.equal(fits, 2);
    p._visualReady = false;
    let rejectHeader;
    header.updateComplete = new Promise((_resolve, reject) => { rejectHeader = reject; });
    const headerPending = Panel.prototype._nativeVisualReady.call(p);
    rejectHeader(new Error('Native header failed'));
    await assert.rejects(headerPending, /Native header failed/);
    assert.equal(p._visualReady, false);
    header.updateComplete = Promise.resolve();
    await Panel.prototype._nativeVisualReady.call(p);
    assert.equal(p._visualReady, true); assert.equal(fits, 2);
  } finally {
    context.document.createElement = oldCreate; context.customElements.whenDefined = oldDefined;
  }
});

test('builder camera title controls share defaults and preserve retired options and untouched values', () => {
  const edit = existing => {
    const p = panel(canonical()), forms = [], handlers = {};
    p._model.pages[0].sections[0].entities = [structuredClone(existing)];
    p._entities = [{entity_id:'camera.test',domain:'camera'}];
    p._catalog = {cards:[{id:existing.template,domains:['camera'],label:'Camera',variables:[{key:'provider',kind:'text',label:'Provider'}]}]};
    const nodes = new Map();
    const content = {querySelector(key){if(!nodes.has(key))nodes.set(key,{addEventListener(type,callback){handlers[key+type]=callback;}});return nodes.get(key);}};
    p._dialog = () => ({querySelector:()=>content});p._availablePages=()=>[];
    p._mountForm=(host,data,schema,changed)=>forms.push({data,schema,changed});
    p._renderSummary=()=>{};p._refreshEnergyFields=()=>{};p._closeDialog=()=>{};p._refreshCards=()=>{};
    p._setDirty=()=>{p.changed=true;};
    p._openCardEditor('0:0',0,null,'page');
    return {p,form:forms[0],save:()=>handlers['[data-save]click'](),close:()=>handlers['[data-close]click'](),value:()=>JSON.parse(JSON.stringify(p._model.pages[0].sections[0].entities[0]))};
  };
  const original={id:'first',entity_id:'camera.test',template:'md_camera_card',name:'',name_key:'camera.saved',icon:'',show_icon:true,show_state:false,show_label:true,variables:{provider:'',unknown:[]},tap_action:{action:'navigate',navigation_path:'#events'},future:{keep:true}};
  for(const visible of [undefined,false,true]) {
    const saved={...original,...(visible===undefined?{}:{show_name:visible})}, opened=edit(saved);
    assert.deepEqual(JSON.parse(JSON.stringify(opened.form.schema.map(f=>f.name))),['entity_id','name','show_name','var__provider']);
    assert.equal(opened.form.data.show_name,visible!==false);assert.equal(opened.p.changed,undefined);
    opened.close();assert.deepEqual(opened.value(),saved,'Closing must not write defaults');
    opened.form.changed({...opened.form.data,entity_id:'camera.other'});opened.save();
    assert.deepEqual(opened.value(),{...saved,entity_id:'camera.other',__simple:false},'Unrelated edits retain empty names/icons, visibility omission, options and actions');
    const hidden=edit(saved);hidden.form.changed({...hidden.form.data,name:'Saved entrance',show_name:false});hidden.save();
    const expected={...saved,name:'Saved entrance',show_name:false,__simple:false};delete expected.name_key;
    assert.deepEqual(hidden.value(),expected);
  }
  const light=edit({...original,template:'md_light_card'});
  assert.deepEqual(JSON.parse(JSON.stringify(light.form.schema.map(f=>f.name))),['entity_id','name','icon','var__provider']);
  assert.equal(PT_LABELS['Show title'],'Mostrar título');
});

test('entity-first cards keep the selected ID separate from display names and reject name bindings', () => {
  const p = panel(canonical()), handlers = {}, forms = [];
  const entityId = 'light.device_123', displayName = 'Kitchen ceiling';
  p._model.pages[0].sections[0].entities = [];
  p._entities = [{ entity_id: entityId, name: displayName, domain: 'light', has_state: true }];
  p._catalog = { cards: [{ id: 'md_light_card', label: 'Light', domains: ['light'], variables: [] }] };
  const nodes = new Map(), content = { querySelector(key) {
    if (!nodes.has(key)) nodes.set(key, { addEventListener(type, fn) { handlers[key + type] = fn; } });
    return nodes.get(key);
  } };
  p._dialog = () => ({ querySelector: () => content }); p._availablePages = () => [];
  p._mountForm = (host, data, schema, changed) => forms.push({ data, changed });
  let error;
  p._renderSummary = (...args) => { error = args.at(-1); };
  p._refreshEnergyFields = p._closeDialog = p._refreshCards = () => {};
  p._openCardEditor('0:0', null, 'md_light_card', 'page', entityId);
  assert.equal(forms[0].data.entity_id, entityId);
  forms[0].changed({ ...forms[0].data, entity_id: displayName });
  handlers['[data-save]click']();
  assert.equal(p._model.pages[0].sections[0].entities.length, 0);
  assert.equal(error, 'Page card entity_id must be a valid entity.');
  forms[0].changed({ ...forms[0].data, entity_id: entityId, name: displayName });
  handlers['[data-save]click']();
  const saved = p._model.pages[0].sections[0].entities[0];
  assert.equal(saved.entity_id, entityId); assert.equal(saved.name, displayName);
});

test('energy breakdown editing keeps a private draft and preserves ordered unknown row fields', () => {
  const p = panel(canonical()), handlers = {}, forms = [];
  const original = { id: 'energy', entity_id: 'sensor.total', template: 'md_energy_period_card', variables: {
    sub_entities: [{ entity_id: 'sensor.heating', name: 'Heating', future: [] }, { entity_id: 'sensor.lighting', cost_entity: 'sensor.cost' }], future: true,
  } };
  p._model.pages[0].sections[0].entities = [structuredClone(original)];
  p._catalog = { cards: [{ id: original.template, domains: ['sensor'], label: 'Energy period', variables: [
    { key: 'sub_entities', label: 'Energy breakdown', kind: 'energy_sub_entities' }, { key: 'cost_per_kwh', label: 'Price per kWh', kind: 'number' },
  ] }] };
  const nodes = new Map(), content = { querySelector(key) {
    if (!nodes.has(key)) nodes.set(key, { addEventListener(type, handler) { handlers[key + type] = handler; } });
    return nodes.get(key);
  } };
  let members, update;
  p._dialog = () => ({ querySelector: () => content }); p._availablePages = () => [];
  p._mountForm = (host, data, schema, changed) => forms.push({ data, schema, changed });
  p._renderEnergySubEntities = (host, value, changed) => { members = value; update = changed; };
  p._renderSummary = p._refreshEnergyFields = p._closeDialog = p._refreshCards = p._setDirty = () => {};
  p._openCardEditor('0:0', 0, null, 'page');
  assert.ok(!forms[0].schema.some(field => field.name === 'var__sub_entities'));
  members.reverse(); members[1].name = 'Renamed'; update(members);
  const saved = () => JSON.parse(JSON.stringify(p._model.pages[0].sections[0].entities[0]));
  assert.deepEqual(saved(), original, 'Cancelling the dialog leaves the document untouched');
  forms[0].changed({ ...forms[0].data, var__cost_per_kwh: 0 }); handlers['[data-save]click']();
  assert.deepEqual(saved().variables, { future: true, cost_per_kwh: 0, sub_entities: [original.variables.sub_entities[1], { ...original.variables.sub_entities[0], name: 'Renamed' }] });
  update([]); handlers['[data-save]click']();
  assert.deepEqual(saved().variables.sub_entities, []);
});

test('a dismissed card picker cannot block adding cards to any section', () => {
  const p = panel(canonical());
  const reached = new Error('new card picker requested');
  p._dialog = () => { throw reached; };
  p._galleryDialog = { open: true, isConnected: false };
  for (const position of ['0:0', '1:0']) {
    assert.throws(() => p._openCardGallery(position, 'page'), error => error === reached);
  }
  p._galleryDialog = { open: true, isConnected: true };
  assert.doesNotThrow(() => p._openCardGallery('0:0', 'page'), 'A real open picker still prevents duplicates');
});

test('card catalog search matches localized names and descriptions without changing card selection', () => {
  const p = panel(canonical()), before = p._source();
  p._areas = [];
  p._catalog = { cards: [{ id: 'md_light_card', label: 'Light', description: 'Brightness', domains: ['light'] }] };
  const button = (id, text) => Object.assign(new EventTarget(), { dataset: { card: id }, textContent: text, hidden: false });
  const cards = [button('md_light_card', 'Iluminação Controlar brilho'), button('md_access_card', 'Acesso Abrir portas')];
  const search = Object.assign(new EventTarget(), { value: '' }), empty = { hidden: true };
  const nodes = { '#card-search': search, '#card-search-empty': empty, '#entity-search': Object.assign(new EventTarget(), { value: '' }),
    '.entity-results': { querySelectorAll: () => [] }, '[data-close]': new EventTarget(), '[data-ha-manual]': new EventTarget() };
  const content = { querySelector: key => nodes[key], querySelectorAll: key => key === '[data-card]' ? cards : [] };
  const dialog = { open: true, isConnected: true, querySelector: () => content };
  p._dialog = () => dialog;
  let selected;
  p._openCardEditor = (...args) => { selected = args; };
  p._openCardGallery('0:0', 'page');
  const filter = value => { search.value = value; search.dispatchEvent(new Event('input')); };
  filter('ILUMINACAO'); assert.deepEqual(cards.map(card => card.hidden), [false, true]);
  filter('brilho'); assert.deepEqual(cards.map(card => card.hidden), [false, true]);
  filter('unmatched'); assert.ok(cards.every(card => card.hidden)); assert.equal(empty.hidden, false);
  filter('  '); assert.ok(cards.every(card => !card.hidden)); assert.equal(empty.hidden, true);
  filter('portas'); cards[1].dispatchEvent(new Event('click'));
  assert.equal(selected[2], 'md_access_card'); assert.equal(selected[3], 'page');
  assert.equal(p._source(), before, 'Searching must not change the dashboard draft');
});

test('threshold row editor preserves zero and unknown data and leaves explicit emptiness after removal', () => {
  const p=new Panel();p._hass={states:{'sensor.humidity':{attributes:{unit_of_measurement:'%'}}}};
  const bindings=[], rows=[], buttons=new Map();let add, rowChange, last;
  const element=()=>({dataset:{action:'delete'},addEventListener(_type,callback){this.click=callback;}});
  const error={textContent:''};
  const host={set innerHTML(_value){rows.length=0;add=element();},querySelector(selector){return selector==='[data-energy-rows]'?{append:row=>rows.push(row)}:selector==='[data-list-error]'?error:add;}};
  const previous=context.document;
  context.document={createElement(){return {className:'',append(control){this.controls=control;},set innerHTML(_value){},querySelectorAll(){return [{dataset:{action:'delete'},addEventListener(_type,cb){this.click=cb;buttons.set(rows.length,this);}}];}};}};
  p._mountForm=(_row,data,_schema,changed)=>{bindings.push(data);rowChange=changed;};
  p._moveHaptic=()=>{};
  try {
    p._renderEnergySubEntities(host,[{value:0,color:'#ffffff',future:{keep:7}}],value=>last=value,false,'sensor.humidity');
    assert.equal(bindings[0].value,0);
    rowChange({value:1.5,color:'#ffffff'});assert.equal(last[0].value,1.5);assert.equal(last[0].future.keep,7);
    buttons.get(0).click();assert.equal(last.length,0);
    add.click();assert.equal(last[0].value,0);assert.equal(error.textContent,'');
  } finally {context.document=previous;}
});
