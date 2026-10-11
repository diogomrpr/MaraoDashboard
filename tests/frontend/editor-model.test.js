import test from "node:test";
import assert from "node:assert/strict";

import {
  buildJsonSchema,
  cardForEntity,
  flattenEntities,
  importAreaRoom,
  configuredEntityIds,
  entityCandidates,
  mergeEntityValues,
  moveItem,
  newEntityGroupId,
  normalizeConfig,
  preserveEntityValue,
  serializeConfig,
  validateConfig,
} from "../../frontend_src/editor-model.js";

test('group identifiers are stable safe values on HTTP, without randomUUID', () => {
  const ids = Array.from({ length: 100 }, () => newEntityGroupId());
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^group-[a-f0-9]{32}$/);
});

test('typed global group search retains unavailable candidates and independent room references', () => {
  const catalog = { cards: [{ id: 'hc_light_card', domains: ['light'] }, { id: 'hc_sensor_card', domains: ['sensor'] }] };
  const entities = [
    { entity_id: 'light.other', name: 'Other light', has_state: true, state: 'unavailable', area_id: 'elsewhere' },
    { entity_id: 'light.added', name: 'Added light', has_state: true },
    { entity_id: 'sensor.charge', name: 'Charge', has_state: true, device_class: 'battery' },
    { entity_id: 'sensor.temperature', name: 'Temperature', has_state: true, device_class: 'temperature' },
  ];
  const group = { template: 'hc_entity_group_card', entity_type: 'light', entities: ['light.added'] };
  assert.deepEqual(entityCandidates(catalog, entities, group).map(item => item.entity_id), ['light.other']);
  assert.equal(entityCandidates(catalog, entities, group, 'ADDED')[0].added, true);
  assert.deepEqual(entityCandidates(catalog, entities, { ...group, entity_type: 'battery', entities: [] }).map(item => item.entity_id), ['sensor.charge']);
  assert.deepEqual(validateConfig({ name: 'Home', rooms: [], overview: { entity_groups: [{ ...group, id: 'overview-lights', name: 'Blinds', entity_type: 'cover', entities: ['cover.blind'] }] } }), []);
});

for (const [kind, id, device_class] of [['light', 'light.main'], ['cover', 'cover.blind'], ['climate', 'climate.office'], ['battery', 'sensor.charge', 'battery']]) {
  test(`Entity Group ${kind} survives mixed order and unknown member options`, () => {
    const group = { template: 'hc_entity_group_card', id: 'office-group', name: 'Office', entity_type: kind,
      entities: [id, { entity_id: id, variables: { future: 42 }, extension: true }], future: { keep: true } };
    const config = { config_version: 1, name: 'Groups', rooms: [{ name: 'Office', columns: 2,
      entities: ['light.independent', group, { page: 'overview' }], cards: [{ type: 'markdown', content: 'Raw' }] }] };
    const normalized = normalizeConfig(config);
    assert.equal(normalized.rooms[0].entities[1].id, 'office-group');
    assert.deepEqual(serializeConfig(normalized), config);
    normalized.rooms[0].entities = moveItem(normalized.rooms[0].entities, 1, 0);
    const result = serializeConfig(normalized);
    assert.deepEqual(result.rooms[0].entities[0], group);
    assert.deepEqual(validateConfig(result, 1, [{ entity_id: id, device_class }]), []);
  });
}

test('empty direct and grouped Entity Group objects are preserved without member expansion', () => {
  const group = { template: 'hc_entity_group_card', id: 'empty', name: 'Empty', entity_type: 'light', entities: [] };
  for (const entities of [group, [group], { entity_group: [group] }]) {
    const config = { name: 'Groups', rooms: [{ name: 'Room', entities }] };
    assert.equal(flattenEntities(entities).length, 1);
    assert.deepEqual(serializeConfig(normalizeConfig(config)), config);
    assert.deepEqual(validateConfig(config), []);
  }
});

