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
const { ACCESS_HOLD_MS, MaraoCard, MaraoPopupCard, callServiceWithNotification, focusRestorer, performAction, registerMaraoCards, stateAppearance, summaryState, vacuumActions } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#visibility`);

test("actions disable and decline unavailable service targets independent of their displayed entity", async () => {
  const calls = [];
  const hass = { callService: async (...args) => calls.push(args), states: { "media_player.test": { state: "playing", attributes: {} }, "remote.test": { state: "unavailable" } } };
  const card = new MaraoCard();
  card.setConfig({ entity: "media_player.test", tap_action: { action: "perform-action", perform_action: "remote.send_command", target: { entity_id: "remote.test" } } });
  card.hass = hass;
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  await performAction(hass, card._config.tap_action, "media_player.test");
  await callServiceWithNotification(hass, "light", "turn_off", { entity_id: ["media_player.test", "missing.entity"] });
  assert.equal(calls.length, 0);
  hass.states["remote.test"] = { state: "on" };
  card.hass = { ...hass };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  await performAction(hass, card._config.tap_action, "media_player.test");
  assert.equal(calls.length, 1);
});

test("summaries count every device and keep mixed-availability navigation actionable", () => {
  const states = { "light.off": { state: "off" }, "light.on": { state: "on" }, "light.unavailable": { state: "unavailable" } };
  assert.deepEqual(summaryState(["light.off", "light.on", "light.on"], { states }), { state: "on", label: "1 active" });
  assert.deepEqual(summaryState(["light.unavailable", "light.on"], { states }), { state: "on", label: "1 active, 1 unavailable" });
  assert.deepEqual(summaryState(["light.off"], { states }), { state: "off", label: "All off" });
  const card = new MaraoCard();
  card.setConfig({ template: "hc_navigation_card", entity: "light.unavailable", variables: { summary_entities: ["light.unavailable", "light.on"] }, tap_action: { action: "navigate", navigation_path: "#lights" } });
  card.hass = { states, callService() {} };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  assert.match(card.shadowRoot.innerHTML, /1 active, 1 unavailable/);
  card.hass = { states: { "light.unavailable": states["light.unavailable"] }, callService() {} };
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
});

test("vacuum commands honor native capabilities and send each configured segment intact", async () => {
  const state = { state: "docked", attributes: { supported_features: 8192 | 4 | 16 | 256 } };
  const actions = vacuumActions(state, { action_1: { segment: 0 }, action_2: { segment: 22, icon: "mdi:sofa" }, action_3: { segment: 23, on_action: "vacuum.start" } });
  assert.deepEqual(actions.map((action) => action.service), ["vacuum.start", "vacuum.pause", "vacuum.return_to_base", "vacuum.send_command", "vacuum.send_command", "vacuum.start"]);
  assert.deepEqual(actions[3].data, { command: "app_segment_clean", params: [0] });
  assert.deepEqual(actions[5].data, {});
  const calls = [];
  await performAction({ callService: async (...args) => calls.push(args) }, { action: "call-service", service: actions[4].service, data: actions[4].data }, "vacuum.test");
  assert.deepEqual(calls[0].slice(0, 3), ["vacuum", "send_command", { command: "app_segment_clean", params: [22], entity_id: "vacuum.test" }]);
  assert.deepEqual(vacuumActions({ attributes: { supported_features: 8192 } }, { action_1: { segment: 21 } }).map((entry) => entry.key), ["start"]);
});

test("shared builder settings change the rendered labels, icons and power reading", () => {
  const card = new MaraoCard();
  card.setConfig({ template: "hc_switch_card", entity: "switch.test", variables: { custom_label: "Status: ", power_entity: "sensor.power", power_unit: "kW" } });
  card.hass = { callService() {}, states: { "switch.test": { state: "on", attributes: {} }, "sensor.power": { state: "2", attributes: {} } } };
  assert.match(card.shadowRoot.innerHTML, /Status: on/);
  assert.match(card.shadowRoot.innerHTML, /2 kW/);
  card.setConfig({ template: "hc_sensor_card", entity: "binary_sensor.test", variables: { on_icon: "mdi:check", off_icon: "mdi:close" } });
  card.hass = { callService() {}, states: { "binary_sensor.test": { state: "off", attributes: {}, last_updated: "2026-10-09T12:00:00Z" } } };
  assert.match(card.shadowRoot.innerHTML, /icon="mdi:close"/);
  assert.match(card.shadowRoot.innerHTML, /Updated /);
});

test("unknown custom colors remain neutral and toggle graph presentation honors its builder fields", () => {
  const variables = { toggle_entity: "switch.test", active_content_color: "#111", active_icon_background: "#eee", inactive_background: "#ddd", inactive_name_color: "#222", inactive_state_color: "#333", inactive_icon_color: "#444", inactive_icon_background: "#ccc" };
  assert.deepEqual(stateAppearance("hc_toggle_graph_card", "unknown", { variables }, { states: { "switch.test": { state: "on" } } }), { unavailable: true });
  const active = stateAppearance("hc_toggle_graph_card", "2", { variables }, { states: { "switch.test": { state: "on" } } });
  assert.equal(active.text, "#111"); assert.equal(active.iconBackground, "#eee");
  const inactive = stateAppearance("hc_toggle_graph_card", "2", { variables }, { states: { "switch.test": { state: "off" } } });
  assert.equal(inactive.background, "#ddd"); assert.equal(inactive.stateText, "#333"); assert.equal(inactive.icon, "#444");
});

test("native on-off devices do not offer unsupported value sliders", () => {
  const card = new MaraoCard();
  assert.equal(card._range("light.test", { state: "on", attributes: { supported_color_modes: ["onoff"] } }, "hc_light_card"), "");
  assert.equal(card._range("fan.test", { state: "on", attributes: { supported_features: 0 } }, "hc_fan_card"), "");
  assert.match(card._range("light.test", { state: "off", attributes: { supported_color_modes: ["brightness"] } }, "hc_light_card"), /type="range"/);
});

