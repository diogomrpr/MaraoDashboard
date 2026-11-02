import {renderEventEditor} from './event-card-editor.js';
import {nativeDashboardConfig} from '../custom_components/marao_dashboard/frontend/MaraoNativeContext.js';
import {popupRole,popupLabel,resolvePopupView,popupViewError} from '../custom_components/marao_dashboard/frontend/MaraoPopupLayout.js';
import catalog from '../custom_components/marao_dashboard/frontend/marao-catalog.json' with {type:'json'};
import {cardFormMethods} from './card-form-tools.js';
import {PT_LABELS, MOVE_PT_LABELS} from './editor-labels.js';
import {clone, canonicalTemplate, cardForEntity, cameraTitleFields, formData, patchForm, sameFormValue, entityMeta, flattenEntities, mergeEntityValues, validateConfig} from './editor-model.js';
import {openFloorPlanEditor} from './floor-plan-editor.js';
import {templateForNativeType} from './card-composition.js';

const Base = globalThis.HTMLElement || class {};
const own = (value,key) => Object.hasOwn(value || {},key);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const WORDS = {add:'Add',delete:'Delete',edit:'Edit',update:'Update',create:'Create',cancel:'Cancel',advanced:'Advanced options',searchEntities:'Search by name or entity ID',noResults:'No compatible entities match your search.',unknown:'Unknown',unavailable:'Unavailable'};

export function nativeConfigToDescriptor(config) {
  const result=clone(config || {});
  result.template=canonicalTemplate(result.template || templateForNativeType(result.type) || '');
  if(!result.entity_id && result.entity)result.entity_id=result.entity;
  return result;
}

export function nativeCardFormData(config, card) {
  const data={entity_id:config.entity_id || config.entity || '',name:config.name || '',icon:config.icon || '',page:config.page || '',popup_view:config.popup_view || ''};
  if(card.id==='md_camera_card')Object.assign(data,formData(config,cameraTitleFields()));
  for(const field of cardFormMethods._expandedFields(card.variables || []))data[`var__${field.key}`]=cardFormMethods._readVariable(config.variables,field);
  if(card.scene_collection || card.people)data.scene_entities=flattenEntities(config.entities || []).map(item=>item.entity_id);
  if(card.people)data.columns=config.columns ?? 1;
  return data;
}

