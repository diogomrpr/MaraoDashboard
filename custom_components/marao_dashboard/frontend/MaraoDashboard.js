import "./MaraoCameraCard.js";

const HTMLElementBase = globalThis.HTMLElement || class {};
const text = (value) => (value == null ? "" : String(value).trim());
const escapeHtml = (value) => String(value ?? "").replace(
  /[&<>"']/g,
  (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character],
);

const DOMAIN_DETAILS = {
  binary_sensor: ["Status", "mdi:radiobox-marked"],
  camera: ["Cameras", "mdi:cctv"],
  climate: ["Climate", "mdi:thermostat"],
  cover: ["Covers", "mdi:window-shutter"],
  fan: ["Fans", "mdi:fan"],
  light: ["Lights", "mdi:lightbulb-group"],
  lock: ["Locks", "mdi:lock"],
  media_player: ["Media", "mdi:play-box-multiple"],
  sensor: ["Sensors", "mdi:chart-line"],
  switch: ["Switches", "mdi:toggle-switch"],
  vacuum: ["Vacuums", "mdi:robot-vacuum"],
};

const DOMAIN_ORDER = [
  "camera",
  "light",
  "climate",
  "cover",
  "lock",
  "fan",
  "media_player",
  "vacuum",
  "switch",
  "sensor",
  "binary_sensor",
];

const pluralizeDomain = (domain) => {
  if (DOMAIN_DETAILS[domain]) return DOMAIN_DETAILS[domain][0];
  const label = domain.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return label.endsWith("s") ? label : `${label}s`;
};

export function slugify(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeDashboardPath(value) {
  const path = slugify(value) || "marao-dashboard";
  return path.includes("-") ? path : `${path}-dashboard`;
}

const activeEntities = (entities = []) => entities.filter((entity) => (
  entity
  && text(entity.entity_id)
  && entity.disabled_by == null
  && entity.hidden_by == null
));

const domainOf = (entityId) => text(entityId).split(".", 1)[0];

const sortByName = (items) => [...items].sort((left, right) => (
  text(left.name || left.original_name || left.entity_id || left.id)
    .localeCompare(text(right.name || right.original_name || right.entity_id || right.id))
));

function selectedAreaData({ areas = [], devices = [], entities = [], selectedAreaIds }) {
  const requested = selectedAreaIds == null ? null : new Set(selectedAreaIds.map(text));
  const selectedAreas = sortByName(areas.filter((area) => (
    text(area?.area_id)
    && (requested == null || requested.has(text(area.area_id)))
  )));
  const devicesById = new Map(devices.map((device) => [text(device.id), device]));
  const entitiesByArea = new Map(selectedAreas.map((area) => [text(area.area_id), []]));

  for (const entity of activeEntities(entities)) {
    const areaId = text(entity.area_id) || text(devicesById.get(text(entity.device_id))?.area_id);
    if (entitiesByArea.has(areaId)) entitiesByArea.get(areaId).push(entity);
  }

  const usedPaths = new Map();
  return selectedAreas.map((area) => {
    const base = slugify(area.name || area.area_id) || "room";
    const count = (usedPaths.get(base) || 0) + 1;
    usedPaths.set(base, count);
    return {
      area,
      entities: sortByName(entitiesByArea.get(text(area.area_id)) || []),
      path: count === 1 ? base : `${base}-${count}`,
    };
  });
}

const entityCard = (entity) => {
  const entityId = text(entity.entity_id);
  const domain = domainOf(entityId);
  const card = {
    type: domain === "camera" ? "custom:marao-camera-card" : "custom:marao-entity-card",
    entity: entityId,
  };
  const name = text(entity.name || entity.original_name);
  if (name) card.name = name;
  if (text(entity.icon)) card.icon = text(entity.icon);
  return card;
};

const roomCard = (room, dashboardPath) => {
  const cameraCount = room.entities.filter((entity) => domainOf(entity.entity_id) === "camera").length;
  return {
    type: "custom:marao-room-card",
    area_id: text(room.area.area_id),
    name: text(room.area.name) || text(room.area.area_id),
    icon: text(room.area.icon) || "mdi:sofa-outline",
    navigation_path: `/${dashboardPath}/${room.path}`,
    entity_count: room.entities.length,
    camera_count: cameraCount,
  };
};

const roomSections = (room, dashboardPath, title) => {
  const groups = new Map();
  for (const entity of room.entities) {
    const domain = domainOf(entity.entity_id);
    if (!groups.has(domain)) groups.set(domain, []);
    groups.get(domain).push(entity);
  }
  const domains = [...groups.keys()].sort((left, right) => {
    const leftIndex = DOMAIN_ORDER.indexOf(left);
    const rightIndex = DOMAIN_ORDER.indexOf(right);
    if (leftIndex < 0 && rightIndex < 0) return left.localeCompare(right);
    if (leftIndex < 0) return 1;
    if (rightIndex < 0) return -1;
    return leftIndex - rightIndex;
  });
  return [
    {
      type: "grid",
      cards: [
        {
          type: "custom:marao-header-card",
          title: text(room.area.name) || text(room.area.area_id),
          subtitle: title,
          icon: text(room.area.icon) || "mdi:sofa-outline",
          back_path: `/${dashboardPath}/home`,
        },
        roomCard(room, dashboardPath),
      ],
    },
    ...domains.map((domain) => ({
      type: "grid",
      cards: [
        {
          type: "heading",
          heading: pluralizeDomain(domain),
          icon: DOMAIN_DETAILS[domain]?.[1] || "mdi:dots-grid",
        },
        ...groups.get(domain).map(entityCard),
      ],
    })),
  ];
};

export function buildDashboardConfig({
  title = "Marao Home",
  urlPath = "marao-dashboard",
  areas = [],
  devices = [],
  entities = [],
  selectedAreaIds,
} = {}) {
  const dashboardTitle = text(title) || "Marao Home";
  const dashboardPath = normalizeDashboardPath(urlPath);
  const rooms = selectedAreaData({ areas, devices, entities, selectedAreaIds });
  return {
    title: dashboardTitle,
    views: [
      {
        title: "Home",
        path: "home",
        icon: "mdi:home-variant-outline",
        theme: "Marao Dashboard",
        type: "sections",
        max_columns: 4,
        sections: [
          {
            type: "grid",
            cards: [{
              type: "custom:marao-header-card",
              title: dashboardTitle,
              subtitle: `${rooms.length} ${rooms.length === 1 ? "area" : "areas"}`,
              icon: "mdi:home-variant-outline",
            }],
          },
          {
            type: "grid",
            cards: rooms.map((room) => roomCard(room, dashboardPath)),
          },
        ],
      },
      ...rooms.map((room) => ({
        title: text(room.area.name) || text(room.area.area_id),
        path: room.path,
        icon: text(room.area.icon) || "mdi:sofa-outline",
        theme: "Marao Dashboard",
        type: "sections",
        max_columns: 4,
        sections: roomSections(room, dashboardPath, dashboardTitle),
      })),
    ],
  };
}

export async function loadHomeAssistantRegistries(hass) {
  if (typeof hass?.callWS !== "function") throw new Error("Home Assistant is not connected");
  const [areas, devices, entities, dashboards] = await Promise.all([
    hass.callWS({ type: "config/area_registry/list" }),
    hass.callWS({ type: "config/device_registry/list" }),
    hass.callWS({ type: "config/entity_registry/list" }),
    hass.callWS({ type: "lovelace/dashboards/list" }),
  ]);
  return {
    areas: Array.isArray(areas) ? areas : [],
    devices: Array.isArray(devices) ? devices : [],
    entities: Array.isArray(entities) ? entities : [],
    dashboards: Array.isArray(dashboards) ? dashboards : [],
  };
}

export async function saveStorageDashboard(hass, {
  title,
  urlPath,
  config,
  overwrite = false,
  icon = "mdi:view-dashboard-variant",
  showInSidebar = true,
} = {}) {
  if (typeof hass?.callWS !== "function") throw new Error("Home Assistant is not connected");
  if (hass.user && !hass.user.is_admin) throw new Error("Administrator access is required");
  const dashboardTitle = text(title) || "Marao Home";
  const dashboardPath = normalizeDashboardPath(urlPath);
  const dashboards = await hass.callWS({ type: "lovelace/dashboards/list" });
  const existing = (Array.isArray(dashboards) ? dashboards : [])
    .find((dashboard) => text(dashboard.url_path) === dashboardPath);
  if (existing && !overwrite) throw new Error(`Dashboard “${dashboardPath}” already exists`);
  if (existing && existing.mode && existing.mode !== "storage") {
    throw new Error("Only storage-mode dashboards can be replaced");
  }

  let created;
  let previousConfig;
  let updated;
  if (!existing) {
    created = await hass.callWS({
      type: "lovelace/dashboards/create",
      url_path: dashboardPath,
      title: dashboardTitle,
      icon,
      show_in_sidebar: Boolean(showInSidebar),
      require_admin: false,
      mode: "storage",
    });
  } else {
    previousConfig = await hass.callWS({
      type: "lovelace/config",
      url_path: dashboardPath,
      force: true,
    });
    updated = await hass.callWS({
      type: "lovelace/dashboards/update",
      dashboard_id: existing.id,
      title: dashboardTitle,
    });
  }

  try {
    await hass.callWS({
      type: "lovelace/config/save",
      url_path: dashboardPath,
      config,
    });
  } catch (saveError) {
    if (created?.id) {
      try {
        await hass.callWS({
          type: "lovelace/dashboards/delete",
          dashboard_id: created.id,
        });
      } catch (rollbackError) {
        throw new AggregateError([saveError, rollbackError], "Saving and rollback both failed");
      }
    } else if (existing) {
      const rollbackErrors = [];
      try {
        await hass.callWS({
          type: "lovelace/config/save",
          url_path: dashboardPath,
          config: previousConfig,
        });
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      try {
        await hass.callWS({
          type: "lovelace/dashboards/update",
          dashboard_id: existing.id,
          title: existing.title,
        });
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      if (rollbackErrors.length) {
        throw new AggregateError(
          [saveError, ...rollbackErrors],
          "Replacing the dashboard failed and rollback was incomplete",
        );
      }
    }
    throw saveError;
  }
  return { created: Boolean(created), dashboard: updated || existing || created, urlPath: dashboardPath };
}

const cardStyles = `
  :host { display: block; color: var(--marao-text-primary, var(--primary-text-color)); }
  ha-card {
    overflow: hidden;
    border: 1px solid var(--marao-border-color, var(--divider-color));
    border-radius: var(--marao-card-radius, 22px);
    background: var(--marao-card-background, var(--ha-card-background, var(--card-background-color)));
    box-shadow: var(--marao-card-shadow, var(--ha-card-box-shadow, none));
  }
  button, input { font: inherit; }
  button { color: inherit; }
  .muted { color: var(--marao-text-secondary, var(--secondary-text-color)); }
`;

class MaraoCardElement extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow?.({ mode: "open" });
  }

  set hass(value) {
    this._hass = value;
    this._render?.();
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    return { columns: 3, rows: 2, min_columns: 3, min_rows: 1 };
  }
}

export class MaraoHeaderCard extends MaraoCardElement {
  static getStubConfig() {
    return { title: "Marao Home", subtitle: "Your home", icon: "mdi:home-variant-outline" };
  }

  getGridOptions() {
    return { columns: 6, rows: 3, min_columns: 3, min_rows: 2 };
  }

  setConfig(config = {}) {
    if (!text(config.title)) throw new Error("marao-header-card requires a title");
    this._config = { ...config };
    this._render();
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const backPath = text(this._config.back_path);
    this.shadowRoot.innerHTML = `
      <style>
        ${cardStyles}
        ha-card { padding: clamp(22px, 4vw, 38px); background:
          radial-gradient(circle at top right, color-mix(in srgb, var(--marao-accent, var(--primary-color)) 24%, transparent), transparent 48%),
          var(--marao-card-background, var(--ha-card-background, var(--card-background-color))); }
        .row { display: flex; align-items: center; gap: 18px; }
        .icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 18px;
          color: var(--marao-accent-contrast, white); background: var(--marao-accent, var(--primary-color)); }
        h1 { margin: 0; font-size: clamp(1.7rem, 4vw, 2.7rem); line-height: 1.05; letter-spacing: -.04em; }
        p { margin: 8px 0 0; font-size: 1rem; }
        .back { margin-left: auto; display: grid; place-items: center; min-width: 44px; height: 44px; border: 0;
          border-radius: 50%; background: color-mix(in srgb, var(--marao-accent, var(--primary-color)) 14%, transparent); cursor: pointer; }
      </style>
      <ha-card>
        <div class="row">
          <span class="icon"><ha-icon icon="${escapeHtml(text(this._config.icon) || "mdi:view-dashboard-outline")}"></ha-icon></span>
          <div><h1>${escapeHtml(this._config.title)}</h1><p class="muted">${escapeHtml(this._config.subtitle)}</p></div>
          ${backPath ? `<button class="back" type="button" aria-label="Back" data-path="${escapeHtml(backPath)}"><ha-icon icon="mdi:arrow-left"></ha-icon></button>` : ""}
        </div>
      </ha-card>`;
    this.shadowRoot.querySelector?.(".back")?.addEventListener("click", () => navigate(backPath));
  }
}

const navigate = (path) => {
  const destination = text(path);
  if (!destination || !globalThis.history?.pushState) return;
  globalThis.history.pushState(null, "", destination);
  globalThis.dispatchEvent?.(new Event("location-changed"));
};

export class MaraoRoomCard extends MaraoCardElement {
  constructor() {
    super();
    this.shadowRoot?.addEventListener("click", () => navigate(this._config?.navigation_path));
    this.shadowRoot?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate(this._config?.navigation_path);
      }
    });
  }

  setConfig(config = {}) {
    if (!text(config.name)) throw new Error("marao-room-card requires a name");
    this._config = { ...config };
    this._render();
  }

  static getStubConfig() {
    return { name: "Living Room", icon: "mdi:sofa-outline", entity_count: 0, camera_count: 0 };
  }

  getGridOptions() {
    return { columns: 3, rows: 3, min_columns: 3, min_rows: 2 };
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const entities = Math.max(0, Number(this._config.entity_count) || 0);
    const cameras = Math.max(0, Number(this._config.camera_count) || 0);
    const navigation = text(this._config.navigation_path);
    this.shadowRoot.innerHTML = `
      <style>
        ${cardStyles}
        ha-card { min-height: 150px; padding: 22px; cursor: ${navigation ? "pointer" : "default"}; transition: transform .16s ease, border-color .16s ease; }
        ha-card:hover { transform: translateY(-2px); border-color: var(--marao-accent, var(--primary-color)); }
        .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 16px;
          background: color-mix(in srgb, var(--marao-accent, var(--primary-color)) 14%, transparent); color: var(--marao-accent, var(--primary-color)); }
        h2 { margin: 22px 0 5px; font-size: 1.25rem; }
        p { margin: 0; }
      </style>
      <ha-card tabindex="${navigation ? "0" : "-1"}" role="${navigation ? "button" : "group"}" aria-label="${escapeHtml(navigation ? `Open ${this._config.name}` : this._config.name)}">
        <div class="top"><span class="icon"><ha-icon icon="${escapeHtml(text(this._config.icon) || "mdi:sofa-outline")}"></ha-icon></span><ha-icon icon="mdi:arrow-top-right"></ha-icon></div>
        <h2>${escapeHtml(this._config.name)}</h2>
        <p class="muted">${entities} ${entities === 1 ? "entity" : "entities"}${cameras ? ` · ${cameras} ${cameras === 1 ? "camera" : "cameras"}` : ""}</p>
      </ha-card>`;
  }
}

