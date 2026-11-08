import {generatedPopupView,managedDescriptor} from './popup-management.js';
import {nativeCardType,validateNativeCardConfig} from './card-composition.js';
import {resolvePopupView,popupHash,popupEditorSource,canonicalLayout,nativePopupCard,popupRole,seedPopupView,popupCardPath} from '../custom_components/marao_dashboard/frontend/MaraoPopupLayout.js';
import {managedPopupError} from '../custom_components/marao_dashboard/frontend/MaraoPopupManaged.js';
import {validatePopupContent} from '../custom_components/marao_dashboard/frontend/MaraoPopupContent.js';

const copy=value=>structuredClone(value);
export const POPUP_TEMPLATES=Object.freeze([
  {id:'empty',label:'Empty'},
  ...['light','cover','battery','climate'].map(kind=>({id:'group-'+kind,label:({light:'Lights',cover:'Covers',battery:'Batteries',climate:'Climate group'})[kind],template:'md_entity_group_card',kind,domains:kind==='battery'?['sensor']:[kind],multiple:true})),
  {id:'scenes',label:'Scene Collection',template:'md_scene_collection_card',domains:['scene','switch','input_boolean'],multiple:true},
  ...[['climate','Climate','climate'],['media','Media','media_player'],['camera','Camera','camera'],['energy','Energy Period','sensor'],['graph','Graph history','sensor'],['security','Security','alarm_control_panel'],['access','Access','lock','cover'],['floor-plan','Floor Plan lighting','light']].map(([id,label,...domains])=>({id,label,template:({energy:'md_energy_period_card',graph:'md_graph_card',security:'md_security_card','floor-plan':'md_floor_plan_card'})[id]||'md_'+id+'_card',domains,multiple:id==='floor-plan'}))
]);

export function popupTemplatesFor(parent) {
  const owner=managedDescriptor(parent);
  return [...POPUP_TEMPLATES.filter(entry=>entry.template&&entry.template===owner.template&&(!entry.kind||entry.kind===(owner.entity_type||'light'))).map(entry=>entry.id==='access'?{...entry,label:(owner.entity_id||'').startsWith('lock.')?'Unlock slider and lock button':'Opening slider and close button'}:entry),POPUP_TEMPLATES[0]];
}

export function popupContentIdentity(content) {
  return canonicalLayout({layout:content?.layout,...(content?.presentation&&Object.keys(content.presentation).length?{presentation:content.presentation}:{})});
}

export function matchingPopupTemplate(content,candidates) {
  const identity=popupContentIdentity(content);
  return [...candidates].find(([,candidate])=>popupContentIdentity(candidate)===identity)?.[0]||'custom';
}

export function independentPopupLayout(source,sourcePath) {
  const issue=managedPopupError(source);if(issue)throw new Error(issue);
  if(source.type!=='sections'||source.strategy||!Array.isArray(source.sections))throw new Error('Popup layout must use a native Sections view.');
  const layout=copy(source);
  for(const key of ['path','subview','back_path','marao_popup'])delete layout[key];
  const visit=card=>{
    delete card.marao_popup_slot;
    if(card.type==='custom:marao-summary-actions'&&card.popup_view===sourcePath){delete card.popup_view;card.popup_scope='embedded';}
    for(const child of card.cards || [])visit(child);
    if(card.card)visit(card.card);
  };
  for(const section of layout.sections)for(const card of section.cards || [])visit(card);
  validatePopupContent({popup_content:{version:1,mode:'custom',layout}});
  return layout;
}
export function popupTemplateCandidate(parent,id,bindings={},context={}) {
  const entry=POPUP_TEMPLATES.find(value=>value.id===id);if(!entry)throw new Error('Choose a popup template.');
  if(id==='empty')return {version:1,mode:'custom',template:id,layout:{type:'sections',max_columns:1,sections:[]}};
  const original=managedDescriptor(parent),same=original.template===entry.template;
  const owner=same?copy(original):{template:entry.template};
  delete owner.popup_content;delete owner.popup_view;
  if(owner.variables)for(const key of ['popup_hash','mode_selector_hash','lights_popup'])delete owner.variables[key];
  owner.type=nativeCardType(entry.template);if(!same||entry.kind)owner.name||=entry.label;
  const values=bindings.entities ?? (entry.multiple?(entry.id==='floor-plan'?original.variables?.lights:same?original.entities:[]):[same?original.entity_id:undefined]);
  const configured=original.template===entry.template?(entry.id==='floor-plan'?original.variables?.lights:original.entities)||[]:[];
  const entities=(values||[]).map(value=>{const item=typeof value==='string'?{entity_id:value}:copy(value);const saved=configured.find(member=>(typeof member==='string'?member:member.entity_id)===item.entity_id);return {...(saved&&typeof saved==='object'?copy(saved):{}),...item};}).filter(value=>value.entity_id);
  if(!entities.length)throw new Error('Choose compatible entities for this template.');
  if(entities.some(value=>!entry.domains.includes(value.entity_id.split('.')[0])))throw new Error('Choose compatible entities for this template.');
  if(entry.kind)Object.assign(owner,{id:owner.id||'group',entity_type:entry.kind,entities,popup_filter:owner.popup_filter||'all'});
  if(entry.kind&&owner.summary_sections){const ids=new Set(entities.map(value=>value.entity_id));owner.summary_sections=owner.summary_sections.map(section=>({...section,entities:(section.entities||[]).filter(id=>ids.has(id))}));}
  else if(entry.id==='scenes')owner.entities=entities;
  else if(entry.id==='floor-plan')owner.variables={...owner.variables,lights:entities.map((value,index)=>({...value,id:value.id||'light-'+index,x:value.x??50,y:value.y??50})),...(bindings.image_id?{image_id:bindings.image_id}:{})};
  else if(!entry.kind)owner.entity_id=entities[0].entity_id;
  if(!popupRole(owner)){
    if(entry.id==='climate')owner.variables={...owner.variables,enable_popup:true};
    if(entry.id==='graph')owner.variables={...owner.variables,history_popup:true};
    if(entry.id==='media')owner.variables={...owner.variables,media_display:'popup'};
    if(entry.id==='security')delete owner.tap_action;
    if(entry.id==='access')owner.variables={...owner.variables,access_mode:'popup'};
  }
  validateNativeCardConfig(owner,context.entities||[]);
  const view=generatedPopupView(owner,'embedded-template','',context);
  if(!view)throw new Error('This card has no editable popup.');
  return {version:1,mode:'custom',template:id,layout:independentPopupLayout(view,'embedded-template')};
}

