import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const repo = fileURLToPath(new URL('../../', import.meta.url));
const digest = bytes => bytes === null ? null : createHash('sha256').update(bytes).digest('hex');
const git = (cwd, args, options = {}) => execFileSync('git', args, {cwd, maxBuffer: 32 * 1024 * 1024, ...options});
const list = bytes => bytes.toString().split('\0').filter(Boolean);
const permitted = file => /^(frontend_src\/|custom_components\/marao_dashboard\/frontend\/|docs\/|tests\/|openspec\/)/.test(file)
  && !file.split('/').some(part => !part || part === '..' || part.startsWith('.') || /^(node_modules|dist|playground-assets|__pycache__)$/.test(part) || /^(?:local\.json|secrets?\b|credentials?\b)/i.test(part))
  && !file.startsWith('docs/public/playground/');

function safePath(root, file) {
  assert.ok(!path.isAbsolute(file) && !file.includes('\\') && !file.includes('\0') && !file.split('/').some(part => !part || part === '.' || part === '..'), 'Unsafe path: ' + file);
  let current = root;
  for (const part of file.split('/')) {
    current = path.join(current, part);
    try { assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Symlink is not allowed: ' + file); }
    catch (error) { if (error.code === 'ENOENT') break; throw error; }
  }
  return path.join(root, file);
}

function contents(root, file) {
  const filename = safePath(root, file);
  try { assert.ok(fs.statSync(filename).isFile(), 'Expected a regular file: ' + file); return fs.readFileSync(filename); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function patchFor(workspace, baseline, files, pending) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-card-patch-'));
  try {
    const env = {...process.env, GIT_INDEX_FILE: path.join(temporary, 'index')};
    git(workspace, ['read-tree', baseline], {env});
    git(workspace, ['add', '-A', '--', ...files], {env});
    const diff = selected => git(workspace, ['diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv', '--no-renames', baseline, '--', ...selected], {env});
    return {patch: diff(files), pendingPatch: pending.length ? diff(pending) : null};
  } finally { fs.rmSync(temporary, {recursive: true, force: true}); }
}

export function planApplication(root, task) {
  assert.match(task || '', /^[a-zA-Z0-9-]+$/, 'Supply --task with the preview task ID');
  root = fs.realpathSync(root);
  const workspace = safePath(root, '.card-design/' + task);
  safePath(workspace, '.git');
  const proposal = JSON.parse(fs.readFileSync(safePath(workspace, 'proposal.json'), 'utf8'));
  assert.equal(proposal.task, task, 'Preview task does not match its manifest');
  assert.equal(fs.realpathSync(proposal.source), root, 'Preview belongs to another source checkout');
  assert.ok(Number.isInteger(proposal.revision) && proposal.revision > 0, 'Preview needs a reviewed revision');
  const baseline = proposal.baseline || git(workspace, ['rev-parse', 'HEAD']).toString().trim();
  assert.match(baseline, /^[a-f0-9]{40}$/, 'Preview needs an independent baseline commit');
  const changed = [...new Set([...list(git(workspace, ['diff', '--name-only', '-z', baseline])), ...list(git(workspace, ['ls-files', '--others', '--exclude-standard', '-z']))])].sort();
  const files = [...new Set(proposal.review?.files || changed.filter(permitted))].sort();
  assert.ok(files.length, 'No reviewed source changes');
  const tracked = new Set(list(git(workspace, ['ls-tree', '-r', '--name-only', '-z', baseline])));
  const states = files.map(file => {
    assert.ok(permitted(file), 'Unsupported source path: ' + file);
    const before = tracked.has(file) ? git(workspace, ['show', baseline + ':' + file]) : null;
    assert.equal(digest(before), proposal.hashes[file] ?? null, 'Preview baseline hash differs; reconcile proposal.baseline: ' + file);
    const after = contents(workspace, file), current = contents(root, file);
    assert.notEqual(digest(before), digest(after), 'Selected file has no content changes: ' + file);
    return {file, before: digest(before), after: digest(after), current: digest(current)};
  });
  const tests = [...new Set(proposal.review?.tests || [])].sort();
  for (const file of tests) {
    assert.match(file, /^tests\/(?:frontend\/[^/]+\.test\.js|docs\/[^/]+\.test\.mjs)$/, 'Select existing Node unit test files, not commands');
    assert.ok(contents(workspace, file) !== null || contents(root, file) !== null, 'Missing selected test: ' + file);
  }
  const pending = states.filter(s => s.current === s.before).map(s => s.file);
  const {patch, pendingPatch} = patchFor(workspace, baseline, files, pending);
  const review = {baseline, revision: proposal.revision, files, tests};
  review.digest = digest(JSON.stringify({...review, patch: digest(patch), changeKind: proposal.changeKind, affectedConsumers: proposal.affectedConsumers, scopeDecision: proposal.scopeDecision}));
  const conflicts = states.filter(s => s.current !== s.before && s.current !== s.after).map(s => s.file);
  return {root, workspace, task, proposal, baseline, patch, pendingPatch, states, review, conflicts, excluded: changed.filter(file => !files.includes(file) && file !== 'proposal.json' && !file.startsWith('.application/'))};
}

export async function applyApplication(plan, dependencies = {}) {
  const {root, workspace, proposal, review, states} = plan;
  assert.equal(proposal.designApproved, true, 'Design approval is missing');
  assert.equal(proposal.applyAuthorized, true, 'Explicit apply authorization is missing');
  assert.ok(['shared-owner', 'family-variant', 'family-branch'].includes(proposal.changeKind), 'Record the change kind');
  assert.ok(proposal.affectedConsumers?.length && proposal.scopeDecision?.behavior && proposal.scopeDecision?.consumers && proposal.scopeDecision?.authorization, 'Record approved behavior, consumers and authorization');
  assert.equal(proposal.scopeDecision.proposalRevision, review.revision, 'Consumer scope belongs to another revision');
  assert.deepEqual(proposal.review, review, 'Review changed: inspect --plan and record its review object after authorization');
  assert.equal(plan.conflicts.length, 0, 'Source changed since preview; reconcile before applying: ' + plan.conflicts.join(', '));
  const lock = safePath(root, '.card-design/apply.lock');
  let handle;
  try { handle = fs.openSync(lock, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw Error('Another card application holds ' + lock + '. Check that operation before removing a stale lock.'); throw error; }
  let recovery;
  try {
    fs.writeFileSync(handle, JSON.stringify({task: plan.task, pid: process.pid}) + '\n');
    // Recheck after acquiring the shared deployment lock; never overwrite concurrent work.
    const current = planApplication(root, plan.task);
    assert.deepEqual(current.proposal, proposal, 'Preview authorization changed since planning');
    assert.deepEqual(current.review, review, 'Preview changed since planning');
    assert.deepEqual(current.states, states, 'Source changed since planning');
    const patch = plan.pendingPatch;
    if (patch) git(root, ['apply', '--check', '--whitespace=nowarn', '-'], {input: patch});
    recovery = safePath(workspace, '.application/' + randomUUID());
    fs.mkdirSync(recovery, {recursive: true, mode: 0o700});
    for (const state of states) {
      const before = contents(root, state.file);
      if (before !== null) {
        const backup = path.join(recovery, 'before', state.file);
        fs.mkdirSync(path.dirname(backup), {recursive: true, mode: 0o700});
        fs.writeFileSync(backup, before, {mode: 0o600});
      }
    }
    fs.writeFileSync(path.join(recovery, 'patch.diff'), plan.patch, {mode: 0o600});
    const receipt = {task: plan.task, ...review, states, status: 'prepared', installed: false};
    const save = () => {
      fs.writeFileSync(path.join(recovery, 'receipt.json.tmp'), JSON.stringify(receipt, null, 2) + '\n', {mode: 0o600});
      fs.renameSync(path.join(recovery, 'receipt.json.tmp'), path.join(recovery, 'receipt.json'));
    };
    save();
    if (patch) git(root, ['apply', '--whitespace=nowarn', '-'], {input: patch});
    receipt.status = 'applied'; save();
    const runtime = review.files.some(file => file.startsWith('frontend_src/') || file.startsWith('custom_components/marao_dashboard/frontend/'));
    const helper = runtime && (dependencies.helper || require(path.join(root, 'ha-test/prepare-frontend.js')));
    if (runtime) (dependencies.build || helper.buildEditor)(root);
    if (review.tests.length) (dependencies.check || ((files) => {
      const env = {...process.env};delete env.NODE_TEST_CONTEXT;
      execFileSync(process.execPath, ['--test', '--test-concurrency=1', ...files], {cwd: root, env, stdio: 'inherit'});
    }))(review.tests);
    receipt.status = 'checked'; save();
    for (const state of states) assert.equal(digest(contents(root, state.file)), state.after, 'Source changed before installation: ' + state.file);
    if (runtime) {
      const client = dependencies.client || require(path.join(root, 'ha-test/client.js'));
      const config = client.readConfig();
      assert.equal(new URL(config.url).hostname, '192.168.0.28', 'Only disposable 192.168.0.28 may be installed');
      helper.assertTarget(config);
      const installed = await helper.prepareFrontend(config);
      assert.equal(installed.installed, true, 'Installer did not confirm readiness');
      receipt.installed = true;
      receipt.target = new URL(config.url).hostname;
      receipt.version = installed.version;
    }
    receipt.status = 'complete'; save();
    return {...receipt, recovery, testUrl: receipt.installed ? 'http://192.168.0.28:8123/marao-dashboard' : undefined};
  } catch (error) {
    throw new Error(error.message + '\nNot installed / not ready for test. Applied source is retained; ' + (recovery ? 'recovery files: ' + recovery : 'no source writes started.'));
  } finally { fs.closeSync(handle); fs.unlinkSync(lock); }
}

async function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length >= 2 && args[0] === '--task' && args.every((arg, index) => index < 2 || arg === '--plan') && args.length <= 3, 'Usage: npm run card:apply -- --task ID [--plan]');
  const plan = planApplication(repo, args[1]);
  if (args.includes('--plan')) console.log(JSON.stringify({task: plan.task, review: plan.review, conflicts: plan.conflicts, excluded: plan.excluded}, null, 2));
  else console.log(JSON.stringify(await applyApplication(plan), null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {console.error(error.message); process.exitCode = 1;});
