const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, ".ha-local.json");
const requestTimeoutMs = 15000;
const websocketTimeoutMs = 60000;
const dependencyIds = [
  "button_card",
  "my_cards",
  "kiosk_mode",
  "card_mod",
  "mini_graph_card",
  "bubble_card",
  "navbar_card",
];
const dependencyByCardType = {
  "custom:button-card": "button_card",
  "custom:my-button": "my_cards",
  "custom:my-slider": "my_cards",
  "custom:my-slider-v2": "my_cards",
  "custom:mini-graph-card": "mini_graph_card",
  "custom:bubble-card": "bubble_card",
  "custom:navbar-card": "navbar_card",
};

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
          clearTimeout(timeout);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(
              new Error(
                `${method} ${target.pathname} returned ${res.statusCode}: ${redactDiagnostic(data)}`
              )
            );
            return;
          }
          resolve(data ? JSON.parse(data) : {});
        });
      }
    );
    const timeoutMs = options.timeoutMs ?? requestTimeoutMs;
    const timeout = setTimeout(() => {
      req.destroy(new Error(`${method} ${target.pathname} timed out after ${timeoutMs} ms.`));
    }, timeoutMs);
    req.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
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
  if (
    Object.hasOwn(config, "dependencyMode") &&
    (typeof config.dependencyMode !== "string" ||
      !["auto", "missing", "installed"].includes(config.dependencyMode))
  ) {
    throw new Error('.ha-local.json dependencyMode must be "auto", "missing", or "installed".');
  }
  if (config.allowDashboardWrites !== true) {
    throw new Error(
      "Set allowDashboardWrites to true in .ha-local.json only after confirming it targets a disposable test instance."
    );
  }
  return config;
}

