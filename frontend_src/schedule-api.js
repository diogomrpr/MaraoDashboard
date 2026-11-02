import {MANAGER,EVENT,DAYS,uid,controllerId,timerId,targetAdapter,validateTimer,startConfig,controllerConfig,recognized} from './schedule-model.js';
const clone=value=>structuredClone(value);
export const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const shared=new WeakMap();
export function schedulesSession(hass,id) {
  const connection=hass.connection || hass;
  if(!shared.has(connection))shared.set(connection,new Map());
  const sessions=shared.get(connection);
  if(!sessions.has(id))sessions.set(id,new ScheduleSession(hass,id));
  const session=sessions.get(id);session.hass=hass;return session;
}
export class ScheduleSession {
  constructor(hass,id){this.hass=hass;this.id=id;this.receipt={collection_id:id,records:[],helpers:[]};}
  guard(){if(!this.hass.user?.is_admin)throw new Error('Administrator access is required.');if(this.hass.connected===false||this.hass.connection?.connected===false)throw new Error('Disconnected');}
  async ws(type,data={}){this.guard();return this.hass.callWS({type,...data});}
  async config(method,id,body){this.guard();return this.hass.callApi(method,'config/automation/config/'+encodeURIComponent(id),body);}
  async stateList(){return Object.fromEntries((await this.ws('get_states')).map(state=>[state.entity_id,state]));}
  async preflight(){await this.ws('timer/list');await this.ws('input_select/list');const config=await this.ws('get_config');if(!config.components?.includes('automation'))throw new Error('UI-managed automations are required.');return true;}
  async record(id){try{return await this.config('GET',id);}catch(error){if([404,'404'].includes(error.status_code)||error.status===404)return null;throw error;}}
  async wait(test){for(let attempt=0;attempt<40;attempt++){const states=await this.stateList();const result=test(states);if(result)return result;await new Promise(resolve=>setTimeout(resolve,250));}throw new Error('Home Assistant resource is not ready. Retry to reconcile.');}
  async automationEntity(id){return this.wait(states=>Object.values(states).find(state=>state.entity_id.startsWith('automation.')&&state.attributes?.id===id)?.entity_id);}
  async save(config,before) {
    const current=await this.record(config.id);
    if(stable(current)!==stable(before))throw new Error('Configuration changed elsewhere. Refresh before saving.');
    this.receipt.records.push({id:config.id,before:clone(before),intended:clone(config)});
    await this.config('POST',config.id,config);
    const actual=await this.record(config.id);
    if(stable(actual)!==stable(config))throw new Error('Saved configuration differs. Reconcile before continuing.');
    await this.automationEntity(config.id);return actual;
  }
  async read(force=false){
    this.guard();if(this.reading)return this.reading;
    this.reading=(async()=>{
      const config=await this.record(controllerId(this.id));
      if(!config){this.manifest=null;this.controller=null;this.timers=[];return this;}
      const meta=config.variables?.marao_schedule;
      if(meta?.manager!==MANAGER||meta.version!==1||meta.id!==this.id||!recognized(config))throw new Error('Collection is customized or uses an unsupported version. Open automation.');
      this.controller=config;this.manifest=clone(meta);this.timers=[];
      const states=await this.stateList();
      // Enumerate native records so a removed schedule is never silently recreated.
      for(const state of Object.values(states).filter(s=>s.entity_id.startsWith('automation.')&&s.attributes?.id?.startsWith('marao_schedules_')&&s.attributes.id!==config.id)) {
        const record=await this.record(state.attributes.id),entry=record?.variables?.marao_schedule;
        if(entry?.manager===MANAGER&&entry.collection_id===this.id)this.timers.push({...entry,name:record.alias,automation_entity:state.entity_id,enabled:state.state==='on',config:record,customized:!recognized(record,meta)});
      }
      this.states=states;this.selected=states[meta.selection?.entity_id]?.state || 'unknown';
      const approved=meta.schedules || [];
      this.divergent=this.timers.some(t=>t.customized||stable(approved.find(x=>x.id===t.id))!==stable(this.contract(t)))||approved.some(a=>!this.timers.some(t=>t.id===a.id));
      return this;
    })().finally(()=>{this.reading=null;});return this.reading;
  }
  contract(timer){const data=clone(timer.config?{...timer.config.variables.marao_schedule,automation_entity:timer.automation_entity}:timer);for(const key of ['config','customized','enabled'])delete data[key];return {...data,weekday_numbers:data.days.map(day=>DAYS.indexOf(day))};}
  async exclusive(work){this.guard();if(this.busy)throw new Error('Another schedule operation is in progress.');this.busy=true;try{return await work();}finally{this.busy=false;}}
  async helper(domain,name,settings){
    const existing=await this.ws(domain+'/list');
    if(existing.some(item=>item.name===name))throw new Error('Provisioning helper already exists. Reconcile using the recovery export.');
    const record=await this.ws(domain+'/create',{name,...settings});
    this.receipt.helpers.push({domain,record:clone(record)});
    const registry=await this.ws('config/entity_registry/list');
    const entry=registry.find(item=>item.platform===domain&&item.unique_id===record.id);
    if(!entry)throw new Error('Helper identity is not ready. Keep the recovery export.');
    await this.wait(states=>states[entry.entity_id]);
    return {domain,storage_id:record.id,entity_id:entry.entity_id,baseline:record};
  }
  async setup(name,targets){return this.exclusive(async()=>{
    await this.preflight();await this.read();if(this.manifest?.status==='ready')return;
    const ids=[...new Set(targets)];if(!ids.length)throw new Error('Choose registered devices.');ids.forEach(targetAdapter);
    const states=await this.stateList();
    for(const id of ids){if(!['off','closed'].includes(states[id]?.state)||/door|garage|gate|lock|alarm/.test(id+' '+(states[id]?.attributes?.device_class || '')))throw new Error('Use dedicated inactive switch or valve devices.');if(id.startsWith('valve.')&&(Number(states[id].attributes.supported_features)&3)!==3)throw new Error('The valve must support opening and closing.');}
    // Inspect every managed controller; names and target labels cannot establish ownership.
    for(const state of Object.values(states).filter(s=>s.attributes?.id?.startsWith('marao_schedules_')&&s.attributes.id!==controllerId(this.id))) {
      const other=await this.record(state.attributes.id),meta=other?.variables?.marao_schedule;
      if(meta?.manager===MANAGER&&meta.role==='controller'&&meta.targets.some(t=>ids.includes(t.entity_id)))throw new Error('A different collection already owns a selected device.');
    }
    let m=this.manifest || {id:this.id,name,status:'provisioning',groups:[],targets:ids.map(entity_id=>({entity_id})),schedules:[]};
    if(this.manifest&&stable(m.targets.map(t=>t.entity_id))!==stable(ids))throw new Error('Provisioning target bindings differ. Reconcile first.');
    let current=this.controller || null;
    const checkpoint=async()=>{const config={...current,...controllerConfig(m)};if(m.status==='ready')delete config.initial_state;current=await this.save(config,current);this.controller=current;this.manifest=clone(current.variables.marao_schedule);};
    if(!current)await checkpoint();
    if(!m.selection){m.selection=await this.helper('input_select','Marao '+this.id+' selection',{options:['paused']});await checkpoint();}
    for(let i=0;i<m.targets.length;i++)for(const role of ['mode','timer'])if(!m.targets[i][role]) {
      const settings=role==='mode'?{options:['idle','timed','on_only','stopping']}:{duration:0,restore:true};
      m.targets[i][role]=await this.helper(role==='mode'?'input_select':'timer','Marao '+this.id+' '+i+' '+role,settings);await checkpoint();
    }
    m.status='ready';await checkpoint();
    const entity=await this.automationEntity(current.id);await this.hass.callService('automation','turn_on',{entity_id:entity});await this.wait(s=>s[entity]?.state==='on');await this.read();
  });}
  async manifestUpdate(transform){
    const before=await this.record(controllerId(this.id));if(!recognized(before)||stable(before)!==stable(this.controller))throw new Error('Configuration changed elsewhere. Refresh before saving.');
    const next=clone(before.variables.marao_schedule);transform(next);
    this.controller=await this.save({...before,...controllerConfig(next)},before);this.manifest=clone(this.controller.variables.marao_schedule);
  }
  async group(name,id){return this.exclusive(async()=>{await this.read();if(!name.trim())throw new Error('Enter a group name.');const groupId=id || uid();
    await this.manifestUpdate(m=>{const old=m.groups.find(g=>g.id===groupId);if(old)old.name=name;else m.groups.push({id:groupId,name});});
    const helper=this.manifest.selection,list=await this.ws('input_select/list'),actual=list.find(h=>h.id===helper.storage_id);
    if(!actual)throw new Error('Selection helper is missing.');
    await this.ws('input_select/update',{...Object.fromEntries(Object.entries(actual).filter(([key])=>key!=='id')),input_select_id:helper.storage_id,options:['paused',...this.manifest.groups.map(g=>g.id)]});await this.read();return groupId;
  });}
  async request(kind,data={}){this.guard();await this.ws('fire_event',{event_type:EVENT,event_data:{collection_id:this.id,kind,issued:Date.now()/1000,...data}});}
  async select(id){if(!['paused',...this.manifest.groups.map(g=>g.id)].includes(id))throw new Error('Choose a timer group.');await this.request('select',{group:id});await this.wait(states=>states[this.manifest.selection.entity_id]?.state===id);this.selected=id;}
  async timer(data){return this.exclusive(async()=>{
    await this.read();if(this.divergent)throw new Error('Schedule configuration differs. Reconcile in the native editor.');
    const {enabled=true,...input}=data;const meta={...input,id:input.id || uid()};for(const key of ['config','customized','automation_entity'])delete meta[key];
    validateTimer(meta,this.manifest,this.timers);const old=this.timers.find(t=>t.id===meta.id);let before=old?.config || null;
    if(old){await this.hass.callService('automation','turn_off',{entity_id:old.automation_entity});await this.manifestUpdate(m=>{m.schedules=m.schedules.filter(t=>t.id!==meta.id);});}
    const desired={...before,...startConfig(meta,this.manifest),initial_state:false};let saved=await this.save(desired,before);
    const entity=await this.automationEntity(saved.id);const contract=this.contract({...saved.variables.marao_schedule,automation_entity:entity});
    await this.manifestUpdate(m=>{m.schedules=m.schedules.filter(t=>t.id!==meta.id);m.schedules.push(contract);});
    const final={...saved};delete final.initial_state;saved=await this.save(final,saved);
    await this.hass.callService('automation',enabled?'turn_on':'turn_off',{entity_id:entity});await this.read();
  });}
  async enabled(timer,value){this.guard();const fresh=await this.record(timer.config.id);if(stable(fresh)!==stable(timer.config)||!recognized(fresh,this.manifest))throw new Error('Configuration changed elsewhere. Refresh before saving.');await this.hass.callService('automation',value?'turn_on':'turn_off',{entity_id:timer.automation_entity});await this.read();}
  async removeTimer(timer){
    if(timer.customized)throw new Error('Customized automations must be managed in Home Assistant.');
    const current=await this.record(timer.config.id);if(stable(current)!==stable(timer.config))throw new Error('Configuration changed elsewhere. Refresh before saving.');
    await this.manifestUpdate(m=>{m.schedules=m.schedules.filter(t=>t.id!==timer.id);});
    this.receipt.records.push({id:current.id,before:current,intended:null});await this.config('DELETE',current.id);await this.read();
  }
  async deleteGroup(id){return this.exclusive(async()=>{await this.read();if(this.selected===id)await this.select('paused');for(const timer of this.timers.filter(t=>t.timer_group_id===id))await this.removeTimer(timer);await this.manifestUpdate(m=>{m.groups=m.groups.filter(g=>g.id!==id);});const actual=(await this.ws('input_select/list')).find(h=>h.id===this.manifest.selection.storage_id);if(!actual)throw new Error('Selection helper is missing.');await this.ws('input_select/update',{...Object.fromEntries(Object.entries(actual).filter(([key])=>key!=='id')),input_select_id:this.manifest.selection.storage_id,options:['paused',...this.manifest.groups.map(g=>g.id)]});await this.read();});}
  async cleanup(){return this.exclusive(async()=>{await this.read();const states=await this.stateList();if(this.divergent||this.manifest.targets.some(t=>!['off','closed'].includes(states[t.entity_id]?.state)||states[t.mode.entity_id]?.state!=='idle'))throw new Error('Stop every device and reconcile customized resources before deleting the collection.');await this.select('paused');for(const timer of [...this.timers])await this.removeTimer(timer);
    const helpers=[this.manifest.selection,...this.manifest.targets.flatMap(t=>[t.mode,t.timer])];
    const owned=new Set([controllerId(this.id),...this.timers.map(t=>t.config.id)]);
    for(const state of Object.values(states).filter(s=>s.entity_id.startsWith('automation.')&&s.attributes?.id&&!owned.has(s.attributes.id))){const other=await this.record(state.attributes.id);if(other&&helpers.some(h=>stable(other).includes(JSON.stringify(h.entity_id))))throw new Error('Another automation depends on these helpers. Reconcile before cleanup.');}
    for(const helper of helpers){const records=await this.ws(helper.domain+'/list'),record=records.find(item=>item.id===helper.storage_id);if(!record)throw new Error('Helper is missing. Reconcile before cleanup.');const expected={...helper.baseline};if(helper===this.manifest.selection)expected.options=['paused',...this.manifest.groups.map(g=>g.id)];if(stable(record)!==stable(expected))throw new Error('Helper changed elsewhere. Cleanup stopped.');}
    const before=await this.record(controllerId(this.id));if(stable(before)!==stable(this.controller))throw new Error('Configuration changed elsewhere. Refresh before saving.');
    const automation=await this.automationEntity(before.id);await this.hass.callService('automation','turn_off',{entity_id:automation});
    for(const helper of helpers)await this.ws(helper.domain+'/delete',{[helper.domain+'_id']:helper.storage_id});
    this.receipt.records.push({id:before.id,before,intended:null});await this.config('DELETE',before.id);await this.read();
  });}
}
