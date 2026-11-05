import test from 'node:test';
import assert from 'node:assert/strict';
import {plexURI,plexReference,plexConfigError,plexTarget,plexTargets,plexHome,browsePlex,plexBrowseEntity,plexServerRoots,rivuletLink,cleanPlexNode,plexImagePath,plexError,PlexLaunch} from '../../custom_components/marao_dashboard/frontend/MaraoPlexModel.js';
import {composeNativeCard,validateNativeCardConfig} from '../../frontend_src/card-composition.js';
import {nativeCardGridOptions} from '../../frontend_src/native-cards.js';
import {patchNativeCard,nativeCardFormData} from '../../frontend_src/native-card-editor.js';
import {catalog} from '../../frontend_src/native-model.js';

const root={media_content_id:'plex://safe-server/server',media_content_type:'server'};
const mapping=()=>({client_entity:'media_player.plex_safe',scan_clients_entity:'button.plex_scan',app_source:'Plex',library_root:{...root},future:{keep:[]}});
const parent=()=>({type:'custom:marao-media-card',entity_id:'media_player.safe',name:'Living Room',apple_tv:{remote_entity:'remote.safe',apps:[],plex:mapping()},future:false});
const item=(id='42?resume=1')=>({media_content_id:`plex://safe-server/${id}`,media_content_type:'episode',title:'Fictional episode',can_play:true,can_expand:false});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const rivulet=()=>({playback_app:'rivulet',library_root:{...root},future:{keep:[]}});

test('Rivulet configuration needs no Plex playback mapping and preserves unrelated or inactive Plex options',()=>{
  const source={...parent(),apple_tv:{...parent().apple_tv,plex:rivulet()}},before=structuredClone(source);
  validateNativeCardConfig(source);assert.ok(plexTarget(source));
  const card=catalog.cards.find(card=>card.id==='md_media_card'),data=nativeCardFormData(source,card);
  assert.deepEqual(patchNativeCard(source,card,data,{...data,name:'Changed'}),{...source,name:'Changed'});
  assert.deepEqual(source,before);
  assert.equal(plexConfigError({...rivulet(),client_entity:'unresolved-old-plex-choice'},source),'');
  assert.ok(plexConfigError({...rivulet(),playback_app:'other'},source));
  assert.ok(plexConfigError({...rivulet(),browse_entity:'remote.wrong'},source));
  assert.ok(plexConfigError({...rivulet(),browse_entity:'media_player.other'},source,[{entity_id:'media_player.other',platform:'plex',unique_id:'another-server:client'}]));
  assert.ok(plexConfigError({...rivulet(),playback_app:'plex'},source));
});

test('Rivulet browsing discovers only an enabled Plex entity for its configured server and never actuates it',async()=>{
  const calls=[],rows=[{entity_id:'media_player.other',platform:'plex',unique_id:'other-server:client'},
    {entity_id:'media_player.disabled',platform:'plex',unique_id:'safe-server:client',disabled_by:'user'},
    {entity_id:'media_player.rivulet',platform:'plex',unique_id:'safe-server:rivulet'},
    {entity_id:'media_player.unrelated',platform:'apple_tv',unique_id:'safe-server:tv'}];
  const hass={callWS:async command=>{calls.push(command);if(command.type==='config/entity_registry/list')return rows;
    if(command.type==='config/device_registry/list')return[{name:'Fictional server',identifiers:[['plex','safe-server']]},{name:'Rivulet client',via_device_id:'server-device',identifiers:[['plex','client-uuid-without-colon']]},{identifiers:[['plex','safe-server:client'],['other','unrelated']]}];return{...root,children:[item()]};},callService:()=>assert.fail('read-only browsing'),states:{'media_player.rivulet':{state:'unavailable'}}};
  assert.equal(await plexBrowseEntity(hass,rivulet(),'safe-server'),'media_player.rivulet');
  assert.equal((await browsePlex(hass,await plexBrowseEntity(hass,rivulet(),'safe-server'),root,'safe-server')).children[0].media_content_id,item().media_content_id);
  assert.deepEqual(await plexServerRoots(hass),[{title:'Fictional server',...root,can_expand:true}]);
  await assert.rejects(plexBrowseEntity({...hass,callWS:async()=>rows.slice(0,2)},rivulet(),'safe-server'),/Play a title in Rivulet once/);
  assert.equal(await plexBrowseEntity(hass,{...rivulet(),browse_entity:'media_player.explicit'},'safe-server'),'media_player.explicit');
  assert.equal(calls.some(command=>/scan|play_media|call_service/.test(command.type)),false);
});

