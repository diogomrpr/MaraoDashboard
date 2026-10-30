import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
globalThis.HTMLElement=class {attachShadow(){this.shadowRoot={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};}};
globalThis.customElements={get:()=>true};
globalThis.window={MaraoDashboard:{haptic(){}},location:{pathname:'/marao-dashboard/card-test',search:''}};
const source=(await fs.readFile(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url), 'utf8')).replaceAll('import.meta.url', JSON.stringify(new URL('../../custom_components/marao_dashboard/frontend/MaraoCards.js', import.meta.url).href));
const uri='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const {energyUnits,energyValue,energyFormatting,energyHistoryValue,energyLabel,formatEnergyNumber,MaraoCard}=await import(uri);
globalThis.navigationTranslations = (await import('../../custom_components/marao_dashboard/frontend/MaraoNavigation.js')).navigationTranslations;
const dashboard=await fs.readFile(new URL('../../custom_components/marao_dashboard/frontend/MaraoRuntime.js', import.meta.url), 'utf8');
const classes=dashboard.slice(dashboard.indexOf('function escapeHtml('),dashboard.indexOf('if (!customElements.get("marao-energy-period-card"))'));
const {MaraoEnergyPeriodCard,energyTariff}=await import('data:text/javascript;base64,'+Buffer.from(`import {nativeEditing,bindNativeEditing,energyBuckets,statisticsBuckets,energyTotal,historyPeriodRange,historySamples,loadHistoryChart,energyFormatting,energyValue,energyHistoryValue,energyLabel,formatEnergyNumber,binaryState,cardProblem,problemStyle,problemLabel,showCardDetails,createHistoryPlaceholder,layoutState,focusRestorer,controlGridStyles,updateCardSurface} from "${uri}";const localize=key=>key;${classes};export {MaraoEnergyPeriodCard,energyTariff};`).toString('base64'));
const sample=(value,unit,time=Date.now()-1000)=>({entity_id:'sensor.energy',state:String(value),attributes:{unit_of_measurement:unit,friendly_name:'Reading'},last_changed:new Date(time).toISOString()});
const tick=()=>new Promise(resolve=>setTimeout(resolve, 10));
const waitFor=async condition=>{
  const deadline=Date.now()+3000;
  while(!condition()){
    assert.ok(Date.now()<deadline,'Expected asynchronous energy state did not settle');
    await new Promise(resolve=>setTimeout(resolve,0));
  }
};
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

test('available readings cannot inherit a removed unit from layout metadata',()=>{
  const card=new MaraoCard();card.setConfig({template:'md_sensor_card',entity:'sensor.energy',variables:{display_unit:'kWh',display_precision:2}});
  card.hass=hass({'sensor.energy':sample('42','Wh')});
  assert.match(card.shadowRoot.innerHTML,/0.04 kWh/);
  card.hass=hass({'sensor.energy':{state:'unavailable',attributes:{}}});
  assert.equal(card._layoutMetadata.unit_of_measurement,'Wh');
  card.hass=hass({'sensor.energy':{state:'42',attributes:{}}});
  assert.equal(card._layoutMetadata.unit_of_measurement,undefined);
  assert.match(card.shadowRoot.innerHTML,/data-problem="error"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML,/0.04 kWh/);
});

