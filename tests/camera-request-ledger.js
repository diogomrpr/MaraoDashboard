// Keep transport diagnostics, but camera playback acceptance belongs to manual use.
// Strict cancellation classification remains available to isolated unit tests.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const SAFE_ENTITY = 'camera.marao_dashboard_test_camera';
const SAFE_ENTITIES = [SAFE_ENTITY, 'camera.marao_dashboard_test_netatmo', ...['slow','adaptive','adaptive_hls'].flatMap(source=>['high','medium','low'].map(quality=>SAFE_ENTITY+'_'+source+'_'+quality))];
const nativeCaller = stack => /https?:\/\/192\.168\.0\.28(?::\d+)?\/frontend_(?:latest|es5)\/[^\s)]+\.js:\d+(?::\d+)?/.test(stack || '');
const nativeTeardown = stack => nativeCaller(stack) && /\b(?:stopLoad|destroy|destroyInternalLoaders|_cleanUp|onMediaDetaching)\b/.test(stack);
const maraoStopCaller = stack => /(?:CameraPlayback\.stop|(?:^|\n)stop@)[^\n]*https?:\/\/192\.168\.0\.28(?::\d+)?\/(?:marao_dashboard_static|api\/marao_dashboard\/frontend\/[a-f0-9]+)\/MaraoCamera\.js[^\s)]*/.test(stack || '');

function provedNativeHandoff(receipt, prefix) {
  const proof = receipt?.proof;
  const sibling = receipt?.siblings?.length === 1 ? receipt.siblings[0] : null;
  const retainedWinner = proof?.video === receipt?.activeVideo;
  const selectedExistingSibling = receipt?.activeTransport === 'ha-hls-player' && receipt.retiringVideo === receipt.activeVideo && sibling?.connected && sibling.sameHost
    && sibling.entitySafe && proof?.selection === 'preexisting-web-rtc' && proof.video === sibling.video && proof.siblingTransport === sibling.transport
    && proof.siblingVisible && proof.retiringHidden && proof.sameSiblingHost;
  return Boolean(receipt && nativeCaller(receipt.stack) && receipt.currentHost && receipt.transport && receipt.prefix === prefix && receipt.activeVideo
    && proof?.valid && proof.wrapper === receipt.wrapper && proof.host === receipt.host && proof.generation === receipt.generation
    && (retainedWinner || selectedExistingSibling) && proof.advanced > .15 && proof.connected
    && (Number.isInteger(receipt.ownStreamRequests) ? proof.ownNewStreamRequests === 0 : proof.newStreamRequests === 0));
}

function provedIneligibleRelease(receipt, prefix) {
  const proof = receipt?.proof;
  return Boolean(receipt && maraoStopCaller(receipt.stack) && receipt.currentHost && receipt.wasConnected && receipt.eligible === false && receipt.prefix === prefix
    && proof?.released && proof.ownershipUnambiguous && proof.originalCameraOrNull && proof.camera === receipt.camera && proof.generation === receipt.generation && proof.hostDisconnected && proof.playerReleased);
}

function provedQualityRelease(receipt, prefix) {
  const p = receipt?.proof;
  return Boolean(receipt && maraoStopCaller(receipt.stack) && /(?:CameraPlayback\.fallback|fallback@)/.test(receipt.stack)
    && receipt.currentHost && receipt.wasConnected && receipt.eligible === true && receipt.prefix === prefix
    && p?.originalCameraOrNull && p.camera === receipt.camera && p.generation === receipt.generation + 1
    && p.hostDisconnected && p.playerReleased && p.quality?.sameConfiguredEntity && p.quality.sameDevice
    && p.quality.lowerResolution && SAFE_ENTITIES.includes(p.quality.selected) && p.quality.selected !== receipt.entity);
}

function provedHandoffDisposal(receipt, prefix, trace) {
  const closure = receipt?.closedByRelease, release = trace.releases?.find(item => item.id === closure?.release);
  return Boolean(closure?.kind === 'marao-ineligible-release' && closure.ownerRetained === true && receipt.currentHost && receipt.transport && receipt.activeVideo && Number.isInteger(receipt.camera)
    && nativeCaller(receipt.stack) && receipt.prefix === prefix && receipt.proof?.valid === false && !receipt.proof.observerError
    && receipt.proof.reason === 'Owner replaced, disconnected or new native stream requested'
    && provedIneligibleRelease(release, prefix) && release.wrapper === receipt.wrapper && release.host === receipt.host && release.camera === receipt.camera
    && Number.isInteger(receipt.generation) && release.generation === receipt.generation + 1
    && Number.isInteger(receipt.order) && release.order > receipt.order && release.date >= receipt.date && release.date - receipt.date <= 5000
    && (Number.isInteger(receipt.ownStreamRequests) ? release.ownStreamRequests === receipt.ownStreamRequests
      : Number.isInteger(receipt.streamRequests) && release.streamRequests === receipt.streamRequests
        && !(trace.streamCalls || []).some(call => call.order > receipt.order && call.order < release.order)));
}

