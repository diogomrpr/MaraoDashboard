"""Common card/section composition and page-local popup identity checks."""
from copy import deepcopy
import json
from pathlib import Path

import pytest

from custom_components.marao_dashboard import generator as g

SOURCE = json.loads((Path(__file__).parents[2] / "frontend/canonical-pages.fixture.json").read_text())


@pytest.mark.parametrize("version", [0, 1, 2])
@pytest.mark.parametrize("setting", [None, False, True])
def test_cache_reset_option_preserves_legacy_defaults_and_explicit_choices(version, setting):
    source = {"name": "Safe", "rooms": [], "future": {"keep": []}}
    if version == 1:
        source["config_version"] = 1
    elif version == 2:
        source = {**deepcopy(SOURCE), "future": {"keep": []}}
    if setting is not None:
        source["show_cache_reset"] = setting
    original = deepcopy(source)
    normalized = g.normalize_config(source)
    navbar = g._navigation_bar(normalized, "marao-dashboard")["cards"][0]
    if setting is None:
        assert "show_cache_reset" not in navbar
        assert "show_cache_reset" not in normalized
    else:
        assert navbar["show_cache_reset"] is setting
    assert normalized["future"] == {"keep": []}
    assert source == original
    for invalid in ("false", None, 0, []):
        with pytest.raises(ValueError, match="must be a boolean"):
            g.normalize_config({**source, "show_cache_reset": invalid})


@pytest.mark.parametrize("members", [[], [
    {"entity_id": "sensor.heating_energy", "name": "Heating", "cost_entity": "sensor.heating_cost", "future": []},
    {"entity_id": "sensor.lighting_energy", "name": ""},
]])
def test_energy_breakdown_and_tariff_survive_page_and_native_generation(members):
    from custom_components.marao_dashboard.native import compile_card

    options = {"period": "month", "calculate_cost": True, "cost_per_kwh": 0, "sub_entities": members, "future": {"keep": []}}
    descriptor = {"template": "hc_energy_period_card", "entity_id": "sensor.energy", "variables": options}
    source = {"config_version": 2, "name": "Energy", "landing_page": "energy", "pages": [{"name": "Energy", "path": "energy", "entities": [descriptor]}]}
    original = deepcopy(source)
    registry = [{"entity_id": "sensor.energy", "unit_of_measurement": "kWh"}, {"entity_id": "sensor.heating_energy", "unit_of_measurement": "Wh"},
                {"entity_id": "sensor.heating_cost", "unit_of_measurement": "EUR"}]
    item = g._resolve_pages(source, registry)["pages"][0]["_sections"][0]["ordered_cards"][0]
    native = compile_card({"type": "custom:marao-native-energy-period-card", "entity": "sensor.energy", "variables": options}, "energy", "marao-dashboard", registry)
    for card in [g._page_card(item, "marao-dashboard"), g._page_card_popups(item)[0]["cards"][0], native["card"], native["popups"][0]["cards"][0]]:
        assert card["sub_entities"] == members
        assert card["calculate_cost"] is True
        assert card["cost_per_kwh"] == 0
    for popup in [g._page_card_popups(item)[0], native["popups"][0]]:
        assert popup["height"] == "auto"
        assert popup["max_height"] == "100%"
    assert source == original
    assert native["card"]["variables"]["future"] == {"keep": []}
    legacy = {"entity_id": "sensor.energy"}
    assert "sub_entities" not in g._energy_period_card(legacy, "Energy", "day", "mdi:flash", None)


@pytest.mark.parametrize("metadata,message", [
    ({"entity_id": "sensor.load", "unit_of_measurement": "W"}, "require energy sensors"),
    ({"entity_id": "sensor.cost", "unit_of_measurement": "kWh"}, "requires monetary sensors"),
])
def test_energy_breakdown_rejects_known_incompatible_metadata_without_rewriting(metadata, message):
    source = {"config_version": 2, "name": "Energy", "landing_page": "energy", "pages": [{"name": "Energy", "path": "energy", "entities": [
        {"template": "hc_energy_period_card", "entity_id": "sensor.total", "variables": {"sub_entities": [{"entity_id": "sensor.load", "cost_entity": "sensor.cost"}]}},
    ]}]}
    original = deepcopy(source)
    with pytest.raises(ValueError, match=message):
        g._resolve_pages(source, [metadata])
    g._resolve_pages(source, [metadata], validate_source_units=False)
    assert source == original


