import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const { nativeBackup } = createRequire(import.meta.url)('../native-backup.js');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-native-recovery-'));
  const paths = ['configuration.yaml', 'dashboard/MaraoDashboard', '.storage/lovelace_dashboards'];
  fs.mkdirSync(path.join(root, 'dashboard/MaraoDashboard'), { recursive: true });
  fs.writeFileSync(path.join(root, 'configuration.yaml'), '# exact original\nsecret: !secret safe_fixture\n', { mode: 0o640 });
  fs.chmodSync(path.join(root, 'configuration.yaml'), 0o640);
  fs.writeFileSync(path.join(root, 'dashboard/MaraoDashboard/custom card.yaml'), 'protected: true\n');
  const run = (_config, command, { input } = {}) => {
    const result = spawnSync('sh', ['-c', command], { input, encoding: 'utf8' });
    if (result.status) throw Error('Private recovery command failed');
    return result;
  };
  const config = { url: 'http://192.168.10.229:8123', remoteConfigPath: root };
  return { root, paths, config, run, tool: nativeBackup(config, crypto.randomUUID(), paths, { run }), close: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('native proof restores exact bytes, protected paths, absent storage and original file modes', () => {
  const f = fixture();
  const originalMask = process.umask(0o077);
  try {
    const before = f.tool({ mode: 'backup', paths: f.paths });
    fs.writeFileSync(path.join(f.root, 'configuration.yaml'), 'changed: true\n');
    fs.mkdirSync(path.join(f.root, '.storage')); fs.writeFileSync(path.join(f.root, '.storage/lovelace_dashboards'), '{}');
    f.tool({ mode: 'restore', expected: f.tool({ mode: 'snapshot', paths: f.paths }).files, new_paths: [] });
    assert.deepEqual(f.tool({ mode: 'snapshot', paths: f.paths }).files, before);
    assert.equal(fs.statSync(path.join(f.root, 'configuration.yaml')).mode & 0o777, 0o640);
    assert.equal(fs.readFileSync(path.join(f.root, 'dashboard/MaraoDashboard/custom card.yaml'), 'utf8'), 'protected: true\n');
    assert.equal(fs.existsSync(path.join(f.root, '.storage/lovelace_dashboards')), false);
    assert.equal(f.tool({ mode: 'finish' }).verified_cleanup, true);
  } finally { process.umask(originalMask); f.close(); }
});

test('native recovery refuses concurrent changes and keeps its exact recovery archive', () => {
  const f = fixture();
  try {
    f.tool({ mode: 'backup', paths: f.paths });
    const expected = f.tool({ mode: 'snapshot', paths: f.paths }).files;
    fs.writeFileSync(path.join(f.root, 'configuration.yaml'), 'unrelated: edit\n');
    assert.throws(() => f.tool({ mode: 'restore', expected, new_paths: [] }), /Concurrent disposable/);
    assert.equal(fs.readFileSync(path.join(f.root, 'configuration.yaml'), 'utf8'), 'unrelated: edit\n');
    assert.ok(fs.existsSync(path.join(f.root, '.marao-native-active')));
    const operation = fs.readFileSync(path.join(f.root, '.marao-native-active'), 'utf8');
    assert.ok(fs.existsSync(path.join(f.root, '.marao-native-backups', operation, 'baseline.tar')));
  } finally { f.close(); }
});
