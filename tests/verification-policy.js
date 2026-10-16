const geometryProfiles = ['iphone-normal', 'android-normal', 'narrow-320', 'iphone-landscape', 'android-landscape', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'];
const reviewed = new Set(['slider-headers', 'access-label', 'battery-groups', 'editor-rendering', 'control-grid']);

function profileOf(check) {
  const index = check.command.indexOf('--scenario');
  return index >= 0 ? check.command[index + 1] : check.command.find(arg => arg.startsWith('--scenario='))?.split('=')[1] || 'iphone-normal';
}

function factorChecks(checks, { full = false } = {}) {
  if (full) return checks;
  const visits = new Map();
  for (const original of checks) {
    if (original.id === 'editor-rendering:alignment' && checks.some(check => check.id === 'editor-rendering:narrow-320')) continue;
    const family = original.id.split(':')[0], profile = profileOf(original);
    const gallery = original.command.includes('tests/test-ha-ui-batch.js') || original.command.includes('tests/test-ha-card-alignment.js') && original.command.some(arg => ['--access-label', '--slider-headers', '--control-grid'].includes(arg));
    const factored = original.kind === 'browser' && reviewed.has(family) && (gallery || original.command.includes('tests/test-ha-editor.js'));
    if (!factored) { visits.set(original.id, original); continue; }
    const geometry = geometryProfiles.includes(original.id.split(':').at(-1));
    for (const theme of geometry && profile === 'iphone-normal' ? ['light', 'dark'] : ['light']) {
      const dimensions = theme === 'dark' ? ['appearance'] : geometry ? ['geometry', ...(profile === 'iphone-normal' ? ['appearance', 'behavior'] : [])] : ['behavior'];
      const condition = { profile, theme, engine: 'chromium', route: gallery ? '/marao-dashboard/card-test' : '/marao-dashboard-editor',
        dimensions, ...(gallery && profile === 'iphone-normal' && family === 'slider-headers' ? { routes: ['/marao-dashboard/card-test', '/marao-dashboard/living-room', '/marao-dashboard/native-example'] } : {}), ...(gallery && ['iphone-normal', 'iphone-bold-text-200'].includes(profile) && family === 'control-grid' ? { routes: ['/marao-dashboard/card-test', '/marao-dashboard/studio', '/marao-dashboard/native-example'] } : {}), themeIndependent: true, equivalence: 'Reviewed shared geometry and behavior; both-theme appearance retained at iphone-normal.', coldLoad: true };
      const logical = { id: original.id + ':' + theme, assertion: family, ...condition,
        ...(original.id === 'editor-rendering:narrow-320' ? { aliases: ['editor-rendering:alignment'] } : {}) };
      const id = gallery ? 'gallery:' + profile + ':' + theme : original.id + (theme === 'dark' ? ':appearance' : '');
      const command = gallery ? ['node', 'tests/test-ha-ui-batch.js', '--scenario', profile, '--theme', theme, '--screenshots', ['iphone-normal', 'narrow-320', 'iphone-bold-text-200'].includes(profile) ? 'review' : 'failure']
        : [...original.command, '--theme=' + theme, '--screenshots=' + (['iphone-normal', 'narrow-320', 'iphone-bold-text-200'].includes(profile) ? 'review' : 'failure')];
      const flag = { 'slider-headers': '--slider-headers', 'access-label': '--access', 'battery-groups': '--battery', 'control-grid': '--control-grid' }[family];
      if (gallery) { command.push(flag); if (profile !== 'iphone-normal' || theme === 'dark') command.push('--geometry-only'); }
      if (!gallery && theme === 'dark') {
        command.splice(2, command.length - 2, '--rendering-geometry', '--drag-geometry', '--scenario=iphone-normal', '--theme=dark', '--screenshots=review');
      }
      const previous = visits.get(id);
      if (previous) {
        previous.cases.push(logical); previous.command.push(...command.filter(arg => ['--battery', '--access', '--slider-headers', '--control-grid'].includes(arg) && !previous.command.includes(arg)));
        previous.inputs = [...new Set([...previous.inputs, ...original.inputs])];
      } else visits.set(id, { ...original, id, command, cases: [logical], ...(gallery ? { inputs: [...original.inputs, 'tests/test-ha-ui-batch.js', 'tests/test-ha-card-alignment.js', 'tests/control-grid-checks.js'] } : {}) });
    }
  }
  return [...visits.values()];
}

function captureSelected(policy, profile, { failure = false, representative = true } = {}) {
  if (!['failure', 'review', 'all'].includes(policy)) throw new Error('Unknown screenshot policy');
  return failure || policy === 'all' || policy === 'review' && representative && ['iphone-normal', 'narrow-320', 'iphone-bold-text-200'].includes(profile);
}
module.exports = { captureSelected, factorChecks, geometryProfiles, profileOf };
