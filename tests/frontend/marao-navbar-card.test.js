import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const cardsSource = (await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoCards.js", import.meta.url), "utf8")).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url).href));
const source = (await fs.readFile(new URL("../../custom_components/marao_dashboard/frontend/MaraoNavigation.js", import.meta.url), "utf8")).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js', import.meta.url).href));

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
  assert.match(source, /max\(4px, calc\(\$\{safeArea\("bottom"\)\} - 20px\)\)/);
  assert.match(cardsSource, /padding:max\(50px, \$\{safeArea\("top"\)\}\) \$\{safeArea\("right"\)\} 0 \$\{safeArea\("left"\)\}/);
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
  assert.doesNotMatch(source.slice(source.indexOf('export class MaraoNavbarCard'),source.indexOf('const fullscreenUsers')), /flex-wrap:wrap/);
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
  };
  let timers = 0;
  const functions = new Function("window", "getComputedStyle", "setInterval", "clearInterval", "safeArea", "navbarMainPage",
    source.slice(source.indexOf("const fullscreenUsers"), source.indexOf("export function registerNavigation")).replaceAll("export ", "")
    + ";return {registerFullscreen,unregisterFullscreen,applyFullscreen};")(window,
      node => ({ bottom: `${navBottom}px`, getPropertyValue: property => node.style?.getPropertyValue(property) || "0px" }),
      () => { timers++; return 1; }, () => { timers--; }, side => `var(--safe-${side})`, navbarMainPage);
  functions.registerFullscreen(first);
  assert.equal(view.style.getPropertyValue("flex-direction"), "column", "The main-page refresh row sits above the full-width view");
  assert.equal(header.style.getPropertyValue("display"), "none");
  assert.equal(view.style.getPropertyValue("padding-top"), "max(8px, var(--safe-top))");
  assert.equal(view.style.getPropertyValue("padding-bottom"), "max(13px, calc(calc(60px + var(--safe-bottom) + 12px) + 8px))");
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
  assert.equal(timers, 1);
  window.innerHeight = 844; navRect = {top: 740, height: 80};
  functions.applyFullscreen();
  assert.equal(view.style.getPropertyValue("padding-bottom"), "max(13px, calc(104px + 8px))");
  const stableBottom = view.style.getPropertyValue("padding-bottom");
  window.visualViewport = {offsetTop: 12, height: 800};
  functions.applyFullscreen();
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
  const native = navbar(); native.nativeHost = true; native._config.native = true;
  functions.registerFullscreen(native);
  assert.equal(header.style.getPropertyValue("display"), "flex", 'Individual native navbar changed an ordinary HA shell');
  assert.ok(currentView.style.getPropertyValue('padding-bottom').includes('60px'), 'Floating standalone navbar covers the last controls');
  assert.equal(currentView.style.getPropertyValue('padding-top'), '', 'Standalone navbar changed the ordinary toolbar spacing');
  root.lovelace = { config: { marao: { mode: 'native', version: 1 } }, editMode: false };
  functions.applyFullscreen();
  assert.equal(header.style.getPropertyValue("display"), "none");
  delete root.lovelace.config.marao; functions.applyFullscreen();
  assert.equal(header.style.getPropertyValue("display"), "flex");
  assert.equal(currentView.style.getPropertyValue('padding-top'), '', 'Native top spacing leaked after ownership changed');
  root.lovelace.config.marao = { mode: 'native', version: 1 }; functions.applyFullscreen();
  root.lovelace.editMode = true; functions.applyFullscreen();
  assert.equal(header.style.getPropertyValue("display"), "flex", 'HA toolbar was not restored during native editing');
  root.lovelace.editMode = false; native.preview = true; functions.applyFullscreen();
  assert.equal(header.style.getPropertyValue("display"), "flex", 'Native preview activated fullscreen');
  functions.unregisterFullscreen(native);
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
  const card = { _closeOverflow() {}, _render() {} };
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


test('main-page cache recovery belongs to scrollable page flow and cleans up on navigation', async () => {
  const { MaraoNavbarCard } = await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js');
  const originalDocument=globalThis.document,originalWindow=globalThis.window;
  const view=()=>({children:[],prepend(row){row.remove();this.children.unshift(row);row.parentNode=this;}});
  let currentView=view(), calls=0, eligible=true, inert=false;
  globalThis.window={location:{href:'http://disposable.test/marao-dashboard/home',pathname:'/marao-dashboard/home'}};
  globalThis.document={createElement(){
    const button=new EventTarget();button.setAttribute=(name,value)=>{button[name]=value;};
    return {setAttribute(){},closest(){return inert?{}:null;},
      attachShadow(){return this.shadowRoot={innerHTML:'',querySelector:()=>button};},
      remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(item=>item!==this);this.parentNode=null;}};
  }};
  const lovelace={config:{views:[{path:'home'},{path:'energy'}]}};
  const owner={isConnected:true,_root:()=>({lovelace}),_view:()=>currentView,_refreshEligible:()=>eligible,_refreshFrontend:()=>{calls++;}};
  const sync=()=>MaraoNavbarCard.prototype._syncPageRefresh.call(owner);
  try{
    sync();const row=owner._pageRefresh,button=row.shadowRoot.querySelector('button');
    assert.equal(currentView.children[0],row);
    assert.doesNotMatch(row.shadowRoot.innerHTML,/position:(?:fixed|sticky|absolute)/);
    sync();assert.equal(currentView.children.length,1);
    button.dispatchEvent(new Event('click'));assert.equal(calls,1);
    eligible=false;button.dispatchEvent(new Event('click'));assert.equal(calls,1);
    eligible=true;inert=true;button.dispatchEvent(new Event('click'));assert.equal(calls,1);inert=false;
    globalThis.window.location.pathname='/marao-dashboard/energy';sync();assert.equal(currentView.children.length,0);
    globalThis.window.location.pathname='/marao-dashboard/home';sync();assert.equal(currentView.children[0],row);
    currentView=view();sync();assert.equal(currentView.children[0],row);
    lovelace.editMode=true;sync();assert.equal(currentView.children.length,0);lovelace.editMode=false;
    owner._surface={};sync();assert.equal(currentView.children.length,0,'A retained navbar placeholder cannot add a duplicate page button');delete owner._surface;
    sync();owner.isConnected=false;sync();assert.equal(currentView.children.length,0);
  }finally{globalThis.document=originalDocument;globalThis.window=originalWindow;}
});
