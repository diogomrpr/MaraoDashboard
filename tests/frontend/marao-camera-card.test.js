import test from "node:test";
import assert from "node:assert/strict";

class FakeNode {
  constructor(root, kind) {
    this.root = root;
    this.kind = kind;
    this.attributes = {};
    this._html = "";
  }

  set innerHTML(value) {
    this._html = value;
    if (this.kind === "feed") {
      this.root.stream = value.includes("<ha-camera-stream") ? {} : undefined;
    } else if (this.kind === "modal") {
      this.root.dialog = value.includes("<dialog") ? {
        open: false,
        addEventListener() {},
        showModal() { this.open = true; },
      } : undefined;
    }
  }

  get innerHTML() { return this._html; }
  querySelector(selector) { return selector === "ha-camera-stream" ? this.root.stream : undefined; }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() {}
}

class FakeShadowRoot {
  constructor() {
    this.listeners = {};
    this._html = "";
  }

  set innerHTML(value) {
    this._html = value;
    if (value.includes('class="camera"')) {
      this.camera = new FakeNode(this, "camera");
      this.cameraName = new FakeNode(this, "name");
      this.feed = new FakeNode(this, "feed");
      this.modalRoot = new FakeNode(this, "modal");
    }
  }

  get innerHTML() {
    return [
      this._html,
      this.feed?.innerHTML,
      this.modalRoot?.innerHTML,
      this.camera?.attributes?.["aria-label"],
      this.cameraName?.textContent,
    ].filter(Boolean).join("\n");
  }

  addEventListener(type, callback) {
    this.listeners[type] = callback;
  }

  querySelector(selector) {
    if (selector === "ha-camera-stream") return this.stream;
    if (selector === "dialog") return this.dialog;
    if (selector === ".camera") return this.camera;
    if (selector === ".camera-name") return this.cameraName;
    if (selector === ".feed") return this.feed;
    if (selector === ".modal-root") return this.modalRoot;
    return undefined;
  }
}

globalThis.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = new FakeShadowRoot();
    return this.shadowRoot;
  }
};

const elements = new Map();
globalThis.customElements = {
  define: (name, constructor) => elements.set(name, constructor),
  get: (name) => elements.get(name),
};
globalThis.window = {};
let cameraControlImports = 0;
globalThis.loadCardHelpers = async () => ({
  importMoreInfoControl: async (domain) => {
    assert.equal(domain, "camera");
    cameraControlImports += 1;
    elements.set("ha-camera-stream", class {});
  },
});

const {
  cameraEventProvider,
  frigateEventPath,
  frigateIdentity,
  MaraoCameraCard,
  matchProtectCamera,
  normalizeFrigateEvents,
  normalizeProtectEvents,
  protectThumbnailMediaSource,
} = await import("../../custom_components/marao_dashboard/frontend/MaraoCameraCard.js");

test("registers only the standalone camera card", () => {
  assert.equal(elements.get("marao-camera-card"), MaraoCameraCard);
  assert.equal(elements.has("marao-frigate-events-card"), false);
  assert.equal(elements.has("marao-camera-events-card"), false);
  assert.deepEqual(window.customCards.map((card) => card.type), ["marao-camera-card"]);
});

test("normalizes Frigate responses and builds integration media URLs", () => {
  const events = normalizeFrigateEvents(JSON.stringify([
    { id: "older", start_time: 10 },
    { id: "newer", start_time: 20 },
  ]));
  assert.deepEqual(events.map((event) => event.id), ["newer", "older"]);
  assert.deepEqual(normalizeFrigateEvents({ result: "{not-json" }), []);
  assert.equal(normalizeFrigateEvents({ events: [{ id: "wrapped" }] })[0].id, "wrapped");
  assert.deepEqual(
    frigateIdentity(
      { entity: "camera.front_door" },
      { attributes: { client_id: "frigate-main", camera_name: "front" } },
    ),
    { instanceId: "frigate-main", camera: "front" },
  );
  assert.equal(frigateIdentity({ entity: "camera.back_yard" }).camera, "back_yard");
  assert.equal(
    frigateEventPath("main/instance", "event id"),
    "/api/frigate/main%2Finstance/thumbnail/event%20id",
  );
  assert.equal(frigateEventPath("main", "abc", "clip"), "/api/frigate/main/notifications/abc/clip.mp4");
  assert.throws(() => frigateEventPath("main", "abc", "preview"));
});

test("selects the event provider explicitly or from Home Assistant registries", () => {
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
  assert.equal(cameraEventProvider({ entity: "camera.protect", event_provider: "Protect" }, hass), "unifi_protect");
  assert.equal(cameraEventProvider({ entity: "camera.protect" }, hass), "unifi_protect");
  assert.equal(cameraEventProvider({ entity: "camera.by_device" }, hass), "unifi_protect");
  assert.equal(cameraEventProvider({ entity: "camera.regular" }, hass), "frigate");
});

