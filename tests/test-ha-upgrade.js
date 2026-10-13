const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const YAML = require('yaml');
const { accessToken, api, assertDisposableHaTarget, connect, readConfig, repoRoot, setBrowserToken, sourceFiles } = require('../ha-test/client');
const { composeDashboard, haYamlOptions, resetBaseline, restoreHelperStates, restart } = require('../ha-test/prepare');
const { assertHistoricalBindings, candidateIdentity, historicalEntityAliases, isolateHistoricalText } = require('../ha-test/upgrade/prepared');

const fixtures = path.join(repoRoot, 'ha-test/upgrade/fixtures');
const coverage = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ha-test/upgrade/coverage.json')));
const provenance = JSON.parse(fs.readFileSync(path.join(fixtures, 'provenance.json')));
const formats = ['native-storage-0', 'generator-json-0', 'generator-json-1', 'generator-json-2'];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";

function plan(config) {
  assertDisposableHaTarget(config, { requireSsh: true });
  assert.equal(new URL(config.url).hostname, '192.168.0.28');
  assert.equal(config.sshHost, '192.168.0.28');
  const expectations = JSON.parse(fs.readFileSync(path.join(fixtures, 'page-model-expectations.json')));
  const read = file => fs.readFileSync(path.join(fixtures, file), 'utf8');
  const rows = provenance.map(row => ({ baseline: row.tag, format: 'generator-json-0', source: read(row.fixture),
    expected: JSON.parse(read(expectations.records.find(record => record.input === row.fixture).expected)), generated: row.generated,
    replay: row.tag === 'v0.5.1' ? 'released-package-install' : 'historical-data' }));
  const native = JSON.parse(read('inventory.json')).storage_baseline;
  rows.push({ baseline: 'v0.2.0', format: formats[0], source: read(native.fixture), expected: JSON.parse(read(native.canonical_expected)), replay: 'historical-storage-data' });
  const predecessor = expectations.records.find(row => row.input === 'page-parity-format-1-input.json');
  rows.push({ baseline: 'predecessor-format-1', format: formats[2], source: read(predecessor.input), expected: JSON.parse(read(predecessor.expected)), replay: 'supported-predecessor-data' });
  const { expandGallery } = require('../ha-test/cases');
  const gallery = expandGallery(YAML.parse(fs.readFileSync(path.join(repoRoot, 'ha-test/dashboard/views/00-card-test.yaml'), 'utf8')));
  const current = JSON.parse(JSON.stringify(composeDashboard(JSON.parse(fs.readFileSync(path.join(repoRoot, 'ha-test/marao_dashboard_test_dashboard.json'))), gallery)));
  rows.push({ baseline: 'current-format-2', format: formats[3], source: JSON.stringify(current, null, 2) + '\n', expected: current, replay: 'current-format-noop' });
  // Finish cheap preservation/recovery checks before the shared browser matrix.
  rows.sort((a, b) => (a.baseline === 'v0.5.1' ? 1 : b.baseline === 'v0.5.1' ? -1 : 0));
  for (const row of rows) {
    row.frozen_source_sha256 = sha256(row.source);
    row.frozen_expected_sha256 = sha256(JSON.stringify(row.expected));
    row.entity_aliases = historicalEntityAliases(row.expected, require('../ha-test/prepare').referencedEntities);
  }
  assert.equal(new Set(rows.map(row => row.baseline)).size, 7);
  for (const row of rows) assert.equal(row.expected.config_version, 2);
  return { rows, current, formats, baselines: ['v0.2.0', ...provenance.map(row => row.tag), 'predecessor-format-1', 'current-format-2'] };
}

function ssh(config, command, input) {
  try {
    return execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', ...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []),
      '-p', String(config.sshPort), config.sshUser + '@' + config.sshHost, command], { input, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  } catch { throw new Error('Private disposable upgrade command failed; retain the operation backup.'); }
}

async function withRecovery(createBackup, work, cleanup) {
  const backup = await createBackup();
  let failure;
  try { return await work(backup); }
  catch (error) { failure = error; throw error; }
  finally {
    try { await cleanup(backup); }
    catch (error) { throw new Error((failure ? failure.message + '\n' : '') + 'Upgrade cleanup failed: ' + error.message); }
  }
}

function patchRegistration(source, slug, native = false) {
  const document = YAML.parseDocument(source, haYamlOptions);
  assert.equal(document.errors.length, 0, 'Invalid disposable configuration');
  if (!document.get('lovelace')) document.set('lovelace', document.createNode({}));
  const lovelace = document.get('lovelace', true);
  if (!lovelace.get('dashboards')) lovelace.set('dashboards', document.createNode({}));
  const dashboards = lovelace.get('dashboards', true);
  assert.ok(YAML.isMap(dashboards));
  for (const item of [...dashboards.items]) {
    const file = item.value?.get?.('filename');
    if (String(file || '').startsWith('dashboard/MaraoDashboard/')) dashboards.delete(item.key.value);
  }
  if (!native) dashboards.set('marao-dashboard', document.createNode({ mode: 'yaml', title: 'Marao Dashboard', icon: 'mdi:home', show_in_sidebar: true,
    filename: 'dashboard/MaraoDashboard/' + slug + '/dashboard.yaml' }));
  return document.toString();
}

function addResourceSentinel(document) {
  const resources = document.getIn(['lovelace', 'resources'], true);
  assert.ok(resources === undefined || YAML.isSeq(resources), 'Upgrade sentinel requires an explicit resource list');
  const sentinel = { url: '/local/marao-upgrade-unrelated.js', type: 'module' };
  if (resources) resources.add(document.createNode(sentinel));
  else document.setIn(['lovelace', 'resources'], document.createNode([sentinel]));
  return sentinel;
}

