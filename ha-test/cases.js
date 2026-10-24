// Canonical case expansion stays in development tooling. HACS never ships this file.
const manifest = require('./cases.json');
const { nativeCases } = require('./native-cases');
const prefix = 'marao_dashboard_test_case_';
const unavailableStates = ['unknown', 'unavailable', 'missing'];
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_');

function concreteCases() {
  const cases = manifest.families.flatMap((family) => family.states.map((state) => {
    const id = `${family.id}_${slug(state)}`;
    let domain = family.source.split('.')[0];
    // Numeric helpers cannot have a non-numeric initial value. Template numbers
    // supply the same native set_value interface for neutral/error cases.
    if (domain === 'input_number' && unavailableStates.includes(state)) domain = 'number';
    const entity = `${domain}.${prefix}${id}`;
    const variables = { ...family.variables };
    if (family.id === 'toggle_graph') variables.toggle_entity = entity;
    if (family.id === 'room') Object.assign(variables, { light_entities: [entity], lights_target_entity: entity, room_navigation_path: '/marao-dashboard/rooms' });
    if (['lock', 'garage'].includes(family.id)) variables.popup_hash = `#marao-dashboard-test-case-${id}`;
    return {
      id, type: family.type || 'custom:marao-card', template: family.template,
      card: family.type === 'custom:marao-energy-period-card' ? { ...family.card, popup_hash: `#marao-dashboard-test-case-${id}` } : { ...family.card },
      name: `${family.name} · ${state}`, source: family.source,
      entity, state,
      disabled: unavailableStates.includes(state), missing: state === 'missing',
      variables,
      ...(family.device_class ? { deviceClass: family.device_class } : {}),
      ...(family.idleHoldProgressHidden ? { idleHoldProgressHidden: true } : {}),
    };
  }));
  for (const familyId of manifest.sliderFamilies) {
    const family = manifest.families.find(({ id }) => id === familyId);
    for (const [position, sliderPercentage] of [['minimum', 0], ['middle', 50], ['maximum', 100]]) {
      const state = familyId === 'cover' ? (sliderPercentage ? 'open' : 'closed') : (sliderPercentage ? 'on' : 'off');
      const base = cases.find((example) => example.id === `${familyId}_${state}`);
      const id = `${familyId}_slider_${position}`;
      cases.push({ ...base, id, entity: `${family.source.split('.')[0]}.${prefix}${id}`, name: `${family.name} · slider ${position}`, sliderPercentage });
    }
  }
  return cases;
}

function walkCards(value, visit) {
  if (!value || typeof value !== 'object') return;
  if (value.type || value.template === 'hc_entity_group_card') visit(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach((item) => walkCards(item, visit));
    else if (child && typeof child === 'object') walkCards(child, visit);
  }
}

function popupCases(view) {
  const cases = [];
  walkCards(view, (card) => {
    if (card.type === 'custom:marao-popup-card') cases.push({ hash: card.hash, name: card.name, entity: card.entity });
  });
  return cases;
}

