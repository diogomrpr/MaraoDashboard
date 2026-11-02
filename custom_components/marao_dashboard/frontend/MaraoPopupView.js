import {findNativeHost,nativeEditing,bindNativeEditing,nativeDashboardConfig} from './MaraoNativeContext.js';
import {resolvePopupView,popupGroupFromView,popupViewError,popupRole,popupLabel as label,canonicalLayout,savePopupLayout} from './MaraoPopupLayout.js';
import {createGroupScope,updateGroupScope,groupActionStyles} from './MaraoGroupDetails.js';
const parent=node=>node?.parentNode || node?.host || node?.getRootNode?.()?.host;
const metadata=hass=>Object.values(hass?.states || {}).map(state=>({entity_id:state.entity_id,device_class:state.attributes?.device_class}));
export const dashboardConfig=root=>nativeDashboardConfig(root?.lovelace);
function failure(host,error,hass) {const p=document.createElement('p');p.setAttribute('role','alert');p.textContent=label(error.message,hass);host.replaceChildren(p);}

/** Compatibility boundary: use HA's registered view host; never import or patch HA classes. */
export function mountPopupView(owner,host) {
  const root=findNativeHost(owner);let view,facade,disposed=false;
  const update=()=>{
    if(disposed)return;
    try {
      if(!root?.lovelace||!customElements.get('hui-view'))throw new Error('Native popup layouts are unavailable on this Home Assistant host.');
      const config=dashboardConfig(root),source=resolvePopupView(config,owner._config.popup_view);
      if(!view) {
        view=document.createElement('hui-view');view.nativeOwner=owner;view.style.cssText='display:block;min-width:0;width:100%';
        // Live popups never enter an editing surface, even through an emitted native event.
        for(const name of ['ll-create-card','ll-edit-card','ll-delete-card','ll-duplicate-card','ll-create-badge','ll-edit-badge','ll-delete-badge'])view.addEventListener(name,event=>event.stopImmediatePropagation(),true);
        host.replaceChildren(view);
      }
      if(facade?.config!==config)facade={...root.lovelace,config,rawConfig:config,editMode:false,current_view:source.index,
        saveConfig:()=>{throw new Error('Edit cards and sections in the linked Home Assistant view.');},
        setEditMode:()=>{throw new Error('Edit cards and sections in the linked Home Assistant view.');}};
      view.index=source.index;view.lovelace=facade;view.narrow=host.clientWidth<768;view.hass=owner._hass;
    }catch(error){view?.remove();view=null;failure(host,error,owner._hass);}
  };
  const controller={hostUpdated:update},subscribed=root?.addController&&root?.removeController;
  if(subscribed)root.addController(controller);
  const resize=new ResizeObserver(update);resize.observe(host);update();
  return {update,destroy(){disposed=true;resize.disconnect();if(subscribed)root.removeController(controller);view?.remove();view=null;}};
}

