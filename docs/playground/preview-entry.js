import {createSimulation} from './simulation.js';
import {browserEnvironment,safePreviewData,cameraImage} from './preview-assets.js';
import icons from 'virtual:preview-icons';
import catalog from '../../custom_components/marao_dashboard/frontend/marao-catalog.json';
import {NATIVE_CARD_TYPES} from '../../frontend_src/card-composition.js';

const channel='marao-playground';let request,simulation,card,runtimeReady,renderRevision=0;
const send=(type,detail={})=>parent.postMessage({channel,type,token:request?.token,id:request?.id,...detail},'*');
const status=document.querySelector('#status');
function showError(message){status.textContent=message;send('error',{message});}
globalThis.addEventListener('error',event=>showError(event.message||'Preview resource could not load.'));
globalThis.addEventListener('unhandledrejection',event=>showError(event.reason?.message||String(event.reason)));
globalThis.__maraoPreview=browserEnvironment(showError);
globalThis.MaraoFrontendPackage={...globalThis.__maraoPreview.installedPackage,package_version:__MARAO_VERSION__,baseURL:'https://marao.example/',rootURL:'https://marao.example/'};

class Icon extends HTMLElement {
  static get observedAttributes(){return ['icon'];}
  constructor(){super();this.attachShadow({mode:'open'});}
  set icon(value){this.setAttribute('icon',value||'');}get icon(){return this.getAttribute('icon')||'';}
  connectedCallback(){this.render();}attributeChangedCallback(){this.render();}
  async render(){
    const icon=this.icon,parts=icon.split(':'),custom=window.customIconsets?.[parts[0]];let path=icons[icon]||icons['mdi:help-circle-outline'];
    if(custom){try{path=(await custom(parts[1])).path;}catch{}}
    if(this.icon!==icon)return;
    this.shadowRoot.innerHTML='<style>:host{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);flex-shrink:0;color:inherit}svg{width:100%;height:100%;fill:currentColor}</style><svg viewBox="0 0 24 24" aria-hidden="true"><path></path></svg>';
    this.shadowRoot.querySelector('path').setAttribute('d',path||'');
  }
}
class StateIcon extends Icon {set stateObj(value){this._state=value;this.icon=value?.attributes?.icon||({'light':'mdi:lightbulb','switch':'mdi:power-socket-eu','person':'mdi:account','sensor':'mdi:eye','climate':'mdi:thermostat','cover':'mdi:blinds','fan':'mdi:fan'})[value?.entity_id?.split('.')[0]]||'mdi:circle-outline';}set hass(value){this._hass=value;} }
class SvgIcon extends HTMLElement {constructor(){super();this.attachShadow({mode:'open'});}set path(path){this.shadowRoot.innerHTML='<style>:host{display:inline-flex;width:24px;height:24px}svg{width:100%;height:100%;fill:currentColor}</style><svg viewBox="0 0 24 24"><path></path></svg>';this.shadowRoot.querySelector('path').setAttribute('d',path||'');}}
class Form extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});}
  set schema(value){this._schema=value;this.render();}set data(value){this._data=value;this.render();}get data(){return this._data;}set hass(value){this._hass=value;this.render();}
  connectedCallback(){this.render();}
  render(){if(!this._schema||!this._hass)return;this.shadowRoot.replaceChildren();const style=document.createElement('style');style.textContent='label{display:grid;gap:8px;margin:12px 0;font:inherit}select,input{box-sizing:border-box;min-height:48px;max-width:100%;width:100%;font:inherit;color:inherit;padding:8px;border:1px solid var(--divider-color);border-radius:12px;background:var(--ha-card-background)}';this.shadowRoot.append(style);for(const field of this._schema){const label=document.createElement('label');label.textContent=this.computeLabel?.(field)||field.name;const selector=field.selector||{},typed=selector.text||selector.time||selector.boolean;
const select=document.createElement(typed?'input':'select');
if(typed){select.type=selector.boolean?'checkbox':selector.time?'time':'text';if(selector.boolean)select.checked=Boolean(this._data?.[field.name]);else select.value=this._data?.[field.name]||'';}
else {const options=selector.select?.options;
if(options){select.multiple=Boolean(selector.select.multiple);for(const item of options){const option=document.createElement('option');option.value=typeof item==='string'?item:item.value;option.textContent=typeof item==='string'?item:item.label;option.selected=Array.isArray(this._data?.[field.name])?this._data[field.name].includes(option.value):this._data?.[field.name]===option.value;select.append(option);}}
else {const empty=document.createElement('option');empty.value='';empty.textContent='Automatic';select.append(empty);const domains=selector.entity?.domain;for(const state of Object.values(this._hass.states||{})){if(domains&&!domains.includes(state.entity_id.split('.')[0]))continue;const option=document.createElement('option');option.value=state.entity_id;option.textContent=state.attributes.friendly_name||state.entity_id;select.append(option);}select.value=this._data?.[field.name]||'';}}
select.onchange=()=>{const value=selector.boolean?select.checked:select.multiple?[...select.selectedOptions].map(option=>option.value):select.value;this._data={...this._data,[field.name]:value};this.dispatchEvent(new CustomEvent('value-changed',{detail:{value:this._data},bubbles:true,composed:true}));};if(typed&&!selector.boolean)select.oninput=select.onchange;label.append(select);this.shadowRoot.append(label);}}
}
class Root extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<style>:host{display:block;min-height:420px}#view{padding:16px 12px 100px;min-width:0}</style><div id="view"></div>';this.controllers=new Set();this.panel={url_path:'marao-dashboard'};}
  addController(controller){this.controllers.add(controller);controller.hostConnected?.();}removeController(controller){this.controllers.delete(controller);}
  set hass(value){this._hass=value;for(const controller of this.controllers)controller.hostUpdated?.();}get hass(){return this._hass;}
}
class App extends HTMLElement {constructor(){super();this.attachShadow({mode:'open'});}}
for(const [name,type] of [['ha-icon',Icon],['ha-state-icon',StateIcon],['ha-svg-icon',SvgIcon],['ha-form',Form],['hui-root',Root],['home-assistant',App]])customElements.define(name,type);
const app=document.createElement('home-assistant'),root=document.createElement('hui-root');app.setAttribute('role','main');app.shadowRoot.append(root);document.querySelector('#preview').replaceWith(app);
const holder=root.shadowRoot.querySelector('#view');
if(__MARAO_DESIGN_PREVIEW__){
  document.body.style.minHeight='0';app.style.minHeight='0';root.style.minHeight='0';
  const style=document.createElement('style');style.textContent='#view{padding:12px;min-height:0}';root.shadowRoot.append(style);
}


