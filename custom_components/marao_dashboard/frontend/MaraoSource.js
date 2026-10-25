import { canonicalCard, canonicalTemplate } from './MaraoNames.js';

export const SOURCE_VERSION = 2;
export const LEGACY_NATIVE_TARGET_VERSION = 2;
export const ENVELOPE_VERSION = 1;
export const COMPILER_CONTRACT = 1;
export const STRATEGY_TYPE = 'custom:marao-dashboard';
export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const copy = value => structuredClone(value);
export const slug = value => String(value || 'dashboard').normalize('NFKD').replace(/[^\x00-\x7F]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dashboard';
export const friendly = value => String(value || '').split('.').at(-1).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
export const domain = value => String(value || '').split('.')[0];
export const DOMAIN_TEMPLATES = Object.freeze({ binary_sensor: 'md_sensor_card', camera: 'md_camera_card', climate: 'md_climate_card', cover: 'md_cover_card', fan: 'md_fan_card', input_boolean: 'md_switch_card', input_number: 'md_number_card', light: 'md_light_card', lock: 'md_access_card', media_player: 'md_media_card', number: 'md_number_card', sensor: 'md_sensor_card', switch: 'md_switch_card', vacuum: 'md_vacuum_card' });

export class SourceError extends Error {
  constructor(code, path, details = {}) {
    super(code);
    this.name = 'SourceError'; this.code = code; this.path = path; this.details = details;
  }
}

const fail = (code, path, details) => { throw new SourceError(code, path, details); };
const own = (value, key) => Object.hasOwn(value, key);

export function formatVersion(source) {
  if (!object(source)) fail('source_object', '$');
  const version = own(source, 'config_version') ? source.config_version : 0;
  if (!Number.isSafeInteger(version) || version < 0) fail('source_version_invalid', '$.config_version');
  if (version > SOURCE_VERSION) fail('source_version_future', '$.config_version', { version });
  return version;
}

export function parseSource(text) {
  let value;
  const imprecise = new WeakMap();
  try { value = JSON.parse(text,function(key,value,context) {
    if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) {
      const raw = context?.source, serialized = JSON.stringify(value);
      if (!raw || /^-?\d+$/.test(raw) && (!/^-?\d+$/.test(serialized) || BigInt(raw) !== BigInt(serialized))) {
        if (!imprecise.has(this)) imprecise.set(this,new Set());
        imprecise.get(this).add(key);
      }
    }
    return value;
  }); } catch { fail('json_invalid', '$'); }
  function finite(item, path) {
    if (typeof item === 'number' && !Number.isFinite(item)) fail('number_invalid', path);
    if (Array.isArray(item)) item.forEach((child, index) => { const next = `${path}[${index}]`; if (imprecise.get(item)?.has(String(index))) fail('number_precision',next); finite(child,next); });
    else if (object(item)) Object.entries(item).forEach(([key, child]) => {const next = `${path}.${key}`;if (imprecise.get(item)?.has(key)) fail('number_precision',next);finite(child,next);});
  }
  finite(value, '$');
  if (!object(value)) fail('source_object', '$');
  return value;
}

export function entries(spec) {
  if (spec == null) return [];
  if (typeof spec === 'string') return [{ entity_id: spec }];
  if (Array.isArray(spec)) return spec.flatMap(entries);
  if (object(spec)) return ['entity_id', 'page', 'template'].some(key => own(spec, key)) ? [canonicalCard(copy(spec))] : Object.values(spec).flatMap(entries);
  fail('entities_invalid', '$');
}

export function sections(page) {
  if (!own(page, 'sections')) return [page];
  if (['entities', 'cards', 'columns'].some(key => own(page, key))) fail('sections_mixed', '$.pages');
  if (!Array.isArray(page.sections) || page.sections.some(section => !object(section) || own(section, 'sections'))) fail('sections_invalid', '$.pages');
  return page.sections;
}

export function isAccess(entity) {
  const kind = domain(entity.entity_id);
  return kind === 'lock' || kind === 'cover' && (canonicalTemplate(entity.template) === 'md_access_card' || ['door', 'garage', 'gate'].includes(entity.device_class) || /door|garage|gate/.test(`${entity.entity_id} ${entity.name || ''}`.toLowerCase()));
}

