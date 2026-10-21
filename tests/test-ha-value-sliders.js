const { capture: captureScreenshot } = require('./verification-browser');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { readConfig, accessToken, setBrowserToken, api, assertCurrentFrontend, assertDisposableHaTarget } = require('../ha-test/client');
const { prepare, restoreHelperStates } = require('../ha-test/prepare');
const { concreteCases } = require('../ha-test/cases');
const { applyVisualPreferences, configurePageEmulation, contextOptionsForScenario, parseArgs, selectedRuns } = require('./test-ha-dashboard-accessibility');

const { sliderReadings } = require('./value-slider-geometry');

async function checkPointerInteraction(page, context, config, example, calls, pointer, scope = '') {
  if (!example.entity.startsWith(`${example.source.split('.')[0]}.marao_dashboard_test_case_`)) throw new Error('Pointer checks require a safe gallery fixture');
  const selector = `${scope} input[data-slider-key="${example.template}:${example.entity}"]`;
  const input = page.locator(selector);
  const expected = { hc_light_card: 'turn_on', hc_fan_card: 'set_percentage', hc_cover_card: 'set_cover_position' }[example.template];
  const field = { hc_light_card: 'brightness_pct', hc_fan_card: 'percentage', hc_cover_card: 'position' }[example.template];
  const fixtureValue = (state) => example.template === 'hc_light_card' ? state.attributes.brightness * 100 / 255 : example.template === 'hc_fan_card' ? state.attributes.percentage : state.attributes.current_position;
  const count = () => calls.filter((call) => call.entities.includes(example.entity)).length;
  const touch = pointer === 'touch' ? await context.newCDPSession(page) : null;
  let box;
  const point = (value) => ({ x: box.x + 24 + (box.width - 48) * value / 100, y: box.y + 24 });
  const start = async () => {
    await input.scrollIntoViewIfNeeded();
    const idle = await input.elementHandle();
    await idle.evaluate((element) => { const host = element.getRootNode().host; host.hass = { ...host.hass, states: { ...host.hass.states } }; });
    if (!await idle.evaluate((element) => element.isConnected)) throw new Error('unrelated HA update replaced the idle slider');
    await input.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    box = await input.boundingBox();
    const p = point(Number(await input.inputValue()));
    if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] });
    else { await page.mouse.move(p.x, p.y); await page.mouse.down(); }
    const started = await input.evaluate((element, point) => {
      const host = element.getRootNode().host;
      let hit = document.elementFromPoint(point.x, point.y);
      const path = [];
      while (hit) { path.push(`${hit.localName}:${hit.dataset?.sliderKey || ''}`); const next = hit.shadowRoot?.elementFromPoint(point.x, point.y); if (!next || next === hit) break; hit = next; }
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return { held: host._sliderGesture?.input === element, hit: path, active: `${active?.localName}:${active?.dataset?.sliderKey || ''}`, point };
    }, p);
    if (!started.held) throw new Error(`${example.name}/${pointer}: pointer did not reach input: ${JSON.stringify(started)}`);
  };
  const move = async (value) => {
    const p = point(value);
    if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] });
    else await page.mouse.move(p.x, p.y, { steps: 5 });
  };
  const end = async () => {
    if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await page.mouse.up();
  };
  try {
    const before = count();
    await start();
    const original = await input.elementHandle();
    const host = await original.evaluateHandle((element) => element.getRootNode().host);
    for (const target of [100, 0]) {
      await move(target);
      const reading = (await sliderReadings(page, selector))[0];
      if (reading.issues.length || Math.abs(reading.current - 50) > 1 || reading.target !== target) throw new Error(`${example.name}/${pointer}: independent target failed: ${JSON.stringify(reading)}`);
    }
    await move(60);
    await original.evaluate((element) => { const host = element.getRootNode().host; host.hass = { ...host.hass, states: { ...host.hass.states } }; });
    if (!await original.evaluate((element) => element.isConnected && Math.abs(Number(element.value) - 60) <= 1)) throw new Error(`${example.name}/${pointer}: unrelated HA update interrupted the drag`);
    // A real external update must refresh confirmed fill without replacing the held input.
    const statePresentation = () => original.evaluate((element) => {
      const root = element.getRootNode(), surface = root.querySelector('ha-card');
      return surface?.hasAttribute('data-binary-state') ? { binary: true, active: surface.dataset.binaryState, label: root.querySelector('[role="img"][aria-label]')?.getAttribute('aria-label'), redundant: Boolean(root.querySelector('.state')) }
        : { binary: false, label: root.querySelector('.state')?.textContent };
    });
    const activeState = await statePresentation();
    for (const confirmed of [0, 40]) {
      await api(config, 'POST', `/api/services/${example.source.split('.')[0]}/${expected}`, { entity_id: example.entity, [field]: confirmed });
      try {
        // Poll from the driver so inspecting a held native range does not rely
        // on the page's timer/animation scheduling during its native gesture.
        const deadline = Date.now() + 5000;
        let matched = false;
        while (Date.now() < deadline) {
          matched = await original.evaluate((element, value) => element.isConnected && Math.abs(Number(element.dataset.sliderCurrent) - value) < 1, confirmed);
          if (matched) break;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (!matched) throw new Error('Authoritative fill did not update within five seconds');
      } catch {
        const observed = await original.evaluate((element) => ({ connected: element.isConnected, current: element.dataset.sliderCurrent, target: element.value }));
        const state = await api(config, 'GET', `/api/states/${example.entity}`);
        throw new Error(`confirmed update to ${confirmed} failed: ${JSON.stringify({ observed, serverValue: fixtureValue(state), state: state.state })}`);
      }
      const currentState = await statePresentation();
      if (!currentState.label || (confirmed === 0 ? currentState.label === activeState.label : currentState.label !== activeState.label)
        || currentState.binary && (currentState.redundant || currentState.active !== String(confirmed !== 0))) throw new Error(`${example.name}/${pointer}: state presentation stopped following HA`);
    }
    await move(75);
    if (!await original.evaluate((element) => element.isConnected && Math.abs(Number(element.value) - 75) <= 1)) throw new Error(`${example.name}/${pointer}: target stopped following the pointer`);
    const moving = (await sliderReadings(page, selector))[0];
    if (moving.issues.length || Math.abs(moving.current - 40) > 1) throw new Error(`${example.name}/${pointer}: confirmed fill stopped following HA`);
    if (count() !== before) throw new Error(`${example.name}/${pointer}: dispatched before release`);
    await end();
    await page.waitForFunction((card) => !card._sliderGesture && Math.abs(Number(card.shadowRoot.querySelector('input[type="range"]')?.dataset.sliderCurrent) - 75) < 1, host);
    const completed = calls.filter((call) => call.entities.includes(example.entity)).slice(before);
    if (completed.length !== 1 || completed[0].service !== expected) throw new Error(`${example.name}/${pointer}: completion did not dispatch exactly once`);
    await api(config, 'POST', `/api/services/${example.source.split('.')[0]}/${expected}`, { entity_id: example.entity, [field]: 50 });
    await page.waitForFunction((card) => Math.abs(Number(card.shadowRoot.querySelector('input[type="range"]')?.dataset.sliderCurrent) - 50) < 1, host);
    const outsideBefore = count();
    await start();
    await move(-10);
    await end();
    await page.waitForFunction((card) => !card._sliderGesture && Number(card.shadowRoot.querySelector('input[type="range"]')?.dataset.sliderCurrent) === 0, host);
    if (count() !== outsideBefore + 1) throw new Error('release beyond the track did not dispatch exactly once');
    await api(config, 'POST', `/api/services/${example.source.split('.')[0]}/${expected}`, { entity_id: example.entity, [field]: 50 });
    await page.waitForFunction((card) => Math.abs(Number(card.shadowRoot.querySelector('input[type="range"]')?.dataset.sliderCurrent) - 50) < 1, host);
    const cancelBefore = count();
    await start();
    await move(60);
    if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    else { await input.dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up(); }
    await page.waitForLoadState('networkidle');
    const state = await api(config, 'GET', `/api/states/${example.entity}`);
    if (count() !== cancelBefore || Math.abs(fixtureValue(state) - 50) > 1) throw new Error(`${example.name}/${pointer}: cancellation dispatched a partial target`);
  } catch (error) {
    throw new Error(`${example.name}/${pointer}: ${error.message}`);
  } finally {
    if (touch) await touch.detach();
    await api(config, 'POST', `/api/services/${example.source.split('.')[0]}/${expected}`, { entity_id: example.entity, [field]: 50 });
  }
}

