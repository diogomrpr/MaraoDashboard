import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

class Shadow {
  constructor() { this.buttons = []; this.html = ''; }
  set innerHTML(value) {
    for (const button of this.buttons || []) button.isConnected = false;
    this.activeElement = null;
    this.html = value; this.renders = (this.renders || 0) + 1; this.surface = value.includes('<ha-card') ? {classList:{remove(){},add(){}},style:{setProperty(){}}} : null;
    const root = this;
    this.buttons = [...value.matchAll(/<button\b([^>]*)>/g)].map(([, attrs]) => ({
      localName: "button", isConnected: true,
      getRootNode: () => root,
      getAttributeNames: () => [...attrs.matchAll(/([\w-]+)="[^"]*"/g)].map((match) => match[1]),
      getAttribute: (name) => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null,
      focus() { if (!this.disabled) root.activeElement = this; },
      disabled: /\bdisabled\b/.test(attrs),
      dataset: { period: attrs.match(/data-period="([^"]+)"/)?.[1] },
      retry: /data-history-retry/.test(attrs),
      surface: /class="surface"/.test(attrs),
      addEventListener(_type, handler) { this.click = () => handler({ stopPropagation() {} }); },
    }));
  }
  get innerHTML() { return this.html; }
  querySelector(selector) { return selector === "ha-card" ? this.surface : selector === ".surface" ? this.buttons.find((button) => button.surface) : selector === '[data-history-retry]' ? this.buttons.find(button => button.retry) : null; }
  querySelectorAll(selector) { return selector === "button" ? this.buttons : selector === "[data-period]" ? this.buttons.filter((button) => button.dataset.period) : []; }
}
globalThis.HTMLElement = class { attachShadow() { this.shadowRoot = new Shadow(); } };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.customElements = { get: () => true };
let navigations = 0;
globalThis.window = {
  MaraoDashboard: { haptic() {} },
  history: { pushState() { navigations += 1; } },
  location: { pathname: "/marao-dashboard/card-test", search: "" },
  dispatchEvent() {},
};
globalThis.HashChangeEvent = class {};
globalThis.navigationTranslations = (await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js')).navigationTranslations;
const source = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoRuntime.js", import.meta.url), "utf8");
const cardsSource = (await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8")).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url).href));
const cardsModule = `data:text/javascript;base64,${Buffer.from(cardsSource).toString("base64")}`;
const { MaraoCard } = await import(cardsModule);
const classes = source.slice(source.indexOf("function escapeHtml("), source.indexOf('if (!customElements.get("marao-energy-period-card"))'));
const { MaraoStateTimelineCard, MaraoEnergyPeriodCard } = await import(`data:text/javascript;base64,${Buffer.from(`import { nativeEditing, bindNativeEditing, energyBuckets, statisticsBuckets, energyTotal, historyPeriodRange, historySamples, loadHistoryChart, energyFormatting, energyValue, energyHistoryValue, energyLabel, formatEnergyNumber, binaryState, cardProblem, problemStyle, problemLabel, showCardDetails, createHistoryPlaceholder, layoutState, focusRestorer, controlGridStyles, updateCardSurface } from "${cardsModule}";\nconst localize = (key) => key;\n${classes}\nexport { MaraoStateTimelineCard, MaraoEnergyPeriodCard };`).toString("base64")}`);
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
const waitFor = async condition => {
  const deadline = Date.now() + 3000;
  while (!condition()) {
    assert.ok(Date.now() < deadline, 'Expected asynchronous history state did not settle');
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};
const state = (value = "21") => ({ state: value, attributes: { friendly_name: "History" }, last_changed: new Date().toISOString() });
test('graph history retains replaced authoritative live readings without mutating Recorder data or refetching', () => {
  const card = new MaraoCard(), now = Date.now();
  card._config = { template: 'md_graph_card', entity: 'sensor.history' };
  card._render = () => {}; card._subscribeClimate = () => {};
  const record = (ago, value) => ({ state: String(value), last_updated: new Date(now-ago).toISOString(), attributes: { unit_of_measurement: 'W' } });
  const old = record(25*3600000, 99), recorded = record(10000, 1), live = record(5000, 2), next = record(0, 3);
  const original = [old, recorded], hass = { states: { 'sensor.history': live } };
  card.hass = hass; card._graphHistory.set('sensor.history', original);
  const selected = card._historyOptions().samples.find(sample => sample.value === 2).time;
  const newer = { ...hass, states: { 'sensor.history': next } }; card.hass = newer;
  assert.deepEqual(card._historyOptions().samples.map(sample => [sample.time, sample.value]), [[now-10000,1],[selected,2],[now,3]]);
  assert.deepEqual(original, [old,recorded], 'Recorder response remains untouched');
  for (let index=0;index<5;index++) card.hass = { ...newer };
  assert.equal(card._graphHistory.get('sensor.history').length, 2, 'Unrelated updates must not accumulate observations');
  const corrected = { ...next, state: '4' }; card.hass = { ...newer, states: { 'sensor.history': corrected } };
  card.hass = { ...newer, states: { 'sensor.history': record(-1000,5) } };
  assert.equal(card._graphHistory.get('sensor.history').filter(item => item.last_updated === next.last_updated).length,1);
  assert.equal(card._graphHistory.get('sensor.history').find(item => item.last_updated === next.last_updated).state,'4');
});

test('graph updates reuse converted Recorder samples and retain exact spikes, gaps and corrected live readings', () => {
  const card = new MaraoCard(), now = Date.now();
  card._config = { template: 'md_graph_card', entity: 'sensor.history' };
  card._render = () => {}; card._subscribeClimate = () => {};
  let reads = 0;
  const raw = Object.freeze(Array.from({length:1000}, (_, index) => Object.freeze({
    get state() { reads++; return index === 500 ? '12345.6789' : index === 600 ? 'unavailable' : '1'; },
    attributes: { unit_of_measurement:'W' }, last_updated:new Date(now-10000+index).toISOString(),
  })));
  const live = {state:'2',attributes:{unit_of_measurement:'W'},last_updated:new Date(now-1000).toISOString()};
  card.hass = {states:{'sensor.history':live}}; card._graphHistory.set('sensor.history',raw);
  const initial = card._historyOptions().samples;
  const initialReads = reads;
  const next = {...live,state:'3',last_updated:new Date(now).toISOString()};
  card.hass = {...card.hass,states:{'sensor.history':next}};
  const samples = card._historyOptions().samples;
  assert.equal(reads,initialReads,'A new observation must not reconvert existing Recorder history');
  assert.equal(samples.length,1002); assert.equal(samples[500].value,12345.6789); assert.equal(samples[600].value,null);
  assert.deepEqual(samples.slice(-2).map(sample=>sample.value),[2,3]);
  assert.equal(initial.at(-1).value,2,'Previously returned chart data remains untouched');
  assert.equal(raw.length,1000);
  card.hass = {...card.hass,states:{'sensor.history':{...next,state:'4'}}};
  assert.equal(card._historyOptions().samples.at(-1).value,4);
  assert.equal(card._historyOptions().samples.length,1002,'A corrected timestamp replaces the old value');
  card.hass = {...card.hass,states:{'sensor.history':{...next,state:'0.004',attributes:{unit_of_measurement:'kW'}}}};
  const converted = card._historyOptions().samples;
  assert.ok(Math.abs(converted[500].value-12.3456789)<1e-12); assert.equal(converted.at(-1).value,0.004);
  assert.ok(reads>initialReads,'Changing the source unit must invalidate the derived conversion');
});

test('off-screen graphs retain observations and update active popups, then catch up before entering view', t => {
  const previous = globalThis.IntersectionObserver, observers=[];
  globalThis.IntersectionObserver = class { constructor(callback){this.callback=callback;observers.push(this);} observe(){} disconnect(){this.disconnected=true;} };
  t.after(()=>{globalThis.IntersectionObserver=previous;});
  const card = new MaraoCard(); card.isConnected=true;
  card.setConfig({template:'md_graph_card',entity:'sensor.history'});
  const live = state('21'); card.hass={states:{'sensor.history':live}};
  card._graphHistory.set('sensor.history',[]); card._render();
  const observer=observers[0]; observer.callback([{isIntersecting:false}]);
  const renders=card.shadowRoot.renders; let popupUpdates=0;
  card._activeHistoryPopup={_refreshHistory(){popupUpdates++;}};
  card.hass={...card.hass,states:{'sensor.history':{...live,state:'22',last_changed:new Date(Date.now()+1).toISOString()}}};
  assert.equal(card.shadowRoot.renders,renders); assert.equal(popupUpdates,1);
  assert.equal(card._graphHistory.get('sensor.history')[0],live);
  observer.callback([{isIntersecting:true}]);
  assert.match(card.shadowRoot.innerHTML,/22/); assert.ok(card.shadowRoot.renders>renders);
  card._activeHistoryPopup=null; card.isConnected=false; card.disconnectedCallback();
  assert.equal(observer.disconnected,true);
});

test('energy detail skips unrelated reports but updates readings, contributors, tariffs and locale', () => {
  const card = new MaraoEnergyPeriodCard();
  card.setConfig({entity:'sensor.history',popup:true,sub_entities:[{entity_id:'sensor.device',name:'Device'}]});
  let renders=0; card._render=()=>renders++; card._load=()=>{};
  const hass={states:{'sensor.history':state('10'),'sensor.device':state('2'),'sensor.price':{state:'0.25',attributes:{unit_of_measurement:'EUR/kWh'}}},config:{currency:'EUR',time_zone:'UTC'}};
  card.hass=hass;
  card._preferences={energy_sources:[{type:'grid',flow_from:[{stat_energy_from:'sensor.history',entity_energy_price:'sensor.price'}]}]};
  card.hass=hass; const baseline=renders;
  for(let index=0;index<3;index++)card.hass={...hass,states:{...hass.states,'sensor.history':{...hass.states['sensor.history'],last_changed:new Date().toISOString()},'sensor.unrelated':state(String(index))}};
  assert.equal(renders,baseline,'Unrelated state reports must not reach the detail renderer');
  card.hass={...hass,states:{...hass.states,'sensor.history':state('11')}}; assert.equal(renders,baseline+1);
  card.hass={...card._hass,states:{...card._hass.states,'sensor.device':state('3')}}; assert.equal(renders,baseline+2);
  card.hass={...card._hass,states:{...card._hass.states,'sensor.price':{...hass.states['sensor.price'],state:'0.30'}}}; assert.equal(renders,baseline+3);
  card.hass={...card._hass,locale:{language:'pt'}}; assert.equal(renders,baseline+4);
  card.hass={...card._hass,connected:false}; assert.equal(renders,baseline+5);
});
function create(Card, popup = true) {
  const card = new Card();
  card._bindTracking = () => {};
  card._spaceTicks = () => {};
  card.setConfig({ entity: "sensor.history", popup, popup_hash: "#history" });
  return card;
}

test('timeline spaces time labels even when history is empty', () => {
  const card = create(MaraoStateTimelineCard, false);
  let spaced = 0;
  card._spaceTicks = () => spaced++;
  card._history = [];
  card._range = { start: Date.now() - 86400000, end: Date.now() };
  card._hass = { states: { 'sensor.history': state() } };
  card._render();
  assert.match(card.shadowRoot.innerHTML, /class="tick first"/);
  assert.equal(spaced, 1);
});

for (const Card of [MaraoStateTimelineCard, MaraoEnergyPeriodCard]) test(`${Card.name} keeps unchanged content mounted on background updates`, () => {
  const card = create(Card, false), reported = state();
  card.hass = { states: { 'sensor.history': reported } };
  const renders = card.shadowRoot.renders;
  for (let index = 0; index < 3; index++) card.hass = { states: { 'sensor.history': {...reported}, 'sensor.unrelated': state(String(index)) } };
  assert.equal(card.shadowRoot.renders, renders, 'Equivalent readings and unrelated changes must not reset the page');
  card.hass = { states: { 'sensor.history': state('unavailable') } };
  assert.ok(card.shadowRoot.renders > renders, 'Availability must still update immediately');
});

test('energy periods retain legacy entity aliases and day-summary defaults', () => {
  const card = new MaraoEnergyPeriodCard();
  card.setConfig({ entity_id: 'sensor.history' });
  assert.equal(card._config.entity, 'sensor.history');
  assert.equal(card._config.period, 'day');
  assert.equal(card._config.popup, false);
  assert.equal(card._offset, 0);
});

for (const Card of [MaraoStateTimelineCard, MaraoEnergyPeriodCard]) {
  test(`${Card.name} invalidates in-flight history when the shared connection mutates`, async () => {
    const card = create(Card);
    const connection = { connected: true };
    let finish;
    const hass = { connected: true, connection, states: { "sensor.history": state() }, callApi: () => new Promise((resolve) => { finish = resolve; }) };
    card.hass = hass;
    connection.connected = false;
    card.hass = { ...hass, connected: false };
    finish([[state()]]);
    await tick();
    assert.equal(card._history?.length || 0, 0);
    assert.equal(card._loading, false);
    assert.match(card.shadowRoot.innerHTML, /data-history-state="unavailable"/);
    connection.connected = true;
    card.hass = { ...hass, callApi: async () => [] };
    await tick();
    assert.match(card.shadowRoot.innerHTML, /data-history-state="empty"/);
  });

  test(`${Card.name} loads once, distinguishes empty/error, and ignores unrelated updates`, async () => {
    for (const fail of [false, true]) {
      const card = create(Card);
      let calls = 0;
      const hass = { states: { "sensor.history": state() }, callApi: async () => { calls += 1; if (fail) throw new Error("bad history"); return []; } };
      card.hass = hass;
      assert.match(card.shadowRoot.innerHTML, /data-history-state="loading"/);
      await tick();
      await waitFor(() => !card._loading && !card._prefetching);
      assert.match(card.shadowRoot.innerHTML, new RegExp(`data-history-state="${fail ? "error" : "empty"}"`));
      if (Card === MaraoEnergyPeriodCard && fail) assert.equal(card._detailOptions.error, 'timeline.history_unavailable');
      else assert.match(card.shadowRoot.innerHTML, fail ? /role="alert"/ : /role="status"/);
      for (let i = 0; i < 5; i += 1) card.hass = { ...hass };
      assert.equal(calls, Card === MaraoEnergyPeriodCard && !fail ? 5 : 1);
    }
  });

  test(`${Card.name} blocks neutral entities and stale in-flight history`, async () => {
    for (const neutral of ["unknown", "unavailable", null]) {
      const card = create(Card);
      let calls = 0;
      card.hass = { states: neutral ? { "sensor.history": state(neutral) } : {}, callApi: async () => { calls += 1; return []; } };
      assert.equal(calls, 0);
      assert.match(card.shadowRoot.innerHTML, new RegExp(`data-history-state="${neutral || "unknown"}"`));
      for (const button of card.shadowRoot.buttons) {
        assert.equal(button.disabled, true);
        button.click();
      }
      assert.equal(calls, 0);
    }
    const card = create(Card);
    let finish;
    const hass = { states: { "sensor.history": state() }, callApi: () => new Promise((resolve) => { finish = resolve; }) };
    card.hass = hass;
    card.hass = { ...hass, connected: false };
    finish([[state()]]);
    await tick();
    assert.match(card.shadowRoot.innerHTML, /data-history-state="unavailable"/);
    assert.equal(card._history?.length || 0, 0);
    card.hass = { ...hass, callApi: async () => [] };
    await tick();
    assert.match(card.shadowRoot.innerHTML, /data-history-state="empty"/);
  });
}

test("energy summary requests recorded consumption and cannot navigate when disabled", async () => {
  const card = create(MaraoEnergyPeriodCard, false);
  let calls = 0;
  const hass = { states: { "sensor.history": state("0") }, async callApi() { calls += 1; return []; } };
  card.hass = hass;
  await tick();
  assert.match(card.shadowRoot.innerHTML, /energy.no_data/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="value">0</);
  assert.equal(calls, 1);
  card.shadowRoot.querySelector(".surface").click();
  assert.equal(navigations, 1);
  card.hass = { ...hass, connected: false };
  const button = card.shadowRoot.querySelector(".surface");
  assert.equal(button.disabled, true);
  button.click();
  assert.equal(navigations, 1);
  assert.match(card.shadowRoot.innerHTML, /class="value placeholder">—<\/span><span class="period">Disconnected</);
});

test("energy summary keeps the restored popup invoker focused through the next HA update", () => {
  const card = create(MaraoEnergyPeriodCard, false);
  card.hass = { states: { "sensor.history": state("21") }, callApi: async () => [] };
  const original = card.shadowRoot.querySelector(".surface");
  original.focus();
  card.hass = { ...card._hass, states: { "sensor.history": state("22") } };
  const replacement = card.shadowRoot.querySelector(".surface");
  assert.equal(replacement, original);
  assert.equal(original.isConnected, true);
  assert.equal(card.shadowRoot.activeElement, replacement);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="value">22</);
});

test('energy prefetch waits for the first period to load and paint', async () => {
  const card = create(MaraoEnergyPeriodCard);
  let finish, paint, calls = 0;
  const previousFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = callback => { paint = callback; };
  try {
    card.hass = { states: { 'sensor.history': state() }, callApi: () => {
      calls++;
      return calls === 1 ? new Promise(resolve => { finish = resolve; }) : Promise.resolve([]);
    } };
    await tick();
    assert.equal(calls, 1, 'opening requests only the selected period');
    assert.equal(paint, undefined, 'no prefetch is scheduled while the period is loading');
    finish([]); await waitFor(() => typeof paint === 'function');
    assert.equal(card._loading, false);
    assert.equal(calls, 1, 'selected data renders before any background request');
    assert.equal(typeof paint, 'function');
    paint();
    assert.equal(calls, 1, 'prefetch also yields until after the animation frame');
    await waitFor(() => calls === 5);
  } finally {
    if (previousFrame) globalThis.requestAnimationFrame = previousFrame;
    else delete globalThis.requestAnimationFrame;
  }
});

for (const period of ['month', 'day']) test(`energy ${period} prefetches four periods in both directions and navigates cached data immediately`, async () => {
  const card = create(MaraoEnergyPeriodCard);
  card.setConfig({ ...card._config, period });
  card._offset = -6;
  const urls = [];
  card.hass = { config: { time_zone: 'Europe/Lisbon' }, states: { 'sensor.history': state() }, callApi: async (_method, url) => { urls.push(url); return [[state()]]; } };
  await waitFor(() => urls.length === 9);
  const expected = [0, -1, 1, -2, 2, -3, 3, -4, 4].map(distance => card._range(-6 + distance).start.toISOString());
  assert.deepEqual(urls.map(url => url.split('?')[0].slice('history/period/'.length)), expected);
  const cached = card._periodCache.get(card._range(-7).start.toISOString()).result.series;
  card.shadowRoot.buttons.find(button => button.dataset.period === 'previous').click();
  assert.equal(card._offset, -7);
  assert.equal(card._loading, false, 'cached navigation has no loading frame');
  assert.equal(card._series, cached, 'chart and breakdown use the prefetched period');
  await waitFor(() => !card._prefetching);
  assert.equal(urls.length, 10, 'only the newly adjacent period is requested');
  assert.equal(card._periodCache.size, 9);
  card.shadowRoot.buttons.find(button => button.dataset.period === 'next').click();
  assert.equal(card._loading, false);
  await waitFor(() => !card._prefetching);
  card._offset = 0; await card._load(); await waitFor(() => !card._prefetching);
  assert.equal(card._periodCache.size, 5, 'future periods are excluded');
  const currentKey = card._range().start.toISOString();
  const count = urls.filter(url => url.includes(currentKey)).length;
  card._periodCache.get(currentKey).result.loadedAt -= 61000;
  card._offset = -1; await card._load();
  card._offset = 0; await card._load(); await waitFor(() => !card._prefetching);
  assert.equal(urls.filter(url => url.includes(currentKey)).length, count + 1, 'returning to a stale current period refreshes it');
});

test('energy navigation shares pending background requests and retries failed cached periods', async () => {
  const card = create(MaraoEnergyPeriodCard), urls = [];
  let finish, fail = false;
  const hass = { states: { 'sensor.history': state() }, callApi: (_method, url) => {
    urls.push(url);
    if (urls.length === 2) return new Promise(resolve => { finish = resolve; });
    return fail ? Promise.reject(new Error('history failed')) : Promise.resolve([]);
  } };
  card.hass = hass;
  await waitFor(() => typeof finish === 'function');
  card.shadowRoot.buttons.find(button => button.dataset.period === 'previous').click();
  assert.equal(card._loading, true);
  assert.equal(urls.length, 2, 'foreground joins the pending prefetch');
  fail = true; finish([]); await waitFor(() => !card._loading && !card._prefetching);
  assert.equal(card._error, false, 'background failures do not replace the selected period');
  const key = card._range(-2).start.toISOString();
  assert.equal(card._periodCache.get(key).result.failed, true);
  const before = urls.filter(url => url.includes(key)).length;
  fail = false;
  card.shadowRoot.buttons.find(button => button.dataset.period === 'previous').click();
  await tick();
  assert.equal(urls.filter(url => url.includes(key)).length, before + 1);
  assert.equal(card._error, false);
});

test('energy discards pending prefetches after source changes and removal', async () => {
  const card = create(MaraoEnergyPeriodCard);
  let finish, calls = 0;
  card.isConnected = true;
  card.hass = { states: { 'sensor.history': state(), 'sensor.other': state() }, callApi: async () => {
    calls++;
    return calls === 2 ? new Promise(resolve => { finish = resolve; }) : [];
  } };
  await waitFor(() => typeof finish === 'function');
  const oldCache = card._periodCache;
  card.setConfig({ ...card._config, entity: 'sensor.other' });
  await waitFor(() => !card._loading && !card._prefetching);
  const count = calls;
  finish([[state('999')]]); await tick();
  assert.notEqual(card._periodCache, oldCache);
  assert.equal(calls, count, 'invalidated worker schedules no more requests');
  assert.deepEqual(card._history, []);
  card.isConnected = false; card.disconnectedCallback(); await tick();
  assert.equal(card._periodCache.size, 0);
});

test("timeline appends authoritative live changes without fetching the same history again", async () => {
  const card = create(MaraoStateTimelineCard);
  const old = { ...state("off"), last_changed: new Date(Date.now() - 3600000).toISOString() };
  let calls = 0;
  card.hass = { states: { "sensor.history": old }, callApi: async () => { calls += 1; return [[old]]; } };
  await tick();
  card.hass = { ...card._hass, states: { "sensor.history": state("on") } };
  assert.equal(calls, 1);
  assert.equal(card._history.at(-1).state, "on");
  assert.match(card.shadowRoot.innerHTML, /data-history-state="ready"/);
  assert.equal(card._stateColor("unknown"), "var(--disabled-color)");
});

test('timeline omits only redundant binary current text and retains historical state labels', async () => {
  for (const [entity, current, previous] of [['binary_sensor.test', 'on', 'off'], ['lock.test', 'locked', 'unlocked']]) {
    const card = create(MaraoStateTimelineCard, false);
    card.setConfig({ entity, name: 'Timeline' });
    const now = Date.now();
    card.hass = { language: 'en', states: { [entity]: state(current) }, callApi: async () => [[
      { ...state(previous), last_changed: new Date(now - 3600000).toISOString() },
      { ...state(current), last_changed: new Date(now - 600000).toISOString() },
    ]] };
    await tick();
    const html = card.shadowRoot.innerHTML;
    assert.doesNotMatch(html, /class="binary-cue"/);
    assert.match(html, /class="binary-state" role="img"/);
    assert.match(html, /role="img" aria-label="Timeline:/);
    assert.doesNotMatch(html.match(/<header>[\s\S]*?<\/header>/)[0], /<span>[^<]+<\/span>/);
    assert.match(html, new RegExp(`data-state="${previous}"`));
    assert.match(html, new RegExp(`data-state="${current}"`));
    assert.match(html, /class="legend"/);
  }
  const card = create(MaraoStateTimelineCard, false);
  card.hass = { states: { 'sensor.history': state('21') }, callApi: async () => [] };
  await tick();
  assert.match(card.shadowRoot.innerHTML, /<header>[\s\S]*?<span>21<\/span>/);
});

for (const Card of [MaraoStateTimelineCard, MaraoEnergyPeriodCard]) test(`${Card.name} gives history failure a whole surface and retries only explicitly`, async () => {
  const card = create(Card);
  let calls = 0, fail = true;
  const hass = { states: { 'sensor.history': state() }, callApi: async () => { calls++; if (fail) throw new Error('Rejected history'); return []; } };
  card.hass = hass;
  await tick();
  assert.match(card.shadowRoot.innerHTML, /data-problem="error" style="background:var\(--marao-problem-error-background/);
  if (Card === MaraoEnergyPeriodCard) assert.equal(card._detailOptions.error, 'timeline.history_unavailable');
  else assert.match(card.shadowRoot.innerHTML, /role="alert"/);
  if (Card === MaraoStateTimelineCard) assert.ok(card.shadowRoot.querySelector('[data-history-retry]'));
  else assert.equal(typeof card._detailOptions.onRetry, 'function');
  for (let index = 0; index < 3; index++) card.hass = { ...hass };
  assert.equal(calls, 1);
  fail = false;
  if (Card === MaraoEnergyPeriodCard) card._detailOptions.onRetry();
  else card.shadowRoot.querySelector('[data-history-retry]').click();
  await waitFor(() => !card._loading && !card._prefetching);
  assert.equal(calls, Card === MaraoEnergyPeriodCard ? 6 : 2);
  assert.match(card.shadowRoot.innerHTML, /data-history-state="empty"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-problem="error"/);
});

for (const Card of [MaraoStateTimelineCard, MaraoEnergyPeriodCard]) test(`${Card.name} initializes without inventing entity unavailability`, () => {
  const card = create(Card);
  assert.match(card.shadowRoot.innerHTML, /data-history-state="loading"/);
  assert.match(card.shadowRoot.innerHTML, /data-problem="loading"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-problem="neutral"/);
});

for (const Card of [MaraoStateTimelineCard, MaraoEnergyPeriodCard]) {
  for (const fail of [false, true]) test(`${Card.name} retains in-flight and settled history through HA shell moves (${fail ? 'error' : 'empty'})`, async () => {
    const card = create(Card);
    card.isConnected = true;
    let calls = 0, finish, reject;
    card.hass = {states: {'sensor.history': state()}, callApi: () => {calls++; return new Promise((resolve, fail) => {finish = resolve; reject = fail;});}};
    card.isConnected = false;
    card.disconnectedCallback?.();
    card.isConnected = true;
    card.connectedCallback();
    assert.equal(calls, 1);
    if (fail) reject(new Error('history failed')); else finish([]);
    await tick();
    if (Card === MaraoEnergyPeriodCard && !fail) await waitFor(() => calls === 2);
    card.isConnected = false;
    card.disconnectedCallback?.();
    card.isConnected = true;
    card.connectedCallback();
    assert.equal(calls, Card === MaraoEnergyPeriodCard && !fail ? 2 : 1);
    assert.match(card.shadowRoot.innerHTML, new RegExp(`data-history-state="${fail ? 'error' : 'empty'}"`));
    card.isConnected = false; card.disconnectedCallback?.();
  });
  test(`${Card.name} discards history completed while removed`, async () => {
    const card = create(Card);
    card.isConnected = true;
    let finish;
    card.hass = {states: {'sensor.history': state()}, callApi: () => new Promise(resolve => {finish = resolve;})};
    card.isConnected = false;
    card.disconnectedCallback?.();
    finish([[state()]]);
    await tick();
    assert.equal(card._history?.length || 0, 0);
    assert.equal(card._loadedKey, '');
  });
}


test('energy summary refresh is bounded, rolls periods over and stops in hidden pages, previews and removal', async t => {
  t.mock.timers.enable({apis:['setTimeout','Date'],now:Date.parse('2026-10-24T23:59:00Z')});
  const previousDocument=globalThis.document;
  globalThis.document={visibilityState:'visible'};
  const card=create(MaraoEnergyPeriodCard,false);
  card.isConnected=true;
  card._hass={connected:true,states:{'sensor.history':state()},config:{time_zone:'UTC'}};
  let calls=0;
  card._fetchPeriod=async()=>{calls++;return {series:{},failed:false};};
  try {
    card.connectedCallback();
    await Promise.resolve();await Promise.resolve();
    assert.equal(calls,1);
    const old=card._loadedKey;
    t.mock.timers.tick(60000);await Promise.resolve();await Promise.resolve();
    assert.equal(calls,2);assert.notEqual(card._loadedKey,old);
    globalThis.document.visibilityState='hidden';
    t.mock.timers.tick(60000);assert.equal(calls,2);
    globalThis.document.visibilityState='visible';
    t.mock.timers.tick(60000);await Promise.resolve();await Promise.resolve();
    assert.equal(calls,3);
    card.preview=true;t.mock.timers.tick(60000);assert.equal(calls,3);
    card.isConnected=false;card.disconnectedCallback();
    t.mock.timers.tick(60000);assert.equal(calls,3);
  } finally {card.isConnected=false;card.disconnectedCallback();globalThis.document=previousDocument;}
});
