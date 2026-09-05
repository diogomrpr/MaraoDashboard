const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { accessToken, readConfig } = require("./test-ha-dashboard-e2e");

const scenarios = [
  { name: "android-large-bold-text", viewport: { width: 360, height: 800 }, textScale: 2, bold: true },
  { name: "iphone-bold-display-zoom", viewport: { width: 320, height: 568 }, textScale: 2, bold: true },
];

async function applyTextPreferences(page, textScale, bold) {
  await page.evaluate(({ scale, useBold }) => {
    const sizes = {
      "--font-size-primary": 18 * scale,
      "--font-size-secondary": 16 * scale,
      "--font-size-state": 12 * scale,
      "--font-size-caption": 14 * scale,
    };
    const visit = (root) => {
      for (const element of root?.children || []) {
        if (element.localName?.startsWith("marao-") || element.classList?.contains("marao-popup-overlay")) {
          for (const [name, value] of Object.entries(sizes)) element.style.setProperty(name, `${value}px`, "important");
          if (useBold) {
            element.style.setProperty("--font-weight-primary", "800", "important");
            element.style.setProperty("--font-weight-secondary", "700", "important");
          }
        }
        visit(element.shadowRoot);
        visit(element);
      }
    };
    visit(document.documentElement);
  }, { scale: textScale, useBold: bold });
  await page.waitForTimeout(300);
}

async function layoutIssues(page) {
  return page.evaluate(() => {
    const issues = [];
    const intersects = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    const visit = (root) => {
      for (const element of root?.children || []) {
        if (element.localName === "marao-card") {
          const body = element.shadowRoot?.querySelector(".body");
          const card = element.shadowRoot?.querySelector("ha-card");
          if (body && body.scrollWidth > body.clientWidth + 1) issues.push(`${element._config?.name || element._config?.entity || "card"}: horizontal overflow`);
          const text = [...(element.shadowRoot?.querySelectorAll(".title,.state,.climate") || [])];
          const controls = [...(element.shadowRoot?.querySelectorAll(".icon,.number-stepper") || [])];
          for (const label of text) for (const control of controls) {
            if (intersects(label.getBoundingClientRect(), control.getBoundingClientRect())) issues.push(`${element._config?.name || element._config?.entity || "card"}: text overlaps control`);
          }
          if (card && card.scrollWidth > card.clientWidth + 1) issues.push(`${element._config?.name || element._config?.entity || "card"}: card content clipped`);
        }
        visit(element.shadowRoot);
        visit(element);
      }
    };
    visit(document.documentElement);
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) issues.push("dashboard has horizontal overflow");
    const sheet = document.querySelector(".marao-popup-sheet");
    if (sheet && sheet.scrollWidth > sheet.clientWidth + 1) issues.push("popup has horizontal overflow");
    return [...new Set(issues)];
  });
}

async function main() {
  const config = readConfig();
  const baseUrl = config.url.replace(/\/$/, "");
  const token = await accessToken(config, baseUrl);
  const output = path.join(__dirname, "..", "test-results", "accessibility");
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const scenario of scenarios) {
      const context = await browser.newContext({ viewport: scenario.viewport });
      await context.addInitScript((value) => localStorage.setItem("hassTokens", JSON.stringify(value)), {
        ...token, hassUrl: baseUrl, clientId: `${baseUrl}/`, expires: Date.now() + token.expires_in * 1000,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (["error", "warning"].includes(message.type())) errors.push(message.text()); });
      await page.goto(`${baseUrl}/marao-dashboard-card-test/card-test?marao_accessibility=${scenario.name}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      await applyTextPreferences(page, scenario.textScale, scenario.bold);
      let issues = await layoutIssues(page);
      await page.screenshot({ path: path.join(output, `${scenario.name}-viewport.png`) });
      await page.screenshot({ path: path.join(output, `${scenario.name}.png`), fullPage: true });
      await page.getByText("Lock access", { exact: true }).click();
      await page.waitForTimeout(300);
      await applyTextPreferences(page, scenario.textScale, scenario.bold);
      issues = issues.concat(await layoutIssues(page));
      await page.screenshot({ path: path.join(output, `${scenario.name}-popup.png`) });
      if (errors.length || issues.length) throw new Error(`${scenario.name} failed:\n${[...errors, ...issues].map((item) => `- ${item}`).join("\n")}`);
      await context.close();
    }
    console.log(`Accessibility layout OK (${scenarios.length} mobile scenarios; screenshots in ${output})`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });

module.exports = { applyTextPreferences, layoutIssues, scenarios };