function expandGallery(source) {
  const editable = structuredClone(manifest.editablePageCases || []);
  const view = structuredClone(source);
  view.entities = [...editable, ...structuredClone(manifest.entityGroupCases || [])];
  view.cards.push(...structuredClone(manifest.cameraLiveCases || []), ...structuredClone(manifest.sectionLayoutCases || []), ...structuredClone(manifest.titleLayoutCases), ...structuredClone(manifest.binaryPresentationCases), ...structuredClone(manifest.problemPresentationCases), ...structuredClone(manifest.energyFormattingCases), ...structuredClone(manifest.roomCompositionCases));
  view.cards.push({type: 'custom:marao-card', template: 'hc_base_card', entity: 'sensor.marao_dashboard_test_energy_format_missing_live', name: 'Simulate source unit loss', show_state: false, tap_action: {action: 'call-service', service: 'marao_test_camera.toggle_energy_unit'}});
  for (const example of manifest.energyFormattingCases.filter(card => card.popup_hash)) {
    const {popup_hash, ...reading} = example;
    view.cards.push({type: 'custom:marao-popup-card', hash: popup_hash, name: example.name, entity: example.entity, cards: [{...reading, popup: true}]});
  }
  view.cards.push({ type: 'custom:marao-card', template: 'hc_vacuum_card', entity: 'vacuum.marao_dashboard_test_vacuum_commands', name: 'Vacuum segment commands', variables: {
    action_1: { icon: 'mdi:door', segment: 21 }, action_2: { icon: 'mdi:sofa', segment: 22 }, action_3: { icon: 'mdi:bed', segment: 23 },
  } });
  for (const [kind, entity, name] of [
    ['hc_light_card', 'light.marao_dashboard_test_onoff_light', 'On/off light'],
    ['hc_fan_card', 'fan.marao_dashboard_test_onoff_fan', 'Single-speed fan'],
  ]) view.cards.push({ type: 'custom:marao-card', template: kind, entity, name });
  for (const [name, ids] of [
    ['Summary · active secondary', ['light.marao_dashboard_test_case_light_off', 'light.marao_dashboard_test_case_light_on']],
    ['Summary · unavailable primary', ['light.marao_dashboard_test_case_light_unavailable', 'light.marao_dashboard_test_case_light_on']],
    ['Summary · all unavailable', ['light.marao_dashboard_test_case_light_unavailable', 'light.marao_dashboard_test_case_light_unknown']],
  ]) view.cards.push({ type: 'custom:marao-card', template: 'hc_navigation_card', entity: ids[0], name,
    icon: 'mdi:lightbulb-group-outline', variables: { summary_entities: ids },
    tap_action: { action: 'navigate', navigation_path: '/marao-dashboard/overview' },
  });
  for (const state of ['unknown', 'unavailable']) view.cards.push({ type: 'custom:marao-card',
    entity: 'media_player.marao_dashboard_test_apple_tv', name: `Remote target · ${state}`, icon: 'mdi:chevron-up',
    show_name: false, show_state: false, show_label: false,
    tap_action: { action: 'perform-action', perform_action: 'remote.send_command', target: { entity_id: `remote.marao_dashboard_test_remote_${state}` }, data: { command: 'up' } },
  });
  view.cards.push({ type: 'vertical-stack', cards: [
    { type: 'custom:marao-card', template: 'hc_title_card', name: 'Compact navigation' },
    { type: 'grid', columns: 2, square: false, cards: [
      ['Iluminação', 'light.marao_dashboard_test_light', 'mdi:lightbulb-group-outline'],
      ['Persianas', 'cover.marao_dashboard_test_cover', 'mdi:window-shutter'],
      ['Climatização', 'climate.marao_dashboard_test_climate', 'mdi:thermostat'],
      ['Manutenção', 'input_number.marao_dashboard_test_battery', 'mdi:wrench'],
      ['Cenários', 'switch.marao_dashboard_test_switch', 'mdi:palette-outline'],
    ].map(([name, entity, icon]) => ({ type: 'custom:marao-card', template: 'hc_navigation_card', name, entity, icon,
      tap_action: { action: 'navigate', navigation_path: '/marao-dashboard/overview' },
    })) },
  ] });
  view.cards.push({type:'custom:marao-popup-card', hash:'#marao-netatmo-camera', entity:'camera.marao_dashboard_test_netatmo', name:'Netatmo camera', cards:[
    {type:'custom:marao-card',template:'hc_camera_card',entity:'camera.marao_dashboard_test_netatmo',show_name:false,tap_action:{action:'fullscreen'}},
    {type:'custom:marao-camera-events-card',entity:'camera.marao_dashboard_test_netatmo',event_provider:'netatmo'},
  ]});
  view.cards.push({ type: 'custom:marao-card', template: 'hc_access_card', entity: 'lock.marao_dashboard_test_lock', name: 'Access · inline slider', variables: { access_mode: 'slide' } });
  const valueSliders = concreteCases().filter((entry) => entry.sliderPercentage === 50);
  const valueSliderHash = '#marao-dashboard-test-value-sliders-popup';
  view.cards.push({ type: 'custom:marao-card', template: 'hc_bubble_popup_card', entity: valueSliders[0].entity, name: 'Value slider touch tests', variables: { popup_hash: valueSliderHash } });
  view.cards.push({ type: 'custom:marao-popup-card', hash: valueSliderHash, entity: valueSliders[0].entity, name: 'Value slider touch tests', height: '50dvh', cards: [{
    type: 'grid', columns: 1, square: false,
    cards: valueSliders.map(({ type, template, entity, name, variables }) => ({ type, template, entity, name, variables })),
  }] });
  const tallHash = '#marao-dashboard-test-tall-controls-popup';
  view.cards.push({ type: 'custom:marao-card', template: 'hc_bubble_popup_card', entity: valueSliders[0].entity, name: 'Tall controls popup', variables: { popup_hash: tallHash } });
  view.cards.push({ type: 'custom:marao-popup-card', hash: tallHash, entity: valueSliders[0].entity, name: 'Tall controls popup', height: '100dvh', max_height: '100dvh', cards: valueSliders.map(({ type, template, entity, name, variables }) => ({ type, template, entity, name, variables })) });
  const mediaControls = view.cards.find((card) => card.hash === '#marao-dashboard-test-generic-media-popup').cards[0];
  for (const state of ['unknown', 'unavailable']) {
    view.cards.push({ type: 'vertical-stack', cards: [
      { type: 'custom:marao-card', template: 'hc_title_card', name: `Generic media controls · ${state}` },
      { ...mediaControls, columns: 2, cards: mediaControls.cards.map((card) => ({ ...card, entity: `media_player.${prefix}media_${state}` })) },
    ] });
  }
  view.cards.push({ type: 'grid', columns: 2, square: false, cards: [
    { type: 'custom:marao-card', template: 'hc_access_slide_action_card', entity: 'lock.marao_dashboard_test_lock', name: 'Narrow unlock slide', variables: { action_service: 'lock.unlock', action_label_key: 'common.unlock' } },
    { type: 'custom:marao-card', template: 'hc_access_slide_action_card', entity: 'cover.marao_dashboard_test_open_only_door', name: 'Narrow open slide', variables: { action_service: 'cover.open_cover', action_label_key: 'common.open' } },
  ] });
  view.cards.push({ type: 'vertical-stack', cards: [
    { type: 'custom:marao-card', template: 'hc_title_card', name: 'Independent state cases', show_state: false },
    ...concreteCases().map(({ type, template, name, entity, variables, card }) => ({ type, ...(template ? { template } : {}), name, entity, variables, ...card })),
  ] });
  for (const example of concreteCases().filter((entry) => entry.variables.popup_hash)) {
    const lock = example.entity.startsWith('lock.');
    view.cards.push({ type: 'custom:marao-popup-card', hash: example.variables.popup_hash, name: example.name, entity: example.entity, cards: [
      { type: 'custom:marao-card', template: 'hc_access_slide_action_card', entity: example.entity, name: lock ? 'Unlock' : 'Open', variables: { action_service: lock ? 'lock.unlock' : 'cover.open_cover', action_label_key: lock ? 'common.unlock' : 'access.open' } },
      { type: 'custom:marao-card', template: 'hc_access_action_card', entity: example.entity, name: lock ? 'Lock' : 'Close', variables: { action_service: lock ? 'lock.lock' : 'cover.close_cover', action_label_key: lock ? 'common.lock' : 'common.close' } },
    ] });
  }
  for (const example of concreteCases().filter((entry) => entry.type === 'custom:marao-energy-period-card')) {
    view.cards.push({ type: 'custom:marao-popup-card', hash: example.card.popup_hash, name: example.name, entity: example.entity, cards: [
      { type: example.type, name: example.name, entity: example.entity, period: 'day', popup: true },
    ] });
  }
  view.cards.push({ type: 'custom:marao-card', template: 'hc_climate_card', name: manifest.dualClimateCase.name, entity: manifest.dualClimateCase.entity, variables: { show_mode_buttons: true } });
  for (const example of manifest.climateFeedbackCases) {
    view.cards.push({ type: 'custom:marao-card', template: 'hc_climate_card', name: example.name, entity: example.entity, variables: { show_mode_buttons: true } });
  }
  const delayedClimate = manifest.climateFeedbackCases.find(example => example.id === 'delayed_confirmation');
  const climateHash = '#marao-dashboard-test-feedback-climate';
  view.cards.push({ type: 'custom:marao-card', template: 'hc_climate_card', name: 'Delayed climate duplicate', entity: delayedClimate.entity, variables: { mode_selector_hash: climateHash } });
  view.cards.push({ type: 'custom:marao-popup-card', name: delayedClimate.name, hash: climateHash, entity: delayedClimate.entity, cards: [
    { type: 'custom:marao-card', template: 'hc_climate_card', name: delayedClimate.name, entity: delayedClimate.entity, variables: { show_mode_buttons: true } },
  ] });
  view.cards.push({ type: 'custom:marao-card', template: 'hc_room_card', name: manifest.groupCase.name, entity: manifest.groupCase.entity, variables: { light_entities: manifest.groupCase.entities }, tap_action: { action: 'navigate', navigation_path: '/marao-dashboard/rooms' } });
  view.cards.push({ type: 'custom:marao-card', template: 'hc_base_card', name: manifest.actionErrorCase.name, entity: manifest.actionErrorCase.entity, tap_action: { action: 'call-service', service: manifest.actionErrorCase.service } });
  view.cards.push({ type: 'custom:marao-card', template: 'hc_switch_card', name: 'Simulate safe action failure', entity: 'input_boolean.marao_dashboard_test_action_failure' });
  for (const example of manifest.historyCases) {
    view.cards.push({ type: 'custom:marao-card', template: 'hc_graph_card', entity: example.entity, name: `Graph history · ${example.id}` });
    view.cards.push({ type: 'custom:marao-energy-period-card', entity: example.entity, name: `Energy history · ${example.id}`, period: 'day', popup: true });
    view.cards.push({ type: 'custom:marao-state-timeline-card', entity: example.entity, name: `Timeline history · ${example.id}` });
    if (example.id === 'error') {
      for (const [kind, type] of [['Energy', 'custom:marao-energy-period-card'], ['Timeline', 'custom:marao-state-timeline-card']]) {
        const name = `${kind} history Retry popup`, hash = `#marao-dashboard-test-${kind.toLowerCase()}-history-retry`;
        view.cards.push({ type: 'custom:marao-card', template: 'hc_bubble_popup_card', entity: example.entity, name, variables: { popup_hash: hash } });
        view.cards.push({ type: 'custom:marao-popup-card', entity: example.entity, name, hash, cards: [{ type, entity: example.entity, name, ...(kind === 'Energy' ? { period: 'day', popup: true } : {}) }] });
      }
    }
  }
  for (let count = 1; count <= 5; count += 1) {
    const names = ['one', 'two', 'three', 'four', 'five'];
    view.cards.push({ type: 'custom:marao-card', template: 'hc_scene_card', name: `Scene with ${names[count - 1]} option${count > 1 ? 's' : ''}`, entity: `input_select.${prefix}scene_options_${count}` });
  }
  for (const [name, variables] of [
    ['Graph line only', { show_graph_fill: false }],
    ['Graph fill only', { show_graph_line: false }],
  ]) view.cards.push({ type: 'custom:marao-card', template: 'hc_graph_card', name, entity: 'sensor.marao_dashboard_test_graph_history', variables });
  for (const example of manifest.eventCases) {
    const hash = `#marao-dashboard-test-events-${example.id}`;
    view.cards.push({ type: 'custom:marao-card', template: 'hc_navigation_card', name: example.name, entity: 'camera.marao_dashboard_test_camera', tap_action: { action: 'navigate', navigation_path: hash } });
    view.cards.push({ type: 'custom:marao-popup-card', hash, name: example.name, entity: 'camera.marao_dashboard_test_camera', height: 'auto', max_height: '100%', cards: [{
      type: 'custom:marao-camera-events-card', entity: example.entity || 'camera.marao_dashboard_test_camera', title: example.name,
      event_provider: example.provider, frigate_instance_id: 'marao_test', frigate_camera: example.camera,
      ...(example.source ? { unifi_protect_media_source: example.source } : {}),
    }] });
  }
  view.cards.push({ type: 'vertical-stack', cards: [
    { type: 'custom:marao-card', template: 'hc_title_card', name: 'Native Home Assistant cards' },
    ...nativeCases(view, manifest, walkCards),
  ] });
  return view;
}

