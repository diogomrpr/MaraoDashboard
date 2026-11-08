import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {describeAuthoring,validateDashboard,planDashboardEdit,dashboardPatch} from '../../frontend_src/authoring.js';
import {NATIVE_CARD_TYPES} from '../../frontend_src/card-composition.js';
import {cards as documentedCards} from '../../docs/examples/manifest.js';
import {planPopupEdit} from '../../frontend_src/popup-management.js';

const metadata=describeAuthoring();
const card={type:'custom:marao-entity-group-card',id:'lights',name:'Lights',entity_type:'light',entities:['light.one','light.two']};
const context={dashboardRoot:'marao-dashboard',language:'en',entities:[{entity_id:'light.one',name:'One'},{entity_id:'light.two',name:'Two'},{entity_id:'cover.blind',device_class:'blind'}]};
const documentFor=(value=card)=>({title:'Keep',views:[{path:'home',type:'sections',sections:[{type:'grid',cards:[structuredClone(value),{type:'custom:other-card',opaque:{'a/~':null,list:[]}}]}]}],future:false});
const plan=(original,proposed=original,extra={})=>planDashboardEdit({original,proposed,config_hash:'opaque MCP hash',context,...extra});
const owner='/views/0/sections/0/cards/0';
function apply(document,patch) {
  const result=structuredClone(document);
  for(const operation of patch) {
    assert.ok(['add','remove','replace','test'].includes(operation.op));
    const parts=operation.path.slice(1).split('/').map(part=>part.replaceAll('~1','/').replaceAll('~0','~'));
    let target=result;for(const key of parts.slice(0,-1))target=target[key];
    const key=parts.at(-1);
    if(operation.op==='test')assert.deepEqual(target[key],operation.value);
    else if(operation.op==='remove')delete target[key];
    else target[key]=structuredClone(operation.value);
  }
  return result;
}
function blocked(result) {
  assert.equal(result.valid,false,JSON.stringify(result));assert.ok(result.diagnostics.length);
  for(const key of ['config','patch','config_hash'])assert.equal(Object.hasOwn(result,key),false,key);
}

test('metadata covers public native types, documented examples, aliases and audited defaults',()=>{
  for(const type of Object.values(NATIVE_CARD_TYPES))assert.ok(metadata.cards.some(card=>card.type===type),type);
  for(const docs of documentedCards) {
    const definition=describeAuthoring({type:docs.config.type});
    if(docs.relatedTo){assert.equal(validateDashboard({config:documentFor(docs.config)}).valid,true,docs.id);continue;}
    assert.deepEqual(definition.examples[0],docs.config);
    assert.equal(validateDashboard({config:documentFor(docs.config)}).valid,true,docs.id);
    assert.ok(definition.documentation_url.endsWith('/'+docs.slug+'/'));
  }
  assert.deepEqual(describeAuthoring({type:'custom:marao-light-card'}).effective_defaults,{variables:{enable_slider:true,use_light_color:false}});
  assert.equal(metadata.cards.some(card=>Object.hasOwn(card,'states')),false);
  assert.equal(metadata.schema.$schema,'https://json-schema.org/draft/2020-12/schema');
  assert.deepEqual(describeAuthoring({type:'custom:marao-media-card'}).schema.properties.apple_tv.properties.plex.properties.display.enum,['inline','popup']);
  assert.equal(Object.hasOwn(describeAuthoring({type:'custom:marao-entity-group-card'}).schema.properties,'entity_id'),false);
  const generic={type:'custom:marao-card',template:'hc_light_card',entity:'light.one',future:null};
  assert.equal(validateDashboard({config:documentFor(generic)}).valid,true);
  assert.deepEqual(plan(documentFor(generic)).config,documentFor(generic));
});

test('invalid fields, actions, types and root contracts identify paths without a payload',()=>{
  const invalid=documentFor({type:'custom:marao-light-card',entity_id:'light.one',variables:{use_light_color:'yes'}});
  const result=plan(invalid);blocked(result);assert.ok(result.diagnostics.some(error=>error.path===owner+'/variables/use_light_color'));
  blocked(plan(documentFor({type:'custom:marao-access-card',entity_id:'lock.entry',variables:{access_mode:'slide',action_service:'lock.lock'}})));
  blocked(plan(documentFor({type:'custom:marao-ligth-card',entity_id:'light.one'})));
  blocked(plan({views:[]},{views:[{cards:'invalid'}]}));
  const newer=documentFor();newer.marao={version:2,navbar:{routes:[]}};blocked(plan(newer));
  const fixed=structuredClone(invalid);fixed.views[0].sections[0].cards[0].variables.use_light_color=false;
  assert.equal(plan(invalid,fixed).valid,true,'An invalid saved card can be corrected');
});

