const [refreshModule, updatesModule, themeModule, pressModule] = await Promise.all([
  'MaraoFrontendRefresh.js', 'MaraoFrontendUpdates.js', 'MaraoTheme.js', 'MaraoPressFeedback.js',
].map(file => import(new URL(`./${file}${new URL(import.meta.url).search}`, import.meta.url))));
const { bindNavbarRefresh, refreshFrontend } = refreshModule;
const {bindPressFeedback,pressStyles,pressTarget}=pressModule;
const { createFrontendUpdates } = updatesModule;
let frontendUpdates, activeServices = 0;
export function beginFrontendInteraction() {
  activeServices++;
  return () => {
    activeServices--;
    globalThis.window?.dispatchEvent?.(new Event('marao-interaction-settled'));
  };
}
export function updateFrontendClient(hass) {
  if (!globalThis.window?.addEventListener || !(window.MaraoFrontendPackage ? hass?.connection?.subscribeEvents : hass?.connection?.subscribeMessage)) return;
  frontendUpdates ||= createFrontendUpdates({
    loadedVersion: window.MaraoFrontendPackage?.identity || new URL(import.meta.url).searchParams.get('v'),
    context: () => {
      const dashboard = window.location.pathname.split('/')[1];
      const record = [...navigationRecords].find(item => !item.released && item.dashboard === dashboard);
      const editor = !record && [...fullscreenUsers].find(owner=>owner.isConnected && owner._config?.dashboard_root===dashboard && typeof owner._frontendStatus==='function');
      return { dashboard, active: Boolean(record?.root.isConnected && !record.surface.preview || editor),
        get blocked() { return Boolean(activeServices || window.isDirtyState || [...(window.MaraoEditorPanels || [])].some(panel => panel._dirty || panel._busy) || record?.root.lovelace?.editMode
          || record?.surface._refreshing || record?.surface._open || record?.surface._maintenance
          || findElements('marao-dashboard-panel').some(panel => panel._dirty || panel._busy)
          || findElements('marao-popup-card').some(popup => popup._open)); },
        status: state => {
          if (editor) {editor._frontendStatus(state);return;}
          if (!record?.surface._refreshing && record?.surface._refreshFeedbackState !== 'hold') record?.surface._refreshFeedback(state);
        } };
    },
  });
  frontendUpdates.update(hass);
}
const BaseElement = globalThis.HTMLElement || class {};
const text = (value, fallback = "") => String(value ?? fallback);
const esc = value => text(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
export const navigationTranslations = {
  "en": {
    "navigation.maintenance.title": "Maintenance",
    "navigation.maintenance.hold": "Hold to open maintenance",
    "navigation.maintenance.close": "Close maintenance",
    "navigation.label": "Marao navigation",
    "navigation.more": "More destinations",
    "navigation.open": "Additional destinations",
    "navigation.close": "Close additional destinations",
    "navigation.current": "Current destination: {name}",
    "navigation.refresh.action": "Clear cache and refresh",
    "navigation.refresh.hold": "Hold to refresh frontend",
    "navigation.refresh.refreshing": "Refreshing frontend…",
    "navigation.refresh.unsaved": "Save or discard changes before refreshing.",
    "navigation.refresh.offline": "Cannot reach Home Assistant. Try again.",
    "navigation.refresh.interrupted": "Refresh interrupted. Try again.",
    "navigation.refresh.failed": "Refresh failed. Try again.",
    "navigation.refresh.deferred": "Dashboard refresh waiting until controls and edits are finished.",
    "navigation.edit": "Edit dashboard",
    "navigation.loading_error": "Dashboard content could not load",
    "navigation.card_name": "Navbar",
    "navigation.invalid_routes": "Navigation routes must be a list",
    "navigation.invalid_refresh": "Show cache reset button must be a boolean.",
    "navigation.invalid_editor": "Show editor button must be a boolean.",
    "navigation.invalid_entry": "Navigation entries require a destination and label",
    "navigation.invalid_native": "Native card configuration must be an object"
  },
  "pt": {
    "navigation.maintenance.title": "Manutenção",
    "navigation.maintenance.hold": "Mantenha premido para abrir a manutenção",
    "navigation.maintenance.close": "Fechar manutenção",
    "navigation.label": "Navegação Marao",
    "navigation.more": "Mais destinos",
    "navigation.open": "Destinos adicionais",
    "navigation.close": "Fechar destinos adicionais",
    "navigation.current": "Destino atual: {name}",
    "navigation.refresh.action": "Limpar cache e atualizar",
    "navigation.refresh.hold": "Mantenha premido para atualizar a interface",
    "navigation.refresh.refreshing": "A atualizar a interface…",
    "navigation.refresh.unsaved": "Guarde ou descarte as alterações antes de atualizar.",
    "navigation.refresh.offline": "Sem ligação ao Home Assistant. Tente novamente.",
    "navigation.refresh.interrupted": "Atualização interrompida. Tente novamente.",
    "navigation.refresh.failed": "Falha ao atualizar. Tente novamente.",
    "navigation.refresh.deferred": "A atualização aguarda que termine os controlos e a edição.",
    "navigation.edit": "Editar painel",
    "navigation.loading_error": "Não foi possível carregar o conteúdo do painel",
    "navigation.card_name": "Barra de navegação",
    "navigation.invalid_routes": "Os destinos de navegação têm de ser uma lista",
    "navigation.invalid_refresh": "Mostrar botão de limpeza da cache tem de ser um valor booleano.",
    "navigation.invalid_editor": "Mostrar botão do editor tem de ser um valor booleano.",
    "navigation.invalid_entry": "Os destinos de navegação precisam de um destino e etiqueta",
    "navigation.invalid_native": "A configuração do cartão nativo tem de ser um objeto"
  }
};
export function navigationLocalize(key, hass, placeholders = {}, fallback = key) {
  const language = typeof hass === 'string' ? hass : hass?.language || globalThis.document?.documentElement?.lang || 'en';
  const translated = navigationTranslations[language.toLowerCase().split('-')[0]]?.[key] || navigationTranslations.en[key] || fallback;
  return text(translated).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(placeholders, name) ? placeholders[name] : match);
}
const localize = navigationLocalize;
export function ownerRoot(element) {
  for (let node = element; node; node = node.parentElement || node.getRootNode?.().host) if (node.localName === 'hui-root') return node;
}
export function haptic(value = "heavy") {
  if (!value) return;
  globalThis.window?.dispatchEvent?.(new CustomEvent("haptic", { detail: value }));
  globalThis.navigator?.vibrate?.(value === "success" ? [50, 35, 75] : value === "heavy" ? 50 : 25);
}

