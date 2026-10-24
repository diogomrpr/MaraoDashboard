const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require('playwright');
const { documentHTML, frontend, serviceWorker } = require('../ha-test/frontend-refresh-fixture');
const { artifactDirectory, capture } = require('./verification-browser');
const { scenarios, contextOptionsForScenario, configurePageEmulation, applyVisualPreferences } = require('./test-ha-dashboard-accessibility');

async function pointer(page, locator, milliseconds, cancel = false) {
  const box = await locator.boundingBox(); assert.ok(box);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const cdp = page.context().browser().browserType().name() === 'chromium' ? await page.context().newCDPSession(page) : null;
  if (cdp) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
    await page.waitForTimeout(milliseconds);
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(milliseconds);
    if (cancel) await page.mouse.move(x + 20, y);
    await page.mouse.up();
  }
}

async function geometry(page) {
  return page.locator('marao-navbar-card:not([data-marao-navbar-placeholder])').evaluate(card => {
    const nav = card.shadowRoot.querySelector('.nav'), box = nav.getBoundingClientRect();
    const controls = [...nav.querySelectorAll('a,button')].map(node => {
      const rect = node.getBoundingClientRect(), icon = node.querySelector('ha-icon').getBoundingClientRect();
      return { width: rect.width, height: rect.height, top: rect.top,
        centered: icon.width >= 24 && icon.height >= 24 && Math.abs(icon.x + icon.width / 2 - rect.x - rect.width / 2) <= .75 && Math.abs(icon.y + icon.height / 2 - rect.y - rect.height / 2) <= .75 };
    });
    const feedback = card.shadowRoot.querySelector('.refresh-feedback'), text = feedback.getBoundingClientRect();
    const progress = card.shadowRoot.querySelector('progress'), colors = getComputedStyle(progress);
    const luminance = color => {
      const values = color.match(/[\d.]+/g).slice(0, 3).map(value => {
        const channel = Number(value) / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      });
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    };
    const levels = [luminance(colors.backgroundColor), luminance(colors.accentColor)].sort((a, b) => a - b);
    return { controls, bounded: box.left >= -1 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1,
      progressContrast: (levels[1] + .05) / (levels[0] + .05), progressHeight: progress.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      feedback: feedback.hidden || text.left >= -1 && text.right <= innerWidth + 1 && text.top >= 0 && text.bottom <= box.top,
      wraps: feedback.hidden || feedback.scrollWidth <= feedback.clientWidth + 1 };
  });
}

