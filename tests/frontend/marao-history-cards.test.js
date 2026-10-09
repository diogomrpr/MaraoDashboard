import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

class Shadow {
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
      surface: /class="surface"/.test(attrs),
      addEventListener(_type, handler) { this.click = () => handler({ stopPropagation() {} }); },
    }));
  }
  get innerHTML() { return this.html; }
  querySelector(selector) { return selector === ".surface" ? this.buttons.find((button) => button.surface) : null; }
  querySelectorAll(selector) { return selector === "button" ? this.buttons : selector === "[data-period]" ? this.buttons.filter((button) => button.dataset.period) : []; }
}
globalThis.HTMLElement = class { attachShadow() { this.shadowRoot = new Shadow(); } };
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
const cardsSource = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8");
const cardsModule = `data:text/javascript;base64,${Buffer.from(cardsSource).toString("base64")}`;
const classes = source.slice(source.indexOf("function escapeHtml("), source.indexOf('if (!customElements.get("marao-energy-period-card"))'));
const { MaraoStateTimelineCard, MaraoEnergyPeriodCard } = await import(`data:text/javascript;base64,${Buffer.from(`import { focusRestorer } from "${cardsModule}";\nconst localize = (key) => key;\n${classes}\nexport { MaraoStateTimelineCard, MaraoEnergyPeriodCard };`).toString("base64")}`);
const tick = () => new Promise((resolve) => setImmediate(resolve));
const state = (value = "21") => ({ state: value, attributes: { friendly_name: "History" }, last_changed: new Date().toISOString() });
function create(Card, popup = true) {
  const card = new Card();
  card._bindTracking = () => {};
  card._spaceTicks = () => {};
  card.setConfig({ entity: "sensor.history", popup, popup_hash: "#history" });
  return card;
}

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
      assert.match(card.shadowRoot.innerHTML, fail ? /role="alert"/ : /role="status"/);
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