@pytest.mark.parametrize("role", ["hc_navigation_card", "hc_room_card"])
def test_entity_free_shortcuts_preserve_explicit_routes_names_and_options(tmp_path, role):
    source = {"config_version": 2, "name": "Shortcuts", "landing_page": "home", "pages": [
        {"name": "Home", "path": "home", "entities": [{"template": role, "name": "Saved shortcut", "icon": "mdi:desk", "show_state": False,
          "tap_action": {"action": "navigate", "navigation_path": "/marao-dashboard/unpinned"}, "variables": {"light_entities": []}}]},
        {"name": "Unpinned", "path": "unpinned", "entities": []},
    ]}
    generated = g.write_dashboard(source, tmp_path, dashboard_key_override="marao-dashboard")
    text = (tmp_path / generated.slug / "views/pages/home.yaml").read_text()
    assert "name: Saved shortcut" in text and "icon: mdi:desk" in text
    assert "navigation_path: /marao-dashboard/unpinned" in text and "light_entities: []" in text
    assert "entity:" not in text and "template: " + role in text


def test_media_app_buttons_do_not_inherit_media_popup_routes():
    source = {"config_version": 2, "name": "Apps", "landing_page": "home", "pages": [
        {"name": "Home", "path": "home", "entities": [
            {"entity_id": "media_player.safe", "template": "hc_media_app_card", "name": "YouTube", "variables": {"app_source": "YouTube"}},
        ]},
    ]}
    entry = g._resolve_pages(source)["pages"][0]["_sections"][0]["ordered_cards"][0]
    card = g._page_card(entry, "marao-dashboard")
    assert card["variables"] == {"app_source": "YouTube"}
    assert g._page_card_popups(entry) == []


def test_popup_rename_and_card_delete_clean_owned_files_and_retain_protected_yaml(tmp_path):
    source = {"config_version": 2, "name": "Owned", "landing_page": "home", "pages": [
        {"id": "home", "name": "Home", "path": "home", "entities": [{"id": "tv", "template": "hc_media_card", "entity_id": "media_player.safe", "apple_tv": False}]},
    ]}
    generated = g.write_dashboard(source, tmp_path)
    root = tmp_path / generated.slug
    old = root / "components/popups/page-home-tv-popup.yaml"
    exact_custom = "  - type: markdown\n    content: Keep this protected note\n"
    old.write_text(old.read_text().replace("  # marao:custom:start\n", "  # marao:custom:start\n" + exact_custom))
    source["pages"][0]["path"] = source["landing_page"] = "renamed"
    g.write_dashboard(source, tmp_path)
    assert exact_custom in old.read_text() and "template: hc_media_card" not in old.read_text()
    current = root / "components/popups/page-renamed-tv-popup.yaml"
    assert current.exists()
    source["pages"][0]["entities"] = []
    g.write_dashboard(source, tmp_path)
    assert not current.exists() and exact_custom in old.read_text()
    view = (root / "views/pages/home.yaml").read_text()
    assert "path: renamed" in view and view.count("components/navigation/navbar.yaml") == 1


def test_missing_owned_popup_reference_and_implicit_identity_collision_preflight_before_writes(tmp_path):
    source = {"config_version": 2, "name": "Safe", "landing_page": "home", "pages": [{"name": "Home", "path": "home", "cards": [
        {"type": "custom:marao-card", "tap_action": {"action": "navigate", "navigation_path": "#page-home-removed-popup"}},
    ]}]}
    with pytest.raises(ValueError, match="missing popup link"):
        g.write_dashboard(source, tmp_path)
    assert not list(tmp_path.iterdir())
    source["pages"][0].update(cards=[], entities=[{"id": "card-2", "template": "hc_title_card", "name": "Title"}, "sensor.safe"])
    with pytest.raises(ValueError, match="local card identity"):
        g.write_dashboard(source, tmp_path)
    assert not list(tmp_path.iterdir())


