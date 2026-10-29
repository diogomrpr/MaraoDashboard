import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const {
  buildViewChecks,
  captureClimateFeedback,
  checkHistoryCases,
  installHistoryLoadingGate,
  climateFeedbackSnapshot,
  conditionalCardIsActive,
  dashboardNavigationViolations,
  dashboardScenario,
  isDelayedCameraRequest,
  refreshDelayedCameraLoading,
  waitForCameraEvents,
  normalizedPathname,
  scrollDashboard,
  titleLayoutIssues,
} = require("../test-ha-dashboard-e2e.js");
const { visibleBounds } = require("../test-ha-room-cards.js");

test('retired reconnect flags stop before any Home Assistant preparation', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-retired-reconnect-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const flag of ['--disconnect-only', '--reconnect-evidence=' + path.join(directory, 'old-evidence.json')]) {
    const result = spawnSync(process.execPath, [require.resolve('../test-ha-dashboard-e2e.js'), flag], {
      env: { ...process.env, MARAO_TEST_ARTIFACT_ROOT: directory }, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /reconnect verification has been retired by user instruction/);
  }
  assert.equal(fs.existsSync(path.join(directory, 'old-evidence.json')), false);
});

test('camera event failure diagnostics retain the original timeout and release its exact handle', async () => {
  const {expect}=require('playwright/test'),originalPoll=expect.poll;
  const timeout = new Error('Original event timeout'); let disposed = false;
  const state = {connected:false,status:'loading',request:3,events:0};
  const element = {evaluate:async read=>read({isConnected:false,_status:'loading',_request:3,_events:[]}),dispose:async()=>{disposed=true;}};
  const card = {elementHandle:async()=>element,evaluate:async read=>read({isConnected:true,_status:'ready',_request:5,_events:[{},{}]})};
  expect.poll=(_read,options)=>{assert.deepEqual(options,{timeout:10000,intervals:[50]});return{toBe:async()=>{throw timeout;}};};
  try { await assert.rejects(waitForCameraEvents({},card),error=>{
    assert.equal(error,timeout);assert.match(error.message,/Original event timeout/);
    const report=JSON.parse(error.message.split('Camera event state after failed wait: ')[1]);
    assert.deepEqual(report.observed,state);assert.equal(report.current.status,'ready');
    assert.equal(report.current.connected,true);return true;
  }); } finally { expect.poll=originalPoll; }
  assert.equal(disposed,true);
});

test('camera event waits observe real provider completion without frames, retain the exact element and release handles', async () => {
  const {MaraoCameraEventsCard}=await import('../../custom_components/marao_dashboard/frontend/MaraoFrigateEventsCard.js');
  const card=new MaraoCameraEventsCard(),calls=[];let finish,elementDisposed=false,evaluations=0;
  Object.defineProperty(card,'isConnected',{get:()=>true});
  card._connected=true;card._render=()=>{};
  card._config={entity:'camera.marao_dashboard_test_camera',event_provider:'frigate',frigate_instance_id:'marao_test',frigate_camera:'loading',limit:12};
  card._hass={states:{[card._config.entity]:{state:'idle'}},callWS:message=>{calls.push(message);return new Promise(resolve=>{finish=resolve;});}};
  card._maybeLoad();
  const element={dispose:async()=>{elementDisposed=true;},evaluate:async predicate=>{
    assert.equal(predicate({isConnected:true}),false);
    assert.equal(predicate({isConnected:false,_status:'ready'}),false);
    const result=predicate(card);
    if(!evaluations++){assert.equal(result,false);finish([]);}
    return result;
  }};
  await waitForCameraEvents({},{elementHandle:async()=>element});
  assert.ok(evaluations>=2);assert.equal(card._status,'ready');assert.equal(calls.length,1);
  assert.equal(elementDisposed,true);
});

