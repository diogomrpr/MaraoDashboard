import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTimer,controllerConfig,startConfig,recognized,MANAGER} from '../../frontend_src/schedule-model.js';
import {ScheduleSession} from '../../frontend_src/schedule-api.js';
const m={id:'garden',name:'Garden',status:'ready',groups:[{id:'summer',name:'Summer'},{id:'winter',name:'Winter'}],selection:{entity_id:'input_select.season'},targets:[{entity_id:'input_boolean.one',mode:{entity_id:'input_select.one'},timer:{entity_id:'timer.one'}},{entity_id:'switch.two',mode:{entity_id:'input_select.two'},timer:{entity_id:'timer.two'}}],schedules:[]};
const t={id:'morning',name:'Morning',timer_group_id:'summer',targets:['input_boolean.one','switch.two'],days:['mon'],time:'07:00',stop_mode:'none'};
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