test('no-op and ordinary edits preserve inputs, opaque values and exact hash',()=>{
  const original=documentFor({type:'custom:marao-light-card',entity:'light.one',future:null,variables:{unknown:[],enable_slider:false}}),before=structuredClone(original),proposed=structuredClone(original);
  proposed.views[0].sections[0].cards[0].name='Edited';proposed.extra={'a/b':false,'x~y':[]};
  const result=plan(original,proposed);assert.equal(result.valid,true,JSON.stringify(result.diagnostics));
  assert.deepEqual(original,before);assert.deepEqual(proposed,result.config);assert.equal(result.config_hash,'opaque MCP hash');
  assert.deepEqual(apply(original,result.patch),result.config);assert.deepEqual(plan(result.config).patch,[]);
  assert.equal(result.config.views.length,1,'No implicit popup source is created');
});

test('explicit popup creation and headless reconciliation preserve layout, deletion and custom content',()=>{
  const original=documentFor(),first=plan(original,original,{popup_edits:[owner]});assert.equal(first.valid,true,JSON.stringify(first.diagnostics));
  assert.equal(first.config.views.length,2);assert.equal(original.views.length,1);assert.ok(first.ownership[0].managed);
  assert.deepEqual(apply(original,first.patch),first.config);
  const saved=first.config,view=saved.views[1],one=view.sections[0].cards.find(card=>card.entity_id==='light.one');
  one.name='Custom name';one.grid_options={columns:5,rows:3};
  view.sections[0].cards=view.sections[0].cards.filter(card=>card.entity_id!=='light.two');
  view.sections[0].cards.push({type:'markdown',content:'Keep',opaque:{empty:[],nullable:null}});
  const proposed=structuredClone(saved);proposed.views[0].sections[0].cards[0].popup_filter='all';
  const updated=plan(saved,proposed);assert.equal(updated.valid,true,JSON.stringify(updated.diagnostics));
  const cards=updated.config.views[1].sections[0].cards;
  assert.equal(cards.find(card=>card.entity_id==='light.one').name,'Custom name');assert.deepEqual(cards.find(card=>card.entity_id==='light.one').grid_options,{columns:5,rows:3});
  assert.equal(cards.some(card=>card.entity_id==='light.two'),false);assert.deepEqual(cards.at(-1),view.sections[0].cards.at(-1));
  assert.deepEqual(plan(updated.config).patch,[]);
});

test('family transitions retain customization and shared owners fork without retargeting others',()=>{
  const first=planPopupEdit(documentFor(),card,'home','/marao-dashboard/home',context).config;
  first.views[1].sections[0].cards.find(card=>card.entity_id==='light.one').grid_options={columns:4,rows:2};
  const original=structuredClone(first),proposed=structuredClone(first);
  Object.assign(proposed.views[0].sections[0].cards[0],{entity_type:'cover',entities:['cover.blind']});
  const changed=plan(original,proposed);assert.equal(changed.valid,true,JSON.stringify(changed.diagnostics));
  const back=structuredClone(changed.config);Object.assign(back.views[0].sections[0].cards[0],{entity_type:'light',entities:['light.one','light.two']});
  const returned=plan(changed.config,back);assert.equal(returned.valid,true,JSON.stringify(returned.diagnostics));
  assert.deepEqual(returned.config.views[1].sections[0].cards.find(card=>card.entity_id==='light.one').grid_options,{columns:4,rows:2});
  original.views[0].sections[0].cards.push({...structuredClone(original.views[0].sections[0].cards[0]),name:'Other'});
  const forked=structuredClone(original);forked.views[0].sections[0].cards[2].popup_filter='all';
  const result=plan(original,forked);assert.equal(result.valid,true,JSON.stringify(result.diagnostics));assert.equal(result.config.views.length,3);
  assert.deepEqual(result.config.views[1],original.views[1]);assert.notEqual(result.config.views[0].sections[0].cards[2].popup_view,original.views[0].sections[0].cards[0].popup_view);
});

test('invalid ownership, newer metadata, tampered provenance and missing context have no save payload',()=>{
  const original=planPopupEdit(documentFor(),card,'home','/marao-dashboard/home',context).config;
  const newer=structuredClone(original);newer.views[1].marao_popup.version=99;blocked(plan(newer));
  const tampered=structuredClone(original);tampered.views[1].marao_popup.suppressed.push('made-up');blocked(plan(original,tampered));
  const missing=structuredClone(original);missing.views.pop();blocked(plan(missing));
  blocked(plan(original,original,{context:{entities:[],dashboardRoot:'marao-dashboard'}}));
  blocked(plan(original,original,{context:{dashboardRoot:'marao-dashboard'}}));
  blocked(plan(original,original,{config_hash:''}));
  blocked(plan(original,original,{popup_edits:['/views/0/sections/0/cards/99']}));
  const ambiguous=documentFor();ambiguous.views[0].sections[0].cards.push(structuredClone(card));blocked(plan(ambiguous,ambiguous,{popup_edits:[owner]}));
});

