import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

let source = await fs.readFile(
  new URL("../../custom_components/marao_dashboard/frontend/MaraoFrigateEventsCard.js", import.meta.url),
  "utf8",
);
const cardsSource = (await fs.readFile(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url), 'utf8')).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url).href));
source = source.replace('await import(`./MaraoCards.js${new URL(import.meta.url).search}`)', `await import("data:text/javascript;base64,${Buffer.from(cardsSource).toString('base64')}")`);
globalThis.navigationTranslations = (await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js')).navigationTranslations;
const dashboardSource = await fs.readFile(
  new URL("../../custom_components/marao_dashboard/frontend/MaraoRuntime.js", import.meta.url),
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
  assert.match(source, /\.icon-button \{ justify-self: end; width: 48px; min-width: 48px; height: 48px;/);
  assert.match(source, /MaraoDashboard\?\.haptic\?\.\("heavy"\)/);
  assert.match(source, /\.icon-button:active \{ transform: scale\(\.94\); \}/);
  assert.match(source, /button:disabled \{ cursor: default; opacity: \.55;/);
  assert.doesNotMatch(source, /:focus-visible/);
  assert.match(MaraoFrigateEventsCard.styles, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(MaraoFrigateEventsCard.styles, /\.meta > \* \{ overflow-wrap: anywhere;/);
  assert.match(MaraoFrigateEventsCard.styles, /top: var\(--marao-popup-header-height, 0px\)/);
  assert.match(MaraoFrigateEventsCard.styles, /\.filters \{[^}]*overflow-x: auto/);
  assert.match(MaraoFrigateEventsCard.styles, /\.filter, \.more \{ min-width: 48px; min-height: 48px/);
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
  assert.equal(calls.length, 1, "metadata is usable before any preview is signed");
  assert.equal(card._events[0].thumbnailUrl, undefined);
  card._connected = true;
  await card._loadPreview(0);
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
  assert.equal(calls.some(call => call.type === "media_source/resolve_media"), false);
  card._connected = true;
  await card._loadPreview(0);
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
    assert.match(card.shadowRoot.innerHTML, /data-action="filter"[^>]*disabled/);
    assert.match(card.shadowRoot.innerHTML, /data-action="more"[^>]*disabled/);
    assert.doesNotMatch(card.shadowRoot.innerHTML, /<article|<video|class="detail-image"/);
    assert.match(card.shadowRoot.innerHTML, /class="feed" hidden/);
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

test('native media failures preserve other events, mark the whole surface and ignore obsolete elements', () => {
  const card = new MaraoCameraEventsCard();
  card.shadowRoot = { innerHTML: '' };
  card._config = { entity: 'camera.safe', title: 'Safe events' };
  card._hass = { states: { 'camera.safe': { state: 'idle', attributes: {} } } };
  card._status = 'ready';
  card._events = [{ id: 'one', label: 'First', thumbnailUrl: '/safe-one' }, { id: 'two', label: 'Second', thumbnailUrl: '/safe-two' }];
  const media = { isConnected: true, localName: 'img', getRootNode: () => card.shadowRoot, getAttribute: () => '/safe-one' };
  card._handleMediaError({ target: media });
  assert.equal(card._events.length, 2);
  assert.match(card.shadowRoot.innerHTML, /data-problem="error"/);
  assert.match(card.shadowRoot.innerHTML, /Media unavailable/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<img src="\/safe-one"/);
  assert.match(card.shadowRoot.innerHTML, /<img src="\/safe-two"/);
  card._selected = { event: card._events[0], url: '/safe-detail', kind: 'snapshot', status: 'ready' };
  media.getAttribute = () => '/safe-detail';
  card._handleMediaError({ target: media });
  assert.equal(card._selected.status, 'error');
  assert.match(card.shadowRoot.innerHTML, /data-action="back"/);
  card._selected = undefined;
  card._thumbnailErrors.clear();
  media.isConnected = false;
  card._handleMediaError({ target: media });
  assert.equal(card._thumbnailErrors.size, 0);
});


const availableCard = () => {
  const card = new MaraoCameraEventsCard();
  card._connected = true;
  card._config = { entity: "camera.safe", limit: 12 };
  card._hass = { states: { "camera.safe": { state: "idle" } } };
  card._identity = { instanceId: "main", camera: "safe" };
  card._provider = "frigate";
  card._status = "ready";
  return card;
};
const settle = () => new Promise(resolve => setImmediate(resolve));

test("native Protect headings split the supplied timestamp without parsing its locale", () => {
  const titles = [
    "10/21/26 17:01:22 1m 12s Object Detection - Person",
    "21/10/2026 17:00:00 0s Ring Event",
    "21.10.2026 16:59:00 1h 2m 3s Motion Event",
    "10/21/26 16:58:00 2s Audio Detection - Glass break",
    "Provider title that must stay intact",
  ];
  const events = normalizeProtectEvents({ children: titles.map((title, index) => ({ title, media_content_id: `media-source://unifiprotect/nvr:event:${index}` })) });
  assert.deepEqual(events.map(event => event.eventType), ["person", "ring", "motion", "audio", undefined]);
  assert.equal(events[0].dateLabel, "10/21/26 17:01:22");
  assert.equal(events[1].dateLabel, "21/10/2026 17:00:00");
  assert.equal(events[4].label, titles[4]);
  const card = availableCard();
  card._events = events;
  assert.equal(card._eventType(events[4]), "event");
  assert.equal(card._eventDate(events[4]), "");
  const row = card._renderEvent(events[0], 0);
  assert.match(row, /<time>10\/21\/26 17:01:22<\/time><span>Person<\/span><\/h3>\s*<button/);
  const preview = row.slice(row.indexOf(">", row.indexOf("<button")) + 1);
  assert.doesNotMatch(preview, /17:01:22|<h3|<time>/);
});

test("event limits retain defaults, clamping and unrelated saved configuration", () => {
  const card = new MaraoCameraEventsCard();
  for (const [limit, expected] of [[undefined, 12], [0, 1], [6.6, 7], [200, 100], ["bad", 12]]) {
    card.setConfig({ entity: "camera.safe", limit, extension: { keep: true } });
    assert.equal(card._config.limit, expected);
    assert.deepEqual(card._config.extension, { keep: true });
  }
});

test("type filters include unrevealed metadata and progressive rows keep original indexes", () => {
  const card = availableCard();
  card._events = Array.from({ length: 10 }, (_, index) => ({ id: String(index), label: index >= 6 ? "car" : "person" }));
  let renders = 0;
  card._render = () => { renders += 1; };
  card._setFilter("car");
  assert.deepEqual(card._filteredEvents().map(item => item.index), [6, 7, 8, 9]);
  assert.deepEqual(card._filteredEvents().slice(0, card._visibleCount).map(item => item.index), [6, 7, 8]);
  card._showMore();
  assert.deepEqual(card._filteredEvents().slice(0, card._visibleCount).map(item => item.index), [6, 7, 8, 9]);
  const before = renders;
  card._showMore();
  assert.equal(renders, before, "no work after the configured metadata is exhausted");
  card._setFilter("");
  assert.equal(card._visibleCount, 3);
  assert.equal(card._filteredEvents().length, 10);
});

test("preview observation defers offscreen URLs and stops obsolete observer callbacks", async () => {
  const original = globalThis.IntersectionObserver;
  let observed;
  globalThis.IntersectionObserver = class {
    constructor(callback, options) { this.callback = callback; this.options = options; observed = this; }
    observe() {}
    unobserve() {}
    disconnect() { this.disconnected = true; }
  };
  try {
    const card = availableCard();
    const scroller = { scrollTop: 40 };
    card._scrollRoot = () => scroller;
    card._events = [{ id: "one" }, { id: "two" }];
    const targets = [0, 1].map(index => ({ isConnected: true, dataset: { action: "event", index: String(index) } }));
    const more = { isConnected: true, dataset: { action: "more" } };
    card.shadowRoot = { querySelectorAll: () => [...targets, more] };
    card._render = () => {};
    const paths = [];
    card._signPath = async path => { paths.push(path); return path; };
    card._observeFeed();
    assert.equal(observed.options.root, scroller);
    assert.deepEqual(paths, []);
    observed.callback([{ target: targets[0], isIntersecting: false }]);
    assert.deepEqual(paths, []);
    observed.callback([{ target: targets[0], isIntersecting: true }]);
    await settle();
    assert.deepEqual(paths, ["/api/frigate/main/thumbnail/one"]);
    observed.callback([{ target: targets[0], isIntersecting: true }]);
    await settle();
    assert.equal(paths.length, 1, "each preview resolves once");
    card.disconnectedCallback();
    observed.callback([{ target: targets[1], isIntersecting: true }]);
    assert.equal(paths.length, 1);
    assert.equal(observed.disconnected, true);
  } finally { globalThis.IntersectionObserver = original; }
});

test("preview work is bounded, filter queues are discarded, and stale completions cannot update a replacement feed", async () => {
  const card = availableCard();
  card._events = Array.from({ length: 5 }, (_, index) => ({ id: String(index), label: "person" }));
  card._render = () => {};
  const pending = [];
  card._signPath = path => new Promise(resolve => pending.push({ path, resolve }));
  for (let index = 0; index < 5; index += 1) card._queuePreview(index);
  assert.equal(pending.length, 2);
  card._setFilter("car");
  assert.equal(card._previewQueue.length, 0);
  assert.equal(card._events[2].thumbnailStatus, undefined, "dropped previews can be requested after changing the filter again");
  const oldEvents = card._events;
  card._request += 1;
  card._events = [{ id: "replacement", label: "car" }];
  for (const request of pending) request.resolve("/obsolete");
  await settle();
  assert.equal(pending.length, 2, "discarded queued requests never start");
  assert.equal(card._events[0].thumbnailUrl, undefined);
  assert.equal(oldEvents[0].thumbnailUrl, undefined);
  card._queuePreview(0);
  assert.equal(pending.length, 3);
  pending[2].resolve("/current");
  await settle();
  assert.equal(card._events[0].thumbnailUrl, "/current");
});

test("failed previews stay readable without retries until an explicit refreshed feed", async () => {
  const card = availableCard();
  card._events = [{ id: "bad" }];
  let requests = 0;
  card._signPath = async () => { requests += 1; throw new Error("denied"); };
  card._queuePreview(0);
  await settle();
  assert.equal(card._events[0].thumbnailStatus, "error");
  assert.match(card._preview(card._events[0]), /Media unavailable/);
  card._queuePreview(0);
  await card._loadPreview(0);
  assert.equal(requests, 1);
  card._request += 1;
  card._events = [{ id: "bad" }];
  card._resetFeed();
  card._queuePreview(0);
  await settle();
  assert.equal(requests, 2);
});

test("Back restores filtered feed position and invalidates pending detail", async () => {
  const card = availableCard();
  card._events = [{ id: "one", label: "person", has_clip: true }];
  card._filter = "person";
  card._visibleCount = 9;
  const scroller = { scrollTop: 830 };
  card._scrollRoot = () => scroller;
  card._render = () => { if (card._selected) scroller.scrollTop = 0; };
  let focus;
  card.shadowRoot = { querySelector: () => ({ focus: options => { focus = options; } }) };
  let finish;
  card._signPath = () => new Promise(resolve => { finish = resolve; });
  const pending = card._openEvent(0);
  assert.equal(scroller.scrollTop, 0);
  card._handleClick({ target: { closest: () => ({ dataset: { action: "back" } }) } });
  assert.equal(card._filter, "person");
  assert.equal(card._visibleCount, 9);
  assert.equal(scroller.scrollTop, 830);
  assert.deepEqual(focus, { preventScroll: true });
  finish("/late-detail");
  await pending;
  assert.equal(card._selected, undefined);
});

test('Netatmo uses typed metadata, lazy native media, multiple filters and controlled HLS detail', async () => {
  const previous = globalThis.customElements;
  globalThis.customElements = {get: name => name === 'ha-hls-player' ? class {} : undefined};
  try {
    const camera = 'camera.netatmo';
    const calls = [];
    const event = {id:'200',provider:'netatmo',label:'<script>provider text</script>',start_time:200,eventTypes:['person','animal'],hasThumbnail:true,mediaContentId:'media-source://netatmo/events/camera-id/200'};
    const card = new MaraoFrigateEventsCard();
    card.shadowRoot = {innerHTML:''}; card._connected = true;
    card._config = {entity:camera, limit:12};
    card._hass = {states:{[camera]:{state:'idle',attributes:{id:'camera-id'}}}, entities:{[camera]:{platform:'netatmo'}}, callWS: async message => {
      calls.push(message);
      if(message.type === 'marao_dashboard/camera/netatmo_events') return [structuredClone(event)];
      if(message.type === 'media_source/browse_media') return {thumbnail:'https://fixture.invalid/preview.jpg'};
      if(message.type === 'media_source/resolve_media') return {url:'https://fixture.invalid/recording.m3u8'};
      throw new Error('Unexpected API');
    }};
    assert.equal(cameraEventProvider(card._config,card._hass),'netatmo');
    assert.equal(cameraEventProvider({...card._config,event_provider:'frigate'},card._hass),'frigate');
    await card._load({},'netatmo-key','netatmo');
    assert.deepEqual(calls,[{type:'marao_dashboard/camera/netatmo_events',entity_id:camera,limit:12}]);
    card._filter='animal'; assert.equal(card._filteredEvents().length,1);
    card._filter='vehicle'; assert.equal(card._filteredEvents().length,0);
    await card._loadPreview(0);
    assert.equal(card._events[0].thumbnailUrl,'https://fixture.invalid/preview.jpg');
    await card._openEvent(0);
    assert.equal(card._selected.kind,'hls');
    const markup = card._renderDetail(card._selected);
    assert.match(markup,/<ha-hls-player[^>]*controls playsinline/);
    assert.doesNotMatch(markup,/autoplay|<script>/);
    assert.match(markup,/&lt;script&gt;provider text&lt;\/script&gt;/);
    assert.match(card._eventDate(event),/1970/);
    assert.deepEqual(calls.slice(1).map(call=>call.type),['media_source/browse_media','media_source/resolve_media']);
    const withoutPreview={...event,hasThumbnail:false};card._events=[withoutPreview];card._thumbnailErrors.clear();
    await card._loadPreview(0);assert.equal(withoutPreview.thumbnailStatus,'empty');assert.equal(card._thumbnailErrors.size,0);
  } finally { globalThis.customElements = previous; }
});
