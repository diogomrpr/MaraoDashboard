import test from 'node:test';
import assert from 'node:assert/strict';
import {floorPlanErrors,imageBounds,imagePoint,floorPosition,floorPageErrors} from '../../custom_components/marao_dashboard/frontend/MaraoFloorPlan.js';
import {validateSource} from '../../frontend_src/native-model.js';
import {compileDashboard} from '../../frontend_src/compile-dashboard.js';
import {normalizeConfig,serializeConfig,duplicateCard} from '../../frontend_src/editor-model.js';
import {uploadFloorImage,acceptFloorTrace,floorMove,openFloorPlanEditor} from '../../frontend_src/floor-plan-editor.js';
const options=()=>({image_id:'a'.repeat(32),lights:[{id:'strip',entity_id:'light.safe',x:30,y:40,extra:{keep:[]},strip:{width:6,points:[{x:10,y:10},{x:70,y:10},{x:70,y:60}]}}]});
const source=(full=false)=>({config_version:2,name:'Safe',landing_page:'home',navigation:['home'],pages:[{name:'Home',path:'home',sections:[{columns:1,entities:[{template:'md_floor_plan_card',id:'plan',name:'Plan',variables:{...options(),full_page:full}}]}]}]});
test('floor geometry accounts for letterboxing and inverse positioning',()=>{
 const bounds=imageBounds(320,400,800,400);assert.deepEqual(bounds,{x:0,y:120,width:320,height:160});
 const point={x:30,y:40};const screen=floorPosition(point,bounds);assert.deepEqual(imagePoint(screen.x,screen.y,bounds),point);assert.equal(imagePoint(10,20,bounds),null);
});
test('floor validation rejects invalid geometry, identifiers and nonlight bindings',()=>{
 assert.deepEqual(floorPlanErrors(options()),[]);
 for(const mutate of [o=>o.lights[0].x=Infinity,o=>o.lights[0].y=-1,o=>o.lights[0].entity_id='lock.safe',o=>o.lights.push({...o.lights[0]}),o=>o.lights[0].strip.points=[{x:0,y:0}],o=>o.lights[0].strip.width='6',o=>o.image_id='https://invalid/plan',o=>o.full_page='true']) {const o=options();mutate(o);assert.ok(floorPlanErrors(o).length);}
 assert.deepEqual(floorPlanErrors({...options(),lights:[]}),[]);
});
test('floor source round trips and duplicates independently without deleting shared image',()=>{
 const input=source(),before=structuredClone(input),model=normalizeConfig(input);
 assert.deepEqual(serializeConfig(model),before);const container=model.pages[0].sections[0];
 duplicateCard(model,container,0);
 const copied=container.entities[1];assert.notEqual(copied.id,container.entities[0].id);assert.deepEqual(copied.variables,container.entities[0].variables);
 copied.variables.lights[0].strip.points[0].x=50;assert.equal(container.entities[0].variables.lights[0].strip.points[0].x,10);
 assert.deepEqual(input,before);assert.doesNotThrow(()=>validateSource(input));
});
test('floor full page emits one panel stack with navigation and live Lights popup',()=>{
 const input=source(true),before=structuredClone(input),view=compileDashboard(input).views[0];assert.equal(view.type,'panel');assert.equal(view.cards.length,1);
 const children=view.cards[0].cards;assert.equal(children[0].type,'custom:marao-floor-plan-card');assert.equal(children[0].full_page,true);
 assert.equal(children[1].type,'custom:marao-popup-card');assert.equal(children[1].hash,children[0].lights_popup);assert.equal(children[1].cards[0].entity,'light.safe');
 assert.equal(children.at(-1).cards[0].type,'custom:marao-navbar-card');assert.deepEqual(input,before);
 input.pages[0].sections[0].entities.push({template:'md_title_card',name:'Keep'});assert.throws(()=>compileDashboard(input),/no other content/);assert.equal(input.pages[0].sections[0].entities.length,2);
 input.pages[0].sections[0].entities[0].variables.full_page=false;assert.equal(compileDashboard(input).views[0].type,undefined);
});
test('full page conflict checks include raw and unopened sections without mutation',()=>{
 const input=source(true),page=input.pages[0];page.sections.push({cards:[{type:'markdown',content:'Keep'}]});const before=structuredClone(page);
 assert.ok(floorPageErrors(page,page.sections).length);assert.deepEqual(page,before);
 page.sections[1].cards=[{type:'custom:marao-popup-card',hash:'#external'}];assert.deepEqual(floorPageErrors(page,page.sections),[]);
});
test('image upload uses only native storage and rejects unsafe/failed responses',async()=>{
 const calls=[];const hass={fetchWithAuth:async(url,init)=>{calls.push([url,init.method]);assert.ok(init.body instanceof FormData);return {ok:true,json:async()=>({id:'b'.repeat(32)})};}};
 assert.equal(await uploadFloorImage(hass,new File(['safe'],'room.png',{type:'image/png'})),'b'.repeat(32));assert.deepEqual(calls,[['/api/image/upload','POST']]);
 await assert.rejects(uploadFloorImage(hass,new File(['no'],'room.svg',{type:'image/svg+xml'})),/PNG/);
 await assert.rejects(uploadFloorImage({fetchWithAuth:async()=>({ok:false})},new File(['x'],'room.jpg',{type:'image/jpeg'})),/failed/);
});

