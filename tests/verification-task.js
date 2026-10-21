const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { privateFile } = require('./verification-reuse');

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function relativeFile(file) {
  assert.ok(typeof file === 'string' && file && !path.isAbsolute(file)
    && file.split('/').every(part => part && part !== '.' && part !== '..') && !/[\\\0]/.test(file), 'Use repository-relative file paths');
  return file;
}

function fileHashes(root) {
  root = fs.realpathSync(root);
  const names = [...new Set(git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))].sort();
  const files = {};
  for (const name of names) {
    const filename = path.join(root, relativeFile(name));
    let stat;
    try { stat = fs.lstatSync(filename); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    assert.ok(fs.realpathSync(path.dirname(filename)).startsWith(root + path.sep) || path.dirname(filename) === root, 'Task input escaped repository: ' + name);
    assert.ok(stat.isFile() || stat.isSymbolicLink(), 'Unsupported task input: ' + name);
    files[name] = digest(stat.isSymbolicLink() ? 'symlink\0' + fs.readlinkSync(filename) : fs.readFileSync(filename));
  }
  return files;
}

function writeSnapshot(filename, root) {
  assert.ok(path.isAbsolute(filename), 'Task snapshot requires an absolute private path');
  root = fs.realpathSync(root);
  const destination = path.join(fs.realpathSync(path.dirname(filename)), path.basename(filename));
  if (destination.startsWith(root + path.sep)) {
    try { git(root, ['check-ignore', '--quiet', '--no-index', '--', path.relative(root, destination)]); }
    catch { throw new Error('Store task snapshots outside the repository or in an ignored directory'); }
  }
  const snapshot = { version: 1, kind: 'marao-task-baseline', root,
    head: git(root, ['rev-parse', '--verify', 'HEAD^{commit}']).trim(), files: fileHashes(root) };
  fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  return snapshot;
}

function changesSince(filename, root) {
  root = fs.realpathSync(root);
  const snapshot = JSON.parse(privateFile(filename));
  assert.equal(snapshot.version, 1, 'Unsupported task snapshot');
  assert.equal(snapshot.kind, 'marao-task-baseline', 'Not a task snapshot');
  assert.equal(snapshot.root, root, 'Task snapshot belongs to another repository');
  assert.match(snapshot.head || '', /^[a-f0-9]{40,64}$/, 'Invalid task starting commit');
  assert.ok(snapshot.files && typeof snapshot.files === 'object' && !Array.isArray(snapshot.files), 'Invalid task file identities');
  for (const [file, hash] of Object.entries(snapshot.files)) {
    relativeFile(file); assert.match(hash, /^[a-f0-9]{64}$/, 'Invalid task file hash');
  }
  const current = fileHashes(root);
  return { base: snapshot.head, baseRef: 'task snapshot', head: git(root, ['rev-parse', '--verify', 'HEAD^{commit}']).trim(),
    task_scope: true, files: [...new Set([...Object.keys(snapshot.files), ...Object.keys(current)])]
      .filter(file => snapshot.files[file] !== current[file]).sort() };
}

function reviewedFiles(comparison, files) {
  if (!files?.length) return comparison;
  const selected = [...new Set(files.map(relativeFile))].sort();
  for (const file of selected) assert.ok(comparison.files.includes(file), 'Reviewed file is not changed in this scope: ' + file);
  return { ...comparison, task_scope: true, files: selected,
    omitted_changed_files: [...new Set([...(comparison.omitted_changed_files || []), ...comparison.files.filter(file => !selected.includes(file))])].sort() };
}

module.exports = { changesSince, fileHashes, relativeFile, reviewedFiles, writeSnapshot };