export function navigate(path) {
  if (!path) return;
  if (path.startsWith("#")) {
    window.history.pushState({}, "", `${window.location.pathname}${window.location.search}${path}`);
  } else {
    window.history.pushState({}, "", path);
  }
  window.dispatchEvent(new Event("location-changed"));
}

export const safeArea = (side) => `var(--marao-safe-area-inset-${side}, var(--safe-area-inset-${side}, env(safe-area-inset-${side}, 0px)))`;

export const navbarBottomGap = () => /iPhone|iPod/i.test(navigator.userAgent || '') ? `max(24px, calc((${safeArea("bottom")} - 20px) * 2))` : '24px';

export function navbarRouteCurrent(route, location = window.location) {
  try {
    const target = new URL(route.url || route.path, location.href);
    return target.origin === location.origin && target.pathname === location.pathname
      && (!target.hash || target.hash === location.hash) && (!target.search || target.search === location.search);
  } catch { return false; }
}

export function navbarMainPage(config, location = window.location) {
  if (!config?.views?.length) return false;
  const path = location.pathname.split('/')[2];
  return !path || path === String(config.views[0].path ?? 0);
}

export function navbarPartition(routes, width, size = 48, gap = 4, padding = 20) {
  const slots = Math.max(1, Math.floor((Math.max(0, width - padding) + gap) / (Math.max(48, size) + gap)));
  const count = routes.length > slots ? slots - 1 : routes.length;
  return { slots, visible: routes.slice(0, count), overflow: routes.slice(count) };
}

