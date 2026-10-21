import test from 'node:test';
import assert from 'node:assert/strict';
import { bindNavbarRefresh, cleanFrontendRefreshURL, clearFrontendCaches, frontendRefreshURL, refreshFrontend } from '../../custom_components/marao_dashboard/frontend/MaraoFrontendRefresh.js';
import { createFrontendUpdates } from '../../custom_components/marao_dashboard/frontend/MaraoFrontendUpdates.js';

const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function environment(t, overrides = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const host = new EventTarget();
  const doc = new EventTarget(); doc.visibilityState = 'visible'; doc.defaultView = host;
  const urls = [], statuses = [], warnings = [], requests = [];
  host.document = doc; host.navigator = {};
  host.location = { href: 'http://192.168.0.28:8123/marao-dashboard/rooms?external_auth=1&keep=a%20b#detail', origin: 'http://192.168.0.28:8123', pathname: '/marao-dashboard/rooms',
    replace(url) { urls.push(url); host.dispatchEvent(new Event('pagehide')); } };
  host.fetch = async (...args) => { requests.push(args); return { ok: true }; };
  host.console = { warn: (...args) => warnings.push(args) };
  host.performance = { now: () => Date.now() };
  host.requestAnimationFrame = fn => setTimeout(fn, 16); host.cancelAnimationFrame = clearTimeout;
  for (const key of ['localStorage', 'sessionStorage', 'indexedDB']) Object.defineProperty(host, key, { get() { throw Error('Unexpected settings access: ' + key); } });
  Object.assign(host, overrides);
  const run = () => refreshFrontend({ host, onStatus: state => statuses.push(state) });
  return { host, doc, urls, statuses, warnings, requests, run };
}
const request = url => ({ url });

function automatic(t, { version = 'one', storage = new Map() } = {}) {
  const host = new EventTarget(), doc = new EventTarget();
  doc.visibilityState = 'visible'; host.document = doc; host.navigator = { onLine: true };
  host.setTimeout = setTimeout; host.console = { warn() {} };
  host.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  const view = { dashboard: 'marao-dashboard', active: true, blocked: false };
  const statuses = [], refreshes = []; let receive, removed = 0, reject;
  const connection = { subscribeMessage: async callback => { receive = callback; return () => { removed++; }; } };
  const hass = { connected: true, connection };
  const controller = createFrontendUpdates({ host, loadedVersion: version,
    context: () => ({ ...view, status: value => statuses.push(value) }),
    refresh: async options => {
      if (reject) throw Object.assign(Error(reject), { code: reject });
      options.beforeClear(); refreshes.push(true); return { departed: true };
    } });
  controller.update(hass); t.after(() => controller.destroy());
  return { controller, host, doc, view, storage, statuses, refreshes, hass,
    send: (payload = {}) => receive({ dashboard: 'marao-dashboard', fingerprint: 'one', ...payload }),
    reject: code => { reject = code; }, removed: () => removed };
}

test('automatic save refresh is unconditional, deduplicated and independent of matching versions', async t => {
  const e = automatic(t); await flush(); e.send(); await flush(); assert.equal(e.refreshes.length, 0);
  e.send({ request_id: 'save-a' }); await flush(); assert.equal(e.refreshes.length, 1);
  e.send({ request_id: 'save-a' }); await flush(); assert.equal(e.refreshes.length, 1);
  e.send({ request_id: 'save-b' }); await flush(); assert.equal(e.refreshes.length, 2);
  e.controller.destroy(); await flush(); assert.equal(e.removed(), 1);
});

test('future version refresh needs no save and cannot loop across stale document reloads', async t => {
  const e = automatic(t); await flush(); e.send({ fingerprint: 'two' }); await flush();
  assert.equal(e.refreshes.length, 1); e.controller.destroy();
  const stale = automatic(t, { storage: e.storage }); await flush(); stale.send({ fingerprint: 'two' }); await flush();
  assert.equal(stale.refreshes.length, 0); assert.equal(stale.statuses.at(-1), 'failed');
  const fresh = automatic(t, { version: 'two', storage: e.storage }); await flush(); fresh.send({ fingerprint: 'two' }); await flush();
  assert.equal(fresh.refreshes.length, 0);
  fresh.send({ fingerprint: 'three' }); await flush(); assert.equal(fresh.refreshes.length, 1);
});

