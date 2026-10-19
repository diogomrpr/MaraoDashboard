import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import nativeChecks from '../camera-live-native-checks.js';
const source = fs.readFileSync(new URL('../../custom_components/marao_dashboard/frontend/MaraoCamera.js', import.meta.url),'utf8');
const {loadNativeCamera,cameraAvailable,cameraSupportsStream,clearNativeCameraPoster,CameraPlayback,CameraSignaling,CAMERA_PLAYBACK_MS,CAMERA_REGISTRATION_MS} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function signalingFixture(createSocket) {
  const connections = [], sockets = [], settings = [];
  class NativeConnection {
    constructor(socket, options) { this.socket = socket; this.options = options; this.handlers = {}; this.closed = 0; this.messages = []; connections.push(this); }
    addEventListener(type, callback) { this.handlers[type] = callback; }
    async subscribeMessage(callback, message, options) {
      this.callback = callback; this.offer = message; this.subscriptionOptions = options;
      callback({type:'session',session_id:'owned-session'});
      return () => assert.fail('Unsubscribe must close the isolated socket, never retire an ID while the provider can still send');
    }
    sendMessagePromise(message) { this.messages.push(message); return this.result || Promise.resolve('candidate accepted'); }
    close() { this.closed++; this.socket.close(); }
  }
  const shared = { constructor: NativeConnection, connected: true, haVersion: 'native-version', options: {
    auth: { retainedNativeAuth: true }, createSocket: createSocket || (async options => {
      settings.push(options); const socket = {closed:0,close(){this.closed++;}}; sockets.push(socket); return socket;
    }) } };
  const failures = [], signaling = new CameraSignaling(shared,'camera.safe',()=>failures.push('disconnected'));
  return {signaling, shared, connections, sockets, settings, failures, offer:{type:'camera/webrtc/offer',entity_id:'camera.safe',offer:'synthetic'}};
}

test('each native offer owns its socket, and unsubscribe closes it without touching another session or the main connection', async () => {
  const f = signalingFixture(), events = [];
  assert.equal(f.connections.length,0,'No eager sockets for HLS-only or still previews');
  const first = await f.signaling.subscribeMessage(event=>events.push(event.type),f.offer);
  const other = new CameraSignaling(f.shared,'camera.safe',()=>assert.fail('Other occurrence must stay live'));
  const second = await other.subscribeMessage(()=>{},f.offer);
  assert.equal(f.connections.length,2); assert.equal(f.settings[0].auth,f.shared.options.auth); assert.equal(f.shared.options.setupRetry,undefined);
  assert.equal(f.settings[0].setupRetry,0); assert.equal(f.settings[0].connectTimeout,10000);
  assert.deepEqual(f.connections[0].subscriptionOptions,{resubscribe:false});
  assert.equal(await f.signaling.candidate({type:'camera/webrtc/candidate',entity_id:'camera.safe',session_id:'owned-session'}),'candidate accepted');
  first(); first(); assert.equal(f.connections[0].closed,1); assert.equal(f.sockets[0].closed,1); assert.equal(f.connections[1].closed,0);
  f.connections[0].callback({type:'candidate'}); assert.deepEqual(events,['session'],'Canceled callbacks cannot reach the removed player');
  assert.equal(f.shared.connected,true); assert.equal(other.connected,true); assert.deepEqual(f.failures,[]);
  second(); other.close(); f.signaling.close(); assert.equal(f.connections[1].closed,1);
});

test('removal during authentication closes the late socket before it can send an offer', async () => {
  let ready, closes=0;
  const f=signalingFixture(()=>new Promise(resolve=>{ready=resolve;}));
  const pending=f.signaling.subscribeMessage(()=>assert.fail('Canceled offer emitted an event'),f.offer);
  f.signaling.close(); ready({close(){closes++;}}); const unsubscribe=await pending; unsubscribe();
  assert.equal(closes,1); assert.equal(f.connections.length,0); assert.equal(f.signaling.sessions.size,0);
});

