import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as data from '../../frontend_src/history-data.js';
import { powerStateAt } from '../../frontend_src/power-history.js';
const source=fs.readFileSync(new URL('../../frontend_src/history-chart.js',import.meta.url),'utf8');
function fixture(options={}){
  const registry=new Map(),instances=[],observers=[],frames=new Map();let frameId=0;
  let width=320,fail=false,attempts=0;
  class Element extends EventTarget{
    constructor(tag){super();this.tagName=tag;this.children=[];this.attributes={};this.style={};this.dataset={};this.ownerDocument=doc;this.hidden=false;}
    append(...elements){for(const element of elements){this.children.push(element);element.parent=this;}}
    replaceChildren(...elements){for(const child of this.children)child.parent=null;this.children=[];this.append(...elements);}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(element=>element!==this);}
    setAttribute(name,value){this.attributes[name]=value;}
    getAttribute(name){return this.attributes[name]??null;}
    removeAttribute(name){delete this.attributes[name];}
    getBoundingClientRect(){return{width,height:250};}
  }
  const doc={createElement:tag=>new Element(tag)};
  class FakeChart{
    static register(...modules){this.modules=modules;}
    static getChart(canvas){return registry.get(canvas);}
    constructor(canvas,config){attempts++;this.canvas=canvas;this.data=config.data;this.options=config.options;this.scales={x:{getValueForPixel:pixel=>pixel}};this.updates=0;this.destroys=0;registry.set(canvas,this);if(fail)throw Error('Canvas rejected');instances.push(this);}
    update(){this.updates++;}
    destroy(){this.destroys++;registry.delete(this.canvas);}
  }
  class Observer{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
  const context=vm.createContext({...data,Chart:FakeChart,LineController:'line',LineElement:'lineElement',PointElement:'point',BarController:'bar',BarElement:'barElement',LinearScale:'linear',Filler:'fill',
    chartColor:value=>({alpha:()=>({rgbString:()=>value})}),document:doc,ResizeObserver:Observer,AbortController,CustomEvent,
    requestAnimationFrame:callback=>{frames.set(++frameId,callback);return frameId;},cancelAnimationFrame:id=>frames.delete(id),
    getComputedStyle:element=>({color:element.style.color||'#233044',fontSize:'16px',getPropertyValue:()=>''})});
  context.powerStateAt=powerStateAt;
  vm.runInContext(source.replace(/^import .*;\n/gm,'').replaceAll('export function','function')+'\nglobalThis.create=createHistoryChart;',context);
  const container=new Element('div'),end=Date.parse('2026-10-18T12:00:00Z');
  const samples=[{time:end-5*3600000,value:12.123456},{time:end-3600000,value:40.123456},{time:end-600000,value:null},{time:end,value:20.123456}];
  const renderer=context.create(container,{samples,end,hass:{locale:{language:'en'},config:{time_zone:'Europe/Lisbon'}},format:value=>value.toFixed(6),stateClass:'measurement',...options});
  const elements=(tag,root=container)=>root.children.flatMap(element=>[...(element.tagName===tag?[element]:[]),...elements(tag,element)]);
  const findClass=name=>{const walk=root=>root.className===name?root:root.children.map(walk).find(Boolean);return walk(container);};
  const click=element=>element.dispatchEvent(new Event('click'));
  return{renderer,container,instances,observers,registry,elements,findClass,click,samples,end,Chart:FakeChart,flushFrames(){const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback());},get attempts(){return attempts;},setWidth(value){width=value;},setFail(value){fail=value;}};
}

