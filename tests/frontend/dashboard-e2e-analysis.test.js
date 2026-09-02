import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildViewChecks,
  conditionalCardIsActive,
  normalizedPathname,
} = require("../../scripts/test-ha-dashboard-e2e.js");

const dashboard = {
  views: [
    {
      title: "Overview",
      path: "overview",
      cards: [
        { type: "custom:button-card" },
        {
          type: "conditional",
          conditions: [{ entity: "light.active", state: "on" }],
          card: { type: "custom:button-card" },
        },
        {
          type: "conditional",
          conditions: [{ entity: "light.inactive", state: "on" }],
          card: { type: "custom:button-card" },
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
    [{ id: "button_card", status: "installed" }],
    { "light.active": "on", "light.inactive": "off" }
  );

  assert.deepEqual(view.configuredCounts, { "button-card": 3 });
  assert.deepEqual(view.expectedRenderedCounts, { "button-card": 2 });
  assert.deepEqual(view.expectedMissingCounts, {});
});

test("missing card checks retain direct and active conditional assertions", () => {
  const [view] = buildViewChecks(
    dashboard,
    "/marao-generated/overview",
    [{ id: "button_card", status: "not_detected" }],
    { "light.active": "on", "light.inactive": "off" }
  );

  assert.deepEqual(view.expectedMissingCounts, { "button-card": 2 });
  assert.deepEqual(view.allowedMissingElements, ["button-card"]);
});

test("route checks compare canonical paths without query strings", () => {
  assert.equal(
    normalizedPathname("http://homeassistant.test/marao-generated/overview/?authSig=secret"),
    "/marao-generated/overview"
  );
});
