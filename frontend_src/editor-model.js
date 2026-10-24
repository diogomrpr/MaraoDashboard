import { validatePowerDevices } from './history-data.js';
export function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function newEntityGroupId() {
  return 'group-' + Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join('');
}

export function slugify(value) {
  return String(value || "room")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "room";
}

export function flattenEntities(spec) {
  const values = [];
  if (Array.isArray(spec)) values.push(...spec);
  else if (typeof spec === "string") values.push(spec);
  else if (spec && typeof spec === "object" && (typeof spec.entity_id === "string" || typeof spec.page === "string" || typeof spec.template === 'string')) values.push(spec);
  else if (spec && typeof spec === "object") {
    for (const entries of Object.values(spec)) {
      if (Array.isArray(entries)) values.push(...entries);
      else if (entries != null) values.push(entries);
    }
  }
  return values.flatMap((value) => {
    if (typeof value?.template === 'string') return [{ ...clone(value), __simple: false }];
    if (typeof value === "string") return [{ entity_id: value, __simple: true }];
    if (value && typeof value === "object" && typeof value.entity_id === "string") {
      return [{ ...clone(value), __simple: false }];
    }
    if (value && typeof value === "object" && typeof value.page === "string") {
      return [{ ...clone(value), __simple: false }];
    }
    return [];
  });
}

function normalizeEntityContainer(container) {
  return {
    ...container,
    entities: flattenEntities(container.entities),
    __hadEntities: Object.hasOwn(container, "entities"),
    __entitySource: clone(container.entities),
  };
}

export function normalizeConfig(config) {
  const model = clone(config || {});
  if (model.config_version === 2 && Array.isArray(model.pages)) {
    model.pages = model.pages.map(page => Array.isArray(page.sections)
      ? { ...page, sections: page.sections.map(normalizeEntityContainer) }
      : normalizeEntityContainer(page));
    for (const page of model.pages) {
      page.__pageLayout = Array.isArray(page.sections) ? 'sections' : 'flat';
      page.__sectionCount = pageContainers(page).length;
      let position = 0;
      pageContainers(page).forEach((container, index) => {
        container.__sectionIndex = index;
        for (const card of container.entities) {
          position += 1;
          card.__localId = card.id || `card-${position}`;
        }
      });
    }
    return model;
  }
  model.__missingSections = ["overview", "pages", "rooms"].filter((key) => !Object.hasOwn(model, key));
  model.overview = model.overview && typeof model.overview === "object" ? model.overview : {};
  model.pages = model.pages && typeof model.pages === "object" ? model.pages : {};
  model.rooms = Array.isArray(model.rooms) ? model.rooms : [];
  model.rooms = model.rooms.map((room) => normalizeEntityContainer({ ...room, entities: room.entities ?? [] }));
  if (Array.isArray(model.pages.custom)) {
    model.pages.custom = model.pages.custom.map((page) => normalizeEntityContainer(page));
  }
  return model;
}

function serializeEntityContainer(container, options) {
  const output = { ...container };
  const hadEntities = output.__hadEntities;
  const entitySource = output.__entitySource;
  delete output.__hadEntities;
  delete output.__entitySource;
  delete output.__sectionIndex;
  const grouped = {};
  const ordered = [];
  for (const item of container.entities || []) {
    const entity = { ...item };
    const simple = entity.__simple;
    delete entity.__simple;
    if (options?.materializeIds && !entity.id) entity.id = entity.__localId;
    delete entity.__localId;
    if (entity.template === 'hc_entity_group_card') {
      (grouped.entity_group ||= []).push(entity);
      ordered.push(entity);
      continue;
    }
    if (typeof entity.page === "string") {
      (grouped.navigation ||= []).push(entity);
      ordered.push(entity);
      continue;
    }
    if (entity.template && !entity.entity_id) {
      (grouped.cards ||= []).push(entity);
      ordered.push(entity);
      continue;
    }
    if (!entity.entity_id?.includes(".")) continue;
    const domain = entity.entity_id.split(".", 1)[0];
    const value = simple && Object.keys(entity).length === 1 ? entity.entity_id : entity;
    (grouped[domain] ||= []).push(value);
    ordered.push(value);
  }
  if (!options?.materializeIds && hadEntities && entitySource !== undefined && JSON.stringify((container.entities || []).map(({ __localId, ...card }) => card)) === JSON.stringify(flattenEntities(entitySource))) {
    if (hadEntities) output.entities = entitySource;
    else delete output.entities;
  } else if (hadEntities || (container.entities || []).length) {
    output.entities = options?.ordered || container.columns || Array.isArray(entitySource) ? ordered : grouped;
  } else {
    delete output.entities;
  }
  return output;
}

export function serializeConfig(model) {
  const config = clone(model);
  if (config.config_version === 2 && Array.isArray(config.pages)) {
    config.pages = config.pages.map(page => {
      const containers = pageContainers(page);
      const materializeIds = page.__pageLayout !== (Array.isArray(page.sections) ? 'sections' : 'flat')
        || page.__sectionCount !== containers.length || containers.some((container, index) => container.__sectionIndex !== index
          || JSON.stringify((container.entities || []).map(({ __localId, ...card }) => card)) !== JSON.stringify(flattenEntities(container.__entitySource)));
      const options = { ordered: true, materializeIds };
      const output = Array.isArray(page.sections)
        ? { ...page, sections: page.sections.map(section => serializeEntityContainer(section, options)) }
        : serializeEntityContainer(page, options);
      delete output.__pageLayout; delete output.__sectionCount; delete output.__sectionIndex;
      return output;
    });
    return config;
  }
  config.rooms = (config.rooms || []).map(serializeEntityContainer);
  if (Array.isArray(config.pages?.custom)) {
    config.pages.custom = config.pages.custom.map(serializeEntityContainer);
  }
  for (const key of config.__missingSections || []) {
    if (!Object.keys(config[key] || {}).length) delete config[key];
  }
  delete config.__missingSections;
  return config;
}

export function importAreaRoom(area, entities, supportedDomains) {
  const supported = new Set(supportedDomains || []);
  const imported = entities
    .filter(
      (entity) =>
        (entity.area_id || entity.device_area_id) === area.area_id &&
        supported.has(entity.domain || entity.entity_id?.split(".")[0]) &&
        entity.has_state === true &&
        !entity.disabled_by &&
        !entity.hidden_by,
    )
    .map((entity) => ({ entity_id: entity.entity_id, __simple: true }));
  return {
    name: area.name,
    path: `room-${slugify(area.name)}`,
    icon: area.icon || "mdi:sofa-outline",
    area: area.area_id,
    entities: imported,
    __hadEntities: true,
    __entitySource: undefined,
  };
}

