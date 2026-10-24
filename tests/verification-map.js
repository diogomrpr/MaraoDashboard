const fs = require('node:fs');
const path = require('node:path');
const { factorChecks, geometryProfiles, profileOf } = require('./verification-policy');

const runtime = 'custom_components/marao_dashboard/frontend/';
const backend = 'custom_components/marao_dashboard/';
const unit = (file, pattern) => ({ id: 'unit:' + file + (pattern ? ':' + pattern : ''), kind: 'offline',
  command: ['node', '--test', '--test-concurrency=1', ...(pattern ? ['--test-name-pattern', pattern] : []), 'tests/frontend/' + file + '.test.js'],
  inputs: [...(file === 'verification' ? ['tests/verification-map.js'] : []), 'tests/frontend/' + file + '.test.js', 'tests/frontend/package.json', 'custom_components/package.json', runtime, 'frontend_src',
    ...(file === 'accessibility-profiles' ? ['tests/test-ha-dashboard-accessibility.js'] : []),
    ...(file === 'camera-request-ledger' ? ['tests/camera-request-ledger.js'] : []),
    ...(/verification|upgrade|release-gate/.test(file) ? ['ha-test', 'tests/verify-release.js', 'tests/verify-publish.js', 'tests/test-ha-upgrade.js', 'tests/verification-browser.js', 'tests/native-reconnect-exception.js'] : [])], exclusive: false });
const python = file => ({ id: 'python:' + file, kind: 'offline', command: ['python', '-m', 'pytest', '-q', 'tests/components/marao_dashboard/' + file + '.py'],
  inputs: ['tests/components/marao_dashboard/' + file + '.py', backend, 'tests/conftest.py', 'pyproject.toml'], exclusive: false });
const browser = (id, file, args = [], exclusive = true) => ({ id, kind: 'browser', command: ['node', 'tests/' + file + '.js', ...args],
  inputs: [runtime, 'tests/' + file + '.js', 'tests/test-ha-dashboard-accessibility.js', 'tests/test-ha-dashboard-e2e.js', 'ha-test',
    ...(file === 'test-ha-dashboard-e2e' && args.some(arg => ['--camera-only', '--camera-live-only'].includes(arg)) ? ['tests/camera-live-native-checks.js', 'tests/camera-request-ledger.js'] : []),
    ...(file === 'test-ha-card-alignment' && args.includes('--access-label') ? ['tests/test-ha-ui-batch.js'] : []),
    ...(['test-ha-editor', 'test-ha-card-alignment'].includes(file) ? ['tests/test-ha-editor.js', 'tests/json-editor-checks.js', 'tests/editor-drag-checks.js', 'tests/editor-rendering-checks.js', 'tests/editor-preload-checks.js'] : [])], exclusive });
