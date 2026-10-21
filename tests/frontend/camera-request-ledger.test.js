import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { classifyCameraCancellations, installTrace, managedCameraLedger, sameDocumentHashNavigation } = createRequire(import.meta.url)('../camera-request-ledger');
const url = 'http://192.168.0.28:8123/api/hls/fake-session/playlist.m3u8?_HLS_msn=8';
const stack = 'Error\n at Hls.destroy (http://192.168.0.28:8123/frontend_latest/native-hls.js:12:34)';
const entity = 'camera.marao_dashboard_test_camera';
const fixture = () => ({ failures: [{ document: 'first-document', url, xhr: 1, type: 'xhr', error: 'net::ERR_ABORTED', started: 100, date: 200 }],
  trace: { document: 'first-document', sessions: [{ entity, prefix: 'http://192.168.0.28:8123/api/hls/fake-session/' }], stops: [], events: [
    { kind: 'send', id: 1, url, date: 100, stack },
    { kind: 'abort', id: 1, url, date: 199, stack, boundary: { id: 1, label: 'explicit visibility release', entities: [entity] } },
  ] } });

test('commanded cancellation requires exact owned request and actual native abort caller, preserving raw receipt', () => {
  const { failures, trace } = fixture(), result = classifyCameraCancellations(failures, trace);
  assert.equal(result.accepted.length, 1); assert.equal(result.rejected.length, 0);
  assert.equal(result.accepted[0].failure, failures[0]); assert.equal(result.accepted[0].nativeAbortReceipts[0].stack, stack);
});
test('unowned, uncommanded, ambiguous, non-native, image and real network failures stay errors', () => {
  const mutations = [
    value => { value.trace.sessions = []; },
    value => { value.trace.events[1].boundary = null; },
    value => { value.trace.events[1].boundary.kind = 'unrecognized-release'; },
    value => { value.trace.events[1].stack = 'Error\n at injected abort (<anonymous>:1:1)'; },
    value => { value.trace.events[0].url += '&different=request'; },
    value => { value.failures[0].xhr = null; },
    value => { value.failures[0].xhr = 2; },
    value => { value.failures[0].type = 'image'; },
    value => { value.failures[0].error = 'net::ERR_CONNECTION_RESET'; },
    value => { value.trace.events.push({ ...value.trace.events[0] }); },
    value => { value.trace.events.push({ ...value.trace.events[1], boundary: null }); },
    value => { value.trace.events[1].stack = stack.replace('Hls.destroy', 'Hls.retry'); },
  ];
  for (const mutate of mutations) { const value = fixture(); mutate(value); const result = classifyCameraCancellations(value.failures, value.trace); assert.equal(result.rejected.length, 1); assert.equal(result.accepted.length, 0); }
});
test('exact request header identity distinguishes repeated URLs and retains repeated native abort calls', () => {
  const { failures, trace } = fixture();
  trace.events.push({ ...trace.events[0], id: 2 }, { ...trace.events[1], id: 2 }, { ...trace.events[1] });
  const result = classifyCameraCancellations(failures, trace);
  assert.equal(result.accepted.length, 1); assert.equal(result.accepted[0].xhr, 1);
  assert.equal(result.accepted[0].nativeAbortReceipts.length, 2); assert.equal(result.rejected.length, 0);
});
test('native segment cancellation needs the same exact ownership, caller and boundary proof', () => {
  const { failures, trace } = fixture(); const segment = url.replace('playlist.m3u8?_HLS_msn=8', 'segment/0.9.m4s');
  failures[0].url = segment; for (const event of trace.events) event.url = segment;
  assert.equal(classifyCameraCancellations(failures, trace).accepted.length, 1);
  trace.events[1].boundary = null;
  assert.equal(classifyCameraCancellations(failures, trace).rejected.length, 1);
});
test('exact native HLS init fragment requires the same owned session, XHR, native abort and release proof', () => {
  const init = () => {
    const value = fixture(), fragment = url.replace('playlist.m3u8?_HLS_msn=8', 'init.mp4');
    value.failures[0].url = fragment; value.failures[0].error = 'cancelled';
    for (const event of value.trace.events) event.url = fragment;
    return value;
  };
  const value = init(), result = classifyCameraCancellations(value.failures, value.trace);
  assert.equal(result.accepted.length, 1); assert.equal(result.rejected.length, 0);
  assert.equal(result.accepted[0].failure, value.failures[0]);
  const changePath = path => value => { const changed = value.failures[0].url.replace('/init.mp4', path); value.failures[0].url = changed; for (const event of value.trace.events) event.url = changed; };
  for (const mutate of [
    changePath('/init2.mp4'), changePath('/init.mp4.extra'), changePath('/segment/init.mp4'), changePath('/init.mp4/'),
    value => { value.trace.sessions[0].prefix = value.trace.sessions[0].prefix.replace('fake-session', 'another-session'); },
    value => { value.trace.events = value.trace.events.filter(event => event.kind !== 'abort'); },
    value => { value.trace.events[1].boundary = null; },
    value => { value.trace.events[1].stack = 'Error at unrelated abort (<anonymous>:1:1)'; },
    value => { value.failures[0].xhr++; },
    value => { value.failures[0].type = 'media'; },
    value => { value.failures[0].type = 'image'; },
    value => { value.failures[0].error = 'net::ERR_CONNECTION_RESET'; },
  ]) {
    const value = init(); mutate(value);
    const result = classifyCameraCancellations(value.failures, value.trace);
    assert.equal(result.accepted.length, 0); assert.equal(result.rejected.length, 1);
  }
});
test('native handoff cancellation requires retained wrapper/host/generation, advancing winner and no stream restart', () => {
  const handoff = () => {
    const value = fixture();
    value.trace.handoffs = [{ id: 8, wrapper: 11, host: 12, transport: 13, generation: 3, activeVideo: 14,
      stack, currentHost: true, prefix: value.trace.sessions[0].prefix,
      proof: { valid: true, wrapper: 11, host: 12, generation: 3, video: 14, advanced: .3, connected: true, newStreamRequests: 0 } }];
    value.trace.events[1].boundary = { kind: 'native-handoff', handoff: 8, entities: [entity] };
    return value;
  };
  const valid = handoff(); assert.equal(classifyCameraCancellations(valid.failures, valid.trace).accepted.length, 1);
  for (const mutate of [
    receipt => { receipt.stack = 'Error\n at outsideHA (<anonymous>:1:1)'; },
    receipt => { receipt.currentHost = false; },
    receipt => { receipt.prefix += 'wrong-session/'; },
    receipt => { delete receipt.proof; },
    receipt => { receipt.proof.wrapper++; },
    receipt => { receipt.proof.host++; },
    receipt => { receipt.proof.generation++; },
    receipt => { receipt.proof.video++; },
    receipt => { receipt.proof.connected = false; },
    receipt => { receipt.proof.advanced = 0; },
    receipt => { receipt.proof.newStreamRequests = 1; },
  ]) {
    const value = handoff(); mutate(value.trace.handoffs[0]);
    assert.equal(classifyCameraCancellations(value.failures, value.trace).rejected.length, 1, 'A real ordinary-metadata restart cannot become a successful handoff by changing its label');
  }
});

