// HA selects native WebRTC where supported, with its native transport fallback.
// Rechecked 2026-10-18: frontend/src/components/{ha-camera-stream,ha-hls-player,
// ha-web-rtc-player}.ts on home-assistant/frontend (dev); older hass binding retained.
export const CAMERA_REGISTRATION_MS = 10000;
export const CAMERA_PLAYBACK_MS = 30000;
const CAMERA_STREAM_FEATURE = 2; // HA CameraEntityFeature.STREAM, also used by its native host.
let nativeRegistration;
const ownedPosterInputs = new WeakSet();

// A native offer owns its connection. Closing it ends signaling at the server;
// unsubscribing on HA's shared connection can leave late provider events behind.
export class CameraSignaling {
  constructor(shared, entity, failed) {
    this.shared = shared; this.entity = entity; this.failed = failed;
    this.sessions = new Set(); this.retired = new Set(); this.closed = false;
  }
  get connected() { return !this.closed && this.shared.connected; }
  get haVersion() { return this.shared.haVersion; }
  end(session) {
    if (session.closed) return;
    session.closed = true; this.sessions.delete(session);
    if (session.id) this.retired.add(session.id);
    session.connection?.close();
  }
  async subscribeMessage(callback, message) {
    if (message.type !== 'camera/webrtc/offer' || message.entity_id !== this.entity) throw new Error('compatibility');
    // Native offer creation can finish after the owning player was removed.
    // A retired offer must neither open a socket nor reject into native cleanup.
    if (this.closed) return () => {};
    const NativeConnection = this.shared.constructor, options = this.shared.options;
    if (typeof options?.createSocket !== 'function' || typeof NativeConnection?.prototype?.subscribeMessage !== 'function') throw new Error('compatibility');
    const session = { closed: false }; this.sessions.add(session);
    try {
      const settings = { ...options, setupRetry: 0, connectTimeout: CAMERA_REGISTRATION_MS };
      const socket = await options.createSocket(settings);
      if (session.closed) { socket.close(); return () => {}; }
      try { session.connection = new NativeConnection(socket, settings); }
      catch (error) { socket.close(); throw error; }
      session.connection.addEventListener('disconnected', () => {
        if (session.closed) return;
        this.end(session); this.failed();
      });
      await session.connection.subscribeMessage(event => {
        if (session.closed) return;
        if (event.type === 'session') session.id = event.session_id;
        callback(event);
      }, message, { resubscribe: false });
      return () => this.end(session);
    } catch (error) { this.end(session); throw error; }
  }
  candidate(message) {
    if (message.type !== 'camera/webrtc/candidate' || message.entity_id !== this.entity) return Promise.reject(new Error('compatibility'));
    const session = [...this.sessions].find(row => row.id === message.session_id);
    // Native cleanup invalidates queued local ICE work with the same session.
    if (this.closed || this.retired.has(message.session_id)) return Promise.resolve();
    if (!session) return Promise.reject(new Error('compatibility'));
    return session.connection.sendMessagePromise(message).catch(error => {
      const connectionLost = error?.code === 3 || error?.type === 'result' && error.success === false && error.error?.code === 3;
      if (session.closed && connectionLost) return; // Native ERR_CONNECTION_LOST after our explicit close.
      throw error;
    });
  }
  close() {
    this.closed = true;
    for (const session of this.sessions) this.end(session);
    this.retired.clear();
  }
}

function bounded(promise, ms, reason) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(reason)), ms); })]).finally(() => clearTimeout(timer));
}

export function loadNativeCamera(registry = globalThis.customElements, loader = globalThis.window?.loadCardHelpers) {
  if (registry?.get('ha-camera-stream')) return Promise.resolve();
  if (!nativeRegistration) nativeRegistration = bounded((async () => {
    if (!registry || !loader) throw new Error('registration');
    const helpers = await loader();
    if (typeof helpers.importMoreInfoControl === 'function') await helpers.importMoreInfoControl('camera');
    else if (typeof helpers.createCardElement === 'function') {
      // Registration only: never connect this bootstrap or give it hass.
      helpers.createCardElement({ type: 'picture-entity', entity: 'camera.marao_registration' });
    } else throw new Error('registration');
    await registry.whenDefined('ha-camera-stream');
  })(), CAMERA_REGISTRATION_MS, 'registration').catch(error => { nativeRegistration = null; throw error; });
  return nativeRegistration;
}

