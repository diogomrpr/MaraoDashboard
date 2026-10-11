import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
globalThis.HTMLElement=class {attachShadow(){this.shadowRoot={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};}};
globalThis.customElements={get:()=>true};
globalThis.window={MaraoDashboard:{haptic(){}},location:{pathname:'/marao-dashboard/card-test',search:''}};
const source=await fs.readFile(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url), 'utf8');
const uri='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const {energyUnits,energyValue,energyFormatting,energyHistoryValue,energyLabel,formatEnergyNumber,MaraoCard}=await import(uri);
const dashboard=await fs.readFile(new URL('../../custom_components/marao_dashboard/frontend/MaraoDashboard.js', import.meta.url), 'utf8');
const classes=dashboard.slice(dashboard.indexOf('function escapeHtml('),dashboard.indexOf('if (!customElements.get("marao-energy-period-card"))'));
const {MaraoEnergyPeriodCard}=await import('data:text/javascript;base64,'+Buffer.from(`import {energyFormatting,energyValue,energyHistoryValue,energyLabel,formatEnergyNumber,binaryState,cardProblem,problemStyle,focusRestorer} from "${uri}";const localize=key=>key;${classes};export {MaraoEnergyPeriodCard};`).toString('base64'));
const sample=(value,unit)=>({state:String(value),attributes:{unit_of_measurement:unit,friendly_name:'Reading'},last_changed:new Date(Date.now()-1000).toISOString()});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function hass(states,callApi=async()=>[]){return {states,connected:true,locale:{number_format:'none',language:'en'},callApi};}

test('compatible units, finite guards, signed values and fixed localized precision',()=>{
  for(const [raw,source,target,value] of [[1000,'W','kW',1],[1,'kW','W',1000],[1000,'Wh','kWh',1],[3600,'J','Wh',1],[1,'Wh','J',3600],[1,'mW','MW',1e-9],[-1000,'Wh','kWh',-1],[0,'W','kW',0]])assert.equal(energyValue(raw,source,{display_unit:target}).value,value);
  for(const raw of ['',' ',false,true,null,undefined,NaN,Infinity,'unknown','unavailable'])assert.equal(energyValue(raw,'W',{}),null);
  for(const target of ['kw','Wh',null,{},['kW'],'toString'])assert.equal(energyValue(1,'W',{display_unit:target}).error,'unit');
  for(const precision of [false,true,null,'0',1.5,-1,7])assert.equal(energyValue(1,'W',{display_precision:precision}).error,'precision');
  for(const digits of [0,2,6])assert.equal(formatEnergyNumber(1,digits,{locale:{number_format:'none'}}),'1'+(digits?'.'+'0'.repeat(digits):''));
  assert.equal(formatEnergyNumber(-0.0001,2,{locale:{number_format:'none'}}),'0.00');
  assert.equal(formatEnergyNumber(1234.5,2,{locale:{number_format:'decimal_comma'}}),'1.234,50');
  assert.equal(formatEnergyNumber(1234.5,2,{locale:{number_format:'space_comma'}}),'1 234,50');
  assert.equal(energyLabel(energyValue('1.234','EUR',{display_precision:2}),{display_precision:2},{locale:{number_format:'none'}}),'1.23 EUR');
  assert.equal(energyFormatting({display_precision:0}),true);assert.equal(energyFormatting({power_unit:'kW'}),false);
});

