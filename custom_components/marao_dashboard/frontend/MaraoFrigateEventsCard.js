const {bindPressFeedback,pressStyles}=await import(new URL(`./MaraoPressFeedback.js${new URL(import.meta.url).search}`,import.meta.url));
const HTMLElementBase = globalThis.HTMLElement || class {};
const { cardProblem, problemStyle, problemLabel, showCardDetails, nativeEditing, bindNativeEditing } = await import(new URL(`./MaraoCards.js${new URL(import.meta.url).search}`, import.meta.url));

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

export function normalizeNetatmoRecordings(payload,cameraId,limit = 20) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid recording limit.');
  if (!Array.isArray(payload?.children)) throw new Error('Unsupported native Netatmo recording response.');
  const records = new Map();
  for (const child of payload.children) {
    const id = text(child?.media_content_id), match = /^media-source:\/\/netatmo\/events\/([a-zA-Z0-9:_-]+)\/([0-9]+)$/.exec(id);
    const timestamp = match ? Number(match[2]) : NaN;
    if (!match || match[1] !== cameraId || !Number.isSafeInteger(timestamp) || timestamp <= 0 || !Number.isFinite(new Date(timestamp * 1000).getTime()) || !child.can_play) throw new Error('Unsupported native Netatmo recording identifier.');
    records.set(id,{id,provider:'netatmo',start_time:timestamp,mediaContentId:id,hasThumbnail:false,eventTypes:[]});
  }
  return [...records.values()].sort((a,b) => b.start_time - a.start_time).slice(0,limit);
}

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
const EVENT_BATCH = 3;
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
  if (/netatmo/.test(clues)) return "netatmo";
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
      const title = text(item.title);
      // Native Protect titles contain locale dates: keep their text, never guess a timezone.
      const heading = title.match(/^(.*?)\s+(?:\d+[hms]\s+)+(Ring Event|Motion Event|Object Detection - (.+)|Audio Detection - (.+))$/);
      const eventType = heading && (heading[3] ? normalizedName(heading[3]) : heading[4] ? "audio" : heading[2] === "Ring Event" ? "ring" : "motion");
      return {
        id: mediaContentId.slice(mediaContentId.lastIndexOf(":event:") + 7),
        provider: "unifi_protect",
        label: heading ? heading[3] || heading[4] || eventType : title || localize("camera_events.event", undefined, {}, "Event"),
        ...(heading ? { eventType, dateLabel: heading[1] } : {}),
        mediaContentId,
        thumbnailContentId: protectThumbnailMediaSource(mediaContentId),
      };
    });
}

