export function normalizeEventSources(config){
 if(config.columns!==undefined&&(!Number.isSafeInteger(config.columns)||config.columns<1))throw new Error('Event columns must be a positive integer.');
 if(config.cameras!==undefined&&!Array.isArray(config.cameras))throw new Error('Camera sources must be a list.');
 if(config.entity&&config.cameras?.length)throw new Error('Choose entity or cameras, not both.');
 const sources=config.cameras!==undefined?config.cameras:config.entity?[config]:[];
 const seen=new Set();
 return sources.map(source=>{
  if(!source||typeof source!=='object'||Array.isArray(source)||!/^camera\.[a-z0-9_]+$/.test(source.entity||'')||seen.has(source.entity)||source.name!==undefined&&typeof source.name!=='string')throw new Error('Choose unique camera sources.');
  for(const key of ['event_provider','provider','frigate_instance_id','frigate_camera','unifi_protect_media_source'])if(source[key]!==undefined&&typeof source[key]!=='string')throw new Error('Camera provider options must be text.');
  seen.add(source.entity);return {...source};
 });
}
export function eventTimestamp(event){
 if(event.provider==='unifi_protect'&&typeof event.timestamp!=='number')return null;
 const value=event.end_time??event.start_time??event.timestamp;
 return typeof value==='number'&&Number.isFinite(value)&&value>0?value:null;
}
export function mergeSourceEvents(sources){
 const events=sources.flatMap((source,order)=>{source.rows ||= new WeakMap();return (source.events||[]).map((event,index)=>{let row=source.rows.get(event);if(!row){row={...event,sourceKey:source.config.entity,sourceName:source.name,sourceOrder:order,nativeOrder:index,eventKey:JSON.stringify([source.config.entity,source.provider,source.identity?.instanceId,event.id]),_source:source};source.rows.set(event,row);}return row;});});
 return sources.length<2?events:events.sort((a,b)=>{const x=eventTimestamp(a),y=eventTimestamp(b);return (x===null)-(y===null)||(x!==null&&y!==null?y-x:0)||a.sourceOrder-b.sourceOrder||a.nativeOrder-b.nativeOrder;});
}
export function filterEventRows(events,{camera='',type='',range=null}={},types=event=>event.eventTypes||[]){return events.map((event,index)=>({event,index})).filter(({event})=>(!camera||event.sourceKey===camera)&&(!type||types(event).includes(type))&&(!range||eventTimestamp(event)!==null&&eventTimestamp(event)*1000>=range.start&&eventTimestamp(event)*1000<range.end));}
// A civil clock can map to zero, one, or two instants at daylight-saving changes.
export function civilInstant(value,timeZone){
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))throw new Error('Invalid range');
 const parts=value.match(/\d+/g).map(Number),guess=Date.UTC(parts[0],parts[1]-1,parts[2],parts[3],parts[4]);
 const f=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const clock=ms=>Object.fromEntries(f.formatToParts(ms).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const offsets=new Set();for(const delta of [-36,-12,0,12,36]){const ms=guess+delta*3600000,c=clock(ms);offsets.add(Date.UTC(c.year,c.month-1,c.day,c.hour,c.minute)-ms);}
 const matches=[...offsets].map(offset=>guess-offset).filter(ms=>{const c=clock(ms);return [c.year,c.month,c.day,c.hour,c.minute].every((n,i)=>n===parts[i]);});
 if(matches.length!==1)throw new Error('Invalid or ambiguous range');return matches[0];
}
export function customEventRange(start,end,zone){const a=civilInstant(start,zone),b=civilInstant(end,zone);if(a>=b)throw new Error('Invalid range');return {start:a,end:b};}
export const eventWords={en:{camera:'Camera',allCameras:'All cameras',type:'Event type',allTypes:'All types',time:'Date/time',all:'All loaded events',hour:'Last hour',day:'Last 24 hours',today:'Today',yesterday:'Yesterday',custom:'Custom range',start:'Start',end:'End',apply:'Apply',cancel:'Cancel',invalid:'Choose valid, unambiguous start/end times in the Home Assistant time zone.',coverage:'Filters apply to loaded recent events; this is not a complete archive search.',undated:'Time unavailable',excluded:'Records without timestamps are excluded from time filters.',setup:'Choose camera sources in the card editor.',empty:'No loaded events match these filters.',limit:'per-source limit',loading:'Loading',error:'Could not load events',unavailable:'Unavailable'},pt:{camera:'Câmara',allCameras:'Todas as câmaras',type:'Tipo de evento',allTypes:'Todos os tipos',time:'Data/hora',all:'Todos os eventos carregados',hour:'Última hora',day:'Últimas 24 horas',today:'Hoje',yesterday:'Ontem',custom:'Intervalo personalizado',start:'Início',end:'Fim',apply:'Aplicar',cancel:'Cancelar',invalid:'Escolha horas de início/fim válidas e inequívocas no fuso horário do Home Assistant.',coverage:'Os filtros aplicam-se aos eventos recentes carregados; não é uma pesquisa completa do arquivo.',undated:'Hora indisponível',excluded:'Os registos sem hora são excluídos dos filtros de tempo.',setup:'Escolha as câmaras no editor do cartão.',empty:'Nenhum evento carregado corresponde aos filtros.',limit:'limite por câmara',loading:'A carregar',error:'Não foi possível carregar eventos',unavailable:'Indisponível'}};
export const eventWord=(key,hass)=>eventWords[String(hass?.language||'').startsWith('pt')?'pt':'en'][key]||key;
