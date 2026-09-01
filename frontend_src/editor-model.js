export function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
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
  else if (spec && typeof spec === "object" && (typeof spec.entity_id === "string" || typeof spec.page === "string")) values.push(spec);
  else if (spec && typeof spec === "object") {
    for (const entries of Object.values(spec)) {
      if (Array.isArray(entries)) values.push(...entries);
      else if (entries != null) values.push(entries);
    }
  }
  return values.flatMap((value) => {
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

function normalizeEntityContainer(container, areaLinked = false) {
  return {
    ...container,
    entities: flattenEntities(container.entities),
    __areaLinked: areaLinked,
    __hadEntities: Object.hasOwn(container, "entities"),
    __entitySource: clone(container.entities),
  };
}

export function normalizeConfig(config) {
  const model = clone(config || {});
  model.overview = model.overview && typeof model.overview === "object" ? model.overview : {};
  model.pages = model.pages && typeof model.pages === "object" ? model.pages : {};
  model.rooms = Array.isArray(model.rooms) ? model.rooms : [];
  model.rooms = model.rooms.map((room) => normalizeEntityContainer(room, Boolean(room.area)));
  if (Array.isArray(model.pages.custom)) {
    model.pages.custom = model.pages.custom.map((page) => normalizeEntityContainer(page));
  }
  return model;
}

function serializeEntityContainer(container) {
  const output = { ...container };
  const areaLinked = output.__areaLinked;
  const hadEntities = output.__hadEntities;
  const entitySource = output.__entitySource;
  delete output.__areaLinked;
  delete output.__hadEntities;
  delete output.__entitySource;
  const grouped = {};
  const ordered = [];
  for (const item of container.entities || []) {
    const entity = { ...item };
    const simple = entity.__simple;
    delete entity.__simple;
    if (typeof entity.page === "string") {
      (grouped.navigation ||= []).push(entity);
      ordered.push(entity);
      continue;
    }
    if (!entity.entity_id?.includes(".")) continue;
    const domain = entity.entity_id.split(".", 1)[0];
    const value = simple && Object.keys(entity).length === 1 ? entity.entity_id : entity;
    (grouped[domain] ||= []).push(value);
    ordered.push(value);
  }
  if (areaLinked) {
    if (hadEntities) output.entities = entitySource;
    else delete output.entities;
  } else if (hadEntities || (container.entities || []).length) {
    output.entities = container.columns ? ordered : grouped;
  } else {
    delete output.entities;
  }
  return output;
}

export function serializeConfig(model) {
  const config = clone(model);
  config.rooms = (config.rooms || []).map(serializeEntityContainer);
  if (Array.isArray(config.pages?.custom)) {
    config.pages.custom = config.pages.custom.map(serializeEntityContainer);
  }
  return config;
}

export function importAreaRoom(area, entities, supportedDomains) {
  const supported = new Set(supportedDomains || []);
  const imported = entities
    .filter(
      (entity) =>
        entity.area_id === area.area_id &&
        supported.has(entity.domain) &&
        !entity.disabled_by &&
        !entity.hidden_by,
    )
    .map((entity) => ({ entity_id: entity.entity_id, __simple: true }));
  return {
    name: area.name,
    path: `room-${slugify(area.name)}`,
    icon: area.icon || "mdi:sofa-outline",
    entities: imported,
    __areaLinked: false,
    __hadEntities: true,
    __entitySource: undefined,
  };
}

export function materializeAreaRoom(room, entities, supportedDomains) {
  if (!room?.area) return room;
  const areaEntities = importAreaRoom(
    { area_id: room.area, name: room.name, icon: room.icon },
    entities,
    supportedDomains,
  ).entities;
  const byId = new Map(areaEntities.map((entity) => [entity.entity_id, entity]));
  for (const entity of [...flattenEntities(room.entities), ...flattenEntities(room.include)]) {
    byId.set(entity.entity_id, entity);
  }
  const excluded = new Set(flattenEntities(room.exclude).map((entity) => entity.entity_id));
  for (const entityId of excluded) byId.delete(entityId);
  for (const [entityId, override] of Object.entries(room.overrides || {})) {
    if (byId.has(entityId) && override && typeof override === "object") {
      byId.set(entityId, { ...byId.get(entityId), ...clone(override), entity_id: entityId });
    }
  }
  const output = { ...room, entities: [...byId.values()], __areaLinked: false };
  output.__hadEntities = true;
  output.__entitySource = undefined;
  delete output.area;
  delete output.include;
  delete output.exclude;
  delete output.overrides;
  return output;
}

export function moveItem(items, from, to) {
  const copy = [...items];
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
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
  };
  return catalog.cards.find((card) => card.id === defaults[domain]) || null;
}

export function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return ["Dashboard JSON must be an object."];
  }
  if (!String(config.name || "").trim()) errors.push("Dashboard name is required.");
  if (!Array.isArray(config.rooms)) errors.push("Rooms must be a list.");
  for (const [index, room] of (config.rooms || []).entries()) {
    if (!String(room.name || "").trim()) errors.push(`Room ${index + 1} needs a name.`);
    if (room.columns != null && (!Number.isInteger(room.columns) || room.columns < 1 || room.columns > 6)) errors.push(`Room ${index + 1} columns must be between 1 and 6.`);
  }
  if (config.navigation != null && !Array.isArray(config.navigation)) errors.push("Navigation must be a list.");
  if (config.pages?.custom != null && !Array.isArray(config.pages.custom)) errors.push("Custom pages must be a list.");
  for (const [index, page] of (config.pages?.custom || []).entries()) {
    if (!String(page.name || "").trim()) errors.push(`Custom page ${index + 1} needs a name.`);
    if (!String(page.path || "").trim()) errors.push(`Custom page ${index + 1} needs a path.`);
    if (page.columns != null && (!Number.isInteger(page.columns) || page.columns < 1 || page.columns > 6)) errors.push(`Custom page ${index + 1} columns must be between 1 and 6.`);
  }
  return errors;
}