const TOGGLE_DOMAINS = new Set(["fan", "humidifier", "input_boolean", "light", "switch"]);

export class MaraoEntityCard extends MaraoCardElement {
  constructor() {
    super();
    this.shadowRoot?.addEventListener("click", (event) => this._handleClick(event));
    this.shadowRoot?.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target?.matches?.("ha-card")) {
        event.preventDefault();
        this._showMoreInfo();
      }
    });
  }

  setConfig(config = {}) {
    if (!text(config.entity) || !text(config.entity).includes(".")) {
      throw new Error("marao-entity-card requires an entity");
    }
    this._config = { ...config, entity: text(config.entity) };
    this._render();
  }

  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states || {}).find((entityId) => !entityId.startsWith("camera."));
    return { entity: entity || "light.example" };
  }

  _serviceButton(service, label, icon, disabled = false) {
    return `<button type="button" data-service="${service}" aria-label="${escapeHtml(`${label} ${this._displayName()}`)}" title="${escapeHtml(label)}" ${disabled ? "disabled" : ""}><ha-icon icon="${icon}"></ha-icon></button>`;
  }

  _displayName() {
    const state = this._hass?.states?.[this._config?.entity];
    return text(this._config?.name) || text(state?.attributes?.friendly_name) || text(this._config?.entity);
  }

  _controls(domain, state) {
    const disabled = !state || ["unavailable", "unknown"].includes(state.state);
    if (TOGGLE_DOMAINS.has(domain)) {
      return this._serviceButton("toggle", state?.state === "on" ? "Turn off" : "Turn on", "mdi:power", disabled);
    }
    if (domain === "lock") {
      if (state?.state === "unlocked") {
        return this._serviceButton("lock", "Lock", "mdi:lock", disabled);
      }
      return this._serviceButton("more-info", "More information", "mdi:chevron-right");
    }
    if (domain === "cover") {
      return `${this._serviceButton("open_cover", "Open", "mdi:arrow-up", disabled)}${this._serviceButton("close_cover", "Close", "mdi:arrow-down", disabled)}`;
    }
    if (domain === "vacuum") {
      return `${this._serviceButton("start", "Start", "mdi:play", disabled)}${this._serviceButton("return_to_base", "Return to base", "mdi:home-import-outline", disabled)}`;
    }
    return this._serviceButton("more-info", "More information", "mdi:chevron-right");
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const state = this._hass?.states?.[this._config.entity];
    const domain = domainOf(this._config.entity);
    let stateLabel = text(state?.state) || "Unavailable";
    try {
      stateLabel = this._hass?.formatEntityState?.(state) || stateLabel;
    } catch {
      // The raw state remains a safe fallback while Home Assistant is starting.
    }
    const icon = text(this._config.icon) || text(state?.attributes?.icon) || DOMAIN_DETAILS[domain]?.[1] || "mdi:circle-outline";
    this.shadowRoot.innerHTML = `
      <style>
        ${cardStyles}
        ha-card { display: flex; align-items: center; gap: 14px; min-height: 72px; padding: 14px 16px; }
        .icon { display: grid; place-items: center; flex: 0 0 42px; height: 42px; border-radius: 14px;
          color: var(--marao-accent, var(--primary-color)); background: color-mix(in srgb, var(--marao-accent, var(--primary-color)) 12%, transparent); }
        .copy { min-width: 0; flex: 1; }
        strong, small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        small { margin-top: 4px; }
        .controls { display: flex; gap: 7px; }
        button { display: grid; place-items: center; width: 40px; height: 40px; padding: 0; border: 0; border-radius: 13px;
          cursor: pointer; background: var(--marao-control-background, var(--secondary-background-color)); }
        button:hover { color: var(--marao-accent, var(--primary-color)); }
        button:disabled { opacity: .45; cursor: not-allowed; }
        @media (max-width: 420px) { ha-card { padding-inline: 12px; } .icon { display: none; } }
      </style>
      <ha-card tabindex="0" role="button" aria-label="More information for ${escapeHtml(this._displayName())}">
        <span class="icon"><ha-icon icon="${escapeHtml(icon)}"></ha-icon></span>
        <span class="copy"><strong>${escapeHtml(this._displayName())}</strong><small class="muted">${escapeHtml(stateLabel)}</small></span>
        <span class="controls">${this._controls(domain, state)}</span>
      </ha-card>`;
  }

  _showMoreInfo() {
    if (!this._config?.entity) return;
    this.dispatchEvent?.(new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId: this._config.entity },
    }));
  }

  _handleClick(event) {
    const button = event.target?.closest?.("button[data-service]");
    if (!button) {
      this._showMoreInfo();
      return;
    }
    event.stopPropagation();
    const service = button.dataset.service;
    if (service === "more-info") {
      this._showMoreInfo();
      return;
    }
    const domain = domainOf(this._config.entity);
    this._hass?.callService?.(domain, service, {}, { entity_id: this._config.entity });
  }
}