function createCardElement(config){
  if(config.type?.startsWith('custom:marao-')&&customElements.get(config.type.slice(7))){const element=document.createElement(config.type.slice(7));element.setConfig(config);return element;}
  const element=document.createElement('div');element.style.cssText='padding:16px;border-radius:16px;background:var(--ha-card-background);overflow-wrap:anywhere';
  if(['vertical-stack','horizontal-stack','grid'].includes(config.type)){element.style.display='grid';element.style.gap='12px';if(config.type!=='vertical-stack')element.style.gridTemplateColumns=`repeat(${config.columns||config.cards?.length||1},minmax(0,1fr))`;const children=(config.cards||[]).map(createCardElement);element.append(...children);Object.defineProperty(element,'hass',{set:value=>children.forEach(child=>child.hass=value)});}
  else if(config.type==='picture'){const image=document.createElement('img');image.src=cameraImage;image.alt='Fictional image';image.style.width='100%';element.append(image);}
  else element.textContent=`${config.type||'This card'} is a Home Assistant surface. Its native editing and layout are available in Home Assistant.`;
  return element;
}
globalThis.loadCardHelpers=async()=>({createCardElement});
customElements.define('hui-card',class extends HTMLElement{load(){this.child=createCardElement(this.config);this.replaceChildren(this.child);this.child.hass=this._hass;}set hass(value){this._hass=value;if(this.child)this.child.hass=value;}});
document.addEventListener('hass-more-info',()=>showError('The More info dialog is available in Home Assistant.'));
document.addEventListener('hass-notification',event=>showError(event.detail?.message||'Home Assistant reported an error.'));
document.addEventListener('click',event=>{const link=event.composedPath().find(node=>node?.tagName==='A');if(link){event.preventDefault();showError('Links are available in Home Assistant.');}},true);
const allowed=new Set([...catalog.cards.filter(card=>!card.hidden).map(card=>NATIVE_CARD_TYPES[card.id]),'custom:marao-camera-events-card','custom:marao-navbar-card']);