export function defaultTemplate(entity) {
  if (isAccess(entity)) return 'md_access_card';
  if (domain(entity.entity_id) === 'cover' && entity.device_class === 'damper') return 'md_fan_card';
  if (domain(entity.entity_id) === 'sensor' && entity.device_class === 'battery') return 'md_battery_card';
  return DOMAIN_TEMPLATES[domain(entity.entity_id)] || ({ weather: 'md_weather_card', alarm_control_panel: 'md_security_card', button: 'md_access_hold_action_card', scene: 'md_switch_card' })[domain(entity.entity_id)];
}

function canonicalEntities(value) {
  if (Array.isArray(value)) return value.map(canonicalEntities);
  if (!object(value)) return value;
  if (['entity_id', 'page', 'template'].some(key => own(value, key))) {
    const card = canonicalCard(value);
    return ['md_entity_group_card', 'md_scene_collection_card'].includes(card.template) && own(card, 'entities') ? { ...card, entities: canonicalEntities(card.entities) } : card;
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, canonicalEntities(child)]));
}

function canonicalRaw(card) {
  if (!object(card)) return card;
  const containers = ['vertical-stack', 'horizontal-stack', 'grid', 'conditional', 'custom:marao-control-grid', 'custom:marao-popup-card', 'custom:marao-native-popup-card'];
  if (!containers.includes(card.type) && !String(card.type).startsWith('custom:marao-')) return card;
  const result = { ...canonicalCard(card) };
  if (containers.includes(card.type)) {
    if (Array.isArray(card.cards)) result.cards = card.cards.map(canonicalRaw);
    if (card.type === 'conditional' && object(card.card)) result.card = canonicalRaw(card.card);
  }
  if (['md_entity_group_card', 'md_scene_collection_card'].includes(result.template) && own(result, 'entities')) result.entities = canonicalEntities(result.entities);
  return result;
}

function canonicalSource(source) {
  for (const page of source.pages) for (const section of sections(page)) {
    if (own(section, 'entities')) section.entities = canonicalEntities(section.entities);
    if (own(section, 'cards')) section.cards = section.cards.map(canonicalRaw);
  }
  return source;
}

function explicitMembership(source, context) {
  validateLegacy(source);
  if (!Array.isArray(source.rooms || [])) fail('rooms_invalid', '$.rooms');
  const registry = context.entities;
  const known = new Map((context.areas || []).map(area => [area.area_id, area.name]));
  for (const entity of registry || []) for (const prefix of ['', 'device_']) if (entity[prefix + 'area_id']) {
    const id = entity[prefix + 'area_id'];
    if (!known.has(id)) known.set(id, entity[prefix + 'area_name']);
  }
  for (const [index, room] of (source.rooms || []).entries()) {
    const path = `$.rooms[${index}]`;
    if (!object(room)) fail('room_invalid', path);
    const hint = room.area;
    const matches = typeof hint === 'string' && known.has(hint) ? [hint] : [...known].filter(([, name]) => hint && name && slug(hint) === slug(name)).map(([id]) => id);
    if (matches.length === 1) room.area = matches[0];
    if (!own(room, 'entities') && hint) {
      const answer = context.roomEntities?.[index];
      if (answer !== undefined) {
        if (!Array.isArray(answer)) fail('entities_invalid', path + '.entities');
        room.entities = copy(answer);
      } else {
        if (!Array.isArray(registry) || matches.length !== 1) fail('room_members_needed', path, { index, name: room.name || '', area: hint });
        const belongs = entity => (entity.area_id || entity.device_area_id) === room.area;
        if (registry.some(entity => belongs(entity) && !own(entity, 'has_state'))) fail('room_members_needed', path, { index, name: room.name || '', area: hint });
        room.entities = registry.filter(entity => belongs(entity) && !entity.disabled_by && !entity.hidden_by && entity.has_state === true && own(DOMAIN_TEMPLATES, domain(entity.entity_id))).map(entity => entity.entity_id);
      }
    }
    room.entities ??= [];
    if (!['include', 'exclude', 'overrides'].some(key => own(room, key))) continue;
    const selected = entries(room.entities);
    for (const extra of entries(room.include)) {
      const indexes = selected.map((value, i) => value.entity_id && value.entity_id === extra.entity_id ? i : -1).filter(i => i >= 0);
      if (!indexes.length) selected.push(extra);
      else for (const i of indexes) selected[i] = { ...selected[i], ...extra };
    }
    const excluded = new Set(entries(room.exclude).map(item => item.entity_id));
    if (room.overrides != null && !object(room.overrides)) fail('overrides_invalid', path + '.overrides');
    const hadStructured = object(room.entities) || entries(room.include).some(item => Object.keys(item).length > 1);
    room.entities = selected.filter(item => !excluded.has(item.entity_id)).map(item => {
      const override = room.overrides?.[item.entity_id];
      const value = object(override) ? { ...item, ...override, entity_id: item.entity_id } : item;
      return !hadStructured && Object.keys(value).length === 1 ? value.entity_id : value;
    });
    delete room.include; delete room.exclude; delete room.overrides;
  }
  validateLegacy(source);
  return source;
}

