import test from 'node:test';
import assert from 'node:assert/strict';
import {popupCardChoices} from '../../frontend_src/popup-content-editor.js';
import {nativeCardStub} from '../../frontend_src/native-cards.js';
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

