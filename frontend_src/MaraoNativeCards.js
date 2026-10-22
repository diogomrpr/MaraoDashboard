await import(new URL(`./MaraoNativeNavbar.js${new URL(import.meta.url).search}`, import.meta.url));
const catalogURL = new URL("./MaraoNativeCatalog.js", import.meta.url);
catalogURL.search = new URL(import.meta.url).search;
const { catalog } = await import(catalogURL.href);
import { editorLabel } from "./native-labels.js";
import { entityMetadata, supportsEntity, dashboardRoot, previewHass } from "./native-model.js";

const query = new URL(import.meta.url).search;
const cardsURL = "./MaraoCards.js" + query;
const editorURL = "./MaraoNativeCardEditor.js" + query;
const { MaraoCard, MaraoNavbarCard, MaraoPopupCard, haptic, safeArea, showCardDetails } = await import(cardsURL);
const BaseElement = globalThis.HTMLElement || class {};
let instanceCount = 0;
let editorModule;

export async function configElement() {
  editorModule ||= import(editorURL).catch(error => { editorModule = undefined; throw error; });
  await editorModule;
  return document.createElement("marao-native-card-editor");
}

function ownerRoot(element) {
  for (let node = element; node; node = node.parentElement || node.getRootNode?.().host)
    if (node.localName === "hui-root") return node;
}
function nativeDashboard(root) {
  return root?.lovelace?.config?.marao?.mode === "native" || root?.lovelace?.rawConfig?.marao?.mode === "native" ||
    root?.lovelace?.rawConfig?.strategy?.type === "custom:marao-starter";
}

