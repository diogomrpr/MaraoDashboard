import test from 'node:test';
import assert from 'node:assert/strict';
import { createPowerHistory, loadPowerPeriod, powerStateAt } from '../../frontend_src/power-history.js';
import { periodRange, validatePowerDevices } from '../../frontend_src/history-data.js';
import { energyValue, MaraoPowerHistoryCard, MaraoCard } from '../../custom_components/marao_dashboard/frontend/MaraoCards.js';
const convert = (value, source, target='W') => energyValue(value, source, { display_unit: target });
const stamp = '2026-10-21T12:00:00.000Z';
const record = (id, time, state, unit='W') => ({ entity_id:id, last_updated:new Date(time).toISOString(), state:String(state), attributes:{unit_of_measurement:unit} });
const settle = () => new Promise(resolve => setImmediate(resolve));

test('power calendar weeks use Monday boundaries and real DST lengths', () => {
  const range=periodRange(stamp,0,'week','Europe/Lisbon');
  assert.equal(range.start.toISOString(),'2026-10-18T23:00:00.000Z');
  assert.equal(range.end.toISOString(),'2026-10-26T00:00:00.000Z');
  assert.equal((range.end-range.start)/3600000,169);
  const previous=periodRange(range.start,-1,'week','Europe/Lisbon');
  assert.equal(+previous.end,+range.start);
  const spring=periodRange('2026-03-29T12:00:00Z',0,'week','Europe/Lisbon');
  assert.equal((spring.end-spring.start)/3600000,167);
});

test('power bindings preserve explicit emptiness and reject duplicates without modifying unknown fields', () => {
  const options={power_devices:[{entity_id:'sensor.fridge',name:'Kitchen',future:{keep:[]}}]};
  const original=structuredClone(options);
  assert.deepEqual(validatePowerDevices(options,'sensor.house'),[]);
  assert.deepEqual(options,original);
  assert.deepEqual(validatePowerDevices({power_devices:[]},'sensor.house'),[]);
  for(const value of [null,'sensor.fridge',[{}],[{entity_id:'light.kitchen'}],[{entity_id:'sensor.house'}],[{entity_id:'sensor.fridge',name:3}], [...options.power_devices,...options.power_devices]])assert.ok(validatePowerDevices({power_devices:value},'sensor.house').length);
});

test('raw history includes all changes, preserves peaks and normalizes each recorded unit', async () => {
  const start=Date.parse('2026-10-21T00:00:00Z'), calls=[];
  const records=Array.from({length:30000},(_,index)=>record('sensor.house',start+index*1000,index===12345?99000:index%50));
  records.push(record('sensor.house',start+30001000,'0.15','kW'));
  const hass={callApi:async(method,url)=>{calls.push([method,new URL(url,'http://example/')]);return [records,[record('sensor.fridge',start,'0.025','kW'),record('sensor.fridge',start+1000,'unavailable')]];}};
  const result=await loadPowerPeriod({hass,ids:['sensor.house','sensor.fridge'],range:{start:new Date(start),end:new Date(start+86400000)},timeZone:'UTC',convert,now: start+86400000});
  assert.equal(calls[0][1].searchParams.get('significant_changes_only'),'0');
  assert.equal(calls[0][1].searchParams.has('minimal_response'),false);
  assert.ok(result.series['sensor.house'].length<=8192);
  assert.equal(Math.max(...result.series['sensor.house'].map(sample=>sample.value)),99000);
  assert.equal(result.series['sensor.house'].at(-1).value,150);
  assert.deepEqual(result.series['sensor.fridge'].map(sample=>sample.value),[25,null]);
  assert.equal(powerStateAt(result.series['sensor.fridge'],start+500).value,25);
  assert.equal(powerStateAt(result.series['sensor.fridge'],start+1500).value,null);
  assert.equal(powerStateAt(result.series['sensor.fridge'],start-1),null);
});

