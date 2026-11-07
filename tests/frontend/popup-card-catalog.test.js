import test from 'node:test';
import assert from 'node:assert/strict';
import {popupCardChoices} from '../../frontend_src/popup-content-editor.js';
import {nativeCardStub,nativeEntitySuggestion} from '../../frontend_src/native-cards.js';
import {composeNativeCard,validateNativeCardConfig} from '../../frontend_src/card-composition.js';
import {popupTemplatesFor,matchingPopupTemplate,popupTemplateCandidate,preparePopupCopy} from '../../frontend_src/popup-content.js';

test('popup templates are filtered by native and generic family and Entity Group kind',()=>{
  const families={'scene-collection':'scenes',climate:'climate',media:'media',camera:'camera','energy-period':'energy',graph:'graph',security:'security',access:'access','floor-plan':'floor-plan'};
  for(const [family,expected]of Object.entries(families))assert.deepEqual(popupTemplatesFor({type:'custom:marao-'+family+'-card'}).map(entry=>entry.id),[expected,'empty']);
  for(const kind of ['light','cover','battery','climate']){
    const parent={type:'custom:marao-entity-group-card',entity_type:kind,entities:[]};
    assert.deepEqual(popupTemplatesFor(parent).map(entry=>entry.id),['group-'+kind,'empty']);
    assert.deepEqual(popupTemplatesFor({...parent,type:'custom:marao-card',template:'md_entity_group_card'}).map(entry=>entry.id),['group-'+kind,'empty']);
  }
});

test('template names reflect exact content rather than origin, property order or editor activity',()=>{
  const model={version:1,mode:'custom',template:'climate',layout:{type:'sections',max_columns:1,sections:[{type:'grid',cards:[{type:'tile',entity:'climate.safe',grid_options:{columns:6},opaque:false},{type:'markdown',content:'Keep'}]}]}};
  const candidates=new Map([['climate',model]]),same=structuredClone(model);same.template='unrelated-old-origin';
  same.layout={sections:same.layout.sections,max_columns:1,type:'sections'};assert.equal(matchingPopupTemplate(same,candidates),'climate');
  for(const change of [content=>content.layout.sections[0].cards.reverse(),content=>content.layout.sections[0].cards[0].grid_options.columns=12,content=>content.layout.sections[0].cards[0].opaque=true,content=>content.presentation={height:'80vh'}]){
    const edited=structuredClone(model);change(edited);assert.equal(matchingPopupTemplate(edited,candidates),'custom');
  }
});

test('untouched automatic popups match their family template without introducing explicit defaults',()=>{
  const owners=[
    {type:'entity-group',name:'Covers',entity_type:'cover',entities:['cover.safe']},
    {type:'scene-collection',entities:['scene.safe']},
    ...[['climate','climate'],['media','media_player'],['camera','camera'],['energy-period','sensor'],['security','alarm_control_panel'],['access','lock']].map(([type,domain])=>({type,entity_id:domain+'.safe'})),
    {type:'graph',entity_id:'sensor.safe',variables:{history_popup:true}},
    {type:'floor-plan',variables:{image_id:'a'.repeat(32),lights:[{id:'lamp',entity_id:'light.safe',x:50,y:50}]}}
  ],context={entities:[],hass:{language:'en',states:{}},language:'en'};
  for(const owner of owners){
    const parent={...owner,type:'custom:marao-'+owner.type+'-card'},templates=popupTemplatesFor(parent);
    const candidates=new Map(templates.map(entry=>[entry.id,popupTemplateCandidate(parent,entry.id,{},context)]));
    const content=preparePopupCopy(parent,{views:[]},'home',context).content;
    assert.equal(matchingPopupTemplate(content,candidates),templates[0].id,owner.type);
  }
});

test('native picker Marao suggestions reference public families without replacing the full catalog',()=>{
  const previous=globalThis.window;
  globalThis.window={customCards:[{type:'external-unrelated-card',name:'Unrelated card'}]};
  try {
    const choices=popupCardChoices(),ids=choices.map(choice=>choice.value);
    for(const id of ['md_light_card','md_climate_card','md_entity_group_card','md_sensor_card','md_media_card'])assert.ok(ids.includes(id),id);
    assert.ok(!ids.includes('external-unrelated-card'));
    assert.ok(!ids.includes('md_navbar_card'));
    assert.equal(new Set(ids).size,ids.length);
    const config=nativeCardStub('md_climate_card',{states:{'climate.safe':{state:'heat',attributes:{}}}},['climate.safe']);
    assert.equal(config.type,'custom:marao-climate-card');
    assert.equal(config.entity_id,'climate.safe');
  }finally{globalThis.window=previous;}
});

import {renderPopupContent} from '../../frontend_src/popup-content-editor.js';
test('popup settings start collapsed and do not construct a native canvas until expanded',()=>{
  const before=globalThis.document;
  const node=()=>Object.assign(new EventTarget(),{children:[],className:'',append(...children){for(const child of children){child.parentNode=this;this.children.push(child);}},replaceChildren(...children){this.children=[];this.append(...children);}});
  globalThis.document={createElement:node};
  try {
    const host=node(),panel={_l:value=>value};renderPopupContent(panel,host);
    assert.equal(host.children[0].open,false);
    assert.equal(host.children[0].children[0].textContent,'Popup settings');
    assert.equal(panel._popupInline,null);
    renderPopupContent(panel,host);assert.equal(host.children.length,1);
  }finally{globalThis.document=before;}
});

