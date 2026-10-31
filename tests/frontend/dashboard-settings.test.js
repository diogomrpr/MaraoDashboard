import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {readDashboardSettings,patchDashboardSettings,saveDashboardSettings,dashboardViewForAddress,patchNavbarRoute,moveNavbarRoute} from '../../frontend_src/dashboard-settings.js';

function loadingDialogFixture() {
  class Node {
    constructor(){this.nodes=new Map();this.handlers=new Map();this.hidden=true;this.disabled=true;}
    querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Node());return this.nodes.get(selector);}
    addEventListener(type,handler){this.handlers.set(type,handler);}
    append(){} replaceChildren(){} setAttribute(){}
    showModal(){this.open=true;} close(){this.open=false;} remove(){this.removed=true;}
  }
  let resolveSettings,rejectSettings,resolveControls,settingsStarted=false,controlsStarted=false;
  const settings=new Promise((resolve,reject)=>{resolveSettings=resolve;rejectSettings=reject;});
  const controls=new Promise(resolve=>{resolveControls=resolve;});
  const root={isConnected:true,hass:{language:'en',user:{id:'admin',is_admin:true},callWS(){settingsStarted=true;return settings;}},shadowRoot:new Node()};
  const source=readFileSync(new URL('../../frontend_src/dashboard-settings-dialog.js',import.meta.url),'utf8')
    .replace(/^import .*\n/,'').replace(/^const navigation=await import.*\n/m,'const navigation=globalThis.navigation;\n').replace('export async function','async function');
  const context={document:{createElement:()=>new Node()},location:{pathname:'/house/home'},window:{addEventListener(){}},customElements:{get:()=>false},
    loadCardHelpers(){controlsStarted=true;return controls;},navigation:{focusRestorer:()=>()=>{},haptic(){}},AbortController,structuredClone,readDashboardSettings,moveNavbarRoute,queueMicrotask};
  vm.runInNewContext(source+';globalThis.openSettings=openDashboardSettings;',context);
  return {root,open:()=>context.openSettings(root,{}),started:()=>settingsStarted&&controlsStarted,resolveSettings,rejectSettings,
    resolveControls:()=>resolveControls({createCardElement:()=>({constructor:{getConfigElement:async()=>{}}})})};
}

test('settings sheet opens immediately while data and native controls load together; closing ignores late results',async()=>{
  const fixture=loadingDialogFixture(),pending=fixture.open(),dialog=fixture.root._maraoSettingsDialog;
  assert.equal(dialog.open,true);assert.equal(fixture.started(),true);
  assert.equal(dialog.querySelector('[data-loading]').textContent,'Loading settings…');
  assert.equal(dialog.querySelector('[data-save]').disabled,true);
  dialog.querySelector('[data-close]').onclick();
  fixture.resolveSettings({views:[],marao:{version:1,navbar:{routes:[]}}});fixture.resolveControls();await pending;
  assert.equal(dialog.removed,true);assert.equal(fixture.root._maraoSettingsDialog,undefined);
  assert.equal(dialog.querySelector('[data-save]').disabled,true);
});

test('loading settings enables editing only after readiness and offers retry on a failed read',async()=>{
  for(const failed of [false,true]){
    const fixture=loadingDialogFixture(),pending=fixture.open(),dialog=fixture.root._maraoSettingsDialog;
    fixture.resolveControls();
    if(failed)fixture.rejectSettings(new Error('Offline'));
    else fixture.resolveSettings({views:[],marao:{version:1,navbar:{routes:[]}}});
    await pending;
    assert.equal(dialog.open,true);assert.equal(dialog.querySelector('[data-save]').disabled,failed);
    if(failed){assert.match(dialog.querySelector('[data-loading]').textContent,/Could not load settings/);assert.equal(dialog.querySelector('[data-retry]').hidden,false);}
    else{assert.equal(dialog.querySelector('[data-settings]').hidden,false);assert.equal(dialog.querySelector('[data-loading]').hidden,true);}
  }
});

test('native destinations resolve actual views including root, indexed views and subviews',()=>{
  const first={path:'home',title:'Home'},indexed={title:'No path'},subview={path:'room plan',subview:true};
  const document={views:[first,indexed,subview]},resolve=address=>dashboardViewForAddress(document,'house','https://example.test'+address,'https://example.test');
  assert.equal(resolve('/house'),first);assert.equal(resolve('/house/'),first);
  assert.equal(resolve('/house/home?x=1#light'),first);assert.equal(resolve('/house/1'),indexed);
  assert.equal(resolve('/house/room%20plan'),subview);
  for(const address of ['/house/deleted','/other/home','/house/home/extra','/house/%zz'])assert.equal(resolve(address),undefined);
  assert.equal(dashboardViewForAddress(document,'house','https://other.test/house/home','https://example.test'),undefined);
});

