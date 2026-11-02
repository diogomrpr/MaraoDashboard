import {memberId,summarySections,collectionLabel} from './MaraoCollections.js';
export const POPUP_ROLES = ['md_entity_group_card','md_scene_collection_card','md_climate_card','md_media_card','md_camera_card','md_energy_period_card','md_graph_card','md_security_card','md_access_card','md_floor_plan_card'];
export const popupRole = config => POPUP_ROLES.includes(config.template)
  && !['popup_hash','lights_popup','mode_selector_hash'].some(key=>config.variables?.[key])
  && !(config.template==='md_graph_card'&&!config.variables?.history_popup)
  && !(config.template==='md_media_card'&&config.variables?.media_display==='inline')
  && !(config.template==='md_security_card'&&config.tap_action)
  && !(config.template==='md_access_card'&&config.variables?.access_mode&&!['auto','popup'].includes(config.variables.access_mode));
export const canonicalLayout = value => JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function popupViewError(config) {
  if(Object.hasOwn(config,'popup_view') && (typeof config.popup_view!=='string'||!/^[a-z0-9][a-z0-9_-]*$/.test(config.popup_view)))return 'Choose a same-dashboard Sections view.';
}
export function resolvePopupView(document,path) {
  const error=popupViewError({popup_view:path});if(error)throw new Error(error);
  const matches=(document?.views || []).map((view,index)=>({view,index})).filter(({view,index})=>String(view.path ?? index)===path);
  if(matches.length!==1)throw new Error('Popup layout view is missing or ambiguous.');
  const result=matches[0];
  if(result.view.type!=='sections'||result.view.strategy)throw new Error('Popup layout must use a native Sections view.');
  return result;
}
function cardMembers(card,kind,metadata) {
  if(!card||typeof card!=='object'||['heading','custom:marao-summary-actions','custom:marao-entity-group-card',...(kind==='cover'?['custom:marao-fan-card']:[])].includes(card.type)||card.template==='md_entity_group_card'||kind==='cover'&&card.template==='md_fan_card')return [];
  const result=[],accept=value=>{
    const id=memberId(value);
    if(typeof id==='string'&&(kind==='battery'?id.startsWith('sensor.')&&(value?.template==='md_battery_card'||value?.type==='custom:marao-battery-card'||metadata?.find?.(m=>m.entity_id===id)?.device_class==='battery'||/(?:^|_)battery(?:_|$)/.test(id.split('.')[1])):id.startsWith(kind+'.')))result.push(typeof value==='string'?{entity_id:id}:{...value,entity_id:id,...(value.type==='custom:marao-access-card'?{template:'md_access_card'}:{})});
  };
  const id=card.entity_id || card.entity;if(id)accept({...card,entity_id:id});
  if(['entities','glance'].includes(card.type))for(const member of card.entities || [])accept(member);
  for(const child of card.cards || [])result.push(...cardMembers(child,kind,metadata));
  return result;
}
export function popupGroupFromView(group,view,metadata=[]) {
  const members=new Map(),parts=(view.sections || []).map((section,index)=>{
    const ids=[];
    for(const card of section.cards || [])for(const member of cardMembers(card,group.entity_type,metadata)) {
      if(!members.has(member.entity_id))members.set(member.entity_id,member);
      if(!ids.includes(member.entity_id))ids.push(member.entity_id);
    }
    return {id:'section-'+index,name:section.cards?.find(card=>card.type==='heading')?.heading || '',entities:ids};
  });
  return {...group,entities:[...members.keys()],members:[...members.values()],summary_sections:parts};
}
export function nativePopupCard(card,columns=12) {
  const next=structuredClone(card);
  if(next.type==='custom:marao-card'&&/^md_[a-z0-9_]+_card$/.test(next.template || '')) {
    const aliases={md_energy_period_card:'marao-energy-card',md_floor_plan_card:'marao-floorplan-card'};
    next.type='custom:'+(aliases[next.template] || 'marao-'+next.template.slice(3).replaceAll('_','-'));
  }
  next.grid_options={columns,...next.grid_options};return next;
}
function activeVisibility(kind,id) {
  if(kind==='light')return [{condition:'state',entity:id,state:'on'}];
  if(kind==='cover')return [{condition:'state',entity:id,state:['open','opening']}];
  if(kind==='climate')return [{condition:'state',entity:id,state_not:['off','unknown','unavailable']}];
  return [{condition:'numeric_state',entity:id,below:20},{condition:'not',conditions:[{condition:'numeric_state',entity:id,below:0}]}];
}
export function seedPopupView(popup,path,backPath,hass) {
  const view={type:'sections',title:popup.title || popup.name || popupLabel('Popup layout',hass),path,subview:true,back_path:backPath,max_columns:1,sections:[]};
  const group=popup.entity_group;
  const actions=scope=>({type:'custom:marao-summary-actions',popup_view:path,entity_type:group.entity_type,scope,grid_options:{columns:12,rows:'auto'}});
  if(group) {
    const members=new Map((group.members || popup.cards || []).map(member=>[memberId(member)||member.entity,member]));
    for(const [index,part]of summarySections(group).entries()) {
      const cards=[];
      if(index===0&&group.entity_type!=='battery')cards.push(actions('all'));
      if(part.name)cards.push({type:'heading',heading:part.id==='__other'?collectionLabel('Other',hass):part.name,grid_options:{columns:12,rows:'auto'}});
      if(part.name&&group.entity_type!=='battery')cards.push(actions('section'));
      for(const id of part.entities) {
        const member=structuredClone(members.get(id) || {entity_id:id});
        let template=member.template;
        if(!template)template=group.entity_type==='battery'?'md_battery_card':group.entity_type==='cover'&&(['door','garage','gate'].includes(member.device_class)||/door|garage|gate/.test(id))?'md_access_card':'md_'+group.entity_type+'_card';
        const card=nativePopupCard({...member,type:'custom:marao-card',template});
        if(group.popup_filter==='active')card.visibility=[...(card.visibility || []),...activeVisibility(group.entity_type,id)];
        cards.push(card);
      }
      view.sections.push({type:'grid',cards});
    }
  } else {
    const cards=[];
    const add=(card,columns=12)=>{
      if(card.type==='custom:marao-control-grid'){for(const child of card.cards || [])add(child,Math.max(1,Math.floor(12/(card.columns || 1))));}
      else cards.push(nativePopupCard(card,columns));
    };
    for(const card of popup.cards || [])add(card);
    view.sections.push({type:'grid',cards});
  }
  return view;
}
export function appendPopupView(document,opener,currentPath,view) {
  if(document?.strategy||!Array.isArray(document?.views))throw new Error('Use an ordinary Home Assistant dashboard.');
  if(document.views.some((v,index)=>String(v.path ?? index)===view.path))throw new Error('Popup layout path already exists.');
  const matches=[];
  const visit=(value,path)=>{
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach((child,index)=>visit(child,[...path,index]));return;}
    if(value.type&&canonicalLayout(value)===canonicalLayout(opener))matches.push(path);
    for(const key of ['cards','sections'])if(Array.isArray(value[key]))visit(value[key],[...path,key]);
  };
  document.views.forEach((v,index)=>{if(String(v.path ?? index)===currentPath)visit(v,['views',index]);});
  if(matches.length!==1)throw new Error('The invoking card is missing or duplicated. Select an existing layout in its editor.');
  const next=structuredClone(document),path=matches[0];let parent=next;
  for(const key of path.slice(0,-1))parent=parent[key];
  parent[path.at(-1)]={...parent[path.at(-1)],popup_view:view.path};next.views.push(structuredClone(view));
  return next;
}

