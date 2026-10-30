const query = new URL(import.meta.url).search;
const [{floorPlanErrors, imageBounds, floorPosition}, {floorText}, {lightColorAppearance}, actions, {navigate}, {bindPressFeedback,pressStyles}] = await Promise.all([
  import(new URL(`./MaraoFloorPlan.js${query}`,import.meta.url)),
  import(new URL(`./MaraoFloorPlanText.js${query}`,import.meta.url)),
  import(new URL(`./MaraoLightCapabilities.js${query}`,import.meta.url)),
  import(new URL(`./MaraoCards.js${query}`,import.meta.url)),
  import(new URL(`./MaraoNavigation.js${query}`,import.meta.url)),
  import(new URL(`./MaraoPressFeedback.js${query}`,import.meta.url))
]);
export function floorLightState(light, hass) {
  const state = hass?.states?.[light.entity_id];
  const ready = actions.serviceConnectionReady(hass) && ['on','off'].includes(state?.state);
  const color = ready ? lightColorAppearance(state)?.background : null;
  const brightness = state?.attributes?.brightness;
  return {ready, on:ready && state.state==='on', label:!ready?'Unavailable':state.state==='on'?'On':'Off', color,
    intensity:typeof brightness==='number' && Number.isFinite(brightness) && brightness>=0 && brightness<=255 ? .25+.75*brightness/255 : 1};
}
export class MaraoFloorPlanCard extends (globalThis.HTMLElement || class {}) {
  constructor() { super(); this.attachShadow({mode:'open'}); }
  setConfig(config) {
    const errors=floorPlanErrors(config); if(errors.length) throw new Error(errors.join('\n'));
    this._config=structuredClone(config); this._actionError=''; this._mount();
  }
  set hass(value) { this._hass=value; this._render(); }
  get preview() { return Boolean(this._preview || this.nativeOwner?.preview || actions.nativeEditing(this)); }
  set preview(value) { this._preview=Boolean(value); this._render(); }
  getCardSize() { return this._config?.full_page ? 12 : 6; }
  connectedCallback() {
    this._stopNativeEditing?.();this._stopNativeEditing=actions.bindNativeEditing(this,()=>this._render());
    this._press ||= bindPressFeedback(this.shadowRoot);
    this._actionLive=true;
    this._resize ||= new ResizeObserver(()=>this._layout());
    if(this._canvas) this._resize.observe(this._canvas);
    this._viewport=()=>this._layout(); window.addEventListener('resize',this._viewport);
    window.visualViewport?.addEventListener('resize',this._viewport); this._layout();
  }
  disconnectedCallback() { this._stopNativeEditing?.();this._stopNativeEditing=null;this._press?.destroy();this._press=null;this._actionLive=false; this._resize?.disconnect(); window.removeEventListener('resize',this._viewport); window.visualViewport?.removeEventListener('resize',this._viewport); }
  _t(label) { return floorText(this._hass,label); }
  _mount() {
    this._press?.destroy();this._press=null;
    this.shadowRoot.innerHTML=`<style>${pressStyles}
      :host{display:block;min-width:0;color:var(--primary-text-color);font-family:var(--primary-font-family,inherit)}
      *{box-sizing:border-box}[hidden]{display:none!important}
      ha-card{display:flex;flex-direction:column;min-width:0;padding:12px;border-radius:var(--ha-card-border-radius,24px);background:var(--ha-card-background,var(--card-background-color));overflow:hidden}
      :host([full-page]) ha-card{height:max(180px,calc(100dvh - var(--floor-top,16px) - var(--marao-floor-plan-clearance,100px) - 12px))}
      header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}h2{flex:1;margin:0;min-width:0;font-size:var(--font-size-primary,1.125rem);overflow-wrap:anywhere}
      button{font:inherit;color:inherit;min-width:48px;min-height:48px;border:0;border-radius:24px;background:var(--secondary-background-color);padding:8px;cursor:pointer}
      button:focus{outline:none}button:disabled{cursor:default;color:var(--disabled-text-color)}
      .canvas{position:relative;height:340px;min-height:100px;flex:1;overflow:hidden;margin-top:8px}
      img,svg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}svg{overflow:hidden}
      polyline{fill:none;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke;pointer-events:none}
      .marker{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;max-width:100px;transform:translate(-50%,-50%);border:2px dashed var(--divider-color);gap:2px;background:var(--ha-card-background,var(--card-background-color));box-shadow:0 2px 8px #0003;overflow-wrap:anywhere}
      .marker[aria-pressed=true]{background:var(--color-yellow,var(--primary-color));color:var(--primary-text-color);border-style:solid;border-width:3px}
      .marker:disabled{background:var(--secondary-background-color);border-style:dashed}ha-icon{width:24px;height:24px;flex-shrink:0}
      .marker span{font-size:var(--font-size-caption,.875rem);line-height:1.15}.feedback{overflow-wrap:anywhere;font-size:var(--font-size-secondary,1rem)}
    </style><ha-card><header><h2></h2><button type="button" data-lights></button></header><div class="feedback" role="status"></div><button type="button" data-retry hidden></button><div class="canvas"><img alt=""><svg aria-hidden="true"></svg><div data-markers></div></div></ha-card>`;
    this.toggleAttribute('full-page',this._config.full_page===true);
    this._canvas=this.shadowRoot.querySelector('.canvas');this._img=this.shadowRoot.querySelector('img');this._svg=this.shadowRoot.querySelector('svg');
    this._feedback=this.shadowRoot.querySelector('.feedback');this._retry=this.shadowRoot.querySelector('[data-retry]');
    this._buttons=[];this._paths=[];this._anchors=[];
    for(const [index,light] of this._config.lights.entries()) {
      const button=document.createElement('button');button.type='button';button.className='marker';button.dataset.index=String(index);
      const icon=document.createElement('ha-icon');icon.setAttribute('aria-hidden','true');const label=document.createElement('span');button.append(icon,label);
      button.addEventListener('click',event=>{event.stopPropagation();this._toggle(index);});this.shadowRoot.querySelector('[data-markers]').append(button);this._buttons.push(button);
      const anchor=document.createElementNS('http://www.w3.org/2000/svg','line');anchor.setAttribute('stroke','var(--secondary-text-color)');anchor.setAttribute('stroke-width','1');this._svg.append(anchor);this._anchors.push(anchor);
      if(light.strip) { const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('stroke-width',String(light.strip.width??6));this._svg.append(line);this._paths[index]=line; }
    }
    this.shadowRoot.querySelector('[data-lights]').onclick=()=>{if(!this.preview && this._config.lights_popup){actions.haptic('heavy');navigate(this._config.lights_popup);}};
    this._press=bindPressFeedback(this.shadowRoot);
    this._retry.onclick=()=>this._loadImage();this._loadImage();this._render();if(this.isConnected)this._resize?.observe(this._canvas);
  }
  _loadImage() {
    this._imageError=false;this._imageLoading=true;this._retry.hidden=true;this._render();
    const image=this._img, config=this._config;
    image.onload=()=>{if(image!==this._img || config!==this._config)return;this._imageLoading=false;this._layout();this._render();};
    image.onerror=()=>{if(image!==this._img || config!==this._config)return;this._imageLoading=false;this._imageError=true;this._render();};
    image.src=`/api/image/serve/${config.image_id}/original`;
  }
  _toggle(index) {
    const light=this._config.lights[index];
    if(this.preview || !this.isConnected || !floorLightState(light,this._hass).ready || this.closest?.('[inert]'))return;
    actions.haptic('heavy');return actions.callServiceWithNotification(this._hass,'light','toggle',{entity_id:light.entity_id},actions.serviceOutcome(this));
  }
  _render() {
    if(!this._config || !this._feedback)return;
    this.shadowRoot.querySelector('h2').textContent=this._config.name||this._t('Floor Plan');
    const list=this.shadowRoot.querySelector('[data-lights]');list.textContent=this._t('Lights');list.disabled=this.preview || !this._config.lights_popup;
    this._retry.hidden=!this._imageError;this._retry.textContent=this._t('Retry');
    this._feedback.textContent=this._imageError?this._t('Image could not load.'):this._actionError || (this._imageLoading?this._t('Loading image…'):this._overlap?this._t('Buttons overlap. Use Lights to reach every control.'):'');
    this._feedback.setAttribute('role',this._imageError||this._actionError?'alert':'status');
    for(const [i,light] of this._config.lights.entries()) {
      const state=floorLightState(light,this._hass),button=this._buttons[i];
      const name=light.name || this._hass?.states?.[light.entity_id]?.attributes?.friendly_name || light.entity_id;
      button.disabled=this.preview||!state.ready;button.setAttribute('aria-pressed',String(state.on));button.setAttribute('aria-label',`${name}: ${this._t(state.label)}`);
      button.querySelector('span').textContent=state.ready ? light.name || '' : [light.name,this._t('Unavailable')].filter(Boolean).join(' · ');button.querySelector('ha-icon').setAttribute('icon',!state.ready?'mdi:help-circle-outline':light.icon || (state.on?'mdi:lightbulb-on':'mdi:lightbulb-off-outline'));
      const path=this._paths[i];if(path){path.setAttribute('stroke',!state.ready?'var(--disabled-text-color)':state.on?state.color||'var(--color-yellow,var(--primary-color))':'var(--divider-color)');path.setAttribute('stroke-dasharray',state.ready?'none':'4 4');path.style.opacity=String(!state.ready?1:state.on?state.intensity:.5);path.style.filter=state.on?'drop-shadow(0 0 5px '+(state.color||'var(--primary-color)')+')':'none';}
    }
  }
  _layout() {
    if(!this._canvas)return;
    if(this._config.full_page)this.style.setProperty('--floor-top',`${Math.max(0,this.getBoundingClientRect().top)}px`);
    const {width,height}=this._canvas.getBoundingClientRect();if(!width||!height||!this._img.naturalWidth)return;
    const bounds=imageBounds(width,height,this._img.naturalWidth,this._img.naturalHeight);this._svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const boxes=[];
    for(const [i,light] of this._config.lights.entries()) {
      const button=this._buttons[i],p=floorPosition(light,bounds),w=button.offsetWidth||48,h=button.offsetHeight||48;
      const x=Math.min(width-w/2,Math.max(w/2,p.x)),y=Math.min(height-h/2,Math.max(h/2,p.y));button.style.left=x+'px';button.style.top=y+'px';
      boxes.push({x,y,w,h});const anchor=this._anchors[i];for(const [key,value]of Object.entries({x1:p.x,y1:p.y,x2:x,y2:y}))anchor.setAttribute(key,String(value));anchor.style.display=Math.abs(p.x-x)+Math.abs(p.y-y)>1?'':'none';
      if(this._paths[i])this._paths[i].setAttribute('points',light.strip.points.map(point=>{const p=floorPosition(point,bounds);return `${p.x},${p.y}`;}).join(' '));
    }
    this._overlap=boxes.some((box,i)=>boxes.slice(i+1).some(other=>Math.abs(box.x-other.x)<(box.w+other.w)/2 && Math.abs(box.y-other.y)<(box.h+other.h)/2));this._render();
  }
}
if(globalThis.customElements && !customElements.get('marao-floor-plan-card'))customElements.define('marao-floor-plan-card',MaraoFloorPlanCard);
