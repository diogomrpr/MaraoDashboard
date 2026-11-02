import test from 'node:test';
import assert from 'node:assert/strict';
import {cards,getExample} from '../../docs/examples/manifest.js';
import {settingsChoices,filterChoices,toggleChoice} from '../../docs/playground/settings-options.js';
import {editField,toYaml,fromYaml,validateDraft} from '../../docs/playground/editor-model.js';

const context=slug=>{
  const example=getExample(slug),scenario=example.scenarios[0];
  return {example,config:structuredClone(example.config),states:scenario.states,dashboard:scenario.dashboard};
};
const hints=(ctx,path)=>settingsChoices(ctx.example.fields.find(field=>field.path===path),ctx);

test('all exposed catalog choices, icons, entities and formatting fields have searchable choices',()=>{
  for(const example of cards){
    const ctx=context(example.slug);
    for(const field of example.fields){
      if(field.options?.length||['entity','icon','energy_unit','energy_precision','energy_period'].includes(field.kind)||field.selector==='entity')assert.ok(settingsChoices(field,ctx),`${example.slug}/${field.path}`);
    }
    if(example.fields.some(field=>field.path==='name'))assert.equal(hints(ctx,'name'),null);
  }
});

test('context filters entity domains and compatible units and advertises supported modes and sources',()=>{
  const light=context('light');
  assert.deepEqual(hints(light,'entity_id').options.map(option=>option.value),['light.living_room','light.kitchen','light.desk']);
  assert.equal(hints(light,'icon').icons,true);
  const power=context('graph');
  assert.deepEqual(hints(power,'variables.display_unit').options.map(option=>option.value),['mW','W','kW','MW','GW']);
  power.config.entity_id='sensor.energy';
  assert.ok(hints(power,'variables.display_unit').options.some(option=>option.value==='kWh'));
  assert.ok(!hints(power,'variables.display_unit').options.some(option=>option.value==='W'));
  assert.deepEqual(hints(context('camera'),'variables.event_provider').options.map(option=>option.value),['auto','frigate','unifi_protect','netatmo']);
  assert.deepEqual(hints(context('media-app'),'variables.app_source').options.map(option=>option.value),['Radio','Music','TV']);
  assert.equal(hints(context('room'),'page').custom,true);
  assert.ok(hints(context('room'),'page').options.some(option=>option.value==='living-room'));
  assert.deepEqual(hints(context('people'),'columns').options.map(option=>option.value),[1,2,3,4,5,6]);
});

test('numeric choices and Automatic export native numbers or remove overrides without losing unknown fields',()=>{
  const ctx=context('graph'),field=ctx.example.fields.find(field=>field.kind==='energy_precision');
  ctx.config.variables.opaque={keep:[]};
  const fixed=editField(ctx.config,field,0);validateDraft(fixed,ctx.example,ctx.states);
  assert.equal(fromYaml(toYaml(fixed)).variables.display_precision,0);
  const automatic=editField(fixed,field,'auto');
  assert.equal(Object.hasOwn(automatic.variables,'display_precision'),false);
  assert.deepEqual(automatic.variables.opaque,{keep:[]});
  const people=context('people'),columns=people.example.fields.find(field=>field.path==='columns');
  assert.equal(editField(people.config,columns,3).columns,3);
  assert.equal(Object.hasOwn(editField(people.config,columns,undefined),'columns'),false);
});

test('multiple entity choices retain ordered descriptors, explicit emptiness and numeric shortcut types',()=>{
  const ctx=context('people'),field=ctx.example.fields.find(field=>field.path==='entities');
  const descriptor={entity_id:'person.alex',name:'My name',icon:'custom:person',opaque:{keep:[]}},original=[descriptor,'person.sam'];
  const next=toggleChoice(original,'person.jules');
  assert.deepEqual(next,[descriptor,'person.sam','person.jules']);
  assert.deepEqual(toggleChoice(next,'person.sam'),[descriptor,'person.jules']);
  assert.deepEqual(original,[descriptor,'person.sam']);
  assert.deepEqual(fromYaml(toYaml(editField(ctx.config,field,next))).entities,next);
  assert.deepEqual(editField(ctx.config,field,[]).entities,[]);
  const charging=context('wallbox-current'),shortcuts=charging.example.fields.find(field=>field.path==='variables.shortcuts');
  assert.equal(hints(charging,shortcuts.path).numeric,true);
  assert.deepEqual(editField(charging.config,shortcuts,[8,16]).variables.shortcuts,[8,16]);
  assert.deepEqual(editField(context('graph').config,{path:'variables.power_devices',kind:'power_devices'},'- entity_id: sensor.desk_power\n  name: Desk').variables.power_devices,[{entity_id:'sensor.desk_power',name:'Desk'}]);
});

test('search matches friendly names and identifiers and bounds large icon result sets',()=>{
  const entities=hints(context('light'),'entity_id').options;
  assert.equal(filterChoices(entities,'LIVING ROOM').options[0].value,'light.living_room');
  assert.equal(filterChoices(entities,'light kitchen').options[0].value,'light.kitchen');
  assert.equal(filterChoices(entities,'missing').total,0);
  const icons=Array.from({length:120},(_,i)=>({value:`mdi:lamp-${i}`,label:`mdi:lamp-${i}`}));
  assert.equal(filterChoices(icons,'lamp').options.length,80);
  assert.equal(filterChoices(icons,'lamp').total,120);
  assert.equal(filterChoices([{value:'mdi:head-lightbulb-outline',label:'Head lightbulb'},{value:'mdi:lightbulb-outline',label:'Lightbulb'}],'lightbulb-outline').options[0].value,'mdi:lightbulb-outline');
});