function unrelatedConfiguration(source, baseline) {
  const value = YAML.parse(source, haYamlOptions), dashboards = value.lovelace?.dashboards;
  if (dashboards) for (const [key, dashboard] of Object.entries(dashboards)) if (key === 'unrelated-upgrade-sentinel' || String(dashboard.filename || '').startsWith('dashboard/MaraoDashboard/')) delete dashboards[key];
  if (Array.isArray(value.lovelace?.resources)) {
    value.lovelace.resources = value.lovelace.resources.filter(row => row.url !== '/local/marao-upgrade-unrelated.js');
    if (!value.lovelace.resources.length && !Object.hasOwn(YAML.parse(baseline, haYamlOptions).lovelace || {}, 'resources')) delete value.lovelace.resources;
  }
  return value;
}

function hashes(directory) {
  return Object.fromEntries(sourceFiles(directory).map(file => [file, sha256(fs.readFileSync(path.join(directory, file)))]));
}

async function child(command, args, directory, name, env = {}) {
  const log = path.join(directory, name + '.log');
  const fd = fs.openSync(log, 'w', 0o600);
  try {
    const status = await new Promise((resolve, reject) => {
      const process = spawn(command, args, { cwd: repoRoot, env: { ...global.process.env, ...env }, stdio: ['ignore', fd, fd] });
      process.on('error', reject); process.on('exit', code => resolve(code));
    });
    assert.equal(status, 0, name + ' failed; inspect its private log.');
  } finally { fs.closeSync(fd); }
  return log;
}

async function installPackage(config, source, directory) {
  const archive = path.join(directory, 'package.tar.gz');
  execFileSync('tar', ['--no-xattrs', '-czf', archive, '-C', source, '.'], { env: { ...process.env, COPYFILE_DISABLE: '1' } });
  const temporary = config.remoteConfigPath + '/.marao-upgrade-package.tar.gz';
  execFileSync('scp', ['-q', '-o', 'BatchMode=yes', ...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), '-P', String(config.sshPort), archive,
    config.sshUser + '@' + config.sshHost + ':' + temporary], { stdio: 'pipe' });
  const target = config.remoteConfigPath + '/custom_components/marao_dashboard';
  const staged = target + '.upgrade-stage', previous = target + '.upgrade-previous';
  ssh(config, 'test ! -e ' + quote(staged) + ' && test ! -e ' + quote(previous) +
    ' && mkdir ' + quote(staged) + ' && tar -xzf ' + quote(temporary) + ' -C ' + quote(staged) +
    ' && mv ' + quote(target) + ' ' + quote(previous) +
    ' && { mv ' + quote(staged) + ' ' + quote(target) + ' || { mv ' + quote(previous) + ' ' + quote(target) + '; exit 1; }; }' +
    ' && rm -rf ' + quote(previous) + ' && rm ' + quote(temporary));
}

async function editorSave(config, source, directory) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await context.addInitScript(setBrowserToken, { ...accessToken(config), hassUrl: config.url });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    page.on('requestfailed', request => errors.push(request.failure()?.errorText));
    page.on('response', response => { if (response.status() >= 400) errors.push('HTTP ' + response.status()); });
    await page.goto(config.url + '/marao-dashboard-editor');
    const panel = page.locator('marao-dashboard-panel');
    await panel.waitFor({ state: 'visible' });
    await page.waitForFunction(panel => panel._loaded, await panel.elementHandle());
    await page.waitForLoadState('networkidle');
    await panel.evaluate(async (panel, source) => { await panel._switchTab('json'); panel._monaco.setValue(source); await panel._switchTab('visual'); }, source);
    assert.deepEqual(JSON.parse(await panel.evaluate(panel => panel._source())), JSON.parse(source));
    await panel.locator('#save').tap();
    await page.waitForFunction(panel => !panel._busy && !panel._dirty, await panel.elementHandle());
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(directory, 'extension-through-editor.png'), scale: 'css' });
    assert.deepEqual(errors, [], 'Upgrade extension produced browser errors');
  } finally { await browser.close(); }
}

async function releasedHealth(config, packageRoot, directory) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await context.addInitScript(setBrowserToken, { ...accessToken(config), hassUrl: config.url });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (['warning', 'error'].includes(message.type())) errors.push(message.text()); });
    page.on('requestfailed', request => errors.push(request.failure()?.errorText));
    page.on('response', response => { if (response.status() >= 400) errors.push('HTTP ' + response.status()); });
    await page.goto(config.url + '/marao-dashboard/overview');
    await page.locator('marao-navbar-card nav').waitFor({ state: 'visible' });
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('hui-error-card').count(), 0);
    assert.deepEqual(errors, [], 'Released package did not render a healthy dashboard');
    for (const file of ['MaraoDashboard.js', 'MaraoCards.js', 'MaraoFrigateEventsCard.js']) assert.equal(sha256(await api(config, 'GET', '/marao_dashboard_static/' + file, undefined, { text: true })), sha256(fs.readFileSync(path.join(packageRoot, 'frontend', file))));
    await page.screenshot({ path: path.join(directory, 'released-package-health.png'), scale: 'css' });
  } finally { await browser.close(); }
}

function extendedSource(saved, current) {
  const result = structuredClone(saved);
  const routes = new Map(saved.pages.map(page => [page.path, 'preserved-' + page.path]));
  const ownedHashes = new Map();
  function discover(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['popup_hash', 'mode_selector_hash', 'hash'].includes(key) && typeof child === 'string' && child.startsWith('#')) ownedHashes.set(child, '#preserved-' + child.slice(1));
      discover(child);
    }
  }
  discover(result.pages);
  function rename(value) {
    if (typeof value === 'string') {
      if (ownedHashes.has(value)) return ownedHashes.get(value);
      for (const [old, next] of routes) {
        if (value === '/marao-dashboard/' + old || value.startsWith('/marao-dashboard/' + old + '#')) return value.replace('/marao-dashboard/' + old, '/marao-dashboard/' + next);
      }
      return value;
    }
    if (Array.isArray(value)) return value.map(rename);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === 'page' && routes.has(child) ? routes.get(child) : rename(child)]));
  }
  result.pages = rename(result.pages).map(page => ({ ...page, id: 'preserved-' + page.id, path: routes.get(page.path),
    output_path: page.output_path || 'views/pages/' + (page.id || page.path) + '.yaml' }));
  result.pages.push(...structuredClone(current.pages).map(page => ({ ...page, output_path: 'views/upgrade/current-' + page.path + '.yaml' })));
  result.upgrade_original_navigation = structuredClone(saved.navigation);
  result.navigation = structuredClone(current.navigation);
  result.landing_page = current.landing_page;
  // Isolate browser bindings only after the untouched historical migration passed.
  return JSON.parse(isolateHistoricalText(JSON.stringify(result), historicalEntityAliases(saved, require('../ha-test/prepare').referencedEntities)));
}

