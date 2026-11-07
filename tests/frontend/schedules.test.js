import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTimer,controllerConfig,startConfig,recognized,MANAGER} from '../../frontend_src/schedule-model.js';
import {ScheduleSession} from '../../frontend_src/schedule-api.js';
const m={id:'garden',name:'Garden',status:'ready',groups:[{id:'summer',name:'Summer'},{id:'winter',name:'Winter'}],selection:{entity_id:'input_select.season'},targets:[{entity_id:'input_boolean.one',mode:{entity_id:'input_select.one'},timer:{entity_id:'timer.one'}},{entity_id:'switch.two',mode:{entity_id:'input_select.two'},timer:{entity_id:'timer.two'}}],schedules:[]};
const t={id:'morning',name:'Morning',timer_group_id:'summer',targets:['input_boolean.one','switch.two'],days:['mon'],time:'07:00',stop_mode:'none'};
test('schedule picker previews do not read live automation configuration',async()=>{
  const {MaraoSchedulesCard}=await import('../../frontend_src/schedules-card.js'),card=new MaraoSchedulesCard();
  card.parentNode={localName:'hui-card-picker'};card.isConnected=true;card._config={group_id:'preview'};
  card._hass={user:{is_admin:true},states:{},callApi(){assert.fail('Preview must not load a controller');},callWS(){assert.fail('Preview must not query live configuration');}};
  let rendered=0;card._render=()=>rendered++;await card._refresh();assert.equal(rendered,1);assert.equal(card._session,undefined);
});
test('on-only needs no duration; seasonal groups may reuse times but same-group target overlaps fail',()=>{
  assert.doesNotThrow(()=>validateTimer(t,m));
  assert.throws(()=>validateTimer({...t,duration_minutes:0},m),/duration/);
  assert.throws(()=>validateTimer({...t,targets:[]},m),/devices/);
  const timed={...t,id:'timed',stop_mode:'after_duration',duration_minutes:15};
  assert.throws(()=>validateTimer(t,m,[timed]),/overlap/);
  assert.doesNotThrow(()=>validateTimer({...timed,timer_group_id:'winter'},m,[t]));
  assert.throws(()=>validateTimer({...t,time:'00:05'},m,[{...timed,days:['sun'],time:'23:55'}]),/overlap/);
});
test('server templates bind targets/policy to a recognized manifest and preserve advanced edits as customized',()=>{
  const source=startConfig(t,m);assert.equal(source.variables.marao_schedule.stop_mode,'none');assert.equal(source.variables.marao_schedule.duration_minutes,undefined);
  assert.deepEqual(source.actions.map(a=>a.event),['marao_schedule_request']);
  assert.equal(recognized(source,m),true);assert.equal(recognized({...source,alias:'Renamed'},m),true);
  assert.equal(recognized({...source,actions:[{action:'switch.turn_on'}]},m),false);
  const config=controllerConfig(m);assert.equal(config.mode,'queued');assert.equal(recognized(config),true);
  assert.equal(recognized({...config,variables:{marao_schedule:{...config.variables.marao_schedule,version:99}}}),false);
  assert.equal(config.variables.marao_schedule.manager,MANAGER);
  const pending=controllerConfig({...m,status:'provisioning'});assert.deepEqual(pending.actions,[]);assert.equal(pending.initial_state,false);
});
test('non-admin access and stale configuration prevent writes; receipts preserve failed operation baselines',async()=>{
  let calls=0;const denied=new ScheduleSession({user:{is_admin:false},callWS:()=>{calls++;}},'garden');await assert.rejects(denied.read(),/Administrator/);assert.equal(calls,0);
  const prior={id:'owned',alias:'Original'},hass={user:{is_admin:true},callApi:async method=>{if(method==='GET')return {...prior,alias:'Changed'};calls++;}};
  const session=new ScheduleSession(hass,'garden');await assert.rejects(session.save({...prior,alias:'New'},prior),/elsewhere/);assert.equal(calls,0);
});

test('partial helper provisioning cannot enable starts and preserves its operation receipt',async()=>{
  const records=new Map(),states={'input_boolean.fixture':{entity_id:'input_boolean.fixture',state:'off',attributes:{}}};let enables=0;
  const hass={user:{is_admin:true},callWS:async data=>{if(data.type==='get_states')return Object.values(states);if(data.type==='get_config')return {components:['automation']};if(data.type.endsWith('/list'))return [];if(data.type==='input_select/create')throw new Error('Injected storage failure');throw new Error('Unexpected command '+data.type);},callApi:async(method,path,body)=>{const id=path.split('/').at(-1);if(method==='GET'){if(!records.has(id))throw {status_code:404};return records.get(id);}records.set(id,structuredClone(body));states['automation.fixture']={entity_id:'automation.fixture',state:'off',attributes:{id}};return {};},callService:async()=>{enables++;}};
  const session=new ScheduleSession(hass,'fixture');await assert.rejects(session.setup('Fixture',['input_boolean.fixture']),/Injected storage failure/);
  assert.equal(enables,0);assert.equal(records.size,1);
  const pending=[...records.values()][0];assert.deepEqual(pending.actions,[]);assert.equal(pending.initial_state,false);assert.equal(pending.variables.marao_schedule.status,'provisioning');assert.equal(session.receipt.records[0].before,null);
});

