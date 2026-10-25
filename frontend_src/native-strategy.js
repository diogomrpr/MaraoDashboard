const query = new URL(import.meta.url).search;
const model = () => import(new URL(`./MaraoNativeModel.js${query}`,import.meta.url));
const theme = await import(new URL(`./MaraoTheme.js${query}`,import.meta.url));
const navigation = await import(new URL(`./MaraoNavigation.js${query}`,import.meta.url));
const panels = new WeakMap();
const drafts = window.MaraoEditorPanels ||= new Set();
window.addEventListener('beforeunload', event => {
  if ([...drafts].some(panel => panel._dirty || panel._busy)) { event.preventDefault(); event.returnValue = ''; }
});
const denied = hass => language(hass) ? 'Só os administradores podem editar este dashboard.' : 'Only administrators can edit this dashboard.';
function loadError(host,error) {
  const message = document.createElement('p'); message.setAttribute('role','alert');
  message.textContent = (language(host._hass) ? 'Não foi possível abrir o editor. ' : 'Could not open the editor. ') + String(error.message);
  const retry = document.createElement('button'); retry.textContent = language(host._hass) ? 'Tentar novamente' : 'Retry';
  retry.style.cssText = 'min-width:48px;min-height:48px;font:inherit';
  retry.addEventListener('click',() => host._mount()); host.shadowRoot.replaceChildren(message,retry);
}
function setHass(host,hass) {
  const previous = host._hass;
  if (host._panel && (previous?.user?.id !== hass.user?.id || previous?.connection !== hass.connection || !hass.user?.is_admin)) {
    host._epoch = (host._epoch || 0) + 1;
    host.shadowRoot.replaceChildren(); host._panel = null;
  }
  host._hass = hass; theme.applyTheme(host,hass);
  if (host instanceof MaraoEditorCard) {
    const active = host.isConnected && hass.user?.is_admin, owned = navigation.fullscreenUsers.has(host);
    if (active && !owned) navigation.registerFullscreen(host);
    else if (!active && owned) navigation.unregisterFullscreen(host);
  }
  if (!hass.user?.is_admin) {host.shadowRoot.textContent = denied(hass);return;}
  if (host._panel) host._panel.hass = hass; else host._mount();
  if (host instanceof MaraoEditorCard && host.isConnected) navigation.updateFrontendClient(hass);
}
const rootFor = (config,hass) => {
  const route = globalThis.location?.pathname?.split('/')[1];
  return (hass?.panels?.[route]?.component_name || hass?.panels?.[route]?.component) === 'lovelace' ? route : config.dashboard_root || 'marao-dashboard';
};
const language = hass => String(hass?.language || 'en').startsWith('pt');

export class MaraoDashboardStrategy extends HTMLElement {
  static registryDependencies = [];
  static configRequired = true;
  static getCreateSuggestions() { return {title:'Marao Dashboard',icon:'mdi:view-dashboard-outline'}; }
  static async getConfigElement() { return document.createElement('marao-strategy-editor'); }
  static async generate(config,hass) {
    const {convertDocument,metadataSnapshot} = await model();
    const root = rootFor(config,hass);
    if (!['source_json','envelope_version','compiler_contract'].some(key=>Object.hasOwn(config,key))) return {title:'Marao Dashboard',views:[{title:'Marao',path:'setup',type:'panel',cards:[{type:'custom:marao-dashboard-editor-card',dashboard_root:root,create:true}]}]};
    const converted = convertDocument(JSON.stringify({strategy:config}),{...metadataSnapshot(hass),dashboardRoot:root,language:hass.language,assetBaseURL:new URL('./',import.meta.url).href});
    const result = converted.compiled;
    // Scoped native styling owns the bundled theme; retain deliberate other named themes.
    for (const view of result.views) {
      if (view.theme === 'Marao Dashboard') delete view.theme;
      const navbar = view.cards.at(-1)?.cards?.find(card=>card.type === 'custom:marao-navbar-card');
      if (navbar) navbar.dashboard_root = root;
    }
    // HA retains the active numeric view index during saves; keep the editor after the landing view.
    if (hass.user?.is_admin) result.views.splice(1,0,{title:language(hass)?'Editar dashboard':'Edit dashboard',path:converted.document.strategy.editor_path,type:'panel',subview:true,cards:[{type:'custom:marao-dashboard-editor-card',dashboard_root:root}]});
    return result;
  }
}