test('Rivulet links preserve exact numeric movie/episode identity and reject foreign folders, secrets and arbitrary URLs',()=>{
  assert.equal(rivuletLink(item(),'safe-server'),'rivulet://play/42');
  assert.equal(rivuletLink({...item('0042'),media_content_type:'movie'},'safe-server'),'rivulet://play/0042');
  for(const bad of [item('../42'),item('42?token=secret'),item('server/42'),{...item(),media_content_type:'show'},{...item(),media_content_id:'rivulet://play/42'},{...item(),media_content_id:'plex://other-server/42'}])assert.equal(rivuletLink(bad,'safe-server'),null);
});

test('Plex options are additive, lossless, validated and shared by popup and inline parents',()=>{
  const source=parent(),before=structuredClone(source),card=catalog.cards.find(card=>card.id==='md_media_card');
  validateNativeCardConfig(source);
  const data=nativeCardFormData(source,card);
  assert.deepEqual(patchNativeCard(source,card,data,{...data,name:'Changed'}),{...source,name:'Changed'});
  for(const display of ['popup','inline']){
    const config={...source,variables:{media_display:display}};
    const output=composeNativeCard(config,{instanceId:'plex-test'});
    const nodes=[];const visit=node=>{if(node?.type==='custom:marao-plex-watch-card')nodes.push(node);for(const child of node?.cards||[])visit(child);};
    visit(output.card);for(const popup of output.popups)visit(popup);
    assert.equal(nodes.length,1);assert.equal(nodes[0].parent.entity_id,source.entity_id);assert.deepEqual(nodes[0].parent.apple_tv.plex,source.apple_tv.plex);
  }
  assert.deepEqual(source,before);
  assert.equal(nativeCardGridOptions({...source,variables:{media_display:'inline'}}).rows,'auto');
  for(const value of [undefined,false])assert.equal(plexConfigError(value,source),'');
  for(const [key,value]of [['client_entity','remote.wrong'],['scan_clients_entity','switch.wrong'],['app_source',''],['library_root',{...root,media_content_id:'https://unsafe.invalid'}],['continue_watching',{media_content_id:'plex://other/server/recent',media_content_type:'hub'}]]){
    assert.ok(plexConfigError({...mapping(),[key]:value},source),key);
    assert.throws(()=>validateNativeCardConfig({...source,apple_tv:{...source.apple_tv,plex:{...mapping(),[key]:value}}}));
  }
  assert.ok(plexConfigError(mapping(),{...source,popup_view:'authored'}));
  assert.equal(plexConfigError(mapping(),{...source,variables:{media_display:'inline',popup_hash:'#unused'}}),'');
  assert.ok(plexConfigError(mapping(),source,[{entity_id:'media_player.plex_safe',platform:'apple_tv'}]));
  assert.ok(plexConfigError(mapping(),source,[{entity_id:'media_player.plex_safe',platform:'plex',config_entry_id:'one'},{entity_id:'button.plex_scan',platform:'plex',config_entry_id:'two'}]));
  assert.ok(plexConfigError(mapping(),source,[{entity_id:'media_player.plex_safe',platform:'plex',unique_id:'other-server:client'}]));
  const old={type:'custom:marao-media-card',entity_id:'media_player.safe',apple_tv:{apps:[],future:[]}};
  validateNativeCardConfig(old);assert.deepEqual(old,{type:'custom:marao-media-card',entity_id:'media_player.safe',apple_tv:{apps:[],future:[]}});
});

