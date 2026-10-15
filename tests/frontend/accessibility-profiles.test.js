import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const {
  applyVisualPreferences,
  applySafeAreaSource,
  safeAreaCases,
  contextOptionsForScenario,
  configurePageEmulation,
  effectiveViewport,
  parseArgs,
  capturePolicy,
  popupReviewKey,
  popupFocusFailure,
  popupHasVisibleContent,
  popupMemberTouchPosition,
  popupTriggerTargets,
  safeAreaInsetsForScenario,
  scenarios,
  selectedRuns,
  themeVariables,
  themes,
  visualVariablesForScenario,
  waitForNavbar,
} = require("../test-ha-dashboard-accessibility.js");

test('popup triggers retain their live identity when earlier sheets insert cards', () => {
  const card = hash => ({ localName: 'marao-card', _config: { tap_action: { navigation_path: hash } },
    attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } });
  const first = card('#first'), second = card('#second');
  const targets = popupTriggerTargets([first, second]);
  const liveCards = [card('#inserted'), first, second];
  assert.notEqual(liveCards[targets[1].index], second, 'A cached position now selects another control');
  assert.equal(liveCards.find(card => card.attributes['data-marao-popup-probe'] === String(targets[1].index)), second);
  assert.deepEqual(targets.map(target => target.hash), ['#first', '#second']);
});

test('saved-page readiness preserves empty navigation and still requires configured routes', async () => {
  for (const routes of [[], [{ url: '/marao-dashboard/home' }]]) {
    const waits = [];
    const card = { _config: { routes }, waitFor: async options => waits.push(['card', options.state]),
      evaluate: async callback => callback(card), locator: selector => ({
        waitFor: async options => waits.push([selector, options.state]), count: async () => routes.length,
      }) };
    await waitForNavbar({ locator: () => card });
    assert.deepEqual(waits, [['card', 'attached'], ['nav', 'attached'], ['nav', routes.length ? 'visible' : 'hidden']]);
    if (routes.length) {
      const locator = card.locator;
      card.locator = selector => ({ ...locator(selector), count: async () => 0 });
      await assert.rejects(waitForNavbar({ locator: () => card }), /retain every configured route/);
    }
  }
});

test('popup member geometry uses the current button and still rejects clipping and obstruction', () => {
  const previousHeight = globalThis.innerHeight;
  globalThis.innerHeight = 390;
  try {
    let box = {left: 252, top: 158, bottom: 291, width: 339};
    let obstructed = false;
    const oldButton = {getRootNode: () => ({})};
    const button = {getBoundingClientRect: () => box, getRootNode: () => ({elementFromPoint: () => button})};
    const sheet = {querySelector: () => ({getBoundingClientRect: () => ({bottom: 146})}),
      getBoundingClientRect: () => ({bottom: 360}), getRootNode: () => ({elementFromPoint: () => obstructed ? {} : card})};
    const card = {shadowRoot: {querySelector: () => button}, closest: () => sheet};
    assert.equal(oldButton.getRootNode().host, undefined, 'The old detached button has lost its owner');
    assert.deepEqual(popupMemberTouchPosition(card), {x: 24, y: 24});
    box = {...box, bottom: 190};
    assert.throws(() => popupMemberTouchPosition(card), /less than 48px/);
    box = {...box, bottom: 291}; obstructed = true;
    assert.throws(() => popupMemberTouchPosition(card), /obstructed/);
  } finally { globalThis.innerHeight = previousHeight; }
});

