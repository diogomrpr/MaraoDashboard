import test from 'node:test';
import assert from 'node:assert/strict';
import {activityTimestamp,hasActivity,activitySources,activityRange,normalizeActivity,filterActivity,loadActivity} from '../../custom_components/marao_dashboard/frontend/MaraoActivityModel.js';

test('activity semantics replace activation metadata without consuming date measurements or authored labels',()=>{
 for(const domain of ['button','input_button','scene'])assert.equal(activityTimestamp(domain+'.gate',{state:'2026-11-04T12:00:00Z'}),true);
 assert.equal(activityTimestamp('sensor.date',{state:'2026-11-04T12:00:00Z'}),false);
 assert.equal(activityTimestamp('sensor.date',{state:'12'}),false);
 assert.equal(hasActivity({template:'md_sensor_card'},{}),true);
 assert.deepEqual(activitySources({entity:'button.gate',variables:{activity_entities:['binary_sensor.gate','button.gate','lock.gate']}}),['button.gate','binary_sensor.gate','lock.gate']);
});
test('calendar activity ranges honor HA time zone, DST and the 31-day bound',()=>{
 const range=activityRange('yesterday','Europe/Lisbon',Date.parse('2026-10-26T12:00:00Z'));assert.equal(range.end-range.start,25*3600000);
 assert.equal(new Date(range.start).toISOString(),'2026-10-24T23:00:00.000Z');
 assert.throws(()=>activityRange('custom','UTC',Date.parse('2026-11-04'),{start:'2026-09-01',end:'2026-11-04'}),/range/);
 assert.throws(()=>activityRange('custom','UTC',Date.parse('2026-11-04'),{start:'2026-11-05',end:'2026-11-05'}),/range/);
});
test('recorded activity excludes baselines and attribute noise, merges evidence and whitelists metadata',()=>{
 const t='2026-11-04T12:00:00Z',range={start:Date.parse('2026-11-04'),end:Date.parse('2026-11-05'),sources:['lock.gate','sensor.power']};
 const history=[[{entity_id:'lock.gate',state:'locked',last_changed:'2026-11-03T12:00:00Z'},{entity_id:'lock.gate',state:'locked',last_changed:t},{entity_id:'lock.gate',state:'unlocked',last_changed:t}], [{entity_id:'sensor.power',state:'10',last_changed:'2026-11-03T12:00:00Z'},{entity_id:'sensor.power',state:'20',last_changed:t,attributes:{unit_of_measurement:'W',pin:'secret'}}]];
 const rows=normalizeActivity(history,[{entity_id:'lock.gate',when:t,state:'unlocked',context_event_type:'call_service',context_user_id:'user',service_data:{code:'secret'}}],range);
 assert.equal(rows.length,2);const gate=rows.find(row=>row.source==='lock.gate');assert.equal(gate.kind,'opened','A result context is not a separate request');assert.equal(gate.before,'locked');assert.equal(gate.origin,'user');assert.equal(JSON.stringify(rows).includes('secret'),false);
 assert.equal(filterActivity(rows,{source:'sensor.power'})[0].unit,'W');
 const request=normalizeActivity([], [{entity_id:'lock.gate',when:t,event_type:'call_service',domain:'lock',service:'unlock',service_data:{code:'secret'}}],range);assert.equal(request[0].kind,'request');assert.equal(request[0].after,undefined);assert.equal(request[0].action,'lock.unlock');
});
test('activity reads bounded days, reports partial failure and discards late account/range work without retries',async()=>{
 const range=activityRange('today','UTC',Date.parse('2026-11-04T12:00:00Z')),calls=[];
 const hass={config:{time_zone:'UTC'},states:{},async callApi(method,path){calls.push([method,path]);if(path.startsWith('logbook'))throw new Error('unavailable');return [];}};
 const result=await loadActivity(hass,['lock.gate'],range);assert.equal(result.errors.length,1);assert.deepEqual(result.records,[]);assert.equal(calls.length,2);assert.ok(calls.every(([method])=>method==='GET'));
 let current=true,release;hass.callApi=()=>new Promise(resolve=>{release=resolve;});const pending=loadActivity(hass,['lock.gate'],range,()=>current);current=false;release([]);assert.equal(await pending,null);
 const rows=Array.from({length:80},(_,index)=>({kind:index===70?'request':'state',source:'lock.gate',origin:'unknown'}));assert.equal(filterActivity(rows,{kind:'request'}).length,1);
});
