import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const cardsSource = (await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8")).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url).href));
const source = (await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoNavigation.js", import.meta.url), "utf8")).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js', import.meta.url).href));

test('native activity preserves custom dashboard roots and explicitly empty navigation', async () => {
  const {fullscreenUsers,maraoDashboardActive}=await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js');
  const owner={isConnected:true,preview:false,_config:{dashboard_root:'casa-main',routes:[]}};
  fullscreenUsers.add(owner);
  try {
    assert.equal(maraoDashboardActive('/casa-main/home'),true);
    assert.equal(maraoDashboardActive('/another-dashboard/home'),false);
    owner.preview=true;assert.equal(maraoDashboardActive('/casa-main/home'),false);
    owner.preview=false;owner.isConnected=false;assert.equal(maraoDashboardActive('/casa-main/home'),false);
  } finally {fullscreenUsers.delete(owner);}
});

test("ported sheets copy theme colors while viewport insets keep inheriting live values", async () => {
  const { MaraoPopupCard } = await import('../../custom_components/marao_dashboard/frontend/MaraoCards.js');
  const previous = globalThis.getComputedStyle;
  const entries = { '--ha-card-background': '#fff', '--font-size-primary': '1.25rem',
    '--safe-area-inset-top': '47px', '--app-safe-area-inset-bottom': '34px', '--marao-safe-area-inset-left': '47px' };
  const computed = Object.assign(Object.keys(entries), { getPropertyValue: key => entries[key] });
  const copied = new Map(Object.entries(entries));
  globalThis.getComputedStyle = () => computed;
  try {
    MaraoPopupCard.prototype._syncTheme.call({ _overlay: { style: {
      setProperty: (key, value) => copied.set(key, value), removeProperty: key => copied.delete(key),
    } } });
    assert.deepEqual(Object.fromEntries(copied), { '--ha-card-background': '#fff', '--font-size-primary': '1.25rem' });
  } finally {
    if (previous === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = previous;
  }
});

test("navbar and sheets share the host-aware inset fallback", () => {
  assert.match(source, /var\(--marao-safe-area-inset-\$\{side\}, var\(--safe-area-inset-\$\{side\}, env\(safe-area-inset-\$\{side\}, 0px\)\)\)/);
  assert.match(source, /max\(24px, calc\(\(\$\{safeArea\("bottom"\)\} - 20px\) \* 2\)\)/);
  assert.match(cardsSource, /padding:max\(50px, \$\{safeArea\("top"\)\}\) \$\{safeArea\("right"\)\} 0 \$\{safeArea\("left"\)\}/);
  assert.match(cardsSource, /overflow:auto;padding:0 8px \$\{navbarBottomGap\(\)\};border-radius:22px/);
  assert.doesNotMatch(cardsSource, /host\.style\.paddingBottom|padding-bottom:max\(8px/);
  assert.match(cardsSource, /max-height:min\(\$\{esc\(this\._config\.max_height\)\}, 100%\)/);
});

test("navbar partition preserves every route at exact fit, overflow and one-slot widths", async () => {
  const { navbarPartition } = await import('../../custom_components/marao_dashboard/frontend/MaraoCards.js');
  for (const [count, width, visible, overflow] of [[0,276,0,0],[1,68,1,0],[5,276,5,0],[6,276,4,2],[5,275,3,2],[18,68,0,18],[18,1008,18,0],[20,1008,18,2]]) {
    const routes = Array.from({length:count}, (_,index)=>({label:String(index),url:'/route/'+index,future:[]}));
    const result = navbarPartition(routes,width);
    assert.equal(result.visible.length,visible); assert.equal(result.overflow.length,overflow);
    assert.deepEqual([...result.visible,...result.overflow],routes);
    assert.equal(new Set([...result.visible,...result.overflow]).size,count);
  }
});

test("navbar retains full-size controls in one row and a separately bounded vertical surface", () => {
  assert.match(source, /flex-wrap:nowrap/);
  assert.match(source, /min-width:48px;width:48px;height:48px/);
  assert.match(source, /height:60px/);
  assert.match(source, /overscroll-behavior:contain;touch-action:pan-y/);
  assert.doesNotMatch(source.slice(source.indexOf('export class MaraoNavbarCard'),source.indexOf('  _syncPageRefresh()')), /flex-wrap:wrap/);
  assert.doesNotMatch(source, /padding-bottom:calc\(192px/);
});

test("fullscreen behavior starts only after the navbar is connected", () => {
  assert.match(source, /connectedCallback\(\) \{[^]*?registerFullscreen\(this\);/);
  assert.doesNotMatch(source, /this\._render\(\); registerFullscreen\(this\);/);
});

test("fullscreen owns only active Marao roots and restores styles on replacement, exit and disconnect", async () => {
  const { navbarMainPage } = await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js');
  const style = (initial = {}) => {
    const values = new Map(Object.entries(initial));
    return {
      values, getPropertyValue: key => values.get(key)?.[0] || "",
      getPropertyPriority: key => values.get(key)?.[1] || "",
      setProperty: (key, value, priority = "") => values.set(key, [value, priority]),
      removeProperty: key => values.delete(key),
    };
  };
  const view = { style: style({ "padding-top": ["8px", "important"], "padding-bottom": ["13px", ""], "flex-direction": ["row", "important"] }) };
  const header = { style: style({ display: ["flex", "important"] }) };
  const unrelated = { style: style({ display: ["grid", ""] }) };
  let currentView = view;
  const root = { localName: "hui-root", lovelace: { config: { views: [{ path: "overview" }, { path: "energy" }] } }, shadowRoot: {
    querySelectorAll: () => [header], querySelector: () => currentView,
  } };
  let navRect, navBottom = 24;
  const navbar = () => ({ isConnected: true, getClientRects: () => [{}], parentElement: root,
    shadowRoot: { querySelector: () => navRect ? {getBoundingClientRect: () => navRect} : null },
    _config: { routes: [{ url: "/marao-dashboard/overview" }] },
  });
  const first = navbar(), second = navbar();
  const events = new Map();
  const window = { location: { href: "http://192.168.0.28/marao-dashboard/overview", pathname: "/marao-dashboard/overview" },
    addEventListener: (key, callback) => events.set(key, callback), removeEventListener: key => events.delete(key),
    dispatchEvent() {},
  };
  let timers = 0;
  const functions = new Function("window", "getComputedStyle", "setInterval", "clearInterval", "safeArea", "navbarMainPage", "navbarBottomGap",
    source.slice(source.indexOf("const fullscreenUsers"), source.indexOf("export function registerNavigation")).replaceAll("export ", "")
    + ";return {registerFullscreen,unregisterFullscreen,applyFullscreen};")(window,
      node => ({ bottom: `${navBottom}px`, getPropertyValue: property => node.style?.getPropertyValue(property) || "0px" }),
      () => { timers++; return 1; }, () => { timers--; }, side => `var(--safe-${side})`, navbarMainPage, () => "24px");
  functions.registerFullscreen(first);
  assert.equal(view.style.getPropertyValue("flex-direction"), "column", "The main-page refresh row sits above the full-width view");
  assert.equal(header.style.getPropertyValue("display"), "none");
  assert.equal(view.style.getPropertyValue("padding-top"), "max(8px, var(--safe-top))");
  assert.equal(view.style.getPropertyValue("padding-bottom"), "max(13px, calc(calc(60px + 24px) + 8px))");
  assert.equal(unrelated.style.getPropertyValue("display"), "grid");
  window.location.pathname = "/marao-dashboard/energy";
  events.get("location-changed")();
  assert.deepEqual(view.style.values.get("flex-direction"), ["row", "important"], "Secondary pages retain their original layout");
  assert.equal(view.style.getPropertyValue("padding-top"), "max(8px, var(--safe-top))", "Secondary pages retain the safe area without refresh-button clearance");
  assert.equal(header.style.getPropertyValue("display"), "none");
  window.location.pathname = "/marao-dashboard/overview";
  events.get("location-changed")();
  assert.equal(view.style.getPropertyValue("padding-top"), "max(8px, var(--safe-top))", "The main page uses the in-flow refresh row rather than extra top clearance");
  functions.registerFullscreen(second);
  assert.equal(timers, 0, "Fullscreen layout does not poll while idle");
  window.innerHeight = 844; navRect = {top: 740, height: 80};
  functions.applyFullscreen();
  assert.equal(view.style.getPropertyValue("padding-bottom"), "max(13px, calc(104px + 8px))");
  const stableBottom = view.style.getPropertyValue("padding-bottom");
  window.visualViewport = {offsetTop: 12, height: 800};
  let writes = 0;
  const setProperty = view.style.setProperty;
  view.style.setProperty = (...args) => { writes++; return setProperty(...args); };
  functions.applyFullscreen();
  assert.equal(writes, 0, "Unchanged layout does not rewrite view styles");
  assert.equal(view.style.getPropertyValue("padding-bottom"), stableBottom, "Viewport movement must not change scrollable page height");
  for (const offset of [-60, -12, 0, 24, 60, 0]) {
    window.visualViewport.offsetTop = offset; navRect.top = 740 + offset;
    functions.applyFullscreen();
    assert.equal(view.style.getPropertyValue("padding-bottom"), stableBottom, "Elastic scrolling must not feed back into bottom padding");
  }
  navBottom = 14; navRect.height = 60; functions.applyFullscreen();
  assert.equal(view.style.getPropertyValue("padding-bottom"), "max(13px, calc(74px + 8px))", "Actual navbar size and safe-area offset still update clearance");
  delete window.visualViewport; navRect = undefined;
  delete window.innerHeight;
  currentView = { style: style() };
  functions.applyFullscreen();
  assert.deepEqual(view.style.values.get("padding-top"), ["8px", "important"]);
  assert.deepEqual(view.style.values.get("padding-bottom"), ["13px", ""]);
  assert.deepEqual(view.style.values.get("flex-direction"), ["row", "important"]);
  assert.ok(!view.style.values.has("padding-right"));
  assert.ok(currentView.style.getPropertyValue("padding-top").includes("var(--safe-top)"));
  for (const path of ["/config/dashboard", "/marao-dashboard-editor", "/marao-dashboard/overview"]) {
    window.location.pathname = path;
    events.get("location-changed")();
    assert.equal(header.style.getPropertyValue("display"), path.endsWith("overview") ? "none" : "flex");
    if (!path.endsWith("overview")) assert.equal(currentView.style.values.size, 0);
  }
  first.isConnected = false;
  functions.unregisterFullscreen(first);
  assert.equal(header.style.getPropertyValue("display"), "none");
  functions.unregisterFullscreen(second);
  assert.deepEqual(header.style.values.get("display"), ["flex", "important"]);
  const editor = { ...navbar(), localName: 'marao-dashboard-editor-card', _config: { dashboard_root: 'marao-dashboard' } };
  functions.registerFullscreen(editor);
  assert.equal(header.style.getPropertyValue('display'), 'none');
  assert.equal(currentView.style.getPropertyValue('padding-bottom'), '0px', 'The native full-height editor must not inherit runtime navbar clearance');
  functions.unregisterFullscreen(editor);
  assert.equal(currentView.style.values.size, 0, 'Leaving the editor restores the native view spacing');
  const preview = navbar(); root.lovelace = {config:{},editMode:true};
  functions.registerFullscreen(preview);
  assert.equal(header.style.getPropertyValue('display'),'flex','HA editing keeps the toolbar');
  root.lovelace.editMode=false; preview.preview=true; functions.applyFullscreen();
  assert.equal(header.style.getPropertyValue('display'),'flex','A preview cannot hide the HA shell');
  functions.unregisterFullscreen(preview);
  assert.equal(currentView.style.values.size, 0);
  assert.equal(timers, 0);
  assert.equal(events.size, 0);
});

test("popup cleanup distinguishes retained masonry cards from removed cards and views", () => {
  const removed = [];
  const Popup = new Function("BaseElement", "window", cardsSource.match(/export class MaraoPopupCard[\s\S]*?(?=\nexport )/)[0].replace("export class", "class") + ";return MaraoPopupCard;")(
    class {}, { removeEventListener: event => removed.push(event) });
  const popup = new Popup(), card = {};
  const view = { isConnected: true, cards: [card] };
  let closes = 0;
  popup._close = () => closes++;
  popup._viewOwner = { view, card };
  popup.isConnected = false;
  popup.disconnectedCallback();
  assert.equal(closes, 0);
  assert.equal(removed.length, 0);
  view.cards = [];
  popup.disconnectedCallback();
  assert.equal(closes, 1);
  popup._viewOwner = { view, card };
  view.cards = [card]; view.isConnected = false;
  popup.disconnectedCallback();
  assert.equal(closes, 2);
  assert.deepEqual(removed, ['hashchange','location-changed','popstate','hashchange','location-changed','popstate']);
});

test('navbar accepts long explicit routes and rejects malformed entries without replacing source', async () => {
  const { MaraoNavbarCard } = await import('../../custom_components/marao_dashboard/frontend/MaraoCards.js');
  const routes = JSON.parse(await fs.readFile(new URL('./navbar-overflow.fixture.json', import.meta.url))).routes;
  const card = { _closeOverflow() {}, _closeMaintenance() {}, _render() {} };
  for (const count of [0, 1, 5, 6, 8]) {
    MaraoNavbarCard.prototype.setConfig.call(card, { routes: routes.slice(0, count), future: [] });
    assert.deepEqual(card._config.routes, routes.slice(0, count));
  }
  const before = card._config;
  for (const invalid of [null, {}, [null], [{label:'Missing'}], [{url:'/x',label:''}]]) {
    assert.throws(() => MaraoNavbarCard.prototype.setConfig.call(card, { routes: invalid }));
    assert.equal(card._config, before);
  }
});

test('active routes resolve path aliases, same-view hashes and origin without promoting routes', async () => {
  const { navbarRouteCurrent } = await import('../../custom_components/marao_dashboard/frontend/MaraoCards.js');
  const location={href:'http://disposable.test/marao-dashboard/overview#details',origin:'http://disposable.test',pathname:'/marao-dashboard/overview',hash:'#details',search:''};
  for(const [route,expected] of [[{url:'#details'},true],[{path:'/marao-dashboard/overview#details'},true],[{url:'/marao-dashboard/overview'},true],[{url:'#other'},false],[{url:'/marao-dashboard/rooms'},false],[{url:'http://external.test/marao-dashboard/overview'},false]])assert.equal(navbarRouteCurrent(route,location),expected);
});

test('refresh button follows the configured main view including dashboard-root and numeric paths', async () => {
  const { navbarMainPage } = await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js');
  const config = { views: [{ path: 'home' }, { path: 'energy' }] };
  for (const [path, expected] of [['/marao-dashboard', true], ['/marao-dashboard/', true], ['/marao-dashboard/home', true], ['/marao-dashboard/energy', false], ['/marao-dashboard/overview', false]]) {
    assert.equal(navbarMainPage(config, { pathname: path }), expected, path);
  }
  assert.equal(navbarMainPage({views: [{}]}, {pathname: '/marao-dashboard/0'}), true);
  assert.equal(navbarMainPage(undefined, {pathname: '/marao-dashboard/home'}), false);
});


test('ordinary dashboard editing dispatches the native edit action with current privileges', async () => {
  const {MaraoNavbarCard}=await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js');
  let edits=0;
  const owner=Object.assign(Object.create(MaraoNavbarCard.prototype),{_config:{native_editor:true},_hass:{user:{is_admin:true}},_root:()=>({lovelace:{setEditMode(value){assert.equal(value,true);edits++;}}}),_syncContext(){}});
  assert.equal(owner._editorURL(),'native');owner._openEditor();assert.equal(edits,1);
  owner._hass.user.is_admin=false;owner._openEditor();assert.equal(edits,1);
});

test('landing-page shortcuts have independent visibility and guarded admin editor navigation', async () => {
  const { MaraoNavbarCard } = await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js');
  const originalDocument=globalThis.document,originalWindow=globalThis.window;
  const view=()=>({children:[],prepend(row){row.remove();this.children.unshift(row);row.parentNode=this;}});
  let currentView=view(), calls=0, eligible=true, inert=false;const navigations=[];
  globalThis.window={location:{href:'http://disposable.test/marao-dashboard/home',pathname:'/marao-dashboard/home'},history:{pushState(_state,_title,path){navigations.push(path);}},dispatchEvent(){}};
  globalThis.document={createElement(){
    const control=()=>{const node=new EventTarget();let text='';node.textWrites=0;Object.defineProperty(node,'textContent',{get:()=>text,set:value=>{text=value;node.textWrites++;}});node.setAttribute=(name,value)=>{node[name]=value;};node.getAttribute=name=>node[name];node.removeAttribute=name=>{delete node[name];};return node;};
    const button=control(),editor=control();
    return {setAttribute(){},closest(){return inert?{}:null;},
      attachShadow(){return this.shadowRoot={innerHTML:'',querySelector:selector=>selector==='a'||selector==='.frontend-editor'?editor:button};},
      remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(item=>item!==this);this.parentNode=null;}};
  }};
  const lovelace={config:{views:[{path:'home'},{path:'energy'}]}};
  const owner={isConnected:true,_root:()=>({lovelace}),_view:()=>currentView,_editorURL(){return MaraoNavbarCard.prototype._editorURL.call(this);},_openEditor:MaraoNavbarCard.prototype._openEditor,_syncContext(){},_refreshEligible:()=>eligible,_refreshFrontend:()=>{calls++;}};
  const sync=()=>MaraoNavbarCard.prototype._syncPageRefresh.call(owner);
  try{
    sync();const row=owner._pageRefresh,button=row.shadowRoot.querySelector('button');
    assert.equal(currentView.children[0],row);
    assert.doesNotMatch(row.shadowRoot.innerHTML.match(/:host\{[^}]*\}/)[0],/position:(?:fixed|sticky|absolute)/);
    sync();assert.equal(currentView.children.length,1);
    owner._config={show_cache_reset:false};sync();assert.equal(currentView.children.length,0,'Disabling the button removes its entire spacing row');
    owner._config.show_cache_reset=true;sync();assert.equal(currentView.children[0],row);
    button.dispatchEvent(new Event('click'));assert.equal(calls,1);
    eligible=false;button.dispatchEvent(new Event('click'));assert.equal(calls,1);
    eligible=true;inert=true;button.dispatchEvent(new Event('click'));assert.equal(calls,1);inert=false;
    globalThis.window.location.pathname='/marao-dashboard/energy';sync();assert.equal(currentView.children.length,0);
    globalThis.window.location.pathname='/marao-dashboard/home';sync();assert.equal(currentView.children[0],row);
    currentView=view();sync();assert.equal(currentView.children[0],row);
    lovelace.editMode=true;sync();assert.equal(currentView.children.length,0);lovelace.editMode=false;
    owner._surface={};sync();assert.equal(currentView.children.length,0,'A retained navbar placeholder cannot add a duplicate page button');delete owner._surface;
    sync();owner.isConnected=false;sync();assert.equal(currentView.children.length,0);
    owner.isConnected=true;owner._config={show_cache_reset:false,routes:[],dashboard_root:'renamed-dashboard',editor_path:'marao-editor-editor'};
    owner._hass={user:{is_admin:true},language:'pt'};globalThis.window.location.pathname='/renamed-dashboard/home';sync();
    const editor=row.shadowRoot.querySelector('.frontend-editor');
    assert.equal(currentView.children[0],row,'An admin pencil remains usable with empty routes and hidden cache reset');
    assert.equal(editor.hidden,false);assert.equal(button.hidden,true);assert.equal(editor['aria-label'],'Editar painel');
    assert.match(row.shadowRoot.innerHTML,/<button[^>]*class="frontend-editor"><svg/);
    editor.dispatchEvent(new Event('click'));assert.deepEqual(navigations,['/renamed-dashboard/marao-editor-editor']);
    owner._hass.user.is_admin=false;editor.dispatchEvent(new Event('click'));assert.equal(navigations.length,1,'Stale regular-user controls cannot navigate');sync();assert.equal(currentView.children.length,0);
    owner._hass.user.is_admin=true;owner._config.show_editor_button=false;sync();assert.equal(currentView.children.length,0,'Both hidden shortcuts leave no spacing row');
    editor.dispatchEvent(new Event('click'));assert.equal(navigations.length,1);
    owner._config.show_cache_reset=true;sync();assert.equal(currentView.children[0],row);assert.equal(editor.hidden,true);assert.equal(button.hidden,false);
    delete owner._config.show_editor_button;sync();assert.equal(editor.hidden,false);assert.equal(button.hidden,false);
    owner._config.show_editor_button=false;editor.dispatchEvent(new Event('click'));assert.equal(navigations.length,1,'Visibility changes apply before repaint');
    owner._hass.user.is_admin=false;sync();assert.equal(editor.hidden,true);
    owner._config={};sync();assert.equal(currentView.children[0],row,'Omitted settings retain cache access without editor route metadata');assert.equal(editor.hidden,true);

  }finally{globalThis.document=originalDocument;globalThis.window=originalWindow;}
});

test('maintenance actions recheck role and ownership, close once and retain refresh guards', async () => {
  const { MaraoNavbarCard, navigationLocalize } = await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js');
  const previous = { document:globalThis.document, window:globalThis.window };
  const controls = () => { const node=new EventTarget();node.isConnected=true;node.focus=()=>focus++;return node; };
  let focus=0, refresh=0, dialogs=0, navigations=[], otherModal=false, currentDialog, nativeModal=false;
  // HA keeps an open non-modal dialog off-screen while normal dashboard input remains active.
  const backgroundDialog={localName:'dialog',open:true,matches:selector=>selector===':modal' && nativeModal};
  let currentView=null;
  const root={lovelace:{}}, target=controls();
  const shadow={append(dialog){currentDialog=dialog;dialog.isConnected=true;},querySelector(){return null;},querySelectorAll(){return [];}};
  const owner=Object.assign(Object.create(MaraoNavbarCard.prototype),{
    isConnected:true,_config:{dashboard_root:'casa',editor_path:'marao-editor-editor'},
    _hass:{user:{id:'admin',is_admin:true},language:'pt'},shadowRoot:shadow,
    getClientRects:()=>[{}],getRootNode:()=>({}),_root:()=>root,_view:()=>currentView,
    _closeOverflow(){},_refreshFeedback(){},_refreshFrontend(){refresh++;},
  });
  globalThis.window={location:{href:'http://disposable.test/casa/home',pathname:'/casa/home',search:''},
    history:{pushState(_state,_title,path){navigations.push(path);}},dispatchEvent(){}};
  const doc=new EventTarget();
  let overflow='scroll';
  doc.body={style:{getPropertyValue:()=>overflow,getPropertyPriority:()=>'',setProperty:(_key,value)=>{overflow=value;},removeProperty:()=>{overflow='';}}};
  doc.querySelectorAll=selector=>selector==='*'?[]:[backgroundDialog,...(currentDialog?.isConnected?[currentDialog]:[]),...(otherModal?[{open:true}]:[])];
  doc.createElement=()=>{
    dialogs++;const dialog=new EventTarget(),close=controls(),edit=controls(),reload=controls();
    Object.assign(dialog,{setAttribute(){},style:{setProperty(){}},
      querySelector:selector=>selector==='[data-edit]'?(owner._editorURL()?edit:null):selector==='[data-refresh]'?reload:close,
      showModal(){this.open=true;},close(){this.open=false;this.dispatchEvent(new Event('close'));},remove(){this.isConnected=false;},
      getBoundingClientRect:()=>({left:0,right:320,top:500,bottom:800})});
    return dialog;
  };
  globalThis.document=doc;
  const hold=()=>owner._completeRefreshHold(target);
  const click=selector=>currentDialog.querySelector(selector).dispatchEvent(new Event('click'));
  try {
    assert.equal(owner._refreshEligible(),true,'HA off-screen non-modal dialogs must not disable navbar holds');
    nativeModal=true;assert.equal(owner._refreshEligible(),false,'Actual native modal dialogs retain input ownership');nativeModal=false;
    hold();assert.equal(overflow,'hidden');assert.equal(dialogs,1);assert.equal(refresh,0);assert.deepEqual(navigations,[]);
    assert.match(currentDialog.innerHTML,/Manutenção/);assert.match(currentDialog.innerHTML,/Editar painel/);
    hold();assert.equal(dialogs,1,'Repeated holds do not stack menus');
    const staleRefresh=currentDialog.querySelector('[data-refresh]');
    click('[data-refresh]');staleRefresh.dispatchEvent(new Event('click'));
    assert.equal(refresh,1,'Owned sheet closes before one guarded refresh');assert.equal(owner._maintenance,null);
    await Promise.resolve();assert.equal(focus,1);assert.equal(overflow,'scroll','Previous scroll style is restored');
    hold();click('[data-edit]');assert.deepEqual(navigations,['/casa/marao-editor-editor']);
    hold();const staleEdit=currentDialog.querySelector('[data-edit]');owner._hass={user:{id:'regular',is_admin:false}};
    staleEdit.dispatchEvent(new Event('click'));assert.equal(navigations.length,1);assert.equal(owner._maintenance,null);
    hold();assert.equal(refresh,2);assert.equal(owner._maintenance,null,'Regular users refresh without a menu');
    owner._hass={user:{id:'admin',is_admin:true}};
    for (const invalidate of [()=>{owner._hass.user={id:'different-admin',is_admin:true};},
      ()=>{window.location.href+='?changed';},()=>{owner._config.editor_path='another-editor';},
      ()=>{owner._preview=true;},()=>{root.lovelace.editMode=true;},()=>{owner.isConnected=false;},
      ()=>{otherModal=true;},()=>{owner._navigationRecord={released:true};},()=>{currentView={};},
      ()=>{owner._navigationRecord={host:{}};},()=>{owner._surface={};}]) {
      owner._hass.user={id:'admin',is_admin:true};owner._preview=false;root.lovelace.editMode=false;owner.isConnected=true;otherModal=false;delete owner._navigationRecord;delete owner._surface;currentView=null;
      hold();assert.ok(owner._maintenance);invalidate();doc.dispatchEvent(new Event('focusin'));
      assert.equal(owner._maintenance,null,'Context loss dismisses owned resources');
      currentDialog.querySelector('[data-refresh]').dispatchEvent(new Event('click'));assert.equal(refresh,2);
    }
    delete owner._navigationRecord;delete owner._surface;currentView=null;otherModal=false;delete owner._config.editor_path;
    hold();assert.equal(currentDialog.querySelector('[data-edit]'),null,'No guessed editor URL');
    const cancel=new Event('cancel',{cancelable:true});currentDialog.dispatchEvent(cancel);
    assert.equal(cancel.defaultPrevented,true);assert.equal(owner._maintenance,null);assert.equal(refresh,2);
    hold();const staleClose=currentDialog.querySelector('.close');click('.close');assert.equal(owner._maintenance,null);assert.equal(refresh,2);
    hold();staleClose.dispatchEvent(new Event('click'));assert.ok(owner._maintenance,'Old dismissal cannot close a newer menu');
    owner._closeMaintenance(false);
    otherModal=true;hold();assert.equal(owner._maintenance,null,'Other modal ownership blocks opening');
    assert.equal(navigationLocalize('navigation.maintenance.hold','en'),'Hold to open maintenance');
    assert.match(navigationLocalize('navigation.maintenance.hold','pt'),/manutenção/);
  } finally {globalThis.document=previous.document;globalThis.window=previous.window;}
});

test('main-page actions remain eligible without visible navbar routes but retain modal and preview guards',async()=>{
  const {MaraoNavbarCard}=await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js');
  const previous=globalThis.document;let modal=false;
  globalThis.document={querySelectorAll:selector=>selector==='*'?[]:modal?[{localName:'dialog',matches:()=>true}]:[]};
  const owner={isConnected:true,_root:()=>null,getClientRects:()=>[],getRootNode:()=>({})};
  const row={getClientRects:()=>[{}],getRootNode:()=>({})};
  const eligible=target=>MaraoNavbarCard.prototype._refreshEligible.call(owner,undefined,target);
  try{
    assert.equal(eligible(),false);assert.equal(eligible(row),true);
    row.inert=true;assert.equal(eligible(row),false);row.inert=false;
    owner.preview=true;assert.equal(eligible(row),false);owner.preview=false;
    modal=true;assert.equal(eligible(row),false);
    const card={_closeOverflow(){},_closeMaintenance(){},_render(){}};
    assert.throws(()=>MaraoNavbarCard.prototype.setConfig.call(card,{routes:[],show_editor_button:'false'}),/boolean/);
  }finally{globalThis.document=previous;}
});
