import { bindCardDrag } from "./editor-drag.js";
import "./panel.css";
import { cameraTitleFields, formData, patchForm, same as sameFormValue } from "./native-model.js";

import {
  cardForEntity,
  addPageSection,
  clone,
  createPage,
  deletePage,
  duplicatePage,
  configuredEntityIds,
  entityCandidates,
  entityGroupMemberCompatible,
  entityMeta,
  flattenEntities,
  importAreaRoom,
  mergeEntityValues,
  moveItem,
  movePageCard,
  newEntityGroupId,
  normalizeConfig,
  pageContainers,
  roomPageTemplate,
  pageReferences,
  pinPage,
  preserveEntityValue,
  renamePage,
  serializeConfig,
  slugify,
  validateConfig,
} from "./editor-model.js";

const PANEL_ASSET_VERSION = new URL(import.meta.url).search;
const PANEL_CSS = new URL(`./MaraoDashboardPanel.css${PANEL_ASSET_VERSION}`, import.meta.url).href;
const BRAND_MARK = new URL(`./brand/mark.svg${PANEL_ASSET_VERSION}`, import.meta.url).href;
const BRAND_MARK_DARK = new URL(`./brand/mark-dark.svg${PANEL_ASSET_VERSION}`, import.meta.url).href;

const TEXT = {
  en: {
    editorTitle: "Marao Dashboard Editor", loading: "Loading your dashboard…", loadingJson: "Loading JSON editor…", retry: "Retry", loadFailed: "Could not load your dashboard: ", jsonFailed: "Could not load the JSON editor: ", jsonStylesFailed: "JSON styles could not load.", jsonWorkerFailed: "JSON worker could not load.",
    subtitle: "Configure pages and cards.", visual: "Visual", json: "JSON",
    save: "Save & Generate", discard: "Discard changes", history: "History", open: "Open dashboard",
    navigation: "Navigation bar", addNavPage: "Add page", general: "General", overview: "Overview", rooms: "Rooms", pages: "Pages", addRoom: "Add room", addCustomPage: "Add custom page",
    addCard: "Add card", noCards: "No cards yet.", dirty: "Unsaved changes", clean: "Saved",
    format: "Format JSON", collapse: "Collapse region", expand: "Expand region", advanced: "Advanced options", restore: "Restore", cancel: "Cancel", more: "More actions",
    jsonIconsFailed: 'JSON icons could not load.',
    create: "Create", update: "Update", delete: "Delete", duplicate: "Duplicate",
    edit: "Edit", add: "Add", chooseCard: "Choose a Marao card",
    byType: "By card type", byEntity: "By entity", searchEntities: "Search by name or entity ID",
    suggestions: "Suggested for this room", metadataLoading: "Loading current entities…", metadataFailed: "Could not load current entities. ",
    unknown: "Unknown", unavailable: "Unavailable",
    noArea: "Choose a suggestion area in Edit page, or search all entities.", missingArea: "This suggestion area is no longer available. Search all entities or choose another area.",
    noSuggestions: "No new compatible entities in this area.", noResults: "No compatible entities match your search.", globalSearch: "Search entities from any room.", alreadyAdded: "Already added",
    labelsFailed: "Could not load editor translations. ", restoreConfirm: "Restore this version? Unsaved changes will be lost.", historyLoading: "Loading history…", historyEmpty: "No generated versions yet.", historyFailed: "Could not load history. ", saving: "Generating dashboard…",
    pendingConversion: "The saved dashboard is ready to convert. Save & Generate keeps the prior version in History.",
  },
  pt: {
    editorTitle: "Editor do Marao Dashboard", loading: "A carregar o seu dashboard…", loadingJson: "A carregar o editor JSON…", retry: "Tentar novamente", loadFailed: "Não foi possível carregar o dashboard: ", jsonFailed: "Não foi possível carregar o editor JSON: ", jsonStylesFailed: "Não foi possível carregar os estilos do editor JSON.", jsonWorkerFailed: "Não foi possível carregar o processo do editor JSON.",
    subtitle: "Configure páginas e cartões.", visual: "Visual", json: "JSON",
    save: "Guardar e gerar", discard: "Descartar alterações", history: "Histórico", open: "Abrir dashboard",
    navigation: "Barra de navegação", addNavPage: "Adicionar página", general: "Geral", overview: "Resumo", rooms: "Divisões", pages: "Páginas", addRoom: "Adicionar divisão", addCustomPage: "Adicionar página personalizada",
    addCard: "Adicionar cartão", noCards: "Ainda não existem cartões.", dirty: "Alterações por guardar", clean: "Guardado",
    format: "Formatar JSON", collapse: "Recolher região", expand: "Expandir região", advanced: "Opções avançadas", restore: "Restaurar", cancel: "Cancelar", more: "Mais ações",
    jsonIconsFailed: 'Não foi possível carregar os ícones JSON.',
    create: "Criar", update: "Atualizar", delete: "Eliminar", duplicate: "Duplicar",
    edit: "Editar", add: "Adicionar", chooseCard: "Escolha um cartão Marao",
    byType: "Por tipo de cartão", byEntity: "Por entidade", searchEntities: "Pesquisar por nome ou ID da entidade",
    suggestions: "Sugestões para esta divisão", metadataLoading: "A carregar as entidades atuais…", metadataFailed: "Não foi possível carregar as entidades atuais. ",
    unknown: "Desconhecida", unavailable: "Indisponível",
    noArea: "Escolha uma área para sugestões em Editar página ou pesquise todas as entidades.", missingArea: "Esta área para sugestões já não está disponível. Pesquise todas as entidades ou escolha outra área.",
    noSuggestions: "Não existem novas entidades compatíveis nesta área.", noResults: "Nenhuma entidade compatível corresponde à pesquisa.", globalSearch: "Pesquise entidades de qualquer divisão.", alreadyAdded: "Já adicionada",
    labelsFailed: "Não foi possível carregar as traduções do editor. ", restoreConfirm: "Restaurar esta versão? As alterações por guardar serão perdidas.", historyLoading: "A carregar o histórico…", historyEmpty: "Ainda não existem versões geradas.", historyFailed: "Não foi possível carregar o histórico. ", saving: "A gerar o dashboard…",
    pendingConversion: "O dashboard guardado está pronto para conversão. Guardar e gerar mantém a versão anterior no Histórico.",
  },
};



const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

class MaraoDashboardPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._loaded = false;
    this._loadAttempted = false;
    this._lifecycle = 0;
    this._requestedTab = "visual";
    this._jsonAttempt = 0;
    this._documentEpoch = 0;
    this._historyEpoch = 0;
    this._preparationStages = [];
    this._busy = false;
    this._dirty = false;
    this._tab = "visual";
    this._expandedSections = { rooms: true, pages: true };
    this._collapsedRooms = new Set();
    this._openPages = new Set();
    this._pageEntries = new Map();
  }

  set hass(value) {
    this._hass = value;
    const mark = this.shadowRoot.querySelector(".brand-mark");
    if (mark) mark.src = value?.themes?.darkMode ? BRAND_MARK_DARK : BRAND_MARK;
    if (this._monaco) this._setMonacoTheme();
    if (this.isConnected && this._loaded && !this._labelModule && String(value?.language || '').toLowerCase().startsWith('pt')) {
      this._ensureLabels().then(() => { if (this.isConnected && this._tab === 'visual') this._renderVisual(); }).catch(error => { this._retryKind = 'labels'; this._setStatus(this._t('labelsFailed') + this._error(error), 'error'); });
    }
    if (this.isConnected && !this._loaded && !this._loadAttempted) this._load();
  }

  set panel(value) { this._panel = value; }

  connectedCallback() {
    this._renderShell();
    this._headerResize = new ResizeObserver(([entry]) => {
      this.style.setProperty("--editor-header-height", `${entry.target.getBoundingClientRect().height}px`);
    });
    this._headerResize.observe(this.shadowRoot.querySelector(".editor-header"));
    this._activityEvents = new AbortController();
    const options = { capture: true, passive: true, signal: this._activityEvents.signal };
    this.addEventListener('pointerdown', () => { this._interacting = true; }, options);
    for (const event of ['pointerup', 'pointercancel', 'keyup', 'change', 'focusout']) this.addEventListener(event, () => {
      this._interacting = false; this._resumeJsonPreparation();
    }, options);
    this.addEventListener('keydown', () => { this._interacting = true; }, options);
    this.addEventListener('scroll', () => { this._scrolling = true; }, options);
    this.addEventListener('scrollend', () => { this._scrolling = false; this._resumeJsonPreparation(); }, options);
    document.addEventListener('visibilitychange', () => this._resumeJsonPreparation(), options);
    if (this._hass && !this._loaded && !this._loadAttempted) this._load();
    this._cardDrag = bindCardDrag(this.shadowRoot, {
      sourceFor: row => this._cardSource(row.dataset.kind, row.dataset.room, Number(row.dataset.cardDrag)),
      commit: (source, section, boundary) => this._commitCardMove(source, section, boundary),
      header: () => this.shadowRoot.querySelector(".editor-header").getBoundingClientRect(),
      label: () => this._l("Drop here"), haptic: () => this._moveHaptic(),
    });
    if (this._loaded && !this.shadowRoot.getElementById("visual-view").firstElementChild) this._renderVisual();
    if (this._loaded) {
      this._nativeVisualReady().then(() => {
        if (!this.isConnected) return;
        if (this._requestedTab === 'json') this._switchTab('json'); else this._startJsonPreparation();
      }).catch(error => this._setStatus(this._error(error), 'error'));
    }
  }

  disconnectedCallback() {
    this._cardDrag?.dispose(); this._cardDrag = null;
    this._headerResize?.disconnect();
    this._lifecycle += 1;
    this._activityEvents?.abort();
    this._cancelIdleStage?.();
    this._interacting = false; this._scrolling = false;
    this._jsonPreparing = null; this._jsonLoading = null; this._jsonForeground = false;
    this._contextRequest = null; this._metadataLoading = null; this._historyLoading = null;
    this._jsonCancel?.();
    this._jsonEvents?.abort();
    if (this._monaco) this._jsonDraft = this._monaco.getValue();
    this._jsonAssistance?.dispose(); this._jsonAssistance = null;
    this._monaco?.getModel()?.dispose(); this._monaco?.dispose(); this._monaco = null;
    this._busy = false;
    if (!this._loaded) this._loadAttempted = false;
  }

  _t(key) {
    const language = String(this._hass?.language || "en").toLowerCase().split("-")[0];
    return (TEXT[language] || TEXT.en)[key] || TEXT.en[key] || key;
  }

  _l(label) {
    const language = String(this._hass?.language || "en").toLowerCase().split("-")[0];
    const { PT_LABELS = {}, MOVE_PT_LABELS = {} } = this._labelModule || {};
    return language === "pt" ? MOVE_PT_LABELS[label] || PT_LABELS[label] || PT_LABELS[label + '.']?.replace(/\.$/, '') || label : label;
  }

  _ensureLabels(retry = false) {
    if (!String(this._hass?.language || '').toLowerCase().startsWith('pt') || this._labelModule) return Promise.resolve();
    if (this._labelsLoading) return this._labelsLoading;
    if (this._labelsError && !retry) return Promise.reject(this._labelsError);
    const url = new URL(this._jsonUrl('MaraoDashboardEditorLabels.js'));
    if (retry) url.searchParams.set('retry', String(this._labelsAttempt = (this._labelsAttempt || 0) + 1));
    const loading = import(url.href).then(module => { this._labelModule = module; this._labelsError = null; }).catch(error => { this._labelsError = error; throw error; });
    this._labelsLoading = loading;
    loading.finally(() => { if (this._labelsLoading === loading) this._labelsLoading = null; }).catch(() => {});
    return loading;
  }

  _renderShell() {
    if (this.shadowRoot.innerHTML) return;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${PANEL_CSS}">
      <main class="page">
        <header class="editor-header">
        <div class="toolbar">
          <div class="title"><img class="brand-mark" src="${this._hass?.themes?.darkMode ? BRAND_MARK_DARK : BRAND_MARK}" alt="" aria-hidden="true" width="32" height="32"><h1>${this._t("editorTitle")}</h1></div>
          <span id="dirty" class="dirty"></span>
          <div class="actions">
            <ha-button id="save" appearance="filled">${this._t("save")}</ha-button>
            <details class="secondary-actions">
              <summary aria-label="${this._t("more")}"><ha-icon icon="mdi:dots-vertical"></ha-icon></summary>
              <div class="secondary-menu">
            <ha-button id="history">${this._t("history")}</ha-button>
            <ha-button id="discard">${this._t("discard")}</ha-button>
            <a id="open-dashboard" href="#" target="_blank" rel="noopener">${this._t("open")}</a>
              </div>
            </details>
          </div>
        </div>
        <div class="tabs" role="tablist">
          <button class="tab" data-tab="visual" role="tab" aria-selected="true">${this._t("visual")}</button>
          <button class="tab" data-tab="json" role="tab" aria-selected="false">${this._t("json")}</button>
        </div>
        <div id="load-feedback" class="load-feedback" hidden><span role="status"></span></div>
        </header>
        <section id="visual-view" class="view"></section>
        <section id="json-view" class="view" hidden>
          <div class="json-shell"><div id="monaco"></div></div>
        </section>
        <div id="status" class="status" role="status">${this._t("loading")}</div>
        <ha-button id="retry" hidden>${this._t("retry")}</ha-button>
      </main>`;
    this.shadowRoot.addEventListener("focusin", (event) => {
      const path = event.composedPath(); const target = path[0];
      const pressed = this._pressedPath?.includes(target); this._pressedPath = null;
      if (!path.includes(this.shadowRoot.getElementById("visual-view"))) return;
      // Moving a pressed button before pointerup cancels its native click.
      if (pressed && target.localName === "button") return;
      // Native field reveal otherwise considers content behind the sticky header visible.
      target.style.scrollMarginTop = "calc(var(--editor-header-height,150px) + 12px)";
      const bounds = target.getBoundingClientRect();
      if (bounds.top < this.shadowRoot.querySelector(".editor-header").getBoundingClientRect().bottom + 8 || bounds.bottom > innerHeight) target.scrollIntoView({ block: "start", behavior: "instant" });
    });
    this.shadowRoot.querySelectorAll("[data-tab]").forEach((tab) =>
      tab.addEventListener("click", () => this._switchTab(tab.dataset.tab)));
    this.shadowRoot.getElementById("retry").addEventListener("click", () => {
      if (this._retryKind === 'json') { this._jsonFailure = null; this._contextError = null; this._retryKind = null; this._ensureMonaco().then(() => { if (this._requestedTab === 'json') this._switchTab('json'); }).catch(() => {}); }
      else if (this._retryKind === 'labels') { this._ensureLabels(true).then(() => { this._retryKind = null; this._renderVisual(); this._setStatus('', ''); }).catch(error => this._setStatus(this._t('labelsFailed') + this._error(error), 'error')); }
      else if (this._retryKind === 'context') { this._contextError = null; this._retryKind = null; this._ensureEditorContext(true).then(() => { this._setStatus('', ''); this._refreshPages(new Set(this._model.pages.flatMap(pageContainers))); this._resumeJsonPreparation(); }).catch(error => this._contextFailure(error)); }
      else this._load(true);
    });
    this.shadowRoot.getElementById("open-dashboard").addEventListener("click", (event) => {
      if (!this._loaded || this._busy) event.preventDefault();
    });
    this._updateHeader();
    this.shadowRoot.getElementById("save").addEventListener("click", () => this._save());
    this.shadowRoot.getElementById("discard").addEventListener("click", () => this._discard());
    this.shadowRoot.getElementById("history").addEventListener("click", () => this._openHistory());
    this.shadowRoot.querySelector(".secondary-menu").addEventListener("click", () => {
      this.shadowRoot.querySelector(".secondary-actions").open = false;
      this.shadowRoot.querySelector(".secondary-actions summary").focus();
    });
    this.shadowRoot.addEventListener("pointerdown", (event) => {
      this._pressedPath = event.composedPath();
      const menu = this.shadowRoot.querySelector(".secondary-actions");
      if (!event.composedPath().includes(menu)) menu.open = false;
    });
    this.shadowRoot.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.shadowRoot.querySelector(".secondary-actions").open = false;
    });
    this.shadowRoot.addEventListener('click', event => this._iconActionHaptic(event), { capture: true });
  }

  _load(force = false) {
    if (this._loading) return this._loading;
    if (!this._hass || this._busy || !this.isConnected) return;
    const lifecycle = this._lifecycle;
    const previousModel = this._model;
    const previouslyLoaded = this._loaded;
    const retained = Object.fromEntries(['_catalog', '_entities', '_areas', '_displayEntityIds', '_contextReady', '_contextError', '_contextPayload', '_history', '_historyLoaded', '_pageTemplates', '_savedSource', '_jsonDraft', '_dirty', '_dashboardUrl', '_visualReady'].map(key => [key, this[key]]));
    this._loadAttempted = true;
    this._retryKind = null;
    this._setBusy(true); this._setStatus(this._t("loading"), "");
    this._loading = Promise.resolve().then(async () => {
      try {
        const [payload] = await Promise.all([this._hass.callWS({ type: "marao_dashboard/config/get", scope: "initial" }), this._ensureLabels(force)]);
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        const model = normalizeConfig(JSON.parse(payload.config));
        this._catalog = payload.editor.catalog; this._entities = payload.editor.entities;
        this._areas = payload.editor.areas || [];
        this._displayEntityIds = new Set(payload.editor.display_entity_ids || payload.editor.entities.map(entity => entity.entity_id));
        this._contextReady = !payload.editor.display_entity_ids;
        this._contextError = null; this._contextRequest = null; this._contextPayload = null; this._metadataLoading = null;
        this._documentEpoch++; this._historyEpoch++;
        this._history = payload.history ?? this._history; this._historyLoaded = Array.isArray(this._history);
        this._model = model; this._loaded = true;
        this._visualReady = false;
        this._renderVisual();
        this._savedSource = this._source(); this._jsonDraft = null; this._dirty = false;
        this.shadowRoot.getElementById("open-dashboard").href = payload.dashboard_url;
        this._dashboardUrl = payload.dashboard_url;
        this._pageTemplates = payload.page_templates;
        if (this._monaco) this._setEditorSource(this._savedSource);
        await this._nativeVisualReady();
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        this._setStatus(payload.conversion_pending ? this._t("pendingConversion") : force ? this._t("clean") : "", "success");
      } catch (error) {
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        this._model = previousModel; this._loaded = previouslyLoaded;
        Object.assign(this, retained); this._documentEpoch++; this._historyEpoch++;
        this._contextRequest = null; this._metadataLoading = null;
        if (previouslyLoaded) this._renderVisual(); else this.shadowRoot.getElementById('visual-view').replaceChildren?.();
        if (this._monaco && previousModel) this._setEditorSource(this._jsonDraft ?? this._source());
        this._retryKind = "config";
        this._setStatus(this._t("loadFailed") + this._error(error), "error");
      } finally {
        this._loading = null;
        if (this.isConnected && lifecycle === this._lifecycle) { this._setBusy(false); if (this._loaded) this._startJsonPreparation(); }
        else if (this.isConnected && !this._loaded && !this._loadAttempted) this._load();
      }
    });
    return this._loading;
  }

  _source() { return `${JSON.stringify(serializeConfig(this._model), null, 2)}\n`; }

  _setDirty() {
    this._cardDrag?.cancel(); this._revision = (this._revision || 0) + 1;
    if (this._tab === "visual") this._jsonDraft = null;
    this._dirty = this._source() !== this._savedSource;
    this._updateHeader();
  }

  _updateHeader() {
    const root = this.shadowRoot;
    const feedback = root.getElementById("load-feedback");
    const message = this._jsonLoading && this._requestedTab === "json" ? this._t("loadingJson") : this._retryKind === "json" ? this._t("jsonFailed") : this._loaded && this._retryKind === "config" ? this._t("loadFailed") : "";
    feedback.hidden = !message;
    feedback.querySelector("span").textContent = message.replace(/:\s*$/, "");
    const retry = root.getElementById("retry");
    const parent = message ? feedback : root.querySelector(".page");
    if (retry.parentElement !== parent) parent.append(retry);
    root.getElementById("dirty").textContent = this._dirty ? this._t("dirty") : "";
    root.querySelector(".title h1").textContent = this._t("editorTitle");
    root.querySelector(".secondary-actions summary").setAttribute("aria-label", this._t("more"));
    for (const [id, key] of [["save", "save"], ["discard", "discard"], ["history", "history"], ["open-dashboard", "open"], ["retry", "retry"]]) root.getElementById(id).textContent = this._t(key);
    root.getElementById("save").disabled = this._busy || !this._loaded;
    root.getElementById("discard").disabled = this._busy || !this._dirty;
    root.getElementById("history").disabled = this._busy || !this._loaded;
    root.getElementById("open-dashboard").setAttribute("aria-disabled", String(this._busy || !this._loaded));
    root.querySelectorAll("[data-tab]").forEach(button => { button.disabled = this._busy || !this._loaded; });
  }

  _renderVisual() {
    this._cardDrag?.cancel();
    if (!this._loaded) return;
    const root = this.shadowRoot.getElementById("visual-view");
    if (this._model.config_version === 2) {
      const restoreFocus = this._pageModel && this._pageModel !== this._model && root.contains(this.shadowRoot.activeElement);
      if (this._pageModel && this._pageModel !== this._model) {
        this._revision = (this._revision || 0) + 1;
        this.shadowRoot.querySelectorAll('ha-dialog').forEach(dialog => { dialog.open = false; dialog.remove(); });
      }
      root.innerHTML = `<div class="section-grid"><ha-card class="span-two"><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:view-dashboard-outline"></ha-icon><h2>${this._t('pages')}</h2><span class="grow"></span><ha-button id="add-page">${this._t('addNavPage')}</ha-button></div><div id="page-manager"></div></div></ha-card><ha-card><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:tune"></ha-icon><h2>${this._t('general')}</h2></div><div id="general-form"></div></div></ha-card><ha-card><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:navigation-variant-outline"></ha-icon><h2>${this._t('navigation')}</h2></div><p class="helper">${this._l("Additional destinations appear in the navbar overflow menu.")}</p><div id="navbar-list"></div></div></ha-card></div>`;
      this._pageEntries = new Map();
      this._renderPageManager(root.querySelector('#page-manager'));
      const manager = root.querySelector('#page-manager'); manager.tabIndex = -1;
      manager.addEventListener('click', event => {
        const button = event.composedPath().find(element => element.dataset?.action);
        if (!button || !manager.contains(button) || this._busy) return;
        event.stopPropagation();
        if (button.dataset.action.startsWith('card-')) this._roomAction(button); else this._pageAction(button);
      });
      this._mountGeneralForm(root.querySelector('#general-form'));
      this._renderNavigation(root.querySelector('#navbar-list'));
      root.querySelector('#add-page').addEventListener('click', () => this._openPageDialog());
      if (restoreFocus) manager.focus({ preventScroll: true });
      return;
    }
    root.innerHTML = `
      <div class="section-grid">
        <ha-card class="span-two"><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:navigation-variant-outline"></ha-icon><h2>${this._t("navigation")}</h2><span class="grow"></span><ha-button id="add-nav-page">${this._t("addNavPage")}</ha-button></div><p class="helper">${this._l("Additional destinations appear in the navbar overflow menu.")}</p><div id="navbar-list"></div></div></ha-card>
        <ha-card><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:tune"></ha-icon><h2>${this._t("general")}</h2></div><div id="general-form"></div></div></ha-card>
        <ha-card><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:home-outline"></ha-icon><h2>${this._t("overview")}</h2></div><div id="overview-form"></div></div></ha-card>
        <ha-card class="span-two"><ha-expansion-panel id="rooms-section"><div class="expansion-heading" slot="header"><ha-icon icon="mdi:sofa-outline"></ha-icon><h2>${this._t("rooms")}</h2><span class="grow"></span><ha-button id="add-room">${this._t("addRoom")}</ha-button></div><div class="expansion-body"><div id="room-list"></div></div></ha-expansion-panel></ha-card>
        <ha-card class="span-two"><ha-expansion-panel id="pages-section"><div class="expansion-heading" slot="header"><ha-icon icon="mdi:view-dashboard-outline"></ha-icon><h2>${this._t("pages")}</h2><span class="grow"></span><ha-button id="add-custom-page">${this._t("addCustomPage")}</ha-button></div><div class="expansion-body"><p class="helper">Enable a guided page or create a custom page with its own cards.</p><div id="page-list"></div></div></ha-expansion-panel></ha-card>
      </div>`;
    for (const key of ["rooms", "pages"]) {
      const panel = root.querySelector(`#${key}-section`);
      panel.expanded = this._expandedSections[key];
      panel.addEventListener("expanded-changed", (event) => {
        this._expandedSections[key] = event.target.expanded;
      });
    }
    this._renderNavigation(root.querySelector("#navbar-list"));
    this._mountGeneralForm(root.querySelector("#general-form"));
    this._mountOverviewForm(root.querySelector("#overview-form"));
    this._renderRooms(root.querySelector("#room-list"));
    this._renderPages(root.querySelector("#page-list"));
    root.querySelector("#add-room").addEventListener("click", (event) => {
      event.stopPropagation();
      this._openRoomDialog();
    });
    root.querySelector("#add-nav-page").addEventListener("click", () => this._openNavigationDialog());
    root.querySelector("#add-custom-page").addEventListener("click", (event) => {
      event.stopPropagation();
      this._openCustomPageDialog();
    });
  }

  _availablePages() {
    if (this._model.config_version === 2) return this._model.pages.map(page => ({ path: page.path, name: page.name, icon: page.icon || 'mdi:file-outline' }));
    const pages = [
      { path: "overview", name: this._l("Home"), icon: "mdi:home-variant" },
      { path: "rooms", name: this._t("rooms"), icon: "mdi:sofa" },
    ];
    for (const [path, page] of Object.entries(this._catalog.pages)) {
      if (Object.hasOwn(this._model.pages, path)) pages.push({ path, name: this._l(page.label), icon: page.icon });
    }
    for (const page of this._model.pages.custom || []) {
      pages.push({ path: page.path, name: page.name, icon: page.icon || "mdi:file-outline" });
    }
    return pages;
  }

  _dashboardRoot() {
    return (this._dashboardUrl || '/marao-dashboard/overview').replace(/\/[a-z0-9_-]+$/, '');
  }

  _reconcilePageExpansion() {
    if (this._pageModel === this._model) return;
    const pages = this._model.pages;
    if (!this._pageModel) this._openPages = new Set(pages.filter(page => page.path === this._model.landing_page));
    else {
      const oldPages = this._pageModel.pages;
      const unique = (items, key, value) => value && items.filter(page => page[key] === value).length === 1;
      const opened = new Set();
      for (const old of this._openPages) {
        const match = pages.includes(old) ? old : unique(oldPages, 'id', old.id) && unique(pages, 'id', old.id)
          ? pages.find(page => page.id === old.id)
          : unique(oldPages, 'path', old.path) && unique(pages, 'path', old.path)
            ? pages.find(page => page.path === old.path && (!page.id || !old.id)) : null;
        if (match) opened.add(match);
      }
      this._openPages = opened;
    }
    this._pageModel = this._model;
  }

  _pageHeader(page, index) {
    const pinned = this._navigationEntries().some(entry => entry === page.path || entry?.page === page.path);
    return `<ha-icon icon="${esc(page.icon || 'mdi:file-outline')}"></ha-icon><div class="room-title"><strong>${esc(page.name)}</strong><span>${esc(page.path)}${page.path === this._model.landing_page ? ' · ' + this._l('Landing page') : ''}</span></div><div class="row-actions">${this._iconButton('mdi:arrow-up', 'Move up', 'page-up', index, index === 0)}${this._iconButton('mdi:arrow-down', 'Move down', 'page-down', index, index === this._model.pages.length - 1)}${this._iconButton('mdi:pencil', 'Edit page', 'page-edit', index)}${this._iconButton('mdi:content-copy', this._t('duplicate'), 'page-duplicate', index)}${this._iconButton(pinned ? 'mdi:pin-off' : 'mdi:pin', pinned ? 'Unpin' : 'Pin to navbar', 'page-pin', index)}${this._iconButton('mdi:delete-outline', 'Delete page', 'page-delete', index, this._model.pages.length === 1)}</div>`;
  }

  _sectionHeader(page, index, sectionIndex) {
    const position = `${index}:${sectionIndex}`;
    return `<h3>${this._l('Section')} ${sectionIndex + 1}</h3><span class="grow"></span><div class="row-actions">${this._iconButton('mdi:arrow-up', 'Move up', 'section-up', position, !page.sections || sectionIndex === 0)}${this._iconButton('mdi:arrow-down', 'Move down', 'section-down', position, !page.sections || sectionIndex === pageContainers(page).length - 1)}${this._iconButton('mdi:view-grid-outline', 'Edit layout', 'section-edit', position)}${this._iconButton('mdi:delete-outline', 'Delete section', 'section-delete', position, !page.sections)}</div>`;
  }

  _renderPageBody(entry, page, index, changed) {
    const sections = pageContainers(page);
    if (!this._contextReady && sections.some(section => (section.entities || []).some(entity => entity.entity_id && !this._displayEntityIds?.has(entity.entity_id)))) {
      if (!entry.pending) {
        entry.body.innerHTML = `<p role="status">${this._t('metadataLoading')}</p>`; entry.pending = true;
        const lifecycle = this._lifecycle, model = this._model;
        this._ensureEditorContext().then(() => {
          if (this.isConnected && lifecycle === this._lifecycle && model === this._model && this._model.pages.includes(page) && this._openPages.has(page) && this._pageEntries.get(page) === entry) {
            entry.body.replaceChildren(); entry.pending = false;
            this._renderPageBody(entry, page, this._model.pages.indexOf(page), new Set(sections));
          }
        }).catch(error => {
          if (!entry.body.isConnected || model !== this._model) return;
          entry.pending = false;
          entry.body.innerHTML = `<p role="alert">${esc(this._t('metadataFailed') + this._error(error))}</p><ha-button data-context-retry>${this._t('retry')}</ha-button>`;
          entry.body.querySelector('[data-context-retry]').addEventListener('click', () => { this._contextError = null; this._renderPageBody(entry, page, this._model.pages.indexOf(page), new Set(sections)); });
        });
      }
      return;
    }
    if (entry.pending) { entry.pending = false; entry.body.replaceChildren(); }
    if (!entry.add) {
      entry.add = document.createElement('ha-button'); entry.add.dataset.action = 'section-add';
      entry.add.textContent = this._l('Add section'); entry.body.append(entry.add);
    }
    if (entry.add.dataset.room !== String(index)) entry.add.dataset.room = String(index);
    for (const [section, element] of entry.sections) if (!sections.includes(section)) { element.remove(); entry.sections.delete(section); }
    sections.forEach((section, sectionIndex) => {
      const position = `${index}:${sectionIndex}`;
      let element = entry.sections.get(section);
      if (!element) {
        element = document.createElement('section'); element.className = 'page-section';
        entry.sections.set(section, element); changed.add(section);
      }
      const coordinates = `${position}:${sections.length}:${Boolean(page.sections)}`;
      if (changed.has(section)) { element._headerMarkup = this._sectionHeader(page, index, sectionIndex); element.innerHTML = `<div class="card-heading">${this._sectionHeader(page, index, sectionIndex)}</div>${this._entityList(section, position, 'page')}${section.cards?.length ? `<p class="helper">${this._l('Raw cards are retained and editable in JSON.')} (${section.cards.length})</p>` : ''}<ha-button data-action="card-add" data-kind="page" data-room="${position}">${this._t('addCard')}</ha-button>`; }
      else if (element._coordinates !== coordinates) {
        const heading = element.querySelector('.card-heading');
        const markup = this._sectionHeader(page, index, sectionIndex);
        if (element._headerMarkup !== markup) { heading.innerHTML = markup; element._headerMarkup = markup; }
        element.querySelectorAll('[data-room]').forEach(control => { control.dataset.room = position; });
        element.querySelector('[data-card-list]').dataset.movePage = `page:${index}`;
        element.querySelector('[data-card-list]').dataset.moveSection = String(sectionIndex);
        element.querySelectorAll('[data-card-drag]').forEach(row => {
          const move = row.querySelector('[data-action="card-move"]');
          if (sections.length < 2) move?.remove();
          else if (!move) row.querySelector('[data-action="card-edit"]').insertAdjacentHTML('beforebegin', this._iconButton('mdi:tray-arrow-down', 'Move to section', 'card-move', position, false, Number(row.dataset.cardDrag), 'page'));
        });
      }
      element._coordinates = coordinates;
      const next = [...entry.body.children][sectionIndex];
      if (next !== element) entry.body.insertBefore(element, next || entry.add);
    });
  }

  _renderPageManager(host, changed = new Set()) {
    this._reconcilePageExpansion();
    this._pageEntries ||= new Map();
    const pages = this._model.pages;
    for (const [page, entry] of this._pageEntries) if (!pages.includes(page)) {
      entry.article.remove(); this._pageEntries.delete(page); this._openPages.delete(page);
    }
    pages.forEach((page, index) => {
      let entry = this._pageEntries.get(page);
      if (!entry) {
        const article = document.createElement('article'); article.className = 'room';
        article.innerHTML = '<ha-expansion-panel><div class="room-header" slot="header"></div><div class="room-body"></div></ha-expansion-panel>';
        const panel = article.querySelector('ha-expansion-panel');
        entry = { article, panel, header: article.querySelector('.room-header'), body: article.querySelector('.room-body'), sections: new Map() };
        this._pageEntries.set(page, entry);
        panel.addEventListener('expanded-changed', event => {
          if (event.target !== panel || !panel.isConnected || this._pageEntries.get(page) !== entry) return;
          this._cardDrag?.cancel();
          if (panel.expanded) { this._openPages.add(page); this._renderPageBody(entry, page, this._model.pages.indexOf(page), new Set()); }
          else {
            this._openPages.delete(page);
            const focused = this.shadowRoot.activeElement;
            if (focused && entry.body.contains(focused)) entry.header.focus({ preventScroll: true });
            entry.body.replaceChildren(); entry.sections.clear(); entry.add = null;
          }
        });
      }
      const header = this._pageHeader(page, index);
      if (entry.headerMarkup !== header) { entry.header.innerHTML = header; entry.headerMarkup = header; }
      entry.header.tabIndex = -1;
      if (entry.panel.dataset.pagePanel !== String(index)) entry.panel.dataset.pagePanel = String(index);
      entry.panel.expanded = this._openPages.has(page);
      if (entry.panel.expanded) this._renderPageBody(entry, page, index, changed);
      const next = host.children[index];
      if (next !== entry.article) host.insertBefore(entry.article, next || null);
    });
  }

  _refreshCards(kind, ...positions) {
    const host = this.shadowRoot.querySelector('#page-manager');
    if (kind !== 'page' || !host) return this._renderVisual();
    this._renderPageManager(host, new Set(positions.map(position => this._container(kind, position)).filter(Boolean)));
  }

  _refreshPages(changed = new Set(), references = false) {
    const host = this.shadowRoot.querySelector('#page-manager');
    if (!host) return this._renderVisual();
    this._renderPageManager(host, changed);
    if (references) {
      this._renderNavigation(this.shadowRoot.querySelector('#navbar-list'));
      const form = this.shadowRoot.querySelector('#general-form ha-form');
      form.schema = form.schema.map(field => field.name === 'landing_page' ? this._schema('landing_page', 'Landing page', { select: { mode: 'dropdown', options: this._availablePages().map(page => ({ value: page.path, label: page.name })) } }, true) : field);
      form.data = { ...form.data, landing_page: this._model.landing_page };
    }
  }

  _referenceSections(path) {
    const contains = value => value && typeof value === 'object' && (value.page === path || value.navigation_path === `${this._dashboardRoot()}/${path}` || typeof value.navigation_path === 'string' && value.navigation_path.startsWith(`#page-${path}-`) || Object.entries(value).some(([key, item]) => !key.startsWith('__') && contains(item)));
    return new Set(this._model.pages.flatMap(page => pageContainers(page).filter(contains)));
  }

  _pageAction(button) {
    if (this._busy) return;
    const action = button.dataset.action;
    const [index, sectionIndex = 0] = button.dataset.room.split(':').map(Number);
    const page = this._model.pages[index];
    let focusPage = page;
    try {
      if (action === 'page-edit') return this._openPageDialog(index);
      if (action === 'page-delete') return this._openPageDeleteDialog(index);
      if (action === 'page-up' || action === 'page-down') this._model.pages = moveItem(this._model.pages, index, index + (action === 'page-up' ? -1 : 1));
      if (action === 'page-duplicate') { focusPage = duplicatePage(this._model, index, `${page.name} ${this._l('copy')}`, this._dashboardRoot()); this._openPages.add(focusPage); }
      if (action === 'page-pin') pinPage(this._model, page.path, !this._navigationEntries().some(entry => entry === page.path || entry?.page === page.path));
      if (action === 'section-add') addPageSection(page);
      if (action === 'section-up' || action === 'section-down') page.sections = moveItem(page.sections, sectionIndex, sectionIndex + (action === 'section-up' ? -1 : 1));
      if (action === 'section-delete') page.sections.splice(sectionIndex, 1);
      if (action === 'section-edit') {
        const section = pageContainers(page)[sectionIndex];
        return this._openFormDialog('Edit layout', { columns: section.columns ? String(section.columns) : 'auto' }, [this._columnsSchema()], value => {
          const columns = Number(value.columns);
          if (Number.isInteger(columns) && columns >= 1 && columns <= 6) section.columns = columns; else delete section.columns;
          this._setDirty(); this._refreshCards('page', `${index}:${sectionIndex}`);
        });
      }
      this._setDirty(); this._refreshPages(new Set(), action.startsWith('page-'));
      this._pageEntries.get(focusPage)?.header.focus({ preventScroll: true });
    } catch (error) { this._setStatus(this._error(error), 'error'); }
  }

  async _openPageDialog(index = null) {
    const lifecycle = this._lifecycle, revision = this._revision;
    if (index == null) {
      try { await this._ensureEditorContext(!this._pageTemplates); }
      catch (error) { this._setStatus(this._error(error), 'error'); return; }
      if (!this.isConnected || lifecycle !== this._lifecycle || revision !== this._revision) return;
    }
    const existing = index == null ? null : this._model.pages[index];
    const templates = this._pageTemplates || this._catalog.page_templates || { empty: { entities: [] } };
    this._openFormDialog(existing ? 'Edit page' : this._t('addNavPage'), {
      template: 'empty', name: existing?.name || '', path: existing?.path || '', icon: existing?.icon || '', area: existing?.area || '',
    }, [
      ...(!existing ? [this._schema('template', 'Page template', { select: { mode: 'dropdown', options: Object.keys(templates).map(value => ({ value, label: this._l(({ empty: 'Empty', home: 'Home', rooms: 'Rooms', room: 'Room', security: 'Security', energy: 'Energy', wallbox: 'Wallbox', media: 'Media' })[value] || value) })) } }, true)] : []),
      this._schema('name', 'Page name', { text: {} }, true), this._schema('path', 'Path', { text: {} }),
      this._schema('icon', 'Icon', { icon: {} }), this._schema('area', 'Suggestion area', { area: {} }),
    ], value => {
      if (!String(value.name || '').trim()) throw new Error('Each page requires a name.');
      const references = existing ? this._referenceSections(existing.path) : new Set();
      if (existing) {
        renamePage(this._model, index, value.path || slugify(value.name), this._dashboardRoot());
        existing.name = value.name.trim(); existing.icon = value.icon || 'mdi:file-outline';
        if (value.area) existing.area = value.area; else delete existing.area;
      } else {
        const selectedTemplates = clone(templates);
        if (value.template === 'rooms') selectedTemplates.rooms = roomPageTemplate(this._model);
        if (value.template === 'room' && value.area) {
          const area = this._areas.find(item => item.area_id === value.area);
          if (!area) throw new Error('Choose an existing suggestion area.');
          const imported = importAreaRoom(area, this._entities, this._catalog.supported_domains);
          const template = selectedTemplates.room;
          if (Array.isArray(template.sections)) template.sections.at(-1).entities = imported.entities;
          else template.entities = imported.entities;
        }
        this._openPages.add(createPage(this._model, value, selectedTemplates));
      }
      this._setDirty(); this._refreshPages(references, true);
    }, existing ? this._t('update') : this._t('create'));
  }

  _openPageDeleteDialog(index) {
    const page = this._model.pages[index];
    if (this._model.pages.length === 1) { this._setStatus(this._l('Keep at least one page.'), 'error'); return; }
    const references = pageReferences(this._model, page.path, this._dashboardRoot());
    this._openFormDialog(`${this._l('Delete page')}: ${page.name}`, { confirm_delete: false, replacement: '' }, [
      this._schema('confirm_delete', `${this._l('Delete page')}: ${page.name}`, { boolean: {} }, true),
      ...(references.length ? [this._schema('replacement', 'Replace existing links with', { select: { mode: 'dropdown', options: this._availablePages().filter(item => item.path !== page.path).map(item => ({ value: item.path, label: item.name })) } }, true)] : []),
    ], value => {
      if (!value.confirm_delete) throw new Error('Confirm the named page deletion.');
      const sections = this._referenceSections(page.path);
      deletePage(this._model, index, value.replacement, this._dashboardRoot());
      this._setDirty(); this._refreshPages(sections, true);
    }, this._t('delete'));
  }

  _navigationEntries() {
    if (this._model.config_version === 2) return this._model.navigation || [];
    return Array.isArray(this._model.navigation)
      ? this._model.navigation
      : this._availablePages().map((page) => page.path);
  }

  _editableNavigation() {
    if (!Array.isArray(this._model.navigation)) this._model.navigation = clone(this._navigationEntries());
    return this._model.navigation;
  }

  _renderNavigation(host) {
    const available = new Map(this._availablePages().map((page) => [page.path, page]));
    const entries = this._navigationEntries();
    const markup = entries.length ? `<div class="navigation-list">${entries.map((entry, index) => {
      const path = typeof entry === "string" ? entry : entry?.page;
      const page = available.get(path);
      const label = entry?.label || page?.name || path || entry?.url || "Unknown page";
      const detail = page ? page.path : entry?.url || "Page is not currently generated";
      return `<div class="navigation-row"><ha-icon icon="${esc(entry?.icon || page?.icon || "mdi:link-variant")}"></ha-icon><div class="entity-main"><div class="entity-name">${esc(label)}</div><div class="entity-meta">${esc(detail)}</div></div><div class="row-actions">${this._iconButton("mdi:arrow-up", "Move up", "nav-up", index, index === 0)}${this._iconButton("mdi:arrow-down", "Move down", "nav-down", index, index === entries.length - 1)}${this._iconButton("mdi:pin-off", "Unpin", "nav-delete", index)}</div></div>`;
    }).join("")}</div>` : `<div class="empty">No pages in the navigation bar.</div>`;
    if (host._navigationMarkup === markup) return;
    host.innerHTML = markup; host._navigationMarkup = markup;
    host.querySelectorAll("[data-action^='nav-']").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.room);
      const navigation = this._editableNavigation();
      if (button.dataset.action === "nav-delete") navigation.splice(index, 1);
      else this._model.navigation = moveItem(navigation, index, index + (button.dataset.action === "nav-up" ? -1 : 1));
      this._setDirty(); this._renderNavigation(host); if (this._model.config_version === 2) this._refreshPages();
    }));
  }

  _openNavigationDialog() {
    const used = new Set(this._navigationEntries().map((entry) => typeof entry === "string" ? entry : entry?.page).filter(Boolean));
    const options = this._availablePages().filter((page) => !used.has(page.path)).map((page) => ({ value: page.path, label: page.name }));
    if (!options.length) { this._setStatus("Every generated page is already in the navigation bar.", "success"); return; }
    this._openFormDialog(this._t("addNavPage"), { page: options[0].value }, [
      this._schema("page", "Target page", { select: { mode: "dropdown", options } }, true),
    ], (value) => {
      this._editableNavigation().push(value.page);
      this._setDirty(); this._refreshPages(new Set(), true);
    });
  }

  _mountGeneralForm(host) {
    const data = { name: this._model.name || "", slug: this._model.slug || "", theme: this._model.theme || "", icon: this._model.icon || "", ...(this._model.config_version === 2 ? { landing_page: this._model.landing_page } : {}) };
    const themes = Object.keys(this._hass?.themes?.themes || {}).sort().map((theme) => ({ value: theme, label: theme }));
    this._mountForm(host, data, [
      this._schema("name", "Dashboard name", { text: {} }, true),
      this._schema("slug", "URL slug", { text: {} }),
      this._schema("theme", "Theme", { select: { mode: "dropdown", custom_value: true, options: themes } }),
      this._schema("icon", "Icon", { icon: {} }),
      ...(this._model.config_version === 2 ? [this._schema('landing_page', 'Landing page', { select: { mode: 'dropdown', options: this._availablePages().map(page => ({ value: page.path, label: page.name })) } }, true)] : []),
    ], (value) => {
      const landing = this._model.landing_page;
      Object.assign(this._model, value);
      this._setDirty();
      if (this._model.config_version === 2 && landing !== this._model.landing_page) this._refreshPages();
    });
  }

  _mountOverviewForm(host) {
    const scenes = this._entityIds(this._model.overview.scenes);
    const data = { weather_entity: this._entityId(this._model.overview.weather_entity), scenes };
    host.innerHTML = `<div id="overview-fields"></div><div id="scene-order"></div><div id="overview-groups"></div>`;
    const orderHost = host.querySelector("#scene-order");
    this._mountForm(host.querySelector("#overview-fields"), data, [
      this._schema("weather_entity", "Weather entity", { entity: { domain: ["weather"] } }),
      this._schema("scenes", "Scenes", { entity: { domain: ["scene", "input_boolean", "input_select"], multiple: true } }),
    ], (value) => {
      this._model.overview = {
        ...this._model.overview,
        weather_entity: preserveEntityValue(this._model.overview.weather_entity, value.weather_entity),
        scenes: mergeEntityValues(this._model.overview.scenes, value.scenes || []),
      };
      this._renderSceneOrder(orderHost);
      this._setDirty();
    });
    this._renderSceneOrder(orderHost);
    const groups = host.querySelector('#overview-groups');
    groups.innerHTML = `<h3>${this._l('Entity Groups')}</h3>${this._entityList(this._container('overview', 0), 0, 'overview')}<ha-button data-add-group>${this._l('Add Entity Group')}</ha-button>`;
    groups.querySelector('[data-add-group]').addEventListener('click', () => this._openEntityGroupEditor(0, null, 'overview'));
    groups.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => this._roomAction(button)));
  }

  _renderSceneOrder(host, entries = null, changed = null, edit = null) {
    const scenes = entries || (Array.isArray(this._model.overview.scenes)
      ? this._model.overview.scenes
      : (this._model.overview.scenes ? [this._model.overview.scenes] : []));
    host.innerHTML = scenes.length ? `<div class="advanced"><strong>${this._l("Scene order")}</strong><ha-sortable>${scenes.map((scene, index) => `<div class="load-row"><span>${esc(scene.name || entityMeta(this._entities, this._entityId(scene))?.name || this._entityId(scene))}</span>${this._iconButton("mdi:arrow-up", "Move up", "scene-up", index, index === 0)}${this._iconButton("mdi:arrow-down", "Move down", "scene-down", index, index === scenes.length - 1)}${edit ? this._iconButton('mdi:pencil', 'Edit card', 'scene-edit', index) : ''}</div>`).join("")}</ha-sortable></div>` : "";
    host.querySelectorAll("[data-action^='scene-']").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.room);
      if (button.dataset.action === 'scene-edit') { edit(index); return; }
      if (changed) { changed(moveItem(scenes, index, index + (button.dataset.action === 'scene-up' ? -1 : 1))); return; }
      this._model.overview.scenes = moveItem(scenes, index, index + (button.dataset.action === "scene-up" ? -1 : 1));
      this._mountOverviewForm(host.parentElement); this._setDirty();
    }));
  }

  _renderRooms(host) {
    if (!this._model.rooms.length) {
      host.innerHTML = `<div class="empty">No rooms yet. Import a Home Assistant area or create one manually.</div>`;
      return;
    }
    host.innerHTML = `<ha-sortable handle-selector=".room-header">${this._model.rooms.map((room, roomIndex) => `
      <article class="room" draggable="true" data-room-drag="${roomIndex}">
        <ha-expansion-panel data-room-panel="${roomIndex}">
        <div class="room-header" slot="header">
          <ha-icon icon="${esc(room.icon || "mdi:sofa-outline")}"></ha-icon>
          <div class="room-title"><strong>${esc(room.name || `Room ${roomIndex + 1}`)}</strong><span>${esc(room.path || "Generated path")} · ${(room.entities || []).length} cards${room.columns ? ` · ${this._l("Columns")}: ${room.columns}` : ""}</span></div>
          <div class="row-actions">
            ${this._iconButton("mdi:arrow-up", "Move up", "room-up", roomIndex, roomIndex === 0)}
            ${this._iconButton("mdi:arrow-down", "Move down", "room-down", roomIndex, roomIndex === this._model.rooms.length - 1)}
            ${this._iconButton("mdi:pencil", "Edit room", "room-edit", roomIndex)}
            ${this._iconButton("mdi:content-copy", this._t("duplicate"), "room-duplicate", roomIndex)}
            ${this._iconButton("mdi:delete-outline", this._t("delete"), "room-delete", roomIndex)}
          </div>
        </div>
        <div class="room-body">
          ${this._entityList(room, roomIndex)}
          ${room.entities?.length ? "" : `<div class="empty">${this._t("noCards")}</div>`}
          <ha-button data-action="card-add" data-room="${roomIndex}">${this._t("addCard")}</ha-button>
        </div>
        </ha-expansion-panel>
      </article>`).join("")}</ha-sortable>`;
    host.querySelectorAll("[data-room-panel]").forEach((panel) => {
      const room = this._model.rooms[Number(panel.dataset.roomPanel)];
      const key = room.path || room.name;
      panel.expanded = !this._collapsedRooms.has(key);
      panel.addEventListener("expanded-changed", (event) => {
        if (event.target.expanded) this._collapsedRooms.delete(key); else this._collapsedRooms.add(key);
      });
    });
    host.querySelectorAll("[data-action]").forEach((element) =>
      element.addEventListener("click", (event) => { event.stopPropagation(); this._roomAction(element); }));
    this._bindDrag(host);
  }

  _entityRow(entity, roomIndex, cardIndex, kind = "room") {
    const container = this._container(kind, roomIndex);
    const metadata = entityMeta(this._entities, entity.entity_id);
    const card = this._catalog.cards.find((item) => item.id === entity.template) || cardForEntity(this._catalog, metadata || entity);
    const shortcutPage = entity.page && this._availablePages().find((page) => page.path === entity.page);
    const group = entity.template === 'hc_entity_group_card';
    const warning = group || card?.entity_optional ? '' : entity.page ? (shortcutPage ? "" : " · Missing page") : !metadata && (this._contextReady || this._displayEntityIds?.has(entity.entity_id)) ? " · Missing" : metadata?.state === "unavailable" ? " · Unavailable" : "";
    const title = (entity.name_key ? this._l(entity.name) : entity.name) || shortcutPage?.name || metadata?.name || entity.entity_id || entity.page || this._l(card?.label || 'Card');
    const detail = group ? `${this._l('Entity Group')} · ${this._l(({light:'Light', cover:'Cover', battery:'Battery', climate:'Climate'})[entity.entity_type] || entity.entity_type)} · ${new Set((entity.entities || []).map(member => this._entityId(member))).size} ${this._l('members')}` : entity.page ? `${entity.page} · ${this._l("Page shortcut")}` : `${entity.entity_id ? entity.entity_id + ' · ' : ''}${this._l(card?.label || entity.template || "Automatic")}`;
    return `<div class="entity-row" data-card-drag="${cardIndex}" data-room="${roomIndex}" data-kind="${kind}">
      <button type="button" class="card-drag-handle" data-card-handle aria-label="${esc(this._l("Drag card") + ": " + title)}"><ha-icon icon="mdi:drag"></ha-icon></button>
      <div class="entity-main"><div class="entity-name">${esc(title)}</div><div class="entity-meta">${esc(detail)}${esc(warning)}</div></div>
      <div class="row-actions">
        ${this._iconButton("mdi:arrow-up", "Move up", "card-up", roomIndex, cardIndex === 0, cardIndex, kind)}
        ${this._iconButton("mdi:arrow-down", "Move down", "card-down", roomIndex, cardIndex === container.entities.length - 1, cardIndex, kind)}
        ${kind === "page" && pageContainers(this._model.pages[Number(String(roomIndex).split(":")[0])]).length > 1 ? this._iconButton("mdi:tray-arrow-down", "Move to section", "card-move", roomIndex, false, cardIndex, kind) : ""}
        ${this._iconButton("mdi:pencil", "Edit card", "card-edit", roomIndex, false, cardIndex, kind)}
        ${this._iconButton("mdi:delete-outline", this._t("delete"), "card-delete", roomIndex, false, cardIndex, kind)}
      </div>
    </div>`;
  }

  _entityList(container, index, kind = "room") {
    const columns = Number.isInteger(container.columns) ? Math.min(6, Math.max(1, container.columns)) : null;
    const layout = columns ? ` data-columns="${columns}" style="--editor-columns:${columns}"` : "";
    const [pageIndex, sectionIndex = 0] = String(index).split(':').map(Number);
    return `<p class="helper move-guidance">${this._l('Drag the handle to move a card. Use arrows or Move to section without dragging.')}${!columns ? ' ' + this._l('Automatic layout groups cards by type. Choose fixed columns for exact mixed order.') : ''}</p><div class="entity-list" data-card-list data-move-page="${kind}:${pageIndex}" data-move-section="${sectionIndex}"${layout}>${(container.entities || []).map((entity, cardIndex) => this._entityRow(entity, index, cardIndex, kind)).join("") || `<div class="empty">${this._l('Drop a card here')}</div>`}</div>`;
  }

  _iconButton(icon, label, action, room, disabled = false, card = null, kind = "room") {
    return `<button type="button" class="icon-action" data-action="${action}" data-room="${room}" data-kind="${kind}" ${card == null ? "" : `data-card="${card}"`} aria-label="${esc(this._l(label))}" ${disabled ? "disabled" : ""}><ha-icon icon="${icon}"></ha-icon></button>`;
  }

  _iconActionHaptic(event) {
    const button = event.composedPath().find(element => element.classList?.contains('icon-action'));
    if (button && !button.disabled && !this._busy && !button.closest('[inert]')) this._moveHaptic();
  }

  _roomAction(element) {
    const action = element.dataset.action;
    const kind = element.dataset.kind || "room";
    const roomIndex = kind === 'page' ? element.dataset.room : Number(element.dataset.room);
    const cardIndex = element.dataset.card == null ? null : Number(element.dataset.card);
    if (action === "custom-edit") return this._openCustomPageDialog(roomIndex);
    if (action === "custom-delete" && confirm(`Delete ${this._container(kind, roomIndex).name}?`)) this._model.pages.custom.splice(roomIndex, 1);
    if (action === "custom-duplicate") {
      const copy = clone(this._container(kind, roomIndex));
      for (const item of copy.entities) if (item.template === 'hc_entity_group_card') item.id = newEntityGroupId();
      copy.name = `${copy.name} copy`; copy.path = slugify(copy.name);
      this._model.pages.custom.splice(roomIndex + 1, 0, copy);
    }
    if (action === "custom-up") this._model.pages.custom = moveItem(this._model.pages.custom, roomIndex, roomIndex - 1);
    if (action === "custom-down") this._model.pages.custom = moveItem(this._model.pages.custom, roomIndex, roomIndex + 1);
    if (action === "room-edit") return this._openRoomDialog(roomIndex);
    if (action === "room-delete" && confirm(`Delete ${this._model.rooms[roomIndex].name}?`)) this._model.rooms.splice(roomIndex, 1);
    if (action === "room-duplicate") {
      const copy = clone(this._model.rooms[roomIndex]);
      for (const item of copy.entities) if (item.template === 'hc_entity_group_card') item.id = newEntityGroupId();
      copy.name = `${copy.name} copy`; copy.path = `room-${slugify(copy.name)}`;
      this._model.rooms.splice(roomIndex + 1, 0, copy);
    }
    if (action === "room-up") this._model.rooms = moveItem(this._model.rooms, roomIndex, roomIndex - 1);
    if (action === "room-down") this._model.rooms = moveItem(this._model.rooms, roomIndex, roomIndex + 1);
    if (action === "card-add") return this._openCardGallery(roomIndex, kind);
    if (action === "card-move") return this._openMoveDialog(roomIndex, cardIndex);
    if (action === "card-edit") return this._openCardEditor(roomIndex, cardIndex, null, kind);
    if (action === "card-delete") this._editableContainer(kind, roomIndex).entities.splice(cardIndex, 1);
    if (action === "card-up" || action === "card-down") {
      const source = this._cardSource(kind, roomIndex, cardIndex);
      if (source) this._commitCardMove(source, source.section, cardIndex + (action === "card-up" ? -1 : 2));
      return;
    }
    this._setDirty(); this._refreshCards(kind, roomIndex);
  }

  _container(kind, index) {
    if (kind === 'page') {
      const [pageIndex, sectionIndex = 0] = String(index).split(':').map(Number);
      return pageContainers(this._model.pages[pageIndex])[sectionIndex];
    }
    if (kind === 'overview') {
      const overview = this._model.overview;
      return { get entities() { return overview.entity_groups || []; }, set entities(value) { overview.entity_groups = value; } };
    }
    return kind === "custom" ? this._model.pages.custom[index] : this._model.rooms[index];
  }

  _editableContainer(kind, index) {
    return this._container(kind, index);
  }

  _editableRoom(index) { return this._editableContainer("room", index); }

  _cardSource(kind, room, index) {
    if (this._busy || this._tab !== 'visual') return null;
    const [pageIndex, section = 0] = String(room).split(':').map(Number);
    const page = kind === 'page' ? this._model.pages[pageIndex] : this._container(kind, pageIndex);
    const card = page && pageContainers(page)[section]?.entities?.[index];
    return card ? { kind, room, page, section, index, card, model: this._model, revision: this._revision, lifecycle: this._lifecycle,
      key: `${kind}:${pageIndex}` } : null;
  }

  _commitCardMove(source, section, boundary) {
    if (this._busy || this._tab !== 'visual' || source.model !== this._model || source.revision !== this._revision || source.lifecycle !== this._lifecycle) return false;
    if (source.kind === 'page' && this._model.pages[Number(String(source.room).split(':')[0])] !== source.page) return false;
    if (!movePageCard(source.page, source.section, source.index, section, boundary, source.card)) return false;
    this._setDirty(); this._refreshCards(source.kind, source.room, `${String(source.room).split(':')[0]}:${section}`);
    this._setStatus(this._l('Card moved. Save & Generate to apply.'), 'success');
    this._focusMovedCard(source, section);
    return true;
  }

  async _focusMovedCard(source, section) {
    const revision = this._revision, lifecycle = this._lifecycle;
    const room = source.kind === 'page' ? `${String(source.room).split(':')[0]}:${section}` : source.room;
    const index = pageContainers(source.page)[section].entities.indexOf(source.card);
    const row = this.shadowRoot.querySelector(`[data-card-drag="${index}"][data-kind="${source.kind}"][data-room="${room}"]`);
    await row?.closest('ha-expansion-panel')?.updateComplete;
    if (!row?.isConnected || source.model !== this._model || revision !== this._revision || lifecycle !== this._lifecycle) return;
    row.querySelector('[data-card-handle]')?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  _moveHaptic() {
    this.dispatchEvent(new CustomEvent('haptic', { detail: 'heavy', bubbles: true, composed: true }));
    if (navigator.vibrate) navigator.vibrate(50);
  }

  _openMoveDialog(room, index) {
    const source = this._cardSource('page', room, index);
    if (!source || pageContainers(source.page).length < 2) return;
    const sections = pageContainers(source.page), dialog = this._dialog(this._l('Move to section'));
    const content = dialog.querySelector('.dialog-content');
    const data = { section: String(source.section === 0 ? 1 : 0), position: 'end' };
    content.innerHTML = `<div data-move-form></div><p data-error role="alert"></p><div class="dialog-actions"><ha-button data-close>${this._t('cancel')}</ha-button><ha-button data-save>${this._l('Move card')}</ha-button></div>`;
    const render = () => {
      const cards = sections[Number(data.section)].entities;
      this._mountForm(content.querySelector('[data-move-form]'), data, [
        this._schema('section', 'Destination section', { select: { mode: 'dropdown', options: sections.flatMap((_, i) => i === source.section ? [] : [{ value: String(i), label: `${this._l('Section')} ${i+1}` }]) } }, true),
        this._schema('position', 'Position', { select: { mode: 'dropdown', options: [...cards.map((card, i) => ({ value: String(i), label: `${this._l('Before')} ${i+1}: ${card.name || entityMeta(this._entities, card.entity_id)?.name || card.entity_id || card.page || this._l(this._catalog.cards.find(c => c.id === card.template)?.label || 'Card')}` })), { value: 'end', label: this._l('At the end') }] } }, true),
      ], value => { const changed = value.section !== data.section; Object.assign(data, value); if (changed) { data.position = 'end'; render(); } });
    };
    render();
    content.querySelector('[data-close]').addEventListener('click', () => this._closeDialog(dialog));
    content.querySelector('[data-save]').addEventListener('click', () => {
      const section = Number(data.section), boundary = data.position === 'end' ? sections[section]?.entities.length : Number(data.position);
      if (!this._commitCardMove(source, section, boundary)) { content.querySelector('[data-error]').textContent = this._l('The card changed. Close and try again.'); return; }
      dialog.addEventListener('closed', () => this._focusMovedCard(source, section), { once: true });
      this._moveHaptic(); this._closeDialog(dialog);
    });
  }

  _bindDrag(host) {
    // Retain legacy room ordering. Cards only use their Pointer Events handles.
    let dragged;
    host.addEventListener('dragstart', event => {
      if (event.target.closest('[data-card-drag]')) { event.preventDefault(); return; }
      const room = event.target.closest('[data-room-drag]');
      dragged = room ? Number(room.dataset.roomDrag) : null;
    });
    host.addEventListener('dragover', event => { if (dragged != null) event.preventDefault(); });
    host.addEventListener('drop', event => {
      if (dragged == null) return;
      const room = event.target.closest('[data-room-drag]');
      if (!room) return;
      event.preventDefault(); this._model.rooms = moveItem(this._model.rooms, dragged, Number(room.dataset.roomDrag)); dragged = null;
      this._setDirty(); this._renderVisual();
    });
    host.addEventListener('dragend', () => { dragged = null; });
  }

  _renderPages(host) {
    host.innerHTML = `<div id="custom-pages"></div><h3 class="subsection-title">Guided pages</h3>${Object.entries(this._catalog.pages).map(([key, page]) => {
      const enabled = Object.hasOwn(this._model.pages, key);
      return `<ha-card class="page-card"><button class="page-toggle" data-page-toggle="${key}"><ha-icon icon="${page.icon}"></ha-icon><strong>${esc(this._l(page.label))}</strong><ha-icon icon="mdi:toggle-switch${enabled ? "" : "-off-outline"}"></ha-icon></button>${enabled ? `<div class="page-form" id="page-${key}"></div>` : ""}</ha-card>`;
    }).join("")}`;
    this._renderCustomPages(host.querySelector("#custom-pages"));
    host.querySelectorAll("[data-page-toggle]").forEach((button) => button.addEventListener("click", () => {
      const key = button.dataset.pageToggle;
      if (Object.hasOwn(this._model.pages, key)) delete this._model.pages[key]; else this._model.pages[key] = {};
      this._setDirty(); this._renderVisual();
    }));
    for (const key of Object.keys(this._catalog.pages)) {
      const pageHost = host.querySelector(`#page-${key}`);
      if (pageHost) this._mountPageForm(key, pageHost);
    }
  }

  _renderCustomPages(host) {
    const pages = this._model.pages.custom || [];
    host.innerHTML = `<h3 class="subsection-title">Custom pages</h3>${pages.length ? pages.map((page, index) => `
      <article class="room custom-page">
        <ha-expansion-panel data-custom-panel="${index}">
          <div class="room-header" slot="header">
            <ha-icon icon="${esc(page.icon || "mdi:file-outline")}"></ha-icon>
            <div class="room-title"><strong>${esc(page.name || `Page ${index + 1}`)}</strong><span>${esc(page.path)} · ${(page.entities || []).length} cards${page.columns ? ` · ${this._l("Columns")}: ${page.columns}` : ""}</span></div>
            <div class="row-actions">
              ${this._iconButton("mdi:arrow-up", "Move up", "custom-up", index, index === 0, null, "custom")}
              ${this._iconButton("mdi:arrow-down", "Move down", "custom-down", index, index === pages.length - 1, null, "custom")}
              ${this._iconButton("mdi:pencil", "Edit page", "custom-edit", index, false, null, "custom")}
              ${this._iconButton("mdi:content-copy", this._t("duplicate"), "custom-duplicate", index, false, null, "custom")}
              ${this._iconButton("mdi:delete-outline", this._t("delete"), "custom-delete", index, false, null, "custom")}
            </div>
          </div>
          <div class="room-body">
            ${this._entityList(page, index, "custom")}
            ${page.entities?.length ? "" : `<div class="empty">${this._t("noCards")}</div>`}
            <ha-button data-action="card-add" data-room="${index}" data-kind="custom">${this._t("addCard")}</ha-button>
          </div>
        </ha-expansion-panel>
      </article>`).join("") : `<div class="empty">No custom pages yet.</div>`}`;
    host.querySelectorAll("[data-custom-panel]").forEach((panel) => {
      const page = pages[Number(panel.dataset.customPanel)];
      const key = page.path || page.name;
      panel.expanded = !this._collapsedRooms.has(key);
      panel.addEventListener("expanded-changed", (event) => {
        if (event.target.expanded) this._collapsedRooms.delete(key); else this._collapsedRooms.add(key);
      });
    });
    host.querySelectorAll("[data-action]").forEach((element) =>
      element.addEventListener("click", (event) => { event.stopPropagation(); this._roomAction(element); }));
  }

  _mountPageForm(key, host) {
    const page = this._model.pages[key];
    const fields = this._catalog.pages[key]?.fields || [];
    const schema = fields.map((field) => field.kind === "entity"
      ? this._schema(field.key, this._l(field.label), { entity: { domain: field.domains || [], multiple: Boolean(field.multiple) } })
      : this._schema(field.key, this._l(field.label), { text: {} }));
    const data = Object.fromEntries(fields.map((field) => [field.key,
      field.kind === "entity"
        ? (field.multiple ? this._entityIds(page[field.key]) : this._entityId(page[field.key]))
        : field.kind === "number_list"
          ? (Array.isArray(page[field.key]) ? page[field.key].join(", ") : (field.default || []).join(", "))
          : page[field.key] ?? field.default ?? "",
    ]));
    this._mountForm(host, data, schema, (value) => {
      const current = this._model.pages[key];
      const next = { ...current };
      for (const field of fields) {
        if (field.kind === "entity") {
          next[field.key] = field.multiple
            ? mergeEntityValues(current[field.key], value[field.key] || [])
            : preserveEntityValue(current[field.key], value[field.key]);
        } else if (field.kind === "number_list") {
          next[field.key] = String(value[field.key] || "").split(",").map(Number).filter(Number.isFinite);
        } else {
          next[field.key] = value[field.key];
        }
      }
      this._model.pages[key] = next; this._setDirty();
      const formatKeys = key === "energy" ? ["house_power", "month_energy", "today_energy", "month_cost", "today_cost"] : key === "wallbox" ? ["charging_power_entity"] : [];
      if (key === "media" || formatKeys.some(field => this._entityId(current[field]) !== this._entityId(next[field]))) this._renderVisual();
    });
    if (key === "energy") { this._renderEnergyFormats(host, page); this._renderEnergyLoads(host, page); }
    if (key === "wallbox") this._renderEnergyFormats(host, page, ["charging_power_entity"]);
    if (key === "media") this._renderMediaPlayers(host, page);
  }

  _renderEnergyFormats(host, page, keys = ["house_power", "month_energy", "today_energy", "month_cost", "today_cost"]) {
    const fields = this._catalog.energy_fields || [];
    const box = document.createElement("div"); box.className = "advanced";
    box.innerHTML = keys.filter(key => this._entityId(page[key])).map(key => `<div class="load-row"><span>${esc(this._entityId(page[key]))}</span><ha-button data-format="${key}">${this._l("Reading format")}</ha-button></div>`).join("");
    box.querySelectorAll("[data-format]").forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.format;
      const original = typeof page[key] === "string" ? {entity_id: page[key]} : clone(page[key]);
      const data = Object.fromEntries(fields.map(field => [`var__${field.key}`, this._readVariable(original.variables, field)]));
      this._openFormDialog(this._l("Reading format"), data, fields.map(field => this._variableSchema(field, original.entity_id)), value => {
        const variables = {...(original.variables || {})};
        for (const field of fields) this._writeVariable(variables, field, value[`var__${field.key}`]);
        if (Object.keys(variables).length) original.variables = variables; else delete original.variables;
        page[key] = original; this._setDirty(); this._renderVisual();
      });
    }));
    host.append(box);
  }

  _renderEnergyLoads(host, page) {
    const box = document.createElement("div"); box.className = "advanced";
    box.innerHTML = `<div class="card-heading"><h3>Loads</h3><span class="grow"></span><ha-button>Add load</ha-button></div>${(page.loads || []).map((load, index) => `<div class="load-row"><span>${esc(load.name || this._entityId(load.power_entity) || `Load ${index + 1}`)}</span><ha-icon-button data-edit="${index}" label="Edit"><ha-icon icon="mdi:pencil"></ha-icon></ha-icon-button><ha-icon-button data-delete="${index}" label="Delete"><ha-icon icon="mdi:delete-outline"></ha-icon></ha-icon-button></div>`).join("")}`;
    box.querySelector("ha-button").addEventListener("click", () => this._openLoadDialog());
    box.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => this._openLoadDialog(Number(button.dataset.edit))));
    box.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => { page.loads.splice(Number(button.dataset.delete), 1); this._setDirty(); this._renderVisual(); }));
    host.append(box);
  }

  _renderMediaPlayers(host, page) {
    if (!Array.isArray(page.players)) return;
    const box = document.createElement("div"); box.className = "advanced";
    box.innerHTML = `<h3>Player options</h3>${page.players.map((player, index) => `<div class="load-row"><span>${esc(this._entityId(player))}</span><ha-button data-player="${index}">Apple TV options</ha-button></div>`).join("")}`;
    box.querySelectorAll("[data-player]").forEach((button) => button.addEventListener("click", () => this._openMediaDialog(Number(button.dataset.player))));
    host.append(box);
  }

  async _switchTab(tab) {
    this._cardDrag?.cancel();
    if (!this._loaded || this._busy) return;
    this._requestedTab = tab;
    if (tab === 'visual') { this._jsonForeground = false; this._updateHeader(); }
    if (tab === this._tab && (tab === "visual" || this._monaco)) return;
    if (tab === "visual") {
      try {
        const lifecycle = this._lifecycle, model = this._model;
        await this._ensureEditorContext();
        if (!this.isConnected || lifecycle !== this._lifecycle || model !== this._model || this._requestedTab !== 'visual') return;
        this._jsonViewState = this._monaco.saveViewState?.();
        const jsonSource = this._monaco.getValue();
        let parsed = JSON.parse(this._monaco.getValue());
        const legacy = parsed && this._catalog.config_version >= 2 && [undefined, 0, 1].includes(parsed.config_version);
        if (legacy) {
          const lifecycle = this._lifecycle;
          const payload = await this._hass.callWS({ type: 'marao_dashboard/config/get', config: this._monaco.getValue() });
          if (!this.isConnected || lifecycle !== this._lifecycle || this._requestedTab !== 'visual') return;
          parsed = JSON.parse(payload.config);
        }
        const errors = validateConfig(parsed, this._catalog.config_version, this._entities, this._catalog.energy_units, this._catalog);
        if (errors.length) throw new Error(errors.map((error) => this._l(error)).join(" "));
        const next = normalizeConfig(parsed);
        const changed = JSON.stringify(serializeConfig(next)) !== JSON.stringify(serializeConfig(this._model));
        this._jsonDraft = legacy ? null : jsonSource;
        if (changed) { this._model = next; this._documentEpoch++; this._pageTemplates = null; this._renderVisual(); }
        this._dirty = (legacy ? this._source() : jsonSource).trim() !== this._savedSource.trim(); this._updateHeader();
      } catch (error) {
        this._setStatus(`JSON: ${this._error(error)}`, "error"); return;
      }
    } else {
      try { await this._ensureMonaco(); }
      catch { return; }
      if (!this.isConnected || !this._monaco || this._requestedTab !== "json") return;
      this._setEditorSource(this._jsonDraft ?? this._source());
    }
    this._tab = tab;
    this.shadowRoot.querySelectorAll("[data-tab]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.tab === tab)));
    this.shadowRoot.getElementById("visual-view").hidden = tab !== "visual";
    this.shadowRoot.getElementById("json-view").hidden = tab !== "json";
    if (tab === "json") requestAnimationFrame(() => { this._monaco?.layout(); if (this._jsonViewState) this._monaco?.restoreViewState(this._jsonViewState); });
    this._setStatus("", "");
  }

  _jsonUrl(file, locale = false) {
    const url = new URL(`./${file}${PANEL_ASSET_VERSION}`, import.meta.url);
    if (locale) url.searchParams.set('language', this._hass?.language || 'en');
    return url.href;
  }

  _warmJsonResources() {
    if (this._jsonWarmed) return;
    this._jsonWarmed = true;
    for (const [file, locale] of [['MaraoDashboardJsonPreparation.js'], ['MaraoDashboardJsonEditor.js', true], ['MaraoDashboardJsonEditor.css'], ['MaraoDashboardJsonWorker.js'], ['MaraoDashboardEditorWorker.js']]) {
      const link = document.createElement('link'); link.rel = 'prefetch'; link.href = this._jsonUrl(file, locale);
      link.as = file.endsWith('.css') ? 'style' : 'script'; this.shadowRoot.append(link);
    }
  }

  async _nativeVisualReady() {
    const lifecycle = this._lifecycle;
    const root = this.shadowRoot.getElementById('visual-view');
    await Promise.all([
      ...[...root.querySelectorAll('ha-form')].map(form => this._formFitting?.get(form) || this._containForm(form)),
      ...[...root.querySelectorAll('ha-button,ha-icon-button,ha-expansion-panel')].map(async control => {
        await customElements.whenDefined(control.localName);
        await control.updateComplete;
      }),
    ]);
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (this.isConnected && lifecycle === this._lifecycle) {
      this._visualReady = true; this._visualReadyAt = performance.now(); this._resumeJsonPreparation();
    }
  }

  _resumeJsonPreparation() { this._resumeIdleStage?.(); }

  _idleStage() {
    if (this._jsonForeground && !this._busy) return Promise.resolve();
    const lifecycle = this._lifecycle;
    return new Promise((resolve, reject) => {
      let handle;
      const cleanup = () => { if (handle != null) globalThis.cancelIdleCallback?.(handle); handle = null; this._resumeIdleStage = null; this._cancelIdleStage = null; };
      this._cancelIdleStage = () => { cleanup(); reject(new Error('Obsolete editor preparation')); };
      const schedule = () => {
        if (!this.isConnected || lifecycle !== this._lifecycle) return this._cancelIdleStage?.();
        if (this._busy || this._interacting || this._scrolling || this.shadowRoot.querySelector('ha-dialog[open]') || document.hidden || !this._visualReady) return;
        if (this._jsonForeground) { cleanup(); resolve(); return; }
        if (!globalThis.requestIdleCallback || handle != null) return;
        handle = requestIdleCallback(deadline => {
          handle = null;
          if (this._busy || this._interacting || this._scrolling || this.shadowRoot.querySelector('ha-dialog[open]') || document.hidden || !this._visualReady) return;
          if (deadline.timeRemaining() < 8) { schedule(); return; }
          cleanup(); resolve();
        });
      };
      this._resumeIdleStage = schedule; schedule();
    });
  }

  async _jsonStage(name, action) {
    await this._idleStage();
    const start = performance.now();
    try { return await action(); }
    finally { this._preparationStages.push({ name, start, duration: performance.now() - start, foreground: this._jsonForeground }); }
  }

  _startJsonPreparation() {
    if (!this._loaded || !this.isConnected || !this._visualReady || this._busy) return;
    this._warmJsonResources();
    if (!this._contextReady) this._requestEditorContext().catch(() => {});
    if (this._jsonFailure || this._monaco) return;
    this._prepareJson().catch(() => {});
  }

  _ensureMonaco() {
    if (this._monaco && !this._jsonPreparing) return Promise.resolve();
    if (this._jsonFailure) return Promise.reject(this._jsonFailure);
    this._jsonForeground = true; this._resumeJsonPreparation();
    const attempt = this._prepareJson();
    this._jsonLoading = attempt; this._updateHeader();
    attempt.finally(() => { if (this._jsonLoading === attempt) { this._jsonLoading = null; this._updateHeader(); } }).catch(() => {});
    return attempt;
  }

  _prepareJson() {
    if (this._jsonPreparing) return this._jsonPreparing;
    if (this._monaco) return Promise.resolve();
    if (!this._loaded || !this.isConnected) return Promise.resolve();
    const lifecycle = this._lifecycle;
    const current = () => this.isConnected && lifecycle === this._lifecycle;
    const attempt = ++this._jsonAttempt;
    const preparation = Promise.resolve().then(async () => {
      try {
        const module = await this._jsonStage('preparation-module', async () => {
          if (this._jsonPreparationModule) return this._jsonPreparationModule;
          const url = new URL(this._jsonUrl('MaraoDashboardJsonPreparation.js'));
          if (attempt > 1) url.searchParams.set('retry', String(attempt));
          const module = await import(url.href);
          if (current()) this._jsonPreparationModule = module;
          return module;
        });
        if (current()) await module.prepareJson.call(this, current, attempt, serializeConfig);
      } catch (error) {
        if (!current()) return;
        this._monaco?.getModel()?.dispose(); this._monaco?.dispose(); this._monaco = null;
        this._jsonFailure = error; this._retryKind = 'json'; this._setStatus(this._t('jsonFailed') + this._error(error), 'error');
        throw error;
      } finally {
        if (current()) { this._jsonCancel = null; this._jsonForeground = false; this._updateHeader(); }
        if (this._jsonPreparing === preparation) this._jsonPreparing = null;
      }
    });
    this._jsonPreparing = preparation;
    return preparation;
  }

  _setMonacoTheme() {
    if (!this._monaco) return;
    this._jsonModule.setTheme(this._hass?.themes?.darkMode);

  }

  _setEditorSource(source) { if (!this._monaco || this._monaco.getValue() === source) return; this._jsonViewState = null; this._settingEditor = true; this._monaco.setValue(source); this._settingEditor = false; }

  async _save() {
    this._cardDrag?.cancel();
    if (this._busy || !this._loaded) return;
    const lifecycle = this._lifecycle, epoch = this._documentEpoch, model = this._model;
    const current = () => this.isConnected && lifecycle === this._lifecycle && epoch === this._documentEpoch && model === this._model;
    this._setBusy(true); this._setStatus(this._contextReady ? this._t('saving') : this._t('metadataLoading'), '');
    try {
      await this._ensureEditorContext();
      if (!current()) return;
      const source = this._tab === 'json' ? this._monaco.getValue() : this._source();
      let parsed = JSON.parse(source);
      if (parsed && !Object.hasOwn(parsed, 'name') && Object.hasOwn(parsed, 'title') && Object.hasOwn(parsed, 'views')) {
        const preview = await this._hass.callWS({ type: 'marao_dashboard/config/get', config: source });
        if (!current()) return;
        parsed = JSON.parse(preview.config);
      }
      const errors = validateConfig(parsed, this._catalog.config_version, this._entities, this._catalog.energy_units, this._catalog);
      if (errors.length) throw new Error(errors.map(error => this._l(error)).join(' '));
      this._setStatus(this._t('saving'), '');
      const result = await this._hass.callWS({ type: 'marao_dashboard/config/generate', config: source });
      if (!current()) return;
      this._model = normalizeConfig(JSON.parse(result.config || source)); this._documentEpoch++;
      this._jsonDraft = null; this._pageTemplates = null;
      this._historyEpoch++; this._history = result.history; this._historyLoaded = Array.isArray(result.history);
      this._savedSource = this._source(); this._dirty = false;
      this.shadowRoot.getElementById('open-dashboard').href = result.dashboard_url;
      this._dashboardUrl = result.dashboard_url;
      this._setEditorSource(this._savedSource); this._renderVisual(); this._updateHeader();
      this._setStatus(result.config_changed ? 'Generated. Restart Home Assistant once to load the changed dashboard registration.' : 'Dashboard generated successfully.', 'success');
    } catch (error) { if (this.isConnected && lifecycle === this._lifecycle) { if (!this._contextReady) this._contextFailure(error); else this._setStatus(this._error(error), 'error'); } }
    finally { if (this.isConnected && lifecycle === this._lifecycle) this._setBusy(false); }
  }

  _discard() {
    this._cardDrag?.cancel();
    if (this._dirty && !confirm("Discard all unsaved changes?")) return;
    this._load(true);
  }

  _openRoomDialog(index = null) {
    const existing = index == null ? null : this._model.rooms[index];
    const data = existing ? { name: existing.name, path: existing.path || "", icon: existing.icon || "", area: existing.area || "", columns: existing.columns ? String(existing.columns) : "auto" } : { area_import: "", area: "", name: "", path: "", icon: "mdi:sofa-outline", columns: "auto" };
    const schema = [];
    if (!existing) schema.push(this._schema("area_import", "Import Home Assistant area", { area: {} }));
    schema.push(this._schema("area", "Suggestion area", { area: {} }));
    schema.push(this._schema("name", "Room name", { text: {} }, true), this._schema("path", "Path", { text: {} }), this._schema("icon", "Icon", { icon: {} }), this._columnsSchema());
    this._openFormDialog(existing ? "Edit room" : "Add room", data, schema, (value) => {
      let room = existing ? { ...existing } : null;
      if (!existing && value.area_import) {
        const area = this._areas.find((item) => item.area_id === value.area_import);
        if (area) room = importAreaRoom(area, this._entities, this._catalog.supported_domains);
      }
      room ||= { entities: [] };
      if (value.area || !existing && value.area_import) room.area = value.area || value.area_import; else delete room.area;
      room.name = value.name || room.name || "Room";
      room.path = value.path || room.path || `room-${slugify(room.name)}`;
      room.icon = value.icon || room.icon || "mdi:sofa-outline";
      const columns = Number(value.columns);
      if (Number.isInteger(columns) && columns >= 1 && columns <= 6) room.columns = columns; else delete room.columns;
      if (index == null) this._model.rooms.push(room); else this._model.rooms[index] = room;
      this._setDirty(); this._renderVisual();
    });
  }

  _openCustomPageDialog(index = null) {
    const pages = this._model.pages.custom ||= [];
    const existing = index == null ? null : pages[index];
    const data = existing
      ? { name: existing.name, path: existing.path || "", icon: existing.icon || "", columns: existing.columns ? String(existing.columns) : "auto" }
      : { name: "", path: "", icon: "mdi:file-outline", columns: "auto" };
    this._openFormDialog(existing ? "Edit custom page" : this._t("addCustomPage"), data, [
      this._schema("name", "Page name", { text: {} }, true),
      this._schema("path", "Path", { text: {} }, true),
      this._schema("icon", "Icon", { icon: {} }),
      this._columnsSchema(),
    ], (value) => {
      const page = existing ? { ...existing } : { entities: [], __hadEntities: true };
      const oldPath = page.path;
      page.name = value.name || "Page";
      page.path = slugify(value.path || page.name);
      page.icon = value.icon || "mdi:file-outline";
      const columns = Number(value.columns);
      if (Number.isInteger(columns) && columns >= 1 && columns <= 6) page.columns = columns; else delete page.columns;
      if (index == null) pages.push(page); else pages[index] = page;
      if (oldPath && oldPath !== page.path) this._replacePagePath(oldPath, page.path);
      this._setDirty(); this._renderVisual();
    });
  }

  _replacePagePath(oldPath, newPath) {
    if (Array.isArray(this._model.navigation)) {
      this._model.navigation = this._model.navigation.map((entry) => {
        if (entry === oldPath) return newPath;
        if (entry?.page === oldPath) return { ...entry, page: newPath };
        return entry;
      });
    }
    for (const container of [...this._model.rooms, ...(this._model.pages.custom || [])]) {
      container.entities = (container.entities || []).map((item) => item.page === oldPath ? { ...item, page: newPath } : item);
    }
  }

  _columnsSchema() {
    return this._schema("columns", "Columns", { select: { mode: "dropdown", options: [
      { value: "auto", label: this._l("Automatic") },
      ...Array.from({ length: 6 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })),
    ] } });
  }

  _openCardGallery(roomIndex, kind = "room") {
    if (!this._contextReady) return this._withEditorContext(() => this._openCardGallery(roomIndex, kind));
    if (this._galleryDialog?.open) return;
    const dialog = this._dialog(this._t('chooseCard'));
    this._galleryDialog = dialog;
    const content = dialog.querySelector(".dialog-content");
    content.innerHTML = `<div class="add-tabs" role="tablist" aria-label="${esc(this._t('addCard'))}"><button type="button" role="tab" id="by-type" aria-controls="type-cards" aria-selected="true" tabindex="0">${this._t('byType')}</button><button type="button" role="tab" id="by-entity" aria-controls="entity-cards" aria-selected="false" tabindex="-1">${this._t('byEntity')}</button></div><section id="type-cards" role="tabpanel" aria-labelledby="by-type"><div class="gallery">${this._catalog.cards.map((card) => `<button type="button" class="gallery-card" data-card="${card.id}"><ha-icon icon="${card.icon}"></ha-icon><span><strong>${esc(this._l(card.label))}</strong><small>${esc(this._l(card.description))}</small></span></button>`).join("")}</div></section><section id="entity-cards" role="tabpanel" aria-labelledby="by-entity" hidden><label for="entity-search">${this._t('searchEntities')}</label><input type="search" id="entity-search" autocomplete="off"><div class="entity-results" aria-live="polite"></div></section><div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button></div>`;
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelectorAll("[data-card]").forEach((button) => button.addEventListener("click", () => { const cardId = button.dataset.card; this._closeDialog(dialog); this._openCardEditor(roomIndex, null, cardId, kind); }));
    const search = content.querySelector('#entity-search'), results = content.querySelector('.entity-results');
    let loading = true, failure = '';
    const renderResults = () => {
      if (loading) { results.textContent = this._t('metadataLoading'); return; }
      if (failure) {
        results.innerHTML = `<p role="alert">${esc(this._t('metadataFailed') + failure)}</p><ha-button data-retry>${this._t('retry')}</ha-button>`;
        results.querySelector('[data-retry]').addEventListener('click', refresh);
        return;
      }
      const container = { ...this._container(kind, roomIndex), ...(kind === 'page' ? { area: this._model.pages[Number(String(roomIndex).split(':')[0])].area } : {}) }, query = search.value.trim();
      const areaSuggestions = kind === 'room' || kind === 'page' && Boolean(container.area);
      const candidates = !query && areaSuggestions && !this._areas.some(area => area.area_id === container.area) ? [] : entityCandidates(this._catalog, this._entities, areaSuggestions ? container : { ...container, area: undefined }, query);
      const empty = query ? 'noResults' : !areaSuggestions ? 'globalSearch' : !container.area ? 'noArea' : !this._areas.some(area => area.area_id === container.area) ? 'missingArea' : 'noSuggestions';
      results.innerHTML = `${!query && areaSuggestions ? `<h3>${this._t('suggestions')}</h3>` : ''}${candidates.length ? candidates.map(entity => `<button type="button" class="gallery-card" data-entity="${esc(entity.entity_id)}" ${entity.added ? 'disabled' : ''}><ha-icon icon="${esc(entity.card.icon)}"></ha-icon><span><strong>${esc(entity.name || entity.entity_id)}</strong><small>${esc(entity.entity_id)}</small><small>${esc(this._l(entity.card.label))}${entity.added ? ' · ' + this._t('alreadyAdded') : ''}</small>${['unknown', 'unavailable'].includes(entity.state) ? `<small>${this._t(entity.state)}</small>` : ''}</span></button>`).join('') : `<p>${this._t(empty)}</p>`}`;
      results.querySelectorAll('[data-entity]').forEach(button => button.addEventListener('click', () => {
        const entity = candidates.find(item => item.entity_id === button.dataset.entity);
        if (configuredEntityIds(this._container(kind, roomIndex)).has(entity.entity_id)) { renderResults(); return; }
        this._closeDialog(dialog); this._openCardEditor(roomIndex, null, entity.card.id, kind, entity.entity_id);
      }));
    };
    const refresh = async () => {
      loading = true; failure = ''; renderResults();
      try { await this._refreshEditorMetadata(); }
      catch (error) { failure = this._error(error); }
      if (!dialog.isConnected || !dialog.open) return;
      loading = false; renderResults();
    };
    search.addEventListener('input', renderResults);
    for (const [index, tab] of [...content.querySelectorAll('[role="tab"]')].entries()) {
      const select = () => {
        content.querySelectorAll('[role="tab"]').forEach(button => { button.setAttribute('aria-selected', String(button === tab)); button.tabIndex = button === tab ? 0 : -1; });
        content.querySelector('#type-cards').hidden = index !== 0; content.querySelector('#entity-cards').hidden = index !== 1;
      };
      tab.addEventListener('click', select);
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const next = content.querySelectorAll('[role="tab"]')[event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index]; next.click(); next.focus();
      });
    }
    loading = false; renderResults();
  }

  _requestEditorContext() {
    if (this._contextPayload) return Promise.resolve(this._contextPayload);
    if (this._contextRequest) return this._contextRequest;
    if (this._contextError) return Promise.reject(this._contextError);
    const lifecycle = this._lifecycle, epoch = this._documentEpoch;
    const request = Promise.resolve().then(() => this._hass.callWS({ type: 'marao_dashboard/config/get', scope: 'context' })).then(payload => {
      if (!Array.isArray(payload.editor?.entities) || !Array.isArray(payload.editor?.areas) || !Array.isArray(payload.editor?.catalog?.cards)) throw new Error(this._t('metadataFailed'));
      if (this.isConnected && lifecycle === this._lifecycle && epoch === this._documentEpoch) this._contextPayload = { ...payload, epoch };
      return { ...payload, epoch };
    }).catch(error => { if (lifecycle === this._lifecycle) this._contextError = error; throw error; });
    this._contextRequest = request;
    request.finally(() => { if (this._contextRequest === request) this._contextRequest = null; }).catch(() => {});
    return request;
  }

  _ensureEditorContext(retry = false) {
    if (this._contextReady && !retry) return Promise.resolve();
    if (this._metadataLoading) return this._metadataLoading;
    if (retry) { this._contextError = null; this._contextPayload = null; }
    const lifecycle = this._lifecycle, epoch = this._documentEpoch;
    const loading = this._requestEditorContext().then(payload => {
      if (!this.isConnected || lifecycle !== this._lifecycle || epoch !== this._documentEpoch) return;
      this._entities = payload.editor.entities; this._areas = payload.editor.areas; this._catalog = payload.editor.catalog;
      this._contextReady = true;
      if (this._retryKind === 'context') { this._retryKind = null; this._updateHeader(); }
      // Source-dependent templates never revive an older document's projection.
      if (payload.epoch === this._documentEpoch && payload.page_templates) this._pageTemplates = payload.page_templates;
      this._jsonAssistance?.updateMetadata(this._catalog, this._entities, serializeConfig(this._model));
    });
    this._metadataLoading = loading;
    loading.finally(() => { if (this._metadataLoading === loading) this._metadataLoading = null; }).catch(() => {});
    return loading;
  }

  _refreshEditorMetadata() { return this._ensureEditorContext(true); }

  _contextFailure(error) {
    this._retryKind = 'context'; this._setStatus(this._t('metadataFailed') + this._error(error), 'error'); this._updateHeader();
  }

  _withEditorContext(action, current = () => true) {
    if (this._contextReady) return action();
    const lifecycle = this._lifecycle, model = this._model, revision = this._revision;
    this._setStatus(this._t('metadataLoading'), '');
    return this._ensureEditorContext().then(() => {
      if (!this.isConnected || lifecycle !== this._lifecycle || model !== this._model || revision !== this._revision || !current() || this._busy) return;
      this._setStatus('', ''); return action();
    }).catch(error => this._contextFailure(error));
  }

  _openCardEditor(roomIndex, cardIndex = null, selectedCardId = null, kind = "room", prefilledEntity = null, memberOptions = null) {
    if (!this._contextReady) return this._withEditorContext(() => this._openCardEditor(roomIndex, cardIndex, selectedCardId, kind, prefilledEntity, memberOptions));
    const existing = memberOptions ? memberOptions.entity : cardIndex == null ? null : this._editableContainer(kind, roomIndex).entities[cardIndex];
    if (selectedCardId === 'hc_entity_group_card' || existing?.template === 'hc_entity_group_card') return this._openEntityGroupEditor(roomIndex, cardIndex, kind);
    const metadata = entityMeta(this._entities, existing?.entity_id);
    const selected = this._catalog.cards.find((card) => card.id === (selectedCardId || existing?.template || (existing?.page ? "hc_navigation_card" : ""))) || cardForEntity(this._catalog, metadata || existing) || this._catalog.cards[0];
    const shortcut = Boolean(selected.page_shortcut);
    const camera = selected.id === 'hc_camera_card', titleFields = camera ? cameraTitleFields() : [];
    const titleData = camera ? { ...formData(existing || {}, titleFields), name: existing?.name || '' } : null;
    const dialog = this._dialog(`${this._t(existing ? 'edit' : 'add')} ${this._l(selected.label)}`);
    const data = shortcut
      ? { page: existing?.page || "", entity_id: existing?.entity_id || '', name: existing?.name || "", icon: existing?.icon || selected.icon }
      : { entity_id: existing?.entity_id || prefilledEntity || "", name: existing?.name || "", icon: existing?.icon || "" };
    if (camera) Object.assign(data, titleData);
    let collection = clone(existing?.entities || []);
    if (selected.scene_collection) data.scene_entities = this._entityIds(collection);
    for (const field of this._expandedFields(selected.variables)) data[`var__${field.key}`] = this._readVariable(existing?.variables, field);
    const initialData = clone(data);
    const content = dialog.querySelector(".dialog-content");
    const variables = this._expandedFields(selected.variables);
    const basic = variables.filter((field) => !field.advanced);
    const advanced = variables.filter((field) => field.advanced);
    content.innerHTML = `<div id="card-form"></div><div id="summary" class="summary"></div>${selected.scene_collection ? '<div id="scene-order"></div>' : ''}${selected.id === 'hc_media_card' ? `<ha-button data-media-options>${this._l('Apple TV options')}</ha-button>` : ''}${advanced.length ? `<ha-expansion-panel id="advanced-panel" outlined><div slot="header">${this._t("advanced")}</div><div id="advanced-form" class="advanced-form"></div></ha-expansion-panel>` : ""}<div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button><ha-button data-save appearance="filled">${existing ? this._t("update") : this._t("create")}</ha-button></div>`;
    const renderCollection = () => {
      if (!selected.scene_collection) return;
      this._renderSceneOrder(content.querySelector('#scene-order'), collection, next => {
        collection = next; data.scene_entities = this._entityIds(next); content.querySelector('#card-form ha-form').data = { ...data }; renderCollection();
      }, index => {
        const member = typeof collection[index] === 'string' ? { entity_id: collection[index] } : collection[index];
        this._openFormDialog('Edit card', { name: member.name || '', icon: member.icon || '' }, [this._schema('name', 'Display name', { text: {} }), this._schema('icon', 'Icon', { icon: {} })], value => {
          const next = { ...member };
          for (const key of ['name', 'icon']) if (value[key]) next[key] = value[key]; else delete next[key];
          collection[index] = next; renderCollection();
        });
      });
    };
    let appleTV = clone(existing?.apple_tv);
    if (selected.id === 'hc_media_card') content.querySelector('[data-media-options]').addEventListener('click', () => this._openMediaOptions({ entity_id: data.entity_id, apple_tv: appleTV }, value => { appleTV = value; }));
    const changed = (value) => {
      Object.assign(data, value);
      if (selected.scene_collection) { collection = mergeEntityValues(collection, data.scene_entities || []); renderCollection(); }
      this._renderSummary(content.querySelector("#summary"), shortcut ? data.page : data.entity_id, selected, roomIndex, cardIndex, kind); this._refreshEnergyFields(content, selected.id === "hc_switch_card" ? data.var__power_entity : data.entity_id);
    };
    const pageOptions = this._availablePages().filter((page) => kind !== "custom" || page.path !== this._container(kind, roomIndex).path).map((page) => ({ value: page.path, label: page.name }));
    const schema = [
      ...(shortcut ? [this._schema("page", "Target page", { select: { mode: "dropdown", options: pageOptions } }, true)] : []),
      ...(!selected.entity_optional && !shortcut || selected.id === 'hc_room_card' ? [this._schema("entity_id", selected.id === 'hc_room_card' ? 'Primary source' : camera ? 'Dashboard stream' : 'Entity', { entity: { domain: selected.domains } }, !selected.entity_optional)] : []),
      ...(camera ? titleFields.map(field => this._schema(field.path, field.label, { [field.kind]: {} }))
        : [this._schema("name", "Display name", { text: {} }), this._schema("icon", "Icon", { icon: {} })]),
      ...(selected.scene_collection ? [this._schema('scene_entities', 'Scenes', { entity: { domain: ['scene', 'switch', 'input_boolean'], multiple: true } })] : []),
      ...basic.map((field) => this._variableSchema(field, selected.id === "hc_switch_card" ? data.var__power_entity : data.entity_id)),
    ];
    this._mountForm(content.querySelector("#card-form"), data, schema, changed);
    if (advanced.length) this._mountForm(content.querySelector("#advanced-form"), data, advanced.map((field) => this._variableSchema(field)), changed);
    this._renderSummary(content.querySelector("#summary"), shortcut ? data.page : data.entity_id, selected, roomIndex, cardIndex, kind);
    renderCollection();
    content.querySelector("[data-close]").addEventListener("click", () => { this._closeDialog(dialog); memberOptions?.cancel(); });
    content.querySelector("[data-save]").addEventListener("click", () => {
        const target = shortcut ? data.page : data.entity_id;
        if (!target && (shortcut || !selected.entity_optional)) { this._renderSummary(content.querySelector("#summary"), "", selected, roomIndex, cardIndex, kind, shortcut ? "Select a page first." : "Select an entity first."); return; }
        if (prefilledEntity && configuredEntityIds(this._container(kind, roomIndex)).has(target)) {
          this._renderSummary(content.querySelector("#summary"), target, selected, roomIndex, cardIndex, kind, this._t('alreadyAdded')); return;
        }
        let entity = existing ? { ...existing } : { __simple: false };
        entity.template = selected.id; entity.__simple = false;
        if (shortcut) { entity.page = data.page; if (selected.id === 'hc_room_card' && data.entity_id) entity.entity_id = data.entity_id; else delete entity.entity_id; }
        else { if (data.entity_id) entity.entity_id = data.entity_id; else delete entity.entity_id; delete entity.page; }
        if (kind === 'page' && !entity.id) entity.id = newEntityGroupId().replace('group-', 'card-');
        if (data.name !== (camera ? titleData.name : existing?.name)) delete entity.name_key;
        if (selected.scene_collection) entity.entities = collection;
        if (selected.id === 'hc_media_card' && appleTV !== undefined) entity.apple_tv = appleTV;
        if (camera) entity = patchForm(entity, titleFields, titleData, data);
        else {
          if (data.name) entity.name = data.name; else delete entity.name;
          if (data.icon) entity.icon = data.icon; else delete entity.icon;
        }
        const variablesObject = { ...(existing?.variables || {}) };
        try { for (const field of this._expandedFields(selected.variables)) {
          const key = `var__${field.key}`;
          if (!existing || !sameFormValue(initialData[key], data[key])) this._writeVariable(variablesObject, field, data[key]);
        } }
        catch (error) { this._renderSummary(content.querySelector('#summary'), target, selected, roomIndex, cardIndex, kind, this._error(error)); return; }
        if (Object.keys(variablesObject).length) entity.variables = variablesObject; else delete entity.variables;
        if (memberOptions) { delete entity.__simple; this._closeDialog(dialog); memberOptions.save(entity); return; }
        const container = this._editableContainer(kind, roomIndex);
        if (cardIndex == null) container.entities.push(entity); else container.entities[cardIndex] = entity;
        this._closeDialog(dialog); this._setDirty(); this._refreshCards(kind, roomIndex);
    });
  }

  _openEntityGroupEditor(roomIndex, cardIndex = null, kind = 'room', draft = null) {
    if (!this._contextReady) return this._withEditorContext(() => this._openEntityGroupEditor(roomIndex, cardIndex, kind, draft));
    const existing = draft || (cardIndex == null ? null : this._container(kind, roomIndex).entities[cardIndex]);
    const group = clone(existing || { template: 'hc_entity_group_card', id: newEntityGroupId(), entities: [] });
    const data = { name: group.name || this._l('Entity Group'), icon: group.icon || '', entity_type: group.entity_type || 'light',
      popup_filter: group.popup_filter || (group.entity_type && group.entity_type !== 'light' ? 'all' : 'active') };
    let members = clone(group.entities), loading = !draft, failure = '', filterEdited = Boolean(existing);
    const dialog = this._dialog(this._l('Entity Group')), content = dialog.querySelector('.dialog-content');
    content.innerHTML = `<div id="group-form"></div><h3>${this._l('Members')}</h3><div id="group-members"></div><label for="entity-search">${this._t('searchEntities')}</label><input type="search" id="entity-search" autocomplete="off"><div id="group-results" class="entity-results" aria-live="polite"></div><p id="group-error" role="alert"></p><div class="dialog-actions"><ha-button data-close>${this._t('cancel')}</ha-button><ha-button data-save appearance="filled">${this._t(cardIndex == null ? 'create' : 'update')}</ha-button></div>`;
    const search = content.querySelector('#entity-search'), results = content.querySelector('#group-results');
    const current = () => ({ ...group, ...data, entities: members });
    const render = () => {
      const host = content.querySelector('#group-members');
      host.innerHTML = members.map((member, index) => {
        const entity_id = this._entityId(member), metadata = entityMeta(this._entities, entity_id);
        const source = typeof member === 'string' ? { entity_id } : member;
        const compatible = entityGroupMemberCompatible(data.entity_type, source, metadata, ['overview', 'page'].includes(kind) && group.id === 'overview-maintenance' && entity_id.includes('battery'));
        const warning = !compatible ? this._l('Incompatible member') : !metadata ? this._l('Missing entity') : ['unknown', 'unavailable'].includes(metadata.state) ? this._t(metadata.state) : '';
        return `<div class="entity-row"><div class="entity-icon"><ha-icon icon="${esc(source.icon || metadata?.icon || 'mdi:view-list')}"></ha-icon></div><div class="entity-main"><div class="entity-name">${esc(source.name || metadata?.name || entity_id)}</div><div class="entity-meta">${esc(entity_id)}${warning ? ' · ' + esc(warning) : ''}</div></div><div class="row-actions">${this._iconButton('mdi:arrow-up', 'Move up', 'member-up', index, index === 0)}${this._iconButton('mdi:arrow-down', 'Move down', 'member-down', index, index === members.length - 1)}${this._iconButton('mdi:pencil', this._t('edit'), 'member-edit', index)}${this._iconButton('mdi:delete-outline', this._t('delete'), 'member-delete', index)}</div></div>`;
      }).join('');
      host.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
        const index = Number(button.dataset.room), action = button.dataset.action;
        if (action === 'member-edit') {
          const retained = current();
          this._closeDialog(dialog);
          this._openCardEditor(roomIndex, null, null, kind, null, {
            entity: flattenEntities([members[index]])[0],
            save: value => { retained.entities[index] = value; this._openEntityGroupEditor(roomIndex, cardIndex, kind, retained); },
            cancel: () => this._openEntityGroupEditor(roomIndex, cardIndex, kind, retained),
          });
          return;
        }
        if (action === 'member-delete') members.splice(index, 1);
        else members = moveItem(members, index, index + (action === 'member-up' ? -1 : 1));
        render();
      }));
      if (loading) { results.textContent = this._t('metadataLoading'); return; }
      if (failure) {
        results.innerHTML = `<p role="alert">${esc(this._t('metadataFailed') + failure)}</p><ha-button data-retry>${this._t('retry')}</ha-button>`;
        results.querySelector('[data-retry]').addEventListener('click', refresh); return;
      }
      const candidates = entityCandidates(this._catalog, this._entities, current(), search.value);
      results.innerHTML = candidates.length ? candidates.map(entity => `<button type="button" class="gallery-card" data-entity="${esc(entity.entity_id)}" ${entity.added ? 'disabled' : ''}><ha-icon icon="${esc(entity.card.icon)}"></ha-icon><span><strong>${esc(entity.name || entity.entity_id)}</strong><small>${esc(entity.entity_id)}${entity.added ? ' · ' + this._t('alreadyAdded') : ''}${['unknown','unavailable'].includes(entity.state) ? ' · ' + this._t(entity.state) : ''}</small></span></button>`).join('') : `<p>${this._t('noResults')}</p>`;
      results.querySelectorAll('[data-entity]').forEach(button => button.addEventListener('click', () => {
        if (!members.some(member => this._entityId(member) === button.dataset.entity)) members.push(button.dataset.entity);
        render();
      }));
    };
    const refresh = async () => {
      loading = true; failure = ''; render();
      try { await this._refreshEditorMetadata(); } catch (error) { failure = this._error(error); }
      if (!dialog.isConnected || !dialog.open) return;
      loading = false; render();
    };
    this._mountForm(content.querySelector('#group-form'), data, [
      this._schema('name', 'Group name', { text: {} }, true), this._schema('icon', 'Icon', { icon: {} }),
      this._schema('entity_type', 'Entity type', { select: { mode: 'dropdown', options: [['light','Light'],['cover','Cover'],['battery','Battery'],['climate','Climate']].map(([value,label]) => ({ value, label: this._l(label) })) } }, true),
      this._schema('popup_filter', 'Popup filter', { select: { mode: 'dropdown', options: [['all','All entities'],['active','Active only']].map(([value,label]) => ({ value, label: this._l(label) })) } }, true),
    ], value => {
      filterEdited ||= value.popup_filter !== data.popup_filter;
      if (value.entity_type !== data.entity_type && !filterEdited) value.popup_filter = value.entity_type === 'light' ? 'active' : 'all';
      Object.assign(data, value); content.querySelector('#group-form ha-form').data = { ...data }; render();
    });
    search.addEventListener('input', render);
    content.querySelector('[data-close]').addEventListener('click', () => this._closeDialog(dialog));
    content.querySelector('[data-save]').addEventListener('click', () => {
      const value = current();
      const validation = kind === 'page' ? { config_version: 2, name: this._model.name, landing_page: 'group', pages: [{ name: 'Group', path: 'group', entities: [value] }] } : kind === 'overview' ? { name: this._model.name, rooms: [], overview: { entity_groups: [value] } }
        : { name: this._model.name, rooms: [{ name: 'Group', entities: [value] }] };
      const errors = validateConfig(validation, this._catalog.config_version, this._entities, this._catalog.energy_units, this._catalog);
      if (errors.length) { content.querySelector('#group-error').textContent = errors.map(error => this._l(error)).join(' '); return; }
      const container = this._editableContainer(kind, roomIndex);
      if (cardIndex == null) container.entities = [...container.entities, value]; else container.entities[cardIndex] = value;
      this._closeDialog(dialog); this._setDirty(); this._refreshCards(kind, roomIndex);
    });
    loading = false; render();
  }

  _renderSummary(host, target, card, roomIndex, cardIndex, kind = "room", error = "") {
    const container = this._container(kind, roomIndex);
    if (card.entity_optional && !card.page_shortcut) {
      host.innerHTML = error ? `<strong style="color:var(--error-color)">${esc(this._l(error))}</strong>` : `<strong>${esc(this._l(card.label))}</strong><span>${esc(this._l(card.description))}</span>`;
      return;
    }
    if (card.page_shortcut) {
      const page = this._availablePages().find((item) => item.path === target);
      const duplicate = container.entities.some((item, index) => item.page === target && index !== cardIndex);
      host.innerHTML = error ? `<strong style="color:var(--error-color)">${esc(this._l(error))}</strong>` : !target ? `<strong>${esc(this._l("Choose a target page"))}</strong><span>${esc(this._l("The shortcut will navigate to another generated page."))}</span>` : !page ? `<strong>${esc(target)}</strong><span style="color:var(--warning-color)">${esc(this._l("This page is not currently generated."))}</span>` : `<strong>${esc(page.name)}</strong><span>${esc(page.path)}${duplicate ? " · " + this._l("Already linked from this page") : ""}</span>`;
      return;
    }
    const metadata = entityMeta(this._entities, target);
    const duplicate = configuredEntityIds({ ...container, entities: container.entities.filter((_item, index) => index !== cardIndex) }).has(target);
    const area = metadata?.area_id ? metadata.area_name : metadata?.device_area_name;
    host.innerHTML = error ? `<strong style="color:var(--error-color)">${esc(this._l(error))}</strong>` : !target ? `<strong>${esc(this._l("Choose a compatible entity"))} · ${esc(this._l(card.label))}</strong><span>${esc(this._l("Search by friendly name or entity ID."))}</span>` : !metadata ? `<strong>${esc(target)}</strong><span style="color:var(--warning-color)">${esc(this._l("This entity is not currently available in Home Assistant."))}</span>` : `<strong>${esc(metadata.name || metadata.entity_id)}</strong><span>${esc(this._l(metadata.state || "unknown"))} · ${esc(area || this._l("No area"))} · ${esc(this._l(card.label))}${duplicate ? " · " + this._l("Already added to this page") : ""}</span>`;
  }

  _openLoadDialog(index = null) {
    const page = this._model.pages.energy;
    const load = index == null ? {} : page.loads[index];
    const data = { power_entity: this._entityId(load.power_entity), toggle_entity: load.toggle_entity || "", name: load.name || "", icon: load.icon || "", template: load.template || (load.toggle_entity ? "hc_toggle_graph_card" : "hc_graph_card") };
    const fields = this._catalog.energy_fields || [];
    const options = {...(load.power_entity?.variables || {}), ...(load.variables || {})};
    for (const field of fields) data[`var__${field.key}`] = this._readVariable(options, field);
    this._openFormDialog(index == null ? "Add energy load" : "Edit energy load", data, [
      this._schema("power_entity", "Power entity", { entity: { domain: ["sensor"] } }, true),
      this._schema("toggle_entity", "Related toggle", { entity: { domain: ["switch", "input_boolean"] } }),
      this._schema("name", "Name", { text: {} }), this._schema("icon", "Icon", { icon: {} }),
      this._schema("template", "Card", { select: { mode: "dropdown", options: [{ value: "hc_graph_card", label: "Graph" }, { value: "hc_toggle_graph_card", label: "Toggle graph" }] } }),
      ...fields.map(field => this._variableSchema(field, data.power_entity)),
    ], (value) => {
      const next = { ...load };
      for (const key of ["toggle_entity", "name", "icon", "template"]) next[key] = value[key];
      next.power_entity = preserveEntityValue(load.power_entity, value.power_entity);
      const variables = {...(load.variables || {})};
      for (const field of fields) this._writeVariable(variables, field, value[`var__${field.key}`]);
      // The load owns formatting; remove only these overrides from a nested source.
      if (next.power_entity?.variables) {
        next.power_entity = clone(next.power_entity);
        for (const field of fields) delete next.power_entity.variables[field.key];
        if (!Object.keys(next.power_entity.variables).length) delete next.power_entity.variables;
      }
      if (Object.keys(variables).length) next.variables = variables; else delete next.variables;
      if (!next.toggle_entity) delete next.toggle_entity;
      page.loads ||= []; if (index == null) page.loads.push(next); else page.loads[index] = next;
      this._setDirty(); this._renderVisual();
    });
  }

  _openMediaDialog(index) {
    const page = this._model.pages.media;
    const values = Array.isArray(page.players) ? page.players : (page.players ? [page.players] : []);
    page.players = values;
    const player = typeof values[index] === "string" ? { entity_id: values[index] } : clone(values[index]);
    const options = player.apple_tv && typeof player.apple_tv === "object" ? player.apple_tv : {};
    const data = { remote_entity: options.remote_entity || "", volume_remote_entity: options.volume_remote_entity || "", apps: (options.apps || []).map((app) => `${app.name || app.source}|${app.source}|${app.icon || ""}`).join("\n") };
    this._openFormDialog("Apple TV options", data, [
      this._schema("remote_entity", "Remote entity", { entity: { domain: ["remote"] } }),
      this._schema("volume_remote_entity", "Volume remote", { entity: { domain: ["remote", "media_player"] } }),
      this._schema("apps", "Apps — Name | Source | Icon", { text: { multiline: true } }),
    ], (value) => {
      player.apple_tv = { remote_entity: value.remote_entity || undefined, volume_remote_entity: value.volume_remote_entity || undefined, apps: String(value.apps || "").split("\n").map((line) => line.split("|").map((part) => part.trim())).filter((parts) => parts[1]).map(([name, source, icon]) => ({ name: name || source, source, ...(icon ? { icon } : {}) })) };
      values[index] = player; this._setDirty(); this._renderVisual();
    });
  }

  _openMediaOptions(player, save) {
    if (!this._contextReady) return this._withEditorContext(() => this._openMediaOptions(player, save));
    const original = player.apple_tv && typeof player.apple_tv === 'object' ? clone(player.apple_tv) : {};
    const data = { enabled: player.apple_tv !== false && (Boolean(player.apple_tv) || /apple[_ ]?tv/i.test(player.entity_id || '')),
      remote_entity: original.remote_entity || '', volume_remote_entity: original.volume_remote_entity || '' };
    let apps = clone(original.apps || []);
    const dialog = this._dialog(this._l('Apple TV options')), content = dialog.querySelector('.dialog-content');
    content.innerHTML = `<div id="media-form"></div><h3>${this._l('Apps')}</h3><div id="app-list"></div><ha-button data-add-app>${this._l('Add app')}</ha-button><p data-error role="alert"></p><div class="dialog-actions"><ha-button data-close>${this._t('cancel')}</ha-button><ha-button data-save appearance="filled">${this._t('update')}</ha-button></div>`;
    const editApp = index => {
      const existing = index == null ? {} : apps[index];
      this._openFormDialog(index == null ? 'Add app' : 'Edit app', { name: existing.name || '', source: existing.source || '', icon: existing.icon || '' }, [
        this._schema('name', 'Display name', { text: {} }), this._schema('source', 'App source', { text: {} }, true), this._schema('icon', 'Icon', { icon: {} }),
      ], value => {
        if (!String(value.source || '').trim()) throw new Error('Media app requires an explicit source.');
        const next = { ...existing, source: value.source };
        for (const key of ['name', 'icon']) if (value[key]) next[key] = value[key]; else delete next[key];
        if (index == null) apps.push(next); else apps[index] = next;
        render();
      });
    };
    const render = () => {
      const list = content.querySelector('#app-list');
      list.innerHTML = apps.map((app, index) => `<div class="entity-row"><div class="entity-icon"><ha-icon icon="${esc(app.icon || 'mdi:play-box-outline')}"></ha-icon></div><div class="entity-main"><div class="entity-name">${esc(app.name || app.source)}</div><div class="entity-meta">${esc(app.source)}</div></div><div class="row-actions">${this._iconButton('mdi:arrow-up', 'Move up', 'app-up', index, index === 0)}${this._iconButton('mdi:arrow-down', 'Move down', 'app-down', index, index === apps.length - 1)}${this._iconButton('mdi:pencil', 'Edit app', 'app-edit', index)}${this._iconButton('mdi:delete-outline', this._t('delete'), 'app-delete', index)}</div></div>`).join('');
      list.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
        const index = Number(button.dataset.room), action = button.dataset.action;
        if (action === 'app-edit') { editApp(index); return; }
        if (action === 'app-delete') apps.splice(index, 1); else apps = moveItem(apps, index, index + (action === 'app-up' ? -1 : 1));
        render();
      }));
    };
    this._mountForm(content.querySelector('#media-form'), data, [this._schema('enabled', 'Apple TV controls', { boolean: {} }),
      this._schema('remote_entity', 'Remote entity', { entity: { domain: ['remote'] } }),
      this._schema('volume_remote_entity', 'Volume remote', { entity: { domain: ['remote', 'media_player'] } })], value => Object.assign(data, value));
    content.querySelector('[data-add-app]').addEventListener('click', () => editApp(null));
    content.querySelector('[data-close]').addEventListener('click', () => this._closeDialog(dialog));
    content.querySelector('[data-save]').addEventListener('click', () => {
      try {
        const value = { ...original, apps };
        for (const key of ['remote_entity', 'volume_remote_entity']) if (data[key]) value[key] = data[key]; else delete value[key];
        save(data.enabled ? value : false); this._closeDialog(dialog);
      } catch (error) { content.querySelector('[data-error]').textContent = this._error(error); }
    });
    render();
  }

  _readHistory(retry = false) {
    if (this._historyLoaded) return Promise.resolve(this._history);
    if (this._historyLoading) return this._historyLoading;
    if (this._historyError && !retry) return Promise.reject(this._historyError);
    this._historyError = null;
    const lifecycle = this._lifecycle, epoch = this._historyEpoch;
    const loading = Promise.resolve().then(() => this._hass.callWS({ type: 'marao_dashboard/config/get', scope: 'history' })).then(payload => {
      if (!Array.isArray(payload.history)) throw new Error(this._t('historyFailed'));
      if (this.isConnected && lifecycle === this._lifecycle && epoch === this._historyEpoch) { this._history = payload.history; this._historyLoaded = true; }
      return this._history;
    }).catch(error => { if (epoch === this._historyEpoch) this._historyError = error; throw error; });
    this._historyLoading = loading;
    loading.finally(() => { if (this._historyLoading === loading) this._historyLoading = null; }).catch(() => {});
    return loading;
  }

  _openHistory() {
    const dialog = this._dialog(this._t('history')), content = dialog.querySelector('.dialog-content');
    const render = async (retry = false) => {
      content.innerHTML = `<p role="status">${this._t('historyLoading')}</p><div class="dialog-actions"><ha-button data-close>${this._t('cancel')}</ha-button></div>`;
      content.querySelector('[data-close]').addEventListener('click', () => this._closeDialog(dialog));
      try { await this._readHistory(retry); }
      catch (error) {
        if (!dialog.isConnected || !dialog.open) return;
        content.innerHTML = `<p role="alert">${esc(this._t('historyFailed') + this._error(error))}</p><ha-button data-history-retry>${this._t('retry')}</ha-button><ha-button data-close>${this._t('cancel')}</ha-button>`;
        content.querySelector('[data-history-retry]').addEventListener('click', () => render(true));
        content.querySelector('[data-close]').addEventListener('click', () => this._closeDialog(dialog)); return;
      }
      if (!dialog.isConnected || !dialog.open) return;
      content.innerHTML = `${this._history?.length ? this._history.map(item => `<div class="history-row"><div><strong>${esc(item.name || item.slug)}</strong><br><small>${new Date(item.created_at).toLocaleString()} · ${esc(item.reason)}</small></div><ha-button data-version="${esc(item.version)}">${this._t('restore')}</ha-button></div>`).join('') : `<div class="empty">${this._t('historyEmpty')}</div>`}<div class="dialog-actions"><ha-button data-close>${this._t('cancel')}</ha-button></div>`;
      content.querySelector('[data-close]').addEventListener('click', () => this._closeDialog(dialog));
      content.querySelectorAll('[data-version]').forEach(button => button.addEventListener('click', async () => {
        if (this._busy || !this._historyLoaded || !confirm(this._t('restoreConfirm'))) return;
        const lifecycle = this._lifecycle;
        try {
          this._setBusy(true);
          const result = await this._hass.callWS({ type: 'marao_dashboard/history/restore', version: button.dataset.version });
          if (!this.isConnected || lifecycle !== this._lifecycle) return;
          this._documentEpoch++; this._historyEpoch++;
          this._history = result.history; this._historyLoaded = Array.isArray(result.history);
          this._closeDialog(dialog); this._setBusy(false); await this._load(true);
        } catch (error) { this._setStatus(this._error(error), 'error'); }
        finally { if (this.isConnected && lifecycle === this._lifecycle) this._setBusy(false); }
      }));
    };
    render();
  }

  _openFormDialog(title, initial, schema, save, action = this._t('update')) {
    const dialog = this._dialog(title); const content = dialog.querySelector(".dialog-content"); const data = clone(initial);
    content.innerHTML = `<div id="form"></div><p data-error role="alert"></p><div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button><ha-button data-save appearance="filled">${esc(action)}</ha-button></div>`;
    this._mountForm(content.querySelector("#form"), data, schema, (value) => { Object.assign(data, value); if (Object.hasOwn(data, "power_entity")) this._refreshEnergyFields(content, data.power_entity); });
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelector("[data-save]").addEventListener("click", () => {
      try { save(data); this._closeDialog(dialog); }
      catch (error) { content.querySelector('[data-error]').textContent = this._error(error); }
    });
  }

  _dialog(title) {
    this._cardDrag?.cancel();
    const dialog = document.createElement("ha-dialog"); dialog.open = true; dialog.heading = this._l(title); dialog.headerTitle = this._l(title);
    const invoking = this.shadowRoot.activeElement, lifecycle = this._lifecycle, model = this._model;
    dialog.innerHTML = `<div class="dialog-content"></div>`; dialog.addEventListener("closed", () => {
      dialog.remove(); this._resumeJsonPreparation();
      if (this.isConnected && lifecycle === this._lifecycle && model === this._model) {
        const target = invoking?.isConnected ? invoking : this.shadowRoot.querySelector('#page-manager');
        target?.focus({ preventScroll: true });
      }
    });
    this.shadowRoot.append(dialog);
    this._containForm(dialog).catch((error) => this._setStatus(this._error(error), "error"));
    return dialog;
  }
  _closeDialog(dialog) { dialog.open = false; }

  _schema(name, label, selector, required = false) { return { name, label: this._l(label), required, selector }; }
  _mountForm(host, data, schema, changed) {
    const form = document.createElement("ha-form"); form.hass = this._hass; form.data = data; form.schema = schema;
    form.computeLabel = (item) => item.label || item.name; form.computeHelper = (item) => item.helper || "";
    const fit = () => {
      const fitting = this._containForm(form);
      (this._formFitting ||= new WeakMap()).set(form, fitting);
      fitting.catch(error => this._setStatus(this._error(error), "error"));
      return fitting;
    };
    form.addEventListener("value-changed", (event) => { if (!this._busy) changed(event.detail.value); fit(); });
    host.replaceChildren(form); fit();
  }

  async _containForm(element) {
    if (element.localName.startsWith("ha-")) {
      await customElements.whenDefined(element.localName);
      await element.updateComplete;
    }
    if (!element.isConnected) return;
    if (element.localName === 'ha-selector-boolean' && !element.shadowRoot.querySelector('style[data-marao-boolean]')) {
      const style = document.createElement('style'); style.dataset.maraoBoolean = '';
      style.textContent = '.primary,.secondary{line-height:1.35;overflow-wrap:anywhere}[slot="label"]{min-width:0}ha-switch::part(base){min-width:48px;min-height:48px}';
      element.shadowRoot.append(style);
    }
    if (element.localName === 'ha-formfield' && !element.shadowRoot.querySelector('style[data-marao-formfield]')) {
      const style = document.createElement('style'); style.dataset.maraoFormfield = '';
      style.textContent = '.mdc-form-field{min-height:48px;gap:12px}.mdc-label{min-width:0;flex:1;line-height:1.35}';
      element.shadowRoot.append(style);
    }
    if (element.localName === "ha-dialog-header" && !element.shadowRoot.querySelector('style[data-marao-dialog]')) {
      const style = document.createElement('style'); style.dataset.maraoDialog = '';
      style.textContent = ':host .header-content{white-space:normal;overflow-wrap:anywhere}:host .header-title{height:auto}';
      element.shadowRoot.append(style);
    }
    if (element.localName === "ha-dropdown-item") element.style.minHeight = "48px";
    // Native multiple-entity pickers otherwise retain the selected name's minimum width.
    if (element.localName === "ha-entity-picker") { element.style.minWidth = "0"; element.style.maxWidth = "100%"; }
    if (element.localName === "ha-icon-button") element.style.setProperty("--ha-icon-button-size", "48px");
    if (element.localName === 'ha-switch') { element.style.minWidth = '48px'; element.style.minHeight = '48px'; }
    if (element.localName === "ha-picker-field") { element.style.display = "block"; element.style.container = "marao-picker / inline-size"; }
    if (element.localName === "ha-combo-box-item" && element.getRootNode().host?.localName === "ha-picker-field") {
      // Native selected rows have zero padding and a fixed height that clips enlarged labels.
      element.style.setProperty("--md-list-item-two-line-container-height", "calc(var(--font-size-primary,1rem) * 1.5 + var(--font-size-caption,.8rem) * 1.2 + 24px)");
      element.style.setProperty("--md-list-item-top-space", "12px");
      element.style.setProperty("--md-list-item-bottom-space", "12px");
      for (const label of element.querySelectorAll('[slot="overline"]')) label.style.lineHeight = "1.2";
      const item = element.shadowRoot.querySelector('md-item');
      await item?.updateComplete;
      if (item?.shadowRoot && !item.shadowRoot.querySelector('style[data-marao-picker]')) {
        // Trailing native controls move below the text when they would consume its width.
        const style = document.createElement('style'); style.dataset.maraoPicker = '';
        style.textContent = '@container marao-picker (max-width:240px){:host{display:grid!important;grid-template-columns:minmax(0,1fr) auto;column-gap:8px}.text{grid-column:1/-1;grid-row:1;min-width:0}[name="start"],[name="end"]{display:flex;align-items:center;grid-row:2}[name="start"]{grid-column:1}[name="end"]{grid-column:2;justify-self:end}}';
        item.shadowRoot.append(style);
      }
    }
    if (element.localName === "ha-input") {
      const root = element.getRootNode();
      if (!root.querySelector('style[data-marao-fields]')) {
        // HA's exported input parts otherwise retain a 56px field at enlarged text sizes.
        const style = document.createElement('style'); style.dataset.maraoFields = '';
        style.textContent = 'ha-input::part(wa-base){height:auto;min-height:calc(var(--font-size-primary,1rem) * 1.5 + var(--font-size-caption,.8rem) * 1.2 + 24px)}ha-input::part(wa-input){padding-top:calc(var(--font-size-caption,.8rem) * 1.2 + 8px)}';
        root.append(style);
      }
    }
    await Promise.all([...element.children, ...(element.shadowRoot?.children || [])].map((child) => this._containForm(child)));
  }

  _variableSchema(field, sourceId) {
    let selector = { text: {} };
    if (field.kind === "boolean") selector = { boolean: {} };
    if (field.kind === "entity") selector = { entity: { domain: field.domains || [], multiple: Boolean(field.multiple) } };
    if (field.kind === "energy_period") selector = { select: { mode: 'dropdown', options: [{ value: 'day', label: this._l('Day') }, { value: 'month', label: this._l('Month') }] } };
    if (field.kind === "icon") selector = { icon: {} };
    if (field.kind === "number") selector = { number: {} };
    if (field.kind === "object") selector = { object: {} };
    if (field.kind === "color") selector = { text: { type: "color" } };
    if (field.kind === "energy_precision") selector = { select: { mode: "dropdown", options: [
      { value: "auto", label: this._l("Automatic") }, ...Array.from({length: 7}, (_, value) => ({value: String(value), label: String(value)})),
    ] } };
    if (field.kind === "energy_unit") {
      const units = this._catalog.energy_units || {};
      const source = entityMeta(this._entities, sourceId)?.unit_of_measurement;
      selector = { select: { mode: "dropdown", options: [
        { value: "auto", label: this._l("Automatic") },
        ...Object.keys(units).filter(unit => units[unit][0] === units[source]?.[0]).map(unit => ({value: unit, label: unit})),
      ] } };
    }
    return { ...this._schema(`var__${field.key}`, this._l(field.label), selector), helper: this._l(field.description || "") };
  }

  _refreshEnergyFields(content, sourceId) {
    const field = this._catalog.energy_fields?.find(item => item.kind === "energy_unit");
    if (!field) return;
    for (const form of content.querySelectorAll("ha-form")) {
      if (form._energySource === sourceId) continue;
      form._energySource = sourceId;
      form.schema = form.schema.map(item => item.name === `var__${field.key}` ? this._variableSchema(field, sourceId) : item);
    }
  }

  _expandedFields(fields) {
    return fields.flatMap((field) => field.kind !== "vacuum_action" ? [field] : [
      { key: `${field.key}.icon`, label: `${field.label} icon`, kind: "icon", advanced: true },
      { key: `${field.key}.on_action`, label: `${field.label} service`, kind: "text", advanced: true },
      { key: `${field.key}.segment`, label: `${field.label} segment`, kind: "number", advanced: true, description: "Explicit command data can override the default segment parameters." },
      { key: `${field.key}.data`, label: `${field.label} command data`, kind: "object", advanced: true, description: "Explicit command data can override the default segment parameters." },
    ]);
  }

  _readVariable(variables, field) {
    if (field.kind === 'number_list') return (variables?.[field.key] ?? field.default ?? []).join(', ');
    if (["energy_unit", "energy_precision"].includes(field.kind)) return variables?.[field.key] == null ? "auto" : String(variables[field.key]);
    const [parent, child] = field.key.split("."); return child ? variables?.[parent]?.[child] ?? "" : variables?.[parent] ?? field.default ?? "";
  }
  _writeVariable(variables, field, value) {
    if (field.kind === 'number_list') {
      const numbers = Array.isArray(value) ? value : String(value || '').split(',').map(item => item.trim()).filter(Boolean).map(Number);
      if (numbers.length > 3 || numbers.some(number => typeof number !== 'number' || !Number.isFinite(number))) throw new Error('Charging shortcuts require at most three finite numbers.');
      value = numbers;
    }
    if (["energy_unit", "energy_precision"].includes(field.kind) && value === "auto") value = "";
    if (field.kind === "energy_precision" && /^[0-6]$/.test(value)) value = Number(value);
    const empty = value === "" || value == null; const [parent, child] = field.key.split(".");
    if (child) { variables[parent] ||= {}; if (empty) delete variables[parent][child]; else variables[parent][child] = value; if (!Object.keys(variables[parent]).length) delete variables[parent]; }
    else if (empty) delete variables[parent]; else variables[parent] = value;
  }

  _entityId(value) { return typeof value === "string" ? value : value?.entity_id || ""; }
  _entityIds(values) { if (values == null) return []; return (Array.isArray(values) ? values : [values]).map((value) => this._entityId(value)).filter(Boolean); }
  _setBusy(busy) {
    this._cardDrag?.cancel(); this._busy = busy;
    this.shadowRoot.getElementById("visual-view").inert = busy;
    if (busy) {
      this._busyControls ||= new Map();
      this.shadowRoot.querySelectorAll("ha-button,ha-icon-button,button.icon-action").forEach(button => {
        if (!this._busyControls.has(button)) this._busyControls.set(button, button.disabled);
        button.disabled = true;
      });
    } else {
      for (const [button, disabled] of this._busyControls || []) if (button.isConnected) button.disabled = disabled;
      this._busyControls = null;
    }
    this._monaco?.updateOptions?.({ readOnly: busy });
    for (const dialog of this.shadowRoot.querySelectorAll('ha-dialog')) dialog.inert = busy;
    this._updateHeader();
    if (!busy) this._resumeJsonPreparation();
  }
  _setStatus(message, kind) { const status = this.shadowRoot.getElementById("status"); status.textContent = message; status.className = `status ${kind || ""}`; this.shadowRoot.getElementById("retry").hidden = !this._retryKind; }
  _error(error) {
    const message = String(error?.message || error?.body?.message || error), split = message.indexOf(': ');
    return split < 0 ? this._l(message) : this._l(message.slice(0, split)) + message.slice(split);
  }
}

if (!customElements.get("marao-dashboard-panel")) customElements.define("marao-dashboard-panel", MaraoDashboardPanel);
