import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

globalThis.HTMLElement = class {
  attachShadow() { this.shadowRoot = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] }; }
};

const source = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8");
const dashboardSource = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoDashboard.js", import.meta.url), "utf8");
const { ACCESS_HOLD_MS, MaraoCard, callServiceWithNotification, climateDefaultAction, climateModeIcon, climateModeLabel, climateTemperatureChange, haptic, numberStepValue, performAction, serviceConnectionReady, stateAppearance } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const climateEntity = "climate.test";
function reportedClimate(mode = "heat", attributes = {}) {
  return { state: mode, attributes: { temperature: 21, current_temperature: 20, hvac_action: "idle", hvac_modes: ["off", "heat", "cool", "heat_cool"], target_temp_step: .5, min_temp: 10, max_temp: 30, ...attributes } };
}
function climateCard(t, hass, variables = {}) {
  const card = new MaraoCard();
  card.setConfig({ template: "hc_climate_card", entity: climateEntity, variables });
  card.hass = hass;
  card.connectedCallback();
  t.after(() => card.disconnectedCallback());
  return card;
}
function displayedTarget(card) {
  return card.shadowRoot.innerHTML.match(/class="number-value"[^>]*>([^<]*)</)?.[1];
}

test("mode feedback is immediate across cards, without changing measurements or confirming on acknowledgement", async t => {
  let acknowledge;
  const state = reportedClimate("off");
  const hass = { states: { [climateEntity]: state }, callService: () => new Promise(resolve => { acknowledge = resolve; }) };
  const main = climateCard(t, hass);
  const pending = main._setClimateMode(climateEntity, "cool");
  assert.match(main.shadowRoot.innerHTML, /class="state">Cool</);
  assert.match(main.shadowRoot.innerHTML, /role="status"[^>]*>Updating/);
  const sheet = climateCard(t, hass, { show_mode_buttons: true });
  assert.match(sheet.shadowRoot.innerHTML, /climate-mode active[^>]*data-climate-mode="cool"/);
  assert.match(sheet.shadowRoot.innerHTML, /class="climate current-temperature"[^>]*>20</);
  assert.deepEqual(state, reportedClimate("off"));
  acknowledge(); await pending;
  assert.match(main.shadowRoot.innerHTML, /Updating/);
  sheet.disconnectedCallback();
  assert.match(main.shadowRoot.innerHTML, /Updating/);
  main.hass = { ...hass, states: { [climateEntity]: reportedClimate("cool") } };
  assert.doesNotMatch(main.shadowRoot.innerHTML, /Updating/);
});

test("rapid target steps accumulate absolute native requests, including reversals and duplicates", async t => {
  const calls = [];
  const hass = { states: { [climateEntity]: reportedClimate() }, callService: async (_domain, _service, data) => { calls.push(data); } };
  const card = climateCard(t, hass);
  const duplicate = climateCard(t, hass);
  for (const direction of [1, 1, 1, -1]) await card._adjustNumber(climateEntity, "hc_climate_card", direction);
  assert.deepEqual(calls.map(data => data.temperature), [21.5, 22, 22.5, 22]);
  assert.equal(displayedTarget(card), "22");
  assert.equal(displayedTarget(duplicate), "22");
  assert.equal(hass.states[climateEntity].attributes.temperature, 21);
});

test("null, missing and incomplete range targets never become zero or generate a request", async t => {
  for (const attributes of [{ temperature: null }, { target_temperature: null }, { target_temp_low: 18 }, { target_temp_high: 24 }]) {
    assert.equal(climateTemperatureChange(attributes, "heat_cool", 1), null);
  }
  assert.equal(climateTemperatureChange({ temperature: null }, "heat", 1), null);
  let calls = 0;
  const hass = { states: { [climateEntity]: reportedClimate("heat_cool", { temperature: null, target_temp_low: 18, target_temp_high: null }) }, callService: async () => { calls += 1; } };
  const card = climateCard(t, hass);
  await card._adjustNumber(climateEntity, "hc_climate_card", 1);
  await card._setClimateMode(climateEntity, "unsupported");
  assert.equal(calls, 0);
  assert.equal(displayedTarget(card), undefined);
});