function classifyCameraCancellations(failures, trace) {
  if (trace.documents) {
    const results = trace.documents.map(document => classifyCameraCancellations(failures.filter(failure => failure.document === document.document), document));
    return { accepted: results.flatMap(result => result.accepted), rejected: [...failures.filter(failure => !trace.documents.some(document => document.document === failure.document)), ...results.flatMap(result => result.rejected)], restarts: results.flatMap(result => result.restarts) };
  }
  const used = new Set(), accepted = [], rejected = [];
  for (const failure of failures) {
    const sends = trace.events.filter(event => event.kind === 'send' && event.id === failure.xhr && event.url === failure.url);
    const aborts = trace.events.filter(event => event.kind === 'abort' && event.id === failure.xhr && event.url === failure.url);
    const owned = trace.sessions.find(session => failure.url.startsWith(session.prefix) && SAFE_ENTITIES.includes(session.entity));
    const valid = failure.document === trace.document && typeof trace.document === 'string' && failure.type === 'xhr' && ['net::ERR_ABORTED', 'cancelled'].includes(failure.error)
      && /^\/api\/hls\/[^/]+\/(?:(?:master_)?playlist\.m3u8|init\.mp4|segment\/\d+\.\d+\.m4s)$/.test(new URL(failure.url).pathname)
      && owned && Number.isInteger(failure.xhr) && !used.has(failure.xhr) && sends.length === 1 && nativeCaller(sends[0].stack)
      && aborts.length > 0 && aborts.every(abort => nativeTeardown(abort.stack) && abort.boundary?.entities.includes(owned.entity)
        && [undefined, 'native-handoff', 'marao-ineligible-release', 'marao-quality-release'].includes(abort.boundary.kind)
        && (abort.boundary.kind !== undefined || (Number.isInteger(abort.boundary.id) && typeof abort.boundary.label === 'string'))
        && (abort.boundary.kind !== 'native-handoff' || (() => {
          const receipt = trace.handoffs?.find(receipt => receipt.id === abort.boundary.handoff);
          return provedNativeHandoff(receipt, owned.prefix) || provedHandoffDisposal(receipt, owned.prefix, trace);
        })())
        && (abort.boundary.kind !== 'marao-quality-release' || provedQualityRelease(trace.releases?.find(item => item.id === abort.boundary.release), owned.prefix))
        && (abort.boundary.kind !== 'marao-ineligible-release' || provedIneligibleRelease(trace.releases?.find(item => item.id === abort.boundary.release), owned.prefix)));
    if (valid) { used.add(failure.xhr); accepted.push({ failure, xhr: failure.xhr, nativeAbortReceipts: aborts }); }
    else rejected.push(failure);
  }
  const restarts = trace.events.filter(event => event.kind === 'send' && trace.stops.some(stop => (Number.isInteger(stop.order)
    ? event.order > stop.order && event.order < (stop.endOrder || Infinity) : event.date > stop.date && event.date < (stop.end || Infinity))
    && (stop.prefix ? event.url.startsWith(stop.prefix) : trace.sessions.some(session => stop.entities.includes(session.entity) && event.url.startsWith(session.prefix)))));
  return { accepted, rejected, restarts };
}