test('only configured primary readings and switch secondary power change',()=>{
  const states={'sensor.energy':sample('1234.5','Wh'),'switch.load':sample('on'),'sensor.power':sample('1500','W'),'climate.room':{state:'heat',attributes:{current_temperature:21,temperature:22}}};
  for(const kind of ['md_graph_card','md_toggle_graph_card','md_sensor_card','md_base_card']){
    const card=new MaraoCard();card.setConfig({template:kind,entity:'sensor.energy',variables:{display_unit:'kWh',display_precision:2}});card.hass=hass(states);
    assert.match(card.shadowRoot.innerHTML,/1.23 kWh/);
  }
  const legacy=new MaraoCard();legacy.setConfig({template:'md_switch_card',entity:'switch.load',variables:{power_entity:'sensor.power',power_unit:'MW'}});legacy.hass=hass(states);assert.match(legacy.shadowRoot.innerHTML,/1500 MW/);
  const formatted=new MaraoCard();formatted.setConfig({...legacy._config,variables:{...legacy._config.variables,display_unit:'kW',display_precision:0}});formatted.hass=hass(states);assert.match(formatted.shadowRoot.innerHTML,/2 kW/);assert.doesNotMatch(formatted.shadowRoot.innerHTML,/1500 MW/);
  assert.equal(states['sensor.power'].state,'1500');assert.equal(states['switch.load'].state,'on');
  const defaultCard=new MaraoCard();defaultCard.setConfig({template:'md_base_card',entity:'sensor.energy'});defaultCard.hass=hass(states);assert.match(defaultCard.shadowRoot.innerHTML,/1234.5 Wh/);
  const iconOnly=new MaraoCard();iconOnly.setConfig({template:'md_base_card',entity:'sensor.energy',show_name:false,show_state:false,show_label:false,variables:{display_unit:'kWh',display_precision:2}});iconOnly.hass=hass(states);assert.match(iconOnly.shadowRoot.innerHTML,/class="body icon-only/);assert.doesNotMatch(iconOnly.shadowRoot.innerHTML,/<div class="formatted-values">/);
  const climate=new MaraoCard();climate.setConfig({template:'md_climate_card',entity:'climate.room',variables:{display_unit:'kW',display_precision:6}});climate.hass=hass(states);assert.doesNotMatch(climate.shadowRoot.innerHTML,/kW|21.000000|22.000000/);
});

test('mixed raw unit history converts before geometry and formatting changes reuse cache',async()=>{
  const end=Date.now()-10000,raw=[sample('1000.001','Wh',end-2000),sample('3600007.2','J',end-1000)];const original=JSON.stringify(raw);let calls=0,query;
  const card=new MaraoCard();const config={template:'md_graph_card',entity:'sensor.energy',variables:{display_unit:'kWh',display_precision:0}};
  card.setConfig(config);card.hass=hass({'sensor.energy':sample('1000.003','Wh',end)},async(_method,url)=>{calls++;query=url;return [raw];});await tick();
  assert.equal(calls,1);assert.doesNotMatch(query,/minimal_response|no_attributes/);
  const before=card._graphValues('sensor.energy',config.variables);assert.equal(before.error,false);assert.ok(Math.abs(before.values[1].value-1.000002)<1e-12);assert.notEqual(before.values[0].value,before.values[1].value);
  const trace=card._graphMarkup('sensor.energy',config.variables).match(/<polyline[^>]+/)[0];assert.match(trace,/6.00|94.00/);
  card.setConfig({...config,variables:{...config.variables,display_precision:6}});await tick();assert.equal(calls,1);assert.equal(JSON.stringify(raw),original);
  assert.match(card.shadowRoot.innerHTML,/1.000003 kWh/);
  card._graphHistory.set('sensor.energy',[sample('1000')]);card._render();assert.match(card.shadowRoot.innerHTML,/Reading format is incompatible/);assert.doesNotMatch(card.shadowRoot.innerHTML,/<polyline/);
});

test('Auto graph history normalizes W/kW before detail and precision changes without changing primary defaults',async()=>{
  const end=Date.now()-10000,records=[sample('1000','W',end-2000),sample('2','kW',end-1000)],original=JSON.stringify(records);
  let calls=0;const card=new MaraoCard(),config={template:'md_graph_card',entity:'sensor.power'};
  card.setConfig(config);card.hass=hass({'sensor.power':sample('1500','W',end)},async()=>{calls++;return[records];});await tick();
  const before=card._historyOptions();assert.deepEqual(before.samples.map(sample=>sample.value),[1000,2000,1500]);assert.equal(before.format(2000),'2000 W');
  assert.match(card.shadowRoot.innerHTML,/1500 W/);assert.deepEqual(card._config,config);
  card.setConfig({...config,variables:{display_precision:2}});await tick();const after=card._historyOptions();
  assert.deepEqual(after.samples,before.samples);assert.equal(after.format(2000),'2000.00 W');assert.equal(calls,1);assert.equal(JSON.stringify(records),original);
  card.hass=hass({'sensor.power':sample('1.5','kW',end)},async()=>{calls++;return[records];});
  assert.deepEqual(card._historyOptions().samples.map(sample=>sample.value),[1,2,1.5]);assert.equal(card._historyOptions().format(2),'2.00 kW');assert.equal(calls,1,'Source unit changes must derive again from raw records');
});

test('shared fan and climate graph sources retain energy metadata while climate display overrides remain ignored',async()=>{
  const end=Date.now()-10000,records=[sample('1000','W',end-2000),sample('2','kW',end-1000)];
  for(const template of ['md_fan_card','md_climate_card']){
    const card=new MaraoCard();let query;
    card.setConfig({template,entity:template==='md_fan_card'?'fan.test':'climate.room',variables:{show_graph:true,graph_entity:'sensor.power',...(template==='md_climate_card'?{display_unit:'kW',display_precision:0}:{})}});
    card.hass=hass({'fan.test':sample('on'),'climate.room':{state:'heat',attributes:{current_temperature:21,temperature:22}},'sensor.power':sample('1500','W',end)},async(_method,url)=>{query=url;return[records];});await tick();
    assert.doesNotMatch(query,/no_attributes|minimal_response/);assert.deepEqual(card._historyOptions().samples.map(sample=>sample.value),[1000,2000,1500]);
    assert.equal(card._historyOptions().format(1000.125),template==='md_climate_card'?'1000.125':'1000.125 W');
  }
});

test('Auto incompatible history is a null gap with its readable format error, preserving compatible records',async()=>{
  const end=Date.now()-10000,records=[sample('1000','W',end-2000),sample('2','Wh',end-1000)],card=new MaraoCard();
  card.setConfig({template:'md_graph_card',entity:'sensor.power'});card.hass=hass({'sensor.power':sample('1500','W',end)},async()=>[records]);await tick();
  const data=card._graphValues('sensor.power');assert.equal(data.error,true);assert.deepEqual(data.values.map(sample=>sample.value),[1000,null,1500]);
  assert.match(card.shadowRoot.innerHTML,/Reading format is incompatible with its source unit/);assert.match(card._historyOptions().error,/Reading format is incompatible with its source unit/);
  assert.doesNotMatch(card.shadowRoot.innerHTML,/<polyline/);
});

test('Auto period history uses current Wh meaning before summaries and preserves values through precision-only updates',async()=>{
  const end=Date.now()-10000,records=[sample('1000.001','Wh',end-2000),sample('unavailable',undefined,end-1500),sample('3600007.2','J',end-1000)],original=JSON.stringify(records);
  let calls=0;const card=new MaraoEnergyPeriodCard(),config={entity:'sensor.energy',popup:true};
  card.setConfig(config);card.hass=hass({'sensor.energy':sample('1234.5','Wh',end)},async()=>{calls++;return[records];});await waitFor(()=>!card._loading&&!card._prefetching);
  const before=card._detailOptions;assert.equal(card._values().error,false);assert.ok(Math.abs(card._values().values[0].value-1000.001)<1e-10);assert.equal(card._values().values[1].value,null);assert.ok(Math.abs(card._values().values[2].value-1000.002)<1e-10);assert.ok(before.samples.every(sample=>sample.value===null));assert.equal(before.coverageLimited,true);assert.equal(before.format(1000.002),'1000.002 Wh');
  card.setConfig({...config,display_precision:6});await tick();assert.deepEqual(card._detailOptions.samples,before.samples);assert.equal(card._detailOptions.format(1000.002),'1000.002000 Wh');
  assert.equal(calls,5, 'selected day and four earlier days; formatting changes reuse the cache');assert.equal(JSON.stringify(records),original);
  card._history=[sample('1000','Wh',end-2000),sample('2','W',end-1000)];card._render();
  assert.equal(card._values().error,true);assert.deepEqual(card._values().values.map(sample=>sample.value),[1000,null]);assert.equal(card._detailOptions.error,'energy.format_error');
});

test('nonnumeric history does not reject valid graph conversion or fabricate zero readings', async () => {
  const end=Date.now()-10000;
  const records = [sample('1000', 'W',end-7000), ...['unavailable', 'unknown', '', ' ', 'invalid'].map((value,index) => sample(value,undefined,end-6000+index*1000)), sample('2', 'kW',end-1000)];
  const original = JSON.stringify(records);
  const variables = { display_unit: 'kW', display_precision: 2, show_graph: true, graph_entity: 'sensor.power', power_entity: 'sensor.power' };
  for (const template of ['md_graph_card', 'md_toggle_graph_card', 'md_switch_card', 'md_sensor_card', 'md_base_card']) {
    const card = new MaraoCard();
    card.setConfig({ template, entity: template === 'md_switch_card' ? 'switch.load' : 'sensor.power', variables });
    card.hass = hass({ 'sensor.power': sample('1500', 'W',end), 'switch.load': sample('on') }, async () => [records]);
    await tick();
    const data = card._graphValues('sensor.power', variables);
    assert.equal(data.error, false, template);
    assert.deepEqual(data.values.map(record => record.value), [1, null, null, null, null, null, 2, 1.5], template);
    assert.deepEqual(data.values.filter(record=>Number.isFinite(record.value)).map(record=>record.value),[1,2,1.5],template);
    assert.deepEqual(data.values.filter(record=>record.value===null).map(record=>record.time),records.slice(1,-1).map(record=>Date.parse(record.last_changed)),template);
    assert.match(card.shadowRoot.innerHTML, /1.50 kW/);
    assert.match(card.shadowRoot.innerHTML, /<polyline/);
    assert.doesNotMatch(card.shadowRoot.innerHTML, /Reading format is incompatible/);
  }
  assert.equal(JSON.stringify(records), original);
});

test('nonnumeric period history leaves numeric conversion and bounds usable', async () => {
  const end=Date.now()-10000;
  const records = [sample('1000', 'Wh',end-4000), sample('unavailable',undefined,end-3000), sample('unknown',undefined,end-2000), sample('',undefined,end-1000), sample('2', 'kWh',end)];
  const period = new MaraoEnergyPeriodCard();
  period.setConfig({ entity: 'sensor.energy', popup: true, display_unit: 'kWh', display_precision: 2 });
  period.hass = hass({ 'sensor.energy': sample('1500', 'Wh') }, async () => [records]);
  await tick();
  assert.equal(period._values().error, false);
  assert.deepEqual(period._values().values.map(record => record.value), [1, null, null, null, 2]);
  assert.ok(period._detailOptions.samples.every(record=>record.value===null),'A missing baseline and gaps cannot become consumption');
  assert.equal(period._detailOptions.coverageLimited,true);
  assert.equal(period._detailOptions.format(2),'2.00 kWh');
  assert.equal(period._detailOptions.windows,false);
  assert.doesNotMatch(period.shadowRoot.innerHTML, /<svg|<polyline/);
  assert.doesNotMatch(period.shadowRoot.innerHTML, /energy.format_error/);
  assert.equal(period._history, records);
});

test('period summaries and consumption bars share formatting without resetting selected history',async()=>{
  const states={'sensor.energy':sample('1234.5','Wh')};let calls=0,url;
  const config={entity:'sensor.energy',popup:true,display_unit:'kWh',display_precision:2};
  const start=Date.parse('2026-10-18T00:00:00Z'),hour=3600000;
  const records=[sample('0','Wh',start),sample('1000.001','Wh',start+hour),sample('3600007.2','J',start+2*hour)];
  const period=new MaraoEnergyPeriodCard();period.setConfig(config);period._range=()=>({start:new Date(start),end:new Date(start+2*hour)});
  period.hass=hass(states,async(_method,query)=>{calls++;url=query;return [records];});await tick();
  assert.doesNotMatch(url,/minimal_response|no_attributes/);assert.equal(calls,1);
  assert.deepEqual(period._detailOptions.samples.map(record=>period._detailOptions.format(record.value)),['1.00 kWh','0.00 kWh']);
  assert.ok(Math.abs(period._detailOptions.samples[0].value-1.000001)<1e-12);
  assert.ok(Math.abs(period._detailOptions.samples[1].value-.000001)<1e-12);
  period._offset=-1;await period._load();const count=calls;const key=period._loadedKey;const raw=period._history;
  period.setConfig({...config,display_precision:6});await tick();assert.equal(period._offset,-1);assert.equal(period._loadedKey,key);assert.equal(period._history,raw);assert.equal(calls,count);
  assert.deepEqual(period._detailOptions.samples.map(record=>period._detailOptions.format(record.value)),['1.000001 kWh','0.000001 kWh']);
  period._history=[sample('4')];period._render();assert.match(period.shadowRoot.innerHTML,/energy.format_error/);assert.doesNotMatch(period.shadowRoot.innerHTML,/<polyline/);
  const summary=new MaraoEnergyPeriodCard();summary.setConfig({...config,popup:false});summary._range=period._range;summary.hass=hass(states,async()=>[records]);await tick();assert.match(summary.shadowRoot.innerHTML,/1.00 kWh/);
  const legacy=new MaraoEnergyPeriodCard();legacy.setConfig({entity:'sensor.energy'});legacy.hass=hass(states);await tick();assert.doesNotMatch(legacy.shadowRoot.innerHTML,/>1234.5</);assert.match(legacy.shadowRoot.innerHTML,/energy.no_data/);
});

test('formatting reuses initial raw history and identity or availability changes discard stale work', async () => {
  let finish, calls = 0, query;
  const card = new MaraoCard();
  const config = { template: 'md_graph_card', entity: 'sensor.energy' };
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
  plain.setConfig({ template: 'md_graph_card', entity: 'sensor.temperature' });
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
  card.setConfig({ template: 'md_switch_card', entity: 'switch.load', variables: { power_entity: 'sensor.power', display_unit: 'kW', display_precision: 2 } });
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


test('tariffs use explicit zero, matched HA import, legacy preferences and compatible price units without guessing',()=>{
  const connection={config:{currency:'EUR'},states:{'sensor.price':sample('.00025','EUR/Wh')}};
  const prefs={energy_sources:[{type:'grid',stat_energy_from:'sensor.main',number_energy_price:.3},{type:'grid',stat_energy_from:'sensor.other',number_energy_price:.4}]};
  assert.equal(energyTariff({entity:'sensor.main'},connection,prefs).value,.3);
  assert.equal(energyTariff({entity:'sensor.unmatched'},connection,prefs).reason,'energy.price_ambiguous');
  assert.equal(energyTariff({cost_per_kwh:0},connection,prefs).value,0);
  assert.equal(energyTariff({},connection,{energy_sources:[{type:'grid',flow_from:[{stat_energy_from:'sensor.main',entity_energy_price:'sensor.price'}]}]}).value,.25);
  connection.states['sensor.price']=sample('.2','USD/kWh');
  assert.equal(energyTariff({},connection,{energy_sources:[{type:'grid',stat_energy_from:'sensor.main',entity_energy_price:'sensor.price'}]}).reason,'energy.price_unavailable');
  assert.equal(energyTariff({},connection,{energy_sources:[]}).reason,'energy.price_missing');
});

test('statistics bars and item costs use interval changes, common units and actual costs before estimates',async()=>{
  const card=new MaraoEnergyPeriodCard(),start=Date.parse('2026-10-18T00:00:00Z'),hour=3600000,calls=[];
  card.setConfig({entity:'sensor.main',popup:true,calculate_cost:true,display_precision:2,sub_entities:[{entity_id:'sensor.kitchen',name:'Kitchen',cost_entity:'sensor.kitchen_cost'},{entity_id:'sensor.heat',name:'Heating'}]});
  card._range=()=>({start:new Date(start),end:new Date(start+2*hour)});
  const states={'sensor.main':sample(8000,'Wh'),'sensor.kitchen':sample(3,'kWh'),'sensor.kitchen_cost':sample(2,'EUR'),'sensor.heat':sample(5000,'Wh')};
  card.hass={...hass(states,async()=>{throw Error('Statistics should be used');}),config:{currency:'EUR'},callWS:async request=>{
    calls.push(request);
    if(request.type==='energy/get_prefs')return {energy_sources:[{type:'grid',stat_energy_from:'sensor.main',number_energy_price:.25}]};
    if(request.type==='recorder/get_statistics_metadata')return Object.entries(states).map(([statistic_id,state])=>({statistic_id,has_sum:true,statistics_unit_of_measurement:state.attributes.unit_of_measurement}));
    return Object.fromEntries(Object.entries({'sensor.main':[4,4],'sensor.kitchen':[1,2],'sensor.kitchen_cost':[.8,1.2],'sensor.heat':[3,2]}).map(([id,values])=>[id,values.map((change,index)=>({start:start+index*hour,end:start+(index+1)*hour,change}))]));
  }};await tick();
  assert.equal(calls.filter(call=>call.type==='recorder/statistics_during_period').length,1);
  assert.deepEqual(calls.find(call=>call.type==='recorder/statistics_during_period').units,{energy:'kWh'});
  assert.deepEqual(card._detailOptions.samples.map(sample=>sample.value),[1,1]);
  assert.equal(card._detailOptions.summaryLabel,'≈ 2.00 EUR');
  assert.deepEqual(card._detailOptions.breakdown.items.map(item=>[item.name,item.energyLabel,item.costLabel,item.value]),[['Kitchen','3.00 kWh','2.00 EUR',2],['Heating','5.00 kWh','≈ 1.25 EUR',1.25]]);
  assert.match(card._detailOptions.breakdown.note,/0.25 EUR\/kWh/);
  assert.equal(card._detailOptions.interval,'hour');
  for(let i=0;i<3;i++)card.hass={...card._hass};assert.equal(calls.length,3,'Unrelated updates must not refetch');
  card._series['sensor.kitchen_cost']={error:true};card._config.calculate_cost=false;card._render();
  assert.equal(card._detailOptions.breakdown.items[0].value,3,'A cost failure cannot erase known energy');
  assert.equal(card._detailOptions.breakdown.items[0].problem,'timeline.history_unavailable');
});

test('monthly contributor focus uses the selected day for energy and actual or estimated costs without refetching',()=>{
  const card=new MaraoEnergyPeriodCard(),start=Date.parse('2026-10-01T00:00:00Z'),day=86400000;
  card.setConfig({entity:'sensor.main',period:'month',popup:true,cost_per_kwh:.25,display_precision:2,
    sub_entities:[{entity_id:'sensor.kitchen',cost_entity:'sensor.kitchen_cost'},{entity_id:'sensor.heat'}]});
  card._range=()=>({start:new Date(start),end:new Date(start+3*day)});
  card._hass={...hass({'sensor.main':sample(8,'kWh'),'sensor.kitchen':sample(3,'kWh'),'sensor.kitchen_cost':sample(2,'EUR'),'sensor.heat':sample(5,'kWh')},()=>{throw Error('No refetch expected');}),config:{currency:'EUR'},callWS:()=>{throw Error('No refetch expected');}};
  card._series=Object.fromEntries(Object.entries({'sensor.main':[4,4,0],'sensor.kitchen':[1,2,null],'sensor.kitchen_cost':[.8,1.2,null],'sensor.heat':[3,2,0]})
    .map(([id,values])=>[id,{unit:id==='sensor.kitchen_cost'?'EUR':'kWh',statistics:values.map((change,index)=>({start:start+index*day,end:start+(index+1)*day,change}))}]));
  card._render();
  const rows=detail=>detail.items.map(item=>[item.energyLabel,item.costLabel,item.value]);
  const overview=rows(card._detailOptions.breakdown);
  assert.deepEqual(overview,[['≈ 3.00 kWh','≈ 2.00 EUR',3],['5.00 kWh','≈ 1.25 EUR',5]]);
  assert.deepEqual(rows(card._detailOptions.breakdownForSample(card._detailOptions.samples[0])),[['1.00 kWh','0.80 EUR',1],['3.00 kWh','≈ 0.75 EUR',3]]);
  assert.deepEqual(rows(card._detailOptions.breakdownForSample(card._detailOptions.samples[1])),[['2.00 kWh','1.20 EUR',2],['2.00 kWh','≈ 0.50 EUR',2]]);
  assert.deepEqual(rows(card._detailOptions.breakdownForSample(card._detailOptions.samples[2])),[['—','—',null],['0.00 kWh','≈ 0.00 EUR',0]]);
  assert.deepEqual(rows(card._detailOptions.breakdownForSample(undefined)),overview);
  card._config.calculate_cost=true;card._render();
  assert.deepEqual(rows(card._detailOptions.breakdownForSample(card._detailOptions.samples[0])),[['1.00 kWh','0.80 EUR',.8],['3.00 kWh','≈ 0.75 EUR',.75]]);
});

test('one lifetime meter supplies day/month totals and estimated cost without contributor or chart reads',async()=>{
  const start=Date.parse('2026-10-01'),day=86400000;
  for (const [period,total] of [['day',10],['month',250]]) {
    for (const calculate_cost of [false,true]) {
      const card=new MaraoEnergyPeriodCard(),calls=[];
      card.setConfig({entity:'sensor.energy',period,calculate_cost,cost_per_kwh:.25,display_precision:2,sub_entities:[{entity_id:'sensor.other'}]});
      card._range=()=>({start:new Date(start),end:new Date(start+(period==='month'?day:3600000))});
      card.hass={...hass({'sensor.energy':sample(10250,'kWh')},()=>{throw Error('Use statistics');}),config:{currency:'EUR'},callWS:async request=>{
        calls.push(request);
        assert.deepEqual(request.statistic_ids,['sensor.energy']);
        return request.type==='recorder/get_statistics_metadata'
          ? [{statistic_id:'sensor.energy',has_sum:true,statistics_unit_of_measurement:'kWh'}]
          : {'sensor.energy':[{start,end:start+(period==='month'?day:3600000),change:total}]};
      }};
      await tick();
      assert.match(card.shadowRoot.innerHTML,new RegExp(calculate_cost?`≈ ${(total*.25).toFixed(2)} EUR`:`${total.toFixed(2)} kWh`));
      assert.equal(calls.length,2);
      for(let i=0;i<3;i++)card.hass={...card._hass};
      assert.equal(calls.length,2);
      assert.equal(card._detailOptions,undefined);
      card.hass={...card._hass,states:{'sensor.energy':sample('unavailable','kWh')}};
      assert.match(card.shadowRoot.innerHTML,/common.unavailable/);
    }
  }
});

test('energy fallback batches devices and maps recorder rows by entity rather than response order', async()=>{
  const card=new MaraoEnergyPeriodCard();card._render=()=>{};card._load=()=>{};
  card.setConfig({entity:'sensor.energy',popup:true,cost_per_kwh:0.25,sub_entities:[{entity_id:'sensor.fridge'},{entity_id:'sensor.empty'}]});
  const states=Object.fromEntries(['sensor.energy','sensor.fridge','sensor.empty'].map(id=>[id,sample('2','kWh')]));
  const house=[{...sample(1,'kWh'),entity_id:'sensor.energy'}],fridge=[{...sample(2,'kWh'),entity_id:'sensor.fridge'}];
  const calls=[];
  card._hass=hass(states,async(_method,url)=>{calls.push(new URL(url,'http://test/'));return [fridge,house];});
  const range={start:new Date('2026-10-01'),end:new Date('2026-11-01')};
  const result=await card._fetchPeriod(range);
  assert.equal(calls.length,1);
  assert.equal(calls[0].searchParams.get('filter_entity_id'),'sensor.energy,sensor.fridge,sensor.empty');
  assert.equal(result.series['sensor.energy'].records,house);
  assert.equal(result.series['sensor.fridge'].records,fridge);
  assert.deepEqual(result.series['sensor.empty'].records,[]);
  card._hass.callApi=async()=>{throw Error('offline');};
  const failed=await card._fetchPeriod(range);
  assert.equal(failed.failed,true);assert.ok(Object.values(failed.series).every(item=>item.error));
});

test('derived consumption reuses unchanged data and invalidates record or unit changes',()=>{
  const card=new MaraoEnergyPeriodCard();card._render=()=>{};card._load=()=>{};
  card.setConfig({entity:'sensor.energy',popup:true,period:'day'});
  card._hass=hass({'sensor.energy':{...sample(2,'kWh'),attributes:{unit_of_measurement:'kWh',state_class:'total_increasing'}}});
  const start=Date.parse('2026-10-01'),range={start:new Date(start),end:new Date(start+3600000)};
  card._history=[sample(0,'kWh',start),sample(2,'kWh',start+3600000)];
  const first=card._consumption('sensor.energy',{},range);
  assert.equal(card._consumption('sensor.energy',{},range),first);
  card._history=[sample(0,'kWh',start),sample(3,'kWh',start+3600000)];
  const changed=card._consumption('sensor.energy',{},range);assert.equal(changed.total,3);assert.notEqual(changed,first);
  assert.equal(card._consumption('sensor.energy',{display_unit:'Wh'},range).total,3000);
  card._clearPeriodCache();assert.notEqual(card._consumption('sensor.energy',{},range),changed);
});