test("relative media seek uses live position and elapsed playback while respecting both bounds", async () => {
  const calls = [];
  const state = { state: "paused", attributes: { media_position: 5, media_duration: 120 } };
  const hass = { callService: async (...args) => calls.push(args), states: { "media_player.test": state } };
  const action = { action: "perform-action", perform_action: "media_player.media_seek", seek_offset: -10 };
  await performAction(hass, action, "media_player.test");
  assert.equal(calls.at(-1)[2].seek_position, 0);
  state.attributes.media_position = 110;
  await performAction(hass, { ...action, seek_offset: 30 }, "media_player.test");
  assert.equal(calls.at(-1)[2].seek_position, 120);
  state.state = "playing"; state.attributes.media_position = 40;
  state.attributes.media_position_updated_at = new Date(Date.now() - 10000).toISOString();
  await performAction(hass, action, "media_player.test");
  assert.ok(calls.at(-1)[2].seek_position >= 40 && calls.at(-1)[2].seek_position <= 41);
});

test("a dual-action hold dispatches either the tap or the hold and never both", () => {
  const originalTimeout = globalThis.setTimeout;
  const originalClear = globalThis.clearTimeout;
  let timer;
  globalThis.setTimeout = (callback) => { timer = callback; return 1; };
  globalThis.clearTimeout = () => { timer = null; };
  try {
    const card = new MaraoCard(); const button = new EventTarget(); const calls = [];
    button.getBoundingClientRect = () => ({ left: 0, top: 0, right: 50, bottom: 50 });
    card._bindHoldAction(button, null, () => calls.push("hold"), () => calls.push("tap"));
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    button.dispatchEvent(pointerEvent("pointerup")); button.dispatchEvent(new Event("click"));
    assert.deepEqual(calls, ["tap"]);
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 })); timer();
    button.dispatchEvent(pointerEvent("pointerup")); button.dispatchEvent(new Event("click"));
    assert.deepEqual(calls, ["tap", "hold"]);
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    button.dispatchEvent(pointerEvent("pointermove", { clientX: 60, clientY: 25 }));
    button.dispatchEvent(pointerEvent("pointerup")); button.dispatchEvent(new Event("click"));
    assert.deepEqual(calls, ["tap", "hold"]);
    button.dispatchEvent(new Event("click"));
    assert.deepEqual(calls, ["tap", "hold", "tap"], "native semantic click also activates a safe tap");
  } finally { globalThis.setTimeout = originalTimeout; globalThis.clearTimeout = originalClear; }
});

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

test("graph cards keep a single recorder history request and append live data", async () => {
  let requests = 0;
  const card = new MaraoCard();
  card.setConfig({ entity: "sensor.power", template: "hc_graph_card", name: "House Power" });
  card.hass = {
    callService() {},
    callApi: async () => {
      requests += 1;
      return [[
        { state: "80", last_updated: new Date(Date.now() - 60_000).toISOString() },
        { state: "120", last_updated: new Date().toISOString() },
      ]];
    },
    states: { "sensor.power": { state: "125", attributes: { unit_of_measurement: "W" } } },
  };
  await new Promise((resolve) => setImmediate(resolve));
  card.hass = {
    ...card.hass,
    states: { "sensor.power": { state: "130", attributes: { unit_of_measurement: "W" } } },
  };

  assert.equal(requests, 1);
  assert.match(card.shadowRoot.innerHTML, /class="graph-background"/);
  assert.match(card.shadowRoot.innerHTML, /<polyline class="line"/);
  assert.match(card.shadowRoot.innerHTML, /130 W/);
  assert.match(source, /history\/period\/\$\{start\.toISOString\(\)\}/);
});

test("graph cards sample full history to a card-scale trace", () => {
  const card = new MaraoCard();
  const now = Date.now();
  card.setConfig({ entity: "sensor.power", template: "hc_graph_card" });
  card.hass = {
    callService() {},
    states: { "sensor.power": { state: "100", attributes: {} } },
  };
  card._graphHistory.set("sensor.power", Array.from({ length: 1_000 }, (_, index) => ({
    state: String(index % 2 ? 1_000 : 0),
    last_updated: new Date(now - (1_000 - index) * 60_000).toISOString(),
  })));
  const markup = card._graphMarkup("sensor.power");
  const points = markup.match(/<polyline class="line" points="([^"]+)"/)?.[1].split(" ") || [];
  assert.ok(points.length <= 240);
  assert.match(markup, /<polygon class="fill"/);
});

test("graph history failures remain readable without repeated requests and recover after reconnect", async () => {
  const card = new MaraoCard();
  card.setConfig({ entity: "sensor.power", template: "hc_graph_card" });
  let requests = 0;
  let reject = true;
  const hass = {
    callService() {},
    states: { "sensor.power": { state: "125", attributes: { unit_of_measurement: "W" } } },
    callApi: async () => { requests += 1; if (reject) throw new Error("history failed"); return []; },
  };
  card.hass = hass;
  assert.match(card.shadowRoot.innerHTML, /data-graph-history-state="loading"/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(card.shadowRoot.innerHTML, /data-graph-history-state="error"/);
  assert.match(card.shadowRoot.innerHTML, /role="alert">History unavailable/);
  assert.match(card.shadowRoot.innerHTML, /125 W/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="graph-background"/);
  for (let i = 0; i < 5; i += 1) card.hass = { ...hass };
  assert.equal(requests, 1);
  card.hass = { ...hass, connected: false };
  assert.match(card.shadowRoot.innerHTML, /data-graph-history-state="unavailable"/);
  reject = false;
  card.hass = hass;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 2);
  assert.match(card.shadowRoot.innerHTML, /data-graph-history-state="empty"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /role="alert"/);
});