test('delayed camera refresh atomically observes the real component handler while its provider promise is pending', async () => {
  const { MaraoCameraEventsCard } = await import('../../custom_components/marao_dashboard/frontend/MaraoFrigateEventsCard.js');
  const card = new MaraoCameraEventsCard(), calls = []; let finish;
  card._config = { entity: 'camera.marao_dashboard_test_camera', event_provider: 'frigate', frigate_instance_id: 'marao_test', frigate_camera: 'loading', limit: 12 };
  card._connected = true; card._status = 'ready'; card._loadedKey = 'previous completed request';
  card._hass = { states: { [card._config.entity]: { state: 'idle' } }, callWS: message => { calls.push(message); return new Promise(resolve => { finish = resolve; }); } };
  let text = '';
  card._render = () => { text = card._status === 'loading' ? 'Loading events…' : ''; };
  const button = { disabled: false, dataset: { action: 'refresh' }, click() { card._handleClick({ target: { closest: () => button } }); } };
  card.shadowRoot = { querySelector: selector => selector === '[data-action="refresh"]' ? button : { textContent: text } };
  const config = JSON.stringify(card._config), observation = refreshDelayedCameraLoading(card);
  assert.deepEqual(observation, { status: 'loading', requestAdvanced: true, readable: true });
  assert.equal(calls.length, 1); assert.equal(isDelayedCameraRequest({ ...calls[0], id: 41 }), true);
  assert.throws(() => refreshDelayedCameraLoading(card), /Finish the existing event request/);
  assert.equal(calls.length, 1, 'A second refresh cannot duplicate the in-flight request');
  finish([]); await new Promise(resolve => setImmediate(resolve));
  assert.equal(card._status, 'ready'); assert.deepEqual(card._events, []);
  assert.equal(observation.status, 'loading', 'Later real completion cannot replace the same-task loading observation');
  assert.equal(JSON.stringify(card._config), config);
});
test('delayed event request evidence accepts only the exact safe fixture request', () => {
  const safe = { id: 41, type: 'frigate/events/get', instance_id: 'marao_test', cameras: ['loading'], limit: 12 };
  assert.equal(isDelayedCameraRequest(safe), true);
  for (const change of [{ instance_id: 'another' }, { cameras: ['front'] }, { cameras: ['loading', 'front'] }, { type: 'camera/stream' }, { id: undefined }, { id: '41' }])
    assert.equal(isDelayedCameraRequest({ ...safe, ...change }), false);
});

test('dashboard CLI executes the actual narrow, text and zoom profiles in both scenario argument forms', () => {
  const { scenarios, contextOptionsForScenario } = require('../test-ha-dashboard-accessibility');
  for (const name of ['narrow-320', 'iphone-text-200', 'iphone-page-zoom-200']) {
    const expected = scenarios.find(value => value.name === name);
    for (const args of [['--scenario', name], ['--scenario=' + name]]) {
      const actual = dashboardScenario(args, scenarios);
      assert.equal(actual, expected);
      assert.deepEqual(contextOptionsForScenario(actual).viewport, contextOptionsForScenario(expected).viewport);
      assert.equal(actual.textScale, expected.textScale); assert.equal(actual.pageZoom, expected.pageZoom);
    }
  }
  assert.equal(dashboardScenario([], scenarios).name, 'iphone-normal');
  for (const args of [['--scenario=unknown'], ['--scenario', 'unknown'], ['--scenario'], ['--scenario=']]) assert.throws(() => dashboardScenario(args, scenarios), /Unknown mobile scenario/);
  assert.throws(() => dashboardScenario(['--scenario=narrow-320', '--scenario', 'iphone-normal'], scenarios), /Conflicting mobile scenarios/);
});

test('title geometry rejects rounded-corner clipping while retaining narrow control space', async () => {
  let top = 0, left = 1, overflow = 'hidden';
  const surface = { getBoundingClientRect: () => ({ left: 0, right: 66, top: 0, width: 66, height: 120 }) };
  const parent = { clientWidth: 66, children: [], classList: { contains: () => false } };
  const title = { parentElement: parent, closest: () => surface, getBoundingClientRect: () => ({ width: 64, top, bottom: top + 19 }) };
  parent.children = [title];
  const card = { _config: { name: 'Temperature' }, shadowRoot: { querySelector: () => title } };
  const environment = vm.createContext({
    getComputedStyle: element => element === parent ? { paddingLeft: '1px', paddingRight: '1px' }
      : { overflow, borderTopLeftRadius: '20px', borderTopRightRadius: '20px' },
    document: { createRange: () => ({ selectNodeContents() {}, getClientRects: () => [{ left, right: 65, top, width: 65 - left, height: 19 }] }) },
  });
  const page = { locator: () => ({ evaluateAll: async (callback, argument) => structuredClone(vm.runInContext('(' + callback.toString() + ')', environment)([card], argument)) }) };
  assert.ok((await titleLayoutIssues(page)).some(issue => issue.includes('rounded corner')));
  top = 14;
  assert.deepEqual(await titleLayoutIssues(page), []);
  left = 0;
  assert.ok((await titleLayoutIssues(page)).some(issue => issue.includes('rounded corner')));
  top = 24;
  assert.deepEqual(await titleLayoutIssues(page), []);
  top = 0; overflow = 'visible';
  assert.deepEqual(await titleLayoutIssues(page), []);
});