export function moveItem(items, from, to) {
  const copy = [...items];
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// Boundaries refer to the destination before removal. Raw cards and section metadata stay put.
// Require the same occurrence object: entity IDs are not unique within a page.
export function movePageCard(page, fromSection, fromIndex, toSection, boundary, occurrence) {
  if (!page || ![fromSection, fromIndex, toSection, boundary].every(Number.isInteger)) return false;
  const sections = pageContainers(page), source = sections[fromSection]?.entities, target = sections[toSection]?.entities;
  if (!Array.isArray(source) || !Array.isArray(target) || fromIndex < 0 || fromIndex >= source.length
    || boundary < 0 || boundary > target.length || !occurrence || source[fromIndex] !== occurrence) return false;
  const insertion = boundary - (source === target && boundary > fromIndex ? 1 : 0);
  if (source === target && insertion === fromIndex) return false;
  source.splice(fromIndex, 1);
  target.splice(insertion, 0, occurrence);
  return true;
}

export function pageContainers(page) {
  return Array.isArray(page.sections) ? page.sections : [page];
}

export function roomPageTemplate(model) {
  return { icon: 'mdi:sofa', columns: 2, entities: model.pages.filter(page => page.area || page.subview).map(page => {
    const cards = pageContainers(page).flatMap(container => flattenEntities(container.entities));
    const members = cards.flatMap(card => card.template === 'hc_entity_group_card' ? flattenEntities(card.entities) : [card]);
    const lights = [...new Set(members.filter(card => card.entity_id?.startsWith('light.')).map(card => card.entity_id))];
    const primary = lights[0] || members.find(card => card.entity_id)?.entity_id;
    return { template: 'hc_room_card', name: page.name, icon: page.icon || 'mdi:sofa', page: page.path,
      ...(primary ? { entity_id: primary } : {}), variables: { light_entities: lights } };
  }) };
}

export function createPage(model, details, templates) {
  const name = String(details.name || '').trim(), path = details.path || slugify(name);
  if (!name) throw new Error('Each page requires a name.');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(path) || model.pages.some(page => page.path === path)) throw new Error('Each page requires a unique safe path.');
  if (!Object.hasOwn(templates, details.template)) throw new Error('Choose a supported page template.');
  const page = clone(templates[details.template]);
  page.id = path; page.path = path; page.name = name; page.icon = details.icon || page.icon || 'mdi:file-outline';
  delete page.name_key; delete page.output_path;
  if (details.area) page.area = details.area; else delete page.area;
  const normalized = normalizeConfig({ config_version: 2, pages: [page] }).pages[0];
  for (const container of pageContainers(normalized)) for (const card of container.entities || []) {
    if (card.template === 'hc_title_card' && card.id === 'page-title') card.name = name;
    card.id = newEntityGroupId().replace('group-', 'card-');
    // Starter links use each new page instance; saved pages are never repopulated.
    if (card.variables) { delete card.variables.popup_hash; delete card.variables.mode_selector_hash; }
  }
  model.pages.push(normalized);
  pinPage(model, path, true);
  return normalized;
}

export function addPageSection(page) {
  if (!Array.isArray(page.sections)) {
    const first = {};
    for (const key of ['entities', 'cards', 'columns', '__hadEntities', '__entitySource']) {
      if (Object.hasOwn(page, key)) { first[key] = page[key]; delete page[key]; }
    }
    page.sections = Object.keys(first).length ? [first] : [];
  }
  page.sections.push(normalizeEntityContainer({ entities: [] }));
}

function replaceOwnedReferences(value, oldPath, newPath, dashboardRoot) {
  if (Array.isArray(value)) { value.forEach(item => replaceOwnedReferences(item, oldPath, newPath, dashboardRoot)); return; }
  if (!value || typeof value !== 'object') return;
  if (value.page === oldPath) value.page = newPath;
  for (const key of ['navigation_path', 'url']) {
    if (value[key] === `${dashboardRoot}/${oldPath}`) value[key] = `${dashboardRoot}/${newPath}`;
  }
  for (const key of ['popup_hash', 'mode_selector_hash', 'hash', 'navigation_path']) {
    if (typeof value[key] === 'string' && value[key].startsWith(`#page-${oldPath}-`)) value[key] = `#page-${newPath}-${value[key].slice(`#page-${oldPath}-`.length)}`;
  }
  Object.values(value).forEach(item => replaceOwnedReferences(item, oldPath, newPath, dashboardRoot));
}

export function renamePage(model, index, path, dashboardRoot) {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(path) || model.pages.some((page, position) => position !== index && page.path === path)) throw new Error('Each page requires a unique safe path.');
  const oldPath = model.pages[index].path;
  model.pages[index].path = path;
  renamePageReferences(model, oldPath, path, dashboardRoot);
}

export function duplicatePage(model, index, name, dashboardRoot) {
  const page = clone(model.pages[index]);
  const base = slugify(name);
  let path = base, suffix = 2;
  while (model.pages.some(item => item.path === path)) path = `${base}-${suffix++}`;
  const oldPath = page.path;
  page.name = name; page.path = path; page.id = path;
  delete page.name_key; delete page.output_path;
  const hashes = new Map();
  for (const container of pageContainers(page)) {
    for (const card of container.entities || []) {
      card.id = newEntityGroupId().replace('group-', 'card-');
      const visit = item => {
        if (Array.isArray(item)) { item.forEach(visit); return; }
        if (!item || typeof item !== 'object') return;
        for (const key of ['popup_hash', 'mode_selector_hash']) {
          if (typeof item[key] === 'string') hashes.set(item[key], `#page-${path}-${card.id}-${key === 'mode_selector_hash' ? 'modes' : 'popup'}${hashes.size ? '-' + hashes.size : ''}`);
        }
        Object.values(item).forEach(visit);
      };
      visit(card);
    }
    const visitRaw = item => {
      if (Array.isArray(item)) { item.forEach(visitRaw); return; }
      if (!item || typeof item !== 'object') return;
      if (item.type === 'custom:marao-popup-card' && typeof item.hash === 'string') hashes.set(item.hash, `#page-${path}-raw-${hashes.size + 1}-popup`);
      Object.values(item).forEach(visitRaw);
    };
    visitRaw(container.cards || []);
  }
  const replaceHashes = value => {
    if (Array.isArray(value)) { value.forEach(replaceHashes); return; }
    if (!value || typeof value !== 'object') return;
    for (const key of ['popup_hash', 'mode_selector_hash', 'hash', 'navigation_path']) if (hashes.has(value[key])) value[key] = hashes.get(value[key]);
    Object.values(value).forEach(replaceHashes);
  };
  replaceHashes(page);
  replaceOwnedReferences(page, oldPath, path, dashboardRoot);
  model.pages.splice(index + 1, 0, page);
  return page;
}

export function pinPage(model, path, pinned) {
  if (!model.pages.some(page => page.path === path)) throw new Error('Select an existing page.');
  const navigation = model.navigation || [];
  const has = entry => entry === path || entry?.page === path;
  if (!pinned) model.navigation = navigation.filter(entry => !has(entry));
  else if (!navigation.some(has)) {
    model.navigation = [...navigation, path];
  }
}

