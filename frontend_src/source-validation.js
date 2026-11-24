import catalog from '../custom_components/marao_dashboard/frontend/marao-catalog.json' with { type: 'json' };
import {formatVersion} from '../custom_components/marao_dashboard/frontend/MaraoSource.js';
import {validateConfig} from './editor-model.js';

export {catalog};

export function validateSourceStructure(source, entities = []) {
  const errors = validateConfig(source, formatVersion(source), entities, catalog.energy_units, catalog);
  if (errors.length) throw new Error(errors.join('\n'));
}