test('unexpected native connection loss remains a visible failure and cannot reconnect a retired offer', async () => {
  const f=signalingFixture(); await f.signaling.subscribeMessage(()=>{},f.offer);
  f.connections[0].handlers.disconnected(); f.connections[0].handlers.disconnected();
  assert.deepEqual(f.failures,['disconnected']); assert.equal(f.connections[0].closed,1); assert.equal(f.signaling.sessions.size,0);
});

test('signaling rejects foreign entities, non-camera subscriptions and incompatible native APIs before opening a socket', async () => {
  const f=signalingFixture();
  await assert.rejects(f.signaling.subscribeMessage(()=>{},{...f.offer,entity_id:'camera.other'}),/compatibility/);
  await assert.rejects(f.signaling.subscribeMessage(()=>{},{...f.offer,type:'subscribe_entities'}),/compatibility/);
  f.shared.options={}; await assert.rejects(f.signaling.subscribeMessage(()=>{},f.offer),/compatibility/);
  assert.equal(f.sockets.length,0);
});

test('authentication and offer failures propagate while native construction failure still closes the authenticated socket', async () => {
  const rejected=signalingFixture(async()=>{throw new Error('authentication failed');});
  await assert.rejects(rejected.signaling.subscribeMessage(()=>{},rejected.offer),/authentication failed/); assert.equal(rejected.signaling.sessions.size,0);
  const f=signalingFixture(), error=new Error('offer rejected');
  f.shared.constructor.prototype.subscribeMessage=async()=>{throw error;};
  await assert.rejects(f.signaling.subscribeMessage(()=>{},f.offer),failure=>failure===error);
  assert.equal(f.connections[0].closed,1); assert.equal(f.signaling.sessions.size,0);
  const broken=signalingFixture(); class Broken {constructor(){throw error;} subscribeMessage(){}}
  broken.shared.constructor=Broken;
  await assert.rejects(broken.signaling.subscribeMessage(()=>{},broken.offer),failure=>failure===error); assert.equal(broken.sockets[0].closed,1);
});

test('only explicit teardown cancels connection-lost ICE work; active connection loss and server errors remain failures', async () => {
  for(const [closed,code,canceled] of [[false,3,false],[true,3,true],[true,'webrtc_candidate_failed',false]]){
    const f=signalingFixture(); const stop=await f.signaling.subscribeMessage(()=>{},f.offer); let reject;
    f.connections[0].result=new Promise((_,fail)=>{reject=fail;});
    const candidate=f.signaling.candidate({type:'camera/webrtc/candidate',entity_id:'camera.safe',session_id:'owned-session'});
    if(closed)stop(); const error={code}; reject(error);
    if(canceled)assert.equal(await candidate,undefined);else await assert.rejects(candidate,failure=>failure===error);
    f.signaling.close();
  }
});

test('queued local ICE for a retired native offer is canceled, while foreign or unknown sessions remain errors', async () => {
  const f=signalingFixture(),stop=await f.signaling.subscribeMessage(()=>{},f.offer);
  stop();
  const candidate={type:'camera/webrtc/candidate',entity_id:'camera.safe',session_id:'owned-session'};
  assert.equal(await f.signaling.candidate(candidate),undefined);
  assert.equal(f.connections[0].messages.length,0,'A retired local callback cannot send another network command');
  await assert.rejects(f.signaling.candidate({...candidate,session_id:'unknown-session'}),/compatibility/);
  await assert.rejects(f.signaling.candidate({...candidate,entity_id:'camera.other'}),/compatibility/);
  f.signaling.close();
  await assert.rejects(f.signaling.candidate({...candidate,type:'call_service'}),/compatibility/);
});

