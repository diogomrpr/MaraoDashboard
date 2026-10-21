"""Independent native expectations and read-only compilation/preservation."""

from copy import deepcopy
from types import SimpleNamespace

import pytest

from custom_components.marao_dashboard.native import compile_card, compile_starter, native_catalog, native_owned, native_type
from custom_components.marao_dashboard.editor import EDITOR_CATALOG


@pytest.mark.parametrize("spec", EDITOR_CATALOG["cards"], ids=lambda spec: spec["id"])
def test_every_published_role_compiles_without_mutating_its_options(spec, tmp_path):
    source = {"type": native_type(spec["id"]), "name": spec["label"], "future": {"keep": [1, 2]}, "variables": {"future": []}}
    if spec["domains"] and not spec.get("entity_optional"):
        source["entity"] = spec["domains"][0] + ".safe"
    if spec["id"] in ("hc_room_card", "hc_navigation_card"):
        source["page"] = "bedroom"
    if spec["id"] == "hc_entity_group_card":
        source.update(entity_type="light", entities=[])
    if spec["id"] == "hc_media_app_card":
        source["variables"]["app_source"] = "TV"
    before = deepcopy(source)
    compiled = compile_card(source, "native-one", "marao-dashboard")
    assert source == before
    assert compiled["card"]["future"] == {"keep": [1, 2]}
    assert compiled["card"]["variables"]["future"] == [] if spec["id"] != "hc_entity_group_card" else True
    assert not list(tmp_path.iterdir())


def test_native_security_hold_accepts_the_published_alarm_binding():
    source = {"type": native_type("hc_access_hold_action_card"), "entity": "alarm_control_panel.safe",
              "variables": {"action_service": "alarm_control_panel.alarm_arm_away"}}
    compiled = compile_card(source, "native-hold", "marao-native")
    assert compiled["card"]["entity"] == source["entity"]
    assert compiled["card"]["template"] == "hc_access_hold_action_card"


def test_dishwasher_accepts_existing_state_and_refill_helpers():
    source = {"type": native_type("hc_dishwasher_card"), "entity": "input_select.safe",
              "variables": {"salt_entity": "input_boolean.salt",
                            "rinse_aid_entity": "input_boolean.rinse",
                            "active_program_entity": "input_select.program"}}
    before = deepcopy(source)
    compiled = compile_card(source, "native-dishwasher", "dashboard-example")
    assert compiled["card"]["entity"] == source["entity"]
    assert source == before
    spec = next(card for card in native_catalog()["cards"] if card["id"] == "hc_dishwasher_card")
    fields = {field["key"]: field for field in spec["variables"]}
    assert "input_boolean" in fields["salt_entity"]["domains"]
    assert "input_boolean" in fields["rinse_aid_entity"]["domains"]
    assert "input_select" in fields["active_program_entity"]["domains"]


def test_starter_is_an_expanded_independent_snapshot():
    entities = [
        {"entity_id": "light.safe", "name": "Safe light", "area_id": "room", "area_name": "Room", "has_state": True},
        {"entity_id": "light.hidden", "hidden_by": "user", "has_state": True},
        {"entity_id": "light.disabled", "disabled_by": "user", "has_state": True},
    ]
    exact = deepcopy(entities)
    config = compile_starter("Native", "marao-native", entities)["config"]
    assert entities == exact
    assert config["marao"] == {"mode": "native", "version": 1}
    assert all(view["type"] == "sections" for view in config["views"])
    assert all(view["theme"] == "Marao Dashboard" for view in config["views"])
    import json
    output = json.dumps(config)
    assert "light.safe" in output and "light.hidden" not in output and "light.disabled" not in output
    assert "!include" not in output and '"strategy"' not in output
    assert "/marao-native/" in output and "/marao-dashboard/" not in output
    assert compile_starter("Empty", "marao-native", [])["config"]["views"]


def test_media_options_and_duplicate_sheets_have_independent_identity():
    source = {"type": native_type("hc_media_card"), "entity": "media_player.safe",
              "apple_tv": {"remote_entity": "remote.safe", "volume_remote_entity": "remote.volume", "apps": []},
              "variables": {"future": []}}
    one = compile_card(source, "native-one", "marao-native")
    two = compile_card(source, "native-two", "marao-native")
    assert one["popups"][0]["hash"] == "#native-one-popup"
    assert two["popups"][0]["hash"] == "#native-two-popup"
    assert "remote.volume" in str(one["popups"]) and "remote.safe" in str(one["popups"])
    source["variables"]["popup_hash"] = "#authored"
    assert compile_card(source, "native-one", "marao-native")["popups"] == []


