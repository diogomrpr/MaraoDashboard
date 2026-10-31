import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readDashboardSettings} from '../../frontend_src/dashboard-settings.js';

function harness(window) {
  const calls=[];
  const source=fs.readFileSync(new URL('../../frontend_src/native-bootstrap.js',import.meta.url),'utf8')
    .replace("import {readDashboardSettings} from './dashboard-settings.js';",'')
    .replace(/const query = .*?;\nconst navigation = .*?;\n/,'')
    .replaceAll('export function ','function ');
  const context={window,readDashboardSettings,navigation:{setDashboardNavigation:(root,config)=>calls.push({root,config})},location:{pathname:'/marao-dashboard/empty'},queueMicrotask(){}};
  context.globalThis=context;
  vm.runInNewContext(source+';globalThis.attach=attachDashboardHost;globalThis.compatible=nativeHostCompatible;',context);
  return {...context,calls};
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
  assert.equal(h.calls.at(-1).config.routes.length,0);assert.equal(h.calls.at(-1).config.native_editor,true);
  for(const path of ['panel','new']){h.location.pathname='/marao-dashboard/'+path;root.lovelace.rawConfig.views.push({path,sections:[]});controller.hostUpdated();assert.equal(h.calls.at(-1).config.dashboard_root,'marao-dashboard');}
  root.lovelace.rawConfig.marao.navbar.routes=[{path:'/marao-dashboard/panel',label:'Panel'}];controller.hostUpdated();assert.equal(h.calls.at(-1).config.routes[0].label,'Panel');
  delete root.lovelace.rawConfig.marao;controller.hostUpdated();assert.equal(h.calls.at(-1).config,null);
  root.isConnected=false;controller.hostDisconnected();assert.equal(controllers.size,0);assert.equal(h.calls.at(-1).config,null);
});

test('native host refuses incomplete host APIs and releases its navbar after leaving the dashboard',()=>{
  const h=harness();assert.equal(h.compatible({addController:true,removeController:true,lovelace:{setEditMode:true}}),false);
  const root={isConnected:true,panel:{url_path:'marao-dashboard'},lovelace:{setEditMode(){},config:{views:[],marao:{version:1,navbar:{routes:[]}}}},addController(){},removeController(){}};
  const controller=h.attach(root);h.location.pathname='/other-dashboard/0';controller.hostUpdated();assert.equal(h.calls.at(-1).config,null);
});