export class MaraoNativeCard extends BaseElement {
  constructor() {
    super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._children = [];
    this._instance = "native-" + (globalThis.crypto?.randomUUID?.() || ++instanceCount);
    this._request = 0;
  }
  static getConfigElement() { return configElement(); }
  static getStubConfig(hass, entities = []) {
    const spec = this.spec;
    const entity = [...entities, ...Object.keys(hass?.states || {})].find(id => supportsEntity(spec, hass, id));
    return { ...(entity && !spec.entity_optional ? { entity } : {}),
      ...(spec.entity_optional ? { name: editorLabel(spec.label, hass) } : {}),
      ...(spec.id === "hc_entity_group_card" ? { entity_type: "light", entities: [] } : {}),
      ...(spec.id === "hc_scene_collection_card" ? { entities: [] } : {}),
      ...(spec.id === "navbar" ? { routes: [], native: true } : {}),
      ...(spec.id === "hc_room_card" || spec.id === "hc_navigation_card" ? { tap_action: { action: "none" } } : {}) };
  }
  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Native card configuration must be an object");
    this._config = structuredClone(config); this._identity = null; this._metadata = new Map();
    this._children = [];
    if (this.shadowRoot) this._status(editorLabel("Loading…", this._hass));
    this._compile();
  }
  get preview() { return Boolean(this._preview || ownerRoot(this)?.lovelace?.editMode); }
  set preview(value) {
    this._preview = Boolean(value);
    for (const child of this._children) {
      child.preview = this._placeholder || this.preview; child.hass = previewHass(this._hass, this._placeholder || this.preview);
      if (this.preview && child instanceof MaraoPopupCard) child._close(false);
    }
    this._editAccess();
  }
  set editMode(value) { this.preview = value; }
  set hass(value) {
    this._hass = value;
    this._theme();
    for (const child of this._children) { child.preview = this._placeholder || this.preview; child.hass = previewHass(value, this._placeholder || this.preview); }
    this._compile(); this._editAccess();
  }
  connectedCallback() {
    this._viewPath = globalThis.location?.pathname;
    this._theme();
    this._compile();
  }
  disconnectedCallback() { this._detailsPopup?._close(false); this._request++; if (this._loading) this._identity = null; this._loading = false; }
  _theme() {
    if (!this.style || !globalThis.getComputedStyle) return;
    const parent = this.parentElement || this.getRootNode?.().host;
    const inherited = parent && getComputedStyle(parent).getPropertyValue("--marao-card-background").trim();
    const theme = this._hass?.themes?.themes?.[this._config.theme || "Marao Dashboard"];
    const dark = Boolean(this._hass?.themes?.darkMode);
    if (inherited && !this._config.theme) {
      for (const key of this._themeProperties || []) this.style.removeProperty(key);
      this._themeProperties = []; this._themeSource = undefined; return;
    }
    if (!theme || theme === this._themeSource && dark === this._themeDark) return;
    for (const key of this._themeProperties || []) this.style.removeProperty(key);
    const values = { ...theme, ...theme.modes?.[dark ? "dark" : "light"] }; delete values.modes;
    this._themeProperties = Object.keys(values).map(key => "--" + key);
    for (const [key, value] of Object.entries(values)) this.style.setProperty("--" + key, String(value));
    this._themeSource = theme; this._themeDark = dark;
  }
  _status(message, retry = false) {
    if (!this.shadowRoot) return;
    if (!this._children.length) {
      const spec = this.constructor.spec;
      const type = spec?.runtime_type || spec?.legacy_type || 'custom:marao-card';
      const Constructor = globalThis.customElements?.get(type.slice(7));
      const child = Constructor ? document.createElement(type.slice(7)) : new MaraoCard();
      const variables = { ...Object.fromEntries((spec?.variables || []).filter(item => item.default !== undefined).map(item => [item.key, item.default])), ...this._config.variables };
      child.preview = true;
      child.setConfig({ ...this._config, type, template: spec?.id || 'hc_base_card', variables,
        ...(spec?.legacy_type ? variables : {}),
        ...(spec?.entity_group ? { variables: { ...variables, entity_type: this._config.entity_type, summary_entities: this._config.entities || [] } } : {}) });
      child.hass = previewHass(this._hass, true);
      child.setAttribute('aria-busy', 'true');
      this.shadowRoot.replaceChildren(child); this._children = [child]; this._placeholder = true;
    }
    this.shadowRoot.querySelector('.native-status')?.remove();
    if (!retry && message === editorLabel('Loading…', this._hass)) return;
    const overlay = document.createElement('div'); overlay.className = 'native-status';
    overlay.style.cssText = 'position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:var(--ha-card-border-radius,20px);background:var(--secondary-background-color);color:var(--primary-text-color)';
    this.style.position = 'relative';
    for (const child of this._children) child.style.visibility = 'hidden';
    if (!retry) overlay.textContent = message;
    for (const action of retry ? ['Error','Retry'] : []) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = editorLabel(action, this._hass);
      button.style.cssText = 'min-width:48px;min-height:48px;border:0;border-radius:12px;background:var(--ha-card-background);color:inherit;font:inherit;outline:none';
      button.onclick = action === 'Retry' ? () => { this._identity = null; this._compile(); } : () => showCardDetails(this, message, button);
      overlay.append(button);
    }
    this.shadowRoot.append(overlay);
  }
  async _compile() {
    if (!this.isConnected || !this._hass?.callWS || !this._config.type) return;
    if (this._hass.connected === false || this._hass.connection?.connected === false) return;
    const spec = this.constructor.spec;
    if (spec?.domains.length && !spec.entity_optional && !this._config.entity) {
      this._status(editorLabel("Choose an entity", this._hass)); return;
    }
    const message = { type: "marao_dashboard/native/card", config: this._config, instance: this._instance,
      url_path: dashboardRoot(), entities: entityMetadata(this._config, this._hass).map(metadata => {
        // Missing entity attributes must not recompile a different presentation.
        const previous = this._metadata.get(metadata.entity_id) || {};
        const retained = { ...previous, ...Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined)) };
        if (!metadata.has_state && previous.has_state) retained.has_state = true;
        this._metadata.set(metadata.entity_id, retained); return retained;
      }), language: this._hass.language || "en", validate_units: false };
    const identity = JSON.stringify(message);
    if (identity === this._identity) return;
    this._identity = identity;
    const request = ++this._request;
    this._loading = true;
    try {
      const result = await this._hass.callWS(message);
      if (!this.isConnected || request !== this._request) return;
      await this._mount(result, request);
    } catch (error) {
      if (!this.isConnected || request !== this._request) return;
      this._status(editorLabel(error.message || "Native configuration failed", this._hass), true);
    } finally {
      if (request === this._request) this._loading = false;
    }
  }
  async _mount(result, request) {
    const configs = [result.card, ...result.popups];
    const children = [];
    for (const config of configs) {
      const name = config.type.slice(7);
      await customElements.whenDefined(name);
      if (!this.isConnected || request !== this._request) return;
      const child = document.createElement(name); child.nativeOwner = this; child.preview = this.preview;
      if (child instanceof MaraoNavbarCard) child.nativeHost = true;
      child.setConfig(config); child.hass = previewHass(this._hass, this.preview);
      children.push(child);
    }
    this.shadowRoot.replaceChildren();
    const style = document.createElement("style");
    style.textContent = ":host{display:block;min-width:0;height:auto}:host([data-marao-control-cell]){display:flex;flex-direction:column;align-items:stretch}:host([data-marao-control-cell])>[data-marao-primary-content]{flex:1;min-height:0}button:focus{outline:none}.native-edit{position:fixed;top:max(12px," + safeArea("top") + ");right:max(12px," + safeArea("right") + ");z-index:1002;width:48px;height:48px;border:0;border-radius:50%;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);box-shadow:var(--ha-card-box-shadow);cursor:pointer}";
    children[0]?.setAttribute("data-marao-primary-content", "");
    if (this.hasAttribute("data-marao-control-cell")) children[0]?.setAttribute("data-marao-control-cell", "");
    this.shadowRoot.append(style, ...children); this._children = children; this._placeholder = false;
    // The host controls editor drag handles; prevent only the rendered card's own inputs.
    for (const event of ["click", "pointerdown", "pointerup", "keydown", "keyup"]) this.shadowRoot.addEventListener(event, this._guardPreview, true);
    this._editAccess();
  }
  _guardPreview = event => {
    if (!this.preview || event.target?.classList?.contains("native-edit")) return;
    event.preventDefault(); event.stopImmediatePropagation();
  };
  _editAccess() {
    if (!this.shadowRoot || this.constructor.spec?.id !== "navbar") return;
    const root = ownerRoot(this);
    const enabled = nativeDashboard(root) && this._config.native && this._config.routes?.length && this._hass?.user?.is_admin && !this.preview && !root?.lovelace?.editMode;
    let button = this.shadowRoot.querySelector(".native-edit");
    if (!enabled) { button?.remove(); return; }
    if (!button) {
      button = document.createElement("button"); button.type = "button"; button.className = "native-edit";
      const icon = document.createElement("ha-icon"); icon.setAttribute("icon", "mdi:pencil"); button.append(icon);
      // HA's normal Edit dashboard action handles strategy takeover and visual
      // editing. enableFullEditMode opens the raw YAML dialog instead.
      button.onclick = () => { haptic("heavy"); root?._enableEditMode?.(); };
      this.shadowRoot.append(button);
    }
    button.setAttribute("aria-label", editorLabel("Edit dashboard", this._hass));
    button.title = editorLabel("Edit dashboard", this._hass);
  }
  getCardSize() { return this._children[0]?.getCardSize?.() ?? 2; }
  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 6 };
  }
}

