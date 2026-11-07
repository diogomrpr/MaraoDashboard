import {createSettingsRow,SETTINGS_ROW_CSS} from './settings-row.js';
import {loadLovelaceEditor} from './lovelace-loader.js';
import {renderPopupContent} from './popup-content-editor.js';
import {renderEventEditor} from './event-card-editor.js';
import {nativeDashboardConfig,findNativeEditorContext} from '../custom_components/marao_dashboard/frontend/MaraoNativeContext.js';
import {popupRole,popupHash,popupLabel,resolvePopupView,popupViewError,canonicalLayout,savePopupLayout} from '../custom_components/marao_dashboard/frontend/MaraoPopupLayout.js';
import catalog from '../custom_components/marao_dashboard/frontend/marao-catalog.json' with {type:'json'};
import {cardFormMethods} from './card-form-tools.js';
import {PT_LABELS, MOVE_PT_LABELS} from './editor-labels.js';
import {clone, canonicalTemplate, cardForEntity, cameraTitleFields, formData, patchForm, sameFormValue, entityMeta, flattenEntities, mergeEntityValues, newEntityGroupId, entityGroupMemberCompatible, validateConfig} from './editor-model.js';
import {openFloorPlanEditor} from './floor-plan-editor.js';
import {templateForNativeType} from './card-composition.js';
import {planPopupEdit} from './popup-management.js';
import {managedChildContext,detachManagedPopupCard,popupPresentationVariable,popupOwners} from '../custom_components/marao_dashboard/frontend/MaraoPopupManaged.js';

const Base = globalThis.HTMLElement || class {};
const own = (value,key) => Object.hasOwn(value || {},key);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const commonAppearance=[['show_name','Show name',true],['show_icon','Show icon',true],['show_state','Show state',true],['show_label','Show label',true]];
const commonActions=['tap_action','hold_action','double_tap_action'];
const runtimeAliases={'custom:marao-state-timeline-card':'md_timeline_card','custom:marao-energy-period-card':'md_energy_period_card','custom:marao-power-history-card':'md_graph_card'};
const legacySummaries=new Set(['md_blinds_popup_card','md_climate_popup_card','md_lights_popup_card','md_maintenance_popup_card','md_bubble_popup_card','hc_bubble_popup_card','hc_slider_card']);
const energyKeys=['period','display_unit','display_precision','sub_entities','calculate_cost','cost_per_kwh'];
const primitiveKeys=config=>config.type==='custom:marao-energy-period-card'?energyKeys:config.type==='custom:marao-power-history-card'?['power_devices','display_unit','display_precision','graph_color']:[];
const simpleAppearance=card=>!['md_energy_period_card','md_timeline_card','md_people_card','md_schedules_card','md_floor_plan_card'].includes(card.id);
const editorCard=card=>card?{...card,variables:[...(simpleAppearance(card)?catalog.common_variables||[]:[]).filter(field=>!card.variables.some(item=>item.key===field.key)),...card.variables]}:card;

const WORDS = {add:'Add',delete:'Delete',edit:'Edit',update:'Update',create:'Create',cancel:'Cancel',advanced:'Advanced options',searchEntities:'Search by name or entity ID',noResults:'No compatible entities match your search.',unknown:'Unknown',unavailable:'Unavailable'};

export function nativeConfigToDescriptor(config) {
  const result=clone(config || {});
  result.template=canonicalTemplate(result.template || templateForNativeType(result.type) || runtimeAliases[result.type] || (result.type==='custom:marao-card'?'md_base_card':''));
  if(legacySummaries.has(result.template))result.template='md_base_card';
  const service=result.variables?.action_service,domain=(result.entity_id||result.entity||'').split('.')[0];
  if((result.variables?.access_mode??'auto')==='auto'){
    if(result.template==='md_access_action_card'&&service===({lock:'lock.unlock',cover:'cover.open_cover'})[domain]&&service)result.template='md_access_slide_action_card';
  }
  if(primitiveKeys(result).length)result.variables={...result.variables,...Object.fromEntries(primitiveKeys(result).filter(key=>own(result,key)).map(key=>[key,clone(result[key])]))};
  if(!result.entity_id && result.entity)result.entity_id=result.entity;
  return result;
}

export function nativeCardFormData(config, card) {
  card=editorCard(card);
  const normalized=nativeConfigToDescriptor(config);
  const data={entity_id:config.entity_id || config.entity || '',name:config.name || '',icon:config.icon || '',page:config.page || '',popup_view:config.popup_view || ''};
  for(const [key,,fallback]of commonAppearance)data[key]=config[key]??config.variables?.[key]??fallback;
  for(const key of [...commonActions,'popup'])data[key]=clone(config[key]);
  if(card.id==='md_camera_card')Object.assign(data,formData(config,cameraTitleFields()));
  for(const field of cardFormMethods._expandedFields(card.variables || []))data[`var__${field.key}`]=cardFormMethods._readVariable(normalized.variables,field);
  if(card.scene_collection || card.people)data.scene_entities=flattenEntities(config.entities || []).map(item=>item.entity_id);
  if(card.people)data.columns=config.columns ?? 1;
  return data;
}

// Patch only fields that actually changed; native layout, actions and opaque data stay owned by HA.
export function patchNativeCard(config, card, previous, next) {
  card=editorCard(card);
  let result=clone(config);
  for(const key of [...commonAppearance.map(([key])=>key),...commonActions,'popup'])if(!sameFormValue(previous[key],next[key])){if(next[key]===undefined||next[key]===null||next[key]==='')delete result[key];else result[key]=clone(next[key]);}
  if(card.people && !sameFormValue(previous.columns,next.columns))result.columns=next.columns;
  for(const key of ['entity_id','name','icon','page','popup_view']) {
    if(sameFormValue(previous[key],next[key]))continue;
    const target=key==='entity_id' && own(config,'entity') && !own(config,'entity_id')?'entity':key;
    if(next[key])result[target]=next[key];else delete result[target];
    if(key==='name')delete result.name_key;
  }
  if(card.id==='md_camera_card')result=patchForm(result,cameraTitleFields(),previous,next);
  const variables=clone(result.variables || {});
  for(const field of cardFormMethods._expandedFields(card.variables || [])) {
    const key=`var__${field.key}`;
    if(!sameFormValue(previous[key],next[key])){
      if(primitiveKeys(config).includes(field.key)){const staged={};cardFormMethods._writeVariable(staged,field,next[key]);if(own(staged,field.key))result[field.key]=staged[field.key];else delete result[field.key];}
      else cardFormMethods._writeVariable(variables,field,next[key]);
    }
  }
  for(const [key]of commonAppearance)if(!own(config,key)&&own(config.variables,key)&&!sameFormValue(previous[key],next[key])){delete result[key];variables[key]=next[key];}
  if(Object.keys(variables).length || own(config,'variables'))result.variables=variables;
  return result;
}

