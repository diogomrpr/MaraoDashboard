import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCardYaml, cardYaml, validateCardYaml } from '../../frontend_src/lovelace-model.js';
import { normalizeConfig, serializeConfig, validateConfig, movePageCard, duplicatePage, buildJsonSchema } from '../../frontend_src/editor-model.js';
const fixture = JSON.parse(fs.readFileSync(new URL('./lovelace-cards.fixture.json', import.meta.url)));

test('native YAML parses HA states, aliases and merges without losing custom options', () => {
  assert.deepEqual(parseCardYaml(fixture.source), fixture.expected);
  assert.deepEqual(parseCardYaml(cardYaml(fixture.expected)), fixture.expected);
  assert.deepEqual(parseCardYaml('type: tile\nx: off\ny: "on"'), { type: 'tile', x: false, y: 'on' });
  for (const [source, value] of Object.entries(fixture.scalars)) assert.equal(parseCardYaml(`type: markdown\nx: ${source}`).x, value);
  assert.deepEqual(parseCardYaml(cardYaml({ type: 'markdown', large: 1e21, small: 1e-7 })), { type: 'markdown', large: 1e21, small: 1e-7 });
  for (const source of fixture.invalid) assert.throws(() => parseCardYaml(source), undefined, source);
});

test('native descriptors preserve exact source and opaque options across JSON, moves and duplication', () => {
  const entry = { id: 'external', template: 'ha_card', yaml: fixture.source, future: { keep: true } };
  const source = { config_version: 2, name: 'Test', landing_page: 'home', pages: [{ name: 'Home', path: 'home', sections: [
    { columns: 2, entities: [{ id: 'title', template: 'md_title_card', name: 'Title' }, entry], cards: [{ type: 'markdown', content: 'Raw' }] }, { entities: [] }] }] };
  const model = normalizeConfig(source);
  assert.deepEqual(serializeConfig(model), source);
  assert.equal(movePageCard(model.pages[0], 0, 1, 1, 0, model.pages[0].sections[0].entities[1]), true);
  const saved = serializeConfig(model);
  assert.deepEqual(saved.pages[0].sections[1].entities[0], entry);
  assert.deepEqual(saved.pages[0].sections[0].cards, source.pages[0].sections[0].cards);
  assert.deepEqual(validateConfig(saved, 2), []);
  assert.doesNotThrow(() => validateCardYaml(saved));
  saved.pages[0].sections[1].entities[0].yaml = 'type: [';
  assert.throws(() => validateCardYaml(saved));
  assert.equal(source.pages[0].sections[0].entities[1].yaml, fixture.source);
  const duplicate = duplicatePage(model, 0);
  assert.equal(duplicate.sections[1].entities[0].yaml, fixture.source);
  assert.notEqual(duplicate.sections[1].entities[0].id, entry.id);
  assert.deepEqual(duplicate.sections[1].entities[0].future, entry.future);
  const schema = JSON.stringify(buildJsonSchema({ config_version: 2, cards: [], pages: {} }, []));
  assert.ok(schema.includes('ha_card') && schema.includes('Complete inline Home Assistant card YAML'));
});
