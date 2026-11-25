import {languageCode} from '../custom_components/marao_dashboard/frontend/MaraoLocale.js';

// Bootstrap and the card registrations are built separately.
export const cardText = Symbol.for('Marao.nativeCardText');

export function refreshCardMetadata(hass, picker = globalThis.window?.customCards || []) {
  const language = languageCode(hass);
  for (const card of picker) {
    const text = card[cardText];
    if (!text?.translate || text.language === language) continue;
    text.language = language;
    card.name = `Marao ${text.translate(text.label, {language})}`;
    card.description = text.translate(text.description, {language});
  }
}
