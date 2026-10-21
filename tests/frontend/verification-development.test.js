import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { changesSince, reviewedFiles, writeSnapshot } = require('../verification-task');
const { changedFiles, makePlan, parseArgs, runPlan, validateEvidence } = require('../verification');
const { checksFor, inspectionFor, selectComponents } = require('../verification-map');
const { readReuse } = require('../verification-reuse');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-task-scope-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'repo'); fs.mkdirSync(root);
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (file, body) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), body); };
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  write('.gitignore', 'ignored.txt\n'); write('edited.js', 'initial'); write('unrelated.js', 'initial'); write('deleted.js', 'initial');
  write('restored.js', 'initial'); git('add', '.'); git('commit', '-qm', 'baseline');
  return { root, git, write, filename: path.join(directory, 'baseline.json') };
}

test('task snapshots compare bytes after dirty starts, commits, additions, deletions and restoration', t => {
  const f = fixture(t);
  f.write('edited.js', 'existing dirty edit'); f.write('unrelated.js', 'unrelated dirty edit');
  f.write('untracked.js', 'existing untracked'); f.write('ignored.txt', 'private fixture');
  fs.unlinkSync(path.join(f.root, 'restored.js'));
  const snapshot = writeSnapshot(f.filename, f.root);
  assert.equal(fs.statSync(f.filename).mode & 0o077, 0);
  assert.ok(!Object.hasOwn(snapshot.files, 'ignored.txt'));
  assert.deepEqual(changesSince(f.filename, f.root).files, []);
  f.write('edited.js', 'this task changes the already dirty file'); f.write('committed.js', 'committed task change');
  f.git('add', 'committed.js'); f.git('commit', '-qm', 'task commit');
  f.write('untracked.js', 'this task changes the existing untracked file');
  f.write('added.js', 'new task file'); f.write('restored.js', 'initial');
  fs.unlinkSync(path.join(f.root, 'deleted.js')); f.git('add', 'edited.js');
  assert.deepEqual(changedFiles({ since: f.filename }, f.root).files, ['added.js', 'committed.js', 'deleted.js', 'edited.js', 'restored.js', 'untracked.js']);
  assert.equal(changesSince(f.filename, f.root).base, snapshot.head);
  assert.notEqual(changesSince(f.filename, f.root).head, snapshot.head);
  assert.equal(changesSince(f.filename, f.root).task_scope, true);
});

test('snapshots reject overwrite, another repository, unsafe paths and nonprivate inputs', t => {
  const f = fixture(t), snapshot = writeSnapshot(f.filename, f.root);
  assert.throws(() => writeSnapshot(f.filename, f.root), /EEXIST/);
  fs.chmodSync(f.filename, 0o644); assert.throws(() => changesSince(f.filename, f.root), /private/);
  fs.chmodSync(f.filename, 0o600);
  for (const patch of [{ root: f.root + '/another' }, { version: 9 }, { files: { '../outside': 'a'.repeat(64) } }, { files: { 'edited.js': 'invalid' } }]) {
    fs.writeFileSync(f.filename, JSON.stringify({ ...snapshot, ...patch }));
    assert.throws(() => changesSince(f.filename, f.root));
  }
  fs.unlinkSync(f.filename); fs.symlinkSync(path.join(f.root, 'edited.js'), f.filename);
  assert.throws(() => changesSince(f.filename, f.root), /private/);
});

test('reviewed subsets report omitted concurrent changes and reject unknown or escaping paths', () => {
  const comparison = { files: ['frontend_src/panel.css', 'frontend_src/editor-model.js'], head: 'head' };
  const subset = reviewedFiles(comparison, ['frontend_src/panel.css']);
  assert.deepEqual(subset.files, ['frontend_src/panel.css']);
  assert.deepEqual(subset.omitted_changed_files, ['frontend_src/editor-model.js']);
  assert.equal(subset.task_scope, true);
  for (const file of ['unchanged.js', '../outside', '/absolute']) assert.throws(() => reviewedFiles(comparison, [file]));
  assert.deepEqual(parseArgs(['--file', 'one.js', '--file', 'two.js,three.js']).files, ['one.js', 'two.js', 'three.js']);
});

test('visual selection runs no suites and behavior excludes local browser matrices', () => {
  const comparison = { base: 'base', head: 'head', files: ['custom_components/marao_dashboard/frontend/MaraoCamera.js'] };
  const visual = makePlan({ tier: 'visual' }, comparison);
  assert.deepEqual(visual.checks, []); assert.equal(visual.development_only, true);
  assert.deepEqual(visual.inspection.families, ['hc_camera_card']);
  assert.match(visual.inspection.status, /not performed/); assert.equal(visual.passed, undefined);
  const behavior = makePlan({ tier: 'behavior' }, comparison);
  assert.ok(behavior.checks.length);
  assert.ok(behavior.checks.every(check => /^(unit:|python:|editor-assets$|package-assets$)/.test(check.id)));
  assert.ok(!behavior.checks.some(check => check.command.some(arg => /test-camera-live-local|test-ha-/.test(arg))));
  const focused = makePlan({}, comparison);
  assert.equal(focused.development_only, false); assert.ok(focused.checks.some(check => check.id === 'camera:local'));
});

