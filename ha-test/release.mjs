import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const repository = 'diogomrpr/MaraoDashboard';
const repo = fileURLToPath(new URL('../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const versionParts = version => {
  assert.match(version || '', /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Use an exact stable version, for example 0.35.0');
  return version.split('.').map(BigInt);
};
const newer = (next, before) => {
  const a = versionParts(next), b = versionParts(before);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
};
const generated = ['MaraoAuthoring.js', 'MaraoAuthoring.metadata.json', 'MaraoAuthoringCLI.mjs'].map(name => 'custom_components/marao_dashboard/frontend/' + name);
const versionOutput = file => ['package.json', 'package-lock.json', ...generated].includes(file) || file.startsWith('dist/');

export function releaseAssets(root, version) {
  const directory = path.join(root, 'dist'), manifest = read(path.join(directory, 'MaraoFrontend.release.json'));
  assert.equal(manifest.package_version, version, 'Built version differs');
  assert.match(manifest.identity, /^[a-f0-9]{64}$/, 'Missing frontend identity');
  const names = fs.readdirSync(directory).sort();
  assert.deepEqual(names, [...Object.keys(manifest.files), 'MaraoFrontend.release.json'].sort(), 'Incomplete or extra dist files');
  const files = names.map(name => ({name, file: path.join(directory, name)}));
  files.push({name: 'marao-converter.html', file: path.join(root, 'ha-test/.cache/native-converter/marao-converter.html')});
  const assets = files.map(item => {
    assert.ok(fs.lstatSync(item.file).isFile(), 'Assets must be regular files');
    const hash = sha(fs.readFileSync(item.file));
    if (item.name !== 'marao-converter.html' && item.name !== 'MaraoFrontend.release.json') assert.equal(hash, manifest.files[item.name], 'Asset hash differs: ' + item.name);
    return {...item, sha256: hash};
  });
  return {identity: manifest.identity, assets};
}

export function verifyUploaded(actual, expected, complete = true) {
  const wanted = new Map(expected.map(item => [item.name, item.sha256]));
  assert.equal(new Set(actual.map(item => item.name)).size, actual.length, 'Duplicate uploaded asset');
  for (const item of actual) {
    assert.ok(wanted.has(item.name), 'Unexpected release asset: ' + item.name);
    assert.equal(item.state, 'uploaded', 'Asset upload is incomplete: ' + item.name);
    assert.equal(item.digest, 'sha256:' + wanted.get(item.name), 'Uploaded asset hash differs: ' + item.name);
  }
  if (complete) assert.equal(actual.length, expected.length, 'Release asset graph is incomplete');
}

export function parseReleaseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--plan') {assert.ok(!options.plan, 'Duplicate --plan'); options.plan = true;}
    else {
      assert.ok(['--version', '--notes-file', '--config'].includes(arg), 'Unknown release option: ' + arg);
      const key = {'--version': 'version', '--notes-file': 'notesFile', '--config': 'configFile'}[arg];
      assert.ok(!options[key] && args[i + 1] && !args[i + 1].startsWith('--'), 'Missing or duplicate ' + arg);
      options[key] = args[++i];
    }
  }
  versionParts(options.version);
  assert.ok(options.notesFile, 'Supply --notes-file with the reviewed release notes');
  return options;
}

