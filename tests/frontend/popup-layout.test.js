import test from 'node:test';
import assert from 'node:assert/strict';
import {appendPopupView,seedPopupView,popupGroupFromView,resolvePopupView,popupViewError,savePopupLayout} from '../../custom_components/marao_dashboard/frontend/MaraoPopupLayout.js';
import {composeNativeCard,validateNativeCardConfig} from '../../frontend_src/card-composition.js';
import {nativeCardFormData,patchNativeCard,MaraoCardEditor} from '../../frontend_src/native-card-editor.js';
import {catalog} from '../../frontend_src/native-model.js';
import {summaryAction} from '../../custom_components/marao_dashboard/frontend/MaraoCollections.js';
import {mountPopupView,registerPopupActions} from '../../custom_components/marao_dashboard/frontend/MaraoPopupView.js';
const opener={type:'custom:marao-entity-group-card',id:'lights',entity_type:'light',entities:[{entity_id:'light.a',name:'Desk',unknown:{keep:[]}},'light.b'],summary_sections:[{id:'floor',name:'Floor',entities:['light.a']}],popup_filter:'active',grid_options:{columns:6,rows:3},unknown:{empty:[]}};
const popup={title:'Lights',entity_group:{...opener,entities:['light.a','light.b'],members:opener.entities},cards:[]};
const source=()=>({title:'Keep',marao:{unknown:[]},views:[{path:'home',unknown:1,sections:[{type:'grid',cards:[structuredClone(opener),{type:'markdown',content:'untouched',unknown:[]}]}]},{path:'empty',cards:[],unknown:{keep:true}}]});

test('append and bind preserves all unrelated native data and explicit empty values without mutating its source',()=>{
  const original=source(),saved=structuredClone(original),view=seedPopupView(popup,'popup-test','/marao-dashboard/home');
  const next=appendPopupView(original,opener,'home',view),expected=source();expected.views[0].sections[0].cards[0].popup_view='popup-test';expected.views.push(view);
  assert.deepEqual(next,expected);assert.deepEqual(original,saved);
  assert.equal(view.type,'sections');assert.equal(view.subview,true);assert.equal(view.back_path,'/marao-dashboard/home');
  assert.deepEqual(view.sections.map(section=>section.cards.map(card=>card.type)),[
    ['custom:marao-summary-actions','heading','custom:marao-summary-actions','custom:marao-light-card'],
    ['heading','custom:marao-summary-actions','custom:marao-light-card']]);
  const member=view.sections[0].cards[3];assert.deepEqual(member.unknown,{keep:[]});assert.equal(member.name,'Desk');assert.deepEqual(member.grid_options,{columns:12});
  assert.deepEqual(member.visibility,[{condition:'state',entity:'light.a',state:'on'}]);
  assert.throws(()=>appendPopupView(next,opener,'home',view),/already exists/);
  const duplicate=source();duplicate.views[0].sections[0].cards.push(structuredClone(opener));assert.throws(()=>appendPopupView(duplicate,opener,'home',view),/duplicated/);
  assert.throws(()=>appendPopupView(source(),{...opener,name:'stale'},'home',view),/missing/);
  assert.throws(()=>appendPopupView({...source(),strategy:{}},opener,'home',view),/ordinary/);
});

test('generic seeding retains native dimensions, visibility, opaque cards, empty sections and raw stacks',()=>{
  const card={type:'tile',entity:'light.a',grid_options:{columns:5,rows:4},visibility:[{condition:'state',entity:'light.a',state:'off'}],unknown:[]};
  const stack={type:'vertical-stack',cards:[{type:'markdown',content:'Keep'}],unknown:true};
  const view=seedPopupView({cards:[{type:'custom:marao-control-grid',columns:2,cards:[card,{type:'custom:marao-card',template:'md_light_card',entity:'light.b'}]},stack]},'popup-test','/x/home');
  assert.deepEqual(view.sections[0].cards[0],card);assert.deepEqual(view.sections[0].cards[1],{type:'custom:marao-light-card',template:'md_light_card',entity:'light.b',grid_options:{columns:6}});
  assert.deepEqual(view.sections[0].cards[2],{...stack,grid_options:{columns:12}});
  assert.deepEqual(seedPopupView({cards:[]},'popup-empty','/x').sections,[{type:'grid',cards:[]}]);
  for(const value of ['',null,12,'/other/path','#popup','with spaces'])assert.ok(popupViewError({popup_view:value}));
  assert.throws(()=>resolvePopupView({views:[]},'missing'),/missing/);
  assert.throws(()=>resolvePopupView({views:[{path:'p',type:'sections'},{path:'p',type:'sections'}]},'p'),/ambiguous/);
  assert.throws(()=>resolvePopupView({views:[{path:'p',type:'masonry'}]},'p'),/Sections/);
});