test('detail registers only required modules, uses click-only numeric axes, retains canvas and selects full precision original readings',()=>{
  const f=fixture(),chart=f.instances[0],canvas=f.elements('canvas')[0],readout=f.findClass('history-reading');
  assert.deepEqual(f.Chart.modules,['line','lineElement','point','bar','barElement','linear','fill']);
  assert.deepEqual([...chart.options.events],['click']);assert.equal(chart.options.animation,false);assert.equal(chart.options.scales.x.type,'linear');
  assert.equal(readout.children[0].textContent,'20.123456');assert.equal(f.elements('button').find(b=>b.textContent==='Next reading').disabled,true);
  chart.options.onClick({x:f.samples[0].time+1});
  assert.equal(readout.children[0].textContent,'12.123456');assert.match(readout.children[1].textContent,/08:00:00/);
  assert.equal(f.elements('button').find(b=>b.textContent==='Previous reading').disabled,true);
  f.click(f.elements('button').find(b=>b.textContent==='Next reading'));
  assert.equal(readout.children[0].textContent,'40.123456');
  f.renderer.update({samples:[...f.samples,{time:f.end+1,value:99.123456}],format:value=>value.toFixed(2)});
  assert.equal(f.instances.length,1);assert.equal(f.elements('canvas')[0],canvas);assert.equal(readout.children[0].textContent,'40.12');
  assert.equal(chart.data.datasets[0].spanGaps,false);assert.equal(chart.data.datasets[0].tension,0);
  f.renderer.destroy();assert.equal(f.registry.size,0);assert.equal(chart.destroys,1);assert.equal(f.observers[0].disconnected,true);assert.equal(f.container.children.length,0);
});

test('windows are read-only derived views, endpoint controls skip gaps and measurement summaries use all samples',()=>{
  const f=fixture(),chart=f.instances[0],first=f.samples[0];
  chart.options.onClick({x:first.time});f.click(f.elements('button').find(button=>button.textContent==='1h'));
  assert.equal(f.findClass('history-reading').children[0].textContent,'20.123456','Selection outside the new window reconciles to a valid reading');
  assert.equal(chart.data.datasets[0].data.length,3);assert.equal(f.samples.length,4);
  const summaries=f.elements('dd').map(element=>element.textContent);
  assert.deepEqual(summaries,['20.123456','40.123456','30.123456']);
  f.renderer.update({stateClass:'total_increasing'});assert.equal(f.elements('dl')[0].children[2].hidden,true);
  assert.equal(f.elements('button').find(button=>button.textContent==='Next reading').disabled,true);f.renderer.destroy();
});

test('unmeasurable mount waits for ResizeObserver; resize reuses one instance and destroy blocks later callbacks',()=>{
  const f=fixture();f.renderer.destroy();
  const g=fixture({loading:true});g.setWidth(0);g.renderer.update({loading:false});assert.equal(g.instances.length,0);
  g.setWidth(320);g.observers[0].callback();assert.equal(g.instances.length,1);
  g.observers[0].callback();assert.equal(g.instances.length,1);g.renderer.destroy();g.observers[0].callback();assert.equal(g.instances.length,1);
});

test('drawing errors retain readable values and require explicit retry instead of observer/update request loops',()=>{
  let requests=0;const f=fixture({loading:true,onRetry:()=>requests++});f.setFail(true);f.renderer.update({loading:false});
  assert.equal(f.attempts,1);assert.equal(f.registry.size,0);assert.equal(f.findClass('history-reading').children[0].textContent,'20.123456');
  assert.ok(f.elements('p').some(element=>/Could not draw history/.test(element.textContent)));
  f.observers[0].callback();f.renderer.update({stateClass:'measurement'});assert.equal(f.attempts,1);
  f.setFail(false);f.click(f.elements('button').find(button=>button.textContent==='Retry'));assert.equal(f.attempts,2);assert.equal(f.registry.size,1);assert.equal(requests,0,'Drawing retry must reuse raw history');f.renderer.destroy();
});

test('unavailable sources clear stale readouts and plots, hide summaries and disable controls without an error or retry',()=>{
  const f=fixture();f.renderer.update({unavailable:'Safe source unavailable',error:'Old recorder error'});
  assert.equal(f.findClass('history-reading').children[0].textContent,'—');assert.equal(f.findClass('history-reading').children[1].textContent,'');
  assert.equal(f.findClass('history-plot').hidden,true);assert.equal(f.registry.size,0);
  assert.equal(f.elements('dl')[0].children.every(element=>element.hidden),true);
  assert.equal(f.elements('button').filter(button=>button.textContent!=='Retry').every(button=>button.disabled),true);
  assert.equal(f.elements('button').find(button=>button.textContent==='Retry').hidden,true);
  assert.ok(f.elements('p').some(element=>element.textContent==='Safe source unavailable'&&element.attributes.role==='status'));
  f.renderer.update({unavailable:false,error:''});assert.equal(f.registry.size,1);f.renderer.destroy();
});

