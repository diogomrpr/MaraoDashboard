import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {convertOrdinaryDocument} from '../../frontend_src/ordinary-model.js';
import cases from '../../ha-test/cases.js';
import {generatedPopupView,planPopupEdit,planManagedPopups,managedDescriptor} from '../../frontend_src/popup-management.js';
import {createManagedView,popupSettings,popupOwners} from '../../custom_components/marao_dashboard/frontend/MaraoPopupManaged.js';
const camera={type:'custom:marao-camera-card',entity_id:'camera.a',variables:{event_columns:2}};
const context={entities:[],language:'en'};
const documentFor=(owner=camera)=>({title:'Keep',marao:{version:1,navbar:{routes:[]}},views:[{type:'sections',path:'home',sections:[{cards:[structuredClone(owner),{type:'markdown',content:'Untouched',future:[]}]}]}],future:false});

test('first edit creates one managed source and a later edit is an exact no-op',()=>{
  const document=documentFor(),before=structuredClone(document),first=planPopupEdit(document,camera,'home','/marao-dashboard/home',context);
  assert.deepEqual(document,before);assert.equal(first.view.marao_popup.version,1);
  assert.deepEqual(first.config.views[0].sections[0].cards[1],before.views[0].sections[0].cards[1]);
  const owner=first.config.views[0].sections[0].cards[0];
  const again=planPopupEdit(first.config,owner,'home','/marao-dashboard/home',context);
  assert.equal(again.path,first.path);assert.deepEqual(again.config,first.config);
});

test('reopening with different language or reported entity metadata does not persist runtime state or rewrite defaults',()=>{
  const owner={type:'custom:marao-entity-group-card',id:'lights',name:'Lights',entity_type:'light',entities:['light.a']};
  const first=planPopupEdit(documentFor(owner),owner,'home','/marao-dashboard/home',{entities:[{entity_id:'light.a',name:'Initial',state:'on',brightness:123}],language:'en'});
  const child=first.view.sections[0].cards.find(card=>card.entity_id==='light.a');assert.equal(child.state,undefined);assert.equal(child.brightness,undefined);
  const config=first.config.views[0].sections[0].cards[0],again=planPopupEdit(first.config,config,'home','/marao-dashboard/home',{entities:[{entity_id:'light.a',name:'Renamed',state:'off',brightness:0}],language:'pt'});
  assert.deepEqual(again.config,first.config);
});

test('saved camera options update generated controls while custom layout and deleted roles remain',()=>{
  const first=planPopupEdit(documentFor(),camera,'home','/marao-dashboard/home',context),document=first.config;
  const stream=first.view.sections[0].cards[0];stream.grid_options={columns:6,rows:8};stream.name='My stream';
  first.view.sections[0].cards.push({type:'markdown',content:'Custom',future:[]});
  const owner=document.views[0].sections[0].cards[0];owner.variables={event_columns:3,popup_stream_entity:'camera.high'};
  const result=planManagedPopups(document,context),view=result.views.at(-1);
  assert.equal(view.sections[0].cards[0].entity,'camera.high');assert.deepEqual(view.sections[0].cards[0].grid_options,{columns:6,rows:8});assert.equal(view.sections[0].cards[0].name,'My stream');
  assert.equal(view.sections[0].cards[1].columns,3);assert.deepEqual(view.sections[0].cards[2],first.view.sections[0].cards[2]);
  assert.deepEqual(planManagedPopups(result,context),result);
  view.sections[0].cards.splice(1,1);result.views[0].sections[0].cards[0].variables.event_columns=4;
  assert.equal(planManagedPopups(result,context).views.at(-1).sections[0].cards.some(card=>card.type==='custom:marao-camera-events-card'),false);
});

test('inline media and disabled graph retain their source and restore it with current options',()=>{
  for(const [owner,key,inactive,active]of [[{type:'custom:marao-media-card',entity_id:'media_player.a'},'media_display','inline','popup'],[{type:'custom:marao-graph-card',entity_id:'sensor.a',variables:{history_popup:true}},'history_popup',false,true]]) {
    const first=planPopupEdit(documentFor(owner),owner,'home','/marao-dashboard/home',context),saved=first.config;
    const card=saved.views[0].sections[0].cards[0];card.variables={...card.variables,[key]:inactive};
    const parked=planManagedPopups(saved,context);assert.equal(parked.views.at(-1).marao_popup.active,false);assert.deepEqual(parked.views.at(-1).sections,first.view.sections);
    parked.views[0].sections[0].cards[0].variables[key]=active;
    const restored=planManagedPopups(parked,context);assert.equal(restored.views.at(-1).marao_popup.active,true);assert.equal(restored.views.length,saved.views.length);
  }
});

test('group filter and family updates keep custom visibility and restore previous geometry',()=>{
  const group={type:'custom:marao-entity-group-card',id:'lights',name:'Lights',entity_type:'light',entities:['light.a'],popup_filter:'active'};
  const first=planPopupEdit(documentFor(group),group,'home','/marao-dashboard/home',context),document=first.config,owner=document.views[0].sections[0].cards[0];
  const light=first.view.sections[0].cards.find(card=>card.entity_id==='light.a');light.visibility.push({condition:'user',users:['fake']});light.grid_options={columns:5,rows:4};
  first.view.sections[0].cards.push({type:'tile',entity:'sensor.extra',future:[]});owner.popup_filter='all';
  const all=planManagedPopups(document,context);assert.deepEqual(all.views.at(-1).sections[0].cards.find(card=>card.entity_id==='light.a').visibility,[{condition:'user',users:['fake']}]);
  all.views.at(-1).sections[0].cards=all.views.at(-1).sections[0].cards.filter(card=>card.type!=='custom:marao-summary-actions');
  Object.assign(all.views[0].sections[0].cards[0],{entity_type:'cover',entities:['cover.b']});
  const covers=planManagedPopups(all,context);assert.ok(covers.views.at(-1).sections[0].cards.some(card=>card.entity_id==='cover.b'));assert.ok(covers.views.at(-1).sections[0].cards.some(card=>card.type==='tile'));
  Object.assign(covers.views[0].sections[0].cards[0],{entity_type:'light',entities:['light.a']});
  const returned=planManagedPopups(covers,context);assert.deepEqual(returned.views.at(-1).sections[0].cards.find(card=>card.entity_id==='light.a').grid_options,{columns:5,rows:4});
  assert.equal(returned.views.at(-1).sections[0].cards.some(card=>card.type==='custom:marao-summary-actions'),false);
});

