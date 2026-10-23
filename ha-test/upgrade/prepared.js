const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');
const { api, assertDisposableHaTarget, connect, fingerprint, frontendAssetURL, repoRoot, sourceFiles } = require('../client');

const integration = path.join(repoRoot, 'custom_components/marao_dashboard');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fileHashes = root => Object.fromEntries(sourceFiles(root).map(file => [file, sha256(fs.readFileSync(path.join(root, file)))]));

function historicalEntityAliases(values, referencedEntities) {
  return Object.fromEntries([...referencedEntities(values)].filter(entity => !/^[a-z_]+\.marao_dashboard_(?:test|upgrade)_/.test(entity))
    .sort().map(entity => [entity, entity.replace('.', '.marao_dashboard_upgrade_')]));
}

function isolateHistoricalText(source, aliases) {
  const entities = Object.keys(aliases);
  if (!entities.length) return source;
  return source.replace(new RegExp('\\b(?:' + entities.map(entity => entity.replace('.', '\\.')).join('|') + ')\\b', 'g'), entity => aliases[entity]);
}

function assertHistoricalBindings(expected, states, referencedEntities) {
  assert.ok([...referencedEntities(expected)].every(entity => !states.has(entity) || /^[a-z_]+\.marao_dashboard_test_/.test(entity)),
    'Historical bindings overlap non-fixture entities');
}

function candidateIdentity() {
  const files = fileHashes(integration);
  return {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
    package_sha256: sha256(JSON.stringify(files)),
    frontend_fingerprint: fingerprint(path.join(integration, 'frontend')),
    editor_source_fingerprint: fingerprint(path.join(repoRoot, 'frontend_src')),
    fixture_fingerprint: fingerprint(path.join(repoRoot, 'ha-test'), file =>
      file.startsWith('custom_components/') || file.startsWith('dashboard/') ||
      ['cases.js', 'cases.json', 'marao_dashboard_card_test_helpers.yaml', 'marao_dashboard_test_dashboard.json'].includes(file)),
    inventory_sha256: sha256(fs.readFileSync(path.join(__dirname, 'fixtures/inventory.json'))),
    tests_fingerprint: fingerprint(path.join(repoRoot, 'tests')),
    harness_fingerprint: fingerprint(path.join(repoRoot, 'ha-test'), file => ['client.js', 'prepare.js', 'cases.js'].includes(file) || file.startsWith('upgrade/')),
  };
}

function relativeFile(file) {
  return typeof file === 'string' && file.length > 0 && !file.includes('\\') &&
    !file.startsWith('/') && file.split('/').every(part => part && part !== '.' && part !== '..');
}

