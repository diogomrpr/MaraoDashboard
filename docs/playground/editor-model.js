import {parseDocument,stringify} from 'yaml';
import {patchPath,getPath,patchForm} from '../../frontend_src/editor-model.js';
import {validateNativeCardConfig} from '../../frontend_src/card-composition.js';
import {normalizeEventSources} from '../../custom_components/marao_dashboard/frontend/MaraoEventModel.js';
import {validateDashboardSettings} from '../../frontend_src/dashboard-settings.js';
export {getPath,patchPath};
export const toYaml=value=>stringify(value,{lineWidth:0});
export function editorDocument(config,example,previous={}){
  if(example.id!=='navbar')return structuredClone(config);
  const {type,dashboard_root,...navbar}=structuredClone(config);
  return {...structuredClone(previous),marao:{...structuredClone(previous.marao || {}),version:1,navbar}};
}
export function previewConfig(document,example){
  if(example.id!=='navbar')return document;
  validateDashboardSettings(document?.marao);
  return {type:example.config.type,dashboard_root:example.config.dashboard_root,...structuredClone(document.marao.navbar)};
}
export function fromYaml(text){
  const document=parseDocument(text,{uniqueKeys:true});
  if(document.errors.length)throw new Error(document.errors[0].message);
  if(document.warnings.length)throw new Error(document.warnings[0].message);
  return document.toJS({maxAliasCount:50});
}
export function validateDraft(config,example,states={}){
  if(!config || typeof config!=='object' || Array.isArray(config))throw new Error('Enter a card configuration object.');
  if(config.type!==example.config.type)throw new Error(`Keep type: ${example.config.type}. Choose another card from the catalog to change card type.`);
  if(config.type==='custom:marao-camera-events-card' || config.type==='custom:marao-frigate-events-card'){
    normalizeEventSources(config);
    for(const key of ['columns','limit'])if(config[key]!==undefined&&(!Number.isSafeInteger(config[key])||config[key]<1))throw new Error(`${key} must be a positive whole number.`);
  }else if(config.type==='custom:marao-navbar-card'){
    validateDashboardSettings({version:1,navbar:config});
  }else{
    validateNativeCardConfig(config,Object.entries(states).map(([entity_id,state])=>({entity_id,domain:entity_id.split('.')[0],state:state.state,name:state.attributes?.friendly_name || entity_id,...state.attributes})));
  }
  return config;
}
export function editField(config,field,value){
  if(value===undefined)return patchPath(config,field.path,undefined);
  if(['energy_precision','energy_unit'].includes(field.kind))return patchForm(config,[field],{[field.path]:getPath(config,field.path)},{[field.path]:value});
  if(field.kind==='number'){
    if(value==='')return patchPath(config,field.path,undefined);
    value=Number(value);if(!Number.isFinite(value))throw new Error('Enter a finite number.');
  }else if(field.kind==='boolean')value=Boolean(value);
  else if(['object','array','json','yaml','energy_sub_entities','sensor_thresholds','power_devices','vacuum_action','number_list'].includes(field.kind)&&typeof value==='string')value=fromYaml(value);
  return patchPath(config,field.path,value);
}
// Personal entity names retain the chosen fictional capability profile in this preview.
export function bindPreviewEntities(config,baseline,states){
  const result=structuredClone(states);
  const visit=(next,prior)=>{
    if(typeof next==='string'&&typeof prior==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(next)&&states[prior]&&!result[next]){
      result[next]={...structuredClone(states[prior]),entity_id:next};
    }else if(next&&prior&&typeof next==='object'&&typeof prior==='object'){
      for(const key of Object.keys(next))visit(next[key],prior[key]);
    }
  };
  visit(config,baseline);return result;
}