test('Portuguese controls and HA timestamps remain DOM text; energy range hides independent windows and never adds climate units',()=>{
  const end=Date.parse('2026-10-18T12:00:00Z');const f=fixture({hass:{locale:{language:'pt'},config:{time_zone:'Asia/Kolkata'}},localize:key=>key,windows:false,range:{start:end-86400000,end},stateClass:'total',format:value=>value.toFixed(1)});
  assert.equal(f.elements('button').some(button=>button.textContent==='Leitura anterior'),true);assert.equal(f.findClass('history-actions').hidden,true);
  assert.equal(f.findClass('history-reading').children[0].textContent,'20.1');assert.match(f.findClass('history-reading').children[1].textContent,/17:30:00/);
  assert.equal(f.elements('dl')[0].children[2].hidden,true);f.renderer.destroy();
});

test('energy bars preserve interval gaps and zero, start at zero and expose exact day selection without sample summaries',()=>{
  const start=Date.parse('2026-10-01T00:00:00Z'),day=86400000;
  const samples=[2.125,0,null,3.75].map((value,index)=>({time:start+index*day,end:start+(index+1)*day,value}));
  const f=fixture({bars:true,interval:'day',windows:false,range:{start,end:start+4*day},samples,unit:'kWh',format:value=>`${value.toFixed(3)} kWh`,summaryLabel:'5.875 kWh · ≈ 1.47 EUR',coverageLimited:true});
  const chart=f.instances[0],readout=f.findClass('history-total');
  const visibleSections=()=>f.findClass('marao-history-chart').children.filter(element=>!element.hidden);
  const overviewSections=visibleSections();
  assert.equal(readout.children[0].textContent,'Total');
  assert.equal(readout.children[1].textContent,'5.875 kWh · ≈ 1.47 EUR');
  assert.equal(chart.data.datasets.length,1);assert.equal(chart.data.datasets[0].type,'bar');
  assert.deepEqual([...chart.data.datasets[0].data].map(point=>point.y),[2.125,0,null,3.75]);
  assert.equal(chart.data.datasets[0].data[0].x,start+day/2);assert.equal(chart.options.scales.y.beginAtZero,true);
  assert.equal(chart.options.scales.y.ticks.callback(30),'30');assert.equal(chart.options.scales.y.ticks.precision,0);
  assert.equal(f.elements('p').some(element=>!element.hidden&&/Incomplete history|Recorded coverage may be limited/.test(element.textContent)),false);
  assert.equal(f.findClass('history-unit').textContent,'kWh');assert.equal(f.findClass('history-unit').hidden,false);
  assert.deepEqual(f.findClass('history-actions history-selection').children.map(element=>element.attributes['aria-label']||element.textContent),['Full month','Previous day','Day','Next day']);
  assert.equal(readout.hidden,false);assert.equal(f.findClass('history-reset').disabled,true);
  assert.ok(chart.data.datasets[0].borderWidth.every(width=>width===0));
  f.click(f.elements('button').find(button=>button.attributes['aria-label']==='Previous day'));
  assert.equal(readout.hidden,false);
  assert.equal(f.elements('dl')[0].hidden,true);assert.equal(f.findClass('history-actions').hidden,true);
  assert.equal(f.findClass('history-reading').hidden,true,'Selection must not add a separate reading row');
  assert.deepEqual(visibleSections(),overviewSections,'Selection retains the same visible sections above the chart');
  assert.equal(readout.children[1].textContent,'3.750 kWh');assert.match(readout.children[0].textContent,/Oct 4/);assert.doesNotMatch(readout.children[0].textContent,/:/);
  f.click(f.elements('button').find(button=>button.attributes['aria-label']==='Previous day'));
  assert.equal(readout.children[1].textContent,'—');assert.match(readout.children[1].attributes['aria-label'],/No readings for this interval/);
  f.click(f.elements('button').find(button=>button.attributes['aria-label']==='Previous day'));
  assert.equal(readout.children[1].textContent,'0.000 kWh','A recorded zero must remain selectable');
  chart.options.onClick({x:start+day/2});assert.equal(readout.children[1].textContent,'2.125 kWh');
  assert.equal(f.elements('button').find(button=>button.attributes['aria-label']==='Previous day').disabled,true);
  chart.options.onClick({x:start+2.5*day});assert.equal(readout.children[1].textContent,'—','Click selection retains a missing interval rather than snapping to a different day');
  f.click(f.findClass('history-reset'));
  assert.equal(readout.children[0].textContent,'Total');
  assert.equal(readout.children[1].textContent,'5.875 kWh · ≈ 1.47 EUR');
  assert.deepEqual(visibleSections(),overviewSections,'Reset does not add or remove a readout row');
  assert.equal(readout.hidden,false);assert.ok(chart.data.datasets[0].borderWidth.every(width=>width===0));
  f.click(f.elements('button').find(button=>button.attributes['aria-label']==='Next day'));
  assert.equal(readout.children[1].textContent,'2.125 kWh');
  f.renderer.destroy();assert.equal(f.registry.size,0);
});

