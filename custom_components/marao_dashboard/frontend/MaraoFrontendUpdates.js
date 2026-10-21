const { refreshFrontend, frontendRefreshInProgress } = await import(new URL(`./MaraoFrontendRefresh.js${new URL(import.meta.url).search}`, import.meta.url));

// One document owns the subscription, even when HA replaces its navbar or view.
export function createFrontendUpdates({ host = window, loadedVersion, context, refresh = refreshFrontend }) {
  let hass, connection, unsubscribe, subscribing = false, stopped = false, busy = false, attempted = false;
  let current, terminal = '', offline = false, generation = 0, subscriptionFailed = false, connected = false;
  const pending = new Map(), pointers = new Set();
  const storageKey = dashboard => `marao:frontend-refresh:${dashboard}`;
  const read = dashboard => JSON.parse(host.sessionStorage.getItem(storageKey(dashboard)) || '{"requests":[]}');
  const write = (dashboard, value) => host.sessionStorage.setItem(storageKey(dashboard), JSON.stringify(value));
  const report = state => context().status?.(state);
  const active = () => {
    const view = context();
    return current?.dashboard && view.dashboard === current.dashboard && view.active;
  };
  const unsafe = () => context().blocked || pointers.size > 0 || !active();
  const remember = () => {
    const state = read(current.dashboard);
    state.requests = [...new Set([...(state.requests || []), ...(pending.get(current.dashboard) || [])])].slice(-32);
    state.fingerprint = current.fingerprint;
    write(current.dashboard, state);
    pending.delete(current.dashboard);
  };
  const pump = async () => {
    if (stopped || busy || !active()) return;
    if (terminal) { report(terminal); return; }
    if (offline || !hass?.connected || host.document.visibilityState === 'hidden' || host.navigator.onLine === false) return;
    let state;
    try {
      state = read(current.dashboard);
      if (current.fingerprint === loadedVersion && state.fingerprint) {
        delete state.fingerprint; write(current.dashboard, state);
      }
    } catch { terminal = 'failed'; report(terminal); return; }
    const mismatch = current.fingerprint && current.fingerprint !== loadedVersion;
    const saves = pending.get(current.dashboard)?.size;
    if (!saves && !mismatch) return;
    if (!saves && state.fingerprint === current.fingerprint) { terminal = 'failed'; report(terminal); return; }
    if (unsafe() || frontendRefreshInProgress(host)) { report('deferred'); return; }
    busy = true; attempted = false;
    try {
      await refresh({ host, isDirty: unsafe, onStatus: report, beforeClear: () => { remember(); attempted = true; } });
    } catch (error) {
      if (!attempted && ['offline', 'interrupted', 'unsaved'].includes(error.code)) {
        offline = error.code === 'offline';
        report(offline ? 'offline' : 'deferred');
      } else { terminal = 'failed'; report(terminal); }
    } finally { busy = false; }
  };
  const receive = payload => {
    if (stopped) return;
    // Unload is a pause, not a version to load. The same subscription receives setup.
    if (!payload?.dashboard || !payload.fingerprint) { current = undefined; return; }
    const changed = current?.fingerprint !== payload.fingerprint;
    current = payload;
    if (changed) { terminal = ''; offline = false; }
    if (payload.request_id) {
      try {
        if (!read(payload.dashboard).requests?.includes(payload.request_id)) {
          if (!pending.has(payload.dashboard)) pending.set(payload.dashboard, new Set());
          pending.get(payload.dashboard).add(payload.request_id);
          terminal = ''; offline = false;
          // A save during cleanup is satisfied by the document already reloading.
          if (busy && attempted) remember();
        }
      } catch { terminal = 'failed'; }
    }
    void pump();
  };
  const disconnect = () => {
    generation++;
    const remove = unsubscribe; unsubscribe = undefined;
    if (remove) Promise.resolve(remove()).catch(error => {
      host.console?.warn('Marao refresh subscription cleanup failed', error);
    });
  };
  const subscribe = async (renew = false) => {
    if (stopped || subscribing || (!renew && (unsubscribe || subscriptionFailed)) || !hass?.connected || !connection?.subscribeMessage) return;
    subscribing = true;
    const token = generation, previous = unsubscribe;
    try {
      const remove = await connection.subscribeMessage(payload => { if (token === generation) receive(payload); }, { type: 'marao_dashboard/frontend/subscribe' });
      if (stopped || token !== generation) await remove();
      else {
        unsubscribe = remove; subscriptionFailed = false;
        // Subscribe first so a save cannot fall into a foreground-renewal gap.
        if (previous) await previous();
      }
    } catch (error) {
      // Older servers can lack this optional endpoint; normal rendering continues.
      subscriptionFailed = true; terminal = 'failed'; report(terminal);
      host.console?.warn('Marao frontend update subscription failed', error);
    } finally {
      subscribing = false;
      if (!stopped && token !== generation) void subscribe();
    }
  };
  const resume = () => {
    if (host.document.visibilityState === 'hidden') return;
    if (subscriptionFailed) terminal = '';
    offline = false; subscriptionFailed = false;
    void subscribe(true); void pump();
  };
  const changed = () => { void pump(); };
  const down = event => { pointers.add(event.pointerId); };
  const up = event => { pointers.delete(event.pointerId); host.setTimeout(changed, 0); };
  const blur = () => { pointers.clear(); };
  // Android may suspend a WebView without delivering pointerup or window blur.
  const visibility = () => { if (host.document.visibilityState === 'hidden') blur(); else resume(); };
  for (const name of ['online', 'connection-status', 'focus', 'pageshow']) host.addEventListener(name, resume);
  for (const name of ['location-changed', 'popstate', 'hashchange', 'marao-interaction-settled']) host.addEventListener(name, changed);
  host.addEventListener('blur', blur);
  host.document.addEventListener('visibilitychange', visibility);
  host.document.addEventListener('pointerdown', down, true);
  host.document.addEventListener('pointerup', up, true);
  host.document.addEventListener('pointercancel', up, true);
  const destroy = () => {
    stopped = true; disconnect();
    for (const name of ['online', 'connection-status', 'focus', 'pageshow']) host.removeEventListener(name, resume);
    for (const name of ['location-changed', 'popstate', 'hashchange', 'marao-interaction-settled']) host.removeEventListener(name, changed);
    host.removeEventListener('blur', blur); host.removeEventListener('pagehide', pagehide);
    host.document.removeEventListener('visibilitychange', visibility);
    host.document.removeEventListener('pointerdown', down, true);
    host.document.removeEventListener('pointerup', up, true);
    host.document.removeEventListener('pointercancel', up, true);
  };
  const pagehide = event => { pointers.clear(); if (!event.persisted) destroy(); };
  host.addEventListener('pagehide', pagehide);
  return { update(value) {
    hass = value;
    if (connection !== value?.connection) { disconnect(); connection = value?.connection; subscriptionFailed = false; }
    if (value?.connected && !connected) { subscriptionFailed = false; offline = false; }
    connected = Boolean(value?.connected);
    void subscribe();
    void pump();
  }, destroy };
}
