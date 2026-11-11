import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse,stringify} from 'yaml';
import catalog from '../../custom_components/marao_dashboard/frontend/marao-catalog.json' with {type:'json'};
import {cards,getExample,entityMetadata,internalCards} from '../../docs/examples/manifest.js';
import {validateNativeCardConfig} from '../../frontend_src/card-composition.js';
import {normalizeEventSources} from '../../custom_components/marao_dashboard/frontend/MaraoEventModel.js';
import {locationError} from '../../custom_components/marao_dashboard/frontend/MaraoLocation.js';
import {readDashboardSettings,patchDashboardSettings} from '../../frontend_src/dashboard-settings.js';

test('every public registration has a reference, fields and distinct valid scenarios',()=>{
  const expected=catalog.cards.filter(c=>!c.hidden).map(c=>c.id).concat(['camera-events','navbar']).sort();
  assert.deepEqual(cards.map(c=>c.id).sort(),expected);
  assert.equal(new Set(cards.map(c=>c.slug)).size,cards.length);
  for(const card of cards){
    assert.ok(card.description && card.notes.length,card.id);
    assert.equal(new Set(card.scenarios.map(s=>s.id)).size,card.scenarios.length,card.id);
    assert.ok(card.scenarios.length>1,card.id);
    for(const entry of catalog.cards.find(c=>c.id===card.id)?.variables || []){
      if(card.id==='md_weather_card'&&entry.key==='station_entities'){
        const readings=['temperature','humidity','dew_point','pressure','precipitation','wind_speed','wind_gust','wind_direction','illuminance','uv_index'];
        assert.deepEqual(card.fields.filter(field=>field.path.startsWith('variables.station_entities.')).map(field=>field.path),readings.map(key=>`variables.station_entities.${key}`));
        assert.ok(card.fields.filter(field=>field.path.startsWith('variables.station_entities.')).every(field=>field.kind==='entity'&&field.domains.length===1&&field.domains[0]==='sensor'));
        assert.ok(!card.fields.some(field=>field.path==='variables.station_entities'),'Station readings use entity selectors rather than a YAML field');
      }else assert.ok(card.fields.some(field=>field.path===`variables.${entry.key}`),`${card.id}.${entry.key}`);
    }
    for(const scenario of card.scenarios){
      assert.ok(scenario.description && scenario.behavior,`${card.id}/${scenario.id}`);
      const roundTrip=parse(stringify(scenario.config));
      assert.deepEqual(roundTrip,scenario.config);
      if(card.id==='camera-events')normalizeEventSources(roundTrip);
      else if(card.id==='navbar')assert.equal(locationError(roundTrip.current_room),undefined);
      else validateNativeCardConfig(roundTrip,entityMetadata);
      assert.ok(!Object.hasOwn(roundTrip,'states') && !Object.hasOwn(roundTrip,'simulation'));
      for(const [id,state] of Object.entries(scenario.states))assert.equal(state.entity_id,id);
    }
  }
  assert.deepEqual(internalCards.map(c=>c.id).sort(),catalog.cards.filter(c=>c.hidden).map(c=>c.id).sort());
});

test('examples protect recently added public behavior and distinct capability shapes',()=>{
  assert.equal(getExample('people').config.columns,2);
  assert.ok(getExample('fan').scenarios.some(s=>s.id==='open-only' && s.states['cover.exhaust'].attributes.supported_features===1));
  assert.equal(getExample('camera-events').config.cameras.length,2);
  assert.ok(getExample('navbar').scenarios.some(s=>s.id==='away' && s.states['person.alex'].state==='not_home'));
  assert.ok(getExample('climate').scenarios.some(s=>s.id==='range' && s.states['climate.living_room'].state==='heat_cool'));
  assert.ok(getExample('schedules').config.group_id);
  assert.ok(getExample('entity-group').config.summary_sections.length);
  assert.ok(getExample('entity-group').notes.some(note=>note.includes('Popup settings') && note.includes('native canvas and dialogs')));
  assert.ok(getExample('entity-group').notes.some(note=>note.includes('outer Save or Cancel') && note.includes('parent entity selections do not retarget')));
  assert.deepEqual(getExample('people').scenarios.find(s=>s.id==='empty').config.entities,[]);
});

test('the shared setup example opts into native dashboard navigation without rewriting views',()=>{
  const source=parse(readFileSync(new URL('../../docs/examples/dashboard.yaml',import.meta.url),'utf8'));
  const settings=readDashboardSettings(source);
  assert.equal(settings.version,1);
  assert.equal(settings.navbar.routes[0].path,'/marao-dashboard/'+source.views[0].path);
  assert.deepEqual(patchDashboardSettings(source,settings),source);
  validateNativeCardConfig(source.views[0].sections[0].cards[1],entityMetadata);
});


test('retired Header is absent from the public catalog while saved cards still validate',()=>{
  assert.equal(getExample('md_header_card'),undefined);
  assert.equal(catalog.cards.find(card=>card.id==='md_header_card').hidden,true);
  assert.ok(internalCards.some(card=>card.id==='md_header_card'));
  assert.doesNotThrow(()=>validateNativeCardConfig({type:'custom:marao-header-card',entity_id:'weather.home'},entityMetadata));
});
