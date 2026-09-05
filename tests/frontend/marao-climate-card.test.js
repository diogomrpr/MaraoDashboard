import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8");
const { climateModeLabel, climateTemperatureChange, haptic, numberStepValue, stateAppearance } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("strong haptics use Home Assistant's haptic event", () => {
  const previousWindow = globalThis.window;
  let detail;
  globalThis.window = new EventTarget();
  globalThis.window.addEventListener("haptic", (event) => { detail = event.detail; });
  haptic("heavy");
  globalThis.window = previousWindow;
  assert.equal(detail, "heavy");
});

test("climate modes have readable labels", () => {
  assert.equal(climateModeLabel("heat"), "Heat");
  assert.equal(climateModeLabel("heat_cool"), "Heat cool");
  assert.equal(climateModeLabel("fan_only"), "Fan only");
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
