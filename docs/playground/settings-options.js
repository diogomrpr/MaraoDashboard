import catalog from '../../custom_components/marao_dashboard/frontend/marao-catalog.json' with {type:'json'};
import labels from '../../custom_components/marao_dashboard/frontend/marao-generator-labels.json' with {type:'json'};
import {getPath} from './editor-model.js';
import {simulatedServices} from './simulation.js';
import {mediaAppLogoChoices} from '../../custom_components/marao_dashboard/frontend/MaraoMediaApps.js';

const named=value=>({value,label:String(value)});
export const choiceValue=value=>value && typeof value==='object'?value.entity_id:value;
export const structuredKinds=new Set(['object','array','json','yaml','energy_sub_entities','sensor_thresholds','power_devices','vacuum_action','number_list']);
const domainsFor=(field,example,config)=>{
  if(field.domains)return field.domains;
  if(field.path==='targets')return ['switch','valve','input_boolean'];
  if(field.path==='entities')return example.id==='md_people_card'?['person']:example.id==='md_scene_collection_card'?['scene','input_boolean']:example.id==='md_entity_group_card'?[config.entity_type==='battery'?'sensor':config.entity_type || 'light']:[];
  return [];
};

/** Choice hints never change configuration or discover a real HA installation. */
export function settingsChoices(field,{config={},states={},dashboard={},example={}}={}){
  const key=field.path.split('.').at(-1);
  if(field.kind==='app_logo'){const [automatic,...options]=mediaAppLogoChoices();return {emptyLabel:automatic.label,options};}
  if(field.kind==='icon'||key==='icon')return {icons:true,custom:true,options:[]};
  const entityList=field.multiple || field.path==='targets' || field.path==='entities'&&['md_people_card','md_scene_collection_card','md_entity_group_card'].includes(example.id);
  if(field.kind==='entity'||field.selector==='entity'||entityList){
    const domains=domainsFor(field,example,config),battery=example.id==='md_entity_group_card'&&config.entity_type==='battery'&&field.path==='entities';
    return {custom:true,multiple:Boolean(entityList),options:Object.values(states).filter(state=>(!domains.length||domains.includes(state.entity_id.split('.')[0]))&&(!battery||state.attributes?.device_class==='battery')).map(state=>({value:state.entity_id,label:state.attributes?.friendly_name || state.entity_id,detail:state.entity_id}))};
  }
  if(field.kind==='energy_unit'){
    const unit=states[config.entity_id]?.attributes?.unit_of_measurement,family=catalog.energy_units[unit]?.[0];
    return {emptyLabel:'Automatic',options:Object.keys(catalog.energy_units).filter(unit=>catalog.energy_units[unit][0]===family).map(named)};
  }
  if(field.kind==='energy_precision')return {emptyLabel:'Automatic',options:Array.from({length:7},(_,value)=>named(value))};
  if(field.kind==='energy_period')return {options:[{value:'day',label:'Day'},{value:'month',label:'Month'}]};
  if(key==='alarm_layout')return {clear:false,emptyLabel:'Dropdown',options:[{value:'dropdown',label:'Dropdown'},{value:'grid',label:'Grid'}]};
  if(field.options?.length)return {options:field.options.map(option=>typeof option==='object'?option:named(option))};
  if(example.id==='md_people_card'&&field.path==='columns')return {options:Array.from({length:6},(_,value)=>named(value+1))};
  if(key==='event_provider')return {options:[{value:'auto',label:'Automatic'},{value:'frigate',label:'Frigate'},{value:'unifi_protect',label:'UniFi Protect'},{value:'netatmo',label:'Netatmo'}]};
  if(field.path==='page'||field.path==='popup_view')return {custom:true,options:(dashboard.views || []).map(view=>({value:view.path,label:view.title || view.path,detail:view.path}))};
  if(key==='app_source')return {custom:true,options:(states[config.entity_id]?.attributes?.source_list || []).map(named)};
  if(key==='power_unit')return {custom:true,options:Object.keys(catalog.energy_units).filter(unit=>catalog.energy_units[unit][0]==='power').map(named)};
  if(key==='action_label_key')return {custom:true,options:Object.entries(labels.en).map(([value,label])=>({value,label,detail:value}))};
  if(key==='action_service'){
    const domain=config.entity_id?.split('.')[0];
    return {custom:true,options:[...Object.keys(simulatedServices[domain] || {}).map(service=>`${domain}.${service}`),...Object.keys(simulatedServices.homeassistant).map(service=>`homeassistant.${service}`)].map(named)};
  }
  if(['frigate_camera','frigate_instance_id','unifi_protect_media_source'].includes(key)){
    const values=new Set((example.scenarios || []).map(scenario=>getPath(scenario.config,field.path)).filter(value=>typeof value==='string'&&value));
    if(key==='frigate_camera')for(const id of Object.keys(states).filter(id=>id.startsWith('camera.')))values.add(id.split('.')[1]);
    return {custom:true,options:[...values].map(named)};
  }
  if(field.kind==='number_list'){
    const {min,max,step=1}=states[config.entity_id]?.attributes || {},count=Math.floor((max-min)/step)+1;
    return {multiple:true,custom:true,numeric:true,options:Number.isFinite(count)&&step>0&&count>0&&count<=100?Array.from({length:count},(_,i)=>named(Number((min+i*step).toFixed(6)))):[]};
  }
  return null;
}

export function filterChoices(options,query,limit=80){
  const words=query.toLowerCase().trim().split(/[\s:_-]+/).filter(Boolean);
  const matches=options.filter(option=>words.every(word=>`${option.label} ${option.value} ${option.detail || ''}`.toLowerCase().includes(word)));
  const needle=query.toLowerCase().trim();
  if(needle){
    const rank=option=>{
      const values=[String(option.value).toLowerCase(),String(option.value).split(':').at(-1).toLowerCase(),option.label.toLowerCase()];
      return values.includes(needle)?0:values.some(value=>value.startsWith(needle))?1:2;
    };
    matches.sort((a,b)=>rank(a)-rank(b));
  }
  return {options:matches.slice(0,limit),total:matches.length};
}

export function toggleChoice(current,value){
  const selected=Array.isArray(current)?current:[];
  return selected.some(item=>choiceValue(item)===value)?selected.filter(item=>choiceValue(item)!==value):[...selected,value];
}
