const BaseElement = globalThis.HTMLElement || class {};

const text = (value, fallback = "") => String(value ?? fallback);
const esc = (value) => text(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const stateOf = (hass, entity) => hass?.states?.[entity] || {};
const domainOf = (entity) => text(entity).split(".", 1)[0];
export const ACCESS_HOLD_MS = 1200;

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
  const actionLabelKey = text(config?.variables?.action_label_key).trim();
  if (actionLabelKey) {
    const fallback = text(config?.variables?.action_label || config?.name || actionLabelKey).trim();
    return localize(actionLabelKey, hass, {}, fallback);
  }
  const configured = text(config?.name).trim();
  if (configured) return configured;
  const command = text(action?.data?.command).trim();
  if (command) return localize(`controls.command.${command.toLowerCase()}`, hass, {}, climateModeLabel(command, hass));
  const service = text(action?.service || action?.perform_action).split(".").pop();
  if (service) return localize(`controls.action.${service}`, hass, {}, climateModeLabel(service, hass));
  const label = text(state?.attributes?.friendly_name || entity || config?.template, "Marao");
  if (action?.action === "navigate") return localize("actions.open", hass, { name: label }, `Open ${label}`);
  if (action?.action === "toggle") return localize("actions.toggle", hass, { name: label }, `Toggle ${label}`);
  return label;
}

function climateTarget(attributes, mode) {
  const single = Number(attributes.temperature ?? attributes.target_temperature);
  const low = Number(attributes.target_temp_low ?? attributes.target_temperature_low);
  const high = Number(attributes.target_temp_high ?? attributes.target_temperature_high);
  if (mode === "heat_cool" && Number.isFinite(low) && Number.isFinite(high)) return `${low}–${high}`;
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
  const single = Number(attributes.temperature ?? attributes.target_temperature);
  const low = Number(attributes.target_temp_low ?? attributes.target_temperature_low);
  const high = Number(attributes.target_temp_high ?? attributes.target_temperature_high);
  if (mode === "heat_cool" && Number.isFinite(low) && Number.isFinite(high)) {
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
      data: service === "vacuum.send_command" ? { command: "app_segment_clean", params: [action.segment] } : {},
    });
  }
  return actions;
}

function numberStepper(value, label, unit = "", className = "", disabled = false, hass = null) {
  if (value == null || value === "—") return "";
  const disabledAttribute = disabled ? " disabled" : "";
  const increase = localize("controls.increase", hass, { name: label }, `Increase ${label}`);
  const decrease = localize("controls.decrease", hass, { name: label }, `Decrease ${label}`);
  return `<div class="number-stepper${className ? ` ${esc(className)}` : ""}" role="group" aria-label="${esc(label)}"><button type="button" data-number-step="increase" aria-label="${esc(increase)}" title="${esc(increase)}"${disabledAttribute}><ha-icon icon="mdi:chevron-up"></ha-icon></button><output class="number-value" aria-live="polite">${esc(value)}${esc(unit)}</output><button type="button" data-number-step="decrease" aria-label="${esc(decrease)}" title="${esc(decrease)}"${disabledAttribute}><ha-icon icon="mdi:chevron-down"></ha-icon></button></div>`;
}

export function climateModeLabel(value, hass = null) {
  const label = text(value).replace(/_/g, " ");
  const fallback = label ? label[0].toUpperCase() + label.slice(1) : "";
  if (["unknown", "unavailable"].includes(text(value))) return localize(`common.${value}`, hass, {}, fallback);
  return localize(`climate.mode.${value}`, hass, {}, fallback);
}

function presentationDomain(kind, entity) {
  return ({ hc_weather_card: "weather", hc_header_card: "weather", hc_security_card: "alarm_control_panel", hc_vacuum_card: "vacuum", hc_camera_card: "camera", hc_media_card: "media_player", person: "person" })[kind] || domainOf(entity);
}

function presentationState(state, entity, kind) {
  const domain = presentationDomain(kind, entity);
  return { ...state, entity_id: `${domain}.${text(entity).split('.').slice(1).join('.') || 'marao'}`, attributes: state.attributes || {} };
}

export function entityStateLabel(state, entity, kind, hass) {
  const value = text(state?.state, hass?.states ? "unknown" : "loading");
  if (["loading", "unknown", "unavailable"].includes(value)) return localize(`common.${value}`, hass, {}, value === "loading" ? "Loading…" : value);
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
  const unavailable = states.length - known.length;
  const state = known.length ? active ? "on" : "off" : states.includes("unknown") ? "unknown" : "unavailable";
  const label = !known.length ? localize(`common.${state}`, hass, {}, state)
    : active ? localize("common.active_count", hass, { count: active }, `${active} active`)
    : localize("common.all_off", hass, {}, "All off");
  return { state, label: known.length && unavailable ? localize("common.partial_summary", hass, { label, count: unavailable }, `${label}, ${unavailable} unavailable`) : label };
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
    const percentage = Number(state);
    background = Number.isFinite(percentage) ? active || (percentage >= 80 ? green : percentage >= 20 ? "var(--color-yellow)" : red) : undefined;
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
  } else if (kind === "hc_vacuum_card") {
    background = { docked: green, cleaning: blue, returning: orange, error: red }[value];
  } else if (kind === "hc_wallbox_current_card") {
    accent = active || "var(--color-green, #3F7E4B)";
    if (!["unknown", "unavailable"].includes(value)) {
      background = accent;
      foreground = "var(--active-text-color, #fff)";
    }
  } else if (kind === "hc_room_card") {
    if (value === "on") background = "var(--room-card-active-background,var(--primary-color))";
  } else if (kind === "hc_toggle_graph_card") {
    if (stateOf(hass, text(variables.toggle_entity)).state === "on") background = active || "var(--primary-color)";
  }

  const unavailable = ["unavailable", "unknown"].includes(value);
  if (unavailable) return { unavailable: true };
  if (kind === "hc_navigation_card") {
    background = variables.hc_color || background;
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

export function haptic(value = "heavy") {
  if (!value) return;
  globalThis.window?.dispatchEvent?.(new CustomEvent("haptic", { detail: value }));
  globalThis.navigator?.vibrate?.(value === "success" ? [50, 35, 75] : value === "heavy" ? 50 : 25);
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

export async function callServiceWithNotification(hass, domain, service, data) {
  if (!serviceConnectionReady(hass) || !serviceTargetReady(hass, data?.entity_id)) return;
  try {
    return await hass.callService(domain, service, data, undefined, false);
  } catch (error) {
    notifyActionError(hass, error);
  }
}

function navigate(path) {
  if (!path) return;
  if (path.startsWith("#")) {
    window.history.pushState({}, "", `${window.location.pathname}${window.location.search}${path}`);
  } else {
    window.history.pushState({}, "", path);
  }
  window.dispatchEvent(new Event("location-changed"));
}

export async function performAction(hass, action, entity) {
  if (!action || action.action === "none") return;
  if (isServiceAction(action) && !serviceConnectionReady(hass)) return;
  haptic(action.haptic || "heavy");
  const kind = action.action;
  if (kind === "navigate") return navigate(action.navigation_path);
  if (kind === "url") return window.location.assign(action.url_path || action.url);
  if (kind === "more-info") {
    const event = new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: action.entity || entity } });
    return document.dispatchEvent(event);
  }
  const target = action.target?.entity_id || action.entity_id || entity;
  if (!target) return;
  if (kind === "toggle") return callServiceWithNotification(hass, domainOf(target), "toggle", { entity_id: target });
  if (kind === "call-service" || kind === "perform-action") {
    const service = action.service || action.perform_action || "";
    const [domain, name] = service.split(".", 2);
    if (!domain || !name) return;
    const data = { ...(action.data || {}) };
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
    else if (!data.entity_id) data.entity_id = target;
    return callServiceWithNotification(hass, domain, name, data);
  }
}

