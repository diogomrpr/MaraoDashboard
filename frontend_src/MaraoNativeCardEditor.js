const catalogURL = new URL("./MaraoNativeCatalog.js", import.meta.url);
catalogURL.search = new URL(import.meta.url).search;
const { catalog } = await import(catalogURL.href);
import { editorLabel } from "./native-labels.js";
import { copy, same, patchPath, patchForm, formData, cameraTitleFields, entityMetadata, dashboardRoot } from "./native-model.js";

const field = (path, label, kind = "text", extra = {}) => ({ path, label, kind, ...extra });
const choices = (path, label, options) => field(path, label, "select", { options });
const rowObject = value => typeof value === "string" ? { entity_id: value } : typeof value === "number" ? { value } : value;
const actionFields = (key, config) => [
  choices(key + ".action", { tap_action: "Tap action", hold_action: "Hold action", double_tap_action: "Double tap action" }[key],
    ["none", "toggle", "more-info", "navigate", "url", "perform-action", ...(config.template === "hc_camera_card" || config.type === "custom:marao-native-camera-card" ? ["fullscreen"] : []), ...(config[key]?.action === "call-service" ? ["call-service"] : [])]),
  field(key + ".navigation_path", "Page"), field(key + ".url_path", "URL"),
  field(key + (config[key]?.service !== undefined && config[key]?.perform_action === undefined ? ".service" : ".perform_action"), "Action service"),
  field(key + (config[key]?.entity_id !== undefined && config[key]?.target?.entity_id === undefined ? ".entity_id" : ".target.entity_id"), "Entity", "entity", { multiple: true }),
  field(key + (config[key]?.service_data !== undefined && config[key]?.data === undefined ? ".service_data" : ".data"), "Parameters", "object"),
];

export function nativeFields(spec, config) {
  const camera = spec.id === "hc_camera_card";
  const common = camera ? cameraTitleFields()
    : [field("name", "Name"), field("icon", "Icon", "icon")];
  if (spec.domains.length) common.unshift(field("entity", camera ? "Dashboard stream" : "Entity", "entity", { domains: spec.domains, device_classes: spec.device_classes, required: !spec.entity_optional }));
  if (["hc_navigation_card", "hc_room_card"].includes(spec.id)) common.push(field("page", "Page"));
  if (spec.id === "hc_entity_group_card") common.push(
    choices("entity_type", "Group type", ["light", "cover", "battery", "climate"]),
    choices("popup_filter", "Popup filter", ["all", "active"]));
  const advanced = (camera ? [] : ["show_name", "show_icon", "show_state", "show_label"]).map(key => field(key, key.replaceAll("_", " ").replace(/^./, s => s.toUpperCase()), "boolean"));
  for (const option of spec.variables) {
    if (["vacuum_action", "number_list", "energy_sub_entities", "power_devices"].includes(option.kind)) continue;
    const item = field("variables." + option.key, option.label, option.kind, option);
    (option.advanced ? advanced : common).push(item);
  }
  if (spec.id === "hc_media_card") common.push(
    field("apple_tv_disabled", "Disable Apple TV controls", "boolean"),
    field("apple_tv.remote_entity", "Remote", "entity", { domains: ["remote"] }),
    field("apple_tv.volume_remote_entity", "Volume remote", "entity", { domains: ["remote", "media_player"] }));
  if (spec.id === "hc_vacuum_card") for (let index = 1; index <= 3; index++) {
    const key = "variables.action_" + index;
    advanced.push(field(key + ".segment", "Segment", "number"), field(key + ".name", "Name"), field(key + ".icon", "Icon", "icon"),
      field(key + ".on_action", "Action service"), field(key + ".data.command", "Command"), field(key + ".data.params", "Parameters", "object"));
  }
  if (spec.id === "popup") common.push(field("hash", "Popup hash"), field("height", "Height"), field("max_height", "Maximum height"));
  if (spec.id === "navbar") common.push(field("native", "Show native edit control", "boolean"));
  if (spec.id.includes("events")) common.push(choices(config.event_provider === undefined && config.provider !== undefined ? "provider" : "event_provider", "Event provider", ["auto", "frigate", "unifi_protect", "netatmo"]),
    field("limit", "Event limit", "number"), field("frigate_camera", "Frigate camera name"), field("frigate_instance_id", "Frigate instance ID"),
    field("unifi_protect_media_source", "UniFi Protect media source"));
  if (!["navbar", "popup", "hc_alarm_controls_card", "hc_access_slide_action_card", "hc_access_hold_action_card", "hc_access_action_card", "hc_entity_group_card"].includes(spec.id) && !spec.id.includes("events"))
    advanced.push(...actionFields("tap_action", config), ...actionFields("hold_action", config), ...actionFields("double_tap_action", config));
  if (config.type === spec.legacy_type) for (const item of [...common, ...advanced]) item.path = item.path.replace(/^variables\./, "");
  if (spec.id.includes("events") && config.type === spec.runtime_type) common.find(item => item.path === "name").path = "title";
  return { common, advanced };
}

