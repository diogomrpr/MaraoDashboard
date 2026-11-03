import test from 'node:test';
import assert from 'node:assert/strict';
import {cards as documentedCards} from '../../docs/examples/manifest.js';
import {cameraEventsStub, refreshCardMetadata} from '../../frontend_src/native-card-metadata.js';
import { catalog } from '../../frontend_src/native-model.js';
import { composeNativeCard, createCardComposition, nativeCardDescriptor, nativeCardType, NATIVE_CARD_TYPES, resolveSource, templateForNativeType, validateNativeCardConfig } from '../../frontend_src/card-composition.js';
import { MaraoNativeCard, nativeCardGridOptions, nativeCardSetup, nativeCardStub, nativeEntitySuggestion, nativeCardDefaults, registerNativeCards } from '../../frontend_src/native-cards.js';

const domains = [...new Set(catalog.cards.flatMap(card => card.domains))];
const hass = { language: 'en', connected: true, connection: { connected: true }, states: Object.fromEntries(domains.map(domain => [`${domain}.test`, {
  entity_id: `${domain}.test`, state: 'off', attributes: { friendly_name: 'Fixture', source_list: ['TV'], ...(domain === 'sensor' ? { unit_of_measurement: 'kWh', device_class:'battery' } : {}) },
}])) };
const compose = (config, instanceId = 'one') => composeNativeCard(config, { instanceId, dashboardRoot: 'test-home' });
const config = (template, extra = {}) => ({ type: nativeCardType(template), template, ...extra });

