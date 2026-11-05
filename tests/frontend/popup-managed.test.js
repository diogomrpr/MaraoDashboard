import test from 'node:test';
import assert from 'node:assert/strict';
import {createManagedView,reconcileManagedView,managedPopupError,managedPopupCurrent,adoptManagedView} from '../../custom_components/marao_dashboard/frontend/MaraoPopupManaged.js';
const owner={type:'custom:marao-camera-card',entity_id:'camera.a',variables:{event_columns:2}};
const source=()=>({type:'sections',path:'details',sections:[{type:'grid',cards:[{type:'custom:marao-camera-card',entity:'camera.a',name:'Camera',grid_options:{columns:12,rows:4}},{type:'custom:marao-camera-events-card',cameras:[{entity:'camera.a'}],columns:2,grid_options:{columns:12}}]}],future:{keep:[]}});

test('managed view records round trip, do not mutate input and reject newer or malformed metadata',()=>{
  const input=source(),before=structuredClone(input),view=createManagedView(input,owner);
  assert.deepEqual(input,before);assert.equal(managedPopupError(view),undefined);
  assert.deepEqual(reconcileManagedView(view,owner,source()),view);
  assert.equal(managedPopupCurrent(view,owner),true);
  const newer={...view,marao_popup:{...view.marao_popup,version:2}},saved=structuredClone(newer);
  assert.throws(()=>reconcileManagedView(newer,owner,source()),/compatible Marao/);assert.deepEqual(newer,saved);
  assert.match(managedPopupError({...view,marao_popup:{version:1}}),/invalid/);
});

test('managed options change while placement, presentation, unknown data and raw cards remain exact',()=>{
  const view=createManagedView(source(),owner),camera=view.sections[0].cards.shift();camera.name='Front';camera.grid_options={columns:6,rows:7};camera.future={keep:false};
  view.sections.push({type:'grid',cards:[camera,{type:'markdown',content:'Custom',future:[]}],future:{keep:null}});
  const before=structuredClone(view),generated=source();generated.sections[0].cards[0].entity='camera.b';generated.sections[0].cards[1].cameras=[{entity:'camera.b'}];generated.sections[0].cards[1].columns=3;
  const next=reconcileManagedView(view,{...owner,entity_id:'camera.b',variables:{event_columns:3}},generated);
  assert.deepEqual(view,before);
  assert.deepEqual(next.sections,[{type:'grid',cards:[{...view.sections[0].cards[0],cameras:[{entity:'camera.b'}],columns:3}]},{type:'grid',cards:[{...camera,entity:'camera.b'},view.sections[1].cards[1]],future:{keep:null}}]);
});

test('deletions and empty sections survive updates while newly selected roles can be added',()=>{
  const view=createManagedView(source(),owner);view.sections[0].cards=[];
  const generated=source();generated.sections[0].cards.push({type:'custom:marao-climate-card',entity_id:'climate.a'});
  const next=reconcileManagedView(view,{...owner,variables:{event_columns:3}},generated);
  assert.deepEqual(next.sections[0].cards.map(card=>card.type),['custom:marao-climate-card']);
  const empty=reconcileManagedView(createManagedView({...source(),sections:[{cards:[]}]},owner),owner,{...source(),sections:[{cards:[]}]});assert.deepEqual(empty.sections,[{cards:[]}]);
  assert.equal(next.marao_popup.suppressed.length,2);
});

test('filter visibility contribution changes without replacing custom conditions or duplicate layout instances',()=>{
  const group={template:'md_entity_group_card',entity_type:'light',entities:['light.a']};
  const generated={type:'sections',path:'p',sections:[{cards:[{type:'custom:marao-light-card',entity_id:'light.a',visibility:[{condition:'state',entity:'light.a',state:'on'}]}]}]};
  const view=createManagedView(generated,group);view.sections[0].cards[0].visibility.push({condition:'user',users:['fake']});
  const duplicate=structuredClone(view.sections[0].cards[0]);duplicate.grid_options={columns:6};view.sections[0].cards.push(duplicate);
  const all=structuredClone(generated);delete all.sections[0].cards[0].visibility;
  const next=reconcileManagedView(view,{...group,popup_filter:'all'},all);
  assert.equal(next.sections[0].cards.length,2);
  for(const card of next.sections[0].cards)assert.deepEqual(card.visibility,[{condition:'user',users:['fake']}]);
  assert.deepEqual(next.sections[0].cards[1].grid_options,{columns:6});
});