test('Entity Group validation rejects invalid, incompatible, nested and colliding groups', () => {
  const base = { template: 'hc_entity_group_card', id: 'safe', name: 'Group', entity_type: 'light', entities: [] };
  for (const change of [{ id: '../unsafe' }, { entity_type: 'sensor' }, { popup_filter: 'off' }, { popup_filter: null },
    { entities: ['cover.blind'] }, { entities: [{ page: 'overview' }] }, { entities: [{ entity_id: 'light.main', entities: [] }] },
    { entities: [{ entity_id: 'light.main', template: 'hc_battery_card' }] }, { entities: [false] }, { entity_id: 'light.main' }, { name: '' }, { entities: null }, { icon: [] },
    { entities: [{ entity_id: 'light.main', template: {} }] }, { entities: [{ entity_id: 'light.main', variables: [] }] }]) {
    assert.ok(validateConfig({ name: 'Groups', rooms: [{ name: 'Room', entities: [{ ...base, ...change }] }] }).length, JSON.stringify(change));
  }
  assert.ok(validateConfig({ name: 'Groups', overview: { entity_groups: [base] }, rooms: [{ name: 'Room', entities: [base] }] }).some(error => error.includes('Duplicate')));
  assert.ok(validateConfig({ name: 'Groups', rooms: [{ name: 'Room', entities: [{ ...base, id: 'overview-lights' }] }] }).some(error => error.includes('reserved')));
  const battery = { ...base, entity_type: 'battery', entities: ['sensor.charge'] };
  const config = { name: 'Groups', rooms: [{ name: 'Room', entities: [battery] }] };
  assert.ok(validateConfig(config, 1, [{ entity_id: 'sensor.charge', device_class: 'temperature' }]).some(error => error.includes('incompatible')));
  assert.deepEqual(validateConfig(config, 1, []), []);
});

test("dashboard format survives Visual/JSON round trips with raw and unknown content", () => {
  const source = {
    config_version: 0, name: "Home", overview: {}, pages: {},
    extension: { ordered: ["second", "first"] },
    rooms: [{ name: "Office", area: "office", entities: [],
      cards: [{ type: "custom:extension", options: { future: true } }], unknown: 42 }],
  };
  const draft = normalizeConfig(source);
  assert.deepEqual(serializeConfig(draft), source);
  const jsonDraft = JSON.parse(JSON.stringify(serializeConfig(draft)));
  assert.deepEqual(serializeConfig(normalizeConfig(jsonDraft)), source);
  assert.deepEqual(validateConfig(source), []);
  assert.deepEqual(validateConfig({ name: "Legacy", rooms: [] }), []);
  const schema = buildJsonSchema({ cards: [], pages: {}, config_version: 0 }, []);
  assert.deepEqual(schema.properties.config_version, {
    type: "integer", minimum: 0, maximum: 0,
    description: "Dashboard format version; omitted means legacy format 0.",
  });
  assert.ok(!schema.required.includes("config_version"));
});

test("format validation rejects malformed/future markers without modifying the draft", () => {
  for (const version of [null, true, false, -1, 0.5, "0", [], {}, 2]) {
    const source = { name: "Home", rooms: [], config_version: version };
    const original = JSON.stringify(source);
    assert.equal(validateConfig(source).length, 1);
    assert.equal(JSON.stringify(source), original);
  }
  assert.deepEqual(validateConfig({ name: "Home", rooms: [], config_version: 1 }, 1), []);
  assert.equal(buildJsonSchema({ cards: [], pages: {}, config_version: 1 }, []).properties.config_version.maximum, 1);
});

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

test("legacy ordered lists keep their shape and order after edits without a column setting", () => {
  const source = { name: "Ordered legacy room", rooms: [{ name: "Room", entities: ["light.first", "switch.load", "light.second"] }] };
  const model = normalizeConfig(source);
  assert.deepEqual(serializeConfig(model), source);
  model.rooms[0].entities[1].name = "Edited load";
  assert.deepEqual(serializeConfig(model), { name: source.name, rooms: [{ name: "Room", entities: ["light.first", { entity_id: "switch.load", name: "Edited load" }, "light.second"] }] });
  model.pages.media = {};
  assert.deepEqual(serializeConfig(model).pages, { media: {} });
  delete model.pages.media;
  assert.equal(Object.hasOwn(serializeConfig(model), "pages"), false);
});

