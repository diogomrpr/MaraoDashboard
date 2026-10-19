const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { chromium } = require('playwright');
const { readConfig, accessToken, setBrowserToken, connect } = require('../ha-test/client');
const { iphone } = require('./mobile-devices');
const sha = value => createHash('sha256').update(value).digest('hex');
const option = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };

function largeFixture(source) {
  const fixture = JSON.parse(source);
  assert.equal(fixture.config_version, 2, 'Timing requires canonical pages');
  for (let page = 0; page < 16; page++) fixture.pages.push({
    id: `timing-page-${page}`, path: `timing-page-${page}`, name: `Timing page ${page + 1}`, sections: [
      { entities: Array.from({ length: 12 }, (_, card) => ({ id: `timing-card-${page}-${card}`, entity_id: 'light.marao_dashboard_test_light', name: `Safe occurrence ${card + 1}`, variables: { enable_slider: false } })) },
      { entities: [], cards: [{ type: 'markdown', content: 'Retained raw-only section' }] },
    ],
  });
  return fixture;
}
function timingVariant(source, name) {
  const fixture = JSON.parse(source);
  if (name === 'alternate-landing') fixture.landing_page = fixture.pages.at(-1).path;
  else {
    fixture.pages.push({ name: 'Safe timing variant', path: 'timing-variant', entities: [], ...(name === 'raw-only' ? { cards: [{ type: 'markdown', content: 'Safe raw-only landing' }] } : {}) });
    fixture.landing_page = 'timing-variant';
  }
  return fixture;
}
// Runs in each fresh document before the panel is registered. Timing starts at
// usable native controls, avoiding tool/network delays before an early first open.
function observeEditorTiming({ mode, preparedWaitMs }) {
  window.__editorTiming = { longTasks: [], decoding: [] };
  const timing = window.__editorTiming;
  const phase = name => { timing.phase = name; (timing.phases ||= []).push({ name, at: performance.now() }); };
  phase('observing-panel');
  const parse = JSON.parse, send = WebSocket.prototype.send, reads = new Map();
  WebSocket.prototype.send = function(data) {
    const result = parse(data);
    for (const message of Array.isArray(result) ? result : [result]) {
      if (message?.type === 'marao_dashboard/config/get') reads.set(message.id, message.scope || 'full');
    }
    return send.call(this, data);
  };
  JSON.parse = function(value, ...args) {
    const start = performance.now(), result = parse(value, ...args), duration = performance.now() - start;
    const batch = Array.isArray(result), messages = batch ? result : [result];
    const matched = messages.filter(message => message?.type === 'result' && reads.has(message.id));
    if (matched.length) timing.decoding.push({
      ...(!batch ? { scope: reads.get(matched[0].id), characters: String(value).length } : {}),
      scopes: [...new Set(matched.map(message => reads.get(message.id)))], messageIds: matched.map(message => message.id),
      duration, frameCharacters: String(value).length, sharedFrame: batch,
    });
    return result;
  };
  new PerformanceObserver(list => timing.longTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: 'longtask', buffered: true });
  const inspect = root => [...root.children].some(e => e.localName === 'input' && !e.disabled && e.getBoundingClientRect().width || e.shadowRoot && inspect(e.shadowRoot) || inspect(e));
  const watch = async panel => {
    phase('waiting-native-controls');
    const began = performance.now();
    while (!panel._loaded || panel._busy || !panel.shadowRoot.getElementById('general-form') || !inspect(panel.shadowRoot.getElementById('general-form')) || '_visualReady' in panel && !panel._visualReady) {
      timing.nativeWatch = { loaded: Boolean(panel._loaded), busy: Boolean(panel._busy), loadObserved: Boolean(panel._loading || panel._loadAttempted || panel._loaded), generalFound: Boolean(panel.shadowRoot.getElementById('general-form')), inputFound: Boolean(panel.shadowRoot.getElementById('general-form') && inspect(panel.shadowRoot.getElementById('general-form'))), visualReady: panel._visualReady ?? null };
      if (performance.now() - began > 60000 || panel._retryKind === 'config') throw new Error('Native Visual readiness failed');
      await new Promise(requestAnimationFrame);
    }
    phase('native-ready');
    timing.ready = performance.now(); timing.nativeControlReadyAt = panel._visualReadyAt ?? timing.ready;
    timing.startupLongTasks = [...timing.longTasks]; timing.startupDecoding = [...timing.decoding];
    timing.initialResources = performance.getEntriesByType('resource').map(e => ({ url: e.name, bytes: e.decodedBodySize, transferBytes: e.transferSize }));
    const warmupStart = performance.now();
    if (mode === 'prepared') {
      phase('idle-preparation-allowance');
      const allowance = new Promise(done => setTimeout(done, preparedWaitMs));
      const inputProbe = new Promise(done => setTimeout(async () => {
        const find = root => {
          for (const element of root.children) {
            if (element.localName === 'input' && !element.disabled && element.getBoundingClientRect().width) return element;
            const nested = element.shadowRoot && find(element.shadowRoot) || find(element); if (nested) return nested;
          }
        };
        const input = find(panel.shadowRoot.getElementById('general-form'));
        if (!input) { timing.failure = 'Native General input disappeared during preparation'; done(); return; }
        let previous = document.activeElement;
        while (previous?.shadowRoot?.activeElement) previous = previous.shadowRoot.activeElement;
        const originalValue = input.value, start = performance.now();
        input.focus({ preventScroll: true });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        timing.warmupInput = { start, dispatchDelay: start - warmupStart - Math.min(100, preparedWaitMs), duration: performance.now() - start, focused: input.getRootNode().activeElement === input, valueUnchanged: input.value === originalValue,
          unit: 'native input focus through two animation-frame boundaries; not a paint or physical-keyboard measurement' };
        input.blur(); if (previous?.isConnected) previous.focus?.({ preventScroll: true }); done();
      }, Math.min(100, preparedWaitMs)));
      await Promise.all([allowance, inputProbe]);
      if (timing.failure) throw new Error(timing.failure);
    }
    timing.warmupLongTasks = timing.longTasks.filter(task => task.start >= warmupStart);
    timing.readyToFirstOpenLongTasks = timing.longTasks.filter(task => task.start >= timing.ready);
    const backgroundSupported = typeof panel._startJsonPreparation === 'function';
    const preparedBeforeFirst = Boolean(panel._jsonReadyAt);
    if (mode === 'prepared' && backgroundSupported && (!preparedBeforeFirst || panel._jsonReadyAt > timing.ready + preparedWaitMs)) throw new Error(`Background preparation was not ready within the common ${preparedWaitMs}ms allowance`);
    if (mode === 'early' && panel._monaco) throw new Error('Early first opening was already initialized');
    phase('first-json-opening');
    const start = performance.now();
    await panel._switchTab('json');
    if (panel._tab !== 'json' || !panel._monaco) throw new Error('First JSON opening failed');
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    timing.readyToFirstOpenLongTasks = timing.longTasks.filter(task => task.start >= timing.ready);
    timing.firstOpen = { mode, duration: performance.now() - start, backgroundSupported, preparedBeforeFirst,
      unit: 'milliseconds through two animation-frame boundaries; not a paint measurement',
      idleAllowance: mode === 'prepared' ? preparedWaitMs : 0, readinessAfterNative: panel._jsonReadyAt == null ? null : panel._jsonReadyAt - timing.ready, preparationStages: panel._preparationStages || [] };
    phase('first-json-ready');
  };
  const findPanel = root => {
    const panel = root.querySelector?.('marao-dashboard-panel'); if (panel) return panel;
    for (const element of root.querySelectorAll?.('*') || []) if (element.shadowRoot) {
      const nested = findPanel(element.shadowRoot); if (nested) return nested;
    }
  };
  const began = performance.now();
  const observe = () => {
    timing.registered = Boolean(customElements.get('marao-dashboard-panel'));
    timing.panelScans = (timing.panelScans || 0) + 1;
    const panel = findPanel(document);
    if (panel) {
      timing.loadObserved = Boolean(panel._loading || panel._loadAttempted || panel._loaded);
      watch(panel).catch(error => { timing.failure = error.message; phase('failed'); });
    } else if (performance.now() - began > 60000) { timing.failure = 'Editor panel was not found'; phase('failed'); }
    else requestAnimationFrame(observe);
  };
  requestAnimationFrame(observe);
}

