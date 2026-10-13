const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { readConfig, assertDisposableHaTarget, accessToken, setBrowserToken, assertCurrentFrontend } = require('../ha-test/client');
const { prepare } = require('../ha-test/prepare');
const { parseArgs, selectedRuns, contextOptionsForScenario, configurePageEmulation, applyVisualPreferences, emulationIssues, layoutIssues } = require('./test-ha-dashboard-accessibility');
const { checkRoomComposition } = require('./test-ha-card-alignment');

const output = path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), 'room-cards');
const safeLights = ['light.marao_dashboard_test_light', 'light.marao_dashboard_test_room_light'];
const namedCard = (page, name) => page.locator('marao-card').filter({ has: page.locator('.title').filter({ hasText: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }) }).first();

async function visibleBounds(locator, selector) {
  return locator.evaluate((host, selector) => {
    const element = selector ? host.shadowRoot?.querySelector(selector) || host.querySelector(selector) : host;
    if (!element) throw new Error('Room review element is missing: ' + selector);
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) throw new Error('Room review element has no visible geometry: ' + element.localName);
    return rect.toJSON();
  }, selector);
}

async function setRoomOffline(card) {
  await card.evaluate(element => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'hass');
    Object.defineProperty(element, 'hass', { configurable: true, get: descriptor.get,
      set(value) { descriptor.set.call(this, { ...value, connected: false }); } });
    element.hass = element.hass;
  });
}

async function capture(page, card, filename, scenario, theme) {
  await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await card.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const aboveNavbar = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
      const bar = await visibleBounds(page.locator('marao-navbar-card'), 'nav');
      await card.evaluate((element, bottom) => {
        const delta = element.getBoundingClientRect().bottom - bottom + 8;
        if (delta <= 0) return;
        for (let node = element; node; node = node.assignedSlot || node.parentElement || node.getRootNode()?.host) {
          if (node.clientHeight > 0 && node.scrollHeight > node.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(node).overflowY)) {
            node.scrollBy({ top: delta, behavior: 'instant' }); return;
          }
        }
        document.scrollingElement.scrollBy({ top: delta, behavior: 'instant' });
      }, bar.y);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const bounds = await visibleBounds(card), currentBar = await visibleBounds(page.locator('marao-navbar-card'), 'nav');
      if (bounds.y + bounds.height <= currentBar.y - 7) break;
    }
  };
  await applyVisualPreferences(page, scenario, theme);
  assert.deepEqual(await emulationIssues(page, scenario, theme), [], filename + ': mobile profile was lost after scrolling');
  await checkRoomComposition(page);
  assert.deepEqual(await layoutIssues(page), [], 'Room layout after text scaling');
  await card.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await aboveNavbar();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const box = await visibleBounds(card), viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  if (box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height) {
    await page.screenshot({ path: path.join(output, filename + '.png'), clip: box, scale: 'css' });
  } else {
    for (const edge of ['start', 'end']) {
      await card.evaluate((element, block) => element.scrollIntoView({ block, behavior: 'instant' }), edge);
      if (edge === 'end') await aboveNavbar();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: path.join(output, filename + '-' + edge + '.png'), scale: 'css' });
    }
  }
  const button = card.locator('[data-room-lights-off]');
  if (await button.count()) {
    const bounds = await visibleBounds(card, '[data-room-lights-off]'), bar = await visibleBounds(page.locator('marao-navbar-card'), 'nav');
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= bar.y,
      'Room action cannot be scrolled above the navbar: ' + JSON.stringify({ name: await card.locator('.title').textContent(), bounds, bar }));
  }
}

