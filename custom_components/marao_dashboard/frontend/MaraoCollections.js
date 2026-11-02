// Shared configuration rules for native editors, conversion and runtime cards.
export const memberId = member => typeof member === 'string' ? member : member?.entity_id;
export const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pt = {'People columns must be an integer from 1 to 6.':'As colunas de pessoas têm de ser um inteiro entre 1 e 6.',People:'Pessoas','No people selected':'Nenhuma pessoa selecionada',Home:'Em casa',Away:'Ausente',Loading:'A carregar',Unknown:'Desconhecido',Unavailable:'Indisponível','Entity missing':'Entidade em falta',Disconnected:'Sem ligação',Other:'Outros','Summary sections must be a list.':'As secções do resumo têm de ser uma lista.','Sections require unique stable IDs, names and member lists.':'As secções exigem identificadores estáveis únicos, nomes e listas de membros.','Assign each configured member to at most one section.':'Atribua cada membro configurado a uma única secção.','People requires an explicit list of person entities.':'Pessoas exige uma lista explícita de entidades person.','Choose unique person entities with textual names and icons.':'Escolha pessoas únicas com nomes e ícones de texto.','Turn on all':'Ligar tudo','Turn off all':'Desligar tudo','Open all':'Abrir tudo','Close all':'Fechar tudo','No entities configured':'Nenhuma entidade configurada','No active entities':'Nenhuma entidade ativa','Requires individual slide':'Requer deslize individual',Unsupported:'Não suportado',Eligible:'Disponíveis',Skipped:'Ignorados',Sections:'Secções','Add section':'Adicionar secção',Members:'Membros',Name:'Nome',Delete:'Eliminar','Move up':'Mover para cima','Move down':'Mover para baixo'};
export const collectionLabel = (value,hass) => String(hass?.language || '').startsWith('pt') ? pt[value] || value : value;
export function peopleError(config) {
  if (!Array.isArray(config.entities)) return 'People requires an explicit list of person entities.';
  if (Object.hasOwn(config,'columns') && (!Number.isInteger(config.columns) || config.columns < 1 || config.columns > 6)) return 'People columns must be an integer from 1 to 6.';
  const seen = new Set();
  for (const member of config.entities) {
    const id = memberId(member);
    if (!/^person\.[a-z0-9_]+$/.test(id || '') || seen.has(id) || typeof member !== 'string' && (!member || Array.isArray(member) || typeof member !== 'object' || ['name','icon'].some(k => member[k] != null && typeof member[k] !== 'string'))) return 'Choose unique person entities with textual names and icons.';
    seen.add(id);
  }
}
export function sectionsError(config) {
  if (!Object.hasOwn(config,'summary_sections')) return;
  if (!Array.isArray(config.summary_sections)) return 'Summary sections must be a list.';
  const members = new Set((config.entities || []).map(memberId)), used = new Set(), ids = new Set();
  for (const section of config.summary_sections) {
    if (!section || !/^[a-z][a-z0-9_-]{0,63}$/.test(section.id || '') || ids.has(section.id) || typeof section.name !== 'string' || !section.name.trim() || !Array.isArray(section.entities)) return 'Sections require unique stable IDs, names and member lists.';
    ids.add(section.id);
    for (const id of section.entities) { if (!members.has(id) || used.has(id)) return 'Assign each configured member to at most one section.'; used.add(id); }
  }
}
export function summarySections(group) {
  const ids = [...new Set(group.entities.map(memberId))];
  if (!group.summary_sections?.length) return [{id:'',name:'',entities:ids}];
  const assigned = new Set(group.summary_sections.flatMap(s=>s.entities));
  const parts = group.summary_sections.map(s=>({...s,entities:ids.filter(id=>s.entities.includes(id))}));
  const rest = ids.filter(id=>!assigned.has(id));
  if (rest.length) parts.push({id:'__other',name:'Other',entities:rest});
  return parts;
}
export function peopleRows(config,hass) {
  return config.entities.map(member=>{
    const id=memberId(member), person=hass?.states?.[id], options=typeof member==='object'?member:{};
    const status=!hass?.states?'Loading':hass.connected===false||hass.connection?.connected===false?'Disconnected':!person?'Entity missing':person.state==='unknown'?'Unknown':person.state==='unavailable'?'Unavailable':null;
    const place=status || (person.state==='home'?'Home':person.state==='not_home'?'Away':person.state);
    return {id,name:options.name || person?.attributes?.friendly_name || id,icon:options.icon || 'mdi:account',picture:options.icon?null:person?.attributes?.entity_picture,place:collectionLabel(place,hass),problem:Boolean(status)};
  });
}
export function summaryAction(group,ids,on,hass,isAccess) {
  const batches=new Map(), skipped=[];
  for(const id of [...new Set(ids)]) {
    const state=hass?.states?.[id], attributes=state?.attributes || {}, features=Number(attributes.supported_features)||0;
    let service,data={};
    if (!hass?.states || hass.connected===false || hass.connection?.connected===false || !state || ['unknown','unavailable'].includes(state.state)) {skipped.push([id,'Unavailable']);continue;}
    if(group.entity_type==='light') service=on?'light.turn_on':'light.turn_off';
    if(group.entity_type==='cover') {
      const config=group.members?.find(member=>memberId(member)===id);
      if(on && (isAccess(id,state) || config?.template?.startsWith('md_access_') || config?.variables?.access_mode)) {skipped.push([id,'Requires individual slide']);continue;}
      if(features & (on?1:2)) service=on?'cover.open_cover':'cover.close_cover';
    }
    if(group.entity_type==='climate') {
      const modes=attributes.hvac_modes || [];
      if(!on && !modes.includes('off') && (features & 128)) service='climate.turn_off';
      else if(!on && modes.includes('off')) {service='climate.set_hvac_mode';data={hvac_mode:'off'};}
      else if(on && (features & 256)) service='climate.turn_on';
      else if(on && modes.filter(m=>m!=='off').length===1) {service='climate.set_hvac_mode';data={hvac_mode:modes.find(m=>m!=='off')};}
    }
    if(!service) {skipped.push([id,'Unsupported']);continue;}
    const key=JSON.stringify([service,data]);
    if(!batches.has(key))batches.set(key,{service,data,entities:[]});
    batches.get(key).entities.push(id);
  }
  return {batches:[...batches.values()],skipped};
}