import {loadLovelaceEditor} from '../../frontend_src/lovelace-loader.js';
test('registered native child editors load without fetching dashboard or broad picker resources',async()=>{
  const previous=globalThis.customElements;
  globalThis.customElements={get:tag=>tag==='hui-card-element-editor'};
  try {
    const result=await loadLovelaceEditor({callWS(){assert.fail('Registered editor must not query dashboard');}},'/marao-dashboard/overview',{picker:false});
    assert.deepEqual(result.resourceErrors,[]);
  }finally{globalThis.customElements=previous;}
});



test('Access templates retain the opening slider and safe close button for explicit popup mode',()=>{
  for(const [entity,service,label] of [['lock.safe','lock','Unlock slider and lock button'],['cover.safe','cover','Opening slider and close button']]){
    const parent={type:'custom:marao-access-card',entity_id:entity,variables:{access_mode:'popup',action_color:'blue'},opaque:{keep:true}};
    const before=structuredClone(parent),context={entities:[{entity_id:entity,device_class:'door',supported_features:3}]};
    assert.equal(popupTemplatesFor(parent)[0].label,label);
    const candidate=popupTemplateCandidate(parent,'access',{},context),children=candidate.layout.sections[0].cards;
    assert.deepEqual(children.map(card=>card.type),['custom:marao-access-slide-action-card','custom:marao-access-action-card']);
    assert.deepEqual(children.map(card=>card.variables.action_service),service==='lock'?['lock.unlock','lock.lock']:['cover.open_cover','cover.close_cover']);
    assert.ok(children.every(card=>card.variables.access_mode===undefined));
    for(const child of children){validateNativeCardConfig(child,context.entities);const result=composeNativeCard(child,{...context,instanceId:'child'});assert.equal(result.card.template,child.template);assert.deepEqual(result.popups,[]);}
    assert.deepEqual(parent,before);
    const openOnly=popupTemplateCandidate({...parent,entity_id:'cover.opener'},'access',{}, {entities:[{entity_id:'cover.opener',device_class:'door',supported_features:1}]}).layout.sections[0].cards;
    assert.deepEqual(openOnly.map(card=>card.type),['custom:marao-access-slide-action-card']);
  }
});

test('the native popup picker exposes independently configurable and validated access controls',()=>{
  const choices=popupCardChoices(),hass={states:{'lock.safe':{entity_id:'lock.safe',state:'locked',attributes:{}}}};
  for(const [role,label]of [['md_access_slide_action_card','Access opener'],['md_access_action_card','Access close / lock']]){
    assert.equal(choices.find(choice=>choice.value===role)?.label,label);
    const card=nativeCardStub(role,hass,['lock.safe']);validateNativeCardConfig(card);
    const result=composeNativeCard(card,{instanceId:'picker'});assert.equal(result.card.template,role);assert.deepEqual(result.popups,[]);
    if(role==='md_access_action_card'){
      assert.equal(result.card.variables.action_service,'lock.lock');
      assert.throws(()=>validateNativeCardConfig({...card,variables:{...card.variables,action_service:'lock.unlock'}}),/access opener slide/);
    }else assert.throws(()=>validateNativeCardConfig({...card,tap_action:{action:'call-service',service:'lock.unlock'}}),/strict slide/);
  }
});


test('access picker defaults and suggestions skip covers lacking the selected capability',()=>{
  const hass={states:{'cover.open_only':{state:'closed',attributes:{device_class:'door',supported_features:1}},'cover.close_only':{state:'open',attributes:{device_class:'door',supported_features:2}},'lock.safe':{state:'locked',attributes:{}}}};
  assert.equal(nativeCardStub('md_access_action_card',hass,['cover.open_only','lock.safe']).entity_id,'lock.safe');
  assert.equal(nativeCardStub('md_access_slide_action_card',hass,['cover.close_only','lock.safe']).entity_id,'lock.safe');
  assert.equal(nativeCardStub('md_access_slide_action_card',hass,['cover.open_only']).entity_id,'cover.open_only');
  assert.equal(nativeCardStub('md_access_action_card',hass,['cover.close_only']).entity_id,'cover.close_only');
  assert.equal(nativeEntitySuggestion('md_access_action_card',hass,'cover.open_only'),null);
  assert.equal(nativeEntitySuggestion('md_access_slide_action_card',hass,'cover.close_only'),null);
});

test('legacy standalone popups copy their current cards and grouped controls into an independent native canvas',()=>{
  const popup={type:'custom:marao-popup-card',hash:'#details',name:'Details',cards:[{type:'custom:marao-card',template:'md_light_card',entity:'light.safe',variables:{enable_slider:false},future:[]},{type:'markdown',content:'Kept'}],future:false};
  const dashboard={views:[{path:'home',cards:[popup]}]},before=structuredClone(dashboard);
  const prepared=preparePopupCopy(popup,dashboard,'home');
  assert.deepEqual(prepared.content.layout,{type:'sections',title:'Details',max_columns:1,sections:[{type:'grid',cards:[{...popup.cards[0],type:'custom:marao-light-card',grid_options:{columns:12}},{...popup.cards[1],grid_options:{columns:12}}]}]});
  assert.deepEqual(prepared.accept(dashboard),prepared.content);assert.deepEqual(dashboard,before);
  const changed=structuredClone(dashboard);changed.views[0].cards[0].cards=[];assert.throws(()=>prepared.accept(changed),/missing or duplicated|source changed/);
  const group={...popup,entity_group:{id:'lights',entity_type:'light',popup_filter:'all',members:[{entity_id:'light.safe',future:[]}],entities:['light.safe']}};
  const copied=preparePopupCopy(group,{views:[]},'home').content;
  const cards=copied.layout.sections.flatMap(section=>section.cards);
  assert.ok(cards.some(card=>card.type==='custom:marao-summary-actions'&&card.popup_scope==='embedded'));
  assert.ok(cards.some(card=>card.entity_id==='light.safe'&&card.future.length===0));
});
