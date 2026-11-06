import {previewWindow} from './preview-window.js';
class DesignGallery extends HTMLElement {
 connectedCallback(){
  this.abort?.abort();this.abort=new AbortController();const signal=this.abort.signal;
  this.scenarios=JSON.parse(this.querySelector('[data-design-scenarios]').textContent);
  this.language=this.querySelector('[data-design-language]');this.width=this.querySelector('[data-design-width]');
  this.frames=[...this.querySelectorAll('[data-scenario-id]')].map((section,i)=>({section,node:section.querySelector('iframe'),status:section.querySelector('[data-frame-status]'),scenario:this.scenarios[i],token:crypto.randomUUID(),sequence:0,ready:false,reserve:160}));
  const schedule=()=>{cancelAnimationFrame(this.tick);this.tick=requestAnimationFrame(()=>this.reconcile());};
  window.addEventListener('message',event=>this.message(event),{signal});
  this.geometry=new ResizeObserver(schedule);this.geometry.observe(this);
  for(const f of this.frames){f.node.addEventListener('load',()=>{f.ready=false;if(f.node.hasAttribute('src'))f.node.contentWindow.postMessage({channel:'marao-playground',type:'hello'},'*');},{signal});}
  this.language.addEventListener('change',()=>{const locale=this.language.value;this.lang=locale;this.language.setAttribute('aria-label',locale==='pt'?'Idioma do cartão':'Card language');this.width.setAttribute('aria-label',locale==='pt'?'Largura do cartão':'Card width');this.querySelectorAll('[data-en]').forEach(n=>n.textContent=n.dataset[locale]);for(const f of this.frames)this.send(f);},{signal});
  this.width.addEventListener('change',()=>this.style.setProperty('--design-width',this.width.value+'px'),{signal});
  this.theme=new MutationObserver(()=>{for(const f of this.frames)this.send(f);});this.theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  window.addEventListener('scroll',schedule,{signal,passive:true});
  window.addEventListener('resize',schedule,{signal,passive:true});schedule();
 }
 reconcile(){
  const selected=previewWindow(this.frames.map(f=>f.section.getBoundingClientRect()),innerHeight);
  const active=new Set(selected.map(i=>this.frames[i]));
  for(const f of this.frames){
   if(active.has(f)&&!f.node.hasAttribute('src')){f.status.textContent=this.language.value==='pt'?'A carregar…':'Loading…';f.node.src=this.dataset.frameUrl;}
   if(!active.has(f)&&f.node.hasAttribute('src')){f.node.removeAttribute('src');f.ready=false;delete f.node.dataset.rendered;f.status.textContent=this.language.value==='pt'?'Desloque para carregar este exemplo.':'Scroll to load this example.';}
  }
 }
 send(f){
  if(!f.ready)return;f.sequence++;f.node.dataset.rendered='false';delete f.node.dataset.error;f.status.textContent=this.language.value==='pt'?'A carregar…':'Loading…';
  f.node.contentWindow.postMessage({channel:'marao-playground',type:'render',token:f.token,id:f.sequence,config:f.scenario.config,states:f.scenario.states,scenario:f.scenario,dashboard:f.scenario.dashboard,theme:document.documentElement.dataset.theme==='light'?'light':'dark',language:this.language.value},'*');
 }
 message(event){
  const f=this.frames.find(f=>f.node.contentWindow===event.source);if(!f||!f.node.hasAttribute('src')||event.data?.channel!=='marao-playground')return;
  const d=event.data;
  if(d.type==='ready'){if(!f.ready){f.ready=true;this.send(f);}return;}
  if(d.type==='error'&&!f.ready&&d.token==null){f.status.textContent=d.message;f.node.dataset.error='true';f.node.dataset.rendered='false';return;}
  if(d.token!==f.token||d.id!==f.sequence)return;
  if(d.type==='resize'){
   const height=Math.max(100,Math.min(900,d.height));
   // Reserve measured card space across unloads; an opened popup is temporary.
   if(!d.popup){f.reserve=Math.max(f.reserve,height);f.node.parentElement.style.setProperty('--frame-reserve',(f.reserve+12)+'px');}
   f.node.style.height=height+'px';
  }
  if(d.type==='rendered'&&!f.node.dataset.error){f.node.dataset.rendered='true';f.status.textContent='';}
  if(d.type==='error'){f.status.textContent=d.message;f.node.dataset.error='true';f.node.dataset.rendered='false';}
 }
 disconnectedCallback(){this.abort?.abort();this.geometry?.disconnect();this.theme?.disconnect();cancelAnimationFrame(this.tick);for(const f of this.frames||[])f.node.removeAttribute('src');}
}
if(!customElements.get('design-gallery'))customElements.define('design-gallery',DesignGallery);

if(import.meta.hot)import.meta.hot.accept(()=>location.reload());