async function actions(page, calls, run, scenario, theme) {
  await page.evaluate(async entities => document.querySelector('home-assistant').hass.callService('light', 'turn_on', { entity_id: entities }), safeLights);
  await page.waitForFunction(entities => entities.every(entity => document.querySelector('home-assistant').hass.states[entity].state === 'on'), safeLights);
  await page.evaluate(() => { window.__roomHaptics = []; window.addEventListener('haptic', event => window.__roomHaptics.push(event.detail)); });
  const room = namedCard(page, 'Room card'), button = room.locator('[data-room-lights-off]');
  const before = calls.length, route = new URL(page.url()).pathname;
  await button.tap();
  await page.waitForFunction(entities => entities.every(entity => document.querySelector('home-assistant').hass.states[entity].state === 'off'), safeLights);
  assert.deepEqual(calls.slice(before), [{ domain: 'light', service: 'turn_off', entities: safeLights }]);
  assert.equal(new URL(page.url()).pathname, route, 'Lights-off press navigated');
  assert.deepEqual(await page.evaluate(() => window.__roomHaptics), ['heavy']);
  for (const disconnected of [false, true]) {
    await room.evaluate((card, disconnected) => {
      const element = card.shadowRoot.querySelector('[data-room-lights-off]'), original = card._hass;
      card._hass = disconnected ? { ...original, connected: false } : { ...original, states: { ...original.states,
        'light.marao_dashboard_test_room_light': { ...original.states['light.marao_dashboard_test_room_light'], state: 'unavailable' } } };
      element.click();
      card._hass = original;
    }, disconnected);
  }
  assert.equal(calls.length, before + 1, 'Changed connection/target permitted dispatch');
  assert.deepEqual(await page.evaluate(() => window.__roomHaptics), ['heavy']);
  const offline = namedCard(page, 'Room · connection loss');
  await setRoomOffline(offline);
  assert.ok(await offline.locator('[data-room-lights-off]').isDisabled());
  assert.equal(await offline.locator('[data-card-action]').isDisabled(), false);
  await capture(page, offline, run + '-connection-loss', scenario, theme);
  assert.equal(await offline.evaluate(card => card.hass.connected), false, 'HA update replaced the simulated disconnected state');
  assert.match(await offline.locator('.problem').textContent(), /Disconnected/);
  await offline.scrollIntoViewIfNeeded();
  const art = await visibleBounds(offline, '.room-artwork');
  await page.touchscreen.tap(art.x + art.width / 2, art.y + art.height / 2);
  await page.waitForURL('**/marao-dashboard/rooms');
  assert.equal(calls.length, before + 1, 'Room navigation dispatched a service');
}

async function main() {
  const config = readConfig(); assertDisposableHaTarget(config);
  assert.equal(new URL(config.url).hostname, '192.168.0.28');
  const options = parseArgs();
  await prepare(config);
  fs.mkdirSync(output, { recursive: true });
  for (const { scenario, theme } of selectedRuns(options)) {
    const browser = await chromium.launch();
    try {
      const run = `${scenario.name}-${theme}`, errors = [], calls = [];
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      try {
        await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
        const page = await context.newPage(); await configurePageEmulation(context, page, scenario);
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (['warning', 'error'].includes(message.type())) errors.push(message.text()); });
        page.on('requestfailed', request => errors.push('Failed resource: ' + new URL(request.url()).pathname));
        page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`); });
        page.on('websocket', socket => socket.on('framesent', ({ payload }) => {
          let message; try { message = JSON.parse(String(payload)); } catch { return; }
          if (message.type !== 'call_service') return;
          const targets = message.target?.entity_id ?? message.service_data?.entity_id ?? [];
          calls.push({ domain: message.domain, service: message.service, entities: Array.isArray(targets) ? targets : [targets] });
        }));
        const names = {};
        for (const view of ['card-test', 'rooms']) {
          await page.goto(config.url + '/marao-dashboard/' + view);
          await page.locator('marao-card .room-bottom').first().waitFor();
          await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
          await assertCurrentFrontend(page); await applyVisualPreferences(page, scenario, theme);
          await page.waitForLoadState('networkidle');
          await checkRoomComposition(page);
          assert.deepEqual(await layoutIssues(page), [], view + ': layout defects');
          names[view] = await page.locator('marao-card').evaluateAll(cards => cards.filter(card => card._config?.template === 'hc_room_card').map(card => card._config.name));
          for (const [index, name] of names[view].entries()) await capture(page, namedCard(page, name), `${run}-${view}-${index}`, scenario, theme);
          await page.waitForLoadState('networkidle');
        }
        await page.goto(config.url + '/marao-dashboard/card-test');
        await page.locator('[data-room-lights-off]').first().waitFor();
        await applyVisualPreferences(page, scenario, theme);
        await actions(page, calls, run, scenario, theme); await page.waitForLoadState('networkidle');
        assert.deepEqual(errors, [], 'Browser diagnostics; inspect private receipt');
        fs.writeFileSync(path.join(output, run + '-receipt.json'), JSON.stringify({ run, names, errors, emulation: 'verified after scrolling before every capture', actions: 'one safe dispatch, strong haptic, current availability guards, decoration navigation' }, null, 2));
        console.log(run + ': room geometry, lighting actions and navigation passed.');
      } finally { await context.close(); }
    } finally { await browser.close(); }
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { capture, namedCard, setRoomOffline, visibleBounds };
