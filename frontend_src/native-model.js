export const copy = value => structuredClone(value);
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const getPath = (value, path) => path.split(".").reduce((item, key) => item?.[key], value);

export function patchPath(config, path, value) {
  const result = copy(config);
  const keys = path.split(".");
  let owner = result;
  for (const key of keys.slice(0, -1)) {
    if (!owner[key] || typeof owner[key] !== "object" || Array.isArray(owner[key])) owner[key] = {};
    owner = owner[key];
  }
  if (value === undefined) delete owner[keys.at(-1)];
  else owner[keys.at(-1)] = copy(value);
  return result;
}

export function patchForm(config, fields, previous, next) {
  let result = config;
  for (const field of fields) {
    const key = field.path;
    if (same(previous[key], next[key])) continue;
    let value = next[key];
    if (["energy_unit", "energy_precision"].includes(field.kind) && ["", "auto", undefined].includes(value)) value = undefined;
    else if (field.kind === "energy_precision" && value !== undefined) value = Number(value);
    result = patchPath(result, key, value);
  }
  return result;
}

export function formData(config, fields) {
  return Object.fromEntries(fields.map(field => [field.path, getPath(config, field.path) ??
    (["energy_unit", "energy_precision"].includes(field.kind) ? "auto" : field.default)]));
}

export function entityMetadata(config, hass) {
  const ids = new Set();
  const visit = value => {
    if (typeof value === "string" && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(value)) ids.add(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(config);
  return [...ids].sort().map(entity_id => {
    const state = hass?.states?.[entity_id];
    return { entity_id, name: state?.attributes?.friendly_name,
      device_class: state?.attributes?.device_class, supported_features: state?.attributes?.supported_features,
      unit_of_measurement: state?.attributes?.unit_of_measurement, has_state: Boolean(state) };
  });
}

export function supportsEntity(spec, hass, entity) {
  const domain = entity.split(".")[0], attrs = hass?.states?.[entity]?.attributes || {};
  if (!spec.domains.includes(domain)) return false;
  if (spec.id === "hc_access_card" && domain === "cover") return ["door", "garage", "gate"].includes(attrs.device_class);
  if (spec.id === "hc_cover_card" && ["door", "garage", "gate"].includes(attrs.device_class)) return false;
  if (spec.id === "hc_battery_card") return attrs.device_class === "battery";
  // Service openers require an explicit choice, never a generic entity suggestion.
  return !["hc_access_slide_action_card", "hc_access_action_card"].includes(spec.id);
}

export function dashboardRoot() {
  return globalThis.location?.pathname?.split("/")[1] || "lovelace";
}

export function previewHass(hass, preview) {
  if (!preview || !hass) return hass;
  return { ...hass, connected: false, connection: { ...hass.connection, connected: false },
    callService: () => Promise.reject(new Error("Editor previews cannot dispatch services")) };
}
