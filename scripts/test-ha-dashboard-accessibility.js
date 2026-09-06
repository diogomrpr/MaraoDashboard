const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const { chromium, devices } = require("playwright");
const { assertDisposableHaTarget } = require("./ha-local-safety");
const { accessToken, readConfig } = require("./test-ha-dashboard-e2e");

const repoRoot = path.resolve(__dirname, "..");
const themePath = path.join(
  repoRoot,
  "custom_components/marao_dashboard/frontend/themes/MaraoDashboard/marao-dashboard.yaml",
);
const themes = ["light", "dark"];
const deviceDescriptors = {
  iphone: devices["iPhone 13"],
  android: devices["Pixel 5"],
};
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
  return page.evaluate(({ device, viewport, insets, mode, cardBackground, primaryFontSize }) => {
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
  });
}

async function layoutIssues(page) {
  return page.evaluate(() => {
    const issues = [];
    const intersects = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    const visit = (root, insideMarao = false) => {
      for (const element of root?.children || []) {
        const owned = insideMarao
          || element.localName?.startsWith("marao-")
          || element.classList?.contains("marao-popup-overlay");
        if (element.localName === "hui-error-card" || element.localName === "hui-warning") {
          issues.push(`${element.localName}: ${element.textContent?.trim() || "rendered without details"}`);
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
        if (owned && element.matches?.(".title,.state,.climate,h1,h2,.message,.climate-mode")) {
          if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) {
            issues.push(`${element.textContent?.trim() || element.localName}: essential text is clipped`);
          }
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
    const sheet = document.querySelector(".marao-popup-sheet");
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

async function main() {
  const options = parseArgs();
  const runs = selectedRuns(options);
  const config = readConfig();
  assertDisposableHaTarget(config);
  const baseUrl = config.url.replace(/\/$/, "");
  const token = await accessToken(config, baseUrl);
  const output = path.join(repoRoot, "test-results", "accessibility");
  if (!options.preview) fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: !options.preview });
  try {
    for (const { scenario, theme } of runs) {
      const context = await browser.newContext(contextOptionsForScenario(scenario, theme));
      await context.addInitScript((value) => localStorage.setItem("hassTokens", JSON.stringify(value)), {
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
        const message = `Failed ${request.resourceType()} request: ${request.url()} (${request.failure()?.errorText || "unknown error"})`;
        errors.push(message);
        if (options.preview) console.error(`[browser request] ${message}`);
      });
      page.on("response", (response) => {
        if (response.status() < 400 || !["document", "script", "stylesheet", "image", "font"].includes(response.request().resourceType())) return;
        const message = `${response.status()} ${response.request().resourceType()} response: ${response.url()}`;
        errors.push(message);
        if (options.preview) console.error(`[browser response] ${message}`);
      });
      const runName = `${scenario.name}-${theme}`;
      await page.goto(`${baseUrl}/marao-dashboard-card-test/card-test?marao_accessibility=${runName}`, { waitUntil: "domcontentloaded" });
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
          const registrationsBeforeRetry = Object.fromEntries(
            names.map((name) => [name, Boolean(globalThis.customElements?.get(name))]),
          );
          const directImports = {};
          for (const url of maraoResources.filter((value) => value.includes("/marao_dashboard_static/"))) {
            try {
              const module = await import(url);
              directImports[new URL(url).pathname.split("/").pop()] = Object.keys(module);
              module.registerMaraoCards?.();
              module.registerMaraoCameraEventCards?.();
            } catch (importError) {
              directImports[new URL(url).pathname.split("/").pop()] = String(importError?.stack || importError);
            }
          }
          return {
            url: location.href,
            readyState: document.readyState,
            registrationsBeforeRetry,
            renderedErrors: renderedErrors.slice(0, 5),
            maraoResources,
            directImports,
            registrationsAfterRetry: Object.fromEntries(names.map((name) => [name, Boolean(globalThis.customElements?.get(name))])),
            visibleText: document.body?.innerText?.trim().slice(0, 500),
          };
        });
        if (!options.preview) await page.screenshot({ path: path.join(output, `${runName}-render-failure.png`), scale: "css" });
        const details = [...errors, JSON.stringify(diagnostics, null, 2)].map((item) => `- ${item}`).join("\n");
        throw new Error(`${runName} did not render a Marao card:\n${details}\n${error.message}`);
      }
      await applyVisualPreferences(page, scenario, theme);
      if (options.preview) {
        const previewIssues = [...await emulationIssues(page, scenario, theme), ...await layoutIssues(page)];
        for (const issue of previewIssues) console.error(`[layout issue] ${issue}`);
        const viewport = effectiveViewport(scenario);
        const zoomDescription = scenario.pageZoom > 1
          ? `; ${viewport.width}x${viewport.height} effective layout viewport for ${scenario.pageZoom * 100}% page zoom`
          : "";
        console.log(`Previewing ${scenario.name} (${theme}) at ${scenario.viewport.width}x${scenario.viewport.height}${zoomDescription}. Close the browser window when finished.`);
        await new Promise((resolve) => {
          browser.once("disconnected", resolve);
          page.once("close", resolve);
        });
        continue;
      }
      let issues = [
        ...await frontendRegistrationIssues(page),
        ...await emulationIssues(page, scenario, theme),
        ...await layoutIssues(page),
      ];
      await page.screenshot({ path: path.join(output, `${runName}-viewport.png`), scale: "css" });
      await page.screenshot({ path: path.join(output, `${runName}.png`), fullPage: true, scale: "css" });
      await page.locator("marao-card").filter({
        has: page.locator(".title").filter({ hasText: /^\s*Lock access\s*$/ }),
      }).first().locator("[data-card-action]").click();
      await page.waitForTimeout(300);
      await applyVisualPreferences(page, scenario, theme);
      issues = issues.concat(await layoutIssues(page));
      await page.screenshot({ path: path.join(output, `${runName}-popup.png`), scale: "css" });
      if (errors.length || issues.length) throw new Error(`${runName} failed:\n${[...errors, ...issues].map((item) => `- ${item}`).join("\n")}`);
      await context.close();
    }
    if (!options.preview) console.log(`Accessibility layout OK (${runs.length} mobile profile/theme runs; screenshots in ${output})`);
  } finally {
    if (browser.isConnected()) await browser.close();
  }
}

if (require.main === module) main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });

module.exports = {
  applyVisualPreferences,
  configurePageEmulation,
  contextOptionsForScenario,
  effectiveViewport,
  emulationIssues,
  frontendRegistrationIssues,
  layoutIssues,
  parseArgs,
  safeAreaInsetsForScenario,
  scenarios,
  selectedRuns,
  themeVariables,
  themes,
  visualVariablesForScenario,
};
