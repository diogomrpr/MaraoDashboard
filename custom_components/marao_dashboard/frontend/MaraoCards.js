const { MaraoNavbarCard, safeArea, navbarRouteCurrent, navbarPartition, haptic, navigate, fullscreenUsers, findElements, focusRestorer, focusableElements, deepActiveElement, FOCUSABLE, beginFrontendInteraction } = await import(new URL(`./MaraoNavigation.js${new URL(import.meta.url).search}`, import.meta.url));
export { MaraoNavbarCard, safeArea, navbarRouteCurrent, navbarPartition, haptic, focusRestorer };
const historyData = await import(new URL(`./MaraoHistoryData.js${new URL(import.meta.url).search}`, import.meta.url));
let historyChartModule;
let historyChartAttempt = 0;
let historyEntryId = 0;
export function loadHistoryChart() {
  const url = new URL(`./MaraoHistoryChart.js${new URL(import.meta.url).search}`, import.meta.url);
  if (historyChartAttempt) url.searchParams.set('marao_retry', String(historyChartAttempt));
  return historyChartModule ||= import(url.href).catch(error => { historyChartModule = null; historyChartAttempt++; throw error; });
}
export const historyPeriodRange = historyData.periodRange;
export const historySamples = historyData.normalizeSamples;
export const { energyBuckets, statisticsBuckets, energyTotal } = historyData;
const BaseElement = globalThis.HTMLElement || class {};

const text = (value, fallback = "") => String(value ?? fallback);
const esc = (value) => text(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const stateOf = (hass, entity) => hass?.states?.[entity] || {};
const domainOf = (entity) => text(entity).split(".", 1)[0];
const roomLightEntities = config => [...new Set((Array.isArray(config.variables?.light_entities) ? config.variables.light_entities : []).filter(entity => typeof entity === "string" && entity.startsWith("light.")))];
function referencedEntities(value) {
  if (value && typeof value === "object") return Object.values(value).flatMap(referencedEntities);
  return typeof value === "string" && /^[a-z_]+\.[a-z0-9_]+$/.test(value) ? [value] : [];
}
export const ACCESS_HOLD_MS = 1200;

const mediaApps = [
  { id: "netflix", file: "netflix.svg", sources: ["Netflix", "com.netflix.Netflix"], color: "#000", text: "#fff" },
  { id: "spotify", file: "spotify.svg", symbol: true, sources: ["Spotify", "com.spotify.client", "com.spotify.Spotify"], color: "#121212", text: "#fff" },
  { id: "youtube", sources: ["YouTube", "com.google.ios.youtube"], color: "#d90000", text: "#fff" },
  { id: "disney-plus", sources: ["Disney+", "Disney Plus", "com.disney.disneyplus"], color: "#006d74", text: "#fff" },
  { id: "prime-video", sources: ["Prime Video", "Amazon Prime Video", "com.amazon.aiv.AIVApp"], color: "#0064b5", text: "#fff" },
  { id: "apple-tv", sources: ["TV", "Apple TV", "Apple TV+", "com.apple.tv", "com.apple.TVWatchList"], color: "#151515", text: "#fff" },
  { id: "plex", sources: ["Plex", "com.plexapp.plex"], color: "#e5a00d", text: "#171717" },
  { id: "meo", file: "meo.svg", sources: ["MEO", "MEO Go", "pt.sapo.mobile.iphone.tmn.meomobile"], color: "#2e26ff", text: "#fff" },
];

export function mediaAppBrand(config) {
  const normalize = value => text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  const source = normalize(config.variables?.app_source || config.name);
  return mediaApps.find(app => app.sources.some(alias => normalize(alias) === source));
}

export function accessOpenerService(entity, configured) {
  const native = { lock: "lock.unlock", cover: "cover.open_cover", button: "button.press", switch: "switch.turn_on", script: "script.turn_on" }[domainOf(entity)];
  return native && (!configured || configured === native) ? native : "";
}

const alarmModes = [
  ["home", 1], ["away", 2], ["night", 4], ["custom_bypass", 16], ["vacation", 32],
];

export function alarmActions(state) {
  const actions = alarmModes.filter(([, feature]) => Number(state?.attributes?.supported_features) & feature)
    .map(([mode]) => ({ service: `alarm_arm_${mode}`, mode, hold: mode === "custom_bypass" }));
  return [...actions, { service: "alarm_disarm", mode: "disarm", hold: true }];
}

export function alarmCodeRequired(state, service) {
  return Boolean(state?.attributes?.code_format)
    && (service === "alarm_disarm" || state.attributes.code_arm_required !== false);
}

export function dishwasherWarning(state) {
  const value = text(state?.state).trim().toLowerCase();
  if (!value || ["unknown", "unavailable"].includes(value)) return false;
  const options = (Array.isArray(state.attributes?.options) ? state.attributes.options : []).map(option => text(option).toLowerCase());
  return options.includes("off") ? value !== "off" : ["on", "true", "1", "2", "present", "confirmed"].includes(value);
}

function localize(key, hass, placeholders = {}, fallback = key) {
  const translated = globalThis.window?.MaraoDashboard?.localize?.(key, hass, placeholders);
  return translated && translated !== key ? text(translated) : text(fallback);
}

export function serviceConnectionReady(hass) {
  return Boolean(hass?.callService)
    && hass.connected !== false
    && hass.connection?.connected !== false;
}

export function serviceTargetReady(hass, target) {
  if (!hass?.states) return true;
  const targets = target == null ? [] : Array.isArray(target) ? target : [target];
  return targets.every((entity) => entity === "all" || !["unknown", "unavailable"].includes(text(hass.states[entity]?.state, "unknown")));
}

function isServiceAction(action) {
  return ["toggle", "call-service", "perform-action"].includes(action?.action);
}

function actionControlLabel(config, state, entity, action, hass) {
  if (config.template === 'hc_camera_card' && action?.action === 'fullscreen') return localize('camera.fullscreen', hass, {}, 'Open full screen');
  const actionLabelKey = text(config?.variables?.action_label_key).trim();
  if (actionLabelKey) {
    const fallback = text(config?.variables?.action_label || config?.name || actionLabelKey).trim();
    return localize(actionLabelKey, hass, {}, fallback);
  }
  const configured = text(config?.name).trim();
  if (configured) return configured;
  if (config.template === "hc_media_app_card" && config.variables?.app_source) return text(config.variables.app_source);
  const command = text(action?.data?.command).trim();
  if (command) return localize(`controls.command.${command.toLowerCase()}`, hass, {}, climateModeLabel(command, hass));
  const service = text(action?.service || action?.perform_action).split(".").pop();
  if (service) return localize(`controls.action.${service}`, hass, {}, climateModeLabel(service, hass));
  const label = text(state?.attributes?.friendly_name || entity || config?.template, "Marao");
  if (action?.action === "navigate") return localize("actions.open", hass, { name: label }, `Open ${label}`);
  if (action?.action === "toggle") return localize("actions.toggle", hass, { name: label }, `Toggle ${label}`);
  return label;
}

const climateNumber = value => value == null || value === "" || typeof value === "boolean" ? NaN : Number(value);

function climateTarget(attributes, mode) {
  const single = climateNumber(attributes.temperature ?? attributes.target_temperature);
  const low = climateNumber(attributes.target_temp_low ?? attributes.target_temperature_low);
  const high = climateNumber(attributes.target_temp_high ?? attributes.target_temperature_high);
  if (mode === "heat_cool") return Number.isFinite(low) && Number.isFinite(high) && low <= high ? `${low}–${high}` : "—";
  if (Number.isFinite(single)) return text(single);
  if (mode === "cool" && Number.isFinite(high)) return text(high);
  if (Number.isFinite(low)) return text(low);
  if (Number.isFinite(high)) return text(high);
  return "—";
}

export function numberStepValue(value, attributes, direction) {
  const current = Number(value);
  if (!Number.isFinite(current)) return null;
  const configuredStep = Number(attributes.step ?? 1);
  const step = Number.isFinite(configuredStep) && configuredStep > 0 ? configuredStep : 1;
  const min = Number(attributes.min);
  const max = Number(attributes.max);
  let next = current + step * (direction < 0 ? -1 : 1);
  if (Number.isFinite(min)) next = Math.max(min, next);
  if (Number.isFinite(max)) next = Math.min(max, next);
  return Number(next.toFixed(6));
}

export function climateTemperatureChange(attributes, mode, direction) {
  const bounds = {
    step: attributes.target_temp_step ?? attributes.target_temperature_step ?? 1,
    min: attributes.min_temp,
    max: attributes.max_temp,
  };
  const single = climateNumber(attributes.temperature ?? attributes.target_temperature);
  const low = climateNumber(attributes.target_temp_low ?? attributes.target_temperature_low);
  const high = climateNumber(attributes.target_temp_high ?? attributes.target_temperature_high);
  if (mode === "heat_cool") {
    if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) return null;
    const anchor = direction < 0 ? low : high;
    const delta = numberStepValue(anchor, bounds, direction) - anchor;
    return {
      target_temp_low: Number((low + delta).toFixed(6)),
      target_temp_high: Number((high + delta).toFixed(6)),
    };
  }
  const target = Number.isFinite(single) ? single : mode === "cool" ? high : low;
  const temperature = numberStepValue(target, bounds, direction);
  return temperature == null ? null : { temperature };
}

export function climateDefaultAction(modes, variables = {}) {
  const availableModes = Array.isArray(modes) ? modes.filter(Boolean).map(text) : [];
  if (availableModes.length > 1 && variables.mode_selector_hash) {
    return { action: "navigate", navigation_path: variables.mode_selector_hash, haptic: "heavy" };
  }
  if (availableModes.length === 1) {
    return { action: "call-service", service: "climate.set_hvac_mode", data: { hvac_mode: availableModes[0] }, haptic: "heavy" };
  }
  return null;
}

export function vacuumActions(state, variables = {}) {
  const features = Number(state?.attributes?.supported_features) || 0;
  const actions = [
    [8192, "start", "mdi:play"], [4, "pause", "mdi:pause"], [16, "return_to_base", "mdi:home-import-outline"],
  ].filter(([feature]) => features & feature).map(([, service, icon]) => ({
    key: service, icon, service: `vacuum.${service}`, labelKey: `vacuum.${service}`, data: {},
  }));
  for (let index = 1; index <= 3; index += 1) {
    const action = variables[`action_${index}`];
    if (!action || action.segment == null || action.segment === "") continue;
    const service = text(action.on_action || "vacuum.send_command");
    if (service === "vacuum.send_command" && !(features & 256)) continue;
    actions.push({ key: `segment_${index}`, service, icon: action.icon || "mdi:floor-plan",
      label: action.name, labelKey: "vacuum.clean_segment", segment: action.segment,
      data: service === "vacuum.send_command" ? { command: "app_segment_clean", params: [action.segment],
        ...(action.data && typeof action.data === "object" && !Array.isArray(action.data) ? structuredClone(action.data) : {}) } : {},
    });
  }
  return actions;
}

function numberStepper(value, label, unit = "", className = "", disabled = false, hass = null) {
  if (value == null || value === "—") return "";
  const disabledAttribute = disabled ? " disabled" : "";
  const increase = localize("controls.increase", hass, { name: label }, `Increase ${label}`);
  const decrease = localize("controls.decrease", hass, { name: label }, `Decrease ${label}`);
  const rangeAttribute = className === "climate-stepper" && String(value).includes("–") ? " data-number-range" : "";
  const wallbox = className === "wallbox-stepper";
  const reading = `<output class="number-value${wallbox ? ' wallbox-value' : ''}"${rangeAttribute} aria-live="polite">${esc(value)}${wallbox && unit ? ' ' : ''}${esc(unit)}</output>`;
  const control = `<div class="number-stepper${className ? ` ${esc(className)}` : ""}" role="group" aria-label="${esc(label)}"><button type="button" data-number-step="increase" aria-label="${esc(increase)}" title="${esc(increase)}"${disabledAttribute}><ha-icon icon="mdi:chevron-up"></ha-icon></button>${wallbox ? '' : reading}<button type="button" data-number-step="decrease" aria-label="${esc(decrease)}" title="${esc(decrease)}"${disabledAttribute}><ha-icon icon="mdi:chevron-down"></ha-icon></button></div>`;
  return wallbox ? reading + control : control;
}

export function climateModeLabel(value, hass = null) {
  const label = text(value).replace(/_/g, " ");
  const fallback = label ? label[0].toUpperCase() + label.slice(1) : "";
  if (["unknown", "unavailable"].includes(text(value))) return localize(`common.${value}`, hass, {}, fallback);
  return localize(`climate.mode.${value}`, hass, {}, fallback);
}

function presentationDomain(kind, entity) {
  return ({ hc_weather_card: "weather", hc_security_card: "alarm_control_panel", hc_vacuum_card: "vacuum", hc_camera_card: "camera", hc_media_card: "media_player", person: "person" })[kind] || domainOf(entity);
}

function presentationState(state, entity, kind) {
  const domain = presentationDomain(kind, entity);
  return { ...state, entity_id: `${domain}.${text(entity).split('.').slice(1).join('.') || 'marao'}`, attributes: state.attributes || {} };
}

export function binaryState(entity, state, kind = "hc_base_card") {
  if (["hc_title_card", "hc_cover_card", "hc_climate_card", "hc_media_card", "hc_media_app_card", "hc_camera_card", "hc_security_card", "hc_weather_card", "hc_vacuum_card", "hc_dishwasher_card", "hc_scene_card", "hc_number_card", "hc_wallbox_current_card", "hc_battery_card"].includes(kind)) return null;
  const value = text(state?.state);
  const domain = domainOf(entity);
  if (domain === "lock" && ["locked", "unlocked"].includes(value)) return value === "unlocked";
  if (kind === "hc_washing_machine_card" && ["running", "idle"].includes(value)) return value === "running";
  return ["light", "fan", "switch", "input_boolean", "binary_sensor"].includes(domain) && ["on", "off"].includes(value) ? value === "on" : null;
}

export function entityStateLabel(state, entity, kind, hass) {
  const value = text(state?.state, hass?.states ? "unknown" : "loading");
  if (["loading", "unknown", "unavailable"].includes(value)) return localize(`common.${value}`, hass, {}, value === "loading" ? "Loading…" : value);
  if (kind === 'hc_battery_card' && batteryReading(value) === null) return localize('common.unavailable', hass, {}, 'Unavailable');
  if (kind === "hc_climate_card") return climateModeLabel(value, hass);
  if (kind === "hc_dishwasher_card") {
    const operation = { run: "running", pause: "paused", finish: "finished", inactive: "idle", ready: "ready", delayedstart: "delayed", actionrequired: "attention", aborting: "aborting" }[value] || value;
    return localize(`dishwasher.${operation}`, hass, {}, localize(`common.${value}`, hass, {}, value));
  }
  const formatted = hass?.formatEntityState?.(presentationState(state, entity, kind));
  if (formatted && formatted !== value) return text(formatted);
  const translated = localize(`common.${value}`, hass, {}, value);
  return Number.isFinite(Number(value)) && state?.attributes?.unit_of_measurement
    ? `${value} ${state.attributes.unit_of_measurement}` : translated;
}

export function summaryState(entities, hass) {
  const states = [...new Set(entities)].map((entity) => text(stateOf(hass, entity).state, "unknown"));
  const known = states.filter((state) => !["unknown", "unavailable"].includes(state));
  const active = known.filter((state) => !["off", "closed", "closing", "idle", "standby", "docked"].includes(state)).length;
  const state = known.length ? active ? "on" : "off" : states.includes("unknown") ? "unknown" : "unavailable";
  const label = !known.length ? localize(`common.${state}`, hass, {}, state)
    : active ? localize("common.active_count", hass, { count: active }, `${active} active`)
    : localize("common.all_off", hass, {}, "All off");
  return { state, label };
}

function batteryReading(value) {
  const source = text(value).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(source)) return null;
  const reading = Number(source);
  return Number.isFinite(reading) && reading >= 0 && reading <= 100 ? reading : null;
}

export function entityGroupState(type, entities, hass) {
  const ids = [...new Set((Array.isArray(entities) ? entities : []).filter(id => typeof id === 'string'))];
  if (!hass?.states) return { state: 'loading', label: localize('common.loading', hass, {}, 'Loading…'), activeEntities: [], unavailableEntities: [], available: 0, reading: null, minimumReading: null };
  const activeEntities = [], unavailableEntities = [], usable = [];
  let unknown = false, minimumReading = null;
  for (const id of ids) {
    const value = text(stateOf(hass, id).state, 'unknown').trim().toLowerCase();
    const reading = type === 'battery' ? batteryReading(value) : null;
    if (['unknown', 'unavailable', ''].includes(value) || type === 'battery' && reading === null) {
      unavailableEntities.push(id); unknown ||= value === 'unknown'; continue;
    }
    usable.push({ id, reading });
    if (reading !== null) minimumReading = minimumReading === null ? reading : Math.min(minimumReading, reading);
    const active = type === 'light' ? value === 'on' : type === 'cover' ? ['open', 'opening'].includes(value)
      : type === 'climate' ? value !== 'off' : type === 'battery' && reading < 20;
    if (active) activeEntities.push(id);
  }
  const state = usable.length ? activeEntities.length ? 'on' : 'off' : ids.length ? unknown ? 'unknown' : 'unavailable' : 'off';
  const reading = type === 'battery' && usable.length ? usable[0].reading : null;
  let label = !ids.length ? localize('group.empty', hass, {}, 'No entities configured')
    : !usable.length ? localize(`common.${state}`, hass, {}, state)
    : type === 'battery' ? `${formatEnergyNumber(reading, undefined, hass)}%`
    : activeEntities.length ? localize('common.active_count', hass, { count: activeEntities.length }, `${activeEntities.length} active`)
    : type === 'cover' ? localize('group.all_closed', hass, {}, 'All closed') : localize('common.all_off', hass, {}, 'All off');
  if (type === 'battery' && activeEntities.length) label += ' · ' + localize('group.low_count', hass, { count: activeEntities.length }, `${activeEntities.length} low`);
  return { state, label, activeEntities, unavailableEntities, available: usable.length, reading, minimumReading };
}

function readingMarkup(entity, name, icon, hass, kind = "hc_sensor_card") {
  const state = stateOf(hass, entity);
  const label = name || state.attributes?.friendly_name || entity;
  const unavailable = !hass?.states || ["unknown", "unavailable"].includes(text(state.state, "unknown"));
  const symbol = icon ? `<ha-icon icon="${esc(icon)}" aria-hidden="true"></ha-icon>` : `<ha-state-icon data-reading-entity="${esc(entity)}" aria-hidden="true"></ha-state-icon>`;
  return `<div class="reading${unavailable ? ' neutral' : ''}">${symbol}<dt>${esc(label)}</dt><dd>${esc(entityStateLabel(state, entity, kind, hass))}</dd></div>`;
}

export function climateModeIcon(value) {
  return {
    off: "mdi:power",
    heat: "mdi:fire",
    heating: "mdi:fire",
    cool: "mdi:snowflake",
    cooling: "mdi:snowflake",
    heat_cool: "mdi:sun-snowflake-variant",
    auto: "mdi:autorenew",
    dry: "mdi:water-percent",
    fan_only: "mdi:fan",
  }[text(value).toLowerCase()] || "mdi:thermostat";
}

