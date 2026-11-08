import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {planApplication, applyApplication} from '../../docs/scripts/apply-card-design.mjs';

const file = 'custom_components/marao_dashboard/frontend/Example.js';
const testFile = 'tests/frontend/example.test.js';
const hash = text => createHash('sha256').update(text).digest('hex');
const git = (root, ...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'});
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marao-apply-test-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const workspace = path.join(root, '.card-design', 'test-task');
  const write = (base, name, text) => {const dest = path.join(base, name); fs.mkdirSync(path.dirname(dest), {recursive: true}); fs.writeFileSync(dest, text);};
  for (const base of [root, workspace]) {
    fs.mkdirSync(base, {recursive: true});
    git(base, 'init', '-q');
    write(base, '.gitignore', '.card-design/\n');
    write(base, file, 'export const height = 150;\n');
    write(base, testFile, '// existing targeted test\n');
    git(base, 'add', '.');
    git(base, '-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Test', '-c', 'user.email=test@localhost', 'commit', '-qm', 'Baseline');
  }
  const proposal = {task: 'test-task', source: root, revision: 1, changeKind: 'family-variant', affectedConsumers: ['Example and owned popup'], scopeDecision: {behavior: 'Compact card', consumers: 'Example and owned popup', proposalRevision: 1, authorization: 'User: apply'}, designApproved: true, applyAuthorized: true, hashes: {[file]: hash('export const height = 150;\n'), [testFile]: hash('// existing targeted test\n')}};
  write(workspace, file, 'export const height = 140;\n');
  const save = () => write(workspace, 'proposal.json', JSON.stringify(proposal));
  const plan = () => {save(); return planApplication(root, 'test-task');};
  const approve = () => {proposal.review = plan().review; save(); return planApplication(root, 'test-task');};
  const events = [];
  const dependencies = {build: () => events.push('build'), check: files => events.push(['check', ...files]), client: {readConfig: () => ({url: 'http://192.168.0.28:8123'})}, helper: {assertTarget: config => assert.equal(new URL(config.url).hostname, '192.168.0.28'), prepareFrontend: async () => {events.push('install');return {installed: true, version: 'current-assets', config: {token: 'must-never-be-saved'}};}}};
  return {root, workspace, write, proposal, plan, approve, dependencies, events};
}

test('plan is read-only; apply preserves staging and unrelated work, adds/deletes files and records verified installation', async t => {
  const f = fixture(t), added = 'docs/examples/new.js', deleted = 'docs/examples/old.js';
  for (const base of [f.root, f.workspace]) {
    f.write(base, deleted, 'old example\n');git(base, 'add', deleted);
    git(base, '-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Test', '-c', 'user.email=test@localhost', 'commit', '-qm', 'Existing example');
  }
  f.proposal.hashes[deleted] = hash('old example\n');
  fs.unlinkSync(path.join(f.workspace, deleted));f.write(f.workspace, added, 'new example\n');
  f.write(f.root, 'unrelated.txt', 'staged work\n');git(f.root, 'add', 'unrelated.txt');f.write(f.root, 'unrelated.txt', 'unstaged work\n');
  const staging = git(f.root, 'diff', '--cached', '--binary'), before = fs.readFileSync(path.join(f.root, file), 'utf8');
  f.proposal.review = {files: [file, added, deleted], tests: [testFile]};
  const p = f.plan();assert.equal(fs.readFileSync(path.join(f.root, file), 'utf8'), before);assert.equal(git(f.root, 'diff', '--cached', '--binary'), staging);
  f.proposal.review = p.review;
  const result = await applyApplication(f.plan(), f.dependencies);
  assert.deepEqual(f.events, ['build', ['check', testFile], 'install']);assert.equal(result.installed, true);
  assert.equal(fs.readFileSync(path.join(f.root, file), 'utf8'), 'export const height = 140;\n');
  assert.equal(fs.readFileSync(path.join(f.root, added), 'utf8'), 'new example\n');assert.equal(fs.existsSync(path.join(f.root, deleted)), false);
  assert.equal(fs.readFileSync(path.join(f.root, 'unrelated.txt'), 'utf8'), 'unstaged work\n');assert.equal(git(f.root, 'diff', '--cached', '--binary'), staging);
  assert.equal(fs.readFileSync(path.join(result.recovery, 'before', deleted), 'utf8'), 'old example\n');
  assert.doesNotMatch(fs.readFileSync(path.join(result.recovery, 'receipt.json'), 'utf8'), /must-never-be-saved|token/);
  const retry = await applyApplication(f.plan(), f.dependencies);assert.equal(retry.installed, true, 'Already applied sources can retry installation');
});

