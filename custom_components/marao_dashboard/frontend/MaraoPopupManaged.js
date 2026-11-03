// Persisted popup ownership is independent of package and dashboard versions.
export const MANAGED_POPUP_VERSION = 1;
export const popupCanonical = value => JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const copy=value=>structuredClone(value),own=(value,key)=>Object.hasOwn(value||{},key);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const same=(a,b)=>popupCanonical(a)===popupCanonical(b);
const routeKeys=new Set(['popup_hash','mode_selector_hash','lights_popup']);
export const POPUP_TEMPLATES=['md_entity_group_card','md_scene_collection_card','md_climate_card','md_media_card','md_camera_card','md_energy_period_card','md_graph_card','md_security_card','md_access_card','md_floor_plan_card'];
export const popupHashFor=config=>config.variables?.[popupTemplate(config)==='md_floor_plan_card'?'lights_popup':popupTemplate(config)==='md_climate_card'?'mode_selector_hash':'popup_hash'];
const presentation=key=>key==='app_logo'||/color|background|(^|_)icon|(^|_)name|label|prefix|suffix/.test(key);
export const popupPresentationVariable=key=>presentation(key)||routeKeys.has(key);
const functionalKeys=new Set(['type','template','entity','entity_id','entity_type','scope','popup_view','cameras','event_provider','provider','frigate_instance_id','frigate_camera','unifi_protect_media_source','limit','columns','period','sub_entities','calculate_cost','cost_per_kwh','display_unit','display_precision','remote_entity','volume_remote_entity','source','service','target','data','command','seekOffset','hold','holdData','repeat','tap_action','hold_action','double_tap_action','lights','image_id','full_page']);

export function popupTemplate(config) {
  if(config.template)return config.template;
  const type=config.type?.replace(/^custom:marao-/,'');
  return type==='energy-card'?'md_energy_period_card':type==='floorplan-card'?'md_floor_plan_card':type?.endsWith('-card')?'md_'+type.replaceAll('-','_'):'';
}
export function popupSettings(config) {
  const result={template:popupTemplate(config)};
  for(const key of ['name','name_key','icon','entity_type','entities','summary_sections','popup_filter','apple_tv','graph_entity','event_provider','frigate_camera','frigate_instance_id','unifi_protect_media_source','event_limit','tap_action','hold_action','double_tap_action'])if(own(config,key))result[key]=copy(config[key]);
  if(config.entity_id||config.entity)result.entity_id=config.entity_id||config.entity;
  if(own(config,'variables'))result.variables=Object.fromEntries(Object.entries(config.variables||{}).filter(([key])=>!routeKeys.has(key)).map(([key,value])=>[key,copy(value)]));
  return result;
}
export const popupFamily=config=>popupTemplate(config)+(popupTemplate(config)==='md_entity_group_card'?':'+(config.entity_type||'light'):'');