function validatePreparedReceipt(receipt, config, candidate, now = Date.now(), { batch = false } = {}) {
  assertDisposableHaTarget(config, { requireSsh: true });
  assert.equal(new URL(config.url).hostname, '192.168.10.229', 'Upgrade inspection requires the authorized disposable instance');
  assert.equal(config.sshHost, '192.168.10.229', 'Upgrade inspection requires the authorized SSH target');
  assert.equal(receipt?.version, batch ? 2 : 1, 'Missing or unsupported prepared-install receipt');
  if (batch) {
    assert.equal(receipt.kind, 'prepared-browser-batch', 'Ordinary preparation is not upgrade evidence');
    assert.ok(receipt.helper_states && typeof receipt.helper_states === 'object' && !Array.isArray(receipt.helper_states), 'Missing safe helper cleanup baseline');
    assert.ok(Object.entries(receipt.helper_states).every(([id, value]) => /^(input_boolean|input_number|input_select|input_text)\.marao_dashboard_test_/.test(id) && typeof value === 'string'), 'Unsafe helper cleanup baseline');
  }
  assert.match(receipt.operation_id || '', /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/, 'Missing preserved-install operation identity');
  assert.equal(receipt.target, config.url, 'Preserved-install receipt belongs to another target');
  assert.equal(receipt.remote_config_path, config.remoteConfigPath, 'Preserved-install receipt belongs to another configuration directory');
  assert.equal(receipt.dashboard_key, 'marao-dashboard', 'Upgrade checks require the single Marao dashboard root');
  assert.ok(typeof receipt.entry_id === 'string' && receipt.entry_id, 'Missing preserved integration identity');
  assert.ok(typeof receipt.created_at === 'string', 'Missing preserved-install receipt time');
  const created = Date.parse(receipt.created_at);
  assert.ok(Number.isFinite(created) && created <= now && now - created < 86400000, 'Stale preserved-install receipt');
  assert.ok(isDeepStrictEqual(receipt.candidate, candidate), 'Candidate changed since preserved-install verification');
  assert.match(receipt.source_sha256 || '', /^[a-f0-9]{64}$/, 'Missing saved-source identity');
  assert.ok(receipt.expected_config && typeof receipt.expected_config === 'object' && !Array.isArray(receipt.expected_config), 'Missing independently expected configuration');
  if (receipt.historical_baseline !== undefined) assert.ok(['v0.2.0', 'v0.3.0', 'v0.3.1', 'v0.5.0', 'v0.5.1', 'predecessor-format-1', 'current-format-2'].includes(receipt.historical_baseline), 'Unknown historical installation');
  assert.match(receipt.output?.slug || '', /^[a-z0-9][a-z0-9_-]*$/, 'Invalid preserved output directory');
  const files = receipt.output?.files;
  assert.ok(files && typeof files === 'object' && !Array.isArray(files) && Object.hasOwn(files, 'dashboard.yaml') && Object.hasOwn(files, '.marao-generated.json'), 'Missing preserved output identity');
  for (const [file, digest] of Object.entries(files)) {
    assert.ok(relativeFile(file), 'Invalid preserved output path');
    assert.match(digest, /^[a-f0-9]{64}$/, 'Invalid preserved output digest');
  }
  assert.ok(Array.isArray(receipt.fixture_domains) && receipt.fixture_domains.length > 0 && new Set(receipt.fixture_domains).size === receipt.fixture_domains.length, 'Missing fixture ownership');
  for (const domain of receipt.fixture_domains) {
    assert.ok(typeof domain === 'string' && (/^marao_test_[a-z0-9_]+$/.test(domain) || ['history', 'frigate', 'unifiprotect', 'netatmo'].includes(domain)), 'Invalid fixture ownership');
  }
  assert.ok(receipt.fixture_files && typeof receipt.fixture_files === 'object' && !Array.isArray(receipt.fixture_files) && Object.keys(receipt.fixture_files).length, 'Missing installed fixture-file identity');
  for (const [file, digest] of Object.entries(receipt.fixture_files)) {
    assert.ok(relativeFile(file) && (file.endsWith('/marao_dashboard_card_test_helpers.yaml') || /^www\/marao-upgrade-[a-z0-9_-]+\.js$/.test(file)), 'Invalid installed fixture path');
    assert.match(digest, /^[a-f0-9]{64}$/, 'Invalid installed fixture digest');
  }
  return receipt;
}

function readPreparedReceipt(filename, config, candidate, options) {
  assert.ok(typeof filename === 'string' && path.isAbsolute(filename), 'Preserved-install receipt needs an absolute path');
  const stat = fs.lstatSync(filename);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && !(stat.mode & 0o077), 'Preserved-install receipt must be a private regular file');
  return validatePreparedReceipt(JSON.parse(fs.readFileSync(filename, 'utf8')), config, candidate, Date.now(), options);
}