test('compact header geometry permits contained wrapping only below the reference card width', async () => {
  const cases = [
    { name: 'reference adjacent', width: 172, copy: [8,0,88,20], icon: [108,0,156,48], head: [8,0,164,48], valid: true },
    { name: 'old centered copy', width: 172, copy: [8,14,88,34], icon: [108,0,156,48], head: [8,0,164,48], valid: false },
    { name: 'constrained wrapped', width: 75, copy: [8,8,67,28], icon: [8,36,56,84], head: [8,8,67,84], valid: true },
    { name: 'reference wrapped', width: 172, copy: [8,8,164,28], icon: [8,36,56,84], head: [8,8,164,84], valid: false },
    { name: 'enlarged text wrapped', width: 172, fontSize: 36, copy: [8,8,164,28], icon: [8,36,56,84], head: [8,8,164,84], valid: true },
    { name: 'wide enlarged text wrapped', width: 390, fontSize: 36, copy: [8,8,382,28], icon: [8,36,56,84], head: [8,8,382,84], valid: false },
    { name: 'constrained overlap', width: 75, copy: [8,8,67,28], icon: [8,24,56,72], head: [8,8,67,72], valid: false },
  ];
  const bounds = ([left,top,right,bottom]) => ({ left,top,right,bottom,width:right-left,height:bottom-top });
  for (const example of cases) {
    const surface = { getBoundingClientRect: () => bounds([0,0,example.width,100]) };
    const icon = { getBoundingClientRect: () => bounds(example.icon) };
    const body = { classList: { contains: name => name === 'slider-header' }, children: [] };
    const header = { closest: () => body, querySelector: () => icon, getBoundingClientRect: () => bounds(example.head) };
    const copy = { parentElement: header, clientWidth: example.copy[2]-example.copy[0],
      classList: { contains: name => name === 'compact-copy' }, getBoundingClientRect: () => bounds(example.copy) };
    const title = { parentElement: copy, closest: () => surface, getBoundingClientRect: () => bounds(example.copy) };
    body.children = [header];
    const card = { _config: { name: 'Light', template: 'md_light_card' }, shadowRoot: { querySelector: () => title } };
    const environment = vm.createContext({ getComputedStyle: () => ({ paddingLeft: '0px',paddingRight: '0px',overflow: 'visible',getPropertyValue:()=>String(example.fontSize || 18)+'px' }) });
    const page = { locator: () => ({ evaluateAll: async (callback, argument) => structuredClone(vm.runInContext('(' + callback.toString() + ')', environment)([card], argument)) }) };
    const issues = await titleLayoutIssues(page);
    if (example.valid) assert.deepEqual(issues, [], example.name);
    else assert.deepEqual(issues, ['Light: compact reading block and icon overlap or misalign'], example.name);
  }
});