def test_common_sections_keep_explicit_order_raw_cards_and_one_footer():
    source = deepcopy(SOURCE)
    resolved = g._resolve_pages(source)
    page = g._page_view(resolved["pages"][0], "/config/test", "marao-dashboard")
    assert [card["template"] for card in page["cards"][0]["cards"]] == ["hc_title_card", "hc_weather_card"]
    assert [card["template"] for card in page["cards"][1]["cards"][:3]] == ["hc_room_card", "hc_navigation_card", "hc_entity_group_card"]
    assert page["cards"][1]["cards"][-1] == source["pages"][0]["sections"][1]["cards"][0]
    assert sum(isinstance(card, g.TaggedScalar) for card in page["cards"]) == 1
    assert source == SOURCE
    for index in (2, 3):
        empty = g._page_view(resolved["pages"][index], "/config/test", "marao-dashboard")
        assert len(empty["cards"]) == 1
        assert "entities" not in source["pages"][3]


def test_duplicate_pages_same_entities_have_independent_names_options_and_popups():
    cards = [
        {"id": "media", "entity_id": "media_player.safe", "template": "hc_media_card", "name": "First TV", "apple_tv": False},
        {"id": "period", "entity_id": "sensor.safe", "template": "hc_energy_period_card", "name": "Daily reading", "variables": {"period": "day"}},
        {"id": "camera", "entity_id": "camera.safe", "template": "hc_camera_card"},
        {"id": "group", "template": "hc_entity_group_card", "name": "Thermostats", "entity_type": "climate", "entities": ["climate.safe"]},
        {"id": "scenes", "template": "hc_scene_collection_card", "name": "Scenes", "entities": ["scene.safe", "input_boolean.safe"]},
    ]
    second = deepcopy(cards)
    second[0]["name"] = "Second TV"
    second[1].update(name="Monthly reading", variables={"period": "month"})
    source = {"config_version": 2, "name": "Test", "landing_page": "first", "navigation": [], "pages": [
        {"id": "first", "path": "first", "name": "First", "columns": 1, "entities": cards},
        {"id": "second", "path": "second", "name": "Second", "columns": 1, "entities": second},
    ]}
    resolved = g._resolve_pages(source)
    views = [g._page_view(page, "/config/test", "marao-dashboard") for page in resolved["pages"]]
    hashes = [{card["hash"] for card in view["cards"] if isinstance(card, dict) and card.get("type") == "custom:marao-popup-card"} for view in views]
    assert len(hashes[0]) == len(hashes[1]) == 6 and not hashes[0] & hashes[1]
    assert [view["cards"][0]["cards"][0]["name"] for view in views] == ["First TV", "Second TV"]
    assert [view["cards"][0]["cards"][1]["period"] for view in views] == ["day", "month"]
    for view in views:
        primary = view["cards"][0]["cards"]
        for card in primary:
            action = card.get("tap_action", {}).get("navigation_path") or card.get("popup_hash") or card.get("variables", {}).get("popup_hash")
            if action:
                assert action in set.union(*hashes)
    assert "variables" not in source["pages"][0]["entities"][0]


def test_configured_popup_reference_is_used_by_card_and_actual_popup():
    source = {"config_version": 2, "name": "Test", "landing_page": "home", "pages": [{"name": "Home", "path": "home", "entities": [
        {"id": "camera", "entity_id": "camera.safe", "template": "hc_camera_card", "variables": {"popup_hash": "#my-camera"}},
        {"id": "media", "entity_id": "media_player.safe", "template": "hc_media_card", "variables": {"popup_hash": "#my-media"}, "apple_tv": False},
    ]}]}
    entries = g._resolve_pages(source)["pages"][0]["_sections"][0]["ordered_cards"]
    assert [g._page_card_popups(item)[0]["hash"] for item in entries] == ["#my-camera", "#my-media"]
    assert [g._page_card(item, "marao-dashboard")["variables"]["popup_hash"] for item in entries] == ["#my-camera", "#my-media"]


