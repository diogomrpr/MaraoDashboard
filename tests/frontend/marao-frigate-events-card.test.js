import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(
  new URL("../../custom_components/marao_dashboard/frontend/MaraoFrigateEventsCard.js", import.meta.url),
  "utf8",
);
const dashboardSource = await fs.readFile(
  new URL("../../custom_components/marao_dashboard/frontend/MaraoDashboard.js", import.meta.url),
  "utf8",
);
const {
  cameraEventProvider,
  frigateEventPath,
  frigateIdentity,
  MaraoCameraEventsCard,
  MaraoFrigateEventsCard,
  matchProtectCamera,
  normalizeFrigateEvents,
  normalizeProtectEvents,
  protectThumbnailMediaSource,
  registerMaraoCameraEventCards,
} = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("camera event registration can be retried after the registry becomes available", () => {
  const previousRegistry = globalThis.customElements;
  const registered = new Map();
  globalThis.customElements = {
    get: (name) => registered.get(name),
    define: (name, klass) => registered.set(name, klass),
  };
  try {
    registerMaraoCameraEventCards();
    assert.deepEqual([...registered.keys()], ["marao-frigate-events-card", "marao-camera-events-card"]);
    registerMaraoCameraEventCards();
    assert.equal(registered.size, 2);
  } finally {
    globalThis.customElements = previousRegistry;
  }
});

test("Frigate event helpers normalize API data and build safe integration URLs", () => {
  const events = normalizeFrigateEvents(JSON.stringify([
    { id: "older", start_time: 10 },
    { id: "newer", start_time: 20 },
  ]));
  assert.deepEqual(events.map((event) => event.id), ["newer", "older"]);
  assert.deepEqual(normalizeFrigateEvents({ result: "{not-json" }), []);
  assert.deepEqual(normalizeFrigateEvents({ events: [{ id: "wrapped", end_time: 30 }] })[0].id, "wrapped");

  assert.deepEqual(
    frigateIdentity(
      { entity: "camera.front_door" },
      { attributes: { client_id: "frigate-main", camera_name: "front" } },
    ),
    { instanceId: "frigate-main", camera: "front" },
  );
  assert.deepEqual(
    frigateIdentity({
      entity: "camera.front_door",
      frigate_instance_id: "override",
      frigate_camera: "entry",
    }),
    { instanceId: "override", camera: "entry" },
  );
  assert.equal(frigateIdentity({ entity: "camera.back_yard" }).camera, "back_yard");

  assert.equal(
    frigateEventPath("main/instance", "event id", "thumbnail"),
    "/api/frigate/main%2Finstance/thumbnail/event%20id",
  );
  assert.equal(
    frigateEventPath("main", "abc", "snapshot"),
    "/api/frigate/main/snapshot/abc",
  );
  assert.equal(
    frigateEventPath("main", "abc", "clip"),
    "/api/frigate/main/notifications/abc/clip.mp4",
  );
  assert.throws(() => frigateEventPath("main", "abc", "preview"));
});

