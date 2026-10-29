// Presentation only: action dispatch and haptics remain with each control's owner.
export const pressStyles = `
.marao-press-surface{position:relative;isolation:isolate}
.marao-press-surface::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:5;background:var(--primary-text-color);opacity:0;transition:opacity 160ms ease-out}
.marao-press-surface[data-marao-pressed]::after{opacity:.08;transition-duration:70ms}
.marao-press-content{transform-origin:center;transition:scale 160ms ease-out}
.marao-press-content[data-marao-press-move]{scale:.98;transition-duration:70ms}
@media(prefers-reduced-motion:reduce){.marao-press-content,.marao-press-content[data-marao-press-move]{scale:none!important;transition:none!important}.marao-press-surface::after{transition:none}}
`;

export function pressTarget(root, event, selector = 'button,a') {
  for (const node of event.composedPath?.() || [event.target]) {
    if (node === root) break;
    // Stop at the innermost control, including controls owned by another Shadow DOM.
    if (node?.matches?.('button,a,input,select,textarea,[role="slider"],marao-slide-to-open')) {
      return node.getRootNode?.() === root.getRootNode?.() || node.getRootNode?.() === root
        ? node.matches(selector) ? node : null : null;
    }
  }
  return null;
}

function contentFor(surface) {
  const visual = surface.querySelector?.('ha-icon,ha-state-icon,svg,img,span');
  const owner = visual?.closest?.('button,a');
  if (owner && owner !== surface) return null;
  if (visual) return visual;
  const texts = [...(surface.childNodes || [])].filter(node => node.nodeType === 3 && node.textContent.trim());
  if (!texts.length) return null;
  const span = surface.ownerDocument.createElement('span'); texts[0].before(span); span.append(...texts);
  return span;
}

export function bindPressFeedback(root, { resolve = event => pressTarget(root,event), pointer = true } = {}) {
  const doc = root?.ownerDocument || globalThis.document, host = doc?.defaultView || globalThis.window;
  const listeners = [], tracking = [], now = () => host?.performance?.now?.() ?? performance.now();
  let state, timer, generation = 0, blocked, disposed = false;
  const listen = (node,type,fn,options) => {
    const add=()=>node?.addEventListener?.(type,fn,options),remove=()=>node?.removeEventListener?.(type,fn,options);
    if(node===doc||node===host)tracking.push({add,remove});else {add();listeners.push(remove);}
  };
  const eligible = entry => {
    if (!entry || entry.target.isConnected === false || entry.surface.isConnected === false || entry.target.disabled
      || entry.target.getAttribute?.('aria-disabled') === 'true' || entry.enabled?.() === false || doc?.visibilityState === 'hidden') return false;
    if(entry.target.getClientRects?.().length===0)return false;
    for (let node = entry.target; node; node = node.parentElement || node.getRootNode?.()?.host) if (node.inert || node.hidden) return false;
    return !entry.content || entry.content.isConnected !== false;
  };
  const clear = () => {
    generation++;clearTimeout(timer);timer=null;
    for(const listener of tracking)listener.remove();observer?.disconnect();
    if (!state) return;
    state.surface.removeAttribute?.('data-marao-pressed');state.surface.classList?.remove('marao-press-surface');
    state.content?.removeAttribute?.('data-marao-press-move');state.content?.classList?.remove('marao-press-content');state=null;
  };
  const cancel = () => {if(state?.down)blocked={target:state.target,pointerId:state.pointerId};clear();};
  const entryFor = value => value?.target ? value : value ? {target:value,surface:value} : null;
  const start = (value,event={},manual=true) => {
    clear();if(disposed)return;
    const entry=entryFor(value);if(!entry)return;
    entry.surface ||= entry.target;
    if(!eligible(entry))return;
    entry.content ??= contentFor(entry.surface);
    blocked=null;state={...entry,started:now(),down:true,manual,pointerId:event.pointerId,x:event.clientX,y:event.clientY};
    for(const listener of tracking)listener.add();
    observer?.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-disabled','hidden','inert']});
    for(let node=root?.host||root?.parentElement||root?.getRootNode?.()?.host;node;node=node.parentElement||node.getRootNode?.()?.host)
      observer?.observe(node,{attributes:true,attributeFilter:['hidden','inert']});
    state.surface.classList?.add('marao-press-surface');state.surface.setAttribute?.('data-marao-pressed','');
    state.content?.classList?.add('marao-press-content');state.content?.setAttribute?.('data-marao-press-move','');
  };
  const release = () => {
    if(!state?.down)return;
    if(!eligible(state)){cancel();return;}
    state.down=false;const token=generation;
    const restore=()=>{
      if(token!==generation||!state)return;
      if(!eligible(state)){clear();return;}
      state.surface.removeAttribute?.('data-marao-pressed');state.content?.removeAttribute?.('data-marao-press-move');
      timer=setTimeout(()=>{if(token===generation)clear();},160);
    };
    timer=setTimeout(restore,Math.max(0,80-(now()-state.started)));
  };
  const sync=()=>{if(state&&!eligible(state))cancel();};
  if(pointer){
    listen(root,'pointerdown',event=>{
      if(event.isPrimary===false||(event.button!=null&&event.button!==0)){cancel();return;}
      if(state?.down&&event.pointerId!==state.pointerId){cancel();return;}
      start(resolve(event),event,false);
    },{capture:true,passive:true});
    listen(doc,'pointermove',event=>{
      if(!state?.down||state.manual||event.pointerId!==state.pointerId)return;
      const box=state.target.getBoundingClientRect?.();
      if(Math.hypot(event.clientX-state.x,event.clientY-state.y)>8 || box&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))cancel();
    },{capture:true,passive:true});
    listen(doc,'pointerup',event=>{if(state?.down&&!state.manual&&event.pointerId===state.pointerId)release();},{capture:true,passive:true});
    for(const type of ['pointercancel','lostpointercapture'])listen(doc,type,event=>{if(state&&!state.manual&&event.pointerId===state.pointerId)cancel();},true);
    listen(root,'pointerleave',event=>{if(!state?.manual&&state?.target===event.target)cancel();},true);
  }
  listen(root,'click',event=>{
    const entry=entryFor(resolve(event));if(!entry)return;
    const keyboard=event.detail===0&&!event.pointerType;
    if(!keyboard&&pointer&&blocked?.target===entry.target&&(event.pointerId==null||event.pointerId===blocked.pointerId)){
      event.preventDefault();event.stopImmediatePropagation();return;
    }
    if(keyboard){start(entry);release();}
  },true);
  for(const type of ['scroll','blur','pagehide','location-changed','popstate','hashchange'])listen(host,type,cancel,true);
  listen(doc,'visibilitychange',()=>{if(doc.visibilityState==='hidden')cancel();});
  const observer = globalThis.MutationObserver && root ? new MutationObserver(sync) : null;
  return {start,release,cancel,sync,destroy(){disposed=true;clear();observer?.disconnect();for(const remove of listeners)remove();}};
}
