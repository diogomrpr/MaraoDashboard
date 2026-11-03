"""Creation-only templates: editable descriptors, real bindings and omissions."""
from copy import deepcopy

import pytest

from custom_components.marao_dashboard.editor import EDITOR_CATALOG, page_templates
from custom_components.marao_dashboard.page_model import page_entries, page_sections, validate_pages


def test_media_creation_preserves_selected_remotes_apps_and_unknown_options_without_mutation():
    options = {"remote_entity": "remote.safe", "volume_remote_entity": "media_player.volume", "future": {"keep": True},
               "apps": [{"name": "Saved app", "source": "App; exact", "icon": "mdi:play", "logo": "netflix", "future": [2, 1]}]}
    source = {"config_version": 2, "pages": [{"name": "Media", "path": "media", "entities": [
        {"id": "tv", "entity_id": "media_player.safe", "template": "md_media_card", "name": "My TV", "apple_tv": options, "future": True},
    ]}]}
    before = deepcopy(source)
    snapshot = page_templates(source, [{"entity_id": "media_player.safe", "has_state": True, "name": "Live TV"}])["media"]
    player, app = snapshot["entities"]
    assert player["name"] == "My TV" and player["apple_tv"] == options and player["future"] is True
    assert app["template"] == "md_media_app_card" and app["variables"]["app_source"] == "App; exact"
    assert app["variables"]["app_logo"] == "netflix"
    assert app["future"] == [2, 1] and source == before
    options["apps"].clear()
    assert len(snapshot["entities"]) == 2


def test_media_logo_retained_view_popup_and_catalog_preserve_optional_choices():
    import json
    from pathlib import Path
    from custom_components.marao_dashboard.generator import _media_view, _media_popup

    catalog = json.loads((Path(__file__).parents[3] / "custom_components/marao_dashboard/frontend/marao-catalog.json").read_text())
    expected = next(card for card in EDITOR_CATALOG["cards"] if card["id"] == "md_media_app_card")
    assert next(card for card in catalog["cards"] if card["id"] == expected["id"]) == expected
    for extra, variables in [({}, {"app_source": "Custom TV app"}), ({"logo": "netflix"}, {"app_source": "Custom TV app", "app_logo": "netflix"}), ({"logo": ""}, {"app_source": "Custom TV app", "app_logo": ""})]:
        player = {"entity_id": "media_player.safe", "name": "TV", "apple_tv": {"apps": [{"name": "Custom", "source": "Custom TV app", "icon": "mdi:television", **extra}]}}
        before = deepcopy(player)
        popup = _media_popup(player)
        view = _media_view({"rooms": [], "pages": {"media": {"players": [player]}}}, "/marao-dashboard")
        def apps(value):
            if isinstance(value, dict):
                return ([value] if value.get("template") == "md_media_app_card" else []) + [item for child in value.values() for item in apps(child)]
            return [item for child in value for item in apps(child)] if isinstance(value, list) else []
        for result in [popup, view]:
            app = apps(result)[0]
            assert app["variables"] == variables
            assert (app["entity"], app["name"], app["icon"]) == ("media_player.safe", "Custom", "mdi:television")
        assert player == before


def test_media_logo_legacy_conversion_keeps_opt_in_without_inserting_defaults():
    from custom_components.marao_dashboard.page_migration import convert_legacy_pages
    legacy = {"config_version": 1, "name": "Safe", "rooms": [], "pages": {"media": {"players": [{"entity_id": "media_player.safe", "apple_tv": {"apps": [{"source": "Custom TV app", "logo": "netflix", "future": []}, {"source": "MEO Go"}]}}]}}}
    before = deepcopy(legacy)
    result = convert_legacy_pages(legacy)
    media = next(page for page in result["pages"] if page["path"] == "media")
    apps = [card for section in media["sections"] for card in section["entities"] if card.get("template") == "md_media_app_card"]
    assert [app["variables"] for app in apps] == [{"app_source": "Custom TV app", "app_logo": "netflix"}, {"app_source": "MEO Go"}]
    assert apps[0]["future"] == [] and legacy == before


def test_security_creation_uses_real_strict_access_and_hold_actions():
    from custom_components.marao_dashboard.generator import _resolve_pages, _page_card

    entities = [{"entity_id": "alarm_control_panel.safe", "has_state": True},
                {"entity_id": "cover.safe_gate", "device_class": "gate", "supported_features": 1, "has_state": True},
                {"entity_id": "lock.safe", "has_state": True}, {"entity_id": "button.safe", "has_state": True}]
    snapshot = page_templates({}, entities)["security"]
    assert [card["template"] for card in snapshot["entities"]] == ["md_security_card", "md_access_card", "md_access_card", "md_access_hold_action_card"]
    config = {"config_version": 2, "name": "Safe", "landing_page": "security", "pages": [{**snapshot, "name": "Security", "path": "security"}]}
    cards = _resolve_pages(config, entities)["pages"][0]["_sections"][0]["ordered_cards"]
    assert _page_card(cards[1], "marao-dashboard")["template"] == "md_access_slide_action_card"
    assert _page_card(cards[3], "marao-dashboard")["tap_action"]["perform_action"] == "button.press"


