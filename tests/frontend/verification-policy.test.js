import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { checksFor, selectComponents } = require('../verification-map');
const { captureSelected, factorChecks } = require('../verification-policy');

const profiles = ['iphone-normal', 'android-normal', 'narrow-320', 'iphone-landscape', 'android-landscape', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'];
test('nine reviewed geometry profiles retain nine light cases and representative dark appearance', () => {
  const selected = checksFor(selectComponents([], ['slider-headers']));
  const cases = selected.flatMap(check => check.cases || []).filter(row => row.assertion === 'slider-headers');
  assert.deepEqual(cases.filter(row => row.dimensions.includes('geometry')).map(row => row.profile), profiles);
  assert.deepEqual(cases.filter(row => row.theme === 'dark').map(row => [row.profile, row.dimensions]), [['iphone-normal', ['appearance']]]);
  for (const theme of ['light', 'dark']) assert.ok(cases.some(row => row.theme === theme && row.dimensions.includes('appearance')));
  assert.deepEqual(cases.find(row => row.theme === 'light' && row.profile === 'iphone-normal').routes,
    ['/marao-dashboard/card-test-all', '/marao-dashboard/living-room', '/marao-dashboard/native-example']);
  for (const device of ['iphone', 'android']) assert.ok(selected.some(check => check.id === 'sliders:' + device));
  for (const check of selected.filter(check => check.id.startsWith('sliders:'))) {
    assert.equal(check.cases[0].theme, 'both'); assert.equal(check.cases[0].themeIndependent, false);
  }
});
test('compatible gallery assertions share visits without retired builder browser coverage', () => {
  const checks = checksFor(selectComponents([], ['slider-headers', 'access-label', 'battery-groups', 'editor-rendering']));
  const gallery = checks.find(check => check.id === 'gallery:iphone-normal:light');
  for (const flag of ['--slider-headers', '--access', '--battery']) assert.ok(gallery.command.includes(flag));
  assert.equal(gallery.cases.length, 3);
  assert.ok(!checks.some(check=>check.kind==='browser' && /editor-json|editor-rendering/.test(check.id)));
  assert.ok(checks.some(check=>check.id==='unit:editor-model'));
  assert.ok(checks.find(check => check.id === 'gallery:narrow-320:light').command.includes('--geometry-only'));
});
test('unreviewed theme-sensitive checks and explicit full mode retain their coverage', () => {
  const sensitive = { id: 'native-theme', kind: 'browser', command: ['node', 'tests/native.js'], inputs: [], themeSensitive: true };
  assert.deepEqual(factorChecks([sensitive]), [sensitive]);
  const reviewed = { ...sensitive, id: 'slider-headers:iphone-normal' };
  assert.deepEqual(factorChecks([reviewed], { full: true }), [reviewed]);
  assert.throws(() => selectComponents(['unknown/future.js']), /Unmapped/);
});
test('capture policy always retains failures and limits representative successes', () => {
  for (const profile of profiles) assert.equal(captureSelected('failure', profile, { failure: true }), true);
  assert.equal(captureSelected('failure', 'iphone-normal'), false);
  assert.equal(captureSelected('review', 'iphone-normal'), true);
  assert.equal(captureSelected('review', 'iphone-bold'), false);
  assert.equal(captureSelected('review', 'iphone-normal', { representative: false }), false);
  assert.equal(captureSelected('all', 'iphone-bold'), true);
  assert.throws(() => captureSelected('silent', 'iphone-normal'));
});

test('capture execution keeps failures and pixel assertions while omitting ordinary success files', async () => {
  const { capture } = require('../verification-browser');
  let calls = 0;
  const subject = { screenshot: async () => { calls++; return Buffer.from('pixels'); } };
  assert.equal(await capture(subject, { path: 'ordinary-success.png' }), undefined);
  assert.equal(calls, 0);
  assert.deepEqual(await capture(subject, { path: 'editor-failure.png' }), Buffer.from('pixels'));
  assert.deepEqual(await capture(subject, { scale: 'device' }), Buffer.from('pixels'));
  assert.equal(calls, 2);
});
