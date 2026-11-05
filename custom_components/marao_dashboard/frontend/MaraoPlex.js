const query=new URL(import.meta.url).search;
const [model,actions,dropdown,context,press]=await Promise.all(['MaraoPlexModel.js','MaraoCards.js','MaraoDropdown.js','MaraoNativeContext.js','MaraoPressFeedback.js'].map(file=>import(new URL(`./${file}${query}`,import.meta.url))));
const {browsePlex,plexBrowseEntity,rivuletPlayback,rivuletLink,plexHome,plexURI,plexTarget,plexTargets,plexTargetIdentity,plexLaunchProblem,plexError,plexText,PlexLaunch}=model;
const Base=globalThis.HTMLElement || class {};
const styles=`${dropdown.dropdownStyles}${press.pressStyles}
:host{display:block;min-width:0;font-family:var(--primary-font-family,Montserrat,system-ui,sans-serif);color:var(--primary-text-color)}
ha-card{display:block;box-sizing:border-box;padding:16px;border-radius:var(--ha-card-border-radius,28px);background:var(--marao-card-background,var(--ha-card-background));color:var(--marao-card-text-color,var(--primary-text-color));min-width:0}
h3,p{margin:0;overflow-wrap:anywhere}h3{font-size:var(--font-size-primary,1.125rem)}p{line-height:1.4}button{font:inherit;color:inherit;cursor:pointer;min-width:48px;min-height:48px;padding:12px;border:0;border-radius:14px;background:var(--secondary-background-color);overflow-wrap:anywhere;white-space:normal}button:disabled{opacity:.5;cursor:default}button:focus{outline:none}
.toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center}.toolbar>.target{flex:1;min-width:min(100%,140px)}.body,section{display:grid;gap:12px;min-width:0}section+section{margin-top:12px}.shelf-heading{display:flex;align-items:center;gap:4px}.shelf-heading h3{flex:1}.shelf-heading button{width:48px;height:48px;padding:10px}.items{display:flex;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;gap:12px;min-width:0}.items>.item{flex:0 0 176px;width:176px;scroll-snap-align:start}.items>.load-more{flex:0 0 176px;align-self:center}.poster{width:160px;height:240px}.item{box-sizing:border-box;display:flex;flex-direction:column;align-items:stretch;text-align:start;gap:8px;padding:8px;background:transparent}.poster{display:grid;place-items:center;aspect-ratio:2/3;width:100%;overflow:hidden;border-radius:10px;background:var(--opacity-contrast-100,rgba(128,128,128,.16))}.poster img{width:100%;height:100%;object-fit:cover;grid-area:1/1}.poster ha-icon{grid-area:1/1;z-index:1;align-self:end;justify-self:end;margin:8px;border-radius:50%;background:var(--ha-card-background,var(--card-background-color));--mdc-icon-size:32px}.item span:last-child{overflow-wrap:anywhere;font-weight:600}.status{margin-top:12px}.status:empty{display:none}.browse{width:100%;margin-top:12px}.target-name{display:block;min-height:48px;box-sizing:border-box;padding:12px;font-weight:600}ha-card[data-problem]{--marao-icon-color:currentColor}
`;

