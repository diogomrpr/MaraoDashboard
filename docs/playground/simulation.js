import {cameraImage,safePreviewData} from './preview-assets.js';
import {controllerConfig,startConfig,controllerId,DAYS} from '../../frontend_src/schedule-model.js';

const clone=value=>structuredClone(value);
const entityPattern=/^[a-z_]+\.[a-z0-9_]+$/;
const hueSaturation=rgb=>{
  const [r,g,b]=rgb,max=Math.max(...rgb),delta=max-Math.min(...rgb);
  const sector=!delta?0:max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4;
  return [Math.round(((sector*60+360)%360)*10)/10,max?Math.round(delta/max*1000)/10:0];
};
const serviceNames={
  light:['turn_on','turn_off','toggle'],switch:['turn_on','turn_off','toggle'],input_boolean:['turn_on','turn_off','toggle'],
  fan:['turn_on','turn_off','toggle','set_percentage','set_preset_mode','oscillate','set_direction'],cover:['open_cover','close_cover','stop_cover','set_cover_position'],
  lock:['lock','unlock','open'],valve:['open_valve','close_valve','stop_valve','set_valve_position'],climate:['turn_on','turn_off','set_hvac_mode','set_temperature','set_fan_mode','set_preset_mode','set_swing_mode'],
  number:['set_value'],input_number:['set_value'],input_select:['select_option'],select:['select_option'],scene:['turn_on'],script:['turn_on','turn_off','toggle'],button:['press'],
  alarm_control_panel:['alarm_arm_home','alarm_arm_away','alarm_arm_night','alarm_arm_vacation','alarm_arm_custom_bypass','alarm_disarm','alarm_trigger'],
  media_player:['turn_on','turn_off','toggle','media_play','media_pause','media_play_pause','media_stop','media_next_track','media_previous_track','media_seek','volume_set','volume_mute','volume_up','volume_down','select_source','play_media'],
  remote:['send_command','turn_on','turn_off'],vacuum:['start','pause','stop','return_to_base','locate','set_fan_speed','send_command'],automation:['turn_on','turn_off','toggle','trigger'],timer:['start','cancel','finish'],homeassistant:['turn_on','turn_off','toggle'],
};
export const simulatedServices=Object.fromEntries(Object.entries(serviceNames).map(([domain,names])=>[domain,Object.fromEntries(names.map(name=>[name,{name,fields:{}}]))]));
export const unsupported=operation=>new Error(`Not available in the website preview: ${operation}`);