const popupPT={
  'Popup layout':'Disposição do popup','Automatic':'Automática','Create editable layout':'Criar disposição editável','Edit layout':'Editar disposição','Download layout recovery':'Descarregar recuperação da disposição',
  'Edit cards and sections in the linked Home Assistant view.':'Edite os cartões e as secções na vista associada do Home Assistant.',
  'Choose a same-dashboard Sections view.':'Escolha uma vista Secções deste painel.',
  'Popup layout view is missing or ambiguous.':'A vista do popup está em falta ou é ambígua.',
  'Popup layout must use a native Sections view.':'O popup exige uma vista Secções nativa.',
  'Native popup layouts are unavailable on this Home Assistant host.':'As disposições nativas de popup não estão disponíveis neste Home Assistant.',
  'Layout creation requires an administrator on a connected, editable dashboard.':'A criação de disposições exige um administrador num painel editável e ligado.',
  'Dashboard changed. Reopen the popup and try again.':'O painel mudou. Reabra o popup e tente novamente.',
  'The invoking card is missing or duplicated. Select an existing layout in its editor.':'O cartão de origem está em falta ou duplicado. Escolha uma disposição existente no editor.',
  'Use an ordinary Home Assistant dashboard.':'Utilize um painel normal do Home Assistant.',
  'Popup layout path already exists.':'O endereço da disposição já existe.',
  'Save could not be confirmed. Keep the recovery download and reload before trying again.':'Não foi possível confirmar a gravação. Guarde a recuperação e recarregue antes de tentar novamente.',
  'Creating layout…':'A criar disposição…','Section action must belong to its linked Sections view.':'A ação da secção tem de pertencer à vista Secções associada.',
};
export const popupLabel=(value,hass)=>String(hass?.language || '').startsWith('pt')?popupPT[value] || value:value;