test('visual preferences reach cards mounted while fonts and scrolling settle', async () => {
  const node = localName => ({ localName, children: [], dataset: {}, style: { values: new Map(), setProperty(name, value) { this.values.set(name, value); } } });
  const html = node('html'), ha = node('home-assistant'), shadow = node('shadow-root');
  html.children = [ha]; ha.shadowRoot = shadow;
  const lateCard = node('marao-card');
  const previous = globalThis.document;
  const previousFrame = globalThis.requestAnimationFrame;
  const painted = [];
  const emulation = [];
  globalThis.requestAnimationFrame = callback => {
    painted.push({ size: lateCard.style.values.get('--font-size-primary'), theme: html.dataset.maraoThemeMode });
    assert.deepEqual(emulation.at(-1), { method: 'Emulation.setTouchEmulationEnabled', params: { enabled: true, maxTouchPoints: 1 } });
    queueMicrotask(callback);
  };
  globalThis.document = { documentElement: html, fonts: { ready: Promise.resolve() } };
  let sessions = 0;
  const page = { evaluate: async (callback, data) => callback(data), waitForTimeout: async () => { shadow.children.push(lateCard); },
    context: () => ({ newCDPSession: async () => { sessions += 1; return { send: async (method, params) => emulation.push({ method, params }) }; } }) };
  try {
    await applyVisualPreferences(page, scenarios.find(s => s.name === 'iphone-bold-text-200'), 'dark');
    for (const element of [html, ha, lateCard]) {
      assert.equal(element.style.values.get('--font-size-primary'), '36px');
      assert.equal(element.style.values.get('--font-size-secondary'), '32px');
      assert.equal(element.style.values.get('--font-weight-primary'), '800');
    }
    assert.equal(html.dataset.maraoThemeMode, 'dark');
    assert.deepEqual(painted.at(-1), { size: '36px', theme: 'dark' });
    await applyVisualPreferences(page, scenarios.find(s => s.name === 'iphone-normal'), 'light');
    assert.equal(lateCard.style.values.get('--font-size-primary'), '18px');
    assert.equal(html.dataset.maraoThemeMode, 'light');
    assert.deepEqual(painted.at(-1), { size: '18px', theme: 'light' });
    assert.equal(sessions, 1, 'Reuse the page session without replacing its safe-area and text overrides');
    assert.equal(emulation.length, 2, 'Restore actual touch before every inspected frame');
  } finally { globalThis.document = previous; globalThis.requestAnimationFrame = previousFrame; }
});

test('mobile emulation explicitly restores touch together with text and safe-area settings', async () => {
  const calls=[];
  let sessions = 0;
  const context={newCDPSession:async()=>{ sessions += 1; return {send:async(method,params)=>calls.push({method,params})}; }};
  const scenario=scenarios.find(s=>s.name==='iphone-bold');
  const page = {};
  await configurePageEmulation(context,page,scenario);
  assert.deepEqual(calls,[
    {method:'Emulation.setTouchEmulationEnabled',params:{enabled:true,maxTouchPoints:1}},
    {method:'Emulation.setSafeAreaInsetsOverride',params:{insets:safeAreaInsetsForScenario(scenario)}},
    {method:'Emulation.setEmulatedOSTextScale',params:{scale:scenario.textScale}},
  ]);
  await configurePageEmulation(context,page,scenario);
  assert.equal(sessions, 1, 'Repeated scrolling must retain the same page emulation session');
  assert.deepEqual(calls.slice(3), calls.slice(0,3));
  await configurePageEmulation(context,{},scenario);
  assert.equal(sessions, 2, 'A different page needs its own emulation session');
});

