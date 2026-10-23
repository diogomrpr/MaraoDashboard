const { capture: captureScreenshot } = require('./verification-browser');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { readConfig, assertDisposableHaTarget, api, accessToken, setBrowserToken, assertCurrentFrontend } = require('../ha-test/client');
const { prepare } = require('../ha-test/prepare');
const { parseArgs, selectedRuns, contextOptionsForScenario, configurePageEmulation, applyVisualPreferences, layoutIssues, emulationIssues } = require('./test-ha-dashboard-accessibility');
const output = path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), 'security');

async function navigate(page, route) {
  await page.evaluate(route => {
    history.pushState({}, '', route);
    window.dispatchEvent(new Event('location-changed'));
  }, route);
}

async function touch(page, target, duration = 0, end) {
  await target.scrollIntoViewIfNeeded();
  await target.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  // A cancelled vertical slide can leave native momentum scrolling active.
  // Measure a settled target before starting the next independent gesture.
  await target.evaluate(element => new Promise((resolve, reject) => {
    const started = performance.now(); let previous, stableSince = started;
    const inspect = () => {
      if (!element.isConnected) return reject(new Error('Native security target was replaced before input'));
      const bounds = element.getBoundingClientRect(), position = [bounds.left,bounds.top,bounds.width,bounds.height];
      for (let node=element;node;node=node.parentElement||node.getRootNode()?.host) position.push(node.scrollTop||0);
      if (!previous || position.some((value,index)=>Math.abs(value-previous[index])>.5)) stableSince=performance.now();
      previous=position;
      if (performance.now()-stableSince>=160) return resolve();
      if (performance.now()-started>=5000) return reject(new Error('Native security target did not settle before input'));
      requestAnimationFrame(inspect);
    };
    requestAnimationFrame(inspect);
  }));
  const box = await target.boundingBox();
  assert.ok(box && box.width >= 48 && box.height >= 48, 'Security action must have a visible 48px target');
  const start = { x: box.x + (end ? 24 : box.width / 2), y: box.y + box.height / 2 };
  assert.equal(await target.evaluate((element, point) => {
    let hit = document.elementFromPoint(point.x, point.y);
    while (hit?.shadowRoot) {
      const next = hit.shadowRoot.elementFromPoint(point.x, point.y);
      if (!next || next === hit) break;
      hit = next;
    }
    return hit === element || element.contains(hit);
  }, start), true, 'Native touch must reach the visible security control');
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    if (end) {
      for (const fraction of [.1, .3, .6, 1]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove',
        touchPoints: [{ x: start.x + (end.x === 'full' ? box.width - 48 : end.x) * fraction, y: start.y + (end.y || 0) * fraction }] });
    }
    if (duration) await page.waitForTimeout(duration);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await session.detach(); }
}