test('linked membership follows saved sections independently of visibility and ignores actions or unrelated entities',()=>{
  const view={type:'sections',sections:[{cards:[{type:'heading',heading:'Upstairs'},{type:'tile',entity:'light.b',visibility:[{condition:'state',entity:'light.b',state:'on'}]},{type:'button',tap_action:{action:'perform-action',target:{entity_id:'light.c'}}}]},{cards:[{type:'entities',entities:['light.a','sensor.room']},{type:'vertical-stack',cards:[{type:'custom:marao-light-card',entity_id:'light.b'}]}]}]};
  const group=popupGroupFromView(opener,view);assert.deepEqual(group.entities,['light.b','light.a']);assert.deepEqual(group.summary_sections.map(s=>s.entities),[['light.b'],['light.a','light.b']]);
  view.sections[1].cards=[];assert.deepEqual(popupGroupFromView(opener,view).entities,['light.b']);
  const battery=popupGroupFromView({entity_type:'battery'},{sections:[{cards:[{type:'tile',entity:'sensor.temperature'},{type:'tile',entity:'sensor.charge'},{type:'custom:marao-battery-card',entity_id:'sensor.offline'}]}]},[{entity_id:'sensor.charge',device_class:'battery'}]);assert.deepEqual(battery.entities,['sensor.charge','sensor.offline']);
  const covers=popupGroupFromView({entity_type:'cover'},{sections:[{cards:[{type:'custom:marao-access-card',entity_id:'cover.entry'},{type:'custom:marao-fan-card',entity_id:'cover.vent'}]}]});
  assert.deepEqual(covers.entities,['cover.entry']);assert.equal(summaryAction(covers,covers.entities,true,{states:{'cover.entry':{state:'closed',attributes:{supported_features:3}}}},()=>false).batches.length,0);
});

test('native composition uses the saved layout without changing retained automatic settings or external ownership',()=>{
  const config={...opener,popup_view:'popup-test'},before=structuredClone(config),dashboard=source();dashboard.views.push({type:'sections',path:'popup-test',sections:[{cards:[{type:'tile',entity:'light.c'}]}]});
  const result=composeNativeCard(config,{instanceId:'one',dashboard});assert.deepEqual(result.card.variables.summary_entities,['light.c']);assert.equal(result.popups[0].popup_view,'popup-test');assert.deepEqual(config,before);
  const linked=composeNativeCard({...config,variables:{popup_hash:'#external'}},{instanceId:'two',dashboard});assert.equal(linked.popups[0].popup_view,'popup-test');assert.notEqual(linked.popups[0].hash,'#external');
  assert.equal(composeNativeCard({...opener,variables:{popup_hash:'#external'}},{instanceId:'three',dashboard}).popups.length,0);
  assert.throws(()=>validateNativeCardConfig({...config,popup_view:'/bad'}),/Sections/);
  const card=catalog.cards.find(c=>c.id==='md_entity_group_card'),data=nativeCardFormData(config,card);
  assert.deepEqual(patchNativeCard(config,card,data,{...data,name:'Renamed'}),{...config,name:'Renamed'});
  const automatic=patchNativeCard(config,card,data,{...data,popup_view:''});assert.equal(Object.hasOwn(automatic,'popup_view'),false);assert.deepEqual(automatic.entities,opener.entities);
});

