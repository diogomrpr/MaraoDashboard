import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { validatePages } from '../../frontend_src/editor-model.js';

const require = createRequire(import.meta.url);
const { assertUnrelatedEntries, extendedSource, patchRegistration, plan, validateVisualReviews, withRecovery } = require('../test-ha-upgrade');
const { undeliveredFix, validateKnownFailure } = require('../native-reconnect-exception');
const YAML = require('yaml');
const config = { url: 'http://192.168.0.28:8123', disposable: true, sshHost: '192.168.0.28' };

test('release plan covers every frozen baseline and all four formats without remote operations', () => {
  const value = plan(config);
  assert.equal(value.rows.length, 7); assert.equal(value.rows[0].baseline, 'v0.5.1');
  assert.deepEqual(new Set(value.rows.map(row => row.format)), new Set(value.formats));
  assert.deepEqual(value.current, JSON.parse(JSON.stringify(value.current)), 'The expected installed fixture must contain only persisted JSON values');
  for (const row of value.rows) assert.deepEqual(row.expected, JSON.parse(JSON.stringify(row.expected)));
  assert.deepEqual(JSON.parse(value.rows.at(-1).source), value.current);
  for (const change of [{ disposable: false }, { url: 'http://192.168.0.29:8123', sshHost: '192.168.0.29' }]) assert.throws(() => plan({ ...config, ...change }));
});

test('backup precedes work and every work exit restores its exact baseline', async () => {
  for (const failed of [false, true]) {
    const events = [], baseline = { exact: 'private' };
    const run = withRecovery(async () => { events.push('backup'); return baseline; }, async value => {
      assert.equal(value, baseline); events.push('work'); if (failed) throw new Error('injected work failure'); return 'complete';
    }, async value => { assert.equal(value, baseline); events.push('cleanup'); });
    if (failed) await assert.rejects(run, /injected work/); else assert.equal(await run, 'complete');
    assert.deepEqual(events, ['backup', 'work', 'cleanup']);
  }
  await assert.rejects(withRecovery(async () => {}, async () => { throw new Error('work failed'); }, async () => { throw new Error('restore failed'); }), /work failed\nUpgrade cleanup failed: restore failed/);
  let touched = false;
  await assert.rejects(withRecovery(async () => { throw new Error('backup failed'); }, async () => { touched = true; }, async () => { touched = true; }), /backup failed/);
  assert.equal(touched, false);
});

test('normal editor extension retains historical selections/options and uses independent page and popup paths', () => {
  const value = plan(config), saved = value.rows[0].expected, before = structuredClone(saved);
  const result = extendedSource(saved, value.current);
  assert.deepEqual(saved, before); assert.deepEqual(result.legacy_page_options, saved.legacy_page_options);
  assert.equal(result.pages.length, saved.pages.length + value.current.pages.length);
  assert.equal(new Set(result.pages.map(page => page.id)).size, result.pages.length);
  assert.equal(new Set(result.pages.map(page => page.path)).size, result.pages.length);
  const oldLight = JSON.stringify(saved.pages).match(/light\.[a-z0-9_]+/)[0];
  assert.ok(JSON.stringify(result.pages.slice(0, saved.pages.length)).includes(oldLight));
  assert.deepEqual(validatePages(result), []);
});

test('registration staging preserves unrelated HA settings and never creates another Marao root', () => {
  const source = '# retained comment\nhttp:\n  use_x_forwarded_for: true\nlovelace:\n  dashboards:\n    unrelated:\n      mode: yaml\n      filename: unrelated.yaml\n    old-marao:\n      mode: yaml\n      filename: dashboard/MaraoDashboard/old/dashboard.yaml\n';
  const result = patchRegistration(source, 'saved');
  assert.ok(result.includes('# retained comment'));
  const document = YAML.parse(result);
  assert.equal(document.http.use_x_forwarded_for, true);
  assert.deepEqual(Object.keys(document.lovelace.dashboards), ['unrelated', 'marao-dashboard']);
  assert.deepEqual(Object.keys(YAML.parse(patchRegistration(source, 'saved', true)).lovelace.dashboards), ['unrelated']);
});