test('only configured primary readings and switch secondary power change',()=>{
  const states={'sensor.energy':sample('1234.5','Wh'),'switch.load':sample('on'),'sensor.power':sample('1500','W'),'climate.room':{state:'heat',attributes:{current_temperature:21,temperature:22}}};
  for(const kind of ['hc_graph_card','hc_toggle_graph_card','hc_sensor_card','hc_base_card']){
    const card=new MaraoCard();card.setConfig({template:kind,entity:'sensor.energy',variables:{display_unit:'kWh',display_precision:2}});card.hass=hass(states);
    assert.match(card.shadowRoot.innerHTML,/1.23 kWh/);
  }
  const legacy=new MaraoCard();legacy.setConfig({template:'hc_switch_card',entity:'switch.load',variables:{power_entity:'sensor.power',power_unit:'MW'}});legacy.hass=hass(states);assert.match(legacy.shadowRoot.innerHTML,/1500 MW/);
  const formatted=new MaraoCard();formatted.setConfig({...legacy._config,variables:{...legacy._config.variables,display_unit:'kW',display_precision:0}});formatted.hass=hass(states);assert.match(formatted.shadowRoot.innerHTML,/2 kW/);assert.doesNotMatch(formatted.shadowRoot.innerHTML,/1500 MW/);
  assert.equal(states['sensor.power'].state,'1500');assert.equal(states['switch.load'].state,'on');
  const defaultCard=new MaraoCard();defaultCard.setConfig({template:'hc_base_card',entity:'sensor.energy'});defaultCard.hass=hass(states);assert.match(defaultCard.shadowRoot.innerHTML,/1234.5 Wh/);
  const iconOnly=new MaraoCard();iconOnly.setConfig({template:'hc_base_card',entity:'sensor.energy',show_name:false,show_state:false,show_label:false,variables:{display_unit:'kWh',display_precision:2}});iconOnly.hass=hass(states);assert.match(iconOnly.shadowRoot.innerHTML,/class="body icon-only/);assert.doesNotMatch(iconOnly.shadowRoot.innerHTML,/<div class="formatted-values">/);
  const climate=new MaraoCard();climate.setConfig({template:'hc_climate_card',entity:'climate.room',variables:{display_unit:'kW',display_precision:6}});climate.hass=hass(states);assert.doesNotMatch(climate.shadowRoot.innerHTML,/kW|21.000000|22.000000/);
});

test('mixed raw unit history converts before geometry and formatting changes reuse cache',async()=>{
  const raw=[sample('1000.001','Wh'),sample('3600007.2','J')];const original=JSON.stringify(raw);let calls=0,query;
  const card=new MaraoCard();const config={template:'hc_graph_card',entity:'sensor.energy',variables:{display_unit:'kWh',display_precision:0}};
  card.setConfig(config);card.hass=hass({'sensor.energy':sample('1000.003','Wh')},async(_method,url)=>{calls++;query=url;return [raw];});await tick();
  assert.equal(calls,1);assert.doesNotMatch(query,/minimal_response|no_attributes/);
  const before=card._graphValues('sensor.energy',config.variables);assert.equal(before.error,false);assert.ok(Math.abs(before.values[1].value-1.000002)<1e-12);assert.notEqual(before.values[0].value,before.values[1].value);
  const trace=card._graphMarkup('sensor.energy',config.variables).match(/<polyline[^>]+/)[0];assert.match(trace,/6.00|94.00/);
  card.setConfig({...config,variables:{...config.variables,display_precision:6}});await tick();assert.equal(calls,1);assert.equal(JSON.stringify(raw),original);
  assert.match(card.shadowRoot.innerHTML,/1.000003 kWh/);
  card._graphHistory.set('sensor.energy',[sample('1000')]);card._render();assert.match(card.shadowRoot.innerHTML,/Reading format is incompatible/);assert.doesNotMatch(card.shadowRoot.innerHTML,/<polyline/);
});

test('period summaries and sheets share formatting without resetting selected history',async()=>{
  const states={'sensor.energy':sample('1234.5','Wh')};let calls=0,url;
  const config={entity:'sensor.energy',popup:true,display_unit:'kWh',display_precision:2};
  const period=new MaraoEnergyPeriodCard();period.setConfig(config);period.hass=hass(states,async(_method,query)=>{calls++;url=query;return [[sample('1000.001','Wh'),sample('3600007.2','J')]];});await tick();
  assert.doesNotMatch(url,/minimal_response|no_attributes/);assert.equal(calls,1);assert.match(period.shadowRoot.innerHTML,/1.00 kWh/);
  period._offset=-1;await period._load();const count=calls;const key=period._loadedKey;const raw=period._history;
  period.setConfig({...config,display_precision:6});await tick();assert.equal(period._offset,-1);assert.equal(period._loadedKey,key);assert.equal(period._history,raw);assert.equal(calls,count);
  assert.match(period.shadowRoot.innerHTML,/1.000001 kWh|1.000002 kWh/);
  period._history=[sample('4')];period._render();assert.match(period.shadowRoot.innerHTML,/energy.format_error/);assert.doesNotMatch(period.shadowRoot.innerHTML,/<polyline/);
  const summary=new MaraoEnergyPeriodCard();summary.setConfig({...config,popup:false});summary.hass=hass(states);assert.match(summary.shadowRoot.innerHTML,/1.23 kWh/);
  const legacy=new MaraoEnergyPeriodCard();legacy.setConfig({entity:'sensor.energy'});legacy.hass=hass(states);assert.match(legacy.shadowRoot.innerHTML,/>1234.5</);
});

test('formatting reuses initial raw history and identity or availability changes discard stale work', async () => {
  let finish, calls = 0, query;
  const card = new MaraoCard();
  const config = { template: 'hc_graph_card', entity: 'sensor.energy' };
  const states = { 'sensor.energy': sample('1234.5', 'Wh'), 'sensor.other': sample('2', 'kWh') };
  card.setConfig(config);
  card.hass = hass(states, async (_method, url) => { calls++; query = url; return new Promise(resolve => { finish = resolve; }); });
  assert.doesNotMatch(query, /minimal_response|no_attributes/);
  card.setConfig({ ...config, variables: { display_unit: 'kWh', display_precision: 2 } });
  assert.equal(calls, 1);
  finish([[sample('1000', 'Wh')]]);
  await tick();
  assert.equal(card._graphHistory.get('sensor.energy')[0].state, '1000');
  assert.match(card.shadowRoot.innerHTML, /1.23 kWh/);
  card.setConfig({ ...config, entity: 'sensor.other', variables: { display_unit: 'Wh', display_precision: 0 } });
  assert.equal(card._graphHistory.has('sensor.energy'), false);
  const stale = finish;
  card.hass = hass({ ...states, 'sensor.other': sample('unavailable', 'kWh') });
  stale([[sample('2', 'kWh')]]);
  await tick();
  assert.equal(card._graphHistory.has('sensor.other'), false);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<polyline/);
  const plain = new MaraoCard();
  plain.setConfig({ template: 'hc_graph_card', entity: 'sensor.temperature' });
  plain.hass = hass({ 'sensor.temperature': sample('21', '°C') }, async (_method, url) => { query = url; return []; });
  assert.match(query, /no_attributes/);
  assert.match(query, /minimal_response/);
});

