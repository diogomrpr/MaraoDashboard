import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraCandidates, frigateLiveURL, rememberCameraStartup } from '../../custom_components/marao_dashboard/frontend/MaraoCamera.js';
import { cameraPoster } from '../../custom_components/marao_dashboard/frontend/MaraoCameraOptions.js';
import { preloadCameras } from '../../custom_components/marao_dashboard/frontend/MaraoCameraPreload.js';
import { composeNativeCard, validateNativeCardConfig } from '../../frontend_src/card-composition.js';

test('Frigate live uses Home Assistant authentication for only the selected camera', async t => {
  const originalSource = globalThis.MediaSource;
  const originalSocket = globalThis.WebSocket;
  globalThis.MediaSource = { isTypeSupported: () => true };
  globalThis.WebSocket = class {};
  t.after(() => {
    globalThis.MediaSource = originalSource;
    globalThis.WebSocket = originalSocket;
  });

  const signal = new AbortController().signal;
  const origin = 'https://ha.invalid';
  const selected = 'camera.entry';
  const states = {
    [selected]: { attributes: { client_id: 'main-frigate', camera_name: 'entry-restream' } },
    'camera.garage': { attributes: { client_id: 'other-frigate', camera_name: 'garage' } },
  };
  const basePath = '/api/frigate/main-frigate';
  const primary = basePath + '/mse/api/ws?src=entry-restream';
  const alternate = basePath + '/go2rtc/ws/api/ws?src=entry_low';
  const signedRequests = [];
  let signedExtra = '';
  const hass = {
    states,
    hassUrl: path => new URL(path, origin).href,
    fetchWithAuth() { assert.fail('Startup must not wait for stream metadata'); },
    async callWS(message) {
      signedRequests.push(message);
      return { path: message.path + '&authSig=fixture-signature' + signedExtra };
    },
  };

  assert.equal(await frigateLiveURL(hass, selected, signal), 'wss://ha.invalid' + primary + '&authSig=fixture-signature');
  assert.deepEqual(signedRequests, [{ type: 'auth/sign_path', path: primary, expires: 60 }]);
  assert.equal(await frigateLiveURL(hass, selected, signal, 'entry_low', 'go2rtc'), 'wss://ha.invalid' + alternate + '&authSig=fixture-signature');
  assert.equal(signedRequests.at(-1).path, alternate);
  signedExtra = '&src=different-camera';
  await assert.rejects(frigateLiveURL(hass, selected, signal), /failed/);

  signedRequests.length = 0;
  assert.equal(await frigateLiveURL(hass, selected, signal, 'https://foreign.invalid/private'), null);
  assert.equal(await frigateLiveURL(hass, 'camera.without_frigate_metadata', signal), null);
  assert.deepEqual(signedRequests, []);
  hass.callWS = async () => { throw new Error('Permission denied'); };
  await assert.rejects(frigateLiveURL(hass, selected, signal), /Permission denied/);
});

test('camera tiles prefer a configured low source and learn faster transports only within their session', () => {
  const owner = 'camera.entry';
  const states = {
    [owner]: { state: 'recording', attributes: { supported_features: 2, client_id: 'main-frigate', camera_name: 'entry' } },
    'camera.low': { state: 'idle', attributes: { supported_features: 2 } },
  };
  const hass = { states, connection: {} };
  const context = { mse: true, now: 1000 };
  const options = { frigate_low_stream: 'entry_low' };
  const [low, frigate, native] = cameraCandidates(hass, owner, options, context);
  assert.equal(low.alternate, 'entry_low');
  assert.deepEqual([frigate.transport, native.transport], ['frigate', 'native']);
  rememberCameraStartup(hass, low, null, 1000);
  rememberCameraStartup(hass, frigate, 1200, 1000);
  rememberCameraStartup(hass, native, 700, 1000);
  assert.deepEqual(cameraCandidates(hass, owner, options, context), [native, frigate, low]);
  assert.equal(cameraCandidates(hass, owner, { ...options, stream_quality: 'low' }, context)[0].alternate, 'entry_low');
  assert.equal(cameraCandidates({ ...hass, connection: {} }, owner, options, context)[0].alternate, 'entry_low');
  assert.equal(cameraCandidates(hass, owner, options, { ...context, now: 32000 })[0].alternate, 'entry_low');
  assert.equal(cameraCandidates(hass, owner, { ...options, stream_quality: 'high' }, context).length, 2);
  assert.equal(cameraCandidates(hass, owner, { low_stream_entity: 'camera.low' }, context)[0].entity, 'camera.low');
  states['camera.low'].state = 'unavailable';
  assert.equal(cameraCandidates(hass, owner, { low_stream_entity: 'camera.low' }, context)[0].entity, owner);
  states[owner].state = 'off';
  assert.deepEqual(cameraCandidates(hass, owner, options, context), []);
});

test('low tile settings preserve the primary event camera and independent popup video', () => {
  const config = {
    type: 'custom:marao-camera-card',
    entity_id: 'camera.entry',
    variables: { stream_quality: 'low', frigate_low_stream: 'entry_low', popup_stream_entity: 'camera.detail', preload_stream: true, future: {} },
  };
  assert.deepEqual(validateNativeCardConfig(config), config);
  const { card, popups } = composeNativeCard(config, { instanceId: 'entry' });
  assert.equal(card.variables.frigate_low_stream, 'entry_low');
  assert.equal(popups[0].cards[0].entity, 'camera.detail');
  assert.equal(popups[0].cards[0].variables?.frigate_low_stream, undefined);
  assert.equal(popups[0].cards[1].entity, 'camera.entry');
  assert.throws(() => validateNativeCardConfig({ ...config, variables: { ...config.variables, low_stream_entity: 'camera.low' } }), /Choose one/);
  const alternateCard = { ...card, variables: { ...card.variables, stream_quality: 'high' } };
  assert.equal(preloadCameras({ views: [{ cards: [card, alternateCard] }] }).size, 2);
  const state = { attributes: { entity_picture: '/api/camera_proxy/camera.entry?token=fixture' } };
  assert.equal(cameraPoster(state, 'camera.entry', true), '/api/camera_proxy/camera.entry?token=fixture&width=640');
  assert.equal(cameraPoster(state, 'camera.entry', false), state.attributes.entity_picture);
});
