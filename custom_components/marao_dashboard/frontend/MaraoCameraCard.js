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
  if (!instance || !event) throw new Error("Frigate instance and event IDs are required");
  if (kind === "clip") return `/api/frigate/${instance}/notifications/${event}/clip.mp4`;
  if (kind === "snapshot") return `/api/frigate/${instance}/snapshot/${event}`;
  if (kind === "thumbnail") return `/api/frigate/${instance}/thumbnail/${event}`;
  throw new Error(`Unsupported Frigate media kind: ${kind}`);
}

const PROTECT_ROOT = "media-source://unifiprotect";
const PROTECT_EVENT_TYPE = /:(?:all|motion|smart|ring|audio)$/;
let cameraStreamImport;

const ensureCameraStreamElement = async (entity) => {
  if (globalThis.customElements?.get("ha-camera-stream")) return true;
  if (typeof globalThis.loadCardHelpers !== "function") return false;
  if (!cameraStreamImport) {
    cameraStreamImport = Promise.resolve(globalThis.loadCardHelpers())
      .then(async (helpers) => {
        if (typeof helpers?.importMoreInfoControl === "function") {
          await helpers.importMoreInfoControl("camera");
        } else if (typeof helpers?.createCardElement === "function") {
          await helpers.createCardElement({ type: "picture-entity", entity, camera_view: "live" });
        }
        return Boolean(globalThis.customElements?.get("ha-camera-stream"));
      })
      .catch(() => {
        cameraStreamImport = undefined;
        return false;
      });
  }
  return cameraStreamImport;
};

export function cameraEventProvider(config = {}, hass = {}) {
  const provider = text(config.event_provider).toLowerCase().replace(/[\s-]+/g, "_");
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
  if (index < 0) throw new Error("Invalid UniFi Protect event media source");
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
        label: text(item.title) || "Event",
        mediaContentId,
        thumbnailContentId: protectThumbnailMediaSource(mediaContentId),
      };
    });
}

export class MaraoCameraCard extends HTMLElementBase {
  constructor() {
    super();
    this._events = [];
    this._status = "idle";
    this._request = 0;
    this._detailRequest = 0;
    this.attachShadow?.({ mode: "open" });
    this.shadowRoot?.addEventListener("click", (event) => this._handleClick(event));
    this.shadowRoot?.addEventListener("keydown", (event) => this._handleKeydown(event));
  }

