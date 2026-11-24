// The Node source and the build plugin use the same projection. Shipped
// ordinary cards need picker/stub fields and validation domains at registration.
import catalog from '../custom_components/marao_dashboard/frontend/marao-catalog.json' with {type:'json'};
import {editorLabel} from './editor-labels.js';

export const energyUnits = catalog.energy_units;
export const nativeCardEntries = /* @__PURE__ */ catalog.cards.map(card => {
  const {id, domains, entity_optional, device_classes, label, description, hidden} = card;
  const defaults = Object.fromEntries(card.variables.filter(field => Object.hasOwn(field, 'default'))
    .map(field => [field.key, field.default]));
  return {id, domains, label, ...(entity_optional ? {entity_optional} : {}),
    ...(device_classes?.length ? {device_classes} : {}), ...(description ? {description} : {}),
    ...(hidden ? {hidden} : {}), ...(Object.keys(defaults).length ? {defaults} : {})};
});
function pickerTranslations(entries) {
  const labels = new Set(['Camera Events', 'Browse explicitly selected camera events.',
    'Choose an entity in the card editor.', 'Choose an app source in the card editor.',
    'Upload a floor-plan image.', 'Choose a Plex server folder.', 'Loading Home Assistant cards…']);
  for (const {label, description} of entries) {
    labels.add(label);
    if (description) labels.add(description);
  }
  return Object.fromEntries([...labels].map(label => [label, editorLabel(label, 'pt')])
    .filter(([label, translation]) => label !== translation));
}
export const nativeCardPortuguese = /* @__PURE__ */ pickerTranslations(nativeCardEntries);
