import catalog from '../custom_components/marao_dashboard/frontend/marao-catalog.json' with { type: 'json' };
import {formatVersion} from '../custom_components/marao_dashboard/frontend/MaraoSource.js';
import {validateConfig} from './editor-model.js';

export {catalog};

export function validateCatalogSource(source, entities, cardCatalog) {
  const errors = validateConfig(source, formatVersion(source), entities, cardCatalog.energy_units, cardCatalog);
  if (errors.length) throw new Error(errors.join('\n'));
}

export function validateSourceStructure(source, entities = []) {
  validateCatalogSource(source, entities, catalog);
}
