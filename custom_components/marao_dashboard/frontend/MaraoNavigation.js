const { bindNavbarRefresh, refreshFrontend } = await import(new URL(`./MaraoFrontendRefresh.js${new URL(import.meta.url).search}`, import.meta.url));
const { createFrontendUpdates } = await import(new URL(`./MaraoFrontendUpdates.js${new URL(import.meta.url).search}`, import.meta.url));
let frontendUpdates, activeServices = 0;
export function beginFrontendInteraction() {
  activeServices++;
  return () => {
    activeServices--;
    globalThis.window?.dispatchEvent?.(new Event('marao-interaction-settled'));
  };
}
function updateFrontendClient(hass) {
  if (!globalThis.window?.addEventListener || !hass?.connection?.subscribeMessage) return;
  frontendUpdates ||= createFrontendUpdates({
    loadedVersion: new URL(import.meta.url).searchParams.get('v'),
    context: () => {
      const dashboard = window.location.pathname.split('/')[1];
      const record = [...navigationRecords].find(item => !item.released && item.dashboard === dashboard);
      return { dashboard, active: Boolean(record?.root.isConnected && !record.surface.preview),
        get blocked() { return Boolean(activeServices || window.isDirtyState || record?.root.lovelace?.editMode
          || record?.surface._refreshing || record?.surface._open
          || findElements('marao-dashboard-panel').some(panel => panel._dirty || panel._busy)
          || findElements('marao-popup-card').some(popup => popup._open)); },
        status: state => {
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
    "navigation.invalid_entry": "Navigation entries require a destination and label",
    "navigation.invalid_native": "Native card configuration must be an object"
  },
  "pt": {
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
export function nativeDashboard(root) {
  return root?.lovelace?.config?.marao?.mode === 'native' || root?.lovelace?.rawConfig?.marao?.mode === 'native' || root?.lovelace?.rawConfig?.strategy?.type === 'custom:marao-starter';
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

export function navbarRouteCurrent(route, location = window.location) {
  try {
    const target = new URL(route.url || route.path, location.href);
    return target.origin === location.origin && target.pathname === location.pathname
      && (!target.hash || target.hash === location.hash) && (!target.search || target.search === location.search);
  } catch { return false; }
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
    if (!Array.isArray(routes)) throw new Error(localize("navigation.invalid_routes", this._hass));
    if (routes.some(route => !route || typeof route !== 'object' || Array.isArray(route)
      || typeof (route.url || route.path) !== 'string' || !(route.url || route.path).trim()
      || typeof route.label !== 'string' || !route.label.trim())) throw new Error(localize("navigation.invalid_entry", this._hass));
    this._closeOverflow(false);
    this._config = { ...config, routes }; this._render();
  }
  connectedCallback() {
    if (!this._isSurface && !this.preview && ownerRoot(this)) { claimNavigation(this); return; }
    registerFullscreen(this); this._render();
    this._observer = new ResizeObserver(this._scheduleLayout);
    for (const node of [this, this._view(), this.shadowRoot.querySelector('.bounds')]) if (node) this._observer.observe(node);
    for (const event of ['location-changed', 'popstate', 'hashchange']) window.addEventListener(event, this._locationChanged);
    window.addEventListener('resize', this._scheduleLayout);
    window.visualViewport?.addEventListener('resize', this._scheduleLayout);
    window.visualViewport?.addEventListener('scroll', this._scheduleLayout);
    this._layout();
  }
  get preview() { return Boolean(this._preview || this.nativeOwner?.preview); }
  set preview(value) {
    this._preview = Boolean(value);
    if (this._config && this._renderedPreview !== this.preview) { this._closeOverflow(false); this._render(); }
    applyFullscreen();
  }
  disconnectedCallback() {
    if (this._surface) { queueMicrotask(() => syncNavigation(this._surface._navigationRecord)); return; }
    if (this._navigationRecord && !this._navigationRecord.root.isConnected) releaseNavigation(this._navigationRecord);
    this._refreshGesture?.destroy();
    this._closeOverflow(false); this._clearDismissGesture(); this._observer?.disconnect(); cancelAnimationFrame(this._frame);
    for (const event of ['location-changed', 'popstate', 'hashchange']) window.removeEventListener(event, this._locationChanged);
    window.removeEventListener('resize', this._scheduleLayout);
    window.visualViewport?.removeEventListener('resize', this._scheduleLayout);
    window.visualViewport?.removeEventListener('scroll', this._scheduleLayout);
    unregisterFullscreen(this);
  }
  set hass(value) {
    this._hass = value;
    if (this._navigationRecord) cameraPreloader?.(this._navigationRecord);
    if (!this.preview) updateFrontendClient(value);
    if (this._surface && this._hostPath === window.location.pathname) { copyNavigationTheme(this, this._surface); this._surface.hass = value; }
    this._updateCurrent();
  }
  _root() {
    if (this._navigationRecord) return this._navigationRecord.root;
    let root = this;
    while (root && root.localName !== 'hui-root') root = root.parentElement || root.getRootNode()?.host;
    return root;
  }
  _view() { return this._root()?.shadowRoot?.querySelector('#view'); }
  _syncContext() {
    const editing = Boolean(this._root()?.lovelace?.editMode);
    if (editing !== this._editing) { this._editing = editing; this._refreshGesture?.cancel(); this._closeOverflow(false); this._updateCurrent(); }
  }
  _locationChanged = () => { if (this._navigationRecord) syncNavigation(this._navigationRecord); this._refreshGesture?.cancel(); this._closeOverflow(false); this._updateCurrent(); this._scheduleLayout(); };
  _scheduleLayout = () => {
    cancelAnimationFrame(this._frame);
    this._frame = requestAnimationFrame(() => { if (this.isConnected) this._layout(); });
  };
  _layout() {
    const nav = this.shadowRoot?.querySelector('.nav'), bounds = this.shadowRoot?.querySelector('.bounds');
    if (!this.isConnected || !nav || !bounds || !this.getClientRects().length) return;
    const safe = bounds.getBoundingClientRect(), host = (this.preview ? this : this._view())?.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = Math.max(safe.left, host?.left ?? safe.left, viewport?.offsetLeft || 0);
    const right = Math.min(safe.right, host?.right ?? safe.right, (viewport?.offsetLeft || 0) + (viewport?.width || innerWidth));
    const edit = this.nativeOwner?.shadowRoot?.querySelector('.native-edit')?.getBoundingClientRect();
    const top = Math.max(safe.top, this.preview ? 0 : host?.top || 0, viewport?.offsetTop || 0, edit ? edit.bottom + 8 : 0);
    const style = getComputedStyle(nav), size = nav.querySelector('a,button')?.getBoundingClientRect().width || 48;
    const gap = parseFloat(style.columnGap) || 0, padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const { slots } = navbarPartition(this._config.routes || [], right - left, size, gap, padding);
    const geometry = [left, right, top, safe.bottom, slots].map(value => Math.round(value * 2) / 2).join(':');
    if (this._geometry !== geometry) { this._refreshGesture?.cancel(); this._closeOverflow(false); }
    this._geometry = geometry; this._safeTop = top;
    this.style.setProperty('--marao-navbar-left', `${(left + right) / 2}px`);
    if (this.preview) this.style.setProperty('--marao-navbar-preview-left', `${(left + right) / 2 - host.left}px`);
    this.style.setProperty('--marao-navbar-width', `${Math.max(68, right - left)}px`);
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
    if (!this._isSurface && this._surface && !this.preview) {
      this.setAttribute('data-marao-navbar-placeholder', '');
      this.shadowRoot.innerHTML = '<style>:host{display:none}</style>';
      if (this._hostPath === window.location.pathname && this.isConnected) updateNavigation(this._surface._navigationRecord, this._config, this);
      return;
    }
    this.removeAttribute?.('data-marao-navbar-placeholder');
    this._refreshGesture?.destroy();
    this._observer?.unobserve(this.shadowRoot.querySelector('.bounds'));
    const routes = this._config.routes || [];
    this._visibleCount = routes.length > this._slots ? this._slots - 1 : routes.length;
    const overflow = routes.length > this._visibleCount;
    this.toggleAttribute?.('data-empty', !routes.length); this.toggleAttribute?.('data-preview', this.preview);
    this._renderedPreview = this.preview;
    const bottom = /iPhone|iPod/i.test(navigator.userAgent || '') ? `max(4px, calc(${safeArea("bottom")} - 20px))` : '12px';
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;height:128px;font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif)}
      :host([data-empty]){display:none}:host([data-preview]){height:auto}
      .frontend-refresh{position:fixed;top:max(12px,${safeArea("top")});right:max(12px,${safeArea("right")});z-index:1002;pointer-events:auto;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);box-shadow:var(--ha-card-box-shadow,0 1px 6px rgba(0,0,0,.12))}
      .frontend-refresh:disabled{opacity:.5;cursor:default}:host([data-preview]) .frontend-refresh{display:none}
      .bounds{position:fixed;visibility:hidden;pointer-events:none;inset:${safeArea("top")} calc(12px + ${safeArea("right")}) ${safeArea("bottom")} calc(12px + ${safeArea("left")})}
      .surface{pointer-events:auto;display:flex;gap:clamp(2px,.5vw,4px);box-sizing:border-box;padding:6px 10px;border-radius:999px;background:var(--ha-card-background,var(--card-background-color));box-shadow:0 8px 30px rgba(0,0,0,.22)}
      .nav{position:fixed;z-index:1001;left:var(--marao-navbar-left,50%);bottom:${bottom};transform:translateX(-50%);flex-wrap:nowrap;justify-content:center;width:max-content;max-width:var(--marao-navbar-width,calc(100vw - 24px - ${safeArea("left")} - ${safeArea("right")}));height:60px}
      :host([data-preview]) .nav{position:relative;left:var(--marao-navbar-preview-left,50%);bottom:auto;margin:12px 0}
      a,button{display:grid;place-items:center;box-sizing:border-box;flex:0 0 48px;min-width:48px;width:48px;height:48px;aspect-ratio:1 / 1;align-self:center;justify-self:center;padding:0;border:0;color:var(--icon-color,var(--primary-text-color));background:transparent;text-decoration:none;border-radius:50%;font:inherit;cursor:pointer;transition:transform .12s ease,filter .12s ease}
      a:active,button:active{transform:scale(.92);filter:brightness(.96)}.active{color:var(--text-primary-color,var(--active-text-color));background:var(--primary-color)}
      a:focus,button:focus{outline:none}[aria-disabled=true]{cursor:default}ha-icon{--mdc-icon-size:26px}
      button{appearance:none;-webkit-appearance:none}
      .surface,.surface *{-webkit-tap-highlight-color:transparent}
      .overflow{position:fixed;z-index:1002;transform:translateX(-50%);width:68px;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:none}
      .nav,.nav *{-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;-webkit-user-drag:none}
      .refresh-feedback{position:fixed;z-index:1002;left:var(--marao-navbar-left,50%);bottom:calc(${bottom} + 72px);transform:translateX(-50%);box-sizing:border-box;width:max-content;max-width:var(--marao-navbar-width,calc(100vw - 24px));padding:12px 16px;border-radius:18px;background:var(--ha-card-background,var(--card-background-color));color:var(--primary-text-color);box-shadow:0 8px 30px rgba(0,0,0,.22);font-size:var(--font-size-primary,1.125rem);font-weight:var(--font-weight-primary,500);line-height:1.35;overflow-wrap:anywhere;pointer-events:none}
      .refresh-feedback[hidden],progress[hidden]{display:none}progress{display:block;box-sizing:border-box;appearance:none;-webkit-appearance:none;width:100%;height:10px;margin-top:8px;border:1px solid var(--primary-text-color);border-radius:8px;overflow:hidden;background:var(--ha-card-background,var(--card-background-color));accent-color:var(--primary-text-color)}progress::-webkit-progress-bar{background:var(--ha-card-background,var(--card-background-color))}progress::-webkit-progress-value{background:var(--primary-text-color)}progress::-moz-progress-bar{background:var(--primary-text-color)}
      @media(prefers-reduced-motion:reduce){a,button{transition:none}}
    </style><button type="button" class="frontend-refresh"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.5-2.6L20 7M4 17l2.4 2.6A7 7 0 0 0 17.9 17"/></svg></button><div class="bounds" aria-hidden="true"></div><div class="refresh-feedback" role="status" hidden><span></span><progress max="1" hidden></progress></div><nav class="nav surface">${routes.slice(0, this._visibleCount).map((route, i) => this._link(route, i, true)).join('')}${overflow ? '<button type="button" data-overflow aria-expanded="false" aria-controls="marao-overflow"><ha-icon icon="mdi:dots-horizontal"></ha-icon></button>' : ''}</nav>`;
    this.shadowRoot.querySelector('.frontend-refresh').addEventListener('click', () => {
      if (!this._refreshEligible()) return;
      haptic('heavy'); this._refreshFrontend();
    });
    this._refreshGesture = bindNavbarRefresh(this.shadowRoot.querySelector('.nav'), {
      eligible: () => this._refreshEligible(), haptic: () => haptic('heavy'),
      progress: value => this._refreshFeedback(value == null ? '' : 'hold', value), complete: () => this._refreshFrontend(),
    });
    this._bindLinks(this.shadowRoot.querySelector('.nav'));
    this.shadowRoot.querySelector('[data-overflow]')?.addEventListener('click', () => {
      if (this.preview || this._editing) return;
      haptic('heavy'); this._open ? this._closeOverflow(true) : this._openOverflow();
    });
    this._updateCurrent();
    if (this._observer) this._observer.observe(this.shadowRoot.querySelector('.bounds'));
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
  _refreshEligible() {
    if (!this.isConnected || this.preview || this._root()?.lovelace?.editMode || this._refreshing || !this.getClientRects().length) return false;
    for (let node = this; node; node = node.parentElement || node.getRootNode()?.host) if (node.inert) return false;
    return true;
  }
  _refreshFeedback(state, value) {
    this._refreshFeedbackState = state;
    const feedback = this.shadowRoot?.querySelector('.refresh-feedback'); if (!feedback) return;
    const messages = { hold: 'Hold to refresh frontend', refreshing: 'Refreshing frontend…', deferred: 'Dashboard refresh waiting until controls and edits are finished.', unsaved: 'Save or discard changes before refreshing.', offline: 'Cannot reach Home Assistant. Try again.', interrupted: 'Refresh interrupted. Try again.', failed: 'Refresh failed. Try again.' };
    feedback.hidden = !state;
    const key = messages[state] ? state : 'failed';
    feedback.querySelector('span').textContent = state ? localize(`navigation.refresh.${key}`, this._hass, {}, messages[key]) : '';
    const bar = feedback.querySelector('progress'); bar.hidden = state !== 'hold';
    bar.setAttribute('aria-label', localize('navigation.refresh.hold', this._hass, {}, messages.hold));
    if (value != null) bar.value = value;
  }
  _refreshFrontend() {
    if (!this._refreshEligible()) { this._refreshFeedback(''); return; }
    this._refreshing = true; this._closeOverflow(false); this._updateCurrent();
    return refreshFrontend({
      isDirty: () => window.isDirtyState || findElements('marao-dashboard-panel').some(panel => panel._dirty),
      onStatus: state => this._refreshFeedback(state),
    }).catch(() => { /* The operation already renders its localized error. */ }).finally(() => { this._refreshing = false; this._updateCurrent(); });
  }
  _updateCurrent() {
    if (!this.shadowRoot) return;
    const routes = this._config.routes || [], disabled = this.preview || this._editing;
    const current = route => route && navbarRouteCurrent(route);
    const refresh = this.shadowRoot.querySelector('.frontend-refresh');
    if (refresh) {
      refresh.disabled = Boolean(disabled || this._refreshing);
      refresh.setAttribute('aria-label', localize(this._refreshing ? 'navigation.refresh.refreshing' : 'navigation.refresh.action', this._hass));
    }
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
    this.shadowRoot.append(menu); this._bindLinks(menu); this._updateCurrent();
    const box = toggle.getBoundingClientRect();
    menu.style.left = `${box.left + box.width / 2}px`; menu.style.bottom = `${innerHeight - box.top + 8}px`;
    menu.style.maxHeight = `${Math.max(0, box.top - (this._safeTop || 0) - 8)}px`;
    const focus = menu.querySelector('[aria-current=page]') || menu.querySelector('a');
    focus?.focus({preventScroll:true}); if (focus) menu.scrollTop = focus.offsetTop - menu.clientHeight / 2 + 24;
    document.addEventListener('pointerdown', this._outside, true); document.addEventListener('keydown', this._key, true); document.addEventListener('focusin', this._focusOutside);
  }
  _closeOverflow(restore) {
    if (!this._open) return;
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
    if (['custom:marao-navbar-card', 'custom:marao-native-navbar-card'].includes(value.type)) return value;
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
    if (value) surface.style.setProperty(key, value); else surface.style.removeProperty(key);
  }
}
function updateNavigation(record, config, host) {
  if (!record || record.released) return;
  const surface = record.surface;
  if (host) { record.host = host; surface.nativeHost = host.nativeHost; surface.nativeOwner = host.nativeOwner; copyNavigationTheme(host, surface); }
  config = {...config, type:'custom:marao-navbar-card'};
  const identity = JSON.stringify(config);
  if (record.identity !== identity) { surface.setConfig(config); record.identity = identity; }
  surface.hass = host?._hass || record.root.hass || surface._hass;
}
function releaseNavigation(record) {
  if (!record || record.released) return;
  record.released = true; navigationRecords.delete(record); navigationOwners.delete(record.root);
  record.cameraPreload?.dispose(); record.observer?.disconnect(); record.surface.remove();
}
function syncNavigation(record) {
  if (!record || record.released) return;
  const {root, surface, host} = record;
  if (!root.isConnected || window.location.pathname.split('/')[1] !== record.dashboard) { releaseNavigation(record); return; }
  if (record.standalone && !host?.isConnected && window.location.pathname === host?._hostPath) { releaseNavigation(record); return; }
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
    record = {root, surface, dashboard:window.location.pathname.split('/')[1], host,
      standalone:Boolean(host.nativeHost && !nativeDashboard(root))};
    surface._navigationRecord = record; navigationOwners.set(root, record); navigationRecords.add(record);
    updateNavigation(record, host._config, host); root.shadowRoot.prepend(surface);
    record.observer = new MutationObserver(() => syncNavigation(record));
    record.observer.observe(root.shadowRoot, {childList:true});
    const view = root.shadowRoot.querySelector('#view'); if (view) record.observer.observe(view, {childList:true, subtree:true});
  } else updateNavigation(record, host._config, host);
  host._surface = record.surface;
  host._refreshGesture?.destroy(); host._observer?.disconnect();
  host._render(); syncNavigation(record);
}

export const fullscreenUsers = new Set();
let fullscreenTimer;
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
  const activeNavbars = new Set();
  for (const navbar of fullscreenUsers) {
    if (!navbar.isConnected || !navbar.getClientRects().length) continue;
    navbar._syncContext?.();
    const active = navbar._config.routes.some((route) => {
      const path = new URL(route.url || route.path || "#", window.location.href).pathname;
      const root = `/${path.split("/")[1]}`;
      return root !== "/" && (window.location.pathname === root || window.location.pathname.startsWith(`${root}/`));
    });
    if (!active) continue;
    let root = navbar;
    while (root && root.localName !== "hui-root") root = root.parentElement || root.getRootNode()?.host;
    if (navbar.preview || root?.lovelace?.editMode) continue;
    const nativeDashboard = root?.lovelace?.config?.marao?.mode === "native" || root?.lovelace?.rawConfig?.marao?.mode === "native"
      || root?.lovelace?.rawConfig?.strategy?.type === "custom:marao-starter";
    activeNavbars.add(navbar);
    const view = root?.shadowRoot?.querySelector("#view");
    if (navbar.nativeHost && !nativeDashboard) {
      // An individually added floating navbar needs room at the bottom while
      // retaining the ordinary Home Assistant toolbar and view shell.
      if (view && !owned.has(view)) owned.set(view, ["padding-bottom"]);
      continue;
    }
    for (const header of root?.shadowRoot?.querySelectorAll("app-header, ha-app-layout > header, .header") || []) owned.set(header, ["display"]);
    if (view) owned.set(view, ["padding-top", "padding-right", "padding-left", "padding-bottom"]);
  }
  // Include the actual floating offset, including mobile viewport changes.
  const viewportBottom = window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : window.innerHeight;
  const coveredBottom = Math.max(0, ...[...activeNavbars].map(navbar => {
    const rect = navbar.shadowRoot?.querySelector("nav")?.getBoundingClientRect();
    return rect && Number.isFinite(viewportBottom) ? viewportBottom - rect.top : 0;
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
      // Native top padding includes the hidden header and inset; retain only its ordinary spacing token.
      const normal = original.value || (["padding-top", "padding-bottom"].includes(property) ? `var(--view-container-${property}, 0px)` : "0px");
      const clearance = property === "padding-top"
        ? `calc(60px + ${safeArea("top")})`
        : property === "padding-bottom"
        ? `calc(max(${coveredBottom}px, calc(${Math.max(60, ...[...activeNavbars].map(navbar => navbar.shadowRoot?.querySelector("nav")?.getBoundingClientRect().height || 0))}px + ${safeArea("bottom")} + 12px)) + 48px)`
        : safeArea(property.slice(8));
      node.style.setProperty(property, property === "display" ? "none"
        : `max(${normal}, ${clearance})`, "important");
    }
  }
}
function registerFullscreen(element) {
  fullscreenUsers.add(element);
  applyFullscreen();
  if (fullscreenTimer !== undefined) return;
  fullscreenTimer = setInterval(() => { for (const record of navigationRecords) syncNavigation(record); applyFullscreen(); }, 1000);
  window.addEventListener("location-changed", applyFullscreen);
  window.addEventListener("popstate", applyFullscreen);
}
function unregisterFullscreen(element) {
  fullscreenUsers.delete(element);
  applyFullscreen();
  if (fullscreenUsers.size) return;
  clearInterval(fullscreenTimer);
  fullscreenTimer = undefined;
  window.removeEventListener("location-changed", applyFullscreen);
  window.removeEventListener("popstate", applyFullscreen);
}


export function registerNavigation() {
  if (globalThis.customElements && !customElements.get('marao-navbar-card')) customElements.define('marao-navbar-card', MaraoNavbarCard);
}
registerNavigation();