async function functionalChecks(config, format, directory, receiptPath, report, saveReport) {
  const env = { MARAO_UPGRADE_RECEIPT: receiptPath };
  const started = Date.now();
  const record = (names, profiles, themes, evidence) => {
    for (const name of names) for (const profile of profiles) for (const theme of themes) report.runs.push({ check: name, format, profile, theme, passed: true, evidence });
    saveReport();
  };
  for (const theme of coverage.themes) {
    const result = await require('./native-reconnect-exception').e2eWithApprovedException(config, directory, theme, env);
    record(['states', 'actions', 'content', 'camera', 'media', 'history', 'climate', 'native-surfaces'], ['iphone-normal'], [theme], result);
  }
  await child(process.execPath, ['tests/test-ha-dashboard-e2e.js', '--groups-only'], directory, 'entity-group-actions', env);
  record(['groups'], ['iphone-normal'], coverage.themes, 'entity-group-actions.log');
  await child(process.execPath, ['tests/test-ha-room-cards.js', '--scenario', 'iphone-normal'], directory, 'room-actions', env);
  record(['room-actions'], ['iphone-normal'], coverage.themes, 'room-actions.log');
  // Catch focused interaction failures before the longer builder and page matrices.
  await child(process.execPath, ['tests/test-ha-card-alignment.js'], directory, 'alignment', env);
  record(['alignment'], ['iphone-normal'], coverage.themes, 'alignment.log');
  for (const profile of coverage.checks.sliders.profiles) {
    await child(process.execPath, ['tests/test-ha-value-sliders.js', '--scenario', profile], directory, 'sliders-' + profile, env);
    record(['sliders'], [profile], coverage.themes, 'sliders-' + profile + '.log');
  }
  await child(process.execPath, ['tests/test-ha-climate-layout.js', '--scenario', 'iphone-normal'], directory, 'numbers', env);
  record(['numbers'], ['iphone-normal'], coverage.themes, 'numbers.log');
  await child(process.execPath, ['tests/test-ha-energy-format.js', '--scenario', 'iphone-normal'], directory, 'energy', env);
  record(['energy'], ['iphone-normal'], coverage.themes, 'energy.log');
  await child(process.execPath, ['tests/test-ha-editor.js', '--scenario=iphone-normal', '--pages', '--rooms', '--groups', '--preservation', '--energy', '--fold', '--header'], directory, 'builder', env);
  record(['builder-pages', 'builder-rooms', 'builder-groups', 'builder-layout'], ['iphone-normal'], coverage.themes, 'builder.log');
  await child(process.execPath, ['tests/test-ha-editor.js', '--scenario=android-page-zoom-200', '--header'], directory, 'builder-layout', env);
  record(['builder-layout'], ['android-page-zoom-200'], coverage.themes, 'builder-layout.log');
  record(['builder-preservation', 'builder-energy'], ['iphone-normal'], coverage.themes, 'builder.log');
  for (const theme of coverage.themes) {
    await child(process.execPath, ['tests/test-ha-editor.js', '--scenario=iphone-normal', '--theme=' + theme, '--rooms', '--rooms-save'], directory, 'builder-save-' + theme, env);
    record(['builder-save'], ['iphone-normal'], [theme], 'builder-save-' + theme + '.log');
  }
  await child(process.execPath, ['tests/test-ha-dashboard-accessibility.js', '--pages', '--screenshots', 'review'], directory, 'mobile-layout', env);
  record(['layout', 'popups'], coverage.profiles, coverage.themes, 'mobile-layout.log');
  record(['upgraded-pages'], ['iphone-normal'], coverage.themes, 'mobile-layout.log');
  const captureRoot = path.join(directory, 'captures'); fs.mkdirSync(captureRoot, { mode: 0o700 });
  const captured = {};
  for (const name of ['accessibility', 'editor']) {
    const root = path.join(repoRoot, 'tests/.artifacts', name);
    if (!fs.existsSync(root)) continue;
    for (const file of sourceFiles(root)) {
      if (!file.endsWith('.png') || fs.statSync(path.join(root, file)).mtimeMs < started) continue;
      const target = path.join(captureRoot, name, file); fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(root, file), target); fs.chmodSync(target, 0o600);
      captured[name + '/' + file] = sha256(fs.readFileSync(target));
    }
  }
  for (const profile of coverage.review_profiles) for (const theme of coverage.themes) assert.ok(Object.keys(captured).some(file => file.startsWith('accessibility/' + profile + '-' + theme + '-')), 'Missing representative upgraded capture');
  fs.writeFileSync(path.join(directory, 'captures.json'), JSON.stringify({ format, captured }), { mode: 0o600 });
  report.evidence.push({ format, captures: path.relative(path.dirname(directory), path.join(directory, 'captures.json')), captures_sha256: sha256(JSON.stringify(captured)) });
  saveReport();
}

