import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8");
const dashboardSource = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoDashboard.js", import.meta.url), "utf8");
const { ACCESS_HOLD_MS, climateDefaultAction, climateModeIcon, climateModeLabel, climateTemperatureChange, haptic, numberStepValue, performAction, serviceConnectionReady, stateAppearance } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

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

test("service rejections become a localized Home Assistant notification", async () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const homeAssistant = new EventTarget();
  let notification;
  homeAssistant.addEventListener("hass-notification", (event) => { notification = event.detail; });
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
      { language: "pt", callService: () => Promise.reject(new Error("Sem permissão")) },
      { action: "toggle" },
      "light.test",
    ));
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
  assert.deepEqual(notification, { message: "A ação falhou: Sem permissão" });
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
  assert.match(source, /\.climate-card \.current-temperature \{[^}]*font-size:max\(2rem,var\(--font-size-primary/);
  assert.match(source, /class="climate current-temperature" aria-label="\$\{esc\(climateReadingLabel\)\}">\$\{esc\(currentTemperature\)\}/);
  assert.match(source, /\.climate-mode \{[^}]*display:flex;[^}]*flex-direction:column;[^}]*align-items:center;[^}]*justify-content:center;[^}]*min-height:72px/);
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

test("number and slider controls expose at least 48px touch targets", () => {
  assert.match(source, /\.number-stepper button \{[^}]*width:48px; height:48px/);
  assert.match(source, /\.climate-stepper button \{ width:52px; height:48px; \}/);
  assert.match(source, /input\[type=range\]::\-webkit-slider-thumb \{[^}]*width:48px; height:48px/);
  assert.match(source, /input\[type=range\]::\-moz-range-thumb \{ width:48px; height:48px/);
  assert.match(source, /const thumb = 48;/);
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
    "access.hold_to_activate",
    "popup.close",
  ]) {
    assert.equal(dashboardSource.match(new RegExp(`^\\s+"${key.replace(".", "\\.")}"\\s*:`, "gm"))?.length, 2, key);
  }
  assert.doesNotMatch(source, /°C|ºC/);
  assert.equal(ACCESS_HOLD_MS, 1200);
});
