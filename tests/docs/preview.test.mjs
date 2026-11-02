import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../../docs/playground/simulation.js';
import {browserEnvironment,cameraImage,safePreviewData} from '../../docs/playground/preview-assets.js';
import {fixtureStates} from '../../docs/examples/fixtures.js';
import {ScheduleSession} from '../../frontend_src/schedule-api.js';

test('real card service boundary changes only cloned fictional state',async()=>{
  const original=structuredClone(fixtureStates),updates=[],actions=[];
  const simulation=createSimulation({states:original,onChange:hass=>updates.push(hass),onAction:text=>actions.push(text)});
  await simulation.hass.callService('light','turn_on',{entity_id:'light.kitchen',brightness_pct:60});
  assert.equal(simulation.hass.states['light.kitchen'].state,'on');
  assert.equal(simulation.hass.states['light.kitchen'].attributes.brightness,153);
  assert.equal(original['light.kitchen'].state,'off');assert.equal(updates.length,1);assert.deepEqual(actions,[],'state changes do not generate action narration');
  await assert.rejects(simulation.hass.callService('shell_command','run',{entity_id:'light.kitchen'}),/Not available/);
  await assert.rejects(simulation.hass.callWS({type:'lovelace/config/save',config:{}}),/Not available/);
  await assert.rejects(simulation.hass.callApi('POST','external/action',{}),/Not available/);
  simulation.dispose();
});

test('scenario failures and availability remain visible',async()=>{
  const simulation=createSimulation({states:fixtureStates,scenario:{simulation:{failure:true}}});
  await assert.rejects(simulation.hass.callService('light','toggle',{entity_id:'light.kitchen'}),/Simulated request failed/);
  assert.equal(simulation.states['light.kitchen'].state,'off');
  const offline=createSimulation({states:fixtureStates,scenario:{simulation:{disconnected:true}}});
  assert.equal(offline.hass.connected,false);await assert.rejects(offline.callWS({type:'get_states'}),/Disconnected/);
});

test('history, merged-provider metadata and preview images stay synthetic',async()=>{
  const simulation=createSimulation({states:fixtureStates,config:{cameras:[{entity:'camera.front_door',event_provider:'frigate'},{entity:'camera.garden',event_provider:'netatmo'}]}});
  const history=await simulation.hass.callApi('GET','history/period/2026-11-01T10:00:00Z?filter_entity_id=sensor.temperature&end_time=2026-11-02T10:00:00Z');
  assert.equal(history[0].length,49);assert.equal(history[0][0].entity_id,'sensor.temperature');
  assert.equal((await simulation.hass.callWS({type:'frigate/events/get',cameras:['front_door']})).length,4);
  const folders=await simulation.hass.callWS({type:'media_source/browse_media',media_content_id:'media-source://netatmo'});
  assert.equal(folders.children[0].media_content_id,'media-source://netatmo/events/garden');
  const signed=await simulation.hass.callWS({type:'auth/sign_path',path:'/api/frigate/demo/thumbnail/demo-1'});assert.equal(signed.path,cameraImage);
  await assert.rejects(simulation.hass.callWS({type:'auth/sign_path',path:'https://outside.invalid'}),/Not available/);
});

test('the actual schedule API can create and change a fictional collection',async()=>{
  const config={group_id:'docs_test_collection',targets:['switch.garden'],name:'Garden'};
  const simulation=createSimulation({states:fixtureStates,config,scenario:{id:'setup'}});
  const session=new ScheduleSession(simulation.hass,config.group_id);
  await session.setup(config.name,config.targets);await session.read();assert.equal(session.manifest.status,'ready');
  const group=await session.group('Evening');await session.select(group);assert.equal(session.selected,group);
  await session.timer({name:'Watering',timer_group_id:group,targets:['switch.garden'],days:['mon','wed'],time:'19:00',stop_mode:'after_duration',duration_minutes:15});
  assert.equal(session.timers.length,1);assert.equal(session.timers[0].name,'Watering');
  await session.enabled(session.timers[0],false);assert.equal(session.timers[0].enabled,false);
  simulation.dispose();
});

test('preview navigation and asset projection cannot mutate exported configuration',()=>{
  const actions=[],environment=browserEnvironment(message=>actions.push(message));
  environment.location.assign('https://outside.invalid');assert.equal(environment.location.origin,'https://marao.example');
  environment.history.pushState({},'', 'https://outside.invalid');assert.equal(environment.location.pathname,'/marao-dashboard/home');
  environment.history.pushState({},'', '/marao-dashboard/kitchen');assert.equal(environment.location.pathname,'/marao-dashboard/kitchen');
  const config={type:'custom:marao-media-card',entity_id:'media_player.personal',variables:{entity_picture:'https://private.invalid/image',opaque:[]}};
  const projected=safePreviewData(config);assert.equal(projected.variables.entity_picture,cameraImage);assert.equal(config.variables.entity_picture,'https://private.invalid/image');assert.deepEqual(projected.variables.opaque,[]);
  assert.deepEqual(actions,['External links are not available in this preview.','External links are not available in this preview.']);
});

test('navbar update checks read only the fictional installed manifest',async()=>{
  const environment=browserEnvironment();
  const response=await environment.fetch(environment.installedPackage.manifestURL);
  assert.deepEqual(await response.json(),environment.installedPackage);
  await assert.rejects(environment.fetch('https://outside.invalid/manifest.json'),/Not available/);
  await assert.rejects(environment.fetch(environment.installedPackage.manifestURL,{method:'POST'}),/Not available/);
});

test('color popup changes update the fictional light’s authoritative color and temperature',async()=>{
  const simulation=createSimulation({states:fixtureStates});
  await simulation.hass.callService('light','turn_on',{entity_id:'light.living_room',hs_color:[120,100]});
  assert.deepEqual(simulation.hass.states['light.living_room'].attributes.rgb_color,[0,255,0]);
  assert.deepEqual(simulation.hass.states['light.living_room'].attributes.hs_color,[120,100]);
  assert.equal(simulation.hass.states['light.living_room'].attributes.color_mode,'rgb');
  await simulation.hass.callService('light','turn_on',{entity_id:'light.living_room',color_temp_kelvin:6500});
  assert.equal(simulation.hass.states['light.living_room'].attributes.color_temp_kelvin,6500);
  assert.equal(simulation.hass.states['light.living_room'].attributes.color_mode,'color_temp');
  assert.deepEqual(simulation.hass.states['light.living_room'].attributes.rgb_color,[220,235,255]);
  assert.deepEqual(simulation.hass.states['light.living_room'].attributes.hs_color,[214.3,13.7]);
  assert.deepEqual(fixtureStates['light.living_room'].attributes.rgb_color,[255,190,100]);
});