const families = {
  security: ['md_security_card', 'md_alarm_controls_card', 'md_access_slide_action_card', 'md_access_card'],
  slider: ['md_light_card', 'md_fan_card', 'md_cover_card'],
  popup: ['md_media_card', 'md_climate_card', 'md_entity_group_card', 'md_access_card'],
  rooms: ['md_room_card'], groups: ['md_entity_group_card'], climate: ['md_climate_card', 'md_number_card', 'md_wallbox_current_card'],
  camera: ['md_camera_card'], history: ['md_graph_card', 'md_timeline_card', 'md_toggle_graph_card'],
};
const components = {
  'navbar-startup': { units: [['frontend-refresh'], ['marao-navbar-card'], ['marao-native'], ['marao-history-cards'], ['marao-text-scale'], ['gallery-cases'], ['package-boundary']],
    python: ['test_native'], editor: true,
    browser: [
      browser('navbar-startup:ha', 'test-ha-navbar-startup'),
      { id: 'navbar-startup:local', kind: 'offline', command: ['node', 'tests/test-navbar-startup-local.js'], inputs: [runtime, 'tests/test-navbar-startup-local.js'], exclusive: true },
      { id: 'navbar-startup:refresh', kind: 'offline', command: ['node', 'tests/test-frontend-refresh-local.js'], inputs: [runtime, 'tests/test-frontend-refresh-local.js', 'ha-test/frontend-refresh-fixture.js'], exclusive: true },
      { id: 'navbar-startup:history-import', kind: 'offline', command: ['node', 'tests/test-history-chart-local.js'], inputs: [runtime, 'tests/test-history-chart-local.js'], exclusive: true },
    ] },
  'frontend-refresh': { units: [['frontend-refresh'], ['marao-navbar-card'], ['marao-native', 'navbar|preview|edit'], ['gallery-cases'], ['verification', 'frontend refresh'], ['package-boundary']],
    browser: [
      { id: 'frontend-refresh:startup', kind: 'offline', command: ['node', 'tests/test-navbar-startup-local.js'], inputs: [runtime, 'tests/test-navbar-startup-local.js'], exclusive: true },
      { id: 'frontend-refresh:alignment-and-recovery', kind: 'offline', command: ['node', 'tests/test-ha-card-alignment.js', '--frontend-refresh', '--screenshots=review'], inputs: [runtime, 'tests/test-ha-card-alignment.js', 'tests/test-frontend-refresh-local.js', 'ha-test/frontend-refresh-fixture.js'], exclusive: true },
      { id: 'frontend-refresh:history-import', kind: 'offline', command: ['node', 'tests/test-history-chart-local.js'], inputs: [runtime, 'tests/test-history-chart-local.js'], exclusive: true },
    ] },
  'control-grid': { units: [['marao-control-grid'], ['local-sync-safety'], ['marao-history-cards'], ['marao-energy-format'], ['marao-frigate-events-card'], ['marao-card-visibility'], ['marao-text-scale'], ['marao-native'], ['marao-security'], ['marao-climate-card', 'group|slider|brightness|cover|hold'], ['gallery-cases']],
    python: ['test_control_grid', 'test_generator', 'test_page_generation', 'test_page_migration', 'test_release_replay_recovery', 'test_gallery_fixtures'], editor: true, upgrade: true,
    browser: [{ id: 'control-grid:state-layout', kind: 'offline', command: ['node', 'tests/test-card-state-layout-local.js'], inputs: [runtime, 'frontend_src', 'tests/test-card-state-layout-local.js'], exclusive: true }, { id: 'control-grid:local', kind: 'offline', command: ['node', 'tests/test-control-grid-local.js'], inputs: [runtime, 'tests/test-control-grid-local.js'], exclusive: true }, ...geometryProfiles.map(profile => browser('control-grid:' + profile, 'test-ha-card-alignment', ['--control-grid', '--scenario', profile])),
      ...['android-bold', 'android-384', 'android-384-bold'].map(profile => browser('control-grid:' + profile, 'test-ha-card-alignment', ['--control-grid', '--scenario', profile])),
      browser('sliders:iphone', 'test-ha-value-sliders', ['--scenario', 'iphone-normal']), browser('sliders:android', 'test-ha-value-sliders', ['--scenario', 'android-normal']),
      browser('slider-headers:access', 'test-ha-security', ['--scenario', 'iphone-normal']), browser('access-label:android-gesture', 'test-ha-security', ['--scenario', 'android-normal'])] },
  'chart-details': { units: [['power-history'], ['history-data'], ['history-chart'], ['marao-history-cards'], ['marao-energy-format'], ['marao-card-visibility'], ['marao-native'], ['gallery-cases']],
    python: ['test_control_grid', 'test_page_generation', 'test_history'], editor: true, package: true,
    browser: [{ id: 'chart-details:local', kind: 'offline', command: ['node', 'tests/test-history-chart-local.js'], inputs: [runtime, 'frontend_src/history-chart.js', 'frontend_src/history-data.js', 'tests/test-history-chart-local.js', 'ha-test/history-fixture.js'], exclusive: true },
      browser('history', 'test-ha-dashboard-e2e', ['--history-only']), browser('energy', 'test-ha-energy-format', ['--scenario', 'iphone-normal']),
      ...['light','dark'].map(theme => browser('chart-details:ha:iphone:' + theme, 'test-ha-dashboard-e2e', ['--chart-details-only', '--scenario=iphone-normal', '--theme=' + theme, '--screenshots=review'])),
      browser('chart-details:ha:android', 'test-ha-dashboard-e2e', ['--chart-details-only', '--scenario=android-normal', '--theme=light']),
      ...['narrow-320','iphone-landscape','iphone-text-200','iphone-page-zoom-200','iphone-bold-text-200'].map(profile => browser('chart-details:ha:' + profile, 'test-ha-dashboard-e2e', ['--chart-details-only', '--chart-geometry', '--scenario=' + profile, '--theme=light', '--screenshots=' + (['narrow-320','iphone-bold-text-200'].includes(profile) ? 'review' : 'failure')]))] },
  'editor-preload': { units: [['editor-panel'], ['editor-model'], ['canonical-page-model'], ['json-editor']],
    python: ['test_init', 'test_security', 'test_page_migration', 'test_upgrade_fixtures'], editor: true,
    browser: [browser('editor-preload:startup', 'test-ha-editor', ['--preload', '--startup', '--json-tools', '--scenario=iphone-normal']),
      ...['narrow-320', 'iphone-landscape', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'].map(profile => browser('editor-preload:' + profile, 'test-ha-editor', ['--json-geometry', '--scenario=' + profile]))] },
  'slider-headers': { units: [['marao-card-visibility'], ['marao-text-scale'], ['marao-climate-card', 'slider|brightness|percentage|cover'], ['marao-security'], ['gallery-cases']],
    python: ['test_gallery_fixtures'], templates: [...families.slider, 'md_access_slide_action_card'],
    browser: [
      ...['iphone-normal', 'android-normal', 'narrow-320', 'iphone-landscape', 'android-landscape', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'].map(profile =>
        browser('slider-headers:' + profile, 'test-ha-card-alignment', ['--slider-headers', '--scenario', profile])),
      browser('sliders:iphone', 'test-ha-value-sliders', ['--scenario', 'iphone-normal']),
      browser('sliders:android', 'test-ha-value-sliders', ['--scenario', 'android-normal']),
      browser('slider-headers:access', 'test-ha-security', ['--scenario', 'iphone-normal']),
    ] },
  'battery-groups': { units: [['marao-card-visibility'], ['marao-climate-card', 'group|battery|problem'], ['gallery-cases']], python: ['test_gallery_fixtures'],
    browser: ['iphone-normal', 'narrow-320', 'iphone-bold-text-200'].map(profile => browser('battery-groups:' + profile, 'test-ha-ui-batch', ['--battery', '--scenario', profile])) },
  'access-label': { units: [['marao-security'], ['marao-text-scale']], python: ['test_security'],
    browser: [
      ...['iphone-normal', 'android-normal', 'narrow-320', 'iphone-landscape', 'android-landscape', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'].map(profile => browser('access-label:' + profile, 'test-ha-card-alignment', ['--access-label', '--scenario', profile])),
      browser('slider-headers:access', 'test-ha-security', ['--scenario', 'iphone-normal']),
      browser('access-label:android-gesture', 'test-ha-security', ['--scenario', 'android-normal']),
    ] },
  'lovelace-cards': { units: [['lovelace-model'], ['marao-control-grid'], ['editor-panel']], python: ['test_card_yaml', 'test_history'], editor: true, browser: [] },
  'editor-rendering': { units: [['editor-model'], ['canonical-page-model'], ['page-manager-model'], ['editor-panel'], ['editor-drag'], ['json-editor']],
    python: ['test_page_generation', 'test_page_migration'], editor: true,
    browser: [
      ...['iphone-normal', 'android-normal', 'narrow-320', 'iphone-landscape', 'android-landscape', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'].map(profile => browser('editor-rendering:' + profile, 'test-ha-editor', [profile === 'iphone-normal' ? '--rendering' : '--rendering-geometry', '--scenario=' + profile, ...(profile === 'iphone-normal' ? ['--drag', '--drag-save'] : profile === 'android-normal' ? ['--drag', '--portuguese'] : ['--drag-geometry'])])),
      browser('editor-rendering:pages', 'test-ha-editor', ['--pages', '--scenario=iphone-normal']),
      browser('editor-rendering:json', 'test-ha-editor', ['--json-tools', '--json-save', '--scenario=iphone-normal']),
      {...browser('editor-json-appearance', 'test-ha-editor', ['--json-geometry', '--scenario=iphone-normal', '--theme=dark', '--screenshots=review']),
        cases: [{id:'editor-json:dark:appearance',assertion:'json-editor',profile:'iphone-normal',theme:'dark',engine:'chromium',dimensions:['appearance','geometry'],themeIndependent:false,
          reason:'Stock Monaco/native widget appearance retains an explicit dark geometry check.'}]},
      browser('editor-rendering:alignment', 'test-ha-card-alignment', ['--editor-rendering']),
    ] },
  'json-editor': { units: [['json-editor'], ['editor-model'], ['canonical-page-model'], ['editor-panel']], editor: true,
    browser: [browser('json-alignment', 'test-ha-card-alignment', ['--json-editor']),
      ...['iphone-normal', 'android-normal', 'narrow-320', 'iphone-landscape', 'android-landscape', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'].map(profile =>
      browser('json-editor:' + profile, 'test-ha-editor', ['--json-tools', '--scenario=' + profile, ...(profile === 'iphone-normal' ? ['--json-save', '--startup', '--portuguese'] : [])]))],
  },
  native: { units: [['marao-native'], ['native-backup']], python: ['test_native'], editor: true,
    templates: [...Object.values(families).flat(), 'md_weather_card', 'md_scene_collection_card', 'md_access_hold_action_card', 'md_access_action_card', 'md_header_card', 'md_glance_card', 'md_scene_card', 'md_number_card', 'md_wallbox_current_card', 'md_vacuum_card', 'md_dishwasher_card', 'md_washing_machine_card', 'md_sensor_card', 'md_switch_card', 'md_battery_card', 'md_navigation_card', 'md_energy_period_card', 'md_media_app_card', 'md_title_card', 'md_base_card'],
    profiles: ['iphone-normal', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200', 'narrow-320', 'iphone-landscape', 'android-normal', 'android-landscape'],
    browser: [browser('native-editor', 'test-ha-native', ['--scenario', 'iphone-normal'])] },
  'camera-editor': { units: [['marao-native'], ['native-backup']], python: ['test_native'], editor: true,
    browser: [browser('native-editor', 'test-ha-native', ['--scenario', 'iphone-normal'])] },
  security: { units: [['marao-security']], python: ['test_security'], templates: [...families.security, 'md_dishwasher_card', 'md_vacuum_card'],
    profiles: ['iphone-normal', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200', 'narrow-320', 'iphone-landscape', 'android-normal', 'android-landscape'],
    browser: [browser('security:iphone', 'test-ha-security', ['--scenario', 'iphone-normal']), browser('security:android', 'test-ha-security', ['--scenario', 'android-normal'])] },
  labels: { units: [['marao-text-scale'], ['marao-card-visibility']], profiles: ['iphone-normal', 'narrow-320', 'iphone-bold-text-200'] },
  slider: { units: [['marao-slider'], ['marao-climate-card', 'slider|brightness|percentage|cover']], consumers: ['light', 'fan', 'cover'],
    browser: [browser('sliders:iphone', 'test-ha-value-sliders', ['--scenario', 'iphone-normal']), browser('sliders:android', 'test-ha-value-sliders', ['--scenario', 'android-normal'])] },
  light: { units: [['marao-climate-card', 'light|brightness']], templates: ['md_light_card'] },
  'light-color': { units: [['marao-light-color'], ['marao-slider'], ['marao-card-visibility', 'light|hold|popup']], templates: ['md_light_card'],
    browser: [{ id: 'light-color:local', kind: 'offline', command: ['node', 'tests/test-light-color-local.js'], inputs: [runtime, 'tests/test-light-color-local.js'], exclusive: true }] },
  fan: { units: [['marao-climate-card', 'fan|percentage']], templates: ['md_fan_card'] },
  cover: { units: [['marao-climate-card', 'cover|position']], templates: ['md_cover_card'] },
  popup: { units: [['marao-navbar-card'], ['marao-climate-card', 'popup|focus|inert']], profiles: ['iphone-normal', 'iphone-landscape', 'narrow-320'], popups: true },
  scroll: { units: [['marao-card-visibility'], ['marao-climate-card'], ['marao-security'], ['marao-text-scale']],
    browser: [
      ...['iphone-normal', 'iphone-landscape', 'iphone-text-200'].map(profile => browser('scroll:webkit:' + profile, 'test-ha-scroll', ['--webkit', '--scenario', profile])),
      ...['iphone-normal', 'android-normal', 'narrow-320'].map(profile => browser('scroll:chromium:' + profile, 'test-ha-scroll', ['--scenario', profile])),
      browser('scroll:security', 'test-ha-security', ['--scenario', 'iphone-normal']),
      browser('scroll:sliders', 'test-ha-value-sliders', ['--scenario', 'iphone-normal']),
    ] },
  'navbar-overflow': { units: [['upgrade-runner'], ['editor-model'], ['marao-navbar-card'], ['canonical-page-model'], ['page-manager-model'], ['editor-panel'], ['marao-native'], ['verification']],
    python: ['test_navbar_overflow', 'test_generator', 'test_page_generation', 'test_page_migration', 'test_history', 'test_native'], editor: true, upgrade: true,
    browser: [
      ...['iphone-normal', 'android-normal', 'narrow-320', 'iphone-landscape', 'android-landscape', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'].map(profile =>
        browser('navbar-overflow:' + profile, 'test-ha-navbar-overflow', ['--scenario', profile])),
      browser('navbar-overflow:native', 'test-ha-native', ['--navbar-only', '--scenario', 'iphone-normal']),
      browser('navbar-overflow:safe-area', 'test-ha-dashboard-accessibility', ['--safe-area']),
      browser('navbar-overflow:alignment', 'test-ha-card-alignment', ['--navbar']),
    ] },
  navbar: { units: [['marao-navbar-card']], profiles: ['iphone-normal', 'iphone-landscape', 'narrow-320'], browser: [browser('safe-area', 'test-ha-dashboard-accessibility', ['--safe-area'])] },
  actions: { units: [['marao-climate-card', 'action|hold|slide|dispatch|disabled|unavailable']],
    browser: [browser('actions', 'test-ha-dashboard-e2e', ['--actions-only'])] },
  connection: { units: [['marao-climate-card', 'connection|disconnected|unavailable'], ['dashboard-e2e-analysis']], browser: [browser('native-reconnect', 'test-ha-dashboard-e2e', ['--disconnect-only'])] },
  rooms: { units: [['marao-climate-card', 'room']], browser: [browser('rooms', 'test-ha-room-cards', ['--scenario', 'iphone-normal'])] },
  groups: { units: [['marao-climate-card', 'group']], browser: [browser('groups', 'test-ha-dashboard-e2e', ['--groups-only'])] },
  climate: { units: [['marao-climate-card', 'climate|number|stepper|wallbox']], browser: [browser('climate', 'test-ha-dashboard-e2e', ['--climate-only']), browser('numbers', 'test-ha-climate-layout', ['--scenario', 'iphone-normal'])] },
  camera: { units: [['marao-camera-live'], ['camera-request-ledger'], ['camera-media-shaper'], ['marao-card-visibility'], ['marao-frigate-events-card'], ['marao-native'], ['editor-model'], ['gallery-cases']],
    python: ['test_camera_events', 'test_generator', 'test_gallery_fixtures', 'test_history', 'test_upgrade_fixtures'], editor: true, package: true,
    browser: [] }, // Playback, HLS and native cancellation checks are permanently manual-only.
  history: { units: [['marao-history-cards']], browser: [browser('history', 'test-ha-dashboard-e2e', ['--history-only'])] },
  energy: { units: [['marao-energy-format']], browser: [browser('energy', 'test-ha-energy-format', ['--scenario', 'iphone-normal'])] },
  'editor-drag': { units: [['editor-drag'], ['canonical-page-model'], ['editor-panel']], python: ['test_page_generation', 'test_page_migration'], editor: true,
    browser: [browser('editor-drag:iphone-normal', 'test-ha-editor', ['--drag', '--drag-save', '--scenario=iphone-normal']),
      browser('editor-drag:android-normal', 'test-ha-editor', ['--drag', '--portuguese', '--scenario=android-normal']),
      browser('editor-drag:alignment', 'test-ha-card-alignment', ['--editor-drag']),
      ...['narrow-320', 'iphone-landscape', 'android-landscape', 'iphone-bold', 'iphone-text-200', 'iphone-page-zoom-200', 'iphone-bold-text-200'].map(profile => browser('editor-drag:' + profile, 'test-ha-editor', ['--drag-geometry', '--scenario=' + profile]))] },
  'editor-model': { units: [['editor-model'], ['page-manager-model'], ['canonical-page-model']] },
  'card-namespace': { units: [['card-names'], ['marao-security'], ['marao-native']], python: ['test_card_names', 'test_page_migration'] },
  'editor-ui': { units: [['editor-panel']], browser: [browser('editor', 'test-ha-editor', ['--scenario=iphone-normal', '--header'])], editor: true },
  generator: { python: ['test_generator', 'test_page_generation'], upgrade: true },
  migration: { python: ['test_page_migration', 'test_native_storage_migration', 'test_release_replay_recovery', 'test_upgrade_fixtures'], upgrade: true },
  lifecycle: { python: ['test_init', 'test_config_flow', 'test_config_patch', 'test_frontend_assets'], upgrade: true },
  'saved-history': { python: ['test_history'], upgrade: true },
  packaging: { units: [['package-boundary'], ['brand-assets']], package: true },
  gallery: { units: [['gallery-cases']], python: ['test_gallery_fixtures'] },
  verification: { units: [['verification'], ['verification-development'], ['verification-policy'], ['verification-reuse'], ['verification-browser'], ['verification-evidence'], ['accessibility-profiles'], ['upgrade-prepared'], ['upgrade-runner'], ['release-gate']],
    browser: [browser('tooling-layout', 'test-ha-dashboard-accessibility', ['--focused', '--families', 'md_light_card', '--scenario', 'iphone-normal', '--screenshots', 'review', '--popups', '--popup-hash', '#marao-dashboard-test-value-sliders-popup'], false),
      browser('tooling-actions', 'test-ha-dashboard-e2e', ['--toggle-only'])] },
  docs: {},
  'verification-map': { units: [['verification'], ['verification-development']] },
  'verification-development': { units: [['verification-development']] },
  'frontend-preview': { units: [['frontend-preview'], ['accessibility-profiles']] },
  'frontend-preview-preparation': { units: [['frontend-preparation']] },
};

const rules = [
  [/^tests\/frontend\/canonical-pages\.fixture\.json$/, ['card-namespace']],
  [/^ha-test\/upgrade\/fixtures\/namespace-v1-(?:input|expected|provenance)\.json$/, ['card-namespace']],
  [/^custom_components\/marao_dashboard\/(card_names\.py|frontend\/MaraoNames\.js)$|^tests\/(frontend\/card-names\.test\.js|components\/marao_dashboard\/test_card_names\.py)$/, ['card-namespace']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoLight(?:Color|Capabilities)\.js$|^tests\/test-light-color-local\.js$/, ['light-color']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoSlider\.js$/, ['slider']],
  [/^tests\/test-ha-navbar-startup\.js$/, ['navbar-startup']],
  [/^custom_components\/marao_dashboard\/frontend\/Marao(?:Navigation|NativeNavbar)\.js$|^frontend_src\/MaraoNativeNavbar\.js$|^tests\/test-navbar-startup-local\.js$/, ['navbar-startup']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoRuntime\.js$/, 'shared'],
  [/^tests\/verification-task\.js$/, ['verification-development']],
  [/^tests\/preview-frontend\.js$/, ['frontend-preview']],
  [/^ha-test\/prepare-frontend\.js$/, ['frontend-preview-preparation']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoFrontend(?:Refresh|Updates)\.js$|^tests\/test-frontend-refresh-local\.js$|^ha-test\/frontend-refresh-fixture\.js$/, ['frontend-refresh']],
  [/^frontend_src\/json-preparation\.js$|^custom_components\/marao_dashboard\/frontend\/MaraoDashboard(?:JsonPreparation|EditorLabels)\.js$/, ['editor-preload']],
  [/^tests\/(?:test-control-grid-local|test-card-state-layout-local)\.js$/, ['control-grid']],
  [/^frontend_src\/power-history\.js$|^tests\/frontend\/power-history\.test\.js$/, ['chart-details']],
  [/^frontend_src\/history-(chart|data)\.js$|^custom_components\/marao_dashboard\/frontend\/(MaraoHistory|ChartJS\.LICENSE|KurkleColor\.LICENSE)/, ['chart-details']],
  [/^tests\/test-history-chart-local\.js$|^tests\/history-detail-checks\.js$|^ha-test\/history-fixture\.js$/, ['chart-details']],
  [/^frontend_src\/lovelace-(?:model|loader|editor)\.js$|^custom_components\/marao_dashboard\/(?:card_yaml\.py|frontend\/(?:MaraoLovelaceEditor\.js|YAML\.LICENSE\.txt))$|^tests\/frontend\/lovelace-cards\.fixture\.json$/, ['lovelace-cards']],
  [/^tests\/editor-preload-checks\.js$/, ['editor-preload']],
  [/^tests\/(test-camera-live-local|test-ha-camera-latency|test-ha-camera-streams|camera-live-native-checks|camera-slow-native-checks|camera-request-ledger|camera-media-shaper)\.js$|^tests\/frontend\/(?:marao-camera-adaptive|camera-media-shaper)\.test\.js$|^tests\/components\/marao_dashboard\/test_camera_(?:media|events)\.py$|^custom_components\/marao_dashboard\/(?:camera_(?:events|sessions|media)\.py|frontend\/(?:MaraoCamera(?:Adaptive|Preload)?\.js|MaraoHls\.js|HlsJS\.LICENSE\.txt))$|^frontend_src\/camera-hls\.js$|^ha-test\/camera-live-fixture\.js$|^ha-test\/generate-camera-live\.(?:js|py)$|^ha-test\/custom_components\/(?:marao_test_camera|unifiprotect|netatmo)\//, ['camera']],
  [/^tests\/control-grid-checks\.js$/, ['control-grid']],
  [/^tests\/verification-(policy|reuse)\.js$/, ['verification']],
  [/^tests\/(editor-rendering-checks|measure-ha-editor)\.js$/, ['editor-rendering']],
  [/^tests\/test-ha-ui-batch\.js$/, ['battery-groups', 'access-label']],
  [/^tests\/verification-map\.js$/, ['verification-map']],
  [/^tests\/validate-yaml\.js$/, ['packaging']],
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
  [/^tests\/test-ha-scroll\.js$/, ['scroll']],
  [/^tests\/test-ha-navbar-overflow\.js$|^tests\/frontend\/navbar-overflow\.fixture\.json$/, ['navbar-overflow']],
  [/^tests\/test-ha-energy-format\.js$/, ['energy']],
  [/^(AGENTS\.md|README\.md|\.github\/CONTRIBUTING\.md|docs\/|openspec\/|\.agents\/)/, ['docs']],
  [/^tests\/frontend\/([^/]+)\.test\.js$/, 'test'],
  [/^tests\/components\/marao_dashboard\/(test_[^/]+)\.py$/, 'test'],
  [/^tests\/(verification|test-ha-|verify-|native-reconnect|mobile-devices|upgrade)|^ha-test\/(prepared-batch|upgrade)/, ['verification']],
  [/^frontend_src\/editor-model\.js$/, ['editor-model']],
  [/^frontend_src\/(MaraoDashboardPanel\.js|panel\.css)/, ['editor-ui']],
  [/^frontend_src\/(build-|json-editor)/, ['packaging', 'editor-ui']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoDashboardPanel\./, ['editor-ui']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoCards\.js$/, 'shared'],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoDropdown\.js$/, ['chart-details']],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoDashboard\.js$/, 'shared'],
  [/^custom_components\/marao_dashboard\/frontend\/MaraoFrigateEventsCard\.js$/, ['camera']],
  [/^custom_components\/marao_dashboard\/frontend\/themes\//, ['labels', 'slider', 'popup', 'navbar', 'rooms']],
  [/^custom_components\/marao_dashboard\/frontend\/media-apps\//, ['labels', 'packaging']],
  [/^custom_components\/marao_dashboard\/frontend\/(brand|icons|MaraoDashboardJson)/, ['packaging', 'editor-ui']],
  [/^custom_components\/marao_dashboard\/brand\//, ['packaging']],
  [/^custom_components\/marao_dashboard\/translations\//, ['labels', 'editor-ui']],
  [/^custom_components\/marao_dashboard\/(generator|editor)\.py$/, ['generator', 'editor-model']],
  [/^custom_components\/marao_dashboard\/(page_migration|page_model|native_storage|legacy_migration|migration|operation|recovery).*\.py$/, ['migration']],
  [/^custom_components\/marao_dashboard\/(history)\.py$/, ['saved-history']],
  [/^custom_components\/marao_dashboard\/(__init__|config_flow|config_patch|const|frontend_assets)\.py$/, ['lifecycle']],
  [/^tests\/test-frontend-upgrade-cache-local\.js$/, ['frontend-refresh', 'lifecycle']],
  [/^custom_components\/marao_dashboard\/(manifest\.json|strings\.json)|^(custom_components\/package\.json|hacs\.json|package(-lock)?\.json)$/, ['packaging']],
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
    if (declared.includes('frontend-preview') && file === 'tests/test-ha-dashboard-accessibility.js') ids = ['frontend-preview'];
    // Reviewed camera-only form fields/labels retain native editing acceptance;
    // unchanged native renderers do not require every card's geometry matrix.
    if (declared.includes('camera') && declared.includes('editor-ui') && !declared.includes('native') && !declared.includes('editor-preload')
      && /^(frontend_src\/(native-model|MaraoNativeCardEditor|native-labels|editor-labels)\.js|custom_components\/marao_dashboard\/frontend\/(MaraoNativeCardEditor|MaraoDashboardEditorLabels)\.js)$/.test(file)) ids = ['camera-editor', 'editor-ui', ...(file.startsWith('custom_components/') ? ['packaging'] : [])];
    if (declared.includes('navbar-startup') && /^(frontend_src\/(MaraoNativeCards|MaraoNativeNavbar|build-editor)\.(js|cjs)|custom_components\/marao_dashboard\/frontend\/Marao(Navigation|NativeNavbar|NativeCards|Runtime|Dashboard|Cards|FrontendRefresh)\.js|tests\/(test-ha-(native|navbar-overflow)|test-navbar-startup-local|test-frontend-refresh-local|test-history-chart-local)\.js|ha-test\/(cases\.json|frontend-refresh-fixture\.js|dashboard\/views\/00-card-test\.yaml|marao_dashboard_test_dashboard\.json))$/.test(file)) ids = ['navbar-startup'];
    if (declared.includes('frontend-refresh') && /^(tests\/(test-ha-card-alignment|test-history-chart-local)\.js|ha-test\/(cases\.json|dashboard\/views\/00-card-test\.yaml|marao_dashboard_test_dashboard\.json))$/.test(file)) ids = ['frontend-refresh'];
    if (declared.includes('editor-preload') && file === 'tests/json-editor-checks.js') ids = ['editor-preload'];
    if (declared.includes('editor-preload') && file === 'frontend_src/build-editor.cjs') ids = ['packaging', 'editor-preload', ...(declared.includes('chart-details') ? ['chart-details'] : [])];
    if (declared.includes('editor-preload') && declared.includes('camera') && file === 'frontend_src/editor-labels.js') ids = ['editor-preload', 'camera'];
    if (declared.includes('control-grid') && declared.includes('camera') && declared.includes('chart-details') && file === 'tests/test-ha-dashboard-e2e.js') ids = ['control-grid', 'camera', 'chart-details'];
    if (declared.includes('editor-preload') && /^(custom_components\/marao_dashboard\/(__init__|editor)\.py|frontend_src\/(MaraoDashboardPanel|json-editor)\.js|tests\/(test-ha-editor|editor-preload-checks|measure-ha-editor)\.js)/.test(file)) ids = ['editor-preload'];
    if (declared.includes('control-grid') && /^tests\/test-ha-security\.js$/.test(file)) ids = ['control-grid'];
    if (declared.includes('editor-rendering') && declared.includes('verification') && file === 'tests/json-editor-checks.js') ids = ['editor-rendering'];
    if (declared.includes('control-grid') && /^(custom_components\/marao_dashboard\/generator\.py|frontend_src\/MaraoNativeCards\.js|custom_components\/marao_dashboard\/frontend\/MaraoNativeCards\.js|ha-test\/(prepare\.js|cases\.json|dashboard\/|marao_dashboard_test_dashboard\.json|upgrade\/coverage\.json))/.test(file)) ids = ['control-grid'];
    if (declared.includes('slider-headers') && /^(tests\/test-ha-(card-alignment|dashboard-e2e)\.js|ha-test\/(cases\.json|dashboard\/|marao_dashboard_test_dashboard\.json))/.test(file)) ids = ['slider-headers'];
    if (declared.includes('editor-rendering') && /^(frontend_src\/MaraoDashboardPanel\.js|custom_components\/marao_dashboard\/frontend\/MaraoDashboardPanel\.|tests\/(test-ha-editor|editor-drag-checks|measure-ha-editor|editor-rendering-checks)\.js)/.test(file)) ids = ['editor-rendering'];
    if (declared.includes('access-label') && file === 'tests/test-ha-dashboard-accessibility.js') ids = ['access-label'];
    if (declared.includes('navbar-overflow') && /^(frontend_src\/(?:MaraoDashboardPanel|editor-model|editor-labels|MaraoNativeCardEditor|native-labels)\.js|custom_components\/marao_dashboard\/(?:generator|native|page_model)\.py|tests\/test-ha-dashboard-accessibility\.js|tests\/test-ha-card-alignment\.js|tests\/test-ha-editor\.js|tests\/test-ha-native\.js|tests\/test-ha-upgrade\.js|ha-test\/upgrade\/coverage\.json|ha-test\/(?:marao_dashboard_test_dashboard\.json|cases\.json))$/.test(file)) ids = ['navbar-overflow'];
    if (declared.includes('navbar-overflow') && /^custom_components\/marao_dashboard\/frontend\/MaraoDashboard(?:Panel|JsonEditor)\.js$/.test(file)) ids = ['navbar-overflow', 'packaging'];
    // Reviewed additive movement labels have no native-card consumer. Other label edits retain both consumers.
    if (ids === 'editor-labels') ids = declared.includes('editor-drag') && !declared.includes('native') ? ['editor-ui', 'editor-drag'] : ['native', 'editor-ui'];
    if (ids === 'shared') {
      if (!declared.length && !conservativeShared) throw new Error(file + ': declare --component after reviewing the shared-component diff.');
      const consumers = ['card-namespace', 'navbar-startup', 'frontend-refresh', 'chart-details', 'control-grid', 'battery-groups', 'access-label', 'slider-headers', 'navbar-overflow', 'native', 'security', 'labels', 'slider', 'light', 'light-color', 'fan', 'cover', 'popup', 'scroll', 'navbar', 'actions', 'connection', 'rooms', 'groups', 'climate', 'history', 'energy', 'camera'];
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

function inspectionFor(selection) {
  const ids = selection.components;
  const aliases = {
    'navbar-startup': ['marao-navbar-card'], 'frontend-refresh': ['marao-navbar-card'], navbar: ['marao-navbar-card'], 'navbar-overflow': ['marao-navbar-card'],
    'battery-groups': ['md_entity_group_card', 'md_battery_card'], 'access-label': ['md_access_slide_action_card'],
    'control-grid': [...families.slider, ...families.climate, 'md_sensor_card'],
    'chart-details': [...families.history, 'md_energy_period_card'], energy: ['md_energy_period_card'],
  };
  const editor = ids.some(id => id.startsWith('editor-') || id === 'json-editor');
  const selectedFamilies = [...new Set(ids.flatMap(id => aliases[id] || components[id].templates || families[id] || []))];
  const unresolved = ids.filter(id => ['actions', 'connection', 'labels', 'scroll', 'camera-editor'].includes(id));
  return { components: ids, families: selectedFamilies, editor, unresolved };
}

function checksFor(selection, { full = false, offline = false, unit: unitOnly = false, parallel = false, tier = 'focused' } = {}) {
  if (tier === 'visual') return [];
  const result = new Map();
  const add = check => {
    if (unitOnly && !/^(unit:|python:)/.test(check.id)) return;
    if (!offline || check.kind === 'offline') result.set(check.id, check);
  };
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
  const selected = tier === 'behavior' ? [...merged.values()].filter(check => check.kind === 'offline'
    && (/^(unit:|python:)/.test(check.id) || ['editor-assets', 'package-assets'].includes(check.id))) : [...merged.values()];
  return factorChecks(selected, { full }).map(check => check.kind === 'browser' && !check.cases ? {
    ...check, cases: [{ id: check.id, assertion: check.command[1], dimensions: ['registered-contract'],
      profile: check.command.some(arg => arg === '--scenario' || arg.startsWith('--scenario=')) ? profileOf(check) : 'runner-defined',
      theme: check.command.find(arg => arg.startsWith('--theme='))?.split('=')[1] || 'both',
      engine: check.command.includes('--webkit') ? 'webkit' : 'chromium', themeIndependent: false,
      reason: 'Retain the existing runner assertions and theme coverage; no equivalence reduction.' }],
  } : check).sort((a, b) => (a.kind !== 'offline') - (b.kind !== 'offline'));
}

module.exports = { checksFor, components, families, inspectionFor, rules, selectComponents };
