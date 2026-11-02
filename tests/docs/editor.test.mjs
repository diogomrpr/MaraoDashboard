import test from 'node:test';
import assert from 'node:assert/strict';
import {fromYaml,toYaml,editField,validateDraft} from '../../docs/playground/editor-model.js';
const example={config:{type:'custom:marao-light-card',entity_id:'light.demo'}};
const states={'light.demo':{state:'on',attributes:{friendly_name:'Demo',supported_color_modes:['brightness']}}};

test('settings and YAML preserve unknown fields, explicit emptiness and native configuration',()=>{
  const original={...example.config,name:'Demo',variables:{keep:[],opaque:{a:1}},visibility:[],opaque:{source:'user'}};
  const updated=editField(original,{path:'name',kind:'text'},'Kitchen');
  validateDraft(updated,example,states);
  assert.deepEqual(fromYaml(toYaml(updated)),{...original,name:'Kitchen'});
  assert.equal(original.name,'Demo');
  const empty=editField(updated,{path:'variables.keep',kind:'array'},'[]');
  assert.deepEqual(empty.variables.keep,[]);assert.deepEqual(empty.opaque,original.opaque);
  assert.equal(Object.hasOwn(updated,'states'),false);
});

test('invalid YAML, duplicate fields, unsafe aliases and a changed public type are rejected',()=>{
  for(const text of ['entity: [','type: one\ntype: two','type: custom:marao-light-card\nentity: *missing','entity_id: !secret private_entity'])assert.throws(()=>fromYaml(text));
  assert.throws(()=>validateDraft({...example.config,type:'custom:foreign-card'},example,states),/Keep type/);
  assert.throws(()=>validateDraft([],example,states),/configuration object/);
});

test('settings use shared validation and preserve fractional values where supported',()=>{
  const config=editField(example.config,{path:'variables.opacity',kind:'number'},'.5');
  assert.equal(config.variables.opacity,.5);
  assert.throws(()=>editField(example.config,{path:'variables.opacity',kind:'number'},'NaN'));
  assert.equal(Object.hasOwn(editField(config,{path:'variables.opacity',kind:'number'},'').variables,'opacity'),false);
});

test('navbar exports dashboard settings and retains unknown envelope and route fields',async()=>{
  const {editorDocument,previewConfig}=await import('../../docs/playground/editor-model.js');
  const example={id:'navbar',config:{type:'custom:marao-navbar-card',dashboard_root:'marao-dashboard'}};
  const config={...example.config,routes:[{path:'/marao-dashboard/home',label:'Home',opaque:[]}],custom:true};
  const initial=editorDocument(config,example,{opaque:{keep:true},marao:{other:42}});
  assert.deepEqual(initial,{opaque:{keep:true},marao:{other:42,version:1,navbar:{routes:config.routes,custom:true}}});
  assert.equal(Object.hasOwn(initial.marao.navbar,'type'),false);
  assert.deepEqual(previewConfig(fromYaml(toYaml(initial)),example),config);
});

test('personal entity IDs keep fictional capability profiles without inventing missing entities',async()=>{
  const {bindPreviewEntities}=await import('../../docs/playground/editor-model.js');
  const original={entity_id:'light.demo',variables:{secondary:'sensor.temperature'}};
  const states={'light.demo':{entity_id:'light.demo',state:'on',attributes:{supported_color_modes:['brightness']}}};
  const next=bindPreviewEntities({...original,entity_id:'light.mine'},original,states);
  assert.equal(next['light.mine'].entity_id,'light.mine');assert.deepEqual(next['light.mine'].attributes,states['light.demo'].attributes);
  assert.equal(states['light.mine'],undefined);
  assert.deepEqual(bindPreviewEntities({entity_id:'light.mine'},original,{}),{});
});
