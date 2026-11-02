import {summarySections,summaryAction,collectionLabel as label} from './MaraoCollections.js';
export const groupActionStyles='.marao-group-actions{display:flex;gap:8px;flex-wrap:wrap}.marao-group-actions button{min-width:48px;min-height:48px;flex:1;padding:12px;border:0;border-radius:24px;font:inherit;background:var(--secondary-background-color);color:var(--primary-text-color);overflow-wrap:anywhere;cursor:pointer}.marao-group-actions button:disabled{opacity:.5;cursor:default}.marao-group-actions button:focus{outline:none}.marao-group-scope{min-width:0;display:grid;gap:8px}.marao-group-scope h3{margin:8px 0;overflow-wrap:anywhere}.marao-group-info{font:inherit;overflow-wrap:anywhere;margin:0}';
export function createGroupScope(owner,part,group,api,parent,refresh) {
  const section=document.createElement('section');section.className='marao-group-scope';
  if(part.name){const heading=document.createElement('h3');heading.textContent=part.id==='__other'?label('Other',owner._hass):part.name;section.append(heading);}
  const controls=document.createElement('div');controls.className='marao-group-actions';section.append(controls);
  const info=document.createElement('p');info.className='marao-group-info';section.append(info);
  const error=document.createElement('p');error.className='marao-group-info';error.setAttribute('role','alert');section.append(error);parent.append(section);
  const scope={...part,section,controls,info,error,buttons:[],busy:false,group};
  if(group.entity_type!=='battery')for(const on of [true,false]) {
    const button=document.createElement('button');button.type='button';controls.append(button);scope.buttons.push({button,on});
    button.onclick=async()=>{
      if(button.disabled||scope.busy||owner.preview)return;
      scope.busy=true;api.haptic('heavy');refresh();const errors=[];
      try {
        const plan=summaryAction(scope.group,scope.entities,on,owner._hass,api.isAccessCover);
        for(const batch of plan.batches) {
          const [domain,service]=batch.service.split('.');
          const targets=domain==='climate'?batch.entities.map(id=>[id]):[batch.entities];
          for(const ids of targets)await api.callService(owner._hass,domain,service,{...batch.data,entity_id:ids.length===1?ids[0]:ids},(status,error)=>{if(status==='error')errors.push(`${ids.join(', ')}: ${error.message}`);});
        }
        scope.error.textContent=errors.join('\n');
      } catch(error){scope.error.textContent=error.message;} finally {scope.busy=false;refresh();}
    };
  }
  return scope;
}
export function updateGroupScope(owner,scope,group,api) {
  scope.group=group;const hass=owner._hass;
  for(const {button,on} of scope.buttons) {
    const plan=summaryAction(group,scope.entities,on,hass,api.isAccessCover);
    const name=label(group.entity_type==='cover'?(on?'Open all':'Close all'):(on?'Turn on all':'Turn off all'),hass);
    button.textContent=name;button.setAttribute('aria-label',`${name} · ${scope.id==='__other'?label('Other',hass):scope.name || owner._config.title || owner._config.name || ''}`);
    button.disabled=Boolean(owner.preview||scope.busy||!hass?.callService||!plan.batches.length);button.setAttribute('aria-busy',String(scope.busy));
  }
  const plans=[true,false].map(on=>summaryAction(group,scope.entities,on,hass,api.isAccessCover));
  scope.info.textContent=group.entity_type==='battery'?'':plans.map((plan,i)=>`${label(i===0?(group.entity_type==='cover'?'Open all':'Turn on all'):(group.entity_type==='cover'?'Close all':'Turn off all'),hass)}: ${plan.batches.flatMap(b=>b.entities).length} ${label('Eligible',hass)}${plan.skipped.length?' · '+label('Skipped',hass)+': '+plan.skipped.map(([id,reason])=>`${hass?.states?.[id]?.attributes?.friendly_name || id} (${label(reason,hass)})`).join(', '):''}`).join(' · ');
}
export function reconcileGroup(owner,api) {
  const root=owner._overlay?.querySelector('.marao-popup-content');
  if(!root || !owner._groupHelpers || !owner._groupChildren)return;
  const group={...owner._config.entity_group,members:owner._config.entity_group.members || (owner._config.cards || []).map(card=>({...card,entity_id:card.entity}))},hass=owner._hass;
  const parts=summarySections(group);
  if(!owner._groupLayout) {
    const style=document.createElement('style');style.textContent=api.controlGridStyles('.marao-group-scope .control-grid')+groupActionStyles;root.append(style);
    owner._groupLayout=new Map();
    const add=part=>{
      const scope=createGroupScope(owner,part,group,api,root,()=>reconcileGroup(owner,api));
      const cells=document.createElement('div');cells.className='control-grid';cells.style.setProperty('--marao-control-columns','1');scope.section.append(cells);scope.cells=cells;
      owner._groupLayout.set(part.id,scope);
    };
    if(group.summary_sections?.length)add({id:'__all',name:'',entities:group.entities});
    for(const part of parts)add(part);
  }
  for(const scope of owner._groupLayout.values())updateGroupScope(owner,scope,group,api);
  const activity=api.entityGroupState(group.entity_type,group.entities,hass);
  const eligible=new Set(group.popup_filter==='active'?activity.activeEntities:group.entities);
  if(owner._historyHost && owner._historyContext?.kind==='light-color' && group.entities.includes(owner._historyContext.source))eligible.add(owner._historyContext.source);
  for(const [id,card] of owner._groupChildren)if(!eligible.has(id)) {
    let active=api.deepActiveElement();while(active&&active!==card&&!card.contains(active))active=active.getRootNode()?.host;
    if(active)owner._overlay.querySelector('.marao-popup-close')?.focus();card.remove();owner._groupChildren.delete(id);
  }
  for(const part of parts) {
    const scope=owner._groupLayout.get(part.id),host=scope.cells;let index=0;
    for(const config of owner._config.cards || []) {
      if(!eligible.has(config.entity)||!part.entities.includes(config.entity))continue;
      scope.empty?.remove();scope.empty=null;
      let card=owner._groupChildren.get(config.entity);
      if(!card){try{card=owner._groupHelpers.createCardElement(config);card.setConfig?.(config);}catch(error){card=document.createElement('p');card.textContent=error.message;}owner._groupChildren.set(config.entity,card);}
      card.setAttribute('data-marao-control-cell','');card.nativeOwner=owner.nativeOwner||owner;card.preview=owner.preview;card.hass=hass;
      if(host.children[index]!==card)host.insertBefore(card,host.children[index]||null);index++;
    }
    if(!index){scope.empty ||= document.createElement('p');scope.empty.setAttribute('role','status');scope.empty.textContent=label(!hass?.states?'Loading':!part.entities.length?'No entities configured':'No active entities',hass);if(!scope.empty.isConnected)host.append(scope.empty);}
  }
}
