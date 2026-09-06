import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const {
  contextOptionsForScenario,
  effectiveViewport,
  parseArgs,
  safeAreaInsetsForScenario,
  scenarios,
  selectedRuns,
  themeVariables,
  themes,
  visualVariablesForScenario,
} = require("../../scripts/test-ha-dashboard-accessibility.js");

test("accessibility profiles cover the complete agreed mobile matrix", () => {
  const actual = scenarios.map(({ name, device, viewport, textScale, bold, pageZoom }) => [
    name, device, viewport.width, viewport.height, textScale, bold, pageZoom,
  ]);
  assert.deepEqual(actual, [
    ["iphone-normal", "iphone", 390, 844, 1, false, 1],
    ["iphone-bold", "iphone", 390, 844, 1, true, 1],
    ["iphone-text-200", "iphone", 390, 844, 2, false, 1],
    ["iphone-page-zoom-200", "iphone", 390, 844, 1, false, 2],
    ["iphone-bold-text-200", "iphone", 390, 844, 2, true, 1],
    ["android-normal", "android", 360, 800, 1, false, 1],
    ["android-bold", "android", 360, 800, 1, true, 1],
    ["android-text-200", "android", 360, 800, 2, false, 1],
    ["android-page-zoom-200", "android", 360, 800, 1, false, 2],
    ["android-bold-text-200", "android", 360, 800, 2, true, 1],
    ["narrow-320", "android", 320, 700, 1, false, 1],
    ["iphone-landscape", "iphone", 844, 390, 1, false, 1],
    ["android-landscape", "android", 800, 360, 1, false, 1],
  ]);
  assert.equal(new Set(scenarios.map(({ name }) => name)).size, scenarios.length);
});

test("device contexts use mobile UA, touch, screen, scale, and effective page-zoom viewport", () => {
  const iphone = scenarios.find(({ name }) => name === "iphone-normal");
  const android = scenarios.find(({ name }) => name === "android-normal");
  const zoomed = scenarios.find(({ name }) => name === "iphone-page-zoom-200");
  const iphoneOptions = contextOptionsForScenario(iphone, "dark");
  const androidOptions = contextOptionsForScenario(android, "light");
  const zoomedOptions = contextOptionsForScenario(zoomed, "light");

  assert.match(iphoneOptions.userAgent, /iPhone/);
  assert.match(androidOptions.userAgent, /Android/);
  assert.equal(iphoneOptions.isMobile, true);
  assert.equal(iphoneOptions.hasTouch, true);
  assert.equal(iphoneOptions.colorScheme, "dark");
  assert.deepEqual(iphoneOptions.screen, iphone.viewport);
  assert.deepEqual(effectiveViewport(zoomed), { width: 195, height: 422 });
  assert.deepEqual(zoomedOptions.viewport, { width: 195, height: 422 });
  assert.equal(zoomedOptions.deviceScaleFactor, iphoneOptions.deviceScaleFactor * 2);
});

test("iPhone safe areas cover portrait and landscape while Android stays inset-free", () => {
  assert.deepEqual(safeAreaInsetsForScenario(scenarios.find(({ name }) => name === "iphone-normal")), {
    top: 47, right: 0, bottom: 34, left: 0,
    topMax: 47, rightMax: 0, bottomMax: 34, leftMax: 0,
  });
  assert.deepEqual(safeAreaInsetsForScenario(scenarios.find(({ name }) => name === "iphone-landscape")), {
    top: 0, right: 47, bottom: 21, left: 47,
    topMax: 0, rightMax: 47, bottomMax: 21, leftMax: 47,
  });
  assert.equal(safeAreaInsetsForScenario(scenarios.find(({ name }) => name === "android-normal")).bottom, 0);
});

test("text and safe-area simulations use shared project variables", () => {
  const scaled = visualVariablesForScenario(
    scenarios.find(({ name }) => name === "iphone-bold-text-200"),
    "light",
  );
  assert.equal(scaled["--font-size-primary"], "36px");
  assert.equal(scaled["--font-size-secondary"], "32px");
  assert.equal(scaled["--font-weight-primary"], "800");
  assert.equal(scaled["--marao-safe-area-inset-top"], "47px");
  assert.equal(scaled["--marao-safe-area-inset-bottom"], "34px");
});

test("release runs every profile in deterministic light and dark modes", () => {
  const releaseRuns = selectedRuns(parseArgs([]));
  assert.equal(releaseRuns.length, scenarios.length * themes.length);
  for (const scenario of scenarios) {
    assert.deepEqual(
      releaseRuns.filter((run) => run.scenario === scenario).map(({ theme }) => theme),
      ["light", "dark"],
    );
  }
  assert.notEqual(themeVariables("light")["--marao-card-background"], themeVariables("dark")["--marao-card-background"]);
});

test("preview arguments select one profile and one theme and reject missing values", () => {
  const options = parseArgs(["--preview", "--scenario", "android-normal", "--theme", "dark"]);
  assert.deepEqual(options, { preview: true, scenario: "android-normal", theme: "dark" });
  assert.deepEqual(selectedRuns(options).map(({ scenario, theme }) => [scenario.name, theme]), [
    ["android-normal", "dark"],
  ]);
  assert.throws(() => parseArgs(["--scenario"]), /--scenario requires a value/);
  assert.throws(() => parseArgs(["--theme", "--preview"]), /--theme requires a value/);
  assert.throws(() => selectedRuns({ preview: true, scenario: "tablet", theme: "light" }), /Unknown accessibility profile/);
  assert.throws(() => selectedRuns({ preview: true, scenario: "iphone-normal", theme: "sepia" }), /Unknown theme/);
});

test("VS Code preview choices stay aligned with executable profiles and themes", () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(repoRoot, ".vscode/tasks.json"), "utf8"));
  const input = (id) => tasks.inputs.find((item) => item.id === id);
  assert.deepEqual(input("maraoAccessibilityProfile").options, scenarios.map(({ name }) => name));
  assert.deepEqual(input("maraoAccessibilityTheme").options, themes);
});

test("browser checks report failed resources and activate cards through their controls", () => {
  const accessibilitySource = fs.readFileSync(path.join(repoRoot, "scripts/test-ha-dashboard-accessibility.js"), "utf8");
  const e2eSource = fs.readFileSync(path.join(repoRoot, "scripts/test-ha-dashboard-e2e.js"), "utf8");
  for (const source of [accessibilitySource, e2eSource]) {
    assert.match(source, /page\.on\("requestfailed"/);
    assert.match(source, /response\.status\(\) >= 400|response\.status\(\) < 400/);
  }
  assert.match(accessibilitySource, /locator\("\[data-card-action\]"\)\.click\(\)/);
  assert.match(e2eSource, /function cardAction\(page, title\)/);
});
