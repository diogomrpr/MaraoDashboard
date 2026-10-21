const query = new URL(import.meta.url).search;
const navigationURL = './MaraoNavigation.js' + query;
const editorURL = './MaraoNativeCardEditor.js' + query;
const { haptic, safeArea, ownerRoot, nativeDashboard, navigationLocalize } = await import(navigationURL);
const BaseElement = globalThis.HTMLElement || class {};
let editorModule;
export class MaraoNativeNavbar extends BaseElement {
  static spec = { id: 'navbar' };
  static async getConfigElement() {
    editorModule ||= import(editorURL).catch(error => { editorModule = undefined; throw error; });
    await editorModule; return document.createElement('marao-native-card-editor');
  }
  static getStubConfig(hass) { return { name:navigationLocalize('navigation.card_name',hass), routes: [], native: true }; }
  constructor() {
    super(); this.attachShadow?.({mode:'open'}); this._config = {};
    if (!this.shadowRoot) return;
    this._child = document.createElement('marao-navbar-card'); this._child.nativeOwner = this; this._child.nativeHost = true;
    this._children = [this._child]; this.shadowRoot.append(this._child);
    const style = document.createElement('style');
    style.textContent = ':host{display:block;min-width:0}.native-edit{position:fixed;top:max(12px,' + safeArea('top') + ');right:max(12px,' + safeArea('right') + ');z-index:1002;width:48px;height:48px;border:0;border-radius:50%;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);box-shadow:var(--ha-card-box-shadow);cursor:pointer}.native-edit:focus{outline:none}';
    this.shadowRoot.prepend(style);
  }
  setConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error(navigationLocalize('navigation.invalid_native',this._hass));
    this._child.setConfig({...structuredClone(config), type:'custom:marao-navbar-card'});
    this._config = structuredClone(config); this._editAccess();
  }
  get preview() { return Boolean(this._preview || ownerRoot(this)?.lovelace?.editMode); }
  set preview(value) { this._preview = Boolean(value); if (this._child) this._child.preview = this.preview; this._editAccess(); }
  set editMode(value) { this.preview = value; }
  set hass(value) { this._hass = value; this._theme(); if (this._child) { this._child.preview = this.preview; this._child.hass = value; } this._editAccess(); }
  connectedCallback() { this._theme(); this._editAccess(); }
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
  _editAccess() {
    if (!this.shadowRoot) return;
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
    button.setAttribute("aria-label", navigationLocalize("navigation.edit", this._hass));
    button.title = navigationLocalize("navigation.edit", this._hass);
  }

  getCardSize() { return 0; }
  getGridOptions() { return {columns:12, rows:'auto', min_columns:6}; }
}
if (globalThis.customElements && !customElements.get('marao-native-navbar-card')) customElements.define('marao-native-navbar-card', MaraoNativeNavbar);
