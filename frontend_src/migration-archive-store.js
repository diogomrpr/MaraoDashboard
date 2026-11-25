import { readMigrationArchive, validateMigrationReference } from './migration-archive.js';

export function migrationArchiveKey(reference) {
  return 'marao.migration.' + validateMigrationReference(reference).sha256;
}

async function storedArchive(callWS, key, reference) {
  const response = await callWS({ type: 'frontend/get_system_data', key });
  if (response?.value === null) return null;
  if (typeof response?.value !== 'string') throw new Error('Invalid stored migration archive.');
  let archive;
  try { archive = JSON.parse(response.value); }
  catch { throw new Error('Invalid stored migration archive.'); }
  await readMigrationArchive(reference, archive);
  return archive;
}

export async function fetchMigrationArchive(callWS, reference) {
  const archive = await storedArchive(callWS, migrationArchiveKey(reference), reference);
  if (!archive) throw new Error('The migration archive is missing.');
  return archive;
}

// This path is invoked only by an explicit save. Existing content at a digest
// must verify before reuse. Concurrent legitimate writers store the same data.
export async function ensureMigrationArchive(callWS, reference, archive, isCurrent) {
  const key = migrationArchiveKey(reference);
  await readMigrationArchive(reference, archive);
  const guard = () => {
    if (!isCurrent()) throw new Error('The migration session changed.');
  };
  guard();
  const existing = await storedArchive(callWS, key, reference);
  guard();
  if (existing) return existing;
  let writeError;
  try { await callWS({ type: 'frontend/set_system_data', key, value: JSON.stringify(archive) }); }
  catch (error) { writeError = error; }
  guard();
  // HA may have accepted a write whose acknowledgement did not arrive.
  const confirmed = await storedArchive(callWS, key, reference);
  guard();
  if (!confirmed) throw writeError || new Error('Home Assistant did not retain the migration archive.');
  return confirmed;
}