test("area import is an editable snapshot retaining its suggestion area", () => {
  const room = importAreaRoom(
    { area_id: "kitchen", name: "Kitchen", icon: "mdi:countertop" },
    [
      { entity_id: "light.kitchen", domain: "light", area_id: "kitchen", has_state: true },
      { entity_id: "sensor.other", domain: "sensor", area_id: "other" },
    ],
    ["light", "sensor"],
  );

  assert.equal(room.name, "Kitchen");
  assert.equal(room.area, "kitchen");
  assert.deepEqual(room.entities.map((item) => item.entity_id), ["light.kitchen"]);
});

test("current rooms serialize empty selections and preserve their suggestion association", () => {
  const source = { name: "Home", config_version: 1, rooms: [
    { name: "Kitchen", area: "kitchen", custom_room: true },
    { name: "Office", area: "office", entities: ["light.desk"] },
  ] };
  const model = normalizeConfig(source);
  assert.deepEqual(serializeConfig(model).rooms[0], { ...source.rooms[0], entities: [] });
  model.rooms[1].entities.splice(0, 1);
  model.rooms[1].area = "kitchen";
  const saved = serializeConfig(model);
  assert.deepEqual(saved.rooms[1], { name: "Office", area: "kitchen", entities: [] });
  assert.deepEqual(serializeConfig(normalizeConfig(saved)), saved);
  assert.equal(saved.config_version, 1);
});

test("entity candidates respect effective areas, compatibility, state metadata and existing raw references", () => {
  const catalog = { cards: [
    { id: 'hc_light_card', domains: ['light'] },
    { id: 'hc_sensor_card', domains: ['sensor'] },
    { id: 'hc_battery_card', domains: ['sensor'], device_classes: ['battery'] },
  ] };
  const entity = (entity_id, options = {}) => ({ entity_id, area_id: 'office', has_state: true, ...options });
  const entities = [entity('light.selected'), entity('light.raw'), entity('light.device', { area_id: null, device_area_id: 'office' }),
    entity('sensor.battery', { name: 'Remote battery', device_class: 'battery', state: 'unavailable' }),
    entity('light.elsewhere', { name: 'Kitchen lamp', area_id: 'kitchen', device_area_id: 'office' }),
    entity('light.hidden', { hidden_by: 'user' }), entity('light.disabled', { disabled_by: 'user' }),
    entity('light.absent', { has_state: false }), entity('automation.unsupported')];
  const room = { area: 'office', entities: ['light.selected'], cards: [{ type: 'grid', cards: [
    { type: 'custom:marao-card', variables: { light_entities: ['light.raw'], future: '{{ light.expression }}' } },
    { type: 'markdown', content: 'light.description' },
  ] }] };
  assert.deepEqual([...configuredEntityIds(room)].sort(), ['light.raw', 'light.selected']);
  assert.deepEqual(entityCandidates(catalog, entities, room).map(item => item.entity_id), ['light.device', 'sensor.battery']);
  assert.equal(entityCandidates(catalog, entities, room).find(item => item.entity_id === 'sensor.battery').card.id, 'hc_battery_card');
  assert.equal(entityCandidates(catalog, entities, room, 'LIGHT.SELECTED')[0].added, true);
  assert.equal(entityCandidates(catalog, entities, room, 'kItChEn')[0].entity_id, 'light.elsewhere');
  assert.deepEqual(entityCandidates(catalog, entities, { entities: [] }), []);
  assert.equal(entityCandidates(catalog, entities, { entities: [] }, 'REMOTE')[0].entity_id, 'sensor.battery');
  room.entities = [];
  assert.ok(entityCandidates(catalog, entities, room).some(item => item.entity_id === 'light.selected'));
});

test("importing a room uses device fallback only when the entity has no area", () => {
  const room = importAreaRoom({ area_id: 'office', name: 'Office' }, [
    { entity_id: 'light.inherited', device_area_id: 'office', has_state: true },
    { entity_id: 'light.elsewhere', area_id: 'kitchen', device_area_id: 'office', has_state: true },
    { entity_id: 'light.absent', area_id: 'office', has_state: false },
  ], ['light']);
  assert.deepEqual(room.entities.map(item => item.entity_id), ['light.inherited']);
});