test('task scope never guesses shared consumers even in offline mode', () => {
  const comparison = { base: 'base', head: 'head', task_scope: true, files: ['custom_components/marao_dashboard/frontend/MaraoCards.js'] };
  for (const tier of ['visual', 'behavior', 'focused']) assert.throws(() => makePlan({ tier, offline: true }, comparison), /declare --component/);
  const plan = makePlan({ tier: 'visual', components: ['slider'] }, comparison);
  assert.deepEqual(plan.components, ['cover', 'fan', 'light', 'slider']);
  assert.deepEqual(plan.inspection.families.sort(), ['hc_cover_card', 'hc_fan_card', 'hc_light_card']);
  assert.deepEqual(inspectionFor(selectComponents([], ['navbar'])).families, ['marao-navbar-card']);
  assert.deepEqual(inspectionFor(selectComponents([], ['labels'])).unresolved, ['labels']);
  assert.equal(inspectionFor(selectComponents([], ['editor-ui'])).editor, true);
});

test('release and full plans reject development flags before selecting or resolving a baseline', () => {
  for (const restricted of ['--release', '--full']) for (const flags of [
    ['--since', '/missing.json'], ['--snapshot', '/missing.json'], ['--file', 'one.js'], ['--tier', 'visual'], ['--tier', 'behavior'],
  ]) assert.throws(() => parseArgs([restricted, ...flags]), /Publication and full/);
  for (const options of [{ since: '/missing.json' }, { snapshot: '/missing.json' }, { files: ['one.js'] }, { tier: 'visual' }]) {
    assert.throws(() => makePlan({ ...options, release: true }), /Publication and full/);
  }
  assert.throws(() => makePlan({ release: true }, { task_scope: true, files: [] }), /cannot use task scope/);
  assert.throws(() => parseArgs(['--since', '/missing.json', '--base', 'HEAD']), /cannot be combined/);
  assert.throws(() => parseArgs(['--tier', 'visual', '--reuse', '/report.json']), /cannot consume publication evidence/);
  assert.throws(() => parseArgs(['--snapshot', '/baseline.json', '--plan']), /separately/);
  assert.throws(() => parseArgs(['--tier', 'fast']), /Unknown verification tier/);
  for (const scope of [{ development_only: true }, { task_scope: true }, { tier: 'behavior' }, { tier: 'visual' }]) {
    assert.throws(() => require('../verify-release').validateScopedUpgrade({}, {}, {}, scope), /Development-only scope/);
  }
});

test('development reports cannot be reused or validated as release proof', async t => {
  const comparison = { base: 'base', head: 'head', files: ['docs/docs/development/focused-testing.md'] };
  const plan = makePlan({ tier: 'behavior' }, comparison);
  const { filename, report } = await runPlan(plan);
  t.after(() => fs.rmSync(path.dirname(filename), { recursive: true, force: true }));
  assert.equal(report.kind, 'development-verification'); assert.equal(report.development_only, true);
  assert.throws(() => readReuse(filename));
  assert.throws(() => validateEvidence(report, makePlan({}, comparison), {}), /Development-only/);
  for (const patch of [{ task_scope: true }, { tier: 'visual' }]) {
    assert.throws(() => validateEvidence({ ...report, development_only: false, kind: 'scoped-verification', ...patch }, makePlan({}, comparison), {}), /Development-only/);
  }
  await assert.rejects(runPlan(makePlan({ tier: 'visual' }, comparison)), /requires inspection/);
});

test('new development tools select their own checks with reviewed shared helper changes', () => {
  const preview = selectComponents(['tests/preview-frontend.js', 'tests/test-ha-dashboard-accessibility.js'], ['frontend-preview']);
  assert.deepEqual(preview.components, ['frontend-preview']);
  assert.ok(checksFor(preview).every(check => check.kind === 'offline'));
  const preparation = selectComponents(['ha-test/prepare-frontend.js']);
  assert.deepEqual(preparation.components, ['frontend-preview-preparation']);
  assert.deepEqual(checksFor(preparation).map(check => check.id), ['unit:frontend-preparation']);
  assert.deepEqual(selectComponents(['tests/verification-task.js']).components, ['verification-development']);
});