function defaultDashboard(){return {title:'Marao example',views:['home','living-room','kitchen','away'].map(path=>({path,title:path.replaceAll('-',' '),cards:[]}))};}
async function render(message){
  if(!allowed.has(message.config?.type))throw new Error('Choose a public Marao card.');
  if(!message.states||Array.isArray(message.states)||typeof message.states!=='object')throw new Error('Invalid fictional entity states.');
  const revision=++renderRevision;
  request=message;lastHeight=0;simulation?.dispose();simulation=null;card?.remove();card=null;holder.replaceChildren();status.textContent='';globalThis.__maraoPreview.reset();
  for(const dialog of root.shadowRoot.querySelectorAll('dialog'))dialog.remove();
  const dashboard=clone(message.dashboard||message.scenario?.dashboard||defaultDashboard());
  root.lovelace={config:dashboard,rawConfig:dashboard,editMode:false,current_view:0,setEditMode(){showError('Dashboard editing is available in Home Assistant.');}};
  simulation=createSimulation({...message,dashboard,onChange:hass=>{app.hass=hass;root.hass=hass;if(card)card.hass=hass;}});
  const [{applyTheme},{setDashboardNavigation}]=await Promise.all([import('../../custom_components/marao_dashboard/frontend/MaraoTheme.js'),import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js')]);
  if(revision!==renderRevision)return;
  setDashboardNavigation(root,null);
  applyTheme(document.documentElement,simulation.hass);app.hass=simulation.hass;root.hass=simulation.hass;
  if(message.config.type==='custom:marao-navbar-card'){
    setDashboardNavigation(root,{...safePreviewData(message.config),show_cache_reset:false,show_editor_button:false});
    card=root.shadowRoot.querySelector('[data-marao-navigation-surface]');
  }else{
    const element=document.createElement(message.config.type.slice(7));holder.append(element);card=element;card.hass=simulation.hass;card.setConfig(safePreviewData(message.config));
  }
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(revision!==renderRevision)return;
  if(!status.textContent)send('rendered');resize();
}
const clone=value=>structuredClone(value);
let lastHeight=0;
function resize(){
  const popup=app.shadowRoot.querySelector('.marao-popup-overlay');
  const content=popup?.querySelector('.marao-popup-scroll'),head=popup?.querySelector('.marao-popup-head');
  const needed=popup?Math.ceil((content?.scrollHeight||0)+(head?.getBoundingClientRect().height||0)+58):document.body.scrollHeight;
  const height=__MARAO_DESIGN_PREVIEW__?(popup?750:Math.max(100,Math.ceil(holder.getBoundingClientRect().height))):Math.max(460,Math.min(900,needed));
  if(height!==lastHeight){lastHeight=height;send('resize',__MARAO_DESIGN_PREVIEW__?{height,popup:Boolean(popup)}:{height});}
}
new ResizeObserver(resize).observe(__MARAO_DESIGN_PREVIEW__?holder:document.body);
new MutationObserver(resize).observe(app.shadowRoot,{childList:true,subtree:true,characterData:true});
globalThis.addEventListener('message',async event=>{
  const message=event.data;
  if(event.source===parent&&message?.channel===channel&&message.type==='hello'){try{await runtimeReady;send('ready');}catch(error){send('error',{message:error.message});}return;}
  if(event.source!==parent||!message||message.channel!==channel||message.type!=='render'||typeof message.token!=='string'||typeof message.id!=='string'&&typeof message.id!=='number')return;
  try{await runtimeReady;await render(message);}catch(error){status.textContent=error.message;send('error',{message:error.message,token:message.token,id:message.id});}
});
runtimeReady=import('../../custom_components/marao_dashboard/frontend/MaraoRuntime.js');
try{await runtimeReady;send('ready');}catch(error){status.textContent='Preview could not initialize: '+error.message;send('error',{message:status.textContent});}