@pytest.mark.parametrize("other", ["#same", "../unsafe"])
def test_duplicate_or_invalid_owned_popup_is_a_preflight_error(other):
    source = {"config_version": 2, "name": "Test", "landing_page": "home", "pages": [{"name": "Home", "path": "home", "entities": [
        {"id": "one", "entity_id": "media_player.safe", "template": "hc_media_card", "variables": {"popup_hash": "#same"}},
        {"id": "two", "entity_id": "media_player.safe", "template": "hc_media_card", "variables": {"popup_hash": other}},
    ]}]}
    before = deepcopy(source)
    with pytest.raises(ValueError, match="popup hash"):
        g._resolve_pages(source)
    assert source == before


def test_legacy_option_sentinels_are_nonoperative_and_custom_names_survive_translation():
    source = {"config_version": 2, "name": "Test", "landing_page": "home", "legacy_page_options": {"pages": {"energy": {"variables": {"display_unit": "not a unit"}}}},
              "pages": [{"name": "Home", "name_key": "nav.home", "path": "home", "entities": [
                  {"entity_id": "sensor.safe", "template": "hc_energy_period_card", "name": "My reading", "name_key": "energy.today_power", "variables": {"period": "day"}},
              ]}]}
    page = g._resolve_pages(source)["pages"][0]
    assert g._page_view(page, "/config/test", "marao-dashboard", "pt")["title"] == "Início"
    assert g._page_card(page["_sections"][0]["ordered_cards"][0], "marao-dashboard", "pt")["name"] == "My reading"


def test_native_scene_collection_has_no_fake_primary_binding_and_uses_native_services():
    item = {"template": "hc_scene_collection_card", "name": "Scenes", "variables": {"popup_hash": "#scenes"}, "entities": ["scene.safe", "input_boolean.safe"]}
    card = g._page_card(item, "marao-dashboard")
    popup = g._page_card_popups(item)[0]
    assert "entity" not in card and "entity" not in popup
    assert popup["cards"][0]["tap_action"]["perform_action"] == "scene.turn_on"
    assert popup["cards"][1]["tap_action"]["action"] == "toggle"


def test_empty_scene_collection_has_a_readable_localized_popup_without_fake_entities():
    item = {"template": "hc_scene_collection_card", "name": "Empty", "entities": [], "variables": {"popup_hash": "#empty"}}
    assert g._page_card_popups(item)[0]["cards"] == [{"type": "markdown", "content": "No scenes configured."}]
    assert g._page_card_popups(item, "pt")[0]["cards"] == [{"type": "markdown", "content": "Nenhum cenário configurado."}]
    assert "entity" not in g._page_card_popups(item)[0]


def test_apple_tv_explicit_empty_apps_do_not_restore_old_fallback():
    assert g._apple_tv_options({"entity_id": "media_player.apple_tv", "apple_tv": {"apps": []}, "apple_tv_apps": [{"source": "Deleted"}]})["apps"] == []


@pytest.mark.parametrize("remote,service", [("remote.volume", "remote.send_command"), ("media_player.volume", "media_player.volume_down")])
def test_volume_controls_use_the_native_service_for_the_secondary_target(remote, service):
    popup = g._media_popup({"entity_id": "media_player.apple_tv", "name": "TV", "apple_tv": {"remote_entity": "remote.tv", "volume_remote_entity": remote, "apps": []}})
    down = popup["cards"][-1]["cards"][0]
    assert down["tap_action"]["perform_action"] == service
    assert down["tap_action"]["target"]["entity_id"] == remote
    assert down["entity"] == "media_player.apple_tv"


def test_legacy_energy_history_uses_the_configured_title_and_icon():
    popup = g._energy_popups({"pages": {"energy": {"today_energy": {"entity_id": "sensor.safe", "name": "My daily reading", "icon": "mdi:counter"}}}})["energy_today_power"]
    assert popup["name"] == popup["cards"][0]["name"] == "My daily reading"
    assert popup["icon"] == popup["cards"][0]["icon"] == "mdi:counter"