function saveFixture() {
  const baseline=source(),writes=[],preserved=[],records=new Map();let reads=0,current=true,saved=baseline;
  const hass={user:{id:'admin',is_admin:true},connection:{connected:true},async callWS(){reads++;return structuredClone(saved);}};
  const root={lovelace:{mode:'storage',config:baseline,async saveConfig(next){writes.push(next);saved=next;this.config=next;}}};
  const journal={async read(key){return records.get(key);},async stage(key,value){records.set(key,value);preserved.push(structuredClone(value));},async clear(key){records.delete(key);}};
  const args={hass,root,opener,popup,currentPath:'home',path:'marao-dashboard',backPath:'/marao-dashboard/home',isCurrent:()=>current,journal};
  return {baseline,writes,preserved,records,args,setCurrent:value=>current=value,get reads(){return reads;}};
}
test('layout creation performs one verified native save with internal preservation and no export contract',async()=>{
  const f=saveFixture();f.args.root.lovelace.editMode=true;const result=await savePopupLayout(f.args);assert.equal(f.reads,3);assert.equal(f.writes.length,1);assert.equal(f.preserved.length,1);assert.deepEqual(f.preserved[0].original,f.baseline);assert.deepEqual(f.preserved[0].proposed,result.config);assert.equal(f.records.size,0);assert.equal(result.config.views.length,f.baseline.views.length+1);
  for(const setup of [f=>f.setCurrent(false),f=>f.args.hass.user.is_admin=false,f=>f.args.root.lovelace.config={...source(),title:'Unsaved'},f=>f.args.hass.connection.connected=false,f=>f.args.root.lovelace.mode='yaml']) {
    const blocked=saveFixture();setup(blocked);await assert.rejects(savePopupLayout(blocked.args));assert.equal(blocked.writes.length,0);assert.equal(blocked.preserved.length,0);
  }
  const stale=saveFixture();let reads=0;stale.args.hass.callWS=async()=>++reads===1?source():({...source(),title:'changed'});await assert.rejects(savePopupLayout(stale.args),/Dashboard changed/);assert.equal(stale.writes.length,0);
});
test('failed saves read back without retrying a write or requiring a recovery download',async()=>{
  const f=saveFixture();f.args.root.lovelace.saveConfig=async next=>{f.writes.push(next);throw new Error('lost acknowledgement');};await assert.rejects(savePopupLayout(f.args),/not saved/);assert.equal(f.writes.length,1);assert.equal(f.preserved.length,1);assert.equal(f.records.size,0);assert.equal(f.reads,3);
  const acknowledged=saveFixture();acknowledged.args.root.lovelace.saveConfig=async next=>{acknowledged.writes.push(next);acknowledged.args.hass.callWS=async()=>next;throw new Error('lost acknowledgement');};assert.ok((await savePopupLayout(acknowledged.args)).path);assert.equal(acknowledged.writes.length,1);
});

test('creation rechecks lifecycle after internal staging and verifies acknowledged writes',async()=>{
  for(const interrupt of [f=>f.setCurrent(false),f=>f.args.root.lovelace.config={...source(),title:'Changed during staging'}]) {
    const f=saveFixture(),stage=f.args.journal.stage;f.args.journal.stage=async(...args)=>{await stage(...args);interrupt(f);};
    await assert.rejects(savePopupLayout(f.args),/Dashboard changed/);assert.equal(f.preserved.length,1);assert.equal(f.writes.length,0);assert.equal(f.records.size,0);
  }
  const f=saveFixture();f.args.root.lovelace.saveConfig=async next=>{f.writes.push(next);};
  await assert.rejects(savePopupLayout(f.args),/not saved/);assert.equal(f.writes.length,1);assert.equal(f.preserved.length,1);
});

test('native popup host forwards state without remounting or writes, handles missing sources and disposes subscriptions',t=>{
  const previous={document:globalThis.document,customElements:globalThis.customElements,ResizeObserver:globalThis.ResizeObserver};t.after(()=>Object.assign(globalThis,previous));
  const nodes=[],controllers=new Set();let disconnected=false,writes=0;
  globalThis.document={createElement:type=>{const node={localName:type,style:{},setAttribute(){},addEventListener(){},remove(){this.removed=true;}};nodes.push(node);return node;}};
  globalThis.customElements={get:()=>true};globalThis.ResizeObserver=class{observe(){}disconnect(){disconnected=true;}};
  const document={views:[{path:'popup-test',type:'sections',sections:[]}]},root={localName:'hui-root',lovelace:{config:document,saveConfig(){writes++;}},addController:c=>controllers.add(c),removeController:c=>controllers.delete(c)};
  const owner={nativeOwner:root,_config:{popup_view:'popup-test'},_hass:{states:{}},preview:false},host={clientWidth:320,replaceChildren(...children){this.children=children;}};
  const bridge=mountPopupView(owner,host),view=host.children[0];assert.equal(view.localName,'hui-view');assert.equal(view.index,0);assert.equal(view.narrow,true);assert.equal(view.lovelace.editMode,false);assert.equal(controllers.size,1);
  const hass={states:{'light.a':{state:'on'}}};owner._hass=hass;bridge.update();assert.equal(host.children[0],view);assert.equal(view.hass,hass);assert.equal(writes,0);assert.throws(()=>view.lovelace.saveConfig({}),/linked/);
  root.lovelace={config:{views:[]}};bridge.update();assert.equal(host.children[0].localName,'p');assert.match(host.children[0].textContent,/missing/);assert.ok(view.removed);
  root.lovelace={config:document};bridge.update();assert.equal(host.children[0].localName,'hui-view');bridge.destroy();assert.equal(controllers.size,0);assert.equal(disconnected,true);
});

