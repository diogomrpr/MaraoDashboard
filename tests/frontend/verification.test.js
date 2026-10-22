import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { changedFiles, checkIdentity, dependencyInputs, makePlan, parseArgs, schedule } = require('../verification');
const { selectComponents, checksFor } = require('../verification-map');
const YAML = require('yaml');

test('inferred generated staging is not a source identity, while source and explicitly declared inputs still invalidate proof', t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'marao-input-scope-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const write=(file,body)=>{const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,body);};
  write('entry.js',"require('./source.js'); new URL('./ha-test/.cache/dist/package.js', import.meta.url); new URL('./tests/.artifacts/report.json', import.meta.url); require('./.github/policy.js');");
  for(const file of ['source.js','ha-test/.cache/dist/package.js','tests/.artifacts/report.json','.github/policy.js'])write(file,'before');
  const check={command:['node','entry.js'],inputs:['entry.js']},identity=checkIdentity(check,directory);
  const inputs=dependencyInputs(check.inputs,directory);
  assert.ok(inputs.includes('source.js'));assert.ok(inputs.includes('.github/policy.js'));
  assert.ok(!inputs.some(file=>file.includes('/.cache/')||file.includes('/.artifacts/')));
  write('ha-test/.cache/dist/package.js','rebuilt package');write('tests/.artifacts/report.json','new report');
  assert.equal(checkIdentity(check,directory),identity,'Normal generated output must not invalidate source proof');
  write('source.js','changed source');assert.notEqual(checkIdentity(check,directory),identity);
  const afterSource=checkIdentity(check,directory);write('.github/policy.js','changed policy');assert.notEqual(checkIdentity(check,directory),afterSource);
  const explicit={...check,inputs:[...check.inputs,'ha-test/.cache/dist']},before=checkIdentity(explicit,directory);
  write('ha-test/.cache/dist/package.js','explicit input changed');assert.notEqual(checkIdentity(explicit,directory),before,'Explicit check inputs remain binding');
});

test('camera plans exclude the retired slow validation and retain normal playback checks', () => {
  const selection = selectComponents([], ['camera']);
  for (const options of [{}, { full: true }]) {
    const checks = checksFor(selection, options);
    assert.ok(!checks.some(check => check.id.startsWith('camera:slow') || check.command.includes('--camera-slow-only')));
    for (const id of ['camera', 'camera:streams', 'camera:streams:webkit', 'camera:webkit']) {
      assert.ok(checks.some(check => check.id === id), id + ' remains available');
    }
    assert.ok(!checks.some(check => check.inputs.includes('tests/camera-slow-native-checks.js')));
  }
});

test('frontend refresh scope covers recovery, native/navbar ownership and alignment without fixture resets', () => {
  const selection = selectComponents(['custom_components/marao_dashboard/frontend/MaraoCards.js',
    'custom_components/marao_dashboard/frontend/MaraoFrontendRefresh.js', 'tests/test-ha-card-alignment.js',
    'ha-test/cases.json', 'ha-test/frontend-refresh-fixture.js'], ['frontend-refresh']);
  assert.deepEqual(selection.components, ['frontend-refresh']);
  const checks = checksFor(selection);
  for (const name of ['frontend-refresh', 'marao-navbar-card', 'marao-native', 'gallery-cases']) assert.ok(checks.some(check => check.id.startsWith('unit:' + name)));
  assert.ok(checks.some(check => check.command.includes('--frontend-refresh') && check.command.includes('tests/test-ha-card-alignment.js')));
  assert.ok(checks.every(check => check.kind === 'offline'), 'Local browser fixtures must not reset the preserved HA dashboard');
  assert.ok(!checks.some(check => /mobile-matrix|preserved-upgrade|native-reconnect|editor-assets/.test(check.id)));
});

