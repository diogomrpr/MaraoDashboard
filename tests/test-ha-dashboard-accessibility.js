const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const { chromium } = require("playwright");
const deviceDescriptors = require("./mobile-devices");
const { accessToken, setBrowserToken, assertCurrentFrontend, assertDisposableHaTarget, readConfig } = require("../ha-test/client");
const { prepare } = require("../ha-test/prepare");
const { scrollDashboard, titleLayoutIssues } = require("./test-ha-dashboard-e2e");

const repoRoot = path.resolve(__dirname, "..");
const themePath = path.join(
  repoRoot,
  "custom_components/marao_dashboard/frontend/themes/MaraoDashboard/marao-dashboard.yaml",
);
const themes = ["light", "dark"];
const reviewProfiles = ["iphone-normal", "android-page-zoom-200"];
const scenarios = [
  { name: "iphone-normal", device: "iphone", viewport: { width: 390, height: 844 }, textScale: 1, bold: false, pageZoom: 1 },
  { name: "iphone-bold", device: "iphone", viewport: { width: 390, height: 844 }, textScale: 1, bold: true, pageZoom: 1 },
  { name: "iphone-text-200", device: "iphone", viewport: { width: 390, height: 844 }, textScale: 2, bold: false, pageZoom: 1 },
  { name: "iphone-page-zoom-200", device: "iphone", viewport: { width: 390, height: 844 }, textScale: 1, bold: false, pageZoom: 2 },
  { name: "iphone-bold-text-200", device: "iphone", viewport: { width: 390, height: 844 }, textScale: 2, bold: true, pageZoom: 1 },
  { name: "android-normal", device: "android", viewport: { width: 360, height: 800 }, textScale: 1, bold: false, pageZoom: 1 },
  { name: "android-bold", device: "android", viewport: { width: 360, height: 800 }, textScale: 1, bold: true, pageZoom: 1 },
  { name: "android-text-200", device: "android", viewport: { width: 360, height: 800 }, textScale: 2, bold: false, pageZoom: 1 },
  { name: "android-page-zoom-200", device: "android", viewport: { width: 360, height: 800 }, textScale: 1, bold: false, pageZoom: 2 },
  { name: "android-bold-text-200", device: "android", viewport: { width: 360, height: 800 }, textScale: 2, bold: true, pageZoom: 1 },
  { name: "narrow-320", device: "android", viewport: { width: 320, height: 700 }, textScale: 1, bold: false, pageZoom: 1 },
  { name: "iphone-landscape", device: "iphone", viewport: { width: 844, height: 390 }, textScale: 1, bold: false, pageZoom: 1 },
  { name: "android-landscape", device: "android", viewport: { width: 800, height: 360 }, textScale: 1, bold: false, pageZoom: 1 },
];

// Extra widths are opt-in for affected grid checks, not additions to every matrix.
const featureScenarios = [
  { name: 'android-384', device: 'android', viewport: { width: 384, height: 832 }, textScale: 1, bold: false, pageZoom: 1 },
  { name: 'android-384-bold', device: 'android', viewport: { width: 384, height: 832 }, textScale: 1, bold: true, pageZoom: 1 },
];

function argumentValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function parseArgs(argv = process.argv.slice(2)) {
  const screenshots = argumentValue(argv, '--screenshots') || 'failure';
  if (!['failure', 'review', 'all'].includes(screenshots)) throw new Error('Unknown screenshot policy.');
  return {
    preview: argv.includes("--preview"),
    scenario: argumentValue(argv, "--scenario"),
    focused: argv.includes('--focused'),
    families: (argumentValue(argv, '--families') || '').split(',').filter(Boolean),
    popups: argv.includes('--popups'),
    parallel: argv.includes('--parallel'),
    theme: argumentValue(argv, "--theme"),
    ...(argv.includes('--safe-area') ? { safeArea: true } : {}),
    ...(argv.includes('--pages') ? { pages: true } : {}),
    ...(argv.includes('--pages-only') ? { pages: true, pagesOnly: true } : {}),
    ...(argv.includes('--geometry-only-popups') ? { geometryOnlyPopups: true } : {}),
    ...(argumentValue(argv, '--popup-hash') ? { popupHash: argumentValue(argv, '--popup-hash') } : {}),
    screenshots,
  };
}

function capturePolicy(options, scenario) {
  return options.screenshots === 'review' && !reviewProfiles.includes(scenario.name) ? 'failure' : options.screenshots;
}

function popupReviewKey(config) {
  const templates = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (value.template || value.type) templates.add(value.template || value.type);
    Object.values(value).forEach(visit);
  };
  visit(config.cards);
  const name = config.name || config.title || '';
  return JSON.stringify([config.height, config.entity_group?.domain || config.entity_group?.type, config.entity_group?.popup_filter,
    [...templates].sort(), name.match(/empty|error|unavailable|loading|retry/i)?.[0]?.toLowerCase()]);
}

async function captureRepresentativeCards(page, prefix) {
  const cards = page.locator('marao-card,marao-energy-period-card,marao-state-timeline-card,marao-camera-events-card,marao-frigate-events-card');
  const selected = await cards.evaluateAll(elements => {
    const seen = new Set();
    return elements.flatMap((element, index) => {
      const key = [element._config?.template || element.localName, element.getBoundingClientRect().width < 120,
        String(element._config?.name || '').length > 35,
        Boolean(element.shadowRoot?.querySelector('.problem,[role="status"]'))].join(':');
      if (seen.has(key)) return [];
      seen.add(key); return [index];
    });
  });
  for (const index of selected) {
    await cards.nth(index).evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: `${prefix}-representative-${index}.png`, scale: 'css' });
  }
}

const insetSides = ['top', 'right', 'bottom', 'left'];
const safeAreaCases = [
  { name: 'app-only', app: { top: 47, bottom: 34 }, browser: {} },
  { name: 'different-app-browser', app: { top: 59, bottom: 34 }, browser: { top: 47, bottom: 21 } },
  { name: 'browser-only', browser: { top: 47, bottom: 34 } },
  { name: 'explicit-zero', app: {}, browser: { top: 47, bottom: 34 } },
  { name: 'host-padded', app: { top: 47, bottom: 34 }, browser: {}, hostTop: 47 },
  { name: 'rotation', app: { left: 47, right: 47, bottom: 21 }, browser: { top: 59 }, viewport: { width: 844, height: 390 } },
  { name: 'portrait-again', app: { top: 59, bottom: 34 }, browser: {}, viewport: { width: 390, height: 844 } },
];