  setConfig(config) {
    if (!text(config?.entity)) throw new Error("marao-camera-card requires an entity");
    const requestedLimit = Number(config.event_limit ?? config.limit ?? 12);
    this._config = {
      ...config,
      entity: text(config.entity),
      name: text(config.name),
      limit: Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.round(requestedLimit))) : 12,
    };
    this._events = [];
    this._status = "idle";
    this._modalOpen = false;
    this._cameraStreamFailed = false;
    this._selected = undefined;
    this._loadedKey = "";
    this._render();
  }

  set hass(hass) {
    const previousState = this._hass?.states?.[this._config?.entity];
    const previousLanguage = this._hass?.locale?.language;
    this._hass = hass;
    const state = hass?.states?.[this._config?.entity];
    if (previousState !== state || previousLanguage !== hass?.locale?.language) {
      this._render();
    } else {
      const stream = this.shadowRoot?.querySelector?.("ha-camera-stream");
      if (stream) stream.hass = hass;
    }
    this._maybeLoadEvents();
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 6, min_columns: 3 };
  }

  connectedCallback() {
    this._connected = true;
    this._render();
    this._prepareCameraStream();
    this._maybeLoadEvents();
  }

  disconnectedCallback() {
    this._connected = false;
    this._request += 1;
    this._detailRequest += 1;
  }

  openEvents() {
    if (!this._config) return;
    if (!this._modalOpen) this._loadedKey = "";
    this._modalOpen = true;
    this._selected = undefined;
    this._render();
    this._maybeLoadEvents();
  }

  closeEvents() {
    this._modalOpen = false;
    this._selected = undefined;
    this._detailRequest += 1;
    this._render();
    queueMicrotask(() => this.shadowRoot?.querySelector?.(".camera")?.focus?.());
  }

  async _prepareCameraStream() {
    if (!this._config || this._cameraStreamLoading) return;
    this._cameraStreamLoading = true;
    const ready = await ensureCameraStreamElement(this._config.entity);
    this._cameraStreamLoading = false;
    this._cameraStreamFailed = !ready;
    if (this._connected) this._renderCamera();
  }

  _eventKey() {
    const state = this._hass?.states?.[this._config.entity];
    const provider = cameraEventProvider(this._config, this._hass);
    const identity = frigateIdentity(this._config, state);
    const registry = this._hass?.entities?.[this._config.entity] || {};
    const device = this._hass?.devices?.[registry.device_id] || {};
    return {
      identity,
      provider,
      key: JSON.stringify([
        this._config.entity,
        provider,
        identity.instanceId,
        identity.camera,
        this._config.unifi_protect_media_source,
        registry.platform,
        registry.device_id,
        device.manufacturer,
        this._config.limit,
      ]),
    };
  }

  _maybeLoadEvents() {
    if (!this._connected || !this._modalOpen || !this._config || !this._hass) return;
    const request = this._eventKey();
    if (request.key === this._loadedKey) return;
    this._loadEvents(request.identity, request.key, request.provider);
  }

  async _loadEvents(identity, key, provider = "frigate") {
    const request = ++this._request;
    this._identity = identity;
    this._provider = provider;
    this._loadedKey = key;
    this._selected = undefined;
    if (provider === "frigate" && (!identity.instanceId || !identity.camera)) {
      this._status = "error";
      this._error = "This camera is not linked to a Frigate instance.";
      this._render();
      return;
    }
    if (!["frigate", "unifi_protect"].includes(provider)) {
      this._status = "error";
      this._error = `Unsupported camera event provider: ${provider}`;
      this._render();
      return;
    }
    if (typeof this._hass.callWS !== "function") {
      this._status = "error";
      this._error = "Home Assistant's camera event API is unavailable.";
      this._render();
      return;
    }

    this._status = "loading";
    this._error = "";
    this._render();
    try {
      const events = provider === "unifi_protect"
        ? await this._loadProtectEvents()
        : await this._loadFrigateEvents(identity);
      if (request !== this._request) return;
      this._events = events;
      this._status = "ready";
    } catch (error) {
      if (request !== this._request) return;
      this._events = [];
      this._status = "error";
      this._error = error?.message || "Unable to load camera events.";
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
      const consoleResults = await Promise.allSettled(consoles.map((console) => (
        this._browseMedia(console.media_content_id)
      )));
      cameras = cameras.concat(consoleResults.flatMap((result) => (
        result.status === "fulfilled" ? this._protectCameraChildren(result.value?.children) : []
      )));
    }
    const camera = matchProtectCamera(cameras, this._config.entity, this._hass);
    if (!camera) throw new Error("Unable to match this camera in the UniFi Protect media source.");
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
    if (!mediaSource.startsWith(`${PROTECT_ROOT}/`)) throw new Error("Invalid UniFi Protect media source.");
    if (/:recent:\d+$/.test(mediaSource)) return mediaSource;
    if (PROTECT_EVENT_TYPE.test(mediaSource)) return `${mediaSource}:recent:1`;

    const camera = await this._browseMedia(mediaSource);
    const eventTypes = (camera?.children || []).map((item) => text(item?.media_content_id)).filter(Boolean);
    const eventType = eventTypes.find((item) => item.endsWith(":all"))
      || eventTypes.find((item) => item.endsWith(":motion"))
      || eventTypes[0];
    if (!eventType) throw new Error("No UniFi Protect event folders are available for this camera.");
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
    if (!url) throw new Error("Unable to resolve UniFi Protect media URL");
    return typeof this._hass.hassUrl === "function" ? this._hass.hassUrl(url) : url;
  }

  async _signPath(path) {
    const signed = await this._hass.callWS({
      type: "auth/sign_path",
      path,
      expires: 600,
    });
    const signedPath = typeof signed === "string" ? signed : signed?.path;
    if (!signedPath) throw new Error("Unable to sign Frigate media URL");
    return typeof this._hass.hassUrl === "function" ? this._hass.hassUrl(signedPath) : signedPath;
  }

  _handleClick(event) {
    if (event.target?.matches?.("dialog.events-dialog")) {
      this.closeEvents();
      return;
    }
    const control = event.target?.closest?.("[data-action]");
    if (!control) return;
    const { action } = control.dataset;
    if (action === "open") this.openEvents();
    else if (action === "close") this.closeEvents();
    else if (action === "refresh") {
      this._loadedKey = "";
      this._selected = undefined;
      this._maybeLoadEvents();
    } else if (action === "back") {
      this._detailRequest += 1;
      this._selected = undefined;
      this._render();
    } else if (action === "event") {
      this._openEvent(Number(control.dataset.index));
    }
  }

  _handleKeydown(event) {
    if (event.key === "Escape" && this._modalOpen) {
      event.preventDefault();
      this.closeEvents();
      return;
    }
    const control = event.target?.closest?.('[data-action="open"]');
    if (control && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      this.openEvents();
    }
  }

  async _openEvent(index) {
    const event = this._events[index];
    if (!event) return;
    const detailRequest = ++this._detailRequest;
    this._selected = { event, status: "loading" };
    this._render();
    try {
      let kind = "clip";
      let url;
      if (this._provider === "unifi_protect") {
        url = await this._resolveMedia(event.mediaContentId);
      } else if (event.has_clip) {
        url = await this._signPath(frigateEventPath(this._identity.instanceId, event.id, "clip"));
      } else if (event.has_snapshot) {
        kind = "snapshot";
        url = await this._signPath(frigateEventPath(this._identity.instanceId, event.id, "snapshot"));
      } else {
        kind = "thumbnail";
        url = event.thumbnailUrl;
        if (!url) throw new Error("No media is available for this event.");
      }
      if (detailRequest !== this._detailRequest) return;
      this._selected = { event, kind, status: "ready", url };
    } catch (error) {
      if (detailRequest !== this._detailRequest) return;
      this._selected = {
        event,
        status: "error",
        error: error?.message || "Unable to load this event.",
      };
    }
    this._render();
  }

  _name() {
    const state = this._hass?.states?.[this._config?.entity];
    return this._config?.name || text(state?.attributes?.friendly_name) || "Camera";
  }

  _eventLabel(event) {
    if (event.provider === "unifi_protect") return text(event.label) || "Event";
    const label = text(event.label) || "Event";
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
    this._ensureLayout();
    this._renderCamera();
    this._renderModal();
  }

  _ensureLayout() {
    if (this._layoutReady) return;
    this.shadowRoot.innerHTML = `
      <style>${MaraoCameraCard.styles}</style>
      <ha-card>
        <div class="camera" data-action="open" role="button" tabindex="0">
          <div class="feed"></div>
          <span class="camera-name"></span>
        </div>
      </ha-card>
      <div class="modal-root"></div>`;
    this._layoutReady = true;
  }

  _renderCamera() {
    if (!this._layoutReady || !this._config) return;
    const state = this._hass?.states?.[this._config.entity];
    const name = this._name();
    const camera = this.shadowRoot.querySelector?.(".camera");
    const nameElement = this.shadowRoot.querySelector?.(".camera-name");
    const feed = this.shadowRoot.querySelector?.(".feed");
    camera?.setAttribute?.("aria-label", `Open recent events for ${name}`);
    if (nameElement) nameElement.textContent = name;
    if (!feed) return;

    const available = state && !["unavailable", "unknown"].includes(state.state);
    const streamReady = Boolean(globalThis.customElements?.get("ha-camera-stream"));
    const feedMode = available
      ? (streamReady ? `stream:${this._config.entity}` : (this._cameraStreamFailed ? "error" : "loading"))
      : "unavailable";
    if (feedMode !== this._feedMode) {
      if (feedMode.startsWith("stream:")) {
        feed.innerHTML = '<ha-camera-stream aria-hidden="true" allow-exoplayer></ha-camera-stream>';
      } else if (feedMode === "loading") {
        feed.innerHTML = '<div class="unavailable" role="status">Loading camera…</div>';
      } else if (feedMode === "error") {
        feed.innerHTML = '<div class="unavailable" role="alert">Unable to load camera stream</div>';
      } else {
        feed.innerHTML = '<div class="unavailable" role="status">Camera unavailable</div>';
      }
      this._feedMode = feedMode;
    }

    const stream = feed.querySelector?.("ha-camera-stream");
    if (stream && available) {
      stream.hass = this._hass;
      stream.stateObj = state;
      stream.muted = true;
      stream.controls = false;
    }
    if (available && !streamReady && !this._cameraStreamFailed) this._prepareCameraStream();
  }

  _renderModal() {
    if (!this._layoutReady) return;
    const root = this.shadowRoot.querySelector?.(".modal-root");
    if (!root) return;
    root.innerHTML = this._modalOpen ? this._renderDialog(escapeHtml(this._name())) : "";
    if (this._modalOpen) this._activateDialog();
  }

  _renderDialog(name) {
    let content;
    if (this._selected) content = this._renderDetail(this._selected);
    else if (this._status === "idle" || this._status === "loading") {
      content = '<p class="message" role="status">Loading events…</p>';
    } else if (this._status === "error") {
      content = `<p class="message error" role="alert">${escapeHtml(this._error)}</p>`;
    } else if (!this._events.length) {
      content = '<p class="message">No recent events.</p>';
    } else {
      content = `<div class="grid">${this._events.map((event, index) => this._renderEvent(event, index)).join("")}</div>`;
    }
    return `
      <dialog class="events-dialog" aria-labelledby="events-title">
        <div class="dialog-header">
          ${this._selected ? '<button class="icon-button" data-action="back" aria-label="Back to events">&#x2190;</button>' : ""}
          <h2 id="events-title">${name} events</h2>
          <span class="header-actions">
            <button class="icon-button" data-action="refresh" aria-label="Refresh events">&#x21bb;</button>
            <button class="icon-button" data-action="close" aria-label="Close events">&#x2715;</button>
          </span>
        </div>
        <main>${content}</main>
      </dialog>`;
  }

  _activateDialog() {
    const dialog = this.shadowRoot.querySelector?.("dialog");
    if (!dialog) return;
    dialog.addEventListener?.("cancel", (event) => {
      event.preventDefault();
      this.closeEvents();
    }, { once: true });
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    else dialog.setAttribute?.("open", "");
  }

  _renderEvent(event, index) {
    const label = escapeHtml(this._eventLabel(event));
    const date = escapeHtml(this._eventDate(event));
    const image = event.thumbnailUrl
      ? `<img src="${escapeHtml(event.thumbnailUrl)}" alt="" loading="lazy">`
      : '<span class="no-image" aria-hidden="true">&#x1f4f7;</span>';
    return `
      <button class="event" data-action="event" data-index="${index}" aria-label="Open ${label}${date ? `, ${date}` : ""}">
        <span class="thumbnail">${image}</span>
        <span class="meta"><strong>${label}</strong><small>${date}</small></span>
      </button>`;
  }

  _renderDetail(detail) {
    const label = escapeHtml(this._eventLabel(detail.event));
    const date = escapeHtml(this._eventDate(detail.event));
    if (detail.status === "loading") return '<p class="message" role="status">Loading event…</p>';
    if (detail.status === "error") return `<p class="message error" role="alert">${escapeHtml(detail.error)}</p>`;
    const media = detail.kind === "clip"
      ? `<video src="${escapeHtml(detail.url)}" aria-label="${label}" controls playsinline preload="metadata"></video>`
      : `<img class="detail-image" src="${escapeHtml(detail.url)}" alt="${label}">`;
    return `<section class="detail">${media}<div class="detail-meta"><strong>${label}</strong><small>${date}</small></div></section>`;
  }

  static styles = `
    :host { display: block; color: var(--primary-text-color); }
    ha-card { overflow: hidden; background: var(--ha-card-background, var(--card-background-color)); }
    .camera { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: #111; cursor: pointer; }
    .camera:focus-visible { outline: 3px solid var(--primary-color); outline-offset: -3px; }
    .feed { position: absolute; inset: 0; }
    ha-camera-stream { width: 100%; height: 100%; pointer-events: none; }
    .camera-name { position: absolute; inset: auto 0 0; padding: 32px 16px 12px; color: #fff; font-size: 17px; font-weight: 500; background: linear-gradient(transparent, rgb(0 0 0 / 75%)); }
    .unavailable { display: grid; place-items: center; height: 100%; color: #fff; }
    dialog { box-sizing: border-box; width: min(900px, calc(100vw - 24px)); max-height: min(780px, calc(100vh - 24px)); padding: 0; overflow: hidden; color: var(--primary-text-color); border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color)); border-radius: var(--ha-card-border-radius, 12px); background: var(--ha-card-background, var(--card-background-color)); box-shadow: var(--ha-card-box-shadow); }
    dialog::backdrop { background: rgb(0 0 0 / 60%); backdrop-filter: blur(2px); }
    .dialog-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--divider-color); }
    h2 { flex: 1; min-width: 0; margin: 0; overflow: hidden; font-size: var(--ha-card-header-font-size, 20px); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
    .header-actions { display: flex; }
    main { padding: 12px; overflow: auto; max-height: calc(100vh - 100px); }
    button { font: inherit; color: inherit; }
    .icon-button { width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent; cursor: pointer; font-size: 22px; }
    .icon-button:hover, .icon-button:focus-visible { background: var(--secondary-background-color); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 10px; }
    .event { min-width: 0; padding: 0; overflow: hidden; text-align: left; border: 0; border-radius: var(--ha-card-border-radius, 12px); background: var(--secondary-background-color); cursor: pointer; }
    .event:hover, .event:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
    .thumbnail { display: grid; place-items: center; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: var(--divider-color); }
    .thumbnail img { width: 100%; height: 100%; object-fit: cover; }
    .no-image { font-size: 28px; }
    .meta, .detail-meta { display: flex; flex-direction: column; gap: 3px; padding: 9px 10px 10px; }
    .meta strong, .meta small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    small { color: var(--secondary-text-color); }
    .message { margin: 0; padding: 32px 12px; text-align: center; color: var(--secondary-text-color); }
    .error { color: var(--error-color); }
    .detail video, .detail-image { display: block; width: 100%; max-height: calc(100vh - 190px); object-fit: contain; border-radius: var(--ha-card-border-radius, 12px); background: #000; }
    @media (max-width: 420px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `;
}

if (globalThis.customElements && !globalThis.customElements.get("marao-camera-card")) {
  globalThis.customElements.define("marao-camera-card", MaraoCameraCard);
}

if (globalThis.window) {
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === "marao-camera-card")) {
    window.customCards.push({
      type: "marao-camera-card",
      name: "Marao Camera Card",
      description: "Live camera feed with Frigate or UniFi Protect events",
    });
  }
}
