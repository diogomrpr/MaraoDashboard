const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const { chromium } = require("playwright");
const deviceDescriptors = require("./mobile-devices");
const { accessToken, setBrowserToken, assertCurrentFrontend, assertDisposableHaTarget, readConfig } = require("../ha-test/client");
const { prepare } = require("../ha-test/prepare");
const { scrollDashboard } = require("./test-ha-dashboard-e2e");

const repoRoot = path.resolve(__dirname, "..");
const themePath = path.join(
  repoRoot,
  "custom_components/marao_dashboard/frontend/themes/MaraoDashboard/marao-dashboard.yaml",
);
const themes = ["light", "dark"];
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

function argumentValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function parseArgs(argv = process.argv.slice(2)) {
  return {
    preview: argv.includes("--preview"),
    scenario: argumentValue(argv, "--scenario"),
    theme: argumentValue(argv, "--theme"),
  };
}

function selectedRuns(options) {
  const selectedScenarios = options.scenario
    ? scenarios.filter(({ name }) => name === options.scenario)
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

async function configurePageEmulation(context, page, scenario) {
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setSafeAreaInsetsOverride", {
    insets: safeAreaInsetsForScenario(scenario),
  });
  await session.send("Emulation.setEmulatedOSTextScale", { scale: scenario.textScale });
}