test('a divergent shared owner gets its own source without changing the other owner or external definition',()=>{
  const first=planPopupEdit(documentFor(),camera,'home','/marao-dashboard/home',context),document=first.config;
  const second={...structuredClone(document.views[0].sections[0].cards[0]),name:'Second'};document.views[0].sections[0].cards.push(second);
  const before=structuredClone(document.views.at(-1));second.variables.event_columns=5;
  const result=planManagedPopups(document,context);
  assert.equal(result.views.length,3);assert.deepEqual(result.views[1],before);
  assert.equal(result.views[0].sections[0].cards[0].popup_view,first.path);assert.notEqual(result.views[0].sections[0].cards[2].popup_view,first.path);
  assert.equal(result.views[2].sections[0].cards[1].columns,5);assert.deepEqual(planManagedPopups(result,context),result);
});

test('hash-backed sources retain their exact custom content and explicit direct references take precedence',()=>{
  const owner={type:'custom:marao-entity-group-card',id:'lights',name:'Lights',entity_type:'light',entities:['light.a'],variables:{popup_hash:'#old'}};
  const document=documentFor(owner),popup={type:'custom:marao-popup-card',hash:'#old',name:'Saved',entity_group:{entity_type:'light',entities:['light.a']},cards:[{type:'custom:marao-card',template:'md_light_card',entity:'light.a',name:'Saved label'}],future:[]};
  document.views[0].sections[0].cards.push(popup);
  const first=planPopupEdit(document,owner,'home','/marao-dashboard/home',context);
  assert.deepEqual(first.config.views[0].sections[0].cards[0],owner);assert.deepEqual(first.config.views[0].sections[0].cards[2],{...popup,popup_view:first.path});
  assert.ok(first.view.sections[0].cards.some(card=>card.name==='Saved label'));
  const direct={...owner,popup_view:first.path};first.config.views[0].sections[0].cards[0]=direct;
  assert.equal(popupOwners(first.config).find(binding=>binding.config.id==='lights').external,false);
  assert.deepEqual(planPopupEdit(first.config,direct,'home','/marao-dashboard/home',context).config,first.config);
});

test('managed child details keep automatic nested popup ownership and invalid access targets fail before a plan',()=>{
  const group={type:'custom:marao-entity-group-card',id:'climates',name:'Climate',entity_type:'climate',entities:['climate.a']};
  const view=generatedPopupView(group,'popup-test','/marao-dashboard/home',context);
  assert.equal(view.sections[0].cards.find(card=>card.entity_id==='climate.a').variables?.mode_selector_hash,undefined);
  assert.throws(()=>generatedPopupView({type:'custom:marao-access-card',entity_id:'lock.a',variables:{access_mode:'slide',action_service:'lock.lock'}},'popup-test','/home',context),/native opening service/);
});

test('provenance-backed historical hashes adopt only on explicit edit and preserve original definitions',()=>{
  const read=name=>fs.readFileSync(new URL('../../ha-test/upgrade/fixtures/'+name,import.meta.url),'utf8');
  const provenance=JSON.parse(read('native-baselines.json'));
  for(const record of provenance.records.filter(record=>['v0.17.0','v0.20.0','v0.21.1'].includes(record.tag))) {
    const input=read(record.input);assert.equal(createHash('sha256').update(input).digest('hex'),record.input_sha256);
    const document=convertOrdinaryDocument(input,{dashboardRoot:'marao-dashboard',entities:[],areas:[]}).document,before=structuredClone(document);
    assert.deepEqual(planManagedPopups(document,context),before);
    const binding=popupOwners(document).find(binding=>binding.external&&binding.config.template==='md_entity_group_card');assert.ok(binding);
    const result=planPopupEdit(document,binding.config,binding.currentPath,'/marao-dashboard/'+binding.currentPath,context);
    const at=(value,address)=>address.reduce((item,key)=>item[key],value);
    assert.deepEqual(at(result.config,binding.address),binding.config);
    assert.deepEqual(at(result.config,binding.sourceAddress),{...binding.source,popup_view:result.path});
    assert.deepEqual(document,before);assert.equal(result.view.marao_popup.version,1);
    assert.deepEqual(result.config.marao,before.marao);
  }
});

test('the safe existing Cases example keeps one dashboard, helpers and custom layout through a settings update',async()=>{
  const before={views:[{type:'sections',path:'card-test',sections:[]}],future:{preserve:false}},example=await cases.managedPopupExample(before);
  assert.deepEqual(before,{views:[{type:'sections',path:'card-test',sections:[]}],future:{preserve:false}});
  example.config.views[0].sections[0].cards[0].popup_filter='active';
  const updated=planManagedPopups(example.config,context);assert.equal(updated.views.length,2);
  assert.deepEqual(updated.views[1].sections[0].cards.at(-1),example.view.sections[0].cards.at(-1));assert.deepEqual(updated.views[1].sections[0].cards[1].grid_options,{columns:6,rows:3});
  assert.equal(updated.views[1].back_path,'/marao-dashboard/card-test');
});
