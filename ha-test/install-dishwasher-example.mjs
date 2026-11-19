// Install the isolated fixture only in the existing disposable dishwasher gallery.
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {stable} from '../frontend_src/schedule-api.js';
import client from './client.js';
import frontend from './prepare-frontend.js';
import native from './prepare-native-frontend.js';
import prepare from './prepare.js';

const dashboardPath = 'marao-dashboard';
const viewPath = 'card-test-md-dishwasher-card';
const id = 'marao_test_dishwasher_controls';
const filenamePrefix = 'marao-test-dishwasher-controls-';
const hash = value => createHash('sha256').update(value).digest('hex');
const quote = value => "'" + String(value).replaceAll("'", "'\\''") + "'";

function installCard(dashboard, url) {
  const next = structuredClone(dashboard);
  const views = next.views.filter(view => view.path === viewPath);
  assert.equal(views.length, 1, 'Require the existing dishwasher family view');
  const view = views[0];
  const groups = view.type === 'sections' || view.sections ? view.sections.map(section => section.cards) : [view.cards];
  assert.ok(groups.length && groups.every(Array.isArray), 'Unexpected gallery layout');
  const existing = groups.flat().filter(card => card.marao_example_id === id);
  assert.ok(existing.length <= 1, 'Duplicate dishwasher fixture markers');
  if (existing.length) {
    const card = existing[0];
    assert.ok(card.type === 'iframe' && /^\/local\/marao-test-dishwasher-controls-[a-f\d]{64}\.html$/.test(card.url), 'Refusing to replace an unrecognized card');
    card.url = url;
  } else {
    groups[0].unshift({type:'iframe', title:'Dishwasher · interactive test', url, aspect_ratio:'165%', grid_options:{columns:12, rows:11}, marao_example_id:id});
  }
  return next;
}

async function run(configFile) {
  const config = client.readConfig(configFile);
  frontend.assertTarget(config);
  const registered = await native.nativeState(config);
  assert.equal(registered?.authoring, 'ordinary', 'Require the installed native Marao dashboard');
  assert.equal((await client.api(config, 'GET', '/api/config')).config_dir, config.remoteConfigPath);
  const readAsset = name => client.api(config, 'GET', `/hacsfiles/${registered.folder}/${name}`, undefined, {text:true});
  const readRelease = async () => JSON.parse(await readAsset('MaraoFrontend.release.json'));
  const fixtureRuntime = `/local/community/${registered.folder}/MaraoFrontend.js`;
  const release = await readRelease();
  assert.match(release.identity, /^[a-f\d]{64}$/);
  for (const file of ['MaraoFrontend.js', `${release.identity}--MaraoCards.js`]) {
    assert.equal(hash(await readAsset(file)), release.files[file], 'Installed Marao asset differs from its manifest: '+file);
  }
  assert.equal(hash(await client.api(config, 'GET', fixtureRuntime, undefined, {text:true})), release.files['MaraoFrontend.js'], 'The fixture cannot load the registered runtime');
  const {buildDishwasherFixture} = await import('./dishwasher-fixture.mjs');
  const html = await buildDishwasherFixture({folder:registered.folder, identity:release.identity});
  const digest = hash(html), name = filenamePrefix + digest + '.html', url = '/local/' + name;
  const before = registered.dashboard, next = installCard(before, url);
  const base = config.remoteConfigPath, www = base + '/www', destination = www + '/' + name;
  const stage = base + '/.marao-dishwasher-' + randomUUID();
  const guard = `set -e\nbase=${quote(base)}\ncanonical=$(realpath "$base")\n[ "$canonical" = "$base" ] || { [ "$base" = /config ] && [ "$canonical" = /homeassistant ]; }\n[ -d ${quote(www)} ] && [ ! -L ${quote(www)} ] || exit 1\n[ ! -L ${quote(destination)} ] || exit 1\n`;
  const getHash = () => prepare.ssh(config, guard + `if [ -e ${quote(destination)} ]; then test -f ${quote(destination)} && sha256sum ${quote(destination)}; fi`).stdout.trim().split(' ')[0];
  const previous = getHash();
  assert.ok(!previous || previous === digest, 'An unrelated file occupies the fixture destination');
  const cache = path.join(client.repoRoot, 'ha-test/.cache');
  await fs.mkdir(cache, {recursive:true, mode:0o700});
  const connection = await client.connect(config);
  const read = () => connection.call({type:'lovelace/config', url_path:dashboardPath, force:true});
  const assertDashboard = (actual, expected, message) => assert.ok(stable(actual) === stable(expected), message);
  try {
    if (!previous) {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dishwasher-example-'));
      try {
        await fs.writeFile(path.join(tmp, name), html, {mode:0o600});
        prepare.ssh(config, guard + `umask 077\nmkdir ${quote(stage)}`);
        try {
          frontend.upload(config, path.join(tmp, name), stage + '/fixture.html');
          const staged = quote(stage+'/fixture.html');
          prepare.ssh(config, guard + `test "$(sha256sum ${staged} | cut -d ' ' -f 1)" = ${quote(digest)}\nchmod 644 ${staged}\nln -T ${staged} ${quote(destination)}`);
        } finally {
          prepare.ssh(config, `rm -f ${quote(stage+'/fixture.html')} && rmdir ${quote(stage)}`);
        }
      } finally { await fs.rm(tmp, {recursive:true, force:true}); }
    }
    assert.equal(getHash(), digest);
    assert.equal(hash(await client.api(config, 'GET', url, undefined, {text:true})), digest, 'HA is not serving the exact example');
    assert.equal((await readRelease()).identity, release.identity, 'Installed package changed during staging');
    if (stable(before) !== stable(next)) {
      const backup = await fs.mkdtemp(path.join(cache,'dishwasher-example-'));
      await fs.writeFile(path.join(backup,'dashboard-before.json'), JSON.stringify(before), {mode:0o600});
      console.log('Dashboard recovery copy: ' + path.join(backup,'dashboard-before.json'));
      assertDashboard(await read(), before, 'Dashboard changed while staging; retry from the current version');
      await connection.call({type:'lovelace/config/save', url_path:dashboardPath, config:next});
    }
    assertDashboard(await read(), next, 'Dashboard changed during installation; inspect before retrying');
    console.log(config.url + '/' + dashboardPath + '/' + viewPath);
  } finally { connection.close(); }
}

const {values} = parseArgs({options:{config:{type:'string'}, 'self-check':{type:'boolean'}}});
if (values['self-check']) {
  const source = {views:[{path:'other',cards:[]},{path:viewPath,type:'sections',sections:[{cards:[{type:'markdown',content:'Retain this'}]}]}]};
  const first = '/local/' + filenamePrefix + 'a'.repeat(64) + '.html';
  const second = first.replace('a'.repeat(64),'b'.repeat(64));
  const added = installCard(source, first);
  assert.deepEqual(installCard(added, first), added);
  assert.deepEqual(installCard(added, second).views[1].sections[0].cards.map(x=>x.url || x.content), [second, 'Retain this']);
  assert.deepEqual(source.views[1].sections[0].cards,[{type:'markdown',content:'Retain this'}]);
  assert.throws(() => installCard({...source, views:[]}, first));
  const collision = {views:[{path:viewPath,cards:[{type:'button',marao_example_id:id}]}]};
  assert.throws(() => installCard(collision, first), /unrecognized/);
  console.log('Dishwasher fixture targeting, repeat install, upgrade and collision checks passed.');
} else await run(values.config);