export class MaraoNavbarCard extends BaseElement {
  constructor() { super(); this.attachShadow?.({ mode: "open" }); this._config = {}; this._slots = 1; }
  setConfig(config) {
    const routes = config?.routes === undefined ? [] : config.routes;
    if (config && Object.hasOwn(config, 'show_cache_reset') && typeof config.show_cache_reset !== 'boolean') throw new Error(localize('navigation.invalid_refresh', this._hass));
    if (config && Object.hasOwn(config, 'show_editor_button') && typeof config.show_editor_button !== 'boolean') throw new Error(localize('navigation.invalid_editor', this._hass));
    if (!Array.isArray(routes)) throw new Error(localize("navigation.invalid_routes", this._hass));
    if (routes.some(route => !route || typeof route !== 'object' || Array.isArray(route)
      || typeof (route.url || route.path) !== 'string' || !(route.url || route.path).trim()
      || typeof route.label !== 'string' || !route.label.trim())) throw new Error(localize("navigation.invalid_entry", this._hass));
    this._closeOverflow(false);
    this._closeMaintenance(false);
    this._config = { ...config, routes }; this._render();
  }
  connectedCallback() {
    if (!this._isSurface && !this.preview && ownerRoot(this)) { claimNavigation(this); return; }
    registerFullscreen(this); this._render();
    this._observer = new ResizeObserver(this._scheduleLayout);
    for (const node of [this, this._view(), this.shadowRoot.querySelector('.bounds'), this.shadowRoot.querySelector('.nav')]) if (node) this._observer.observe(node);
    for (const event of ['location-changed', 'popstate', 'hashchange']) window.addEventListener(event, this._locationChanged);
    window.addEventListener('resize', this._scheduleLayout);
    window.visualViewport?.addEventListener('resize', this._scheduleLayout);
    window.visualViewport?.addEventListener('scroll', this._scheduleLayout);
    this._layout();
  }
  get preview() { return Boolean(this._preview); }
  set preview(value) {
    this._preview = Boolean(value);
    if (this._config && this._renderedPreview !== this.preview) { this._closeOverflow(false); this._render(); }
    applyFullscreen();
  }
  disconnectedCallback() {
    this._closeMaintenance(false);
    this._pagePress?.destroy();this._pagePress=null;this._press?.destroy();this._press=null;
    this._pageRefresh?.remove();
    if (this._surface) { queueMicrotask(() => syncNavigation(this._surface._navigationRecord)); return; }
    if (this._navigationRecord && !this._navigationRecord.root.isConnected) releaseNavigation(this._navigationRecord);
    this._refreshGesture?.destroy();
    this._closeOverflow(false); this._clearDismissGesture(); this._observer?.disconnect(); cancelAnimationFrame(this._frame); this._frame = null;
    for (const event of ['location-changed', 'popstate', 'hashchange']) window.removeEventListener(event, this._locationChanged);
    window.removeEventListener('resize', this._scheduleLayout);
    window.visualViewport?.removeEventListener('resize', this._scheduleLayout);
    window.visualViewport?.removeEventListener('scroll', this._scheduleLayout);
    unregisterFullscreen(this);
  }
  set hass(value) {
    const previousThemes = this._hass?.themes, previousEditing = this._editing;
    this._hass = value;
    if (this._navigationRecord) themeModule.applyTheme(this._navigationRecord.root, value);
    if (this._navigationRecord) cameraPreloader?.(this._navigationRecord);
    if (!this.preview) updateFrontendClient(value);
    if (this._surface && this._hostPath === window.location.pathname) { copyNavigationTheme(this, this._surface); this._surface.hass = value; }
    this._syncContext();
    this._updateCurrent();
    if (previousThemes !== value?.themes || previousEditing !== this._editing) this._scheduleLayout();
  }
  _root() {
    if (this._navigationRecord) return this._navigationRecord.root;
    let root = this;
    while (root && root.localName !== 'hui-root') root = root.parentElement || root.getRootNode()?.host;
    return root;
  }
  _view() { return this._root()?.shadowRoot?.querySelector('#view'); }
  _syncContext() {
    if (this._maintenance && !this._maintenanceValid(this._maintenance)) this._closeMaintenance(false);
    const editing = Boolean(this._root()?.lovelace?.editMode);
    if (this._isSurface) this.hidden = Boolean(editing || this.preview);
    if (editing !== this._editing) { this._editing = editing; this._refreshGesture?.cancel(); this._closeOverflow(false); this._updateCurrent(); }
  }
  _locationChanged = () => { this._closeMaintenance(false); if (this._navigationRecord) syncNavigation(this._navigationRecord); this._refreshGesture?.cancel(); this._closeOverflow(false); this._updateCurrent(); this._scheduleLayout(); };
  _scheduleLayout = () => {
    if (this._frame != null || !this.isConnected) return;
    this._frame = requestAnimationFrame(() => { this._frame = null; if (this.isConnected) this._layout(); });
  };
  _layout() {
    const nav = this.shadowRoot?.querySelector('.nav'), bounds = this.shadowRoot?.querySelector('.bounds');
    if (!this.isConnected || !nav || !bounds) return;
    if (!this.getClientRects().length) { applyFullscreen(); return; }
    const safe = bounds.getBoundingClientRect(), host = (this.preview ? this : this._view())?.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = Math.max(safe.left, host?.left ?? safe.left, viewport?.offsetLeft || 0);
    const right = Math.min(safe.right, host?.right ?? safe.right, (viewport?.offsetLeft || 0) + (viewport?.width || innerWidth));
    const top = Math.max(safe.top, this.preview ? 0 : host?.top || 0, viewport?.offsetTop || 0);
    const style = getComputedStyle(nav), size = nav.querySelector('a,button')?.getBoundingClientRect().width || 48;
    const gap = parseFloat(style.columnGap) || 0, padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const { slots } = navbarPartition(this._config.routes || [], right - left, size, gap, padding);
    const geometry = [left, right, top, safe.bottom, slots].map(value => Math.round(value * 2) / 2).join(':');
    if (this._geometry !== geometry) { this._refreshGesture?.cancel(); this._closeOverflow(false); }
    this._geometry = geometry; this._safeTop = top;
    setStyle(this, '--marao-navbar-left', `${(left + right) / 2}px`);
    if (this.preview) setStyle(this, '--marao-navbar-preview-left', `${(left + right) / 2 - host.left}px`);
    setStyle(this, '--marao-navbar-width', `${Math.max(68, right - left)}px`);
    if (slots !== this._slots) { this._slots = slots; this._render(); }
    applyFullscreen();
  }
  _link(route, index, horizontal = false) {
    const attributes = `data-route="${index}" aria-label="${esc(route.label)}"`;
    return horizontal ? `<button type="button" ${attributes}><ha-icon></ha-icon></button>`
      : `<a ${attributes} href="${esc(route.url || route.path)}"><ha-icon></ha-icon></a>`;
  }
  _render() {
    if (!this.shadowRoot) return;
    this._closeMaintenance(true);
    if (!this._isSurface && this._surface && !this.preview) {
      this._pagePress?.destroy();this._pagePress=null;this._press?.destroy();this._press=null;
      this._pageRefresh?.remove();
      this.setAttribute('data-marao-navbar-placeholder', '');
      this.shadowRoot.innerHTML = '<style>:host{display:none}</style>';
      if (this._hostPath === window.location.pathname && this.isConnected) updateNavigation(this._surface._navigationRecord, this._config, this);
      return;
    }
    this.removeAttribute?.('data-marao-navbar-placeholder');
    this._press?.destroy();this._press=null;this._overflowPress?.destroy();this._overflowPress=null;
    this._refreshGesture?.destroy();
    this._observer?.unobserve(this.shadowRoot.querySelector('.bounds'));
    const routes = this._config.routes || [];
    this._visibleCount = routes.length > this._slots ? this._slots - 1 : routes.length;
    const overflow = routes.length > this._visibleCount;
    this.toggleAttribute?.('data-empty', !routes.length); this.toggleAttribute?.('data-preview', this.preview);
    this._renderedPreview = this.preview;
    const bottom = navbarBottomGap();
    this.shadowRoot.innerHTML = `<style>${pressStyles}
      :host{display:block;height:128px;font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif)}
      :host([data-empty]){display:none}:host([data-preview]){height:auto}
      .bounds{position:fixed;visibility:hidden;pointer-events:none;inset:${safeArea("top")} calc(12px + ${safeArea("right")}) ${safeArea("bottom")} calc(12px + ${safeArea("left")})}
      .surface{pointer-events:auto;display:flex;gap:clamp(2px,.5vw,4px);box-sizing:border-box;padding:6px 10px;border-radius:999px;background:var(--ha-card-background,var(--card-background-color));box-shadow:0 8px 30px rgba(0,0,0,.22)}
      .nav{position:fixed;z-index:1001;left:var(--marao-navbar-left,50%);bottom:${bottom};transform:translateX(-50%);flex-wrap:nowrap;justify-content:center;width:max-content;max-width:var(--marao-navbar-width,calc(100vw - 24px - ${safeArea("left")} - ${safeArea("right")}));height:60px}
      :host([data-preview]) .nav{position:relative;left:var(--marao-navbar-preview-left,50%);bottom:auto;margin:12px 0}
      a,button{display:grid;place-items:center;box-sizing:border-box;flex:0 0 48px;min-width:48px;width:48px;height:48px;aspect-ratio:1 / 1;align-self:center;justify-self:center;padding:0;border:0;color:var(--icon-color,var(--primary-text-color));background:transparent;text-decoration:none;border-radius:50%;font:inherit;cursor:pointer;transition:transform .12s ease,filter .12s ease}
      .active{color:var(--text-primary-color,var(--active-text-color));background:var(--primary-color)}
      a:focus,button:focus{outline:none}[aria-disabled=true]{cursor:default}ha-icon{--mdc-icon-size:26px}
      button{appearance:none;-webkit-appearance:none}
      .surface,.surface *{-webkit-tap-highlight-color:transparent}
      .overflow{position:fixed;z-index:1002;transform:translateX(-50%);width:68px;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:none}
      .nav,.nav *{-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;-webkit-user-drag:none}
      .refresh-feedback{position:fixed;z-index:1002;left:var(--marao-navbar-left,50%);bottom:calc(${bottom} + 72px);transform:translateX(-50%);box-sizing:border-box;width:max-content;max-width:var(--marao-navbar-width,calc(100vw - 24px));padding:12px 16px;border-radius:18px;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);box-shadow:0 8px 30px rgba(0,0,0,.22);font-size:var(--font-size-primary,1.125rem);font-weight:var(--font-weight-primary,500);line-height:1.35;overflow-wrap:anywhere;pointer-events:none}
      .refresh-feedback[hidden],progress[hidden]{display:none}progress{display:block;box-sizing:border-box;appearance:none;-webkit-appearance:none;width:100%;height:10px;margin-top:8px;border:1px solid var(--primary-text-color);border-radius:8px;overflow:hidden;background:var(--ha-card-background,var(--card-background-color));accent-color:var(--primary-text-color)}progress::-webkit-progress-bar{background:var(--ha-card-background,var(--card-background-color))}progress::-webkit-progress-value{background:var(--primary-text-color)}progress::-moz-progress-bar{background:var(--primary-text-color)}
      @media(prefers-reduced-motion:reduce){a,button{transition:none}}
    </style><div class="bounds" aria-hidden="true"></div><div class="refresh-feedback" role="status" hidden><span></span><progress max="1" hidden></progress></div><nav class="nav surface">${routes.slice(0, this._visibleCount).map((route, i) => this._link(route, i, true)).join('')}${overflow ? '<button type="button" data-overflow aria-expanded="false" aria-controls="marao-overflow"><ha-icon icon="mdi:dots-horizontal"></ha-icon></button>' : ''}</nav>`;
    const nav=this.shadowRoot.querySelector('.nav');
    this._press=bindPressFeedback(nav,{pointer:false,resolve:event=>this.preview||this._editing?null:pressTarget(nav,event)});
    this._refreshGesture = bindNavbarRefresh(nav, {
      feedback:this._press,
      eligible: () => this._refreshEligible(), haptic: () => haptic('heavy'),
      progress: value => this._refreshFeedback(value == null ? '' : 'hold', value), complete: target => this._completeRefreshHold(target),
    });
    this._bindLinks(this.shadowRoot.querySelector('.nav'));
    this.shadowRoot.querySelector('[data-overflow]')?.addEventListener('click', () => {
      if (this.preview || this._editing) return;
      haptic('heavy'); this._open ? this._closeOverflow(true) : this._openOverflow();
    });
    this._updateCurrent();
    if (this._observer) for (const selector of ['.bounds', '.nav']) this._observer.observe(this.shadowRoot.querySelector(selector));
    if (this.isConnected) this._layout();
  }
  _bindLinks(root) {
    root?.querySelectorAll('[data-route]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault(); if (this.preview || this._editing) return;
      const route = this._config.routes[Number(link.dataset.route)];
      const href = route.url || route.path, target = new URL(href, window.location.href);
      this._closeOverflow(target.pathname === window.location.pathname && Boolean(target.hash)); haptic('heavy'); navigate(href);
    }));
  }
  _refreshEligible(ownedDialog, target = this) {
    if (!this.isConnected || this.preview || this._root()?.lovelace?.editMode || this._refreshing || !target.getClientRects().length) return false;
    for (let node = target; node; node = node.parentElement || node.getRootNode()?.host) if (node.inert) return false;
    if (this._maintenance && this._maintenance.dialog !== ownedDialog) return false;
    if (findElements('dialog,ha-dialog,marao-popup-card').some(node => node !== ownedDialog
      && (node.localName === 'dialog' ? node.matches(':modal') : node.open || node._open))) return false;
    return true;
  }
  _completeRefreshHold(target) {
    if (!this._refreshEligible()) return;
    if (this._hass?.user?.is_admin) this._openMaintenance(target);
    else this._refreshFrontend();
  }
  _editorURL() {
    return this._config.dashboard_root && this._config.editor_path
      ? `/${encodeURIComponent(this._config.dashboard_root)}/${encodeURIComponent(this._config.editor_path)}` : '';
  }
  _maintenanceValid(session) {
    return this._maintenance === session && this._hass?.user?.is_admin
      && session.user === (this._hass.user.id || this._hass.user) && session.root === this._root()
      && session.path === window.location.href && session.editor === this._editorURL()
      && session.view === this._view() && session.host === this._navigationRecord?.host
      && !this._surface && !this._navigationRecord?.released && this._refreshEligible(session.dialog);
  }
  _openMaintenance(target) {
    if (!this._hass?.user?.is_admin || !this._refreshEligible()) return;
    this._closeOverflow(false); this._refreshFeedback('');
    const dialog = document.createElement('dialog');
    dialog.className = 'maintenance'; dialog.setAttribute('aria-labelledby', 'maintenance-title');
    dialog.innerHTML = `<style>${pressStyles}
      dialog.maintenance{position:fixed;inset:auto 0 0;margin:0 auto;box-sizing:border-box;width:calc(100% - ${safeArea("left")} - ${safeArea("right")});max-width:var(--marao-maintenance-width,480px);max-height:calc(100dvh - max(50px,${safeArea("top")}));padding:16px 12px ${navbarBottomGap()};border:0;border-radius:22px 22px 0 0;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);font:inherit;overflow:auto;overscroll-behavior:contain;pointer-events:auto;animation:maintenance-up .2s ease-out}
      dialog.maintenance::backdrop{background:rgba(0,0,0,.5)}
      .maintenance header{display:flex;align-items:center;gap:8px;margin-bottom:12px}.maintenance h2{flex:1;min-width:0;margin:0;font-size:var(--font-size-primary,1.25rem);line-height:1.35;overflow-wrap:anywhere}
      .maintenance button{display:flex;justify-content:center;align-items:center;width:100%;min-width:48px;min-height:48px;height:auto;aspect-ratio:auto;margin-top:8px;padding:12px 16px;border-radius:24px;background:var(--primary-color);color:var(--text-primary-color,var(--active-text-color));font:inherit;font-size:var(--font-size-primary,1.125rem);line-height:1.35;overflow-wrap:anywhere}
      .maintenance .close{flex:0 0 48px;width:48px;height:48px;margin:0;padding:0;border-radius:50%;font-size:1.5rem}
      @keyframes maintenance-up{from{transform:translateY(100%)}to{transform:translateY(0)}}@media(prefers-reduced-motion:reduce){dialog.maintenance{animation:none}}
    </style><header><h2 id="maintenance-title">${esc(localize('navigation.maintenance.title', this._hass))}</h2><button type="button" class="close" aria-label="${esc(localize('navigation.maintenance.close', this._hass))}">×</button></header>${this._editorURL() ? `<button type="button" data-edit>${esc(localize('navigation.edit', this._hass))}</button>` : ''}<button type="button" data-refresh>${esc(localize('navigation.refresh.action', this._hass))}</button>`;
    const session = this._maintenance = { dialog, user: this._hass.user.id || this._hass.user, root: this._root(),
      path: window.location.href, editor: this._editorURL(), view: this._view(), host: this._navigationRecord?.host,
      restore: focusRestorer(target || this.shadowRoot.querySelector('[aria-current=page],.nav button') || deepActiveElement()) };
    const select = action => {
      const valid = this._maintenanceValid(session);
      if (this._maintenance !== session) return;
      this._closeMaintenance(valid);
      if (!valid || !this._refreshEligible()) return;
      haptic('heavy');
      if (action === 'edit' && session.editor) navigate(session.editor);
      else if (action === 'refresh') this._refreshFrontend();
    };
    dialog.querySelector('[data-edit]')?.addEventListener('click', () => select('edit'));
    dialog.querySelector('[data-refresh]').addEventListener('click', () => select('refresh'));
    const dismiss = () => { if (this._maintenance === session) this._closeMaintenance(true); };
    dialog.querySelector('.close').addEventListener('click', () => { if (this._maintenance === session) { haptic('heavy'); dismiss(); } });
    dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
    dialog.addEventListener('close', dismiss);
    dialog.addEventListener('click', event => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dismiss();
    });
    session.check = () => { if (this._maintenance === session && !this._maintenanceValid(session)) this._closeMaintenance(false); };
    session.feedback=bindPressFeedback(dialog);
    session.listeners = new AbortController();
    document.addEventListener('focusin', session.check, {capture:true, signal:session.listeners.signal});
    this.shadowRoot.append(dialog);
    const view = findElements('hui-masonry-view,hui-sections-view', this._view())[0];
    const column = view?.shadowRoot?.querySelector('#columns > div:first-child, hui-section, .section');
    const width = column?.getBoundingClientRect().width;
    if (width > 0) dialog.style.setProperty('--marao-maintenance-width', `${Math.round(width)}px`);
    const style = document.body.style;
    session.overflow = [style.getPropertyValue('overflow'), style.getPropertyPriority('overflow')];
    style.setProperty('overflow', 'hidden');
    dialog.showModal();
  }
  _closeMaintenance(restore) {
    const session = this._maintenance; if (!session) return;
    this._maintenance = null;
    session.feedback?.destroy();session.listeners.abort();
    session.dialog.close(); session.dialog.remove();
    const style = document.body.style;
    if (style.getPropertyValue('overflow') === 'hidden') {
      if (session.overflow[0]) style.setProperty('overflow', ...session.overflow);
      else style.removeProperty('overflow');
    }
    if (restore) queueMicrotask(() => { if (this._refreshEligible()) session.restore(); });
  }
  _refreshFeedback(state, value) {
    this._refreshFeedbackState = state;
    const feedback = this.shadowRoot?.querySelector('.refresh-feedback'); if (!feedback) return;
    const messages = { hold: 'Hold to refresh frontend', refreshing: 'Refreshing frontend…', deferred: 'Dashboard refresh waiting until controls and edits are finished.', unsaved: 'Save or discard changes before refreshing.', offline: 'Cannot reach Home Assistant. Try again.', interrupted: 'Refresh interrupted. Try again.', failed: 'Refresh failed. Try again.' };
    feedback.hidden = !state;
    const key = messages[state] ? state : 'failed';
    const holdKey = this._hass?.user?.is_admin ? 'navigation.maintenance.hold' : 'navigation.refresh.hold';
    feedback.querySelector('span').textContent = state ? localize(state === 'hold' ? holdKey : `navigation.refresh.${key}`, this._hass, {}, messages[key]) : '';
    const bar = feedback.querySelector('progress'); bar.hidden = state !== 'hold';
    bar.setAttribute('aria-label', localize(holdKey, this._hass, {}, messages.hold));
    if (value != null) bar.value = value;
  }
  _refreshFrontend(target = this) {
    if (!this._refreshEligible(undefined, target)) { this._refreshFeedback(''); return; }
    this._refreshing = true; this._closeOverflow(false); this._updateCurrent();
    return refreshFrontend({
      isDirty: () => window.isDirtyState || [...(window.MaraoEditorPanels || [])].some(panel => panel._dirty || panel._busy) || findElements('marao-dashboard-panel').some(panel => panel._dirty),
      onStatus: state => this._refreshFeedback(state),
    }).catch(() => { /* The operation already renders its localized error. */ }).finally(() => { this._refreshing = false; this._updateCurrent(); });
  }
  _syncPageRefresh() {
    const view = this._view(), lovelace = this._root()?.lovelace;
    const showRefresh = this._config?.show_cache_reset !== false;
    const editorURL = this._hass?.user?.is_admin && this._config?.show_editor_button !== false ? this._editorURL() : '';
    if (!this.isConnected || this._surface || this.preview || this._editing || !showRefresh && !editorURL || lovelace?.editMode || !view
      || !navbarMainPage(lovelace?.config || lovelace?.rawConfig)) {
      this._pagePress?.destroy();this._pagePress=null;this._pageRefresh?.remove(); return;
    }
    if (!this._pageRefresh) {
      const row = this._pageRefresh = document.createElement('div');
      row.setAttribute('data-marao-page-refresh', '');
      // HA flexes every view child; keep the refresh row from absorbing spare height.
      row.attachShadow({ mode: 'open' }).innerHTML = `<style>${pressStyles}
        :host{display:flex;flex-direction:row!important;justify-content:flex-end;flex-wrap:wrap;gap:8px;box-sizing:border-box;width:100%;min-height:60px;min-width:0;flex:none!important;padding:12px 12px 0;font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif)}
        button{display:grid;place-items:center;box-sizing:border-box;min-width:48px;width:48px;height:48px;padding:0;border:0;border-radius:50%;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);box-shadow:var(--ha-card-box-shadow,0 1px 6px rgba(0,0,0,.12));cursor:pointer;appearance:none;-webkit-appearance:none;-webkit-tap-highlight-color:transparent}
        button:disabled{opacity:.5;cursor:default}button:focus{outline:none}button[hidden]{display:none}
      </style><button type="button" class="frontend-editor"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25M20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg></button><button type="button" class="frontend-refresh"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.5-2.6L20 7M4 17l2.4 2.6A7 7 0 0 0 17.9 17"/></svg></button>`;
      const current = () => row.parentNode === this._view() && !row.closest('[inert]') && navbarMainPage(this._root()?.lovelace?.config || this._root()?.lovelace?.rawConfig) && this._refreshEligible(undefined, row);
      row.shadowRoot.querySelector('.frontend-refresh').addEventListener('click', () => {
        if (!current() || this._config?.show_cache_reset === false) return;
        haptic('heavy'); this._refreshFrontend(row);
      });
      row.shadowRoot.querySelector('.frontend-editor').addEventListener('click', () => {
        if (!current() || !this._hass?.user?.is_admin || this._config?.show_editor_button === false) return;
        const url = this._editorURL(); if (url) { haptic('heavy'); navigate(url); }
      });
    }
    this._pagePress ||= bindPressFeedback(this._pageRefresh.shadowRoot);
    if (this._pageRefresh.parentNode !== view) view.prepend(this._pageRefresh);
    const editor = this._pageRefresh.shadowRoot.querySelector('.frontend-editor');
    editor.hidden = !editorURL; editor.disabled = Boolean(this._refreshing);
    editor.setAttribute('aria-label', localize('navigation.edit', this._hass));
    const refresh = this._pageRefresh.shadowRoot.querySelector('.frontend-refresh');
    refresh.hidden = !showRefresh;
    refresh.disabled = Boolean(this._refreshing);
    refresh.setAttribute('aria-label', localize(this._refreshing ? 'navigation.refresh.refreshing' : 'navigation.refresh.action', this._hass));
  }
  _updateCurrent() {
    if (!this.shadowRoot) return;
    const routes = this._config.routes || [], disabled = this.preview || this._editing;
    const current = route => route && navbarRouteCurrent(route);
    this._syncPageRefresh();
    this.shadowRoot.querySelector('.nav')?.setAttribute('aria-label', localize('navigation.label', this._hass, {}, 'Marao navigation'));
    this.shadowRoot.querySelectorAll('[data-route]').forEach(link => {
      const route = routes[Number(link.dataset.route)], active = current(route);
      link.classList.toggle('active', active); link.setAttribute('aria-disabled', String(Boolean(disabled))); link.tabIndex = disabled ? -1 : 0;
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      link.querySelector('ha-icon').setAttribute('icon', active ? route.icon_selected || route.icon || 'mdi:circle' : route.icon || route.icon_selected || 'mdi:circle-outline');
    });
    const toggle = this.shadowRoot.querySelector('[data-overflow]');
    if (toggle) {
      const selected = routes.slice(this._visibleCount).find(current);
      const label = this._open ? localize('navigation.close', this._hass, {}, 'Close additional destinations') : localize('navigation.more', this._hass, {}, 'More destinations');
      toggle.classList.toggle('active', Boolean(selected)); toggle.setAttribute('aria-label', selected ? `${label} · ${localize('navigation.current', this._hass, {name:selected.label}, `Current destination: ${selected.label}`)}` : label);
      toggle.disabled = Boolean(disabled); toggle.setAttribute('aria-expanded', String(Boolean(this._open)));
    }
  }
  _openOverflow() {
    if (this._open || this.preview || this._editing) return;
    const toggle = this.shadowRoot.querySelector('[data-overflow]'); if (!toggle) return;
    this._open = true;
    const menu = document.createElement('nav'); menu.id = 'marao-overflow'; menu.className = 'overflow surface';
    menu.setAttribute('aria-label', localize('navigation.open', this._hass, {}, 'Additional destinations'));
    menu.innerHTML = this._config.routes.slice(this._visibleCount).map((route, i) => this._link(route, i + this._visibleCount)).join('');
    this.shadowRoot.append(menu); this._overflowPress=bindPressFeedback(menu); this._bindLinks(menu); this._updateCurrent();
    const box = toggle.getBoundingClientRect();
    menu.style.left = `${box.left + box.width / 2}px`; menu.style.bottom = `${innerHeight - box.top + 8}px`;
    menu.style.maxHeight = `${Math.max(0, box.top - (this._safeTop || 0) - 8)}px`;
    const focus = menu.querySelector('[aria-current=page]') || menu.querySelector('a');
    focus?.focus({preventScroll:true}); if (focus) menu.scrollTop = focus.offsetTop - menu.clientHeight / 2 + 24;
    document.addEventListener('pointerdown', this._outside, true); document.addEventListener('keydown', this._key, true); document.addEventListener('focusin', this._focusOutside);
  }
  _closeOverflow(restore) {
    if (!this._open) return;
    this._overflowPress?.destroy();this._overflowPress=null;
    this._open = false; this.shadowRoot.querySelector('.overflow')?.remove(); this._updateCurrent();
    document.removeEventListener('pointerdown', this._outside, true); document.removeEventListener('keydown', this._key, true); document.removeEventListener('focusin', this._focusOutside);
    if (restore && this.isConnected) this.shadowRoot.querySelector('[data-overflow]')?.focus({preventScroll:true});
  }
  _key = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this._closeOverflow(true); } };
  _focusOutside = event => { if (!event.composedPath().includes(this)) this._closeOverflow(false); };
  _outside = event => {
    if (event.composedPath().includes(this)) return;
    event.preventDefault(); event.stopImmediatePropagation(); this._closeOverflow(false);
    const target = event.composedPath().find(node => node.matches?.(FOCUSABLE));
    if (target) target.focus({preventScroll:true}); else this.shadowRoot.querySelector('[data-overflow]')?.focus({preventScroll:true});
    this._dismissPointer = event.pointerId;
    document.addEventListener('click', this._dismissClick, true); document.addEventListener('pointerup', this._dismissEnd, true); document.addEventListener('pointercancel', this._dismissEnd, true); document.addEventListener('pointerdown', this._nextGesture, true); window.addEventListener('blur', this._nextGesture);
  };
  _dismissClick = event => { if (event.pointerId === this._dismissPointer) { event.preventDefault(); event.stopImmediatePropagation(); this._clearDismissGesture(); } };
  _nextGesture = () => this._clearDismissGesture();
  _dismissEnd = event => { if (event.type === 'pointercancel') this._clearDismissGesture(); else this._dismissTimer = setTimeout(() => this._clearDismissGesture(), 500); };
  _clearDismissGesture() {
    clearTimeout(this._dismissTimer); this._dismissPointer = null;
    document.removeEventListener('click', this._dismissClick, true); document.removeEventListener('pointerup', this._dismissEnd, true); document.removeEventListener('pointercancel', this._dismissEnd, true); document.removeEventListener('pointerdown', this._nextGesture, true); window.removeEventListener('blur', this._nextGesture);
  }
  getCardSize() { return 0; }
}

