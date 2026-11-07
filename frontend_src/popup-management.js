import {composeNativeCard,nativeCardType,validateNativeCardConfig} from './card-composition.js';
import {canonicalTemplate} from './editor-model.js';
import {popupRole,popupHash,popupEditorSource,seedPopupView,resolvePopupView,popupCardPath} from '../custom_components/marao_dashboard/frontend/MaraoPopupLayout.js';
import {popupTemplate,popupSettings,popupCanonical,popupOwners,popupCardEntries,createManagedView,reconcileManagedView,adoptManagedView,managedPopupError} from '../custom_components/marao_dashboard/frontend/MaraoPopupManaged.js';

const copy=value=>structuredClone(value),same=(a,b)=>popupCanonical(a)===popupCanonical(b);
export function managedDescriptor(config) {
  const next=copy(config);next.template=canonicalTemplate(popupTemplate(next));
  if(!next.entity_id&&next.entity)next.entity_id=next.entity;
  if(next.template==='md_entity_group_card'&&!next.entities&&next.variables?.summary_entities){next.entities=copy(next.variables.summary_entities);next.entity_type=next.variables.entity_type;next.id||='group';}
  return next;
}
export function generatedPopupView(config,path,backPath,context={}) {
  const owner=managedDescriptor(config);
  validateNativeCardConfig({...owner,type:nativeCardType(owner.template)},context.entities||[]);
  if(!popupRole(owner))return null;
  delete owner.popup_view;delete owner.popup_content;
  const key=owner.template==='md_floor_plan_card'?'lights_popup':owner.template==='md_climate_card'?'mode_selector_hash':'popup_hash';
  if(owner.variables){delete owner.variables[key];if(!Object.keys(owner.variables).length)delete owner.variables;}
  const popup=composeNativeCard({...owner,type:nativeCardType(owner.template)},{...context,instanceId:'managed-'+path}).popups[0];
  if(!popup)return null;
  if(popup.entity_group?.members)popup.entity_group.members=popup.entity_group.members.map(member=>{
    const configured=owner.entities?.find(value=>(typeof value==='string'?value:value.entity_id)===member.entity_id),explicit=typeof configured==='object'?configured:{};
    const template=member.template||(owner.entity_type==='battery'?'md_battery_card':owner.entity_type==='cover'&&(['door','garage','gate'].includes(member.device_class)||/door|garage|gate/.test(member.entity_id))?'md_access_card':'md_'+owner.entity_type+'_card');
    // Registry/state metadata helps select a control but is not saved card data.
    return {...Object.fromEntries(Object.entries(member).filter(([key])=>Object.hasOwn(explicit,key)||['entity_id','name','icon','variables'].includes(key))),template};
  });
  const view=seedPopupView(popup,path,backPath,context.hass);
  // Native child cards own automatic details; retain only explicitly authored hashes.
  for(const {card}of popupCardEntries(view)) {
    const id=card.entity_id||card.entity;
    const member=owner.entities?.find?.(value=>typeof value==='object'&&value.entity_id===id);
    const configured=member?.variables||(id===(owner.entity_id||owner.entity)?config.variables:{});
    for(const route of ['popup_hash','mode_selector_hash','lights_popup'])if(card.variables?.[route]&&!configured?.[route])delete card.variables[route];
    if(card.variables&&!Object.keys(card.variables).length)delete card.variables;
  }
  return view;
}

