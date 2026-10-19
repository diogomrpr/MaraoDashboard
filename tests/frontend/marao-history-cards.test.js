import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

class Shadow {
  constructor() { this.buttons = []; this.html = ''; }
  set innerHTML(value) {
    for (const button of this.buttons || []) button.isConnected = false;
    this.activeElement = null;
    this.html = value;
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
  querySelector(selector) { return selector === ".surface" ? this.buttons.find((button) => button.surface) : selector === '[data-history-retry]' ? this.buttons.find(button => button.retry) : null; }
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
const source = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoDashboard.js", import.meta.url), "utf8");
const cardsSource = (await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8")).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url).href));
const cardsModule = `data:text/javascript;base64,${Buffer.from(cardsSource).toString("base64")}`;
const { MaraoCard } = await import(cardsModule);
const classes = source.slice(source.indexOf("function escapeHtml("), source.indexOf('if (!customElements.get("marao-energy-period-card"))'));
const { MaraoStateTimelineCard, MaraoEnergyPeriodCard } = await import(`data:text/javascript;base64,${Buffer.from(`import { historyPeriodRange, historySamples, loadHistoryChart, energyFormatting, energyValue, energyHistoryValue, energyLabel, formatEnergyNumber, binaryState, cardProblem, problemStyle, focusRestorer } from "${cardsModule}";\nconst localize = (key) => key;\n${classes}\nexport { MaraoStateTimelineCard, MaraoEnergyPeriodCard };`).toString("base64")}`);
const tick = () => new Promise((resolve) => setImmediate(resolve));
const state = (value = "21") => ({ state: value, attributes: { friendly_name: "History" }, last_changed: new Date().toISOString() });
test('graph history retains replaced authoritative live readings without mutating Recorder data or refetching', () => {
  const card = new MaraoCard(), now = Date.now();
  card._config = { template: 'hc_graph_card', entity: 'sensor.history' };
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
function create(Card, popup = true) {
  const card = new Card();
  card._bindTracking = () => {};
  card._spaceTicks = () => {};
  card.setConfig({ entity: "sensor.history", popup, popup_hash: "#history" });
  return card;
}

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
      assert.match(card.shadowRoot.innerHTML, new RegExp(`data-history-state="${fail ? "error" : "empty"}"`));
      if (Card === MaraoEnergyPeriodCard && fail) assert.equal(card._detailOptions.error, 'timeline.history_unavailable');
      else assert.match(card.shadowRoot.innerHTML, fail ? /role="alert"/ : /role="status"/);
      for (let i = 0; i < 5; i += 1) card.hass = { ...hass };
      assert.equal(calls, 1);
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

test("energy summary renders authoritative values without requesting history or navigating when disabled", () => {
  const card = create(MaraoEnergyPeriodCard, false);
  let calls = 0;
  const hass = { states: { "sensor.history": state("0") }, callApi() { calls += 1; } };
  card.hass = hass;
  assert.match(card.shadowRoot.innerHTML, /class="value">0</);
  assert.equal(calls, 0);
  card.shadowRoot.querySelector(".surface").click();
  assert.equal(navigations, 1);
  card.hass = { ...hass, connected: false };
  const button = card.shadowRoot.querySelector(".surface");
  assert.equal(button.disabled, true);
  button.click();
  assert.equal(navigations, 1);
  assert.match(card.shadowRoot.innerHTML, /class="value">common.unavailable</);
});

test("energy summary keeps the restored popup invoker focused through the next HA update", () => {
  const card = create(MaraoEnergyPeriodCard, false);
  card.hass = { states: { "sensor.history": state("21") }, callApi: async () => [] };
  const original = card.shadowRoot.querySelector(".surface");
  original.focus();
  card.hass = { ...card._hass, states: { "sensor.history": state("22") } };
  const replacement = card.shadowRoot.querySelector(".surface");
  assert.notEqual(replacement, original);
  assert.equal(original.isConnected, false);
  assert.equal(card.shadowRoot.activeElement, replacement);
  assert.match(card.shadowRoot.innerHTML, /class="value">22</);
});

test("energy period navigation renders loading immediately and fetches each completed period change once", async () => {
  const card = create(MaraoEnergyPeriodCard);
  const urls = [];
  card.hass = { states: { "sensor.history": state() }, callApi: async (_method, url) => { urls.push(url); return []; } };
  await tick();
  const previous = card.shadowRoot.buttons.find((button) => button.dataset.period === "previous");
  previous.click();
  assert.match(card.shadowRoot.innerHTML, /data-history-state="loading"/);
  previous.click();
  assert.equal(card._offset, -1);
  await tick();
  assert.equal(urls.length, 2);
  assert.notEqual(urls[0], urls[1]);
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
    assert.match(html, /class="binary-cue"/);
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
  assert.ok(card.shadowRoot.querySelector('[data-history-retry]'));
  for (let index = 0; index < 3; index++) card.hass = { ...hass };
  assert.equal(calls, 1);
  fail = false;
  card.shadowRoot.querySelector('[data-history-retry]').click();
  await tick();
  assert.equal(calls, 2);
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
    card.isConnected = false;
    card.disconnectedCallback?.();
    card.isConnected = true;
    card.connectedCallback();
    assert.equal(calls, 1);
    assert.match(card.shadowRoot.innerHTML, new RegExp(`data-history-state="${fail ? 'error' : 'empty'}"`));
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