// Keep the state palette local to Marao so cards do not need Button Card's
// state-style evaluator. Values intentionally use theme variables, allowing
// light/dark themes to provide the actual colors.
export function stateAppearance(kind, state, config, hass) {
  const variables = config?.variables || {};
  const value = text(state).toLowerCase();
  const active = variables.active_color || variables.card_color || variables.hc_card_color;
  const green = "var(--color-green)";
  const red = "var(--color-red)";
  const orange = "var(--color-orange)";
  const blue = "var(--color-blue)";
  let accent = active;
  let background;
  let foreground;

  if (kind === "hc_battery_card") {
    const percentage = batteryReading(state);
    background = percentage !== null ? active || (percentage >= 80 ? green : percentage >= 20 ? "var(--color-yellow)" : red) : undefined;
  } else if (["hc_access_action_card", "hc_access_hold_action_card", "hc_access_slide_action_card"].includes(kind)) {
    if (!["unknown", "unavailable"].includes(value)) {
      background = variables.action_color;
      accent = variables.action_color || active;
    }
  } else if (kind === "hc_access_card") {
    if (["closed", "locked"].includes(value)) background = green;
    else if (["open", "unlocked"].includes(value)) background = red;
    else if (["opening", "closing"].includes(value)) background = orange;
  } else if (kind === "hc_security_card" || kind === "hc_navigation_card") {
    if (["armed_home", "disarmed"].includes(value)) background = value === "armed_home" ? green : undefined;
    else if (value === "armed_away" || value === "triggered") background = red;
    else if (value === "arming") background = orange;
  } else if (kind === "hc_sensor_card") {
    if (value === "on") background = active || "var(--primary-color)";
    else if (value === "closed" || value === "locked") background = green;
    else if (value === "open") background = red;
    else if (value === "unlocked") background = "var(--color-yellow)";
  } else if (kind === "hc_cover_card") {
    accent = active || blue;
    if (["open", "opening", "closing"].includes(value)) background = active || blue;
  } else if (["hc_light_card", "hc_fan_card"].includes(kind)) {
    accent = active || blue;
    if (value === "on") background = active || blue;
  } else if (kind === "hc_switch_card") {
    accent = active || "var(--color-green)";
    if (value === "on") background = active || "var(--color-green)";
  } else if (kind === "hc_climate_card") {
    const colors = {
      heat: red,
      heating: red,
      cool: blue,
      cooling: blue,
      cold: blue,
      heat_cool: "var(--color-purple)",
      auto: "var(--color-gold)",
      dry: "var(--color-yellow)",
      drying: "var(--color-yellow)",
      fan_only: green,
      fan: green,
    };
    if (!["off", "unavailable", "unknown"].includes(value)) background = colors[value] || "var(--primary-color)";
    accent = background || active;
  } else if (kind === "hc_number_card") {
    accent = active || "var(--primary-color)";
  } else if (kind === "hc_media_card" && !["off", "unknown", "unavailable"].includes(value)) {
    background = variables.hc_background_color || "var(--color-purple)";
  } else if (kind === "hc_media_app_card") {
    const app = mediaAppBrand(config);
    background = active || app?.color;
    foreground = active ? undefined : app?.text;
  } else if (kind === "hc_vacuum_card") {
    background = { docked: green, cleaning: blue, returning: orange, error: red }[value];
  } else if (kind === "hc_wallbox_current_card") {
    accent = active || "var(--primary-color)";
    if (!["unknown", "unavailable"].includes(value)) {
      background = active || "var(--ha-card-background,var(--card-background-color))";
      foreground = active ? "var(--active-text-color, #fff)" : "var(--primary-text-color)";
    }
  } else if (kind === "hc_room_card") {
    if (value === "on") background = "var(--room-card-active-background,var(--primary-color))";
  } else if (kind === "hc_toggle_graph_card") {
    if (stateOf(hass, text(variables.toggle_entity)).state === "on") background = active || "var(--primary-color)";
  }

  const unavailable = ["unavailable", "unknown"].includes(value) || kind === 'hc_battery_card' && value !== 'loading' && batteryReading(value) === null;
  if (unavailable) return { unavailable: true };
  const binary = binaryState(Array.isArray(variables.summary_entities) && variables.summary_entities.length ? "binary_sensor.marao_summary" : config?.entity, { state: value }, kind);
  if (binary === false && ["hc_access_action_card", "hc_access_hold_action_card", "hc_access_slide_action_card"].includes(kind)) background = undefined;
  if (binary && !background) background = active || blue;
  if (kind === "hc_navigation_card") {
    background = binary === false ? undefined : variables.hc_color || background;
  }
  if (kind === "hc_toggle_graph_card") {
    const enabled = stateOf(hass, text(variables.toggle_entity)).state === "on";
    const content = enabled ? variables.active_content_color : variables.inactive_name_color;
    const defaultContent = enabled ? (/^var\(\s*--color-(?:blue|yellow|orange|gold|peach)\s*[,)]/.test(background) ? "var(--color-black)" : "var(--text-primary-color,var(--active-text-color))") : undefined;
    return { unavailable, background: background || variables.inactive_background, accent,
      text: content || defaultContent, stateText: enabled ? content || defaultContent : variables.inactive_state_color,
      icon: enabled ? content || defaultContent : variables.inactive_icon_color,
      iconBackground: enabled ? variables.active_icon_background || "var(--active-overlay-color)" : variables.inactive_icon_background };
  }
  if (!background) return { unavailable, accent };
  const primaryBackground = /^var\(\s*--(?:primary-color|room-card-active-background)\s*[,)]/.test(background);
  foreground = primaryBackground ? "var(--text-primary-color,var(--active-text-color))" : /^var\(\s*--color-(?:blue|yellow|orange|gold|peach)\s*[,)]/.test(background)
    ? "var(--color-black)" : foreground || "var(--active-text-color)";
  const iconBackground = primaryBackground || foreground === "var(--color-black)" ? "var(--active-overlay-color)" : undefined;
  return { background, text: foreground, icon: kind === "hc_navigation_card" ? variables.hc_icon_color || foreground : foreground, ...(iconBackground ? { iconBackground } : {}), accent, unavailable };
}

export function notifyActionError(hass, error) {
  const detail = text(error?.message || error?.body?.message || (typeof error === "string" ? error : "")).trim()
    || localize("common.unknown", hass, {}, "Unknown error");
  const message = localize("actions.failed", hass, { error: detail }, `Action failed: ${detail}`);
  const target = globalThis.document?.querySelector?.("home-assistant") || globalThis.document;
  target?.dispatchEvent?.(new CustomEvent("hass-notification", {
    bubbles: true,
    composed: true,
    detail: { message },
  }));
}

const climateRequests = new Map();

function clearClimateSetting(record, key) {
  clearTimeout(record[key]?.timer);
  delete record[key];
}

function publishClimate(record) {
  for (const card of record.cards) card._render();
}

function climateSettings(entity, state) {
  const record = climateRequests.get(entity);
  return { mode: record?.mode?.value || text(state.state), attributes: { ...state.attributes, ...record?.target?.value }, pending: Boolean(record?.mode || record?.target) };
}

function climateSettingMatches(state, key, value) {
  if (key === "mode") return state.state === value;
  return Object.entries(value).every(([name, target]) => {
    const alias = { temperature: "target_temperature", target_temp_low: "target_temperature_low", target_temp_high: "target_temperature_high" }[name];
    return Math.abs(climateNumber(state.attributes?.[name] ?? state.attributes?.[alias]) - target) < .000001;
  });
}

function reconcileClimate(entity, hass, confirm = true) {
  const record = climateRequests.get(entity);
  if (!record) return;
  const state = stateOf(hass, entity);
  let changed = false;
  for (const key of ["mode", "target"]) {
    const request = record[key];
    if (!request) continue;
    const unavailable = !serviceConnectionReady(hass) || !serviceTargetReady(hass, entity);
    const mode = record.mode?.value || text(state.state);
    const incompatible = key === "mode" ? !state.attributes?.hvac_modes?.includes(request.value)
      : (mode === "heat_cool") !== (request.value.target_temp_low != null);
    const matched = confirm && climateSettingMatches(state, key, request.value);
    if (unavailable || incompatible || matched) { clearClimateSetting(record, key); changed = true; }
  }
  if (changed) publishClimate(record);
}

function prepareClimateRequest(hass, service, data) {
  const targets = Array.isArray(data?.entity_id) ? data.entity_id : [data?.entity_id];
  const requests = [];
  for (const entity of targets.filter(entity => typeof entity === "string" && entity.startsWith("climate."))) {
    const state = stateOf(hass, entity);
    const settings = climateSettings(entity, state);
    const values = {};
    if (data.hvac_mode != null) {
      if (!state.attributes?.hvac_modes?.includes(data.hvac_mode)) return null;
      values.mode = data.hvac_mode;
    }
    if (service === "set_temperature") {
      const range = data.target_temp_low != null || data.target_temp_high != null;
      const names = range ? ["target_temp_low", "target_temp_high"] : ["temperature"];
      const target = Object.fromEntries(names.map(name => [name, climateNumber(data[name])]));
      const min = climateNumber(state.attributes?.min_temp), max = climateNumber(state.attributes?.max_temp);
      if (range && data.temperature != null || state.attributes?.supported_features != null && !(Number(state.attributes.supported_features) & (range ? 2 : 1))
        || Object.values(target).some(value => !Number.isFinite(value) || Number.isFinite(min) && value < min || Number.isFinite(max) && value > max)
        || range && target.target_temp_low > target.target_temp_high) return null;
      if (((values.mode || settings.mode) === "heat_cool") === range) values.target = target;
    }
    if (service === "set_hvac_mode" && !values.mode) return null;
    const record = climateRequests.get(entity);
    if (record) requests.push({ entity, record, values, pending: {} });
  }
  return requests;
}

function previewClimateRequest(hass, requests) {
  for (const { entity, record, values, pending } of requests) {
    if (values.mode && record.target && (values.mode === "heat_cool") !== (record.target.value.target_temp_low != null)) clearClimateSetting(record, "target");
    for (const [key, value] of Object.entries(values)) {
      if (!record[key] && climateSettingMatches(stateOf(hass, entity), key, value)) continue;
      clearClimateSetting(record, key);
      const request = { value };
      record[key] = pending[key] = request;
      request.timer = setTimeout(() => {
        if (record[key] !== request) return;
        clearClimateSetting(record, key);
        const current = record.cards.values().next().value?._hass;
        if (current) reconcileClimate(entity, current, false);
        publishClimate(record);
        const name = stateOf(hass, entity).attributes?.friendly_name || entity;
        const message = localize("climate.not_confirmed", hass, { name }, `Change not confirmed: ${name}`);
        const target = globalThis.document?.querySelector?.("home-assistant") || globalThis.document;
        target?.dispatchEvent?.(new CustomEvent("hass-notification", { bubbles: true, composed: true, detail: { message } }));
      }, 30000);
    }
    publishClimate(record);
  }
}

function rejectClimateRequest(requests) {
  for (const { entity, record, pending } of requests) {
    for (const [key, request] of Object.entries(pending)) if (record[key] === request) clearClimateSetting(record, key);
    const current = record.cards.values().next().value?._hass;
    if (current) reconcileClimate(entity, current, false);
    publishClimate(record);
  }
}

export function requiresAccessSlide(hass, domain, service, data, target) {
  if (domain === "lock" && ["unlock", "open", "toggle"].includes(service)) return true;
  if (!["cover", "homeassistant"].includes(domain) || !["open_cover", "toggle", "set_cover_position"].includes(service)) return false;
  const selected = data?.entity_id || target?.entity_id;
  const entities = selected == null ? [] : Array.isArray(selected) ? selected : [selected];
  if (domain === "cover" && (!entities.length || target?.area_id || target?.device_id || data?.area_id || data?.device_id || entities.includes("all"))) return true;
  return entities.some(entity => {
    const state = stateOf(hass, entity);
    if (domainOf(entity) === "lock") return true;
    if (domainOf(entity) !== "cover" || !["door", "garage", "gate"].includes(text(state.attributes?.device_class).toLowerCase())) return false;
    return service !== "set_cover_position" || Number(data.position) > 0 &&
      (!Number.isFinite(Number(state.attributes?.current_position)) || Number(data.position) > Number(state.attributes.current_position));
  });
}

export async function callServiceWithNotification(hass, domain, service, data, onOutcome, target, intent = {}) {
  const ready = () => serviceConnectionReady(hass) && serviceTargetReady(hass, data?.entity_id || target?.entity_id);
  if (!ready()) { onOutcome?.("skipped"); return; }
  const strictSlide = intent.accessSlide === true && typeof data?.entity_id === "string" && !target &&
    accessOpenerService(data.entity_id) === `${domain}.${service}`;
  if (requiresAccessSlide(hass, domain, service, data, target) && !strictSlide) {
    const error = new Error(localize("access.slide_required", hass, {}, "Use the access slide to open or unlock."));
    notifyActionError(hass, error); onOutcome?.("error", error); return;
  }
  const requests = domain === "climate" && ["set_temperature", "set_hvac_mode"].includes(service) ? prepareClimateRequest(hass, service, data) : [];
  if (!requests) { onOutcome?.("skipped"); return; }
  previewClimateRequest(hass, requests);
  if (!ready()) { rejectClimateRequest(requests); onOutcome?.("skipped"); return; }
  onOutcome?.("sent");
  let result;
  const settled = beginFrontendInteraction();
  try {
    result = await hass.callService(domain, service, data, target, false);
  } catch (error) {
    rejectClimateRequest(requests);
    // Native provider errors can echo submitted service data. Never surface a PIN.
    if (domain === "alarm_control_panel" && data?.code) {
      const code = String(data.code);
      const message = text(error?.message || error?.body?.message || (typeof error === "string" ? error : ""));
      error = new Error(message.split(JSON.stringify(code)).join("[redacted]").split(code).join("[redacted]")
        || localize("alarm.request_failed", hass, {}, "Alarm request failed"));
    }
    notifyActionError(hass, error);
    onOutcome?.("error", error);
    return;
  } finally {
    settled();
  }
  onOutcome?.("success");
  return result;
}

export function serviceOutcome(owner) {
  const request = owner._actionRequest = (owner._actionRequest || 0) + 1;
  const config = owner._config;
  return (status, error) => {
    if (owner._actionLive === false || owner._config !== config || owner._actionRequest !== request) return;
    if (status !== "error" && status !== "success") return;
    const message = status === "error" ? text(error?.message || error?.body?.message || (typeof error === "string" ? error : "")).trim() || localize("common.unknown", owner._hass, {}, "Unknown error") : "";
    if (message === (owner._actionError || "")) return;
    owner._actionError = message;
    owner._render();
  };
}

export function cardProblem(config, hass, { error = "", contentError = "", loading = false } = {}) {
  const kind = text(config.template, "hc_base_card");
  const variables = config.variables || {};
  const entity = text(config.entity);
  const summaries = Array.isArray(variables.summary_entities) ? variables.summary_entities : [];
  const summary = kind === 'hc_entity_group_card' || kind === 'hc_room_card' || summaries.length > 0;
  const readings = kind === "hc_glance_card" ? Array.from({ length: 3 }, (_, index) => variables[`entity${index + 1}`]).filter(Boolean) : [];
  const roomMembers = kind === "hc_room_card" ? roomLightEntities(config) : [];
  const content = kind === "hc_room_card" ? roomMembers : [...new Set(summaries.length ? summaries : [entity, ...readings].filter(Boolean))];
  const disconnected = hass?.connected === false || hass?.connection?.connected === false;
  if (!content.length && !error && !contentError) return null;
  if (!hass?.states) return { kind: "loading", reason: localize("common.loading", hass, {}, "Loading…") };
  const failed = entities => entities.filter(id => !hass.states[id] || ["unknown", "unavailable"].includes(text(hass.states[id].state, "unknown")));
  const failedContent = kind === 'hc_entity_group_card' ? entityGroupState(variables.entity_type, summaries, hass).unavailableEntities
    : kind === 'hc_battery_card' && batteryReading(hass.states[entity]?.state) === null ? [entity] : failed(content);
  const complete = disconnected || content.length && failedContent.length === content.length;
  const details = [];
  let severity;
  if (complete) {
    const state = disconnected ? "disconnected" : failedContent.some(id => !hass.states[id]) ? "missing" : failedContent.some(id => hass.states[id].state === "unknown") ? "unknown" : "unavailable";
    return { kind: "neutral", reason: localize(`common.${state}`, hass, {}, { disconnected: "Disconnected", missing: "Entity missing", unknown: "Unknown", unavailable: "Unavailable" }[state]), complete: true };
  }
  if (error) details.push(localize("actions.failed", hass, { error }, `Action failed: ${error}`));
  if (contentError) details.push(contentError);
  const value = text(hass.states[entity]?.state);
  const fault = kind !== "hc_room_card" && (domainOf(entity) === "lock" && value === "jammed"
    || (domainOf(entity) === "vacuum" || kind === "hc_vacuum_card") && value === "error"
    || kind === "hc_dishwasher_card" && ["error", "actionrequired", "attention"].includes(value)
    || kind === "hc_washing_machine_card" && value === "error"
    || (domainOf(entity) === "alarm_control_panel" || kind === "hc_security_card") && value === "triggered");
  for (const [key, label] of kind === "hc_dishwasher_card" ? [["salt_entity", "salt"], ["rinse_aid_entity", "rinse_aid"]] : []) {
    if (variables[key] && dishwasherWarning(hass.states[variables[key]])) {
      details.push(localize(`dishwasher.${label}`, hass, {}, label.replaceAll("_", " ")));
      severity ||= "warning";
    }
  }
  if (fault) details.push(entityStateLabel(hass.states[entity], entity, kind, hass));
  if (error || contentError || fault) severity = "error";
  const targets = [kind === "hc_toggle_graph_card" ? variables.toggle_entity : null,
    ...roomMembers];
  if (kind === "hc_switch_card") targets.push(variables.power_entity);
  if (kind === "hc_header_card") targets.push(variables.person_entity, variables.air_quality_sensor);
  if (kind === "hc_dishwasher_card") targets.push(...["progress_entity", "remaining_time_entity", "active_program_entity", "salt_entity", "rinse_aid_entity"].map(key => variables[key]));
  if (variables.graph_entity && (["hc_graph_card", "hc_toggle_graph_card"].includes(kind) || variables.show_graph === true)) targets.push(variables.graph_entity);
  for (const action of [config.tap_action, config.hold_action]) {
    if (!isServiceAction(action)) continue;
    const target = action.target?.entity_id || action.data?.entity_id || action.entity_id || (action.target?.area_id || action.target?.device_id ? null : entity);
    targets.push(...(Array.isArray(target) ? target : [target]));
  }
  const partial = [...new Set([...failedContent, ...failed(targets.filter(Boolean))])];
  if (partial.length && !summary) {
    severity ||= "warning";
    details.push(...partial.map(id => {
      const state = hass.states[id];
      const reason = !state ? "missing" : state.state;
      return localize(`common.${reason}`, hass, {}, { missing: "Entity missing", unknown: "Unknown", unavailable: "Unavailable" }[reason] || reason);
    }));
  }
  if (!severity && loading) return { kind: "loading", reason: localize("common.loading", hass, {}, "Loading…") };
  return severity ? { kind: severity, reason: [...new Set(details)].join(" · "), complete: Boolean(complete) } : null;
}

export function problemStyle(problem, appearance = null) {
  if (!problem || problem.kind === "loading") return "";
  const background = appearance?.background || `var(--marao-problem-${problem.kind}-background,var(--secondary-background-color))`;
  const color = appearance?.text || `var(--marao-problem-${problem.kind}-text,var(--primary-text-color))`;
  return `background:${background};color:${color};--marao-card-background:${background};--marao-card-text-color:${color};--marao-state-color:${color};--marao-icon-color:${color};--marao-icon-background:transparent;--marao-accent-color:${color};--primary-text-color:${color};--secondary-text-color:${color};--subtext-color:${color};--error-color:${color};opacity:1`;
}

export async function performAction(hass, action, entity, onOutcome) {
  if (!action || action.action === "none") return;
  if (isServiceAction(action) && !serviceConnectionReady(hass)) { onOutcome?.("skipped"); return; }
  haptic(action.haptic || "heavy");
  const kind = action.action;
  if (kind === "navigate") return navigate(action.navigation_path);
  if (kind === "url") return window.location.assign(action.url_path || action.url);
  if (kind === "more-info") {
    const event = new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: action.entity || entity } });
    return document.dispatchEvent(event);
  }
  const target = action.target?.entity_id || action.entity_id || action.data?.entity_id || action.service_data?.entity_id || entity;
  if (!target && !action.target?.area_id && !action.target?.device_id) return;
  if (kind === "toggle") return callServiceWithNotification(hass, domainOf(target), "toggle", { entity_id: target }, onOutcome);
  if (kind === "call-service" || kind === "perform-action") {
    const service = action.service || action.perform_action || "";
    const [domain, name] = service.split(".", 2);
    if (!domain || !name) return;
    const data = { ...(action.data ?? action.service_data ?? {}) };
    if (domain === "media_player" && name === "media_seek" && action.seek_offset != null) {
      const current = stateOf(hass, target);
      const attrs = current.attributes || {};
      const updated = Date.parse(attrs.media_position_updated_at);
      const elapsed = current.state === "playing" && Number.isFinite(updated) ? Math.max(0, (Date.now() - updated) / 1000) : 0;
      const offset = Number(action.seek_offset);
      if (!Number.isFinite(offset)) return;
      const position = Math.max(0, Math.round((Number(attrs.media_position) || 0) + elapsed + offset));
      const duration = Number(attrs.media_duration);
      data.seek_position = attrs.media_duration != null && Number.isFinite(duration) ? Math.min(position, Math.max(0, duration)) : position;
    }
    if (action.target?.entity_id) data.entity_id = action.target.entity_id;
    else if (!data.entity_id && !action.target?.area_id && !action.target?.device_id) data.entity_id = target;
    const nativeTarget = action.target?.area_id || action.target?.device_id ? action.target : undefined;
    return callServiceWithNotification(hass, domain, name, data, onOutcome, nativeTarget);
  }
}

export function standardControl(config = {}) {
  const native = /^custom:marao-native-(light|fan|cover|access|access-slide-action|access-hold-action)-card$/.exec(config.type || '');
  const kind = native ? 'hc_' + native[1].replaceAll('-', '_') + '_card' : config.template;
  if (['hc_light_card', 'hc_fan_card', 'hc_cover_card', 'hc_access_card', 'hc_access_slide_action_card'].includes(kind)) return true;
  const service = config.variables?.action_service || config.action_service || config.tap_action?.service || config.tap_action?.perform_action;
  if (kind?.startsWith('hc_access_') && ['lock.unlock', 'cover.open_cover'].includes(service)) return true;
  if (kind === 'hc_access_action_card') return ['lock.lock', 'lock.unlock', 'cover.close_cover', 'cover.open_cover'].includes(service);
  return kind === 'hc_access_hold_action_card' && ['lock', 'cover'].includes(domainOf(config.entity));
}

// Structural hosts never establish a content section's height.
export function ownedContent(config = {}) {
  if (config.type === 'custom:marao-card') return Boolean(config.template) && !['hc_title_card', 'hc_navbar_card', 'hc_popup_card'].includes(config.template);
  return /^custom:marao-native-/.test(config.type || '') && !/-(title|navbar|popup)-card$/.test(config.type)
    || ['custom:marao-timeline-card', 'custom:marao-energy-period-card', 'custom:marao-frigate-events-card', 'custom:marao-power-history-card', 'custom:marao-slide-to-open'].includes(config.type);
}

