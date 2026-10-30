import { catalog } from './native-model.js';
import { editorLabel } from './editor-labels.js';
import { composeNativeCard, nativeCardDescriptor, nativeCardType, validateNativeCardConfig } from './card-composition.js';

const copy = value => structuredClone(value);
const query = new URL(import.meta.url).search;
let themeModule;
const loadTheme = () => themeModule ||= import(new URL(`./MaraoTheme.js${query}`, import.meta.url)).catch(error => { themeModule = null; throw error; });
const HTMLElementBase = globalThis.HTMLElement || class {};
const compact = new Set(['md_base_card', 'md_light_card', 'md_sensor_card', 'md_switch_card', 'md_number_card',
  'md_battery_card', 'md_navigation_card', 'md_room_card', 'md_entity_group_card', 'md_scene_collection_card', 'md_media_app_card']);
let nextInstance = 0;
const sessionId = globalThis.crypto?.randomUUID?.().replaceAll('-', '') || Date.now().toString(36);

export function nativeCardStub(template, hass = {}, entities = []) {
  const entry = catalog.cards.find(card => card.id === template);
  if (!entry) throw new Error('Choose a supported Marao card type.');
  const candidateIds = [...entities.map(entity => typeof entity === 'string' ? entity : entity.entity_id), ...Object.keys(hass.states || {})];
  const compatible = id => template !== 'md_fan_card' || !String(id).startsWith('cover.')
    || !['door', 'garage', 'gate'].includes(hass.states?.[id]?.attributes?.device_class)
      && !/door|garage|gate/i.test(`${id} ${hass.states?.[id]?.attributes?.friendly_name || ''}`);
  const entity = entry.domains.map(domain => candidateIds.find(id => String(id).split('.')[0] === domain && compatible(id))).find(Boolean);
  const config = { type: nativeCardType(template), template };
  if (entity && !entry.entity_optional) config.entity_id = entity;
  if (!entry.domains.length || entry.entity_optional) config.name = editorLabel(entry.label, hass);
  const variables = Object.fromEntries(entry.variables.filter(variable => Object.hasOwn(variable, 'default')).map(variable => [variable.key, copy(variable.default)]));
  if (Object.keys(variables).length) config.variables = variables;
  if (['md_navigation_card', 'md_room_card'].includes(template)) config.tap_action = { action: 'none' };
  if (template === 'md_entity_group_card') Object.assign(config, { id: 'group', entity_type: 'light', entities: [], popup_filter: 'active' });
  if (template === 'md_scene_collection_card') config.entities = [];
  if (template === 'md_floor_plan_card') config.variables = { lights: [] };
  if (template === 'md_media_app_card') {
    const source = hass.states?.[entity]?.attributes?.source_list?.[0];
    if (source) config.variables = { ...config.variables, app_source: source };
  }
  return config;
}

export function nativeCardSetup(config) {
  const descriptor = nativeCardDescriptor(config);
  if (descriptor.template !== 'md_floor_plan_card' || descriptor.variables?.image_id !== undefined && descriptor.variables.image_id !== '') return null;
  // Validate every other option before allowing this one incomplete initial field.
  validateNativeCardConfig({ ...config, variables: { ...descriptor.variables, image_id: '0'.repeat(32) } });
  return 'Upload a floor-plan image.';
}

export function nativeCardGridOptions(config) {
  const template = nativeCardDescriptor(config).template;
  let rows = compact.has(template) ? 2 : 3;
  if (template === 'md_title_card') rows = 1;
  if (['md_light_card', 'md_fan_card'].includes(template) && config.variables?.enable_slider !== false) rows = 3;
  if (['md_climate_card', 'md_header_card', 'md_weather_card', 'md_wallbox_current_card', 'md_alarm_controls_card'].includes(template)) rows = 4;
  if (template === 'md_camera_card') rows = 5;
  if (template === 'md_floor_plan_card') rows = 8;
  if (template === 'md_media_card' && config.variables?.media_display === 'inline') rows = config.apple_tv ? 12 : 5;
  const explicit = config.grid_options || {};
  const minimum = (preferred, saved) => Number.isFinite(saved) && saved > 0 ? Math.min(preferred, saved) : preferred;
  return { columns: compact.has(template) ? 6 : 12, rows,
    min_columns: minimum(compact.has(template) || template === 'md_title_card' ? 3 : 6, explicit.columns),
    min_rows: minimum(template === 'md_title_card' ? 1 : template === 'md_floor_plan_card' ? 4 : 2, explicit.rows) };
}

