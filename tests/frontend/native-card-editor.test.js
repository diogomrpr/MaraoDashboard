import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import catalog from '../../custom_components/marao_dashboard/frontend/marao-catalog.json' with {type:'json'};
import {MaraoCardEditor,nativeConfigToDescriptor,nativeCardFormData,patchNativeCard} from '../../frontend_src/native-card-editor.js';
import {findNativeEditorContext} from '../../custom_components/marao_dashboard/frontend/MaraoNativeContext.js';
import {nativeCardStub} from '../../frontend_src/native-cards.js';
import {generatedPopupView,managedDescriptor} from '../../frontend_src/popup-management.js';
import {createManagedView} from '../../custom_components/marao_dashboard/frontend/MaraoPopupManaged.js';

const card=id=>catalog.cards.find(item=>item.id===id);
const harnessContexts=new WeakSet();

const plexOptions=()=>({client_entity:'media_player.plex_safe',scan_clients_entity:'button.plex_scan',app_source:'Plex',library_root:{media_content_type:'server',media_content_id:'plex://safe-server/server'},future:{keep:[]}});

test('Plex setup stays with the existing Apple TV and preserves Save, Cancel and opaque fields',t=>{
  const options={remote_entity:'remote.safe',apps:[],plex:plexOptions(),future:false};
  const f=nativeFormHarness(t,{type:'custom:marao-media-card',entity_id:'media_player.safe',apple_tv:options},{language:'pt',states:{}}),saves=[];
  const dialog=globalThis.document.createElement('div'),content=dialog.querySelector('.dialog-content');
  f.editor._dialog=()=>dialog;f.editor._closeDialog=()=>{};f.editor._openMediaOptions({entity_id:'media_player.safe',apple_tv:options},value=>saves.push(value));
  const form=f.forms.find(form=>form.schema.some(field=>field.name==='client_entity'));
  assert.equal(form.schema.find(field=>field.name==='client_entity').label,'Cliente Plex');
  form.change({...form.data,app_source:'Custom Plex'});assert.equal(saves.length,0);
  content.querySelector('[data-close]').dispatchEvent(new Event('click'));assert.equal(saves.length,0);
  content.querySelector('[data-save]').dispatchEvent(new Event('click'));assert.deepEqual(saves[0],{...options,plex:{...options.plex,app_source:'Custom Plex'}});
  assert.deepEqual(options.plex,plexOptions());
  form.change({...form.data,enabled:false});content.querySelector('[data-save]').dispatchEvent(new Event('click'));assert.equal(saves.at(-1).plex,false);
});

test('Plex layout selector saves only explicit choices and preserves opaque settings',t=>{
  const options={remote_entity:'remote.safe',apps:[],plex:plexOptions(),future:false};
  const f=nativeFormHarness(t,{type:'custom:marao-media-card',entity_id:'media_player.safe',apple_tv:options},{language:'pt',states:{}}),saves=[];
  const dialog=globalThis.document.createElement('div'),content=dialog.querySelector('.dialog-content');
  f.editor._dialog=()=>dialog;f.editor._closeDialog=()=>{};f.editor._openMediaOptions({entity_id:'media_player.safe',apple_tv:options},value=>saves.push(value));
  const form=f.forms.find(form=>form.schema.some(field=>field.name==='display')),field=form.schema.find(field=>field.name==='display');
  assert.equal(field.label,'Disposição da biblioteca');assert.deepEqual(field.selector.select.options.map(option=>option.value),['inline','popup']);
  content.querySelector('[data-save]').dispatchEvent(new Event('click'));assert.deepEqual(saves.at(-1),options);
  form.change({...form.data,display:'popup'});content.querySelector('[data-save]').dispatchEvent(new Event('click'));
  assert.deepEqual(saves.at(-1),{...options,plex:{...options.plex,display:'popup'}});assert.deepEqual(options.plex,plexOptions());
});

test('Plex setup read failure leaves the draft and saved parent unchanged without device calls',async t=>{
  const f=nativeFormHarness(t,{type:'custom:marao-media-card',entity_id:'media_player.safe',apple_tv:{plex:plexOptions()}},{language:'en',user:{id:'safe'},connection:{},states:{},callWS:async()=>{throw new Error('Browse rejected');},callService:()=>assert.fail('setup must be read-only')});
  const create=globalThis.document.createElement;
  globalThis.document.createElement=()=>{const node=create();node.setAttribute=()=>{};return node;};
  const dialogs=[],saves=[];f.editor._dialog=()=>{const dialog=globalThis.document.createElement('div');dialog.open=true;dialogs.push(dialog);return dialog;};f.editor._closeDialog=()=>{};f.editor._moveHaptic=()=>{};
  f.editor._openMediaOptions({entity_id:'media_player.safe',apple_tv:{plex:plexOptions()}},value=>saves.push(value));
  const section=dialogs[0].querySelector('.dialog-content').querySelector('[data-plex-options]');
  section.children.at(-1).onclick();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(dialogs.length,2);assert.equal(dialogs[1].querySelector('.dialog-content').children[0].textContent,'Browse rejected');
  assert.equal(saves.length,0);assert.deepEqual(f.editor._config.apple_tv.plex,plexOptions());
});

test('Apple TV playback app switches to Rivulet without requiring or replacing Plex client choices',t=>{
  const options={remote_entity:'remote.safe',apps:[],plex:plexOptions(),future:false};
  const f=nativeFormHarness(t,{type:'custom:marao-media-card',entity_id:'media_player.safe',apple_tv:options},{language:'en',states:{}}),saves=[];
  const dialog=globalThis.document.createElement('div'),content=dialog.querySelector('.dialog-content');
  f.editor._dialog=()=>dialog;f.editor._closeDialog=()=>{};f.editor._openMediaOptions({entity_id:'media_player.safe',apple_tv:options},value=>saves.push(value));
  const form=f.forms.find(form=>form.schema.some(field=>field.name==='playback_app'));
  assert.deepEqual(form.schema.find(field=>field.name==='playback_app').selector.select.options.map(option=>option.value),['plex','rivulet']);
  content.querySelector('[data-save]').dispatchEvent(new Event('click'));assert.deepEqual(saves[0],options);
  form.change({...form.data,playback_app:'rivulet'});
  const current=f.forms.at(-1);assert.equal(current.schema.some(field=>field.name==='client_entity'),false);
  assert.equal(current.schema.some(field=>field.name==='scan_clients_entity'),false);
  assert.equal(current.schema.some(field=>field.name==='browse_entity'),true);
  content.querySelector('[data-save]').dispatchEvent(new Event('click'));
  assert.deepEqual(saves.at(-1),{...options,plex:{...options.plex,playback_app:'rivulet'}});
  assert.deepEqual(options.plex,plexOptions());
});

test('Rivulet setup can select the configured server before any session exists, with no device or server writes',async t=>{
  const options={remote_entity:'remote.safe',apps:[],plex:{playback_app:'rivulet',library_root:plexOptions().library_root,future:[]}},calls=[];
  const f=nativeFormHarness(t,{type:'custom:marao-media-card',entity_id:'media_player.safe',apple_tv:options},{language:'en',user:{id:'safe'},connection:{},states:{},callService:()=>assert.fail('read-only setup'),callWS:async command=>{calls.push(command);return command.type==='config/device_registry/list'?[{name:'Configured server',identifiers:[['plex','real-safe-server']]}]:[];}});
  const create=globalThis.document.createElement;globalThis.document.createElement=()=>{const node=create();node.setAttribute=()=>{};return node;};
  const dialogs=[],saves=[];f.editor._dialog=()=>{const node=globalThis.document.createElement('div');node.open=true;dialogs.push(node);return node;};f.editor._closeDialog=()=>{};f.editor._moveHaptic=()=>{};
  f.editor._openMediaOptions({entity_id:'media_player.safe',apple_tv:options},value=>saves.push(value));
  const content=dialogs[0].querySelector('.dialog-content');content.querySelector('[data-plex-options]').children.at(-1).onclick();await new Promise(resolve=>setImmediate(resolve));
  const choose=dialogs[1].querySelector('.dialog-content').children.find(node=>node.textContent==='Use this server: Configured server');assert.ok(choose);choose.onclick();
  assert.equal(saves.length,0);content.querySelector('[data-save]').dispatchEvent(new Event('click'));
  assert.deepEqual(saves[0],{...options,plex:{...options.plex,library_root:{media_content_type:'server',media_content_id:'plex://real-safe-server/server'}}});
  assert.ok(calls.every(command=>['config/device_registry/list','config/entity_registry/list'].includes(command.type)));
});

function nativeFormHarness(t,config,hass={language:'en',states:{}}) {
  if(!harnessContexts.has(t)){const previous=globalThis.document;t.after(()=>{globalThis.document=previous;});harnessContexts.add(t);}
  const node=()=>Object.assign(new EventTarget(),{children:[],nodes:new Map(),style:{},dataset:{},setAttribute(name,value){this[name]=value;},prepend(...items){this.children.unshift(...items);},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,node());return this.nodes.get(selector);},querySelectorAll(){return [];}});
  globalThis.document={createElement:node};
  const editor=new MaraoCardEditor(),forms=[],events=[];
  editor.dispatchEvent=event=>events.push(event.detail.config);editor.setConfig(config);
  editor.shadowRoot=node();editor._hass=hass;editor._entities=[];editor._renderPopupSelector=()=>{};
  editor._mountForm=(host,data,schema,change)=>{const form={host,data,schema,change(value){form.data=value;change(value);}};forms.push(form);return form;};editor._render();
  return {editor,forms,events};
}

test('shared HA forms retain edited values and allow a picker callback to reset its selection',async t=>{
  const {editor}=nativeFormHarness(t,{type:'custom:marao-light-card',entity_id:'light.a'});
  editor._containForm=async()=>{};
  const host=globalThis.document.createElement('div'),values=[];
  const form=MaraoCardEditor.prototype._mountForm.call(editor,host,{entity_id:'light.a'},[],value=>{values.push(value);});
  const value={entity_id:'light.b'};
  form.dispatchEvent(new CustomEvent('value-changed',{detail:{value}}));
  assert.equal(form.data,value);assert.deepEqual(values,[value]);
  const picker=MaraoCardEditor.prototype._mountForm.call(editor,host,{},[],()=>{picker.data={};});
  picker.dispatchEvent(new CustomEvent('value-changed',{detail:{value}}));assert.deepEqual(picker.data,{});
});

test('basic and advanced fields retain each other’s latest values across repeated edits',t=>{
  const original={type:'custom:marao-light-card',entity_id:'light.a',variables:{enable_slider:true},future:[]};
  const {forms,events}=nativeFormHarness(t,original);
  const basic=forms.find(form=>form.schema.some(field=>field.name==='name')),advanced=forms.find(form=>form.schema.some(field=>field.name==='var__card_color'));
  basic.change({...basic.data,var__enable_slider:false});advanced.change({...advanced.data,var__card_color:'#39755B'});
  basic.change({...basic.data,name:'Desk'});
  assert.deepEqual(events.at(-1),{...original,name:'Desk',variables:{enable_slider:false,card_color:'#39755B'}});
});