export function controlGridEditorValue(config) {
  if(!config.groups)return {...clone(config),type:'grid',columns:config.columns??2,square:false};
  let offset=0;
  return {type:'vertical-stack',cards:config.groups.map(group=>{const cards=clone(config.cards.slice(offset,offset+group.count));offset+=group.count;return {...clone(group),type:'grid',square:false,cards};})};
}
export function patchControlGrid(config,value) {
  // shortcut: legacy control grids keep adaptive geometry; use native Grid for square cells or grid titles.
  const grids=config.groups?value.cards:[value];
  if(grids?.some(grid=>grid.square===true||grid.title))throw new Error('Use a native Grid card for square cells or a grid title.');
  const next=clone(config);
  if(config.groups) {
    if(value.type!=='vertical-stack'||!Array.isArray(value.cards)||value.cards.some(group=>group.type!=='grid'||!group.cards?.length))throw new Error('Keep a grid for each control group.');
    next.cards=value.cards.flatMap(group=>clone(group.cards));
    next.groups=value.cards.map(({type,square,cards,...group})=>({...clone(group),columns:group.columns||1,count:cards.length}));
  }else {
    if(value.type!=='grid'||!Array.isArray(value.cards))throw new Error('Use a native Grid card.');
    next.cards=clone(value.cards);if(own(config,'columns')||value.columns!==2)next.columns=value.columns||2;
  }
  if(config.native_cards?.length){
    const indices=config.native_cards.map(index=>{const source=canonicalLayout(config.cards[index]),matches=next.cards.flatMap((card,i)=>canonicalLayout(card)===source?[i]:[]);if(matches.length!==1)throw new Error('Edit marked raw cards in YAML to preserve their ownership.');return matches[0];});
    next.native_cards=indices;
  }
  if(!Number.isInteger(next.columns??2)||(next.columns??2)<1||(next.columns??2)>6||next.groups?.some(group=>!Number.isInteger(group.columns)||group.columns<1||group.columns>6))throw new Error('Use content cards and one to six columns.');
  return next;
}