test('monthly selection and reset keep the bar focus and contributor breakdown in the same period',()=>{
  const start=Date.parse('2026-10-01T00:00:00Z'),day=86400000;
  const samples=[2,5,null].map((value,index)=>({time:start+index*day,end:start+(index+1)*day,value}));
  const selected=[];
  const f=fixture({bars:true,interval:'day',windows:false,range:{start,end:start+3*day},samples,
    breakdownForSample:sample=>{selected.push(sample?.time);return {items:[{name:'Kitchen',energyLabel:sample?`${sample.value??'—'} kWh`:'7 kWh',value:sample?sample.value:7}]};}});
  const chart=f.instances[0],reset=f.findClass('history-reset');
  const panel=f.findClass('history-breakdown'),replace=panel.replaceChildren.bind(panel);
  panel.replaceChildren=(...children)=>{
    assert.ok(children.length,'Selection and HA refreshes must not temporarily empty the live breakdown');
    replace(...children);
  };
  for(const button of f.elements('button').filter(button=>/^(Previous|Next) day$/.test(button.attributes['aria-label']))){
    const icon=button.innerHTML;
    Object.defineProperty(button,'innerHTML',{get:()=>icon,set:()=>assert.fail('Navigation must retain focused arrow contents to preserve Safari popup scroll')});
  }
  assert.equal(selected.at(-1),undefined);assert.ok(f.elements('span').some(element=>element.textContent==='7 kWh'));
  chart.options.onClick({x:start+day/2});assert.equal(selected.at(-1),start);
  assert.ok(f.elements('span').some(element=>element.textContent==='2 kWh'));assert.ok(f.findClass('history-donut'));
  f.click(f.elements('button').find(button=>button.attributes['aria-label']==='Next day'));
  assert.equal(selected.at(-1),start+day);assert.ok(f.elements('span').some(element=>element.textContent==='5 kWh'));
  f.renderer.update({samples:[...samples]});assert.equal(selected.at(-1),start+day,'Normal HA updates retain selected day');
  f.click(f.elements('button').find(button=>button.attributes['aria-label']==='Next day'));
  assert.equal(selected.at(-1),start+2*day);assert.equal(f.findClass('history-donut'),undefined,'Missing day cannot use monthly totals');
  f.click(reset);assert.equal(selected.at(-1),undefined);assert.ok(f.elements('span').some(element=>element.textContent==='7 kWh'));
  assert.equal(f.findClass('history-reading').hidden,true);assert.ok(chart.data.datasets[0].borderWidth.every(width=>width===0));
  chart.options.onClick({x:start+day/2});
  f.renderer.update({range:{start:start+3*day,end:start+6*day},samples:samples.map(sample=>({...sample,time:sample.time+3*day,end:sample.end+3*day}))});
  assert.equal(selected.at(-1),undefined,'Changing months returns to monthly overview');
  f.renderer.destroy();
});