export class MaraoDashboardBuilder extends MaraoCardElement {
  constructor() {
    super();
    this._areas = [];
    this._devices = [];
    this._entities = [];
    this._dashboards = [];
    this._selectedAreas = new Set();
    this.shadowRoot?.addEventListener("change", (event) => this._handleChange(event));
    this.shadowRoot?.addEventListener("click", (event) => {
      if (event.target?.closest?.("[data-action=generate]")) this._generate();
    });
  }

  static getStubConfig() {
    return { title: "Marao Home", url_path: "marao-dashboard" };
  }

  setConfig(config = {}) {
    this._config = { ...config };
    this._title = text(config.title) || "Marao Home";
    this._urlPath = text(config.url_path) || "marao-dashboard";
    this._configuredAreas = Array.isArray(config.areas) ? new Set(config.areas.map(text)) : null;
    this._render();
  }

  set hass(value) {
    this._hass = value;
    this._render();
    if (this.isConnected) this._loadRegistries();
  }

  connectedCallback() {
    this._loadRegistries();
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 6, min_columns: 6 };
  }

  async _loadRegistries(force = false) {
    const connection = this._hass?.connection || this._hass;
    if (!connection || this._loading || (!force && this._registryConnection === connection)) return;
    this._loading = true;
    this._error = "";
    this._render();
    try {
      const registries = await loadHomeAssistantRegistries(this._hass);
      this._areas = registries.areas;
      this._devices = registries.devices;
      this._entities = registries.entities;
      this._dashboards = registries.dashboards;
      if (!this._selectedInitialized) {
        this._selectedAreas = this._configuredAreas || new Set(this._areas.map((area) => text(area.area_id)));
        this._selectedInitialized = true;
      }
      this._registryConnection = connection;
    } catch (error) {
      this._error = error?.message || String(error);
    } finally {
      this._loading = false;
      this._render();
    }
  }

  _existingDashboard() {
    const path = normalizeDashboardPath(this._urlPath);
    return this._dashboards.find((dashboard) => text(dashboard.url_path) === path);
  }

  _preview() {
    const rooms = selectedAreaData({
      areas: this._areas,
      devices: this._devices,
      entities: this._entities,
      selectedAreaIds: [...this._selectedAreas],
    });
    const entityCount = rooms.reduce((total, room) => total + room.entities.length, 0);
    const cameraCount = rooms.reduce((total, room) => (
      total + room.entities.filter((entity) => domainOf(entity.entity_id) === "camera").length
    ), 0);
    return { roomCount: rooms.length, entityCount, cameraCount };
  }

  _handleChange(event) {
    const target = event.target;
    if (target?.matches?.("[data-field=title]")) this._title = target.value;
    if (target?.matches?.("[data-field=path]")) {
      this._urlPath = target.value;
      this._overwrite = false;
    }
    if (target?.matches?.("[data-area]")) {
      if (target.checked) this._selectedAreas.add(target.dataset.area);
      else this._selectedAreas.delete(target.dataset.area);
    }
    if (target?.matches?.("[data-field=overwrite]")) this._overwrite = target.checked;
    this._success = "";
    this._render();
  }

  async _generate() {
    if (this._busy || !this._hass?.user?.is_admin) return;
    this._busy = true;
    this._error = "";
    this._success = "";
    this._render();
    const urlPath = normalizeDashboardPath(this._urlPath);
    const config = buildDashboardConfig({
      title: this._title,
      urlPath,
      areas: this._areas,
      devices: this._devices,
      entities: this._entities,
      selectedAreaIds: [...this._selectedAreas],
    });
    try {
      await saveStorageDashboard(this._hass, {
        title: this._title,
        urlPath,
        config,
        overwrite: Boolean(this._overwrite),
      });
      this._success = `Dashboard created at /${urlPath}/home`;
      await this._loadRegistries(true);
    } catch (error) {
      this._error = error?.message || String(error);
    } finally {
      this._busy = false;
      this._render();
    }
  }

  _render() {
    if (!this.shadowRoot) return;
    if (!this._config) this._config = {};
    const admin = Boolean(this._hass?.user?.is_admin);
    const preview = this._preview();
    const existing = this._existingDashboard();
    this.shadowRoot.innerHTML = `
      <style>
        ${cardStyles}
        ha-card { padding: clamp(20px, 4vw, 34px); }
        header { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; }
        header ha-icon { width: 38px; height: 38px; color: var(--marao-accent, var(--primary-color)); }
        h2, p { margin: 0; }
        header p { margin-top: 5px; }
        .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        label span, legend { display: block; margin-bottom: 7px; font-weight: 650; }
        input[type=text] { box-sizing: border-box; width: 100%; min-height: 46px; padding: 0 13px; color: inherit;
          border: 1px solid var(--marao-border-color, var(--divider-color)); border-radius: 13px; background: var(--secondary-background-color); }
        fieldset { margin: 24px 0; padding: 0; border: 0; }
        .areas { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 9px; }
        .area, .overwrite { display: flex; align-items: center; gap: 9px; min-height: 42px; padding: 0 12px;
          border-radius: 12px; background: var(--secondary-background-color); }
        .preview { display: flex; flex-wrap: wrap; gap: 9px; margin: 18px 0; }
        .stat { padding: 8px 12px; border-radius: 999px; background: color-mix(in srgb, var(--marao-accent, var(--primary-color)) 12%, transparent); }
        .path { margin: 8px 0 0; font-family: ui-monospace, monospace; font-size: .88rem; }
        .notice { margin: 15px 0; padding: 12px 14px; border-radius: 12px; background: var(--secondary-background-color); }
        .error { color: var(--error-color); }
        .success { color: var(--success-color, #2e7d32); }
        .generate { min-height: 46px; padding: 0 18px; border: 0; border-radius: 14px; color: var(--text-primary-color, white);
          background: var(--marao-accent, var(--primary-color)); cursor: pointer; font-weight: 700; }
        .generate:disabled { opacity: .48; cursor: not-allowed; }
        @media (max-width: 620px) { .fields { grid-template-columns: 1fr; } .areas { grid-template-columns: 1fr; } }
      </style>
      <ha-card>
        <header><ha-icon icon="mdi:auto-fix"></ha-icon><div><h2>Marao dashboard builder</h2><p class="muted">Create a dashboard from your Home Assistant areas.</p></div></header>
        ${!this._hass ? '<p class="notice">Waiting for Home Assistant…</p>' : ""}
        ${this._hass && !admin ? '<p class="notice error">Administrator access is required to create dashboards.</p>' : ""}
        ${admin ? `
          <div class="fields">
            <label><span>Dashboard title</span><input type="text" data-field="title" value="${escapeHtml(this._title || "Marao Home")}" autocomplete="off"></label>
            <label><span>URL path</span><input type="text" data-field="path" value="${escapeHtml(this._urlPath || "marao-dashboard")}" autocomplete="off"><p class="path muted">/${escapeHtml(normalizeDashboardPath(this._urlPath))}/home</p></label>
          </div>
          <fieldset><legend>Areas</legend><div class="areas">${sortByName(this._areas).map((area) => `
            <label class="area"><input type="checkbox" data-area="${escapeHtml(area.area_id)}" ${this._selectedAreas.has(text(area.area_id)) ? "checked" : ""}><span>${escapeHtml(area.name || area.area_id)}</span></label>`).join("") || '<span class="muted">No areas found.</span>'}</div></fieldset>
          <div class="preview" aria-label="Dashboard preview"><span class="stat">${preview.roomCount} areas</span><span class="stat">${preview.entityCount} entities</span><span class="stat">${preview.cameraCount} cameras</span></div>
          ${existing ? `<label class="overwrite"><input type="checkbox" data-field="overwrite" ${this._overwrite ? "checked" : ""}><span>Replace the existing “${escapeHtml(normalizeDashboardPath(this._urlPath))}” dashboard</span></label>` : ""}
          ${this._loading ? '<p class="notice">Loading Home Assistant registries…</p>' : ""}
          ${this._error ? `<p class="notice error" role="alert">${escapeHtml(this._error)}</p>` : ""}
          ${this._success ? `<p class="notice success" role="status">${escapeHtml(this._success)}</p>` : ""}
          <button class="generate" type="button" data-action="generate" ${this._busy || this._loading || preview.roomCount === 0 || (existing && !this._overwrite) ? "disabled" : ""}>${this._busy ? "Creating…" : existing ? "Replace dashboard" : "Create dashboard"}</button>
        ` : ""}
      </ha-card>`;
  }
}

const CARD_DEFINITIONS = [
  ["marao-dashboard-builder", MaraoDashboardBuilder, "Marao dashboard builder", "Build a modern dashboard from Home Assistant areas."],
  ["marao-header-card", MaraoHeaderCard, "Marao header", "A responsive dashboard or room heading."],
  ["marao-room-card", MaraoRoomCard, "Marao room", "A room summary and navigation card."],
  ["marao-entity-card", MaraoEntityCard, "Marao entity", "A compact entity card with domain-aware controls."],
];

for (const [type, constructor] of CARD_DEFINITIONS) {
  if (globalThis.customElements && !globalThis.customElements.get(type)) {
    globalThis.customElements.define(type, constructor);
  }
}

const windowObject = globalThis.window || globalThis;
windowObject.customCards = windowObject.customCards || [];
for (const [type, , name, description] of CARD_DEFINITIONS) {
  if (!windowObject.customCards.some((card) => card.type === type)) {
    windowObject.customCards.push({ type, name, description, preview: true });
  }
}
