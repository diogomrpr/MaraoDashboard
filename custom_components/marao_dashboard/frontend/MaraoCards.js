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
    background = Number.isFinite(percentage) ? (percentage >= 80 ? green : percentage >= 20 ? "var(--color-yellow)" : red) : undefined;
  } else if (["hc_access_action_card", "hc_access_hold_action_card", "hc_access_slide_action_card"].includes(kind)) {
    background = variables.action_color;
    accent = variables.action_color || active;
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
    accent = active || "var(--primary-color)";
    if (value === "on") background = active || "var(--primary-color)";
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
    if (["auto", "dry", "drying"].includes(value)) foreground = "var(--color-black)";
    accent = background || active;
  } else if (kind === "hc_number_card") {
    accent = active || "var(--primary-color)";
  } else if (kind === "hc_wallbox_current_card") {
    accent = active || "var(--primary-color)";
  } else if (kind === "hc_room_card") {
    if (value === "on") background = "var(--room-card-active-background,var(--primary-color))";
  } else if (kind === "hc_toggle_graph_card") {
    if (stateOf(hass, text(variables.toggle_entity)).state === "on") background = active || "var(--primary-color)";
  }

  const unavailable = ["unavailable", "unknown"].includes(value);
  if (!background) return { unavailable, accent };
  return { background, text: foreground || "var(--active-text-color)", icon: foreground || "var(--active-text-color)", accent, unavailable };
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
  if (!serviceConnectionReady(hass)) return;
  try {
    return await hass.callService(domain, service, data);
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
    if (action.target?.entity_id) data.entity_id = action.target.entity_id;
    else if (!data.entity_id) data.entity_id = target;
    return callServiceWithNotification(hass, domain, name, data);
  }
}

