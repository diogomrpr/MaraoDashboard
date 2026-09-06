import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

globalThis.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = {
      innerHTML: "",
      querySelector: () => null,
      querySelectorAll: () => [],
    };
  }
};

const source = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8");
const dashboardSource = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoDashboard.js", import.meta.url), "utf8");
const { ACCESS_HOLD_MS, MaraoCard, registerMaraoCards } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#visibility`);

function pointerEvent(type, values = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(values)) Object.defineProperty(event, key, { value });
  return event;
}

test("card registration can be retried after the custom-element registry becomes available", () => {
  const previousRegistry = globalThis.customElements;
  const registered = new Map();
  globalThis.customElements = {
    get: (name) => registered.get(name),
    define: (name, klass) => registered.set(name, klass),
  };
  try {
    registerMaraoCards();
    assert.deepEqual([...registered.keys()], ["marao-card", "marao-navbar-card", "marao-popup-card"]);
    registerMaraoCards();
    assert.equal(registered.size, 3);
  } finally {
    globalThis.customElements = previousRegistry;
  }
});

test("dashboard waits for Home Assistant's settled registry before loading and registering cards", () => {
  const ready = dashboardSource.indexOf("await waitForHomeAssistantRegistry();");
  const imports = dashboardSource.indexOf("await Promise.all([");
  const cards = dashboardSource.indexOf("registerMaraoCards();");
  const events = dashboardSource.indexOf("registerMaraoCameraEventCards();");
  assert.ok(ready >= 0 && ready < imports);
  assert.ok(imports < cards && cards < events);
  assert.match(dashboardSource, /customElements\?\.get\("home-assistant"\)/);
});

test("energy period cards provide calendar history navigation", () => {
  assert.match(dashboardSource, /customElements\.define\("marao-energy-period-card"/);
  assert.match(dashboardSource, /const entity = config\?\.entity \|\| config\?\.entity_id \|\| null/);
  assert.match(dashboardSource, /this\._config = \{ period: "day", popup: false, \.\.\.config, entity \}/);
  assert.match(dashboardSource, /history\/period\/\$\{start\.toISOString\(\)\}/);
  assert.match(dashboardSource, /data-period="previous"/);
  assert.match(dashboardSource, /data-period="next"/);
  assert.match(dashboardSource, /period === "month"/);
});

test("action cards honor icon-only visibility flags", () => {
  const card = new MaraoCard();
  card.setConfig({
    entity: "remote.apple_tv",
    icon: "mdi:chevron-up",
    show_name: false,
    show_state: false,
    show_label: false,
    tap_action: {
      action: "perform-action",
      perform_action: "remote.send_command",
      data: { command: "up" },
    },
  });
  card.hass = { callService() {}, states: { "remote.apple_tv": { state: "on", attributes: { friendly_name: "Apple TV" } } } };

  assert.match(card.shadowRoot.innerHTML, /class="body icon-only"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="title"|class="state"/);
  assert.match(card.shadowRoot.innerHTML, /icon="mdi:chevron-up"/);
  assert.match(card.shadowRoot.innerHTML, /<button class="card-action" type="button" data-card-action aria-label="Up" title="Up">/);
  assert.match(source, /\.body\.icon-only \{[^}]*display:flex;[^}]*align-items:center;[^}]*justify-content:center;[^}]*gap:0;/);
});

test("media app shortcuts stack a centered icon over a two-line title", () => {
  const card = new MaraoCard();
  card.setConfig({
    entity: "media_player.apple_tv",
    template: "hc_media_app_card",
    name: "YouTube",
    icon: "mdi:youtube",
    show_state: false,
  });
  card.hass = { states: { "media_player.apple_tv": { state: "idle", attributes: {} } } };

  assert.match(card.shadowRoot.innerHTML, /class="body media-app-card"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="state"/);
  assert.match(source, /\.body\.media-app-card \{[^}]*flex-direction:column;[^}]*align-items:center;[^}]*text-align:center;/);
  assert.match(source, /\.body\.media-app-card \.title \{[^}]*min-height:2\.5em;/);
});

test("wallbox current card uses a large stepper and optional shortcuts", () => {
  const card = new MaraoCard();
  card.setConfig({
    entity: "number.wallbox_current",
    template: "hc_wallbox_current_card",
    name: "Charging Current",
    variables: { shortcuts: [6, 12, 16, 20] },
  });
  card.hass = {
    callService() {},
    states: { "number.wallbox_current": { state: "10", attributes: { unit_of_measurement: "A" } } },
  };
  assert.equal((card.shadowRoot.innerHTML.match(/data-current-shortcut=/g) || []).length, 3);
  assert.match(card.shadowRoot.innerHTML, /class="number-stepper wallbox-stepper"/);
  assert.match(card.shadowRoot.innerHTML, /data-current-shortcut="12"/);
  assert.match(source, /\.wallbox-stepper \.number-value \{[^}]*font-size:2\.2rem/);
});