test('pending saves coalesce and defer for editing, hidden state and unrelated pages', async t => {
  const e = automatic(t); await flush(); e.view.blocked = true;
  e.send({ request_id: 'a' }); e.send({ request_id: 'b' }); await flush(); assert.equal(e.refreshes.length, 0);
  e.view.blocked = false; e.doc.visibilityState = 'hidden'; e.controller.update(e.hass); await flush();
  e.doc.visibilityState = 'visible'; e.view.dashboard = 'other'; e.controller.update(e.hass); await flush();
  assert.equal(e.refreshes.length, 0); e.view.dashboard = 'marao-dashboard'; e.controller.update(e.hass); await flush();
  assert.equal(e.refreshes.length, 1); e.send({ request_id: 'a' }); e.send({ request_id: 'b' }); await flush();
  assert.equal(e.refreshes.length, 1);
});

test('offline preflight keeps pending work; foreground retries once without repeated attempts', async t => {
  const e = automatic(t); await flush(); e.reject('offline'); e.send({ request_id: 'a' }); await flush();
  assert.equal(e.storage.size, 0); e.controller.update(e.hass); await flush(); assert.equal(e.refreshes.length, 0);
  e.reject(null); e.host.dispatchEvent(new Event('focus')); await flush(); assert.equal(e.refreshes.length, 1);
});

test('denied coordination storage prevents an unguarded automatic reload', async t => {
  const e = automatic(t); await flush(); e.host.sessionStorage.getItem = () => { throw Error('denied'); };
  e.send({ fingerprint: 'two' }); await flush(); assert.equal(e.refreshes.length, 0);
  assert.equal(e.statuses.at(-1), 'failed');
});

test('fresh URL retains origin, page, duplicate queries, app authentication and fragment', () => {
  const old = new URL('https://example.invalid/marao-dashboard/studio?external_auth=1&keep=a%20b&keep=c#popup');
  const fresh = new URL(frontendRefreshURL(old.href, 42));
  assert.equal(fresh.origin, old.origin); assert.equal(fresh.pathname, old.pathname); assert.equal(fresh.hash, old.hash);
  assert.deepEqual(fresh.searchParams.getAll('keep'), ['a b', 'c']); assert.equal(fresh.searchParams.get('external_auth'), '1');
  assert.equal(fresh.searchParams.get('marao_cache_bust'), '42'); assert.equal(old.searchParams.has('marao_cache_bust'), false);
  const clean = new URL(cleanFrontendRefreshURL(fresh.href));
  assert.equal(clean.hash, old.hash); assert.equal(clean.pathname, old.pathname); assert.deepEqual([...clean.searchParams], [...old.searchParams]);
});

test('cache cleanup removes only same-origin frontend responses and the native HA service worker', async t => {
  const { host } = environment(t); const removed = [], workers = [];
  const own = host.location.origin;
  host.navigator.serviceWorker = { getRegistrations: async () => ['/service_worker.js', '/other/service_worker.js', 'https://else.invalid/service_worker.js'].map(path => ({
    active: { scriptURL: new URL(path, own).href }, unregister: async () => workers.push(path),
  })) };
  const paths = ['/', '/frontend_latest/core.old.js', '/marao_dashboard_static/MaraoCards.js?v=old', '/api/preferences', '/other/data', 'https://else.invalid/static/data'];
  host.caches = { keys: async () => ['mixed'], open: async () => ({ keys: async () => paths.map(path => request(new URL(path, own).href)), delete: async entry => removed.push(entry.url) }) };
  await clearFrontendCaches(host, new AbortController().signal);
  assert.deepEqual(workers, ['/service_worker.js']); assert.deepEqual(removed, paths.slice(0, 3).map(path => new URL(path, own).href));
});

test('HTTP without web cache APIs reloads once without settings access or extra history', async t => {
  const { run, urls, requests, statuses } = environment(t);
  assert.deepEqual(await run(), { departed: true }); assert.equal(urls.length, 1);
  assert.equal(new URL(urls[0]).pathname, '/marao-dashboard/rooms'); assert.equal(new URL(urls[0]).hash, '#detail');
  assert.equal(requests[0][1].method, 'HEAD'); assert.equal(requests[0][1].cache, 'no-store'); assert.deepEqual(statuses, ['refreshing']);
  assert.equal(new URL(requests[0][0]).pathname, '/marao_dashboard_static/MaraoFrontendRefresh.js', 'Dashboard views reject HEAD; use the owned static route');
});

test('supported native reset unloads without a second web navigation', async t => {
  const e = environment(t); const messages = [];
  e.host.webkit = { messageHandlers: { externalBus: { postMessage(message) { messages.push(message); e.host.dispatchEvent(new Event('pagehide')); } } } };
  assert.deepEqual(await e.run(), { departed: true });
  t.mock.timers.tick(10000); await flush(); assert.equal(messages.length, 1); assert.equal(messages[0].type, 'frontend/reload_and_clear_cache'); assert.equal(e.urls.length, 0);
});