test('hourly bar selection identifies repeated local hours with their UTC offsets and localizes controls',()=>{
  const start=Date.parse('2026-10-25T00:00:00Z'),hour=3600000;
  const f=fixture({bars:true,interval:'hour',windows:false,range:{start,end:start+2*hour},samples:[{time:start,end:start+hour,value:1},{time:start+hour,end:start+2*hour,value:2}],
    hass:{locale:{language:'pt'},config:{time_zone:'Europe/Lisbon'}}});
  const readout=f.findClass('history-reading');
  assert.match(readout.children[1].textContent,/01:00.*GMT/);
  assert.equal(f.findClass('history-selection-label').textContent,'Hora');assert.equal(f.findClass('history-selection-label').hidden,false);
  const lastTimestamp=readout.children[1].textContent;
  f.click(f.elements('button').find(button=>button.attributes['aria-label']==='Hora anterior'));
  assert.match(readout.children[1].textContent,/01:00.*GMT\+1/);assert.notEqual(readout.children[1].textContent,lastTimestamp);
  assert.match(readout.children[0].attributes['aria-label'],/^Hora selecionada/);
  assert.equal(f.elements('button').some(button=>button.attributes['aria-label']==='Hora seguinte'),true);f.renderer.destroy();
});

test('day navigation preserves scrolling across shadow roots, haptics and deferred WebView focus movement',()=>{
  const start=Date.parse('2026-10-01T00:00:00Z'),day=86400000;
  const f=fixture({bars:true,interval:'day',windows:false,range:{start,end:start+3*day},samples:[1,2,3].map((value,index)=>({time:start+index*day,end:start+(index+1)*day,value}))});
  const page={scrollHeight:1500,clientHeight:800,scrollTop:0};
  const sheet={scrollHeight:1100,clientHeight:675,scrollTop:180,parentElement:page};
  f.container.getRootNode=()=>({host:{parentElement:sheet}});
  let haptics=0;
  f.container.addEventListener('haptic',()=>{haptics++;sheet.scrollTop=0;page.scrollTop=20;});
  const previous=f.elements('button').find(button=>button.attributes['aria-label']==='Previous day');
  f.click(previous);assert.equal(sheet.scrollTop,180);assert.equal(page.scrollTop,0);
  sheet.scrollTop=53;f.flushFrames();assert.equal(sheet.scrollTop,180,'Post-click focus movement must not reset the popup');
  sheet.scrollTop=220;f.click(previous);f.flushFrames();assert.equal(sheet.scrollTop,220,'A later action uses the user’s new scroll position');
  f.renderer.update({breakdownForSample:()=>{sheet.scrollTop=0;return {items:[{name:'Kitchen',value:1}]};}});
  assert.equal(sheet.scrollTop,220,'A HA refresh preserves scrolling even if rebuilding its content clamps the scroller');
  f.click(f.findClass('history-reset'));assert.equal(sheet.scrollTop,220);f.flushFrames();assert.equal(sheet.scrollTop,220);
  assert.equal(haptics,3,'Each interaction dispatches one haptic');
  f.click(previous);f.renderer.destroy();sheet.scrollTop=75;f.flushFrames();assert.equal(sheet.scrollTop,75,'Closing the chart cancels deferred scroll restoration');
});

