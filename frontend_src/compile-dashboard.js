import labels from '../custom_components/marao_dashboard/frontend/marao-generator-labels.json' with { type: 'json' };
import { appleTVOptions, copy, defaultTemplate, domain, entries, friendly, isAccess, object, sections, slug } from '../custom_components/marao_dashboard/frontend/MaraoSource.js';
import { catalog, normalizeSource, validateSource } from './native-model.js';
import { parseCardYaml, parseCardsYaml } from './lovelace-model.js';
import {rewriteOwnedAssets} from './native-dependencies.js';

export { catalog, validateSource };
const own = (value, key) => Object.hasOwn(value, key);
const pick = (value, keys) => Object.fromEntries(keys.filter(key => own(value, key)).map(key => [key, copy(value[key])]));
const navigate = path => ({ action: 'navigate', navigation_path: path, haptic: 'heavy' });
const hash = (prefix, entity) => `#${prefix}-${slug(entity.replaceAll('.', '-'))}`;
const openOnly = entity => domain(entity.entity_id) === 'cover' && Number.isFinite(Number(entity.supported_features)) && Boolean(Number(entity.supported_features) & 1) && !Boolean(Number(entity.supported_features) & 2);
const accessRoles = { popup: 'md_access_card', slide: 'md_access_slide_action_card', close: 'md_access_action_card', hold: 'md_access_hold_action_card' };

function accessRole(entity) {
  const role = entity.template;
  if (!Object.values(accessRoles).includes(role)) return role;
  const mode = entity.variables?.access_mode || 'auto';
  if (mode !== 'auto') return accessRoles[mode];
  return role === 'md_access_card' && !['lock', 'cover'].includes(domain(entity.entity_id)) ? domain(entity.entity_id) === 'script' ? accessRoles.slide : accessRoles.hold : role;
}

function resolveSource(source, entities) {
  const metadata = new Map(entities.map(entity => [entity.entity_id, entity]));
  const resolved = copy(source);
  resolved.slug ||= slug(resolved.name);
  resolved.theme ||= 'Marao Dashboard';
  for (const page of resolved.pages) {
    let position = 0;
    const identities = new Set();
    page._sections = copy(sections(page));
    for (const section of page._sections) section.ordered_cards = entries(section.entities).map(saved => {
      const item = { ...metadata.get(saved.entity_id), ...saved, id: saved.id || `card-${++position}` };
      if (saved.id) position++;
      if (identities.has(item.id)) throw new Error('Conflicting local card identity.');
      identities.add(item.id);
      item.template = accessRole({ ...item, template: saved.template || (saved.page ? 'md_navigation_card' : defaultTemplate(item)) });
      if (!item.template) throw new Error('Choose a supported card template.');
      if (item.template === 'md_fan_card' && isAccess(item)) throw new Error('Use an access card for doors, garages and gates.');
      item._page_instance = page.id || page.path;
      if (saved.entity_id) {
        item.name = saved.name || metadata.get(saved.entity_id)?.name || friendly(saved.entity_id);
        item.unit_of_measurement = metadata.get(saved.entity_id)?.unit_of_measurement;
      }
      item.variables = copy(saved.variables || {});
      const prefix = `#page-${page.path}-${item.id}`, role = item.template;
      if (['md_media_card', 'md_camera_card', 'md_entity_group_card', 'md_scene_collection_card', 'md_energy_period_card', 'md_security_card'].includes(role) || item.entity_id && !['md_access_slide_action_card', 'md_access_action_card'].includes(role) && isAccess(item)) item.variables.popup_hash ??= prefix + '-popup';
      if (role === 'md_graph_card' && item.variables.history_popup) item.variables.popup_hash ??= prefix + '-history';
      if (role === 'md_climate_card') item.variables.mode_selector_hash ??= prefix + '-modes';
      if (role === 'md_entity_group_card') {
        item.popup_filter ||= item.entity_type === 'light' ? 'active' : 'all';
        const members = new Map();
        for (const member of entries(item.entities)) {
          const value = { ...metadata.get(member.entity_id), ...members.get(member.entity_id), ...member };
          value.name = member.name || value.name || friendly(member.entity_id);
          if (item.entity_type === 'cover' && (value.template || defaultTemplate(value)) === 'md_fan_card') continue;
          members.set(member.entity_id, value);
        }
        item.entities = [...members.values()];
      }
      return item;
    });
  }
  return resolved;
}