async function main() {
  const fixtureFile = option('--fixture'); assert.ok(fixtureFile && path.isAbsolute(fixtureFile), 'Pass the same absolute private --fixture path for both phases');
  assert.ok(fs.existsSync(fixtureFile), 'Prepare and install the exact safe fixture before measuring; the helper never writes source');
  const expectedHash = option('--expected-editor-sha256'); assert.match(expectedHash || '', /^[a-f0-9]{64}$/);
  const label = process.argv[2]; assert.match(label || '', /^[a-z-]+$/);
  const count = Number(option('--samples') || 3), cpus = (option('--cpu') || '1,4').split(',').map(Number);
  const selectedMode = option('--mode') || 'both', modes = selectedMode === 'both' ? ['early', 'prepared'] : [selectedMode];
  const preparedWaitMs = Number(option('--prepared-wait-ms') || 5000);
  assert.ok(Number.isInteger(count) && count >= 1 && count <= 10, '--samples must be between 1 and 10');
  assert.ok(cpus.length && new Set(cpus).size === cpus.length && cpus.every(cpu => [1, 4].includes(cpu)), '--cpu accepts 1, 4 or 1,4');
  assert.ok(modes.every(mode => ['early', 'prepared'].includes(mode)), '--mode accepts early, prepared or both');
  assert.ok(Number.isInteger(preparedWaitMs) && preparedWaitMs >= 0 && preparedWaitMs <= 60000, 'Invalid preparation allowance');
  const config = readConfig(); assert.equal(new URL(config.url).hostname, '192.168.0.28');
  // Baseline and candidate use installed assets and native browser caching.
  const client = await connect(config), saved = await client.call({ type: 'marao_dashboard/config/get' });
  const fixture = fs.readFileSync(fixtureFile, 'utf8'), samples = [];
  if (sha(saved.config) !== sha(fixture)) { client.close(); throw new Error('Installed configuration must exactly match the private fixture; measure startup with that source, not a later injected draft'); }
  const sourceBeforeSha256 = sha(saved.config), historyBeforeSha256 = sha(JSON.stringify(saved.history));
  let sourceAfterSha256, historyAfterSha256, measurementFailure, failureDiagnostics;
  const browser = await chromium.launch();
  try {
    for (const cpu of cpus) for (let sample = 0; sample < count; sample++) for (const mode of modes) {
      const context = await browser.newContext(iphone);
      await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
      await context.addInitScript(observeEditorTiming, { mode, preparedWaitMs });
      const page = await context.newPage(), session = await context.newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      let managementReads, activeReads, editorBody, responseFrames, currentTemperature, partialSample;
      let interactionStages = [], browserDiagnostics = [];
      const redact = value => String(value).replaceAll(config.token, '[redacted]');
      await page.exposeFunction('recordEditorInteractionStage', stage => { interactionStages.push({ ...stage, receivedAt: Date.now() }); });
      page.on('framenavigated', frame => {
        if (frame !== page.mainFrame()) return;
        const url = new URL(frame.url()); browserDiagnostics.push({ kind: 'main-frame-navigation', at: Date.now(), origin: url.origin, path: url.pathname, hash: url.hash });
      });
      page.on('crash', () => browserDiagnostics.push({ kind: 'page-crash', at: Date.now() }));
      page.on('close', () => browserDiagnostics.push({ kind: 'page-close', at: Date.now() }));
      page.on('pageerror', error => browserDiagnostics.push({ kind: 'page-error', at: Date.now(), message: redact(error.message), stack: redact(error.stack || '') }));
      page.on('console', message => { if (['warning', 'error'].includes(message.type())) browserDiagnostics.push({ kind: 'console-' + message.type(), at: Date.now(), message: redact(message.text()) }); });
      page.on('requestfailed', request => browserDiagnostics.push({ kind: 'failed-resource', at: Date.now(), path: new URL(request.url()).pathname, reason: request.failure()?.errorText }));
      page.on('response', response => {
        if (new URL(response.url()).pathname.endsWith('/MaraoDashboardPanel.js')) editorBody = response.body().then(sha);
      });
      page.on('websocket', socket => {
        socket.on('framesent', ({ payload }) => {
          const parsed = JSON.parse(payload);
          for (const message of Array.isArray(parsed) ? parsed : [parsed]) {
            if (message?.type === 'marao_dashboard/config/get') { const read = { id: message.id, scope: message.scope || 'full', requestAt: Date.now() }; managementReads.push(read); activeReads.set(message.id, read); }
          }
        });
        socket.on('framereceived', ({ payload }) => {
          const parsed = JSON.parse(payload), receivedAt = Date.now(), batch = Array.isArray(parsed), messages = batch ? parsed : [parsed];
          const matched = messages.filter(message => message?.type === 'result' && activeReads.has(message.id));
          if (!matched.length) return;
          const frameBytes = Buffer.byteLength(payload), frame = responseFrames.length;
          responseFrames.push({ frame, bytes: frameBytes, sharedFrame: batch, messageCount: messages.length,
            messageIds: matched.map(message => message.id), scopes: [...new Set(matched.map(message => activeReads.get(message.id).scope))] });
          for (const message of matched) {
            const read = activeReads.get(message.id), serializedMessageBytes = Buffer.byteLength(JSON.stringify(message));
            read.duration = receivedAt - read.requestAt; read.bytes = batch ? serializedMessageBytes : frameBytes;
            read.serializedMessageBytes = serializedMessageBytes; read.bytesKind = batch ? 'serialized-message' : 'single-frame';
            read.responseFrame = frame; read.success = message.success;
          }
        });
      });
      try {
        for (const temperature of ['cold', 'warm']) {
          managementReads = []; activeReads = new Map(); responseFrames = []; editorBody = null;
          currentTemperature = temperature; partialSample = null; interactionStages = []; browserDiagnostics = [];
          await page.goto(config.url + '/marao-dashboard-editor');
          const panel = page.locator('marao-dashboard-panel'); await panel.waitFor({ state: 'visible' });
          try {
            await page.waitForFunction(() => window.__editorTiming?.firstOpen || window.__editorTiming?.failure, null, { timeout: Math.max(60000, preparedWaitMs + 30000) });
          } catch (error) {
            failureDiagnostics = { cpu, sample, mode, temperature, timing: await page.evaluate(() => window.__editorTiming).catch(() => null), managementReads };
            throw error;
          }
          const timing = await page.evaluate(() => window.__editorTiming);
          if (timing.failure) failureDiagnostics = { cpu, sample, mode, temperature, timing, managementReads };
          assert.ok(!timing.failure, timing.failure);
          const actualSource = await panel.evaluate(p => p._source());
          assert.ok(isDeepStrictEqual(JSON.parse(actualSource), JSON.parse(fixture)), 'Initial source does not match the common large fixture');
          const editor = timing.initialResources.find(resource => /\/MaraoDashboardPanel.js\?/.test(resource.url)); assert.ok(editor);
          assert.ok(editorBody, 'The served editor body was not observed from navigation');
          const data = { ready: timing.ready, nativeControlReadyAt: timing.nativeControlReadyAt, startupLongTasks: timing.startupLongTasks, startupDecoding: timing.startupDecoding, decoding: timing.decoding,
            resources: timing.initialResources, warmupInput: timing.warmupInput, warmupLongTasks: timing.warmupLongTasks, readyToFirstOpenLongTasks: timing.readyToFirstOpenLongTasks, firstOpen: timing.firstOpen, editorSha256: await editorBody,
            assetFingerprint: new URL(editor.url).searchParams.get('v'), cpu, sample, temperature, mode, managementReads, responseFrames, interactionStages, browserDiagnostics };
          partialSample = data;
          assert.equal(data.editorSha256, expectedHash, 'Served editor does not match the declared baseline/candidate');
          if (mode === 'prepared') assert.ok(data.warmupInput?.focused && data.warmupInput.valueUnchanged, 'Native warmup input probe failed');
          assert.ok(data.firstOpen.preparationStages.every(stage => stage.start >= timing.nativeControlReadyAt), 'Optional computation preceded native readiness');
          const initial = managementReads.find(read => ['initial', 'full'].includes(read.scope)); assert.ok(initial?.duration != null);
          data.management = initial.duration;
          assert.ok(!managementReads.some(read => read.scope === 'history'), 'Speculative History read');
          data.interactions = await panel.evaluate(async p => {
            const original = p._source(), frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const timed = async operation => { const start = performance.now(); await operation(); await frames(); return performance.now() - start; };
            const stage = async name => { window.__editorTiming.interactionStage = name; await window.recordEditorInteractionStage({ name, at: performance.now() }); };
            await stage('return-visual');
            const returnVisual = await timed(() => p._switchTab('visual'));
            const rows = () => p.shadowRoot.querySelectorAll('.entity-row').length;
            const initialRows = rows(), forms = p.shadowRoot.querySelectorAll('ha-form').length;
            const index = p._model.pages.length - 1;
            const expansion = () => p.shadowRoot.querySelector(`[data-page-panel="${index}"]`);
            const expand = async value => { const e = expansion(); if (Boolean(e.expanded) !== value) e.shadowRoot.querySelector('[role="button"]').click(); await e.updateComplete; };
            await stage('expand');
            const interactionStart = performance.now(), firstExpansion = await timed(() => expand(true)), expandedRows = rows();
            const general = p.shadowRoot.querySelector('#general-form ha-form');
            await stage('delete');
            const localDelete = await timed(() => p._roomAction({ dataset: { action: 'card-delete', kind: 'page', room: `${index}:0`, card: '0' } }));
            const generalRetained = general === p.shadowRoot.querySelector('#general-form ha-form');
            await stage('move');
            const crossSection = await timed(() => p._commitCardMove(p._cardSource('page', `${index}:0`, 0), 1, 0));
            await stage('collapse');
            const collapse = await timed(() => expand(false)), collapsedControls = expansion().querySelector('.room-body')?.children.length;
            await stage('reopen');
            const reopen = await timed(() => expand(true));
            await stage('repeat-json');
            const repeatJson = await timed(() => p._switchTab('json'));
            const interactionEnd = performance.now(), interactionLongTasks = window.__editorTiming.longTasks.filter(e => e.start >= interactionStart && e.start < interactionEnd);
            await stage('restore-local-draft');
            p._monaco.setValue(original); await p._switchTab('visual');
            if (p._source() !== original) throw new Error('Read-only timing changed the local source');
            await stage('complete');
            return { returnVisual, initialRows, forms, firstExpansion, expandedRows, localDelete, generalRetained, crossSection, collapse, collapsedControls, reopen, repeatJson, interactionLongTasks,
              unit: 'milliseconds through two animation-frame boundaries; not a paint measurement' };
          });
          if (label.startsWith('after')) {
            assert.equal(data.interactions.generalRetained, true); assert.equal(data.interactions.collapsedControls, 0);
            assert.equal(data.interactions.expandedRows - data.interactions.initialRows, 12);
          }
          data.resourcesAfterFirst = await page.evaluate(() => performance.getEntriesByType('resource').map(e => ({ url: e.name, bytes: e.decodedBodySize, transferBytes: e.transferSize })));
          data.workers = page.workers().map(worker => worker.url());
          samples.push(data);
        }
      } catch (error) {
        failureDiagnostics = { cpu, sample, mode, temperature: currentTemperature, timing: await page.evaluate(() => window.__editorTiming).catch(() => null), managementReads, responseFrames, partialSample, interactionStages, browserDiagnostics, errorStack: redact(error.stack || '') };
        throw error;
      } finally { await context.close(); }
    }
  } catch (error) { measurementFailure = error; }
  finally {
    try {
      const after = await client.call({ type: 'marao_dashboard/config/get' });
      sourceAfterSha256 = sha(after.config); historyAfterSha256 = sha(JSON.stringify(after.history));
      assert.equal(sourceAfterSha256, sourceBeforeSha256, 'Timing changed saved source');
      assert.equal(historyAfterSha256, historyBeforeSha256, 'Timing changed History');
    } catch (error) { measurementFailure ||= error; }
    finally { client.close(); await browser.close(); }
  }
  const out = path.join(__dirname, '.artifacts/editor'); fs.mkdirSync(out, { recursive: true, mode: 0o700 });
  const completeDefaultCoverage = !measurementFailure && count === 3 && cpus.length === 2 && modes.length === 2 && preparedWaitMs === 5000 && samples.length === 24;
  fs.writeFileSync(path.join(out, 'timings-' + label + '.json'), JSON.stringify({ fixtureSha256: sha(fixture), sourceBeforeSha256, sourceAfterSha256,
    historyBeforeSha256, historyAfterSha256, completeDefaultCoverage, preparedWaitMs, failure: measurementFailure?.message || null, failureStack: measurementFailure?.stack?.replaceAll(config.token, '[redacted]') || null, failureDiagnostics, samples }, null, 2), { mode: 0o600 });
  if (measurementFailure) throw measurementFailure;
  for (const cpu of cpus) for (const mode of modes) for (const temperature of ['cold', 'warm']) {
    const runs = samples.filter(s => s.cpu === cpu && s.mode === mode && s.temperature === temperature);
    const median = key => Math.round(runs.map(s => key.split('.').reduce((v, k) => v[k], s)).sort((a, b) => a - b)[Math.floor(runs.length / 2)]);
    console.log(`${cpu}x/${temperature}/${mode}-first: native-ready ${median('ready')}ms; first JSON ${median('firstOpen.duration')}ms; local delete ${median('interactions.localDelete')}ms (${runs.length} serial samples)`);
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { largeFixture, timingVariant };
