const {validatePopupContent}=await import(new URL(`./MaraoPopupContent.js${new URL(import.meta.url).search}`,import.meta.url));
const {weatherMarkup,styleWeatherPopup}=await import(new URL(`./MaraoWeather.js${new URL(import.meta.url).search}`,import.meta.url));
const {climateConfigError,climateHumidity}=await import(new URL(`./MaraoClimate.js${new URL(import.meta.url).search}`,import.meta.url));
const {activityTimestamp,activitySources,hasActivity}=await import(new URL(`./MaraoActivityModel.js${new URL(import.meta.url).search}`,import.meta.url));
const popupLayouts=await import(new URL(`./MaraoPopupView.js${new URL(import.meta.url).search}`,import.meta.url));
const {popupViewError,popupGroupFromView}=await import(new URL(`./MaraoPopupLayout.js${new URL(import.meta.url).search}`,import.meta.url));
const {peopleError,peopleRows,collectionLabel,escapeText,sectionsError} = await import(new URL(`./MaraoCollections.js${new URL(import.meta.url).search}`,import.meta.url));
const {reconcileGroup}=await import(new URL(`./MaraoGroupDetails.js${new URL(import.meta.url).search}`,import.meta.url));
const {mediaAppBrand,mediaAppLogoError}=await import(new URL(`./MaraoMediaApps.js${new URL(import.meta.url).search}`,import.meta.url));
export {mediaAppBrand};
const [dropdownModule, historyLayout, navigationModule, historyData, sliderModule, lightCapabilities, names, sensorThresholds, pressModule, nativeContext] = await Promise.all([
  'MaraoDropdown.js', 'MaraoHistoryLayout.js', 'MaraoNavigation.js', 'MaraoHistoryData.js', 'MaraoSlider.js', 'MaraoLightCapabilities.js', 'MaraoNames.js', 'MaraoSensorThresholds.js', 'MaraoPressFeedback.js', 'MaraoNativeContext.js',
].map(file => import(new URL(`./${file}${new URL(import.meta.url).search}`, import.meta.url))));
const {nativeEditing, bindNativeEditing} = nativeContext;
export {nativeEditing, bindNativeEditing};
const { bindDropdown, dropdownStyles } = dropdownModule;
const {bindPressFeedback,pressStyles,pressTarget} = pressModule;
const { bindSlider, sliderMarkup, sliderStyles } = sliderModule;
const { lightColorCapabilities, lightColorAppearance, colorForeground } = lightCapabilities;
export { lightColorCapabilities };
const { sensorThresholdError, sensorThresholdColor } = sensorThresholds;
const { canonicalCard, canonicalTemplate } = names;
const { createHistoryPlaceholder, createPowerToolbar, readableGraphColor } = historyLayout;
export { createHistoryPlaceholder };
const { MaraoNavbarCard, safeArea, navbarBottomGap, navbarRouteCurrent, navbarPartition, haptic, navigate, fullscreenUsers, findElements, focusRestorer, focusableElements, deepActiveElement, FOCUSABLE, beginFrontendInteraction } = navigationModule;
export { MaraoNavbarCard, safeArea, navbarRouteCurrent, navbarPartition, haptic, focusRestorer };
let historyChartModule;
let historyChartAttempt = 0;
let historyEntryId = 0;
let lightColorModule;
let lightColorAttempt = 0;
export function loadLightColorPicker() {
  const url = new URL(`./MaraoLightColor.js${new URL(import.meta.url).search}`, import.meta.url);
  if (lightColorAttempt) url.searchParams.set('marao_retry', String(lightColorAttempt));
  return lightColorModule ||= import(url.href).catch(error => { lightColorModule = null; lightColorAttempt++; throw error; });
}
let activityModule, activityAttempt=0;
function loadActivitySheet() {
  const url=new URL(`./MaraoActivity.js${new URL(import.meta.url).search}`,import.meta.url);
  if(activityAttempt)url.searchParams.set('marao_retry',String(activityAttempt));
  return activityModule ||= import(url.href).catch(error=>{activityModule=null;activityAttempt++;throw error;});
}
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
export const LIGHT_COLOR_HOLD_MS = 600;

export function accessOpenerService(entity, configured) {
  const native = { lock: "lock.unlock", cover: "cover.open_cover", button: "button.press", switch: "switch.turn_on", script: "script.turn_on" }[domainOf(entity)];
  return native && (!configured || configured === native) ? native : "";
}

export function accessCardConfig(config, hass) {
  config = canonicalCard(config);
  const roles = { popup: "md_access_card", slide: "md_access_slide_action_card", close: "md_access_action_card", hold: "md_access_hold_action_card" };
  if (!Object.values(roles).includes(config.template)) return config;
  let mode = config.variables?.access_mode ?? "auto";
  const domain = domainOf(config.entity);
  if (mode === "auto") {
    if(!Object.hasOwn(config.variables||{},'access_mode')&&config.template==='md_access_hold_action_card'&&domain==='lock'&&(config.variables?.action_service||config.tap_action?.service||config.tap_action?.perform_action)==='lock.unlock')return config;
    if(config.template==='md_access_hold_action_card'&&domain==='lock')mode='hold';
    else {if (config.template !== "md_access_card" || ["lock", "cover"].includes(domain)) return config;
    mode = domain === "script" ? "slide" : "hold";}
  }
  const domains = { popup: ["lock", "cover"], slide: ["lock", "cover", "button", "switch", "script"], close: ["lock", "cover"], hold: ["button", "switch", "input_boolean", "alarm_control_panel", "lock"] };
  if (!Object.hasOwn(domains, mode) || !domains[mode].includes(domain)) throw new Error(localize("access.invalid_behavior", hass, {}, "Access behavior is incompatible with the selected entity."));
  const variables = { ...config.variables };
  if (mode === "slide") {
    if (!accessOpenerService(config.entity, variables.action_service)) throw new Error(localize("access.native_service", hass, {}, "Access opener must use its selected entity's native opening service"));
    if (["tap_action", "hold_action", "double_tap_action"].some(key => config[key] && config[key].action !== "none")) throw new Error(localize("access.strict_slide", hass, {}, "Access openers use only the strict slide"));
  }
  let tap_action = config.tap_action;
  if(mode==='hold'&&domain==='lock') {
    const action=config.tap_action,service=action?.service||action?.perform_action;
    const unsafeAction=action&&action.action!=='none'&&(!['call-service','perform-action'].includes(action.action)||service!=='lock.lock'||(action.target?.entity_id||action.entity_id)!==config.entity||action.entity_id&&action.entity_id!==config.entity||action.target&&Object.keys(action.target).some(key=>key!=='entity_id')||Object.keys(action.data||action.service_data||{}).length);
    if(variables.action_service&&variables.action_service!=='lock.lock'||unsafeAction||['hold_action','double_tap_action'].some(key=>config[key]&&config[key].action!=='none'))throw new Error(localize('access.slide_required',hass,{},'Use the access slide to open or unlock.'));
    variables.action_service='lock.lock';
  }
  if (mode === "close") {
    const service = domain === "lock" ? "lock.lock" : "cover.close_cover";
    if (variables.action_service && variables.action_service !== service) throw new Error(localize("access.slide_required", hass, {}, "Use the access slide to open or unlock."));
    variables.action_service = service;
    variables.action_label_key ??= domain === "lock" ? "common.lock" : "common.close";
  }
  if (mode === "hold" && !tap_action && !variables.action_service) tap_action = domain === "button"
    ? { action: "perform-action", perform_action: "button.press", target: { entity_id: config.entity } }
    : { action: "toggle" };
  return { ...config, template: roles[mode], variables, ...(tap_action ? { tap_action } : {}) };
}

const alarmModes = [
  ["home", 1], ["away", 2], ["night", 4], ["custom_bypass", 16], ["vacation", 32],
];

const alarmModeIcons = {home:'mdi:shield-home',away:'mdi:shield-lock',night:'mdi:shield-moon',custom_bypass:'mdi:shield-key',vacation:'mdi:shield-airplane',disarm:'mdi:shield-off'};

export function alarmActions(state) {
  const actions = alarmModes.filter(([, feature]) => Number(state?.attributes?.supported_features) & feature)
    .map(([mode]) => ({ service: `alarm_arm_${mode}`, mode, hold: mode === "custom_bypass" }));
  return [...actions, { service: "alarm_disarm", mode: "disarm", hold: true }];
}

export function alarmCodeRequired(state, service) {
  return Boolean(state?.attributes?.code_format)
    && (service === "alarm_disarm" || state.attributes.code_arm_required !== false);
}

export function dishwasherProgramIcon(state) {
  const program = text(state?.state).normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '');
  const match = [[/machinecare|selfclean|maintenance/, 'mdi:dishwasher-alert'], [/(?:^|[._\s])eco|econom/, 'mdi:leaf'], [/auto|sensor/, 'mdi:autorenew'], [/intens|heavy|pots/, 'mdi:pot-steam'], [/glass|delicat|gentle/, 'mdi:glass-wine'], [/quick|express|speed|rapid|short/, 'mdi:timer-fast-outline'], [/silenc|quiet|night/, 'mdi:volume-off'], [/rinse|prewash/, 'mdi:water'], [/hygien|saniti/, 'mdi:shield-check']].find(([pattern]) => pattern.test(program));
  return match?.[1] || state?.attributes?.icon || 'mdi:dishwasher';
}

