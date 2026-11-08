import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseReleaseArgs, releaseAssets, verifyUploaded, runRelease} from '../../ha-test/release.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-release-test-')), root = path.join(temporary, 'repo');
  t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));fs.mkdirSync(root);
  const write = (name, text) => {const file = path.join(root, name);fs.mkdirSync(path.dirname(file), {recursive: true});fs.writeFileSync(file, text);};
  const json = (name, value) => write(name, JSON.stringify(value));
  const read = name => JSON.parse(fs.readFileSync(path.join(root, name)));
  const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: 'pipe'}).trim();
  const identity = version => hash(version);
  const generated = ['MaraoAuthoring.js', 'MaraoAuthoring.metadata.json', 'MaraoAuthoringCLI.mjs'];
  const build = version => {
    fs.rmSync(path.join(root, 'dist'), {recursive: true, force: true});write('dist/MaraoFrontend.js', '// ' + version);
    json('dist/MaraoFrontend.release.json', {package_version: version, identity: identity(version), files: {'MaraoFrontend.js': hash('// ' + version)}});
    for (const name of generated) write('custom_components/marao_dashboard/frontend/' + name, version);
    write('ha-test/.cache/native-converter/marao-converter.html', '<!-- converter ' + version + ' -->');
  };
  write('.gitignore', 'ha-test/.cache/\n');json('package.json', {version: '1.0.0'});json('package-lock.json', {version: '1.0.0'});build('1.0.0');
  git('init', '-q');git('config', 'user.name', 'Release Test');git('config', 'user.email', 'test@localhost');git('config', 'core.hooksPath', '/dev/null');
  git('add', '.');git('commit', '-qm', 'Reviewed source');const source = git('rev-parse', 'HEAD');git('update-ref', 'refs/remotes/origin/main', source);git('remote', 'add', 'origin', 'https://github.com/diogomrpr/MaraoDashboard.git');
  const notesFile = path.join(temporary, 'notes.md');fs.writeFileSync(notesFile, 'Reviewed release notes\n');
  const options = {version: '1.0.1', notesFile};
  const state = {calls: [], draft: null, pr: false, merged: false, fail: '', target: '192.168.0.28'};
  const current = () => git('rev-parse', 'HEAD');
  const pr = () => ({number: 1, headRefOid: current(), baseRefName: 'main', state: state.merged ? 'MERGED' : 'OPEN'});
  const publishedAt = '2026-11-08T16:00:00Z';
  const api = endpoint => {
    if (endpoint === 'releases/latest') return state.draft && !state.draft.draft ? state.draft : {tag_name: 'v1.0.0', draft: false, prerelease: false};
    if (endpoint === 'releases/1') return state.draft;
    if (endpoint === 'commits/v1.0.1') return {sha: git('rev-parse', 'v1.0.1^{commit}')};
    if (endpoint.startsWith('actions/runs?head_sha=')) return {workflow_runs: ['Tests', 'Validate HACS', 'Validate with hassfest', 'Documentation'].map(name => ({name, event: 'push', head_sha: current(), status: state.fail === 'pending' ? 'in_progress' : 'completed', conclusion: state.fail === 'ci' && name === 'Tests' ? 'failure' : 'success', html_url: 'https://github.com/example/check'}))};
    if (endpoint === 'pulls/1') return {head: {sha: current()}, merged: state.merged, merge_commit_sha: current()};
    if (endpoint === 'branches/main') return {commit: {sha: source}};
    if (endpoint === 'pulls/1/merge') {state.merged = true;return {merged: true, sha: current()};}
    if (endpoint.startsWith('git/commits/')) return {tree: {sha: git('rev-parse', 'HEAD^{tree}')}};
    if (endpoint === 'actions/runs?per_page=100') return {workflow_runs: [{id: 100, name: 'Documentation', event: 'workflow_dispatch', head_sha: current(), created_at: publishedAt, status: 'completed', conclusion: state.fail === 'docs' ? 'failure' : 'success', html_url: 'https://github.com/example/docs'}]};
    if (endpoint === 'actions/runs/100/jobs') return {jobs: [{name: 'deploy', conclusion: 'success'}]};
    throw Error('Unexpected mocked API request: ' + endpoint);
  };
  const dependencies = {
    log() {},delay: async () => assert.fail('No pending checks expected in this fixture'),
    client: {readConfig: () => ({url: 'http://' + state.target + ':8123', sshHost: state.target})},
    verify: async args => {state.calls.push(['gate', ...args]);if (state.fail === 'unit') throw Error('Unit gate failed');return {passed: true, verified_cleanup: true, unit: true, parallel: false, head: current(), filename: '/private/mock-unit-report.json'};},
    install: async () => {state.calls.push(['install']);if (state.fail === 'install') throw Error('Not installed / not ready for test');return {installed: true, version: identity(read('package.json').version), config: {token: 'never-save-this'}};},
    run(command, args, extra) {
      state.calls.push([command, ...args]);
      if (command === 'git') {if (['fetch', 'push'].includes(args[0])) return '';return git(...args);}
      if (command === 'npm') {
        if (args[0] === 'version') {json('package.json', {version: args[1]});json('package-lock.json', {version: args[1]});}
        else {assert.ok(['build:hacs', 'build:converter'].includes(args[1]));build(read('package.json').version);}
        return '';
      }
      assert.equal(command, 'gh');
      if (args[0] === 'api') return JSON.stringify(api(args[1].replace('repos/diogomrpr/MaraoDashboard/', '')));
      assert.deepEqual(args.slice(-2), ['--repo', 'diogomrpr/MaraoDashboard']);
      if (args[0] === 'pr') {
        if (args[1] === 'list') return JSON.stringify(state.pr ? [pr()] : []);
        if (args[1] === 'create') {state.pr = true;return '';}
        if (args[1] === 'view') return JSON.stringify(pr());
      }
      if (args[0] === 'release') {
        if (args[1] === 'view') {if (!state.draft) {const error = Error('release not found');error.stderr = 'release not found';throw error;}return JSON.stringify({databaseId: 1, tagName: 'v1.0.1', isDraft: state.draft.draft});}
        if (args[1] === 'create') {state.draft = {id: 1, tag_name: 'v1.0.1', body: fs.readFileSync(args[args.indexOf('--notes-file') + 1], 'utf8'), draft: true, assets: [], html_url: 'https://github.com/example/v1.0.1'};return '';}
        if (args[1] === 'upload') {for (const file of args.slice(3, -2)) state.draft.assets.push({name: path.basename(file), state: 'uploaded', digest: 'sha256:' + hash(fs.readFileSync(file))});return '';}
        if (args[1] === 'edit') {state.draft.draft = false;state.draft.published_at = publishedAt;if (state.fail === 'publish-response') throw Error('Connection closed after publishing');return '';}
      }
      throw Error('Unexpected mocked command: ' + args.join(' '));
    },
  };
  const release = () => runRelease(root, options, dependencies);
  return {root, options, state, git, write, read, release, dependencies, identity};
}