test("fractional climate ranges can reflow while scalar targets keep their numeric layout", t => {
  const ranged = climateCard(t, { states: { [climateEntity]: reportedClimate("heat_cool", { target_temp_low: 18.5, target_temp_high: 24.5 }) } });
  assert.match(ranged.shadowRoot.innerHTML, /<output class="number-value" data-number-range[^>]*>18\.5–24\.5<\/output>/);
  const single = climateCard(t, { states: { [climateEntity]: reportedClimate("heat", { temperature: 21.5 }) } });
  assert.match(single.shadowRoot.innerHTML, /<output class="number-value" aria-live="polite">21\.5<\/output>/);
  assert.match(source, /\.number-value\[data-number-range\] \{ min-width:0; white-space:normal; overflow-wrap:normal; \}/);
});

test("requested range targets preserve their gap and bounds, and mode changes use the new reported shape", async t => {
  const calls = [];
  const hass = { states: { [climateEntity]: reportedClimate("heat_cool", { temperature: 21, target_temp_low: 18, target_temp_high: 24 }) }, callService: async (_domain, _service, data) => { calls.push(data); } };
  const card = climateCard(t, hass);
  for (const direction of [1, 1, -1]) await card._adjustNumber(climateEntity, "hc_climate_card", direction);
  assert.deepEqual(calls.map(({ target_temp_low, target_temp_high }) => [target_temp_low, target_temp_high]), [[18.5, 24.5], [19, 25], [18.5, 24.5]]);
  await card._setClimateMode(climateEntity, "heat");
  assert.equal(displayedTarget(card), "21");
  await card._adjustNumber(climateEntity, "hc_climate_card", 1);
  assert.equal(calls.at(-1).temperature, 21.5);
  assert.deepEqual(climateTemperatureChange({ target_temperature: "21.1", target_temperature_step: .1 }, "heat", 1), { temperature: 21.2 });
  assert.deepEqual(climateTemperatureChange({ target_temp_low: 10, target_temp_high: 16, target_temp_step: .5, min_temp: 10, max_temp: 30 }, "heat_cool", -1), { target_temp_low: 10, target_temp_high: 16 });
});

test("mode and target confirm independently, while old rejections cannot erase a newer intent", async t => {
  const requests = [];
  const hass = { states: { [climateEntity]: reportedClimate("off") }, callService: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) };
  const card = climateCard(t, hass);
  const first = card._setClimateMode(climateEntity, "heat");
  const second = card._setClimateMode(climateEntity, "cool");
  const third = card._adjustNumber(climateEntity, "hc_climate_card", 1);
  requests[0].reject(new Error("Old request rejected")); await first;
  assert.match(card.shadowRoot.innerHTML, /class="state">Cool</);
  card.hass = { ...hass, states: { [climateEntity]: reportedClimate("cool") } };
  assert.equal(displayedTarget(card), "21.5");
  assert.match(card.shadowRoot.innerHTML, /Updating/);
  requests[1].resolve(); requests[2].resolve(); await Promise.all([second, third]);
  card.hass = { ...hass, states: { [climateEntity]: reportedClimate("cool", { temperature: 21.5 }) } };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /Updating/);
});

test("expiry uses each setting's latest deadline and unrelated updates do not extend it", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000 });
  const hass = { states: { [climateEntity]: reportedClimate("off") }, callService: async () => {} };
  const card = climateCard(t, hass);
  await card._setClimateMode(climateEntity, "heat");
  t.mock.timers.tick(10000);
  await card._adjustNumber(climateEntity, "hc_climate_card", 1);
  t.mock.timers.tick(10000);
  await card._setClimateMode(climateEntity, "cool");
  card.hass = { ...hass };
  t.mock.timers.tick(10000);
  assert.match(card.shadowRoot.innerHTML, /class="state">Cool</);
  assert.equal(displayedTarget(card), "21.5");
  t.mock.timers.tick(10000);
  assert.equal(displayedTarget(card), "21");
  assert.match(card.shadowRoot.innerHTML, /Updating/);
  t.mock.timers.tick(10000);
  assert.match(card.shadowRoot.innerHTML, /class="state">Off</);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /Updating/);
});