test('TV choices come from nested configured cards, deduplicate complete mappings and keep the parent first',()=>{
  const a=parent(),b={...parent(),name:'Bedroom',entity_id:'media_player.bedroom',apple_tv:{plex:{...mapping(),client_entity:'media_player.plex_bedroom'}}};
  const other={...b,apple_tv:{plex:{...mapping(),library_root:{...root,media_content_id:'plex://another/server'}}}};
  const dashboard={views:[{title:'TV',sections:[{cards:[a,{type:'vertical-stack',cards:[b,structuredClone(b),other,{type:'conditional',card:{...b,apple_tv:{plex:{...b.apple_tv.plex,client_entity:'media_player.alternate'}}}}]}]}]}]};
  const choices=plexTargets(dashboard,a);assert.equal(choices.length,3);assert.equal(choices[0].key,'parent');assert.equal(choices[0].entity_id,a.entity_id);
  assert.equal(choices[1].plex.client_entity,'media_player.plex_bedroom');assert.match(choices[1].name,/Bedroom.*TV/);
  assert.deepEqual(plexTargets(null,a),[plexTarget(a)]);
  assert.equal(plexTargets(dashboard,b)[0].entity_id,b.entity_id);
});

test('HA browsing permits an inactive client, retains exact resume identities and removes authenticated server artwork',async()=>{
  const calls=[],raw={...root,title:'Fictional server',can_expand:true,children:[{...item(),thumbnail:'http://private.invalid/image?X-Plex-Token=secret'}]};
  const hass={connected:true,states:{'media_player.plex_safe':{state:'unavailable'}},callWS:async command=>{calls.push(command);return raw;}};
  const result=await browsePlex(hass,'media_player.plex_safe',root,'safe-server');
  assert.deepEqual(calls,[{type:'media_player/browse_media',entity_id:'media_player.plex_safe',...root}]);
  assert.equal(result.children[0].media_content_id,item().media_content_id);
  assert.equal(result.children[0].thumbnail,'/api/plex_image_proxy/safe-server/42');assert.doesNotMatch(JSON.stringify(result),/secret|private\.invalid/);
  assert.equal(plexImagePath({...item(),thumbnail:'https://untrusted.invalid'},'safe-server'),'/api/plex_image_proxy/safe-server/42');
  assert.equal(plexImagePath({...item('../42'),thumbnail:'anything'},'safe-server'),null);
  for(const value of ['https://external.invalid','plex://safe-server/42?X-Plex-Token=secret','plex://user:secret@safe-server/42','plex://safe-server/42#fragment'])assert.equal(plexURI(value),null);
  assert.equal(plexReference(item(),'other'),null);assert.throws(()=>cleanPlexNode(item(),'other'));
  assert.doesNotMatch(plexError(new Error('Failed https://private.invalid/image?X-Plex-Token=secret token=secret')),/secret|private\.invalid/);
  await assert.rejects(browsePlex({...hass,connected:false},'media_player.plex_safe',root),/Disconnected/);
});

test('Continue Watching and Recently Added use returned hubs and preserve genuine empty and absent results',async()=>{
  const recommended={media_content_id:'plex://safe-server/server/Recommended',media_content_type:'server'};
  const resume={media_content_id:'plex://safe-server/server/home.continue',media_content_type:'hub'},recent={media_content_id:'plex://safe-server/server/movie.recentlyadded',media_content_type:'hub'};
  const library={media_content_id:'plex://safe-server/1',media_content_type:'library'};
  const responses=new Map([[root.media_content_id,{children:[recommended,library]}],[recommended.media_content_id,{children:[resume,recent]}],[resume.media_content_id,{children:[item()]}],[recent.media_content_id,{children:[item('43'),item('43')]}]]);
  const home=await plexHome(mapping(),async ref=>responses.get(ref.media_content_id));assert.equal(home.resume[0].media_content_id,item().media_content_id);assert.equal(home.recent.length,1);assert.deepEqual(home.libraries,[library]);
  responses.set(resume.media_content_id,{children:[]});assert.deepEqual((await plexHome(mapping(),async ref=>responses.get(ref.media_content_id))).resume,[]);
  responses.set(recommended.media_content_id,{children:[]});assert.equal((await plexHome(mapping(),async ref=>responses.get(ref.media_content_id))).resume,null);
  responses.set(recommended.media_content_id,{children:[resume,{...resume,media_content_id:'plex://safe-server/server/tv.ondeck'}]});
  const ambiguous=await plexHome(mapping(),async ref=>responses.get(ref.media_content_id));assert.match(ambiguous.error,/Choose a Continue Watching/);assert.deepEqual(ambiguous.libraries,[library]);
  const partial=await plexHome(mapping(),async ref=>{if(ref.media_content_id===recommended.media_content_id)throw new Error('Recommendations failed');return responses.get(ref.media_content_id);});
  assert.equal(partial.error,'Recommendations failed');assert.deepEqual(partial.libraries,[library]);
});

