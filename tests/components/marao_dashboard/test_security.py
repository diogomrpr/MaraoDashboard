"""Independent security generation expectations and compatible saved sources."""
from copy import deepcopy
import json
from pathlib import Path

import pytest

from custom_components.marao_dashboard import generator as g
from custom_components.marao_dashboard.editor import EDITOR_CATALOG


def dashboard(card):
    return {"config_version": 2, "name": "Safe", "landing_page": "home", "navigation": ["home"],
            "pages": [{"id": "home", "name": "Home", "path": "home", "entities": [card]}]}


def test_alarm_sheets_have_independent_identity_and_do_not_store_codes(tmp_path):
    source = dashboard({"id": "alarm", "entity_id": "alarm_control_panel.safe", "template": "md_security_card", "future": {"keep": True}})
    source["pages"].append({"id": "security", "name": "Security", "path": "security",
                            "entities": [deepcopy(source["pages"][0]["entities"][0])]})
    exact = deepcopy(source)
    generated = g.write_dashboard(source, tmp_path, dashboard_key_override="marao-dashboard")
    assert source == exact and source["config_version"] == 2
    root = tmp_path / generated.slug
    for page in ("home", "security"):
        sheet = root / f"components/popups/page-{page}-alarm-popup.yaml"
        text = sheet.read_text()
        assert f"hash: '#page-{page}-alarm-popup'" in text
        assert "template: md_alarm_controls_card" in text
        assert "entity: alarm_control_panel.safe" in text
        assert "code:" not in text
        assert f"popup_hash: '#page-{page}-alarm-popup'" in (root / f"views/pages/{page}.yaml").read_text()


@pytest.mark.parametrize("action", [{"action": "none"}, {"action": "navigate", "navigation_path": "#alarm-authored"}])
def test_explicit_alarm_actions_and_unknown_options_remain_authoritative(tmp_path, action):
    source = dashboard({"entity_id": "alarm_control_panel.safe", "template": "md_security_card",
                        "tap_action": action, "variables": {"future": [1, 2]}})
    g.write_dashboard(source, tmp_path)
    assert not list(tmp_path.rglob("*alarm*popup.yaml"))
    card = g._page_card(g._resolve_pages(source)["pages"][0]["_sections"][0]["ordered_cards"][0], "marao-dashboard")
    assert card["tap_action"] == action
    assert card["variables"]["future"] == [1, 2]


@pytest.mark.parametrize("domain", ["lock", "cover", "button", "switch", "script"])
def test_explicit_openers_preserve_binding_and_do_not_become_generic_controls(domain):
    source = dashboard({"entity_id": f"{domain}.safe", "template": "md_access_slide_action_card", "variables": {"future": True}})
    entity = g._resolve_pages(source)["pages"][0]["_sections"][0]["ordered_cards"][0]
    card = g._page_card(entity, "marao-dashboard")
    assert card["template"] == "md_access_slide_action_card" and card["entity"] == f"{domain}.safe"
    assert g._page_card_popups(entity) == []
    assert card["variables"]["future"] is True


@pytest.mark.parametrize("change", [{"variables": {"action_service": "switch.toggle"}}, {"variables": {"action_service": None}},
                                  {"tap_action": {"action": "toggle"}}, {"hold_action": None}])
def test_invalid_opener_services_and_bypasses_fail_before_writes(tmp_path, change):
    source = dashboard({"entity_id": "switch.safe", "template": "md_access_slide_action_card", **change})
    with pytest.raises(ValueError, match="Access opener"):
        g.write_dashboard(source, tmp_path)
    assert not list(tmp_path.iterdir())


def test_supported_release_sources_convert_to_the_same_independent_expected_json():
    fixtures = Path(__file__).parents[3] / "ha-test/upgrade/fixtures"
    source = json.loads((fixtures / "v0.5.1-dashboard.json").read_text())
    expected = json.loads((fixtures / "v0.5.1-dashboard-format-2-expected.json").read_text())
    assert g.migrate_dashboard_config(source) == expected
    assert any(card["id"] == "md_access_slide_action_card" for card in EDITOR_CATALOG["cards"])


def test_vacuum_native_parameters_survive_generation_and_invalid_data_stays_read_only(tmp_path):
    data = {"command": "app_segment_clean", "params": [{"segments": [21], "repeat": 1}]}
    source = dashboard({"entity_id": "vacuum.safe", "template": "md_vacuum_card",
                        "variables": {"action_1": {"segment": 21, "data": data}}})
    entry = g._resolve_pages(source)["pages"][0]["_sections"][0]["ordered_cards"][0]
    assert g._page_card(entry, "marao-dashboard")["variables"]["action_1"]["data"] == data
    source["pages"][0]["entities"][0]["variables"]["action_1"]["data"] = []
    with pytest.raises(ValueError, match="Vacuum action data"):
        g.write_dashboard(source, tmp_path)
    assert not list(tmp_path.iterdir())