export function pageReferences(model, path, dashboardRoot) {
  const references = [];
  if (model.landing_page === path) references.push({ kind: 'landing', name: path });
  for (const entry of model.navigation || []) if (entry === path || entry?.page === path || entry?.url === `${dashboardRoot}/${path}`) references.push({ kind: 'navigation', name: entry.label || path });
  const visit = (value, page) => {
    if (Array.isArray(value)) { value.forEach(item => visit(item, page)); return; }
    if (!value || typeof value !== 'object') return;
    if (value.page === path || value.navigation_path === `${dashboardRoot}/${path}`) references.push({ kind: 'card', name: page.name });
    if (typeof value.navigation_path === 'string' && value.navigation_path.startsWith(`#page-${path}-`)) references.push({ kind: 'popup', name: page.name });
    Object.entries(value).filter(([key]) => !key.startsWith('__')).forEach(([, item]) => visit(item, page));
  };
  model.pages.filter(page => page.path !== path).forEach(page => visit(page, page));
  return references;
}

export function deletePage(model, index, replacement, dashboardRoot) {
  const removed = model.pages[index];
  if (model.pages.length === 1) throw new Error('Keep at least one page.');
  const references = pageReferences(model, removed.path, dashboardRoot);
  if (references.some(reference => reference.kind === 'popup')) throw new Error('Remove or retarget popup links before deleting this page.');
  if (references.length && (!replacement || replacement === removed.path || !model.pages.some(page => page.path === replacement))) throw new Error('Choose a replacement page for the landing view and existing links.');
  if (replacement) renamePageReferences(model, removed.path, replacement, dashboardRoot);
  model.pages.splice(index, 1);
}

function renamePageReferences(model, oldPath, newPath, dashboardRoot) {
  if (model.landing_page === oldPath) model.landing_page = newPath;
  if (Array.isArray(model.navigation)) model.navigation = model.navigation.map(entry => entry === oldPath ? newPath : entry);
  replaceOwnedReferences(model.navigation, oldPath, newPath, dashboardRoot);
  replaceOwnedReferences(model.pages, oldPath, newPath, dashboardRoot);
}

export function entityMeta(entities, entityId) {
  return entities.find((entity) => entity.entity_id === entityId);
}

export function preserveEntityValue(existing, entityId) {
  if (!entityId) return "";
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return { ...clone(existing), entity_id: entityId };
  }
  return entityId;
}

export function mergeEntityValues(existing, entityIds) {
  const current = new Map(
    (Array.isArray(existing) ? existing : existing == null ? [] : [existing])
      .map((value) => [typeof value === "string" ? value : value?.entity_id, value])
      .filter(([entityId]) => entityId),
  );
  return entityIds.map((entityId) => preserveEntityValue(current.get(entityId), entityId));
}

export function cardForEntity(catalog, entity) {
  if (!entity) return null;
  const domain = entity.domain || entity.entity_id?.split(".", 1)[0];
  const special = catalog.cards.find(
    (card) =>
      card.device_classes?.includes(entity.device_class) && card.domains.includes(domain),
  );
  if (special) return special;
  const defaults = {
    binary_sensor: "hc_sensor_card",
    camera: "hc_camera_card",
    climate: "hc_climate_card",
    cover: "hc_cover_card",
    fan: "hc_fan_card",
    input_boolean: "hc_switch_card",
    input_number: "hc_number_card",
    light: "hc_light_card",
    lock: "hc_access_card",
    media_player: "hc_media_card",
    number: "hc_number_card",
    sensor: "hc_sensor_card",
    switch: "hc_switch_card",
    vacuum: "hc_vacuum_card",
    weather: 'hc_weather_card', alarm_control_panel: 'hc_security_card', button: 'hc_access_card', script: 'hc_access_card', scene: 'hc_switch_card',
  };
  return catalog.cards.find((card) => card.id === defaults[domain]) || null;
}

export function configuredEntityIds(container) {
  const ids = new Set(flattenEntities(container.entities).map(item => item.entity_id).filter(Boolean));
  const visit = (value, key = "") => {
    if (typeof value === "string" && /^(entity|entity_id|entities)$|_entities$|_entity$/.test(key) && /^[a-z_]+\.[a-z0-9_]+$/i.test(value)) ids.add(value);
    else if (Array.isArray(value)) value.forEach(item => visit(item, key));
    else if (value && typeof value === "object") Object.entries(value).forEach(([field, item]) => visit(item, field));
  };
  visit(container.cards);
  return ids;
}

export function entityCandidates(catalog, entities, container, search = "") {
  const query = search.trim().toLocaleLowerCase();
  const added = configuredEntityIds(container);
  return entities.flatMap(entity => {
    const card = cardForEntity(catalog, entity);
    if (!card || entity.disabled_by || entity.hidden_by || entity.has_state !== true) return [];
    const group = container.template === 'hc_entity_group_card';
    if (group && !entityGroupMemberCompatible(container.entity_type, { entity_id: entity.entity_id }, entity)) return [];
    if (query ? !`${entity.name || ""} ${entity.entity_id}`.toLocaleLowerCase().includes(query)
      : (!group && (!container.area || (entity.area_id || entity.device_area_id) !== container.area)) || added.has(entity.entity_id)) return [];
    return [{ ...entity, card, added: added.has(entity.entity_id) }];
  }).sort((a, b) => (a.name || a.entity_id).localeCompare(b.name || b.entity_id) || a.entity_id.localeCompare(b.entity_id));
}

