const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, ".ha-local.json");

async function request(method, url, options = {}) {
  const target = new URL(url);
  const transport = target.protocol === "https:" ? require("https") : require("http");
  const body = options.body || "";

  return new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      {
        method,
        headers: {
          "Content-Length": Buffer.byteLength(body),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`${method} ${target.pathname} returned ${res.statusCode}: ${data}`));
            return;
          }
          resolve(data ? JSON.parse(data) : {});
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function getAccessToken(config, baseUrl) {
  const clientId = `${baseUrl}/`;
  const flow = await request("POST", `${baseUrl}/auth/login_flow`, {
    body: JSON.stringify({
      client_id: clientId,
      handler: ["homeassistant", null],
      redirect_uri: `${baseUrl}/?auth_callback=1`,
    }),
    headers: { "Content-Type": "application/json" },
  });
  const login = await request("POST", `${baseUrl}/auth/login_flow/${flow.flow_id}`, {
    body: JSON.stringify({
      client_id: clientId,
      username: config.username,
      password: config.password,
    }),
    headers: { "Content-Type": "application/json" },
  });
  const token = await request("POST", `${baseUrl}/auth/token`, {
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: login.result,
      client_id: clientId,
    }).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return {
    ...token,
    hassUrl: baseUrl,
    clientId,
    expires: Date.now() + token.expires_in * 1000,
  };
}

