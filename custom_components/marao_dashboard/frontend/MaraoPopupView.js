import {customPopup,validatePopupContent,embeddedPopupContext} from './MaraoPopupContent.js';
import {findNativeHost,nativeEditing,bindNativeEditing,nativeDashboardConfig} from './MaraoNativeContext.js';
import {resolvePopupView,popupGroupFromView,popupViewError,popupLabel as label} from './MaraoPopupLayout.js';
import {createGroupScope,updateGroupScope,groupActionStyles} from './MaraoGroupDetails.js';
import {managedPopupIssue} from './MaraoPopupManaged.js';
const parent=node=>node?.parentNode || node?.host || node?.getRootNode?.()?.host;
const metadata=hass=>Object.values(hass?.states || {}).map(state=>({entity_id:state.entity_id,device_class:state.attributes?.device_class}));
export const dashboardConfig=root=>nativeDashboardConfig(root?.lovelace);
function failure(host,error,hass) {const p=document.createElement('p');p.setAttribute('role','alert');p.textContent=label(error.message,hass);host.replaceChildren(p);}
function ownsFocus(view){let node=globalThis.document?.activeElement;while(node?.shadowRoot?.activeElement)node=node.shadowRoot.activeElement;for(;node;node=parent(node))if(node===view)return true;return false;}

/** Compatibility boundary: use HA's registered view host; never import or patch HA classes. */
export function mountPopupView(owner,host) {
  const root=findNativeHost(owner);let view,facade,disposed=false,embeddedConfig;
  const embedded=customPopup(owner._config);
  if(embedded){validatePopupContent(owner._config);const original=dashboardConfig(root)||{views:[]};embeddedConfig={...original,views:[...(original.views||[]),structuredClone(owner._config.popup_content.layout)]};}
  const update=()=>{
    if(disposed)return;
    try {
      if(!root?.lovelace||!customElements.get('hui-view'))throw new Error('Native popup layouts are unavailable on this Home Assistant host.');
      const config=embedded?embeddedConfig:dashboardConfig(root),source=embedded?{view:config.views.at(-1),index:config.views.length-1}:resolvePopupView(config,owner._config.popup_view);
      const issue=!embedded&&managedPopupIssue(config,owner._config.popup_view,root._maraoPopupSync?.get(owner._config.popup_view));if(issue)throw new Error(issue);
      if(!view) {
        view=document.createElement('hui-view');view.nativeOwner=owner;if(embedded)view._maraoEmbeddedPopup={...source,owner};view.style.cssText='display:block;min-width:0;width:100%';
        // Live popups never enter an editing surface, even through an emitted native event.
        for(const name of ['ll-create-card','ll-edit-card','ll-delete-card','ll-duplicate-card','ll-create-badge','ll-edit-badge','ll-delete-badge'])view.addEventListener(name,event=>event.stopImmediatePropagation(),true);
        host.replaceChildren(view);
      }
      if(facade?.config!==config)facade={...root.lovelace,config,rawConfig:config,editMode:false,current_view:source.index,
        saveConfig:()=>{throw new Error('Edit cards and sections in the linked Home Assistant view.');},
        setEditMode:()=>{throw new Error('Edit cards and sections in the linked Home Assistant view.');}};
      view.index=source.index;view.lovelace=facade;view.narrow=host.clientWidth<768;view.hass=owner._hass;
    }catch(error){if(view&&ownsFocus(view))owner._overlay?.querySelector('.marao-popup-close')?.focus({preventScroll:true});view?.remove();view=null;failure(host,error,owner._hass);}
  };
  const controller={hostUpdated:update},subscribed=root?.addController&&root?.removeController;
  if(subscribed)root.addController(controller);
  const resize=new ResizeObserver(update);resize.observe(host);update();
  return {update,destroy(){disposed=true;resize.disconnect();if(subscribed)root.removeController(controller);view?.remove();view=null;}};
}

export function registerPopupActions(api) {
  if(!globalThis.customElements||customElements.get('marao-summary-actions'))return;
  class SummaryActions extends (globalThis.HTMLElement || class {}) {
    constructor(){super();this.attachShadow({mode:'open'});}
    setConfig(config) {
      const error=popupViewError(config);if(error)throw new Error(error);
      if((!config.popup_view&&config.popup_scope!=='embedded')||!['all','section'].includes(config.scope)||!['light','cover','climate','battery'].includes(config.entity_type))throw new Error('Choose a same-dashboard Sections view.');
      this._config=structuredClone(config);this._scope=null;this._render();
    }
    set hass(value){this._hass=value;this._render();}
    get preview(){const root=findNativeHost(this);return Boolean(!this.isConnected||this._preview||nativeEditing(this)||this._config&&managedPopupIssue(dashboardConfig(root),this._config.popup_view,root?._maraoPopupSync?.get(this._config.popup_view)));}
    set preview(value){this._preview=Boolean(value);this._render();}
    connectedCallback(){this._release=bindNativeEditing(this,()=>this._render());this._root=findNativeHost(this);this._controller={hostUpdated:()=>this._render()};this._root?.addController?.(this._controller);this._render();}
    disconnectedCallback(){this._release?.();this._root?.removeController?.(this._controller);}
    getGridOptions(){return {columns:12,rows:'auto',min_columns:6};}
    getCardSize(){return 2;}
    _render() {
      if(!this._config||!this.shadowRoot)return;
      try {
        const root=findNativeHost(this),embedded=this._config.popup_scope==='embedded'?embeddedPopupContext(this):null;
        if(this._config.popup_scope==='embedded'&&!embedded)throw new Error('Popup source is missing or ambiguous.');
        const source=embedded||resolvePopupView(dashboardConfig(root),this._config.popup_view);
        const issue=!embedded&&managedPopupIssue(dashboardConfig(root),this._config.popup_view,root?._maraoPopupSync?.get(this._config.popup_view));if(issue)throw new Error(issue);
        let section;for(let node=this;node;node=parent(node))if(node.localName==='hui-section'){section=node;break;}
        if(!section||section.viewIndex!==source.index||!Number.isInteger(section.index)||!source.view.sections?.[section.index])throw new Error('Section action must belong to its linked Sections view.');
        const group=popupGroupFromView(this._config,source.view,metadata(this._hass)),part=this._config.scope==='all'?{id:'__all',name:source.view.title,entities:group.entities}:group.summary_sections[section.index];
        if(!this._scope) {
          this.shadowRoot.replaceChildren();const style=document.createElement('style');style.textContent=':host{display:block;min-width:0;font-family:var(--primary-font-family,inherit)}'+groupActionStyles;this.shadowRoot.append(style);
          this._scope=createGroupScope(this,{...part,name:''},group,api,this.shadowRoot,()=>this._render());
        }
        Object.assign(this._scope,part);updateGroupScope(this,this._scope,group,api);
      }catch(error){this._scope=null;failure(this.shadowRoot,error,this._hass);}
    }
  }
  customElements.define('marao-summary-actions',SummaryActions);
}
