import test from 'node:test';
import assert from 'node:assert/strict';
import { compileDashboard } from '../../frontend_src/compile-dashboard.js';

const source = { config_version: 2, name: 'Safe', landing_page: 'home', navigation: [], pages: [{ name: 'Home', path: 'home', sections: [{ columns: 1, entities: [{ template: 'md_title_card', name: 'My home', id: 'heading' }] }, { columns: 1, cards: [{ type: 'markdown', content: 'Raw', unknown: { keep: [] } }] }] }] };

test('complete independent native output preserves empty navigation, raw content and ordering without touching source', () => {
  const before = structuredClone(source);
  assert.deepEqual(compileDashboard(source, { dashboardRoot: 'marao-dashboard' }), { title: 'Safe', views: [{ title: 'Home', path: 'home', theme: 'Marao Dashboard', cards: [
    { type: 'custom:marao-card', template: 'md_title_card', name: 'My home', show_icon: false, show_state: false, tap_action: { action: 'none' }, hold_action: { action: 'none' } },
    { type: 'markdown', content: 'Raw', unknown: { keep: [] } },
    { type: 'vertical-stack', cards: [{ type: 'custom:marao-navbar-card', routes: [] }] },
  ] }] });
  assert.deepEqual(source, before);
});

test('invalid bindings, future source and unsafe YAML fail without a starter reset', () => {
  for (const card of [{ template: 'md_light_card', entity_id: 'lock.safe' }, { template: 'ha_card', yaml: 'type: !secret private' }]) {
    const input = structuredClone(source); input.pages[0].sections[0].entities = [card];
    const before = structuredClone(input);
    assert.throws(() => compileDashboard(input));
    assert.deepEqual(input, before);
  }
  assert.throws(() => compileDashboard({ ...source, config_version: 3 }));
});

test('generated access popup keeps strict opener and explicit safe lock action', () => {
  const input = structuredClone(source);
  input.pages[0].sections = [{ columns: 1, entities: [{ id: 'door', template: 'md_access_card', entity_id: 'lock.safe', name: 'Door' }] }];
  const result = compileDashboard(input);
  const popup = result.views[0].cards.find(card => card.type === 'custom:marao-popup-card');
  assert.equal(popup.hash, '#page-home-door-popup');
  assert.deepEqual(popup.cards[0].cards.map(card => [card.template, card.entity, card.variables.action_service]), [['md_access_slide_action_card', 'lock.safe', 'lock.unlock'], ['md_access_action_card', 'lock.safe', 'lock.lock']]);
});

test('camera popup selects its video independently while retaining dashboard identity, events and saved options', () => {
  for (const popupStream of [undefined, null, '', 'camera.front_high']) {
    const input = structuredClone(source);
    const camera = { id: 'front', template: 'md_camera_card', entity_id: 'camera.front_low', name: 'Entrance', show_name: false,
      tap_action: { action: 'navigate', navigation_path: '#custom-camera' }, unknown: { keep: [] },
      variables: { popup_hash: '#custom-camera', event_provider: 'unifiprotect', unifi_protect_media_source: 'media-source://unifiprotect/fixture:browse:front', event_limit: 24, future: { keep: [] } } };
    if (popupStream !== undefined) camera.variables.popup_stream_entity = popupStream;
    input.pages[0].sections[0].entities = [camera];
    const before = structuredClone(input), view = compileDashboard(input).views[0];
    const dashboard = view.cards[0].cards[0];
    const popup = view.cards.find(card => card.type === 'custom:marao-popup-card');
    assert.equal(dashboard.entity, 'camera.front_low');
    assert.equal(dashboard.show_name, false);
    assert.deepEqual(dashboard.tap_action, camera.tap_action);
    assert.deepEqual(dashboard.variables, camera.variables);
    assert.equal(popup.hash, '#custom-camera');
    assert.equal(popup.entity, 'camera.front_low');
    assert.deepEqual(popup.cards, [
      { type: 'custom:marao-card', template: 'md_camera_card', entity: popupStream || 'camera.front_low', name: 'Entrance', show_name: false, tap_action: { action: 'fullscreen' } },
      { type: 'custom:marao-camera-events-card', entity: 'camera.front_low', title: 'Events', event_provider: 'unifiprotect', unifi_protect_media_source: 'media-source://unifiprotect/fixture:browse:front', limit: 24 },
    ]);
    assert.deepEqual(view.cards.find(card => card.type === 'markdown'), source.pages[0].sections[1].cards[0]);
    assert.deepEqual(input, before);
  }
});

test('modern released baselines retain complete independent source/output targets and frozen provenance', async () => {
  const fs=await import('node:fs'), {createHash}=await import('node:crypto'), {convertDocument}=await import('../../frontend_src/convert-document.js');
  const base=new URL('../../ha-test/upgrade/fixtures/',import.meta.url), read=name=>fs.readFileSync(new URL(name,base),'utf8');
  const manifest=JSON.parse(read('native-baselines.json'));
  for(const record of manifest.records) {
    for(const name of ['input','released_compiled','expected_source','expected_compiled']) assert.equal(createHash('sha256').update(read(record[name])).digest('hex'),record[name+'_sha256']);
    assert.equal(record.draft,false);assert.equal(record.prerelease,false);assert.match(record.commit,/^[a-f0-9]{40}$/);
    const text=read(record.input), result=convertDocument(text,{dashboardRoot:'marao-dashboard'});
    assert.deepEqual(result.source,JSON.parse(read(record.expected_source)),record.tag+' full source');
    assert.deepEqual(result.compiled,JSON.parse(read(record.expected_compiled)),record.tag+' full compiled target');
    if(record.tag==='v0.21.1') assert.equal(result.sourceText,text);
    assert.equal(read(record.input),text);
  }
});