test('daily chunks stop after cancellation and incompatible devices do not corrupt the house trace', async () => {
  let current=true, calls=0;
  const range={start:new Date('2026-10-19T00:00:00Z'),end:new Date('2026-10-26T00:00:00Z')};
  const cancelled=await loadPowerPeriod({hass:{callApi:async()=>{calls++;current=false;return[];}},ids:['sensor.house'],range,timeZone:'UTC',convert,isCurrent:()=>current,now:+range.end});
  assert.equal(cancelled,undefined);assert.equal(calls,1);
  const result=await loadPowerPeriod({hass:{callApi:async()=>[[record('sensor.house',range.start,600)],[record('sensor.energy',range.start,2,'kWh')]]},ids:['sensor.house','sensor.energy'],range:{...range,end:new Date(+range.start+1000)},timeZone:'UTC',convert,now:+range.end});
  assert.equal(result.series['sensor.house'][0].value,600);
  assert.equal(result.errors['sensor.energy'],'power.unit_error');
  assert.deepEqual(result.series['sensor.energy'],[]);
});

class Element extends EventTarget {
  constructor(tag){super();this.tagName=tag;this.children=[];this.attributes={};this.style={};}
  append(child){this.children.push(child);child.parent=this;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
  setAttribute(name,value){this.attributes[name]=value;}
  focus(){let root=this;while(root.parent)root=root.parent;root.activeElement=this;}
}
function controller(api){
  const previous=globalThis.document;globalThis.document=Object.assign(new EventTarget(),{createElement:tag=>new Element(tag)});
  const previousFrame=globalThis.requestAnimationFrame, previousCancel=globalThis.cancelAnimationFrame, frames=new Map();let frameId=0;
  globalThis.requestAnimationFrame=callback=>{frames.set(++frameId,callback);return frameId;};
  globalThis.cancelAnimationFrame=id=>frames.delete(id);
  const host=new Element('host'), updates=[];
  const hass={connected:true,config:{time_zone:'Europe/Lisbon'},locale:{language:'en'},states:{'sensor.house':{state:'100',attributes:{unit_of_measurement:'W'}},'sensor.fridge':{state:'20',attributes:{unit_of_measurement:'W'}}},callApi:api};
  const options={entity:'sensor.house',name:'House',power_devices:[{entity_id:'sensor.fridge',name:'Fridge'}],hass,now:()=>Date.parse(stamp),convert,format:value=>String(value),localize:key=>key};
  const instance=createPowerHistory(host,options,(_container,initial)=>({update:next=>updates.push(next),destroy(){updates.push({destroyed:true});}}));
  const toolbar=host.children[1],picker=toolbar.children[0],select=picker.children[0],menu=picker.children[1],navigation=toolbar.children[1];
  return {instance,options,updates,select,picker,menu,host,document:globalThis.document,choose(unit){menu.children[['day','week','month'].indexOf(unit)].dispatchEvent(new Event('click'));},previous:navigation.children[0],title:navigation.children[1],next:navigation.children[2],
    async prefetch(){const pending=[...frames.values()];frames.clear();for(const callback of pending)callback();await new Promise(resolve=>setTimeout(resolve,0));await settle();},
    cleanup(){instance.destroy();globalThis.document=previous;globalThis.requestAnimationFrame=previousFrame;globalThis.cancelAnimationFrame=previousCancel;}};
}
const response=url=>{
  const time=Date.parse(url.split('/period/')[1].split('?')[0]);
  return [[record('sensor.house',time,100),record('sensor.house',time+1,300)], [record('sensor.fridge',time,20),record('sensor.fridge',time+1,40)]];
};

test('controller retains its controls across calendar navigation, reuses formatting data and does not retry failures', async () => {
  const calls=[];
  const f=controller(async(_method,url)=>{calls.push(url);return response(url);});
  try {
    assert.equal(f.select.disabled,true);await settle();
    assert.equal(calls.length,1);assert.equal(f.next.disabled,true);
    const select=f.select,previous=f.previous;
    f.previous.dispatchEvent(new Event('click'));await settle();
    assert.equal(f.next.disabled,false);assert.equal(f.select,select);assert.equal(f.previous,previous);
    assert.match(f.title.textContent,/20/);
    f.choose('week');await settle();
    assert.equal(f.next.disabled,true);assert.equal(f.updates.at(-1).range.start.toISOString(),'2026-10-18T23:00:00.000Z');
    f.choose('month');await settle();
    assert.equal(f.updates.at(-1).range.start.toISOString(),'2026-09-30T23:00:00.000Z');
    assert.equal(f.updates.at(-1).range.end.toISOString(),'2026-11-01T00:00:00.000Z');
    assert.equal(f.next.disabled,true);
    const before=calls.length;f.instance.update({display_unit:'kW',display_precision:2});await settle();assert.equal(calls.length,before);
    assert.equal(f.updates.at(-1).samples[0].value,0.1);
  } finally { f.cleanup(); }
  let failures=0;
  const failed=controller(async()=>{failures++;throw new Error('offline');});
  try {
    await settle();assert.equal(failed.updates.at(-1).error,'power.load_error');
    failed.instance.update({hass:{...failed.options.hass}});await settle();assert.equal(failures,1);
    failed.updates.at(-1).onRetry();await settle();assert.equal(failures,2);
  } finally {failed.cleanup();}
});

test('exact device probes include the baseline, skip later values, and ignore late selections after closing', async () => {
  const calls=[];let finish;
  const f=controller(async(_method,url)=>{calls.push(url);if(calls.length===1)return response(url);return new Promise(resolve=>{finish=resolve;});});
  try {
    await settle();const time=Date.parse('2026-10-21T09:00:00Z');
    f.updates.at(-1).onSelect(time);await settle();
    assert.equal(calls.length,2);
    const query=new URL(calls[1],'http://example/');assert.equal(+new Date(query.searchParams.get('end_time')),time+1);
    finish([[record('sensor.fridge',time-10000,'0.025','kW'),record('sensor.fridge',time+1,90)],[record('sensor.house',time-10000,100)]]);await settle();
    assert.equal(f.updates.at(-1).selection.values['sensor.fridge'].value,25);
    f.updates.at(-1).onSelect(time+1000);await settle();
    const before=f.updates.length;f.instance.destroy();
    finish(response(calls.at(-1)));await settle();
    assert.equal(f.updates.length,before+1);assert.equal(f.updates.at(-1).destroyed,true);assert.equal(calls.length,3);
  } finally {f.cleanup();}
});


test('power popup configuration is copied and the House Power History action opens it directly',()=>{
  const card=new MaraoPowerHistoryCard();
  const config={entity:'sensor.house',power_devices:[{entity_id:'sensor.fridge',name:'Kitchen',future:[]}]};
  card.setConfig(config);config.power_devices[0].name='Changed';
  assert.equal(card._config.power_devices[0].name,'Kitchen');
  assert.throws(()=>card.setConfig({entity:'sensor.house',power_devices:[{entity_id:'sensor.house'}]}),/unique/);
  const previous=globalThis.window,routes=[];
  globalThis.window={dispatchEvent(){},location:{pathname:'/marao-dashboard/energy',search:''},history:{pushState(_state,_title,path){routes.push(path);}}};
  try{
    MaraoCard.prototype._openHistory.call({preview:false,_graphEntity:()=> 'sensor.house',_graphAvailability:()=>'',
      _config:{variables:{history_popup:true,popup_hash:'#house'}},_hass:{states:{'sensor.house':{attributes:{unit_of_measurement:'W'}}}}});
    assert.deepEqual(routes,['/marao-dashboard/energy#house']);
  }finally{globalThis.window=previous;}
});

test('live spikes reported during a pending history request survive its completion',async()=>{
  let finish,clock=Date.parse(stamp);
  const f=controller(()=>new Promise(resolve=>{finish=resolve;}));
  try{
    clock+=1000;
    const hass={...f.options.hass,states:{...f.options.hass.states,'sensor.house':{state:'9900',last_updated:new Date(clock).toISOString(),attributes:{unit_of_measurement:'W'}}}};
    f.instance.update({hass,now:()=>clock});
    clock+=1000;
    f.instance.update({hass:{...hass,states:{...hass.states,'sensor.house':{state:'100',last_updated:new Date(clock).toISOString(),attributes:{unit_of_measurement:'W'}}}}});
    finish(response('history/period/2026-10-20T23:00:00.000Z?'));
    await settle();assert.equal(Math.max(...f.updates.at(-1).samples.map(item=>item.value)),9900);
  }finally{f.cleanup();}
});

test('neighbor prefetch waits for the selected chart to load and paint, and reuses pending unit pages',async()=>{
  const calls=[];let finish;
  const f=controller((_method,url)=>{calls.push(url);return calls.length<=2?new Promise(resolve=>{finish=resolve;}):Promise.resolve(response(url));});
  try{
    await f.prefetch();assert.equal(calls.length,1);assert.equal(f.updates.at(-1).loading,true);
    finish(response(calls[0]));await settle();
    assert.equal(f.updates.at(-1).loading,false);assert.equal(calls.length,1);
    await f.prefetch();assert.equal(calls.length,2);
    assert.match(calls[1],/2026-10-18T23:00:00/);
    f.choose('week');await settle();
    assert.equal(calls.length,2,'changing unit shares the pending background request');
    finish(response(calls[1]));await settle();assert.equal(f.updates.at(-1).loading,false);
    assert.equal(calls.length,3);
    f.choose('day');await settle();
    assert.equal(calls.length,3,'returning to a freshly loaded unit reuses its first page');
  }finally{f.cleanup();}
});

test('day, week and month load four neighbors each way, nearest first, without future requests',async()=>{
  for(const period of ['day','week','month']){
    const calls=[];
    const f=controller(async(_method,url)=>{calls.push(url);return response(url);});
    try{
      await settle();
      if(period!=='day'){f.choose(period);await settle();}
      const current=periodRange(stamp,0,period,'Europe/Lisbon');
      const before=calls.length;await f.prefetch();
      const expected=[], seen=new Set(calls.slice(0,before).map(url=>url.split('/period/')[1].split('?')[0]));
      function addChunks(interval){
        for(let from=+interval.start;from<Math.min(+interval.end,Date.parse(stamp));){
          const key=new Date(from).toISOString();
          if(!seen.has(key)){expected.push(key);seen.add(key);}
          from=Math.min(+periodRange(from,0,'day','Europe/Lisbon').end,+interval.end);
        }
      }
      for(const unit of ['day','week','month'])if(unit!==period && !(period!=='day'&&unit==='day'))addChunks(periodRange(stamp,0,unit,'Europe/Lisbon'));
      for(let offset=-1;offset>=-4;offset--)addChunks(periodRange(current.start,offset,period,'Europe/Lisbon'));
      assert.deepEqual(calls.slice(before).map(url=>url.split('/period/')[1].split('?')[0]),expected,period);
      const cachedCalls=calls.length;
      for(let step=0;step<4;step++){f.previous.dispatchEvent(new Event('click'));await settle();}
      assert.equal(calls.length,cachedCalls,period+' neighbors are cached');
      // At four periods back, complete the newly centered window on both sides.
      expected.length=0;
      for(let offset=-5;offset>=-8;offset--)addChunks(periodRange(current.start,offset,period,'Europe/Lisbon'));
      await f.prefetch();
      assert.deepEqual(calls.slice(cachedCalls).map(url=>url.split('/period/')[1].split('?')[0]),expected,period);
      const filled=calls.length;
      for(let step=0;step<4;step++){f.next.dispatchEvent(new Event('click'));await settle();}
      assert.equal(calls.length,filled,period+' forward neighbors are cached');
      for(let step=0;step<5;step++){f.previous.dispatchEvent(new Event('click'));await settle();}
      assert.equal(+f.updates.at(-1).range.start,+periodRange(current.start,-5,period,'Europe/Lisbon').start,period+' navigation works beyond the prefetched window');
    }finally{f.cleanup();}
  }
});

test('background errors do not change the selected chart, loop, or prevent a selected retry',async()=>{
  const calls=[];
  const f=controller(async(_method,url)=>{calls.push(url);if(calls.length===2)throw new Error('offline');return response(url);});
  try{
    await settle();const before=f.updates.length;
    await f.prefetch();assert.equal(calls.length,22);assert.equal(f.updates.length,before);
    await f.prefetch();assert.equal(calls.length,22);
    f.choose('week');await settle();assert.equal(calls.length,22,'retry reuses daily data recovered by the month prefetch');
    assert.equal(f.updates.at(-1).error,'');assert.equal(f.updates.at(-1).loading,false);
  }finally{f.cleanup();}
});

test('stale background chunks stop after closing or changing the period or device sources',async()=>{
  for(const change of ['close','period','sources']){
    const calls=[];let finish;
    const f=controller(async(_method,url)=>{calls.push(url);return calls.length===2?new Promise(resolve=>{finish=resolve;}):response(url);});
    try{
      await settle();f.choose('week');await settle();
      // Complete the selected week's first daily chunk before testing background work.
      finish(response(calls[1]));await settle();
      const selected=calls.length;
      f.options.hass.callApi=(_method,url)=>{calls.push(url);return new Promise(resolve=>{finish=resolve;});};
      await f.prefetch();assert.equal(calls.length,selected+1);
      const oldUrl=calls.at(-1), finishBackground=finish;
      if(change==='close')f.instance.destroy();
      else if(change==='period'){f.choose('day');}
      else f.instance.update({power_devices:[]});
      const after=calls.length;
      finishBackground(response(oldUrl));await settle();assert.equal(calls.length,after);
    }finally{f.cleanup();}
  }
});

test('returning to an accumulating or just-ended period refreshes its stale snapshot',async()=>{
  for(const advance of [61000,86400000]){
  const calls=[];
  const f=controller(async(_method,url)=>{calls.push(url);return response(url);});
  try{
    await settle();await f.prefetch();const before=calls.length;
    f.previous.dispatchEvent(new Event('click'));await settle();assert.equal(calls.length,before);
    f.instance.update({now:()=>Date.parse(stamp)+advance});await settle();
    f.next.dispatchEvent(new Event('click'));await settle();assert.equal(calls.length,before+1);
    assert.match(calls.at(-1),/2026-10-20T23:00:00/);
  }finally{f.cleanup();}
  }
});

test('the themed period menu retains focus and selection across HA updates and closes with Escape or outside input',async()=>{
  const f=controller(async(_method,url)=>response(url));
  const key=value=>{const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'key',{value});return event;};
  try{
    await settle();assert.equal(f.select.tagName,'button');assert.equal(f.select.attributes['aria-haspopup'],'menu');
    f.select.dispatchEvent(new Event('click'));
    assert.equal(f.menu.hidden,false);assert.equal(f.select.attributes['aria-expanded'],'true');
    const day=f.menu.children[0];assert.equal(f.host.activeElement,day);assert.equal(day.attributes['aria-checked'],'true');
    f.instance.update({hass:{...f.options.hass}});await settle();
    assert.equal(f.menu.hidden,false);assert.equal(f.menu.children[0],day);assert.equal(f.host.activeElement,day);
    f.picker.dispatchEvent(key('ArrowDown'));assert.equal(f.host.activeElement,f.menu.children[1]);
    f.picker.dispatchEvent(key('End'));assert.equal(f.host.activeElement,f.menu.children[2]);
    f.choose('month');await settle();
    assert.equal(f.menu.hidden,true);assert.equal(f.menu.children[2].attributes['aria-checked'],'true');
    f.select.dispatchEvent(new Event('click'));f.picker.dispatchEvent(key('Escape'));
    assert.equal(f.menu.hidden,true);assert.equal(f.host.activeElement,f.select);
    f.select.dispatchEvent(new Event('click'));f.document.dispatchEvent(new Event('pointerdown'));
    assert.equal(f.menu.hidden,true);
    f.instance.destroy();f.select.dispatchEvent(new Event('click'));assert.equal(f.menu.hidden,true);
  }finally{f.cleanup();}
});

