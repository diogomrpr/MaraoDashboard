import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSamples, historyWindow, reduceSamples, summary, nearestSample, periodRange, energyBuckets, statisticsBuckets, energyTotal } from '../../frontend_src/history-data.js';
const hour=3600000, end=Date.parse('2026-10-18T12:00:00Z');

test('normalization sorts actual timestamps, keeps explicit gaps and authoritative live replacements without mutating Recorder',()=>{
  const records=[{state:'4',last_updated:'2026-10-18T11:00:00Z'},{state:'unavailable',last_changed:'2026-10-18T10:00:00Z'},{state:'3',last_updated:'2026-10-18T11:00:00Z'},
    {state:'',last_updated:'2026-10-18T09:00:00Z'},{state:'99',last_updated:'invalid'}];
  const original=structuredClone(records),live={state:'7.125',last_updated:'2026-10-18T11:00:00Z'};
  assert.deepEqual(normalizeSamples(records,{live}),[{time:end-3*hour,value:null},{time:end-2*hour,value:null},{time:end-hour,value:7.125,live:true}]);
  assert.deepEqual(records,original);assert.equal(live.state,'7.125');
  assert.deepEqual(normalizeSamples([{time:0,value:0},{time:1,value:null},{time:2,value:false}]),[{time:0,value:0},{time:1,value:null},{time:2,value:null}]);
});

test('each original sample supplies its own unit metadata before extrema and incompatible numeric units fail explicitly',()=>{
  const records=[{time:1,state:'2000',attributes:{unit_of_measurement:'Wh'}},{time:2,state:'3.12345',attributes:{unit_of_measurement:'kWh'}},{time:3,state:'unknown',attributes:{}}];
  const original=structuredClone(records);let calls=0;
  const samples=normalizeSamples(records,{convert:(value,record)=>{calls++;return value*(record.attributes.unit_of_measurement==='Wh'?.001:1);}});
  assert.deepEqual(samples,[{time:1,value:2},{time:2,value:3.12345},{time:3,value:null}]);assert.equal(calls,2);assert.deepEqual(records,original);
  assert.deepEqual(summary(samples,'total_increasing'),{minimum:2,maximum:3.12345});
  assert.throws(()=>normalizeSamples([{time:1,state:'3',attributes:{unit_of_measurement:'W'}}],{convert:()=>{throw Error('Incompatible unit');}}),/Incompatible/);
});

test('1h/6h/24h windows filter existing observations inclusively without inventing timestamps or boundaries',()=>{
  const samples=[25,24,6,1,0].map((hours,index)=>({time:end-hours*hour,value:index}));
  for(const [hours,values] of [[1,[3,4]],[6,[2,3,4]],[24,[1,2,3,4]]]){
    const window=historyWindow(samples,hours,end);assert.deepEqual(window.map(s=>s.value),values);assert.ok(window.every(sample=>samples.includes(sample)));
  }
  assert.equal(historyWindow([{time:end-hour-1,value:42}],1,end).length,0);
  assert.equal(nearestSample(samples,end-2*hour),samples[3]);assert.equal(nearestSample([{time:end,value:null}],end),null);
});

test('full precision extrema and an explicitly named arithmetic sample average are reserved for measurements',()=>{
  const samples=[{time:1,value:1.001},{time:2,value:1.009},{time:3,value:null},{time:4,value:8}];
  assert.deepEqual(summary(samples,'measurement'),{minimum:1.001,maximum:8,average:(1.001+1.009+8)/3});
  for(const semantics of [undefined,'total','total_increasing'])assert.deepEqual(summary(samples,semantics),{minimum:1.001,maximum:8});
  assert.deepEqual(summary([{time:1,value:null}],'measurement'),{minimum:null,maximum:null});
});

test('bounded drawing preserves narrow extrema and known gaps while exact selection still uses original readings',()=>{
  const samples=Array.from({length:12000},(_,index)=>({time:index*101,value:Math.sin(index/100)}));
  samples[673].value=1234.567891;samples[9999].value=-98.7654321;
  for(let index=1400;index<1410;index++)samples[index].value=null;
  samples[6100].value=null;
  const before=structuredClone(samples),drawing=reduceSamples(samples,240);
  assert.ok(drawing.length<=240);assert.ok(drawing.some(s=>s.value===1234.567891));assert.ok(drawing.some(s=>s.value===-98.7654321));
  assert.ok(drawing.some(s=>s.value===null));assert.deepEqual(samples,before);
  assert.equal(nearestSample(samples,673*101),samples[673]);assert.equal(summary(samples).maximum,1234.567891);
  for(let index=1;index<drawing.length;index++){
    if(drawing[index-1].value===null||drawing[index].value===null)continue;
    assert.equal(samples.some(sample=>sample.time>drawing[index-1].time&&sample.time<drawing[index].time&&sample.value===null),false,'Reduction must never draw across a known unavailable interval');
  }
  const single=[{time:123,value:4.00001}];assert.deepEqual(reduceSamples(single),single);assert.notEqual(reduceSamples(single)[0],single[0]);
});

