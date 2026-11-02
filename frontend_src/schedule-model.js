export const MANAGER='marao-schedules';
export const EVENT='marao_schedule_request';
export const DAYS=['mon','tue','wed','thu','fri','sat','sun'];
export const uid=()=>globalThis.crypto.randomUUID().replaceAll('-','');
export const controllerId=id=>'marao_schedules_'+id+'_controller';
export const timerId=id=>'marao_schedules_'+id;
const copy=value=>structuredClone(value);
const condition=value=>({condition:'template',value_template:'{{ '+value+' }}'});
const action=(name,data)=>({action:name,data,continue_on_error:true});
const choose=(test,sequence)=>({if:[condition(test)],then:sequence});
const usable=id=>`states(${JSON.stringify(id)}) not in ['unknown','unavailable']`;
export function validateTimer(timer,manifest,others=[]) {
  if(typeof timer.name!=='string'||!timer.name.trim())throw new Error('Enter a timer name.');
  if(!manifest.groups.some(g=>g.id===timer.timer_group_id))throw new Error('Choose a timer group.');
  if(!Array.isArray(timer.targets)||!timer.targets.length||new Set(timer.targets).size!==timer.targets.length||timer.targets.some(id=>!manifest.targets.some(t=>t.entity_id===id)))throw new Error('Choose registered devices.');
  if(!Array.isArray(timer.days)||!timer.days.length||timer.days.some(d=>!DAYS.includes(d))||!/^([01]\d|2[0-3]):[0-5]\d$/.test(timer.time))throw new Error('Choose weekdays and a start time.');
  if(!['none','after_duration'].includes(timer.stop_mode)||timer.stop_mode==='none'&&Object.hasOwn(timer,'duration_minutes')||timer.stop_mode==='after_duration'&&(!Number.isInteger(timer.duration_minutes)||timer.duration_minutes<1||timer.duration_minutes>1440))throw new Error('Choose Turn on only or a duration of 1–1440 minutes.');
  const spans=t=>t.days.map(day=>{const [h,m]=t.time.split(':').map(Number),start=DAYS.indexOf(day)*1440+h*60+m;return [start,start+(t.stop_mode==='after_duration'?t.duration_minutes:0)];});
  for(const other of others)if(other.id!==timer.id&&other.timer_group_id===timer.timer_group_id&&other.targets.some(id=>timer.targets.includes(id)))for(const a of spans(timer))for(const b of spans(other))for(const offset of [-10080,0,10080]) {
    const [s,e]=[b[0]+offset,b[1]+offset];if(a[0]===s || a[0]<e&&s<a[1] || a[0]===a[1]&&s<=a[0]&&a[0]<e || s===e&&a[0]<=s&&s<a[1])throw new Error('Timers overlap for the same device in this group.');
  }
  return timer;
}
export function targetAdapter(id) {
  const domain=id.split('.')[0];
  if(!/^(switch|valve|input_boolean)\.[a-z0-9_]+$/.test(id))throw new Error('Choose switch or valve devices.');
  return {on:domain+'.'+(domain==='valve'?'open_valve':'turn_on'),off:domain+'.'+(domain==='valve'?'close_valve':'turn_off')};
}
export function startConfig(meta,manifest) {
  const source={...copy(meta),manager:MANAGER,version:1,role:'start',collection_id:manifest.id};delete source.automation_entity;
  return {id:timerId(meta.id),alias:meta.name,mode:'single',variables:{marao_schedule:source},triggers:[{trigger:'time',at:meta.time+':00'}],conditions:[condition(`now().weekday() in ${JSON.stringify(meta.days.map(d=>DAYS.indexOf(d)))} and now().fold == 0`)],actions:[{event:EVENT,event_data:{collection_id:manifest.id,kind:'start',timer_id:meta.id,source:'{{ this.entity_id }}',issued:'{{ as_timestamp(now()) }}',epoch:`{{ as_timestamp(states[${JSON.stringify(manifest.selection?.entity_id || '')}].last_changed) }}`}}]};
}
export function controllerConfig(manifest) {
  const m=copy(manifest),ready=m.status==='ready', selection=m.selection?.entity_id || '';
  const variables={marao_schedule:{...m,manager:MANAGER,version:1,role:'controller'},request:'{{ trigger.event.data if trigger.platform == "event" else {} }}',approved:'{{ (marao_schedule.schedules | selectattr("id", "eq", request.get("timer_id", "")) | list | first) | default({}) }}'};
  const recent="0 <= as_timestamp(now()) - as_timestamp(trigger.event.time_fired,0) < 10";
  const selectionChange=choose(`trigger.id == 'request' and request.get('kind') == 'select' and ${recent} and request.get('group') in ${JSON.stringify(['paused',...m.groups.map(g=>g.id)])}`,[action('input_select.select_option',{entity_id:selection,option:'{{ request.group }}'})]);
  const starts=[];
  for(const target of m.targets) {
    if(!target.mode||!target.timer)continue;
    const id=target.entity_id,mode=target.mode.entity_id,timer=target.timer.entity_id,adapter=targetAdapter(id);
    const can=`${JSON.stringify(id)} in approved.get('targets', []) and states(${JSON.stringify(mode)}) == 'idle' and states(${JSON.stringify(id)}) in ['off','closed'] and states(${JSON.stringify(timer)}) == 'idle'`;
    starts.push(choose(can,[action('input_select.select_option',{entity_id:mode,option:"{{ 'timed' if approved.stop_mode == 'after_duration' else 'on_only' }}"}),choose(`states(${JSON.stringify(mode)}) in ['timed','on_only']`,[choose("approved.stop_mode == 'after_duration'",[action('timer.start',{entity_id:timer,duration:'{{ approved.duration_minutes * 60 }}'})]),choose(`approved.stop_mode == 'none' or states(${JSON.stringify(timer)}) == 'active'`,[action(adapter.on,{entity_id:id})])])]));
    // Busy/unknown members produce trace diagnostics, never a delayed retry.
    starts.push(choose(`${JSON.stringify(id)} in approved.get('targets', []) and not (${can}) and states(${JSON.stringify(mode)}) == 'idle'`,[{action:'logbook.log',data:{name:'Marao',entity_id:id,message:'Schedule skipped: unavailable or busy target.'}}]));
  }
  const admit=`trigger.id == 'request' and request.get('kind') == 'start' and ${recent} and approved and is_state(approved.get('automation_entity',''), 'on') and request.get('source') == approved.get('automation_entity') and states(${JSON.stringify(selection)}) == approved.get('timer_group_id') and (request.get('epoch',0) | float(0)) == as_timestamp(states[${JSON.stringify(selection)}].last_changed) and now().strftime('%H:%M') == approved.get('time') and now().weekday() in approved.get('days',[]) | map('replace','mon','0') | list`;
  // Weekday validation uses explicit numeric metadata, independent of phone locale.
  const admission=admit.replace("now().weekday() in approved.get('days',[]) | map('replace','mon','0') | list","now().weekday() in approved.get('weekday_numbers',[]) and now().fold == 0");
  const recovery=[];
  for(const t of m.targets) {
    if(!t.mode||!t.timer)continue;
    const id=t.entity_id,mode=t.mode.entity_id,timer=t.timer.entity_id,adapter=targetAdapter(id),q=JSON.stringify;
    recovery.push(choose(`trigger.id == 'startup' and is_state(${q(mode)},'timed')`,[action('input_select.select_option',{entity_id:mode,option:'stopping'})]));
    const explicit=`trigger.id == 'request' and request.get('kind') == 'stop' and request.get('target') == ${q(id)} and ${recent}`;
    const timed=`is_state(${q(mode)}, 'timed') and states(${q(timer)}) in ['idle','paused','unknown','unavailable']`;
    const recovered=`is_state(${q(mode)}, 'stopping') and (trigger.id == 'startup' or (trigger.id == 'state' and trigger.entity_id == ${q(id)} and trigger.from_state is not none and trigger.from_state.state in ['unknown','unavailable']))`;
    recovery.push(choose(explicit,[action('input_select.select_option',{entity_id:mode,option:'stopping'})]));
    recovery.push(choose(`(${explicit} or ${timed} or ${recovered}) and ${usable(id)} and states(${q(id)}) not in ['off','closed']`,[action('input_select.select_option',{entity_id:mode,option:'stopping'}),action(adapter.off,{entity_id:id})]));
    recovery.push(choose(`states(${q(mode)}) in ['timed','on_only','stopping'] and states(${q(id)}) in ['off','closed'] and (is_state(${q(mode)},'stopping') or (is_state(${q(mode)},'timed') and not is_state(${q(timer)},'active')) or as_timestamp(states[${q(id)}].last_changed) >= as_timestamp(states[${q(mode)}].last_changed))`,[action('input_select.select_option',{entity_id:mode,option:'idle'}),choose(`not is_state(${q(timer)},'idle')`,[action('timer.cancel',{entity_id:timer})])]));
  }
  const triggers=[{trigger:'event',event_type:EVENT,event_data:{collection_id:m.id},id:'request'},{trigger:'homeassistant',event:'start',id:'startup'},{trigger:'event',event_type:'automation_reloaded',id:'reload'}];
  const watched=m.targets.flatMap(t=>[t.entity_id,t.timer?.entity_id]).filter(Boolean);
  if(watched.length)triggers.push({trigger:'state',entity_id:watched,id:'state'});
  return {id:controllerId(m.id),alias:m.name,mode:'queued',max:100,variables,triggers,conditions:[],actions:ready?[selectionChange,choose(admission,starts),...recovery]:[],...(!ready?{initial_state:false}:{})};
}
export function recognized(config,manifest) {
  const meta=config?.variables?.marao_schedule;
  if(meta?.manager!==MANAGER||meta.version!==1||!['controller','start'].includes(meta.role))return false;
  let expected;
  try{expected=meta.role==='controller'?controllerConfig(meta):startConfig(meta,manifest);}catch{return false;}
  const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  return ['id','mode','max','triggers','conditions','actions'].every(key=>stable(config[key])===stable(expected[key]));
}