function installTrace({ subscriptions = false, entities = ['camera.marao_dashboard_test_camera'] } = {}) {
  Error.stackTraceLimit = 40;
  const documentId = [...crypto.getRandomValues(new Uint32Array(4))].map(value => value.toString(16)).join('-');
  const state = { document: documentId, events: [], sessions: [], stops: [], handoffs: [], releases: [], streamRequests: 0, streamCalls: [], order: 0, boundary: null, next: 0 };
  window.__maraoCameraRequestTrace = state;
  const subscriptionEvent = (direction, message) => {
    if (!subscriptions || !message || typeof message !== 'object') return;
    const item = { direction, date: Date.now(), order: ++state.order, type: message.type, id: message.id,
      boundary: state.boundary ? { kind: state.boundary.kind, id: state.boundary.id, label: state.boundary.label } : null };
    if (direction === 'out') {
      if (Number.isInteger(message.subscription)) item.subscription = message.subscription;
      if (entities.includes(message.entity_id)) item.entity = message.entity_id;
      item.stack = new Error('native WebSocket lifecycle').stack;
    } else if (message.type === 'result') {
      item.success = message.success;
      if (typeof message.error?.code === 'string') item.errorCode = message.error.code;
    }
    state.subscriptionEvents.push(item);
  };
  if (subscriptions) {
    state.subscriptionEvents = [];
    const warn = console.warn;
    console.warn = function (...args) {
      const match = typeof args[0] === 'string' && args[0].match(/^Received event for unknown subscription (\d+)\. Unsubscribing\./);
      if (match) state.subscriptionEvents.push({ direction: 'warning', date: Date.now(), order: ++state.order, subscription: Number(match[1]),
        boundary: state.boundary ? { kind: state.boundary.kind, id: state.boundary.id, label: state.boundary.label } : null, stack: new Error('native unknown subscription warning').stack });
      return warn.apply(this, args);
    };
  }
  const sockets = new WeakMap(), xhrs = new WeakMap();
  const sendSocket = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    if (!sockets.has(this)) {
      const pending = new Map(); sockets.set(this, pending);
      this.addEventListener('message', event => {
        let parsed; try { parsed = JSON.parse(event.data); } catch { return; }
        for (const message of Array.isArray(parsed) ? parsed : [parsed]) {
          subscriptionEvent('in', message);
          const request = pending.get(message?.id), entity = request?.entity;
          if (!entity || message.type !== 'result') continue;
          pending.delete(message.id);
          if (message.success && typeof message.result?.url === 'string') {
            const url = new URL(message.result.url, location.href);
            if (url.origin === location.origin && /^\/api\/hls\/[^/]+\//.test(url.pathname)) {
              const prefix = url.origin + url.pathname.split('/').slice(0, 4).join('/') + '/';
              state.sessions.push({ entity, prefix, requestOrder: request.call?.order });
              for (const stop of state.stops) if (stop.kind === 'marao-ineligible-release' && !stop.end && stop.prefix === prefix && request.call?.order > stop.order) { stop.end = request.call.date; stop.endOrder = request.call.order; }
            }
          }
        }
      });
    }
    const requested = [];
    try { const parsed = JSON.parse(data); for (const message of Array.isArray(parsed) ? parsed : [parsed]) {
      subscriptionEvent('out', message);
      if (message?.type === 'camera/stream' && entities.includes(message.entity_id)) { const request = { entity: message.entity_id }; sockets.get(this).set(message.id, request); requested.push(request); }
    } } catch {}
    const result = sendSocket.call(this, data);
    for (const request of requested) {
      const call = { entity: request.entity, date: Date.now(), order: ++state.order }; request.call = call; state.streamCalls.push(call); state.streamRequests++;
    }
    return result;
  };
  const open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send, abort = XMLHttpRequest.prototype.abort;
  XMLHttpRequest.prototype.open = function (method, url, ...args) { xhrs.set(this, { url: new URL(url, location.href).href }); return open.call(this, method, url, ...args); };
  XMLHttpRequest.prototype.send = function (...args) {
    const item = xhrs.get(this);
    if (item) {
      item.id = ++state.next;
      const url = new URL(item.url);
      // A header gives Playwright the exact originating XHR identity, including
      // concurrent/repeated requests to identical URLs. No media URL is changed.
      if (location.hostname === '192.168.0.28' && url.origin === location.origin && url.pathname.startsWith('/api/hls/')) { this.setRequestHeader('X-Marao-Test-Xhr', String(item.id)); this.setRequestHeader('X-Marao-Test-Document', documentId); }
      state.events.push({ ...item, kind: 'send', order: ++state.order, date: Date.now(), stack: new Error('native XHR send').stack });
    }
    return send.apply(this, args);
  };
  XMLHttpRequest.prototype.abort = function () {
    const item = xhrs.get(this); if (item?.id) state.events.push({ ...item, kind: 'abort', order: ++state.order, date: Date.now(), boundary: state.boundary, stack: new Error('native XHR abort').stack });
    return abort.call(this);
  };

  // Standard DOM operations provide the synchronous native disconnect cause.
  // No HA method, private transport field or production component is patched.
  const owners = new Map(), identities = new WeakMap(); let nextOwner = 0, proveHandoff;
  const startHandoffProof = receipt => {
    const owner = owners.get(receipt.id);
    owner.promise ||= proveHandoff(receipt).catch(error => { receipt.proof = { valid: false, observerError: error.name || 'Error', reason: 'Handoff proof observation failed' }; });
    return owner.promise;
  };
  const identity = node => { if (!node) return null; if (!identities.has(node)) identities.set(node, ++nextOwner); return identities.get(node); };
  const ancestor = (node, tag) => { for (let current = node; current; current = current.parentNode || current.host) if (current.localName === tag) return current; };
  const cameraWrapper = node => {
    for (let current = node; current; current = current.parentNode || current.host) if (current.hasAttribute?.('data-marao-camera-preload')) return current;
    return ancestor(node, 'marao-card');
  };
  const cameraFor = wrapper => {
    const surface = ancestor(wrapper, 'hui-root')?.shadowRoot?.querySelector('[data-marao-navigation-surface]');
    const sessions = [...(surface?._navigationRecord?.cameraPreload?.sessions.values() || [])]
      .filter(entry => entry.host === wrapper || entry.lease?.card === wrapper);
    return sessions.length ? sessions.length === 1 ? sessions[0].playback : null : wrapper?._camera;
  };
  const visibleWithin = (node, host) => {
    if (!node?.isConnected) return false;
    for (let current = node; current; current = current.parentNode || current.host) {
      if (current === host) return true;
      if (current.nodeType === 1 && (current.hidden || getComputedStyle(current).display === 'none' || getComputedStyle(current).visibility === 'hidden')) return false;
    }
    return false;
  };
  const openRoots = node => {
    const roots = [node], seen = new Set(roots);
    for (let index = 0; index < roots.length; index++) for (const element of [roots[index], ...roots[index].querySelectorAll('*')]) if (element.shadowRoot && !seen.has(element.shadowRoot)) { seen.add(element.shadowRoot); roots.push(element.shadowRoot); }
    return roots;
  };
  const currentPrefix = host => {
    const publicUrls = openRoots(host).flatMap(root => [...root.querySelectorAll('ha-hls-player')].filter(element => typeof element.url === 'string' && element.url).map(element => element.url));
    const owned = [...new Set(state.sessions.filter(session => session.entity === host.stateObj?.entity_id).map(session => session.prefix))];
    const prefixes = [...new Set(publicUrls.map(value => { try { const url = new URL(value, location.href); return url.origin + url.pathname.split('/').slice(0, 4).join('/') + '/'; } catch { return null; } }))];
    return { prefix: publicUrls.length ? (prefixes.length === 1 ? prefixes[0] : null) : (owned.length === 1 ? owned[0] : null), publicUrls,
      prefixSource: publicUrls.length ? 'public owned HLS url' : 'unique owned camera/stream reply' };
  };
  const nativeOperation = (node, operation, invoke) => {
    const outerBoundary = state.boundary;
    const entity = node?.stateObj?.entity_id || node?.entityid;
    if (!node?.isConnected || outerBoundary && (!entity || outerBoundary.entities.includes(entity))) return invoke();
    if (node.localName === 'ha-camera-stream') {
      const wrapper = cameraWrapper(node), camera = cameraFor(wrapper);
      if (!entities.includes(node.stateObj?.entity_id) || !camera) return invoke();
      const stack = new Error('Marao native host release').stack;
      const receipt = { id: state.releases.length + 1, stack, date: Date.now(), order: ++state.order, wrapper: identity(wrapper), host: identity(node), camera: identity(camera), generation: camera.generation,
        entity: node.stateObj.entity_id, configured: camera.entity, currentHost: camera.player === node, wasConnected: node.isConnected, eligible: camera.eligible(), streamRequests: state.streamRequests, ownStreamRequests: camera.streamRequests, ...currentPrefix(node) };
      state.releases.push(receipt);
      const stop = /(?:CameraPlayback\.stop|(?:^|\n)stop@)[^\n]*https?:\/\/192\.168\.0\.28(?::\d+)?\/(?:marao_dashboard_static|api\/marao_dashboard\/frontend\/[a-f0-9]+)\/MaraoCamera\.js[^\s)]*/.test(stack);
      if (!stop) return invoke();
      const qualityRelease = /(?:CameraPlayback\.fallback|fallback@)/.test(stack);
      state.boundary = { kind: qualityRelease ? 'marao-quality-release' : 'marao-ineligible-release', release: receipt.id, entities: [receipt.entity], date: receipt.date };
      try { return invoke(); } finally {
        state.boundary = outerBoundary;
        queueMicrotask(() => {
          const consumers = [...new Set(openRoots(document).flatMap(root => [...root.querySelectorAll('marao-card')]))]
            .map(card => ({ card, camera: cameraFor(card) })).filter(item => item.camera?.player && item.camera.player !== node && item.camera.player.isConnected
              && item.camera.player.stateObj?.entity_id === node.stateObj.entity_id && item.camera.eligible())
            .map(item => ({ wrapper: identity(item.card), host: identity(item.camera.player), ...currentPrefix(item.camera.player) }));
          receipt.proof = { originalCameraOrNull: cameraFor(wrapper) === camera || cameraFor(wrapper) == null, camera: identity(camera), generation: camera.generation, hostDisconnected: !node.isConnected, playerReleased: camera.player !== node,
            released: !node.isConnected && camera.player !== node && !camera.attempt, ownershipUnambiguous: Boolean(receipt.prefix) && consumers.every(item => item.prefix), remainingConsumers: consumers };
          if (qualityRelease) {
            const selected = camera.streamEntity, registry = camera.hass.entities || {}, old = camera.hass.states[receipt.entity]?.attributes || {}, next = camera.hass.states[selected]?.attributes || {};
            receipt.proof.quality = { selected, sameConfiguredEntity: camera.entity === receipt.configured,
              sameDevice: Boolean(registry[selected]?.device_id) && registry[selected].device_id === registry[receipt.entity]?.device_id,
              lowerResolution: next.width * next.height > 0 && next.width * next.height < old.width * old.height };
            if (receipt.prefix && receipt.proof.ownershipUnambiguous && receipt.proof.hostDisconnected && receipt.proof.playerReleased && !consumers.some(item => item.prefix === receipt.prefix))
              state.stops.push({kind:'marao-quality-release',entities:[receipt.entity],prefix:receipt.prefix,date:receipt.date,order:receipt.order});
          }
          if (receipt.eligible === false && receipt.currentHost && receipt.wasConnected && receipt.proof.released && receipt.proof.originalCameraOrNull
            && receipt.proof.generation === receipt.generation && receipt.proof.ownershipUnambiguous) {
            for (const handoff of state.handoffs) {
              const owner = owners.get(handoff.id);
              if (!handoff.proof && owner?.camera === camera && owner.wrapper === wrapper && owner.host === node
                && receipt.generation === handoff.generation + 1 && receipt.prefix === handoff.prefix
                && (Number.isInteger(handoff.ownStreamRequests) ? receipt.ownStreamRequests === handoff.ownStreamRequests : receipt.streamRequests === handoff.streamRequests)
                && receipt.order > handoff.order && receipt.date >= handoff.date && receipt.date - handoff.date <= 5000) {
                handoff.closedByRelease = { kind: 'marao-ineligible-release', release: receipt.id, ownerRetained: true };
                owner.wake?.('ineligible-release');
              }
            }
          }
          if (receipt.eligible === false && receipt.currentHost && receipt.proof.released && receipt.proof.originalCameraOrNull && receipt.proof.generation === receipt.generation
            && receipt.proof.ownershipUnambiguous && !consumers.some(item => item.prefix === receipt.prefix)) {
            const recovery = state.streamCalls.find(call => call.order > receipt.order && state.sessions.some(session => session.prefix === receipt.prefix && session.requestOrder === call.order));
            state.stops.push({ kind: 'marao-ineligible-release', entities: [receipt.entity], prefix: receipt.prefix, date: receipt.date, order: receipt.order, ...(recovery ? { end: recovery.date, endOrder: recovery.order } : {}) });
          }
        });
      }
    }
    const transports = [...(node.localName === 'ha-hls-player' ? [node] : []), ...(node.querySelectorAll?.('ha-hls-player') || [])]
      .filter(transport => entities.includes(transport.entityid));
    // Multiple descendants cannot identify a particular loader safely.
    if (transports.length !== 1) return invoke();
    const transport = transports[0], host = ancestor(transport, 'ha-camera-stream'), wrapper = cameraWrapper(host);
    if (!wrapper || !entities.includes(host?.stateObj?.entity_id)) return invoke();
    const stack = new Error('native HLS DOM disconnect').stack;
    const native = /https?:\/\/192\.168\.0\.28(?::\d+)?\/frontend_(?:latest|es5)\/[^\s)]+\.js:\d+(?::\d+)?/.test(stack);
    const publicUrl = typeof transport.url === 'string' ? transport.url : null;
    const prefixes = [...new Set(state.sessions.filter(session => session.entity === transport.entityid).map(session => session.prefix))];
    let prefix = prefixes.length === 1 ? prefixes[0] : null;
    if (publicUrl) { const url = new URL(publicUrl, location.href); prefix = url.origin + url.pathname.split('/').slice(0, 4).join('/') + '/'; }
    const active = cameraFor(wrapper)?.video, activeTransport = ancestor(active, 'ha-hls-player') || ancestor(active, 'ha-web-rtc-player');
    const siblings = [...new Set(openRoots(host).flatMap(root => [...root.querySelectorAll('ha-web-rtc-player')]))]
      .flatMap(sibling => [...new Set(openRoots(sibling).flatMap(root => [...root.querySelectorAll('video')]))].map(video => ({ sibling, video })));
    const candidate = siblings.length === 1 ? siblings[0] : null;
    const receipt = { id: state.handoffs.length + 1, operation, date: Date.now(), order: ++state.order, stack, prefix, publicUrl,
      prefixSource: publicUrl ? 'public transport url' : 'unique owned camera/stream reply', wrapper: identity(wrapper), host: identity(host), transport: identity(transport),
      camera: identity(cameraFor(wrapper)), generation: cameraFor(wrapper)?.generation, activeVideo: identity(active), activeTransport: activeTransport?.localName, activeTransportId: identity(activeTransport),
      retiringVideo: ancestor(active, 'ha-hls-player') === transport ? identity(active) : null,
      siblings: siblings.map(item => ({ transport: identity(item.sibling), video: identity(item.video), connected: item.video.isConnected && item.sibling.isConnected,
        sameHost: ancestor(item.sibling, 'ha-camera-stream') === host, entitySafe: item.sibling.entityid === transport.entityid, visibleBefore: visibleWithin(item.video, host),
        timeBefore: item.video.currentTime, pausedBefore: item.video.paused, readyBefore: item.video.readyState })),
      currentHost: cameraFor(wrapper)?.player === host, streamRequests: state.streamRequests, ownStreamRequests: cameraFor(wrapper)?.streamRequests, selectionSamples: [] };
    state.handoffs.push(receipt); owners.set(receipt.id, { wrapper, host, camera: cameraFor(wrapper), retiring: transport, retiringVideo: activeTransport === transport ? active : null, candidate });
    if (!native) return invoke();
    state.boundary = { kind: 'native-handoff', handoff: receipt.id, entities: [transport.entityid], date: receipt.date };
    try { return invoke(); } finally { state.boundary = outerBoundary; queueMicrotask(() => startHandoffProof(receipt)); }
  };
  const remove = Element.prototype.remove, removeChild = Node.prototype.removeChild, insertBefore = Node.prototype.insertBefore;
  Element.prototype.remove = function () { return nativeOperation(this, 'remove', () => remove.call(this)); };
  Node.prototype.removeChild = function (node) { return nativeOperation(node, 'removeChild', () => removeChild.call(this, node)); };
  Node.prototype.insertBefore = function (node, reference) { return nativeOperation(node, 'move', () => insertBefore.call(this, node, reference)); };
  proveHandoff = async receipt => {
    if (!receipt.proof) {
      receipt.proofStarted = Date.now();
      const owner = owners.get(receipt.id), { wrapper, host, retiring, retiringVideo, candidate } = owner, deadline = receipt.proofStarted + 5000;
      receipt.proofDeadline = deadline; receipt.observationWakeups = [];
      let video, started, stableSince, source = 'native-operation', cleanupPending = () => {};
      const nextSample = target => new Promise(resolve => {
        let settled = false, timer;
        const cleanup = () => {
          clearTimeout(timer);
          target?.removeEventListener('playing', playing); target?.removeEventListener('timeupdate', timeupdate);
          if (owner.wake === wake) owner.wake = null;
        };
        const wake = cause => {
          if (settled) return;
          settled = true; cleanup(); source = cause;
          receipt.observationWakeups.push({ source, date: Date.now(), elapsedMs: Date.now() - receipt.date,
            phase: cameraFor(wrapper)?.state, withinDeadline: Date.now() < deadline });
          resolve();
        };
        const playing = () => wake('playing'), timeupdate = () => wake('timeupdate');
        cleanupPending = cleanup; owner.wake = wake;
        target?.addEventListener('playing', playing); target?.addEventListener('timeupdate', timeupdate);
        timer = setTimeout(() => wake('timer'), Math.min(50, Math.max(0, deadline - Date.now())));
      });
      try {
        do {
          if (Date.now() >= deadline) break;
          const camera = cameraFor(wrapper);
          const proof = { wrapper: identity(wrapper), host: identity(camera?.player), generation: camera?.generation,
            connected: wrapper.isConnected && host.isConnected, newStreamRequests: state.streamRequests - receipt.streamRequests,
            ownNewStreamRequests: Number.isInteger(receipt.ownStreamRequests) && Number.isInteger(camera?.streamRequests) ? camera.streamRequests - receipt.ownStreamRequests : undefined };
          const restarted = Number.isInteger(receipt.ownStreamRequests) ? proof.ownNewStreamRequests !== 0 : proof.newStreamRequests !== 0;
          if (!proof.connected || camera?.player !== host || camera.generation !== receipt.generation || restarted) { receipt.proof = { ...proof, valid: false, reason: 'Owner replaced, disconnected or new native stream requested' }; break; }
          const siblingVisible = candidate && visibleWithin(candidate.video, host), retiringHidden = !retiring.isConnected || !visibleWithin(retiringVideo, host);
          const sameSiblingHost = candidate && candidate.sibling.isConnected && candidate.sibling.entityid === host.stateObj.entity_id && ancestor(candidate.sibling, 'ha-camera-stream') === host;
          const parkedPreload = wrapper.hasAttribute?.('data-marao-camera-preload') && wrapper.getAttribute?.('aria-hidden') === 'true' && getComputedStyle(wrapper).opacity === '0';
          const retained = identity(camera.video) === receipt.activeVideo;
          const selected = receipt.retiringVideo === receipt.activeVideo && receipt.activeTransport === 'ha-hls-player' && candidate && camera.video === candidate.video && sameSiblingHost && siblingVisible && retiringHidden;
          receipt.selectionSamples.push({ elapsedMs: Date.now() - receipt.date, source, phase: state.boundary?.label || state.boundary?.kind || 'native handoff observation',
            withinDeadline: Date.now() < deadline, state: camera.state, video: identity(camera.video), time: camera.video?.currentTime,
            paused: camera.video?.paused, readyState: camera.video?.readyState, connected: camera.video?.isConnected, visible: visibleWithin(camera.video, host),
            siblingVideo: identity(candidate?.video), siblingVisible: Boolean(siblingVisible), retiringHidden, sameSiblingHost: Boolean(sameSiblingHost) });
          if (camera.state === 'live' && !retained && !(candidate && camera.video === candidate.video && receipt.retiringVideo === receipt.activeVideo)) { receipt.proof = { ...proof, valid: false, reason: 'Winning video changed without a preexisting native sibling' }; break; }
          if ((retained || selected) && camera.video?.isConnected && visibleWithin(camera.video, host) && !camera.video.paused && camera.video.readyState >= 2) {
            if (video !== camera.video) { video = camera.video; started = video.currentTime; stableSince = Date.now(); }
            if (Date.now() < deadline && (camera.state === 'live' || parkedPreload && camera.state === 'loading') && Date.now() - stableSince >= 250 && video.currentTime > started + .15) { receipt.proof = { ...proof, valid: true, video: identity(video), advanced: video.currentTime - started,
              parkedPreload: Boolean(parkedPreload), playbackState: camera.state, selection: selected ? 'preexisting-web-rtc' : 'retained', siblingTransport: identity(candidate?.sibling), siblingVisible: Boolean(siblingVisible), retiringHidden, sameSiblingHost: Boolean(sameSiblingHost) }; break; }
          } else { video = null; }
          await nextSample((retained || selected) && camera.video?.isConnected ? camera.video : null);
        } while (!receipt.proof);
        receipt.proof ||= { valid: false, reason: 'Winning video did not settle and advance', deadlineExceeded: Date.now() >= deadline };
      } finally { cleanupPending(); receipt.observerCleaned = true; receipt.proofFinished = Date.now(); }
    }
  };
  window.__maraoProveCameraHandoffs = async () => {
    // Another native transport can settle while an earlier proof is pending.
    let count;
    do { count = state.handoffs.length; await Promise.all(state.handoffs.map(startHandoffProof)); }
    while (state.handoffs.length !== count);
  };
}