test('assigning a member to a summary section updates the other section’s displayed selection',t=>{
  const original={type:'custom:marao-entity-group-card',id:'lights',name:'Lights',entity_type:'light',entities:['light.a'],summary_sections:[{id:'one',name:'One',entities:['light.a']},{id:'two',name:'Two',entities:[]}]};
  const {forms,events}=nativeFormHarness(t,original),sections=forms.filter(form=>form.schema.some(field=>field.name==='entities'));
  sections[1].change({...sections[1].data,entities:['light.a']});
  assert.deepEqual(sections[0].data.entities,[]);
  assert.deepEqual(events.at(-1).summary_sections,[{...original.summary_sections[0],entities:[]},{...original.summary_sections[1],entities:['light.a']}]);
});

test('every catalog form saves a label and exposes only the primary source its role uses',t=>{
  const domains=[...new Set(catalog.cards.flatMap(entry=>entry.domains))];
  const hass={language:'en',states:Object.fromEntries(domains.map(domain=>[domain+'.test',{entity_id:domain+'.test',state:'off',attributes:{source_list:['TV'],...(domain==='sensor'?{device_class:'battery'}:{})}}]))};
  for(const entry of catalog.cards.filter(entry=>entry.id!=='md_floor_plan_card')) {
    const original={...nativeCardStub(entry.id,hass,Object.keys(hass.states)),grid_options:{columns:6},future:{empty:[],enabled:false}};
    const {editor,forms,events}=nativeFormHarness(t,original,hass);
    const primary=forms.flatMap(form=>form.schema).find(field=>field.name==='entity_id');
    assert.equal(Boolean(primary),entry.domains.length>0,entry.id+' primary source');
    if(primary)assert.equal(primary.required,!entry.entity_optional,entry.id+' source requirement');
    const basic=forms.find(form=>form.schema.some(field=>field.name==='name'));
    basic.change({...basic.data,name:'Edited label'});
    assert.equal(editor.shadowRoot.querySelector('[data-status]').textContent,'',entry.id+' validation');
    assert.deepEqual(events.at(-1),{...original,name:'Edited label'},entry.id+' complete save');
  }
});

const groupHost=editor=>editor.shadowRoot.querySelector('[data-fields]').querySelector('[data-special]');
const groupRows=editor=>groupHost(editor).querySelector('[data-members]');
const groupAction=(row,value)=>row.children[0].children.at(-1).dispatchEvent(new CustomEvent('wa-select',{detail:{item:{value}}}));
test('group row removal prunes stale section references while preserving section settings',t=>{
  const original={type:'custom:marao-entity-group-card',template:'md_entity_group_card',id:'lights',name:'Lights',entity_type:'light',entities:['light.a','light.b'],summary_sections:[{id:'main',name:'Main',entities:['light.a','light.b'],future:false}],future:[]};
  const {editor,forms,events}=nativeFormHarness(t,original);
  assert.ok(!forms.some(form=>form.schema.some(field=>field.name==='members')));
  groupAction(groupRows(editor).children[0],'delete');
  assert.deepEqual(events.at(-1).summary_sections,[{...original.summary_sections[0],entities:['light.b']}]);
  groupAction(groupRows(editor).children[0],'delete');
  assert.deepEqual(events.at(-1).entities,[]);assert.deepEqual(events.at(-1).summary_sections,[{...original.summary_sections[0],entities:[]}]);
  assert.deepEqual(original.summary_sections[0].entities,['light.a','light.b']);
  const section=forms.findLast(form=>form.schema.some(field=>field.name==='entities'));section.change({name:'Unassigned'});
  assert.deepEqual(events.at(-1).summary_sections,[{...original.summary_sections[0],name:'Unassigned',entities:[]}]);
});

test('single Group rows retain opaque settings through inline edits, native drag callbacks and additions',async t=>{
  const member={entity_id:'light.a',name:'Desk',variables:{enable_slider:false},future:{keep:[]}},original={type:'custom:marao-entity-group-card',id:'lights',name:'Lights',entity_type:'light',popup_filter:'active',entities:[member,'light.b'],summary_sections:[{id:'main',name:'Main',entities:['light.a'],future:false}],future:[]};
  const f=nativeFormHarness(t,original);f.editor._moveHaptic=()=>{};const rows=groupRows(f.editor),first=rows.children[0];
  first.children[0].children[1].onclick();const fields=f.forms.findLast(form=>form.schema.some(field=>field.name==='entity_id'));
  fields.change({...fields.data,name:'Desk changed'});
  const expected=structuredClone(original);expected.entities[0].name='Desk changed';assert.deepEqual(f.events.at(-1),expected);assert.equal(rows.children[0],first,'typing retains the active row and form');
  fields.change({...fields.data,entity_id:'light.c'});expected.entities[0].entity_id='light.c';expected.summary_sections[0].entities=['light.c'];assert.deepEqual(f.events.at(-1),expected);
  const sortable=groupHost(f.editor).querySelector('[data-member-sortable]');sortable.dispatchEvent(new CustomEvent('item-moved',{detail:{oldIndex:0,newIndex:1}}));
  expected.entities=['light.b',expected.entities[0]];assert.deepEqual(f.events.at(-1),expected);await Promise.resolve();
  assert.equal(rows.children[1].children[0].children[1]['aria-expanded'],'true','expanded settings follow the member through reorder');
  const add=f.forms.findLast(form=>form.schema.some(field=>field.name==='member')),count=f.events.length;
  add.change({member:'light.b'});assert.equal(f.events.length,count);assert.deepEqual(add.data,{member:''});
  add.change({member:'light.d'});expected.entities.push('light.d');assert.deepEqual(f.events.at(-1),expected);assert.deepEqual(original.entities,[member,'light.b']);
  const current=f.events.length;sortable.dispatchEvent(new CustomEvent('item-moved',{detail:{oldIndex:-1,newIndex:1}}));assert.equal(f.events.length,current);
});

test('Group Add entity uses one compatible single selector for each family',t=>{
  for(const [kind,domain]of [['light','light'],['cover','cover'],['climate','climate'],['battery','sensor']]){
    const f=nativeFormHarness(t,{type:'custom:marao-entity-group-card',id:'group',name:'Group',entity_type:kind,entities:[]});
    const adds=f.forms.filter(form=>form.schema.some(field=>field.name==='member'));assert.equal(adds.length,1);
    assert.deepEqual(adds[0].schema[0].selector,{entity:{domain:[domain]}});assert.ok(!f.forms.some(form=>form.schema.some(field=>field.name==='members')));
  }
});

test('managed child forms expose presentation, retain complete data and explicitly detach behavior',t=>{
  const previous=globalThis.location;t.after(()=>{globalThis.location=previous;});globalThis.location={pathname:'/marao-dashboard/popup-child'};
  const parent={type:'custom:marao-climate-card',entity_id:'climate.a'};
  const view=createManagedView(generatedPopupView(parent,'popup-child','/marao-dashboard/home',{}),managedDescriptor(parent));
  const original={...view.sections[0].cards[0],grid_options:{columns:5},future:{empty:[],enabled:false}},f=nativeFormHarness(t,original);
  f.forms.length=0;f.editor.lovelace={views:[view]};
  const form=f.forms[0];assert.equal(form.schema.some(field=>field.name==='entity_id'),false);assert.equal(form.schema.some(field=>field.name==='var__show_mode_buttons'),false);
  form.change({...form.data,name:'Local label',icon:'mdi:home'});form.change({...form.data,name:original.name||''});
  assert.equal(f.events.at(-1).name,original.name);assert.equal(f.events.at(-1).icon,'mdi:home');assert.equal(f.events.at(-1).marao_popup_slot,original.marao_popup_slot);assert.deepEqual(f.events.at(-1).future,original.future);
  const button=f.editor.shadowRoot.querySelector('[data-fields]').children.find(node=>node.textContent==='Make custom');assert.ok(button);f.editor._moveHaptic=()=>{};button.onclick();
  assert.equal(f.events.at(-1).marao_popup_slot,undefined);assert.deepEqual(f.events.at(-1).grid_options,{columns:5});assert.deepEqual(f.events.at(-1).variables,original.variables);
});

test('managed group forms retain explicit selection across type changes without a primary Entity',t=>{
  const owner={type:'custom:marao-entity-group-card',id:'lights',name:'Lights',entity_type:'light',entities:['light.a'],popup_view:'popup-group'};
  const view=createManagedView(generatedPopupView(owner,'popup-group','/marao-dashboard/home',{}),managedDescriptor(owner));
  const f=nativeFormHarness(t,owner);f.forms.length=0;f.editor.lovelace={views:[view]};
  assert.equal(f.forms.some(form=>form.schema.some(field=>field.name==='entity_id')),false);
  const group=f.forms.find(form=>form.schema.some(field=>field.name==='entity_type'));
  group.change({...group.data,entity_type:'cover'});assert.deepEqual(f.events.at(-1).entities,[]);
  const members=f.forms.filter(form=>form.schema.some(field=>field.name==='member')).at(-1);members.change({member:'cover.fake'});assert.deepEqual(f.events.at(-1).entities,['cover.fake']);
  group.change({...group.data,entity_type:'light'});assert.deepEqual(f.events.at(-1).entities,['light.a']);
});

test('popup authoring has no file-download or recovery-link lifecycle',()=>{
  for(const path of ['frontend_src/native-card-editor.js','custom_components/marao_dashboard/frontend/MaraoPopupLayout.js','custom_components/marao_dashboard/frontend/MaraoPopupTransaction.js'])assert.doesNotMatch(fs.readFileSync(new URL('../../'+path,import.meta.url),'utf8'),/new Blob|createObjectURL|revokeObjectURL|\.download\s*=|data-popup-recovery|exportRecovery/);
});

test('native app logo chooser patches only artwork and Automatic removes the override',t=>{
  const original={type:'custom:marao-media-app-card',entity_id:'media_player.safe',name:'Custom',icon:'mdi:television',variables:{app_source:'Custom TV app',future:false},grid_options:{columns:3},visibility:[],future:{keep:[]}};
  const {forms,events,editor}=nativeFormHarness(t,original,{language:'pt',states:{}}),form=forms.find(form=>form.schema.some(field=>field.name==='var__app_logo'));
  const field=form.schema.find(field=>field.name==='var__app_logo');assert.equal(field.label,'Logótipo da aplicação');assert.deepEqual(field.selector.select.options.map(option=>option.value),['','netflix','spotify','youtube','disney-plus','prime-video','apple-tv','plex','meo','hbo-max','f1-tv']);
  assert.equal(events.length,0);form.change({...form.data,var__app_logo:'netflix'});assert.deepEqual(events.at(-1),{...original,variables:{...original.variables,app_logo:'netflix'}});
  form.change({...form.data,var__app_logo:''});assert.deepEqual(events.at(-1),original);
  form.change({...form.data,var__app_logo:'invalid'});assert.equal(events.length,2);assert.match(editor.shadowRoot.querySelector('[data-status]').textContent,/logótipo/);
});