test("format-1 room instructions report validation errors while custom-page contracts remain supported", () => {
  for (const instruction of ['include', 'exclude', 'overrides']) {
    const config = { name: 'Home', config_version: 1, rooms: [{ name: 'Room', [instruction]: [] }] };
    assert.match(validateConfig(config).join(' '), /explicit entities/);
  }
  assert.deepEqual(validateConfig({ name: 'Home', config_version: 1, rooms: [], pages: { custom: [{ name: 'Custom', path: 'custom', include: ['light.new'] }] } }), []);
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

test('energy formatting validates shape and actual units without rewriting drafts', () => {
  const units={W:['power',1],kW:['power',1000],Wh:['energy',1],kWh:['energy',1000],J:['energy',1/3600]};
  const entities=[{entity_id:'sensor.power',unit_of_measurement:'W'},{entity_id:'sensor.history',unit_of_measurement:'Wh'}];
  const config={name:'Energy',rooms:[{name:'Room',entities:[{entity_id:'switch.load',variables:{power_entity:'sensor.power',power_unit:'MW',display_unit:'kW',display_precision:0,future:true}}]}]};
  const before=JSON.stringify(config);
  assert.deepEqual(validateConfig(config,0,entities,units),[]);
  assert.equal(JSON.stringify(config),before);
  for(const precision of [false,true,null,'0',1.5,-1,7]) {
    const invalid=structuredClone(config);invalid.rooms[0].entities[0].variables.display_precision=precision;
    assert.match(validateConfig(invalid,0,entities,units).join(' '),/Decimal places/);
  }
  const graph={name:'Energy',rooms:[],pages:{custom:[{name:'Custom',path:'custom',cards:[{type:'custom:marao-card',template:'hc_graph_card',entity:'sensor.power',variables:{display_unit:'kW',graph_entity:'sensor.history'}}]}]}};
  assert.match(validateConfig(graph,0,entities,units).join(' '),/incompatible/);
  assert.match(validateConfig(config,0,[],units).join(' '),/source unit/);
  delete config.rooms[0].entities[0].variables.display_unit;
  assert.deepEqual(validateConfig(config,0,[],units),[]);
});

test('energy options survive independent duplicates, normalization and retained selectors', () => {
  const config={name:'Energy',overview:{},rooms:[{name:'Room',columns:1,entities:[
    {entity_id:'sensor.power',variables:{display_unit:'kW',display_precision:0,retained:'first'}},
    {entity_id:'sensor.power',variables:{display_unit:'W',display_precision:6,retained:'second'}},
  ]}],pages:{energy:{today_energy:{entity_id:'sensor.energy',variables:{display_unit:'kWh',display_precision:2},future:true}}},extension:{keep:true}};
  assert.deepEqual(serializeConfig(normalizeConfig(config)),config);
  const slot=config.pages.energy.today_energy;
  assert.deepEqual(preserveEntityValue(slot,'sensor.new'),{...slot,entity_id:'sensor.new'});
});

test('independent energy expected document survives Visual and JSON with raw content', async () => {
  const fs=await import('node:fs/promises');
  const base=new URL('../../ha-test/upgrade/fixtures/',import.meta.url);
  const bytes=await fs.readFile(new URL('energy-formatting-input.json',base),'utf8');
  const expected=JSON.parse(await fs.readFile(new URL('energy-formatting-expected.json',base),'utf8'));
  const visual=serializeConfig(normalizeConfig(JSON.parse(bytes)));
  assert.deepEqual(visual,expected);
  assert.deepEqual(serializeConfig(normalizeConfig(JSON.parse(JSON.stringify(visual)))),expected);
  assert.equal(await fs.readFile(new URL('energy-formatting-input.json',base),'utf8'),bytes);
  const provenance=JSON.parse(await fs.readFile(new URL('provenance.json',base),'utf8'));
  for(const record of provenance){
    const released=JSON.parse(await fs.readFile(new URL(record.fixture,base),'utf8'));
    const expected=JSON.parse(await fs.readFile(new URL(record.expected,base),'utf8'));
    assert.deepEqual(serializeConfig(normalizeConfig(released)),expected,record.tag);
  }
  const inventory=JSON.parse(await fs.readFile(new URL('inventory.json',base),'utf8'));
  for(const record of inventory.preservation_cases){
    const saved=JSON.parse(await fs.readFile(new URL(record.input,base),'utf8'));
    assert.deepEqual(serializeConfig(normalizeConfig(saved)),saved,record.id);
  }
});
