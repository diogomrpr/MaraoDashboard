const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const { chromium } = require('playwright');
const { readConfig, assertDisposableHaTarget, api, connect, accessToken, setBrowserToken, assertCurrentFrontend } = require('../ha-test/client');
const { prepare, restart, ssh, haYamlOptions, restoreHelperStates } = require('../ha-test/prepare');
const { parseArgs, selectedRuns, contextOptionsForScenario, configurePageEmulation, applyVisualPreferences, layoutIssues, emulationIssues } = require('./test-ha-dashboard-accessibility');

const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";
const rootRoute = 'marao-dashboard';
const output = path.join(process.env.MARAO_TEST_ARTIFACT_ROOT || path.join(__dirname, '.artifacts'), 'native');
const { nativeBackup } = require('./native-backup');
const walk = (value, visit) => {
  if (Array.isArray(value)) value.forEach(child => walk(child, visit));
  else if (value && typeof value === 'object') { visit(value); Object.values(value).forEach(child => walk(child, visit)); }
};

async function openBrowser(config, run) {
  const browser = await chromium.launch();
  try {
  const context = await browser.newContext(contextOptionsForScenario(run.scenario, run.theme));
  await context.addInitScript(setBrowserToken, { hassUrl: config.url, ...accessToken(config) });
  const page = await context.newPage();
  const cameraLedger = await require('./camera-request-ledger').managedCameraLedger(context, page, {
    output: path.join(output, 'sessions', crypto.randomUUID()), scenario: run.scenario.name, theme: run.theme,
  });
  await configurePageEmulation(context, page, run.scenario);
  const issues = [], calls = [];
  page.on('pageerror', error => issues.push(error.message));
  page.on('console', message => { if (['warning', 'error'].includes(message.type())) issues.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) issues.push('HTTP ' + response.status() + ': ' + new URL(response.url()).pathname); });
  page.on('websocket', socket => socket.on('framesent', ({ payload }) => {
    let message; try { message = JSON.parse(String(payload)); } catch { return; }
    if (message.type !== 'call_service') return;
    const entity = message.target?.entity_id || message.service_data?.entity_id;
    const entities = Array.isArray(entity) ? entity : [entity];
    assert.ok(entities.length && entities.every(id => typeof id === 'string' && id.includes('.marao_dashboard_test_')), 'Native proof attempted a non-fixture service');
    calls.push({ domain: message.domain, service: message.service, entity }); // Never record service data/PINs.
  }));
  return { browser, context, page, issues, calls, cameraLedger, close: async () => {
    const errors = [];
    try { await context.close(); } catch (error) { errors.push(error); }
    try { await browser.close(); } catch (error) { errors.push(error); }
    try { await cameraLedger.assert(); assert.deepEqual(issues, [], 'Native browser warnings/errors after release'); } catch (error) { errors.push(error); }
    if (errors.length) throw new AggregateError(errors, 'Native browser release/close diagnostics failed');
  } };
  } catch (error) {
    try { await browser.close(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Native browser setup/cleanup failed'); }
    throw error;
  }
}

async function waitCards(page) {
  await page.locator('marao-navbar-card:not([data-marao-navbar-placeholder]) .nav').waitFor();
  await page.waitForFunction(() => {
    function ready(root) {
      for (const e of root?.children || []) {
        if (e.localName.startsWith('marao-native-') && (e._loading || !e._children?.length)) return false;
        if (!ready(e.shadowRoot) || !ready(e)) return false;
      }
      return true;
    }
    return ready(document);
  });
}

async function touch(page, target, duration = 0, end) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  assert.ok(box && box.width >= 48 && box.height >= 48, 'Native action needs a visible 48px target');
  const start = { x: box.x + (end ? 24 : box.width / 2), y: box.y + box.height / 2 };
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    if (end) for (const fraction of [.1, .3, .6, 1]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [
      { x: start.x + (end.x === 'full' ? box.width - 48 : end.x) * fraction, y: start.y + (end.y || 0) * fraction },
    ] });
    if (duration) await page.waitForTimeout(duration);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await session.detach(); }
}