export function cameraAvailable(hass, entity) {
  const state = hass?.states?.[entity]?.state;
  return Boolean(state) && !['unknown', 'unavailable', 'off'].includes(state)
    && hass?.connected !== false && hass?.connection?.connected !== false;
}

export function cameraSupportsStream(state) {
  return Boolean(Number(state?.attributes?.supported_features) & CAMERA_STREAM_FEATURE);
}

function rootsWithin(host) {
  const roots = [host], seen = new Set();
  for (let i = 0; i < roots.length; i++) {
    for (const element of roots[i].querySelectorAll('*')) if (element.shadowRoot && !seen.has(element.shadowRoot)) {
      seen.add(element.shadowRoot); roots.push(element.shadowRoot);
    }
    if (roots[i].shadowRoot && !seen.has(roots[i].shadowRoot)) { seen.add(roots[i].shadowRoot); roots.push(roots[i].shadowRoot); }
  }
  return roots;
}

export function clearNativeCameraPoster(host, roots = rootsWithin(host)) {
  // HA's parent asynchronously writes its thumbnail into this public input.
  // Adapt only our transport instance, before its video render: Marao already
  // owns the visible still. Delegate through the native reactive accessor so
  // later parent writes cannot start a duplicate request before we can clear it.
  for (const root of roots) for (const transport of root.querySelectorAll('ha-hls-player,ha-web-rtc-player')) {
    if (ownedPosterInputs.has(transport)) continue;
    try {
      if (!Object.isExtensible(transport)) return false;
      let prototype = transport, property;
      while (prototype && !property) { property = Object.getOwnPropertyDescriptor(prototype, 'posterUrl'); prototype = Object.getPrototypeOf(prototype); }
      if (!property?.get || !property?.set || (Object.hasOwn(transport, 'posterUrl') && !property.configurable)) return false;
      const nativeSet = property.set;
      Object.defineProperty(transport, 'posterUrl', { configurable: true, enumerable: property.enumerable,
        get: property.get, set(value) { nativeSet.call(this, ''); } });
      nativeSet.call(transport, '');
      ownedPosterInputs.add(transport);
    } catch { return false; }
  }
  return true;
}

export function cameraVideo(host) {
  if (host.matches?.('video')) return host;
  for (const root of rootsWithin(host)) for (const video of root.querySelectorAll('video')) {
    let node = video, visible = true;
    while (node && node !== host) {
      if (node.nodeType === 1 && (node.hidden || getComputedStyle(node).display === 'none')) { visible = false; break; }
      node = node.parentNode || node.host;
    }
    if (visible) return video;
  }
  return null;
}

function decodedFrames(video) {
  const quality = video?.getVideoPlaybackQuality?.();
  return quality ? quality.totalVideoFrames - quality.droppedVideoFrames : undefined;
}