test('all catalog identities expose independent native types, defaults and shared sizing without replacing runtime types', () => {
  assert.equal(Object.keys(NATIVE_CARD_TYPES).length, 38);
  assert.equal(new Set(Object.values(NATIVE_CARD_TYPES)).size, 38);
  for (const entry of catalog.cards) {
    const stub = nativeCardStub(entry.id, hass, Object.keys(hass.states));
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
  const thirdParty = {type:'other-card',name:'Other',description:'Other'};
  globalThis.window = { customCards: [thirdParty] };
  registerNativeCards(); registerNativeCards();
  assert.equal(registry.size, 41);
  assert.equal(registry.get('marao-card'), runtime);
  assert.equal(window.customCards.length, catalog.cards.filter(card => !card.hidden).length+2);
  assert.equal(window.customCards.filter(card=>card.type==='marao-camera-events-card').length,1);
  assert.equal(window.customCards[0],thirdParty);
  for(const registration of window.customCards.slice(1)){assert.equal(typeof registration.getEntitySuggestion,'function');assert.ok(documentedCards.some(card=>registration.documentationURL===`https://diogomrpr.github.io/MaraoDashboard/cards/${card.slug}/`),registration.type);}
  assert.deepEqual(window.customCards.find(card=>card.type==='marao-light-card').getEntitySuggestion(hass,'light.test'),{config:{type:'custom:marao-light-card',template:'md_light_card',entity_id:'light.test',variables:{enable_slider:true,use_light_color:false}}});
  const events=window.customCards.find(card=>card.type==='marao-camera-events-card');assert.deepEqual(events.getEntitySuggestion(hass,'camera.test'),{config:{type:'custom:marao-camera-events-card',cameras:[{entity:'camera.test'}]}});assert.equal(events.getEntitySuggestion(hass,'light.test'),null);
  for (const entry of catalog.cards) {
    const element = registry.get(nativeCardType(entry.id).slice(7));
    assert.equal(typeof element.getConfigElement, 'function');
    assert.equal(element.getStubConfig(hass).template, entry.id);
  }
});

test('entity suggestions bind the exact selection, validate defaults and leave discovery and saved state untouched',()=>{
  const source={...hass,states:{...hass.states,'light.selected':{state:'off',attributes:{}},'cover.damper':{state:'open',attributes:{device_class:'damper'}},'sensor.battery':{state:'80',attributes:{device_class:'battery',unit_of_measurement:'%'}}}},before=structuredClone(source);
  for(const [role,id]of [['md_light_card','light.selected'],['md_fan_card','cover.damper'],['md_media_card','media_player.test'],['md_header_card','weather.test'],['md_battery_card','sensor.battery']]){
    const result=nativeEntitySuggestion(role,source,id);assert.equal(result.config.entity_id,id);assert.doesNotThrow(()=>validateNativeCardConfig(result.config));
  }
  assert.equal(nativeEntitySuggestion('md_light_card',source,'switch.test'),null);assert.equal(nativeEntitySuggestion('md_light_card',source,'light.missing'),null);
  assert.equal(nativeEntitySuggestion('md_battery_card',source,'sensor.test'),null);assert.equal(nativeEntitySuggestion('md_media_app_card',{states:{'media_player.empty':{attributes:{}}}},'media_player.empty'),null);
  for(const role of ['md_title_card','md_room_card','md_entity_group_card','md_floor_plan_card'])assert.equal(nativeEntitySuggestion(role,source,'light.selected'),null);
  assert.deepEqual(source,before);const first=nativeEntitySuggestion('md_light_card',source,'light.selected');first.config.name='Local';assert.equal(nativeEntitySuggestion('md_light_card',source,'light.selected').config.name,undefined);
});

test('entity suggestions retain strict access roles and omit ordinary cover controls for access points',()=>{
  const source={states:{'cover.garage':{state:'closed',attributes:{device_class:'garage'}},'cover.entry_gate':{state:'closed',attributes:{}},'cover.blind':{state:'closed',attributes:{}},'lock.safe':{state:'locked',attributes:{}}}};
  for(const role of ['md_fan_card','md_cover_card'])assert.equal(nativeEntitySuggestion(role,source,'cover.garage'),null);
  assert.equal(nativeEntitySuggestion('md_access_card',source,'cover.blind'),null);
  for(const id of ['lock.safe','cover.garage','cover.entry_gate']){const result=nativeEntitySuggestion('md_access_card',source,id);assert.equal(result.config.entity_id,id);assert.equal(result.config.template,'md_access_card');}
  assert.equal(nativeEntitySuggestion('md_access_slide_action_card',source,'lock.safe'),null);
});

test('picker defaults honor ordered pools before domain preferences and keep access covers out of fan defaults', () => {
  const states = { 'cover.garage': { attributes: { device_class: 'garage' } }, 'cover.damper': { attributes: { device_class: 'damper' } }, 'fan.room': { attributes: {} } };
  assert.equal(nativeCardStub('md_fan_card', { states }, ['cover.garage', 'cover.damper', 'fan.room']).entity_id, 'cover.damper');
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
  assert.deepEqual(order, [['preview', true], ['hass', true]]);
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

test('camera popup columns forward explicitly while omission retains released output',async()=>{
 const {composeNativeCard}=await import('../../frontend_src/card-composition.js');
 const config={type:'custom:marao-camera-card',entity:'camera.front',variables:{event_provider:'frigate',event_limit:7}};
 const base=composeNativeCard(config,{instanceId:'columns'});const changed=composeNativeCard({...config,variables:{...config.variables,event_columns:2}},{instanceId:'columns'});
 const events=base.popups[0].cards.find(card=>card.type==='custom:marao-camera-events-card');
 assert.equal(Object.hasOwn(events,'columns'),false);
 assert.deepEqual(changed.popups[0].cards.find(card=>card.type==='custom:marao-camera-events-card'),{...events,columns:2});
});


test('creation pools skip unusable entries, prefer unused secondary domains and never scan state', () => {
  const state = (state = 'off', attributes = {}) => ({state, attributes});
  const source = {states:{'light.bad':state('unavailable'), 'light.unknown':state('unknown'), 'light.used':state(), 'light.unrelated':state(), 'cover.garage':state('closed',{device_class:'garage'}), 'cover.damper':state('open',{device_class:'damper'}), 'fan.used':state(), 'camera.bad':state('unavailable'),'camera.used':state('idle')}};
  const before=structuredClone(source),unused=['light.missing','light.bad','light.unknown','light.bad'];
  assert.equal(nativeCardStub('md_light_card',source,unused,[{entity_id:'light.used'}]).entity_id,'light.used');
  assert.equal(nativeCardStub('md_light_card',source,unused).entity_id,undefined);
  assert.equal(nativeCardStub('md_light_card',source).entity_id,undefined);
  assert.equal(nativeCardStub('md_fan_card',source,['cover.garage','cover.damper'],['fan.used']).entity_id,'cover.damper');
  assert.deepEqual(cameraEventsStub(source,['camera.bad'],['camera.used']),{type:'custom:marao-camera-events-card',cameras:[{entity:'camera.used'}]});
  assert.deepEqual(cameraEventsStub(source,[],[]).cameras,[]);
  assert.equal(nativeCardSetup(nativeCardStub('md_light_card',source)),'Choose an entity in the card editor.');
  assert.equal(nativeCardSetup(nativeCardStub('md_media_app_card',source)),'Choose an entity in the card editor.');
  assert.throws(()=>nativeCardSetup({type:'custom:marao-light-card',variables:{use_light_color:'yes'}}),/boolean/);
  assert.deepEqual(source,before);
});

test('specialized suggestions require role evidence while manual validators remain compatible', () => {
  const state=(value,attributes={})=>({state:value,attributes});
  const source={states:{'sensor.temperature':state('21',{device_class:'temperature',unit_of_measurement:'°C'}),'sensor.energy':state('2',{device_class:'energy',unit_of_measurement:'kWh'}),'sensor.contradiction':state('2',{device_class:'temperature',unit_of_measurement:'kWh'}),'sensor.missing':state('2'),'sensor.text':state('idle'),'sensor.battery':state('50',{device_class:'battery',unit_of_measurement:'%'}),'weather.home':state('sunny'),'media_player.no_apps':state('off',{source_list:[]})}};
  for(const role of ['md_energy_period_card','md_dishwasher_card','md_washing_machine_card','md_weather_card','md_toggle_graph_card'])assert.equal(nativeEntitySuggestion(role,source,'sensor.temperature'),null,role);
  for(const role of ['md_sensor_card','md_graph_card'])assert.equal(nativeEntitySuggestion(role,source,'sensor.temperature').config.entity_id,'sensor.temperature');
  assert.equal(nativeEntitySuggestion('md_energy_period_card',source,'sensor.energy').config.entity_id,'sensor.energy');
  for(const id of ['sensor.contradiction','sensor.missing'])assert.equal(nativeEntitySuggestion('md_energy_period_card',source,id),null);
  assert.equal(nativeEntitySuggestion('md_graph_card',source,'sensor.text'),null);
  assert.equal(nativeEntitySuggestion('md_battery_card',source,'sensor.battery').config.entity_id,'sensor.battery');
  assert.equal(nativeEntitySuggestion('md_weather_card',source,'weather.home').config.entity_id,'weather.home');
  assert.equal(nativeEntitySuggestion('md_media_app_card',source,'media_player.no_apps'),null);
  for(const source_list of ['TV',{},[null,2]])assert.equal(nativeEntitySuggestion('md_media_app_card',{states:{'media_player.bad':state('off',{source_list})}},'media_player.bad'),null);
  assert.doesNotThrow(()=>validateNativeCardConfig(config('md_dishwasher_card',{entity_id:'sensor.temperature'})));
});

test('People suggestions contain exactly the selected member and return independent inert preview configurations', () => {
  const source={states:{'person.alex':{state:'home'},'person.sam':{state:'home'},'light.test':{state:'on'}}},before=structuredClone(source);
  const first=nativeEntitySuggestion('md_people_card',source,'person.alex');
  assert.deepEqual(first.config.entities,['person.alex']);assert.equal(Object.hasOwn(first.config,'entity_id'),false);
  assert.doesNotThrow(()=>validateNativeCardConfig(first.config));
  first.config.entities.push('person.sam');assert.deepEqual(nativeEntitySuggestion('md_people_card',source,'person.alex').config.entities,['person.alex']);
  for(const id of ['person.missing','light.test'])assert.equal(nativeEntitySuggestion('md_people_card',source,id),null);
  const owner=Object.assign(Object.create(MaraoNativeCard.prototype),{_content:{},_children:[],isConnected:true,_preview:true,_hass:source});owner._forward();assert.equal(owner._content.inert,true);
  assert.deepEqual(source,before);
});

test('declared defaults are fresh, narrowly audited values and never normalize an authored document', () => {
  const saved=config('md_light_card',{entity_id:'light.test',future:{empty:[],disabled:false},tap_action:{action:'none'},grid_options:{columns:3},visibility:[],popup_view:'authored'}),before=structuredClone(saved);
  assert.deepEqual(nativeCardDefaults('md_light_card'),{variables:{enable_slider:true,use_light_color:false}});
  const defaults=nativeCardDefaults('md_light_card');defaults.variables.enable_slider=false;
  assert.equal(nativeCardDefaults('md_light_card').variables.enable_slider,true);
  for(const role of ['md_access_card','md_energy_period_card','md_media_card','md_people_card','md_entity_group_card'])assert.deepEqual(nativeCardDefaults(role),{});
  for(const value of [false,null,[],{},'unknown'])assert.deepEqual(nativeCardDescriptor({...saved,variables:{enable_slider:value}}).variables,{enable_slider:value});
  assert.deepEqual(saved,before);
});

test('HA language refresh changes only owned labels and preserves callbacks, help, names and drafts', t => {
  const previous={customElements:globalThis.customElements,window:globalThis.window};t.after(()=>Object.assign(globalThis,previous));
  const registry=new Map();globalThis.customElements={get:id=>registry.get(id),define:(id,value)=>registry.set(id,value)};
  const third={type:'third',name:'Keep',description:'Keep'};globalThis.window={customCards:[third]};registerNativeCards();
  const light=window.customCards.find(card=>card.type==='marao-light-card'),callback=light.getEntitySuggestion,url=light.documentationURL;
  refreshCardMetadata({language:'pt'});assert.equal(light.name,'Marao Luz');
  const draft={name:'My saved name',entity_id:'light.test'},before=structuredClone(draft);
  Object.defineProperty(third,'name',{set(){throw Error('Third-party metadata was touched');},get(){return 'Keep';}});
  refreshCardMetadata({language:'pt'});refreshCardMetadata({language:'en'});
  assert.equal(light.name,'Marao Light');assert.equal(light.getEntitySuggestion,callback);assert.equal(light.documentationURL,url);assert.deepEqual(draft,before);
});
