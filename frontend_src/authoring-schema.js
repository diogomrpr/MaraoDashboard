import {catalog} from './native-model.js';
import {NATIVE_CARD_TYPES} from './card-composition.js';
import {nativeCardDefaults} from './native-cards.js';
import {legacyTemplates} from '../custom_components/marao_dashboard/frontend/MaraoNames.js';
import {cards as documentedCards} from '../docs/examples/manifest.js';

const text={type:['string','null']},object={type:['object','null'],additionalProperties:true};
const entity={type:'string',description:'Use an explicitly selected existing entity; no discovery or retargeting.'};
const currentRoom={type:'object',properties:{enabled:{type:'boolean'},people:{type:'object',additionalProperties:{type:'object',required:['area_sensor'],properties:{area_sensor:{type:'string'}},additionalProperties:true}},rooms:{type:'object',additionalProperties:{type:'object',required:['path'],properties:{path:{type:'string'}},additionalProperties:true}},away_path:{type:'string'}},additionalProperties:true};
const members={type:'array',items:{anyOf:[entity,{type:'object',required:['entity_id'],properties:{entity_id:entity,name:text,icon:text},additionalProperties:true}]}};
function fieldSchema(field) {
  const kind=field.kind;
  let value=kind==='boolean'?{type:['boolean','null']}:kind==='number'?{type:['number','null']}:
    ['number_list','energy_sub_entities','power_devices','sensor_thresholds'].includes(kind)?{type:'array',items:kind==='number_list'?{type:'number'}:{type:'object',additionalProperties:true}}:
    kind==='vacuum_action'?{anyOf:[text,object]}:kind==='json'?{}:{...text};
  if(kind==='select'&&field.options?.length)value={enum:field.options.map(option=>typeof option==='object'?option.value:option).concat(null)};
  if(field.key==='activity_entities')return {type:'array',items:{type:'string',pattern:'^[a-z_]+\\.[a-z0-9_]+$'},description:field.label};
  if(field.key==='climate_entity')value={type:['string','null'],pattern:'^(?:climate\\.[a-z0-9_]+)?$'};
  if(field.multiple)value={type:'array',items:value};
  return {...value,description:field.description||field.label||field.key,...(field.domains?{'x-entity-domains':field.domains}:{})};
}
const common={name:text,icon:text,entity_id:entity,entity,variables:object,popup_view:{type:'string',pattern:'^[a-z0-9][a-z0-9_-]*$'},grid_options:object,visibility:{type:'array'},tap_action:object,hold_action:object,double_tap_action:object,cards:{type:'array',items:{$ref:'#/$defs/card'}},card:{$ref:'#/$defs/card'}};
function cardShape(entry,docs) {
  const properties={...common,type:{const:NATIVE_CARD_TYPES[entry.id]},template:{const:entry.id}};
  if(!entry.domains.length){delete properties.entity_id;delete properties.entity;}
  const variables=Object.fromEntries(entry.variables.map(field=>[field.key,fieldSchema(field)]));
  for(const field of docs?.fields||[]) {
    if(field.path.startsWith('variables.'))variables[field.path.slice(10)]||=fieldSchema(field);
    else properties[field.path]||=fieldSchema(field);
  }
  if(entry.entity_group||entry.scene_collection||entry.people)properties.entities=members;
  if(entry.entity_group)Object.assign(properties,{id:{type:'string'},entity_type:{enum:['light','cover','battery','climate']},popup_filter:{enum:['active','all']},summary_sections:{type:'array',items:{type:'object',additionalProperties:true}}});
  if(['md_media_card','md_plex_library_card'].includes(entry.id))properties.apple_tv={...properties.apple_tv,properties:{plex:{properties:{display:{enum:['inline','popup'],default:'inline'}}}}};
  if(entry.people)properties.columns={type:'integer',minimum:1,maximum:6};
  if(entry.schedules)Object.assign(properties,{group_id:{type:'string'},targets:{type:'array',items:entity}});
  properties.variables={...object,properties:variables};
  const defaults=nativeCardDefaults(entry.id);
  for(const [key,value]of Object.entries(defaults.variables||{}))if(variables[key])variables[key].default=value;
  return {type:'object',required:['type'],...(entry.domains.length&&!entry.entity_optional?{anyOf:[{required:['entity_id']},{required:['entity']}]}:{}),properties,additionalProperties:true};
}
export function buildAuthoringMetadata(packageVersion) {
  const cards=catalog.cards.map(entry=>{
    const docs=documentedCards.find(card=>card.id===entry.id);
    return {type:NATIVE_CARD_TYPES[entry.id],template:entry.id,title:entry.label,description:entry.description,internal:Boolean(entry.hidden),domains:entry.domains,device_classes:entry.device_classes||[],effective_defaults:nativeCardDefaults(entry.id),
      ...(docs?{documentation_url:`https://diogomrpr.github.io/MaraoDashboard/cards/${docs.slug}/`,examples:[docs.config],notes:docs.notes}:{}),schema:cardShape(entry,docs)};
  });
  for(const id of ['camera-events','navbar']) {
    const docs=documentedCards.find(card=>card.id===id),properties={type:{const:docs.config.type},...common};
    for(const field of docs.fields)properties[field.path]||=fieldSchema(field);
    if(id==='camera-events')Object.assign(properties,{cameras:{type:'array',items:{type:'object',required:['entity'],properties:{entity},additionalProperties:true}},columns:{type:'integer',minimum:1},limit:{type:'integer',minimum:1,maximum:100}});
    else Object.assign(properties,{routes:{type:'array',items:{type:'object',required:['label'],properties:{path:text,url:text,label:text,icon:text},additionalProperties:true}},current_room:currentRoom});
    cards.push({type:docs.config.type,title:docs.title,domains:docs.domains,documentation_url:`https://diogomrpr.github.io/MaraoDashboard/cards/${docs.slug}/`,examples:[docs.config],notes:docs.notes,schema:{type:'object',required:['type'],properties,additionalProperties:true}});
  }
  const generic=catalog.cards.map(entry=>{
    const native=cards.find(card=>card.template===entry.id);
    return {...native.schema,required:['type','template'],properties:{...native.schema.properties,type:{const:'custom:marao-card'},template:{enum:[entry.id,...Object.keys(legacyTemplates).filter(key=>legacyTemplates[key]===entry.id)]}}};
  });
  for(const role of ['popup','navbar'])generic.push({type:'object',required:['type','template'],properties:{type:{const:'custom:marao-card'},template:{enum:['md_'+role+'_card','hc_'+role+'_card']}},additionalProperties:true});
  cards.push({type:'custom:marao-card',title:'Generic Marao card',aliases:legacyTemplates,schema:{anyOf:generic}});
  for(const type of ['custom:marao-popup-card','custom:marao-summary-actions','custom:marao-control-grid','custom:marao-power-history-card','custom:marao-state-timeline-card','custom:marao-energy-period-card','custom:marao-frigate-events-card','custom:marao-slide-to-open'])cards.push({type,title:'Runtime component',internal:true,notes:['Preserve existing configuration. Managed functional controls belong to their parent.'],schema:{type:'object',required:['type'],properties:{type:{const:type}},additionalProperties:true}});
  const navbar=cards.find(card=>card.type==='custom:marao-navbar-card').schema;
  const settings={type:'object',required:['version','navbar'],properties:{version:{const:1},navbar:{...navbar,required:['routes'],properties:{routes:navbar.properties.routes,current_room:currentRoom}},show_cache_reset:{type:'boolean'},show_editor_button:{type:'boolean'}},additionalProperties:true};
  const definitions=Object.fromEntries(cards.map((card,index)=>['card'+index,card.schema]));
  const ownedCard={anyOf:cards.map((card,index)=>({$ref:'#/$defs/card'+index}))};
  // Unknown native/custom cards remain valid and opaque. Marao typos cannot use that branch.
  const card={anyOf:[ownedCard,{type:'object',properties:{type:{type:'string',not:{pattern:'^custom:marao-'}}},additionalProperties:true}]};
  const view={type:'object',properties:{path:{type:'string'},cards:{type:'array',items:{$ref:'#/$defs/card'}},sections:{type:'array',items:{type:'object',properties:{cards:{type:'array',items:{$ref:'#/$defs/card'}}},additionalProperties:true}},marao_popup:{type:'object',readOnly:true,properties:{version:{const:1}},additionalProperties:true}},additionalProperties:true};
  return {authoring_contract:1,package_version:packageVersion,cards,settings,schema:{$schema:'https://json-schema.org/draft/2020-12/schema',title:'Marao ordinary Home Assistant dashboard',description:'Native configuration; runtime cross-field validation remains authoritative. Unknown fields are preserved.',type:'object',required:['views'],properties:{marao:{$ref:'#/$defs/settings'},views:{type:'array',items:{$ref:'#/$defs/view'}}},additionalProperties:true,$defs:{...definitions,settings,card,view}}};
}
