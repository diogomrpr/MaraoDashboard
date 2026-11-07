const {cameraEventsStub,refreshCardMetadata}=await import(new URL(`./MaraoNativeCardMetadata.js${new URL(import.meta.url).search}`,import.meta.url));
const {normalizeEventSources,eventTimestamp,mergeSourceEvents,filterEventRows,customEventRange,eventWord}=await import(new URL(`./MaraoEventModel.js${new URL(import.meta.url).search}`,import.meta.url));
const {bindDropdown,dropdownStyles}=await import(new URL(`./MaraoDropdown.js${new URL(import.meta.url).search}`,import.meta.url));
const {periodRange}=await import(new URL(`./MaraoHistoryData.js${new URL(import.meta.url).search}`,import.meta.url));
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
        ...(typeof item.timestamp==='number' && Number.isFinite(item.timestamp) && item.timestamp>0?{timestamp:item.timestamp}:{}),
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
    this._sources=normalizeEventSources(config || {});
    this._sourceResults=[];this._cameraFilter='';this._timeFilter='all';this._timeRange=null;this._filter='';
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
    refreshCardMetadata(hass);
    const previousAvailability=this._availabilityState;this._hass=hass;this._availabilityState=this._unavailableState();
    if(!this._connectionAvailable()){this._request++;this._detailRequest++;this._selected=undefined;this._events=[];for(const source of this._sourceResults||[]){source.events=[];source.invalid=true;}this._loadedKey=previousAvailability===this._availabilityState?this._loadedKey:'';}
    else if(this._sources?.length>1){
      const signature=this._sources.map(source=>this._sourceAvailability(source));
      for(const result of this._sourceResults||[])if(this._sourceAvailability(result.config)){result.events=[];result.status='unavailable';result.invalid=true;if(this._selected?.event?._source===result){this._detailRequest++;this._selected={event:this._selected.event,status:'error',error:eventWord('unavailable',hass)};}}
      if((this._sourceResults||[]).some(r=>r.invalid))this._events=mergeSourceEvents(this._sourceResults||[]);
    }else if(previousAvailability!==this._availabilityState){this._events=[];this._request++;this._detailRequest++;this._selected=undefined;this._loadedKey='';}
    this._render();this._maybeLoad();
  }

  static getStubConfig(hass,entities,entitiesFallback){refreshCardMetadata(hass);return cameraEventsStub(hass,entities,entitiesFallback);}
  static async getConfigElement(){await import(new URL(`./MaraoNativeCardEditor.js${new URL(import.meta.url).search}`,import.meta.url));return document.createElement('marao-native-card-editor');}
  getGridOptions(){return {columns:12,rows:8,min_rows:4};}
  getCardSize() {return 8;}

  connectedCallback() {
    this._stopNativeEditing?.(); this._stopNativeEditing = bindNativeEditing(this, editing => { if (editing) { this._request++;this._loadedKey="";this._detailRequest += 1; this._selected = undefined; this._detailsPopup?._close(false); this._render(); } });
    this._connected = true;
    this._render();
    this._maybeLoad();
  }

  disconnectedCallback() {
    this._stopNativeEditing?.(); this._stopNativeEditing = null;
    this._dropdowns?.forEach(d=>d.destroy());this._dropdowns=[];
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

  _sourceAvailability(source){const state=this._hass?.states?.[source?.entity]?.state;return !state||state==='unknown'?'unknown':state==='unavailable'?'unavailable':'';}
  _unavailableState() {
    if(!this._connectionAvailable())return 'unavailable';
    const sources=this._sources || (this._config?.entity?[this._config]:[]);
    return sources.length && sources.every(source=>this._sourceAvailability(source))?this._sourceAvailability(sources[0]):'';
  }

  _maybeLoad() {
    this._sources ||= normalizeEventSources(this._config || {});
    if (!this._connected || !this._config || this.preview || nativeEditing(this) || this._unavailableState() || !this._sources?.length) return;
    if(this._sources.length>1){this._maybeLoadSources();return;}
    if(this._config.cameras!==undefined){this._maybeLoadSources();return;}
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

  async _metadataSlot(){
    if((this._metadataActive||0)>=2)await new Promise(resolve=>(this._metadataWaiters ||= []).push(resolve));
    else this._metadataActive=(this._metadataActive||0)+1;
    return ()=>{const next=this._metadataWaiters?.shift();if(next)next();else this._metadataActive--;};
  }
  _maybeLoadSources(){
    const key=JSON.stringify(this._sources.map(config=>[config,cameraEventProvider(config,this._hass),frigateIdentity(config,this._hass.states?.[config.entity]),this._sourceAvailability(config)]));
    if(this._loadedKey===key)return;
    this._loadedKey=key;const request=++this._request;this._detailRequest++;this._selected=undefined;this._resetFeed();
    const previous=this._sourceResults||[];
    this._sourceResults=this._sources.map(config=>{const provider=cameraEventProvider(config,this._hass),identity=frigateIdentity(config,this._hass.states?.[config.entity]);
      const old=previous.find(r=>JSON.stringify(r.config)===JSON.stringify(config)&&r.provider===provider&&!r.invalid&&r.status!=='unavailable');
      if(old)return old;
      return {config,provider,identity,name:config.name||this._hass.states?.[config.entity]?.attributes?.friendly_name||config.entity,events:[],status:this._sourceAvailability(config)?'unavailable':'loading'};});
    const jobs=this._sourceResults.filter(r=>r.status==='loading');let next=0;
    const update=()=>{if(request!==this._request)return;this._events=mergeSourceEvents(this._sourceResults);this._status=this._events.length||this._sourceResults.every(r=>r.status!=='loading')?'ready':'loading';this._render();};
    const worker=async()=>{while(next<jobs.length){const source=jobs[next++];
      if(request!==this._request||this.preview||nativeEditing(this))return;
      const context=Object.create(this);Object.assign(context,{_config:{...source.config,limit:this._config.limit},_identity:source.identity,_provider:source.provider});source.context=context;
      const release=await this._metadataSlot();
      if(request!==this._request||this.preview||nativeEditing(this)){release();return;}
      try{if(source.provider==='frigate'&&(!source.identity.instanceId||!source.identity.camera))throw new Error('Frigate identity unavailable');
        const events=source.provider==='frigate'?await context._loadFrigateEvents(source.identity):source.provider==='unifi_protect'?await context._loadProtectEvents():source.provider==='netatmo'?await context._loadNetatmoRecordings():await Promise.reject(new Error('Unsupported provider'));
        if(request!==this._request)return;source.events=events;source.status='ready';
      }catch(error){if(request!==this._request)return;source.status='error';source.error=String(error.message||error);}finally{release();}
      update();
    }};update();void Promise.all([worker(),worker()]);
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
      if (request !== this._request || this._unavailableState()) return;
      this._sourceResults=[{config:this._config,provider,identity,name:this._title(),events,status:'ready'}];
      this._events = mergeSourceEvents(this._sourceResults);
      this._status = "ready";
    } catch {
      if (request !== this._request || this._unavailableState()) return;
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
    return filterEventRows(this._events,{camera:this._cameraFilter,type:this._filter,range:this._timeRange},event=>this._eventTypes(event));
  }

  _queuePreview(index) {
    const event = this._events[index];
    if (!event || event.thumbnailUrl || event.thumbnailStatus) return;
    event.thumbnailStatus = "queued";
    this._previewQueue.push(event.eventKey || index);
    this._drainPreviews();
  }

  _drainPreviews() {
    while (this._connected && !this.preview && !nativeEditing(this) && !this._selected && !this._unavailableState() && this._previewActive < 2 && this._previewQueue.length) {
      const key=this._previewQueue.shift(),index=typeof key==='number'?key:this._events.findIndex(event=>event.eventKey===key);
      if(index<0)continue;
      this._previewActive += 1;
      this._loadPreview(index).finally(() => {
        this._previewActive -= 1;
        this._drainPreviews();
      });
    }
  }

  async _loadPreview(index) {
    const event = this._events[index];
    const source=event?._source,provider=source?.provider || this._provider,identity=source?.identity || this._identity;
    if (!event || this.preview || nativeEditing(this) || !this._connected || this._unavailableState() || event.thumbnailUrl || ["loading", "ready", "error"].includes(event.thumbnailStatus)) return;
    const request = this._request;
    event.thumbnailStatus = "loading";
    try {
      if (provider === "netatmo" && !event.hasThumbnail) {
        event.thumbnailStatus = "empty";
        this._render();
        return;
      }
      const url = provider === "netatmo"
        ? text((await this._browseMedia(event.mediaContentId))?.thumbnail)
        : provider === "unifi_protect"
        ? await this._resolveMedia(event.thumbnailContentId)
        : await this._signPath(frigateEventPath(identity.instanceId, event.id, "thumbnail"));
      if (!url) throw new Error("Missing preview");
      if (source?.invalid || request !== this._request || !this._connected || this._unavailableState()) return;
      event.thumbnailUrl = url;
      event.thumbnailStatus = "ready";
    } catch {
      if (source?.invalid || request !== this._request || !this._connected || this._unavailableState()) return;
      event.thumbnailStatus = "error";
      this._thumbnailErrors.add(event.eventKey || event.id);
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
      this._loadedKey = "";this._sourceResults=[];this._setTimeRange(this._timeFilter || 'all');
      this._maybeLoad();
    } else if (button.dataset.action === "back") {
      this._detailRequest += 1;
      this._selected = undefined;
      this._render();
      if (this._feedScroll) this._feedScroll.element.scrollTop = this._feedScroll.top;
      const restoredIndex=this._openedKey?this._events.findIndex(event=>event.eventKey===this._openedKey):this._openedIndex;
      this.shadowRoot.querySelector?.(`.event[data-index="${restoredIndex}"]`)?.focus({ preventScroll: true });
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
    if (this.preview || nativeEditing(this) || this._unavailableState()) return;
    const event = this._events[index];
    const source=event?._source,provider=source?.provider || this._provider,identity=source?.identity || this._identity;
    if (!event) return;
    const scroller = this._scrollRoot() || globalThis.document?.scrollingElement;
    this._feedScroll = scroller ? { element: scroller, top: scroller.scrollTop } : undefined;
    this._openedIndex = index;this._openedKey=event.eventKey;
    const detailRequest = ++this._detailRequest;
    this._selected = { event, status: "loading" };
    this._render();
    try {
      const kind = provider === "netatmo" ? "hls" : provider === "unifi_protect" || event.has_clip ? "clip" : "snapshot";
      const url = ["netatmo", "unifi_protect"].includes(provider)
        ? await this._resolveMedia(event.mediaContentId)
        : await this._signPath(frigateEventPath(identity.instanceId, event.id, kind));
      if (kind === "hls" && !globalThis.customElements?.get("ha-hls-player")) {
        const { loadNativeCamera } = await import(new URL(`./MaraoCamera.js${new URL(import.meta.url).search}`, import.meta.url));
        await loadNativeCamera();
        if (!globalThis.customElements?.get("ha-hls-player")) throw new Error("HLS player unavailable");
      }
      if (source?.invalid || detailRequest !== this._detailRequest) return;
      this._selected = { event, kind, status: "ready", url };
    } catch {
      if (source?.invalid || detailRequest !== this._detailRequest) return;
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
        timeZone:this._hass?.config?.time_zone || 'UTC',
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
    const status = !this._sources?.length && !this._config.entity ? eventWord('setup',this._hass) : !this._hass?.states ? localize("common.loading", this._hass, {}, "Loading…")
      : unavailable ? localize(`common.${unavailable}`, this._hass, {}, unavailable === "unknown" ? "Unknown" : "Unavailable")
      : this._status === "loading" ? localize("camera_events.loading_events", this._hass, {}, "Loading events…")
      : this._status === "error" ? this._error
      : !this._events.length ? localize("camera_events.no_recent_events", this._hass, {}, "No recent events.") : "";
    const action = this._selected ? "back" : "refresh";
    const actionLabel = this._selected ? localize("camera_events.back", this._hass, {}, "Back to events") : localize("camera_events.refresh", this._hass, {}, "Refresh events");
    const disabled = Boolean(unavailable || (!this._selected && this._status === "loading"));
    const types = [...new Set(this._events.flatMap(event => this._eventTypes(event)))];
    const filters = [{ type: "", label: localize("camera_events.all", this._hass, {}, "All") }, ...types.map(type => ({ type, label: this._typeLabel(type) }))];
    const rows = this._filteredEvents().slice(0, this._visibleCount);
    const more = rows.length < this._filteredEvents().length;
    const detail = this._selected ? this._renderDetail(this._selected) : "";
    let card = this.shadowRoot.querySelector?.("ha-card");
    if (!card) {
      this.shadowRoot.innerHTML = `<style>${MaraoFrigateEventsCard.styles}${dropdownStyles}.filters{display:flex;flex-wrap:wrap;gap:8px}.filters>div{flex:1 1 140px;min-width:0}.filters .marao-dropdown>button{display:flex;align-items:center;gap:8px}.filters .marao-dropdown>button ha-icon{flex:none;--mdc-icon-size:24px}.filters .marao-dropdown>button span{min-width:0;overflow-wrap:anywhere}.range-editor{display:grid;gap:8px;max-height:50dvh;overflow:auto;overscroll-behavior:contain}.range-editor input,.range-editor button{min-height:48px;min-width:48px;font:inherit;max-width:100%;box-sizing:border-box}.coverage{font-size:var(--font-size-caption,.9375rem);overflow-wrap:anywhere}.coverage,.range-editor{grid-column:1/-1}</style><ha-card data-status="${!this._hass?.states ? "loading" : unavailable || this._status}"${problem ? ` data-problem="${problem.kind}" style="${problemStyle(problem)}"` : ""}>
        <header><div class="heading"><h2>${escapeHtml(this._title())}</h2><button type="button" class="icon-button" data-action="${action}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}"${disabled ? ' disabled aria-disabled="true"' : ""}>${this._selected ? '&#x2190;' : '&#x21bb;'}</button></div>
          <div class="filters" role="group" aria-label="${escapeHtml(localize("camera_events.filters", this._hass, {}, "Event types"))}"${this._selected ? ' style="visibility:hidden"' : ""}></div></header>
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
      const current = [...grid.children].filter(row=>row.classList.contains('event-row')).map(row => row.dataset.index);
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
    this._renderFilters(ready && !this.preview && !nativeEditing(this));
    this._renderedEvents = this._events;
    this._filterKey = JSON.stringify(filters);
    this._reason = reason;
    this._detailHtml = detail;
  }

  _setTimeRange(value){
    if(value==='custom')return;
    const now=Date.now(),zone=this._hass?.config?.time_zone || 'UTC';
    this._timeFilter=value;
    this._timeRange=value==='all'?null:value==='hour'||value==='day'?{start:now-(value==='hour'?1:24)*3600000,end:now}:periodRange(now,value==='yesterday'?-1:0,'day',zone);
    if(this._timeRange)this._timeRange={start:+this._timeRange.start,end:+this._timeRange.end};
  }
  _renderFilters(ready){
    const host=this.shadowRoot?.querySelector?.('.filters');if(!host?.append)return;
    const w=key=>eventWord(key,this._hass),sources=this._sources || [],scope=this._events.filter(event=>!this._cameraFilter||event.sourceKey===this._cameraFilter);
    const types=[...new Set(scope.flatMap(event=>this._eventTypes(event)))],availableTypes=new Set(types);if(this._filter&&!types.includes(this._filter))types.push(this._filter);
    const definitions=[['camera',sources.length===1?[[sources[0].entity,sources[0].name || this._hass?.states?.[sources[0].entity]?.attributes?.friendly_name || sources[0].entity]]:[['',w('allCameras')],...sources.map(source=>[source.entity,source.name || this._hass?.states?.[source.entity]?.attributes?.friendly_name || source.entity])]],['type',[['',w('allTypes')],...types.map(type=>[type,this._typeLabel(type)+(availableTypes.has(type)?'':` (${w('unavailable')})`)])]],['time',['all','hour','day','today','yesterday','custom'].map(key=>[key,w(key)])]];
    const values={camera:this._cameraFilter || (sources.length===1?sources[0].entity:''),type:this._filter,time:this._timeFilter||'all'};
    this._dropdowns ||= [];
    definitions.forEach(([key,options],i)=>{
      let picker=host.querySelector(`[data-picker="${key}"]`);
      const signature=JSON.stringify([options,this._hass?.language]);
      if(!picker){picker=document.createElement('div');picker.className='marao-dropdown';picker.dataset.picker=key;host.append(picker);}
      if(picker._signature!==signature || !this._dropdowns[i]){
        this._dropdowns[i]?.destroy();const focused=picker.contains(this.shadowRoot.activeElement);
        picker.innerHTML=`<button type="button" aria-haspopup="menu" aria-expanded="false"></button><div class="marao-dropdown-options" role="menu" hidden></div>`;
        const trigger=picker.querySelector('button'),menu=picker.querySelector('[role=menu]');
        const choices=options.map(([value,label])=>{const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitemradio');button.textContent=label;menu.append(button);return {value,button};});
        this._dropdowns[i]=bindDropdown(picker,{trigger,menu,choices,value:()=>({camera:this._cameraFilter || (sources.length===1?sources[0].entity:''),type:this._filter,time:this._timeFilter||'all'})[key],activeElement:()=>this.shadowRoot.activeElement,haptic:()=>globalThis.window?.MaraoDashboard?.haptic?.('heavy'),onSelect:value=>{
          if(this.preview||nativeEditing(this)||this._unavailableState())return;
          if(key==='camera')this._cameraFilter=value;else if(key==='type')this._filter=value;else if(value==='custom'){this._showCustomRange();return;}else this._setTimeRange(value);
          this._visibleCount=EVENT_BATCH;const root=this._scrollRoot();if(root)root.scrollTop=0;this._render();
        }});picker._signature=signature;if(focused)trigger.focus({preventScroll:true});
      }
      const trigger=picker.querySelector('button'),selected=options.find(([value])=>value===values[key]);
      const summary=key==='time'&&this._timeFilter==='custom'&&this._timeRange?this._formatRange():selected?.[1] || '';
      trigger.innerHTML=`<ha-icon icon="mdi:${({camera:'camera',type:'filter-variant',time:'clock-outline'})[key]}" aria-hidden="true"></ha-icon><span>${escapeHtml(summary)}</span>`;trigger.setAttribute('aria-label',`${w(key)}: ${summary}`);trigger.disabled=!ready||key==='camera'&&sources.length<2;this._dropdowns[i]?.sync();
    });
    let coverage=this.shadowRoot.querySelector('.coverage');if(!coverage){coverage=document.createElement('p');coverage.className='coverage';host.after(coverage);}
    const messages=(this._sourceResults||[]).filter(source=>source.status!=='ready').map(source=>`${source.name}: ${w(source.status)}`);
    coverage.textContent=!sources.length?w('setup'):[...messages,this._events.some(event=>eventTimestamp(event)===null)?w('excluded'):'',this._events.length&&!this._filteredEvents().length?w('empty'):''].filter(Boolean).join(' ');
    coverage.hidden=Boolean(this._selected)||!coverage.textContent;

  }
  _formatRange(){const format=new Intl.DateTimeFormat(this._hass?.language,{dateStyle:'short',timeStyle:'short',timeZone:this._hass?.config?.time_zone || 'UTC'});return `${format.format(this._timeRange.start)} – ${format.format(this._timeRange.end)}`;}
  _showCustomRange(){
    if(this.shadowRoot.querySelector('.range-editor'))return;
    const form=document.createElement('section');form.className='range-editor';
    form.innerHTML=`<label>${escapeHtml(eventWord('start',this._hass))}<input type="datetime-local" data-start></label><label>${escapeHtml(eventWord('end',this._hass))}<input type="datetime-local" data-end></label><p role="alert"></p><button type="button" data-apply>${escapeHtml(eventWord('apply',this._hass))}</button><button type="button" data-cancel>${escapeHtml(eventWord('cancel',this._hass))}</button>`;
    form.querySelector('[data-cancel]').onclick=()=>form.remove();
    form.querySelector('[data-apply]').onclick=()=>{if(this.preview||nativeEditing(this)||this._unavailableState())return;try{this._timeRange=customEventRange(form.querySelector('[data-start]').value,form.querySelector('[data-end]').value,this._hass?.config?.time_zone || 'UTC');this._timeFilter='custom';this._visibleCount=EVENT_BATCH;form.remove();this._render();}catch{form.querySelector('[role=alert]').textContent=eventWord('invalid',this._hass);}};
    this.shadowRoot.querySelector('header').append(form);form.querySelector('input').focus();
  }

  _renderEvent(event, index) {
    const undated=eventTimestamp(event)===null && this._filteredEvents().find(row=>eventTimestamp(row.event)===null)?.index===index;
    const timestamp=eventTimestamp(event);
    const time=timestamp===null?'':new Intl.DateTimeFormat(this._hass?.locale?.language || this._hass?.language,{timeStyle:'short',timeZone:this._hass?.config?.time_zone || 'UTC'}).format(new Date(timestamp*1000));
    const icon=({person:'mdi:walk',car:'mdi:car',vehicle:'mdi:car',dog:'mdi:dog',cat:'mdi:cat',motion:'mdi:motion-sensor'})[this._eventTypes(event)[0]] || 'mdi:camera';
    return `${undated?`<h3 class="undated" style="grid-column:1/-1">${escapeHtml(eventWord('undated',this._hass))}</h3>`:''}<article class="event-row" data-index="${index}">
      <div class="event-rail"><span class="event-icon" aria-hidden="true"><ha-icon icon="${icon}"></ha-icon></span>${time?`<time class="event-time" datetime="${new Date(timestamp*1000).toISOString()}">${escapeHtml(time)}</time>`:''}</div>
      <h3 class="meta">${this._eventHeading(event)}</h3>
      <button type="button" class="event" data-action="event" data-index="${index}" aria-label="${escapeHtml(this._openLabel(event))}"${this._unavailableState() ? ' disabled aria-disabled="true"' : ""}>
        <span class="thumbnail">${this._preview(event)}</span>
      </button></article>`;
  }

  _eventHeading(event) {
    const date = this._eventDate(event);
    return `${this._sources?.length>1?`<span>${escapeHtml(event.sourceName)}</span>`:''}${eventTimestamp(event)===null?`<span>${escapeHtml(eventWord('undated',this._hass))}</span>`:''}${date ? `<time>${escapeHtml(date)}</time>` : ""}<span>${escapeHtml(this._eventLabel(event))}</span>`;
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
    :host { display: block;min-height:0;height:100%; color: var(--primary-text-color); font-family: var(--primary-font-family, Montserrat, Roboto, system-ui, sans-serif); }
    :host([data-marao-control-cell]) { display:grid; min-width:0; }
    :host([data-marao-control-cell]) ha-card { height:100%; box-sizing:border-box; }
    ha-card { display:flex;flex-direction:column;box-sizing:border-box;height:100%;overflow: visible; background: var(--ha-card-background, var(--card-background-color)); }
    header { flex:none;position: sticky; top: var(--marao-popup-header-height, 0px); z-index: 1; display: grid; gap: 8px; padding: 8px 12px 12px; background: var(--marao-card-background, var(--ha-card-background, var(--card-background-color))); }
    .heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .heading h2 { min-width: 0; }
    [hidden] { display: none !important; }
    .filters { display:flex;flex-wrap:wrap;min-width:0;gap:8px; }
    .more { min-width: 48px; min-height: 48px; padding: 10px 16px; border: 0; border-radius: 24px; background: var(--secondary-background-color); cursor: pointer; font-size: var(--font-size-secondary, 1rem); }
    .more { display: block; margin: 16px auto 0; }
    h2 { margin: 0; overflow-wrap: anywhere; font-size: var(--font-size-primary, 1.125rem); font-weight: var(--font-weight-primary, 700); }
    main { flex:1;min-height:160px;position:relative;box-sizing:border-box;height:clamp(240px,60vh,600px);overflow-y:auto;padding:0 12px 12px; }
    main>.state, main>.problem:not(:empty) { position:absolute;inset:0;display:grid;place-items:center; }
    .message button { display:block;min-width:48px;min-height:48px;margin:8px auto 0;border:0;border-radius:12px;background:var(--secondary-background-color); }
    button { font: inherit; color: inherit; }
    .icon-button { justify-self: end; width: 48px; min-width: 48px; height: 48px; border: 0; border-radius: 50%; background: transparent; cursor: pointer; font-size: max(1.5rem, var(--font-size-primary, 1.125rem)); transition: transform .12s ease, background-color .12s ease; }
    .grid {display:grid;grid-template-columns:minmax(0,1fr);gap:0}
    .event-row {position:relative;display:grid;grid-template-columns:minmax(48px,max-content) minmax(0,1fr);column-gap:12px;padding-bottom:20px}
    .event-row:last-child {padding-bottom:0}
    .event-rail {grid-column:1;grid-row:1/3;display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;min-width:0}
    .event-row:not(:last-child) .event-rail::after {content:'';flex:1;width:2px;min-height:12px;background:var(--divider-color,var(--secondary-text-color))}
    .event-icon {display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:var(--secondary-background-color);--mdc-icon-size:24px}
    .event-time {font-size:.8125rem;line-height:1.4;color:var(--secondary-text-color);white-space:nowrap;font-variant-numeric:tabular-nums}
    .event-row>.meta,.event-row>.event {grid-column:2}
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
