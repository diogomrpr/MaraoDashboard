const operations = new WeakMap();
const recoveryParameter = 'marao_cache_bust';
export const NAVBAR_HOLD_MS = 3000;
const failure = code => Object.assign(new Error(code), { code });

export function cleanFrontendRefreshURL(href) {
  const url = new URL(href);
  url.searchParams.delete(recoveryParameter);
  return url.href;
}

// HA's ha_cache_bust cleanup drops the fragment. Own this transient parameter and preserve the complete route.
if (globalThis.window?.location?.href && new URL(window.location.href).searchParams.has(recoveryParameter)) {
  window.history.replaceState(window.history.state, '', cleanFrontendRefreshURL(window.location.href));
}

function bounded(task, milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const finish = (callback, value) => { clearTimeout(timer); signal.removeEventListener('abort', abort); callback(value); };
    const abort = () => finish(reject, signal.reason);
    const timer = setTimeout(() => finish(reject, failure('timeout')), milliseconds);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) { abort(); return; }
    Promise.resolve().then(task).then(value => finish(resolve, value), error => finish(reject, error));
  });
}

export function frontendRefreshURL(href, stamp = Date.now()) {
  const url = new URL(href);
  url.searchParams.set(recoveryParameter, String(stamp));
  return url.href;
}