export function popupCardEntries(view) {
  const result=[];
  const visit=(cards,section,parent=null)=>{
    if(!Array.isArray(cards))return;
    cards.forEach((card,index)=>{if(!object(card))return;const entry={card,cards,index,section,parent};result.push(entry);visit(card.cards,section,entry);});
  };
  (view.sections||[]).forEach((section,index)=>visit(section.cards,index));return result;
}
const immediate=card=>Object.fromEntries(Object.entries(card).filter(([key])=>!['cards','marao_popup_slot'].includes(key)).map(([key,value])=>[key,copy(value)]));
const managedCandidate=card=>card.type?.startsWith('custom:marao-')&&!['custom:marao-popup-card'].includes(card.type)||['grid','vertical-stack','horizontal-stack'].includes(card.type)&&card.cards?.some(managedCandidate);
export function popupFunctionalPaths(card) {
  const paths=[];
  for(const key of Object.keys(card)) {
    if(key==='variables'){for(const child of Object.keys(card.variables||{}))if(!presentation(child)&&!routeKeys.has(child))paths.push(['variables',child]);}
    else if(functionalKeys.has(key)&&!(key==='popup_view'&&card.type!=='custom:marao-summary-actions')&&!(['grid','vertical-stack','horizontal-stack'].includes(card.type)&&key==='columns'))paths.push([key]);
  }
  return paths;
}
const at=(value,path)=>path.reduce((item,key)=>item?.[key],value);
const has=(value,path)=>path.length===1?own(value,path[0]):own(value?.[path[0]],path[1]);
function put(value,path,source) {
  if(path.length===1){if(own(source,path[0]))value[path[0]]=copy(source[path[0]]);else delete value[path[0]];return;}
  if(has(source,path)){value[path[0]]||={};value[path[0]][path[1]]=copy(at(source,path));}
  else if(object(value[path[0]])){delete value[path[0]][path[1]];if(!Object.keys(value[path[0]]).length&&!own(source,path[0]))delete value[path[0]];}
}
const sameField=(a,b,path)=>has(a,path)===has(b,path)&&same(at(a,path),at(b,path));
const pathsFor=(a,b)=>[...new Map([...popupFunctionalPaths(a),...popupFunctionalPaths(b)].map(path=>[path.join('.'),path])).values()];
function retainEntitySpelling(base,next) {
  if(own(base,'entity')&&!own(base,'entity_id')&&own(next,'entity_id')){next.entity=next.entity_id;delete next.entity_id;}
  else if(own(base,'entity_id')&&!own(base,'entity')&&own(next,'entity')){next.entity_id=next.entity;delete next.entity;}
}
export const managedFunctionalOverride=(card,base)=>pathsFor(card,base).some(path=>!sameField(card,base,path));

export function managedPopupError(view) {
  if(!own(view,'marao_popup'))return;
  const value=view.marao_popup;
  if(!object(value)||value.version!==1)return 'This popup layout needs a compatible Marao version.';
  if(typeof value.family!=='string'||!object(value.settings)||!object(value.slots)||!Array.isArray(value.suppressed)||!object(value.retained))return 'Popup management data is invalid.';
  for(const [key,slot]of Object.entries(value.slots))if(!key||!object(slot)||!object(slot.base))return 'Popup management data is invalid.';
  if(value.suppressed.some(key=>typeof key!=='string'))return 'Popup management data is invalid.';
  for(const branch of Object.values(value.retained)) {
    if(!object(branch)||!object(branch.slots)||!Array.isArray(branch.instances)||!Array.isArray(branch.suppressed)||!object(branch.settings))return 'Popup management data is invalid.';
    if(Object.values(branch.slots).some(slot=>!object(slot)||!object(slot.base))||branch.instances.some(entry=>!object(entry)||!object(entry.card)||typeof entry.card.marao_popup_slot!=='string'||!Number.isSafeInteger(entry.section)||entry.section<0||!Number.isSafeInteger(entry.index)||entry.index<0||entry.parent!==null&&(!Number.isSafeInteger(entry.parent)||entry.parent<0)))return 'Popup management data is invalid.';
  }
}
export function managedPopupIssue(document,path,status) {
  const views=document?.views?.filter((view,index)=>String(view.path??index)===String(path));
  if(views?.length!==1)return 'Popup source is missing or ambiguous.';
  const view=views[0];if(!view.marao_popup)return;
  const error=managedPopupError(view);if(error)return error;
  if(status?.busy)return 'Updating popup…';
  if(status?.error)return status.error;
  const owners=popupOwners(document).filter(owner=>owner.path===String(path));
  if(owners.some(owner=>owner.error||!same(popupSettings(owner.config),view.marao_popup.settings)))return 'Popup settings changed. Use Edit popup to update its controls.';
  if(view.marao_popup.active===false)return 'This popup is inactive. Change its card settings before using it.';
}
function assertManaged(view){const error=managedPopupError(view);if(error)throw new Error(error);}

