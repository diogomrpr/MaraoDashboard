import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import * as model from "../../frontend_src/editor-model.js";

const source = await fs.readFile(new URL("../../frontend_src/MaraoDashboardPanel.js", import.meta.url), "utf8");
let Panel;
let confirmations;
const context = vm.createContext({
  ...model,
  HTMLElement: class { attachShadow() { this.shadowRoot = { querySelector() { return null; } }; } },
  customElements: { get() {}, define(_name, value) { Panel = value; } },
  BRAND_MARK: '/brand/mark.svg?v=test', BRAND_MARK_DARK: '/brand/mark-dark.svg?v=test',
  confirm: (message) => { confirmations.push(message); return false; },
});
// Execute the actual panel with only browser/Monaco imports omitted.
vm.runInContext(source.slice(source.indexOf("const TEXT =")).replaceAll("import.meta.url", '"https://example.invalid/MaraoDashboardPanel.js?v=test"'), context);

function panel(config) {
  confirmations = [];
  const p = new Panel();
  p._model = model.normalizeConfig(config);
  p._savedSource = p._source();
  p._catalog = { supported_domains: ["light"] };
  p._entities = [{ entity_id: "light.test", domain: "light", area_id: "office" }];
  p._hass = { callWS() { assert.fail("A local deletion must not save or delete an HA entity"); } };
  p._updateHeader = () => {};
  p._renderVisual = () => { p.renders = (p.renders || 0) + 1; };
  return p;
}

const canonical = () => ({ config_version: 2, name: 'Safe', landing_page: 'home', navigation: ['home'], pages: [
  { name: 'Home', path: 'home', sections: [{ entities: [{ id: 'first', entity_id: 'light.test' }, { id: 'second', entity_id: 'light.test', name: 'Duplicate' }], future: true }] },
  { name: 'Office', path: 'office', entities: [{ page: 'home', name: 'Back home' }], cards: [{ type: 'markdown', content: 'Saved note' }] },
] });

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

test('page manager handles a sixth pin as a visible error without changing source', () => {
  const p = panel(canonical());
  p._model.navigation = ['home', { url: '/one', label: 'One' }, { url: '/two', label: 'Two' }, { url: '/three', label: 'Three' }, { url: '/four', label: 'Four' }];
  const before = p._source();
  p._setStatus = (message, kind) => { p.status = { message, kind }; };
  p._pageAction({ dataset: { action: 'page-pin', room: '1' } });
  assert.equal(p._source(), before);
  assert.match(p.status.message, /sixth/);
  assert.equal(p.status.kind, 'error');
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
  const group = { template: 'hc_entity_group_card', id: 'original', name: 'Group', entity_type: 'light', entities: [{ entity_id: 'light.test', variables: { enable_slider: false }, future: 42 }], future: true };
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
  const groups = ['first', 'second'].map(id => ({ template: 'hc_entity_group_card', id, name: id, entity_type: 'light', entities: [] }));
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
  editor:{catalog:{},entities:[],areas:[]},history:[],dashboard_url:'/marao-dashboard'};

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