test('HTTP hosts without randomUUID can create a collision-checked native view',async t=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'crypto');t.after(()=>Object.defineProperty(globalThis,'crypto',previous));
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:array=>{array.set([1,2,3,4]);return array;}}});
  const f=saveFixture();assert.equal((await savePopupLayout(f.args)).path,'popup-01020304');assert.equal(f.writes.length,1);
});
test('native section actions follow their containing section, refresh targets and disable in native editing',t=>{
  const previous={customElements:globalThis.customElements};t.after(()=>Object.assign(globalThis,previous));let Actions;
  globalThis.customElements={get:()=>undefined,define:(_name,value)=>Actions=value};registerPopupActions({isAccessCover:()=>false});
  const source={type:'sections',path:'popup-test',title:'Lights',sections:[{cards:[{type:'tile',entity:'light.a'}]},{cards:[{type:'tile',entity:'light.b'}]}]},root={localName:'hui-root',lovelace:{config:{views:[source]},editMode:false}};
  const section={localName:'hui-section',index:0,viewIndex:0,parentNode:root},button={setAttribute(){}},scope={entities:[],buttons:[{button,on:true,text:{}}]},owner=Object.assign(Object.create(Actions.prototype),{parentNode:section,isConnected:true,shadowRoot:{},_config:{popup_view:'popup-test',scope:'section',entity_type:'light'},_scope:scope,_hass:{callService(){},states:{'light.a':{state:'off',attributes:{}},'light.b':{state:'off',attributes:{}}}}});
  owner._render();assert.deepEqual(scope.entities,['light.a']);assert.equal(button.disabled,false);
  section.index=1;owner._render();assert.deepEqual(scope.entities,['light.b']);
  source.sections[1].cards=[];owner._render();assert.deepEqual(scope.entities,[]);assert.equal(button.disabled,true);
  owner._config.scope='all';owner._render();assert.deepEqual(scope.entities,['light.a']);
  root.lovelace.editMode=true;owner._render();assert.equal(button.disabled,true);
  root.lovelace.editMode=false;const embedded={type:'sections',sections:[{cards:[{type:'tile',entity:'light.b',visibility:[{condition:'state',entity:'light.b',state:'on'}]}]},{cards:[]}]};
  section.parentNode={parentNode:root,_maraoEmbeddedPopup:{view:embedded,index:1}};section.index=0;section.viewIndex=1;owner._config={popup_scope:'embedded',scope:'all',entity_type:'light'};owner._render();assert.deepEqual(scope.entities,['light.b']);
  owner._config.scope='section';section.index=1;owner._render();assert.deepEqual(scope.entities,[]);assert.equal(button.disabled,true);
});

test('native editor choices accept HA dashboard documents and wrapped runtime contexts',()=>{
  const document={views:[{title:'Home',path:'home'},{title:'Popup',path:'popup-test',type:'sections'}]},before=structuredClone(document);
  for(const context of [document,{rawConfig:document},{config:document}]) {
    const editor=Object.assign(Object.create(MaraoCardEditor.prototype),{_lovelace:context});
    assert.deepEqual(editor._availablePages(),[{path:'home',name:'Home'},{path:'popup-test',name:'Popup'}]);
  }
  assert.deepEqual(document,before);
});