test('duplicated popup cards compile independently with exact fixed-column order', async () => {
  const { duplicateCard } = await import('../../frontend_src/editor-model.js');
  const input = structuredClone(source);
  const section = { columns: 2, entities: [{ id: 'climate', template: 'md_climate_card', entity_id: 'climate.safe', name: 'Original', variables: { mode_selector_hash: '#owned-modes', target_step: 1 }, tap_action: { action: 'navigate', navigation_path: '#external' } }] };
  input.pages[0].sections = [section];
  const copy = duplicateCard(input, section, 0); copy.name = 'Independent'; copy.variables.target_step = 2;
  const before = structuredClone(input), compiled = compileDashboard(input);
  const cards = compiled.views[0].cards, sheets = cards.filter(card => card.type === 'custom:marao-popup-card');
  assert.equal(sheets.length, 2); assert.notEqual(sheets[0].hash, sheets[1].hash);
  assert.deepEqual(cards[0].cards.map(card => card.name), ['Original', 'Independent']);
  assert.deepEqual(cards[0].cards.map(card => card.variables.target_step), [1, 2]);
  assert.deepEqual(cards[0].cards.map(card => card.tap_action.navigation_path), ['#external', '#external']);
  assert.deepEqual(input, before);
});


test('main-page shortcut flags preserve absence and explicit false through source conversion and compilation',async()=>{
  const {convertDocument}=await import('../../frontend_src/convert-document.js');
  for(const flags of [{},{show_cache_reset:false,show_editor_button:false},{show_cache_reset:false,show_editor_button:true}]) {
    const input={...structuredClone(source),...flags,future:{keep:[]}},text=JSON.stringify(input);
    const result=convertDocument(text,{dashboardRoot:'renamed-dashboard'});
    assert.deepEqual(result.source,input);assert.equal(result.sourceText,text);
    const nav=result.compiled.views[0].cards.find(card=>card.type==='vertical-stack').cards[0];
    for(const key of ['show_cache_reset','show_editor_button']) {
      assert.equal(Object.hasOwn(nav,key),Object.hasOwn(flags,key));
      if(Object.hasOwn(flags,key))assert.equal(nav[key],flags[key]);
    }
    assert.deepEqual(nav.routes,[]);
  }
  assert.throws(()=>convertDocument(JSON.stringify({...source,show_editor_button:'false'})),/boolean/);
});

test('inline media reuses popup controls and preserves independent modes and app targets',()=>{
 const input=structuredClone(source);const card={id:'player',template:'md_media_card',entity_id:'media_player.safe',name:'TV',unknown:{keep:[]},apple_tv:{remote_entity:'remote.safe',volume_remote_entity:'media_player.volume',apps:[{name:'Two',source:'two'},{name:'One',source:'one'}]}};
 input.pages[0].sections=[{columns:1,entities:[card]}];
 const popup=compileDashboard(input).views[0].cards.find(c=>c.type==='custom:marao-popup-card');
 const before=structuredClone(input);card.variables={media_display:'inline'};
 const view=compileDashboard(input).views[0];const inline=view.cards[0];assert.equal(inline.type,'vertical-stack');assert.equal(inline.cards[0].variables.now_playing,true);assert.equal(inline.cards[0].tap_action.action,'none');
 assert.deepEqual(inline.cards.slice(1),popup.cards);assert.ok(!view.cards.some(c=>c.type==='custom:marao-popup-card'));
 assert.deepEqual(card.apple_tv,before.pages[0].sections[0].entities[0].apple_tv);
 input.pages[0].sections[0].entities.push({...structuredClone(card),id:'other',variables:{media_display:'popup'}});
 const mixed=compileDashboard(input).views[0];assert.equal(mixed.cards.filter(c=>c.type==='custom:marao-popup-card').length,1);
 const actions=[];const walk=v=>{if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object'){if(v.perform_action)actions.push(v);Object.values(v).forEach(walk);}};walk(inline);
 assert.ok(actions.some(a=>a.perform_action==='remote.send_command'&&a.target.entity_id==='remote.safe'));
 assert.ok(actions.some(a=>a.perform_action==='media_player.volume_up'&&a.target.entity_id==='media_player.volume'));
 assert.ok(actions.some(a=>a.perform_action==='media_player.media_seek'&&a.seek_offset===30));
});
test('inline generic media and removed popup links fail preflight without source changes',()=>{
 const input=structuredClone(source);input.pages[0].sections=[{columns:1,entities:[{template:'md_media_card',id:'audio',entity_id:'media_player.safe',variables:{media_display:'inline'}}]}];
 assert.equal(compileDashboard(input).views[0].cards[0].cards.length,2);
 input.pages[0].sections[0].cards=[{type:'button',tap_action:{action:'navigate',navigation_path:'#page-home-audio-popup'}}];
 const before=structuredClone(input);assert.throws(()=>compileDashboard(input),/missing popup link/);assert.deepEqual(input,before);
 input.pages[0].sections[0].entities[0].variables.media_display='popup';assert.doesNotThrow(()=>compileDashboard(input));
 input.pages[0].sections[0].entities[0].variables.media_display='bad';assert.throws(()=>compileDashboard(input),/Popup or On dashboard/);
});