test('climate captures ignore collapsed scroll containers and frame both ends of a tall card', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-climate-capture-unit-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let top = 2000, collapsedScrolls = 0;
  const collapsed = { clientHeight: 0, scrollHeight: 4000, scrollBy: () => collapsedScrolls++, getRootNode: () => ({}) };
  const heading = { getClientRects: () => [1], getBoundingClientRect: () => ({ top, bottom: top + 20, left: 14, right: 300 }) };
  const element = { parentElement: collapsed, scrollIntoView() {},
    getBoundingClientRect: () => ({ height: 900, bottom: top + 900 }),
    shadowRoot: { querySelector: () => heading, querySelectorAll: () => [] } };
  const environment = vm.createContext({ innerHeight: 844, innerWidth: 390, getComputedStyle: () => ({ overflowY: 'auto' }),
    document: { scrollingElement: { scrollBy: ({ top: distance }) => { top -= distance; } } } });
  const target = { evaluate: async (run, arg) => structuredClone(await vm.runInContext('(' + run.toString() + ')', environment)(element, arg)) };
  const captures = [];
  const page = { evaluate: async () => {}, screenshot: async () => captures.push(top), locator: selector => selector === '.marao-popup-sheet'
    ? { count: async () => 0 } : { boundingBox: async () => ({ y: 760 }) } };
  await captureClimateFeedback(page, 'collapsed-scroll-regression', target, directory);
  assert.equal(collapsedScrolls, 0);
  assert.deepEqual(captures, [14, -148]);
});

test('climate capture positions and measures the card only after its native slot has rendered', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-native-slot-unit-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let rendered = false, scrolls = 0;
  const surface = { get updateComplete() { return Promise.resolve().then(() => { rendered = true; }); } };
  const heading = { getClientRects: () => rendered ? [1] : [],
    getBoundingClientRect: () => ({ top: 14, bottom: 34, left: 14, right: 300 }) };
  const element = { getRootNode: () => ({}),
    scrollIntoView() { assert.equal(rendered, true, 'Scrolling an unslotted card can clamp the gallery'); scrolls++; rendered = false; },
    getBoundingClientRect: () => ({ height: 128, bottom: 128 }),
    shadowRoot: { querySelector: selector => selector === 'ha-card' ? surface : selector === '.title' ? heading : null, querySelectorAll: () => [] } };
  const environment = vm.createContext({ innerHeight: 844, innerWidth: 390 });
  const target = { evaluate: async (run, arg) => structuredClone(await vm.runInContext('(' + run.toString() + ')', environment)(element, arg)) };
  let captures = 0;
  const page = { evaluate: async () => {}, screenshot: async () => { assert.equal(rendered, true); captures++; },
    locator: selector => selector === '.marao-popup-sheet' ? { count: async () => 0 } : { boundingBox: async () => ({ y: 760 }) } };
  await captureClimateFeedback(page, 'native-slot', target, directory);
  assert.equal(scrolls, 2);
  assert.equal(captures, 1);
});

test('history loading gate holds only the exact safe native GET, preserves requests and becomes pass-through after release', async () => {
  let handler, removed=false;const continued=[];
  const page={route:async(pattern,callback)=>{assert.equal(pattern,'**/api/history/period/**');handler=callback;},
    unroute:async(pattern,callback)=>{assert.equal(pattern,'**/api/history/period/**');assert.equal(callback,handler);removed=true;}};
  const gate=await installHistoryLoadingGate(page,'http://192.168.0.28');
  const safe='http://192.168.0.28/api/history/period/2026-10-18T00:00:00Z?filter_entity_id=sensor.marao_dashboard_test_history_loading';
  const route=(name,url=safe,method='GET')=>({request:()=>({url:()=>url,method:()=>method}),continue:async(...args)=>{assert.equal(args.length,0,'The gate must not replace native request details or payload');continued.push(name);}});
  const pending=handler(route('held'));
  assert.equal(gate.held,1);assert.deepEqual(continued,[]);
  for(const [name,url,method] of [
    ['other-entity',safe.replace('history_loading','history_empty'),'GET'],
    ['combined-entities',safe+',sensor.other','GET'],
    ['duplicate-parameter',safe+'&filter_entity_id=sensor.other','GET'],
    ['other-origin',safe.replace('192.168.0.28','example.invalid'),'GET'],
    ['other-path',safe.replace('/api/history/period/','/api/states/'),'GET'],
    ['other-method',safe,'POST'],
  ])await handler(route(name,url,method));
  assert.deepEqual(continued,['other-entity','combined-entities','duplicate-parameter','other-origin','other-path','other-method']);
  gate.release();await pending;assert.equal(continued.at(-1),'held');
  await handler(route('after-release'));assert.equal(continued.at(-1),'after-release');assert.equal(gate.held,1);
  await gate.dispose();assert.equal(removed,true);
});