test("graph history ignores responses after its source becomes neutral or its card detaches", async () => {
  for (const transition of ["unknown", "unavailable", "disconnect", "detach"]) {
    const card = new MaraoCard();
    card.setConfig({ entity: "sensor.power", template: "hc_graph_card" });
    let finish;
    let requests = 0;
    const hass = {
      callService() {},
      states: { "sensor.power": { state: "125", attributes: {} } },
      callApi: () => { requests += 1; return new Promise((resolve) => { finish = resolve; }); },
    };
    card.hass = hass;
    if (transition === "detach") card.disconnectedCallback();
    else card.hass = transition === "disconnect" ? { ...hass, connected: false }
      : { ...hass, states: { "sensor.power": { state: transition, attributes: {} } } };
    finish([[{ state: "125", last_updated: new Date().toISOString() }]]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(card._graphHistory.size, 0, transition);
    assert.equal(requests, 1, transition);
    if (transition !== "detach") {
      assert.doesNotMatch(card.shadowRoot.innerHTML, /class="graph-background"/);
      card.hass = { ...card.hass };
      assert.equal(requests, 1, transition);
    }
    card.hass = { ...hass, callApi: async () => [] };
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(card.shadowRoot.innerHTML, /data-graph-history-state="empty"/, transition);
  }
});

test("idle ranges and graph requests detect mutation of Home Assistant's shared connection", async () => {
  const card = new MaraoCard();
  card.setConfig({ entity: "light.main", template: "hc_light_card", variables: { show_graph: true, graph_entity: "sensor.power" } });
  let finish;
  let requests = 0;
  const connection = { connected: true };
  const hass = {
    connected: true, connection, callService() {},
    callApi: () => { requests += 1; return new Promise((resolve) => { finish = resolve; }); },
    states: { "light.main": { state: "on", attributes: { brightness: 128 } }, "sensor.power": { state: "125", attributes: {} } },
  };
  card.hass = hass;
  // The idle-input branch is normally reached through the real shadow DOM.
  card.shadowRoot.querySelector = (selector) => selector === 'input[data-slider-key]' ? {} : null;
  connection.connected = false;
  card.hass = { ...hass, connected: false };
  assert.match(card.shadowRoot.innerHTML, /type="range"[^>]* disabled/);
  assert.equal(card._graphRequests.size, 0);
  finish([[{ state: "125", last_updated: new Date().toISOString() }]]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(card._graphHistory.size, 0);
  connection.connected = true;
  card.hass = hass;
  assert.doesNotMatch(card.shadowRoot.innerHTML, /type="range"[^>]* disabled/);
  assert.equal(requests, 2);
  card.disconnectedCallback();
});

test("room cards preserve navigation and expose an all-lights-off control", () => {
  const card = new MaraoCard();
  card.setConfig({
    entity: "light.main",
    template: "hc_room_card",
    name: "Living Room",
    icon: "mdi:sofa",
    variables: { light_entities: ["light.main", "light.accent"] },
    tap_action: { action: "navigate", navigation_path: "/marao-dashboard/living-room" },
  });
  card.hass = {
    callService() {},
    states: {
      "light.main": { state: "on", attributes: {} },
      "light.accent": { state: "on", attributes: {} },
    },
  };
  assert.match(card.shadowRoot.innerHTML, /data-room-lights-off/);
  assert.match(card.shadowRoot.innerHTML, /aria-label="Turn off all lights in Living Room"/);
  assert.match(card.shadowRoot.innerHTML, /<span>All off<\/span>/);
  assert.match(card.shadowRoot.innerHTML, /icon="mdi:sofa"/);
  assert.match(source, /\.room-lights-off \{[^}]*background:var\(--ha-card-background,var\(--card-background-color\)\); color:var\(--primary-text-color\);/);
  assert.match(source, /\.room-lights-off:disabled \{ opacity:\.6; cursor:default;/);

  card.hass = { ...card.hass, connected: false };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
  assert.match(card.shadowRoot.innerHTML, /data-room-lights-off[^>]* disabled/);

  card.hass = {
    ...card.hass,
    states: {
      "light.main": { state: "on", attributes: {} },
      "light.accent": { state: "unavailable", attributes: {} },
    },
  };
  assert.match(card.shadowRoot.innerHTML, /data-room-lights-off[^>]* disabled/);
});

test("room all-lights-off actions target every configured light", async () => {
  const calls = [];
  const lights = ["light.main", "light.accent"];
  await performAction(
    { callService: (...args) => calls.push(args) },
    { action: "call-service", service: "light.turn_off", data: { entity_id: lights } },
    lights[0],
  );
  assert.deepEqual(calls, [["light", "turn_off", { entity_id: lights }, undefined, false]]);
});

test("toggle graph cards use their toggle availability for control state", () => {
  const card = new MaraoCard();
  card.setConfig({
    entity: "sensor.power",
    template: "hc_toggle_graph_card",
    variables: { toggle_entity: "switch.heater" },
  });
  card.hass = {
    callService() {},
    states: {
      "sensor.power": { state: "unavailable", attributes: {} },
      "switch.heater": { state: "on", attributes: {} },
    },
  };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);

  card.hass = {
    ...card.hass,
    states: {
      "sensor.power": { state: "130", attributes: { unit_of_measurement: "W" } },
      "switch.heater": { state: "unavailable", attributes: {} },
    },
  };
  assert.match(card.shadowRoot.innerHTML, /data-card-action[^>]* disabled/);
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
  assert.match(card.shadowRoot.innerHTML, /<button class="card-action" type="button" data-card-action aria-label="Up Apple TV" title="Up Apple TV">/);
  assert.match(source, /\.body\.icon-only \{[^}]*display:flex;[^}]*align-items:center;[^}]*justify-content:center;[^}]*gap:0;/);
});