export function createManagedView(source,owner) {
  const view=copy(source),counts=new Map(),slots={};
  for(const {card}of popupCardEntries(view)) {
    if(!managedCandidate(card))continue;
    const template=popupTemplate(card)||card.type;
    const member=['md_entity_group_card','md_scene_collection_card'].includes(popupTemplate(owner));
    const entity=card.entity_id||card.entity;
    const role=member&&entity?'member:'+entity:template==='md_media_app_card'?'app:'+card.variables?.app_source:card.type==='custom:marao-summary-actions'?'actions:'+card.scope:template;
    const occurrence=counts.get(role)||0;counts.set(role,occurrence+1);
    const key=role+(member&&entity?'':':'+occurrence);
    card.marao_popup_slot=key;
    slots[key]={base:immediate(card)};
  }
  view.marao_popup={version:1,family:popupFamily(owner),settings:popupSettings(owner),slots,suppressed:[],retained:{},active:true};
  return view;
}

function mergeCard(card,base,next) {
  const functional=pathsFor(base,next);
  const keys=new Set([...Object.keys(base),...Object.keys(next)]);
  for(const key of keys) {
    if(['cards','marao_popup_slot','visibility'].includes(key))continue;
    if(key==='variables') {
      for(const child of new Set([...Object.keys(base.variables||{}),...Object.keys(next.variables||{})])) {
        const path=['variables',child];
        if(functional.some(item=>same(item,path))||sameField(card,base,path))put(card,path,next);
      }
    }else if(functional.some(path=>path.length===1&&path[0]===key)||sameField(card,base,[key]))put(card,[key],next);
  }
  if((Array.isArray(base.visibility)||Array.isArray(next.visibility))&&!sameField(base,next,['visibility'])) {
    const custom=copy(card.visibility||[]);
    for(const old of base.visibility||[]){const index=custom.findIndex(value=>same(value,old));if(index!==-1)custom.splice(index,1);}
    const conditions=[...copy(next.visibility||[]),...custom];
    if(conditions.length||own(card,'visibility'))card.visibility=conditions;else delete card.visibility;
  }
}

function archive(view,record) {
  const entries=popupCardEntries(view),marked=entries.filter(({card})=>own(record.slots,card.marao_popup_slot));
  const instances=marked.map(entry=>({card:{...immediate(entry.card),marao_popup_slot:entry.card.marao_popup_slot},container:Array.isArray(entry.card.cards),section:entry.section,index:entry.index,parent:entry.parent&&marked.includes(entry.parent)?marked.indexOf(entry.parent):null,parentShape:entry.parent&&!marked.includes(entry.parent)?immediate(entry.parent.card):null}));
  const present=new Set(marked.map(({card})=>card.marao_popup_slot));
  return {slots:copy(record.slots),settings:copy(record.settings),instances,suppressed:[...new Set([...record.suppressed,...Object.keys(record.slots).filter(key=>!present.has(key))])]};
}
function removeManaged(cards,slots) {
  return (cards||[]).flatMap(card=>{
    if(Array.isArray(card.cards))card.cards=removeManaged(card.cards,slots);
    return own(slots,card.marao_popup_slot)?card.cards||[]:[card];
  });
}
function sectionCards(view,index) {
  while(view.sections.length<=index)view.sections.push({type:'grid',cards:[]});
  return view.sections[index].cards||=([]);
}
function restore(view,branch,newSlots) {
  const restored=new Map();
  branch.instances.forEach((entry,index)=>{
    if(!own(newSlots,entry.card.marao_popup_slot))return;
    const card=copy(entry.card);if(entry.container)card.cards=[];
    const parent=entry.parent!==null?restored.get(entry.parent):null;
    const customParent=entry.parentShape?popupCardEntries(view).filter(item=>same(immediate(item.card),entry.parentShape)):[];
    const cards=parent?.cards||(customParent.length===1?(customParent[0].card.cards||=[]):sectionCards(view,entry.section));
    cards.splice(Math.min(entry.index,cards.length),0,card);restored.set(index,card);
  });
}