@pytest.mark.parametrize("role,domain", [("hc_light_card", "light"), ("hc_fan_card", "fan"), ("hc_cover_card", "cover"), ("hc_switch_card", "switch"), ("hc_sensor_card", "sensor")])
def test_inline_native_cards_do_not_get_phantom_popup_actions(role, domain):
    result = compile_card({"type": native_type(role), "entity": domain + ".safe"}, "native-inline", "marao-native")
    assert result["popups"] == []
    assert "popup_hash" not in result["card"].get("variables", {})


@pytest.mark.parametrize("domain", ["lock", "cover", "button", "switch", "script"])
def test_access_openers_reuse_strict_runtime(domain):
    card = compile_card({"type": native_type("hc_access_slide_action_card"), "entity": domain + ".safe"},
                        "native-one", "marao-native")["card"]
    assert card["template"] == "hc_access_slide_action_card"
    assert card["entity"] == domain + ".safe"


def test_alarm_sheet_contains_transient_runtime_controls_without_codes():
    compiled = compile_card({"type": native_type("hc_security_card"), "entity": "alarm_control_panel.safe"},
                            "native-one", "marao-native")
    assert compiled["popups"][0]["cards"][0]["template"] == "hc_alarm_controls_card"
    assert compiled["card"]["tap_action"]["navigation_path"] == compiled["popups"][0]["hash"]
    assert "code" not in compiled["popups"][0]["cards"][0]


@pytest.mark.parametrize("config", [
    {"type": native_type("hc_light_card"), "entity": "lock.safe"},
    {"type": native_type("hc_light_card"), "entity": "light.safe", "variables": []},
    {"type": native_type("hc_access_card"), "entity": "lock.safe", "tap_action": {"action": "perform-action", "perform_action": "lock.unlock"}},
    {"type": native_type("hc_access_card"), "entity": "lock.safe", "tap_action": {"action": "toggle"}},
    {"type": native_type("hc_access_action_card"), "entity": "lock.safe", "variables": {"action_service": "lock.unlock"}},
])
def test_invalid_or_unsafe_native_input_fails_read_only(config):
    exact = deepcopy(config)
    with pytest.raises(ValueError):
        compile_card(config, "native-one", "marao-native")
    assert config == exact


def test_native_blind_actions_preserve_normal_cover_features_without_bypassing_access_guards():
    card = {"type": native_type("hc_cover_card"), "entity": "cover.safe",
            "tap_action": {"action": "perform-action", "perform_action": "cover.open_cover", "target": {"entity_id": "cover.safe"}}}
    result = compile_card(card, "native-cover", "marao-native", [{"entity_id": "cover.safe", "device_class": "blind"}])
    assert result["card"]["tap_action"] == card["tap_action"]
    with pytest.raises(ValueError, match="access opener slide"):
        compile_card(card, "native-cover", "marao-native", [{"entity_id": "cover.safe", "device_class": "gate"}])
    card["tap_action"]["target"] = {"area_id": "mixed-access-and-blinds"}
    with pytest.raises(ValueError, match="access opener slide"):
        compile_card(card, "native-cover", "marao-native", [{"entity_id": "cover.safe", "device_class": "blind"}])


def test_newer_native_markers_and_aliases_never_establish_legacy_ownership():
    assert native_owned({"marao": {"mode": "native", "version": 99}})
    assert native_owned({"strategy": {"type": "custom:marao-starter"}})
    assert native_owned({"views": [{"sections": [{"cards": [{"type": native_type("hc_light_card")}]}]}]})
    assert not native_owned({"views": [{"cards": [{"type": "custom:marao-card"}]}]})


def test_builder_refuses_native_destination_before_any_write(hass):
    from homeassistant.components.lovelace import LOVELACE_DATA
    from custom_components.marao_dashboard import _assert_builder_destination
    document = {"config": {"marao": {"mode": "native", "version": 1}, "views": []}}
    exact = deepcopy(document)
    dashboard = SimpleNamespace(mode="storage", _data=document)
    hass.data[LOVELACE_DATA] = SimpleNamespace(dashboards={"marao-native": dashboard})
    with pytest.raises(ValueError, match="Home Assistant owns"):
        _assert_builder_destination(hass, "marao-native")
    assert document == exact