let parsedTheme;
function themeVariables(mode) {
  if (!themes.includes(mode)) throw new Error(`Unknown Marao theme mode "${mode}".`);
  if (!parsedTheme) {
    const source = YAML.parse(fs.readFileSync(themePath, "utf8"));
    parsedTheme = source?.["Marao Dashboard"];
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

async function applyVisualPreferences(page, scenario, theme) {
  const variables = visualVariablesForScenario(scenario, theme);
  await page.evaluate(({ cssVariables, profile, mode }) => {
    const apply = (element) => {
      for (const [name, value] of Object.entries(cssVariables)) {
        element.style.setProperty(name, value, "important");
      }
    };
    apply(document.documentElement);
    document.documentElement.dataset.maraoAccessibilityProfile = profile;
    document.documentElement.dataset.maraoThemeMode = mode;
    const visit = (root) => {
      for (const element of root?.children || []) {
        if (
          element.localName === "home-assistant"
          || element.localName?.startsWith("marao-")
          || element.classList?.contains("marao-popup-overlay")
        ) apply(element);
        visit(element.shadowRoot);
        visit(element);
      }
    };
    visit(document.documentElement);
  }, { cssVariables: variables, profile: scenario.name, mode: theme });
  await page.evaluate(async () => { await document.fonts?.ready; });
  await page.waitForTimeout(300);
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
            if (textScale === 2 && width > 0 && width <= 400 && getComputedStyle(readings).gridTemplateColumns.trim().split(/\s+/).filter((track) => parseFloat(track) > 0.5).length > 1) issues.push(`${element._config?.name || element._config?.template}: detail readings did not reflow at 200% text`);
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

async function layoutIssues(page) {
  return page.evaluate(() => {
    const issues = [];
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
        const owned = insideMarao
          || element.localName?.startsWith("marao-")
          || element.classList?.contains("marao-popup-overlay");
        if (element.localName === "hui-error-card" || element.localName === "hui-warning") {
          issues.push(`${element.localName}: ${element.textContent?.trim() || "rendered without details"}`);
        }
        if (owned && element.matches?.(".message.error")) {
          let background;
          for (let ancestor = element; ancestor; ancestor = ancestor.parentElement || ancestor.getRootNode()?.host) {
            const color = rgba(getComputedStyle(ancestor).backgroundColor);
            if (color[3] === 255) { background = color; break; }
          }
          if (!background) issues.push(`${element.textContent.trim()}: error background is not measurable`);
          else {
            const values = [luminance(rgba(getComputedStyle(element).color)), luminance(background)].sort((a, b) => a - b);
            const ratio = (values[1] + 0.05) / (values[0] + 0.05);
            if (ratio < 4.5) issues.push(`${element.textContent.trim()}: error text contrast is ${ratio.toFixed(2)}:1; expected 4.5:1`);
          }
        }
        if (element.localName === "marao-card") {
          const body = element.shadowRoot?.querySelector(".body");
          const card = element.shadowRoot?.querySelector("ha-card");
          if (body && body.scrollWidth > body.clientWidth + 1) issues.push(`${element._config?.name || element._config?.entity || "card"}: horizontal overflow`);
          const labels = [...(element.shadowRoot?.querySelectorAll(".title,.state,.climate") || [])];
          const controls = [...(element.shadowRoot?.querySelectorAll(".icon,.number-stepper") || [])];
          for (const label of labels) for (const control of controls) {
            if (intersects(label.getBoundingClientRect(), control.getBoundingClientRect())) issues.push(`${element._config?.name || element._config?.entity || "card"}: text overlaps control`);
          }
          if (card && card.scrollWidth > card.clientWidth + 1) issues.push(`${element._config?.name || element._config?.entity || "card"}: card content clipped`);
        }
        if (element.localName === "marao-navbar-card") {
          const nav = element.shadowRoot?.querySelector("nav")?.getBoundingClientRect();
          const links = [...(element.shadowRoot?.querySelectorAll("a") || [])].map((link) => link.getBoundingClientRect());
          if (nav && (nav.left < 0 || nav.right > innerWidth + 1)) issues.push("navbar extends outside the viewport");
          for (const [index, link] of links.entries()) {
            if (nav && (link.left < nav.left - 1 || link.right > nav.right + 1 || link.top < nav.top - 1 || link.bottom > nav.bottom + 1)) issues.push("navbar target extends outside its surface");
            if (links.slice(index + 1).some((other) => intersects(link, other))) issues.push("navbar touch targets overlap");
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
        if (owned && element.matches?.(".title,.state,.climate,.current-temperature,.number-value,.value,.empty,h1,h2,.message,.climate-mode,.legend span,.meta strong,.detail-meta strong,.reading dt,.reading dd,.header-date,.media-summary")) {
          if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) {
            issues.push(`${element.textContent?.trim() || element.localName}: essential text is clipped`);
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
        if (owned && element.matches?.(".climate-mode span") && /^[\p{L}]{1,4}$/u.test(element.textContent?.trim() || "")) {
          const range = document.createRange();
          range.selectNodeContents(element);
          const lines = new Set([...range.getClientRects()].filter((rect) => rect.width && rect.height).map((rect) => Math.round(rect.top)));
          if (lines.size > 1) issues.push(`${element.textContent.trim()}: short climate mode label is split across lines`);
        }
        if (owned && element.matches?.('button,a[href],input,[role="button"],[role="slider"]')) {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && (rect.width < 48 || rect.height < 48)) {
            const name = element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent?.trim() || element.localName;
            issues.push(`${name}: interactive target is ${Math.round(rect.width)}x${Math.round(rect.height)}; expected at least 48x48`);
          }
        }
        visit(element.shadowRoot, owned);
        visit(element, owned);
      }
    };
    visit(document.documentElement);
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) issues.push("dashboard has horizontal overflow");
    const sheet = (document.querySelector("home-assistant")?.shadowRoot || document).querySelector(".marao-popup-sheet");
    if (sheet && sheet.scrollWidth > sheet.clientWidth + 1) issues.push("popup has horizontal overflow");
    return [...new Set(issues)];
  });
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
    const eventModuleUrl = resources.find((url) => /\/marao_dashboard_static\/MaraoFrigateEventsCard\.js\?/i.test(url));
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

async function inspectPopups(page, scenario, theme, output, runName) {
  const popups = await page.locator("marao-popup-card").evaluateAll((cards) => cards.map((card) => ({
    hash: card._config.hash, name: card._config.name || card._config.title || card._config.hash,
    heading: card._config.cards?.some((child) => child?.template === "hc_climate_card" && child.variables?.show_mode_buttons)
      ? "" : String(card._config.title ?? card._config.name ?? ""),
  })));
  const triggers = page.locator("marao-card,marao-energy-period-card");
  const targets = await triggers.evaluateAll((cards) => cards.map((card, index) => ({
    index, tag: card.localName,
    hash: card._config?.tap_action?.navigation_path || card._config?.variables?.popup_hash
      || card._config?.variables?.mode_selector_hash || card._config?.popup_hash,
  })));
  const issues = [];
  for (const [index, popup] of popups.entries()) {
    const target = targets.find(({ hash }) => hash === popup.hash);
    if (!target) throw new Error(`Popup ${popup.name} has no gallery control.`);
    const card = triggers.nth(target.index);
    const control = card.locator(target.tag === "marao-card" ? "[data-card-action]" : "button.surface");
    if (await control.isDisabled()) continue; // Disabled entity examples must not open their popup.
    await control.focus();
    try {
      if (target.tag === "marao-card") await control.tap({ position: { x: 12, y: 12 } });
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
      await page.screenshot({ path: `${prefix}.png`, scale: "css" });
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
    await page.waitForFunction(() => (document.querySelector("home-assistant")?.shadowRoot || document).querySelector(".marao-popup-content")?.children.length > 0);
    if (await sheet.locator('.body.icon-only').count()) await sheet.locator('.body.icon-only svg').first().waitFor({ state: 'visible' });
    if ((await sheet.locator(".marao-popup-head > h2").textContent()).trim() !== popup.heading) issues.push(`${popup.name}: configured popup heading is missing`);
    const visibleContents = await sheet.locator(".marao-popup-content").evaluate((host) => {
      const visible = (root) => [...root.children].some((child) => {
        const rect = child.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && getComputedStyle(child).display !== "none" && (child.textContent?.trim() || child.matches("img,svg"))) return true;
        return child.shadowRoot && visible(child.shadowRoot) || visible(child);
      });
      return visible(host);
    });
    if (!visibleContents) issues.push(`${popup.name}: popup has no visible content`);
    await applyVisualPreferences(page, scenario, theme);
    await page.waitForFunction(() => [...(document.querySelector('home-assistant')?.shadowRoot || document).querySelectorAll('.marao-popup-content marao-card')].every((card) => {
      if (card._config.template !== 'hc_access_slide_action_card') return true;
      const track = card.shadowRoot.querySelector('marao-slide-to-open')?.shadowRoot?.querySelector('.track');
      const rect = track?.getBoundingClientRect();
      return rect && rect.width >= 48 && rect.height >= 48;
    }));
    const prefix = path.join(output, `${runName}-popup-${String(index + 1).padStart(2, "0")}`);
    await page.screenshot({ path: `${prefix}.png`, scale: "css" });
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
    await page.screenshot({ path: `${prefix}-ready.png`, scale: "css" });
    await checkCloseButton();
    const dimensions = await sheet.evaluate((element) => ({ total: element.scrollHeight, height: element.clientHeight }));
    if (dimensions.total > dimensions.height) {
      for (let top = dimensions.height * 0.75, segment = 1; top < dimensions.total; top += dimensions.height * 0.75, segment += 1) {
        await sheet.evaluate((element, position) => element.scrollTo({ top: position, behavior: "instant" }), top);
        await page.screenshot({ path: `${prefix}-scroll-${segment}.png`, scale: "css" });
        await checkCloseButton();
        const headerGap = await sheet.evaluate((element) => (
          element.querySelector(".marao-popup-head").getBoundingClientRect().top - element.getBoundingClientRect().top
        ));
        if (headerGap > 1) issues.push(`${popup.name}: scrolled content is exposed above the sticky header`);
      }
      await sheet.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
    }
    await page.locator(".marao-popup-close").tap();
    await sheet.waitFor({ state: "detached" });
    await page.waitForFunction(() => !location.hash);
    // Focus restoration waits for Home Assistant's native card slot to render.
    await page.waitForFunction(({ host, selector }) => {
      const control = host.shadowRoot?.querySelector(selector);
      return host.isConnected && control?.isConnected && host.shadowRoot.activeElement === control;
    }, { host: await card.elementHandle(), selector: target.tag === "marao-card" ? "[data-card-action]" : "button.surface" }, { timeout: 1000 }).catch((error) => {
      if (error.name !== "TimeoutError") throw error;
    });
    const focusFailure = await card.evaluate(popupFocusFailure, target.tag === "marao-card" ? "[data-card-action]" : "button.surface");
    if (focusFailure) {
      focusFailure.popups = await page.locator("marao-popup-card").evaluateAll((cards) => cards.filter((item) => item._open || item._backgroundState.length).map((item) => ({ hash: item._config.hash, open: item._open, background: item._backgroundState.map(({ element, inert }) => ({ tag: element.localName, previousInert: inert, currentInert: element.inert })) })));
      fs.writeFileSync(`${prefix}-focus-failure.json`, JSON.stringify({ popup, diagnostics: focusFailure }, null, 2));
      await page.screenshot({ path: `${prefix}-focus-failure.png`, scale: "css" });
      issues.push(`${popup.name}: focus was not restored to the invoking control`);
    }
  }
  return [...new Set(issues)];
}

async function main() {
  const options = parseArgs();
  const runs = selectedRuns(options);
  const config = readConfig();
  assertDisposableHaTarget(config);
  await prepare(config);
  const baseUrl = config.url.replace(/\/$/, "");
  const token = await accessToken(config, baseUrl);
  const output = path.join(__dirname, ".artifacts", "accessibility");
  if (!options.preview) fs.mkdirSync(output, { recursive: true });
  const checkProfile = async ({ scenario, theme }) => {
    // Keep each profile's touch emulation independent of other target
    // lifecycles by giving it a complete browser process.
    const browser = await chromium.launch({ headless: !options.preview });
    try {
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      await context.addInitScript(setBrowserToken, {
        ...token, hassUrl: baseUrl, clientId: `${baseUrl}/`, expires: Date.now() + token.expires_in * 1000,
      });
      const page = await context.newPage();
      await configurePageEmulation(context, page, scenario);
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
        if (options.preview) console.error(`[browser error] ${error.message}`);
      });
      page.on("console", (message) => {
        if (!["error", "warning"].includes(message.type())) return;
        errors.push(message.text());
        if (options.preview) console.error(`[browser ${message.type()}] ${message.text()}`);
      });
      page.on("requestfailed", (request) => {
        const message = `Failed ${request.resourceType()} request: ${new URL(request.url()).pathname} (${request.failure()?.errorText || "unknown error"})`;
        errors.push(message);
        if (options.preview) console.error(`[browser request] ${message}`);
      });
      page.on("response", (response) => {
        if (response.status() < 400 || !["document", "script", "stylesheet", "image", "font"].includes(response.request().resourceType())) return;
        const message = `${response.status()} ${response.request().resourceType()} response: ${new URL(response.url()).pathname}`;
        errors.push(message);
        if (options.preview) console.error(`[browser response] ${message}`);
      });
      const runName = `${scenario.name}-${theme}`;
      if (!options.preview) {
        for (const file of fs.readdirSync(output)) if (file.startsWith(`${runName}-`)) fs.rmSync(path.join(output, file));
      }
      await page.goto(`${baseUrl}/marao-dashboard/card-test?marao_accessibility=${runName}`, { waitUntil: "domcontentloaded" });
      try {
        await page.locator("marao-card").first().waitFor({ state: "visible", timeout: 10000 });
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
      await applyVisualPreferences(page, scenario, theme);
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
      await scrollDashboard(page, {
        screenshotPrefix: path.join(output, runName),
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
      issues = issues.concat(await inspectPopups(page, scenario, theme, output, runName));
      if (errors.length || issues.length) throw new Error(`${runName} failed:\n${[...errors, ...issues].map((item) => `- ${item}`).join("\n")}`);
      console.log(`${runName}: gallery and popup checks passed.`);
      await context.close();
    } finally {
      if (browser.isConnected()) await browser.close();
    }
  };
  for (let index = 0; index < runs.length; index += 3) {
    await Promise.all(runs.slice(index, index + 3).map(checkProfile));
  }
  if (!options.preview) console.log(`Accessibility layout OK (${runs.length} mobile profile/theme runs; screenshots in ${output})`);
}

if (require.main === module) main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });

module.exports = {
  applyVisualPreferences,
  configurePageEmulation,
  contextOptionsForScenario,
  effectiveViewport,
  emulationIssues,
  frontendRegistrationIssues,
  inspectPopups,
  layoutIssues,
  parseArgs,
  popupFocusFailure,
  safeAreaInsetsForScenario,
  scenarios,
  selectedRuns,
  themeVariables,
  themes,
  visualVariablesForScenario,
};
