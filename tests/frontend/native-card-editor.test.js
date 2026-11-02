import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../../custom_components/marao_dashboard/frontend/marao-catalog.json' with {type:'json'};
import {MaraoCardEditor,nativeConfigToDescriptor,nativeCardFormData,patchNativeCard} from '../../frontend_src/native-card-editor.js';

const card=id=>catalog.cards.find(item=>item.id===id);

test('native card forms preserve unknown native settings and every catalog role across a local name edit',()=>{
  for(const entry of catalog.cards) {
    const original={type:'custom:marao-card',template:entry.id,name:'Original',variables:{future:{array:[],enabled:false}},grid_options:{columns:6,rows:2},visibility:[{condition:'state',entity:'input_boolean.visible',state:'on'}],tap_action:{action:'navigate',navigation_path:'/custom-root/elsewhere'},future:{empty:[],false:false}};
    const before=structuredClone(original),data=nativeCardFormData(original,entry);
    const next=patchNativeCard(original,entry,data,{...data,name:'Local label'});
    assert.deepEqual(next,{...before,name:'Local label'},entry.id);
    assert.deepEqual(original,before,'form patch must not mutate HA-owned input');
  }
});

test('native vacuum sibling editing retains structured commands and empty or false options',()=>{
  const original={type:'custom:marao-vacuum-card',template:'md_vacuum_card',entity_id:'vacuum.test',variables:{action_1:{icon:'mdi:sofa',data:{command:'app_segment_clean',params:[{segments:[21],repeat:1}],future:false}},future:[]},future:{preserved:true}};
  const initial=nativeCardFormData(original,card(original.template));
  const patched=patchNativeCard(original,card(original.template),initial,{...initial,'var__action_1.icon':'mdi:bed'});
  assert.deepEqual(patched.variables.action_1.data,original.variables.action_1.data);
  assert.equal(patched.variables.action_1.icon,'mdi:bed');
  assert.deepEqual(patched.variables.future,[]);
  const replacement={command:'app_segment_clean',params:[{segments:[22],repeat:2}],future:[]};
  const next=patchNativeCard(patched,card(original.template),initial,{...initial,'var__action_1.icon':'mdi:bed','var__action_1.data':replacement});
  assert.deepEqual(next.variables.action_1.data,replacement);
  assert.deepEqual(original.variables.action_1.data.params,[{segments:[21],repeat:1}]);
});

test('native energy and current forms retain explicit emptiness and reject invalid presets without mutation',()=>{
  const energy={type:'custom:marao-energy-card',template:'md_energy_period_card',entity_id:'sensor.energy',variables:{sub_entities:[],display_precision:0,calculate_cost:false,future:[]},layout_options:{grid_columns:2}};
  const initial=nativeCardFormData(energy,card(energy.template));
  const next=patchNativeCard(energy,card(energy.template),initial,{...initial,'var__display_precision':'2'});
  assert.deepEqual(next.variables.sub_entities,[]);assert.equal(next.variables.calculate_cost,false);
  assert.equal(next.variables.display_precision,2);assert.deepEqual(next.layout_options,energy.layout_options);
  const current={type:'custom:marao-wallbox-current-card',template:'md_wallbox_current_card',entity_id:'input_number.current',variables:{shortcuts:[],future:false}};
  const fields=nativeCardFormData(current,card(current.template));
  assert.deepEqual(patchNativeCard(current,card(current.template),fields,{...fields,name:'Current'}).variables.shortcuts,[]);
  const key=Object.keys(fields).find(key=>key.startsWith('var__'));
  assert.throws(()=>patchNativeCard(current,card(current.template),fields,{...fields,[key]:'6,12,16,20'}),/at most three/);
  assert.deepEqual(current.variables.shortcuts,[]);
});

test('native editor emits complete independent config and ignores its own HA echo',()=>{
  const editor=new MaraoCardEditor(),events=[];
  editor.dispatchEvent=event=>{events.push(event);return true;};
  const config={type:'custom:marao-light-card',template:'md_light_card',entity_id:'light.test',variables:{enable_slider:false,future:[]},grid_options:{columns:6},visibility:[],unknown:{saved:true}};
  editor.setConfig(config);
  const descriptor={...nativeConfigToDescriptor(config),name:'New label'};
  editor._commitDescriptor(descriptor);
  assert.equal(events.length,1);assert.equal(events[0].type,'config-changed');assert.equal(events[0].bubbles,true);assert.equal(events[0].composed,true);
  assert.deepEqual(events[0].detail.config,{...config,name:'New label'});
  const model=editor._model;editor.setConfig(events[0].detail.config);assert.equal(editor._model,model);
  events[0].detail.config.unknown.saved=false;assert.equal(editor._config.unknown.saved,true);
  assert.equal(config.name,undefined);
});