export class MaraoCardEditor extends Base {
  constructor() {
    super();this.attachShadow?.({mode:'open'});this._catalog=catalog;this._contextReady=true;this._busy=false;
    this._lifecycle=0;this._documentEpoch=0;this._revision=0;this._labelModule={PT_LABELS,MOVE_PT_LABELS};this.lovelace=null;
    this.shadowRoot?.addEventListener('click',event=>{const button=event.target.closest?.('button[data-action]');if(button&&!button.disabled&&/^(scene-|app-)/.test(button.dataset.action))this._moveHaptic();});
  }
  setConfig(config) {
    const text=JSON.stringify(config);
    if(text===JSON.stringify(this._config))return;
    this._popupExpanded=false;this._config=clone(config);this._popupCopyOrigin=clone(config);this._documentEpoch++;this._revision=0;this._popupSaved=null;this._popupUncertain=false;
    this._installModel();this._render();
  }
  set hass(value) {
    const language=this._hass?.language,admin=this._hass?.user?.is_admin;this._hass=value;
    this._entities=Object.entries(value?.states || {}).map(([entity_id,state])=>({entity_id,domain:entity_id.split('.')[0],state:state.state,name:state.attributes?.friendly_name || entity_id,...state.attributes}));
    this.shadowRoot?.querySelectorAll('ha-form').forEach(form=>{form.hass=value;});
    this.shadowRoot?.querySelectorAll('marao-native-card-editor, hui-card-element-editor').forEach(editor=>{editor.hass=value;});
    if(this._config && (!this._mounted || language!==value?.language))this._render();
    else if(admin!==value?.user?.is_admin)this._renderPopupSelector();
    this._popupInline?.update();
    if(this._popupEditButton)this._popupEditButton.disabled=Boolean(this._popupBusy||this._popupUncertain||!value?.user?.is_admin||value.connected===false||value.connection?.connected===false);
  }
  get hass(){return this._hass;}
  set lovelace(value) {
    const previous=nativeDashboardConfig(this._lovelace),next=nativeDashboardConfig(value);
    this._lovelace=value;
    if(this._config&&this._hass){if(previous!==next&&canonicalLayout(previous)!==canonicalLayout(next))this._render();else this._renderPopupSelector();}
    const form=this.shadowRoot?.querySelector('[data-basic] ha-form');
    if(!form?.schema?.some(field=>field.name==='page'))return;
    const pages=this._availablePages(),current=form.data?.page;
    if(current&&!pages.some(page=>page.path===current))pages.push({path:current,name:current});
    const options=pages.map(page=>({value:page.path,label:page.name}));
    form.schema=form.schema.map(field=>field.name==='page'?{...field,selector:{select:{mode:'dropdown',options}}}:field);
  }
  get lovelace(){return this._lovelace;}
  connectedCallback(){this._lifecycle++;if(this._config && !this._mounted)this._render();}
  disconnectedCallback(){this._popupInline?.dispose();this._lifecycle++;this._activityEvents?.abort();this.shadowRoot?.querySelectorAll('ha-dialog').forEach(dialog=>{dialog.open=false;});}
  _installModel() {
    this._containerModel={entities:[nativeConfigToDescriptor(this._config)]};
    this._model={name:'Card',config_version:2,landing_page:'home',pages:[{name:'Home',path:'home',...this._containerModel}]};
    this._model.pages[0]=this._containerModel;
  }
  _selected() {
    const descriptor=nativeConfigToDescriptor(this._config), metadata=entityMeta(this._entities || [],descriptor.entity_id);
    let card=editorCard(catalog.cards.find(card=>card.id===descriptor.template) || cardForEntity(catalog,metadata || descriptor));
    if(card&&legacySummaries.has(this._config.template)&&descriptor.entity_id)card={...card,domains:[...new Set([...card.domains,descriptor.entity_id.split('.')[0]])]};
    if(card&&this._config.type==='custom:marao-power-history-card')card={...card,variables:card.variables.filter(field=>primitiveKeys(this._config).includes(field.key))};
    if(card&&this._config.type==='custom:marao-state-timeline-card')card={...card,variables:[]};
    return card;
  }
  _l(label) {return String(this._hass?.language || '').startsWith('pt')?(MOVE_PT_LABELS[label] || PT_LABELS[label] || PT_LABELS[label+'.']?.replace(/\.$/,'') || popupLabel(label,this._hass)):label;}
  _t(key){return this._l(WORDS[key] || key);}
  _error(error){return this._l(String(error?.message || error));}
  _setStatus(message){const node=this.shadowRoot?.querySelector('[data-status]');if(node)node.textContent=message || '';}
  _moveHaptic(){this.dispatchEvent(new CustomEvent('haptic',{detail:'heavy',bubbles:true,composed:true}));}
  _focusWithoutScroll(target){target?.focus?.({preventScroll:true});}
  _container(){return this._containerModel;}
  _editableContainer(){return this._containerModel;}
  _refreshCards(){}
  _setDirty(){this._commitDescriptor(this._containerModel.entities[0]);}
  _commitDescriptor(descriptor) {
    const next=clone(descriptor);
    // Descriptors used by specialized editors carry no extra source-model flags.
    delete next.__simple;
    if(!own(this._config,'entity_id') && own(this._config,'entity') && own(next,'entity_id')) {next.entity=next.entity_id;delete next.entity_id;}
    if(!own(this._config,'template') && next.template==='')delete next.template;
    if(JSON.stringify(next)===JSON.stringify(this._config))return;
    this._config=next;this._containerModel.entities[0]=nativeConfigToDescriptor(next);
    this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:clone(next),error:this._popupInline?.invalidMessage||undefined},bubbles:true,composed:true}));
  }
  _availablePages() {
    const views=nativeDashboardConfig(this.lovelace)?.views || [];
    return views.map((view,index)=>({path:String(view.path ?? index),name:view.title || String(view.path ?? index)}));
  }
  _validateDescriptor(descriptor) {
    // The shared validator checks card semantics; native outer layout stays outside this source view.
    const error=popupViewError(descriptor);if(error)return [error];
    const card=clone(descriptor);delete card.type;if(card.template!=='md_entity_group_card')delete card.id;
    if(card.template==='md_room_card'&&!card.page&&!card.tap_action)card.tap_action={action:'none'};
    const target=card.page;
    const pages=[{name:'Card',path:'home',entities:[card]}];
    if(target && target!=='home')pages.push({name:'Target',path:target,entities:[]});
    const compatible=legacySummaries.has(this._config.template)?{...catalog,cards:catalog.cards.map(entry=>entry.id==='md_base_card'?{...entry,domains:this._selected().domains}:entry)}:catalog;
    return validateConfig({config_version:2,name:'Card',landing_page:'home',pages},2,this._entities,catalog.energy_units,compatible);
  }
  _render() {
    if(!this.shadowRoot || !this._config || !this._hass)return;
    this._popupInline?.dispose();this._popupInline=null;this._activityEvents?.abort();this._activityEvents=new AbortController();
    const card=this._selected();
    this.shadowRoot.innerHTML=`<style>${EDITOR_CSS}.popup-content-section,.popup-content-child{border:1px solid var(--divider-color);border-radius:12px;padding:8px;margin-block:8px;min-width:0}.popup-content-child button{margin:4px}h3,p{overflow-wrap:anywhere}button{white-space:normal;min-height:48px;min-width:48px}</style><div data-fields></div><div data-popup-layout></div><p data-status role="alert"></p>`;
    this._mounted=true;
    try {
      const path=decodeURIComponent(globalThis.location?.pathname?.split('/')[2]||'');
      const managed=managedChildContext(nativeDashboardConfig(this.lovelace),this._config,path);
      if(managed){this._renderManagedChild(this.shadowRoot.querySelector('[data-fields]'),card,managed);this._renderPopupSelector();return;}
    }catch(error){this._setStatus(this._error(error));return;}
    if(['custom:marao-camera-events-card','custom:marao-frigate-events-card'].includes(this._config.type)){renderEventEditor(this,this.shadowRoot.querySelector('[data-fields]'));return;}
    if(this._renderCompatibilityEditor(this.shadowRoot.querySelector('[data-fields]')))return;
    if(!card){this._setStatus(this._l('Choose a supported page card template.'));return;}
    this._renderPopupSelector();
    if(card.id==='md_floor_plan_card') {
      const button=document.createElement('button');button.type='button';button.textContent=this._l('Floor Plan');
      button.onclick=()=>{this._moveHaptic();openFloorPlanEditor(this,0,0,'native');};this.shadowRoot.querySelector('[data-fields]').append(button);return;
    }
    const original=clone(this._config),data=nativeCardFormData(original,card);let previousData=clone(data);
    const descriptor=nativeConfigToDescriptor(original),host=this.shadowRoot.querySelector('[data-fields]');
    host.innerHTML='<div data-basic></div><div data-lists></div><div data-scenes></div><div data-special></div><details data-advanced><summary></summary><div data-advanced-form></div></details>';
    let collection=clone(original.entities || []),collectionEdited=false;
    const commit=()=>{
      try {
        const previousPopup=popupRole(nativeConfigToDescriptor(this._config)),next=patchNativeCard(this._config,card,previousData,data);
        if((card.scene_collection || card.people) && collectionEdited)next.entities=collection;
        if(this._mediaEdited){if(own(original.variables,'apple_tv')&&!own(original,'apple_tv'))next.variables={...next.variables,apple_tv:clone(this._mediaValue)};else next.apple_tv=clone(this._mediaValue);}
        const errors=this._validateDescriptor(nativeConfigToDescriptor(next));
        if(errors.length){this._setStatus(errors.map(error=>this._l(error)).join('\n'));return;}
        this._setStatus('');this._commitDescriptor(next);const popupChanged=previousPopup!==popupRole(nativeConfigToDescriptor(next));previousData=clone(data);if(popupChanged)this._render();
      }catch(error){this._setStatus(this._error(error));}
    };
    this._mediaEdited=false;
    const fields=this._expandedFields(card.variables || []),specialKinds=['energy_sub_entities','power_devices','sensor_thresholds'];
    const basic=fields.filter(field=>!field.advanced&&!specialKinds.includes(field.kind)&&!(card.id==='md_climate_card'&&field.key==='show_mode_buttons'&&data.var__enable_popup!==false));
    const advanced=fields.filter(field=>field.advanced&&!specialKinds.includes(field.kind));
    const schema=[];
    if(card.page_shortcut) {
      const pages=this._availablePages();if(data.page&&!pages.some(page=>page.path===data.page))pages.push({path:data.page,name:data.page});
      schema.push(this._schema('page','Target page',{select:{mode:'dropdown',options:pages.map(page=>({value:page.path,label:page.name}))}},true));
    }
    if(card.domains?.length)schema.push(this._schema('entity_id',card.id==='md_header_card'?'Weather':card.id==='md_camera_card'?'Dashboard stream':'Entity',{entity:{domain:card.domains}},!card.entity_optional));
    schema.push(...(card.id==='md_camera_card'?cameraTitleFields().map(field=>this._schema(field.path,field.label,{[field.kind]:{}})):[this._schema('name','Display name',{text:{}}),...(!['md_timeline_card'].includes(card.id)&&this._config.type!=='custom:marao-power-history-card'?[this._schema('icon','Icon',{icon:{}})]:[])]));
    if(card.scene_collection || card.people)schema.push(this._schema('scene_entities',card.people?'People':'Scenes',{entity:{domain:card.people?['person']:['scene','switch','input_boolean'],multiple:true}}));
    if(card.people)schema.push(this._schema('columns','Columns',{number:{min:1,max:6,step:1,mode:'box'}}));
    schema.push(...basic.map(field=>this._variableSchema(field,card.id==='md_switch_card'?data.var__power_entity:data.entity_id)));
    const renderScenes=()=>{
      if(!card.scene_collection && !card.people)return;
      this._renderSceneOrder(host.querySelector('[data-scenes]'),collection,next=>{collectionEdited=true;collection=next;data.scene_entities=this._entityIds(next);host.querySelector('[data-basic] ha-form').data={...data};renderScenes();commit();},index=>{
        const previous=typeof collection[index]==='string'?{entity_id:collection[index]}:collection[index];
        this._openFormDialog('Edit card',{name:previous.name || '',icon:previous.icon || ''},[this._schema('name','Display name',{text:{}}),this._schema('icon','Icon',{icon:{}})],value=>{const next={...previous};for(const key of ['name','icon'])if(value[key])next[key]=value[key];else delete next[key];collectionEdited=true;collection[index]=next;renderScenes();commit();});
      },card.people?'People':'Scene order');
    };
    let basicForm,advancedForm;
    const changed=value=>{
      const source=data.entity_id;Object.assign(data,value);
      for(const form of [basicForm,advancedForm])if(form)form.data=data;
      if(card.scene_collection || card.people){const next=mergeEntityValues(collection,data.scene_entities || []);collectionEdited ||= !sameFormValue(collection,next);collection=next;renderScenes();}
      if(source!==data.entity_id && card.id==='md_sensor_card')renderLists();
      this._refreshEnergyFields(host,card.id==='md_switch_card'?data.var__power_entity:data.entity_id);commit();
    };
    basicForm=this._mountForm(host.querySelector('[data-basic]'),data,schema,changed);
    const details=host.querySelector('[data-advanced]');details.querySelector('summary').textContent=this._t('advanced');
    const cameraFields=card.id==='md_camera_card'?cameraTitleFields().map(field=>field.path):[];
    const appearance=(simpleAppearance(card)&&this._config.type!=='custom:marao-power-history-card'?commonAppearance:[]).filter(([key])=>!cameraFields.includes(key)).map(([key,label])=>this._schema(key,label,{boolean:{}}));
    const strict=card.id==='md_access_slide_action_card'||card.id==='md_access_action_card'||card.id==='md_access_hold_action_card'||['slide','close'].includes(data.var__access_mode);
    if(simpleAppearance(card)&&this._config.type!=='custom:marao-power-history-card'&&!strict&&!['md_entity_group_card','md_scene_collection_card'].includes(card.id))appearance.push(...commonActions.map(key=>this._schema(key,({'tap_action':'Tap action','hold_action':'Hold action','double_tap_action':'Double-tap action'})[key],{ui_action:{}})));
    if(card.id==='md_energy_period_card')appearance.push(this._schema('popup','Show energy details on dashboard',{boolean:{}}));
    advancedForm=this._mountForm(host.querySelector('[data-advanced-form]'),data,[...appearance,...advanced.map(field=>this._variableSchema(field,data.entity_id))],changed);
    const renderLists=()=>{
      const lists=host.querySelector('[data-lists]');lists.replaceChildren();
      const kinds=card.id==='md_sensor_card'?[['background_thresholds',false,data.entity_id]]:card.id==='md_graph_card'?[['power_devices',true,null]]:card.id==='md_energy_period_card'?[['sub_entities',false,null]]:[];
      for(const [key,power,threshold]of kinds){const box=document.createElement('div');lists.append(box);this._renderEnergySubEntities(box,clone(data[`var__${key}`] || []),next=>{data[`var__${key}`]=next;commit();},power,threshold);}
    };
    renderLists();renderScenes();
    const special=host.querySelector('[data-special]');
    if(card.entity_group)this._renderGroup(special,descriptor);
    if(card.schedules)this._renderSchedules(special,original);
    if(card.id==='md_media_card') {
      const button=document.createElement('button');button.type='button';button.textContent=this._l('Apple TV options');button.onclick=()=>{this._moveHaptic();this._openMediaOptions({...original,entity_id:data.entity_id,apple_tv:this._mediaEdited?this._mediaValue:original.apple_tv??original.variables?.apple_tv},value=>{this._mediaEdited=true;this._mediaValue=value;commit();});};special.append(button);
    }
  }
  _renderManagedChild(host,card,managed) {
    const hint=document.createElement('p');hint.textContent=this._l('Behavior follows the parent card settings.');host.append(hint);
    const fields=this._expandedFields(card?.variables||[]).filter(field=>popupPresentationVariable(field.key));
    const entry={id:card?.id,variables:fields},original=clone(this._config),data=nativeCardFormData(original,entry);let previous=clone(data);
    const form=document.createElement('div');host.append(form);
    this._mountForm(form,data,[this._schema('name','Display name',{text:{}}),this._schema('icon','Icon',{icon:{}}),...fields.map(field=>this._variableSchema(field,data.entity_id))],value=>{
      const next=patchNativeCard(this._config,entry,previous,value);this._commitDescriptor(next);previous=clone(value);
    });
    if(['custom:marao-camera-events-card','custom:marao-frigate-events-card'].includes(this._config.type))this._mountForm(host,{title:this._config.title||''},[this._schema('title','Title',{text:{}})],value=>{const next=clone(this._config);if(value.title)next.title=value.title;else delete next.title;this._commitDescriptor(next);});
    const button=document.createElement('button');button.type='button';button.textContent=this._l('Make custom');button.onclick=()=>{this._moveHaptic();this._commitDescriptor(detachManagedPopupCard(this._config));this._render();};host.append(button);
  }
  _managedSource() {
    if(this._config.popup_content?.mode==='custom')return;
    const document=nativeDashboardConfig(this.lovelace);if(!document)return;
    const hash=popupHash(this._config),path=this._config.popup_view||(hash?popupOwners(document).find(binding=>binding.currentPath===decodeURIComponent(globalThis.location?.pathname?.split('/')[2]||'')&&popupHash(binding.config)===hash)?.path:undefined);
    if(!path)return;return document.views?.find((view,index)=>String(view.path??index)===path)?.marao_popup;
  }
  _renderPopupSelector() {
    const host=this.shadowRoot?.querySelector('[data-popup-layout]');if(!host)return;
    const descriptor=nativeConfigToDescriptor(this._config);if(this._config.type!=='custom:marao-popup-card'&&!popupRole(descriptor)&&!own(this._config,'popup_content'))return;
    renderPopupContent(this,host);return;
    if(this._config.popup_content?.mode==='custom')return;
  }

  _renderCompatibilityEditor(host) {
    const original=this._config,type=original.type;
    if(type==='custom:marao-popup-card') {
      this._renderPopupSelector();
      this._mountForm(host,{name:original.name||'',hash:original.hash||''},[this._schema('name','Display name',{text:{}}),this._schema('hash','Popup hash',{text:{}})],value=>{
        const next=clone(this._config);for(const key of ['name','hash'])if((original[key]||'')!==value[key]){if(value[key])next[key]=value[key];else delete next[key];}const error=popupViewError(next);if(error){this._setStatus(this._l(error));return;}this._setStatus('');this._commitDescriptor(next);
      });return true;
    }
    if(type==='custom:marao-summary-actions') {
      const fields=[this._schema('entity_type','Group type',{select:{mode:'dropdown',options:[['light','Light'],['cover','Cover'],['climate','Climate'],['battery','Battery']].map(([value,label])=>({value,label:this._l(label)}))}}),this._schema('scope','Scope',{select:{mode:'dropdown',options:[{value:'all',label:this._l('Entire popup')},{value:'section',label:this._l('Current section')}]}})];
      if(original.popup_scope!=='embedded')fields.push(this._schema('popup_view','Popup view',{text:{}}));
      this._mountForm(host,clone(original),fields,value=>{const error=popupViewError(value);if(error){this._setStatus(this._l(error));return;}this._setStatus('');this._commitDescriptor({...this._config,...value});});return true;
    }
    if(type!=='custom:marao-control-grid')return false;
    const epoch=this._documentEpoch,lifecycle=this._lifecycle;
    loadLovelaceEditor(this.hass,globalThis.location?.pathname,{picker:false}).then(()=>{
      if(epoch!==this._documentEpoch||lifecycle!==this._lifecycle||!host.isConnected)return;
      const editor=document.createElement('hui-card-element-editor');editor.hass=this.hass;editor.lovelaceConfig=nativeDashboardConfig(this.lovelace);editor.value=controlGridEditorValue(this._config);
      for(const name of ['GUImode-changed','editor-save'])editor.addEventListener(name,event=>event.stopPropagation());
      editor.addEventListener('config-changed',event=>{event.stopPropagation();if(epoch!==this._documentEpoch||lifecycle!==this._lifecycle||!host.isConnected)return;try{
        if(event.detail.error)throw new Error(event.detail.error);
        const next=patchControlGrid(this._config,event.detail.config);this._setStatus('');
        if(this._compatibilityInvalid&&sameFormValue(next,this._config))this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:clone(next)},bubbles:true,composed:true}));
        this._compatibilityInvalid=false;this._commitDescriptor(next);
      }catch(error){const message=this._error(error);this._compatibilityInvalid=true;this._setStatus(message);this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:clone(this._config),error:message},bubbles:true,composed:true}));}});
      host.replaceChildren(editor);
    }).catch(error=>this._setStatus(this._error(error)));return true;
  }

  _popupEditorContext(){return findNativeEditorContext(this);}
  async _editPopup() {
    if(this._popupBusy||this._popupUncertain)return;
    try {
      const descriptor=nativeConfigToDescriptor(this._config);
      if(!popupRole(descriptor))throw new Error('This card has no editable popup.');
      const context=this._popupEditorContext();
      if(!context||typeof context.root.lovelace?.setEditMode!=='function')throw new Error('Popup editing is unavailable on this Home Assistant host.');
      const {root,dialog}=context,hass=this._hass,address=location.pathname,path=address.split('/')[1],document=nativeDashboardConfig(this.lovelace);
      if(dialog.isEffectiveDirtyState)throw new Error('Save this card before editing its popup.');
      const epoch=this._documentEpoch,lifecycle=this._lifecycle,identity=canonicalLayout(this._config),user=hass.user?.id;
      const isCurrent=()=>this.isConnected&&this._documentEpoch===epoch&&this._lifecycle===lifecycle&&canonicalLayout(this._config)===identity&&this._hass?.user?.id===user&&this._hass?.user?.is_admin&&this._hass.connected!==false&&this._hass.connection?.connected!==false&&root.isConnected!==false&&location.pathname===address&&!dialog.isEffectiveDirtyState;
      const route=decodeURIComponent(address.split('/')[2] || ''),views=document?.views || [];
      const index=views.findIndex((view,index)=>String(view.path ?? index)===route),view=index>=0?views[index]:!route?views[0]:/^\d+$/.test(route)?views[Number(route)]:null;
      if(!view)throw new Error('Popup editing is unavailable on this Home Assistant host.');
      const currentPath=String(view.path ?? views.indexOf(view)),opener=this._popupSaved?.opener || clone(this._config);
      const args={hass,root,opener,currentPath,path,editorDocument:document,isCurrent,journal:this._popupJournal};
      this._popupBusy=true;if(this._popupEditButton)this._popupEditButton.disabled=true;this._moveHaptic();
      this._setStatus(this._l('Creating layout…'));
      const result=await savePopupLayout({...args,plan:baseline=>planPopupEdit(baseline,opener,currentPath,address,{entities:this._entities,dashboardRoot:path,language:hass.language,hass})});
      const linked=result.path;this._popupSaved={opener:result.opener};
      if(!isCurrent())throw new Error('Dashboard changed. Reopen the card editor and try again.');
      if(!dialog.closeDialog())throw new Error('Save this card before editing its popup.');
      root.lovelace.setEditMode(true);
      window.history.pushState({},'',`/${path}/${linked}?edit=1`);window.dispatchEvent(new Event('location-changed'));
      this._setStatus('');
    }catch(error){this._popupUncertain=error.code==='popup_uncertain';this._setStatus(this._error(error));}
    finally {this._popupBusy=false;if(this._popupEditButton)this._popupEditButton.disabled=Boolean(this._popupUncertain||!this._hass?.user?.is_admin||this._hass.connected===false||this._hass.connection?.connected===false);}
  }
  async _renderSchedules(host,original) {
    const options=[{value:original.group_id,label:this._l('New collection')}],known=new Map();
    const schema=()=>[this._schema('group_id','Schedule collection',{select:{options:[...options]}},true),...(!known.has(this._config.group_id)?[this._schema('targets','Devices',{entity:{domain:['switch','valve','input_boolean'],multiple:true}})]:[])];
    let form;
    const render=()=>{form=this._mountForm(host,{group_id:this._config.group_id,targets:clone(this._config.targets || [])},schema(),value=>{
      const existing=known.get(value.group_id),changed=value.group_id!==this._config.group_id;
      const next={...this._config,...value,...(existing?{targets:existing.targets.map(t=>t.entity_id)}:{})};
      const errors=this._validateDescriptor(nativeConfigToDescriptor(next));this._setStatus(errors.map(e=>this._l(e)).join('\n'));
      if(!errors.length){this._commitDescriptor(next);if(changed)render();}
    });};
    render();if(!this._hass?.user?.is_admin)return;
    const epoch=this._documentEpoch,lifecycle=this._lifecycle,signal=this._activityEvents?.signal;
    try {
      for(const state of Object.values(this._hass.states || {}).filter(s=>s.entity_id.startsWith('automation.')&&s.attributes?.id?.startsWith('marao_schedules_')&&s.attributes.id.endsWith('_controller'))) {
        const config=await this._hass.callApi('GET','config/automation/config/'+encodeURIComponent(state.attributes.id)),m=config.variables?.marao_schedule;
        if(m?.manager==='marao-schedules'&&m.version===1&&m.role==='controller'){known.set(m.id,m);const index=options.findIndex(o=>o.value===m.id);if(index!==-1)options[index].label=m.name;else options.push({value:m.id,label:m.name});}
      }
      if(this._documentEpoch===epoch&&this._lifecycle===lifecycle&&!signal?.aborted)form.schema=schema();
    }catch(error){if(this._documentEpoch===epoch&&this._lifecycle===lifecycle&&!signal?.aborted)this._setStatus(this._error(error));}
  }
  _renderGroup(host,original) {
    const managed=this._managedSource();
    if(original.popup_content?.mode!=='custom'&&original.popup_view&&!managed) {
      const hint=document.createElement('p');hint.textContent=this._l('Edit cards and sections in the linked Home Assistant view.');host.append(hint);
      this._mountForm(host,{entity_type:original.entity_type || 'light'},[this._schema('entity_type','Entity type',{select:{options:[['light','Light'],['cover','Cover'],['climate','Climate'],['battery','Battery']].map(([value,name])=>({value,label:this._l(name)}))}})],value=>{const next={...this._config,entity_type:value.entity_type},errors=this._validateDescriptor(nativeConfigToDescriptor(next));this._setStatus(errors.map(error=>this._l(error)).join('\n'));if(!errors.length)this._commitDescriptor(next);});
      return;
    }
    let members=clone(original.entities || []),filterEdited=own(original,'popup_filter'),sections=clone(original.summary_sections || []),sectionsEdited=false;
    const selections=new Map(Object.entries(managed?.retained||{}).map(([family,branch])=>[family.split(':').at(-1),branch.settings]));
    const group={entity_type:original.entity_type || 'light',popup_filter:original.popup_filter || (original.entity_type&&original.entity_type!=='light'?'all':'active')};
    const submit=()=>{
      const next={...this._config,...group,entities:members,...(sectionsEdited?{summary_sections:sections}:{})};
      const errors=this._validateDescriptor(nativeConfigToDescriptor(next));this._setStatus(errors.map(error=>this._l(error)).join('\n'));if(!errors.length)this._commitDescriptor(next);
    };
    host.innerHTML='<div data-group></div><ha-sortable class="settings-rows" data-member-sortable handle-selector=".drag-handle" draggable-selector=".route" no-style><div data-members></div></ha-sortable><div data-member-picker></div><div data-sections></div>';
    let expandedMember;const session=Symbol(),epoch=this._documentEpoch,lifecycle=this._lifecycle;this._memberListSession=session;
    const current=()=>this._memberListSession===session&&this._documentEpoch===epoch&&this._lifecycle===lifecycle;
    const sortable=host.querySelector('[data-member-sortable]');sortable.group=newEntityGroupId();
    const domain=()=>group.entity_type==='battery'?'sensor':group.entity_type;
    const retainSections=()=>{
      const ids=new Set(this._entityIds(members));
      sections=sections.map(section=>{const entities=section.entities.filter(id=>ids.has(id));if(entities.length!==section.entities.length)sectionsEdited=true;return {...section,entities};});
    };
    const updateMember=(index,value)=>{
      const nextMembers=members.slice(),oldId=this._entityId(members[index]),newId=this._entityId(value);nextMembers[index]=value;
      const nextSections=sections.map(section=>({...section,entities:section.entities.map(entity=>entity===oldId?newId:entity)}));
      const errors=this._validateDescriptor({...nativeConfigToDescriptor(this._config),...group,entities:nextMembers,summary_sections:nextSections});
      if(errors.length){this._setStatus(errors.map(error=>this._l(error)).join('\n'));return false;}
      members=nextMembers;if(oldId!==newId){if(!sameFormValue(sections,nextSections)){sections=nextSections;sectionsEdited=true;}expandedMember=newId;renderSections();}submit();return true;
    };
    const picker=()=>{
      const box=host.querySelector('[data-member-picker]');box.replaceChildren();
      const add=this._mountForm(box,{member:''},[this._schema('member','Add entity',{entity:{domain:[domain()]}})],value=>{
        if(!current()||!value.member)return;
        if(this._entityIds(members).includes(value.member)){add.data={member:''};return;}
        const errors=this._validateDescriptor({...nativeConfigToDescriptor(this._config),...group,entities:[...members,value.member]});
        if(errors.length){this._setStatus(errors.map(error=>this._l(error)).join('\n'));return;}
        this._moveHaptic();members.push(value.member);render();renderSections();submit();add.data={member:''};
      });
    };
    const reorder=(index,target)=>{
      if(!current()||!Number.isInteger(index)||!Number.isInteger(target)||index===target||index<0||target<0||index>=members.length||target>=members.length)return;
      const [member]=members.splice(index,1);members.splice(target,0,member);submit();
      queueMicrotask(()=>{if(current())render();});
    };
    sortable.addEventListener('item-moved',event=>{event.stopPropagation();reorder(event.detail.oldIndex,event.detail.newIndex);});
    for(const name of ['drag-start','drag-end'])sortable.addEventListener(name,event=>{event.stopPropagation();this._moveHaptic();});
    const render=()=>{
      const rows=host.querySelector('[data-members]');rows.replaceChildren();sortable.disabled=members.length<2;
      members.forEach((member,index)=>{
        const id=this._entityId(member),item=createSettingsRow(this._l('Entity options'),[
          {value:'edit',label:this._l('Edit card'),icon:'pencil'},
          {value:'up',label:this._l('Move up'),icon:'arrow-up',disabled:index===0},
          {value:'down',label:this._l('Move down'),icon:'arrow-down',disabled:index===members.length-1},
          {value:'delete',label:this._l('Delete'),icon:'delete-outline'}
        ],action=>{
          if(!current())return;this._moveHaptic();
          if(action==='edit'){this._editMember(members[index],value=>{if(!current()||!updateMember(index,value))return;expandedMember=this._entityId(value);render();});return;}
          if(action==='delete'){if(expandedMember===id)expandedMember=undefined;members.splice(index,1);retainSections();render();renderSections();submit();return;}
          if(action==='up'||action==='down')reorder(index,index+(action==='up'?-1:1));
        });
        const handle=document.createElement('button');handle.type='button';handle.className='drag-handle';handle.innerHTML='<ha-icon icon="mdi:drag-horizontal-variant" aria-hidden="true"></ha-icon>';handle.disabled=members.length<2;
        handle.setAttribute('aria-label',this._l('Drag to reorder')+': '+id);item.heading.prepend(handle);
        handle.onkeydown=event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();this._moveHaptic();reorder(index,index+(event.key==='ArrowUp'?-1:1));}};
        const updateHeading=()=>{
          const value=typeof members[index]==='string'?{entity_id:members[index]}:members[index],entity=this._entityId(value),state=this._hass?.states?.[entity];
          item.update(value.name||state?.attributes?.friendly_name||entity,entity,value.icon||state?.attributes?.icon||({light:'mdi:lightbulb',cover:'mdi:window-shutter',battery:'mdi:battery',climate:'mdi:thermostat'})[group.entity_type]);
        };
        let mounted=false;
        const expand=()=>{
          const open=expandedMember===this._entityId(members[index]);item.setExpanded(open);
          if(!open||mounted)return;mounted=true;
          const original=members[index],value=typeof original==='string'?{entity_id:original}:original;
          let previous={entity_id:this._entityId(value),name:value.name||'',icon:value.icon||''};
          this._mountForm(item.fields,previous,[this._schema('entity_id','Entity',{entity:{domain:[domain()]}},true),this._schema('name','Display name',{text:{}}),this._schema('icon','Icon',{icon:{}})],data=>{
            if(!current()||this._entityId(members[index])!==previous.entity_id||sameFormValue(previous,data))return;
            const next=typeof members[index]==='string'?{entity_id:members[index]}:clone(members[index]);
            for(const key of ['entity_id','name','icon'])if(!sameFormValue(previous[key],data[key])){const target=key==='entity_id'&&own(next,'entity')&&!own(next,'entity_id')?'entity':key;if(data[key])next[target]=data[key];else delete next[target];if(key==='name')delete next.name_key;}
            const value=typeof original==='string'&&Object.keys(next).length===1&&own(next,'entity_id')?next.entity_id:next;
            if(updateMember(index,value)){previous=clone(data);updateHeading();}
          });
        };
        item.toggle.onclick=()=>{this._moveHaptic();expandedMember=expandedMember===this._entityId(members[index])?undefined:this._entityId(members[index]);for(const row of rows.children)row.expandSettings();};
        item.row.expandSettings=expand;rows.append(item.row);updateHeading();expand();
      });
    };
    this._mountForm(host.querySelector('[data-group]'),group,[this._schema('entity_type','Entity type',{select:{mode:'dropdown',options:[['light','Light'],['cover','Cover'],['battery','Battery'],['climate','Climate']].map(([value,label])=>({value,label:this._l(label)}))}},true),this._schema('popup_filter','Popup filter',{select:{mode:'dropdown',options:[{value:'all',label:this._l('All entities')},{value:'active',label:this._l('Active only')}]}})],value=>{
      filterEdited ||= value.popup_filter!==group.popup_filter;
      if(value.entity_type!==group.entity_type&&managed) {
        selections.set(group.entity_type,{entities:clone(members),summary_sections:clone(sections),popup_filter:group.popup_filter});
        const retained=selections.get(value.entity_type);
        members=clone(retained?.entities||members.filter(member=>entityGroupMemberCompatible(value.entity_type,typeof member==='string'?{entity_id:member}:member,entityMeta(this._entities,typeof member==='string'?member:member.entity_id))));
        sections=clone(retained?.summary_sections||[]);sectionsEdited=true;
        if(retained&&own(retained,'popup_filter'))value.popup_filter=retained.popup_filter;
      }
      if(value.entity_type!==group.entity_type&&!filterEdited&&!own(selections.get(value.entity_type),'popup_filter'))value.popup_filter=value.entity_type==='light'?'active':'all';
      Object.assign(group,value);host.querySelector('[data-group] ha-form').data={...group};expandedMember=undefined;picker();render();renderSections();submit();
    });
    const renderSections=()=>{
      const box=host.querySelector('[data-sections]');box.replaceChildren();
      if(managed)return;
      const sectionForms=[];
      const add=document.createElement('button');add.type='button';add.textContent=this._l('Add section');add.onclick=()=>{this._moveHaptic();sections.push({id:newEntityGroupId().replace('group-','section-'),name:this._l('Section')+' '+(sections.length+1),entities:[]});sectionsEdited=true;renderSections();submit();};box.append(add);
      sections.forEach((section,index)=>{
        const row=document.createElement('div');box.append(row);
        sectionForms[index]=this._mountForm(row,section,[this._schema('name','Section name',{text:{}},true),this._schema('entities','Members',{select:{multiple:true,options:this._entityIds(members).map(id=>({value:id,label:this._hass?.states?.[id]?.attributes?.friendly_name || id}))}})],value=>{
          const entities=value.entities || [];
          sections=sections.map((other,i)=>i===index?{...other,...value,entities}:{...other,entities:other.entities.filter(id=>!entities.includes(id))});
          sectionForms.forEach((form,i)=>{form.data=sections[i];});sectionsEdited=true;submit();
        });
        for(const [name,action] of [['Move up',()=>{[sections[index-1],sections[index]]=[sections[index],sections[index-1]];}],['Move down',()=>{[sections[index+1],sections[index]]=[sections[index],sections[index+1]];}],['Delete',()=>{sections.splice(index,1);}]]) {
          const button=document.createElement('button');button.type='button';button.textContent=this._l(name);button.disabled=name==='Move up'?index===0:name==='Move down'?index===sections.length-1:false;button.onclick=()=>{this._moveHaptic();action();sectionsEdited=true;renderSections();submit();};row.append(button);
        }
      });
    };
    picker();render();renderSections();
  }
  _editMember(member,save) {
    const descriptor=typeof member==='string'?{entity_id:member}:clone(member),metadata=entityMeta(this._entities || [],descriptor.entity_id);
    descriptor.template ||= cardForEntity(catalog,metadata || descriptor)?.id;
    const dialog=this._dialog(this._l('Edit card')),host=dialog.querySelector('.dialog-content');
    const editor=document.createElement('marao-native-card-editor');editor.hass=this._hass;editor.lovelace=this.lovelace;editor.setConfig(descriptor);
    let draft=clone(descriptor);editor.addEventListener('config-changed',event=>{event.stopPropagation();draft=event.detail.config;});host.append(editor);
    const actions=document.createElement('div');actions.className='dialog-actions';
    for(const [label,action]of [['Cancel',()=>this._closeDialog(dialog)],['Update',()=>{save(draft);this._closeDialog(dialog);}]]){const button=document.createElement('button');button.type='button';button.textContent=this._l(label);button.onclick=()=>{this._moveHaptic();action();};actions.append(button);}host.append(actions);
    this._containForm(dialog).catch(error=>this._setStatus(this._error(error)));
  }
  _dialog(title) {
    const dialog=document.createElement('ha-dialog');dialog.width='large';dialog.open=true;dialog.heading=this._l(title);dialog.headerTitle=this._l(title);dialog.innerHTML='<div class="dialog-content"></div>';
    const invoking=this.shadowRoot.activeElement;dialog.addEventListener('closed',()=>{dialog.remove();if(this.isConnected)this._focusWithoutScroll(invoking?.isConnected?invoking:this.shadowRoot.querySelector('button'));},{once:true});
    this.shadowRoot.append(dialog);this._containForm(dialog).catch(error=>this._setStatus(this._error(error)));return dialog;
  }
  _closeDialog(dialog){dialog.open=false;}
  _iconButton(icon,label,action,index,disabled=false){return `<button type="button" class="icon-action" data-action="${action}" data-room="${index}" aria-label="${esc(this._l(label))}" ${disabled?'disabled':''}><ha-icon icon="${icon}" aria-hidden="true"></ha-icon></button>`;}
}
const EDITOR_CSS=`${SETTINGS_ROW_CSS}.settings-rows [data-members]{display:grid;gap:8px;margin-bottom:12px}:host{display:block;min-width:0;color:var(--primary-text-color);font-family:var(--primary-font-family,inherit)}*{box-sizing:border-box}[hidden]{display:none!important}button{min-width:48px;min-height:48px;font:inherit;color:inherit;background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:16px;padding:8px;cursor:pointer}button:focus,summary:focus{outline:none}button:disabled{color:var(--disabled-text-color);cursor:default}[data-popup-layout]{display:grid;gap:12px;min-width:0}[data-fields],[data-lists],[data-special],[data-advanced-form]{display:grid;gap:12px;min-width:0}summary{min-height:48px;padding:12px;cursor:pointer;overflow-wrap:anywhere}.load-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.load-row>span{flex:1 1 12ch;min-width:0;overflow-wrap:anywhere}.entity-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--divider-color)}.entity-main{flex:1 1 12ch;min-width:0;overflow-wrap:anywhere}.entity-meta,small{color:var(--secondary-text-color);overflow-wrap:anywhere}.row-actions{display:flex;flex-wrap:wrap;margin-inline-start:auto}.icon-action{display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;padding:12px;border:0;border-radius:50%;background:transparent}.dialog-content{display:grid;gap:12px;min-width:0}.dialog-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px}.advanced-form{padding:8px 0}.energy-contributors{display:grid;gap:12px}.page-section{padding:0 12px 12px;border:1px solid var(--divider-color);border-radius:16px;min-width:0}.page-section:not([open]){padding-bottom:0}.card-heading{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 -12px;padding:8px 12px;min-height:64px;list-style:none}.card-heading::-webkit-details-marker{display:none}.card-heading::after{content:'';width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);margin:6px}.page-section:not([open])>.card-heading::after{transform:rotate(-45deg)}.entity-name{font-weight:600}p{white-space:pre-line;overflow-wrap:anywhere}ha-form{display:block;min-width:0;max-width:100%}`;
Object.assign(MaraoCardEditor.prototype,cardFormMethods);
if(globalThis.customElements&&!customElements.get('marao-native-card-editor'))customElements.define('marao-native-card-editor',MaraoCardEditor);
