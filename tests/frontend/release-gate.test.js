import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const filename = path.join(root, 'tests/verify-release.js');
const config = { url: 'http://192.168.0.28:8123', disposable: true, sshHost: '192.168.0.28' };
const candidate = { commit: 'a'.repeat(40), package_sha256: 'b'.repeat(64) };
const coverage = JSON.parse(fs.readFileSync(path.join(root, 'ha-test/upgrade/coverage.json')));
const report = () => ({ version: 2, kind: 'preserved-install-upgrade', operation_id: '12345678-1234-1234-1234-123456789abc', target: config.url,
  candidate: structuredClone(candidate), started_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T01:00:00Z', verified_cleanup: true,
  formats: ['native-storage-0', 'generator-json-0', 'generator-json-1', 'generator-json-2'],
  visual_reviews: coverage.review_profiles.flatMap(profile => coverage.themes.map(theme => ({ format: coverage.shared_format, profile, theme, passed: true, source: 'preserved-install' }))),
});

function writeEvidence(file) {
  const value = report(), directory = path.join(path.dirname(file), 'v0.5.1');
  const captured = { 'review.png': crypto.createHash('sha256').update('Mocked capture; not release evidence').digest('hex') };
  const hash = crypto.createHash('sha256').update(JSON.stringify(captured)).digest('hex');
  fs.mkdirSync(path.join(directory, 'captures'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'captures/review.png'), 'Mocked capture; not release evidence', { mode: 0o600 });
  fs.writeFileSync(path.join(directory, 'captures.json'), JSON.stringify({ format: coverage.shared_format, captured }), { mode: 0o600 });
  value.evidence = [{ format: coverage.shared_format, captures: 'v0.5.1/captures.json', captures_sha256: hash }];
  value.visual_reviews.forEach(row => { row.captures_sha256 = hash; });
  fs.writeFileSync(file, JSON.stringify(value), { mode: 0o600 });
  return value;
}

function loadGate(exec, identity = () => structuredClone(candidate)) {
  const module = { exports: {} };
  vm.runInThisContext('(function(require,module){' + fs.readFileSync(filename, 'utf8') + '\n})', { filename })(name => {
    if (name === 'node:child_process') return { execFileSync: exec };
    if (name === '../ha-test/client') return { ...require('../../ha-test/client'), readConfig: () => config, repoRoot: root };
    if (name === '../ha-test/upgrade/prepared') return { candidateIdentity: identity };
    return require(name);
  }, module);
  return module.exports;
}

test('release evidence rejects fresh-fixture results, incomplete visual inspection, failed cleanup and candidate drift', () => {
  const { validateReleaseReport } = loadGate(() => { throw new Error('Metadata validation must not start a command'); });
  validateReleaseReport(report(), config, candidate, coverage);
  for (const change of [
    r => { r.version = 1; }, r => { r.failure = 'Interrupted'; }, r => { r.kind = 'ordinary-gallery'; }, r => { delete r.operation_id; }, r => { r.candidate.commit = 'changed'; },
    r => { r.target = 'http://192.168.0.29:8123'; }, r => { delete r.completed_at; }, r => { r.completed_at = '9999-01-01'; },
    r => { r.completed_at = '2025-01-01'; }, r => { r.verified_cleanup = false; }, r => { r.visual_reviews.pop(); },
    r => { r.visual_reviews[0].passed = false; }, r => { r.visual_reviews[0].source = 'reseeded'; },
    r => { r.visual_reviews.push(r.visual_reviews[0]); },
  ]) { const value = report(); change(value); assert.throws(() => validateReleaseReport(value, config, candidate, coverage)); }
  assert.throws(() => validateReleaseReport(report(), { ...config, disposable: false }, candidate, coverage));
  assert.throws(() => validateReleaseReport(report(), { ...config, url: 'http://192.168.0.29:8123', sshHost: '192.168.0.29' }, candidate, coverage));
});

