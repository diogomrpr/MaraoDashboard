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