export function reconcileManagedView(source,owner,generated) {
  assertManaged(source);
  if(!source.marao_popup)throw new Error('Popup layout has no management provenance.');
  const view=copy(source),record=view.marao_popup;
  if(!generated){record.settings=popupSettings(owner);record.active=false;return view;}
  const defaults=createManagedView(generated,owner),newSlots=defaults.marao_popup.slots;
  let baseSlots=record.slots,suppressed=new Set(record.suppressed),transitionLayout=[];
  // A YAML functional override is a custom card, never a reason to overwrite it.
  for(const {card}of popupCardEntries(view))if(own(baseSlots,card.marao_popup_slot)&&managedFunctionalOverride(card,baseSlots[card.marao_popup_slot].base))delete card.marao_popup_slot;
  if(record.active!==false&&record.family===popupFamily(owner)&&same(record.settings,popupSettings(owner))) {
    // Runtime metadata, localization and changed generator defaults are not a
    // parent settings edit. Only normalize explicit deletions/detachments here.
    const present=new Set(popupCardEntries(view).map(({card})=>card.marao_popup_slot));
    record.suppressed=[...new Set([...record.suppressed,...Object.keys(baseSlots).filter(key=>!present.has(key))])];
    return view;
  }
  if(record.family!==popupFamily(owner)) {
    record.retained[record.family]={...record.retained[record.family],...archive(view,record)};
    for(const section of view.sections||[])section.cards=removeManaged(section.cards,record.slots);
    const previous=record.retained[popupFamily(owner)];
    if(previous){restore(view,previous,newSlots);baseSlots=previous.slots;suppressed=new Set(previous.suppressed);}
    else {transitionLayout=copy(record.retained[record.family].instances);baseSlots={};suppressed=new Set();}
  }
  for(const [key,slot]of Object.entries(newSlots))if(own(baseSlots,key))retainEntitySpelling(baseSlots[key].base,slot.base);
  const entries=popupCardEntries(view),present=new Set(entries.map(({card})=>card.marao_popup_slot));
  for(const key of Object.keys(baseSlots))if(!present.has(key))suppressed.add(key);
  for(const {card}of entries) {
    const key=card.marao_popup_slot;if(!own(baseSlots,key))continue;
    if(!own(newSlots,key))continue;
    mergeCard(card,baseSlots[key].base,newSlots[key].base);
  }
  // Only newly configured roles are inserted; missing old roles stay deleted.
  for(const entry of popupCardEntries(defaults)) {
    const key=entry.card.marao_popup_slot;
    if(!key||present.has(key)||own(baseSlots,key)||suppressed.has(key))continue;
    const parentKey=entry.parent?.card.marao_popup_slot;
    const parents=parentKey?popupCardEntries(view).filter(({card})=>card.marao_popup_slot===parentKey):[];
    if(parentKey&&!parents.length)continue;
    const layoutIndex=transitionLayout.findIndex(old=>old.card.marao_popup_slot===key||old.card.marao_popup_slot?.startsWith('member:')&&key.startsWith('member:'));
    const anchor=layoutIndex===-1?null:transitionLayout.splice(layoutIndex,1)[0];
    const targets=parentKey?parents.map(({card})=>card.cards||=[]):[sectionCards(view,anchor?.section??entry.section)];
    for(const cards of targets){const card={...immediate(entry.card),marao_popup_slot:key};if(Array.isArray(entry.card.cards))card.cards=copy(entry.card.cards.filter(child=>!child.marao_popup_slot));if(anchor)for(const prop of ['grid_options','layout_options'])if(own(anchor.card,prop))card[prop]=copy(anchor.card[prop]);cards.splice(anchor?Math.min(anchor.index,cards.length):cards.length,0,card);}
    present.add(key);
  }
  // Retired members disappear only when still managed; custom cards stay active.
  const obsolete=new Set(Object.keys(baseSlots).filter(key=>!own(newSlots,key)));
  const prune=cards=>(cards||[]).flatMap(card=>{if(card.cards)card.cards=prune(card.cards);return obsolete.has(card.marao_popup_slot)?card.cards||[]:[card];});
  for(const section of view.sections)section.cards=prune(section.cards);
  record.family=popupFamily(owner);record.settings=popupSettings(owner);record.slots=Object.fromEntries(Object.entries(newSlots).map(([key,slot])=>[key,{...baseSlots[key],...slot}]));record.suppressed=[...suppressed];record.active=true;
  return view;
}

