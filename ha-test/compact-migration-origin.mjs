// Plan by default. --apply saves only the losslessly compacted migration origin.
import fs from 'node:fs';
import path from 'node:path';
import {deflateRawSync} from 'node:zlib';
import client from './client.js';
import preparation from './prepare.js';
import {compactMigrationProvenance, expandMigrationProvenance} from '../frontend_src/ordinary-provenance.js';

const urlPath = 'marao-dashboard';
const readDashboard = connection => connection.call({type:'lovelace/config', url_path:urlPath, force:true});
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function sizes(document) {
  const bytes = Buffer.from(JSON.stringify(document));
  return {jsonBytes:bytes.length, estimatedDeflateBytes:deflateRawSync(bytes, {level:1}).length};
}

function readStorage(config, key) {
  const filename = path.posix.join(config.remoteConfigPath, '.storage', key);
  const raw = preparation.ssh(config, 'cat ' + quote(filename)).stdout;
  let stored;
  try { stored = JSON.parse(raw); }
  catch { throw new Error('Could not decode the native dashboard storage file.'); }
  requireCondition(stored?.key === key && stored.data?.config, 'Unexpected dashboard storage format.');
  return {raw, document:stored.data.config};
}

async function run() {
  const args = process.argv.slice(2);
  requireCondition(args.length === 0 || (args.length === 1 && args[0] === '--apply'),
    'Usage: node ha-test/compact-migration-origin.mjs [--apply]');
  const configFile = process.env.MARAO_TEST_CONFIG || client.configPath;
  const config = client.readConfig(configFile);
  requireCondition(new URL(config.url).hostname === '192.168.0.28', 'Requires the disposable test Home Assistant.');
  let connection = await client.connect(config);
  try {
    const before = await readDashboard(connection);
    requireCondition(!Object.hasOwn(before, 'strategy') && before.marao?.version === 1 && Array.isArray(before.views),
      'Requires an ordinary Marao dashboard with supported settings.');
    const origin = before.marao.migration;
    const packed = compactMigrationProvenance(origin);
    const changed = packed !== origin;
    const next = changed ? {...before, marao:{...before.marao, migration:packed}} : before;
    if (changed) requireCondition(same(expandMigrationProvenance(packed), origin), 'Migration provenance did not round-trip exactly.');
    console.log(JSON.stringify({changed, views:before.views.length, before:sizes(before), proposed:sizes(next)}));
    if (!args.length || !changed) return;

    const dashboards = await connection.call({type:'lovelace/dashboards/list'});
    const dashboard = dashboards.find(item => item.url_path === urlPath);
    requireCondition(dashboard?.mode === 'storage' && /^[a-z0-9_-]+$/i.test(dashboard.id || ''), 'Requires a native storage dashboard.');
    const key = 'lovelace.' + dashboard.id;
    const disk = readStorage(config, key);
    requireCondition(same(before, disk.document), 'Home Assistant memory and storage differ. No change was saved.');

    const parent = path.join(path.dirname(path.resolve(configFile)), '.cache');
    fs.mkdirSync(parent, {mode:0o700, recursive:true});
    const backup = fs.mkdtempSync(path.join(parent, 'compact-origin-'));
    const privateFile = {mode:0o600, flag:'wx', flush:true};
    fs.writeFileSync(path.join(backup, 'storage-before.json'), disk.raw, privateFile);
    fs.writeFileSync(path.join(backup, 'dashboard-proposed.json'), JSON.stringify(next), privateFile);
    console.log('Private recovery files retained in ' + backup);
    requireCondition(readStorage(config, key).raw === disk.raw && same(await readDashboard(connection), before),
      'The dashboard changed during preflight. No change was saved.');

    // A failed or disconnected native save can still have updated HA memory.
    // Classify both the fresh API result and persisted file before reporting.
    let saveFailed = false;
    try { await connection.call({type:'lovelace/config/save', url_path:urlPath, config:next}); }
    catch { saveFailed = true; }
    connection.close();
    connection = await client.connect(config);
    const current = await readDashboard(connection);
    const persisted = readStorage(config, key).document;
    if (same(current, next) && same(persisted, next)) {
      console.log(saveFailed ? 'Confirmed the complete saved dashboard after a save acknowledgement failed.' : 'Verified the complete saved dashboard in memory and on disk.');
      return;
    }
    requireCondition(!(same(current, before) && same(persisted, before)),
      'Home Assistant retained the original dashboard. Recovery files are available.');
    throw new Error('Dashboard readback diverged. Both recovery files are retained. No further save was attempted.');
  } finally {
    connection.close();
  }
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