/** Prepare an immutable candidate; acceptance rechecks the actual source, never writes it. */
export function preparePopupCopy(parent,dashboard,currentPath,context={}) {
  const opener=copy(parent);delete opener.popup_content;
  let source,identity,standalonePath;
  if(opener.type==='custom:marao-popup-card'&&dashboard?.views)try{standalonePath=popupCardPath(dashboard,context.sourceOpener||parent,currentPath);}catch(error){if(!error.message.startsWith('The invoking card'))throw error;}
  const resolve=document=>{
    if(opener.type==='custom:marao-popup-card'&&!opener.popup_view)return opener;
    if(opener.popup_view)return resolvePopupView(document,opener.popup_view).view;
    if(popupHash(opener)){
      const identity=context.sourceOpener||parent;
      if(popupHash(identity)!==popupHash(opener))throw new Error('Popup source changed. Preview the copy again.');
      return popupEditorSource(document,identity,currentPath).popup;
    }
    return generatedPopupView(opener,'embedded-copy','',context);
  };
  source=resolve(dashboard);
  if(!source)throw new Error('Popup source is missing or ambiguous.');
  identity=canonicalLayout(source);
  let view=source;
  if(source.type==='custom:marao-popup-card') {
    if(source.popup_view)view=resolvePopupView(dashboard,source.popup_view).view;
    else if(source.entity_group)view=seedPopupView(source,'embedded-copy','',context.hass);
    else view={type:'sections',title:source.name,max_columns:1,sections:[{type:'grid',cards:(source.cards||[]).map(card=>nativePopupCard(card))}]};
  }
  const viewIdentity=canonicalLayout(view),linked=source.popup_view;
  const presentation=Object.fromEntries(['height','max_height','icon','show_icon','show_name','show_state','entity'].filter(key=>Object.hasOwn(source,key)).map(key=>[key,copy(source[key])]));
  const content={version:1,mode:'custom',...(Object.keys(presentation).length?{presentation}:{}),layout:independentPopupLayout(view,opener.popup_view||linked||'embedded-copy')};
  return {content,accept(document){
    if(standalonePath&&canonicalLayout(popupCardPath(document,context.sourceOpener||parent,currentPath))!==canonicalLayout(standalonePath))throw new Error('Popup source changed. Preview the copy again.');
    const current=resolve(document);
    if(canonicalLayout(current)!==identity||linked&&canonicalLayout(resolvePopupView(document,linked).view)!==viewIdentity)throw new Error('Popup source changed. Preview the copy again.');
    return copy(content);
  }};
}

export function editPopupLayout(content,operation) {
  validatePopupContent({popup_content:content});const next=copy(content);operation(next.layout);validatePopupContent({popup_content:next});return next;
}