const CONTROL_CELL_MIN = 120, CONTROL_CELL_FONT_SCALE = 6;

// Equal flexible tracks use the tallest intrinsic row, including later rows.
export function controlGridStyles(selector = '.control-grid') {
  return `${selector}{display:grid;min-width:0;grid-template-columns:repeat(auto-fill,minmax(min(100%,max(${CONTROL_CELL_MIN}px,calc(var(--font-size-primary,1.125rem) * ${CONTROL_CELL_FONT_SCALE}),calc((100% - (var(--marao-control-columns,2) - 1) * var(--marao-control-gap,8px)) / var(--marao-control-columns,2)))),1fr));grid-auto-rows:minmax(0,1fr);gap:var(--marao-control-gap,8px);align-items:stretch}${selector}>*{min-width:0;align-self:stretch}`;
}

function cardStyles() {
  return `
    :host { display:block; container:marao-card / inline-size; color:var(--primary-text-color); font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif); }
    ha-icon, ha-state-icon { display:inline-flex; width:var(--mdc-icon-size,24px); height:var(--mdc-icon-size,24px); vertical-align:middle; }
    ha-card { position:relative; display:flex; flex-direction:column; box-sizing:border-box; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--marao-card-background,var(--ha-card-background,var(--card-background-color))); color:var(--marao-card-text-color,inherit); border:var(--marao-card-border,0 solid transparent); transition:transform .12s ease; }
    :host([data-marao-standard-control]), :host([data-marao-control-cell]) { display:grid; min-width:0; }
    :host([data-marao-control-cell]) ha-card { height:100%; }
    ha-card.control-surface { display:grid; min-width:0; min-height:0; }
    .body.standard-control { box-sizing:border-box; min-width:0; min-height:0; display:flex; flex-direction:column; align-items:stretch; gap:8px; padding:12px; }
    .compact-header { display:flex; flex-wrap:wrap; align-items:flex-start; gap:8px; min-width:0; }
    .compact-copy { flex:1; min-width:min(100%,calc(var(--font-size-primary,1.125rem) * 3)); display:grid; gap:4px; }
    .compact-header>.icon { flex:0 0 48px; width:48px; height:48px; align-self:flex-start; }
    .compact-copy:empty { display:none; }
    .compact-copy>.title, .compact-copy>.state, .compact-copy>.climate { grid-area:auto; }
    .body.standard-control>.control { align-self:stretch; width:100%; margin-top:auto; }
    .body.standard-control.icon-only { justify-content:center; }
    ha-card.is-pressed { transform:scale(.985); }
    .card-action { position:absolute; inset:0; z-index:1; width:100%; height:100%; margin:0; padding:0; border:0; border-radius:inherit; background:transparent; color:transparent; cursor:pointer; }
    .card-action:disabled { cursor:default; }
    ha-card[data-camera-card] { overflow:hidden; }
    .body.camera-card { display:block; min-height:0; padding:0; }
    .body.camera-card:empty { display:none; }
    .body.camera-card>.title { box-sizing:border-box; padding:12px 14px; }
    .camera-preview { position:relative; aspect-ratio:16/9; width:100%; overflow:hidden; background:#000; }
    .camera-preview img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .camera-preview span { position:absolute; inset:auto 0 0; box-sizing:border-box; max-height:100%; overflow:auto; padding:8px; background:var(--ha-card-background); color:var(--primary-text-color); overflow-wrap:anywhere; }
    .body { position:relative; z-index:2; flex:1; display:grid; grid-template-columns:minmax(0,1fr) auto; grid-template-rows:auto auto 1fr auto; grid-template-areas:'title title' 'state icon' 'climate icon' 'control control'; gap:4px 12px; align-items:start; min-height:84px; padding:14px; pointer-events:none; }
    .body.formatted-reading { display:flex; flex-wrap:wrap; }
    .body.formatted-reading > :not(.formatted-values):not(.icon):not(.binary-state) { flex-basis:100%; }
    .formatted-values { display:flex; flex-direction:column; gap:4px; flex:1 1 max-content; min-width:0; max-width:100%; }
    .body.formatted-reading > :is(.icon) { flex:0 0 auto; margin-inline-start:auto; }
    .body.with-climate-modes { grid-template-areas:'title title' 'state icon' 'climate icon' 'modes modes'; }
    .body.icon-only { display:flex; align-items:center; justify-content:center; gap:0; min-height:64px; padding:12px; }
    .body.icon-only .icon { grid-area:auto; align-self:auto; }
    .body.icon-only:has(.problem) { flex-direction:column; gap:8px; }
    .history-control { position:relative; z-index:3; grid-column:1/-1; min-width:48px; min-height:48px; border:0; border-radius:12px; padding:8px 12px; background:var(--secondary-background-color); color:var(--primary-text-color); font:inherit; font-size:var(--font-size-secondary,1rem); overflow-wrap:anywhere; pointer-events:auto; }
    .history-control:focus { outline:none; }
    .problem { grid-column:1/-1; grid-row:-1; display:flex; align-items:flex-start; gap:8px; min-width:0; max-width:100%; font-size:var(--font-size-secondary,1rem); line-height:1.25; }
    .binary-state { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
    .problem span { min-width:0; overflow-wrap:anywhere; }
    .problem ha-icon { flex:0 0 24px; --mdc-icon-size:24px; }

    .body.navigation-card { grid-template-areas:'title title' 'state icon' 'control control'; }
    .body.binary-card:not(:has(>.state)) { grid-template-rows:auto 1fr auto; grid-template-areas:'title title' 'climate icon' 'control control'; }
    .body.navigation-card .title { font-size:var(--font-size-secondary,1rem); }
    ha-card.title-surface { overflow:visible; background:transparent; box-shadow:none; }
    .body.title-card { display:block; min-height:0; padding:0 0 20px; }
    .body.title-card .title { font-size:calc(var(--font-size-primary,1.125rem) * 1.39); font-weight:800; }
    .body.media-app-card { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0; padding:0; min-height:48px; aspect-ratio:1; text-align:center; border-radius:inherit; }
    .body.media-app-card::after { content:""; position:absolute; inset:0; z-index:3; border-radius:inherit; box-shadow:inset 0 0 0 0 var(--primary-color); pointer-events:none; transition:box-shadow .12s ease; }
    ha-card:has(.media-app-card):has(.card-action:not(:disabled)) { cursor:pointer; }
    ha-card:has(.card-action:not(:disabled)).is-pressed .media-app-card::after { box-shadow:inset 0 0 0 3px var(--primary-color); }
    @media (hover:hover) and (pointer:fine) {
      ha-card:has(.media-app-card):has(.card-action:not(:disabled)):hover { transform:translateY(-2px); }
      ha-card:has(.card-action:not(:disabled)):hover .media-app-card::after { box-shadow:inset 0 0 0 3px var(--primary-color); }
    }
    ha-card:has(.media-app-card):has(.card-action:not(:disabled)).is-pressed { transform:scale(.97); }
    .body.media-app-card .icon { width:100%; height:100%; flex:1; border-radius:0; background:transparent; --mdc-icon-size:clamp(48px,50cqi,96px); }
    .body.media-app-card .app-icon { position:absolute; inset:0; display:block; width:100%; height:100%; object-fit:cover; }
    .body.media-app-card .app-symbol { object-fit:contain; padding:18%; box-sizing:border-box; }
    .body.media-app-card .problem { position:relative; z-index:1; box-sizing:border-box; width:100%; margin-top:auto; padding:8px; background:var(--ha-card-background,var(--card-background-color)); }
    ha-card[data-problem] .app-icon { filter:grayscale(1); opacity:.5; }
    .title, .state, .climate { min-width:0; max-width:100%; overflow-wrap:anywhere; line-height:1.25; }
    .title { grid-area:title; width:100%; font-weight:var(--font-weight-primary,700); font-size:var(--font-size-primary,1.125rem); }
    .state { grid-area:state; color:var(--marao-state-color,var(--marao-card-text-color,var(--secondary-text-color))); font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); }
    .climate { grid-area:climate; color:var(--marao-card-text-color,var(--secondary-text-color)); font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); }
    .climate-card .state { font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-primary,700); }
    .climate-card .current-temperature { font-size:calc(var(--font-size-primary,1.125rem) * 1.78); font-weight:var(--font-weight-primary,700); line-height:1.25; }
    .icon { position:relative; grid-area:icon; align-self:end; display:grid; place-items:center; width:52px; height:52px; border-radius:50%; background:var(--marao-icon-background,var(--opacity-contrast-100,rgba(0,0,0,.08))); color:var(--marao-icon-color,var(--icon-color)); }
    .icon :is(ha-icon,ha-state-icon) { --mdc-icon-size:28px; }
    .readings { grid-column:1/-1; display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,max(110px,calc(var(--font-size-caption,.9375rem) * 8))),1fr)); gap:12px; margin:8px 0 0; min-width:0; }
    .reading { display:grid; justify-items:center; align-content:start; gap:4px; min-width:0; text-align:center; overflow-wrap:anywhere; line-height:1.25; }
    .reading dt { font-size:var(--font-size-caption,.9375rem); }
    .reading dd { margin:0; font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-primary,700); }
    .reading :is(ha-icon,ha-state-icon) { --mdc-icon-size:28px; }
    .body.glance-card { display:block; }
    .body.glance-card .readings { margin:0; }
    .control { grid-area:control; z-index:2; display:flex; gap:8px; align-items:center; pointer-events:auto; }
    button { min-width:48px; min-height:48px; border:0; border-radius:12px; padding:10px 12px; color:inherit; background:var(--secondary-background-color); font:inherit; cursor:pointer; pointer-events:auto; transition:transform .12s ease,filter .12s ease; }
    button:active:not(:disabled) { transform:scale(.96); filter:brightness(.96); }
    button:focus, input:focus { outline:none; }
    .climate-pending { grid-area:pending; font-size:var(--font-size-caption,.9375rem); overflow-wrap:anywhere; line-height:1.25; }
    .body.climate-card:has(.climate-pending) { grid-template-areas:'title title' 'state icon' 'climate icon' 'pending pending' 'control control'; }
    .body.climate-card.with-climate-modes:has(.climate-pending) { grid-template-areas:'title title' 'state icon' 'climate icon' 'pending pending' 'modes modes'; }
    .climate-modes { grid-area:modes; z-index:2; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; width:100%; box-sizing:border-box; padding-top:10px; border-top:1px solid color-mix(in srgb,currentColor 18%,transparent); pointer-events:auto; }
    .climate-mode { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; min-width:48px; min-height:72px; border-radius:16px; padding:10px 12px; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-primary,700); line-height:1.2; overflow-wrap:anywhere; text-align:center; }
    .climate-mode ha-icon { flex:0 0 auto; --mdc-icon-size:28px; }
    .climate-mode.active { background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); box-shadow:inset 0 0 0 3px var(--marao-accent-color,var(--primary-color)); }
    .control.number-control { grid-area:icon; justify-self:end; }
    .wallbox-shortcuts { grid-area:wallbox; z-index:2; display:grid; grid-template-columns:repeat(auto-fit,minmax(48px,1fr)); gap:8px; width:100%; margin-top:8px; pointer-events:auto; }
    .wallbox-shortcuts button { min-width:48px; min-height:48px; background:var(--opacity-contrast-100,color-mix(in srgb,currentColor 14%,transparent)); color:var(--primary-text-color,#141414); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--color-black,#000) 12%,transparent); font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-primary,700); }
    .control.climate-number-control { align-self:stretch; }
    .number-stepper { display:grid; justify-items:center; gap:2px; min-width:84px; width:auto; max-width:42vw; padding:4px; box-sizing:border-box; border-radius:999px; background:var(--button-card-background,var(--secondary-background-color)); }
    .number-stepper button { display:grid; place-items:center; width:48px; height:48px; padding:0; border-radius:50%; background:transparent; }
    .number-stepper button:active { background:var(--marao-icon-background,var(--opacity-contrast-100,rgba(0,0,0,.08))); }
    .number-stepper ha-icon { --mdc-icon-size:25px; }
    .number-value { max-width:100%; min-width:max-content; margin:0; padding:0; border:0; opacity:.72; color:inherit; background:transparent; font:inherit; font-size:var(--font-size-caption,.9375rem); font-weight:var(--font-weight-primary,700); line-height:1.2; overflow-wrap:anywhere; white-space:nowrap; text-align:center; }
    .climate-stepper { height:100%; padding:3px; align-content:space-between; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); }
    .climate-stepper button { width:52px; height:48px; }
    .climate-stepper ha-icon { --mdc-icon-size:32px; }
    .climate-stepper .number-value { font-size:var(--font-size-primary,1.1875rem); opacity:1; }
    .number-value[data-number-range] { min-width:0; white-space:normal; overflow-wrap:normal; }
    .slider { position:relative; display:flex; align-items:center; width:100%; min-height:48px; height:48px; }
    .slider-track { position:absolute; inset:0; width:100%; height:48px; pointer-events:none; shape-rendering:geometricPrecision; }
    .slider-background,.slider-fill,.slider-thumb { stroke:var(--marao-slider-thumb-border,#284D7D); stroke-width:1px; }
    .slider-background,.slider-fill { x:.5px; y:.5px; height:47px; rx:23.5px; ry:23.5px; }
    .slider-background { width:calc(100% - 1px); fill:var(--marao-slider-track,#AAC9EF); }
    .slider-fill { width:calc(47px + (100% - 48px) * var(--marao-slider-fraction,0)); fill:var(--marao-slider-fill,#EFF6FF); }
    .slider-thumb { cx:calc(24px + (100% - 48px) * var(--marao-slider-target-fraction,0)); cy:24px; r:23.5px; fill:var(--marao-slider-thumb,#FFFFFF); transition:filter .12s ease; }
    .slider:has(input:disabled) .slider-fill { fill:var(--marao-slider-disabled-fill,#CCD5E1); }
    .slider:has(input:active:not(:disabled)) .slider-thumb { filter:brightness(.9); }
    input[type=range] { position:absolute; inset:0; z-index:1; appearance:none; width:100%; min-height:48px; height:48px; margin:0; padding:0; border:0; border-radius:24px; background:transparent; cursor:pointer; }
    input[type=range]:disabled { cursor:default; }
    input[type=range]::-webkit-slider-runnable-track { height:48px; border-radius:24px; background:transparent; }
    input[type=range]::-webkit-slider-thumb { appearance:none; box-sizing:border-box; width:48px; height:48px; margin-top:0; border:0; border-radius:50%; background:transparent; box-shadow:none; }
    input[type=range]::-moz-range-track { height:48px; border-radius:24px; background:transparent; }
    input[type=range]::-moz-range-progress { height:48px; border-radius:24px; background:transparent; }
    input[type=range]::-moz-range-thumb { box-sizing:border-box; width:48px; height:48px; border:0; border-radius:50%; background:transparent; box-shadow:none; }
    @container marao-card (max-width:190px) {
      .body { gap:4px; padding:10px; }
      .body.room-card { --room-edge-inset:10px; }
      .title { font-size:var(--font-size-caption,.9375rem); }
      .body.navigation-card .title { font-size:var(--font-size-caption,.9375rem); }
      .state, .climate { font-size:var(--font-size-caption,.9375rem); }
      .body.formatted-reading .state { font-size:var(--font-size-caption,.9375rem); }
      .icon { width:40px; height:40px; }
      .icon :is(ha-icon,ha-state-icon) { --mdc-icon-size:24px; }
      .body:has(>.number-control) { grid-template-columns:minmax(0,1fr); grid-template-areas:'title' 'state' 'climate' 'control' 'modes' 'wallbox'; }
      .body:has(>.number-control)>.number-control { grid-area:control; justify-self:stretch; justify-content:center; }
      .body.climate-card:has(.climate-pending) { grid-template-areas:'title' 'state' 'climate' 'pending' 'control' 'modes'; }
    }
    .hold-progress { position:absolute; inset:1px; z-index:4; width:calc(100% - 2px); height:calc(100% - 2px); overflow:visible; pointer-events:none; }
    .hold-progress rect { width:calc(100% - 3px); height:calc(100% - 3px); rx:calc(var(--ha-card-border-radius,20px) - 2.5px); fill:none; stroke:var(--marao-accent-color,var(--primary-color)); stroke-width:3px; stroke-dasharray:100; stroke-dashoffset:100; opacity:0; }
    .graph-background { position:absolute; inset:0; z-index:0; display:block; width:100%; height:100%; pointer-events:none; opacity:.30; background:var(--marao-graph-background,transparent); }
    .graph-background .fill { fill:var(--marao-graph-color,var(--marao-card-text-color,var(--marao-accent-color,var(--primary-color)))); opacity:.16; }
    .graph-background .line { fill:none; stroke:var(--marao-graph-color,var(--marao-card-text-color,var(--marao-accent-color,var(--primary-color)))); stroke-width:2.25; vector-effect:non-scaling-stroke; }
    .graph-card .state { font-size:calc(var(--font-size-primary,1.125rem) * 1.12); font-weight:var(--font-weight-primary,700); }
    .graph-status { grid-column:1/-1; font-size:var(--font-size-caption,.9375rem); overflow-wrap:anywhere; }
    button.graph-status { font-family:var(--primary-font-family); font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); }
    .vacuum-actions { grid-column:1/-1; z-index:3; display:grid; grid-template-columns:repeat(auto-fit,minmax(48px,1fr)); gap:8px; pointer-events:auto; }
    .vacuum-actions button { padding:10px 4px; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); }
    .body.room-card { display:flex; flex-direction:column; align-items:stretch; gap:8px; }
    .room-bottom { position:relative; display:flex; align-items:flex-end; min-height:48px; margin-top:auto; }
    .room-artwork { --room-artwork-size:clamp(48px,65cqi,128px); position:absolute; right:calc(-1 * var(--room-edge-inset,14px)); bottom:calc(-1 * var(--room-edge-inset,14px)); width:calc(.8 * var(--room-artwork-size)); height:calc(.8 * var(--room-artwork-size)); overflow:hidden; color:var(--marao-icon-color,var(--icon-color)); opacity:.2; pointer-events:none; }
    .room-artwork :is(ha-icon,ha-state-icon) { display:block; width:var(--room-artwork-size); height:var(--room-artwork-size); --mdc-icon-size:var(--room-artwork-size); }
    .room-lights-off { position:relative; z-index:3; box-sizing:border-box; display:flex; align-items:center; justify-content:center; flex:0 0 48px; width:48px; height:48px; padding:0; border:1px solid currentColor; border-radius:50%; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); pointer-events:auto; }
    .room-lights-off:disabled { opacity:.6; cursor:default; }
    .room-lights-off ha-icon { --mdc-icon-size:28px; }
    .scene-options { grid-area:control; z-index:2; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; width:100%; pointer-events:auto; }
    .scene-options button { min-width:48px; min-height:48px; overflow-wrap:anywhere; font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); line-height:1.25; }
    .scene-options button:disabled { opacity:.6; cursor:default; }
    .scene-options button:only-child { grid-column:1/-1; }
    .scene-options button[aria-pressed=true] { box-shadow:inset 0 0 0 3px var(--marao-accent-color,var(--primary-color)); font-weight:var(--font-weight-primary,700); }
    @container marao-card (max-width:280px) { .scene-options { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @container marao-card (max-width:190px) { .scene-options { grid-template-columns:minmax(0,1fr); } .body.with-climate-modes { padding-inline:8px; } .climate-mode { padding-inline:4px; } }
    .camera { grid-column:1/-1; width:100%; aspect-ratio:16/9; object-fit:cover; background:#000; }
    .media-artwork { position:absolute; inset:0; pointer-events:none; }
    .media-artwork img { width:100%; height:100%; object-fit:cover; }
    .media-artwork::after { content:''; position:absolute; inset:0; background:rgba(0,0,0,.72); }
    @container marao-card (max-width:120px) {
      .body, .body.with-climate-modes, .body.icon-only { grid-template-columns:minmax(0,1fr); grid-template-areas:'title' 'icon' 'state' 'climate' 'control' 'modes'; padding:24px clamp(0px,calc((100cqi - 64px) / 2),4px); }
      .body.wallbox-card { grid-template-areas:'title' 'control' 'wallbox'; }
      .body.binary-card:not(:has(>.state)) { grid-template-columns:minmax(0,1fr); grid-template-areas:'title' 'icon' 'climate' 'control'; }
      .body.room-card { --room-edge-inset:clamp(0px,calc((100cqi - 64px) / 2),4px); }
      .body.room-card .room-artwork { bottom:-24px; }
      .control.number-control { grid-area:control; justify-self:start; }
      .number-stepper { min-width:56px; max-width:100%; }
      .wallbox-shortcuts, .scene-options, .climate-modes { grid-template-columns:minmax(0,1fr); }
    }
    .body.slider-header, .body.slider-header.binary-card:not(:has(>.state)) { grid-template-columns:minmax(0,1fr) auto; grid-template-areas:'title icon' 'state state' 'control control'; }
    .body.slider-header:not(:has(>.icon)) .title { grid-column:1/-1; }
    .body.standard-control.slider-header { display:flex; }
    .body.wallbox-card { grid-template-columns:minmax(0,1fr) 64px; grid-template-areas:'value icon' 'title icon' 'wallbox wallbox'; gap:12px 20px; padding:24px; min-height:160px; }
    .body.wallbox-card .wallbox-current-control { display:contents; }
    .body.wallbox-card .wallbox-value { grid-area:value; min-width:0; align-self:end; text-align:left; white-space:normal; overflow-wrap:anywhere; font-size:calc(3.5 * var(--font-size-primary,1.125rem)); font-weight:800; line-height:1.05; opacity:1; }
    .body.wallbox-card .title { grid-area:title; align-self:start; font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-secondary,500); }
    .body.wallbox-card .wallbox-stepper { grid-area:icon; align-self:stretch; justify-self:end; align-content:space-between; min-width:64px; width:64px; max-width:100%; padding:8px; gap:8px; background:var(--ha-card-background,var(--card-background-color,#fff)); color:var(--primary-text-color,#141414); box-shadow:0 8px 28px rgba(0,0,0,.06); }
    .wallbox-stepper button { width:48px; height:48px; }
    @container marao-card (max-width:240px) {
      .body.wallbox-card { grid-template-columns:minmax(0,1fr) 56px; gap:8px; padding:12px; }
      .body.wallbox-card .wallbox-value { font-size:calc(1.75 * var(--font-size-primary,1.125rem)); }
      .body.wallbox-card .wallbox-stepper { min-width:56px; width:56px; padding:4px; }
    }
    @media (prefers-reduced-motion:reduce) { ha-card,button,.slider-thumb,.media-app-card::after { transition:none; } }
  `;
}