def test_security_native_actions_are_guarded_at_the_shared_dispatcher():
    for entity in ["button.safe", "switch.safe", "input_boolean.safe"]:
        card = g._page_action_card({"entity_id": entity, "template": "hc_switch_card"})
        assert card["template"] == "hc_access_hold_action_card"
    assert g._page_action_card({"entity_id": "lock.safe"})["template"] == "hc_access_card"


def test_canonical_plain_entities_keep_shared_battery_and_strict_access_classification():
    source = {"config_version": 2, "name": "Safe", "landing_page": "home", "pages": [{"name": "Home", "path": "home", "entities": ["sensor.battery", "cover.gate"]}]}
    resolved = g._resolve_pages(source, [{"entity_id": "sensor.battery", "device_class": "battery"}, {"entity_id": "cover.gate", "device_class": "gate", "supported_features": 1}])
    entries = resolved["pages"][0]["_sections"][0]["ordered_cards"]
    assert entries[0]["template"] == "hc_battery_card"
    assert g._page_card(entries[1], "marao-dashboard")["template"] == "hc_access_slide_action_card"


def test_explicit_access_role_has_a_real_strict_popup_even_with_a_plain_cover_name():
    source = {"config_version": 2, "name": "Safe", "landing_page": "home", "pages": [{"name": "Home", "path": "home", "entities": [
        {"id": "access", "entity_id": "cover.plain", "name": "Window", "template": "hc_access_card"},
    ]}]}
    entity = g._resolve_pages(source)["pages"][0]["_sections"][0]["ordered_cards"][0]
    card, popup = g._page_card(entity, "marao-dashboard"), g._page_card_popups(entity)[0]
    assert card["variables"]["popup_hash"] == popup["hash"]
    assert popup["cards"][0]["cards"][0]["template"] == "hc_access_slide_action_card"
    assert popup["cards"][0]["cards"][0]["variables"]["action_service"] == "cover.open_cover"


def test_canonical_navbar_respects_empty_choices_overrides_and_registered_dashboard_root():
    source = {"config_version": 2, "name": "Safe", "slug": "source", "landing_page": "home", "navigation": [], "pages": [{"name": "Home", "name_key": "nav.home", "path": "home", "icon": "mdi:home"}]}
    assert g._navigation_bar(source, "marao-dashboard")["cards"][0]["routes"] == []
    source["navigation"] = [{"page": "home", "label": "Home", "label_key": "nav.home", "url": "/marao-source/home", "icon": "mdi:star", "future": True}, {"url": "https://external.invalid/", "label": "External"}]
    routes = g._navigation_bar(source, "marao-dashboard", "pt")["cards"][0]["routes"]
    assert routes[0]["url"] == "/marao-dashboard/home" and routes[0]["label"] == "Início"
    assert routes[0]["icon"] == "mdi:star" and routes[0]["future"] is True
    assert routes[1] == source["navigation"][1]


def test_assets_keep_historical_view_popup_paths_and_landing_order():
    from custom_components.marao_dashboard.page_migration import convert_legacy_pages
    source = json.loads((Path(__file__).parents[3] / "ha-test/upgrade/fixtures/v0.3.0-guided-pages-format-1-expected.json").read_text())
    canonical = convert_legacy_pages(source)
    canonical["landing_page"] = "media"
    resolved = g._resolve_pages(canonical)
    paths, assets = g._page_assets(resolved, "/config/test", "marao-dashboard")
    assert paths[0] == "views/main/05-media.yaml"
    assert paths[1:] == ["views/main/00-overview.yaml", "views/main/02-rooms.yaml", "views/main/01-security.yaml", "views/main/03-energy.yaml", "views/main/04-wallbox.yaml", "views/rooms/00-living-room.yaml"]
    assert {"components/popups/overview_climate.yaml", "components/popups/overview_climate_0.yaml", "components/popups/overview_scenes.yaml", "components/popups/energy_house_power.yaml", "components/popups/energy_month_cost.yaml"} <= assets.keys()
    assert assets["components/popups/overview_climate_0.yaml"]["hash"] == "#entity-group-overview-climate-climate-living_room-modes"
    assert all(sum(isinstance(card, g.TaggedScalar) and card.value.endswith("navbar.yaml") for card in assets[path]["cards"]) == 1 for path in paths)


