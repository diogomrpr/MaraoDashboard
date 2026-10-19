import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { validateEvidence, runPlan } = require('../verification');
const { validateScopedUpgrade } = require('../verify-release');
const { scopedPlan } = require('../test-ha-upgrade');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { digest } = require('../verification');

test('executed plans emit reusable version-4 evidence independently of the plan schema', async () => {
  const plan = { version: 1, base: 'baseline', head: 'candidate', mode: 'affected', components: ['docs'], checks: [] };
  const { filename, report } = await runPlan(plan);
  try {
    assert.equal(report.version, 4);
    assert.equal(JSON.parse(fs.readFileSync(filename)).version, 4);
    assert.equal(validateEvidence(report, plan, {}, { exactCommit: true }), report);
  } finally { fs.rmSync(path.dirname(filename), { recursive: true, force: true }); }
});

test('scoped evidence rejects omitted consumers, changed inputs, target drift and false full claims', () => {
  const plan = { base: 'base', head: 'candidate', mode: 'affected', components: ['cover', 'fan', 'light', 'slider'], checks: [{ id: 'slider' }] };
  const report = { version: 3, kind: 'scoped-verification', passed: true, verified_cleanup: true, base: 'base', head: 'candidate',
    mode: 'affected', components: plan.components, required: ['slider'], results: [{ id: 'slider', passed: true, input_sha256: 'current' }],
    completed_at: new Date().toISOString(), target: 'http://192.168.0.28:8123' };
  const validate = value => validateEvidence(value, plan, { slider: 'current' }, { target: report.target, exactCommit: true });
  assert.equal(validate(report), report);
  for (const patch of [{ components: ['light'] }, { required: [] }, { verified_cleanup: false }, { mode: 'full' }, { head: 'other' },
    { target: 'http://other.invalid' }, { completed_at: '2020-01-01' }, { results: [{ id: 'slider', passed: true, input_sha256: 'changed' }] },
    { results: [{ id: 'slider', passed: false, input_sha256: 'current' }] }, { version: 2 }]) assert.throws(() => validate({ ...report, ...patch }));
});

test('scoped migration proof independently requires every affected baseline and recovery assertion', () => {
  const config = { url: 'http://192.168.0.28:8123', disposable: true, sshHost: '192.168.0.28', remoteConfigPath: '/config' };
  const candidate = { commit: 'candidate' }, scope = { components: ['migration'] };
  const selected = scopedPlan(config, scope.components);
  assert.equal(selected.baselines.length, 7);
  assert.equal(scopedPlan(config, ['lifecycle']).baselines.length, 2);
  const coverage = JSON.parse(fs.readFileSync(new URL('../../ha-test/upgrade/coverage.json', import.meta.url)));
  const report = { version: 3, kind: 'preserved-install-upgrade-scoped', candidate, target: config.url, verified_cleanup: true,
    scope_components: scope.components, baselines: selected.baselines, completed_at: new Date().toISOString(),
    install_assertions: selected.baselines.flatMap(baseline => coverage.required_install_assertions
      .filter(name => name !== 'baseline-package-health' || baseline === 'v0.5.1').map(assertion => ({ baseline, assertion, passed: true }))),
    runs: selected.formats.flatMap(format => ['light', 'dark'].map(theme => ({ check: 'upgraded-pages', format, theme, profile: 'iphone-normal', passed: true }))) };
  assert.equal(validateScopedUpgrade(report, config, candidate, scope), report);
  for (const patch of [{ baselines: selected.baselines.slice(1) }, { install_assertions: report.install_assertions.slice(1) }, { runs: report.runs.slice(1) },
    { verified_cleanup: false }, { failure: 'interrupted' }, { scope_components: ['lifecycle'] }]) assert.throws(() => validateScopedUpgrade({ ...report, ...patch }, config, candidate, scope));
});

test('scoped representative capture proof rejects missing or modified bytes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-capture-proof-'));
  try {
    fs.writeFileSync(path.join(directory, 'review.png'), 'representative', { mode: 0o600 });
    const plan = { base: 'base', head: 'candidate', components: ['labels'], mode: 'affected',
      checks: [{ id: 'layout', command: ['node', '--screenshots', 'review'] }] };
    const report = { version: 3, kind: 'scoped-verification', passed: true, verified_cleanup: true, base: plan.base,
      head: plan.head, components: plan.components, mode: plan.mode, required: ['layout'], artifact_root: directory,
      completed_at: new Date().toISOString(), results: [{ id: 'layout', passed: true, input_sha256: 'current', captures: { 'review.png': digest('representative') } }] };
    const check = value => validateEvidence(value, plan, { layout: 'current' });
    check(report);
    assert.throws(() => check({ ...report, artifact_root: undefined }), /Missing captured/);
    assert.throws(() => check({ ...report, results: [{ ...report.results[0], captures: {} }] }), /Missing representative/);
    fs.writeFileSync(path.join(directory, 'review.png'), 'altered');
    assert.throws(() => check(report), /Changed browser capture/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
