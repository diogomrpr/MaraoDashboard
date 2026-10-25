const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { api, readConfig, assertDisposableHaTarget, accessToken, setBrowserToken, connect, assertCurrentFrontend } = require('../ha-test/client');
const { prepare } = require('../ha-test/prepare');
const { scenarios, themes, contextOptionsForScenario, configurePageEmulation, applyVisualPreferences } = require('./test-ha-dashboard-accessibility');
const { captureClimateFeedback } = require('./test-ha-dashboard-e2e');

const templates = new Set(['md_climate_card', 'md_number_card', 'md_wallbox_current_card']);
function hasNumericCard(value) {
  if (!value || typeof value !== 'object') return false;
  if (templates.has(value.template)) return true;
  return Object.values(value).some(hasNumericCard);
}

async function main() {
  const config = readConfig();
  assertDisposableHaTarget(config, { requireSsh: true });
  assert.equal(new URL(config.url).hostname, '192.168.0.28');
  assert.equal(config.sshHost, '192.168.0.28');
  const requested = process.argv.indexOf('--scenario');
  const profiles = requested < 0 ? scenarios : scenarios.filter(s => s.name === process.argv[requested + 1]);
  assert.ok(profiles.length, 'Unknown mobile profile');
  await prepare(config);
  const client = await connect(config);
  try {
    const saved = await client.call({ type: 'marao_dashboard/config/get' });
    const dashboard = await client.call({ type: 'lovelace/config', url_path: 'marao-dashboard', force: true });
    const views = dashboard.views.filter(hasNumericCard);
    assert.ok(views.some(view => view.path === 'card-test-all'), 'Missing numeric Cases');
    for (const scenario of profiles) for (const theme of themes) {
      const run = `${scenario.name}-${theme}`, output = path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), 'climate-layout', run);
      fs.rmSync(output, { recursive: true, force: true });
      fs.mkdirSync(output, { recursive: true });
      await api(config, 'POST', '/api/services/marao_test_camera/reset', {});
      const browser = await chromium.launch();
      try {
        const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
        await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
        const page = await context.newPage();
      await require("./camera-request-ledger").managedCameraLedger(context, page, { output, scenario: scenario.name, theme });
        await configurePageEmulation(context, page, scenario);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (require('./camera-request-ledger').isManualCameraConsoleMessage(message)) return; if (['warning', 'error'].includes(message.type())) errors.push(message.text()); });
        page.on('response', response => { if (require('./camera-request-ledger').isManualCameraTransport(response.url())) return; if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`); });
        const captures = [];
        for (const view of views) {
          const route = '/marao-dashboard/' + view.path;
          if (page.url() === 'about:blank') await page.goto(config.url + route);
          else await page.evaluate(value => {
            history.pushState(null, '', value);
            window.dispatchEvent(new CustomEvent('location-changed'));
          }, route);
          await page.waitForFunction(({ root, expected }) => root.config?.views?.[root._curView]?.path === expected, {
            root: await page.locator('hui-root').elementHandle(), expected: view.path,
          });
          await page.locator('marao-navbar-card:not([data-marao-navbar-placeholder]) nav').waitFor({ state: 'visible' });
          await assertCurrentFrontend(page);
          await applyVisualPreferences(page, scenario, theme);
          await page.evaluate(() => document.fonts.ready);
          const cards = page.locator('marao-card');
          const selected = await cards.evaluateAll((elements, allowed) => elements.flatMap((card, index) => allowed.includes(card._config?.template) ? [{ index, name: card._config.name, template: card._config.template }] : []), [...templates]);
          for (const card of selected) {
            const name = `${view.path}-${card.index}`;
            await captureClimateFeedback(page, name, cards.nth(card.index), output, { scenario, theme });
            captures.push({ name, title: card.name, template: card.template });
          }
          const popups = await page.locator('marao-popup-card').evaluateAll(elements => elements.flatMap((card, index) => {
            const numeric = value => !value || typeof value !== 'object' ? 0 : ['md_climate_card', 'md_number_card', 'md_wallbox_current_card'].includes(value.template) ? 1 : Object.values(value).reduce((count, child) => count + numeric(child), 0);
            const count = numeric(card._config?.cards);
            return count ? [{ hash: card._config.hash, count, index }] : [];
          }));
          for (const [index, { hash, count: expected, index: popupIndex }] of popups.entries()) {
            assert.ok(typeof hash === 'string' && hash.startsWith('#'), 'Invalid numeric popup');
            await page.evaluate(value => { location.hash = value; }, hash);
            const sheet = page.locator('.marao-popup-sheet');
            await sheet.waitFor({ state: 'visible' });
            await page.waitForFunction(({ popup, count }) => {
              const sheet = popup._overlay?.querySelector('.marao-popup-sheet');
              const cards = []; const visit = root => {
                for (const element of root?.children || []) {
                  if (element.localName === 'marao-card' && ['md_climate_card', 'md_number_card', 'md_wallbox_current_card'].includes(element._config?.template)) cards.push(element);
                  visit(element.shadowRoot); visit(element);
                }
              };
              visit(sheet);
              const group = popup._config.entity_group;
              if (!group) return cards.length >= count;
              if (!popup._groupHelpers) return false;
              const expected = (popup._config.cards || []).filter(card =>
                ['md_climate_card', 'md_number_card', 'md_wallbox_current_card'].includes(card.template)
                && (group.popup_filter !== 'active' || !['off', 'unknown', 'unavailable'].includes(popup._hass?.states[card.entity]?.state || 'unknown'))
              ).map(card => card.entity);
              return cards.length === expected.length && cards.every((card, index) => card._config.entity === expected[index])
                && (expected.length > 0 || Boolean(sheet.querySelector('[role="status"]')?.textContent.trim()));
            }, { popup: await page.locator('marao-popup-card').nth(popupIndex).elementHandle(), count: expected });
            const children = sheet.locator('marao-card');
            const count = await children.count();
            for (let child = 0; child < count; child++) {
              const target = children.nth(child);
              if (!templates.has(await target.evaluate(card => card._config.template))) continue;
              const name = `${view.path}-popup-${index}-${child}`;
              await captureClimateFeedback(page, name, target, output, { scenario, theme });
              captures.push({ name, template: await target.evaluate(card => card._config.template), popup: hash });
            }
            if (!count) await captureClimateFeedback(page, `${view.path}-popup-${index}-empty`, null, output, { scenario, theme });
            await page.locator('.marao-popup-close').tap();
            await sheet.waitFor({ state: 'detached' });
          }
          await page.evaluate(() => document.fonts.ready);
        }
        fs.writeFileSync(path.join(output, 'receipt.json'), JSON.stringify({ run, captures, errors }, null, 2) + '\n');
        assert.deepEqual(errors, [], 'Unexpected numeric layout browser diagnostics; inspect private evidence');
        console.log(`${run}: ${captures.length} numeric cards and popup children inspected with contained values.`);
        await context.close();
      } finally { await browser.close(); }
    }
    assert.equal((await client.call({ type: 'marao_dashboard/config/get' })).config, saved.config, 'Layout inspection changed saved source');
  } finally { client.close(); }
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