test("loading, unknown, and unavailable states stay distinct and disabled", () => {
  const card = new MaraoCard();
  card.setConfig({ entity: "light.test", template: "hc_light_card" });
  assert.match(card.shadowRoot.innerHTML, /<div class="state">Loading…<\/div>/);
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);

  card.hass = { callService() {}, states: {} };
  assert.match(card.shadowRoot.innerHTML, /<div class="state">unknown<\/div>/);
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);

  card.hass = { callService() {}, states: { "light.test": { state: "unavailable", attributes: {} } } };
  assert.match(card.shadowRoot.innerHTML, /<div class="state">unavailable<\/div>/);
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
});

test("access actions use tap or a cancellable 1.2 second hold as configured", () => {
  const safe = new MaraoCard();
  safe.setConfig({ entity: "lock.test", name: "Lock", template: "hc_access_action_card", variables: { action_service: "lock.lock" } });
  safe.hass = { callService() {}, states: { "lock.test": { state: "unlocked", attributes: {} } } };
  const safeMarkup = safe.shadowRoot.innerHTML.split("</style>")[1];
  assert.match(safeMarkup, /data-card-action/);
  assert.doesNotMatch(safeMarkup, /data-hold-action|class="hold-progress"/);

  const held = new MaraoCard();
  held.setConfig({ entity: "lock.test", name: "Lock", template: "hc_access_hold_action_card", variables: { action_service: "lock.lock" } });
  held.hass = { callService() {}, states: { "lock.test": { state: "unlocked", attributes: {} } } };
  const heldMarkup = held.shadowRoot.innerHTML.split("</style>")[1];
  assert.match(heldMarkup, /data-card-action data-hold-action aria-label="Hold to Lock"/);
  assert.match(heldMarkup, /class="hold-progress"/);
  assert.match(heldMarkup, /<div class="climate">Hold to Lock<\/div>/);
  assert.match(source, /\["pointerup", "pointerleave", "pointercancel"\]/);
  assert.match(source, /\}, ACCESS_HOLD_MS\);/);
  assert.match(source, /this\._holdCompleted = false;\s+haptic\("heavy"\);/);
  assert.match(source, /variables\?\.action_label_key/);
});

test("hold completion runs once while release, departure, and cancellation stop it", () => {
  const original = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  let scheduled;
  let delay;
  globalThis.setTimeout = (callback, timeout) => { scheduled = callback; delay = timeout; return 1; };
  globalThis.clearTimeout = () => { scheduled = null; };
  globalThis.requestAnimationFrame = () => 2;
  globalThis.cancelAnimationFrame = () => {};
  try {
    const card = new MaraoCard();
    const button = new EventTarget();
    button.disabled = false;
    button.getBoundingClientRect = () => ({ left: 0, right: 100, top: 0, bottom: 100 });
    const surface = { classList: { add() {}, remove() {} } };
    let completions = 0;
    card._bindHoldAction(button, surface, () => { completions += 1; });

    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    assert.equal(delay, ACCESS_HOLD_MS);
    const complete = scheduled;
    complete();
    complete();
    assert.equal(completions, 1);
    button.dispatchEvent(pointerEvent("pointerup"));

    for (const eventName of ["pointerup", "pointerleave", "pointercancel"]) {
      button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
      assert.equal(typeof scheduled, "function");
      button.dispatchEvent(pointerEvent(eventName));
      assert.equal(scheduled, null, eventName);
    }
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    button.dispatchEvent(pointerEvent("pointermove", { clientX: 101, clientY: 50 }));
    assert.equal(scheduled, null);
    assert.equal(completions, 1);
  } finally {
    Object.assign(globalThis, original);
  }
});

test("popup owns an inert background, trapped focus, and a 48px close button", () => {
  assert.match(source, /for \(const \{ element \} of this\._backgroundState\) element\.inert = true/);
  assert.match(source, /event\.key === "Tab"\) this\._trapFocus\(event\)/);
  assert.match(source, /this\._focus\?\.focus\?\.\(\)/);
  assert.match(source, /\.marao-popup-close\{flex:0 0 48px;width:48px;height:48px/);
  assert.doesNotMatch(source, /focus-visible/);
});

test("popup preserves child cards while forwarding Home Assistant state updates", () => {
  assert.match(source, /set hass\(value\) \{ this\._hass = value; this\._updateChildrenHass\(\); \}/);
  assert.match(source, /for \(const card of host\?\.children \|\| \[\]\) card\.hass = this\._hass/);
  assert.doesNotMatch(source, /set hass\(value\) \{ this\._hass = value; this\._renderChildren\(\); \}/);
});
