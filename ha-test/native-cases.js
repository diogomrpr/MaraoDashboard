// Native examples reuse canonical safe bindings; never ship these fixtures.
const fs = require('node:fs');
const path = require('node:path');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../custom_components/marao_dashboard/frontend/MaraoNativeCatalog.js'), 'utf8').replace(/^export const catalog = /, '').trim().replace(/;$/, ''));

function nativeCases(view, manifest, walk) {
  const candidates = [];
  walk(view, card => candidates.push(card));
  const cards = [];
  for (const spec of catalog.cards.filter(card => !card.runtime_type)) {
    let example = candidates.find(card => (card.template === spec.id || spec.legacy_type === card.type) && (!card.entity || card.entity.includes('.marao_dashboard_test_')));
    if (spec.id === 'hc_entity_group_card') example = manifest.entityGroupCases.find(card => card.entity_type === 'light');
    if (spec.id === 'hc_scene_collection_card') example = manifest.editablePageCases.find(card => card.template === spec.id && card.entities.length);
    if (!example) throw new Error('Missing safe native example: ' + spec.id);
    const card = structuredClone(example);
    card.type = spec.type;
    card.name = 'Native ' + spec.label;
    delete card.template; delete card.id;
    if (card.entity_id) { card.entity = card.entity_id; delete card.entity_id; }
    if (card.variables) { delete card.variables.popup_hash; delete card.variables.mode_selector_hash; }
    if (spec.id === 'hc_security_card') {
      delete card.variables?.hc_security_code;
      // The old gallery's state-only alarm deliberately has no tap action.
      // The native example exercises the new card's default owned detail sheet.
      delete card.tap_action;
    }
    if (spec.id === 'hc_energy_period_card') {
      card.variables = { ...card.variables, period: card.period || 'day' };
      delete card.popup; delete card.popup_hash;
    }
    if (card.tap_action?.navigation_path?.startsWith('#') || spec.id === 'hc_access_action_card') delete card.tap_action;
    if (spec.id === 'hc_camera_card') Object.assign(card.variables ||= {}, { event_provider: 'frigate', frigate_camera: 'marao_test', frigate_instance_id: 'marao_test' });
    cards.push(card);
  }
  const media = cards.find(card => card.type === 'custom:marao-native-media-card');
  if (media) cards.push({ ...structuredClone(media), name: 'Native media duplicate', apple_tv: false });
  cards.push({ type: 'custom:marao-native-entity-group-card', name: 'Native empty group', entity_type: 'light', entities: [] });
  cards.push({ type: 'custom:marao-native-light-card', name: 'Native unavailable light', entity: 'light.marao_dashboard_test_case_light_unavailable' });
  return cards;
}

module.exports = { nativeCases };