async function applySafeAreaSource(context, page, source) {
  if(source.viewport)await page.setViewportSize(source.viewport);
  const session = await context.newCDPSession(page);
  const insets = Object.fromEntries(insetSides.flatMap(side => [[side, source.browser[side] || 0], [side + 'Max', source.browser[side] || 0]]));
  await session.send('Emulation.setSafeAreaInsetsOverride', { insets });
  await session.detach();
  await page.evaluate(({ sides, app, hostTop }) => {
    const visit = root => { for(const element of root?.children || []) {
      for(const side of sides) element.style.removeProperty('--marao-safe-area-inset-' + side);
      visit(element.shadowRoot); visit(element);
    }}; visit(document);
    for(const side of sides) {
      const property = '--app-safe-area-inset-' + side;
      if(app === undefined) document.documentElement.style.removeProperty(property);
      else document.documentElement.style.setProperty(property, (app[side] || 0) + 'px');
    }
    const navbar = document.querySelector('home-assistant');
    const findView = root => {
      if(!root) return null;
      const view = root.querySelector?.('hui-view-container#view');
      if(view) return view;
      for(const e of root.querySelectorAll?.('*') || []) { const found = findView(e.shadowRoot); if(found)return found; }
      return null;
    };
    const view = findView(navbar.shadowRoot);
    if(!view) throw new Error('Missing active dashboard container');
    view.style.marginTop = hostTop ? hostTop + 'px' : '';
    if(hostTop) view.style.setProperty('--safe-area-inset-top', '0px');
    else view.style.removeProperty('--safe-area-inset-top');
  }, { sides: insetSides, app: source.app, hostTop: source.hostTop });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function safeAreaGeometry(page, source) {
  const expected = source.app || source.browser;
  return page.evaluate(({ expected, hostTop }) => {
    const issues = [];
    const card = (()=>{ const find=root=>{if(!root)return;const c=root.querySelector?.('marao-card');if(c)return c;for(const e of root.querySelectorAll?.('*')||[]){const c=find(e.shadowRoot);if(c)return c;}};return find(document);})();
    if(!card) return { issues: ['Missing first card'] };
    const ancestors=[];for(let e=card;e;e=e.parentElement||e.getRootNode()?.host)ancestors.push(e);
    const view=ancestors.find(e=>e.id==='view');const bounds=card.getBoundingClientRect();
    const padding=parseFloat(getComputedStyle(view).paddingTop);
    const top=expected.top||0;
    if(bounds.top<top-1)issues.push('First content overlaps the safe top edge');
    if(Math.abs(padding-(hostTop?0:top))>1)issues.push('Active container does not match selected clearance');
    if(hostTop && padding>1)issues.push('Already-safe host has duplicate top clearance');
    if(bounds.left<(expected.left||0)-1||bounds.right>innerWidth-(expected.right||0)+1)issues.push('First content overlaps a safe side edge');
    const navbar=ancestors.find(e=>e.localName==='hui-view')?.querySelector('marao-navbar-card:not([data-marao-navbar-placeholder])');
    const findNav=root=>{if(!root)return;const n=root.querySelector?.('marao-navbar-card:not([data-marao-navbar-placeholder])');if(n)return n;for(const e of root.querySelectorAll?.('*')||[]){const n=findNav(e.shadowRoot);if(n)return n;}};
    const nav=(navbar||findNav(document))?.shadowRoot.querySelector('nav')?.getBoundingClientRect();
    if(nav && (nav.left<(expected.left||0)-1||nav.right>innerWidth-(expected.right||0)+1))issues.push('Navbar overlaps a safe side edge');
    const navBottom=/iPhone|iPod/.test(navigator.userAgent)?Math.max(4,(expected.bottom||0)-20):12;
    if(nav && Math.abs(innerHeight-nav.bottom-navBottom)>1)issues.push('Navbar ignores the selected bottom inset');
    if(nav && [...(navbar||findNav(document)).shadowRoot.querySelectorAll('.nav a,.nav button')].some(a=>{const r=a.getBoundingClientRect();return r.width<48||r.height<48||r.left<nav.left||r.right>nav.right||r.top<nav.top||r.bottom>nav.bottom;}))issues.push('Navbar touch target is too small or outside its bar');
    return {issues, first:bounds.toJSON(), padding, nav:nav?.toJSON(), top: view.getBoundingClientRect().top,
      ownerStyles: [...(ancestors.find(e=>e.localName==='hui-root')?.shadowRoot?.adoptedStyleSheets||[])].flatMap(s=>[...s.cssRules].map(r=>r.cssText)).filter(s=>/padding|header-height|#view/.test(s)),
      ancestors:ancestors.map(e=>e.localName), resolved:getComputedStyle(view).getPropertyValue('--safe-area-inset-top')};
  }, { expected, hostTop: source.hostTop });
}

async function inspectSafeAreaSheets(context, page, output, runName) {
  const sources = [safeAreaCases[0], safeAreaCases.find(c => c.name === 'rotation'), safeAreaCases.at(-1)];
  for (const [hash, kind] of [['#marao-dashboard-card-test-popup', 'auto'], ['#marao-dashboard-test-value-sliders-popup', 'fixed'], ['#marao-dashboard-test-tall-controls-popup', 'tall']]) {
    await applySafeAreaSource(context, page, sources[0]);
    const trigger = page.locator('marao-card').filter({ has: page.locator('[data-card-action]') });
    const target = await trigger.evaluateAll((cards, hash) => cards.findIndex(c => c._config.variables?.popup_hash === hash || c._config.tap_action?.navigation_path === hash), hash);
    if (target < 0) throw new Error(`Missing safe sheet trigger: ${kind}`);
    const host = trigger.nth(target), control = host.locator('[data-card-action]');
    await control.scrollIntoViewIfNeeded(); await control.focus(); await control.tap({ position: { x: 12, y: 12 } });
    const sheet = page.locator('.marao-popup-sheet');
    await sheet.waitFor({ state: 'visible' });
    await sheet.evaluate(async e => { await Promise.all(e.getAnimations().map(a => a.finished)); });
    const original = await sheet.elementHandle();
    await page.locator('marao-popup-card').evaluateAll(cards => { window.__safeSheetOwner=cards.find(c=>c._open); });
    for (const source of sources) {
      await applySafeAreaSource(context, page, source);
      await sheet.evaluate(e => e.scrollTo({ top: 0, behavior: 'instant' }));
      const issues = await sheet.evaluate((e, { app, kind, original }) => {
        const issues = [], bounds = e.getBoundingClientRect(), close = e.querySelector('.marao-popup-close').getBoundingClientRect();
        if(e !== original) issues.push(`Rotation replaced the open sheet (original connected: ${original.isConnected}; original owner connected: ${window.__safeSheetOwner.isConnected}; owner open: ${window.__safeSheetOwner._open})`);
        if(bounds.top < (app.top || 0)-1 || bounds.left < (app.left || 0)-1 || bounds.right > innerWidth-(app.right || 0)+1)issues.push('Sheet overlaps a safe edge');
        if(close.width < 48 || close.height < 48 || close.top < bounds.top || close.right > bounds.right)issues.push('Close control is not contained');
        if(kind === 'tall' && Math.abs(bounds.top-Math.max(50,app.top || 0))>1)issues.push('Tall sheet does not use available height');
        if(kind === 'fixed' && Math.abs(bounds.height-innerHeight/2)>1)issues.push('Fixed sheet lost its configured height');
        if(kind === 'auto' && getComputedStyle(e).paddingTop !== '0px')issues.push('Short sheet acquired duplicate top padding');
        const column=window.__safeSheetOwner._viewOwner?.view.shadowRoot.querySelector('#columns > div:first-child');
        const width=column?.getBoundingClientRect().width;
        if(width>0 && Math.abs(bounds.width-Math.min(Math.round(width),innerWidth-(app.left||0)-(app.right||0)))>1)issues.push('Sheet did not retain the current column width');
        if(![...e.getRootNode().children].filter(c=>c!==e.parentElement).every(c=>c.inert))issues.push('Background is not inert');
        return issues;
      }, { app: source.app, kind, original });
      await page.screenshot({path:path.join(output,`${runName}-safe-sheet-${kind}-${source.name}.png`),scale:'css'});
      if(issues.length)throw new Error(`${kind} ${source.name}: ${issues.join('; ')}`);
      const background = await page.evaluate(() => scrollY);
      await sheet.evaluate(e => e.scrollTo({ top: e.scrollHeight, behavior: 'instant' }));
      if(await page.evaluate(() => scrollY) !== background)throw new Error('Sheet scrolling moved the background');
      await page.locator('.marao-popup-close').click({ trial: true });
    }
    await page.locator('.marao-popup-close').click(); await sheet.waitFor({state:'detached'});
    await page.waitForFunction(({host})=>host.shadowRoot.activeElement===host.shadowRoot.querySelector('[data-card-action]'),{host:await host.elementHandle()});
  }
}

async function inspectFullscreenLifecycle(page) {
  const editorRequests = new Set();
  const started = request => { if (/MaraoDashboard(?:Json|EditorWorker)/.test(new URL(request.url()).pathname)) editorRequests.add(request); };
  const finished = request => editorRequests.delete(request);
  page.on('request', started); page.on('requestfinished', finished); page.on('requestfailed', finished);
  try {
  for (const route of ['/config/dashboard', '/marao-dashboard-editor']) {
    await page.locator('marao-navbar-card:not([data-marao-navbar-placeholder])').evaluate(navbar => {
      let root=navbar;while(root&&root.localName!=='hui-root')root=root.parentElement||root.getRootNode()?.host;
      window.__safeOwned={view:root.shadowRoot.querySelector('#view'),header:root.shadowRoot.querySelector('.header')};
    });
    await page.evaluate(route => {history.pushState(null,'',route);window.dispatchEvent(new CustomEvent('location-changed'));},route);
    const native = page.locator(route === '/marao-dashboard-editor' ? 'marao-dashboard-panel' : 'ha-config-dashboard');
    await native.waitFor({state:'visible'});
    if(route === '/marao-dashboard-editor') await page.waitForFunction(panel => panel._loaded && panel._visualReady && panel._monaco && !panel._jsonPreparing, await native.elementHandle());
    else {
      const count = await native.evaluate(async panel=>(await panel.hass.callWS({type:'repairs/list_issues'})).issues.filter(issue=>!issue.ignored).length);
      await page.waitForFunction(({panel,count})=>panel._repairsIssues.total===count,{panel:await native.elementHandle(),count});
    }
    await native.evaluate(async root => {
      const visit = async element => {
        await element.updateComplete;
        if(element.localName === 'img' && element.src) {
          if(!element.complete) await new Promise((resolve,reject)=>{
            element.addEventListener('load',resolve,{once:true});
            element.addEventListener('error',()=>reject(new Error('Native route image failed')),{once:true});
          });
          if(!element.naturalWidth)throw new Error('Native route image is empty');
        }
        await Promise.all([...element.children,...(element.shadowRoot?.children||[])].map(visit));
      };
      await visit(root);
    });
    // Native settings resolve integration icons after their first Lit render.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => {
      const {view,header}=window.__safeOwned;
      return !view.style.getPropertyValue('padding-top') && !header.style.getPropertyValue('display');
    });
    const deadline = Date.now() + 15000;
    while (editorRequests.size && Date.now() < deadline) await page.waitForTimeout(50);
    if (editorRequests.size) throw new Error('Editor asset requests did not finish before route disposal');
    await page.evaluate(() => {history.pushState(null,'','/marao-dashboard/card-test');window.dispatchEvent(new CustomEvent('location-changed'));});
    await page.locator('marao-navbar-card:not([data-marao-navbar-placeholder])').waitFor({state:'visible'});
    await page.waitForFunction(() => {
      const find=root=>{if(!root)return;const nav=root.querySelector?.('marao-navbar-card:not([data-marao-navbar-placeholder])');if(nav)return nav;for(const e of root.querySelectorAll?.('*')||[]){const nav=find(e.shadowRoot);if(nav)return nav;}};
      let root=find(document);while(root&&root.localName!=='hui-root')root=root.parentElement||root.getRootNode()?.host;
      return root?.shadowRoot.querySelector('.header')?.style.display==='none';
    });
  }
  } finally {
    page.off('request', started); page.off('requestfinished', finished); page.off('requestfailed', finished);
  }
}

function selectedRuns(options) {
  const selectedScenarios = options.scenario
    ? [...scenarios, ...featureScenarios].filter(({ name }) => name === options.scenario)
    : options.safeArea
      ? scenarios.filter(({ name }) => name === "iphone-normal")
    : options.preview
      ? scenarios.filter(({ name }) => name === "iphone-bold-text-200")
      : scenarios;
  if (!selectedScenarios.length) {
    throw new Error(`Unknown accessibility profile "${options.scenario}". Choose one of: ${scenarios.map(({ name }) => name).join(", ")}`);
  }
  if (options.theme && !themes.includes(options.theme)) {
    throw new Error(`Unknown theme "${options.theme}". Choose one of: ${themes.join(", ")}`);
  }
  const selectedThemes = options.theme ? [options.theme] : options.preview ? ["light"] : themes;
  return selectedScenarios.flatMap((scenario) => selectedThemes.map((theme) => ({ scenario, theme })));
}

function effectiveViewport(scenario) {
  const zoom = scenario.pageZoom || 1;
  return {
    width: Math.round(scenario.viewport.width / zoom),
    height: Math.round(scenario.viewport.height / zoom),
  };
}