function validateLegacy(source) {
  if (typeof source.name !== 'string' || !source.name.trim()) fail('source_name_needed', '$.name');
  if (own(source, 'rooms') && !Array.isArray(source.rooms)) fail('rooms_invalid', '$.rooms');
  if (own(source, 'pages') && (!object(source.pages) || own(source.pages, 'sections'))) fail('pages_invalid', '$.pages');
  for (const [index, room] of (source.rooms || []).entries()) {
    const path = `$.rooms[${index}]`;
    if (!object(room) || typeof room.name !== 'string' || !room.name.trim()) fail('room_invalid', path);
    if (own(room, 'entities')) entries(room.entities);
  }
}

const LEGACY_NAMES = Object.freeze({ home: 'Home', rooms: 'Rooms', security: 'Security', energy: 'Energy', wallbox: 'Wallbox', media: 'Media', lights: 'Lights', blinds: 'Blinds', climate: 'Climate', maintenance: 'Maintenance' });
const onlyEntities = value => entries(value).filter(item => typeof item.entity_id === 'string');

function legacyContainer(source, kind, registry) {
  if (!object(source) || typeof source.name !== 'string' || !source.name.trim()) fail('container_name_needed', '$');
  const values = onlyEntities(source.entities);
  const metadata = new Map((registry || []).map(entity => [entity.entity_id, entity]));
  const byDomain = new Map();
  for (const item of values) if (own(DOMAIN_TEMPLATES, domain(item.entity_id))) {
    const value = { ...metadata.get(item.entity_id), ...item, name: item.name || metadata.get(item.entity_id)?.name || friendly(item.entity_id) };
    const list = byDomain.get(domain(item.entity_id)) || [];
    list.push(value); byDomain.set(domain(item.entity_id), list);
  }
  return { ...source, path: source.path || (kind === 'room' ? `room-${slug(source.name)}` : slug(source.name)), icon: source.icon || (kind === 'room' ? 'mdi:sofa-outline' : 'mdi:file-outline'), byDomain };
}

function legacyAll(rooms, kind) {
  const selected = new Map();
  for (const room of rooms) for (const entity of kind ? room.byDomain.get(kind) || [] : [...room.byDomain.values()].flat()) if (!selected.has(entity.entity_id)) selected.set(entity.entity_id, entity);
  return [...selected.values()];
}

function legacyGroups(rooms) {
  const originals = new Map();
  for (const room of rooms) for (const item of onlyEntities(room.entities)) if (!originals.has(item.entity_id)) originals.set(item.entity_id, item);
  return [
    ['light', 'lights', 'mdi:lightbulb-group-outline'], ['cover', 'blinds', 'mdi:window-shutter'],
    ['climate', 'climate', 'mdi:thermostat'], ['battery', 'maintenance', 'mdi:wrench'],
  ].flatMap(([kind, name, icon]) => {
    const members = kind === 'battery' ? legacyAll(rooms, 'sensor').filter(item => item.device_class === 'battery' || item.entity_id.includes('battery')) : legacyAll(rooms, kind).filter(item => kind !== 'cover' || (item.template || defaultTemplate(item)) !== 'md_fan_card');
    if (!members.length) return [];
    return [{ template: 'md_entity_group_card', id: `overview-${name}`, name: LEGACY_NAMES[name], icon, entity_type: kind, popup_filter: kind === 'light' ? 'active' : 'all', entities: members.map(item => {
      const original = copy(originals.get(item.entity_id) || { entity_id: item.entity_id });
      return Object.keys(original).length === 1 ? original.entity_id : original;
    }) }];
  });
}

export function appleTVOptions(entity) {
  if (entity.apple_tv === false) return null;
  const options = object(entity.apple_tv) ? entity.apple_tv : {};
  const identity = ['entity_id', 'name', 'model', 'device_model', 'manufacturer'].map(key => entity[key] || '').join(' ').toLowerCase();
  if (!entity.apple_tv && entity.media_type !== 'apple_tv' && !/apple tv|apple_tv|appletv/.test(identity)) return null;
  return { remote_entity: options.remote_entity || entity.remote_entity || `remote.${entity.entity_id.split('.')[1]}`, volume_remote_entity: options.volume_remote_entity || entity.volume_remote_entity || null, apps: own(options, 'apps') ? options.apps : entity.apple_tv_apps || [] };
}