test('only the alreadyexisting same-host native-selected RTC sibling can replace the exact retiring HLS video', () => {
  const selected = () => {
    const value = fixture();
    value.trace.handoffs = [{ id: 8, wrapper: 11, host: 12, transport: 13, generation: 3, activeVideo: 14, activeTransport: 'ha-hls-player', retiringVideo: 14,
      siblings: [{ transport: 16, video: 15, connected: true, sameHost: true, entitySafe: true }], stack, currentHost: true, prefix: value.trace.sessions[0].prefix,
      proof: { valid: true, wrapper: 11, host: 12, generation: 3, video: 15, advanced: .3, connected: true, newStreamRequests: 0,
        selection: 'preexisting-web-rtc', siblingTransport: 16, siblingVisible: true, retiringHidden: true, sameSiblingHost: true } }];
    value.trace.events[1].boundary = { kind: 'native-handoff', handoff: 8, entities: [entity] };
    return value;
  };
  const valid = selected(); assert.equal(classifyCameraCancellations(valid.failures, valid.trace).accepted.length, 1);
  for (const mutate of [
    receipt => { receipt.activeTransport = 'ha-web-rtc-player'; }, receipt => { receipt.retiringVideo = null; },
    receipt => { receipt.siblings = []; }, receipt => { receipt.siblings.push({ ...receipt.siblings[0] }); },
    receipt => { receipt.siblings[0].sameHost = false; }, receipt => { receipt.siblings[0].entitySafe = false; },
    receipt => { receipt.proof.video++; }, receipt => { receipt.proof.siblingTransport++; },
    receipt => { receipt.proof.siblingVisible = false; }, receipt => { receipt.proof.retiringHidden = false; },
    receipt => { receipt.proof.sameSiblingHost = false; }, receipt => { receipt.proof.newStreamRequests++; },
    receipt => { receipt.proof.generation++; },
  ]) { const value = selected(); mutate(value.trace.handoffs[0]); assert.equal(classifyCameraCancellations(value.failures, value.trace).rejected.length, 1); }
});
test('stopped owned session cannot keep polling until explicit recovery', () => {
  const { trace } = fixture(); trace.stops.push({ entities: [entity], date: 150 });
  trace.events.push({ kind: 'send', id: 2, url, date: 250, stack });
  assert.equal(classifyCameraCancellations([], trace).restarts.length, 1);
  trace.stops[0].end = 240;
  assert.equal(classifyCameraCancellations([], trace).restarts.length, 0);
});

