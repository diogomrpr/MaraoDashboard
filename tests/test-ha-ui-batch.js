const { capture: captureScreenshot } = require('./verification-browser');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { readConfig, accessToken, setBrowserToken, assertCurrentFrontend, api } = require('../ha-test/client');
const { applyVisualPreferences, readySubtree, layoutIssues, selectedRuns, parseArgs, contextOptionsForScenario, configurePageEmulation } = require('./test-ha-dashboard-accessibility');
const { namedCard } = require('./test-ha-room-cards');

async function batteryChecks(page, config, output, scenario, theme, geometryOnly = false) {
  if (geometryOnly) {
    assert.deepEqual(await layoutIssues(page, ["hc_entity_group_card", "hc_battery_card"]), []);
    const card = namedCard(page, "Entity Group · battery all"); await card.scrollIntoViewIfNeeded();
    await captureScreenshot(card, { path: path.join(output, `battery-${scenario.name}-${theme}.png`), scale: "css" }); return;
  }
  const helper = 'input_number.marao_dashboard_test_battery';
  const initial = await api(config, 'GET', '/api/states/' + helper);
  const group = namedCard(page, 'Entity Group · battery live');
  await group.waitFor({ state: 'attached' });
  const configBefore = await group.evaluate(e => JSON.stringify(e._config));
  const color = card => card.evaluate(e => { const c = e.shadowRoot.querySelector('ha-card'), s = getComputedStyle(c); return [s.backgroundColor, s.color]; });
  const reference = await group.evaluateHandle(e => {
    const card = document.createElement('marao-card'); card.setConfig({ template: 'hc_battery_card', entity: 'sensor.marao_dashboard_test_battery', name: 'Palette reference' }); card.hass = e._hass; e.after(card); return card;
  });
  const normal = page.locator('marao-card').filter({ has: page.locator('.title').filter({ hasText: /^Palette reference$/ }) });
  const set = async value => {
    await api(config, 'POST', '/api/services/input_number/set_value', { entity_id: helper, value });
    await page.waitForFunction(({ e, value }) => Number(e._hass.states['sensor.marao_dashboard_test_battery'].state) === value, { e: await group.elementHandle(), value });
    await reference.evaluate((e, source) => { e.hass = source._hass; }, await group.elementHandle());
  };
  try {
    for (const value of [80, 20, 19, 0, 95]) {
      await set(value); assert.deepEqual(await color(group), await color(normal), 'Group threshold palette differs at ' + value);
    }
    const partial = namedCard(page, 'Entity Group · battery all');
    await group.evaluate((e, partial) => {
      const copy = structuredClone(e._config); copy.variables.summary_entities.push('sensor.marao_dashboard_test_case_battery_unavailable'); e.setConfig(copy);
    }, await partial.elementHandle());
    await set(10); assert.deepEqual(await color(group), await color(normal), 'Critical partial availability lost the red palette');
    assert.equal(await group.locator('.problem').count(), 0, 'Partial group availability must not add an error label');
    assert.equal(await group.locator('[data-card-action]').isDisabled(), false);
    await group.locator('[data-card-action]').tap();
    await page.locator('.marao-popup-overlay').waitFor({ state: 'visible' });
    await page.locator('.marao-popup-close').tap(); await page.locator('.marao-popup-overlay').waitFor({ state: 'detached' });
    await set(50); assert.deepEqual(await color(group), await color(normal), 'Partial availability must retain the usable battery palette');
    assert.equal(await group.evaluate(e => {
      e.hass = { ...e._hass, connected: false };
      return e.shadowRoot.querySelector('[data-card-action]').disabled;
    }), true);
    await group.evaluate(e => { e.hass = document.querySelector('home-assistant').hass; });
    await set(10);
    assert.deepEqual(await layoutIssues(page, ['hc_entity_group_card', 'hc_battery_card']), []);
    if (['iphone-normal', 'narrow-320', 'iphone-bold-text-200'].includes(scenario.name)) { await group.scrollIntoViewIfNeeded(); await captureScreenshot(group, { path: path.join(output, `battery-${scenario.name}-${theme}.png`), scale: 'css' }); }
  } finally {
    await group.evaluate((e, config) => e.setConfig(JSON.parse(config)), configBefore);
    await reference.evaluate(e => e.remove());
    await api(config, 'POST', '/api/services/input_number/set_value', { entity_id: helper, value: Number(initial.state) });
    await page.waitForFunction(({ e, state }) => e._hass.states['sensor.marao_dashboard_test_battery'].state === state, { e: await group.elementHandle(), state: initial.state });
  }
}

