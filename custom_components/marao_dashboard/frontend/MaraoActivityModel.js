// Activity is recorded evidence. Keep dates that are measurements in the card.
export const activationDomains = new Set(['button','input_button','scene']);
export function activityTimestamp(entity, state) {
  return activationDomains.has(String(entity).split('.')[0]) && Number.isFinite(Date.parse(state?.state));
}
export function activitySources(config, entity = config.entity) {
  return [...new Set([entity, ...(config.variables?.activity_entities || [])].filter(id => typeof id === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(id)))];
}
export function hasActivity(config, state, entity = config.entity) {
  return ['md_sensor_card','md_access_card','md_access_action_card','md_access_slide_action_card','md_access_hold_action_card'].includes(config.template)
    || activationDomains.has(String(entity).split('.')[0]) || Boolean(config.variables?.activity_entities?.length);
}
const dateParts = (time, zone) => Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(time).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
export function dateKey(time, zone) {const p=dateParts(time,zone);return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;}
export function shiftDate(day, amount) {const d=new Date(`${day}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
export function dayStart(day, zone) {
  const target=Date.parse(`${day}T00:00:00Z`);let value=target;
  for(let i=0;i<4;i++) {const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(value).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));const actual=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);const delta=target-actual;if(!delta)break;value+=delta;}
  return value;
}
export function activityRange(period, zone, now=Date.now(), custom={}) {
  const today=dateKey(now,zone), start=period==='custom'?custom.start:shiftDate(today,period==='yesterday'?-1:period==='week'?-6:0), end=period==='custom'?custom.end:period==='yesterday'?shiftDate(today,-1):today;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(end||'')||new Date(start+'T00:00:00Z').toISOString().slice(0,10)!==start||new Date(end+'T00:00:00Z').toISOString().slice(0,10)!==end||start>today||end<start||Math.round((Date.parse(end)-Date.parse(start))/86400000)>30)throw new Error('range');
  return {start:dayStart(start,zone),end:Math.min(dayStart(shiftDate(end,1),zone),dayStart(shiftDate(today,1),zone))};
}
export function eventKind(source, before, after) {
  if(['unknown','unavailable'].includes(after)||['unknown','unavailable'].includes(before))return 'availability';
  if(['jammed','error','triggered'].includes(after))return 'problem';
  if(activationDomains.has(String(source).split('.')[0]))return 'activation';
  if(['open','unlocked'].includes(after))return 'opened';
  if(['closed','locked'].includes(after))return 'closed';
  return 'state';
}
const timestamp = value => typeof value==='number' ? value*1000 : Date.parse(value);
export function normalizeActivity(history, logbook, {start,end,sources,units={}}) {
  const records=new Map(), allowed=new Set(sources);
  const put=record=>{if(allowed.has(record.source)&&record.time>=start&&record.time<end)records.set(record.id,record);};
  for(const series of Array.isArray(history)?history:[]) {
    let previous;
    for(const state of series) {
      const source=state.entity_id||previous?.entity_id,time=timestamp(state.last_changed||state.last_updated);
      if(previous && state.state!==previous.state && Number.isFinite(time)) put({id:`${source}:${time}:${state.state}`,time,source,kind:eventKind(source,previous.state,state.state),before:previous.state,after:state.state,unit:state.attributes?.unit_of_measurement||units[source]||'',origin:'unknown'});
      previous={...state,entity_id:source};
    }
  }
  for(const entry of Array.isArray(logbook)?logbook:[]) {
    const source=entry.entity_id,time=timestamp(entry.when),request=entry.event_type==='call_service' && entry.state==null;
    // Never copy service_data, raw context, codes or arbitrary event payloads.
    const after=entry.state;
    if(!request && after==null && !activationDomains.has(String(source).split('.')[0]))continue;
    const id=request?`${source}:${time}:request:${entry.domain||''}.${entry.service||''}`:`${source}:${time}:${after??'activation'}`;
    const old=records.get(id);
    put({...old,id,time,source,kind:request?'request':old?.kind||eventKind(source,old?.before,after),after:after==null?undefined:String(after),before:old?.before,unit:old?.unit||units[source]||'',origin:entry.context_user_id?'user':entry.context_event_type==='automation_triggered'||/^(automation|script)\./.test(entry.context_entity_id||'')?'automation':'unknown',initiatorName:typeof entry.context_entity_id_name==='string'?entry.context_entity_id_name:undefined,initiator:typeof entry.context_user_id==='string'?entry.context_user_id:/^(automation|script)\.[a-z0-9_]+$/.test(entry.context_entity_id||'')?entry.context_entity_id:undefined,action:request&&typeof entry.service==='string'?`${entry.domain||''}.${entry.service}`:undefined});
  }
  return [...records.values()].sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id));
}
export function filterActivity(records, filter={}) {return records.filter(row=>(!filter.kind||row.kind===filter.kind)&&(!filter.source||row.source===filter.source)&&(!filter.origin||row.origin===filter.origin)&&(!filter.initiator||row.initiator===filter.initiator));}
export async function loadActivity(hass, sources, range, current=()=>true) {
  const records=new Map(),errors=[];
  for(let start=range.start;start<range.end;) {
    const day=dateKey(start,hass.config?.time_zone||'UTC'),end=Math.min(range.end,dayStart(shiftDate(day,1),hass.config?.time_zone||'UTC'));
    for(let i=0;i<sources.length;i+=8) {
      if(!current())return null;
      const group=sources.slice(i,i+8).join(','),from=new Date(start).toISOString(),to=new Date(end).toISOString();
      for(const [kind,path] of [['history',`history/period/${from}?filter_entity_id=${encodeURIComponent(group)}&end_time=${to}`],['logbook',`logbook/${from}?entity=${encodeURIComponent(group)}&end_time=${to}`]]) {
        try {const rows=await hass.callApi('GET',path);if(!current())return null;if(!Array.isArray(rows))throw new Error('shape');for(const row of normalizeActivity(kind==='history'?rows:[],kind==='logbook'?rows:[],{...range,sources,units:Object.fromEntries(sources.map(id=>[id,hass.states?.[id]?.attributes?.unit_of_measurement]))})){const previous=records.get(row.id);records.set(row.id,{...previous,...row,before:row.before??previous?.before,unit:row.unit||previous?.unit||''});}}catch(error) {if(!current())return null;errors.push({kind,reason:[401,403].includes(error?.status_code||error?.status)?'permission':'failed',sources:sources.slice(i,i+8),start,end});}
      }
    }
    start=end;
  }
  return {records:[...records.values()].sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id)),errors};
}