export function validateConfig(config, configVersion = 1, entities, units = {}, catalog) {
  const errors = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return ["Dashboard JSON must be an object."];
  }
  const version = Object.hasOwn(config, "config_version") ? config.config_version : 0;
  if (!Number.isInteger(version) || version < 0) errors.push("config_version must be a nonnegative integer.");
  else if (version > configVersion) errors.push("Unsupported dashboard format. Update Marao before editing this configuration.");
  if (errors.length) return errors;
  if (!String(config.name || "").trim()) errors.push("Dashboard name is required.");
  if (Object.hasOwn(config, 'show_cache_reset') && typeof config.show_cache_reset !== 'boolean') errors.push('Show cache reset button must be a boolean.');
  if (version === 2) errors.push(...validatePages(config, catalog));
  else if (!Array.isArray(config.rooms)) errors.push("Rooms must be a list.");
  for (const [index, room] of (Array.isArray(config.rooms) ? config.rooms : []).entries()) {
    if (!room || typeof room !== 'object' || Array.isArray(room)) { errors.push('Each room must be an object.'); continue; }
    if (version >= 1 && ["include", "exclude", "overrides"].some(key => Object.hasOwn(room, key))) errors.push("Current room selections use explicit entities; import legacy include/exclude/overrides before editing.");
    if (!String(room.name || "").trim()) errors.push(`Room ${index + 1} needs a name.`);
    if (room.columns != null && (!Number.isInteger(room.columns) || room.columns < 1 || room.columns > 6)) errors.push(`Room ${index + 1} columns must be between 1 and 6.`);
  }
  if (config.navigation != null && !Array.isArray(config.navigation)) errors.push("Navigation must be a list.");
  if (Array.isArray(config.navigation) && config.navigation.some(route => typeof route === 'string' ? !route.trim()
    : !route || typeof route !== 'object' || Array.isArray(route) || (Object.hasOwn(route, 'page') ? typeof route.page !== 'string' || !route.page.trim()
      : typeof route.url !== 'string' || !route.url.trim() || typeof route.label !== 'string' || !route.label.trim()))) errors.push('Navigation entries require a page or a labeled URL.');
  if (config.pages?.custom != null && !Array.isArray(config.pages.custom)) errors.push("Custom pages must be a list.");
  for (const [index, page] of (Array.isArray(config.pages?.custom) ? config.pages.custom : []).entries()) {
    if (!page || typeof page !== 'object' || Array.isArray(page)) { errors.push('Each custom page must be an object.'); continue; }
    if (!String(page.name || "").trim()) errors.push(`Custom page ${index + 1} needs a name.`);
    if (!String(page.path || "").trim()) errors.push(`Custom page ${index + 1} needs a path.`);
    if (page.columns != null && (!Number.isInteger(page.columns) || page.columns < 1 || page.columns > 6)) errors.push(`Custom page ${index + 1} columns must be between 1 and 6.`);
  }
  const groupIds = new Set();
  const checkGroup = (group, overview = false) => {
    const id = group?.id, kind = group?.entity_type;
    if (!group || typeof group !== 'object' || group.template !== 'hc_entity_group_card') { errors.push('Entity Group must be an hc_entity_group_card object.'); return; }
    if (typeof id !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(id)) errors.push('Entity Group requires a stable safe id.');
    if (groupIds.has(id)) errors.push('Duplicate Entity Group id.');
    groupIds.add(id);
    const reserved = { 'overview-lights': 'light', 'overview-blinds': 'cover', 'overview-climate': 'climate', 'overview-maintenance': 'battery' };
    if (Object.hasOwn(reserved, id) && !overview && version < 2) errors.push('Entity Group id is reserved.');
    if (!['light', 'cover', 'battery', 'climate'].includes(kind)) errors.push('Choose a supported Entity Group type.');
    if (typeof group.name !== 'string' || !group.name.trim()) errors.push('Entity Group requires a name.');
    if (group.icon != null && typeof group.icon !== 'string') errors.push('Entity Group icon must be a string.');
    if (Object.hasOwn(group, 'entity_id') || Object.hasOwn(group, 'page')) errors.push('Entity Group cannot have a primary entity or page.');
    if (Object.hasOwn(group, 'popup_filter') && !['all', 'active'].includes(group.popup_filter)) errors.push('Choose All entities or Active only.');
    if (!Array.isArray(group.entities)) { errors.push('Entity Group entities must be a list.'); return; }
    for (const member of group.entities) {
      const value = typeof member === 'string' ? { entity_id: member } : member;
      if (!value || typeof value !== 'object' || Object.hasOwn(value, 'page') || Object.hasOwn(value, 'entities') || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(value.entity_id || '')) {
        errors.push('Entity Group members must be entity strings or objects, without nesting.'); continue;
      }
      const metadata = entities?.find(entity => entity.entity_id === value.entity_id);
      if (value.variables != null && (typeof value.variables !== 'object' || Array.isArray(value.variables))) errors.push('Entity Group member options must be an object.');
      if (['name', 'icon'].some(key => value[key] != null && typeof value[key] !== 'string')) errors.push('Entity Group member name and icon must be strings.');
      const legacyBattery = (overview || version === 2) && id === 'overview-maintenance' && value.entity_id.includes('battery');
      if (!entityGroupMemberCompatible(kind, value, metadata, legacyBattery)) errors.push('Entity Group has an incompatible member.');
    }
  };
  if (Object.hasOwn(config.overview || {}, 'entity_groups')) {
    if (!Array.isArray(config.overview.entity_groups)) errors.push('Overview Entity Groups must be a list.');
    else config.overview.entity_groups.forEach(group => checkGroup(group, true));
  }
  const containers = version === 2 && Array.isArray(config.pages)
    ? config.pages.filter(page => page && typeof page === 'object').flatMap(page => Array.isArray(page.sections) ? page.sections : [page])
    : [...(Array.isArray(config.rooms) ? config.rooms : []), ...(Array.isArray(config.pages?.custom) ? config.pages.custom : [])];
  for (const container of containers.filter(item => item && typeof item === 'object')) {
    if (version === 2) groupIds.clear();
    flattenEntities(container.entities).filter(item => item.template === 'hc_entity_group_card').forEach(group => checkGroup(group));
  }
  const metadata = new Map((entities || []).map(entity => [entity.entity_id, entity.unit_of_measurement]));
  const eligible = new Set(["hc_graph_card", "hc_toggle_graph_card", "hc_sensor_card", "hc_base_card", "hc_switch_card", "hc_energy_period_card"]);
  const visit = item => {
    if (Array.isArray(item)) { item.forEach(visit); return; }
    if (!item || typeof item !== "object") return;
    const direct = item.type === "custom:marao-energy-period-card";
    const entity = item.entity_id || item.entity;
    const load = typeof item.power_entity === "object" ? item.power_entity?.entity_id : item.power_entity;
    const domain = typeof entity === "string" ? entity.split(".")[0] : undefined;
    const template = item.template || ({sensor: "hc_sensor_card", switch: "hc_switch_card", input_boolean: "hc_switch_card"})[domain];
    const options = direct ? item : item.variables;
    if (template==='hc_graph_card' && (!item.type || item.type==='custom:marao-card') && options && Object.hasOwn(options,'power_devices')) {
      errors.push(...validatePowerDevices(options, options.graph_entity || entity));
      if (Array.isArray(options.power_devices) && options.power_devices.length && Object.keys(units).length) {
        const sources=[options.graph_entity||entity,...options.power_devices.map(item=>item?.entity_id)];
        if(sources.some(source=>metadata.get(source)&&units[metadata.get(source)]?.[0]!=='power'))errors.push('Power devices require power sensors in W or kW.');
      }
    }
    if ((direct || template === 'hc_energy_period_card') && options) {
      errors.push(...validateEnergyOptions(options));
      const members = Array.isArray(options.sub_entities) ? options.sub_entities : [];
      const sources = [...(options.calculate_cost ? [entity] : []), ...members.map(member => member?.entity_id)];
      if (Object.keys(units).length && sources.some(source => metadata.get(source) && units[metadata.get(source)]?.[0] !== 'energy')) errors.push('Cost calculations and breakdowns require energy sensors.');
      for (const member of members) {
        const source = entities?.find(source => source.entity_id === member?.cost_entity);
        if (source && (Object.hasOwn(units, source.unit_of_measurement) || source.device_class && source.device_class !== 'monetary')) errors.push('Cost breakdown requires monetary sensors.');
      }
    }
    if ((direct || ((!item.type || item.type === "custom:marao-card") && (eligible.has(template) || load))) && options) {
      if (Object.hasOwn(options, "display_precision") && (!Number.isInteger(options.display_precision) || options.display_precision < 0 || options.display_precision > 6)) errors.push("Decimal places must be an integer from 0 to 6.");
      if (Object.hasOwn(options, "display_unit")) {
        const target = options.display_unit;
        if (typeof target !== "string" || !Object.hasOwn(units, target)) errors.push("Choose a supported power or energy display unit.");
        else if (entities) {
          const sources = template === "hc_switch_card" ? [options.power_entity] : [entity || load];
          const graph = options.graph_entity || item.graph_entity;
          if (graph && ["hc_graph_card", "hc_toggle_graph_card"].includes(template)) sources.push(graph);
          if (sources.some(source => !Object.hasOwn(units, metadata.get(source)))) errors.push("A supported source unit is required for conversion.");
          else if (sources.some(source => units[metadata.get(source)][0] !== units[target][0])) errors.push("Display unit is incompatible with the source reading.");
        }
      }
    }
    Object.values(item).forEach(visit);
  };
  visit(version === 2 ? config.pages : config);
  return [...new Set(errors)];
}

