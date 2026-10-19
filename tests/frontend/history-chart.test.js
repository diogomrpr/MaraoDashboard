import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as data from '../../frontend_src/history-data.js';
const source=fs.readFileSync(new URL('../../frontend_src/history-chart.js',import.meta.url),'utf8');
function fixture(options={}){
  const registry=new Map(),instances=[],observers=[];
  let width=320,fail=false,attempts=0;
  class Element extends EventTarget{
    constructor(tag){super();this.tagName=tag;this.children=[];this.attributes={};this.style={};this.dataset={};this.ownerDocument=doc;this.hidden=false;}
    append(...elements){for(const element of elements){this.children.push(element);element.parent=this;}}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(element=>element!==this);}
    setAttribute(name,value){this.attributes[name]=value;}
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
  const context=vm.createContext({...data,Chart:FakeChart,LineController:'line',LineElement:'lineElement',PointElement:'point',LinearScale:'linear',Filler:'fill',
    chartColor:value=>({alpha:()=>({rgbString:()=>value})}),document:doc,ResizeObserver:Observer,AbortController,CustomEvent,
    getComputedStyle:element=>({color:element.style.color||'#233044',fontSize:'16px',getPropertyValue:()=>''})});
  vm.runInContext(source.replace(/^import .*;\n/gm,'').replace('export function createHistoryChart','function createHistoryChart')+'\nglobalThis.create=createHistoryChart;',context);
  const container=new Element('div'),end=Date.parse('2026-10-18T12:00:00Z');
  const samples=[{time:end-5*3600000,value:12.123456},{time:end-3600000,value:40.123456},{time:end-600000,value:null},{time:end,value:20.123456}];
  const renderer=context.create(container,{samples,end,hass:{locale:{language:'en'},config:{time_zone:'Europe/Lisbon'}},format:value=>value.toFixed(6),stateClass:'measurement',...options});
  const elements=(tag,root=container)=>root.children.flatMap(element=>[...(element.tagName===tag?[element]:[]),...elements(tag,element)]);
  const findClass=name=>{const walk=root=>root.className===name?root:root.children.map(walk).find(Boolean);return walk(container);};
  const click=element=>element.dispatchEvent(new Event('click'));
  return{renderer,container,instances,observers,registry,elements,findClass,click,samples,end,Chart:FakeChart,get attempts(){return attempts;},setWidth(value){width=value;},setFail(value){fail=value;}};
}

test('detail registers only required modules, uses click-only numeric axes, retains canvas and selects full precision original readings',()=>{
  const f=fixture(),chart=f.instances[0],canvas=f.elements('canvas')[0],readout=f.findClass('history-reading');
  assert.deepEqual(f.Chart.modules,['line','lineElement','point','linear','fill']);
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

test('local chart assets use selective registration and ship both exact dependency notices',()=>{
  const build=fs.readFileSync(new URL('../../frontend_src/build-editor.cjs',import.meta.url),'utf8');
  assert.match(build,/MaraoHistoryChart/);assert.match(build,/MaraoHistoryData/);assert.match(build,/Chart\.js must remain in the on-demand/);
  assert.doesNotMatch(source,/chart\.js\/auto|https?:\/\/|globalThis\.Chart/);
  const pkg=JSON.parse(fs.readFileSync(new URL('../../package.json',import.meta.url),'utf8'));assert.equal(pkg.devDependencies['chart.js'],'4.5.1');
  for(const [dependency,notice] of [['chart.js','ChartJS.LICENSE.txt'],['@kurkle/color','KurkleColor.LICENSE.txt']]){
    assert.equal(fs.readFileSync(new URL(`../../custom_components/marao_dashboard/frontend/${notice}`,import.meta.url),'utf8'),fs.readFileSync(new URL(`../../node_modules/${dependency}/LICENSE.md`,import.meta.url),'utf8'));
  }
});
