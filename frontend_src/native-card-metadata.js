import {languageCode} from '../custom_components/marao_dashboard/frontend/MaraoLocale.js';
import {nativeCardPortuguese} from './native-card-data.js';
import {cardText, refreshCardMetadata} from './native-card-language.js';
export {refreshCardMetadata};

export function nativeCardLabel(label, hass) {
  return languageCode(hass) === 'pt' && Object.hasOwn(nativeCardPortuguese, label) ? nativeCardPortuguese[label] : label;
}

export function registerCardMetadata(picker, registration, label, description = label) {
  if (picker.some(card => card.type === registration.type)) return;
  // The registering bundle supplies the translations. The host also refreshes
  // picker entries on dashboards with no mounted Marao cards.
  Object.defineProperty(registration, cardText, {value:{label, description, translate:nativeCardLabel}});
  picker.push(registration);
  refreshCardMetadata(undefined, [registration]);
}

/** HA's two ordered pools are authoritative; never discover another target. */
export function nativeCandidates(hass, entities = [], entitiesFallback = []) {
  return [...new Set([...entities, ...entitiesFallback].map(entity => typeof entity === 'string' ? entity : entity?.entity_id))]
    .filter(id => id && hass?.states?.[id] && !['unknown', 'unavailable'].includes(hass.states[id].state));
}
export function cameraEventsStub(hass, entities, entitiesFallback) {
  const entity = nativeCandidates(hass, entities, entitiesFallback).find(id => id.startsWith('camera.'));
  return {type:'custom:marao-camera-events-card', cameras:entity ? [{entity}] : []};
}
