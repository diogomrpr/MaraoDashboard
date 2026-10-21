// Local browser contract double. No HA connection, credentials or real camera.
// Native HA transports and actual Safari/Protect interoperability remain separate.
export const poster = '/ha-test/custom_components/marao_test_camera/event.svg';
export const media = '/ha-test/custom_components/marao_test_camera/live.mp4';
export const fixtureModes = ['normal', 'delayed', 'missing-still', 'failed-still', 'late-still', 'unsupported', 'failed', 'silent-fallback', 'blocked'];
export function registerSyntheticCamera() {
  customElements.define('ha-camera-stream', class extends HTMLElement {
    constructor() { super(); this.attachShadow({mode:'open'}); this.hassUpdates = 0; }
    set hass(value) { this._hass = value; this.hassUpdates++; }
    get hass() { return this._hass; }
    connectedCallback() {
      this.connectedCount = (this.connectedCount || 0) + 1;
      this.contextValues = {}; this.contextDisposers = [];
      for (const context of ['hassConnection', 'connection', 'hassApi']) {
        const request = new Event('context-request', { bubbles:true, composed:true });
        Object.assign(request, { context, contextTarget:this, subscribe:true, callback:(value, dispose) => {
          this.contextValues[context] = value; this.contextDisposers.push(dispose);
        } });
        this.dispatchEvent(request);
      }
      this.timer = setTimeout(() => {
        if (!this.isConnected) return;
        const mode = this.stateObj.attributes.fixture_mode;
        if (mode === 'unsupported' || mode === 'failed' || mode === 'silent-fallback') {
          this.shadowRoot.innerHTML = (mode === 'failed' ? '<ha-alert>Controlled synthetic stream failure</ha-alert>' : '') + `<img src="${poster}">`;
          this.dispatchEvent(new Event('load')); return;
        }
        const transport = document.createElement('div'); transport.attachShadow({mode:'open'});
        const video = document.createElement('video');
        video.muted = this.muted; video.autoplay = true; video.playsInline = true; video.loop = true; video.controls = this.controls;
        video.style.cssText = 'width:100%;height:100%;object-fit:cover';
        if (mode === 'blocked') {
          video.autoplay = false;
          const play = video.play.bind(video); let blocked = true;
          video.play = () => { if (blocked) { blocked = false; return Promise.reject(new DOMException('Synthetic autoplay blocked', 'NotAllowedError')); } return play(); };
        }
        video.src = media; transport.shadowRoot.append(video); this.shadowRoot.append(transport);
        this.dispatchEvent(new Event('load'));
      }, this.stateObj.attributes.fixture_mode === 'delayed' ? 700 : 0);
    }
    replaceTransport(delay = 0) {
      const previous=this.shadowRoot.querySelector('div');
      const old=previous?.shadowRoot?.querySelector('video');
      if(!old)return;
      const transport=document.createElement('div');transport.attachShadow({mode:'open'});
      const video=document.createElement('video');video.muted=true;video.autoplay=true;video.playsInline=true;video.loop=true;
      if(delay)this.replacementTimer=setTimeout(()=>{if(this.isConnected)video.src=media;},delay);else video.src=media;
      video.style.cssText='width:100%;height:100%;object-fit:cover';transport.shadowRoot.append(video);
      old.pause();old.removeAttribute('src');old.load();previous.replaceWith(transport);
    }
    disconnectedCallback() {
      for (const dispose of this.contextDisposers || []) dispose(); this.contextDisposers = [];
      clearTimeout(this.timer); clearTimeout(this.replacementTimer); this.disconnectedCount = (this.disconnectedCount || 0) + 1;
      for (const transport of this.shadowRoot.querySelectorAll('*')) for (const video of transport.shadowRoot?.querySelectorAll('video') || []) { video.pause(); video.removeAttribute('src'); video.load(); }
      this.shadowRoot.replaceChildren();
    }
  });
}