for(const [now,offset,period,zone,start,finish] of [
  ['2026-03-29T12:00:00Z',0,'day','Europe/Lisbon','2026-03-29T00:00:00.000Z','2026-03-29T23:00:00.000Z'],
  ['2026-10-25T12:00:00Z',0,'day','Europe/Lisbon','2026-10-24T23:00:00.000Z','2026-10-26T00:00:00.000Z'],
  ['2026-03-30T12:00:00Z',-1,'day','Europe/Lisbon','2026-03-29T00:00:00.000Z','2026-03-29T23:00:00.000Z'],
  ['2026-10-18T12:00:00Z',0,'month','Europe/Lisbon','2026-09-30T23:00:00.000Z','2026-11-01T00:00:00.000Z'],
  ['2026-12-31T23:00:00Z',0,'month','Asia/Kolkata','2026-12-31T18:30:00.000Z','2027-01-31T18:30:00.000Z'],
  ['2026-01-01T00:30:00Z',0,'day','America/Los_Angeles','2025-12-31T08:00:00.000Z','2026-01-01T08:00:00.000Z'],
])test(`${period} calendar uses HA ${zone} boundaries at ${now} offset ${offset}`,()=>{
  const range=periodRange(now,offset,period,zone);assert.equal(range.start.toISOString(),start);assert.equal(range.end.toISOString(),finish);
});

test('energy intervals use counter changes and resets, preserve signed totals and convert every source sample',()=>{
  const range={start:0,end:3*hour},records=[{time:0,value:1000},{time:hour/2,value:2500},{time:hour,value:500},{time:2*hour,value:500}];
  const before=structuredClone(records),options={range,period:'day',now:2*hour,convert:value=>value/1000};
  const reset=energyBuckets(records,{...options,stateClass:'total_increasing'});
  assert.deepEqual(reset.samples.map(sample=>sample.value),[2,0,null]);assert.equal(reset.limited,false);assert.equal(energyTotal(reset.samples),2);
  assert.deepEqual(energyBuckets(records,{...options,stateClass:'total'}).samples.map(sample=>sample.value),[-.5,0,null]);
  assert.deepEqual(energyBuckets(records,options),reset,'Legacy period sensors retain resettable counter semantics');assert.deepEqual(records,before);
  const negative=[{time:0,value:2},{time:hour,value:-1}];
  assert.equal(energyBuckets(negative,{...options,stateClass:'total_increasing'}).samples[0].value,null);
  assert.equal(energyBuckets(negative,{range,period:'day',now:hour,stateClass:'total'}).samples[0].value,-3);
});

test('raw energy never creates consumption without a baseline or across unavailable and multi-bucket gaps',()=>{
  const options={range:{start:0,end:6*hour},period:'day',now:6*hour};
  const missing=energyBuckets([{time:hour/2,value:8},{time:hour,value:9}],options);
  assert.equal(missing.samples[0].value,null);assert.equal(missing.limited,true);
  const gaps=energyBuckets([{time:0,value:10},{time:hour,value:11},{time:hour*1.5,value:null},{time:2*hour,value:13},{time:5*hour,value:19},{time:6*hour,value:20}],options);
  assert.deepEqual(gaps.samples.map(sample=>sample.value),[1,null,null,null,null,1]);assert.equal(gaps.limited,true);
  const skipped=energyBuckets([{time:0,value:1},{time:2*hour,value:3}],{...options,now:2*hour});
  assert.deepEqual(skipped.samples.slice(0,2).map(sample=>sample.value),[null,null],'A two-hour counter difference cannot be attributed to one hour');
  assert.equal(energyTotal([{value:null}]),null);assert.equal(energyTotal([{value:0},{value:null}]),0);
});

test('current raw energy keeps the measured partial tail and leaves future hours empty',()=>{
  const result=energyBuckets([{time:0,value:10},{time:hour,value:12},{time:hour*1.5,value:13}],{range:{start:0,end:4*hour},period:'day',now:hour*1.75});
  assert.deepEqual(result.samples,[{time:0,end:hour,value:2},{time:hour,end:2*hour,value:1,coverageLimited:true},{time:2*hour,end:3*hour,value:null},{time:3*hour,end:4*hour,value:null}]);
  assert.equal(result.limited,true);
});

test('hourly energy follows actual DST hours and daily energy uses local calendar boundaries',()=>{
  for(const [date,count] of [['2026-03-29T12:00:00Z',23],['2026-10-25T12:00:00Z',25]]){
    const range=periodRange(date,0,'day','Europe/Lisbon'),result=energyBuckets([],{range,period:'day',timeZone:'Europe/Lisbon',now:range.end});
    assert.equal(result.samples.length,count);assert.equal(result.samples.at(-1).end,+range.end);
  }
  const range=periodRange('2026-10-10',0,'month','Europe/Lisbon'),result=statisticsBuckets([],{range,period:'month',timeZone:'Europe/Lisbon',now:range.end});
  assert.equal(result.samples.length,31);assert.equal(result.samples[24].end-result.samples[24].time,25*hour);
  assert.equal(result.samples[0].time,+range.start);assert.equal(result.samples.at(-1).end,+range.end);
});

test('Recorder statistics preserve exact changes, null gaps, interval coverage and source conversion',()=>{
  const records=[{start:0,end:hour,change:2500},{start:hour,end:2*hour,change:null},{start:3*hour,end:4*hour,change:0},{start:4*hour,end:5*hour,change:-500}];
  const before=structuredClone(records),result=statisticsBuckets(records,{range:{start:0,end:6*hour},period:'day',now:4.5*hour,convert:(value,record)=>{assert.ok(records.includes(record));return value/1000;}});
  assert.deepEqual(result.samples.map(sample=>sample.value),[2.5,null,null,0,-.5,null]);assert.equal(result.samples[4].coverageLimited,true);assert.equal(result.limited,true);assert.equal(energyTotal(result.samples),2);assert.deepEqual(records,before);
  const unaligned=statisticsBuckets([{start:hour/2,end:hour,change:3}],{range:{start:0,end:hour},period:'day',now:hour});
  assert.equal(unaligned.samples[0].value,null,'An interval starting mid-bucket cannot imply a complete baseline');
});
