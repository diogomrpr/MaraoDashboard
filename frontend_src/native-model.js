import { adaptNativeDashboard, formatVersion, migrateSource, runMigrationChain, SOURCE_MIGRATIONS, SOURCE_VERSION } from '../custom_components/marao_dashboard/frontend/MaraoSource.js';
import { validateSourceStructure } from './source-validation.js';
import { validateCardYaml } from './lovelace-model.js';

export { catalog } from './source-validation.js';

export function validateSource(source, entities = []) {
  validateSourceStructure(source, entities);
  validateCardYaml(source);
  return source;
}

export function normalizeSource(input, context = {}) {
  let source = input;
  if (formatVersion(source) === 0 && Object.hasOwn(source, 'title') && Object.hasOwn(source, 'views') && !Object.hasOwn(source, 'name')) source = adaptNativeDashboard(source, context);
  validateSource(source, context.entities);
  for (let version = formatVersion(source); version < SOURCE_VERSION; version++) {
    // Each adjacent boundary is validated before the next conversion can consume it.
    const candidate = runMigrationChain(source, context, SOURCE_MIGRATIONS.slice(0, version + 1), version + 1);
    validateSource(candidate, context.entities);
    source = candidate;
  }
  return validateSource(migrateSource(source, context), context.entities);
}