test('schedule sections open the active group initially and browse independently of selection',async()=>{
  const {MaraoSchedulesCard}=await import('../../frontend_src/schedules-card.js');
  const card=new MaraoSchedulesCard();
  const controls={};
  card.shadowRoot={activeElement:null,querySelector:()=>null,querySelectorAll:selector=>{
    const attr=selector.slice(1,-1),key=attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    return controls[attr]=[...card.shadowRoot.innerHTML.matchAll(new RegExp(attr+'="([^"]*)"','g'))].map(match=>({dataset:{[key]:match[1]}}));
  }};
  card._config={group_id:'garden'};card._hass={user:{is_admin:true},states:{'input_select.season':{state:'winter'}}};
  card._session={manifest:m,timers:[{...t,enabled:true}],selected:'winter'};card._haptic=()=>{};
  card._render();assert.equal(card._view,'winter');
  assert.match(card.shadowRoot.innerHTML,/aria-controls="group-winter"/);
  assert.match(card.shadowRoot.innerHTML,/id="group-summer" hidden/);
  assert.doesNotMatch(card.shadowRoot.innerHTML,/Export recovery|data-view|data-picker/);
  controls['data-group'][0].onclick();assert.equal(card._view,'summer');
  assert.match(card.shadowRoot.innerHTML,/id="group-winter" hidden/);
  assert.equal(card._hass.states['input_select.season'].state,'winter');
  const selections=[];card._run=work=>work();card._session.select=id=>selections.push(id);
  controls['data-active'][0].onclick();controls['data-active'][1].onclick();
  assert.deepEqual(selections,['summer','paused']);
  controls['data-group'][0].onclick();assert.equal(card._view,null);
});

test('off timers use the recognized schedule gate and off adapter while older controllers stay unchanged',()=>{
  const off={...t,id:'evening-off',time:'19:00',action:'off'};
  assert.doesNotThrow(()=>validateTimer(off,m));
  assert.throws(()=>validateTimer({...off,action:'toggle'},m),/Turn on or Turn off/);
  const legacy=controllerConfig(m),next=controllerConfig({...m,schedules:[{...off,weekday_numbers:[0]}]});
  assert.equal(recognized(legacy),true);assert.equal(recognized(next),true);
  const text=JSON.stringify(next.actions);assert.match(text,/approved.get\('action','on'\) == 'off'/);
  assert.match(text,/switch.turn_off/);assert.match(text,/input_boolean.turn_off/);
  assert.match(text,/request.get\('source'\) == approved.get\('automation_entity'\)/);
  assert.doesNotMatch(JSON.stringify(legacy.actions),/approved.get\('action'/);
});

test('timer popup edits autosave serially without losing a newer change and retain card devices and group',async ctx=>{
  ctx.mock.timers.enable({apis:['setTimeout']});
  const before=globalThis.document,created=[];
  class Node extends EventTarget{constructor(){super();this.children=[];}append(node){this.children.push(node);}setAttribute(){} }
  globalThis.document={createElement:()=>{const node=new Node();created.push(node);return node;}};
  ctx.after(()=>{globalThis.document=before;});
  const {MaraoSchedulesCard}=await import('../../frontend_src/schedules-card.js');
  const card=new MaraoSchedulesCard(),host=new Node(),actions=new Node(),error={textContent:''},dialog={open:true,querySelector:s=>s==='[data-form]'?host:s==='[data-error]'?error:actions,close(){this.open=false;}};
  card._modal=()=>dialog;card._weekdays=()=>{};card.isConnected=true;card._hass={states:{}};card._haptic=()=>{};
  let release;const calls=[];card._session={manifest:m,timers:[t],timer:async data=>{calls.push(structuredClone(data));if(calls.length===1)await new Promise(r=>release=r);}};
  card._editTimer({...t,enabled:true});const form=created[0];
  assert.deepEqual(form.schema.map(f=>f.name),['name','time','action']);
  const change=value=>form.dispatchEvent(Object.assign(new Event('value-changed'),{detail:{value}}));
  change({name:'First edit'});ctx.mock.timers.tick(500);assert.equal(calls.length,1);
  change({name:'Latest edit'});ctx.mock.timers.tick(500);assert.equal(calls.length,1,'Only one resource mutation at a time');
  release();for(let i=0;i<10;i++)await Promise.resolve();
  assert.equal(calls.length,2);assert.equal(calls[1].name,'Latest edit');assert.deepEqual(calls[1].targets,t.targets);assert.equal(calls[1].timer_group_id,'summer');
  card._session.timer=async()=>{throw new Error('Write refused');};change({name:'Rejected edit'});ctx.mock.timers.tick(500);for(let i=0;i<5;i++)await Promise.resolve();
  await dialog._close();assert.equal(dialog.open,true,'A failed edit stays open for recovery');assert.equal(error.textContent,'Write refused');
  card._session.timer=async()=>{};
  await dialog._close();assert.equal(dialog.open,false);
});