let cameraPreloader;
export function registerCameraPreloader(sync) {
  cameraPreloader = sync;
  for (const record of navigationRecords) if (!record.released) cameraPreloader(record);
}
const navigationRecords = new Set();
const navigationOwners = new WeakMap();
function configuredNavbar(root) {
  const config = root.lovelace?.config || root.lovelace?.rawConfig;
  if (!Array.isArray(config?.views)) return undefined;
  const path = window.location.pathname.split('/')[2];
  const view = path ? config.views.find((view, index) => String(view.path ?? index) === path)
    : config.views[root.lovelace?.current_view || 0];
  if (!view) return undefined;
  const find = value => {
    if (!value || typeof value !== 'object') return null;
    if (value.type === 'custom:marao-navbar-card') return value;
    for (const child of [...(Array.isArray(value.cards) ? value.cards : []), ...(Array.isArray(value.sections) ? value.sections : [])]) { const found = find(child); if (found) return found; }
    return null;
  };
  return find(view);
}
function copyNavigationTheme(host, surface) {
  if (!globalThis.getComputedStyle) return;
  const style = getComputedStyle(host);
  for (const key of ['--ha-card-background','--card-background-color','--primary-text-color','--primary-color','--text-primary-color','--icon-color','--active-text-color','--font-size-primary','--font-weight-primary','--primary-font-family']) {
    const value = style.getPropertyValue(key);
    if (value) setStyle(surface, key, value); else if (surface.style.getPropertyValue(key)) surface.style.removeProperty(key);
  }
}
function updateNavigation(record, config, host) {
  if (!record || record.released) return;
  const surface = record.surface;
  themeModule.applyTheme(record.root, host?._hass || surface._hass);
  if (host) { record.host = host; copyNavigationTheme(host, surface); }
  config = {...config, type:'custom:marao-navbar-card'};
  const identity = JSON.stringify(config);
  if (record.identity !== identity) { surface.setConfig(config); record.identity = identity; }
  surface.hass = host?._hass || record.root.hass || surface._hass;
}
function releaseNavigation(record) {
  if (!record || record.released) return;
  record.released = true; navigationRecords.delete(record); navigationOwners.delete(record.root);
  themeModule.releaseTheme(record.root);
  record.cameraPreload?.dispose(); record.observer?.disconnect(); cancelAnimationFrame(record.frame); record.surface.remove();
}
function syncNavigation(record) {
  if (!record || record.released) return;
  const {root, surface, host} = record;
  if (!root.isConnected || window.location.pathname.split('/')[1] !== record.dashboard) { releaseNavigation(record); return; }
  const view = root.shadowRoot.querySelector('#view');
  if (record.observer && record.view !== view) {
    record.observer.disconnect(); record.observer.observe(root.shadowRoot, {childList:true});
    if (view) record.observer.observe(view, {childList:true, subtree:true});
    record.view = view;
  }
  const config = configuredNavbar(root);
  if (config === null) { releaseNavigation(record); return; }
  surface.hidden = Boolean(root.lovelace?.editMode || host?.preview);
  if (config) {
    try { updateNavigation(record, config); if (surface.hasAttribute('data-configuration-error')) surface._refreshFeedback(''); surface.removeAttribute('data-configuration-error'); }
    catch (error) {
      if (surface.getAttribute('data-configuration-error') !== error.message) {
        surface.setAttribute('data-configuration-error', error.message); surface._refreshFeedback('');
        const feedback = surface.shadowRoot.querySelector('.refresh-feedback'); feedback.hidden = false; feedback.querySelector('span').textContent = error.message;
        console.error('Marao navbar configuration failed', error);
      }
    }
  }
}
function claimNavigation(host) {
  const root = ownerRoot(host); if (!root?.shadowRoot) return;
  host._hostPath = window.location.pathname;
  let record = navigationOwners.get(root);
  if (!record) {
    const surface = document.createElement('marao-navbar-card'); surface._isSurface = true;
    surface.setAttribute('data-marao-navigation-surface', ''); surface.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:1px;pointer-events:none;z-index:1001';
    record = {root, surface, dashboard:window.location.pathname.split('/')[1], host};
    surface._navigationRecord = record; navigationOwners.set(root, record); navigationRecords.add(record);
    updateNavigation(record, host._config, host); root.shadowRoot.prepend(surface);
    record.observer = new MutationObserver(() => {
      if (record.frame != null) return;
      record.frame = requestAnimationFrame(() => {
        record.frame = null;
        syncNavigation(record);
        if (!record.released) record.surface._scheduleLayout();
      });
    });
    record.observer.observe(root.shadowRoot, {childList:true});
    const view = root.shadowRoot.querySelector('#view'); if (view) record.observer.observe(view, {childList:true, subtree:true});
  } else updateNavigation(record, host._config, host);
  host._surface = record.surface;
  host._refreshGesture?.destroy(); host._observer?.disconnect();
  host._render(); syncNavigation(record);
}

