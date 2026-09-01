import test from "node:test";
import assert from "node:assert/strict";

class FakeShadowRoot {
  constructor() {
    this.innerHTML = "";
  }

  addEventListener() {}
  querySelector() { return undefined; }
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
globalThis.window = { customCards: [] };

const {
  buildDashboardConfig,
  loadHomeAssistantRegistries,
  MaraoDashboardBuilder,
  MaraoEntityCard,
  MaraoHeaderCard,
  MaraoRoomCard,
  normalizeDashboardPath,
  saveStorageDashboard,
  slugify,
} = await import("../../custom_components/marao_dashboard/frontend/MaraoDashboard.js");

test("normalizes labels and storage dashboard paths", () => {
  assert.equal(slugify(" Sala São João "), "sala-sao-joao");
  assert.equal(slugify("Kitchen & Dining"), "kitchen-dining");
  assert.equal(normalizeDashboardPath("/Marao/"), "marao-dashboard");
  assert.equal(normalizeDashboardPath("My Home"), "my-home");
  assert.equal(normalizeDashboardPath(""), "marao-dashboard");
});

const registries = {
  areas: [
    { area_id: "outside", name: "Outside", icon: "mdi:tree" },
    { area_id: "living", name: "Living Room", icon: "mdi:sofa" },
    { area_id: "duplicate", name: "Living Room" },
  ],
  devices: [
    { id: "living-device", area_id: "living" },
    { id: "outside-device", area_id: "outside" },
  ],
  entities: [
    { entity_id: "light.ceiling", area_id: "living", original_name: "Ceiling" },
    { entity_id: "climate.thermostat", device_id: "living-device", name: "Thermostat" },
    { entity_id: "camera.driveway", device_id: "outside-device", original_name: "Driveway" },
    { entity_id: "switch.disabled", area_id: "living", disabled_by: "user" },
    { entity_id: "sensor.hidden", area_id: "living", hidden_by: "integration" },
    { entity_id: "sensor.unassigned", original_name: "No room" },
  ],
};

test("builds overview and area Sections views from active registry entities", () => {
  const config = buildDashboardConfig({
    title: "Our Home",
    urlPath: "our-home",
    ...registries,
  });

  assert.equal(config.title, "Our Home");
  assert.ok(config.views.every((view) => view.theme === "Marao Dashboard"));
  assert.equal(config.views.length, 4);
  assert.deepEqual(config.views.map((view) => view.type), ["sections", "sections", "sections", "sections"]);
  assert.equal(config.views[0].path, "home");
  assert.deepEqual(config.views.slice(1).map((view) => view.path), ["living-room", "living-room-2", "outside"]);

  const overviewCards = config.views[0].sections.flatMap((section) => section.cards);
  assert.equal(overviewCards[0].type, "custom:marao-header-card");
  const roomCards = overviewCards.filter((card) => card.type === "custom:marao-room-card");
  assert.equal(roomCards.length, 3);
  assert.equal(roomCards.find((card) => card.area_id === "outside").navigation_path, "/our-home/outside");

  const living = config.views.find((view) => view.path === "living-room");
  const livingCards = living.sections.flatMap((section) => section.cards);
  assert.ok(livingCards.some((card) => card.type === "custom:marao-room-card"));
  assert.deepEqual(
    livingCards.filter((card) => card.type === "heading").map((card) => card.heading),
    ["Lights", "Climate"],
  );
  assert.deepEqual(
    livingCards.filter((card) => card.type === "custom:marao-entity-card").map((card) => card.entity),
    ["light.ceiling", "climate.thermostat"],
  );

  const outside = config.views.find((view) => view.path === "outside");
  const camera = outside.sections.flatMap((section) => section.cards)
    .find((card) => card.entity === "camera.driveway");
  assert.deepEqual(camera, {
    type: "custom:marao-camera-card",
    entity: "camera.driveway",
    name: "Driveway",
  });

  const serialized = JSON.stringify(config);
  assert.doesNotMatch(serialized, /switch\.disabled|sensor\.hidden|sensor\.unassigned/);
});

test("limits generated views to the selected areas", () => {
  const config = buildDashboardConfig({
    ...registries,
    selectedAreaIds: ["outside"],
  });
  assert.deepEqual(config.views.map((view) => view.path), ["home", "outside"]);
  assert.equal(config.views[0].sections[1].cards[0].camera_count, 1);
  assert.equal(config.views[0].sections[1].cards[0].entity_count, 1);
});

test("loads registries with the current Home Assistant websocket commands", async () => {
  const calls = [];
  const results = [[{ area_id: "living" }], [{ id: "device" }], [{ entity_id: "light.one" }], [{ id: "dash" }]];
  const loaded = await loadHomeAssistantRegistries({
    callWS: async (message) => {
      calls.push(message);
      return results[calls.length - 1];
    },
  });
  assert.deepEqual(calls, [
    { type: "config/area_registry/list" },
    { type: "config/device_registry/list" },
    { type: "config/entity_registry/list" },
    { type: "lovelace/dashboards/list" },
  ]);
  assert.deepEqual(loaded.areas, results[0]);
  assert.deepEqual(loaded.dashboards, results[3]);
});

test("creates then saves a storage-mode dashboard", async () => {
  const calls = [];
  const hass = {
    user: { is_admin: true },
    callWS: async (message) => {
      calls.push(message);
      if (message.type === "lovelace/dashboards/list") return [];
      if (message.type === "lovelace/dashboards/create") return { id: "dashboard-id", ...message };
      return undefined;
    },
  };
  const config = { title: "Marao", views: [] };
  const result = await saveStorageDashboard(hass, { title: "Marao", urlPath: "marao", config });

  assert.equal(result.created, true);
  assert.equal(result.urlPath, "marao-dashboard");
  assert.deepEqual(calls, [
    { type: "lovelace/dashboards/list" },
    {
      type: "lovelace/dashboards/create",
      url_path: "marao-dashboard",
      title: "Marao",
      icon: "mdi:view-dashboard-variant",
      show_in_sidebar: true,
      require_admin: false,
      mode: "storage",
    },
    { type: "lovelace/config/save", url_path: "marao-dashboard", config },
  ]);
});

test("requires explicit overwrite before replacing an existing dashboard", async () => {
  const existing = {
    id: "existing-id",
    url_path: "marao-dashboard",
    mode: "storage",
    title: "Old title",
    icon: "mdi:old",
    show_in_sidebar: true,
    require_admin: false,
  };
  const previousConfig = { title: "Previous", views: [{ path: "old" }] };
  const calls = [];
  const hass = {
    user: { is_admin: true },
    callWS: async (message) => {
      calls.push(message);
      if (message.type === "lovelace/dashboards/list") return [existing];
      if (message.type === "lovelace/config") return previousConfig;
      if (message.type === "lovelace/dashboards/update") return { ...existing, ...message };
      return undefined;
    },
  };
  const config = { views: [] };
  await assert.rejects(
    saveStorageDashboard(hass, { urlPath: "marao-dashboard", config }),
    /already exists/,
  );
  assert.deepEqual(calls, [{ type: "lovelace/dashboards/list" }]);

  calls.length = 0;
  const result = await saveStorageDashboard(hass, {
    title: "New title",
    urlPath: "marao-dashboard",
    config,
    overwrite: true,
  });
  assert.equal(result.created, false);
  assert.deepEqual(calls, [
    { type: "lovelace/dashboards/list" },
    { type: "lovelace/config", url_path: "marao-dashboard", force: true },
    {
      type: "lovelace/dashboards/update",
      dashboard_id: "existing-id",
      title: "New title",
    },
    { type: "lovelace/config/save", url_path: "marao-dashboard", config },
  ]);
});

test("restores config and dashboard metadata when an overwrite save fails", async () => {
  const existing = {
    id: "existing-id",
    url_path: "marao-dashboard",
    mode: "storage",
    title: "Original title",
    icon: "mdi:shield-home",
    show_in_sidebar: false,
    require_admin: true,
  };
  const previousConfig = { title: "Original config", views: [{ path: "original" }] };
  const replacement = { title: "Replacement", views: [{ path: "replacement" }] };
  const saveError = new Error("replacement save failed");
  const calls = [];
  const hass = {
    user: { is_admin: true },
    callWS: async (message) => {
      calls.push(message);
      if (message.type === "lovelace/dashboards/list") return [existing];
      if (message.type === "lovelace/config") return previousConfig;
      if (message.type === "lovelace/config/save" && message.config === replacement) throw saveError;
      return undefined;
    },
  };

  await assert.rejects(
    saveStorageDashboard(hass, {
      title: "Replacement title",
      urlPath: "marao-dashboard",
      config: replacement,
      overwrite: true,
    }),
    (error) => error === saveError,
  );

  assert.deepEqual(calls.slice(-2), [
    {
      type: "lovelace/config/save",
      url_path: "marao-dashboard",
      config: previousConfig,
    },
    {
      type: "lovelace/dashboards/update",
      dashboard_id: "existing-id",
      title: "Original title",
    },
  ]);
});

test("rolls back a newly created dashboard when saving its config fails", async () => {
  const calls = [];
  const saveError = new Error("save failed");
  const hass = {
    user: { is_admin: true },
    callWS: async (message) => {
      calls.push(message);
      if (message.type === "lovelace/dashboards/list") return [];
      if (message.type === "lovelace/dashboards/create") return { id: "new-id" };
      if (message.type === "lovelace/config/save") throw saveError;
      return undefined;
    },
  };
  await assert.rejects(
    saveStorageDashboard(hass, { urlPath: "marao-dashboard", config: { views: [] } }),
    (error) => error === saveError,
  );
  assert.equal(calls.at(-1).type, "lovelace/dashboards/delete");
  assert.equal(calls.at(-1).dashboard_id, "new-id");
});

test("registers the builder and generated custom cards", () => {
  assert.equal(elements.get("marao-dashboard-builder"), MaraoDashboardBuilder);
  assert.equal(elements.get("marao-header-card"), MaraoHeaderCard);
  assert.equal(elements.get("marao-room-card"), MaraoRoomCard);
  assert.equal(elements.get("marao-entity-card"), MaraoEntityCard);
  assert.deepEqual(
    window.customCards.map((card) => card.type).sort(),
    [
      "marao-camera-card",
      "marao-dashboard-builder",
      "marao-entity-card",
      "marao-header-card",
      "marao-room-card",
    ].sort(),
  );
});

test("declares compact Sections grid sizes and valid card picker stubs", () => {
  assert.deepEqual(new MaraoDashboardBuilder().getGridOptions(), { columns: 6, min_columns: 6 });
  assert.deepEqual(new MaraoHeaderCard().getGridOptions(), {
    columns: 6,
    rows: 3,
    min_columns: 3,
    min_rows: 2,
  });
  assert.deepEqual(new MaraoRoomCard().getGridOptions(), {
    columns: 3,
    rows: 3,
    min_columns: 3,
    min_rows: 2,
  });
  assert.deepEqual(new MaraoEntityCard().getGridOptions(), {
    columns: 3,
    rows: 2,
    min_columns: 3,
    min_rows: 1,
  });
  assert.deepEqual(new (elements.get("marao-camera-card"))().getGridOptions(), {
    columns: 6,
    min_columns: 3,
  });

  assert.doesNotThrow(() => new MaraoHeaderCard().setConfig(MaraoHeaderCard.getStubConfig()));
  assert.doesNotThrow(() => new MaraoRoomCard().setConfig(MaraoRoomCard.getStubConfig()));
  assert.doesNotThrow(() => new MaraoEntityCard().setConfig(MaraoEntityCard.getStubConfig()));
});

test("never exposes one-click unlock but keeps the safe lock action", () => {
  const card = new MaraoEntityCard();
  card.setConfig({ entity: "lock.front_door" });
  card.hass = {
    states: {
      "lock.front_door": { state: "locked", attributes: { friendly_name: "Front Door" } },
    },
  };
  assert.match(card.shadowRoot.innerHTML, /data-service="more-info"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-service="unlock"/);

  card.hass = {
    states: {
      "lock.front_door": { state: "unlocked", attributes: { friendly_name: "Front Door" } },
    },
  };
  assert.match(card.shadowRoot.innerHTML, /data-service="lock"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data-service="unlock"/);
});
