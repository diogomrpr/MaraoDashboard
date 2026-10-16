const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const reviewCapturesRequired = check => {
  const argv = check?.command || [], index = argv.indexOf('--screenshots');
  return argv.includes('--screenshots=review') || index >= 0 && argv[index + 1] === 'review';
};
function validateRoutes(check, visits) {
  for (const item of check.cases || []) for (const route of item.routes || []) {
    assert.ok(Array.isArray(visits) && visits.some(visit => visit.route === route && visit.cases?.includes(item.id)), 'Missing required cold route: ' + route);
  }
}

function privateFile(filename) {
  assert.ok(typeof filename === 'string' && path.isAbsolute(filename), 'Evidence requires an absolute private path');
  const stat = fs.lstatSync(filename);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && !(stat.mode & 0o077)
    && (process.getuid === undefined || stat.uid === process.getuid()), 'Evidence must be an owned private regular file');
  return fs.readFileSync(filename);
}
function readReuse(filename) {
  const report = JSON.parse(privateFile(filename));
  assert.equal(report.version, 4, 'Per-check reuse requires version-4 evidence; rerun older reports');
  assert.equal(report.kind, 'scoped-verification');
  assert.equal(report.mode, 'affected', 'Full-mode evidence cannot supply per-check reuse');
  assert.equal(report.verified_cleanup, true, 'Reuse requires verified cleanup');
  assert.ok(Array.isArray(report.results) && Array.isArray(report.required), 'Malformed reuse evidence');
  assert.ok(report.required.every(id => typeof id === 'string') && new Set(report.required).size === report.required.length, 'Invalid required coverage');
  assert.ok(report.results.every(row => report.required.includes(row.id)), 'Edited or omitted required coverage');
  assert.equal(new Set(report.results.map(row => row.id)).size, report.results.length, 'Duplicate result identity');
  return report;
}
function capturesValid(row, artifactRoot) {
  assert.ok(path.isAbsolute(artifactRoot), 'Missing private capture root');
  const directory = fs.lstatSync(artifactRoot);
  assert.ok(directory.isDirectory() && !directory.isSymbolicLink() && !(directory.mode & 0o077), 'Artifact root must be private');
  for (const [relative, digest] of Object.entries(row.captures || {})) {
    assert.ok(!path.isAbsolute(relative) && relative.split('/').every(part => part && part !== '..' && part !== '.'), 'Invalid capture path');
    const file = path.join(artifactRoot, relative);
    assert.ok(fs.realpathSync(file).startsWith(fs.realpathSync(artifactRoot) + path.sep), 'Capture escaped private artifact root');
    assert.equal(hash(privateFile(file)), digest, 'Changed browser capture');
  }
}
function originResult(filename, row, seen = new Set()) {
  const key = fs.realpathSync(filename) + ':' + row.id;
  assert.ok(!seen.has(key), 'Cyclic reuse provenance'); seen.add(key);
  if (!row.origin) return { filename, row, report: readReuse(filename) };
  const source = readReuse(row.origin.report);
  const original = source.results.find(item => item.id === row.origin.id);
  assert.ok(original?.passed, 'Missing successful original result');
  const result = originResult(row.origin.report, original, seen);
  assert.equal(row.input_sha256, result.row.input_sha256, 'Changed originating identity');
  assert.deepEqual(row.cases, result.row.cases, 'Changed originating coverage');
  assert.deepEqual(row.captures || {}, result.row.captures || {}, 'Changed originating captures');
  assert.equal(row.executed_at, result.row.executed_at, 'Reuse cannot refresh original age');
  return result;
}
function reusableResult(filename, report, check, identity, environment, now = Date.now()) {
  const row = report.results.find(item => item.id === check.id);
  if (!row?.passed) return { reason: row ? 'previous result failed' : 'missing result' };
  const original = originResult(filename, row);
  const time = Date.parse(original.row.executed_at);
  if (!Number.isFinite(time) || time > now || now - time >= 86400000) return { reason: 'original execution is stale' };
  capturesValid(original.row, original.report.artifact_root);
  if (original.row.input_sha256 !== identity) return { reason: 'relevant source/test/policy dependency changed' };
  if (!isDeepStrictEqual(original.row.cases || [], check.cases || [])) return { reason: 'required logical coverage changed' };
  validateRoutes(check, original.report.visits);
  if (check.kind !== 'offline' && !isDeepStrictEqual(original.row.environment, environment)) return { reason: 'target/frontend/browser/fixture or served assets changed' };
  if (reviewCapturesRequired(check) && !Object.keys(original.row.captures || {}).length) return { reason: 'missing representative captures' };
  return { row: { ...original.row, id: check.id, origin: { report: original.filename, id: original.row.id },
    capture_root: original.report.artifact_root, reused: true }, reason: 'matching reviewed inputs, original coverage, environment and verified cleanup' };
}
function atomicReport(filename, report) {
  const temporary = filename + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temporary, filename);
}
async function liveEnvironment(receiptFile) {
  const { readConfig, api } = require('../ha-test/client');
  await require('../ha-test/prepared-batch').verifyBatch(receiptFile);
  const receipt = JSON.parse(privateFile(receiptFile)), config = readConfig();
  const frontend = await fetch(config.url + '/');
  assert.ok(frontend.ok, 'Cannot identify current Home Assistant frontend');
  const html = await frontend.text();
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']*(?:frontend_latest|frontend_es5)[^"']*)["']/g)].map(match => match[1]).sort();
  assert.ok(assets.length, 'Missing Home Assistant frontend asset identity');
  const executable = require('playwright').chromium.executablePath();
  return { target: config.url, home_assistant: (await api(config, 'GET', '/api/config')).version, frontend_assets: assets,
    playwright: require('playwright/package.json').version, browser_sha256: hash(fs.readFileSync(executable)), node: process.version,
    source_sha256: receipt.source_sha256, generated_output: receipt.output, fixtures: receipt.fixture_files,
    served_frontend: receipt.candidate.frontend_fingerprint, fixture_fingerprint: receipt.candidate.fixture_fingerprint };
}
module.exports = { atomicReport, capturesValid, liveEnvironment, originResult, privateFile, readReuse, reusableResult, reviewCapturesRequired, validateRoutes };