async def test_read_only_native_commands_allow_a_viewer_but_builder_writes_do_not(hass, hass_ws_client, tmp_path):
    hass.config.config_dir = str(tmp_path)
    from custom_components.marao_dashboard import _register_websocket_commands
    from custom_components.marao_dashboard.const import DOMAIN
    from pathlib import Path
    hass.data[DOMAIN] = {}
    _register_websocket_commands(hass)
    user = await hass.auth.async_create_user("Native Viewer")
    assert not user.is_admin
    refresh = await hass.auth.async_create_refresh_token(user, client_id="https://native.test")
    client = await hass_ws_client(hass, access_token=hass.auth.async_create_access_token(refresh))
    source = {"type": native_type("hc_light_card"), "entity": "light.safe", "future": []}
    await client.send_json({"id": 1, "type": "marao_dashboard/native/card", "config": source,
                            "instance": "native-safe", "url_path": "marao-native"})
    result = await client.receive_json()
    assert result["success"] and result["result"]["card"]["entity"] == "light.safe"
    await client.send_json({"id": 2, "type": "marao_dashboard/native/starter", "title": "Native",
                            "url_path": "marao-native", "entities": []})
    assert (await client.receive_json())["success"]
    await client.send_json({"id": 3, "type": "marao_dashboard/config/generate", "config": "{}"})
    result = await client.receive_json()
    assert not result["success"] and result["error"]["code"] == "unauthorized"
    assert not Path(hass.config.path("dashboard/MaraoDashboard")).exists()


async def test_native_storage_is_not_imported_and_cannot_be_captured(hass, tmp_path):
    import json
    from homeassistant.components.lovelace import LOVELACE_DATA
    from custom_components.marao_dashboard.native_storage import async_find_native_dashboard, NativeDashboardPlan
    file = tmp_path / "lovelace.marao-native"
    config = {"marao": {"mode": "native", "version": 1}, "views": [{"path": "home", "cards": [{"type": "custom:marao-header-card"}]}]}
    data = {"config": config, "future": {"keep": []}}
    file.write_text(json.dumps({"version": 1, "minor_version": 1, "key": file.name, "data": data}))
    exact = file.read_bytes()
    dashboard = SimpleNamespace(mode="storage", _data=data,
        _store=SimpleNamespace(path=str(file), version=1, minor_version=1, key=file.name))
    hass.data[LOVELACE_DATA] = SimpleNamespace(dashboards={"marao-native": dashboard})
    assert await async_find_native_dashboard(hass) is None
    with pytest.raises(ValueError, match="Native-owned"):
        NativeDashboardPlan.capture(dashboard, tmp_path / "dashboard")
    assert file.read_bytes() == exact


def test_saved_energy_configuration_renders_after_source_metadata_loss_but_editor_validation_stays_strict():
    config = {"type": native_type("hc_graph_card"), "entity": "sensor.safe",
              "variables": {"display_unit": "kW", "display_precision": 2}}
    with pytest.raises(ValueError, match="source unit"):
        compile_card(config, "native-safe", "marao-native")
    rendered = compile_card(config, "native-safe", "marao-native", validate_units=False)
    assert rendered["card"]["variables"]["display_unit"] == "kW"
    assert rendered["card"]["variables"]["display_precision"] == 2


async def test_proven_legacy_builder_can_contain_native_raw_cards_without_changing_ownership(hass, tmp_path):
    import json
    from homeassistant.components.lovelace import LOVELACE_DATA
    from custom_components.marao_dashboard.native_storage import async_find_native_dashboard
    config = {"views": [{"path": "home", "cards": [{"type": "custom:marao-navbar-card"},
              {"type": native_type("hc_light_card"), "entity": "light.safe"}]}]}
    file = tmp_path / "lovelace.saved"
    data = {"config": config}
    file.write_text(json.dumps({"version": 1, "minor_version": 1, "key": file.name, "data": data}))
    exact = file.read_bytes()
    async def load(force):
        return config
    dashboard = SimpleNamespace(mode="storage", _data=data, async_load=load,
        _store=SimpleNamespace(path=str(file), version=1, minor_version=1, key=file.name))
    hass.data[LOVELACE_DATA] = SimpleNamespace(dashboards={"marao-dashboard": dashboard})
    assert await async_find_native_dashboard(hass, {"legacy_storage_dashboard": {}}) == (dashboard, config)
    assert file.read_bytes() == exact


def test_native_close_or_lock_is_an_explicit_safe_action_without_an_opening_sheet():
    result = compile_card({"type": native_type("hc_access_action_card"), "entity": "lock.safe"}, "native-safe", "marao-native")
    assert result["card"]["template"] == "hc_access_action_card"
    assert result["card"]["variables"]["action_service"] == "lock.lock"
    assert result["card"]["variables"]["action_label_key"] == "common.lock"
    assert result["popups"] == []


@pytest.mark.parametrize("binding", ["sensor.front", 42, [], "camera.bad/path"])
def test_native_camera_rejects_invalid_popup_stream_even_with_external_action(binding):
    source = {"type": native_type("hc_camera_card"), "entity": "camera.front_low",
              "variables": {"popup_stream_entity": binding}, "tap_action": {"action": "none"}}
    before = deepcopy(source)
    with pytest.raises(ValueError, match="popup stream"):
        compile_card(source, "native-camera", "marao-dashboard")
    assert source == before
