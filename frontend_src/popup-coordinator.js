import {nativeDashboardConfig,nativeDashboardHasDraft} from '../custom_components/marao_dashboard/frontend/MaraoNativeContext.js';
import {popupCanonical,managedPopupIssue} from '../custom_components/marao_dashboard/frontend/MaraoPopupManaged.js';
import {popupAuthoringAllowed,commitPopupDocument,reconcilePopupTransaction} from '../custom_components/marao_dashboard/frontend/MaraoPopupTransaction.js';
import {popupLabel} from '../custom_components/marao_dashboard/frontend/MaraoPopupLayout.js';
import {planManagedPopups} from './popup-management.js';
const same=(a,b)=>popupCanonical(a)===popupCanonical(b);

// Observes confirmed HA saves. Loading a dashboard never repairs or writes it.
export function createPopupCoordinator(root,options={}) {
  const route=options.route||(()=>globalThis.location?.pathname.split('/')[1]);
  const dirty=options.dirty||(()=>nativeDashboardHasDraft(root));
  let subscription,unsubscribe,identity,epoch=0,pending=false,running=false,disposed=false;
  let blockedView,wasInert,notice;
  const config=()=>nativeDashboardConfig(root.lovelace);
  const paths=()=>config()?.views?.filter(view=>view.marao_popup).map((view,index)=>String(view.path??config().views.indexOf(view)))||[];
  const alive=token=>!disposed&&epoch===token&&root.isConnected&&route()===identity?.path&&root.hass?.user?.id===identity?.user&&root.hass?.connection===identity?.connection;
  const current=token=>alive(token)&&!dirty();
  const notify=()=>{root.requestUpdate?.();protect();};
  function releaseView(){if(blockedView&&blockedView.inert===true)blockedView.inert=wasInert;blockedView=null;notice?.remove();notice=null;}
  function protect() {
    const document=config(),host=root.shadowRoot?.querySelector?.('hui-view');
    const index=root.lovelace?.current_view??host?.index,view=document?.views?.[index];
    const path=view&&String(view.path??index),issue=view?.marao_popup&&managedPopupIssue(document,path,root._maraoPopupSync?.get(path));
    if(!issue||root.lovelace?.editMode||!host){releaseView();return;}
    if(host!==blockedView){releaseView();blockedView=host;wasInert=Boolean(host.inert);}
    host.inert=true;
    if(!notice){notice=globalThis.document.createElement('p');notice.setAttribute('role','alert');root.shadowRoot.append(notice);}
    notice.textContent=popupLabel(issue,root.hass);
  }
  async function drain() {
    if(running||!pending||!identity)return;
    const token=epoch;
    if(!current(token)||root._maraoPopupWrite)return;
    running=true;pending=false;let busy=false,waitHost=false;
    try {
      const hass=root.hass,path=identity.path,context={hass,root,path,journal:options.journal,isCurrent:()=>current(token)};
      if(!popupAuthoringAllowed(context))return;
      const original=await hass.callWS({type:'lovelace/config',url_path:path,force:true});
      if(!current(token))return;
      // HA can notify before its host has accepted the saved document. Wait for
      // a host update; do not mistake a draft for a saved parent change.
      if(!same(config(),original)){pending=true;waitHost=true;return;}
      await reconcilePopupTransaction(context,original);if(!current(token))return;
      const entities=Object.values(hass.states||{}).map(state=>({...state.attributes,entity_id:state.entity_id}));
      const proposed=planManagedPopups(original,{entities,hass,dashboardRoot:path,language:hass.language});
      if(same(original,proposed)){root._maraoPopupSync=new Map();notify();return;}
      root._maraoPopupSync=new Map(paths().map(source=>[source,{busy:true}]));busy=true;notify();
      await commitPopupDocument(context,original,proposed);
      if(current(token)){root._maraoPopupSync=new Map();notify();}
    }catch(error){
      if(current(token)){root._maraoPopupSync=new Map(paths().map(source=>[source,{error:error.message}]));notify();}
    }finally{running=false;if(busy)protect();if(pending&&!waitHost&&current(token))queueMicrotask(()=>{if(!root._maraoPopupWrite)drain();});}
  }
  function stop(){epoch++;unsubscribe?.();unsubscribe=null;subscription=null;identity=null;pending=false;root._maraoPopupSync=new Map();releaseView();}
  return {
    sync(){
      if(disposed)return;
      const hass=root.hass,path=root.panel?.url_path||root.panel?.config?.url_path||route();
      const eligible=root.isConnected&&route()===path&&hass?.user?.is_admin&&hass?.user?.id&&hass.connected!==false&&hass.connection?.connected!==false&&typeof hass.connection?.subscribeEvents==='function'&&typeof root.lovelace?.saveConfig==='function'&&(!root.lovelace.mode||root.lovelace.mode==='storage')&&paths().length;
      if(!eligible){if(identity)stop();protect();return;}
      if(!identity||identity.path!==path||identity.user!==hass.user.id||identity.connection!==hass.connection){
        stop();identity={path,user:hass.user.id,connection:hass.connection};const token=epoch;
        subscription=Promise.resolve(hass.connection.subscribeEvents(event=>{if(event.data?.url_path!==path||!alive(token))return;pending=true;drain();},'lovelace_updated')).then(release=>{if(epoch!==token||disposed)release();else unsubscribe=release;}).catch(error=>{if(epoch===token){root._maraoPopupSync=new Map(paths().map(source=>[source,{error:error.message}]));notify();}});
      }
      protect();if(pending)drain();
    },
    dispose(){disposed=true;stop();},
    // Kept observable for the narrow host-lifecycle tests, not a save API.
    async settled(){await subscription;while(running)await new Promise(resolve=>setTimeout(resolve,0));},
  };
}
