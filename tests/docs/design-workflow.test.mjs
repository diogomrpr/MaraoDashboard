import test from 'node:test';
import assert from 'node:assert/strict';
import {context} from '../../docs/scripts/card-context.mjs';
import {cards} from '../../docs/examples/manifest.js';
import {previewWindow} from '../../docs/src/design/preview-window.js';
test('Card context resolves public aliases and identifies actual shared consumers',()=>{
 for(const card of cards)assert.equal(context(card.slug).card,card.id);
 const c=context('climate');assert.equal(context(c.type).card,c.card);
 assert.equal(context('plex-library').card,'plex-library');
 assert.equal(context('custom:marao-media-card').card,'md_media_card');
 const step=c.owners.find(o=>o.behavior==='numeric-stepper');assert.ok(step.consumers.includes('md_number_card'));assert.ok(step.consumers.includes('md_wallbox_current_card'));
 assert.throws(()=>context('nonexistent'),/Choose one card/);
 assert.ok(context('new-temperature','new-card').nearestFamilies.length>0);
 assert.ok(context('climate','config').fields.length>0);
});
test('Visible rows plus next three are selected, with preceding fallback',()=>{
 const rows=Array.from({length:10},(_,i)=>({top:i*200-400,bottom:i*200-200}));
 assert.deepEqual(previewWindow(rows,600),[2,3,4,5,6,7]);
 assert.deepEqual(previewWindow(rows.map(b=>({top:b.top-1000,bottom:b.bottom-1000})),600),[7,8,9,6,5,4]);
 assert.deepEqual(previewWindow([],600),[]);
});

test('Ownership references match catalog identities, source anchors and verification registry',async()=>{
 const {readFileSync,existsSync}=await import('node:fs');
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url);
 const {components,families}=require('../verification-map.js');
 const catalog=JSON.parse(readFileSync(new URL('../../custom_components/marao_dashboard/frontend/marao-catalog.json',import.meta.url)));
 const owners=JSON.parse(readFileSync(new URL('../../.agents/skills/marao-card-design/references/owners.json',import.meta.url)));
 const ids=new Set([...catalog.cards.map(c=>c.id),'camera-events','navbar']);
 for(const owner of owners){
  for(const id of owner.consumers)assert.ok(ids.has(id),`${owner.behavior}: ${id}`);
  const source=readFileSync(new URL('../../'+owner.file,import.meta.url),'utf8');
  for(const anchor of owner.anchors)assert.ok(source.includes(anchor),`${owner.file}: ${anchor}`);
  for(const component of owner.verificationComponents)assert.ok(components[component],component);
  for(const file of owner.focusedTests)assert.ok(existsSync(new URL('../../'+file,import.meta.url)),file);
 }
 assert.deepEqual(owners.find(o=>o.behavior==='sliders').consumers,families.slider);
 assert.deepEqual(owners.find(o=>o.behavior==='numeric-stepper').consumers,families.climate);
});

test('Gallery preserves ordered source scenarios and implemented public frame selection',async()=>{
 const {designCard}=await import('../../docs/src/design/gallery-data.js');
 const {readFileSync}=await import('node:fs');
 for(const card of cards)assert.deepEqual(designCard(card.id).scenarios.map(s=>s.id),card.scenarios.map(s=>s.id));
 const component=readFileSync(new URL('../../docs/src/design/DesignGallery.astro',import.meta.url),'utf8');
 assert.match(component,/DEV\?'design':'gallery'/);
 assert.doesNotMatch(component,/LOCAL DESIGN|design proposal/i);
});

test('Frame lifecycle keeps measured space, treats popup height as temporary and exposes errors',async()=>{
 const oldElement=globalThis.HTMLElement,oldRegistry=globalThis.customElements;let Gallery;
 try{
  globalThis.HTMLElement=class{};
  globalThis.customElements={get:()=>undefined,define:(name,value)=>{Gallery=value;}};
  await import('../../docs/src/design/gallery.js');
  const props={};const source={};
  const f={node:{contentWindow:source,hasAttribute:()=>true,dataset:{},style:{},parentElement:{style:{setProperty:(k,v)=>props[k]=v}}},status:{textContent:''},token:'test',sequence:1,reserve:160,ready:true};
  const gallery={frames:[f]};
  const send=data=>Gallery.prototype.message.call(gallery,{source,data:{channel:'marao-playground',token:'test',id:1,...data}});
  send({type:'resize',height:240,popup:false});send({type:'resize',height:750,popup:true});
  assert.equal(props['--frame-reserve'],'252px');assert.equal(f.node.style.height,'750px');
  send({type:'resize',height:240,popup:false});assert.equal(f.node.style.height,'240px');
  send({type:'error',message:'Bundle failed'});send({type:'rendered'});
  assert.equal(f.node.dataset.rendered,'false');assert.equal(f.status.textContent,'Bundle failed');
  f.ready=false;send({type:'error',token:undefined,id:undefined,message:'Initialization failed'});
  assert.equal(f.status.textContent,'Initialization failed');
 }finally{globalThis.HTMLElement=oldElement;globalThis.customElements=oldRegistry;}
});