test('history checks atomically await mounted loading surfaces, reject other states and retain prefetch/retry checks', async () => {
  const { manifest } = require('../../ha-test/cases');
  for (const { repeated = false, badState } of [{}, { repeated: true }, { badState: 'ready' }, { badState: 'error' }]) {
    let settled = false, released = false, mounted = false, loadingChecks = 0, record, releasedListener = false;
    const elements = manifest.historyCases.flatMap(example => ['Graph', 'Energy', 'Timeline'].map(label => {
      const status = () => example.expectedStatus === 'loading' && (settled || badState && label === 'Energy') ? badState || 'ready' : example.expectedStatus;
      const card = { _config: { name: `${label} history · ${example.id}` }, _hass: {}, visible: false };
      if (label === 'Graph') { card._graphEntity = () => example.entity; card._graphStatus = status; }
      card.shadowRoot = { querySelector: () => example.expectedStatus === 'loading' && !mounted ? null : ({ dataset: { historyState: label === 'Graph' && !card.visible ? example.expectedStatus : status() } }) };
      return card;
    }));
    const environment = vm.createContext({ document: { querySelectorAll: selector => selector === '*' ? [] : elements }, URL,
      requestAnimationFrame: callback => callback() });
    const run = (callback, arg) => vm.runInContext('(' + callback.toString() + ')', environment)(arg);
    const page = {
      __historyLoadingGate: { release() { assert.equal(loadingChecks,1); assert.equal(settled,false); released=true; } },
      locator: () => ({ filter: ({ hasText, has }) => hasText ? { pattern: hasText } : {
        first: () => {
          const card = elements.find(element => has.pattern.test(element._config.name));
          return { scrollIntoViewIfNeeded: async () => { card.visible = true; }, elementHandle: async () => card };
        },
      }, evaluateAll: async (callback, arg) => {
        assert.notEqual(typeof arg, 'string', 'Loading state must not be read after its mounted-state observation');
        if (repeated) record({ url: () => 'http://homeassistant.test/api/history/period/current?filter_entity_id=' + manifest.historyCases[0].entity });
        return callback(elements, arg);
      } }),
      waitForFunction: async (callback, arg) => {
        if (released) settled = true;
        else { assert.equal(run(callback, arg), false, 'Missing history surfaces must wait for mounting'); mounted = true; loadingChecks++; }
        assert.equal(run(callback, arg), true);
      },
      waitForLoadState: async () => assert.fail('Continuous camera streams must not block history readiness'),
      on: (event, callback) => { assert.equal(event, 'request'); record = callback; },
      off: (event, callback) => { assert.equal(event, 'request'); assert.equal(callback, record); releasedListener = true; },
      evaluate: async (callback, arg) => run(callback, arg),
    };
    if (badState) {
      await assert.rejects(() => checkHistoryCases(page), new RegExp(`Energy history · loading: expected a visible loading state, found ${badState}`));
      assert.equal(released, true); assert.equal(settled, false);
      continue;
    }
    if (repeated) await assert.rejects(() => checkHistoryCases(page), /Settled history requested again/);
    else await checkHistoryCases(page);
    assert.equal(settled, true); assert.equal(releasedListener, true);
    assert.ok(elements.every(card => card.visible), 'Every deferred history surface is inspected after entering the viewport');
  }
});

test('climate feedback records a rendered pending transition before a fast rejection, without accepting absent feedback', () => {
  let mutation, disconnected = 0, pending = false, target = '21';
  const observe = vm.runInNewContext('(' + climateFeedbackSnapshot.toString() + ')', { MutationObserver: class {
    constructor(callback) { mutation = callback; }
    observe() {}
    disconnect() { disconnected++; }
  } });
  const card = { _config: { entity: 'climate.test' }, hass: { states: { 'climate.test': { state: 'heat', attributes: { temperature: 21, current_temperature: 20 } } } },
    shadowRoot: { querySelector(selector) {
      return { '.state': { textContent: 'Heat' }, '.number-value': { textContent: target }, '.climate-pending': pending ? {} : null }[selector];
    } } };
  observe(card, 'observe');
  pending = true; target = '21.5'; mutation();
  pending = false; target = '21'; mutation();
  const feedback = observe(card, 'observed');
  assert.equal(feedback.pending, true); assert.equal(feedback.target, '21.5');
  assert.equal(feedback.temperature, 21); assert.equal(feedback.current, 20);
  assert.equal(observe(card).pending, false); assert.equal(observe(card).target, '21');
  observe(card, 'observe'); mutation();
  assert.equal(observe(card, 'observed'), undefined);
  assert.equal(disconnected, 2); assert.equal(card.__feedbackObserver, undefined);
});