function contextOptionsForScenario(scenario, theme = "light") {
  const descriptor = deviceDescriptors[scenario.device];
  if (!descriptor) throw new Error(`Unknown device family "${scenario.device}".`);
  return {
    viewport: effectiveViewport(scenario),
    screen: scenario.viewport,
    userAgent: descriptor.userAgent,
    deviceScaleFactor: descriptor.deviceScaleFactor * (scenario.pageZoom || 1),
    isMobile: descriptor.isMobile,
    hasTouch: descriptor.hasTouch,
    colorScheme: theme,
  };
}

function safeAreaInsetsForScenario(scenario) {
  if (scenario.device !== "iphone") {
    return { top: 0, topMax: 0, right: 0, rightMax: 0, bottom: 0, bottomMax: 0, left: 0, leftMax: 0 };
  }
  const landscape = scenario.viewport.width > scenario.viewport.height;
  const values = landscape
    ? { top: 0, right: 47, bottom: 21, left: 47 }
    : { top: 47, right: 0, bottom: 34, left: 0 };
  return {
    ...values,
    topMax: values.top,
    rightMax: values.right,
    bottomMax: values.bottom,
    leftMax: values.left,
  };
}

const pageEmulationSessions = new WeakMap();

function emulationEngine(context, scenario) {
  const engine = context.browser?.()?.browserType().name() || 'chromium';
  if (engine === 'webkit') assert.ok(scenario.name === 'iphone-normal' && scenario.textScale === 1 && scenario.pageZoom === 1 && !scenario.bold,
    'WebKit playback verification supports only iphone-normal at 1x text/zoom; scaled typography, bold and browser-inset emulation require Chromium');
  else assert.equal(engine, 'chromium', 'Unsupported browser emulation engine');
  return engine;
}

async function emulationSession(context, page) {
  let session = pageEmulationSessions.get(page);
  if (!session) {
    session = await context.newCDPSession(page);
    pageEmulationSessions.set(page, session);
  }
  return session;
}

