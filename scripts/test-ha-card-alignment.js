const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("playwright");
const { assertDisposableHaTarget } = require("./ha-local-safety");
const { accessToken, measureCenteredIcons, readConfig } = require("./test-ha-dashboard-e2e");

const tolerance = 0.5;

async function main() {
  const config = readConfig();
  assertDisposableHaTarget(config);
  const baseUrl = config.url.replace(/\/$/, "");
  const tokens = await accessToken(config, baseUrl);
  const browser = await chromium.launch();
  const errors = [];

  try {
    const context = await browser.newContext({ ...devices["iPhone 13"] });
    await context.addInitScript((value) => {
      localStorage.setItem("hassTokens", JSON.stringify(value));
    }, {
      ...tokens,
      hassUrl: baseUrl,
      clientId: `${baseUrl}/`,
      expires: Date.now() + tokens.expires_in * 1000,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) errors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      errors.push(`Failed ${request.resourceType()} request: ${request.url()}`);
    });

    await page.goto(
      `${baseUrl}/marao-dashboard-card-test/card-test?marao_alignment=${Date.now()}#marao-dashboard-test-apple-tv-popup`,
      { waitUntil: "domcontentloaded" },
    );
    const controls = page.locator(".marao-popup-sheet .body.icon-only");
    await controls.first().waitFor({ state: "visible" });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(350);

    const versionSource = fs.readFileSync(
      path.resolve(__dirname, "../custom_components/marao_dashboard/const.py"),
      "utf8",
    );
    const expectedVersion = versionSource.match(/MARAO_DASHBOARD_FRONTEND_VERSION = "([^"]+)"/)?.[1];
    const resourceUrl = await page.evaluate(() => performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .find((url) => url.includes("/MaraoCards.js")) || "");
    if (!expectedVersion || !resourceUrl.includes(`v=${expectedVersion}`)) {
      throw new Error(`Expected MaraoCards.js?v=${expectedVersion || "unknown"}, loaded ${resourceUrl || "no resource"}.`);
    }

    const readings = await measureCenteredIcons(controls);
    if (readings.length !== 12) throw new Error(`Expected 12 Apple TV controls, found ${readings.length}.`);
    console.log(`Marao Cards resource: ${resourceUrl}`);
    for (const item of readings) {
      const failed = item.missingElement
        || Math.abs(item.horizontalOffset) > tolerance
        || Math.abs(item.verticalOffset) > tolerance;
      console.log(
        `${item.label}: dx=${item.horizontalOffset?.toFixed(2) ?? "?"}px, dy=${item.verticalOffset?.toFixed(2) ?? "?"}px, `
        + `card=${item.cardWidth ?? "?"}x${item.cardHeight ?? "?"}, icon=${item.iconWidth ?? "?"}x${item.iconHeight ?? "?"} — ${failed ? "FAIL" : "PASS"}`,
      );
    }

    const failures = readings.filter((item) => item.missingElement
      || Math.abs(item.horizontalOffset) > tolerance
      || Math.abs(item.verticalOffset) > tolerance);
    if (failures.length) throw new Error(`Misaligned controls: ${JSON.stringify(failures)}`);
    if (errors.length) throw new Error(`Browser warnings/errors:\n${errors.map((error) => `- ${error}`).join("\n")}`);
    console.log(`Marao card alignment OK (${readings.length} controls; tolerance ${tolerance}px).`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