test('first pages for every unit stay cached while navigating another unit and switching warms its neighbors',async()=>{
  const calls=[];
  const f=controller(async(_method,url)=>{calls.push(url);return response(url);});
  try{
    await settle();await f.prefetch();
    const before=calls.length;
    for(let day=0;day<4;day++){f.previous.dispatchEvent(new Event('click'));await settle();}
    f.choose('month');await settle();assert.equal(calls.length,before);
    assert.equal(f.updates.at(-1).range.start.toISOString(),'2026-09-30T23:00:00.000Z');
    assert.equal(f.updates.at(-1).loading,false);
    await f.prefetch();assert.ok(calls.length>before);
    assert.match(calls[before],/2026-08-31T23:00:00/);
    const warmed=calls.length;f.previous.dispatchEvent(new Event('click'));await settle();
    assert.equal(calls.length,warmed);
    f.choose('week');await settle();assert.equal(calls.length,warmed);
  }finally{f.cleanup();}
});

test('daily chunks share in-flight reads across periods, expire live data and evict failures', async()=>{
  const chunks=new Map(),calls=[];let finish,clock=Date.parse(stamp);
  const hass={callApi:(_method,url)=>{calls.push(url);return calls.length===1?new Promise(resolve=>{finish=resolve;}):Promise.resolve(response(url));}};
  const options={hass,ids:['sensor.house','sensor.fridge'],timeZone:'Europe/Lisbon',convert,chunks,now:clock};
  const day=periodRange(stamp,0,'day','Europe/Lisbon');
  const first=loadPowerPeriod({...options,range:day}), second=loadPowerPeriod({...options,range:day});
  assert.equal(calls.length,1);finish(response(calls[0]));await Promise.all([first,second]);
  await loadPowerPeriod({...options,range:periodRange(stamp,0,'week','Europe/Lisbon')});
  assert.equal(calls.length,3,'three days in this week, with today reused');
  await loadPowerPeriod({...options,range:day,now:clock+61000});assert.equal(calls.length,4);
  const failed=new Map();let attempts=0;
  const retry={...options,chunks:failed,range:day,hass:{callApi:async()=>{if(++attempts===1)throw Error('offline');return [];}}};
  await assert.rejects(loadPowerPeriod(retry),/offline/);assert.equal(failed.size,0);
  await loadPowerPeriod(retry);assert.equal(attempts,2);
  for(let offset=-1;offset>=-70;offset--)await loadPowerPeriod({...options,range:periodRange(stamp,offset,'day','Europe/Lisbon')});
  assert.ok(chunks.size<=64,'daily working cache is bounded');
});

test('daily reuse is invalidated when a source unit or availability changes',async()=>{
  const calls=[],f=controller(async(_method,url)=>{calls.push(url);return response(url);});
  try{
    await settle();const old=f.options.hass;
    const changed={...old,states:{...old.states,'sensor.house':{state:'1',attributes:{unit_of_measurement:'kW'}}}};
    f.instance.update({hass:changed});await settle();assert.equal(calls.length,2);
    f.instance.update({hass:{...changed,states:{...changed.states,'sensor.fridge':{state:'unavailable',attributes:{unit_of_measurement:'W'}}}}});await settle();
    assert.equal(calls.length,3);assert.equal(new URL(calls.at(-1),'http://test/').searchParams.get('filter_entity_id'),'sensor.house');
  }finally{f.cleanup();}
});