test('current native contexts receive the isolated connection and fresh HA data without rebuilding the player', () => {
  const playback=Object.create(CameraPlayback.prototype), signaling={candidate:message=>Promise.resolve(message.session_id)};
  const hass={states:{current:true},callWS:message=>Promise.resolve(message.type)}, player={}; let updates=0;
  Object.assign(playback,{hass,player,signaling,contexts:new Set([()=>updates++])}); playback.updateNativeHass();
  assert.equal(player.hass.connection,signaling); assert.equal(player.hass.states,hass.states); assert.equal(updates,1);
  const candidate=player.hass.callWS({type:'camera/webrtc/candidate',session_id:'retired'});
  playback.signaling=null;
  return Promise.all([candidate,player.hass.callWS({type:'camera/capabilities'})]).then(results=>assert.deepEqual(results,['retired','camera/capabilities']));
});

test('native outcome captures state and feedback atomically before a transport handoff, then disposes its handle', async () => {
  for (const state of ['live', 'blocked', 'error', 'snapshot']) {
    const card = { _camera: { state, feedback: { textContent: `Observed ${state}` } } };
    let disposed = false;
    const page = { async waitForFunction(predicate, target, options) {
      assert.equal(target, card); assert.equal(options.timeout, 35000);
      const observed = predicate(target);
      target._camera = { state: 'loading', feedback: { textContent: 'Native handoff' } };
      return { async jsonValue() { return observed; }, async dispose() { disposed = true; } };
    } };
    assert.deepEqual(await nativeChecks.waitForCameraOutcome(page, card), { state, feedback: `Observed ${state}` });
    assert.equal(disposed, true);
  }
});
test('native outcome keeps nonterminal states pending and disposes an unreadable result', async () => {
  let disposed = false;
  const failure = new Error('Result unavailable');
  const page = { async waitForFunction(predicate) {
    for (const state of ['loading', 'inactive', undefined]) assert.equal(predicate({ _camera: { state } }), false);
    assert.equal(predicate({}), false);
    return { async jsonValue() { throw failure; }, async dispose() { disposed = true; } };
  } };
  await assert.rejects(nativeChecks.waitForCameraOutcome(page, {}), failure);
  assert.equal(disposed, true);
});
function nativeProgressFixture(polls) {
  const video = { currentTime: 38, muted: true, playsInline: true, controls: false, paused: false, readyState: 4, isConnected: true, getAttribute: () => '' };
  let hass = { states: { 'camera.safe': { attributes: { entity_picture: 'safe-poster' } } } };
  const transports = [], player = { localName: 'ha-camera-stream', muted: true, hass, stateObj: hass.states['camera.safe'],
    querySelectorAll: selector => selector === 'ha-hls-player,ha-web-rtc-player' ? transports : [] };
  const transport = { localName: 'ha-hls-player', entityid: 'camera.safe', isConnected: true, parentNode: player, posterUrl: '', videos: [video],
    querySelectorAll(selector) { return selector === 'video' ? this.videos : []; } };
  transports.push(transport); video.parentNode = transport;
  const surface = {};
  const card = { _config: { entity: 'camera.safe', future: { keep: [] } }, shadowRoot: { querySelector: () => surface },
    get hass() { return hass; }, set hass(value) { hass = value; player.hass = value; player.stateObj = value.states['camera.safe']; Object.assign(this._camera, {hass:value,nativeHass:value,signaling:value.connection}); this.onHass?.(); },
    _camera: { hass, nativeHass:hass, signaling:hass.connection, state: 'live', generation: 3, video, player, picture: 'safe-poster', poster: { hidden: true, getAttribute: () => 'safe-poster' }, stage: { querySelectorAll: () => [player] } } };
  const disposed = { probe: false, result: false };
  const page = {
    async evaluateHandle(create, target) { assert.equal(target, card); return { ...create(target), async dispose() { disposed.probe = true; } }; },
    async waitForFunction(predicate, argument, options) {
      assert.equal(argument.card, card); assert.equal(options.timeout, 5000, 'One fixed overall playback budget');
      const observed = polls(predicate, argument);
      return { async jsonValue() { return observed; }, async dispose() { disposed.result = true; } };
    },
  };
  return { card, page, disposed, transports, transport, player, surface,
    poll(next) { polls = next; },
    select(video, owner = transport) { video.parentNode = owner; owner.videos = [video]; card._camera.video = video; },
    addCandidate(type = 'ha-web-rtc-player') {
      const owner = { ...transport, localName: type, videos: [] }, candidate = { ...video, currentTime: 0, parentNode: owner };
      owner.videos = [candidate]; transports.push(owner); return { video: candidate, transport: owner };
    },
  };
}
const timeout = () => Object.assign(new Error('Five second playback deadline'), { name: 'TimeoutError' });
test('native progress resets the clock only per actual owned selected video and captures one atomic snapshot', async () => {
  const fixture = nativeProgressFixture((predicate, argument) => {
    assert.equal(predicate(argument), false);
    const candidate = fixture.addCandidate(); fixture.select(candidate.video, candidate.transport);
    assert.equal(predicate(argument), false);
    candidate.video.currentTime = .14; assert.equal(predicate(argument), false);
    candidate.video.currentTime = .2; const observed = predicate(argument);
    fixture.select({ ...candidate.video, currentTime: 0 }, candidate.transport); return observed;
  });
  const observed = await nativeChecks.waitForCameraAdvance(fixture.page, fixture.card);
  assert.equal(observed.before, 0); assert.equal(observed.time, .2);
  assert.equal(observed.currentHass, true); assert.equal(observed.currentEntity, true);
  assert.deepEqual(fixture.disposed, { probe: true, result: true });
});
test('native progress rejects owner replacement and does not accept hidden, paused, foreign, unready or stalled media', async () => {
  for (const replace of [camera => { camera.player = { ...camera.player }; }, camera => { camera.generation++; }]) {
    const fixture = nativeProgressFixture((predicate, argument) => { replace(argument.card._camera); return predicate(argument); });
    await assert.rejects(nativeChecks.waitForCameraAdvance(fixture.page, fixture.card), /Native camera owner changed/);
    assert.deepEqual(fixture.disposed, { probe: true, result: false });
  }
  for (const mutate of [
    fixture => { fixture.transport.entityid = 'camera.other'; }, fixture => { fixture.transport.parentNode = { localName: 'ha-camera-stream' }; },
    fixture => { fixture.card._camera.video.isConnected = false; }, fixture => { Object.assign(fixture.card._camera.video, { nodeType: 1, hidden: true }); },
    fixture => { fixture.card._camera.video.paused = true; }, fixture => { fixture.card._camera.video.readyState = 1; }, fixture => { fixture.card._camera.video.currentTime = 38; },
  ]) {
    const deadline = timeout();
    const fixture = nativeProgressFixture((predicate, argument) => { argument.card._camera.video.currentTime = 38.2; mutate(fixture); assert.equal(predicate(argument), false); throw deadline; });
    await assert.rejects(nativeChecks.waitForCameraAdvance(fixture.page, fixture.card), deadline);
    assert.deepEqual(fixture.disposed, { probe: true, result: false });
  }
});
test('startup proves visible native progress without requiring pending native candidates to finish arbitration', async () => {
  const fixture = nativeProgressFixture((predicate, argument) => { argument.card._camera.video.currentTime = 38.2; return predicate(argument); });
  const pending = fixture.addCandidate(); Object.assign(pending.video, { nodeType: 1, hidden: true, paused: true, readyState: 0 });
  const observed = await nativeChecks.waitForCameraAdvance(fixture.page, fixture.card, { captureBaseline: true });
  assert.equal(observed.time, 38.2); assert.equal(observed.candidateCount, 2);
  assert.equal(fixture.card.__nativeProof.video, fixture.card._camera.video);
  assert.equal(fixture.card.__nativeProof.candidates[1].video, pending.video);
  assert.equal(fixture.card.__nativeProof.generation, fixture.card._camera.generation);
});
async function metadataFixture(run) {
  const previous = { window: globalThis.window, document: globalThis.document };
  const trace = { streamRequests: 2 };
  const fixture = nativeProgressFixture((predicate, argument) => { argument.card._camera.video.currentTime = 38.2; return predicate(argument); });
  globalThis.window = { __maraoCameraRequestTrace: trace };
  const source = fixture.card.hass; globalThis.document = { querySelector: () => ({ hass: source }) };
  try { await nativeChecks.waitForCameraAdvance(fixture.page, fixture.card, { captureBaseline: true }); await run(fixture, trace); }
  finally { Object.assign(globalThis, previous); }
}
test('metadata freezes candidates at task entry and synchronously retains the exact current video', async () => {
  await metadataFixture(async fixture => {
    const initial = fixture.card.__nativeProof, candidate = fixture.addCandidate();
    fixture.select(candidate.video, candidate.transport); // Native selection before metadata is legitimate.
    const observed = nativeChecks.observeNativeCamera({ card: fixture.card, action: 'update-metadata' });
    assert.equal(observed.synchronousIdentityRetained, true);
    assert.equal(initial.video, fixture.transport.videos[0]); assert.equal(initial.metadata.video, candidate.video);
    assert.equal(initial.metadata.candidates.length, 2); assert.equal(initial.metadata.transport, candidate.transport);
    assert.equal(initial.metadata.player, fixture.player); assert.equal(initial.metadata.surface, fixture.surface);
    assert.equal(initial.metadata.config, JSON.stringify(fixture.card._config));
    assert.throws(() => nativeChecks.observeNativeCamera({ card: fixture.card, action: 'update-metadata' }), /must not be replaced/);
  });
});
test('metadata permits only an existing owned candidate to win later and requires its own real advancement', async () => {
  await metadataFixture(async fixture => {
    const candidate = fixture.addCandidate(); Object.assign(candidate.video, { nodeType: 1, hidden: true, paused: true, readyState: 0 });
    nativeChecks.observeNativeCamera({ card: fixture.card, action: 'update-metadata' });
    const boundary = fixture.card.__nativeProof.metadata;
    fixture.poll((predicate, argument) => {
      Object.assign(candidate.video, { nodeType: undefined, hidden: false, paused: false, readyState: 4 });
      fixture.select(candidate.video, candidate.transport);
      assert.equal(predicate(argument), false); candidate.video.currentTime = .14; assert.equal(predicate(argument), false);
      candidate.video.currentTime = .2; return predicate(argument);
    });
    const observed = await nativeChecks.waitForCameraAdvance(fixture.page, fixture.card, { metadata: true });
    assert.equal(observed.metadataIdentity, 'preexisting-native-candidate'); assert.equal(observed.before, 0); assert.equal(observed.time, .2);
    assert.equal(fixture.card.__nativeProof.metadata, boundary); assert.notEqual(boundary.video, candidate.video);
    assert.deepEqual(nativeChecks.observeNativeCamera({ card: fixture.card, action: 'verify-metadata-owner' }), { ownerRetained: true, streamsRetained: true });
  });
});
test('metadata rejects synchronous replacement even when that video was already a native candidate', async () => {
  await metadataFixture(async fixture => {
    const candidate = fixture.addCandidate(); fixture.card.onHass = () => fixture.select(candidate.video, candidate.transport);
    assert.throws(() => nativeChecks.observeNativeCamera({ card: fixture.card, action: 'update-metadata' }), /synchronously replaced/);
  });
});
test('metadata rejects later fresh videos/transports, remounts, new requests, config/surface and stale native data', async () => {
  for (const mutate of [
    fixture => { const candidate = fixture.addCandidate(); fixture.select(candidate.video, candidate.transport); },
    fixture => { fixture.select({ ...fixture.card._camera.video }); },
    fixture => { const replacement = { ...fixture.transport }; fixture.transport.videos[0].parentNode = replacement; fixture.transports.splice(0, 1, replacement); },
    fixture => { fixture.transport.entityid = 'camera.other'; },
    fixture => { fixture.card._camera.player = { ...fixture.player }; }, fixture => { fixture.card._camera.generation++; },
    (fixture, trace) => { trace.streamRequests++; }, fixture => { fixture.card._config.future = {}; },
    fixture => { fixture.card.shadowRoot.querySelector = () => ({}); }, fixture => { fixture.player.hass = {}; }, fixture => { fixture.player.stateObj = {}; },
  ]) await metadataFixture(async (fixture, trace) => {
    nativeChecks.observeNativeCamera({ card: fixture.card, action: 'update-metadata' }); mutate(fixture, trace);
    Object.assign(fixture.disposed, { probe: false, result: false });
    fixture.poll((predicate, argument) => predicate(argument));
    await assert.rejects(nativeChecks.waitForCameraAdvance(fixture.page, fixture.card, { metadata: true }), /changed|newly created|stale/);
    assert.deepEqual(fixture.disposed, { probe: true, result: false });
  });
});
test('an already-existing native candidate still cannot pass metadata proof while stalled or paused', async () => {
  for (const paused of [false, true]) await metadataFixture(async fixture => {
    const candidate = fixture.addCandidate(); nativeChecks.observeNativeCamera({ card: fixture.card, action: 'update-metadata' });
    const deadline = timeout(); fixture.poll((predicate, argument) => {
      fixture.select(candidate.video, candidate.transport); candidate.video.paused = paused;
      for (const time of [0, .05, .1, .1]) { candidate.video.currentTime = time; assert.equal(predicate(argument), false); }
      throw deadline;
    });
    await assert.rejects(nativeChecks.waitForCameraAdvance(fixture.page, fixture.card, { metadata: true }), deadline);
  });
});
test('removing another native occurrence preserves owner identity even during transport loading and rejects real session replacement', () => {
  const fixture = nativeProgressFixture(() => {}), removed = [];
  fixture.card.__duplicate = { remove() { removed.push('duplicate'); fixture.card._camera.state = 'loading'; } };
  fixture.card.__preview = { remove() { removed.push('preview'); } };
  const retained = nativeChecks.removeNativeDuplicates(fixture.card);
  assert.equal(retained.camera, fixture.card._camera); assert.equal(retained.player, fixture.player); assert.equal(retained.generation, 3);
  assert.deepEqual(removed, ['duplicate', 'preview']);
  for (const mutate of [card => { card._camera.player = {}; }, card => { card._camera.generation++; }, card => { card._camera = { ...card._camera }; }]) {
    const fixture = nativeProgressFixture(() => {});
    fixture.card.__duplicate = { remove() { mutate(fixture.card); } }; fixture.card.__preview = { remove() {} };
    assert.throws(() => nativeChecks.removeNativeDuplicates(fixture.card), /replaced the main native session/);
  }
});

