import assert from 'node:assert/strict';
import test from 'node:test';
import { frigateLiveURL } from '../../custom_components/marao_dashboard/frontend/MaraoCamera.js';

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
  const lookup = '/api/frigate/main-frigate/go2rtc/api/streams?src=entry-restream';
  const modern = '/api/frigate/main-frigate/go2rtc/ws/api/ws?src=entry-restream';
  const legacy = '/api/frigate/main-frigate/mse/api/ws?src=entry-restream';
  const signedRequests = [];
  let lookupStatus = 200;
  let signedExtra = '';
  const hass = {
    states,
    hassUrl: path => new URL(path, origin).href,
    async fetchWithAuth(path, options) {
      assert.equal(path, lookup, 'Home Assistant adds its own origin');
      assert.equal(options.signal, signal);
      return { status: lookupStatus, ok: lookupStatus === 200, json: async () => ({ producers: [] }) };
    },
    async callWS(message) {
      signedRequests.push(message);
      return { path: message.path + '&authSig=fixture-signature' + signedExtra };
    },
  };

  assert.equal(await frigateLiveURL(hass, selected, signal), 'wss://ha.invalid' + modern + '&authSig=fixture-signature');
  assert.deepEqual(signedRequests, [{ type: 'auth/sign_path', path: modern, expires: 60 }]);
  lookupStatus = 404;
  assert.equal(await frigateLiveURL(hass, selected, signal), 'wss://ha.invalid' + legacy + '&authSig=fixture-signature');
  assert.equal(signedRequests.at(-1).path, legacy);
  signedExtra = '&src=different-camera';
  await assert.rejects(frigateLiveURL(hass, selected, signal), /failed/);

  signedRequests.length = 0;
  lookupStatus = 403;
  await assert.rejects(frigateLiveURL(hass, selected, signal), /failed/);
  assert.equal(await frigateLiveURL(hass, 'camera.without_frigate_metadata', signal), null);
  assert.deepEqual(signedRequests, []);
});
