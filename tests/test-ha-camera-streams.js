// Native HA low dashboard / high popup proof using only safe disposable cameras.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, webkit } = require('playwright');
const { prepareFrontend } = require('../ha-test/prepare-frontend');
const { accessToken, setBrowserToken, assertCurrentFrontend } = require('../ha-test/client');
const { managedCameraLedger } = require('./camera-request-ledger');
const { artifactDirectory } = require('./verification-browser');
const engine = process.argv.includes('--webkit') ? webkit : chromium;
const output = artifactDirectory('camera-streams');
const low = 'camera.marao_dashboard_test_camera_adaptive_low';
const high = 'camera.marao_dashboard_test_camera_adaptive_high';
const slow = 'camera.marao_dashboard_test_camera_slow_low';
const redact = value => String(value).replace(/https?:\S+/g, '[URL]').replace(/(?:key|token)=\S+/g, '[redacted]');

(async () => {
  const { config } = (process.env.MARAO_BATCH_RECEIPT ? await require('../ha-test/prepare').prepare() : await prepareFrontend());
  assert.equal(new URL(config.url).hostname, '192.168.0.28');
  const browser = await engine.launch();
  const context = await browser.newContext({ viewport: engine === webkit ? { width: 390, height: 844 } : { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const issues = [], calls = [], forbidden = [], evidence = { engine: engine.name(), layouts: [] };
  const ledger = await managedCameraLedger(context, page, { output, scenario: engine.name(), theme: 'light' });
  page.on('pageerror', error => issues.push(redact(error.stack || error)));
  page.on('console', message => { if (['warning', 'error'].includes(message.type())) issues.push(redact(message.text())); });
  page.on('response', response => { if (response.status() >= 400) issues.push('HTTP ' + response.status() + ' ' + new URL(response.url()).pathname); });
  page.on('request', request => { if (/\/api\/marao_dashboard\/camera\/|MaraoHls\.js/.test(new URL(request.url()).pathname)) forbidden.push('adaptive request'); });
  page.on('websocket', socket => socket.on('framesent', frame => {
    try { const message = JSON.parse(frame.payload); if (message.type === 'call_service') calls.push({ domain: message.domain, service: message.service }); } catch {}
  }));
  let failure;
  try {
    await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
    await page.goto(config.url + '/marao-dashboard/security');
    const dashboard = page.locator('marao-card[data-marao-control-cell]').filter({ has: page.locator('ha-card[data-camera-card][aria-label="Entrance camera"]') });
    await dashboard.waitFor();
    await dashboard.scrollIntoViewIfNeeded();
    await assertCurrentFrontend(page);
    await page.waitForFunction(() => {
      const roots = [document];
      for (let i = 0; i < roots.length; i++) for (const node of roots[i].querySelectorAll('*')) {
        if (node.localName === 'marao-card' && node._config?.name === 'Entrance camera') window.streamDashboard = node;
        if (node.shadowRoot) roots.push(node.shadowRoot);
      }
      return window.streamDashboard?._camera?.state === 'live' && streamDashboard._camera.video?.videoWidth === 320 && streamDashboard._camera.video.getRootNode().host?.localName === 'ha-web-rtc-player';
    }, null, { timeout: 35000 });
    assert.equal(await dashboard.evaluate(card => card._camera.streamEntity), low);
    await ledger.boundary('open high stream popup', () => dashboard.getByRole('button').first().tap(), { terminal: false, entities: [low, slow] });
    const sheet = page.locator('.marao-popup-sheet');
    await sheet.waitFor();
    const popup = sheet.locator('marao-card');
    await page.waitForFunction(() => {
      const card = document.querySelector('home-assistant').shadowRoot.querySelector('.marao-popup-content marao-card');
      window.streamPopup = card;
      return card?._camera?.state === 'live' && card._camera.video?.videoWidth === 640 && card._camera.video.getRootNode().host?.localName === 'ha-web-rtc-player';
    }, null, { timeout: 35000 });
    assert.equal(await popup.evaluate(card => card._camera.streamEntity), high);
    assert.equal(await dashboard.evaluate(card => !card._camera.player), true, 'Inert dashboard releases its low stream');
    const events = sheet.locator('marao-camera-events-card');
    await events.waitFor();
    await page.waitForFunction(() => { const events = document.querySelector('home-assistant').shadowRoot.querySelector('.marao-popup-content marao-camera-events-card'); return events?._status === 'ready' && events._events.length > 0; }, null, { timeout: 10000 });
    assert.equal(await events.evaluate(card => card._config.entity), low, 'Events keep the dashboard identity');
    assert.equal(await popup.evaluate(card => card.parentElement.firstElementChild === card), true);
    const button = popup.getByRole('button', { name: /^(Open full screen|Abrir ecrã inteiro)$/ });
    const bounds = await button.boundingBox();
    assert.ok(bounds.width >= 48 && bounds.height >= 48);
    await popup.evaluate(card => { window.originalCameraVideo = card._camera.video; window.originalCameraPlayer = card._camera.player; });
    await button.tap();
    await page.waitForFunction(() => originalCameraVideo.getRootNode().fullscreenElement === originalCameraVideo || originalCameraVideo.webkitDisplayingFullscreen || streamPopup._camera.stage.matches(':modal'), null, { timeout: 5000 });
    evidence.fullscreenMode = await popup.evaluate(card => card._camera.stage.matches(':modal') ? 'window' : 'native');
    evidence.dashboardTransport = 'web_rtc'; evidence.popupTransport = 'web_rtc';
    evidence.fullscreenSameVideo = await popup.evaluate(card => card._camera.video === originalCameraVideo && card._camera.player === originalCameraPlayer);
    assert.equal(evidence.fullscreenSameVideo, true);
    assert.equal(await popup.evaluate(card => card._camera.video.controls), true);
    assert.equal(await popup.evaluate(card => getComputedStyle(card._camera.video).pointerEvents), 'auto');
    if (evidence.fullscreenMode === 'window') {
      await page.setViewportSize({ width: 844, height: 390 });
      const size = await popup.evaluate(card => card._camera.stage.getBoundingClientRect().toJSON());
      assert.equal(Math.round(size.width), 844); assert.equal(Math.round(size.height), 390);
      await page.waitForFunction(() => getComputedStyle(originalCameraVideo).objectFit === 'contain' && Math.abs(originalCameraVideo.getBoundingClientRect().height - innerHeight) < 2);
      evidence.fullFrameContained = true;
      await page.screenshot({ path: output + '/full-window-landscape.png' });
    }
    // Exit fullscreen without closing the containing event sheet.
    if (evidence.fullscreenMode === 'window') await popup.getByRole('button', { name: /^(Exit full screen|Sair do ecrã inteiro)$/ }).tap();
    else await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); else originalCameraVideo.webkitExitFullscreen(); });
    await page.waitForFunction(() => !streamPopup._camera.fullscreenCleanup);
    assert.equal(await sheet.isVisible(), true);
    assert.equal(await popup.evaluate(card => card._camera.video === originalCameraVideo && !card._camera.video.controls), true);
    if (evidence.fullscreenMode === 'window') {
      await button.tap();
      await page.waitForFunction(() => streamPopup._camera.stage.matches(':modal'));
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !streamPopup._camera.fullscreenCleanup);
      assert.equal(await sheet.isVisible(), true, 'Escape exits only the fullscreen stage');
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await popup.evaluate(card => card._camera.video.pause());
    assert.equal(await popup.evaluate(card => card._camera.state === 'buffering' && card._camera.poster.hidden), true);
    await popup.evaluate(card => card._camera.video.play());
    await page.waitForFunction(() => streamPopup._camera.state === 'live');
    for (const [width, height] of [[320, 740], [844, 390]]) {
      await page.setViewportSize({ width, height });
      const layout = await sheet.evaluate(node => ({ width: node.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth > innerWidth }));
      assert.equal(layout.overflow, false); assert.ok(layout.width <= width);
      evidence.layouts.push({ width, height, ...layout });
    }
    if (engine === chromium) await page.screenshot({ path: output + '/popup-landscape.png' });
    await ledger.boundary('close popup high stream', () => page.getByRole('button', { name: /^(Close popup|Fechar popup|Fechar janela)$/ }).tap(), { terminal: false, entities: [high, low, slow] });
    await sheet.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => !streamPopup._camera), true);
    await page.waitForFunction(() => streamDashboard._camera.state === 'live' && streamDashboard._camera.streamEntity.endsWith('_low'), null, { timeout: 35000 });
    evidence.popupReleased = true; evidence.dashboardResumedLow = true;
    assert.deepEqual(calls, []); assert.deepEqual(forbidden, []); assert.deepEqual(issues, []);
  } catch (error) {
    failure = error;
    await page.screenshot({ path: output + '/failure.png' }).catch(() => {});
    evidence.failure = redact(error.stack || error);
    evidence.state = await page.evaluate(() => ({ dashboard: window.streamDashboard?._camera?.state, popup: window.streamPopup?._camera?.state, feedback: window.streamPopup?._camera?.feedback?.textContent })).catch(() => ({}));
  } finally {
    try { await context.close(); await browser.close(); await ledger.assert(); } catch (error) { failure ||= error; }
    evidence.issues = issues; evidence.calls = calls; evidence.forbidden = forbidden;
    fs.writeFileSync(output + '/' + engine.name() + '.json', JSON.stringify(evidence, null, 2), { mode: 0o600 });
  }
  if (failure) throw failure;
  console.log(engine.name() + ': exact low/high native streams, popup/fullscreen reuse, buffering, mobile layout and cleanup passed');
})().catch(error => { console.error(redact(error.stack || error)); process.exitCode = 1; });
