const {locationLabel,writeLocationPreference}=await import(new URL(`./MaraoLocation.js${new URL(import.meta.url).search}`,import.meta.url));
const {focusRestorer,haptic,navbarBottomGap}=await import(new URL(`./MaraoNavigation.js${new URL(import.meta.url).search}`,import.meta.url));
export async function openLocationPreferences(owner,opener){
 if(owner._locationDialog||!owner._config.current_room?.enabled)return;
 owner._routes();const user=owner._hass?.user?.id,key=owner._locationKey,path=location.pathname;
 const dialog=document.createElement('dialog');dialog.className='marao-location-preferences';owner._locationDialog=dialog;
 const restore=focusRestorer(opener),events=new AbortController();
 const close=()=>{if(owner._locationDialog!==dialog)return;owner._locationDialog=null;events.abort();dialog.close();dialog.remove();restore();};
 owner._closeLocationPreferences=close;
 const valid=()=>owner.isConnected&&!owner._editing&&owner._hass?.user?.id===user&&location.pathname===path&&owner._config.current_room?.enabled;
 dialog.innerHTML=`<style>dialog.marao-location-preferences{position:fixed;inset:auto 0 0;margin:0 auto;width:min(100%,480px);max-height:85dvh;box-sizing:border-box;border:0;border-radius:24px 24px 0 0;padding:20px 16px ${navbarBottomGap()};overflow:auto;overscroll-behavior:contain;background:var(--ha-card-background);color:var(--primary-text-color);font:inherit;animation:up .2s ease-out}dialog.marao-location-preferences::backdrop{background:#0008}.marao-location-preferences h2{font:inherit;font-weight:700;overflow-wrap:anywhere}.marao-location-preferences button{min-height:48px;min-width:48px;font:inherit;border:0;border-radius:16px;padding:12px;background:var(--secondary-background-color);color:inherit}.marao-location-preferences button:focus{outline:none}.marao-location-preferences ha-form{display:block;max-width:100%}@keyframes up{from{transform:translateY(100%)}to{transform:translateY(0)}}</style><h2></h2><button data-auto></button><div data-person></div><p role="status"></p><button data-close></button>`;
 for(const [selector,label] of [['h2','preferences'],['[data-auto]','automatic'],['[data-close]','close']])dialog.querySelector(selector).textContent=locationLabel(label,owner._hass);
 const update=person=>{if(!valid()){close();return;}haptic('heavy');let storage;try{storage=window.localStorage;}catch{}owner._locationPreference=writeLocationPreference(storage,key,person);owner._updateCurrent();dialog.querySelector('[role=status]').textContent=owner._locationPreference.error?locationLabel(owner._locationPreference.error,owner._hass):'';form.data={person:person||''};};
 const form=document.createElement('ha-form');form.hass=owner._hass;form.data={person:owner._locationPreference?.person||''};form.schema=[{name:'person',selector:{entity:{domain:['person']}}}];form.computeLabel=()=>locationLabel('person',owner._hass);form.addEventListener('value-changed',event=>{event.stopPropagation();update(event.detail.value.person||null);});dialog.querySelector('[data-person]').append(form);
 dialog.querySelector('[data-auto]').onclick=()=>update(null);dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',close);
 window.addEventListener('location-changed',()=>{if(!valid())close();},{signal:events.signal});
 (owner._root()?.shadowRoot || owner.shadowRoot).append(dialog);dialog.showModal();dialog.querySelector('[data-auto]').focus();
 if(!customElements.get('ha-form'))try{const helpers=await loadCardHelpers();await helpers.createCardElement({type:'entities',entities:[]}).constructor.getConfigElement();}catch(error){dialog.querySelector('[role=status]').textContent=String(error.message||error);}
}