function openerFor(owner) {
  const native=owner.nativeOwner;
  if(native?.constructor?.template&&popupRole({...native._config,template:native.constructor.template})&&native._children?.[1]===owner)return native._config;
  if(!native&&owner._sourceConfig?.type==='custom:marao-popup-card')return owner._sourceConfig;
}
export function bindPopupLayoutControls(owner,api) {
  const root=findNativeHost(owner),opener=openerFor(owner);let linked=owner._config.popup_view;
  if(!root||!opener||!owner._hass?.user?.is_admin||owner.preview||owner._message||owner._historyContext)return ()=>{};
  const head=owner._overlay?.querySelector('.marao-popup-head');if(!head)return ()=>{};
  const tools=document.createElement('div');tools.className='marao-popup-layout-tools';tools.style.cssText='flex:none;padding:0 20px 8px;display:flex;flex-wrap:wrap;gap:8px;min-width:0';
  const style=document.createElement('style');style.textContent='.marao-popup-layout-tools button,.marao-popup-layout-tools a{box-sizing:border-box;min-width:48px;min-height:48px;border:0;border-radius:24px;padding:12px;font:inherit;overflow-wrap:anywhere;color:var(--primary-text-color);background:var(--secondary-background-color);cursor:pointer}.marao-popup-layout-tools button:disabled{opacity:.5;cursor:default}.marao-popup-layout-tools button:focus{outline:none}.marao-popup-layout-tools p{margin:0;width:100%;overflow-wrap:anywhere}';tools.append(style);
  const button=document.createElement('button');button.type='button';button.textContent=label(linked?'Edit layout':'Create editable layout',owner._hass);tools.append(button);
  const status=document.createElement('p');status.setAttribute('role','alert');tools.append(status);head.after(tools);
  let disposed=false,busy=false,uncertain=false,recoveryURL;
  const dashboardPath=location.pathname.split('/')[1],address=location.pathname,currentPath=(()=>{const route=decodeURIComponent(address.split('/')[2] || ''),views=dashboardConfig(root)?.views || [];return String(views.find((view,index)=>String(view.path ?? index)===route)?.path ?? (route&&/^\d+$/.test(route)?views[Number(route)]?.path:undefined) ?? (route || views[0]?.path || '0'));})(),identity=canonicalLayout(opener),user=owner._hass.user.id;
  const permitted=()=>!disposed&&owner._open&&location.pathname===address&&owner._hass?.user?.id===user&&owner._hass?.user?.is_admin&&!owner.preview&&owner._hass?.connection?.connected!==false&&owner._hass?.connected!==false;
  const edit=path=>{
    resolvePopupView(dashboardConfig(root),path);
    if(!root.hass?.user?.is_admin||root.hass?.connection?.connected===false||root.hass?.connected===false||typeof root.lovelace?.setEditMode!=='function')throw new Error('Layout creation requires an administrator on a connected, editable dashboard.');
    owner._close(true);api.navigate(`/${dashboardPath}/${path}`);root.lovelace.setEditMode(true);
  };
  button.onclick=async()=>{
    if(busy||uncertain||!permitted())return;api.haptic('heavy');
    try {
      if(linked){edit(linked);return;}
      busy=true;button.disabled=true;status.textContent=label('Creating layout…',owner._hass);
      const result=await savePopupLayout({hass:owner._hass,root,opener,popup:owner._config,currentPath,path:dashboardPath,backPath:address,isCurrent:()=>permitted()&&canonicalLayout(openerFor(owner))===identity,
        recovery:document=>{
          recoveryURL=URL.createObjectURL(new Blob([JSON.stringify(document,null,2)],{type:'application/json'}));
          const link=window.document.createElement('a');link.href=recoveryURL;link.download=`marao-popup-layout-recovery-${Date.now()}.json`;link.textContent=label('Download layout recovery',owner._hass);tools.append(link);link.click();
        }});
      linked=result.path;button.textContent=label('Edit layout',owner._hass);
      edit(linked);
    }catch(error){uncertain=error.message.startsWith('Save could not be confirmed.');status.textContent=label(error.message,owner._hass);}
    finally {busy=false;button.disabled=uncertain||!permitted();}
  };
  const release=()=>{disposed=true;tools.remove();if(recoveryURL&&!uncertain){const url=recoveryURL;setTimeout(()=>URL.revokeObjectURL(url),60000);}};
  release.update=()=>{button.disabled=busy||uncertain||!permitted();};release.update();return release;
}

export function registerPopupActions(api) {
  if(!globalThis.customElements||customElements.get('marao-summary-actions'))return;
  class SummaryActions extends (globalThis.HTMLElement || class {}) {
    constructor(){super();this.attachShadow({mode:'open'});}
    setConfig(config) {
      const error=popupViewError(config);if(error)throw new Error(error);
      if(!config.popup_view||!['all','section'].includes(config.scope)||!['light','cover','climate','battery'].includes(config.entity_type))throw new Error('Choose a same-dashboard Sections view.');
      this._config=structuredClone(config);this._scope=null;this._render();
    }
    set hass(value){this._hass=value;this._render();}
    get preview(){return Boolean(!this.isConnected||this._preview||nativeEditing(this));}
    set preview(value){this._preview=Boolean(value);this._render();}
    connectedCallback(){this._release=bindNativeEditing(this,()=>this._render());this._root=findNativeHost(this);this._controller={hostUpdated:()=>this._render()};this._root?.addController?.(this._controller);this._render();}
    disconnectedCallback(){this._release?.();this._root?.removeController?.(this._controller);}
    getGridOptions(){return {columns:12,rows:'auto',min_columns:6};}
    getCardSize(){return 2;}
    _render() {
      if(!this._config||!this.shadowRoot)return;
      try {
        const root=findNativeHost(this),source=resolvePopupView(dashboardConfig(root),this._config.popup_view);
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