function redactDiagnostic(value) {
  return String(value || "").replace(
    /(?:https?:\/\/|\/)[^\s"'<>]*/gi,
    (candidate) => {
      const query = candidate.search(/[?#]/);
      return query === -1 ? candidate : `${candidate.slice(0, query)}?[redacted]`;
    }
  );
}

function safeDiagnosticUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return redactDiagnostic(value);
  }
}

function normalizedPathname(value) {
  const pathname = new URL(value).pathname;
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

function missingElementName(value) {
  return String(value || "")
    .match(/custom element doesn't exist:\s*([a-z0-9-]+)/i)?.[1]
    ?.toLowerCase();
}

function conditionalCardIsActive(card, entityStates = {}) {
  if (card?.type !== "conditional") return true;
  if (!Array.isArray(card.conditions) || card.conditions.length === 0) return false;

  return card.conditions.every((condition) => {
    if (!condition || typeof condition !== "object" || typeof condition.entity !== "string") {
      return false;
    }
    if (!Object.hasOwn(entityStates, condition.entity)) return false;
    const actual = entityStates[condition.entity];
    if (Object.hasOwn(condition, "state")) {
      const expected = Array.isArray(condition.state) ? condition.state : [condition.state];
      return expected.includes(actual);
    }
    if (Object.hasOwn(condition, "state_not")) {
      const excluded = Array.isArray(condition.state_not)
        ? condition.state_not
        : [condition.state_not];
      return !excluded.includes(actual);
    }
    return false;
  });
}

function buildViewChecks(dashboard, dashboardUrl, dependencies, entityStates = {}) {
  const dashboardPath = String(dashboardUrl || "").split("/").filter(Boolean);
  const missingIds = new Set(
    dependencies
      .filter((dependency) => dependency.status !== "installed")
      .map((dependency) => dependency.id)
  );
  const increment = (counts, key) => {
    counts[key] = (counts[key] || 0) + 1;
  };
  const collectTemplateMissingElements = (value, found, seenTemplates) => {
    if (Array.isArray(value)) {
      value.forEach((item) => collectTemplateMissingElements(item, found, seenTemplates));
      return;
    }
    if (!value || typeof value !== "object") return;

    const dependencyId = dependencyByCardType[value.type];
    if (dependencyId && missingIds.has(dependencyId)) {
      found.add(value.type.slice(7));
    }
    const templates = Array.isArray(value.template) ? value.template : [value.template];
    for (const templateName of templates.filter((item) => typeof item === "string")) {
      if (seenTemplates.has(templateName)) continue;
      const template = dashboard.button_card_templates?.[templateName];
      if (!template) continue;
      seenTemplates.add(templateName);
      collectTemplateMissingElements(template, found, seenTemplates);
    }
    for (const item of Object.values(value)) {
      collectTemplateMissingElements(item, found, seenTemplates);
    }
  };

  return (dashboard.views || []).map((view, index) => {
    const configuredCounts = {};
    const expectedMissingCounts = {};
    const expectedRenderedCounts = {};
    const allowedMissingElements = new Set();
    const visitCard = (card, shouldRender = true) => {
      if (!card || typeof card !== "object") return;

      let childrenShouldRender = shouldRender;
      if (card.type === "conditional") {
        childrenShouldRender = shouldRender && conditionalCardIsActive(card, entityStates);
      }

      const dependencyId = dependencyByCardType[card.type];
      if (dependencyId) {
        const elementName = card.type.slice(7);
        increment(configuredCounts, elementName);
        if (shouldRender && missingIds.has(dependencyId)) {
          increment(expectedMissingCounts, elementName);
          allowedMissingElements.add(elementName);
          childrenShouldRender = false;
        } else if (shouldRender) {
          increment(expectedRenderedCounts, elementName);
          if (dependencyId === "button_card") {
            collectTemplateMissingElements(card, allowedMissingElements, new Set());
          }
        }
      }
      if (Array.isArray(card.cards)) {
        card.cards.forEach((child) => visitCard(child, childrenShouldRender));
      }
      if (card.card && typeof card.card === "object") {
        visitCard(card.card, childrenShouldRender);
      }
      if (Array.isArray(card.elements)) {
        card.elements.forEach((element) =>
          visitCard(element.card || element, childrenShouldRender)
        );
      }
    };
    (view.cards || []).forEach((card) => visitCard(card));
    const viewPath = String(view.path ?? index).replace(/^\/+/, "");
    return {
      allowedMissingElements: [...allowedMissingElements],
      configuredCounts,
      expectedMissingCounts,
      expectedRenderedCounts,
      name: view.title || viewPath || `view ${index + 1}`,
      path: viewPath,
      url: `/${dashboardPath[0]}/${viewPath}`,
    };
  });
}

async function waitForSettledPage(page, diagnostics) {
  const started = Date.now();
  const deadline = started + 10000;
  let previousSignature = "";
  let quietSince = started;

  while (Date.now() < deadline) {
    const dom = await page.evaluate(() => {
      const counts = {};
      const visit = (root) => {
        for (const child of root?.children || []) {
          counts[child.localName] = (counts[child.localName] || 0) + 1;
          visit(child.shadowRoot);
          visit(child);
        }
      };
      visit(document.documentElement);
      return { counts, ready: Boolean(counts["hui-view"]) };
    });
    const signature = JSON.stringify([
      dom.counts,
      diagnostics.console.length,
      diagnostics.responses.length,
      diagnostics.pages.length,
    ]);
    if (signature !== previousSignature) {
      previousSignature = signature;
      quietSince = Date.now();
    }
    if (dom.ready && Date.now() - started >= 1500 && Date.now() - quietSince >= 1000) {
      return;
    }
    await page.waitForTimeout(150);
  }
  throw new Error("Generated dashboard did not settle within 10 seconds.");
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
  const failures = [];
  const consoleDiagnostics = [];
  const responseDiagnostics = [];
  const pageDiagnostics = [];
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(
    (value) => localStorage.setItem("hassTokens", JSON.stringify(value)),
    tokens
  );
  const page = await context.newPage();

  page.on("console", (message) => {
    const text = message.text();
    if (
      ["warning", "error"].includes(message.type()) ||
      /custom element doesn't exist|failed to load resource|must be migrated|migration available/i.test(text)
    ) {
      consoleDiagnostics.push({ type: message.type(), text: redactDiagnostic(text) });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      responseDiagnostics.push(`${response.status()} ${safeDiagnosticUrl(response.url())}`);
    }
  });
  page.on("pageerror", (error) => pageDiagnostics.push(redactDiagnostic(error.message)));

  try {
    await page.goto(`${baseUrl}/marao-dashboard-editor`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const allDeep = (root, found = []) => {
        for (const child of root?.children || []) {
          found.push(child);
          allDeep(child.shadowRoot, found);
          allDeep(child, found);
        }
        return found;
      };
      const panel = allDeep(document.documentElement).find(
        (element) => element.localName === "marao-dashboard-panel"
      );
      return panel?.shadowRoot?.querySelectorAll(".dependency-row").length === 7;
    }, undefined, { timeout: 15000 });

    await page.evaluate(() => {
      const allDeep = (root, found = []) => {
        for (const child of root?.children || []) {
          found.push(child);
          allDeep(child.shadowRoot, found);
          allDeep(child, found);
        }
        return found;
      };
      const panel = allDeep(document.documentElement).find(
        (element) => element.localName === "marao-dashboard-panel"
      );
      const button = panel?.shadowRoot?.getElementById("recheck-dependencies");
      const status = panel?.shadowRoot?.getElementById("status");
      if (!button || !status) throw new Error("Builder dependency recheck control was not found.");
      status.textContent = "";
      status.className = "status";
      button.click();
    });
    await page.waitForFunction(() => {
      const allDeep = (root, found = []) => {
        for (const child of root?.children || []) {
          found.push(child);
          allDeep(child.shadowRoot, found);
          allDeep(child, found);
        }
        return found;
      };
      const panel = allDeep(document.documentElement).find(
        (element) => element.localName === "marao-dashboard-panel"
      );
      const button = panel?.shadowRoot?.getElementById("recheck-dependencies");
      const status = panel?.shadowRoot?.getElementById("status");
      return Boolean(
        button &&
        !button.disabled &&
        Boolean(status?.textContent?.trim()) &&
        (status?.classList.contains("success") || status?.classList.contains("error"))
      );
    }, undefined, { timeout: websocketTimeoutMs });
    const recheckResult = await page.evaluate(() => {
      const allDeep = (root, found = []) => {
        for (const child of root?.children || []) {
          found.push(child);
          allDeep(child.shadowRoot, found);
          allDeep(child, found);
        }
        return found;
      };
      const panel = allDeep(document.documentElement).find(
        (element) => element.localName === "marao-dashboard-panel"
      );
      const status = panel?.shadowRoot?.getElementById("status");
      return {
        ok: Boolean(status?.classList.contains("success")),
        text: status?.textContent?.trim() || "",
      };
    });
    if (!recheckResult.ok) {
      throw new Error(`Builder dependency recheck failed: ${recheckResult.text || "unknown error"}`);
    }

    const inspection = await page.evaluate(async ({ timeoutMs }) => {
      const allDeep = (root, found = []) => {
        for (const child of root?.children || []) {
          found.push(child);
          allDeep(child.shadowRoot, found);
          allDeep(child, found);
        }
        return found;
      };
      const homeAssistant = document.querySelector("home-assistant");
      const hass = homeAssistant?.hass;
      if (!hass) throw new Error("Home Assistant frontend did not expose its runtime API.");

      const callWSWithTimeout = (message) => new Promise((resolve, reject) => {
        const timer = window.setTimeout(
          () => reject(new Error(`Timed out waiting for ${message.type}.`)),
          timeoutMs
        );
        try {
          hass.callWS(message).then(
            (result) => {
              window.clearTimeout(timer);
              resolve(result);
            },
            (error) => {
              window.clearTimeout(timer);
              reject(error);
            }
          );
        } catch (error) {
          window.clearTimeout(timer);
          reject(error);
        }
      });

      const payload = await callWSWithTimeout({ type: "marao_dashboard/config/get" });
      const generated = await callWSWithTimeout({
        type: "marao_dashboard/config/generate",
        config: payload.config,
      });
      const generatedDependencies = generated.dependencies || [];
      const dependencies = generatedDependencies.length
        ? generatedDependencies
        : payload.dependencies || [];
      const dashboardUrl = generated.dashboard_url || payload.dashboard_url;
      const dashboardPath = String(dashboardUrl || "").split("/").filter(Boolean);
      const dashboard = await callWSWithTimeout({
        type: "lovelace/config",
        url_path: dashboardPath[0],
        force: true,
      });
      const repairPayload = await callWSWithTimeout({ type: "repairs/list_issues" });
      const maraoRepairs = (
        Array.isArray(repairPayload) ? repairPayload : repairPayload.issues || []
      ).filter((issue) => issue.domain === "marao_dashboard");
      const panel = allDeep(document.documentElement).find(
        (element) => element.localName === "marao-dashboard-panel"
      );
      const rows = [...(panel?.shadowRoot?.querySelectorAll(".dependency-row") || [])].map(
        (row) => ({
          id: row.dataset.dependencyId,
          required: Boolean(row.querySelector(".is-required")),
          status: row.querySelector(".is-installed") ? "installed" : "not_detected",
          hacsUrl: row.querySelector('a[href*="hacs_repository"]')?.href || "",
        })
      );
      const rechecked = rows.map(({ id, required, status }) => ({ id, required, status }));
      const saveButton = panel?.shadowRoot?.getElementById("save");
      const openDashboard = panel?.shadowRoot?.getElementById("open-dashboard");

      const popups = [];
      const conditionalStates = {};
      const visitConfig = (value, configPath = []) => {
        if (Array.isArray(value)) {
          value.forEach((item, index) => visitConfig(item, [...configPath, index]));
          return;
        }
        if (!value || typeof value !== "object") return;
        if (value.type === "custom:bubble-card" && value.card_type === "pop-up") {
          popups.push({
            path: configPath.join("."),
            hash: value.hash || "",
            standalone: Array.isArray(value.cards),
          });
        }
        if (value.type === "conditional" && Array.isArray(value.conditions)) {
          for (const condition of value.conditions) {
            if (typeof condition?.entity === "string" && hass.states[condition.entity]) {
              conditionalStates[condition.entity] = hass.states[condition.entity].state;
            }
          }
        }
        for (const [key, item] of Object.entries(value)) {
          visitConfig(item, [...configPath, key]);
        }
      };
      visitConfig(dashboard);

      return {
        conditionalStates,
        dashboard,
        dashboardUrl,
        dependencies,
        generatedDependencies,
        maraoRepairs,
        openDashboardUrl: openDashboard?.getAttribute("href") || "",
        popups,
        rechecked,
        rows,
        saveDisabled: !saveButton || saveButton.disabled === true,
      };
    }, { timeoutMs: websocketTimeoutMs });
    inspection.viewChecks = buildViewChecks(
      inspection.dashboard,
      inspection.dashboardUrl,
      inspection.dependencies,
      inspection.conditionalStates
    );

    const actualIds = inspection.dependencies.map((dependency) => dependency.id);
    if (JSON.stringify(actualIds) !== JSON.stringify(dependencyIds)) {
      failures.push(`dependency catalog mismatch: ${JSON.stringify(actualIds)}`);
    }
    for (const dependency of inspection.dependencies) {
      for (const field of [
        "id",
        "name",
        "repository",
        "hacs_url",
        "tested_version",
        "used_by",
        "required",
        "status",
      ]) {
        if (!(field in dependency)) failures.push(`${dependency.id || "dependency"} is missing ${field}`);
      }
      if (!dependency.hacs_url?.includes("hacs_repository")) {
        failures.push(`${dependency.id} has no direct HACS installation URL`);
      }
      if (!inspection.rows.some((row) =>
        row.id === dependency.id &&
        row.required === dependency.required &&
        row.status === dependency.status &&
        row.hacsUrl.includes("hacs_repository")
      )) {
        failures.push(`builder checklist does not match ${dependency.id}`);
      }
      for (const [source, statuses] of [
        ["recheck", inspection.rechecked],
        ["generation", inspection.generatedDependencies],
      ]) {
        const checked = statuses.find((item) => item.id === dependency.id);
        if (!checked || checked.status !== dependency.status || checked.required !== dependency.required) {
          failures.push(`${source} dependency status does not match ${dependency.id}`);
        }
      }
    }
    if (inspection.saveDisabled) failures.push("Save & Generate is disabled after loading the builder");
    if (inspection.openDashboardUrl !== inspection.dashboardUrl) {
      failures.push(
        `builder dashboard link is ${inspection.openDashboardUrl}, expected ${inspection.dashboardUrl}`
      );
    }
    for (const popup of inspection.popups.filter((item) => !item.standalone)) {
      failures.push(`legacy Bubble Card popup at ${popup.path} (${popup.hash || "no hash"})`);
    }
    if (!inspection.dashboardUrl?.startsWith("/")) {
      failures.push(`generation returned an invalid dashboard URL: ${inspection.dashboardUrl}`);
    }
    if (inspection.viewChecks.length === 0) {
      failures.push("generated dashboard contains no views");
    }
    const configuredCardCount = inspection.viewChecks.reduce(
      (total, view) => total + Object.values(view.configuredCounts).reduce((sum, count) => sum + count, 0),
      0
    );
    if (configuredCardCount === 0) {
      failures.push("generated dashboard contains no recognized dashboard cards");
    }

    const missingDependencies = inspection.dependencies.filter(
      (dependency) => dependency.status !== "installed"
    );
    const requiredMissingDependencies = missingDependencies.filter(
      (dependency) => dependency.required
    );
    const dependencyRepairs = inspection.maraoRepairs.filter(
      (issue) => issue.issue_id === "missing_dashboard_dependencies"
    );
    if (requiredMissingDependencies.length > 0) {
      if (dependencyRepairs.length !== 1) {
        failures.push(
          `expected one aggregated missing-dependency Repair, found ${dependencyRepairs.length}`
        );
      } else if (dependencyRepairs[0].is_fixable !== false) {
        failures.push("missing-dependency Repair must be non-fixable");
      }
    } else if (dependencyRepairs.length > 0) {
      failures.push("missing-dependency Repair remained after all required cards were detected");
    }
    for (const issue of inspection.maraoRepairs.filter(
      (item) => item.issue_id !== "missing_dashboard_dependencies"
    )) {
      failures.push(`unexpected Marao Repair remained: ${issue.issue_id || "unknown"}`);
    }
    if (config.dependencyMode === "missing" && missingDependencies.length !== dependencyIds.length) {
      failures.push("local test config expects all seven dependencies to be not detected");
    }
    if (config.dependencyMode === "installed" && missingDependencies.length > 0) {
      failures.push(
        `local test config expects all seven dependencies installed: ${missingDependencies
          .map((item) => item.name)
          .join(", ")}`
      );
    }
    for (const diagnostic of consoleDiagnostics) {
      failures.push(`builder console ${diagnostic.type}: ${diagnostic.text}`);
    }
    for (const diagnostic of responseDiagnostics) {
      failures.push(`builder response error: ${diagnostic}`);
    }
    for (const diagnostic of pageDiagnostics) {
      failures.push(`builder page error: ${diagnostic}`);
    }
    if (failures.length > 0) {
      throw new Error(`Marao Dashboard builder e2e failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
    }

    for (const view of inspection.viewChecks) {
      consoleDiagnostics.length = 0;
      responseDiagnostics.length = 0;
      pageDiagnostics.length = 0;
      const targetUrl = `${baseUrl}${view.url}`;
      try {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
        await waitForSettledPage(page, {
          console: consoleDiagnostics,
          responses: responseDiagnostics,
          pages: pageDiagnostics,
        });
      } catch (error) {
        failures.push(`${view.name}: ${redactDiagnostic(error.message)}`);
        continue;
      }
      const actualPath = normalizedPathname(page.url());
      const expectedPath = normalizedPathname(targetUrl);
      if (actualPath !== expectedPath) {
        failures.push(`${view.name}: opened ${actualPath}, expected ${expectedPath}`);
      }

      const rendered = await page.evaluate(() => {
        const allDeep = (root, found = []) => {
          for (const child of root?.children || []) {
            found.push(child);
            allDeep(child.shadowRoot, found);
            allDeep(child, found);
          }
          return found;
        };
        const elements = allDeep(document.documentElement);
        const elementCounts = {};
        for (const element of elements) {
          elementCounts[element.localName] = (elementCounts[element.localName] || 0) + 1;
        }
        const diagnosticText = (element) => [
          element.shadowRoot?.textContent,
          element.textContent,
          element._config?.message,
          element._config?.error,
          element.config?.message,
          element.config?.error,
        ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
        return {
          elementCounts,
          errors: elements
            .filter((element) => element.localName === "hui-error-card")
            .map(diagnosticText),
          migrationNotice: elements.some(
            (element) => element.id === "bubble-card-migration-notice-host"
          ),
          warnings: elements
            .filter((element) => element.localName === "hui-warning")
            .map(diagnosticText),
        };
      });
      const prefix = `${view.name} (${view.path})`;
      const errors = rendered.errors.map(redactDiagnostic);
      const warnings = rendered.warnings.map(redactDiagnostic);
      for (const warning of warnings) {
        failures.push(`${prefix}: visible Home Assistant warning: ${warning}`);
      }
      if (rendered.migrationNotice) {
        failures.push(`${prefix}: Bubble Card displayed its legacy popup migration warning`);
      }
      for (const diagnostic of pageDiagnostics) failures.push(`${prefix}: page error: ${diagnostic}`);
      for (const diagnostic of responseDiagnostics) failures.push(`${prefix}: response error: ${diagnostic}`);

      const allowedMissingElements = new Set(view.allowedMissingElements);
      const visibleMissingCounts = {};
      for (const error of errors) {
        const elementName = missingElementName(error);
        if (!elementName || !allowedMissingElements.has(elementName)) {
          failures.push(`${prefix}: unexpected dashboard error: ${error || "empty error card"}`);
        } else {
          visibleMissingCounts[elementName] = (visibleMissingCounts[elementName] || 0) + 1;
        }
      }
      for (const diagnostic of consoleDiagnostics) {
        const elementName = missingElementName(diagnostic.text);
        if (!elementName || !allowedMissingElements.has(elementName)) {
          failures.push(`${prefix}: console ${diagnostic.type}: ${diagnostic.text}`);
        }
      }
      for (const [elementName, expectedCount] of Object.entries(view.expectedMissingCounts)) {
        const actualCount = visibleMissingCounts[elementName] || 0;
        if (actualCount < expectedCount) {
          failures.push(
            `${prefix}: rendered ${actualCount}/${expectedCount} expected ${elementName} dependency errors`
          );
        }
      }
      for (const [elementName, expectedCount] of Object.entries(view.expectedRenderedCounts)) {
        const actualCount = rendered.elementCounts[elementName] || 0;
        if (actualCount < expectedCount) {
          failures.push(
            `${prefix}: rendered ${actualCount}/${expectedCount} configured ${elementName} cards`
          );
        }
      }
    }

    const mode = missingDependencies.length > 0 ? "missing/partial-dependency" : "installed-dependency";
    if (failures.length > 0) {
      throw new Error(
        `Marao Dashboard ${mode} e2e failed:\n${failures
          .map((failure) => `- ${redactDiagnostic(failure)}`)
          .join("\n")}`
      );
    }
    console.log(
      `Marao Dashboard ${mode} e2e OK (${inspection.viewChecks.length} views; ${configuredCardCount} configured cards)`
    );
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(redactDiagnostic(error.message));
    process.exit(1);
  });
}

module.exports = {
  buildViewChecks,
  conditionalCardIsActive,
  normalizedPathname,
};