test("camera event actions keep a visible 48px target and strong feedback", () => {
  assert.match(source, /\.icon-button \{ flex: 0 0 48px; width: 48px; min-width: 48px; height: 48px;/);
  assert.match(source, /MaraoDashboard\?\.haptic\?\.\("heavy"\)/);
  assert.match(source, /\.icon-button:active \{ transform: scale\(\.94\); \}/);
  assert.match(source, /button:disabled \{ cursor: default; opacity: \.55;/);
  assert.doesNotMatch(source, /:focus-visible/);
  assert.match(MaraoFrigateEventsCard.styles, /repeat\(auto-fill, minmax\(min\(145px, 100%\), 1fr\)\)/);
  assert.match(MaraoFrigateEventsCard.styles, /\.meta strong, \.detail-meta strong \{ overflow-wrap: anywhere;/);
  assert.match(MaraoFrigateEventsCard.styles, /\.meta small, \.detail-meta small \{ overflow: hidden; text-overflow: ellipsis; white-space: nowrap;/);
  assert.doesNotMatch(MaraoFrigateEventsCard.styles, /@media/);
});

test("camera event UI routes visible copy through complete English and Portuguese catalogs", () => {
  const keys = [...source.matchAll(/"(camera_events\.[a-z0-9_.]+)"/g)].map((match) => match[1]);
  for (const key of new Set(keys)) {
    assert.equal(dashboardSource.split(`"${key}"`).length - 1, 2, key);
  }

  const previousWindow = globalThis.window;
  globalThis.window = {
    MaraoDashboard: {
      localize(key, _hass, placeholders = {}) {
        const values = {
          "camera_events.title": "Eventos da câmara",
          "camera_events.refresh": "Atualizar eventos",
          "camera_events.loading_events": "A carregar eventos…",
        };
        return (values[key] || key).replace(/\{(\w+)\}/g, (_match, name) => placeholders[name] ?? `{${name}}`);
      },
    },
  };
  try {
    const card = new MaraoFrigateEventsCard();
    card.shadowRoot = { innerHTML: "" };
    card._config = { entity: "camera.test" };
    card._hass = { states: { "camera.test": { state: "idle" } }, connection: { connected: true } };
    card._status = "loading";
    card._render();
    assert.match(card.shadowRoot.innerHTML, /Eventos da câmara/);
    assert.match(card.shadowRoot.innerHTML, /aria-label="Atualizar eventos" title="Atualizar eventos"/);
    assert.match(card.shadowRoot.innerHTML, /A carregar eventos…/);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("camera event text uses the shared scalable typography tokens", () => {
  for (const token of [
    "--font-size-primary",
    "--font-size-secondary",
    "--font-size-caption",
    "--font-weight-primary",
    "--font-weight-secondary",
  ]) assert.match(source, new RegExp(token));
});

test("camera event actions are blocked while Home Assistant is disconnected", () => {
  const card = new MaraoFrigateEventsCard();
  card._hass = { connected: false, connection: { connected: false } };
  assert.equal(card._connectionAvailable(), false);
  card._hass = { states: {}, connection: { connected: true } };
  assert.equal(card._connectionAvailable(), true);
});

test("camera event loading waits for Home Assistant and retries after reconnect", () => {
  const card = new MaraoFrigateEventsCard();
  const loads = [];
  card._connected = true;
  card._config = { entity: "camera.test", event_provider: "frigate", frigate_instance_id: "fixture", limit: 1 };
  card._loadedKey = "unchanged";
  card._load = (...args) => loads.push(args);

  card.hass = { connected: false, connection: { connected: false }, states: {} };
  assert.equal(card._loadedKey, "unchanged");
  assert.equal(loads.length, 0);

  card.hass = { connected: true, connection: { connected: true }, states: { "camera.test": { state: "idle" } } };
  assert.equal(loads.length, 1);
  assert.equal(loads[0][2], "frigate");
});

test("shipped camera events contain no fixture imagery or provider branches", async () => {
  assert.doesNotMatch(source, /marao_test|MARAO_TEST_EVENT_IMAGE|data:image/);
  const card = new MaraoCameraEventsCard();
  card._config = { entity: "camera.front", limit: 1 };
  card._hass = { states: { "camera.front": { state: "idle" } }, callWS: async () => { throw new Error("provider failure"); } };
  await card._load({ instanceId: "configured", camera: "front" }, "failed-request", "frigate");
  assert.equal(card._status, "error");
  assert.match(card._error, /Unable to load camera events/);
});

test("Frigate events are requested and media is signed through Home Assistant", async () => {
  const calls = [];
  const card = new MaraoFrigateEventsCard();
  card._config = { entity: "camera.front_door", limit: 12 };
  card._hass = {
    states: { "camera.front_door": { state: "idle" } },
    callWS: async (message) => {
      calls.push(message);
      if (message.type === "frigate/events/get") {
        return JSON.stringify([{ id: "event-1", start_time: 20, has_clip: true }]);
      }
      return { path: `${message.path}?authSig=signed` };
    },
    hassUrl: (path) => `https://home.example${path}`,
  };

  await card._load({ instanceId: "frigate-main", camera: "front" }, "request-key");

  assert.deepEqual(calls[0], {
    type: "frigate/events/get",
    instance_id: "frigate-main",
    cameras: ["front"],
    limit: 12,
  });
  assert.equal(calls[1].type, "auth/sign_path");
  assert.equal(calls[1].path, "/api/frigate/frigate-main/thumbnail/event-1");
  assert.equal(card._events[0].thumbnailUrl, "https://home.example/api/frigate/frigate-main/thumbnail/event-1?authSig=signed");

  await card._openEvent(0);
  assert.equal(calls[2].path, "/api/frigate/frigate-main/notifications/event-1/clip.mp4");
  assert.equal(card._selected.kind, "clip");
});

test("camera event provider is explicit first, then inferred from the Home Assistant registries", () => {
  const hass = {
    entities: {
      "camera.protect": { platform: "unifiprotect", device_id: "protect-device" },
      "camera.by_device": { platform: "generic", device_id: "ubiquiti-device" },
    },
    devices: {
      "protect-device": { manufacturer: "Ubiquiti Inc." },
      "ubiquiti-device": { manufacturer: "Ubiquiti" },
    },
  };

  assert.equal(cameraEventProvider({ entity: "camera.protect", event_provider: "frigate" }, hass), "frigate");
  assert.equal(cameraEventProvider({ entity: "camera.regular", event_provider: "unsupported" }, hass), "unsupported");
  assert.equal(cameraEventProvider({ entity: "camera.protect", provider: "Protect" }, hass), "unifi_protect");
  assert.equal(cameraEventProvider({ entity: "camera.protect", event_provider: "auto" }, hass), "unifi_protect");
  assert.equal(cameraEventProvider({ entity: "camera.regular", unifi_protect_media_source: "media-source://unifiprotect/nvr:browse:camera" }, hass), "unifi_protect");
  assert.equal(cameraEventProvider({ entity: "camera.protect" }, hass), "unifi_protect");
  assert.equal(cameraEventProvider({ entity: "camera.by_device" }, hass), "unifi_protect");
  assert.equal(cameraEventProvider({ entity: "camera.regular" }, hass), "frigate");
  assert.ok(new MaraoCameraEventsCard() instanceof MaraoFrigateEventsCard);
});

test("UniFi Protect helpers match camera streams by device and preserve event titles", () => {
  const cameras = [
    {
      title: "Front Door",
      media_content_id: "media-source://unifiprotect/nvr:browse:front",
      thumbnail: "/api/camera_proxy/camera.front_door_high?token=opaque",
    },
    {
      title: "Garden",
      media_content_id: "media-source://unifiprotect/nvr:browse:garden",
      thumbnail: "/api/camera_proxy/camera.garden",
    },
  ];
  const hass = {
    entities: {
      "camera.front_door_low": { device_id: "front-device" },
      "camera.front_door_high": { device_id: "front-device" },
      "camera.garden": { device_id: "garden-device" },
    },
  };

  assert.equal(
    matchProtectCamera(cameras, "camera.front_door_low", hass)?.media_content_id,
    "media-source://unifiprotect/nvr:browse:front",
  );
  assert.equal(
    matchProtectCamera(cameras, "camera.garden", hass)?.media_content_id,
    "media-source://unifiprotect/nvr:browse:garden",
  );

  const eventSource = "media-source://unifiprotect/nvr:event:event-id";
  assert.equal(
    protectThumbnailMediaSource(eventSource),
    "media-source://unifiprotect/nvr:eventthumb:event-id",
  );
  assert.deepEqual(
    normalizeProtectEvents({
      children: [
        { title: "Person · 10:00 (do not parse)", media_content_id: eventSource },
        { title: "Older", media_content_id: "media-source://unifiprotect/nvr:event:older" },
      ],
    }, 1),
    [{
      id: "event-id",
      provider: "unifi_protect",
      label: "Person · 10:00 (do not parse)",
      mediaContentId: eventSource,
      thumbnailContentId: "media-source://unifiprotect/nvr:eventthumb:event-id",
    }],
  );
});

test("UniFi Protect discovers a same-device camera across NVRs and resolves signed media", async () => {
  const root = "media-source://unifiprotect";
  const firstNvr = `${root}/nvr-one:browse`;
  const secondNvr = `${root}/nvr-two:browse`;
  const cameraSource = `${root}/nvr-two:browse:front-door`;
  const allSource = `${cameraSource}:all`;
  const motionSource = `${cameraSource}:motion`;
  const recentSource = `${allSource}:recent:1`;
  const newestEvent = `${root}/nvr-two:event:newest-event`;
  const olderEvent = `${root}/nvr-two:event:older-event`;
  const calls = [];
  const card = new MaraoCameraEventsCard();
  card._config = {
    entity: "camera.front_door_low",
    event_provider: "unifi_protect",
    limit: 1,
  };
  card._hass = {
    states: { "camera.front_door_low": { state: "idle" } },
    entities: {
      "camera.front_door_low": { platform: "unifiprotect", device_id: "front-device" },
      "camera.front_door_high": { platform: "unifiprotect", device_id: "front-device" },
      "camera.garden": { platform: "unifiprotect", device_id: "garden-device" },
    },
    devices: {
      "front-device": { manufacturer: "Ubiquiti" },
      "garden-device": { manufacturer: "Ubiquiti" },
    },
    callWS: async (message) => {
      calls.push(message);
      if (message.type === "media_source/resolve_media") {
        if (message.media_content_id === `${root}/nvr-two:eventthumb:newest-event`) {
          return { url: "/api/unifiprotect/thumbnail/signed", mime_type: "image/jpeg" };
        }
        if (message.media_content_id === newestEvent) {
          return { url: "/api/unifiprotect/video/signed", mime_type: "video/mp4" };
        }
        throw new Error(`Unexpected resolve: ${message.media_content_id}`);
      }
      if (message.media_content_id === root) {
        return {
          children: [
            { title: "First console", media_content_id: firstNvr },
            { title: "Second console", media_content_id: secondNvr },
          ],
        };
      }
      if (message.media_content_id === firstNvr) {
        return {
          children: [{
            title: "Garden",
            media_content_id: `${root}/nvr-one:browse:garden`,
            thumbnail: "/api/camera_proxy/camera.garden",
          }],
        };
      }
      if (message.media_content_id === secondNvr) {
        return {
          children: [{
            title: "Front Door",
            media_content_id: cameraSource,
            thumbnail: "/api/camera_proxy/camera.front_door_high?width=640",
          }],
        };
      }
      if (message.media_content_id === cameraSource) {
        return {
          children: [
            { title: "Motion", media_content_id: motionSource },
            { title: "All", media_content_id: allSource },
          ],
        };
      }
      if (message.media_content_id === recentSource) {
        return {
          children: [
            { title: "Newest title from HA", media_content_id: newestEvent },
            { title: "Older title from HA", media_content_id: olderEvent },
          ],
        };
      }
      throw new Error(`Unexpected browse: ${message.media_content_id}`);
    },
    hassUrl: (path) => `https://home.example${path}`,
  };

  await card._load({}, "protect-request", "unifi_protect");

  assert.deepEqual(
    calls.filter((call) => call.type === "media_source/browse_media").map((call) => call.media_content_id),
    [root, firstNvr, secondNvr, cameraSource, recentSource],
  );
  assert.deepEqual(
    calls.filter((call) => call.type === "media_source/resolve_media").map((call) => call.media_content_id),
    [`${root}/nvr-two:eventthumb:newest-event`],
  );
  assert.equal(card._events.length, 1);
  assert.equal(card._events[0].label, "Newest title from HA");
  assert.equal(card._events[0].thumbnailUrl, "https://home.example/api/unifiprotect/thumbnail/signed");

  await card._openEvent(0);
  assert.deepEqual(calls.at(-1), {
    type: "media_source/resolve_media",
    media_content_id: newestEvent,
  });
  assert.equal(card._selected.kind, "clip");
  assert.equal(card._selected.url, "https://home.example/api/unifiprotect/video/signed");
  assert.equal(calls.some((call) => call.type === "auth/sign_path"), false);
});

test("UniFi Protect media source override skips discovery and uses an event folder directly", async () => {
  const source = "media-source://unifiprotect/nvr:browse:front-door:motion";
  const calls = [];
  const card = new MaraoCameraEventsCard();
  card._config = {
    entity: "camera.front_door",
    limit: 4,
    unifi_protect_media_source: source,
  };
  card._hass = {
    states: { "camera.front_door": { state: "idle" } },
    callWS: async (message) => {
      calls.push(message);
      return { children: [] };
    },
  };

  await card._load({}, "protect-override", "unifi_protect");

  assert.deepEqual(calls, [{
    type: "media_source/browse_media",
    media_content_id: `${source}:recent:1`,
  }]);
  assert.equal(card._status, "ready");
  assert.deepEqual(card._events, []);
});

test("camera entity availability disables events and invalidates in-flight results", async () => {
  for (const state of ["unknown", "unavailable", null]) {
    let calls = 0;
    const card = new MaraoCameraEventsCard();
    card.shadowRoot = { innerHTML: "" };
    card._connected = true;
    card.setConfig({ entity: "camera.front", frigate_instance_id: "configured" });
    card.hass = { states: state ? { "camera.front": { state } } : {}, callWS: async () => { calls += 1; } };
    await card._openEvent(0);
    await card._load({ instanceId: "configured", camera: "front" }, "blocked");
    assert.equal(calls, 0);
    assert.match(card.shadowRoot.innerHTML, new RegExp(`data-status="${state || "unknown"}"`));
    assert.match(card.shadowRoot.innerHTML, /data-action="refresh"[^>]*disabled/);
    assert.doesNotMatch(card.shadowRoot.innerHTML, /class="grid"|<video|class="detail-image"/);
  }

  const card = new MaraoCameraEventsCard();
  let finish;
  card._config = { entity: "camera.front" };
  card._hass = { states: { "camera.front": { state: "idle" } }, callWS: () => new Promise((resolve) => { finish = resolve; }) };
  const pending = card._load({ instanceId: "configured", camera: "front" }, "pending");
  card.hass = { connected: false, states: card._hass.states };
  finish([]);
  await pending;
  assert.deepEqual(card._events, []);
  assert.equal(card._unavailableState(), "unavailable");
});

test("camera empty and failed results do not request again on unrelated state updates", async () => {
  for (const fail of [false, true]) {
    let calls = 0;
    const card = new MaraoCameraEventsCard();
    card._connected = true;
    card._config = { entity: "camera.front", frigate_instance_id: "configured" };
    const hass = { states: { "camera.front": { state: "idle" } }, callWS: async () => { calls += 1; if (fail) throw new Error("failed"); return []; } };
    card.hass = hass;
    await new Promise((resolve) => setImmediate(resolve));
    for (let i = 0; i < 5; i += 1) card.hass = { ...hass };
    assert.equal(calls, 1);
    assert.equal(card._status, fail ? "error" : "ready");
  }
});

test("camera events discard in-flight results after the shared connection mutates", async () => {
  const card = new MaraoCameraEventsCard();
  card._connected = true;
  card._config = { entity: "camera.front", event_provider: "frigate", frigate_instance_id: "configured" };
  let finish;
  const connection = { connected: true };
  const hass = { connected: true, connection, states: { "camera.front": { state: "idle" } }, callWS: () => new Promise((resolve) => { finish = resolve; }) };
  card.hass = hass;
  connection.connected = false;
  card.hass = { ...hass, connected: false };
  finish([]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(card._events, []);
  assert.equal(card._loadedKey, "");
  connection.connected = true;
  card.hass = { ...hass, callWS: async () => [] };
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(card._status, "ready");
});
