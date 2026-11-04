const {locationLabel,deviceRoomPreferenceKey,writeLocationPreference,writeDeviceRoomPreference,readRoomPreference,resolveLocation}=await import(new URL(`./MaraoLocation.js${new URL(import.meta.url).search}`,import.meta.url));
const {haptic}=await import(new URL(`./MaraoNavigation.js${new URL(import.meta.url).search}`,import.meta.url));
export function mountLocationPreferences(host,owner,isCurrent,draft){
 const hass=owner._hass,user=hass.user.id;owner._routes();const key=owner._locationKey;
 const valid=()=>Boolean(key)&&deviceRoomPreferenceKey(window.location.origin,owner._config.dashboard_root,owner._hass?.user?.id)===key&&!owner._root()?.lovelace?.editMode&&isCurrent()&&owner.isConnected&&!owner._editing&&owner._hass?.connected!==false&&owner._hass?.connection?.connected!==false&&owner._hass?.user?.is_admin&&owner._hass.user.id===user&&owner._locationKey===key&&owner._config.current_room?.enabled;
 const pt=String(hass.language).startsWith('pt'),t=(a,b)=>pt?b:a;
 const hint=document.createElement('p');hint.textContent=t('Choose the Area sensor for this browser/WebView. No person is required. The choice applies immediately, independently of Save, and stays across reloads while this site’s storage survives. Other browsers, profiles, apps and origins need their own selection.','Escolha o sensor de divisão para este navegador/WebView. Não é necessária uma pessoa. A escolha aplica-se imediatamente, independentemente de Guardar, e mantém-se ao recarregar enquanto o armazenamento deste site existir. Outros navegadores, perfis, aplicações e origens precisam da sua própria seleção.');host.append(hint);
 const form=document.createElement('ha-form');form.hass=hass;form.schema=[{name:'area_sensor',selector:{entity:{domain:['sensor']}}}];form.computeLabel=()=>t('Area sensor for this browser','Sensor de divisão deste navegador');host.append(form);
 const clear=document.createElement('button');clear.type='button';clear.textContent=t('Clear / Reset this selection','Limpar / Repor esta seleção');host.append(clear);
 const useLegacy=document.createElement('button');useLegacy.type='button';useLegacy.textContent=t('Use legacy person tracking','Usar localização antiga por pessoa');host.append(useLegacy);
 const legacy=document.createElement('section'),heading=document.createElement('h4');heading.textContent=t('Legacy person tracking','Localização antiga por pessoa');legacy.append(heading);host.append(legacy);
 const auto=document.createElement('button');auto.type='button';auto.textContent=locationLabel('automatic',hass);legacy.append(auto);
 const personForm=document.createElement('ha-form');personForm.hass=hass;personForm.schema=[{name:'person',selector:{entity:{domain:['person']}}}];personForm.computeLabel=()=>locationLabel('person',hass);legacy.append(personForm);
 const status=document.createElement('p');status.setAttribute('role','status');host.append(status);
 const previewStatus=document.createElement('p');if(draft)host.append(previewStatus);
 let shownPreference;
 const storage=()=>{try{return window.localStorage;}catch{}};
 const update=choice=>{if(!valid())return;haptic('heavy');writeDeviceRoomPreference(storage(),key,choice);owner._locationPreference=readRoomPreference(storage(),key,owner._legacyLocationKey);owner._locationIdentity=null;owner._updateCurrent();refresh();};
 clear.onclick=()=>update({mode:'none'});useLegacy.onclick=()=>update({mode:'legacy'});
 form.addEventListener('value-changed',event=>{event.stopPropagation();const area=event.detail.value.area_sensor;update(area?{mode:'sensor',area_sensor:area}:{mode:'none'});});
 const updatePerson=person=>{if(!valid()||owner._locationPreference?.error==='newer'||owner._routes().find(r=>r.location)?.diagnostics?.mode!=='legacy')return;haptic('heavy');const result=writeLocationPreference(storage(),owner._legacyLocationKey,person);owner._locationPreference={...owner._locationPreference,...result};owner._locationIdentity=null;owner._updateCurrent();refresh();};
 auto.onclick=()=>updatePerson(null);personForm.addEventListener('value-changed',event=>{event.stopPropagation();updatePerson(event.detail.value.person||null);});
 const refresh=()=>{if(!valid())return;const root=owner._root(),document=root?.lovelace?.rawConfig||root?.lovelace?.config;
  const route=owner._routes().find(r=>r.location),detail=route?.diagnostics||{},preference=owner._locationPreference||{};
  form.hass=personForm.hass=owner._hass;form.disabled=clear.disabled=useLegacy.disabled=preference.error==='newer';legacy.hidden=detail.mode!=='legacy';
  if(shownPreference!==preference){form.data={area_sensor:preference.area_sensor||''};personForm.data={person:preference.person||''};shownPreference=preference;}
  const chain=detail.mode==='legacy'?[t('Legacy person tracking','Localização antiga por pessoa'),t('Person','Pessoa')+': '+(detail.person||'—'),t('Presence','Presença')+': '+(detail.presence||'—')]:[t('This browser/WebView','Este navegador/WebView')];
  chain.push(t('Area sensor','Sensor de divisão')+': '+(preference.area_sensor||detail.source||'—'),t('Area ID','ID da divisão')+': '+(detail.area||'—'),t('Page','Página')+': '+(detail.path||'—'),route?.label||'');
  status.textContent=chain.join(' → ')+(preference.error?' · '+locationLabel(preference.error,owner._hass):preference.persisted?t(' · Saved in this browser for this account.',' · Guardado neste navegador para esta conta.'):'');
  if(draft){const preview=resolveLocation(draft.navbar.current_room,owner._hass,preference,document,owner._config.dashboard_root,window.location.origin,owner._locationIdentity?.records);previewStatus.textContent=t('Draft preview (not applied): ','Pré-visualização do rascunho (não aplicada): ')+preview.label+(preview.path?' · '+preview.path:'');}
 };
 refresh();return refresh;
}