export const energyUnits = {
  mW: ['power', .001], W: ['power', 1], kW: ['power', 1000], MW: ['power', 1e6], GW: ['power', 1e9],
  Wh: ['energy', 1], kWh: ['energy', 1000], MWh: ['energy', 1e6], GWh: ['energy', 1e9],
  J: ['energy', 1 / 3600], Ws: ['energy', 1 / 3600], kJ: ['energy', 1000 / 3600], MJ: ['energy', 1e6 / 3600], GJ: ['energy', 1e9 / 3600],
};

export function energyFormatting(variables = {}) {
  return Object.hasOwn(variables, 'display_unit') || Object.hasOwn(variables, 'display_precision');
}

export function energyValue(raw, sourceUnit, variables = {}) {
  if (!['number', 'string'].includes(typeof raw) || (typeof raw === 'string' && !raw.trim()) || !Number.isFinite(Number(raw))) return null;
  const original = { value: Number(raw), unit: typeof sourceUnit === 'string' ? sourceUnit : '' };
  if (Object.hasOwn(variables, 'display_precision') && (!Number.isInteger(variables.display_precision) || variables.display_precision < 0 || variables.display_precision > 6)) return { ...original, error: 'precision' };
  if (!Object.hasOwn(variables, 'display_unit')) return original;
  const source = Object.hasOwn(energyUnits, original.unit) ? energyUnits[original.unit] : undefined;
  const target = typeof variables.display_unit === 'string' && Object.hasOwn(energyUnits, variables.display_unit) ? energyUnits[variables.display_unit] : undefined;
  if (!source || !target || source[0] !== target[0]) return { ...original, error: 'unit' };
  const value = original.value * source[1] / target[1];
  return Number.isFinite(value) ? { value, unit: variables.display_unit } : { ...original, error: 'unit' };
}

export function formatEnergyNumber(value, precision, hass) {
  const preference = hass?.locale?.number_format;
  const languages = { comma_decimal: 'en-US', decimal_comma: 'de', space_comma: 'fr', quote_decimal: 'de-CH', none: 'en-US' };
  const locale = preference === 'system' ? undefined : languages[preference] || hass?.locale?.language || hass?.language || globalThis.navigator?.language;
  const digits = precision ?? 6;
  return new Intl.NumberFormat(locale, { minimumFractionDigits: precision ?? 0, maximumFractionDigits: digits, useGrouping: preference !== 'none' }).format(Number(value.toFixed(digits)) === 0 ? 0 : value);
}

export function energyHistoryValue(record, liveUnit, variables) {
  const sourceUnit = record.attributes?.unit_of_measurement || '';
  if (Object.hasOwn(variables, 'display_unit')) return energyValue(record.state, sourceUnit, variables);
  if (Object.hasOwn(energyUnits, liveUnit)) return energyValue(record.state, sourceUnit, { ...variables, display_unit: liveUnit });
  const reading = energyValue(record.state, sourceUnit, variables);
  return sourceUnit === (liveUnit || '') ? reading : reading && { ...reading, error: 'unit' };
}

export function energyLabel(reading, variables, hass) {
  if (!reading) return '';
  if (reading.error) return `${reading.value} ${reading.unit}`.trim();
  return `${formatEnergyNumber(reading.value, variables.display_precision, hass)} ${reading.unit}`.trim();
}