test("title cards render as text-only section headings", () => {
  const card = new MaraoCard();
  card.setConfig({
    template: "hc_title_card",
    name: "Living Room",
    tap_action: { action: "none" },
  });
  card.hass = { states: {} };

  assert.match(card.shadowRoot.innerHTML, /<ha-card class="title-surface">/);
  assert.match(card.shadowRoot.innerHTML, /class="body title-card"/);
  assert.match(card.shadowRoot.innerHTML, /class="title">Living Room/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="state"|class="icon"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-card-action/);
  assert.match(source, /\.body\.title-card \{[^}]*padding:0 0 20px;/);
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
  const calls = [];
  const card = new MaraoCard();
  card.setConfig({
    entity: "input_number.wallbox_current",
    template: "hc_wallbox_current_card",
    name: "Charging Current",
    variables: { shortcuts: [6, 12, 16, 20] },
  });
  card.hass = {
    callService: (...args) => calls.push(args),
    states: { "input_number.wallbox_current": { state: "22", attributes: { unit_of_measurement: "A" } } },
  };
  assert.equal((card.shadowRoot.innerHTML.match(/data-current-shortcut=/g) || []).length, 3);
  assert.match(card.shadowRoot.innerHTML, /class="number-stepper wallbox-stepper"/);
  assert.match(card.shadowRoot.innerHTML, />22A<\/output>/);
  assert.match(card.shadowRoot.innerHTML, /data-current-shortcut="12"/);
  assert.deepEqual(stateAppearance("hc_wallbox_current_card", "10", {}, card.hass), {
    background: "var(--color-green, #3F7E4B)",
    text: "var(--active-text-color, #fff)",
    icon: "var(--active-text-color, #fff)",
    accent: "var(--color-green, #3F7E4B)",
    unavailable: false,
  });
  assert.match(source, /\.wallbox-stepper \.number-value \{[^}]*font-size:calc\(2 \* var\(--font-size-primary,1\.125rem\)\)/);
  assert.match(source, /\.number-stepper \{[^}]*min-width:84px;[^}]*width:auto;/);
  assert.doesNotMatch(source, /\.wallbox-stepper \{[^}]*min-width:/);
  assert.doesNotMatch(source, /\.climate-stepper \{[^}]*min-width:/);
  assert.match(source, /\.wallbox-stepper \{[^}]*background:var\(--ha-card-background,var\(--card-background-color,#fff\)\);[^}]*color:var\(--primary-text-color,#141414\);/);
  assert.match(source, /\.wallbox-shortcuts \{[^}]*pointer-events:auto;/);
  assert.match(source, /\.wallbox-shortcuts button \{[^}]*background:var\(--ha-card-background,var\(--card-background-color,#fff\)\);[^}]*color:var\(--primary-text-color,#141414\);/);
  return card._setNumberValue("input_number.wallbox_current", 12).then(() => {
    assert.deepEqual(calls, [["input_number", "set_value", { entity_id: "input_number.wallbox_current", value: 12 }, undefined, false]]);
  });
});

test("climate and Wallbox cards share the same minimum stepper width", () => {
  const climate = new MaraoCard();
  climate.setConfig({ entity: "climate.test", template: "hc_climate_card" });
  climate.hass = {
    callService() {},
    states: {
      "climate.test": {
        state: "heat",
        attributes: { temperature: 22, current_temperature: 20, hvac_modes: ["heat"] },
      },
    },
  };
  assert.match(climate.shadowRoot.innerHTML, /class="number-stepper climate-stepper"/);
  assert.match(climate.shadowRoot.innerHTML, />22<\/output>/);
});

test("scene cards render the actual option count and authoritative selection", () => {
  const card = new MaraoCard();
  card.setConfig({ entity: "input_select.scene", template: "hc_scene_card", name: "Room scene" });
  for (let count = 1; count <= 5; count += 1) {
    const options = ["Relax", "Movie & Night", "Dinner", "Away", "Off"].slice(0, count);
    card.hass = {
      callService() {},
      states: { "input_select.scene": { state: "Relax", attributes: { options } } },
    };
    const markup = card.shadowRoot.innerHTML.split("</style>")[1];
    assert.equal((markup.match(/data-scene-option=/g) || []).length, count);
    assert.match(markup, /data-scene-option="Relax" aria-pressed="true"/);
    assert.doesNotMatch(markup, /data-card-action/);
    if (count > 1) assert.match(markup, /data-scene-option="Movie &amp; Night" aria-pressed="false"/);
  }
  assert.match(source, /\.scene-options button \{[^}]*min-width:48px; min-height:48px;[^}]*overflow-wrap:anywhere/);
  assert.match(source, /\.scene-options button \{[^}]*font-size:var\(--font-size-secondary,1rem\); font-weight:var\(--font-weight-secondary,500\);/);
  assert.match(source, /@container marao-card \(max-width:190px\) \{ \.scene-options \{ grid-template-columns:minmax\(0,1fr\);/);
});

test("scene option activation dispatches once and preserves state until HA responds", async () => {
  const calls = [];
  const card = new MaraoCard();
  const entity = "input_select.scene";
  card.setConfig({ entity, template: "hc_scene_card" });
  card.hass = {
    callService: (...args) => calls.push(args),
    states: { [entity]: { state: "Relax", attributes: { options: ["Relax", "Movie"] } } },
  };
  const button = new EventTarget();
  button.getAttribute = () => "Movie";
  card.shadowRoot.querySelectorAll = (selector) => selector === "[data-scene-option]" ? [button] : [];
  card._render();
  button.dispatchEvent(new Event("click", { bubbles: true }));
  assert.deepEqual(calls, [["input_select", "select_option", { entity_id: entity, option: "Movie" }, undefined, false]]);
  assert.match(card.shadowRoot.innerHTML, /data-scene-option="Relax" aria-pressed="true"/);
  card.shadowRoot.querySelectorAll = () => [];
  card.hass = { ...card.hass, states: { [entity]: { state: "Movie", attributes: { options: ["Relax", "Movie"] } } } };
  assert.match(card.shadowRoot.innerHTML, /data-scene-option="Movie" aria-pressed="true"/);

  await card._selectSceneOption(entity, "Missing option");
  for (const state of ["unknown", "unavailable"]) {
    card.hass = { ...card.hass, states: { [entity]: { state, attributes: { options: ["Relax", "Movie"] } } } };
    assert.match(card.shadowRoot.innerHTML, /data-scene-option="Movie" aria-pressed="false" disabled/);
    await card._selectSceneOption(entity, "Movie");
  }
  card.hass = { ...card.hass, connected: false, states: { [entity]: { state: "Relax", attributes: { options: ["Relax", "Movie"] } } } };
  assert.match(card.shadowRoot.innerHTML, /data-scene-option="Movie" aria-pressed="false" disabled/);
  await card._selectSceneOption(entity, "Movie");
  assert.equal(calls.length, 1);
});

test("native select scene failures use the shared readable error notification", async () => {
  const previousDocument = globalThis.document;
  const target = new EventTarget();
  let message;
  target.addEventListener("hass-notification", (event) => { message = event.detail.message; });
  globalThis.document = { querySelector: () => target };
  try {
    const card = new MaraoCard();
    card.setConfig({ entity: "select.scene", template: "hc_scene_card" });
    card.hass = {
      callService: async (domain, service, data) => {
        assert.equal(domain, "select");
        assert.equal(service, "select_option");
        assert.deepEqual(data, { entity_id: "select.scene", option: "Movie" });
        throw new Error("Selection refused");
      },
      states: { "select.scene": { state: "Relax", attributes: { options: ["Relax", "Movie"] } } },
    };
    await assert.doesNotReject(() => card._selectSceneOption("select.scene", "Movie"));
    assert.match(message, /Selection refused/);
  } finally {
    globalThis.document = previousDocument;
  }
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
    const progressLine = { style: {} };
    card.shadowRoot.querySelector = (selector) => selector === ".hold-progress rect" ? progressLine : null;
    let completions = 0;
    card._bindHoldAction(button, surface, () => { completions += 1; });

    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    assert.equal(delay, ACCESS_HOLD_MS);
    assert.equal(progressLine.style.strokeDashoffset, "100");
    assert.equal(progressLine.style.opacity, "0", "idle hold has no stray stroke");
    card._setHoldProgress(25);
    assert.equal(progressLine.style.strokeDashoffset, "75");
    assert.equal(progressLine.style.opacity, "1", "active progress stays visible");
    const complete = scheduled;
    complete();
    complete();
    assert.equal(completions, 1);
    assert.equal(progressLine.style.strokeDashoffset, "0");
    button.dispatchEvent(pointerEvent("pointerup"));
    assert.equal(progressLine.style.strokeDashoffset, "100");
    assert.equal(progressLine.style.opacity, "0");

    for (const eventName of ["pointerup", "pointerleave", "pointercancel"]) {
      button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
      assert.equal(typeof scheduled, "function");
      card._setHoldProgress(50);
      button.dispatchEvent(pointerEvent(eventName));
      assert.equal(scheduled, null, eventName);
      assert.equal(progressLine.style.strokeDashoffset, "100", eventName);
    }
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    button.dispatchEvent(pointerEvent("pointermove", { clientX: 101, clientY: 50 }));
    assert.equal(scheduled, null);
    assert.equal(completions, 1);
  } finally {
    Object.assign(globalThis, original);
  }
});

test("active holds survive unrelated HA updates but cancel when their target or lifecycle changes", () => {
  const original = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  let scheduled;
  globalThis.setTimeout = (callback) => { scheduled = callback; return 1; };
  globalThis.clearTimeout = () => { scheduled = null; };
  globalThis.requestAnimationFrame = () => 2;
  globalThis.cancelAnimationFrame = () => {};
  try {
    const card = new MaraoCard();
    const entity = "alarm_control_panel.test";
    const state = { state: "disarmed", attributes: {} };
    const config = { entity, template: "hc_access_hold_action_card", variables: { action_service: "alarm_control_panel.alarm_arm_away" } };
    const calls = [];
    const hass = { connected: true, callService: (...args) => { calls.push(args); }, states: { [entity]: state } };
    card.setConfig(config);
    card.hass = hass;
    const button = new EventTarget();
    button.disabled = false;
    card._bindHoldAction(button, null, () => performAction(card.hass, { action: "call-service", service: config.variables.action_service }, entity));
    button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
    const complete = scheduled;
    card.shadowRoot.innerHTML = "pressed control";
    card.hass = { ...hass, states: { ...hass.states, "sensor.other": { state: "42" } } };
    assert.equal(card.shadowRoot.innerHTML, "pressed control");
    assert.equal(scheduled, complete);
    assert.equal(card._holdActive, true);
    complete();
    complete();
    assert.deepEqual(calls, [["alarm_control_panel", "alarm_arm_away", { entity_id: entity }, undefined, false]]);
    button.dispatchEvent(pointerEvent("pointerup"));

    const invalidations = {
      changed: () => { card.hass = { ...hass, states: { [entity]: { ...state, state: "armed_away" } } }; },
      unavailable: () => { card.hass = { ...hass, states: { [entity]: { ...state, state: "unavailable" } } }; },
      unknown: () => { card.hass = { ...hass, states: { [entity]: { ...state, state: "unknown" } } }; },
      missing: () => { card.hass = { ...hass, states: {} }; },
      disconnected: () => { card.hass = { ...hass, connection: { connected: false } }; },
      offline: () => { card.hass = { ...hass, connected: false }; },
      configuration: () => card.setConfig({ ...config, name: "Changed action" }),
      removal: () => card.disconnectedCallback(),
    };
    for (const [reason, invalidate] of Object.entries(invalidations)) {
      card.hass = hass;
      button.dispatchEvent(pointerEvent("pointerdown", { button: 0 }));
      const cancelledCompletion = scheduled;
      invalidate();
      assert.equal(scheduled, null, reason);
      assert.equal(card._holdActive, false, reason);
      cancelledCompletion();
      assert.equal(calls.length, 1, reason);
    }
  } finally {
    Object.assign(globalThis, original);
  }
});

test("popup owns an inert background, trapped focus, and a 48px close button", () => {
  assert.match(source, /for \(const \{ element \} of this\._backgroundState\) element\.inert = true/);
  assert.match(source, /event\.key === "Tab"\) this\._trapFocus\(event\)/);
  assert.match(source, /\.marao-popup-close\{flex:0 0 48px;width:48px;height:48px/);
  assert.match(source, /\.marao-popup-content\{[^}]*isolation:isolate/);
  assert.doesNotMatch(source, /focus-visible/);
});

test("popup headings use the configured name while respecting explicit titles and climate mode sheets", () => {
  const previous = { document: globalThis.document, window: globalThis.window };
  const close = new EventTarget();
  close.focus = () => {};
  const overlay = new EventTarget();
  overlay.querySelector = (selector) => selector === ".marao-popup-close" ? close : null;
  overlay.remove = () => {};
  globalThis.document = { querySelectorAll: () => [], createElement: () => overlay, body: { children: [], append() {} } };
  globalThis.window = { location: { hash: "#lights" } };
  try {
    for (const [config, heading] of [
      [{ name: "Lights" }, "Lights"],
      [{ name: "Lights", title: "Room lights" }, "Room lights"],
      [{ name: "Lights", title: "" }, ""],
      [{ name: "Climate", cards: [{ template: "hc_climate_card", variables: { show_mode_buttons: true } }] }, ""],
    ]) {
      const popup = new MaraoPopupCard();
      popup._config = config;
      popup._openSheet();
      assert.ok(overlay.innerHTML.includes(`<h2>${heading}</h2>`));
      popup._close(false);
    }
  } finally { Object.assign(globalThis, previous); }
});

test("popups inherit native Home Assistant context while blocking and restoring the background", () => {
  const previous = { document: globalThis.document, window: globalThis.window };
  const close = new EventTarget(); close.focus = () => {};
  const overlay = new EventTarget(); overlay.querySelector = (selector) => selector === ".marao-popup-close" ? close : null;
  overlay.remove = () => {};
  const background = { inert: false };
  const external = { inert: true };
  const app = { inert: false };
  const root = { host: app, children: [background], append(element) { this.children.push(element); } };
  app.shadowRoot = root;
  globalThis.document = { querySelector: () => app, querySelectorAll: () => [], createElement: () => overlay, body: { children: [app, external], append() { throw new Error("Popup escaped the native context provider."); } } };
  globalThis.window = { location: { hash: "#lights" } };
  try {
    const popup = new MaraoPopupCard(); popup._config = { name: "Lights" }; popup._openSheet();
    assert.equal(root.children.at(-1), overlay);
    assert.equal(app.inert, false, "the popup's ancestor must remain interactive");
    assert.equal(background.inert, true);
    popup._close(false);
    assert.equal(background.inert, false);
    assert.equal(external.inert, true, "preserve an existing inert state");
  } finally { Object.assign(globalThis, previous); }
});

test("popup URLs open after attachment and reopen after a native remount", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { location: { hash: "#lights" }, addEventListener() {}, removeEventListener() {} };
  try {
    const popup = new MaraoPopupCard();
    let opened = 0;
    popup._openSheet = () => { opened += 1; };
    popup._close = () => {};
    popup.isConnected = false;
    popup.setConfig({ hash: "#lights" });
    assert.equal(opened, 0, "detached helper cards must not open an overlay");
    popup.isConnected = true;
    popup.connectedCallback();
    assert.equal(opened, 1, "the current popup URL opens on attachment");
    popup.isConnected = false;
    popup.disconnectedCallback();
    popup.isConnected = true;
    popup.connectedCallback();
    assert.equal(opened, 2, "a remount restores the matching popup");
  } finally { globalThis.window = previousWindow; }
});

test("closing a directly linked popup clears only its hash and keeps the dashboard page", () => {
  const previousWindow = globalThis.window;
  let destination;
  globalThis.window = {
    location: { hash: "#lights", pathname: "/marao-dashboard/overview", search: "?preview=1" },
    history: { replaceState(_state, _title, url) { destination = url; }, back() { throw new Error("Closing a direct link must not navigate back."); } },
    dispatchEvent() {},
  };
  try {
    const popup = new MaraoPopupCard();
    popup._config = { hash: "#lights" };
    popup._open = true;
    popup._overlay = { remove() {} };
    popup._close(true);
    assert.equal(destination, "/marao-dashboard/overview?preview=1");
    assert.equal(popup._open, false);
  } finally { globalThis.window = previousWindow; }
});

test("glance readings show names, values and units independently of missing entities", () => {
  const card = new MaraoCard();
  card.setConfig({ template: "hc_glance_card", variables: {
    entity1: "sensor.temperature", entity1_name: "Temperature", entity1_icon: "mdi:thermometer",
    entity2: "sensor.missing", entity2_name: "Humidity",
    entity3: "sensor.power", entity3_name: "Power",
  } });
  card.hass = { states: {
    "sensor.temperature": { state: "21", attributes: { unit_of_measurement: "°C" } },
    "sensor.power": { state: "120", attributes: { unit_of_measurement: "W" } },
  } };
  const markup = card.shadowRoot.innerHTML.split("</style>")[1];
  assert.match(markup, /<dt>Temperature<\/dt><dd>21 °C<\/dd>/);
  assert.match(markup, /<dt>Humidity<\/dt><dd>unknown<\/dd>/);
  assert.match(markup, /<dt>Power<\/dt><dd>120 W<\/dd>/);
  assert.doesNotMatch(markup, /hc_glance_card|aria-disabled="true"/);
});

test("state labels use native domain translations and preserve unitless climate values", () => {
  const formatted = [];
  const hass = { states: {}, formatEntityState: (state) => { formatted.push(state.entity_id); return state.entity_id.startsWith("weather.") ? "Ensolarado" : "21 °C"; } };
  const card = new MaraoCard();
  card.setConfig({ entity: "sensor.weather", template: "hc_weather_card" });
  card.hass = { ...hass, states: { "sensor.weather": { state: "sunny", attributes: {} } } };
  assert.match(card.shadowRoot.innerHTML, /<div class="state">Ensolarado<\/div>/);
  assert.deepEqual(formatted, ["weather.weather"]);
  card.setConfig({ entity: "climate.room", template: "hc_climate_card" });
  card.hass = { ...hass, states: { "climate.room": { state: "heat", attributes: { temperature: 22, current_temperature: 21, unit_of_measurement: "°C" } } } };
  assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /°C/);
});

test("configured weather, header, dishwasher and camera details reach the visible card", () => {
  const states = {
    "sensor.weather": { state: "sunny", attributes: { temperature: 21, temperature_unit: "°C", forecast: [{ datetime: "2026-10-10T12:00:00Z", condition: "cloudy", temperature: 22, templow: 14 }] } },
    "sensor.person": { state: "home", attributes: { friendly_name: "Person" } },
    "sensor.progress": { state: "40", attributes: { unit_of_measurement: "%" } },
    "sensor.dishwasher": { state: "run", attributes: {} },
    "camera.front": { state: "idle", attributes: { entity_picture: "/synthetic-camera.svg" } },
  };
  const card = new MaraoCard();
  card.hass = { states, language: "en" };
  card.setConfig({ entity: "sensor.weather", template: "hc_weather_card" });
  assert.match(card.shadowRoot.innerHTML, /14 °C–22 °C/);
  card.setConfig({ entity: "sensor.weather", template: "hc_weather_card", variables: { show_forecast: false } });
  assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /14 °C–22 °C/);
  card.setConfig({ entity: "sensor.weather", template: "hc_header_card", variables: { person_entity: "sensor.person" } });
  assert.match(card.shadowRoot.innerHTML, /<dt>Person<\/dt><dd>home<\/dd>/);
  assert.match(card.shadowRoot.innerHTML, new RegExp(new Date().getFullYear()));
  card.setConfig({ entity: "sensor.dishwasher", template: "hc_dishwasher_card", variables: { progress_entity: "sensor.progress" } });
  assert.match(card.shadowRoot.innerHTML, /40 %/);
  card.setConfig({ entity: "camera.front", template: "hc_camera_card" });
  assert.match(card.shadowRoot.innerHTML, /<img class="camera" src="\/synthetic-camera.svg"/);
  for (const state of ["unknown", "unavailable"]) {
    card.hass = { states: { ...states, "camera.front": { state, attributes: states["camera.front"].attributes } } };
    assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /<img /);
  }
  card.hass = { states, connected: false };
  assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /<img /);
  card.hass = { states, connection: { connected: false } };
  assert.doesNotMatch(card.shadowRoot.innerHTML.split("</style>")[1], /<img /);
});

