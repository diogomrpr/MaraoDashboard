import {popupCanonical} from './MaraoPopupManaged.js';
import {nativeDashboardConfig} from './MaraoNativeContext.js';
const same=(a,b)=>popupCanonical(a)===popupCanonical(b);
const STORAGE_ERROR='Popup changes could not be preserved internally. Try again when browser storage is available.';
export const POPUP_UNCERTAIN='Save could not be confirmed. Reopen the editor to reconcile this popup.';
let database;
function openDatabase() {
  if(!database)database=new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(new Error(STORAGE_ERROR));return;}
    const request=indexedDB.open('marao-popup-transactions',1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('pending'))request.result.createObjectStore('pending');};
    request.onerror=request.onblocked=()=>reject(new Error(STORAGE_ERROR));
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};
  }).catch(error=>{database=null;throw error;});
  return database;
}
async function stored(mode,run) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('pending',mode),store=tx.objectStore('pending');let result,failure;
    tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(failure||new Error(STORAGE_ERROR));
    try{run(store,value=>{result=value;},error=>{failure=error;tx.abort();});}catch(error){failure=error;tx.abort();}
  });
}
export const popupTransactionJournal={
  read:key=>stored('readonly',(store,done)=>{const request=store.get(key);request.onsuccess=()=>done(request.result);}),
  stage:(key,value)=>stored('readwrite',(store,done,fail)=>{const read=store.get(key);read.onsuccess=()=>{if(read.result){fail(new Error('A popup update is already pending. Reopen the editor to reconcile it.'));return;}store.put(value,key);done();};}),
  clear:(key,id)=>stored('readwrite',(store,done,fail)=>{const read=store.get(key);read.onsuccess=()=>{if(read.result&&read.result.id!==id){fail(new Error('A popup update is already pending. Reopen the editor to reconcile it.'));return;}store.delete(key);done();};}),
};

export const popupAuthoringAllowed=({hass,root,isCurrent})=>Boolean(hass?.user?.is_admin&&hass.connected!==false&&hass.connection?.connected!==false&&isCurrent()&&Array.isArray(nativeDashboardConfig(root?.lovelace)?.views)&&typeof root.lovelace.saveConfig==='function'&&(!root.lovelace.mode||root.lovelace.mode==='storage'));
const uncertain=cause=>Object.assign(new Error(POPUP_UNCERTAIN,{cause}),{code:'popup_uncertain'});
export async function reconcilePopupTransaction(context,current) {
  const journal=context.journal||popupTransactionJournal,key=JSON.stringify([context.origin||globalThis.location?.origin,context.hass?.user?.id,context.path]);
  const pending=await journal.read(key);
  if(!pending)return {journal,key};
  if(pending.version!==1||!pending.original||!pending.proposed||!pending.id)throw uncertain();
  if(same(current,pending.original)||same(current,pending.proposed))await journal.clear(key,pending.id);
  else throw uncertain();
  return {journal,key};
}

export async function commitPopupDocument(context,original,proposed) {
  const {hass,root,path}=context;
  if(same(original,proposed))return original;
  if(root._maraoPopupWrite)throw new Error('A popup update is already pending. Reopen the editor to reconcile it.');
  const work=(async()=>{
    if(!popupAuthoringAllowed(context))throw new Error('Layout creation requires an administrator on a connected, editable dashboard.');
    if(!same(nativeDashboardConfig(root.lovelace),original))throw new Error('Save this dashboard before editing its popup.');
    const {journal,key}=await reconcilePopupTransaction(context,original);
    const id=Array.from(crypto.getRandomValues(new Uint32Array(4)),value=>value.toString(16)).join('-');
    const record={version:1,id,original:structuredClone(original),proposed:structuredClone(proposed)};
    let staged=false,sent=false;
    try {
      await journal.stage(key,record);staged=true;
      const fresh=await hass.callWS({type:'lovelace/config',url_path:path,force:true});
      if(!popupAuthoringAllowed(context)||!same(fresh,original)||!same(nativeDashboardConfig(root.lovelace),original))throw new Error('Dashboard changed. Reopen the card editor and try again.');
      sent=true;let failure;
      try{await root.lovelace.saveConfig(proposed);}catch(error){failure=error;}
      let actual;try{actual=await hass.callWS({type:'lovelace/config',url_path:path,force:true});}catch(error){failure||=error;}
      if(actual&&same(actual,proposed)){await journal.clear(key,id);return actual;}
      if(actual&&same(actual,original)){await journal.clear(key,id);throw new Error('Popup update was not saved. Your configuration was retained.',{cause:failure});}
      throw uncertain(failure);
    }catch(error){if(staged&&!sent)await journal.clear(key,id);throw error;}
  })();
  root._maraoPopupWrite=work;
  try{return await work;}finally{if(root._maraoPopupWrite===work)delete root._maraoPopupWrite;}
}