export class MaraoCard extends BaseElement {
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._hass = null; this._sliderTargets = new Map(); this._sliderGesture = null; this._graphHistory = new Map(); this._graphRequests = new Map(); this._graphErrors = new Set(); this._holdTimer = null; this._holdFrame = null; this._holdActive = false; this._holdCompleted = false; }
  get preview() { return Boolean(this._preview || this.nativeOwner?.preview); }
  set preview(value) {
    this._preview = Boolean(value);
    if (this._preview) { this._cancelSliderGesture(); this._cancelHold(); this._disposeCamera(); }
    if (this._authoritativeHass) this.hass = this._authoritativeHass;
  }
  setConfig(config) {
    if (config.template === 'hc_camera_card' && Object.hasOwn(config.variables || {}, 'preload_stream') && typeof config.variables.preload_stream !== 'boolean') throw new Error(localize('camera.invalid_preload', this._hass, {}, 'Preload stream must be a boolean.'));
    this._stateEntities = [...new Set(referencedEntities(config))];
    this._stateReferences = null;
    const previousGraph = this._graphEntity();
    if (this._config?.entity !== config.entity || this._config?.template !== config.template || this._config?.variables?.preload_stream !== config.variables?.preload_stream) this._disposeCamera();
    const historyIdentity = value => JSON.stringify({...value, variables: {...value.variables, display_unit: undefined, display_precision: undefined}});
    this._clearAlarmPIN();
    this._alarmSignature = "";
    this._alarmBusy = false;
    this._cancelHold();
    this._cancelSliderGesture();
    if (historyIdentity(this._config) !== historyIdentity(config)) { this._graphRequests.clear(); this._graphHistory.clear(); this._graphErrors.clear(); } this._config = { ...config }; if (previousGraph !== this._graphEntity()) this._activeHistoryPopup?._invalidateHistory(); this._actionError = ""; this._mediaError = ""; this._mediaURL = ""; this._actionRequest = (this._actionRequest || 0) + 1; this._subscribeClimate(); this._render(); }
  connectedCallback() {
    this._actionLive = true; this._climateConnected = true; this._subscribeClimate();
    this._cancelHiddenControls ||= event => {
      if (event.type === "visibilitychange" && !globalThis.document?.hidden) return;
      this._clearAlarmPIN(); this._cancelHold(); this._cancelSliderGesture();
      const slide = this.shadowRoot?.querySelector("marao-slide-to-open");
      slide?._resetGesture(slide.shadowRoot?.querySelector(".track"));
    };
    for (const type of ["location-changed", "popstate"]) globalThis.window?.addEventListener?.(type, this._cancelHiddenControls);
    globalThis.document?.addEventListener?.("visibilitychange", this._cancelHiddenControls);
    this._render();
  }
  set hass(value) {
    this._authoritativeHass = value;
    if (this.preview && value) value = { ...value, connected: false, connection: { ...value.connection, connected: false } };
    const entity = text(this._config.entity);
    const previous = this._hass;
    const previousReferences = this._stateReferences;
    this._stateReferences = this._stateEntities?.map(id => value?.states?.[id]);
    const previousState = previous?.states?.[entity];
    const wasServiceReady = this._serviceReady;
    this._hass = value;
    this._serviceReady = serviceConnectionReady(value);
    this._camera?.update(value, entity, this._label(entity, this._config, stateOf(value, entity)));
    if (this._config.template === "hc_alarm_controls_card") {
      if (!this._serviceReady || !serviceTargetReady(value, entity)) { this._clearAlarmPIN(); this._cancelHold(); }
      this._renderAlarm();
      return;
    }
    this._subscribeClimate();
    if (this._climateEntity) reconcileClimate(this._climateEntity, value, previousState !== value?.states?.[entity]);
    const graphEntity = this._config.variables?.graph_entity || this._config.variables?.power_entity
      || (["hc_graph_card", "hc_toggle_graph_card"].includes(this._config.template) ? entity : "");
    const graphAvailability = this._graphAvailability(graphEntity, value);
    if (graphEntity && this._graphAvailabilityState !== graphAvailability) {
      this._graphRequests.delete(graphEntity);
      this._graphHistory.delete(graphEntity);
      this._graphErrors.delete(graphEntity);
    } else if (graphEntity && !graphAvailability && this._graphHistory.has(graphEntity)
      && previous?.states?.[graphEntity] !== value?.states?.[graphEntity]) {
      // Keep actual live observations once a newer report replaces them, so an
      // inspected reading remains part of the same full-resolution history.
      const record = previous?.states?.[graphEntity], timeOf = item => {
        const stamp = item?.time ?? item?.timestamp ?? item?.last_updated ?? item?.last_changed;
        return typeof stamp === 'number' ? stamp : Date.parse(stamp);
      };
      const stamp = timeOf(record), start = Date.now() - 24 * 60 * 60 * 1000;
      if (Number.isFinite(stamp) && stamp >= start) this._graphHistory.set(graphEntity,
        [...this._graphHistory.get(graphEntity).filter(item => timeOf(item) >= start && timeOf(item) !== stamp), record]);
    }
    this._graphAvailabilityState = graphAvailability;
    const accessSlide = this.shadowRoot?.querySelector('marao-slide-to-open');
    // Keep the elements under a scrolling finger mounted when other entities update.
    if (previous?.states && value?.states && this._config.template !== 'hc_header_card'
      && wasServiceReady === this._serviceReady
      && previous.connected === value.connected && previous.connection?.connected === value.connection?.connected
      && ["themes", "locale", "language", "localize", "entities", "services", "config", "callApi"].every(key => previous[key] === value[key])
      && previousReferences && this._stateReferences?.every((state, index) => previousReferences[index] === state)) {
      if (accessSlide) accessSlide.hass = value;
      return;
    }
    // Home Assistant updates all cards when unrelated entities change. Keep
    // the pressed control mounted until its own state or connection changes.
    if (this._holdActive && serviceConnectionReady(value)
      && [this._config.tap_action, this._config.hold_action].every((action) => !isServiceAction(action) || serviceTargetReady(value, action?.target?.entity_id || action?.data?.entity_id || action?.entity_id || entity))
      && previousState && previousState === value?.states?.[entity]
      && !["unknown", "unavailable"].includes(text(previousState.state).toLowerCase())) return;
    this._render();
  }
  get hass() { return this._hass; }
  disconnectedCallback() {
    this._stateReferences = null;
    queueMicrotask(() => { if (!this.isConnected) { this._historyPopup?._close(false); this._activeHistoryPopup?._close(false); } });
    this._disposeCamera();
    for (const type of ["location-changed", "popstate"]) globalThis.window?.removeEventListener?.(type, this._cancelHiddenControls);
    globalThis.document?.removeEventListener?.("visibilitychange", this._cancelHiddenControls);
    this._clearAlarmPIN(); this._alarmSignature = ""; this._actionLive = false; this._actionError = ""; this._mediaError = ""; this._mediaURL = ""; this._actionRequest = (this._actionRequest || 0) + 1; this._climateConnected = false; this._subscribeClimate(); this._cancelHold(); this._cancelSliderGesture();
  }

  _disposeCamera() {
    this._cameraGeneration = (this._cameraGeneration || 0) + 1;
    this._camera?.dispose(); this._camera = null; this._cameraSlot?.remove(); this._cameraSlot = null; this._cameraLoading = false; this._cameraError = "";
  }

  _syncCamera() {
    if (this._config.template !== "hc_camera_card" || this.preview || !this.isConnected) { this._disposeCamera(); return; }
    const entity = text(this._config.entity), state = stateOf(this._hass, entity);
    const label = this._label(entity, this._config, state);
    if (this._camera) { this._camera.update(this._hass, entity, label); return; }
    if (this._cameraLoading || this._cameraError) return;
    const surface = this.shadowRoot.querySelector('ha-card');
    if (!surface) return;
    const generation = this._cameraGeneration = (this._cameraGeneration || 0) + 1;
    this._cameraLoading = true;
    const slot = this._cameraSlot = document.createElement('div');
    slot.className = 'camera-live'; slot.style.cssText = 'position:relative;z-index:2;min-width:0;margin:0;pointer-events:none';
    const available = state.state && !['unknown', 'unavailable', 'off'].includes(state.state) && this._hass?.connected !== false && this._hass?.connection?.connected !== false;
    const poster = available ? state.attributes?.entity_picture : '';
    slot.innerHTML = `<div style="position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#000">${poster ? `<img src="${esc(poster)}" alt="${esc(label)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : ''}<div role="status" style="position:absolute;inset:auto 0 0;box-sizing:border-box;max-height:100%;overflow:auto;padding:8px;overflow-wrap:anywhere;background:var(--ha-card-background);color:var(--primary-text-color);pointer-events:auto">${esc(available ? localize('camera.loading', this._hass, {}, 'Starting live video…') : localize(!this._hass?.states ? 'common.loading' : state.state === 'unknown' ? 'common.unknown' : 'common.unavailable', this._hass))}</div></div>`;
    surface.append(slot);
    import(new URL(`./MaraoCamera.js${new URL(import.meta.url).search}`, import.meta.url).href).then(async ({ CameraPlayback }) => {
      const preload = this._config.variables?.preload_stream === true ? await import(new URL(`./MaraoCameraPreload.js${new URL(import.meta.url).search}`, import.meta.url).href) : null;
      if (generation !== this._cameraGeneration || !this.isConnected || this.preview) return;
      const fallback = {
        'camera.buffering': 'Buffering…', 'camera.lower_quality': 'Reduced quality',
        'camera.loading': 'Starting live video…', 'camera.live': 'Live', 'camera.snapshot': 'Snapshot',
        'camera.start': 'Start live view', 'camera.blocked': 'Playback needs your permission',
        'camera.failed': 'Live video failed', 'camera.timeout': 'Live video did not start in time',
        'camera.registration': 'Home Assistant camera player could not load',
        'camera.compatibility': 'Native camera video is unavailable or incompatible',
        'camera.unsupported': 'This camera provides a preview only', 'camera.poster_failed': 'Snapshot unavailable',
      };
      const callbacks = {
        localize: key => localize(key, this._hass, {}, fallback[key] || (key === 'common.retry' ? 'Retry' : key)), haptic,
        problem: reason => { if (this._cameraError !== reason) { this._cameraError = reason; this._render(); } },
      };
      this._camera = preload?.claimCameraPreload(this, slot, callbacks) || new CameraPlayback(this, slot, callbacks);
      this._cameraLoading = false;
      this._camera.update(this._hass, entity, this._label(entity, this._config, stateOf(this._hass, entity)));
    }).catch(() => {
      if (generation !== this._cameraGeneration) return;
      this._cameraLoading = false; this._cameraError = localize('camera.registration', this._hass, {}, 'Home Assistant camera player could not load');
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = localize('common.retry', this._hass, {}, 'Retry'); retry.style.pointerEvents = 'auto';
      retry.setAttribute('aria-label', `${retry.textContent} ${label}`);
      retry.addEventListener('click', event => { event.stopPropagation(); haptic('heavy'); this._disposeCamera(); this._render(); });
      const feedback = slot.querySelector('[role="status"]'); feedback.textContent = this._cameraError; feedback.append(retry); this._render();
    });
  }

  _clearAlarmPIN() {
    this._alarmPIN = "";
    const input = this.shadowRoot?.querySelector("[data-alarm-code]");
    if (input) input.value = "";
  }

  _setMarkup(markup, bindings) {
    const surface = this.shadowRoot.querySelector('ha-card');
    if (surface && bindings !== undefined && this._renderedMarkup === markup
      && this._renderedBindings === bindings && this._renderedConfig === this._config) return false;
    if (!surface) {
      this.shadowRoot.innerHTML = markup;
      this._renderedMarkup = markup; this._renderedBindings = bindings; this._renderedConfig = this._config;
      return;
    }
    // Removing even a retained HA surface resets its ancestor's scroll in WebKit.
    const template = document.createElement('template');
    template.innerHTML = markup;
    const next = template.content.querySelector('ha-card');
    const style = this.shadowRoot.querySelector('style');
    const css = template.content.querySelector('style').textContent;
    if (style.textContent !== css) style.textContent = css;
    for (const attribute of [...surface.attributes]) surface.removeAttribute(attribute.name);
    for (const attribute of [...next.attributes]) surface.setAttribute(attribute.name, attribute.value);
    // Connect the replacement before removing old content so WebKit never clamps an empty card.
    const previous = [...surface.childNodes];
    const cameraSlot = this._camera?.slot || this._cameraSlot;
    if (cameraSlot) for (const node of [...next.childNodes]) surface.insertBefore(node, cameraSlot);
    else surface.append(...next.childNodes);
    for (const node of previous) if (node !== this._camera?.slot && node !== this._cameraSlot) node.remove();
    this._renderedMarkup = markup; this._renderedBindings = bindings; this._renderedConfig = this._config;
  }

  _renderAlarm() {
    if (!this.shadowRoot) return;
    const entity = text(this._config.entity), state = stateOf(this._hass, entity);
    const problem = cardProblem(this._config, this._hass, { error: this._actionError });
    const ready = Boolean(state.state) && domainOf(entity) === "alarm_control_panel" && serviceConnectionReady(this._hass) && serviceTargetReady(this._hass, entity);
    const codeFormat = state.attributes?.code_format;
    const signature = JSON.stringify([state.state, state.attributes?.supported_features, codeFormat, state.attributes?.code_arm_required,
      ready, this._alarmBusy, problem?.reason, this._hass?.language, this._hass?.locale]);
    if (signature === this._alarmSignature) return;
    this._alarmSignature = signature;
    const restoreFocus = this.shadowRoot.activeElement ? focusRestorer(deepActiveElement()) : null;
    this._cancelHold();
    const label = localize("alarm.code", this._hass, {}, "Alarm code");
    const actions = alarmActions(state);
    this._setMarkup(`<style>${cardStyles()}
      .alarm-body { display:grid; grid-template-columns:minmax(0,1fr); gap:12px; padding:16px; min-width:0; font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); line-height:1.25; }
      .alarm-body > * { grid-area:auto; min-width:0; }
      .alarm-body > .state { white-space:normal; overflow-wrap:anywhere; }
      .alarm-actions { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,9em),1fr)); gap:10px; }
      .alarm-action { position:relative; min-width:0; border-radius:16px; }
      .alarm-action button { position:relative; width:100%; min-height:64px; padding:12px; border-radius:16px; font:inherit; overflow-wrap:anywhere; user-select:none; -webkit-user-select:none; touch-action:manipulation; color:var(--primary-text-color); background:var(--ha-card-background,var(--card-background-color)); }
      .alarm-action button:disabled { opacity:.6; background:var(--secondary-background-color); }
      .alarm-body label { display:grid; grid-template-columns:minmax(0,1fr); gap:8px; overflow-wrap:anywhere; }
      .alarm-body input { box-sizing:border-box; width:100%; min-width:0; height:max(48px,calc(1.25em + 20px)); min-height:48px; padding:10px; border:1px solid currentColor; border-radius:12px; background:var(--ha-card-background,var(--card-background-color)); color:inherit; font:inherit; outline:none; }
      @container marao-card (max-width:240px) { .alarm-actions { grid-template-columns:minmax(0,1fr); } }
    </style><ha-card style="${esc(problemStyle(problem) || "")}"><div class="alarm-body">
      <div class="state" aria-live="polite">${esc(entityStateLabel(state, entity, "hc_security_card", this._hass))}</div>
      ${problem ? `<div class="problem" role="status"><span>${esc(problem.reason)}</span></div>` : ""}
      ${codeFormat ? `<label>${esc(label)}<input data-alarm-code type="password" inputmode="${codeFormat === "number" ? "numeric" : "text"}" autocomplete="off" aria-label="${esc(label)}"${!ready || this._alarmBusy ? " disabled" : ""}></label>` : ""}
      <div class="alarm-actions">${actions.map(action => {
        const name = localize(`alarm.${action.mode}`, this._hass, {}, action.mode.replaceAll("_", " "));
        const caption = action.hold ? localize("access.hold_to_activate", this._hass, { action: name }, `Hold to ${name}`) : name;
        const disabled = !ready || this._alarmBusy || state.state === `armed_${action.mode}`
          || action.mode === "disarm" && state.state === "disarmed";
        return `<div class="alarm-action"><button type="button" data-alarm-action="${action.service}" aria-label="${esc(caption)}"${disabled ? " disabled" : ""}>${esc(caption)}</button>${action.hold ? '<svg class="hold-progress" aria-hidden="true"><rect x="1.5" y="1.5" pathLength="100"></rect></svg>' : ""}</div>`;
      }).join("")}</div></div></ha-card>`);
    const input = this.shadowRoot.querySelector("[data-alarm-code]");
    if (input) {
      input.value = this._alarmPIN || "";
      input.addEventListener("input", () => { this._alarmPIN = input.value; });
    }
    for (const button of this.shadowRoot.querySelectorAll("[data-alarm-action]")) {
      const service = button.dataset.alarmAction;
      const action = actions.find(item => item.service === service);
      if (action.hold) this._bindHoldAction(button, button.parentElement, () => this._sendAlarm(service, true));
      else this._bindTapAction(button, button.parentElement, () => this._sendAlarm(service));
    }
    restoreFocus?.();
  }

  async _sendAlarm(service, held = false) {
    const entity = text(this._config.entity), state = stateOf(this._hass, entity);
    const action = alarmActions(state).find(item => item.service === service);
    if (!state.state || !action || action.hold && !held || this._alarmBusy || this._actionLive === false
      || domainOf(entity) !== "alarm_control_panel" || !serviceConnectionReady(this._hass) || !serviceTargetReady(this._hass, entity)) return;
    if (state.state === `armed_${action.mode}` || action.mode === "disarm" && state.state === "disarmed") return;
    const code = this._alarmPIN || "";
    this._clearAlarmPIN();
    if (alarmCodeRequired(state, service) && (!code || state.attributes.code_format === "number" && !/^\d+$/.test(code))) {
      this._actionError = localize("alarm.code_required", this._hass, {}, "Enter a valid alarm code");
      this._renderAlarm();
      return;
    }
    const config = this._config;
    this._alarmBusy = true;
    this._renderAlarm();
    haptic("heavy");
    const data = { entity_id: entity };
    if (alarmCodeRequired(state, service)) data.code = code;
    try { await this._callService("alarm_control_panel", service, data); }
    finally { if (this._config === config) { this._alarmBusy = false; this._renderAlarm(); } }
  }

  _subscribeClimate() {
    const entity = this._climateConnected && this._config.template === "hc_climate_card" && domainOf(this._config.entity) === "climate" ? this._config.entity : "";
    if (entity === this._climateEntity) return;
    const previous = climateRequests.get(this._climateEntity);
    if (previous) {
      previous.cards.delete(this);
      if (!previous.cards.size) {
        clearClimateSetting(previous, "mode"); clearClimateSetting(previous, "target");
        climateRequests.delete(this._climateEntity);
      }
    }
    this._climateEntity = entity;
    if (entity) {
      if (!climateRequests.has(entity)) climateRequests.set(entity, { cards: new Set() });
      climateRequests.get(entity).cards.add(this);
      if (this._hass) reconcileClimate(entity, this._hass, false);
    }
  }

  _label(entity, config, state) {
    return config.name || state?.attributes?.friendly_name || entity || config.template || "Marao";
  }

  _sliderCurrent(kind, attrs = {}) {
    return { hc_light_card: Number(attrs.brightness) * 100 / 255 || 0, hc_cover_card: Number(attrs.current_position) || 0, hc_fan_card: Number(attrs.percentage) || 0 }[kind];
  }

  _cancelSliderGesture() {
    if (!this._sliderGesture) return;
    this._sliderGesture.cancelled = true;
    this._sliderTargets.delete(this._sliderGesture.key);
    this._sliderGesture = null;
  }

  _range(entity, state, kind, disabled = false) {
    if (["hc_light_card", "hc_fan_card"].includes(kind) && this._config.variables?.enable_slider === false) return "";
    const attrs = state.attributes || {};
    if (kind === "hc_light_card" && Array.isArray(attrs.supported_color_modes)
      && !attrs.supported_color_modes.some((mode) => mode !== "onoff" && mode !== "unknown")) return "";
    if (kind === "hc_fan_card" && attrs.supported_features != null && !(Number(attrs.supported_features) & 1)) return "";
    const key = `${kind}:${entity}`;
    if (kind === "hc_climate_card") {
      const settings = climateSettings(entity, state);
      const target = climateTarget(settings.attributes, settings.mode);
      const label = this._config.variables?.setpoint_label || localize("climate.target_temperature", this._hass, {}, "Target temperature");
      return numberStepper(target, label, "", "climate-stepper", disabled, this._hass);
    }
    if (kind === "hc_number_card") {
      const value = Number(state.state);
      return Number.isFinite(value) ? numberStepper(value, this._label(entity, this._config, state), text(attrs.unit_of_measurement), "", disabled, this._hass) : "";
    }
    if (kind === "hc_wallbox_current_card") {
      const value = Number(state.state);
      return Number.isFinite(value) ? numberStepper(value, this._label(entity, this._config, state), text(attrs.unit_of_measurement), "wallbox-stepper", disabled, this._hass) : "";
    }
    const ranges = {
      hc_light_card: [0, 100, this._sliderCurrent(kind, attrs), "brightness", 1],
      hc_cover_card: [0, 100, this._sliderCurrent(kind, attrs), "position", 1],
      hc_fan_card: [0, 100, this._sliderCurrent(kind, attrs), "percentage", 1],
    }[kind];
    if (kind === "hc_access_slide_action_card") {
      const renderedState = disabled ? "unavailable" : text(state.state);
      return `<marao-slide-to-open entity="${esc(entity)}" state="${esc(renderedState)}" aria-disabled="${disabled}"></marao-slide-to-open>`;
    }
    if (!ranges) return "";
    const [min, max, current, mode, step] = ranges;
    const modeLabel = localize(`controls.${mode}`, this._hass, {}, climateModeLabel(mode, this._hass));
    const stored = this._sliderTargets.get(key);
    const value = Number.isFinite(stored) && Math.abs(stored - current) > step / 2 ? stored : current;
    if (stored != null && value === current) this._sliderTargets.delete(key);
    return `<div class="slider"><svg class="slider-track" aria-hidden="true" focusable="false"><rect class="slider-background"></rect><rect class="slider-fill"></rect><circle class="slider-thumb"></circle></svg><input data-slider-key="${esc(key)}" data-slider-current="${Number.isFinite(current) ? current : min}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${esc(modeLabel)}" title="${esc(modeLabel)}"${disabled ? " disabled" : ""}></div>`;
  }

  _graphAvailability(entity, hass = this._hass) {
    if (!hass || hass.connected === false || hass.connection?.connected === false) return "unavailable";
    const state = hass.states?.[entity]?.state;
    return !state || state === "unknown" ? "unknown" : state === "unavailable" ? "unavailable" : "";
  }

  _graphStatus(entity) {
    return this._graphAvailability(entity) || (this._graphErrors.has(entity) ? "error"
      : !this._graphHistory.has(entity) ? "loading" : this._graphHistory.get(entity).length ? "ready" : "empty");
  }

  _loadGraphHistory(entity) {
    if (this.isConnected === false || !entity || this._graphAvailability(entity) || !this._hass?.callApi || this._graphHistory.has(entity)
      || this._graphErrors.has(entity) || this._graphRequests.has(entity)) return;
    const request = Symbol(entity);
    this._graphRequests.set(entity, request);
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const query = new URLSearchParams({
      filter_entity_id: entity,
      end_time: end.toISOString(),
    });
    const state = stateOf(this._hass, entity);
    if (!this._energyGraphSource(state)) { query.set("minimal_response", ""); query.set("no_attributes", ""); }
    this._hass.callApi("GET", `history/period/${start.toISOString()}?${query}`)
      .then((response) => {
        if (this._graphRequests.get(entity) !== request || this.isConnected === false) return;
        this._graphHistory.set(entity, Array.isArray(response?.[0]) ? response[0] : []);
      })
      .catch(() => {
        if (this._graphRequests.get(entity) === request && this.isConnected !== false) this._graphErrors.add(entity);
      })
      .finally(() => {
        if (this._graphRequests.get(entity) === request) {
          this._graphRequests.delete(entity);
          this._render();
        }
      });
  }

  _energyGraphSource(state) {
    return Object.hasOwn(energyUnits, state.attributes?.unit_of_measurement)
      || ["power", "energy", "monetary"].includes(state.attributes?.device_class)
      || ["hc_graph_card", "hc_toggle_graph_card", "hc_switch_card", "hc_sensor_card", "hc_base_card"].includes(this._config.template || "hc_base_card")
        && energyFormatting(this._config.variables || {});
  }

  _graphValues(entity, variables = {}) {
    const end = Date.now(), start = end - 24 * 60 * 60 * 1000;
    const state = stateOf(this._hass, entity);
    const energy = this._energyGraphSource(state), historyVariables = this._config.template === 'hc_climate_card' ? {} : variables;
    let error = false;
    const convert = (_value, record) => {
      const reading = energy ? energyHistoryValue(record, state.attributes?.unit_of_measurement, historyVariables) : { value: Number(record.state) };
      if (reading?.error) error = true;
      return reading?.error ? null : reading?.value;
    };
    const values = historyData.normalizeSamples(this._graphHistory.get(entity) || [], { convert, live: state });
    return { values: values.filter(record => record.time >= start && record.time <= end), error };
  }

  _graphMarkup(entity, variables = {}, data = this._graphValues(entity, variables)) {
    const end = Date.now(), start = end - 24 * 60 * 60 * 1000;
    const values = data.values.filter(record => Number.isFinite(record.value));
    if (!values.length) return '<svg class="graph-background" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>';
    const { minimum, maximum } = historyData.summary(values);
    const spread = maximum - minimum || 1;
    const segments = [[]];
    for (const record of historyData.reduceSamples(data.values, 240)) {
      if (!Number.isFinite(record.value)) { if (segments.at(-1).length) segments.push([]); continue; }
      const x = Math.max(0, Math.min(100, (record.time - start) / (end - start) * 100));
      const y = Math.max(6, Math.min(94, 94 - (record.value - minimum) / spread * 88));
      segments.at(-1).push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    const markup = segments.filter(segment => segment.length).map(points => {
      if (points.length === 1) { const [cx, cy] = points[0].split(','); return `<circle class="line" cx="${cx}" cy="${cy}" r="1"></circle>`; }
      const fill = variables.show_graph_fill !== false ? `<polygon class="fill" points="${points[0].split(',')[0]},100 ${points.join(' ')} ${points.at(-1).split(',')[0]},100"></polygon>` : '';
      return fill + (variables.show_graph_line !== false ? `<polyline class="line" points="${points.join(' ')}"></polyline>` : '');
    }).join('');
    return `<svg class="graph-background" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${markup}</svg>`;
  }

  _graphEntity() {
    const variables = this._config.variables || {};
    return text(variables.graph_entity || variables.power_entity || (["hc_graph_card", "hc_toggle_graph_card"].includes(this._config.template) ? this._config.entity : ''));
  }
  _historyOptions() {
    const variables = this._config.variables || {}, entity = this._graphEntity(), state = stateOf(this._hass, entity);
    const energy = this._energyGraphSource(state), historyVariables = this._config.template === 'hc_climate_card' ? {} : variables;
    const climate = this._config.template === 'hc_climate_card';
    const data = this._graphValues(entity, variables);
    return { samples: data.values, hass: this._hass, stateClass: state.attributes?.state_class,
      unavailable: this._graphAvailability(entity) ? localize(`common.${this._graphAvailability(entity)}`, this._hass, {}, this._graphAvailability(entity)) : '',
      loading: this._graphStatus(entity) === 'loading', error: data.error ? localize('energy.format_error', this._hass, {}, 'Reading format is incompatible with its source unit')
        : this._graphStatus(entity) === 'error' ? localize('timeline.history_unavailable', this._hass, {}, 'History unavailable') : '',
      windows: true, color: variables.graph_color, showLine: variables.show_graph_line !== false, showFill: variables.show_graph_fill !== false,
      localize: key => localize(key, this._hass, {}, key),
      format: value => energy ? climate ? formatEnergyNumber(value, undefined, this._hass)
        : energyLabel({value, unit: energyValue(state.state, state.attributes?.unit_of_measurement, historyVariables)?.unit || ''}, historyVariables, this._hass)
        : `${new Intl.NumberFormat(this._hass?.locale?.language || this._hass?.language, {maximumFractionDigits: 3}).format(value)}${climate ? '' : ` ${state.attributes?.unit_of_measurement || ''}`}`.trim(),
      onRetry: () => { this._graphErrors.delete(entity); this._graphHistory.delete(entity); this._loadGraphHistory(entity); },
    };
  }
  _openHistory(opener) {
    if (this.preview || this._graphAvailability(this._graphEntity())) return;
    haptic('heavy');
    const options = this._config.variables || {}, source = stateOf(this._hass, this._graphEntity());
    if (options.history_popup && options.popup_hash && (energyUnits[source.attributes?.unit_of_measurement]?.[0] === 'power' || options.power_devices?.length)) {
      navigate(options.popup_hash); return;
    }
    const overlays = new Set();
    for (let node = this; node; node = node.parentElement || node.getRootNode()?.host) if (node.classList?.contains('marao-popup-overlay')) overlays.add(node);
    let popup = findElements('marao-popup-card').find(popup => popup._open && overlays.has(popup._overlay));
    if (!popup) {
      this._historyPopup ||= document.createElement('marao-popup-card');
      popup = this._historyPopup; popup._transientHistory = true;
      popup.setConfig({ title: this._label(this._graphEntity(), this._config, stateOf(this._hass, this._graphEntity())), cards: [] });
      if (!popup.isConnected) this.shadowRoot.append(popup);
    }
    if (!popup._open) popup.hass = this._hass;
    popup.openHistory(this, opener);
  }

  _render() {
    if (!this.shadowRoot) return;
    if (this._config.template === "hc_alarm_controls_card") { this._renderAlarm(); return; }
    const gesture = this._sliderGesture;
    if (gesture?.input.isConnected) {
      const state = stateOf(this._hass, this._config.entity);
      if (gesture.key === `${this._config.template}:${this._config.entity}` && serviceConnectionReady(this._hass)
        && state.state && !["unknown", "unavailable"].includes(text(state.state).toLowerCase())) {
        // Replacing a native range during a drag ends its gesture and can fire change.
        gesture.refresh(state);
        return;
      }
    }
    this._cancelSliderGesture();
    const restoreFocus = this.shadowRoot.activeElement ? focusRestorer(deepActiveElement()) : null;
    this._cancelHold();
    const config = this._config || {};
    const entity = text(config.entity);
    const variables = config.variables && typeof config.variables === "object" ? config.variables : {};
    const configuredKind = text(config.template, "hc_base_card");
    const entityGroup = configuredKind === 'hc_entity_group_card';
    const roomLights = configuredKind === "hc_room_card" ? roomLightEntities(config) : [];
    const loading = !this._hass?.states;
    const originalState = loading ? {} : stateOf(this._hass, entity);
    const summaryEntities = configuredKind === "hc_room_card" ? roomLights : variables.summary_entities;
    const summary = entityGroup ? entityGroupState(variables.entity_type, summaryEntities, this._hass)
      : !loading && Array.isArray(summaryEntities) && summaryEntities.length ? summaryState(summaryEntities, this._hass) : null;
    const state = summary ? { ...originalState, state: summary.state } : configuredKind === "hc_room_card" ? { ...originalState, state: "off" } : originalState;
    const accessService = variables.action_service || config.tap_action?.service || config.tap_action?.perform_action;
    const requiresSlide = configuredKind.startsWith("hc_access_") && ["lock.unlock", "cover.open_cover"].includes(accessService);
    const kind = requiresSlide ? "hc_access_slide_action_card" : entityGroup ? 'hc_navigation_card' : configuredKind;
    const camera = kind === "hc_camera_card";
    const graphEntity = text(variables.graph_entity || variables.power_entity || (["hc_graph_card", "hc_toggle_graph_card"].includes(kind) ? entity : ""));
    const showsGraph = Boolean(graphEntity) && (["hc_graph_card", "hc_toggle_graph_card"].includes(kind) || variables.show_graph === true);
    const toggleEntity = kind === "hc_toggle_graph_card" ? text(variables.toggle_entity) : "";
    const interactionState = toggleEntity ? stateOf(this._hass, toggleEntity) : state;
    const binary = entityGroup || kind === "hc_room_card" && !roomLights.length ? null : binaryState(summary ? "binary_sensor.marao_summary" : toggleEntity || entity, interactionState, kind);
    const redundantState = binary !== null && (!toggleEntity || toggleEntity === entity) && (!summary || summary.state === "off" && serviceTargetReady(this._hass, variables.summary_entities));
    const pictureURL = ["hc_camera_card", "hc_media_card"].includes(kind) && state.state !== "off" ? text(state.attributes?.entity_picture) : "";
    if (pictureURL !== this._mediaURL) { this._mediaURL = pictureURL; this._mediaError = ""; }
    const formatting = energyFormatting(variables);
    const formattedPrimary = formatting && ["hc_graph_card", "hc_toggle_graph_card", "hc_sensor_card", "hc_base_card"].includes(kind)
      ? energyValue(state.state, state.attributes?.unit_of_measurement, variables) : null;
    const power = kind === "hc_switch_card" && variables.power_entity ? stateOf(this._hass, variables.power_entity) : null;
    const formattedPower = formatting && power ? energyValue(power.state, power.attributes?.unit_of_measurement, variables) : null;
    const graphData = showsGraph ? this._graphValues(graphEntity, variables) : {values: [], error: false};
    const formatError = formattedPrimary?.error || formattedPower?.error || graphData.error
      ? localize("energy.format_error", this._hass, {}, "Reading format is incompatible with its source unit") : "";
    const problem = cardProblem(config, this._hass, {
      error: this._actionError,
      contentError: [formatError, this._cameraError, this._mediaError, showsGraph && this._graphErrors.has(graphEntity) ? localize("timeline.history_unavailable", this._hass, {}, "History unavailable") : ""].filter(Boolean).join(" · "),
    });
    const requestedClimate = kind === "hc_climate_card" ? climateSettings(entity, state) : null;
    const value = loading ? "loading" : requestedClimate?.mode || text(state.state, "unknown");
    const batteryGroup = entityGroup && variables.entity_type === 'battery' && summary.minimumReading !== null;
    const batteryConfig = batteryGroup && variables.hc_color ? { ...config, variables: { ...variables, active_color: variables.hc_color } } : config;
    const appearance = stateAppearance(batteryGroup ? 'hc_battery_card' : kind, batteryGroup ? summary.minimumReading : value, batteryConfig, this._hass);
    const interactionUnavailable = ["unknown", "unavailable"].includes(text(interactionState.state, "unknown").toLowerCase());
    const stateDisabled = loading || entityGroup && (this._hass?.connected === false || this._hass?.connection?.connected === false)
      || Boolean(entity || toggleEntity || entityGroup) && (toggleEntity ? interactionUnavailable : appearance.unavailable);
    const serviceReady = serviceConnectionReady(this._hass);
    const controlsDisabled = !serviceReady || interactionUnavailable;
    const stateIcon = kind === "hc_sensor_card" && value === "off" ? variables.off_icon
      : ["hc_sensor_card", "hc_battery_card"].includes(kind) ? variables.on_icon : kind === "hc_vacuum_card" ? variables.icon : "";
    const icon = text(config.icon || stateIcon || state.attributes?.icon);
    const climate = kind === "hc_climate_card" ? state.attributes || {} : null;
    const customLabel = text(variables.custom_label).trim();
    const displayValue = kind === "hc_room_card" ? /[:：]$/.test(customLabel) ? "" : customLabel : redundantState
      ? /[:：]$/.test(customLabel) ? "" : customLabel
      : `${variables.custom_label || variables.hc_label_prefix || ""}${summary?.label || (requestedClimate?.pending ? climateModeLabel(value, this._hass) : (formattedPrimary ? energyLabel(formattedPrimary, variables, this._hass) : entityStateLabel(state, entity, kind, this._hass)))}`;
    const climatePending = requestedClimate?.pending ? `<div class="climate-pending" role="status">${esc(localize("climate.updating", this._hass, {}, "Updating…"))}</div>` : "";
    const currentTemperature = climate && climate.current_temperature != null ? text(climate.current_temperature) : "";
    const climateReadingLabel = currentTemperature ? localize("climate.current_temperature", this._hass, { value: currentTemperature }, `Current ${currentTemperature}`) : "";
    const climateModes = Array.isArray(climate?.hvac_modes) ? climate.hvac_modes.filter(Boolean).map(text) : [];
    const modeButtons = kind === "hc_climate_card" && config.variables?.show_mode_buttons && climateModes.length
      ? `<div class="climate-modes" role="group" aria-label="${esc(localize("climate.modes", this._hass, {}, "Climate modes"))}">${climateModes.map((mode) => { const label = climateModeLabel(mode, this._hass); const controlLabel = localize("climate.set_mode", this._hass, { mode: label }, `Set climate mode to ${label}`); return `<button class="climate-mode${mode === value ? " active" : ""}" type="button" data-climate-mode="${esc(mode)}" aria-label="${esc(controlLabel)}" title="${esc(controlLabel)}"${controlsDisabled ? " disabled" : ""}><ha-icon icon="${esc(climateModeIcon(mode))}" aria-hidden="true"></ha-icon><span>${esc(label).replaceAll("/", "<wbr>/<wbr>")}</span></button>`; }).join("")}</div>` : "";
    const shortcuts = kind === "hc_wallbox_current_card"
      ? (Array.isArray(config.variables?.shortcuts) ? config.variables.shortcuts : []).map(Number).filter(Number.isFinite).slice(0, 3)
      : [];
    const shortcutButtons = shortcuts.length
      ? `<div class="wallbox-shortcuts" role="group" aria-label="${esc(localize("wallbox.shortcuts", this._hass, {}, "Charging current shortcuts"))}">${shortcuts.map((shortcut) => `<button type="button" data-current-shortcut="${shortcut}"${controlsDisabled ? " disabled" : ""}>${esc(shortcut)}${esc(state.attributes?.unit_of_measurement || "A")}</button>`).join("")}</div>`
      : "";
    const roomLightsControlDisabled = loading || !serviceReady || !serviceTargetReady(this._hass, roomLights);
    const roomLightsOffLabel = localize("room.turn_off_lights", this._hass, { name: this._label(entity, config, state) }, `Turn off all lights in ${this._label(entity, config, state)}`);
    const roomLightsControl = roomLights.length
      ? `<button class="room-lights-off" type="button" data-room-lights-off aria-label="${esc(roomLightsOffLabel)}" title="${esc(roomLightsOffLabel)}"${roomLightsControlDisabled ? " disabled" : ""}><ha-icon icon="mdi:lightbulb-off-outline" aria-hidden="true"></ha-icon></button>`
      : "";
    const sceneOptions = kind === "hc_scene_card" && ["input_select", "select"].includes(domainOf(entity)) && Array.isArray(state.attributes?.options)
      ? state.attributes.options.filter((option) => typeof option === "string")
      : [];
    const sceneButtons = sceneOptions.length
      ? `<div class="scene-options" role="group" aria-label="${esc(this._label(entity, config, state))}">${sceneOptions.map((option) => `<button type="button" data-scene-option="${esc(option)}" aria-pressed="${!interactionUnavailable && option === value}"${controlsDisabled ? " disabled" : ""}>${esc(option)}</button>`).join("")}</div>`
      : "";
    const climateControls = currentTemperature ? `<div class="climate current-temperature" aria-label="${esc(climateReadingLabel)}">${esc(currentTemperature)}</div>` : "";
    const previewAvailable = !loading && !interactionUnavailable && this._hass?.connected !== false && this._hass?.connection?.connected !== false;
    const mediaAvailable = previewAvailable && value !== "off";
    let media = "";
    if (camera && this.preview) media = `<div class="camera-preview">${!interactionUnavailable && pictureURL ? `<img src="${esc(pictureURL)}" alt="${esc(this._label(entity, config, state))}">` : ''}<span>${esc(localize(!interactionUnavailable && pictureURL ? 'camera.snapshot' : loading ? 'common.loading' : 'common.unavailable', this._hass))}</span></div>`;

    const range = this._range(entity, state, kind, controlsDisabled);
    const artwork = !problem && kind === "hc_media_card" && mediaAvailable && variables.hc_show_background_art !== false && state.attributes?.entity_picture
      ? `<div class="media-artwork" aria-hidden="true"><img src="${esc(state.attributes.entity_picture)}" alt=""></div>` : "";
    const glance = kind === "hc_glance_card";
    let readings = glance ? [1,2,3].filter((index) => variables[`entity${index}`]).map((index) => readingMarkup(variables[`entity${index}`], variables[`entity${index}_name`], variables[`entity${index}_icon`], this._hass)).join("") : "";
    const locale = this._hass?.locale?.language || this._hass?.language || "en";
    let details = "";
    if (kind === "hc_sensor_card" && !appearance.unavailable && state.last_updated) {
      const updated = new Date(state.last_updated);
      if (Number.isFinite(updated.getTime())) details = `<div class="climate">${esc(localize("sensor.updated", this._hass, { time: new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(updated) }, "Updated " + new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(updated)))}</div>`;
    }
    if (kind === "hc_switch_card" && variables.power_entity) {
      const reading = formattedPower ? energyLabel(formattedPower, variables, this._hass) : Number.isFinite(Number(power.state)) && power.state !== "" && power.state != null
        ? `${power.state} ${variables.power_unit || power.attributes?.unit_of_measurement || "W"}` : entityStateLabel(power, variables.power_entity, "hc_sensor_card", this._hass);
      details = `<div class="climate">${esc(reading)}</div>`;
    }
    if (kind === "hc_media_card" && mediaAvailable && state.attributes?.media_title) {
      details = `<div class="climate">${esc([state.attributes.media_title, state.attributes.media_artist].filter(Boolean).join(' · '))}</div>`;
    }
    if (kind === "hc_header_card") {
      details = `<div class="climate">${esc(new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: this._hass?.config?.time_zone }).format(new Date()))}</div>`;
      if (variables.person_entity) readings += readingMarkup(variables.person_entity, "", "mdi:account", this._hass, "person");
      if (variables.air_quality_sensor) readings += readingMarkup(variables.air_quality_sensor, "", "mdi:air-filter", this._hass);
    }
    if (kind === "hc_weather_card" && !appearance.unavailable && !loading) {
      const attrs = state.attributes || {};
      const unit = text(attrs.temperature_unit || this._hass?.config?.unit_system?.temperature);
      if (attrs.temperature != null) details = `<div class="climate">${esc(attrs.temperature)} ${esc(unit)}</div>`;
      if (variables.show_forecast !== false && Array.isArray(attrs.forecast)) {
        readings += attrs.forecast.slice(0,5).map((day) => {
          const date = new Date(day.datetime);
          if (!Number.isFinite(date.getTime())) return "";
          const label = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }).format(date);
          const condition = entityStateLabel({ state: day.condition, attributes: {} }, entity, "hc_weather_card", this._hass);
          const temperatures = [day.templow, day.temperature].filter((value) => value != null).map((value) => `${value} ${unit}`).join("–");
          return `<div class="reading"><dt>${esc(label)}</dt><dd>${esc(condition)}</dd><dd>${esc(temperatures)}</dd></div>`;
        }).join("");
      }
    }
    if (kind === "hc_dishwasher_card") {
      for (const [key, icon] of [["progress_entity","mdi:progress-check"], ["remaining_time_entity","mdi:timer-outline"], ["active_program_entity","mdi:dishwasher"]]) {
        if (variables[key]) readings += readingMarkup(variables[key], "", icon, this._hass);
      }
      for (const [key, label] of [["salt_entity","salt"], ["rinse_aid_entity","rinse_aid"]]) {
        if (dishwasherWarning(stateOf(this._hass, variables[key]))) readings += readingMarkup(variables[key], localize(`dishwasher.${label}`, this._hass, {}, label.replaceAll('_',' ')), "mdi:alert-circle-outline", this._hass);
      }
    }
    const showName = kind !== "hc_media_app_card" && config.show_name !== false && (!glance || Boolean(config.name));
    const uniformControl = standardControl(config);
    this.toggleAttribute?.('data-marao-standard-control', uniformControl);
    const sliderHeader = showName && (uniformControl || kind === 'hc_fan_card');
    const titleCard = kind === "hc_title_card";
    const stateWanted = kind !== "hc_media_app_card" && !camera && !titleCard && !glance && (kind === "hc_room_card" ? Boolean(displayValue) : Boolean(entity || entityGroup)) && config.show_state !== false;
    const showState = stateWanted && !problem?.complete && (!redundantState || Boolean(displayValue));
    const showIcon = !camera && !titleCard && !glance && config.show_icon !== false && variables.show_icon !== false;
    const iconOnly = !camera && !showName && !stateWanted && config.show_label === false;
    const isAction = ["hc_switch_card", "hc_light_card", "hc_cover_card", "hc_fan_card", "hc_access_card"].includes(kind);
    const popupHash = config.variables?.popup_hash;
    let action = config.tap_action || (popupHash ? { action: "navigate", navigation_path: popupHash, haptic: "heavy" } : isAction ? { action: "toggle", haptic: "heavy" } : null);
    if (kind === "hc_climate_card" && !config.tap_action) {
      action = climateDefaultAction(climateModes, config.variables);
    }
    if (kind === "hc_toggle_graph_card" && !config.tap_action && config.variables?.toggle_entity) {
      action = { action: "toggle", entity_id: config.variables.toggle_entity, haptic: "heavy" };
    }
    if (["hc_access_action_card", "hc_access_hold_action_card"].includes(kind) && !config.tap_action) {
      const service = text(config.variables?.action_service);
      action = service ? { action: "call-service", service, entity_id: entity, haptic: "heavy" } : null;
    }
    if (kind === "hc_access_slide_action_card") action = null;
    if (action?.action === "none") action = null;
    const usesNumberStepper = ["hc_climate_card", "hc_number_card", "hc_wallbox_current_card"].includes(kind);
    const binaryLabel = binary === null ? "" : `${this._label(toggleEntity || entity, toggleEntity && toggleEntity !== entity ? {} : config, interactionState)}: ${entityStateLabel(interactionState, toggleEntity || entity, kind, this._hass)}`;
    const hiddenBinaryState = binaryLabel && kind !== "hc_room_card" && !showIcon ? `<span class="binary-state" role="img" aria-label="${esc(binaryLabel)}"></span>` : "";
    const app = kind === "hc_media_app_card" ? mediaAppBrand(config) : null;
    const iconElement = usesNumberStepper ? "" : kind === "hc_room_card" || !showIcon ? hiddenBinaryState : app
      ? `<img class="app-icon${app.symbol ? " app-symbol" : ""}" src="${esc(new URL(`./media-apps/${app.file || `${app.id}.png`}${new URL(import.meta.url).search}`, import.meta.url).href)}" width="64" height="64" alt="" aria-hidden="true">`
      : `<div class="icon"${binaryLabel ? ` role="img" aria-label="${esc(binaryLabel)}"` : ' aria-hidden="true"'}>${icon ? `<ha-icon icon="${esc(icon)}" aria-hidden="true"></ha-icon>` : `<ha-state-icon data-state-icon aria-hidden="true"></ha-state-icon>`}</div>`;
    const roomArtwork = kind === "hc_room_card" && showIcon ? `<div class="room-artwork" aria-hidden="true">${icon ? `<ha-icon icon="${esc(icon)}" aria-hidden="true"></ha-icon>` : '<ha-state-icon data-state-icon aria-hidden="true"></ha-state-icon>'}</div>` : "";
    const roomBottom = roomLightsControl || roomArtwork ? `<div class="room-bottom">${roomLightsControl}${roomArtwork}</div>` : "";
    const controlClass = kind === "hc_climate_card" ? "control number-control climate-number-control" : kind === "hc_wallbox_current_card" ? "control number-control wallbox-current-control" : usesNumberStepper ? "control number-control" : "control";
    const serviceTarget = action?.target?.entity_id || action?.data?.entity_id || action?.entity_id || entity;
    const roomNavigation = kind === "hc_room_card" && action?.action === "navigate";
    const actionDisabled = roomNavigation ? !text(action.navigation_path).trim() : isServiceAction(action) ? !serviceReady || !serviceTargetReady(this._hass, serviceTarget) : stateDisabled && problem?.complete !== false;
    const baseActionLabel = actionControlLabel(config, state, entity, action, this._hass);
    const targetEntity = text(action?.target?.entity_id || action?.entity_id || entity);
    const targetName = stateOf(this._hass, targetEntity).attributes?.friendly_name || targetEntity;
    const semanticActionLabel = iconOnly && isServiceAction(action) && targetName
      ? localize("actions.for_target", this._hass, { action: baseActionLabel, name: targetName }, `${baseActionLabel} ${targetName}`) : baseActionLabel;
    const holdAction = kind === "hc_access_hold_action_card" && Boolean(action);
    const alternateHold = !holdAction && config.hold_action && config.hold_action.action !== "none";
    const actionLabel = holdAction ? localize("access.hold_to_activate", this._hass, { action: semanticActionLabel }, `Hold to ${semanticActionLabel}`) : semanticActionLabel;
    const roomDescription = kind === "hc_room_card" && roomLights.length ? localize("room.lighting_summary", this._hass, { label: summary?.label || localize("common.loading", this._hass, {}, "Loading…") }, `Lighting: ${summary?.label || "Loading…"}`) : "";
    const actionControl = action ? `<button class="card-action" type="button" data-card-action${holdAction ? " data-hold-action" : ""} aria-label="${esc(actionLabel)}"${roomDescription ? ` aria-description="${esc(roomDescription)}"` : ""} title="${esc(actionLabel)}"${actionDisabled ? " disabled" : ""}></button>` : "";
    const holdProgress = holdAction || alternateHold ? '<svg class="hold-progress" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" pathLength="100"></rect></svg>' : "";
    const holdHint = holdAction ? `<div class="climate">${esc(actionLabel)}</div>` : "";
    const graphStatus = showsGraph ? loading ? "loading" : graphData.error ? "format-error" : this._graphStatus(graphEntity) : "";
    const graphMarkup = showsGraph && graphStatus === "ready" ? this._graphMarkup(graphEntity, variables, graphData) : "";
    const graphStatusKey = { loading: "timeline.loading", empty: "timeline.no_history", error: "timeline.history_unavailable", unknown: "common.unknown", unavailable: "common.unavailable" }[graphStatus];
    const graphMessage = graphStatus === "format-error" ? "" : graphStatus === "error" ? `<button class="graph-status" type="button" data-graph-retry>${esc(localize("common.retry", this._hass, {}, "Retry"))}</button>` : graphStatusKey ? `<div class="graph-status" role="status">${esc(localize(graphStatusKey, this._hass, {}, graphStatus === "loading" ? "Loading history…" : graphStatus === "empty" ? "No history in the last 24 hours" : graphStatus))}</div>` : "";
    const historyLabel = localize('history.title', this._hass, {}, 'History');
    const historyControl = showsGraph ? `<button type="button" class="history-control" data-history-open aria-label="${esc(historyLabel)}"${this.preview || this._graphAvailability(graphEntity) ? ' disabled' : ''}>${iconOnly ? '<ha-icon icon="mdi:chart-line" aria-hidden="true"></ha-icon>' : esc(historyLabel)}</button>` : '';
    const readingContent = readings ? `<dl class="readings">${readings}</dl>` : "";
    const vacuum = kind === "hc_vacuum_card" ? vacuumActions(state, variables) : [];
    const vacuumControls = vacuum.length ? `<div class="vacuum-actions" role="group" aria-label="${esc(this._label(entity, config, state))}">${vacuum.map((entry, index) => {
      const label = entry.label || localize(entry.labelKey, this._hass, { segment: entry.segment }, entry.segment == null ? climateModeLabel(entry.key) : `Clean segment ${entry.segment}`);
      const semanticLabel = localize("actions.for_target", this._hass, { action: label, name: this._label(entity, config, state) }, `${label} ${this._label(entity, config, state)}`);
      return `<button type="button" data-vacuum-action="${index}" aria-label="${esc(semanticLabel)}" title="${esc(label)}"${controlsDisabled ? " disabled" : ""}><ha-icon icon="${esc(entry.icon)}" aria-hidden="true"></ha-icon></button>`;
    }).join("")}</div>` : "";
    const problemMessage = !camera && problem && (problem.kind !== "loading" || !showState) ? `<div class="problem" role="${problem.kind === "error" ? "alert" : "status"}"><ha-icon icon="${problem.kind === "loading" ? "mdi:progress-clock" : problem.kind === "neutral" ? "mdi:help-circle-outline" : "mdi:alert-circle-outline"}" aria-hidden="true"></ha-icon><span>${esc(problem.reason)}</span></div>` : "";
    const formattedReading = !iconOnly && Boolean(formattedPrimary || formattedPower);
    const stateMarkup = showState && kind !== "hc_wallbox_current_card" ? `<div class="state">${esc(displayValue)}</div>` : "";
    const primaryMarkup = formattedReading ? `<div class="formatted-values">${stateMarkup}${details}</div>` : stateMarkup;
    const contentChanged = this._setMarkup(`<style>${cardStyles()}</style><ha-card${binary !== null && kind !== "hc_room_card" ? ` data-binary-state="${binary}"` : ""}${uniformControl ? ' class="control-surface"' : ""}${camera ? ` data-camera-card role="group" aria-label="${esc(this._label(entity, config, state))}"` : ""}${roomDescription && !action ? ` role="group" aria-label="${esc(this._label(entity, config, state))}" aria-description="${esc(roomDescription)}"` : ""}${problem ? ` data-problem="${problem.kind}" style="${problemStyle(problem)}"` : ""}${showsGraph ? ` data-graph-history-state="${graphStatus}"` : ""}${titleCard ? ' class="title-surface"' : ""}${loading ? ' aria-busy="true"' : ""}>${graphMarkup}${artwork}${actionControl}${holdProgress}<div class="body${camera ? " camera-card" : ""}${sliderHeader ? " slider-header" : ""}${formattedReading ? " formatted-reading" : ""}${iconOnly ? " icon-only" : ""}${binary !== null ? " binary-card" : ""}${showName && kind === "hc_navigation_card" ? " navigation-card" : ""}${titleCard ? " title-card" : ""}${glance ? " glance-card" : ""}${kind === "hc_media_app_card" ? " media-app-card" : ""}${kind === "hc_room_card" ? " room-card" : ""}${climate ? " climate-card" : ""}${showsGraph ? " graph-card" : ""}${kind === "hc_wallbox_current_card" ? " wallbox-card" : ""}${modeButtons ? " with-climate-modes" : ""}${uniformControl ? " standard-control" : ""}">${uniformControl && !iconOnly ? `<div class="compact-header"><div class="compact-copy">${showName ? `<div class="title">${esc(this._label(entity, config, state))}</div>` : ""}${primaryMarkup}${formattedReading ? "" : details}${holdHint}</div>${iconElement}</div>` : `${showName ? `<div class="title">${esc(this._label(entity, config, state))}</div>` : ""}${primaryMarkup}${formattedReading ? "" : details}${holdHint}${iconElement}`}${climateControls}${climatePending}${media}${range ? `<div class="${controlClass}">${range}</div>` : ""}${sceneButtons}${shortcutButtons}${modeButtons}${readingContent}${vacuumControls}${problemMessage}${graphMessage}${historyControl}${this._mediaError && previewAvailable && pictureURL ? `<button type="button" class="graph-status" data-media-retry>${esc(localize("common.retry", this._hass, {}, "Retry"))}</button>` : ""}${roomBottom}</div></ha-card>`, JSON.stringify([action, vacuum]));
    this._syncCamera();
    this._activeHistoryPopup?._refreshHistory();
    for (const symbol of this.shadowRoot.querySelectorAll("ha-state-icon")) {
      const readingEntity = symbol.dataset.readingEntity;
      symbol.hass = this._hass;
      symbol.stateObj = readingEntity ? presentationState(stateOf(this._hass, readingEntity), readingEntity, "hc_sensor_card") : presentationState(state, entity, kind);
    }
    const card = this.shadowRoot.querySelector("ha-card");
    if (card && !problem) {
      if (appearance.background) card.style.setProperty("--marao-card-background", appearance.background);
      if (appearance.text) card.style.setProperty("--marao-card-text-color", appearance.text);
      if (appearance.stateText) card.style.setProperty("--marao-state-color", appearance.stateText);
      if (appearance.icon) card.style.setProperty("--marao-icon-color", appearance.icon);
      if (appearance.iconBackground) card.style.setProperty("--marao-icon-background", appearance.iconBackground);
      if (appearance.accent) card.style.setProperty("--marao-accent-color", appearance.accent);
      if (kind === "hc_navigation_card" && variables.hc_icon_color && !appearance.unavailable) card.style.setProperty("--marao-icon-color", text(variables.hc_icon_color));
      if (artwork) {
        card.style.setProperty("--marao-card-text-color", "#fff");
        card.style.setProperty("--marao-icon-color", "#fff");
      }
      if (text(variables.graph_color).trim()) card.style.setProperty("--marao-graph-color", text(variables.graph_color).trim());
      if (text(variables.graph_background).trim()) card.style.setProperty("--marao-graph-background", text(variables.graph_background).trim());
    }
    if (contentChanged === false) {
      if (showsGraph) this._loadGraphHistory(graphEntity);
      return;
    }
    this.shadowRoot.querySelector('[data-history-open]')?.addEventListener('click', event => { event.stopPropagation(); this._openHistory(event.currentTarget); });
    const actionButton = this.shadowRoot.querySelector("[data-card-action]");
    if (actionButton) {
      if (holdAction) this._bindHoldAction(actionButton, card, () => this._performAction(action, entity));
      else if (alternateHold) this._bindHoldAction(actionButton, card, () => this._performAction(config.hold_action, entity), () => { actionButton.focus?.({ preventScroll: true }); this._performAction(action, entity); });
      else this._bindTapAction(actionButton, card, () => this._performAction(action, entity));
    }
    for (const button of this.shadowRoot.querySelectorAll("[data-vacuum-action]")) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (button.disabled || !serviceConnectionReady(this._hass)) return;
        const entry = vacuum[Number(button.dataset.vacuumAction)];
        this._performAction({ action: "call-service", service: entry.service, data: { ...entry.data, entity_id: entity }, haptic: "heavy" }, entity);
      });
    }
    if (roomLightsControl) {
      this.shadowRoot.querySelector("[data-room-lights-off]")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget?.disabled || !this._hass?.states || !serviceConnectionReady(this._hass) || !serviceTargetReady(this._hass, roomLights)) return;
        this._performAction({ action: "call-service", service: "light.turn_off", data: { entity_id: roomLights }, haptic: "heavy" }, entity);
      });
    }
    for (const image of this.shadowRoot.querySelectorAll('img.camera,.media-artwork img')) image.addEventListener('error', () => {
      if (!image.isConnected || this._config !== config || this._mediaURL !== pictureURL) return;
      this._mediaError = localize("common.media_unavailable", this._hass, {}, "Media unavailable");
      this._render();
    });
    this.shadowRoot.querySelector('[data-media-retry]')?.addEventListener('click', event => {
      event.stopPropagation();
      if (this._config !== config || !serviceConnectionReady(this._hass) || !serviceTargetReady(this._hass, entity)) return;
      this._mediaError = "";
      haptic('heavy');
      this._render();
    });
    this.shadowRoot.querySelector('[data-graph-retry]')?.addEventListener('click', event => {
      event.stopPropagation();
      if (this._config !== config || this._graphAvailability(graphEntity) || this._graphRequests.has(graphEntity)) return;
      this._graphErrors.delete(graphEntity);
      this._graphHistory.delete(graphEntity);
      haptic('heavy');
      this._render();
    });
    if (showsGraph) this._loadGraphHistory(graphEntity);
    const input = this.shadowRoot.querySelector("input[type=range]");
    if (input) {
      const min = Number(input.min);
      const max = Number(input.max);
      const toPercent = (value) => max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
      const setProgress = (progress) => {
        const percent = Math.max(0, Math.min(100, progress));
        input.style.setProperty("--marao-slider-progress", `${percent}%`);
        const parent = input.parentElement;
        parent?.style.setProperty("--marao-slider-progress", `${percent}%`);
        // CSS shares the native thumb's travel, including after a resize.
        parent?.style.setProperty("--marao-slider-fraction", String(percent / 100));
      };
      const updateProgress = (target = Number(input.value)) => {
        const progress = Math.min(toPercent(Number(input.dataset.sliderCurrent ?? input.value)), toPercent(target));
        input.parentElement?.style.setProperty("--marao-slider-target-fraction", String(toPercent(target) / 100));
        setProgress(progress);
      };
      updateProgress();
      input.addEventListener("input", () => {
        const value = Number(input.value);
        if (kind === "hc_access_slide_action_card") {
          setProgress(value);
        }
        else this._sliderTargets.set(`${kind}:${entity}`, value);
        if (kind !== "hc_access_slide_action_card") updateProgress(value);
      });
      let sliderGesture;
      input.addEventListener("pointerdown", () => {
        if (input.disabled) return;
        sliderGesture = this._sliderGesture = {
          input, key: input.dataset.sliderKey, completed: false, cancelled: false, dispatched: false,
          refresh: (state) => {
            input.dataset.sliderCurrent = this._sliderCurrent(kind, state.attributes);
            updateProgress();
            const label = this.shadowRoot.querySelector('.state');
            const binary = binaryState(entity, state, kind);
            if (label && binary === null) label.textContent = entityStateLabel(state, entity, kind, this._hass);
            if (binary !== null) {
              if (card) card.dataset.binaryState = String(binary);
              const accessible = this.shadowRoot.querySelector('.icon[role="img"],.binary-state[role="img"]');
              accessible?.setAttribute('aria-label', `${this._label(entity, this._config, state)}: ${entityStateLabel(state, entity, kind, this._hass)}`);
            }
            const appearance = stateAppearance(kind, text(state.state), this._config, this._hass);
            for (const [token, key] of [["--marao-card-background", "background"], ["--marao-card-text-color", "text"], ["--marao-icon-color", "icon"], ["--marao-icon-background", "iconBackground"], ["--marao-accent-color", "accent"]]) {
              card?.style.setProperty(token, appearance[key] || "");
            }
            for (const symbol of this.shadowRoot.querySelectorAll("ha-state-icon")) {
              symbol.hass = this._hass;
              symbol.stateObj = presentationState(state, entity, kind);
            }
          },
        };
        haptic("heavy");
      });
      input.addEventListener("pointerup", () => {
        if (!sliderGesture || sliderGesture.cancelled) return;
        sliderGesture.completed = true;
        const completedGesture = sliderGesture;
        // Let the native change event finish before rebuilding the released control.
        requestAnimationFrame(() => {
          if (this._sliderGesture !== completedGesture) return;
          this._sliderGesture = null;
          this._render();
        });
      });
      input.addEventListener("pointercancel", () => { this._cancelSliderGesture(); this._render(); });
      input.addEventListener("keydown", (event) => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) haptic("heavy");
      });
      input.addEventListener("change", () => {
        if (sliderGesture && (sliderGesture.cancelled || !sliderGesture.completed || sliderGesture.dispatched)) return;
        if (sliderGesture) sliderGesture.dispatched = true;
        const value = Number(input.value);
        if (kind !== "hc_access_slide_action_card") this._sliderTargets.set(`${kind}:${entity}`, value);
        this._setRange(entity, kind, value);
      });
    }
    this.shadowRoot.querySelectorAll("[data-climate-mode]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this._setClimateMode(entity, button.getAttribute("data-climate-mode"));
      });
    });
    this.shadowRoot.querySelectorAll("[data-number-step]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this._adjustNumber(entity, kind, button.getAttribute("data-number-step") === "decrease" ? -1 : 1);
      });
    });
    this.shadowRoot.querySelectorAll("[data-current-shortcut]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this._setNumberValue(entity, Number(button.getAttribute("data-current-shortcut")));
      });
    });
    this.shadowRoot.querySelectorAll("[data-scene-option]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this._selectSceneOption(entity, button.getAttribute("data-scene-option"));
      });
    });
    restoreFocus?.();
  }

  _bindTapAction(button, card, run) {
    const release = () => card?.classList.remove("is-pressed");
    button.addEventListener("pointerdown", () => { if (!button.disabled) card?.classList.add("is-pressed"); });
    for (const eventName of ["pointerup", "pointerleave", "pointercancel"]) button.addEventListener(eventName, release);
    button.addEventListener("click", () => { release(); button.focus?.({ preventScroll: true }); run(); });
  }

  _bindHoldAction(button, card, run, shortTap = null) {
    let suppressClick = false;
    const start = (event) => {
      if (button.disabled || this._holdActive || (event.button != null && event.button !== 0)) return;
      suppressClick = false;
      this._holdActive = true;
      this._holdControl = card;
      this._holdCompleted = false;
      haptic("heavy");
      card?.classList.add("is-pressed");
      const startedAt = globalThis.performance?.now?.() ?? Date.now();
      const draw = (now) => {
        if (!this._holdActive || this._holdCompleted) return;
        this._setHoldProgress(((now - startedAt) / ACCESS_HOLD_MS) * 100);
        this._holdFrame = globalThis.requestAnimationFrame?.(draw) ?? null;
      };
      this._setHoldProgress(0);
      this._holdFrame = globalThis.requestAnimationFrame?.(draw) ?? null;
      this._holdTimer = setTimeout(() => {
        if (!this._holdActive || this._holdCompleted) return;
        this._holdCompleted = true;
        this._holdTimer = null;
        globalThis.cancelAnimationFrame?.(this._holdFrame);
        this._holdFrame = null;
        this._setHoldProgress(100);
        run();
      }, ACCESS_HOLD_MS);
    };
    const cancel = () => { suppressClick = true; this._cancelHold(); };
    const finish = () => {
      const tapped = this._holdActive && !this._holdCompleted;
      cancel();
      if (tapped) shortTap?.();
    };
    button.addEventListener("pointerdown", start);
    button.addEventListener("pointermove", (event) => {
      if (!this._holdActive) return;
      const bounds = button.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) cancel();
    });
    button.addEventListener("pointerup", finish);
    for (const eventName of ["pointerleave", "pointercancel"]) button.addEventListener(eventName, cancel);
    button.addEventListener("click", (event) => {
      event.preventDefault(); event.stopPropagation();
      if (shortTap && !suppressClick && !button.disabled) shortTap();
      suppressClick = false;
    });
    button.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key) || event.repeat) return;
      event.preventDefault();
      start(event);
    });
    button.addEventListener("keyup", (event) => { if (["Enter", " "].includes(event.key)) finish(); });
    button.addEventListener("blur", cancel);
  }

  _setHoldProgress(value) {
    const progress = Math.max(0, Math.min(100, Number(value) || 0));
    const line = this._holdControl?.querySelector(".hold-progress rect") || this.shadowRoot?.querySelector(".hold-progress rect");
    if (line) {
      line.style.strokeDashoffset = text(100 - progress);
      line.style.opacity = progress > 0 ? "1" : "0";
    }
  }

  _cancelHold() {
    clearTimeout(this._holdTimer);
    globalThis.cancelAnimationFrame?.(this._holdFrame);
    this._holdTimer = null;
    this._holdFrame = null;
    this._holdActive = false;
    this._holdCompleted = false;
    this._setHoldProgress(0);
    this._holdControl?.classList.remove("is-pressed");
    this._holdControl = null;
    this.shadowRoot?.querySelector("ha-card")?.classList.remove("is-pressed");
  }

  _performAction(action, entity) {
    if (this.preview) return;
    if (this._config.template === 'hc_camera_card' && action?.action === 'fullscreen') { haptic('heavy'); return this._camera?.fullscreen(); }
    return performAction(this._hass, action, entity, isServiceAction(action) ? serviceOutcome(this) : undefined);
  }

  _callService(domain, service, data, target, intent) {
    if (this.preview) return Promise.resolve();
    return callServiceWithNotification(this._hass, domain, service, data, serviceOutcome(this), target, intent);
  }

  _setRange(entity, kind, value) {
    if (!serviceConnectionReady(this._hass) || !entity) return;
    const domain = domainOf(entity);
    if (kind === "hc_light_card") return this._callService("light", "turn_on", { entity_id: entity, brightness_pct: value });
    if (kind === "hc_cover_card") return this._callService("cover", "set_cover_position", { entity_id: entity, position: value });
    if (kind === "hc_fan_card") return this._callService("fan", "set_percentage", { entity_id: entity, percentage: value });
    if (kind === "hc_access_slide_action_card" && value >= 100) {
      const service = text(this._config.variables?.action_service);
      const [serviceDomain, serviceName] = service.split(".", 2);
      if (serviceDomain && serviceName) {
        const input = this.shadowRoot.querySelector("input.action-slider");
        input?.setAttribute("disabled", "true");
        haptic("heavy");
        this._callService(serviceDomain, serviceName, { entity_id: entity }, undefined, { accessSlide: true })
          .finally(() => { if (input) { input.value = "0"; input.removeAttribute("disabled"); } });
      }
    }
  }

  _adjustNumber(entity, kind, direction) {
    if (!serviceConnectionReady(this._hass) || !entity) return;
    const state = stateOf(this._hass, entity);
    haptic("heavy");
    if (kind === "hc_climate_card") {
      if (!serviceTargetReady(this._hass, entity)) return;
      const settings = climateSettings(entity, state);
      const data = climateTemperatureChange(settings.attributes, settings.mode, direction);
      if (!data) return;
      return this._callService("climate", "set_temperature", { entity_id: entity, ...data });
    }
    if (["hc_number_card", "hc_wallbox_current_card"].includes(kind)) {
      const value = numberStepValue(state.state, state.attributes || {}, direction);
      if (value == null) return;
      return this._callService(domainOf(entity), "set_value", { entity_id: entity, value });
    }
  }

  _setNumberValue(entity, value) {
    if (!serviceConnectionReady(this._hass) || !entity || !Number.isFinite(value)) return;
    haptic("heavy");
    return this._callService(domainOf(entity), "set_value", { entity_id: entity, value });
  }

  _setClimateMode(entity, mode) {
    if (!serviceConnectionReady(this._hass) || !entity || !serviceTargetReady(this._hass, entity) || !stateOf(this._hass, entity).attributes?.hvac_modes?.includes(mode)) return;
    haptic("heavy");
    return this._callService("climate", "set_hvac_mode", { entity_id: entity, hvac_mode: mode });
  }

  _selectSceneOption(entity, option) {
    const state = stateOf(this._hass, entity);
    const domain = domainOf(entity);
    if (!serviceConnectionReady(this._hass) || !["input_select", "select"].includes(domain)
      || ["unknown", "unavailable"].includes(text(state.state, "unknown"))
      || !Array.isArray(state.attributes?.options) || !state.attributes.options.includes(option)) return;
    haptic("heavy");
    return this._callService(domain, "select_option", { entity_id: entity, option });
  }

  getCardSize() { return 2; }
}