const snapshotScript = `import hashlib,json,pathlib,sys
request=json.load(sys.stdin)
base=pathlib.Path(request['root']).resolve(strict=True)
if (base/'.marao-upgrade-active.json').is_symlink(): raise ValueError('Symlinked upgrade marker')
def digest(file):
    if file.is_symlink() or any(p.is_symlink() for p in file.parents): raise ValueError('Symlinked upgrade input')
    return hashlib.sha256(file.read_bytes()).hexdigest()
def tree(root,package=False):
    result={}
    for file in sorted(root.rglob('*')):
        if file.is_symlink(): raise ValueError('Symlinked upgrade input')
        relative=file.relative_to(root)
        if package and any(p.startswith('.') or p=='__pycache__' for p in relative.parts): continue
        if package and file.suffix in ('.pyc','.pyo'): continue
        if file.is_file(): result[relative.as_posix()]=digest(file)
    return result
owners={};providers={}
for domain in request['domains']:
    marker=base/'custom_components'/domain/'marao-fixture.json'
    owners[domain]=json.loads(marker.read_text()).get('owner')
    providers[domain]=tree(marker.parent,True)
print(json.dumps({'source_sha256':digest(base/'dashboard/MaraoDashboard/dashboard.json'),
    'operation_id':json.loads((base/'.marao-upgrade-active.json').read_text()).get('operation_id') if (base/'.marao-upgrade-active.json').exists() else None,
    'output':tree(base/'dashboard/MaraoDashboard'/request['slug']),
    'recovering':(base/'dashboard/MaraoDashboard/.history/.operation').exists(),
    'package':tree(base/'custom_components/marao_dashboard',True),'owners':owners,'providers':providers,
    'fixtures':{file:digest(base/file) for file in request['files']}}))`;