async function configurePageEmulation(context, page, scenario, insets = safeAreaInsetsForScenario(scenario)) {
  const engine = emulationEngine(context, scenario);
  if (engine === 'webkit') assert.ok(arguments.length < 4 || arguments[3] === undefined, 'WebKit browser-inset overrides are unsupported');
  page.__maraoEmulationEvidence = engine === 'webkit'
    ? { engine, scope: 'Normal WebKit playback; not actual Safari or iPhone hardware', touch: 'native browser-context hasTouch', textScale: 1, pageZoom: 1, osTextScaleOverride: false, browserInsetOverride: false }
    : { engine, touch: 'CDP', osTextScaleOverride: true, browserInsetOverride: true };
  if (!page.__maraoVisitRecorder && page.on && process.env.MARAO_TEST_ARTIFACT_ROOT) {
    page.__maraoVisitRecorder = true;
    const visits = [], file = path.join(process.env.MARAO_TEST_ARTIFACT_ROOT, 'visits.json');
    page.on('framenavigated', frame => {
      if (frame !== page.mainFrame() || !frame.url().startsWith('http')) return;
      const url = new URL(frame.url());
      visits.push({ route: url.pathname, profile: scenario.name, engine, emulation: page.__maraoEmulationEvidence, at: new Date().toISOString() });
      require('./verification-reuse').atomicReport(file, visits);
    });
  }
  if (engine === 'webkit') return;
  const session = await emulationSession(context, page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await session.send("Emulation.setSafeAreaInsetsOverride", {
    insets,
  });
  await session.send("Emulation.setEmulatedOSTextScale", { scale: scenario.textScale });
}

let parsedTheme, parsedThemeMtime;
function themeVariables(mode) {
  if (!themes.includes(mode)) throw new Error(`Unknown Marao theme mode "${mode}".`);
  const mtime = fs.statSync(themePath).mtimeMs;
  if (!parsedTheme || parsedThemeMtime !== mtime) {
    const source = YAML.parse(fs.readFileSync(themePath, "utf8"));
    parsedTheme = source?.["Marao Dashboard"];
    parsedThemeMtime = mtime;
  }
  if (!parsedTheme?.modes?.[mode]) throw new Error(`Marao Dashboard theme has no ${mode} mode.`);
  const { modes, ...base } = parsedTheme;
  return Object.fromEntries(Object.entries({ ...base, ...modes[mode] })
    .filter(([, value]) => value !== null && typeof value !== "object")
    .map(([name, value]) => [name.startsWith("--") ? name : `--${name}`, String(value)]));
}

function visualVariablesForScenario(scenario, theme) {
  const variables = themeVariables(theme);
  for (const name of ["--font-size-primary", "--font-size-secondary", "--font-size-state", "--font-size-caption"]) {
    const match = variables[name]?.match(/^([\d.]+)(px|rem|em)$/);
    if (match) variables[name] = `${Number(match[1]) * scenario.textScale}${match[2]}`;
  }
  if (scenario.bold) {
    variables["--font-weight-primary"] = "800";
    variables["--font-weight-secondary"] = "700";
  }
  const insets = safeAreaInsetsForScenario(scenario);
  variables["--marao-safe-area-inset-top"] = `${insets.top}px`;
  variables["--marao-safe-area-inset-right"] = `${insets.right}px`;
  variables["--marao-safe-area-inset-bottom"] = `${insets.bottom}px`;
  variables["--marao-safe-area-inset-left"] = `${insets.left}px`;
  return variables;
}

async function applyVisualPreferences(page, scenario, theme, subtree) {
  const engine = emulationEngine(page.context(), scenario);
  if (!subtree) {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => {
      if (!document.querySelector?.('home-assistant')) return true;
      if (!customElements.get('marao-native-base-card')) return false;
      const pending = root => [...(root?.children || [])].some(element =>
        element.localName === 'hui-error-card' && /^Custom element doesn't exist: marao-/.test(element.config?.message || '')
        || pending(element.shadowRoot) || pending(element));
      return !pending(document.documentElement);
    }, undefined, { timeout: 20000 });
  }
  const variables = visualVariablesForScenario(scenario, theme);
  if (engine === 'webkit') for (const key of Object.keys(variables)) if (key.startsWith('--marao-safe-area-inset-')) delete variables[key];
  const apply = settle => page.evaluate(async ({ cssVariables, profile, mode, subtree, settle }) => {
    const version = JSON.stringify([profile, mode, cssVariables]);
    const apply = element => {
      if (!element.style) return;
      if (element === document.documentElement || element.localName === 'home-assistant'
        || element.localName?.startsWith('marao-') || element.classList?.contains('marao-popup-overlay')) {
        for (const [name, value] of Object.entries(cssVariables)) element.style.setProperty(name, value, 'important');
      }
    };
    const visit = async element => {
      apply(element);
      if (settle) {
        await element.updateComplete; await element._ready;
        if (element.localName?.startsWith('marao-native-')) {
          const deadline = Date.now() + 10000;
          while (element._loading) {
            if (Date.now() > deadline) throw new Error('Native card compilation did not settle');
            await new Promise(requestAnimationFrame);
          }
        }
      }
      apply(element);
      await Promise.all([...element.children, ...(element.shadowRoot?.children || [])].map(visit));
    };
    document.documentElement.dataset.maraoAccessibilityProfile = profile;
    document.documentElement.dataset.maraoThemeMode = mode;
    await visit(subtree || document.documentElement);
    await document.fonts?.ready;
    return version;
  }, { cssVariables: variables, profile: scenario.name, mode: theme, subtree, settle });
  await apply(true);
  if (engine === 'chromium') {
    const session = await emulationSession(page.context(), page);
    await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  }
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(async ({ subtree }) => {
    const elements = [], animations = new Set();
    const visit = element => {
      elements.push(element);
      for (const animation of element.getAnimations?.() || []) {
        const timing = animation.effect?.getComputedTiming();
        if (Number.isFinite(timing?.endTime) && animation.playState !== 'finished') animations.add(animation);
      }
      for (const child of [...element.children, ...(element.shadowRoot?.children || [])]) visit(child);
    };
    visit(subtree || document.documentElement);
    await Promise.all([...animations].map(animation => animation.finished.catch(() => {})));
    const controls = elements.filter(element => element.matches?.('button,input,a[href],dialog,ha-dialog'));
    const snapshot = () => JSON.stringify(controls.map(element => {
      const box = element.getBoundingClientRect(); return [box.x, box.y, box.width, box.height];
    }));
    let previous = snapshot(), stable = 0;
    for (let frame = 0; frame < 60; frame++) {
      await new Promise(requestAnimationFrame);
      const current = snapshot(); stable = current === previous ? stable + 1 : 0; previous = current;
      if (stable >= 2) return;
    }
    throw new Error('Native control geometry did not settle');
  }, { subtree });
  // Native frame-scheduled children still need the selected typography before inspection.
  await apply(false);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function readySubtree(page, locator, scenario, theme) {
  await applyVisualPreferences(page, scenario, theme, await locator.elementHandle());
}

async function emulationIssues(page, scenario, theme) {
  const expectedViewport = effectiveViewport(scenario);
  const expectedInsets = safeAreaInsetsForScenario(scenario);
  const expectedCardBackground = themeVariables(theme)["--marao-card-background"];
  const expectedPrimaryFontSize = visualVariablesForScenario(scenario, theme)["--font-size-primary"];
  const minimumTitleSize = Math.min(parseFloat(expectedPrimaryFontSize), parseFloat(visualVariablesForScenario(scenario, theme)["--font-size-caption"]));
  return page.evaluate(({ device, viewport, insets, mode, cardBackground, primaryFontSize, minimumTitleSize, textScale }) => {
    const issues = [];
    const iphone = /iPhone|iPod/i.test(navigator.userAgent);
    const android = /Android/i.test(navigator.userAgent);
    if ((device === "iphone" && !iphone) || (device === "android" && !android)) {
      issues.push(`${device} user agent was not applied`);
    }
    if (navigator.maxTouchPoints < 1) issues.push("touch input was not enabled");
    if (Math.abs(innerWidth - viewport.width) > 1 || Math.abs(innerHeight - viewport.height) > 1) {
      issues.push(`layout viewport is ${innerWidth}x${innerHeight}; expected ${viewport.width}x${viewport.height}`);
    }
    if (!matchMedia(`(prefers-color-scheme: ${mode})`).matches) {
      issues.push(`${mode} color scheme was not applied`);
    }
    const actualBackground = getComputedStyle(document.documentElement).getPropertyValue("--marao-card-background").trim();
    if (actualBackground.toLowerCase() !== cardBackground.toLowerCase()) {
      issues.push(`${mode} Marao theme variables were not applied`);
    }
    const actualFontSize = getComputedStyle(document.documentElement).getPropertyValue("--font-size-primary").trim();
    if (actualFontSize !== primaryFontSize) issues.push(`text scale produced ${actualFontSize}; expected ${primaryFontSize}`);
    const visit = (root) => {
      for (const element of root?.children || []) {
        if (element.localName?.startsWith("marao-")) {
          const actual = getComputedStyle(element).getPropertyValue("--font-size-primary").trim();
          if (actual !== primaryFontSize) issues.push(`${element.localName} ${element._config?.name || ""}: text scale produced ${actual}; expected ${primaryFontSize}`);
          if (element.localName === "marao-card") {
            const title = element.shadowRoot?.querySelector(".title");
            const size = title && parseFloat(getComputedStyle(title).fontSize);
            if (size && size < minimumTitleSize - 0.5) issues.push(`${element._config?.name || "card"}: title is ${size}px; expected at least ${minimumTitleSize}px`);
            const readings = element.shadowRoot?.querySelector(".readings");
            const width = readings?.getBoundingClientRect().width;
            if (textScale === 2 && width > 0 && width <= 400 && getComputedStyle(readings).display === 'grid' && getComputedStyle(readings).gridTemplateColumns.trim().split(/\s+/).filter((track) => parseFloat(track) > 0.5).length > 1) issues.push(`${element._config?.name || element._config?.template}: detail readings did not reflow at 200% text`);
          }
        }
        visit(element.shadowRoot);
        visit(element);
      }
    };
    visit(document.documentElement);
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const actualInsets = {
      top: Math.round(parseFloat(style.paddingTop) || 0),
      right: Math.round(parseFloat(style.paddingRight) || 0),
      bottom: Math.round(parseFloat(style.paddingBottom) || 0),
      left: Math.round(parseFloat(style.paddingLeft) || 0),
    };
    probe.remove();
    for (const side of ["top", "right", "bottom", "left"]) {
      if (actualInsets[side] !== insets[side]) {
        issues.push(`${side} safe-area inset is ${actualInsets[side]}; expected ${insets[side]}`);
      }
    }
    return issues;
  }, {
    device: scenario.device,
    viewport: expectedViewport,
    insets: expectedInsets,
    mode: theme,
    cardBackground: expectedCardBackground,
    primaryFontSize: expectedPrimaryFontSize,
    minimumTitleSize,
    textScale: scenario.textScale,
  });
}

async function layoutIssues(page, families = [], subtree) {
  const issues = await page.evaluate(({ families, subtree }) => {
    const issues = [];
    const visible = element => getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0;
    const intersects = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgba = (color) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const luminance = (rgb) => rgb.slice(0, 3).reduce((total, channel, index) => {
      const value = channel / 255;
      return total + (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index];
    }, 0);
    const visit = (root, insideMarao = false) => {
      for (const element of root?.children || []) {
        if (families.length && element.localName?.startsWith('marao-') && element._config?.template
          && !families.includes(element._config.template) && element.localName !== 'marao-popup-card') continue;
        const owned = insideMarao
          || element.localName?.startsWith("marao-")
          || element.classList?.contains("marao-popup-overlay");
        if (element.localName === "hui-error-card" || element.localName === "hui-warning") {
          issues.push(`${element.localName}: ${element.config?.message || element.textContent?.trim() || "rendered without details"}`);
        }
        if (owned && visible(element) && element.matches?.('.message.error,.problem span,.reading.neutral dt,.reading.neutral dd,[data-problem]:not([data-problem="loading"]) .message,[data-problem]:not([data-problem="loading"]) .status,[data-problem]:not([data-problem="loading"]) .empty')) {
          let background;
          let opacity = 1;
          for (let ancestor = element; ancestor; ancestor = ancestor.parentElement || ancestor.getRootNode()?.host) {
            opacity *= Number(getComputedStyle(ancestor).opacity);
            const color = rgba(getComputedStyle(ancestor).backgroundColor);
            if (color[3] === 255) { background = color; break; }
          }
          if (!background) issues.push(`${element.textContent.trim()}: error background is not measurable`);
          else {
            const foreground = rgba(getComputedStyle(element).color), alpha = opacity * foreground[3] / 255;
            const visible = foreground.slice(0, 3).map((channel, index) => channel * alpha + background[index] * (1 - alpha));
            const values = [luminance(visible), luminance(background)].sort((a, b) => a - b);
            const ratio = (values[1] + 0.05) / (values[0] + 0.05);
            if (ratio < 4.5) issues.push(`${element.textContent.trim()}: error text contrast is ${ratio.toFixed(2)}:1; expected 4.5:1`);
          }
        }
        if (element.localName === "marao-card") {
          const body = element.shadowRoot?.querySelector(".body,.alarm-body");
          const card = element.shadowRoot?.querySelector("ha-card");
          if (body && body.scrollWidth > body.clientWidth + 1) issues.push(`${element._config?.name || element._config?.entity || "card"}: horizontal overflow`);
          const labels = [...(element.shadowRoot?.querySelectorAll(".title,.state,.climate") || [])].filter(visible);
          const controls = [...(element.shadowRoot?.querySelectorAll(".icon,.number-stepper") || [])];
          for (const label of labels) for (const control of controls) {
            if (intersects(label.getBoundingClientRect(), control.getBoundingClientRect())) issues.push(`${element._config?.name || element._config?.entity || "card"}: text overlaps control`);
          }
          if (card && card.scrollWidth > card.clientWidth + 1) issues.push(`${element._config?.name || element._config?.entity || "card"}: card content clipped`);
        }
        if (element.localName === "marao-navbar-card") {
          const nav = element.shadowRoot?.querySelector("nav")?.getBoundingClientRect();
          const links = [...(element.shadowRoot?.querySelectorAll(".nav a,.nav button") || [])].map((link) => link.getBoundingClientRect());
          if (nav && (nav.left < 0 || nav.right > innerWidth + 1)) issues.push("navbar extends outside the viewport");
          for (const [index, link] of links.entries()) {
            if (nav && (link.left < nav.left - 1 || link.right > nav.right + 1 || link.top < nav.top - 1 || link.bottom > nav.bottom + 1)) issues.push("navbar target extends outside its surface");
            if (links.slice(index + 1).some((other) => intersects(link, other))) issues.push("navbar touch targets overlap");
          }
        }
        if (owned && visible(element) && element.matches?.('[data-history-retry],[data-graph-retry],[data-media-retry],.surface > .problem[role="status"],[data-alarm-action],[data-alarm-code],.alarm-body label')) {
          const probe = document.createElement('span');
          probe.style.cssText = 'font-family:var(--primary-font-family);font-size:var(--font-size-secondary,1rem);font-weight:var(--font-weight-secondary,500)';
          element.parentElement.append(probe);
          const expected = getComputedStyle(probe), actual = getComputedStyle(element);
          if (actual.fontSize !== expected.fontSize || actual.fontWeight !== expected.fontWeight || actual.fontFamily !== expected.fontFamily) {
            issues.push(`${element.textContent.trim()}: status or Retry text does not follow shared scalable typography`);
          }
          probe.remove();
        }
        if (element.localName === "marao-slide-to-open") {
          const track = element.shadowRoot?.querySelector('.track');
          const label = element.shadowRoot?.querySelector('.label');
          const thumb = element.shadowRoot?.querySelector('.thumb');
          if (track && getComputedStyle(track).outlineStyle !== 'none') issues.push('access slide has a focus-only outline');
          if (label && thumb) {
            const range = document.createRange(); range.selectNodeContents(label);
            const lines = [...range.getClientRects()].filter(rect => rect.width && rect.height);
            const thumbBox = thumb.getBoundingClientRect(), trackBox = track.getBoundingClientRect();
            if (lines.some(rect => intersects(rect, thumbBox))) {
              issues.push(`${label.textContent.trim()}: access slide label overlaps its thumb`);
            }
            if (lines.length && !track.matches('.dragging,.completing')) {
              const top = Math.min(...lines.map(rect => rect.top)), bottom = Math.max(...lines.map(rect => rect.bottom));
              // Text glyph boxes can differ from their line box by a few pixels.
              if (Math.abs((top + bottom - thumbBox.top - thumbBox.bottom) / 2) > 4) issues.push(`${label.textContent.trim()}: access label is not centered beside its thumb`);
              if (lines.some(rect => rect.left < thumbBox.right + 1 || rect.right > trackBox.right - 1 || rect.top < trackBox.top || rect.bottom > trackBox.bottom)) issues.push(`${label.textContent.trim()}: access label is not contained to the right of its thumb`);
            }
          }
        }
        if (element.localName === "marao-state-timeline-card") {
          const labels = [...(element.shadowRoot?.querySelectorAll(".tick b,.legend span") || [])];
          const bounds = labels.map(label => {
            const range = document.createRange(); range.selectNodeContents(label);
            return [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
          });
          for (let index = 0; index < labels.length; index++) {
            if (bounds[index].some(rect => bounds.slice(index + 1).some(other => other.some(candidate => intersects(rect, candidate))))) {
              issues.push(`${labels[index].textContent}: timeline time or legend labels overlap`);
            }
          }
        }
        if (element.localName === "marao-energy-period-card") {
          const chart = element.shadowRoot?.querySelector(".chart")?.getBoundingClientRect();
          for (const label of element.shadowRoot?.querySelectorAll(".scale span") || []) {
            const range = document.createRange();
            range.selectNodeContents(label);
            for (const rect of range.getClientRects()) {
              if (chart && (rect.left < chart.left || rect.right > chart.right || rect.top < chart.top || rect.bottom > chart.bottom)) {
                issues.push(`${label.textContent}: energy chart scale is clipped`);
              }
            }
          }
        }
        if (owned && visible(element) && element.matches?.(".title,.state,.climate,.current-temperature,.number-value,.value,.empty,h1,h2,.message,.climate-mode,.legend span,.meta strong,.detail-meta strong,.reading dt,.reading dd,.header-date,.media-summary,.alarm-body label,[data-alarm-action]:not(:disabled)")) {
          const style = getComputedStyle(element);
          const secondary = element.matches('.state,.climate:not(.current-temperature),.reading dt,.reading dd');
          const ellipsis = secondary && style.overflow === 'hidden' && style.textOverflow === 'ellipsis';
          const clampedCaption = element.matches('.reading dt') && style.overflow === 'hidden' && style.webkitLineClamp === '2';
          if ((!ellipsis && !clampedCaption && element.scrollWidth > element.clientWidth + 1) || (!clampedCaption && element.scrollHeight > element.clientHeight + 1)) {
            issues.push(`${element.textContent?.trim() || element.localName}: essential text is clipped (${element.getRootNode()?.host?._config?.name || element.getRootNode()?.host?.localName}, ${element.className}, ${getComputedStyle(element).visibility}, ${element.clientWidth}x${element.clientHeight}, content ${element.scrollWidth}x${element.scrollHeight})`);
          }
          if (element.matches('.number-value')) {
            const track = element.closest('.number-stepper')?.getBoundingClientRect();
            const range = document.createRange(); range.selectNodeContents(element);
            for (const rect of range.getClientRects()) if (track && rect.width && rect.height
              && (rect.left < track.left - .5 || rect.right > track.right + .5 || rect.top < track.top - .5 || rect.bottom > track.bottom + .5)) {
              issues.push(`${element.textContent.trim()}: numeric value extends outside its rounded control`);
            }
          }
          if (/^[+-]?\d+(?:[.,]\d+)?$/.test(element.textContent?.trim() || "")) {
            const range = document.createRange();
            const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            const lines = new Set();
            while (text.nextNode()) {
              if (!text.currentNode.textContent.trim()) continue;
              range.selectNodeContents(text.currentNode);
              for (const rect of range.getClientRects()) if (rect.width && rect.height) lines.add(Math.round(rect.top));
            }
            if (lines.size > 1) issues.push(`${element.textContent.trim()}: numeric value is split across lines`);
          }
        }
        if (owned && visible(element) && element.matches?.(".climate-mode span") && /^[\p{L}]{1,4}$/u.test(element.textContent?.trim() || "")) {
          const range = document.createRange();
          range.selectNodeContents(element);
          const lines = new Set([...range.getClientRects()].filter((rect) => rect.width && rect.height).map((rect) => Math.round(rect.top)));
          if (lines.size > 1) issues.push(`${element.textContent.trim()}: short climate mode label is split across lines`);
        }
        if (owned && visible(element) && element.matches?.('button,a[href],input,[role="button"],[role="slider"]')) {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && (rect.width < 48 || rect.height < 48)) {
            const name = element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent?.trim() || element.localName;
            issues.push(`${name}: interactive target is ${rect.width}x${rect.height}; expected at least 48x48`);
          }
        }
        visit(element.shadowRoot, owned);
        visit(element, owned);
      }
    };
    visit(subtree ? { children: [subtree] } : document.documentElement);
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) issues.push("dashboard has horizontal overflow");
    const sheet = (document.querySelector("home-assistant")?.shadowRoot || document).querySelector(".marao-popup-sheet");
    if (sheet && sheet.scrollWidth > sheet.clientWidth + 1) issues.push("popup has horizontal overflow");
    return [...new Set(issues)];
  }, { families, subtree });
  return [...issues, ...await titleLayoutIssues(page, families, subtree)];
}