function cardStyles() {
  return `
    :host { display:block; color:var(--primary-text-color); font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif); }
    ha-card { position:relative; box-sizing:border-box; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--marao-card-background,var(--ha-card-background,var(--card-background-color))); color:var(--marao-card-text-color,inherit); border:var(--marao-card-border,0 solid transparent); transition:transform .12s ease; }
    ha-card.is-pressed { transform:scale(.985); }
    .card-action { position:absolute; inset:0; z-index:1; width:100%; height:100%; margin:0; padding:0; border:0; border-radius:inherit; background:transparent; color:transparent; cursor:pointer; }
    .card-action:disabled { cursor:default; }
    .body { position:relative; z-index:2; display:grid; grid-template-columns:minmax(0,1fr) auto; grid-template-areas:'title icon' 'state icon' 'climate icon' 'control control'; gap:4px 12px; align-items:center; min-height:84px; padding:14px; pointer-events:none; }
    .body.with-climate-modes { grid-template-areas:'title icon' 'state icon' 'climate icon' 'modes modes'; }
    .body.icon-only { display:flex; align-items:center; justify-content:center; gap:0; min-height:64px; padding:12px; }
    .body.icon-only .icon { grid-area:auto; }
    .body.media-app-card { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center; }
    .body.media-app-card .icon { order:-1; flex:0 0 52px; }
    .body.media-app-card .title { display:flex; align-items:center; justify-content:center; width:100%; min-height:2.5em; }
    .title, .state, .climate { min-width:0; max-width:100%; overflow-wrap:anywhere; line-height:1.25; }
    .title { grid-area:title; font-weight:var(--font-weight-primary,700); font-size:var(--font-size-primary,1.125rem); }
    .state { grid-area:state; color:var(--marao-card-text-color,var(--secondary-text-color)); font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); }
    .climate { grid-area:climate; color:var(--marao-card-text-color,var(--secondary-text-color)); font-size:var(--font-size-secondary,1rem); font-weight:var(--font-weight-secondary,500); }
    .climate-card .state { font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-primary,700); }
    .climate-card .current-temperature { font-size:max(2rem,var(--font-size-primary,1.125rem)); font-weight:var(--font-weight-primary,700); line-height:1.1; }
    .icon { grid-area:icon; display:grid; place-items:center; width:52px; height:52px; border-radius:50%; background:var(--marao-icon-background,var(--opacity-contrast-100,rgba(0,0,0,.08))); color:var(--marao-icon-color,var(--icon-color)); }
    .icon ha-icon { --mdc-icon-size:28px; }
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
    .wallbox-stepper { min-width:92px; padding:4px 8px; }
    .wallbox-stepper .number-value { font-size:2.2rem; line-height:1.05; opacity:1; }
    .wallbox-stepper button { width:48px; height:48px; }
    .wallbox-shortcuts { grid-area:wallbox; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; width:100%; margin-top:8px; }
    .wallbox-shortcuts button { min-width:48px; min-height:48px; font-size:var(--font-size-primary,1.125rem); font-weight:var(--font-weight-primary,700); }
    .control.climate-number-control { align-self:stretch; }
    .number-stepper { display:grid; justify-items:center; gap:2px; min-width:52px; width:auto; max-width:42vw; padding:4px; box-sizing:border-box; border-radius:999px; background:var(--button-card-background,var(--secondary-background-color)); }
    .number-stepper button { display:grid; place-items:center; width:48px; height:48px; padding:0; border-radius:50%; background:transparent; }
    .number-stepper button:active { background:var(--marao-icon-background,var(--opacity-contrast-100,rgba(0,0,0,.08))); }
    .number-stepper ha-icon { --mdc-icon-size:25px; }
    .number-value { max-width:100%; min-width:max-content; margin:0; padding:0; border:0; opacity:.72; color:inherit; background:transparent; font:inherit; font-size:var(--font-size-caption,.9375rem); font-weight:var(--font-weight-primary,700); line-height:1.2; overflow-wrap:anywhere; white-space:nowrap; text-align:center; }
    .climate-stepper { min-width:60px; height:100%; padding:3px; align-content:space-between; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); }
    .climate-stepper button { width:52px; height:48px; }
    .climate-stepper ha-icon { --mdc-icon-size:32px; }
    .climate-stepper .number-value { font-size:var(--font-size-primary,1.1875rem); opacity:1; }
    .slider { position:relative; display:flex; align-items:center; width:100%; min-height:48px; }
    .slider-track { position:absolute; inset:0; overflow:hidden; border-radius:24px; background:var(--marao-slider-track,color-mix(in srgb,var(--marao-accent-color,var(--primary-color)) 35%,var(--active-text-color))); }
    .slider-fill { display:block; height:100%; width:var(--marao-slider-fill-width,0px); border-radius:24px; background:var(--marao-slider-fill,var(--active-text-color)); }
    input[type=range] { position:relative; z-index:1; appearance:none; width:100%; min-height:48px; height:48px; margin:4px 0; border-radius:24px; background:transparent; accent-color:var(--marao-accent-color,var(--primary-color)); cursor:pointer; }
    input[type=range]::-webkit-slider-runnable-track { height:48px; border-radius:24px; background:transparent; }
    input[type=range]::-webkit-slider-thumb { appearance:none; width:48px; height:48px; margin-top:0; border:0; border-radius:50%; background:var(--marao-accent-color,var(--primary-color)); box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform .12s ease; }
    input[type=range]:active:not(:disabled)::-webkit-slider-thumb { transform:scale(.94); }
    input[type=range]::-moz-range-track { height:48px; border-radius:24px; background:transparent; }
    input[type=range]::-moz-range-progress { height:48px; border-radius:24px; background:transparent; }
    input[type=range]::-moz-range-thumb { width:48px; height:48px; border:0; border-radius:50%; background:var(--marao-accent-color,var(--primary-color)); box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform .12s ease; }
    input[type=range]:active:not(:disabled)::-moz-range-thumb { transform:scale(.94); }
    .hold-progress { position:absolute; inset:1px; z-index:4; width:calc(100% - 2px); height:calc(100% - 2px); overflow:visible; pointer-events:none; }
    .hold-progress rect { fill:none; stroke:var(--marao-accent-color,var(--primary-color)); stroke-width:3px; stroke-linecap:round; stroke-dasharray:100; stroke-dashoffset:100; vector-effect:non-scaling-stroke; }
    .camera { grid-column:1/-1; width:100%; aspect-ratio:16/9; object-fit:cover; background:#000; }
    @media (prefers-reduced-motion:reduce) { ha-card,button,input[type=range]::-webkit-slider-thumb,input[type=range]::-moz-range-thumb { transition:none; } }
  `;
}