async function creation(page, config) {
  await page.goto(config.url + '/config/lovelace/dashboards');
  await page.getByRole('button', { name: /Add dashboard|Adicionar painel/i }).click();
  await page.getByText('Marao', { exact: true }).click();
  await page.getByRole('textbox', { name: /Title|Título/i }).fill('Marao Native');
  await page.getByRole('textbox', { name: /URL/i }).fill(rootRoute);
  await page.getByRole('button', { name: /Create|Criar/i, exact: true }).click();
  await page.locator('ha-dialog-lovelace-dashboard-detail').waitFor({ state: 'detached' });
  await page.waitForFunction(route => Boolean(document.querySelector('home-assistant')?.hass.panels?.[route]), rootRoute);
  await page.goto(config.url + '/' + rootRoute + '/home');
  await waitCards(page); await assertCurrentFrontend(page);
  await page.locator('marao-native-navbar-card .native-edit').click();
  await page.getByRole('button', { name: /Take control|Assumir controlo|Assumir controle/i }).click();
  await page.getByRole('button', { name: /Done|Concluído|Concluir/i, exact: true }).click();
  await waitCards(page);
}

function fixtureDashboard(starter, { overflow = false } = {}) {
  if (overflow) {
    const paths = ["home","card-test","rooms","energy","security","media","wallbox","studio"];
    const routes = paths.map(path => ({url:"/marao-dashboard/"+path,label:path,icon:"mdi:home",future:{keep:[]}}));
    return {...starter, views:paths.map(path => ({type:"sections",path,title:path,theme:"Marao Dashboard",max_columns:1,sections:[{type:"grid",cards:[
      {type:"custom:marao-native-light-card",entity:"light.marao_dashboard_test_onoff_light",name:"Safe light"},
      {type:"custom:marao-native-navbar-card",native:true,routes},
    ]}]}))};
  }
  const { nativeCases } = require('../ha-test/native-cases');
  const { expandGallery, manifest, walkCards } = require('../ha-test/cases');
  const gallery = expandGallery(YAML.parse(fs.readFileSync(path.join(__dirname, '../ha-test/dashboard/views/00-card-test.yaml'), 'utf8')));
  const cards = nativeCases(gallery, manifest, walkCards);
  const byRole = role => cards.find(card => card.type === 'custom:marao-native-' + role + '-card');
  const selected = ['light', 'climate', 'media', 'security', 'entity-group', 'access-slide-action', 'vacuum', 'camera', 'energy-period'].map(byRole);
  assert.ok(selected.every(Boolean));
  selected.push(cards.find(card => card.name === 'Native media duplicate'), cards.find(card => card.name === 'Native unavailable light'));
  const navbar = { type: 'custom:marao-native-navbar-card', native: true, routes: [
    { url: '/marao-dashboard/home', label: 'Home', icon: 'mdi:home' },
    { url: '/marao-dashboard/card-test', label: 'Cases', icon: 'mdi:flask' },
  ] };
  return { ...starter, views: [
    { type: 'sections', path: 'home', title: 'Home', theme: 'Marao Dashboard', max_columns: 1,
      sections: [{ type: 'grid', cards: selected.map(card => ({ ...card, grid_options: { columns: 12, rows: 'auto' } })) }, { type: 'grid', cards: [navbar] }] },
    { type: 'sections', path: 'card-test', title: 'Cases', theme: 'Marao Dashboard', max_columns: 1,
      sections: [{ type: 'grid', cards: cards }, { type: 'grid', cards: [structuredClone(navbar)] }] },
  ] };
}