test('a native handoff followed by exact 69ms ineligible disposal proves cancellation without claiming liveness', () => {
  const disposed = () => {
    const value = fixture(), prefix = value.trace.sessions[0].prefix;
    value.trace.streamCalls = [];
    value.trace.handoffs = [{ id: 8, date: 100, order: 10, wrapper: 11, host: 15, camera: 12, transport: 13, generation: 3, activeVideo: 14,
      stack, currentHost: true, prefix, streamRequests: 1,
      proof: { valid: false, reason: 'Owner replaced, disconnected or new native stream requested' },
      closedByRelease: { kind: 'marao-ineligible-release', release: 2, ownerRetained: true } }];
    value.trace.releases = [{ id: 2, date: 169, order: 20, wrapper: 11, host: 15, camera: 12, generation: 4, streamRequests: 1,
      stack: 'Error\n at CameraPlayback.stop (http://192.168.0.28:8123/marao_dashboard_static/MaraoCamera.js:270:24)',
      currentHost: true, wasConnected: true, eligible: false, prefix,
      proof: { released: true, ownershipUnambiguous: true, originalCameraOrNull: true, camera: 12, generation: 4, hostDisconnected: true, playerReleased: true } }];
    value.trace.events[1].boundary = { kind: 'native-handoff', handoff: 8, entities: [entity] };
    return value;
  };
  const value = disposed(), result = classifyCameraCancellations(value.failures, value.trace);
  assert.equal(result.accepted.length, 1); assert.equal(value.trace.handoffs[0].proof.valid, false);
  assert.equal(result.accepted[0].failure, value.failures[0]);
  for (const mutate of [
    value => { delete value.trace.handoffs[0].closedByRelease; },
    value => { value.trace.handoffs[0].closedByRelease.kind = 'unknown'; },
    value => { value.trace.handoffs[0].closedByRelease.release++; },
    value => { value.trace.handoffs[0].closedByRelease.ownerRetained = false; },
    value => { value.trace.handoffs[0].camera++; },
    value => { delete value.trace.handoffs[0].camera; },
    value => { value.trace.handoffs[0].proof.reason = 'Winning video changed without a preexisting native sibling'; },
    value => { value.trace.handoffs[0].proof.observerError = 'Error'; },
    value => { value.trace.releases[0].wrapper++; }, value => { value.trace.releases[0].host++; }, value => { value.trace.releases[0].camera++; },
    value => { value.trace.releases[0].generation++; }, value => { value.trace.releases[0].generation--; },
    value => { value.trace.releases[0].date = 99; }, value => { value.trace.releases[0].date = 5101; },
    value => { value.trace.releases[0].order = 9; }, value => { value.trace.releases[0].streamRequests++; },
    value => { value.trace.streamCalls.push({ order: 15 }); },
    value => { value.trace.releases[0].stack = 'Error at unrelated.stop (<anonymous>:1:1)'; },
    value => { value.trace.releases[0].currentHost = false; }, value => { value.trace.releases[0].wasConnected = false; },
    value => { value.trace.releases[0].eligible = true; }, value => { value.trace.releases[0].prefix += 'wrong/'; },
    value => { delete value.trace.releases[0].proof; },
    ...['released', 'ownershipUnambiguous', 'originalCameraOrNull', 'hostDisconnected', 'playerReleased'].map(key => value => { value.trace.releases[0].proof[key] = false; }),
    value => { value.trace.releases[0].proof.generation++; }, value => { value.trace.releases[0].proof.camera++; },
    value => { value.trace.events[1].stack = 'Error at unrelated abort (<anonymous>:1:1)'; },
    value => { value.trace.sessions = []; }, value => { value.failures[0].xhr++; },
    value => { value.failures[0].type = 'media'; }, value => { value.failures[0].error = 'net::ERR_CONNECTION_RESET'; },
  ]) {
    const value = disposed(); mutate(value);
    assert.equal(classifyCameraCancellations(value.failures, value.trace).rejected.length, 1);
  }
  const later = disposed(); later.trace.streamCalls.push({ order: 21 });
  assert.equal(classifyCameraCancellations(later.failures, later.trace).accepted.length, 1, 'A separate occurrence after release cannot invalidate historical closure');
});

test('natural offscreen release requires exact Marao stop, ineligibility and actual current host disposal', () => {
  const released = () => {
    const value = fixture();
    value.trace.releases = [{ id: 2, stack: 'Error\n at CameraPlayback.stop (http://192.168.0.28:8123/marao_dashboard_static/MaraoCamera.js:270:24)',
      currentHost: true, wasConnected: true, eligible: false, camera: 12, generation: 4, prefix: value.trace.sessions[0].prefix,
      proof: { released: true, ownershipUnambiguous: true, remainingConsumers: [], originalCameraOrNull: true, camera: 12, generation: 4, hostDisconnected: true, playerReleased: true } }];
    value.trace.events[1].boundary = { kind: 'marao-ineligible-release', release: 2, entities: [entity] };
    return value;
  };
  const value = released(); assert.equal(classifyCameraCancellations(value.failures, value.trace).accepted.length, 1);
  for (const change of [
    receipt => { receipt.stack = 'Error\n at unrelated.stop (http://192.168.0.28:8123/other.js:1:1)'; },
    receipt => { receipt.eligible = true; }, receipt => { receipt.currentHost = false; }, receipt => { receipt.wasConnected = false; },
    receipt => { receipt.prefix = null; }, receipt => { receipt.prefix += 'wrong-session/'; }, receipt => { receipt.proof.hostDisconnected = false; }, receipt => { receipt.proof.playerReleased = false; },
    receipt => { receipt.proof.originalCameraOrNull = false; }, receipt => { receipt.proof.camera++; }, receipt => { receipt.proof.generation++; },
    receipt => { receipt.proof.ownershipUnambiguous = false; },
  ]) { const changed = released(); change(changed.trace.releases[0]); assert.equal(classifyCameraCancellations(changed.failures, changed.trace).rejected.length, 1); }
});

test('documents keep distinct exact XHR identities and reject an uncheckpointed or mismatched document', () => {
  const first = fixture(), second = fixture(); second.trace.document = second.failures[0].document = 'second-document';
  const failures = [...first.failures, ...second.failures], documents = [first.trace, second.trace];
  assert.equal(classifyCameraCancellations(failures, { documents }).accepted.length, 2);
  assert.equal(classifyCameraCancellations(failures, { documents: [second.trace] }).rejected.length, 1);
  assert.equal(classifyCameraCancellations(first.failures, second.trace).rejected.length, 1);
});