test('focused components retain shared consumers and exclude unrelated suites', () => {
  const slider = selectComponents(['custom_components/marao_dashboard/frontend/MaraoCards.js'], ['slider']);
  assert.deepEqual(slider.components, ['cover', 'fan', 'light', 'slider']);
  const checks = checksFor(slider);
  assert.ok(checks.some(check => check.id === 'sliders:iphone'));
  assert.ok(checks.some(check => check.id === 'sliders:android'));
  assert.ok(!checks.some(check => /camera|editor|mobile-matrix|preserved-upgrade/.test(check.id)));
  assert.equal(new Set(checks.map(check => check.id)).size, checks.length);
  assert.ok(checksFor(selectComponents([], ['popup'])).some(check => check.id === 'layout:iphone-landscape'));
  const popup = checksFor(selectComponents([], ['popup']));
  assert.ok(!popup.find(check => check.id === 'layout:iphone-normal').command.includes('--geometry-only-popups'));
  assert.ok(popup.find(check => check.id === 'layout:iphone-landscape').command.includes('--geometry-only-popups'));
  assert.ok(checksFor(selectComponents([], ['labels'])).some(check => check.id === 'layout:narrow-320'));
  assert.ok(checksFor(selectComponents(['frontend_src/editor-model.js'])).every(check => check.kind === 'offline'));
  assert.equal(checksFor(selectComponents(['docs/docs/development/local-development.md'])).length, 0);
});

test('editor browser evidence includes the delegated gesture and JSON checks', () => {
  const selected=checksFor(selectComponents([], ['editor-drag', 'json-editor'])).filter(check=>check.kind==='browser');
  assert.ok(selected.length);
  for (const check of selected) for (const file of ['tests/test-ha-editor.js','tests/editor-drag-checks.js','tests/json-editor-checks.js']) {
    assert.ok(check.inputs.includes(file), check.id+' is missing '+file);
  }
});

test('slider header scope retains geometry, optional variants and safe gestures without unrelated suites', () => {
  const selection = selectComponents(['custom_components/marao_dashboard/frontend/MaraoCards.js', 'tests/test-ha-card-alignment.js',
    'tests/test-ha-dashboard-e2e.js', 'ha-test/cases.json', 'ha-test/dashboard/views/00-card-test.yaml'], ['slider-headers']);
  assert.deepEqual(selection.components, ['slider-headers']);
  const checks = checksFor(selection);
  assert.equal(checks.flatMap(check => check.cases || []).filter(row => row.assertion === 'slider-headers' && row.dimensions.includes('geometry')).length, 9);
  assert.ok(checks.some(check => check.id === 'slider-headers:access'));
  for (const id of ['sliders:iphone', 'sliders:android']) assert.ok(checks.some(check => check.id === id));
  for (const profile of ['iphone-page-zoom-200', 'iphone-bold-text-200']) assert.ok(checks.some(check => check.cases?.some(row => row.id === 'slider-headers:' + profile + ':light')));
  assert.ok(!checks.some(check => /camera|editor|mobile-matrix|preserved-upgrade|native-reconnect/.test(check.id)));
});

test('shared scroll fixes select WebKit, Chromium and control lifecycle checks', () => {
  const selected = checksFor(selectComponents(['custom_components/marao_dashboard/frontend/MaraoCards.js', 'tests/test-ha-scroll.js'], ['scroll']));
  assert.ok(selected.some(check => check.command.includes('--webkit')));
  assert.ok(selected.some(check => check.command.includes('tests/test-ha-scroll.js') && !check.command.includes('--webkit')));
  assert.ok(selected.some(check => check.command.includes('tests/test-ha-security.js')));
  assert.ok(selected.some(check => check.command.includes('tests/test-ha-value-sliders.js')));
  assert.ok(!selected.some(check => /mobile-matrix|editor|preserved-upgrade/.test(check.id)));
});

test('energy history regressions select energy checks without unrelated verification scenarios', () => {
  const selection = selectComponents(['tests/test-ha-energy-format.js']);
  assert.deepEqual(selection.components, ['energy']);
  assert.deepEqual(checksFor(selection).map(check => check.id), ['unit:marao-energy-format', 'energy']);
});