function launcher(options={}){
  const calls=[],changes=[],haptics=[],hass={user:{id:'safe-user'},connected:true,connection:{connected:true},callService(){},states:{
    'media_player.safe':{state:options.warm?'idle':'off',attributes:{source:options.warm?'Plex':'YouTube',supported_features:128|2048}},
    'media_player.plex_safe':{state:options.warm?'idle':'unavailable',attributes:{supported_features:512}},'button.plex_scan':{state:'2026-11-05T00:00:00Z',attributes:{}}
  }};
  const ctx={hass,target:plexTarget(parent()),active:true,preview:false,ownerKey:'original'};
  const launch=new PlexLaunch({context:()=>ctx,timeout:options.timeout??1000,haptic:value=>haptics.push(value),changed:value=>changes.push(value),callService:async(h,domain,service,data,outcome)=>{
    calls.push({domain,service,data});
    if(options.reject===service){outcome('error',new Error('Reported failure'));return;}
    if(!options.delayed&&service==='turn_on')h.states['media_player.safe'].state='idle';
    if(!options.delayed&&service==='select_source')h.states['media_player.safe'].attributes.source='Plex';
    outcome('success');
  }});
  return{ctx,launch,calls,changes,haptics,hass};
}

test('one tap waits for HA readiness, scans once and dispatches the exact resumed item only to its mapped client',async()=>{
  const f=launcher({delayed:true}),running=f.launch.start(item());await tick();assert.deepEqual(f.calls.map(call=>call.service),['turn_on']);
  assert.equal(await f.launch.start(item()),false);
  f.hass.states['media_player.safe'].state='idle';f.launch.update();await tick();assert.deepEqual(f.calls.map(call=>call.service),['turn_on','select_source']);
  f.hass.states['media_player.safe'].attributes.source='Plex';f.launch.update();await tick();assert.equal(f.calls.at(-1).service,'press');
  f.hass.states['media_player.plex_safe'].state='idle';f.launch.update();assert.equal(await running,true);
  assert.deepEqual(f.calls.at(-1),{domain:'media_player',service:'play_media',data:{entity_id:'media_player.plex_safe',media_content_id:item().media_content_id,media_content_type:'episode'}});
  assert.deepEqual(f.haptics,['heavy']);assert.equal(f.changes.at(-1).accepted,true);assert.equal(f.hass.states['media_player.plex_safe'].state,'idle');assert.equal(f.launch.request,null);
});

test('ready Plex skips wake/source/scan, while failure and timeout stop the sequence with readable errors',async()=>{
  const warm=launcher({warm:true});assert.equal(await warm.launch.start(item()),true);assert.deepEqual(warm.calls.map(call=>call.service),['play_media']);
  const bad=launcher({reject:'turn_on'});assert.equal(await bad.launch.start(item()),false);assert.equal(bad.calls.length,1);assert.match(bad.changes.at(-1).error,/Reported failure/);
  const slow=launcher({timeout:10});assert.equal(await slow.launch.start(item()),false);assert.equal(slow.calls.some(call=>call.service==='play_media'),false);assert.match(slow.changes.at(-1).error,/not confirmed/);assert.equal(slow.launch.request,null);
  const unknown=launcher();unknown.hass.states['media_player.safe'].state='unknown';assert.equal(await unknown.launch.start(item()),false);assert.equal(unknown.calls.length,0);
});