test('nested app logo edits and cancellation preserve source, app order and unknown data',t=>{
  const options={remote_entity:'remote.safe',future:{keep:[]},apps:[{source:'Custom TV app',name:'Custom',icon:'mdi:television',future:false},{source:'MEO Go',future:[]}]};
  const f=nativeFormHarness(t,{type:'custom:marao-media-card',entity_id:'media_player.safe',apple_tv:options}),editor=f.editor,saves=[];
  const dialog=globalThis.document.createElement('div'),content=dialog.querySelector('.dialog-content');let editButton,appForm;
  content.querySelector('#app-list').querySelectorAll=()=>{editButton=globalThis.document.createElement('button');editButton.dataset={room:'0',action:'app-edit'};return [editButton];};
  editor._dialog=()=>dialog;editor._closeDialog=()=>{};editor._openFormDialog=(title,data,schema,save)=>{appForm={data,schema,save};};
  editor._openMediaOptions({entity_id:'media_player.safe',apple_tv:options},value=>saves.push(value));editButton.dispatchEvent(new Event('click'));
  assert.deepEqual(appForm.schema.find(field=>field.name==='logo').selector.select.options.map(option=>option.value),['','netflix','spotify','youtube','disney-plus','prime-video','apple-tv','plex','meo','hbo-max','f1-tv']);
  content.querySelector('[data-close]').dispatchEvent(new Event('click'));assert.equal(saves.length,0);assert.equal(options.apps[0].logo,undefined);
  appForm.save({...appForm.data,logo:'netflix'});assert.equal(saves.length,0);content.querySelector('[data-save]').dispatchEvent(new Event('click'));
  assert.deepEqual(saves[0],{...options,apps:[{...options.apps[0],logo:'netflix'},options.apps[1]]});assert.equal(options.apps[0].logo,undefined);
  editButton.dispatchEvent(new Event('click'));appForm.save({...appForm.data,logo:''});content.querySelector('[data-save]').dispatchEvent(new Event('click'));assert.deepEqual(saves.at(-1),options);
});

test('optional weather and room member edits save without adding a redundant primary source',t=>{
  const header={type:'custom:marao-header-card',variables:{person_entity:'person.a',future:false}};
  const h=nativeFormHarness(t,header),weather=h.forms.find(form=>form.schema.some(field=>field.name==='entity_id'));
  weather.change({...weather.data,entity_id:'weather.home'});
  assert.deepEqual(h.events.at(-1),{...header,entity_id:'weather.home'});
  weather.change({...weather.data,entity_id:''});
  assert.deepEqual(h.events.at(-1),header);
  const room={type:'custom:marao-room-card',page:'living-room',variables:{light_entities:['light.a'],future:[]}};
  const r=nativeFormHarness(t,room),lights=r.forms.find(form=>form.schema.some(field=>field.name==='var__light_entities'));
  lights.change({...lights.data,var__light_entities:[]});
  assert.deepEqual(r.events.at(-1),{...room,variables:{...room.variables,light_entities:[]}});
});

test('loading schedule collection choices preserves the active form and latest device edits',async t=>{
  let resolve;const pending=new Promise(done=>{resolve=done;});
  const hass={language:'en',user:{is_admin:true},states:{'automation.collection':{entity_id:'automation.collection',attributes:{id:'marao_schedules_existing_controller'}}},callApi:()=>pending};
  const original={type:'custom:marao-schedules-card',group_id:'draft',targets:['switch.a'],future:[]};
  const {editor,forms,events}=nativeFormHarness(t,original,hass);
  const form=forms.find(form=>form.schema.some(field=>field.name==='group_id')),count=forms.length;
  form.change({...form.data,targets:[]});
  const manifest={manager:'marao-schedules',version:1,role:'controller',id:'existing',name:'Existing collection',targets:[{entity_id:'switch.b'}]};
  resolve({variables:{marao_schedule:manifest}});await pending;await Promise.resolve();
  assert.equal(forms.length,count,'Loading options must not replace the active form');
  assert.deepEqual(editor._config.targets,[]);
  assert.deepEqual(form.data.targets,[],'The visible field must retain the latest edit');
  assert.ok(form.schema[0].selector.select.options.some(option=>option.value==='existing'));
  form.change({...form.data,group_id:'existing'});
  assert.deepEqual(events.at(-1).targets,['switch.b']);
  assert.equal(forms.at(-1).schema.some(field=>field.name==='targets'),false,'An installed collection owns its registered devices');
  assert.equal(editor.shadowRoot.querySelector('[data-status]').textContent,'');
});

test('event editor retains rejected sources until corrected and preserves unrelated source data',t=>{
  const original={type:'custom:marao-camera-events-card',cameras:[{entity:'camera.a',future:{keep:[]}}],columns:2,future:false};
  const {editor,forms,events}=nativeFormHarness(t,original);
  const general=forms.find(form=>form.schema.some(field=>field.name==='limit'));
  assert.equal(general.schema.some(field=>field.name==='columns'),false);
  const camera=forms.find(form=>form.schema.some(field=>field.name==='event_provider'));
  camera.change({...camera.data,entity:'light.invalid'});
  assert.equal(events.length,0);
  general.change({...general.data,limit:3,title:'Events'});
  assert.equal(events.length,0,'General edits must retain an invalid source draft');
  camera.change({...camera.data,name:'Front'});
  assert.equal(events.length,0,'Source edits must retain the same invalid draft');
  assert.ok(editor.shadowRoot.querySelector('[data-status]').textContent);
  camera.change({...camera.data,entity:'camera.b'});
  assert.deepEqual(events.at(-1),{...original,cameras:[{...original.cameras[0],entity:'camera.b',name:'Front'}],limit:3,title:'Events'});
});

test('group sections and schedule cards create safe IDs on HTTP without randomUUID',async t=>{
  const cryptoDescriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto'),crypto=globalThis.crypto;
  t.after(()=>Object.defineProperty(globalThis,'crypto',cryptoDescriptor));
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:crypto.getRandomValues.bind(crypto)}});
  const schedules=nativeCardStub('md_schedules_card');assert.match(schedules.group_id,/^[a-f0-9]{32}$/);
  const {uid}=await import('../../frontend_src/schedule-model.js');assert.match(uid(),/^[a-f0-9]{32}$/);
  const original={type:'custom:marao-entity-group-card',id:'lights',name:'Lights',entity_type:'light',entities:[]};
  const {editor,events}=nativeFormHarness(t,original),host=editor.shadowRoot.querySelector('[data-fields]').querySelector('[data-special]').querySelector('[data-sections]');
  host.children[0].onclick();
  assert.match(events.at(-1).summary_sections[0].id,/^section-[a-f0-9]{32}$/);
  assert.equal(editor.shadowRoot.querySelector('[data-status]').textContent,'');
});

test('native card forms preserve unknown native settings and every catalog role across a local name edit',()=>{
  for(const entry of catalog.cards) {
    const original={type:'custom:marao-card',template:entry.id,name:'Original',variables:{future:{array:[],enabled:false}},grid_options:{columns:6,rows:2},visibility:[{condition:'state',entity:'input_boolean.visible',state:'on'}],tap_action:{action:'navigate',navigation_path:'/custom-root/elsewhere'},future:{empty:[],false:false}};
    const before=structuredClone(original),data=nativeCardFormData(original,entry);
    const next=patchNativeCard(original,entry,data,{...data,name:'Local label'});
    assert.deepEqual(next,{...before,name:'Local label'},entry.id);
    assert.deepEqual(original,before,'form patch must not mutate HA-owned input');
  }
});

test('native vacuum sibling editing retains structured commands and empty or false options',()=>{
  const original={type:'custom:marao-vacuum-card',template:'md_vacuum_card',entity_id:'vacuum.test',variables:{action_1:{icon:'mdi:sofa',data:{command:'app_segment_clean',params:[{segments:[21],repeat:1}],future:false}},future:[]},future:{preserved:true}};
  const initial=nativeCardFormData(original,card(original.template));
  const patched=patchNativeCard(original,card(original.template),initial,{...initial,'var__action_1.icon':'mdi:bed'});
  assert.deepEqual(patched.variables.action_1.data,original.variables.action_1.data);
  assert.equal(patched.variables.action_1.icon,'mdi:bed');
  assert.deepEqual(patched.variables.future,[]);
  const replacement={command:'app_segment_clean',params:[{segments:[22],repeat:2}],future:[]};
  const next=patchNativeCard(patched,card(original.template),initial,{...initial,'var__action_1.icon':'mdi:bed','var__action_1.data':replacement});
  assert.deepEqual(next.variables.action_1.data,replacement);
  assert.deepEqual(original.variables.action_1.data.params,[{segments:[21],repeat:1}]);
});

test('native energy and current forms retain explicit emptiness and reject invalid presets without mutation',()=>{
  const energy={type:'custom:marao-energy-card',template:'md_energy_period_card',entity_id:'sensor.energy',variables:{sub_entities:[],display_precision:0,calculate_cost:false,future:[]},layout_options:{grid_columns:2}};
  const initial=nativeCardFormData(energy,card(energy.template));
  const next=patchNativeCard(energy,card(energy.template),initial,{...initial,'var__display_precision':'2'});
  assert.deepEqual(next.variables.sub_entities,[]);assert.equal(next.variables.calculate_cost,false);
  assert.equal(next.variables.display_precision,2);assert.deepEqual(next.layout_options,energy.layout_options);
  const current={type:'custom:marao-wallbox-current-card',template:'md_wallbox_current_card',entity_id:'input_number.current',variables:{shortcuts:[],future:false}};
  const fields=nativeCardFormData(current,card(current.template));
  assert.deepEqual(patchNativeCard(current,card(current.template),fields,{...fields,name:'Current'}).variables.shortcuts,[]);
  const key='var__shortcuts';
  assert.throws(()=>patchNativeCard(current,card(current.template),fields,{...fields,[key]:'6,12,16,20'}),/at most three/);
  assert.deepEqual(current.variables.shortcuts,[]);
});

test('native editor emits complete independent config and ignores its own HA echo',()=>{
  const editor=new MaraoCardEditor(),events=[];
  editor.dispatchEvent=event=>{events.push(event);return true;};
  const config={type:'custom:marao-light-card',template:'md_light_card',entity_id:'light.test',variables:{enable_slider:false,future:[]},grid_options:{columns:6},visibility:[],unknown:{saved:true}};
  editor.setConfig(config);
  const descriptor={...nativeConfigToDescriptor(config),name:'New label'};
  editor._commitDescriptor(descriptor);
  assert.equal(events.length,1);assert.equal(events[0].type,'config-changed');assert.equal(events[0].bubbles,true);assert.equal(events[0].composed,true);
  assert.deepEqual(events[0].detail.config,{...config,name:'New label'});
  const model=editor._model;editor.setConfig(events[0].detail.config);assert.equal(editor._model,model);
  events[0].detail.config.unknown.saved=false;assert.equal(editor._config.unknown.saved,true);
  assert.equal(config.name,undefined);
});