test('natural retirement remains watched until an actual stream request, with strict lifecycle order', () => {
  const { trace } = fixture();
  trace.stops.push({ kind: 'marao-ineligible-release', entities: [entity], order: 5, date: 150 });
  trace.events.push({ kind: 'send', id: 4, url, order: 6, date: 150 });
  assert.equal(classifyCameraCancellations([], trace).restarts.length, 1, 'Same millisecond polling still occurs after stop');
  trace.stops[0].endOrder = 7; trace.stops[0].end = 150;
  assert.equal(classifyCameraCancellations([], trace).restarts.length, 1, 'A later recovery cannot erase the preceding request');
  trace.events.at(-1).order = 8;
  assert.equal(classifyCameraCancellations([], trace).restarts.length, 0);
});

test('natural retirement is exact to the released prefix and does not retire an active shared consumer', () => {
  const { trace } = fixture(), shared = trace.sessions[0].prefix, other = shared.replace('fake-session', 'other-session');
  trace.sessions.push({ entity, prefix: other });
  trace.events.push({ kind: 'send', id: 5, url, order: 8, date: 180 });
  assert.equal(classifyCameraCancellations([], trace).restarts.length, 0, 'No retirement is installed while an eligible duplicate consumes the shared prefix');
  trace.stops.push({ kind: 'marao-ineligible-release', entities: [entity], prefix: other, order: 7, date: 170 });
  assert.equal(classifyCameraCancellations([], trace).restarts.length, 0, 'Other-prefix retirement cannot reject the retained shared session');
  trace.events.at(-1).url = other + 'playlist.m3u8';
  assert.equal(classifyCameraCancellations([], trace).restarts.length, 1);
});

test('only changed hash on the same origin/path/query retains its document', () => {
  const current = 'http://192.168.0.28:8123/marao-dashboard/card-test?mode=1#first';
  assert.equal(sameDocumentHashNavigation(current, '#second'), true);
  for (const target of [current, '?mode=2#first', '/marao-dashboard/overview', 'http://other.test/marao-dashboard/card-test?mode=1#second']) assert.equal(sameDocumentHashNavigation(current, target), false);
});

test('managed context/browser close preserves failed-request diagnostics and still closes after failure', async () => {
  for (const target of ['context', 'browser']) {
    const previous = { window: globalThis.window, requestAnimationFrame: globalThis.requestAnimationFrame };
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-camera-ledger-close-'));
    const trace = { document: 'managed-document', events: [], sessions: [], stops: [], handoffs: [], releases: [], order: 0 };
    globalThis.window = { __maraoCameraRequestTrace: trace, __maraoProveCameraHandoffs: async () => {} };
    globalThis.requestAnimationFrame = callback => callback();
    let closed = false; const listeners = new Map();
    const browser = { close: async () => { closed = true; throw Error('original browser close failure'); } };
    const context = { addInitScript: async () => {}, browser: () => browser, close: async () => { closed = true; throw Error('original context close failure'); } };
    const page = { on: (name, listener) => listeners.set(name, listener), isClosed: () => closed, url: () => 'http://192.168.0.28:8123/marao-dashboard/card-test',
      goto: async () => {}, evaluate: async (callback, data) => callback(data), waitForTimeout: async () => {}, locator: () => ({ evaluateAll: async () => {} }) };
    try {
      await managedCameraLedger(context, page, { output: directory, scenario: 'iphone-normal', theme: 'light' });
      listeners.get('requestfailed')({ url: () => 'http://192.168.0.28:8123/not-owned.js', resourceType: () => 'script', failure: () => ({ errorText: 'net::ERR_ABORTED' }), headers: () => ({}) });
      await assert.rejects(target === 'context' ? context.close() : browser.close(), error => error instanceof AggregateError
        && error.errors.some(item => item.message.includes('Unexpected camera-context request'))
        && error.errors.some(item => item.message.includes('original ' + target + ' close failure')));
      assert.equal(closed, true);
      const saved = JSON.parse(fs.readFileSync(path.join(directory, 'camera-requests-iphone-normal-light.json')));
      assert.equal(saved.failures.length, 1); assert.equal(saved.rejected.length, 1);
    } finally { Object.assign(globalThis, previous); fs.rmSync(directory, { recursive: true, force: true }); }
  }
});

