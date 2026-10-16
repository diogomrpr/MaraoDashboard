import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { changedFiles, makePlan, parseArgs, schedule } = require('../verification');
const { selectComponents, checksFor } = require('../verification-map');
const YAML = require('yaml');

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

test('only persistence changes select live upgrade checks during scoped release preparation', () => {
  const comparison = { base: 'base', head: 'candidate', files: [] };
  assert.equal(makePlan({ release: true, components: ['labels'] }, comparison).checks.some(check => check.id === 'preserved-upgrade'), false);
  assert.equal(makePlan({ release: true, components: ['migration'] }, comparison).checks.some(check => check.id === 'preserved-upgrade'), true);
  assert.equal(makePlan({ components: ['migration'] }, comparison).checks.some(check => check.id === 'preserved-upgrade'), false);
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
  assert.match(step.run, /--base/);
  assert.match(step.env.MARAO_FULL, /workflow_dispatch/);
  assert.match(step.env.MARAO_PARALLEL, /workflow_dispatch/);
  assert.doesNotMatch(step.run, /npm run test:static|pytest --cov|verify:release/);
});
