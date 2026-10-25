import test from 'node:test';
import assert from 'node:assert/strict';
import { compileDashboard } from '../../frontend_src/compile-dashboard.js';

const source = { config_version: 2, name: 'Safe', landing_page: 'home', navigation: [], pages: [{ name: 'Home', path: 'home', sections: [{ columns: 1, entities: [{ template: 'md_title_card', name: 'My home', id: 'heading' }] }, { columns: 1, cards: [{ type: 'markdown', content: 'Raw', unknown: { keep: [] } }] }] }] };

test('complete independent native output preserves empty navigation, raw content and ordering without touching source', () => {
  const before = structuredClone(source);
  assert.deepEqual(compileDashboard(source, { dashboardRoot: 'marao-dashboard' }), { title: 'Safe', views: [{ title: 'Home', path: 'home', theme: 'Marao Dashboard', cards: [
    { type: 'custom:marao-card', template: 'md_title_card', name: 'My home', show_icon: false, show_state: false, tap_action: { action: 'none' }, hold_action: { action: 'none' } },
    { type: 'markdown', content: 'Raw', unknown: { keep: [] } },
    { type: 'vertical-stack', cards: [{ type: 'custom:marao-navbar-card', routes: [] }] },
  ] }] });
  assert.deepEqual(source, before);
});

test('invalid bindings, future source and unsafe YAML fail without a starter reset', () => {
  for (const card of [{ template: 'md_light_card', entity_id: 'lock.safe' }, { template: 'ha_card', yaml: 'type: !secret private' }]) {
    const input = structuredClone(source); input.pages[0].sections[0].entities = [card];
    const before = structuredClone(input);
    assert.throws(() => compileDashboard(input));
    assert.deepEqual(input, before);
  }
  assert.throws(() => compileDashboard({ ...source, config_version: 3 }));
});

test('generated access popup keeps strict opener and explicit safe lock action', () => {
  const input = structuredClone(source);
  input.pages[0].sections = [{ columns: 1, entities: [{ id: 'door', template: 'md_access_card', entity_id: 'lock.safe', name: 'Door' }] }];
  const result = compileDashboard(input);
  const popup = result.views[0].cards.find(card => card.type === 'custom:marao-popup-card');
  assert.equal(popup.hash, '#page-home-door-popup');
  assert.deepEqual(popup.cards[0].cards.map(card => [card.template, card.entity, card.variables.action_service]), [['md_access_slide_action_card', 'lock.safe', 'lock.unlock'], ['md_access_action_card', 'lock.safe', 'lock.lock']]);
});

test('modern released baselines retain complete independent source/output targets and frozen provenance', async () => {
  const fs=await import('node:fs'), {createHash}=await import('node:crypto'), {convertDocument}=await import('../../frontend_src/convert-document.js');
  const base=new URL('../../ha-test/upgrade/fixtures/',import.meta.url), read=name=>fs.readFileSync(new URL(name,base),'utf8');
  const manifest=JSON.parse(read('native-baselines.json'));
  for(const record of manifest.records) {
    for(const name of ['input','released_compiled','expected_source','expected_compiled']) assert.equal(createHash('sha256').update(read(record[name])).digest('hex'),record[name+'_sha256']);
    assert.equal(record.draft,false);assert.equal(record.prerelease,false);assert.match(record.commit,/^[a-f0-9]{40}$/);
    const text=read(record.input), result=convertDocument(text,{dashboardRoot:'marao-dashboard'});
    assert.deepEqual(result.source,JSON.parse(read(record.expected_source)),record.tag+' full source');
    assert.deepEqual(result.compiled,JSON.parse(read(record.expected_compiled)),record.tag+' full compiled target');
    if(record.tag==='v0.21.1') assert.equal(result.sourceText,text);
    assert.equal(read(record.input),text);
  }
});