test('unit table factors and dimensions agree across every supported pair', () => {
  const expected = { mW: ['power', .001], W: ['power', 1], kW: ['power', 1000], MW: ['power', 1e6], GW: ['power', 1e9], Wh: ['energy', 1], kWh: ['energy', 1000], MWh: ['energy', 1e6], GWh: ['energy', 1e9], J: ['energy', 1 / 3600], Ws: ['energy', 1 / 3600], kJ: ['energy', 1000 / 3600], MJ: ['energy', 1e6 / 3600], GJ: ['energy', 1e9 / 3600] };
  assert.deepEqual(energyUnits, expected);
  for (const [source, [dimension, factor]] of Object.entries(expected)) for (const [target, [otherDimension, otherFactor]] of Object.entries(expected)) {
    const result = energyValue(-2, source, { display_unit: target });
    if (dimension !== otherDimension) assert.equal(result.error, 'unit');
    else assert.equal(result.value, -2 * factor / otherFactor);
  }
  assert.equal(energyHistoryValue(sample('3', 'USD'), 'EUR', { display_precision: 2 }).error, 'unit');
});

test('independent formatting does not convert authoritative state or action payloads', async () => {
  const states = { 'switch.load': sample('on'), 'sensor.power': sample('1500', 'W') };
  const original = JSON.stringify(states);
  const calls = [];
  const connection = { ...hass(states), callService: async (...args) => { calls.push(args); } };
  const card = new MaraoCard();
  card.setConfig({ template: 'hc_switch_card', entity: 'switch.load', variables: { power_entity: 'sensor.power', display_unit: 'kW', display_precision: 2 } });
  card.hass = connection;
  const duplicate = new MaraoCard();
  duplicate.setConfig({ ...card._config, variables: { ...card._config.variables, display_unit: 'W', display_precision: 6 } });
  duplicate.hass = connection;
  assert.match(card.shadowRoot.innerHTML, /1.50 kW/);
  assert.match(duplicate.shadowRoot.innerHTML, /1500.000000 W/);
  await card._performAction({ action: 'toggle' }, 'switch.load');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 3), ['switch', 'toggle', { entity_id: 'switch.load' }]);
  assert.equal(JSON.stringify(states), original);
});
