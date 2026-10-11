const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { readConfig, accessToken, setBrowserToken, assertCurrentFrontend, connect } = require('../ha-test/client');
const { prepare } = require('../ha-test/prepare');
const { manifest } = require('../ha-test/cases');
const { selectedRuns, parseArgs, contextOptionsForScenario, configurePageEmulation, applyVisualPreferences, layoutIssues } = require('./test-ha-dashboard-accessibility');

const output = path.join(__dirname, '.artifacts/energy-format');
const unitEntity = 'sensor.marao_dashboard_test_energy_format_missing_live';
function reading(page, name) {
  return page.locator('marao-card,marao-energy-period-card').filter({
    has: page.locator('.title,h2').filter({ hasText: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }),
  }).first();
}
async function waitIdle(card) {
  await card.page().waitForFunction(card => !card._loading && !card._graphRequests?.size, await card.elementHandle());
}
async function capture(page, card, filename) {
  await page.evaluate(() => document.fonts.ready);
  const inSheet = await card.evaluate(element => Boolean(element.closest('.marao-popup-sheet')));
  await card.evaluate(element => {
    const sheet = element.closest('.marao-popup-sheet');
    if (sheet) sheet.scrollTop = 0;
    else element.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const box = await card.boundingBox();
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  if (!inSheet && box.y >= 0 && box.x >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height) {
    await page.screenshot({ path: path.join(output, filename + '.png'), clip: box, scale: 'css' });
  } else {
    await page.screenshot({ path: path.join(output, filename + '.png'), scale: 'css' });
    if (inSheet && await card.evaluate(element => {
      const sheet = element.closest('.marao-popup-sheet');
      return sheet.scrollHeight > sheet.clientHeight + 1;
    })) {
      const bounds = card.locator('.scale span');
      if (await bounds.count()) {
        for (const [bound, suffix] of [[bounds.first(), 'upper-bound'], [bounds.last(), 'bottom']]) {
          await bound.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.equal(await bound.evaluate(element => {
            const rect = element.getBoundingClientRect(), sheet = (element.getRootNode().host || element).closest('.marao-popup-sheet');
            const heading = sheet.querySelector('.marao-popup-head').getBoundingClientRect();
            return sheet.scrollLeft === 0 && heading.left >= sheet.getBoundingClientRect().left - 1
              && rect.top >= heading.bottom - 1 && rect.bottom <= sheet.getBoundingClientRect().bottom + 1;
          }), true, 'The graph bound must be readable below the sticky heading');
          await page.screenshot({ path: path.join(output, filename + '-' + suffix + '.png'), scale: 'css' });
        }
      } else {
        await card.evaluate(element => { const sheet = element.closest('.marao-popup-sheet'); sheet.scrollTop = sheet.scrollHeight; });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.screenshot({ path: path.join(output, filename + '-bottom.png'), scale: 'css' });
      }
    }
    if (!inSheet && box.height > viewport.height) {
      await card.evaluate(element => element.scrollIntoView({ block: 'end', behavior: 'instant' }));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: path.join(output, filename + '-bottom.png'), scale: 'css' });
    }
  }
}
async function inspectGallery(page, run, requests) {
  const byLabel = label => reading(page, 'Energy format · ' + label);
  const text = label => byLabel(label).evaluate(card => card.shadowRoot.querySelector(card._config.template === 'hc_switch_card' ? '.climate' : '.state,.value').textContent.trim());
  for (const example of manifest.energyFormattingCases) {
    const card = reading(page, example.name);
    await card.scrollIntoViewIfNeeded();
    await waitIdle(card);
    await capture(page, card, run + '-' + example.name.split(' · ')[1].replaceAll(' ', '-'));
  }
  assert.match(await text('converted zero decimals'), /^1 kWh$/);
  assert.match(await text('converted two decimals'), /^1[.,]23 kWh$/);
  assert.match(await text('signed export'), /^-1[.,]234500 kWh$/);
  assert.match(await text('real zero'), /^0[.,]00 kW$/);
  assert.match(await text('cost precision'), /^1[.,]23 EUR$/);
  assert.match(await text('secondary conversion'), /^1[.,]50 kW$/);
  assert.match(await text('legacy label only'), /^1500(?:\.0)? MW$/);
  assert.deepEqual(await byLabel('source six decimals').locator('.state').evaluate(element => {
    const range = document.createRange();
    range.setStart(element.firstChild, 0);
    range.setEnd(element.firstChild, element.textContent.lastIndexOf(' '));
    const lines = [...range.getClientRects()];
    const value = element.getBoundingClientRect();
    return lines.length !== 1 || lines.some(box => box.left < value.left - 1 || box.right > value.right + 1) ? ['Six-decimal number split or clipped'] : [];
  }), []);
  assert.deepEqual(await page.locator('marao-card').evaluateAll(cards => cards.flatMap(card => {
    const values = card.shadowRoot?.querySelector('.formatted-values')?.getBoundingClientRect();
    const icon = card.shadowRoot?.querySelector('.body > .icon')?.getBoundingClientRect();
    return values && icon && Math.min(values.right, icon.right) - Math.max(values.left, icon.left) > 1
      && Math.min(values.bottom, icon.bottom) - Math.max(values.top, icon.top) > 1 ? ['Formatted reading overlaps its icon'] : [];
  })), []);
  for (const label of ['missing history unit', 'incompatible history unit']) {
    const card = byLabel(label);
    assert.equal(await card.locator('ha-card').getAttribute('data-problem'), 'error');
    assert.equal(await card.locator('polyline').count(), 0);
    assert.match(await card.locator('.problem').innerText(), /source unit|unidade de origem/);
  }
  assert.equal(await byLabel('unavailable').locator('ha-card').getAttribute('data-problem'), 'neutral');
  const graph = byLabel('converted two decimals');
  await page.waitForLoadState('networkidle');
  const graphRequestCount = requests.length;
  const cached = await graph.evaluate(card => {
    const entity = card._config.entity;
    return { records: JSON.stringify(card._graphHistory.get(entity)), state: card.hass.states[entity].state };
  });
  await graph.evaluate(card => card.setConfig({ ...card._config, variables: { ...card._config.variables, display_precision: 6 } }));
  assert.match(await text('converted two decimals'), /^1[.,]234500 kWh$/);
  assert.match(await text('converted zero decimals'), /^1 kWh$/);
  assert.deepEqual(await graph.evaluate(card => ({ records: JSON.stringify(card._graphHistory.get(card._config.entity)), state: card.hass.states[card._config.entity].state })), cached);
  await page.waitForLoadState('networkidle');
  assert.equal(requests.length, graphRequestCount, 'Formatting refetched graph history');
  await graph.evaluate(card => card.setConfig({ ...card._config, variables: { ...card._config.variables, display_precision: 2 } }));
  const controller = reading(page, 'Simulate source unit loss');
  await controller.locator('[data-card-action]').click();
  try {
    await byLabel('missing source unit').locator('ha-card[data-problem="error"]').waitFor();
    assert.equal(await text('missing source unit'), '42');
    await capture(page, byLabel('missing source unit'), run + '-live-unit-error');
  } finally {
    await page.evaluate(async entity => {
      const hass = document.querySelector('home-assistant').hass;
      if (!hass.states[entity].attributes.unit_of_measurement) await hass.callService('marao_test_camera', 'toggle_energy_unit', {});
    }, unitEntity);
  }
  await page.waitForFunction(entity => document.querySelector('home-assistant').hass.states[entity].attributes.unit_of_measurement === 'Wh', unitEntity);
  assert.match(await text('missing source unit'), /^0[.,]04 kWh$/);
  await capture(page, byLabel('missing source unit'), run + '-live-unit-recovered');
  for (const example of manifest.energyFormattingCases.filter(card => card.popup_hash)) {
    await reading(page, example.name).locator('button.surface').click();
    const sheet = page.locator('.marao-popup-sheet');
    await sheet.locator('.period-nav').waitFor();
    await sheet.evaluate(async element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    const period = sheet.locator('marao-energy-period-card');
    await waitIdle(period);
    assert.equal(await period.locator('[data-period="next"]').isDisabled(), true);
    await capture(page, period, run + '-' + example.name.split(' · ')[1].replaceAll(' ', '-') + '-sheet');
    const before = await period.evaluate(card => ({ key: card._loadedKey, history: JSON.stringify(card._history) }));
    await page.waitForLoadState('networkidle');
    const periodRequestCount = requests.length;
    await period.evaluate(card => card.setConfig({ ...card._config, display_precision: 6 }));
    assert.deepEqual(await period.evaluate(card => ({ key: card._loadedKey, history: JSON.stringify(card._history) })), before);
    await page.waitForLoadState('networkidle');
    assert.equal(requests.length, periodRequestCount, 'Formatting refetched period history');
    await capture(page, period, run + '-' + example.name.split(' · ')[1].replaceAll(' ', '-') + '-sheet-six-decimals');
    await period.locator('[data-period="previous"]').click();
    await waitIdle(period);
    assert.equal(await period.locator('[data-period="next"]').isDisabled(), false);
    await period.locator('[data-period="next"]').click();
    await waitIdle(period);
    assert.equal(await period.locator('[data-period="next"]').isDisabled(), true);
    assert.deepEqual(await layoutIssues(page), [], example.name + ' sheet layout');
    await page.locator('.marao-popup-close').click();
    await sheet.waitFor({ state: 'detached' });
  }
  assert.deepEqual(await layoutIssues(page), [], 'Energy gallery layout');
}

async function main() {
  const config = readConfig();
  assert.equal(new URL(config.url).hostname, '192.168.0.28');
  assert.equal(config.sshHost, '192.168.0.28');
  await prepare(config);
  fs.mkdirSync(output, { recursive: true });
  const ws = await connect(config);
  const before = await ws.call({ type: 'marao_dashboard/config/get' });
  const browser = await chromium.launch();
  try {
    for (const { scenario, theme } of selectedRuns(parseArgs())) {
      const run = scenario.name + '-' + theme;
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
      const page = await context.newPage();
      await configurePageEmulation(context, page, scenario);
      const errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['warning', 'error'].includes(message.type())) errors.push(message.text()); });
      page.on('requestfailed', request => errors.push('Failed resource: ' + new URL(request.url()).pathname));
      page.on('response', response => { if (response.status() >= 400) errors.push('HTTP ' + response.status() + ': ' + new URL(response.url()).pathname); });
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/history/period/')) requests.push(url);
      });
      try {
        await page.goto(config.url + '/marao-dashboard/card-test');
        await page.locator('marao-navbar-card nav').waitFor();
        await assertCurrentFrontend(page);
        await applyVisualPreferences(page, scenario, theme);
        await page.waitForLoadState('networkidle');
        const warmedRequests = requests.length;
        await inspectGallery(page, run, requests);
        await page.waitForLoadState('networkidle');
        const energyRequests = requests.filter(url => url.searchParams.get('filter_entity_id')?.startsWith('sensor.marao_dashboard_test_energy_format_'));
        fs.writeFileSync(path.join(output, run + '-requests.json'), JSON.stringify(energyRequests.map(url => url.pathname + url.search), null, 2));
        const graphCount = manifest.energyFormattingCases.filter(card => ['hc_graph_card', 'hc_toggle_graph_card'].includes(card.template)).length;
        const warmEnergy = requests.slice(0, warmedRequests).filter(url => url.searchParams.get('filter_entity_id')?.startsWith('sensor.marao_dashboard_test_energy_format_'));
        // HA rebuilds the view once when the requested theme is applied.
        assert.ok(warmEnergy.length > 0 && warmEnergy.length <= graphCount * 2, 'Repeated initial energy history requests');
        assert.equal(requests.slice(warmedRequests).filter(url => url.searchParams.get('filter_entity_id')?.startsWith('sensor.marao_dashboard_test_energy_format_')).length, 9, 'Expected one request per open/previous/current period for three sheets');
        assert.ok(energyRequests.every(url => !url.searchParams.has('no_attributes') && !url.searchParams.has('minimal_response')), 'History unit attributes suppressed');
        fs.writeFileSync(path.join(output, run + '-receipt.json'), JSON.stringify({ run, errors, energyRequests: energyRequests.length, examples: manifest.energyFormattingCases.length }, null, 2));
        assert.deepEqual(errors, [], 'Unexpected browser diagnostics; inspect private receipt');
        assert.equal((await ws.call({ type: 'marao_dashboard/config/get' })).config, before.config, 'Read-only inspection changed saved source');
        console.log(run + ': energy readings, recovery, raw-cache reuse and period navigation passed.');
      } finally { await context.close(); }
    }
  } finally { await browser.close(); ws.close(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { capture };
