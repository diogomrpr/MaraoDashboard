import {cameraImage} from './preview-assets.js';

// Home Assistant owns video transport. The public demo labels that boundary explicitly.
export class CameraPlayback {
  constructor(card,slot){this.card=card;this.slot=slot;}
  update(hass,entity,label){
    this.hass=hass;this.entity=entity;
    const state=hass?.states?.[entity],available=state&&!['unknown','unavailable','off'].includes(state.state);
    if(this.signature===JSON.stringify([entity,label,available,hass.language]))return;
    this.signature=JSON.stringify([entity,label,available,hass.language]);
    const wrap=document.createElement('div');wrap.style.cssText='position:relative;aspect-ratio:16/9;background:var(--secondary-background-color);overflow:hidden';
    if(available){const image=document.createElement('img');image.src=cameraImage;image.alt=label||'Fictional camera';image.style.cssText='width:100%;height:100%;object-fit:cover';wrap.append(image);}
    const note=document.createElement('p');note.style.cssText='position:absolute;bottom:0;left:0;right:0;margin:0;padding:10px;background:var(--ha-card-background);font-size:14px;color:var(--primary-text-color)';
    note.textContent=available?(hass.language==='pt'?'Imagem fictícia · vídeo disponível no Home Assistant':'Fictional image · video plays in Home Assistant'):(state?.state==='unknown'?'Unknown':'Unavailable');wrap.append(note);this.slot.replaceChildren(wrap);
  }
  dispose(){this.slot.replaceChildren();}
}
export async function loadNativeCamera(){
  if(!customElements.get('ha-hls-player'))customElements.define('ha-hls-player',class extends HTMLElement{connectedCallback(){this.textContent='Recording playback is available in Home Assistant. This website demonstrates metadata and filters.';this.style.cssText='display:block;min-height:160px;padding:24px;background:var(--secondary-background-color)';}});
}
