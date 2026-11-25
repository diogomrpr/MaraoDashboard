import test from 'node:test';
import assert from 'node:assert/strict';
import { compactMigrationProvenance, expandMigrationProvenance } from '../../frontend_src/ordinary-provenance.js';

const protectedYaml = '# Keep this comment\r\ntype: markdown\r\ncontent: "  café  "\r\n';
const source = JSON.stringify({ pages: [{ yaml: protectedYaml }, {}], 'opaque.key': [], extra: false }, null, 2) + '\n';
const provenance = path => ({ source: path, disposition: 'provenance' });
const leaves = ['$.pages[0].yaml', '$.pages[1]', '$.opaque.key', '$.extra'].map(provenance);
const active = { source: '$.pages[1]', target: '$.views[3]', disposition: 'active', future: [] };
function origin() {
  return {
    version: 1, source_kind: 'strategy', source_version: 2, future: { z: false, a: [] },
    original_document: { strategy: { source_json: source }, opaque: 42 },
    original_source: source, yaml: [{ source: '$.pages[0].yaml', text: protectedYaml }],
    accounting: [...leaves, active], supplements: [],
  };
}

test('a version 2 origin reconstructs the exact original JSON from stored source and verified accounting', () => {
  const input = origin(), before = JSON.stringify(input);
  const next = compactMigrationProvenance(input);
  assert.equal(next.version, 2);
  assert.notEqual(next, input);
  assert.deepEqual(next.original_source, { ref: 'original_document.strategy.source_json' });
  assert.deepEqual(next.accounting, { source_leaves: 4, remainder: [active] });
  assert.equal(JSON.stringify(next.original_document), JSON.stringify(input.original_document));
  assert.equal(JSON.stringify(input), before);
  assert.equal(JSON.stringify(expandMigrationProvenance(JSON.parse(JSON.stringify(next)))), before);
  assert.equal(compactMigrationProvenance(next), next);
});

test('distinct source text, historical shapes and any exceptional accounting retain their exact values', () => {
  for (const version of [0, 1, 2]) {
    const input = { ...origin(), source_kind: 'source', source_version: version, original_source: source + ' ' };
    const next = compactMigrationProvenance(input);
    assert.equal(next.original_source, input.original_source);
    assert.equal(next.accounting.source_leaves, 4);
    assert.equal(JSON.stringify(expandMigrationProvenance(next)), JSON.stringify(input));
  }
  for (const exceptional of [
    { ...leaves[0], future: true }, { disposition: 'provenance', source: leaves[0].source }, leaves[1],
  ]) {
    const input = origin();
    input.accounting = [exceptional, ...leaves.slice(1), active];
    const next = compactMigrationProvenance(input);
    assert.equal(next.accounting, input.accounting);
    assert.equal(JSON.stringify(expandMigrationProvenance(next)), JSON.stringify(input));
  }
});

test('a direct-source import keeps authored formatting and references only an exactly reproducible document', () => {
  const document = JSON.parse(source);
  const input = { ...origin(), source_kind: 'source', original_document: document };
  const next = compactMigrationProvenance(input);
  assert.equal(next.original_source, source);
  assert.equal(next.original_document, 'original_source');
  assert.equal(JSON.stringify(expandMigrationProvenance(next)), JSON.stringify(input));
  const reordered = { ...input, original_document: { extra: false, 'opaque.key': [], pages: document.pages } };
  assert.equal(compactMigrationProvenance(reordered).original_document, reordered.original_document);
});

test('absent, malformed, newer, and nonbeneficial inputs are left alone; corrupt packed references fail closed', () => {
  const base = origin();
  const tiny = { ...base, original_source: '{}', original_document: { strategy: { source_json: '{}' } }, accounting: [] };
  for (const input of [undefined, null, {}, { ...base, version: 3 }, { ...base, source_version: 9 },
    { ...base, source_kind: 'future' }, { ...base, original_source: 'invalid' }, { ...base, yaml: null }, tiny]) {
    assert.equal(compactMigrationProvenance(input), input);
    assert.equal(expandMigrationProvenance(input), input);
  }
  const packed = compactMigrationProvenance(base);
  for (const corrupt of [
    { ...packed, original_source: { ref: 'unrecognized' } },
    { ...packed, original_document: {} }, { ...packed, accounting: { ...packed.accounting, source_leaves: 3 } },
    { ...packed, accounting: { ...packed.accounting, future: true } },
  ]) assert.throws(() => expandMigrationProvenance(corrupt), /Invalid compact/);
});
