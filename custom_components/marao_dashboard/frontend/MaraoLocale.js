function languageTag(value) {
  const fallback = globalThis.document?.documentElement?.lang || globalThis.navigator?.language || 'en';
  return (String(value || fallback).trim() || 'en').replaceAll('_', '-');
}

export function languageCode(hassOrLanguage) {
  const language = typeof hassOrLanguage === 'string'
    ? hassOrLanguage : hassOrLanguage?.language || hassOrLanguage?.locale?.language;
  return languageTag(language).split('-')[0].toLowerCase();
}

export function formatLocale(hass) {
  const tag = languageTag(hass?.locale?.language || hass?.language);
  return tag.toLowerCase() === 'pt' ? 'pt-PT' : tag;
}