export const fullscreenUsers = new Set();
export function maraoDashboardActive(pathname = window.location.pathname) {
  const root = String(pathname).split('/')[1];
  return [...fullscreenUsers].some(navbar=>navbar.isConnected && !navbar.preview && navbar._config?.dashboard_root === root);
}
function setStyle(node, property, value, priority = '') {
  if (node.style.getPropertyValue(property) !== value || node.style.getPropertyPriority(property) !== priority) node.style.setProperty(property, value, priority);
}
const fullscreenOriginals = new Map();
export function findElements(selector, root = document) {
  const found = [];
  const visit = (root) => {
    root?.querySelectorAll?.(selector).forEach((item) => found.push(item));
    root?.querySelectorAll?.("*").forEach((item) => { if (item.shadowRoot) visit(item.shadowRoot); });
  };
  visit(root);
  return found;
}

export const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export function focusableElements(root) {
  return findElements(FOCUSABLE, root).filter((element) => !element.hidden && element.getAttribute?.("aria-hidden") !== "true");
}
export function deepActiveElement() {
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
  const owned = new Map();
  const editorViews = new Set();
  const activeNavbars = new Set();
  for (const navbar of fullscreenUsers) {
    const nativeActive = navbar._config?.dashboard_root === window.location.pathname.split('/')[1];
    if (!navbar.isConnected || !nativeActive && !navbar.getClientRects().length) continue;
    navbar._syncContext?.();
    const active = nativeActive || navbar._config.routes.some((route) => {
      const path = new URL(route.url || route.path || "#", window.location.href).pathname;
      const root = `/${path.split("/")[1]}`;
      return root !== "/" && (window.location.pathname === root || window.location.pathname.startsWith(`${root}/`));
    });
    if (!active) continue;
    let root = navbar;
    while (root && root.localName !== "hui-root") root = root.parentElement || root.getRootNode()?.host;
    if (navbar.preview || root?.lovelace?.editMode) continue;
    activeNavbars.add(navbar);
    const view = root?.shadowRoot?.querySelector("#view");
    const pageFlow = navbarMainPage(root?.lovelace?.config || root?.lovelace?.rawConfig, window.location) ? ["flex-direction"] : [];
    for (const header of root?.shadowRoot?.querySelectorAll("app-header, ha-app-layout > header, .header") || []) owned.set(header, ["display"]);
    if (view) {
      owned.set(view, ["padding-top", "padding-right", "padding-left", "padding-bottom", "--marao-floor-plan-clearance", ...pageFlow]);
      if (navbar.localName === 'marao-dashboard-editor-card') editorViews.add(view);
    }
  }
  // Elastic scrolling moves viewport coordinates; keep page height tied to CSS geometry.
  const coveredBottom = Math.max(0, ...[...activeNavbars].map(navbar => {
    const nav = navbar.shadowRoot?.querySelector("nav"), height = nav?.getBoundingClientRect().height || 0;
    if (!height) return 0;
    const bottom = parseFloat(getComputedStyle(nav).bottom);
    return Number.isFinite(bottom) ? height + Math.max(0, bottom) : 0;
  }));
  for (const [node, original] of fullscreenOriginals) {
    const properties = owned.get(node) || [];
    for (const [property, { value, priority }] of Object.entries(original)) {
      if (properties.includes(property)) continue;
      if (value) node.style.setProperty(property, value, priority);
      else node.style.removeProperty(property);
      delete original[property];
    }
    if (!Object.keys(original).length) fullscreenOriginals.delete(node);
  }
  for (const [node, properties] of owned) {
    if (!fullscreenOriginals.has(node)) fullscreenOriginals.set(node, {});
    for (const property of properties) {
      if (!Object.hasOwn(fullscreenOriginals.get(node), property)) {
        fullscreenOriginals.get(node)[property] = {
        value: node.style.getPropertyValue(property), priority: node.style.getPropertyPriority(property),
        };
      }
    }
    for (const property of properties) {
      const original = fullscreenOriginals.get(node)[property];
      // The full-height editor has no navbar; clearance would scroll its toolbar offscreen.
      if (editorViews.has(node) && property === 'padding-bottom') { setStyle(node, property, '0px', 'important'); continue; }
      // Native top padding includes the hidden header and inset; retain only its ordinary spacing token.
      if (property === '--marao-floor-plan-clearance') { setStyle(node, property, `${coveredBottom + 12}px`); continue; }
      const normal = original.value || (["padding-top", "padding-bottom"].includes(property) ? `var(--view-container-${property}, 0px)` : "0px");
      const clearance = property === "padding-top"
        ? safeArea("top")
        : property === "padding-bottom"
        ? `calc(${coveredBottom ? `${coveredBottom}px` : `calc(60px + ${navbarBottomGap()})`} + 8px)`
        : safeArea(property.slice(8));
      setStyle(node, property, property === "display" ? "none" : property === "flex-direction" ? "column"
        : `max(${normal}, ${clearance})`, "important");
    }
  }
}
export function registerFullscreen(element) {
  fullscreenUsers.add(element);
  applyFullscreen();
  window.dispatchEvent(new Event('marao-dashboard-activity'));
  if (fullscreenUsers.size > 1) return;
  window.addEventListener("location-changed", applyFullscreen);
  window.addEventListener("popstate", applyFullscreen);
}
export function unregisterFullscreen(element) {
  fullscreenUsers.delete(element);
  applyFullscreen();
  window.dispatchEvent(new Event('marao-dashboard-activity'));
  if (fullscreenUsers.size) return;
  window.removeEventListener("location-changed", applyFullscreen);
  window.removeEventListener("popstate", applyFullscreen);
}


export function registerNavigation() {
  if (globalThis.customElements && !customElements.get('marao-navbar-card')) customElements.define('marao-navbar-card', MaraoNavbarCard);
}
registerNavigation();