async function frontendRegistrationIssues(page) {
  return page.evaluate(async () => {
    const issues = [];
    const resources = performance.getEntriesByType("resource").map((entry) => entry.name);
    const legacy = resources.filter((url) => /\/hacsfiles\/MaraoDashboard\//i.test(url));
    for (const url of legacy) issues.push(`legacy Marao frontend resource loaded: ${url}`);
    for (const name of [
      "marao-card",
      "marao-navbar-card",
      "marao-popup-card",
      "marao-camera-events-card",
      "marao-slide-to-open",
      "marao-state-timeline-card",
    ]) {
      if (!globalThis.customElements?.get(name)) issues.push(`${name} was not registered`);
    }
    const eventModuleUrl = resources.find((url) => /\/(?:marao_dashboard_static|api\/marao_dashboard\/frontend\/[a-f0-9]+)\/MaraoFrigateEventsCard\.js(?:\?|$)/i.test(url));
    if (eventModuleUrl) {
      try {
        const module = await import(eventModuleUrl);
        if (globalThis.customElements?.get("marao-camera-events-card") !== module.MaraoCameraEventsCard) {
          issues.push("marao-camera-events-card was registered by a stale module");
        }
      } catch (error) {
        issues.push(`current camera event module could not be inspected: ${error?.message || error}`);
      }
    } else {
      issues.push("current Marao camera event module was not loaded");
    }
    return issues;
  });
}

function popupFocusFailure(card, selector) {
  const root = card.shadowRoot;
  const element = root?.querySelector(selector);
  if (card.isConnected && element?.isConnected && root.activeElement === element) return null;
  const describe = (node) => node && ({ tag: node.localName, label: node.getAttribute?.("aria-label"), connected: node.isConnected, inert: Boolean(node.inert), host: node.getRootNode()?.host?.localName });
  const active = [];
  for (let node = document.activeElement; node; node = node.shadowRoot?.activeElement) active.push(describe(node));
  const ancestors = [];
  for (let node = element; node; node = node.parentElement || node.getRootNode()?.host) ancestors.push(describe(node));
  return { expected: describe(element), rootConnected: root?.isConnected, host: describe(card), rootActive: describe(root?.activeElement), active, ancestors, hash: location.hash, overlays: (document.querySelector?.("home-assistant")?.shadowRoot || document).querySelectorAll(".marao-popup-overlay").length, trace: globalThis.__maraoFocusDiagnostics || [] };
}

function popupHasVisibleContent(host) {
  return [...host.children].some(child => {
    const rect = child.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && getComputedStyle(child).display !== 'none'
      && (child.textContent?.trim() || child.matches('img,svg'))) return true;
    return Boolean(child.shadowRoot && popupHasVisibleContent(child.shadowRoot) || popupHasVisibleContent(child));
  });
}

function popupMemberTouchPosition(card) {
  const button = card.shadowRoot.querySelector('[data-card-action]');
  const sheet = card.closest('.marao-popup-sheet');
  const box = button.getBoundingClientRect(), header = sheet.querySelector('.marao-popup-head').getBoundingClientRect();
  const top = Math.max(box.top, header.bottom, 0), bottom = Math.min(box.bottom, sheet.getBoundingClientRect().bottom, innerHeight);
  if (box.width < 48 || bottom - top < 48) throw new Error('Popup member has less than 48px of clear touch area.');
  const x = box.left + 24, y = top + 24;
  if (sheet.getRootNode().elementFromPoint(x, y) !== card || button.getRootNode().elementFromPoint(x, y) !== button) throw new Error('Popup member touch area is obstructed.');
  return { x: 24, y: y - box.top };
}

function popupTriggerTargets(cards) {
  return cards.map((card, index) => {
    const config = card._config || {};
    const modes = card._hass?.states?.[config.entity]?.attributes?.hvac_modes?.filter(Boolean) || [];
    const hash = config.tap_action ? config.tap_action.navigation_path
      : config.template === 'hc_climate_card' ? modes.length > 1 && config.variables?.mode_selector_hash
      : config.variables?.popup_hash || config.popup_hash;
    card.setAttribute('data-marao-popup-probe', String(index));
    return { index, tag: card.localName, hash };
  });
}