// Patch only fields that actually changed; native layout, actions and opaque data stay owned by HA.
export function patchNativeCard(config, card, previous, next) {
  let result=clone(config);
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
    if(!sameFormValue(previous[key],next[key]))cardFormMethods._writeVariable(variables,field,next[key]);
  }
  if(Object.keys(variables).length || own(config,'variables'))result.variables=variables;
  return result;
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
    this._config=clone(config);this._documentEpoch++;this._revision=0;
    this._installModel();this._render();
  }
  set hass(value) {
    const language=this._hass?.language;this._hass=value;
    this._entities=Object.entries(value?.states || {}).map(([entity_id,state])=>({entity_id,domain:entity_id.split('.')[0],state:state.state,name:state.attributes?.friendly_name || entity_id,...state.attributes}));
    this.shadowRoot?.querySelectorAll('ha-form').forEach(form=>{form.hass=value;});
    this.shadowRoot?.querySelectorAll('marao-native-card-editor').forEach(editor=>{editor.hass=value;});
    if(this._config && (!this._mounted || language!==value?.language))this._render();
  }
  get hass(){return this._hass;}
  set lovelace(value) {
    this._lovelace=value;
    if(this._config&&this._hass)this._renderPopupSelector();
    const form=this.shadowRoot?.querySelector('[data-basic] ha-form');
    if(!form?.schema?.some(field=>field.name==='page'))return;
    const pages=this._availablePages(),current=form.data?.page;
    if(current&&!pages.some(page=>page.path===current))pages.push({path:current,name:current});
    const options=pages.map(page=>({value:page.path,label:page.name}));
    form.schema=form.schema.map(field=>field.name==='page'?{...field,selector:{select:{mode:'dropdown',options}}}:field);
  }
  get lovelace(){return this._lovelace;}
  connectedCallback(){this._lifecycle++;if(this._config && !this._mounted)this._render();}
  disconnectedCallback(){this._lifecycle++;this._activityEvents?.abort();this.shadowRoot?.querySelectorAll('ha-dialog').forEach(dialog=>{dialog.open=false;});}
  _installModel() {
    this._containerModel={entities:[nativeConfigToDescriptor(this._config)]};
    this._model={name:'Card',config_version:2,landing_page:'home',pages:[{name:'Home',path:'home',...this._containerModel}]};
    this._model.pages[0]=this._containerModel;
  }
  _selected() {
    const descriptor=nativeConfigToDescriptor(this._config), metadata=entityMeta(this._entities || [],descriptor.entity_id);
    return catalog.cards.find(card=>card.id===descriptor.template) || cardForEntity(catalog,metadata || descriptor);
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
    this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:clone(next)},bubbles:true,composed:true}));
  }
  _availablePages() {
    const views=nativeDashboardConfig(this.lovelace)?.views || [];
    return views.map((view,index)=>({path:String(view.path ?? index),name:view.title || String(view.path ?? index)}));
  }
  _validateDescriptor(descriptor) {
    // The shared validator checks card semantics; native outer layout stays outside this source view.
    const error=popupViewError(descriptor);if(error)return [error];
    const card=clone(descriptor);delete card.type;delete card.id;
    const target=card.page;
    const pages=[{name:'Card',path:'home',entities:[card]}];
    if(target && target!=='home')pages.push({name:'Target',path:target,entities:[]});
    return validateConfig({config_version:2,name:'Card',landing_page:'home',pages},2,this._entities,catalog.energy_units,catalog);
  }
  _render() {
    if(!this.shadowRoot || !this._config || !this._hass)return;
    this._activityEvents?.abort();this._activityEvents=new AbortController();
    const card=this._selected();
    this.shadowRoot.innerHTML=`<style>${EDITOR_CSS}</style><div data-fields></div><div data-popup-layout></div><p data-status role="alert"></p>`;
    this._mounted=true;
    if(['custom:marao-camera-events-card','custom:marao-frigate-events-card'].includes(this._config.type)){renderEventEditor(this,this.shadowRoot.querySelector('[data-fields]'));return;}
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
        const next=patchNativeCard(this._config,card,previousData,data);
        if((card.scene_collection || card.people) && collectionEdited)next.entities=collection;
        if(this._mediaEdited)next.apple_tv=clone(this._mediaValue);
        const errors=this._validateDescriptor(nativeConfigToDescriptor(next));
        if(errors.length){this._setStatus(errors.map(error=>this._l(error)).join('\n'));return;}
        this._setStatus('');this._commitDescriptor(next);previousData=clone(data);
      }catch(error){this._setStatus(this._error(error));}
    };
    this._mediaEdited=false;
    const fields=this._expandedFields(card.variables || []),specialKinds=['energy_sub_entities','power_devices','sensor_thresholds'];
    const basic=fields.filter(field=>!field.advanced&&!specialKinds.includes(field.kind));
    const advanced=fields.filter(field=>field.advanced&&!specialKinds.includes(field.kind));
    const schema=[];
    if(card.page_shortcut) {
      const pages=this._availablePages();if(data.page&&!pages.some(page=>page.path===data.page))pages.push({path:data.page,name:data.page});
      schema.push(this._schema('page','Target page',{select:{mode:'dropdown',options:pages.map(page=>({value:page.path,label:page.name}))}},true));
    }
    if(!card.entity_optional&&!card.page_shortcut || card.id==='md_room_card')schema.push(this._schema('entity_id',card.id==='md_room_card'?'Primary source':card.id==='md_camera_card'?'Dashboard stream':'Entity',{entity:{domain:card.domains || []}},!card.entity_optional));
    schema.push(...(card.id==='md_camera_card'?cameraTitleFields().map(field=>this._schema(field.path,field.label,{[field.kind]:{}})):[this._schema('name','Display name',{text:{}}),this._schema('icon','Icon',{icon:{}})]));
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
    const changed=value=>{
      const source=data.entity_id;Object.assign(data,value);
      if(card.scene_collection || card.people){const next=mergeEntityValues(collection,data.scene_entities || []);collectionEdited ||= !sameFormValue(collection,next);collection=next;renderScenes();}
      if(source!==data.entity_id && card.id==='md_sensor_card')renderLists();
      this._refreshEnergyFields(host,card.id==='md_switch_card'?data.var__power_entity:data.entity_id);commit();
    };
    this._mountForm(host.querySelector('[data-basic]'),data,schema,changed);
    const details=host.querySelector('[data-advanced]');details.hidden=!advanced.length;details.querySelector('summary').textContent=this._t('advanced');
    if(advanced.length)this._mountForm(host.querySelector('[data-advanced-form]'),data,advanced.map(field=>this._variableSchema(field,data.entity_id)),changed);
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
      const button=document.createElement('button');button.type='button';button.textContent=this._l('Apple TV options');button.onclick=()=>{this._moveHaptic();this._openMediaOptions({entity_id:data.entity_id,apple_tv:this._mediaEdited?this._mediaValue:original.apple_tv},value=>{this._mediaEdited=true;this._mediaValue=value;commit();});};special.append(button);
    }
  }
  _renderPopupSelector() {
    const host=this.shadowRoot?.querySelector('[data-popup-layout]');if(!host)return;host.replaceChildren();
    if(!popupRole(nativeConfigToDescriptor(this._config)))return;
    const dashboard=nativeDashboardConfig(this.lovelace);
    const options=[{value:'',label:this._l('Automatic')}];
    for(const [index,view] of (dashboard?.views || []).entries()) {
      const path=String(view.path ?? index);
      if(view.type==='sections'&&!view.strategy&&!popupViewError({popup_view:path}))options.push({value:path,label:view.title || path});
    }
    if(this._config.popup_view&&!options.some(o=>o.value===this._config.popup_view))options.push({value:this._config.popup_view,label:this._config.popup_view});
    this._mountForm(host,{popup_view:this._config.popup_view || ''},[this._schema('popup_view','Popup layout',{select:{mode:'dropdown',options}})],value=>{
      try {
        if(value.popup_view)resolvePopupView(dashboard,value.popup_view);
        const next=clone(this._config);if(value.popup_view)next.popup_view=value.popup_view;else delete next.popup_view;
        this._commitDescriptor(next);this._render();
      }catch(error){this._setStatus(this._error(error));}
    });
  }
  async _renderSchedules(host,original) {
    const options=[{value:original.group_id,label:this._l('New collection')}],known=new Map();
    const render=()=>this._mountForm(host,{group_id:original.group_id,targets:original.targets || []},[this._schema('group_id','Schedule collection',{select:{options}},true),this._schema('targets','Devices',{entity:{domain:['switch','valve','input_boolean'],multiple:true}})],value=>{const existing=known.get(value.group_id);const next={...this._config,...value,...(existing?{targets:existing.targets.map(t=>t.entity_id)}:{})};const errors=this._validateDescriptor(nativeConfigToDescriptor(next));if(errors.length)this._setStatus(errors.map(e=>this._l(e)).join('\n'));else this._commitDescriptor(next);});
    render();if(!this._hass?.user?.is_admin)return;
    const epoch=this._documentEpoch;
    try {
      for(const state of Object.values(this._hass.states || {}).filter(s=>s.entity_id.startsWith('automation.')&&s.attributes?.id?.startsWith('marao_schedules_')&&s.attributes.id.endsWith('_controller'))) {
        const config=await this._hass.callApi('GET','config/automation/config/'+encodeURIComponent(state.attributes.id)),m=config.variables?.marao_schedule;
        if(m?.manager==='marao-schedules'&&m.version===1&&m.role==='controller'){known.set(m.id,m);const index=options.findIndex(o=>o.value===m.id);if(index!==-1)options[index].label=m.name;else options.push({value:m.id,label:m.name});}
      }
      if(this._documentEpoch===epoch)render();
    }catch(error){if(this._documentEpoch===epoch)this._setStatus(this._error(error));}
  }
  _renderGroup(host,original) {
    if(original.popup_view) {
      const hint=document.createElement('p');hint.textContent=this._l('Edit cards and sections in the linked Home Assistant view.');host.append(hint);
      this._mountForm(host,{entity_type:original.entity_type || 'light'},[this._schema('entity_type','Entity type',{select:{options:[['light','Light'],['cover','Cover'],['climate','Climate'],['battery','Battery']].map(([value,name])=>({value,label:this._l(name)}))}})],value=>{const next={...this._config,entity_type:value.entity_type},errors=this._validateDescriptor(nativeConfigToDescriptor(next));this._setStatus(errors.map(error=>this._l(error)).join('\n'));if(!errors.length)this._commitDescriptor(next);});
      return;
    }
    let members=clone(original.entities || []),filterEdited=own(original,'popup_filter'),sections=clone(original.summary_sections || []),sectionsEdited=false;
    const group={entity_type:original.entity_type || 'light',popup_filter:original.popup_filter || (original.entity_type&&original.entity_type!=='light'?'all':'active')};
    const submit=()=>{
      const next={...nativeConfigToDescriptor(this._config),...group,entities:members,...(sectionsEdited?{summary_sections:sections}:{})};
      const errors=this._validateDescriptor(next);this._setStatus(errors.map(error=>this._l(error)).join('\n'));if(!errors.length)this._commitDescriptor(next);
    };
    host.innerHTML='<div data-group></div><div data-member-picker></div><div data-members></div><div data-sections></div>';
    const picker=()=>{
      const data={members:this._entityIds(members)},domain=group.entity_type==='battery'?'sensor':group.entity_type;
      this._mountForm(host.querySelector('[data-member-picker]'),data,[this._schema('members','Members',{entity:{domain:[domain],multiple:true}})],value=>{members=mergeEntityValues(members,value.members || []);render();renderSections();submit();});
    };
    const render=()=>{
      const rows=host.querySelector('[data-members]');rows.innerHTML=members.map((member,index)=>{const item=typeof member==='string'?{entity_id:member}:member;return `<div class="entity-row"><div class="entity-main"><div>${esc(item.name || this._hass?.states?.[item.entity_id]?.attributes?.friendly_name || item.entity_id)}</div><small>${esc(item.entity_id)}</small></div><div class="row-actions">${this._iconButton('mdi:arrow-up','Move up','up',index,index===0)}${this._iconButton('mdi:arrow-down','Move down','down',index,index===members.length-1)}${this._iconButton('mdi:pencil','Edit card','edit',index)}${this._iconButton('mdi:delete-outline','Delete','delete',index)}</div></div>`;}).join('');
      rows.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>{
        if(button.disabled)return;this._moveHaptic();const index=Number(button.dataset.room),action=button.dataset.action;
        if(action==='edit'){this._editMember(members[index],value=>{members[index]=value;render();submit();});return;}
        if(action==='delete'){const removed=this._entityIds([members[index]])[0];members.splice(index,1);sections=sections.map(section=>({...section,entities:section.entities.filter(id=>id!==removed)}));sectionsEdited ||= own(original,'summary_sections');renderSections();}else{const next=index+(action==='up'?-1:1);[members[index],members[next]]=[members[next],members[index]];}
        render();picker();submit();
      });
    };
    this._mountForm(host.querySelector('[data-group]'),group,[this._schema('entity_type','Entity type',{select:{mode:'dropdown',options:[['light','Light'],['cover','Cover'],['battery','Battery'],['climate','Climate']].map(([value,label])=>({value,label:this._l(label)}))}},true),this._schema('popup_filter','Popup filter',{select:{mode:'dropdown',options:[{value:'all',label:this._l('All entities')},{value:'active',label:this._l('Active only')}]}})],value=>{
      filterEdited ||= value.popup_filter!==group.popup_filter;
      if(value.entity_type!==group.entity_type&&!filterEdited)value.popup_filter=value.entity_type==='light'?'active':'all';
      Object.assign(group,value);host.querySelector('[data-group] ha-form').data={...group};picker();submit();
    });
    const renderSections=()=>{
      const box=host.querySelector('[data-sections]');box.replaceChildren();
      const add=document.createElement('button');add.type='button';add.textContent=this._l('Add section');add.onclick=()=>{this._moveHaptic();sections.push({id:'section-'+crypto.randomUUID().slice(0,8),name:this._l('Section')+' '+(sections.length+1),entities:[]});sectionsEdited=true;renderSections();submit();};box.append(add);
      sections.forEach((section,index)=>{
        const row=document.createElement('div');box.append(row);
        this._mountForm(row,section,[this._schema('name','Section name',{text:{}},true),this._schema('entities','Members',{select:{multiple:true,options:this._entityIds(members).map(id=>({value:id,label:this._hass?.states?.[id]?.attributes?.friendly_name || id}))}})],value=>{
          sections=sections.map((other,i)=>i===index?{...other,...value}:{...other,entities:other.entities.filter(id=>!value.entities.includes(id))});sectionsEdited=true;submit();
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
const EDITOR_CSS=`:host{display:block;min-width:0;color:var(--primary-text-color);font-family:var(--primary-font-family,inherit)}*{box-sizing:border-box}[hidden]{display:none!important}button{min-width:48px;min-height:48px;font:inherit;color:inherit;background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:16px;padding:8px;cursor:pointer}button:focus,summary:focus{outline:none}button:disabled{color:var(--disabled-text-color);cursor:default}[data-fields],[data-lists],[data-special],[data-advanced-form]{display:grid;gap:12px;min-width:0}summary{min-height:48px;padding:12px;cursor:pointer;overflow-wrap:anywhere}.load-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.load-row>span{flex:1 1 12ch;min-width:0;overflow-wrap:anywhere}.entity-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--divider-color)}.entity-main{flex:1 1 12ch;min-width:0;overflow-wrap:anywhere}.entity-meta,small{color:var(--secondary-text-color);overflow-wrap:anywhere}.row-actions{display:flex;flex-wrap:wrap;margin-inline-start:auto}.icon-action{display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;padding:12px;border:0;border-radius:50%;background:transparent}.dialog-content{display:grid;gap:12px;min-width:0}.dialog-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px}.advanced-form{padding:8px 0}.energy-contributors{display:grid;gap:12px}.page-section{padding:0 12px 12px;border:1px solid var(--divider-color);border-radius:16px;min-width:0}.page-section:not([open]){padding-bottom:0}.card-heading{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 -12px;padding:8px 12px;min-height:64px;list-style:none}.card-heading::-webkit-details-marker{display:none}.card-heading::after{content:'';width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);margin:6px}.page-section:not([open])>.card-heading::after{transform:rotate(-45deg)}.entity-name{font-weight:600}p{white-space:pre-line;overflow-wrap:anywhere}ha-form{display:block;min-width:0;max-width:100%}`;
Object.assign(MaraoCardEditor.prototype,cardFormMethods);
if(globalThis.customElements&&!customElements.get('marao-native-card-editor'))customElements.define('marao-native-card-editor',MaraoCardEditor);
