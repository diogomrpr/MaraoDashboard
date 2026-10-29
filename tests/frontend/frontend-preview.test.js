import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createRefreshQueue, editableFrontendFile, monitorDiagnostics, parseArgs, previewRoute, selectExamples } = require('../preview-frontend');

test('preview requires a bounded known component and one valid profile', () => {
  for (const argv of [[], ['--component', 'missing'], ['--component=light=extra'], ['--component'], ['--component', 'light', '--watch', '--once'], ['--component', 'light', '--scenario', 'all'], ['--component', 'light', '--theme', 'both'], ['--component', 'light', '--unexpected'], ['--component', 'light', '--family', 'md_camera_card'], ['--component', 'camera-editor', '--family', 'md_camera_card']]) {
    assert.throws(() => parseArgs(argv));
  }
  const options = parseArgs(['--component=light', '--watch', '--scenario', 'narrow-320']);
  assert.deepEqual(options.inspection.families, ['md_light_card']);
  assert.equal(options.scenario.viewport.width, 320);
  assert.equal(options.theme, 'light');
  const selected = parseArgs(['--component','popup','--family','md_access_card','--once']);
  assert.deepEqual(selected.inspection.families,['md_access_card']);
  assert.equal(parseArgs(['--component','camera-editor']).inspection.editor,true);
});

test('each selected family must have a visible example, unrelated cards are ignored', () => {
  const cards = [{ index: 0, template: 'md_camera_card', visible: true }, { index: 1, template: 'md_light_card', visible: false }, { index: 2, template: 'md_light_card', visible: true }, { index: 3, tag: 'marao-navbar-card', visible: true }];
  assert.deepEqual(selectExamples(cards, ['md_light_card', 'marao-navbar-card']).map(card => card.index), [2, 3]);
  assert.throws(() => selectExamples(cards, ['md_light_card', 'md_cover_card']), /md_cover_card/);
});

test('preview chooses the smallest existing view containing all families outside popups and conditions', () => {
  const light = { type: 'custom:marao-card', template: 'md_light_card' };
  const fan = { type: 'custom:marao-card', template: 'md_fan_card' };
  const dashboard = { views: [
    { path: 'card-test', cards: [light, fan] },
    { path: 'popup-only', cards: [{ type: 'custom:marao-popup-card', cards: [light, fan] }] },
    { path: 'conditional', cards: [light, { type: 'conditional', card: fan }] },
    { path: 'unrelated-nested-data', cards: [{ type: 'markdown', content: { cards: [light, fan] } }] },
    { path: 'larger', cards: [light, fan, { type: 'markdown' }] },
    { path: 'studio', sections: [{ cards: [{ type: 'custom:marao-control-grid', cards: [{ type: 'grid', cards: [light, fan] }] }] }] },
    { path: 'light-only', cards: [light] },
  ] };
  assert.equal(previewRoute(dashboard, ['md_light_card', 'md_fan_card']), 'studio');
  assert.equal(previewRoute(dashboard, ['md_light_card']), 'light-only');
  assert.equal(previewRoute(dashboard, ['md_cover_card']), 'card-test');
});

test('watch coalesces saves and serializes another edit arriving during preparation', async () => {
  const calls = [];
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const queue = createRefreshQueue(async () => {
    calls.push('start');
    if (calls.length === 1) { entered(); await new Promise(resolve => { release = resolve; }); }
    calls.push('end');
  }, { delay: 10000 });
  queue.request(); queue.request(); queue.request();
  const running = queue.flush();
  await started;
  queue.request(); queue.request();
  release();
  await running;
  assert.deepEqual(calls, ['start', 'end', 'start', 'end']);
  await queue.close();
  queue.request(); await queue.flush();
  assert.equal(calls.length, 4);
});

test('a failed refresh remains a failure and a later edit can recover', async () => {
  let calls = 0;
  const queue = createRefreshQueue(async () => { if (++calls === 1) throw new Error('preparation refused'); }, { delay: 10000 });
  queue.request();
  await assert.rejects(queue.flush(), /preparation refused/);
  queue.request(); await queue.flush();
  assert.equal(calls, 2);
  await queue.close();
});