export class MaraoStarterStrategy extends BaseElement {
  static noEditor = true;
  static getCreateSuggestions(hass) { return { title: editorLabel("Marao Native", hass), icon: "mdi:home-variant" }; }
  static async generate(config, hass) {
    const [registry, areas, devices] = await Promise.all([
      hass.callWS({ type: "config/entity_registry/list" }),
      hass.callWS({ type: "config/area_registry/list" }),
      hass.callWS({ type: "config/device_registry/list" }),
    ]);
    const areaNames = new Map(areas.map(area => [area.area_id, area.name]));
    const deviceAreas = new Map(devices.map(device => [device.id, device.area_id]));
    const deviceMetadata = new Map(devices.map(device => [device.id, device]));
    const entities = registry.map(entity => {
      const state = hass.states[entity.entity_id], attrs = state?.attributes || {};
      const area_id = entity.area_id || deviceAreas.get(entity.device_id);
      return { entity_id: entity.entity_id, name: entity.name || attrs.friendly_name || entity.original_name,
        icon: entity.icon, area_id, area_name: areaNames.get(area_id), has_state: Boolean(state),
        hidden_by: entity.hidden_by, disabled_by: entity.disabled_by, device_class: attrs.device_class,
        model: deviceMetadata.get(entity.device_id)?.model, manufacturer: deviceMetadata.get(entity.device_id)?.manufacturer,
        supported_features: attrs.supported_features, unit_of_measurement: attrs.unit_of_measurement };
    });
    const url_path = dashboardRoot();
    const result = await hass.callWS({ type: "marao_dashboard/native/starter",
      title: hass.panels?.[url_path]?.title || config.title || editorLabel("Marao Native", hass), url_path, entities, areas,
      language: hass.language || "en" });
    return result.config;
  }
}

export function registerNativeCards() {
  if (!globalThis.customElements) return;
  for (const spec of catalog.cards) {
    const name = spec.type.slice(7);
    if (!customElements.get(name)) {
      class Variant extends MaraoNativeCard { static spec = spec; }
      customElements.define(name, Variant);
    }
    if (globalThis.window) {
      window.customCards ||= [];
      if (!window.customCards.some(card => card.type === name)) window.customCards.push({
        type: name, get name() { return "Marao " + editorLabel(spec.label, document.querySelector("home-assistant")?.hass); },
        documentationURL: "https://diogomrpr.github.io/MaraoDashboard/usage/native-dashboard/",
        getEntitySuggestion: (hass, entity) => supportsEntity(spec, hass, entity) ? { config: { type: spec.type, entity } } : null,
      });
    }
  }
  for (const klass of [MaraoCard, MaraoNavbarCard, MaraoPopupCard]) klass.getConfigElement = configElement;
  for (const name of ["marao-state-timeline-card", "marao-energy-period-card", "marao-camera-events-card", "marao-frigate-events-card"]) {
    const klass = customElements.get(name);
    if (klass) klass.getConfigElement = configElement;
  }
  if (!customElements.get("ll-strategy-dashboard-marao-starter")) customElements.define("ll-strategy-dashboard-marao-starter", MaraoStarterStrategy);
  if (globalThis.window) {
    window.customStrategies ||= [];
    if (!window.customStrategies.some(strategy => strategy.type === "marao-starter")) window.customStrategies.push({
      type: "marao-starter", strategyType: "dashboard", name: "Marao",
      description: editorLabel("Marao Native", document.querySelector("home-assistant")?.hass),
      documentationURL: "https://diogomrpr.github.io/MaraoDashboard/usage/native-dashboard/",
    });
  }
}

registerNativeCards();
