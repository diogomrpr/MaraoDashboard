import { sha256 } from './recovery-hash.js';
import { convertDocument } from './convert-document.js';
import { resolveSource } from './compile-dashboard.js';
import { nativeCardType } from './card-composition.js';
import { validateDashboardSettings } from './dashboard-settings.js';
import { parseCardYaml, parseCardsYaml } from './lovelace-model.js';
import { rewriteOwnedAssets } from './native-dependencies.js';
import { compactMigrationProvenance, expandMigrationProvenance, provenanceLeafRecords } from './ordinary-provenance.js';
import { copy, domain, entries, object, parseSource, SourceError, STRATEGY_TYPE, unwrapDocument } from '../custom_components/marao_dashboard/frontend/MaraoSource.js';

import { detachMigrationProvenance, readMigrationArchive, matchesEmbeddedOrigin } from './migration-archive.js';
export { archiveFromBackup, detachMigrationProvenance, readMigrationArchive, restoreMigrationProvenance, validateMigrationReference } from './migration-archive.js';
export { sha256 } from './recovery-hash.js';

export const ORDINARY_MIGRATION_VERSION = 1;
const own = (value, key) => Object.hasOwn(value, key);
const fail = (code, path = '$', details) => { throw new SourceError(code, path, details); };
const isRoot = root => typeof root === 'string' && /^[a-z0-9][a-z0-9_-]*-[a-z0-9_-]+$/.test(root);
const historicalTypes = new Set(['custom:marao-entity-card', 'custom:marao-room-card', 'custom:marao-header-card']);
const sourceKeys = ['config_version', 'pages', 'rooms', 'overview'];
const order = ['sensor', 'binary_sensor', 'camera', 'lock', 'cover', 'climate', 'fan', 'switch', 'input_boolean', 'media_player', 'vacuum', 'number', 'input_number', 'light', 'navigation', 'entity_group'];
const compact = new Set(['sensor', 'binary_sensor', 'switch', 'input_boolean', 'number', 'input_number', 'light', 'navigation', 'entity_group']);

