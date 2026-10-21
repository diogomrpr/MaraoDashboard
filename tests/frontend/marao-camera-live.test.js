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

test('a native offer arriving after disposal is inert while invalid offers still reject', async () => {
  const f = signalingFixture();
  f.signaling.close();
  const unsubscribe = await f.signaling.subscribeMessage(() => assert.fail('Retired offer emitted an event'), f.offer);
  unsubscribe(); unsubscribe();
  assert.equal(f.sockets.length, 0);
  assert.equal(f.connections.length, 0);
  assert.equal(f.signaling.sessions.size, 0);
  await assert.rejects(f.signaling.subscribeMessage(() => {}, {...f.offer, entity_id: 'camera.other'}), /compatibility/);
  await assert.rejects(f.signaling.subscribeMessage(() => {}, {...f.offer, type: 'subscribe_entities'}), /compatibility/);
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
  const nativeClose = {type:'result',success:false,error:{code:3,message:'Connection lost'}};
  for(const [closed,error,canceled] of [[false,{code:3},false],[true,{code:3},true],[false,nativeClose,false],[true,nativeClose,true],
    [true,{code:'webrtc_candidate_failed'},false],[true,{...nativeClose,error:{code:'webrtc_candidate_failed'}},false],
    [true,{...nativeClose,success:true},false],[true,{error:{code:3}},false]]){
    const f=signalingFixture(); const stop=await f.signaling.subscribeMessage(()=>{},f.offer); let reject;
    f.connections[0].result=new Promise((_,fail)=>{reject=fail;});
    const candidate=f.signaling.candidate({type:'camera/webrtc/candidate',entity_id:'camera.safe',session_id:'owned-session'});
    if(closed)stop(); reject(error);
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
      assert.equal(target, card); assert.equal(options.timeout, 35000); assert.equal(options.polling, 50);
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
    async evaluate(callback, argument) { return callback(argument); },
    async evaluateHandle(create, target) { assert.equal(target, card); return { ...create(target), async dispose() { disposed.probe = true; } }; },
    async waitForFunction(predicate, argument, options) {
      assert.equal(argument.card, card); assert.equal(options.timeout, 35000, 'One fixed native startup and playback budget'); assert.equal(options.polling, 50);
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
const timeout = () => Object.assign(new Error('Native playback deadline'), { name: 'TimeoutError' });
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
test('repeated idle cleanup preserves the completed release generation and cancels each later attempt once', () => {
  const playback = Object.create(CameraPlayback.prototype);
  let removed = 0, closed = 0;
  Object.assign(playback, { generation: 7, state: 'live', attempt: true,
    player: { remove() { removed++; } }, signaling: { close() { closed++; } } });
  playback.stop();
  const released = playback.generation;
  playback.stop(); playback.stop();
  assert.equal(playback.generation, released, 'Repeated ineligible notifications must retain the exact completed release');
  assert.equal(removed, 1); assert.equal(closed, 1);
  playback.attempt = true; // A later registration is pending before its host exists.
  playback.stop();
  assert.equal(playback.generation, released + 1, 'A new pending attempt must still be invalidated');
  playback.stop();
  assert.equal(playback.generation, released + 1);
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

test('native image fallback remains recoverable even when the player supplies no alert', () => {
  for (const nativeError of ['', 'Synthetic codec rejection']) {
    const playback = Object.create(CameraPlayback.prototype), problems = [];
    let removed = 0;
    const player = {
      querySelectorAll: () => [],
      querySelector: selector => selector === 'img' ? {} : selector === 'ha-alert' && nativeError ? { textContent: nativeError } : null,
      remove() { removed++; },
    };
    Object.assign(playback, {
      generation: 1, state: 'loading', attempt: true, player, picture: 'synthetic-still', posterFailed: false, poster: { hidden: false },
      mediaObserver: { observe() {}, disconnect() {} }, message: key => key, problem: value => problems.push(value), describe() {},
    });
    playback.bind(1);
    assert.equal(playback.state, 'error', 'A failed stream must retain explicit Retry rather than latch a snapshot-only state');
    assert.equal(playback.reason, 'failed');
    assert.equal(playback.nativeError, nativeError);
    assert.equal(problems.at(-1), ['failed', nativeError].filter(Boolean).join(' · '));
    assert.equal(playback.poster.hidden, false);
    assert.equal(playback.player, null);
    assert.equal(playback.attempt, false);
    assert.equal(removed, 1, 'The failed native host must be released once');
  }
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

test('startup and Retry honor the configured camera exactly, without registry discovery or adaptation', async () => {
  const previous={document:globalThis.document,customElements:globalThis.customElements,MutationObserver:globalThis.MutationObserver};
  const players=[],calls=[];
  const hass={states:{'camera.high':{state:'recording',attributes:{supported_features:2}}},callWS:async message=>{calls.push(message);return {frontend_stream_types:['web_rtc','hls']};}};
  globalThis.document={createElement:tag=>({localName:tag,setAttribute(){},remove(){}})};
  globalThis.customElements={get:()=>true};
  globalThis.MutationObserver=class {observe(){} disconnect(){}};
  const playback=Object.assign(Object.create(CameraPlayback.prototype),{entity:'camera.high',hass,generation:0,
    stage:{prepend:player=>players.push(player),addEventListener(){},removeEventListener(){}},eligible:()=>true,
    problem(){},describe(){},bind(){},fail:reason=>assert.fail(reason)});
  try {
    await playback.start();
    assert.equal(playback.streamEntity,'camera.high');assert.equal(playback.player.localName,'ha-camera-stream');
    assert.deepEqual(calls,[],'No extra discovery or speed test before native startup');
    await playback.nativeHass.callWS({type:'camera/capabilities',entity_id:'camera.high'});
    assert.deepEqual(calls,[{type:'camera/capabilities',entity_id:'camera.high'}]);
    playback.stop();playback.resetStream();await playback.start();
    assert.equal(playback.streamEntity,'camera.high');assert.equal(players.length,2);
  } finally {playback.stop();Object.assign(globalThis,previous);}
});

test('fullscreen reuses the playing video and restores controls and listeners after exit', async () => {
  const previous=globalThis.document,events=new Map(),videoEvents=new Map();let requests=0,failures=[];
  const root={fullscreenElement:null};
  globalThis.document={addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k),exitFullscreen:async()=>{root.fullscreenElement=null;}};
  const video={videoWidth:640,controls:false,style:{objectFit:"cover",pointerEvents:"none"},getRootNode:()=>root,addEventListener:(k,f)=>videoEvents.set(k,f),removeEventListener:k=>videoEvents.delete(k),requestFullscreen:async()=>{requests++;root.fullscreenElement=video;}};
  const p=Object.assign(Object.create(CameraPlayback.prototype),{video,player:{controls:false,aspectRatio:16/9,fitMode:'cover'},stage:{open:true,setAttribute(){},removeAttribute(){},removeEventListener(){},matches:()=>false},eligible:()=>true,describe(){failures.push(this.fullscreenError);},message:k=>k});
  try {
    await p.fullscreen();assert.equal(requests,1);assert.equal(p.video,video);assert.equal(video.controls,true);assert.equal(p.player.fitMode,'contain');assert.equal(p.player.aspectRatio,undefined);assert.equal(video.style.pointerEvents,"auto");assert.equal(video.style.objectFit,"contain");
    root.fullscreenElement=null;events.get('fullscreenchange')();
    assert.equal(video.controls,false);assert.deepEqual(p.player,{controls:false,aspectRatio:16/9,fitMode:'cover'});assert.equal(video.style.pointerEvents,"none");assert.equal(video.style.objectFit,"cover");assert.equal(events.size,0);assert.equal(videoEvents.size,0);
    video.requestFullscreen=undefined;video.webkitEnterFullscreen=()=>{requests++;};
    await p.fullscreen();assert.equal(requests,2);videoEvents.get('webkitendfullscreen')();assert.equal(video.controls,false);
    video.webkitEnterFullscreen=undefined;await p.fullscreen();assert.equal(failures.at(-1),'fullscreen_failed');assert.equal(video.controls,false);
    video.videoWidth=0;await p.fullscreen();assert.equal(failures.at(-1),'fullscreen_wait');
  } finally {globalThis.document=previous;}
});

test('fullscreen completion after owner cleanup cannot restore retired UI or overwrite a newer error', async () => {
  const previous=globalThis.document;let finish,descriptions=0;
  globalThis.document={addEventListener(){},removeEventListener(){}};
  const video={videoWidth:640,controls:false,getRootNode:()=>({}),addEventListener(){},removeEventListener(){},requestFullscreen:()=>new Promise(resolve=>{finish=resolve;})};
  const p=Object.assign(Object.create(CameraPlayback.prototype),{video,stage:{open:true,setAttribute(){},removeAttribute(){},removeEventListener(){},matches:()=>false},eligible:()=>true,describe(){descriptions++;},message:k=>k});
  try {
    const pending=p.fullscreen();p.fullscreenCleanup();p.fullscreenError='new problem';finish();await pending;
    assert.equal(p.fullscreenError,'new problem');assert.equal(video.controls,false);assert.equal(p.fullscreenCleanup,null);assert.equal(descriptions,0);
  } finally {globalThis.document=previous;}
});

test('brief buffering keeps the same video visible and recovers on clock progress without native events', () => {
  const p=Object.create(CameraPlayback.prototype);let descriptions=0;
  Object.assign(p,{state:'live',generation:1,video:{paused:false,readyState:2,currentTime:2},lastTime:1,advanced:true,poster:{hidden:true},describe(){descriptions++},problem(){},lastProgressAt:performance.now(),attempt:true,sampleAt:performance.now(),sampleTime:1,slowMs:0});
  p.waiting();assert.equal(p.state,'buffering');assert.equal(p.poster.hidden,true);
  p.observeProgress(1);assert.equal(p.state,'live');assert.equal(p.poster.hidden,true);assert.ok(descriptions>=2);clearTimeout(p.timer);
});

test('an advancing native clock without newly decoded frames cannot claim live playback', () => {
  const p=Object.create(CameraPlayback.prototype);let frames=10;
  Object.assign(p,{generation:1,state:'buffering',lastTime:1,lastFrames:10,video:{paused:false,readyState:2,currentTime:2,getVideoPlaybackQuality:()=>({totalVideoFrames:frames,droppedVideoFrames:0})},poster:{hidden:true},describe(){},problem(){}});
  p.progress(1);assert.equal(p.state,'buffering');assert.equal(p.poster.hidden,true);
  frames++;p.video.currentTime=3;p.progress(1);assert.equal(p.state,'live');assert.equal(p.poster.hidden,true);
});

test('retired native HLS requests cannot wake a detached host with a late playlist URL', async () => {
  const p=Object.create(CameraPlayback.prototype);let resolve,calls=0,delivered=false;
  Object.assign(p,{generation:1,streamRequests:0,player:{},signaling:{},hass:{callWS(){calls++;return new Promise(done=>{resolve=done;});}}});
  p.updateNativeHass();const api=p.nativeHass;
  api.callWS({type:'camera/stream'}).then(()=>{delivered=true;});
  assert.equal(p.streamRequests,1);
  p.generation++;resolve({url:'obsolete-synthetic-playlist'});await Promise.resolve();await Promise.resolve();
  assert.equal(delivered,false);api.callWS({type:'camera/stream'});assert.equal(calls,1);
  assert.equal(p.streamRequests,1,'A retired owner must not count or issue another request');
  p.hass={callWS:()=>Promise.reject(new Error('permission'))};p.updateNativeHass();
  await assert.rejects(p.nativeHass.callWS({type:'camera/stream'}),/permission/,'Active failures must still propagate');
  assert.equal(p.streamRequests,2);
});

test('a choppy but advancing lowest-quality stream stays live instead of failing for low frame rate', () => {
  const p=Object.create(CameraPlayback.prototype);
  Object.assign(p,{generation:1,attempt:true,state:'live',advanced:true,slowMs:35000,sampleAt:performance.now()-500,sampleTime:2,lastTime:2,lastFrames:10,sampleFrames:10,lastProgressAt:performance.now(),streamEntity:'camera.low',hass:{states:{'camera.low':{attributes:{fps:20}}}},video:{currentTime:2.5,paused:false,readyState:2,getVideoPlaybackQuality:()=>({totalVideoFrames:11,droppedVideoFrames:0})},poster:{},describe(){},problem(){},eligible:()=>true,fallback:()=>false,fail(){assert.fail('Advancing video must remain usable even at low fps');}});
  p.observeProgress(1);assert.equal(p.state,'live');assert.equal(p.poster.hidden,true);assert.equal(p.streamEntity,'camera.low');
});


test('background preload discovers enabled dashboard streams without popup or default-off demand', async () => {
  const {preloadCameras} = await import('../../custom_components/marao_dashboard/frontend/MaraoCameraPreload.js');
  const enabled = {type:'custom:marao-card',template:'hc_camera_card',entity:'camera.low',variables:{preload_stream:true,popup_stream_entity:'camera.high'}};
  const config = {views:[{sections:[{cards:[{type:'vertical-stack',cards:[enabled,{...enabled}]}]}]},
    {cards:[{...enabled,entity:'camera.off',variables:{}}, {type:'custom:marao-popup-card',cards:[{...enabled,entity:'camera.popup'}]}]}]};
  const before = structuredClone(config);
  assert.deepEqual([...preloadCameras(config).keys()], ['camera.low']);
  assert.deepEqual(config,before);
});

test('warm playback lease retains its player across card removal and cleans the last disabled owner', async () => {
  const {CameraPreload} = await import('../../custom_components/marao_dashboard/frontend/MaraoCameraPreload.js');
  const oldCancel = globalThis.cancelAnimationFrame; globalThis.cancelAnimationFrame = () => {};
  try {
    let removed = 0;
    const player = {}, playback = {player, state:'live',update(){},fullscreen(){}};
    const entry = {playback,background:true,host:{style:{},setAttribute(){}}};
    const owner = Object.assign(Object.create(CameraPreload.prototype),{configured:new Map([['camera.low',{}]]),sessions:new Map([['camera.low',entry]]),
      position(){},remove(entity){removed++;this.sessions.delete(entity);}});
    const card = {_config:{entity:'camera.low'}}, callbacks = {problem(){}};
    const slot = () => ({style:{},innerHTML:''});
    const first = owner.claim(card,slot(),callbacks);
    assert.equal(first.player,player);
    assert.equal(owner.claim(card,slot(),callbacks),null,'A second visible occurrence retains independent ownership');
    first.dispose();
    assert.equal(removed,0,'Navigation must retain an enabled background session');
    const second = owner.claim(card,slot(),callbacks);
    assert.equal(second.player,player,'Returning to the view must reuse the warm native player');
    entry.background=false; second.dispose();
    assert.equal(removed,1);
    second.dispose(); assert.equal(removed,1,'Repeated teardown must not stop another owner');
  } finally {globalThis.cancelAnimationFrame=oldCancel;}
});

test('background eligibility bypasses card intersection but respects dashboard, visibility and availability', async () => {
  const {CameraPreload} = await import('../../custom_components/marao_dashboard/frontend/MaraoCameraPreload.js');
  const {CameraPlayback} = await import('../../custom_components/marao_dashboard/frontend/MaraoCamera.js');
  const previousDocument=globalThis.document,previousLocation=globalThis.location;
  globalThis.document={hidden:false};globalThis.location={pathname:'/marao-dashboard/overview'};
  try {
    const owner=Object.assign(Object.create(CameraPreload.prototype),{root:{isConnected:true,lovelace:{}},dashboard:'marao-dashboard'});
    const playback=Object.assign(Object.create(CameraPlayback.prototype),{card:{isConnected:true},visible:false,
      hass:{states:{'camera.low':{state:'streaming'}},connection:{connected:true}},entity:'camera.low',backgroundEligible:()=>owner.active()});
    assert.equal(playback.eligible(),true);
    document.hidden=true;assert.equal(playback.eligible(),false);document.hidden=false;
    playback.hass.connection.connected=false;assert.equal(playback.eligible(),false);playback.hass.connection.connected=true;
    playback.hass.states['camera.low'].state='unavailable';assert.equal(playback.eligible(),false);playback.hass.states['camera.low'].state='streaming';
    owner.root.lovelace.editMode=true;assert.equal(playback.eligible(),false);owner.root.lovelace.editMode=false;
    location.pathname='/config/dashboard';assert.equal(playback.eligible(),false);location.pathname='/marao-dashboard/security';assert.equal(playback.eligible(),true);
    owner.disposed=true;assert.equal(playback.eligible(),false);
  } finally {globalThis.document=previousDocument;globalThis.location=previousLocation;}
});