def test_explicit_and_derived_output_path_collision_is_rejected_before_writes():
    source = {"config_version": 2, "name": "Test", "landing_page": "one", "pages": [
        {"name": "One", "path": "one", "output_path": "views/pages/two.yaml"},
        {"name": "Two", "path": "two"},
    ]}
    with pytest.raises(ValueError, match="same generated view"):
        g._page_assets(g._resolve_pages(source), "/config/test", "marao-dashboard")


def test_editor_section_moves_preserve_generated_identities_sheets_and_protected_content(tmp_path):
    """Exercise the actual frontend operation against the existing generation boundary."""
    import subprocess

    cards = [
        {"entity_id": "media_player.safe", "apple_tv": {"apps": []}},
        {"entity_id": "media_player.safe", "name": "Second TV", "apple_tv": False},
        {"entity_id": "climate.safe"},
        {"id": "group", "name": "Thermostats", "template": "hc_entity_group_card", "entity_type": "climate", "entities": ["climate.safe"], "popup_filter": "all"},
        {"entity_id": "alarm_control_panel.safe", "template": "hc_security_card"},
        {"entity_id": "sensor.safe", "template": "hc_energy_period_card", "variables": {"period": "day", "display_precision": 0}},
        {"entity_id": "vacuum.safe", "variables": {"action_1": {"data": {"command": "app_segment_clean", "params": [{"segments": [21, 22], "repeat": 2}]}}}},
        {"template": "hc_title_card", "name": "Heading", "future": []},
        {"page": "home", "name": "Home", "future": {"keep": True}},
    ]
    source = {"config_version": 2, "name": "Move test", "landing_page": "home", "pages": [{"name": "Home", "path": "home", "sections": [
        {"columns": 2, "entities": cards, "cards": [{"type": "markdown", "content": "Raw stays", "tap_action": {"action": "navigate", "navigation_path": "#page-home-card-1-popup"}}]},
        {"entities": [], "future": []},
    ]}]}
    script = """
      import { normalizeConfig, serializeConfig, movePageCard } from './frontend_src/editor-model.js';
      let input = ''; for await (const chunk of process.stdin) input += chunk;
      const model = normalizeConfig(JSON.parse(input)), page = model.pages[0];
      for (let i = page.sections[0].entities.length - 1; i >= 0; i--)
        if (!movePageCard(page, 0, i, 1, 0, page.sections[0].entities[i])) throw Error('Move failed');
      process.stdout.write(JSON.stringify(serializeConfig(model)));
    """
    moved = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", script], input=json.dumps(source).encode(), cwd=Path(__file__).parents[3]))
    assert moved["pages"][0]["sections"][0] == {"columns": 2, "entities": [], "cards": source["pages"][0]["sections"][0]["cards"]}
    expected = [dict(card, id=card.get("id", f"card-{i+1}")) for i, card in enumerate(cards)]
    assert moved["pages"][0]["sections"][1] == {"entities": expected, "future": []}

    def entries(config):
        return [card for section in g._resolve_pages(config)["pages"][0]["_sections"] for card in section["ordered_cards"]]

    original_entries, moved_entries = entries(source), entries(moved)
    assert [g._page_card(card, "marao-dashboard") for card in moved_entries] == [g._page_card(card, "marao-dashboard") for card in original_entries]
    assert [g._page_card_popups(card) for card in moved_entries] == [g._page_card_popups(card) for card in original_entries]
    original = g.write_dashboard(source, tmp_path)
    root = tmp_path / original.slug
    popup = root / "components/popups/page-home-card-1-popup.yaml"
    protected = "  - type: markdown\n    content: Preserve custom sheet content exactly\n"
    popup.write_text(popup.read_text().replace("  # marao:custom:start\n", "  # marao:custom:start\n" + protected))
    before = {p.relative_to(root): p.read_bytes() for p in (root / "components/popups").glob("*.yaml")}
    g.write_dashboard(moved, tmp_path)
    assert {p.relative_to(root): p.read_bytes() for p in (root / "components/popups").glob("*.yaml")} == before
    first_view = (root / "views/pages/home.yaml").read_bytes()
    g.write_dashboard(moved, tmp_path)
    assert (root / "views/pages/home.yaml").read_bytes() == first_view
    # Destination remains automatic; changing membership does not force fixed columns.
    assert "columns" not in moved["pages"][0]["sections"][1]


