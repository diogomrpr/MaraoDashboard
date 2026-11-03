import {editorLabel} from './editor-labels.js';

// Symbol.for also identifies our entries across the separately bundled native hosts.
const owner = Symbol.for('Marao.nativeCardText');
export function registerCardMetadata(picker, registration, label, description = label) {
  if (picker.some(card => card.type === registration.type)) return;
  Object.defineProperty(registration, owner, {value:{label, description}});
  picker.push(registration);
  refreshCardMetadata(undefined, [registration]);
}
export function refreshCardMetadata(hass, picker = globalThis.window?.customCards || []) {
  const language = hass?.locale?.language || hass?.language || globalThis.navigator?.language || 'en';
  for (const card of picker) {
    const text = card[owner];
    if (!text || text.language === language) continue;
    text.language = language;
    card.name = `Marao ${editorLabel(text.label, {language})}`;
    card.description = editorLabel(text.description, {language});
  }
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
