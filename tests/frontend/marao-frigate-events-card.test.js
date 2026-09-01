import test from "node:test";
import assert from "node:assert/strict";

import {
  cameraEventProvider,
  frigateEventPath,
  frigateIdentity,
  MaraoCameraEventsCard,
  MaraoFrigateEventsCard,
  matchProtectCamera,
  normalizeFrigateEvents,
  normalizeProtectEvents,
  protectThumbnailMediaSource,
} from "../../custom_components/marao_dashboard/frontend/MaraoFrigateEventsCard.js";

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

test("Frigate events are requested and media is signed through Home Assistant", async () => {
  const calls = [];
  const card = new MaraoFrigateEventsCard();
  card._config = { entity: "camera.front_door", limit: 12 };
  card._hass = {
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