test('native form values can return to their saved value without losing specialized edits',()=>{
  const entry=card('md_scene_collection_card'),original={type:'custom:marao-scene-collection-card',template:entry.id,name:'Scenes',entities:[],future:{keep:[]}};
  const before=nativeCardFormData(original,entry),edited={...before,name:'Evening'};
  const independentlyEdited={...original,entities:[{entity_id:'scene.evening',name:'Local scene',future:false}]};
  const next=patchNativeCard(independentlyEdited,entry,before,edited);
  const restored=patchNativeCard(next,entry,edited,before);
  assert.equal(restored.name,'Scenes');assert.deepEqual(restored.entities,independentlyEdited.entities);assert.deepEqual(restored.future,original.future);
});

test('native type-only configurations resolve their matching catalog roles',()=>{
  assert.equal(nativeConfigToDescriptor({type:'custom:marao-light-card',entity_id:'light.test'}).template,'md_light_card');
  assert.equal(nativeConfigToDescriptor({type:'custom:marao-energy-card',entity_id:'sensor.energy'}).template,'md_energy_period_card');
  assert.equal(nativeConfigToDescriptor({type:'custom:marao-floorplan-card',variables:{lights:[]}}).template,'md_floor_plan_card');
});

test('legacy entity spelling survives native form updates and active forms survive ordinary HA state updates',()=>{
  const editor=new MaraoCardEditor(),events=[],form={hass:null};
  editor.dispatchEvent=event=>{events.push(event);return true;};
  editor.setConfig({type:'custom:marao-card',template:'md_light_card',entity:'light.test',future:[]});
  editor._commitDescriptor({...nativeConfigToDescriptor(editor._config),name:'Legacy light'});
  assert.equal(events[0].detail.config.entity,'light.test');assert.ok(!Object.hasOwn(events[0].detail.config,'entity_id'));
  editor.shadowRoot={querySelectorAll:selector=>selector==='ha-form'?[form]:[]};editor._mounted=true;editor._hass={language:'en'};
  editor._render=()=>assert.fail('ordinary state updates must not remount the active native form');
  const hass={language:'en',states:{'light.test':{state:'on',attributes:{friendly_name:'Test'}}}};editor.hass=hass;
  assert.equal(form.hass,hass);
});

test('People and section drafts retain native placement and unknown member data through complete events',()=>{
  const original={type:'custom:marao-people-card',name:'Household',entities:[{entity_id:'person.alex',name:'Alex',future:{empty:[],enabled:false}},{entity_id:'person.sam',icon:'mdi:account'}],grid_options:{columns:12},visibility:[{condition:'user',users:['fixture']}],future:{retain:true}};
  const editor=new MaraoCardEditor(),events=[];editor.dispatchEvent=event=>events.push(event.detail.config);editor.setConfig(original);
  editor._commitDescriptor({...structuredClone(original),entities:[original.entities[1],{...original.entities[0],name:'Alexandra'}]});
  assert.deepEqual(events[0],{...original,entities:[original.entities[1],{...original.entities[0],name:'Alexandra'}]});
  assert.deepEqual(original.entities[0].future,{empty:[],enabled:false});
  editor._commitDescriptor({...events[0],entities:[]});assert.deepEqual(events[1].entities,[]);assert.deepEqual(events[1].grid_options,{columns:12});
});

test('optional color fields represent unset and CSS values without HTML color coercion',()=>{
  const editor=Object.create(MaraoCardEditor.prototype),entry=card('md_light_card');
  assert.deepEqual(editor._variableSchema({key:'card_color',kind:'color',label:'Card color'}).selector,{text:{}});
  for(const value of ['', 'var(--primary-color)', '#123456']) {
    const config={type:'custom:marao-light-card',entity_id:'light.test',variables:{card_color:value}},data=nativeCardFormData(config,entry);
    assert.deepEqual(patchNativeCard(config,entry,data,{...data,name:'Desk'}),{...config,name:'Desk'});
  }
});

test('people column edits retain native data and omission on unrelated edits',()=>{
 const card={id:'md_people_card',people:true,variables:[]},source={type:'custom:marao-people-card',entities:[],opaque:{keep:true},grid_options:{columns:12}};
 const previous=nativeCardFormData(source,card);
 assert.equal(Object.hasOwn(patchNativeCard(source,card,previous,{...previous,name:'People'}),'columns'),false);
 assert.deepEqual(patchNativeCard(source,card,previous,{...previous,columns:2}),{...source,columns:2});
});

test('event membership edits preserve legacy shape, opaque fields and per-source identity',async()=>{
 const {patchEventSources}=await import('../../frontend_src/event-card-editor.js');
 const legacy={type:'custom:marao-frigate-events-card',entity:'camera.a',frigate_instance_id:'main',opaque:{keep:1},grid_options:{columns:12}};
 assert.deepEqual(patchEventSources(legacy,[{entity:'camera.a',frigate_instance_id:'main'}]),legacy);
 const next=patchEventSources(legacy,[{entity:'camera.a',frigate_instance_id:'main',future:true},{entity:'camera.b',name:'B'}]);
 assert.equal(next.entity,undefined);assert.deepEqual(next.opaque,{keep:1});assert.equal(next.cameras[0].future,true);
 assert.deepEqual(patchEventSources(next,[]).cameras,[]);assert.equal(legacy.entity,'camera.a');
});