function cardStyles() {
  return `
    :host { display:block; container:marao-card / inline-size; color:var(--primary-text-color); font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif); }
    ha-card { position:relative; box-sizing:border-box; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--marao-card-background,var(--ha-card-background,var(--card-background-color))); color:var(--marao-card-text-color,inherit); border:var(--marao-card-border,0 solid transparent); transition:transform .12s ease; }
    ha-card.is-pressed { transform:scale(.985); }
    .card-action { position:absolute; inset:0; z-index:1; width:100%; height:100%; margin:0; padding:0; border:0; border-radius:inherit; background:transparent; color:transparent; cursor:pointer; }
    .card-action:disabled { cursor:default; }
    .body { position:relative; z-index:2; display:grid; grid-template-columns:minmax(0,1fr) auto; grid-template-areas:'title icon' 'state icon' 'climate icon' 'control control'; gap:4px 12px; align-items:center; min-height:84px; padding:14px; pointer-events:none; }
    .body.with-climate-modes { grid-template-areas:'title icon' 'state icon' 'climate icon' 'modes modes'; }
    .body.icon-only { display:flex; align-items:center; justify-content:center; gap:0; min-height:64px; padding:12px; }
    .body.icon-only .icon { grid-area:auto; }
    .body.navigation-card { grid-template-areas:'title title' 'state icon' 'control control'; }
    .body.navigation-card .title { font-size:var(--font-size-secondary,1rem); }
    ha-card.title-surface { overflow:visible; background:transparent; box-shadow:none; }
    .body.title-card { display:block; min-height:0; padding:0 0 20px; }
    .body.title-card .title { font-size:calc(var(--font-size-primary,1.125rem) * 1.39); font-weight:800; }
    .body.media-app-card { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center; }
    .body.media-app-card .icon { order:-1; flex:0 0 52px; }
    .body.media-app-card .title { display:flex; align-items:center; justify-content:center; width:100%; min-height:2.5em; }
    .title, .state, .climate { min-width:0; max-width:100%; overflow-wrap:anywhere; line-height:1.25; }
    .title { grid-area:title; font-weight:var(--font-weight-primary,700); font-size:var(--font-size-primary,1.125rem); }
    .state { grid-area:state; color:var(--marao-state-color,var(--marao-card-text-color,var(--secondary-text-color))); font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); }
    .climate { grid-area:climate; color:var(--marao-card-text-color,var(--secondary-text-color)); font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); }
    .climate-card .state { font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-primary,700); }
    .climate-card .current-temperature { font-size:calc(var(--font-size-primary,1.125rem) * 1.78); font-weight:var(--font-weight-primary,700); line-height:1.25; }
    .icon { grid-area:icon; display:grid; place-items:center; width:52px; height:52px; border-radius:50%; background:var(--marao-icon-background,var(--opacity-contrast-100,rgba(0,0,0,.08))); color:var(--marao-icon-color,var(--icon-color)); }
    .icon :is(ha-icon,ha-state-icon) { --mdc-icon-size:28px; }
    .readings { grid-column:1/-1; display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,max(110px,calc(var(--font-size-caption,.9375rem) * 8))),1fr)); gap:12px; margin:8px 0 0; min-width:0; }
    .reading { display:grid; justify-items:center; align-content:start; gap:4px; min-width:0; text-align:center; overflow-wrap:anywhere; line-height:1.25; }
    .reading dt { font-size:var(--font-size-caption,.9375rem); }
    .reading dd { margin:0; font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-primary,700); }
    .reading :is(ha-icon,ha-state-icon) { --mdc-icon-size:28px; }
    .reading.neutral { opacity:.6; }
    .body.glance-card { display:block; }
    .body.glance-card .readings { margin:0; }
    .control { grid-area:control; z-index:2; display:flex; gap:8px; align-items:center; pointer-events:auto; }
    button { min-width:48px; min-height:48px; border:0; border-radius:12px; padding:10px 12px; color:inherit; background:var(--secondary-background-color); font:inherit; cursor:pointer; transition:transform .12s ease,filter .12s ease; }
    button:active:not(:disabled) { transform:scale(.96); filter:brightness(.96); }
    button:focus, input:focus { outline:none; }
    .climate-modes { grid-area:modes; z-index:2; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; width:100%; box-sizing:border-box; padding-top:10px; border-top:1px solid color-mix(in srgb,currentColor 18%,transparent); pointer-events:auto; }
    .climate-mode { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; min-width:48px; min-height:72px; border-radius:16px; padding:10px 12px; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-primary,700); line-height:1.2; overflow-wrap:anywhere; text-align:center; }
    .climate-mode ha-icon { flex:0 0 auto; --mdc-icon-size:28px; }
    .climate-mode.active { background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); box-shadow:inset 0 0 0 3px var(--marao-accent-color,var(--primary-color)); }
    .control.number-control { grid-area:icon; justify-self:end; }
    .wallbox-card { grid-template-areas:'title control' 'wallbox wallbox'; grid-template-columns:minmax(0,1fr) auto; }
    .wallbox-card .title { grid-area:title; align-self:center; }
    .wallbox-card .wallbox-current-control { grid-area:control; align-self:stretch; }
    .wallbox-stepper { padding:4px 8px; background:var(--ha-card-background,var(--card-background-color,#fff)); color:var(--primary-text-color,#141414); }
    .wallbox-stepper .number-value { font-size:calc(2 * var(--font-size-primary,1.125rem)); line-height:1.25; opacity:1; }
    .wallbox-stepper button { width:48px; height:48px; }
    .wallbox-shortcuts { grid-area:wallbox; z-index:2; display:grid; grid-template-columns:repeat(auto-fit,minmax(48px,1fr)); gap:8px; width:100%; margin-top:8px; pointer-events:auto; }
    .wallbox-shortcuts button { min-width:48px; min-height:48px; background:var(--ha-card-background,var(--card-background-color,#fff)); color:var(--primary-text-color,#141414); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--color-black,#000) 12%,transparent); font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-primary,700); }
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
      .title { font-size:var(--font-size-caption,.9375rem); }
      .body.navigation-card .title { font-size:var(--font-size-caption,.9375rem); }
      .state, .climate { font-size:var(--font-size-caption,.9375rem); }
      .icon { width:40px; height:40px; }
      .icon :is(ha-icon,ha-state-icon) { --mdc-icon-size:24px; }
      .body.media-app-card .icon { flex-basis:40px; }
      .body:has(>.number-control) { grid-template-columns:minmax(0,1fr); grid-template-areas:'title' 'state' 'climate' 'control' 'modes' 'wallbox'; }
      .body:has(>.number-control)>.number-control { grid-area:control; justify-self:stretch; justify-content:center; }
    }
    .hold-progress { position:absolute; inset:1px; z-index:4; width:calc(100% - 2px); height:calc(100% - 2px); overflow:visible; pointer-events:none; }
    .hold-progress rect { width:calc(100% - 3px); height:calc(100% - 3px); rx:calc(var(--ha-card-border-radius,20px) - 2.5px); fill:none; stroke:var(--marao-accent-color,var(--primary-color)); stroke-width:3px; stroke-dasharray:100; stroke-dashoffset:100; opacity:0; }
    .graph-background { position:absolute; inset:0; z-index:0; display:block; width:100%; height:100%; pointer-events:none; opacity:.30; background:var(--marao-graph-background,transparent); }
    .graph-background .fill { fill:var(--marao-graph-color,var(--marao-card-text-color,var(--marao-accent-color,var(--primary-color)))); opacity:.16; }
    .graph-background .line { fill:none; stroke:var(--marao-graph-color,var(--marao-card-text-color,var(--marao-accent-color,var(--primary-color)))); stroke-width:2.25; vector-effect:non-scaling-stroke; }
    .graph-card .state { font-size:calc(var(--font-size-primary,1.125rem) * 1.12); font-weight:var(--font-weight-primary,700); }
    .graph-status { grid-column:1/-1; font-size:var(--font-size-caption,.9375rem); overflow-wrap:anywhere; }
    .vacuum-actions { grid-column:1/-1; z-index:3; display:grid; grid-template-columns:repeat(auto-fit,minmax(48px,1fr)); gap:8px; pointer-events:auto; }
    .vacuum-actions button { padding:10px 4px; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); }
    .room-lights-off { grid-area:control; z-index:3; display:flex; align-items:center; justify-content:center; gap:8px; width:100%; min-height:48px; padding:10px 14px; border-radius:12px; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); pointer-events:auto; font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-primary,700); }
    .room-lights-off:disabled { opacity:.6; cursor:default; }
    .room-lights-off ha-icon { --mdc-icon-size:28px; }
    .scene-options { grid-area:control; z-index:2; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; width:100%; pointer-events:auto; }
    .scene-options button { min-width:48px; min-height:48px; overflow-wrap:anywhere; font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); line-height:1.25; }
    .scene-options button:disabled { opacity:.6; cursor:default; }
    .scene-options button:only-child { grid-column:1/-1; }
    .scene-options button[aria-pressed=true] { box-shadow:inset 0 0 0 3px var(--marao-accent-color,var(--primary-color)); font-weight:var(--font-weight-primary,700); }
    @container marao-card (max-width:190px) { .scene-options { grid-template-columns:minmax(0,1fr); } .body.with-climate-modes { padding-inline:8px; } .climate-mode { padding-inline:4px; } }
    .camera { grid-column:1/-1; width:100%; aspect-ratio:16/9; object-fit:cover; background:#000; }
    .media-artwork { position:absolute; inset:0; pointer-events:none; }
    .media-artwork img { width:100%; height:100%; object-fit:cover; }
    .media-artwork::after { content:''; position:absolute; inset:0; background:rgba(0,0,0,.72); }
    @container marao-card (max-width:120px) {
      .body, .body.with-climate-modes, .body.icon-only { grid-template-columns:minmax(0,1fr); grid-template-areas:'icon' 'title' 'state' 'climate' 'control' 'modes'; padding:clamp(0px,calc((100cqi - 64px) / 2),4px); }
      .body.wallbox-card { grid-template-areas:'title' 'control' 'wallbox'; }
      .control.number-control { grid-area:control; justify-self:start; }
      .number-stepper { min-width:56px; max-width:100%; }
      .wallbox-shortcuts, .scene-options, .climate-modes { grid-template-columns:minmax(0,1fr); }
      .room-lights-off { flex-wrap:wrap; padding:8px 4px; overflow-wrap:anywhere; }
    }
    @media (prefers-reduced-motion:reduce) { ha-card,button,.slider-thumb { transition:none; } }
  `;
}