// JSON property order is immaterial for baseline comparison; array order is not.
export function canonicalDocument(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalDocument).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalDocument(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

export function classifyDashboard(input) {
  const supplied = typeof input === 'string' ? parseSource(input) : parseSource(JSON.stringify(input));
  let document = supplied;
  if (object(supplied.data) && own(supplied.data, 'config')) {
    // Reuse the released storage-envelope checks before unwrapping it.
    unwrapDocument(supplied);
    document = supplied.data.config;
  }
  if (own(document, 'strategy')) {
    if (document.strategy?.type !== STRATEGY_TYPE) fail('native_strategy_unsupported', '$.strategy');
    const unwrapped = unwrapDocument(document);
    return { kind: 'strategy', document: copy(document), supplied, ...unwrapped };
  }
  if (own(document, 'views')) {
    if (!Array.isArray(document.views) || sourceKeys.some(key => own(document, key))) fail('native_mixed', '$');
    if (own(document, 'marao')) {
      validateDashboardSettings(document.marao);
      return { kind: 'ordinary', document: copy(document), supplied };
    }
    if (document.views.some(view => !object(view) || own(view, 'sections') && !Array.isArray(view.sections) || own(view, 'cards') && !Array.isArray(view.cards))) fail('ordinary_document_invalid');
    const legacy = document.views.some(view => (view.sections || [{ cards: view.cards || [] }]).some(section =>
      Array.isArray(section?.cards) && section.cards.some(card => historicalTypes.has(card?.type) && !card.template)));
    return { kind: legacy ? 'historical-native' : 'ordinary', document: copy(document), supplied };
  }
  return { kind: 'source', document: copy(document), supplied };
}

export function validateOrdinaryDocument(document) {
  if (!object(document) || !Array.isArray(document.views) || own(document, 'strategy')) fail('ordinary_document_invalid');
  if (own(document, 'marao')) validateDashboardSettings(document.marao);
  return document;
}

const walk = (value, visit) => {
  visit(value);
  if (Array.isArray(value)) value.forEach(child => walk(child, visit));
  else if (object(value)) Object.values(value).forEach(child => walk(child, visit));
};

export function convertOrdinaryDocument(text, context = {}) {
  const input = classifyDashboard(text);
  if (input.kind === 'ordinary') {
    if (context.supplements?.length || context.fileReplacements && Object.keys(context.fileReplacements).length) fail('ordinary_conversion_unneeded');
    validateOrdinaryDocument(input.document);
    const origin = input.document.marao?.migration;
    const compact = compactMigrationProvenance(origin);
    if (compact !== origin) {
      if (!isRoot(context.dashboardRoot)) fail('dashboard_root_needed');
      return { kind: 'ordinary', changed: true, document: { ...input.document, marao: { ...input.document.marao, migration: compact } },
        originalText: text, originalDocument: input.document, sourceText: origin.original_source, fromVersion: origin.source_version,
        root: context.dashboardRoot, privacy: [], accounting: origin.accounting, assumptions: [], supplements: origin.supplements };
    }
    return { kind: 'ordinary', changed: false, document: copy(input.document), originalText: text, originalDocument: copy(input.document), privacy: [], accounting: [], assumptions: [] };
  }
  const originalRoot = input.document.strategy?.dashboard_root;
  if (originalRoot && context.dashboardRoot && originalRoot !== context.dashboardRoot) fail('native_root_conflict', '$.strategy.dashboard_root');
  if (own(input.document, 'marao') || own(input.source || input.document, 'marao')) fail('native_settings_collision', '$.marao');
  // Keep legacy references unresolved through the intermediate renderer so
  // retained external sheets receive the same persistent aliases as raw cards.
  const legacy = convertDocument(text, { ...context, assetBaseURL: undefined });
  const root = context.dashboardRoot || legacy.document.strategy.dashboard_root;
  if (!isRoot(root)) fail('dashboard_root_needed');
  const source = legacy.source;
  const resolved = resolveSource(source, context.entities || []);
  const accounting = provenanceLeafRecords(source);
  const mappings = [];
  const originals = [];
  const compiledViews = new Map(legacy.compiled.views.map(view => [view.path, view]));
  const pages = [...resolved.pages.filter(page => page.path === source.landing_page), ...resolved.pages.filter(page => page.path !== source.landing_page)];
  const views = pages.map((page, viewIndex) => {
    const sourceIndex = source.pages.findIndex(item => item.path === page.path), sourcePage = source.pages[sourceIndex];
    const sourceSections = sourcePage.sections || [sourcePage];
    const sheets = new Map();
    walk(compiledViews.get(page.path), value => { if (value?.type === 'custom:marao-popup-card') sheets.set(value.hash, copy(value)); });
    const externalHashes = new Set();
    const findReferences = value => {
      if (!object(value)) return;
      for (const key of ['popup_hash', 'mode_selector_hash', 'navigation_path', 'lights_popup']) if (typeof value[key] === 'string' && sheets.has(value[key])) externalHashes.add(value[key]);
    };
    walk(sourcePage, findReferences);
    for (const section of sourceSections) for (const card of entries(section.entities)) if (card.template === 'ha_card') walk(parseCardYaml(card.yaml), findReferences);
    for (const fragment of sourcePage.custom_content || []) walk(parseCardsYaml(fragment.yaml), findReferences);
    // An external group sheet can link to child climate/access sheets. Retain
    // its complete referenced tree before the card stops owning those details.
    for (const hash of externalHashes) walk(sheets.get(hash), value => {
      if (typeof value === 'string' && sheets.has(value)) externalHashes.add(value);
    });
    const external = [];
    const mark = (sourcePath, targetPath) => mappings.push({ source: sourcePath, target: targetPath, disposition: 'active' });
    const toCard = (item, saved, sourcePath) => {
      if (item.template === 'ha_card') {
        originals.push({ source: sourcePath + '.yaml', text: saved.yaml });
        return parseCardYaml(saved.yaml);
      }
      const card = { ...copy(saved), type: nativeCardType(item.template), template: item.template };
      if (!own(card, 'name') && item.name) card.name = item.name;
      if (item.page) card.tap_action = { action: 'navigate', navigation_path: `/${root}/${item.page}`, haptic: 'heavy' };
      const variables = copy(saved.variables || {});
      for (const key of ['popup_hash', 'mode_selector_hash']) {
        const hash = item.variables?.[key];
        if (externalHashes.has(hash)) variables[key] = hash;
      }
      if (Object.keys(variables).length || own(saved, 'variables')) card.variables = variables;
      // The source's members are authoritative; never serialize registry snapshots.
      if (item.template === 'md_entity_group_card' && !own(card, 'popup_filter')) card.popup_filter = item.popup_filter;
      if (item.template === 'md_floor_plan_card') {
        const hash = `#page-${item._page_instance}-${item.id}-lights`;
        if (externalHashes.has(hash)) (card.variables ||= {}).lights_popup = hash;
      }
      return card;
    };
    const nativeSections = page._sections.map((section, sectionIndex) => {
      const savedSection = sourceSections[sectionIndex];
      const sectionPath = `$.pages[${sourceIndex}]${sourcePage.sections ? `.sections[${sectionIndex}]` : ''}`;
      const descriptors = section.ordered_cards;
      const savedEntries = entries(savedSection.entities);
      let items = descriptors.map((item, index) => ({ card: toCard(item, savedEntries[index], `${sectionPath}.entities[${index}]`), kind: item.template === 'ha_card' ? 'ha_card' : item.page ? 'navigation' : item.template === 'md_entity_group_card' ? 'entity_group' : domain(item.entity_id), source: `${sectionPath}.entities[${index}]` }));
      if (!section.columns) {
        const kinds = [...order, ...items.map(item => item.kind).filter(kind => !order.includes(kind))];
        items = [...new Set(kinds)].flatMap(kind => items.filter(item => item.kind === kind));
      }
      const cards = items.map(entry => {
        const columns = section.columns || (compact.has(entry.kind) ? 2 : 1);
        return { ...entry.card, ...(!own(entry.card, 'grid_options') && columns !== 5 ? { grid_options: { columns: 12 / columns } } : {}) };
      });
      for (const raw of section.cards || []) cards.push(copy(raw));
      const targetPath = `$.views[${viewIndex}].sections[${sectionIndex}]`;
      mark(sectionPath, targetPath);
      items.forEach((entry, index) => mark(entry.source, targetPath + (section.columns === 5 ? '.cards[0].cards' : '.cards') + `[${index}]`));
      // HA's twelve-column Sections grid cannot express five equal columns.
      // Keep that deliberate layout in HA's editable built-in Grid container.
      return { type: 'grid', cards: section.columns === 5 && cards.length ? [{ type: 'grid', columns: 5, square: false, cards }] : cards };
    });
    for (const fragment of sourcePage.custom_content || []) {
      originals.push({ source: `$.pages[${sourceIndex}].custom_content[${sourcePage.custom_content.indexOf(fragment)}].yaml`, text: fragment.yaml });
      if (!fragment.popup_hash) nativeSections.push({ type: 'grid', cards: parseCardsYaml(fragment.yaml) });
    }
    const retainedHashes = new Set();
    walk(nativeSections, value => { if (value?.type === 'custom:marao-popup-card') retainedHashes.add(value.hash); });
    for (const hash of externalHashes) {
      if (!sheets.has(hash)) fail('native_popup_unresolved', '$.pages', { page: page.path });
      if (!retainedHashes.has(hash)) external.push(sheets.get(hash));
    }
    if (external.length) nativeSections.push({ type: 'grid', cards: external });
    const compiled = compiledViews.get(page.path);
    const view = { title: compiled.title, path: page.path, type: 'sections', sections: nativeSections };
    for (const key of ['icon', 'subview']) if (own(sourcePage, key)) view[key] = copy(sourcePage[key]);
    if (compiled.theme && compiled.theme !== 'Marao Dashboard') view.theme = compiled.theme;
    const full = page._sections.flatMap(section => section.ordered_cards).find(item => item.template === 'md_floor_plan_card' && item.variables.full_page);
    if (full) {
      const cards = nativeSections.flatMap(section => section.cards);
      view.type = 'panel'; delete view.sections;
      view.cards = cards.length === 1 ? cards : [{ type: 'vertical-stack', cards }];
      for (const mapping of mappings) {
        const prefix = `$.views[${viewIndex}].sections`, target = mapping.target;
        if (!target.startsWith(prefix)) continue;
        const match = target.slice(prefix.length).match(/^\[(\d+)\](?:\.cards\[(\d+)\](.*))?$/);
        if (!match) continue;
        if (match[2] === undefined) mapping.target = `$.views[${viewIndex}]`;
        else {
          const index = nativeSections.slice(0, Number(match[1])).reduce((count, section) => count + section.cards.length, 0) + Number(match[2]);
          mapping.target = `$.views[${viewIndex}].cards` + (cards.length === 1 ? `[${index}]` : `[0].cards[${index}]`) + match[3];
        }
      }
    }
    mark(`$.pages[${sourceIndex}]`, `$.views[${viewIndex}]`);
    return view;
  });
  let navbar;
  walk(legacy.compiled.views[0], value => { if (value?.type === 'custom:marao-navbar-card') navbar = value; });
  const settings = { version: 1, navbar: { routes: (navbar?.routes || []).map(route => { const next = { ...copy(route), path: route.url || route.path }; delete next.url; return next; }) } };
  for (const key of ['show_cache_reset', 'show_editor_button']) if (own(source, key)) settings[key] = source[key];
  const sourceText = input.sourceText || (input.kind === 'source' ? text : JSON.stringify(input.document));
  const origin = { version: ORDINARY_MIGRATION_VERSION, source_kind: input.kind, source_version: legacy.fromVersion,
    original_source: sourceText, original_document: copy(input.document), supplements: copy(context.supplements || []),
    yaml: originals, accounting: [...accounting, ...mappings] };
  settings.migration = compactMigrationProvenance(origin);
  validateDashboardSettings(settings);
  const envelopeExtras = input.kind === 'strategy' ? copy(input.document) : {};
  delete envelopeExtras.strategy;
  const document = { ...envelopeExtras, title: legacy.compiled.title, views, marao: settings };
  const rewrite = (value, path = '$') => typeof value === 'string' ? rewriteOwnedAssets(value, path, context.assetBaseURL, undefined, { stable: true })
    : Array.isArray(value) ? value.map((child, index) => rewrite(child, `${path}[${index}]`))
    : object(value) ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === 'migration' && path === '$.marao' ? child : rewrite(child, `${path}.${key}`)])) : value;
  const proposed = rewrite(document);
  validateOrdinaryDocument(proposed);
  return { kind: input.kind, changed: true, document: proposed, originalText: text, originalDocument: copy(input.document), sourceText,
    source, fromVersion: legacy.fromVersion, root, privacy: legacy.privacy, accounting: origin.accounting, assumptions: legacy.assumptions, supplements: copy(context.supplements || []) };
}