export class MaraoControlGrid extends BaseElement {
  constructor() {
    super(); this.attachShadow?.({ mode: 'open' }); this._request = 0; this._children = []; this._config = { columns: 2, cards: [] };
  }
  setConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config) || !Number.isInteger(config.columns ?? 2)
      || (config.columns ?? 2) < 1 || (config.columns ?? 2) > 6 || !Array.isArray(config.cards)
      || config.cards.some(card => !card || typeof card !== 'object' || Array.isArray(card) || typeof card.type !== 'string'
        || ['custom:marao-navbar-card', 'custom:marao-popup-card'].includes(card.type)
        || card.variables != null && (typeof card.variables !== 'object' || Array.isArray(card.variables)))
      || config.groups != null && (!Array.isArray(config.groups) || config.groups.some((group, index, groups) =>
        !group || !Number.isInteger(group.count) || group.count < 1 || !Number.isInteger(group.columns) || group.columns < 1 || group.columns > 6)
        || config.groups.reduce((count, group) => count + group.count, 0) !== config.cards.length)) {
      throw new Error(localize('grid.invalid', this._hass, {}, 'Use content cards and one to six columns.'));
    }
    this._config = structuredClone({ ...config, columns: config.columns ?? 2 });
    this._ready = this._mount();
  }
  get preview() { return Boolean(this._preview); }
  set preview(value) { this._preview = Boolean(value); this._forward(); }
  set hass(value) { this._hass = value; this._forward(); }
  _forward() { for (const child of this._children) { child.preview = this.preview; child.hass = this._hass; } this._layout(); }
  connectedCallback() { if (globalThis.ResizeObserver && !this._layoutObserver) { this._layoutObserver = new ResizeObserver(() => { this._layoutFrame ||= requestAnimationFrame(() => { this._layoutFrame = 0; this._layout(); }); }); this._layoutObserver.observe(this); } if (this._interrupted) { this._interrupted = false; this._ready = this._mount(); } }
  disconnectedCallback() { this._layoutObserver?.disconnect(); this._layoutObserver = null; if (this._layoutFrame) cancelAnimationFrame(this._layoutFrame); this._layoutFrame = 0; if (this._loading) { this._request++; this._interrupted = true; this._loading = false; } }
  _layout() {
    const grid = this.shadowRoot?.querySelector('.control-grid');
    if (!grid || !globalThis.getComputedStyle) return;
    const config = this._mountedConfig; if (!config) return;
    const groups = config.groups || [{ count: config.cards.length, columns: config.columns }];
    const width = this.getBoundingClientRect().width, font = parseFloat(getComputedStyle(this).fontSize) || 18;
    let groupStart = 0;
    const columns = groups.map(group => {
      const cards = config.cards.slice(groupStart, groupStart += group.count);
      const apps = cards.every(card => card.template === 'hc_media_app_card' || card.type === 'custom:marao-native-media-app-card');
      const minimum = apps ? 80 : Math.max(CONTROL_CELL_MIN, font * CONTROL_CELL_FONT_SCALE);
      const capacity = Math.max(1, Math.floor((width + 8) / (minimum + 8)));
      return Math.min(group.columns, capacity);
    });
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const tracks = columns.reduce((a, b) => a * b / gcd(a, b), 1);
    grid.style.gridTemplateColumns = `repeat(${tracks},minmax(0,1fr))`;
    let index = 0, row = 0;
    const rows = [];
    groups.forEach((group, groupIndex) => {
      const count = columns[groupIndex], span = tracks / count;
      let column = 0;
      for (let n = 0; n < group.count; n++, index++) {
        const child = this._children[index], childConfig = config.cards[index];
        const structural = childConfig.template === 'hc_title_card' || /marao-native-title-card$/.test(childConfig.type);
        if (structural) {
          if (column) { row++; column = 0; }
          rows[row] = 'auto'; child.style.gridColumn = '1 / -1'; child.style.gridRow = String(++row);
          continue;
        }
        rows[row] = 'minmax(0,1fr)';
        child.style.gridColumn = `${1 + column * span} / span ${span}`;
        child.style.gridRow = String(row + 1);
        if (++column === count) { column = 0; row++; }
      }
      if (column) row++;
    });
    grid.style.gridTemplateRows = rows.join(' ');
  }
  async _mount() {
    const request = ++this._request, config = this._config;
    this._loading = true;
    try {
      const children = [];
      if (config.cards.length) {
        const helpers = await globalThis.loadCardHelpers?.();
        if (!helpers?.createCardElement) throw new Error(localize('popup.controls_unavailable', this._hass, {}, 'Controls unavailable'));
        for (const childConfig of config.cards) {
          if (request !== this._request) return;
          const created = helpers.createCardElement(childConfig);
          const child = typeof created?.then === 'function' ? await created : created;
          // HA requests a rebuild when a custom card finishes registering.
          child?.addEventListener('ll-rebuild', event => {
            event.stopPropagation();
            if (request !== this._request) return;
            if (this.isConnected) this._ready = this._mount();
            else this._interrupted = true;
          }, { once: true });
          if (!child || child.localName === 'hui-error-card') throw new Error(localize('popup.controls_unavailable', this._hass, {}, 'Controls unavailable'));
          if (childConfig.template !== 'hc_title_card' && !/marao-native-title-card$/.test(childConfig.type)) child.setAttribute('data-marao-control-cell', ''); child.preview = this.preview; child.hass = this._hass;
          children.push(child);
        }
      }
      if (request !== this._request) return;
      const style = document.createElement('style');
      style.textContent = ':host{display:block;min-width:0;font-size:var(--font-size-primary,1.125rem)}:host([hidden]){display:none}p{overflow-wrap:anywhere}' + controlGridStyles();
      const grid = document.createElement('div'); grid.className = 'control-grid';
      grid.style.setProperty('--marao-control-columns', config.columns); grid.append(...children);
      this.shadowRoot.append(style, grid);
      for (const node of [...this.shadowRoot.childNodes]) if (node !== style && node !== grid) node.remove();
      this._children = children; this._mountedConfig = config; this._forward(); this.hidden = !children.length;
    } catch (error) {
      if (request !== this._request) return;
      this.shadowRoot.querySelector('[role=status]')?.remove();
      const message = document.createElement('p'); message.setAttribute('role', 'status'); message.textContent = error.message;
      this.shadowRoot.append(message); this.hidden = false;
    } finally { if (request === this._request) this._loading = false; }
  }
  getCardSize() { return Math.ceil(this._config.cards.length / this._config.columns) * 4; }
  getGridOptions() { return { columns: 12, rows: 'auto' }; }
}