test('embedded popup contract preserves empty/opaque layouts, isolates routes and overrides retained sources',async()=>{
  const {popupContentError}=await import('../../custom_components/marao_dashboard/frontend/MaraoPopupContent.js');
  const {convertOrdinaryDocument}=await import('../../frontend_src/ordinary-model.js');
  const content={version:1,mode:'custom',template:'retired-template',future:[],layout:{type:'sections',title:'Custom',max_columns:2,sections:[{type:'grid',column_span:2,cards:[{type:'tile',entity:'light.custom',visibility:[{condition:'state',entity:'light.custom',state:'off'}],unknown:{keep:[]}}]}]}};
  const config={...opener,variables:{popup_hash:'#legacy'},popup_view:'missing',popup_content:content},before=structuredClone(config);
  const one=composeNativeCard(config,{instanceId:'one'}),two=composeNativeCard(config,{instanceId:'two'});
  assert.notEqual(one.popups[0].hash,two.popups[0].hash);assert.notEqual(one.popups[0].hash,'#legacy');assert.deepEqual(one.popups[0].popup_content,content);
  assert.deepEqual(one.card.variables.summary_entities,['light.custom']);assert.equal(one.card.tap_action.navigation_path,one.popups[0].hash);assert.deepEqual(config,before);
  const empty={...config,popup_content:{...content,layout:{type:'sections',sections:[]}}};assert.deepEqual(composeNativeCard(empty,{instanceId:'empty'}).popups[0].popup_content.layout.sections,[]);
  for(const popup_content of [null,{...content,version:2},{...content,mode:'other'},{...content,layout:{type:'sections',sections:[{cards:[{}]}]}}])assert.ok(popupContentError({...config,popup_content}));
  assert.throws(()=>composeNativeCard({...config,popup_content:{...content,version:2}},{instanceId:'invalid'}),/compatible/);
  const automatic={...opener,popup_content:{...content,mode:'automatic'}};assert.equal(composeNativeCard(automatic,{instanceId:'automatic'}).popups[0].popup_content,undefined);assert.deepEqual(automatic.popup_content.layout,content.layout);
  const document={views:[{type:'sections',path:'home',sections:[{cards:[config]}]}]};assert.deepEqual(convertOrdinaryDocument(JSON.stringify(document)).document,document);
});

test('all built-in templates seed independent explicit targets without actions or management markers',async()=>{
  const {POPUP_TEMPLATES,popupTemplateCandidate}=await import('../../frontend_src/popup-content.js');
  const before=structuredClone(opener);
  for(const entry of POPUP_TEMPLATES){
    const domain=entry.domains?.[0],entity_id=domain+'.safe';
    const metadata={entity_id,name:'Safe',device_class:entry.id==='energy'?'energy':entry.kind==='battery'?'battery':undefined,unit_of_measurement:entry.id==='energy'?'kWh':entry.kind==='battery'?'%':undefined,supported_features:15};
    const candidate=popupTemplateCandidate(opener,entry.id,domain?{entities:[entity_id],image_id:'a'.repeat(32)}:{},{entities:[metadata],hass:{states:{},callService(){assert.fail('template must be inert');},callWS(){assert.fail('no writes');}}});
    assert.equal(candidate.version,1,entry.id);assert.equal(candidate.mode,'custom');assert.equal(candidate.template,entry.id);
    assert.equal(JSON.stringify(candidate).includes('marao_popup_slot'),false);assert.equal(Object.hasOwn(candidate.layout,'marao_popup'),false);
    assert.equal(Object.hasOwn(candidate.layout,'path'),false);
    if(entry.kind&&entry.kind!=='battery')assert.equal(candidate.layout.sections[0].cards[0].popup_scope,'embedded');
    if(domain)assert.throws(()=>popupTemplateCandidate({type:'custom:marao-camera-card'},entry.id,{entities:['person.wrong']}),/compatible/);
  }
  assert.deepEqual(opener,before);
});

test('hash popup copies retain saved occurrence identity while parent settings are edited',async()=>{
  const {preparePopupCopy}=await import('../../frontend_src/popup-content.js');
  const original={type:'custom:marao-climate-card',entity_id:'climate.safe',name:'Original',variables:{mode_selector_hash:'#details'}};
  const document={views:[{path:'home',cards:[original,{type:'custom:marao-popup-card',hash:'#details',cards:[{type:'markdown',content:'Shared'}]}]}]};
  const before=structuredClone(document),draft={...original,name:'Edited'};
  const prepared=preparePopupCopy(draft,document,'home',{sourceOpener:original});
  assert.deepEqual(prepared.accept(document).layout.sections[0].cards,[{type:'markdown',content:'Shared',grid_options:{columns:12}}]);
  assert.deepEqual(document,before);
  const changed=structuredClone(document);changed.views[0].cards[0].name='Other client';
  assert.throws(()=>prepared.accept(changed),/missing|duplicated|changed/);
});