test("media artwork and summary respect the configured opt-out and neutral states", () => {
  const attributes = { entity_picture: "/synthetic-art.svg", media_title: "Test programme", media_artist: "Test artist" };
  const card = new MaraoCard();
  card.setConfig({ entity: "media_player.audio", template: "hc_media_card" });
  card.hass = { states: { "media_player.audio": { state: "playing", attributes } } };
  const markup = () => card.shadowRoot.innerHTML.split("</style>")[1];
  assert.match(markup(), /class="media-artwork"/);
  assert.match(markup(), /Test programme · Test artist/);
  card.setConfig({ entity: "media_player.audio", template: "hc_media_card", variables: { hc_show_background_art: false, hc_background_color: "var(--color-blue)" } });
  assert.doesNotMatch(markup(), /class="media-artwork"/);
  assert.match(markup(), /Test programme · Test artist/);
  assert.equal(stateAppearance("hc_media_card", "playing", card._config).background, "var(--color-blue)");
  card.setConfig({ entity: "media_player.audio", template: "hc_media_card" });
  for (const state of ["off", "unknown", "unavailable"]) {
    card.hass = { states: { "media_player.audio": { state, attributes } } };
    assert.doesNotMatch(markup(), /class="media-artwork"|Test programme/);
    assert.equal(stateAppearance("hc_media_card", state, card._config).background, undefined);
  }
  for (const connection of [{ connected: false }, { connection: { connected: false } }]) {
    card.hass = { states: { "media_player.audio": { state: "playing", attributes } }, ...connection };
    assert.doesNotMatch(markup(), /class="media-artwork"|Test programme/);
  }
});