test("disconnect, target loss, configuration changes and the final subscriber clear pending state", async t => {
  const hass = { states: { [climateEntity]: reportedClimate() }, callService: async () => {} };
  const card = climateCard(t, hass);
  for (const updated of [ { ...hass, connected: false }, { ...hass, states: {} }, { ...hass, states: { [climateEntity]: reportedClimate("unknown") } }, { ...hass, states: { [climateEntity]: reportedClimate("unavailable") } } ]) {
    card.hass = hass; await card._adjustNumber(climateEntity, "hc_climate_card", 1);
    card.hass = updated;
    card.hass = hass;
    assert.equal(displayedTarget(card), "21");
  }
  await card._adjustNumber(climateEntity, "hc_climate_card", 1);
  card.setConfig({ template: "hc_number_card", entity: "number.test" });
  const replacement = climateCard(t, hass);
  assert.equal(displayedTarget(replacement), "21");
  await replacement._adjustNumber(climateEntity, "hc_climate_card", 1);
  replacement.disconnectedCallback(); replacement.connectedCallback();
  assert.equal(displayedTarget(replacement), "21");
});

test("explicit native climate actions preview but arbitrary scripts do not infer settings", async t => {
  const calls = [];
  const hass = { states: { [climateEntity]: reportedClimate("off"), "script.test": { state: "off" } }, callService: async (...args) => { calls.push(args); } };
  const card = climateCard(t, hass);
  await performAction(hass, climateDefaultAction(["heat"]), climateEntity);
  assert.match(card.shadowRoot.innerHTML, /class="state">Heat</);
  await performAction(hass, { action: "perform-action", perform_action: "climate.set_hvac_mode", target: { entity_id: climateEntity }, data: { hvac_mode: "cool" } }, climateEntity);
  assert.match(card.shadowRoot.innerHTML, /class="state">Cool</);
  await performAction(hass, { action: "call-service", service: "script.turn_on", data: { entity_id: "script.test", hvac_mode: "heat" } }, climateEntity);
  assert.match(card.shadowRoot.innerHTML, /class="state">Cool</);
  assert.equal(calls.length, 3);
});

test("opt-in outcomes distinguish skipped, sent, successful and rejected calls without changing returns", async () => {
  const outcomes = [];
  const report = status => outcomes.push(status);
  assert.equal(await callServiceWithNotification({ connected: false, callService() {} }, "light", "toggle", {}, report), undefined);
  assert.equal(await callServiceWithNotification({ callService: async () => 42 }, "light", "toggle", {}, report), 42);
  await callServiceWithNotification({ callService: async () => { throw new Error("Rejected"); } }, "light", "toggle", {}, report);
  assert.deepEqual(outcomes, ["skipped", "sent", "success", "sent", "error"]);
});

test("a rapid reversal stays pending on unrelated updates and when another sheet subscribes", async t => {
  const hass = { states: { [climateEntity]: reportedClimate() }, callService: async () => {} };
  const card = climateCard(t, hass);
  await card._adjustNumber(climateEntity, "hc_climate_card", 1);
  await card._adjustNumber(climateEntity, "hc_climate_card", -1);
  card.hass = { ...hass };
  assert.equal(displayedTarget(card), "21");
  assert.match(card.shadowRoot.innerHTML, /Updating/);
  const sheet = climateCard(t, hass);
  assert.match(sheet.shadowRoot.innerHTML, /Updating/);
  card.hass = { ...hass, states: { [climateEntity]: reportedClimate() } };
  assert.doesNotMatch(card.shadowRoot.innerHTML, /Updating/);
  assert.doesNotMatch(sheet.shadowRoot.innerHTML, /Updating/);
});

test("current rejection restores the latest differing report and notifies once; expiry and cleanup are bounded", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000 });
  const previous = globalThis.document;
  const target = new EventTarget(), notifications = [];
  target.addEventListener("hass-notification", event => notifications.push(event.detail.message));
  globalThis.document = { querySelector: () => target };
  t.after(() => { globalThis.document = previous; });
  let reject;
  const hass = { states: { [climateEntity]: reportedClimate() }, callService: () => new Promise((_resolve, fail) => { reject = fail; }) };
  const card = climateCard(t, hass);
  const request = card._adjustNumber(climateEntity, "hc_climate_card", 1);
  card.hass = { ...hass, states: { [climateEntity]: reportedClimate("heat", { temperature: 24 }) } };
  assert.equal(displayedTarget(card), "21.5");
  reject(new Error("Fixture rejected")); await request;
  assert.equal(displayedTarget(card), "24");
  assert.deepEqual(notifications, ["Action failed: Fixture rejected"]);
  t.mock.timers.tick(30000);
  assert.equal(notifications.length, 1);
  card.hass = { ...hass, callService: async () => {} };
  await card._adjustNumber(climateEntity, "hc_climate_card", 1);
  t.mock.timers.tick(30000);
  assert.equal(displayedTarget(card), "21");
  assert.deepEqual(notifications, ["Action failed: Fixture rejected", "Change not confirmed: climate.test"]);
  await card._adjustNumber(climateEntity, "hc_climate_card", 1);
  card.disconnectedCallback();
  t.mock.timers.tick(30000);
  assert.equal(notifications.length, 2);
});