test('native registration is memoized and waits for registration, not the void import helper', async () => {
  let calls = 0, finish;
  const registry = { get: () => false, whenDefined: () => new Promise(resolve => {finish=resolve;}) };
  const loader = async () => ({importMoreInfoControl: domain => {assert.equal(domain,'camera'); calls++;}});
  const first=loadNativeCamera(registry,loader), second=loadNativeCamera(registry,loader);
  assert.equal(first,second); await new Promise(resolve=>setImmediate(resolve)); assert.equal(calls,1);
  finish(); await first;
  assert.equal(CAMERA_PLAYBACK_MS,30000); assert.equal(CAMERA_REGISTRATION_MS,10000);
});
test('existing registration skips helpers and availability never treats recording as playback', async () => {
  await loadNativeCamera({get:()=>class{}},()=>assert.fail('already registered'));
  const hass={states:{'camera.safe':{state:'recording'}}};
  assert.equal(cameraAvailable(hass,'camera.safe'),true);
  for(const state of ['off','unknown','unavailable','']) assert.equal(cameraAvailable({states:{'camera.safe':{state}}},'camera.safe'),false);
  assert.equal(cameraAvailable({...hass,connection:{connected:false}},'camera.safe'),false);
  assert.equal(cameraAvailable({...hass,connected:false},'camera.safe'),false);
  assert.equal(cameraAvailable(hass,'camera.missing'),false);
});
test('playback requires advancing media and standard playing event alone cannot remove poster', () => {
  const playback=Object.create(CameraPlayback.prototype);
  Object.assign(playback,{generation:2,video:{currentTime:0,paused:false,readyState:3},lastTime:0,state:'loading',poster:{hidden:false},problem:()=>{},describe:()=>{}});
  playback.progress(2); assert.equal(playback.state,'loading');assert.equal(playback.poster.hidden,false);
  playback.video.currentTime=.5;playback.progress(1);assert.equal(playback.state,'loading');
  playback.progress(2);assert.equal(playback.state,'live');assert.equal(playback.poster.hidden,true);
  playback.video.paused=true;playback.video.currentTime=1;playback.state='loading';playback.progress(2);assert.equal(playback.state,'loading');
});
test('autoplay block exposes exceptional recovery only for recognized rejection', () => {
  const playback=Object.create(CameraPlayback.prototype);
  Object.assign(playback,{generation:2,state:'loading',message:key=>key,problem:()=>{},describe:()=>{}});
  playback.playRejected({name:'NotAllowedError'},1);assert.equal(playback.state,'loading');
  playback.playRejected({name:'NotAllowedError'},2);assert.equal(playback.state,'blocked');
  playback.state='loading';playback.playRejected({name:'AbortError'},2);assert.equal(playback.state,'loading');
});
test('stopping invalidates async work and releases this host without touching duplicate cards', () => {
  const playback=Object.create(CameraPlayback.prototype);const calls=[];
  Object.assign(playback,{generation:1,state:'live',mediaObserver:{disconnect(){calls.push('observer');}},player:{remove(){calls.push('remove');}},video:{removeEventListener(type){calls.push(type);}},mediaHandlers:{playing(){},timeupdate(){}},attempt:true});
  playback.stop();assert.equal(playback.generation,2);assert.equal(playback.player,null);assert.equal(playback.video,null);assert.equal(playback.attempt,false);assert.deepEqual(calls,['observer','playing','timeupdate','remove']);
});
test('camera implementation delegates transport and makes no direct device/service request', () => {
  assert.doesNotMatch(source,/callService|fetch\(|rtsp:|camera\.turn_on|camera\.play_stream/);
  assert.match(source,/player\.hass = this\.nativeHass/);
  assert.match(source,/helpers\.createCardElement\(\{ type: 'picture-entity'/);
  assert.doesNotMatch(source,/bootstrap\.(hass|connectedCallback)|append\(bootstrap/);
});

test('missing native helpers fail visibly and a detached registration fallback receives no hass', async () => {
  const fresh=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#registration-fallback`);
  await assert.rejects(fresh.loadNativeCamera({get:()=>false},undefined),/registration/);
  const bootstraps=[];
  await fresh.loadNativeCamera({get:()=>false,whenDefined:async()=>{}},async()=>({createCardElement(config){const card={config};bootstraps.push(card);return card;}}));
  assert.deepEqual(bootstraps,[{config:{type:'picture-entity',entity:'camera.marao_registration'}}]);
});
test('late registration is bounded and cannot keep initialization pending forever', async () => {
  const fresh=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#registration-timeout`);
  const previousSet=globalThis.setTimeout,previousClear=globalThis.clearTimeout;let expire;
  globalThis.setTimeout=(callback,ms)=>{assert.equal(ms,CAMERA_REGISTRATION_MS);expire=callback;return 1;};globalThis.clearTimeout=()=>{};
  try {const loading=fresh.loadNativeCamera({get:()=>false,whenDefined:()=>new Promise(()=>{})},async()=>({importMoreInfoControl(){}}));expire();await assert.rejects(loading,/registration/);}
  finally{globalThis.setTimeout=previousSet;globalThis.clearTimeout=previousClear;}
});
test('historical provider fixture remains independent of runtime playback and uses existing keys', () => {
  const original=JSON.parse(fs.readFileSync(new URL('../../ha-test/upgrade/fixtures/v0.5.0-camera-provider.json',import.meta.url)));
  const expected=JSON.parse(fs.readFileSync(new URL('../../ha-test/upgrade/fixtures/v0.5.0-camera-provider-expected.json',import.meta.url)));
  assert.ok(JSON.stringify(original).includes('unifi_protect_media_source'));assert.ok(JSON.stringify(expected).includes('unifi_protect_media_source'));
  assert.doesNotMatch(JSON.stringify([original,expected]),/live_view|live_mode|autoplay/);
});


test('only HA-advertised streaming cameras initialize a native player', async () => {
  for (const supported_features of [0, 1, undefined]) {
    const state = { attributes: { supported_features } };
    assert.equal(cameraSupportsStream(state), false);
    const playback = Object.create(CameraPlayback.prototype), failures = [];
    Object.assign(playback, { entity: 'camera.safe', hass: { states: { 'camera.safe': state } }, fail: (...args) => failures.push(args) });
    await playback.start();
    assert.deepEqual(failures, [['unsupported', true]], 'Still-only fallback needs no native element, helper or image/MJPEG session');
    assert.equal(playback.player, undefined);
  }
  for (const supported_features of [2, 3]) assert.equal(cameraSupportsStream({ attributes: { supported_features } }), true);
});

test('native transports leave still ownership to Marao before video creation and after metadata updates', () => {
  const changes = [];
  class NativeTransport {
    constructor(kind) { this.kind = kind; }
    get posterUrl() { return this.picture; }
    set posterUrl(value) { changes.push([this.kind, value]); this.picture = value; }
  }
  const native = kind => new NativeTransport(kind);
  const hls = native('hls'), rtc = native('webrtc');
  const roots = [{ querySelectorAll(selector) { assert.equal(selector, 'ha-hls-player,ha-web-rtc-player'); return [hls]; } }, { querySelectorAll() { return [rtc]; } }];
  assert.equal(clearNativeCameraPoster({}, roots), true);
  assert.equal(hls.posterUrl, ''); assert.equal(rtc.posterUrl, '');
  clearNativeCameraPoster({}, roots); assert.equal(changes.length, 2);
  hls.posterUrl = '/safe-updated.svg'; rtc.posterUrl = '/safe-updated.svg';
  assert.equal(hls.posterUrl, ''); assert.equal(rtc.posterUrl, '');
  assert.deepEqual(changes, [['hls', ''], ['webrtc', ''], ['hls', ''], ['webrtc', '']], 'Parent overwrite still uses native reactive setters but publishes no image URL');
  hls.posterUrl = undefined; assert.equal(hls.posterUrl, '');
  const unrelated = native('unrelated'); unrelated.posterUrl = '/unrelated.svg'; assert.equal(unrelated.posterUrl, '/unrelated.svg', 'No native prototype or other instance is patched');
});

test('incompatible native public poster inputs fail compatibility without observer exceptions', () => {
  for (const native of [Object.preventExtensions({}), Object.defineProperty({}, 'posterUrl', { get() { return undefined; }, set(value) {}, configurable: false })]) {
    const roots = [{ querySelectorAll() { return [native]; } }];
    assert.equal(clearNativeCameraPoster({}, roots), false);
    const playback = Object.create(CameraPlayback.prototype), failures = [];
    Object.assign(playback, { generation: 1, player: { querySelectorAll(selector) { return selector === '*' ? [] : [native]; } },
      mediaObserver: { observe() {} }, fail: reason => failures.push(reason) });
    assert.doesNotThrow(() => playback.bind(1)); assert.deepEqual(failures, ['compatibility']);
  }
});