test('report files must be private and regular', () => {
  const { readReleaseReport } = loadGate(() => {});
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-release-file-test-'));
  try {
    const file = path.join(directory, 'report.json'); fs.writeFileSync(file, JSON.stringify(report()), { mode: 0o600 });
    assert.deepEqual(JSON.parse(readReleaseReport(file)), report());
    fs.chmodSync(file, 0o644); assert.throws(() => readReleaseReport(file), /private regular/);
    fs.chmodSync(file, 0o600); fs.symlinkSync(file, path.join(directory, 'link.json'));
    assert.throws(() => readReleaseReport(path.join(directory, 'link.json')), /private regular/);
    assert.throws(() => readReleaseReport('relative.json'), /absolute path/);
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test('browser evidence reuse rejects changed images, indices, paths and review hashes', () => {
  const { validateCapturedEvidence } = loadGate(() => { throw new Error('Capture validation must be read-only'); });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-release-capture-test-'));
  const file = path.join(directory, 'report.json');
  try {
    const value = writeEvidence(file);
    validateCapturedEvidence(value, file);
    fs.writeFileSync(path.join(directory, 'v0.5.1/captures/review.png'), 'Changed pixels');
    assert.throws(() => validateCapturedEvidence(value, file), /Captured image changed/);
    writeEvidence(file);
    for (const change of [row => { row.evidence = []; }, row => { row.evidence[0].captures = '../outside.json'; },
      row => { row.evidence[0].captures_sha256 = 'stale'; }, row => { row.visual_reviews[0].captures_sha256 = 'stale'; }]) {
      const invalid = structuredClone(value); change(invalid);
      assert.throws(() => validateCapturedEvidence(invalid, file));
    }
    fs.chmodSync(path.join(directory, 'v0.5.1/captures/review.png'), 0o644);
    assert.throws(() => validateCapturedEvidence(value, file), /private regular/);
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test('release checks gate publication, detect mid-run drift and clean private snapshots on failure', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-release-flow-test-')), file = path.join(directory, 'report.json');
  try {
    for (const failure of ['dirty', 'coverage', 'publish', 'candidate', 'report']) {
      writeEvidence(file);
      const calls = []; let snapshot, changed = false;
      const { verifyRelease } = loadGate((command, args) => {
        calls.push(command);
        if (command === 'git') return failure === 'dirty' ? ' M tracked-file' : '';
        if (command === 'npm') {
          assert.deepEqual(args, ['run', 'verify:publish', '--', '--upgrade-report', file]);
          if (failure === 'publish') throw new Error('Publication check failed');
          changed = failure === 'candidate';
          if (failure === 'report') fs.writeFileSync(file, JSON.stringify({ ...report(), changed: true }));
          return '';
        }
        assert.equal(args[0], 'tests/upgrade_coverage.py');
        snapshot = path.dirname(args[2]);
        assert.equal(fs.statSync(snapshot).mode & 0o777, 0o700);
        for (const evidence of [args[2], args[4]]) assert.equal(fs.statSync(evidence).mode & 0o777, 0o600);
        assert.deepEqual(JSON.parse(fs.readFileSync(args[4])), candidate);
        if (failure === 'coverage') throw new Error('Incomplete coverage');
        return '';
      }, () => changed ? { ...candidate, commit: 'changed' } : structuredClone(candidate));
      assert.throws(() => verifyRelease(file));
      if (['dirty', 'coverage'].includes(failure)) assert.ok(!calls.includes('npm'), 'Publication started before evidence passed');
      if (snapshot) assert.equal(fs.existsSync(snapshot), false, 'Private snapshot remained after a failed gate');
    }
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test('a complete mocked gate checks coverage before publication and removes its private snapshots', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-release-success-test-')), file = path.join(directory, 'report.json');
  const calls = []; let snapshot;
  try {
    const saved = writeEvidence(file);
    const { verifyRelease } = loadGate((command, args) => {
      calls.push(command === 'git' ? 'clean' : command === 'npm' ? 'publish' : 'coverage');
      if (args[0] === 'tests/upgrade_coverage.py') snapshot = path.dirname(args[2]);
      return '';
    });
    verifyRelease(file);
    assert.deepEqual(calls, ['clean', 'coverage', 'publish', 'clean']);
    assert.equal(fs.existsSync(snapshot), false);
    assert.deepEqual(JSON.parse(fs.readFileSync(file)), saved);
    calls.length = 0;
    assert.deepEqual(verifyRelease(file, { publish: false }), saved);
    assert.deepEqual(calls, ['clean', 'coverage', 'clean']);
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test('the live upgrade and release gate are outside routine scripts and workflows', () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).scripts;
  assert.equal(scripts['verify:release'], 'node tests/verify-release.js');
  const visited = new Set();
  const visit = name => {
    if (visited.has(name)) return; visited.add(name);
    assert.ok(!['verify:release', 'test:ha:upgrade'].includes(name), 'Routine checks invoked the release-only flow');
    for (const match of scripts[name].matchAll(/npm (?:run )?([a-z][a-z0-9:-]*)/g)) if (scripts[match[1]]) visit(match[1]);
  };
  for (const name of ['test', 'test:static', 'verify:publish', 'preversion']) visit(name);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'tests/verify-publish.js'), 'utf8'), /test-ha-upgrade|test:ha:upgrade|verify:release/);
  for (const file of fs.readdirSync(path.join(root, '.github/workflows'))) assert.doesNotMatch(fs.readFileSync(path.join(root, '.github/workflows', file), 'utf8'), /npm run (?:verify:release|test:ha:upgrade)/);
});