export const managedPopupCurrent=(view,owner)=>{assertManaged(view);return !view.marao_popup||same(view.marao_popup.settings,popupSettings(owner));};
export const detachManagedPopupCard=config=>{const next=copy(config);delete next.marao_popup_slot;return next;};

// Walk only native card containers, never opaque command data or provenance.
export function popupOwners(document) {
  const result=[];
  for(const [viewIndex,view]of (document.views||[]).entries()) {
    const path=String(view.path??viewIndex),cards=[];
    const visit=(value,address)=>{if(!object(value))return;if(value.type)cards.push({config:value,address});for(const key of ['cards','sections'])for(const [index,child]of (Array.isArray(value[key])?value[key]:[]).entries())visit(child,[...address,key,index]);};
    visit(view,['views',viewIndex]);
    for(const card of cards) {
      if(!POPUP_TEMPLATES.includes(popupTemplate(card.config)))continue;
      let source=card,external=false,error;
      if(!card.config.popup_view&&popupHashFor(card.config)) {
        const matches=cards.filter(item=>item.config.type==='custom:marao-popup-card'&&item.config.hash===popupHashFor(card.config));
        if(matches.length!==1)error='Referenced popup is missing or ambiguous.';
        else {source=matches[0];external=true;}
      }
      result.push({...card,currentPath:path,source:source.config,sourceAddress:source.address,external,path:source.config.popup_view,error});
    }
  }
  return result;
}

export function managedChildContext(document,config,currentPath) {
  if(!config.marao_popup_slot)return;
  let views=(document?.views||[]).filter((view,index)=>String(view.path??index)===currentPath);
  if(!views.length&&/^\d+$/.test(currentPath)&&document?.views?.[Number(currentPath)])views=[document.views[Number(currentPath)]];
  if(views.length!==1||!views[0].marao_popup)return;
  assertManaged(views[0]);
  const slot=views[0].marao_popup.slots[config.marao_popup_slot];
  if(slot)return {view:views[0],slot};
}

export function adoptManagedView(source,owner,generated) {
  assertManaged(source);if(source.marao_popup)return reconcileManagedView(source,owner,generated);
  const defaults=createManagedView(generated,owner),view=copy(source),available=new Map();
  for(const entry of popupCardEntries(defaults)){const key=entry.card.marao_popup_slot;if(key)available.set(key,entry.card);}
  let matched=0;
  for(const {card}of popupCardEntries(view)) {
    if(!managedCandidate(card))continue;
    const candidates=[...available].filter(([,base])=>{
      const a={...card,template:popupTemplate(card),entity_id:card.entity_id||card.entity},b={...base,template:popupTemplate(base),entity_id:base.entity_id||base.entity};delete a.entity;delete b.entity;
      return pathsFor(a,b).filter(path=>!routeKeys.has(path.at(-1))).every(path=>sameField(a,b,path));
    });
    if(candidates.length===1){card.marao_popup_slot=candidates[0][0];retainEntitySpelling(card,defaults.marao_popup.slots[candidates[0][0]].base);available.delete(candidates[0][0]);matched++;}
  }
  if(!matched&&Object.keys(defaults.marao_popup.slots).length&&popupCardEntries(source).length)return {view:null,copy:defaults,custom:copy(source.sections||[])};
  view.marao_popup=copy(defaults.marao_popup);
  const present=new Set(popupCardEntries(view).map(({card})=>card.marao_popup_slot));
  view.marao_popup.suppressed=Object.keys(view.marao_popup.slots).filter(key=>!present.has(key));
  return {view,copy:null};
}