function expandHelpers(source) {
  const helpers = structuredClone(source);
  const alarm = helpers.template.flatMap(group => group.alarm_control_panel || []).find(entity => entity.unique_id === 'marao_dashboard_test_alarm');
  for (const format of ['text', 'no_code']) {
    const id = 'marao_dashboard_test_alarm_' + format;
    helpers.template.push({ alarm_control_panel: [{ ...structuredClone(alarm), name: 'Safe alarm ' + format,
      unique_id: id, default_entity_id: 'alarm_control_panel.' + id, code_format: format, code_arm_required: format !== 'no_code' }] });
  }
  const templates = new Map();
  for (const block of source.template || []) for (const [domain, values] of Object.entries(block)) {
    if (!Array.isArray(values) || domain === 'trigger') continue;
    for (const value of values) templates.set(value.default_entity_id || `${domain}.${slug(value.name)}`, { domain, value });
  }
  const templateEntities = {};
  function addTemplate(domain, value) { (templateEntities[domain] ||= []).push(value); }
  for (let index = 1; index <= 30; index++) {
    const key = `marao_dashboard_test_maintenance_battery_${index}`;
    addTemplate('sensor', { name: `Maintenance battery ${index}`, unique_id: key,
      default_entity_id: `sensor.${key}`, device_class: 'battery', unit_of_measurement: '%',
      state: "{{ states('input_number.marao_dashboard_test_battery') }}" });
  }
  for (const domain of ['light', 'fan']) {
    const key = `marao_dashboard_test_onoff_${domain}`;
    helpers.input_boolean[key] = { name: `Marao Dashboard Test OnOff ${domain}` };
    addTemplate(domain, {
      name: `Marao Dashboard Test OnOff ${domain}`, unique_id: key,
      default_entity_id: `${domain}.${key}`,
      state: `{{ is_state('input_boolean.${key}', 'on') }}`,
      turn_on: [{ action: 'input_boolean.turn_on', target: { entity_id: `input_boolean.${key}` } }],
      turn_off: [{ action: 'input_boolean.turn_off', target: { entity_id: `input_boolean.${key}` } }],
    });
  }
  for (const example of concreteCases()) {
    if (example.missing) continue;
    const [domain, key] = example.entity.split('.');
    const sourceDomain = example.source.split('.')[0];
    const name = key.replaceAll('_', ' ');
    if (['climate', 'camera', 'media_player'].includes(domain)) {
      helpers[domain].push({ platform: { climate: 'marao_test_climate', camera: 'marao_test_camera', media_player: 'marao_test_media' }[domain], name, initial_state: example.state });
      continue;
    }
    if (domain === 'number') {
      const control = `${key}_control_0`;
      helpers.input_number[control] = { ...source.input_number[example.source.split('.')[1]], name: `${name} control`, initial: 0 };
      helpers.input_number[control].initial = helpers.input_number[control].min;
      addTemplate('number', { name, unique_id: key, default_entity_id: example.entity, state: '{{ none }}', availability: example.state === 'unavailable' ? '{{ false }}' : '{{ true }}', min: 0, max: 100, step: 1, set_value: [{ action: 'input_number.set_value', target: { entity_id: `input_number.${control}` }, data: { value: '{{ value }}' } }] });
      continue;
    }
    if (['input_number', 'input_select'].includes(sourceDomain)) {
      const value = structuredClone(source[sourceDomain][example.source.split('.')[1]]);
      value.name = name;
      value.initial = sourceDomain === 'input_number' ? Number(example.state) : example.state;
      if (sourceDomain === 'input_select' && !value.options.includes(example.state)) value.options.push(example.state);
      helpers[sourceDomain][key] = value;
      continue;
    }
    const original = templates.get(example.source);
    if (!original) throw new Error(`Case source lacks a fixture template: ${example.source}`);
    let serialized = JSON.stringify(original.value);
    const dependencies = [...new Set(serialized.match(/input_(?:boolean|number|select)\.marao_dashboard_test_[a-z0-9_]+/g) || [])];
    const sliderField = { light: 'level', fan: 'percentage', cover: 'position' }[domain];
    const sliderDependency = dependencies.find(dependency => original.value[sliderField]?.includes(dependency));
    for (const [index, dependency] of dependencies.entries()) {
      const [helperDomain, helperKey] = dependency.split('.');
      const replacementKey = `${key}_control_${index}`;
      const value = structuredClone(source[helperDomain][helperKey]);
      value.name = replacementKey.replaceAll('_', ' ');
      if (helperDomain === 'input_boolean') value.initial = ['on', 'locked'].includes(example.state);
      if (helperDomain === 'input_number') {
        const number = Number(example.state);
        if (domain === 'light' && dependency !== sliderDependency) value.initial ??= value.min;
        else value.initial = Number.isFinite(number) ? number : ['off', 'closed'].includes(example.state) ? value.min : Math.max(value.min, Math.min(value.max, helperKey.includes('brightness') ? 128 : 50));
        if (example.sliderPercentage !== undefined && dependency === sliderDependency) value.initial = Math.max(value.min, Math.min(value.max, Math.round(example.sliderPercentage * (helperKey.includes('brightness') ? 255 : 100) / 100)));
      }
      if (helperDomain === 'input_select') {
        if (!value.options.includes(example.state)) value.options.push(example.state);
        value.initial = example.state;
      }
      helpers[helperDomain][replacementKey] = value;
      serialized = serialized.replaceAll(dependency, `${helperDomain}.${replacementKey}`);
    }
    const fixture = JSON.parse(serialized);
    fixture.name = name;
    fixture.unique_id = key;
    fixture.default_entity_id = example.entity;
    if (example.deviceClass) fixture.device_class = example.deviceClass;
    const stateField = domain === "weather" ? "condition" : "state";
    if (example.state === 'unavailable') fixture.availability = '{{ false }}';
    else if (example.state === 'unknown') {
      fixture[stateField] = '{{ none }}';
      // Cover state derives from position when present, even with a None state.
      for (const value of ['position', 'tilt']) if (value in fixture) fixture[value] = '{{ none }}';
    }
    else if ((['locking', 'unlocking', 'opening', 'closing', 'jammed'].includes(example.state) || (domain === 'lock' && example.state === 'open'))) fixture[stateField] = example.state;
    else if (!dependencies.length) fixture[stateField] = example.state;
    addTemplate(domain, fixture);
  }
  for (const { entity, id, name, ...options } of manifest.climateFeedbackCases) {
    helpers.climate.push({ platform: 'marao_test_climate', name: entity.split('.')[1].replaceAll('_', ' '), ...options });
  }
  for (const [domain, entities] of Object.entries(templateEntities)) helpers.template.push({ [domain]: entities });
  for (let count = 1; count <= 5; count += 1) helpers.input_select[`${prefix}scene_options_${count}`] = {
    name: `Marao scene options ${count}`, options: ['Relax', 'Movie', 'Dinner', 'Night', 'Off'].slice(0, count), initial: 'Relax',
  };
  return helpers;
}

