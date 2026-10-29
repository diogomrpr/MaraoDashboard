import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPressFeedback,pressTarget} from '../../custom_components/marao_dashboard/frontend/MaraoPressFeedback.js';

function environment(t,{pointer=true}={}) {
 t.mock.timers.enable({apis:['setTimeout','Date']});
 const host=new EventTarget(),doc=new EventTarget(),root=new EventTarget();
 host.performance={now:()=>Date.now()};doc.defaultView=host;doc.visibilityState='visible';root.ownerDocument=doc;root.getRootNode=()=>root;
 const element=(tag='button')=>{
  const attrs=new Map(),classes=new Set();return {isConnected:true,tag,disabled:false,
   setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),getAttribute:k=>attrs.get(k),hasAttribute:k=>attrs.has(k),
   classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},
   getRootNode:()=>root,matches:selector=>selector.split(',').includes(tag),getBoundingClientRect:()=>({left:0,right:100,top:0,bottom:100})};
 };
 const button=element(),content=element('span'),card=element('ha-card'),nested=element(),slider=element('input');
 const binding=bindPressFeedback(root,{pointer,resolve:event=>{
  const target=pressTarget(root,event);return target&&{target,surface:target===button?card:target,content:target===button?content:null};
 }});
 t.after(()=>binding.destroy());
 const send=(type,{target=button,path=[target,root],node=(type.startsWith('pointer')&&type!=='pointerdown'&&type!=='pointerleave'||type==='lostpointercapture')?doc:root,...extra}={})=>{
  const event=new Event(type,{cancelable:true});Object.defineProperty(event,'target',{value:target});
  Object.assign(event,{composedPath:()=>path,pointerId:1,isPrimary:true,button:0,clientX:20,clientY:20,detail:1,...extra});node.dispatchEvent(event);return event;
 };
 return{host,doc,root,button,content,card,nested,slider,binding,send};
}

test('quick taps acknowledge immediately while the existing action runs exactly once',t=>{
 const e=environment(t);let actions=0;e.root.addEventListener('click',()=>actions++);
 e.send('pointerdown');assert.ok(e.card.hasAttribute('data-marao-pressed'));assert.ok(e.content.hasAttribute('data-marao-press-move'));
 t.mock.timers.tick(5);e.send('pointerup');e.send('click');assert.equal(actions,1);assert.ok(e.card.hasAttribute('data-marao-pressed'));
 t.mock.timers.tick(1000);t.mock.timers.tick(1000);assert.equal(e.card.classList.contains('marao-press-surface'),false);assert.equal(actions,1);
});

test('old release cleanup cannot clear a new press and keyboard activation is acknowledged once',t=>{
 const e=environment(t);e.send('pointerdown');e.send('pointerup');t.mock.timers.tick(100);
 e.send('pointerdown');t.mock.timers.tick(1000);assert.ok(e.card.hasAttribute('data-marao-pressed'));
 e.binding.cancel();let actions=0;e.root.addEventListener('click',()=>actions++);e.send('click',{detail:0});
 assert.ok(e.card.hasAttribute('data-marao-pressed'));assert.equal(actions,1);
});

test('scroll, pointer departure/cancellation, hiding, navigation and disabling cancel without a completion or click',t=>{
 const e=environment(t);let actions=0;e.root.addEventListener('click',()=>actions++);
 const cancellations=[()=>e.host.dispatchEvent(new Event('scroll')),()=>e.send('pointermove',{clientY:40}),()=>e.send('pointerleave',{node:e.root}),
  ()=>e.send('pointercancel'),()=>e.send('lostpointercapture'),()=>e.host.dispatchEvent(new Event('blur')),()=>e.host.dispatchEvent(new Event('location-changed')),
  ()=>{e.doc.visibilityState='hidden';e.doc.dispatchEvent(new Event('visibilitychange'));},()=>{e.button.disabled=true;e.binding.sync();},()=>{e.button.isConnected=false;e.binding.sync();},
  ()=>{e.button.parentElement={inert:true};e.binding.sync();},()=>{e.button.parentElement={hidden:true};e.binding.sync();}];
 for(const cancel of cancellations){
  e.button.disabled=false;e.button.isConnected=true;e.button.parentElement=null;e.doc.visibilityState='visible';e.send('pointerdown');cancel();
  assert.equal(e.card.hasAttribute('data-marao-pressed'),false);const click=e.send('click');assert.equal(click.defaultPrevented,true);
  t.mock.timers.tick(1000);assert.equal(e.card.classList.contains('marao-press-surface'),false);
 }
 assert.equal(actions,0);
});

test('only the innermost enabled owned control responds; sliders and embedded controls are excluded',t=>{
 const e=environment(t);e.send('pointerdown',{target:e.nested,path:[e.nested,e.button,e.root]});
 assert.ok(e.nested.hasAttribute('data-marao-pressed'));assert.equal(e.card.hasAttribute('data-marao-pressed'),false);
 e.nested.disabled=true;e.binding.sync();e.send('pointerdown',{target:e.nested});assert.equal(e.nested.hasAttribute('data-marao-pressed'),false);
 e.send('pointerdown',{target:e.slider,path:[e.slider,e.button,e.root]});assert.equal(e.card.hasAttribute('data-marao-pressed'),false);
 e.nested.disabled=false;e.nested.getRootNode=()=>({});e.send('pointerdown',{target:e.nested,path:[e.nested,e.button,e.root]});assert.equal(e.nested.hasAttribute('data-marao-pressed'),false);
});

test('manual gesture owners use the same feedback without acquiring pointer handlers; disposal clears work',t=>{
 const e=environment(t,{pointer:false});e.send('pointerdown');assert.equal(e.card.hasAttribute('data-marao-pressed'),false);
 e.binding.start({target:e.button,surface:e.card,content:e.content});assert.ok(e.card.hasAttribute('data-marao-pressed'));
 e.binding.release();e.binding.destroy();t.mock.timers.tick(1000);assert.equal(e.card.hasAttribute('data-marao-pressed'),false);
 e.send('click',{detail:0});assert.equal(e.card.hasAttribute('data-marao-pressed'),false);
});
