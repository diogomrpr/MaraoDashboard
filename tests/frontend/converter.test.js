import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { appendCustomContent, convertDocument, protectedFragment } from '../../frontend_src/convert-document.js';

const source = {config_version:2,name:'Safe',landing_page:'home',navigation:[],pages:[{name:'Home',path:'home',entities:[]}]};
test('current source text and native envelope round-trip without reformatting or mutation', () => {
  const text = JSON.stringify(source,null,3)+'\n';
  const result = convertDocument(text);
  assert.equal(result.document.strategy.source_json,text);
  assert.deepEqual(convertDocument(JSON.stringify(result.document)).document,result.document);
  assert.equal(result.document.strategy.dashboard_root,'marao-safe');
  assert.deepEqual(source.pages[0].entities,[]);
});
test('every frozen historical source converts directly to the independent expected current source', () => {
  const base = new URL('../../ha-test/upgrade/fixtures/',import.meta.url);
  const read = name => JSON.parse(fs.readFileSync(new URL(name,base),'utf8'));
  for (const record of read('page-model-expectations.json').records) assert.deepEqual(convertDocument(JSON.stringify(read(record.input))).source,read(record.expected));
  assert.deepEqual(convertDocument(JSON.stringify(read('v0.2.0-storage-dashboard.json'))).source,read('v0.2.0-storage-format-2-expected.json'));
});
test('missing membership asks once and preserves explicit empty answers through the full chain', () => {
  const text = JSON.stringify({name:'Safe',rooms:[{name:'Office',area:'office'}],navigation:[]});
  assert.throws(() => convertDocument(text),error => error.code === 'room_members_needed');
  const result = convertDocument(text,{roomEntities:{0:[]}});
  assert.deepEqual(result.source.pages.at(-1).sections[1].entities,[]);
});
test('protected custom text survives exactly and reaches the intended body/popup with safe native values', () => {
  const config = structuredClone(source); config.pages[0].entities = [{id:'door',template:'md_access_card',entity_id:'lock.safe'}];
  const yaml = '  # kept comment\n  - type: markdown\n    content: "<script>literal</script>"\n    unknown: []\n';
  const result = convertDocument(JSON.stringify(config),{supplements:[{page:'home',yaml},{page:'home',popup_hash:'#page-home-door-popup',yaml}]});
  assert.equal(result.source.pages[0].custom_content[0].yaml,yaml);
  const cards = result.compiled.views[0].cards;
  assert.deepEqual(cards.find(card => card.type === 'markdown'),{type:'markdown',content:'<script>literal</script>',unknown:[]});
  assert.equal(cards.find(card => card.hash === '#page-home-door-popup').cards.at(-1).content,'<script>literal</script>');
  assert.equal(Object.hasOwn(config.pages[0],'custom_content'),false);
  assert.throws(() => appendCustomContent(config,[{page:'home',yaml:'- type: !secret private'}]),/tag/);
});
test('damaged markers, future versions, unsafe numbers and missing popup targets refuse successful output', () => {
  assert.throws(() => protectedFragment('  # marao:custom:start\n- type: markdown\n'),/custom_markers_invalid/);
  assert.throws(() => convertDocument('{"config_version":3}'));
  assert.throws(() => convertDocument(JSON.stringify(source).replace('"Safe"','"Safe","number":9007199254740993')),/number_precision/);
  assert.throws(() => convertDocument(JSON.stringify(source),{supplements:[{page:'home',popup_hash:'#missing',yaml:'- type: markdown\n  content: Safe'}]}),/popup/);
});

test('missing native bindings and energy inputs are explicit questions with deterministic answer reuse', () => {
  const native={title:'Safe',views:[{title:'Room',path:'room',cards:[{type:'custom:marao-entity-card',name:'Lamp'}]}]};
  assert.throws(()=>convertDocument(JSON.stringify(native)),error=>error.code==='native_binding_needed' && error.details.page==='room' && error.details.index===0);
  const result=convertDocument(JSON.stringify(native),{nativeBindings:{room:{0:'light.safe'}}});
  assert.equal(result.source.pages[0].sections[0].entities[0].entity_id,'light.safe');
  assert.deepEqual(native.views[0].cards[0],{type:'custom:marao-entity-card',name:'Lamp'});
  const energy={config_version:1,name:'Safe',rooms:[],navigation:['energy'],pages:{energy:{loads:[{name:'Office'}]}}};
  assert.throws(()=>convertDocument(JSON.stringify(energy)),error=>error.code==='energy_source_needed' && error.details.index===0);
  const converted=convertDocument(JSON.stringify(energy),{energySources:{0:'sensor.power'}});
  assert.equal(converted.source.pages.find(page=>page.path==='energy').sections.flatMap(section=>section.entities || []).some(card=>card.entity_id==='sensor.power'),true);
});