test("navigation without a primary entity remains available when entity services disconnect", () => {
  const card = new MaraoCard();
  card.setConfig({ template: "hc_navigation_card", name: "Rooms", tap_action: { action: "navigate", navigation_path: "/marao-dashboard/rooms" } });
  card.hass = { states: {}, connected: false };
  const markup = card.shadowRoot.innerHTML.split("</style>")[1];
  assert.match(markup, /data-card-action/);
  assert.doesNotMatch(markup, / disabled|class="state"/);
});

test("popup restores its original control or the live replacement after HA rerenders", () => {
  const previous = { document: globalThis.document, window: globalThis.window };
  try {
    for (const replaced of [false, true]) for (const attributes of [
      { "data-card-action": "", "aria-label": "Open climate" },
      { "aria-label": "Energy history" },
    ]) {
      const root = { activeElement: null, querySelectorAll: () => controls };
      const host = { shadowRoot: root };
      const control = (attrs) => ({
        localName: "button", isConnected: true,
        getRootNode: () => root,
        getAttributeNames: () => Object.keys(attrs),
        getAttribute: (name) => attrs[name] ?? null,
        focus() { root.activeElement = this; document.activeElement = host; },
      });
      const original = control(attributes);
      const replacement = control(attributes);
      let controls = [replacement, original];
      const close = new EventTarget();
      close.focus = () => { root.activeElement = null; document.activeElement = close; };
      const overlay = new EventTarget();
      overlay.querySelector = (selector) => selector === ".marao-popup-close" ? close : null;
      overlay.remove = () => {};
      globalThis.document = {
        activeElement: host, querySelectorAll: () => [],
        createElement: () => overlay,
        body: { children: [], append() {} },
      };
      globalThis.window = { location: { hash: "#climate" } };
      original.focus();
      const popup = new MaraoPopupCard();
      popup._openSheet();
      assert.equal(document.activeElement, close, "focus enters the popup");
      if (replaced) {
        original.isConnected = false;
        controls = [control({ "aria-label": "Unrelated action" }), replacement];
      }
      popup._close(false);
      assert.equal(root.activeElement, replaced ? replacement : original);
    }
  } finally {
    Object.assign(globalThis, previous);
  }
});

