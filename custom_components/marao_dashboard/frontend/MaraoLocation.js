// Shared optional settings and state resolution; never infer a person's physical device.
const object = v => v && typeof v === 'object' && !Array.isArray(v);
export function locationError(value) {
  if(value===undefined)return;
  if(!object(value) || value.enabled!==undefined && typeof value.enabled!=='boolean')return 'Invalid current room settings.';
  for(const [key,pattern,field] of [['people',/^person\.[a-z0-9_]+$/,'area_sensor'],['rooms',/^.+$/,'path']]){
    if(value[key]===undefined)continue;
    if(!object(value[key]))return 'Invalid current room mappings.';
    for(const [id,entry] of Object.entries(value[key]))if(!pattern.test(id)||!object(entry)||typeof entry[field]!=='string'||(key==='people'?!/^sensor\.[a-z0-9_]+$/.test(entry[field]):!entry[field].startsWith('/')))return 'Invalid current room mappings.';
  }
  if(value.away_path!==undefined && (typeof value.away_path!=='string'||value.away_path && !value.away_path.startsWith('/')))return 'Invalid Away page.';
}
const labels={en:{room:'Current room',away:'Away',loading:'Loading location',identity:'Choose a person in Location preferences',unavailable:'Location unavailable',unknown:'Room unknown',unmapped:'No room page configured',preferences:'Location preferences',automatic:'Automatic',person:'Person',close:'Close',storage:'This choice applies for this session; browser storage is unavailable.',invalid:'Saved location preference is invalid. Choose Automatic or a person.'},pt:{room:'Divisão atual',away:'Ausente',loading:'A carregar a localização',identity:'Escolha uma pessoa nas preferências de localização',unavailable:'Localização indisponível',unknown:'Divisão desconhecida',unmapped:'Nenhuma página de divisão configurada',preferences:'Preferências de localização',automatic:'Automático',person:'Pessoa',close:'Fechar',storage:'A escolha aplica-se a esta sessão; o armazenamento do navegador não está disponível.',invalid:'A preferência guardada é inválida. Escolha Automático ou uma pessoa.'}};
export const locationLabel=(key,hass)=>labels[String(hass?.language||'').startsWith('pt')?'pt':'en'][key]||key;
export const locationPreferenceKey=(origin,root,user)=>JSON.stringify(['marao-location',origin,root,user]);
export function readLocationPreference(storage,key){try{const value=storage.getItem(key);if(value===null)return {person:null};if(!/^person\.[a-z0-9_]+$/.test(value))return {person:'invalid',error:'invalid'};return {person:value};}catch{return {person:null,error:'storage'};}}
export function writeLocationPreference(storage,key,person){try{if(person===null)storage.removeItem(key);else storage.setItem(key,person);return {person};}catch{return {person,error:'storage'};}}
export function resolveLocation(config,hass,override,document,root,origin){
  const neutral=status=>({location:true,status,label:locationLabel(status,hass),icon:'mdi:home-export-outline',disabled:true,path:''});
  if(!hass?.states)return neutral('loading');
  if(hass.connected===false||hass.connection?.connected===false)return neutral('unavailable');
  const people=Object.entries(hass.states).filter(([id,s])=>id.startsWith('person.')&&hass.user?.id&&s.attributes?.user_id===hass.user.id);
  const person=override || (people.length===1?people[0][0]:null), state=hass.states[person];
  if(!state)return neutral('identity');
  if(['unknown','unavailable',''].includes(state.state))return neutral('unavailable');
  const away=state.state!=='home';
  const sensor=hass.states[config?.people?.[person]?.area_sensor];
  const area=sensor&&!['unknown','unavailable'].includes(sensor.state)?sensor.attributes?.area_id:null;
  const path=away?config?.away_path:config?.rooms?.[area]?.path;
  if(!path)return neutral(away?'away':!sensor?'unavailable':!area?'unknown':'unmapped');
  let url;try{url=new URL(path,origin);}catch{return neutral('unmapped');}
  const parts=url.pathname.replace(/\/$/,'').split('/');
  if(url.origin!==origin||parts[1]!==root||parts.length>3||url.search||url.hash)return neutral('unmapped');
  let view;try{view=parts[2]?document?.views?.find((v,i)=>String(v.path??i)===decodeURIComponent(parts[2])):document?.views?.[0];}catch{}
  if(!view)return neutral('unmapped');
  return {location:true,status:away?'away':'room',label:view.title||locationLabel(away?'away':'room',hass),icon:view.icon||(away?'mdi:home-export-outline':'mdi:map-marker'),path,disabled:false};
}