@pytest.mark.parametrize("popup_stream", [None, "", "camera.front_high"])
@pytest.mark.parametrize("provider", ["unifiprotect", "netatmo"])
def test_camera_popup_stream_preserves_dashboard_identity_and_event_options(popup_stream, provider):
    item = {"entity_id": "camera.front_low", "template": "hc_camera_card", "name": "Entrance",
            "show_name": False, "future": [], "variables": {"popup_stream_entity": popup_stream,
            "event_provider": provider, "unifi_protect_media_source": "media-source://unifiprotect/test", "event_limit": 7}}
    original = deepcopy(item)
    card, popup = g._page_card(item, "marao-dashboard"), g._camera_popup(item)
    assert card["entity"] == "camera.front_low"
    live, events = popup["cards"]
    assert live == {"type": "custom:marao-card", "template": "hc_camera_card", "entity": popup_stream or "camera.front_low",
                    "name": "Entrance", "show_name": False, "tap_action": {"action": "fullscreen"}}
    assert events["entity"] == "camera.front_low"
    assert events["event_provider"] == provider and events["limit"] == 7
    assert events["unifi_protect_media_source"] == "media-source://unifiprotect/test"
    assert item == original


@pytest.mark.parametrize("binding", ["sensor.front", 42, [], "camera.bad/path"])
def test_invalid_popup_camera_stream_is_rejected_before_output_write(tmp_path, binding):
    source = {"config_version": 2, "name": "Camera streams", "landing_page": "home", "pages": [
        {"name": "Home", "path": "home", "entities": [{"id": "camera", "entity_id": "camera.low", "template": "hc_camera_card",
         "variables": {"popup_stream_entity": binding}}]}]}
    before = deepcopy(source)
    with pytest.raises(ValueError, match="popup stream"):
        g.write_dashboard(source, tmp_path)
    assert source == before
    assert not list(tmp_path.iterdir())


@pytest.mark.parametrize("preload", [None, False, True, "true", 1])
def test_camera_preload_option_preserves_source_and_rejects_non_booleans(preload):
    from custom_components.marao_dashboard.page_model import camera_popup_stream
    variables = {"future": []}
    if preload is not None:
        variables["preload_stream"] = preload
    original = deepcopy(variables)
    if preload is not None and type(preload) is not bool:
        with pytest.raises(ValueError, match="Preload stream"):
            camera_popup_stream("camera.low", variables)
    else:
        item = {"entity_id": "camera.low", "template": "hc_camera_card", "variables": variables}
        generated = g._page_card(item, "marao-dashboard")["variables"]
        assert {key: value for key, value in generated.items() if key != "popup_hash"} == variables
        assert "preload_stream" not in g._camera_popup(item)["cards"][0].get("variables", {})
    assert variables == original


