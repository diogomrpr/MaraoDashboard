"use strict";
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { chromium } = require("playwright");
const { readConfig, accessToken, setBrowserToken } = require("../../ha-test/client");
const probe = require("./dashboard-card-probe.cjs");

// Set MARAO_TEST_CONFIG to point at an ignored local config in another checkout.
// 'warm' revisits in a new page sharing the first cold trial's authenticated cache.
const [arm, profile, countArg, route, warm] = process.argv.slice(2);
const profiles = {
  "4g": [1_600_000, 750_000, 150],
  "3g": [400_000, 250_000, 350],
  lan: [0, 0, 0],
};
const runs = Number(countArg);
assert(arm && /^[a-z0-9_-]+$/i.test(arm) && Object.hasOwn(profiles, profile) && Number.isInteger(runs) && runs > 0 && runs <= 15,
  "Usage: node tests/benchmarks/dashboard-first-card.cjs ARM 4g|3g|lan COUNT /marao-dashboard/VIEW [warm]");
assert(/^\/marao-dashboard(?:\/[a-z0-9_-]+)?\/?$/i.test(route) && (!warm || warm === "warm"));

function totals(summaries) {
  const result = {count: 0, encoded: 0, transfer: 0, maraoEncoded: 0, cachedCount: 0};
  const assets = {};
  for (const summary of summaries) {
    for (const key of Object.keys(result)) result[key] += summary[key];
    for (const [name, bytes] of Object.entries(summary.assets)) assets[name] = (assets[name] || 0) + bytes;
  }
  return {...result, assets};
}

async function visitDashboard(context, origin, trial, visit, browser) {
  const page = await context.newPage();
  const documents = new Set();
  const exited = new Map();
  const marks = {};
  const errors = {pageErrors: 0, httpErrors: 0, localFailed: 0, externalFailed: 0};
  let start, finish, timeout;
  const done = new Promise(resolve => { finish = resolve; });
  page.on("pageerror", () => { errors.pageErrors++; });
  page.on("response", response => { if (response.status() >= 400) errors.httpErrors++; });
  page.on("requestfailed", request => {
    if (new URL(request.url()).origin === origin) errors.localFailed++;
    else errors.externalFailed++;
  });

  await page.exposeBinding("benchSignal", (source, signal) => {
    if (source.frame !== page.mainFrame()) return;
    documents.add(signal.docKey);
    if (signal.event === "exit") exited.set(signal.docKey, signal.resources);
    if (signal.event !== "mark") return;
    const seconds = Math.round((performance.now() - start) / 10) / 100;
    const previous = [...exited].filter(([key]) => key !== signal.docKey).map(([, resources]) => resources);
    const resources = totals([...previous, signal.resources]);
    for (const [name, element] of Object.entries(signal.marks)) {
      marks[name] ??= {seconds, element, documents: documents.size, ...resources};
    }
    if (marks.visible && marks.usable) finish("ok");
  });
  // Install the binding first so the earliest document can report its navigation.
  await page.addInitScript(probe, {origin, route});

  try {
    // Node's monotonic clock stays continuous across frontend-triggered reloads.
    start = performance.now();
    page.goto(origin + route, {waitUntil: "commit", timeout: 210_000}).catch(error => {
      // A second document can take over before the first one commits.
      if (!error.message.includes("net::ERR_ABORTED")) finish("navigation-failed");
    });
    const outcome = await Promise.race([
      done,
      new Promise(resolve => { timeout = setTimeout(() => resolve("timeout"), 245_000); }),
    ]);
    console.log(JSON.stringify({
      arm, profile, trial, visit, route, outcome, browser: browser.version(),
      documents: documents.size, ...errors, ...marks,
    }));
    assert.equal(outcome, "ok", "The dashboard did not reach both milestones");
  } finally {
    clearTimeout(timeout);
    await page.close();
  }
}

async function run() {
  const config = readConfig(process.env.MARAO_TEST_CONFIG);
  const endpoint = new URL(config.url);
  assert.equal(endpoint.hostname, "192.168.0.28");
  assert.equal(config.disposable, true);
  const tokens = {
    ...await accessToken(config), hassUrl: config.url, clientId: config.url + "/", expires: Date.now() + 86_400_000,
  };
  const proxy = spawn("python3", [
    path.join(__dirname, "dashboard-link.py"), endpoint.port || (endpoint.protocol === "http:" ? "80" : "443"),
    ...profiles[profile].map(String),
  ], {stdio: ["ignore", "pipe", "inherit"]});
  try {
    const [portLine] = await Promise.race([
      once(proxy.stdout, "data"),
      once(proxy, "exit").then(() => { throw new Error("Shaped transport failed to start"); }),
      once(proxy, "error").then(([error]) => { throw error; }),
    ]);
    const port = String(portLine).trim();
    assert(/^\d+$/.test(port));
    for (let trial = 1; trial <= runs; trial++) {
      const browser = await chromium.launch({
        proxy: {server: "socks5://127.0.0.1:" + port},
        args: ["--disable-background-networking", "--disable-component-update"],
      });
      try {
        const context = await browser.newContext({
          viewport: {width: 393, height: 852}, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "en-US",
        });
        await context.addInitScript(setBrowserToken, tokens);
        await visitDashboard(context, config.url, trial, "cold", browser);
        if (warm && trial === 1) await visitDashboard(context, config.url, trial, "warm", browser);
        await context.close();
      } finally {
        await browser.close();
      }
    }
  } finally {
    proxy.kill();
  }
}

run().catch(error => {
  console.error(error.message.replace(/https?:\/\/[^\s]+/g, "[origin]"));
  process.exitCode = 1;
});