test('native form values can return to their saved value without losing specialized edits',()=>{
  const entry=card('md_scene_collection_card'),original={type:'custom:marao-scene-collection-card',template:entry.id,name:'Scenes',entities:[],future:{keep:[]}};
  const before=nativeCardFormData(original,entry),edited={...before,name:'Evening'};
  const independentlyEdited={...original,entities:[{entity_id:'scene.evening',name:'Local scene',future:false}]};
  const next=patchNativeCard(independentlyEdited,entry,before,edited);
  const restored=patchNativeCard(next,entry,edited,before);
  assert.equal(restored.name,'Scenes');assert.deepEqual(restored.entities,independentlyEdited.entities);assert.deepEqual(restored.future,original.future);
});

test('native type-only configurations resolve their matching catalog roles',()=>{
  assert.equal(nativeConfigToDescriptor({type:'custom:marao-light-card',entity_id:'light.test'}).template,'md_light_card');
  assert.equal(nativeConfigToDescriptor({type:'custom:marao-energy-card',entity_id:'sensor.energy'}).template,'md_energy_period_card');
  assert.equal(nativeConfigToDescriptor({type:'custom:marao-floorplan-card',variables:{lights:[]}}).template,'md_floor_plan_card');
});

test('Entity Group native forms edit membership without a primary Entity field',t=>{
  const original={type:'custom:marao-entity-group-card',template:'md_entity_group_card',id:'room-lights',name:'Room lights',entity_type:'light',entities:[{entity_id:'light.a',name:'Desk',variables:{enable_slider:false},future:[]}],summary_sections:[],grid_options:{columns:6},future:{keep:false}};
  const {editor,forms,events}=nativeFormHarness(t,original);
  const basic=forms.find(form=>form.schema.some(field=>field.name==='name'));
  assert.ok(basic);assert.equal(basic.schema.some(field=>field.name==='entity_id'),false,'Groups must not request a primary entity');
  assert.ok(forms.some(form=>form.schema.some(field=>field.name==='entity_type')));
  const members=forms.find(form=>form.schema.some(field=>field.name==='member'));
  assert.equal(members.schema[0].selector.entity.multiple,undefined);
  members.change({member:'light.b'});
  assert.equal(editor.shadowRoot.querySelector('[data-status]').textContent,'','Membership edits must validate without a primary entity');
  assert.deepEqual(events.at(-1),{...original,popup_filter:'active',entities:[original.entities[0],'light.b']});
  assert.equal(Object.hasOwn(events.at(-1),'entity_id'),false);assert.equal(Object.hasOwn(events.at(-1),'entity'),false);
  assert.ok(editor._validateDescriptor({...events.at(-1),entity_id:'light.a'}).includes('Entity Group cannot have a primary entity or page.'));
  assert.ok(editor._validateDescriptor({...events.at(-1),id:''}).includes('Entity Group requires a stable safe id.'));
  assert.equal(original.entities.length,1);
});

test('legacy entity spelling survives native form updates and active forms survive ordinary HA state updates',()=>{
  const editor=new MaraoCardEditor(),events=[],form={hass:null};
  editor.dispatchEvent=event=>{events.push(event);return true;};
  editor.setConfig({type:'custom:marao-card',template:'md_light_card',entity:'light.test',future:[]});
  editor._commitDescriptor({...nativeConfigToDescriptor(editor._config),name:'Legacy light'});
  assert.equal(events[0].detail.config.entity,'light.test');assert.ok(!Object.hasOwn(events[0].detail.config,'entity_id'));
  editor.shadowRoot={querySelectorAll:selector=>selector==='ha-form'?[form]:[]};editor._mounted=true;editor._hass={language:'en'};
  editor._render=()=>assert.fail('ordinary state updates must not remount the active native form');
  const hass={language:'en',states:{'light.test':{state:'on',attributes:{friendly_name:'Test'}}}};editor.hass=hass;
  assert.equal(form.hass,hass);
});

test('People and section drafts retain native placement and unknown member data through complete events',()=>{
  const original={type:'custom:marao-people-card',name:'Household',entities:[{entity_id:'person.alex',name:'Alex',future:{empty:[],enabled:false}},{entity_id:'person.sam',icon:'mdi:account'}],grid_options:{columns:12},visibility:[{condition:'user',users:['fixture']}],future:{retain:true}};
  const editor=new MaraoCardEditor(),events=[];editor.dispatchEvent=event=>events.push(event.detail.config);editor.setConfig(original);
  editor._commitDescriptor({...structuredClone(original),entities:[original.entities[1],{...original.entities[0],name:'Alexandra'}]});
  assert.deepEqual(events[0],{...original,entities:[original.entities[1],{...original.entities[0],name:'Alexandra'}]});
  assert.deepEqual(original.entities[0].future,{empty:[],enabled:false});
  editor._commitDescriptor({...events[0],entities:[]});assert.deepEqual(events[1].entities,[]);assert.deepEqual(events[1].grid_options,{columns:12});
});

test('optional color fields represent unset and CSS values without HTML color coercion',()=>{
  const editor=Object.create(MaraoCardEditor.prototype),entry=card('md_light_card');
  assert.deepEqual(editor._variableSchema({key:'card_color',kind:'color',label:'Card color'}).selector,{text:{autocomplete:'off'}});
  for(const value of ['', 'var(--primary-color)', '#123456']) {
    const config={type:'custom:marao-light-card',entity_id:'light.test',variables:{card_color:value}},data=nativeCardFormData(config,entry);
    assert.deepEqual(patchNativeCard(config,entry,data,{...data,name:'Desk'}),{...config,name:'Desk'});
  }
});

test('people column edits retain native data and omission on unrelated edits',()=>{
 const card={id:'md_people_card',people:true,variables:[]},source={type:'custom:marao-people-card',entities:[],opaque:{keep:true},grid_options:{columns:12}};
 const previous=nativeCardFormData(source,card);
 assert.equal(Object.hasOwn(patchNativeCard(source,card,previous,{...previous,name:'People'}),'columns'),false);
 assert.deepEqual(patchNativeCard(source,card,previous,{...previous,columns:2}),{...source,columns:2});
});

test('event membership edits preserve legacy shape, opaque fields and per-source identity',async()=>{
 const {patchEventSources}=await import('../../frontend_src/event-card-editor.js');
 const legacy={type:'custom:marao-frigate-events-card',entity:'camera.a',frigate_instance_id:'main',opaque:{keep:1},grid_options:{columns:12}};
 assert.deepEqual(patchEventSources(legacy,[{entity:'camera.a',frigate_instance_id:'main'}]),legacy);
 const next=patchEventSources(legacy,[{entity:'camera.a',frigate_instance_id:'main',future:true},{entity:'camera.b',name:'B'}]);
 assert.equal(next.entity,undefined);assert.deepEqual(next.opaque,{keep:1});assert.equal(next.cameras[0].future,true);
 assert.deepEqual(patchEventSources(next,[]).cameras,[]);assert.equal(legacy.entity,'camera.a');
});

function popupEditorFixture(t,{linked=false,external=false}={}) {
  const previous={location:globalThis.location,window:globalThis.window};t.after(()=>Object.assign(globalThis,previous));
  const opener={type:'custom:marao-entity-group-card',id:'lights',entity_type:'light',name:'Lights',entities:['light.test'],grid_options:{columns:6},opaque:{keep:[]}};
  if(external)opener.variables={popup_hash:'#saved-details'};
  if(linked&&!external)opener.popup_view='details';
  const original={title:'Keep',views:[{path:'home',sections:[{type:'grid',cards:[opener,{type:'markdown',content:'Unrelated'}]}]},{type:'sections',path:'details',sections:[],unknown:[]}]};
  if(external)original.views[0].sections.push({type:'grid',cards:[{type:'custom:marao-popup-card',hash:'#saved-details',name:'Existing layout',...(linked?{popup_view:'details'}:{}),entity_group:{id:'lights',entity_type:'light',entities:['light.test'],popup_filter:'all'},cards:[{type:'custom:marao-card',template:'md_light_card',entity:'light.test',name:'Custom member',variables:{enable_slider:false},grid_options:{columns:6},future:[]}],future:{keep:false}}]});
  if(linked)original.views[1]=createManagedView({...generatedPopupView(opener,'details','/marao-dashboard/home',{entities:[{entity_id:'light.test',name:'Desk'}]}),unknown:[]},managedDescriptor(opener));
  let saved=structuredClone(original),reads=0,closes=0,preserved=0;const writes=[],routes=[],events=[],records=new Map();
  globalThis.location={pathname:'/marao-dashboard/home'};
  globalThis.window={history:{pushState:(_state,_title,path)=>routes.push(path)},dispatchEvent:event=>events.push(event.type)};
  const hass={user:{id:'admin',is_admin:true},connected:true,language:'en',connection:{connected:true},states:{'light.test':{state:'off',attributes:{friendly_name:'Desk'}}},callService:()=>assert.fail('authoring must not operate devices'),async callWS(){reads++;return structuredClone(saved);}};
  const dialog={isEffectiveDirtyState:false,closeDialog(){closes++;return true;}};
  const root={isConnected:true,lovelace:{mode:'storage',editMode:true,config:structuredClone(original),setEditMode(value){this.editMode=value;},async saveConfig(next){writes.push(next);saved=structuredClone(next);this.config=next;}}};
  const editor=new MaraoCardEditor();editor.setConfig(opener);editor._hass=hass;editor._entities=[{entity_id:'light.test',name:'Desk'}];editor.isConnected=true;editor._lovelace=root.lovelace.config;
  editor._popupEditorContext=()=>({root,dialog});editor._moveHaptic=()=>{};editor._setStatus=message=>{editor.status=message;};
  editor._popupJournal={async read(key){return records.get(key);},async stage(key,value){preserved++;records.set(key,value);},async clear(key){records.delete(key);}};
  return {editor,hass,root,dialog,writes,routes,events,original,records,setSaved(value){saved=structuredClone(value);root.lovelace.config=structuredClone(value);editor._lovelace=root.lovelace.config;},get saved(){return saved;},get reads(){return reads;},get closes(){return closes;},get preserved(){return preserved;}};
}