test('one release command versions, checks the whole candidate, installs, verifies all assets, merges, publishes and confirms documentation', async t => {
  const f = fixture(t), result = await f.release();assert.equal(result.version, '1.0.1');assert.equal(result.assets, 3);assert.equal(result.documentationRun, 100);
  assert.equal(f.read('package-lock.json').version, '1.0.1');assert.equal(f.git('status', '--porcelain'), '');assert.equal(f.git('rev-parse', 'v1.0.1^{commit}'), result.commit);
  const events = f.state.calls.map(call => call.join(' '));
  const before = (a, b) => assert.ok(events.findIndex(s => s.startsWith(a)) < events.findIndex(s => s.startsWith(b)), a + ' must precede ' + b);
  before('gate --base v1.0.0', 'install');before('install', 'git push');before('gh release upload', 'gh api repos/diogomrpr/MaraoDashboard/pulls/1/merge');before('gh api repos/diogomrpr/MaraoDashboard/pulls/1/merge', 'gh release edit');
  assert.ok(!events.some(s => /test:full|test:ha:|ha:sync/.test(s)));assert.ok(!events.some(s => s.includes('--parallel')));
  const journal = fs.readFileSync(path.join(f.root, '.git/marao-releases/1.0.1.json'), 'utf8');assert.doesNotMatch(journal, /never-save-this|token/);assert.equal(JSON.parse(journal).stage, 'complete');
  const count = events.length;await f.release();assert.ok(f.state.calls.slice(count).every(call => call[0] === 'git'), 'Completed releases do not republish or reinstall');
});

test('read-only plan and dirty-source refusal do not build, install or contact GitHub', async t => {
  const f = fixture(t);f.write('unrelated.txt', 'Uncommitted work');
  const plan = await runRelease(f.root, {...f.options, plan: true}, f.dependencies);assert.equal(plan.dirty, true);
  await assert.rejects(f.release(), /clean, reviewed checkout/);assert.ok(f.state.calls.every(call => call[0] === 'git'));assert.equal(f.read('package.json').version, '1.0.0');
});

test('failed unit or installation gates block pushes and publication', async t => {
  for (const failure of ['unit', 'install']) {
    const f = fixture(t);f.state.fail = failure;await assert.rejects(f.release(), /Release stopped/);
    assert.ok(!f.state.calls.some(call => call[0] === 'git' && call[1] === 'push'));assert.equal(f.state.draft, null);
    if (failure === 'unit') assert.ok(!f.state.calls.some(call => call[0] === 'install'));
    assert.equal(fs.existsSync(path.join(f.root, '.git/marao-release.lock')), false);
  }
});