async function inspectPopups(page, scenario, theme, output, runName, captures = 'failure', families = [], behavior = true, checkedBehaviors = new Set(), popupHash) {
  const popups = await page.locator("marao-popup-card").evaluateAll((cards) => cards.map((card) => ({
    config: card._config,
    hash: card._config.hash, name: card._config.name || card._config.title || card._config.hash,
    heading: !card._config.entity_group && card._config.cards?.some((child) => child?.template === "hc_climate_card" && child.variables?.show_mode_buttons)
      ? "" : String(card._config.title ?? card._config.name ?? ""),
    directModeOnly: !card._config.entity_group && card._config.cards?.some(child => child.template === 'hc_climate_card' && child.variables?.show_mode_buttons)
      && card._config.cards.every(child => child.template === 'hc_climate_card' && (card._hass?.states?.[child.entity]?.attributes?.hvac_modes?.filter(Boolean).length || 0) <= 1),
    parentHash: cards.find(parent => parent._config.entity_group && parent._config.cards?.some(member =>
      [member.tap_action?.navigation_path, member.variables?.popup_hash, member.variables?.mode_selector_hash].includes(card._config.hash)
    ))?._config.hash,
  })));
  const triggers = page.locator("marao-card,marao-energy-period-card");
  const targets = await triggers.evaluateAll(popupTriggerTargets);
  const triggerCard = target => page.locator('[data-marao-popup-probe="' + target.index + '"]');
  const issues = [];
  const reviewed = new Set();
  if (popupHash && popups.filter(popup => popup.hash === popupHash).length !== 1) throw new Error('Selected popup is missing or duplicated');
  for (const [index, popup] of popups.entries()) {
    if (popupHash && popup.hash !== popupHash) continue;
    const containsFamily = value => value && typeof value === 'object' &&
      (families.includes(value.template) || Object.values(value).some(child => Array.isArray(child) ? child.some(containsFamily) : containsFamily(child)));
    if (families.length && !containsFamily(popup.config)) continue;
    const reviewKey = popupReviewKey(popup.config);
    const checkBehavior = behavior && !checkedBehaviors.has(reviewKey);
    const capture = captures === 'all' || (captures === 'review' && !reviewed.has(reviewKey));
    let target = targets.find(({ hash }) => hash === popup.hash);
    if (popup.directModeOnly) {
      if (target) throw new Error(`${popup.name}: single-mode climate control must not open a popup.`);
      continue;
    }
    let card = target && triggerCard(target);
    let returnCard = card;
    let viaParent = false;
    if (!target && popup.parentHash) {
      viaParent = true;
      const parent = targets.find(({ hash }) => hash === popup.parentHash);
      if (!parent) throw new Error(`Popup ${popup.name} has no parent group control.`);
      returnCard = triggerCard(parent);
      const parentControl = returnCard.locator('[data-card-action]');
      if (await parentControl.isDisabled()) continue;
      await parentControl.focus();
      await parentControl.tap({ position: { x: 12, y: 12 } });
      await page.locator('.marao-popup-sheet').waitFor({ state: 'visible' });
      await page.waitForFunction(hash => {
        const visit = root => {
          for (const node of root?.querySelectorAll?.('*') || []) {
            if (node.localName === 'marao-popup-card' && node._config.hash === hash) return Boolean(node._groupHelpers);
            const found = node.shadowRoot && visit(node.shadowRoot); if (found) return true;
          }
          return false;
        };
        return visit(document);
      }, popup.parentHash);
      const members = page.locator('.marao-popup-sheet marao-card');
      const selected = await members.evaluateAll((cards, hash) => cards.findIndex(card =>
        [card._config.tap_action?.navigation_path, card._config.variables?.popup_hash, card._config.variables?.mode_selector_hash].includes(hash)
      ), popup.hash);
      if (selected < 0) {
        const inactive = await page.locator('marao-popup-card').evaluateAll((cards, hashes) => {
          const parent = cards.find(card => card._config.hash === hashes.parent);
          const member = parent._config.cards.find(card => [card.variables?.popup_hash, card.variables?.mode_selector_hash].includes(hashes.child));
          const state = parent._hass.states[member.entity]?.state || 'unknown';
          return parent._config.entity_group.popup_filter === 'active'
            && (member.entity.startsWith('climate.') ? ['off', 'unknown', 'unavailable'].includes(state) : !['open', 'opening'].includes(state));
        }, { parent: popup.parentHash, child: popup.hash });
        if (!inactive) throw new Error(`Popup ${popup.name}: eligible group member did not render.`);
        await page.locator('.marao-popup-close').tap();
        await page.locator('.marao-popup-sheet').waitFor({ state: 'detached' });
        continue;
      }
      target = { tag: 'marao-card' };
      card = members.nth(selected);
    }
    if (!target) throw new Error(`Popup ${popup.name} has no gallery control.`);
    const control = card.locator(target.tag === "marao-card" ? "[data-card-action]" : "button.surface");
    if (await control.isDisabled()) {
      if (viaParent) { await page.locator('.marao-popup-close').tap(); await page.locator('.marao-popup-sheet').waitFor({ state: 'detached' }); }
      continue;
    } // Disabled entity examples must not open their popup.
    await control.focus();
    try {
      if (target.tag === "marao-card") {
        let position = { x: 12, y: 12 };
        if (viaParent) {
          await card.scrollIntoViewIfNeeded();
          await control.focus();
          await card.evaluate(card => {
            const sheet = card.closest('.marao-popup-sheet');
            const header = sheet.querySelector('.marao-popup-head').getBoundingClientRect();
            sheet.scrollBy({ top: card.getBoundingClientRect().top - header.bottom - 12, behavior: 'instant' });
          });
          // Read the current button atomically through its retained card.
          position = await card.evaluate(popupMemberTouchPosition);
        }
        await control.tap({ position });
      }
      else await control.tap();
    } catch (error) {
      const diagnostics = await control.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const describe = (node) => node && ({ tag: node.localName, class: node.className, inert: Boolean(node.inert), pointerEvents: getComputedStyle(node).pointerEvents });
        const ancestors = [];
        for (let node = element; node; node = node.parentElement || node.getRootNode()?.host) ancestors.push(describe(node));
        const points = [{ x: rect.left + 12, y: rect.top + 12 }, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }];
        return {
          hash: location.hash, viewport: { width: innerWidth, height: innerHeight }, rect: rect.toJSON(), ancestors,
          points: points.map((point) => ({ ...point, top: describe(document.elementFromPoint(point.x, point.y)), local: describe(element.getRootNode().elementFromPoint(point.x, point.y)) })),
          body: [...document.body.children].map(describe), overlays: (document.querySelector("home-assistant")?.shadowRoot || document).querySelectorAll(".marao-popup-overlay").length,
        };
      });
      diagnostics.popups = await page.locator("marao-popup-card").evaluateAll((cards) => cards.filter((item) => item._open).map((item) => ({ hash: item._config.hash, background: item._backgroundState.map(({ element, inert }) => ({ tag: element.localName, previousInert: inert, currentInert: element.inert })) })));
      const prefix = path.join(output, `${runName}-popup-${index + 1}-tap-failure`);
      fs.writeFileSync(`${prefix}.json`, JSON.stringify({ popup, diagnostics }, null, 2));
      if (captures === 'all') await page.screenshot({ path: `${prefix}.png`, scale: "css" });
      throw new Error(`${popup.name}: popup trigger tap failed; diagnostics in ${prefix}.json\n${JSON.stringify(diagnostics)}\n${error.message}`);
    }
    const sheet = page.locator(".marao-popup-sheet");
    const checkCloseButton = async () => {
      const unobstructed = await page.locator(".marao-popup-close").evaluate((button) => {
        const rect = button.getBoundingClientRect();
        return button.getRootNode().elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === button;
      });
      if (!unobstructed) issues.push(`${popup.name}: popup content overlaps the close button`);
    };
    await sheet.waitFor({ state: "visible" });
    const actualHash = await page.evaluate(() => location.hash);
    if (actualHash !== popup.hash) {
      fs.writeFileSync(path.join(output, `${runName}-popup-${index + 1}-wrong-popup.json`), JSON.stringify({ popup, actualHash, trigger: await card.evaluate(card => card._config) }, null, 2));
      throw new Error(`${popup.name}: trigger opened a different popup.`);
    }
    await page.waitForFunction(() => (document.querySelector("home-assistant")?.shadowRoot || document).querySelector(".marao-popup-content")?.children.length > 0);
    if (await sheet.locator('.body.icon-only').count()) await sheet.locator('.body.icon-only svg').first().waitFor({ state: 'visible' });
    if ((await sheet.locator(".marao-popup-head > h2").textContent()).trim() !== popup.heading) issues.push(`${popup.name}: configured popup heading is missing`);
    // Native cards mount before their asynchronous content renders.
    try {
      await page.waitForFunction(popupHasVisibleContent, await sheet.locator('.marao-popup-content').elementHandle(), { timeout: 10000 });
    } catch (error) {
      if (error.name !== 'TimeoutError') throw error;
      issues.push(`${popup.name}: popup has no visible content`);
    }
    await applyVisualPreferences(page, scenario, theme);
    const statusTypography = await sheet.locator('.marao-popup-content').evaluate((host) => {
      const messages = [...host.querySelectorAll(':scope > p')];
      if (!messages.length) return [];
      const probe = document.createElement('span');
      probe.style.cssText = 'font-size:var(--font-size-secondary,1rem);font-weight:var(--font-weight-secondary,500)';
      host.append(probe);
      const expected = getComputedStyle(probe), size = expected.fontSize, weight = expected.fontWeight;
      probe.remove();
      return messages.flatMap(message => {
        const style = getComputedStyle(message);
        return style.fontSize !== size || style.fontWeight !== weight || message.scrollWidth > message.clientWidth + 1
          ? ['popup status does not follow the shared scalable typography or overflows'] : [];
      });
    });
    issues.push(...statusTypography.map(issue => `${popup.name}: ${issue}`));
    await page.waitForFunction(() => [...(document.querySelector('home-assistant')?.shadowRoot || document).querySelectorAll('.marao-popup-content marao-card')].every((card) => {
      if (card._config.template !== 'hc_access_slide_action_card') return true;
      const track = card.shadowRoot.querySelector('marao-slide-to-open')?.shadowRoot?.querySelector('.track');
      const rect = track?.getBoundingClientRect();
      return rect && rect.width >= 48 && rect.height >= 48;
    }));
    const prefix = path.join(output, `${runName}-popup-${String(index + 1).padStart(2, "0")}`);
    if (captures === 'all') await page.screenshot({ path: `${prefix}.png`, scale: "css" });
    issues.push(...(await layoutIssues(page)).map((issue) => `${popup.name}: ${issue}`));
    const modal = await sheet.evaluate((element) => ({
      role: element.getAttribute("role"), modal: element.getAttribute("aria-modal"),
      name: element.getAttribute("aria-label"),
      backgroundInert: [...element.getRootNode().children].filter((child) => !child.classList.contains("marao-popup-overlay")).every((child) => child.inert),
      height: element.clientHeight, total: element.scrollHeight,
      overflow: getComputedStyle(element).overflowY,
    }));
    if (modal.role !== "dialog" || modal.modal !== "true" || !modal.name || !modal.backgroundInert) {
      issues.push(`${popup.name}: modal semantics or inert background are missing`);
    }
    if (modal.total > modal.height && !["auto", "scroll"].includes(modal.overflow)) {
      issues.push(`${popup.name}: overflowing popup does not scroll internally`);
    }
    if (checkBehavior) {
    await page.keyboard.press("Shift+Tab");
    const focusInside = await page.evaluate(() => {
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      for (let element = active; element; element = element.parentElement || element.getRootNode()?.host) {
        if (element.classList?.contains("marao-popup-sheet")) return true;
      }
      return false;
    });
    if (!focusInside) issues.push(`${popup.name}: focus escaped the popup`);
    }
    await page.locator(".marao-popup-sheet marao-camera-events-card").evaluateAll(async (cards) => {
      await Promise.all(cards.map(async (card) => {
        const deadline = Date.now() + 10000;
        const status = () => card.shadowRoot.querySelector("[data-status]")?.dataset.status;
        while (status() === "loading" && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
        if (status() === "loading") throw new Error("Camera popup did not finish loading.");
      }));
    });
    await sheet.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
    await applyVisualPreferences(page, scenario, theme);
    issues.push(...(await layoutIssues(page)).map((issue) => `${popup.name}: ${issue}`));
    if (capture) await page.screenshot({ path: `${prefix}-ready.png`, scale: "css" });
    reviewed.add(reviewKey);
    await checkCloseButton();
    const dimensions = await sheet.evaluate((element) => ({ total: element.scrollHeight, height: element.clientHeight }));
    if (dimensions.total > dimensions.height) {
      for (let top = dimensions.height * 0.75, segment = 1; top < dimensions.total; top += dimensions.height * 0.75, segment += 1) {
        await sheet.evaluate((element, position) => element.scrollTo({ top: position, behavior: "instant" }), top);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        if (captures === 'all' || (capture && top + dimensions.height >= dimensions.total)) {
          await page.screenshot({ path: `${prefix}-scroll-${segment}.png`, scale: "css" });
        }
        await checkCloseButton();
        const headerGap = await sheet.evaluate((element) => (
          element.querySelector(".marao-popup-head").getBoundingClientRect().top - element.getBoundingClientRect().top
        ));
        if (headerGap > 1) issues.push(`${popup.name}: scrolled content is exposed above the sticky header`);
      }
      await sheet.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
    }
    const closePopup = () => page.locator(".marao-popup-close").tap();
    const cameraEntities = await sheet.locator('ha-camera-stream').evaluateAll(players => [...new Set(players.map(player => player.stateObj?.entity_id).filter(Boolean))]);
    if (cameraEntities.length && page.__cameraRequestLedger) {
      await page.__cameraRequestLedger.boundary('close inspected camera popup', closePopup, { terminal: false, entities: cameraEntities });
    } else await closePopup();
    await sheet.waitFor({ state: "detached" });
    await page.waitForFunction(() => !location.hash);
    // Focus restoration waits for Home Assistant's native card slot to render.
    if (checkBehavior) {
    await page.waitForFunction(({ host, selector }) => {
      const control = host.shadowRoot?.querySelector(selector);
      return host.isConnected && control?.isConnected && host.shadowRoot.activeElement === control;
    }, { host: await returnCard.elementHandle(), selector: target.tag === "marao-card" ? "[data-card-action]" : "button.surface" }, { timeout: 1000 }).catch((error) => {
      if (error.name !== "TimeoutError") throw error;
    });
    const focusFailure = await returnCard.evaluate(popupFocusFailure, target.tag === "marao-card" ? "[data-card-action]" : "button.surface");
    if (focusFailure) {
      focusFailure.popups = await page.locator("marao-popup-card").evaluateAll((cards) => cards.filter((item) => item._open || item._backgroundState.length).map((item) => ({ hash: item._config.hash, open: item._open, background: item._backgroundState.map(({ element, inert }) => ({ tag: element.localName, previousInert: inert, currentInert: element.inert })) })));
      fs.writeFileSync(`${prefix}-focus-failure.json`, JSON.stringify({ popup, diagnostics: focusFailure }, null, 2));
      await page.screenshot({ path: `${prefix}-focus-failure.png`, scale: "css" });
      issues.push(`${popup.name}: focus was not restored to the invoking control`);
    }
    checkedBehaviors.add(reviewKey);
    }
  }
  return [...new Set(issues)];
}

