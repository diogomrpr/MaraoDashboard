// Retain the original document and every exceptional record. Only the exact
// duplicates produced by the version 1 converter have a shorter representation.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const strategySource = 'original_document.strategy.source_json';
const sourceKinds = new Set(['source', 'strategy', 'historical-native']);

export function provenanceLeafRecords(value, path = '$', records = []) {
  if (Array.isArray(value) && value.length) {
    value.forEach((child, index) => provenanceLeafRecords(child, `${path}[${index}]`, records));
  } else if (object(value) && Object.keys(value).length) {
    for (const [key, child] of Object.entries(value)) provenanceLeafRecords(child, `${path}.${key}`, records);
  } else {
    records.push({ source: path, disposition: 'provenance' });
  }
  return records;
}

function sourceInfo(text) {
  try {
    const source = JSON.parse(text);
    return object(source) ? { document: source, leaves: provenanceLeafRecords(source) } : undefined;
  } catch {
    return undefined;
  }
}

function knownOrigin(origin) {
  return object(origin) && sourceKinds.has(origin.source_kind) && [0, 1, 2].includes(origin.source_version)
    && Array.isArray(origin.supplements) && Array.isArray(origin.yaml);
}

// Reading, rendering, or expanding an origin never changes the saved document.
export function compactMigrationProvenance(origin) {
  if (origin?.version !== 1 || !knownOrigin(origin) || !object(origin.original_document)
    || typeof origin.original_source !== 'string' || !Array.isArray(origin.accounting)) return origin;
  const info = sourceInfo(origin.original_source);
  if (!info) return origin;
  const next = { ...origin, version: 2 };
  if (origin.source_kind === 'strategy' && origin.original_source === origin.original_document.strategy?.source_json) {
    next.original_source = { ref: strategySource };
  } else if (origin.source_kind === 'source' && JSON.stringify(origin.original_document) === JSON.stringify(info.document)) {
    // Direct source imports preserve the authored string, including whitespace.
    next.original_document = 'original_source';
  }
  const { leaves } = info;
  if (leaves.length <= origin.accounting.length && leaves.every((record, index) =>
    JSON.stringify(record) === JSON.stringify(origin.accounting[index]))) {
    next.accounting = { source_leaves: leaves.length, remainder: origin.accounting.slice(leaves.length) };
  }
  if (next.original_source === origin.original_source && next.original_document === origin.original_document && next.accounting === origin.accounting) return origin;
  return JSON.stringify(next).length < JSON.stringify(origin).length ? next : origin;
}

function invalidOrigin() {
  throw new Error('Invalid compact Marao migration provenance.');
}

export function expandMigrationProvenance(origin) {
  if (origin?.version !== 2) return origin;
  if (!knownOrigin(origin)) return invalidOrigin();
  const result = { ...origin, version: 1 };
  if (typeof origin.original_source !== 'string') {
    const reference = origin.original_source;
    if (!object(reference) || Object.keys(reference).length !== 1 || reference.ref !== strategySource
      || origin.source_kind !== 'strategy' || typeof origin.original_document?.strategy?.source_json !== 'string') return invalidOrigin();
    result.original_source = origin.original_document.strategy.source_json;
  }
  const info = sourceInfo(result.original_source);
  if (!info) return invalidOrigin();
  if (!object(origin.original_document)) {
    if (origin.source_kind !== 'source' || origin.original_document !== 'original_source') return invalidOrigin();
    result.original_document = info.document;
  }
  if (!Array.isArray(origin.accounting)) {
    const packed = origin.accounting;
    if (!object(packed) || Object.keys(packed).length !== 2 || !Array.isArray(packed.remainder)
      || !Number.isSafeInteger(packed.source_leaves) || packed.source_leaves < 1) return invalidOrigin();
    const { leaves } = info;
    if (leaves.length !== packed.source_leaves) return invalidOrigin();
    result.accounting = leaves.concat(packed.remainder);
  }
  return result;
}