export function createSimulation({states={},config={},scenario={},language='en',theme='light',dashboard={},onChange=()=>{}}={}) {
  const flags=scenario.simulation||{}, store=clone(safePreviewData(states)), records=new Map(),helpers={input_select:[],timer:[]},subscriptions=new Set();let helperCount=0,disposed=false;
  const now=()=>new Date().toISOString();
  const registry=Object.fromEntries(Object.values(store).map(s=>[s.entity_id,{entity_id:s.entity_id,unique_id:s.entity_id.replace('.','_'),device_id:s.entity_id,platform:s.entity_id.startsWith('camera.')?'frigate':s.entity_id.split('.')[0],name:s.attributes?.friendly_name}]));
  const cameras=Array.isArray(config.cameras)?config.cameras:[{entity:config.entity_id||config.entity,...config.variables}];
  for(const camera of cameras){if(!camera?.entity||!registry[camera.entity])continue;const platform=camera.event_provider||camera.provider||'frigate';registry[camera.entity].platform=platform==='unifi_protect'?'unifiprotect':platform;registry[camera.entity].unique_id=camera.entity.split('.')[1]+'-outdoor';if(store[camera.entity])store[camera.entity].attributes={...store[camera.entity].attributes,client_id:camera.frigate_instance_id||'demo',camera_name:camera.frigate_camera||camera.entity.split('.')[1],entity_picture:cameraImage};}
  const emit=()=>{if(disposed)return;hass={...hass,states:flags.loading?undefined:{...store}};onChange(hass);for(const cb of subscriptions)cb({event_type:'state_changed',data:{}});};
  const write=(id,value,attributes={})=>{if(!entityPattern.test(id))throw unsupported('invalid entity');const prior=store[id]||{entity_id:id,attributes:{friendly_name:id.split('.')[1].replaceAll('_',' ')},last_changed:now()};store[id]={...prior,state:String(value),attributes:{...prior.attributes,...attributes},last_updated:now(),...(prior.state!==String(value)?{last_changed:now()}:{}),context:{id:'documentation',parent_id:null,user_id:'demo-user'}};};
  const dataGuard=async(operation)=>{if(flags.loading)return new Promise(()=>{});if(flags.failure)throw new Error('Simulated request failed. Choose another scenario to retry.');if(flags.disconnected)throw new Error('Disconnected');};
  const connection={connected:!flags.disconnected,subscribeEvents:async(callback)=>{subscriptions.add(callback);return()=>subscriptions.delete(callback);},subscribeMessage:async(callback,message)=>{if(message.type==='weather/subscribe_forecast'){queueMicrotask(()=>callback({forecast:forecast()}));return()=>{};}throw unsupported(message.type);}};
  const forecast=()=>Array.from({length:7},(_,i)=>({datetime:new Date(Date.now()+i*86400000).toISOString(),condition:['sunny','partlycloudy','cloudy','rainy'][i%4],temperature:20+i%4,templow:12+i%3,precipitation:i%3,wind_speed:8+i}));
  let hass={language,locale:{language,number_format:'language',time_format:'24',date_format:'language',first_weekday:'monday'},user:{id:'demo-user',name:'Alex (fictional)',is_admin:true},connected:!flags.disconnected,connection,states:flags.loading?undefined:store,entities:registry,devices:Object.fromEntries(Object.values(registry).map(e=>[e.device_id,{id:e.device_id,name:e.name,manufacturer:'Marao demo'}])),areas:{living_room:{name:'Living room'},kitchen:{name:'Kitchen'}},services:simulatedServices,themes:{darkMode:theme==='dark'},config:{time_zone:'Europe/Lisbon',unit_system:{temperature:'°C',length:'km',mass:'kg',volume:'L'},currency:'EUR',components:['automation','timer','input_select','weather']},localize:()=>undefined,hassUrl:path=>String(path).startsWith('data:image/')?path:cameraImage,formatEntityState:state=>state?.state||'',formatEntityAttributeValue:(state,key)=>String(state?.attributes?.[key]??''),callService,callWS,callApi};

  function targets(data){return [...new Set([data.entity_id].flat().filter(id=>typeof id==='string'))];}
  async function callService(domain,service,data={}) {
    await dataGuard(`${domain}.${service}`);
    if(!serviceNames[domain]?.includes(service))throw unsupported(`${domain}.${service}`);
    const ids=targets(data);if(!ids.length)throw unsupported('choose a demo entity');
    for(const id of ids){
      const state=store[id];if(!state)throw new Error(`No fictional state for ${id}. Choose a demo entity.`);if(['unknown','unavailable'].includes(state.state))throw new Error('Entity is unavailable');
      const attrs=state.attributes||{};let value=state.state,next={};
      if(['turn_on','turn_off','toggle'].includes(service))value=service==='toggle'?(state.state==='off'?'on':'off'):service==='turn_on'?'on':'off';
      if(domain==='light'&&service==='turn_on'){
        next={...data,...('brightness_pct'in data?{brightness:Math.round(data.brightness_pct*2.55)}:{})};
        if(Array.isArray(data.hs_color)){
          const [h,s]=data.hs_color, saturation=s/100;
          next.rgb_color=[5,3,1].map(offset=>{const k=(offset+h/60)%6;return Math.round(255*(1-saturation*Math.max(0,Math.min(k,4-k,1))));});
          next.color_mode=attrs.supported_color_modes?.includes('hs')?'hs':'rgb';
        }
        if(Number.isFinite(data.color_temp_kelvin)){
          // Fictional white-temperature tint; real devices supply their own converted RGB.
          const fraction=Math.max(0,Math.min(1,(data.color_temp_kelvin-(attrs.min_color_temp_kelvin||2000))/((attrs.max_color_temp_kelvin||6500)-(attrs.min_color_temp_kelvin||2000))));
          next.rgb_color=[255-35*fraction,160+75*fraction,80+175*fraction].map(Math.round);next.hs_color=hueSaturation(next.rgb_color);next.color_mode='color_temp';
        }
      }
      if(service==='set_percentage'){next.percentage=data.percentage;value=data.percentage?'on':'off';}
      if(service==='set_preset_mode')next.preset_mode=data.preset_mode;
      if(service==='set_direction')next.direction=data.direction;
      if(service==='oscillate')next.oscillating=data.oscillating;
      if(['cover','valve'].includes(domain)){const pos=service.startsWith('open_')?100:service.startsWith('close_')?0:service.startsWith('set_')?Number(data.position):Number(attrs.current_position||0);next.current_position=pos;value=pos?'open':'closed';}
      if(domain==='lock')value=service==='lock'?'locked':service==='unlock'?'unlocked':'open';
      if(domain==='climate'){if(service==='set_hvac_mode')value=data.hvac_mode;else if(service==='turn_on')value=attrs.hvac_modes?.find(mode=>mode!=='off')||'heat';if(service==='set_temperature')next={temperature:data.temperature??attrs.temperature,target_temp_low:data.target_temp_low??attrs.target_temp_low,target_temp_high:data.target_temp_high??attrs.target_temp_high};if(service==='set_fan_mode')next.fan_mode=data.fan_mode;if(service==='set_swing_mode')next.swing_mode=data.swing_mode;next.hvac_action=value==='off'?'off':value==='cool'?'cooling':'heating';}
      if(['number','input_number'].includes(domain))value=data.value;
      if(['input_select','select'].includes(domain)){if(attrs.options&&!attrs.options.includes(data.option))throw new Error('Choose a valid option');value=data.option;}
      if(domain==='alarm_control_panel')value=service==='alarm_disarm'?'disarmed':service==='alarm_trigger'?'triggered':service.replace('alarm_arm_','armed_');
      if(domain==='media_player'){
        if(service==='media_play')value='playing';if(service==='media_pause'||service==='media_stop')value='paused';if(service==='media_play_pause')value=state.state==='playing'?'paused':'playing';
        if(service==='volume_set')next.volume_level=data.volume_level;if(service==='volume_up'||service==='volume_down')next.volume_level=Math.max(0,Math.min(1,(attrs.volume_level||0)+(service==='volume_up'?.1:-.1)));
        if(service==='volume_mute')next.is_volume_muted=data.is_volume_muted;if(service==='select_source')next.source=data.source;if(service==='media_seek')next.media_position=data.seek_position;
        if(service==='media_next_track'||service==='media_previous_track')next.media_title=service==='media_next_track'?'Another morning':'A morning at home';if(service==='play_media'){value='playing';next.source=data.media_content_id;}
      }
      if(domain==='vacuum'){value=({start:'cleaning',pause:'paused',stop:'idle',return_to_base:'docked',send_command:'cleaning'})[service]||value;if(service==='set_fan_speed')next.fan_speed=data.fan_speed;}
      if(domain==='timer')value=service==='start'?'active':'idle';
      if(domain==='scene'||domain==='button')value=now();
      delete next.entity_id;write(id,value,next);
    }
    emit();return {};
  }

  function mediaBrowse(id){
    if(flags.partialFailure&&id?.includes('netatmo'))throw new Error('Simulated recording source failed');
    if(id==='media-source://netatmo')return {children:Object.values(registry).filter(e=>e.platform==='netatmo').map(e=>({media_content_id:'media-source://netatmo/events/'+e.entity_id.split('.')[1],can_expand:true,title:e.name}))};
    if(id?.startsWith('media-source://netatmo/events/')){const parts=id.split('/');if(parts.length>5)return {thumbnail:cameraImage};return {children:flags.empty?[]:[0,1,2].map(i=>({media_content_id:id+'/'+Math.floor((Date.now()-i*3600000)/1000),can_play:true,title:'Recording',media_class:'video'}))};}
    if(id==='media-source://unifiprotect')return {children:Object.values(registry).filter(e=>e.platform==='unifiprotect'||e.platform==='unifi_protect').map(e=>({title:e.name,media_content_id:'media-source://unifiprotect/demo:camera:'+e.entity_id.split('.')[1],thumbnail:'/api/camera_proxy/'+e.entity_id,can_expand:true}))};
    if(id?.startsWith('media-source://unifiprotect/')){if(id.includes(':recent:'))return {children:flags.empty?[]:[0,1,2].map(i=>({media_content_id:id.replace(/:recent:.*$/,'')+':event:'+i,title:`Today 5s Object Detection - ${i?'Vehicle':'Person'}`,timestamp:Date.now()/1000-i*3600,can_play:true}))};return {children:[{media_content_id:id+':all',can_expand:true}]};}
    throw unsupported('media source');
  }
  async function callWS(message) {
    await dataGuard(message.type);
    const {type}=message;
    if(type==='get_states')return clone(Object.values(store));
    if(type==='get_config')return clone(hass.config);
    if(type==='get_services')return clone(simulatedServices);
    if(type==='config/entity_registry/list')return clone(Object.values(registry));
    if(type==='config/device_registry/list')return clone(Object.values(hass.devices));
    if(type==='config/area_registry/list')return Object.entries(hass.areas).map(([area_id,area])=>({area_id,...area}));
    if(type==='weather/get_forecasts')return {[message.entity_id||'weather.home']:{forecast:forecast()}};
    if(type==='lovelace/config')return clone(dashboard);
    if(type==='frigate/events/get'){if(flags.partialFailure&&String(message.cameras?.[0]).includes('garden'))throw new Error('Simulated camera source failed');return flags.empty?[]:[0,1,2,3].map(i=>({id:'demo-'+i,camera:message.cameras?.[0],label:['person','car','dog','person'][i],start_time:Date.now()/1000-i*3600,end_time:Date.now()/1000-i*3600+12,has_clip:false,has_snapshot:true}));}
    if(type==='media_source/browse_media')return mediaBrowse(message.media_content_id);
    if(type==='media_source/resolve_media'){if(!String(message.media_content_id).includes('eventthumb'))throw unsupported('recording playback');return {url:cameraImage,mime_type:'image/svg+xml'};}
    if(type==='auth/sign_path'){if(!/^\/api\/frigate\//.test(message.path))throw unsupported('signed path');if(message.path.endsWith('.mp4'))throw unsupported('clip playback');return {path:cameraImage};}
    if(type==='energy/get_prefs')return {energy_sources:[],device_consumption:[]};
    if(type==='recorder/get_statistics_metadata')return (message.statistic_ids||[]).map(id=>({statistic_id:id,has_sum:true,has_mean:true,unit_of_measurement:store[id]?.attributes.unit_of_measurement||'kWh'}));
    if(type==='recorder/statistics_during_period'){const end=Date.parse(message.end_time)||Date.now(),start=Date.parse(message.start_time)||end-86400000;return Object.fromEntries((message.statistic_ids||[]).map(id=>[id,flags.empty?[]:Array.from({length:24},(_,i)=>({start:(start+(end-start)*i/24)/1000,end:(start+(end-start)*(i+1)/24)/1000,mean:100+i*5,min:80,max:300,sum:20+i*.4,state:20+i*.4}))]));}
    const helper=/^(input_select|timer)\/(list|create|update|delete)$/.exec(type);
    if(helper){const [,domain,operation]=helper,list=helpers[domain];if(operation==='list')return clone(list);if(operation==='create'){const id='docs_'+(++helperCount),{type:_,...data}=message,record={id,...data};list.push(record);const entity_id=domain+'.'+id;registry[entity_id]={entity_id,unique_id:id,platform:domain};write(entity_id,domain==='timer'?'idle':record.options[0],{friendly_name:record.name,...(record.options?{options:record.options}:{})});emit();return clone(record);}const id=message[domain+'_id'],index=list.findIndex(item=>item.id===id);if(index<0)throw new Error('Helper missing');if(operation==='delete'){list.splice(index,1);delete store[domain+'.'+id];delete registry[domain+'.'+id];}else{const {type:_,[domain+'_id']:ignored,...data}=message;list[index]={...list[index],...data};write(domain+'.'+id,store[domain+'.'+id]?.state||'paused',{options:list[index].options});}emit();return {};}
    if(type==='fire_event'&&message.event_type==='marao_schedule_request'){const request=message.event_data,record=records.get(controllerId(request.collection_id)),manifest=record?.variables?.marao_schedule;if(!manifest)throw new Error('Demo schedule collection missing');if(request.kind==='select')write(manifest.selection.entity_id,request.group);else if(request.kind==='stop'){const target=manifest.targets.find(t=>t.entity_id===request.target);if(!target)throw unsupported('schedule target');write(target.entity_id,target.entity_id.startsWith('valve.')?'closed':'off');write(target.mode.entity_id,'idle');write(target.timer.entity_id,'idle');}else throw unsupported('schedule request '+request.kind);emit();return {};}
    throw unsupported(type);
  }
  async function callApi(method,path,body) {
    await dataGuard(path);
    if(method==='GET'&&path.startsWith('history/period/')){const url=new URL(path,'https://marao.example'),end=Date.parse(url.searchParams.get('end_time'))||Date.now(),start=Date.parse(url.pathname.slice('/history/period/'.length))||end-86400000;return (url.searchParams.get('filter_entity_id')||'').split(',').map(id=>flags.empty?[]:Array.from({length:49},(_,i)=>{const seed=store[id]||{state:'0',attributes:{}};const numeric=Number(seed.state),time=new Date(start+(end-start)*i/48).toISOString();return {...clone(seed),entity_id:id,state:Number.isFinite(numeric)?String(Math.max(0,numeric*(.75+.2*Math.sin(i/4)))):i%6<3?'on':'off',last_changed:time,last_updated:time};}));}
    const automation=/^config\/automation\/config\/(.+)$/.exec(path);
    if(automation){const id=decodeURIComponent(automation[1]);if(method==='GET'){if(!records.has(id))throw Object.assign(new Error('Not found'),{status_code:404});return clone(records.get(id));}if(method==='POST'){records.set(id,clone(body));const entity='automation.'+id;write(entity,store[entity]?.state||(body.initial_state===false?'off':'on'),{id,friendly_name:body.alias});emit();return {}; }if(method==='DELETE'){records.delete(id);delete store['automation.'+id];emit();return {};}}
    throw unsupported(`${method} ${path}`);
  }
  function seedSchedules(){
    if(!config.group_id||!config.targets?.length||flags.empty||scenario.id==='setup')return;
    const id=config.group_id,selection={domain:'input_select',storage_id:'docs_selection',entity_id:'input_select.docs_selection',baseline:{id:'docs_selection',name:'Demo selection',options:['paused']}};
    helpers.input_select.push({...selection.baseline,options:['paused','morning']});write(selection.entity_id,'morning',{options:['paused','morning']});
    const bound=(config.targets||[]).map((entity_id,i)=>{const mode={domain:'input_select',storage_id:'docs_mode_'+i,entity_id:'input_select.docs_mode_'+i,baseline:{id:'docs_mode_'+i,name:'Demo mode',options:['idle','timed','on_only','stopping']}},timer={domain:'timer',storage_id:'docs_timer_'+i,entity_id:'timer.docs_timer_'+i,baseline:{id:'docs_timer_'+i,name:'Demo timer',duration:0,restore:true}};helpers.input_select.push(mode.baseline);helpers.timer.push(timer.baseline);write(mode.entity_id,'idle',{options:mode.baseline.options});write(timer.entity_id,'idle');return {entity_id,mode,timer};});
    const manifest={id,name:config.name||'Garden schedules',status:'ready',selection,targets:bound,groups:[{id:'morning',name:'Morning'}],schedules:[]};
    if(bound.length){const timer={id:'demo_timer',name:'Morning watering',timer_group_id:'morning',targets:bound.map(t=>t.entity_id),days:DAYS.slice(0,5),time:'07:30',stop_mode:'after_duration',duration_minutes:10},record=startConfig(timer,manifest),entity='automation.'+record.id;records.set(record.id,record);write(entity,'on',{id:record.id,friendly_name:record.alias});manifest.schedules.push({...record.variables.marao_schedule,automation_entity:entity,weekday_numbers:[0,1,2,3,4]});}
    const record=controllerConfig(manifest);records.set(record.id,record);write('automation.'+record.id,'on',{id:record.id,friendly_name:record.alias});
  }
  seedSchedules();
  return {get hass(){return hass;},get states(){return store;},dispose(){disposed=true;subscriptions.clear();},callService,callWS,callApi};
}