test("popup preserves child cards while forwarding Home Assistant state updates", () => {
  assert.match(source, /set hass\(value\) \{ this\._hass = value; this\._updateChildrenHass\(\); \}/);
  assert.match(source, /for \(const card of host\?\.children \|\| \[\]\) card\.hass = this\._hass/);
  assert.doesNotMatch(source, /set hass\(value\) \{ this\._hass = value; this\._renderChildren\(\); \}/);
});

test("focus waits for Home Assistant's native slot render and skips a detached control", async () => {
  for (const detached of [false, true]) {
    let completeRender;
    let rendered = false;
    let focused = false;
    const nativeCard = { updateComplete: new Promise((resolve) => { completeRender = () => { rendered = true; resolve(true); }; }) };
    const button = {
      isConnected: true,
      closest: (selector) => selector === "ha-card" ? nativeCard : null,
      focus() { assert.equal(rendered, true, "unslotted controls cannot receive native focus"); focused = true; },
    };
    const restoration = focusRestorer(button)();
    assert.equal(focused, false);
    if (detached) button.isConnected = false;
    completeRender();
    await restoration;
    assert.equal(focused, !detached);
  }
});

test("focus follows the live replacement when HA rerenders during native slot rendering", async () => {
  let completeRender;
  let focused;
  const nativeCard = { updateComplete: new Promise((resolve) => { completeRender = resolve; }) };
  let controls;
  const root = { querySelectorAll: () => controls };
  const control = (card) => ({
    localName: "button", isConnected: true,
    getRootNode: () => root, getAttributeNames: () => ["data-card-action"],
    getAttribute: () => "", closest: () => card,
    focus() { focused = this; },
  });
  const original = control(nativeCard);
  const replacement = control({ updateComplete: Promise.resolve() });
  controls = [original];
  const restoration = focusRestorer(original)();
  original.isConnected = false;
  controls = [replacement];
  completeRender();
  await restoration;
  assert.equal(focused, replacement);
});

test("touch actions establish their live invoking control before opening a popup", () => {
  const button = new EventTarget();
  let focused = false;
  button.focus = () => { focused = true; };
  new MaraoCard()._bindTapAction(button, null, () => assert.equal(focused, true));
  button.dispatchEvent(new Event("click"));
});