def test_all_eight_templates_are_plain_containers_with_no_synthetic_bindings():
    templates = page_templates({"config_version": 2, "pages": []}, [])
    assert set(templates) == {"empty", "home", "rooms", "room", "security", "energy", "wallbox", "media"}
    assert templates["home"]["sections"] == []
    assert templates["rooms"]["entities"] == templates["empty"]["entities"] == []
    for template in templates.values():
        for section in page_sections(template):
            for card in page_entries(section.get("entities")):
                assert "entity_id" not in card
    assert templates["room"]["sections"][0]["entities"][0]["template"] == "md_title_card"
    assert templates["room"]["sections"][1]["entities"] == []


@pytest.mark.parametrize("name", ["security", "energy", "wallbox", "media"])
def test_required_template_drafts_require_binding_or_explicit_removal(name):
    template = page_templates({"pages": []}, [])[name]
    config = {"config_version": 2, "name": "Safe", "landing_page": "home", "pages": [{**template, "name": name, "path": "home"}]}
    templates = {item["id"]: item["domains"] for item in EDITOR_CATALOG["cards"]}
    with pytest.raises(ValueError, match="bind or remove"):
        validate_pages(config, templates)
    config["pages"][0]["entities"] = []
    assert validate_pages(config, templates) == {"home"}


def test_snapshot_templates_use_explicit_room_targets_and_current_available_optional_roles():
    config = {"config_version": 2, "pages": [{"name": "Office", "path": "office", "area": "safe", "sections": [
        {"entities": ["light.safe", {"template": "md_entity_group_card", "entity_type": "light", "entities": ["light.grouped"]}]},
    ]}]}
    entities = [
        {"entity_id": "weather.safe", "has_state": True}, {"entity_id": "scene.safe", "has_state": True},
        {"entity_id": "light.safe", "has_state": True}, {"entity_id": "sensor.safe_power", "has_state": True, "device_class": "power"},
        {"entity_id": "sensor.safe_month_energy", "has_state": True, "device_class": "energy"},
        {"entity_id": "sensor.safe_wallbox_status", "has_state": True}, {"entity_id": "number.safe_wallbox_current", "has_state": True},
        {"entity_id": "alarm_control_panel.safe", "has_state": True}, {"entity_id": "media_player.safe", "has_state": True, "name": "Player"},
        {"entity_id": "light.hidden", "has_state": True, "hidden_by": "user"},
        {"entity_id": "sensor.missing", "has_state": False, "device_class": "power"},
    ]
    before = deepcopy((config, entities))
    snapshots = page_templates(config, entities)
    assert (config, entities) == before
    shortcut = snapshots["rooms"]["entities"][0]
    assert shortcut["page"] == "office" and shortcut["variables"]["light_entities"] == ["light.safe", "light.grouped"]
    home = [card for section in snapshots["home"]["sections"] for card in section["entities"]]
    assert [card["template"] for card in home] == ["md_weather_card", "md_entity_group_card", "md_scene_collection_card"]
    assert home[1]["entities"] == ["light.safe"] and home[2]["entities"] == ["scene.safe"]
    assert [card["entity_id"] for card in snapshots["energy"]["entities"]] == ["sensor.safe_power", "sensor.safe_month_energy"]
    assert [card["entity_id"] for card in snapshots["wallbox"]["entities"]] == ["sensor.safe_wallbox_status", "number.safe_wallbox_current"]
    assert snapshots["security"]["entities"][0]["entity_id"] == "alarm_control_panel.safe"
    assert snapshots["media"]["entities"][0]["entity_id"] == "media_player.safe"
    for snapshot in snapshots.values():
        candidate = {"config_version": 2, "name": "Safe", "landing_page": "created", "pages": [{**snapshot, "name": "Created", "path": "created"}, {"name": "Office", "path": "office"}]}
        if "sections" in candidate["pages"][0]:
            for index, section in enumerate(candidate["pages"][0]["sections"]):
                for position, card in enumerate(section["entities"]):
                    card.setdefault("id", f"card-{index}-{position}")
        assert validate_pages(candidate, {item["id"]: item["domains"] for item in EDITOR_CATALOG["cards"]}) == {"created", "office"}
    snapshots["energy"]["entities"].clear()
    assert config == before[0] and entities == before[1]