async function callService(baseUrl, token, domain, service, data) {
  await request("POST", `${baseUrl}/api/services/${domain}/${service}`, {
    body: JSON.stringify(data),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

function readConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error("Missing .ha-local.json. Copy .ha-local.example.json and adjust it first.");
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  for (const key of ["url", "username", "password"]) {
    if (!config[key] || typeof config[key] !== "string") {
      throw new Error(`.ha-local.json requires a string ${key}.`);
    }
  }
  return config;
}

async function main() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    throw new Error("Playwright is not installed. Run npm install before npm run test:ha:e2e.");
  }

  const config = readConfig();
  const baseUrl = config.url.replace(/\/$/, "");
  const tokens = await getAccessToken(config, baseUrl);
  const token = tokens.access_token;
  const failures = [];
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" ||
      /custom element doesn't exist|failed to load resource|must be migrated|migration available|bubble card v3\.2\.0/i.test(text)
    ) {
      failures.push(`console ${message.type()}: ${text}`);
    }
  });
  page.on("pageerror", (error) => failures.push(`page error: ${error.message}`));

  try {
    await callService(baseUrl, token, "light", "turn_on", {
      entity_id: "light.marao_dashboard_test_light",
      brightness_pct: 1,
    });
    await callService(baseUrl, token, "fan", "turn_on", {
      entity_id: "fan.marao_dashboard_test_fan",
      percentage: 50,
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.evaluate((value) => localStorage.setItem("hassTokens", JSON.stringify(value)), tokens);

    await page.goto(`${baseUrl}/marao-dashboard-card-test/card-test`, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForFunction(() => {
        const visit = (root) => {
          for (const child of root?.children || []) {
            if (child.localName === "marao-state-timeline-card" || visit(child.shadowRoot) || visit(child)) return true;
          }
          return false;
        };
        return visit(document);
      }, { timeout: 10000 });
    } catch (error) {
      const diagnostic = await page.evaluate(() => {
        const found = [];
        const visit = (root) => {
          for (const child of root?.children || []) {
            if (/marao|error|warning/.test(child.localName)) {
              found.push({
                name: child.localName,
                text: `${child.textContent} ${child.shadowRoot?.textContent || ""}`.trim(),
                config: child._config || child.config || null,
              });
            }
            visit(child.shadowRoot);
            visit(child);
          }
        };
        visit(document);
        return found.slice(0, 20);
      });
      throw new Error(`${error.message}\nRendered diagnostics: ${JSON.stringify(diagnostic)}\nConsole diagnostics: ${failures.join("\n")}`);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => {
        const visit = (root) => {
          for (const child of root?.children || []) {
            if (child.localName === "marao-state-timeline-card" || visit(child.shadowRoot) || visit(child)) return true;
          }
          return false;
        };
        return visit(document);
      }, { timeout: 10000 });
    }

    for (const label of [
      "Light + slider",
      "Cover + slider",
      "Switch + graph",
      "Fan + slider",
      "Climate",
      "Single Mode Climate",
      "Media",
      "Sensor",
      "Battery",
      "Graph",
      "Lock state - last 24 hours",
      "Toggle graph",
      "Number",
      "Vacuum",
      "Bubble popup",
      "Room card",
    ]) {
      if ((await page.getByText(label, { exact: false }).count()) === 0) {
        failures.push(`missing expected card text: ${label}`);
      }
    }

    const sliderResults = await page.evaluate(() => {
      function allDeep(root = document) {
        const found = [];
        const visit = (node) => {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) found.push(node);
          if (node.shadowRoot) visit(node.shadowRoot);
          for (const child of node.children || []) visit(child);
        };
        visit(root);
        return found;
      }

      function slider(entityId) {
        const host = allDeep().find((element) => element.localName === "my-slider-v2" && element.config?.entity === entityId);
        if (!host) return null;
        const progress = host.shadowRoot?.querySelector(".my-slider-custom-progress");
        const progressWidth = progress?.getBoundingClientRect().width || 0;
        const hostWidth = host.getBoundingClientRect().width || 1;
        return { percent: (progressWidth / hostWidth) * 100, visible: hostWidth > 0 && progressWidth >= 0 };
      }

      return {
        light: slider("light.marao_dashboard_test_light"),
        fan: slider("fan.marao_dashboard_test_fan"),
      };
    });

    if (!sliderResults.light?.visible) {
      failures.push("light card slider is not visible");
    } else if (sliderResults.light.percent < 3.5) {
      failures.push(`light slider minimum is too far left: ${sliderResults.light.percent.toFixed(1)}%`);
    }

    if (!sliderResults.fan?.visible) {
      failures.push("fan card slider is not visible");
    }

    await page.waitForFunction(() => {
      const allDeep = (root = document, found = []) => {
        for (const child of root?.children || []) {
          found.push(child);
          allDeep(child.shadowRoot, found);
          allDeep(child, found);
        }
        return found;
      };
      const card = allDeep().find((element) => element.localName === "marao-state-timeline-card");
      const status = card?.shadowRoot?.querySelector(".status")?.textContent || "";
      return Boolean(card?.shadowRoot?.querySelector(".plot")) || (status && !/loading|carregar/i.test(status));
    }, { timeout: 30000 });
    const timelineResult = await page.evaluate(async () => {
      const allDeep = (root = document, found = []) => {
        for (const child of root?.children || []) {
          found.push(child);
          allDeep(child.shadowRoot, found);
          allDeep(child, found);
        }
        return found;
      };
      const card = allDeep().find((element) => element.localName === "marao-state-timeline-card");
      const plot = card?.shadowRoot?.querySelector(".plot");
      if (!plot) return { status: card?.shadowRoot?.querySelector(".status")?.textContent || "missing" };
      const bounds = plot.getBoundingClientRect();
      plot.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + bounds.height / 2,
        pointerType: "mouse",
      }));
      const originalWidth = card.style.width;
      card.style.width = "160px";
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const labels = [...plot.querySelectorAll(".tick b")].map((label) => label.getBoundingClientRect());
      const labelOverlap = labels.some((label, index) => {
        const next = labels[index + 1];
        return next && label.right > next.left && label.bottom > next.top && next.bottom > label.top;
      });
      const staggered = plot.classList.contains("staggered");
      card.style.width = originalWidth;
      return {
        height: bounds.height,
        width: bounds.width,
        ticks: plot.querySelectorAll(".tick").length,
        tracking: plot.classList.contains("tracking"),
        tooltip: plot.querySelector(".tooltip")?.innerText || "",
        labelOverlap,
        staggered,
      };
    });
    if (timelineResult?.status) {
      failures.push(`state timeline did not render history: ${timelineResult.status}`);
    } else if (!timelineResult || timelineResult.height < 44 || timelineResult.width < 250) {
      failures.push(`state timeline touch surface is too small: ${JSON.stringify(timelineResult)}`);
    } else if (timelineResult.ticks !== 7) {
      failures.push(`state timeline rendered ${timelineResult.ticks} ticks instead of 7`);
    } else if (!timelineResult.staggered || timelineResult.labelOverlap) {
      failures.push(`state timeline labels overlap at narrow widths: ${JSON.stringify(timelineResult)}`);
    } else if (!timelineResult.tracking || !timelineResult.tooltip.includes("\n")) {
      failures.push("state timeline did not show its timestamp and state tooltip");
    }

    const climateResult = await page.evaluate(() => {
      function allDeep(root = document) {
        const found = [];
        const visit = (node) => {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) found.push(node);
          if (node.shadowRoot) visit(node.shadowRoot);
          for (const child of node.children || []) visit(child);
        };
        visit(root);
        return found;
      }

      const button = allDeep().find(
        (element) =>
          element.localName === "button-card" &&
          element.config?.entity === "climate.marao_dashboard_test_climate" &&
          element.config?.variables?.mode_selector_hash === "#climate-mode-test"
      );
      const hass = document.querySelector("home-assistant")?.hass;
      const modes = hass?.states["climate.marao_dashboard_test_climate"]?.attributes?.hvac_modes || [];
      button?.click();
      return { clicked: Boolean(button), modes };
    });

    if (!climateResult.clicked) {
      failures.push("climate card with mode popup was not found");
    } else {
      await page.waitForTimeout(500);
      if (new URL(page.url()).hash !== "#climate-mode-test") {
        failures.push("climate card did not navigate to #climate-mode-test");
      }
      if ((await page.getByText("Climate Mode", { exact: false }).count()) === 0) {
        failures.push("climate mode popup did not open");
      }

      const modeLabels = await page.evaluate(() => {
        const hass = document.querySelector("home-assistant")?.hass;
        return {
          off: window.MaraoDashboard?.localize?.("climate.mode.off", hass) || "Off",
          heat_cool: window.MaraoDashboard?.localize?.("climate.mode.heat_cool", hass) || "Heat/Cool",
          auto: window.MaraoDashboard?.localize?.("climate.mode.auto", hass) || "Auto",
          cool: window.MaraoDashboard?.localize?.("climate.mode.cool", hass) || "Cool",
          heat: window.MaraoDashboard?.localize?.("climate.mode.heat", hass) || "Heat",
          fan_only: window.MaraoDashboard?.localize?.("climate.mode.fan_only", hass) || "Fan",
          dry: window.MaraoDashboard?.localize?.("climate.mode.dry", hass) || "Dry",
        };
      });
      const supportedLabels = climateResult.modes.map((mode) => modeLabels[mode] || mode);
      const renderedModeButtons = await page.evaluate(() => {
        function allDeep(root = document) {
          const found = [];
          const visit = (node) => {
            if (!node) return;
            if (node.nodeType === Node.ELEMENT_NODE) found.push(node);
            if (node.shadowRoot) visit(node.shadowRoot);
            for (const child of node.children || []) visit(child);
          };
          visit(root);
          return found;
        }

        const popupClimateCard = allDeep().find(
          (element) =>
            element.localName === "button-card" &&
            element.config?.entity === "climate.marao_dashboard_test_climate" &&
            element.config?.variables?.show_mode_buttons === true
        );
        return allDeep(popupClimateCard?.shadowRoot || popupClimateCard)
          .filter((element) => element.localName === "button")
          .map((element) => element.textContent.trim())
          .filter(Boolean);
      });

      if (renderedModeButtons.length !== supportedLabels.length) {
        failures.push(
          `climate popup rendered ${renderedModeButtons.length} mode buttons for ${supportedLabels.length} modes`
        );
      }
      for (const label of supportedLabels) {
        if (!renderedModeButtons.includes(label)) {
          failures.push(`supported climate mode button is missing: ${label}`);
        }
      }
      for (const label of Object.entries(modeLabels)
        .filter(([mode]) => !climateResult.modes.includes(mode))
        .map(([, label]) => label)) {
        if (renderedModeButtons.includes(label)) {
          failures.push(`unsupported climate mode button is visible: ${label}`);
        }
      }
    }

    await page.goto(`${baseUrl}/marao-dashboard-card-test/card-test`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const singleModeResult = await page.evaluate(() => {
      function allDeep(root = document) {
        const found = [];
        const visit = (node) => {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) found.push(node);
          if (node.shadowRoot) visit(node.shadowRoot);
          for (const child of node.children || []) visit(child);
        };
        visit(root);
        return found;
      }

      const button = allDeep().find(
        (element) =>
          element.localName === "button-card" &&
          element.config?.entity === "climate.marao_dashboard_test_single_mode_climate"
      );
      const hass = document.querySelector("home-assistant")?.hass;
      const modes = hass?.states["climate.marao_dashboard_test_single_mode_climate"]?.attributes?.hvac_modes || [];
      const tapAction = button?._config?.tap_action || button?.config?.tap_action;
      button?.click();
      return { clicked: Boolean(button), modes, tapAction };
    });

    if (!singleModeResult.clicked) {
      failures.push("single mode climate card was not found");
    } else {
      if (singleModeResult.modes.length !== 1) {
        failures.push(`single mode climate entity has ${singleModeResult.modes.length} modes`);
      }
      await page.waitForTimeout(500);
      if (new URL(page.url()).hash === "#single-mode-climate-should-not-open") {
        failures.push("single mode climate card opened a mode popup");
      }
      if (singleModeResult.tapAction?.service !== "climate.toggle") {
        failures.push("single mode climate card is not configured to toggle");
      }
    }

    const bodyText = await page.locator("body").innerText();
    for (const pattern of [
      /custom element doesn't exist/i,
      /must be migrated/i,
      /migration available/i,
      /hui-error-card/i,
      /entity not available/i,
    ]) {
      if (pattern.test(bodyText)) {
        failures.push(`visible dashboard error matched ${pattern}`);
      }
    }

    const errorCards = await page.evaluate(() => {
      const found = [];
      const visit = (root) => {
        for (const child of root?.children || []) {
          if (["hui-error-card", "hui-warning"].includes(child.localName)) {
            found.push({ text: child.shadowRoot?.textContent?.trim() || child.textContent?.trim(), config: child._config || null });
          }
          visit(child.shadowRoot);
          visit(child);
        }
      };
      visit(document);
      return found;
    });
    if (errorCards.length > 0) {
      failures.push(`visible HA error/warning cards: ${JSON.stringify(errorCards)}`);
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error("Marao Dashboard dashboard e2e failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Marao Dashboard dashboard e2e OK");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