async function accessChecks(page, output, scenario, theme) {
  const host = page.locator('marao-slide-to-open').first(); await host.waitFor({ state: 'attached' });
  const old = await host.evaluate(e => ({ style: e.getAttribute('style'), config: e._config }));
  try {
  for (const language of ['en', 'pt']) for (const width of [241, 239, 144]) {
    await host.evaluate((e, { language, width }) => { e.style.cssText = `display:block;width:${width}px;max-width:100%`; e.hass = { ...document.querySelector('home-assistant').hass, language }; }, { language, width });
    await host.scrollIntoViewIfNeeded();
    await readySubtree(page, host, scenario, theme);
    await host.locator('.track').waitFor({ state: 'visible' });
    assert.deepEqual((await layoutIssues(page, ['hc_access_slide_action_card'], await host.elementHandle())).filter(issue => /access (label|slide)/.test(issue)), [], `${language}/${width}`);
    const size = await host.locator('.track').boundingBox(); assert.ok(size.width >= 48 && size.height >= 48);
    if (width === 239 && language === 'en' && scenario.name === 'iphone-normal') {
      await host.evaluate(e => { const style = document.createElement('style'); style.dataset.regression = ''; style.textContent = '.label{padding:8px 8px 72px!important}.thumb{top:auto!important;bottom:4px!important}'; e.shadowRoot.append(style); });
      assert.ok((await layoutIssues(page, ['hc_access_slide_action_card'], await host.elementHandle())).some(issue => /access label/.test(issue)), 'The former stacked layout must fail');
      await host.evaluate(e => e.shadowRoot.querySelector('[data-regression]').remove());
    }
  }
  assert.equal(await host.evaluate(e => {
    e.hass = { ...document.querySelector('home-assistant').hass, connected: false };
    return e.shadowRoot.querySelector('.track').getAttribute('aria-disabled');
  }), 'true');
  assert.deepEqual((await layoutIssues(page, [], await host.elementHandle())).filter(issue => /access (label|slide)/.test(issue)), []);
  if (['iphone-normal', 'narrow-320', 'iphone-bold-text-200'].includes(scenario.name)) await captureScreenshot(host, { path: path.join(output, `access-${scenario.name}-${theme}.png`), scale: 'css' });
  } finally {
  await host.evaluate((e, old) => { if (old.style == null) e.removeAttribute('style'); else e.setAttribute('style', old.style); e.hass = document.querySelector('home-assistant').hass; }, old);
  }
}
async function main() {
  const config = readConfig(); assert.equal(new URL(config.url).hostname, '192.168.10.229');
  await require('../ha-test/prepare').prepare(config);
  const output = require('./verification-browser').artifactDirectory('ui-batch');
  for (const { scenario, theme } of selectedRuns(parseArgs())) {
    const browser = await chromium.launch(); let page, failure;
    try {
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
      page = await context.newPage();
      const cameraLedger = await require('./camera-request-ledger').managedCameraLedger(context, page, { output, scenario: scenario.name, theme });
      await configurePageEmulation(context, page, scenario);
      const errors = [], calls = [];
      page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.push(m.text()); });
      page.on('response', r => { if (require('./camera-request-ledger').isManualCameraTransport(r.url())) return; if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + new URL(r.url()).pathname); });
      page.on('websocket', socket => socket.on('framesent', ({ payload }) => { const m = JSON.parse(payload); if (m.type === 'call_service') calls.push([m.domain, m.service]); }));
      await page.goto(config.url + '/marao-dashboard/card-test'); await page.locator('marao-card .body').first().waitFor({ state: 'attached' });
      await assertCurrentFrontend(page); await applyVisualPreferences(page, scenario, theme);
      const outcomes = [];
      const runCase = async (family, execute) => {
        const started = Date.now();
        try { await execute(); outcomes.push({ family, profile: scenario.name, theme, passed: true, duration_ms: Date.now() - started }); }
        catch (error) { outcomes.push({ family, profile: scenario.name, theme, passed: false, error: error.message }); throw error; }
        finally { require('./verification-reuse').atomicReport(path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || output, 'logical-outcomes.json'), outcomes); }
      };
      if (process.argv.includes('--battery')) await runCase('battery-groups', () => batteryChecks(page, config, output, scenario, theme, process.argv.includes('--geometry-only')));
      if (process.argv.includes('--slider-headers')) await runCase('slider-headers', () => require('./test-ha-card-alignment').sliderHeaderChecks(page, output, scenario, theme));
      if (process.argv.includes('--control-grid')) await runCase('control-grid', () => require('./control-grid-checks').controlGridChecks(page, output, scenario, theme, !process.argv.includes('--geometry-only')));
      if (process.argv.includes('--access')) await runCase('access-label', () => accessChecks(page, output, scenario, theme));
      assert.deepEqual(calls, [], 'Read-only group/layout checks dispatched a member action');
      const routes = new Set();
      if (process.argv.includes('--slider-headers') && scenario.name === 'iphone-normal') { routes.add('living-room'); routes.add('native-example'); }
      if (process.argv.includes('--control-grid') && ['iphone-normal', 'iphone-bold-text-200'].includes(scenario.name)) { routes.add('studio'); routes.add('native-example'); }
      if (process.argv.includes('--control-grid') && ['narrow-320', 'android-normal', 'android-bold', 'android-384', 'android-384-bold'].includes(scenario.name)) routes.add('rooms');
      if (routes.size) {
        for (const route of routes) {
          await page.goto(config.url + '/marao-dashboard/' + route);
          await page.locator('marao-card .body').first().waitFor({ state: 'attached' });
          if (route === 'native-example') await page.locator('marao-native-light-card marao-card .body').first().waitFor({ state: 'attached' });
          await applyVisualPreferences(page, scenario, theme);
          assert.deepEqual(await layoutIssues(page, ['hc_light_card', 'hc_fan_card', 'hc_cover_card', 'hc_access_card', 'hc_access_slide_action_card']), []);
          if (route === 'rooms') await runCase('control-grid/rooms', () => require('./control-grid-checks').phoneRoomsChecks(page, output, scenario, theme));
          if (route === 'native-example') {
            if (process.argv.includes('--control-grid')) await runCase('control-grid/native', () => require('./control-grid-checks').nativeControlGridChecks(page, scenario, theme));
            await page.locator('marao-native-light-card').first().evaluate(e => { e.preview = true; });
            assert.deepEqual(await layoutIssues(page, ['hc_light_card']), []);
          }
        }
      }
      await readySubtree(page, page.locator('hui-root'), scenario, theme);
      await cameraLedger.assert(); assert.deepEqual(errors, []);
      fs.writeFileSync(path.join(output, `${scenario.name}-${theme}.json`), JSON.stringify({ passed: true, scenario: scenario.name, theme }), { mode: 0o600 });
      console.log(`Battery/access focused checks: ${scenario.name}/${theme} passed.`);
    } catch (error) { failure = error; if (page) await captureScreenshot(page, { path: path.join(output, `${scenario.name}-${theme}-failure.png`), scale: 'css' }); throw error; }
    finally { try { await browser.close(); } catch (cleanup) { if (failure) throw new AggregateError([failure, cleanup], 'UI check and cleanup failed'); throw cleanup; } }
  }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });

module.exports = { main, accessChecks, batteryChecks };