export function compileDashboard(input, { entities = [], areas = [], roomEntities, dashboardRoot, language = 'en', assetBaseURL } = {}) {
  const source = normalizeSource(input, { entities, areas, roomEntities });
  const config = resolveSource(source, entities);
  const root = dashboardRoot || `marao-${config.slug}`;
  if (!/^[a-z0-9][a-z0-9_-]*-[a-z0-9_-]+$/.test(root)) throw new Error('Choose a valid dashboard address.');
  const locale = String(language).toLowerCase().split('-')[0];
  const t = key => labels[locale]?.[key] || labels.en[key] || key;
  const name = item => item.name_key && item.name === labels.en[item.name_key] ? t(item.name_key) : item.name || friendly(item.entity_id || item.path || item.id);
  const rawCards = new WeakSet();
  const raw = value => { const card = copy(value); rawCards.add(card); return card; };
  const header = (popupHash, entity, title, icon) => ({ type: 'custom:marao-popup-card', hash: popupHash, ...(entity ? { entity } : {}), name: title, icon, show_icon: true, show_name: true, show_state: true, height: 'auto', max_height: '100%' });
  const owned = card => !rawCards.has(card) && (card.type === 'custom:marao-card' ? Boolean(card.template) && !['md_title_card', 'md_navbar_card', 'md_popup_card'].includes(card.template) : ['custom:marao-timeline-card', 'custom:marao-energy-period-card', 'custom:marao-frigate-events-card', 'custom:marao-slide-to-open'].includes(card.type));
  const structural = card => ['custom:marao-navbar-card', 'custom:marao-popup-card'].includes(card.type);
  const grid = (cards, columns, groups) => cards.some(owned) ? { type: 'custom:marao-control-grid', columns, cards, ...(cards.some(card => rawCards.has(card)) ? { native_cards: cards.flatMap((card, index) => rawCards.has(card) ? [index] : []) } : {}), ...(groups ? { groups } : {}) } : { type: 'grid', columns, square: false, cards };
  const titleCard = title => ({ type: 'custom:marao-card', template: 'md_title_card', name: title, show_icon: false, show_state: false, tap_action: { action: 'none' }, hold_action: { action: 'none' } });
  const entityCard = entity => {
    const role = entity.template || defaultTemplate(entity), variables = copy(entity.variables || {});
    if (entity.graph_entity && !variables.graph_entity) variables.graph_entity = entity.graph_entity;
    if (role === 'md_timeline_card') return { type: 'custom:marao-state-timeline-card', entity: entity.entity_id, name: variables.timeline_name || entity.name || friendly(entity.entity_id) };
    return { type: 'custom:marao-card', template: role, entity: entity.entity_id, name: entity.name || friendly(entity.entity_id), ...(entity.icon ? { icon: entity.icon } : {}), ...(Object.keys(variables).length ? { variables } : domain(entity.entity_id) === 'climate' ? { variables: { show_graph: false, show_mode_buttons: true } } : {}) };
  };
  const accessAction = (entity, title, icon, service, label, color) => ({ type: 'custom:marao-card', template: ['lock.unlock', 'cover.open_cover'].includes(service) ? 'md_access_slide_action_card' : 'md_access_action_card', entity: entity.entity_id, name: title, icon, variables: { action_service: service, action_requires_hold: false, action_label_key: label, action_color: `var(--color-${color})` } });
  const roomCard = entity => {
    const role = entity.template;
    if (role === 'md_access_action_card') return entityCard({ ...entity, variables: { ...entity.variables, action_service: entity.variables?.action_service || (domain(entity.entity_id) === 'lock' ? 'lock.lock' : 'cover.close_cover') } });
    if (role === 'md_access_slide_action_card') return entityCard(entity);
    if (role === 'md_access_hold_action_card' && !isAccess(entity)) return actionCard(entity);
    if (role === 'md_security_card' && !own(entity, 'tap_action')) return entityCard({ ...entity, variables: { popup_hash: hash('alarm', entity.entity_id), ...entity.variables } });
    if (isAccess(entity)) {
      if (openOnly(entity) && entity.variables?.access_mode !== 'popup') return accessAction(entity, entity.name || friendly(entity.entity_id), 'mdi:door-open', 'cover.open_cover', 'access.open', 'red');
      return entityCard({ ...entity, template: 'md_access_card', variables: { popup_hash: hash('access', entity.entity_id), ...entity.variables } });
    }
    if (domain(entity.entity_id) === 'climate') return entityCard({ ...entity, variables: { show_graph: false, mode_selector_hash: hash('climate-mode', entity.entity_id), ...entity.variables } });
    if (domain(entity.entity_id) === 'camera' || domain(entity.entity_id) === 'media_player' && entity.template === 'md_media_card') return entityCard({ ...entity, variables: { popup_hash: hash(domain(entity.entity_id) === 'camera' ? 'camera' : 'media', entity.entity_id), ...entity.variables } });
    return entityCard(entity);
  };
  const actionCard = entity => ({ type: 'custom:marao-card', template: 'md_access_hold_action_card', entity: entity.entity_id, name: entity.name || friendly(entity.entity_id), show_state: false, variables: copy(entity.variables || {}), tap_action: entity.variables?.action_service ? { action: 'call-service', service: entity.variables.action_service, entity_id: entity.entity_id, haptic: 'heavy' } : domain(entity.entity_id) === 'button' ? { action: 'perform-action', perform_action: 'button.press', target: { entity_id: entity.entity_id }, haptic: 'heavy' } : { action: 'toggle', haptic: 'heavy' }, ...(entity.icon ? { icon: entity.icon } : {}) });
  const sceneCard = entity => ({ type: 'custom:marao-card', template: entity.template || 'md_switch_card', entity: entity.entity_id, name: entity.name || friendly(entity.entity_id), icon: entity.icon || 'mdi:palette-outline', tap_action: domain(entity.entity_id) === 'scene' ? { action: 'perform-action', perform_action: 'scene.turn_on', target: { entity_id: entity.entity_id }, haptic: 'heavy' } : { action: 'toggle', haptic: 'heavy' } });
  const energyCard = (entity, popupHash, popup = false) => ({ type: 'custom:marao-energy-period-card', ...pick(entity.variables || {}, ['display_unit', 'display_precision', 'sub_entities', 'calculate_cost', 'cost_per_kwh']), entity: entity.entity_id, name: entity.name, period: entity.variables?.period || 'day', popup_hash: popupHash, popup, icon: entity.icon || 'mdi:flash' });
  const climatePopup = entity => ({ ...header(entity.variables?.mode_selector_hash || hash('climate-mode', entity.entity_id), entity.entity_id, `${entity.name || friendly(entity.entity_id)} ${t('climate.mode_suffix')}`, 'mdi:thermostat'), cards: [entityCard({ ...entity, variables: { show_graph: false, ...entity.variables, show_mode_buttons: true } })] });
  const accessPopup = entity => {
    const lock = domain(entity.entity_id) === 'lock', icon = lock ? 'mdi:lock' : entity.device_class === 'garage' ? 'mdi:garage' : 'mdi:door';
    const actions = lock ? [accessAction(entity, t('common.unlock'), 'mdi:lock-open-variant', 'lock.unlock', 'common.unlock', 'red'), accessAction(entity, t('common.lock'), 'mdi:lock', 'lock.lock', 'common.lock', 'green')] : [accessAction(entity, t('access.open'), icon === 'mdi:garage' ? 'mdi:garage-open' : 'mdi:door-open', 'cover.open_cover', 'access.open', 'red'), accessAction(entity, t('common.close'), icon === 'mdi:garage' ? icon : 'mdi:door-closed', 'cover.close_cover', 'common.close', 'green')];
    return { ...header(entity.variables?.popup_hash || hash('access', entity.entity_id), entity.entity_id, entity.name || friendly(entity.entity_id), icon), cards: [grid(openOnly(entity) ? actions.slice(0, 1) : actions, 1)] };
  };
  const groupHash = entity => entity.variables?.popup_hash || (['overview-lights', 'overview-blinds', 'overview-climate', 'overview-maintenance'].includes(entity.id) ? `#${entity.id}` : `#entity-group-${entity.id}`);
  const groupMembers = group => group.entities.map(member => {
    const historical = ["#" + group.id, '#entity-group-' + group.id].includes(groupHash(group));
    const prefix = (group._page_instance && !historical ? groupHash(group) : '#entity-group-' + group.id) + '-' + member.entity_id.replaceAll('.', '-');
    const variables = copy(member.variables || {});
    if (domain(member.entity_id) === 'climate') variables.mode_selector_hash ??= prefix + '-modes';
    if (isAccess(member)) variables.popup_hash ??= prefix + '-access';
    return { ...member, name: member.name || friendly(member.entity_id), variables };
  });
  const groupCard = entity => ({ type: 'custom:marao-card', template: 'md_entity_group_card', id: entity.id, name: name(entity), icon: entity.icon || ({ light: 'mdi:lightbulb-group-outline', cover: 'mdi:window-shutter', climate: 'mdi:thermostat', battery: 'mdi:battery' })[entity.entity_type], variables: { entity_type: entity.entity_type, summary_entities: entity.entities.map(member => member.entity_id) }, tap_action: navigate(groupHash(entity)) });
  const groupPopups = entity => [{ ...header(groupHash(entity), null, name(entity), entity.icon || 'mdi:view-list'), entity_group: { id: entity.id, entity_type: entity.entity_type, popup_filter: entity.popup_filter, entities: entity.entities.map(member => member.entity_id) }, cards: groupMembers(entity).map(roomCard) }, ...groupMembers(entity).filter(member => domain(member.entity_id) === 'climate' || isAccess(member) && !openOnly(member)).map(member => domain(member.entity_id) === 'climate' ? climatePopup(member) : accessPopup(member))];
  const cameraPopup = entity => {
    const options = entity.variables || {}, events = { type: 'custom:marao-camera-events-card', entity: entity.entity_id, title: t('camera.events') };
    for (const key of ['event_provider', 'frigate_camera', 'frigate_instance_id', 'unifi_protect_media_source']) if (entity[key] || options[key]) events[key] = entity[key] || options[key];
    if (entity.event_limit || options.event_limit) events.limit = entity.event_limit || options.event_limit;
    return { ...header(options.popup_hash || hash('camera', entity.entity_id), entity.entity_id, entity.name || friendly(entity.entity_id), entity.icon || 'mdi:cctv'), cards: [{ type: 'custom:marao-card', template: 'md_camera_card', entity: options.popup_stream_entity || entity.entity_id, name: entity.name || friendly(entity.entity_id), show_name: false, tap_action: { action: 'fullscreen' } }, events] };
  };
  const mediaPopup = entity => createMediaPopup(entity, header, grid);
  const pageCard = entity => {
    const item = { ...entity, name: name(entity) }, role = item.template, variables = item.variables || {};
    if (role === 'ha_card') return raw(parseCardYaml(item.yaml));
    if (role === 'md_entity_group_card') return groupCard(item);
    if (role === 'md_scene_collection_card') return { type: 'custom:marao-card', template: 'md_navigation_card', name: item.name, icon: item.icon || 'mdi:palette-outline', show_state: false, tap_action: navigate(variables.popup_hash) };
    let card;
    if (role === 'md_title_card') card = titleCard(item.name);
    else if (role === 'md_energy_period_card') card = energyCard(item, variables.popup_hash);
    else if (item.page) card = { type: 'custom:marao-card', template: role, ...(item.entity_id ? { entity: item.entity_id } : {}), name: item.name || friendly(item.page), icon: item.icon || 'mdi:open-in-new', show_label: false, tap_action: navigate(`/${root}/${item.page}`), ...(object(item.variables) ? { variables: item.variables } : {}) };
    else if (['md_navigation_card', 'md_room_card', 'md_header_card', 'md_glance_card'].includes(role) && !item.entity_id) card = { type: 'custom:marao-card', template: role, variables: copy(variables) };
    else if (role === 'md_access_hold_action_card') card = actionCard(item);
    else if (role === 'md_access_slide_action_card') card = entityCard(item);
    else if (domain(item.entity_id) === 'scene') card = sceneCard(item);
    else card = roomCard(item);
    for (const key of ['name', 'icon', 'show_name', 'show_icon', 'show_state', 'show_label', 'tap_action', 'hold_action', 'double_tap_action']) {
      if (key === 'name' && role === 'md_timeline_card' && variables.timeline_name || key === 'tap_action' && item.page) continue;
      if (own(item, key)) card[key] = copy(item[key]);
    }
    if (role === 'md_graph_card' && variables.history_popup) card.tap_action = navigate(variables.popup_hash);
    return card;
  };
  const popups = entity => {
    const item = { ...entity, name: name(entity) }, role = item.template, variables = item.variables || {};
    if (['ha_card', 'md_access_slide_action_card', 'md_access_action_card'].includes(role)) return [];
    if (role === 'md_security_card' && !own(item, 'tap_action')) return [{ ...header(variables.popup_hash || hash('alarm', item.entity_id), item.entity_id, item.name, 'mdi:shield-home'), cards: [{ type: 'custom:marao-card', template: 'md_alarm_controls_card', entity: item.entity_id, name: item.name, ...(own(variables, 'alarm_layout') ? { variables: { alarm_layout: variables.alarm_layout } } : {}) }] }];
    if (role === 'md_entity_group_card') return groupPopups(item);
    if (role === 'md_scene_collection_card') return [{ ...header(variables.popup_hash, null, item.name, item.icon || 'mdi:palette-outline'), cards: entries(item.entities).length ? entries(item.entities).map(sceneCard) : [{ type: 'markdown', content: t('overview.scenes_empty') }] }];
    if (role === 'md_energy_period_card' || role === 'md_graph_card' && variables.history_popup) {
      const card = role === 'md_energy_period_card' ? energyCard(item, null, true) : catalog.energy_units[item.unit_of_measurement]?.[0] === 'power' || variables.power_devices?.length ? { type: 'custom:marao-power-history-card', entity: variables.graph_entity || item.graph_entity || item.entity_id, name: item.name, ...pick(variables, ['power_devices', 'display_unit', 'display_precision', 'graph_color']) } : { type: 'custom:marao-card', template: item.template || 'md_graph_card', entity: item.entity_id, name: item.name, icon: item.icon || 'mdi:flash', variables: { show_graph_fill: true, show_graph_line: true, show_icon: true, ...variables, ...(item.graph_entity && !variables.graph_entity ? { graph_entity: item.graph_entity } : {}) } };
      return [{ ...header(variables.popup_hash, item.entity_id, item.name, item.icon || 'mdi:flash'), cards: [card] }];
    }
    if (role === 'md_climate_card') return [climatePopup(item)];
    if (role === 'md_media_card') return [mediaPopup(item)];
    if (role === 'md_camera_card') return [cameraPopup(item)];
    if (item.entity_id && isAccess(item) && (!openOnly(item) || variables.access_mode === 'popup')) return [accessPopup(item)];
    return [];
  };
  const available = new Map(config.pages.map(page => [page.path, page]));
  const routes = (config.navigation || []).map(entry => {
    const path = typeof entry === 'string' ? entry : entry.page;
    if (!available.has(path)) return copy(entry);
    const page = available.get(path), overrides = object(entry) ? entry : {};
    const route = { icon: page.icon || 'mdi:file-outline', icon_selected: page.icon || 'mdi:file-outline', label: name(page), ...copy(overrides), url: `/${root}/${path}` };
    if (overrides.label_key) route.label = name({ name: overrides.label, name_key: overrides.label_key });
    if (overrides.url && !overrides.label_key && ![`/${root}/${path}`, `/marao-${config.slug}/${path}`].includes(overrides.url)) route.url = overrides.url;
    return route;
  });
  const navbar = { type: 'vertical-stack', cards: [{ type: 'custom:marao-navbar-card', routes, ...(own(config, 'show_cache_reset') ? { show_cache_reset: config.show_cache_reset } : {}) }] };
  const domains = ['sensor', 'binary_sensor', 'camera', 'lock', 'cover', 'climate', 'fan', 'switch', 'input_boolean', 'media_player', 'vacuum', 'number', 'input_number', 'light', 'navigation', 'entity_group'];
  const compact = new Set(['sensor', 'binary_sensor', 'switch', 'input_boolean', 'number', 'input_number', 'light', 'navigation', 'entity_group']);
  const views = [...config.pages.filter(page => page.path === config.landing_page), ...config.pages.filter(page => page.path !== config.landing_page)].map(page => {
    const cards = [], sheets = [];
    for (const section of page._sections) {
      const rendered = section.ordered_cards.map(pageCard), sourceRaw = (section.cards || []).map(copy);
      sheets.push(...sourceRaw.filter(structural));
      const ordinary = sourceRaw.filter(card => !structural(card));
      if (section.columns) {
        const content = [...rendered, ...ordinary];
        if (content.length) cards.push(...(section.columns === 1 && content.length === 1 && !owned(content[0]) ? content : [grid(content, section.columns)]));
      } else {
        const buckets = new Map();
        section.ordered_cards.forEach((entity, index) => {
          const kind = entity.template === 'ha_card' ? 'ha_card' : entity.page ? 'navigation' : entity.template === 'md_entity_group_card' ? 'entity_group' : domain(entity.entity_id);
          if (!buckets.has(kind)) buckets.set(kind, []);
          buckets.get(kind).push(rendered[index]);
        });
        const content = [], groups = [];
        for (const kind of [...domains, ...[...buckets.keys()].filter(key => !domains.includes(key))]) if (buckets.has(kind)) {
          const values = buckets.get(kind); content.push(...values); groups.push({ count: values.length, columns: compact.has(kind) ? 2 : 1 });
        }
        for (const card of ordinary) { content.push(card); groups.push({ count: 1, columns: 1 }); }
        if (content.length) cards.push(...(content.some(owned) ? [grid(content, Math.max(...groups.map(group => group.columns)), groups)] : content));
      }
      sheets.push(...section.ordered_cards.flatMap(popups));
    }
    for (const fragment of page.custom_content || []) {
      const content = parseCardsYaml(fragment.yaml);
      if (fragment.popup_hash) {
        const popup = sheets.find(sheet => sheet.type === 'custom:marao-popup-card' && sheet.hash === fragment.popup_hash);
        if (!popup) throw new Error('Choose an existing popup for the custom cards.');
        popup.cards ||= []; popup.cards.push(...content);
      } else cards.push(...content);
    }
    validatePopupLinks(page, [...cards, ...sheets]);
    cards.push(...sheets, copy(navbar));
    return { title: name(page), path: page.path, cards, ...pick(page, ['icon', 'subview']), theme: page.theme || config.theme };
  });
  const rewrite = value => {
    if (rawCards.has(value)) return copy(value);
    if (Array.isArray(value)) return value.map(rewrite);
    if (!object(value)) return value;
    const aliases = {'custom:button-card':'custom:marao-card','custom:bubble-card':'custom:marao-popup-card','custom:navbar-card':'custom:marao-navbar-card','custom:my-slider':'custom:marao-card','custom:my-slider-v2':'custom:marao-card','custom:mini-graph-card':'sensor'};
    return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,key === 'type' && typeof item === 'string' ? aliases[item] || item : rewrite(item)]));
  };
  const result = rewrite({ title: config.name, views });
  for (const view of result.views) validatePopupLinks(config.pages.find(page => page.path === view.path),view.cards);
  const assets = (value,path = '$') => {
    if (typeof value === 'string') return rewriteOwnedAssets(value,path,assetBaseURL);
    if (Array.isArray(value)) return value.map((item,index)=>assets(item,`${path}[${index}]`));
    if (object(value)) return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,assets(item,`${path}.${key}`)]));
    return value;
  };
  return assets(result);
}