const dashboard = {
  views: [
    {
      title: "Overview",
      path: "overview",
      cards: [
        { type: "custom:marao-card" },
        {
          type: "conditional",
          conditions: [{ entity: "light.active", state: "on" }],
          card: { type: "custom:marao-card" },
        },
        {
          type: "conditional",
          conditions: [{ entity: "light.inactive", state: "on" }],
          card: { type: "custom:marao-card" },
        },
      ],
    },
  ],
};

test("conditional card activity follows the current Home Assistant state", () => {
  const states = { "light.active": "on", "light.inactive": "off" };

  assert.equal(conditionalCardIsActive(dashboard.views[0].cards[1], states), true);
  assert.equal(conditionalCardIsActive(dashboard.views[0].cards[2], states), false);
  assert.equal(
    conditionalCardIsActive(
      {
        type: "conditional",
        conditions: [{ entity: "light.missing", state_not: "off" }],
      },
      states
    ),
    false
  );
});

test("installed card counts exclude inactive conditional descendants", () => {
  const [view] = buildViewChecks(
    dashboard,
    "/marao-generated/overview",
    { "light.active": "on", "light.inactive": "off" }
  );

  assert.deepEqual(view.configuredCounts, { "marao-card": 2 });
  const sectioned = { views: [{ path: 'card-test', sections: [{ cards: dashboard.views[0].cards }] }] };
  assert.deepEqual(buildViewChecks(sectioned, '/marao-dashboard/overview', { 'light.active': 'on', 'light.inactive': 'off' })[0].configuredCounts, view.configuredCounts);
});

test("missing card checks retain direct and active conditional assertions", () => {
  const [view] = buildViewChecks(
    dashboard,
    "/marao-generated/overview",
    { "light.active": "on", "light.inactive": "off" }
  );

  assert.deepEqual(view.configuredCounts, { "marao-card": 2 });
});

test("route checks compare canonical paths without query strings", () => {
  assert.equal(
    normalizedPathname("http://homeassistant.test/marao-generated/overview/?authSig=secret"),
    "/marao-generated/overview"
  );
});

test("dashboard navigation stays in one dashboard and resolves every target", () => {
  const config = {
    views: [
      {
        path: "overview",
        cards: [
          {
            type: "custom:marao-navbar-card",
            routes: [{ url: "/marao-dashboard/cases" }],
          },
          {
            tap_action: { navigation_path: "#details" },
          },
          {
            type: "custom:marao-popup-card",
            hash: "#details",
          },
        ],
      },
      { path: "cases", cards: [] },
    ],
  };

  assert.deepEqual(dashboardNavigationViolations(config, "marao-dashboard"), []);
  config.views[0].cards[2].type = 'custom:marao-native-popup-card';
  assert.deepEqual(dashboardNavigationViolations(config, "marao-dashboard"), [], 'Native popup wrappers own their hash too');
  config.views[0].cards[0].routes.push({ url: "/another-dashboard/home" });
  config.views[0].cards[1].tap_action.navigation_path = "#missing";
  assert.deepEqual(dashboardNavigationViolations(config, "marao-dashboard"), [
    "Route leaves /marao-dashboard: /another-dashboard/home",
    "Unresolved popup route #missing",
  ]);
});