test("area and device targets dispatch native targeting without inferring a card's requested mode", async t => {
  const calls = [];
  const hass = { states: { [climateEntity]: reportedClimate("off") }, callService: async (...args) => { calls.push(args); } };
  const card = climateCard(t, hass);
  for (const target of [{ area_id: "test-room" }, { device_id: "test-device" }]) {
    await performAction(hass, { action: "call-service", service: "climate.set_hvac_mode", data: { hvac_mode: "cool" }, target }, climateEntity);
    assert.deepEqual(calls.at(-1), ["climate", "set_hvac_mode", { hvac_mode: "cool" }, target, false]);
    assert.match(card.shadowRoot.innerHTML, /class="state">Off</);
    assert.doesNotMatch(card.shadowRoot.innerHTML, /Updating/);
  }
});

test("native range payloads retain their capability contract outside the heat-cool display shape", async t => {
  const calls = [];
  const hass = { states: { [climateEntity]: reportedClimate('auto', { supported_features: 2, temperature: null, target_temp_low: 18, target_temp_high: 24, hvac_modes: ['auto', 'heat_cool'] }) }, callService: async (...args) => { calls.push(args); } };
  const card = climateCard(t, hass);
  const data = { entity_id: climateEntity, target_temp_low: 19, target_temp_high: 25 };
  await callServiceWithNotification(hass, 'climate', 'set_temperature', data);
  assert.deepEqual(calls, [['climate', 'set_temperature', data, undefined, false]]);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /Updating/);
  await card._adjustNumber(climateEntity, 'hc_climate_card', 1);
  assert.equal(calls.length, 1, 'a range-only entity must not receive a fabricated single target');
});

test("strong haptics use Home Assistant's haptic event", () => {
  const previousWindow = globalThis.window;
  let detail;
  globalThis.window = new EventTarget();
  globalThis.window.addEventListener("haptic", (event) => { detail = event.detail; });
  haptic("heavy");
  globalThis.window = previousWindow;
  assert.equal(detail, "heavy");
});

test("success haptics retain the HA event and use a distinct strong vibration", () => {
  const previousWindow = globalThis.window;
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let detail;
  let vibration;
  globalThis.window = new EventTarget();
  globalThis.window.addEventListener("haptic", (event) => { detail = event.detail; });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { vibrate: (value) => { vibration = value; } } });
  try {
    haptic("success");
  } finally {
    globalThis.window = previousWindow;
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else delete globalThis.navigator;
  }
  assert.equal(detail, "success");
  assert.deepEqual(vibration, [50, 35, 75]);
});

test("service actions stop while Home Assistant is disconnected", async () => {
  let calls = 0;
  const disconnected = { connected: false, callService: () => { calls += 1; } };
  assert.equal(serviceConnectionReady(disconnected), false);
  assert.equal(serviceConnectionReady({ connection: { connected: false }, callService() {} }), false);
  assert.equal(serviceConnectionReady({ connected: true, callService() {} }), true);
  await performAction(disconnected, { action: "toggle" }, "light.test");
  assert.equal(calls, 0);
});

test("service rejections produce one localized notification without HA's duplicate", async () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const homeAssistant = new EventTarget();
  const notifications = [];
  homeAssistant.addEventListener("hass-notification", (event) => { notifications.push(event.detail); });
  globalThis.document = { querySelector: () => homeAssistant };
  globalThis.window = {
    dispatchEvent() {},
    MaraoDashboard: {
      localize: (key, _hass, placeholders) => key === "actions.failed"
        ? `A ação falhou: ${placeholders.error}`
        : key,
    },
  };
  try {
    await assert.doesNotReject(() => performAction(
      {
        language: "pt",
        callService: async (domain, service, data, target, notifyOnError = true) => {
          assert.deepEqual([domain, service, data, target], ["light", "toggle", { entity_id: "light.test" }, undefined]);
          if (notifyOnError) homeAssistant.dispatchEvent(new CustomEvent("hass-notification", { detail: { message: "Native error" } }));
          throw new Error("Sem permissão");
        },
      },
      { action: "toggle" },
      "light.test",
    ));
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
  assert.deepEqual(notifications, [{ message: "A ação falhou: Sem permissão" }]);
});