class MaraoEditorCard extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:'open'}); this._epoch = 0; }
  setConfig(config) {
    if (this._config?.dashboard_root !== config.dashboard_root) {this._epoch++;this._panel = null;this.shadowRoot.replaceChildren();}
    this._config = {...config,routes:[]}; if (this.isConnected && this._hass?.user?.is_admin) navigation.registerFullscreen(this); this._mount();
  }
  set hass(hass) { setHass(this,hass); }
  getCardSize() { return 12; }
  _frontendStatus(state) {
    if (!['failed','offline','deferred','refreshing','interrupted','unsaved'].includes(state)) return;
    this._panel?._setStatus(navigation.navigationLocalize(`navigation.refresh.${state}`,this._hass),['failed','offline','interrupted'].includes(state)?'error':'');
  }
  connectedCallback() { if (this._hass?.user?.is_admin) {navigation.registerFullscreen(this);navigation.updateFrontendClient(this._hass);} this._mount(); }
  disconnectedCallback() { this._epoch++; navigation.unregisterFullscreen(this); theme.releaseTheme(this); }
  async _mount() {
    if (!this.isConnected || !this._config || !this._hass || this._mounting || this._panel) return;
    if (!this._hass.user?.is_admin) { this.shadowRoot.textContent = denied(this._hass); return; }
    const epoch = this._epoch; this._mounting = true;
    try {
      const [{NativeSession}] = await Promise.all([model(),import(new URL(`./MaraoDashboardPanel.js${query}`,import.meta.url))]);
      if (!this.isConnected || epoch !== this._epoch || !this._hass.user?.is_admin) return;
      const connection = this._hass.connection;
      let cache = panels.get(connection); if (!cache) {cache = new Map();panels.set(connection,cache);}
      const key = `${this._hass.user.id}:${this._config.dashboard_root}`;
      let panel = cache.get(key);
      if (!panel) {
        panel = document.createElement('marao-dashboard-panel');
        panel.nativeSession = new NativeSession(this._hass,this._config.dashboard_root);
        cache.set(key,panel);
      }
      drafts.add(panel); this._panel = panel; panel.hass = this._hass; this.shadowRoot.replaceChildren(panel);
      if (panel._loaded && !panel._dirty && !panel._busy) await panel._load(true);
    } catch (error) { if (this.isConnected && epoch === this._epoch) loadError(this,error); }
    finally { this._mounting = false; if (this.isConnected && epoch !== this._epoch) this._mount(); }
  }
}

class MaraoStrategyEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:'open'}); this._epoch = 0; }
  setConfig(config) {
    if (JSON.stringify(config) === JSON.stringify(this._config)) return;
    this._config = config;
    if (this._panel) {
      this._panel.nativeSession.strategy = config;
      if (this._panel._dirty || this._panel._busy) this._panel._setStatus(this._panel._t('externalChange'),'error');
      else this._panel._load(true);
    } else this._mount();
  }
  set hass(hass) { setHass(this,hass); }
  connectedCallback() { this._mount(); }
  disconnectedCallback() { this._epoch++; theme.releaseTheme(this); }
  async _mount() {
    if (!this.isConnected || !this._hass || !this._config || this._panel || this._mounting) return;
    if (!this._hass.user?.is_admin) { this.shadowRoot.textContent = denied(this._hass); return; }
    const epoch = this._epoch; this._mounting = true;
    try {
      const [{NativeSession}] = await Promise.all([model(),import(new URL(`./MaraoDashboardPanel.js${query}`,import.meta.url))]);
      if (!this.isConnected || epoch !== this._epoch || !this._hass.user?.is_admin) return;
      const root = rootFor(this._config,this._hass), connection = this._hass.connection;
      let cache = panels.get(connection); if (!cache) {cache = new Map();panels.set(connection,cache);}
      const key = `${this._hass.user.id}:${root}:settings`;
      let panel = cache.get(key);
      if (!panel) {
        panel = document.createElement('marao-dashboard-panel');
        panel.nativeSession = new NativeSession(this._hass,root,{strategy:this._config});
        cache.set(key,panel);
      }
      const changed = JSON.stringify(panel.nativeSession.strategy) !== JSON.stringify(this._config);
      panel.nativeSession.strategy = this._config;
      panel.nativeSession.onChange = config => {
        this._config = config; this.dispatchEvent(new CustomEvent('config-changed',{detail:{config},bubbles:true,composed:true}));
      };
      drafts.add(panel); this._panel = panel; panel.hass = this._hass; this.shadowRoot.replaceChildren(panel);
      if (changed && panel._loaded) {
        if (panel._dirty || panel._busy) panel._setStatus(panel._t('externalChange'),'error');
        else await panel._load(true);
      }
    } catch (error) { if (this.isConnected && epoch === this._epoch) loadError(this,error); }
    finally { this._mounting = false; if (this.isConnected && epoch !== this._epoch) this._mount(); }
  }
}

if (!customElements.get('ll-strategy-dashboard-marao-dashboard')) customElements.define('ll-strategy-dashboard-marao-dashboard',MaraoDashboardStrategy);
if (!customElements.get('marao-dashboard-editor-card')) customElements.define('marao-dashboard-editor-card',MaraoEditorCard);
if (!customElements.get('marao-strategy-editor')) customElements.define('marao-strategy-editor',MaraoStrategyEditor);
window.customStrategies ||= [];
if (!window.customStrategies.some(item => item.type === 'marao-dashboard')) window.customStrategies.push({type:'marao-dashboard',strategyType:'dashboard',name:'Marao Dashboard',description:language({language:navigator.language})?'Dashboard móvel Marao':'Marao mobile dashboard'});
