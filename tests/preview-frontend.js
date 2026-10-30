const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { repoRoot, accessToken, setBrowserToken, assertCurrentFrontend } = require('../ha-test/client');
const { inspectionFor, selectComponents } = require('./verification-map');

const cardSelector = 'marao-card,marao-navbar-card,marao-state-timeline-card,marao-energy-period-card,marao-camera-events-card,marao-frigate-events-card';

function parseArgs(argv = process.argv.slice(2)) {
  const options = { components: [], families: [], scenario: 'iphone-normal', theme: 'light', watch: false, once: false };
  for (let index = 0; index < argv.length; index++) {
    const separator = argv[index].indexOf('=');
    const flag = separator < 0 ? argv[index] : argv[index].slice(0, separator);
    const inline = separator < 0 ? undefined : argv[index].slice(separator + 1);
    if (['--watch', '--once', '--help'].includes(flag) && inline === undefined) { options[flag.slice(2)] = true; continue; }
    if (!['--component', '--family', '--scenario', '--theme'].includes(flag)) throw new Error('Unknown preview option: ' + flag);
    const value = inline ?? argv[++index];
    if (!value || value.startsWith('--')) throw new Error(flag + ' requires a value.');
    if (flag === '--component' || flag === '--family') options[flag === '--component' ? 'components' : 'families'].push(...value.split(',').filter(Boolean));
    else options[flag.slice(2)] = value;
  }
  if (options.help) return options;
  if (options.components.includes('json-editor')) throw new Error('The Marao JSON builder is retired. Use Home Assistant native card YAML or dashboard raw configuration.');
  if (!options.components.length) throw new Error('Preview requires --component; there is no implicit full-gallery preview.');
  if (options.watch && options.once) throw new Error('--watch and --once cannot be combined.');
  const inspection = inspectionFor(selectComponents([], options.components));
  if (options.families.length) {
    if (inspection.editor) throw new Error('Editor previews do not select runtime card families.');
    const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot,'custom_components/marao_dashboard/frontend/marao-catalog.json'),'utf8'));
    const allowed = new Set([...catalog.cards.map(card=>card.id), 'marao-navbar-card']);
    for (const family of options.families) {
      if (!allowed.has(family)) throw new Error('Unknown preview family: ' + family);
      if (inspection.families.length && !inspection.families.includes(family)) throw new Error(family + ' is outside the selected components.');
    }
    inspection.families = [...new Set(options.families)];
    inspection.unresolved = [];
  }
  if (inspection.unresolved?.length) throw new Error('Choose a representative --family for: ' + inspection.unresolved.join(', '));
  if (!inspection.editor && !inspection.families.length) throw new Error('Selected components have no visual preview.');
  if (inspection.editor && inspection.families.length) throw new Error('Preview editor and card changes separately to keep the selected view focused.');
  const { selectedRuns } = require('./test-ha-dashboard-accessibility');
  return { ...options, inspection, ...selectedRuns(options)[0] };
}

function selectExamples(cards, families) {
  return families.map(family => {
    const card = cards.find(candidate => candidate.visible && (candidate.template || candidate.tag) === family);
    if (!card) throw new Error('No rendered safe gallery example for ' + family);
    return card;
  });
}

function previewRoute(dashboard, families) {
  const candidates = [];
  for (const [index, view] of (dashboard.views || []).entries()) {
    const route = String(view.path ?? index);
    if (route === 'card-test' || view.visible === false || !/^[a-zA-Z0-9_-]+$/.test(route)) continue;
    const found = new Set();
    let count = 0;
    const visit = card => {
      if (!card || typeof card !== 'object') return;
      if (card.type === 'conditional' || card.type === 'custom:marao-popup-card' || card.visibility?.length) { count++; return; }
      if (['vertical-stack', 'horizontal-stack', 'grid', 'custom:marao-control-grid'].includes(card.type)) { (card.cards || []).forEach(visit); return; }
      count++;
      if (card.template) found.add(card.template);
      else if (card.type?.startsWith('custom:marao-')) found.add(card.type.slice('custom:'.length));
    };
    (view.cards || []).forEach(visit);
    for (const section of view.sections || []) if (!section.visibility?.length) (section.cards || []).forEach(visit);
    if (families.every(family => found.has(family))) candidates.push({ route, count });
  }
  return candidates.sort((left, right) => left.count - right.count)[0]?.route || 'card-test';
}