test('Android bridges reload the updated current entry without external-link navigation', async t => {
  const e = environment(t), previous = { caller: 'preserved' }; let updated;
  e.host.externalAppV2 = { postMessage() { throw Error('No iOS command on Android'); } };
  e.host.history = { state: previous, replaceState(state, title, url) { assert.equal(state, previous); updated = url; } };
  e.host.location.reload = () => e.host.dispatchEvent(new Event('pagehide'));
  await e.run(); assert.equal(e.urls.length, 0); assert.equal(new URL(updated).pathname, '/marao-dashboard/rooms');
  assert.equal(new URL(updated).searchParams.get('external_auth'), '1');
});

for (const rejected of [false, true]) test(`native ${rejected ? 'rejection' : 'no-op'} falls back once and retains diagnostics`, async t => {
  const e = environment(t); let native = 0;
  e.host.webkit = { messageHandlers: { externalBus: { postMessage() { native++; if (rejected) throw Error('Native rejection'); } } } };
  const task = e.run(); assert.equal(e.run(), task); await flush();
  t.mock.timers.tick(1999); await flush(); assert.equal(e.urls.length, 0);
  t.mock.timers.tick(1); await flush(); await task;
  assert.equal(e.urls.length, 1); assert.equal(native, 1); assert.equal(e.warnings.length, rejected ? 1 : 0);
});

for (const stalled of [false, true]) test(`cache cleanup ${stalled ? 'deadline' : 'rejection'} cannot strand recovery`, async t => {
  const e = environment(t); let release; const removed = [];
  e.host.caches = { keys: () => stalled ? new Promise(resolve => { release = resolve; }) : Promise.reject(Error('Cache denied')),
    open: async () => { removed.push('late mutation'); return { keys: async () => [] }; } };
  const task = e.run(); await flush();
  if (stalled) { t.mock.timers.tick(2000); await flush(); }
  await task; assert.equal(e.urls.length, 1); assert.equal(e.warnings.length, 1);
  release?.(['late']); await flush(); assert.deepEqual(removed, []);
});

test('dirty or offline state preserves usable caches and allows a later explicit retry', async t => {
  const e = environment(t); let mutations = 0;
  e.host.caches = { keys: async () => { mutations++; return []; } }; e.host.isDirtyState = true;
  await assert.rejects(e.run(), { code: 'unsaved' }); assert.equal(e.requests.length, 0);
  e.host.isDirtyState = false; e.host.fetch = async () => { throw Error('Offline'); };
  await assert.rejects(e.run(), { code: 'offline' }); assert.equal(mutations, 0); assert.equal(e.urls.length, 0);
  e.host.fetch = async () => ({ ok: true }); await e.run(); assert.equal(e.urls.length, 1);
});

test('lost visibility, route change and dirty work appearing during preflight prevent mutation', async t => {
  const e = environment(t); let respond;
  e.host.fetch = () => new Promise(resolve => { respond = resolve; });
  const task = e.run(); await flush(); e.host.isDirtyState = true; respond({ ok: true });
  await assert.rejects(task, { code: 'unsaved' }); assert.equal(e.urls.length, 0);
  e.host.isDirtyState = false;
  const hidden = e.run(); await flush(); e.doc.visibilityState = 'hidden'; e.doc.dispatchEvent(new Event('visibilitychange'));
  await assert.rejects(hidden, { code: 'interrupted' }); respond({ ok: true }); await flush(); assert.equal(e.urls.length, 0);
  e.doc.visibilityState = 'visible'; const route = e.run(); await flush(); e.host.dispatchEvent(new Event('location-changed'));
  await assert.rejects(route, { code: 'interrupted' }); respond({ ok: true }); await flush(); assert.equal(e.urls.length, 0);
});

test('preflight and navigation have deadlines and never start automatic reload loops', async t => {
  const e = environment(t); e.host.fetch = () => new Promise(() => {});
  const pending = assert.rejects(e.run(), { code: 'offline' }); await flush(); t.mock.timers.tick(5000); await pending;
  e.host.fetch = async () => ({ ok: true }); e.host.location.replace = url => e.urls.push(url);
  const retry = assert.rejects(e.run(), { code: 'timeout' }); await flush(); t.mock.timers.tick(5000); await retry;
  t.mock.timers.tick(60000); await flush(); assert.equal(e.urls.length, 1);
});