export class MaraoNativeCardEditor extends (globalThis.HTMLElement || class {}) {
  constructor() {
    super(); this.attachShadow({ mode: "open" }); this._draft = {}; this._forms = []; this._validation = 0;
  }
  setConfig(config) {
    if (same(config, this._draft) && this._rendered) return;
    this._draft = copy(config);
    if (config.apple_tv && typeof config.apple_tv === "object") this._appleTvOptions = copy(config.apple_tv);
    this._spec = catalog.cards.find(spec => spec.type === config.type || spec.id === config.template || spec.runtime_type === config.type || spec.legacy_type === config.type);
    this._render();
  }
  set hass(value) {
    const languageChanged = this._hass?.language !== value?.language;
    this._hass = value;
    if (languageChanged && this._rendered) this._render();
    else this._forms.forEach(form => { form.hass = value; });
  }
  set lovelace(value) { this._lovelace = value; }
  disconnectedCallback() { this._validation++; }
  _label(value) { return editorLabel(value, this._hass); }
  _selector(item) {
    if (item.kind === "entity") {
      let filter = item.domains?.length ? { domain: item.domains } : undefined;
      if (item.device_classes?.length) filter = item.domains.map(domain => ({ domain,
        ...(["cover", "sensor"].includes(domain) ? { device_class: item.device_classes } : {}) }));
      return { entity: { ...(filter ? { filter } : {}), ...(item.multiple ? { multiple: true } : {}) } };
    }
    if (item.kind === "select" || ["energy_period", "energy_unit", "energy_precision"].includes(item.kind)) {
      let options = item.options || (item.kind === "energy_period" ? ["day", "month"] : item.kind === "energy_precision" ? ["auto", "0", "1", "2", "3", "4", "5", "6"] : ["auto", ...Object.keys(catalog.energy_units)]);
      if (item.kind === "energy_unit") {
        const entity = this._spec.id === "hc_switch_card" ? this._draft.variables?.power_entity : this._draft.entity;
        const source = this._hass?.states?.[entity]?.attributes?.unit_of_measurement;
        const dimension = catalog.energy_units[source]?.[0];
        options = ["auto", ...Object.keys(catalog.energy_units).filter(unit => dimension && catalog.energy_units[unit][0] === dimension)];
        const selected = item.path.split(".").reduce((value, key) => value?.[key], this._draft);
        if (selected && !options.includes(selected)) options.push(selected);
      }
      const labels = { fullscreen: "Full screen", none: "No action", toggle: "Toggle", "more-info": "More information", navigate: "Navigate", url: "Open URL", "perform-action": "Service action", "call-service": "Service action", unifi_protect: "UniFi Protect", frigate: "Frigate", netatmo: "Netatmo", all: "All entities", active: "Active only", light: "Lights", cover: "Covers", battery: "Batteries", climate: "Thermostats", day: "Day", month: "Month", auto: "Auto" };
      return { select: { options: options.map(value => ({ value, label: this._label(labels[value] || catalog.cards.find(card => card.type === value || card.id === value)?.label || value) })) } };
    }
    if (["boolean", "icon", "object"].includes(item.kind)) return { [item.kind]: {} };
    if (item.kind === "number") return { number: { mode: "box", step: "any" } };
    return { text: {} };
  }
  _form(parent, fields, config, changed, current = () => config) {
    const form = document.createElement("ha-form");
    const data = formData(config, fields);
    // False disables Apple TV controls without replacing the configuration with defaults.
    if (fields.some(item => item.path === "apple_tv_disabled")) data.apple_tv_disabled = config.apple_tv === false;
    form.hass = this._hass;
    form.schema = fields.map(item => ({ name: item.path, required: Boolean(item.required), selector: this._selector(item) }));
    form.data = data;
    form.computeLabel = schema => this._label(fields.find(item => item.path === schema.name)?.label || schema.name);
    form.computeHelper = schema => {
      const item = fields.find(item => item.path === schema.name);
      return this._label(item?.kind === "color" ? "CSS color or theme variable" : item?.description || "");
    };
    form.addEventListener("value-changed", event => {
      event.stopPropagation();
      const next = event.detail.value;
      let result = patchForm(current(), fields.filter(item => item.path !== "apple_tv_disabled"), data, next);
      if (!same(data.apple_tv_disabled, next.apple_tv_disabled)) {
        if (next.apple_tv_disabled && result.apple_tv && typeof result.apple_tv === "object") this._appleTvOptions = copy(result.apple_tv);
        result = patchPath(result, "apple_tv", next.apple_tv_disabled ? false : copy(this._appleTvOptions || {}));
      }
      changed(result); Object.assign(data, next); config = result;
    });
    parent.append(form); this._forms.push(form); return form;
  }
  _button(parent, label, action, disabled = false) {
    const button = document.createElement("button");
    button.type = "button"; button.textContent = this._label(label); button.disabled = disabled;
    button.addEventListener("click", () => { globalThis.window?.MaraoDashboard?.haptic?.("heavy"); action(); }); parent.append(button); return button;
  }
  _repeat(parent, path, label, fields, initial, limit = Infinity) {
    const container = document.createElement("section");
    const title = document.createElement("h3"); title.textContent = this._label(label); container.append(title);
    const values = this._draft[path] === undefined && path.includes(".")
      ? path.split(".").reduce((value, key) => value?.[key], this._draft) || [] : this._draft[path] || [];
    if (!Array.isArray(values)) {
      const error = document.createElement("p"); error.textContent = this._label("Use a list for these options"); container.append(error);
    } else values.forEach((value, index) => {
      const row = document.createElement("section"); row.className = "row";
      const object = rowObject(value);
      this._form(row, fields, object, next => {
        const current = path.split(".").reduce((item, key) => item?.[key], this._draft);
        const updated = copy(current); updated[index] = next;
        this._commit(patchPath(this._draft, path, updated));
      }, () => rowObject(path.split(".").reduce((item, key) => item?.[key], this._draft)?.[index]) || object);
      const controls = document.createElement("div"); controls.className = "controls";
      const update = action => {
        const current = path.split(".").reduce((item, key) => item?.[key], this._draft);
        const updated = copy(current); action(updated);
        this._commit(patchPath(this._draft, path, updated)); this._render();
      };
      this._button(controls, "Move up", () => update(list => { [list[index - 1], list[index]] = [list[index], list[index - 1]]; }), index === 0);
      this._button(controls, "Move down", () => update(list => { [list[index + 1], list[index]] = [list[index], list[index + 1]]; }), index === values.length - 1);
      this._button(controls, "Remove", () => update(list => list.splice(index, 1)));
      row.append(controls); container.append(row);
    });
    this._button(container, "Add", () => {
      this._commit(patchPath(this._draft, path, [...(Array.isArray(values) ? values : []), copy(initial)]));
      this._render();
    }, Array.isArray(values) && values.length >= limit);
    parent.append(container);
  }
  _render() {
    if (!this.shadowRoot || !this._spec) return;
    this._rendered = true; this._forms = [];
    this.shadowRoot.innerHTML = "<style>:host{display:block;font-family:var(--primary-font-family);--control-button-height:48px}.form{display:grid;gap:16px;min-width:0}ha-form{display:block;min-width:0}h3,summary,p{overflow-wrap:anywhere}summary{min-height:48px;display:flex;align-items:center;cursor:pointer}.row{padding:12px;border:1px solid var(--divider-color);border-radius:12px;margin-bottom:12px;min-width:0}.controls{display:flex;flex-wrap:wrap;gap:8px}button{min-width:48px;min-height:48px;padding:8px 12px;border:0;border-radius:12px;background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit;cursor:pointer;overflow-wrap:anywhere}button:disabled{opacity:.4;cursor:default}button:focus{outline:none}.error{color:var(--error-color);white-space:pre-wrap}</style><div class='form'></div>";
    const host = this.shadowRoot.querySelector(".form");
    const spec = this._spec, fields = nativeFields(spec, this._draft);
    if (this._draft.type === "custom:marao-card") {
      const variants = choices("template", "Variant", catalog.cards.filter(card => !card.runtime_type).map(card => card.id));
      this._form(host, [variants], this._draft, next => { this._commit(next); this._spec = catalog.cards.find(card => card.id === next.template); this._render(); }, () => this._draft);
    }
    this._form(host, fields.common, this._draft, next => this._commit(next), () => this._draft);
    if (spec.id === "hc_energy_period_card") this._repeat(host, this._draft.type === spec.legacy_type ? "sub_entities" : "variables.sub_entities", "Energy breakdown",
      [field("entity_id", "Energy sensor", "entity", { domains: ["sensor"], required: true }), field("name", "Name"),
        field("cost_entity", "Cost sensor (optional)", "entity", { domains: ["sensor"] })], { entity_id: "" });
    if (spec.id === "hc_graph_card") this._repeat(host, "variables.power_devices", "Power devices",
      [field("entity_id", "Power sensor (W/kW)", "entity", { domains: ["sensor"], required: true }), field("name", "Name")], { entity_id: "" });
    if (spec.id === "hc_media_card") this._repeat(host, "apple_tv.apps", "Apps",
      [field("source", "Source"), field("name", "Name"), field("icon", "Icon", "icon")], { source: "" });
    if (["hc_entity_group_card", "hc_scene_collection_card"].includes(spec.id)) {
      const kind = this._draft.entity_type || "light";
      const memberSpec = catalog.cards.find(card => card.id === ({ light: "hc_light_card", cover: "hc_cover_card", climate: "hc_climate_card", battery: "hc_battery_card" }[kind]));
      const domains = spec.id === "hc_scene_collection_card" ? ["scene", "switch", "input_boolean"] : [kind === "battery" ? "sensor" : kind];
      const memberFields = [field("entity_id", "Entity", "entity", { domains, ...(kind === "battery" ? { device_classes: ["battery"] } : {}) }), field("name", "Name"), field("icon", "Icon", "icon"),
        ...(spec.id === "hc_entity_group_card" ? memberSpec.variables.filter(option => !["number_list", "vacuum_action"].includes(option.kind)).map(option => field("variables." + option.key, option.label, option.kind, option)) : [])];
      this._repeat(host, "entities", "Members", memberFields, { entity_id: "" });
    }
    if (spec.id === "hc_wallbox_current_card") this._repeat(host, "variables.shortcuts", "Charging shortcuts", [field("value", "Charging Current", "number")], { value: 6 }, 3);
    if (spec.id === "navbar") this._repeat(host, "routes", "Navigation routes",
      [field("url", "URL"), field("label", "Label"), field("icon", "Icon", "icon"), field("icon_selected", "Selected icon", "icon")], { url: "", label: "" });
    if (spec.id === "popup") this._repeat(host, "cards", "Popup contents",
      [choices("type", "Native card", catalog.cards.map(card => card.type)), field("entity", "Entity", "entity"), field("name", "Name"), field("variables", "Advanced", "object")], { type: "custom:marao-native-light-card" });
    const details = document.createElement("details"); const summary = document.createElement("summary"); summary.textContent = this._label("Advanced"); details.append(summary);
    this._form(details, fields.advanced, this._draft, next => this._commit(next), () => this._draft); host.append(details);
    this._error = document.createElement("p"); this._error.className = "error"; this._error.setAttribute("role", "status"); host.append(this._error);
  }
  async _commit(next) {
    const bindingChanged = this._draft.entity !== next.entity || this._draft.entity_type !== next.entity_type ||
      this._draft.variables?.power_entity !== next.variables?.power_entity;
    this._draft = next;
    if (bindingChanged) this._render();
    const validation = ++this._validation;
    try {
      if (next.type.startsWith("custom:marao-native-") && this._hass?.callWS) {
        const checked = copy(next);
        if (this._spec.id === "hc_wallbox_current_card" && Array.isArray(checked.variables?.shortcuts)) {
          checked.variables.shortcuts = checked.variables.shortcuts.map(value => typeof value === "object" ? value.value : value);
          this._draft = checked; next = checked;
        }
        await this._hass.callWS({ type: "marao_dashboard/native/card", config: next, instance: "native-editor",
          url_path: this._lovelace?.urlPath || dashboardRoot(), entities: entityMetadata(next, this._hass), language: this._hass.language || "en" });
      }
      if (validation !== this._validation) return;
      if (this._error) this._error.textContent = "";
      this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: copy(next) } }));
    } catch (error) {
      if (validation === this._validation && this._error) this._error.textContent = this._label(error.message || "Native configuration failed");
    }
  }
}

if (globalThis.customElements && !customElements.get("marao-native-card-editor")) customElements.define("marao-native-card-editor", MaraoNativeCardEditor);
