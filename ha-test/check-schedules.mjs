// Focused execution/recovery check. Only native helpers created by this invocation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {ScheduleSession} from '../frontend_src/schedule-api.js';
const require=createRequire(import.meta.url),client=require('./client.js'),config=client.readConfig();
assert.equal(new URL(config.url).hostname,'192.168.0.28');
const privateRoot=fs.mkdtempSync(path.join(os.tmpdir(),'marao-schedule-check-'));fs.chmodSync(privateRoot,0o700);
const connection=await client.connect(config);
const api=async(method,pathname,body)=>{const response=await fetch(config.url+'/api/'+pathname,{method,headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok){const err=new Error('Native API returned '+response.status);err.status_code=response.status;throw err;}const value=await response.text();return value?JSON.parse(value):null;};
const hass={user:{is_admin:true},connected:true,callWS:message=>connection.call(message),callApi:api,callService:(domain,service,data)=>api('POST','services/'+domain+'/'+service,data)};
const id='test_'+crypto.randomUUID().replaceAll('-',''),session=new ScheduleSession(hass,id);let setup=false,finished=false;
const persist=()=>fs.writeFileSync(path.join(privateRoot,'recovery.json'),JSON.stringify(session.receipt,null,2),{mode:0o600});
try{
  await session.preflight();console.log('Native scheduling API preflight passed.');
  const targetRecords=[];
  for(const suffix of ['one','two']){targetRecords.push(await session.helper('input_boolean','Marao Dashboard Test Schedule '+suffix+' '+id.slice(-8),{}));persist();}
  const targets=targetRecords.map(record=>record.entity_id);assert.ok(targets.every(t=>t.startsWith('input_boolean.marao_dashboard_test_')));
  for(const target of targets)await hass.callService('input_boolean','turn_off',{entity_id:target});
  await session.setup('Marao test schedules',targets);setup=true;persist();console.log('Provisioned isolated scheduling resources.');
  const summer=await session.group('Summer'),winter=await session.group('Winter');persist();
  const server=await hass.callWS({type:'get_config'}),parts=()=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:server.time_zone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const data=(group,stop='none')=>{const p=parts();return {name:group===summer?'Summer start':'Winter start',timer_group_id:group,targets,days:[p.weekday.toLowerCase()],time:p.hour+':'+p.minute,stop_mode:stop,...(stop==='none'?{}:{duration_minutes:1})};};
  await session.timer(data(summer));await session.timer(data(winter));persist();assert.equal(session.timers.length,2);assert.equal(session.divergent,false);
  console.log('Controller enablement:',(await session.stateList())[await session.automationEntity('marao_schedules_'+id+'_controller')]?.state);await session.select(summer);const first=session.timers.find(t=>t.timer_group_id===summer);
  await hass.callService('automation','trigger',{entity_id:first.automation_entity,skip_condition:false});
  await session.wait(states=>targets.every(target=>states[target]?.state==='on'));
  let states=await session.stateList();assert.ok(session.manifest.targets.every(t=>states[t.timer.entity_id].state==='idle'&&states[t.mode.entity_id].state==='on_only'));
  await session.select(winter);states=await session.stateList();assert.ok(targets.every(target=>states[target].state==='on'));
  const otherCard=new ScheduleSession(hass,id);await otherCard.read();assert.equal(otherCard.selected,winter);assert.ok(otherCard.timers.every(t=>t.enabled));
  const original=await session.record('marao_schedules_'+id+'_controller');
  const simulation={...original,triggers:original.triggers.map(t=>t.id==='startup'?{trigger:'event',event_type:'marao_test_recovery_'+id,id:'startup'}:t)};
  await session.config('POST',original.id,simulation);await session.ws('fire_event',{event_type:'marao_test_recovery_'+id});
  states=await session.stateList();assert.ok(targets.every(target=>states[target].state==='on'));
  await session.config('POST',original.id,original);await session.read();
  console.log('Multi-device turn-on-only and Summer/Winter selection passed.');
  for(const target of targets)await session.request('stop',{target});
  await session.wait(states=>session.manifest.targets.every(t=>states[t.entity_id]?.state==='off'&&states[t.mode.entity_id]?.state==='idle'));
  await session.removeTimer(first);await session.timer(data(summer,'after_duration'));await session.select(summer);
  const timed=session.timers.find(t=>t.timer_group_id===summer);
  await hass.callService('automation','trigger',{entity_id:timed.automation_entity,skip_condition:false});
  await session.wait(states=>session.manifest.targets.every(t=>states[t.entity_id]?.state==='on'&&states[t.timer.entity_id]?.state==='active'));
  await session.select(winter);await session.deleteGroup(summer);persist();
  states=await session.stateList();assert.ok(session.manifest.targets.every(t=>states[t.timer.entity_id].state==='active'));
  console.log('Timed deadlines survived group switching and group deletion; waiting for native expiry.');
  for(let attempt=0;attempt<80;attempt++){states=await session.stateList();if(session.manifest.targets.every(t=>states[t.entity_id]?.state==='off'&&states[t.mode.entity_id]?.state==='idle')){finished=true;break;}await new Promise(resolve=>setTimeout(resolve,1000));}
  assert.equal(finished,true,'Native timed expiry must stop both fake targets');
  console.log('Native elapsed stopping passed with no dashboard connected.');
}catch(error){console.error('Focused scheduling check failed:',error.message);try{const list=await session.ws('trace/list',{domain:'automation',item_id:'marao_schedules_'+id+'_controller'});fs.writeFileSync(path.join(privateRoot,'traces.json'),JSON.stringify(list),{mode:0o600});for(const entry of list){const trace=await session.ws('trace/get',{domain:'automation',item_id:'marao_schedules_'+id+'_controller',run_id:entry.run_id});fs.writeFileSync(path.join(privateRoot,'trace-'+entry.run_id+'.json'),JSON.stringify(trace,null,2),{mode:0o600});console.log('Owned controller trace:',JSON.stringify({state:trace.state,error:trace.error,last_step:trace.last_step}));}}catch(traceError){console.log('Trace read:',traceError.message);}throw error;}finally{
  persist();
  try{if(setup){for(const target of session.manifest?.targets||[])await session.request('stop',{target:target.entity_id});await session.wait(states=>session.manifest.targets.every(t=>states[t.entity_id]?.state==='off'&&states[t.mode.entity_id]?.state==='idle'));await session.cleanup();}
    for(const helper of session.receipt.helpers.filter(h=>h.domain==='input_boolean'))await session.ws('input_boolean/delete',{input_boolean_id:helper.record.id});
    console.log('Temporary scheduling resources cleaned up.');
  }catch(error){console.error('Cleanup needs recovery; private receipt retained at '+privateRoot);throw error;}
  finally{connection.close();}
}