globalThis.HTMLElement=class {attachShadow(){this.shadowRoot={querySelector:()=>null,querySelectorAll:()=>[]};}};
const {floorLightState,MaraoFloorPlanCard}=await import('../../custom_components/marao_dashboard/frontend/MaraoFloorPlanCard.js');
test('floor live state follows reported color and exact toggles without preview dispatch',async()=>{
 const calls=[];const hass={states:{'light.safe':{state:'on',attributes:{supported_color_modes:['rgb'],rgb_color:[0,50,200],brightness:128}}},callService:async(...args)=>calls.push(args)};
 const card=new MaraoFloorPlanCard();card._config=options();card._hass=hass;card._render=()=>{};card.isConnected=true;
 assert.equal(floorLightState(options().lights[0],hass).color,'rgb(0, 50, 200)');await card._toggle(0);assert.deepEqual(calls.map(c=>c.slice(0,3)),[['light','toggle',{entity_id:'light.safe'}]]);
 card.preview=true;await card._toggle(0);assert.equal(calls.length,1);card.preview=false;
 for(const state of ['off','unknown','unavailable']) {hass.states['light.safe'].state=state;assert.equal(floorLightState(options().lights[0],hass).on,false);if(state!=='off'){await card._toggle(0);assert.equal(calls.length,1);}}
 hass.connected=false;hass.states['light.safe'].state='on';assert.equal(floorLightState(options().lights[0],hass).ready,false);
});


test('incomplete traces and cancelled marker moves preserve the accepted draft geometry',()=>{
 const light=options().lights[0],before=structuredClone(light);assert.equal(acceptFloorTrace(light,[]),false);assert.deepEqual(light,before);
 const move=floorMove(light);light.x=80;light.y=90;move.cancel();assert.deepEqual(light,before);
 const points=[{x:5,y:10},{x:60,y:10},{x:60,y:80}];assert.equal(acceptFloorTrace(light,points),true);points[0].x=99;assert.equal(light.strip.points[0].x,5);assert.equal(light.entity_id,before.entity_id);
});
test('obsolete image upload cannot supply a replacement to a current dialog',async()=>{
 let resolve,current=true;const hass={fetchWithAuth:()=>new Promise(done=>{resolve=done;})};
 const pending=uploadFloorImage(hass,new File(['safe'],'room.png',{type:'image/png'}),()=>current);current=false;
 resolve({ok:true,json:async()=>({id:'a'.repeat(32)})});assert.equal(await pending,null);
});
test('safe examples are additive, idempotent and retain one dashboard/gallery root',async()=>{
 const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);const {addExamples}=require('../../ha-test/floor-plan-examples.js');
 const original={...source(),pages:[...source().pages,{path:'card-test',name:'Cases',sections:[]},{path:'media',name:'Media',sections:[]}],future:{empty:[]}};
 const before=structuredClone(original);const media={template:'md_media_card',entity_id:'media_player.marao_dashboard_test_apple_tv',apple_tv:false};
 const next=addExamples(original,'a'.repeat(32),media);assert.deepEqual(original,before);assert.deepEqual(addExamples(next,'a'.repeat(32),media),next);assert.equal(next.pages.filter(page=>page.path==='card-test').length,1);assert.deepEqual(next.future,{empty:[]});assert.doesNotThrow(()=>compileDashboard(next));
});