test('explicit linked copy preserves independent sections and rejects changed, ambiguous and newer sources',async()=>{
  const {preparePopupCopy,editPopupLayout}=await import('../../frontend_src/popup-content.js');
  const {popupOwners}=await import('../../custom_components/marao_dashboard/frontend/MaraoPopupManaged.js');
  const view={type:'sections',path:'saved',title:'Kept',max_columns:3,unknown:[],sections:[{type:'grid',column_span:2,unknown:false,cards:[{type:'custom:marao-summary-actions',popup_view:'saved',entity_type:'light',scope:'all',marao_popup_slot:'scope',grid_options:{columns:12}},{type:'vertical-stack',cards:[{type:'tile',entity:'light.original',name:'Rename',unknown:[]}],visibility:[],grid_options:{columns:6,rows:4}}]},{type:'grid',cards:[]}]};
  const document={views:[{path:'home',cards:[{...opener,popup_view:'saved'},{...opener,id:'other',popup_view:'saved'}]},view]},before=structuredClone(document);
  const prepared=preparePopupCopy(document.views[0].cards[0],document,'home'),content=prepared.accept(document);
  const expected=structuredClone(view);delete expected.path;delete expected.sections[0].cards[0].popup_view;delete expected.sections[0].cards[0].marao_popup_slot;expected.sections[0].cards[0].popup_scope='embedded';assert.deepEqual(content.layout,expected);assert.deepEqual(document,before);
  const edited=editPopupLayout(content,layout=>{layout.sections[0].cards.splice(1,1);});assert.equal(content.layout.sections[0].cards.length,2);assert.equal(edited.layout.sections[0].cards.length,1);
  const custom={...document.views[0].cards[0],popup_content:content};document.views[0].cards[0]=custom;assert.equal(popupOwners(document).filter(binding=>binding.path==='saved').length,1);
  document.views[1].title='Concurrent';assert.throws(()=>prepared.accept(document),/changed/);assert.deepEqual(content.layout,expected);
  const duplicate=structuredClone(before);duplicate.views.push(view);assert.throws(()=>preparePopupCopy(openerWithView(),duplicate,'home'),/ambiguous/);
  const newer=structuredClone(before);newer.views[1].marao_popup={version:2};assert.throws(()=>preparePopupCopy(openerWithView(),newer,'home'),/compatible/);
  function openerWithView(){return {...opener,popup_view:'saved'};}
});

test('embedded native host is read-only, occurrence-local and cleans up without synthetic saved views',t=>{
  const previous={document:globalThis.document,customElements:globalThis.customElements,ResizeObserver:globalThis.ResizeObserver};t.after(()=>Object.assign(globalThis,previous));
  const controllers=new Set();let disposed=0;
  globalThis.document={createElement:localName=>({localName,style:{},setAttribute(){},addEventListener(){},remove(){}})};
  globalThis.customElements={get:()=>true};globalThis.ResizeObserver=class{observe(){}disconnect(){disposed++;}};
  const dashboard={views:[{path:'home',cards:[]}]},before=structuredClone(dashboard),root={localName:'hui-root',lovelace:{config:dashboard},addController:c=>controllers.add(c),removeController:c=>controllers.delete(c)};
  const host=()=>({clientWidth:320,replaceChildren(...children){this.children=children;}}),a=host(),b=host();
  const owner=title=>({nativeOwner:root,_config:{popup_view:'missing',popup_content:{version:1,mode:'custom',layout:{type:'sections',title,sections:[]}}},_hass:{states:{}}});
  const one=mountPopupView(owner('One'),a),two=mountPopupView(owner('Two'),b);
  assert.equal(a.children[0].lovelace.config.views.at(-1).title,'One');assert.equal(b.children[0].lovelace.config.views.at(-1).title,'Two');assert.throws(()=>a.children[0].lovelace.saveConfig({}),/linked/);assert.deepEqual(dashboard,before);
  one.update();one.destroy();two.destroy();assert.equal(controllers.size,0);assert.equal(disposed,2);
});