test('type transitions retain incompatible managed customization and independent custom content',()=>{
  const light={template:'md_entity_group_card',entity_type:'light',entities:['light.a']},cover={...light,entity_type:'cover',entities:['cover.b']};
  const seed=(type,id)=>({type:'sections',path:'p',sections:[{type:'grid',cards:[{type:'custom:marao-'+type+'-card',entity_id:id,name:'Default'}]}]});
  const view=createManagedView(seed('light','light.a'),light);view.sections[0].cards[0].name='Desk';view.sections[0].cards[0].grid_options={columns:5,rows:3};view.sections[0].cards.push({type:'tile',entity:'sensor.custom',future:[]});
  const next=reconcileManagedView(view,cover,seed('cover','cover.b'));
  assert.deepEqual(next.sections[0].cards.map(card=>card.type),['custom:marao-cover-card','tile']);
  assert.deepEqual(next.sections[0].cards[0].grid_options,{columns:5,rows:3});
  assert.deepEqual(next.sections[0].cards[1],view.sections[0].cards[1]);
  const restored=reconcileManagedView(next,light,seed('light','light.a'));
  assert.equal(restored.sections[0].cards[0].name,'Desk');assert.deepEqual(restored.sections[0].cards[0].grid_options,{columns:5,rows:3});
  assert.deepEqual(restored.sections[0].cards[1],view.sections[0].cards[1]);
});

test('raw functional overrides detach without loss and adoption requires functional provenance',()=>{
  const view=createManagedView(source(),owner);view.sections[0].cards[0].entity='camera.custom';
  const next=reconcileManagedView(view,{...owner,entity_id:'camera.b'},source());
  assert.equal(next.sections[0].cards[0].entity,'camera.custom');assert.equal(next.sections[0].cards[0].marao_popup_slot,undefined);
  assert.ok(next.marao_popup.suppressed.length);
  const older=source();older.sections[0].cards[0].name='Custom name';
  const adopted=adoptManagedView(older,owner,source());assert.equal(adopted.view.sections[0].cards[0].name,'Custom name');assert.ok(adopted.view.sections[0].cards[0].marao_popup_slot);
  const raw={type:'sections',path:'raw',sections:[{cards:[{type:'markdown',content:'Never replace',future:[]}]}]};
  const uncertain=adoptManagedView(raw,owner,source());assert.equal(uncertain.view,null);assert.deepEqual(uncertain.custom,raw.sections);
});

test('disabling and re-enabling climate details retains authored placement, slots and custom content',()=>{
  const climate={template:'md_climate_card',entity_id:'climate.safe',variables:{humidity_entity:'sensor.safe'}},generated={type:'sections',path:'climate-details',sections:[{type:'grid',cards:[{type:'custom:marao-climate-card',entity_id:'climate.safe',variables:{humidity_entity:'sensor.safe',show_mode_buttons:true}}]}]};
  const view=createManagedView(generated,climate);view.sections[0].cards[0].name='Custom';view.sections[0].cards[0].grid_options={columns:7,rows:8};view.sections[0].cards.push({type:'markdown',content:'Keep me',unknown:[]});
  const saved=structuredClone(view),off=reconcileManagedView(view,{...climate,variables:{...climate.variables,enable_popup:false}},null);
  assert.equal(off.marao_popup.active,false);assert.deepEqual(off.sections,saved.sections);assert.deepEqual(off.marao_popup.slots,saved.marao_popup.slots);
  const on=reconcileManagedView(off,climate,generated);assert.equal(on.marao_popup.active,true);assert.deepEqual(on.sections,saved.sections);assert.deepEqual(view,saved);
});
