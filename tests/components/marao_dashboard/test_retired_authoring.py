"""Retired authoring commands cannot write; independent ownership stays protected."""
from copy import deepcopy
from types import SimpleNamespace
import pytest
from custom_components.marao_dashboard.native_storage import native_owned
from custom_components.marao_dashboard.editor import EDITOR_CATALOG

def test_newer_native_markers_and_aliases_never_establish_legacy_ownership():
    assert native_owned({"marao": {"mode": "native", "version": 99}})
    assert native_owned({"strategy": {"type": "custom:marao-starter"}})
    assert native_owned({"views": [{"sections": [{"cards": [{"type": "custom:marao-native-light-card"}]}]}]})
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

async def test_proven_legacy_builder_can_contain_native_raw_cards_without_changing_ownership(hass, tmp_path):
    import json
    from homeassistant.components.lovelace import LOVELACE_DATA
    from custom_components.marao_dashboard.native_storage import async_find_native_dashboard
    config = {"views": [{"path": "home", "cards": [{"type": "custom:marao-navbar-card"},
              {"type": "custom:marao-native-light-card", "entity": "light.safe"}]}]}
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

def test_access_catalog_has_one_discoverable_family_and_retains_legacy_settings():
    family = [card for card in EDITOR_CATALOG["cards"] if card["id"] in (
        "md_access_card", "md_access_slide_action_card", "md_access_action_card", "md_access_hold_action_card")]
    assert [card["id"] for card in family if not card.get("hidden")] == ["md_access_card"]
    assert all(any(option["key"] == "access_mode" for option in card["variables"]) for card in family)


def test_retired_commands_are_unsupported_and_cannot_write(hass, tmp_path):
    from custom_components.marao_dashboard import _register_websocket_commands
    from custom_components.marao_dashboard.const import DOMAIN
    from homeassistant.components import websocket_api
    hass.config.config_dir = str(tmp_path)
    hass.data[DOMAIN] = {}
    _register_websocket_commands(hass)
    commands = hass.data[websocket_api.DOMAIN]
    assert "marao_dashboard/config/generate" in commands
    assert "marao_dashboard/native/card" not in commands
    assert "marao_dashboard/native/starter" not in commands
    assert not (tmp_path / "dashboard").exists()