// Delete frontend responses only; Cache Storage can also contain unrelated application data.
export async function clearFrontendCaches(host, signal) {
  const origin = host.location.origin;
  const check = () => { if (signal.aborted) throw signal.reason; };
  if (host.navigator.serviceWorker?.getRegistrations) {
    for (const registration of await host.navigator.serviceWorker.getRegistrations()) {
      check();
      const worker = registration.active || registration.waiting || registration.installing;
      if (!worker) continue;
      const url = new URL(worker.scriptURL);
      if (url.origin === origin && url.pathname === '/service_worker.js') await registration.unregister();
    }
  }
  if (!host.caches) return;
  for (const key of await host.caches.keys()) {
    check();
    const cache = await host.caches.open(key);
    for (const request of await cache.keys()) {
      check();
      const url = new URL(request.url);
      if (url.origin === origin && (['/', host.location.pathname].includes(url.pathname)
        || /^\/(frontend_latest|frontend_es5|static|marao_dashboard_static)\//.test(url.pathname))) await cache.delete(request);
    }
  }
}

export const frontendRefreshInProgress = (host = window) => operations.has(host);

export function refreshFrontend({ host = window, isDirty = () => host.isDirtyState, onStatus = () => {}, beforeClear = () => {} } = {}) {
  if (operations.has(host)) return operations.get(host);
  const controller = new AbortController(), { signal } = controller;
  const originalURL = host.location.href;
  let departed = false;
  const leave = () => { departed = true; controller.abort(failure('departed')); };
  const interrupt = () => controller.abort(failure('interrupted'));
  const visibility = () => { if (host.document.visibilityState === 'hidden') interrupt(); };
  const active = () => {
    if (signal.aborted) throw signal.reason;
    if (host.location.href !== originalURL) throw failure('interrupted');
    if (isDirty()) throw failure('unsaved');
    if (host.document.visibilityState === 'hidden') throw failure('interrupted');
  };
  const operation = Promise.resolve().then(async () => {
    active(); onStatus('refreshing');
    host.addEventListener('pagehide', leave, { once: true });
    host.addEventListener('blur', interrupt, { once: true });
    host.document.addEventListener('visibilitychange', visibility);
    for (const type of ['location-changed', 'popstate', 'hashchange']) host.addEventListener(type, interrupt);
    let response;
    try {
      // HA dashboard views reject HEAD (405); its static asset route supports an uncached, read-only probe.
      const probeURL = new URL('/marao_dashboard_static/MaraoFrontendRefresh.js', host.location.origin);
      response = await bounded(() => host.fetch(probeURL.href, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal }), 5000, signal);
    } catch (error) { if (signal.aborted) throw error; throw failure('offline'); }
    if (!response.ok) throw failure('offline');
    active();
    beforeClear();
    const bridge = host.webkit?.messageHandlers?.externalBus;
    if (bridge?.postMessage) {
      try { bridge.postMessage({ id: Date.now(), type: 'frontend/reload_and_clear_cache' }); }
      catch (error) { host.console?.warn('Marao native frontend refresh failed', error); }
      // This native command has no acknowledgement. An old app may silently ignore it.
      await bounded(() => new Promise(() => {}), 2000, signal).catch(error => { if (error.code !== 'timeout') throw error; });
      active();
    }
    const cleanup = new AbortController();
    const abortCleanup = () => cleanup.abort(signal.reason);
    signal.addEventListener('abort', abortCleanup, { once: true });
    try { await bounded(() => clearFrontendCaches(host, cleanup.signal), 2000, signal); }
    catch (error) {
      if (signal.aborted) throw error;
      host.console?.warn('Marao frontend cache cleanup failed', error);
    } finally { cleanup.abort(failure('interrupted')); signal.removeEventListener('abort', abortCleanup); }
    active();
    const freshURL = frontendRefreshURL(originalURL);
    // Older Android apps intercept location.replace as an external link. Reload the updated current entry instead.
    if (host.externalApp || host.externalAppV2) {
      host.history.replaceState(host.history.state, '', freshURL);
      host.location.reload();
    } else host.location.replace(freshURL);
    await bounded(() => new Promise(() => {}), 5000, signal);
  }).catch(error => {
    if (departed) return { departed: true };
    onStatus(error.code || 'failed');
    throw error;
  }).finally(() => {
    controller.abort(failure('interrupted'));
    host.removeEventListener('pagehide', leave);
    host.removeEventListener('blur', interrupt);
    host.document.removeEventListener('visibilitychange', visibility);
    for (const type of ['location-changed', 'popstate', 'hashchange']) host.removeEventListener(type, interrupt);
    operations.delete(host);
  });
  operations.set(host, operation);
  return operation;
}

export function bindNavbarRefresh(nav, { eligible, progress, complete, haptic }) {
  const doc = nav.ownerDocument, host = doc.defaultView;
  let gesture, armTimer, finishTimer, frame, suppressed, pointerStarted = false;
  const clearSuppression = () => { suppressed = null; };
  const stopTracking = () => {
    clearTimeout(armTimer); clearTimeout(finishTimer); host.cancelAnimationFrame(frame);
    for (const [type, listener] of tracking) doc.removeEventListener(type, listener, true);
    host.removeEventListener('blur', cancel);
  };
  const suppress = pointerId => { suppressed = pointerId; };
  const cancel = () => {
    if (!gesture) return;
    suppress(gesture.id); gesture = null; stopTracking(); progress(null);
  };
  const paint = () => {
    if (!gesture || !eligible() || doc.visibilityState === 'hidden') { cancel(); return; }
    progress(Math.min(1, (host.performance.now() - gesture.started) / NAVBAR_HOLD_MS));
    frame = host.requestAnimationFrame(paint);
  };
  const finish = () => {
    if (!gesture || !eligible() || doc.visibilityState === 'hidden') { cancel(); return; }
    const remaining = NAVBAR_HOLD_MS - (host.performance.now() - gesture.started);
    if (remaining > 0) { finishTimer = setTimeout(finish, remaining); return; }
    suppress(gesture.id); gesture = null; stopTracking(); haptic(); progress(1); complete();
  };
  const move = event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const box = nav.getBoundingClientRect();
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10
      || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) cancel();
  };
  const end = event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (event.type === 'pointercancel' || gesture.armed) { cancel(); return; }
    gesture = null; stopTracking(); progress(null);
  };
  const second = event => { if (gesture && event.pointerId !== gesture.id) cancel(); };
  const tracking = [['pointermove', move], ['pointerup', end], ['pointercancel', end], ['pointerdown', second], ['scroll', cancel], ['visibilitychange', cancel]];
  const down = event => {
    if (gesture) { cancel(); return; }
    if (event.isPrimary === false || (event.button !== undefined && event.button !== 0) || !eligible()) return;
    pointerStarted = true;
    clearSuppression();
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, started: host.performance.now(), armed: false };
    for (const [type, listener] of tracking) doc.addEventListener(type, listener, true);
    host.addEventListener('blur', cancel);
    armTimer = setTimeout(() => {
      if (!gesture || !eligible()) { cancel(); return; }
      gesture.armed = true; haptic(); paint();
    }, 500);
    finishTimer = setTimeout(finish, NAVBAR_HOLD_MS);
  };
  const click = event => {
    if (event.detail === 0) return;
    // A reload can finish under a held finger. Its release must not activate the new document's navbar.
    const orphan = !pointerStarted;
    pointerStarted = false;
    if (!orphan && (suppressed == null || (event.pointerId !== undefined && event.pointerId !== suppressed))) return;
    event.preventDefault(); event.stopImmediatePropagation(); clearSuppression();
  };
  const context = event => { if (eligible()) event.preventDefault(); };
  nav.addEventListener('pointerdown', down);
  nav.addEventListener('click', click, true);
  nav.addEventListener('contextmenu', context, true);
  nav.addEventListener('dragstart', context, true);
  return { cancel, destroy() {
    cancel(); clearSuppression(); stopTracking();
    nav.removeEventListener('pointerdown', down); nav.removeEventListener('click', click, true); nav.removeEventListener('contextmenu', context, true); nav.removeEventListener('dragstart', context, true);
  } };
}