export class MaraoPopupCard extends BaseElement {
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._hass = null; this._open = false; this._focus = null; this._childrenRenderId = 0; this._backgroundState = []; }
  setConfig(config) { this._config = { height: "auto", max_height: "100%", ...config }; this._renderHost(); this._sync(); if (this._open) this._renderChildren(); }
  get preview() { return Boolean(this._preview || this.nativeOwner?.preview); }
  set preview(value) { this._preview = Boolean(value); if (this._preview) this._close(false); }
  set hass(value) { this._hass = value; this._syncTheme(); this._updateChildrenHass(); this._refreshHistory(); }
  connectedCallback() {
    this._viewPath = window.location.pathname;
    this._viewOwner = null;
    let card;
    for (let node = this; node; node = node.parentElement || node.getRootNode()?.host) {
      if (node.localName === "hui-card") card = node;
      if (["hui-masonry-view", "hui-sections-view"].includes(node.localName)) { this._viewOwner = { view: node, card }; break; }
    }
    window.addEventListener("hashchange", this._sync); window.addEventListener("location-changed", this._sync); window.addEventListener("popstate", this._sync); this._sync();
  }
  disconnectedCallback() {
    // Masonry temporarily detaches retained cards while rebuilding its columns.
    if (this._viewOwner?.view.isConnected && this._viewOwner.view.cards?.includes(this._viewOwner.card)) return;
    if (this._viewOwner?.view.isConnected && this._viewOwner.view.localName === "hui-sections-view") {
      queueMicrotask(() => { if (!this.isConnected) this._disconnectSheet(); });
      return;
    }
    this._disconnectSheet();
  }
  _disconnectSheet() {
    window.removeEventListener("hashchange", this._sync); window.removeEventListener("location-changed", this._sync); window.removeEventListener("popstate", this._sync);
    this._viewOwner = null; this._close(false);
  }
  _invalidateHistory() { this._close(false); this._historyContext = null; }
  openHistory(owner, opener) {
    if (this.preview || !owner.isConnected) return;
    this._historyContext = { owner, opener, id: `${Date.now()}-${++historyEntryId}`, path: window.location.pathname, hash: window.location.hash, source: owner._graphEntity?.() };
    owner._activeHistoryPopup = this;
    this._openSheet(focusRestorer(opener));
    window.history.pushState({ ...window.history.state, maraoHistory: { id: this._historyContext.id } }, '', window.location.href);
    this._showHistory();
  }
  _showHistory() {
    const context = this._historyContext;
    if (!context || this._historyHost || !this._overlay) return;
    const parent = this._overlay.querySelector('.marao-popup-content');
    this._historyScroll = this._overlay.querySelector('.marao-popup-sheet').scrollTop;
    parent.hidden = true; parent.inert = true;
    const host = document.createElement('div'); host.className = 'marao-history-content';
    parent.after(host); this._historyHost = host;
    const back = document.createElement('button'); back.type = 'button'; back.className = 'marao-popup-back';
    back.textContent = localize('history.back', this._hass, {}, 'Back');
    back.style.cssText = 'min-width:48px;min-height:48px;border:0;border-radius:12px;background:var(--secondary-background-color);color:inherit;font:inherit;overflow-wrap:anywhere';
    back.addEventListener('click', () => { haptic('heavy'); window.history.back(); });
    if (!this._transientHistory) this._overlay.querySelector('.marao-popup-head').prepend(back);
    this._historyBack = back;
    this._overlay.querySelector('.marao-popup-sheet').scrollTop = 0;
    this._refreshHistory();
  }
  async _refreshHistory() {
    const context = this._historyContext, host = this._historyHost;
    if (!context || !host) return;
    if (!context.owner.isConnected || context.path !== window.location.pathname || context.source !== context.owner._graphEntity?.()) { this._close(false); return; }
    const options = context.owner._historyOptions();
    if (this._historyChart) { this._historyChart.update(options); return; }
    if (this._historyLoading || this._historyFailed) return;
    this._historyLoading = true;
    host.textContent = localize('timeline.loading', this._hass, {}, 'Loading history…');
    try {
      const module = await loadHistoryChart();
      if (host !== this._historyHost || context !== this._historyContext || !context.owner.isConnected || context.path !== window.location.pathname || context.hash !== window.location.hash || context.source !== context.owner._graphEntity?.()) return;
      host.replaceChildren();
      this._historyChart = module.createHistoryChart(host, context.owner._historyOptions());
    } catch (error) {
      if (host !== this._historyHost || context !== this._historyContext) return;
      this._historyFailed = true;
      const message = document.createElement('p'); message.setAttribute('role', 'alert');
      message.textContent = localize('history.load_error', this._hass, {}, 'History chart could not load');
      const retry = document.createElement('button'); retry.type = 'button'; retry.style.cssText = 'min-width:48px;min-height:48px;font:inherit';
      retry.textContent = localize('common.retry', this._hass, {}, 'Retry');
      retry.onclick = () => { haptic('heavy'); this._historyFailed = false; this._refreshHistory(); };
      host.replaceChildren(message, retry);
    } finally { if (host === this._historyHost) this._historyLoading = false; }
  }
  _hideHistory(restore = true) {
    if (!this._historyHost && !this._historyChart && !this._historyBack) return;
    this._historyChart?.destroy(); this._historyChart = null;
    this._historyHost?.remove(); this._historyHost = null;
    this._historyBack?.remove(); this._historyBack = null;
    this._historyLoading = false; this._historyFailed = false;
    const parent = this._overlay?.querySelector('.marao-popup-content');
    if (parent) { parent.hidden = false; parent.inert = false; }
    if (restore && this._overlay) {
      this._overlay.querySelector('.marao-popup-sheet').scrollTop = this._historyScroll || 0;
      focusRestorer(this._historyContext?.opener)?.();
    }
  }
  _syncTheme() {
    if (!this._overlay || !globalThis.getComputedStyle) return;
    const style = getComputedStyle(this);
    for (let index = 0; index < style.length; index++) {
      const property = style[index];
      if (!property.startsWith("--")) continue;
      if (/^--(?:marao-|app-)?safe-area-/.test(property)) {
        this._overlay.style.removeProperty(property);
        continue;
      }
      this._overlay.style.setProperty(property, style.getPropertyValue(property));
    }
  }
  _renderHost() { if (this.shadowRoot) this.shadowRoot.innerHTML = "<style>:host{display:block;height:0;overflow:visible}</style>"; }
  _sync = () => {
    if (this._historyContext) {
      const context = this._historyContext;
      const current = window.history.state?.maraoHistory?.id === context.id;
      if (current && context.owner.isConnected && context.path === window.location.pathname && context.hash === window.location.hash && context.source === context.owner._graphEntity?.()) { this._openSheet(); this._showHistory(); return; }
      if (this._historyHost) this._hideHistory();
      if (this._transientHistory) { this._close(false); return; }
    }
    if (this.preview) { this._close(false); return; }
    const hash = text(this._config.hash);
    if (window.location.pathname !== this._viewPath || !hash || window.location.hash !== hash) {
      const next = this._open && window.location.pathname === this._viewPath && findElements("marao-popup-card", this._viewOwner?.view.shadowRoot || this._viewOwner?.view).find((popup) => popup !== this && popup.isConnected && popup._config.hash === window.location.hash);
      if (next) next._openSheet(this._focus);
      else this._close(false);
    }
    else if (this.isConnected) this._openSheet();
  };
  _openSheet(returnFocus) {
    if (this._open) return;
    for (const navbar of fullscreenUsers) { navbar._refreshGesture?.cancel(); navbar._closeOverflow?.(true); }
    const previous = findElements("marao-popup-card", this._viewOwner?.view.shadowRoot || this._viewOwner?.view).find((popup) => popup !== this && popup._open);
    this._focus = returnFocus || previous?._focus || focusRestorer(deepActiveElement());
    previous?._close(false, false);
    this._open = true;
    const height = this._config.height === "auto" ? "auto" : text(this._config.height);
    const isClimateModePopup = !this._config.entity_group && this._config.cards?.some((card) => card?.template === "hc_climate_card" && card.variables?.show_mode_buttons);
    const title = isClimateModePopup ? "" : text(this._config.title ?? this._config.name);
    const column = this._viewOwner?.view.shadowRoot?.querySelector("#columns > div:first-child, hui-section, .section");
    const columnWidth = column ? Math.round(column.getBoundingClientRect().width) : 0;
    const maxWidth = columnWidth > 0 ? `${columnWidth}px` : "100%";
    const closeLabel = localize("popup.close", this._hass, {}, "Close popup");
    const overlay = document.createElement("div"); overlay.className = "marao-popup-overlay";
    overlay.innerHTML = `<style>${controlGridStyles(".marao-popup-content.control-grid")}@keyframes marao-popup-slide-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.marao-popup-overlay{position:fixed;inset:0;z-index:1100;display:flex;align-items:flex-end;box-sizing:border-box;padding:max(50px, ${safeArea("top")}) ${safeArea("right")} 0 ${safeArea("left")};background:rgba(0,0,0,.42);font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif)}.marao-popup-sheet{--marao-popup-card-padding:8px;--marao-popup-detail-title-display:${title && this._config.cards?.length === 1 && this._config.cards[0].name === title ? 'none' : 'block'};box-sizing:border-box;width:100%;max-width:${maxWidth};height:${esc(height)};max-height:min(${esc(this._config.max_height)}, 100%);margin:0 auto;overflow:auto;padding:0 8px;border-radius:22px 22px 0 0;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);overscroll-behavior:contain;animation:marao-popup-slide-up .28s cubic-bezier(.2,.8,.2,1) both}.marao-popup-head{display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:0;padding:20px 0 12px;background:inherit;z-index:1}.marao-popup-head h2{min-width:0;margin:0;font-size:var(--font-size-primary,1.25rem);line-height:1.2;overflow-wrap:anywhere}.marao-popup-close{flex:0 0 48px;width:48px;height:48px;padding:0;border:0;border-radius:50%;font-size:1.5rem;background:var(--secondary-background-color);color:inherit;cursor:pointer;transition:transform .12s ease,filter .12s ease}.marao-popup-close:active{transform:scale(.92);filter:brightness(.96)}.marao-popup-close:focus,.marao-popup-sheet:focus{outline:none}.marao-popup-content>p{min-width:0;font-size:var(--font-size-secondary,1rem);font-weight:var(--font-weight-secondary,500);line-height:1.4;overflow-wrap:anywhere}.marao-popup-content[hidden]{display:none}.marao-popup-content{display:grid;min-width:0;gap:8px;isolation:isolate;padding-bottom:max(8px, ${safeArea("bottom")})}@media(max-width:240px){.marao-popup-sheet{padding-left:4px;padding-right:4px}}@media(prefers-reduced-motion:reduce){.marao-popup-sheet{animation:none}.marao-popup-close{transition:none}}</style><section class="marao-popup-sheet" role="dialog" aria-modal="true" aria-label="${esc(title || this._config.name || localize("popup.title", this._hass, {}, "Marao popup"))}" tabindex="-1"><div class="marao-popup-head"><h2>${esc(title)}</h2><button class="marao-popup-close" type="button" aria-label="${esc(closeLabel)}" title="${esc(closeLabel)}">×</button></div><div class="marao-popup-content"></div></section>`;
    overlay.addEventListener("click", (event) => { if (event.target === overlay) this._close(true); });
    overlay.querySelector(".marao-popup-close").addEventListener("click", () => { haptic("heavy"); this._close(true); });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this._close(true);
      else if (event.key === "Tab") this._trapFocus(event);
    });
    // Native HA controls consume context from the application host, including
    // entity icons. Keep popup children inside that provider boundary.
    const root = document.querySelector?.("home-assistant")?.shadowRoot || document.body;
    root.append(overlay);
    this._overlay = overlay;
    this._syncTheme();
    const header = overlay.querySelector('.marao-popup-head');
    const sizeHeader = () => overlay.style.setProperty('--marao-popup-header-height', `${header.getBoundingClientRect().height}px`);
    sizeHeader();
    this._headerObserver = new ResizeObserver(sizeHeader);
    this._headerObserver.observe(header);
    if (this._viewOwner) {
      this._columnObserver = new ResizeObserver(() => {
        const width = this._viewOwner?.view.shadowRoot?.querySelector("#columns > div:first-child, hui-section, .section")?.getBoundingClientRect().width;
        if (width > 0) overlay.querySelector(".marao-popup-sheet").style.maxWidth = `${Math.round(width)}px`;
      });
      this._columnObserver.observe(this._viewOwner.view);
    }
    overlay.querySelector(".marao-popup-close")?.focus();
    this._setBackgroundInert(overlay, root);
    this._renderChildren();
  }
  async _renderChildren() {
    const host = this._overlay?.querySelector(".marao-popup-content"); if (!host) return;
    host.classList?.remove('control-grid');
    host.style?.removeProperty('--marao-control-columns');
    const renderId = ++this._childrenRenderId;
    this._groupHelpers = null; this._groupChildren = new Map(); this._groupEmpty = null;
    host.replaceChildren();
    const loading = document.createElement('p'); loading.setAttribute('role', 'status');
    loading.textContent = localize('common.loading', this._hass, {}, 'Loading…'); host.append(loading);
    let helpers;
    try {
      helpers = await globalThis.loadCardHelpers?.();
      if (!helpers?.createCardElement) throw new Error(localize('popup.controls_unavailable', this._hass, {}, 'Controls unavailable'));
    } catch (error) {
      if (renderId !== this._childrenRenderId || host !== this._overlay?.querySelector('.marao-popup-content')) return;
      const message = document.createElement('p'); message.setAttribute('role', 'status'); message.textContent = error.message; host.replaceChildren(); host.append(message);
      return;
    }
    if (renderId !== this._childrenRenderId || host !== this._overlay?.querySelector(".marao-popup-content")) return;
    host.replaceChildren();
    if (this._config.entity_group) {
      this._groupHelpers = helpers;
      this._reconcileGroupChildren();
      return;
    }
    for (const config of Array.isArray(this._config.cards) ? this._config.cards : []) {
      if (renderId !== this._childrenRenderId) return;
      try { const card = helpers?.createCardElement ? helpers.createCardElement(config) : document.createElement("div"); if (card.setConfig) card.setConfig(config); card.hass = this._hass; host.append(card); } catch (error) { const message = document.createElement("p"); message.textContent = error.message; host.append(message); }
    }
  }
  _updateChildrenHass() {
    if (this._config.entity_group) { this._reconcileGroupChildren(); return; }
    const host = this._overlay?.querySelector(".marao-popup-content");
    for (const card of host?.children || []) card.hass = this._hass;
  }
  _reconcileGroupChildren() {
    const host = this._overlay?.querySelector('.marao-popup-content');
    if (!host || !this._groupHelpers || !this._groupChildren) return;
    const group = this._config.entity_group;
    const activity = entityGroupState(group.entity_type, group.entities, this._hass);
    const eligible = new Set(group.popup_filter === 'active' ? activity.activeEntities : group.entities);
    for (const [id, card] of this._groupChildren) {
      if (eligible.has(id)) continue;
      let active = deepActiveElement();
      while (active && active !== card && !card.contains(active)) active = active.getRootNode()?.host;
      if (active) this._overlay.querySelector('.marao-popup-close')?.focus();
      card.remove(); this._groupChildren.delete(id);
    }
    let index = 0;
    for (const config of this._config.cards || []) {
      if (!eligible.has(config.entity)) continue;
      this._groupEmpty?.remove(); this._groupEmpty = null;
      let card = this._groupChildren.get(config.entity);
      if (!card) {
        try { card = this._groupHelpers.createCardElement(config); if (card.setConfig) card.setConfig(config); }
        catch (error) { card = document.createElement('p'); card.textContent = error.message; }
        this._groupChildren.set(config.entity, card);
      }
      card.setAttribute('data-marao-control-cell', '');
      card.hass = this._hass;
      if (host.children[index] !== card) host.insertBefore(card, host.children[index] || null);
      index++;
    }
    if (!index) {
      this._groupEmpty ||= document.createElement('p');
      this._groupEmpty.setAttribute('role', 'status');
      this._groupEmpty.textContent = !this._hass?.states ? localize('common.loading', this._hass, {}, 'Loading…')
        : !group.entities.length ? localize('group.empty', this._hass, {}, 'No entities configured')
        : localize('group.no_active', this._hass, {}, 'No active entities');
      if (!this._groupEmpty.isConnected) host.append(this._groupEmpty);
    }
    const uniform = index > 0;
    host.classList?.toggle('control-grid', uniform);
    if (uniform) host.style?.setProperty('--marao-control-columns', '1');
  }
  _setBackgroundInert(overlay, root = document.body) {
    const body = document.body;
    if (body?.style) {
      this._backgroundPageState = {
        left: window.scrollX, top: window.scrollY,
        styles: ['position', 'top', 'left', 'width'].map(property => ({ property, value: body.style.getPropertyValue(property), priority: body.style.getPropertyPriority(property) })),
      };
    }
    const outside = root === document.body ? [] : [...document.body.children].filter((element) => element !== root.host);
    this._backgroundState = [...new Set([...root.children, ...outside])]
      .filter((element) => element !== overlay)
      .map((element) => ({ element, inert: Boolean(element.inert) }));
    for (const { element } of this._backgroundState) element.inert = true;
    // Inert blocks controls, but native media gestures can still scroll ancestors.
    const ancestors = new Set([document.scrollingElement]);
    for (let element = this._viewOwner?.view || this; element; element = element.parentElement || element.getRootNode?.()?.host) ancestors.add(element);
    this._backgroundScrollState = [...ancestors]
      .filter(element => element?.style && (element === document.scrollingElement || ['auto', 'scroll', 'overlay'].includes(globalThis.getComputedStyle?.(element)?.overflowY)))
      .map(element => ({ element, value: element.style.getPropertyValue('overflow-y'), priority: element.style.getPropertyPriority('overflow-y') }));
    for (const { element } of this._backgroundScrollState) element.style.setProperty('overflow-y', 'hidden', 'important');
    // Overflow alone does not freeze the document during mobile native scrolling.
    if (this._backgroundPageState) {
      const { left, top } = this._backgroundPageState;
      for (const [property, value] of Object.entries({ position: 'fixed', top: `${-top}px`, left: `${-left}px`, width: '100%' })) body.style.setProperty(property, value, 'important');
    }
  }
  _restoreBackground() {
    for (const { element, inert } of this._backgroundState) element.inert = inert;
    this._backgroundState = [];
    for (const { element, value, priority } of this._backgroundScrollState || []) {
      if (value) element.style.setProperty('overflow-y', value, priority);
      else element.style.removeProperty('overflow-y');
    }
    this._backgroundScrollState = [];
    if (this._backgroundPageState) {
      const { left, top, styles } = this._backgroundPageState;
      this._backgroundPageState = null;
      for (const { property, value, priority } of styles) {
        if (value) document.body.style.setProperty(property, value, priority);
        else document.body.style.removeProperty(property);
      }
      window.scrollTo({ left, top, behavior: 'instant' });
    }
  }
  _trapFocus(event) {
    const focusable = focusableElements(this._overlay);
    if (!focusable.length) {
      event.preventDefault();
      this._overlay?.querySelector(".marao-popup-sheet")?.focus();
      return;
    }
    const active = deepActiveElement();
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && (active === first || !focusable.includes(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !focusable.includes(active))) {
      event.preventDefault();
      first.focus();
    }
  }
  _close(updateHash, restoreFocus = true) {
    if (!this._open) return;
    this._hideHistory(false);
    if (this._historyContext?.owner) this._historyContext.owner._activeHistoryPopup = null;
    if (updateHash || this._historyContext?.path !== window.location.pathname || !this._historyContext?.owner.isConnected) this._historyContext = null;
    if (updateHash && window.history.state?.maraoHistory) {
      const state = { ...window.history.state }; delete state.maraoHistory;
      window.history.replaceState(state, '', window.location.href);
    }
    this._headerObserver?.disconnect(); this._headerObserver = null;
    this._columnObserver?.disconnect(); this._columnObserver = null;
    this._open = false; this._overlay?.remove(); this._overlay = null; this._restoreBackground();
    this._childrenRenderId++; this._groupChildren?.clear(); this._groupHelpers = null; this._groupEmpty = null;
    if (updateHash && window.location.hash === text(this._config.hash)) {
      window.history.replaceState({ ...window.history.state }, "", `${window.location.pathname}${window.location.search}`);
      window.dispatchEvent(new Event("location-changed"));
    }
    if (restoreFocus) this._focus?.();
    this._focus = null;
  }
  getCardSize() { return 0; }
}