function validateVisualReviews(review, report) {
  assert.equal(review.operation_id, report.operation_id); assert.deepEqual(review.candidate, report.candidate);
  const required = coverage.review_profiles.flatMap(profile => coverage.themes.map(theme => JSON.stringify([coverage.shared_format, profile, theme])));
  const rows = review.rows.map(row => {
    assert.equal(row.passed, true); assert.equal(row.source, 'preserved-install');
    assert.equal(row.inspected, 'representative-cards,realistic-pages,popups,editor');
    assert.ok(typeof row.notes === 'string' && row.notes.trim());
    const evidence = report.evidence.find(item => item.format === row.format && item.captures_sha256);
    assert.equal(row.captures_sha256, evidence?.captures_sha256, 'Visual inspection does not match preserved captures');
    return JSON.stringify([row.format, row.profile, row.theme]);
  });
  assert.equal(new Set(rows).size, rows.length); assert.deepEqual(rows.sort(), required.sort());
  return review.rows;
}

async function finalVisualReview(directory, report, saveReport) {
  const file = path.join(directory, 'visual-review.json');
  fs.writeFileSync(path.join(directory, 'awaiting-visual-review.json'), JSON.stringify({ operation_id: report.operation_id, candidate: report.candidate,
    formats: report.formats, profiles: coverage.profiles, themes: coverage.themes, evidence: report.evidence.filter(row => row.captures) }), { mode: 0o600 });
  console.log('Upgraded installation awaits actual visual inspection before cleanup. Write its private review to ' + file);
  const deadline = Date.now() + 6 * 3600000;
  while (!fs.existsSync(file) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 1000));
  assert.ok(fs.existsSync(file), 'Visual review was not completed; cleanup is required');
  const stat = fs.lstatSync(file); assert.ok(stat.isFile() && !stat.isSymbolicLink() && !(stat.mode & 0o077));
  report.visual_reviews = validateVisualReviews(JSON.parse(fs.readFileSync(file)), report); saveReport();
}