test('unknown paths, ambiguous shared sources and invalid flags cannot broaden or skip scope', () => {
  assert.throws(() => selectComponents(['new-unknown.js']), /Unmapped/);
  assert.throws(() => selectComponents(['custom_components/marao_dashboard/frontend/MaraoCards.js']), /declare --component/);
  assert.throws(() => selectComponents(['custom_components/marao_dashboard/frontend/MaraoCards.js'], ['docs']), /runtime component/);
  assert.throws(() => parseArgs(['--base']), /requires a value/);
  assert.throws(() => parseArgs(['--everything']), /Unknown/);
  assert.equal(parseArgs([]).parallel, false);
  assert.equal(parseArgs([]).full, false);
});

test('release defaults to unit tests even for camera, shared UI and persistence changes', () => {
  const comparison = { base: 'base', head: 'candidate', files: [] };
  for (const component of ['camera', 'navbar-startup', 'control-grid', 'migration']) {
    const plan = makePlan({ release: true, components: [component] }, comparison);
    assert.equal(plan.unit, true);
    assert.equal(plan.offline, true);
    assert.ok(plan.checks.length);
    assert.ok(plan.checks.every(check => /^(unit:|python:)/.test(check.id)));
    assert.ok(plan.checks.every(check => check.command.includes('--test') || check.command.includes('pytest')));
    assert.ok(!plan.checks.some(check => check.id === 'preserved-upgrade'));
  }
  const explicit = makePlan({ components: ['camera'] }, comparison);
  assert.ok(explicit.checks.some(check => check.kind === 'browser'));
  assert.throws(() => parseArgs(['--unit', '--full']), /cannot be combined/);
});

test('comparison includes whole committed batch, staged, unstaged, deleted and untracked files', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-scope-git-'));
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  try {
    git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
    fs.writeFileSync(path.join(directory, 'old.txt'), 'initial'); git('add', '.'); git('commit', '-qm', 'baseline'); git('tag', 'v1.0.0');
    fs.writeFileSync(path.join(directory, 'first.txt'), 'one'); git('add', '.'); git('commit', '-qm', 'first');
    fs.writeFileSync(path.join(directory, 'second.txt'), 'two'); git('add', '.'); git('commit', '-qm', 'second');
    assert.deepEqual(changedFiles({ release: true, base: 'v1.0.0' }, directory).files, ['first.txt', 'second.txt']);
    fs.writeFileSync(path.join(directory, 'first.txt'), 'staged'); git('add', '.');
    fs.writeFileSync(path.join(directory, 'second.txt'), 'unstaged'); fs.unlinkSync(path.join(directory, 'old.txt'));
    fs.writeFileSync(path.join(directory, 'new.txt'), 'untracked');
    assert.deepEqual(changedFiles({ base: 'v1.0.0' }, directory).files, ['first.txt', 'new.txt', 'old.txt', 'second.txt']);
    assert.throws(() => changedFiles({ base: 'missing' }, directory));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('parallelism is opt-in and exclusive jobs never overlap readers', async () => {
  for (const parallel of [false, true]) {
    let active = 0, maximum = 0;
    const result = await schedule([{ id: 'a' }, { id: 'b' }, { id: 'write', exclusive: true }, { id: 'c' }], async check => {
      if (check.exclusive) assert.equal(active, 0);
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 5)); active--;
    }, { parallel });
    assert.equal(result.failure, null);
    assert.equal(result.results.length, 4);
    assert.equal(maximum, parallel ? 2 : 1);
  }
});

test('failures and cancellation wait for active jobs and prevent later work', async () => {
  let finished = false;
  const result = await schedule([{ id: 'fail' }, { id: 'reader' }, { id: 'write', exclusive: true }], async check => {
    if (check.id === 'fail') throw new Error('fixture failure');
    assert.notEqual(check.id, 'write');
    await new Promise(resolve => setTimeout(resolve, 5)); finished = true;
  }, { parallel: true });
  assert.equal(finished, true);
  assert.match(result.failure.message, /fixture failure/);
  assert.equal(result.results.find(row => row.id === 'fail').passed, false);
  const controller = new AbortController(); controller.abort();
  assert.match((await schedule([{ id: 'never' }], () => assert.fail(), { signal: controller.signal })).failure.message, /cancelled/);
});