async function checkNativeThumbReset(page, selector) {
  const input = page.locator(selector);
  await input.scrollIntoViewIfNeeded();
  const before = await captureScreenshot(input, { scale: 'device' });
  const style = await input.evaluateHandle((element) => {
    const style = document.createElement('style');
    // Simulate iOS's lower-priority default thumb shadow in every test engine.
    style.textContent = 'input::-webkit-slider-thumb { box-shadow:0 6px 13px rgba(0,0,0,.2),0 .5px 4px rgba(0,0,0,.2); }';
    element.getRootNode().prepend(style);
    return style;
  });
  try {
    if (!before.equals(await captureScreenshot(input, { scale: 'device' }))) throw new Error('native thumb shadow leaked into the vector slider');
  } finally { await style.evaluate((element) => element.remove()); }
}

async function main() {
  const config = readConfig();
  assertDisposableHaTarget(config);
  await prepare(config);
  const tokens = await accessToken(config, config.url);
  const output = path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), 'value-sliders');
  fs.mkdirSync(output, { recursive: true });
  const cases = concreteCases().filter((entry) => entry.sliderPercentage !== undefined);
  const browser = await chromium.launch();
  try {
    const options = parseArgs();
    for (const { scenario, theme } of selectedRuns(options)) {
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      await context.addInitScript(setBrowserToken, { ...tokens, hassUrl: config.url, clientId: `${config.url}/`, expires: Date.now() + tokens.expires_in * 1000 });
      const page = await context.newPage();
      const cameraLedger = await require('./camera-request-ledger').managedCameraLedger(context, page, { output, scenario: scenario.name, theme });
      await configurePageEmulation(context, page, scenario);
      const errors = [];
      const calls = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      page.on('response', (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`); });
      page.on('websocket', (socket) => socket.on('framesent', ({ payload }) => {
        let message;
        try { message = JSON.parse(String(payload)); } catch { return; }
        if (message.type !== 'call_service') return;
        const entities = message.target?.entity_id ?? message.service_data?.entity_id ?? [];
        calls.push({ service: message.service, entities: Array.isArray(entities) ? entities : [entities] });
      }));
      const run = `${scenario.name}-${theme}`;
      await page.goto(`${config.url}/marao-dashboard/card-test?marao_sliders=${run}`, { waitUntil: 'domcontentloaded' });
      await page.locator(`input[data-slider-key="${cases.at(-1).template}:${cases.at(-1).entity}"]`).waitFor({ state: 'visible' });
      await assertCurrentFrontend(page);
      await applyVisualPreferences(page, scenario, theme);
      for (const card of await page.locator('marao-card').filter({ has: page.locator('input[type="range"]') }).all()) await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const readings = await sliderReadings(page);
      const failures = readings.filter(({ issues }) => issues.length);
      if (readings.length < cases.length || failures.length) {
        await captureScreenshot(page, { path: path.join(output, `${run}-failure.png`), scale: 'css' });
        throw new Error(`${run}: ${readings.length} visible sliders; expected at least ${cases.length}; ${JSON.stringify(failures)}`);
      }
      for (const example of cases) {
        const reading = readings.find(({ key }) => key === `${example.template}:${example.entity}`);
        if (!reading || Math.abs(reading.current - example.sliderPercentage) > 1) throw new Error(`${run}: missing endpoint ${example.name}`);
      }
      if (['iphone-normal', 'android-normal'].includes(scenario.name)) {
        await page.setViewportSize(scenario.device === 'iphone' ? { width: 844, height: 390 } : { width: 800, height: 360 });
        const rotated = await sliderReadings(page);
        if (rotated.some(({ issues }) => issues.length)) throw new Error(`${run}: resize failed: ${JSON.stringify(rotated.filter(({ issues }) => issues.length))}`);
        await page.setViewportSize(scenario.viewport);
        for (const example of cases.filter((entry) => entry.sliderPercentage === 50)) {
          for (const pointer of ['mouse', 'touch']) await checkPointerInteraction(page, context, config, example, calls, pointer);
        }
        await page.goto(`${config.url}/marao-dashboard/card-test#marao-dashboard-test-value-sliders-popup`, { waitUntil: 'domcontentloaded' });
        try {
          await page.locator('.marao-popup-sheet input[type="range"]').first().waitFor({ state: 'visible' });
        } catch (error) {
          const location = await page.evaluate(() => ({ path: window.location.pathname, hash: window.location.hash }));
          const popups = await page.locator('marao-popup-card').evaluateAll(cards => cards.map(card => ({
            hash: card._config.hash, connected: card.isConnected, open: card._open, viewPath: card._viewPath,
            content: card._overlay?.querySelector('.marao-popup-content')?.innerHTML,
          })));
          fs.writeFileSync(path.join(output, `${run}-popup-entry-failure.json`), JSON.stringify({ location, popups, errors }, null, 2), { mode: 0o600 });
          await captureScreenshot(page, { path: path.join(output, `${run}-popup-entry-failure.png`), scale: 'css' });
          throw new Error(`${run}: slider popup did not mount; private diagnostics retained. ${error.message}`);
        }
        await applyVisualPreferences(page, scenario, theme);
        await page.evaluate(() => {
          window.__maraoRangeTouchDefaults = [];
          window.addEventListener('touchmove', (event) => {
            if (event.composedPath().some((element) => element instanceof Element && element.matches('input[type="range"][data-slider-key]'))) window.__maraoRangeTouchDefaults.push(event.defaultPrevented);
          }, { capture: true });
        });
        for (const example of cases.filter((entry) => entry.sliderPercentage === 50)) {
          const selector = `.marao-popup-sheet input[data-slider-key="${example.template}:${example.entity}"]`;
          await checkNativeThumbReset(page, selector);
          await checkPointerInteraction(page, context, config, example, calls, 'touch', '.marao-popup-sheet');
        }
        const defaults = await page.evaluate(() => window.__maraoRangeTouchDefaults);
        if (!defaults.length || defaults.some(Boolean)) throw new Error('popup scroll guard cancelled native range touch movement');
        await page.locator('.marao-popup-close').click();
        await page.locator('.marao-popup-sheet').waitFor({ state: 'detached' });
      }
      if (options.screenshots !== 'failure' && ['iphone-normal', 'android-normal', 'iphone-bold-text-200', 'android-page-zoom-200'].includes(scenario.name)) {
        const cards = page.locator('marao-card').filter({ has: page.locator('input[type="range"]') });
        const captured = new Set();
        for (const [index, card] of (await cards.all()).entries()) {
          const family = await card.evaluate(element => element._config?.template);
          if (options.screenshots === 'review' && captured.has(family)) continue;
          captured.add(family);
          await card.evaluate((element, block) => element.scrollIntoView({ block }), scenario.pageZoom > 1 ? 'start' : 'center');
          await card.evaluate(async (element) => { await element.shadowRoot.querySelector('ha-card')?.updateComplete; });
          // Oversized element screenshots resize Chromium and reset mobile emulation.
          await captureScreenshot(page, { path: path.join(output, `${run}-${index}.png`), scale: 'css' });
        }
      }
      if (scenario.name === 'iphone-normal') {
        const fixtureLight = 'input_boolean.marao_dashboard_test_light';
        const baseline = await api(config, 'GET', '/api/states/' + fixtureLight);
        if (!['on', 'off'].includes(baseline.state)) throw new Error('The safe lighting fixture is unavailable');
        try {
          // The Home lighting popup intentionally includes only active members.
          await api(config, 'POST', '/api/services/input_boolean/turn_on', { entity_id: fixtureLight });
          for (const view of ['card-test#marao-dashboard-test-lights-popup', 'card-test#marao-dashboard-test-blinds-popup', 'living-room', 'overview#overview-lights', 'overview#overview-blinds']) {
            await page.waitForLoadState('networkidle');
            await page.goto(`${config.url}/marao-dashboard/${view}`, { waitUntil: 'domcontentloaded' });
            await page.locator(view.includes('#') ? '.marao-popup-sheet input[type="range"]' : 'marao-card input[type="range"]').first().waitFor({ state: 'attached' });
            await applyVisualPreferences(page, scenario, theme);
            const scope = view.includes('#') ? '.marao-popup-sheet marao-card' : 'marao-card';
            for (const card of await page.locator(scope).filter({ has: page.locator('input[type="range"]') }).all()) await card.scrollIntoViewIfNeeded();
            await page.waitForTimeout(150);
            const product = await sliderReadings(page, `${scope} input[type="range"]`);
            if (!product.length || product.some(({ issues }) => issues.length)) throw new Error(`${run}/${view}: ${JSON.stringify(product)}`);
            const cards = page.locator(scope).filter({ has: page.locator('input[type="range"]') });
            for (const [index, card] of (await cards.all()).entries()) {
              await card.evaluate((element) => element.scrollIntoView({ block: 'center' }));
              await card.evaluate(async (element) => { await element.shadowRoot.querySelector('ha-card')?.updateComplete; });
              await captureScreenshot(page, { path: path.join(output, `${run}-${view.replace('#', '-')}-${index}.png`), scale: 'css' });
            }
            if (view.endsWith('#overview-blinds')) {
              await page.setViewportSize({ width: 539, height: 816 });
              await page.locator('.marao-popup-sheet').evaluate((element) => element.scrollTo({ top: 0 }));
              await page.waitForTimeout(150);
              await captureScreenshot(page, { path: path.join(output, `overview-blinds-${theme}.png`), scale: 'device' });
            }
          }
        } finally {
          await restoreHelperStates(config, { [fixtureLight]: baseline.state });
        }
      }
      await page.waitForLoadState('networkidle');
      await cameraLedger.stopForClose();
      if (errors.length) throw new Error(`${run}: browser warnings/errors: ${errors.join('; ')}`);
      fs.writeFileSync(path.join(output, `${run}.json`), JSON.stringify(readings, null, 2));
      console.log(`${run}: ${readings.length} value sliders passed.`);
      await context.close();
    }
  } catch (error) {
    const page = browser.contexts().at(-1)?.pages().at(-1);
    if (page && !page.isClosed()) await captureScreenshot(page, { path: path.join(output, 'value-sliders-failure.png'), scale: 'css' });
    throw error;
  } finally { await browser.close(); }
}

if (require.main === module) main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
module.exports = { checkPointerInteraction, checkNativeThumbReset };
