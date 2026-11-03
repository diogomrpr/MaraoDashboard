import test from 'node:test';
import assert from 'node:assert/strict';
import {createPopupCoordinator} from '../../frontend_src/popup-coordinator.js';
import {planPopupEdit} from '../../frontend_src/popup-management.js';
import {managedPopupIssue} from '../../custom_components/marao_dashboard/frontend/MaraoPopupManaged.js';
import {createGroupScope} from '../../custom_components/marao_dashboard/frontend/MaraoGroupDetails.js';

function fixture(){
  const owner={type:'custom:marao-camera-card',entity_id:'camera.fake',variables:{event_columns:2}};
  const first=planPopupEdit({views:[{path:'home',type:'sections',sections:[{cards:[owner]}]}]},owner,'home','/marao-dashboard/home',{});
  let saved=structuredClone(first.config),callback,dirty=false,route='marao-dashboard',released=0;const writes=[],records=new Map();
  const connection={connected:true,async subscribeEvents(fn,type){assert.equal(type,'lovelace_updated');callback=fn;return()=>released++;}};
  const root={isConnected:true,panel:{url_path:'marao-dashboard'},hass:{user:{id:'admin',is_admin:true},connected:true,connection,states:{},async callWS(){return structuredClone(saved);}},lovelace:{config:structuredClone(saved),mode:'storage',editMode:true,async saveConfig(next){writes.push(structuredClone(next));saved=structuredClone(next);this.config=structuredClone(next);callback({data:{url_path:'marao-dashboard'}});}},requestUpdate(){}};
  const journal={async read(key){return records.get(key);},async stage(key,value){records.set(key,value);},async clear(key){records.delete(key);}};
  const coordinator=createPopupCoordinator(root,{route:()=>route,dirty:()=>dirty,journal});
  return {root,coordinator,writes,records,path:first.path,get released(){return released;},set dirty(value){dirty=value;},set route(value){route=value;},set saved(value){saved=structuredClone(value);},async event(path='marao-dashboard'){callback({data:{url_path:path}});await coordinator.settled();},async saveParent(change){change(root.lovelace.config);saved=structuredClone(root.lovelace.config);await this.event();}};
}
test('only confirmed clean saves reconcile once; duplicate, own and layout events settle without loops',async()=>{
  const f=fixture();f.coordinator.sync();await f.coordinator.settled();assert.equal(f.writes.length,0);
  await f.event('another-dashboard');assert.equal(f.writes.length,0);
  await f.saveParent(doc=>{doc.views[0].sections[0].cards[0].variables.event_columns=4;});
  assert.equal(f.writes.length,1);assert.equal(f.root.lovelace.config.views[1].sections[0].cards[1].columns,4);assert.equal(f.records.size,0);
  await f.event();assert.equal(f.writes.length,1);
  await f.saveParent(doc=>{doc.views[1].sections[0].cards[0].grid_options={columns:6,rows:7};});assert.equal(f.writes.length,1);
  await f.saveParent(doc=>{delete doc.views[1].sections[0].cards[0].marao_popup_slot;});assert.equal(f.writes.length,2);
  await f.event();assert.equal(f.writes.length,2);f.coordinator.dispose();assert.equal(f.released,1);
});
test('drafts and Cancel never write; saved notification waits for authoritative host and disposal invalidates work',async()=>{
  const f=fixture();f.coordinator.sync();await f.coordinator.settled();const saved=structuredClone(f.root.lovelace.config);
  f.root.lovelace.config.views[0].sections[0].cards[0].variables.event_columns=3;f.dirty=true;await f.event();assert.equal(f.writes.length,0);
  f.root.lovelace.config=structuredClone(saved);f.dirty=false;f.coordinator.sync();await f.coordinator.settled();assert.equal(f.writes.length,0);
  const next=structuredClone(saved);next.views[0].sections[0].cards[0].variables.event_columns=6;f.saved=next;
  await f.event();assert.equal(f.writes.length,0);f.root.lovelace.config=next;f.coordinator.sync();await f.coordinator.settled();assert.equal(f.writes.length,1);
  f.route='another-dashboard';f.coordinator.sync();assert.equal(f.released,1);f.coordinator.dispose();
});
test('stale, updating, failed, inactive and newer source records never appear current',async()=>{
  const f=fixture(),doc=f.root.lovelace.config;assert.equal(managedPopupIssue(doc,f.path),undefined);
  doc.views[0].sections[0].cards[0].variables.event_columns=9;
  assert.match(managedPopupIssue(doc,f.path),/Edit popup/);assert.equal(managedPopupIssue(doc,f.path,{busy:true}),'Updating popup…');
  assert.equal(managedPopupIssue(doc,f.path,{error:'Storage failed'}),'Storage failed');
  f.coordinator.sync();await f.coordinator.settled();assert.equal(f.writes.length,0); // initial drift is read-only
  doc.views[1].marao_popup.version=2;assert.match(managedPopupIssue(doc,f.path),/compatible/);f.coordinator.dispose();
});
test('host identity changes unsubscribe and read-only users do not subscribe or persist',async()=>{
  const f=fixture();f.coordinator.sync();await f.coordinator.settled();f.root.hass.user={id:'other',is_admin:false};f.coordinator.sync();assert.equal(f.released,1);await f.coordinator.settled();assert.equal(f.writes.length,0);f.coordinator.dispose();
});

test('superseded summary actions dispatch zero calls and standalone stale source releases inert ownership in editing',async t=>{
  const previous=globalThis.document;t.after(()=>{globalThis.document=previous;});
  const node=()=>({children:[],dataset:{},append(...nodes){this.children.push(...nodes);},setAttribute(){},remove(){this.removed=true;}});
  globalThis.document={createElement:node};
  const f=fixture(),doc=f.root.lovelace.config,view={inert:false,index:1};let notice,calls=0;
  f.root.shadowRoot={querySelector:()=>view,append(value){notice=value;}};f.root.lovelace.editMode=false;
  const owner={_config:{name:'Safe'},_hass:{states:{}},get preview(){return Boolean(managedPopupIssue(doc,f.path));}};
  const scope=createGroupScope(owner,{id:'all',entities:['light.old']},{entity_type:'light'},{haptic(){},callService(){calls++;},isAccessCover:()=>false},node(),()=>{});
  doc.views[0].sections[0].cards[0].entity_id='camera.new';
  await scope.buttons[0].button.onclick();assert.equal(calls,0);
  f.coordinator.sync();assert.equal(view.inert,true);assert.match(notice.textContent,/Edit popup/);
  f.root.lovelace.editMode=true;f.coordinator.sync();assert.equal(view.inert,false);assert.equal(notice.removed,true);f.coordinator.dispose();
});