// No writes until both the invoking occurrence and a fresh baseline still match.
// HA has no compare-and-swap API; use its native single-save operation after preflight.
export async function savePopupLayout({hass,root,opener,popup,currentPath,path,backPath,isCurrent,recovery}) {
  const allowed=()=>hass.user?.is_admin&&hass.connected!==false&&hass.connection?.connected!==false&&isCurrent()&&!root.lovelace?.editMode&&typeof root.lovelace?.saveConfig==='function'&&(!root.lovelace.mode||root.lovelace.mode==='storage');
  if(!allowed())throw new Error('Layout creation requires an administrator on a connected, editable dashboard.');
  const baseline=await hass.callWS({type:'lovelace/config',url_path:path,force:true});
  if(!allowed())throw new Error('Dashboard changed. Reopen the popup and try again.');
  const suffix=globalThis.crypto?.randomUUID?.().slice(0,8) || (globalThis.crypto?.getRandomValues?Array.from(crypto.getRandomValues(new Uint8Array(4)),byte=>byte.toString(16).padStart(2,'0')).join(''):Date.now().toString(36)+Math.random().toString(36).slice(2,6)),viewPath='popup-'+suffix;
  const view=seedPopupView(popup,viewPath,backPath,hass),next=appendPopupView(baseline,opener,currentPath,view);
  const fresh=await hass.callWS({type:'lovelace/config',url_path:path,force:true});
  if(!allowed()||canonicalLayout(fresh)!==canonicalLayout(baseline))throw new Error('Dashboard changed. Reopen the popup and try again.');
  recovery({version:1,dashboard:path,created:new Date().toISOString(),original:baseline,proposed:next});
  try {await root.lovelace.saveConfig(next);}
  catch(error) {
    // A rejected response can follow a successful server write. Never blindly retry it.
    let actual;try{actual=await hass.callWS({type:'lovelace/config',url_path:path,force:true});}catch{}
    if(!actual||canonicalLayout(actual)!==canonicalLayout(next))throw new Error('Save could not be confirmed. Keep the recovery download and reload before trying again.',{cause:error});
  }
  return {config:next,view,path:viewPath};
}
