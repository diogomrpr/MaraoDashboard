import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createEnvelope} from '../../custom_components/marao_dashboard/frontend/MaraoSource.js';

async function withStrategy(callback) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'marao-strategy-'));
  const names=['window','document','HTMLElement','customElements','location'];
  const previous=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
  try {
    const registry=new Map();
    class Element {
      isConnected=true;
      events=[];
      attachShadow() {
        this.shadowRoot={children:[],_text:'',get textContent(){return this._text;},set textContent(value){this._text=value;this.children=[];},replaceChildren(...nodes){this._text='';this.children=nodes;}};
      }
      dispatchEvent(event){this.events.push(event);return true;}
    }
    class MigrationCard extends Element {
      setConfig(config){this.config=config;}
      set hass(hass){this.currentHass=hass;}
    }
    registry.set('marao-migration-card',MigrationCard);
    globalThis.HTMLElement=Element;
    globalThis.window={};
    globalThis.customElements={get:name=>registry.get(name),define:(name,type)=>registry.set(name,type)};
    globalThis.document={createElement:name=>new (registry.get(name) || Element)()};
    fs.writeFileSync(path.join(directory,'package.json'),'{"type":"module"}');
    for(const name of ['MaraoNativeBootstrap','MaraoNavigation','MaraoTheme','MaraoOrdinaryMigration']) fs.writeFileSync(path.join(directory,name+'.js'),'export {};');
    fs.writeFileSync(path.join(directory,'MaraoNativeModel.js'),`export {convertDocument} from ${JSON.stringify(new URL('../../frontend_src/convert-document.js',import.meta.url).href)};export const metadataSnapshot=()=>({entities:[],areas:[]});`);
    fs.copyFileSync(new URL('../../frontend_src/native-strategy.js',import.meta.url),path.join(directory,'strategy.js'));
    const {MaraoDashboardStrategy:Strategy}=await import(pathToFileURL(path.join(directory,'strategy.js')));
    await callback({Strategy,registry,MigrationCard});
  } finally {
    for(const name of names) {if(previous[name]===undefined) delete globalThis[name];else globalThis[name]=previous[name];}
    fs.rmSync(directory,{recursive:true,force:true});
  }
}
const source={config_version:2,name:'Safe',landing_page:'home',navigation:[],pages:[{name:'Home',path:'home',entities:[]}]};
const config=createEnvelope(JSON.stringify(source),'marao-dashboard').strategy;
const admin=()=>({user:{id:'admin',is_admin:true},connection:{},language:'en',callWS:()=>{throw new Error('Read-only legacy rendering must not write to Home Assistant.');}});
const navbarFor=view=>{
  let card=view.cards.at(-1);
  while(card?.cards&&card.type!=='custom:marao-navbar-card')card=card.cards.at(-1);
  return card;
};
async function mounted(card) {
  for(let attempt=0;attempt<100;attempt++) {
    if(!card._mounting)return;
    await new Promise(resolve=>setImmediate(resolve));
  }
  assert.fail('Conversion host did not finish mounting.');
}