// Exercise the real editor callbacks with only HA forms/dialogs and DOM geometry stubbed.
function editorHarness(context) {
 class Element extends EventTarget {
  constructor(tag='div'){super();this.tag=tag;this.children=[];this.nodes=new Map();this.style={};this.dataset={};this.isConnected=true;this.open=true;if(tag==='img'){this.naturalWidth=800;this.naturalHeight=800;}}
  set innerHTML(html){
   this.nodes.clear();
   for(const match of html.matchAll(/<([a-z][\w-]*)([^>]*)>/g)){
    const node=new Element(match[1]);if(!this.nodes.has(match[1]))this.nodes.set(match[1],node);
    for(const attr of match[2].matchAll(/\b(data-[\w-]+)(?:="[^"]*")?/g))this.nodes.set(`[${attr[1]}]`,node);
    const classes=match[2].match(/class="([^"]+)"/);for(const name of classes?.[1].split(' ')||[])this.nodes.set('.'+name,node);
   }
  }
  querySelector(selector){return this.nodes.get(selector)||this.children.find(child=>selector===`[data-light-index="${child.dataset?.lightIndex}"]`)||this.children.map(child=>child.querySelector?.(selector)).find(Boolean)||null;}
  append(...nodes){this.children.push(...nodes);}
  prepend(...nodes){this.children.unshift(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(key,value){this[key]=value;}
  removeAttribute(key){delete this[key];}
  getBoundingClientRect(){return{left:0,top:0,width:320,height:320};}
  setPointerCapture(){}
  releasePointerCapture(){}
  closest(selector){return selector==='button'&&this.tag==='button'?this:null;}
 }
 const saved=new Map(['document','ResizeObserver','MutationObserver'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 context.after(()=>{for(const [key,value]of saved)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];});
 globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_ns,tag)=>new Element(tag),createTextNode:text=>({textContent:text})};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.MutationObserver=class{observe(){}disconnect(){}};
 const container={entities:[source().pages[0].sections[0].entities[0]]},before=structuredClone(container.entities[0]),dialogs=[],forms=new Map();
 const panel={isConnected:true,_model:{},_editableContainer:()=>container,_hass:{language:'en',callService:()=>assert.fail('Editing must never switch lights')},_entities:[],shadowRoot:{},
  _dialog(){const d=new Element('ha-dialog'),host=new Element();d.nodes.set('.dialog-content',host);d.append(host);dialogs.push(d);return d;},
  _closeDialog(dialog){dialog.open=false;dialog.dispatchEvent(new Event('closed'));dialog.isConnected=false;},
  _schema:(name,label,selector)=>({name,label,selector}),_mountForm:(host,data,schema,change)=>forms.set(host,{data,schema,change}),
  _moveHaptic(){},_setDirty(){this.dirty=true;},_refreshCards(){},_focusWithoutScroll(target){this.focused=target;}
 };
 const parent=openFloorPlanEditor(panel,0,0,'page'),q=selector=>parent.querySelector(selector);
 const send=(target,type,x=96,y=128)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{button:0,pointerId:1,clientX:x,clientY:y});target.dispatchEvent(event);};
 const tap=button=>button.onclick({stopPropagation(){},detail:0});
 const form=child=>forms.get(child.querySelector('[data-form]'));
 return{panel,parent,q,dialogs,container,before,send,tap,form,forms};
}

