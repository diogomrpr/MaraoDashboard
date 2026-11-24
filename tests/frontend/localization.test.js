import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../../custom_components/marao_dashboard/frontend/marao-catalog.json' with { type: 'json' };
import generatorLabels from '../../custom_components/marao_dashboard/frontend/marao-generator-labels.json' with { type: 'json' };
import { formatLocale, languageCode } from '../../custom_components/marao_dashboard/frontend/MaraoLocale.js';
import { navigationLocalize } from '../../custom_components/marao_dashboard/frontend/MaraoNavigation.js';
import { eventWord, normalizeEventSources } from '../../custom_components/marao_dashboard/frontend/MaraoEventModel.js';
import { weatherMarkup } from '../../custom_components/marao_dashboard/frontend/MaraoWeather.js';
import { editorLabel, PT_LABELS } from '../../frontend_src/editor-labels.js';
import { scheduleLabel } from '../../frontend_src/schedule-text.js';

const portuguese = { locale: { language: 'pt-PT' } };
const english = { language: 'en-GB' };

test('card text follows HA language and regionless Portuguese formatting uses Portugal', () => {
  assert.equal(languageCode({ ...portuguese, language: 'en-GB' }), 'en');
  assert.equal(languageCode('PT_pt'), 'pt');
  assert.equal(formatLocale({ language: 'pt' }), 'pt-PT');
  assert.equal(formatLocale({ language: 'en', locale: { language: 'pt_BR' } }), 'pt-BR');
  assert.equal(navigationLocalize('navigation.more', portuguese), 'Mais destinos');
  assert.equal(navigationLocalize('navigation.more', { language: 'fr-FR' }), 'More destinations');
  assert.equal(eventWord('camera', portuguese), 'Câmara');
  assert.throws(() => normalizeEventSources({ columns: 0 }, portuguese), /número inteiro positivo/);
  assert.equal(scheduleLabel('mon', portuguese), 'Seg');
  assert.equal(scheduleLabel('mon', english), 'Mon');

  const state = { state: 'sunny', attributes: { temperature: 21, temperature_unit: '°C' } };
  const name = 'Meu jardim';
  for (const [hass, expected] of [[english, 'Forecast'], [portuguese, 'Previsão']]) {
    const markup = weatherMarkup({ hass, state, name, showForecast: true });
    assert.match(markup, new RegExp(expected));
    assert.match(markup, new RegExp(name));
  }
});

test('native card names, descriptions and configured field captions have Portuguese translations', () => {
  const labelFields = new Set(['name', 'label', 'description', 'hint', 'help', 'title']);
  function check(value, owner) {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (labelFields.has(key) && typeof item === 'string' && /[a-z]{2}/i.test(item)) {
        if (item === 'Sensor') assert.equal(PT_LABELS[item], item);
        else assert.notEqual(editorLabel(item, portuguese), item, `${owner}: ${item}`);
      } else if (key !== 'default') check(item, owner);
    }
  }
  for (const card of catalog.cards) check(card, card.id);
  check(catalog.common_variables, 'common fields');
  assert.deepEqual(Object.keys(generatorLabels.pt).sort(), Object.keys(generatorLabels.en).sort());
});