test('Rivulet cold and warm launches send one resumable URL to the selected Apple TV with no Plex actions',async()=>{
  for(const warm of [false,true]){
    const f=launcher({warm});f.ctx.target.plex=rivulet();delete f.hass.states['media_player.plex_safe'];delete f.hass.states['button.plex_scan'];
    f.hass.states['media_player.safe'].attributes.supported_features=128|512;
    assert.equal(await f.launch.start(item()),true);
    assert.deepEqual(f.calls.map(call=>call.service),warm?['play_media']:['turn_on','play_media']);
    assert.deepEqual(f.calls.at(-1),{domain:'media_player',service:'play_media',data:{entity_id:'media_player.safe',media_content_type:'url',media_content_id:'rivulet://play/42'}});
    assert.deepEqual(f.haptics,['heavy']);assert.equal(f.changes.at(-1).accepted,true);
    assert.equal(f.hass.states['media_player.safe'].state,'idle','acknowledgement must not invent Playing');
  }
});

test('Rivulet launch blocks overlapping input and respects cancellation, capability and reported errors',async()=>{
  const make=options=>{const f=launcher(options);f.ctx.target.plex=rivulet();f.hass.states['media_player.safe'].attributes.supported_features=128|512;return f;};
  const delayed=make({delayed:true}),running=delayed.launch.start(item());await tick();assert.equal(await delayed.launch.start(item()),false);
  delayed.ctx.target.plex={...rivulet(),browse_entity:'media_player.changed'};delayed.launch.update();assert.equal(await running,false);
  delayed.hass.states['media_player.safe'].state='idle';delayed.launch.update();assert.deepEqual(delayed.calls.map(call=>call.service),['turn_on']);
  const rejected=make({warm:true,reject:'play_media'});assert.equal(await rejected.launch.start(item()),false);assert.match(rejected.changes.at(-1).error,/Reported failure/);
  const unsupported=make({warm:true});unsupported.hass.states['media_player.safe'].attributes.supported_features=2048;assert.equal(await unsupported.launch.start(item()),false);assert.equal(unsupported.calls.length,0);
  const invalid=make({warm:true});assert.equal(await invalid.launch.start(item('42?token=secret')),false);assert.equal(invalid.calls.length,0);
});

test('TV, owner, account, connection, edit and lifecycle changes cancel a waiting launch without later dispatch',async()=>{
  for(const change of [f=>{f.ctx.target={...f.ctx.target,entity_id:'media_player.other'};},f=>{f.ctx.ownerKey='new';},f=>{f.hass.user={id:'other'};},f=>{f.hass.connection={connected:true};},f=>{f.hass.connected=false;},f=>{f.ctx.preview=true;},f=>{f.ctx.active=false;}]){
    const f=launcher(),running=f.launch.start(item());await tick();const before=f.calls.length;change(f);f.launch.update();assert.equal(await running,false);f.hass.states['media_player.plex_safe'].state='idle';f.launch.update();assert.equal(f.calls.length,before);assert.equal(f.launch.request,null);
  }
  const closed=launcher(),running=closed.launch.start(item());await tick();closed.launch.cancel();assert.equal(await running,false);assert.equal(closed.calls.some(call=>call.service==='play_media'),false);
});