test("HA updates retain focus on the corresponding live card action", () => {
  const previousDocument = globalThis.document;
  try {
    globalThis.document = { activeElement: null };
    const card = new MaraoCard();
    card.setConfig({ entity: "light.test", template: "hc_light_card", variables: { enable_slider: false } });
    let button;
    const root = {
      activeElement: null,
      querySelector: (selector) => selector === "[data-card-action]" ? button : null,
      querySelectorAll: (selector) => selector === "button" ? [button] : [],
      set innerHTML(_value) {
        if (button) button.isConnected = false;
        this.activeElement = null;
        button = Object.assign(new EventTarget(), {
          localName: "button", isConnected: true,
          getRootNode: () => root,
          getAttributeNames: () => ["data-card-action", "aria-label"],
          getAttribute: (name) => name === "data-card-action" ? "" : "Light",
          focus() { root.activeElement = this; document.activeElement = card; },
        });
      },
    };
    card.shadowRoot = root;
    card.hass = { callService() {}, states: { "light.test": { state: "on", attributes: {} } } };
    button.focus();
    const original = button;
    card.hass = { ...card.hass, states: { "light.test": { state: "off", attributes: {} } } };
    assert.equal(original.isConnected, false);
    assert.notEqual(button, original);
    assert.equal(root.activeElement, button);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("light and fan can omit their sliders while cover positions use the native service", async () => {
  const card = new MaraoCard();
  const calls = [];
  card.setConfig({ template: "hc_light_card", variables: { enable_slider: false } });
  card.hass = { callService: (...args) => { calls.push(args); return Promise.resolve(); }, states: { "cover.test": { state: "open", attributes: { current_position: 50 } } } };
  const state = { state: "on", attributes: { brightness: 128, percentage: 50 } };
  assert.equal(card._range("light.test", state, "hc_light_card"), "");
  assert.equal(card._range("fan.test", state, "hc_fan_card"), "");
  card.setConfig({ template: "hc_light_card" });
  assert.match(card._range("light.test", state, "hc_light_card"), /type="range"/);
  await card._setRange("cover.test", "hc_cover_card", 60);
  assert.deepEqual(calls, [["cover", "set_cover_position", { entity_id: "cover.test", position: 60 }, undefined, false]]);
});

test("value slider drags retain their native input across unrelated and confirmed-state updates", () => {
  const card = new MaraoCard();
  const entity = "cover.test";
  card.setConfig({ entity, template: "hc_cover_card" });
  card.hass = { callService() {}, states: { [entity]: { state: "open", attributes: { current_position: 50 } } } };
  const markup = card.shadowRoot.innerHTML;
  const refreshed = [];
  const gesture = { input: { isConnected: true }, key: `hc_cover_card:${entity}`, refresh: (state) => refreshed.push(state) };
  card._sliderGesture = gesture;
  card.hass = { ...card.hass, states: { ...card.hass.states } };
  const confirmed = { state: "open", attributes: { current_position: 40 } };
  card.hass = { ...card.hass, states: { [entity]: confirmed } };
  card._render();
  assert.equal(card._sliderGesture, gesture);
  assert.equal(card.shadowRoot.innerHTML, markup);
  assert.equal(refreshed.length, 3);
  assert.equal(refreshed.at(-1), confirmed);
});

test("idle value sliders skip unrelated updates but refresh their state, graph, metadata and connection", () => {
  for (const change of ["unrelated", "own", "graph", "themes", "locale", "language", "localize", "entities", "connection"]) {
    const entity = "light.test", graph = "sensor.power";
    const card = new MaraoCard();
    card.setConfig({ entity, template: "hc_light_card", variables: { graph_entity: graph, show_graph: true } });
    card.hass = { callService() {}, states: { [entity]: { state: "on", attributes: { brightness: 128 } }, [graph]: { state: "20" } } };
    card.shadowRoot.querySelector = (selector) => selector === 'input[data-slider-key]' ? {} : null;
    let renders = 0;
    card._render = () => { renders += 1; };
    const next = { ...card.hass, states: { ...card.hass.states } };
    if (change === "own") next.states[entity] = { state: "on", attributes: { brightness: 100 } };
    else if (change === "graph") next.states[graph] = { state: "40" };
    else if (change === "connection") next.connected = false;
    else if (change !== "unrelated") next[change] = {};
    card.hass = next;
    assert.equal(renders, change === "unrelated" ? 0 : 1, change);
    assert.equal(card.hass, next, "native service context stays current without rebuilding");
  }
});

test("invalid targets, disconnects and lifecycle changes cancel value slider targets", () => {
  for (const reason of ["unknown", "unavailable", "disconnect", "config", "detach"]) {
    const card = new MaraoCard();
    const entity = "fan.test", config = { entity, template: "hc_fan_card" };
    card.setConfig(config);
    card.hass = { callService() {}, states: { [entity]: { state: "on", attributes: { percentage: 50 } } } };
    const gesture = { input: { isConnected: true }, key: `hc_fan_card:${entity}`, refresh() {} };
    card._sliderGesture = gesture;
    card._sliderTargets.set(gesture.key, 60);
    if (reason === "config") card.setConfig({ ...config, variables: { enable_slider: false } });
    else if (reason === "detach") card.disconnectedCallback();
    else if (reason === "disconnect") card.hass = { ...card.hass, connected: false };
    else card.hass = { ...card.hass, states: { [entity]: { state: reason, attributes: {} } } };
    assert.equal(gesture.cancelled, true, reason);
    assert.equal(card._sliderGesture, null, reason);
    assert.equal(card._sliderTargets.has(gesture.key), false, reason);
  }
});

test("legacy access opening actions always render the strict slider without a tap overlay", () => {
  for (const [entity, service, state] of [["lock.test", "lock.unlock", "locked"], ["cover.test", "cover.open_cover", "closed"]]) {
    for (const template of ["hc_access_action_card", "hc_access_hold_action_card", "hc_access_slide_action_card"]) {
      const card = new MaraoCard();
      card.setConfig({ entity, template, variables: { action_service: service }, tap_action: { action: "call-service", service } });
      card.hass = { callService() {}, states: { [entity]: { state, attributes: {} } } };
      const markup = card.shadowRoot.innerHTML.split("</style>")[1];
      assert.match(markup, /<marao-slide-to-open/);
      assert.doesNotMatch(markup, /data-card-action|data-hold-action/);
    }
  }
});