test('summary cards with saved popup hashes expose Edit popup and reuse the existing source view',async t=>{
  const f=popupEditorFixture(t,{linked:true,external:true});
  const h=nativeFormHarness(t,f.original.views[0].sections[0].cards[0],{...f.hass,language:'pt'});
  h.editor._lovelace=f.original;
  MaraoCardEditor.prototype._renderPopupSelector.call(h.editor);
  const section=h.editor.shadowRoot.querySelector('[data-popup-layout]').children[0];
  assert.equal(section.children[0].textContent,'Definições do popup');
  assert.equal(section.open,false,'Popup editing starts collapsed');
  assert.equal(h.forms.some(form=>form.schema.some(field=>field.name==='popup_view')),false);
  await f.editor._editPopup();
  assert.deepEqual(f.routes,['/marao-dashboard/details?edit=1']);assert.equal(f.writes.length,0);assert.deepEqual(f.saved,f.original);
});

test('first edit of a hash-backed summary preserves the invoker and binds only its saved popup',async t=>{
  const f=popupEditorFixture(t,{external:true});await f.editor._editPopup();
  assert.equal(f.writes.length,1);assert.equal(f.preserved,1);assert.equal(f.records.size,0);
  const view=f.saved.views.at(-1),expected=structuredClone(f.original);
  expected.views[0].sections[1].cards[0].popup_view=view.path;expected.views.push(view);
  assert.deepEqual(f.saved,expected);
  const member=view.sections[0].cards.find(card=>card.type==='custom:marao-light-card');
  assert.equal(member.name,'Custom member');assert.deepEqual(member.variables,{enable_slider:false});assert.deepEqual(member.grid_options,{columns:6});assert.deepEqual(member.future,[]);
  f.editor._lovelace=f.saved;await f.editor._editPopup();assert.equal(f.writes.length,1);assert.equal(f.routes.length,2);
});

test('hash-backed summary editing refuses missing, duplicate or dirty popup sources',async t=>{
  for(const mode of ['missing','duplicate','dirty'])await t.test(mode,async t=>{
    const f=popupEditorFixture(t,{external:true});
    if(mode==='missing')f.root.lovelace.config.views[0].sections[1].cards=[];
    if(mode==='duplicate')f.root.lovelace.config.views[0].sections[1].cards.push(structuredClone(f.original.views[0].sections[1].cards[0]));
    if(mode==='dirty')f.dialog.isEffectiveDirtyState=true;
    else f.setSaved(f.root.lovelace.config);
    f.editor._lovelace=f.root.lovelace.config;await f.editor._editPopup();
    assert.match(f.editor.status,mode==='dirty'?/Save this card/:/missing or ambiguous/);
    assert.equal(f.writes.length,0);assert.equal(f.closes,0);assert.deepEqual(f.routes,[]);
  });
});

test('Edit popup opens an existing source from native edit mode without saving or device actions',async t=>{
  const f=popupEditorFixture(t,{linked:true});await f.editor._editPopup();
  assert.deepEqual(f.routes,['/marao-dashboard/details?edit=1']);assert.deepEqual(f.events,['location-changed']);
  assert.equal(f.closes,1);assert.equal(f.writes.length,0);assert.equal(f.reads,1);assert.equal(f.root.lovelace.editMode,true);assert.equal(f.editor.status,'');
});

test('first Edit popup preserves the saved owner and unrelated views, then reuses its confirmed source',async t=>{
  const f=popupEditorFixture(t);await f.editor._editPopup();
  assert.equal(f.writes.length,1);assert.equal(f.preserved,1);assert.equal(f.records.size,0);assert.equal(f.saved.views.length,3);
  const path=f.saved.views[0].sections[0].cards[0].popup_view;
  const expected=structuredClone(f.original);expected.views[0].sections[0].cards[0].popup_view=path;expected.views.push(f.saved.views[2]);
  assert.deepEqual(f.saved,expected);assert.deepEqual(f.saved.views[2].sections[0].cards.map(card=>card.type),['custom:marao-summary-actions','custom:marao-light-card']);
  assert.equal(f.saved.views[2].back_path,'/marao-dashboard/home');assert.deepEqual(f.routes,[`/marao-dashboard/${path}?edit=1`]);
  f.editor._lovelace=f.saved;await f.editor._editPopup();assert.equal(f.writes.length,1);assert.equal(f.routes.length,2);
});

test('native popup authoring preserves new/dirty card drafts and Cancel performs no work',async t=>{
  const f=popupEditorFixture(t);f.dialog.isEffectiveDirtyState=true;f.editor._hass.language='pt';
  f.editor._config={...f.editor._config,name:'Unsaved',future:{empty:[]}};const draft=structuredClone(f.editor._config);
  await f.editor._editPopup();assert.match(f.editor.status,/Guarde este cartão/);assert.deepEqual(f.editor._config,draft);
  assert.equal(f.reads,0);assert.equal(f.closes,0);assert.equal(f.writes.length,0);assert.deepEqual(f.routes,[]);
  // HA Cancel removes this editor. A new saved card editor has its original configuration.
  f.editor._lifecycle++;f.editor.setConfig(f.original.views[0].sections[0].cards[0]);f.dialog.isEffectiveDirtyState=false;
  await f.editor._editPopup();assert.equal(f.writes.length,1);assert.equal(f.saved.views[0].sections[0].cards[0].name,'Lights');
});

test('popup authoring refuses unsaved dashboards, unsupported sources, ambiguous owners and unauthorized contexts',async t=>{
  const f=popupEditorFixture(t,{linked:true}),savedConfig=structuredClone(f.root.lovelace.config);
  const blocked=async pattern=>{await f.editor._editPopup();assert.match(f.editor.status,pattern);assert.equal(f.writes.length,0);assert.equal(f.closes,0);assert.deepEqual(f.routes,[]);};
  f.root.lovelace.config.title='Unsaved dashboard';await blocked(/Save this dashboard/);f.root.lovelace.config=structuredClone(savedConfig);f.editor._lovelace=f.root.lovelace.config;
  f.hass.user.is_admin=false;await blocked(/administrator/);f.hass.user.is_admin=true;
  f.hass.connection.connected=false;await blocked(/administrator/);f.hass.connection.connected=true;
  f.saved.views[0].sections[0].cards[0].popup_view='missing';f.editor._config.popup_view='missing';f.root.lovelace.config=structuredClone(f.saved);f.editor._lovelace=f.root.lovelace.config;await blocked(/missing|ambiguous/);
  f.saved.views[0].sections[0].cards[0].popup_view='details';f.editor._config.popup_view='details';f.saved.views[1].type='masonry';f.root.lovelace.config=structuredClone(f.saved);f.editor._lovelace=f.root.lovelace.config;await blocked(/Sections/);
  f.saved.views[0].sections[0].cards.push(structuredClone(f.editor._config));f.root.lovelace.config=structuredClone(f.saved);f.editor._lovelace=f.root.lovelace.config;await blocked(/duplicated/);
  f.editor._config={type:'custom:marao-sensor-card',entity_id:'sensor.test'};await blocked(/no editable popup/);
});

test('closing or changing the native card editor during preflight cannot write or navigate later',async t=>{
  const f=popupEditorFixture(t);let finish;
  f.hass.callWS=()=>new Promise(resolve=>{finish=resolve;});const pending=f.editor._editPopup();
  f.editor._lifecycle++;finish(f.original);await pending;
  assert.match(f.editor.status,/changed/);assert.equal(f.writes.length,0);assert.equal(f.closes,0);assert.deepEqual(f.routes,[]);
});

test('native dialog dirty state and sibling runtime host are resolved without using card previews',t=>{
  const previous={location:globalThis.location,window:globalThis.window};t.after(()=>Object.assign(globalThis,previous));
  const root={localName:'hui-root'},dialog={localName:'hui-dialog-edit-card',isEffectiveDirtyState:false,closeDialog(){return true;}},editor={parentNode:dialog};
  globalThis.location={pathname:'/marao-dashboard/home'};globalThis.window={MaraoNativeBootstrap:{findHost:path=>path==='marao-dashboard'?root:null}};
  assert.deepEqual(findNativeEditorContext(editor),{root,dialog});
  assert.equal(findNativeEditorContext({parentNode:root}),undefined);
  globalThis.location.pathname='/another-dashboard/home';assert.equal(findNativeEditorContext(editor),undefined);
});

test('returning an omitted slider default preserves the literal draft and every real native field',()=>{
  const original={type:'custom:marao-light-card',entity_id:'light.a',variables:{future:null},future:{empty:[],enabled:false},tap_action:{action:'none'},grid_options:{columns:3},visibility:[],popup_view:'layout'};
  const before=structuredClone(original),entry=card("md_light_card"),data=nativeCardFormData(original,entry);
  const away=patchNativeCard(original,entry,data,{...data,var__enable_slider:false});
  const back=patchNativeCard(away,entry,nativeCardFormData(away,entry),{...nativeCardFormData(away,entry),var__enable_slider:true});
  assert.deepEqual(away,{...original,variables:{future:null,enable_slider:false}});
  assert.deepEqual(back,{...original,variables:{future:null,enable_slider:true}});
  assert.deepEqual(original,before);
});

test('room climate and related activity native fields retain unresolved choices and clear only their own option',t=>{
 const room={type:'custom:marao-room-card',name:'Room',page:'home',variables:{light_entities:[],climate_entity:'climate.unresolved',opaque:[]},grid_options:{columns:6}};
 const f=nativeFormHarness(t,room,{language:'pt',states:{}}),form=f.forms.find(form=>form.schema.some(field=>field.name==='var__climate_entity')),field=form.schema.find(field=>field.name==='var__climate_entity');assert.equal(field.label,'Climatização da divisão');assert.deepEqual(field.selector.entity.domain,['climate']);assert.equal(form.data.var__climate_entity,'climate.unresolved');
 form.change({...form.data,var__climate_entity:'climate.new'});assert.deepEqual(f.events.at(-1),{...room,variables:{...room.variables,climate_entity:'climate.new'}});form.change({...form.data,var__climate_entity:''});assert.deepEqual(f.events.at(-1).variables.light_entities,[]);assert.equal(f.events.at(-1).variables.climate_entity,undefined);
 const sensor={type:'custom:marao-sensor-card',entity_id:'sensor.temperature',variables:{activity_entities:['button.gate','binary_sensor.unresolved'],opaque:[]}};
 const g=nativeFormHarness(t,sensor),advanced=g.forms.find(form=>form.schema.some(field=>field.name==='var__activity_entities')),sources=advanced.schema.find(field=>field.name==='var__activity_entities');assert.equal(sources.selector.entity.multiple,true);advanced.change({...advanced.data,var__activity_entities:[]});assert.deepEqual(g.events.at(-1),{...sensor,variables:{...sensor.variables,activity_entities:[]}});
});

