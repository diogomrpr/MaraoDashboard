import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { atomicReport, readReuse, reusableResult, validateRoutes } = require('../verification-reuse');
const { checkIdentity, parseArgs } = require('../verification');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-reuse-')); fs.chmodSync(directory, 0o700);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'report.json'), check = { id: 'case', kind: 'browser', command: ['node', 'check'], cases: [{ id: 'geometry:light', profile: 'narrow-320' }] };
  const row = { id: check.id, passed: true, input_sha256: 'identity', executed_at: new Date().toISOString(), cases: check.cases, environment: { frontend: 'current', fixture: 'current' }, captures: {} };
  const report = { version: 4, kind: 'scoped-verification', mode: 'affected', verified_cleanup: true, passed: false, artifact_root: directory, required: ['case', 'failed'], results: [row, { id: 'failed', passed: false }] };
  atomicReport(filename, report);
  return { directory, filename, check, row, report };
}
test('failed but cleaned batches reuse individual successes and explain invalidated results', t => {
  const f = fixture(t), report = readReuse(f.filename);
  const valid = reusableResult(f.filename, report, f.check, 'identity', f.row.environment);
  assert.equal(valid.row.reused, true); assert.equal(valid.row.executed_at, f.row.executed_at);
  assert.equal(reusableResult(f.filename, report, { ...f.check, id: 'failed' }, 'identity', f.row.environment).row, undefined);
  for (const [identity, environment, check] of [['changed', f.row.environment, f.check], ['identity', { frontend: 'new' }, f.check], ['identity', f.row.environment, { ...f.check, cases: [] }]]) {
    assert.equal(reusableResult(f.filename, report, check, identity, environment).row, undefined);
  }
  assert.equal(reusableResult(f.filename, report, f.check, 'identity', f.row.environment, Date.now() + 86400001).row, undefined);
  for (const command of [['node', '--screenshots', 'review'], ['node', '--screenshots=review']]) {
    const result = reusableResult(f.filename, report, { ...f.check, command }, 'identity', f.row.environment);
    assert.equal(result.row, undefined); assert.match(result.reason, /missing representative/);
  }
});
test('private schema, cleanup and capture boundaries reject invalid reuse before execution', t => {
  const f = fixture(t);
  for (const patch of [{ version: 3 }, { verified_cleanup: false }, { results: {} }, { mode: 'full' }, { required: [] }]) {
    atomicReport(f.filename, { ...f.report, ...patch }); assert.throws(() => readReuse(f.filename));
  }
  atomicReport(f.filename, f.report); fs.chmodSync(f.filename, 0o644); assert.throws(() => readReuse(f.filename), /private/); fs.chmodSync(f.filename, 0o600);
  fs.writeFileSync(f.filename, '{'); assert.throws(() => readReuse(f.filename));
  assert.throws(() => readReuse('relative/report.json'), /absolute/);
  atomicReport(f.filename, { ...f.report, results: [{ ...f.row, captures: { 'missing.png': 'hash' } }] });
  assert.throws(() => reusableResult(f.filename, readReuse(f.filename), f.check, 'identity', f.row.environment));
  assert.throws(() => parseArgs(['--full', '--reuse', f.filename]));
  assert.throws(() => parseArgs(['--reuse', f.filename, '--report', f.filename]));
});
test('reuse chains keep original age, provenance and captures and reject cycles', t => {
  const f = fixture(t), second = path.join(f.directory, 'second.json');
  const first = reusableResult(f.filename, readReuse(f.filename), f.check, 'identity', f.row.environment).row;
  atomicReport(second, { ...f.report, results: [first] });
  const next = reusableResult(second, readReuse(second), f.check, 'identity', f.row.environment).row;
  assert.equal(next.origin.report, f.filename); assert.equal(next.executed_at, f.row.executed_at);
  atomicReport(f.filename, { ...f.report, results: [{ ...f.row, origin: { report: second, id: 'case' } }] });
  assert.throws(() => reusableResult(second, readReuse(second), f.check, 'identity', f.row.environment), /Cyclic/);
});
test('identity projects resolved coverage and reviewed inputs without hashing unrelated map entries', t => {
  const f = fixture(t); for (const name of ['a.js', 'b.js', 'tests/verification-map.js']) { const p = path.join(f.directory, name); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, 'initial'); }
  const a = { ...f.check, inputs: ['a.js'] }, b = { ...f.check, inputs: ['b.js'] };
  const beforeA = checkIdentity(a, f.directory), beforeB = checkIdentity(b, f.directory);
  fs.writeFileSync(path.join(f.directory, 'a.js'), 'changed'); fs.writeFileSync(path.join(f.directory, 'tests/verification-map.js'), 'unrelated definition');
  assert.notEqual(checkIdentity(a, f.directory), beforeA); assert.equal(checkIdentity(b, f.directory), beforeB);
  assert.notEqual(checkIdentity({ ...b, cases: [] }, f.directory), beforeB);
});

test('logical cold-load coverage requires linked physical visits to every selected route', () => {
  const check = { cases: [{ id: 'headers:normal', routes: ['/marao-dashboard/card-test', '/marao-dashboard/living-room'] }] };
  const visits = check.cases[0].routes.map(route => ({ route, cases: ['headers:normal'] }));
  validateRoutes(check, visits);
  assert.throws(() => validateRoutes(check, visits.slice(0, 1)), /Missing required cold route/);
  assert.throws(() => validateRoutes(check, visits.map(row => ({ ...row, cases: ['unrelated'] }))), /Missing required cold route/);
  assert.throws(() => validateRoutes(check), /Missing required cold route/);
});
