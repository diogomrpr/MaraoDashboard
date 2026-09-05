const BaseElement = globalThis.HTMLElement || class {};

const text = (value, fallback = "") => String(value ?? fallback);
const esc = (value) => text(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const stateOf = (hass, entity) => hass?.states?.[entity] || {};
const domainOf = (entity) => text(entity).split(".", 1)[0];

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

function numberStepper(value, label, unit = "", className = "") {
  if (value == null || value === "—") return "";
  return `<div class="number-stepper${className ? ` ${esc(className)}` : ""}" aria-label="${esc(label)}"><button type="button" data-number-step="increase" aria-label="Increase ${esc(label)}"><ha-icon icon="mdi:chevron-up"></ha-icon></button><span class="number-value">${esc(value)}${esc(unit)}</span><button type="button" data-number-step="decrease" aria-label="Decrease ${esc(label)}"><ha-icon icon="mdi:chevron-down"></ha-icon></button></div>`;
}

export function climateModeLabel(value) {
  const label = text(value).replace(/_/g, " ");
  return label ? label[0].toUpperCase() + label.slice(1) : "";
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
  } else if (kind === "hc_room_card") {
    if (value === "on") background = "var(--room-card-active-background,var(--primary-color))";
  } else if (kind === "hc_toggle_graph_card") {
    if (stateOf(hass, text(variables.toggle_entity)).state === "on") background = active || "var(--primary-color)";
  }

  if (!background) return { unavailable: ["unavailable", "unknown"].includes(value), accent };
  return { background, text: foreground || "var(--active-text-color)", icon: foreground || "var(--active-text-color)", accent };
}

export function haptic(value = "heavy") {
  if (!value) return;
  globalThis.window?.dispatchEvent?.(new CustomEvent("haptic", { detail: value }));
  globalThis.navigator?.vibrate?.(value === "heavy" ? 50 : 25);
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

async function performAction(hass, action, entity) {
  if (!action || action.action === "none") return;
  haptic(action.haptic || "heavy");
  const kind = action.action;
  if (kind === "navigate") return navigate(action.navigation_path);
  if (kind === "url") return window.location.assign(action.url_path || action.url);
  if (kind === "more-info") {
    const event = new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: action.entity || entity } });
    return document.dispatchEvent(event);
  }
  const target = action.target?.entity_id || action.entity_id || entity;
  if (!hass?.callService || !target) return;
  if (kind === "toggle") return hass.callService(domainOf(target), "toggle", { entity_id: target });
  if (kind === "call-service" || kind === "perform-action") {
    const service = action.service || action.perform_action || "";
    const [domain, name] = service.split(".", 2);
    if (!domain || !name) return;
    const data = { ...(action.data || {}) };
    if (action.target?.entity_id) data.entity_id = action.target.entity_id;
    else if (!data.entity_id) data.entity_id = target;
    return hass.callService(domain, name, data);
  }
}

