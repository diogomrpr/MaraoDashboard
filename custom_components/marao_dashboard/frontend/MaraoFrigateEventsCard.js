const HTMLElementBase = globalThis.HTMLElement || class {};

const text = (value) => (value == null ? "" : String(value).trim());

const localize = (key, hassOrLanguage, placeholders = {}, fallback = key) => {
  const language = hassOrLanguage || globalThis.document?.documentElement?.lang;
  const translated = globalThis.window?.MaraoDashboard?.localize?.(key, language, placeholders);
  const value = translated && translated !== key ? translated : fallback;
  return String(value).replace(/\{(\w+)\}/g, (_match, name) => (
    Object.prototype.hasOwnProperty.call(placeholders, name) ? placeholders[name] : `{${name}}`
  ));
};

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

const eventTime = (event) => {
  const value = event.end_time ?? event.start_time ?? event.timestamp ?? 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Date.parse(value) / 1000 || 0;
};

export function normalizeFrigateEvents(payload) {
  let value = payload;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) break;
    if (!value || typeof value !== "object") return [];
    if (value.id != null) {
      value = [value];
      break;
    }
    if (value.events !== undefined) value = value.events;
    else if (value.data !== undefined) value = value.data;
    else if (value.result !== undefined) value = value.result;
    else value = Object.values(value);
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((event) => event && typeof event === "object" && event.id != null)
    .map((event) => ({ ...event }))
    .sort((left, right) => eventTime(right) - eventTime(left));
}

export function frigateIdentity(config = {}, state = {}) {
  const attributes = state?.attributes || {};
  const entityId = text(config.entity);
  return {
    instanceId: text(config.frigate_instance_id) || text(attributes.client_id),
    camera: text(config.frigate_camera)
      || text(attributes.camera_name)
      || entityId.split(".").slice(1).join("."),
  };
}

export function frigateEventPath(instanceId, eventId, kind = "thumbnail") {
  const instance = encodeURIComponent(text(instanceId));
  const event = encodeURIComponent(text(eventId));
  if (!instance || !event) {
    throw new Error(localize(
      "camera_events.error.frigate_ids_required",
      undefined,
      {},
      "Frigate instance and event IDs are required",
    ));
  }
  if (kind === "clip") return `/api/frigate/${instance}/notifications/${event}/clip.mp4`;
  if (kind === "snapshot") return `/api/frigate/${instance}/snapshot/${event}`;
  if (kind === "thumbnail") return `/api/frigate/${instance}/thumbnail/${event}`;
  throw new Error(localize(
    "camera_events.error.unsupported_frigate_media_kind",
    undefined,
    { kind },
    "Unsupported Frigate media kind: {kind}",
  ));
}

const PROTECT_ROOT = "media-source://unifiprotect";
const PROTECT_EVENT_TYPE = /:(?:all|motion|smart|ring|audio)$/;
const MARAO_TEST_EVENT_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#315d78"/>
    <circle cx="320" cy="145" r="55" fill="#f6f7f2"/>
    <path d="M205 330c12-82 52-123 115-123s103 41 115 123" fill="#f6f7f2"/>
  </svg>
`)}`;

export function cameraEventProvider(config = {}, hass = {}) {
  const explicit = text(config.event_provider) || text(config.provider);
  const provider = explicit.toLowerCase().replace(/[\s-]+/g, "_");
  if (provider && provider !== "auto") {
    if (["unifi", "unify", "protect", "unifiprotect", "unifi_protect", "unify_protect", "ubiquiti"].includes(provider)) {
      return "unifi_protect";
    }
    return provider;
  }
  if (text(config.unifi_protect_media_source)) return "unifi_protect";

  const entity = hass.entities?.[text(config.entity)] || {};
  const device = hass.devices?.[entity.device_id] || {};
  const clues = [
    entity.platform,
    entity.integration,
    device.manufacturer,
    device.name,
    device.name_by_user,
  ].map(text).join(" ").toLowerCase();
  return /unifi[\s_-]*protect|ubiquiti/.test(clues) ? "unifi_protect" : "frigate";
}