test("every card service path uses the shared rejection boundary", () => {
  assert.equal(source.match(/\.callService\(/g)?.length, 1);
  assert.equal(dashboardSource.match(/\.callService\(/g)?.length || 0, 0);
  assert.match(dashboardSource, /callServiceWithNotification\(hass, domain, service/);
});

test("climate modes have readable labels", () => {
  assert.equal(climateModeLabel("heat"), "Heat");
  assert.equal(climateModeLabel("heat_cool"), "Heat cool");
  assert.equal(climateModeLabel("fan_only"), "Fan only");
});

test("climate modes expose a representative icon", () => {
  const expected = {
    heat: "mdi:fire",
    cool: "mdi:snowflake",
    heat_cool: "mdi:sun-snowflake-variant",
    auto: "mdi:autorenew",
    dry: "mdi:water-percent",
    fan_only: "mdi:fan",
    off: "mdi:power",
  };
  for (const [mode, icon] of Object.entries(expected)) assert.equal(climateModeIcon(mode), icon);
  assert.equal(climateModeIcon("custom_mode"), "mdi:thermostat");
  assert.match(source, /<ha-icon icon="\$\{esc\(climateModeIcon\(mode\)\)\}" aria-hidden="true"><\/ha-icon>/);
});

test("climate tap behavior distinguishes zero, single, and multiple modes", () => {
  assert.equal(climateDefaultAction([], { mode_selector_hash: "#modes" }), null);
  assert.deepEqual(climateDefaultAction(["heat"], { mode_selector_hash: "#modes" }), {
    action: "call-service",
    service: "climate.set_hvac_mode",
    data: { hvac_mode: "heat" },
    haptic: "heavy",
  });
  assert.deepEqual(climateDefaultAction(["heat", "cool"], { mode_selector_hash: "#modes" }), {
    action: "navigate",
    navigation_path: "#modes",
    haptic: "heavy",
  });
  assert.equal(climateDefaultAction(["heat", "cool"], {}), null);
});

test("climate modes use the theme state palette", () => {
  const expected = {
    heat: "var(--color-red)",
    heating: "var(--color-red)",
    cool: "var(--color-blue)",
    cooling: "var(--color-blue)",
    heat_cool: "var(--color-purple)",
    auto: "var(--color-gold)",
    dry: "var(--color-yellow)",
    fan_only: "var(--color-green)",
  };
  for (const [state, background] of Object.entries(expected)) {
    assert.equal(stateAppearance("hc_climate_card", state, {}, {}).background, background);
  }
  assert.equal(stateAppearance("hc_climate_card", "off", {}, {}).background, undefined);
  assert.equal(stateAppearance("hc_climate_card", "auto", {}, {}).text, "var(--color-black)");
});

test("selected climate mode keeps the same readable control surface", () => {
  assert.match(
    source,
    /\.climate-mode\.active \{ background:var\(--ha-card-background,var\(--card-background-color\)\); color:var\(--primary-text-color\); box-shadow:inset 0 0 0 3px var\(--marao-accent-color,var\(--primary-color\)\); \}/,
  );
  assert.match(source, /\.climate-card \.current-temperature \{[^}]*font-size:calc\(var\(--font-size-primary,1\.125rem\) \* 1\.78\)/);
  assert.match(source, /class="climate current-temperature" aria-label="\$\{esc\(climateReadingLabel\)\}">\$\{esc\(currentTemperature\)\}/);
  assert.match(source, /\.climate-mode \{[^}]*display:flex;[^}]*flex-direction:column;[^}]*align-items:center;[^}]*justify-content:center;[^}]*min-height:72px/);
});

