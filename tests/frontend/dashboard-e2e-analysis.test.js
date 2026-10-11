import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {
  buildViewChecks,
  captureClimateFeedback,
  climateFeedbackSnapshot,
  conditionalCardIsActive,
  dashboardNavigationViolations,
  normalizedPathname,
  scrollDashboard,
} = require("../test-ha-dashboard-e2e.js");
const { visibleBounds } = require("../test-ha-room-cards.js");

test('climate captures ignore collapsed scroll containers and frame both ends of a tall card', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-climate-capture-unit-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let top = 2000, collapsedScrolls = 0;
  const collapsed = { clientHeight: 0, scrollHeight: 4000, scrollBy: () => collapsedScrolls++, getRootNode: () => ({}) };
  const heading = { getClientRects: () => [1], getBoundingClientRect: () => ({ top, bottom: top + 20, left: 14, right: 300 }) };
  const element = { parentElement: collapsed, scrollIntoView() {},
    getBoundingClientRect: () => ({ height: 900, bottom: top + 900 }),
    shadowRoot: { querySelector: () => heading, querySelectorAll: () => [] } };
  const environment = vm.createContext({ innerHeight: 844, innerWidth: 390, getComputedStyle: () => ({ overflowY: 'auto' }),
    document: { scrollingElement: { scrollBy: ({ top: distance }) => { top -= distance; } } } });
  const target = { evaluate: (run, arg) => structuredClone(vm.runInContext('(' + run.toString() + ')', environment)(element, arg)) };
  const captures = [];
  const page = { evaluate: async () => {}, screenshot: async () => captures.push(top), locator: selector => selector === '.marao-popup-sheet'
    ? { count: async () => 0 } : { boundingBox: async () => ({ y: 760 }) } };
  await captureClimateFeedback(page, 'collapsed-scroll-regression', target, directory);
  assert.equal(collapsedScrolls, 0);
  assert.deepEqual(captures, [14, -148]);
});

test('climate feedback records a rendered pending transition before a fast rejection, without accepting absent feedback', () => {
  let mutation, disconnected = 0, pending = false, target = '21';
  const observe = vm.runInNewContext('(' + climateFeedbackSnapshot.toString() + ')', { MutationObserver: class {
    constructor(callback) { mutation = callback; }
    observe() {}
    disconnect() { disconnected++; }
  } });
  const card = { _config: { entity: 'climate.test' }, hass: { states: { 'climate.test': { state: 'heat', attributes: { temperature: 21, current_temperature: 20 } } } },
    shadowRoot: { querySelector(selector) {
      return { '.state': { textContent: 'Heat' }, '.number-value': { textContent: target }, '.climate-pending': pending ? {} : null }[selector];
    } } };
  observe(card, 'observe');
  pending = true; target = '21.5'; mutation();
  pending = false; target = '21'; mutation();
  const feedback = observe(card, 'observed');
  assert.equal(feedback.pending, true); assert.equal(feedback.target, '21.5');
  assert.equal(feedback.temperature, 21); assert.equal(feedback.current, 20);
  assert.equal(observe(card).pending, false); assert.equal(observe(card).target, '21');
  observe(card, 'observe'); mutation();
  assert.equal(observe(card, 'observed'), undefined);
  assert.equal(disconnected, 2); assert.equal(card.__feedbackObserver, undefined);
});

