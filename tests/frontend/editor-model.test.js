import test from "node:test";
import assert from "node:assert/strict";

import {
  buildJsonSchema,
  cardForEntity,
  flattenEntities,
  importAreaRoom,
  materializeAreaRoom,
  mergeEntityValues,
  moveItem,
  normalizeConfig,
  serializeConfig,
} from "../../frontend_src/editor-model.js";

test("camera entities use the Frigate-compatible camera template", () => {
  const cameraCard = { id: "hc_camera_card", domains: ["camera"] };
  assert.equal(
    cardForEntity({ cards: [cameraCard] }, { entity_id: "camera.front_door" }),
    cameraCard,
  );
});

test("legacy entity shapes normalize and serialize without unknown-field loss", () => {
  const source = {
    name: "Home",
    custom_root: { keep: true },
    rooms: [
      {
        name: "Office",
        custom_room: "keep",
        entities: {
          light: ["light.desk", { entity_id: "light.ceiling", custom_entity: 42 }],
          sensor: { entity_id: "sensor.temperature", name: "Temperature" },
        },
      },
    ],
  };

  const model = normalizeConfig(source);
  assert.deepEqual(
    model.rooms[0].entities.map((item) => item.entity_id),
    ["light.desk", "light.ceiling", "sensor.temperature"],
  );
  const serialized = serializeConfig(model);
  assert.equal(serialized.custom_root.keep, true);
  assert.equal(serialized.rooms[0].custom_room, "keep");
  assert.equal(serialized.rooms[0].entities.light[0], "light.desk");
  assert.equal(serialized.rooms[0].entities.light[1].custom_entity, 42);
});

test("unknown overview and page fields survive a visual round trip", () => {
  const source = {
    name: "Home",
    overview: { weather_entity: "weather.home", future_overview: { mode: "keep" } },
    pages: { energy: { house_power: "sensor.power", future_page: [1, 2, 3] } },
    rooms: [],
  };

  assert.deepEqual(serializeConfig(normalizeConfig(source)), source);
});

test("custom pages, navbar order, and page shortcuts survive a visual round trip", () => {
  const source = {
    name: "Custom pages",
    navigation: ["studio", "overview"],
    overview: {},
    rooms: [{ name: "Office", entities: { navigation: [{ page: "studio", name: "Studio" }] } }],
    pages: {
      custom: [{
        name: "Studio",
        path: "studio",
        icon: "mdi:palette",
        custom_page: true,
        entities: { light: ["light.studio"], navigation: [{ page: "overview", icon: "mdi:home" }] },
      }],
    },
  };

  const model = normalizeConfig(source);
  assert.equal(model.rooms[0].entities[0].page, "studio");
  assert.deepEqual(model.pages.custom[0].entities.map((item) => item.page || item.entity_id), ["light.studio", "overview"]);
  assert.deepEqual(serializeConfig(model), source);
});

test("column layouts preserve card order across entity types", () => {
  const source = {
    name: "Columns",
    overview: {},
    pages: {},
    rooms: [{
      name: "Office",
      columns: 3,
      entities: ["light.desk", "climate.office", { page: "overview", name: "Home" }],
    }],
  };

  const serialized = serializeConfig(normalizeConfig(source));
  assert.deepEqual(serialized, source);
  assert.deepEqual(serialized.rooms[0].entities.map((item) => typeof item === "string" ? item : item.page), ["light.desk", "climate.office", "overview"]);
});

test("area import is an editable snapshot without an area link", () => {
  const room = importAreaRoom(
    { area_id: "kitchen", name: "Kitchen", icon: "mdi:countertop" },
    [
      { entity_id: "light.kitchen", domain: "light", area_id: "kitchen" },
      { entity_id: "sensor.other", domain: "sensor", area_id: "other" },
    ],
    ["light", "sensor"],
  );

  assert.equal(room.name, "Kitchen");
  assert.equal(room.area, undefined);
  assert.deepEqual(room.entities.map((item) => item.entity_id), ["light.kitchen"]);
});

test("an untouched area-linked room keeps its original entity structure", () => {
  const missingEntities = { name: "Kitchen", area: "kitchen", custom_room: true };
  const explicitEntities = { name: "Office", area: "office", entities: ["light.desk"] };
  const serialized = serializeConfig(normalizeConfig({
    name: "Home",
    rooms: [missingEntities, explicitEntities],
  }));

  assert.deepEqual(serialized.rooms[0], missingEntities);
  assert.deepEqual(serialized.rooms[1], explicitEntities);
});

test("linked area room materializes includes, excludes, and overrides", () => {
  const room = materializeAreaRoom(
    {
      name: "Kitchen",
      area: "kitchen",
      entities: ["light.extra"],
      exclude: ["sensor.kitchen"],
      overrides: { "light.kitchen": { name: "Main light" } },
    },
    [
      { entity_id: "light.kitchen", domain: "light", area_id: "kitchen" },
      { entity_id: "sensor.kitchen", domain: "sensor", area_id: "kitchen" },
    ],
    ["light", "sensor"],
  );

  assert.equal(room.area, undefined);
  assert.deepEqual(
    room.entities.map((item) => item.entity_id),
    ["light.kitchen", "light.extra"],
  );
  assert.equal(room.entities[0].name, "Main light");
});

test("item reordering is immutable", () => {
  const original = ["one", "two", "three"];
  assert.deepEqual(moveItem(original, 2, 0), ["three", "one", "two"]);
  assert.deepEqual(original, ["one", "two", "three"]);
});

test("page selections preserve options attached to unchanged entities", () => {
  const existing = [
    "media_player.kitchen",
    { entity_id: "media_player.tv", apple_tv: { remote_entity: "remote.tv" }, future: true },
  ];

  assert.deepEqual(
    mergeEntityValues(existing, ["media_player.tv", "media_player.office"]),
    [
      { entity_id: "media_player.tv", apple_tv: { remote_entity: "remote.tv" }, future: true },
      "media_player.office",
    ],
  );
});

test("Monaco schema includes dynamic entity and page completions", () => {
  const catalog = {
    cards: [{ id: "hc_light_card" }],
    pages: {
      energy: {
        label: "Energy",
        fields: [{ key: "house_power", kind: "entity", domains: ["sensor"] }],
      },
    },
  };
  const schema = buildJsonSchema(catalog, [
    { entity_id: "light.kitchen" },
    { entity_id: "weather.home" },
  ]);

  assert.deepEqual(schema.required, ["name", "rooms"]);
  assert.deepEqual(schema.properties.overview.properties.weather_entity.enum, ["weather.home"]);
  assert.equal(schema.properties.pages.properties.energy.type, "object");
  assert.equal(schema.properties.rooms.items.properties.columns.maximum, 6);
  assert.ok(schema.properties.pages.properties.energy.properties.house_power);
  assert.equal(
    schema.properties.pages.properties.energy.properties.house_power.anyOf[0].anyOf[1].pattern,
    "^[a-z0-9_]+\\.[a-z0-9_]+$",
  );
  assert.equal(flattenEntities("light.kitchen")[0].entity_id, "light.kitchen");
});
