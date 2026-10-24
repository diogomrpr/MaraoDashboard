const { canonicalCard } = await import(new URL(`./MaraoNames.js${new URL(import.meta.url).search}`, import.meta.url));
const { CameraPlayback } = await import(new URL(`./MaraoCamera.js${new URL(import.meta.url).search}`, import.meta.url));
const owners = new WeakMap();

export function preloadCameras(config) {
  const cameras = new Map();
  const visit = card => {
    card = canonicalCard(card);
    if (!card || typeof card !== 'object' || ['custom:marao-popup-card', 'custom:marao-native-popup-card'].includes(card.type) || card.template === 'md_popup_card') return;
    if ((card.template === 'md_camera_card' || card.type === 'custom:marao-native-camera-card') && card.variables?.preload_stream === true && /^camera\.[a-z0-9_]+$/.test(card.entity)) cameras.set(card.entity, card);
    for (const child of [...(card.cards || []), ...(card.sections || []), ...(card.card ? [card.card] : [])]) visit(child);
  };
  for (const view of config?.views || []) visit(view);
  return cameras;
}

function ancestors(node) {
  const result = [];
  for (; node; node = node.parentNode || node.host) if (node.nodeType === 1) result.push(node);
  return result;
}
function visible(card) {
  return card.isConnected && !card.preview && ancestors(card).every(node => !node.hidden && !node.inert && node.getAttribute('aria-hidden') !== 'true'
    && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden');
}

export class CameraPreload {
  constructor(root, dashboard, callbacks) {
    this.root = root; this.dashboard = dashboard; this.callbacks = callbacks; this.sessions = new Map();
    this.lifecycle = () => this.sync();
    document.addEventListener('visibilitychange', this.lifecycle);
    for (const type of ['location-changed', 'popstate']) window.addEventListener(type, this.lifecycle);
  }
  active() {
    return !this.disposed && this.root.isConnected && location.pathname.split('/')[1] === this.dashboard && !document.hidden && !this.root.lovelace?.editMode;
  }
  sync(hass = this.root.hass, callbacks = this.callbacks) {
    if (this.disposed) return;
    if (!this.root.isConnected || location.pathname.split('/')[1] !== this.dashboard) { this.dispose(); return; }
    this.hass = hass; this.callbacks = callbacks;
    const config = this.root.lovelace?.config || this.root.lovelace?.rawConfig;
    if (config !== this.config) { this.config = config; this.configured = preloadCameras(config); }
    for (const [entity, entry] of this.sessions) if (!this.configured.has(entity)) {
      entry.background = false;
      if (!entry.lease) this.remove(entity, entry);
    }
    if (this.active()) for (const entity of this.configured.keys()) if (!this.sessions.has(entity)) this.create(entity);
    for (const [entity, entry] of this.sessions) {
      entry.background = this.configured.has(entity);
      entry.playback.update(hass, entity, entry.lease?.label || hass?.states?.[entity]?.attributes?.friendly_name || entity);
    }
    this.position();
  }
  create(entity) {
    const host = document.createElement('div'); host.setAttribute('data-marao-camera-preload', entity);
    host.attachShadow({mode: 'open'}); const slot = document.createElement('div'); host.shadowRoot.append(slot);
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:180px;opacity:0;pointer-events:none;z-index:2;overflow:hidden';
    host.setAttribute('aria-hidden', 'true'); this.root.shadowRoot.append(host);
    const entry = {host, background: true};
    entry.playback = new CameraPlayback(host, slot, {
      localize: key => this.callbacks.localize(key, this.hass), haptic: value => this.callbacks.haptic(value),
      problem: reason => { entry.problem = reason; entry.lease?.problem(reason); },
      eligible: () => this.active() && (entry.background || Boolean(entry.lease && visible(entry.lease.card))),
    });
    this.sessions.set(entity, entry); return entry;
  }
  claim(card, slot, callbacks) {
    const entity = card._config.entity;
    if (!this.configured?.has(entity)) return null;
    const entry = this.sessions.get(entity) || this.create(entity);
    if (entry.lease) return null;
    const lease = {card, slot, label: '', problem: callbacks.problem}; entry.lease = lease;
    const binding = {
      slot,
      get player() { return entry.playback.player; },
      get video() { return entry.playback.video; },
      get stage() { return entry.playback.stage; },
      get state() { return entry.playback.state; },
      get streamEntity() { return entry.playback.streamEntity; },
      update: (hass, current, label) => {
        lease.label = label;
        if (this.disposed || !this.sessions.has(entity)) return;
        this.hass = hass; entry.playback.update(hass, current, label); this.position();
      },
      fullscreen: () => entry.playback.fullscreen(),
      dispose: () => {
        if (entry.lease !== lease) return;
        entry.lease = null; this.park(entry);
        if (!entry.background) this.remove(entity, entry);
        if (![...this.sessions.values()].some(item => item.lease)) { cancelAnimationFrame(this.frame); this.frame = null; }
      },
    };
    slot.style.cssText = 'position:relative;aspect-ratio:16/9;min-width:0;pointer-events:none'; slot.innerHTML = '';
    callbacks.problem(entry.problem || ''); this.position(); return binding;
  }
  park(entry) {
    if (entry.parked) return;
    entry.parked = true; entry.geometry = null;
    entry.host.style.opacity = '0'; entry.host.style.left = '-10000px'; entry.host.setAttribute('aria-hidden', 'true'); entry.host.inert = true;
  }
  position() {
    if (this.disposed) return;
    for (const entry of this.sessions.values()) {
      const lease = entry.lease;
      if (!lease || !this.active() || !visible(lease.card)) { this.park(entry); continue; }
      const rect = lease.slot.getBoundingClientRect();
      let top = Math.max(0, rect.top), left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right), bottom = Math.min(innerHeight, rect.bottom);
      for (const node of ancestors(lease.slot)) {
        const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
      }
      if (rect.width <= 0 || rect.height <= 0 || right <= left || bottom <= top) { this.park(entry); continue; }
      const css = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;opacity:1;pointer-events:none;z-index:2;overflow:hidden;clip-path:inset(${top-rect.top}px ${rect.right-right}px ${rect.bottom-bottom}px ${left-rect.left}px);border-radius:${getComputedStyle(lease.slot.parentElement).borderRadius}`;
      if (entry.geometry !== css) { entry.host.style.cssText = css; entry.geometry = css; }
      entry.parked = false;
      entry.host.removeAttribute('aria-hidden'); entry.host.inert = false;
      lease.slot.dataset.cameraState = entry.playback.state;
    }
    if (this.active() && !this.frame && [...this.sessions.values()].some(entry => entry.lease)) this.frame = requestAnimationFrame(() => { this.frame = null; this.position(); });
  }
  remove(entity, entry) { entry.playback.dispose(); entry.host.remove(); this.sessions.delete(entity); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; cancelAnimationFrame(this.frame);
    for (const [entity, entry] of this.sessions) this.remove(entity, entry);
    document.removeEventListener('visibilitychange', this.lifecycle);
    for (const type of ['location-changed', 'popstate']) window.removeEventListener(type, this.lifecycle);
    owners.delete(this.root);
  }
}

export function syncCameraPreload(record, callbacks) {
  let owner = owners.get(record.root);
  const config = record.root.lovelace?.config || record.root.lovelace?.rawConfig;
  if (!owner && !preloadCameras(config).size) return;
  if (!owner) { owner = new CameraPreload(record.root, record.dashboard, callbacks); owners.set(record.root, owner); }
  record.cameraPreload = owner; owner.sync(record.surface?._hass || record.root.hass, callbacks); return owner;
}
export function claimCameraPreload(card, slot, callbacks) {
  const chain = ancestors(card);
  if (chain.some(node => ['marao-popup-card', 'marao-native-popup-card'].includes(node.localName))) return null;
  const root = chain.find(node => node.localName === 'hui-root'); if (!root) return null;
  const owner = syncCameraPreload({root, dashboard: location.pathname.split('/')[1]}, callbacks);
  return owner?.claim(card, slot, callbacks) || null;
}