function validateCoverage(view) {
  const cards = [];
  walkCards(view, (card) => cards.push(card));
  const failures = [];
  const surface = manifest.nativeSurfaceCase;
  if (!cards.some(card => card.name === surface.name && card.entity === surface.entity)) failures.push('Missing native-surface retention case');
  for (const example of manifest.cameraLiveCases || []) if (!cards.some(card => card.name === example.name && card.entity === example.entity)) failures.push(`Missing camera live case ${example.name}`);
  for (const example of manifest.sectionLayoutCases || []) for (const child of example.cards) if (child.name && !cards.some(card => card.name === child.name)) failures.push(`Missing section case ${child.name}`);
  for (const template of manifest.requiredTemplates) if (!cards.some((card) => card.template === template)) failures.push(`Missing template ${template}`);
  for (const name of manifest.requiredOptions) if (!cards.some((card) => card.name === name)) failures.push(`Missing option example ${name}`);
  for (const group of manifest.entityGroupCases || []) if (!cards.some(card => card.template === 'hc_entity_group_card' && card.id === group.id && card.name === group.name)) failures.push(`Missing Entity Group ${group.id}`);
  for (const example of concreteCases()) if (!cards.some((card) => card.entity === example.entity && card.type === example.type && card.template === example.template && card.name === example.name)) failures.push(`Missing state case ${example.id}`);
  for (const example of manifest.historyCases) for (const kind of ['Energy', 'Timeline']) if (!cards.some((card) => card.entity === example.entity && card.name === `${kind} history · ${example.id}`)) failures.push(`Missing ${kind} history case ${example.id}`);
  return failures;
}