export class MaraoCard extends BaseElement {
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._hass = null; this._sliderTargets = new Map(); this._sliderGesture = null; this._graphHistory = new Map(); this._graphRequests = new Map(); this._graphErrors = new Set(); this._holdTimer = null; this._holdFrame = null; this._holdActive = false; this._holdCompleted = false; }
  setConfig(config) { this._cancelSliderGesture(); this._graphRequests.clear(); this._graphHistory.clear(); this._graphErrors.clear(); this._config = { ...config }; this._render(); }
  connectedCallback() { this._render(); }
  set hass(value) {
    const entity = text(this._config.entity);
    const previous = this._hass;
    const previousState = previous?.states?.[entity];
    const wasServiceReady = this._serviceReady;
    this._hass = value;
    this._serviceReady = serviceConnectionReady(value);
    const graphEntity = this._config.variables?.graph_entity || this._config.variables?.power_entity
      || (["hc_graph_card", "hc_toggle_graph_card"].includes(this._config.template) ? entity : "");
    const graphAvailability = this._graphAvailability(graphEntity, value);
    if (graphEntity && this._graphAvailabilityState !== graphAvailability) {
      this._graphRequests.delete(graphEntity);
      this._graphHistory.delete(graphEntity);
      this._graphErrors.delete(graphEntity);
    }
    this._graphAvailabilityState = graphAvailability;
    // Unrelated updates must not tear down an idle range just before a drag.
    if (this.shadowRoot?.querySelector('input[data-slider-key]') && previousState && previousState === value?.states?.[entity]
      && wasServiceReady === this._serviceReady
      && ["themes", "locale", "language", "localize", "entities"].every((key) => previous[key] === value?.[key])
      && (!graphEntity || previous.states?.[graphEntity] === value?.states?.[graphEntity])) return;
    // Home Assistant updates all cards when unrelated entities change. Keep
    // the pressed control mounted until its own state or connection changes.
    if (this._holdActive && serviceConnectionReady(value)
      && [this._config.tap_action, this._config.hold_action].every((action) => !isServiceAction(action) || serviceTargetReady(value, action?.target?.entity_id || action?.data?.entity_id || action?.entity_id || entity))
      && previousState && previousState === value?.states?.[entity]
      && !["unknown", "unavailable"].includes(text(previousState.state).toLowerCase())) return;
    this._render();
  }
  get hass() { return this._hass; }
  disconnectedCallback() { this._graphRequests.clear(); this._graphHistory.clear(); this._graphErrors.clear(); this._cancelHold(); this._cancelSliderGesture(); }

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
      const target = climateTarget(attrs, text(state.state));
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
    if (!entity || this._graphAvailability(entity) || !this._hass?.callApi || this._graphHistory.has(entity)
      || this._graphErrors.has(entity) || this._graphRequests.has(entity)) return;
    const request = Symbol(entity);
    this._graphRequests.set(entity, request);
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const query = new URLSearchParams({
      filter_entity_id: entity,
      end_time: end.toISOString(),
      minimal_response: "",
      no_attributes: "",
    });
    this._hass.callApi("GET", `history/period/${start.toISOString()}?${query}`)
      .then((response) => {
        if (this._graphRequests.get(entity) !== request) return;
        this._graphHistory.set(entity, Array.isArray(response?.[0]) ? response[0] : []);
      })
      .catch(() => {
        if (this._graphRequests.get(entity) === request) this._graphErrors.add(entity);
      })
      .finally(() => {
        if (this._graphRequests.get(entity) === request) {
          this._graphRequests.delete(entity);
          this._render();
        }
      });
  }

  _graphMarkup(entity, variables = {}) {
    const end = Date.now();
    const start = end - 24 * 60 * 60 * 1000;
    const values = (this._graphHistory.get(entity) || []).map((record) => ({
      value: Number(record.state),
      time: new Date(record.last_changed || record.last_updated).getTime(),
    })).filter((record) => Number.isFinite(record.value) && Number.isFinite(record.time) && record.time >= start && record.time <= end);
    const current = Number(stateOf(this._hass, entity).state);
    if (Number.isFinite(current)) values.push({ value: current, time: end });
    values.sort((left, right) => left.time - right.time);
    if (values.length === 1) values.unshift({ ...values[0], time: start });
    if (!values.length) return '<svg class="graph-background" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>';
    // Recorder can return thousands of fast-changing values. Read the full
    // history but draw evenly distributed points, keeping the compact card
    // legible instead of turning fast state changes into visual stripes.
    const pointLimit = 240;
    const samples = values.length <= pointLimit
      ? values
      : Array.from(
        { length: pointLimit },
        (_, index) => values[Math.round((index * (values.length - 1)) / (pointLimit - 1))],
      );
    const minimum = Math.min(...samples.map((record) => record.value));
    const maximum = Math.max(...samples.map((record) => record.value));
    const spread = maximum - minimum || 1;
    const points = samples.map((record) => {
      const x = Math.max(0, Math.min(100, ((record.time - start) / (end - start)) * 100));
      const y = Math.max(6, Math.min(94, 94 - ((record.value - minimum) / spread) * 88));
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const fill = variables.show_graph_fill !== false ? `<polygon class="fill" points="0,100 ${points.join(" ")} 100,100"></polygon>` : "";
    const line = variables.show_graph_line !== false ? `<polyline class="line" points="${points.join(" ")}"></polyline>` : "";
    return `<svg class="graph-background" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${fill}${line}</svg>`;
  }

  _render() {
    if (!this.shadowRoot) return;
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
    const loading = !this._hass?.states;
    const originalState = loading ? {} : stateOf(this._hass, entity);
    const summary = !loading && Array.isArray(variables.summary_entities) && variables.summary_entities.length
      ? summaryState(variables.summary_entities, this._hass) : null;
    const state = summary ? { ...originalState, state: summary.state } : originalState;
    const configuredKind = text(config.template, "hc_base_card");
    const accessService = variables.action_service || config.tap_action?.service || config.tap_action?.perform_action;
    const requiresSlide = configuredKind.startsWith("hc_access_") && ["lock.unlock", "cover.open_cover"].includes(accessService);
    const kind = requiresSlide ? "hc_access_slide_action_card" : configuredKind;
    const graphEntity = text(variables.graph_entity || variables.power_entity || (["hc_graph_card", "hc_toggle_graph_card"].includes(kind) ? entity : ""));
    const showsGraph = Boolean(graphEntity) && (["hc_graph_card", "hc_toggle_graph_card"].includes(kind) || variables.show_graph === true);
    const roomLights = kind === "hc_room_card"
      ? [...new Set((Array.isArray(variables.light_entities) ? variables.light_entities : []).map(text).filter((light) => light.startsWith("light.")))]
      : [];
    const toggleEntity = kind === "hc_toggle_graph_card" ? text(variables.toggle_entity) : "";
    const interactionState = toggleEntity ? stateOf(this._hass, toggleEntity) : state;
    const value = loading ? "loading" : text(state.state, "unknown");
    const appearance = stateAppearance(kind, value, config, this._hass);
    const interactionUnavailable = ["unknown", "unavailable"].includes(text(interactionState.state, "unknown").toLowerCase());
    const stateDisabled = loading || Boolean(entity || toggleEntity) && (toggleEntity ? interactionUnavailable : appearance.unavailable);
    const serviceReady = serviceConnectionReady(this._hass);
    const controlsDisabled = !serviceReady || interactionUnavailable;
    const stateIcon = kind === "hc_sensor_card" && value === "off" ? variables.off_icon
      : ["hc_sensor_card", "hc_battery_card"].includes(kind) ? variables.on_icon : kind === "hc_vacuum_card" ? variables.icon : "";
    const icon = text(config.icon || stateIcon || state.attributes?.icon);
    const climate = kind === "hc_climate_card" ? state.attributes || {} : null;
    const displayValue = `${variables.custom_label || variables.hc_label_prefix || ""}${summary?.label || entityStateLabel(state, entity, kind, this._hass)}`;
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
    const roomLightsControlDisabled = controlsDisabled || roomLights.some((light) => ["unknown", "unavailable"].includes(text(stateOf(this._hass, light).state, "unknown").toLowerCase()));
    const roomLightsOffLabel = localize("room.turn_off_lights", this._hass, { name: this._label(entity, config, state) }, `Turn off all lights in ${this._label(entity, config, state)}`);
    const roomLightsControl = roomLights.length
      ? `<button class="room-lights-off" type="button" data-room-lights-off aria-label="${esc(roomLightsOffLabel)}" title="${esc(roomLightsOffLabel)}"${roomLightsControlDisabled ? " disabled" : ""}><ha-icon icon="mdi:lightbulb-off-outline" aria-hidden="true"></ha-icon><span>${esc(localize("common.all_off", this._hass, {}, "All off"))}</span></button>`
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
    if (kind === "hc_camera_card" && entity && previewAvailable && state.attributes?.entity_picture) {
      media = `<img class="camera" src="${esc(state.attributes.entity_picture)}" alt="${esc(this._label(entity, config, state))}">`;
    }
    const range = this._range(entity, state, kind, controlsDisabled);
    const artwork = kind === "hc_media_card" && mediaAvailable && variables.hc_show_background_art !== false && state.attributes?.entity_picture
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
      const power = stateOf(this._hass, variables.power_entity);
      const reading = Number.isFinite(Number(power.state)) && power.state !== "" && power.state != null
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
        if (stateOf(this._hass, variables[key]).state === "on") readings += readingMarkup(variables[key], localize(`dishwasher.${label}`, this._hass, {}, label.replaceAll('_',' ')), "mdi:alert-circle-outline", this._hass);
      }
    }
    const showName = config.show_name !== false && (!glance || Boolean(config.name));
    const titleCard = kind === "hc_title_card";
    const showState = !titleCard && !glance && Boolean(entity) && config.show_state !== false;
    const showIcon = !titleCard && !glance && config.show_icon !== false && variables.show_icon !== false;
    const iconOnly = !showName && !showState && config.show_label === false;
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
    const iconElement = usesNumberStepper || !showIcon ? "" : `<div class="icon" aria-hidden="true">${icon ? `<ha-icon icon="${esc(icon)}"></ha-icon>` : '<ha-state-icon data-state-icon></ha-state-icon>'}</div>`;
    const controlClass = kind === "hc_climate_card" ? "control number-control climate-number-control" : kind === "hc_wallbox_current_card" ? "control number-control wallbox-current-control" : usesNumberStepper ? "control number-control" : "control";
    const serviceTarget = action?.target?.entity_id || action?.data?.entity_id || action?.entity_id || entity;
    const actionDisabled = isServiceAction(action) ? controlsDisabled || !serviceTargetReady(this._hass, serviceTarget) : stateDisabled;
    const baseActionLabel = actionControlLabel(config, state, entity, action, this._hass);
    const targetEntity = text(action?.target?.entity_id || action?.entity_id || entity);
    const targetName = stateOf(this._hass, targetEntity).attributes?.friendly_name || targetEntity;
    const semanticActionLabel = iconOnly && isServiceAction(action) && targetName
      ? localize("actions.for_target", this._hass, { action: baseActionLabel, name: targetName }, `${baseActionLabel} ${targetName}`) : baseActionLabel;
    const holdAction = kind === "hc_access_hold_action_card" && Boolean(action);
    const alternateHold = !holdAction && config.hold_action && config.hold_action.action !== "none";
    const actionLabel = holdAction ? localize("access.hold_to_activate", this._hass, { action: semanticActionLabel }, `Hold to ${semanticActionLabel}`) : semanticActionLabel;
    const actionControl = action ? `<button class="card-action" type="button" data-card-action${holdAction ? " data-hold-action" : ""} aria-label="${esc(actionLabel)}" title="${esc(actionLabel)}"${actionDisabled ? " disabled" : ""}></button>` : "";
    const holdProgress = holdAction || alternateHold ? '<svg class="hold-progress" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" pathLength="100"></rect></svg>' : "";
    const holdHint = holdAction ? `<div class="climate">${esc(actionLabel)}</div>` : "";
    const graphStatus = showsGraph ? this._graphStatus(graphEntity) : "";
    const graphMarkup = showsGraph && graphStatus === "ready" ? this._graphMarkup(graphEntity, variables) : "";
    const graphStatusKey = { loading: "timeline.loading", empty: "timeline.no_history", error: "timeline.history_unavailable", unknown: "common.unknown", unavailable: "common.unavailable" }[graphStatus];
    const graphMessage = graphStatusKey ? `<div class="graph-status" role="${graphStatus === "error" ? "alert" : "status"}">${esc(localize(graphStatusKey, this._hass, {}, graphStatus === "error" ? "History unavailable" : graphStatus === "loading" ? "Loading history…" : graphStatus === "empty" ? "No history in the last 24 hours" : graphStatus))}</div>` : "";
    const readingContent = readings ? `<dl class="readings">${readings}</dl>` : "";
    const vacuum = kind === "hc_vacuum_card" ? vacuumActions(state, variables) : [];
    const vacuumControls = vacuum.length ? `<div class="vacuum-actions" role="group" aria-label="${esc(this._label(entity, config, state))}">${vacuum.map((entry, index) => {
      const label = entry.label || localize(entry.labelKey, this._hass, { segment: entry.segment }, entry.segment == null ? climateModeLabel(entry.key) : `Clean segment ${entry.segment}`);
      const semanticLabel = localize("actions.for_target", this._hass, { action: label, name: this._label(entity, config, state) }, `${label} ${this._label(entity, config, state)}`);
      return `<button type="button" data-vacuum-action="${index}" aria-label="${esc(semanticLabel)}" title="${esc(label)}"${controlsDisabled ? " disabled" : ""}><ha-icon icon="${esc(entry.icon)}" aria-hidden="true"></ha-icon></button>`;
    }).join("")}</div>` : "";
    this.shadowRoot.innerHTML = `<style>${cardStyles()}</style><ha-card${showsGraph ? ` data-graph-history-state="${graphStatus}"` : ""}${titleCard ? ' class="title-surface"' : ""}${loading ? ' aria-busy="true"' : ""}>${graphMarkup}${artwork}${actionControl}${holdProgress}<div class="body${iconOnly ? " icon-only" : ""}${showName && kind === "hc_navigation_card" ? " navigation-card" : ""}${titleCard ? " title-card" : ""}${glance ? " glance-card" : ""}${kind === "hc_media_app_card" ? " media-app-card" : ""}${climate ? " climate-card" : ""}${showsGraph ? " graph-card" : ""}${kind === "hc_wallbox_current_card" ? " wallbox-card" : ""}${modeButtons ? " with-climate-modes" : ""}">${showName ? `<div class="title">${esc(this._label(entity, config, state))}</div>` : ""}${showState && kind !== "hc_wallbox_current_card" ? `<div class="state">${esc(displayValue)}</div>` : ""}${climateControls}${details}${holdHint}${iconElement}${media}${range ? `<div class="${controlClass}">${range}</div>` : ""}${roomLightsControl}${sceneButtons}${shortcutButtons}${modeButtons}${readingContent}${vacuumControls}${graphMessage}</div></ha-card>`;
    for (const symbol of this.shadowRoot.querySelectorAll("ha-state-icon")) {
      const readingEntity = symbol.dataset.readingEntity;
      symbol.hass = this._hass;
      symbol.stateObj = readingEntity ? presentationState(stateOf(this._hass, readingEntity), readingEntity, "hc_sensor_card") : presentationState(state, entity, kind);
    }
    const card = this.shadowRoot.querySelector("ha-card");
    if (card) {
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
      if ((stateDisabled || actionDisabled) && !glance) {
        card.style.setProperty("--marao-card-opacity", "0.6");
        card.style.opacity = "0.6";
        card.setAttribute("aria-disabled", "true");
      }
    }
    const actionButton = this.shadowRoot.querySelector("[data-card-action]");
    if (actionButton) {
      if (holdAction) this._bindHoldAction(actionButton, card, () => performAction(this._hass, action, entity));
      else if (alternateHold) this._bindHoldAction(actionButton, card, () => performAction(this._hass, config.hold_action, entity), () => { actionButton.focus?.({ preventScroll: true }); performAction(this._hass, action, entity); });
      else this._bindTapAction(actionButton, card, () => performAction(this._hass, action, entity));
    }
    for (const button of this.shadowRoot.querySelectorAll("[data-vacuum-action]")) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (button.disabled || !serviceConnectionReady(this._hass)) return;
        const entry = vacuum[Number(button.dataset.vacuumAction)];
        performAction(this._hass, { action: "call-service", service: entry.service, data: entry.data, haptic: "heavy" }, entity);
      });
    }
    if (roomLightsControl) {
      this.shadowRoot.querySelector("[data-room-lights-off]")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        performAction(this._hass, { action: "call-service", service: "light.turn_off", data: { entity_id: roomLights }, haptic: "heavy" }, entity);
      });
    }
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
            if (label) label.textContent = entityStateLabel(state, entity, kind, this._hass);
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
    const line = this.shadowRoot?.querySelector(".hold-progress rect");
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
    this.shadowRoot?.querySelector("ha-card")?.classList.remove("is-pressed");
  }

  _setRange(entity, kind, value) {
    if (!serviceConnectionReady(this._hass) || !entity) return;
    const domain = domainOf(entity);
    if (kind === "hc_light_card") return callServiceWithNotification(this._hass, "light", "turn_on", { entity_id: entity, brightness_pct: value });
    if (kind === "hc_cover_card") return callServiceWithNotification(this._hass, "cover", "set_cover_position", { entity_id: entity, position: value });
    if (kind === "hc_fan_card") return callServiceWithNotification(this._hass, "fan", "set_percentage", { entity_id: entity, percentage: value });
    if (kind === "hc_access_slide_action_card" && value >= 100) {
      const service = text(this._config.variables?.action_service);
      const [serviceDomain, serviceName] = service.split(".", 2);
      if (serviceDomain && serviceName) {
        const input = this.shadowRoot.querySelector("input.action-slider");
        input?.setAttribute("disabled", "true");
        haptic("heavy");
        callServiceWithNotification(this._hass, serviceDomain, serviceName, { entity_id: entity })
          .finally(() => { if (input) { input.value = "0"; input.removeAttribute("disabled"); } });
      }
    }
  }

  _adjustNumber(entity, kind, direction) {
    if (!serviceConnectionReady(this._hass) || !entity) return;
    const state = stateOf(this._hass, entity);
    haptic("heavy");
    if (kind === "hc_climate_card") {
      const data = climateTemperatureChange(state.attributes || {}, text(state.state), direction);
      if (!data) return;
      return callServiceWithNotification(this._hass, "climate", "set_temperature", { entity_id: entity, ...data });
    }
    if (["hc_number_card", "hc_wallbox_current_card"].includes(kind)) {
      const value = numberStepValue(state.state, state.attributes || {}, direction);
      if (value == null) return;
      return callServiceWithNotification(this._hass, domainOf(entity), "set_value", { entity_id: entity, value });
    }
  }

  _setNumberValue(entity, value) {
    if (!serviceConnectionReady(this._hass) || !entity || !Number.isFinite(value)) return;
    haptic("heavy");
    return callServiceWithNotification(this._hass, domainOf(entity), "set_value", { entity_id: entity, value });
  }

  _setClimateMode(entity, mode) {
    if (!serviceConnectionReady(this._hass) || !entity || !mode) return;
    haptic("heavy");
    return callServiceWithNotification(this._hass, "climate", "set_hvac_mode", { entity_id: entity, hvac_mode: mode });
  }

  _selectSceneOption(entity, option) {
    const state = stateOf(this._hass, entity);
    const domain = domainOf(entity);
    if (!serviceConnectionReady(this._hass) || !["input_select", "select"].includes(domain)
      || ["unknown", "unavailable"].includes(text(state.state, "unknown"))
      || !Array.isArray(state.attributes?.options) || !state.attributes.options.includes(option)) return;
    haptic("heavy");
    return callServiceWithNotification(this._hass, domain, "select_option", { entity_id: entity, option });
  }

  getCardSize() { return 2; }
}

