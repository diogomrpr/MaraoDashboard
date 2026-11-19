import assert from 'node:assert/strict';
import test from 'node:test';
import {dishwasherControls, startDishwasherProgram} from '../../custom_components/marao_dashboard/frontend/MaraoCards.js';
import {getExample, getScenario} from '../../docs/examples/manifest.js';
import {createSimulation} from '../../docs/playground/simulation.js';

test('dishwasher Start requires a ready appliance and targets its selected program device', () => {
  const example = getExample('dishwasher').scenarios.find(item => item.id === 'ready');
  const {hass} = createSimulation(example);
  const config = {...example.config, entity: example.config.entity_id};
  const v = config.variables;
  const controls = () => dishwasherControls(config, hass);

  assert.equal(hass.states[v.active_program_entity].state, 'unknown');
  assert.equal(controls().start.enabled, true);
  assert.equal(controls().start.device, hass.entities[v.selected_program_entity].device_id);
  for (const [id, state] of [[v.door_entity, 'open'], [v.connection_entity, 'off'], [v.remote_start_entity, 'off'], [v.remote_control_entity, 'unavailable'], [v.power_entity, 'unavailable'], [v.selected_program_entity, 'unknown'], [config.entity, 'run']]) {
    const saved = hass.states[id];
    hass.states[id] = {...saved, state};
    assert.equal(controls().start.enabled, false, `${id} ${state}`);
    hass.states[id] = saved;
  }
  const activeSelector = {...hass.entities[v.selected_program_entity], translation_key: 'active_program'};
  const wrongRole = {...hass, entities: {...hass.entities, [v.selected_program_entity]: activeSelector}};
  assert.equal(dishwasherControls(config, wrongRole).program.enabled, false);
  assert.equal(dishwasherControls(config, wrongRole).start.enabled, false);
  const monitoring = {...config, variables: {active_program_entity: v.active_program_entity}};
  assert.equal(dishwasherControls(monitoring, hass).start.enabled, false);
  const wrongDevice = structuredClone(hass.entities[v.door_entity]);
  wrongDevice.device_id = 'another-dishwasher';
  assert.equal(dishwasherControls(config, {...hass, entities: {...hass.entities, [v.door_entity]: wrongDevice}}).start.enabled, false);
});

function wakeFixture() {
  const example = getScenario('dishwasher', 'power-off');
  const {hass} = createSimulation(example);
  const config = {...example.config, entity:example.config.entity_id};
  const variables = config.variables;
  const program = hass.states[variables.selected_program_entity].attributes.options.find(value => value.includes('quick_45'));
  assert.ok(program);
  const calls = [];
  const owner = {
    _config:config, isConnected:true, preview:false,
    _hass:{...hass, callService:async (domain, service, data) => { calls.push({domain, service, data}); }},
    _dishwasherRequest:{draft:program},
  };
  function report(updates) {
    const states = {...owner._hass.states};
    for (const [id, state] of Object.entries(updates)) states[id] = {...states[id], state};
    owner._hass = {...owner._hass, states};
    owner._dishwasherRequest.wake?.update(owner._hass);
  }
  return {owner, variables, config, program, calls, report};
}

test('one Start wakes a powered-off dishwasher and starts exactly the drafted cycle once ready', async () => {
  const {owner, variables, config, program, calls, report} = wakeFixture();
  const before = dishwasherControls(config, owner._hass, program);
  assert.equal(before.program.enabled, true);
  assert.equal(before.start.enabled, true);
  assert.deepEqual(calls, []);
  const started = startDishwasherProgram(owner);
  assert.deepEqual(calls, [{domain:'switch', service:'turn_on', data:{entity_id:variables.power_entity}}]);
  assert.equal(await startDishwasherProgram(owner), false);
  report({[variables.power_entity]:'on', [config.entity]:'inactive'});
  assert.equal(calls.length, 1);
  report({[config.entity]:'ready'});
  assert.equal(await started, true);
  report({[config.entity]:'ready'});
  assert.deepEqual(calls.slice(1), [{
    domain:'home_connect', service:'set_program_and_options',
    data:{device_id:owner._hass.entities[variables.selected_program_entity].device_id, affects_to:'active_program', program},
  }]);
});

test('opening the door or losing remote start during wake cancels the command permanently', async () => {
  for (const [role, interrupted, restored] of [['door_entity','open','closed'], ['remote_start_entity','off','on']]) {
    const {owner, variables, config, calls, report} = wakeFixture();
    const started = startDishwasherProgram(owner);
    report({[variables[role]]:interrupted});
    assert.equal(await started, false);
    report({[variables[role]]:restored, [variables.power_entity]:'on', [config.entity]:'ready'});
    assert.deepEqual(calls.map(call => call.service), ['turn_on']);
  }
});

test('an unrelated power switch cannot wake a dishwasher', () => {
  const {owner, variables, config, program} = wakeFixture();
  const power = owner._hass.entities[variables.power_entity];
  for (const remap of [{device_id:'another-appliance'}, {translation_key:'half_load'}, {platform:'template'}]) {
    const entities = {...owner._hass.entities, [variables.power_entity]:{...power, ...remap}};
    assert.equal(dishwasherControls(config, {...owner._hass, entities}, program).start.enabled, false);
  }
});

test('a delayed power-on report cannot start a cycle after a wake timeout', async t => {
  const {owner, variables, calls, report} = wakeFixture();
  const schedule = globalThis.setTimeout;
  let expire;
  t.mock.method(globalThis, 'setTimeout', (handler, duration, ...args) => {
    expire = handler;
    return schedule(handler, duration, ...args);
  });
  const started = startDishwasherProgram(owner);
  assert.equal(typeof expire, 'function');
  expire();
  assert.equal(await started, false);
  report({[variables.power_entity]:'on'});
  assert.deepEqual(calls.map(call => call.service), ['turn_on']);
});

test('waking the already selected program preserves its configured delay', async () => {
  const {owner, variables, calls, report} = wakeFixture();
  owner._dishwasherRequest.draft = owner._hass.states[variables.selected_program_entity].state;
  report({[variables.start_delay_entity]:'3600'});
  const started = startDishwasherProgram(owner);
  report({[variables.power_entity]:'on'});
  assert.equal(await started, true);
  assert.equal(calls[1].data.b_s_h_common_option_start_in_relative, 3600);
});