async function verifyPrepared(config, filename, { ssh, referencedEntities, operationCompleted = false, batch = false }) {
  const candidate = candidateIdentity();
  const receipt = readPreparedReceipt(filename, config, candidate, { batch });
  assert.ok(isDeepStrictEqual([...receipt.fixture_domains].sort(), fs.readdirSync(path.join(repoRoot, 'ha-test/custom_components')).sort()), 'Incomplete fixture-provider inventory');
  const connection = await connect(config);
  try {
    assert.ok((await connection.call({ type: 'auth/current_user' })).is_admin, 'Upgrade checks require an administrator');
    const entries = await connection.call({ type: 'config_entries/get' });
    assert.equal(entries.filter(entry => entry.domain === 'marao_dashboard').length, 1, 'Unexpected Marao integration count');
    assert.ok(entries.some(entry => entry.domain === 'marao_dashboard' && entry.entry_id === receipt.entry_id && entry.state === 'loaded'), 'Preserved integration identity changed');
    assert.ok(!entries.some(entry => ['frigate', 'unifiprotect', 'netatmo'].includes(entry.domain)), 'Fixtures cannot replace real camera providers');
    assert.equal((await api(config, 'GET', '/api/config')).config_dir, config.remoteConfigPath, 'Unexpected disposable configuration directory');
    const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
    const readSnapshot = () => batch ? require('../prepared-batch').readBatchSnapshot(config, {
      slug: receipt.output.slug, domains: receipt.fixture_domains, files: Object.keys(receipt.fixture_files),
    }, ssh) : JSON.parse(ssh(config, 'python3 -c ' + quote(snapshotScript), {
      input: JSON.stringify({ root: config.remoteConfigPath, slug: receipt.output.slug, domains: receipt.fixture_domains, files: Object.keys(receipt.fixture_files) }),
    }).stdout);
    const snapshot = readSnapshot();
    assert.equal(snapshot.operation_id, operationCompleted ? null : receipt.operation_id, 'Preserved-install operation changed or cleanup is incomplete');
    assert.equal(snapshot.recovering, false, 'An installed dashboard operation still needs recovery');
    assert.equal(snapshot.source_sha256, receipt.source_sha256, 'Saved source changed or was reseeded');
    assert.ok(isDeepStrictEqual(snapshot.output, receipt.output.files), 'Preserved output changed or was reseeded');
    assert.ok(isDeepStrictEqual(snapshot.package, fileHashes(integration)), 'Installed package does not match the candidate');
    assert.ok(Object.values(snapshot.owners).every(owner => owner === 'marao-dashboard-tests'), 'Unverified fixture ownership');
    assert.ok(isDeepStrictEqual(snapshot.fixtures, receipt.fixture_files), 'Installed fixture files changed');
    for (const domain of receipt.fixture_domains) {
      const wanted = fileHashes(path.join(repoRoot, 'ha-test/custom_components', domain));
      wanted['marao-fixture.json'] = sha256('{"owner":"marao-dashboard-tests"}\n');
      assert.ok(isDeepStrictEqual(snapshot.providers[domain], wanted), 'Installed fixture provider is stale: ' + domain);
    }
    const management = await connection.call({ type: 'marao_dashboard/config/get' });
    assert.ok(isDeepStrictEqual(JSON.parse(management.config), receipt.expected_config), 'Persisted configuration differs from the independent expectation');
    const panels = await connection.call({ type: 'get_panels' });
    assert.ok(panels['marao-dashboard'], 'Preserved dashboard is not registered');
    assert.equal(Object.entries(panels).filter(([key, panel]) => key.startsWith('marao-') && panel.component_name === 'lovelace').length, 1, 'Unexpected extra Marao dashboard');
    assert.ok(JSON.stringify(panels['marao-dashboard-editor']).includes('v=' + candidate.frontend_fingerprint), 'Loaded editor fingerprint is stale');
    const resources = await connection.call({ type: 'lovelace/resources' });
    assert.ok(!resources.some(resource => {
      const url = new URL(resource.url, config.url);
      return url.origin === config.url && ['/api/marao_dashboard/frontend', '/marao_dashboard_static/', '/hacsfiles/MaraoDashboard/', '/local/community/MaraoDashboard/'].some(prefix => url.pathname.startsWith(prefix));
    }), 'Stale owned card resources');
    const dashboard = await connection.call({ type: 'lovelace/config', url_path: 'marao-dashboard', force: true });
    const savedCases = Array.isArray(receipt.expected_config.pages)
      ? receipt.expected_config.pages.filter(view => view.path === 'card-test').length : 1;
    assert.equal(dashboard.views.filter(view => view.path === 'card-test').length, savedCases, 'Preserved Cases view differs from saved source');
    const states = new Set((await connection.call({ type: 'get_states' })).map(state => state.entity_id));
    const historical = historicalEntities(receipt.historical_baseline, referencedEntities);
    assertHistoricalBindings([...historical], states, referencedEntities);
    assert.ok([...referencedEntities(dashboard)].every(entity => states.has(entity) || entity.includes('_missing') || historical.has(entity)), 'Preserved dashboard references missing fixtures');
    for (const file of ['MaraoDashboard.js', 'MaraoCards.js', 'MaraoFrigateEventsCard.js', 'MaraoDashboardPanel.js']) {
      const served = await api(config, 'GET', frontendAssetURL(candidate.frontend_fingerprint, file), undefined, { text: true });
      assert.equal(sha256(served), sha256(fs.readFileSync(path.join(integration, 'frontend', file))), 'Served candidate asset is stale: ' + file);
    }
    assert.ok(isDeepStrictEqual(candidateIdentity(), candidate), 'Candidate changed during preserved-install inspection');
    assert.ok(isDeepStrictEqual(readSnapshot(), snapshot), 'Installed data changed during preserved-install inspection');
    return { config, version: candidate.frontend_fingerprint, dashboard };
  } finally { connection.close(); }
}

function historicalEntities(baseline, referencedEntities) {
  if (!baseline || baseline === 'current-format-2') return new Set();
  const fixtures = path.join(__dirname, 'fixtures');
  let file;
  if (baseline === 'v0.2.0') file = 'v0.2.0-storage-format-2-expected.json';
  else if (baseline === 'predecessor-format-1') file = 'page-parity-format-2-expected.json';
  else {
    const provenance = JSON.parse(fs.readFileSync(path.join(fixtures, 'provenance.json'))).find(row => row.tag === baseline);
    const expectations = JSON.parse(fs.readFileSync(path.join(fixtures, 'page-model-expectations.json'))).records;
    file = expectations.find(row => row.input === provenance.fixture).expected;
  }
  const source = fs.readFileSync(path.join(fixtures, file), 'utf8');
  const aliases = historicalEntityAliases(JSON.parse(source), referencedEntities);
  return referencedEntities(JSON.parse(isolateHistoricalText(source, aliases)));
}

module.exports = { assertHistoricalBindings, candidateIdentity, fileHashes, historicalEntityAliases, historicalEntities, isolateHistoricalText, readPreparedReceipt, snapshotScript, validatePreparedReceipt, verifyPrepared };