test('production safe-area cases keep browser and app sources independent and remove all emulation overrides', async () => {
  const style = () => ({ values: new Map(), setProperty(k,v){this.values.set(k,v)}, removeProperty(k){this.values.delete(k)} });
  const node = () => ({ children: [], style: style(), querySelector(){return null}, querySelectorAll(){return []} });
  const html=node(), ha=node(), view=node(), shadow=node();
  html.children=[ha];ha.shadowRoot=shadow;shadow.children=[view];shadow.querySelector=()=>view;
  for(const e of [html,ha,view])for(const side of ['top','right','bottom','left'])e.style.setProperty('--marao-safe-area-inset-'+side,'99px');
  view.style.setProperty('unrelated','keep');
  const previousDocument=globalThis.document, previousFrame=globalThis.requestAnimationFrame;
  globalThis.document={documentElement:html,children:[html],querySelector:()=>ha};
  globalThis.requestAnimationFrame=callback=>callback();
  const calls=[];
  const context={newCDPSession:async()=>({send:async(method,params)=>calls.push({method,params}),detach:async()=>{}})};
  const sizes=[];
  const page={evaluate:async(callback,data)=>callback(data),setViewportSize:async size=>sizes.push(size)};
  try {
    await applySafeAreaSource(context,page,safeAreaCases[0]);
    assert.equal(calls[0].params.insets.top,0);
    assert.equal(html.style.values.get('--app-safe-area-inset-top'),'47px');
    for(const e of [html,ha,view])assert.ok(![...e.style.values.keys()].some(k=>k.startsWith('--marao-safe-area-inset-')));
    await applySafeAreaSource(context,page,safeAreaCases.find(c=>c.name==='host-padded'));
    assert.equal(view.style.values.get('--safe-area-inset-top'),'0px');
    assert.equal(view.style.marginTop,'47px');
    await applySafeAreaSource(context,page,safeAreaCases.find(c=>c.name==='browser-only'));
    assert.equal(calls.at(-1).params.insets.top,47);
    assert.ok(!html.style.values.has('--app-safe-area-inset-top'));
    assert.ok(!view.style.values.has('--safe-area-inset-top'));
    assert.equal(view.style.marginTop,'');
    await applySafeAreaSource(context,page,safeAreaCases.find(c=>c.name==='explicit-zero'));
    assert.equal(html.style.values.get('--app-safe-area-inset-top'),'0px');
    assert.equal(calls.at(-1).params.insets.top,47);
    assert.equal(view.style.values.get('unrelated'),'keep');
    await applySafeAreaSource(context,page,safeAreaCases.find(c=>c.name==='rotation'));
    assert.deepEqual(sizes.at(-1),{width:844,height:390});
    assert.equal(html.style.values.get('--app-safe-area-inset-top'),'0px');
    assert.equal(html.style.values.get('--app-safe-area-inset-left'),'47px');
    assert.equal(calls.at(-1).params.insets.top,59);
    await applySafeAreaSource(context,page,safeAreaCases.find(c=>c.name==='portrait-again'));
    assert.equal(html.style.values.get('--app-safe-area-inset-top'),'59px');
    assert.equal(html.style.values.get('--app-safe-area-inset-left'),'0px');
  } finally {globalThis.document=previousDocument;globalThis.requestAnimationFrame=previousFrame;}
  assert.equal(parseArgs(['--safe-area']).safeArea,true);
  assert.deepEqual(selectedRuns(parseArgs(['--safe-area'])).map(r=>[r.scenario.name,r.theme]),[['iphone-normal','light'],['iphone-normal','dark']]);
});

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
  assert.deepEqual(options, { preview: true, scenario: "android-normal", theme: "dark", screenshots: 'failure', focused: false, families: [], popups: false, parallel: false });
  assert.deepEqual(selectedRuns(options).map(({ scenario, theme }) => [scenario.name, theme]), [
    ["android-normal", "dark"],
  ]);
  assert.throws(() => parseArgs(["--scenario"]), /--scenario requires a value/);
  assert.throws(() => parseArgs(["--theme", "--preview"]), /--theme requires a value/);
  assert.throws(() => selectedRuns({ preview: true, scenario: "tablet", theme: "light" }), /Unknown accessibility profile/);
  assert.throws(() => selectedRuns({ preview: true, scenario: "iphone-normal", theme: "sepia" }), /Unknown theme/);
});

test('success capture sampling keeps the full mobile matrix and distinct popup layouts', () => {
  assert.equal(selectedRuns(parseArgs([])).length, 26);
  const options = parseArgs(['--screenshots', 'review']);
  assert.equal(capturePolicy(options, { name: 'iphone-normal' }), 'review');
  assert.equal(capturePolicy(options, { name: 'android-page-zoom-200' }), 'review');
  assert.equal(capturePolicy(options, { name: 'iphone-bold' }), 'failure');
  assert.equal(capturePolicy(parseArgs(['--screenshots', 'all']), { name: 'iphone-bold' }), 'all');
  assert.throws(() => parseArgs(['--screenshots', 'silent']), /screenshot policy/);
  assert.equal(parseArgs(['--pages-only']).pagesOnly, true);
  const popup = { name: 'Living room', cards: [{ template: 'hc_light_card' }] };
  assert.equal(popupReviewKey(popup), popupReviewKey({ ...popup, name: 'Another room' }));
  for (const changed of [{ ...popup, height: '500px' }, { ...popup, name: 'Light error' },
    { ...popup, cards: [{ template: 'hc_climate_card' }] }, { ...popup, entity_group: { type: 'light', popup_filter: 'active' } }]) {
    assert.notEqual(popupReviewKey(popup), popupReviewKey(changed));
  }
});

