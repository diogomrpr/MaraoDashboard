import test from 'node:test';
import assert from 'node:assert/strict';
import {peopleError,peopleRows,sectionsError,summarySections,summaryAction,escapeText} from '../../custom_components/marao_dashboard/frontend/MaraoCollections.js';
import {validateNativeCardConfig,composeNativeCard} from '../../frontend_src/card-composition.js';
import {mergeEntityValues} from '../../frontend_src/editor-model.js';
import {isAccessCover} from '../../custom_components/marao_dashboard/frontend/MaraoCards.js';
const base={type:'custom:marao-people-card',entities:['person.alex',{entity_id:'person.sam',future:[],name:'Sam'}],grid_options:{columns:12},visibility:[],future:false};
test('people validation and composition retain independent member/native data without a popup',()=>{
  const before=structuredClone(base);validateNativeCardConfig(base);
  assert.deepEqual(composeNativeCard(base,{instanceId:'test'}),{card:{type:'custom:marao-card',template:'md_people_card',entities:base.entities},popups:[]});
  assert.deepEqual(base,before);
  for(const entities of [null,['light.one'],['person.a','person.a'],[{entity_id:'person.a',name:5}],[[]]])assert.ok(peopleError({entities}));
  assert.equal(peopleError({entities:[]}),undefined);
  assert.deepEqual(mergeEntityValues(base.entities,['person.sam']),[base.entities[1]]);
});
test('people keep named places and independent neutral availability without tracking information',()=>{
  const config={entities:['person.a','person.b','person.c','person.d']},states={'person.a':{state:'home',attributes:{}},'person.b':{state:'Work',attributes:{}},'person.c':{state:'unavailable',attributes:{}}};
  assert.deepEqual(peopleRows(config,{language:'pt',states}).map(p=>p.place),['Em casa','Work','Indisponível','Entidade em falta']);
  states['person.a'].state='not_home';assert.equal(peopleRows(config,{states})[0].place,'Away');
  assert.ok(peopleRows(config,{}).every(p=>p.place==='Loading'));
  assert.ok(peopleRows(config,{states,connected:false}).every(p=>p.problem&&p.place==='Disconnected'));
  assert.equal(escapeText('<img>'),'&lt;img&gt;');
});
test('section assignment retains master order, explicit empty sections and the trailing unassigned members',()=>{
  const group={entities:['light.a','light.b','light.c'],summary_sections:[{id:'first',name:'First floor',entities:['light.b','light.a'],future:[]},{id:'ground',name:'Ground floor',entities:[]}]};
  assert.equal(sectionsError(group),undefined);
  assert.deepEqual(summarySections(group).map(s=>s.entities),[['light.a','light.b'],[],['light.c']]);
  assert.ok(sectionsError({...group,summary_sections:[...group.summary_sections,{id:'another',name:'Another',entities:['light.a']}]}));
  assert.ok(sectionsError({...group,summary_sections:[{id:'floor',name:'Floor',entities:['light.not_a_member']}]}));
  const config={type:'custom:marao-entity-group-card',template:'md_entity_group_card',id:'test',name:'Lights',entity_type:'light',...group};
  const popup=composeNativeCard(config,{instanceId:'test'}).popups[0];assert.deepEqual(popup.entity_group.summary_sections,group.summary_sections);
});
test('whole-summary targets include hidden inactive members; unsupported and access opening never dispatch',()=>{
  const states={'light.a':{state:'on'},'light.b':{state:'off'},'light.c':{state:'unavailable'},'cover.blind':{state:'closed',attributes:{supported_features:3}},'cover.garage':{state:'closed',attributes:{device_class:'garage',supported_features:3}},'cover.open_only':{state:'closed',attributes:{supported_features:1}}};
  assert.deepEqual(summaryAction({entity_type:'light'},['light.a','light.b','light.b','light.c'],true,{states},isAccessCover).batches[0].entities,['light.a','light.b']);
  const covers=['cover.blind','cover.garage','cover.open_only'];
  assert.deepEqual(summaryAction({entity_type:'cover'},covers,true,{states},isAccessCover).batches[0].entities,['cover.blind','cover.open_only']);
  assert.deepEqual(summaryAction({entity_type:'cover'},covers,false,{states},isAccessCover).batches[0].entities,['cover.blind','cover.garage']);
  assert.equal(summaryAction({entity_type:'cover'},covers,true,{states,connected:false},isAccessCover).batches.length,0);
});

test('people columns validate and compose without changing saved membership or layout',()=>{
  for(const columns of [1,2,6]){const source={...base,columns};const before=structuredClone(source);assert.equal(peopleError(source),undefined);assert.equal(composeNativeCard(source,{instanceId:'test'}).card.columns,columns);assert.deepEqual(source,before);}
  for(const columns of [null,'2',true,1.5,0,7])assert.ok(peopleError({...base,columns}));
});