function isManualCameraTransport(url) {
  try { return /^\/api\/(?:hls\/|camera_proxy_stream\/)/.test(new URL(url).pathname); }
  catch { return false; }
}

async function cameraRequestLedger(context, { output, scenario, theme, manualTransport = false }) {
  if (!manualTransport) await context.addInitScript(installTrace, { subscriptions: process.env.MARAO_CAMERA_SUBSCRIPTION_DIAGNOSTIC === '1', entities: SAFE_ENTITIES });
  let page, sequence = 0, lastTrace, stoppedForClose = false; const failures = [], manualResponses = [], starts = new WeakMap(), documents = new Map(), pending = new Map();
  const safe = value => {
    if (Array.isArray(value)) return value.map(safe);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, (key === 'url' || key === 'prefix') && typeof item === 'string'
      ? { path: new URL(item).pathname.replace(/(\/api\/hls\/)[^/]+/, '$1[session]'), identity: crypto.createHash('sha256').update(item).digest('hex').slice(0, 20) } : safe(item)]));
    return typeof value === 'string' ? value.replace(/https?:\/\/[^\s)]+/g, url => { try { return new URL(url).pathname.replace(/(\/api\/hls\/)[^/]+/, '$1[session]'); } catch { return '[url]'; } })
      .replace(/(\/api\/hls\/)[^/\s)"'?]+/g, '$1[session]') : value;
  };
  const ledger = {
    isClosed() { return page.isClosed(); },
    attach(subject) {
      page = subject; page.__cameraRequestLedger = ledger;
      page.on('request', request => {
        starts.set(request, Date.now());
        if (manualTransport && !isManualCameraTransport(request.url()) && !['websocket', 'eventsource'].includes(request.resourceType())) {
          let resolve;
          const promise = new Promise(done => { resolve = done; });
          pending.set(request, { promise, resolve });
        }
      });
      const finished = request => { const item = pending.get(request); pending.delete(request); item?.resolve(); };
      page.on('requestfinished', finished);
      if (manualTransport) page.on('response', response => {
        if (isManualCameraTransport(response.url()) && response.status() >= 400) manualResponses.push({ url: response.url(), status: response.status() });
      });
      page.on('requestfailed', request => {
        failures.push({ url: request.url(), type: request.resourceType(), error: request.failure()?.errorText || 'unknown error',
          xhr: Number(request.headers()['x-marao-test-xhr']) || null, document: request.headers()['x-marao-test-document'] || null, started: starts.get(request), date: Date.now() });
        finished(request);
      });
    },
    async checkpoint() {
      if (manualTransport) return null;
      const trace = page.isClosed() ? null : await page.evaluate(() => window.__maraoCameraRequestTrace || null);
      if (trace) { if (lastTrace?.document !== trace.document) stoppedForClose = false; lastTrace = trace; documents.set(trace.document, trace); }
      return trace;
    },
    async resume() { if (manualTransport) return; await page.evaluate(() => { const state = window.__maraoCameraRequestTrace; for (const stop of state.stops) if (!stop.end && !['marao-ineligible-release', 'marao-quality-release'].includes(stop.kind)) { stop.end = Date.now(); stop.endOrder = ++state.order; } }); },
    async settleHandoffs() { if (!manualTransport && !page.isClosed()) await page.evaluate(() => window.__maraoProveCameraHandoffs?.()); },
    async boundary(label, action, { terminal = true, entities = [SAFE_ENTITY] } = {}) {
      if (manualTransport) return action();
      assert.ok(entities.length && entities.every(entity => SAFE_ENTITIES.includes(entity)));
      const id = ++sequence;
      await page.evaluate(async ({ id, label, entities }) => { await window.__maraoProveCameraHandoffs?.(); const state = window.__maraoCameraRequestTrace; if (state.boundary) throw Error('Nested camera release boundary'); state.boundary = { id, label, entities, date: Date.now() }; }, { id, label, entities });
      try {
        await action();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        if (terminal) await page.evaluate(entities => { const state = window.__maraoCameraRequestTrace; state.stops.push({ entities, date: Date.now(), order: ++state.order }); }, entities);
        await page.waitForTimeout(250);
      } finally { await page.evaluate(() => { window.__maraoCameraRequestTrace.boundary = null; }); }
    },
    async assert() {
      if (manualTransport) {
        const rejected = failures.filter(failure => !isManualCameraTransport(failure.url));
        fs.mkdirSync(output, { recursive: true, mode: 0o700 });
        fs.writeFileSync(path.join(output, `camera-requests-${scenario}-${theme}.json`), JSON.stringify(safe({
          scope: 'Camera transport is manual-only by user instruction; observations are not a passing playback check.',
          manual_camera_transport: true, failures, manual_responses: manualResponses, rejected,
        }), null, 2), { mode: 0o600 });
        assert.equal(rejected.length, 0, `Unexpected non-camera request failures: ${JSON.stringify(safe(rejected))}`);
        return;
      }
      await ledger.settleHandoffs();
      await ledger.checkpoint();
      if (!documents.size) { assert.equal(failures.length, 0, 'Uninitialized context reported a failed request'); return; }
      const trace = { documents: [...documents.values()] };
      const result = classifyCameraCancellations(failures, trace);
      fs.mkdirSync(output, { recursive: true, mode: 0o700 });
      fs.writeFileSync(path.join(output, `camera-requests-${scenario}-${theme}.json`), JSON.stringify(safe({ scope: 'Every raw failed request retained; cancellation requires an exact owned native XHR abort within a commanded release, proved ineligible-camera disposal, or proved stable native reorder.', failures, trace, ...result }), null, 2), { mode: 0o600 });
      assert.equal(result.rejected.length, 0, `Unexpected camera-context request failures: ${JSON.stringify(safe(result.rejected))}`);
      assert.equal(result.restarts.length, 0, `Retired camera session requested media after stop: ${JSON.stringify(safe(result.restarts))}`);
      const observerErrors = trace.documents.flatMap(document => document.handoffs || []).filter(receipt => receipt.proof?.observerError);
      assert.equal(observerErrors.length, 0, `Native handoff proof observer failed: ${JSON.stringify(safe(observerErrors))}`);
    },
    async stopForClose() {
      if (manualTransport) {
        if (page.isClosed()) return ledger.assert();
        // Unmount the application so prefetch stops scheduling successors while its finite requests drain.
        await page.evaluate(() => document.querySelector('home-assistant')?.remove());
        let timer;
        try {
          await Promise.race([
            (async () => { while (pending.size) await Promise.all([...pending.values()].map(item => item.promise)); })(),
            // The gallery's delayed history responses also wait for a shared HTTP connection.
            new Promise((_, reject) => { timer = setTimeout(() => reject(Error(`Finite requests did not finish before navigation: ${JSON.stringify(safe([...pending.keys()].map(request => ({ url: request.url(), type: request.resourceType(), age_ms: Date.now() - starts.get(request) }))))}`)), 30000); }),
          ]);
        } finally { clearTimeout(timer); }
        return ledger.assert();
      }
      if (!await ledger.checkpoint()) return ledger.assert();
      if (stoppedForClose) return ledger.assert();
      await ledger.boundary('final context release', async () => {
        await page.locator('marao-card').evaluateAll(async cards => {
          // Preloaded streams belong to the dashboard lifetime, beyond visible cards.
          document.querySelector('home-assistant')?.remove();
          for (const card of cards) card.remove();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          if (cards.some(card => card._camera?.player)) throw Error('Camera session survived final context release');
        });
      }, {entities: SAFE_ENTITIES});
      // The shell is gone; finish its finite fetches before navigation aborts them.
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      stoppedForClose = true;
      await ledger.assert();
    },
    async beforeNavigation() { await ledger.stopForClose(); await ledger.checkpoint(); },
  };
  return ledger;
}

