import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalCard, canonicalTemplate, canonicalOptions, legacyTemplates } from '../../custom_components/marao_dashboard/frontend/MaraoNames.js';
import { normalizeConfig, serializeConfig, validateConfig, buildJsonSchema } from '../../frontend_src/editor-model.js';

test('released template and option aliases resolve without changing source or opaque data', () => {
  for (const [legacy, current] of Object.entries(legacyTemplates)) assert.equal(canonicalTemplate(legacy), current);
  const source = { template: 'hc_media_card', entity_id: 'media_player.hc_lounge', name: 'hc_custom', variables: { hc_show_background_art: false, hc_background_color: '#123456', hc_custom: ['keep'] }, tap_action: { action: 'call-service', data: { template: 'hc_light_card' } } };
  const before = structuredClone(source), card = canonicalCard(source);
  assert.equal(card.template, 'md_media_card'); assert.equal(card.variables.md_show_background_art, false);
  assert.equal(card.variables.md_background_color, '#123456'); assert.deepEqual(card.variables.hc_custom, ['keep']);
  assert.equal(card.entity_id, 'media_player.hc_lounge'); assert.deepEqual(card.tap_action, source.tap_action);
  assert.deepEqual(source, before);
  const raw = { type: 'custom:foreign-card', template: 'hc_light_card', variables: { hc_color: 'red' } };
  assert.equal(canonicalCard(raw), raw);
  assert.throws(() => canonicalOptions({hc_color:'red',md_color:'blue'}), /Conflicting/);
});

test('legacy editor source round trips unchanged while new descriptors and settings use md', () => {
  const config = {config_version:2,name:'Safe',landing_page:'home',pages:[{name:'Home',path:'home',entities:[{id:'media',template:'hc_media_card',entity_id:'media_player.hc_lounge',variables:{hc_show_background_art:false,future:[]}}]}]};
  const model = normalizeConfig(config);
  assert.equal(model.pages[0].entities[0].template,'md_media_card');
  assert.deepEqual(serializeConfig(model),config);
  model.pages[0].entities[0].name='Custom';
  const edited = serializeConfig(model).pages[0].entities[0];
  assert.equal(edited.template,'md_media_card');assert.equal(edited.variables.md_show_background_art,false);
  assert.equal(edited.entity_id,'media_player.hc_lounge');assert.deepEqual(edited.variables.future,[]);
  const catalog={cards:[{id:'md_media_card',domains:['media_player'],variables:[]}],pages:{}};
  assert.deepEqual(validateConfig(config,2,undefined,{},catalog),[]);
  assert.match(JSON.stringify(buildJsonSchema(catalog,[])),/hc_media_card/);
});