export function validateEnergyOptions(options) {
  const errors = [];
  if (Object.hasOwn(options, 'calculate_cost') && typeof options.calculate_cost !== 'boolean') errors.push('Calculate cost must be a boolean.');
  if (Object.hasOwn(options, 'cost_per_kwh') && (typeof options.cost_per_kwh !== 'number' || !Number.isFinite(options.cost_per_kwh) || options.cost_per_kwh < 0)) errors.push('Price per kWh must be a finite nonnegative number.');
  if (!Object.hasOwn(options, 'sub_entities')) return errors;
  if (!Array.isArray(options.sub_entities)) return [...errors, 'Energy breakdown must be a list.'];
  const sources = new Set();
  for (const member of options.sub_entities) {
    if (!member || typeof member !== 'object' || Array.isArray(member)) { errors.push('Energy breakdown entries must be objects.'); continue; }
    if (typeof member.entity_id !== 'string' || !/^sensor\.[a-z0-9_]+$/.test(member.entity_id)) errors.push('Choose an energy sensor for each breakdown entry.');
    if (sources.has(member.entity_id)) errors.push('Energy breakdown sources must be unique.');
    sources.add(member.entity_id);
    if (Object.hasOwn(member, 'name') && typeof member.name !== 'string') errors.push('Energy breakdown names must be text.');
    if (member.cost_entity != null && member.cost_entity !== '' && (typeof member.cost_entity !== 'string' || !/^sensor\.[a-z0-9_]+$/.test(member.cost_entity))) errors.push('Choose a cost sensor for each breakdown entry.');
  }
  return errors;
}

