const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { readConfig, accessToken, setBrowserToken, assertCurrentFrontend, api } = require('../ha-test/client');
const { applyVisualPreferences, layoutIssues, selectedRuns, parseArgs, contextOptionsForScenario, configurePageEmulation } = require('./test-ha-dashboard-accessibility');
const { namedCard } = require('./test-ha-room-cards');

async function batteryChecks(page, config, output, scenario, theme) {
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
    assert.match(await group.locator('.problem').textContent(), /Unavailable|Indisponível/);
    assert.equal(await group.locator('[data-card-action]').isDisabled(), false);
    await group.locator('[data-card-action]').tap();
    await page.locator('.marao-popup-overlay').waitFor({ state: 'visible' });
    await page.locator('.marao-popup-close').tap(); await page.locator('.marao-popup-overlay').waitFor({ state: 'detached' });
    await set(50); assert.notDeepEqual(await color(group), await color(normal), 'Noncritical partial availability must retain the warning palette');
    await group.evaluate(e => { e.hass = { ...e._hass, connected: false }; });
    assert.equal(await group.locator('[data-card-action]').isDisabled(), true);
    await group.evaluate(e => { e.hass = document.querySelector('home-assistant').hass; });
    await set(10);
    assert.deepEqual(await layoutIssues(page, ['hc_entity_group_card', 'hc_battery_card']), []);
    if (['iphone-normal', 'narrow-320', 'iphone-bold-text-200'].includes(scenario.name)) { await group.scrollIntoViewIfNeeded(); await group.screenshot({ path: path.join(output, `battery-${scenario.name}-${theme}.png`), scale: 'css' }); }
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
  for (const language of ['en', 'pt']) for (const width of [241, 239, 144]) {
    await host.evaluate((e, { language, width }) => { e.style.cssText = `display:block;width:${width}px;max-width:100%`; e.hass = { ...document.querySelector('home-assistant').hass, language }; }, { language, width });
    await host.scrollIntoViewIfNeeded();
    assert.deepEqual((await layoutIssues(page, ['hc_access_slide_action_card'])).filter(issue => /access (label|slide)/.test(issue)), [], `${language}/${width}`);
    const size = await host.locator('.track').boundingBox(); assert.ok(size.width >= 48 && size.height >= 48);
    if (width === 239 && language === 'en' && scenario.name === 'iphone-normal') {
      await host.evaluate(e => { const style = document.createElement('style'); style.dataset.regression = ''; style.textContent = '.label{padding:8px 8px 72px!important}.thumb{top:auto!important;bottom:4px!important}'; e.shadowRoot.append(style); });
      assert.ok((await layoutIssues(page, ['hc_access_slide_action_card'])).some(issue => /access label/.test(issue)), 'The former stacked layout must fail');
      await host.evaluate(e => e.shadowRoot.querySelector('[data-regression]').remove());
    }
  }
  await host.evaluate(e => { e.hass = { ...document.querySelector('home-assistant').hass, connected: false }; });
  assert.equal(await host.locator('.track').getAttribute('aria-disabled'), 'true');
  assert.deepEqual((await layoutIssues(page)).filter(issue => /access (label|slide)/.test(issue)), []);
  if (['iphone-normal', 'narrow-320', 'iphone-bold-text-200'].includes(scenario.name)) await host.screenshot({ path: path.join(output, `access-${scenario.name}-${theme}.png`), scale: 'css' });
  await host.evaluate((e, old) => { if (old.style == null) e.removeAttribute('style'); else e.setAttribute('style', old.style); e.hass = document.querySelector('home-assistant').hass; }, old);
}
async function main() {
  const config = readConfig(); assert.equal(new URL(config.url).hostname, '192.168.0.28');
  await require('../ha-test/prepare').prepare(config);
  const output = require('./verification-browser').artifactDirectory('ui-batch');
  for (const { scenario, theme } of selectedRuns(parseArgs())) {
    const browser = await chromium.launch(); let page;
    try {
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
      page = await context.newPage(); await configurePageEmulation(context, page, scenario);
      const errors = [], calls = [];
      page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.push(m.text()); });
      page.on('requestfailed', r => errors.push('Failed ' + new URL(r.url()).pathname)); page.on('response', r => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + new URL(r.url()).pathname); });
      page.on('websocket', socket => socket.on('framesent', ({ payload }) => { const m = JSON.parse(payload); if (m.type === 'call_service') calls.push([m.domain, m.service]); }));
      await page.goto(config.url + '/marao-dashboard/card-test'); await page.locator('marao-card .body').first().waitFor({ state: 'attached' });
      await assertCurrentFrontend(page); await applyVisualPreferences(page, scenario, theme);
      if (process.argv.includes('--battery')) await batteryChecks(page, config, output, scenario, theme);
      if (process.argv.includes('--access')) await accessChecks(page, output, scenario, theme);
      assert.deepEqual(calls, [], 'Read-only group/layout checks dispatched a member action');
      await page.waitForLoadState('networkidle'); assert.deepEqual(errors, []);
      fs.writeFileSync(path.join(output, `${scenario.name}-${theme}.json`), JSON.stringify({ passed: true, scenario: scenario.name, theme }), { mode: 0o600 });
      console.log(`Battery/access focused checks: ${scenario.name}/${theme} passed.`);
    } catch (error) { if (page) await page.screenshot({ path: path.join(output, `${scenario.name}-${theme}-failure.png`), scale: 'css' }); throw error; }
    finally { await browser.close(); }
  }
}
if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