test('historical strategy renders read-only views and exposes conversion only to administrators',async()=>withStrategy(async({Strategy})=>{
  const hass=admin(),original=structuredClone(config);
  globalThis.location={pathname:'/renamed-dashboard/home'};
  const output=await Strategy.generate(config,{...hass,panels:{'renamed-dashboard':{component_name:'lovelace'}}});
  assert.equal(navbarFor(output.views[0]).dashboard_root,'renamed-dashboard');
  assert.equal(navbarFor(output.views[0]).editor_path,output.views[1].path);
  assert.equal(output.views[1].title,'Convert dashboard');assert.equal(output.views[1].subview,true);
  assert.equal(output.views[1].cards[0].type,'custom:marao-dashboard-editor-card');
  assert.equal(output.views[1].cards[0].dashboard_root,'renamed-dashboard');
  delete globalThis.location;
  for(const extra of [[],[{name:'Added',path:'added',entities:[]}]]) {
    const generated=await Strategy.generate({...config,source_json:JSON.stringify({...source,pages:[...source.pages,...extra]})},hass);
    assert.equal(generated.views[0].path,'home');assert.equal(generated.views[1].path,'marao-editor');
    assert.deepEqual(generated.views.filter(view=>!view.subview).map(view=>view.path),['home',...extra.map(page=>page.path)]);
  }
  const regular=await Strategy.generate(config,{...hass,user:{id:'viewer',is_admin:false}});
  assert.equal(regular.views.length,1);assert.equal(navbarFor(regular.views[0]).editor_path,undefined);
  const collision={...source,landing_page:'marao-editor',pages:[{name:'User page',path:'marao-editor',entities:[]}]};
  const colliding=await Strategy.generate({...config,source_json:JSON.stringify(collision)},hass);
  assert.equal(colliding.views[1].path,'marao-editor-editor');assert.equal(navbarFor(colliding.views[0]).editor_path,'marao-editor-editor');
  const plan={name:'Plan',path:'plan',sections:[{entities:[{template:'md_floor_plan_card',id:'plan',variables:{image_id:'a'.repeat(32),lights:[],full_page:true}}]}]};
  for(const landing of ['home','plan'])for(const isAdmin of [true,false]) {
    const generated=await Strategy.generate({...config,source_json:JSON.stringify({...source,landing_page:landing,show_editor_button:false,pages:[...source.pages,plan]})},{...hass,user:{id:isAdmin?'admin':'regular',is_admin:isAdmin}});
    const editor=generated.views.find(view=>view.subview);
    assert.equal(generated.views.find(view=>view.path==='plan').type,'panel');
    for(const view of generated.views.filter(view=>!view.subview)) {
      const navbar=navbarFor(view);
      assert.equal(navbar.dashboard_root,'marao-dashboard');
      assert.equal(navbar.editor_path,isAdmin?editor.path:undefined,'Legacy pages retain only role-appropriate conversion access, including full-page floor plans.');
    }
  }
  const setup=await Strategy.generate({dashboard_root:'marao-dashboard'},hass);
  assert.equal(setup.views[0].cards[0].type,'custom:marao-dashboard-editor-card');
  assert.deepEqual(config,original,'Viewing a historical strategy must not rewrite its source.');
  assert.equal(window.customStrategies,undefined,'Fresh authoring must not advertise the retired strategy.');
}));

test('conversion hosts preserve same-owner work and discard state across roots, users and connections',async()=>withStrategy(async({Strategy,registry,MigrationCard})=>{
  const hass=admin(),Card=registry.get('marao-dashboard-editor-card'),card=new Card();
  card.setConfig({dashboard_root:'marao-dashboard'});card.hass=hass;await mounted(card);
  const first=card._child;
  assert.ok(first instanceof MigrationCard);assert.deepEqual(first.config,{dashboard_root:'marao-dashboard'});assert.equal(first.currentHass,hass);
  first.stagedConversion={review:'unsaved'};
  const update={...hass,states:{'light.safe':{state:'off'}}};card.hass=update;await mounted(card);
  assert.equal(card._child,first);assert.equal(first.currentHass,update);assert.deepEqual(first.stagedConversion,{review:'unsaved'});
  card.setConfig({dashboard_root:'another-dashboard'});await mounted(card);
  assert.notEqual(card._child,first);assert.deepEqual(card._child.config,{dashboard_root:'another-dashboard'});assert.equal(card._child.stagedConversion,undefined);
  const otherRoot=card._child;card.hass={...hass,user:{id:'another-admin',is_admin:true}};await mounted(card);
  assert.notEqual(card._child,otherRoot,'A new administrator must not inherit another administrator’s staged conversion.');
  const otherUser=card._child;card.hass={...card._hass,connection:{}};await mounted(card);
  assert.notEqual(card._child,otherUser,'A new Home Assistant connection must obtain its own conversion session.');
  const priorAdmin=card._child;card.hass={...card._hass,user:{id:'viewer',is_admin:false}};await mounted(card);
  assert.equal(card._child,null);assert.equal(card.shadowRoot.children.length,0);assert.match(card.shadowRoot.textContent,/administrators/);
  card.hass=hass;await mounted(card);assert.notEqual(card._child,priorAdmin);
  const editor=await Strategy.getConfigElement();editor.setConfig(config);editor.hass=hass;
  const changedConnection={...hass,connection:{}};editor.hass=changedConnection;await mounted(editor);
  assert.ok(editor._child instanceof MigrationCard);assert.equal(editor._child.currentHass,changedConnection,'An identity change during lazy loading must mount only the current owner.');
  assert.deepEqual(editor.events,[],'Opening legacy strategy settings must not save a replacement dashboard.');
  assert.equal(registry.has('marao-dashboard-panel'),false,'Legacy conversion must not mount the retired builder.');
}));