const dashboard = {
  views: [
    {
      title: "Overview",
      path: "overview",
      cards: [
        { type: "custom:marao-card" },
        {
          type: "conditional",
          conditions: [{ entity: "light.active", state: "on" }],
          card: { type: "custom:marao-card" },
        },
        {
          type: "conditional",
          conditions: [{ entity: "light.inactive", state: "on" }],
          card: { type: "custom:marao-card" },
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
    { "light.active": "on", "light.inactive": "off" }
  );

  assert.deepEqual(view.configuredCounts, { "marao-card": 2 });
});

test("missing card checks retain direct and active conditional assertions", () => {
  const [view] = buildViewChecks(
    dashboard,
    "/marao-generated/overview",
    { "light.active": "on", "light.inactive": "off" }
  );

  assert.deepEqual(view.configuredCounts, { "marao-card": 2 });
});

test("route checks compare canonical paths without query strings", () => {
  assert.equal(
    normalizedPathname("http://homeassistant.test/marao-generated/overview/?authSig=secret"),
    "/marao-generated/overview"
  );
});

test("dashboard navigation stays in one dashboard and resolves every target", () => {
  const config = {
    views: [
      {
        path: "overview",
        cards: [
          {
            type: "custom:marao-navbar-card",
            routes: [{ url: "/marao-dashboard/cases" }],
          },
          {
            tap_action: { navigation_path: "#details" },
          },
          {
            type: "custom:marao-popup-card",
            hash: "#details",
          },
        ],
      },
      { path: "cases", cards: [] },
    ],
  };

  assert.deepEqual(dashboardNavigationViolations(config, "marao-dashboard"), []);
  config.views[0].cards[0].routes.push({ url: "/another-dashboard/home" });
  config.views[0].cards[1].tap_action.navigation_path = "#missing";
  assert.deepEqual(dashboardNavigationViolations(config, "marao-dashboard"), [
    "Route leaves /marao-dashboard: /another-dashboard/home",
    "Unresolved popup route #missing",
  ]);
});

function scrollPage({ settle = () => {}, blocked = false } = {}) {
  let frames = 0;
  let disposed = false;
  const visits = [];
  const element = {
    localName: "div", id: "view", isConnected: true,
    scrollTop: 0, scrollHeight: 1200, clientHeight: 400,
    scrollTo({ top }) {
      if (!blocked) this.scrollTop = Math.max(0, Math.min(top, this.scrollHeight - this.clientHeight));
    },
  };
  const handle = { evaluate: (run, value) => run(element, value), dispose: () => { disposed = true; } };
  const page = {
    locator: () => ({
      first: () => ({ evaluateHandle: () => handle }),
      evaluateAll: (run) => run([]),
    }),
    evaluate: () => {},
    waitForTimeout: () => { settle(element, ++frames); visits.push(element.scrollTop); },
    screenshot: () => {},
    url: () => "http://homeassistant.test/marao-dashboard/card-test",
  };
  return { page, element, visits, disposed: () => disposed };
}

test("dashboard scrolling follows layout shrink and confirms a stable bottom after lazy growth", async () => {
  const fixture = scrollPage({ settle: (element, frame) => {
    // Loading content briefly collapses, clamping the old requested position.
    if (frame === 3) { element.scrollHeight = 800; element.scrollTop = 100; }
    // A newly visible lazy card adds content at the first apparent bottom.
    if (frame === 5) element.scrollHeight = 1400;
  } });
  await scrollDashboard(fixture.page, { screenshotPrefix: "/unused" });
  assert.deepEqual(fixture.visits, [0, 300, 100, 400, 400, 700, 1000, 1000]);
  assert.equal(fixture.element.scrollTop, 0);
  assert.equal(fixture.disposed(), true);
});

test("dashboard scrolling rejects an immovable container with view and geometry diagnostics", async () => {
  const fixture = scrollPage({ blocked: true });
  await assert.rejects(() => scrollDashboard(fixture.page), (error) => {
    assert.match(error.message, /marao-dashboard\/card-test/);
    for (const field of ['"selected":"div#view"', '"top":0', '"height":1200', '"viewport":400']) assert.ok(error.message.includes(field));
    return true;
  });
  assert.equal(fixture.visits.length, 4);
  assert.equal(fixture.disposed(), true);
});

test("each scroll segment settles and verifies lazy content before capturing it", async () => {
  const fixture = scrollPage();
  let ready = false;
  let captures = 0;
  fixture.page.waitForTimeout = () => { ready = false; };
  fixture.page.screenshot = () => { assert.equal(ready, true); captures += 1; };
  await scrollDashboard(fixture.page, {
    screenshotPrefix: "/unused",
    onSegment: () => { ready = true; },
  });
  assert.ok(captures > 1);
});

test("dashboard scrolling reports title defects and disposes its scroll handle", async () => {
  const fixture = scrollPage();
  const locator = fixture.page.locator();
  fixture.page.locator = () => ({
    ...locator,
    evaluateAll: () => ["Example: title uses 120px of 240px content width"],
  });
  await assert.rejects(() => scrollDashboard(fixture.page), /Example: title uses 120px of 240px content width/);
  assert.equal(fixture.element.scrollTop, 0);
  assert.equal(fixture.disposed(), true);
});

test("room geometry is read atomically and rejects an invisible element", async () => {
  const rect = { x: 8, y: 40, width: 120, height: 96 };
  const locator = {
    boundingBox: () => { throw new Error('Separate visibility and geometry reads can race'); },
    evaluate: run => run({ localName: 'marao-card', getBoundingClientRect: () => ({ ...rect, toJSON: () => ({ ...rect }) }) }),
  };
  assert.deepEqual(await visibleBounds(locator), rect);
  rect.height = 0;
  await assert.rejects(() => visibleBounds(locator), /no visible geometry: marao-card/);
  const host = {
    evaluate: (run, selector) => run({ shadowRoot: { querySelector: value => {
      assert.equal(value, '[data-room-lights-off]');
      return { localName: 'button', getBoundingClientRect: () => ({ width: 48, height: 48, toJSON: () => ({ width: 48, height: 48 }) }) };
    } } }, selector),
  };
  assert.deepEqual(await visibleBounds(host, '[data-room-lights-off]'), { width: 48, height: 48 });
  await assert.rejects(() => visibleBounds({ evaluate: (run, selector) => run({ shadowRoot: { querySelector: () => null }, querySelector: () => null }, selector) }, 'nav'), /element is missing: nav/);
});
