import * as monaco from "monaco-editor/editor/editor.api";
import { jsonDefaults } from "monaco-editor/language/json/monaco.contribution";
import "./panel.css";

import {
  buildJsonSchema,
  cardForEntity,
  clone,
  entityMeta,
  importAreaRoom,
  materializeAreaRoom,
  mergeEntityValues,
  moveItem,
  normalizeConfig,
  preserveEntityValue,
  serializeConfig,
  slugify,
  validateConfig,
} from "./editor-model.js";
import {
  dependenciesFromPayload,
  recheckDependencies,
  renderDependencyChecklist,
} from "./dependency-checklist.js";

const PANEL_ASSET_VERSION = new URL(import.meta.url).search;
const PANEL_CSS = new URL(`./MaraoDashboardPanel.css${PANEL_ASSET_VERSION}`, import.meta.url).href;
self.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    const file = label === "json" ? "MaraoDashboardJsonWorker.js" : "MaraoDashboardEditorWorker.js";
    return new Worker(new URL(`./${file}${PANEL_ASSET_VERSION}`, import.meta.url), { type: "module" });
  },
};

const TEXT = {
  en: {
    subtitle: "Configure rooms, cards, and generated pages.", visual: "Visual", json: "JSON",
    save: "Save & Generate", discard: "Discard changes", history: "History", open: "Open dashboard",
    navigation: "Navigation bar", addNavPage: "Add page", general: "General", overview: "Overview", rooms: "Rooms", pages: "Pages", addRoom: "Add room", addCustomPage: "Add custom page",
    addCard: "Add card", noCards: "No entity cards yet.", dirty: "Unsaved changes", clean: "Saved",
    format: "Format JSON", advanced: "Advanced options", restore: "Restore", cancel: "Cancel",
    create: "Create", update: "Update", delete: "Delete", duplicate: "Duplicate",
    dependencies: "Card dependencies", dependencyHelp: "Check the dashboard cards detected in this Home Assistant instance. Missing cards do not block generation.",
    recheck: "Recheck", dependenciesChecked: "Dependency status refreshed.", dependencyId: "ID",
    testedVersion: "Tested version", usedBy: "Used by", openInHacs: "Open in HACS", repository: "Repository",
    installed: "Installed", notDetected: "Not detected", required: "Required", optional: "Optional", noDependencies: "No dependencies reported.",
  },
  pt: {
    subtitle: "Configure divisões, cartões e páginas geradas.", visual: "Visual", json: "JSON",
    save: "Guardar e gerar", discard: "Descartar alterações", history: "Histórico", open: "Abrir dashboard",
    navigation: "Barra de navegação", addNavPage: "Adicionar página", general: "Geral", overview: "Resumo", rooms: "Divisões", pages: "Páginas", addRoom: "Adicionar divisão", addCustomPage: "Adicionar página personalizada",
    addCard: "Adicionar cartão", noCards: "Ainda não existem cartões.", dirty: "Alterações por guardar", clean: "Guardado",
    format: "Formatar JSON", advanced: "Opções avançadas", restore: "Restaurar", cancel: "Cancelar",
    create: "Criar", update: "Atualizar", delete: "Eliminar", duplicate: "Duplicar",
    dependencies: "Dependências dos cartões", dependencyHelp: "Verifique os cartões do dashboard detetados nesta instância do Home Assistant. Cartões em falta não impedem a geração.",
    recheck: "Verificar novamente", dependenciesChecked: "Estado das dependências atualizado.", dependencyId: "ID",
    testedVersion: "Versão testada", usedBy: "Utilizado por", openInHacs: "Abrir no HACS", repository: "Repositório",
    installed: "Instalado", notDetected: "Não detetado", required: "Obrigatório", optional: "Opcional", noDependencies: "Nenhuma dependência reportada.",
  },
};