test('native selector edits retain custom URLs, names, icons and unknown route fields',()=>{
  const route={url:'https://example.test/custom',path:'/legacy',label:'My label',icon:'mdi:star',opaque:{nested:[1,2]}};
  const previous={destination:route.url,label:route.label,icon:route.icon};
  assert.deepEqual(patchNavbarRoute(route,previous,{...previous}),route);
  assert.deepEqual(patchNavbarRoute(route,previous,{...previous,destination:'/house/new'}),{...route,url:'/house/new'});
  assert.deepEqual(patchNavbarRoute(route,previous,{...previous,label:'Custom',icon:''}),{...route,label:'Custom',icon:''});
  const pathRoute={path:'/house/home',label:'Home',extra:true},data={destination:pathRoute.path,label:'Home',icon:''};
  assert.deepEqual(patchNavbarRoute(pathRoute,data,{...data,destination:'/house/1'}),{...pathRoute,path:'/house/1'});
  assert.equal(route.url,'https://example.test/custom');
});

test('drag and menu reordering move complete routes without changing the saved source or other settings',()=>{
  const first={path:'/house/home',label:'Home',icon:'mdi:home',opaque:{keep:true}},second={url:'https://example.test',label:'External'},third={path:'/house/room',label:'Room'};
  const source={views:[{path:'home',cards:[{type:'markdown',content:'Keep'}]}],marao:{version:1,navbar:{routes:[first,second,third],opaque:'keep'},show_editor_button:false}};
  const routes=source.marao.navbar.routes;
  assert.deepEqual(moveNavbarRoute(routes,0,2),[second,third,first]);
  assert.deepEqual(moveNavbarRoute(routes,2,0),[third,first,second]);
  assert.deepEqual(moveNavbarRoute(routes,0,1),[second,first,third]);
  for(const [oldIndex,newIndex]of [[-1,0],[0,3],[0,1.5],[undefined,1],[1,1]])assert.equal(moveNavbarRoute(routes,oldIndex,newIndex),routes);
  const draft=structuredClone(source.marao);draft.navbar.routes=moveNavbarRoute(draft.navbar.routes,2,0);
  const result=patchDashboardSettings(source,draft);
  assert.deepEqual(source.marao.navbar.routes,[first,second,third]);
  assert.deepEqual(result.marao,{...source.marao,navbar:{routes:[third,first,second],opaque:'keep'}});
  assert.deepEqual(result.views,source.views);
});
test('native shared settings preserve explicit emptiness and opaque native fields',()=>{
  const source={title:'House',opaque:{x:1},views:[{path:'home',sections:[]}],marao:{version:1,navbar:{routes:[],unknown:'kept'},extra:true}};
  assert.deepEqual(readDashboardSettings(source).navbar.routes,[]);
  const next=patchDashboardSettings(source,{...source.marao,show_editor_button:false});
  assert.deepEqual(next.views,source.views);assert.deepEqual(next.opaque,source.opaque);assert.equal(next.marao.extra,true);assert.equal(next.marao.navbar.unknown,'kept');assert.equal(source.marao.show_editor_button,undefined);
  assert.equal(readDashboardSettings({views:[]}),undefined);
});
test('shared native settings save preserves all views and refuses stale or non-admin writes',async()=>{
  const baseline={views:[{path:'home',sections:[]}],opaque:42,marao:{version:1,navbar:{routes:[]}}};
  const calls=[],hass={user:{is_admin:true},async callWS(request){calls.push(request);return structuredClone(baseline);}};
  const updated=await saveDashboardSettings(hass,'house-dashboard',baseline,{...baseline.marao,show_editor_button:false},()=>true);
  assert.equal(updated.opaque,42);assert.deepEqual(updated.views,baseline.views);assert.equal(calls.filter(c=>c.type.endsWith('/save')).length,1);
  for(const scenario of ['not-admin','role-lost','stale','left-dashboard']){
    const writes=[];let active=true;
    const h={user:{is_admin:scenario!=='not-admin'},async callWS(request){if(request.type.endsWith('/save'))writes.push(request);if(scenario==='role-lost')h.user.is_admin=false;if(scenario==='left-dashboard')active=false;return scenario==='stale'?{...baseline,title:'Concurrent edit'}:structuredClone(baseline);}};
    await assert.rejects(saveDashboardSettings(h,'house-dashboard',baseline,baseline.marao,()=>active),/settings_stale/);assert.equal(writes.length,0,scenario);
  }
});
test('native settings refuse unsupported metadata and unsafe route destinations',()=>{
  for(const value of [{version:2,navbar:{routes:[]}},{version:true,navbar:{routes:[]}},{version:1,navbar:{routes:[{path:'javascript:bad',label:'Unsafe'}]}},{version:1,navbar:{routes:[]},show_cache_reset:'yes'}])assert.throws(()=>readDashboardSettings({marao:value}));
  assert.throws(()=>patchDashboardSettings({views:[],marao:{foreign:true}},{version:1,navbar:{routes:[]}}));
});

test('documented native opt-in uses supported settings and a real initial destination',async()=>{
  const {readFileSync}=await import('node:fs');const {parse}=await import('yaml');
  const guide=readFileSync(new URL('../../docs/docs/installation/configuration.md',import.meta.url),'utf8');
  const example=parse(guide.match(/```yaml\n([\s\S]*?)\n```/)[1]);
  const settings=readDashboardSettings(example);assert.equal(settings.version,1);
  assert.equal(settings.navbar.routes[0].path,'/marao-dashboard/'+example.views[0].path);
  assert.deepEqual(patchDashboardSettings(example,settings),example);
});