export const newPopupPath=document=>{
  let path;do {const bytes=globalThis.crypto.getRandomValues(new Uint8Array(4));path='popup-'+Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');}while(document.views.some((view,index)=>String(view.path??index)===path));return path;
};
function patchAt(document,address,value) {let target=document;for(const key of address.slice(0,-1))target=target[key];target[address.at(-1)]=value;}
function rebase(view,path) {
  const result=copy(view),old=result.path;result.path=path;
  const visit=value=>{if(value?.type==='custom:marao-summary-actions'&&value.popup_view===old)value.popup_view=path;};
  // Only recognized action-card fields change; opaque user data is not traversed.
  for(const {card}of popupCardEntries(result))if(card.type==='custom:marao-summary-actions'&&card.popup_view===old)card.popup_view=path;
  if(result.marao_popup){for(const slot of Object.values(result.marao_popup.slots))visit(slot.base);for(const branch of Object.values(result.marao_popup.retained))for(const item of branch.instances)visit(item.card);for(const branch of Object.values(result.marao_popup.retained))for(const slot of Object.values(branch.slots))visit(slot.base);}
  return result;
}
function copyWithCustom(source,generated,owner,path) {
  const view=createManagedView(generated,owner);
  view.sections=[...copy(source.sections||[]),...view.sections];view.marao_popup.provenance='preserved-copy';
  for(const key of Object.keys(source))if(!['path','sections','marao_popup'].includes(key))view[key]=copy(source[key]);
  view.path=path;return view;
}

export function planPopupEdit(document,config,currentPath,backPath,context={}) {
  const owner=managedDescriptor(config),source=popupEditorSource(document,config,currentPath),next=copy(document),ownerAddress=popupCardPath(document,config,currentPath);
  const existingPath=source.opener.popup_view;
  let path=existingPath||newPopupPath(document),index=existingPath?resolvePopupView(document,path).index:-1;
  let generated=generatedPopupView(config,path,backPath,context);
  if(!generated)throw new Error('This card has no editable popup.');
  let view;
  if(index===-1) {
    if(source.popup) {
      const saved=seedPopupView(source.popup,path,backPath,context.hass),adopted=adoptManagedView(saved,owner,generated);
      view=adopted.view||copyWithCustom(saved,generated,owner,path);
    }else view=createManagedView(generated,owner);
    const address=popupCardPath(next,source.opener,currentPath);patchAt(next,address,{...source.opener,popup_view:path});next.views.push(view);
  }else {
    const old=next.views[index],error=managedPopupError(old);if(error)throw new Error(error);
    const owners=popupOwners(document).filter(binding=>binding.path===path);
    const incompatible=owners.some(binding=>!same(popupSettings(managedDescriptor(binding.config)),popupSettings(owner)));
    const adopted=old.marao_popup?{view:reconcileManagedView(old,owner,generated)}:adoptManagedView(old,owner,generated);
    if(!adopted.view||incompatible) {
      path=newPopupPath(next);generated=generatedPopupView(config,path,backPath,context);
      view=adopted.view?reconcileManagedView(rebase(adopted.view,path),owner,generated):copyWithCustom(old,generated,owner,path);
      const address=popupCardPath(next,config,currentPath);patchAt(next,address,{...config,popup_view:path});next.views.push(view);
    }else {view=adopted.view;next.views[index]=view;}
  }
  const opener=ownerAddress.reduce((value,key)=>value[key],next);
  return {config:next,view,path,opener};
}

function planManagedOnce(document,context) {
  const next=copy(document),bindings=popupOwners(next),groups=new Map();
  for(const binding of bindings)if(binding.path){const list=groups.get(binding.path)||[];list.push(binding);groups.set(binding.path,list);}
  for(const [path,owners]of groups) {
    const index=resolvePopupView(next,path).index,view=next.views[index];
    if(!view.marao_popup)continue;
    const error=managedPopupError(view);if(error)throw new Error(error);
    const bySettings=new Map();
    for(const binding of owners){if(binding.error)throw new Error(binding.error);const input=managedDescriptor(binding.config),key=popupCanonical(popupSettings(input));const list=bySettings.get(key)||[];list.push({...binding,input});bySettings.set(key,list);}
    const baseline=popupCanonical(view.marao_popup.settings),keep=bySettings.has(baseline)?baseline:bySettings.size===1?[...bySettings.keys()][0]:null;
    for(const [fingerprint,list]of bySettings) {
      const first=list[0];
      if(fingerprint===keep) {
        const generated=generatedPopupView(first.config,path,view.back_path,context);
        next.views[index]=reconcileManagedView(view,first.input,generated);
      }else {
        const forkPath=newPopupPath(next),fork=rebase(view,forkPath),generated=generatedPopupView(first.config,forkPath,view.back_path,context);
        const result=reconcileManagedView(fork,first.input,generated);next.views.push(result);
        for(const binding of list){popupCardPath(next,binding.config,binding.currentPath);patchAt(next,binding.address,{...binding.config,popup_view:forkPath});}
      }
    }
  }
  return next;
}
export function planManagedPopups(document,context={}) {
  let next=document;const seen=new Set();
  // A parent source may itself contain a card owning another managed source.
  // Resolve that dependency within the same proposed document and native save.
  for(let round=0;round<document.views.length+2;round++) {
    const fingerprint=popupCanonical(next);if(seen.has(fingerprint))break;seen.add(fingerprint);
    const proposed=planManagedOnce(next,context);if(same(next,proposed))return proposed;next=proposed;
  }
  throw new Error('Popup settings could not be reconciled. Check for circular popup references.');
}