export function validatePages(config, catalog) {
  const errors = [], paths = new Set(), pageIds = new Set(), outputPaths = new Set(), references = [];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const safePath = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]*$/.test(value);
  const safeId = value => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(value);
  const entityId = value => typeof value === 'string' && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(value);
  const freeRoles = new Set(['hc_title_card', 'hc_navigation_card', 'hc_room_card', 'hc_entity_group_card', 'hc_scene_collection_card']);
  const templates = new Map((catalog?.cards || []).map(card => [card.id, card.domains]));
  if (['overview', 'rooms'].some(key => Object.hasOwn(config, key))) errors.push('Mixed legacy and canonical page configuration.');
  if (!Array.isArray(config.pages) || !config.pages.length) return [...errors, 'Keep at least one page.'];
  for (const page of config.pages) {
    if (!object(page)) { errors.push('Each page must be an object.'); continue; }
    if (typeof page.name !== 'string' || !page.name.trim()) errors.push('Each page requires a name.');
    if (!safePath(page.path) || paths.has(page.path)) errors.push('Each page requires a unique safe path.');
    paths.add(page.path);
    if (page.output_path != null) {
      if (typeof page.output_path !== 'string' || !/^views\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.yaml$/.test(page.output_path) || outputPaths.has(page.output_path)) errors.push('Page output paths must be safe unique view files.');
      outputPaths.add(page.output_path);
    }
    if (page.id != null) {
      if (!safeId(page.id) || pageIds.has(page.id)) errors.push('Each page identity must be safe and unique.');
      pageIds.add(page.id);
    }
    if (Object.hasOwn(page, 'subview') && typeof page.subview !== 'boolean') errors.push('Page subview must be a boolean.');
    if (['icon', 'area'].some(key => page[key] != null && typeof page[key] !== 'string')) errors.push('Page icon and area must be strings.');
    if (Object.hasOwn(page, 'sections') && ['entities', 'cards', 'columns'].some(key => Object.hasOwn(page, key))) errors.push('A page cannot mix sections with flat entities, cards or columns.');
    const sections = Object.hasOwn(page, 'sections') ? page.sections : [page];
    if (!Array.isArray(sections)) { errors.push('Page sections must be a list of objects.'); continue; }
    const ids = new Set();
    const entries = spec => {
      if (spec == null) return [];
      if (typeof spec === 'string') return [{ entity_id: spec }];
      if (Array.isArray(spec)) return spec.flatMap(entries);
      if (object(spec)) return ['entity_id', 'page', 'template'].some(key => Object.hasOwn(spec, key)) ? [spec] : Object.values(spec).flatMap(entries);
      errors.push('Page entities must be strings, descriptors, lists or grouped objects.'); return [];
    };
    for (const section of sections) {
      if (!object(section)) { errors.push('Page sections must be a list of objects.'); continue; }
      if (Object.hasOwn(section, 'sections') && section !== page) errors.push('Page sections cannot contain nested sections.');
      if (section.columns != null && (!Number.isInteger(section.columns) || section.columns < 1 || section.columns > 6)) errors.push('Columns must be an integer between 1 and 6.');
      if (Object.hasOwn(section, 'cards') && (!Array.isArray(section.cards) || section.cards.some(card => !object(card)))) errors.push('Raw cards must be a list of Lovelace card objects.');
      for (const card of entries(section.entities)) {
        if (card.id != null) {
          if (!safeId(card.id) || ids.has(card.id)) errors.push('Each local card identity must be safe and unique within its page.');
          ids.add(card.id);
        }
        if (card.template === 'ha_card') {
          if (typeof card.yaml !== 'string' || !card.yaml.trim()) errors.push('Home Assistant card YAML must be nonempty text.');
          continue;
        }
        if (card.template != null && (typeof card.template !== 'string' || catalog && !templates.has(card.template))) errors.push('Choose a supported page card template.');
        if (card.entity_id != null && !entityId(card.entity_id)) errors.push('Page card entity_id must be a valid entity.');
        if (!freeRoles.has(card.template) && !card.entity_id && !Object.hasOwn(card, 'page')) errors.push('Bind or remove the draft card before generation.');
        if (entityId(card.entity_id) && !freeRoles.has(card.template) && templates.has(card.template) && !templates.get(card.template).includes(card.entity_id.split('.')[0])) errors.push('Page card binding is incompatible with its template.');
        if (['name', 'icon'].some(key => card[key] != null && typeof card[key] !== 'string')) errors.push('Card name and icon must be strings.');
        if (card.variables != null && !object(card.variables)) errors.push('Card options must be an object.');
        const options = object(card.variables) ? card.variables : {};
        if (card.template === 'hc_vacuum_card' && ['action_1', 'action_2', 'action_3'].some(key => object(options[key]) && Object.hasOwn(options[key], 'data') && !object(options[key].data))) errors.push('Vacuum action data must be an object');
        let accessRole = card.template;
        if (['hc_access_card', 'hc_access_slide_action_card', 'hc_access_action_card', 'hc_access_hold_action_card'].includes(accessRole)) {
          const mode = options.access_mode ?? 'auto', domain = card.entity_id?.split('.')[0];
          const modes = { popup: ['lock', 'cover'], slide: ['lock', 'cover', 'button', 'switch', 'script'], close: ['lock', 'cover'], hold: ['button', 'switch', 'input_boolean', 'alarm_control_panel'] };
          if (mode !== 'auto' && (!Object.hasOwn(modes, mode) || !modes[mode].includes(domain))) errors.push('Access behavior is incompatible with the selected entity.');
          accessRole = ({ popup: 'hc_access_card', slide: 'hc_access_slide_action_card', close: 'hc_access_action_card', hold: 'hc_access_hold_action_card' })[mode] || accessRole;
          if (mode === 'auto' && accessRole === 'hc_access_card' && !['lock', 'cover'].includes(domain)) accessRole = domain === 'script' ? 'hc_access_slide_action_card' : 'hc_access_hold_action_card';
          if (accessRole === 'hc_access_action_card' && options.action_service && options.action_service !== ({lock: 'lock.lock', cover: 'cover.close_cover'})[domain]) errors.push('Use an access opener slide for opening or unlocking');
        }
        if (accessRole === 'hc_access_action_card' && options.access_mode === 'close' && ['tap_action', 'hold_action', 'double_tap_action'].some(key => (card[key]?.action ?? 'none') !== 'none')) errors.push('Close and lock cards use their explicit safe service');
        if (accessRole === 'hc_access_slide_action_card') {
          const opener = { lock: 'lock.unlock', cover: 'cover.open_cover', button: 'button.press', switch: 'switch.turn_on', script: 'script.turn_on' }[card.entity_id?.split('.')[0]];
          if (!opener || (Object.hasOwn(options, 'action_service') ? options.action_service : opener) !== opener) errors.push("Access opener must use its selected entity's native opening service");
          if (['tap_action', 'hold_action', 'double_tap_action'].some(key => (card[key]?.action ?? 'none') !== 'none')) errors.push('Access openers use only the strict slide');
        }
        if (card.template === 'hc_energy_period_card' && !['day', 'month'].includes(options.period ?? 'day')) errors.push('Energy period must be day or month.');
        if (card.template === 'hc_energy_period_card') errors.push(...validateEnergyOptions(options));
        if (card.template === 'hc_graph_card') errors.push(...validatePowerDevices(options, options.graph_entity || card.entity_id));
        if (card.template === 'hc_wallbox_current_card' && Object.hasOwn(options, 'shortcuts') && (!Array.isArray(options.shortcuts) || options.shortcuts.length > 3 || options.shortcuts.some(value => typeof value !== 'number' || !Number.isFinite(value)))) errors.push('Charging shortcuts require at most three finite numbers.');
        if (card.template === 'hc_light_card' && Object.hasOwn(options, 'use_light_color') && typeof options.use_light_color !== 'boolean') errors.push('Use light color as background must be a boolean.');
        if (card.template === 'hc_camera_card' && Object.hasOwn(options, 'preload_stream') && typeof options.preload_stream !== 'boolean') errors.push('Preload stream must be a boolean.');
        if (card.template === 'hc_camera_card' && options.popup_stream_entity != null && options.popup_stream_entity !== '' && (!entityId(options.popup_stream_entity) || !options.popup_stream_entity.startsWith('camera.'))) errors.push('Choose a camera entity for the popup stream.');
        if (card.template === 'hc_room_card' && Object.hasOwn(options, 'light_entities') && (!Array.isArray(options.light_entities) || options.light_entities.some(value => !entityId(value) || !value.startsWith('light.')))) errors.push('Room lights must be an explicit list of light entities.');
        if (card.template === 'hc_media_app_card' && (typeof options.app_source !== 'string' || !options.app_source.trim())) errors.push('Media app requires an explicit source.');
        if (accessRole === 'hc_access_hold_action_card' && Object.hasOwn(card, 'tap_action')) {
          const action = card.tap_action, button = card.entity_id?.startsWith('button.');
          const valid = object(action) && (button
            ? action.action === 'perform-action' && action.perform_action === 'button.press' && object(action.target) && Object.keys(action.target).length === 1 && action.target.entity_id === card.entity_id
            : action.action === 'toggle');
          if (!valid) errors.push('Security action must control its selected entity with the native service.');
        }
        if (card.apple_tv != null && card.apple_tv !== false) {
          if (!object(card.apple_tv)) errors.push('Apple TV options must be an object or false.');
          else {
            for (const key of ['remote_entity', 'volume_remote_entity']) {
              const binding = card.apple_tv[key], domains = key === 'remote_entity' ? ['remote'] : ['remote', 'media_player'];
              if (binding != null && (!entityId(binding) || !domains.includes(binding.split('.')[0]))) errors.push('Choose a compatible media remote entity.');
            }
            const apps = card.apple_tv.apps ?? [];
            if (!Array.isArray(apps) || apps.some(app => !object(app) || typeof app.source !== 'string' || !app.source.trim())) errors.push('Media apps require an explicit ordered list of sources.');
          }
        }
        if (Object.hasOwn(card, 'page')) references.push(card.page);
        else if (['hc_navigation_card', 'hc_room_card'].includes(card.template) && (!object(card.tap_action) || !['navigate', 'none'].includes(card.tap_action.action))) errors.push('Choose a destination for the page shortcut.');
        if (card.template === 'hc_scene_collection_card') {
          if (!Array.isArray(card.entities)) errors.push('Scene collection entities must be an explicit list.');
          else if (entries(card.entities).some(member => !entityId(member.entity_id) || !['scene', 'switch', 'input_boolean'].includes(member.entity_id.split('.')[0]))) errors.push('Scene collection members must be native scenes or toggle entities.');
        }
      }
    }
  }
  if (!paths.has(config.landing_page)) errors.push('Select an existing landing page.');
  const navigation = config.navigation ?? [];
  if (!Array.isArray(navigation)) errors.push('Navigation must be a list.');
  else for (const route of navigation) {
    if (typeof route === 'string') references.push(route);
    else if (object(route) && Object.hasOwn(route, 'page')) references.push(route.page);
    else if (!object(route) || typeof route.url !== 'string' || typeof route.label !== 'string') errors.push('Navigation entries require a page or a labeled URL.');
  }
  if (references.some(reference => typeof reference !== 'string' || !paths.has(reference))) errors.push('Retarget or remove references to missing pages.');
  return [...new Set(errors)];
}

export function entityGroupMemberCompatible(kind, member, metadata, legacyBattery = false) {
  const domain = member.entity_id?.split('.')[0];
  const templates = { light: ['hc_light_card', 'hc_base_card'], cover: ['hc_cover_card', 'hc_access_card'],
    climate: ['hc_climate_card'], battery: ['hc_battery_card', 'hc_sensor_card', 'hc_base_card'] };
  return Boolean(Object.hasOwn(templates, kind) && domain === (kind === 'battery' ? 'sensor' : kind)
    && (!member.template || templates[kind].includes(member.template))
    && (kind !== 'battery' || !metadata || metadata.device_class === 'battery' || member.template === 'hc_battery_card' || legacyBattery));
}

