// Released names are input aliases; new owned configuration uses md_.
export const legacyTemplates = Object.freeze({"hc_access_action_card": "md_access_action_card", "hc_access_card": "md_access_card", "hc_access_hold_action_card": "md_access_hold_action_card", "hc_access_slide_action_card": "md_access_slide_action_card", "hc_alarm_controls_card": "md_alarm_controls_card", "hc_base_card": "md_base_card", "hc_battery_card": "md_battery_card", "hc_camera_card": "md_camera_card", "hc_climate_card": "md_climate_card", "hc_cover_card": "md_cover_card", "hc_dishwasher_card": "md_dishwasher_card", "hc_energy_period_card": "md_energy_period_card", "hc_entity_group_card": "md_entity_group_card", "hc_fan_card": "md_fan_card", "hc_glance_card": "md_glance_card", "hc_graph_card": "md_graph_card", "hc_header_card": "md_header_card", "hc_light_card": "md_light_card", "hc_media_app_card": "md_media_app_card", "hc_media_card": "md_media_card", "hc_navbar_card": "md_navbar_card", "hc_navigation_card": "md_navigation_card", "hc_number_card": "md_number_card", "hc_popup_card": "md_popup_card", "hc_room_card": "md_room_card", "hc_scene_card": "md_scene_card", "hc_scene_collection_card": "md_scene_collection_card", "hc_security_card": "md_security_card", "hc_sensor_card": "md_sensor_card", "hc_switch_card": "md_switch_card", "hc_timeline_card": "md_timeline_card", "hc_title_card": "md_title_card", "hc_toggle_graph_card": "md_toggle_graph_card", "hc_vacuum_card": "md_vacuum_card", "hc_wallbox_current_card": "md_wallbox_current_card", "hc_washing_machine_card": "md_washing_machine_card", "hc_weather_card": "md_weather_card"});
export const legacyOptions = Object.freeze({"hc_background_color": "md_background_color", "hc_card_color": "md_card_color", "hc_color": "md_color", "hc_icon_color": "md_icon_color", "hc_label_prefix": "md_label_prefix", "hc_show_background_art": "md_show_background_art", "hc_security_code": "md_security_code"});

export const canonicalTemplate = value => typeof value === 'string' && Object.hasOwn(legacyTemplates, value) ? legacyTemplates[value] : value;
export function canonicalOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) return options;
  let result;
  for (const [legacy, current] of Object.entries(legacyOptions)) {
    if (!Object.hasOwn(options, legacy)) continue;
    if (Object.hasOwn(options, current) && JSON.stringify(options[current]) !== JSON.stringify(options[legacy])) throw new Error('Conflicting legacy and md card options.');
    result ||= { ...options };
    result[current] = options[legacy]; delete result[legacy];
  }
  return result || options;
}
export function canonicalCard(card) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return card;
  const role = card.template;
  if (role !== undefined && !Object.values(legacyTemplates).includes(canonicalTemplate(role))) return card;
  if (card.type && !card.type.startsWith('custom:marao-')) return card;
  const template = canonicalTemplate(role), variables = canonicalOptions(card.variables);
  if (template === role && variables === card.variables) return card;
  return { ...card, ...(role !== undefined ? { template } : {}), ...(Object.hasOwn(card, 'variables') ? { variables } : {}) };
}