// Only authoring and recovery entry points call this. Ordinary startup uses
// HA's native views and never opens or validates a separate archive.
export async function prepareArchivedConversion(text, context = {}) {
  const result = convertOrdinaryDocument(text, context);
  // Preserve the exact stored v1 or v2 record when detaching an existing
  // ordinary dashboard, including older records eligible for compaction.
  const native = result.kind === 'ordinary' ? result.originalDocument : result.document;
  const { document, archive } = await detachMigrationProvenance(native);
  if (!archive) return { ...result, archive: null };
  if (result.kind !== 'ordinary') return { ...result, document, archive };
  if (!isRoot(context.dashboardRoot)) fail('dashboard_root_needed');
  const origin = expandMigrationProvenance(archive.record);
  return { ...result, changed: true, document, archive, root: context.dashboardRoot, fromVersion: origin.source_version,
    sourceText: origin.original_source, supplements: origin.supplements, accounting: origin.accounting };
}

export async function createRecoveryExport(result, { packageVersion = '', originalDocument = result.originalDocument, root = result.root } = {}) {
  if (!result.changed || !isRoot(root) || typeof result.originalText !== 'string' || !object(originalDocument)) fail('native_recovery_missing');
  const detached = result.document?.marao?.migration?.version === 3;
  if (detached) await readMigrationArchive(result.document.marao.migration, result.archive);
  const record = { kind: 'marao-native-conversion', version: detached ? 2 : 1, root, original_text: result.originalText, original_document: copy(originalDocument),
    source_text: result.sourceText, supplements: copy(result.supplements || []), proposed_document: copy(result.document),
    manifest: { source_version: result.fromVersion, native_authoring_version: 1, package_version: packageVersion } };
  if (detached) record.migration_archive = copy(result.archive);
  record.sha256 = await recoveryHashes(record);
  return record;
}