test('light-square settings are transactional, omit coordinates and preserve unknown fields',context=>{
 for(const accept of [false,true]){
  const h=editorHarness(context);h.tap(h.q('[data-markers]').children[0]);const child=h.dialogs[1],form=h.form(child);
  assert.equal(h.parent.inert,true);assert.deepEqual(form.schema.map(field=>field.name),['entity_id','name','icon','width']);
  form.change({...form.data,entity_id:'light.other',name:'New name',width:12});
  assert.deepEqual(h.container.entities[0],h.before,'Settings must not change the source before card Update');
  child.querySelector(accept?'[data-save]':'[data-close]').onclick();
  assert.equal(h.parent.inert,false);assert.ok(h.panel.focused);h.q('[data-save]').onclick();
  const edited=h.container.entities[0].variables.lights[0];
  assert.equal(edited.entity_id,accept?'light.other':'light.safe');assert.equal(edited.strip.width,accept?12:6);
  assert.deepEqual(edited.extra,{keep:[]});assert.deepEqual(edited.strip.points,h.before.variables.lights[0].strip.points);
  assert.equal(edited.x,30);assert.equal(edited.y,40);
  for(const {schema}of h.forms.values())assert.ok(!schema.some(field=>['x','y'].includes(field.name)));
 }
});

test('placement adds a light only after valid modal acceptance and card Update',context=>{
 const h=editorHarness(context);h.q('[data-add]').onclick();h.send(h.q('.floor-canvas'),'click',160,80);
 let child=h.dialogs[1];child.querySelector('[data-close]').onclick();
 h.send(h.q('.floor-canvas'),'click',160,80);child=h.dialogs[2];const form=h.form(child);
 child.querySelector('[data-save]').onclick();assert.equal(child.open,true);assert.match(child.querySelector('[data-error]').textContent,/Choose a light/);
 form.change({...form.data,entity_id:'light.new'});child.querySelector('[data-save]').onclick();
 assert.equal(h.container.entities[0].variables.lights.length,1);
 h.q('[data-save]').onclick();const lights=h.container.entities[0].variables.lights;
 assert.equal(lights.length,2);assert.equal(lights[1].entity_id,'light.new');assert.equal(lights[1].x,50);assert.equal(lights[1].y,25);
});

test('completed and cancelled drags do not open light settings; parent close invalidates child writes',context=>{
 for(const end of ['pointerup','pointercancel','lostpointercapture']){
  const h=editorHarness(context),marker=h.q('[data-markers]').children[0];
  h.send(h.q('.floor-canvas'),'pointerdown');h.send(marker,'pointerdown');h.send(marker,'pointermove',192,192);h.send(marker,end,192,192);
  marker.onclick({stopPropagation(){},detail:1});assert.equal(h.dialogs.length,1);
  h.q('[data-save]').onclick();const light=h.container.entities[0].variables.lights[0];assert.equal(light.x,end==='pointerup'?60:30);assert.equal(light.y,end==='pointerup'?60:40);
 }
 const h=editorHarness(context);h.tap(h.q('[data-markers]').children[0]);const child=h.dialogs[1],form=h.form(child);
 form.change({...form.data,entity_id:'light.other'});h.panel._closeDialog(h.parent);assert.equal(child.open,false);
 child.querySelector('[data-save]').onclick();assert.deepEqual(h.container.entities[0],h.before);
});

test('a tap tolerates small pointer movement; strip points move and remove without coordinate forms',context=>{
 const h=editorHarness(context);let marker=h.q('[data-markers]').children[0];
 h.send(h.q('.floor-canvas'),'pointerdown');h.send(marker,'pointerdown');h.send(marker,'pointermove',98,130);h.send(marker,'pointerup',98,130);
 assert.equal(h.dialogs.length,2);h.dialogs[1].querySelector('[data-close]').onclick();
 const points=h.q('[data-markers]').children,firstPoint=points[1];
 h.send(h.q('.floor-canvas'),'pointerdown',32,32);h.send(firstPoint,'pointerdown',32,32);h.send(firstPoint,'pointermove',48,48);h.send(firstPoint,'pointerup',48,48);
 assert.equal(h.dialogs.length,2,'Moving a point must not open entity settings');
 h.tap(h.q('[data-markers]').children[1]);h.q('[data-strip-tools]').children.find(button=>button.textContent==='Remove point').onclick();
 h.q('[data-save]').onclick();const light=h.container.entities[0].variables.lights[0];
 assert.deepEqual(light.strip.points,[{x:70,y:10},{x:70,y:60}]);assert.equal(light.x,30);assert.equal(light.y,40);
});
