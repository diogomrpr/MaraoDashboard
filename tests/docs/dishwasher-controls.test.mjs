import assert from 'node:assert/strict';
import test from 'node:test';
import {dishwasherControls} from '../../custom_components/marao_dashboard/frontend/MaraoCards.js';
import {getExample} from '../../docs/examples/manifest.js';
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
  for (const [id, state] of [[v.door_entity, 'open'], [v.connection_entity, 'off'], [v.remote_start_entity, 'off'], [v.remote_control_entity, 'unavailable'], [v.power_entity, 'off'], [v.selected_program_entity, 'unknown'], [config.entity, 'run']]) {
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