export class CameraPlayback {
  constructor(card, slot, { localize, haptic, problem }) {
    this.card = card; this.slot = slot; this.localize = localize; this.haptic = haptic; this.problem = problem;
    this.generation = 0; this.streamRequests = 0; this.visible = !globalThis.IntersectionObserver; this.state = 'idle';
    slot.className = 'camera-live';
    slot.innerHTML = `<style>
      .camera-live{position:relative;z-index:2;min-width:0;margin:0;pointer-events:none}
      .camera-stage{position:relative;box-sizing:border-box;width:100%;max-width:none;aspect-ratio:16/9;overflow:hidden;background:#000;color:#fff;border:0;padding:0;margin:0;outline:none}
      .camera-stage:modal{--video-max-height:100%;position:fixed;inset:0;width:100dvw;height:100dvh;max-width:100dvw;max-height:100dvh;aspect-ratio:auto;pointer-events:auto}
      .camera-fullscreen-close{display:none}.camera-stage:modal .camera-fullscreen-close{display:block;position:absolute;z-index:3;top:env(safe-area-inset-top,0px);right:env(safe-area-inset-right,0px);width:48px;height:48px;border:0;border-radius:50%;background:#222;color:#fff;font-size:24px;pointer-events:auto}
      .camera-stage>ha-camera-stream,.camera-poster{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;pointer-events:none}
      .camera-poster{z-index:1;background:#000}.camera-poster[hidden]{display:none}
      .camera-feedback{box-sizing:border-box;display:flex;align-items:center;flex-wrap:wrap;gap:8px;position:absolute;z-index:2;inset:auto 0 0;max-height:100%;overflow:auto;padding:8px;background:var(--ha-card-background,var(--card-background-color,#fff));color:var(--primary-text-color,#000);overflow-wrap:anywhere;font-size:var(--font-size-secondary,1rem);line-height:1.25;pointer-events:auto}
      .camera-feedback[hidden]{display:none}.camera-live[data-camera-state="buffering"] .camera-feedback{inset:auto auto 8px 8px;max-width:calc(100% - 16px);border-radius:8px}
      .camera-feedback span{flex:1 1 9em;min-width:0}.camera-feedback button{position:relative;z-index:3;box-sizing:border-box;min-width:48px;min-height:48px;max-width:100%;white-space:normal;overflow-wrap:anywhere;pointer-events:auto}
      </style><dialog open role="presentation" class="camera-stage"><img class="camera-poster" alt="" hidden><div class="camera-feedback" role="status"><span></span></div></dialog>`;
    this.stage = slot.querySelector('.camera-stage'); this.poster = slot.querySelector('.camera-poster'); this.feedback = slot.querySelector('.camera-feedback');
    this.stage.addEventListener('keydown', event => { if (this.stage.matches(':modal')) event.stopPropagation(); });
    // Retain a touch target if playback removes its recovery button mid-gesture.
    this.feedback.addEventListener('pointerdown', () => { this.feedbackPressed = true; this.feedback.style.minHeight = `${this.feedback.getBoundingClientRect().height}px`; }, true);
    this.releaseFeedback = () => { if (!this.feedbackPressed) return; clearTimeout(this.feedbackRelease); this.feedbackRelease = setTimeout(() => { this.feedbackPressed = false; this.describe(); }, 0); };
    for (const event of ['pointerup', 'pointercancel']) globalThis.window.addEventListener(event, this.releaseFeedback, true);
    this.feedback.addEventListener('click', event => { event.stopPropagation(); event.preventDefault(); this.feedbackPressed = false; this.describe(); });
    this.posterError = event => {
      if (event.currentTarget !== this.poster || !this.poster.hasAttribute('src') || this.state === 'live') return;
      this.posterFailed = true; this.poster.hidden = true;
      if (this.state === 'snapshot') { this.state = 'error'; this.reason = 'poster_failed'; this.problem(this.message('poster_failed')); }
      this.describe();
    };
    this.poster.addEventListener('error', this.posterError);
    this.lifecycle = () => this.update(this.hass, this.entity, this.label);
    globalThis.document.addEventListener('visibilitychange', this.lifecycle);
    for (const event of ['location-changed', 'popstate']) globalThis.window.addEventListener(event, this.lifecycle);
    if (globalThis.IntersectionObserver) {
      this.intersection = new IntersectionObserver(entries => { this.visible = entries.at(-1).isIntersecting; this.lifecycle(); });
      this.intersection.observe(card);
    }
    this.ancestry = new MutationObserver(this.lifecycle);
    for (let node = card; node; node = node.parentNode || node.host) if (node.nodeType === 1) this.ancestry.observe(node, { attributes: true, attributeFilter: ['hidden', 'style', 'class', 'inert', 'aria-hidden'] });
  }
  eligible() {
    if (!this.card.isConnected || this.card.preview || !this.visible || document.hidden || !cameraAvailable(this.hass, this.entity)) return false;
    for (let node = this.card; node; node = node.parentNode || node.host) if (node.nodeType === 1
      && (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true' || getComputedStyle(node).display === 'none' || getComputedStyle(node).visibility === 'hidden')) return false;
    return true;
  }
  update(hass, entity, label) {
    const replaced = this.entity !== entity;
    this.hass = hass; this.entity = entity; this.label = label;
    if (replaced) { this.stop(); this.resetStream(); this.state = 'idle'; this.problem(''); }
    const eligible = this.eligible();
    if (!eligible) {
      this.stop();
      if (!cameraAvailable(hass, entity) || this.card.preview) { this.poster.removeAttribute('src'); this.picture = ''; this.poster.hidden = true; this.state = 'idle'; this.problem(''); }
      this.describe(); return;
    }
    this.poster.alt = label || entity;
    const picture = hass.states[entity].attributes?.entity_picture || '';
    if (this.picture !== picture) {
      this.picture = picture; this.posterFailed = false;
      const next = document.createElement('img'); next.className = 'camera-poster'; next.alt = label || entity;
      next.addEventListener('error', this.posterError); if (picture) next.src = picture;
      this.poster.replaceWith(next); this.poster = next;
    }
    const supported = cameraSupportsStream(hass.states[entity]);
    const capabilityChanged = this.streamSupported !== undefined && this.streamSupported !== supported;
    this.streamSupported = supported;
    if (capabilityChanged) { this.stop(); this.state = 'idle'; this.problem(''); }
    this.poster.hidden = this.state === 'live' || this.state === 'buffering' || !picture || this.posterFailed;
    if (!this.attempt && !['error', 'snapshot', 'blocked'].includes(this.state)) this.resetStream();
    if (this.player) {
      this.updateNativeHass(); this.player.stateObj = hass.states[this.streamEntity];
      if (!cameraAvailable(hass, this.streamEntity)) { this.fail('failed'); return; }
      if (!clearNativeCameraPoster(this.player)) { this.fail('compatibility'); return; }
    }
    if (!this.attempt && !['error', 'snapshot', 'blocked'].includes(this.state)) this.start();
    this.describe();
  }
  resetStream() {
    this.streamEntity = this.entity;
  }
  async start() {
    // A still-only entity must not start HA's MJPEG fallback or a native session.
    if (!cameraSupportsStream(this.hass?.states?.[this.entity])) { this.fail('unsupported', true); return; }
    const generation = ++this.generation;
    if (!this.streamEntity) this.resetStream();
    this.lastProgressAt = performance.now();
    this.attempt = true; this.state = 'loading'; this.reason = ''; this.nativeError = ''; this.problem(''); this.describe();
    this.timer = setTimeout(() => {
      if (generation !== this.generation) return;
      this.fail(this.nativeError ? 'failed' : this.video ? 'timeout' : 'compatibility', false, this.nativeError);
    }, CAMERA_PLAYBACK_MS);
    this.monitor = setInterval(() => this.observeProgress(generation), 500);
    try {
      await loadNativeCamera();
      if (generation !== this.generation || !this.eligible()) return;
      const player = document.createElement('ha-camera-stream');
      this.signaling = new CameraSignaling(this.hass.connection, this.streamEntity, () => {
        if (generation === this.generation) this.fail('failed');
      });
      this.player = player; this.contexts = new Set(); this.updateNativeHass();
      this.contextRequest = event => {
        if (!['hassConnection', 'connection', 'hassApi'].includes(event.context) || !event.composedPath().includes(player)) return;
        event.stopPropagation();
        const notify = () => event.callback(event.context === 'connection' ? this.signaling : this.nativeHass, unsubscribe);
        const unsubscribe = () => this.contexts.delete(notify);
        if (event.subscribe) this.contexts.add(notify);
        notify();
      };
      this.stage.addEventListener('context-request', this.contextRequest);
      player.stateObj = this.hass.states[this.streamEntity];
      player.muted = true; player.controls = false; player.autoPlay = true; player.playsInline = true; player.aspectRatio = 16 / 9; player.fitMode = 'cover';
      player.setAttribute('muted', ''); player.setAttribute('autoplay', ''); player.setAttribute('playsinline', '');
      this.mediaObserver = new MutationObserver(() => this.bind(generation));
      this.stage.prepend(player); this.bind(generation);
    } catch (error) { if (generation === this.generation) this.fail(error.message === 'registration' ? 'registration' : 'failed'); }
  }
  updateNativeHass() {
    const signaling = this.signaling, hass = this.hass, generation = this.generation;
    this.nativeHass = { ...hass, connection: signaling,
      callWS: message => {
        if (message.type === 'camera/webrtc/candidate') return signaling.candidate(message);
        if (message.type !== 'camera/stream') return hass.callWS(message);
        // HA starts a playlist fetch before checking whether its host survived.
        // Abandon a retired continuation (no timer or retained global promise),
        // rather than waking the detached player with an obsolete stream URL.
        if (generation !== this.generation) return new Promise(() => {});
        // Duplicate cards share HA but retain independent request ownership.
        ++this.streamRequests;
        return hass.callWS(message).then(result => generation === this.generation ? result : new Promise(() => {}));
      } };
    this.player.hass = this.nativeHass;
    for (const notify of this.contexts || []) notify();
  }
  bind(generation) {
    if (generation !== this.generation || !this.player) return;
    const roots = rootsWithin(this.player);
    for (const root of roots) this.mediaObserver.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    if (!clearNativeCameraPoster(this.player, roots)) { this.fail('compatibility'); return; }
    const video = cameraVideo(this.player);
    if (video && video === this.video) return;
    if (this.video) {
      this.waiting();
      // A replaced native transport has no retained frame; it is a fresh startup.
      this.state = 'loading'; this.poster.hidden = !this.picture || this.posterFailed; this.describe();
    }
    this.unbind();
    if (!video) {
      const nativeError = roots.map(root => root.querySelector('ha-alert')?.textContent?.trim()).filter(Boolean).join(' · ');
      if (nativeError) { this.nativeError = nativeError; this.problem(nativeError); this.describe(); }
      // Snapshot-only entities never start a host; its image fallback means streaming failed.
      if (roots.some(root => root.querySelector('img'))) this.fail('failed', false, nativeError);
      return;
    }
    this.video = video; this.lastTime = video.currentTime; this.advanced = false; this.playRequested = false; this.lastFrames = decodedFrames(video);
    video.muted = true; video.defaultMuted = true; video.playsInline = true; video.controls = false;
    this.mediaHandlers = {
      timeupdate: () => this.progress(generation), playing: () => this.progress(generation),
      waiting: () => this.waiting(), stalled: () => this.waiting(), pause: () => this.waiting(),
      error: () => { this.nativeError = video.error?.message || this.message('failed'); this.problem(this.nativeError); this.waiting(); this.describe(); },
      canplay: () => this.autoplay(generation), loadeddata: () => this.autoplay(generation),
    };
    for (const [type, handler] of Object.entries(this.mediaHandlers)) video.addEventListener(type, handler);
    if (video.readyState >= 2) this.autoplay(generation);
  }
  autoplay(generation) {
    if (this.playRequested || generation !== this.generation || !this.video) return;
    this.playRequested = true;
    if (!this.video.paused) { this.progress(generation); return; }
    try { this.video.play()?.catch(error => this.playRejected(error, generation)); }
    catch (error) { this.playRejected(error, generation); }
  }
  playRejected(error, generation) {
    if (generation !== this.generation) return;
    if (error.name === 'NotAllowedError') { clearTimeout(this.timer); this.state = 'blocked'; this.reason = 'blocked'; this.problem(this.message('blocked')); this.describe(); }
    else if (error.name !== 'AbortError') this.fail('failed');
  }
  progress(generation) {
    const video = this.video;
    if (generation !== this.generation || !video || video.paused || video.readyState < 2) return;
    const frames = decodedFrames(video);
    if (video.currentTime > this.lastTime && (frames === undefined || frames > this.lastFrames)) {
      this.lastFrames = frames;
      this.advanced = true; this.state = 'live'; this.lastProgressAt = performance.now(); this.reason = ''; this.nativeError = ''; clearTimeout(this.timer); this.poster.hidden = true; this.problem(''); this.describe();
    }
    this.lastTime = video.currentTime;
  }
  observeProgress(generation) {
    if (generation !== this.generation || !this.attempt || this.state === 'blocked') return;
    const now = performance.now();
    this.progress(generation);
    if (now - this.lastProgressAt > 1000) this.waiting();
  }
  waiting() {
    if (this.state !== 'live') return;
    this.state = 'buffering'; this.reason = ''; this.poster.hidden = true; this.describe();
    clearTimeout(this.timer);
    const generation = this.generation;
    this.timer = setTimeout(() => { if (generation === this.generation) this.fail('timeout', false, this.nativeError); }, CAMERA_PLAYBACK_MS);
  }
  fail(reason, snapshot = false, nativeError = "") {
    this.stop();
    if (snapshot && this.posterFailed) { snapshot = false; reason = 'poster_failed'; }
    this.nativeError = nativeError; this.reason = reason; this.state = snapshot ? 'snapshot' : 'error';
    this.poster.hidden = !this.picture || this.posterFailed;
    this.problem([this.message(reason), nativeError].filter(Boolean).join(' · ')); this.describe();
  }
  message(key) { return this.localize(`camera.${key}`); }
  describe() {
    this.slot.dataset.cameraState = this.state;
    const snapshot = this.picture && !this.posterFailed && !this.poster.hidden;
    const status = this.state === 'buffering' ? [this.message('buffering'), this.nativeError].filter(Boolean).join(' · ') : this.state === 'live' ? '' : this.state === 'loading' ? [this.message('loading'), this.nativeError].filter(Boolean).join(' · ')
      : ['error', 'snapshot', 'blocked'].includes(this.state) ? [this.message(this.reason), this.nativeError].filter(Boolean).join(' · ') : '';
    const unavailable = !this.hass?.states ? this.localize('common.loading') : !cameraAvailable(this.hass, this.entity) ? this.localize(this.hass?.connected === false || this.hass?.connection?.connected === false ? 'common.disconnected' : this.hass.states[this.entity]?.state === 'unknown' ? 'common.unknown' : 'common.unavailable') : '';
    this.feedback.querySelector('span').textContent = [unavailable, this.fullscreenError, snapshot ? this.message('snapshot') : '', status, this.posterFailed && this.state === 'loading' ? this.message('poster_failed') : ''].filter(Boolean).join(' · ');
    const action = this.state === 'blocked' ? 'start' : this.state === 'error' ? 'retry' : '';
    let button = this.feedback.querySelector('button');
    if (!action) { button?.remove(); this.updateFeedback(); return; }
    if (!button) { button = document.createElement('button'); button.type = 'button'; this.feedback.append(button); button.addEventListener('click', event => {
      event.stopPropagation(); event.preventDefault();
      if (!this.eligible()) return;
      this.haptic('heavy');
      if (this.state === 'blocked' && this.video) {
        const generation = this.generation;
        // Keep play() synchronous with the user's gesture (Safari activation).
        this.state = 'loading'; this.reason = ''; this.lastProgressAt = performance.now(); this.problem(''); this.describe();
        this.timer = setTimeout(() => { if (generation === this.generation) this.fail('timeout', false, this.nativeError); }, CAMERA_PLAYBACK_MS);
        try { this.video.play()?.catch(error => this.playRejected(error, generation)); } catch (error) { this.playRejected(error, generation); }
      } else if (this.state === 'error') { this.stop(); this.resetStream(); this.picture = ''; this.posterFailed = false; this.state = 'idle'; this.update(this.hass, this.entity, this.label); }
    }); }
    button.textContent = action === 'start' ? this.message('start') : this.localize('common.retry');
    button.setAttribute('aria-label', `${button.textContent} ${this.label || this.entity}`);
    this.updateFeedback();
  }
  updateFeedback() {
    const empty = !this.feedback.querySelector('span').textContent && !this.feedback.querySelector('button');
    this.feedback.hidden = empty && !this.feedbackPressed;
    this.feedback.style.opacity = empty ? '0' : '';
    if (!this.feedbackPressed) this.feedback.style.minHeight = '';
  }
  async fullscreen() {
    const video = this.video;
    if (!video || !video.videoWidth || !this.eligible()) { this.fullscreenError = this.message('fullscreen_wait'); this.describe(); return; }
    this.fullscreenCleanup?.();
    const controls = video.controls, fit = video.style?.objectFit, pointerEvents = video.style?.pointerEvents;
    const player = this.player, presentation = player && { controls: player.controls, aspectRatio: player.aspectRatio, fitMode: player.fitMode };
    let closeButton;
    let finished = false;
    const restore = () => {
      if (finished) return;
      finished = true;
      video.controls = controls;
      if (player) Object.assign(player, presentation);
      if (video.style) { video.style.objectFit = fit; video.style.pointerEvents = pointerEvents; }
      document.removeEventListener('fullscreenchange', changed);
      video.removeEventListener('webkitendfullscreen', restore);
      this.stage.removeEventListener('close', restore);
      closeButton?.remove();
      if (!this.stage.open) this.stage.open = true;
      this.stage.setAttribute('role', 'presentation');
      this.stage.removeAttribute('aria-label');
      if (this.fullscreenCleanup === cleanup) this.fullscreenCleanup = null;
    };
    const ownsFullscreen = () => video.getRootNode().fullscreenElement === video;
    const changed = () => { if (!ownsFullscreen() && !this.stage.matches(':modal')) restore(); };
    const cleanup = this.fullscreenCleanup = () => {
      if (ownsFullscreen()) document.exitFullscreen().catch(() => {});
      else if (video.webkitDisplayingFullscreen) video.webkitExitFullscreen();
      else if (this.stage.matches(':modal')) this.stage.close();
      restore();
    };
    document.addEventListener('fullscreenchange', changed);
    video.addEventListener('webkitendfullscreen', restore);
    video.controls = true;
    if (player) Object.assign(player, { controls: true, aspectRatio: undefined, fitMode: 'contain' });
    if (video.style) { video.style.objectFit = 'contain'; video.style.pointerEvents = 'auto'; }
    try {
      try {
        if (video.requestFullscreen && document.fullscreenEnabled !== false) await video.requestFullscreen();
        else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
        else throw new Error('unsupported');
      } catch {
        if (finished) return;
        // A modal promotes the existing stage without detaching its native player.
        this.stage.open = false;
        this.stage.removeAttribute('role');
        this.stage.setAttribute('aria-label', this.label || this.message('fullscreen'));
        closeButton = document.createElement('button'); closeButton.type = 'button';
        closeButton.className = 'camera-fullscreen-close'; closeButton.textContent = '×';
        closeButton.setAttribute('aria-label', this.message('fullscreen_exit')); closeButton.autofocus = true;
        closeButton.addEventListener('click', event => { event.stopPropagation(); this.haptic('heavy'); cleanup(); });
        this.stage.append(closeButton);
        this.stage.showModal();
        this.stage.addEventListener('close', restore);
      }
      if (finished) return;
      this.fullscreenError = ''; this.describe();
    } catch {
      if (finished) return;
      restore(); this.fullscreenError = this.message('fullscreen_failed'); this.describe();
    }
  }

  unbind() {
    if (this.video) for (const [type, handler] of Object.entries(this.mediaHandlers || {})) this.video.removeEventListener(type, handler);
    this.video = null; this.mediaHandlers = null;
  }
  stop() {
    this.fullscreenCleanup?.(); this.fullscreenError = '';
    clearTimeout(this.feedbackRelease); this.feedbackPressed = false;
    if (this.attempt || this.player) ++this.generation;
    clearTimeout(this.timer); clearInterval(this.monitor); this.monitor = null; this.mediaObserver?.disconnect(); this.mediaObserver = null; this.unbind();
    this.signaling?.close(); this.signaling = null;
    this.stage?.removeEventListener('context-request', this.contextRequest); this.contextRequest = null; this.contexts?.clear();
    this.player?.remove(); this.player = null; this.attempt = false;
    if (['loading', 'live', 'buffering', 'blocked'].includes(this.state)) this.state = 'idle';
  }
  dispose() {
    for (const event of ['pointerup', 'pointercancel']) globalThis.window.removeEventListener(event, this.releaseFeedback, true);
    clearTimeout(this.feedbackRelease); this.stop(); this.intersection?.disconnect(); this.ancestry.disconnect();
    document.removeEventListener('visibilitychange', this.lifecycle);
    for (const event of ['location-changed', 'popstate']) window.removeEventListener(event, this.lifecycle);
    this.slot.remove();
  }
}
