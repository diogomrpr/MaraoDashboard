const fs = require('node:fs');
const path = require('node:path');

const runtime = 'custom_components/marao_dashboard/frontend/';
const backend = 'custom_components/marao_dashboard/';
const unit = (file, pattern) => ({ id: 'unit:' + file + (pattern ? ':' + pattern : ''), kind: 'offline',
  command: ['node', '--test', '--test-concurrency=1', ...(pattern ? ['--test-name-pattern', pattern] : []), 'tests/frontend/' + file + '.test.js'],
  inputs: ['tests/frontend/' + file + '.test.js', 'tests/frontend/package.json', runtime, 'frontend_src',
    ...(file === 'accessibility-profiles' ? ['tests/test-ha-dashboard-accessibility.js'] : []),
    ...(/verification|upgrade|release-gate/.test(file) ? ['ha-test', 'tests/verify-release.js', 'tests/verify-publish.js', 'tests/test-ha-upgrade.js', 'tests/verification-browser.js', 'tests/native-reconnect-exception.js'] : [])], exclusive: false });
const python = file => ({ id: 'python:' + file, kind: 'offline', command: ['python', '-m', 'pytest', '-q', 'tests/components/marao_dashboard/' + file + '.py'],
  inputs: ['tests/components/marao_dashboard/' + file + '.py', backend, 'tests/conftest.py', 'pyproject.toml'], exclusive: false });
const browser = (id, file, args = [], exclusive = true) => ({ id, kind: 'browser', command: ['node', 'tests/' + file + '.js', ...args],
  inputs: [runtime, 'tests/' + file + '.js', 'tests/test-ha-dashboard-accessibility.js', 'tests/test-ha-dashboard-e2e.js', 'ha-test',
    ...(['test-ha-editor', 'test-ha-card-alignment'].includes(file) ? ['tests/test-ha-editor.js', 'tests/json-editor-checks.js', 'tests/editor-drag-checks.js'] : [])], exclusive });