function cardStyles() {
  return `
    :host { display:block; color:var(--primary-text-color); }
    ha-card { box-sizing:border-box; overflow:hidden; border-radius:var(--ha-card-border-radius,20px); background:var(--marao-card-background,var(--ha-card-background,var(--card-background-color))); color:var(--marao-card-text-color,inherit); border:var(--marao-card-border,0 solid transparent); }
    .body { display:grid; grid-template-columns:minmax(0,1fr) auto; grid-template-areas:'title icon' 'state icon' 'climate icon' 'control control'; gap:4px 12px; align-items:center; min-height:84px; padding:14px; }
    .body.with-climate-modes { grid-template-areas:'title icon' 'state icon' 'climate icon' 'modes modes'; }
    .body.icon-only { display:grid; place-items:center; min-height:64px; padding:12px; }
    .body.icon-only .icon { grid-area:auto; }
    .title, .state, .climate { min-width:0; max-width:100%; overflow-wrap:anywhere; line-height:1.25; }
    .title { grid-area:title; font-weight:var(--font-weight-primary,700); font-size:var(--font-size-primary,18px); }
    .state { grid-area:state; color:var(--marao-card-text-color,var(--secondary-text-color)); font-size:var(--font-size-secondary,16px); font-weight:var(--font-weight-secondary,500); }
    .climate { grid-area:climate; color:var(--marao-card-text-color,var(--secondary-text-color)); font-size:var(--font-size-secondary,16px); font-weight:var(--font-weight-secondary,500); }
    .climate-card .state { font-size:var(--font-size-primary,18px); font-weight:var(--font-weight-primary,700); }
    .icon { grid-area:icon; display:grid; place-items:center; width:52px; height:52px; border-radius:50%; background:var(--marao-icon-background,var(--opacity-contrast-100,rgba(0,0,0,.08))); color:var(--marao-icon-color,var(--icon-color)); }
    .icon ha-icon { --mdc-icon-size:28px; }
    .control { grid-area:control; display:flex; gap:8px; align-items:center; }
    button { border:0; border-radius:12px; padding:10px 12px; color:inherit; background:var(--secondary-background-color); font:inherit; cursor:pointer; }
    button:focus-visible, input:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px; }
    .climate-modes { grid-area:modes; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; width:100%; box-sizing:border-box; padding-top:10px; border-top:1px solid color-mix(in srgb,currentColor 18%,transparent); }
    .climate-mode { min-width:0; min-height:56px; border-radius:16px; padding:12px; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); font-size:var(--font-size-primary,18px); font-weight:var(--font-weight-primary,700); line-height:1.25; overflow-wrap:anywhere; }
    .climate-mode.active { background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); box-shadow:inset 0 0 0 3px var(--marao-accent-color,var(--primary-color)); }
    .control.number-control { grid-area:icon; justify-self:end; }
    .control.climate-number-control { align-self:stretch; }
    .number-stepper { display:grid; justify-items:center; gap:2px; min-width:52px; width:auto; max-width:42vw; padding:4px; box-sizing:border-box; border-radius:999px; background:var(--button-card-background,var(--secondary-background-color)); }
    .number-stepper button { display:grid; place-items:center; width:44px; height:38px; padding:0; border-radius:50%; background:transparent; }
    .number-stepper button:active { background:var(--marao-icon-background,var(--opacity-contrast-100,rgba(0,0,0,.08))); }
    .number-stepper ha-icon { --mdc-icon-size:25px; }
    .number-value { max-width:100%; opacity:.72; font-size:var(--font-size-caption,15px); font-weight:var(--font-weight-primary,700); line-height:1.2; overflow-wrap:anywhere; text-align:center; }
    .climate-stepper { min-width:60px; height:100%; padding:3px; align-content:space-between; background:var(--ha-card-background,var(--card-background-color)); color:var(--primary-text-color); }
    .climate-stepper button { width:52px; height:42px; }
    .climate-stepper ha-icon { --mdc-icon-size:32px; }
    .climate-stepper .number-value { font-size:var(--font-size-primary,19px); opacity:1; }
    .slider { position:relative; display:flex; align-items:center; width:100%; height:32px; }
    .slider-track { position:absolute; inset:2px 0; overflow:hidden; border-radius:14px; background:var(--marao-slider-track,color-mix(in srgb,var(--marao-accent-color,var(--primary-color)) 35%,var(--active-text-color))); }
    .slider-fill { display:block; height:100%; width:var(--marao-slider-fill-width,0px); border-radius:14px; background:var(--marao-slider-fill,var(--active-text-color)); }
    input[type=range] { position:relative; z-index:1; appearance:none; width:100%; height:32px; margin:4px 0; border-radius:14px; background:transparent; accent-color:var(--marao-accent-color,var(--primary-color)); cursor:pointer; }
    input[type=range]::-webkit-slider-runnable-track { height:28px; border-radius:14px; background:transparent; }
    input[type=range]::-webkit-slider-thumb { appearance:none; width:28px; height:28px; margin-top:0; border:0; border-radius:50%; background:var(--marao-accent-color,var(--primary-color)); box-shadow:0 1px 4px rgba(0,0,0,.3); }
    input[type=range]::-moz-range-track { height:28px; border-radius:14px; background:transparent; }
    input[type=range]::-moz-range-progress { height:28px; border-radius:14px; background:transparent; }
    input[type=range]::-moz-range-thumb { width:28px; height:28px; border:0; border-radius:50%; background:var(--marao-accent-color,var(--primary-color)); box-shadow:0 1px 4px rgba(0,0,0,.3); }
    .camera { grid-column:1/-1; width:100%; aspect-ratio:16/9; object-fit:cover; background:#000; }
  `;
}