export class MaraoFrigateEventsCard extends HTMLElementBase {
  constructor() {
    super();
    this._events = [];
    this._thumbnailErrors = new Set();
    this._status = "loading";
    this._request = 0;
    this._detailRequest = 0;
    this._availabilityState = "unavailable";
    this._filter = "";
    this._visibleCount = EVENT_BATCH;
    this._previewQueue = [];
    this._previewActive = 0;
    this.attachShadow?.({ mode: "open" });
    this.shadowRoot?.addEventListener("click", (event) => this._handleClick(event));
    this.shadowRoot?.addEventListener("error", (event) => this._handleMediaError(event), true);
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
    this._entityName = undefined;
    const requestedLimit = Number(config.limit ?? 12);
    this._config = {
      ...config,
      entity: text(config.entity),
      limit: Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.round(requestedLimit))) : 12,
    };
    this._selected = undefined;
    this._thumbnailErrors.clear();
    this._loadedKey = "";
    this._events = [];
    this._request += 1;
    this._detailRequest += 1;
    this._resetFeed();
    this._render();
    this._maybeLoad();
  }

  set hass(hass) {
    const previous = this._hass;
    const previousAvailability = this._availabilityState;
    this._hass = hass;
    this._availabilityState = this._unavailableState();
    if (previousAvailability !== this._availabilityState) {
      this._loadedKey = "";
      this._events = [];
      this._selected = undefined;
      this._request += 1;
      this._detailRequest += 1;
      this._resetFeed();
    }
    if (previous && previousAvailability === this._availabilityState
      && previous.states?.[this._config?.entity] === hass?.states?.[this._config?.entity]
      && ["themes", "locale", "language", "localize", "entities"].every(key => previous[key] === hass?.[key])) {
      this._maybeLoad();
      return;
    }
    this._render();
    this._maybeLoad();
  }

  getCardSize() {
    return 4;
  }

  connectedCallback() {
    this._stopNativeEditing?.(); this._stopNativeEditing = bindNativeEditing(this, editing => { if (editing) { this._detailRequest += 1; this._selected = undefined; this._detailsPopup?._close(false); this._render(); } });
    this._connected = true;
    this._render();
    this._maybeLoad();
  }

  disconnectedCallback() {
    this._stopNativeEditing?.(); this._stopNativeEditing = null;
    this._press?.destroy();this._press=null;
    this._detailsPopup?._close(false);
    this._connected = false;
    this._loadedKey = "";
    this._request += 1;
    this._detailRequest += 1;
    this._resetFeed();
  }

  _connectionAvailable() {
    return Boolean(this._hass)
      && this._hass.connected !== false
      && this._hass.connection?.connected !== false;
  }

  _unavailableState() {
    if (!this._connectionAvailable()) return "unavailable";
    const state = this._hass.states?.[this._config?.entity]?.state;
    if (!state || state === "unknown") return "unknown";
    return state === "unavailable" ? "unavailable" : "";
  }

  _maybeLoad() {
    if (!this._connected || !this._config || this._unavailableState()) return;
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
    if (this._unavailableState()) return;
    const request = ++this._request;
    this._identity = identity;
    this._provider = provider;
    this._loadedKey = key;
    this._selected = undefined;
    this._thumbnailErrors.clear();
    this._detailRequest += 1;
    this._events = [];
    this._resetFeed();
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
    if (!["frigate", "unifi_protect", "netatmo"].includes(provider)) {
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
    if (typeof this._hass.callWS !== "function") {
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
      const events = provider === "unifi_protect"
        ? await this._loadProtectEvents()
        : provider === "netatmo" ? await this._loadNetatmoRecordings()
        : await this._loadFrigateEvents(identity);
      if (request !== this._request) return;
      this._events = events;
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
    return normalizeFrigateEvents(response).slice(0, this._config.limit);
  }

  async _loadProtectEvents() {
    const configuredSource = text(this._config.unifi_protect_media_source);
    const cameraSource = configuredSource || await this._discoverProtectCameraSource();
    const recentSource = await this._protectRecentSource(cameraSource);
    const response = await this._browseMedia(recentSource);
    return normalizeProtectEvents(response, this._config.limit);
  }

  async _loadNetatmoRecordings() {
    const registry = await this._hass.callWS({type:'config/entity_registry/list'});
    if (!Array.isArray(registry)) throw new Error('Native Netatmo camera metadata is unavailable.');
    const entry = registry.find(item => item.entity_id === this._config.entity && item.platform === 'netatmo');
    if (!entry?.unique_id) throw new Error('Native Netatmo camera identity is unavailable.');
    const root = await this._browseMedia('media-source://netatmo');
    const folders = (root.children || []).filter(item => {
      const match = /^media-source:\/\/netatmo\/events\/([a-zA-Z0-9:_-]+)$/.exec(text(item.media_content_id));
      return match && entry.unique_id.startsWith(match[1]+'-') && item.can_expand;
    });
    if (folders.length !== 1) throw new Error('Native Netatmo camera identity is ambiguous or unavailable.');
    const id = folders[0].media_content_id, cameraId = id.split('/').at(-1);
    return normalizeNetatmoRecordings(await this._browseMedia(id),cameraId,this._config.limit);
  }

  _resetFeed() {
    this._observer?.disconnect();
    this._observer = undefined;
    this._previewQueue = [];
    this._filter = "";
    this._visibleCount = EVENT_BATCH;
    this._feedScroll = undefined;
  }

  _eventType(event) {
    if (event.provider === "netatmo") return "event";
    return event.provider === "unifi_protect" ? event.eventType || "event" : normalizedName(event.label) || "event";
  }

  _eventTypes(event) {
    return event.provider === "netatmo" ? [] : [this._eventType(event)];
  }

  _typeLabel(type) {
    const labels = {
      event: ["camera_events.event", "Event"],
      person: ["camera_events.type.person", "Person"],
      car: ["camera_events.type.car", "Car"],
      vehicle: ["camera_events.type.vehicle", "Vehicle"],
      motion: ["camera_events.type.motion", "Motion"],
      ring: ["camera_events.type.ring", "Doorbell"],
      audio: ["camera_events.type.audio", "Audio"],
      dog: ["camera_events.type.dog", "Dog"],
      cat: ["camera_events.type.cat", "Cat"],
      package: ["camera_events.type.package", "Package"],
      animal: ["camera_events.type.animal", "Animal"],
    };
    const label = Object.hasOwn(labels, type) ? labels[type] : undefined;
    return label ? localize(label[0], this._hass, {}, label[1])
      : text(this._events.find(event => this._eventType(event) === type)?.label) || type;
  }

  _filteredEvents() {
    return this._events.map((event, index) => ({ event, index }))
      .filter(({ event }) => !this._filter || this._eventTypes(event).includes(this._filter));
  }

  _queuePreview(index) {
    const event = this._events[index];
    if (!event || event.thumbnailUrl || event.thumbnailStatus) return;
    event.thumbnailStatus = "queued";
    this._previewQueue.push(index);
    this._drainPreviews();
  }

  _drainPreviews() {
    while (this._connected && !this._selected && !this._unavailableState() && this._previewActive < 2 && this._previewQueue.length) {
      const index = this._previewQueue.shift();
      this._previewActive += 1;
      this._loadPreview(index).finally(() => {
        this._previewActive -= 1;
        this._drainPreviews();
      });
    }
  }

  async _loadPreview(index) {
    const event = this._events[index];
    if (!event || !this._connected || this._unavailableState() || event.thumbnailUrl || ["loading", "ready", "error"].includes(event.thumbnailStatus)) return;
    const request = this._request;
    event.thumbnailStatus = "loading";
    try {
      if (this._provider === "netatmo" && !event.hasThumbnail) {
        event.thumbnailStatus = "empty";
        this._render();
        return;
      }
      const url = this._provider === "netatmo"
        ? text((await this._browseMedia(event.mediaContentId))?.thumbnail)
        : this._provider === "unifi_protect"
        ? await this._resolveMedia(event.thumbnailContentId)
        : await this._signPath(frigateEventPath(this._identity.instanceId, event.id, "thumbnail"));
      if (!url) throw new Error("Missing preview");
      if (request !== this._request || !this._connected || this._unavailableState()) return;
      event.thumbnailUrl = url;
      event.thumbnailStatus = "ready";
    } catch {
      if (request !== this._request || !this._connected || this._unavailableState()) return;
      event.thumbnailStatus = "error";
      this._thumbnailErrors.add(event.id);
    }
    this._render();
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
    if (this._unavailableState()) throw new Error("Camera unavailable");
    return this._hass.callWS({
      type: "media_source/browse_media",
      media_content_id: mediaContentId,
    });
  }

  async _resolveMedia(mediaContentId) {
    if (this._unavailableState()) throw new Error("Camera unavailable");
    const resolved = await this._hass.callWS({
      type: "media_source/resolve_media",
      media_content_id: mediaContentId,
    });
    const url = text(resolved?.url);
    if (!url) {
      throw new Error(localize(
        "camera_events.error.resolve_media_failed",
        this._hass,
        {},
        "Unable to resolve camera media URL",
      ));
    }
    return typeof this._hass.hassUrl === "function" ? this._hass.hassUrl(url) : url;
  }

  async _signPath(path) {
    if (this._unavailableState()) throw new Error("Camera unavailable");
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
    if (this.preview || nativeEditing(this)) return;
    const button = event.target?.closest?.("[data-action]");
    if (!button || button.disabled || this._unavailableState()) return;
    globalThis.window?.MaraoDashboard?.haptic?.("heavy");
    if (button.dataset.action === "details") {
      showCardDetails(this, this._selected?.error || this._error, button);
    } else if (button.dataset.action === "refresh") {
      this._loadedKey = "";
      this._maybeLoad();
    } else if (button.dataset.action === "back") {
      this._detailRequest += 1;
      this._selected = undefined;
      this._render();
      if (this._feedScroll) this._feedScroll.element.scrollTop = this._feedScroll.top;
      this.shadowRoot.querySelector?.(`.event[data-index="${this._openedIndex}"]`)?.focus({ preventScroll: true });
      this._drainPreviews();
    } else if (button.dataset.action === "filter") {
      this._setFilter(button.dataset.type);
    } else if (button.dataset.action === "more") {
      this._showMore();
    } else if (button.dataset.action === "event") {
      this._openEvent(Number(button.dataset.index));
    }
  }

  async _openEvent(index) {
    if (this._unavailableState()) return;
    const event = this._events[index];
    if (!event) return;
    const scroller = this._scrollRoot() || globalThis.document?.scrollingElement;
    this._feedScroll = scroller ? { element: scroller, top: scroller.scrollTop } : undefined;
    this._openedIndex = index;
    const detailRequest = ++this._detailRequest;
    this._selected = { event, status: "loading" };
    this._render();
    try {
      const kind = this._provider === "netatmo" ? "hls" : this._provider === "unifi_protect" || event.has_clip ? "clip" : "snapshot";
      const url = ["netatmo", "unifi_protect"].includes(this._provider)
        ? await this._resolveMedia(event.mediaContentId)
        : await this._signPath(frigateEventPath(this._identity.instanceId, event.id, kind));
      if (kind === "hls" && !globalThis.customElements?.get("ha-hls-player")) {
        const { loadNativeCamera } = await import(new URL(`./MaraoCamera.js${new URL(import.meta.url).search}`, import.meta.url));
        await loadNativeCamera();
        if (!globalThis.customElements?.get("ha-hls-player")) throw new Error("HLS player unavailable");
      }
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
      || (this._entityName = text(state?.attributes?.friendly_name) || this._entityName)
      || localize("camera_events.title", this._hass, {}, "Camera events");
  }

  _eventLabel(event) {
    if (event.provider === "netatmo") return localize('camera_events.type.recording',this._hass,{},'Recording');
    if (event.provider === "unifi_protect") {
      return event.eventType && event.eventType !== "audio" ? this._typeLabel(event.eventType)
        : text(event.label) || localize("camera_events.event", this._hass, {}, "Event");
    }
    const label = this._typeLabel(this._eventType(event));
    const subLabel = Array.isArray(event.sub_label) ? text(event.sub_label[0]) : text(event.sub_label);
    return subLabel ? `${label} · ${subLabel}` : label;
  }

  _eventDate(event) {
    if (event.provider === "unifi_protect") return text(event.dateLabel);
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

  _scrollRoot() {
    const viewport = this.shadowRoot?.querySelector?.('main');
    if (viewport) return viewport;
    for (let element = this.parentElement || this.getRootNode?.().host; element; element = element.parentElement || element.getRootNode?.().host) {
      if (element.classList?.contains("marao-popup-sheet") || ["auto", "scroll"].includes(globalThis.getComputedStyle?.(element)?.overflowY)) return element;
    }
    return null;
  }

  _setFilter(type) {
    if (type === this._filter) return;
    for (const index of this._previewQueue) delete this._events[index]?.thumbnailStatus;
    this._previewQueue = [];
    this._filter = type;
    this._visibleCount = EVENT_BATCH;
    this._render();
  }

  _showMore() {
    if (this._selected || this._visibleCount >= this._filteredEvents().length) return;
    this._visibleCount += EVENT_BATCH;
    this._render();
  }

  _observeFeed() {
    this._observer?.disconnect();
    this._observer = undefined;
    if (!this._connected || this._selected || this._status !== "ready" || this._unavailableState()) return;
    const targets = this.shadowRoot?.querySelectorAll?.('.event, [data-action="more"]:not([hidden])');
    if (!targets) return;
    if (!globalThis.IntersectionObserver) {
      for (const target of targets) if (target.dataset.action === "event") this._queuePreview(Number(target.dataset.index));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (this._observer !== observer || this._selected || !this._connected) return;
      for (const { target, isIntersecting } of entries) {
        if (this._observer !== observer) return;
        if (!isIntersecting || !target.isConnected) continue;
        observer.unobserve(target);
        if (target.dataset.action === "more") this._showMore();
        else this._queuePreview(Number(target.dataset.index));
      }
    }, { root: this._scrollRoot(), rootMargin: "160px 0px" });
    this._observer = observer;
    for (const target of targets) observer.observe(target);
  }

  _preview(event) {
    if (event.thumbnailStatus === "empty") return `<span class="preview-status">${escapeHtml(localize("camera_events.no_preview", this._hass, {}, "No preview"))}</span>`;
    if (event.thumbnailUrl && !this._thumbnailErrors.has(event.thumbnailUrl)) {
      return `<img src="${escapeHtml(event.thumbnailUrl)}" alt="" loading="lazy" decoding="async">`;
    }
    const failed = event.thumbnailStatus === "error" || this._thumbnailErrors.has(event.thumbnailUrl);
    return `<span class="preview-status"${failed ? ' role="status"' : ""}>${escapeHtml(failed
      ? localize("common.media_unavailable", this._hass, {}, "Media unavailable")
      : localize("camera_events.loading_preview", this._hass, {}, "Loading preview…"))}</span>`;
  }

  _render() {
    this._press ||= bindPressFeedback(this.shadowRoot);
    if (!this.shadowRoot || !this._config) return;
    const unavailable = this._unavailableState();
    const ready = Boolean(this._hass?.states) && !unavailable && this._status === "ready";
    const list = ready && this._events.length > 0;
    const problem = cardProblem({ entity: this._config.entity }, this._hass, {
      contentError: this._selected?.status === "error" ? this._selected.error : this._status === "error" ? this._error : this._thumbnailErrors.size ? localize("common.media_unavailable", this._hass, {}, "Media unavailable") : "",
      loading: this._selected?.status === "loading" || this._status === "loading",
    });
    const reason = problem && problem.kind !== "loading" && (unavailable || this._status === "error")
      ? `<p class="message" role="${problem.kind === "error" ? "alert" : "status"}"><ha-icon icon="${problem.kind === "neutral" ? "mdi:help-circle-outline" : "mdi:alert-circle-outline"}" aria-hidden="true"></ha-icon> ${escapeHtml(problemLabel(problem, this._hass))}<button type="button" data-action="details" aria-label="${escapeHtml(problem.reason)}"><ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon></button></p>` : "";
    const status = !this._hass?.states ? localize("common.loading", this._hass, {}, "Loading…")
      : unavailable ? localize(`common.${unavailable}`, this._hass, {}, unavailable === "unknown" ? "Unknown" : "Unavailable")
      : this._status === "loading" ? localize("camera_events.loading_events", this._hass, {}, "Loading events…")
      : this._status === "error" ? this._error
      : !this._events.length ? localize("camera_events.no_recent_events", this._hass, {}, "No recent events.") : "";
    const action = this._selected ? "back" : "refresh";
    const actionLabel = this._selected ? localize("camera_events.back", this._hass, {}, "Back to events") : localize("camera_events.refresh", this._hass, {}, "Refresh events");
    const disabled = Boolean(unavailable || (!this._selected && this._status === "loading"));
    const types = [...new Set(this._events.flatMap(event => this._eventTypes(event)))];
    const filters = [{ type: "", label: localize("camera_events.all", this._hass, {}, "All") }, ...types.map(type => ({ type, label: this._typeLabel(type) }))];
    const filterHtml = filters.map(({ type, label }) => `<button type="button" class="filter" data-action="filter" data-type="${escapeHtml(type)}" aria-pressed="${this._filter === type}"${!ready ? " disabled" : ""}>${escapeHtml(label)}</button>`).join("");
    const rows = this._filteredEvents().slice(0, this._visibleCount);
    const more = rows.length < this._filteredEvents().length;
    const detail = this._selected ? this._renderDetail(this._selected) : "";
    let card = this.shadowRoot.querySelector?.("ha-card");
    if (!card) {
      this.shadowRoot.innerHTML = `<style>${MaraoFrigateEventsCard.styles}</style><ha-card data-status="${!this._hass?.states ? "loading" : unavailable || this._status}"${problem ? ` data-problem="${problem.kind}" style="${problemStyle(problem)}"` : ""}>
        <header><div class="heading"><h2>${escapeHtml(this._title())}</h2><button type="button" class="icon-button" data-action="${action}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}"${disabled ? ' disabled aria-disabled="true"' : ""}>${this._selected ? '&#x2190;' : '&#x21bb;'}</button></div>
          <div class="filters" role="group" aria-label="${escapeHtml(localize("camera_events.filters", this._hass, {}, "Event types"))}"${this._selected ? ' style="visibility:hidden"' : ""}>${filterHtml}</div></header>
        <main><div class="problem">${reason}</div><p class="message state" role="status"${this._selected || !status || reason ? " hidden" : ""}>${escapeHtml(status)}</p>
          <div class="feed"${!list || this._selected ? " hidden" : ""}><div class="grid">${list ? rows.map(({ event, index }) => this._renderEvent(event, index)).join("") : ""}</div>
          <button type="button" class="more" data-action="more"${!more ? " hidden" : ""}${!ready ? " disabled" : ""}>${escapeHtml(localize("camera_events.load_more", this._hass, {}, "Load more"))}</button></div>
          <div class="event-detail"${!this._selected ? " hidden" : ""}>${detail}</div></main></ha-card>`;
      card = this.shadowRoot.querySelector?.("ha-card");
      for (const { event, index } of rows) {
        const thumbnail = card?.querySelector(`.event[data-index="${index}"] .thumbnail`);
        if (thumbnail) thumbnail._preview = this._preview(event);
      }
      this._observeFeed();
    } else {
      card.dataset.status = !this._hass?.states ? "loading" : unavailable || this._status;
      if (problem) {
        card.dataset.problem = problem.kind;
        card.style.cssText = problemStyle(problem);
      } else {
        card.removeAttribute("data-problem");
        card.removeAttribute("style");
      }
      this.shadowRoot.querySelector("h2").textContent = this._title();
      const button = this.shadowRoot.querySelector(".icon-button");
      button.dataset.action = action;
      button.textContent = this._selected ? "←" : "↻";
      button.setAttribute("aria-label", actionLabel);
      button.title = actionLabel;
      button.disabled = disabled;
      button.setAttribute("aria-disabled", String(disabled));
      const toolbar = this.shadowRoot.querySelector(".filters");
      toolbar.hidden = false; toolbar.style.visibility = this._selected ? 'hidden' : '';
      toolbar.setAttribute("aria-label", localize("camera_events.filters", this._hass, {}, "Event types"));
      // Keep pressed filter controls mounted so touch focus and horizontal scroll survive.
      const filterKey = JSON.stringify(filters);
      if (this._filterKey !== filterKey) toolbar.innerHTML = filterHtml;
      for (const filter of toolbar.children) {
        filter.setAttribute("aria-pressed", String(filter.dataset.type === this._filter));
        filter.disabled = !ready;
      }
      this._filterKey = filterKey;
      const problemHost = this.shadowRoot.querySelector(".problem");
      if (this._reason !== reason) problemHost.innerHTML = reason;
      this._reason = reason;
      const state = this.shadowRoot.querySelector(".state");
      state.hidden = Boolean(this._selected || !status || reason);
      state.textContent = status;
      const feed = this.shadowRoot.querySelector(".feed");
      const wasHidden = feed.hidden;
      feed.hidden = !list || Boolean(this._selected);
      const grid = feed.querySelector(".grid");
      const indexes = rows.map(({ index }) => String(index));
      const current = [...grid.children].map(row => row.dataset.index);
      let changed = false;
      if (!list || this._renderedEvents !== this._events || !current.every((index, offset) => index === indexes[offset])) {
        grid.replaceChildren();
        changed = true;
      }
      if (list) for (const { event, index } of rows) {
        let row = grid.querySelector(`[data-index="${index}"]`);
        if (!row) {
          grid.insertAdjacentHTML("beforeend", this._renderEvent(event, index));
          row = grid.lastElementChild;
          row.querySelector(".thumbnail")._preview = this._preview(event);
          changed = true;
        }
        const heading = row.querySelector(".meta");
        const headingHtml = this._eventHeading(event);
        if (heading._html !== headingHtml) {
          heading.innerHTML = headingHtml;
          heading._html = headingHtml;
        }
        row.querySelector(".event").setAttribute("aria-label", this._openLabel(event));
        const thumbnail = row.querySelector(".thumbnail");
        const preview = this._preview(event);
        if (thumbnail._preview !== preview) {
          thumbnail.innerHTML = preview;
          thumbnail._preview = preview;
        }
      }
      const moreButton = feed.querySelector('[data-action="more"]');
      moreButton.hidden = !more;
      moreButton.disabled = !ready;
      moreButton.textContent = localize("camera_events.load_more", this._hass, {}, "Load more");
      const detailHost = this.shadowRoot.querySelector(".event-detail");
      detailHost.hidden = !this._selected;
      if (this._detailHtml !== detail) detailHost.innerHTML = detail;
      this._detailHtml = detail;
      if (changed || wasHidden !== feed.hidden || (!this._observer && !feed.hidden)) this._observeFeed();
    }
    const player = this.shadowRoot.querySelector?.("ha-hls-player");
    if (player) { player.hass = this._hass; player.autoPlay = false; player.controls = true; player.playsInline = true; }
    this._renderedEvents = this._events;
    this._filterKey = JSON.stringify(filters);
    this._reason = reason;
    this._detailHtml = detail;
  }

  _renderEvent(event, index) {
    return `<article class="event-row" data-index="${index}">
      <h3 class="meta">${this._eventHeading(event)}</h3>
      <button type="button" class="event" data-action="event" data-index="${index}" aria-label="${escapeHtml(this._openLabel(event))}"${this._unavailableState() ? ' disabled aria-disabled="true"' : ""}>
        <span class="thumbnail">${this._preview(event)}</span>
      </button></article>`;
  }

  _eventHeading(event) {
    const date = this._eventDate(event);
    return `${date ? `<time>${escapeHtml(date)}</time>` : ""}<span>${escapeHtml(this._eventLabel(event))}</span>`;
  }

  _openLabel(event) {
    const date = this._eventDate(event);
    return localize("camera_events.open_event", this._hass,
      { event: this._eventLabel(event), date: date ? `, ${date}` : "" }, "Open {event}{date}");
  }

  _renderDetail(detail) {
    const label = escapeHtml(this._eventLabel(detail.event));
    const date = escapeHtml(this._eventDate(detail.event));
    const media = detail.kind === "hls"
      ? `<ha-hls-player url="${escapeHtml(detail.url)}" aria-label="${label}" controls playsinline></ha-hls-player>`
      : detail.kind === "clip"
      ? `<video src="${escapeHtml(detail.url)}" aria-label="${label}" controls playsinline preload="metadata"></video>`
      : `<img class="detail-image" src="${escapeHtml(detail.url)}" alt="${label}">`;
    const feedback = detail.status === "loading" ? localize("camera_events.loading_event", this._hass, {}, "Loading event…") : localize("common.error", this._hass, {}, "Error");
    return `<section class="detail"><div class="detail-media">${detail.status === "loading" || detail.status === "error" ? `<p class="message" role="${detail.status === "error" ? "alert" : "status"}">${escapeHtml(feedback)}${detail.status === "error" ? `<button type="button" data-action="details" aria-label="${escapeHtml(detail.error)}"><ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon></button>` : ""}</p>` : media}</div><div class="detail-meta"><strong>${label}</strong><small>${date}</small></div></section>`;
  }

  _handleMediaError(event) {
    const media = event.target;
    if (!media?.isConnected || media.getRootNode() !== this.shadowRoot || !["img", "video"].includes(media.localName)) return;
    const url = media.getAttribute("src");
    if (!url) return;
    if (this._selected?.url === url) {
      this._selected = { ...this._selected, status: "error", error: localize("common.media_unavailable", this._hass, {}, "Media unavailable") };
    } else if (this._events.some(item => item.thumbnailUrl === url)) this._thumbnailErrors.add(url);
    else return;
    this._render();
  }

  static styles = `${pressStyles}
    :host { display: block; color: var(--primary-text-color); font-family: var(--primary-font-family, Montserrat, Roboto, system-ui, sans-serif); }
    :host([data-marao-control-cell]) { display:grid; min-width:0; }
    :host([data-marao-control-cell]) ha-card { height:100%; box-sizing:border-box; }
    ha-card { overflow: visible; background: var(--ha-card-background, var(--card-background-color)); }
    header { position: sticky; top: var(--marao-popup-header-height, 0px); z-index: 1; display: grid; gap: 8px; padding: 8px 12px 12px; background: var(--marao-card-background, var(--ha-card-background, var(--card-background-color))); }
    .heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .heading h2 { min-width: 0; }
    [hidden] { display: none !important; }
    .filters { display: flex; min-width: 0; gap: 8px; overflow-x: auto; }
    .filter, .more { min-width: 48px; min-height: 48px; padding: 10px 16px; border: 0; border-radius: 24px; background: var(--secondary-background-color); cursor: pointer; font-size: var(--font-size-secondary, 1rem); }
    .filter { flex: 0 0 auto; }
    .filter[aria-pressed="true"] { color: var(--text-primary-color, #fff); background: var(--primary-color); font-weight: var(--font-weight-primary, 700); }
    .more { display: block; margin: 16px auto 0; }
    h2 { margin: 0; overflow-wrap: anywhere; font-size: var(--font-size-primary, 1.125rem); font-weight: var(--font-weight-primary, 700); }
    main { position:relative;box-sizing:border-box;height:clamp(240px,60vh,600px);overflow-y:auto;padding:0 12px 12px; }
    main>.state, main>.problem:not(:empty) { position:absolute;inset:0;display:grid;place-items:center; }
    .message button { display:block;min-width:48px;min-height:48px;margin:8px auto 0;border:0;border-radius:12px;background:var(--secondary-background-color); }
    button { font: inherit; color: inherit; }
    .icon-button { justify-self: end; width: 48px; min-width: 48px; height: 48px; border: 0; border-radius: 50%; background: transparent; cursor: pointer; font-size: max(1.5rem, var(--font-size-primary, 1.125rem)); transition: transform .12s ease, background-color .12s ease; }
    .grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
    .event { display: block; width: 100%; min-width: 0; min-height: 48px; padding: 0; overflow: hidden; text-align: left; border: 0; border-radius: var(--ha-card-border-radius, 12px); background: var(--secondary-background-color); cursor: pointer; transition: transform .12s ease; }
    button:focus { outline: none; }
    button:disabled { cursor: default; opacity: .55; transform: none; }
    .thumbnail { display: grid; place-items: center; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: var(--divider-color); }
    .thumbnail img { width: 100%; height: 100%; object-fit: cover; }
    .preview-status { padding: 16px; text-align: center; font-size: var(--font-size-caption, .875rem); color: var(--secondary-text-color); overflow-wrap: anywhere; }
    .event-row { min-width: 0; }
    .meta { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 12px; margin: 0 0 8px; font-size: var(--font-size-caption, .875rem); font-weight: var(--font-weight-secondary, 500); }
    .meta time { color: var(--secondary-text-color); }
    .meta > * { overflow-wrap: anywhere; }
    .detail-meta { display: flex; flex-direction: column; gap: 3px; padding: 9px 0 10px; font-size: var(--font-size-secondary, 1rem); font-weight: var(--font-weight-secondary, 500); }
    .detail-meta strong, .detail-meta small { overflow-wrap: anywhere; }
    small { color: var(--secondary-text-color); font-size: var(--font-size-caption, .875rem); }
    .message { margin: 0; padding: 32px 12px; text-align: center; color: var(--secondary-text-color); font-size: var(--font-size-secondary, 1rem); }
    .error { color: var(--error-color); }
    .detail-media { position:relative;aspect-ratio:16/9;background:var(--secondary-background-color);border-radius:var(--ha-card-border-radius,12px);overflow:hidden; }
    .detail-media>.message { position:absolute;inset:0;display:grid;place-content:center; }
    .detail video, .detail ha-hls-player, .detail-image { height:100%;position:absolute;inset:0; display: block; width: 100%; max-height: 65vh; object-fit: contain; border-radius: var(--ha-card-border-radius, 12px); background: #000; }
    .detail ha-hls-player { aspect-ratio:16/9; --video-max-height:65vh; }
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


}

registerMaraoCameraEventCards();