test('apply refuses missing approval, stale reviewed content/scope and destination drift before writes', async t => {
  const f = fixture(t);f.approve();
  f.proposal.applyAuthorized = false;await assert.rejects(applyApplication(f.plan(), f.dependencies), /authorization/);f.proposal.applyAuthorized = true;
  f.write(f.workspace, file, 'export const height = 130;\n');await assert.rejects(applyApplication(f.plan(), f.dependencies), /Review changed/);
  f.approve();f.proposal.scopeDecision.consumers = 'Another family';await assert.rejects(applyApplication(f.plan(), f.dependencies), /Review changed/);
  f.approve();f.write(f.root, file, 'Concurrent source\n');await assert.rejects(applyApplication(f.plan(), f.dependencies), /Source changed since preview/);
  assert.deepEqual(f.events, []);assert.equal(fs.readFileSync(path.join(f.root, file), 'utf8'), 'Concurrent source\n');
});

test('failed checks prevent installation and retain source backups; the lock serializes tasks', async t => {
  const f = fixture(t);f.proposal.review = {files: [file], tests: [testFile]};const p = f.approve();
  fs.writeFileSync(path.join(f.root, '.card-design/apply.lock'), 'busy');await assert.rejects(applyApplication(p, f.dependencies), /Another card application/);fs.unlinkSync(path.join(f.root, '.card-design/apply.lock'));
  await assert.rejects(applyApplication(f.plan(), {...f.dependencies, check() {throw Error('Targeted assertion failed');}}), /Targeted assertion failed[\s\S]*Not installed \/ not ready for test[\s\S]*recovery files/);
  assert.deepEqual(f.events, ['build']);assert.equal(fs.existsSync(path.join(f.root, '.card-design/apply.lock')), false);
  const saved = fs.readdirSync(path.join(f.workspace, '.application'))[0];assert.equal(fs.readFileSync(path.join(f.workspace, '.application', saved, 'before', file), 'utf8'), 'export const height = 150;\n');
});

test('installation failure is never recorded as completion', async t => {
  const f = fixture(t);const p = f.approve();
  f.dependencies.helper.prepareFrontend = async () => {throw Error('Served asset is stale');};
  await assert.rejects(applyApplication(p, f.dependencies), /Served asset is stale[\s\S]*Not installed \/ not ready for test/);
  const saved = fs.readdirSync(path.join(f.workspace, '.application'))[0];const receipt = JSON.parse(fs.readFileSync(path.join(f.workspace, '.application', saved, 'receipt.json')));
  assert.equal(receipt.installed, false);assert.notEqual(receipt.status, 'complete');
});

test('unsafe paths, arbitrary test commands and symlinked sources are rejected', t => {
  const f = fixture(t);
  for (const name of ['../escape.js', 'docs/../escape.js', 'ha-test/local.json', 'docs/node_modules/escape.js']) {f.proposal.review = {files: [name]};assert.throws(f.plan);}
  f.proposal.review = {files: [file], tests: ['--eval=unsafe']};assert.throws(f.plan, /unit test files/);
  f.proposal.review = {files: [file], tests: []};fs.unlinkSync(path.join(f.workspace, file));fs.symlinkSync('/missing-private-file', path.join(f.workspace, file));assert.throws(f.plan, /Symlink/);
});

test('documentation-only application runs the selected actual check and skips build/install', async t => {
  const f = fixture(t), doc = 'docs/example.md', check = 'tests/docs/document.test.mjs';
  f.write(f.workspace, doc, 'Approved documentation\n');
  f.write(f.workspace, check, "import fs from 'node:fs'; import assert from 'node:assert/strict'; assert.equal(fs.readFileSync('docs/example.md', 'utf8'), 'Approved documentation\\n'); fs.writeFileSync('checked.txt', 'ran');\n");
  f.proposal.review = {files: [doc, check], tests: [check]};
  const {check: unused, ...dependencies} = f.dependencies;
  const result = await applyApplication(f.approve(), dependencies);
  assert.equal(result.status, 'complete');assert.equal(result.installed, false);assert.deepEqual(f.events, []);
  assert.equal(fs.readFileSync(path.join(f.root, 'checked.txt'), 'utf8'), 'ran');
  assert.equal(fs.readFileSync(path.join(f.root, doc), 'utf8'), 'Approved documentation\n');
});

test('revoked authorization, a changed destination after planning and a different HA target are refused', async t => {
  const f = fixture(t);let p = f.approve();f.proposal.applyAuthorized = false;f.plan();
  await assert.rejects(applyApplication(p, f.dependencies), /authorization changed/);f.proposal.applyAuthorized = true;
  p = f.approve();f.write(f.root, file, 'Later concurrent edit\n');await assert.rejects(applyApplication(p, f.dependencies), /Source changed since planning/);
  f.write(f.root, file, 'export const height = 150;\n');p = f.approve();
  f.dependencies.client.readConfig = () => ({url: 'http://192.168.0.99:8123'});
  await assert.rejects(applyApplication(p, f.dependencies), /Only disposable 192.168.0.28/);assert.deepEqual(f.events, ['build']);
});
