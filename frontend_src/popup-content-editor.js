import {catalog} from './native-model.js';
import {nativeCardType} from './card-composition.js';
import {popupTemplatesFor,popupTemplateCandidate,preparePopupCopy,popupContentIdentity,matchingPopupTemplate} from './popup-content.js';
import {popupContentError} from '../custom_components/marao_dashboard/frontend/MaraoPopupContent.js';
import {canonicalLayout} from '../custom_components/marao_dashboard/frontend/MaraoPopupLayout.js';
import {nativeDashboardConfig} from '../custom_components/marao_dashboard/frontend/MaraoNativeContext.js';
const copy=value=>structuredClone(value);
const button=(panel,host,label,action)=>{const node=document.createElement('ha-button');node.appearance='plain';node.textContent=panel._l(label);node.onclick=()=>{panel._moveHaptic();action();};host.append(node);return node;};
const form=(panel,host,data,fields,change)=>{const target=document.createElement('div');host.append(target);return panel._mountForm(target,data,fields.map(([key,label,selector])=>panel._schema(key,label,selector)),change);};

// Public Marao cards lead the suggestions in Home Assistant's full native picker.
export function popupCardChoices() {
  return [...catalog.cards.filter(card=>!card.hidden&&!['md_navbar_card','md_popup_card'].includes(card.id)).map(card=>({value:card.id,label:card.label,type:nativeCardType(card.id).replace('custom:','')})),{value:'camera-events',label:'Camera Events',type:'marao-camera-events-card'}];
}
export function renderPopupContent(panel,host) {
  if(panel._popupSection?.parentNode!==host){
    panel._popupInline?.dispose();panel._popupInline=null;
    const section=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');
    section.className='page-section';summary.className='card-heading';summary.textContent=panel._l('Popup settings');section.append(summary,body);
    section.open=Boolean(panel._popupExpanded);host.replaceChildren(section);panel._popupSection=section;
    section.addEventListener('toggle',()=>{
      panel._popupExpanded=section.open;
      if(section.open){if(!panel._popupInline)panel._popupInline=new PopupInline(panel,body);panel._popupInline.update();}
    });
    if(section.open){panel._popupInline=new PopupInline(panel,body);panel._popupInline.update();}
  }else panel._popupInline?.update();
}