async function main() {
  const config = readConfig(), selected = plan(config);
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({ target: config.url, baselines: selected.rows.map(({ baseline, format, replay }) => ({ baseline, format, replay })),
      profiles: coverage.profiles, themes: coverage.themes, phases: ['private backup', 'released package health', 'package-only replacement and setup',
        'independent preservation', 'editor feature additions', 'shared checks', 'final visual review', 'verified cleanup'] }, null, 2));
    return;
  }
  assert.equal(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: repoRoot, encoding: 'utf8' }).trim(), '', 'The release upgrade requires a clean final commit.');
  assert.ok(!Object.hasOwn(process.env, 'MARAO_UPGRADE_RECEIPT'), 'The orchestrator must own its receipt.');
  const candidate = candidateIdentity();
  const operation = crypto.randomUUID();
  const directory = path.join(repoRoot, 'tests/.artifacts/preserved-upgrade', operation);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 }); fs.chmodSync(directory, 0o700);
  const reportPath = path.join(directory, 'report.json');
  const venv = path.join(repoRoot, '.venv/bin/python');
  const python = process.env.MARAO_TEST_PYTHON || (fs.existsSync(venv) ? venv : 'python3');
  const report = { version: 2, kind: 'preserved-install-upgrade', operation_id: operation, candidate, target: config.url,
    started_at: new Date().toISOString(), formats: selected.formats, baselines: selected.baselines, runs: [], install_assertions: [], visual_reviews: [],
    verified_cleanup: false, evidence: [] };
  const saveReport = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  const remote = request => JSON.parse(ssh(config, 'python3 -c ' + quote(fs.readFileSync(path.join(__dirname, 'upgrade/installed_state.py'), 'utf8')),
    JSON.stringify({ root: config.remoteConfigPath, operation, ...request })));
  const domains = fs.readdirSync(path.join(repoRoot, 'ha-test/custom_components')).sort();
  let client = await connect(config);
  try {
    const entries = await client.call({ type: 'config_entries/get' });
    assert.equal(entries.filter(entry => entry.domain === 'marao_dashboard').length, 1);
    const entryId = entries.find(entry => entry.domain === 'marao_dashboard').entry_id;
    assert.ok((await client.call({ type: 'auth/current_user' })).is_admin);
    assert.equal((await api(config, 'GET', '/api/config')).config_dir, config.remoteConfigPath);
    const baselineConfig = ssh(config, 'cat ' + quote(config.remoteConfigPath + '/configuration.yaml'));
    const sentinelParentExisted = ssh(config, 'if test -d ' + quote(config.remoteConfigPath + '/unrelated') + '; then echo present; fi').trim() === 'present';
    ssh(config, 'test ! -e ' + quote(config.remoteConfigPath + '/custom_components/marao_dashboard.upgrade-stage') +
      ' && test ! -e ' + quote(config.remoteConfigPath + '/custom_components/marao_dashboard.upgrade-previous'));
    const originalFixture = JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config);
    assert.deepEqual(originalFixture, selected.current, 'Normal safe fixture setup did not match its specified source');
    const helper = require('../ha-test/cases').expandHelpers(YAML.parse(fs.readFileSync(path.join(repoRoot, 'ha-test/marao_dashboard_card_test_helpers.yaml'), 'utf8')));
    const helperIds = Object.entries(helper).filter(([domain]) => ['input_boolean', 'input_number', 'input_select', 'input_text'].includes(domain))
      .flatMap(([domain, values]) => Object.entries(values).filter(([, options]) => options.initial !== undefined || domain === 'input_select').map(([name]) => domain + '.' + name));
    const helperStates = async () => Object.fromEntries((await client.call({ type: 'get_states' })).filter(row => helperIds.includes(row.entity_id)).map(row => [row.entity_id, row.state]));
    const initialHelperStates = await helperStates();
    // Check every replay before backup or the first long browser matrix.
    const initialEntities = new Set((await client.call({ type: 'get_states' })).map(state => state.entity_id));
    for (const row of selected.rows) assertHistoricalBindings(JSON.parse(isolateHistoricalText(JSON.stringify(row.expected), row.entity_aliases)),
      initialEntities, require('../ha-test/prepare').referencedEntities);
    const helperPaths = JSON.parse(ssh(config, 'python3 -c ' + quote("import json,pathlib;root=pathlib.Path(" + JSON.stringify(config.remoteConfigPath) + ");print(json.dumps([str(p.relative_to(root)) for p in root.rglob('marao_dashboard_card_test_helpers.yaml') if not any(x.startswith('.') for x in p.relative_to(root).parts)]))")));
    assert.equal(helperPaths.length, 1, 'Expected exactly one safe fixture package');
    const storagePaths = JSON.parse(ssh(config, 'python3 -c ' + quote("import json,pathlib;root=pathlib.Path(" + JSON.stringify(config.remoteConfigPath) + ");print(json.dumps([str(p.relative_to(root)) for p in (root/'.storage').glob('lovelace*') if p.is_file()]))")));
    const documents = ['.storage/core.config_entries', ...storagePaths];
    const paths = ['custom_components/marao_dashboard', 'dashboard/MaraoDashboard', 'configuration.yaml', 'themes/MaraoDashboard',
      'custom_components/marao_dashboard.upgrade-stage', 'custom_components/marao_dashboard.upgrade-previous',
      '.storage/core.config_entries', ...storagePaths, ...helperPaths, ...domains.map(domain => 'custom_components/' + domain),
      'www/marao-upgrade-unrelated.js', 'unrelated/marao-upgrade.yaml', 'themes/marao-upgrade-unrelated.yaml', '.marao-upgrade-package.tar.gz'];
    const newPaths = [];
    let baseline, preservedDocuments;
    const snapshot = slug => remote({ mode: 'snapshot', paths: [...paths, ...newPaths], documents, slug });
    const disabled = async value => {
      await client.call({ type: 'config_entries/disable', entry_id: entryId, disabled_by: value ? 'user' : null });
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        const saved = JSON.parse(ssh(config, 'python3 -c ' + quote("import json,pathlib;d=json.loads(pathlib.Path(" + JSON.stringify(config.remoteConfigPath + '/.storage/core.config_entries') + ").read_bytes());print(json.dumps(next(e.get('disabled_by') for e in d['data']['entries'] if e['entry_id']==" + JSON.stringify(entryId) + ")))")));
        if (saved === (value ? 'user' : null)) return;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      throw new Error('The integration enable/disable state was not persisted');
    };
    const reboot = async () => { client.close(); await restart(config); client = await connect(config); };
    const assertCandidate = () => assert.deepEqual(candidateIdentity(), candidate, 'Candidate changed during the release upgrade');
    const assertion = (baseline, name, evidence) => { report.install_assertions.push({ baseline, assertion: name, passed: true, evidence }); saveReport(); };
    let nativeId;
    let originalResources;
    await withRecovery(async () => {
      baseline = remote({ mode: 'backup', paths });
      preservedDocuments = snapshot().documents;
      fs.writeFileSync(path.join(directory, 'pretest-identities.json'), JSON.stringify(baseline), { mode: 0o600 });
      fs.writeFileSync(path.join(directory, 'pretest-parent-state.json'), JSON.stringify({ unrelated_existed: sentinelParentExisted }), { mode: 0o600 });
      fs.writeFileSync(path.join(directory, 'pretest-helper-states.json'), JSON.stringify(initialHelperStates), { mode: 0o600 });
      saveReport();
      return baseline;
    }, async () => {
      const pretest = snapshot(selected.current.slug);
      const initialReceipt = { version: 1, operation_id: operation, created_at: new Date().toISOString(), target: config.url, remote_config_path: config.remoteConfigPath,
        dashboard_key: 'marao-dashboard', entry_id: entryId, candidate, source_sha256: sha256(pretest.source_bytes), expected_config: selected.current,
        output: { slug: selected.current.slug, files: pretest.output }, fixture_domains: domains, fixture_files: Object.fromEntries(helperPaths.map(file => [file, pretest.files[file]['']])) };
      const initialReceiptPath = path.join(directory, 'pretest-receipt.json'); fs.writeFileSync(initialReceiptPath, JSON.stringify(initialReceipt), { mode: 0o600 });
      await require('../ha-test/upgrade/prepared').verifyPrepared(config, initialReceiptPath, { ssh: (config, command, options) => ({ stdout: ssh(config, command, options?.input) }), referencedEntities: require('../ha-test/prepare').referencedEntities });
      await child(python, ['-m', 'pytest', 'tests/components/marao_dashboard', '-q'], directory, 'candidate-python');
      await child(process.execPath, ['--test', ...sourceFiles(path.join(repoRoot, 'tests/frontend')).filter(file => file.endsWith('.test.js')).map(file => 'tests/frontend/' + file)], directory, 'candidate-frontend');
      for (const [name, check] of Object.entries(coverage.checks)) if (check.scope === 'candidate') report.runs.push({ check: name, format: 'candidate', profile: null, theme: null, passed: true, evidence: check.file.endsWith('.py') ? 'candidate-python.log' : 'candidate-frontend.log' });
      const released = path.join(directory, 'released-package'); fs.mkdirSync(released);
      const archive = execFileSync('git', ['archive', 'v0.5.1', 'custom_components/marao_dashboard', 'frontend_src', 'package.json', 'package-lock.json'], { cwd: repoRoot, maxBuffer: 16 * 1024 * 1024 });
      execFileSync('tar', ['-xf', '-', '-C', released], { input: archive });
      fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(released, 'node_modules'), 'dir');
      execFileSync(process.execPath, ['frontend_src/build-editor.cjs'], { cwd: released, stdio: 'pipe' });
      execFileSync(process.execPath, ['frontend_src/build-hacs-dist.cjs'], { cwd: released, stdio: 'pipe' });
      const releasedPackage = path.join(released, 'ha-test/.cache/dist/custom_components/marao_dashboard');
      assert.equal(execFileSync('git', ['rev-parse', 'v0.5.1^{commit}'], { cwd: repoRoot, encoding: 'utf8' }).trim(), provenance.find(row => row.tag === 'v0.5.1').commit, 'Released tag changed from frozen provenance');
      assert.equal(JSON.parse(fs.readFileSync(path.join(releasedPackage, 'manifest.json'))).version, '0.5.1');
      assert.ok(!sourceFiles(releasedPackage).some(file => /vendor\/(?:button-card|bubble-card|navbar-card)/.test(file)), 'Forbidden historical runtime bundle');
      const candidateStage = path.join(directory, 'candidate-package');
      require('../frontend_src/build-hacs-dist.cjs').build(candidateStage);
      const candidatePackage = path.join(candidateStage, 'custom_components/marao_dashboard');
      assert.deepEqual(hashes(candidatePackage), hashes(path.join(repoRoot, 'custom_components/marao_dashboard')), 'Staged candidate differs from the verified source');
      const ownership = JSON.parse(fs.readFileSync(path.join(fixtures, 'unrelated-ownership.json')));
      for (const file of ['www/marao-upgrade-unrelated.js', 'unrelated/marao-upgrade.yaml', 'themes/marao-upgrade-unrelated.yaml']) assert.equal(baseline[file], null, 'Upgrade sentinel would replace existing data');
      ssh(config, 'mkdir -p ' + quote(config.remoteConfigPath + '/unrelated'));
      ssh(config, 'cat > ' + quote(config.remoteConfigPath + '/www/marao-upgrade-unrelated.js'), '// Safe unrelated upgrade sentinel\n');
      ssh(config, 'cat > ' + quote(config.remoteConfigPath + '/unrelated/marao-upgrade.yaml'), 'title: Unrelated sentinel\nviews: []\n');
      ssh(config, 'cat > ' + quote(config.remoteConfigPath + '/themes/marao-upgrade-unrelated.yaml'), YAML.stringify(ownership.theme));
      const configuration = YAML.parseDocument(baselineConfig, haYamlOptions);
      configuration.setIn(['lovelace', 'dashboards', 'unrelated-upgrade-sentinel'], configuration.createNode({ mode: 'yaml', title: ownership.dashboard.title,
        icon: 'mdi:file-outline', show_in_sidebar: false, require_admin: true, filename: 'unrelated/marao-upgrade.yaml' }));
      const resourcesBefore = await client.call({ type: 'lovelace/resources' });
      assert.ok(resourcesBefore.every(row => row.url !== '/local/marao-upgrade-unrelated.js'), 'The resource sentinel already exists');
      originalResources = resourcesBefore;
      const { resource_mode: resourceMode } = await client.call({ type: 'lovelace/info' });
      assert.ok(['yaml', 'storage'].includes(resourceMode), 'Unsupported Lovelace resource mode');
      const sentinelResource = resourceMode === 'yaml' ? addResourceSentinel(configuration)
        : await client.call({ type: 'lovelace/resources/create', res_type: 'module', url: '/local/marao-upgrade-unrelated.js' });
      const sentinelConfig = configuration.toString();
      const resourcesExpected = [...resourcesBefore, sentinelResource];
      const checkedFormats = new Set();
      for (const row of selected.rows) {
        assertCandidate();
        console.log('Preserved upgrade: ' + row.baseline + ' (' + row.replay + ')');
        const rowDir = path.join(directory, row.baseline); fs.mkdirSync(rowDir, { mode: 0o700 });
        const present = new Set((await client.call({ type: 'get_states' })).map(state => state.entity_id));
        assertHistoricalBindings(JSON.parse(isolateHistoricalText(JSON.stringify(row.expected), row.entity_aliases)), present, require('../ha-test/prepare').referencedEntities);
        fs.writeFileSync(path.join(rowDir, 'historical-binding-map.json'), JSON.stringify({ frozen_source_sha256: row.frozen_source_sha256,
          frozen_expected_sha256: row.frozen_expected_sha256, replay_source_sha256: sha256(row.source), browser_extension_aliases: row.entity_aliases }), { mode: 0o600 });
        await disabled(true);
        if (nativeId) { await client.call({ type: 'lovelace/dashboards/delete', dashboard_id: nativeId }); nativeId = undefined; }
        const slug = row.expected.slug || row.expected.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        ssh(config, 'cat > ' + quote(config.remoteConfigPath + '/configuration.yaml'), patchRegistration(sentinelConfig, slug, row.format === formats[0]));
        let nativeKey;
        if (row.format === formats[0]) {
          await reboot();
          const dashboard = await client.call({ type: 'lovelace/dashboards/create', url_path: 'marao-dashboard', title: JSON.parse(row.source).title,
            icon: 'mdi:home', show_in_sidebar: true, require_admin: false });
          nativeId = dashboard.id; nativeKey = 'lovelace.' + nativeId;
          newPaths.push('.storage/' + nativeKey); documents.push('.storage/' + nativeKey);
          await client.call({ type: 'lovelace/config/save', url_path: 'marao-dashboard', config: JSON.parse(row.source) });
        }
        let output = {};
        if (row.generated) {
          const generated = path.join(fixtures, row.generated.directory, 'dashboard');
          output = Object.fromEntries(sourceFiles(generated).map(file => [file, fs.readFileSync(path.join(generated, file), 'utf8')
            .replaceAll('/' + row.generated.dashboard_key + '/', '/marao-dashboard/')
            .replaceAll('/config/dashboard/', config.remoteConfigPath + '/dashboard/')]));
        } else if (row.format === formats[3]) {
          output = Object.fromEntries(Object.keys(baseline['dashboard/MaraoDashboard']).filter(file => file.startsWith(slug + '/')).map(file => {
            const relative = file.slice(slug.length + 1);
            const content = ssh(config, 'cat ' + quote(config.remoteConfigPath + '/.marao-upgrade-backups/' + operation + '/files/dashboard/MaraoDashboard/' + file));
            return [relative, content];
          }));
        }
        const custom = fs.readFileSync(path.join(fixtures, 'preserved-custom-cards.yaml'), 'utf8');
        const protectedFile = Object.keys(output).find(file => file.startsWith('views/rooms/') && output[file].includes('  # marao:custom:start\n'));
        if (protectedFile) output[protectedFile] = output[protectedFile].replace('  # marao:custom:start\n', '  # marao:custom:start\n' + custom);
        const protectedFiles = { [ownership.file.path]: ownership.file.content };
        remote({ mode: 'replay', source: row.source, output, slug, protected: protectedFiles, native_key: nativeKey });
        const before = snapshot(slug);
        fs.writeFileSync(path.join(rowDir, 'before.json'), JSON.stringify(before), { mode: 0o600 });
        if (row.baseline === 'v0.5.1') {
          await installPackage(config, releasedPackage, rowDir); await reboot(); await disabled(false);
          const old = await client.call({ type: 'marao_dashboard/config/get' });
          assert.ok(JSON.parse(old.config).rooms);
          assert.equal(snapshot(slug).source_bytes, row.source, 'Released package changed its frozen saved baseline');
          const oldDashboard = await client.call({ type: 'lovelace/config', url_path: 'marao-dashboard', force: true });
          assert.ok(oldDashboard.views.length > 1);
          assert.ok((await client.call({ type: 'config_entries/get' })).some(entry => entry.entry_id === entryId && entry.state === 'loaded'));
          await releasedHealth(config, releasedPackage, rowDir);
          assertion(row.baseline, 'baseline-package-health', { package_sha256: sha256(JSON.stringify(hashes(releasedPackage))), tag: 'v0.5.1', commit: provenance.find(item => item.tag === 'v0.5.1').commit });
          await disabled(true);
        }
        await installPackage(config, candidatePackage, rowDir); await reboot();
        const beforeSetup = snapshot(slug);
        assert.equal(beforeSetup.source_bytes, before.source_bytes, 'Package-only replacement changed the saved source');
        assert.deepEqual(beforeSetup.output, before.output, 'Package-only replacement changed generated output');
        if (nativeKey) assert.deepEqual(beforeSetup.files['.storage/' + nativeKey], before.files['.storage/' + nativeKey], 'Package-only replacement changed native source');
        assertion(row.baseline, 'source-before-regeneration', 'before.json');
        await disabled(false);
        const active = snapshot(slug);
        fs.writeFileSync(path.join(rowDir, 'active.json'), JSON.stringify(active), { mode: 0o600 });
        assert.deepEqual(JSON.parse(active.source_bytes), row.expected, 'Startup did not persist the independent complete expectation');
        assert.equal(active.recovering, false);
        assertion(row.baseline, 'independent-canonical-source', { expected_sha256: sha256(JSON.stringify(row.expected)), input_sha256: sha256(row.source) });
        const future = JSON.stringify({ ...row.expected, config_version: 999 });
        await assert.rejects(client.call({ type: 'marao_dashboard/config/get', config: future }), /invalid_config/);
        await assert.rejects(client.call({ type: 'marao_dashboard/config/generate', config: future }), /invalid_config/);
        const rejected = snapshot(slug);
        assert.equal(rejected.source_bytes, active.source_bytes); assert.deepEqual(rejected.output, active.output);
        for (const file of ['configuration.yaml', 'themes/MaraoDashboard', ...(nativeKey ? ['.storage/' + nativeKey] : [])]) assert.deepEqual(rejected.files[file], active.files[file], 'Rejected future source changed owned state');
        report.evidence.push({ baseline: row.baseline, rejected_future_preview: true, rejected_future_write: true, retained_source_sha256: sha256(active.source_bytes) }); saveReport();
        const currentEntries = await client.call({ type: 'config_entries/get' });
        assert.ok(currentEntries.some(entry => entry.entry_id === entryId && entry.domain === 'marao_dashboard' && entry.state === 'loaded'));
        assertion(row.baseline, 'entry-identity', sha256(entryId));
        assert.equal(active.output[ownership.file.path], sha256(ownership.file.content));
        if (protectedFile) assert.ok(ssh(config, 'cat ' + quote(config.remoteConfigPath + '/dashboard/MaraoDashboard/' + slug + '/' + protectedFile)).includes(custom));
        assertion(row.baseline, 'protected-output', { manual: ownership.file.path, custom: protectedFile || null });
        const actualConfig = YAML.parse(ssh(config, 'cat ' + quote(config.remoteConfigPath + '/configuration.yaml')), haYamlOptions);
        assert.deepEqual(actualConfig.lovelace.dashboards['unrelated-upgrade-sentinel'], YAML.parse(sentinelConfig, haYamlOptions).lovelace.dashboards['unrelated-upgrade-sentinel']);
        assertion(row.baseline, 'unrelated-registration', 'unrelated-upgrade-sentinel');
        assert.deepEqual(await client.call({ type: 'lovelace/resources' }), resourcesExpected);
        assertion(row.baseline, 'unrelated-resources', sha256(JSON.stringify(resourcesExpected)));
        assert.equal(snapshot().files['themes/marao-upgrade-unrelated.yaml'][''], sha256(YAML.stringify(ownership.theme)));
        assertion(row.baseline, 'unrelated-themes', 'themes/marao-upgrade-unrelated.yaml');
        const panels = await client.call({ type: 'get_panels' });
        assert.ok(JSON.stringify(panels['marao-dashboard-editor']).includes('v=' + candidate.frontend_fingerprint));
        assertion(row.baseline, 'asset-fingerprint', candidate.frontend_fingerprint);
        const history = active.history;
        await reboot();
        const repeated = snapshot(slug);
        fs.writeFileSync(path.join(rowDir, 'repeated.json'), JSON.stringify(repeated), { mode: 0o600 });
        assert.equal(repeated.source_bytes, active.source_bytes); assert.deepEqual(repeated.output, active.output);
        assertion(row.baseline, 'second-restart-noop', 'exact source/output bytes');
        await child(python, ['-m', 'pytest', 'tests/components/marao_dashboard/test_release_replay_recovery.py', '-q', '-k', row.baseline.replaceAll('-', '_').replaceAll('.', '_')], rowDir, 'interruption-recovery');
        assertion(row.baseline, 'interrupted-operation-recovery', 'interruption-recovery.log');
        if (!checkedFormats.has(row.format) && (row.format !== coverage.shared_format || row.baseline === 'v0.5.1')) {
          const shared = row.baseline === 'v0.5.1';
          const extended = shared ? extendedSource(row.expected, selected.current) : JSON.parse(active.source_bytes);
          if (shared) {
            await editorSave(config, JSON.stringify(extended, null, 2), rowDir);
            assert.deepEqual(JSON.parse(snapshot(slug).source_bytes), extended);
            await resetBaseline(config, helper);
          }
          const expanded = snapshot(slug);
          // Build the receipt only after the original data and explicit editor additions passed.
          const receipt = { version: 1, operation_id: operation, created_at: new Date().toISOString(), target: config.url, remote_config_path: config.remoteConfigPath,
            dashboard_key: 'marao-dashboard', entry_id: entryId, candidate, source_sha256: sha256(expanded.source_bytes), expected_config: extended,
            output: { slug, files: expanded.output }, historical_baseline: row.baseline, fixture_domains: domains,
            fixture_files: Object.fromEntries([...helperPaths, 'www/marao-upgrade-unrelated.js'].map(file => [file, expanded.files[file]['']])) };
          const receiptPath = path.join(rowDir, 'receipt.json'); fs.writeFileSync(receiptPath, JSON.stringify(receipt), { mode: 0o600 });
          // The editor persistence checks restart HA, invalidating the parent connection.
          client.close();
          if (shared) await functionalChecks(config, row.format, rowDir, receiptPath, report, saveReport);
          else {
            await child(process.execPath, ['tests/test-ha-dashboard-accessibility.js', '--pages-only', '--scenario', 'iphone-normal'], rowDir, 'upgraded-pages', { MARAO_UPGRADE_RECEIPT: receiptPath });
            for (const theme of coverage.themes) report.runs.push({ check: 'upgraded-pages', format: row.format, profile: 'iphone-normal', theme, passed: true, evidence: 'upgraded-pages.log' });
            saveReport();
          }
          client = await connect(config);
          checkedFormats.add(row.format);
        }
        const after = snapshot(slug);
        for (const [version, bytes] of Object.entries(history)) assert.deepEqual(after.history[version], bytes, 'Archived upgrade history changed');
        assertion(row.baseline, 'history-immutable', sha256(JSON.stringify(history)));
        report.evidence.push({ baseline: row.baseline, format: row.format, replay: row.replay, before_sha256: sha256(JSON.stringify(before)), after_sha256: sha256(JSON.stringify(after)) }); saveReport();
      }
      assert.deepEqual([...checkedFormats].sort(), [...formats].sort());
      assertCandidate();
      await finalVisualReview(directory, report, saveReport);
    }, async () => {
      if (!baseline) return;
      client.close(); client = await connect(config);
      await disabled(true);
      const current = snapshot();
      assertUnrelatedEntries(preservedDocuments['.storage/core.config_entries'], current.documents['.storage/core.config_entries'], entryId);
      const collection = document => (document?.data?.items || []).filter(row => row.url_path !== 'marao-dashboard');
      assert.deepEqual(collection(current.documents['.storage/lovelace_dashboards']), collection(preservedDocuments['.storage/lovelace_dashboards']), 'Concurrent unrelated dashboard registration change');
      for (const file of storagePaths) if (!['.storage/lovelace_resources', '.storage/lovelace_dashboards'].includes(file)) assert.deepEqual(current.files[file], baseline[file], 'Unrelated native dashboard changed');
      if (originalResources) assert.deepEqual((await client.call({ type: 'lovelace/resources' })).filter(row => row.url !== '/local/marao-upgrade-unrelated.js'), originalResources, 'Unrelated resources changed');
      assert.deepEqual(unrelatedConfiguration(ssh(config, 'cat ' + quote(config.remoteConfigPath + '/configuration.yaml')), baselineConfig), unrelatedConfiguration(baselineConfig, baselineConfig), 'Unrelated Home Assistant settings changed');
      remote({ mode: 'restore', expected: current.files, new_paths: newPaths });
      if (!sentinelParentExisted) ssh(config, 'test ! -d ' + quote(config.remoteConfigPath + '/unrelated') + ' || rmdir ' + quote(config.remoteConfigPath + '/unrelated'));
      await reboot();
      assert.ok((await client.call({ type: 'config_entries/get' })).some(entry => entry.entry_id === entryId && entry.state === 'loaded'));
      assert.deepEqual(JSON.parse((await client.call({ type: 'marao_dashboard/config/get' })).config), selected.current);
      await resetBaseline(config, helper);
      await restoreHelperStates(config, initialHelperStates);
      assert.deepEqual(await helperStates(), initialHelperStates, 'Safe helper state cleanup failed');
      remote({ mode: 'finish' });
      report.verified_cleanup = true;
      for (const row of selected.rows) assertion(row.baseline, 'verified-cleanup', { files: 'pretest-identities.json', helpers: 'pretest-helper-states.json' });
      report.completed_at = new Date().toISOString(); saveReport();
    });
    console.log('Preserved-install report: ' + reportPath);
  } catch (error) { report.failure = error.message; saveReport(); throw error; }
  finally { client.close(); }
}

function assertUnrelatedEntries(before, after, entryId) {
  const unrelated = document => document.data.entries.filter(entry => entry.entry_id !== entryId);
  assert.deepEqual(unrelated(after), unrelated(before), 'Concurrent unrelated entry change; retained recovery backup');
}

module.exports = { unrelatedConfiguration, addResourceSentinel, assertUnrelatedEntries, child, extendedSource, hashes, patchRegistration, plan, validateVisualReviews, withRecovery };
if (require.main === module) main().catch(error => { console.error(error.message.split('\n')[0]); process.exitCode = 1; });