function orderedPages(source, context) {
  validateLegacy(source);
  if (source.config_version !== 1 || source.pages != null && !object(source.pages)) fail('legacy_pages_invalid', '$.pages');
  if (typeof source.name !== 'string' || !source.name.trim()) fail('name_needed', '$.name');
  const rooms = (source.rooms || []).map(room => legacyContainer(room, 'room', context.entities));
  const savedPages = source.pages || {}, overview = source.overview || {};
  const result = copy(source);
  delete result.overview; delete result.rooms;
  Object.assign(result, { slug: slug(source.slug || source.name), theme: ['Marao Dashboard Gold', 'Marao Dashboard Peach'].includes(source.theme) ? 'Marao Dashboard' : source.theme || 'Marao Dashboard', icon: source.icon || 'marao_dashboard:mountain', landing_page: 'overview', pages: [], legacy_page_options: { ...copy(source.legacy_page_options || {}), overview: copy(overview), pages: copy(savedPages) } });
  const page = (path, name, icon, output) => {
    const value = { id: path, name, name_key: `nav.${path === 'overview' ? 'home' : path}`, path, icon, output_path: output, sections: [] };
    result.pages.push(value); return value;
  };
  const count = target => target.sections.reduce((sum, section) => sum + section.entities.length, 0);
  const section = (target, descriptors, columns = 1) => { if (descriptors.length) target.sections.push({ columns, entities: descriptors }); };
  const card = (target, value, template, name, icon, variables, nameKey) => {
    const entity = copy(onlyEntities(value)[0] || {});
    if (entity.variables != null && !object(entity.variables)) fail('options_invalid', '$');
    entity.template ??= template;
    if (name !== undefined) entity.name ??= name;
    else if (entity.entity_id) entity.name ??= friendly(entity.entity_id);
    if (icon !== undefined) entity.icon ??= icon;
    if (variables !== undefined) entity.variables = { ...variables, ...entity.variables };
    if (nameKey && !(onlyEntities(value)[0] || {}).name) entity.name_key = nameKey;
    entity.id ??= `card-${count(target) + 1}`;
    return entity;
  };
  const first = (options, key) => onlyEntities(options[key])[0];
  const home = page('overview', 'Home', 'mdi:home-variant', 'views/main/00-overview.yaml');
  if (overview.weather_entity) {
    const weather = card(home, overview.weather_entity, 'md_weather_card', undefined, undefined, { show_forecast: true });
    if (typeof overview.weather_entity === 'string') delete weather.name;
    section(home, [weather]);
  }
  const groups = copy(own(overview, 'entity_groups') ? overview.entity_groups : legacyGroups(rooms));
  if (!Array.isArray(groups)) fail('groups_invalid', '$.overview.entity_groups');
  for (const group of groups) {
    const hash = group.variables?.popup_hash || (group.id.startsWith('overview-') ? `#${group.id}` : `#entity-group-${group.id}`);
    group.variables = { popup_hash: hash, ...group.variables };
    if (!own(overview, 'entity_groups')) group.name_key = `overview.${group.id.slice('overview-'.length)}`;
  }
  if (onlyEntities(overview.scenes).length) groups.push({ id: `card-${count(home) + groups.length + 1}`, template: 'md_scene_collection_card', name: 'Scenes', name_key: 'overview.scenes', icon: 'mdi:palette-outline', entities: copy(overview.scenes), variables: { popup_hash: '#overview-scenes' } });
  section(home, groups, 2);
  const roomsPage = page('rooms', 'Rooms', 'mdi:sofa', 'views/main/02-rooms.yaml');
  roomsPage.sections = [{ columns: 2, entities: rooms.map((room, index) => {
    const lights = room.byDomain.get('light') || [], primary = (lights[0] || [...room.byDomain.values()].flat()[0])?.entity_id || '';
    return { id: `card-${index + 1}`, template: 'md_room_card', ...(primary ? { entity_id: primary } : {}), name: room.name, icon: room.icon, page: room.path, variables: { light_entities: lights.map(item => item.entity_id), lights_target_entity: primary } };
  }) }];
  const selectedById = new Map();
  for (const room of source.rooms || []) for (const entity of onlyEntities(room.entities)) if (!selectedById.has(entity.entity_id)) selectedById.set(entity.entity_id, entity);
  if (own(savedPages, 'security')) {
    const target = page('security', 'Security', 'mdi:shield-home', 'views/main/01-security.yaml'), options = savedPages.security;
    const alarm = first(options, 'alarm_entity');
    if (alarm) section(target, [card(target, alarm, 'md_security_card')]);
    const access = (own(options, 'access_entities') ? onlyEntities(options.access_entities) : legacyAll(rooms).filter(isAccess)).map((entity, index) => {
      const selected = own(options, 'access_entities') ? entity : selectedById.get(entity.entity_id) || { entity_id: entity.entity_id };
      return { ...card(target, selected, 'md_access_card'), id: `card-${count(target) + index + 1}` };
    });
    section(target, access, 2);
    for (const entity of onlyEntities(options.actions)) {
      const item = card(target, entity, isAccess(entity) ? 'md_access_card' : 'md_access_hold_action_card');
      item.template = isAccess(entity) ? 'md_access_card' : 'md_access_hold_action_card';
      if (!isAccess(entity)) Object.assign(item, { show_state: false, tap_action: domain(entity.entity_id) === 'button' ? { action: 'perform-action', perform_action: 'button.press', target: { entity_id: entity.entity_id }, haptic: 'heavy' } : { action: 'toggle', haptic: 'heavy' } });
      section(target, [item]);
    }
  }
  if (own(savedPages, 'energy')) {
    const target = page('energy', 'Energy', 'mdi:lightning-bolt', 'views/main/03-energy.yaml'), options = savedPages.energy;
    const house = first(options, 'house_power');
    if (house) {
      const item = card(target, house, 'md_graph_card', 'House Power', 'mdi:flash', { show_graph_fill: true, show_graph_line: true, show_icon: true }, 'energy.house_power');
      item.variables = { ...item.variables, history_popup: true, popup_hash: house.variables?.popup_hash || '#energy-house-power' }; section(target, [item]);
    }
    for (const [key, name, period, icon, hash] of [['month_energy', 'Month Power', 'month', 'mdi:flash', 'month-power'], ['today_energy', 'Today Power', 'day', 'mdi:flash-outline', 'today-power'], ['month_cost', 'Month Cost', 'month', 'mdi:currency-eur', 'month-cost'], ['today_cost', 'Today Cost', 'day', 'mdi:cash-clock', 'today-cost']]) {
      const entity = first(options, key);
      if (entity) section(target, [card(target, entity, 'md_energy_period_card', name, icon, { period, popup_hash: `#energy-${hash}` }, `energy.${hash.replaceAll('-', '_')}`)]);
    }
    const loads = (options.loads || []).map((load, index) => {
      const power = first(load, 'power_entity') || (context.energySources?.[index] ? {entity_id:context.energySources[index]} : null);
      if (!power) fail('energy_source_needed', '$.pages.energy.loads', {index,name:load.name || ''});
      const extras = Object.fromEntries(Object.entries(load).filter(([key]) => !['power_entity', 'toggle_entity', 'variables'].includes(key)));
      const entity = { ...power, ...extras, variables: { ...power.variables, ...load.variables } };
      if (load.toggle_entity) entity.variables.toggle_entity ??= load.toggle_entity;
      const item = card(target, entity, load.toggle_entity ? 'md_toggle_graph_card' : 'md_graph_card');
      item.icon ??= power.icon ?? null;
      item.id = `card-${count(target) + index + 1}`; return item;
    });
    section(target, loads, 2);
    for (const entity of onlyEntities(options.appliances)) section(target, [card(target, entity, DOMAIN_TEMPLATES[domain(entity.entity_id)] || 'md_sensor_card')]);
  }
  if (own(savedPages, 'wallbox')) {
    const target = page('wallbox', 'Wallbox', 'mdi:ev-station', 'views/main/04-wallbox.yaml'), options = savedPages.wallbox;
    const status = first(options, 'status_entity');
    if (status) section(target, [card(target, status, 'md_base_card', 'Wallbox Status', 'mdi:ev-station', undefined, 'wallbox.status')]);
    const metrics = [];
    for (const [key, name, icon, nameKey] of [['charging_power_entity', 'Charging Power', 'mdi:flash', 'wallbox.charging_power'], ['max_current_entity', 'Charging Current', 'mdi:current-ac', 'wallbox.current']]) {
      const entity = first(options, key);
      if (entity) metrics.push({ ...card(target, entity, 'md_graph_card', name, icon, { show_graph_fill: true, show_graph_line: true, show_icon: true }, nameKey), id: `card-${count(target) + metrics.length + 1}` });
    }
    section(target, metrics, 2);
    const current = first(options, 'current_control_entity');
    if (current) {
      const presets = options.current_presets || [];
      if (!Array.isArray(presets) || presets.length > 3 || presets.some(value => typeof value !== 'number' || !Number.isFinite(value))) fail('shortcuts_invalid', '$.pages.wallbox.current_presets');
      section(target, [card(target, current, 'md_wallbox_current_card', 'Charging Current', undefined, { shortcuts: presets }, 'wallbox.current')]);
    }
    const pause = first(options, 'pause_resume_entity');
    if (pause) section(target, [card(target, pause, 'md_switch_card', 'Pause / Resume', 'mdi:pause-circle', undefined, 'wallbox.pause_resume')]);
  }
  if (own(savedPages, 'media')) {
    const target = page('media', 'Media', 'mdi:television-play', 'views/main/05-media.yaml'), options = savedPages.media;
    for (const player of own(options, 'players') ? onlyEntities(options.players) : legacyAll(rooms, 'media_player')) {
      const selected = own(options, 'players') ? player : selectedById.get(player.entity_id) || { entity_id: player.entity_id };
      section(target, [card(target, selected, 'md_media_card')]);
      section(target, (appleTVOptions(player)?.apps || []).map((app, index) => {
        const item = { ...copy(app), id: `card-${count(target) + index + 1}`, template: 'md_media_app_card', entity_id: player.entity_id, name: app.name || app.source, icon: app.icon || 'mdi:play-box-outline', show_state: false, variables: { app_source: app.source } };
        delete item.source; return item;
      }), 2);
    }
  }
  for (const [kind, values, directory] of [['room', source.rooms || [], 'rooms'], ['custom', savedPages.custom || [], 'custom']]) {
    for (const [index, saved] of values.entries()) {
      const resolved = legacyContainer(saved, kind, context.entities), item = copy(saved);
      Object.assign(item, { id: resolved.path, path: resolved.path, icon: resolved.icon, output_path: `views/${directory}/${String(index).padStart(2, '0')}-${slug(resolved.name)}.yaml` });
      if (kind === 'room') item.subview = true;
      const content = Object.fromEntries(['entities', 'cards', 'columns'].filter(key => own(item, key)).map(key => [key, item[key]]));
      for (const key of ['entities', 'cards', 'columns']) delete item[key];
      item.sections = [{ columns: 1, entities: [{ id: 'page-title', template: 'md_title_card', name: resolved.name, show_icon: false, show_state: false, tap_action: { action: 'none' }, hold_action: { action: 'none' } }] }, content];
      result.pages.push(item);
    }
  }
  const savedNavigation = source.navigation;
  if (savedNavigation == null || savedNavigation.length && !savedNavigation.some(route => typeof route === 'string' || route.page)) {
    const available = [
      ['overview', 'mdi:home-variant-outline', 'mdi:home-variant', 'Home'], ['security', 'mdi:shield-home-outline', 'mdi:shield-home', 'Security'], ['rooms', 'mdi:sofa-outline', 'mdi:sofa', 'Rooms'], ['energy', 'mdi:lightning-bolt-outline', 'mdi:lightning-bolt', 'Energy'], ['wallbox', 'mdi:ev-plug-type2', 'mdi:ev-plug-type2', 'Wallbox'], ['media', 'mdi:television-play', 'mdi:television-play', 'Media'],
    ].filter(([path]) => ['overview', 'rooms'].includes(path) || own(savedPages, path)).map(([path, icon, selected, label]) => ({ icon, icon_selected: selected, label, url: `/marao-${result.slug}/${path}` }));
    available.push(...(savedPages.custom || []).map(saved => { const value = legacyContainer(saved, 'custom', context.entities); return { icon: value.icon, icon_selected: value.icon, label: value.name, url: `/marao-${result.slug}/${value.path}` }; }));
    const routes = savedNavigation == null ? available.slice(0, 5) : [...available, ...copy(savedNavigation)];
    result.navigation = routes.map(route => savedNavigation?.some(saved => JSON.stringify(saved) === JSON.stringify(route)) ? route : { ...route, page: route.url.split('/').at(-1), label_key: `nav.${route.url.endsWith('/overview') ? 'home' : route.url.split('/').at(-1)}` });
  }
  return canonicalSource(result);
}