export class MaraoPlexWatchCard extends Base {
  constructor(){
    super();this.attachShadow({mode:'open'});this._cache=new Map();this._artwork=new Map();this._epoch=0;this._generation=0;this._history=[];this._shelves=new Map();
    this._launch=new PlexLaunch({context:()=>this._launchContext(),callService:actions.callServiceWithNotification,haptic:actions.haptic,changed:state=>{this._launchState=state;this._syncStatus();}});
  }
  setConfig(config){
    if(!plexTarget(config?.parent))throw new Error('Choose a Plex client.');
    this._launch.cancel();this._config=structuredClone(config);this._selected=plexTarget(config.parent);this._reset();
  }
  set hass(value){
    const changed=this._account!==value?.user?.id || this._connection!==value?.connection;
    this._account=value?.user?.id;this._connection=value?.connection;
    this._hass=value;
    if(changed){this._launch.cancel();this._reset();}
    this._syncTargets();this._launch.update();this._popup&&(this._popup.hass=value);this._syncStatus();
    if(this.isConnected&&!this.preview&&!this._attempted&&!this._loading&&actions.serviceConnectionReady(value))this._loadHome();
  }
  get hass(){return this._hass;}
  get preview(){return Boolean(this._preview||this.nativeOwner?.preview||context.nativeEditing(this));}
  set preview(value){this._preview=Boolean(value);const next=this.preview;if(next!==this._wasPreview){this._wasPreview=next;if(next){this._launch.cancel();this._popup?._close(false);this._reset();}else if(this.isConnected&&this._hass&&!this._attempted&&!this._loading)this._loadHome();}this._syncStatus();}
  connectedCallback(){
    this._events?.abort();this._events=new AbortController();const signal=this._events.signal;
    const location=()=>`${globalThis.location?.pathname || ''}${globalThis.location?.hash || ''}`,initial=location();
    for(const event of ['location-changed','hashchange','popstate'])globalThis.window?.addEventListener(event,()=>{if(location()!==initial){this._launch.cancel();this._popup?._close(false);}},{signal});
    globalThis.document?.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')this._launch.cancel();},{signal});
    this._mount();if(!this.preview&&this._hass)this._loadHome();
  }
  disconnectedCallback(){this._events?.abort();this._launch.cancel();this._popup?._close(false);this._popup=null;this._reset();this._picker?.destroy();this._feedback?.destroy();this._clearSections();}
  getCardSize(){return this._config?.full?6:3;}
  _t(value){return plexText(this._hass,value);}
  _reset(){
    ++this._epoch;++this._generation;this._browser=null;this._cache=new Map();this._artwork=new Map();this._home=null;this._folder=null;this._history=[];this._shelves=new Map();this._loading=false;this._attempted=false;this._artworkError=false;this._contentError='';this._launchState={};
    if(this._body)this._draw();
  }
  _mount(){
    this._picker?.destroy();this._feedback?.destroy();this.shadowRoot.innerHTML=`<style>${styles}</style><ha-card><div class="toolbar"><div class="target"></div></div><div class="body"></div><p class="status" role="status" aria-live="polite"></p></ha-card>`;
    this._surface=this.shadowRoot.querySelector('ha-card');this._toolbar=this.shadowRoot.querySelector('.toolbar');this._targetHost=this.shadowRoot.querySelector('.target');this._body=this.shadowRoot.querySelector('.body');this._status=this.shadowRoot.querySelector('.status');
    this._feedback=press.bindPressFeedback(this.shadowRoot);this._selectorKey=null;this._syncTargets();this._draw();
  }
  _button(label,action,container){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.onclick=event=>{event.stopPropagation();if(button.disabled)return;actions.haptic('heavy');action(button);};container?.append(button);return button;
  }
  _dashboard(){return context.nativeDashboardConfig(context.findNativeHost(this)?.lovelace);}
  _syncTargets(){
    if(!this._config)return;
    this._targets=plexTargets(this._dashboard(),this._config.parent);
    if(this._selected){
      const next=this._targets.find(target=>plexTargetIdentity(target)===plexTargetIdentity(this._selected));
      if(!next){this._launch.cancel();this._selected=null;this._contentError='The selected TV is no longer available.';}
      else this._selected=next;
    }
    const signature=JSON.stringify([this._targets,this._selected?.key,this._hass?.language]);
    if(!this._targetHost||signature===this._selectorKey)return;
    this._selectorKey=signature;this._picker?.destroy();this._picker=null;this._targetHost.replaceChildren();
    if(this._targets.length<2){const label=document.createElement('span');label.className='target-name';label.textContent=this._selected?.name||this._t('Choose an Apple TV.');this._targetHost.append(label);return;}
    const picker=document.createElement('div');picker.className='marao-dropdown';
    const trigger=document.createElement('button');trigger.type='button';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-label',this._t('Apple TV'));trigger.textContent=this._selected?.name||this._t('Choose an Apple TV.');
    const menu=document.createElement('div');menu.className='marao-dropdown-options';menu.setAttribute('role','menu');
    const choices=this._targets.map(target=>{const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitemradio');button.textContent=target.name;menu.append(button);return{value:target.key,button};});picker.append(trigger,menu);this._targetHost.append(picker);
    this._picker=dropdown.bindDropdown(picker,{trigger,menu,choices,value:()=>this._selected?.key,activeElement:()=>this.shadowRoot.activeElement,haptic:()=>actions.haptic('heavy'),onSelect:key=>{
      actions.haptic('heavy');
      this._launch.cancel();this._selected=this._targets.find(target=>target.key===key)||null;this._reset();this._selectorKey=null;this._syncTargets();this._loadHome();this._syncStatus();
    }});
  }
  _launchContext(){return{hass:this._hass,target:this._selected,ownerKey:JSON.stringify(this._config?.parent),active:this.isConnected&&globalThis.document?.visibilityState!=='hidden',preview:this.preview};}
  _read(folder){
    const target=this._selected||plexTarget(this._config.parent), key=JSON.stringify([target.plex,folder]);
    const cache=this._cache;
    if(!cache.has(key)){
      const server=plexURI(target.plex.library_root.media_content_id).host,hass=this._hass,epoch=this._epoch;
      this._browser ||= plexBrowseEntity(hass,target.plex,server);
      const pending=this._browser.then(client=>{
        if(epoch!==this._epoch||hass.user?.id!==this._hass?.user?.id||hass.connection!==this._hass?.connection||!this.isConnected)throw new Error('Playback cancelled. Choose a TV and try again.');
        return browsePlex(this._hass,client,folder,server);
      }).catch(error=>{if(cache.get(key)===pending)cache.delete(key);throw error;});
      cache.set(key,pending);if(cache.size>24)cache.delete(cache.keys().next().value);
    }
    return this._cache.get(key);
  }
  async _loadHome(){
    if(!this._config||this.preview||!this.isConnected||!this._hass||this._loading)return;
    const generation=++this._generation,epoch=this._epoch,target=this._selected||plexTarget(this._config.parent);
    this._loading=true;this._attempted=true;this._contentError='';this._draw();
    try{const home=await plexHome(target.plex,folder=>{
      if(generation!==this._generation||epoch!==this._epoch||!this.isConnected)throw new Error('Playback cancelled. Choose a TV and try again.');
      return this._read(folder);
    });if(generation!==this._generation||epoch!==this._epoch||!this.isConnected)return;this._home=home;this._contentError=home.error;this._folder=null;this._history=[];if(this._config.initialFolder){const folder=this._config.initialFolder;delete this._config.initialFolder;this._loading=false;return this._navigate(folder);}}
    catch(error){if(generation!==this._generation||epoch!==this._epoch||!this.isConnected)return;this._contentError=plexError(error);}
    if(generation===this._generation&&epoch===this._epoch){this._loading=false;this._draw();}
  }
  async _navigate(folder,back=false){
    const generation=++this._generation,epoch=this._epoch;
    this._loading=true;this._contentError='';this._draw();
    try{const node=await this._read(folder);if(generation!==this._generation||epoch!==this._epoch||!this.isConnected)return;
      if(!back)this._history.push(folder);this._folder=node;
    }catch(error){if(generation!==this._generation||epoch!==this._epoch||!this.isConnected)return;this._contentError=plexError(error);}
    if(generation===this._generation&&epoch===this._epoch){this._loading=false;this._draw();}
  }
  _clearSections(){this._sectionEvents?.abort();for(const observer of this._sectionObservers||[])observer.disconnect();this._sectionObservers=[];}
  _section(title,items,empty,key=title){
    const section=document.createElement('section'),header=document.createElement('div'),heading=document.createElement('h3');header.className='shelf-heading';heading.textContent=title;header.append(heading);section.append(header);this._body.append(section);
    if(!items?.length){const text=document.createElement('p');text.textContent=this._t(empty||'This folder is empty.');section.append(text);return;}
    const grid=document.createElement('div');grid.className='items';grid.dataset.shelf=key;section.append(grid);
    const signal=this._sectionEvents.signal,saved=this._shelves.get(key)||{offset:0,shown:24};let shown=0;
    const arrows=[-1,1].map(direction=>{const button=this._button('',()=>{grid.scrollBy({left:direction*(grid.querySelector('.item')?.getBoundingClientRect().width+12||188),behavior:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},header);button.setAttribute('aria-label',`${this._t(direction<0?'Previous':'Next')}: ${title}`);const icon=document.createElement('ha-icon');icon.setAttribute('icon',direction<0?'mdi:chevron-left':'mdi:chevron-right');icon.setAttribute('aria-hidden','true');button.append(icon);return button;});
    const update=()=>{arrows[0].disabled=grid.scrollLeft<=1;arrows[1].disabled=grid.scrollLeft+grid.clientWidth>=grid.scrollWidth-1;this._shelves.set(key,{offset:grid.scrollLeft,shown});};
    const more=this._button(this._t('Load more'),()=>{append(24);update();},grid);more.className='load-more';
    const append=count=>{for(const item of items.slice(shown,shown+count)){this._tile(grid,item);grid.append(more);}shown=Math.min(items.length,shown+count);more.hidden=shown>=items.length;};append(saved.shown);
    grid.scrollLeft=saved.offset;grid.addEventListener('scroll',update,{signal,passive:true});
    let start=null,moved=false;
    grid.addEventListener('pointerdown',event=>{start=[event.clientX,event.clientY];moved=false;},{signal,passive:true});
    grid.addEventListener('pointermove',event=>{if(start&&Math.hypot(event.clientX-start[0],event.clientY-start[1])>8)moved=true;},{signal,passive:true});
    grid.addEventListener('pointercancel',()=>{moved=true;},{signal,passive:true});
    grid.addEventListener('click',event=>{if(moved&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();}start=null;},{signal,capture:true});
    if(globalThis.ResizeObserver){const observer=new ResizeObserver(update);observer.observe(grid);this._sectionObservers.push(observer);}update();
  }
  _tile(grid,item){
    const button=document.createElement('button');button.type='button';button.className='item';button.setAttribute('aria-label',item.title);button.dataset.play=String(!item.can_expand);button.dataset.inert=String(!item.can_play&&!item.can_expand);
    if(!item.can_expand&&rivuletPlayback(this._selected?.plex)&&!rivuletLink(item,plexURI(this._selected.plex.library_root.media_content_id).host))button.dataset.inert='true';
    const poster=document.createElement('span');poster.className='poster';const icon=document.createElement('ha-icon');icon.setAttribute('icon',item.can_expand?'mdi:folder-play-outline':'mdi:play-circle-outline');icon.setAttribute('aria-hidden','true');poster.append(icon);
    const title=document.createElement('span');title.textContent=item.title;button.append(poster,title);grid.append(button);
    button.onclick=event=>{event.stopPropagation();if(button.disabled)return;if(item.can_expand){actions.haptic('heavy');this._inSheet()?this._navigate(item):this._openBrowser(button,item);}else this._launch.start(item);};
    if(item.thumbnail)this._image(poster,item);
  }
  async _image(poster,item){
    const epoch=this._epoch,generation=this._generation,account=this._hass?.user?.id,connection=this._hass?.connection,path=item.thumbnail;
    const server=plexURI((this._selected||plexTarget(this._config.parent)).plex.library_root.media_content_id).host;
    if(!path.startsWith(`/api/plex_image_proxy/${encodeURIComponent(server)}/`)||!/^\/api\/plex_image_proxy\/[a-zA-Z0-9_%~-]+\/\d+$/.test(path))return;
    try{
      if(!this._artwork.has(path))this._artwork.set(path,this._hass.callWS({type:'auth/sign_path',path,expires:600}));
      const result=await this._artwork.get(path),signed=typeof result==='string'?result:result?.path;
      if(epoch!==this._epoch||generation!==this._generation||account!==this._hass?.user?.id||connection!==this._hass?.connection||!poster.isConnected)return;
      if(typeof signed!=='string'||!signed.startsWith(path+'?'))throw new Error('Unable to load artwork.');
      const image=document.createElement('img');image.loading='lazy';image.alt='';image.src=this._hass.hassUrl?this._hass.hassUrl(signed):signed;
      image.onerror=()=>{image.remove();if(epoch===this._epoch&&generation===this._generation){this._artworkError=true;this._syncStatus();}};poster.append(image);
    }catch{if(epoch===this._epoch&&generation===this._generation&&poster.isConnected){this._artworkError=true;this._syncStatus();}}
  }
  _draw(){
    if(!this._body)return;for(const rail of this._body.querySelectorAll('[data-shelf]')){const state=this._shelves.get(rail.dataset.shelf);if(state)state.offset=rail.scrollLeft;}this._clearSections();this._sectionEvents=new AbortController();this._body.replaceChildren();this._toolbar.querySelectorAll('[data-navigation]').forEach(node=>node.remove());
    const nav=(label,action)=>{const button=this._button(this._t(label),action,this._toolbar);button.dataset.navigation='';return button;};
    if(this._config?.full||this._expanded){
      if(this._history.length||this._folder)nav('Back',()=>{this._history.pop();if(this._history.length)this._navigate(this._history.at(-1),true);else{++this._generation;this._loading=false;this._folder=null;this._draw();}});
      else if(this._expanded)nav('Back',()=>{this._launch.cancel();this._expanded=false;this._draw();});
    }
    nav('Refresh',()=>{this._browser=null;this._cache.clear();this._artwork.clear();this._artworkError=false;this._loading=false;if(this._folder)this._navigate(this._folder,true);else this._loadHome();});
    if(this.preview){const heading=document.createElement('h3');heading.textContent=this._t('Plex library');this._body.append(heading);this._syncStatus();return;}
    if(this._loading){const loading=document.createElement('p');loading.textContent=this._t('Loading library…');loading.setAttribute('role','status');this._body.append(loading);}
    else if(this._folder)this._section(this._folder.title,this._folder.children||[]);
    else if(this._home){
      this._section(this._t('Continue Watching'),this._home.resume,this._home.failures?.resume||(this._home.resume===null?'Continue Watching is not available for this library.':'Nothing to continue.'),'continue');
      this._section(this._t('Movies'),this._home.movies,this._home.failures?.movies,'movies');
      this._section(this._t('TV Series'),this._home.shows,this._home.failures?.shows,'shows');
      const browse=this._button(this._t('Browse library'),button=>this._openBrowser(button,(this._selected||plexTarget(this._config.parent)).plex.library_root),this._body);browse.className='browse';
    }
    if(this._contentError)this._button(this._t('Retry'),()=>{this._loading=false;this._browser=null;this._cache.clear();if(this._folder)this._navigate(this._folder,true);else this._loadHome();},this._body);
    this._syncStatus();
  }
  _syncStatus(){
    if(!this._status)return;
    const availability=plexLaunchProblem(this._launchContext()),available=!availability;
    const error=this._contentError||this._launchState?.error||(this._artworkError?'Unable to load artwork.':'');
    const message=error||availability|| (this._launchState?.pending?(rivuletPlayback(this._selected?.plex)?'Starting Rivulet…':'Starting Plex…'):this._launchState?.accepted?'Playback requested.':'');
    this._status.textContent=this._t(message);this._status.setAttribute('role',error?'alert':'status');
    const problem=actions.cardProblem({entity:this._selected?.entity_id},this._hass,{error:plexText(this._hass,error)});
    this._surface.setAttribute('style',problem?actions.problemStyle(problem):'');
    if(problem)this._surface.dataset.problem=problem.kind;else delete this._surface.dataset.problem;
    for(const button of this._body.querySelectorAll('[data-play]'))button.disabled=this.preview||button.dataset.inert==='true'||button.dataset.play==='true'&&(!available||Boolean(this._launchState?.pending));
    if(this._popup)this._popup.preview=this.preview;
  }
  _inSheet(){for(let node=this;node;node=node.parentNode||node.host||node.getRootNode?.()?.host){if(node.classList?.contains('marao-popup-overlay'))return true;}return false;}
  _openBrowser(opener,folder){
    if(this.preview)return;
    if(this._inSheet()){this._expanded=true;if(folder)this._navigate(folder);else this._draw();return;}
    this._popup?._close(false);
    const popup=new actions.MaraoPopupCard();popup.nativeOwner=this;
    popup.setConfig({title:this._t('Plex library'),height:'auto',max_height:'100%',cards:[{type:'custom:marao-plex-watch-card',parent:{...this._config.parent,entity_id:this._selected.entity_id,name:this._selected.name,apple_tv:{...this._config.parent.apple_tv,plex:structuredClone(this._selected.plex)}},full:true,...(folder?{initialFolder:folder}:{})}]});
    popup.hass=this._hass;popup._openSheet(actions.focusRestorer(opener));this._popup=popup;
  }
}
if(globalThis.customElements&&!customElements.get('marao-plex-watch-card'))customElements.define('marao-plex-watch-card',MaraoPlexWatchCard);