// Preparation applies these services on every run. They also give Recorder real
// safe state changes without direct database writes or invented history records.
const baseline = [
  ['scene', 'turn_on', { entity_id: 'scene.marao_dashboard_test_native_scene' }],
  ['input_boolean', 'turn_off', { entity_id: 'input_boolean.marao_dashboard_test_one' }],
  ['marao_test_camera', 'reset', {}],
  ['light', 'turn_on', { entity_id: 'light.marao_dashboard_test_light', brightness_pct: 50 }],
  ['light', 'turn_off', { entity_id: 'light.marao_dashboard_test_room_light' }],
  ['light', 'turn_off', { entity_id: 'light.marao_dashboard_test_onoff_light' }],
  ['input_boolean', 'turn_on', { entity_id: 'input_boolean.marao_dashboard_test_action_failure' }],
  ['input_boolean', 'turn_on', { entity_id: 'input_boolean.marao_dashboard_test_media_failure' }],
  ['input_boolean', 'turn_on', { entity_id: 'input_boolean.marao_dashboard_test_appliance_warning' }],
  ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_temperature', value: 21 }],
  ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_power', value: 450 }],
  ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_battery', value: 75 }],
  ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_humidity', value: 48 }],
  ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_number', value: 25 }],
  ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_wallbox_current', value: 12 }],
  ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_month_energy', value: 230 }],
  ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_today_energy', value: 9 }],
  ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_month_cost', value: 58 }],
  ['input_number', 'set_value', { entity_id: 'input_number.marao_dashboard_test_today_cost', value: 2.3 }],
  ['lock', 'unlock', { entity_id: 'lock.marao_dashboard_test_lock' }],
  ['lock', 'lock', { entity_id: 'lock.marao_dashboard_test_lock' }],
];

module.exports = { manifest, concreteCases, popupCases, expandGallery, expandHelpers, validateCoverage, baseline, walkCards };