test('nested native card containers validate without interpreting opaque custom data',()=>{
  const config=documentFor({type:'conditional',conditions:[],card:{type:'custom:marao-light-card',entity_id:'light.one'}});
  assert.equal(validateDashboard({config}).valid,true);
  config.views[0].sections[0].cards[0].card.variables={use_light_color:'wrong'};
  assert.equal(validateDashboard({config}).valid,false);
  config.views[0].sections[0].cards[0]={type:'custom:other-card',opaque:{type:'custom:marao-ligth-card',future:null}};
  assert.equal(validateDashboard({config}).valid,true);
});

test('popup owners inside conditional cards use the same traversal for creation and reconciliation',()=>{
  const original=documentFor({type:'conditional',conditions:[],card}),nested=owner+'/card';
  const first=plan(original,original,{popup_edits:[nested]});assert.equal(first.valid,true,JSON.stringify(first.diagnostics));
  assert.equal(first.ownership[0].owner,nested);assert.equal(first.config.views.length,2);
  const proposed=structuredClone(first.config);proposed.views[0].sections[0].cards[0].card.popup_filter='all';
  const updated=plan(first.config,proposed);assert.equal(updated.valid,true,JSON.stringify(updated.diagnostics));
  assert.deepEqual(updated.config.views[1].marao_popup.settings.popup_filter,'all');assert.deepEqual(plan(updated.config).patch,[]);
  const invalid=documentFor();invalid.views[0].marao_popup=null;blocked(plan(documentFor(),invalid));
});

test('JSON Patch escapes literal keys, preserves collection order and coalesces within 100 operations',()=>{
  const original={'a/b':{'x~y':null,remove:[]},array:[3,2,1]},proposed={'a/b':{'x~y':false,new:[]},array:[1,3]};
  const patch=dashboardPatch(original,proposed);assert.ok(patch.some(operation=>operation.path==='/a~1b/x~0y'));
  assert.deepEqual(apply(original,patch),proposed);
  const large={views:[],nested:Object.fromEntries(Array.from({length:101},(_,i)=>['key'+i,i]))},next=structuredClone(large);for(const key of Object.keys(next.nested))next.nested[key]++;
  const compact=dashboardPatch(large,next);assert.equal(compact.length,1);assert.deepEqual(apply(large,compact),next);
  const tooLarge=Object.fromEntries(Array.from({length:101},(_,i)=>['key'+i,i]));assert.throws(()=>dashboardPatch({},tooLarge),/100 patch/);
  const tooMany=plan({views:[]},{views:[],...tooLarge});blocked(tooMany);
});

test('standalone CLI works after copying one asset and returns JSON failures without IO APIs',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'marao-authoring-cli-'));
  try {
    const asset=path.join(directory,'planner.mjs');fs.copyFileSync('custom_components/marao_dashboard/frontend/MaraoAuthoringCLI.mjs',asset);
    const run=(command,input)=>spawnSync(process.execPath,[asset,command],{input,encoding:'utf8',cwd:directory});
    const described=run('describe','');assert.equal(described.status,0,described.stderr);assert.equal(JSON.parse(described.stdout).package_version,metadata.package_version);
    const original=documentFor(),request={original,proposed:original,config_hash:'hash',context};
    const planned=run('plan',JSON.stringify(request));assert.equal(planned.status,0,planned.stderr);assert.deepEqual(JSON.parse(planned.stdout).patch,[]);
    const valid=run('validate',JSON.stringify({config:original}));assert.equal(valid.status,0,valid.stderr);
    for(const [command,input]of [['plan','{'],['plan','null'],['plan','{}'],['describe','{"type":"invalid"}'],['bad','{}']]) {
      const failure=run(command,input);assert.equal(failure.status,1);assert.ok(JSON.parse(failure.stdout).diagnostics.length);assert.equal(failure.stderr,'');
    }
    assert.deepEqual(fs.readdirSync(directory),['planner.mjs']);
    const source=fs.readFileSync(asset,'utf8');assert.doesNotMatch(source,/node:(?:fs|http|https|net)|lovelace\/config\/save|indexedDB\.open|fetch\(/);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