function pointer(type, values = {}) {
  return Object.assign(new Event(type, { cancelable: true }), { pointerId: 7, isPrimary: true, button: 0, clientX: 20, clientY: 20, detail: 1, ...values });
}
function navbar(t) {
  const e = environment(t), nav = new EventTarget(); nav.ownerDocument = e.doc;
  nav.getBoundingClientRect = () => ({ left: 0, top: 0, right: 200, bottom: 60 });
  let eligible = true, completed = 0, haptics = 0, progress = null;
  const binding = bindNavbarRefresh(nav, { eligible: () => eligible, progress: value => { progress = value; }, complete: () => completed++, haptic: () => haptics++ });
  return { ...e, nav, binding, disable: () => { eligible = false; }, state: () => ({ completed, haptics, progress }) };
}

test('3000ms gesture completes once, consumes a late release and permits the next ordinary tap', t => {
  const e = navbar(t); e.nav.dispatchEvent(pointer('pointerdown')); t.mock.timers.tick(500);
  assert.equal(e.state().haptics, 1); t.mock.timers.tick(2499); assert.equal(e.state().completed, 0);
  t.mock.timers.tick(1); assert.equal(e.state().completed, 1); assert.equal(e.state().haptics, 2);
  t.mock.timers.tick(10000); e.doc.dispatchEvent(pointer('pointerup'));
  const click = pointer('click'); e.nav.dispatchEvent(click); assert.equal(click.defaultPrevented, true);
  e.nav.dispatchEvent(pointer('pointerdown')); t.mock.timers.tick(80); e.doc.dispatchEvent(pointer('pointerup'));
  const ordinary = pointer('click'); e.nav.dispatchEvent(ordinary); assert.equal(ordinary.defaultPrevented, false); e.binding.destroy();
});

test('short taps and keyboard activation retain native semantics; armed partial holds cancel', t => {
  const e = navbar(t); e.nav.dispatchEvent(pointer('pointerdown')); t.mock.timers.tick(50); e.doc.dispatchEvent(pointer('pointerup'));
  const short = pointer('click'); e.nav.dispatchEvent(short); assert.equal(short.defaultPrevented, false);
  e.nav.dispatchEvent(pointer('pointerdown')); t.mock.timers.tick(700); e.doc.dispatchEvent(pointer('pointerup'));
  const partial = pointer('click'); e.nav.dispatchEvent(partial); assert.equal(partial.defaultPrevented, true);
  const keyboard = pointer('click', { detail: 0, pointerId: -1 }); e.nav.dispatchEvent(keyboard); assert.equal(keyboard.defaultPrevented, false);
  t.mock.timers.tick(5000); assert.equal(e.state().completed, 0); assert.equal(e.state().progress, null); e.binding.destroy();
});

test('a finger released after document replacement cannot activate the newly mounted navbar', t => {
  const e = navbar(t), release = pointer('click');
  e.nav.dispatchEvent(release); assert.equal(release.defaultPrevented, true);
  e.nav.dispatchEvent(pointer('pointerdown')); t.mock.timers.tick(80); e.doc.dispatchEvent(pointer('pointerup'));
  const next = pointer('click'); e.nav.dispatchEvent(next); assert.equal(next.defaultPrevented, false); e.binding.destroy();
});

for (const cause of ['move', 'outside', 'second', 'cancel', 'scroll', 'hidden', 'blur', 'ineligible', 'remove']) test(`hold cancels on ${cause} and leaves no completion timer`, t => {
  const e = navbar(t); e.nav.dispatchEvent(pointer('pointerdown')); t.mock.timers.tick(500);
  if (cause === 'move') e.doc.dispatchEvent(pointer('pointermove', { clientX: 31 }));
  if (cause === 'outside') e.doc.dispatchEvent(pointer('pointermove', { clientX: -1 }));
  if (cause === 'second') e.doc.dispatchEvent(pointer('pointerdown', { pointerId: 8 }));
  if (cause === 'cancel') e.doc.dispatchEvent(pointer('pointercancel'));
  if (cause === 'scroll') e.doc.dispatchEvent(new Event('scroll'));
  if (cause === 'hidden') { e.doc.visibilityState = 'hidden'; e.doc.dispatchEvent(new Event('visibilitychange')); }
  if (cause === 'blur') e.host.dispatchEvent(new Event('blur'));
  if (cause === 'ineligible') e.disable();
  if (cause === 'remove') e.binding.destroy();
  t.mock.timers.tick(5000); assert.equal(e.state().completed, 0); assert.equal(e.state().progress, null); e.binding.destroy();
});