const families = {
  security: ['hc_security_card', 'hc_alarm_controls_card', 'hc_access_slide_action_card', 'hc_access_card'],
  slider: ['hc_light_card', 'hc_fan_card', 'hc_cover_card'],
  popup: ['hc_media_card', 'hc_climate_card', 'hc_entity_group_card', 'hc_access_card'],
  rooms: ['hc_room_card'], groups: ['hc_entity_group_card'], climate: ['hc_climate_card', 'hc_number_card', 'hc_wallbox_current_card'],
  camera: ['hc_camera_card'], history: ['hc_graph_card', 'hc_timeline_card', 'hc_toggle_graph_card'],
};
const components = {
  'json-editor': { units: [['json-editor'], ['editor-model'], ['canonical-page-model'], ['editor-panel']], editor: true,
    browser: [browser('json-alignment', 'test-ha-card-alignment', ['--json-editor']),
      ...['iphone-normal', 'android-normal', 'narrow-320', 'iphone-landscape', 'android-landscape', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'].map(profile =>
      browser('json-editor:' + profile, 'test-ha-editor', ['--json-tools', '--scenario=' + profile, ...(profile === 'iphone-normal' ? ['--json-save', '--startup', '--portuguese'] : [])]))],
  },
  native: { units: [['marao-native'], ['native-backup']], python: ['test_native'], editor: true,
    templates: [...Object.values(families).flat(), 'hc_weather_card', 'hc_scene_collection_card', 'hc_access_hold_action_card', 'hc_access_action_card', 'hc_header_card', 'hc_glance_card', 'hc_scene_card', 'hc_number_card', 'hc_wallbox_current_card', 'hc_vacuum_card', 'hc_dishwasher_card', 'hc_washing_machine_card', 'hc_sensor_card', 'hc_switch_card', 'hc_battery_card', 'hc_navigation_card', 'hc_energy_period_card', 'hc_media_app_card', 'hc_title_card', 'hc_base_card'],
    profiles: ['iphone-normal', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200', 'narrow-320', 'iphone-landscape', 'android-normal', 'android-landscape'],
    browser: [browser('native-editor', 'test-ha-native', ['--scenario', 'iphone-normal'])] },
  security: { units: [['marao-security']], python: ['test_security'], templates: [...families.security, 'hc_dishwasher_card', 'hc_vacuum_card'],
    profiles: ['iphone-normal', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200', 'narrow-320', 'iphone-landscape', 'android-normal', 'android-landscape'],
    browser: [browser('security:iphone', 'test-ha-security', ['--scenario', 'iphone-normal']), browser('security:android', 'test-ha-security', ['--scenario', 'android-normal'])] },
  labels: { units: [['marao-text-scale'], ['marao-card-visibility']], profiles: ['iphone-normal', 'narrow-320', 'iphone-bold-text-200'] },
  slider: { units: [['marao-climate-card', 'slider|brightness|percentage|cover']], consumers: ['light', 'fan', 'cover'],
    browser: [browser('sliders:iphone', 'test-ha-value-sliders', ['--scenario', 'iphone-normal']), browser('sliders:android', 'test-ha-value-sliders', ['--scenario', 'android-normal'])] },
  light: { units: [['marao-climate-card', 'light|brightness']], templates: ['hc_light_card'] },
  fan: { units: [['marao-climate-card', 'fan|percentage']], templates: ['hc_fan_card'] },
  cover: { units: [['marao-climate-card', 'cover|position']], templates: ['hc_cover_card'] },
  popup: { units: [['marao-navbar-card'], ['marao-climate-card', 'popup|focus|inert']], profiles: ['iphone-normal', 'iphone-landscape', 'narrow-320'], popups: true },
  navbar: { units: [['marao-navbar-card']], profiles: ['iphone-normal', 'iphone-landscape', 'narrow-320'], browser: [browser('safe-area', 'test-ha-dashboard-accessibility', ['--safe-area'])] },
  actions: { units: [['marao-climate-card', 'action|hold|slide|dispatch|disabled|unavailable']],
    browser: [browser('actions', 'test-ha-dashboard-e2e', ['--actions-only'])] },
  connection: { units: [['marao-climate-card', 'connection|disconnected|unavailable'], ['dashboard-e2e-analysis']], browser: [browser('native-reconnect', 'test-ha-dashboard-e2e', ['--disconnect-only'])] },
  rooms: { units: [['marao-climate-card', 'room']], browser: [browser('rooms', 'test-ha-room-cards', ['--scenario', 'iphone-normal'])] },
  groups: { units: [['marao-climate-card', 'group']], browser: [browser('groups', 'test-ha-dashboard-e2e', ['--groups-only'])] },
  climate: { units: [['marao-climate-card', 'climate|number|stepper|wallbox']], browser: [browser('climate', 'test-ha-dashboard-e2e', ['--climate-only']), browser('numbers', 'test-ha-climate-layout', ['--scenario', 'iphone-normal'])] },
  camera: { units: [['marao-frigate-events-card']], browser: [browser('camera', 'test-ha-dashboard-e2e', ['--camera-only'])] },
  history: { units: [['marao-history-cards']], browser: [browser('history', 'test-ha-dashboard-e2e', ['--history-only'])] },
  energy: { units: [['marao-energy-format']], browser: [browser('energy', 'test-ha-energy-format', ['--scenario', 'iphone-normal'])] },
  'editor-drag': { units: [['editor-drag'], ['canonical-page-model'], ['editor-panel']], python: ['test_page_generation', 'test_page_migration'], editor: true,
    browser: [browser('editor-drag:iphone-normal', 'test-ha-editor', ['--drag', '--drag-save', '--scenario=iphone-normal']),
      browser('editor-drag:android-normal', 'test-ha-editor', ['--drag', '--portuguese', '--scenario=android-normal']),
      browser('editor-drag:alignment', 'test-ha-card-alignment', ['--editor-drag']),
      ...['narrow-320', 'iphone-landscape', 'android-landscape', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'].map(profile => browser('editor-drag:' + profile, 'test-ha-editor', ['--drag-geometry', '--scenario=' + profile]))] },
  'editor-model': { units: [['editor-model'], ['page-manager-model'], ['canonical-page-model']] },
  'editor-ui': { units: [['editor-panel']], browser: [browser('editor', 'test-ha-editor', ['--scenario=iphone-normal', '--header'])], editor: true },
  generator: { python: ['test_generator', 'test_page_generation'], upgrade: true },
  migration: { python: ['test_page_migration', 'test_native_storage_migration', 'test_release_replay_recovery', 'test_upgrade_fixtures'], upgrade: true },
  lifecycle: { python: ['test_init', 'test_config_flow', 'test_config_patch'], upgrade: true },
  'saved-history': { python: ['test_history'], upgrade: true },
  packaging: { units: [['package-boundary'], ['brand-assets']], package: true },
  gallery: { units: [['gallery-cases']], python: ['test_gallery_fixtures'] },
  verification: { units: [['verification'], ['verification-browser'], ['verification-evidence'], ['accessibility-profiles'], ['upgrade-prepared'], ['upgrade-runner'], ['release-gate']],
    browser: [browser('tooling-layout', 'test-ha-dashboard-accessibility', ['--focused', '--families', 'hc_light_card', '--scenario', 'iphone-normal', '--screenshots', 'review', '--popups', '--popup-hash', '#marao-dashboard-test-value-sliders-popup'], false),
      browser('tooling-actions', 'test-ha-dashboard-e2e', ['--toggle-only'])] },
  docs: {},
  'verification-map': { units: [['verification']] },
};

const rules = [
  [/^tests\/verification-map\.js$/, ['verification-map']],
  [/^tests\/editor-drag-checks\.js$/, ['editor-drag']],
  [/^frontend_src\/editor-drag\.js$/, ['editor-drag']],
  [/^tests\/json-editor-checks\.js$/, ['json-editor']],
  [/^tests\/test-ha-card-alignment\.js$/, ['json-editor']],
  [/^tests\/test-ha-editor\.js$/, ['editor-ui', 'json-editor']],
  [/^frontend_src\/json-/, ['json-editor']],
  [/^frontend_src\/panel\.css$/, ['editor-ui', 'json-editor']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoDashboardJsonEditor\./, ['json-editor']],
  [/^tests\/test-ha-native\.js$/, ['native']],
  [/^tests\/native-backup\.js$/, ['native', 'verification']],
  [/^ha-test\/native-cases\.js$/, ['native', 'gallery']],
  [/^frontend_src\/(native-model|MaraoNativeCards|MaraoNativeCardEditor)\.js$/, ['native']],
  [/^frontend_src\/editor-labels\.js$/, 'editor-labels'],
  [/^frontend_src\/native-labels\.js$/, ['native']],
  // Generated entry changes are checked for reproducibility; native source rules select behavior checks.
  [/^custom_components\/marao_dashboard\/frontend\/MaraoNative(?:Cards|CardEditor)\.js$/, ['packaging']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoNative/, ['native', 'packaging']],
  [/^custom_components\/marao_dashboard\/native\.py$/, ['native', 'generator', 'lifecycle', 'migration']],
  [/^tests\/test-ha-security\.js$/, ['security']],
  [/^(AGENTS\.md|README\.md|docs\/|openspec\/|\.agents\/)/, ['docs']],
  [/^tests\/frontend\/([^/]+)\.test\.js$/, 'test'],
  [/^tests\/components\/marao_dashboard\/(test_[^/]+)\.py$/, 'test'],
  [/^tests\/(verification|test-ha-|verify-|native-reconnect|mobile-devices|upgrade)|^ha-test\/(prepared-batch|upgrade)/, ['verification']],
  [/^frontend_src\/editor-model\.js$/, ['editor-model']],
  [/^frontend_src\/(MaraoDashboardPanel\.js|panel\.css)/, ['editor-ui']],
  [/^frontend_src\/(build-|json-editor)/, ['packaging', 'editor-ui']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoDashboardPanel\./, ['editor-ui']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoCards\.js$/, 'shared'],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoDashboard\.js$/, 'shared'],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoFrigateEventsCard\.js$/, ['camera']],
  [/^custom_components\/marao_dashboard\/frontend\/themes\//, ['labels', 'slider', 'popup', 'navbar', 'rooms']],
  [/^custom_components\/marao_dashboard\/frontend\/(brand|icons|MaraoDashboardJson)/, ['packaging', 'editor-ui']],
  [/^custom_components\/marao_dashboard\/translations\//, ['labels', 'editor-ui']],
  [/^custom_components\/marao_dashboard\/(generator|editor)\.py$/, ['generator', 'editor-model']],
  [/^custom_components\/marao_dashboard\/(page_migration|page_model|native_storage|legacy_migration|migration|operation|recovery).*\.py$/, ['migration']],
  [/^custom_components\/marao_dashboard\/(history)\.py$/, ['saved-history']],
  [/^custom_components\/marao_dashboard\/(__init__|config_flow|config_patch|const)\.py$/, ['lifecycle']],
  [/^custom_components\/marao_dashboard\/(manifest\.json|strings\.json)|^(hacs\.json|package(-lock)?\.json)$/, ['packaging']],
  [/^\.github\/workflows\//, ['verification']],
  [/^ha-test\/(client|prepare)\.js$/, ['verification']],
  [/^ha-test\//, ['gallery']],
  [/^(pyproject\.toml|tests\/(conftest\.py|coverage_bootstrap\.py|requirements\.txt))$/, ['lifecycle']],
  [/^(\.gitignore|LICENSE|mkdocs\.yml|\.prettier.*|\.editorconfig)$/, ['docs']],
];

function selectComponents(files, declared = [], { conservativeShared = false } = {}) {
  const selected = new Set(declared), reasons = {}, directTests = [];
  for (const id of declared) if (!components[id]) throw new Error('Unknown component: ' + id);
  for (const file of files) {
    const rule = rules.find(([pattern]) => pattern.test(file));
    if (!rule) throw new Error('Unmapped changed file: ' + file + '. Add its component/check mapping.');
    let ids = rule[1];
    // Reviewed additive movement labels have no native-card consumer. Other label edits retain both consumers.
    if (ids === 'editor-labels') ids = declared.includes('editor-drag') && !declared.includes('native') ? ['editor-ui', 'editor-drag'] : ['native', 'editor-ui'];
    if (ids === 'shared') {
      if (!declared.length && !conservativeShared) throw new Error(file + ': declare --component after reviewing the shared-component diff.');
      const consumers = ['native', 'security', 'labels', 'slider', 'light', 'fan', 'cover', 'popup', 'navbar', 'actions', 'connection', 'rooms', 'groups', 'climate', 'history', 'energy', 'camera'];
      ids = declared.length ? declared.filter(id => consumers.includes(id)) : consumers;
      if (!ids.length) throw new Error(file + ': a runtime component is required; documentation scope cannot omit its checks.');
    }
    if (ids === 'test') {
      const name = file.match(rule[0])[1];
      directTests.push(file.endsWith('.js') ? unit(name) : python(name));
      continue;
    }
    for (const id of ids) { selected.add(id); (reasons[id] ||= []).push(file); }
  }
  for (const id of selected) for (const consumer of components[id].consumers || []) {
    selected.add(consumer); (reasons[consumer] ||= []).push('shared consumer of ' + id);
  }
  return { components: [...selected].sort(), reasons, directTests };
}

function checksFor(selection, { full = false, offline = false, parallel = false } = {}) {
  const result = new Map();
  const add = check => { if (!offline || check.kind === 'offline') result.set(check.id, check); };
  if (full) {
    add({ id: 'all-frontend', kind: 'offline', command: ['node', '--test', '--test-concurrency=' + (parallel ? 3 : 1), ...fs.readdirSync(path.join(__dirname, 'frontend')).filter(file => file.endsWith('.test.js')).sort().map(file => 'tests/frontend/' + file)], inputs: ['tests/frontend', runtime, 'frontend_src'], exclusive: false });
    add({ id: 'all-python', kind: 'offline', command: ['python', '-m', 'pytest', '-q', 'tests/components/marao_dashboard'], inputs: [backend, 'tests/components', 'tests/conftest.py', 'pyproject.toml'], exclusive: false });
  }
  const ids = full ? Object.keys(components) : selection.components;
  for (const id of ids) {
    const component = components[id];
    if (!full) {
      for (const [file, pattern] of component.units || []) add(unit(file, pattern));
      for (const file of component.python || []) add(python(file));
    }
    for (const check of component.browser || []) add(check);
    if (component.editor) add({ id: 'editor-assets', kind: 'offline', command: ['node', 'frontend_src/build-editor.cjs', '--check'], inputs: ['frontend_src', runtime], exclusive: true });
    if (component.package) add({ id: 'package-assets', kind: 'offline', command: ['node', 'frontend_src/build-hacs-dist.cjs'], inputs: [backend, 'frontend_src/build-hacs-dist.cjs'], exclusive: true });
  }
  for (const check of selection.directTests || []) if (!full) add(check);
  if (full) {
    add(browser('mobile-matrix', 'test-ha-dashboard-accessibility', ['--pages', '--screenshots', 'review', ...(parallel ? ['--parallel'] : [])], true));
    add(browser('e2e:light', 'test-ha-dashboard-e2e', ['--theme=light']));
    add(browser('e2e:dark', 'test-ha-dashboard-e2e', ['--theme=dark']));
    add(browser('alignment', 'test-ha-card-alignment'));
    add({ id: 'yaml', kind: 'offline', command: ['node', 'tests/validate-yaml.js'], inputs: [backend, 'ha-test', 'tests/validate-yaml.js'], exclusive: false });
    add(browser('preserved-upgrade', 'test-ha-upgrade', ['--full']));
  } else {
    const templates = [...new Set(ids.flatMap(id => components[id].templates || families[id] || []))];
    const profiles = [...new Set(ids.flatMap(id => components[id].profiles || []))];
    for (const profile of profiles) add(browser('layout:' + profile, 'test-ha-dashboard-accessibility', ['--scenario', profile, '--focused', ...(templates.length ? ['--families', templates.join(',')] : []), ...(ids.some(id => ['popup', 'security'].includes(id)) ? ['--popups', ...(profile !== 'iphone-normal' ? ['--geometry-only-popups'] : [])] : [])], false));
    if (ids.includes('actions') || ids.includes('navbar')) add(browser('alignment', 'test-ha-card-alignment'));
  }
  const checks = [...result.values()];
  const merged = new Map();
  for (const check of checks) {
    if (!check.id.startsWith('unit:')) { merged.set(check.id, check); continue; }
    const file = check.command.at(-1);
    const previous = merged.get(file);
    if (!previous) { merged.set(file, check); continue; }
    const patterns = [previous, check].map(row => row.command.includes('--test-name-pattern') ? row.command[row.command.indexOf('--test-name-pattern') + 1] : null);
    merged.set(file, unit(path.basename(file, '.test.js'), patterns.every(Boolean) ? patterns.join('|') : undefined));
  }
  return [...merged.values()].sort((a, b) => (a.kind !== 'offline') - (b.kind !== 'offline'));
}

module.exports = { checksFor, components, families, rules, selectComponents };
