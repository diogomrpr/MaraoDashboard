"""Read-only compatibility for released owned identifiers."""

LEGACY_TEMPLATES = {'hc_access_action_card': 'md_access_action_card', 'hc_access_card': 'md_access_card', 'hc_access_hold_action_card': 'md_access_hold_action_card', 'hc_access_slide_action_card': 'md_access_slide_action_card', 'hc_alarm_controls_card': 'md_alarm_controls_card', 'hc_base_card': 'md_base_card', 'hc_battery_card': 'md_battery_card', 'hc_camera_card': 'md_camera_card', 'hc_climate_card': 'md_climate_card', 'hc_cover_card': 'md_cover_card', 'hc_dishwasher_card': 'md_dishwasher_card', 'hc_energy_period_card': 'md_energy_period_card', 'hc_entity_group_card': 'md_entity_group_card', 'hc_fan_card': 'md_fan_card', 'hc_glance_card': 'md_glance_card', 'hc_graph_card': 'md_graph_card', 'hc_header_card': 'md_header_card', 'hc_light_card': 'md_light_card', 'hc_media_app_card': 'md_media_app_card', 'hc_media_card': 'md_media_card', 'hc_navbar_card': 'md_navbar_card', 'hc_navigation_card': 'md_navigation_card', 'hc_number_card': 'md_number_card', 'hc_popup_card': 'md_popup_card', 'hc_room_card': 'md_room_card', 'hc_scene_card': 'md_scene_card', 'hc_scene_collection_card': 'md_scene_collection_card', 'hc_security_card': 'md_security_card', 'hc_sensor_card': 'md_sensor_card', 'hc_switch_card': 'md_switch_card', 'hc_timeline_card': 'md_timeline_card', 'hc_title_card': 'md_title_card', 'hc_toggle_graph_card': 'md_toggle_graph_card', 'hc_vacuum_card': 'md_vacuum_card', 'hc_wallbox_current_card': 'md_wallbox_current_card', 'hc_washing_machine_card': 'md_washing_machine_card', 'hc_weather_card': 'md_weather_card'}
LEGACY_OPTIONS = {'hc_background_color': 'md_background_color', 'hc_card_color': 'md_card_color', 'hc_color': 'md_color', 'hc_icon_color': 'md_icon_color', 'hc_label_prefix': 'md_label_prefix', 'hc_show_background_art': 'md_show_background_art', 'hc_security_code': 'md_security_code'}


def canonical_template(value):
    return LEGACY_TEMPLATES.get(value, value) if isinstance(value, str) else value


def canonical_options(options):
    if not isinstance(options, dict):
        return options
    result = None
    for legacy, current in LEGACY_OPTIONS.items():
        if legacy not in options:
            continue
        if current in options and (type(options[current]) is not type(options[legacy]) or options[current] != options[legacy]):
            raise ValueError("Conflicting legacy and md card options.")
        if result is None:
            result = dict(options)
        result[current] = options[legacy]
        del result[legacy]
    return options if result is None else result


def canonical_card(card):
    if not isinstance(card, dict):
        return card
    role = card.get("template")
    if role is not None and canonical_template(role) not in LEGACY_TEMPLATES.values():
        return card
    if card.get("type") and not str(card["type"]).startswith("custom:marao-"):
        return card
    template = canonical_template(role)
    options = canonical_options(card.get("variables"))
    if template == role and options is card.get("variables"):
        return card
    return {**card, **({"template": template} if role is not None else {}),
            **({"variables": options} if "variables" in card else {})}


def canonical_entities(spec):
    """Canonicalize an owned entity container, never arbitrary nested payloads."""
    if isinstance(spec, list):
        return [canonical_entities(item) for item in spec]
    if isinstance(spec, dict):
        if any(key in spec for key in ("entity_id", "page", "template")):
            result = canonical_card(spec)
            if result.get("template") in ("md_entity_group_card", "md_scene_collection_card") and "entities" in result:
                result = {**result, "entities": canonical_entities(result["entities"])}
            return result
        return {key: canonical_entities(value) for key, value in spec.items()}
    return spec


def canonical_owned_card_tree(card):
    """Visit owned cards and standard card containers, leaving custom payloads opaque."""
    if not isinstance(card, dict):
        return card
    kind = card.get("type")
    containers = {"vertical-stack", "horizontal-stack", "grid", "conditional",
                  "custom:marao-control-grid", "custom:marao-popup-card", "custom:marao-native-popup-card"}
    if kind not in containers and not (isinstance(kind, str) and kind.startswith("custom:marao-")):
        return card
    result = dict(canonical_card(card))
    if kind in containers:
        if isinstance(result.get("cards"), list):
            result["cards"] = [canonical_owned_card_tree(child) for child in result["cards"]]
        if kind == "conditional" and isinstance(result.get("card"), dict):
            result["card"] = canonical_owned_card_tree(result["card"])
    if result.get("template") in ("md_entity_group_card", "md_scene_collection_card") or kind in (
        "custom:marao-native-entity-group-card", "custom:marao-native-scene-collection-card",
    ):
        if "entities" in result:
            result["entities"] = canonical_entities(result["entities"])
    return result


def migrate_card_namespace_v1(config):
    """Upgrade active owned names in a validated private format-2 document."""
    from .page_model import page_sections

    for page in config["pages"]:
        for section in page_sections(page):
            if "entities" in section:
                section["entities"] = canonical_entities(section["entities"])
            if "cards" in section:
                section["cards"] = [canonical_owned_card_tree(card) for card in section["cards"]]
    return config