async function recoveryHashes(record) {
  const fields = ['original_text', 'original_document', 'source_text', 'supplements', 'proposed_document', 'manifest', 'root'];
  if (record.version === 2) fields.push('migration_archive');
  return Object.fromEntries(await Promise.all(fields.map(async key => [key,
    await sha256(typeof record[key] === 'string' ? record[key] : canonicalDocument(record[key]))])));
}

export async function validateRecoveryExport(record) {
  if (!object(record) || record.kind !== 'marao-native-conversion' || ![1, 2].includes(record.version) || !isRoot(record.root) || typeof record.original_text !== 'string' || typeof record.source_text !== 'string' || !object(record.original_document) || !Array.isArray(record.supplements) || !object(record.manifest) || record.manifest.native_authoring_version !== 1 || typeof record.manifest.package_version !== 'string' || !object(record.sha256)) fail('native_recovery_invalid');
  validateOrdinaryDocument(record.proposed_document);
  const reference = record.proposed_document.marao?.migration;
  if (record.version === 2) await readMigrationArchive(reference, record.migration_archive);
  else if (reference?.version === 3) fail('native_recovery_missing');
  const hashes = await recoveryHashes(record);
  if (canonicalDocument(hashes) !== canonicalDocument(record.sha256)) fail('native_recovery_changed');
  return record;
}