async function run({ alignmentOnly = false } = {}) {
  const output = artifactDirectory('frontend-refresh-local'), report = [], requests = [];
  let version = 1, unreachable = false;
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1'); requests.push({ method: request.method, path: url.pathname, query: url.search });
    if (request.method === 'HEAD') { response.statusCode = unreachable ? 503 : url.pathname === '/marao_dashboard_static/MaraoFrontendRefresh.js' ? 200 : 405; response.end(); return; }
    if (url.pathname === '/service_worker.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(serviceWorker); return; }
    if (url.pathname.startsWith('/marao_dashboard_static/')) {
      const name = url.pathname.slice('/marao_dashboard_static/'.length);
      if (name !== path.basename(name) || !fs.existsSync(path.join(frontend, name))) { response.statusCode = 404; response.end(); return; }
      response.setHeader('Content-Type', 'text/javascript'); response.end(fs.readFileSync(path.join(frontend, name))); return;
    }
    response.setHeader('Content-Type', 'text/html'); response.end(documentHTML(version));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const engine of alignmentOnly ? [chromium] : [chromium, webkit]) {
      const browser = await engine.launch();
      try {
        const profiles = engine === chromium ? [
          { name: 'iphone', width: 390, height: 844 }, { name: 'android', width: 360, height: 800 },
          { name: 'narrow-320', width: 320, height: 700 }, { name: 'iphone-landscape', width: 844, height: 390 },
          { name: 'android-landscape', width: 800, height: 360 }, { name: 'bold', width: 390, height: 844, bold: true },
          { name: 'text-200', width: 390, height: 844, scale: 2 }, { name: 'zoom-200', width: 195, height: 422 },
          { name: 'bold-text-200', width: 390, height: 844, scale: 2, bold: true },
        ] : [{ name: 'webkit-native-pointer', width: 390, height: 844 }];
        for (const profile of profiles) {
          const names = { iphone: 'iphone-normal', android: 'android-normal', bold: 'iphone-bold', 'text-200': 'iphone-text-200', 'zoom-200': 'iphone-page-zoom-200', 'bold-text-200': 'iphone-bold-text-200', 'webkit-native-pointer': 'iphone-normal' };
          const scenario = scenarios.find(row => row.name === (names[profile.name] || profile.name));
          const context = await browser.newContext(contextOptionsForScenario(scenario));
          const page = await context.newPage(), errors = [], failed = [];
          await configurePageEmulation(context, page, scenario);
          if (profile.name === 'android') await context.addInitScript(() => { window.externalAppV2 = { postMessage() { throw Error('Android must use web recovery'); } }; });
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (['warning', 'error'].includes(message.type())) errors.push(message.text()); });
          page.on('response', response => { if (response.status() >= 400) failed.push(response.status() + ' ' + new URL(response.url()).pathname); });
          try {
            const native = profile.name === 'android' || engine === webkit;
            const original = base + '/marao-dashboard/rooms?external_auth=1&keep=a%20b' + (native ? '&native=1' : '') + '#detail';
            await page.goto(original); await page.waitForFunction(() => window.ready);
            const card = page.locator('marao-navbar-card:not([data-marao-navbar-placeholder])'), nav = card.locator('.nav'); await nav.waitFor({ state: 'visible' });
            await page.evaluate(() => {
              card.hass = { ...hass, language: 'pt' };
            });
            await applyVisualPreferences(page, scenario, 'light');
            for (const state of ['hold', 'offline', 'unsaved', 'refreshing']) {
              await card.evaluate((element, state) => element._refreshFeedback(state, .6), state);
              const measured = await geometry(page);
              assert.equal(measured.overflow, false, profile.name); assert.equal(measured.bounded, true, profile.name);
              assert.equal(measured.feedback, true, profile.name); assert.equal(measured.wraps, true, profile.name);
              if (state === 'hold') { assert.ok(measured.progressContrast >= 7, 'Progress fill/track contrast must be at least 7:1'); assert.ok(measured.progressHeight >= 10); }
              assert.ok(measured.controls.every(row => row.width >= 48 && row.height >= 48 && row.centered));
              assert.equal(new Set(measured.controls.map(row => row.top)).size, 1);
            }
            if (profile.name === 'iphone') {
              for (const dark of [false, true]) {
                await applyVisualPreferences(page, scenario, dark ? 'dark' : 'light');
                await card.evaluate(element => { element._refreshFeedback('hold', .6); });
                assert.ok((await geometry(page)).progressContrast >= 7, 'Both themes need a clearly distinct fill and track');
                await capture(page, { path: path.join(output, `progress-${dark ? 'dark' : 'light'}.png`), scale: 'css' });
              }
            }
            await card.evaluate(element => element._refreshFeedback(''));
            if (!alignmentOnly && ['iphone', 'android', 'webkit-native-pointer'].includes(profile.name)) {
              const first = nav.locator('[data-route]').first();
              await pointer(page, first, 50); assert.equal(new URL(page.url()).pathname, '/marao-dashboard/rooms');
              await page.evaluate(url => history.replaceState({}, '', url), original);
              await pointer(page, first, 700); assert.equal(page.url(), original); assert.equal(await card.locator('.refresh-feedback').isVisible(), false);
              await pointer(page, first, 700, true); assert.equal(page.url(), original);
              await nav.locator('[data-overflow]').tap(); assert.equal(await card.locator('.overflow').isVisible(), true);
              await nav.locator('[data-overflow]').tap(); assert.equal(await card.locator('.overflow').count(), 0);
              await page.evaluate(() => { window.isDirtyState = true; });
              await pointer(page, first, 3100); assert.equal(page.url(), original);
              assert.match(await card.locator('.refresh-feedback').textContent(), /Guarde/);
              await page.evaluate(() => { window.isDirtyState = false; });
              await card.evaluate(element => { element.preview = true; element.shadowRoot.querySelector('.nav').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, button: 0, isPrimary: true, bubbles: true })); }); await page.waitForTimeout(600);
              assert.equal(page.url(), original); await card.evaluate(element => element.preview = false);
              await card.evaluate(element => { element.inert = true; });
              await pointer(page, nav, 600); assert.equal(page.url(), original); await card.evaluate(element => { element.inert = false; });
              if (engine === chromium && profile.name === 'iphone') {
                await page.evaluate(async () => {
                  const cached = await fetch(location.href).then(response => response.text());
                  await navigator.serviceWorker.register('/service_worker.js'); await navigator.serviceWorker.ready;
                  await (await caches.open('ha-frontend-fixture')).put(location.pathname, new Response(cached, { headers: { 'Content-Type': 'text/html' } }));
                  await (await caches.open('unrelated-data')).put('/api/preferences', new Response('preserved'));
                });
                await page.reload(); await page.waitForFunction(() => window.ready && navigator.serviceWorker.controller);
                version = 2;
                await page.reload(); await page.waitForFunction(() => window.ready); assert.equal(await page.locator('meta[name=fixture-build]').getAttribute('content'), '1');
                const historyLength = await page.evaluate(() => history.length);
                await pointer(page, page.locator('marao-navbar-card:not([data-marao-navbar-placeholder]) .nav [data-route]').first(), 3100);
                await page.waitForFunction(() => document.querySelector('meta[name=fixture-build]').content === '2' && window.ready);
                const fresh = new URL(page.url()); assert.equal(fresh.pathname, '/marao-dashboard/rooms'); assert.equal(fresh.hash, '#detail');
                assert.equal(fresh.searchParams.get('external_auth'), '1'); assert.equal(fresh.searchParams.get('keep'), 'a b');
                assert.equal(await page.evaluate(() => history.length), historyLength);
                assert.deepEqual(await page.evaluate(async () => ({ auth: localStorage.getItem('fixture-sign-in'), preference: localStorage.getItem('fixture-preferences'), other: await (await caches.open('unrelated-data')).match('/api/preferences').then(value => value.text()), workers: (await navigator.serviceWorker.getRegistrations()).length })), { auth: 'retained', preference: 'retained', other: 'preserved', workers: 0 });
                assert.ok(requests.some(row => row.path.endsWith('MaraoFrontendRefresh.js') && row.query === '?v=2'));
              } else {
                const before = page.url(), originTime = await page.evaluate(() => performance.timeOrigin); await pointer(page, nav.locator('[data-overflow]'), 3100);
                await page.waitForFunction(previous => window.ready && performance.timeOrigin !== previous, originTime); assert.equal(new URL(page.url()).pathname, new URL(before).pathname);
                assert.equal(new URL(page.url()).hash, new URL(before).hash);
                assert.equal(new URL(page.url()).searchParams.has('marao_cache_bust'), false);
                assert.equal(new URL(page.url()).searchParams.get('native'), native ? '1' : null);
              }
              await page.waitForTimeout(100); assert.equal(await page.evaluate(() => services), 0);
            }
            assert.deepEqual(errors, []); assert.deepEqual(failed, []);
            report.push({ engine: engine.name(), profile: profile.name, queryFlagRetained: native, geometry: await geometry(page), services: await page.evaluate(() => services) });
          } catch (error) { await capture(page, { path: path.join(output, `${engine.name()}-${profile.name}-failure.png`), scale: 'css' }).catch(() => {}); throw error; }
          finally { await context.close(); }
        }
      } finally { await browser.close(); }
    }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ scope: 'Loopback Chromium touch/WebKit pointer on the generated shared navbar. No physical Companion app or haptic-strength proof.', report }, null, 2), { mode: 0o600 });
    console.log(`Frontend refresh: ${report.length} selected layouts/hosts, stale service-worker recovery, preserved page/settings and zero entity actions passed.`);
  } finally { await new Promise(resolve => server.close(resolve)); }
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { geometry, pointer, run };