function nativeHost(element) {
  for (let node = element; node; node = node.parentNode || node.host) if (node.localName === 'hui-root') return node;
  return null;
}

function metadata(hass) {
  return Object.values(hass?.states || {}).map(state => ({ entity_id: state.entity_id,
    name: state.attributes?.friendly_name, unit_of_measurement: state.attributes?.unit_of_measurement,
    device_class: state.attributes?.device_class, supported_features: state.attributes?.supported_features }));
}

/** One ordinary HA card. Runtime controls and detail sheets keep their shared owners. */
export class MaraoNativeCard extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._instanceId = `${sessionId}-${++nextInstance}`;
    this._children = [];
    this._renderVersion = 0;
    this.shadowRoot.innerHTML = '<style>:host{display:block;height:100%;min-width:0;min-height:0}#content{height:100%;min-width:0}#content>*{height:100%;min-width:0}p{font:inherit;color:var(--primary-text-color);overflow-wrap:anywhere}</style><div id="content"></div><div id="details"></div>';
    this._content = this.shadowRoot.querySelector('#content');
    this._details = this.shadowRoot.querySelector('#details');
    this._guard = event => {
      if (!this.preview) return;
      event.preventDefault(); event.stopImmediatePropagation();
    };
    for (const event of ['click', 'dblclick', 'contextmenu', 'pointerdown', 'pointerup', 'keydown']) this.shadowRoot.addEventListener(event, this._guard, true);
  }

  static async getConfigElement() {
    await import(new URL(`./MaraoNativeCardEditor.js${query}`, import.meta.url));
    return document.createElement('marao-native-card-editor');
  }

  setConfig(config) {
    this._setup = nativeCardSetup(config);
    if (!this._setup) validateNativeCardConfig(config, metadata(this._hass));
    this._config = copy(config);
    this._compositionKey = null;
    this._refresh();
  }

  set hass(value) { this._hass = value; this._refresh(); }
  get hass() { return this._hass; }
  get preview() { return Boolean(!this.isConnected || this._preview || this._host?.lovelace?.editMode || nativeHost(this)?.lovelace?.editMode); }
  set preview(value) { this._preview = Boolean(value); this._forward(); }
  getCardSize() { return this._children[0]?.getCardSize?.() || (this._config ? nativeCardGridOptions(this._config).rows * 1.28 : 3); }
  getGridOptions() { return nativeCardGridOptions(this._config || { type: nativeCardType(this.constructor.template) }); }

  connectedCallback() {
    this._bindHost();
    loadTheme().then(theme => {
      this._theme = theme;
      if (this.isConnected) { this._themeError?.remove(); this._themeError = null; theme.applyTheme(this, this._hass); }
    }).catch(error => {
      if (!this.isConnected) return;
      this._themeError ||= document.createElement('p'); this._themeError.setAttribute('role', 'alert');
      this._themeError.textContent = `${String(this._hass?.language || '').startsWith('pt') ? 'Não foi possível carregar o tema Marao.' : 'The Marao theme could not load.'} ${error.message}`;
      this.shadowRoot.append(this._themeError);
    });
    this._refresh();
  }

  disconnectedCallback() {
    // Close sheets immediately; a move may reconnect this same occurrence.
    for (const child of this._children) child.preview = true;
    queueMicrotask(() => {
      if (this.isConnected) return;
      this._unbindHost();
      this._theme?.releaseTheme(this);
      ++this._renderVersion;
      this._compositionKey = null;
    });
  }

  _bindHost() {
    const host = nativeHost(this);
    if (this._host === host) return;
    this._unbindHost(); this._host = host;
    if (host?.addController && host?.removeController) {
      this._controller = { hostUpdated: () => this._forward(), hostDisconnected: () => this._forward() };
      host.addController(this._controller);
    }
  }

  _unbindHost() {
    if (this._controller) this._host?.removeController?.(this._controller);
    this._controller = null; this._host = null;
  }

  _forward() {
    if (this.isConnected) this._theme?.applyTheme(this, this._hass);
    const preview = this.preview;
    this._content.inert = preview;
    const hass = preview && this._hass ? { ...this._hass, connected: false, connection: { ...this._hass.connection, connected: false } } : this._hass;
    for (const child of this._children) {
      child.nativeOwner = this;
      child.preview = preview;
      child.hass = hass;
    }
  }

  _refresh() {
    if (!this._config) return;
    this._bindHost();
    const entities = metadata(this._hass);
    // State updates only reach existing controls; configuration metadata can recompose.
    const bound = new Set([this._config.entity_id, ...(Array.isArray(this._config.entities) ? this._config.entities : []).map(entity => typeof entity === 'string' ? entity : entity.entity_id)]);
    const dashboardRoot = this._host?.panel?.url_path || globalThis.location?.pathname.split('/')[1] || 'marao-dashboard';
    const language = this._hass?.language || 'en';
    const key = JSON.stringify([dashboardRoot, language, entities.filter(entity => bound.has(entity.entity_id))]);
    if (this._compositionKey === key) { this._forward(); return; }
    this._compositionKey = key;
    this._mount({ entities, dashboardRoot, language });
  }

  async _mount(context) {
    const version = ++this._renderVersion;
    // Old detail owners must be closed before replacement can claim any hash.
    for (const child of this._children) child.preview = true;
    try {
      if (this._setup) {
        this._children = []; this._details.replaceChildren();
        const surface = document.createElement('ha-card'), message = document.createElement('p');
        surface.style.cssText = 'padding:16px;box-sizing:border-box;height:100%;font-family:var(--primary-font-family,inherit);background:var(--ha-card-background);border-radius:var(--ha-card-border-radius,24px)';
        message.textContent = editorLabel(this._setup, this._hass); surface.append(message);
        this._content.replaceChildren(surface); this._forward(); return;
      }
      const { card, popups } = composeNativeCard(this._config, { ...context, instanceId: this._instanceId });
      const configs = [card, ...popups];
      const local = configs.every(config => config.type.startsWith('custom:') && customElements.get(config.type.slice(7)));
      const helpers = local ? { createCardElement(config) { const child = document.createElement(config.type.slice(7)); child.setConfig(config); return child; } } : await globalThis.loadCardHelpers?.();
      if (!helpers?.createCardElement) throw new Error(editorLabel('Loading Home Assistant cards…', this._hass));
      if (version !== this._renderVersion) return;
      const children = configs.map(config => {
        const child = helpers.createCardElement(config);
        child.nativeOwner = this; child.preview = this.preview;
        if (config.type === 'custom:marao-card' && config.template !== 'md_title_card') child.setAttribute('data-marao-control-cell', '');
        return child;
      });
      this._children = children;
      this._content.replaceChildren(children[0]);
      this._details.replaceChildren(...children.slice(1));
      this._forward();
    } catch (error) {
      if (version !== this._renderVersion) return;
      this._children = []; this._details.replaceChildren();
      const message = document.createElement('p'); message.setAttribute('role', 'alert');
      message.textContent = editorLabel(error.message, this._hass);
      this._content.replaceChildren(message);
    }
  }
}

export function registerNativeCards() {
  if (!globalThis.customElements) return;
  const picker = globalThis.window && (window.customCards ||= []);
  for (const entry of catalog.cards) {
    const type = nativeCardType(entry.id).slice(7);
    if (!customElements.get(type)) {
      class CatalogCard extends MaraoNativeCard {
        static template = entry.id;
        static getStubConfig(hass, entities) { return nativeCardStub(entry.id, hass, entities); }
      }
      customElements.define(type, CatalogCard);
    }
    if (picker && !entry.hidden && !picker.some(card => card.type === type)) {
      picker.push({ type, name: `Marao ${editorLabel(entry.label, { language: globalThis.navigator?.language })}`, preview: true,
        description: editorLabel(entry.description || entry.label, { language: globalThis.navigator?.language }) });
    }
  }
}

registerNativeCards();