async function interactions(page, calls, cameraLedger) {
  const sheet = page.locator('.marao-popup-sheet');
  const light = page.locator('marao-native-light-card').first();
  const initial = await light.evaluate(card => ({ entity: card._config.entity, state: card._hass.states[card._config.entity].state }));
  assert.ok(initial.entity.startsWith('light.marao_dashboard_test_'));
  const lightCalls = calls.filter(call => call.entity === initial.entity).length;
  await light.locator('marao-card ha-card').tap({ position: { x: 24, y: 24 } });
  await page.waitForFunction(({ entity, state }) => document.querySelector('home-assistant').hass.states[entity].state !== state, initial);
  assert.equal(calls.filter(call => call.entity === initial.entity).length, lightCalls + 1, 'Inline native lighting lost its exactly-once default action');
  for (const role of ['climate', 'media', 'entity-group', 'camera', 'energy-period']) {
    const host = page.locator('marao-native-' + role + '-card').first();
    const trigger = host.locator('marao-card ha-card, marao-energy-period-card .surface').first();
    console.log('Opening native ' + role + ' sheet.');
    await trigger.click();
    await sheet.waitFor().catch(async () => {
      const composition = await host.evaluate(card => ({ preview: card.preview, location: location.hash,
        children: card._children.map(child => ({ type: child.localName, connected: child._hass?.connected, connection: child._hass?.connection?.connected,
        popup: child._config?.popup, hash: child._config?.hash, popup_hash: child._config?.popup_hash,
        target: child._config?.tap_action?.navigation_path })) }));
      throw Error(role + ' sheet did not open: ' + JSON.stringify(composition));
    });
    await sheet.locator('marao-card, marao-energy-period-card, marao-camera-events-card').first().waitFor();
    const close = () => page.locator('.marao-popup-close').click();
    if (role === 'camera') {
      const entity = await host.evaluate(card => card._config.entity);
      await cameraLedger.boundary('close native camera popup', close, { terminal: false, entities: [entity] });
    } else await close();
    await sheet.waitFor({ state: 'detached' });
  }
  const media = page.locator('marao-native-media-card');
  const hashes = await media.evaluateAll(cards => cards.map(card => card._children.find(child => child.localName === 'marao-popup-card')._config.hash));
  assert.equal(new Set(hashes).size, 2, 'Duplicate media cards share a popup');
  const unavailable = page.locator('marao-native-light-card').filter({ hasText: 'Native unavailable light' });
  assert.equal(await unavailable.locator('input').getAttribute('disabled'), '');
  const opener = page.locator('marao-native-access-slide-action-card .track');
  const before = calls.length;
  await touch(page, opener, 0, { x: 25 });
  await touch(page, opener, 0, { x: 10, y: 70 });
  assert.equal(calls.length, before, 'Cancelled native slide dispatched');
  await touch(page, opener, 0, { x: 'full' });
  await page.waitForTimeout(300);
  assert.equal(calls.length, before + 1, 'Native access completion must dispatch once');
  // A completed access slide intentionally suppresses its trailing accidental
  // tap. Start the independent alarm interaction after that guard expires.
  await page.waitForTimeout(700);
  console.log('Checking native alarm guards and PIN clearing.');
  await page.locator('marao-native-security-card marao-card ha-card').tap(); await sheet.waitFor();
  const pin = sheet.locator('[data-alarm-code]'); await pin.fill('1357');
  await touch(page, sheet.locator('[data-alarm-action="alarm_arm_away"]'));
  await page.waitForFunction(() => document.querySelector('home-assistant').hass.states['alarm_control_panel.marao_dashboard_test_alarm'].state === 'armed_away');
  assert.equal(await pin.inputValue(), '');
  const armedCalls = calls.length;
  await pin.fill('1357');
  await touch(page, sheet.locator('[data-alarm-action="alarm_disarm"]'), 120);
  assert.equal(calls.length, armedCalls, 'Cancelled native alarm hold dispatched');
  await touch(page, sheet.locator('[data-alarm-action="alarm_disarm"]'), 1350);
  await page.waitForFunction(() => document.querySelector('home-assistant').hass.states['alarm_control_panel.marao_dashboard_test_alarm'].state === 'disarmed');
  assert.equal(calls.length, armedCalls + 1);
  assert.equal(await pin.inputValue(), '');
  await page.locator('.marao-popup-close').click();
  assert.equal(await page.locator('[data-alarm-code]').count(), 0);
}

