import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { selectSamples } = require('../verification-browser');
const { parseArgs, fullscreenLifecyclePlan } = require('../test-ha-dashboard-accessibility');
const { changedHelpers, prepareBatch, readBatchSnapshot } = require('../../ha-test/prepared-batch');
const { candidateIdentity, validatePreparedReceipt } = require('../../ha-test/upgrade/prepared');

test('focused samples include distinct availability/options and exclude equivalent permutations', () => {
  const card = (name, state = 'on', variables = { enable_slider: true }) => ({ config: { template: 'md_light_card', name, variables }, state });
  const cards = [card('One'), card('Two'), card('Unavailable', 'unavailable'), card('No slider', 'on', { enable_slider: false }),
    { config: { template: 'md_camera_card' }, state: 'on' }];
  assert.equal(selectSamples(cards, ['md_light_card']).length, 3);
});

test('browser scope and parallel controls are explicit', () => {
  assert.equal(parseArgs([]).parallel, false);
  assert.equal(parseArgs([]).focused, false);
  const options = parseArgs(['--focused', '--families', 'md_light_card,md_fan_card', '--popups', '--parallel']);
  assert.deepEqual(options.families, ['md_light_card', 'md_fan_card']);
  assert.equal(options.popups, true); assert.equal(options.parallel, true);
  assert.equal(parseArgs(['--popup-hash', '#fixture']).popupHash, '#fixture');
});

test('current native shell checks use ordinary editing without requiring the retired builder', () => {
  assert.deepEqual(fullscreenLifecyclePlan({nativeFrontend:true,ordinary:true}),{routes:['/config/dashboard'],nativeEdit:true});
  assert.deepEqual(fullscreenLifecyclePlan({nativeFrontend:true,ordinary:false}),{routes:['/config/dashboard'],nativeEdit:false});
  assert.deepEqual(fullscreenLifecyclePlan(),{routes:['/config/dashboard','/marao-dashboard-editor'],nativeEdit:false});
});

test('batch preparation happens once and its ordinary receipt cannot stand in for upgrade proof', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-batch-fixture-'));
  const config = { url: 'http://192.168.0.28:8123', disposable: true, sshHost: '192.168.0.28', remoteConfigPath: '/config' };
  const expected = require('../test-ha-upgrade').plan(config).current;
  let preparations = 0, inspections = 0;
  try {
    const filename = await prepareBatch(directory, {
      readConfig: () => config,
      connect: async () => ({ close() {}, async call({ type }) {
        if (type === 'config_entries/get') return [{ domain: 'marao_dashboard', entry_id: 'fixture' }];
        if (type === 'marao_dashboard/config/get') return { config: JSON.stringify(expected) };
        if (type === 'get_states') return [{ entity_id: 'input_boolean.marao_dashboard_test_light', state: 'off' }];
        assert.fail(type);
      } }),
      prepare: { prepare: async () => { preparations++; }, patchPackages: () => ({ helperPath: 'packages/marao_dashboard_card_test_helpers.yaml' }),
        ssh: () => ({ stdout: 'homeassistant: {}' }) },
      readBatchSnapshot: () => ({ operation_id: null,
          source_sha256: 'a'.repeat(64), output: { 'dashboard.yaml': 'b'.repeat(64), '.marao-generated.json': 'c'.repeat(64) },
          fixtures: { 'packages/marao_dashboard_card_test_helpers.yaml': 'd'.repeat(64) } }),
      verifyBatch: async file => { inspections++; assert.equal(fs.statSync(file).mode & 0o077, 0); },
    });
    const receipt = JSON.parse(fs.readFileSync(filename));
    assert.equal(preparations, 1); assert.equal(inspections, 1);
    assert.equal(validatePreparedReceipt(receipt, config, candidateIdentity(), Date.now(), { batch: true }), receipt);
    assert.throws(() => validatePreparedReceipt(receipt, config, candidateIdentity()), /unsupported/);
    assert.throws(() => validatePreparedReceipt({ ...receipt, helper_states: { 'lock.real': 'unlocked' } }, config, candidateIdentity(), Date.now(), { batch: true }), /Unsafe/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('ordinary file verification needs no SSH Python and rejects symlinks and active recovery', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-shell-snapshot-'));
  try {
    const values = {
      'dashboard/MaraoDashboard/dashboard.json': '{"name":"preserved bytes"}\r\n',
      'dashboard/MaraoDashboard/dashboard/dashboard.yaml': 'title: Safe\n',
      'dashboard/MaraoDashboard/dashboard/.marao-generated.json': '{}\n',
      'custom_components/marao_dashboard/__init__.py': '# safe\n',
      'custom_components/marao_test_camera/marao-fixture.json': '{"owner":"marao-dashboard-tests"}\n',
      'packages/marao_dashboard_card_test_helpers.yaml': 'safe: true\n',
    };
    for (const [relative, bytes] of Object.entries(values)) {
      const file = path.join(directory, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
    }
    const config = { remoteConfigPath: directory };
    const request = { slug: 'dashboard', domains: ['marao_test_camera'], files: ['packages/marao_dashboard_card_test_helpers.yaml'] };
    const ssh = (_config, command) => { assert.doesNotMatch(command, /python|docker/); return { stdout: execFileSync('/bin/sh', ['-c', command], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; };
    const result = readBatchSnapshot(config, request, ssh);
    assert.equal(result.source_sha256, crypto.createHash('sha256').update(values['dashboard/MaraoDashboard/dashboard.json']).digest('hex'));
    assert.equal(result.owners.marao_test_camera, 'marao-dashboard-tests');
    assert.equal(Object.keys(result.output).length, 2);
    const link = path.join(directory, 'custom_components/marao_dashboard/link'); fs.symlinkSync('/etc/hosts', link);
    assert.throws(() => readBatchSnapshot(config, request, ssh)); fs.unlinkSync(link);
    fs.writeFileSync(path.join(directory, '.marao-upgrade-active.json'), '{}');
    assert.throws(() => readBatchSnapshot(config, request, ssh));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('cleanup restores changed values and preserves untouched unavailable placeholders', () => {
  const baseline = { 'input_number.marao_dashboard_test_unknown': 'unavailable', 'input_boolean.marao_dashboard_test_switch': 'off' };
  assert.deepEqual(changedHelpers(baseline, baseline), {});
  assert.deepEqual(changedHelpers(baseline, { ...baseline, 'input_boolean.marao_dashboard_test_switch': 'on' }), { 'input_boolean.marao_dashboard_test_switch': 'off' });
  assert.throws(() => changedHelpers(baseline, {}), /helper disappeared/);
});
