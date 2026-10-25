const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(__dirname, "local.json");

function assertDisposableHaTarget(config, { requireSsh = false, dryRun = false } = {}) {
  let url;
  try { url = new URL(config?.url); } catch { throw new Error("Home Assistant url must be a valid HTTP(S) URL."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) {
    throw new Error("Home Assistant url must contain only the HTTP(S) origin, without credentials.");
  }
  if (typeof config.disposable !== "boolean" || (!dryRun && config.disposable !== true)) {
    throw new Error("Set disposable to true only for a disposable Home Assistant test instance.");
  }
  if (requireSsh && config.sshHost !== url.hostname) {
    throw new Error("sshHost must match the configured disposable Home Assistant URL host.");
  }
}

function readConfig(filename = configPath, { dryRun = false } = {}) {
  if (!fs.existsSync(filename)) throw new Error("Copy ha-test/local.example.json to ha-test/local.json and configure the disposable instance.");
  let config;
  try { config = JSON.parse(fs.readFileSync(filename, "utf8")); }
  catch { throw new Error("ha-test/local.json contains invalid JSON."); }
  assertDisposableHaTarget(config, { requireSsh: true, dryRun });
  if (typeof config.token !== "string" || !config.token.trim()) throw new Error("ha-test/local.json requires a long-lived administrator token.");
  if (!/^[a-z_][a-z0-9_-]*[$]?$/i.test(config.sshUser || "")) throw new Error("sshUser must be a valid SSH user name.");
  const sshPort = Number(config.sshPort ?? 22);
  if (!Number.isInteger(sshPort) || sshPort < 1 || sshPort > 65535) throw new Error("sshPort must be a valid TCP port.");
  if (typeof config.remoteConfigPath !== "string" || !config.remoteConfigPath.startsWith("/") || config.remoteConfigPath === "/" || config.remoteConfigPath.split("/").includes("..")) {
    throw new Error("remoteConfigPath must be an absolute Home Assistant configuration directory, usually /config.");
  }
  if (config.sshKeyPath && typeof config.sshKeyPath !== "string") throw new Error("sshKeyPath must be a file path.");
  const sshKeyPath = config.sshKeyPath && path.resolve(path.dirname(filename), config.sshKeyPath);
  if (sshKeyPath && !fs.existsSync(sshKeyPath)) throw new Error("The configured SSH key does not exist.");
  return { ...config, url: new URL(config.url).origin, sshPort, sshKeyPath, remoteConfigPath: config.remoteConfigPath.replace(/\/+$/, "") };
}

async function api(config, method, pathname, body, { text = false, timeout = 15000 } = {}) {
  const response = await fetch(config.url + pathname, {
    method,
    headers: { Authorization: "Bearer " + config.token, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(timeout),
    redirect: "error",
  });
  if (!response.ok) throw new Error("Home Assistant " + method + " " + pathname.split("?")[0] + " returned HTTP " + response.status + ".");
  return text ? response.text() : response.json();
}

function connect(config) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(config.url.replace(/^http/, "ws") + "/api/websocket");
    const pending = new Map();
    let nextId = 0;
    let authenticated = false;
    const timer = setTimeout(() => { socket.close(); reject(new Error("Home Assistant WebSocket authentication timed out.")); }, 15000);
    const client = {
      call(message) {
        if (socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error("Home Assistant connection closed."));
        const id = ++nextId;
        return new Promise((done, fail) => {
          const timeout = setTimeout(() => { pending.delete(id); fail(new Error("Home Assistant " + message.type + " timed out.")); }, 30000);
          pending.set(id, { done, fail, timeout });
          socket.send(JSON.stringify({ ...message, id }));
        });
      },
      close() { socket.close(); },
    };
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.type === "auth_required") socket.send(JSON.stringify({ type: "auth", access_token: config.token }));
      if (message.type === "auth_invalid") { clearTimeout(timer); socket.close(); reject(new Error("Home Assistant rejected the configured token.")); }
      if (message.type === "auth_ok") { authenticated = true; clearTimeout(timer); resolve(client); }
      if (message.type === "result") {
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id);
        clearTimeout(request.timeout);
        if (message.success) request.done(message.result);
        else request.fail(new Error("Home Assistant command failed (" + (message.error?.code || "unknown") + ")."));
      }
    });
    const closed = () => {
      clearTimeout(timer);
      if (!authenticated) reject(new Error("Could not authenticate to the configured Home Assistant WebSocket."));
      for (const request of pending.values()) { clearTimeout(request.timeout); request.fail(new Error("Home Assistant connection closed.")); }
      pending.clear();
    };
    socket.addEventListener("error", closed);
    socket.addEventListener("close", closed);
  });
}

function sourceFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "__pycache__" || /\.py[co]$/.test(entry.name)) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile()) files.push(path.relative(root, filename).split(path.sep).join("/"));
    }
  }
  visit(root);
  return files.sort();
}

function fingerprint(root, filter = () => true) {
  const hash = crypto.createHash("sha256");
  for (const filename of sourceFiles(root).filter(filter)) {
    hash.update(filename).update("\0").update(fs.readFileSync(path.join(root, filename))).update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}

function accessToken(config) {
  // HA's browser client accepts an unexpired access token without a refresh token.
  return { access_token: config.token, token_type: "Bearer", expires_in: 86400 };
}

function setBrowserToken(tokens) {
  if (window.top !== window || location.origin !== new URL(tokens.hassUrl).origin
    || document.contentType !== "text/html") return;
  localStorage.setItem("hassTokens", JSON.stringify(tokens));
}

async function assertCurrentFrontend(page, expected = fingerprint(path.join(repoRoot, "custom_components/marao_dashboard/frontend"))) {
  // Navbar readiness intentionally precedes optional card/runtime imports.
  const ready = await page.waitForFunction(expected => {
    const urls = performance.getEntriesByType("resource").map(entry => new URL(entry.name));
    const native=/^[a-f0-9]{64}$/.test(expected);
    if(native && window.MaraoFrontendPackage?.identity!==expected) return false;
    return ["MaraoDashboard.js", "MaraoCards.js", "MaraoFrigateEventsCard.js"].every(file =>
      urls.some(url => native ? url.pathname.endsWith('/'+expected+'--'+file) : url.pathname.endsWith("/" + file) && url.searchParams.get("v") === expected));
  }, expected, { timeout: 15000, polling: 50 });
  await ready.dispose();
}

const frontendAssetURL = (version, filename) => `/api/marao_dashboard/frontend/${version}/${filename}?v=${version}`;

module.exports = { accessToken, setBrowserToken, api, assertCurrentFrontend, assertDisposableHaTarget, configPath, connect, fingerprint, frontendAssetURL, readConfig, repoRoot, sourceFiles };