test("renders a live camera and opens a modal that loads Frigate events", async () => {
  const calls = [];
  const state = {
    entity_id: "camera.front_door",
    attributes: {
      friendly_name: "Front Door",
      client_id: "frigate-main",
      camera_name: "front",
    },
  };
  const hass = {
    states: { "camera.front_door": state },
    callWS: async (message) => {
      calls.push(message);
      if (message.type === "frigate/events/get") {
        return [{ id: "event-1", start_time: 20, label: "person", has_clip: true }];
      }
      return { path: `${message.path}?authSig=signed` };
    },
    hassUrl: (path) => `https://home.example${path}`,
  };

  const card = new MaraoCameraCard();
  assert.throws(() => card.setConfig({}), /requires an entity/);
  const limitAlias = new MaraoCameraCard();
  limitAlias.setConfig({ entity: "camera.front_door", limit: 7 });
  assert.equal(limitAlias._config.limit, 7);
  card.setConfig({ entity: "camera.front_door", name: "Entry", event_limit: 5 });
  card.hass = hass;
  card.connectedCallback();
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(card.shadowRoot.innerHTML, /<ha-camera-stream/);
  assert.match(card.shadowRoot.innerHTML, /Open recent events for Entry/);
  assert.equal(card.shadowRoot.stream.hass, hass);
  assert.equal(card.shadowRoot.stream.stateObj, state);
  assert.equal(cameraControlImports, 1);
  assert.equal(calls.length, 0, "events stay lazy until the card is opened");

  const mountedStream = card.shadowRoot.stream;
  card.openEvents();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(calls[0], {
    type: "frigate/events/get",
    instance_id: "frigate-main",
    cameras: ["front"],
    limit: 5,
  });
  assert.equal(calls[1].type, "auth/sign_path");
  assert.match(card.shadowRoot.innerHTML, /role="dialog"|<dialog/);
  assert.match(card.shadowRoot.innerHTML, /person/);
  assert.equal(card.shadowRoot.dialog.open, true);
  assert.equal(card.shadowRoot.stream, mountedStream, "opening the modal keeps the live stream mounted");

  await card._openEvent(0);
  assert.equal(calls.at(-1).path, "/api/frigate/frigate-main/notifications/event-1/clip.mp4");
  assert.match(card.shadowRoot.innerHTML, /<video/);
  assert.equal(card.shadowRoot.stream, mountedStream, "event detail keeps the live stream mounted");

  const callsBeforeFallback = calls.length;
  card._events = [{ id: "thumbnail-only", label: "motion", thumbnailUrl: "https://home.example/thumbnail" }];
  await card._openEvent(0);
  assert.equal(card._selected.kind, "thumbnail");
  assert.equal(card._selected.url, "https://home.example/thumbnail");
  assert.equal(calls.length, callsBeforeFallback, "events without recordings reuse their thumbnail");

  card._handleClick({ target: { matches: (selector) => selector === "dialog.events-dialog" } });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<dialog/);

  card.openEvents();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.filter((call) => call.type === "frigate/events/get").length, 2);
  card.closeEvents();
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<dialog/);
});

test("discovers UniFi Protect events by camera device and resolves their media", async () => {
  const root = "media-source://unifiprotect";
  const consoleSource = `${root}/nvr:browse`;
  const cameraSource = `${root}/nvr:browse:front`;
  const recentSource = `${cameraSource}:all:recent:1`;
  const eventSource = `${root}/nvr:event:event-id`;
  const calls = [];
  const card = new MaraoCameraCard();
  card.setConfig({ entity: "camera.front_low", event_provider: "unifi_protect", event_limit: 1 });
  card._hass = {
    entities: {
      "camera.front_low": { platform: "unifiprotect", device_id: "front-device" },
      "camera.front_high": { platform: "unifiprotect", device_id: "front-device" },
    },
    callWS: async (message) => {
      calls.push(message);
      if (message.type === "media_source/resolve_media") {
        return { url: message.media_content_id.includes("eventthumb") ? "/thumbnail" : "/video" };
      }
      if (message.media_content_id === root) {
        return { children: [{ media_content_id: consoleSource }] };
      }
      if (message.media_content_id === consoleSource) {
        return { children: [{
          title: "Front",
          media_content_id: cameraSource,
          thumbnail: "/api/camera_proxy/camera.front_high",
        }] };
      }
      if (message.media_content_id === cameraSource) {
        return { children: [{ media_content_id: `${cameraSource}:all` }] };
      }
      if (message.media_content_id === recentSource) {
        return { children: [{ title: "Person detected", media_content_id: eventSource }] };
      }
      throw new Error(`Unexpected request: ${message.media_content_id}`);
    },
    hassUrl: (path) => `https://home.example${path}`,
  };

  await card._loadEvents({}, "protect", "unifi_protect");
  assert.equal(card._events[0].label, "Person detected");
  assert.equal(card._events[0].thumbnailUrl, "https://home.example/thumbnail");
  assert.deepEqual(
    calls.filter((call) => call.type === "media_source/browse_media").map((call) => call.media_content_id),
    [root, consoleSource, cameraSource, recentSource],
  );

  await card._openEvent(0);
  assert.deepEqual(calls.at(-1), {
    type: "media_source/resolve_media",
    media_content_id: eventSource,
  });
  assert.equal(card._selected.url, "https://home.example/video");
});

test("UniFi Protect helpers preserve event titles and match cameras on the same device", () => {
  const cameras = [{
    title: "Front Door",
    media_content_id: "media-source://unifiprotect/nvr:browse:front",
    thumbnail: "/api/camera_proxy/camera.front_high",
  }];
  const hass = {
    entities: {
      "camera.front_low": { device_id: "front-device" },
      "camera.front_high": { device_id: "front-device" },
    },
  };
  assert.equal(matchProtectCamera(cameras, "camera.front_low", hass), cameras[0]);
  const source = "media-source://unifiprotect/nvr:event:event-id";
  assert.equal(protectThumbnailMediaSource(source), "media-source://unifiprotect/nvr:eventthumb:event-id");
  assert.equal(normalizeProtectEvents({
    children: [{ title: "Person · 10:00", media_content_id: source }],
  }, 1)[0].label, "Person · 10:00");
});