export async function runRelease(root, options, dependencies = {}) {
  root = fs.realpathSync(root);versionParts(options.version);
  const log = dependencies.log || console.log;
  const run = dependencies.run || ((command, args, extra = {}) => {
    const env = {...process.env};delete env.NODE_TEST_CONTEXT;
    return execFileSync(command, args, {cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env, ...extra}) || '';
  });
  const git = (...args) => run('git', args).trim();
  const gh = (...args) => run('gh', [...args, '--repo', repository]);
  const api = (endpoint, args = []) => JSON.parse(run('gh', ['api', 'repos/' + repository + '/' + endpoint, ...args]));
  const clean = () => assert.equal(git('status', '--porcelain', '--untracked-files=normal'), '', 'Release requires a clean, reviewed checkout; preserve/commit unrelated work first');
  const head = () => git('rev-parse', 'HEAD');
  const tag = 'v' + options.version, branch = 'codex/release-' + options.version.replaceAll('.', '-');
  const notesFile = path.resolve(options.notesFile);
  assert.ok(fs.lstatSync(notesFile).isFile(), 'Release notes must be a regular file');
  const notes = fs.readFileSync(notesFile);assert.ok(notes.toString().trim(), 'Release notes are empty');
  const origin = /^(?:https:\/\/github\.com\/|git@github\.com:)diogomrpr\/MaraoDashboard(?:\.git)?$/;
  assert.match(git('remote', 'get-url', 'origin'), origin, 'Origin is not the Marao release repository');
  assert.match(git('remote', 'get-url', '--push', 'origin'), origin, 'Push target is not the Marao release repository');
  const common = fs.realpathSync(path.resolve(root, git('rev-parse', '--git-common-dir')));
  const directory = path.join(common, 'marao-releases'), journal = path.join(directory, options.version + '.json');
  if (fs.existsSync(directory)) assert.ok(fs.lstatSync(directory).isDirectory(), 'Release journal directory must not be a symlink');
  if (fs.existsSync(journal)) assert.ok(fs.lstatSync(journal).isFile(), 'Release journal must be a regular file');
  let state = fs.existsSync(journal) ? read(journal) : null;
  if (state) {
    assert.equal(state.root, root, 'Resume from the original release checkout');
    assert.equal(state.notesHash, sha(notes), 'Release notes changed; inspect the saved release before resuming');
    assert.equal(state.version, options.version);
  }
  if (options.plan) return {version: options.version, tag, branch, currentVersion: read(path.join(root, 'package.json')).version, dirty: Boolean(git('status', '--porcelain')), resume: Boolean(state), stage: state?.stage, steps: ['version/build/commit', 'serial affected unit gate', 'install and verify on 192.168.0.28', 'push branch/tag and create PR', 'verify full draft assets and exact-commit GitHub checks', 'merge and publish', 'confirm tagged documentation deployment']};
  if (!state) clean();
  fs.mkdirSync(directory, {recursive: true, mode: 0o700});
  const lock = path.join(common, 'marao-release.lock');let handle;
  try {handle = fs.openSync(lock, 'wx', 0o600);}
  catch (error) {if (error.code === 'EEXIST') throw Error('Another release holds ' + lock + '; inspect it before removing a stale lock.');throw error;}
  const save = () => {const temporary = journal + '.' + randomUUID() + '.tmp';fs.writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n', {mode: 0o600, flag: 'wx'});fs.renameSync(temporary, journal);};
  const wait = async (label, check) => {
    const started = Date.now();
    for (;;) {
      const result = await check();if (result) return result;
      assert.ok(Date.now() - started < 20 * 60 * 1000, label + ' timed out; rerun the same command to resume');
      log('Waiting for ' + label + '…');await (dependencies.delay || (ms => new Promise(resolve => setTimeout(resolve, ms))))(15000);
    }
  };
  try {
    fs.writeFileSync(handle, JSON.stringify({pid: process.pid, root, version: options.version}));
    if (!state) {
      log('Preparing release ' + tag);
      run('git', ['fetch', 'origin', 'main', '--tags']);
      assert.equal(git('rev-parse', 'origin/main'), api('branches/main').commit.sha, 'Fetched main is stale');
      run('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD']);
      const latest = api('releases/latest');assert.ok(!latest.draft && !latest.prerelease, 'Expected a stable release baseline');
      assert.ok(newer(options.version, latest.tag_name.replace(/^v/, '')), 'Version must exceed the latest stable release');
      assert.ok(newer(options.version, read(path.join(root, 'package.json')).version), 'Version must exceed the current package');
      state = {version: options.version, tag, branch, root, source: head(), main: git('rev-parse', 'origin/main'), baseTag: latest.tag_name, notesHash: sha(notes), stage: 'preparing'};
      save();fs.writeFileSync(path.join(directory, options.version + '-notes.md'), notes, {mode: 0o600});
    }
    const savedNotes = path.join(directory, options.version + '-notes.md');
    if (!fs.existsSync(savedNotes)) fs.writeFileSync(savedNotes, notes, {mode: 0o600});
    assert.ok(fs.lstatSync(savedNotes).isFile(), 'Saved notes must be a regular file');
    assert.equal(sha(fs.readFileSync(savedNotes)), state.notesHash, 'Saved release notes differ');
    if (!state.commit) {
      assert.ok(head() === state.source || state.tree && git('rev-parse', 'HEAD^{tree}') === state.tree, 'Source commit changed during release');
      if (head() === state.source) {
        const changes = git('diff', '--name-only', 'HEAD').split('\n').filter(Boolean);
        assert.ok(changes.every(versionOutput), 'Unreviewed source changed during release');
        const currentBranch = git('branch', '--show-current');
        if (currentBranch !== branch) run('git', ['switch', '-c', branch]);
        if (read(path.join(root, 'package.json')).version !== options.version) run('npm', ['version', options.version, '--ignore-scripts', '--no-git-tag-version'], {stdio: 'inherit'});
        run('npm', ['run', 'build:hacs'], {stdio: 'inherit'});run('npm', ['run', 'build:converter'], {stdio: 'inherit'});
        const changed = git('diff', '--name-only', 'HEAD').split('\n').filter(Boolean);
        const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
        assert.ok([...changed, ...untracked].every(versionOutput), 'Build changed unexpected source; inspect it before proceeding');
        const built = releaseAssets(root, options.version);state.identity = built.identity;state.assets = built.assets;save();
        run('git', ['add', '--', 'package.json', 'package-lock.json', ...generated, 'dist']);
        state.tree = git('write-tree');save();
        run('git', ['commit', '-m', 'Release ' + options.version]);
      } else {
        assert.equal(git('rev-parse', 'HEAD^'), state.source, 'Unexpected release commit parent');
      }
      state.commit = head();state.stage = 'prepared';save();
    }
    const candidate = () => {
      clean();assert.equal(head(), state.commit, 'Release commit changed');assert.equal(git('rev-parse', 'HEAD^{tree}'), state.tree);
      assert.equal(git('branch', '--show-current'), branch, 'Resume on the release branch');assert.equal(git('rev-parse', 'refs/heads/' + branch), state.commit, 'Release branch changed');
      const built = releaseAssets(root, options.version);assert.equal(built.identity, state.identity);assert.deepEqual(built.assets, state.assets, 'Candidate assets changed');
    };
    candidate();
    if (state.stage === 'complete') return {version: state.version, url: state.url, documentationRun: state.documentationRun, resumed: true};
    const verify = dependencies.verify || (args => require(path.join(root, 'tests/verify-publish.js')).verifyPublish(args));
    log('Checking affected units across ' + state.baseTag + ' → ' + state.commit);
    const report = await verify(['--base', state.baseTag, ...(state.report ? ['--report', state.report] : [])]);
    assert.ok(report.passed && report.verified_cleanup && report.unit && !report.parallel, 'Publication gate did not confirm serial unit success');
    assert.equal(report.head, state.commit, 'Unit report belongs to another commit');state.report = report.filename;state.stage = 'checked';save();candidate();
    const client = dependencies.client || require(path.join(root, 'ha-test/client.js'));
    const config = client.readConfig(options.configFile && path.resolve(options.configFile));
    assert.equal(new URL(config.url).hostname, '192.168.0.28');assert.equal(config.sshHost, '192.168.0.28');
    const install = dependencies.install || (async config => {const helper = require(path.join(root, 'ha-test/prepare-frontend.js'));helper.assertTarget(config);return helper.prepareFrontend(config);});
    log('Installing/verifying final candidate on disposable 192.168.0.28');
    const installed = await install(config);assert.equal(installed.installed, true, 'Not installed / not ready for test');assert.equal(installed.version, state.identity, 'Installed assets differ');
    state.installation = {target: '192.168.0.28', identity: installed.version};state.stage = 'installed';save();candidate();
    run('git', ['push', '--set-upstream', 'origin', branch]);
    const prs = JSON.parse(gh('pr', 'list', '--head', branch, '--state', 'all', '--json', 'number,headRefOid,baseRefName,state'));
    assert.ok(prs.length <= 1, 'Ambiguous release pull requests');
    if (!prs.length) gh('pr', 'create', '--head', branch, '--base', 'main', '--title', 'Release ' + options.version, '--body-file', savedNotes);
    const pr = prs[0] || JSON.parse(gh('pr', 'view', branch, '--json', 'number,headRefOid,baseRefName,state'));
    assert.equal(pr.headRefOid, state.commit, 'PR head changed');assert.equal(pr.baseRefName, 'main');assert.notEqual(pr.state, 'CLOSED', 'Release PR was closed');state.pr = pr.number;save();
    if (!git('tag', '--list', tag)) run('git', ['tag', '-a', tag, state.commit, '-m', 'Marao Dashboard ' + options.version]);
    assert.equal(git('rev-parse', tag + '^{commit}'), state.commit, 'Existing tag points to another commit; tags are never moved');
    run('git', ['push', 'origin', tag]);assert.equal(api('commits/' + tag).sha, state.commit, 'Remote tag differs');
    const release = () => {
      let meta;
      try {meta = JSON.parse(gh('release', 'view', tag, '--json', 'databaseId,tagName,isDraft'));}
      catch (error) {if (/release not found/i.test(String(error.stderr || error.message))) return null;throw error;}
      return api('releases/' + meta.databaseId);
    };
    let draft = release();
    if (!draft) {gh('release', 'create', tag, '--verify-tag', '--draft', '--title', tag, '--notes-file', savedNotes);draft = release();}
    assert.equal(draft.tag_name, tag);
    assert.equal((draft.body || '').trim(), notes.toString().trim(), 'Release notes differ from the reviewed notes');
    verifyUploaded(draft.assets, state.assets, false);
    const missing = state.assets.filter(item => !draft.assets.some(asset => asset.name === item.name));
    if (missing.length) {assert.equal(draft.draft, true, 'Cannot alter a published release');gh('release', 'upload', tag, ...missing.map(item => item.file));draft = release();}
    verifyUploaded(draft.assets, state.assets);state.releaseId = draft.id;state.stage = draft.draft ? 'uploaded' : 'published';save();
    const required = ['Tests', 'Validate HACS', 'Validate with hassfest', 'Documentation'];
    await wait('exact-commit GitHub checks', () => {
      const runs = api('actions/runs?head_sha=' + state.commit + '&per_page=100').workflow_runs.filter(run => required.includes(run.name) && ['push', 'pull_request'].includes(run.event));
      assert.ok(runs.every(run => run.head_sha === state.commit), 'CI commit differs');
      for (const run of runs) if (run.status === 'completed') assert.equal(run.conclusion, 'success', 'GitHub check failed: ' + run.name + ' (' + run.html_url + ')');
      return required.every(name => runs.some(run => run.name === name && run.status === 'completed' && run.conclusion === 'success')) && runs.every(run => run.status === 'completed');
    });
    candidate();
    const latest = api('releases/latest');assert.ok([state.baseTag, tag].includes(latest.tag_name), 'Another release was published; stop and reconcile');
    const remotePr = api('pulls/' + pr.number);assert.equal(remotePr.head.sha, state.commit, 'PR head changed before merge');
    if (!remotePr.merged) {
      assert.equal(api('branches/main').commit.sha, state.main, 'Main advanced; reconcile and verify a new candidate rather than merging unseen changes');
      const request = path.join(directory, options.version + '-merge.json');
      fs.writeFileSync(request, JSON.stringify({sha: state.commit, merge_method: 'merge', commit_title: 'Release ' + options.version}), {mode: 0o600});
      const merged = api('pulls/' + pr.number + '/merge', ['--method', 'PUT', '--input', request]);assert.equal(merged.merged, true, 'PR merge failed');state.merge = merged.sha;
    } else state.merge = remotePr.merge_commit_sha;
    assert.equal(api('git/commits/' + state.merge).tree.sha, state.tree, 'Merged tree differs from the installed candidate');state.stage = 'merged';save();
    if (draft.draft) {state.publishAttempted = true;save();gh('release', 'edit', tag, '--draft=false', '--latest');}
    const published = release();assert.equal(published.draft, false);verifyUploaded(published.assets, state.assets);
    assert.equal(api('releases/latest').tag_name, tag, 'Release is not latest');state.url = published.html_url;state.stage = 'published';save();
    const docs = await wait('tagged documentation deployment', () => {
      const runs = api('actions/runs?per_page=100').workflow_runs.filter(run => run.name === 'Documentation' && run.event === 'workflow_dispatch' && run.head_sha === state.merge && Date.parse(run.created_at) >= Date.parse(published.published_at));
      if (!runs.length) return false;
      const current = runs.sort((a, b) => b.id - a.id)[0];if (current.status !== 'completed') return false;
      assert.equal(current.conclusion, 'success', 'Release is published, but documentation failed: ' + current.html_url);
      const jobs = api('actions/runs/' + current.id + '/jobs').jobs;assert.ok(jobs.some(job => job.name === 'deploy' && job.conclusion === 'success'), 'Documentation deployment was not confirmed');return current;
    });
    state.documentationRun = docs.id;state.stage = 'complete';save();
    return {version: state.version, url: state.url, commit: state.commit, assets: state.assets.length, installed: state.installation, documentationRun: docs.id};
  } catch (error) {
    throw new Error(error.message + '\nRelease stopped' + (state?.url ? ' after publication at ' + state.url : state?.publishAttempted ? ' after publishing was attempted; inspect the release status' : ' before publication') + '. Recovery journal: ' + journal + '. Rerun the same command after resolving the failure; no tag or published asset will be overwritten.');
  } finally {fs.closeSync(handle);fs.unlinkSync(lock);}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve().then(() => runRelease(repo, parseReleaseArgs(process.argv.slice(2)))).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {console.error(error.message);process.exitCode = 1;});
}