test('managed goto checkpoints real document reloads while retaining hash-only document ownership', async () => {
  const previous = { window: globalThis.window, requestAnimationFrame: globalThis.requestAnimationFrame };
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-camera-ledger-goto-'));
  const blank = document => ({ document, events: [], sessions: [], stops: [], handoffs: [], releases: [], order: 0 });
  globalThis.window = { __maraoCameraRequestTrace: blank('document-one'), __maraoProveCameraHandoffs: async () => {} };
  globalThis.requestAnimationFrame = callback => callback();
  let current = 'http://192.168.0.28:8123/marao-dashboard/card-test', released = 0, closed = false;
  const browser = { close: async () => { closed = true; } };
  const context = { addInitScript: async () => {}, browser: () => browser, close: async () => { closed = true; } };
  const page = { on() {}, isClosed: () => closed, url: () => current, evaluate: async (callback, data) => callback(data), waitForTimeout: async () => {},
    locator: () => ({ evaluateAll: async () => { released++; } }),
    goto: async value => { const after = new URL(value, current).href; if (!sameDocumentHashNavigation(current, after)) window.__maraoCameraRequestTrace = blank('document-two'); current = after; } };
  try {
    const ledger = await managedCameraLedger(context, page, { output: directory, scenario: 'iphone-normal', theme: 'light' });
    await page.goto('#events'); assert.equal(released, 0); assert.equal(window.__maraoCameraRequestTrace.document, 'document-one');
    await page.goto(current); assert.equal(released, 1); assert.equal(window.__maraoCameraRequestTrace.document, 'document-two');
    await ledger.assert();
    const saved = JSON.parse(fs.readFileSync(path.join(directory, 'camera-requests-iphone-normal-light.json')));
    assert.deepEqual(saved.trace.documents.map(item => item.document), ['document-one', 'document-two']);
    await context.close(); assert.equal(closed, true);
  } finally { Object.assign(globalThis, previous); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('instrumentation handles grouped WebSocket replies and tags only same-origin HLS XHR', () => {
  const warnings = [];
  class Socket {
    addEventListener(type, callback) { this.receive = callback; }
    send() {}
  }
  class Xhr {
    open() {}
    send() {}
    abort() {}
    setRequestHeader(name, value) { (this.headers ||= new Map()).set(name, value); }
  }
  class DomNode { removeChild() {} insertBefore() {} }
  class DomElement extends DomNode { remove() {} }
  const environment = vm.createContext({ window: {}, location: new URL('http://192.168.0.28:8123/marao-dashboard/card-test'), URL, WebSocket: Socket, XMLHttpRequest: Xhr, Node: DomNode, Element: DomElement, crypto: crypto.webcrypto, queueMicrotask, console: { warn: (...args) => warnings.push(args) } });
  vm.runInContext('(' + installTrace.toString() + ')({subscriptions:true})', environment);
  const socket = new Socket(); socket.send(JSON.stringify([{ id: 7, type: 'unrelated' }, { id: 8, type: 'camera/stream', entity_id: entity }]));
  socket.receive({ data: JSON.stringify([{ id: 7, type: 'result', success: true }, { id: 8, type: 'result', success: true, result: { url } }]) });
  assert.equal(environment.window.__maraoCameraRequestTrace.sessions.length, 1);
  assert.equal(environment.window.__maraoCameraRequestTrace.sessions[0].entity, entity);
  socket.send(JSON.stringify({ id: 9, type: 'camera/webrtc/offer', entity_id: entity, offer: 'private-offer-not-recorded' }));
  socket.receive({ data: JSON.stringify([{ id: 9, type: 'event', event: { answer: 'private-answer-not-recorded' } }, { id: 10, type: 'result', success: false, error: { code: 'not_found', message: 'private-error-not-recorded' } }]) });
  socket.send(JSON.stringify({ id: 11, type: 'unsubscribe_events', subscription: 9 }));
  environment.console.warn('Received event for unknown subscription 9. Unsubscribing.');
  assert.equal(warnings.length, 1, 'Actual warning still reaches its original console method');
  const subscriptionEvents = environment.window.__maraoCameraRequestTrace.subscriptionEvents;
  assert.equal(subscriptionEvents.find(item => item.type === 'camera/webrtc/offer').entity, entity);
  assert.equal(subscriptionEvents.find(item => item.type === 'unsubscribe_events').subscription, 9);
  assert.equal(subscriptionEvents.find(item => item.id === 10).errorCode, 'not_found');
  assert.equal(subscriptionEvents.at(-1).subscription, 9);
  assert.doesNotMatch(JSON.stringify(subscriptionEvents), /private-.*-not-recorded/);
  const xhr = new Xhr(); xhr.open('GET', url); xhr.send();
  const id = environment.window.__maraoCameraRequestTrace.events.at(-1).id;
  assert.equal(xhr.headers.get('X-Marao-Test-Xhr'), String(id));
  assert.equal(xhr.headers.get('X-Marao-Test-Document'), environment.window.__maraoCameraRequestTrace.document);
  for (const other of ['http://other.test/api/hls/fake/playlist.m3u8', '/api/camera_proxy/camera.safe']) {
    const request = new Xhr(); request.open('GET', other); request.send(); assert.equal(request.headers, undefined);
  }
});

function immediateHandoffFixture({ siblingSelection = false, boundary = null } = {}) {
  let now = 0; const timers = [];
  class Socket { addEventListener() {} send() {} }
  class Xhr { open() {} send() {} abort() {} setRequestHeader() {} }
  class DomNode { removeChild() {} insertBefore() {} }
  class DomElement extends DomNode {
    constructor(tag, parent = null) { super(); this.nodeType = 1; this.localName = tag; this.parentNode = parent; this.isConnected = true; this.listeners = new Map(); }
    querySelectorAll() { return []; }
    remove() { this.isConnected = false; this.parentNode = null; }
    addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    emit(type) { for (const listener of [...this.listeners.get(type) || []]) listener({ type, target: this }); }
  }
  class NativeError extends Error { constructor(message) { super(message); this.stack = message + (message === 'Marao native host release'
    ? '\n at CameraPlayback.stop (http://192.168.0.28:8123/marao_dashboard_static/MaraoCamera.js:270:24)'
    : '\n at repeat.update (http://192.168.0.28:8123/frontend_latest/native.js:1:1)'); } }
  const environment = vm.createContext({ window: {}, location: new URL('http://192.168.0.28:8123/marao-dashboard/card-test'), URL,
    WebSocket: Socket, XMLHttpRequest: Xhr, Node: DomNode, Element: DomElement, crypto: crypto.webcrypto, queueMicrotask,
    Error: NativeError, Date: { now: () => now }, document: new DomElement('document'), getComputedStyle: node => ({ display: node.cssHidden ? 'none' : 'block', visibility: 'visible' }),
    setTimeout: (callback, ms) => { const timer = { callback, ms }; timers.push(timer); return timer; },
    clearTimeout: timer => { const index = timers.indexOf(timer); if (index >= 0) timers.splice(index, 1); } });
  vm.runInContext('(' + installTrace.toString() + ')()', environment);
  const state = environment.window.__maraoCameraRequestTrace;
  state.boundary = boundary;
  state.sessions.push({ entity, prefix: 'http://192.168.0.28:8123/api/hls/fake-session/' });
  const wrapper = new DomElement('marao-card'), host = new DomElement('ha-camera-stream', wrapper);
  host.stateObj = { entity_id: entity };
  const rtc = new DomElement('ha-web-rtc-player', host), video = new DomElement('video', rtc); rtc.entityid = entity;
  Object.defineProperty(video, 'currentTime', { get: () => now / 1000, configurable: true }); video.paused = false; video.readyState = 3;
  const camera = { player: host, video, generation: 3, streamRequests: 1, state: 'live', eligible: () => true }; wrapper._camera = camera;
  const hls = new DomElement('ha-hls-player', host); hls.entityid = entity;
  if (siblingSelection) {
    const losing = new DomElement('video', hls); losing.paused = false; losing.readyState = 3;
    Object.defineProperty(losing, 'currentTime', { get: () => now / 1000 }); camera.video = losing; rtc.cssHidden = true;
    host.querySelectorAll = selector => selector === 'ha-web-rtc-player' ? [rtc] : [];
    rtc.querySelectorAll = selector => selector === 'video' ? [video] : [];
  }
  hls.remove();
  return { environment, state, camera, host, rtc, siblingVideo: video, timers, DomElement,
    selectSibling() { rtc.cssHidden = false; camera.video = video; },
    async media(milliseconds, type = 'timeupdate') { now = milliseconds; video.emit(type); await new Promise(resolve => setImmediate(resolve)); },
    async release(milliseconds) { now = milliseconds; camera.generation++; camera.video = null; camera.eligible = () => false; host.remove(); camera.player = null; camera.attempt = false; await new Promise(resolve => setImmediate(resolve)); },
    async tick(milliseconds) { now = milliseconds; for (const timer of timers.splice(0)) timer.callback(); await new Promise(resolve => setImmediate(resolve)); } };
}

test('native reorder proof starts before any explicit settle call and preserves its completed historical result', async () => {
  const fixture = immediateHandoffFixture();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.state.handoffs[0].proofStarted, 0);
  assert.equal(fixture.timers.length, 1, 'The native DOM operation starts bounded observation immediately');
  await fixture.tick(300);
  assert.equal(fixture.state.handoffs[0].proof.valid, true);
  const proof = fixture.state.handoffs[0].proof;
  fixture.camera.player = null; fixture.camera.generation++;
  await fixture.environment.window.__maraoProveCameraHandoffs();
  assert.equal(fixture.state.handoffs[0].proof, proof, 'Later offscreen disposal cannot replace an already completed causal receipt');
});

test('an unrelated camera release boundary retains exact native handoff evidence and restores its outer scope', async () => {
  const boundary = { id: 7, entities: [entity + '_slow_low'], label: 'open another stream' };
  const fixture = immediateHandoffFixture({ boundary });
  assert.equal(fixture.state.boundary, boundary);
  assert.equal(fixture.state.handoffs.length, 1);
  await new Promise(resolve => setImmediate(resolve));
  await fixture.tick(300);
  assert.equal(fixture.state.handoffs[0].proof.valid, true);
  assert.equal(fixture.state.boundary, boundary);
});

test('native selection keeps the exact sibling video that existed before retiring HLS, then proves its advancement', async () => {
  const fixture = immediateHandoffFixture({ siblingSelection: true });
  const receipt = fixture.state.handoffs[0]; assert.equal(receipt.activeTransport, 'ha-hls-player');
  assert.equal(receipt.siblings.length, 1); assert.equal(receipt.siblings[0].visibleBefore, false);
  fixture.selectSibling(); await new Promise(resolve => setImmediate(resolve)); await fixture.tick(300);
  await fixture.environment.window.__maraoProveCameraHandoffs();
  assert.equal(receipt.proof.valid, true); assert.equal(receipt.proof.selection, 'preexisting-web-rtc');
  assert.equal(receipt.proof.video, receipt.siblings[0].video); assert.equal(receipt.proof.siblingVisible, true); assert.equal(receipt.proof.retiringHidden, true);
});
test('native readiness starts stability while Marao loads, but completed proof still requires its live state', async () => {
  const fixture = immediateHandoffFixture({ siblingSelection: true });
  fixture.selectSibling(); fixture.camera.state = 'loading';
  await new Promise(resolve => setImmediate(resolve)); await fixture.tick(200);
  const receipt = fixture.state.handoffs[0];
  assert.equal(receipt.proof, undefined, 'Advancing native video alone cannot accept a wrapper that is still loading');
  fixture.camera.state = 'live'; await fixture.tick(275);
  await fixture.environment.window.__maraoProveCameraHandoffs();
  assert.equal(receipt.proof.valid, true); assert.equal(receipt.proof.selection, 'preexisting-web-rtc');
  assert.ok(receipt.proof.advanced > .15);
  assert.equal(receipt.selectionSamples[0].state, 'loading'); assert.equal(receipt.selectionSamples[0].paused, false);
  assert.equal(receipt.selectionSamples[0].readyState, 3); assert.equal(receipt.selectionSamples[0].visible, true);
});
function assertHandoffObserverClean(fixture) {
  assert.equal(fixture.state.handoffs[0].observerCleaned, true);
  assert.equal(fixture.timers.length, 0);
  for (const listeners of fixture.siblingVideo.listeners.values()) assert.equal(listeners.size, 0);
}
test('actual selected-video events prove the same bounded progress even when the timer has not resumed', async () => {
  for (const event of ['playing', 'timeupdate']) {
    const fixture = immediateHandoffFixture({ siblingSelection: true }); fixture.selectSibling();
    await new Promise(resolve => setImmediate(resolve));
    const settling = fixture.environment.window.__maraoProveCameraHandoffs();
    assert.equal(fixture.timers.length, 1);
    await fixture.media(300, event); await settling;
    const receipt = fixture.state.handoffs[0];
    assert.equal(receipt.proof.valid, true); assert.equal(receipt.proof.advanced, .3);
    assert.equal(receipt.selectionSamples.at(-1).source, event); assert.equal(receipt.selectionSamples.at(-1).withinDeadline, true);
    assert.equal(receipt.proofDeadline, 5000); assertHandoffObserverClean(fixture);
  }
});
test('late native media events or timer callbacks cannot produce a proof after the original deadline', async () => {
  for (const wake of [fixture => fixture.media(5001), fixture => fixture.tick(5001)]) {
    const fixture = immediateHandoffFixture(); await new Promise(resolve => setImmediate(resolve));
    await wake(fixture); await fixture.environment.window.__maraoProveCameraHandoffs();
    const receipt = fixture.state.handoffs[0];
    assert.equal(receipt.proof.valid, false); assert.equal(receipt.proof.deadlineExceeded, true);
    assert.equal(receipt.observationWakeups.at(-1).withinDeadline, false);
    assert.ok(receipt.selectionSamples.every(sample => sample.withinDeadline)); assertHandoffObserverClean(fixture);
  }
});
test('an unrelated video cannot wake the exact owned native playback observer', async () => {
  const fixture = immediateHandoffFixture(); await new Promise(resolve => setImmediate(resolve));
  const unrelated = new fixture.DomElement('video'); unrelated.emit('playing'); unrelated.emit('timeupdate');
  assert.equal(fixture.state.handoffs[0].selectionSamples.length, 1); assert.equal(fixture.timers.length, 1);
  await fixture.media(300); await fixture.environment.window.__maraoProveCameraHandoffs();
  assert.equal(fixture.state.handoffs[0].proof.valid, true); assertHandoffObserverClean(fixture);
});
test('media event wakeups retain owner, actual playback and readiness checks', async () => {
  for (const mutate of [
    fixture => { fixture.camera.player = new fixture.DomElement('ha-camera-stream'); },
    fixture => { fixture.camera.generation++; },
    fixture => { fixture.camera.video.paused = true; },
    fixture => { fixture.camera.video.readyState = 1; },
    fixture => { Object.defineProperty(fixture.camera.video, 'currentTime', { value: 0 }); },
  ]) {
    const fixture = immediateHandoffFixture(); await new Promise(resolve => setImmediate(resolve)); mutate(fixture);
    await fixture.media(300); await fixture.media(5001); await fixture.environment.window.__maraoProveCameraHandoffs();
    assert.equal(fixture.state.handoffs[0].proof.valid, false); assertHandoffObserverClean(fixture);
  }
});
test('immediate handoff observer retains failed liveness and independently links the exact fast native-host disposal', async () => {
  const fixture = immediateHandoffFixture({ siblingSelection: true }); fixture.selectSibling(); fixture.camera.state = 'loading';
  await new Promise(resolve => setImmediate(resolve)); await fixture.tick(67); await fixture.release(69); await fixture.tick(119);
  await fixture.environment.window.__maraoProveCameraHandoffs();
  const receipt = fixture.state.handoffs[0], release = fixture.state.releases[0];
  assert.equal(receipt.proof.valid, false); assert.equal(receipt.closedByRelease.kind, 'marao-ineligible-release');
  assert.equal(receipt.closedByRelease.release, release.id); assert.equal(receipt.camera, release.camera);
  assert.equal(release.generation, receipt.generation + 1); assert.equal(release.proof.released, true);
  assert.equal(receipt.proofFinished, 69); assert.equal(receipt.observationWakeups.at(-1).source, 'ineligible-release');
  assertHandoffObserverClean(fixture);
});
test('native stability cannot prove never-live, stalled, paused or unready playback', async () => {
  for (const mutate of [
    fixture => { fixture.camera.state = 'loading'; },
    fixture => { Object.defineProperty(fixture.camera.video, 'currentTime', { value: 0 }); },
    fixture => { fixture.camera.video.paused = true; },
    fixture => { fixture.camera.video.readyState = 1; },
  ]) {
    const fixture = immediateHandoffFixture({ siblingSelection: true }); fixture.selectSibling(); mutate(fixture);
    await new Promise(resolve => setImmediate(resolve)); await fixture.tick(300); await fixture.tick(5001);
    await fixture.environment.window.__maraoProveCameraHandoffs();
    assert.equal(fixture.state.handoffs[0].proof.valid, false);
  }
});
test('a paused native sample resets the stability interval instead of contributing elapsed time', async () => {
  const fixture = immediateHandoffFixture(); await new Promise(resolve => setImmediate(resolve));
  fixture.camera.video.paused = true; await fixture.tick(200);
  fixture.camera.video.paused = false; await fixture.tick(300); await fixture.tick(400);
  assert.equal(fixture.state.handoffs[0].proof, undefined);
  await fixture.tick(600); await fixture.environment.window.__maraoProveCameraHandoffs();
  assert.equal(fixture.state.handoffs[0].proof.valid, true);
});

test('immediate observation rejects genuine host, generation, winning-video and stream changes before proof completes', async () => {
  for (const mutate of [
    fixture => { fixture.camera.player = new fixture.DomElement('ha-camera-stream'); },
    fixture => { fixture.camera.generation++; },
    fixture => { fixture.camera.video = new fixture.DomElement('video'); },
    fixture => { fixture.camera.streamRequests++; },
  ]) {
    const fixture = immediateHandoffFixture(); await new Promise(resolve => setImmediate(resolve));
    mutate(fixture); await fixture.tick(300);
    await fixture.environment.window.__maraoProveCameraHandoffs();
    assert.equal(fixture.state.handoffs[0].proof.valid, false);
  }
});

test('another occurrence starting a stream cannot invalidate an unchanged native handoff owner', async () => {
  const fixture = immediateHandoffFixture(); await new Promise(resolve => setImmediate(resolve));
  fixture.state.streamRequests++;
  await fixture.tick(300); await fixture.environment.window.__maraoProveCameraHandoffs();
  assert.equal(fixture.state.handoffs[0].proof.valid, true);
  assert.equal(fixture.state.handoffs[0].proof.newStreamRequests, 1);
  assert.equal(fixture.state.handoffs[0].proof.ownNewStreamRequests, 0);
});

test('per-card restart proof retains raw cancellation and rejects missing or changed owned request evidence', () => {
  const value = fixture(), prefix = value.trace.sessions[0].prefix;
  const receipt = { id: 8, wrapper: 11, host: 12, transport: 13, generation: 3, activeVideo: 14,
    stack, currentHost: true, prefix, ownStreamRequests: 4,
    proof: { valid: true, wrapper: 11, host: 12, generation: 3, video: 14, advanced: .3, connected: true, newStreamRequests: 1, ownNewStreamRequests: 0 } };
  value.trace.handoffs=[receipt];value.trace.events[1].boundary={kind:'native-handoff',handoff:8,entities:[entity]};
  const result=classifyCameraCancellations(value.failures,value.trace);
  assert.equal(result.accepted.length,1);assert.equal(result.accepted[0].failure,value.failures[0]);
  for(const own of [undefined,1]) { receipt.proof.ownNewStreamRequests=own;assert.equal(classifyCameraCancellations(value.failures,value.trace).rejected.length,1); }
});

test('background proof observation captures its own rejection for the strict ledger instead of leaking a promise', async () => {
  const fixture = immediateHandoffFixture(); await new Promise(resolve => setImmediate(resolve));
  Object.defineProperty(fixture.camera, 'generation', { get() { throw Error('Synthetic observer failure'); } });
  await fixture.tick(300); await fixture.environment.window.__maraoProveCameraHandoffs();
  assert.equal(fixture.state.handoffs[0].proof.valid, false);
  assert.equal(fixture.state.handoffs[0].proof.observerError, 'Error');
  assertHandoffObserverClean(fixture);
});

test('quality fallback cancellations require the exact retired host and a lower same-device stream', () => {
  const quality = () => {
    const value = fixture(), high = entity + '_slow_high', low = entity + '_slow_low';
    value.trace.sessions[0].entity = high;
    value.trace.releases = [{ id: 1, entity: high, camera: 3, generation: 4, currentHost: true, wasConnected: true, eligible: true,
      prefix: value.trace.sessions[0].prefix,
      stack: 'Error\n at CameraPlayback.stop (http://192.168.0.28:8123/marao_dashboard_static/MaraoCamera.js:20:1)\n at CameraPlayback.fallback (http://192.168.0.28:8123/marao_dashboard_static/MaraoCamera.js:10:1)',
      proof: { originalCameraOrNull: true, camera: 3, generation: 5, hostDisconnected: true, playerReleased: true,
        quality: { sameConfiguredEntity: true, sameDevice: true, lowerResolution: true, selected: low } } }];
    value.trace.events[1].boundary = { kind: 'marao-quality-release', release: 1, entities: [high] };
    return value;
  };
  const valid = quality(); assert.equal(classifyCameraCancellations(valid.failures, valid.trace).accepted.length, 1);
  for (const mutate of [
    r => { r.stack = stack; }, r => { r.eligible = false; }, r => { r.currentHost = false; },
    r => { r.proof.generation++; }, r => { r.proof.camera++; }, r => { r.proof.hostDisconnected = false; },
    r => { r.proof.quality.sameDevice = false; }, r => { r.proof.quality.lowerResolution = false; },
    r => { r.proof.quality.sameConfiguredEntity = false; }, r => { r.proof.quality.selected = entity + '_real'; },
    r => { r.proof.quality.selected = r.entity; },
  ]) {
    const value = quality(); mutate(value.trace.releases[0]);
    assert.equal(classifyCameraCancellations(value.failures, value.trace).rejected.length, 1);
  }
});