test('glance label visibility defaults on and preserves names and native options across edits',t=>{
 const original={type:'custom:marao-glance-card',name:'Summary',variables:{entity1:'sensor.a',entity1_name:'Temperature',entity3:'sensor.b',future:{keep:[]}},grid_options:{columns:12},future:false};
 const {forms,events,editor}=nativeFormHarness(t,original,{language:'pt',states:{}}),form=forms.find(form=>form.schema.some(field=>field.name==='var__show_reading_names'));
 const field=form.schema.find(field=>field.name==='var__show_reading_names');assert.equal(field.label,'Mostrar nomes das leituras');assert.deepEqual(field.selector,{boolean:{}});assert.equal(form.data.var__show_reading_names,true);assert.equal(events.length,0);
 form.change({...form.data,var__show_reading_names:false});assert.deepEqual(events.at(-1),{...original,variables:{...original.variables,show_reading_names:false}});
 form.change({...form.data,var__show_reading_names:true});assert.equal(events.at(-1).variables.entity1_name,'Temperature');assert.equal(events.at(-1).variables.show_reading_names,true);
 const count=events.length;form.change({...form.data,var__show_reading_names:'false'});assert.equal(events.length,count);assert.match(editor.shadowRoot.querySelector('[data-status]').textContent,/booleano/);
});

test('climate humidity clearing and popup edits preserve authored layout and unknown options',()=>{
  const entry=card('md_climate_card'),source={type:'custom:marao-climate-card',entity:'climate.safe',popup_view:'details',variables:{humidity_entity:'sensor.missing',enable_popup:false,show_mode_buttons:false,future:[]},grid_options:{columns:9,rows:7},tap_action:{action:'none'},future:{keep:false}};
  const data=nativeCardFormData(source,entry),next=patchNativeCard(source,entry,data,{...data,var__humidity_entity:'',var__enable_popup:true});
  const expected=structuredClone(source);delete expected.variables.humidity_entity;expected.variables.enable_popup=true;assert.deepEqual(next,expected);assert.equal(source.variables.humidity_entity,'sensor.missing');
});

import {PopupInline} from '../../frontend_src/popup-content-editor.js';
const customContent=()=>({version:1,mode:'custom',layout:{type:'sections',max_columns:1,sections:[{type:'grid',unknown:false,cards:[{type:'markdown',content:'Original',opaque:{keep:[]}}]},{type:'grid',cards:[]}]}});
function popupHarness(t){
  const original={type:'custom:marao-camera-card',entity_id:'camera.safe',opaque:false,popup_content:customContent()},f=nativeFormHarness(t,original),create=globalThis.document.createElement;
  globalThis.document.createElement=tag=>Object.assign(create(),{localName:tag,setAttribute(){},remove(){this.removed=true;},async showDialog(params){this.params=params;}});
  const controller=Object.create(PopupInline.prototype);
  Object.assign(controller,{panel:f.editor,content:structuredClone(original.popup_content),host:document.createElement('div'),error:{textContent:''},disposed:false,editable:true,revision:0,dialogs:new Set(),pickers:new WeakMap(),subscriptions:new Set(),events:new AbortController(),isolate(){},update(){this.content=this.panel._config.popup_content;}});
  controller.view={lovelace:{config:{views:[structuredClone(original.popup_content.layout)]}},remove(){}};
  f.editor._popupInline=controller;
  return {...f,controller,original};
}
const nativeRequest=(tag,params,dialogImport=async()=>{})=>({detail:{dialogTag:tag,dialogParams:params,dialogImport},stopImmediatePropagation(){this.stopped=true;}});

test('native popup callbacks update only the complete parent draft and preserve opaque content',t=>{
  const f=popupHarness(t),layout=structuredClone(f.original.popup_content.layout);
  layout.sections[1].cards.push(layout.sections[0].cards.pop());f.controller.saveDocument({views:[layout]});
  const expected={...f.original,popup_content:{...f.original.popup_content,layout}};
  assert.deepEqual(f.events.at(-1),expected);assert.deepEqual(f.original.popup_content,customContent());
  assert.throws(()=>f.controller.saveDocument({views:[layout,layout]}),/invalid/);assert.deepEqual(f.editor._config,expected);
});

test('native section Save is redirected to the popup owner instead of a dashboard save callback',async t=>{
  const f=popupHarness(t),request=nativeRequest('hui-dialog-edit-section',{viewIndex:0,sectionIndex:0,lovelace:{saveConfig(){assert.fail('real dashboard');}},lovelaceConfig:{views:[]},saveConfig(){assert.fail('original save callback');}});
  await f.controller.openDialog(request);const dialog=[...f.controller.dialogs][0];
  assert.equal(request.stopped,true);assert.equal(dialog.localName,'hui-dialog-edit-section');assert.equal(dialog.params.lovelace,f.controller.view.lovelace);
  const layout=structuredClone(f.original.popup_content.layout);layout.sections[0].column_span=2;layout.sections[0].visibility=[{condition:'state',entity:'input_boolean.safe',state:'on'}];
  await dialog.params.saveConfig({views:[layout]});
  assert.deepEqual(f.editor._config,{...f.original,popup_content:{...f.original.popup_content,layout}});
});

test('native child Save preserves later parent edits and native Cancel discards an unaccepted child',async t=>{
  const f=popupHarness(t);
  const saveCardConfig=async card=>{const layout=structuredClone(f.editor._config.popup_content.layout);layout.sections[0].cards[0]=card;f.controller.saveDocument({views:[layout]});};
  await f.controller.openDialog(nativeRequest('hui-dialog-edit-card',{cardConfig:{type:'markdown',content:'Original'},lovelaceConfig:{views:[]},saveCardConfig}));
  const first=[...f.controller.dialogs][0];first.dispatchEvent(new CustomEvent('dialog-closed',{detail:{dialog:'hui-dialog-edit-card'}}));
  assert.equal(first.removed,true);assert.equal(f.controller.dialogs.size,0);assert.deepEqual(f.editor._config,f.original);
  await f.controller.openDialog(nativeRequest('hui-dialog-edit-card',{saveCardConfig}));const second=[...f.controller.dialogs][0];
  f.editor._commitDescriptor({...f.editor._config,name:'Latest parent'});
  await second.params.saveCardConfig({type:'markdown',content:'Native child edit',opaque:{keep:[]}});
  const expected=structuredClone(f.original);expected.name='Latest parent';expected.popup_content.layout.sections[0].cards[0].content='Native child edit';
  assert.deepEqual(f.editor._config,expected);
});

test('nested native lifecycle and configuration events cannot escape into the parent card dialog',async t=>{
  const f=popupHarness(t);await f.controller.openDialog(nativeRequest('hui-dialog-edit-card',{}));const dialog=[...f.controller.dialogs][0];
  for(const name of ['closed','config-changed','GUImode-changed','editor-save']){let stopped=0;const event=new Event(name);event.stopPropagation=()=>stopped++;dialog.dispatchEvent(event);assert.equal(stopped,1,name);}
  assert.deepEqual(f.editor._config,f.original);assert.equal(f.controller.dialogs.size,1);
});

test('repeated native edit requests open one child dialog during loading and while already open',async t=>{
  const f=popupHarness(t);let finish,loads=0;const load=()=>{loads++;return new Promise(resolve=>{finish=resolve;});};
  const first=f.controller.openDialog(nativeRequest('hui-dialog-edit-card',{},load));
  const second=f.controller.openDialog(nativeRequest('hui-dialog-edit-card',{},load));
  assert.equal(loads,1);finish();await Promise.all([first,second]);assert.equal(f.controller.dialogs.size,1);
  await f.controller.openDialog(nativeRequest('hui-dialog-edit-card',{},load));assert.equal(loads,1);assert.equal(f.controller.dialogs.size,1);assert.deepEqual(f.editor._config,f.original);
});

test('popup selectors keep their native dialogs and canvas close events stay inside the popup boundary',t=>{
  const f=popupHarness(t),host=document.createElement('div'),controller=new PopupInline(f.editor,host),requests=[];controller.openDialog=event=>requests.push(event.detail);
  const selector=new CustomEvent('show-dialog',{detail:{dialogTag:'ha-generic-picker-dialog'}});selector.composedPath=()=>[host];host.dispatchEvent(selector);assert.equal(requests.length,0);
  const canvas=new CustomEvent('show-dialog',{detail:{dialogTag:'hui-dialog-edit-card'}});canvas.composedPath=()=>[controller.canvas,host];host.dispatchEvent(canvas);assert.equal(requests.length,1);
  let stopped=0;const closed=new Event('closed');closed.stopPropagation=()=>stopped++;host.dispatchEvent(closed);assert.equal(stopped,1);controller.dispose();
});

function popupCanvasHarness(t){
  const f=popupHarness(t),previous={MutationObserver:globalThis.MutationObserver,customElements:globalThis.customElements,location:globalThis.location};
  t.after(()=>Object.assign(globalThis,previous));
  globalThis.MutationObserver=class{observe(){}disconnect(){}};
  globalThis.customElements={get:()=>undefined};globalThis.location={pathname:'/marao-dashboard/overview'};
  const create=document.createElement;document.createElement=tag=>{const node=create(tag);node.style.setProperty=()=>{};return node;};
  const controller=new PopupInline(f.editor,document.createElement('div'));f.editor._popupInline=controller;
  f.editor._moveHaptic=()=>{};t.after(()=>controller.dispose());
  return {...f,controller};
}

test('popup settings contain one filtered dropdown and an always-editable native canvas',t=>{
  const f=popupCanvasHarness(t),{controller}=f;const start=f.forms.length;controller.update();
  const forms=f.forms.slice(start);assert.equal(forms.length,1);assert.deepEqual(forms[0].schema.map(field=>field.name),['template']);
  assert.deepEqual(forms[0].schema[0].selector.select.options.map(option=>option.value),['camera','empty','custom']);
  assert.equal(forms[0].data.template,'custom');assert.equal(controller.canvas.inert,false);assert.equal(controller.view.lovelace.editMode,true);
  assert.equal(controller.controls.children.length,1);assert.equal(controller.tools.children.length,0);assert.deepEqual(f.editor._config,f.original);
});

test('template selection uses parent entities, and only actual manual changes show Custom',async t=>{
  const f=popupCanvasHarness(t),{controller}=f;controller.update();controller.templateForm.change({template:'camera'});
  const expected=structuredClone(f.editor._config),layout=structuredClone(expected.popup_content.layout);
  assert.equal(controller.templateForm.data.template,'camera');assert.equal(controller.view.lovelace.editMode,true);
  assert.ok(JSON.stringify(layout).includes('camera.safe'));const count=f.events.length;
  controller.saveDocument({views:[structuredClone(layout)]});assert.equal(f.events.length,count);assert.equal(controller.templateForm.data.template,'camera');
  controller.templateForm.change({template:'camera'});assert.equal(f.events.length,count);
  const edited=structuredClone(layout);edited.sections[0].cards[0].name='Manual name';
  await controller.view.lovelace.saveConfig({views:[edited]});assert.equal(controller.templateForm.data.template,'custom');
  assert.equal(f.editor._config.popup_content.template,'camera','origin metadata cannot falsely determine the displayed template');
  controller.saveDocument({views:[layout]});assert.equal(controller.templateForm.data.template,'camera');assert.deepEqual(f.editor._config,expected);
  const saved=structuredClone(f.editor._config);controller.templateKey=null;controller.update();assert.equal(controller.templateForm.data.template,'camera');assert.deepEqual(f.editor._config,saved);
  controller.templateForm.change({template:'empty'});assert.equal(controller.templateForm.data.template,'empty');
  assert.deepEqual(f.editor._config.popup_content.layout,{type:'sections',max_columns:1,sections:[]});assert.equal(controller.view.lovelace.editMode,true);
});