export class MaraoCard extends BaseElement {
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._hass = null; this._sliderTargets = new Map(); this._sliderObserver = null; }
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(value) { this._hass = value; this._render(); }
  get hass() { return this._hass; }

  _label(entity, config, state) {
    return config.name || state?.attributes?.friendly_name || entity || config.template || "Marao";
  }

  _range(entity, state, kind) {
    const attrs = state.attributes || {};
    const key = `${kind}:${entity}`;
    if (kind === "hc_climate_card") {
      const target = climateTarget(attrs, text(state.state));
      return numberStepper(target, "target temperature", "", "climate-stepper");
    }
    if (kind === "hc_number_card") {
      const value = Number(state.state);
      return Number.isFinite(value) ? numberStepper(value, this._label(entity, this._config, state), text(attrs.unit_of_measurement)) : "";
    }
    const ranges = {
      hc_light_card: [0, 100, Number(attrs.brightness) * 100 / 255 || 0, "brightness", 1],
      hc_cover_card: [0, 100, Number(attrs.current_position) || 0, "position", 1],
      hc_fan_card: [0, 100, Number(attrs.percentage) || 0, "percentage", 1],
    }[kind];
    if (kind === "hc_access_slide_action_card") {
      return `<marao-slide-to-open entity="${esc(entity)}" state="${esc(text(state.state))}"></marao-slide-to-open>`;
    }
    if (!ranges) return "";
    const [min, max, current, mode, step] = ranges;
    const stored = this._sliderTargets.get(key);
    const value = Number.isFinite(stored) && Math.abs(stored - current) > step / 2 ? stored : current;
    if (stored != null && value === current) this._sliderTargets.delete(key);
    return `<div class="slider"><span class="slider-track"><span class="slider-fill"></span></span><input data-slider-key="${esc(key)}" data-slider-current="${Number.isFinite(current) ? current : min}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${esc(mode)}"></div>`;
  }

  _render() {
    if (!this.shadowRoot) return;
    this._sliderObserver?.disconnect();
    this._sliderObserver = null;
    const config = this._config || {};
    const entity = text(config.entity);
    const state = stateOf(this._hass, entity);
    const kind = text(config.template, "hc_base_card");
    const value = text(state.state, "unknown");
    const icon = text(config.icon || state.attributes?.icon, "mdi:home-automation");
    const climate = kind === "hc_climate_card" ? state.attributes || {} : null;
    const displayValue = climate ? climateModeLabel(value) : value;
    const currentTemperature = climate && climate.current_temperature != null ? text(climate.current_temperature) : "";
    const climateReading = currentTemperature ? `Current ${esc(currentTemperature)}` : "";
    const climateModes = Array.isArray(climate?.hvac_modes) ? climate.hvac_modes.filter(Boolean).map(text) : [];
    const modeButtons = kind === "hc_climate_card" && config.variables?.show_mode_buttons && climateModes.length
      ? `<div class="climate-modes" aria-label="HVAC modes">${climateModes.map((mode) => `<button class="climate-mode${mode === value ? " active" : ""}" type="button" data-climate-mode="${esc(mode)}">${esc(climateModeLabel(mode))}</button>`).join("")}</div>` : "";
    const climateControls = climateReading ? `<div class="climate">${climateReading}</div>` : "";
    let media = "";
    if (kind === "hc_camera_card" && entity) {
      const image = state.attributes?.entity_picture || `/api/camera_proxy/${encodeURIComponent(entity)}`;
      media = `<img class="camera" src="${esc(image)}" alt="${esc(this._label(entity, config, state))}">`;
    }
    const range = this._range(entity, state, kind);
    const showName = config.show_name !== false;
    const showState = config.show_state !== false;
    const iconOnly = !showName && !showState && config.show_label === false;
    const isAction = ["hc_switch_card", "hc_light_card", "hc_cover_card", "hc_fan_card", "hc_access_card", "hc_scene_card"].includes(kind);
    const popupHash = config.variables?.popup_hash;
    let action = config.tap_action || (popupHash ? { action: "navigate", navigation_path: popupHash, haptic: "heavy" } : isAction ? { action: "toggle", haptic: "heavy" } : null);
    if (kind === "hc_climate_card" && !config.tap_action) {
      if (climateModes.length > 1 && config.variables?.mode_selector_hash) action = { action: "navigate", navigation_path: config.variables.mode_selector_hash, haptic: "heavy" };
      else if (climateModes.length === 1) action = { action: "call-service", service: "climate.set_hvac_mode", data: { hvac_mode: climateModes[0] }, haptic: "heavy" };
      else action = null;
    }
    if (kind === "hc_toggle_graph_card" && !config.tap_action && config.variables?.toggle_entity) {
      action = { action: "toggle", entity_id: config.variables.toggle_entity, haptic: "heavy" };
    }
    const usesNumberStepper = ["hc_climate_card", "hc_number_card"].includes(kind);
    const iconElement = usesNumberStepper ? "" : `<div class="icon" aria-hidden="true"><ha-icon icon="${esc(icon)}"></ha-icon></div>`;
    const controlClass = kind === "hc_climate_card" ? "control number-control climate-number-control" : usesNumberStepper ? "control number-control" : "control";
    this.shadowRoot.innerHTML = `<style>${cardStyles()}</style><ha-card><div class="body${iconOnly ? " icon-only" : ""}${climate ? " climate-card" : ""}${modeButtons ? " with-climate-modes" : ""}">${showName ? `<div class="title">${esc(this._label(entity, config, state))}</div>` : ""}${showState ? `<div class="state">${esc(displayValue)}</div>` : ""}${climateControls}${iconElement}${media}${range ? `<div class="${controlClass}">${range}</div>` : ""}${modeButtons}</div></ha-card>`;
    const card = this.shadowRoot.querySelector("ha-card");
    const appearance = stateAppearance(kind, value, config, this._hass);
    if (card) {
      if (appearance.background) card.style.setProperty("--marao-card-background", appearance.background);
      if (appearance.text) card.style.setProperty("--marao-card-text-color", appearance.text);
      if (appearance.icon) card.style.setProperty("--marao-icon-color", appearance.icon);
      if (appearance.accent) card.style.setProperty("--marao-accent-color", appearance.accent);
      if (appearance.unavailable) {
        card.style.setProperty("--marao-card-opacity", "0.6");
        card.style.opacity = "0.6";
        card.style.pointerEvents = "none";
      }
    }
    card?.addEventListener("click", (event) => {
      if (event.target.closest("input,button")) return;
      performAction(this._hass, action, entity);
    });
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
          const thumb = 28;
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
  }

  _setRange(entity, kind, value) {
    if (!this._hass?.callService || !entity) return;
    const domain = domainOf(entity);
    if (kind === "hc_light_card") return this._hass.callService("light", "turn_on", { entity_id: entity, brightness_pct: value });
    if (kind === "hc_cover_card") return this._hass.callService("cover", "set_position", { entity_id: entity, position: value });
    if (kind === "hc_fan_card") return this._hass.callService("fan", "set_percentage", { entity_id: entity, percentage: value });
    if (kind === "hc_access_slide_action_card" && value >= 100) {
      const service = text(this._config.variables?.action_service);
      const [serviceDomain, serviceName] = service.split(".", 2);
      if (serviceDomain && serviceName) {
        const input = this.shadowRoot.querySelector("input.action-slider");
        input?.setAttribute("disabled", "true");
        haptic("heavy");
        Promise.resolve()
          .then(() => this._hass.callService(serviceDomain, serviceName, { entity_id: entity }))
          .finally(() => { if (input) { input.value = "0"; input.removeAttribute("disabled"); } });
      }
    }
  }

  _adjustNumber(entity, kind, direction) {
    if (!this._hass?.callService || !entity) return;
    const state = stateOf(this._hass, entity);
    haptic("heavy");
    if (kind === "hc_climate_card") {
      const data = climateTemperatureChange(state.attributes || {}, text(state.state), direction);
      if (!data) return;
      return this._hass.callService("climate", "set_temperature", { entity_id: entity, ...data });
    }
    if (kind === "hc_number_card") {
      const value = numberStepValue(state.state, state.attributes || {}, direction);
      if (value == null) return;
      return this._hass.callService(domainOf(entity), "set_value", { entity_id: entity, value });
    }
  }

  _setClimateMode(entity, mode) {
    if (!this._hass?.callService || !entity || !mode) return;
    haptic("heavy");
    return this._hass.callService("climate", "set_hvac_mode", { entity_id: entity, hvac_mode: mode });
  }

  getCardSize() { return 2; }
}