const protectCameraEntity = (item) => {
  const match = text(item?.thumbnail).match(/\/api\/camera_proxy\/([^?/#]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const normalizedName = (value) => text(value).toLocaleLowerCase();

export function matchProtectCamera(cameras = [], entityId, hass = {}) {
  const selectedEntity = text(entityId);
  const exact = cameras.find((camera) => protectCameraEntity(camera) === selectedEntity);
  if (exact) return exact;

  const selectedRegistry = hass.entities?.[selectedEntity] || {};
  if (selectedRegistry.device_id) {
    const sameDevice = cameras.find((camera) => {
      const cameraEntity = protectCameraEntity(camera);
      return cameraEntity
        && hass.entities?.[cameraEntity]?.device_id === selectedRegistry.device_id;
    });
    if (sameDevice) return sameDevice;
  }

  const device = hass.devices?.[selectedRegistry.device_id] || {};
  const names = [
    hass.states?.[selectedEntity]?.attributes?.friendly_name,
    selectedRegistry.name,
    selectedRegistry.original_name,
    device.name_by_user,
    device.name,
  ].map(normalizedName).filter(Boolean);
  return cameras
    .filter((camera) => {
      const title = normalizedName(camera?.title);
      return title && names.some((name) => name === title || name.startsWith(`${title} `));
    })
    .sort((left, right) => text(right.title).length - text(left.title).length)[0];
}

export function protectThumbnailMediaSource(contentId) {
  const source = text(contentId);
  const marker = ":event:";
  const index = source.lastIndexOf(marker);
  if (index < 0) {
    throw new Error(localize(
      "camera_events.error.invalid_protect_event_source",
      undefined,
      {},
      "Invalid UniFi Protect event media source",
    ));
  }
  return `${source.slice(0, index)}:eventthumb:${source.slice(index + marker.length)}`;
}

export function normalizeProtectEvents(payload, limit = 12) {
  const requestedLimit = Number(limit);
  const maximum = Number.isFinite(requestedLimit) ? Math.max(0, Math.round(requestedLimit)) : 12;
  const children = Array.isArray(payload?.children) ? payload.children : [];
  return children
    .filter((item) => text(item?.media_content_id).includes(":event:"))
    .slice(0, maximum)
    .map((item) => {
      const mediaContentId = text(item.media_content_id);
      return {
        id: mediaContentId.slice(mediaContentId.lastIndexOf(":event:") + 7),
        provider: "unifi_protect",
        label: text(item.title) || localize("camera_events.event", undefined, {}, "Event"),
        mediaContentId,
        thumbnailContentId: protectThumbnailMediaSource(mediaContentId),
      };
    });
}

export class MaraoFrigateEventsCard extends HTMLElementBase {
  constructor() {
    super();
    this._events = [];
    this._status = "loading";
    this._request = 0;
    this._detailRequest = 0;
    this.attachShadow?.({ mode: "open" });
    this.shadowRoot?.addEventListener("click", (event) => this._handleClick(event));
  }

  setConfig(config) {
    if (!text(config?.entity)) {
      throw new Error(localize(
        "camera_events.error.entity_required",
        this._hass,
        {},
        "marao-frigate-events-card requires an entity",
      ));
    }
    const requestedLimit = Number(config.limit ?? 12);
    this._config = {
      ...config,
      entity: text(config.entity),
      limit: Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.round(requestedLimit))) : 12,
    };
    this._selected = undefined;
    this._loadedKey = "";
    this._render();
    this._maybeLoad();
  }

  set hass(hass) {
    const wasConnected = this._connectionAvailable();
    this._hass = hass;
    if (!wasConnected && this._connectionAvailable()) this._loadedKey = "";
    this._render();
    this._maybeLoad();
  }

  getCardSize() {
    return 4;
  }

  connectedCallback() {
    this._connected = true;
    this._render();
    this._maybeLoad();
  }

  disconnectedCallback() {
    this._connected = false;
  }

  _connectionAvailable() {
    return Boolean(this._hass)
      && this._hass.connected !== false
      && this._hass.connection?.connected !== false;
  }

  _maybeLoad() {
    if (!this._connected || !this._config || !this._connectionAvailable()) return;
    const state = this._hass.states?.[this._config.entity];
    const provider = cameraEventProvider(this._config, this._hass);
    const identity = frigateIdentity(this._config, state);
    const registry = this._hass.entities?.[this._config.entity] || {};
    const device = this._hass.devices?.[registry.device_id] || {};
    const key = JSON.stringify([
      this._config.entity,
      provider,
      identity.instanceId,
      identity.camera,
      this._config.unifi_protect_media_source,
      registry.platform,
      registry.device_id,
      device.manufacturer,
      this._config.limit,
    ]);
    if (key === this._loadedKey) return;
    this._load(identity, key, provider);
  }

  async _load(identity, key, provider = "frigate") {
    const request = ++this._request;
    this._identity = identity;
    this._provider = provider;
    this._loadedKey = key;
    this._selected = undefined;
    if (provider === "frigate" && (!identity.instanceId || !identity.camera)) {
      this._status = "error";
      this._error = localize(
        "camera_events.error.frigate_not_linked",
        this._hass,
        {},
        "This camera is not linked to a Frigate instance.",
      );
      this._render();
      return;
    }
    if (!["frigate", "unifi_protect", "marao_test"].includes(provider)) {
      this._status = "error";
      this._error = localize(
        "camera_events.error.unsupported_provider",
        this._hass,
        { provider },
        "Unsupported camera event provider: {provider}",
      );
      this._render();
      return;
    }
    if (provider !== "marao_test" && typeof this._hass.callWS !== "function") {
      this._status = "error";
      this._error = localize(
        "camera_events.error.api_unavailable",
        this._hass,
        {},
        "Home Assistant's camera event API is unavailable.",
      );
      this._render();
      return;
    }

    this._status = "loading";
    this._error = "";
    this._render();
    try {
      const withThumbnails = provider === "marao_test"
        ? this._loadTestEvents()
        : provider === "unifi_protect"
          ? await this._loadProtectEvents()
          : await this._loadFrigateEvents(identity);
      if (request !== this._request) return;
      this._events = withThumbnails;
      this._status = "ready";
    } catch {
      if (request !== this._request) return;
      this._events = [];
      this._status = "error";
      this._error = localize(
        "camera_events.error.load_failed",
        this._hass,
        { provider },
        "Unable to load camera events from {provider}.",
      );
    }
    this._render();
  }

  async _loadFrigateEvents(identity) {
    const response = await this._hass.callWS({
      type: "frigate/events/get",
      instance_id: identity.instanceId,
      cameras: [identity.camera],
      limit: this._config.limit,
    });
    const events = normalizeFrigateEvents(response).slice(0, this._config.limit);
    return Promise.all(events.map(async (event) => {
      try {
        const path = frigateEventPath(identity.instanceId, event.id, "thumbnail");
        return { ...event, thumbnailUrl: await this._signPath(path) };
      } catch {
        return { ...event, thumbnailUrl: "" };
      }
    }));
  }

  _loadTestEvents() {
    return [{
      id: "marao-test-person",
      provider: "marao_test",
      label: localize("camera_events.test.person_detected", this._hass, {}, "Person detected"),
      thumbnailUrl: MARAO_TEST_EVENT_IMAGE,
      detailUrl: MARAO_TEST_EVENT_IMAGE,
    }];
  }

  async _loadProtectEvents() {
    const configuredSource = text(this._config.unifi_protect_media_source);
    const cameraSource = configuredSource || await this._discoverProtectCameraSource();
    const recentSource = await this._protectRecentSource(cameraSource);
    const response = await this._browseMedia(recentSource);
    const events = normalizeProtectEvents(response, this._config.limit);
    return Promise.all(events.map(async (event) => {
      try {
        return { ...event, thumbnailUrl: await this._resolveMedia(event.thumbnailContentId) };
      } catch {
        return { ...event, thumbnailUrl: "" };
      }
    }));
  }

  async _discoverProtectCameraSource() {
    const root = await this._browseMedia(PROTECT_ROOT);
    let cameras = this._protectCameraChildren(root?.children);
    const consoles = (root?.children || []).filter((item) => /:browse$/.test(text(item?.media_content_id)));
    if (consoles.length) {
      const consoleResults = await Promise.all(consoles.map((console) => (
        this._browseMedia(console.media_content_id)
      )));
      cameras = cameras.concat(consoleResults.flatMap((result) => this._protectCameraChildren(result?.children)));
    }
    const camera = matchProtectCamera(cameras, this._config.entity, this._hass);
    if (!camera) {
      throw new Error(localize(
        "camera_events.error.protect_camera_not_matched",
        this._hass,
        {},
        "Unable to match this camera in the UniFi Protect media source.",
      ));
    }
    return camera.media_content_id;
  }

  _protectCameraChildren(children = []) {
    return children.filter((item) => {
      const source = text(item?.media_content_id);
      return /:browse:[^:]+$/.test(source) && !source.endsWith(":browse:all");
    });
  }

  async _protectRecentSource(source) {
    const mediaSource = text(source).replace(/\/$/, "");
    if (!mediaSource.startsWith(`${PROTECT_ROOT}/`)) {
      throw new Error(localize(
        "camera_events.error.invalid_protect_media_source",
        this._hass,
        {},
        "Invalid UniFi Protect media source.",
      ));
    }
    if (/:recent:\d+$/.test(mediaSource)) return mediaSource;
    if (PROTECT_EVENT_TYPE.test(mediaSource)) return `${mediaSource}:recent:1`;

    const camera = await this._browseMedia(mediaSource);
    const eventTypes = (camera?.children || []).map((item) => text(item?.media_content_id)).filter(Boolean);
    const eventType = eventTypes.find((item) => item.endsWith(":all"))
      || eventTypes.find((item) => item.endsWith(":motion"))
      || eventTypes[0];
    if (!eventType) {
      throw new Error(localize(
        "camera_events.error.no_protect_event_folders",
        this._hass,
        {},
        "No UniFi Protect event folders are available for this camera.",
      ));
    }
    return `${eventType}:recent:1`;
  }

  _browseMedia(mediaContentId) {
    return this._hass.callWS({
      type: "media_source/browse_media",
      media_content_id: mediaContentId,
    });
  }

  async _resolveMedia(mediaContentId) {
    const resolved = await this._hass.callWS({
      type: "media_source/resolve_media",
      media_content_id: mediaContentId,
    });
    const url = text(resolved?.url);
    if (!url) {
      throw new Error(localize(
        "camera_events.error.resolve_protect_media_failed",
        this._hass,
        {},
        "Unable to resolve UniFi Protect media URL",
      ));
    }
    return typeof this._hass.hassUrl === "function" ? this._hass.hassUrl(url) : url;
  }

  async _signPath(path) {
    const signed = await this._hass.callWS({
      type: "auth/sign_path",
      path,
      expires: 600,
    });
    const signedPath = typeof signed === "string" ? signed : signed?.path;
    if (!signedPath) {
      throw new Error(localize(
        "camera_events.error.sign_frigate_media_failed",
        this._hass,
        {},
        "Unable to sign Frigate media URL",
      ));
    }
    return typeof this._hass.hassUrl === "function" ? this._hass.hassUrl(signedPath) : signedPath;
  }

  _handleClick(event) {
    const button = event.target?.closest?.("[data-action]");
    if (!button || button.disabled || !this._connectionAvailable()) return;
    globalThis.window?.MaraoDashboard?.haptic?.("heavy");
    if (button.dataset.action === "refresh") {
      this._loadedKey = "";
      this._maybeLoad();
    } else if (button.dataset.action === "back") {
      this._detailRequest += 1;
      this._selected = undefined;
      this._render();
    } else if (button.dataset.action === "event") {
      this._openEvent(Number(button.dataset.index));
    }
  }

  async _openEvent(index) {
    const event = this._events[index];
    if (!event) return;
    const detailRequest = ++this._detailRequest;
    this._selected = { event, status: "loading" };
    this._render();
    try {
      const kind = this._provider === "unifi_protect" || event.has_clip ? "clip" : "snapshot";
      const url = this._provider === "marao_test"
        ? event.detailUrl
        : this._provider === "unifi_protect"
          ? await this._resolveMedia(event.mediaContentId)
          : await this._signPath(frigateEventPath(this._identity.instanceId, event.id, kind));
      if (detailRequest !== this._detailRequest) return;
      this._selected = { event, kind, status: "ready", url };
    } catch {
      if (detailRequest !== this._detailRequest) return;
      this._selected = {
        event,
        status: "error",
        error: localize(
          "camera_events.error.event_load_failed",
          this._hass,
          {},
          "Unable to load this event.",
        ),
      };
    }
    this._render();
  }

  _title() {
    const state = this._hass?.states?.[this._config?.entity];
    return text(this._config?.title)
      || text(state?.attributes?.friendly_name)
      || localize("camera_events.title", this._hass, {}, "Camera events");
  }

  _eventLabel(event) {
    if (event.provider === "unifi_protect") {
      return text(event.label) || localize("camera_events.event", this._hass, {}, "Event");
    }
    const label = text(event.label) || localize("camera_events.event", this._hass, {}, "Event");
    const subLabel = Array.isArray(event.sub_label) ? text(event.sub_label[0]) : text(event.sub_label);
    return subLabel ? `${label} · ${subLabel}` : label;
  }

  _eventDate(event) {
    const seconds = eventTime(event);
    if (!seconds) return "";
    try {
      return new Intl.DateTimeFormat(this._hass?.locale?.language, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(seconds * 1000));
    } catch {
      return new Date(seconds * 1000).toLocaleString();
    }
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const title = escapeHtml(this._title());
    const back = escapeHtml(localize("camera_events.back", this._hass, {}, "Back to events"));
    const refresh = escapeHtml(localize("camera_events.refresh", this._hass, {}, "Refresh events"));
    const disabled = this._connectionAvailable() ? "" : ' disabled aria-disabled="true"';
    const header = `
      <header>
        <h2>${title}</h2>
        ${this._selected
          ? `<button class="icon-button" data-action="back" aria-label="${back}" title="${back}"${disabled}>&#x2190;</button>`
          : `<button class="icon-button" data-action="refresh" aria-label="${refresh}" title="${refresh}"${disabled}>&#x21bb;</button>`}
      </header>`;
    let content;
    if (this._selected) content = this._renderDetail(this._selected);
    else if (this._status === "loading") content = `<p class="message" role="status">${escapeHtml(localize("camera_events.loading_events", this._hass, {}, "Loading events…"))}</p>`;
    else if (this._status === "error") content = `<p class="message error" role="alert">${escapeHtml(this._error)}</p>`;
    else if (!this._events.length) content = `<p class="message">${escapeHtml(localize("camera_events.no_recent_events", this._hass, {}, "No recent events."))}</p>`;
    else content = `<div class="grid">${this._events.map((event, index) => this._renderEvent(event, index)).join("")}</div>`;

    this.shadowRoot.innerHTML = `<style>${MaraoFrigateEventsCard.styles}</style><ha-card>${header}<main>${content}</main></ha-card>`;
  }

  _renderEvent(event, index) {
    const eventLabel = this._eventLabel(event);
    const eventDate = this._eventDate(event);
    const label = escapeHtml(eventLabel);
    const date = escapeHtml(eventDate);
    const image = event.thumbnailUrl
      ? `<img src="${escapeHtml(event.thumbnailUrl)}" alt="" loading="lazy">`
      : '<span class="no-image" aria-hidden="true">&#x1f4f7;</span>';
    const openLabel = escapeHtml(localize(
      "camera_events.open_event",
      this._hass,
      { event: eventLabel, date: eventDate ? `, ${eventDate}` : "" },
      "Open {event}{date}",
    ));
    return `
      <button class="event" data-action="event" data-index="${index}" aria-label="${openLabel}"${this._connectionAvailable() ? "" : ' disabled aria-disabled="true"'}>
        <span class="thumbnail">${image}</span>
        <span class="meta"><strong>${label}</strong><small>${date}</small></span>
      </button>`;
  }

  _renderDetail(detail) {
    const label = escapeHtml(this._eventLabel(detail.event));
    const date = escapeHtml(this._eventDate(detail.event));
    if (detail.status === "loading") return `<p class="message" role="status">${escapeHtml(localize("camera_events.loading_event", this._hass, {}, "Loading event…"))}</p>`;
    if (detail.status === "error") return `<p class="message error" role="alert">${escapeHtml(detail.error)}</p>`;
    const media = detail.kind === "clip"
      ? `<video src="${escapeHtml(detail.url)}" aria-label="${label}" controls playsinline preload="metadata"></video>`
      : `<img class="detail-image" src="${escapeHtml(detail.url)}" alt="${label}">`;
    return `<section class="detail">${media}<div class="detail-meta"><strong>${label}</strong><small>${date}</small></div></section>`;
  }

  static styles = `
    :host { display: block; color: var(--primary-text-color); font-family: var(--primary-font-family, Montserrat, Roboto, system-ui, sans-serif); }
    ha-card { overflow: hidden; background: var(--ha-card-background, var(--card-background-color)); }
    header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; }
    h2 { margin: 0; overflow-wrap: anywhere; font-size: var(--font-size-primary, 1.125rem); font-weight: var(--font-weight-primary, 700); }
    main { padding: 0 12px 12px; }
    button { font: inherit; color: inherit; }
    .icon-button { flex: 0 0 48px; width: 48px; min-width: 48px; height: 48px; border: 0; border-radius: 50%; background: transparent; cursor: pointer; font-size: max(1.5rem, var(--font-size-primary, 1.125rem)); transition: transform .12s ease, background-color .12s ease; }
    .icon-button:hover { background: var(--secondary-background-color); }
    .icon-button:active { transform: scale(.94); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 10px; }
    .event { min-width: 0; min-height: 48px; padding: 0; overflow: hidden; text-align: left; border: 0; border-radius: var(--ha-card-border-radius, 12px); background: var(--secondary-background-color); cursor: pointer; transition: transform .12s ease; }
    .event:hover { outline: 2px solid var(--primary-color); outline-offset: 1px; }
    button:focus { outline: none; }
    .event:active { transform: scale(.985); }
    button:disabled { cursor: default; opacity: .55; transform: none; }
    .thumbnail { display: grid; place-items: center; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: var(--divider-color); }
    .thumbnail img { width: 100%; height: 100%; object-fit: cover; }
    .no-image { font-size: 1.75rem; }
    .meta, .detail-meta { display: flex; flex-direction: column; gap: 3px; padding: 9px 10px 10px; font-size: var(--font-size-secondary, 1rem); font-weight: var(--font-weight-secondary, 500); }
    .meta strong, .meta small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    small { color: var(--secondary-text-color); font-size: var(--font-size-caption, .875rem); }
    .message { margin: 0; padding: 32px 12px; text-align: center; color: var(--secondary-text-color); font-size: var(--font-size-secondary, 1rem); }
    .error { color: var(--error-color); }
    .detail video, .detail-image { display: block; width: 100%; max-height: 65vh; object-fit: contain; border-radius: var(--ha-card-border-radius, 12px); background: #000; }
    @media (max-width: 420px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `;
}

export class MaraoCameraEventsCard extends MaraoFrigateEventsCard {}

export function registerMaraoCameraEventCards() {
  if (globalThis.customElements && !globalThis.customElements.get("marao-frigate-events-card")) {
    globalThis.customElements.define("marao-frigate-events-card", MaraoFrigateEventsCard);
  }

  if (globalThis.customElements && !globalThis.customElements.get("marao-camera-events-card")) {
    globalThis.customElements.define("marao-camera-events-card", MaraoCameraEventsCard);
  }

  if (globalThis.window) {
    const registrationLanguage = globalThis.document?.documentElement?.lang;
    window.customCards = window.customCards || [];
    if (!window.customCards.some((card) => card.type === "marao-frigate-events-card")) {
      window.customCards.push({
        type: "marao-frigate-events-card",
        name: localize("camera_events.card.frigate_name", registrationLanguage, {}, "Marão Frigate Events Card"),
        description: localize("camera_events.card.frigate_description", registrationLanguage, {}, "Recent Frigate events for a camera"),
      });
    }
    if (!window.customCards.some((card) => card.type === "marao-camera-events-card")) {
      window.customCards.push({
        type: "marao-camera-events-card",
        name: localize("camera_events.card.name", registrationLanguage, {}, "Marão Camera Events Card"),
        description: localize("camera_events.card.description", registrationLanguage, {}, "Recent Frigate or UniFi Protect events for a camera"),
      });
    }
  }
}

registerMaraoCameraEventCards();