export class MaraoCard extends BaseElement {
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._hass = null; this._sliderTargets = new Map(); this._sliderObserver = null; this._holdTimer = null; this._holdFrame = null; this._holdActive = false; this._holdCompleted = false; }
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(value) { this._hass = value; this._render(); }
  get hass() { return this._hass; }
  disconnectedCallback() { this._sliderObserver?.disconnect(); this._cancelHold(); }

  _label(entity, config, state) {
    return config.name || state?.attributes?.friendly_name || entity || config.template || "Marao";
  }

  _range(entity, state, kind, disabled = false) {
    const attrs = state.attributes || {};
    const key = `${kind}:${entity}`;
    if (kind === "hc_climate_card") {
      const target = climateTarget(attrs, text(state.state));
      const label = localize("climate.target_temperature", this._hass, {}, "Target temperature");
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
      hc_light_card: [0, 100, Number(attrs.brightness) * 100 / 255 || 0, "brightness", 1],
      hc_cover_card: [0, 100, Number(attrs.current_position) || 0, "position", 1],
      hc_fan_card: [0, 100, Number(attrs.percentage) || 0, "percentage", 1],
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
    return `<div class="slider"><span class="slider-track"><span class="slider-fill"></span></span><input data-slider-key="${esc(key)}" data-slider-current="${Number.isFinite(current) ? current : min}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${esc(modeLabel)}" title="${esc(modeLabel)}"${disabled ? " disabled" : ""}></div>`;
  }

  _render() {
    if (!this.shadowRoot) return;
    this._cancelHold();
    this._sliderObserver?.disconnect();
    this._sliderObserver = null;
    const config = this._config || {};
    const entity = text(config.entity);
    const loading = !this._hass?.states;
    const state = loading ? {} : stateOf(this._hass, entity);
    const kind = text(config.template, "hc_base_card");
    const value = loading ? "loading" : text(state.state, "unknown");
    const appearance = stateAppearance(kind, value, config, this._hass);
    const stateDisabled = loading || appearance.unavailable;
    const serviceReady = serviceConnectionReady(this._hass);
    const controlsDisabled = stateDisabled || !serviceReady;
    const icon = text(config.icon || state.attributes?.icon, "mdi:home-automation");
    const climate = kind === "hc_climate_card" ? state.attributes || {} : null;
    const displayValue = loading
      ? localize("common.loading", this._hass, {}, "Loading…")
      : climate
        ? climateModeLabel(value, this._hass)
        : localize(`common.${value}`, this._hass, {}, value);
    const currentTemperature = climate && climate.current_temperature != null ? text(climate.current_temperature) : "";
    const climateReadingLabel = currentTemperature ? localize("climate.current_temperature", this._hass, { value: currentTemperature }, `Current ${currentTemperature}`) : "";
    const climateModes = Array.isArray(climate?.hvac_modes) ? climate.hvac_modes.filter(Boolean).map(text) : [];
    const modeButtons = kind === "hc_climate_card" && config.variables?.show_mode_buttons && climateModes.length
      ? `<div class="climate-modes" role="group" aria-label="${esc(localize("climate.modes", this._hass, {}, "Climate modes"))}">${climateModes.map((mode) => { const label = climateModeLabel(mode, this._hass); const controlLabel = localize("climate.set_mode", this._hass, { mode: label }, `Set climate mode to ${label}`); return `<button class="climate-mode${mode === value ? " active" : ""}" type="button" data-climate-mode="${esc(mode)}" aria-label="${esc(controlLabel)}" title="${esc(controlLabel)}"${controlsDisabled ? " disabled" : ""}><ha-icon icon="${esc(climateModeIcon(mode))}" aria-hidden="true"></ha-icon><span>${esc(label)}</span></button>`; }).join("")}</div>` : "";
    const shortcuts = kind === "hc_wallbox_current_card"
      ? (Array.isArray(config.variables?.shortcuts) ? config.variables.shortcuts : []).map(Number).filter(Number.isFinite).slice(0, 3)
      : [];
    const shortcutButtons = shortcuts.length
      ? `<div class="wallbox-shortcuts" role="group" aria-label="${esc(localize("wallbox.shortcuts", this._hass, {}, "Charging current shortcuts"))}">${shortcuts.map((shortcut) => `<button type="button" data-current-shortcut="${shortcut}"${controlsDisabled ? " disabled" : ""}>${esc(shortcut)}${esc(state.attributes?.unit_of_measurement || "A")}</button>`).join("")}</div>`
      : "";
    const climateControls = currentTemperature ? `<div class="climate current-temperature" aria-label="${esc(climateReadingLabel)}">${esc(currentTemperature)}</div>` : "";
    let media = "";
    if (kind === "hc_camera_card" && entity && state.attributes?.entity_picture) {
      media = `<img class="camera" src="${esc(state.attributes.entity_picture)}" alt="${esc(this._label(entity, config, state))}">`;
    }
    const range = this._range(entity, state, kind, controlsDisabled);
    const showName = config.show_name !== false;
    const showState = config.show_state !== false;
    const iconOnly = !showName && !showState && config.show_label === false;
    const isAction = ["hc_switch_card", "hc_light_card", "hc_cover_card", "hc_fan_card", "hc_access_card", "hc_scene_card"].includes(kind);
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
    const usesNumberStepper = ["hc_climate_card", "hc_number_card", "hc_wallbox_current_card"].includes(kind);
    const iconElement = usesNumberStepper ? "" : `<div class="icon" aria-hidden="true"><ha-icon icon="${esc(icon)}"></ha-icon></div>`;
    const controlClass = kind === "hc_climate_card" ? "control number-control climate-number-control" : kind === "hc_wallbox_current_card" ? "control number-control wallbox-current-control" : usesNumberStepper ? "control number-control" : "control";
    const actionDisabled = stateDisabled || (isServiceAction(action) && !serviceReady);
    const baseActionLabel = actionControlLabel(config, state, entity, action, this._hass);
    const holdAction = kind === "hc_access_hold_action_card" && Boolean(action);
    const actionLabel = holdAction ? localize("access.hold_to_activate", this._hass, { action: baseActionLabel }, `Hold to ${baseActionLabel}`) : baseActionLabel;
    const actionControl = action ? `<button class="card-action" type="button" data-card-action${holdAction ? " data-hold-action" : ""} aria-label="${esc(actionLabel)}" title="${esc(actionLabel)}"${actionDisabled ? " disabled" : ""}></button>` : "";
    const holdProgress = holdAction ? '<svg class="hold-progress" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="97" height="97" rx="8" ry="8" pathLength="100"></rect></svg>' : "";
    const holdHint = holdAction ? `<div class="climate">${esc(actionLabel)}</div>` : "";
    this.shadowRoot.innerHTML = `<style>${cardStyles()}</style><ha-card${loading ? ' aria-busy="true"' : ""}>${actionControl}${holdProgress}<div class="body${iconOnly ? " icon-only" : ""}${kind === "hc_media_app_card" ? " media-app-card" : ""}${climate ? " climate-card" : ""}${kind === "hc_wallbox_current_card" ? " wallbox-card" : ""}${modeButtons ? " with-climate-modes" : ""}">${showName ? `<div class="title">${esc(this._label(entity, config, state))}</div>` : ""}${showState && kind !== "hc_wallbox_current_card" ? `<div class="state">${esc(displayValue)}</div>` : ""}${climateControls}${holdHint}${iconElement}${range ? `<div class="${controlClass}">${range}</div>` : ""}${shortcutButtons}${modeButtons}</div></ha-card>`;
    const card = this.shadowRoot.querySelector("ha-card");
    if (card) {
      if (appearance.background) card.style.setProperty("--marao-card-background", appearance.background);
      if (appearance.text) card.style.setProperty("--marao-card-text-color", appearance.text);
      if (appearance.icon) card.style.setProperty("--marao-icon-color", appearance.icon);
      if (appearance.accent) card.style.setProperty("--marao-accent-color", appearance.accent);
      if (stateDisabled) {
        card.style.setProperty("--marao-card-opacity", "0.6");
        card.style.opacity = "0.6";
        card.setAttribute("aria-disabled", "true");
      }
    }
    const actionButton = this.shadowRoot.querySelector("[data-card-action]");
    if (actionButton) {
      if (holdAction) this._bindHoldAction(actionButton, card, () => performAction(this._hass, action, entity));
      else this._bindTapAction(actionButton, card, () => performAction(this._hass, action, entity));
    }
    const input = this.shadowRoot.querySelector("input[type=range]");
    if (input) {
      const min = Number(input.min);
      const max = Number(input.max);
      const current = Number(input.dataset.sliderCurrent ?? input.value);
      const toPercent = (value) => max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
      const setProgress = (progress) => {
        const percent = Math.max(0, Math.min(100, progress));
        input.style.setProperty("--marao-slider-progress", `${percent}%`);
        const parent = input.parentElement;
        parent?.style.setProperty("--marao-slider-progress", `${percent}%`);
        const track = parent?.querySelector(".slider-track");
        if (track) {
          const width = track.getBoundingClientRect().width;
          const thumb = 48;
          // The rounded fill needs to reach the thumb's outer edge.  It is
          // rendered below the thumb, so this removes the crescent-shaped gap
          // at the join without ever showing beyond the button or track.
          track.style.setProperty("--marao-slider-fill-width", `${Math.min(width, thumb + (percent / 100) * Math.max(0, width - thumb))}px`);
        }
      };
      const updateProgress = (target = Number(input.value)) => {
        const progress = Math.min(toPercent(current), toPercent(target));
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
      input.addEventListener("pointerdown", () => haptic("heavy"));
      input.addEventListener("keydown", (event) => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) haptic("heavy");
      });
      input.addEventListener("change", () => {
        const value = Number(input.value);
        if (kind !== "hc_access_slide_action_card") this._sliderTargets.set(`${kind}:${entity}`, value);
        this._setRange(entity, kind, value);
      });
      const refreshProgressLayout = () => updateProgress(Number(input.value));
      globalThis.requestAnimationFrame?.(refreshProgressLayout);
      setTimeout(refreshProgressLayout, 0);
      setTimeout(refreshProgressLayout, 100);
      if (globalThis.ResizeObserver) {
        this._sliderObserver = new ResizeObserver(refreshProgressLayout);
        this._sliderObserver.observe(input.parentElement?.querySelector(".slider-track") || input);
      }
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
  }

  _bindTapAction(button, card, run) {
    const release = () => card?.classList.remove("is-pressed");
    button.addEventListener("pointerdown", () => { if (!button.disabled) card?.classList.add("is-pressed"); });
    for (const eventName of ["pointerup", "pointerleave", "pointercancel"]) button.addEventListener(eventName, release);
    button.addEventListener("click", () => { release(); run(); });
  }

  _bindHoldAction(button, card, run) {
    const start = (event) => {
      if (button.disabled || this._holdActive || (event.button != null && event.button !== 0)) return;
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
    const cancel = () => this._cancelHold();
    button.addEventListener("pointerdown", start);
    button.addEventListener("pointermove", (event) => {
      if (!this._holdActive) return;
      const bounds = button.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) cancel();
    });
    for (const eventName of ["pointerup", "pointerleave", "pointercancel"]) button.addEventListener(eventName, cancel);
    button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); });
    button.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key) || event.repeat) return;
      event.preventDefault();
      start(event);
    });
    button.addEventListener("keyup", (event) => { if (["Enter", " "].includes(event.key)) cancel(); });
    button.addEventListener("blur", cancel);
  }

  _setHoldProgress(value) {
    const progress = Math.max(0, Math.min(100, Number(value) || 0));
    const line = this.shadowRoot?.querySelector(".hold-progress rect");
    if (line) line.style.strokeDashoffset = text(100 - progress);
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
    if (kind === "hc_cover_card") return callServiceWithNotification(this._hass, "cover", "set_position", { entity_id: entity, position: value });
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
  set hass(value) { this._hass = value; }
  _render() {
    if (!this.shadowRoot) return;
    const routes = this._config.routes || [];
    const routeCount = Math.max(routes.length, 1);
    const bottom = /iPhone|iPod/i.test(navigator.userAgent || "") ? "max(4px, calc(var(--marao-safe-area-inset-bottom, env(safe-area-inset-bottom)) - 20px))" : "12px";
    this.shadowRoot.innerHTML = `<style>:host{display:block;height:128px;font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif)}.nav{position:fixed;z-index:1001;left:50%;bottom:${bottom};transform:translateX(-50%);display:grid;grid-template-columns:repeat(${routeCount},minmax(0,1fr));grid-template-rows:1fr;gap:clamp(2px,.5vw,4px);width:min(calc(100vw - 24px),calc(${routeCount} * 54px + 20px));height:60px;box-sizing:border-box;padding:6px 10px;border-radius:999px;background:var(--ha-card-background,var(--card-background-color));box-shadow:0 8px 30px rgba(0,0,0,.22)}a{display:grid;place-items:center;min-width:48px;width:48px;height:48px;aspect-ratio:1 / 1;align-self:center;justify-self:center;color:var(--icon-color,var(--primary-text-color));text-decoration:none;border-radius:50%;font-size:clamp(1.125rem,4vw,1.75rem);transition:transform .12s ease,filter .12s ease}a:active{transform:scale(.92);filter:brightness(.96)}a.active{color:var(--active-text-color);background:var(--primary-color)}a:focus{outline:none}ha-icon{--mdc-icon-size:26px}@media(prefers-reduced-motion:reduce){a{transition:none}}</style><nav class="nav" aria-label="Marao navigation">${routes.map((route) => `<a href="${esc(route.url || route.path || "#")}" title="${esc(route.label)}" aria-label="${esc(route.label)}"><ha-icon icon="${esc(route.icon_selected || route.icon || "mdi:circle-outline")}"></ha-icon></a>`).join("")}</nav>`;
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
  connectedCallback() { window.addEventListener("hashchange", this._sync); window.addEventListener("location-changed", this._sync); window.addEventListener("popstate", this._sync); }
  disconnectedCallback() { window.removeEventListener("hashchange", this._sync); window.removeEventListener("location-changed", this._sync); window.removeEventListener("popstate", this._sync); this._close(false); }
  _renderHost() { if (this.shadowRoot) this.shadowRoot.innerHTML = "<style>:host{display:block;height:0;overflow:visible}</style>"; }
  _sync = () => { const hash = text(this._config.hash); if (hash && window.location.hash === hash) this._openSheet(); else this._close(false); };
  _openSheet() {
    if (this._open) return;
    this._open = true; this._focus = deepActiveElement();
    const height = this._config.height === "auto" ? "auto" : text(this._config.height);
    const isClimateModePopup = this._config.cards?.some((card) => card?.template === "hc_climate_card" && card.variables?.show_mode_buttons);
    const title = isClimateModePopup ? "" : text(this._config.title);
    const column = findElements("#columns > div:nth-child(1)")[0];
    const columnWidth = column ? Math.round(column.getBoundingClientRect().width) : 0;
    const maxWidth = columnWidth > 0 ? `${columnWidth}px` : "100%";
    const closeLabel = localize("popup.close", this._hass, {}, "Close popup");
    const overlay = document.createElement("div"); overlay.className = "marao-popup-overlay";
    overlay.innerHTML = `<style>@keyframes marao-popup-slide-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.marao-popup-overlay{position:fixed;inset:0;z-index:1100;display:flex;align-items:flex-end;background:rgba(0,0,0,.42);font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif)}.marao-popup-sheet{box-sizing:border-box;width:100%;max-width:${maxWidth};height:${esc(height)};max-height:${esc(this._config.max_height)};margin:0 auto;overflow:auto;padding:12px 16px calc(92px + var(--marao-safe-area-inset-bottom, env(safe-area-inset-bottom)));border-radius:22px 22px 0 0;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);overscroll-behavior:contain;animation:marao-popup-slide-up .28s cubic-bezier(.2,.8,.2,1) both}.marao-popup-head{display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:0;padding-bottom:8px;background:inherit;z-index:1}.marao-popup-head h2{min-width:0;margin:0;font-size:var(--font-size-primary,1.25rem);line-height:1.2;overflow-wrap:anywhere}.marao-popup-close{flex:0 0 48px;width:48px;height:48px;padding:0;border:0;border-radius:50%;font-size:1.5rem;background:var(--secondary-background-color);color:inherit;cursor:pointer;transition:transform .12s ease,filter .12s ease}.marao-popup-close:active{transform:scale(.92);filter:brightness(.96)}.marao-popup-close:focus,.marao-popup-sheet:focus{outline:none}.marao-popup-content{display:grid;min-width:0;gap:12px}@media(prefers-reduced-motion:reduce){.marao-popup-sheet{animation:none}.marao-popup-close{transition:none}}</style><section class="marao-popup-sheet" role="dialog" aria-modal="true" aria-label="${esc(title || this._config.name || "Marao popup")}" tabindex="-1"><div class="marao-popup-head"><h2>${esc(title)}</h2><button class="marao-popup-close" type="button" aria-label="${esc(closeLabel)}" title="${esc(closeLabel)}">×</button></div><div class="marao-popup-content"></div></section>`;
    overlay.addEventListener("click", (event) => { if (event.target === overlay) this._close(true); });
    overlay.querySelector(".marao-popup-close").addEventListener("click", () => { haptic("heavy"); this._close(true); });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this._close(true);
      else if (event.key === "Tab") this._trapFocus(event);
    });
    document.body.append(overlay);
    this._overlay = overlay;
    overlay.querySelector(".marao-popup-close")?.focus();
    this._setBackgroundInert(overlay);
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
  _setBackgroundInert(overlay) {
    this._backgroundState = [...document.body.children]
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
    if (updateHash && window.location.hash === text(this._config.hash)) { window.history.back(); }
    this._focus?.focus?.(); this._focus = null;
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
