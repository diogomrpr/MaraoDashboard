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

test('timeline dropdowns synchronize selection/reset and dispose replaced or closed controls',async t=>{
 const previous={document:globalThis.document,window:globalThis.window};t.after(()=>Object.assign(globalThis,previous));
 class Node extends EventTarget {
  constructor(tag='div'){super();this.tag=tag;this.children=[];this.attributes={};this.style={};this.className='';}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  prepend(node){this.append(node);this.children.unshift(this.children.pop());}
  before(node){node.remove();node.parentElement=this.parentElement;this.parentElement.children.splice(this.parentElement.children.indexOf(this),0,node);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(node=>node!==this);this.parentElement=null;}
  replaceChildren(){for(const node of [...this.children])node.remove();}
  setAttribute(key,value){this.attributes[key]=value;}getAttribute(key){return this.attributes[key];}removeAttribute(key){delete this.attributes[key];}
  getRootNode(){return globalThis.document;}focus(){globalThis.document.activeElement=this;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){const match=node=>selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):selector==='[role=status]'?node.attributes.role==='status':node.tag===selector;return this.children.flatMap(node=>[...(match(node)?[node]:[]),...node.querySelectorAll(selector)]);}
  set innerHTML(value){this.replaceChildren();if(value.startsWith('<ha-icon')){this.append(new Node('ha-icon'),new Node('span'));return;}const section=new Node('section'),header=new Node('header'),scroll=new Node(),panel=new Node(),status=new Node('p'),list=new Node();section.className='marao-activity';scroll.className='marao-activity-scroll';panel.className='marao-activity-filters';panel.hidden=true;status.setAttribute('role','status');list.className='marao-activity-list';scroll.append(panel,status,list);section.append(header,scroll);this.append(section);}
 }
 globalThis.document=Object.assign(new EventTarget(),{createElement:tag=>new Node(tag)});globalThis.window=new EventTarget();
 const {readFile}=await import('node:fs/promises'),{bindDropdown,dropdownStyles}=await import('../../custom_components/marao_dashboard/frontend/MaraoDropdown.js');
 const {dateKey}=await import('../../custom_components/marao_dashboard/frontend/MaraoActivityModel.js');
 const source=(await readFile(new URL('../../custom_components/marao_dashboard/frontend/MaraoActivity.js',import.meta.url),'utf8')).replace(/^const \{.*?\}=await import.*\n/gm,'').replace('export function','function');
 let records=[{time:Date.now()-1000,source:'light.a',kind:'state',origin:'user',initiator:'alex',before:'off',after:'on'}],queries=0,haptics=0;
 const create=new Function('activityRange','dateKey','filterActivity','loadActivity','bindDropdown','dropdownStyles',source+';return createActivity;')(activityRange,dateKey,filterActivity,async()=>{queries++;return {records,errors:[]};},bindDropdown,dropdownStyles);
 const host=new Node(),activity=create(host,{hass:{language:'en',config:{time_zone:'UTC'},states:{}},sources:['light.a'],haptic(){haptics++;}}),flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
 const field=label=>host.querySelectorAll('.marao-activity-field').find(node=>node.children[0].textContent===label),trigger=field=>field.children[1].children[0],menu=field=>field.children[1].children[1],selected=field=>trigger(field).children[0].textContent,choose=(field,label)=>menu(field).children.find(node=>node.children[0].textContent===label).dispatchEvent(new Event('click'));
 const date=field('Date');assert.equal(selected(date),'Today');assert.equal(queries,1);choose(date,'Today');assert.equal(queries,1);
 trigger(date).dispatchEvent(new Event('click'));assert.equal(menu(date).hidden,false);date.children[1].dispatchEvent(Object.assign(new Event('keydown'),{key:'Escape'}));assert.equal(menu(date).hidden,true);assert.equal(document.activeElement,trigger(date));assert.equal(queries,1);
 const oldOrigin=field('Origin'),oldTrigger=trigger(oldOrigin);choose(date,'Custom range');assert.equal(host.querySelector('.marao-activity-custom-dates').hidden,false);assert.equal(queries,2);await flush();
 oldTrigger.dispatchEvent(new Event('click'));assert.equal(menu(oldOrigin).hidden,true,'Replaced controls have no live dropdown binding');
 choose(field('Origin'),'User');assert.equal(selected(field('Origin')),'User');records=[];choose(date,'Yesterday');await flush();assert.equal(field('Origin'),undefined);assert.equal(selected(date),'Yesterday');
 const reset=host.querySelector('.marao-activity-filters').children.find(node=>node.tag==='button');const before=queries;reset.onclick();await flush();assert.equal(queries,before+1);assert.equal(selected(date),'Today');assert.equal(host.querySelector('.marao-activity-custom-dates').hidden,true);
 const type=field('Event type');trigger(type).dispatchEvent(new Event('click'));host.querySelector('.marao-activity-filter-toggle').onclick();assert.equal(menu(type).hidden,true,'Hiding the panel closes its menus');
 trigger(date).dispatchEvent(new Event('click'));const pressed=haptics;activity.destroy();assert.equal(menu(date).hidden,true);trigger(date).dispatchEvent(new Event('click'));assert.equal(haptics,pressed);assert.equal(host.children.length,0);
});