async function editor(page, calls, theme) {
  await page.locator('marao-native-navbar-card .native-edit').tap();
  await page.getByRole('button', { name: /Done|Concluído|Concluir/i, exact: true }).waitFor();
  assert.ok(await page.locator('hui-root').evaluate(root => root.lovelace.editMode));
  const options = page.locator('hui-card-edit-mode').filter({ has: page.locator('marao-native-vacuum-card') }).first();
  await options.tap();
  await page.locator('marao-native-card-editor').waitFor();
  const visual = page.locator('marao-native-card-editor');
  const before = calls.length;
  const preview = page.locator('hui-dialog-edit-card marao-native-vacuum-card');
  assert.equal(await preview.evaluate(card => card.preview), true);
  await preview.evaluate(card => card._children[0]._callService('vacuum', 'start', { entity_id: 'vacuum.marao_dashboard_test_vacuum_commands' }));
  assert.equal(calls.length, before, 'Native preview allowed shared service dispatch');
  const editedName = 'Native vacuum edited ' + theme;
  await visual.evaluate(editor => editor.addEventListener('config-changed', event => {
    editor.dataset.validatedName = event.detail.config.name;
  }));
  await visual.getByRole('textbox', { name: 'Name', exact: true }).fill(editedName);
  await page.locator('marao-native-card-editor[data-validated-name="' + editedName + '"]').waitFor();
  await page.getByRole('button', { name: /Show code editor|Mostrar editor de código/i }).tap();
  await page.getByRole('button', { name: /Show visual editor|Mostrar editor visual/i }).waitFor();
  const yamlEditor = page.locator('ha-yaml-editor').filter({ visible: true });
  await yamlEditor.waitFor();
  const yamlConfig = YAML.parse(await yamlEditor.evaluate(editor => editor.yaml));
  assert.equal(yamlConfig.name, editedName);
  assert.deepEqual(yamlConfig.variables.action_1.data.params, [{ segments: [21], repeat: 2 }]);
  assert.deepEqual(yamlConfig.future, { keep: [] });
  await page.getByRole('button', { name: /Show visual editor|Mostrar editor visual/i }).tap();
  await visual.waitFor();
  assert.equal(calls.length, before, 'Editor preview dispatched a service');
  await page.getByRole('button', { name: /^(Save|Guardar|Salvar)$/i, exact: true }).tap();
  await page.getByRole('button', { name: /Done|Concluído|Concluir/i, exact: true }).tap();
  await waitCards(page);
}