@pytest.mark.parametrize("members", [[], [
    {"entity_id": "sensor.kitchen", "name": "Kitchen", "future": {"keep": []}},
    {"entity_id": "sensor.heating", "name": ""},
]])
def test_power_history_popup_preserves_devices_across_canonical_native_and_legacy_paths(members):
    from custom_components.marao_dashboard.native import compile_card
    options = {"history_popup": True, "power_devices": members, "display_unit": "kW", "display_precision": 2, "future": []}
    descriptor = {"template": "hc_graph_card", "entity_id": "sensor.house", "name": "House", "variables": options}
    source = {"config_version": 2, "name": "Power", "landing_page": "energy", "pages": [{"name": "Energy", "path": "energy", "entities": [descriptor]}]}
    before = deepcopy(source)
    registry = [{"entity_id": "sensor.house", "unit_of_measurement": "W"}, {"entity_id": "sensor.kitchen", "unit_of_measurement": "kW"}, {"entity_id": "sensor.heating", "unit_of_measurement": "W"}]
    item = g._resolve_pages(source, registry)["pages"][0]["_sections"][0]["ordered_cards"][0]
    canonical = g._page_card_popups(item)[0]
    native = compile_card({"type": "custom:marao-native-graph-card", "entity": "sensor.house", "name": "House", "variables": options}, "power", "marao-dashboard", registry)
    legacy = g._energy_popups({"pages": {"energy": {"house_power": descriptor}}})["energy_house_power"]
    expected = {"type": "custom:marao-power-history-card", "entity": "sensor.house", "name": "House", "power_devices": members, "display_unit": "kW", "display_precision": 2}
    for popup in [canonical, native["popups"][0], legacy]:
        assert popup["cards"] == [expected]
    assert source == before
    assert native["card"]["variables"]["future"] == []
    assert native["card"]["tap_action"]["navigation_path"] == native["popups"][0]["hash"]


@pytest.mark.parametrize("devices,message", [
    (None, "must be a list"),
    ([{"entity_id": "light.kitchen"}], "Choose a power sensor"),
    ([{"entity_id": "sensor.house"}], "must be unique"),
    ([{"entity_id": "sensor.kitchen"}, {"entity_id": "sensor.kitchen"}], "must be unique"),
    ([{"entity_id": "sensor.kitchen", "name": 5}], "must be text"),
])
def test_power_history_device_validation_preserves_rejected_source(devices, message):
    source = {"config_version": 2, "name": "Power", "landing_page": "energy", "pages": [{"name": "Energy", "path": "energy", "entities": [
        {"template": "hc_graph_card", "entity_id": "sensor.house", "variables": {"power_devices": devices}},
    ]}]}
    before = deepcopy(source)
    with pytest.raises(ValueError, match=message):
        g._resolve_pages(source, [])
    assert source == before


def test_power_history_rejects_known_energy_devices_and_keeps_non_power_graphs_working():
    from custom_components.marao_dashboard.native import compile_card
    config = {"type": "custom:marao-native-graph-card", "entity": "sensor.house", "variables": {"history_popup": True, "power_devices": [{"entity_id": "sensor.kitchen"}]}}
    before = deepcopy(config)
    with pytest.raises(ValueError, match="require power sensors"):
        compile_card(config, "power", "marao-dashboard", [{"entity_id": "sensor.house", "unit_of_measurement": "W"}, {"entity_id": "sensor.kitchen", "unit_of_measurement": "kWh"}])
    assert config == before
    compatible = compile_card(config, "power", "marao-dashboard", validate_units=False)
    assert compatible["popups"][0]["cards"][0]["power_devices"] == config["variables"]["power_devices"]
    other = compile_card({"type": "custom:marao-native-graph-card", "entity": "sensor.humidity", "variables": {"history_popup": True}}, "humidity", "marao-dashboard", [{"entity_id": "sensor.humidity", "unit_of_measurement": "%"}])
    assert other["popups"][0]["cards"][0]["template"] == "hc_graph_card"


def test_power_device_option_remains_opaque_on_unrelated_card_families():
    source = {"config_version": 2, "name": "Power", "landing_page": "home", "pages": [{"name": "Home", "path": "home", "entities": [
        {"entity_id": "sensor.safe", "template": "hc_sensor_card", "variables": {"power_devices": {"future_hook": []}}},
    ]}]}
    before = deepcopy(source)
    resolved = g._resolve_pages(source, [])
    assert resolved["pages"][0]["_sections"][0]["ordered_cards"][0]["variables"]["power_devices"] == {"future_hook": []}
    assert source == before