test('concurrent unrelated integration edits block cleanup', () => {
  const before = { data: { entries: [{ entry_id: 'marao', data: { owned: true } }, { entry_id: 'other', data: { keep: true } }] } };
  const after = structuredClone(before); after.data.entries[0].data.owned = false;
  assertUnrelatedEntries(before, after, 'marao');
  after.data.entries[1].data.keep = false; assert.throws(() => assertUnrelatedEntries(before, after, 'marao'));
});

test('visual review requires actual preserved captures for every profile/theme/format and the final candidate', () => {
  const coverage = JSON.parse(fs.readFileSync('ha-test/upgrade/coverage.json'));
  const report = { operation_id: 'operation', candidate: { commit: 'final' }, formats: plan(config).formats };
  report.evidence = report.formats.map(format => ({ format, captures_sha256: 'captured-' + format }));
  const review = { operation_id: report.operation_id, candidate: report.candidate, rows: report.formats.flatMap(format => coverage.profiles.flatMap(profile => coverage.themes.map(theme => ({
    format, profile, theme, passed: true, source: 'preserved-install', inspected: 'cards,realistic-pages,popups,editor', notes: 'Mocked validator input; never release evidence', captures_sha256: 'captured-' + format,
  })))) };
  validateVisualReviews(review, report);
  for (const change of [row => row.rows.pop(), row => { row.rows[0].passed = false; }, row => { row.rows[0].captures_sha256 = 'stale'; }, row => { row.candidate = { commit: 'other' }; }, row => row.rows.push(row.rows[0])]) {
    const invalid = structuredClone(review); change(invalid); assert.throws(() => validateVisualReviews(invalid, report));
  }
});

const nativeEvidence = () => ({ version: 1, target: config.url, functional_completed: true, safe_actions_disabled: true, disconnected_dispatches: 0, authoritative_recovery: true,
  errors: ['Object (/frontend_latest/app.native.js)'], rejections: ['not_found: Subscription not found.'],
  subscriptions: [{ phase: 'connected', connection: 1, type: 'persistent_notification/subscribe', id: 37 }, { phase: 'recovering', connection: 2, type: 'persistent_notification/subscribe', id: 22 },
    { phase: 'connected', connection: 2, type: 'unsubscribe_events', id: 43, subscription: 37 }], native_failures: [{ connection: 2, id: 43, code: 'not_found', message: 'Subscription not found.' }] });

test('approved exception accepts only the exact native stale subscription failure after successful product checks', () => {
  validateKnownFailure(nativeEvidence(), config.url);
  const rawObject = nativeEvidence(); rawObject.errors = ['Object']; validateKnownFailure(rawObject, config.url);
  for (const change of [row => { row.functional_completed = false; }, row => row.errors.push('Other error'), row => { row.errors[0] = 'Object (/marao_dashboard_static/MaraoCards.js)'; },
    row => { row.disconnected_dispatches = 1; }, row => { row.authoritative_recovery = false; }, row => { row.subscriptions[2].subscription = 40; }, row => { row.native_failures[0].id = 99; },
    row => { row.native_failures = []; }, row => { row.native_failures[0].connection = 1; }, row => { row.subscriptions[0].type = 'subscribe_events'; }, row => { row.subscriptions[1].connection = 1; }]) {
    const row = nativeEvidence(); change(row); assert.throws(() => validateKnownFailure(row, config.url));
  }
});

test('native exception expires when the fix reaches either supported stable frontend', async () => {
  const get = delivered => async url => ({ ok: true, async json() {
    if (url.includes('/compare/')) return delivered ? { status: 'behind', behind_by: 1, ahead_by: 0 } : { status: 'ahead', behind_by: 0, ahead_by: 2 };
    if (url.includes('manifest.json')) return { requirements: ['home-assistant-frontend==20260930.3'] };
    return { prerelease: false, tag_name: url.includes('/core/') ? '2026.10.1' : '20260930.3' };
  }, async text() { return 'home-assistant-js-websocket:\n      specifier: 9.7.1\n      version: 9.7.1\n'; } });
  assert.equal((await undeliveredFix(get(false))).checks[0].websocket, '9.7.1');
  await assert.rejects(undeliveredFix(get(true)), /exception has expired/);
});