async function main() {
  const config = readConfig(); assertDisposableHaTarget(config);
  assert.equal(new URL(config.url).hostname, '192.168.10.229');
  await prepare(config);
  await api(config, 'POST', '/api/services/button/press', { entity_id: 'button.marao_dashboard_test_opener' });
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  for (const { scenario, theme } of selectedRuns(parseArgs())) {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
      const page = await context.newPage();
      await require("./camera-request-ledger").managedCameraLedger(context, page, { output, scenario: scenario.name, theme }); await configurePageEmulation(context, page, scenario);
      const issues = [], calls = [];
      page.on('pageerror', error => issues.push(error.message));
      page.on('console', message => { if (['warning', 'error'].includes(message.type())) issues.push(message.text()); });
      page.on('response', response => { if (response.status() >= 400) issues.push('HTTP ' + response.status() + ': ' + new URL(response.url()).pathname); });
      page.on('websocket', socket => socket.on('framesent', ({ payload }) => {
        let message; try { message = JSON.parse(String(payload)); } catch { return; }
        if (message.type === 'call_service') calls.push({ domain: message.domain, service: message.service,
          target: message.target?.entity_id || message.service_data?.entity_id });
      }));
      await api(config, 'POST', '/api/services/input_select/select_option', { entity_id: 'input_select.marao_dashboard_test_alarm', option: 'disarmed' });
      await page.goto(config.url + '/marao-dashboard/security#page-security-card-1-popup');
      const controls = page.locator('marao-card').filter({ has: page.locator('[data-alarm-action]') }).first();
      await controls.locator('[data-alarm-action="alarm_arm_away"]').waitFor();
      await assertCurrentFrontend(page);
      await applyVisualPreferences(page, scenario, theme);
      assert.deepEqual(await emulationIssues(page, scenario, theme), []);
      assert.deepEqual(await layoutIssues(page, ['hc_security_card', 'hc_alarm_controls_card']), []);
      const code = controls.locator('[data-alarm-code]');
      await code.fill('1357');
      await touch(page, controls.locator('[data-alarm-action="alarm_arm_away"]'));
      await page.waitForFunction(() => document.querySelector('home-assistant').hass.states['alarm_control_panel.marao_dashboard_test_alarm'].state === 'armed_away');
      assert.equal(await code.inputValue(), '');
      const count = calls.length;
      await code.fill('1357');
      await touch(page, controls.locator('[data-alarm-action="alarm_disarm"]'), 120);
      assert.equal(calls.length, count, 'Early hold dispatched');
      await touch(page, controls.locator('[data-alarm-action="alarm_disarm"]'), 1350);
      await page.waitForFunction(() => document.querySelector('home-assistant').hass.states['alarm_control_panel.marao_dashboard_test_alarm'].state === 'disarmed');
      assert.equal(calls.length, count + 1, 'Completed hold must dispatch once');
      assert.equal(await code.inputValue(), '');
      await captureScreenshot(page, { path: path.join(output, scenario.name + '-' + theme + '-alarm.png'), scale: 'css' });
      await page.locator('.marao-popup-close').tap();
      assert.equal(await page.locator('[data-alarm-code]').count(), 0, 'Closed popup retained PIN input');

      for (const format of ['text', 'no_code']) {
        await navigate(page, '/marao-dashboard/card-test#page-card-test-alarm-' + format + '-popup');
        const sheet = page.locator('.marao-popup-sheet');
        await sheet.locator('[data-alarm-action="alarm_arm_night"]').waitFor();
        assert.equal(await sheet.locator('[data-alarm-code]').count(), 1, 'Retain the PIN slot to keep the card size stable');
        assert.equal(await sheet.locator('[data-alarm-code]').isVisible(), format === 'text');
        if (format === 'no_code') {
          assert.equal(await sheet.locator('[data-alarm-code]').isDisabled(), true);
          assert.equal(await sheet.locator('[data-alarm-code]').inputValue(), '');
        }
        if (format === 'text') assert.equal(await sheet.locator('[data-alarm-code]').getAttribute('inputmode'), 'text');
        await page.locator('.marao-popup-close').tap();
      }
      await navigate(page, '/marao-dashboard/card-test');
      for (const domain of ['button', 'switch', 'script']) {
        const target = domain + '.marao_dashboard_test_' + (domain === 'switch' ? 'switch' : 'opener');
        const card = page.locator('marao-card').filter({ has: page.locator('marao-slide-to-open') });
        const opener = card.filter({ hasText: 'Access opener · ' + domain }).first();
        await opener.waitFor(); await opener.scrollIntoViewIfNeeded();
        const track = opener.locator('.track');
        await track.evaluate(element => {
          element._securityTrace = [];
          for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) element.addEventListener(type, event => {
            const bounds = element.getBoundingClientRect();
            const point = event.changedTouches[0];
            element._securityTrace.push({ type, x: point.clientX - bounds.left, y: point.clientY - bounds.top,
              progress: element.getAttribute('aria-valuenow'), disabled: element.getAttribute('aria-disabled') });
          });
        });
        const before = calls.filter(call => call.target === target).length;
        await touch(page, track, 0, { x: 30 });
        await touch(page, track, 0, { x: 10, y: 80 });
        assert.equal(calls.filter(call => call.target === target).length, before, 'Cancelled slide dispatched');
        await touch(page, track, 0, { x: 'full' });
        const deadline = Date.now() + 5000;
        while (calls.filter(call => call.target === target).length === before && Date.now() < deadline) await page.waitForTimeout(25);
        await page.waitForTimeout(300);
        const dispatched = calls.filter(call => call.target === target).length;
        if (dispatched !== before + 1) {
          await captureScreenshot(page, { path: path.join(output, scenario.name + '-' + theme + '-' + domain + '-failure.png'), scale: 'css' });
          console.error(JSON.stringify(await track.evaluate(element => element._securityTrace)));
        }
        assert.equal(dispatched, before + 1, domain + ' completed opener must dispatch once');
      }
      await captureScreenshot(page, { path: path.join(output, scenario.name + '-' + theme + '-openers.png'), scale: 'css' });
      assert.deepEqual(issues, [], 'Security browser warnings/errors');
      console.log(scenario.name + ' ' + theme + ': safe alarm and opener interactions passed');
      await context.close();
    } catch (error) {
      const page = browser.contexts().at(-1)?.pages().at(-1);
      if (page && !page.isClosed()) await captureScreenshot(page, { path: path.join(output, 'security-failure.png'), scale: 'css' });
      throw error;
    } finally { await browser.close(); }
  }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
