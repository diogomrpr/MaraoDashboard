import { cardFormMethods } from './card-form-tools.js';
import { bindCardDrag } from "./editor-drag.js";
import "./panel.css";
import { cameraTitleFields, formData, patchForm, sameFormValue, sensorThresholdError, MAIN_PAGE_BUTTONS } from "./editor-model.js";

import {
  cardForEntity,
  canonicalTemplate,
  addPageSection,
  clone,
  createPage,
  deletePage,
  duplicatePage,
  duplicateCard,
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
} from "./editor-model.js";

const PANEL_ASSET_VERSION = new URL(import.meta.url).search;
const PANEL_CSS = new URL(`./MaraoDashboardPanel.css${PANEL_ASSET_VERSION}`, import.meta.url).href;
const BRAND_MARK = new URL(`./brand/mark.svg${PANEL_ASSET_VERSION}`, import.meta.url).href;
const BRAND_MARK_DARK = new URL(`./brand/mark-dark.svg${PANEL_ASSET_VERSION}`, import.meta.url).href;

const TEXT = {
  en: {
    importSource:"Import JSON", exportSource:"Export JSON", replaceSource:"Replace the current draft with this imported configuration? Unsaved changes will be replaced. The saved dashboard changes only after Save & Generate.", importHelp:"Paste Marao configuration JSON. Translation is checked before replacing the draft.", importFailed:"Could not import the configuration. ", editorTitle: "Marao Dashboard Editor", loading: "Loading your dashboard…", loadingJson: "Loading JSON editor…", retry: "Retry", loadFailed: "Could not load your dashboard: ", jsonFailed: "Could not load the JSON editor: ", jsonStylesFailed: "JSON styles could not load.", jsonWorkerFailed: "JSON worker could not load.",
    subtitle: "Configure pages and cards.", visual: "Visual", json: "JSON",
    save: "Save & Generate", apply: "Apply to dashboard settings", applied: "Applied. Save the dashboard settings to finish.", discard: "Discard changes", open: "Open dashboard",
    navigation: "Navigation bar", addNavPage: "Add page", general: "General", overview: "Overview", rooms: "Rooms", pages: "Pages", addRoom: "Add room", addCustomPage: "Add custom page",
    addCard: "Add card", noCards: "No cards yet.", dirty: "Unsaved changes", clean: "Saved",
    format: "Format JSON", collapse: "Collapse region", expand: "Expand region", advanced: "Advanced options", cancel: "Cancel",
    jsonIconsFailed: 'JSON icons could not load.',
    create: "Create", update: "Update", delete: "Delete", duplicate: "Duplicate",
    edit: "Edit", add: "Add", chooseCard: "Choose a card",
    byType: "By card type", byEntity: "By entity", searchEntities: "Search by name or entity ID",
    suggestions: "Suggested for this room", metadataLoading: "Loading current entities…", metadataFailed: "Could not load current entities. ",
    unknown: "Unknown", unavailable: "Unavailable",
    noArea: "Choose a suggestion area in Edit page, or search all entities.", missingArea: "This suggestion area is no longer available. Search all entities or choose another area.",
    noSuggestions: "No new compatible entities in this area.", noResults: "No compatible entities match your search.", globalSearch: "Search entities from any room.", alreadyAdded: "Already added",
    labelsFailed: "Could not load editor translations. ", saving: "Saving…",
    pendingConversion: "The saved dashboard is ready to convert. Export a copy before saving.",
    externalChange: "This dashboard changed in another session. Your draft is retained. Export it before reloading or reconciling the changes.",
    subscribeFailed: "Could not watch dashboard changes. ",
  },
  pt: {
    importSource:"Importar JSON", exportSource:"Exportar JSON", replaceSource:"Substituir o rascunho atual por esta configuração importada? As alterações por guardar serão substituídas. O dashboard guardado só muda após Guardar e gerar.", importHelp:"Cole o JSON da configuração Marao. A tradução é verificada antes de substituir o rascunho.", importFailed:"Não foi possível importar a configuração. ", editorTitle: "Editor do Marao Dashboard", loading: "A carregar o seu dashboard…", loadingJson: "A carregar o editor JSON…", retry: "Tentar novamente", loadFailed: "Não foi possível carregar o dashboard: ", jsonFailed: "Não foi possível carregar o editor JSON: ", jsonStylesFailed: "Não foi possível carregar os estilos do editor JSON.", jsonWorkerFailed: "Não foi possível carregar o processo do editor JSON.",
    subtitle: "Configure páginas e cartões.", visual: "Visual", json: "JSON",
    save: "Guardar e gerar", apply: "Aplicar às definições do dashboard", applied: "Aplicado. Guarde as definições do dashboard para concluir.", discard: "Descartar alterações", open: "Abrir dashboard",
    navigation: "Barra de navegação", addNavPage: "Adicionar página", general: "Geral", overview: "Resumo", rooms: "Divisões", pages: "Páginas", addRoom: "Adicionar divisão", addCustomPage: "Adicionar página personalizada",
    addCard: "Adicionar cartão", noCards: "Ainda não existem cartões.", dirty: "Alterações por guardar", clean: "Guardado",
    format: "Formatar JSON", collapse: "Recolher região", expand: "Expandir região", advanced: "Opções avançadas", cancel: "Cancelar",
    jsonIconsFailed: 'Não foi possível carregar os ícones JSON.',
    create: "Criar", update: "Atualizar", delete: "Eliminar", duplicate: "Duplicar",
    edit: "Editar", add: "Adicionar", chooseCard: "Escolha um cartão",
    byType: "Por tipo de cartão", byEntity: "Por entidade", searchEntities: "Pesquisar por nome ou ID da entidade",
    suggestions: "Sugestões para esta divisão", metadataLoading: "A carregar as entidades atuais…", metadataFailed: "Não foi possível carregar as entidades atuais. ",
    unknown: "Desconhecida", unavailable: "Indisponível",
    noArea: "Escolha uma área para sugestões em Editar página ou pesquise todas as entidades.", missingArea: "Esta área para sugestões já não está disponível. Pesquise todas as entidades ou escolha outra área.",
    noSuggestions: "Não existem novas entidades compatíveis nesta área.", noResults: "Nenhuma entidade compatível corresponde à pesquisa.", globalSearch: "Pesquise entidades de qualquer divisão.", alreadyAdded: "Já adicionada",
    labelsFailed: "Não foi possível carregar as traduções do editor. ", saving: "A guardar…",
    pendingConversion: "O dashboard guardado está pronto para conversão. Exporte uma cópia antes de guardar.",
    externalChange: "Este dashboard foi alterado noutra sessão. O rascunho foi mantido. Exporte antes de recarregar ou conciliar as alterações.",
    subscribeFailed: "Não foi possível acompanhar as alterações do dashboard. ",
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
    this._preparationStages = [];
    this._busy = false;
    this._dirty = false;
    this._tab = "visual";
    this._expandedSections = { rooms: true, pages: true };
    this._collapsedRooms = new Set();
    this._closedSections = new WeakSet();
    this._openPages = new Set();
    this._pageEntries = new Map();
  }

  set hass(value) {
    const previous = this._hass;
    this._hass = value;
    this.shadowRoot.querySelectorAll?.("ha-form,[data-ha-context]").forEach(element => { element.hass = value; });
    if (previous?.states !== value.states) {
      const count = Object.keys(value.states || {}).length;
      if (this._stateCount != null && count !== this._stateCount && this.isConnected && this._loaded) this._scheduleMetadataRefresh();
      this._stateCount = count;
    }
    if (previous && this.isConnected && this._loaded && (
      ['entities', 'areas', 'devices'].some(key => previous[key] !== value[key])
      || previous.connected === false && value.connected
      || previous.connection !== value.connection
    )) this._scheduleMetadataRefresh();
    const mark = this.shadowRoot.querySelector(".brand-mark");
    if (mark) mark.src = value?.themes?.darkMode ? BRAND_MARK_DARK : BRAND_MARK;
    if (this._monaco) this._setMonacoTheme();
    if (this.isConnected && this._loaded && !this._labelModule && String(value?.language || '').toLowerCase().startsWith('pt')) {
      this._ensureLabels().then(() => { if (this.isConnected && this._tab === 'visual') this._renderVisual(); }).catch(error => { this._retryKind = 'labels'; this._setStatus(this._t('labelsFailed') + this._error(error), 'error'); });
    }
    if (this.isConnected && !this._loaded && !this._loadAttempted) this._load();
    if (this.isConnected) this._subscribeNativeChanges();
  }

  set panel(value) { this._panel = value; }

  get persistence() {
    if (!this.nativeSession) throw new Error(this._l('Open the editor from the native Marao dashboard.'));
    this.nativeSession.hass = this._hass;
    return this.nativeSession;
  }

  _exportSource() {
    this._moveHaptic();
    const text = !this._dirty && this.nativeSession?.baseline?.strategy.source_json || (this._tab === 'json' ? this._monaco?.getValue() ?? this._jsonDraft ?? this._source() : this._source());
    const url = URL.createObjectURL(new Blob([text], { type:'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'marao-source.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async _importSource() {
    try {
      const {openSourceImport} = await import(new URL(`./MaraoSourceImport.js${PANEL_ASSET_VERSION}`,import.meta.url));
      if (this.isConnected) openSourceImport(this);
    } catch (error) { this._setStatus(this._t('importFailed') + this._error(error),'error'); }
  }


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
    this._subscribeNativeChanges();
    this._cardDrag = bindCardDrag(this.shadowRoot, {
      sourceFor: row => this._cardSource(row.dataset.kind, row.dataset.room, Number(row.dataset.cardDrag)),
      commit: (source, section, boundary) => this._commitCardMove(source, section, boundary),
      header: () => this.shadowRoot.querySelector(".editor-header").getBoundingClientRect(),
      label: () => this._l("Drop here"), haptic: () => this._moveHaptic(),
    });
    if (this._loaded && !this.shadowRoot.getElementById("visual-view").firstElementChild) this._renderVisual();
    if (this._loaded) {
      for (const [page, entry] of this._pageEntries) if (this._openPages.has(page)) this._renderPageBody(entry, page, this._model.pages.indexOf(page), new Set());
      if (this._hass?.connection) this._scheduleMetadataRefresh();
      this._nativeVisualReady().then(() => {
        if (!this.isConnected) return;
        if (this._requestedTab === 'json') this._switchTab('json'); else this._startJsonPreparation();
      }).catch(error => this._setStatus(this._error(error), 'error'));
    }
  }

  disconnectedCallback() {
    this._nativeSubscriptionEpoch = (this._nativeSubscriptionEpoch || 0) + 1;
    this._nativeUnsubscribe?.(); this._nativeUnsubscribe = null; this._nativeConnection = null;
    clearTimeout(this._metadataRefreshTimer); this._metadataRefreshTimer = null;
    this._metadataRefreshVersion = (this._metadataRefreshVersion || 0) + 1;
    this._cardDrag?.dispose(); this._cardDrag = null;
    this._headerResize?.disconnect();
    this._lifecycle += 1;
    for (const entry of this._pageEntries.values()) if (entry.pending) this._clearPageBody(entry);
    this._activityEvents?.abort();
    this._cancelIdleStage?.();
    this._interacting = false; this._scrolling = false;
    this._jsonPreparing = null; this._jsonLoading = null; this._jsonForeground = false;
    this._contextRequest = null; this._metadataLoading = null;
    this._jsonCancel?.();
    this._jsonEvents?.abort();
    if (this._monaco) this._jsonDraft = this._monaco.getValue();
    this._jsonAssistance?.dispose(); this._jsonAssistance = null;
    this._monaco?.getModel()?.dispose(); this._monaco?.dispose(); this._monaco = null;
    this._busy = false;
    if (!this._loaded) this._loadAttempted = false;
  }

  _subscribeNativeChanges() {
    const connection = this._hass?.connection;
    if (!this.nativeSession?.subscribe || !connection || connection === this._nativeConnection) return;
    this._nativeUnsubscribe?.(); this._nativeUnsubscribe = null; this._nativeConnection = connection;
    const epoch = this._nativeSubscriptionEpoch = (this._nativeSubscriptionEpoch || 0) + 1;
    this.persistence.subscribe(() => {
      if (!this.isConnected || epoch !== this._nativeSubscriptionEpoch || !this._loaded) return;
      if (this._dirty || this._busy) this._setStatus(this._t('externalChange'), 'error');
      else this._load(true);
    }).then(remove => {
      if (!this.isConnected || epoch !== this._nativeSubscriptionEpoch) remove(); else this._nativeUnsubscribe = remove;
    }).catch(error => {
      if (!this.isConnected || epoch !== this._nativeSubscriptionEpoch) return;
      this._nativeConnection = null;
      this._setStatus(this._t('subscribeFailed') + this._error(error), 'error');
    });
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

  _headerButton(id, icon, key) {
    return this._iconButton(icon, this._t(key), id, null);
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
<div class="primary-actions">${this._headerButton('open-dashboard', 'mdi:arrow-left', 'open')}${this._headerButton('save', 'mdi:content-save', 'save')}</div>
</div>
</div>
<div class="tabs" role="tablist">
<button class="tab" data-tab="visual" role="tab" aria-selected="true">${this._t("visual")}</button>
<button class="tab" data-tab="json" role="tab" aria-selected="false">${this._t("json")}</button>
<div id="json-actions" class="actions" hidden>${this._headerButton('import-source', 'mdi:import', 'importSource')}${this._headerButton('export-source', 'mdi:export', 'exportSource')}</div>
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
    this.shadowRoot.addEventListener("focusin", event => this._revealFocusedControl(event));
    this.shadowRoot.querySelectorAll("[data-tab]").forEach((tab) =>
      tab.addEventListener("click", () => this._switchTab(tab.dataset.tab)));
    this.shadowRoot.getElementById("retry").addEventListener("click", () => {
      if (this._retryKind === 'json') { this._jsonFailure = null; this._contextError = null; this._retryKind = null; this._ensureMonaco().then(() => { if (this._requestedTab === 'json') this._switchTab('json'); }).catch(() => {}); }
      else if (this._retryKind === 'labels') { this._ensureLabels(true).then(() => { this._retryKind = null; this._renderVisual(); this._setStatus('', ''); }).catch(error => this._setStatus(this._t('labelsFailed') + this._error(error), 'error')); }
      else if (this._retryKind === 'context') { this._contextError = null; this._retryKind = null; this._ensureEditorContext(true).then(() => { this._setStatus('', ''); this._refreshPages(new Set(this._model.pages.flatMap(pageContainers))); this._resumeJsonPreparation(); }).catch(error => this._contextFailure(error)); }
      else this._load(true);
    });
    this.shadowRoot.getElementById("open-dashboard").addEventListener("click", (event) => {
      event.preventDefault();
      this._openDashboard();
    });
    this._updateHeader();
    this.shadowRoot.getElementById("save").addEventListener("click", () => this._save());
    this.shadowRoot.getElementById("import-source").addEventListener("click", () => this._importSource());
    this.shadowRoot.getElementById("export-source").addEventListener("click", () => this._exportSource());
    this.shadowRoot.addEventListener("pointerdown", event => { this._pressedPath = event.composedPath(); });
    this.shadowRoot.addEventListener('click', event => this._iconActionHaptic(event), { capture: true });
  }

  _revealFocusedControl(event) {
    const path = event.composedPath(), target = path[0];
    const pressed = this._pressedPath?.includes(target); this._pressedPath = null;
    if (this._restoringFocus || this.shadowRoot.querySelector('ha-dialog') || !path.includes(this.shadowRoot.getElementById('visual-view'))) return;
    // Safari can focus an expansion-panel ancestor while its child button is pressed.
    if (pressed) return;
    // Native field reveal otherwise considers content behind the sticky header visible.
    target.style.scrollMarginTop = 'calc(var(--editor-header-height,150px) + 12px)';
    const bounds = target.getBoundingClientRect();
    if (bounds.top < this.shadowRoot.querySelector('.editor-header').getBoundingClientRect().bottom + 8 || bounds.bottom > innerHeight) target.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  _focusWithoutScroll(target) {
    // preventScroll does not suppress our own focusin reveal handler.
    this._restoringFocus = true;
    try { target?.focus({ preventScroll: true }); }
    finally { this._restoringFocus = false; }
  }

  _load(force = false) {
    if (this._loading) return this._loading;
    if (!this._hass || this._busy || !this.isConnected) return;
    const lifecycle = this._lifecycle;
    const previousModel = this._model;
    const previouslyLoaded = this._loaded;
    const retained = Object.fromEntries(['_catalog', '_entities', '_areas', '_haCardLabels', '_displayEntityIds', '_contextReady', '_contextError', '_contextPayload', '_pageTemplates', '_savedSource', '_jsonDraft', '_dirty', '_dashboardUrl', '_visualReady'].map(key => [key, this[key]]));
    this._loadAttempted = true;
    this._retryKind = null;
    this._setBusy(true); this._setStatus(this._t("loading"), "");
    this._loading = Promise.resolve().then(async () => {
      try {
        const [payload] = await Promise.all([this.persistence.read('initial'), this._ensureLabels(force)]);
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        const model = normalizeConfig(JSON.parse(payload.config));
        this._catalog = payload.editor.catalog; this._entities = payload.editor.entities;
        this._areas = payload.editor.areas || [];
        this._haCardLabels = payload.editor.native_card_labels || {};
        this._displayEntityIds = new Set(payload.editor.display_entity_ids || payload.editor.entities.map(entity => entity.entity_id));
        this._contextReady = !payload.editor.display_entity_ids;
        this._contextError = null; this._contextRequest = null; this._contextPayload = null; this._metadataLoading = null;
        this._documentEpoch++;
        this._model = model; this._loaded = true;
        this._visualReady = false;
        this._renderVisual();
        this._savedSource = this._source(); this._jsonDraft = null; this._dirty = false;
        this._dashboardUrl = payload.dashboard_url;
        this._pageTemplates = payload.page_templates;
        if (this._monaco) this._setEditorSource(this._savedSource);
        await this._nativeVisualReady();
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        this._setStatus(payload.conversion_pending ? this._t("pendingConversion") : force ? this._t("clean") : "", "success");
      } catch (error) {
        if (!this.isConnected || lifecycle !== this._lifecycle) return;
        this._model = previousModel; this._loaded = previouslyLoaded;
        Object.assign(this, retained); this._documentEpoch++;
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
    for (const [id, key] of [["save", "save"], ["import-source", "importSource"], ["export-source", "exportSource"], ["open-dashboard", "open"]]) {
      const label = this._t(id === "save" && this.nativeSession?.strategy ? "apply" : key);
      root.getElementById(id).setAttribute('aria-label', label);
    }
    root.getElementById('retry').textContent = this._t('retry');
    root.getElementById('json-actions').hidden = this._tab !== 'json';
    root.getElementById("save").disabled = this._busy || !this._loaded;
    root.getElementById("import-source").disabled = this._busy || !this._loaded;
    root.getElementById("export-source").disabled = !this._loaded;
    root.getElementById("open-dashboard").disabled = this._busy || !this._loaded;
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
      if (restoreFocus) this._focusWithoutScroll(manager);
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
    const sections = pageContainers(page), columns = sections[sectionIndex].columns;
    return `<h3 class="section-number" aria-label="${esc(this._l('Section'))} ${sectionIndex + 1}">${sectionIndex + 1}</h3><span class=section-layout role=img aria-label="${esc(this._l('Columns'))}: ${columns || this._l('Automatic')}"><ha-icon icon="mdi:${columns ? 'view-column-outline' : 'auto-fix'}"></ha-icon>${columns || ''}</span><div class="row-actions">${[
      ['arrow-up', 'Move up', 'up', !page.sections || sectionIndex === 0],
      ['arrow-down', 'Move down', 'down', !page.sections || sectionIndex === sections.length - 1],
      ['view-grid-outline', 'Edit layout', 'edit'],
      ['delete-outline', 'Delete section', 'delete', !page.sections],
    ].map(([icon, label, action, disabled]) => this._iconButton('mdi:' + icon, label, 'section-' + action, `${index}:${sectionIndex}`, disabled)).join('')}</div>`;
  }

  _clearPageBody(entry) {
    entry.pending = null; entry.body.replaceChildren(); entry.sections.clear(); entry.add = null;
  }

  _renderPageBody(entry, page, index, changed) {
    const sections = pageContainers(page);
    if (!this._contextReady && sections.some(section => (section.entities || []).some(entity => entity.entity_id && !this._displayEntityIds?.has(entity.entity_id)))) {
      if (!entry.pending) {
        this._clearPageBody(entry);
        entry.body.innerHTML = `<p role="status">${this._t('metadataLoading')}</p>`;
        const attempt = entry.pending = {}, lifecycle = this._lifecycle, epoch = this._documentEpoch, model = this._model;
        const current = () => entry.pending === attempt && this.isConnected && lifecycle === this._lifecycle && epoch === this._documentEpoch && model === this._model && this._openPages.has(page) && this._pageEntries.get(page) === entry;
        this._ensureEditorContext().then(() => {
          if (!current()) return;
          this._clearPageBody(entry);
          this._renderPageBody(entry, page, this._model.pages.indexOf(page), new Set(sections));
        }).catch(error => {
          if (!current()) return;
          entry.pending = null;
          entry.body.innerHTML = `<p role="alert">${esc(this._t('metadataFailed') + this._error(error))}</p><ha-button data-context-retry>${this._t('retry')}</ha-button>`;
          entry.body.querySelector('[data-context-retry]').addEventListener('click', () => { this._contextError = null; this._renderPageBody(entry, page, this._model.pages.indexOf(page), new Set(sections)); });
        });
      }
      return;
    }
    if (entry.pending) this._clearPageBody(entry);
    if (!entry.add) {
      entry.body.replaceChildren();
      entry.add = document.createElement('ha-button'); entry.add.dataset.action = 'section-add';
      entry.add.textContent = this._l('Add section'); entry.body.append(entry.add);
    }
    if (entry.add.dataset.room !== String(index)) entry.add.dataset.room = String(index);
    for (const [section, element] of entry.sections) if (!sections.includes(section)) { element.remove(); entry.sections.delete(section); }
    sections.forEach((section, sectionIndex) => {
      const position = `${index}:${sectionIndex}`;
      let element = entry.sections.get(section);
      if (!element) {
        element = document.createElement('details'); element.className = 'page-section';
        element.open = !this._closedSections.has(section);
        element.addEventListener('toggle', () => {
          if (!element.isConnected) return;
          this._cardDrag?.cancel();
          this._closedSections[element.open ? 'delete' : 'add'](section);
        });
        entry.sections.set(section, element); changed.add(section);
      }
      const coordinates = `${position}:${sections.length}:${Boolean(page.sections)}`;
      if (changed.has(section)) { element._headerMarkup = this._sectionHeader(page, index, sectionIndex); element.innerHTML = `<summary class="card-heading">${this._sectionHeader(page, index, sectionIndex)}</summary>${this._entityList(section, position, 'page')}${section.cards?.length ? `<p class="helper">${this._l('Raw cards are retained and editable in JSON.')} (${section.cards.length})</p>` : ''}${this._iconButton('mdi:plus', this._t('addCard'), 'card-add', position, false, null, 'page')}`; }
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
      this._clearPageBody(entry); entry.article.remove(); this._pageEntries.delete(page); this._openPages.delete(page);
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
            if (focused && entry.body.contains(focused)) this._focusWithoutScroll(entry.header);
            this._clearPageBody(entry);
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
      this._focusWithoutScroll(button.isConnected ? button : this._pageEntries.get(focusPage)?.header);
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
    const config = this._model, pages = config.config_version === 2;
    const data = { name: config.name || "", slug: config.slug || "", theme: config.theme || "", icon: config.icon || "", ...Object.fromEntries(MAIN_PAGE_BUTTONS.map(([key]) => [key, config[key] !== false])), ...(pages ? { landing_page: config.landing_page } : {}) };
    const themes = Object.keys(this._hass?.themes?.themes || {}).sort().map((theme) => ({ value: theme, label: theme }));
    this._mountForm(host, data, [
      this._schema("name", "Dashboard name", { text: {} }, true),
      this._schema("slug", "URL slug", { text: {} }),
      this._schema("theme", "Theme", { select: { mode: "dropdown", custom_value: true, options: themes } }),
      this._schema("icon", "Icon", { icon: {} }),
      ...MAIN_PAGE_BUTTONS.map(([key, label], index) => ({ ...this._schema(key, label, { boolean: {} }), helper: index ? this._l('Hold the navbar for 3 seconds to open Maintenance.') : '' })),
      ...(pages ? [this._schema('landing_page', 'Landing page', { select: { mode: 'dropdown', options: this._availablePages().map(page => ({ value: page.path, label: page.name })) } }, true)] : []),
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
          ${this._iconButton('mdi:plus', this._t('addCard'), 'card-add', roomIndex)}
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
    const card = this._catalog.cards.find((item) => item.id === canonicalTemplate(entity.template)) || cardForEntity(this._catalog, metadata || entity);
    const shortcutPage = entity.page && this._availablePages().find((page) => page.path === entity.page);
    const native = entity.template === 'ha_card';
    const summary = native && (this._haCardModule?.describeCardYaml(entity.yaml) || this._haCardLabels?.[entity.yaml]);
    const group = entity.template === 'md_entity_group_card';
    const warning = native || group || card?.entity_optional ? '' : entity.page ? (shortcutPage ? "" : " · Missing page") : !metadata && (this._contextReady || this._displayEntityIds?.has(entity.entity_id)) ? " · Missing" : metadata?.state === "unavailable" ? " · Unavailable" : "";
    const title = (entity.name_key ? this._l(entity.name) : entity.name) || shortcutPage?.name || metadata?.name || entity.entity_id || entity.page || (native ? this._l(summary?.name || 'Home Assistant card') : this._l(card?.label || 'Card'));
    const detail = native ? summary?.type || 'Home Assistant · YAML' : group ? `${this._l('Entity Group')} · ${this._l(({light:'Light', cover:'Cover', battery:'Battery', climate:'Climate'})[entity.entity_type] || entity.entity_type)} · ${new Set((entity.entities || []).map(member => this._entityId(member))).size} ${this._l('members')}` : entity.page ? `${entity.page} · ${this._l("Page shortcut")}` : `${entity.entity_id ? entity.entity_id + ' · ' : ''}${this._l(card?.label || entity.template || "Automatic")}`;
    return `<div class="entity-row" data-card-drag="${cardIndex}" data-room="${roomIndex}" data-kind="${kind}">
      <button type="button" class="card-drag-handle" data-card-handle aria-label="${esc(this._l("Drag card") + ": " + title)}"><ha-icon icon="mdi:drag"></ha-icon></button>
      <div class="entity-main"><div class="entity-name"${native ? ' data-ha-title' : ''}>${esc(title)}</div><div class="entity-meta">${esc(detail)}${esc(warning)}</div></div>
      <div class="row-actions">
        ${this._iconButton("mdi:arrow-up", "Move up", "card-up", roomIndex, cardIndex === 0, cardIndex, kind)}
        ${this._iconButton("mdi:arrow-down", "Move down", "card-down", roomIndex, cardIndex === container.entities.length - 1, cardIndex, kind)}
        ${kind === "page" && pageContainers(this._model.pages[Number(String(roomIndex).split(":")[0])]).length > 1 ? this._iconButton("mdi:tray-arrow-down", "Move to section", "card-move", roomIndex, false, cardIndex, kind) : ""}
        ${this._iconButton("mdi:pencil", "Edit card", "card-edit", roomIndex, false, cardIndex, kind)}
        ${this._iconButton("mdi:content-copy", "Duplicate card", "card-duplicate", roomIndex, false, cardIndex, kind)}
        ${this._iconButton("mdi:delete-outline", this._t("delete"), "card-delete", roomIndex, false, cardIndex, kind)}
      </div>
    </div>`;
  }

  _entityList(container, index, kind = "room") {
    const columns = Number.isInteger(container.columns) ? Math.min(6, Math.max(1, container.columns)) : null;
    const layout = columns ? ` data-columns="${columns}" style="--editor-columns:${columns}"` : "";
    const [pageIndex, sectionIndex = 0] = String(index).split(':').map(Number);
    return `${!columns ? `<p class="helper move-guidance">${this._l('Automatic layout groups cards by type. Choose fixed columns for exact mixed order.')}</p>` : ''}<div class="entity-list" data-card-list data-move-page="${kind}:${pageIndex}" data-move-section="${sectionIndex}"${layout}>${(container.entities || []).map((entity, cardIndex) => this._entityRow(entity, index, cardIndex, kind)).join("") || `<div class="empty">${this._l('Drop a card here')}</div>`}</div>`;
  }

  _iconButton(icon, label, action, room, disabled = false, card = null, kind = "room") {
    return `<button type="button" class="icon-action" ${room === null ? `id="${action}"` : `data-action="${action}" data-room="${room}" data-kind="${kind}" ${card == null ? "" : `data-card="${card}"`}`} aria-label="${esc(this._l(label))}" ${disabled ? "disabled" : ""}><ha-icon icon="${icon}" aria-hidden="true"></ha-icon></button>`;
  }

  _iconActionHaptic(event) {
    const button = event.composedPath().find(element => element.classList?.contains('icon-action') || element.classList?.contains('native-card-action') || element.matches?.('.page-section > summary'));
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
      for (const item of copy.entities) if (item.template === 'md_entity_group_card') item.id = newEntityGroupId();
      copy.name = `${copy.name} copy`; copy.path = slugify(copy.name);
      this._model.pages.custom.splice(roomIndex + 1, 0, copy);
    }
    if (action === "custom-up") this._model.pages.custom = moveItem(this._model.pages.custom, roomIndex, roomIndex - 1);
    if (action === "custom-down") this._model.pages.custom = moveItem(this._model.pages.custom, roomIndex, roomIndex + 1);
    if (action === "room-edit") return this._openRoomDialog(roomIndex);
    if (action === "room-delete" && confirm(`Delete ${this._model.rooms[roomIndex].name}?`)) this._model.rooms.splice(roomIndex, 1);
    if (action === "room-duplicate") {
      const copy = clone(this._model.rooms[roomIndex]);
      for (const item of copy.entities) if (item.template === 'md_entity_group_card') item.id = newEntityGroupId();
      copy.name = `${copy.name} copy`; copy.path = `room-${slugify(copy.name)}`;
      this._model.rooms.splice(roomIndex + 1, 0, copy);
    }
    if (action === "room-up") this._model.rooms = moveItem(this._model.rooms, roomIndex, roomIndex - 1);
    if (action === "room-down") this._model.rooms = moveItem(this._model.rooms, roomIndex, roomIndex + 1);
    if (action === "card-add") return this._openCardGallery(roomIndex, kind);
    if (action === "card-move") return this._openMoveDialog(roomIndex, cardIndex);
    if (action === "card-edit") return this._openCardEditor(roomIndex, cardIndex, null, kind);
    if (action === "card-duplicate" && !duplicateCard(this._model, this._editableContainer(kind, roomIndex), cardIndex)) return;
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
    this._focusWithoutScroll(row.querySelector('[data-card-handle]'));
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
            ${this._iconButton('mdi:plus', this._t('addCard'), 'card-add', index, false, null, 'custom')}
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
          const payload = await this.persistence.preview(this._monaco.getValue());
          if (!this.isConnected || lifecycle !== this._lifecycle || this._requestedTab !== 'visual') return;
          parsed = JSON.parse(payload.config);
        }
        const errors = await this._validateConfig(parsed, this._catalog.config_version, this._entities, this._catalog.energy_units, this._catalog);
        if (errors.length) throw new Error(errors.map((error) => this._l(error)).join(" "));
        if (Array.isArray(parsed.pages) && parsed.pages.some(page => pageContainers(page).some(section => flattenEntities(section.entities).some(card => card.template === 'ha_card' && !this._haCardLabels?.[card.yaml])))) {
          (await this._loadHaCardModule()).validateCardYaml(parsed);
          if (!this.isConnected || lifecycle !== this._lifecycle || model !== this._model || this._requestedTab !== 'visual') return;
        }
        if (!this.isConnected || lifecycle !== this._lifecycle || model !== this._model || this._requestedTab !== 'visual') return;
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
    this._updateHeader();
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

  _openDashboard() {
    if (this.isConnected && this._loaded && !this._busy) this.navigate(this._dashboardUrl);
  }

  async _save() {
    this._cardDrag?.cancel();
    if (this._busy || !this._loaded) return;
    const lifecycle = this._lifecycle, epoch = this._documentEpoch, model = this._model, session = this.nativeSession;
    const sameDocument = () => epoch === this._documentEpoch && model === this._model && session === this.nativeSession;
    const current = () => this.isConnected && lifecycle === this._lifecycle && sameDocument();
    let accepted = false;
    this._setBusy(true); this._setStatus(this._contextReady ? this._t('saving') : this._t('metadataLoading'), '');
    try {
      await this._ensureEditorContext();
      if (!current()) return;
      const source = this._tab === 'json' ? this._monaco.getValue() : this._source();
      let parsed = JSON.parse(source);
      if (parsed && !Object.hasOwn(parsed, 'name') && Object.hasOwn(parsed, 'title') && Object.hasOwn(parsed, 'views')) {
        const preview = await this.persistence.preview(source);
        if (!current()) return;
        parsed = JSON.parse(preview.config);
      }
      const errors = await this._validateConfig(parsed, this._catalog.config_version, this._entities, this._catalog.energy_units, this._catalog);
      if (!current()) return;
      if (errors.length) throw new Error(errors.map(error => this._l(error)).join(' '));
      if (Array.isArray(parsed.pages) && parsed.pages.some(page => pageContainers(page).some(section => flattenEntities(section.entities).some(card => card.template === 'ha_card')))) {
        (await this._loadHaCardModule()).validateCardYaml(parsed);
        if (!current()) return;
      }
      this._setStatus(this._t('saving'), '');
      const result = await this.persistence.save(source);
      // HA may reattach the same retained draft before acknowledging its save.
      if (!sameDocument()) return;
      accepted = true;
      this._model = normalizeConfig(JSON.parse(result.config || source)); this._documentEpoch++;
      this._jsonDraft = null; this._pageTemplates = null;
      this._savedSource = this._source(); this._dirty = false;
      this._dashboardUrl = result.dashboard_url;
      this._setEditorSource(this._savedSource); this._renderVisual(); this._updateHeader();
      this._setStatus(this._t(this.nativeSession?.strategy ? 'applied' : 'clean'), 'success');
    } catch (error) { if (sameDocument()) { if (!this._contextReady) this._contextFailure(error); else this._setStatus(this._error(error), 'error'); } }
    finally { if (accepted || sameDocument() || this.isConnected && lifecycle === this._lifecycle) this._setBusy(false); }
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
    if (this._galleryDialog?.isConnected && this._galleryDialog.open) return;
    const dialog = this._dialog(this._t('chooseCard'));
    const model = this._model, epoch = this._documentEpoch, revision = this._revision;
    const active = () => dialog.isConnected && dialog.open && this._model === model && this._documentEpoch === epoch && this._revision === revision;
    this._galleryDialog = dialog;
    const content = dialog.querySelector(".dialog-content");
    content.innerHTML = `<div class="add-tabs" role="tablist" aria-label="${esc(this._t('addCard'))}"><button type="button" role="tab" id="by-type" aria-controls="type-cards" aria-selected="true" tabindex="0">${this._t('byType')}</button><button type="button" role="tab" id="by-entity" aria-controls="entity-cards" aria-selected="false" tabindex="-1">${this._t('byEntity')}</button><button type="button" role="tab" id="by-ha" aria-controls="ha-cards" aria-selected="false" tabindex="-1">Home Assistant</button></div><section id="type-cards" role="tabpanel" aria-labelledby="by-type"><label for="card-search">${this._l("Search cards")}</label><input type="search" id="card-search" autocomplete="off"><p id="card-search-empty" role="status" hidden>${this._l("No cards match your search.")}</p><div class="gallery">${this._catalog.cards.filter(card => !card.hidden).map((card) => `<button type="button" class="gallery-card" data-card="${card.id}"><ha-icon icon="${card.icon}"></ha-icon><span><strong>${esc(this._l(card.label))}</strong><small>${esc(this._l(card.description))}</small></span></button>`).join("")}</div></section><section id="entity-cards" role="tabpanel" aria-labelledby="by-entity" hidden><label for="entity-search">${this._t('searchEntities')}</label><input type="search" id="entity-search" autocomplete="off"><div class="entity-results" aria-live="polite"></div></section><section id="ha-cards" role="tabpanel" aria-labelledby="by-ha" hidden><div data-ha-picker></div><ha-button data-ha-manual>${this._l("Manual YAML")}</ha-button></section><div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button></div>`;
    content.querySelector("[data-ha-manual]").addEventListener("click", () => { this._closeDialog(dialog); this._openHaCardEditor(roomIndex, null, kind); });
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelectorAll("[data-card]").forEach((button) => button.addEventListener("click", () => { const cardId = button.dataset.card; this._closeDialog(dialog); this._openCardEditor(roomIndex, null, cardId, kind); }));
    const cardSearch = content.querySelector('#card-search');
    const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    cardSearch.addEventListener('input', () => {
      const query = fold(cardSearch.value.trim());
      const cards = [...content.querySelectorAll('[data-card]')];
      for (const button of cards) button.hidden = !fold(button.textContent).includes(query);
      content.querySelector('#card-search-empty').hidden = cards.some(button => !button.hidden);
    });
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
    for (const [index, tab] of [...content.querySelectorAll('.add-tabs > [role="tab"]')].entries()) {
      const select = () => {
        content.querySelectorAll('.add-tabs > [role="tab"]').forEach(button => { button.setAttribute('aria-selected', String(button === tab)); button.tabIndex = button === tab ? 0 : -1; });
        content.querySelector('#type-cards').hidden = index !== 0; content.querySelector('#entity-cards').hidden = index !== 1;
        content.querySelector('#ha-cards').hidden = index !== 2;
        if (index === 2) this._loadHaCardModule().then(module => { if (active()) module.mountPicker(this, dialog, roomIndex, kind); }).catch(error => { if (active()) content.querySelector('[data-ha-picker]').textContent = this._error(error); });
      };
      tab.addEventListener('click', select);
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const tabs = content.querySelectorAll('.add-tabs > [role="tab"]'); const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; next.click(); next.focus();
      });
    }
    loading = false; renderResults();
    dialog._metadataUpdated = () => { failure = ''; renderResults(); };
  }

  _loadHaCardModule() {
    if (!this._haCardLoading) this._haCardLoading = import(new URL(`./MaraoLovelaceEditor.js${PANEL_ASSET_VERSION}`, import.meta.url).href)
      .then(module => { this._haCardModule = module; return module; })
      .catch(error => { this._haCardLoading = null; throw error; });
    return this._haCardLoading;
  }

  async _openHaCardEditor(roomIndex, cardIndex, kind) {
    const model = this._model, revision = this._revision;
    try {
      const module = await this._loadHaCardModule();
      if (this.isConnected && this._model === model && this._revision === revision) module.openEditor(this, roomIndex, cardIndex, kind);
    } catch (error) { this._setStatus(this._error(error), 'error'); }
  }

  _requestEditorContext() {
    if (this._contextPayload) return Promise.resolve(this._contextPayload);
    if (this._contextRequest) return this._contextRequest;
    if (this._contextError) return Promise.reject(this._contextError);
    const lifecycle = this._lifecycle, epoch = this._documentEpoch;
    const request = Promise.resolve().then(() => this.persistence.read('context')).then(payload => {
      if (!Array.isArray(payload.editor?.entities) || !Array.isArray(payload.editor?.areas) || !Array.isArray(payload.editor?.catalog?.cards)) throw new Error(this._t('metadataFailed'));
      if (this.isConnected && lifecycle === this._lifecycle && epoch === this._documentEpoch) this._contextPayload = { ...payload, epoch };
      return { ...payload, epoch };
    }).catch(error => { if (this.isConnected && lifecycle === this._lifecycle && epoch === this._documentEpoch) this._contextError = error; throw error; });
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
      if (this._retryKind === 'context') { this._retryKind = null; this._setStatus('', ''); this._updateHeader(); }
      // Source-dependent templates never revive an older document's projection.
      if (payload.epoch === this._documentEpoch && payload.page_templates) this._pageTemplates = payload.page_templates;
      this._jsonAssistance?.updateMetadata(this._catalog, this._entities, serializeConfig(this._model));
      this.shadowRoot.querySelectorAll?.('ha-dialog[open]').forEach(dialog => dialog._metadataUpdated?.());
    });
    this._metadataLoading = loading;
    loading.finally(() => { if (this._metadataLoading === loading) this._metadataLoading = null; }).catch(() => {});
    return loading;
  }

  _refreshEditorMetadata() { return this._ensureEditorContext(true); }

  _scheduleMetadataRefresh() {
    const lifecycle = this._lifecycle, version = this._metadataRefreshVersion = (this._metadataRefreshVersion || 0) + 1;
    clearTimeout(this._metadataRefreshTimer);
    this._metadataRefreshTimer = setTimeout(async () => {
      this._metadataRefreshTimer = null;
      // An older warmup response must finish before requesting the changed registries.
      await (this._metadataLoading || this._contextRequest)?.catch(() => {});
      if (!this.isConnected || !this._loaded || lifecycle !== this._lifecycle || version !== this._metadataRefreshVersion) return;
      try { await this._refreshEditorMetadata(); }
      catch (error) { if (this.isConnected && lifecycle === this._lifecycle) this._contextFailure(error); }
    }, 500);
  }

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
    if (existing?.template === 'ha_card') return this._openHaCardEditor(roomIndex, cardIndex, kind);
    if ((selectedCardId || existing?.template) === 'md_floor_plan_card') {
      const model = this._model, epoch = this._documentEpoch, revision = this._revision;
      return import(new URL(`./MaraoFloorPlanEditor.js${PANEL_ASSET_VERSION}`, import.meta.url).href).then(module => { if (this.isConnected && model === this._model && epoch === this._documentEpoch && revision === this._revision) module.openFloorPlanEditor(this, roomIndex, cardIndex, kind); }).catch(error => this._setStatus(this._error(error), 'error'));
    }
    if (selectedCardId === 'md_entity_group_card' || existing?.template === 'md_entity_group_card') return this._openEntityGroupEditor(roomIndex, cardIndex, kind);
    const metadata = entityMeta(this._entities, existing?.entity_id);
    const selected = this._catalog.cards.find((card) => card.id === (selectedCardId || existing?.template || (existing?.page ? "md_navigation_card" : ""))) || cardForEntity(this._catalog, metadata || existing) || this._catalog.cards[0];
    const shortcut = Boolean(selected.page_shortcut);
    const camera = selected.id === 'md_camera_card', titleFields = camera ? cameraTitleFields() : [];
    const titleData = camera ? { ...formData(existing || {}, titleFields), name: existing?.name || '' } : null;
    const dialog = this._dialog(`${this._t(existing ? 'edit' : 'add')} ${this._l(selected.label)}`);
    const data = shortcut
      ? { page: existing?.page || "", entity_id: existing?.entity_id || '', name: existing?.name || "", icon: existing?.icon || selected.icon }
      : { entity_id: existing?.entity_id || prefilledEntity || "", name: existing?.name || "", icon: existing?.icon || "" };
    if (camera) Object.assign(data, titleData);
    let collection = clone(existing?.entities || []);
    if (selected.scene_collection) data.scene_entities = this._entityIds(collection);
    for (const field of this._expandedFields(selected.variables)) data[`var__${field.key}`] = !existing && field.key === "alarm_layout" ? "dropdown" : this._readVariable(existing?.variables, field);
    const initialData = clone(data);
    const content = dialog.querySelector(".dialog-content");
    const variables = this._expandedFields(selected.variables).map(field => selected.id === "md_fan_card" && field.key === "enable_slider" && data.entity_id.startsWith("cover.") ? {...field,label:"Opening slider"} : field);
    const basic = variables.filter((field) => !field.advanced && !['energy_sub_entities','power_devices','sensor_thresholds'].includes(field.kind));
    const advanced = variables.filter((field) => field.advanced && !['energy_sub_entities','power_devices','sensor_thresholds'].includes(field.kind));
    content.innerHTML = `<div id="card-form"></div><div id="summary" class="summary"></div>${selected.id === 'md_sensor_card' ? '<div id="sensor-thresholds"></div>' : ''}${selected.scene_collection ? '<div id="scene-order"></div>' : ''}${selected.id === 'md_energy_period_card' ? '<div id="energy-breakdown"></div>' : ''}${selected.id === 'md_graph_card' ? '<div id="power-devices"></div>' : ''}${selected.id === 'md_media_card' ? `<ha-button data-media-options>${this._l('Apple TV options')}</ha-button>` : ''}${advanced.length ? `<ha-expansion-panel id="advanced-panel" outlined><div slot="header">${this._t("advanced")}</div><div id="advanced-form" class="advanced-form"></div></ha-expansion-panel>` : ""}<div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button><ha-button data-save appearance="filled">${existing ? this._t("update") : this._t("create")}</ha-button></div>`;
    const renderThresholds = () => { if (selected.id === 'md_sensor_card') this._renderEnergySubEntities(content.querySelector('#sensor-thresholds'), clone(data.var__background_thresholds || []), value => { data.var__background_thresholds = value; }, false, data.entity_id); };
    renderThresholds();
    if (selected.id === 'md_graph_card') this._renderEnergySubEntities(content.querySelector('#power-devices'), clone(data.var__power_devices || []), value => { data.var__power_devices = value; }, true);
    if (selected.id === 'md_energy_period_card') this._renderEnergySubEntities(content.querySelector('#energy-breakdown'), clone(data.var__sub_entities || []), value => { data.var__sub_entities = value; });
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
    if (selected.id === 'md_media_card') content.querySelector('[data-media-options]').addEventListener('click', () => this._openMediaOptions({ entity_id: data.entity_id, apple_tv: appleTV }, value => { appleTV = value; }));
    const changed = (value) => {
      const previousEntity = data.entity_id;
      Object.assign(data, value);
      if (previousEntity !== data.entity_id) renderThresholds();
      if (selected.id === 'md_fan_card') {
        const form = content.querySelector('#card-form ha-form');
        const label = this._l(data.entity_id.startsWith('cover.') ? 'Opening slider' : 'Speed slider');
        if (form?.schema?.some(field => field.name === 'var__enable_slider' && field.label !== label)) form.schema = form.schema.map(field => field.name === 'var__enable_slider' ? {...field,label} : field);
      }
      if (selected.scene_collection) { collection = mergeEntityValues(collection, data.scene_entities || []); renderCollection(); }
      this._renderSummary(content.querySelector("#summary"), shortcut ? data.page : data.entity_id, selected, roomIndex, cardIndex, kind); this._refreshEnergyFields(content, selected.id === "md_switch_card" ? data.var__power_entity : data.entity_id);
    };
    const pageOptions = this._availablePages().filter((page) => kind !== "custom" || page.path !== this._container(kind, roomIndex).path).map((page) => ({ value: page.path, label: page.name }));
    const schema = [
      ...(shortcut ? [this._schema("page", "Target page", { select: { mode: "dropdown", options: pageOptions } }, true)] : []),
      ...(!selected.entity_optional && !shortcut || selected.id === 'md_room_card' ? [this._schema("entity_id", selected.id === 'md_room_card' ? 'Primary source' : camera ? 'Dashboard stream' : 'Entity', { entity: { domain: selected.domains } }, !selected.entity_optional)] : []),
      ...(camera ? titleFields.map(field => this._schema(field.path, field.label, { [field.kind]: {} }))
        : [this._schema("name", "Display name", { text: {} }), this._schema("icon", "Icon", { icon: {} })]),
      ...(selected.scene_collection ? [this._schema('scene_entities', 'Scenes', { entity: { domain: ['scene', 'switch', 'input_boolean'], multiple: true } })] : []),
      ...basic.map((field) => this._variableSchema(field, selected.id === "md_switch_card" ? data.var__power_entity : data.entity_id)),
    ];
    this._mountForm(content.querySelector("#card-form"), data, schema, changed);
    if (advanced.length) this._mountForm(content.querySelector("#advanced-form"), data, advanced.map((field) => this._variableSchema(field)), changed);
    this._renderSummary(content.querySelector("#summary"), shortcut ? data.page : data.entity_id, selected, roomIndex, cardIndex, kind);
    renderCollection();
    content.querySelector("[data-close]").addEventListener("click", () => { this._closeDialog(dialog); memberOptions?.cancel(); });
    content.querySelector("[data-save]").addEventListener("click", async () => {
        const target = shortcut ? data.page : data.entity_id;
        if (!target && (shortcut || !selected.entity_optional)) { this._renderSummary(content.querySelector("#summary"), "", selected, roomIndex, cardIndex, kind, shortcut ? "Select a page first." : "Select an entity first."); return; }
        if (data.entity_id && !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(data.entity_id)) {
          this._renderSummary(content.querySelector('#summary'), target, selected, roomIndex, cardIndex, kind, 'Page card entity_id must be a valid entity.'); return;
        }
        if (prefilledEntity && configuredEntityIds(this._container(kind, roomIndex)).has(target)) {
          this._renderSummary(content.querySelector("#summary"), target, selected, roomIndex, cardIndex, kind, this._t('alreadyAdded')); return;
        }
        let entity = existing ? { ...existing } : { __simple: false };
        entity.template = selected.id; entity.__simple = false;
        if (shortcut) { entity.page = data.page; if (selected.id === 'md_room_card' && data.entity_id) entity.entity_id = data.entity_id; else delete entity.entity_id; }
        else { if (data.entity_id) entity.entity_id = data.entity_id; else delete entity.entity_id; delete entity.page; }
        if (kind === 'page' && !entity.id) entity.id = newEntityGroupId().replace('group-', 'card-');
        if (data.name !== (camera ? titleData.name : existing?.name)) delete entity.name_key;
        if (selected.scene_collection) entity.entities = collection;
        if (selected.id === 'md_media_card' && appleTV !== undefined) entity.apple_tv = appleTV;
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
        if (selected.id === 'md_sensor_card') { const error = sensorThresholdError(variablesObject, data.entity_id); if (error) { this._renderSummary(content.querySelector('#summary'), target, selected, roomIndex, cardIndex, kind, this._l(error)); return; } }
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
    const group = clone(existing || { template: 'md_entity_group_card', id: newEntityGroupId(), entities: [] });
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
      renderResults();
    };
    const renderResults = () => {
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
    content.querySelector('[data-save]').addEventListener('click', async () => {
      const value = current();
      const validation = kind === 'page' ? { config_version: 2, name: this._model.name, landing_page: 'group', pages: [{ name: 'Group', path: 'group', entities: [value] }] } : kind === 'overview' ? { name: this._model.name, rooms: [], overview: { entity_groups: [value] } }
        : { name: this._model.name, rooms: [{ name: 'Group', entities: [value] }] };
      const ownerModel = this._model, ownerEpoch = this._documentEpoch;
      let errors;
      try { errors = await this._validateConfig(validation, this._catalog.config_version, this._entities, this._catalog.energy_units, this._catalog); }
      catch (error) { if (dialog.isConnected && dialog.open) content.querySelector('#group-error').textContent = this._error(error); return; }
      if (!this.isConnected || !dialog.open || ownerModel !== this._model || ownerEpoch !== this._documentEpoch) return;
      if (errors.length) { content.querySelector('#group-error').textContent = errors.map(error => this._l(error)).join(' '); return; }
      const container = this._editableContainer(kind, roomIndex);
      if (cardIndex == null) container.entities = [...container.entities, value]; else container.entities[cardIndex] = value;
      this._closeDialog(dialog); this._setDirty(); this._refreshCards(kind, roomIndex);
    });
    loading = false; render();
    dialog._metadataUpdated = () => { failure = ''; renderResults(); };
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
    const data = { power_entity: this._entityId(load.power_entity), toggle_entity: load.toggle_entity || "", name: load.name || "", icon: load.icon || "", template: load.template || (load.toggle_entity ? "md_toggle_graph_card" : "md_graph_card") };
    const fields = this._catalog.energy_fields || [];
    const options = {...(load.power_entity?.variables || {}), ...(load.variables || {})};
    for (const field of fields) data[`var__${field.key}`] = this._readVariable(options, field);
    this._openFormDialog(index == null ? "Add energy load" : "Edit energy load", data, [
      this._schema("power_entity", "Power entity", { entity: { domain: ["sensor"] } }, true),
      this._schema("toggle_entity", "Related toggle", { entity: { domain: ["switch", "input_boolean"] } }),
      this._schema("name", "Name", { text: {} }), this._schema("icon", "Icon", { icon: {} }),
      this._schema("template", "Card", { select: { mode: "dropdown", options: [{ value: "md_graph_card", label: "Graph" }, { value: "md_toggle_graph_card", label: "Toggle graph" }] } }),
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

  _dialog(title) {
    this._cardDrag?.cancel();
    const dialog = document.createElement("ha-dialog"); dialog.width = "large"; dialog.open = true; dialog.heading = this._l(title); dialog.headerTitle = this._l(title);
    const invoking = this.shadowRoot.activeElement, lifecycle = this._lifecycle, model = this._model;
    dialog.innerHTML = `<div class="dialog-content"></div>`; dialog.addEventListener("closed", () => {
      dialog.remove();
      if (this._galleryDialog === dialog) this._galleryDialog = null;
      this._resumeJsonPreparation();
      if (this.isConnected && lifecycle === this._lifecycle && model === this._model) {
        const target = invoking?.isConnected ? invoking : this.shadowRoot.querySelector('#page-manager');
        this._focusWithoutScroll(target);
      }
    });
    this.shadowRoot.append(dialog);
    this._containForm(dialog).catch((error) => this._setStatus(this._error(error), "error"));
    return dialog;
  }
  _closeDialog(dialog) { dialog.open = false; }

  async _validateConfig(...args) {
    const module = await import(new URL(`./MaraoNativeModel.js${PANEL_ASSET_VERSION}`, import.meta.url).href);
    return module.validateConfig(...args);
  }

  _setBusy(busy) {
    const settled = this._busy && !busy;
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
    if (settled) globalThis.window?.dispatchEvent?.(new Event('marao-interaction-settled'));
  }
  _setStatus(message, kind) { const status = this.shadowRoot.getElementById("status"); status.textContent = message; status.className = `status ${kind || ""}`; this.shadowRoot.getElementById("retry").hidden = !this._retryKind; }
  _error(error) {
    if (error?.name === 'SourceError') return this.nativeSession.describeError(error);
    const message = String(error?.message || error?.body?.message || error), split = message.indexOf(': ');
    return split < 0 ? this._l(message) : this._l(message.slice(0, split)) + message.slice(split);
  }
}

Object.assign(MaraoDashboardPanel.prototype, cardFormMethods);

if (!customElements.get("marao-dashboard-panel")) customElements.define("marao-dashboard-panel", MaraoDashboardPanel);