test("light state palette colors share a dark foreground across card families", () => {
  for (const [kind, state, color] of [
    ["hc_cover_card", "open", "blue"],
    ["hc_light_card", "on", "blue"],
    ["hc_fan_card", "on", "blue"],
    ["hc_climate_card", "cool", "blue"],
    ["hc_battery_card", "50", "yellow"],
    ["hc_access_card", "opening", "orange"],
    ["hc_climate_card", "auto", "gold"],
  ]) {
    const appearance = stateAppearance(kind, state, {}, {});
    assert.equal(appearance.background, `var(--color-${color})`, `${kind}: preserve palette hue`);
    assert.equal(appearance.text, "var(--color-black)", kind);
    assert.equal(appearance.icon, appearance.text, kind);
    assert.equal(appearance.iconBackground, "var(--active-overlay-color)", kind);
  }
  for (const color of ["blue", "yellow", "orange", "gold", "peach"]) {
    const active_color = `var(--color-${color}, #abcdef)`;
    const appearance = stateAppearance("hc_wallbox_current_card", "16", { variables: { active_color } }, {});
    assert.equal(appearance.background, active_color);
    assert.equal(appearance.text, "var(--color-black)", "the Wallbox default does not override its light palette");
  }
  for (const [kind, state] of [["hc_access_card", "locked"], ["hc_switch_card", "on"], ["hc_climate_card", "fan_only"]]) {
    assert.equal(stateAppearance(kind, state, {}, {}).text, "var(--active-text-color)", `${kind}: green keeps white text`);
  }
  assert.equal(stateAppearance("hc_wallbox_current_card", "16", {}, {}).text, "var(--active-text-color, #fff)");
  for (const [kind, state] of [["hc_sensor_card", "on"], ["hc_room_card", "on"]]) {
    const appearance = stateAppearance(kind, state, {}, {});
    assert.equal(appearance.text, "var(--text-primary-color,var(--active-text-color))");
    assert.equal(appearance.icon, appearance.text);
  }
});

test("number buttons use the entity step and limits", () => {
  const attributes = { min: 0, max: 10, step: 0.5 };
  assert.equal(numberStepValue(4, attributes, 1), 4.5);
  assert.equal(numberStepValue(4, attributes, -1), 3.5);
  assert.equal(numberStepValue(10, attributes, 1), 10);
  assert.equal(numberStepValue(0, attributes, -1), 0);
});

test("climate temperature buttons use the entity step", () => {
  const attributes = { temperature: 21, target_temp_step: 0.5 };
  assert.deepEqual(climateTemperatureChange(attributes, "heat", 1), { temperature: 21.5 });
  assert.deepEqual(climateTemperatureChange(attributes, "heat", -1), { temperature: 20.5 });
});

test("heat/cool temperature buttons move both targets", () => {
  const attributes = { target_temp_low: 19, target_temp_high: 24, target_temp_step: 1 };
  assert.deepEqual(climateTemperatureChange(attributes, "heat_cool", 1), {
    target_temp_low: 20,
    target_temp_high: 25,
  });
});

test("heat/cool limits preserve the target range", () => {
  const attributes = { target_temp_low: 25, target_temp_high: 30, target_temp_step: 1, min_temp: 10, max_temp: 30 };
  assert.deepEqual(climateTemperatureChange(attributes, "heat_cool", 1), {
    target_temp_low: 25,
    target_temp_high: 30,
  });
});

test("number controls and slider hit areas expose at least 48px touch targets", () => {
  assert.match(source, /\.number-stepper button \{[^}]*width:48px; height:48px/);
  assert.match(source, /\.climate-stepper button \{ width:52px; height:48px; \}/);
  assert.match(source, /input\[type=range\] \{[^}]*min-height:48px; height:48px/);
});

test("new card control text has English and Portuguese translations", () => {
  for (const key of [
    "common.loading",
    "actions.failed",
    "actions.for_target",
    "controls.increase",
    "controls.decrease",
    "climate.current_temperature",
    "climate.set_mode",
    "climate.updating",
    "climate.not_confirmed",
    "access.hold_to_activate",
    "popup.close",
  ]) {
    assert.equal(dashboardSource.match(new RegExp(`^\\s+"${key.replace(".", "\\.")}"\\s*:`, "gm"))?.length, 2, key);
  }
  assert.doesNotMatch(source, /°C|ºC/);
  assert.equal(ACCESS_HOLD_MS, 1200);
});