export class MaraoPowerHistoryCard extends BaseElement {
  constructor() { super(); this.attachShadow?.({ mode: 'open' }); this._loadId = 0; }
  setConfig(config) {
    if (!/^(sensor|number|input_number)\.[a-z0-9_]+$/.test(config?.entity || '')) throw new Error('Choose a power sensor.');
    const errors = historyData.validatePowerDevices(config, config.entity);
    if (errors.length) throw new Error(errors[0]);
    if (config.display_unit != null && energyUnits[config.display_unit]?.[0] !== 'power') throw new Error('Power devices require power sensors in W or kW.');
    if (config.display_precision != null && (!Number.isInteger(config.display_precision) || config.display_precision < 0 || config.display_precision > 6)) throw new Error('Decimal places must be an integer from 0 to 6.');
    this._config = structuredClone(config); this._failed = false; this._sync();
  }
  set hass(value) {
    this._hass = value;
    const ids = [this._config?.entity, ...(this._config?.power_devices || []).map(item => item.entity_id)];
    const marker = JSON.stringify([value?.connected, value?.connection?.connected, value?.locale, value?.language, value?.config?.time_zone, new Date().toLocaleDateString('en-CA', { timeZone: value?.config?.time_zone || 'UTC' }),
      ids.map(id => value?.states?.[id]), value?.themes]);
    if (marker !== this._marker) { this._marker = marker; this._sync(); }
  }
  get preview() { return Boolean(this._preview); }
  set preview(value) { this._preview = Boolean(value); this._sync(); }
  connectedCallback() { this._sync(); }
  disconnectedCallback() { this._loadId++; this._starting = false; this._failed = false; this._chart?.destroy(); this._chart = null; this.shadowRoot?.replaceChildren(); }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, rows: 'auto' }; }
  _options() {
    return { ...this._config, hass: this._hass,
      convert: (value, source, target) => energyValue(value, source, { display_unit: target }),
      format: formatEnergyNumber, localize: key => localize(key, this._hass, {}, key) };
  }
  async _sync() {
    if (!this._config || !this._hass || this.isConnected === false || !this.shadowRoot) return;
    if (this.preview) { this._chart?.destroy(); this._chart = null; this.shadowRoot.textContent = localize('power.title', this._hass, {}, 'Power history'); return; }
    if (this._chart) { this._chart.update(this._options()); return; }
    if (this._starting || this._failed) return;
    const request = ++this._loadId;
    this._starting = true;
    this.shadowRoot.textContent = localize('timeline.loading', this._hass, {}, 'Loading history…');
    try {
      const module = await loadHistoryChart();
      if (request !== this._loadId || this.isConnected === false || this.preview) return;
      this.shadowRoot.replaceChildren();
      this._chart = module.createPowerHistory(this.shadowRoot, this._options());
    } catch {
      if (request !== this._loadId || this.isConnected === false) return;
      this._failed = true;
      const message = document.createElement('p'); message.setAttribute('role', 'alert'); message.textContent = localize('history.load_error', this._hass, {}, 'History chart could not load');
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = localize('common.retry', this._hass, {}, 'Retry');
      retry.style.cssText = 'min-width:48px;min-height:48px;border:0;border-radius:12px;padding:10px 12px;background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit';
      retry.addEventListener('click', () => { haptic('heavy'); this._failed = false; this._sync(); });
      this.shadowRoot.replaceChildren(message, retry);
    } finally { if (request === this._loadId) this._starting = false; }
  }
}

export function registerMaraoCards() {
  for (const [name, klass] of [["marao-card", MaraoCard], ["marao-power-history-card", MaraoPowerHistoryCard], ["marao-control-grid", MaraoControlGrid], ["marao-navbar-card", MaraoNavbarCard], ["marao-popup-card", MaraoPopupCard]]) {
    if (globalThis.customElements && !globalThis.customElements.get(name)) globalThis.customElements.define(name, klass);
  }
  if (globalThis.window) {
    window.customCards = window.customCards || [];
    for (const card of [
      ["marao-card", "Marão Card", "Marao Dashboard card variants"],
      ["marao-navbar-card", "Marão Navbar", "Floating Marao navigation"],
      ["marao-popup-card", "Marão Popup", "Bottom-sheet Marao popup"],
    ]) if (!window.customCards.some((item) => item.type === card[0])) window.customCards.push({ type: card[0], name: card[1], description: card[2] });
  }
}

registerMaraoCards();
