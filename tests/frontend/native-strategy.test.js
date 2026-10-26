import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createEnvelope} from '../../custom_components/marao_dashboard/frontend/MaraoSource.js';

test('native editor isolates users/roots, retains same-user drafts and reconciles changed strategy settings', async () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'marao-strategy-'));
  const names=['window','document','HTMLElement','customElements','location'];
  const previous=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
  try {
    const registry=new Map(), listeners={};
    class Element {
      isConnected=true;
      attachShadow() {this.shadowRoot={children:[],textContent:'',replaceChildren(...nodes){this.textContent='';this.children=nodes;}};}
    }
    class Panel extends Element {
      _loaded=true; _dirty=false; _busy=false; loads=0;
      async _load() {this.loads++;}
      _t(key) {return key;}
      _setStatus(value) {this.status=value;}
    }
    registry.set('marao-dashboard-panel',Panel);
    globalThis.HTMLElement=Element;
    globalThis.window={addEventListener:(name,callback)=>{listeners[name]=callback;}};
    globalThis.customElements={get:name=>registry.get(name),define:(name,type)=>registry.set(name,type)};
    globalThis.document={createElement:name=>new (registry.get(name) || Element)()};
    fs.copyFileSync(new URL('../../custom_components/marao_dashboard/frontend/MaraoSource.js',import.meta.url),path.join(directory,'MaraoSource.js'));
    fs.copyFileSync(new URL('../../custom_components/marao_dashboard/frontend/MaraoNames.js',import.meta.url),path.join(directory,'MaraoNames.js'));
    fs.writeFileSync(path.join(directory,'MaraoNavigation.js'),'export const navigate=()=>{};export const updateFrontendClient=()=>{};export const navigationLocalize=key=>key;export const fullscreenUsers=new Set();export const registerFullscreen=element=>fullscreenUsers.add(element);export const unregisterFullscreen=element=>fullscreenUsers.delete(element);');
    fs.writeFileSync(path.join(directory,'MaraoTheme.js'),'export const applyTheme=()=>{},releaseTheme=()=>{};');
    fs.writeFileSync(path.join(directory,'MaraoDashboardPanel.js'),'export {};');
    fs.writeFileSync(path.join(directory,'MaraoNativeModel.js'),`import {createEnvelope} from './MaraoSource.js';export const convertDocument=(text,context)=>({document:createEnvelope(JSON.parse(text).strategy.source_json,context.dashboardRoot,JSON.parse(text)),compiled:compileDashboard(JSON.parse(JSON.parse(text).strategy.source_json))});export class NativeSession {constructor(hass,root,options={}) {Object.assign(this,{hass,root,strategy:options.strategy});}}; export const metadataSnapshot=()=>({}); export const compileDashboard=source=>({views:source.pages.map(page=>({path:page.path,theme:'Marao Dashboard',cards:[{cards:[{type:'custom:marao-navbar-card',routes:[]}]}]}))});`);
    fs.copyFileSync(new URL('../../frontend_src/native-strategy.js',import.meta.url),path.join(directory,'strategy.js'));
    const {MaraoDashboardStrategy:Strategy}=await import(pathToFileURL(path.join(directory,'strategy.js')));
    const source={config_version:2,name:'Safe',landing_page:'home',navigation:[],pages:[{name:'Home',path:'home',entities:[]}]};
    const config=createEnvelope(JSON.stringify(source),'marao-dashboard').strategy;
    const hass={user:{id:'admin',is_admin:true},connection:{},language:'en'};
    globalThis.location={pathname:'/renamed-dashboard/home'};
    const output=await Strategy.generate(config,{...hass,panels:{'renamed-dashboard':{component_name:'lovelace'}}});
    assert.equal(output.views.at(-1).type,'panel');assert.equal(output.views[0].cards[0].cards[0].dashboard_root,'renamed-dashboard');
    assert.equal(output.views[0].cards[0].cards[0].editor_path,output.views[1].path);
    for (const extra of [[],[{name:'Added',path:'added',entities:[]}]]) {
      const generated=await Strategy.generate({...config,source_json:JSON.stringify({...source,pages:[...source.pages,...extra]})},hass);
      assert.equal(generated.views[0].path,'home');
      assert.equal(generated.views[1].path,'marao-editor');
      assert.deepEqual(generated.views.filter(view=>!view.subview).map(view=>view.path),['home',...extra.map(page=>page.path)]);
    }
    delete globalThis.location;
    const regular=await Strategy.generate(config,{...hass,user:{is_admin:false}});
    assert.equal(regular.views.length,1);assert.equal(regular.views[0].cards[0].cards[0].editor_path,undefined);
    const collision={...source,pages:[{name:'User page',path:'marao-editor',entities:[]}]};
    const colliding=await Strategy.generate({...config,source_json:JSON.stringify(collision)},hass);
    assert.equal(colliding.views.at(-1).path,'marao-editor-editor');
    assert.equal(colliding.views[0].cards[0].cards[0].editor_path,'marao-editor-editor');
    const Card=registry.get('marao-dashboard-editor-card'), card=new Card();
    card.setConfig({dashboard_root:'marao-dashboard'});card.hass=hass;await card._mount();
    while(card._mounting) await new Promise(resolve=>setTimeout(resolve,0));
    const panel=card._panel;assert.ok(panel);panel._dirty=true;
    const navigation=await import(pathToFileURL(path.join(directory,'MaraoNavigation.js')));assert.equal(navigation.fullscreenUsers.has(card),true);assert.equal(card._panel.navigate,navigation.navigate);
    card.disconnectedCallback();card.connectedCallback();assert.equal(card._panel,panel);
    let prevented=false;listeners.beforeunload({preventDefault:()=>{prevented=true;}});assert.equal(prevented,true);
    card.hass={...hass,user:{id:'viewer',is_admin:false}};
    assert.equal(card._panel,null);assert.equal(navigation.fullscreenUsers.has(card),false);assert.match(card.shadowRoot.textContent,/administrators/);
    card.hass=hass;while(card._mounting) await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(card._panel,panel);assert.equal(panel._dirty,true);
    card.setConfig({dashboard_root:'another-dashboard'});while(card._mounting) await new Promise(resolve=>setTimeout(resolve,0));
    assert.notEqual(card._panel,panel);assert.equal(card._panel.nativeSession.root,'another-dashboard');
    const editor=await Strategy.getConfigElement();editor.setConfig(config);editor.hass=hass;
    while(editor._mounting) await new Promise(resolve=>setTimeout(resolve,0));
    const local=editor._panel;local._dirty=true;
    editor.setConfig({...config,source_json:JSON.stringify({...source,name:'External'})});
    assert.equal(local.status,'externalChange');assert.equal(local.loads,0);
    editor.disconnectedCallback();
    const reopened=await Strategy.getConfigElement();reopened.setConfig(editor._config);reopened.hass=hass;
    while(reopened._mounting) await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(reopened._panel,local);assert.equal(reopened._panel._dirty,true);
    local._dirty=false;reopened.setConfig({...config,source_json:JSON.stringify({...source,name:'Latest'})});
    assert.equal(local.loads,1);
  } finally {
    for(const name of names) {if(previous[name]===undefined) delete globalThis[name];else globalThis[name]=previous[name];}
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