export class MaraoNavbarCard extends BaseElement {
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; }
  setConfig(config) {
    const routes = Array.isArray(config?.routes) ? config.routes : [];
    if (routes.length > 5) throw new Error("Marao navbar supports at most five routes");
    this._config = { ...config, routes }; this._render();
  }
  connectedCallback() { registerFullscreen(this); this._render(); }
  disconnectedCallback() { unregisterFullscreen(this); }
  set hass(value) { this._hass = value; this.shadowRoot?.querySelector("nav")?.setAttribute("aria-label", localize("navigation.label", value, {}, "Marao navigation")); }
  _render() {
    if (!this.shadowRoot) return;
    const routes = this._config.routes || [];
    const routeCount = Math.max(routes.length, 1);
    const bottom = /iPhone|iPod/i.test(navigator.userAgent || "") ? "max(4px, calc(var(--marao-safe-area-inset-bottom, env(safe-area-inset-bottom)) - 20px))" : "12px";
    this.shadowRoot.innerHTML = `<style>:host{display:block;height:128px;font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif)}.nav{position:fixed;z-index:1001;left:50%;bottom:${bottom};transform:translateX(-50%);display:grid;grid-template-columns:repeat(${routeCount},minmax(0,1fr));grid-template-rows:1fr;gap:clamp(2px,.5vw,4px);width:min(calc(100vw - 24px),calc(${routeCount} * 54px + 20px));height:60px;box-sizing:border-box;padding:6px 10px;border-radius:999px;background:var(--ha-card-background,var(--card-background-color));box-shadow:0 8px 30px rgba(0,0,0,.22)}a{display:grid;place-items:center;min-width:48px;width:48px;height:48px;aspect-ratio:1 / 1;align-self:center;justify-self:center;color:var(--icon-color,var(--primary-text-color));text-decoration:none;border-radius:50%;font-size:clamp(1.125rem,4vw,1.75rem);transition:transform .12s ease,filter .12s ease}a:active{transform:scale(.92);filter:brightness(.96)}a.active{color:var(--text-primary-color,var(--active-text-color));background:var(--primary-color)}a:focus{outline:none}ha-icon{--mdc-icon-size:26px}@media(max-width:300px){:host{height:228px}.nav{display:flex;flex-wrap:wrap;justify-content:center;height:auto;min-height:60px;border-radius:28px}a{flex:0 0 48px}}@media(prefers-reduced-motion:reduce){a{transition:none}}</style><nav class="nav" aria-label="${esc(localize("navigation.label", this._hass, {}, "Marao navigation"))}">${routes.map((route) => `<a href="${esc(route.url || route.path || "#")}" title="${esc(route.label)}" aria-label="${esc(route.label)}"><ha-icon icon="${esc(route.icon_selected || route.icon || "mdi:circle-outline")}"></ha-icon></a>`).join("")}</nav>`;
    this.shadowRoot.querySelectorAll("a").forEach((link) => {
      const active = link.getAttribute("href") === `${window.location.pathname}${window.location.hash}` || link.getAttribute("href") === window.location.pathname;
      link.classList.toggle("active", active);
      link.addEventListener("click", (event) => { event.preventDefault(); haptic("heavy"); navigate(link.getAttribute("href")); this._render(); });
    });
  }
  getCardSize() { return 0; }
}