test('home shelves group actual first-level metadata, preserving identities, order and partial errors',async()=>{
  const library=(id,children_media_class)=>({media_content_id:`plex://safe-server/${id}`,media_content_type:'library',title:'Custom translated name',children_media_class});
  const a=library('1','movie'),b=library('2','tv_show'),c=library('3',''),audio=library('4','music'),bad=library('5','movie');
  const movie=id=>({...item(id),media_content_type:'movie',media_class:'movie',title:'Same title'}),show={...item('100'),media_content_type:'show',media_class:'tv_show',can_expand:true,can_play:false};
  const calls=[],read=async folder=>{calls.push(folder.media_content_id);if(folder===bad)throw new Error('Library read failed');return folder.media_content_id===root.media_content_id?{children:[a,b,c,audio,bad]}:{children:folder===a?[movie('1'),movie('2')]:folder===b?[show]:[movie('1'),movie('3'),{...item('77'),media_class:'track'}]};};
  const result=await plexHome(mapping(),read);
  assert.deepEqual(result.movies.map(i=>i.media_content_id),['plex://safe-server/1','plex://safe-server/2','plex://safe-server/3']);assert.deepEqual(result.shows,[show]);
  assert.equal(result.resume,null);assert.equal(result.error,'Library read failed');assert.equal(calls.includes(audio.media_content_id),false);assert.equal(calls.includes(show.media_content_id),false);
  assert.equal(cleanPlexNode({...a,can_expand:true},'safe-server').children_media_class,'movie');
  const empty=await plexHome(mapping(),async folder=>folder===root?{children:[]}:{children:[]});assert.deepEqual(empty.movies,[]);assert.deepEqual(empty.shows,[]);assert.equal(empty.error,'');
});

test('shelves retain independent offsets and batches, suppress scroll clicks and browse with the selected TV',async t=>{
  const previous={document:globalThis.document,HTMLElement:globalThis.HTMLElement};t.after(()=>Object.assign(globalThis,previous));
  class Element {
    constructor(){this.children=[];this.dataset={};this.listeners={};this.scrollLeft=0;this.clientWidth=320;this.scrollWidth=900;}
    append(...children){for(const child of children){child.parentNode?.children.splice(child.parentNode.children.indexOf(child),1);child.parentNode=this;this.children.push(child);}}
    setAttribute(key,value){this[key]=value;}addEventListener(key,listener){this.listeners[key]=listener;}
    querySelector(selector){return this.children.find(node=>node.className===selector.slice(1))||null;}
    querySelectorAll(){return [];}
    getBoundingClientRect(){return {width:176};}
    scrollBy({left}){this.scrollLeft+=left;this.listeners.scroll?.();}
    attachShadow(){this.shadowRoot=new Element();}
  }
  globalThis.HTMLElement=Element;globalThis.document={createElement:()=>new Element()};
  const {MaraoPlexWatchCard}=await import('../../custom_components/marao_dashboard/frontend/MaraoPlex.js');
  const card=new MaraoPlexWatchCard();card._body=new Element();card._sectionEvents=new AbortController();card._sectionObservers=[];card._hass={callService:()=>assert.fail('browsing must not actuate')};
  card._tile=(rail,item)=>{const tile=new Element();tile.className='item';tile.title=item.title;rail.append(tile);};
  const titles=Array.from({length:40},(_,i)=>item(String(i)));card._section('Movies',titles,null,'movies');card._section('TV Series',titles,null,'shows');
  const [movies,shows]=card._body.children,rail=movies.children[1],other=shows.children[1];
  assert.equal(rail.children.filter(node=>node.className==='item').length,24);
  movies.children[0].children[2].onclick({stopPropagation(){}});assert.equal(rail.scrollLeft,188);assert.equal(other.scrollLeft,0);
  rail.children.at(-1).onclick({stopPropagation(){}});assert.equal(rail.children.filter(node=>node.className==='item').length,40);assert.equal(rail.scrollLeft,188);assert.equal(other.scrollLeft,0);
  rail.listeners.pointerdown({clientX:0,clientY:0});rail.listeners.pointermove({clientX:50,clientY:0});let stopped=false;rail.listeners.click({detail:1,preventDefault(){},stopImmediatePropagation(){stopped=true;}});assert.equal(stopped,true);
  const selected={...plexTarget(parent()),entity_id:'media_player.other',plex:{...mapping(),client_entity:'media_player.other_plex'}};card._selected=selected;card._config={parent:parent()};card._inSheet=()=>true;card._navigate=folder=>{card.navigated=folder;};card._openBrowser(null,titles[0]);assert.equal(card.navigated,titles[0]);assert.deepEqual(card._selected,selected);
  card._clearSections();assert.equal(card._sectionEvents.signal.aborted,true);
});