export class MaraoNavbarCard extends BaseElement {
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; }
  setConfig(config) {
    const routes = Array.isArray(config?.routes) ? config.routes : [];
    if (routes.length > 5) throw new Error("Marao navbar supports at most five routes");
    this._config = { ...config, routes }; this._render(); registerFullscreen(this);
  }
  connectedCallback() { registerFullscreen(this); this._render(); }
  disconnectedCallback() { unregisterFullscreen(this); }
  set hass(value) { this._hass = value; }
  _render() {
    if (!this.shadowRoot) return;
    const routes = this._config.routes || [];
    const routeCount = Math.max(routes.length, 1);
    const bottom = /iPhone|iPod/i.test(navigator.userAgent || "") ? "max(4px, calc(env(safe-area-inset-bottom) - 20px))" : "12px";
    this.shadowRoot.innerHTML = `<style>:host{display:block;height:0}.nav{position:fixed;z-index:1001;left:50%;bottom:${bottom};transform:translateX(-50%);display:grid;grid-template-columns:repeat(${routeCount},minmax(0,1fr));grid-template-rows:1fr;gap:clamp(2px,.5vw,4px);width:min(calc(100vw - 24px),calc(${routeCount} * 54px + 20px));height:60px;box-sizing:border-box;padding:6px 10px;border-radius:999px;background:var(--ha-card-background,var(--card-background-color));box-shadow:0 8px 30px rgba(0,0,0,.22)}a{display:grid;place-items:center;min-width:0;width:min(44px,100%);height:44px;aspect-ratio:1 / 1;align-self:center;justify-self:center;color:var(--icon-color,var(--primary-text-color));text-decoration:none;border-radius:50%;font-size:clamp(18px,4vw,28px)}a.active{color:var(--active-text-color);background:var(--primary-color)}a:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}ha-icon{--mdc-icon-size:26px}</style><nav class="nav" aria-label="Marao navigation">${routes.map((route) => `<a href="${esc(route.url || route.path || "#")}" title="${esc(route.label)}" aria-label="${esc(route.label)}"><ha-icon icon="${esc(route.icon_selected || route.icon || "mdi:circle-outline")}"></ha-icon></a>`).join("")}</nav>`;
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
function findElements(selector) {
  const found = [];
  const visit = (root) => {
    root?.querySelectorAll?.(selector).forEach((item) => found.push(item));
    root?.querySelectorAll?.("*").forEach((item) => { if (item.shadowRoot) visit(item.shadowRoot); });
  };
  visit(document);
  return found;
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
    view.style.padding = isIPhone ? "env(safe-area-inset-top) 0 0" : "0";
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
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._hass = null; this._open = false; this._focus = null; this._childrenRenderId = 0; }
  setConfig(config) { this._config = { height: "auto", max_height: "80dvh", ...config }; this._renderHost(); this._sync(); }
  set hass(value) { this._hass = value; this._renderChildren(); }
  connectedCallback() { window.addEventListener("hashchange", this._sync); window.addEventListener("location-changed", this._sync); window.addEventListener("popstate", this._sync); }
  disconnectedCallback() { window.removeEventListener("hashchange", this._sync); window.removeEventListener("location-changed", this._sync); window.removeEventListener("popstate", this._sync); this._close(false); }
  _renderHost() { if (this.shadowRoot) this.shadowRoot.innerHTML = "<style>:host{display:block;height:0;overflow:visible}</style>"; }
  _sync = () => { const hash = text(this._config.hash); if (hash && window.location.hash === hash) this._openSheet(); else this._close(false); };
  _openSheet() {
    if (this._open) return;
    this._open = true; this._focus = document.activeElement;
    const height = this._config.height === "auto" ? "auto" : text(this._config.height);
    const isClimateModePopup = this._config.cards?.some((card) => card?.template === "hc_climate_card" && card.variables?.show_mode_buttons);
    const title = isClimateModePopup ? "" : text(this._config.title);
    const column = findElements("#columns > div:nth-child(1)")[0];
    const columnWidth = column ? Math.round(column.getBoundingClientRect().width) : 0;
    const maxWidth = columnWidth > 0 ? `${columnWidth}px` : "100%";
    const overlay = document.createElement("div"); overlay.className = "marao-popup-overlay";
    overlay.innerHTML = `<style>@keyframes marao-popup-slide-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.marao-popup-overlay{position:fixed;inset:0;z-index:1100;display:flex;align-items:flex-end;background:rgba(0,0,0,.42)}.marao-popup-sheet{box-sizing:border-box;width:100%;max-width:${maxWidth};height:${esc(height)};max-height:${esc(this._config.max_height)};margin:0 auto;overflow:auto;padding:12px 16px calc(92px + env(safe-area-inset-bottom));border-radius:22px 22px 0 0;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);overscroll-behavior:contain;animation:marao-popup-slide-up .28s cubic-bezier(.2,.8,.2,1) both}.marao-popup-head{display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:0;padding-bottom:8px;background:inherit;z-index:1}.marao-popup-head h2{min-width:0;margin:0;font-size:var(--font-size-primary,20px);line-height:1.2;overflow-wrap:anywhere}.marao-popup-close{flex:0 0 auto;width:40px;height:40px;border:0;border-radius:50%;font-size:24px;background:var(--secondary-background-color);color:inherit;cursor:pointer}.marao-popup-content{display:grid;min-width:0;gap:12px}.marao-popup-overlay:focus{outline:none}@media(prefers-reduced-motion:reduce){.marao-popup-sheet{animation:none}}</style><section class="marao-popup-sheet" role="dialog" aria-modal="true" aria-label="${esc(title || this._config.name || "Marao popup")}" tabindex="-1"><div class="marao-popup-head"><h2>${esc(title)}</h2><button class="marao-popup-close" aria-label="Close">×</button></div><div class="marao-popup-content"></div></section>`;
    overlay.addEventListener("click", (event) => { if (event.target === overlay) this._close(true); });
    overlay.querySelector(".marao-popup-close").addEventListener("click", () => { haptic("heavy"); this._close(true); });
    overlay.addEventListener("keydown", (event) => { if (event.key === "Escape") this._close(true); });
    document.body.append(overlay); overlay.querySelector("section")?.focus(); this._overlay = overlay; this._renderChildren();
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
  _close(updateHash) {
    if (!this._open) return;
    this._open = false; this._overlay?.remove(); this._overlay = null;
    if (updateHash && window.location.hash === text(this._config.hash)) { window.history.back(); }
    this._focus?.focus?.(); this._focus = null;
  }
  getCardSize() { return 0; }
}

for (const [name, klass] of [["marao-card", MaraoCard], ["marao-navbar-card", MaraoNavbarCard], ["marao-popup-card", MaraoPopupCard]]) {
  if (globalThis.customElements && !customElements.get(name)) customElements.define(name, klass);
}
if (globalThis.window) {
  window.customCards = window.customCards || [];
  for (const card of [
    ["marao-card", "Marão Card", "Marao Dashboard card variants"],
    ["marao-navbar-card", "Marão Navbar", "Floating Marao navigation"],
    ["marao-popup-card", "Marão Popup", "Bottom-sheet Marao popup"],
  ]) if (!window.customCards.some((item) => item.type === card[0])) window.customCards.push({ type: card[0], name: card[1], description: card[2] });
}