async function waitForNavbar(page) {
  const card = page.locator('marao-navbar-card:not([data-marao-navbar-placeholder])');
  await card.waitFor({ state: 'attached' });
  await card.locator('nav').waitFor({ state: 'attached' });
  const routes = await card.evaluate(element => element._config.routes.length);
  assert.equal(await card.locator('.nav [data-route]').count(), await card.evaluate(element => element._visibleCount), 'Visible prefix differs from layout partition');
  assert.equal(await card.locator('[data-overflow]').count(), routes > await card.evaluate(element => element._visibleCount) ? 1 : 0);
  await card.locator('nav').waitFor({ state: routes ? 'visible' : 'hidden' });
}

async function main() {
  const options = parseArgs();
  const runs = selectedRuns(options);
  const config = readConfig();
  assertDisposableHaTarget(config);
  const { dashboard } = await prepare(config);
  const baseUrl = config.url.replace(/\/$/, "");
  const token = await accessToken(config, baseUrl);
  const output = path.join(require('./verification-browser').artifactDirectory('accessibility'), ...(options.safeArea ? ['safe-area'] : []));
  if (!options.preview) fs.mkdirSync(output, { recursive: true });
  const checkProfile = async ({ scenario, theme }) => {
    const captures = capturePolicy(options, scenario);
    const checkedBehaviors = new Set();
    const popupBehavior = scenario === runs[0].scenario && !options.geometryOnlyPopups;
    // Keep each profile's touch emulation independent of other target
    // lifecycles by giving it a complete browser process.
    const browser = await chromium.launch({ headless: !options.preview });
    let page, primaryFailure;
    try {
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      await context.addInitScript(setBrowserToken, {
        ...token, hassUrl: baseUrl, clientId: `${baseUrl}/`, expires: Date.now() + token.expires_in * 1000,
      });
      if(options.safeArea) await context.addInitScript(() => {
        const apply=()=>{document.documentElement.style.setProperty('--app-safe-area-inset-top','47px');document.documentElement.style.setProperty('--app-safe-area-inset-bottom','34px');};
        if(document.documentElement)apply();else document.addEventListener('DOMContentLoaded',apply,{once:true});
      });
      page = await context.newPage();
      const cameraLedger = options.preview ? null : await require('./camera-request-ledger').managedCameraLedger(context, page, { output, scenario: scenario.name, theme });
      await configurePageEmulation(context, page, scenario, options.safeArea ? Object.fromEntries(insetSides.flatMap(side=>[[side,0],[side+'Max',0]])) : undefined);
      const errors = [], manualCameraDiagnostics = [];
      const manualCameraDiagnostic = message => { manualCameraDiagnostics.push(message); fs.writeFileSync(path.join(output, 'preview-manual-camera.json'), JSON.stringify(manualCameraDiagnostics), { mode: 0o600 }); };
      page.on("pageerror", (error) => {
        errors.push(error.message);
        if (options.preview) console.error(`[browser error] ${error.message}`);
      });
      page.on("console", (message) => { if (require('./camera-request-ledger').isManualCameraConsoleMessage(message)) { if (!cameraLedger) manualCameraDiagnostic(message.text()); return; }
        if (!["error", "warning"].includes(message.type())) return;
        errors.push(message.text());
        if (options.preview) console.error(`[browser ${message.type()}] ${message.text()}`);
      });
      if (!cameraLedger) page.on("requestfailed", (request) => {
        const message = `Failed ${request.resourceType()} request: ${new URL(request.url()).pathname} (${request.failure()?.errorText || "unknown error"})`;
        if (require('./camera-request-ledger').isManualCameraTransport(request.url())) { manualCameraDiagnostic(message); return; }
        errors.push(message);
        if (options.preview) console.error(`[browser request] ${message}`);
      });
      page.on("response", (response) => {
        if (require('./camera-request-ledger').isManualCameraTransport(response.url())) { if (!cameraLedger && response.status() >= 400) manualCameraDiagnostic(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`); return; }
        if (response.status() < 400) return;
        const message = `${response.status()} ${response.request().resourceType()} response: ${new URL(response.url()).pathname}`;
        errors.push(message);
        if (options.preview) console.error(`[browser response] ${message}`);
      });
      const runName = `${scenario.name}-${theme}`;
      if (!options.preview) {
        for (const file of fs.readdirSync(output)) if (file.startsWith(`${runName}-`)) fs.rmSync(path.join(output, file));
      }
      const initialView = options.pagesOnly ? dashboard.views.find(view => view.path !== 'card-test')?.path : 'card-test';
      if (!initialView) throw new Error('Missing saved dashboard page.');
      await page.goto(`${baseUrl}/marao-dashboard/${initialView}?marao_accessibility=${runName}`, { waitUntil: "domcontentloaded" });
      try {
        if (options.pagesOnly) await waitForNavbar(page);
        else await page.locator('marao-card').first().waitFor({ state: 'visible', timeout: 10000 });
      } catch (error) {
        const diagnostics = await page.evaluate(async () => {
          const names = [
            "marao-card",
            "marao-navbar-card",
            "marao-popup-card",
            "marao-camera-events-card",
            "marao-slide-to-open",
          ];
          const maraoResources = performance.getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((url) => /marao/i.test(url));
          const renderedErrors = [];
          const visit = (root) => {
            for (const element of root?.children || []) {
              if (element.localName === "hui-error-card" || element.localName === "hui-warning") {
                renderedErrors.push({
                  text: element.textContent?.trim(),
                  config: element._config,
                  error: String(element._error || element.error || ""),
                });
              }
              visit(element.shadowRoot);
              visit(element);
            }
          };
          visit(document.documentElement);
          const registrations = Object.fromEntries(
            names.map((name) => [name, Boolean(globalThis.customElements?.get(name))]),
          );
          return {
            url: location.href,
            readyState: document.readyState,
            registrations,
            renderedErrors: renderedErrors.slice(0, 5),
            maraoResources,
            visibleText: document.body?.innerText?.trim().slice(0, 500),
          };
        });
        if (!options.preview) await page.screenshot({ path: path.join(output, `${runName}-render-failure.png`), scale: "css" });
        const details = [...errors, JSON.stringify(diagnostics, null, 2)].map((item) => `- ${item}`).join("\n");
        throw new Error(`${runName} did not render a Marao card:\n${details}\n${error.message}`);
      }
      await assertCurrentFrontend(page);
      if(options.safeArea) {
        await page.locator('marao-navbar-card:not([data-marao-navbar-placeholder]) nav').waitFor({state:'visible'});
        await page.evaluate(()=>document.fonts.ready);
        const cold=await safeAreaGeometry(page,safeAreaCases[0]);
        fs.writeFileSync(path.join(output,`${runName}-cold.json`),JSON.stringify(cold,null,2));
        await page.screenshot({path:path.join(output,`${runName}-cold.png`),scale:'css'});
        if(cold.issues.length)throw new Error(`Cold app inset: ${cold.issues.join('; ')}`);
      }
      await applyVisualPreferences(page, scenario, theme);
      if (options.focused) {
        let inspected = 0;
        const views = options.pages ? dashboard.views.filter(view => view.path !== 'card-test') : [{ path: initialView }];
        for (const view of views) {
          if (view.path !== initialView) {
            await page.evaluate(route => { history.pushState(null, '', route); window.dispatchEvent(new CustomEvent('location-changed')); }, '/marao-dashboard/' + view.path);
            await page.waitForFunction(({ root, expected }) => root.config?.views?.[root._curView]?.path === expected, {
              root: await page.locator('hui-root').elementHandle(), expected: view.path,
            });
          }
          await waitForNavbar(page);
          if (await page.locator('marao-card').count()) inspected += await require('./verification-browser').inspectFocused(page, options, scenario, theme, output, runName + '-' + view.path);
          else if (!options.pagesOnly) throw new Error('Selected page has no rendered affected cards');
          else if ((await layoutIssues(page)).length) throw new Error('Saved page navigation/layout failed');
        }
        if (errors.length) throw new Error(errors.join('\n'));
        fs.writeFileSync(path.join(output, runName + '-result.json'), JSON.stringify({ profile: scenario.name, theme,
          families: options.families, inspected, focused: true, passed: true }), { mode: 0o600 });
        console.log(`${runName}: ${inspected} representative affected cards checked.`);
        return;
      }
      if(options.safeArea) {
        const samples=[];
        for(const source of safeAreaCases) {
          await page.locator('marao-card').first().scrollIntoViewIfNeeded();
          await page.evaluate(()=>window.scrollTo(0,0));
          await applySafeAreaSource(context,page,source);
          const geometry=await safeAreaGeometry(page,source);
          if(source.name==='app-only') {
            await page.evaluate(()=>{location.hash='#marao-dashboard-test-value-sliders-popup';});
            const sheet=page.locator('.marao-popup-sheet');await sheet.waitFor({state:'visible'});
            await sheet.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished));});
            geometry.sheet=await sheet.evaluate(e=>({bounds:e.getBoundingClientRect().toJSON(),close:e.querySelector('.marao-popup-close').getBoundingClientRect().toJSON()}));
            await page.screenshot({path:path.join(output,`${runName}-safe-area-baseline-sheet.png`),scale:'css'});
            await page.locator('.marao-popup-close').click();await sheet.waitFor({state:'detached'});
          }
          samples.push({name:source.name,...geometry});
          fs.writeFileSync(path.join(output,`${runName}-safe-area.json`),JSON.stringify(samples,null,2));
          await page.screenshot({path:path.join(output,`${runName}-safe-area-${source.name}.png`),scale:'css'});
          if(geometry.issues.length)throw new Error(`${runName} ${source.name}: ${geometry.issues.join('; ')}`);
          await page.locator('marao-card').last().evaluate(card=>{
            for(let e=card;e;e=e.assignedSlot||e.parentElement||e.getRootNode()?.host) {
              if(e.clientHeight>0&&e.scrollHeight>e.clientHeight+1&&['auto','scroll'].includes(getComputedStyle(e).overflowY)){e.scrollTo({top:e.scrollHeight,behavior:'instant'});return;}
            }document.scrollingElement.scrollTo({top:document.scrollingElement.scrollHeight,behavior:'instant'});
          });
          const last=await page.locator('marao-card').last().boundingBox();
          const bar=await page.locator('marao-navbar-card:not([data-marao-navbar-placeholder]) nav').boundingBox();
          if(last.y+last.height>bar.y-8)throw new Error(`${source.name}: Last card is covered by the navbar`);
          await page.screenshot({path:path.join(output,`${runName}-safe-last-${source.name}.png`),scale:'css'});
        }
        await inspectSafeAreaSheets(context,page,output,runName);
        await inspectFullscreenLifecycle(page);
        if(errors.length)throw new Error(errors.join('\n'));
        console.log(`${runName}: production safe-area source checks passed.`);
        return;
      }
      if (options.preview) {
        await scrollDashboard(page);
        const previewIssues = [...await frontendRegistrationIssues(page), ...await emulationIssues(page, scenario, theme), ...await layoutIssues(page)];
        if (errors.length || previewIssues.length) throw new Error(`${runName} failed:\n${[...errors, ...previewIssues].join("\n")}`);
        const viewport = effectiveViewport(scenario);
        const zoomDescription = scenario.pageZoom > 1
          ? `; ${viewport.width}x${viewport.height} effective layout viewport for ${scenario.pageZoom * 100}% page zoom`
          : "";
        console.log(`Previewing ${scenario.name} (${theme}) at ${scenario.viewport.width}x${scenario.viewport.height}${zoomDescription}. Close the browser window when finished.`);
        await new Promise((resolve) => {
          browser.once("disconnected", resolve);
          page.once("close", resolve);
        });
        if (errors.length) throw new Error(`Preview produced browser warnings/errors:\n${errors.join("\n")}`);
        return;
      }
      if (!options.pagesOnly) {
      await scrollDashboard(page, {
        screenshotPrefix: captures === 'all' ? path.join(output, runName) : undefined,
        onSegment: async () => {
          await applyVisualPreferences(page, scenario, theme);
          const issues = await emulationIssues(page, scenario, theme);
          if (issues.length) throw new Error(`${runName} emulation failed before capture:\n${issues.join("\n")}`);
        },
      });
      let issues = [
        ...await frontendRegistrationIssues(page),
        ...await emulationIssues(page, scenario, theme),
        ...await layoutIssues(page),
      ];
      if (errors.length || issues.length) throw new Error(`${runName} failed:\n${[...errors, ...issues].map((item) => `- ${item}`).join("\n")}`);
      if (captures === 'review') await captureRepresentativeCards(page, path.join(output, runName));
      issues = issues.concat(await inspectPopups(page, scenario, theme, output, runName, captures, [], popupBehavior, checkedBehaviors));
      if (errors.length || issues.length) throw new Error(`${runName} failed:\n${[...errors, ...issues].map((item) => `- ${item}`).join("\n")}`);
      }
      if (options.pages) for (const view of dashboard.views.filter(view => view.path !== 'card-test')) {
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(route => { history.pushState(null, '', route); window.dispatchEvent(new CustomEvent('location-changed')); }, '/marao-dashboard/' + view.path);
        await page.waitForFunction(({ root, expected }) => root.config?.views?.[root._curView]?.path === expected, {
          root: await page.locator('hui-root').elementHandle(), expected: view.path,
        });
        await page.evaluate(() => document.fonts.ready);
        await waitForNavbar(page);
        await applyVisualPreferences(page, scenario, theme);
        const prefix = path.join(output, runName + '-page-' + view.path);
        if (await page.locator('marao-card').count()) await scrollDashboard(page, { screenshotPrefix: captures === 'all' ? prefix : undefined, onSegment: async () => {
          await applyVisualPreferences(page, scenario, theme);
          const found = await layoutIssues(page);
          if (found.length) throw new Error(`${runName}/${view.path}: ${found.join('\n')}`);
        } });
        if (captures === 'review') await page.screenshot({ path: prefix + '-representative.png', scale: 'css' });
        else if (captures === 'all' && !await page.locator('marao-card').count()) await page.screenshot({ path: prefix + '-empty.png', scale: 'css' });
        const found = [...await frontendRegistrationIssues(page), ...await emulationIssues(page, scenario, theme), ...await layoutIssues(page), ...await inspectPopups(page, scenario, theme, output, runName + '-page-' + view.path, captures, [], popupBehavior, checkedBehaviors)];
        if (errors.length || found.length) throw new Error(`${runName}/${view.path}: ${[...errors, ...found].join('\n')}`);
      }
      await cameraLedger?.stopForClose();
      if (errors.length) throw new Error(`${runName}: ${errors.join('\n')}`);
      fs.writeFileSync(path.join(output, runName + '-result.json'), JSON.stringify({ profile: scenario.name, theme,
        pages: options.pages ? dashboard.views.filter(view => view.path !== 'card-test').map(view => view.path) : [],
        gallery: !options.pagesOnly, screenshots: captures, passed: true }), { mode: 0o600 });
      console.log(`${runName}: ${options.pagesOnly ? 'saved-page' : 'gallery'} and popup checks passed.`);
      await context.close();
    } catch (error) {
      primaryFailure = error;
      if (!options.preview && page && !page.isClosed()) {
        try { await page.screenshot({ path: path.join(output, `${scenario.name}-${theme}-failure.png`), scale: 'css' }); }
        catch (captureError) { error.message += '\nFailure screenshot could not be captured: ' + captureError.message; }
      }
      throw error;
    } finally {
      if (browser.isConnected()) {
        try { await browser.close(); }
        catch (error) { throw primaryFailure ? new AggregateError([primaryFailure, error], 'Layout check and browser cleanup failed') : error; }
      }
    }
  };
  const concurrency = options.parallel ? 3 : 1;
  for (let index = 0; index < runs.length; index += concurrency) {
    await Promise.all(runs.slice(index, index + concurrency).map(checkProfile));
  }
  if (!options.preview) console.log(`Accessibility layout OK (${runs.length} mobile profile/theme runs; screenshots in ${output})`);
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = {
  readySubtree,
  applySafeAreaSource,
  safeAreaCases,
  safeAreaGeometry,
  applyVisualPreferences,
  configurePageEmulation,
  contextOptionsForScenario,
  effectiveViewport,
  emulationIssues,
  frontendRegistrationIssues,
  inspectPopups,
  layoutIssues,
  inspectFullscreenLifecycle,
  parseArgs,
  popupFocusFailure,
  popupHasVisibleContent,
  popupMemberTouchPosition,
  popupTriggerTargets,
  popupReviewKey,
  capturePolicy,
  reviewProfiles,
  safeAreaInsetsForScenario,
  scenarios,
  selectedRuns,
  themeVariables,
  themes,
  visualVariablesForScenario,
  waitForNavbar,
};
