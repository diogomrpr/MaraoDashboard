const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, ".ha-local.json");
const timeoutMs = 15000;

function request(method, url, options = {}) {
  const target = new URL(url);
  const transport = target.protocol === "https:" ? require("https") : require("http");
  const body = options.body || "";
  return new Promise((resolve, reject) => {
    const req = transport.request(target, {
      method,
      headers: { "Content-Length": Buffer.byteLength(body), ...(options.headers || {}) },
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`${method} ${target.pathname} returned ${res.statusCode}: ${data}`));
          return;
        }
        resolve(data ? JSON.parse(data) : {});
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`${method} ${target.pathname} timed out`)));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function accessToken(config, baseUrl) {
  const clientId = `${baseUrl}/`;
  const flow = await request("POST", `${baseUrl}/auth/login_flow`, {
    body: JSON.stringify({ client_id: clientId, handler: ["homeassistant", null], redirect_uri: `${baseUrl}/?auth_callback=1` }),
    headers: { "Content-Type": "application/json" },
  });
  const login = await request("POST", `${baseUrl}/auth/login_flow/${flow.flow_id}`, {
    body: JSON.stringify({ client_id: clientId, username: config.username, password: config.password }),
    headers: { "Content-Type": "application/json" },
  });
  return request("POST", `${baseUrl}/auth/token`, {
    body: new URLSearchParams({ grant_type: "authorization_code", code: login.result, client_id: clientId }).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

function readConfig() {
  if (!fs.existsSync(configPath)) throw new Error("Missing .ha-local.json.");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  for (const key of ["url", "username", "password"]) {
    if (typeof config[key] !== "string" || !config[key]) throw new Error(`.ha-local.json requires ${key}.`);
  }
  return config;
}

function normalizedPathname(value) {
  const pathname = new URL(value).pathname;
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

function conditionalCardIsActive(card, entityStates = {}) {
  if (card?.type !== "conditional") return true;
  return (card.conditions || []).every((condition) => {
    const actual = entityStates[condition?.entity];
    if (actual === undefined) return false;
    if (condition.state !== undefined) return (Array.isArray(condition.state) ? condition.state : [condition.state]).includes(actual);
    if (condition.state_not !== undefined) return !(Array.isArray(condition.state_not) ? condition.state_not : [condition.state_not]).includes(actual);
    return false;
  });
}

function buildViewChecks(dashboard, dashboardUrl, entityStates = {}) {
  const walk = (value, counts) => {
    if (Array.isArray(value)) return value.forEach((item) => walk(item, counts));
    if (!value || typeof value !== "object") return;
    if (value.type === "conditional") {
      if (conditionalCardIsActive(value, entityStates)) walk(value.card, counts);
      return;
    }
    if (value.type === "custom:marao-card") counts["marao-card"] = (counts["marao-card"] || 0) + 1;
    if (value.type === "custom:marao-popup-card") counts["marao-popup-card"] = (counts["marao-popup-card"] || 0) + 1;
    if (value.type === "custom:marao-navbar-card") counts["marao-navbar-card"] = (counts["marao-navbar-card"] || 0) + 1;
    Object.values(value).forEach((item) => walk(item, counts));
  };
  return (dashboard.views || []).map((view, index) => {
    const configuredCounts = {};
    walk(view.cards || [], configuredCounts);
    const pathName = String(view.path ?? index).replace(/^\/+/, "");
    return { name: view.title || pathName, path: pathName, url: `/${String(dashboardUrl).split("/").filter(Boolean)[0]}/${pathName}`, configuredCounts };
  });
}

async function main() {
  let chromium;
  try { ({ chromium } = require("playwright")); } catch { throw new Error("Playwright is not installed."); }
  const config = readConfig();
  const baseUrl = config.url.replace(/\/$/, "");
  const tokens = await accessToken(config, baseUrl);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript((value) => localStorage.setItem("hassTokens", JSON.stringify(value)), {
    ...tokens, hassUrl: baseUrl, clientId: `${baseUrl}/`, expires: Date.now() + tokens.expires_in * 1000,
  });
  await context.addInitScript(() => {
    window.__maraoHaptics = [];
    window.addEventListener("haptic", (event) => window.__maraoHaptics.push(event.detail));
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) errors.push(message.text()); });
  const deepSnapshot = () => page.evaluate(() => {
    const elements = [];
    const visit = (root) => {
      for (const child of root?.children || []) { elements.push(child); visit(child.shadowRoot); visit(child); }
    };
    visit(document.documentElement);
    return {
      tags: elements.map((element) => element.localName),
      errors: elements.filter((element) => element.localName === "hui-error-card").map((element) => element.textContent?.trim() || "error"),
      warnings: elements.filter((element) => element.localName === "hui-warning").map((element) => element.textContent?.trim() || "warning"),
      nav: elements.some((element) => element.localName === "marao-navbar-card"),
      maraoCards: elements.filter((element) => element.localName === "marao-card").length,
      popups: elements.filter((element) => element.localName === "marao-popup-card").length,
    };
  });
  try {
    await page.goto(`${baseUrl}/marao-dashboard/overview`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const overview = await deepSnapshot();
    if (overview.errors.length || overview.warnings.length) throw new Error(`Overview rendered warnings/errors: ${JSON.stringify(overview)}`);
    if (!overview.nav) throw new Error("Overview did not render custom:marao-navbar-card.");

    const dashboard = await page.evaluate(async () => {
      const hass = document.querySelector("home-assistant")?.hass;
      if (!hass) throw new Error("Home Assistant frontend API unavailable.");
      const payload = await hass.callWS({ type: "marao_dashboard/config/get" });
      const url = payload.dashboard_url || "/marao-dashboard/overview";
      const key = url.split("/").filter(Boolean)[0];
      return {
        payload,
        config: await hass.callWS({ type: "lovelace/config", url_path: key, force: true }),
        cardTest: await hass.callWS({ type: "lovelace/config", url_path: "marao-dashboard-card-test", force: true }),
        states: Object.fromEntries(Object.entries(hass.states || {}).map(([entity, state]) => [entity, state.state])),
      };
    });
    const serialized = JSON.stringify(dashboard.config);
    for (const type of ["custom:marao-card", "custom:marao-navbar-card"]) {
      if (!serialized.includes(type)) throw new Error(`Generated dashboard is missing ${type}.`);
    }
    if (["custom:button-card", "custom:bubble-card", "custom:navbar-card"].some((type) => serialized.includes(type))) {
      throw new Error("Generated dashboard still references a retired upstream card.");
    }
    const checks = buildViewChecks(dashboard.config, dashboard.payload.dashboard_url, dashboard.states);
    for (const view of checks) {
      await page.goto(`${baseUrl}/${view.url}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      const result = await deepSnapshot();
      if (result.errors.length || result.warnings.length) throw new Error(`${view.name} rendered warnings/errors: ${JSON.stringify(result)}`);
      if (!result.nav) throw new Error(`${view.name} did not render custom:marao-navbar-card.`);
    }
    const cardTestSerialized = JSON.stringify(dashboard.cardTest);
    for (const type of ["custom:marao-card", "custom:marao-popup-card", "custom:marao-navbar-card"]) {
      if (!cardTestSerialized.includes(type)) throw new Error(`Card test dashboard is missing ${type}.`);
    }
    await page.goto(`${baseUrl}/marao-dashboard-card-test/card-test`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const cardTest = await deepSnapshot();
    if (cardTest.errors.length || cardTest.warnings.length) throw new Error(`Card test dashboard rendered warnings/errors: ${JSON.stringify(cardTest)}`);
    if (!cardTest.nav || cardTest.maraoCards < 10 || cardTest.popups < 1) throw new Error(`Card test dashboard rendered too few Marao cards: ${JSON.stringify(cardTest)}`);
    const historyGraphs = page.locator("hui-history-graph-card");
    if (await historyGraphs.count() < 3) throw new Error("Card test dashboard did not render its native history graphs.");
    const renderedGraphs = await historyGraphs.evaluateAll((cards) => cards.filter((card) => {
      const canvases = [];
      const visit = (root) => {
        root?.querySelectorAll?.("canvas").forEach((canvas) => canvases.push(canvas));
        root?.querySelectorAll?.("*").forEach((element) => element.shadowRoot && visit(element.shadowRoot));
      };
      visit(card.shadowRoot);
      return canvases.some((canvas) => canvas.width > 0 && canvas.height > 0);
    }).length);
    if (renderedGraphs < 3) throw new Error(`Only ${renderedGraphs} native history graphs created a visible chart canvas.`);
    const coloredCards = await page.evaluate(() => {
      const cards = [];
      const visit = (root) => {
        for (const child of root?.children || []) {
          if (child.localName === "marao-card") {
            const card = child.shadowRoot?.querySelector("ha-card");
            if (card?.style.getPropertyValue("--marao-card-background")) cards.push(card);
          }
          visit(child.shadowRoot);
          visit(child);
        }
      };
      visit(document.documentElement);
      return cards.length;
    });
    if (coloredCards < 4) throw new Error(`Card test dashboard did not apply state colors (${coloredCards} colored cards).`);
    const climatePalette = Object.fromEntries(await page.locator("marao-card").evaluateAll((cards) => cards.map((card) => [
      card.shadowRoot?.querySelector(".title")?.textContent?.trim(),
      card.shadowRoot?.querySelector("ha-card")?.style.getPropertyValue("--marao-card-background"),
    ]).filter(([name]) => name?.startsWith("Climate · "))));
    const expectedClimatePalette = {
      "Climate · Heat": "var(--color-red)",
      "Climate · Cool": "var(--color-blue)",
      "Climate · Heat/Cool": "var(--color-purple)",
      "Climate · Auto": "var(--color-gold)",
      "Climate · Dry": "var(--color-yellow)",
      "Climate · Fan": "var(--color-green)",
      "Climate · Off": "",
    };
    if (JSON.stringify(climatePalette) !== JSON.stringify(expectedClimatePalette)) {
      throw new Error(`Climate state palette did not render correctly: ${JSON.stringify(climatePalette)}`);
    }
    await page.locator('marao-card input[type="range"]').first().dispatchEvent("pointerdown");
    if (await page.evaluate(() => window.__maraoHaptics.at(-1)) !== "heavy") {
      throw new Error("Slider presses must emit strong haptic feedback.");
    }
    const sliderProgress = await page.evaluate(() => {
      const sliders = [];
      const visit = (root) => {
        root?.querySelectorAll?.('input[type="range"]').forEach((input) => {
          const track = input.parentElement?.querySelector(".slider-track");
          const fill = track?.querySelector(".slider-fill");
          const trackWidth = track?.getBoundingClientRect().width || 0;
          const fillWidth = fill?.getBoundingClientRect().width || 0;
          const progress = Number.parseFloat(input.style.getPropertyValue("--marao-slider-progress")) || 0;
          sliders.push({
            label: input.getAttribute("aria-label"),
            target: Number(input.value),
            current: Number(input.dataset.sliderCurrent ?? input.value),
            progress: input.style.getPropertyValue("--marao-slider-progress"),
            trackRadius: track ? getComputedStyle(track).borderRadius : "",
            fillRadius: fill ? getComputedStyle(fill).borderRadius : "",
            fillWidth,
            expectedFillWidth: trackWidth ? Math.min(trackWidth, 28 + (progress / 100) * Math.max(0, trackWidth - 28)) : 0,
          });
        });
        root?.querySelectorAll?.("*").forEach((element) => element.shadowRoot && visit(element.shadowRoot));
      };
      visit(document);
      return sliders;
    });
    if (sliderProgress.some((slider) => !slider.progress)) throw new Error(`Card test sliders did not render live progress fills: ${JSON.stringify(sliderProgress)}`);
    if (sliderProgress.some((slider) => slider.trackRadius !== "14px" || slider.fillRadius !== "14px")) {
      throw new Error(`Card test sliders did not render rounded tracks: ${JSON.stringify(sliderProgress)}`);
    }
    if (sliderProgress.some((slider) => Math.abs(slider.fillWidth - slider.expectedFillWidth) > 2)) {
      throw new Error(`Card test slider fills did not meet the thumb edge: ${JSON.stringify(sliderProgress)}`);
    }
    const independentSlider = page.locator('input[aria-label="position"]');
    await independentSlider.fill("60");
    const independentCheck = await independentSlider.evaluate((input) => ({
      target: Number(input.value),
      current: Number(input.dataset.sliderCurrent),
      progress: Number.parseFloat(input.style.getPropertyValue("--marao-slider-progress")),
    }));
    if (independentCheck.target !== 60 || independentCheck.current <= independentCheck.target || independentCheck.progress > independentCheck.target) {
      throw new Error(`Cover slider progress exceeded its target thumb: ${JSON.stringify(independentCheck)}`);
    }
    await page.getByText("Bubble popup", { exact: true }).click();
    await page.waitForTimeout(50);
    const popupLayout = await page.evaluate(() => {
      const sheet = document.querySelector(".marao-popup-sheet");
      const columns = [];
      const visit = (root) => {
        root?.querySelectorAll?.("#columns > div:nth-child(1)").forEach((element) => columns.push(element));
        root?.querySelectorAll?.("*").forEach((element) => element.shadowRoot && visit(element.shadowRoot));
      };
      visit(document);
      if (!sheet) return null;
      const style = getComputedStyle(sheet);
      const rect = sheet.getBoundingClientRect();
      return {
        animationName: style.animationName,
        width: Math.round(rect.width),
        maxWidth: style.maxWidth,
        columnWidth: columns[0] ? Math.round(columns[0].getBoundingClientRect().width) : null,
      };
    });
    if (!popupLayout || popupLayout.animationName !== "marao-popup-slide-up") {
      throw new Error(`Card test popup did not use the slide-up animation: ${JSON.stringify(popupLayout)}`);
    }
    if (popupLayout.columnWidth && popupLayout.maxWidth !== `${popupLayout.columnWidth}px`) {
      throw new Error(`Card test popup did not match the first column width: ${JSON.stringify(popupLayout)}`);
    }
    await page.locator(".marao-popup-close").click();
    await page.getByText("Lock access", { exact: true }).click();
    const lockActionBackgrounds = await page.locator(".marao-popup-sheet marao-card").evaluateAll((cards) =>
      cards.map((card) => card.shadowRoot?.querySelector("ha-card")?.style.getPropertyValue("--marao-card-background"))
    );
    if (!lockActionBackgrounds.includes("var(--color-red)") || !lockActionBackgrounds.includes("var(--color-green)")) {
      throw new Error(`Lock popup did not render red unlock and green lock cards: ${JSON.stringify(lockActionBackgrounds)}`);
    }
    const lockSliderLabel = (await page.locator(".marao-popup-sheet marao-slide-to-open .label").innerText()).trim();
    if (!["Unlock", "Destrancar"].includes(lockSliderLabel)) {
      throw new Error(`Lock slider label must be the localized single-word Unlock label, got: ${lockSliderLabel}`);
    }
    await page.locator(".marao-popup-close").click();
    await page.getByText("Climate", { exact: true }).click();
    if ((await page.locator(".marao-popup-head h2").innerText()).trim()) {
      throw new Error("Climate mode popup still rendered a duplicate heading.");
    }
    const climateModes = page.locator(".marao-popup-sheet [data-climate-mode]");
    if (await climateModes.count() < 2) throw new Error("Multi-mode climate did not render its mode choices.");
    const climateModeLayout = await page.locator(".marao-popup-sheet .climate-modes").evaluate((element) => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
      buttonHeight: Math.round(element.querySelector("button").getBoundingClientRect().height),
      buttonFontSize: parseFloat(getComputedStyle(element.querySelector("button")).fontSize),
      labels: [...element.querySelectorAll("button")].map((button) => button.textContent.trim()),
      backgrounds: [...element.querySelectorAll("button")].map((button) => getComputedStyle(button).backgroundColor),
    }));
    if (
      climateModeLayout.columns !== 2 ||
      climateModeLayout.buttonHeight < 56 ||
      climateModeLayout.buttonFontSize < 18 ||
      new Set(climateModeLayout.backgrounds).size !== 1 ||
      climateModeLayout.labels.some((label) => label[0] !== label[0].toUpperCase())
    ) {
      throw new Error(`Climate modes must use a large two-column grid: ${JSON.stringify(climateModeLayout)}`);
    }
    const climateStateFontSize = await page.locator(".marao-popup-sheet .climate-card .state").evaluate(
      (element) => parseFloat(getComputedStyle(element).fontSize)
    );
    if (climateStateFontSize < 18) throw new Error(`Climate state text is too small: ${climateStateFontSize}px`);
    const climateTemperature = page.locator('.marao-popup-sheet [data-number-step="increase"]').first();
    if (await climateTemperature.count() !== 1) throw new Error("Climate target temperature stepper did not render.");
    const climateSetpointContrast = await page.locator(".marao-popup-sheet .climate-stepper").evaluate((element) => {
      const rgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = (value) => rgb(value).map((channel) => {
        channel /= 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const styles = getComputedStyle(element);
      const light = Math.max(luminance(styles.backgroundColor), luminance(styles.color));
      const dark = Math.min(luminance(styles.backgroundColor), luminance(styles.color));
      return (light + 0.05) / (dark + 0.05);
    });
    if (climateSetpointContrast < 4.5) {
      throw new Error(`Climate setpoint contrast is too low: ${climateSetpointContrast.toFixed(2)}:1`);
    }
    const climateTargetBefore = await page.locator(".marao-popup-sheet .number-value").first().innerText();
    await climateTemperature.click();
    await page.waitForTimeout(500);
    const climateTargetAfter = await page.locator(".marao-popup-sheet .number-value").first().innerText();
    if (climateTargetAfter === climateTargetBefore) throw new Error("Climate target temperature increase button did not update the target.");
    if (/[°º]/.test(climateTargetAfter)) throw new Error(`Climate target still shows a temperature unit: ${climateTargetAfter}`);
    await page.locator('.marao-popup-sheet [data-number-step="decrease"]').first().click();
    await page.waitForTimeout(500);
    await page.locator(".marao-popup-close").click();
    await page.getByText("Multi Mode Climate", { exact: true }).first().click();
    const multiModeClimateModes = page.locator(".marao-popup-sheet [data-climate-mode]");
    if (await multiModeClimateModes.count() < 6) {
      throw new Error("Multi-mode climate example did not render all common HVAC modes.");
    }
    await multiModeClimateModes.filter({ hasText: "Cool" }).click();
    await page.waitForTimeout(500);
    if ((await page.locator(".marao-popup-sheet .climate-card .state").innerText()).trim() !== "Cool") {
      throw new Error("Multi-mode climate example did not apply the selected mode.");
    }
    await page.locator(".marao-popup-close").click();
    const currentTemperature = page.locator("marao-card").filter({ hasText: "Current temperature control" }).first();
    if (await currentTemperature.locator('input[type="range"]').count()) {
      throw new Error("Number card still rendered a slider instead of the shared number stepper.");
    }
    const currentTemperatureValue = currentTemperature.locator(".number-value");
    const currentTemperatureBefore = await currentTemperatureValue.innerText();
    await currentTemperature.locator('[data-number-step="increase"]').click();
    await page.waitForTimeout(500);
    if (await page.evaluate(() => window.__maraoHaptics.at(-1)) !== "heavy") {
      throw new Error("Button presses must emit strong haptic feedback.");
    }
    const currentTemperatureAfter = await currentTemperatureValue.innerText();
    if (currentTemperatureAfter === currentTemperatureBefore) throw new Error("Number card increase button did not update its value.");
    const climateReadings = await page.evaluate(() => {
      const readings = [];
      const visit = (root) => {
        root?.querySelectorAll?.(".climate").forEach((element) => readings.push(element.textContent || ""));
        root?.querySelectorAll?.("*").forEach((element) => element.shadowRoot && visit(element.shadowRoot));
      };
      visit(document);
      return readings;
    });
    const currentTemperatureNumber = String(parseFloat(currentTemperatureAfter));
    if (!climateReadings.some((reading) => reading.includes(currentTemperatureNumber) && !/[°º]/.test(reading))) {
      throw new Error("Climate current temperature did not update without a temperature unit.");
    }
    await currentTemperature.locator('[data-number-step="decrease"]').click();
    await page.waitForTimeout(500);
    await page.getByText("Apple TV", { exact: true }).first().click();
    const remoteButtons = page.locator(".marao-popup-sheet .body.icon-only");
    if (await remoteButtons.count() < 9) throw new Error("Apple TV remote buttons did not render as icon-only controls.");
    if ((await remoteButtons.allTextContents()).some((label) => label.trim())) {
      throw new Error("Apple TV remote buttons rendered text instead of icons only.");
    }
    await page.locator(".marao-popup-close").click();
    await page.getByText("Garage door access", { exact: true }).click();
    const actionTrack = page.locator(".marao-popup-sheet marao-slide-to-open .track");
    if (await actionTrack.count() !== 1) throw new Error("Garage door popup did not render a slide-to-open control.");
    const actionBox = await actionTrack.boundingBox();
    if (!actionBox) throw new Error("Garage door slide-to-open control has no visible track.");
    await page.mouse.move(actionBox.x + 28, actionBox.y + actionBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(actionBox.x + actionBox.width - 18, actionBox.y + actionBox.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    if (await actionTrack.getAttribute("aria-valuenow") !== "0") throw new Error("Slide-to-open control did not reset after the action.");
    await page.locator(".marao-popup-close").click();
    const popupCount = (serialized.match(/custom:marao-popup-card/g) || []).length;
    console.log(`Marao Dashboard e2e OK (${checks.length} generated view(s); ${cardTest.maraoCards} card-test cards; ${coloredCards} state-colored cards; ${popupCount} generated popup configuration(s))`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });

module.exports = { accessToken, buildViewChecks, conditionalCardIsActive, normalizedPathname, readConfig };
