import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readDashboardSettings} from '../../frontend_src/dashboard-settings.js';
import {registerCardMetadata} from '../../frontend_src/native-card-metadata.js';
import {refreshCardMetadata} from '../../frontend_src/native-card-language.js';
import {languageCode} from '../../custom_components/marao_dashboard/frontend/MaraoLocale.js';

function harness(window, environment = {}) {
  const calls=[],picker=[];
  registerCardMetadata(picker, {type:'marao-light-card'}, 'Light');
  const source=fs.readFileSync(new URL('../../frontend_src/native-bootstrap.js',import.meta.url),'utf8')
    .replace(/^import .*;\n/gm,'')
    .replace(/const query = .*?;\nconst navigation = .*?;\n/,'')
    .replaceAll('export function ','function ');
  const context={window,readDashboardSettings,languageCode,refreshCardMetadata:hass=>refreshCardMetadata(hass,picker),createPopupCoordinator:()=>({sync(){},dispose(){}}),navigation:{setDashboardNavigation:(root,config)=>calls.push({root,config})},location:{pathname:'/marao-dashboard/empty'},queueMicrotask(){}};
  Object.assign(context,environment);
  context.globalThis=context;
  vm.runInNewContext(source+';globalThis.attach=attachDashboardHost;globalThis.compatible=nativeHostCompatible;globalThis.findHost=findDashboardHost;globalThis.waitForPaint=waitForInitialViewPaint;',context);
  return {...context,calls,picker};
}

test('cached native loaders establish package context before navigation without replacing a running graph',()=>{
  const installed={identity:'new',manifestURL:'/hacsfiles/example/MaraoFrontend.release.json'};
  const window={MaraoInstalledFrontendPackage:installed,MaraoNativeBootstrap:{}};
  harness(window);assert.equal(window.MaraoFrontendPackage,installed);
  const active={identity:'running'};window.MaraoFrontendPackage=active;
  harness(window);assert.equal(window.MaraoFrontendPackage,active);
});

test('one native host adapter follows root settings across direct empty/panel/new views and opt-out',()=>{
  const h=harness(),controllers=new Set(),root={isConnected:true,panel:{url_path:'marao-dashboard'},hass:{user:{is_admin:true}},lovelace:{setEditMode(){},rawConfig:{views:[{path:'empty',sections:[]},{path:'panel',type:'panel',cards:[]}],marao:{version:1,navbar:{routes:[]}}}},addController(c){controllers.add(c);},removeController(c){controllers.delete(c);}};
  assert.equal(h.compatible(root),true);
  const controller=h.attach(root);assert.equal(h.attach(root),controller);assert.equal(controllers.size,1);
  assert.equal(h.findHost('marao-dashboard'),root);assert.equal(h.findHost('another-dashboard'),null);
  assert.equal(h.calls.at(-1).config.routes.length,0);assert.equal(h.calls.at(-1).config.native_editor,true);
  for(const path of ['panel','new']){h.location.pathname='/marao-dashboard/'+path;root.lovelace.rawConfig.views.push({path,sections:[]});controller.hostUpdated();assert.equal(h.calls.at(-1).config.dashboard_root,'marao-dashboard');}
  root.lovelace.rawConfig.marao.navbar.routes=[{path:'/marao-dashboard/panel',label:'Panel'}];controller.hostUpdated();assert.equal(h.calls.at(-1).config.routes[0].label,'Panel');
  delete root.lovelace.rawConfig.marao;root.hass.language='pt';controller.hostUpdated();assert.equal(h.calls.at(-1).config,null);assert.equal(h.picker[0].name,'Marao Luz');
  root.hass.language='en';controller.hostUpdated();assert.equal(h.picker[0].name,'Marao Light');
  root.isConnected=false;controller.hostDisconnected();assert.equal(controllers.size,0);assert.equal(h.calls.at(-1).config,null);assert.equal(h.findHost('marao-dashboard'),null);
});

test('native host refuses incomplete host APIs and releases its navbar after leaving the dashboard',()=>{
  const h=harness();assert.equal(h.compatible({addController:true,removeController:true,lovelace:{setEditMode:true}}),false);
  const root={isConnected:true,panel:{url_path:'marao-dashboard'},lovelace:{setEditMode(){},config:{views:[],marao:{version:1,navbar:{routes:[]}}}},addController(){},removeController(){}};
  const controller=h.attach(root);h.location.pathname='/other-dashboard/0';controller.hostUpdated();assert.equal(h.calls.at(-1).config,null);
});

test('new ordinary views paint before background content and mounted views or specialty demand release it',async()=>{
  const window=new EventTarget(), document=new EventTarget();
  window.MaraoNativeBootstrap={};
  document.querySelector=()=>({hass:{panels:{'marao-dashboard':{component_name:'lovelace'}}}});
  const frames=[],views=[];let mutated;
  const h=harness(window,{document,setTimeout,clearTimeout,requestAnimationFrame:callback=>frames.push(callback),
    MutationObserver:class {constructor(callback){mutated=callback;} observe(){} disconnect(){}}
  });
  const demand=new AbortController();
  const first=h.waitForPaint(demand.signal);
  const viewRoot={querySelectorAll:()=>views};
  const root={isConnected:true,panel:{url_path:'marao-dashboard'},shadowRoot:viewRoot,lovelace:{current_view:1,config:{views:[]},setEditMode(){}},addController(){},removeController(){}};
  h.attach(root);views.push({index:0},{index:1,hidden:true});mutated();assert.equal(frames.length,0);
  views.push({});mutated();
  assert.equal(frames.length,1);frames.shift()();assert.equal(frames.length,1);frames.shift()();await first;
  await h.waitForPaint(demand.signal);assert.equal(frames.length,0);
  views.length=0;
  const requested=h.waitForPaint(demand.signal);demand.abort();await requested;assert.equal(frames.length,0);
});