function editableFrontendFile(root, filename) {
  if (!filename) return true;
  const relative = String(filename).replaceAll('\\', '/');
  if (relative.split('/').some(part => part.startsWith('.')) || /(?:~|\.sw[op])$/.test(relative)) return false;
  if (root === 'frontend_src') return true;
  if (relative === 'marao-owned-assets.json') return false;
  // Generated bundles follow source edits; watching them would rebuild each save twice.
  return !/^(?:assets\/|.*\.LICENSE\.txt$|Marao(?:Dashboard(?:Settings|Panel|EditorLabels|JsonEditor|JsonPreparation|EditorWorker|JsonWorker)|Native(?:Bootstrap|Catalog|CardEditor|Cards|Model|Dashboard)|OrdinaryMigration|Theme|SourceImport|History(?:Data|Chart))\.(?:js|css)$)/.test(relative);
}

function createRefreshQueue(refresh, { delay = 250, onError = () => {} } = {}) {
  let timer, running, pending = false, closed = false;
  const request = () => {
    if (closed) return;
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(() => { flush().catch(onError); }, delay);
  };
  const flush = async () => {
    clearTimeout(timer);
    if (running) return running;
    running = (async () => {
      while (pending && !closed) { pending = false; await refresh(); }
    })();
    try { await running; }
    finally { running = undefined; if (pending && !closed) request(); }
  };
  return { request, flush, async close() {
    clearTimeout(timer);
    try { await flush(); } finally { closed = true; clearTimeout(timer); }
  } };
}

function monitorDiagnostics(page, output, report) {
  const errors = [], diagnostics = [], pending = new Set();
  let reloadRequests = new Set();
  const record = (kind, message, failure = true) => {
    const diagnostic = { at: new Date().toISOString(), kind, message };
    diagnostics.push(diagnostic);
    if (failure) errors.push(diagnostic);
    fs.writeFileSync(path.join(output, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2), { mode: 0o600 });
    if (failure) report('Preview diagnostic: ' + kind + '. Details retained in ' + path.join(output, 'diagnostics.json'));
  };
  page.on('request', request => pending.add(request));
  page.on('requestfinished', request => { pending.delete(request); reloadRequests.delete(request); });
  page.on('pageerror', error => record('page error', error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) record(message.type(), message.text()); });
  page.on('requestfailed', request => {
    const cancelledByReload = reloadRequests.has(request) && request.failure()?.errorText === 'net::ERR_ABORTED';
    record(cancelledByReload ? 'pending request cancelled by preview reload' : 'failed resource', new URL(request.url()).pathname + ': ' + request.failure()?.errorText, !cancelledByReload);
    pending.delete(request); reloadRequests.delete(request);
  });
  page.on('response', response => { if (response.status() >= 400) record('HTTP ' + response.status(), new URL(response.url()).pathname); });
  return { errors, willReload() { reloadRequests = new Set(pending); } };
}