function sameDocumentHashNavigation(current, target) {
  try { const before = new URL(current), after = new URL(target, current); return before.origin === after.origin && before.pathname === after.pathname && before.search === after.search && before.hash !== after.hash; }
  catch { return false; }
}

const managedBrowsers = new WeakMap();
async function managedCameraLedger(context, page, options) {
  let ledger;
  try { ledger = await cameraRequestLedger(context, { ...options, manualTransport: true }); ledger.attach(page); }
  catch (error) {
    try { await context.close(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Managed camera ledger setup and context cleanup failed'); }
    throw error;
  }
  const goto = page.goto.bind(page), closeContext = context.close.bind(context), browser = context.browser();
  page.goto = async (url, ...args) => {
    if (!sameDocumentHashNavigation(page.url(), url)) await ledger.beforeNavigation();
    return goto(url, ...args);
  };
  const close = async action => {
    const errors = [];
    try { await ledger.stopForClose(); } catch (error) { errors.push(error); }
    try { await action(); } catch (error) { errors.push(error); }
    try { await ledger.assert(); } catch (error) { errors.push(error); }
    if (errors.length) throw new AggregateError(errors, 'Managed camera release/close diagnostics failed');
  };
  context.close = async (...args) => { try { return await close(() => closeContext(...args)); } finally { if (page.isClosed()) managedBrowsers.get(browser)?.ledgers.delete(ledger); } };
  let managed = managedBrowsers.get(browser);
  if (!managed) {
    const closeBrowser = browser.close.bind(browser); managed = { ledgers: new Set() }; managedBrowsers.set(browser, managed);
    browser.close = async (...args) => {
      const active = [...managed.ledgers], errors = [];
      for (const item of active) try { await item.stopForClose(); } catch (error) { errors.push(error); }
      try { await closeBrowser(...args); } catch (error) { errors.push(error); }
      for (const item of active) try { await item.assert(); } catch (error) { errors.push(error); }
      for (const item of active) if (item.isClosed()) managed.ledgers.delete(item);
      if (errors.length) throw new AggregateError(errors, 'Managed camera release/browser close diagnostics failed');
    };
  }
  managed.ledgers.add(ledger);
  return ledger;
}

module.exports = { isManualCameraTransport, cameraRequestLedger, managedCameraLedger, sameDocumentHashNavigation, classifyCameraCancellations, installTrace };
