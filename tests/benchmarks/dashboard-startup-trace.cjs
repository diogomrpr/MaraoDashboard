"use strict";

// Keep only protocol names. Frames can contain credentials, complete entity
// states, account data and saved dashboards. Never export their contents.
const knownCommands = new Set([
  "auth", "auth_ok", "auth_required", "auth_invalid", "supported_features", "get_config",
  "get_panels", "get_services", "get_states", "subscribe_entities", "subscribe_events",
  "frontend/get_user_data", "frontend/get_translations", "frontend/get_themes", "auth/current_user",
  "lovelace/config", "lovelace/resources", "lovelace/dashboards/list", "lovelace/dashboard/list",
  "config/entity_registry/list", "config/entity_registry/list_for_display", "config/area_registry/list",
  "config/device_registry/list", "config/floor_registry/list", "config/label_registry/list",
  "config/category_registry/list", "config_entries/get", "config_entries/subscribe",
  "config/entity_registry/subscribe", "config/device_registry/subscribe", "frontend/subscribe_panels",
  "frontend/subscribe_themes", "frontend/subscribe_user_data", "frontend/get_version", "get_manifest",
  "system_health/info", "map/subscribe_zones", "ping", "pong",
]);

function observeSocket(socket, elapsed, events) {
  const pending = new Map();
  events.push({ at: elapsed(), phase: "socket" });
  function record({ payload }, direction) {
    if (typeof payload !== "string") return;
    const received = elapsed();
    let decoded;
    try { decoded = JSON.parse(payload); } catch { return; }
    const batch = Array.isArray(decoded);
    const messages = batch ? decoded : [decoded];
    for (const message of messages) {
      if (!message || typeof message !== "object") continue;
      const { id, type } = message;
      let command = knownCommands.has(type) ? type : "other";
      if (direction === "send" && typeof id === "number") pending.set(id, command);
      if (type === "result" || type === "event") command = pending.get(id) || "other";
      const entry = { at: received, direction, command };
      if (direction === "receive") {
        entry.kind = type === "result" || type === "event" ? type : "protocol";
        entry.bytes = Buffer.byteLength(batch ? JSON.stringify(message) : payload);
        if (batch) entry.batch = true;
        if (command === "lovelace/config" && Array.isArray(message.result?.views)) {
          const config = message.result;
          const size = value => Buffer.byteLength(JSON.stringify(value));
          entry.config = { bytes: size(config), views: config.views.length, viewBytes: size(config.views) };
          if (config.marao?.migration) {
            const migration = config.marao.migration;
            entry.config.migrationBytes = size(migration);
            entry.config.provenance = Object.fromEntries(
              ["original_source", "original_document", "accounting", "yaml", "supplements"]
                .filter(key => Object.hasOwn(migration, key)).map(key => [key, size(migration[key])]));
          }
        }
      }
      events.push(entry);
    }
  }
  socket.on("framesent", frame => record(frame, "send"));
  socket.on("framereceived", frame => record(frame, "receive"));
}

// Serialized into the real browser. Names are restricted to shipped static
// resources and numeric HA chunk names. Other local URLs get a category only.
function documentTrace({ origin }) {
  if (window.top !== window || location.origin !== origin) return;
  const marks = {};
  const mark = (name, flag) => { if (flag && marks[name] === undefined) marks[name] = performance.now(); };
  for (const tag of ["home-assistant", "hui-root", "hui-view", "marao-card", "marao-weather-card"]) {
    customElements.whenDefined(tag).then(() => mark(tag + "Defined", true));
  }
  function inside(root, selector) {
    if (!root) return null;
    const direct = root.querySelector(selector);
    if (direct) return direct;
    for (const host of root.querySelectorAll("*")) {
      if (!host.shadowRoot) continue;
      const found = inside(host.shadowRoot, selector);
      if (found) return found;
    }
    return null;
  }
  let lovelaceRoot;
  const inspect = () => {
    const ha = document.querySelector("home-assistant");
    mark("connected", ha?.hass?.connected);
    mark("statesReady", ha?.hass?.states && Object.keys(ha.hass.states).length > 0);
    if (customElements.get("hui-root") && !lovelaceRoot?.isConnected) lovelaceRoot = inside(ha?.shadowRoot, "hui-root");
    mark("configReady", lovelaceRoot?.lovelace?.config);
    if (lovelaceRoot && !marks.viewMounted) mark("viewMounted", inside(lovelaceRoot.shadowRoot, "hui-view"));
  };
  const interval = setInterval(inspect, 50);
  window.dashboardTrace = () => {
    clearInterval(interval);
    inspect();
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = [];
    for (const entry of performance.getEntriesByType("resource")) {
      const url = new URL(entry.name);
      if (url.origin !== origin) continue;
      const path = url.pathname;
      const marao = path.match(/^\/hacsfiles\/[^/]+\/(?:[a-f0-9]{64}--)?(Marao[A-Za-z0-9_.-]+\.(?:js|json|css))$/);
      const ha = path.match(/^\/frontend_(?:latest|es5)\/((?:\d+|app|core|entrypoint|hass-icons)\.[a-f0-9]+\.js)$/);
      const iconPack = /^\/static\/mdi\/[a-f0-9]+\.json$/.test(path);
      const name = marao?.[1] || ha?.[1] || (iconPack ? "ha-mdi-pack" : path.startsWith("/frontend_") ? "ha-frontend" : path.startsWith("/static/") ? "ha-static" : "other-local");
      resources.push({ name, start: Math.round(entry.startTime), end: Math.round(entry.responseEnd),
        initiator: entry.initiatorType, worker: entry.workerStart > 0, encoded: entry.encodedBodySize, transfer: entry.transferSize });
    }
    return { now: performance.now(), marks, resources,
      navigation: Object.fromEntries(["responseStart", "responseEnd", "domInteractive", "domContentLoadedEventEnd"].map(k => [k, Math.round(nav[k])])) };
  };
}

module.exports = { observeSocket, documentTrace };