const PT_LABELS = {
  Home: "Início", "Dashboard name": "Nome do dashboard", "URL slug": "Identificador do URL", Theme: "Tema", Icon: "Ícone",
  "Weather entity": "Entidade meteorológica", Scenes: "Cenários", "Scene order": "Ordem dos cenários",
  Security: "Segurança", Energy: "Energia", Wallbox: "Carregador", Media: "Multimédia",
  Alarm: "Alarme", "Access entities": "Entidades de acesso", Actions: "Ações",
  "House power": "Potência da casa", "Month energy": "Energia do mês", "Month cost": "Custo do mês",
  "Today energy": "Energia de hoje", "Today cost": "Custo de hoje", Appliances: "Eletrodomésticos",
  Status: "Estado", "Charging power": "Potência de carregamento", "Maximum current": "Corrente máxima",
  "Current control": "Controlo de corrente", "Current presets": "Valores de corrente", "Pause / resume": "Pausar / retomar",
  "Media players": "Leitores multimédia", Entity: "Entidade", "Display name": "Nome apresentado",
  Light: "Luz", Cover: "Estores", Climate: "Climatização", Fan: "Ventoinha", "Media player": "Leitor multimédia",
  Access: "Acesso", Sensor: "Sensor", Switch: "Interruptor", "Number control": "Controlo numérico",
  Vacuum: "Aspirador", Battery: "Bateria", Dishwasher: "Máquina de lavar loiça",
  "Washing machine": "Máquina de lavar roupa", Graph: "Gráfico", "Toggle graph": "Gráfico com interruptor", Timeline: "Cronologia",
  "Brightness slider": "Controlo de luminosidade", "Card color": "Cor do cartão", "Label prefix": "Prefixo da legenda",
  "Temperature graph": "Gráfico de temperatura", "Graph entity": "Entidade do gráfico", "Mode buttons": "Botões de modo",
  "Graph color": "Cor do gráfico", "Setpoint label": "Legenda da temperatura", "Mode popup hash": "Endereço do popup de modo",
  "Speed slider": "Controlo de velocidade", "Background artwork": "Imagem de fundo", "Background color": "Cor de fundo",
  "Popup hash": "Endereço do popup", "Active color": "Cor ativa", "On icon": "Ícone ligado", "Off icon": "Ícone desligado",
  "Power entity": "Entidade de potência", "Power graph": "Gráfico de potência", "Power unit": "Unidade de potência",
  "Graph line": "Linha do gráfico", "Graph fill": "Preenchimento do gráfico", "Vacuum icon": "Ícone do aspirador",
  Progress: "Progresso", "Remaining time": "Tempo restante", "Salt warning": "Aviso de sal",
  "Rinse-aid warning": "Aviso de abrilhantador", "Active program": "Programa ativo", "Show icon": "Mostrar ícone",
  Background: "Fundo", "Toggle entity": "Entidade do interruptor", "Active content color": "Cor do conteúdo ativo",
  "Active icon background": "Fundo do ícone ativo", "Inactive background": "Fundo inativo",
  "Inactive name color": "Cor do nome inativo", "Inactive state color": "Cor do estado inativo",
  "Inactive icon color": "Cor do ícone inativo", "Inactive icon background": "Fundo do ícone inativo",
  "Timeline title": "Título da cronologia", "Room name": "Nome da divisão", Path: "Caminho",
  "Import Home Assistant area": "Importar área do Home Assistant", Loads: "Consumos", "Add load": "Adicionar consumo",
  "Related toggle": "Interruptor associado", Name: "Nome", Card: "Cartão", "Remote entity": "Entidade de comando",
  "Volume remote": "Comando de volume", "Apps — Name | Source | Icon": "Aplicações — Nome | Fonte | Ícone",
  "Page name": "Nome da página", "Target page": "Página de destino", "Page shortcut": "Atalho para página", "Icon color": "Cor do ícone",
  Columns: "Colunas", Automatic: "Automático",
};

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

class MaraoDashboardPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._loaded = false;
    this._busy = false;
    this._dirty = false;
    this._tab = "visual";
    this._dependencies = [];
    this._checkingDependencies = false;
    this._expandedSections = { rooms: true, pages: true };
    this._collapsedRooms = new Set();
  }

  set hass(value) {
    this._hass = value;
    if (this._monaco) this._setMonacoTheme();
    if (this.isConnected && !this._loaded) this._load();
  }

  set panel(value) { this._panel = value; }

  connectedCallback() {
    this._renderShell();
    if (this._hass && !this._loaded) this._load();
  }

  disconnectedCallback() { this._monaco?.dispose(); }

  _t(key) {
    const language = String(this._hass?.language || "en").toLowerCase().split("-")[0];
    return (TEXT[language] || TEXT.en)[key] || TEXT.en[key] || key;
  }

  _l(label) {
    const language = String(this._hass?.language || "en").toLowerCase().split("-")[0];
    return language === "pt" ? PT_LABELS[label] || label : label;
  }

  _renderShell() {
    if (this.shadowRoot.innerHTML) return;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${PANEL_CSS}">
      <main class="page">
        <div class="toolbar">
          <div class="title"><h1>Marao Dashboard Editor</h1><p>${this._t("subtitle")}</p></div>
          <span id="dirty" class="dirty"></span>
          <div class="actions">
            <ha-button id="history">${this._t("history")}</ha-button>
            <ha-button id="discard">${this._t("discard")}</ha-button>
            <a id="open-dashboard" href="#" target="_blank" rel="noopener"><ha-button>${this._t("open")}</ha-button></a>
            <ha-button id="save" appearance="filled">${this._t("save")}</ha-button>
          </div>
        </div>
        <div class="tabs" role="tablist">
          <button class="tab" data-tab="visual" role="tab" aria-selected="true">${this._t("visual")}</button>
          <button class="tab" data-tab="json" role="tab" aria-selected="false">${this._t("json")}</button>
        </div>
        <section id="visual-view" class="view"></section>
        <section id="json-view" class="view" hidden>
          <div class="actions" style="margin-bottom:10px"><ha-button id="format-json">${this._t("format")}</ha-button></div>
          <div class="json-shell"><div id="monaco"></div></div>
        </section>
        <div id="status" class="status" role="status"></div>
      </main>`;
    this.shadowRoot.querySelectorAll("[data-tab]").forEach((tab) =>
      tab.addEventListener("click", () => this._switchTab(tab.dataset.tab)));
    this.shadowRoot.getElementById("save").addEventListener("click", () => this._save());
    this.shadowRoot.getElementById("discard").addEventListener("click", () => this._discard());
    this.shadowRoot.getElementById("history").addEventListener("click", () => this._openHistory());
    this.shadowRoot.getElementById("format-json").addEventListener("click", () =>
      this._monaco?.getAction("editor.action.formatDocument")?.run());
  }

  async _load(force = false) {
    if (!this._hass || this._busy) return;
    this._setBusy(true);
    try {
      const payload = await this._hass.callWS({ type: "marao_dashboard/config/get" });
      this._catalog = payload.editor.catalog;
      this._entities = payload.editor.entities;
      this._areas = payload.editor.areas;
      this._history = payload.history;
      this._dependencies = dependenciesFromPayload(payload);
      this._model = normalizeConfig(JSON.parse(payload.config));
      this._savedSource = this._source();
      this._dirty = false;
      this._loaded = true;
      this.shadowRoot.getElementById("open-dashboard").href = payload.dashboard_url;
      this._renderVisual();
      this._updateHeader();
      if (this._monaco) this._setEditorSource(this._savedSource);
      this._setStatus(force ? this._t("clean") : "", "success");
    } catch (error) {
      this._setStatus(this._error(error), "error");
    } finally {
      this._setBusy(false);
    }
  }

  _source() { return `${JSON.stringify(serializeConfig(this._model), null, 2)}\n`; }

  _setDirty() {
    this._dirty = this._source() !== this._savedSource;
    this._updateHeader();
  }

  _updateHeader() {
    const dirty = this.shadowRoot.getElementById("dirty");
    dirty.textContent = this._dirty ? this._t("dirty") : "";
    this.shadowRoot.getElementById("save").disabled = this._busy || !this._loaded;
    this.shadowRoot.getElementById("discard").disabled = this._busy || !this._dirty;
  }

  _renderVisual() {
    if (!this._loaded) return;
    const root = this.shadowRoot.getElementById("visual-view");
    root.innerHTML = `
      <div class="section-grid">
        <ha-card class="span-two"><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:puzzle-outline"></ha-icon><h2>${this._t("dependencies")}</h2><span class="grow"></span><ha-button id="recheck-dependencies">${this._t("recheck")}</ha-button></div><p class="helper">${this._t("dependencyHelp")}</p><div id="dependency-list"></div></div></ha-card>
        <ha-card class="span-two"><div class="card-content"><div class="card-heading"><ha-icon icon="mdi:navigation-variant-outline"></ha-icon><h2>${this._t("navigation")}</h2><span class="grow"></span><ha-button id="add-nav-page">${this._t("addNavPage")}</ha-button></div><div id="navbar-list"></div></div></ha-card>
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
    this._renderDependencies(root.querySelector("#dependency-list"));
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
    root.querySelector("#recheck-dependencies").addEventListener("click", () => this._recheckDependencies());
    root.querySelector("#add-custom-page").addEventListener("click", (event) => {
      event.stopPropagation();
      this._openCustomPageDialog();
    });
  }

  _renderDependencies(host) {
    host.innerHTML = renderDependencyChecklist(this._dependencies, {
      dependencyId: this._t("dependencyId"),
      hacs: this._t("openInHacs"),
      installed: this._t("installed"),
      noDependencies: this._t("noDependencies"),
      notDetected: this._t("notDetected"),
      optional: this._t("optional"),
      repository: this._t("repository"),
      required: this._t("required"),
      testedVersion: this._t("testedVersion"),
      usedBy: this._t("usedBy"),
    });
  }

  async _recheckDependencies() {
    if (!this._hass || this._checkingDependencies) return;
    this._checkingDependencies = true;
    const button = this.shadowRoot.getElementById("recheck-dependencies");
    if (button) button.disabled = true;
    try {
      this._dependencies = await recheckDependencies(this._hass);
      this._renderDependencies(this.shadowRoot.getElementById("dependency-list"));
      this._setStatus(this._t("dependenciesChecked"), "success");
    } catch (error) {
      this._setStatus(this._error(error), "error");
    } finally {
      this._checkingDependencies = false;
      if (button?.isConnected) button.disabled = false;
    }
  }

  _availablePages() {
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

  _navigationEntries() {
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
    host.innerHTML = entries.length ? `<div class="navigation-list">${entries.map((entry, index) => {
      const path = typeof entry === "string" ? entry : entry?.page;
      const page = available.get(path);
      const label = page?.name || entry?.label || path || entry?.url || "Unknown page";
      const detail = page ? page.path : entry?.url || "Page is not currently generated";
      return `<div class="navigation-row"><ha-icon icon="${esc(page?.icon || entry?.icon || "mdi:link-variant")}"></ha-icon><div class="entity-main"><div class="entity-name">${esc(label)}</div><div class="entity-meta">${esc(detail)}</div></div><div class="row-actions">${this._iconButton("mdi:arrow-up", "Move up", "nav-up", index, index === 0)}${this._iconButton("mdi:arrow-down", "Move down", "nav-down", index, index === entries.length - 1)}${this._iconButton("mdi:delete-outline", this._t("delete"), "nav-delete", index)}</div></div>`;
    }).join("")}</div>` : `<div class="empty">No pages in the navigation bar.</div>`;
    host.querySelectorAll("[data-action^='nav-']").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.room);
      const navigation = this._editableNavigation();
      if (button.dataset.action === "nav-delete") navigation.splice(index, 1);
      else this._model.navigation = moveItem(navigation, index, index + (button.dataset.action === "nav-up" ? -1 : 1));
      this._setDirty(); this._renderVisual();
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
      this._setDirty(); this._renderVisual();
    });
  }

  _mountGeneralForm(host) {
    const data = { name: this._model.name || "", slug: this._model.slug || "", theme: this._model.theme || "", icon: this._model.icon || "" };
    const themes = Object.keys(this._hass?.themes?.themes || {}).sort().map((theme) => ({ value: theme, label: theme }));
    this._mountForm(host, data, [
      this._schema("name", "Dashboard name", { text: {} }, true),
      this._schema("slug", "URL slug", { text: {} }),
      this._schema("theme", "Theme", { select: { mode: "dropdown", custom_value: true, options: themes } }),
      this._schema("icon", "Icon", { icon: {} }),
    ], (value) => {
      Object.assign(this._model, value);
      this._setDirty();
    });
  }

  _mountOverviewForm(host) {
    const scenes = this._entityIds(this._model.overview.scenes);
    const data = { weather_entity: this._entityId(this._model.overview.weather_entity), scenes };
    host.innerHTML = `<div id="overview-fields"></div><div id="scene-order"></div>`;
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
  }

  _renderSceneOrder(host) {
    const scenes = Array.isArray(this._model.overview.scenes)
      ? this._model.overview.scenes
      : (this._model.overview.scenes ? [this._model.overview.scenes] : []);
    host.innerHTML = scenes.length > 1 ? `<div class="advanced"><strong>${this._l("Scene order")}</strong><ha-sortable>${scenes.map((scene, index) => `<div class="load-row"><span>${esc(entityMeta(this._entities, this._entityId(scene))?.name || this._entityId(scene))}</span>${this._iconButton("mdi:arrow-up", "Move up", "scene-up", index, index === 0)}${this._iconButton("mdi:arrow-down", "Move down", "scene-down", index, index === scenes.length - 1)}</div>`).join("")}</ha-sortable></div>` : "";
    host.querySelectorAll("[data-action^='scene-']").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.room);
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
          ${room.__areaLinked ? `<ha-alert class="linked" alert-type="info">This room follows area <strong>${esc(room.area)}</strong>. Editing its cards converts it to a fully editable snapshot. <ha-button data-action="room-materialize" data-room="${roomIndex}">Convert now</ha-button></ha-alert>` : ""}
          <ha-sortable handle-selector=".entity-row">${this._entityList(room, roomIndex)}</ha-sortable>
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
    const warning = entity.page ? (shortcutPage ? "" : " · Missing page") : !metadata ? " · Missing" : metadata.state === "unavailable" ? " · Unavailable" : "";
    const title = entity.name || shortcutPage?.name || metadata?.name || entity.entity_id || entity.page;
    const detail = entity.page ? `${entity.page} · ${this._l("Page shortcut")}` : `${entity.entity_id} · ${this._l(card?.label || entity.template || "Automatic")}`;
    return `<div class="entity-row" draggable="true" data-card-drag="${cardIndex}" data-room="${roomIndex}" data-kind="${kind}">
      <div class="entity-icon"><ha-icon icon="${esc(entity.icon || card?.icon || "mdi:help-circle-outline")}"></ha-icon></div>
      <div class="entity-main"><div class="entity-name">${esc(title)}</div><div class="entity-meta">${esc(detail)}${esc(warning)}</div></div>
      <div class="row-actions">
        ${this._iconButton("mdi:arrow-up", "Move up", "card-up", roomIndex, cardIndex === 0, cardIndex, kind)}
        ${this._iconButton("mdi:arrow-down", "Move down", "card-down", roomIndex, cardIndex === container.entities.length - 1, cardIndex, kind)}
        ${this._iconButton("mdi:pencil", "Edit card", "card-edit", roomIndex, false, cardIndex, kind)}
        ${this._iconButton("mdi:delete-outline", this._t("delete"), "card-delete", roomIndex, false, cardIndex, kind)}
      </div>
    </div>`;
  }

  _entityList(container, index, kind = "room") {
    const columns = Number.isInteger(container.columns) ? Math.min(6, Math.max(1, container.columns)) : null;
    const layout = columns ? ` data-columns="${columns}" style="--editor-columns:${columns}"` : "";
    return `<div class="entity-list"${layout}>${(container.entities || []).map((entity, cardIndex) => this._entityRow(entity, index, cardIndex, kind)).join("")}</div>`;
  }

  _iconButton(icon, label, action, room, disabled = false, card = null, kind = "room") {
    return `<ha-icon-button data-action="${action}" data-room="${room}" data-kind="${kind}" ${card == null ? "" : `data-card="${card}"`} label="${esc(label)}" ${disabled ? "disabled" : ""}><ha-icon icon="${icon}"></ha-icon></ha-icon-button>`;
  }

  _roomAction(element) {
    const action = element.dataset.action;
    const roomIndex = Number(element.dataset.room);
    const kind = element.dataset.kind || "room";
    const cardIndex = element.dataset.card == null ? null : Number(element.dataset.card);
    if (action === "custom-edit") return this._openCustomPageDialog(roomIndex);
    if (action === "custom-delete" && confirm(`Delete ${this._container(kind, roomIndex).name}?`)) this._model.pages.custom.splice(roomIndex, 1);
    if (action === "custom-duplicate") {
      const copy = clone(this._container(kind, roomIndex));
      copy.name = `${copy.name} copy`; copy.path = slugify(copy.name);
      this._model.pages.custom.splice(roomIndex + 1, 0, copy);
    }
    if (action === "custom-up") this._model.pages.custom = moveItem(this._model.pages.custom, roomIndex, roomIndex - 1);
    if (action === "custom-down") this._model.pages.custom = moveItem(this._model.pages.custom, roomIndex, roomIndex + 1);
    if (action === "room-edit") return this._openRoomDialog(roomIndex);
    if (action === "room-delete" && confirm(`Delete ${this._model.rooms[roomIndex].name}?`)) this._model.rooms.splice(roomIndex, 1);
    if (action === "room-duplicate") {
      const copy = clone(this._model.rooms[roomIndex]);
      copy.name = `${copy.name} copy`; copy.path = `room-${slugify(copy.name)}`;
      this._model.rooms.splice(roomIndex + 1, 0, copy);
    }
    if (action === "room-up") this._model.rooms = moveItem(this._model.rooms, roomIndex, roomIndex - 1);
    if (action === "room-down") this._model.rooms = moveItem(this._model.rooms, roomIndex, roomIndex + 1);
    if (action === "room-materialize") this._model.rooms[roomIndex] = materializeAreaRoom(this._model.rooms[roomIndex], this._entities, this._catalog.supported_domains);
    if (action === "card-add") return this._openCardGallery(roomIndex, kind);
    if (action === "card-edit") return this._openCardEditor(roomIndex, cardIndex, null, kind);
    if (action === "card-delete" && confirm("Delete this card?")) this._editableContainer(kind, roomIndex).entities.splice(cardIndex, 1);
    if (action === "card-up") this._editableContainer(kind, roomIndex).entities = moveItem(this._editableContainer(kind, roomIndex).entities, cardIndex, cardIndex - 1);
    if (action === "card-down") this._editableContainer(kind, roomIndex).entities = moveItem(this._editableContainer(kind, roomIndex).entities, cardIndex, cardIndex + 1);
    this._setDirty(); this._renderVisual();
  }

  _container(kind, index) { return kind === "custom" ? this._model.pages.custom[index] : this._model.rooms[index]; }

  _editableContainer(kind, index) {
    if (kind === "room" && this._model.rooms[index].__areaLinked) {
      this._model.rooms[index] = materializeAreaRoom(this._model.rooms[index], this._entities, this._catalog.supported_domains);
    }
    return this._container(kind, index);
  }

  _editableRoom(index) { return this._editableContainer("room", index); }

  _bindDrag(host) {
    let dragged;
    host.addEventListener("dragstart", (event) => {
      const card = event.target.closest("[data-card-drag]");
      const room = event.target.closest("[data-room-drag]");
      dragged = card ? { type: "card", room: Number(card.dataset.room), index: Number(card.dataset.cardDrag) } : room ? { type: "room", index: Number(room.dataset.roomDrag) } : null;
    });
    host.addEventListener("dragover", (event) => event.preventDefault());
    host.addEventListener("drop", (event) => {
      event.preventDefault();
      if (!dragged) return;
      const targetCard = event.target.closest("[data-card-drag]");
      const targetRoom = event.target.closest("[data-room-drag]");
      if (dragged.type === "room" && targetRoom) this._model.rooms = moveItem(this._model.rooms, dragged.index, Number(targetRoom.dataset.roomDrag));
      if (dragged.type === "card" && targetCard && Number(targetCard.dataset.room) === dragged.room) {
        const room = this._editableRoom(dragged.room);
        room.entities = moveItem(room.entities, dragged.index, Number(targetCard.dataset.cardDrag));
      }
      this._setDirty(); this._renderVisual();
    });
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
      if (key === "media") this._renderVisual();
    });
    if (key === "energy") this._renderEnergyLoads(host, page);
    if (key === "media") this._renderMediaPlayers(host, page);
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
    if (tab === this._tab) return;
    if (tab === "visual") {
      try {
        const parsed = JSON.parse(this._monaco.getValue());
        const errors = validateConfig(parsed);
        if (errors.length) throw new Error(errors.join(" "));
        this._model = normalizeConfig(parsed);
        this._renderVisual(); this._setDirty();
      } catch (error) {
        this._setStatus(`JSON: ${this._error(error)}`, "error"); return;
      }
    } else {
      await this._ensureMonaco(); this._setEditorSource(this._source());
    }
    this._tab = tab;
    this.shadowRoot.querySelectorAll("[data-tab]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.tab === tab)));
    this.shadowRoot.getElementById("visual-view").hidden = tab !== "visual";
    this.shadowRoot.getElementById("json-view").hidden = tab !== "json";
    if (tab === "json") requestAnimationFrame(() => this._monaco.layout());
    this._setStatus("", "");
  }

  async _ensureMonaco() {
    if (this._monaco) return;
    const schema = buildJsonSchema(this._catalog, this._entities);
    jsonDefaults.setDiagnosticsOptions({ validate: true, allowComments: false, schemas: [{ uri: schema.$id, fileMatch: ["*"], schema }] });
    monaco.editor.defineTheme("marao-light", { base: "vs", inherit: true, rules: [], colors: { "editor.background": "#ffffff" } });
    monaco.editor.defineTheme("marao-dark", { base: "vs-dark", inherit: true, rules: [], colors: { "editor.background": "#111827" } });
    this._monaco = monaco.editor.create(this.shadowRoot.getElementById("monaco"), {
      value: this._source(), language: "json", automaticLayout: true, minimap: { enabled: false },
      formatOnPaste: true, formatOnType: true, scrollBeyondLastLine: false, tabSize: 2,
    });
    this._setMonacoTheme();
    this._monaco.onDidChangeModelContent(() => {
      if (this._settingEditor) return;
      this._dirty = this._monaco.getValue().trim() !== this._savedSource.trim(); this._updateHeader();
    });
  }

  _setMonacoTheme() { if (this._monaco) monaco.editor.setTheme(this._hass?.themes?.darkMode ? "marao-dark" : "marao-light"); }
  _setEditorSource(source) { if (!this._monaco || this._monaco.getValue() === source) return; this._settingEditor = true; this._monaco.setValue(source); this._settingEditor = false; }

  async _save() {
    if (this._busy) return;
    let source;
    try {
      source = this._tab === "json" ? this._monaco.getValue() : this._source();
      const parsed = JSON.parse(source); const errors = validateConfig(parsed);
      if (errors.length) throw new Error(errors.join(" "));
      this._model = normalizeConfig(parsed);
    } catch (error) { this._setStatus(this._error(error), "error"); return; }
    this._setBusy(true); this._setStatus("Generating dashboard…", "");
    try {
      const result = await this._hass.callWS({ type: "marao_dashboard/config/generate", config: source });
      this._history = result.history; this._savedSource = this._source(); this._dirty = false;
      this.shadowRoot.getElementById("open-dashboard").href = result.dashboard_url;
      this._setEditorSource(this._savedSource); this._renderVisual(); this._updateHeader();
      this._setStatus(result.config_changed ? "Generated. Restart Home Assistant once to load the changed dashboard registration." : "Dashboard generated successfully.", "success");
    } catch (error) { this._setStatus(this._error(error), "error"); }
    finally { this._setBusy(false); }
  }

  _discard() {
    if (this._dirty && !confirm("Discard all unsaved changes?")) return;
    this._load(true);
  }

  _openRoomDialog(index = null) {
    const existing = index == null ? null : this._model.rooms[index];
    const data = existing ? { name: existing.name, path: existing.path || "", icon: existing.icon || "", columns: existing.columns ? String(existing.columns) : "auto" } : { area_import: "", name: "", path: "", icon: "mdi:sofa-outline", columns: "auto" };
    const schema = [];
    if (!existing) schema.push(this._schema("area_import", "Import Home Assistant area", { area: {} }));
    schema.push(this._schema("name", "Room name", { text: {} }, true), this._schema("path", "Path", { text: {} }), this._schema("icon", "Icon", { icon: {} }), this._columnsSchema());
    this._openFormDialog(existing ? "Edit room" : "Add room", data, schema, (value) => {
      let room = existing ? { ...existing } : null;
      if (!existing && value.area_import) {
        const area = this._areas.find((item) => item.area_id === value.area_import);
        if (area) room = importAreaRoom(area, this._entities, this._catalog.supported_domains);
      }
      room ||= { entities: [], __areaLinked: false };
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
      const page = existing ? { ...existing } : { entities: [], __areaLinked: false, __hadEntities: true };
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
    const dialog = this._dialog("Choose a Marao card");
    const content = dialog.querySelector(".dialog-content");
    content.innerHTML = `<div class="gallery">${this._catalog.cards.map((card) => `<button class="gallery-card" data-card="${card.id}"><ha-icon icon="${card.icon}"></ha-icon><span><strong>${esc(this._l(card.label))}</strong><small>${esc(card.description)}</small></span></button>`).join("")}</div><div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button></div>`;
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelectorAll("[data-card]").forEach((button) => button.addEventListener("click", () => { const cardId = button.dataset.card; this._closeDialog(dialog); this._openCardEditor(roomIndex, null, cardId, kind); }));
  }

  _openCardEditor(roomIndex, cardIndex = null, selectedCardId = null, kind = "room") {
    const existing = cardIndex == null ? null : this._editableContainer(kind, roomIndex).entities[cardIndex];
    const metadata = entityMeta(this._entities, existing?.entity_id);
    const selected = this._catalog.cards.find((card) => card.id === (selectedCardId || existing?.template || (existing?.page ? "hc_navigation_card" : ""))) || cardForEntity(this._catalog, metadata || existing) || this._catalog.cards[0];
    const shortcut = Boolean(selected.page_shortcut);
    const dialog = this._dialog(existing ? `Edit ${this._l(selected.label)}` : `Add ${this._l(selected.label)}`);
    const data = shortcut
      ? { page: existing?.page || "", name: existing?.name || "", icon: existing?.icon || selected.icon }
      : { entity_id: existing?.entity_id || "", name: existing?.name || "", icon: existing?.icon || "" };
    for (const field of this._expandedFields(selected.variables)) data[`var__${field.key}`] = this._readVariable(existing?.variables, field);
    const content = dialog.querySelector(".dialog-content");
    const variables = this._expandedFields(selected.variables);
    const basic = variables.filter((field) => !field.advanced);
    const advanced = variables.filter((field) => field.advanced);
    content.innerHTML = `<div id="card-form"></div><div id="summary" class="summary"></div>${advanced.length ? `<ha-expansion-panel id="advanced-panel" outlined><div slot="header">${this._t("advanced")}</div><div id="advanced-form" class="advanced-form"></div></ha-expansion-panel>` : ""}<div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button><ha-button data-save appearance="filled">${existing ? this._t("update") : this._t("create")}</ha-button></div>`;
    const changed = (value) => { Object.assign(data, value); this._renderSummary(content.querySelector("#summary"), shortcut ? data.page : data.entity_id, selected, roomIndex, cardIndex, kind); };
    const pageOptions = this._availablePages().filter((page) => kind !== "custom" || page.path !== this._container(kind, roomIndex).path).map((page) => ({ value: page.path, label: page.name }));
    const schema = [
      shortcut
        ? this._schema("page", "Target page", { select: { mode: "dropdown", options: pageOptions } }, true)
        : this._schema("entity_id", "Entity", { entity: { domain: selected.domains } }, true),
      this._schema("name", "Display name", { text: {} }),
      this._schema("icon", "Icon", { icon: {} }),
      ...basic.map((field) => this._variableSchema(field)),
    ];
    this._mountForm(content.querySelector("#card-form"), data, schema, changed);
    if (advanced.length) this._mountForm(content.querySelector("#advanced-form"), data, advanced.map((field) => this._variableSchema(field)), changed);
    this._renderSummary(content.querySelector("#summary"), shortcut ? data.page : data.entity_id, selected, roomIndex, cardIndex, kind);
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelector("[data-save]").addEventListener("click", () => {
        const target = shortcut ? data.page : data.entity_id;
        if (!target) { this._renderSummary(content.querySelector("#summary"), "", selected, roomIndex, cardIndex, kind, shortcut ? "Select a page first." : "Select an entity first."); return; }
        const entity = existing ? { ...existing } : { __simple: false };
        entity.template = selected.id; entity.__simple = false;
        if (shortcut) { entity.page = data.page; delete entity.entity_id; }
        else { entity.entity_id = data.entity_id; delete entity.page; }
        if (data.name) entity.name = data.name; else delete entity.name;
        if (data.icon) entity.icon = data.icon; else delete entity.icon;
        const variablesObject = { ...(existing?.variables || {}) };
        for (const field of this._expandedFields(selected.variables)) this._writeVariable(variablesObject, field, data[`var__${field.key}`]);
        if (Object.keys(variablesObject).length) entity.variables = variablesObject; else delete entity.variables;
        const container = this._editableContainer(kind, roomIndex);
        if (cardIndex == null) container.entities.push(entity); else container.entities[cardIndex] = entity;
        this._closeDialog(dialog); this._setDirty(); this._renderVisual();
    });
  }

  _renderSummary(host, target, card, roomIndex, cardIndex, kind = "room", error = "") {
    const container = this._container(kind, roomIndex);
    if (card.page_shortcut) {
      const page = this._availablePages().find((item) => item.path === target);
      const duplicate = container.entities.some((item, index) => item.page === target && index !== cardIndex);
      host.innerHTML = error ? `<strong style="color:var(--error-color)">${esc(error)}</strong>` : !target ? `<strong>Choose a target page</strong><span>The shortcut will navigate to another generated page.</span>` : !page ? `<strong>${esc(target)}</strong><span style="color:var(--warning-color)">This page is not currently generated.</span>` : `<strong>${esc(page.name)}</strong><span>${esc(page.path)}${duplicate ? " · Already linked from this page" : ""}</span>`;
      return;
    }
    const metadata = entityMeta(this._entities, target);
    const duplicate = container.entities.some((item, index) => item.entity_id === target && index !== cardIndex);
    host.innerHTML = error ? `<strong style="color:var(--error-color)">${esc(error)}</strong>` : !target ? `<strong>Choose a compatible ${esc(card.label)} entity</strong><span>Search by friendly name or entity ID.</span>` : !metadata ? `<strong>${esc(target)}</strong><span style="color:var(--warning-color)">This entity is not currently available in Home Assistant.</span>` : `<strong>${esc(metadata.name || metadata.entity_id)}</strong><span>${esc(metadata.state || "unknown")} · ${esc(metadata.area_name || "No area")} · ${esc(metadata.device_class || metadata.domain)}${duplicate ? " · Already added to this page" : ""}</span>`;
  }

  _openLoadDialog(index = null) {
    const page = this._model.pages.energy;
    const load = index == null ? {} : page.loads[index];
    const data = { power_entity: this._entityId(load.power_entity), toggle_entity: load.toggle_entity || "", name: load.name || "", icon: load.icon || "", template: load.template || (load.toggle_entity ? "hc_toggle_graph_card" : "hc_graph_card") };
    this._openFormDialog(index == null ? "Add energy load" : "Edit energy load", data, [
      this._schema("power_entity", "Power entity", { entity: { domain: ["sensor"] } }, true),
      this._schema("toggle_entity", "Related toggle", { entity: { domain: ["switch", "input_boolean"] } }),
      this._schema("name", "Name", { text: {} }), this._schema("icon", "Icon", { icon: {} }),
      this._schema("template", "Card", { select: { mode: "dropdown", options: [{ value: "hc_graph_card", label: "Graph" }, { value: "hc_toggle_graph_card", label: "Toggle graph" }] } }),
    ], (value) => {
      const next = { ...load, ...value }; if (!next.toggle_entity) delete next.toggle_entity;
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

  _openHistory() {
    const dialog = this._dialog(this._t("history")); const content = dialog.querySelector(".dialog-content");
    content.innerHTML = `${this._history?.length ? this._history.map((item) => `<div class="history-row"><div><strong>${esc(item.name || item.slug)}</strong><br><small>${new Date(item.created_at).toLocaleString()} · ${esc(item.reason)}</small></div><ha-button data-version="${item.version}">${this._t("restore")}</ha-button></div>`).join("") : `<div class="empty">No generated versions yet.</div>`}<div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button></div>`;
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelectorAll("[data-version]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirm("Restore this version? The current version will be saved first.")) return;
      try { this._setBusy(true); await this._hass.callWS({ type: "marao_dashboard/history/restore", version: button.dataset.version }); this._closeDialog(dialog); this._setBusy(false); await this._load(true); }
      catch (error) { this._setStatus(this._error(error), "error"); }
      finally { this._setBusy(false); }
    }));
  }

  _openFormDialog(title, initial, schema, save) {
    const dialog = this._dialog(title); const content = dialog.querySelector(".dialog-content"); const data = clone(initial);
    content.innerHTML = `<div id="form"></div><div class="dialog-actions"><ha-button data-close>${this._t("cancel")}</ha-button><ha-button data-save appearance="filled">${this._t("update")}</ha-button></div>`;
    this._mountForm(content.querySelector("#form"), data, schema, (value) => Object.assign(data, value));
    content.querySelector("[data-close]").addEventListener("click", () => this._closeDialog(dialog));
    content.querySelector("[data-save]").addEventListener("click", () => { save(data); this._closeDialog(dialog); });
  }

  _dialog(title) {
    const dialog = document.createElement("ha-dialog"); dialog.open = true; dialog.heading = title;
    dialog.innerHTML = `<div class="dialog-content"></div>`; dialog.addEventListener("closed", () => dialog.remove());
    this.shadowRoot.append(dialog); return dialog;
  }
  _closeDialog(dialog) { dialog.open = false; setTimeout(() => dialog.remove(), 250); }

  _schema(name, label, selector, required = false) { return { name, label: this._l(label), required, selector }; }
  _mountForm(host, data, schema, changed) {
    const form = document.createElement("ha-form"); form.hass = this._hass; form.data = data; form.schema = schema;
    form.computeLabel = (item) => item.label || item.name; form.computeHelper = (item) => item.helper || "";
    form.addEventListener("value-changed", (event) => changed(event.detail.value)); host.replaceChildren(form);
  }

  _variableSchema(field) {
    let selector = { text: {} };
    if (field.kind === "boolean") selector = { boolean: {} };
    if (field.kind === "entity") selector = { entity: { domain: field.domains || [] } };
    if (field.kind === "icon") selector = { icon: {} };
    if (field.kind === "number") selector = { number: {} };
    if (field.kind === "color") selector = { text: { type: "color" } };
    return { ...this._schema(`var__${field.key}`, this._l(field.label), selector), helper: field.description || "" };
  }

  _expandedFields(fields) {
    return fields.flatMap((field) => field.kind !== "vacuum_action" ? [field] : [
      { key: `${field.key}.icon`, label: `${field.label} icon`, kind: "icon", advanced: true },
      { key: `${field.key}.on_action`, label: `${field.label} service`, kind: "text", advanced: true },
      { key: `${field.key}.segment`, label: `${field.label} segment`, kind: "number", advanced: true },
    ]);
  }

  _readVariable(variables, field) {
    const [parent, child] = field.key.split("."); return child ? variables?.[parent]?.[child] ?? "" : variables?.[parent] ?? field.default ?? "";
  }
  _writeVariable(variables, field, value) {
    const empty = value === "" || value == null; const [parent, child] = field.key.split(".");
    if (child) { variables[parent] ||= {}; if (empty) delete variables[parent][child]; else variables[parent][child] = value; if (!Object.keys(variables[parent]).length) delete variables[parent]; }
    else if (empty) delete variables[parent]; else variables[parent] = value;
  }

  _entityId(value) { return typeof value === "string" ? value : value?.entity_id || ""; }
  _entityIds(values) { if (values == null) return []; return (Array.isArray(values) ? values : [values]).map((value) => this._entityId(value)).filter(Boolean); }
  _setBusy(busy) { this._busy = busy; this.shadowRoot.querySelectorAll("ha-button,ha-icon-button").forEach((button) => { button.disabled = busy; }); this._updateHeader(); }
  _setStatus(message, kind) { const status = this.shadowRoot.getElementById("status"); status.textContent = message; status.className = `status ${kind || ""}`; }
  _error(error) { return error?.message || error?.body?.message || String(error); }
}

if (!customElements.get("marao-dashboard-panel")) customElements.define("marao-dashboard-panel", MaraoDashboardPanel);
