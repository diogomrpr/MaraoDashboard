const {locationLabel,writeLocationPreference,resolveLocation}=await import(new URL(`./MaraoLocation.js${new URL(import.meta.url).search}`,import.meta.url));
const {haptic}=await import(new URL(`./MaraoNavigation.js${new URL(import.meta.url).search}`,import.meta.url));
export function mountLocationPreferences(host,owner,isCurrent,draft){
 const hass=owner._hass,user=hass.user.id;owner._routes();const key=owner._locationKey;
 const valid=()=>isCurrent()&&owner.isConnected&&!owner._editing&&owner._hass?.user?.is_admin&&owner._hass.user.id===user&&owner._locationKey===key&&owner._config.current_room?.enabled;
 const pt=String(hass.language).startsWith('pt'),t=(a,b)=>pt?b:a;
 const hint=document.createElement('p');hint.textContent=t('Changes apply immediately to this browser and account, independently of Save.','As alterações aplicam-se imediatamente a este navegador e conta, independentemente de Guardar.');host.append(hint);
 const auto=document.createElement('button');auto.type='button';auto.textContent=locationLabel('automatic',hass);host.append(auto);
 const form=document.createElement('ha-form');form.hass=hass;form.data={person:owner._locationPreference?.person||''};form.schema=[{name:'person',selector:{entity:{domain:['person']}}}];form.computeLabel=()=>locationLabel('person',hass);host.append(form);
 const status=document.createElement('p');status.setAttribute('role','status');host.append(status);
 const update=person=>{if(!valid())return;haptic('heavy');let storage;try{storage=window.localStorage;}catch{}owner._locationPreference=writeLocationPreference(storage,key,person);if(person===null)owner._locationIdentity=null;owner._updateCurrent();form.data={person:person||''};refresh();};
 auto.onclick=()=>update(null);form.addEventListener('value-changed',event=>{event.stopPropagation();update(event.detail.value.person||null);});
 const refresh=()=>{if(!valid())return;const root=owner._root(),document=root?.lovelace?.rawConfig||root?.lovelace?.config;
  const route=owner._routes().find(r=>r.location);const detail=route?.diagnostics||{};
  const chain=[t('Account','Conta')+': '+(detail.account||'—'),t('Selection','Seleção')+': '+(detail.selection==='override'?t('Local override','Escolha local'):t('Automatic','Automática')),t('Person','Pessoa')+': '+(detail.person||'—'),t('Presence','Presença')+': '+(detail.presence||'—'),t('Bermuda Area sensor','Sensor Bermuda de divisão')+': '+(detail.source||'—'),t('Area ID','ID da divisão')+': '+(detail.area||'—'),t('Page','Página')+': '+(detail.path||'—'),route?.label];
  status.textContent=chain.join(' · ')+(owner._locationPreference?.error?' · '+locationLabel(owner._locationPreference.error,owner._hass):'');
  if(draft){const preview=resolveLocation(draft.navbar.current_room,owner._hass,owner._locationPreference?.person,document,owner._config.dashboard_root,window.location.origin,owner._locationIdentity?.records);previewStatus.textContent=t('Draft preview (not applied): ','Pré-visualização do rascunho (não aplicada): ')+preview.label+(preview.path?' · '+preview.path:'');}
 };
 const previewStatus=document.createElement('p');if(draft)host.append(previewStatus);refresh();return refresh;
}
