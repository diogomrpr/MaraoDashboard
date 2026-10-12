const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');
const { assertDisposableHaTarget, readConfig, repoRoot } = require('../ha-test/client');
const { candidateIdentity } = require('../ha-test/upgrade/prepared');

function readReleaseReport(filename) {
  assert.ok(typeof filename === 'string' && path.isAbsolute(filename), 'Provide the absolute path to the private upgrade report.');
  const stat = fs.lstatSync(filename);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && !(stat.mode & 0o077), 'Upgrade evidence must be a private regular file.');
  return fs.readFileSync(filename);
}

function validateReleaseReport(report, config, candidate, coverage, now = Date.now()) {
  assertDisposableHaTarget(config, { requireSsh: true });
  assert.equal(new URL(config.url).hostname, '192.168.0.28', 'Release verification requires the authorized disposable instance.');
  assert.equal(report?.version, 2, 'Unsupported upgrade report.');
  assert.ok(!report.failure, 'The upgrade operation failed.');
  assert.equal(report.kind, 'preserved-install-upgrade', 'Missing preserved-install upgrade evidence.');
  assert.match(report.operation_id || '', /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/, 'Missing upgrade operation identity.');
  assert.ok(isDeepStrictEqual(report.candidate, candidate), 'Candidate changed since upgrade verification.');
  assert.equal(report.target, config.url, 'Upgrade evidence belongs to another target.');
  assert.ok(typeof report.started_at === 'string' && typeof report.completed_at === 'string', 'Missing upgrade completion time.');
  const started = Date.parse(report.started_at), completed = Date.parse(report.completed_at);
  assert.ok(Number.isFinite(started) && Number.isFinite(completed) && started <= completed && completed <= now, 'Missing or invalid upgrade completion time.');
  assert.equal(report.verified_cleanup, true, 'Disposable cleanup was not verified.');
  assert.ok(Array.isArray(report.formats) && report.formats.length, 'Missing upgraded formats.');
  const reviews = report.visual_reviews;
  assert.ok(Array.isArray(reviews) && reviews.every(row => row.passed === true && row.source === 'preserved-install'), 'Missing or failed preserved-install visual inspection.');
  const actual = reviews.map(row => JSON.stringify([row.format, row.profile, row.theme]));
  const expected = coverage.review_profiles.flatMap(profile => coverage.themes.map(theme => JSON.stringify([coverage.shared_format, profile, theme])));
  assert.equal(new Set(actual).size, actual.length, 'Duplicate visual inspection evidence.');
  assert.deepEqual(actual.sort(), expected.sort(), 'Incomplete upgraded mobile/theme visual inspection.');
}

function validateCapturedEvidence(report, filename) {
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');
  const evidence = report.evidence?.filter(row => row.captures);
  assert.equal(evidence?.length, 1, 'Missing shared preserved-install captures.');
  const row = evidence[0];
  assert.equal(row.format, 'generator-json-0', 'Captures must belong to the latest-release upgrade.');
  const relative = value => typeof value === 'string' && value && !path.isAbsolute(value) && !value.includes('\\') && value.split('/').every(part => part && part !== '.' && part !== '..');
  assert.ok(relative(row.captures), 'Invalid capture index path.');
  const indexPath = path.join(path.dirname(filename), row.captures);
  const index = JSON.parse(readReleaseReport(indexPath));
  assert.equal(index.format, row.format);
  assert.equal(digest(JSON.stringify(index.captured)), row.captures_sha256, 'Capture index changed.');
  assert.ok(Object.keys(index.captured).length, 'Empty preserved-install captures.');
  for (const [file, hash] of Object.entries(index.captured)) {
    assert.ok(relative(file), 'Invalid captured image path.');
    assert.equal(digest(readReleaseReport(path.join(path.dirname(indexPath), 'captures', file))), hash, 'Captured image changed.');
  }
  for (const review of report.visual_reviews) assert.equal(review.captures_sha256, row.captures_sha256, 'Visual review belongs to different captures.');
}

function assertCleanCandidate() {
  assert.equal(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: repoRoot, encoding: 'utf8' }).trim(), '', 'Release verification requires a clean final commit.');
}

function verifyRelease(filename, { publish = true } = {}) {
  const bytes = readReleaseReport(filename), report = JSON.parse(bytes);
  const config = readConfig(), candidate = candidateIdentity();
  const coverage = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ha-test/upgrade/coverage.json')));
  validateReleaseReport(report, config, candidate, coverage);
  assertCleanCandidate();
  validateCapturedEvidence(report, filename);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-release-evidence-'));
  try {
    fs.chmodSync(directory, 0o700);
    const snapshot = path.join(directory, 'report.json'), identity = path.join(directory, 'candidate.json');
    fs.writeFileSync(snapshot, bytes, { mode: 0o600 });
    fs.writeFileSync(identity, JSON.stringify(candidate), { mode: 0o600 });
    const venv = path.join(repoRoot, '.venv/bin/python');
    const python = process.env.MARAO_TEST_PYTHON || (fs.existsSync(venv) ? venv : 'python3');
    execFileSync(python, ['tests/upgrade_coverage.py', '--report', snapshot, '--candidate', identity], { cwd: repoRoot, stdio: 'inherit' });
    if (publish) execFileSync('npm', ['run', 'verify:publish', '--', '--upgrade-report', filename], { cwd: repoRoot, stdio: 'inherit' });
    assert.ok(isDeepStrictEqual(candidateIdentity(), candidate), 'Candidate changed during publication checks.');
    assertCleanCandidate();
    assert.equal(crypto.createHash('sha256').update(readReleaseReport(filename)).digest('hex'), crypto.createHash('sha256').update(bytes).digest('hex'), 'Upgrade evidence changed during publication checks.');
    console.log(publish ? 'Final candidate upgrade evidence and publication checks passed. Exact-commit CI validation is still required before publication.' : 'Exact-candidate upgrade evidence validated for browser-check reuse.');
    return report;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    assert.equal(process.argv.length, 3, 'Use npm run verify:release -- /absolute/private/upgrade-report.json.');
    verifyRelease(process.argv[2]);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { readReleaseReport, validateReleaseReport, validateCapturedEvidence, verifyRelease };
