// Fictional public examples. Never import a Home Assistant installation or its credentials.
const stamp = '2026-11-02T10:00:00.000Z';
const state = (entity_id, value, friendly_name, attributes = {}) => ({entity_id, state:String(value), attributes:{friendly_name,...attributes}, last_changed:stamp, last_updated:stamp, context:{id:'documentation',parent_id:null,user_id:null}});
const entries = [
  state('light.living_room','on','Living room',{brightness:180,color_mode:'rgb',supported_color_modes:['rgb','color_temp'],rgb_color:[255,190,100],hs_color:[34.8,60.8],color_temp_kelvin:3000,min_color_temp_kelvin:2000,max_color_temp_kelvin:6500,supported_features:40}),
  state('light.kitchen','off','Kitchen',{brightness:120,color_mode:'brightness',supported_color_modes:['brightness'],supported_features:0}),
  state('light.desk','on','Desk',{brightness:220,color_mode:'onoff',supported_color_modes:['onoff'],supported_features:0}),
  state('switch.desk','on','Desk plug'),state('switch.garden','off','Garden irrigation'),
  state('input_boolean.guest_mode','off','Guest mode'),state('input_boolean.holiday_lights','on','Holiday lights'),
  state('button.entry','unknown','Entry release'),state('script.entry','off','Entry release'),
  state('sensor.temperature','21.4','Living room temperature',{device_class:'temperature',unit_of_measurement:'°C',state_class:'measurement'}),
  state('sensor.humidity','48','Humidity',{device_class:'humidity',unit_of_measurement:'%',state_class:'measurement'}),
  state('sensor.air_quality','32','Air quality',{unit_of_measurement:'AQI',state_class:'measurement'}),
  state('sensor.house_power','1240','House power',{device_class:'power',unit_of_measurement:'W',state_class:'measurement'}),
  state('sensor.desk_power','85','Desk power',{device_class:'power',unit_of_measurement:'W',state_class:'measurement'}),
  state('sensor.kitchen_power','340','Kitchen power',{device_class:'power',unit_of_measurement:'W',state_class:'measurement'}),
  state('sensor.energy','6.8','House energy',{device_class:'energy',unit_of_measurement:'kWh',state_class:'total_increasing'}),
  state('sensor.kitchen_energy','2.1','Kitchen energy',{device_class:'energy',unit_of_measurement:'kWh',state_class:'total_increasing'}),
  state('sensor.battery','72','Door sensor battery',{device_class:'battery',unit_of_measurement:'%'}),
  state('sensor.battery_low','14','Window sensor battery',{device_class:'battery',unit_of_measurement:'%'}),
  state('binary_sensor.motion','off','Hall motion',{device_class:'motion'}),
  state('binary_sensor.door','off','Front door',{device_class:'door'}),
  state('cover.blind','open','Living room blind',{current_position:65,supported_features:15,device_class:'blind'}),
  state('cover.exhaust','closed','Exhaust valve',{current_position:0,supported_features:15,device_class:'damper'}),
  state('cover.garage','closed','Garage door',{current_position:0,supported_features:15,device_class:'garage'}),
  state('cover.entry','closed','Entry door',{supported_features:1,device_class:'door'}),
  state('lock.front_door','locked','Front door lock',{supported_features:1}),
  state('fan.bedroom','on','Bedroom fan',{percentage:50,percentage_step:25,supported_features:49,preset_modes:['quiet','normal','boost'],preset_mode:'normal'}),
  state('climate.living_room','heat','Living room thermostat',{hvac_modes:['off','heat','cool','heat_cool','auto','dry','fan_only'],hvac_action:'heating',current_temperature:20,temperature:22,target_temp_low:19,target_temp_high:24,min_temp:7,max_temp:30,target_temp_step:0.5,supported_features:387}),
  state('number.level','40','Target level',{min:0,max:100,step:5,unit_of_measurement:'%'}),
  state('number.charging_current','12','Charging current',{min:6,max:32,step:1,unit_of_measurement:'A'}),
  state('media_player.living_room','playing','Living room speaker',{media_title:'A morning at home',media_artist:'Marao demo',media_album_name:'Example recordings',media_duration:240,media_position:48,media_position_updated_at:stamp,volume_level:0.35,is_volume_muted:false,source:'Radio',source_list:['Radio','Music','TV','HBO Max','F1 TV'],supported_features:2097087}),
  state('remote.living_room','on','Living room remote'),
  state('vacuum.downstairs','docked','Downstairs vacuum',{battery_level:84,supported_features:13311,fan_speed:'standard',fan_speed_list:['quiet','standard','turbo']}),
  state('sensor.dishwasher','running','Dishwasher'),state('sensor.dishwasher_progress','42','Dishwasher progress',{unit_of_measurement:'%'}),
  state('sensor.dishwasher_remaining','35','Dishwasher remaining',{unit_of_measurement:'min'}),state('sensor.dishwasher_program','Eco','Active program'),
  state('binary_sensor.dishwasher_salt','off','Refill salt'),state('binary_sensor.dishwasher_rinse','off','Refill rinse aid'),
  state('sensor.washing_machine','running','Washing machine'),
  state('alarm_control_panel.home','disarmed','Home alarm',{supported_features:63,code_format:null,code_arm_required:false}),
  state('input_select.scene','Relax','Lighting scene',{options:['Relax','Reading','Movie']}),state('scene.evening','scening','Evening scene'),
  state('weather.home','partlycloudy','Home weather',{temperature:19,temperature_unit:'°C',humidity:62,wind_speed:12,wind_speed_unit:'km/h',supported_features:3}),
  state('sensor.station_temperature','15.7','Station temperature',{device_class:'temperature',unit_of_measurement:'°C'}),
  state('sensor.station_humidity','88','Station humidity',{device_class:'humidity',unit_of_measurement:'%'}),
  state('sensor.station_dew_point','13.7','Station dew point',{device_class:'temperature',unit_of_measurement:'°C'}),
  state('sensor.station_pressure','965.6','Station pressure',{device_class:'atmospheric_pressure',unit_of_measurement:'mbar'}),
  state('sensor.station_rain','86','Station rainfall',{unit_of_measurement:'mm'}),
  state('sensor.station_wind','0','Station wind speed',{unit_of_measurement:'m/s'}),
  state('sensor.station_gust','0.6','Station wind gust',{unit_of_measurement:'m/s'}),
  state('sensor.station_direction','295','Station wind direction',{unit_of_measurement:'°'}),
  state('sensor.station_lux','2260','Station illuminance',{device_class:'illuminance',unit_of_measurement:'lx'}),
  state('sensor.station_uv','0','Station UV index',{unit_of_measurement:'UV index'}),
  state('camera.front_door','idle','Front door',{supported_features:2,frontend_stream_type:'hls'}),
  state('camera.garden','idle','Garden',{supported_features:2,frontend_stream_type:'hls'}),
  state('camera.driveway','idle','Driveway',{supported_features:2,frontend_stream_type:'hls'}),
  state('person.alex','home','Alex',{user_id:'demo-user'}),state('person.sam','not_home','Sam',{user_id:'demo-sam'}),
  state('person.jules','Work','Jules'),state('person.taylor','unavailable','Taylor'),
  state('sensor.alex_area','Living room','Alex area',{area_id:'living_room'}),
  state('sensor.sam_area','Kitchen','Sam area',{area_id:'kitchen'}),
  state('valve.garden','closed','Garden valve',{current_position:0,supported_features:3}),
];
export const fixtureStates = Object.fromEntries(entries.map(entry => [entry.entity_id,entry]));
export const entityMetadata = entries.map(({entity_id,state,attributes})=>({entity_id,state,name:attributes.friendly_name,...attributes}));
export const demoDashboard = {title:'Marao example',views:[{path:'home',title:'Home',icon:'mdi:home'},{path:'living-room',title:'Living room',icon:'mdi:sofa'},{path:'kitchen',title:'Kitchen',icon:'mdi:silverware-fork-knife'},{path:'away',title:'Away',icon:'mdi:home-export-outline'}]};
export function scenarioStates(changes = {}) {
  const result = structuredClone(fixtureStates);
  for (const [id,change] of Object.entries(changes)) {
    if (change === null) {delete result[id];continue;}
    if (typeof change !== 'object') result[id] = {...result[id],state:String(change)};
    else result[id] = {...result[id],...change,attributes:{...result[id]?.attributes,...change.attributes}};
  }
  return result;
}