test('breakdown shares compare configured values, preserve missing rows and show estimate notes as text',()=>{
  const breakdown={metric:'energy',unit:'kWh',total:100,format:value=>`${value} kWh`,note:'≈ Cost uses the current rate.',items:[
    {name:'Kitchen <meter>',energyLabel:'1 kWh',costLabel:'≈ 0.25 EUR',value:1},
    {name:'Heat pump',energyLabel:'3 kWh',costLabel:'0.90 EUR',value:3},
    {name:'Garage',energyLabel:'—',costLabel:'—',value:null,problem:'History unavailable'},
  ]};
  const f=fixture({breakdown});
  assert.equal(f.findClass('history-breakdown').hidden,false);
  assert.equal(f.elements('li').length,3);assert.equal(f.elements('strong').some(element=>element.textContent==='Kitchen <meter>'),true);
  assert.deepEqual(f.elements('span').map(element=>element.textContent).filter(value=>/^[\d.]+%$/.test(value)),['25%','75%']);
  assert.match(f.findClass('history-donut').style.background,/0% 25%.*25% 100%/);
  assert.equal(f.elements('ul')[0].attributes['aria-label'],'Share of configured items');
  assert.ok(f.elements('p').some(element=>element.textContent===breakdown.note));
  assert.ok(f.elements('p').some(element=>element.textContent==='History unavailable'));
  assert.ok(f.elements('span').some(element=>element.textContent==='≈ 0.25 EUR'&&element.attributes['aria-label']==='Cost: ≈ 0.25 EUR'));
  f.renderer.update({breakdown:{...breakdown,items:[...breakdown.items,{name:'Export',energyLabel:'−2 kWh',costLabel:'—',value:-2}]}});
  assert.equal(f.findClass('history-donut'),undefined);assert.equal(f.elements('li').length,4);
  f.renderer.update({breakdown:{...breakdown,items:[{name:'Kitchen',energyLabel:'0 kWh',costLabel:'0 EUR',value:0}]}});
  assert.equal(f.findClass('history-donut'),undefined);assert.equal(f.elements('li').length,1);
  f.renderer.update({breakdown:{items:[],note:'No configured energy price.'}});
  assert.equal(f.findClass('history-breakdown').hidden,false);assert.ok(f.elements('p').some(element=>element.textContent==='No configured energy price.'));
  f.renderer.update({unavailable:true});assert.equal(f.findClass('history-breakdown').hidden,true);f.renderer.destroy();
});

test('local chart assets use selective registration and ship both exact dependency notices',()=>{
  const build=fs.readFileSync(new URL('../../frontend_src/build-editor.cjs',import.meta.url),'utf8');
  assert.match(build,/MaraoHistoryChart/);assert.match(build,/MaraoHistoryData/);assert.match(build,/Chart\.js must remain in the on-demand/);
  assert.doesNotMatch(source,/chart\.js\/auto|https?:\/\/|globalThis\.Chart/);
  const pkg=JSON.parse(fs.readFileSync(new URL('../../package.json',import.meta.url),'utf8'));assert.equal(pkg.devDependencies['chart.js'],'4.5.1');
  for(const [dependency,notice] of [['chart.js','ChartJS.LICENSE.txt'],['@kurkle/color','KurkleColor.LICENSE.txt']]){
    assert.equal(fs.readFileSync(new URL(`../../custom_components/marao_dashboard/frontend/${notice}`,import.meta.url),'utf8'),fs.readFileSync(new URL(`../../node_modules/${dependency}/LICENSE.md`,import.meta.url),'utf8'));
  }
});

test('power comparisons share the plot without smoothing peaks and report selected device readings',()=>{
  const end=Date.parse('2026-10-18T12:00:00Z');
  const samples=[{time:end-3600000,value:100},{time:end-1800000,value:9000},{time:end,value:200}];
  const f=fixture({samples,range:{start:end-3600000,end},windows:false,power:true,unit:'W',stepped:true,
    axisFormat:value=>String(value),format:value=>`${value} W`,stateClass:undefined,
    series:[{id:'house',name:'House',samples},{id:'fridge',name:'Fridge',color:'#f00',samples:[{time:end-3600000,value:40},{time:end,value:80}]}]});
  try{
    const chart=f.instances[0];assert.equal(chart.data.datasets.length,3);assert.equal(chart.data.datasets[0].stepped,true);
    assert.equal(chart.data.datasets[0].data[1].y,9000);assert.equal(chart.data.datasets[2].borderColor,'#f00');
    assert.equal(chart.options.scales.y.ticks.callback(500),'500');assert.equal(f.findClass('history-unit').hidden,false);
    chart.options.onClick({x:end-1800000});
    const rows=f.findClass('history-comparison').children;assert.equal(rows[1].children.at(-1).textContent,'40 W');
    f.renderer.update({selection:{time:end-1800000,values:{fridge:{value:65}}}});
    assert.equal(f.findClass('history-comparison').children[1].children.at(-1).textContent,'65 W');
    f.renderer.update({loading:true});assert.equal(f.findClass('history-plot').hidden,false,'Loading retains plot space');
    assert.equal(f.findClass('history-comparison').hidden,false,'Loading retains device rows');
  }finally{f.renderer.destroy();}
});
