const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const { readConfig, accessToken, setBrowserToken, assertCurrentFrontend } = require('../ha-test/client');
const { prepare } = require('../ha-test/prepare');
const { contextOptionsForScenario, parseArgs, selectedRuns, visualVariablesForScenario } = require('./test-ha-dashboard-accessibility');
const { artifactDirectory } = require('./verification-browser');

async function checkScroll(page, target, update, name) {
  const before = await target.evaluate(element => {
    element.scrollTop = Math.min(1500, (element.scrollHeight - element.clientHeight) / 2);
    return element.scrollTop;
  });
  assert.ok(before > 100, name + ' must contain enough cards to scroll');
  const samples = [];
  for (let index = 0; index < 3; index++) {
    await update(index);
    await page.waitForTimeout(450);
    samples.push(await target.evaluate(element => element.scrollTop));
  }
  // Include the one-second shell task and delayed HA rendering after input stops.
  await page.waitForTimeout(1200);
  samples.push(await target.evaluate(element => element.scrollTop));
  assert.ok(samples.every(top => Math.abs(top - before) <= 1), name + ' jumped: ' + JSON.stringify({before, samples}));
  return { name, before, samples };
}

async function main() {
  const config = readConfig();
  assert.equal(new URL(config.url).hostname, '192.168.0.28', 'Disposable instance only');
  const engine = process.argv.includes('--webkit') ? webkit : chromium;
  const options = parseArgs(); options.scenario ||= 'iphone-normal';
  await prepare(config);
  const output = artifactDirectory('scroll');
  for (const {scenario, theme} of selectedRuns(options)) {
    const browser = await engine.launch();
    const name = engine.name() + '-' + scenario.name + '-' + theme;
    let page;
    try {
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      await context.addInitScript(setBrowserToken, {hassUrl:config.url, ...accessToken(config)});
      page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(30000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['warning', 'error'].includes(message.type())) errors.push(message.text()); });
      page.on('requestfailed', request => errors.push('Failed ' + new URL(request.url()).pathname));
      page.on('response', response => { if (response.status() >= 400) errors.push('HTTP ' + response.status() + ': ' + new URL(response.url()).pathname); });
      const results = [];
      for (const route of ['overview#overview-maintenance', 'card-test#marao-dashboard-test-maintenance-popup']) {
        await page.goto(config.url + '/marao-dashboard/' + route);
        console.log(name + ': loaded ' + route);
        const sheet = page.locator('.marao-popup-sheet');
        await sheet.locator('marao-card').last().waitFor();
        await assertCurrentFrontend(page);
        await page.locator('html,home-assistant,marao-card,.marao-popup-overlay').evaluateAll((elements, variables) => {
          for (const element of elements) for (const [key, value] of Object.entries(variables)) element.style.setProperty(key, value, 'important');
        }, visualVariablesForScenario(scenario, theme));
        await page.waitForFunction(() => document.fonts.status === 'loaded', null, {timeout:15000});
        await sheet.locator('marao-card ha-card slot').nth(31).waitFor({state:'attached'});
        console.log(name + ': native card slots ready');
        await page.waitForTimeout(500);
        assert.equal(await sheet.locator('marao-card').count(), 32);
        const updatePopup = async index => {
          const reading = await sheet.locator('marao-card').evaluateAll((cards, index) => {
            const entity = 'sensor.marao_dashboard_test_maintenance_battery_1';
            for (const card of cards) {
              const hass = card.hass;
              card.hass = index === 0 ? {...hass} : {...hass, states: {...hass.states,
                [entity]: {...hass.states[entity], state: String(40 + index)}}};
            }
            return cards.find(card => card._config.entity === entity).shadowRoot.querySelector('.state').textContent;
          }, index);
          if (index) {
            assert.match(reading, new RegExp('\\b' + (40 + index) + '\\b'), 'Real card readings must still refresh');
          }
        };
        results.push(await checkScroll(page, sheet, updatePopup, route));
        if (route.startsWith('overview') && scenario.name === 'iphone-normal') await page.screenshot({path:path.join(output,name+'-maintenance.png'),scale:'css'});
        await page.locator('.marao-popup-close').click();
        await sheet.waitFor({state:'detached'});
        if (route.startsWith('card-test')) {
          const scroller = await page.locator('marao-card').first().evaluateHandle(card => {
            for (let element=card; element; element=element.assignedSlot || element.parentElement || element.getRootNode()?.host) {
              if (element.scrollHeight > element.clientHeight + 1 && ['auto','scroll'].includes(getComputedStyle(element).overflowY)) return element;
            }
            return document.scrollingElement;
          });
          try {
            results.push(await checkScroll(page, scroller, () => page.locator('marao-card').evaluateAll(cards => {
              for (const card of cards) card.hass = {...card.hass};
            }), 'dashboard page'));
          } finally { await scroller.dispose(); }
        }
      }
      assert.deepEqual(errors, []);
      fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify({results,errors},null,2),{mode:0o600});
      console.log(name + ': dashboard and both maintenance sheets retain their scroll positions');
    } catch (error) {
      console.error(name + ': ' + error.message);
      if (page) {
        try { await page.screenshot({path:path.join(output,name+'-failure.png'),scale:'css',timeout:10000}); }
        catch (captureError) { console.error('Failure capture: ' + captureError.message); }
      }
      throw error;
    } finally { await browser.close(); }
  }
}

main().catch(error => {console.error(error);process.exitCode=1;});
