import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { validatePages } from '../../frontend_src/editor-model.js';

const require = createRequire(import.meta.url);
const { addResourceSentinel, unrelatedConfiguration, assertUnrelatedEntries, extendedSource, patchRegistration, plan, validateVisualReviews, withRecovery } = require('../test-ha-upgrade');
const { readKnownFailure, undeliveredFix, validateKnownFailure } = require('../native-reconnect-exception');
const { assertHistoricalBindings, historicalEntityAliases, historicalEntities, isolateHistoricalText } = require('../../ha-test/upgrade/prepared');
const { referencedEntities } = require('../../ha-test/prepare');
const YAML = require('yaml');
const config = { url: 'http://192.168.0.28:8123', disposable: true, sshHost: '192.168.0.28' };

test('restart readiness waits for active Supervisor Core jobs, closes connections and supports unsupervised Core', async () => {
  const { activeCoreJob } = require('../../ha-test/prepare');
  assert.equal(activeCoreJob([{ name: 'home_assistant_core_restart', done: false }]), true);
  assert.equal(activeCoreJob([{ name: 'backup', done: false, child_jobs: [{ name: 'home_assistant_core_start', done: false }] }]), true);
  assert.equal(activeCoreJob([{ name: 'home_assistant_core_restart', done: true }, { name: 'unrelated', done: false }]), false);
  assert.throws(() => activeCoreJob(undefined), /job metadata/);
  for (const mode of ['supervised', 'standalone', 'timeout', 'failure']) {
    let polls = 0, closed = 0, connections = 0, ticks = 0;
    const client = { api: async () => ({ components: mode === 'standalone' ? [] : ['hassio'] }), connect: async () => {
      connections++;
      return { close: () => closed++, call: async message => {
        assert.deepEqual(message, { type: 'supervisor/api', endpoint: '/jobs/info', method: 'get' });
        if (mode === 'failure') throw new Error('Supervisor unavailable');
        return { jobs: [{ name: 'home_assistant_core_restart', done: ++polls === 3 }] };
      } };
    } };
    const module = { exports: {} }, file = path.resolve('ha-test/prepare.js');
    vm.runInThisContext('(function(require,module,__dirname,Date,setTimeout){' + fs.readFileSync(file, 'utf8') + '\n})', { filename: file })(
      name => name === './client' ? { ...require('../../ha-test/client'), ...client } : require(name), module, path.dirname(file),
      { now: () => mode === 'timeout' ? ++ticks * 180001 : 0 }, callback => callback());
    const pending = module.exports.waitForSupervisorIdle(config);
    if (mode === 'timeout') await assert.rejects(pending, /did not finish/);
    else if (mode === 'failure') await assert.rejects(pending, /Supervisor unavailable/);
    else assert.equal(await pending, mode !== 'standalone');
    assert.equal(connections, mode === 'standalone' ? 0 : 1);
    assert.equal(closed, connections);
    if (mode === 'supervised') assert.equal(polls, 3);
  }
});

test('upgrade cleanup restores recorded helper values and preflights all states before sending actions', async () => {
  const { helperStateActions, restoreHelperStates } = require('../../ha-test/prepare');
  assert.deepEqual(helperStateActions({
    'input_boolean.marao_dashboard_test_on': 'on', 'input_boolean.marao_dashboard_test_off': 'off',
    'input_number.marao_dashboard_test_number': '20.5', 'input_select.marao_dashboard_test_scene': 'Movie',
    'input_text.marao_dashboard_test_text': '',
  }), [
    ['input_boolean', 'turn_on', { entity_id: 'input_boolean.marao_dashboard_test_on' }],
    ['input_boolean', 'turn_off', { entity_id: 'input_boolean.marao_dashboard_test_off' }],
    ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_number', value: 20.5 }],
    ['input_select', 'select_option', { entity_id: 'input_select.marao_dashboard_test_scene', option: 'Movie' }],
    ['input_text', 'set_value', { entity_id: 'input_text.marao_dashboard_test_text', value: '' }],
  ]);
  for (const [entity, value] of [['input_select.actual_device', 'Movie'], ['lock.marao_dashboard_test_lock', 'locked'],
    ['input_boolean.marao_dashboard_test_on', 'unknown'], ['input_number.marao_dashboard_test_number', ''],
    ['input_number.marao_dashboard_test_number', 'NaN'], ['input_text.marao_dashboard_test_text', null]]) {
    await assert.rejects(restoreHelperStates({}, { 'input_select.marao_dashboard_test_scene': 'Movie', [entity]: value }), /fixture helper/);
  }
});