test('failed exact-commit CI leaves a draft; rerunning resumes without changing the tag, version or uploaded assets', async t => {
  const f = fixture(t);f.state.fail = 'ci';await assert.rejects(f.release(), /GitHub check failed/);const commit = f.git('rev-parse', 'v1.0.1^{commit}');
  assert.equal(f.state.draft.draft, true);assert.equal(f.state.merged, false);const assets = structuredClone(f.state.draft.assets);
  f.state.fail = '';await f.release();assert.equal(f.git('rev-parse', 'v1.0.1^{commit}'), commit);assert.deepEqual(f.state.draft.assets, assets);
  assert.equal(f.state.calls.filter(call => call[0] === 'git' && call[1] === 'tag' && call.includes('-a')).length, 1);
  assert.equal(f.state.calls.filter(call => call[0] === 'npm' && call[1] === 'version').length, 1);
  assert.ok(f.state.calls.some(call => call[0] === 'gate' && call.includes('--report')));
});

test('changed notes, candidate files and pre-existing mismatched tags are refused without overwrites', async t => {
  const f = fixture(t);f.state.fail = 'ci';await assert.rejects(f.release());fs.appendFileSync(f.options.notesFile, 'Different notes');
  await assert.rejects(f.release(), /notes changed/);fs.writeFileSync(f.options.notesFile, 'Reviewed release notes\n');f.write('dist/MaraoFrontend.js', 'tampered');await assert.rejects(f.release(), /clean, reviewed checkout/);
  const other = fixture(t);other.git('tag', 'v1.0.1');await assert.rejects(other.release(), /tag points to another commit/);assert.equal(other.state.draft, null);
});

test('asset corruption, incomplete graphs and unexpected uploads cannot be published', async t => {
  const f = fixture(t);f.state.fail = 'ci';await assert.rejects(f.release());f.state.draft.assets[0].digest = 'sha256:incorrect';f.state.fail = '';
  await assert.rejects(f.release(), /Uploaded asset hash differs/);assert.equal(f.state.draft.draft, true);assert.equal(f.state.merged, false);
  assert.throws(() => verifyUploaded([], [{name: 'one', sha256: 'a'}]), /incomplete/);
  assert.throws(() => verifyUploaded([{name: 'other', state: 'uploaded'}], []), /Unexpected/);
  f.write('dist/extra.js', 'extra');assert.throws(() => releaseAssets(f.root, '1.0.1'), /extra dist/);
});

test('wrong HA targets block installation and failed documentation stays visibly incomplete after publication', async t => {
  const f = fixture(t);f.state.target = '192.168.0.99';await assert.rejects(f.release());assert.ok(!f.state.calls.some(call => call[0] === 'install'));
  const docs = fixture(t);docs.state.fail = 'docs';await assert.rejects(docs.release(), /published, but documentation failed/);assert.equal(docs.state.draft.draft, false);
  assert.equal(JSON.parse(fs.readFileSync(path.join(docs.root, '.git/marao-releases/1.0.1.json'))).stage, 'published');
  const wrong = fixture(t);wrong.git('remote', 'set-url', '--push', 'origin', 'https://github.com/other/project.git');await assert.rejects(wrong.release(), /Push target/);assert.equal(wrong.read('package.json').version, '1.0.0');
});

test('CLI accepts only explicit stable versions and supported options', () => {
  assert.deepEqual(parseReleaseArgs(['--version', '0.35.0', '--notes-file', '/private/tmp/notes.md', '--plan']), {version: '0.35.0', notesFile: '/private/tmp/notes.md', plan: true});
  for (const args of [[], ['--version', 'patch', '--notes-file', 'notes'], ['--version', '01.2.3', '--notes-file', 'notes'], ['--version', '1.0.0-beta', '--notes-file', 'notes'], ['--version', '1.0.0', '--notes-file', 'notes', '--skip-checks']]) assert.throws(() => parseReleaseArgs(args));
});

test('pending checks prevent merge/publication until completion and a release lock blocks concurrent runs', async t => {
  const f = fixture(t);f.state.fail = 'pending';let waited = 0;
  f.dependencies.delay = async () => {waited++;assert.equal(f.state.draft.draft, true);assert.equal(f.state.merged, false);f.state.fail = '';};
  await f.release();assert.equal(waited, 1);
  const locked = fixture(t);fs.writeFileSync(path.join(locked.root, '.git/marao-release.lock'), 'another release');
  await assert.rejects(locked.release(), /Another release/);assert.ok(locked.state.calls.every(call => call[0] === 'git'));
});

test('a lost publish response resumes a public release without republishing or changing its assets', async t => {
  const f = fixture(t);f.state.fail = 'publish-response';await assert.rejects(f.release(), /publishing was attempted/);assert.equal(f.state.draft.draft, false);
  const assets = structuredClone(f.state.draft.assets);f.state.fail = '';const result = await f.release();assert.equal(result.documentationRun, 100);
  assert.deepEqual(f.state.draft.assets, assets);assert.equal(f.state.calls.filter(call => call[0] === 'gh' && call[1] === 'release' && call[2] === 'edit').length, 1);
});