export function classifyRecovery(current, record) {
  if (!object(record?.original_document) || !object(record?.proposed_document)) fail('native_recovery_invalid');
  const value = canonicalDocument(current);
  if (value === canonicalDocument(record.original_document)) return 'original';
  const proposed = record.proposed_document;
  if (value === canonicalDocument(proposed)) return 'converted';
  // An older recovery export can still recognize its exact converted dashboard
  // after the one-time compaction of its migration record.
  if (current?.marao?.migration?.version === 2 && proposed.marao?.migration?.version === 1) {
    const migration = compactMigrationProvenance(proposed.marao.migration);
    if (value === canonicalDocument({...proposed, marao:{...proposed.marao, migration}})) return 'converted';
  }
  const reference = current?.marao?.migration, embedded = proposed.marao?.migration;
  if (reference?.version === 3 && [1, 2].includes(embedded?.version)
    && value === canonicalDocument({...proposed, marao:{...proposed.marao, migration:reference}})) {
    if (matchesEmbeddedOrigin(reference, embedded)) return 'converted';
    // An older receipt may predate both compaction and detachment.
    const compact = compactMigrationProvenance(embedded);
    if (compact !== embedded && matchesEmbeddedOrigin(reference, compact)) return 'converted';
  }
  return 'divergent';
}