function validatePopupLinks(page, cards) {
  const hashes = new Set();
  function visit(value, callback) {
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (object(value)) { callback(value); Object.values(value).forEach(child => visit(child, callback)); }
  }
  visit(cards, card => {
    if (card.type !== 'custom:marao-popup-card') return;
    if (typeof card.hash !== 'string' || !/^#[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(card.hash) || hashes.has(card.hash)) throw new Error(`Page ${page.name}: invalid or conflicting popup hash.`);
    hashes.add(card.hash);
  });
  visit(cards, card => {
    const links = [card.navigation_path];
    if (['md_media_card', 'md_camera_card', 'md_access_card', 'md_entity_group_card', 'md_climate_card'].includes(card.template)) links.push(card.variables?.popup_hash, card.variables?.mode_selector_hash);
    for (const link of links) if (typeof link === 'string' && /^#(?:page-|entity-group-|overview-|energy-|climate-mode-|access-|media-|camera-)/.test(link) && !hashes.has(link)) throw new Error(`Page ${page.name}: retarget or remove missing popup link.`);
  });
}

function createMediaPopup(entity, header, grid) {
  const name = entity.name || friendly(entity.entity_id), options = appleTVOptions(entity);
  const button = (icon, label, service, { primary = false, dpad = false, target, data, holdData, seekOffset } = {}) => {
    const action = { action: 'perform-action', perform_action: service, target: { entity_id: target || entity.entity_id }, haptic: 'heavy', ...(data ? { data } : {}), ...(seekOffset !== undefined ? { seek_offset: seekOffset } : {}) };
    const key = ({ 'media_player.media_previous_track': 'media.previous', 'media_player.media_play_pause': 'media.play_pause', 'media_player.media_next_track': 'media.next' })[service];
    return { type: 'custom:marao-card', entity: entity.entity_id, name: label || '', icon, show_name: false, show_state: false, show_label: false, tap_action: action, styles: { grid: [{ 'grid-template-areas': "'i'" }], card: [{ height: dpad ? '88px' : '90px' }, { padding: dpad ? 0 : '14px 10px' }, { 'border-radius': dpad ? '30px' : '28px' }, { background: primary ? 'var(--primary-color)' : 'var(--ha-card-background)' }, { 'box-shadow': 'var(--ha-card-box-shadow)' }], icon: [{ width: primary ? '24px' : dpad ? '42px' : '34px' }, { color: primary ? 'var(--text-primary-color,var(--active-text-color))' : 'var(--primary-text-color)' }], img_cell: [{ width: dpad ? '100%' : '52px' }, { height: dpad ? '100%' : '52px' }, { 'border-radius': dpad ? '0' : '50%' }, { background: dpad ? 'none' : 'var(--opacity-contrast-100)' }, { 'justify-self': 'center' }, { 'align-self': 'center' }] }, ...(key ? { variables: { action_label_key: key } } : {}), ...(holdData ? { hold_action: { action: 'perform-action', perform_action: service, target: { entity_id: target || entity.entity_id }, data: holdData, haptic: 'heavy' } } : {}) };
  };
  const fixedGrid = cards => ({ type: 'grid', columns: 3, square: false, cards });
  const play = () => button('mdi:play', 'Play', 'media_player.media_play_pause', { primary: true });
  if (!options) return { ...header(entity.variables?.popup_hash || hash('media', entity.entity_id), entity.entity_id, name, 'mdi:music'), cards: [fixedGrid([button('mdi:skip-previous', 'Previous', 'media_player.media_previous_track'), play(), button('mdi:skip-next', 'Next', 'media_player.media_next_track')])] };
  const remote = (command, icon, label = '', extra = {}) => button(icon, label, 'remote.send_command', { ...extra, target: options.remote_entity, data: { command }, ...(extra.hold ? { holdData: { command, hold_secs: 1 } } : {}) });
  const cards = [], apps = options.apps.filter(app => object(app) && app.source);
  if (apps.length) cards.push({ type: 'custom:marao-control-grid', columns: 3, square: false, cards: apps.map(app => ({ type: 'custom:marao-card', template: 'md_media_app_card', entity: entity.entity_id, name: app.name || app.source, icon: app.icon || 'mdi:play-box-outline', show_state: false, variables: { app_source: app.source } })) });
  cards.push(fixedGrid([remote('menu', 'mdi:arrow-u-left-top', 'Back'), remote('up', 'mdi:chevron-up', '', { dpad: true, hold: true }), remote('top_menu', 'mdi:home-outline', 'Home')]), fixedGrid([remote('left', 'mdi:chevron-left', '', { dpad: true, hold: true }), remote('select', 'mdi:checkbox-blank-circle', '', { primary: true, dpad: true, hold: true }), remote('right', 'mdi:chevron-right', '', { dpad: true, hold: true })]), fixedGrid([button('mdi:rewind-10', 'Back 10 seconds', 'media_player.media_seek', { seekOffset: -10 }), remote('down', 'mdi:chevron-down', '', { dpad: true, hold: true }), button('mdi:fast-forward-30', 'Forward 30 seconds', 'media_player.media_seek', { seekOffset: 30 })]));
  const volume = (command, icon, label, service) => String(options.volume_remote_entity || '').startsWith('remote.') ? button(icon, label, 'remote.send_command', { target: options.volume_remote_entity, data: { command } }) : button(icon, label, service, { target: options.volume_remote_entity });
  cards.push(fixedGrid([volume('KEY_VOLDOWN', 'mdi:volume-minus', 'Volume down', 'media_player.volume_down'), play(), volume('KEY_VOLUP', 'mdi:volume-plus', 'Volume up', 'media_player.volume_up')]));
  return { ...header(entity.variables?.popup_hash || hash('media', entity.entity_id), entity.entity_id, name, 'mdi:remote-tv'), cards };
}