test('closing drains a queued save, ignores later requests and surfaces preparation failure', async () => {
  let calls = 0;
  const queue = createRefreshQueue(async () => { calls++; }, { delay: 10000 });
  queue.request();
  await queue.close();
  queue.request(); await queue.flush();
  assert.equal(calls, 1);
  const failing = createRefreshQueue(async () => { throw new Error('final preparation failed'); }, { delay: 10000 });
  failing.request();
  await assert.rejects(failing.close(), /final preparation failed/);
  failing.request(); await failing.flush();
});

test('watch observes editable sources without looping on generated build output', () => {
  for(const file of ['MaraoNativeModel.js','MaraoNativeDashboard.js','MaraoTheme.js','MaraoSourceImport.js','marao-owned-assets.json']) assert.equal(editableFrontendFile('custom_components/marao_dashboard/frontend',file),false);
  assert.equal(editableFrontendFile('custom_components/marao_dashboard/frontend','MaraoSource.js'),true);
  assert.equal(editableFrontendFile('frontend_src', 'MaraoDashboardPanel.js'), true);
  for (const file of ['MaraoCards.js', 'MaraoCamera.js', 'themes/MaraoDashboard/marao-dashboard.yaml', 'brand/mark.svg', 'NewRuntime.js']) assert.equal(editableFrontendFile('runtime', file), true);
  for (const file of ['MaraoDashboardPanel.js', 'MaraoDashboardPanel.css', 'MaraoNativeCards.js', 'MaraoHistoryChart.js', 'assets/font.ttf', '.DS_Store', 'MaraoCards.js~']) assert.equal(editableFrontendFile('runtime', file), false);
});

test('a warm preview reads changed theme tokens after a save', () => {
  const fs = require('node:fs');
  const { themeVariables } = require('../test-ha-dashboard-accessibility');
  const read = fs.readFileSync, stat = fs.statSync;
  let mtime = -1, color = '#123456';
  fs.readFileSync = (filename, ...args) => String(filename).endsWith('/themes/MaraoDashboard/marao-dashboard.yaml')
    ? `Marao Dashboard:\n  modes:\n    light:\n      primary-text-color: '${color}'\n    dark: {}` : read(filename, ...args);
  fs.statSync = (filename, ...args) => String(filename).endsWith('/themes/MaraoDashboard/marao-dashboard.yaml') ? { mtimeMs: mtime } : stat(filename, ...args);
  try {
    assert.equal(themeVariables('light')['--primary-text-color'], '#123456');
    mtime--; color = '#abcdef';
    assert.equal(themeVariables('light')['--primary-text-color'], '#abcdef');
  } finally { fs.readFileSync = read; fs.statSync = stat; }
});

test('reload cancellation evidence cannot hide a new request failure', () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const { EventEmitter } = require('node:events');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-preview-diagnostics-'));
  const page = new EventEmitter(), reported = [];
  const diagnostics = monitorDiagnostics(page, output, message => reported.push(message));
  const request = () => ({ url: () => 'http://192.168.0.28/asset.js?private=hidden', failure: () => ({ errorText: 'net::ERR_ABORTED' }) });
  try {
    const prior = request(); page.emit('request', prior);
    diagnostics.willReload();
    page.emit('requestfailed', prior);
    assert.equal(diagnostics.errors.length, 0);
    const fresh = request(); page.emit('request', fresh); page.emit('requestfailed', fresh);
    assert.equal(diagnostics.errors.length, 1);
    assert.equal(reported.length, 1);
    const saved = JSON.parse(fs.readFileSync(path.join(output, 'diagnostics.json'), 'utf8'));
    assert.equal(saved.length, 2);
    assert.match(saved[0].kind, /preview reload/);
    assert.doesNotMatch(JSON.stringify(saved), /private=hidden/);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