test("browser checks report failed resources and activate cards through their controls", () => {
  const accessibilitySource = fs.readFileSync(path.join(repoRoot, "tests/test-ha-dashboard-accessibility.js"), "utf8");
  const e2eSource = fs.readFileSync(path.join(repoRoot, "tests/test-ha-dashboard-e2e.js"), "utf8");
  for (const source of [accessibilitySource, e2eSource]) {
    assert.match(source, /page\.on\("requestfailed"/);
    assert.match(source, /response\.status\(\) >= 400|response\.status\(\) < 400/);
  }
  assert.match(accessibilitySource, /await control\.tap\(/);
  assert.match(e2eSource, /function cardAction\(page, title\)/);
});

test("popup focus checks resolve the live control after a previously located button is replaced", () => {
  const previous = { document: globalThis.document, location: globalThis.location };
  try {
    const root = { isConnected: true };
    const card = { localName: "marao-card", isConnected: true, shadowRoot: root, getRootNode: () => ({}) };
    const button = () => ({ localName: "button", isConnected: true, getRootNode: () => root, getAttribute: () => "Lock · unlocking" });
    let current = button();
    root.querySelector = () => current;
    const previouslyLocated = current;
    previouslyLocated.isConnected = false;
    current = button();
    root.activeElement = current;
    globalThis.document = { activeElement: card, querySelectorAll: () => [] };
    globalThis.location = { hash: "" };
    assert.equal(popupFocusFailure(card, "[data-card-action]"), null);

    root.activeElement = null;
    const failure = popupFocusFailure(card, "[data-card-action]");
    assert.equal(failure.expected.connected, true);
    assert.equal(failure.expected.label, "Lock · unlocking");
    assert.equal(failure.rootActive, null, "a genuine loss of focus still fails");
  } finally {
    Object.assign(globalThis, previous);
  }
});

test('whole-card problem colors have readable contrast and distinct availability/fault surfaces in both themes', () => {
  const luminance = color => {
    assert.match(color, /^#[0-9a-f]{6}$/i);
    return color.slice(1).match(/../g).map(part => parseInt(part, 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
  };
  for (const theme of themes) {
    const variables = themeVariables(theme), backgrounds = [];
    for (const kind of ['neutral', 'warning', 'error']) {
      const background = variables[`--marao-problem-${kind}-background`], text = variables[`--marao-problem-${kind}-text`];
      const levels = [luminance(background), luminance(text)].sort((a, b) => a - b);
      assert.ok((levels[1] + .05) / (levels[0] + .05) >= 4.5, `${theme}/${kind}`);
      backgrounds.push(background);
    }
    assert.equal(new Set(backgrounds).size, 3);
  }
});


test('popup content waits for nested native rendering and rejects an empty mount', () => {
  const previous = globalThis.getComputedStyle;
  globalThis.getComputedStyle = node => ({ display: node.hidden ? 'none' : 'block' });
  const node = text => ({ children: [], textContent: text, getBoundingClientRect: () => ({ width: 350, height: 50 }), matches: () => false });
  try {
    const native = node(''), host = { children: [native] };
    native.shadowRoot = { children: [node('')] };
    assert.equal(popupHasVisibleContent(host), false);
    native.shadowRoot.children[0].textContent = 'No scenes configured';
    assert.equal(popupHasVisibleContent(host), true);
    native.shadowRoot.children[0].hidden = true;
    assert.equal(popupHasVisibleContent(host), false);
    native.shadowRoot.children = [];
    assert.equal(popupHasVisibleContent(host), false);
  } finally { globalThis.getComputedStyle = previous; }
});