async function main() {
  const config = readConfig(); assertDisposableHaTarget(config, { requireSsh: true });
  assert.equal(new URL(config.url).hostname, '192.168.0.28');
  await prepare(config);
  const options = parseArgs();
  // A normal run covers one representative layout in both themes. Larger scope
  // must be selected explicitly, without running the full mobile matrix.
  const profilesIndex = process.argv.indexOf('--profiles');
  const profiles = profilesIndex < 0 ? [options.scenario || 'iphone-normal'] : process.argv[profilesIndex + 1]?.split(',');
  assert.ok(profiles?.length && profiles.every(Boolean), 'Select explicit native mobile profiles');
  assert.ok(profilesIndex < 0 || !options.scenario, 'Choose --profiles or --scenario');
  const runs = profiles.flatMap(scenario => selectedRuns({ ...options, scenario }));
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  const operation = crypto.randomUUID();
  const paths = ['configuration.yaml', 'dashboard/MaraoDashboard', 'custom_components/marao_dashboard', 'themes/MaraoDashboard',
    '.storage/lovelace_dashboards', '.storage/lovelace.marao-dashboard', '.storage/lovelace.marao_dashboard'];
  const remote = nativeBackup(config, operation, paths);
  const report = { operation, kind: 'native-editing-scoped', themes: runs.map(run => run.theme), profiles: runs.map(run => run.scenario.name), assertions: [], verified_cleanup: false };
  const reportFile = path.join(output, operation + '.json');
  const save = () => fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  let backup, ws, active, baselineSource, stagedSource, baselineDashboards, initialHelpers, primaryError, creating = false;
  try {
    ws = await connect(config);
    const dashboards = await ws.call({ type: 'lovelace/dashboards/list' });
    baselineDashboards = dashboards.filter(d => d.url_path !== rootRoute);
    const states = await ws.call({ type: 'get_states' });
    const helper = require('../ha-test/cases').expandHelpers(YAML.parse(fs.readFileSync(path.join(__dirname, '../ha-test/marao_dashboard_card_test_helpers.yaml'), 'utf8')));
    const helperIds = new Set(['input_boolean', 'input_number', 'input_select', 'input_text'].flatMap(domain => Object.keys(helper[domain] || {}).map(id => domain + '.' + id)));
    initialHelpers = Object.fromEntries(states.filter(state => helperIds.has(state.entity_id)).map(state => [state.entity_id, state.state]));
    fs.writeFileSync(reportFile + '.helpers', JSON.stringify(initialHelpers), { mode: 0o600 });
    assert.deepEqual(dashboards.filter(d => d.url_path.startsWith('marao-')).map(d => [d.url_path, d.mode]), [[rootRoute, 'yaml']]);
    backup = remote({ mode: 'backup', paths }); save();
    const source = ssh(config, 'cat ' + quote(config.remoteConfigPath + '/configuration.yaml')).stdout;
    baselineSource = source;
    const document = YAML.parseDocument(source, haYamlOptions);
    assert.equal(document.errors.length, 0); assert.ok(document.hasIn(['lovelace', 'dashboards', rootRoute]));
    document.deleteIn(['lovelace', 'dashboards', rootRoute]);
    stagedSource = document.toString();
    const staged = config.remoteConfigPath + '/configuration.yaml.native-stage';
    ssh(config, 'umask 077 && cat > ' + quote(staged) + ' && mv ' + quote(staged) + ' ' + quote(config.remoteConfigPath + '/configuration.yaml'), { input: stagedSource });
    ws.close(); ws = null;
    await restart(config);
    active = await openBrowser(config, runs[0]);
    // Loading an existing HA dashboard first loads the registered module resource.
    await active.page.goto(config.url + '/lovelace');
    await active.page.waitForFunction(() => customElements.get('ll-strategy-dashboard-marao-starter'));
    creating = true; await creation(active.page, config);
    ws = await connect(config);
    const frozen = await ws.call({ type: 'lovelace/config', url_path: rootRoute, force: true });
    assert.deepEqual(frozen.marao, { mode: 'native', version: 1 });
    walk(frozen, card => { assert.ok(!card.strategy, 'Take control retained a nested strategy'); if (card.type) assert.ok(!JSON.stringify(card).includes('!include')); });
    const builderBefore = remote({ mode: 'snapshot', paths: ['dashboard/MaraoDashboard'] });
    await assert.rejects(api(config, 'POST', '/api/services/marao_dashboard/generate_dashboard', {}));
    const builder = await ws.call({ type: 'marao_dashboard/config/get' });
    await assert.rejects(ws.call({ type: 'marao_dashboard/config/generate', config: builder.config }));
    assert.ok(builder.history.length);
    await assert.rejects(ws.call({ type: 'marao_dashboard/history/restore', version: builder.history[0].version }));
    assert.deepEqual((await remote({ mode: 'snapshot', paths: ['dashboard/MaraoDashboard'] })).files, builderBefore.files);
    assert.deepEqual(await ws.call({ type: 'lovelace/config', url_path: rootRoute, force: true }), frozen);
    const navbarOnly = process.argv.includes("--navbar-only");
    const fixture = fixtureDashboard(frozen, {overflow:navbarOnly});
    const vacuum = fixture.views[0].sections[0].cards.find(card => card.type === 'custom:marao-native-vacuum-card');
    if (!navbarOnly) {
    vacuum.entity = 'vacuum.marao_dashboard_test_vacuum_commands';
    vacuum.variables ||= {};
    vacuum.variables.action_1 = { name: 'Living room', icon: 'mdi:sofa', on_action: 'vacuum.send_command',
      data: { command: 'app_segment_clean', params: [{ segments: [21], repeat: 2 }] } };
    vacuum.future = { keep: [] };
    }
    await ws.call({ type: 'lovelace/config/save', url_path: rootRoute, config: fixture });
    await active.close(); active = null;
    report.assertions.push('native creation, expanded Take control, builder generation/history exclusion'); save();
    console.log('Native creation, Take control and ownership guards passed.');
    for (const run of runs) {
      console.log('Checking native cards: ' + run.scenario.name + ' ' + run.theme);
      active = await openBrowser(config, run);
      await api(config, 'POST', '/api/services/input_select/select_option', { entity_id: 'input_select.marao_dashboard_test_alarm', option: 'disarmed' });
      await active.page.goto(config.url + '/marao-dashboard/home'); await waitCards(active.page);
      await applyVisualPreferences(active.page, run.scenario, run.theme);
      assert.deepEqual(await emulationIssues(active.page, run.scenario, run.theme), []);
      assert.deepEqual(await layoutIssues(active.page), []);
      if (run.scenario.name === 'iphone-normal') {
        if (navbarOnly) await require('./test-ha-navbar-overflow').nativeEditor(active.page, active.calls, run.theme);
        else { await interactions(active.page, active.calls, active.cameraLedger); await editor(active.page, active.calls, run.theme); }
      }
      await active.page.locator('marao-native-navbar-card').evaluate(card => {
        card.hass = { ...card._hass, user: { ...card._hass.user, is_admin: false } };
      });
      assert.equal(await active.page.locator('.native-edit').count(), 0, 'Non-administrator sees Edit dashboard');
      if (navbarOnly) {
        await active.page.locator('marao-navbar-card:not([data-marao-navbar-placeholder]) [data-overflow]').tap();
        await active.page.locator('marao-navbar-card:not([data-marao-navbar-placeholder]) .overflow a').first().waitFor();
        await active.page.keyboard.press('Escape');
      }
      assert.deepEqual(active.issues, [], 'Native browser warnings/errors');
      if (['iphone-normal', 'narrow-320', 'iphone-bold-text-200', 'iphone-landscape', 'android-normal'].includes(run.scenario.name)) {
        await active.page.locator(navbarOnly ? 'marao-native-light-card' : 'marao-native-climate-card').first().scrollIntoViewIfNeeded();
        await active.page.screenshot({ path: path.join(output, run.scenario.name + '-' + run.theme + '.png'), scale: 'css' });
      }
      const coverage = run.scenario.name === 'iphone-normal' ? 'sheets, guards, visual/YAML, layout and viewer presentation' : 'layout and viewer presentation';
      await active.close(); active = null;
      report.assertions.push(run.scenario.name + ' ' + run.theme + ': ' + coverage); save();
    }
    const saved = await ws.call({ type: 'lovelace/config', url_path: rootRoute, force: true });
    const ordinary = structuredClone(saved); delete ordinary.marao;
    await ws.call({ type: 'lovelace/config/save', url_path: rootRoute, config: ordinary });
    active = await openBrowser(config, runs[0]);
    await active.page.goto(config.url + '/marao-dashboard/home'); await waitCards(active.page);
    await active.page.waitForFunction(() => {
      const find = root => {
        for (const e of root?.children || []) {
          if (e.localName === 'hui-root') return e;
          const found = find(e.shadowRoot) || find(e); if (found) return found;
        }
      };
      const root = find(document);
      return [...root?.shadowRoot?.querySelectorAll('app-header, ha-app-layout > header, .header') || []]
        .some(header => getComputedStyle(header).display !== 'none' && header.getClientRects().length);
    });
    assert.equal(await active.page.locator('.native-edit').count(), 0, 'Ordinary dashboard gained native edit access');
    const spacing = await active.page.locator('hui-root').evaluate(root => parseFloat(getComputedStyle(root.shadowRoot.querySelector('#view')).paddingBottom));
    assert.ok(spacing >= 72, 'Floating individual navbar can cover the last ordinary dashboard controls');
    assert.deepEqual(active.issues, []);
    await active.close(); active = null;
    await ws.call({ type: 'lovelace/config/save', url_path: rootRoute, config: saved });
    report.assertions.push('individual native cards retain HA toolbar and safe floating-navbar spacing'); save();
    saved.views[0].sections[0].cards.splice(0, 1);
    saved.views[1].sections[0].cards = [];
    await ws.call({ type: 'lovelace/config/save', url_path: rootRoute, config: saved });
    ws.close(); ws = null; await restart(config); ws = await connect(config);
    assert.deepEqual(await ws.call({ type: 'lovelace/config', url_path: rootRoute, force: true }), saved);
    assert.deepEqual(remote({ mode: 'snapshot', paths: ['dashboard/MaraoDashboard'] }).files, builderBefore.files);
    report.assertions.push('saved edits/deletions/explicit emptiness survive reload and restart'); save();
  } catch (error) {
    primaryError = error;
    report.failure = error.message; save();
    if (active?.page && !active.page.isClosed()) await active.page.screenshot({ path: path.join(output, 'failure.png'), scale: 'css' }).catch(() => {});
    throw error;
  } finally {
    const cleanupErrors = [];
    try { if (active) await active.close(); } catch (error) { cleanupErrors.push(error); }
    try {
    if (ws) ws.close();
    if (backup) {
      console.log('Restoring the exact disposable builder baseline.');
      const cleanup = await connect(config);
      try {
        const dashboards = await cleanup.call({ type: 'lovelace/dashboards/list' });
        assert.deepEqual(dashboards.filter(d => d.url_path !== rootRoute), baselineDashboards, 'Concurrent unrelated dashboard edit; retain recovery backup');
        const currentSource = ssh(config, 'cat ' + quote(config.remoteConfigPath + '/configuration.yaml')).stdout;
        assert.ok([baselineSource, stagedSource].includes(currentSource), 'Concurrent Home Assistant configuration edit; retain recovery backup');
        const created = dashboards.find(d => d.url_path === rootRoute && d.mode === 'storage');
        if (created) {
          const owned = await cleanup.call({ type: 'lovelace/config', url_path: rootRoute, force: true }).catch(error => {
            if (error.message.includes('(config_not_found)')) return null;
            throw error;
          });
          assert.ok(owned?.marao?.mode === 'native' || owned?.strategy?.type === 'custom:marao-starter' ||
            !owned && creating && created.title === 'Marao Native', 'Concurrent dashboard replacement: retain recovery backup');
          await cleanup.call({ type: 'lovelace/dashboards/delete', dashboard_id: created.id });
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } finally { cleanup.close(); }
      const current = remote({ mode: 'snapshot', paths });
      for (const relative of ['dashboard/MaraoDashboard', 'custom_components/marao_dashboard', 'themes/MaraoDashboard']) assert.deepEqual(current.files[relative], backup[relative], 'Concurrent owned file change; retain recovery backup');
      remote({ mode: 'restore', expected: current.files, new_paths: [] });
      await restart(config);
      await restoreHelperStates(config, initialHelpers);
      const restored = await connect(config);
      try {
        const dashboards = await restored.call({ type: 'lovelace/dashboards/list' });
        assert.deepEqual(dashboards.filter(d => d.url_path.startsWith('marao-')).map(d => [d.url_path, d.mode]), [[rootRoute, 'yaml']]);
        await restored.call({ type: 'lovelace/config', url_path: rootRoute, force: true });
        const states = await restored.call({ type: 'get_states' });
        for (const [entity, value] of Object.entries(initialHelpers)) assert.equal(states.find(state => state.entity_id === entity)?.state, value, 'Safe helper restoration failed');
      } finally { restored.close(); }
      assert.deepEqual(remote({ mode: 'snapshot', paths }).files, backup);
      report.verified_cleanup = remote({ mode: 'finish' }).verified_cleanup; save();
      console.log('Exact builder source, generated output, package, theme and registration restored.');
    }
    } catch (error) { cleanupErrors.push(error); }
    if (cleanupErrors.length) throw new AggregateError([...(primaryError ? [primaryError] : []), ...cleanupErrors], 'Native diagnostics or exact baseline restoration failed');
  }
  console.log('Native editing acceptance passed; private scoped report: ' + reportFile);
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { fixtureDashboard };