function dishwasherReadings(variables, hass, operation) {
  // Cycle sensors may be absent or retain their previous cycle while idle.
  if (!['run', 'running', 'pause', 'paused', 'delayedstart', 'delayed'].includes(text(operation).toLowerCase().replace(/[ _-]/g, ''))) return '';
  const pt = String(hass?.language || hass?.locale?.language).startsWith('pt');
  const fields = [['progress_entity','Progress','Progresso'],['remaining_time_entity','Remaining','Tempo restante'],['active_program_entity','Program','Programa']];
  return fields.filter(([key]) => variables[key]).map(([key,en,ptLabel]) => {
    const entity = variables[key], state = stateOf(hass, entity);
    const unavailable = !hass?.states || hass?.connected === false || hass?.connection?.connected === false || !serviceTargetReady(hass, entity);
    const label = localize(`dishwasher.${key.replace('_entity','')}`, hass, {}, pt ? ptLabel : en);
    const raw = text(state.state), percent = raw && Number(raw);
    const progress = key === 'progress_entity';
    const valid = !unavailable && (!progress || raw !== '' && Number.isFinite(percent) && percent >= 0 && percent <= 100);
    const value = valid ? progress ? `${formatEnergyNumber(percent, undefined, hass)} %` : entityStateLabel(state, entity, 'md_sensor_card', hass) : '—';
    const icon = key === 'active_program_entity' && valid ? dishwasherProgramIcon(state) : 'mdi:timer-sand';
    const ring = progress ? `<svg class="dishwasher-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="44"></circle><circle class="ring-value" cx="50" cy="50" r="44" pathLength="100" stroke-dasharray="${valid ? percent : 0} 100"></circle></svg>` : `<ha-icon icon="${esc(icon)}" aria-hidden="true"></ha-icon>`;
    return `<div class="dishwasher-stat${valid ? '' : ' neutral'}${variables.show_reading_names===false?' no-label':''}"><dt>${esc(label)}</dt><dd><span class="dishwasher-indicator"${progress && valid ? ` role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"` : ""}>${ring}<span class="dishwasher-stat-value">${esc(value)}</span></span></dd></div>`;
  }).join('');
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
  if (config.template === 'md_camera_card' && action?.action === 'fullscreen') return localize('camera.fullscreen', hass, {}, 'Open full screen');
  const actionLabelKey = text(config?.variables?.action_label_key).trim();
  if (actionLabelKey) {
    const fallback = text(config?.variables?.action_label || config?.name || actionLabelKey).trim();
    return localize(actionLabelKey, hass, {}, fallback);
  }
  const configured = text(config?.name).trim();
  if (configured) return configured;
  if (config.template === "md_media_app_card" && config.variables?.app_source) return text(config.variables.app_source);
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
  variables ||= {};
  const availableModes = Array.isArray(modes) ? modes.filter(Boolean).map(text) : [];
  if (availableModes.length > 1 && variables.enable_popup !== false && variables.mode_selector_hash) {
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
  if (value == null || value === "—") { value = "—"; disabled = true; }
  const disabledAttribute = disabled ? " disabled" : "";
  const increase = localize("controls.increase", hass, { name: label }, `Increase ${label}`);
  const decrease = localize("controls.decrease", hass, { name: label }, `Decrease ${label}`);
  const rangeAttribute = className === "climate-stepper" && String(value).includes("–") ? " data-number-range" : "";
  const wallbox = className === "wallbox-stepper";
  const numberCard = className === "number-card-stepper", detached = wallbox || numberCard;
  const reading = `<output class="number-value${wallbox ? ' wallbox-value' : numberCard ? ' number-card-value' : ''}"${rangeAttribute} aria-live="polite">${esc(value)}${detached && unit ? `<small> ${esc(unit)}</small>` : esc(unit)}</output>`;
  const control = `<div class="number-stepper${className ? ` ${numberCard ? "climate-stepper " : ""}${esc(className)}` : ""}" role="group" aria-label="${esc(label)}"><button type="button" data-number-step="increase" aria-label="${esc(increase)}" title="${esc(increase)}"${disabledAttribute}><ha-icon icon="mdi:chevron-up"></ha-icon></button>${detached ? '' : reading}<button type="button" data-number-step="decrease" aria-label="${esc(decrease)}" title="${esc(decrease)}"${disabledAttribute}><ha-icon icon="mdi:chevron-down"></ha-icon></button></div>`;
  return detached ? reading + control : control;
}

export function climateModeLabel(value, hass = null) {
  const label = text(value).replace(/_/g, " ");
  const fallback = label ? label[0].toUpperCase() + label.slice(1) : "";
  if (["unknown", "unavailable"].includes(text(value))) return localize(`common.${value}`, hass, {}, fallback);
  return localize(`climate.mode.${value}`, hass, {}, fallback);
}

function presentationDomain(kind, entity) {
  return ({ md_weather_card: "weather", md_security_card: "alarm_control_panel", md_vacuum_card: "vacuum", md_camera_card: "camera", md_media_card: "media_player", person: "person" })[kind] || domainOf(entity);
}

function presentationState(state, entity, kind) {
  const domain = presentationDomain(kind, entity);
  return { ...state, entity_id: `${domain}.${text(entity).split('.').slice(1).join('.') || 'marao'}`, attributes: state.attributes || {} };
}

export function binaryState(entity, state, kind = "md_base_card") {
  if (["md_access_action_card", "md_access_hold_action_card", "md_access_slide_action_card"].includes(kind)) return null;
  if (["md_title_card", "md_cover_card", "md_climate_card", "md_media_card", "md_media_app_card", "md_camera_card", "md_security_card", "md_weather_card", "md_vacuum_card", "md_dishwasher_card", "md_scene_card", "md_number_card", "md_wallbox_current_card", "md_battery_card"].includes(kind)) return null;
  const value = text(state?.state);
  const domain = domainOf(entity);
  if (domain === "lock" && ["locked", "unlocked"].includes(value)) return value === "unlocked";
  if (kind === "md_washing_machine_card" && ["running", "idle"].includes(value)) return value === "running";
  return ["light", "fan", "switch", "input_boolean", "binary_sensor"].includes(domain) && ["on", "off"].includes(value) ? value === "on" : null;
}

export function entityStateLabel(state, entity, kind, hass) {
  if (activityTimestamp(entity, state)) return '';
  const value = text(state?.state, hass?.states ? "unknown" : "loading");
  if (["loading", "unknown", "unavailable"].includes(value)) return localize(`common.${value}`, hass, {}, value === "loading" ? "Loading…" : value);
  if (kind === 'md_battery_card' && batteryReading(value) === null) return localize('common.unavailable', hass, {}, 'Unavailable');
  if (kind === "md_climate_card") return climateModeLabel(value, hass);
  if (kind === "md_dishwasher_card") {
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

function readingMarkup(entity, name, icon, hass, kind = "md_sensor_card", showIcon = true, showName = true) {
  const state = stateOf(hass, entity);
  const label = name || state.attributes?.friendly_name || entity;
  const disconnected = hass?.connected === false || hass?.connection?.connected === false;
  const unavailable = disconnected || !hass?.states || ["unknown", "unavailable"].includes(text(state.state, "unknown"));
  const symbol = icon ? `<ha-icon icon="${esc(icon)}" aria-hidden="true"></ha-icon>` : `<ha-state-icon data-reading-entity="${esc(entity)}" aria-hidden="true"></ha-state-icon>`;
  const activity = activityTimestamp(entity,state);
  const control = !showIcon ? '' : activity ? `<button type="button" class="reading-activity" data-activity-open="${esc(entity)}" aria-label="${esc(localize('activity.title',hass,{},'Activity'))}: ${esc(label)}"${unavailable?' disabled':''}>${symbol}</button>` : symbol;
  return `<div class="reading${unavailable ? ' neutral' : ''}${showName ? '' : ' reading-name-hidden'}">${control}<dt${showName ? '' : ' class="binary-state"'}>${esc(label)}</dt><dd>${esc(disconnected ? localize("common.disconnected",hass,{},"Disconnected") : entityStateLabel(state, entity, kind, hass))}</dd></div>`;
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
    fan: 'mdi:fan', drying:'mdi:water-percent', preheating:'mdi:radiator', defrosting:'mdi:snowflake-melt', idle:'mdi:thermostat',
  }[text(value).toLowerCase()] || "mdi:thermostat";
}

export function roomClimate(config, hass) {
  const entity = config.variables?.climate_entity;
  const state = hass?.states?.[entity];
  const mode = state?.state;
  const available = Boolean(state && !['unknown','unavailable'].includes(mode));
  const enabled = available && mode !== 'off';
  const activity = enabled ? state.attributes?.hvac_action || mode : 'off';
  const appearance = enabled ? stateAppearance('md_climate_card', activity === 'idle' ? mode : activity, {entity}, hass) : {};
  const nativeOff = Number(state?.attributes?.supported_features) & 128;
  const offMode = state?.attributes?.hvac_modes?.includes('off');
  return {entity, state, mode, activity, available, enabled, color: appearance.background,
    icon: climateModeIcon(activity),
    service: nativeOff ? 'climate.turn_off' : offMode ? 'climate.set_hvac_mode' : null};
}
export function roomColors(config, hass) {
  const lighting = roomLightEntities(config).some(id => hass?.states?.[id]?.state === 'on') ? 'var(--room-card-active-background,var(--primary-color))' : null;
  const climate = roomClimate(config, hass).color;
  const neutral = 'var(--ha-card-background,var(--card-background-color))';
  const lightCorner = lighting && climate ? `color-mix(in srgb,${lighting} 25%,var(--color-blue))` : lighting;
  return [lightCorner || climate || neutral, climate || lighting || neutral];
}
for (const name of ['--marao-room-light','--marao-room-climate']) {
  try { globalThis.CSS?.registerProperty?.({name, syntax:'<color>', inherits:false, initialValue:'#ffffff'}); } catch {}
}

// Keep the state palette local to Marao so cards do not need Button Card's
// state-style evaluator. Values intentionally use theme variables, allowing
// light/dark themes to provide the actual colors.
export function stateAppearance(kind, state, config, hass) {
  const variables = config?.variables || {};
  const value = text(state).toLowerCase();
  if (kind === 'md_light_card' && value === 'on' && variables.use_light_color === true
    && hass?.connected !== false && hass?.connection?.connected !== false) {
    const appearance = lightColorAppearance(stateOf(hass, config.entity));
    if (appearance) return appearance;
  }
  const active = variables.active_color || variables.card_color || variables.md_card_color;
  const green = "var(--color-green)";
  const red = "var(--color-red)";
  const orange = "var(--color-orange)";
  const blue = "var(--color-blue)";
  const teal = "var(--color-teal,var(--color-blue))";
  const gold = "var(--color-gold)";
  const domain = variables.entity_type || domainOf(config?.entity);
  const domainBackground = { light: gold, fan: teal, cover: blue, climate: orange }[domain];
  let accent = active;
  let background;
  let foreground;

  if (kind === "md_battery_card") {
    const percentage = batteryReading(state);
    background = percentage !== null ? active || (percentage >= 80 ? green : percentage >= 20 ? "var(--color-yellow)" : red) : undefined;
  } else if (["md_access_action_card", "md_access_hold_action_card", "md_access_slide_action_card"].includes(kind)) {
    if (!["unknown", "unavailable"].includes(value)) {
      background = variables.action_color;
      accent = variables.action_color || active;
    }
  } else if (kind === "md_access_card") {
    if (["closed", "locked"].includes(value)) background = green;
    else if (["open", "unlocked"].includes(value)) background = red;
    else if (["opening", "closing"].includes(value)) background = orange;
  } else if (kind === "md_security_card" || kind === "md_navigation_card") {
    if (["armed_home", "disarmed"].includes(value)) background = value === "armed_home" ? green : undefined;
    else if (value === "armed_away" || value === "triggered") background = red;
    else if (value === "arming") background = orange;
  } else if (kind === "md_sensor_card") {
    const thresholdColor = sensorThresholdColor(variables, config.entity, state);
    if (thresholdColor) {
      const rgb = thresholdColor.slice(1).match(/../g).map(value => parseInt(value, 16));
      const text = colorForeground(rgb);
      return { background:thresholdColor, text, stateText:text, icon:text, accent:thresholdColor, unavailable:false };
    }
    if (value === "on") background = active || "var(--primary-color)";
    else if (value === "closed" || value === "locked") background = green;
    else if (value === "open") background = red;
    else if (value === "unlocked") background = "var(--color-yellow)";
  } else if (kind === "md_cover_card") {
    accent = active || blue;
    if (["open", "opening", "closing"].includes(value)) background = active || blue;
  } else if (["md_light_card", "md_fan_card"].includes(kind)) {
    accent = active || (kind === "md_light_card" ? gold : teal);
    if (value === "on" || kind === "md_fan_card" && ["open", "opening", "closing"].includes(value)) background = accent;
  } else if (kind === "md_switch_card") {
    accent = active || "var(--color-green)";
    if (value === "on") background = active || "var(--color-green)";
  } else if (kind === "md_climate_card") {
    const colors = {
      heat: orange,
      heating: orange, preheating:orange, defrosting:orange,
      cool: blue,
      cooling: blue,
      cold: blue,
      heat_cool: "var(--color-lilac,var(--color-blue))",
      auto: "var(--color-gold)",
      dry: "var(--color-yellow)",
      drying: "var(--color-yellow)",
      fan_only: teal,
      fan: teal,
    };
    if (!["off", "unavailable", "unknown"].includes(value)) background = colors[value] || "var(--primary-color)";
    accent = background || active;
  } else if (kind === "md_number_card") {
    accent = active || "var(--primary-color)";
  } else if (kind === "md_media_card" && !["off", "unknown", "unavailable"].includes(value)) {
    background = variables.md_background_color || "var(--color-purple)";
  } else if (kind === "md_media_app_card") {
    const app = mediaAppBrand(config);
    background = active || app?.color;
    foreground = active ? undefined : app?.text;
  } else if (kind === "md_vacuum_card") {
    background = { docked: green, cleaning: teal, returning: orange, error: red }[value];
  } else if (kind === "md_wallbox_current_card") {
    accent = active || "var(--primary-color)";
    if (!["unknown", "unavailable"].includes(value)) {
      background = active || "var(--ha-card-background,var(--card-background-color))";
      foreground = active ? "var(--active-text-color, #fff)" : "var(--primary-text-color)";
    }
  } else if (kind === "md_room_card") {
    if (value === "on") background = "var(--room-card-active-background,var(--primary-color))";
  } else if (kind === "md_toggle_graph_card") {
    if (stateOf(hass, text(variables.toggle_entity)).state === "on") background = active || "var(--primary-color)";
  }

  const unavailable = ["unavailable", "unknown"].includes(value) || kind === 'md_battery_card' && value !== 'loading' && batteryReading(value) === null;
  if (unavailable) return { unavailable: true };
  const binary = binaryState(Array.isArray(variables.summary_entities) && variables.summary_entities.length ? "binary_sensor.marao_summary" : config?.entity, { state: value }, kind);
  if (binary === false && ["md_access_action_card", "md_access_hold_action_card", "md_access_slide_action_card"].includes(kind)) background = undefined;
  if (binary && !background) background = active || domainBackground || blue;
  if (kind === "md_navigation_card") {
    background = binary === false ? undefined : variables.md_color || background;
  }
  if (kind === "md_toggle_graph_card") {
    const enabled = stateOf(hass, text(variables.toggle_entity)).state === "on";
    const content = enabled ? variables.active_content_color : variables.inactive_name_color;
    const defaultContent = enabled ? (/^var\(\s*--color-(?:blue|yellow|orange|gold|peach|teal|lilac)\s*[,)]/.test(background) ? "var(--color-black)" : "var(--text-primary-color,var(--active-text-color))") : undefined;
    return { unavailable, background: background || variables.inactive_background, accent,
      text: content || defaultContent, stateText: enabled ? content || defaultContent : variables.inactive_state_color,
      icon: enabled ? content || defaultContent : variables.inactive_icon_color,
      iconBackground: enabled ? variables.active_icon_background || "var(--active-overlay-color)" : variables.inactive_icon_background };
  }
  if (!background) return { unavailable, accent };
  const primaryBackground = /^var\(\s*--(?:primary-color|room-card-active-background)\s*[,)]/.test(background);
  foreground = primaryBackground ? "var(--text-primary-color,var(--active-text-color))" : /^var\(\s*--color-(?:blue|yellow|orange|gold|peach|teal|lilac)\s*[,)]/.test(background)
    ? "var(--color-black)" : foreground || "var(--active-text-color)";
  const iconBackground = primaryBackground || foreground === "var(--color-black)" ? "var(--active-overlay-color)" : undefined;
  return { background, text: foreground, icon: kind === "md_navigation_card" ? variables.md_icon_color || foreground : foreground, ...(iconBackground ? { iconBackground } : {}), accent, unavailable };
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

export function isAccessCover(entity, state = {}) {
  return domainOf(entity) === 'cover' && (['door', 'garage', 'gate'].includes(text(state.attributes?.device_class || state.device_class).toLowerCase())
    || /door|garage|gate/.test(`${entity} ${state.attributes?.friendly_name || state.name || ''}`.toLowerCase()));
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
    if (!isAccessCover(entity, state)) return false;
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
  const kind = text(config.template, "md_base_card");
  const variables = config.variables || {};
  const entity = text(config.entity);
  const summaries = Array.isArray(variables.summary_entities) ? variables.summary_entities : [];
  const summary = kind === 'md_entity_group_card' || kind === 'md_room_card' || summaries.length > 0;
  const readings = kind === "md_glance_card" ? Array.from({ length: 3 }, (_, index) => variables[`entity${index + 1}`]).filter(Boolean) : [];
  const roomMembers = kind === "md_room_card" ? roomLightEntities(config) : [];
  const content = kind === "md_room_card" ? [...roomMembers, variables.climate_entity].filter(Boolean) : [...new Set(summaries.length ? summaries : [entity, ...readings].filter(Boolean))];
  const disconnected = hass?.connected === false || hass?.connection?.connected === false;
  if (!content.length && !error && !contentError) return null;
  if (!hass?.states) return { kind: "loading", reason: localize("common.loading", hass, {}, "Loading…") };
  const failed = entities => entities.filter(id => !hass.states[id] || ["unknown", "unavailable"].includes(text(hass.states[id].state, "unknown")));
  const failedContent = kind === 'md_entity_group_card' ? entityGroupState(variables.entity_type, summaries, hass).unavailableEntities
    : kind === 'md_battery_card' && batteryReading(hass.states[entity]?.state) === null ? [entity] : failed(content);
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
  const fault = kind !== "md_room_card" && (domainOf(entity) === "lock" && value === "jammed"
    || (domainOf(entity) === "vacuum" || kind === "md_vacuum_card") && value === "error"
    || kind === "md_dishwasher_card" && ["error", "actionrequired", "attention"].includes(value)
    || kind === "md_washing_machine_card" && value === "error"
    || (domainOf(entity) === "alarm_control_panel" || kind === "md_security_card") && value === "triggered");
  for (const [key, label] of kind === "md_dishwasher_card" ? [["salt_entity", "salt"], ["rinse_aid_entity", "rinse_aid"]] : []) {
    if (variables[key] && dishwasherWarning(hass.states[variables[key]])) {
      details.push(localize(`dishwasher.${label}`, hass, {}, label.replaceAll("_", " ")));
      severity ||= "warning";
    }
  }
  if (fault) details.push(entityStateLabel(hass.states[entity], entity, kind, hass));
  if (error || contentError || fault) severity = "error";
  const targets = [kind === "md_toggle_graph_card" ? variables.toggle_entity : null,
    ...roomMembers];
  if (kind === "md_switch_card") targets.push(variables.power_entity);
  if (kind === "md_header_card") targets.push(variables.person_entity, variables.air_quality_sensor);
  if (kind === "md_dishwasher_card") targets.push(...["salt_entity", "rinse_aid_entity"].map(key => variables[key]));
  if (variables.graph_entity && (["md_graph_card", "md_toggle_graph_card"].includes(kind) || variables.show_graph === true)) targets.push(variables.graph_entity);
  for (const action of [config.tap_action, config.hold_action]) {
    if (!isServiceAction(action)) continue;
    const target = action.target?.entity_id || action.data?.entity_id || action.entity_id || (action.target?.area_id || action.target?.device_id ? null : entity);
    targets.push(...(Array.isArray(target) ? target : [target]));
  }
  const partial = [...new Set([...failedContent, ...failed(targets.filter(Boolean))])];
  if (partial.length && (!summary || kind === 'md_room_card')) {
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

export function problemStyle(problem, appearance = null, surface = true) {
  if (!problem || problem.kind === "loading") return "";
  const background = appearance?.background || `var(--marao-problem-${problem.kind}-background,var(--secondary-background-color))`;
  const color = appearance?.text || `var(--marao-problem-${problem.kind}-text,var(--primary-text-color))`;
  return `${surface ? `background:${background};` : ""}color:${color};--marao-card-background:${background};--marao-card-text-color:${color};--marao-state-color:${color};--marao-icon-color:${color};--marao-icon-background:transparent;--marao-accent-color:${color};--primary-text-color:${color};--secondary-text-color:${color};--subtext-color:${color};--error-color:${color};opacity:1`;
}

// Only presentation metadata survives loss of availability; readings never do.
export function layoutState(owner, state = {}) {
  const keys = ['friendly_name', 'icon', 'unit_of_measurement', 'device_class', 'supported_features', 'supported_color_modes', 'min_color_temp_kelvin', 'max_color_temp_kelvin', 'hvac_modes', 'code_format', 'code_arm_required', 'options'];
  if (state.state && !['unknown', 'unavailable'].includes(state.state)) owner._layoutMetadata = {};
  owner._layoutMetadata ||= {};
  for (const key of keys) if (state.attributes?.[key] != null) owner._layoutMetadata[key] = state.attributes[key];
  if (Object.keys(owner._layoutMetadata).every(key => state.attributes?.[key] === owner._layoutMetadata[key])) return state;
  return { ...state, attributes: { ...owner._layoutMetadata, ...state.attributes } };
}

export function problemLabel(problem, hass) {
  return problem?.complete || problem?.kind === 'loading' || ['common.unavailable','common.unknown','common.missing'].some(key => problem?.reason === localize(key, hass, {}, { 'common.unavailable':'Unavailable', 'common.unknown':'Unknown', 'common.missing':'Entity missing' }[key])) ? problem.reason
    : localize(problem?.kind === 'warning' ? 'common.attention' : 'common.error', hass, {}, problem?.kind === 'warning' ? 'Attention needed' : 'Error');
}

export function showCardDetails(owner, message, opener) {
  if (!message || owner.preview || owner.isConnected === false) return;
  haptic('heavy');
  owner._detailsPopup?._close(false);
  const popup = new MaraoPopupCard();
  popup.nativeOwner = owner;
  popup._config = { height:'auto', max_height:'100%', title: owner._config?.name || localize('common.details', owner._hass, {}, 'Details'), cards: [] };
  popup._message = message;
  popup.hass = owner._hass;
  popup._openSheet(focusRestorer(opener));
  owner._detailsPopup = popup;
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
  const kind = native ? 'md_' + native[1].replaceAll('-', '_') + '_card' : config.template;
  if (['md_light_card', 'md_fan_card', 'md_cover_card', 'md_access_card', 'md_access_slide_action_card'].includes(kind)) return true;
  const service = config.variables?.action_service || config.action_service || config.tap_action?.service || config.tap_action?.perform_action;
  if (kind?.startsWith('md_access_') && ['lock.unlock', 'cover.open_cover'].includes(service)) return true;
  if (kind === 'md_access_action_card') return ['lock.lock', 'lock.unlock', 'cover.close_cover', 'cover.open_cover'].includes(service);
  return kind === 'md_access_hold_action_card' && ['lock', 'cover'].includes(domainOf(config.entity));
}

// Structural hosts never establish a content section's height.
export function ownedContent(config = {}) {
  if (config.type === 'custom:marao-card') return Boolean(config.template) && !['md_title_card', 'md_navbar_card', 'md_popup_card'].includes(config.template);
  return /^custom:marao-native-/.test(config.type || '') && !/-(title|navbar|popup)-card$/.test(config.type)
    || ['custom:marao-timeline-card', 'custom:marao-energy-period-card', 'custom:marao-frigate-events-card', 'custom:marao-power-history-card', 'custom:marao-slide-to-open'].includes(config.type);
}

const CONTROL_CELL_MIN = 120, CONTROL_CELL_FONT_SCALE = 6;

// Equal flexible tracks use the tallest intrinsic row, including later rows.
export function controlGridStyles(selector = '.control-grid') {
  return `${selector}{display:grid;min-width:0;grid-template-columns:repeat(auto-fill,minmax(min(100%,max(${CONTROL_CELL_MIN}px,calc(var(--font-size-primary,1.125rem) * ${CONTROL_CELL_FONT_SCALE}),calc((100% - (var(--marao-control-columns,2) - 1) * var(--marao-control-gap,8px)) / var(--marao-control-columns,2)))),1fr));grid-auto-rows:minmax(0,1fr);gap:var(--marao-control-gap,8px);align-items:stretch}${selector}>*{min-width:0;align-self:stretch}`;
}

const surfaceHeightReservations = new WeakMap();

export function updateCardSurface(root, markup, selector = 'ha-card', updateContent) {
  const surface = root.querySelector(selector);
  if (!surface || !globalThis.document?.createElement) { root.innerHTML = markup; return; }
  const template = document.createElement('template'); template.innerHTML = markup;
  const next = template.content.querySelector(selector);
  if (surface.localName !== next.localName) { root.innerHTML = markup; return; }
  const host = root.host;
  let reservation = surfaceHeightReservations.get(root), releaseHeight;
  // Keep height until native slot layout settles; WebKit otherwise clamps scroll.
  if (host?.getBoundingClientRect) {
    if (!reservation) {
      reservation = { minimum: host.style.minHeight };
      surfaceHeightReservations.set(root, reservation);
      releaseHeight = () => { host.style.minHeight = reservation.minimum; surfaceHeightReservations.delete(root); };
    }
    host.style.minHeight = `${host.getBoundingClientRect().height}px`;
  }
  try {
    const style = root.querySelector('style'), css = template.content.querySelector('style').textContent;
    if (style.textContent !== css) style.textContent = css;
    for (const attribute of [...surface.attributes]) if (!next.hasAttribute(attribute.name) && !(attribute.name === 'style' && next.hasAttribute('data-room') && !next.hasAttribute('data-problem'))) surface.removeAttribute(attribute.name);
    for (const attribute of [...next.attributes]) if (surface.getAttribute(attribute.name) !== attribute.value) surface.setAttribute(attribute.name, attribute.value);
    if(next.hasAttribute?.('data-room') && !next.hasAttribute('data-problem'))for(let i=(surface.style?.length||0)-1;i>=0;i--){const property=surface.style[i];if(!['--marao-room-light','--marao-room-climate'].includes(property))surface.style.removeProperty(property);}
    if (updateContent) updateContent(surface, next);
    else {
      const previous = [...surface.childNodes];
      surface.append(...next.childNodes);
      for (const node of previous) node.remove();
    }
  } finally {
    if (releaseHeight) requestAnimationFrame(releaseHeight);
  }
}

function cardStyles() {
  return `${dropdownStyles}

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
    .compact-copy>.title, .compact-copy>.state.placeholder { grid-area:1 / 1; }
    .body.cover-card .title { font-size:calc(var(--font-size-primary,1.125rem) * 1.25); }
    .body.cover-card .slider-state { padding-inline:16px; }
    .body.standard-control>.control { align-self:stretch; width:100%; margin-top:auto; }
    .body.standard-control.icon-only { justify-content:center; }
    .body.access-popup-action { display:grid; grid-template-columns:48px minmax(0,1fr); grid-template-rows:auto; grid-template-areas:none; gap:8px 12px; align-items:center; min-height:88px; }
    .access-action-icon { grid-column:1; grid-row:1; display:grid; place-items:center; width:48px; height:48px; --mdc-icon-size:28px; }
    .body.access-popup-action>.control { grid-column:2; grid-row:1; align-self:center; margin-top:0; }
    .body.access-popup-action>.problem { grid-column:1/-1; }
    .body.access-close-action { grid-template-columns:48px minmax(0,1fr) 48px; text-align:center; }
    .body.access-close-action>.title { grid-area:auto; grid-column:2; grid-row:1; margin:0; font-size:calc(var(--font-size-primary,1.125rem) * 1.25); font-weight:700; }


    .card-action { position:absolute; inset:0; z-index:1; width:100%; height:100%; margin:0; padding:0; border:0; border-radius:inherit; background:transparent; color:transparent; cursor:pointer; }
    .card-action:disabled { cursor:default; }
    .problem-details { inset:14px 14px auto auto; width:48px;height:48px;z-index:4;color:var(--primary-text-color);background:var(--secondary-background-color); }
    .problem-details::after { content:"ⓘ";font-size:24px; }
    .body.has-problem>.problem { padding-right:56px; }
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
    .history-control { position:relative; z-index:3; grid-column:1/-1; min-width:48px; min-height:48px; border:0; border-radius:12px; padding:8px 12px; background:var(--secondary-background-color); color:var(--primary-text-color); font:inherit; font-family:var(--primary-font-family); font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); overflow-wrap:anywhere; pointer-events:auto; }
    .history-control:focus { outline:none; }
    .problem { grid-column:1/-1; grid-row:-1; display:flex; align-items:flex-start; gap:8px; min-width:0; max-width:100%; font-size:var(--font-size-secondary,1rem); line-height:1.25; }
    .binary-state { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
    .problem span { min-width:0; overflow-wrap:anywhere; }
    .problem ha-icon { flex:0 0 24px; --mdc-icon-size:24px; }
    .body>.problem { position:absolute; inset:14px; grid-area:auto; align-items:flex-start; pointer-events:none; }
    .body>.problem span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .body.has-problem>.title, .body.has-problem>.state, .body.has-problem>.climate, .body.has-problem>.formatted-values, .body.has-problem>.readings, .body.has-problem .compact-copy { visibility:hidden; }
    .body.complete-problem>:not(.problem) { visibility:hidden; }
    .body.complete-problem :is(button,input,marao-slide-to-open) { pointer-events:none; }
    .body .state, .body .climate:not(.current-temperature), .reading dd { height:1.25em; min-height:1.25em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .body .current-temperature { height:1.25em; white-space:nowrap; }
    .placeholder { visibility:hidden; }
    ha-card[aria-busy=true] .body :is(.state,.climate,.slider,.number-value) { color:transparent; border-radius:6px; background:var(--secondary-background-color); }

    .body.navigation-card { grid-template-areas:'title title' 'state icon' 'control control'; }
    .body.binary-card:not(:has(>.state)) { grid-template-rows:auto 1fr auto; grid-template-areas:'title title' 'climate icon' 'control control'; }
    .body.navigation-card .title { font-size:var(--font-size-secondary,1rem); }
    ha-card.title-surface { overflow:visible; background:transparent; box-shadow:none; }
    .body.title-card { display:block; min-height:0; padding:0; }
    .body.title-card .title { font-size:calc(var(--font-size-primary,1.125rem) * 1.39); font-weight:800; }
    :host ha-card:has(.media-app-card) { width:80px; max-width:100%; height:80px; margin-inline:auto; justify-self:center; align-self:center; border-radius:18px; transition:transform .12s ease,box-shadow .12s ease; }
    .body.media-app-card { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0; padding:0; min-height:48px; aspect-ratio:1; text-align:center; border-radius:inherit; }
    ha-card:has(.media-app-card):has(.card-action:not(:disabled)) { cursor:pointer; }
    @media (hover:hover) and (pointer:fine) {
      ha-card:has(.media-app-card):has(.card-action:not(:disabled)):hover { transform:translateY(-2px); box-shadow:0 0 12px 3px color-mix(in srgb,var(--primary-color) 35%,transparent); }
    }
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
    .icon[data-light-color], .icon[data-history-open], .icon[data-activity-open] { padding:0; border:0; min-width:48px; min-height:48px; }
    .icon .palette-indicator { position:absolute; right:2px; bottom:2px; width:16px; height:16px; --mdc-icon-size:16px; border-radius:50%; background:var(--marao-icon-background,var(--secondary-background-color)); pointer-events:none; }
    .readings { grid-column:1/-1; display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,max(110px,calc(var(--font-size-caption,.9375rem) * 8))),1fr)); gap:12px; margin:8px 0 0; min-width:0; }
    .dishwasher-readings {grid-template-columns:repeat(auto-fit,minmax(min(100%,80px),1fr));gap:12px;margin-top:16px;}
    .dishwasher-stat {display:flex;flex-direction:column-reverse;align-items:center;justify-content:end;gap:8px;min-width:0;text-align:center;}
    .dishwasher-stat dt {font-size:var(--font-size-caption,.9375rem);color:var(--secondary-text-color);overflow-wrap:anywhere;}
    .dishwasher-stat dd {width:100%;margin:0;min-width:0;}
    .dishwasher-stat.no-label dt {position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}
    .dishwasher-indicator {position:relative;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:88px;width:100%;aspect-ratio:1;max-width:112px;margin:auto;padding:12px;border-radius:50%;background:var(--secondary-background-color);}
    .dishwasher-indicator ha-icon {--mdc-icon-size:28px;flex:none;}
    .dishwasher-stat-value {position:relative;font-size:var(--font-size-secondary,1rem);font-weight:700;line-height:1.25;overflow-wrap:anywhere;}
    .dishwasher-ring {position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);fill:none;stroke-width:7;}
    .ring-track {stroke:var(--divider-color);}
    .ring-value {stroke:var(--color-blue,var(--primary-color));stroke-linecap:round;}
    .dishwasher-stat.neutral {color:var(--secondary-text-color);}
    .reading { display:grid; justify-items:center; align-content:start; gap:4px; min-width:0; text-align:center; overflow-wrap:anywhere; line-height:1.25; }
    .reading dt { font-size:var(--font-size-caption,.9375rem); }
    .reading dd { margin:0; font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-primary,700); }
    .reading :is(ha-icon,ha-state-icon) { --mdc-icon-size:28px; }
    ha-card[data-glance] { background:transparent; border:0; box-shadow:none; overflow:visible; }
    .body.glance-card { display:block; padding:0; min-height:0; }
    .body.glance-card .readings { margin:0; grid-template-columns:repeat(auto-fit,minmax(min(100%,calc(var(--font-size-primary,1.125rem) * 4.5)),1fr));grid-auto-rows:auto;gap:8px; }
    .glance-card>.title {margin-bottom:12px;}
    .glance-card .reading {position:relative;box-sizing:border-box;padding:10px 8px;row-gap:6px;grid-column:auto;grid-row:span 3;grid-template-columns:minmax(0,1fr);grid-template-rows:subgrid;text-align:center;justify-items:center;align-content:start;border-radius:var(--ha-card-border-radius,20px);background:var(--marao-card-background,var(--ha-card-background,var(--card-background-color)));color:var(--marao-card-text-color,inherit);}
    .glance-card .reading dt {grid-column:1;grid-row:1;font-size:calc(var(--font-size-primary,1.125rem) * 2 / 3);height:auto;display:block;overflow:visible;color:var(--secondary-text-color);}
    .glance-card .reading dd {grid-column:1;grid-row:3;height:auto;min-height:0;white-space:normal;overflow:visible;font-size:var(--font-size-primary,1.125rem);overflow-wrap:anywhere;}
    .glance-card .reading> :is(ha-icon,ha-state-icon,button) {grid-column:1;grid-row:2;box-sizing:border-box;width:48px;height:48px;padding:10px;border-radius:50%;background:var(--opacity-contrast-100,rgba(0,0,0,.08));}
    .glance-card .reading:not(:has(>ha-icon,>ha-state-icon,>button)), .glance-card .reading.reading-name-hidden {grid-row:span 2;}
    .glance-card .reading:not(:has(>ha-icon,>ha-state-icon,>button)) dd, .glance-card .reading.reading-name-hidden dd {grid-row:2;}
    .glance-card .reading.reading-name-hidden> :is(ha-icon,ha-state-icon,button) {grid-row:1;}
    .glance-card .reading.reading-name-hidden dt {height:1px;grid-area:auto;}
    .glance-card .reading.reading-name-hidden:not(:has(>ha-icon,>ha-state-icon,>button)) {grid-row:span 1;}
    .glance-card .reading.reading-name-hidden:not(:has(>ha-icon,>ha-state-icon,>button)) dd {grid-row:1;}
    ha-card[data-glance].marao-press-surface::after {display:none;}
    ha-card[data-glance][data-marao-pressed] .reading::after {content:'';position:absolute;inset:0;border-radius:inherit;background:var(--primary-text-color);opacity:.08;pointer-events:none;}
    .reading-activity {border:0;color:inherit;cursor:pointer;min-width:48px;min-height:48px;}
    .access-action-icon[data-activity-open] {position:relative;z-index:4;pointer-events:auto;min-width:48px;min-height:48px;padding:10px;border:0;border-radius:50%;color:inherit;background:var(--active-overlay-color,var(--secondary-background-color));}
    .body.glance-card.has-problem>.readings {visibility:visible;}
    ha-card[data-glance]>.problem-details {inset:auto 0 0 auto;}
    .body.glance-card.has-problem>.problem {position:relative;inset:auto;margin-top:8px;min-height:48px;align-items:center;}
    .body.glance-card.has-problem>.problem span {white-space:normal;}
    .body.glance-card.has-problem>.title {visibility:visible;}
    .control { grid-area:control; z-index:2; display:flex; gap:8px; align-items:center; pointer-events:auto; }
    button { min-width:48px; min-height:48px; border:0; border-radius:12px; padding:10px 12px; color:inherit; background:var(--secondary-background-color); font:inherit; cursor:pointer; pointer-events:auto; transition:transform .12s ease,filter .12s ease; }
    button:focus, input:focus { outline:none; }
    .climate-pending { grid-area:state; font-size:var(--font-size-secondary,1rem); line-height:1.25; height:1.25em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .body.climate-card:has(.climate-pending)>.state { visibility:hidden; }
    .control.number-control { grid-area:icon; justify-self:end; }
    .exhaust-actions {grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;pointer-events:auto;}
    .exhaust-actions:empty {display:none;}
    .exhaust-actions button {display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;overflow-wrap:anywhere;}
    .exhaust-actions ha-icon {flex:0 0 24px;}
    .wallbox-shortcuts { grid-area:wallbox; z-index:2; display:grid; grid-template-columns:repeat(auto-fit,minmax(48px,1fr)); gap:8px; width:100%; margin-top:8px; pointer-events:auto; }
    .wallbox-shortcuts button, .exhaust-actions button { min-width:48px; min-height:48px; background:var(--opacity-contrast-100,color-mix(in srgb,currentColor 14%,transparent)); color:var(--primary-text-color,#141414); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--color-black,#000) 12%,transparent); font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-primary,700); }
    .wallbox-shortcuts button[aria-pressed="true"]:not(:disabled) { background:var(--color-blue); color:var(--color-black); box-shadow:inset 0 0 0 3px var(--color-black); }
    .wallbox-shortcuts button[aria-pressed="true"]:not(:disabled):nth-child(2) { background:var(--color-teal); }
    .wallbox-shortcuts button[aria-pressed="true"]:not(:disabled):nth-child(3) { background:var(--color-gold); }
    .wallbox-shortcuts button:disabled { background:var(--secondary-background-color); color:var(--disabled-text-color); box-shadow:none; }
    .control.climate-number-control { align-self:stretch; }
    .number-stepper { display:grid; justify-items:center; gap:2px; min-width:84px; width:auto; max-width:42vw; padding:4px; box-sizing:border-box; border-radius:999px; background:var(--button-card-background,var(--secondary-background-color)); }
    .number-stepper button { display:grid; place-items:center; width:48px; height:48px; padding:0; border-radius:50%; background:transparent; }
    .number-stepper ha-icon { --mdc-icon-size:25px; }
    .number-value { max-width:100%; min-width:max-content; margin:0; padding:0; border:0; opacity:.72; color:inherit; background:transparent; font:inherit; font-size:var(--font-size-caption,.9375rem); font-weight:var(--font-weight-primary,700); line-height:1.2; overflow-wrap:anywhere; white-space:nowrap; text-align:center; }
    .climate-stepper { height:100%; max-width:100%; padding:3px; align-content:space-between; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); }
    .climate-stepper button { width:52px; height:48px; }
    .climate-stepper ha-icon { --mdc-icon-size:32px; }
    .climate-stepper .number-value { font-size:var(--font-size-primary,1.1875rem); opacity:1; }
    .number-value[data-number-range] { min-width:0; white-space:normal; overflow-wrap:normal; }
    ${sliderStyles}
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
      .body:has(>.number-control) .number-stepper { max-width:100%; }
    }
    .hold-progress { position:absolute; inset:1px; z-index:4; width:calc(100% - 2px); height:calc(100% - 2px); overflow:visible; pointer-events:none; }
    .hold-progress rect { width:calc(100% - 3px); height:calc(100% - 3px); rx:calc(var(--ha-card-border-radius,20px) - 2.5px); fill:none; stroke:var(--marao-accent-color,var(--primary-color)); stroke-width:3px; stroke-dasharray:100; stroke-dashoffset:100; opacity:0; }
    .graph-background { position:absolute; inset:0; z-index:0; display:block; width:100%; height:100%; pointer-events:none; opacity:.30; }
    .graph-background .tint { fill:var(--marao-graph-background,transparent); }
    .graph-background .fill { fill:var(--marao-graph-color,var(--marao-card-text-color,var(--marao-accent-color,var(--primary-color)))); opacity:.16; }
    .graph-background .line { fill:none; stroke:var(--marao-graph-color,var(--marao-card-text-color,var(--marao-accent-color,var(--primary-color)))); stroke-width:2.25; vector-effect:non-scaling-stroke; }
    .graph-card .state { font-size:calc(var(--font-size-primary,1.125rem) * 1.12); font-weight:var(--font-weight-primary,700); }
    .graph-status { grid-column:1/-1; font-size:var(--font-size-caption,.9375rem); overflow-wrap:anywhere; }
    button.graph-status { font-family:var(--primary-font-family); font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); }
    .vacuum-actions { grid-column:1/-1; z-index:3; display:grid; grid-template-columns:repeat(auto-fit,minmax(48px,1fr)); gap:8px; pointer-events:auto; }
    .vacuum-actions button { padding:10px 4px; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); }
    .body.room-card { display:flex; flex-direction:column; align-items:stretch; gap:8px; }
    .room-bottom { position:relative; display:flex; align-items:flex-end; min-height:48px; margin-top:auto; gap:8px; }
    .room-artwork { --room-artwork-size:clamp(48px,65cqi,128px); position:absolute; right:calc(-1 * var(--room-edge-inset,14px)); bottom:0; width:calc(.9 * var(--room-artwork-size)); height:var(--room-artwork-size); max-height:calc(100% + 36px); overflow:hidden; color:var(--marao-icon-color,var(--icon-color)); opacity:.2; pointer-events:none; }
    .room-artwork :is(ha-icon,ha-state-icon) { display:block; width:var(--room-artwork-size); height:var(--room-artwork-size); --mdc-icon-size:var(--room-artwork-size); }
    .room-lights-off { position:relative; z-index:3; box-sizing:border-box; display:flex; align-items:center; justify-content:center; flex:0 0 48px; width:48px; height:48px; padding:0; border:1px solid currentColor; border-radius:50%; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); pointer-events:auto; }
    ha-card[data-room] { background:linear-gradient(to top right,var(--marao-room-light),var(--marao-room-climate)); transition:--marao-room-light .3s ease,--marao-room-climate .3s ease; }
    ha-card[data-room][data-problem] { transition:none; background:var(--marao-card-background,var(--ha-card-background,var(--card-background-color))); }
    @media(prefers-reduced-motion:reduce) { ha-card[data-room] { transition:none; } }
    .room-climate-off[data-active="true"] { background:var(--marao-room-climate); }
    .room-lights-off:disabled { opacity:.6; cursor:default; }
    .room-lights-off ha-icon { --mdc-icon-size:28px; }
    .climate-mode-picker { grid-area:modes;z-index:3;pointer-events:auto;min-width:0;width:100% }
    .marao-dropdown>button>span { min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis }
    .reading dt { height:2.5em;overflow-wrap:anywhere;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical }
    .number-value { height:1.2em;white-space:nowrap!important;overflow:hidden }
    .body.media-app-card .problem { position:absolute;inset:8px;width:auto;margin:0;padding:0;background:transparent }
    button.graph-status { position:absolute;right:12px;bottom:12px;z-index:4 }
    .body.scene-card:not(.icon-only) {grid-template-areas:'title icon' 'state icon' 'control control';grid-template-rows:auto auto auto;}
    .body.scene-card>.icon {align-self:start;width:48px;height:48px;}
    .scene-options { grid-area:control; z-index:2; width:100%; pointer-events:auto; font-size:var(--font-size-secondary,1rem); }
    @container marao-card (max-width:190px) { .body.with-climate-modes { padding-inline:8px; } .climate-mode { padding-inline:4px; } }
    .camera { grid-column:1/-1; width:100%; aspect-ratio:16/9; object-fit:cover; background:#000; }
    .media-artwork { position:absolute; inset:0; pointer-events:none; }
    .media-artwork img { width:100%; height:100%; object-fit:cover; }
    .media-artwork::after { content:''; position:absolute; inset:0; background:rgba(0,0,0,.72); }
    @container marao-card (max-width:120px) {
      .body, .body.with-climate-modes, .body.icon-only { grid-template-columns:minmax(0,1fr); grid-template-areas:'title' 'icon' 'state' 'climate' 'control' 'modes'; padding:24px clamp(0px,calc((100cqi - 64px) / 2),4px); }
      .body.wallbox-card { grid-template-areas:'title' 'control' 'wallbox'; }
      .body.binary-card:not(:has(>.state)) { grid-template-columns:minmax(0,1fr); grid-template-areas:'title' 'icon' 'climate' 'control'; }
      .body.room-card { --room-edge-inset:clamp(0px,calc((100cqi - 64px) / 2),4px); }
      .body.room-card .room-artwork { bottom:-8px; }
      .control.number-control { grid-area:control; justify-self:start; }
      .number-stepper { min-width:56px; max-width:100%; }
      .wallbox-shortcuts, .climate-modes { grid-template-columns:minmax(0,1fr); }
    }
    .body.slider-header, .body.slider-header.binary-card:not(:has(>.state)) { grid-template-columns:minmax(0,1fr) auto; grid-template-areas:'title icon' 'state state' 'control control'; }
    .body.slider-header:not(:has(>.icon)) .title { grid-column:1/-1; }
    .body.standard-control.slider-header { display:flex; }
    .body.climate-card {display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto 1fr auto;grid-template-areas:'title target' 'climate target' 'state target' 'modes modes';gap:4px 12px;padding:8px 14px;min-height:0;}
    .body.climate-card:not(:has(.climate-mode-picker)) {grid-template-rows:auto 1fr auto;grid-template-areas:'title target' 'climate target' 'state target';}
    .body.climate-card>.title {grid-area:title;font-size:var(--font-size-primary,1.125rem);}
    .body.climate-card>.climate-readings {grid-area:climate;min-width:0;overflow-wrap:anywhere;}
    .body.climate-card .current-temperature {font-size:calc(var(--font-size-primary,1.125rem) * 2.56);line-height:1.2;}
    .climate-humidity,.climate-activity {font-size:var(--font-size-secondary,1rem);line-height:1.25;}
    .body.climate-card>.state {display:none;}
    .body.climate-card>.climate-pending {grid-area:state;}
    .body.climate-card>.climate-number-control {grid-area:target;justify-self:end;align-self:stretch;}
    .body:is(.climate-card,.number-card) .climate-stepper {box-sizing:border-box;min-width:60px;min-height:134px;height:100%;padding:3px;gap:4px;max-width:100%;}
    .body.climate-card .number-value {height:auto;white-space:normal!important;overflow:visible;}
    .body:is(.climate-card,.number-card) .climate-stepper button {width:48px;height:48px;}
    .body.climate-card>.icon {grid-column:1;grid-row:auto;justify-self:start;}
    .body.climate-card.climate-detail {grid-template-rows:auto auto auto auto;grid-template-areas:'title title' 'climate climate' 'modes modes' '. target';}
    .body.climate-card.climate-detail:has(.climate-pending) {grid-template-areas:'title title' 'climate climate' 'state state' 'modes modes' '. target';}
    .climate-modes {display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}
    .body.climate-card.climate-detail .climate-modes {justify-content:space-between;}
    .climate-modes button {position:relative;flex:0 0 48px;width:48px;height:48px;padding:10px;}
    .climate-modes ha-icon {--mdc-icon-size:28px;}
    .climate-modes button.active {background:var(--marao-icon-background,var(--primary-color));color:var(--marao-icon-color,var(--primary-text-color));}
    .mode-check {position:absolute;right:1px;bottom:0;font-size:12px;line-height:1;}
    @container marao-card (max-width:190px) {
      .body.climate-card {grid-template-columns:minmax(0,1fr);grid-template-areas:'title' 'climate' 'state' 'target' 'modes';}
      .body.climate-card.climate-detail {grid-template-areas:'title' 'climate' 'state' 'modes' 'target';}
    }
    .body.number-card {grid-template-columns:minmax(0,1fr) 60px;grid-template-rows:auto auto;grid-template-areas:'title title' 'value target';gap:8px;padding:12px;min-height:0;}
    .body.number-card>.title {grid-area:title;min-width:0;}
    .body.number-card>.number-control {display:contents;}
    .body.number-card .number-card-stepper {grid-area:target;justify-self:end;align-self:stretch;min-height:106px;}
    .body.number-card .number-card-value {grid-area:value;align-self:center;min-width:0;width:100%;height:auto;overflow:visible;white-space:normal!important;overflow-wrap:anywhere;text-align:left;opacity:1;font-size:clamp(calc(var(--font-size-primary,1.125rem) * 2.5),18cqi,calc(var(--font-size-primary,1.125rem) * 4));line-height:1.05;}
    .number-card-value small {font-size:.35em;font-weight:500;}
    @container marao-card (max-width:190px) {.body.number-card {grid-template-columns:minmax(0,1fr);grid-template-areas:'title' 'value' 'target';}.body.number-card .number-card-stepper {justify-self:end;}}
    .body.wallbox-card { grid-template-columns:minmax(0,1fr) 64px; grid-template-areas:'value icon' 'title icon' 'wallbox wallbox'; gap:12px 20px; padding:24px; min-height:160px; }
    .body.wallbox-card:not(:has(.wallbox-shortcuts)) { grid-template-areas:'value icon' 'title icon'; grid-template-rows:auto auto; min-height:0; padding-bottom:16px; }
    .body.wallbox-card .wallbox-current-control { display:contents; }
    .body.wallbox-card .wallbox-value { grid-area:value; min-width:0; align-self:end; text-align:left; white-space:normal; overflow-wrap:anywhere; font-size:calc(3.5 * var(--font-size-primary,1.125rem)); font-weight:800; line-height:1.05; opacity:1; }
    .wallbox-value small { font:inherit; font-size:var(--font-size-primary,1.125rem); }
    .body.wallbox-card .title { grid-area:title; align-self:start; font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-secondary,500); }
    .body.wallbox-card .wallbox-stepper { grid-area:icon; align-self:stretch; justify-self:end; align-content:space-between; min-width:64px; width:64px; max-width:100%; padding:8px; gap:8px; background:var(--ha-card-background,var(--card-background-color,#fff)); color:var(--primary-text-color,#141414); box-shadow:0 8px 28px rgba(0,0,0,.06); }
    .wallbox-stepper button { width:48px; height:48px; }
    @container marao-card (max-width:240px) {
      .body.wallbox-card { grid-template-columns:minmax(0,1fr) 56px; gap:8px; padding:12px; }
      .body.wallbox-card .wallbox-value { font-size:calc(1.75 * var(--font-size-primary,1.125rem)); }
      .body.wallbox-card .wallbox-stepper { min-width:56px; width:56px; padding:4px; }
    }
    @container marao-card (max-width:160px) { .body.wallbox-card { padding-inline:4px; column-gap:4px; } }
    @media (prefers-reduced-motion:reduce) { ha-card,:host ha-card:has(.media-app-card),button,.slider-thumb { transition:none; } }
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

const historyTimestamps = new WeakMap();
function historyTimestamp(record) {
  if (!historyTimestamps.has(record)) {
    const stamp = record.time ?? record.timestamp ?? record.last_updated ?? record.last_changed;
    historyTimestamps.set(record, typeof stamp === 'number' ? stamp : Date.parse(stamp));
  }
  return historyTimestamps.get(record);
}
function insertHistoryRecord(records, record) {
  const time = historyTimestamp(record);
  let low = 0, high = records.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (historyTimestamp(records[middle]) < time) low = middle + 1; else high = middle;
  }
  records.splice(low, low < records.length && historyTimestamp(records[low]) === time ? 1 : 0, record);
}
function trimHistory(records, start) {
  let count = 0;
  while (count < records.length && historyTimestamp(records[count]) < start) count++;
  if (count) records.splice(0, count);
}

export function fitNativeGrid(card, minimumWidth) {
  for (let item = card; item; item = item.parentElement || item.getRootNode?.()?.host) {
    if (item.localName === 'marao-control-grid' || item.classList?.contains('control-grid')) return;
    const grid = item.parentElement;
    if (grid?.id !== 'root' || grid.getRootNode().host?.localName !== 'hui-grid-card') continue;
    const root = grid.getRootNode(), columns = Number(root.host._config?.columns) || 3;
    const marker = `data-marao-grid-${minimumWidth}`;
    item.setAttribute(marker, '');
    let style = root.querySelector(`style[${marker}]`);
    if (!style) { style = document.createElement('style'); style.setAttribute(marker, ''); root.append(style); }
    style.textContent = `:host{container:marao-native-grid / inline-size}@container marao-native-grid (max-width:${columns * minimumWidth + (columns - 1) * 8}px){#root>[${marker}]{grid-column:1/-1}}`;
    return item;
  }
}

export class MaraoCard extends BaseElement {
  static async getConfigElement(){
    await import(new URL(`./MaraoNativeCardEditor.js${new URL(import.meta.url).search}`,import.meta.url));
    return document.createElement('marao-native-card-editor');
  }
  _syncGenericPopup(){
    if(!this.isConnected)return;
    if(!this._genericPopupConfig){this._genericPopup?.remove();this._genericPopup=null;return;}
    if(!this._genericPopup){this._genericPopup=document.createElement('marao-popup-card');this._genericPopup.nativeOwner=this;this.append(this._genericPopup);}
    this._genericPopup.setConfig(this._genericPopupConfig);this._genericPopup.hass=this._hass;this._genericPopup.preview=this.preview;
  }

  constructor() {
    super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._hass = null; this._sliderTargets = new Map(); this._sliderGesture = null; this._graphHistory = new Map(); this._graphRequests = new Map(); this._graphErrors = new Set(); this._holdTimer = null; this._holdFrame = null; this._holdActive = false; this._holdCompleted = false;
    // A completed hold can replace its button before the native click arrives.
    for (const type of ['pointerdown', 'keydown']) this.shadowRoot?.addEventListener?.(type, () => { this._suppressHoldClick = false; }, true);
    this.shadowRoot?.addEventListener?.('click', event => {
      if (!this._suppressHoldClick) return;
      this._suppressHoldClick = false;
      event.preventDefault(); event.stopImmediatePropagation();
    }, true);
  }
  get preview() { return Boolean(this._preview || this.nativeOwner?.preview || nativeEditing(this)); }
  set preview(value) {
    this._preview = Boolean(value);
    if (this.preview) { this._cancelSliderGesture(); this._cancelHold(); this._disposeCamera(); this._clearAlarmPIN(); this._detailsPopup?._close(false); this._activeHistoryPopup?._close(false); }
    if (this._authoritativeHass) this.hass = this._authoritativeHass;
  }
  setConfig(config) {
    validatePopupContent(config);
    this._genericPopupConfig=null;
    if(config.popup_content?.mode==='custom'){
      const error=popupViewError(config);if(error)throw new Error(error);
      const content=config.popup_content;
      if(content.version!==1||content.layout?.type!=='sections'||!Array.isArray(content.layout.sections))throw new Error('Popup content must use a native Sections layout.');
      this._genericPopupHash||='#marao-custom-'+Array.from(crypto.getRandomValues(new Uint8Array(8)),value=>value.toString(16).padStart(2,'0')).join('');
      const hash=this._genericPopupHash,variables={...config.variables},routes=[variables.popup_hash,variables.mode_selector_hash,variables.lights_popup];
      const next={...config,variables};
      if(config.template==='md_climate_card')variables.mode_selector_hash=hash;
      else if(config.template==='md_floor_plan_card')variables.lights_popup=hash;
      else variables.popup_hash=hash;
      if(config.tap_action?.action==='navigate'&&routes.includes(config.tap_action.navigation_path))next.tap_action={...config.tap_action,navigation_path:hash};
      if(config.template==='md_entity_group_card'){
        const group=popupGroupFromView({entity_type:variables.entity_type||config.entity_type},content.layout,[]);
        variables.summary_entities=group.members;variables.summary_sections=group.summary_sections;
      }
      this._genericPopupConfig={...content.presentation,type:'custom:marao-popup-card',hash,name:content.layout.title??config.name??'',popup_content:structuredClone(content)};config=next;
    }
    config = accessCardConfig(config, this._hass);
    if (config.variables?.activity_entities !== undefined && (!Array.isArray(config.variables.activity_entities) || config.variables.activity_entities.some(id => typeof id !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(id)))) throw new Error(localize('activity.invalid_sources',this._hass,{},'Related activity entities must be an explicit list of entity IDs.'));
    if (config.template === 'md_room_card' && config.variables?.climate_entity != null && config.variables.climate_entity !== '' && !/^climate\.[a-z0-9_]+$/.test(config.variables.climate_entity)) throw new Error(localize('room.invalid_climate',this._hass,{},'Choose a climate entity.'));
    if(config.template==='md_media_app_card'){const error=mediaAppLogoError(config.variables?.app_logo,this._hass);if(error)throw new Error(error);}
    if(['md_glance_card','md_dishwasher_card'].includes(config.template) && Object.hasOwn(config.variables || {},'show_reading_names') && typeof config.variables.show_reading_names!=='boolean')throw new Error(String(this._hass?.language||'').startsWith('pt')?'Mostrar nomes das leituras tem de ser um valor booleano.':'Show reading labels must be a boolean.');
    if(config.template==='md_climate_card'){const error=climateConfigError(config.variables,this._hass);if(error)throw new Error(error);}
    if(config.template==='md_people_card'){const error=peopleError(config);if(error)throw new Error(collectionLabel(error,this._hass));}
    this.shadowRoot?.querySelector("marao-slide-to-open")?._clearFeedback?.();
    this._layoutMetadata = {};
    if (config.template === "md_sensor_card") { const error = sensorThresholdError(config.variables || {}, config.entity); if (error) throw new Error(localize(error, this._hass, {}, error)); }
    if (["md_security_card", "md_alarm_controls_card"].includes(config.template) && Object.hasOwn(config.variables || {}, "alarm_layout") && !["dropdown", "grid"].includes(config.variables.alarm_layout)) throw new Error(localize("alarm.invalid_layout", this._hass, {}, "Alarm layout must be dropdown or grid."));
    if (config.template === 'md_light_card' && Object.hasOwn(config.variables || {}, 'use_light_color') && typeof config.variables.use_light_color !== 'boolean') throw new Error(localize('light.invalid_color_background', this._hass, {}, 'Use light color as background must be a boolean.'));
    if (config.template === 'md_camera_card' && Object.hasOwn(config.variables || {}, 'preload_stream') && typeof config.variables.preload_stream !== 'boolean') throw new Error(localize('camera.invalid_preload', this._hass, {}, 'Preload stream must be a boolean.'));
    this._stateEntities = [...new Set(referencedEntities(config))];
    this._stateReferences = null;
    const previousGraph = this._graphEntity();
    if (this._config?.entity !== config.entity || this._config?.template !== config.template || this._config?.variables?.preload_stream !== config.variables?.preload_stream) this._disposeCamera();
    const historyIdentity = value => JSON.stringify({...value, variables: {...value.variables, display_unit: undefined, display_precision: undefined}});
    this._clearAlarmPIN();
    this._alarmSignature = "";
    this._alarmBusy = false;
    this._cancelHold();
    this._cancelSliderGesture();this._sliderControl?.settle?.();
    if (historyIdentity(this._config) !== historyIdentity(config)) { this._graphRequests.clear(); this._graphHistory.clear(); this._graphErrors.clear(); this._graphData = null; this._ownedGraphRecords = null; } this._config = { ...config }; if (previousGraph !== this._graphEntity()) this._activeHistoryPopup?._invalidateHistory(); this._actionError = ""; this._mediaError = ""; this._mediaURL = ""; this._actionRequest = (this._actionRequest || 0) + 1; this._subscribeClimate(); this._observeGraph(); this._render();this._syncGenericPopup(); }
  connectedCallback() {
    this._syncGenericPopup();
    this._stopNativeEditing?.(); this._stopNativeEditing = bindNativeEditing(this, () => { this.preview = this._preview; });
    this._runtimeReady ||= () => { if (this.isConnected) this._render(); };
    if (!globalThis.window?.MaraoDashboard?.localize) globalThis.window?.addEventListener?.('marao-runtime-ready', this._runtimeReady, {once:true});
    this._ensurePress();
    this._nativeGridItem = fitNativeGrid(this, 76); // 48px control plus the normal 14px side insets.
    this._observeGraph();
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
    if(this._genericPopup)this._genericPopup.hass=value;
    this._authoritativeHass = value;
    const previewChanged = this._renderedPreview !== this.preview;
    this._renderedPreview = this.preview;
    const entity = text(this._config.entity);
    const previous = this._hass;
    const previousReferences = this._stateReferences;
    this._stateReferences = this._stateEntities?.map(id => value?.states?.[id]);
    const previousState = previous?.states?.[entity];
    const wasServiceReady = this._serviceReady;
    this._hass = value;
    this._serviceReady = serviceConnectionReady(value);
    if(previous?.user?.id !== value?.user?.id || wasServiceReady !== this._serviceReady)this._activeHistoryPopup?._refreshHistory();
    this._camera?.update(value, entity, this._label(entity, this._config, stateOf(value, entity)));
    if (this._config.template === "md_alarm_controls_card") {
      if (!this._serviceReady || !serviceTargetReady(value, entity)) { this._clearAlarmPIN(); this._cancelHold(); }
      this._renderAlarm();
      return;
    }
    this._subscribeClimate();
    if (this._climateEntity) reconcileClimate(this._climateEntity, value, previousState !== value?.states?.[entity]);
    const graphEntity = this._config.variables?.graph_entity || this._config.variables?.power_entity
      || (["md_graph_card", "md_toggle_graph_card"].includes(this._config.template) ? entity : "");
    const graphAvailability = this._graphAvailability(graphEntity, value);
    if (graphEntity && this._graphAvailabilityState !== graphAvailability) {
      this._graphRequests.delete(graphEntity);
      this._graphHistory.delete(graphEntity);
      this._graphErrors.delete(graphEntity);
    } else if (graphEntity && !graphAvailability && this._graphHistory.has(graphEntity)
      && previous?.states?.[graphEntity] !== value?.states?.[graphEntity]) {
      // Keep actual live observations once a newer report replaces them, so an
      // inspected reading remains part of the same full-resolution history.
      this._rememberGraphReading(graphEntity, previous?.states?.[graphEntity]);
    }
    this._graphAvailabilityState = graphAvailability;
    const accessSlide = this.shadowRoot?.querySelector('marao-slide-to-open');
    // Keep the elements under a scrolling finger mounted when other entities update.
    if (!previewChanged && previous?.states && value?.states && this._config.template !== 'md_header_card'
      && wasServiceReady === this._serviceReady
      && previous.connected === value.connected && previous.connection?.connected === value.connection?.connected
      && ["themes", "locale", "language", "localize", "entities", "services", "config", "callApi"].every(key => previous[key] === value[key])
      && previousReferences && this._stateReferences?.every((state, index) => previousReferences[index] === state)) {
      if (accessSlide) accessSlide.hass = value;
      return;
    }
    // Home Assistant updates all cards when unrelated entities change. Keep
    // the pressed control mounted until its own state or connection changes.
    if (!previewChanged && this._holdActive && serviceConnectionReady(value)
      && (!this._secondaryHistory || !this._graphAvailability(graphEntity, value))
      && [this._config.tap_action, this._config.hold_action].every((action) => !isServiceAction(action) || serviceTargetReady(value, action?.target?.entity_id || action?.data?.entity_id || action?.entity_id || entity))
      && previousState && previousState === value?.states?.[entity]
      && !["unknown", "unavailable"].includes(text(previousState.state).toLowerCase())) return;
    this._render();
  }
  get hass() { return this._hass; }
  disconnectedCallback() {
    this._genericPopup?.remove();this._genericPopup=null;
    this._stopNativeEditing?.(); this._stopNativeEditing = null;
    globalThis.window?.removeEventListener?.('marao-runtime-ready', this._runtimeReady);
    this._press?.destroy(); this._press = null;
    this._nativeGridItem?.removeAttribute('data-marao-grid-76'); this._nativeGridItem = null;
    this._graphObserver?.disconnect(); this._graphObserver = null; this._graphVisible = undefined;
    this._detailsPopup?._close(false);
    this._sceneDropdown?.destroy(); this._sceneDropdown = null;
    this._stateReferences = null;
    queueMicrotask(() => { if (!this.isConnected) { this._historyPopup?._close(false); this._activeHistoryPopup?._close(false); } });
    this._disposeCamera();
    for (const type of ["location-changed", "popstate"]) globalThis.window?.removeEventListener?.(type, this._cancelHiddenControls);
    globalThis.document?.removeEventListener?.("visibilitychange", this._cancelHiddenControls);
    this._clearAlarmPIN(); this._alarmSignature = ""; this._actionLive = false; this._actionError = ""; this._mediaError = ""; this._mediaURL = ""; this._actionRequest = (this._actionRequest || 0) + 1; this._climateConnected = false; this._subscribeClimate(); this._cancelHold(); this._cancelSliderGesture();
    // Reconnecting unchanged markup must rebind the listeners removed below.
    if (this._sliderControl) this._renderedMarkup = null;
    this._sliderControl?.destroy(); this._sliderControl = null;
  }

  _disposeCamera() {
    this._cameraGeneration = (this._cameraGeneration || 0) + 1;
    this._camera?.dispose(); this._camera = null; this._cameraSlot?.remove(); this._cameraSlot = null; this._cameraLoading = false; this._cameraError = "";
  }

  _syncCamera() {
    if (this._config.template !== "md_camera_card" || this.preview || !this.isConnected) { this._disposeCamera(); return; }
    const entity = text(this._config.entity), state = layoutState(this, stateOf(this._hass, entity));
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
    this._ensurePress();
    const surface = this.shadowRoot.querySelector('ha-card');
    if (surface && bindings !== undefined && this._renderedMarkup === markup
      && this._renderedBindings === bindings && this._renderedConfig === this._config) return false;
    this._press.cancel();
    if (!surface) {
      this.shadowRoot.innerHTML = markup;
      this._renderedMarkup = markup; this._renderedBindings = bindings; this._renderedConfig = this._config;
      return;
    }
    updateCardSurface(this.shadowRoot, markup, 'ha-card', (surface, next) => {
      const previous = [...surface.childNodes];
      const coverRange = ['md_cover_card','md_fan_card'].includes(this._config.template) && domainOf(this._config.entity) === 'cover';
      const oldRange = coverRange ? surface.querySelector('input[type=range]') : null;
      const newRange = oldRange ? next.querySelector('input[type=range]') : null;
      const sameRange = oldRange && newRange && ['data-slider-key','min','max','step'].every(key => oldRange.getAttribute(key) === newRange.getAttribute(key))
        && Boolean(oldRange.parentElement.querySelector('.slider-state')) === Boolean(newRange.parentElement.querySelector('.slider-state'));
      if (sameRange) {
        const snapRange = oldRange.disabled || newRange.disabled;
        oldRange.disabled = newRange.disabled;
        for (const key of ['aria-label','title']) oldRange.setAttribute(key, newRange.getAttribute(key));
        const oldLabel = oldRange.parentElement.querySelector('.slider-state');
        const newLabel = newRange.parentElement.querySelector('.slider-state');
        if (oldLabel && newLabel) { oldLabel.textContent = newLabel.textContent; oldRange.setAttribute('aria-description', newLabel.textContent); }
        this._sliderControl?.update(Number(newRange.dataset.sliderCurrent), Number(newRange.value), {follow: !this._sliderTargets.has(oldRange.dataset.sliderKey), immediate: snapRange || this._hass?.connected === false || this._hass?.connection?.connected === false});
      }
      const roomBottom = this._config.template === 'md_room_card' && this._renderedConfig === this._config ? surface.querySelector('.room-bottom') : null;
      const nextRoomBottom = roomBottom ? next.querySelector('.room-bottom') : null;
      const sameRoom = roomBottom && nextRoomBottom && roomBottom.children.length === nextRoomBottom.children.length;
      if (sameRoom) for (let i=0;i<roomBottom.children.length;i++) {
        const current=roomBottom.children[i],fresh=nextRoomBottom.children[i];
        for(const attr of [...current.attributes]) if(!fresh.hasAttribute(attr.name))current.removeAttribute(attr.name);
        for(const attr of [...fresh.attributes])current.setAttribute(attr.name,attr.value);
        current.innerHTML=fresh.innerHTML;
      }
      const slide = sameRoom ? roomBottom : sameRange ? oldRange.parentElement : this._config.template === 'md_access_slide_action_card' ? surface.querySelector('marao-slide-to-open') : null;
      const nextSlide = sameRoom ? nextRoomBottom : sameRange ? newRange.parentElement : slide ? next.querySelector('marao-slide-to-open') : null;
      if (slide && nextSlide && (sameRoom || sameRange || slide.getAttribute('entity') === nextSlide.getAttribute('entity'))) {
        const retain = (current, fresh) => {
          if(current === slide && sameRange)return;
          for (const attr of [...current.attributes]) if (!fresh.hasAttribute(attr.name)) current.removeAttribute(attr.name);
          for (const attr of [...fresh.attributes]) if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
          if (current === slide) return;
          const branch = [...current.children].find(node => node === slide || node.contains(slide));
          const nextBranch = [...fresh.children].find(node => node === nextSlide || node.contains(nextSlide));
          const siblings = [...current.childNodes].filter(node => node !== branch);
          let after = false;
          for (const node of [...fresh.childNodes]) {
            if (node === nextBranch) after = true;
            else if (after) current.append(node); else current.insertBefore(node, branch);
          }
          for (const node of siblings) node.remove();
          retain(branch, nextBranch);
        };
        retain(surface, next);
        return;
      }
      const cameraSlot = this._camera?.slot || this._cameraSlot;
      const picker = ['md_scene_card','md_climate_card'].includes(this._config.template) ? surface.querySelector('[data-scene-picker]') : null;
      const nextPicker = picker ? next.querySelector('[data-scene-picker]') : null;
      if (picker && nextPicker && picker.getAttribute('data-scene-identity') === nextPicker.getAttribute('data-scene-identity')) {
        // Keep the open menu attached: reparenting a popover closes it and loses its scroll.
        const body = picker.parentNode, nextBody = nextPicker.parentNode;
        for (const attribute of [...body.attributes]) body.removeAttribute(attribute.name);
        for (const attribute of [...nextBody.attributes]) body.setAttribute(attribute.name, attribute.value);
        const oldChildren = [...body.childNodes].filter(node => node !== picker);
        let after = false;
        for (const node of [...nextBody.childNodes]) {
          if (node === nextPicker) after = true;
          else if (after) body.append(node); else body.insertBefore(node, picker);
        }
        for (const node of oldChildren) node.remove();
        after = false;
        for (const node of [...next.childNodes]) {
          if (node === nextBody) after = true;
          else if (after) surface.append(node); else surface.insertBefore(node, body);
        }
        for (const node of previous) if (node !== body) node.remove();
      } else {
        if (cameraSlot) for (const node of [...next.childNodes]) surface.insertBefore(node, cameraSlot);
        else surface.append(...next.childNodes);
        for (const node of previous) if (node !== this._camera?.slot && node !== this._cameraSlot) node.remove();
      }
    });
    this._renderedMarkup = markup; this._renderedBindings = bindings; this._renderedConfig = this._config;
  }

  _renderAlarm() {
    if (!this.shadowRoot) return;
    const entity = text(this._config.entity), state = layoutState(this, stateOf(this._hass, entity));
    const problem = cardProblem(this._config, this._hass, { error: this._actionError });
    const ready = Boolean(state.state) && domainOf(entity) === "alarm_control_panel" && serviceConnectionReady(this._hass) && serviceTargetReady(this._hass, entity);
    const codeFormat = state.attributes?.code_format;
    const layout = this._config.variables?.alarm_layout || 'dropdown';
    const signature = JSON.stringify([state.state, state.attributes?.supported_features, codeFormat, state.attributes?.code_arm_required,
      ready, layout, this._alarmBusy, problem?.reason, this._hass?.language, this._hass?.locale]);
    if (signature === this._alarmSignature) return;
    this._alarmSignature = signature;
    const restoreFocus = this.shadowRoot.activeElement ? focusRestorer(deepActiveElement()) : null;
    const actions = alarmActions(state);
    const structure = JSON.stringify([layout, actions.map(item => item.service), codeFormat, this._hass?.language, this._hass?.locale, this._config]);
    const body = this.shadowRoot.querySelector('.alarm-body');
    const disabledAction = action => !ready || this._alarmBusy || state.state === `armed_${action.mode}` || action.mode === 'disarm' && state.state === 'disarmed';
    const selectedAction = actions.find(action => state.state === (action.mode === 'disarm' ? 'disarmed' : `armed_${action.mode}`));
    const selectedColor = stateAppearance('md_security_card', state.state, this._config, this._hass);
    const selectionStyle = `--alarm-selected-background:${selectedColor.background || 'var(--color-blue)'};--alarm-selected-text:${selectedColor.text || 'var(--color-black)'}`;
    const sync = () => {
      const body = this.shadowRoot.querySelector('.alarm-body');
      body?.setAttribute('style', selectionStyle);
      const surface = this.shadowRoot.querySelector('ha-card');
      surface?.setAttribute('style', problemStyle(problem) || '');
      const input = this.shadowRoot.querySelector('[data-alarm-code]');
      if (input) input.disabled = !codeFormat || !ready || this._alarmBusy;
      for (const button of this.shadowRoot.querySelectorAll('[data-alarm-action]')) {
        button.disabled = disabledAction(actions.find(action => action.service === button.dataset.alarmAction));
        button.setAttribute('aria-pressed', String(ready && selectedAction?.service === button.dataset.alarmAction));
        button.querySelector('.alarm-selected').hidden = button.getAttribute('aria-pressed') !== 'true';
      }
      const status = this.shadowRoot.querySelector('.alarm-body > .state');
      if (status) status.textContent = problem ? problemLabel(problem, this._hass) : entityStateLabel(state, entity, 'md_security_card', this._hass);
      const slide = this.shadowRoot.querySelector('marao-slide-to-open');
      if (slide) { slide.classList.toggle('selected', ready && state.state === 'disarmed'); slide.hass = this._hass; }
      if (layout === 'dropdown') this._syncSceneDropdown(entity, !ready || this._alarmBusy);
    };
    if (body && structure === this._alarmStructure) { sync(); return; }
    this._alarmStructure = structure;
    this._sceneDropdown?.destroy(); this._sceneDropdown = null;
    this._cancelHold();
    const label = localize("alarm.code", this._hass, {}, "Alarm code");
    this._setMarkup(`<style>${cardStyles()}
      .alarm-body { display:grid; grid-template-columns:minmax(0,1fr); gap:12px; padding:16px; min-width:0; font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); line-height:1.25; }
      .alarm-body > * { grid-area:auto; min-width:0; }
      .alarm-body > .state { height:1.25em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .alarm-actions { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }
      .alarm-actions:empty {display:none}
      .alarm-disarm {grid-column:1/-1;width:100%}
      .alarm-disarm.selected {--secondary-background-color:var(--alarm-selected-background);--primary-text-color:var(--alarm-selected-text)}
      .alarm-body .alarm-action button {display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
      .alarm-action ha-icon {flex:0 0 24px;--mdc-icon-size:24px}
      .alarm-action .alarm-selected {position:absolute;top:8px;right:8px;--mdc-icon-size:16px}
      .alarm-action .alarm-selected[hidden] {display:none}
      .alarm-body .alarm-action button[aria-pressed=true],.alarm-body .marao-dropdown button[aria-checked=true],.alarm-body .marao-dropdown>button.selected {background:var(--alarm-selected-background);color:var(--alarm-selected-text);opacity:1}
      .alarm-body .marao-dropdown [data-scene-label],.alarm-body .marao-dropdown .alarm-option-label {flex:1;min-width:0}
      .alarm-body .marao-dropdown button[aria-checked=true] {box-shadow:none}
      .alarm-action { position:relative; min-width:0; border-radius:16px; }
      .alarm-action button { position:relative; width:100%; min-height:max(72px,calc(2.5em + 24px)); padding:12px; border-radius:16px; font:inherit; overflow-wrap:anywhere; user-select:none; -webkit-user-select:none; touch-action:manipulation; color:var(--primary-text-color); background:var(--ha-card-background,var(--card-background-color)); }
      .alarm-action button:disabled { opacity:.6; background:var(--secondary-background-color); }
      .alarm-body label { display:grid; grid-template-columns:minmax(0,1fr); gap:8px; overflow-wrap:anywhere; }
      .alarm-body input { box-sizing:border-box; width:100%; min-width:0; height:max(48px,calc(1.25em + 20px)); min-height:48px; padding:10px; border:1px solid currentColor; border-radius:12px; background:var(--ha-card-background,var(--card-background-color)); color:inherit; font:inherit; outline:none; }
      @container marao-card (max-width:240px) { .alarm-actions { grid-template-columns:minmax(0,1fr); } }
    </style><ha-card style="${esc(problemStyle(problem) || "")}">${problem && problem.kind !== "loading" ? `<button class="card-action problem-details" data-problem-details type="button" aria-label="${esc(problem.reason)}"></button>` : ""}<div class="alarm-body" style="${esc(selectionStyle)}">
      <div class="state" aria-live="polite">${esc(problem ? problemLabel(problem, this._hass) : entityStateLabel(state, entity, "md_security_card", this._hass))}</div>
      ${`<label${!codeFormat ? ' class="placeholder" aria-hidden="true"' : ""}>${esc(label)}<input data-alarm-code type="password" inputmode="${codeFormat === "number" ? "numeric" : "text"}" autocomplete="off" aria-label="${esc(label)}"${!codeFormat || !ready || this._alarmBusy ? " disabled" : ""}></label>`}
      ${layout === 'dropdown' ? `<div class="marao-dropdown" data-scene-picker><button type="button" data-scene-select aria-haspopup="menu" aria-expanded="false" aria-controls="alarm-modes"${!ready || this._alarmBusy ? " disabled" : ""}><ha-icon data-alarm-mode-icon icon="mdi:shield" aria-hidden="true"></ha-icon><span data-scene-label></span><ha-icon icon="mdi:chevron-down" aria-hidden="true"></ha-icon></button><div id="alarm-modes" class="marao-dropdown-options" data-scene-menu role="menu" hidden>${actions.map(action => `<button type="button" role="menuitemradio" aria-checked="false" data-scene-option="${action.service}"><ha-icon icon="${alarmModeIcons[action.mode]}" aria-hidden="true"></ha-icon><span class="alarm-option-label">${esc(localize(`alarm.${action.mode}`, this._hass, {}, action.mode.replaceAll('_', ' ')))}</span><ha-icon icon="mdi:check" aria-hidden="true"></ha-icon></button>`).join('')}</div></div>` : `<div class="alarm-actions">${actions.filter(action => action.mode !== 'disarm').map(action => {
        const name = localize(`alarm.${action.mode}`, this._hass, {}, action.mode.replaceAll("_", " "));
        const caption = action.hold ? localize("access.hold_to_activate", this._hass, { action: name }, `Hold to ${name}`) : name;
        const disabled = !ready || this._alarmBusy || state.state === `armed_${action.mode}`
          || action.mode === "disarm" && state.state === "disarmed";
        return `<div class="alarm-action"><button type="button" data-alarm-action="${action.service}" aria-label="${esc(caption)}" aria-pressed="${ready && selectedAction?.service === action.service}"${disabled ? " disabled" : ""}><ha-icon icon="${alarmModeIcons[action.mode]}" aria-hidden="true"></ha-icon><span>${esc(caption)}</span><ha-icon class="alarm-selected" icon="mdi:check" aria-hidden="true"${ready && selectedAction?.service === action.service ? "" : " hidden"}></ha-icon></button>${action.hold ? '<svg class="hold-progress" aria-hidden="true"><rect x="1.5" y="1.5" pathLength="100"></rect></svg>' : ""}</div>`;
      }).join("")}</div>${layout === 'grid' ? `<marao-slide-to-open class="alarm-disarm${ready && state.state === 'disarmed' ? ' selected' : ''}"></marao-slide-to-open>` : ''}`}</div></ha-card>`);
    this.shadowRoot.querySelector('[data-problem-details]')?.addEventListener('click', event => { event.stopPropagation(); showCardDetails(this, problem.reason, event.currentTarget); });
    const input = this.shadowRoot.querySelector("[data-alarm-code]");
    if (input) {
      input.value = this._alarmPIN || "";
      input.addEventListener("input", () => { this._alarmPIN = input.value; });
    }
    for (const button of this.shadowRoot.querySelectorAll("[data-alarm-action]")) {
      const service = button.dataset.alarmAction;
      const action = actions.find(item => item.service === service);
      if (action.hold) this._bindHoldAction(button, button.parentElement, () => this._sendAlarm(service, "hold"));
      else this._bindTapAction(button, button.parentElement, () => this._sendAlarm(service));
    }
    sync();
    restoreFocus?.();
  }

  async _sendAlarm(service, confirmation = "") {
    const entity = text(this._config.entity), state = stateOf(this._hass, entity);
    const action = alarmActions(state).find(item => item.service === service);
    const layout = this._config.variables?.alarm_layout || 'dropdown';
    const confirmed = layout === 'dropdown' ? confirmation === 'dropdown'
      : layout === 'grid' && service === 'alarm_disarm' ? confirmation === 'slide'
        : !action?.hold || confirmation === 'hold';
    if (!state.state || !action || !confirmed || this._alarmBusy || this._actionLive === false
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
    if (confirmation === "slide") this.shadowRoot.querySelector("marao-slide-to-open")?._animateCompletion();
    const data = { entity_id: entity };
    if (alarmCodeRequired(state, service)) data.code = code;
    try { await this._callService("alarm_control_panel", service, data); }
    finally { if (this._config === config) { this._alarmBusy = false; this._renderAlarm(); } }
  }

  _subscribeClimate() {
    const entity = this._climateConnected && this._config.template === "md_climate_card" && domainOf(this._config.entity) === "climate" ? this._config.entity : "";
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

  _sliderCurrent(kind, attrs = {}, entity = this._config.entity) {
    if (kind === 'md_light_card') return Number(attrs.brightness) * 100 / 255 || 0;
    const value = kind === 'md_cover_card' || kind === 'md_fan_card' && domainOf(entity) === 'cover' ? attrs.current_position : attrs.percentage;
    return ['number','string'].includes(typeof value) && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100 ? Number(value) : null;
  }

  _cancelSliderGesture() {
    if (!this._sliderGesture) return;
    this._sliderGesture.cancelled = true;
    this._sliderTargets.delete(this._sliderGesture.key);
    this._sliderGesture = null;
  }

  _range(entity, state, kind, disabled = false, stateLabel) {
    if (["md_light_card", "md_fan_card"].includes(kind) && this._config.variables?.enable_slider === false) return "";
    const attrs = state.attributes || {};
    if (kind === "md_light_card" && Array.isArray(attrs.supported_color_modes)
      && !attrs.supported_color_modes.some((mode) => mode !== "onoff" && mode !== "unknown")) return "";
    const cover = kind === 'md_cover_card' || kind === 'md_fan_card' && domainOf(entity) === 'cover';
    if ((cover || kind === 'md_fan_card') && (this._sliderCurrent(kind, attrs, entity) === null || !(Number(attrs.supported_features) & (cover ? 4 : 1)))) return '';
    if (kind === 'md_fan_card' && cover && isAccessCover(entity, state)) return '';
    const key = `${kind}:${entity}`;
    if (kind === "md_climate_card") {
      const settings = climateSettings(entity, state);
      const target = climateTarget(settings.attributes, settings.mode);
      const label = this._config.variables?.setpoint_label || localize("climate.target_temperature", this._hass, {}, "Target temperature");
      return numberStepper(target, label, "", "climate-stepper", disabled, this._hass);
    }
    if (kind === "md_number_card") {
      const value = Number(state.state);
      return numberStepper(Number.isFinite(value) ? value : '—', this._label(entity, this._config, state), text(attrs.unit_of_measurement), "number-card-stepper", disabled, this._hass);
    }
    if (kind === "md_wallbox_current_card") {
      const value = Number(state.state);
      return numberStepper(Number.isFinite(value) ? value : '—', this._label(entity, this._config, state), text(attrs.unit_of_measurement || 'A'), "wallbox-stepper", disabled, this._hass);
    }
    const ranges = {
      md_light_card: [0, 100, this._sliderCurrent(kind, attrs, entity), "brightness", 1],
      md_cover_card: [0, 100, this._sliderCurrent(kind, attrs, entity), "position", 1],
      md_fan_card: [0, 100, this._sliderCurrent(kind, attrs, entity), cover ? "position" : "percentage", 1],
    }[kind];
    if (kind === "md_access_slide_action_card") {
      const renderedState = disabled ? "unavailable" : text(state.state);
      return `<marao-slide-to-open entity="${esc(entity)}" state="${esc(renderedState)}" aria-disabled="${disabled}"></marao-slide-to-open>`;
    }
    if (!ranges) return "";
    const [min, max, current, mode, step] = ranges;
    const modeLabel = localize(`controls.${kind === "md_fan_card" && cover ? "opening" : mode}`, this._hass, {}, climateModeLabel(mode, this._hass));
    const stored = this._sliderTargets.get(key);
    const value = Number.isFinite(stored) && Math.abs(stored - current) > step / 2 ? stored : current;
    if (stored != null && value === current) this._sliderTargets.delete(key);
    return sliderMarkup({ key, current, value, min, max, step, label: modeLabel, disabled, stateLabel });
  }

  _graphAvailability(entity, hass = this._hass) {
    if (!hass || hass.connected === false || hass.connection?.connected === false) return "unavailable";
    const state = hass.states?.[entity]?.state;
    return !state || state === "unknown" ? "unknown" : state === "unavailable" ? "unavailable" : "";
  }

  _observeGraph() {
    if (!this._graphEntity()) {
      this._graphObserver?.disconnect(); this._graphObserver = null; this._graphVisible = undefined;
    } else if (this.isConnected && !this._graphObserver && globalThis.IntersectionObserver) {
      const observer = this._graphObserver = new IntersectionObserver(entries => {
        if (this._graphObserver !== observer || !this.isConnected) return;
        const wasVisible = this._graphVisible;
        this._graphVisible = entries.at(-1).isIntersecting;
        if (this._graphVisible && wasVisible === false) this._render();
      }, { rootMargin: '150px' });
      this._graphObserver.observe(this);
    }
  }

  _rememberGraphReading(entity, record) {
    if (!record) return;
    const start = Date.now() - 24 * 60 * 60 * 1000, stamp = historyTimestamp(record);
    if (!Number.isFinite(stamp) || stamp < start) return;
    const original = this._graphHistory.get(entity);
    let records = original;
    if (records !== this._ownedGraphRecords) {
      // Own the rolling buffer; never append to or sort the Recorder response.
      records = [...new Map(original.filter(item => Number.isFinite(historyTimestamp(item))).map(item => [historyTimestamp(item), item])).values()]
        .sort((a, b) => historyTimestamp(a) - historyTimestamp(b));
      this._graphHistory.set(entity, records); this._ownedGraphRecords = records;
      if (this._graphData?.records === original) this._graphData.records = records;
    }
    insertHistoryRecord(records, record); trimHistory(records, start);
    if (this._graphData?.records === records) {
      this._graphData.add(record); trimHistory(this._graphData.values, start);
    }
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
      || ["md_graph_card", "md_toggle_graph_card", "md_switch_card", "md_sensor_card", "md_base_card"].includes(this._config.template || "md_base_card")
        && energyFormatting(this._config.variables || {});
  }

  _graphValues(entity, variables = {}) {
    const end = Date.now(), start = end - 24 * 60 * 60 * 1000;
    const state = stateOf(this._hass, entity);
    const energy = this._energyGraphSource(state), historyVariables = this._config.template === 'md_climate_card' ? {} : variables;
    const records = this._graphHistory.get(entity);
    const key = JSON.stringify([entity, energy, state.attributes?.unit_of_measurement, historyVariables.display_unit, historyVariables.display_precision]);
    let cache = this._graphData;
    if (!cache || cache.records !== records || cache.key !== key) {
      cache = { records, key, errors: new Set() };
      const convert = (_value, record) => {
        const reading = energy ? energyHistoryValue(record, state.attributes?.unit_of_measurement, historyVariables) : { value: Number(record.state) };
        if (reading?.error) cache.errors.add(historyTimestamp(record));
        return reading?.error ? null : reading?.value;
      };
      cache.values = historyData.normalizeSamples(records || [], { convert });
      cache.add = (record, live = false) => {
        cache.errors.delete(historyTimestamp(record));
        const [sample] = historyData.normalizeSamples(live ? [] : [record], { convert, ...(live ? { live: record } : {}) });
        if (sample) insertHistoryRecord(cache.values, sample);
      };
      this._graphData = cache;
    }
    if (cache.live !== state) { cache.add(state, true); cache.live = state; }
    for (const time of cache.errors) if (time < start) cache.errors.delete(time);
    return { values: cache.values.filter(record => record.time >= start && record.time <= end), error: cache.errors.size > 0 };
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
    return `<svg class="graph-background" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect class="tint" width="100" height="100"></rect>${markup}</svg>`;
  }

  _syncGraphColor(card, variables) {
    const graph = this.shadowRoot.querySelector('.graph-background');
    if (!graph) return;
    const color = text(variables.graph_color).trim() || 'var(--marao-chart-2,var(--color-purple))';
    graph.style.setProperty('--marao-graph-color', readableGraphColor(card, color, {
      background: getComputedStyle(card).backgroundColor, tint: text(variables.graph_background).trim(),
    }));
  }

  _graphEntity() {
    const variables = this._config.variables || {};
    return text(variables.graph_entity || variables.power_entity || (["md_graph_card", "md_toggle_graph_card"].includes(this._config.template) ? this._config.entity : ''));
  }
  _historyOptions() {
    const variables = this._config.variables || {}, entity = this._graphEntity(), state = stateOf(this._hass, entity);
    const energy = this._energyGraphSource(state), historyVariables = this._config.template === 'md_climate_card' ? {} : variables;
    const climate = this._config.template === 'md_climate_card';
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
  _activityOptions() {
    return {hass:this._hass,sources:activitySources(this._config,this._activityEntity||this._config.entity),haptic};
  }
  _openActivity(opener,entity=this._config.entity) {
    if(this.preview || !serviceConnectionReady(this._hass))return;
    haptic('heavy');this._activityEntity=entity;
    this._detailPopup(localize('activity.title',this._hass,{},'Activity')).openHistory(this,opener,'activity');
  }
  _openHistory(opener) {
    if (this.preview || this._graphAvailability(this._graphEntity())) return;
    haptic('heavy');
    const options = this._config.variables || {}, source = stateOf(this._hass, this._graphEntity());
    if (options.history_popup && options.popup_hash && (energyUnits[source.attributes?.unit_of_measurement]?.[0] === 'power' || options.power_devices?.length)) {
      navigate(options.popup_hash); return;
    }
    const popup = this._detailPopup(this._label(this._graphEntity(), this._config, stateOf(this._hass, this._graphEntity())));
    popup.openHistory(this, opener);
  }

  _openLightColor(opener) {
    const state = stateOf(this._hass, this._config.entity), capability = lightColorCapabilities(state);
    if (this.preview || !serviceConnectionReady(this._hass) || !serviceTargetReady(this._hass, this._config.entity) || !(capability.color || capability.temperature)) return;
    haptic('heavy');
    this._detailPopup(this._label(this._config.entity, this._config, state)).openLightColor(this, opener);
  }

  _lightColorOptions() {
    const entity = this._config.entity;
    return { entity, hass: this._hass, localize: (key, placeholders, fallback) => localize(key, this._hass, placeholders, fallback), haptic,
      callService: async data => {
        if (this.preview || entity !== this._config.entity) return;
        const outcome = serviceOutcome(this);
        let failure;
        await callServiceWithNotification(this._hass, 'light', 'turn_on', { ...data, entity_id: entity }, (status, error) => {
          outcome(status, error);
          if (status === 'error') failure = error;
        });
        if (failure) throw failure;
      },
    };
  }

  _detailPopup(title) {
    const overlays = new Set();
    for (let node = this; node; node = node.parentElement || node.getRootNode()?.host) if (node.classList?.contains('marao-popup-overlay')) overlays.add(node);
    let popup = findElements('marao-popup-card').find(popup => popup._open && overlays.has(popup._overlay));
    if (!popup) {
      this._historyPopup ||= document.createElement('marao-popup-card');
      popup = this._historyPopup; popup._transientHistory = true;
      popup.setConfig({ title, cards: [] });
      if (!popup.isConnected) this.shadowRoot.append(popup);
    }
    if (!popup._open) popup.hass = this._hass;
    return popup;
  }

  _render() {
    if (!this.shadowRoot) return;
    if (this._graphVisible === false && this.shadowRoot.querySelector('ha-card')) {
      this._activeHistoryPopup?._refreshHistory();
      return;
    }
    if(this._config.template==='md_weather_card') {
      const config=this._config,entity=config.entity,state=stateOf(this._hass,entity),attrs=state.attributes||{},unavailable=!state.state||['unknown','unavailable'].includes(state.state)||!serviceConnectionReady(this._hass);
      const condition=entityStateLabel(state,entity,'md_weather_card',this._hass);
      const stationConfig=config.variables?.station_entities,station=stationConfig&&Object.fromEntries(Object.entries(stationConfig).map(([key,id])=>[key,stateOf(this._hass,id)]));
      this._setMarkup(weatherMarkup({hass:this._hass,state,name:station?(config.name||this._label(entity,config,state)):this._label(entity,config,state),condition,unavailable,station,showForecast:!station&&config.variables?.show_forecast!==false,showName:config.show_name!==false,showState:config.show_state!==false,showWindAngle:config.variables?.show_wind_angle===true,showIcon:config.show_icon!==false,icon:config.icon,customAction:Boolean(config.tap_action||config.hold_action),actionDisabled:unavailable||this.preview}), 'weather');
      const openForecast=()=>{if(unavailable||this.preview||config.variables?.show_forecast===false)return;haptic('heavy');const popup=this._detailPopup(this._label(entity,config,state));popup.setConfig({title:this._label(entity,config,state),cards:[{type:'custom:marao-weather-forecast',entity,features:attrs.supported_features||0,unit:attrs.temperature_unit||this._hass?.config?.unit_system?.temperature||'',legacy:attrs.forecast||[]}]});popup.hass=this._hass;popup._openSheet();};
      const actionButton=this.shadowRoot.querySelector('[data-weather-action]');if(actionButton){const primary=()=>config.tap_action?this._performAction(config.tap_action,entity):openForecast();if(config.hold_action)this._bindHoldAction(actionButton,this.shadowRoot.querySelector('ha-card'),()=>this._performAction(config.hold_action,entity),primary);else actionButton.onclick=primary;}
      if(this._historyPopup?._open)this._historyPopup.hass=this._hass;
      const button=this.shadowRoot.querySelector('[data-weather-forecast]');if(button)button.onclick=openForecast;
      return;
    }
    if(this._config.template==='md_people_card') {
      const rows=peopleRows(this._config,this._hass),e=escapeText;
      this._setMarkup(`<style>${cardStyles()}.people{display:grid;gap:16px;padding:16px;min-width:0}.people h2{margin:0;font:inherit;font-weight:700;overflow-wrap:anywhere}${controlGridStyles('.people ul')}.people ul{--marao-control-columns:${this._config.columns ?? 1};--marao-control-gap:16px;list-style:none;margin:0;padding:0}.people li{flex-wrap:wrap}.people li{display:flex;align-items:center;gap:12px;min-width:0}.people .person-icon{flex:0 0 48px;width:48px;height:48px;align-self:center;overflow:hidden}.people img{width:48px;height:48px;object-fit:cover}.people .copy{min-width:0;overflow-wrap:anywhere}.people .person-problem{color:var(--secondary-text-color)}</style><ha-card><div class="people"><h2>${e(this._config.name || collectionLabel('People',this._hass))}</h2><ul>${rows.map(row=>`<li${row.problem?' class="person-problem"':''}><span class="icon person-icon">${row.picture?`<img alt="" src="${e(row.picture)}"><ha-icon hidden icon="${e(row.icon)}"></ha-icon>`:`<ha-icon icon="${e(row.icon)}"></ha-icon>`}</span><div class="copy"><strong>${e(row.name)}</strong><div>${e(row.place)}</div></div></li>`).join('')}</ul>${!rows.length?e(collectionLabel('No people selected',this._hass)):''}</div></ha-card>`,JSON.stringify([rows,this._config.columns]));
      this.shadowRoot.querySelectorAll('img').forEach(img=>{img.onerror=()=>{img.hidden=true;img.nextElementSibling.hidden=false;};});return;
    }
    if (this._config.template === "md_alarm_controls_card") { this._renderAlarm(); return; }
    const gesture = this._sliderGesture;
    if (gesture?.input.isConnected) {
      const state = stateOf(this._hass, this._config.entity);
      if (gesture.key === `${this._config.template}:${this._config.entity}` && serviceConnectionReady(this._hass)
        && state.state && !["unknown", "unavailable"].includes(text(state.state).toLowerCase())
        && this._range(this._config.entity, state, this._config.template)) {
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
    const configuredKind = text(config.template, "md_base_card");
    const exhaust = configuredKind === 'md_fan_card' && domainOf(entity) === 'cover';
    const unsafeExhaust = exhaust && isAccessCover(entity, stateOf(this._hass, entity));
    const entityGroup = configuredKind === 'md_entity_group_card';
    const roomLights = configuredKind === "md_room_card" ? roomLightEntities(config) : [];
    const loading = !this._hass?.states;
    const originalState = layoutState(this, loading ? {} : stateOf(this._hass, entity));
    const summaryEntities = configuredKind === "md_room_card" ? roomLights : variables.summary_entities;
    const summary = entityGroup ? entityGroupState(variables.entity_type, summaryEntities, this._hass)
      : !loading && Array.isArray(summaryEntities) && summaryEntities.length ? summaryState(summaryEntities, this._hass) : null;
    const state = summary ? { ...originalState, state: summary.state } : configuredKind === "md_room_card" ? { ...originalState, state: "off" } : originalState;
    const accessService = variables.action_service || config.tap_action?.service || config.tap_action?.perform_action;
    const requiresSlide = variables.access_mode !== "popup" && configuredKind.startsWith("md_access_") && ["lock.unlock", "cover.open_cover"].includes(accessService);
    const kind = requiresSlide ? "md_access_slide_action_card" : entityGroup ? 'md_navigation_card' : configuredKind;
    const camera = kind === "md_camera_card";
    const graphEntity = text(variables.graph_entity || variables.power_entity || (["md_graph_card", "md_toggle_graph_card"].includes(kind) ? entity : ""));
    const showsGraph = Boolean(graphEntity) && (["md_graph_card", "md_toggle_graph_card"].includes(kind) || variables.show_graph === true);
    const toggleEntity = kind === "md_toggle_graph_card" ? text(variables.toggle_entity) : "";
    const interactionState = toggleEntity ? stateOf(this._hass, toggleEntity) : state;
    const binary = entityGroup || kind === "md_room_card" && !roomLights.length ? null : binaryState(summary ? "binary_sensor.marao_summary" : toggleEntity || entity, interactionState, kind);
    const binaryLayout = binary !== null || binaryState(summary ? 'binary_sensor.marao_summary' : toggleEntity || entity, { state: domainOf(entity) === 'lock' ? 'locked' : kind === 'md_washing_machine_card' ? 'idle' : 'off' }, kind) !== null;
    const redundantState = kind !== "md_access_card" && binary !== null && (!toggleEntity || toggleEntity === entity) && (!summary || summary.state === 'off' && serviceTargetReady(this._hass, variables.summary_entities));
    const pictureURL = ["md_camera_card", "md_media_card"].includes(kind) && state.state !== "off" ? text(state.attributes?.entity_picture) : "";
    if (pictureURL !== this._mediaURL) { this._mediaURL = pictureURL; this._mediaError = ""; }
    const formatting = energyFormatting(variables);
    const formattedPrimary = formatting && ["md_graph_card", "md_toggle_graph_card", "md_sensor_card", "md_base_card"].includes(kind)
      ? energyValue(state.state, state.attributes?.unit_of_measurement, variables) : null;
    const power = kind === "md_switch_card" && variables.power_entity ? stateOf(this._hass, variables.power_entity) : null;
    const formattedPower = formatting && power ? energyValue(power.state, power.attributes?.unit_of_measurement, variables) : null;
    const graphData = showsGraph ? this._graphValues(graphEntity, variables) : {values: [], error: false};
    const formatError = formattedPrimary?.error || formattedPower?.error || graphData.error
      ? localize("energy.format_error", this._hass, {}, "Reading format is incompatible with its source unit") : "";
    const problem = cardProblem(config, this._hass, {
      error: this._actionError,
      contentError: [unsafeExhaust ? localize("fan.access_restricted", this._hass, {}, "Use an access card for doors, garages and gates.") : "", formatError, this._cameraError, this._mediaError, showsGraph && this._graphErrors.has(graphEntity) ? localize("timeline.history_unavailable", this._hass, {}, "History unavailable") : ""].filter(Boolean).join(" · "),
    });
    const requestedClimate = kind === "md_climate_card" ? climateSettings(entity, state) : null;
    const value = loading ? "loading" : requestedClimate?.mode || text(state.state, "unknown");
    const batteryGroup = entityGroup && variables.entity_type === 'battery' && summary.minimumReading !== null;
    const batteryConfig = batteryGroup && variables.md_color ? { ...config, variables: { ...variables, active_color: variables.md_color } } : config;
    const appearance = stateAppearance(batteryGroup ? 'md_battery_card' : kind, batteryGroup ? summary.minimumReading : value, batteryConfig, this._hass);
    const interactionUnavailable = ["unknown", "unavailable"].includes(text(interactionState.state, "unknown").toLowerCase());
    const stateDisabled = loading || entityGroup && (this._hass?.connected === false || this._hass?.connection?.connected === false)
      || Boolean(entity || toggleEntity || entityGroup) && (toggleEntity ? interactionUnavailable : appearance.unavailable);
    const serviceReady = serviceConnectionReady(this._hass);
    const controlsDisabled = !serviceReady || interactionUnavailable || unsafeExhaust;
    const stateIcon = kind === "md_sensor_card" && value === "off" ? variables.off_icon
      : ["md_sensor_card", "md_battery_card"].includes(kind) ? variables.on_icon : kind === "md_vacuum_card" ? variables.icon : "";
    const icon = text(config.icon || stateIcon || state.attributes?.icon || (exhaust ? 'mdi:air-filter' : kind === 'md_dishwasher_card' ? 'mdi:dishwasher' : ''));
    const climate = kind === "md_climate_card" ? state.attributes || {} : null;
    const customLabel = text(variables.custom_label).trim();
    const displayValue = kind === "md_room_card" ? /[:：]$/.test(customLabel) ? "" : customLabel : redundantState
      ? /[:：]$/.test(customLabel) ? "" : customLabel
      : `${variables.custom_label || variables.md_label_prefix || ""}${summary?.label || (requestedClimate?.pending ? climateModeLabel(value, this._hass) : (formattedPrimary ? energyLabel(formattedPrimary, variables, this._hass) : entityStateLabel(state, entity, kind, this._hass)))}`;
    const climatePending = requestedClimate?.pending ? `<div class="climate-pending" role="status">${esc(localize("climate.updating", this._hass, {}, "Updating…"))}</div>` : "";
    const currentTemperature = climate && climate.current_temperature != null ? text(climate.current_temperature) : "";
    const climateReadingLabel = currentTemperature ? localize("climate.current_temperature", this._hass, { value: currentTemperature }, `Current ${currentTemperature}`) : "";
    const climateModes = Array.isArray(climate?.hvac_modes) ? climate.hvac_modes.filter(Boolean).map(text) : [];
    const climateDetail=Boolean(climate && this.climateDetail);
    const modeHeading=`${localize('climate.mode',this._hass,{},String(this._hass?.language||'').startsWith('pt')?'Modo':'Mode')} - ${climateModeLabel(value,this._hass)}`;
    const modeButtons = climate && (climateDetail || variables.enable_popup===false && variables.show_mode_buttons!==false)
      ? `<div class="climate-mode-picker"><div class="climate-mode-heading">${esc(modeHeading)}</div><div class="climate-modes" role="group" aria-label="${esc(modeHeading)}">${climateModes.map(mode=>`<button class="climate-mode${mode===value?' active':''}" type="button" data-climate-mode="${esc(mode)}" aria-label="${esc(climateModeLabel(mode,this._hass))}" aria-pressed="${mode===value}"${controlsDisabled?' disabled':''}><ha-icon icon="${esc(climateModeIcon(mode))}" aria-hidden="true"></ha-icon>${mode===value?'<span class="mode-check" aria-hidden="true">✓</span>':''}</button>`).join('')}</div></div>` : '';
    const shortcuts = kind === "md_wallbox_current_card"
      ? (Array.isArray(config.variables?.shortcuts) ? config.variables.shortcuts : []).map(Number).filter(Number.isFinite).slice(0, 3)
      : [];
    const shortcutButtons = shortcuts.length
      ? `<div class="wallbox-shortcuts" role="group" aria-label="${esc(localize("wallbox.shortcuts", this._hass, {}, "Charging current shortcuts"))}">${shortcuts.map((shortcut) => `<button type="button" data-current-shortcut="${shortcut}" aria-pressed="${!controlsDisabled && !loading && Number(state.state) === shortcut}"${controlsDisabled ? " disabled" : ""}>${esc(shortcut)}${esc(state.attributes?.unit_of_measurement || "A")}</button>`).join("")}</div>`
      : "";
    const roomLightsControlDisabled = loading || !serviceReady || !serviceTargetReady(this._hass, roomLights);
    const roomLightsOffLabel = localize("room.turn_off_lights", this._hass, { name: this._label(entity, config, state) }, `Turn off all lights in ${this._label(entity, config, state)}`);
    const roomLightsControl = roomLights.length
      ? `<button class="room-lights-off" type="button" data-room-lights-off aria-label="${esc(roomLightsOffLabel)}" title="${esc(roomLightsOffLabel)}"${roomLightsControlDisabled ? " disabled" : ""}><ha-icon icon="mdi:lightbulb-off-outline" aria-hidden="true"></ha-icon></button>`
      : "";
    const roomHVAC = kind === 'md_room_card' ? roomClimate(config, this._hass) : {};
    const roomClimateLabel = `${localize('room.turn_off_climate',this._hass,{},'Turn off climate')}: ${this._hass?.states?.[roomHVAC.entity]?.attributes?.friendly_name || roomHVAC.entity} · ${climateModeLabel(roomHVAC.activity, this._hass)}`;
    const roomClimateControl = roomHVAC.entity ? `<button class="room-lights-off room-climate-off" type="button" data-room-climate-off data-active="${roomHVAC.enabled && roomHVAC.activity !== 'idle'}" aria-label="${esc(roomClimateLabel)}"${!serviceReady || !roomHVAC.enabled || !roomHVAC.service ? ' disabled' : ''}><ha-icon icon="${esc(roomHVAC.icon)}" aria-hidden="true"></ha-icon></button>` : '';
    const sceneOptions = kind === "md_scene_card" && ["input_select", "select"].includes(domainOf(entity)) && Array.isArray(state.attributes?.options)
      ? state.attributes.options.filter((option) => typeof option === "string")
      : [];
    const sceneDropdown = kind === 'md_scene_card' && ['input_select','select'].includes(domainOf(entity))
      ? `<div class="scene-options marao-dropdown" data-scene-picker data-scene-identity="${esc(JSON.stringify([entity,sceneOptions]))}"><button type="button" data-scene-select aria-label="${esc(this._label(entity, config, state))}" aria-haspopup="menu" aria-expanded="false"${controlsDisabled || !sceneOptions.length ? " disabled" : ""}><span data-scene-label>${esc(entityStateLabel(state, entity, kind, this._hass))}</span><ha-icon icon="mdi:chevron-down" aria-hidden="true"></ha-icon></button><div class="marao-dropdown-options" data-scene-menu role="menu" aria-label="${esc(this._label(entity, config, state))}" hidden>${sceneOptions.map(option=>`<button type="button" role="menuitemradio" tabindex="-1" data-scene-option="${esc(option)}" aria-checked="${!controlsDisabled && option === value}"${controlsDisabled ? " disabled" : ""}><span>${esc(option)}</span><ha-icon icon="mdi:check" aria-hidden="true"></ha-icon></button>`).join('')}</div></div>`
      : "";
    const humidity=climate?climateHumidity(variables,this._hass):null;
    const climateControls = climate ? `<div class="climate-readings"><div class="climate current-temperature" aria-label="${esc(climateReadingLabel)}">${esc(currentTemperature || '—')}</div>${humidity===null?'':`<div class="climate-humidity" aria-label="${esc(localize('climate.humidity',this._hass,{},String(this._hass?.language||'').startsWith('pt')?'Humidade':'Humidity'))}">${esc(humidity)}</div>`}${config.show_state===false?'':`<div class="climate-activity">${esc(interactionUnavailable?'—':climateModeLabel(climate.hvac_action || state.state,this._hass))}</div>`}</div>` : "";
    const previewAvailable = !loading && !interactionUnavailable && this._hass?.connected !== false && this._hass?.connection?.connected !== false;
    const mediaAvailable = previewAvailable && value !== "off";
    let media = "";
    if (camera && this.preview) media = `<div class="camera-preview">${!interactionUnavailable && pictureURL ? `<img src="${esc(pictureURL)}" alt="${esc(this._label(entity, config, state))}">` : ''}<span>${esc(localize(!interactionUnavailable && pictureURL ? 'camera.snapshot' : loading ? 'common.loading' : 'common.unavailable', this._hass))}</span></div>`;

    const range = this._range(entity, state, kind, controlsDisabled, kind === 'md_cover_card' && config.show_state !== false ? displayValue : undefined);
    const stateInSlider = kind === 'md_cover_card' && Boolean(range);
    const artwork = !problem && kind === "md_media_card" && (!variables.now_playing || !["idle", "off", "standby"].includes(value)) && mediaAvailable && variables.md_show_background_art !== false && state.attributes?.entity_picture
      ? `<div class="media-artwork" aria-hidden="true"><img src="${esc(state.attributes.entity_picture)}" alt=""></div>` : "";
    const glance = kind === "md_glance_card";
    let readings = glance ? [1,2,3].filter((index) => variables[`entity${index}`]).map((index) => readingMarkup(variables[`entity${index}`], variables[`entity${index}_name`], variables[`entity${index}_icon`], this._hass, "md_sensor_card", config.show_icon !== false && variables.show_icon !== false, variables.show_reading_names !== false)).join("") : "";
    const locale = this._hass?.locale?.language || this._hass?.language || "en";
    let details = "";
    if (kind === "md_switch_card" && variables.power_entity) {
      const reading = formattedPower ? energyLabel(formattedPower, variables, this._hass) : Number.isFinite(Number(power.state)) && power.state !== "" && power.state != null
        ? `${power.state} ${variables.power_unit || power.attributes?.unit_of_measurement || "W"}` : entityStateLabel(power, variables.power_entity, "md_sensor_card", this._hass);
      details = `<div class="climate">${esc(reading)}</div>`;
    }
    if (kind === "md_media_card") {
      details = `<div class="climate${mediaAvailable && state.attributes?.media_title ? '' : ' placeholder'}">${esc(mediaAvailable ? [state.attributes.media_title, state.attributes.media_artist].filter(Boolean).join(' · ') || '—' : '—')}</div>`;
      if (variables.now_playing) {
        const empty = ['idle', 'off', 'standby'].includes(value);
        const attrs = state.attributes || {};
        const current = [attrs.media_title, attrs.media_artist, attrs.media_album_name || attrs.media_series_title, attrs.source || attrs.app_name].filter(Boolean);
        details = `<div class="climate" data-now-playing>${esc(problem ? '' : empty ? localize('media.nothing_playing', this._hass, {}, 'Nothing playing') : current.join(' · ') || localize('media.metadata_missing', this._hass, {}, 'Media details unavailable'))}</div>`;
      }
    }
    if (kind === "md_header_card") {
      details = `<div class="climate">${esc(new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: this._hass?.config?.time_zone }).format(new Date()))}</div>`;
      if (variables.person_entity) readings += readingMarkup(variables.person_entity, "", "mdi:account", this._hass, "person");
      if (variables.air_quality_sensor) readings += readingMarkup(variables.air_quality_sensor, "", "mdi:air-filter", this._hass);
    }
    if (kind === "md_dishwasher_card") readings += dishwasherReadings(variables, this._hass, state.state);
    const accessPopup = ['md_access_slide_action_card', 'md_access_action_card'].includes(kind) && this._inAccessPopup();
    const showName = !(accessPopup && kind === "md_access_slide_action_card") && kind !== "md_media_app_card" && config.show_name !== false && (!glance || Boolean(config.name));
    const uniformControl = standardControl(config);
    this.toggleAttribute?.('data-marao-standard-control', uniformControl);
    const sliderHeader = !accessPopup && showName && (uniformControl || kind === 'md_fan_card');
    const titleCard = kind === "md_title_card";
    const stateWanted = !accessPopup && kind !== "md_media_app_card" && !camera && !titleCard && !glance && (kind === "md_room_card" ? Boolean(displayValue) : Boolean(entity || entityGroup)) && config.show_state !== false;
    const showState = stateWanted;
    const showIcon = !accessPopup && !camera && !titleCard && !glance && config.show_icon !== false && variables.show_icon !== false;
    const lightCapabilities = kind === 'md_light_card' ? lightColorCapabilities(state) : {};
    const lightColor = lightCapabilities.color || lightCapabilities.temperature;
    const colorHold = lightColor && !Object.hasOwn(config, 'hold_action');
    const historyEntry = showsGraph && ['md_switch_card','md_climate_card','md_graph_card','md_toggle_graph_card'].includes(kind);
    const historyHold = historyEntry && !Object.hasOwn(config, 'hold_action') && !this._graphAvailability(graphEntity);
    this._secondaryHistory = historyHold;
    const secondaryHold = colorHold || historyHold;
    const iconOnly = !camera && !showName && !stateWanted && config.show_label === false;
    const isAction = ["md_switch_card", "md_light_card", "md_cover_card", "md_fan_card", "md_access_card"].includes(kind);
    const popupHash = config.variables?.popup_hash;
    let action = config.tap_action || (popupHash ? { action: "navigate", navigation_path: popupHash, haptic: "heavy" } : isAction ? { action: "toggle", haptic: "heavy" } : null);
    if(kind==='md_media_app_card' && !config.tap_action && typeof variables.app_source==='string' && variables.app_source.trim())action={action:'call-service',service:'media_player.select_source',data:{source:variables.app_source},haptic:'heavy'};
    if (kind === "md_climate_card" && !config.tap_action) {
      action = climateDefaultAction(climateModes, config.variables);
    }
    if (kind === "md_toggle_graph_card" && !config.tap_action && config.variables?.toggle_entity) {
      action = { action: "toggle", entity_id: config.variables.toggle_entity, haptic: "heavy" };
    }
    if (["md_access_action_card", "md_access_hold_action_card"].includes(kind) && !config.tap_action) {
      const service = text(config.variables?.action_service);
      action = service ? { action: "call-service", service, entity_id: entity, haptic: "heavy" } : null;
    }
    if (kind === "md_access_slide_action_card" || exhaust && (!config.tap_action || unsafeExhaust)) action = null;
    if (action?.action === "none") action = null;
    const usesNumberStepper = ["md_climate_card", "md_number_card", "md_wallbox_current_card"].includes(kind);
    const binaryLabel = binary === null ? "" : `${this._label(toggleEntity || entity, toggleEntity && toggleEntity !== entity ? {} : config, interactionState)}: ${entityStateLabel(interactionState, toggleEntity || entity, kind, this._hass)}`;
    const hiddenBinaryState = binaryLabel && kind !== "md_room_card" && !showIcon ? `<span class="binary-state" role="img" aria-label="${esc(binaryLabel)}"></span>` : "";
    const activityEntry = !lightColor && hasActivity(config,state);
    const app = kind === "md_media_app_card" ? mediaAppBrand(config) : null;
    const iconElement = usesNumberStepper && !historyEntry && !activityEntry ? "" : kind === "md_room_card" || !showIcon ? hiddenBinaryState : app
      ? `<img class="app-icon${app.symbol ? " app-symbol" : ""}" src="${esc(new URL(`./media-apps/${app.file || `${app.id}.png`}${new URL(import.meta.url).search}`, import.meta.url).href)}" width="64" height="64" alt="" aria-hidden="true">`
      : `<${lightColor || historyEntry || activityEntry ? `button type="button" ${lightColor ? 'data-light-color' : activityEntry ? `data-activity-open="${esc(entity)}"` : 'data-history-open'}` : 'div'} class="icon"${lightColor || historyEntry || activityEntry ? ` aria-label="${esc(activityEntry ? `${localize('activity.title',this._hass,{},'Activity')}: ${this._label(entity,config,state)}` : lightColor ? localize('light.picker', this._hass, { name: this._label(entity, config, state) }, `Change color for ${this._label(entity, config, state)}`) : localize('actions.for_target', this._hass, {action:localize('history.title',this._hass,{},'History'),name:this._label(entity,config,state)}, `History ${this._label(entity,config,state)}`))}"${binaryLabel ? ` aria-description="${esc(binaryLabel)}"` : ''}${(activityEntry ? this.preview || !serviceReady || stateDisabled : historyEntry ? this.preview || this._graphAvailability(graphEntity) : controlsDisabled) ? ' disabled' : ''}` : binaryLabel ? ` role="img" aria-label="${esc(binaryLabel)}"` : ' aria-hidden="true"'}>${icon ? `<ha-icon icon="${esc(icon)}" aria-hidden="true"></ha-icon>` : `<ha-state-icon data-state-icon aria-hidden="true"></ha-state-icon>`}${lightColor || historyEntry || activityEntry ? `<ha-icon class="palette-indicator" icon="${lightColor ? 'mdi:palette' : activityEntry ? 'mdi:history' : 'mdi:chart-line'}" aria-hidden="true"></ha-icon>` : ''}</${lightColor || historyEntry || activityEntry ? 'button' : 'div'}>`;
    const accessActionIcon = config.icon || (domainOf(entity) === 'lock'
      ? kind === 'md_access_slide_action_card' ? 'mdi:lock-open-variant' : 'mdi:lock'
      : state.attributes?.device_class === 'garage'
        ? kind === 'md_access_slide_action_card' ? 'mdi:garage-open' : 'mdi:garage'
        : kind === 'md_access_slide_action_card' ? 'mdi:door-open' : 'mdi:door-closed');
    const accessIcon = accessPopup && config.show_icon !== false && variables.show_icon !== false
      ? `<button type="button" class="access-action-icon" data-activity-open="${esc(entity)}" aria-label="${esc(localize('activity.title',this._hass,{},'Activity'))}: ${esc(this._label(entity,config,state))}"${this.preview || !serviceReady || stateDisabled ? ' disabled' : ''}><ha-icon icon="${esc(accessActionIcon)}" aria-hidden="true"></ha-icon></button>` : '';
    const roomArtwork = kind === "md_room_card" && showIcon ? `<div class="room-artwork" aria-hidden="true">${icon ? `<ha-icon icon="${esc(icon)}" aria-hidden="true"></ha-icon>` : '<ha-state-icon data-state-icon aria-hidden="true"></ha-state-icon>'}</div>` : "";
    const roomBottom = roomLightsControl || roomClimateControl || roomArtwork ? `<div class="room-bottom">${roomLightsControl}${roomClimateControl}${roomArtwork}</div>` : "";
    const controlClass = kind === "md_climate_card" ? "control number-control climate-number-control" : kind === "md_wallbox_current_card" ? "control number-control wallbox-current-control" : usesNumberStepper ? "control number-control" : "control";
    const serviceTarget = action?.target?.entity_id || action?.data?.entity_id || action?.entity_id || entity;
    const roomNavigation = kind === "md_room_card" && action?.action === "navigate";
    const actionDisabled = roomNavigation ? !text(action.navigation_path).trim() : isServiceAction(action) ? !serviceReady || !serviceTargetReady(this._hass, serviceTarget) : stateDisabled && problem?.complete !== false;
    const baseActionLabel = actionControlLabel(config, state, entity, action, this._hass);
    const targetEntity = text(action?.target?.entity_id || action?.entity_id || entity);
    const targetName = stateOf(this._hass, targetEntity).attributes?.friendly_name || targetEntity;
    const semanticActionLabel = iconOnly && isServiceAction(action) && targetName
      ? localize("actions.for_target", this._hass, { action: baseActionLabel, name: targetName }, `${baseActionLabel} ${targetName}`) : baseActionLabel;
    const holdAction = kind === "md_access_hold_action_card" && Boolean(action);
    const alternateHold = !holdAction && config.hold_action && config.hold_action.action !== "none";
    const actionLabel = holdAction ? localize("access.hold_to_activate", this._hass, { action: semanticActionLabel }, `Hold to ${semanticActionLabel}`) : semanticActionLabel;
    const roomDescription = kind === "md_room_card" && roomLights.length ? localize("room.lighting_summary", this._hass, { label: summary?.label || localize("common.loading", this._hass, {}, "Loading…") }, `Lighting: ${summary?.label || "Loading…"}`) : "";
    const feedback = problem && problem.kind !== 'loading' && !camera;
    let actionControl = action || secondaryHold ? `<button class="card-action" type="button" data-card-action${holdAction ? " data-hold-action" : ""} aria-label="${esc(actionLabel)}"${roomDescription ? ` aria-description="${esc(roomDescription)}"` : ""} title="${esc(actionLabel)}"${action ? actionDisabled ? " disabled" : "" : secondaryHold && (historyHold ? this.preview || this._graphAvailability(graphEntity) : controlsDisabled) ? " disabled" : ""}></button>` : "";
    const graphCard = showsGraph && kind === "md_graph_card";
    const graphPrimaryHistory = graphCard && !action && !config.tap_action;
    if (graphPrimaryHistory) actionControl = `<button class="card-action" type="button" data-card-action aria-label="${esc(localize('history.title', this._hass, {}, 'History'))}"${this.preview || this._graphAvailability(graphEntity) ? ' disabled' : ''}></button>`;
    if (feedback) actionControl += `<button class="card-action problem-details" type="button" data-problem-details aria-label="${esc(problem.reason)}"></button>`;
    const coverActions = exhaust ? `<div class="exhaust-actions">${[['open_cover',1,'access.open','Open'],['close_cover',2,'common.close','Close']].filter(([,feature]) => Number(state.attributes?.supported_features) & feature).map(([service,,key,fallback]) => `<button type="button" data-exhaust-action="${service}" aria-label="${esc(localize('actions.for_target', this._hass, {action:localize(key,this._hass,{},fallback),name:this._label(entity,config,state)}, `${fallback} ${this._label(entity,config,state)}`))}"${controlsDisabled ? ' disabled' : ''}><ha-icon aria-hidden="true" icon="${service==='open_cover'?'mdi:arrow-expand-vertical':'mdi:arrow-collapse-vertical'}"></ha-icon><span>${esc(localize(key,this._hass,{},fallback))}</span></button>`).join('')}</div>` : '';
    const holdProgress = holdAction || alternateHold ? '<svg class="hold-progress" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" pathLength="100"></rect></svg>' : "";
    const holdHint = holdAction ? `<div class="climate">${esc(actionLabel)}</div>` : "";
    const graphStatus = showsGraph ? loading ? "loading" : graphData.error ? "format-error" : this._graphStatus(graphEntity) : "";
    const graphMarkup = showsGraph && graphStatus === "ready" ? this._graphMarkup(graphEntity, variables, graphData) : "";
    const historyLabel = localize('history.title', this._hass, {}, 'History');
    const historyCaption = graphStatus === 'error' ? localize('common.retry', this._hass, {}, 'Retry') : graphStatus === 'loading' ? localize('common.loading', this._hass, {}, 'Loading…') : historyLabel;
    const historyControl = showsGraph && !graphCard && !historyEntry ? `<button type="button" class="history-control" ${graphStatus === 'error' ? 'data-graph-retry' : 'data-history-open'} aria-label="${esc(historyCaption)}"${this.preview || this._graphAvailability(graphEntity) ? ' disabled' : ''}>${iconOnly ? '<ha-icon icon="mdi:chart-line" aria-hidden="true"></ha-icon>' : esc(historyCaption)}</button>` : '';
    const readingContent = readings ? `<dl class="readings${kind === 'md_dishwasher_card' ? ' dishwasher-readings' : ''}">${readings}</dl>` : "";
    const supportedVacuum = kind === 'md_vacuum_card' ? vacuumActions(state, variables) : [];
    const vacuum = kind === 'md_vacuum_card' ? vacuumActions({ attributes: { supported_features: 8192 | 4 | 16 | 256 } }, variables) : [];
    const vacuumControls = vacuum.length ? `<div class="vacuum-actions" role="group" aria-label="${esc(this._label(entity, config, state))}">${vacuum.map((entry, index) => {
      const label = entry.label || localize(entry.labelKey, this._hass, { segment: entry.segment }, entry.segment == null ? climateModeLabel(entry.key) : `Clean segment ${entry.segment}`);
      const semanticLabel = localize("actions.for_target", this._hass, { action: label, name: this._label(entity, config, state) }, `${label} ${this._label(entity, config, state)}`);
      return `<button class="${supportedVacuum.some(item => item.key === entry.key) ? "" : "placeholder"}" type="button" data-vacuum-action="${index}" aria-label="${esc(semanticLabel)}" title="${esc(label)}"${controlsDisabled || !supportedVacuum.some(item => item.key === entry.key) ? " disabled" : ""}><ha-icon icon="${esc(entry.icon)}" aria-hidden="true"></ha-icon></button>`;
    }).join("")}</div>` : "";
    const problemMessage = !camera && problem && (problem.kind !== "loading" || !showState) ? `<div class="problem" role="${problem.kind === "error" ? "alert" : "status"}">${kind === "md_media_app_card" && problem.kind === "neutral" ? "" : `<ha-icon icon="${problem.kind === "loading" ? "mdi:progress-clock" : problem.kind === "neutral" ? "mdi:help-circle-outline" : "mdi:alert-circle-outline"}" aria-hidden="true"></ha-icon>`}<span${kind === "md_media_app_card" ? ' class="binary-state"' : ""}>${esc(problemLabel(problem, this._hass))}</span></div>` : "";
    const formattedReading = !iconOnly && formatting && (['md_graph_card','md_toggle_graph_card','md_sensor_card','md_base_card'].includes(kind) || kind === 'md_switch_card' && variables.power_entity);
    const stateMarkup = showState && !stateInSlider && (!activityTimestamp(entity,state) || customLabel || variables.md_label_prefix) && !["md_wallbox_current_card", "md_number_card"].includes(kind) ? `<div class="state${!displayValue ? " placeholder" : ""}">${esc(displayValue || "—")}</div>` : "";
    const primaryMarkup = formattedReading ? `<div class="formatted-values">${stateMarkup}${details}</div>` : stateMarkup;
    const contentChanged = this._setMarkup(`<style>${cardStyles()}</style><ha-card${glance ? " data-glance" : ""}${kind === "md_room_card" ? " data-room" : ""}${binary !== null && kind !== "md_room_card" ? ` data-binary-state="${binary}"` : ""}${uniformControl ? ' class="control-surface"' : ""}${camera ? ` data-camera-card role="group" aria-label="${esc(this._label(entity, config, state))}"` : ""}${roomDescription && !action ? ` role="group" aria-label="${esc(this._label(entity, config, state))}" aria-description="${esc(roomDescription)}"` : ""}${problem ? ` data-problem="${problem.kind}" style="${problemStyle(problem,null,!glance)}"` : ""}${showsGraph ? ` data-graph-history-state="${graphStatus}"` : ""}${titleCard ? ' class="title-surface"' : ""}${loading ? ' aria-busy="true"' : ""}>${graphMarkup}${artwork}${actionControl}${holdProgress}<div class="body${feedback ? " has-problem" : ""}${problem?.complete ? " complete-problem" : ""}${camera ? " camera-card" : ""}${sliderHeader ? " slider-header" : ""}${formattedReading ? " formatted-reading" : ""}${iconOnly ? " icon-only" : ""}${binaryLayout ? " binary-card" : ""}${showName && kind === "md_navigation_card" ? " navigation-card" : ""}${titleCard ? " title-card" : ""}${glance ? " glance-card" : ""}${kind === "md_media_app_card" ? " media-app-card" : ""}${kind === "md_room_card" ? " room-card" : ""}${kind === "md_weather_card" ? " weather-card" : ""}${climate ? ` climate-card${climateDetail?" climate-detail":""}` : ""}${showsGraph ? " graph-card" : ""}${kind === "md_wallbox_current_card" ? " wallbox-card" : ""}${kind === "md_number_card" ? " number-card" : ""}${kind === "md_scene_card" ? " scene-card" : ""}${modeButtons ? " with-climate-modes" : ""}${uniformControl ? " standard-control" : ""}${kind === "md_cover_card" ? " cover-card" : ""}${accessPopup ? " access-popup-action" : ""}${accessPopup && kind === "md_access_action_card" ? " access-close-action" : ""}">${accessPopup ? `${accessIcon}${showName ? `<div class="title">${esc(this._label(entity, config, state))}</div>` : ""}${details}` : uniformControl && !iconOnly ? `<div class="compact-header"><div class="compact-copy">${showName ? `<div class="title">${esc(this._label(entity, config, state))}</div>` : ""}${primaryMarkup}${formattedReading ? "" : details}${holdHint}</div>${iconElement}</div>` : `${showName ? `<div class="title">${esc(this._label(entity, config, state))}</div>` : ""}${primaryMarkup}${formattedReading ? "" : details}${holdHint}${iconElement}`}${climateControls}${climatePending}${media}${range ? `<div class="${controlClass}">${range}</div>` : ""}${coverActions}${sceneDropdown}${shortcutButtons}${modeButtons}${readingContent}${vacuumControls}${problemMessage}${historyControl}${historyEntry && graphStatus === 'error' ? `<button type="button" data-graph-retry aria-label="${esc(localize('common.retry',this._hass,{},'Retry'))}"><ha-icon icon="mdi:refresh" aria-hidden="true"></ha-icon></button>` : ''}${this._mediaError && previewAvailable && pictureURL ? `<button type="button" class="graph-status" data-media-retry>${esc(localize("common.retry", this._hass, {}, "Retry"))}</button>` : ""}${roomBottom}</div></ha-card>`, JSON.stringify([action, vacuum]));
    for (const button of this.shadowRoot.querySelectorAll('[data-exhaust-action]')) button.addEventListener('click', event => {
      event.stopPropagation(); haptic('heavy'); this._coverAction(entity, button.dataset.exhaustAction);
    });
    this._syncCamera();
    this._activeHistoryPopup?._refreshHistory();
    for (const symbol of this.shadowRoot.querySelectorAll("ha-state-icon")) {
      const readingEntity = symbol.dataset.readingEntity;
      symbol.hass = this._hass;
      symbol.stateObj = readingEntity ? presentationState(stateOf(this._hass, readingEntity), readingEntity, "md_sensor_card") : presentationState(state, entity, kind);
    }
    const card = this.shadowRoot.querySelector("ha-card");
    if (card && kind === 'md_room_card') {
      const [light, climate] = roomColors(config, this._hass);
      card.style.setProperty('--marao-room-light',light); card.style.setProperty('--marao-room-climate',climate);

    }
    if (card && !problem) {
      if (appearance.background) card.style.setProperty("--marao-card-background", appearance.background);
      if (appearance.text) card.style.setProperty("--marao-card-text-color", appearance.text);
      if (appearance.stateText) card.style.setProperty("--marao-state-color", appearance.stateText);
      if (appearance.icon) card.style.setProperty("--marao-icon-color", appearance.icon);
      if (appearance.iconBackground) card.style.setProperty("--marao-icon-background", appearance.iconBackground);
      if (appearance.accent) card.style.setProperty("--marao-accent-color", appearance.accent);
      if (kind === "md_navigation_card" && variables.md_icon_color && !appearance.unavailable) card.style.setProperty("--marao-icon-color", text(variables.md_icon_color));
      if (artwork) {
        card.style.setProperty("--marao-card-text-color", "#fff");
        card.style.setProperty("--marao-icon-color", "#fff");
      }
      if (text(variables.graph_color).trim()) card.style.setProperty("--marao-graph-color", text(variables.graph_color).trim());
      if (text(variables.graph_background).trim()) card.style.setProperty("--marao-graph-background", text(variables.graph_background).trim());
      if (showsGraph) this._syncGraphColor(card, variables);
    }
    if(card && kind === 'md_room_card' && roomHVAC.enabled && !problem)for(const property of ['--marao-card-text-color','--marao-state-color','--marao-icon-color'])card.style.setProperty(property,'var(--color-black)');
    this._syncSceneDropdown(entity, controlsDisabled);
    if (contentChanged === false) {
      if (showsGraph) this._loadGraphHistory(graphEntity);
      return;
    }
    this.shadowRoot.querySelectorAll('[data-activity-open]').forEach(button => button.addEventListener('click',event => {
      event.preventDefault();event.stopPropagation();if(!button.disabled)this._openActivity(button,button.getAttribute('data-activity-open'));
    }));
    this.shadowRoot.querySelector('[data-problem-details]')?.addEventListener('click', event => { event.stopPropagation(); showCardDetails(this, problem.reason, event.currentTarget); });
    this.shadowRoot.querySelectorAll('[data-history-open]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); if (!button.disabled) this._openHistory(button); }));
    this.shadowRoot.querySelector('[data-light-color]')?.addEventListener('click', event => { event.stopPropagation(); this._openLightColor(event.currentTarget); });
    const actionButton = this.shadowRoot.querySelector("[data-card-action]");
    if (actionButton) {
      const primary = () => { actionButton.focus?.({ preventScroll:true }); return graphPrimaryHistory ? this._openHistory(actionButton) : this._performAction(action, entity); };
      if (holdAction) this._bindHoldAction(actionButton, card, () => this._performAction(action, entity));
      else if (alternateHold) this._bindHoldAction(actionButton, card, () => this._performAction(config.hold_action, entity), primary);
      else if (secondaryHold) this._bindHoldAction(actionButton, card, () => historyHold ? this._openHistory(actionButton) : this._openLightColor(actionButton), primary, LIGHT_COLOR_HOLD_MS);
      else this._bindTapAction(actionButton, card, primary);
    }
    for (const button of this.shadowRoot.querySelectorAll("[data-vacuum-action]")) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (button.disabled || !serviceConnectionReady(this._hass)) return;
        const entry = vacuum[Number(button.dataset.vacuumAction)];
        this._performAction({ action: "call-service", service: entry.service, data: { ...entry.data, entity_id: entity }, haptic: "heavy" }, entity);
      });
    }
    const climateOffButton = this.shadowRoot.querySelector('[data-room-climate-off]');
    if (roomClimateControl && climateOffButton) climateOffButton.onclick = event => {
      event.preventDefault(); event.stopPropagation();
      const current = roomClimate(this._config, this._hass);
      if (event.currentTarget.disabled || current.entity !== roomHVAC.entity || !serviceConnectionReady(this._hass) || !current.enabled || !current.service) return;
      this._performAction({action:'call-service', service:current.service, data:{entity_id:current.entity, ...(current.service === 'climate.set_hvac_mode' ? {hvac_mode:'off'} : {})}, haptic:'heavy'}, current.entity);
    };
    if (roomLightsControl) {
      const button = this.shadowRoot.querySelector("[data-room-lights-off]");
      if(button) button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget?.disabled || !this._hass?.states || !serviceConnectionReady(this._hass) || !serviceTargetReady(this._hass, roomLights)) return;
        this._performAction({ action: "call-service", service: "light.turn_off", data: { entity_id: roomLights }, haptic: "heavy" }, entity);
      };
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
    const retainedRange = input && input === this._sliderInput && this._sliderControl;
    if (!retainedRange) { this._sliderControl?.destroy(); this._sliderControl = null; }
    this._sliderInput = input;
    if (input && !retainedRange) {
      this._sliderControl = bindSlider(input, {
        haptic, smooth: domainOf(entity) === 'cover' && ['md_cover_card','md_fan_card'].includes(kind),
        onInput: value => this._sliderTargets.set(`${kind}:${entity}`, value),
        onStart: gesture => {
          this._sliderGesture = gesture;
          gesture.refresh = state => {
            const label = this.shadowRoot.querySelector('.state,.slider-state');
            const binary = binaryState(entity, state, kind);
            if (label && binary === null) {
              label.textContent = `${this._config.variables?.custom_label || this._config.variables?.md_label_prefix || ''}${entityStateLabel(state, entity, kind, this._hass)}`;
              if (label.classList.contains('slider-state')) input.setAttribute('aria-description', label.textContent);
            }
            this._sliderControl.update(this._sliderCurrent(kind, state.attributes, entity));
            if (binary !== null) {
              if (card) card.dataset.binaryState = String(binary);
              const accessible = this.shadowRoot.querySelector('[data-light-color],.icon[role="img"],.binary-state[role="img"]');
              accessible?.setAttribute(accessible.hasAttribute('data-light-color') ? 'aria-description' : 'aria-label', `${this._label(entity, this._config, state)}: ${entityStateLabel(state, entity, kind, this._hass)}`);
            }
            const appearance = stateAppearance(kind, text(state.state), this._config, this._hass);
            for (const [token, key] of [["--marao-card-background", "background"], ["--marao-card-text-color", "text"], ["--marao-icon-color", "icon"], ["--marao-icon-background", "iconBackground"], ["--marao-accent-color", "accent"]]) {
              card?.style.setProperty(token, appearance[key] || "");
            }
            for (const symbol of this.shadowRoot.querySelectorAll("ha-state-icon")) {
              symbol.hass = this._hass;
              symbol.stateObj = presentationState(state, entity, kind);
            }
          };
        },
        onCommit: value => {
          this._sliderTargets.set(`${kind}:${entity}`, value);
          this._setRange(entity, kind, value);
        },
        onEnd: gesture => {
          // Let native release events finish before rebuilding the control.
          requestAnimationFrame(() => {
            if (this._sliderGesture !== gesture) return;
            this._sliderGesture = null;
            this._render();
          });
        },
        onCancel: () => { this._cancelSliderGesture(); this._render(); },
      });
    }

    this.shadowRoot.querySelectorAll('[data-climate-mode]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();if(!button.disabled)this._setClimateMode(entity,button.getAttribute('data-climate-mode'));}));
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
    restoreFocus?.();
  }

  _ensurePress() {
    this._press ||= bindPressFeedback(this.shadowRoot,{resolve:event=>{
      const button=pressTarget(this.shadowRoot,event,'button');
      if(!button||button.hasAttribute?.('data-marao-hold')||button.closest?.('.marao-dropdown'))return null;
      if(!button.classList?.contains('card-action'))return button;
      const surface=button.closest('ha-card');
      return {target:button,surface,content:surface.querySelector('.icon,.title')};
    }});
  }
  _bindTapAction(button, card, run) {
    button.addEventListener("click", () => { if(button.disabled)return; button.focus?.({ preventScroll: true }); run(); });
  }

  _bindHoldAction(button, card, run, shortTap = null, duration = ACCESS_HOLD_MS) {
    button.setAttribute?.('data-marao-hold','');
    let suppressClick = false;
    let origin;
    const start = (event) => {
      if (button.disabled || this._holdActive || (event.button != null && event.button !== 0)) return;
      suppressClick = false;
      origin = { x: event.clientX, y: event.clientY };
      this._holdActive = true;
      this._holdControl = card;
      this._holdCompleted = false;
      haptic("heavy");
      if(shortTap)this._press?.start({target:button,surface:card,content:card?.querySelector('.icon,.title')},event);
      const startedAt = globalThis.performance?.now?.() ?? Date.now();
      const draw = (now) => {
        if (!this._holdActive || this._holdCompleted) return;
        this._setHoldProgress(((now - startedAt) / duration) * 100);
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
        this._press?.cancel();
        this._suppressHoldClick = true;
        run();
      }, duration);
      if (duration === LIGHT_COLOR_HOLD_MS) {
        this._holdScrollCancel = () => { suppressClick = true; this._cancelHold(); };
        globalThis.window?.addEventListener('scroll', this._holdScrollCancel, true);
      }
    };
    const cancel = () => { suppressClick = true; this._cancelHold(); };
    const finish = () => {
      const tapped = this._holdActive && !this._holdCompleted;
      suppressClick = true;this._cancelHold(!tapped||!shortTap);
      if (tapped && shortTap) {this._press?.release();shortTap();}
    };
    button.addEventListener("pointerdown", start);
    button.addEventListener("pointermove", (event) => {
      if (!this._holdActive) return;
      if (duration === LIGHT_COLOR_HOLD_MS && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 8) { cancel(); return; }
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

  _cancelHold(cancelFeedback = true) {
    if(cancelFeedback)this._press?.cancel();
    if (this._holdScrollCancel) globalThis.window?.removeEventListener('scroll', this._holdScrollCancel, true);
    this._holdScrollCancel = null;
    clearTimeout(this._holdTimer);
    globalThis.cancelAnimationFrame?.(this._holdFrame);
    this._holdTimer = null;
    this._holdFrame = null;
    this._holdActive = false;
    this._holdCompleted = false;
    this._setHoldProgress(0);
    this._holdControl = null;
  }

  _performAction(action, entity) {
    if (this.preview) return;
    if (this._config.template === 'md_camera_card' && action?.action === 'fullscreen') { haptic('heavy'); return this._camera?.fullscreen(); }
    if(this._config.template==='md_media_app_card' && isServiceAction(action) && (action.service||action.perform_action)==='media_player.select_source'){
      const target=action.target?.entity_id||action.entity_id||action.data?.entity_id||action.service_data?.entity_id||entity;
      if(typeof target==='string' && target.startsWith('media_player.') && !action.target?.area_id && !action.target?.device_id)return this._launchMediaApp(action,target);
    }
    return performAction(this._hass, action, entity, isServiceAction(action) ? serviceOutcome(this) : undefined);
  }

  async _launchMediaApp(action, target) {
    const config=this._config,account=this._hass?.user?.id,connection=this._hass?.connection;
    if(this.preview||!serviceConnectionReady(this._hass)||!serviceTargetReady(this._hass,target)||this._actionLive===false)return;
    haptic('heavy');
    const report=serviceOutcome(this),request=this._actionRequest;
    const current=()=>!this.preview && this._actionLive!==false && this._config===config && this._actionRequest===request && this._hass?.user?.id===account && this._hass?.connection===connection && serviceConnectionReady(this._hass) && serviceTargetReady(this._hass,target);
    if(stateOf(this._hass,target).state==='off'){
      let powered=false;
      await callServiceWithNotification(this._hass,'media_player','turn_on',{entity_id:target},(status,error)=>{report(status,error);if(status==='success')powered=true;});
      if(!powered||!current())return;
    }
    if(current())return callServiceWithNotification(this._hass,'media_player','select_source',{...(action.data??action.service_data??{}),entity_id:target},report);
  }

  _callService(domain, service, data, target, intent, observer) {
    if (this.preview) return Promise.resolve();
    const report = serviceOutcome(this);
    return callServiceWithNotification(this._hass, domain, service, data, (status,error) => { report(status,error); observer?.(status,error); }, target, intent);
  }

  _coverAction(entity, service) {
    const state = stateOf(this._hass, entity);
    const bit = {open_cover:1,close_cover:2}[service];
    if (this._config.template !== 'md_fan_card' || this._config.entity !== entity || domainOf(entity) !== 'cover'
      || !bit || isAccessCover(entity, state) || !(Number(state.attributes?.supported_features) & bit)
      || !serviceConnectionReady(this._hass) || !serviceTargetReady(this._hass, entity)) return;
    return this._callService('cover', service, {entity_id:entity});
  }

  _setRange(entity, kind, value) {
    if (!serviceConnectionReady(this._hass) || !entity || entity !== this._config.entity || !serviceTargetReady(this._hass, entity)
      || !Number.isFinite(value) || value < 0 || value > 100) return;
    if (['md_cover_card','md_fan_card'].includes(kind) && !this._range(entity, stateOf(this._hass,entity), kind)) return;
    const domain = domainOf(entity);
    if (kind === "md_light_card") return this._callService("light", "turn_on", { entity_id: entity, brightness_pct: value });
    if (kind === "md_cover_card") return this._callService("cover", "set_cover_position", { entity_id: entity, position: value });
    if (kind === "md_fan_card") return domain === "cover" ? this._callService("cover", "set_cover_position", {entity_id:entity,position:value}) : this._callService("fan", "set_percentage", { entity_id: entity, percentage: value });
    if (kind === "md_access_slide_action_card" && value >= 100) {
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
    if (kind === "md_climate_card") {
      if (!serviceTargetReady(this._hass, entity)) return;
      const settings = climateSettings(entity, state);
      const data = climateTemperatureChange(settings.attributes, settings.mode, direction);
      if (!data) return;
      return this._callService("climate", "set_temperature", { entity_id: entity, ...data });
    }
    if (["md_number_card", "md_wallbox_current_card"].includes(kind)) {
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

  _syncSceneDropdown(entity, disabled) {
    const picker = this.shadowRoot.querySelector('[data-scene-picker]');
    if (picker !== this._sceneDropdown?.element) { this._sceneDropdown?.destroy(); this._sceneDropdown = null; }
    if (!picker) return;
    const trigger = picker.querySelector('[data-scene-select]'), menu = picker.querySelector('[data-scene-menu]');
    const state = stateOf(this._hass, entity), label = this._label(entity, this._config, state);
    const climate = this._config.template === 'md_climate_card', alarm = this._config.template === 'md_alarm_controls_card';
    const current = () => climate ? climateSettings(entity, stateOf(this._hass, entity)).mode : alarm ? alarmActions(stateOf(this._hass, entity)).find(action => stateOf(this._hass, entity).state === (action.mode === 'disarm' ? 'disarmed' : `armed_${action.mode}`))?.service : stateOf(this._hass, entity).state;
    trigger.disabled = disabled || !picker.querySelectorAll('[data-scene-option]').length; trigger.setAttribute('aria-label', label); menu.setAttribute('aria-label', label);
    picker.querySelector('[data-scene-label]').textContent = climate ? climateModeLabel(current(), this._hass) : entityStateLabel(state, entity, alarm ? 'md_security_card' : 'md_scene_card', this._hass);
    if (alarm) {
      const selected = alarmActions(state).find(action => action.service === current());
      picker.querySelector('[data-alarm-mode-icon]').setAttribute('icon', selected ? alarmModeIcons[selected.mode] : 'mdi:shield');
      if (selected) picker.querySelector('[data-scene-label]').textContent = localize(`alarm.${selected.mode}`, this._hass, {}, selected.mode.replaceAll('_', ' '));
      trigger.classList.toggle('selected', Boolean(selected) && !disabled);
    }
    this._sceneDropdown ||= bindDropdown(picker, { trigger, menu,
      choices: [...picker.querySelectorAll('[data-scene-option]')].map(button=>({button,value:button.getAttribute('data-scene-option')})),
      value: current, activeElement: () => this.shadowRoot.activeElement,
      haptic: () => haptic('heavy'), onSelect: option => {
        if (option === current()) { haptic('heavy'); return; }
        if (alarm) this._sendAlarm(option, 'dropdown'); else if (climate) this._setClimateMode(entity, option); else this._selectSceneOption(entity, option);
      },
    });
    this._sceneDropdown.sync();
    for (const button of climate ? picker.querySelectorAll('[data-climate-mode]') : []) button.classList.toggle('active', button.getAttribute('data-climate-mode') === current());
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

  _inAccessPopup() {
    for (let node = this; node; node = node.parentElement || node.getRootNode?.()?.host) {
      if (node.classList?.contains('marao-popup-sheet')) return node.dataset.accessEntity === this._config.entity;
    }
    return false;
  }

  getCardSize() { return 2; }
}

function localCardHelpers(configs) {
  if (!configs.length || !configs.every(config => config.type?.startsWith('custom:marao-') && globalThis.customElements?.get(config.type.slice(7)))) return null;
  return { createCardElement(config) { const card = document.createElement(config.type.slice(7)); card.setConfig(config); return card; } };
}

export class MaraoControlGrid extends BaseElement {
  static getConfigElement(){return MaraoCard.getConfigElement();}
  constructor() {
    super(); this.attachShadow?.({ mode: 'open' }); this._request = 0; this._children = []; this._config = { columns: 2, cards: [] };
  }
  setConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config) || !Number.isInteger(config.columns ?? 2)
      || (config.columns ?? 2) < 1 || (config.columns ?? 2) > 6 || !Array.isArray(config.cards)
      || config.native_cards != null && (!Array.isArray(config.native_cards) || new Set(config.native_cards).size !== config.native_cards.length
        || config.native_cards.some(index => !Number.isInteger(index) || index < 0 || index >= config.cards.length))
      || config.cards.some((card, index) => !card || typeof card !== 'object' || Array.isArray(card) || typeof card.type !== 'string'
        || !config.native_cards?.includes(index) && ['custom:marao-navbar-card', 'custom:marao-popup-card'].includes(card.type)
        || !config.native_cards?.includes(index) && card.type.startsWith('custom:marao-') && card.variables != null && (typeof card.variables !== 'object' || Array.isArray(card.variables)))
      || config.groups != null && (!Array.isArray(config.groups) || config.groups.some((group, index, groups) =>
        !group || !Number.isInteger(group.count) || group.count < 1 || !Number.isInteger(group.columns) || group.columns < 1 || group.columns > 6)
        || config.groups.reduce((count, group) => count + group.count, 0) !== config.cards.length)) {
      throw new Error(localize('grid.invalid', this._hass, {}, 'Use content cards and one to six columns.'));
    }
    this._config = structuredClone({ ...config, columns: config.columns ?? 2, cards: config.cards.map((card, index) => config.native_cards?.includes(index) ? card : canonicalCard(card)) });
    this._ready = this._mount();
  }
  _native(config, index) { return config.native_cards?.includes(index) || !config.cards[index].type.startsWith('custom:marao-'); }
  get preview() { return Boolean(this._preview || this.nativeOwner?.preview || nativeEditing(this)); }
  set preview(value) { this._preview = Boolean(value); this._forward(); }
  set hass(value) { this._hass = value; this._forward(); }
  _forward() { for (const child of this._children) { child.nativeOwner=this.nativeOwner || this; child.preview = this.preview || Boolean(this.nativeOwner?.preview); child.hass = this._hass; } this._layout(); }
  connectedCallback() { this._stopNativeEditing?.(); this._stopNativeEditing = bindNativeEditing(this, () => this._forward()); if (globalThis.ResizeObserver && !this._layoutObserver) { this._layoutObserver = new ResizeObserver(() => { this._layoutFrame ||= requestAnimationFrame(() => { this._layoutFrame = 0; this._layout(); }); }); this._layoutObserver.observe(this); } if (this._interrupted) { this._interrupted = false; this._ready = this._mount(); } }
  disconnectedCallback() { this._stopNativeEditing?.(); this._stopNativeEditing = null; this._layoutObserver?.disconnect(); this._layoutObserver = null; if (this._layoutFrame) cancelAnimationFrame(this._layoutFrame); this._layoutFrame = 0; if (this._loading) { this._request++; this._interrupted = true; this._loading = false; } }
  _layout() {
    const grid = this.shadowRoot?.querySelector('.control-grid');
    if (!grid || !globalThis.getComputedStyle) return;
    const config = this._mountedConfig; if (!config) return;
    const groups = config.groups || [{ count: config.cards.length, columns: config.columns }];
    const width = this.getBoundingClientRect().width, font = parseFloat(getComputedStyle(this).fontSize) || 18;
    let groupStart = 0;
    const columns = groups.map(group => {
      const cards = config.cards.slice(groupStart, groupStart += group.count);
      const apps = cards.every(card => card.template === 'md_media_app_card' || card.type === 'custom:marao-native-media-app-card');
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
        if (child.hidden) continue;
        const native = this._native(config, index);
        const structural = !native && (childConfig.template === 'md_title_card' || /marao-native-title-card$/.test(childConfig.type));
        if (structural) {
          if (column) { row++; column = 0; }
          rows[row] = 'auto'; child.style.gridColumn = '1 / -1'; child.style.gridRow = String(++row);
          continue;
        }
        rows[row] = native || rows[row] === 'auto' ? 'auto' : 'minmax(0,1fr)';
        if (native) child.style.alignSelf = 'start';
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
        const helpers = localCardHelpers(config.cards) || await globalThis.loadCardHelpers?.();
        if (!helpers?.createCardElement) throw new Error(localize('popup.controls_unavailable', this._hass, {}, 'Controls unavailable'));
        for (const [index, childConfig] of config.cards.entries()) {
          if (this._native(config, index)) {
            const child = document.createElement('hui-card');
            if (typeof child.load !== 'function') throw new Error(localize('popup.controls_unavailable', this._hass, {}, 'Controls unavailable'));
            child.config = childConfig; child.preview = this.preview; child.hass = this._hass;
            child.addEventListener('card-visibility-changed', event => { event.stopPropagation(); if (request === this._request) this._layout(); });
            child.load(); children.push(child); continue;
          }
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
          if (childConfig.template !== 'md_title_card' && !/marao-native-title-card$/.test(childConfig.type)) child.setAttribute('data-marao-control-cell', ''); child.preview = this.preview; child.hass = this._hass;
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
  static getConfigElement(){return MaraoCard.getConfigElement();}
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._hass = null; this._open = false; this._focus = null; this._childrenRenderId = 0; this._backgroundState = []; }
  setConfig(config) { const layoutError=popupViewError(config);if(layoutError)throw new Error(layoutError);this._sourceConfig=structuredClone(config);if(config.entity_group){const error=sectionsError(config.entity_group);if(error)throw new Error(collectionLabel(error,this._hass));} this._config = { height: "auto", max_height: "100%", ...config, ...(config.cards ? { cards: config.cards.map(canonicalCard) } : {}) }; this._renderHost(); this._sync(); if (this._open) this._renderChildren(); }
  get preview() { return Boolean(this._preview || this.nativeOwner?.preview || nativeEditing(this)); }
  set preview(value) { this._preview = Boolean(value); if (this.preview) this._close(false); }
  set hass(value) { this._hass = value; this._syncTheme(); this._updateAccessHeader(); this._updateChildrenHass(); this._refreshHistory(); }
  connectedCallback() {
    this._stopNativeEditing?.(); this._stopNativeEditing = bindNativeEditing(this, () => this._sync());
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
    this._stopNativeEditing?.(); this._stopNativeEditing = null;
    window.removeEventListener("hashchange", this._sync); window.removeEventListener("location-changed", this._sync); window.removeEventListener("popstate", this._sync);
    this._viewOwner = null; this._close(false);
  }
  _invalidateHistory() { this._close(false); this._historyContext = null; }
  openLightColor(owner, opener) { this.openHistory(owner, opener, 'light-color'); }
  _detailSource(context) { if(context.kind === 'activity')return JSON.stringify(context.owner._activityOptions().sources);return context.kind === 'light-color' ? context.owner._config.entity : context.owner._graphEntity?.(); }
  openHistory(owner, opener, kind = 'history') {
    if (this.preview || owner.preview || nativeEditing(owner) || !owner.isConnected) return;
    this._hideHistory(false);
    this.nativeOwner = owner;
    this._historyContext = { owner, kind, restoreFocus: focusRestorer(opener), id: `${Date.now()}-${++historyEntryId}`, path: window.location.pathname, hash: window.location.hash, account: owner._hass?.user?.id, config: owner._config, source: kind === 'activity' ? JSON.stringify(owner._activityOptions().sources) : kind === 'light-color' ? owner._config.entity : owner._graphEntity?.() };
    owner._activeHistoryPopup = this;
    this._openSheet(this._historyContext.restoreFocus);
    window.history.pushState({ ...window.history.state, maraoHistory: { id: this._historyContext.id } }, '', window.location.href);
    this._showHistory();
  }
  _showHistory() {
    const context = this._historyContext;
    if (!context || this._historyHost || !this._overlay) return;
    context.owner._activeHistoryPopup = this;
    const parent = this._overlay.querySelector('.marao-popup-content');
    this._historyScroll = this._overlay.querySelector('.marao-popup-scroll').scrollTop;
    parent.hidden = true; parent.inert = true;
    const host = document.createElement('div'); host.className = context.kind === 'light-color' ? 'marao-light-color-content' : 'marao-history-content';
    if (['light-color','activity'].includes(context.kind)) {
      const title = this._overlay.querySelector('.marao-popup-head h2');
      this._detailTitle = title.textContent;
      title.textContent = context.kind === 'activity' ? `${context.owner._label(context.owner._activityEntity || context.owner._config.entity,context.owner._config,stateOf(context.owner.hass,context.owner._activityEntity || context.owner._config.entity))} · ${localize('activity.title',this._hass,{},'Activity')}` : context.owner._label(context.source, context.owner._config, stateOf(context.owner.hass, context.source));
      this._overlay.querySelector('.marao-popup-sheet').setAttribute('aria-label', title.textContent);
    }
    parent.after(host); this._historyHost = host;
    const back = document.createElement('button'); back.type = 'button'; back.className = 'marao-popup-back';
    back.textContent = localize('history.back', this._hass, {}, 'Back');
    back.style.cssText = 'min-width:48px;min-height:48px;border:0;border-radius:12px;background:var(--secondary-background-color);color:inherit;font:inherit;overflow-wrap:anywhere';
    back.addEventListener('click', () => { haptic('heavy'); window.history.back(); });
    if (!this._transientHistory) this._overlay.querySelector('.marao-popup-head').prepend(back);
    this._historyBack = back;
    this._overlay.querySelector('.marao-popup-scroll').scrollTop = 0;
    (this._transientHistory ? this._overlay.querySelector('.marao-popup-close') : back)?.focus?.({ preventScroll: true });
    this._refreshHistory();
  }
  async _refreshHistory() {
    const context = this._historyContext, host = this._historyHost;
    if (!context || !host) return;
    if (!context.owner.isConnected || context.path !== window.location.pathname || context.source !== this._detailSource(context) || context.account !== context.owner._hass?.user?.id || context.kind === 'activity' && (context.config !== context.owner._config || context.owner.preview || !serviceConnectionReady(context.owner._hass))) { this._close(false); return; }
    if(context.kind === 'activity') {
      const options=context.owner._activityOptions();
      if(this._historyChart){this._historyChart.update(options);return;}
      if(this._historyLoading||this._historyFailed)return;
      this._historyLoading=true;
      host.textContent=localize('common.loading',this._hass,{},'Loading…');
      try {
        const module=await loadActivitySheet();
        if(host!==this._historyHost||context!==this._historyContext)return;
        this._historyChart=module.createActivity(host,options);
        const scroll=this._overlay.querySelector('.marao-popup-scroll');scroll.style.overflow='hidden';scroll.style.display='flex';scroll.style.flexDirection='column';host.style.cssText='display:flex;flex-direction:column;min-height:0;flex:1';
        if(context.owner._graphEntity?.()&&['md_sensor_card','md_switch_card'].includes(context.owner._config.template)) {
          const chart=document.createElement('button');chart.type='button';chart.textContent=localize('activity.chart',this._hass,{},'Chart');chart.style.cssText='min-height:48px;min-width:48px';
          const activity=this._historyChart;let graph,graphHost;
          chart.onclick=async()=>{haptic('heavy');if(graphHost){graph.destroy();graphHost.remove();graphHost=null;graph=null;host.querySelector('.marao-activity').hidden=false;return;}
            chart.disabled=true;try{const module=await loadHistoryChart();if(host!==this._historyHost)return;graphHost=document.createElement('div');const back=document.createElement('button');back.type='button';back.textContent=localize('activity.title',this._hass,{},'Activity');back.style.cssText='min-width:48px;min-height:48px';back.onclick=()=>chart.onclick();const canvas=document.createElement('div');graphHost.append(back,canvas);host.append(graphHost);host.querySelector('.marao-activity').hidden=true;graph=module.createHistoryChart(canvas,context.owner._historyOptions());}catch{if(host!==this._historyHost)return;let error=host.querySelector('[data-chart-error]');if(!error){error=document.createElement('p');error.setAttribute('data-chart-error','');error.setAttribute('role','alert');host.append(error);}error.textContent=localize('timeline.history_unavailable',this._hass,{},'History unavailable');}finally{chart.disabled=false;}};
          this._historyChart={update:next=>{activity.update(next);graph?.update(context.owner._historyOptions());},destroy:()=>{graph?.destroy();graphHost?.remove();activity.destroy();}};
          host.querySelector('header')?.append(chart);
        }
      }catch {if(context!==this._historyContext)return;this._historyFailed=true;host.textContent=localize('timeline.history_unavailable',this._hass,{},'History unavailable');const retry=document.createElement('button');retry.type='button';retry.textContent=localize('common.retry',this._hass,{},'Retry');retry.style.cssText='min-height:48px;min-width:48px';retry.onclick=()=>{this._historyFailed=false;this._refreshHistory();};host.append(retry);}
      finally{if(host===this._historyHost)this._historyLoading=false;}
      return;
    }
    const color = context.kind === 'light-color';
    const options = color ? context.owner._lightColorOptions() : context.owner._historyOptions();
    if (this._historyChart) { this._historyChart.update(options); return; }
    if (this._historyLoading || this._historyFailed) return;
    this._historyLoading = true;
    host.replaceChildren();
    let placeholder;
    if (color) {
      const capabilities = lightColorCapabilities(stateOf(options.hass, options.entity));
      const loading = document.createElement('div');
      loading.style.cssText = 'display:grid;gap:16px;padding:0 4px 16px';
      loading.setAttribute('aria-busy', 'true');
      loading.innerHTML = `${capabilities.color ? '<div style="width:min(260px,100%);aspect-ratio:1;margin:auto;border-radius:50%;background:var(--secondary-background-color)"></div>' : ''}${Array.from({ length: Number(capabilities.temperature) + Number(capabilities.brightness) }, () => '<div style="height:76px;border-radius:24px;background:var(--secondary-background-color)"></div>').join('')}<p role="status" style="margin:0;min-height:1.5em"></p><button type="button" hidden style="min-width:48px;min-height:48px;border:0;border-radius:12px;background:var(--secondary-background-color);color:inherit;font:inherit"></button>`;
      host.append(loading);
      placeholder = { status: loading.querySelector('p'), retry: loading.querySelector('button') };
      placeholder.status.textContent = localize('common.loading', this._hass, {}, 'Loading…');
    } else placeholder = createHistoryPlaceholder(host, { ...options, loadingText: localize('timeline.loading', this._hass, {}, 'Loading history…') });
    try {
      const module = await (color ? loadLightColorPicker() : loadHistoryChart());
      if (host !== this._historyHost || context !== this._historyContext || !context.owner.isConnected || context.path !== window.location.pathname || context.hash !== window.location.hash || context.source !== this._detailSource(context)) return;
      host.replaceChildren();
      // Retain the opening layout if availability changes during the lazy import.
      this._historyChart = color ? module.createLightColorPicker(host, options) : module.createHistoryChart(host, context.owner._historyOptions());
      if (color) this._historyChart.update(context.owner._lightColorOptions());
    } catch (error) {
      if (host !== this._historyHost || context !== this._historyContext) return;
      this._historyFailed = true;
      const message = document.createElement('p'); message.setAttribute('role', 'alert');
      message.textContent = color ? localize('light.color_load_error', this._hass, {}, 'Color controls could not load') : localize('history.load_error', this._hass, {}, 'History chart could not load');
      const retry = document.createElement('button'); retry.type = 'button'; retry.style.cssText = 'min-width:48px;min-height:48px;font:inherit';
      retry.textContent = localize('common.retry', this._hass, {}, 'Retry');
      retry.onclick = () => { haptic('heavy'); this._historyFailed = false; this._refreshHistory(); };
      placeholder.status.textContent = message.textContent;
      placeholder.status.setAttribute('role', 'alert');
      if (color) placeholder.status.parentElement.removeAttribute('aria-busy');
      placeholder.retry.hidden = false; placeholder.retry.disabled = false;
      placeholder.retry.textContent = retry.textContent; placeholder.retry.onclick = () => retry.click();
    } finally { if (host === this._historyHost) this._historyLoading = false; }
  }
  _hideHistory(restore = true) {
    if (!this._historyHost && !this._historyChart && !this._historyBack) return;
    if(this._historyContext?.kind === 'activity')for(const property of ['overflow','display','flex-direction'])this._overlay?.querySelector('.marao-popup-scroll')?.style?.removeProperty(property);
    this._historyChart?.destroy(); this._historyChart = null;
    this._historyHost?.remove(); this._historyHost = null;
    this._historyBack?.remove(); this._historyBack = null;
    this._historyLoading = false; this._historyFailed = false;
    if (this._detailTitle != null && this._overlay) {
      this._overlay.querySelector('.marao-popup-head h2').textContent = this._detailTitle;
      this._overlay.querySelector('.marao-popup-sheet').setAttribute('aria-label', this._detailTitle);
      this._detailTitle = null;
    }
    const parent = this._overlay?.querySelector('.marao-popup-content');
    if (parent) { parent.hidden = false; parent.inert = false; }
    if (restore && this._overlay) {
      if (this._historyContext?.kind === 'light-color') {
        this._historyContext.owner._activeHistoryPopup = null;
        this._reconcileGroupChildren();
      }
      this._overlay.querySelector('.marao-popup-scroll').scrollTop = this._historyScroll || 0;
      this._historyContext?.restoreFocus();
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
  _accessEntity() {
    const entity = this._config.entity;
    if (!/^(lock|cover)\./.test(entity || '') || this._historyContext || this._message) return '';
    const containsAction = cards => cards.some(card => card.entity === entity && ['md_access_slide_action_card', 'md_access_action_card'].includes(canonicalTemplate(card.template))
      || containsAction(card.cards || (card.card ? [card.card] : [])));
    return containsAction(this._config.cards || []) ? entity : '';
  }
  _updateAccessHeader() {
    const entity = this._accessEntity();
    if (!entity) return;
    const status = this._overlay?.querySelector('[data-access-state]');
    if (!status) return;
    const state = stateOf(this._hass, entity);
    const problem = cardProblem({entity, template:'md_access_card'}, this._hass);
    const label = problem ? problemLabel(problem, this._hass) : entityStateLabel(state, entity, 'md_access_card', this._hass);
    const text = status.querySelector('span');
    if (text.textContent !== label) text.textContent = label;
    const icon = this._overlay.querySelector('[data-access-icon]');
    icon.hass = this._hass; icon.stateObj = presentationState(state, entity, 'md_access_card');
  }
  _renderHost() { if (this.shadowRoot) this.shadowRoot.innerHTML = "<style>:host{display:block;height:0;overflow:visible}</style>"; }
  _sync = () => {
    if (this.preview) { this._close(false); return; }
    if (this._historyContext) {
      const context = this._historyContext;
      const current = window.history.state?.maraoHistory?.id === context.id;
      if (current && context.owner.isConnected && context.path === window.location.pathname && context.hash === window.location.hash && context.source === this._detailSource(context)) { this._openSheet(); this._showHistory(); return; }
      if (this._historyHost) this._hideHistory();
      if (this._transientHistory) { this._close(false); return; }
    }
    const hash = text(this._config.hash);
    if (window.location.pathname !== this._viewPath || !hash || window.location.hash !== hash) {
      const next = this._open && window.location.pathname === this._viewPath && findElements("marao-popup-card", this._viewOwner?.view.shadowRoot || this._viewOwner?.view).find((popup) => popup !== this && popup.isConnected && popup._config.hash === window.location.hash);
      if (next) next._openSheet(this._focus);
      else this._close(false);
    }
    else if (this.isConnected) this._openSheet();
  };
  _openSheet(returnFocus) {
    if (this.preview) return;
    if (this._open) return;
    for (const navbar of fullscreenUsers) { navbar._refreshGesture?.cancel(); navbar._closeOverflow?.(true); }
    const previous = findElements("marao-popup-card", this._viewOwner?.view.shadowRoot || this._viewOwner?.view).find((popup) => popup !== this && popup._open);
    this._focus = returnFocus || previous?._focus || focusRestorer(deepActiveElement());
    if (!this._message) previous?._close(false, false);
    this._open = true;
    const height = this._config.height === "auto" ? "auto" : text(this._config.height);
    const isClimateModePopup = !this._config.entity_group && this._config.cards?.some((card) => card?.template === "md_climate_card" && card.variables?.show_mode_buttons);
    const title = isClimateModePopup ? "" : text(this._config.title ?? this._config.name);
    const column = this._viewOwner?.view.shadowRoot?.querySelector("#columns > div:first-child, hui-section, .section");
    const columnWidth = column ? Math.round(column.getBoundingClientRect().width) : 0;
    const maxWidth = columnWidth > 0 ? `${columnWidth}px` : "100%";
    const closeLabel = localize("popup.close", this._hass, {}, "Close popup");
    const accessEntity = this._accessEntity();
    const overlay = document.createElement("div"); overlay.className = "marao-popup-overlay";
    overlay.innerHTML = `<style>${pressStyles}${controlGridStyles(".marao-popup-content.control-grid")}@keyframes marao-popup-slide-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.marao-popup-overlay{position:fixed;inset:0;z-index:1100;display:flex;align-items:flex-end;box-sizing:border-box;padding:max(50px, ${safeArea("top")}) max(8px, ${safeArea("right")}) 8px max(8px, ${safeArea("left")});background:rgba(0,0,0,.42);font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif)}.marao-popup-sheet{--marao-popup-card-padding:8px;--marao-popup-detail-title-display:${title && this._config.cards?.length === 1 && this._config.cards[0].name === title ? 'none' : 'block'};box-sizing:border-box;width:100%;max-width:${maxWidth};height:${esc(height)};max-height:min(${esc(this._config.max_height)}, 100%);margin:0 auto;display:flex;flex-direction:column;overflow:hidden;padding:0;border-radius:36px;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);overscroll-behavior:contain;animation:marao-popup-slide-up .28s cubic-bezier(.2,.8,.2,1) both}.marao-popup-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none;padding:20px 20px 12px;background:inherit;z-index:1}.marao-popup-head h2{min-width:0;margin:0;font-size:var(--font-size-primary,1.25rem);line-height:1.2;overflow-wrap:anywhere} .marao-popup-sheet[data-access-entity] .marao-popup-head{box-sizing:border-box;min-height:112px;padding:22px 20px;align-items:center}.marao-popup-sheet[data-access-entity] .marao-popup-head h2{font-size:calc(var(--font-size-primary,1.125rem) * 1.25)}.marao-popup-sheet[data-access-entity] .marao-popup-access-state{font-size:var(--font-size-primary,1.125rem)}.marao-popup-heading{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;flex:1}.marao-popup-copy{display:grid;gap:4px;flex:1;text-align:left;min-width:min(100%,calc(var(--font-size-primary,1.125rem) * 3))}.marao-popup-access-state{font-size:var(--font-size-secondary,1rem);line-height:1.4;overflow-wrap:anywhere}.marao-popup-state-icon{display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;border-radius:50%;background:var(--marao-icon-background,var(--opacity-contrast-100,rgba(0,0,0,.08)));color:var(--marao-icon-color,var(--icon-color));--mdc-icon-size:28px}.marao-popup-state-icon ha-state-icon{display:inline-flex;width:28px;height:28px}.marao-popup-close{flex:0 0 48px;width:48px;height:48px;padding:0;border:0;border-radius:50%;font-size:1.5rem;background:var(--secondary-background-color);color:inherit;cursor:pointer;transition:transform .12s ease,filter .12s ease}.marao-popup-close:focus,.marao-popup-sheet:focus{outline:none}.marao-popup-content>p{min-width:0;font-size:var(--font-size-secondary,1rem);font-weight:var(--font-weight-secondary,500);line-height:1.4;overflow-wrap:anywhere}.marao-popup-content[hidden]{display:none}.marao-popup-scroll{--marao-popup-header-height:0px;flex:1 1 auto;min-width:0;min-height:0;overflow:auto;padding:0 8px max(${navbarBottomGap()}, ${safeArea("bottom")});overscroll-behavior:contain}.marao-popup-content{display:grid;min-width:0;gap:8px;isolation:isolate}@media(max-width:240px){.marao-popup-scroll{padding-left:4px;padding-right:4px}}@media(prefers-reduced-motion:reduce){.marao-popup-sheet{animation:none}.marao-popup-close{transition:none}}</style><section class="marao-popup-sheet"${accessEntity ? ` data-access-entity="${esc(accessEntity)}"` : ""} role="dialog" aria-modal="true" aria-label="${esc(title || this._config.name || localize("popup.title", this._hass, {}, "Marao popup"))}" tabindex="-1"><div class="marao-popup-head">${accessEntity ? `<div class="marao-popup-heading"><span class="marao-popup-state-icon" aria-hidden="true"><ha-state-icon data-access-icon></ha-state-icon></span><div class="marao-popup-copy"><h2>${esc(title)}</h2><div class="marao-popup-access-state" data-access-state><span role="status"></span></div></div></div>` : `<h2>${esc(title)}</h2>`}<button class="marao-popup-close" type="button" aria-label="${esc(closeLabel)}" title="${esc(closeLabel)}">×</button></div><div class="marao-popup-scroll"><div class="marao-popup-content"></div></div></section>`;
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
    this._popupPress = bindPressFeedback(overlay);
    this._overlay = overlay;
    styleWeatherPopup(this);
    this._syncTheme();
    this._updateAccessHeader();
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
    if (this._message) { const message = document.createElement('p'); message.style.cssText = 'margin:0;overflow-wrap:anywhere;white-space:pre-line'; message.textContent = this._message; host.replaceChildren(message); return; }
    const renderId = ++this._childrenRenderId;
    this._nativePopupView?.destroy();this._nativePopupView=null;
    if(this._config.popup_content?.mode==='custom'||this._config.popup_view){this._nativePopupView=popupLayouts.mountPopupView(this,host);return;}
    this._groupHelpers = null; this._groupChildren = new Map(); this._groupEmpty = null; this._groupLayout = null;
    host.replaceChildren();
    const loading = document.createElement('p'); loading.setAttribute('role', 'status');
    loading.textContent = localize('common.loading', this._hass, {}, 'Loading…'); host.append(loading);
    let helpers;
    try {
      helpers = localCardHelpers(this._config.cards || []) || await globalThis.loadCardHelpers?.();
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
      try { const card = helpers?.createCardElement ? helpers.createCardElement(config) : document.createElement("div"); if (card.setConfig) card.setConfig(config); card.climateDetail=!this._config.entity_group && this._config.cards?.some(child=>child.template==='md_climate_card'&&child.variables?.show_mode_buttons);card.nativeOwner=this.nativeOwner || this;card.preview=this.preview; card.hass = this._hass; host.append(card); } catch (error) { const message = document.createElement("p"); message.textContent = error.message; host.append(message); }
    }
  }
  _updateChildrenHass() {
    styleWeatherPopup(this);
    if(this._nativePopupView){this._nativePopupView.update();return;}
    if (this._config.entity_group) { this._reconcileGroupChildren(); return; }
    const host = this._overlay?.querySelector(".marao-popup-content");
    for (const card of host?.children || []) {card.nativeOwner=this.nativeOwner || this;card.preview=this.preview;card.hass = this._hass;}
  }
  _reconcileGroupChildren() { reconcileGroup(this,{entityGroupState,isAccessCover,deepActiveElement,haptic,controlGridStyles,callService:callServiceWithNotification}); }
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
    this._popupPress?.destroy(); this._popupPress = null;
    this._nativePopupView?.destroy();this._nativePopupView=null;
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
  static getConfigElement(){return MaraoCard.getConfigElement();}
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
  get preview() { return Boolean(this._preview || this.nativeOwner?.preview || nativeEditing(this)); }
  set preview(value) { this._preview = Boolean(value); this._sync(); }
  connectedCallback() { this._stopNativeEditing?.(); this._stopNativeEditing = bindNativeEditing(this, () => this._sync()); this._sync(); }
  disconnectedCallback() { this._stopNativeEditing?.(); this._stopNativeEditing = null; this._loadId++; this._starting = false; this._failed = false; this._chart?.destroy(); this._chart = null; this.shadowRoot?.replaceChildren(); }
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
    this.shadowRoot.replaceChildren();
    const toolbar = createPowerToolbar(this.shadowRoot, dropdownStyles);
    toolbar.selectedLabel.textContent = localize('power.day', this._hass, {}, 'Day');
    toolbar.title.textContent = '—';
    for (const button of [toolbar.trigger, toolbar.previous, toolbar.next]) button.disabled = true;
    const placeholder = createHistoryPlaceholder(toolbar.content, { power:true, windows:false, unit:this._config.display_unit || stateOf(this._hass, this._config.entity).attributes?.unit_of_measurement || 'W', hass:this._hass,
      series:[{name:this._config.name || stateOf(this._hass,this._config.entity).attributes?.friendly_name || this._config.entity}, ...(this._config.power_devices || []).map(item => ({name:item.name || stateOf(this._hass,item.entity_id).attributes?.friendly_name || item.entity_id}))],
      loadingText:localize('timeline.loading', this._hass, {}, 'Loading history…') });
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
      placeholder.status.textContent = message.textContent;
      placeholder.retry.hidden = false; placeholder.retry.disabled = false;
      placeholder.retry.textContent = retry.textContent; placeholder.retry.onclick = () => retry.click();
    } finally { if (request === this._loadId) this._starting = false; }
  }
}

export function registerMaraoCards() {
  popupLayouts.registerPopupActions({haptic,isAccessCover,callService:callServiceWithNotification});
  for (const [name, klass] of [["marao-card", MaraoCard], ["marao-power-history-card", MaraoPowerHistoryCard], ["marao-control-grid", MaraoControlGrid], ["marao-navbar-card", MaraoNavbarCard], ["marao-popup-card", MaraoPopupCard]]) {
    if (globalThis.customElements && !globalThis.customElements.get(name)) globalThis.customElements.define(name, klass);
  }

}

registerMaraoCards();
