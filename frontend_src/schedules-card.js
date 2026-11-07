import {bindDropdown,dropdownStyles} from '../custom_components/marao_dashboard/frontend/MaraoDropdown.js';
import {nativeEditing,bindNativeEditing} from '../custom_components/marao_dashboard/frontend/MaraoNativeContext.js';
import {schedulesSession} from './schedule-api.js';
import {DAYS,uid,validateTimer} from './schedule-model.js';
import {scheduleLabel} from './schedule-text.js';
import {escapeText as e} from '../custom_components/marao_dashboard/frontend/MaraoCollections.js';
const Base=globalThis.HTMLElement || class {};
const css=`${dropdownStyles}:host{display:block;min-width:0;font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif);color:var(--primary-text-color)}[hidden]{display:none!important}ha-card{display:block;width:100%;min-width:0;padding:16px;border-radius:var(--ha-card-border-radius,24px);background:var(--ha-card-background);box-sizing:border-box}h2,h3,p{overflow-wrap:anywhere}h2{font:inherit;font-weight:700;margin:0 0 12px}button,input,select{font:inherit;color:inherit;box-sizing:border-box;min-height:48px;min-width:48px;border:0;border-radius:20px;background:var(--secondary-background-color);padding:12px}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}button:focus,input:focus,select:focus{outline:none}label{display:grid;gap:8px;margin:8px 0}input[type=checkbox]{accent-color:var(--primary-color)}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.row>*{min-width:0;overflow-wrap:anywhere}.timer{border-top:1px solid var(--divider-color);padding:12px 0;display:grid;gap:8px}.timer p{margin:0}.actions{display:flex;flex-wrap:wrap;gap:8px}.status{white-space:pre-wrap;overflow-wrap:anywhere}.device{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.device span{overflow-wrap:anywhere;min-width:0}.group-selector{width:100%}dialog{position:fixed;inset:auto 8px 80px;margin:0 auto;max-width:min(480px,calc(100vw - 16px));width:100%;max-height:calc(100dvh - 120px);padding:20px;box-sizing:border-box;border:0;border-radius:28px;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);overflow:auto;font:inherit;animation:up .2s ease}dialog::backdrop{background:rgba(0,0,0,.4)}@keyframes up{from{transform:translateY(100%)}to{transform:translateY(0)}}.group{border-top:1px solid var(--divider-color);padding:8px 0}.group-heading{display:flex;align-items:center;gap:8px}.group-title{display:flex;align-items:center;gap:8px;flex:1;min-width:0;text-align:left;background:transparent;padding:8px 0}.group-title strong{overflow-wrap:anywhere}.group-active{display:flex;align-items:center;gap:6px;background:transparent;padding:4px;font-size:var(--font-size-secondary,1rem)}.group-active>span:first-child{display:block;width:36px;height:22px;border-radius:20px;background:var(--disabled-text-color);position:relative;flex:none}.group-active>span:first-child:after{content:'';position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:var(--ha-card-background);transition:transform .15s}.group-active[aria-checked=true]>span:first-child{background:var(--color-green,var(--primary-color))}.group-active[aria-checked=true]>span:first-child:after{transform:translateX(14px)}button.timer{width:100%;display:flex;align-items:center;gap:8px;text-align:left;background:transparent;border-radius:0}.timer-copy{display:grid;flex:1;min-width:0;gap:4px;overflow-wrap:anywhere}.timer-copy>span{font-size:var(--font-size-secondary,1rem);color:var(--secondary-text-color)}ha-icon{flex:none;--mdc-icon-size:24px}.group-tools{display:flex;flex-direction:column;align-items:flex-start;gap:8px}.group-tools .add-button{margin:8px 0}.group-tools .delete-timer{display:flex;align-items:center;align-self:flex-end;gap:8px;width:auto;border-radius:16px}.add-group-section{border-top:1px solid var(--divider-color);padding-top:8px}.add-group-section .add-button{display:flex;align-items:center;gap:8px;border-radius:16px}.add-button{display:grid;place-items:center;border-radius:50%;padding:12px;margin:8px auto}.collection-actions{margin:12px 0}.timer-row{display:flex;align-items:center;gap:8px;border-top:1px solid var(--divider-color)}.timer-row .timer{flex:1;min-width:0;border:0}.timer-active{flex:none;justify-content:center;width:48px}.modal-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}.modal-header h2{margin:0;min-width:0}.modal-close{flex:none;width:48px;height:48px;padding:12px;border-radius:50%}.delete-timer{color:var(--error-color,#dc4545);background:color-mix(in srgb,var(--error-color,#dc4545) 12%,transparent);border-radius:50%;width:48px;padding:12px}dialog input{width:100%}@media(prefers-reduced-motion:reduce){dialog{animation:none}}`;
export class MaraoSchedulesCard extends Base {
  constructor(){super();this.attachShadow?.({mode:'open'});this._version=0;this._busy=false;}
  setConfig(config){if(!/^[a-zA-Z0-9_-]{1,64}$/.test(config.group_id||''))throw new Error('Choose a schedule collection and supported targets.');this._config=structuredClone(config);this._version++;this._loaded=false;this._loading=false;this._view=undefined;this._refresh();}
  set preview(value){this._preview=Boolean(value);if(this._preview)this._dialog?.close();this._refresh();}
  get preview(){return Boolean(this._preview||nativeEditing(this));}
  set hass(value){const records=Object.values(value?.states||{}).filter(state=>state.entity_id?.startsWith('automation.')&&state.attributes?.id?.startsWith('marao_schedules_')).map(state=>[state.entity_id,state.state,state.last_updated,state.attributes.id]);const signature=JSON.stringify(records);if(this._automationSignature!==signature||this._hass?.connected===false&&value?.connected!==false)this._loaded=false;this._automationSignature=signature;this._hass=value;if(this._session)this._session.hass=value;this._refresh();}
  get hass(){return this._hass;}
  l(value){return scheduleLabel(value,this._hass);}
  connectedCallback(){this._stopEditing=bindNativeEditing(this,()=>{if(this.preview)this._dialog?.close();this._refresh();});this._refresh();}
  disconnectedCallback(){this._stopEditing?.();this._stopEditing=null;clearTimeout(this._autosaveTimer);this._version++;this._loading=false;this._unsubscribe?.();this._unsubscribe=null;this._dialog?.close();}
  getCardSize(){return 5;}
  async _refresh(){
    if(!this._config||!this._hass)return;
    if(this._busy||this._session?.busy)return;
    if(!this._hass.user?.is_admin||this.preview){this._render();return;}
    if(!this._session||this._session.id!==this._config.group_id){this._session=schedulesSession(this._hass,this._config.group_id);this._loaded=false;}
    if(this.isConnected&&!this._loaded&&!this._loading){this._loading=true;const version=this._version;try{await this._session.read();if(version!==this._version)return;this._loaded=true;this._error='';if(!this._unsubscribe){const stop=await this._hass.connection.subscribeEvents(()=>{this._loaded=false;this._refresh();},'automation_reloaded');if(version===this._version&&this.isConnected)this._unsubscribe=stop;else stop();}}catch(error){this._error=error.message;}finally{if(version===this._version){this._loading=false;this._render();}}}
    else this._render();
  }
  _haptic(){this.dispatchEvent(new CustomEvent('haptic',{detail:'heavy',bubbles:true,composed:true}));}
  async _run(work){if(this._busy||this.preview||!this.isConnected)return;this._busy=true;this._haptic();this._render();try{await work();this._error='';}catch(error){this._error=error.message;}finally{this._busy=false;this._render();if(!this._loaded)this._refresh();}}
  _button(action,label,disabled=false){return `<button type="button" data-action="${e(action)}"${disabled?' disabled':''}>${e(this.l(label))}</button>`;}
  _render(){
    if(!this.shadowRoot||!this._config||this._dialog?.open)return;
    const session=this._session,m=session?.manifest,states=this._hass?.states||{},disabled=this._busy||this.preview||this._hass?.connected===false||this._hass?.connection?.connected===false;
    let body='';
    if(!this._hass?.user?.is_admin)body=e(this.l('Administrator access is required.'));
    else if(!m)body=`<p>${e(this.l(this._loading?'Loading':'Set up schedules'))}</p><label><input type="checkbox" data-ack>${e(this.l('Dedicated devices and private HA backup confirmed'))}</label>${this._button('setup','Set up schedules',disabled||!this._ack)}`;
    else {
      const selected=states[m.selection?.entity_id]?.state || session.selected;
      if(this._view===undefined)this._view=m.groups.some(g=>g.id===selected)?selected:null;
      if(this._view&&!m.groups.some(g=>g.id===this._view))this._view=null;
      body=m.groups.map(g=>{
        const open=this._view===g.id,active=selected===g.id,timers=(session.timers||[]).filter(t=>t.timer_group_id===g.id);
        return `<section class="group"><div class="group-heading"><button type="button" class="group-title" data-group="${e(g.id)}" aria-expanded="${open}" aria-controls="group-${e(g.id)}"><ha-icon icon="mdi:chevron-${open?'up':'down'}"></ha-icon><strong>${e(g.name)}</strong></button><button type="button" class="group-active" role="switch" aria-checked="${active}" aria-label="${e(this.l('Active timer group')+' · '+g.name)}" data-active="${e(g.id)}"${disabled||m.status!=='ready'?' disabled':''}><span></span><span>${e(this.l(active?'Enabled':'Paused'))}</span></button></div><div id="group-${e(g.id)}"${open?'':' hidden'}>${timers.length?timers.map(t=>`<div class="timer-row"><button type="button" class="timer" data-action="edit:${e(t.id)}"${disabled?' disabled':''}><ha-icon icon="mdi:timer-outline"></ha-icon><span class="timer-copy"><strong>${e(t.name)}</strong><span>${e(t.days.map(d=>this.l(d)).join(', '))} · ${e(t.time)}</span><span>${e(this.l(t.action==='off'?'Turn off':'Turn on'))}</span></span></button><button type="button" class="group-active timer-active" role="switch" aria-checked="${Boolean(t.enabled)}" aria-label="${e(this.l('Enabled')+' · '+t.name)}" data-action="enabled:${e(t.id)}"${disabled||t.customized?' disabled':''}><span></span></button></div>`).join(''):`<p>${e(this.l('No timers in this group'))}</p>`}<div class="group-tools">${this._plus('add:'+g.id,'Add timer',disabled||session.divergent)}<button type="button" class="delete-timer" data-action="delete-group:${e(g.id)}" aria-label="${e(this.l('Delete group')+' · '+g.name)}"${disabled?' disabled':''}><ha-icon icon="mdi:trash-can-outline" aria-hidden="true"></ha-icon><span>${e(this.l('Delete group'))}</span></button></div></div></section>`;
      }).join('');
      body+=`<div class="add-group-section">${this._plus('group','Add group',disabled)}</div>`;
      if(m.status!=='ready')body+=this._button('setup','Set up schedules',disabled);

    }
    const markup=`<style>${css}</style><ha-card><h2>${e(this._config.name || this.l('Schedules'))}</h2>${body}<p class="status" role="alert">${e(this.l(this._error || ''))}</p></ha-card>`;
    const active=this.shadowRoot.activeElement;if(active?.matches?.('input,select'))return;
    this.shadowRoot.innerHTML=markup;
    const ack=this.shadowRoot.querySelector('[data-ack]');if(ack){ack.checked=Boolean(this._ack);ack.onchange=()=>{this._ack=ack.checked;ack.blur();this._render();};}
    this.shadowRoot.querySelectorAll('[data-group]').forEach(button=>button.onclick=()=>{this._haptic();this._view=this._view===button.dataset.group?null:button.dataset.group;this._render();});
    this.shadowRoot.querySelectorAll('[data-active]').forEach(button=>button.onclick=()=>this._run(()=>session.select((this._hass.states[m.selection.entity_id]?.state||session.selected)===button.dataset.active?'paused':button.dataset.active)));
    this.shadowRoot.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>{const [action,...rest]=button.dataset.action.split(':'),id=rest.join(':');if(action==='delete-group'){const group=m.groups.find(g=>g.id===id);if(group)this._confirm('Delete group',group.name,()=>session.deleteGroup(id));return;}if(action==='group'){this._groups();return;}if(action==='add'||action==='edit'){if(action==='add')this._view=id;this._editTimer(action==='edit'?session.timers?.find(t=>t.id===id):undefined);return;}if(action==='delete'){this._confirm('Delete',session.timers.find(t=>t.id===id).name,()=>session.removeTimer(session.timers.find(t=>t.id===id)));return;}this._run(async()=>{if(action==='setup')await session.setup(this._config.name || this.l('Schedules'),this._config.targets||[]);if(action==='enabled'){const t=session.timers.find(t=>t.id===id);await session.enabled(t,!t.enabled);}});});
  }
  _plus(action,label,disabled){return `<button type="button" class="add-button" data-action="${e(action)}" aria-label="${e(this.l(label))}"${disabled?' disabled':''}><ha-icon icon="mdi:plus"></ha-icon>${action==='group'?`<span>${e(this.l('Add group'))}</span>`:''}</button>`;}
  _modal(title){const focus=this.shadowRoot.activeElement,dialog=document.createElement('dialog');dialog.innerHTML=`<div class="modal-header"><h2>${e(title)}</h2><button type="button" class="modal-close" aria-label="${e(this.l('Close'))}"><ha-icon icon="mdi:close" aria-hidden="true"></ha-icon></button></div><div data-form></div><p role="status" data-error></p><div class="actions"></div>`;this.shadowRoot.append(dialog);this._dialog=dialog;dialog.querySelector('.modal-close').onclick=()=>dialog._close?dialog._close():dialog.close();dialog.addEventListener('cancel',event=>{event.preventDefault();dialog._close?dialog._close():dialog.close();});dialog.addEventListener('close',()=>{clearTimeout(this._autosaveTimer);this._weekdayPicker?.destroy();this._weekdayPicker=null;this._dialog=null;dialog.remove();this._render();(focus?.isConnected?focus:this.shadowRoot.querySelector('[data-group]'))?.focus?.();},{once:true});dialog.showModal();return dialog;}
  _modalButton(dialog,label,work){const button=document.createElement('button');button.type='button';button.textContent=this.l(label);button.onclick=async()=>{if(this.preview||this._busy)return;this._haptic();this._busy=true;button.disabled=true;try{await work();}catch(error){dialog.querySelector('[data-error]').textContent=this.l(error.message);}finally{this._busy=false;button.disabled=false;}};dialog.querySelector('.actions').append(button);return button;}
  _confirm(action,name,work){const dialog=this._modal(this.l(action)+' · '+name);const remove=this._modalButton(dialog,action,async()=>{await work();dialog.close();});if(action==='Delete'||action==='Delete group'){remove.className='delete-timer';remove.setAttribute('aria-label',this.l(action));remove.innerHTML='<ha-icon icon="mdi:trash-can-outline" aria-hidden="true"></ha-icon>';}}
  _groups(){const dialog=this._modal(this.l('Add group')),host=dialog.querySelector('[data-form]');
    const label=document.createElement('label');label.textContent=this.l('Name');const input=document.createElement('input');label.append(input);host.append(label);
    this._modalButton(dialog,'Add group',async()=>{this._view=await this._session.group(input.value);dialog.close();});
  }
  _weekdays(host,data,changed){
    const wrapper=document.createElement('div');wrapper.className='weekday-field';
    const title=document.createElement('p');title.textContent=this.l('Weekdays');
    const picker=document.createElement('div');picker.className='marao-dropdown';
    picker.innerHTML='<button type="button" aria-haspopup="menu" aria-expanded="false"><span></span><ha-icon icon="mdi:chevron-down" aria-hidden="true"></ha-icon></button><div class="marao-dropdown-options" role="menu" hidden></div>';
    const trigger=picker.querySelector('button'),menu=picker.querySelector('[role=menu]');trigger.setAttribute('aria-label',this.l('Weekdays'));
    const choices=DAYS.map(day=>{const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitemcheckbox');button.innerHTML=`<span>${e(this.l(day))}</span><ha-icon icon="mdi:check" aria-hidden="true"></ha-icon>`;menu.append(button);return {value:day,button};});
    const summary=()=>{trigger.querySelector('span').textContent=data.days.map(day=>this.l(day)).join(', ')||this.l('Weekdays');};summary();
    this._weekdayPicker=bindDropdown(picker,{trigger,menu,choices,multiple:true,value:()=>data.days,activeElement:()=>this.shadowRoot.activeElement,haptic:()=>this._haptic(),onSelect:day=>{this._haptic();data.days=DAYS.filter(d=>d===day?!data.days.includes(d):data.days.includes(d));summary();changed();}});
    wrapper.append(title,picker);host.append(wrapper);
  }
  _editTimer(timer){
    const m=this._session.manifest,dialog=this._modal(this.l(timer?'Edit':'Add timer')),host=dialog.querySelector('[data-form]');
    if(timer?.customized){host.innerHTML=`<p>${e(this.l('Customized automations must be managed in Home Assistant.'))}</p><a href="/config/automation/edit/${e(timer.config.id)}">${e(this.l('Open automation'))}</a>`;return;}
    const data=timer?structuredClone(timer):{id:uid(),name:'',timer_group_id:this._view||m.groups[0].id,days:['mon'],time:'07:00',targets:m.targets.map(t=>t.entity_id),stop_mode:'none',enabled:true};
    data.action ||= 'on';
    const form=document.createElement('ha-form');form.hass=this._hass;form.data=data;form.computeLabel=field=>this.l(field.description?.label||field.name);form.schema=[{name:'name',description:{label:'Name'},required:true,selector:{text:{}}},{name:'time',description:{label:'Start time'},selector:{time:{}}},{name:'action',description:{label:'Action'},selector:{select:{options:[{value:'on',label:this.l('Turn on')},{value:'off',label:this.l('Turn off')}]}}}];host.append(form);
    let saved=timer?JSON.stringify(data):'',pending=false,saving=false,failed=false,closing=false;
    const error=dialog.querySelector('[data-error]');
    const save=async()=>{
      if(saving){pending=true;return;}
      clearTimeout(this._autosaveTimer);failed=false;
      if(this.preview||!this.isConnected)return;
      const next={...structuredClone(data),time:String(data.time).slice(0,5)};
      if(next.action==='off'){next.stop_mode='none';delete next.duration_minutes;}
      try{validateTimer(next,this._session.manifest,this._session.timers);}catch(problem){error.textContent=this.l(problem.message);failed=true;return;}
      const signature=JSON.stringify(next);if(signature===saved)return;
      saving=true;this._busy=true;error.textContent=this.l('Saving');
      try{await this._session.timer(next);saved=signature;error.textContent=this.l('Saved');}
      catch(problem){error.textContent=this.l(problem.message);failed=true;}
      finally{saving=false;this._busy=false;if(pending){pending=false;await save();}if(closing&&!failed&&!saving&&dialog.open)dialog.close();}
    };
    const changed=()=>{clearTimeout(this._autosaveTimer);this._autosaveTimer=setTimeout(save,500);};
    form.addEventListener('value-changed',event=>{const {days,...values}=event.detail.value;Object.assign(data,values);changed();});
    this._weekdays(host,data,changed);
    dialog._close=async()=>{if(saving){closing=true;pending=true;return;}if(!data.name.trim()&&!timer){dialog.close();return;}await save();if(!failed&&!saving)dialog.close();};
    const trash=document.createElement('button');trash.type='button';trash.className='delete-timer';trash.setAttribute('aria-label',this.l('Delete'));trash.innerHTML='<ha-icon icon="mdi:trash-can-outline" aria-hidden="true"></ha-icon>';trash.onclick=()=>{if(saving||this._busy||this.preview)return;clearTimeout(this._autosaveTimer);const current=this._session.timers.find(t=>t.id===data.id);dialog.close();if(current)this._confirm('Delete',current.name,()=>this._session.removeTimer(current));};dialog.querySelector('.actions').append(trash);
  }
}
if(globalThis.customElements&&!customElements.get('marao-schedules-runtime'))customElements.define('marao-schedules-runtime',MaraoSchedulesCard);