// Source-format steps are retained as new steps are appended; release numbers are unrelated.
export const SOURCE_MIGRATIONS = Object.freeze([
  Object.freeze({ from: 0, to: 1, convert: explicitMembership }),
  Object.freeze({ from: 1, to: 2, convert: orderedPages }),
]);

export function runMigrationChain(source, context, migrations, currentVersion) {
  if (!object(source)) fail('source_object', '$');
  const initial = own(source, 'config_version') ? source.config_version : 0;
  if (!Number.isSafeInteger(initial) || initial < 0 || initial > currentVersion) fail('source_version_invalid', '$.config_version');
  if (!Array.isArray(migrations) || migrations.length !== currentVersion || migrations.some((step, index) => step.from !== index || step.to !== index + 1 || typeof step.convert !== 'function')) fail('migration_chain_invalid', '$');
  let result = copy(source);
  for (let version = initial; version < currentVersion; version++) {
    const candidate = migrations[version].convert(copy(result), copy(context || {}));
    if (!object(candidate) || own(candidate, 'config_version') && candidate.config_version !== version) fail('migration_step_invalid', '$.config_version');
    result = { ...candidate, config_version: version + 1 };
  }
  return result;
}

export function adaptNativeDashboard(source, context = {}) {
  if (typeof source.title !== 'string' || !source.title.trim() || !Array.isArray(source.views) || !source.views.length) fail('native_invalid', '$');
  if (['config_version', 'name', 'rooms', 'pages'].some(key => own(source, key))) fail('native_mixed', '$');
  const paths = source.views.map(view => object(view) ? view.path : null);
  if (paths.some(path => typeof path !== 'string') || new Set(paths).size !== paths.length) fail('native_paths_invalid', '$.views');
  const cardsIn = view => {
    if (own(view, 'sections') && own(view, 'cards')) fail('native_content_mixed', '$.views');
    const parts = view.sections || [{ cards: view.cards || [] }];
    if (!Array.isArray(parts) || parts.some(part => !object(part) || !Array.isArray(part.cards || []))) fail('native_cards_invalid', '$.views');
    return parts.flatMap(part => part.cards || []);
  };
  const allCards = new Map(source.views.map(view => [view.path, cardsIn(view)]));
  const inferredRoots = new Set();
  for (const cards of allCards.values()) for (const card of cards) for (const key of ['navigation_path', 'back_path']) {
    const match = typeof card?.[key] === 'string' && card[key].match(/^\/([a-z0-9_-]+)\/([^/]+)$/);
    if (match && paths.includes(match[2])) inferredRoots.add(match[1]);
  }
  const root = context.dashboardRoot || (inferredRoots.size === 1 ? [...inferredRoots][0] : 'marao-dashboard');
  if (inferredRoots.size > 1 && !context.dashboardRoot) fail('dashboard_root_needed', '$.views');
  const destination = route => {
    if (typeof route !== 'string' || !route.startsWith(`/${root}/`) || route.split('/').length !== 3 || !paths.includes(route.split('/').at(-1))) fail('native_destination_invalid', '$.views');
    return route.split('/').at(-1);
  };
  const lights = new Map([...allCards].map(([path, cards]) => [path, cards.flatMap((card,index) => { const binding = context.nativeBindings?.[path]?.[index] ?? card?.entity; return card?.type === 'custom:marao-entity-card' && domain(binding) === 'light' ? [binding] : []; })]));
  const converted = { ...copy(source), config_version: LEGACY_NATIVE_TARGET_VERSION, name: source.title, landing_page: paths[0], navigation: [], pages: [], legacy_storage_dashboard: copy(source) };
  delete converted.title; delete converted.views;
  for (const view of source.views) {
    const page = { id: view.path, path: view.path, name: view.title || view.path, sections: [], ...Object.fromEntries(['icon', 'theme', 'subview'].filter(key => own(view, key)).map(key => [key, copy(view[key])])) };
    for (const [offset, card] of allCards.get(view.path).entries()) {
      if (!object(card)) fail('native_card_invalid', '$.views');
      const index = offset + 1, kind = card.type, descriptor = { ...copy(card), id: `card-${index}` };
      if (['custom:marao-header-card', 'heading'].includes(kind)) {
        Object.assign(descriptor, { template: 'md_title_card', name: card.title || card.heading || '' });
        delete descriptor.title; delete descriptor.heading;
      } else if (kind === 'custom:marao-room-card') {
        const target = destination(card.navigation_path);
        Object.assign(descriptor, { template: 'md_room_card', page: target, variables: { light_entities: lights.get(target) } });
        if (lights.get(target).length) descriptor.entity_id = lights.get(target)[0];
        if (target === view.path && card.area_id) page.area = card.area_id;
      } else if (['custom:marao-camera-card', 'custom:marao-entity-card'].includes(kind)) {
        const binding = context.nativeBindings?.[view.path]?.[offset] ?? card.entity;
        if (typeof binding !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(binding)) fail('native_binding_needed', '$.views', {page:view.path,index:offset,name:card.name || card.title || view.title || view.path});
        descriptor.entity_id = binding; delete descriptor.entity;
        descriptor.template = kind === 'custom:marao-camera-card' ? 'md_camera_card' : defaultTemplate(descriptor);
        if (!descriptor.template) fail('native_binding_invalid', '$.views');
      } else {
        page.sections.push({ columns: 1, cards: [copy(card)] }); continue;
      }
      delete descriptor.type;
      page.sections.push({ columns: 1, entities: [descriptor] });
      if (kind === 'custom:marao-header-card' && card.subtitle) {
        if (typeof card.subtitle !== 'string') fail('native_subtitle_invalid', '$.views');
        page.sections.push({ columns: 1, cards: [{ type: 'markdown', content: card.subtitle }] });
      }
      if (kind === 'custom:marao-header-card' && card.back_path) {
        const target = destination(card.back_path), targetView = source.views.find(item => item.path === target);
        page.sections.push({ columns: 1, entities: [{ id: `back-${index}`, template: 'md_navigation_card', page: target, name: targetView.title || target, icon: 'mdi:arrow-left' }] });
      }
    }
    converted.pages.push(page);
  }
  return canonicalSource(converted);
}