test('automatic and shared popups stay unchanged until a real canvas edit creates a private snapshot',t=>{
  const f=popupCanvasHarness(t),{controller}=f;
  const source={type:'sections',path:'details',title:'Existing popup',max_columns:1,sections:[{type:'grid',opaque:false,cards:[{type:'markdown',content:'Keep me',visibility:[],opaque:{keep:[]}}]}]};
  const dashboard={views:[source,{type:'sections',path:'other',sections:[]}]},before=structuredClone(dashboard);
  const original={type:'custom:marao-camera-card',entity_id:'camera.safe',name:'Latest parent',popup_view:'details',opaque:false};
  f.editor._lovelace={config:dashboard};f.editor._commitDescriptor(original);f.events.length=0;controller.update();
  assert.equal(controller.view.lovelace.editMode,true);assert.equal(f.events.length,0);assert.deepEqual(f.editor._config,original);
  controller.saveDocument({views:[structuredClone(controller.content.layout)]});assert.equal(f.events.length,0);
  const layout={type:'sections',title:'Existing popup',max_columns:1,sections:[{type:'grid',opaque:false,cards:[{type:'markdown',content:'Manual change',visibility:[],opaque:{keep:[]}}]}]};
  controller.saveDocument({views:[layout]});
  assert.deepEqual(f.editor._config,{...original,popup_content:{version:1,mode:'custom',layout}});assert.deepEqual(dashboard,before);
  assert.equal(controller.templateForm.data.template,'custom');
});

test('automatic popup child dialogs work before content exists and parent target changes never retarget custom children',async t=>{
  const f=popupCanvasHarness(t),{controller}=f,original={type:'custom:marao-climate-card',entity_id:'climate.safe',name:'Climate'};
  f.editor._commitDescriptor(original);f.events.length=0;controller.update();
  assert.equal(controller.templateForm.data.template,'climate');assert.equal(controller.view.lovelace.editMode,true);assert.equal(f.events.length,0);
  await controller.openDialog(nativeRequest('hui-dialog-edit-section',{saveConfig(){assert.fail('dashboard writes are forbidden');}}));
  const dialog=[...controller.dialogs][0],layout=structuredClone(controller.content.layout);layout.sections[0].column_span=2;
  await dialog.params.saveConfig({views:[layout]});assert.deepEqual(f.editor._config,{...original,popup_content:{version:1,mode:'custom',layout}});
  assert.equal(controller.templateForm.data.template,'custom');
  controller.templateForm.change({template:'climate'});const saved=structuredClone(f.editor._config.popup_content);
  f.editor._commitDescriptor({...f.editor._config,entity_id:'climate.other'});controller.update();
  assert.deepEqual(f.editor._config.popup_content,saved);assert.equal(controller.templateForm.data.template,'custom');
  f.editor._commitDescriptor({...f.editor._config,entity_id:'climate.safe'});controller.update();assert.equal(controller.templateForm.data.template,'climate');
});

test('unsupported sources and unavailable template inputs retain the current draft with readable errors',t=>{
  const f=popupCanvasHarness(t),{controller}=f,original={type:'custom:marao-camera-card',entity_id:'camera.safe',popup_view:'missing',opaque:false};
  f.editor._lovelace={config:{views:[]}};f.editor._commitDescriptor(original);f.events.length=0;controller.update();
  assert.equal(controller.editable,false);assert.deepEqual(f.editor._config,original);assert.ok(controller.error.textContent);
  controller.templateForm.change({template:'empty'});assert.equal(controller.view.lovelace.editMode,true);assert.equal(controller.templateForm.data.template,'empty');
  const current=structuredClone(f.editor._config),picker=controller.templateForm;picker.change({template:'climate'});
  assert.deepEqual(f.editor._config,current);assert.ok(controller.error.textContent);assert.equal(picker.data.template,'empty');
});

test('removed presentation fields stay absent and manual layout edits preserve saved opaque presentation',t=>{
  const f=popupCanvasHarness(t),{controller}=f,original={...f.original,popup_content:{...f.original.popup_content,presentation:{height:'82vh',max_height:'90vh',opaque:false}}};
  f.editor._commitDescriptor(original);const start=f.forms.length;controller.update();
  assert.deepEqual(f.forms.slice(start).flatMap(form=>form.schema.map(field=>field.name)),['template']);
  const layout=structuredClone(original.popup_content.layout);layout.sections[1].cards.push({type:'markdown',content:'New'});controller.saveDocument({views:[layout]});
  assert.deepEqual(f.editor._config,{...original,popup_content:{...original.popup_content,layout}});
});

test('stale native saves and pending dialog loads cannot replace a newer popup or outlive Cancel',async t=>{
  const f=popupHarness(t);await f.controller.openDialog(nativeRequest('hui-dialog-edit-section',{saveConfig(){}}));const dialog=[...f.controller.dialogs][0];
  const current=structuredClone(f.editor._config);current.popup_content.layout.sections=[];f.editor._commitDescriptor(current);
  await assert.rejects(dialog.params.saveConfig({views:[customContent().layout]}),/changed/);assert.deepEqual(f.editor._config,current);
  let finish;const pending=f.controller.openDialog(nativeRequest('hui-dialog-edit-card',{},()=>new Promise(resolve=>{finish=resolve;})));
  f.controller.dispose();finish();await pending;assert.equal(f.controller.dialogs.size,0);assert.equal(dialog.removed,true);assert.deepEqual(f.editor._config,current);
});

test('native picker keeps every card while suggesting public Marao cards first',()=>{
  const marao={card:{type:'marao-climate-card',isCustom:true}},core={card:{type:'tile'}},other={card:{type:'other-custom',isCustom:true}};
  const picker={localName:'hui-card-picker',children:[],_cards:[core,other,marao],_suggestedCards:[core]};
  const controller=Object.create(PopupInline.prototype);Object.assign(controller,{host:{children:[picker]},pickers:new WeakMap()});
  PopupInline.prototype.isolate.call(controller);assert.deepEqual(picker._cards,[core,other,marao]);assert.deepEqual(picker._suggestedCards,[marao,core]);
  PopupInline.prototype.isolate.call(controller);assert.deepEqual(picker._suggestedCards,[marao,core]);
});

test('native sortable option refreshes retain popup-local groups and native touch options',()=>{
  const sortable={localName:'ha-sortable',dataset:{},group:'card',options:{group:'card',delay:100,delayOnTouchOnly:true},children:[]};
  const controller=Object.create(PopupInline.prototype);Object.assign(controller,{group:'private-popup',host:{children:[sortable]},pickers:new WeakMap()});
  controller.isolate();assert.deepEqual(sortable.options,{group:'private-popup-card',delay:100,delayOnTouchOnly:true});
  sortable.options={group:{name:'card',pull:true,put:true},delay:100};controller.isolate();assert.deepEqual(sortable.options,{group:{name:'private-popup-card',pull:true,put:true},delay:100});
});

test('equivalent dashboard context echoes do not remount the parent or close native popup dialogs',t=>{
  const f=nativeFormHarness(t,{type:'custom:marao-climate-card',entity_id:'climate.safe'});let renders=0,updates=0;
  f.editor._render=()=>renders++;f.editor._renderPopupSelector=()=>updates++;
  const context={views:[{path:'home'},{path:'other'}]};f.editor.lovelace=context;renders=0;updates=0;f.editor.lovelace=structuredClone(context);
  assert.equal(renders,0);assert.equal(updates,1);assert.deepEqual(f.editor._availablePages().map(page=>page.path),['home','other']);
});

test('draft-owned native child editors cannot start legacy source-view persistence',t=>{
  const previous={location:globalThis.location,window:globalThis.window};t.after(()=>Object.assign(globalThis,previous));
  globalThis.location={pathname:'/marao-dashboard/home'};globalThis.window={MaraoNativeBootstrap:{findHost:()=>({localName:'hui-root'})}};
  const dialog={localName:'hui-dialog-edit-card',_maraoPopupDraftOwner:{},isEffectiveDirtyState:false,closeDialog(){}};
  assert.equal(findNativeEditorContext({parentNode:dialog}),undefined);
});

test('native appearance and HA action selectors save complete independent drafts',t=>{
  const original={type:'custom:marao-switch-card',entity:'switch.safe',show_name:false,variables:{custom_label:'Power ',future:[]},tap_action:{action:'none'},styles:{card:[{padding:'4px'}]},future:{raw:[]}};
  const f=nativeFormHarness(t,original),advanced=f.forms.find(form=>form.schema.some(field=>field.name==='tap_action'));
  assert.deepEqual(advanced.schema.find(field=>field.name==='tap_action').selector,{ui_action:{}});
  const action={action:'perform-action',perform_action:'switch.turn_off',target:{entity_id:'switch.safe'},data:{future:false}};
  advanced.change({...advanced.data,show_name:true,tap_action:action,var__custom_label:'Desk '});
  assert.deepEqual(f.events.at(-1),{...original,show_name:true,tap_action:action,variables:{custom_label:'Desk ',future:[]}});
  assert.equal(original.show_name,false);assert.equal(original.tap_action.action,'none');
  const alias={type:'custom:marao-card',template:'md_light_card',entity:'light.safe',variables:{show_icon:false,future:[]}};
  const data=nativeCardFormData(alias,card('md_light_card'));assert.equal(data.show_icon,false);
  assert.deepEqual(patchNativeCard(alias,card('md_light_card'),data,{...data,show_icon:true}),{...alias,variables:{show_icon:true,future:[]}});
});

test('legacy detail editors retain the saved field locations and expose only effective controls',t=>{
  const energy={type:'custom:marao-energy-period-card',entity:'sensor.safe',period:'month',display_precision:2,popup:true,future:[]};
  const f=nativeFormHarness(t,energy),period=f.forms.find(form=>form.schema.some(field=>field.name==='var__period'));
  assert.equal(period.data.var__period,'month');period.change({...period.data,var__period:'day'});
  assert.deepEqual(f.events.at(-1),{...energy,period:'day'});
  const power={type:'custom:marao-power-history-card',entity:'sensor.safe',power_devices:[],display_unit:'W',future:false};
  const p=nativeFormHarness(t,power),precision=p.forms.find(form=>form.schema.some(field=>field.name==='var__display_precision'));
  assert.ok(!p.forms.flatMap(form=>form.schema).some(field=>['tap_action','show_name','var__history_popup'].includes(field.name)));
  precision.change({...precision.data,var__display_precision:3});assert.deepEqual(p.events.at(-1),{...power,display_precision:3});
  const timeline=nativeFormHarness(t,{type:'custom:marao-state-timeline-card',entity:'lock.safe',name:'Door'});
  assert.ok(!timeline.forms.flatMap(form=>form.schema).some(field=>field.name==='var__timeline_name'));
});