export function buildJsonSchema(catalog, entities) {
  const entityIds = entities.map((entity) => entity.entity_id).sort();
  const entityDescriptions = entityIds.map((entityId) => {
    const entity = entities.find((item) => item.entity_id === entityId);
    return [entity?.name, entity?.state, entity?.area_name].filter(Boolean).join(" · ") || entityId;
  });
  const entityIdValue = {
    anyOf: [
      { type: "string", enum: entityIds, markdownEnumDescriptions: entityDescriptions },
      { type: "string", pattern: "^[a-z0-9_]+\\.[a-z0-9_]+$" },
    ],
  };
  const entityValue = {
    anyOf: [
      entityIdValue,
      {
        type: "object",
        required: ["entity_id"],
        properties: {
          entity_id: entityIdValue,
          name: { type: "string" },
          icon: { type: ["string", "null"] },
          template: { type: "string", enum: catalog.cards.map((card) => card.id) },
          variables: { type: "object", additionalProperties: true },
        },
        additionalProperties: true,
      },
      {
        type: "object",
        required: ["page"],
        properties: {
          page: { type: "string" },
          name: { type: "string" },
          icon: { type: ["string", "null"] },
          template: { const: "hc_navigation_card" },
        },
        additionalProperties: true,
      },
    ],
  };
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
          { type: "array", items: entityValue },
          { type: "object", additionalProperties: { type: "array", items: entityValue } },
        ],
      },
    },
    additionalProperties: true,
  };
  return {
    $id: "https://marao-dashboard.local/dashboard.schema.json",
    type: "object",
    required: ["name", "rooms"],
    properties: {
      name: { type: "string", minLength: 1, description: "Dashboard title." },
      slug: { type: "string", description: "URL-safe dashboard identifier." },
      theme: { type: "string" },
      icon: { type: "string" },
      navigation: {
        type: "array",
        items: {
          anyOf: [
            { type: "string" },
            { type: "object", required: ["label", "url"], additionalProperties: true },
          ],
        },
      },
      overview: {
        type: "object",
        properties: {
          weather_entity: { type: "string", enum: entityIds.filter((id) => id.startsWith("weather.")) },
          scenes: { type: "array", items: entityValue },
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
}