export function migrateSource(source, context = {}) {
  const version = formatVersion(source);
  const initial = version === 0 && own(source, 'title') && own(source, 'views') && !own(source, 'name') ? adaptNativeDashboard(source, context) : source;
  const result = runMigrationChain(initial, context, SOURCE_MIGRATIONS, SOURCE_VERSION);
  if (!Array.isArray(result.pages) || !result.pages.length) fail('pages_needed', '$.pages');
  if (own(result, 'overview') || own(result, 'rooms')) fail('source_mixed', '$');
  return canonicalSource(result);
}

export function unwrapDocument(document) {
  if (!object(document)) fail('source_object', '$');
  if (object(document.data) && own(document.data, 'config')) {
    if (!Number.isSafeInteger(document.version) || document.version !== 1 || own(document, 'minor_version') && document.minor_version !== 1 || !/^lovelace(?:\.[a-z0-9_-]+)?$/.test(document.key || '') || ['config_version', 'views', 'strategy', 'pages'].some(key => own(document, key))) fail('storage_envelope_invalid', '$');
    return unwrapDocument(document.data.config);
  }
  if (own(document, 'strategy')) {
    const strategy = document.strategy;
    if (!object(strategy) || strategy.type !== STRATEGY_TYPE || strategy.envelope_version !== ENVELOPE_VERSION || strategy.compiler_contract !== COMPILER_CONTRACT || typeof strategy.source_json !== 'string' || ['config_version', 'views', 'pages'].some(key => own(document, key))) fail('native_envelope_invalid', '$.strategy');
    return { source: parseSource(strategy.source_json), sourceText: strategy.source_json, envelope: copy(document) };
  }
  return { source: copy(document), envelope: null };
}

export function createEnvelope(sourceText, dashboardRoot, previous = {}) {
  if (typeof dashboardRoot !== 'string' || !/^[a-z0-9][a-z0-9_-]*-[a-z0-9_-]+$/.test(dashboardRoot)) fail('dashboard_root_needed', '$.strategy.dashboard_root');
  const source = parseSource(sourceText);
  if (formatVersion(source) !== SOURCE_VERSION) fail('source_conversion_needed', '$.config_version');
  const paths = new Set(source.pages?.map(page => page.path));
  if (own(previous, 'strategy') && !object(previous.strategy)) fail('native_envelope_invalid', '$.strategy');
  let editorPath = previous.strategy?.editor_path ?? 'marao-editor';
  if (typeof editorPath !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(editorPath)) fail('native_editor_path_invalid', '$.strategy.editor_path');
  while (paths.has(editorPath)) editorPath += '-editor';
  return { ...copy(previous), strategy: { ...copy(previous.strategy || {}), type: STRATEGY_TYPE, envelope_version: ENVELOPE_VERSION, compiler_contract: COMPILER_CONTRACT, source_json: sourceText, dashboard_root: dashboardRoot, editor_path: editorPath } };
}
