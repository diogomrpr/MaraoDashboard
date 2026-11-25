"use strict";
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createInterface } = require("node:readline");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { chromium } = require("playwright");
const { readConfig, accessToken, setBrowserToken } = require("../../ha-test/client");
const probe = require("./dashboard-card-probe.cjs");
const { observeSocket, documentTrace } = require("./dashboard-startup-trace.cjs");
const trace = process.env.MARAO_STARTUP_TRACE === "1";
// Optional diagnostic for a warm page held open after the measured milestone.
const followupModule = process.env.MARAO_POST_CARD_MODULE;
assert(!followupModule || trace && /^Marao[A-Za-z0-9]+\.js$/.test(followupModule));

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
  const result = {count: 0, encoded: 0, transfer: 0, maraoEncoded: 0, cachedCount: 0, releaseChecks: 0, releaseTransfer: 0};
  const assets = {};
  for (const summary of summaries) {
    for (const key of Object.keys(result)) result[key] += summary[key];
    for (const [name, bytes] of Object.entries(summary.assets)) assets[name] = (assets[name] || 0) + bytes;
  }
  return {...result, assets};
}

async function visitDashboard(context, origin, trial, visit, browser, wireFrames) {
  const page = await context.newPage();
  const socketEvents = [];
  const packageRequests = [];
  if (trace) {
    const session = await context.newCDPSession(page);
    session.on("Network.webSocketHandshakeResponseReceived", ({ response }) => {
      const extension = Object.entries(response.headers).find(([name]) => name.toLowerCase() === "sec-websocket-extensions")?.[1];
      socketEvents.push({ at: Math.round(performance.now() - start), phase: "handshake",
        perMessageDeflate: /(?:^|,)\s*permessage-deflate\b/i.test(extension || "") });
    });
    await session.send("Network.enable");
    await page.addInitScript(documentTrace, {origin});
    page.on("websocket", socket => {
      if (new URL(socket.url()).host === new URL(origin).host) observeSocket(socket, () => Math.round(performance.now() - start), socketEvents, route.split("/")[2]);
    });
    // Resource Timing only lists completed bodies. A feature request can
    // already be competing for bandwidth when the first control is usable.
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.origin !== origin) return;
      const match = url.pathname.match(/^\/hacsfiles\/[^/]+\/(?:[a-f0-9]{64}--)?(Marao[\w.-]+\.js)$/);
      if (match) packageRequests.push({at:Math.round(performance.now() - start), file:match[1]});
    });
  }
  const documents = new Set();
  const exited = new Map();
  const marks = {};
  const errors = {pageErrors: 0, httpErrors: 0, localFailed: 0, externalFailed: 0};
  const scriptResponses = new Map();
  const failedPackageScripts = [];
  const scriptEncodings = {};
  const packageIdentities = new Set();
  let manifestResponses = 0;
  let start, wallStart, finish, timeout;
  const done = new Promise(resolve => { finish = resolve; });
  page.on("pageerror", () => { errors.pageErrors++; });
  page.on("response", response => {
    if (response.status() >= 400) errors.httpErrors++;
    const url = new URL(response.url());
    if (url.origin !== origin) return;
    if (/^\/hacsfiles\/[^/]+\/MaraoFrontend\.release\.json$/.test(url.pathname) && response.request().method() === "GET") manifestResponses++;
    const asset = url.pathname.match(/^\/hacsfiles\/[^/]+\/([a-f0-9]{64})--(Marao[\w.-]*\.js)$/);
    if (!asset) return;
    if (trace && response.status() >= 400) failedPackageScripts.push({identity:asset[1], file:asset[2], status:response.status()});
    packageIdentities.add(asset[1]);
    scriptResponses.set(url.href, (scriptResponses.get(url.href) || 0) + 1);
    const encoding = response.headers()["content-encoding"] || "identity";
    scriptEncodings[encoding] = (scriptEncodings[encoding] || 0) + 1;
  });
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
      // Response headers can arrive before their body finishes. Resource Timing
      // above separately counts completed transfers, including modulepreloads.
      const hacs = {
        identities: [...packageIdentities], manifestResponses, scriptEncodings: {...scriptEncodings},
        repeatedScriptResponses: [...scriptResponses.values()].reduce((sum, count) => sum + count - 1, 0),
      };
      marks[name] ??= {seconds, element, documents: documents.size, ...resources, hacs};
    }
    if (marks.visible && marks.usable) finish("ok");
  });
  // Install the binding first so the earliest document can report its navigation.
  await page.addInitScript(probe, {origin, route, trace});

  try {
    // Node's monotonic clock stays continuous across frontend-triggered reloads.
    start = performance.now();
    wallStart = Date.now();
    page.goto(origin + route, {waitUntil: "commit", timeout: 210_000}).catch(error => {
      // A second document can take over before the first one commits.
      if (!error.message.includes("net::ERR_ABORTED")) finish("navigation-failed");
    });
    const outcome = await Promise.race([
      done,
      new Promise(resolve => { timeout = setTimeout(() => resolve("timeout"), 245_000); }),
    ]);
    let timeline;
    if (trace) {
      const document = await page.evaluate(() => window.dashboardTrace?.());
      if (document) document.offset = Math.round(performance.now() - start - document.now);
      const wire = wireFrames.filter(frame => frame.time >= wallStart && frame.time <= wallStart + (marks.usable?.seconds || 0) * 1000)
        .map(frame => ({at: frame.time - wallStart, bytes: frame.bytes}));
      const archiveRequests = { reads: 0, writes: 0, subscriptions: 0 };
      for (const event of socketEvents) {
        if (!event.migrationArchive) continue;
        if (event.command === "frontend/get_system_data") archiveRequests.reads++;
        if (event.command === "frontend/set_system_data") archiveRequests.writes++;
        if (event.command === "frontend/subscribe_system_data") archiveRequests.subscriptions++;
      }
      timeline = {socketEvents, document, wire, archiveRequests, failedPackageScripts, packageRequests};
    }
    const result = {
      arm, profile, trial, visit, route, outcome, browser: browser.version(),
      documents: documents.size, ...errors, ...marks, timeline,
    };
    if (outcome === "ok" && visit === "warm" && followupModule) {
      // Freeze cutoff evidence before observing traffic on the untouched page.
      result.timeline = structuredClone(timeline);
      if (!packageRequests.some(request => request.file === followupModule)) {
        await page.waitForRequest(request => {
          const url = new URL(request.url());
          return url.origin === origin && url.pathname.endsWith("--" + followupModule);
        }, {timeout:6000}).catch(error => { if (error.name !== "TimeoutError") throw error; });
      }
      const readyAfterInputSampleMs = await page.evaluate(() => {
        const snapshot = window.dashboardTrace?.();
        const ready = snapshot?.marks.runtimePaintReleased;
        const sampled = snapshot?.surfaces?.usable?.observedAt;
        return Number.isFinite(ready) && Number.isFinite(sampled) ? Math.round(ready - sampled) : null;
      });
      result.postCard = {module:followupModule, requestedAt:packageRequests.find(request => request.file === followupModule)?.at ?? null,
        readyAfterInputSampleMs, observedUntil:Math.round(performance.now()-start)};
    }
    console.log(JSON.stringify(result));
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
    ...profiles[profile].map(String), ...(trace ? ["1"] : []),
  ], {stdio: ["ignore", "pipe", "inherit"]});
  try {
    const [portLine] = await Promise.race([
      once(proxy.stdout, "data"),
      once(proxy, "exit").then(() => { throw new Error("Shaped transport failed to start"); }),
      once(proxy, "error").then(([error]) => { throw error; }),
    ]);
    const port = String(portLine).trim();
    assert(/^\d+$/.test(port));
    const wireFrames = [];
    if (trace) createInterface({input:proxy.stdout}).on("line", line => wireFrames.push(JSON.parse(line)));
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
        await visitDashboard(context, config.url, trial, "cold", browser, wireFrames);
        if (warm && trial === 1) await visitDashboard(context, config.url, trial, "warm", browser, wireFrames);
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
