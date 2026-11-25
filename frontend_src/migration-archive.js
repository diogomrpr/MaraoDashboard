import { compactMigrationProvenance, expandMigrationProvenance } from './ordinary-provenance.js';
import { sha256, sha256Bytes } from './recovery-hash.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const encoder = new TextEncoder();

export function validateMigrationReference(reference) {
  if (!object(reference) || reference.version !== 3 || Object.keys(reference).length !== 3
    || typeof reference.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(reference.sha256)
    || !Number.isSafeInteger(reference.bytes) || reference.bytes <= 0) {
    throw new Error('Invalid Marao migration archive reference.');
  }
  return reference;
}

function validateEmbeddedRecord(record) {
  if (![1, 2].includes(record?.version)) throw new Error('Unsupported Marao migration archive record.');
  const expanded = expandMigrationProvenance(record);
  if (!['source', 'strategy', 'historical-native'].includes(expanded.source_kind) || ![0, 1, 2].includes(expanded.source_version)
    || typeof expanded.original_source !== 'string' || !object(expanded.original_document)
    || ![expanded.supplements, expanded.yaml, expanded.accounting].every(Array.isArray)) {
    throw new Error('Invalid Marao migration archive record.');
  }
}

function withMigration(document, migration) {
  return { ...document, marao: { ...document.marao, migration } };
}

// Hash the exact JSON representation to preserve opaque fields, original text
// and property order. The archive can travel independently of dashboard edits.
export async function detachMigrationProvenance(document) {
  if (!object(document) || !Array.isArray(document.views) || Object.hasOwn(document, 'strategy')) {
    throw new Error('Expected an ordinary Home Assistant dashboard.');
  }
  const record = document.marao?.migration;
  if (record?.version === 3) validateMigrationReference(record);
  if (![1, 2].includes(record?.version)) return { document, archive: null };
  if (document.marao.version !== 1) throw new Error('Unsupported Marao dashboard settings version.');
  validateEmbeddedRecord(record);
  const serialized = JSON.stringify(record);
  const reference = { version: 3, sha256: await sha256(serialized), bytes: encoder.encode(serialized).length };
  return { document: withMigration(document, reference),
    archive: { kind: 'marao-migration-archive', version: 1, record: JSON.parse(serialized) } };
}

export async function readMigrationArchive(reference, archive) {
  validateMigrationReference(reference);
  if (archive?.kind !== 'marao-migration-archive' || archive.version !== 1 || !object(archive.record)) {
    throw new Error('A matching Marao migration archive is required.');
  }
  const serialized = JSON.stringify(archive.record);
  if (encoder.encode(serialized).length !== reference.bytes || await sha256(serialized) !== reference.sha256) {
    throw new Error('Marao migration archive integrity check failed.');
  }
  const record = JSON.parse(serialized);
  validateEmbeddedRecord(record);
  return record;
}

export async function restoreMigrationProvenance(document, archive) {
  return withMigration(document, await readMigrationArchive(document.marao?.migration, archive));
}

// For export/repair only. A receipt used to change a dashboard must also pass
// the ordinary conversion session's complete recovery checks.
export async function archiveFromBackup(reference, value) {
  validateMigrationReference(reference);
  let archive;
  if (value?.kind === 'marao-migration-archive') archive = value;
  else if (value?.kind === 'marao-native-conversion' && value.version === 2) archive = value.migration_archive;
  else {
    const dashboard = value?.kind === 'marao-native-conversion' && value.version === 1
      ? value.proposed_document : value?.data?.config ?? value;
    const record = dashboard?.marao?.migration ?? value;
    validateEmbeddedRecord(record);
    let candidate = record;
    if (!matchesEmbeddedOrigin(reference, record)) {
      // Older backups can contain the exact expanded form of a later compact
      // archive, or a compact form of the original embedded record.
      candidate = record.version === 1 ? compactMigrationProvenance(record) : expandMigrationProvenance(record);
    }
    archive = { kind:'marao-migration-archive', version:1, record:candidate };
  }
  const record = await readMigrationArchive(reference, archive);
  return { kind:'marao-migration-archive', version:1, record };
}

// Legacy recovery receipts contain the embedded record. Existing synchronous
// classification can verify that a detached dashboard carries that exact record.
export function matchesEmbeddedOrigin(reference, record) {
  validateMigrationReference(reference);
  const bytes = encoder.encode(JSON.stringify(record));
  return bytes.length === reference.bytes && sha256Bytes(bytes) === reference.sha256;
}