const fullscreenUsers = new Set();
let fullscreenTimer;
const fullscreenOriginals = new Map();
function findElements(selector, root = document) {
  const found = [];
  const visit = (root) => {
    root?.querySelectorAll?.(selector).forEach((item) => found.push(item));
    root?.querySelectorAll?.("*").forEach((item) => { if (item.shadowRoot) visit(item.shadowRoot); });
  };
  visit(root);
  return found;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function focusableElements(root) {
  return findElements(FOCUSABLE, root).filter((element) => !element.hidden && element.getAttribute?.("aria-hidden") !== "true");
}
function deepActiveElement() {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}
export function focusRestorer(element) {
  const root = element?.getRootNode?.();
  const attribute = element?.getAttributeNames?.().find((name) => name === "id" || name.startsWith("data-")) || "aria-label";
  const value = element?.getAttribute?.(attribute);
  const liveTarget = () => element?.isConnected ? element : value != null
    ? [...(root?.querySelectorAll?.(element.localName) || [])].find((candidate) => candidate.getAttribute(attribute) === value)
    : null;
  return async () => {
    // HA updates replace card contents, while the owning shadow root survives.
    let target = liveTarget();
    while (target?.isConnected) {
      // A new ha-card is connected before Lit creates the slot for its controls.
      const rendered = target.closest?.("ha-card")?.updateComplete;
      if (rendered) await rendered;
      const current = liveTarget();
      if (current !== target) { target = current; continue; }
      target.focus?.({ preventScroll: true });
      return;
    }
  };
}
function applyFullscreen() {
  if (!fullscreenUsers.size) return;
  const isIPhone = /iPhone|iPod/i.test(navigator.userAgent || "");
  findElements("app-header, ha-app-layout > header, .header").forEach((header) => {
    if (!fullscreenOriginals.has(header)) fullscreenOriginals.set(header, { display: header.style.display });
    header.style.display = "none";
  });
  findElements("#view").forEach((view) => {
    if (!fullscreenOriginals.has(view)) fullscreenOriginals.set(view, { padding: view.style.padding });
    view.style.padding = isIPhone ? "var(--marao-safe-area-inset-top, env(safe-area-inset-top)) 0 0" : "0";
  });
}
function registerFullscreen(element) {
  fullscreenUsers.add(element);
  applyFullscreen();
  clearInterval(fullscreenTimer);
  fullscreenTimer = setInterval(applyFullscreen, 1000);
}
function unregisterFullscreen(element) {
  fullscreenUsers.delete(element);
  if (fullscreenUsers.size) return;
  clearInterval(fullscreenTimer);
  fullscreenTimer = undefined;
  for (const [node, original] of fullscreenOriginals) {
    if (original.display !== undefined) node.style.display = original.display;
    if (original.padding !== undefined) node.style.padding = original.padding;
  }
  fullscreenOriginals.clear();
}

export class MaraoPopupCard extends BaseElement {
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._hass = null; this._open = false; this._focus = null; this._childrenRenderId = 0; this._backgroundState = []; }
  setConfig(config) { this._config = { height: "auto", max_height: "80dvh", ...config }; this._renderHost(); this._sync(); if (this._open) this._renderChildren(); }
  set hass(value) { this._hass = value; this._updateChildrenHass(); }
  connectedCallback() { window.addEventListener("hashchange", this._sync); window.addEventListener("location-changed", this._sync); window.addEventListener("popstate", this._sync); this._sync(); }
  disconnectedCallback() { window.removeEventListener("hashchange", this._sync); window.removeEventListener("location-changed", this._sync); window.removeEventListener("popstate", this._sync); this._close(false); }
  _renderHost() { if (this.shadowRoot) this.shadowRoot.innerHTML = "<style>:host{display:block;height:0;overflow:visible}</style>"; }
  _sync = () => { if (!this.isConnected) return; const hash = text(this._config.hash); if (hash && window.location.hash === hash) this._openSheet(); else this._close(false); };
  _openSheet() {
    if (this._open) return;
    this._open = true; this._focus = focusRestorer(deepActiveElement());
    const height = this._config.height === "auto" ? "auto" : text(this._config.height);
    const isClimateModePopup = this._config.cards?.some((card) => card?.template === "hc_climate_card" && card.variables?.show_mode_buttons);
    const title = isClimateModePopup ? "" : text(this._config.title ?? this._config.name);
    const column = findElements("#columns > div:nth-child(1)")[0];
    const columnWidth = column ? Math.round(column.getBoundingClientRect().width) : 0;
    const maxWidth = columnWidth > 0 ? `${columnWidth}px` : "100%";
    const closeLabel = localize("popup.close", this._hass, {}, "Close popup");
    const overlay = document.createElement("div"); overlay.className = "marao-popup-overlay";
    overlay.innerHTML = `<style>@keyframes marao-popup-slide-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.marao-popup-overlay{position:fixed;inset:0;z-index:1100;display:flex;align-items:flex-end;background:rgba(0,0,0,.42);font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif)}.marao-popup-sheet{box-sizing:border-box;width:100%;max-width:${maxWidth};height:${esc(height)};max-height:${esc(this._config.max_height)};margin:0 auto;overflow:auto;padding:0 16px;border-radius:22px 22px 0 0;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);overscroll-behavior:contain;animation:marao-popup-slide-up .28s cubic-bezier(.2,.8,.2,1) both}.marao-popup-head{display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:0;padding:12px 0 8px;background:inherit;z-index:1}.marao-popup-head h2{min-width:0;margin:0;font-size:var(--font-size-primary,1.25rem);line-height:1.2;overflow-wrap:anywhere}.marao-popup-close{flex:0 0 48px;width:48px;height:48px;padding:0;border:0;border-radius:50%;font-size:1.5rem;background:var(--secondary-background-color);color:inherit;cursor:pointer;transition:transform .12s ease,filter .12s ease}.marao-popup-close:active{transform:scale(.92);filter:brightness(.96)}.marao-popup-close:focus,.marao-popup-sheet:focus{outline:none}.marao-popup-content{display:grid;min-width:0;gap:12px;isolation:isolate;padding-bottom:calc(92px + var(--marao-safe-area-inset-bottom, env(safe-area-inset-bottom)))}@media(max-width:300px){.marao-popup-content{padding-bottom:calc(192px + var(--marao-safe-area-inset-bottom, env(safe-area-inset-bottom)))}}@media(max-width:240px){.marao-popup-sheet{padding-left:4px;padding-right:4px}}@media(prefers-reduced-motion:reduce){.marao-popup-sheet{animation:none}.marao-popup-close{transition:none}}</style><section class="marao-popup-sheet" role="dialog" aria-modal="true" aria-label="${esc(title || this._config.name || localize("popup.title", this._hass, {}, "Marao popup"))}" tabindex="-1"><div class="marao-popup-head"><h2>${esc(title)}</h2><button class="marao-popup-close" type="button" aria-label="${esc(closeLabel)}" title="${esc(closeLabel)}">×</button></div><div class="marao-popup-content"></div></section>`;
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
    overlay.querySelector(".marao-popup-close")?.focus();
    this._setBackgroundInert(overlay, root);
    this._renderChildren();
  }
  async _renderChildren() {
    const host = this._overlay?.querySelector(".marao-popup-content"); if (!host) return;
    const renderId = ++this._childrenRenderId;
    host.replaceChildren();
    const helpers = await globalThis.loadCardHelpers?.();
    if (renderId !== this._childrenRenderId || host !== this._overlay?.querySelector(".marao-popup-content")) return;
    for (const config of Array.isArray(this._config.cards) ? this._config.cards : []) {
      if (renderId !== this._childrenRenderId) return;
      try { const card = helpers?.createCardElement ? helpers.createCardElement(config) : document.createElement("div"); if (card.setConfig) card.setConfig(config); card.hass = this._hass; host.append(card); } catch (error) { const message = document.createElement("p"); message.textContent = error.message; host.append(message); }
    }
  }
  _updateChildrenHass() {
    const host = this._overlay?.querySelector(".marao-popup-content");
    for (const card of host?.children || []) card.hass = this._hass;
  }
  _setBackgroundInert(overlay, root = document.body) {
    const outside = root === document.body ? [] : [...document.body.children].filter((element) => element !== root.host);
    this._backgroundState = [...new Set([...root.children, ...outside])]
      .filter((element) => element !== overlay)
      .map((element) => ({ element, inert: Boolean(element.inert) }));
    for (const { element } of this._backgroundState) element.inert = true;
  }
  _restoreBackground() {
    for (const { element, inert } of this._backgroundState) element.inert = inert;
    this._backgroundState = [];
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
  _close(updateHash) {
    if (!this._open) return;
    this._open = false; this._overlay?.remove(); this._overlay = null; this._restoreBackground();
    if (updateHash && window.location.hash === text(this._config.hash)) {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
      window.dispatchEvent(new Event("location-changed"));
    }
    this._focus?.(); this._focus = null;
  }
  getCardSize() { return 0; }
}

export function registerMaraoCards() {
  for (const [name, klass] of [["marao-card", MaraoCard], ["marao-navbar-card", MaraoNavbarCard], ["marao-popup-card", MaraoPopupCard]]) {
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