test('legacy access aliases remain editable without relaxing explicit access validation',t=>{
  for(const [template,service]of [['md_access_action_card','lock.unlock'],['md_access_hold_action_card','lock.lock']]){
    const original={type:'custom:marao-card',template,entity:'lock.safe',variables:{action_service:service},future:[]};
    const f=nativeFormHarness(t,original),basic=f.forms.find(form=>form.schema.some(field=>field.name==='name'));
    basic.change({...basic.data,name:'Door'});assert.deepEqual(f.events.at(-1),{...original,name:'Door'});
    assert.ok(!f.forms.flatMap(form=>form.schema).some(field=>field.name==='tap_action'));
  }
  const f=nativeFormHarness(t,{type:'custom:marao-access-action-card',entity_id:'lock.safe',variables:{access_mode:'close',action_service:'lock.unlock'}});
  const basic=f.forms.find(form=>form.schema.some(field=>field.name==='name'));basic.change({...basic.data,name:'Unsafe'});
  assert.equal(f.events.length,0);assert.match(f.editor.shadowRoot.querySelector('[data-status]').textContent,/opener slide/);
});

test('popup group actions and legacy popup headers use native forms without dropping opaque settings',t=>{
  const action={type:'custom:marao-summary-actions',popup_scope:'embedded',scope:'all',entity_type:'light',grid_options:{columns:12},future:[]};
  const f=nativeFormHarness(t,action);f.forms[0].change({...f.forms[0].data,scope:'section'});
  assert.deepEqual(f.events.at(-1),{...action,scope:'section'});
  const popup={type:'custom:marao-popup-card',hash:'#safe',cards:[{type:'markdown',content:'Kept'}],future:false};
  const p=nativeFormHarness(t,popup);p.forms[0].change({...p.forms[0].data,name:'Details'});assert.deepEqual(p.events.at(-1),{...popup,name:'Details'});
});

test('native grid editing retains group order, content, unknown options and raw-card ownership',async()=>{
  const {controlGridEditorValue,patchControlGrid}=await import('../../frontend_src/native-card-editor.js');
  const a={type:'custom:marao-light-card',entity_id:'light.a',future:[]},b={type:'markdown',content:'Kept'},c={type:'custom:marao-card',template:'md_sensor_card',entity:'sensor.safe'};
  const original={type:'custom:marao-control-grid',columns:2,cards:[a,b,c],groups:[{columns:1,count:1,future:false},{columns:2,count:2,future:[]}],native_cards:[2],future:{keep:[]}};
  const native=controlGridEditorValue(original);
  assert.deepEqual(JSON.parse(JSON.stringify(native)),{type:'vertical-stack',cards:[{type:'grid',square:false,columns:1,cards:[a]},{type:'grid',square:false,columns:2,cards:[b,c]}]});
  assert.deepEqual(Object.keys(native.cards[0]).sort(),['cards','columns','square','type']);
  assert.deepEqual(patchControlGrid(original,structuredClone(native)),original);
  assert.deepEqual(patchControlGrid(original,native),original);
  const edited=structuredClone(native);edited.cards[0].cards[0].name='Changed';assert.deepEqual(patchControlGrid(original,edited),{...original,cards:[{...a,name:'Changed'},b,c]});
  native.cards.reverse();assert.deepEqual(patchControlGrid(original,native),{...original,cards:[b,c,a],groups:[original.groups[1],original.groups[0]],native_cards:[1]});
  assert.deepEqual(original.cards,[a,b,c]);
  const invalid=structuredClone(native);invalid.cards[0].cards.pop();assert.throws(()=>patchControlGrid(original,invalid),/identity is ambiguous|raw cards/);
});

test('every gallery card is reproducible through its native editor or dedicated visual editor',async t=>{
  const {createRequire}=await import('node:module'),require=createRequire(import.meta.url),YAML=require('yaml');
  const {expandGallery,walkCards}=require('../../ha-test/cases.js');
  const {nativeCardType}=await import('../../frontend_src/card-composition.js');
  const {controlGridEditorValue,patchControlGrid}=await import('../../frontend_src/native-card-editor.js');
  const gallery=expandGallery(YAML.parse(fs.readFileSync(new URL('../../ha-test/dashboard/views/00-card-test.yaml',import.meta.url),'utf8')));
  let checked=0;
  walkCards(gallery,saved=>{
    const original=JSON.parse(JSON.stringify(saved));
    if(!original.type&&nativeCardType(original.template))original.type=nativeCardType(original.template);
    if(!original.type?.startsWith('custom:marao-'))return;
    if(original.template==='md_floor_plan_card')return; // The dedicated placement editor is covered in floor-plan.test.js.
    checked++;
    if(original.type==='custom:marao-control-grid'){assert.deepEqual(patchControlGrid(original,controlGridEditorValue(original)),original);return;}
    const {editor,forms,events}=nativeFormHarness(t,original);
    if(original.type==='custom:marao-summary-actions'){
      const form=forms.find(form=>form.schema.some(field=>field.name==='scope')),scope=original.scope==='all'?'section':'all';
      assert.ok(form);form.change({...form.data,scope});assert.deepEqual(events.at(-1),{...original,scope});return;
    }
    const form=forms.find(form=>form.schema.some(field=>['name','title'].includes(field.name)));
    assert.ok(form,original.type+' '+original.template+' has native settings');
    const key=form.schema.some(field=>field.name==='name')?'name':'title',expected={...original,[key]:'Edited gallery example'};
    if(key==='name')delete expected.name_key;
    let data={...form.data,[key]:expected[key]};
    if(original.template==='md_light_card'&&original.entity?.startsWith('sensor.marao_dashboard_test_')){
      expected.entity=original.entity.endsWith('_unknown')?'light.marao_dashboard_test_case_light_unknown':'light.marao_dashboard_test_case_light_unavailable';
      data={...data,entity_id:expected.entity};
    }
    form.change(data);
    assert.equal(editor.shadowRoot.querySelector('[data-status]').textContent,'',original.name||original.template||original.type);
    assert.deepEqual(events.at(-1),expected,original.name||original.template||original.type);
  });
  assert.ok(checked>500,'Exercise the complete gallery, not just picker stubs');
});

test('native grid child events reach only the outer draft and invalid YAML retains the last valid config',async t=>{
  const saved=new Map(['customElements','location'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  t.after(()=>{for(const [key,value]of saved)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];});
  globalThis.customElements={get:()=>true};globalThis.location={pathname:'/marao-dashboard/home',origin:'http://192.168.0.28:8123'};
  const original={type:'custom:marao-control-grid',cards:[{type:'markdown',content:'Kept'}],future:[]};
  const f=nativeFormHarness(t,original),host=f.editor.shadowRoot.querySelector('[data-fields]'),events=[];host.isConnected=true;
  f.editor.dispatchEvent=event=>events.push(event.detail);await new Promise(resolve=>setImmediate(resolve));
  const child=host.children[0];assert.equal(child.value.type,'grid');assert.equal(child.value.columns,2);
  child.dispatchEvent(new CustomEvent('config-changed',{detail:{config:child.value,error:'Invalid YAML'}}));
  assert.deepEqual(events.at(-1),{config:original,error:'Invalid YAML'});assert.deepEqual(f.editor._config,original);
  child.dispatchEvent(new CustomEvent('config-changed',{detail:{config:child.value}}));assert.deepEqual(events.at(-1),{config:original});
  child.dispatchEvent(new CustomEvent('config-changed',{detail:{config:{...child.value,columns:3}}}));
  assert.deepEqual(events.at(-1).config,{...original,columns:3});assert.deepEqual(original.cards,[{type:'markdown',content:'Kept'}]);
});

test('popup settings refresh immediately when native history or energy presentation changes',t=>{
  for(const [config,key,value]of [[{type:'custom:marao-graph-card',entity_id:'sensor.safe'},'var__history_popup',true],[{type:'custom:marao-energy-card',entity_id:'sensor.safe'},'popup',true]]){
    const f=nativeFormHarness(t,config);let renders=0;const render=f.editor._render.bind(f.editor);f.editor._render=()=>{renders++;render();};
    const form=f.forms.find(form=>form.schema.some(field=>field.name===key));form.change({...form.data,[key]:value});
    assert.equal(renders,1);assert.equal(f.editor._config[key]??f.editor._config.variables?.history_popup,value);
  }
});

test('native grid editors wait for connection when returning from YAML to visual mode',async t=>{
  const saved=new Map(['customElements','location'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  t.after(()=>{for(const [key,value]of saved)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];});
  globalThis.customElements={get:()=>true};globalThis.location={pathname:'/marao-dashboard/home',origin:'http://192.168.0.28:8123'};
  const original={type:'custom:marao-control-grid',cards:[{type:'markdown',content:'Kept'}],future:[]};
  const f=nativeFormHarness(t,original),host=f.editor.shadowRoot.querySelector('[data-fields]');
  f.editor.isConnected=false;host.isConnected=false;f.editor._render();
  assert.equal(f.editor._mounted,false);await new Promise(resolve=>setImmediate(resolve));assert.equal(host.children.length,0);
  f.editor.isConnected=true;host.isConnected=true;f.editor.connectedCallback();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(host.children[0].value.type,'grid');assert.deepEqual(f.editor._config,original);
});

test('closing a nested settings dialog cannot close the native outer card editor',t=>{
  const f=nativeFormHarness(t,{type:'custom:marao-media-card',entity_id:'media_player.safe'}),create=globalThis.document.createElement;
  globalThis.document.createElement=()=>{const node=create();node.remove=()=>{node.removed=true;};return node;};
  f.editor.isConnected=true;f.editor._containForm=async()=>{};let localClosed=0,restored=0;f.editor._focusWithoutScroll=()=>{restored++;};
  const dialog=f.editor._dialog('Settings');dialog.addEventListener('closed',()=>{localClosed++;});
  const event=new Event('closed',{bubbles:true,composed:true});dialog.dispatchEvent(event);
  assert.equal(event.cancelBubble,true);assert.equal(dialog.removed,true);assert.equal(localClosed,1);assert.equal(restored,1);
  assert.deepEqual(f.editor._config,{type:'custom:marao-media-card',entity_id:'media_player.safe'});
});

test('native configuration text fields disable personal autofill through the HA selector API',t=>{
  const f=nativeFormHarness(t,{type:'custom:marao-light-card',entity_id:'light.safe'});
  assert.equal(f.forms[0].schema.find(field=>field.name==='name').selector.text.autocomplete,'off');
  const selector={text:{autocomplete:'new-password',type:'password'}};
  assert.deepEqual(f.editor._schema('secret','Secret',selector).selector,selector);
  assert.deepEqual(selector,{text:{autocomplete:'new-password',type:'password'}});
});