test('automatic CI uses affected ranges and manual comprehensive/parallel options default off', () => {
  const workflow = YAML.parse(fs.readFileSync(new URL('../../.github/workflows/tests.yml', import.meta.url), 'utf8'));
  assert.equal(workflow.on.workflow_dispatch.inputs.full.default, false);
  assert.equal(workflow.on.workflow_dispatch.inputs.parallel.default, false);
  const step = workflow.jobs.test.steps.find(step => step.name.startsWith('Run affected'));
  assert.match(step.run, /--offline --head/);
  assert.match(step.run, /if \[\[ "\$MARAO_FULL" == "true" \]\]; then args\+=\(--full\); else args\+=\(--unit\); fi/);
  assert.match(step.run, /--base/);
  assert.match(step.env.MARAO_FULL, /workflow_dispatch/);
  assert.match(step.env.MARAO_PARALLEL, /workflow_dispatch/);
  assert.doesNotMatch(step.run, /npm run test:static|pytest --cov|verify:release/);
});

test('navbar overflow scope covers configuration, preservation, native, geometry and bounded mobile checks', () => {
  const plan = makePlan({components:['navbar-overflow']}, {base:'base',head:'head',files:['frontend_src/editor-model.js','custom_components/marao_dashboard/native.py','custom_components/marao_dashboard/frontend/MaraoCards.js']});
  assert.equal(plan.upgradeRequired,true);
  assert.ok(plan.checks.some(check=>check.id==='python:test_navbar_overflow'));
  assert.ok(plan.checks.some(check=>check.id==='navbar-overflow:alignment'));
  assert.ok(plan.checks.some(check=>check.id==='navbar-overflow:iphone-bold-text-200'));
  assert.ok(!plan.checks.some(check=>/mobile-matrix|editor-drag|json-editor|preserved-upgrade/.test(check.id)));
});

test('UI batch selection keeps bounded runtime and editor consumers without historical matrices', () => {
  const selection = selectComponents(['custom_components/marao_dashboard/frontend/MaraoCards.js', 'custom_components/marao_dashboard/frontend/MaraoDashboard.js',
    'frontend_src/MaraoDashboardPanel.js', 'tests/test-ha-dashboard-accessibility.js', 'tests/test-ha-editor.js', 'tests/measure-ha-editor.js', 'tests/editor-rendering-checks.js'], ['battery-groups', 'access-label', 'editor-rendering']);
  assert.deepEqual(selection.components, ['access-label', 'battery-groups', 'editor-rendering']);
  const checks = checksFor(selection);
  assert.ok(checks.some(c => c.command.includes('--battery')));
  assert.ok(checks.some(c => c.command.includes('--access')));
  assert.ok(checks.some(c => c.command.includes('--rendering')));
  assert.ok(checks.some(c => c.command.includes('--drag-save')));
  assert.ok(!checks.some(c => /mobile-matrix|preserved-upgrade|native-reconnect|camera/.test(c.id)));
  for (const c of checks.filter(c => c.command.includes('tests/test-ha-editor.js'))) assert.ok(c.inputs.includes('tests/editor-rendering-checks.js'));
});

test('reviewed camera title forms retain native acceptance without unrelated native-card geometry or JSON preload matrices', () => {
  const files=['frontend_src/native-model.js','frontend_src/MaraoNativeCardEditor.js','frontend_src/editor-labels.js','custom_components/marao_dashboard/frontend/MaraoDashboardEditorLabels.js'];
  const scope=selectComponents(files,['camera','editor-ui']);
  assert.ok(scope.components.includes('camera-editor'));assert.ok(!scope.components.includes('native'));assert.ok(!scope.components.includes('editor-preload'));
  const checks=checksFor(scope);assert.ok(checks.some(c=>c.id==='native-editor'));assert.ok(checks.some(c=>c.id==='unit:marao-native'));assert.ok(checks.some(c=>c.id==='python:test_native'));
  assert.ok(!checks.some(c=>c.id.startsWith('layout:')||c.id.startsWith('editor-preload:')));
  assert.ok(selectComponents(['frontend_src/native-model.js']).components.includes('native'),'Unreviewed shared edits retain conservative native scope');
  assert.ok(checksFor(selectComponents(['frontend_src/native-model.js'],['native'])).some(c=>c.id==='layout:android-normal'));
});
