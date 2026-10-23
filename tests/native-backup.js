// Exact private recovery for the disposable instance, using its existing POSIX
// tools. The SSH add-on need not install Python or any other runtime.
const assert = require('node:assert/strict');
const { ssh } = require('../ha-test/prepare');
const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";

function nativeBackup(config, operation, paths, { run = ssh } = {}) {
  assert.equal(new URL(config.url).hostname, '192.168.0.28');
  assert.match(operation, /^[a-f0-9-]{36}$/);
  for (const file of paths) assert.ok(file && !file.startsWith('/') && !file.split('/').includes('..'));
  const root = config.remoteConfigPath;
  const directory = root + '/.marao-native-backups/' + operation;
  const marker = root + '/.marao-native-active';
  const scanCommand = selected => 'cd ' + quote(root) + ' && ' + selected.map(relative => {
    const file = quote(relative);
    return '(if test -L ' + file + '; then exit 1; elif test -f ' + file + '; then printf "FILE %s\\n" ' + file + '; sha256sum ' + file +
      '; elif test -d ' + file + '; then test -z "$(find ' + file + ' -type l)" || exit 1; printf "DIR %s\\n" ' + file +
      '; find ' + file + ' -type f ! -name "*.pyc" ! -name "*.pyo" ! -path "*/__pycache__/*" | sort | while IFS= read -r item; do sha256sum "$item" || exit 1; done; else printf "MISSING %s\\n" ' + file + '; fi)';
  }).join(' && ');
  function scan(selected = paths) {
    const raw = run(config, scanCommand(selected)).stdout;
    const files = {};
    let relative, type;
    for (const line of raw.trim().split('\n')) {
      const header = line.match(/^(FILE|DIR|MISSING) (.+)$/);
      if (header) { [, type, relative] = header; files[relative] = type === 'MISSING' ? null : {}; continue; }
      const hash = line.match(/^([a-f0-9]{64})  (.+)$/);
      assert.ok(hash && relative, 'Unrecognized disposable snapshot');
      files[relative][type === 'FILE' ? '' : hash[2].slice(relative.length + 1)] = hash[1];
    }
    return { files, raw };
  }
  let baseline;
  return request => {
    if (request.mode === 'backup') {
      const before = scan();
      const present = paths.filter(relative => before.files[relative] !== null);
      run(config, 'umask 077 && test ! -e ' + quote(marker) + ' && mkdir -p ' + quote(directory) + ' && chmod 700 ' + quote(root + '/.marao-native-backups') + ' && ' +
        'tar -C ' + quote(root) + ' -cf ' + quote(directory + '/baseline.tar') + ' ' + present.map(quote).join(' ') + ' && printf %s ' + quote(operation) + ' > ' + quote(marker));
      baseline = before.files;
      assert.deepEqual(scan().files, baseline, 'Disposable state changed during exact backup');
      run(config, 'umask 077 && cat > ' + quote(directory + '/baseline.json'), { input: JSON.stringify(baseline) });
      return baseline;
    }
    assert.equal(run(config, 'cat ' + quote(marker)).stdout, operation, 'Recovery identity changed');
    if (request.mode === 'snapshot') return scan(request.paths);
    if (request.mode === 'restore') {
      baseline ||= JSON.parse(run(config, 'cat ' + quote(directory + '/baseline.json')).stdout);
      assert.deepEqual(Object.keys(baseline), paths, 'Recovery path set changed');
      const current = scan(); assert.deepEqual(current.files, request.expected, 'Concurrent disposable change; retain recovery backup');
      run(config, 'umask 077 && cat > ' + quote(directory + '/expected.scan'), { input: current.raw });
      const stage = directory + '/restore-stage';
      const commands = ['(' + scanCommand(paths) + ') > ' + quote(directory + '/current.scan'),
        'cmp ' + quote(directory + '/expected.scan') + ' ' + quote(directory + '/current.scan'),
        'mkdir ' + quote(stage), 'tar -C ' + quote(stage) + ' -xpf ' + quote(directory + '/baseline.tar')];
      for (const relative of paths) {
        const destination = quote(root + '/' + relative), saved = quote(stage + '/' + relative), previous = quote(directory + '/previous/' + relative);
        commands.push('mkdir -p ' + quote(directory + '/previous/' + require('node:path').posix.dirname(relative)));
        commands.push('if test -e ' + destination + '; then mv ' + destination + ' ' + previous + '; fi');
        if (baseline[relative] !== null) commands.push('mv ' + saved + ' ' + destination);
      }
      run(config, commands.join(' && '));
      assert.deepEqual(scan().files, baseline, 'Exact disposable restoration failed; retain recovery backup');
      return baseline;
    }
    if (request.mode === 'finish') {
      baseline ||= JSON.parse(run(config, 'cat ' + quote(directory + '/baseline.json')).stdout);
      assert.deepEqual(scan().files, baseline);
      run(config, 'rm ' + quote(marker));
      return { verified_cleanup: true };
    }
    throw Error('Unsupported native backup operation');
  };
}

module.exports = { nativeBackup };