test('release plan covers every frozen baseline and all four formats without remote operations', () => {
  const value = plan(config);
  assert.equal(value.rows.length, 7); assert.equal(value.rows[0].baseline, 'v0.5.1');
  assert.deepEqual(new Set(value.rows.map(row => row.format)), new Set(value.formats));
  assert.deepEqual(value.current, JSON.parse(JSON.stringify(value.current)), 'The expected installed fixture must contain only persisted JSON values');
  for (const row of value.rows) assert.deepEqual(row.expected, JSON.parse(JSON.stringify(row.expected)));
  assert.deepEqual(JSON.parse(value.rows.at(-1).source), value.current);
  for (const change of [{ disposable: false }, { url: 'http://192.168.0.29:8123', sshHost: '192.168.0.29' }]) assert.throws(() => plan({ ...config, ...change }));
});

test('historical replay isolates entity references without changing frozen sources or action services', () => {
  const source = '{\r\n  "entities": ["lock.front_door", "lock.front_door_extra", "light.marao_dashboard_test_light"],\r\n  "action": "lock.lock", "unknown": "keep", "raw": {"entity": "lock.front_door"}\r\n}\r\n';
  const aliases = historicalEntityAliases(JSON.parse(source), referencedEntities);
  assert.deepEqual(aliases, { 'lock.front_door': 'lock.marao_dashboard_upgrade_front_door', 'lock.front_door_extra': 'lock.marao_dashboard_upgrade_front_door_extra' });
  const replay = isolateHistoricalText(source, aliases);
  assert.equal(replay, source.replaceAll('lock.front_door', 'lock.marao_dashboard_upgrade_front_door'));
  assert.equal(isolateHistoricalText(replay, aliases), replay);
  assert.equal(isolateHistoricalText('lock.front_door_extra', { 'lock.front_door': aliases['lock.front_door'] }), 'lock.front_door_extra');
  assert.deepEqual(historicalEntityAliases(JSON.parse(replay), referencedEntities), {});
  assertHistoricalBindings(JSON.parse(replay), new Set(['lock.front_door', 'light.marao_dashboard_test_light']), referencedEntities);
  for (const entity of ['lock.marao_dashboard_upgrade_front_door', 'lock.front_door']) {
    assert.throws(() => assertHistoricalBindings([entity], new Set([entity]), referencedEntities), /overlap/);
  }
  const value = plan(config);
  for (const row of value.rows) {
    assert.match(row.frozen_source_sha256, /^[a-f0-9]{64}$/);
    assert.match(row.frozen_expected_sha256, /^[a-f0-9]{64}$/);
    const extended = extendedSource(row.expected, value.current);
    const entities = referencedEntities(extended);
    assert.ok([...entities].every(entity => /^[a-z_]+\.marao_dashboard_(?:test|upgrade)_/.test(entity)), row.baseline);
    if (row.baseline !== 'current-format-2') for (const entity of historicalEntities(row.baseline, referencedEntities)) assert.ok(entities.has(entity));
    const names = values => {
      const result = [];
      const visit = value => {
        if (!value || typeof value !== 'object') return;
        for (const [key, child] of Object.entries(value)) {
          if (key === 'name') result.push(child);
          else visit(child);
        }
      };
      visit(values); return result;
    };
    assert.deepEqual(names(extended.pages.slice(0, row.expected.pages.length)), names(row.expected.pages), 'Isolation changed configured or automatically generated names');
  }
  assert.equal(value.rows[0].source, fs.readFileSync('ha-test/upgrade/fixtures/v0.5.1-dashboard.json', 'utf8'));
  assert.deepEqual(value.rows[0].entity_aliases, {});
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

test('release registration retains Home Assistant include tags without parser warnings', () => {
  const { haYamlOptions } = require('../../ha-test/prepare');
  const source = 'frontend:\n  themes: !include_dir_merge_named themes\nhomeassistant:\n  packages: !include_dir_named packages\nautomation: !include automations.yaml\nhttp:\n  api_password: !secret api_password\n';
  const output = patchRegistration(source, 'saved');
  const doc = YAML.parseDocument(output, haYamlOptions);
  assert.deepEqual(doc.errors, []); assert.deepEqual(doc.warnings, []);
  for (const [keys, tag] of [[['frontend','themes'],'!include_dir_merge_named'], [['homeassistant','packages'],'!include_dir_named'], [['automation'],'!include'], [['http','api_password'],'!secret']]) {
    assert.equal(doc.getIn(keys,true).tag,tag);
  }
});

test('YAML resource sentinel appends without losing unrelated nodes and rejects ambiguous sources', () => {
  const { haYamlOptions } = require('../../ha-test/prepare');
  const doc=YAML.parseDocument('lovelace:\n  resource_mode: yaml\n  resources:\n    # retain resource comment\n    - url: /local/unrelated.js\n      type: module\n      retained: value\n',haYamlOptions);
  const before=doc.getIn(['lovelace','resources']).items[0].toString();
  const sentinel=addResourceSentinel(doc);
  assert.equal(doc.getIn(['lovelace','resources']).items[0].toString(),before);
  assert.ok(doc.toString().includes('# retain resource comment'));
  assert.deepEqual(doc.toJSON().lovelace.resources.at(-1),sentinel);
  assert.equal(doc.toJSON().lovelace.resource_mode,'yaml');
  const empty=YAML.parseDocument('lovelace: {}');addResourceSentinel(empty);assert.equal(empty.toJSON().lovelace.resources.length,1);
  const external=YAML.parseDocument('lovelace:\n  resources: !include resources.yaml\n',haYamlOptions),original=external.toString();
  assert.throws(()=>addResourceSentinel(external),/explicit resource list/);assert.equal(external.toString(),original);
});

test('cleanup excludes only owned registrations and the resource sentinel without losing explicit emptiness', () => {
  for (const resources of ['', '  resources: []\n', '  resources:\n    - url: /local/unrelated.js\n      type: module\n']) {
    const baseline='http:\n  use_x_forwarded_for: true\nlovelace:\n  resource_mode: yaml\n'+resources;
    const doc=YAML.parseDocument(baseline);addResourceSentinel(doc);
    assert.deepEqual(unrelatedConfiguration(doc.toString(),baseline),unrelatedConfiguration(baseline,baseline));
    doc.setIn(['http','use_x_forwarded_for'],false);
    assert.notDeepEqual(unrelatedConfiguration(doc.toString(),baseline),unrelatedConfiguration(baseline,baseline));
    doc.setIn(['http','use_x_forwarded_for'],true);
    doc.getIn(['lovelace','resources']).add({url:'/local/concurrent.js',type:'module'});
    assert.notDeepEqual(unrelatedConfiguration(doc.toString(),baseline),unrelatedConfiguration(baseline,baseline));
  }
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

test('an earlier product failure remains a blocker with its original diagnostic even without native evidence', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-native-failure-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'native.json');
  fs.writeFileSync(file + '.exit.json', JSON.stringify({ stage: null, message: 'Climate feedback failed' }));
  assert.throws(() => readKnownFailure(file, config.url), /outside the approved native reconnect scenario: Climate feedback failed/);
  const evidence = nativeEvidence();
  fs.writeFileSync(file, JSON.stringify(evidence));
  fs.writeFileSync(file + '.exit.json', JSON.stringify({ stage: 'disconnect-browser-errors',
    message: `Disconnect scenario produced unexpected browser errors:\n${[...evidence.errors, ...evidence.rejections].join('\n')}\nSubscription lifecycle: ${JSON.stringify(evidence.subscriptions)}` }));
  readKnownFailure(file, config.url);
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