export function buildJsonSchema(catalog, entities, draft = {}, dashboardPath = '/marao-dashboard') {
  const bindings = {};
  const descriptions = new Map(entities.map(entity => [entity.entity_id,
    [entity.name, entity.state, entity.area_name].filter(Boolean).join(' · ') || entity.entity_id]));
  const suggested = (values, base = { type: 'string' }) => values.length ? { anyOf: [{ ...base, enum: values }, base] } : base;
  const pagePath = suggested((Array.isArray(draft.pages) ? draft.pages : []).map(page => page.path).filter(Boolean));
  const navigationPath = suggested((Array.isArray(draft.pages) ? draft.pages : []).map(page => page.path && `${dashboardPath}/${page.path}`).filter(Boolean));
  const binding = (domains = [], deviceClasses = []) => {
    const key = 'entities_' + [...domains].sort().join('_') + '__' + [...deviceClasses].sort().join('_');
    if (bindings[key]) return { $ref: '#/$defs/' + key };
    const values = entities.filter(entity => (!domains.length || domains.includes(entity.entity_id.split('.')[0]))
      && (!deviceClasses.length || deviceClasses.includes(entity.device_class))).map(entity => entity.entity_id).sort();
    bindings[key] = suggested(values, { type: 'string', pattern: '^[a-z0-9_]+\\.[a-z0-9_]+$' });
    if (values.length) bindings[key].anyOf[0].markdownEnumDescriptions = values.map(value => descriptions.get(value));
    return { $ref: '#/$defs/' + key };
  };
  const entityIdValue = binding();
  const object = properties => ({ type: 'object', properties, additionalProperties: true });
  const fieldSchema = field => {
    let schema;
    if (field.kind === 'entity') schema = binding(field.domains, field.device_classes);
    else if (field.kind === 'boolean') schema = { type: 'boolean' };
    else if (['number', 'energy_precision'].includes(field.kind)) schema = { type: 'number', ...(field.key === 'cost_per_kwh' ? { minimum: 0 } : {}) };
    else if (field.kind === 'number_list') return { type: 'array', items: { type: 'number' }, description: field.description || field.label };
    else if (field.kind === 'power_devices') return { type: 'array', items: { ...object({ entity_id: binding(['sensor']), name: { type: 'string' } }), required: ['entity_id'] }, description: field.label };
    else if (field.kind === 'energy_sub_entities') return { type: 'array', items: { ...object({ entity_id: binding(['sensor']), name: { type: 'string' }, cost_entity: { anyOf: [binding(['sensor']), { enum: ['', null] }] } }), required: ['entity_id'] }, description: field.label };
    else if (field.kind === 'vacuum_action') return object({ icon: { type: 'string' }, name: { type: 'string' }, segment: { type: 'number' },
      on_action: { type: 'string' }, data: { description: 'Native command data is preserved verbatim; command and params depend on the vacuum integration.' } });
    else if (field.kind === 'object') schema = {};
    else schema = suggested(field.options || (field.kind === 'energy_period' ? ['day', 'month'] : field.kind === 'energy_unit' ? Object.keys(catalog.energy_units || {}) : []));
    if (field.multiple) schema = { type: 'array', items: schema };
    return { ...schema, description: field.description || field.label };
  };
  const action = object({ action: suggested(['none', 'toggle', 'more-info', 'navigate', 'url', 'perform-action', 'call-service']),
    navigation_path: navigationPath, perform_action: { type: 'string' }, service: { type: 'string' },
    target: object({ entity_id: { anyOf: [entityIdValue, { type: 'array', items: entityIdValue }] } }), data: {} });
  const catalogRules = (catalog.cards || []).map(card => {
    const properties = { entity_id: binding(card.domains, card.device_classes), page: pagePath,
      variables: object(Object.fromEntries((card.variables || []).map(field => [field.key, fieldSchema(field)]))),
      tap_action: action, hold_action: action, double_tap_action: action };
    if (card.id === 'hc_camera_card') properties.variables.properties.event_provider = suggested(['auto', 'frigate', 'unifi_protect', 'netatmo']);
    if (card.id === 'hc_media_card') properties.apple_tv = { anyOf: [{ type: ['boolean', 'null'] }, object({
      remote_entity: binding(['remote']), volume_remote_entity: binding(['remote', 'media_player']),
      apps: { type: 'array', items: object({ name: { type: 'string' }, source: { type: 'string' }, icon: { type: 'string' } }) },
    })] };
    if (card.id === 'hc_media_card') Object.assign(properties, {
      remote_entity: binding(['remote']), volume_remote_entity: binding(['remote', 'media_player']),
      apple_tv_apps: properties.apple_tv.anyOf[1].properties.apps,
    });
    if (card.id === 'hc_entity_group_card') Object.assign(properties, {
      entity_type: suggested(['light', 'cover', 'battery', 'climate']), popup_filter: suggested(['all', 'active']),
      entities: { type: 'array', items: { anyOf: [entityIdValue, object({ entity_id: entityIdValue, name: { type: 'string' }, template: suggested(catalog.cards.map(card => card.id)) })] } },
    });
    return { if: { required: ['template'], properties: { template: { const: card.id } } }, then: { properties } };
  });
  const groupValue = {
    type: 'object', required: ['template', 'id', 'name', 'entity_type', 'entities'],
    properties: { template: { const: 'hc_entity_group_card' }, id: { type: 'string', pattern: '^[a-z][a-z0-9_-]{0,63}$' },
      name: { type: 'string', minLength: 1 }, icon: { type: ['string', 'null'] }, entity_type: { enum: ['light', 'cover', 'battery', 'climate'] },
      popup_filter: { enum: ['all', 'active'] }, entities: { type: 'array', items: { anyOf: [binding(),
        { type: 'object', required: ['entity_id'], properties: { entity_id: binding() }, additionalProperties: true }] } } },
    allOf: Object.entries({ light: ['light'], cover: ['cover'], climate: ['climate'], battery: ['sensor'] }).map(([type, domains]) => ({
      if: { required: ['entity_type'], properties: { entity_type: { const: type } } },
      then: { properties: { entities: { items: { anyOf: [binding(domains, type === 'battery' ? ['battery'] : []),
        object({ entity_id: binding(domains, type === 'battery' ? ['battery'] : []) })] } } } },
    })),
    additionalProperties: true,
  };
  const entityValue = {
    anyOf: [
      entityIdValue,
      {
        type: "object",
        required: ["entity_id"],
        allOf: [{ $ref: '#/$defs/cardOptions' }],
        properties: {
          entity_id: { type: 'string', pattern: '^[a-z0-9_]+\\.[a-z0-9_]+$' },
          name: { type: "string" },
          icon: { type: ["string", "null"] },
          template: { type: "string", enum: catalog.cards.map((card) => card.id) },
          variables: { type: 'object', additionalProperties: true },
        },
        additionalProperties: true,
      },
      {
        type: "object",
        required: ["page"],
        properties: {
          page: pagePath,
          name: { type: "string" },
          icon: { type: ["string", "null"] },
          template: { const: "hc_navigation_card" },
        },
        additionalProperties: true,
      },
    ],
  };
  const cardValue = { anyOf: [...entityValue.anyOf, groupValue] };
  const rawCard = object({ type: suggested(['custom:marao-card', 'custom:marao-popup-card', 'custom:marao-navbar-card',
    'custom:marao-state-timeline-card', 'custom:marao-energy-period-card', 'grid', 'vertical-stack', 'horizontal-stack']),
    template: suggested((catalog.cards || []).map(card => card.id)), name: { type: 'string' },
    entity: binding(), variables: { type: 'object', additionalProperties: true },
    cards: { type: 'array', items: { $ref: '#/$defs/rawCard' } },
  });
  const rawRules = catalogRules.map(rule => {
    const { entity_id, ...properties } = rule.then.properties;
    return { ...rule, then: { properties: { ...properties, entity: entity_id } } };
  });
  rawCard.allOf = [{ $ref: '#/$defs/rawOptions' }];
  // Disjoint branches keep matching-schema results proportional to the document,
  // rather than retaining every catalog condition for every card in a large file.
  const templateOptions = rules => ({ anyOf: [
    ...rules.map(rule => ({ type: 'object', required: ['template'],
      properties: { ...rule.then.properties, template: rule.if.properties.template } })),
    { not: { required: ['template'], properties: { template: { enum: catalog.cards.map(card => card.id) } } } },
  ] });
  const definitions = Object.assign(bindings, { rawCard, cardOptions: templateOptions(catalogRules), rawOptions: templateOptions(rawRules) });
  const entityContainer = {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string" },
      path: { type: "string" },
      icon: { type: "string" },
      columns: { type: "integer", minimum: 1, maximum: 6, description: "Number of cards rendered side by side." },
      entities: {
        anyOf: [
          { type: "array", items: cardValue },
          { type: "object", additionalProperties: { type: "array", items: cardValue } },
        ],
      },
    },
    additionalProperties: true,
  };
  const schema = {
    $id: "https://marao-dashboard.local/dashboard.schema.json",
    $defs: definitions,
    type: "object",
    required: ["name", "rooms"],
    properties: {
      config_version: { type: "integer", minimum: 0, maximum: catalog.config_version ?? 0, description: "Dashboard format version; omitted means legacy format 0." },
      name: { type: "string", minLength: 1, description: "Dashboard title." },
      slug: { type: "string", description: "URL-safe dashboard identifier." },
      theme: { type: "string" },
      icon: { type: "string" },
      show_cache_reset: { type: "boolean", description: "Show the cache reset button on the main page. Enabled when omitted." },
      navigation: {
        type: "array",
        items: {
          anyOf: [
            pagePath,
            { type: "object", required: ["label", "url"], additionalProperties: true },
          ],
        },
      },
      overview: {
        type: "object",
        properties: {
          weather_entity: binding(['weather']),
          scenes: { type: "array", items: entityValue },
          entity_groups: { type: 'array', items: groupValue },
        },
        additionalProperties: true,
      },
      rooms: {
        type: "array",
        items: { ...entityContainer, properties: { ...entityContainer.properties, area: { type: "string" } } },
      },
      pages: {
        type: "object",
        properties: {
          ...Object.fromEntries(Object.entries(catalog.pages).map(([key, page]) => [
            key,
            {
              type: "object",
              description: page.description || `${page.label} page configuration.`,
              properties: Object.fromEntries((page.fields || []).map((field) => [
                field.key,
                field.kind === "entity"
                  ? (field.multiple ? { type: "array", items: entityValue } : entityValue)
                  : field.kind === "number_list"
                    ? { type: "array", items: { type: "number" }, default: field.default }
                    : { type: "string" },
              ])),
              additionalProperties: true,
            },
          ])),
          custom: { type: "array", items: entityContainer },
        },
        additionalProperties: true,
      },
    },
    additionalProperties: true,
  };
  if (catalog.config_version >= 2) {
    const legacy = clone(schema);
    const paths = { type: 'string', pattern: '^[a-z0-9][a-z0-9_-]*$' };
    const freeValue = { type: 'object', required: ['template'], properties: {
      template: { enum: ['hc_title_card', 'hc_navigation_card', 'hc_room_card', 'hc_scene_collection_card'] },
      id: { type: 'string', pattern: '^[a-z][a-z0-9_-]{0,63}$' },
      name: { type: 'string' }, icon: { type: ['string', 'null'] }, page: pagePath,
      variables: { type: 'object', additionalProperties: true },
      entities: { type: 'array', items: entityValue },
    }, allOf: [{ $ref: '#/$defs/cardOptions' }], additionalProperties: true };
    const nativeValue = { type: 'object', required: ['template', 'yaml'], properties: {
      template: { const: 'ha_card' }, id: freeValue.properties.id,
      yaml: { type: 'string', minLength: 1, description: 'Complete inline Home Assistant card YAML, including type.' },
    }, additionalProperties: true };
    const content = { ...entityContainer.properties,
      entities: { anyOf: [
        { type: 'array', items: { anyOf: [...cardValue.anyOf, freeValue, nativeValue] } },
        { type: 'object', additionalProperties: { type: 'array', items: { anyOf: [...cardValue.anyOf, freeValue, nativeValue] } } },
        ...cardValue.anyOf, freeValue, nativeValue,
      ] },
      cards: { type: 'array', items: rawCard },
    };
    schema.required = ['name', 'config_version', 'pages', 'landing_page'];
    schema.properties.config_version = { const: 2, description: 'Ordered editable pages.' };
    schema.properties.landing_page = pagePath;
    schema.properties.navigation.items.anyOf.push({ type: 'object', required: ['page'], properties: { page: pagePath }, additionalProperties: true });
    schema.properties.pages = { type: 'array', minItems: 1, items: {
      type: 'object', required: ['name', 'path'], properties: {
        ...content, path: paths, id: { type: 'string', pattern: '^[a-z][a-z0-9_-]{0,63}$' },
        area: { type: 'string' }, subview: { type: 'boolean' },
        sections: { type: 'array', items: { type: 'object', properties: content, additionalProperties: true } },
      }, allOf: [{ if: { required: ['sections'] }, then: { not: { anyOf: ['entities', 'cards', 'columns'].map(key => ({ required: [key] })) } } }],
      additionalProperties: true,
    } };
    delete schema.properties.rooms;
    delete schema.properties.overview;
    schema.not = { anyOf: [{ required: ['rooms'] }, { required: ['overview'] }] };
    delete schema.$defs; delete legacy.$defs;
    delete schema.$id; delete legacy.$id;
    return {
      $id: 'https://marao-dashboard.local/dashboard.schema.json', type: 'object',
      $defs: definitions,
      properties: { config_version: legacy.properties.config_version },
      allOf: [{ if: { required: ['config_version'], properties: { config_version: { const: 2 } } },
        then: schema, else: { anyOf: [legacy, {
          type: 'object', required: ['title', 'views'],
          properties: { title: { type: 'string', minLength: 1 }, views: { type: 'array', minItems: 1, items: { type: 'object', required: ['path'], properties: { path: paths }, additionalProperties: true } } },
          not: { anyOf: ['config_version', 'name', 'rooms', 'pages'].map(key => ({ required: [key] })) }, additionalProperties: true,
        }] } }],
    };
  }
  return schema;
}