async function inspect(page, options, version, output, prepared) {
  const { readySubtree, visualVariablesForScenario } = require('./test-ha-dashboard-accessibility');
  const { scenario, theme, inspection } = options;
  let targets;
  if (inspection.editor) {
    if (prepared.mode === 'native') {
      await page.locator('hui-root').waitFor({state:'attached'});
      await assertCurrentFrontend(page,version);
      if (prepared.authoring === 'ordinary') {
        await page.locator('hui-root').evaluate(root=>root.lovelace.setEditMode(true));
        targets=[{locator:page.locator('hui-root'),family:'native-editor'}];
      } else {
        targets=[{locator:page.locator('marao-migration-card'),family:'conversion'}];
        await targets[0].locator.waitFor({state:'visible'});
      }
    } else {
    const panel = page.locator('marao-dashboard-panel');
    await panel.waitFor({ state: 'visible' });
    await page.waitForFunction(element => element._loaded && element._visualReady && !element._busy, await panel.elementHandle());
    if (inspection.components.includes('json-editor')) {
      await panel.locator('[data-tab="json"]').click();
      await page.waitForFunction(element => element._tab === 'json' && element._monaco, await panel.elementHandle());
    }
    const urls = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name));
    for (const file of ['MaraoDashboardPanel.js', ...(inspection.components.includes('json-editor') ? ['MaraoDashboardJsonEditor.js'] : [])]) {
      assert.ok(urls.some(value => { const url = new URL(value); return /^[a-f0-9]{64}$/.test(version) ? url.pathname.endsWith('/'+version+'--'+file) : url.pathname.endsWith('/' + file) && url.searchParams.get('v') === version; }), 'Editor loaded stale ' + file);
    }
    targets = [{ locator: panel, family: 'editor' }];
    }
  } else {
    const locator = page.locator(cardSelector);
    await locator.first().waitFor({ state: 'visible' });
    await assertCurrentFrontend(page, version);
    const cards = await locator.evaluateAll(elements => elements.map((element, index) => ({ index, tag: element.localName,
      template: element._config?.template, visible: element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0 })));
    targets = selectExamples(cards, inspection.families).map(card => ({ locator: locator.nth(card.index), family: card.template || card.tag }));
  }
  await page.evaluate(variables => {
    for (const [name, value] of Object.entries(variables)) document.documentElement.style.setProperty(name, value, 'important');
  }, visualVariablesForScenario(scenario, theme));
  for (const target of targets) {
    await readySubtree(page, target.locator, scenario, theme);
    await target.locator.scrollIntoViewIfNeeded();
    if (options.once) await page.screenshot({ path: path.join(output, target.family + '.png'), scale: 'css' });
  }
  await targets[0].locator.scrollIntoViewIfNeeded();
  const errorCards = page.locator('hui-error-card,hui-warning');
  if (await errorCards.count()) throw new Error('The selected view contains Home Assistant error/warning cards.');
  console.log('Installed frontend ' + version + ': ' + targets.map(target => target.family).join(', ') + '. Visual inspection required.');
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('npm run ha:preview -- --component <ids> [--family <templates>] [--watch | --once] [--scenario <profile>] [--theme light|dark]\nSynchronizes current frontend assets to the disposable instance; --once saves private screenshots and does not certify visual correctness.');
    return;
  }
  const { prepareFrontend } = require('../ha-test/prepare-frontend');
  const { chromium } = require('playwright');
  const { contextOptionsForScenario, configurePageEmulation } = require('./test-ha-dashboard-accessibility');
  const prepared = await prepareFrontend();
  assert.equal(new URL(prepared.config.url).hostname, '192.168.0.28', 'Preview is restricted to the disposable instance.');
  const route = options.inspection.editor ? prepared.editorURL || '/marao-dashboard-editor' : '/marao-dashboard/' + previewRoute(prepared.previewDashboard || prepared.dashboard, options.inspection.families);
  const output = require('./verification-browser').artifactDirectory('frontend-preview/' + Date.now());
  const browser = await chromium.launch({ headless: options.once });
  let queue, failed = false;
  const watchers = [];
  try {
    const report = message => { failed = true; console.error(message); };
    const context = await browser.newContext(contextOptionsForScenario(options.scenario, options.theme));
    await context.addInitScript(setBrowserToken, { hassUrl: prepared.config.url, ...accessToken(prepared.config) });
    const page = await context.newPage();
    await configurePageEmulation(context, page, options.scenario);
    const diagnostics = monitorDiagnostics(page, output, report);
    console.log('Preview route: ' + route);
    await page.goto(prepared.config.url + route, { waitUntil: 'domcontentloaded' });
    await inspect(page, options, prepared.version, output, prepared);
    if (diagnostics.errors.length) throw new Error('Preview has browser diagnostics; inspect ' + output);
    if (options.once) { console.log('Preview captures: ' + output); return; }
    if (options.watch) {
      queue = createRefreshQueue(async () => {
        const errorCount = diagnostics.errors.length;
        diagnostics.willReload();
        const current = await prepareFrontend();
        if (page.isClosed() || !browser.isConnected()) return;
        await page.reload({ waitUntil: 'domcontentloaded' });
        await inspect(page, options, current.version, output, current);
        if (diagnostics.errors.length > errorCount) throw new Error('Refreshed preview has browser diagnostics; inspect ' + output);
      }, { onError: error => report(error.message) });
      for (const root of ['frontend_src', 'custom_components/marao_dashboard/frontend', 'custom_components/marao_dashboard/themes']) {
        watchers.push(fs.watch(path.join(repoRoot, root), { recursive: true }, (_, filename) => { if (editableFrontendFile(root, filename)) queue.request(); }));
      }
    }
    console.log((options.watch ? 'Watching frontend edits. ' : '') + 'Close the browser when finished. No actions or full-gallery checks run.');
    await new Promise(resolve => { browser.once('disconnected', resolve); page.once('close', resolve); });
  } finally {
    watchers.forEach(watcher => watcher.close());
    try { await queue?.close(); } finally { await browser.close(); }
    if (failed) process.exitCode = 1;
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { createRefreshQueue, editableFrontendFile, main, monitorDiagnostics, parseArgs, previewRoute, selectExamples };