function scrollPage({ settle = () => {}, blocked = false } = {}) {
  let frames = 0;
  let disposed = false;
  const visits = [];
  const element = {
    localName: "div", id: "view", isConnected: true,
    scrollTop: 0, scrollHeight: 1200, clientHeight: 400,
    scrollTo({ top }) {
      if (!blocked) this.scrollTop = Math.max(0, Math.min(top, this.scrollHeight - this.clientHeight));
    },
  };
  const handle = { evaluate: (run, value) => run(element, value), dispose: () => { disposed = true; } };
  const page = {
    locator: () => ({
      first: () => ({ evaluateHandle: () => handle }),
      evaluateAll: (run, value) => run([], value),
    }),
    evaluate: () => {},
    waitForTimeout: () => { settle(element, ++frames); visits.push(element.scrollTop); },
    screenshot: () => {},
    url: () => "http://homeassistant.test/marao-dashboard/card-test",
  };
  return { page, element, visits, disposed: () => disposed };
}

test("dashboard scrolling follows layout shrink and confirms a stable bottom after lazy growth", async () => {
  const fixture = scrollPage({ settle: (element, frame) => {
    // Loading content briefly collapses, clamping the old requested position.
    if (frame === 3) { element.scrollHeight = 800; element.scrollTop = 100; }
    // A newly visible lazy card adds content at the first apparent bottom.
    if (frame === 5) element.scrollHeight = 1400;
  } });
  await scrollDashboard(fixture.page, { screenshotPrefix: "/unused" });
  assert.deepEqual(fixture.visits, [0, 300, 100, 400, 400, 700, 1000, 1000]);
  assert.equal(fixture.element.scrollTop, 0);
  assert.equal(fixture.disposed(), true);
});

test("dashboard scrolling rejects an immovable container with view and geometry diagnostics", async () => {
  const fixture = scrollPage({ blocked: true });
  await assert.rejects(() => scrollDashboard(fixture.page), (error) => {
    assert.match(error.message, /marao-dashboard\/card-test/);
    for (const field of ['"selected":"div#view"', '"top":0', '"height":1200', '"viewport":400']) assert.ok(error.message.includes(field));
    return true;
  });
  assert.equal(fixture.visits.length, 4);
  assert.equal(fixture.disposed(), true);
});

test("each scroll segment settles and verifies lazy content before capturing it", async () => {
  const fixture = scrollPage();
  let ready = false;
  let captures = 0;
  fixture.page.waitForTimeout = () => { ready = false; };
  fixture.page.screenshot = () => { assert.equal(ready, true); captures += 1; };
  await scrollDashboard(fixture.page, {
    screenshotPrefix: "/unused",
    onSegment: () => { ready = true; },
  });
  assert.ok(captures > 1);
});

test("dashboard scrolling reports title defects and disposes its scroll handle", async () => {
  const fixture = scrollPage();
  const locator = fixture.page.locator();
  fixture.page.locator = () => ({
    ...locator,
    evaluateAll: () => ["Example: title uses 120px of 240px content width"],
  });
  await assert.rejects(() => scrollDashboard(fixture.page), /Example: title uses 120px of 240px content width/);
  assert.equal(fixture.element.scrollTop, 0);
  assert.equal(fixture.disposed(), true);
});

test("room geometry is read atomically and rejects an invisible element", async () => {
  const rect = { x: 8, y: 40, width: 120, height: 96 };
  const locator = {
    boundingBox: () => { throw new Error('Separate visibility and geometry reads can race'); },
    evaluate: run => run({ localName: 'marao-card', getBoundingClientRect: () => ({ ...rect, toJSON: () => ({ ...rect }) }) }),
  };
  assert.deepEqual(await visibleBounds(locator), rect);
  rect.height = 0;
  await assert.rejects(() => visibleBounds(locator), /no visible geometry: marao-card/);
  const host = {
    evaluate: (run, selector) => run({ shadowRoot: { querySelector: value => {
      assert.equal(value, '[data-room-lights-off]');
      return { localName: 'button', getBoundingClientRect: () => ({ width: 48, height: 48, toJSON: () => ({ width: 48, height: 48 }) }) };
    } } }, selector),
  };
  assert.deepEqual(await visibleBounds(host, '[data-room-lights-off]'), { width: 48, height: 48 });
  await assert.rejects(() => visibleBounds({ evaluate: (run, selector) => run({ shadowRoot: { querySelector: () => null }, querySelector: () => null }, selector) }, 'nav'), /element is missing: nav/);
});