export class PopupInline {
  constructor(panel,host){
    this.panel=panel;this.host=host;this.disposed=false;this.revision=0;this.key=Symbol('initial');
    this.events=new AbortController();this.subscriptions=new Set();this.dialogs=new Set();this.pickers=new WeakMap();
    host.addEventListener('context-request',event=>{
      const key=event.context,direct=['states','entities','devices','areas','floors','services'];
      if(typeof key!=='string'||!(['hassInternationalization','hassRegistries','hassApi','hassConnection','hassUi','hassConfig','hassFormatters'].includes(key)||direct.includes(key)))return;
      event.stopPropagation();const value=()=>direct.includes(key)?panel.hass?.[key]:panel.hass;
      const notify=()=>event.callback(value(),()=>this.subscriptions.delete(notify));
      if(event.subscribe)this.subscriptions.add(notify);notify();
    },{signal:this.events.signal});
    host.addEventListener('show-dialog',event=>{if(event.composedPath().some(node=>node===this.canvas||this.dialogs.has(node)))this.openDialog(event);},{capture:true,signal:this.events.signal});
    host.addEventListener('closed',event=>event.stopPropagation(),{signal:this.events.signal});
    this.group='marao-popup-'+crypto.getRandomValues(new Uint32Array(1))[0];
    this.controls=document.createElement('div');this.tools=document.createElement('div');this.canvas=document.createElement('div');
    this.error=document.createElement('p');this.error.setAttribute('role','alert');
    host.replaceChildren(this.controls,this.error,this.tools,this.canvas);this.canvas.style.cssText='min-width:0;max-width:100%';
  }
  assertCurrent(baseline,revision){
    const content=this.panel._config.popup_content?.mode==='custom'?this.panel._config.popup_content:this.content;
    if(this.disposed||revision!==this.revision||baseline!==canonicalLayout(content?.layout))throw new Error('Popup draft changed. Reopen the editor.');
  }
  saveDocument(next){
    if(this.disposed||!this.editable||!next||!Array.isArray(next.views)||next.views.length!==1)throw new Error('Popup draft is invalid.');
    const content={...this.content,layout:copy(next.views[0])};
    if(popupContentIdentity(content)===popupContentIdentity(this.content))return;
    this.sourceCopy?.accept(nativeDashboardConfig(this.panel.lovelace));
    const config={...this.panel._config,popup_content:content};
    const problem=popupContentError(config);if(problem)throw new Error(problem);
    this.panel._commitDescriptor(config);this.update();
  }
  async openDialog(event){
    event.stopImmediatePropagation();if(!this.editable||this.disposed)return;
    const {dialogTag,dialogImport,dialogParams={}}=event.detail||{};
    const baseline=canonicalLayout(this.content.layout),revision=this.revision;
    const pending=this.pendingDialogs??=new Set(),key=revision+':'+dialogTag;
    if(pending.has(key)||[...this.dialogs].some(dialog=>dialog.localName===dialogTag))return;
    pending.add(key);
    try{
      if(typeof dialogTag!=='string'||typeof dialogImport!=='function')throw new Error('Home Assistant editor could not load.');
      await dialogImport();this.assertCurrent(baseline,revision);this.error.textContent='';
      const dialog=document.createElement(dialogTag),params={...dialogParams};
      // Native dialogs keep their own local Save/Cancel. Only this owner can
      // apply their result, and this owner's save callback never writes HA.
      if(typeof params.saveConfig==='function')params.saveConfig=async next=>{this.assertCurrent(baseline,revision);return this.saveDocument(next);};
      if(typeof params.saveCardConfig==='function'){const apply=params.saveCardConfig;params.saveCardConfig=async next=>{this.assertCurrent(baseline,revision);return apply(next);};}
      if(params.lovelace)params.lovelace=this.view.lovelace;
      if(params.lovelaceConfig)params.lovelaceConfig=dialogTag==='hui-dialog-edit-card'?(nativeDashboardConfig(this.panel.lovelace)||params.lovelaceConfig):this.view.lovelace.config;
      if(dialogTag==='hui-dialog-select-view')params.allowDashboardChange=false;
      dialog._maraoPopupDraftOwner=this;dialog.hass=this.panel.hass;
      for(const name of ['config-changed','GUImode-changed','editor-save','closed'])dialog.addEventListener(name,event=>event.stopPropagation());
      dialog.addEventListener('dialog-closed',event=>{event.stopPropagation();if(event.detail?.dialog===dialogTag){this.dialogs.delete(dialog);dialog.remove();}});
      this.dialogs.add(dialog);this.host.append(dialog);
      try{await dialog.showDialog(params);if(dialogTag==='hui-dialog-create-card')dialog._currTab='card';if(this.disposed){this.dialogs.delete(dialog);dialog.remove();return;}this.isolate();}
      catch(error){this.dialogs.delete(dialog);dialog.remove();throw error;}
    }catch(error){if(!this.disposed)this.error.textContent=this.panel._error(error);}finally{pending.delete(key);}
  }
  resetSelection(){this.revision++;for(const dialog of this.dialogs)dialog.remove();this.dialogs.clear();}
  templateCandidates(){
    const parent={...this.panel._config};delete parent.popup_content;
    const key=canonicalLayout([parent,this.panel.hass?.language]);
    if(key!==this.templateKey){
      this.templateKey=key;this.templates=popupTemplatesFor(parent);this.candidates=new Map();this.templateErrors=new Map();
      for(const entry of this.templates)try{this.candidates.set(entry.id,popupTemplateCandidate(parent,entry.id,{}, {entities:this.panel._entities,hass:this.panel.hass,language:this.panel.hass?.language}));}catch(error){this.templateErrors.set(entry.id,error);}
    }
    return this.candidates;
  }
  update(){
    if(this.disposed)return;
    for(const notify of this.subscriptions)notify();
    for(const dialog of this.dialogs)dialog.hass=this.panel.hass;
    const panel=this.panel,problem=popupContentError(panel._config);if(problem){this.error.textContent=panel._l(problem);return;}
    const candidates=this.templateCandidates();
    let content,failure;
    this.sourceCopy=null;
    try{
      if(panel._config.popup_content?.mode==='custom')content=copy(panel._config.popup_content);
      else{this.sourceCopy=preparePopupCopy(panel._config,nativeDashboardConfig(panel.lovelace),decodeURIComponent(globalThis.location?.pathname?.split('/')[2]||''),{entities:panel._entities,hass:panel.hass,language:panel.hass?.language,sourceOpener:panel._popupCopyOrigin});content={...panel._config.popup_content,...this.sourceCopy.content};}
    }catch(error){failure=error;}
    this.content=content;this.editable=Boolean(content);
    const key=canonicalLayout([content,this.templateKey,failure?.message]);if(key===this.key){if(this.view)this.view.hass=panel.hass;return;}this.key=key;
    this.error.textContent=failure?panel._error(failure):'';this.controls.replaceChildren();this.tools.replaceChildren();
    const matched=content?matchingPopupTemplate(content,candidates):'custom';
    const options=this.templates.map(entry=>({value:entry.id,label:panel._l(entry.label)}));
    if(matched==='custom')options.push({value:'custom',label:panel._l('Custom')});
    const picker=form(panel,this.controls,{template:matched},[['template','Template',{select:{options,mode:'dropdown'}}]],value=>{
      if(this.disposed||this.templateForm!==picker)return;
      if(value.template==='custom'){picker.data={template:matched};return;}
      try{
        this.templateCandidates();const candidate=this.candidates.get(value.template);if(!candidate)throw this.templateErrors.get(value.template)||new Error('Choose a popup template.');
        if(canonicalLayout(panel._config.popup_content)===canonicalLayout(candidate))return;
        this.resetSelection();panel._commitDescriptor({...panel._config,popup_content:copy(candidate)});this.update();
      }catch(error){this.error.textContent=panel._error(error);picker.data={template:matched};}
    });this.templateForm=picker;
    if(!content){
      this.resetSelection();this.observer?.disconnect();this.canvas.replaceChildren();this.view=null;
      const advanced=document.createElement('details'),summary=document.createElement('summary');summary.textContent=panel._l('Advanced options');advanced.append(summary);button(panel,advanced,'Edit popup',()=>panel._editPopup());this.tools.append(advanced);return;
    }
    this.canvas.inert=false;
    if(!this.view){
      this.canvas.replaceChildren();this.view=document.createElement('hui-view');this.view.nativeOwner=panel;this.view.index=0;this.view.narrow=true;this.view.style.setProperty('--ha-view-sections-extra-top-margin','0px');this.canvas.append(this.view);
    }
    const config={title:'Popup draft',views:[copy(content.layout)]},baseline=canonicalLayout(content.layout),revision=this.revision;
    this.view._maraoEmbeddedPopup={view:config.views[0],index:0,owner:panel};this.view.hass=panel.hass;
    this.view.lovelace={config,rawConfig:config,current_view:0,editMode:true,embedded:true,urlPath:'marao-popup-draft',localize:panel.hass.localize,
      saveConfig:async next=>{this.assertCurrent(baseline,revision);return this.saveDocument(next);},setEditMode(){throw new Error('The popup editor owns this draft.');},showToast:options=>panel._popupEditorContext?.()?.root?.lovelace?.showToast?.(options)};
    this.observer?.disconnect();this.observer=new MutationObserver(()=>this.isolate());this.observer.observe(this.host,{subtree:true,childList:true});this.isolate();
    this.view.updateComplete?.then(()=>{if(!this.disposed)this.isolate();});
  }
  isolate(){
    const visit=node=>{for(const child of node.children||[]){
      if(child.localName==='ha-sortable'){
        const original=child.options?.group||child.group||'section',name=typeof original==='string'?original:original.name;
        child.dataset.popupGroupName??=name?.startsWith(this.group+'-')?name.slice(this.group.length+1):name||'section';
        const group=this.group+'-'+child.dataset.popupGroupName;if(child.group!==group)child.group=group;
        if(name!==group){child.options={...child.options,group:typeof original==='object'?{...original,name:group}:group};child.updateComplete?.then(()=>{if(!this.disposed)this.isolate();});}
      }
      if(child.localName==='hui-card-picker'&&Array.isArray(child._cards)&&this.pickers.get(child)!==child._cards){
        this.pickers.set(child,child._cards);
        const types=new Set(popupCardChoices().map(choice=>choice.type)),marao=child._cards.filter(entry=>entry.card?.isCustom&&types.has(entry.card.type));
        if(marao.length)child._suggestedCards=[...marao,...(child._suggestedCards||[]).filter(entry=>!marao.includes(entry))];
      }
      if(child.shadowRoot){this.observer.observe(child.shadowRoot,{subtree:true,childList:true});visit(child.shadowRoot);}visit(child);
    }};visit(this.host);
  }
  dispose(){this.disposed=true;this.events.abort();this.subscriptions.clear();this.observer?.disconnect();for(const dialog of this.dialogs)dialog.remove();this.dialogs.clear();this.view?.remove();}
}
