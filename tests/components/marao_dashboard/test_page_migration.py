"""Complete conversions checked against independently specified documents."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re

import pytest

from custom_components.marao_dashboard.page_migration import convert_legacy_pages

FIXTURES = Path(__file__).parents[3] / "ha-test/upgrade/fixtures"
MANIFEST = json.loads((FIXTURES / "page-model-expectations.json").read_text())


@pytest.mark.parametrize("record", MANIFEST["records"], ids=lambda record: record["expected"])
def test_page_conversion_matches_complete_independent_expectation(record):
    source_path = FIXTURES / record.get("predecessor", record["input"])
    source_bytes = source_path.read_bytes()
    source = json.loads(source_bytes)
    before = deepcopy(source)
    expected = json.loads((FIXTURES / record["expected"]).read_text())
    assert convert_legacy_pages(source) == expected
    assert source == before and source_path.read_bytes() == source_bytes


@pytest.mark.parametrize("record", MANIFEST["records"], ids=lambda record: record["input"])
def test_public_ordered_conversion_matches_independent_document_and_is_idempotent(record):
    from custom_components.marao_dashboard.generator import migrate_dashboard_config

    source_path = FIXTURES / record["input"]
    source_bytes = source_path.read_bytes()
    source = json.loads(source_bytes)
    expected = json.loads((FIXTURES / record["expected"]).read_text())
    assert migrate_dashboard_config(source) == expected
    assert migrate_dashboard_config(expected) == expected
    assert source == json.loads(source_bytes) and source_path.read_bytes() == source_bytes


def test_expectation_provenance_and_every_document_hash_are_retained():
    assert MANIFEST["from_formats"] == [0, 1] and MANIFEST["to_format"] == 2
    assert "No Marao imports" in MANIFEST["expected_authoring"]
    for filename, digest in MANIFEST["sha256"].items():
        assert hashlib.sha256((FIXTURES / filename).read_bytes()).hexdigest() == digest
    provenance = json.loads((FIXTURES / "provenance.json").read_text())
    for record in MANIFEST["records"]:
        if record["input"].startswith("v"):
            historical = next(item for item in provenance if item["fixture"] == record["input"])
            assert MANIFEST["sha256"][record["input"]] == historical["fixture_sha256"]
    assert {record["input"] for record in MANIFEST["records"] if record["input"].startswith("v")} == {record["fixture"] for record in provenance}
    assert MANIFEST["assertions"].keys() == MANIFEST["parity"].keys()
    for assertion in [*MANIFEST["assertions"].values()]:
        filename, function = assertion["test"].split("::")
        assert f"def {function}(" in (FIXTURES.parents[2] / filename).read_text()


def test_documented_canonical_example_matches_the_shared_boundary():
    from custom_components.marao_dashboard.editor import EDITOR_CATALOG
    from custom_components.marao_dashboard.page_model import validate_pages
    guide = (FIXTURES.parents[2] / "docs/docs/installation/configuration.md").read_text()
    example = next(json.loads(block) for block in re.findall(r"```json\n(.*?)\n```", guide, re.S) if '"config_version": 2' in block)
    templates = {card["id"]: card["domains"] for card in EDITOR_CATALOG["cards"]}
    assert validate_pages(example, templates) == {"home", "office"}


def test_parity_expectation_checks_every_starter_role_and_customization_scope():
    source = json.loads((FIXTURES / "page-parity-format-1-input.json").read_text())
    result = convert_legacy_pages(source)
    pages = {page["path"]: page for page in result["pages"]}
    entries = lambda path: [entry for section in pages[path]["sections"] for entry in section.get("entities", [])]
    assert set(MANIFEST["parity"]) == {"Home", "Rooms", "Room/custom", "Security", "Energy", "Wallbox", "Media"}
    home = entries("overview")
    assert home[0]["template"] == "hc_weather_card" and home[0]["variables"]["show_forecast"]
    assert [item["entity_type"] for item in home if item["template"] == "hc_entity_group_card"] == ["light", "cover", "climate", "battery"]
    assert home[-1]["entities"] == ["input_boolean.holiday_mode"]
    shortcut = entries("rooms")[0]
    assert shortcut["page"] == "room-living-room"
    assert shortcut["variables"]["light_entities"] == [shortcut["entity_id"]]
    room = pages["room-living-room"]
    assert room["subview"] and room["sections"][0]["entities"][0]["template"] == "hc_title_card"
    assert room["sections"][1]["cards"] == source["rooms"][0]["cards"]
    assert room["future_page"] == source["rooms"][0]["future_page"]
    security = entries("security")
    assert [item["template"] for item in security] == ["hc_security_card", "hc_access_card", "hc_access_hold_action_card"]
    assert security[-1]["tap_action"]["perform_action"] == "button.press"
    energy = entries("energy")
    assert energy[0]["name"] == "Whole-home demand" and energy[0]["variables"]["history_popup"]
    assert energy[0]["variables"]["show_graph_line"] is False and energy[0]["future_card"] == 42
    assert [item["variables"]["period"] for item in energy[1:5]] == ["month", "day", "month", "day"]
    assert energy[-2]["variables"]["toggle_entity"] == "switch.heater" and energy[-1]["template"] == "hc_dishwasher_card"
    wallbox = entries("wallbox")
    assert [item["template"] for item in wallbox] == ["hc_base_card", "hc_graph_card", "hc_graph_card", "hc_wallbox_current_card", "hc_switch_card"]
    assert wallbox[3]["variables"] == {"shortcuts": [6, 12, 16], "future_option": True}
    assert wallbox[3]["icon"] == "mdi:ev-plug-type2" and wallbox[3]["name"] == "Requested current"
    media = entries("media")
    assert media[0]["apple_tv"]["volume_remote_entity"] == "remote.volume_fixture"
    assert media[0]["apple_tv"]["future_remote_option"] is True
    assert media[1]["name"] == media[1]["variables"]["app_source"] == "YouTube"
    assert media[1]["icon"] == "mdi:youtube" and media[1]["future_app_option"] is True
    assert result["extension"] == source["extension"]
    assert result["legacy_page_options"] == {"overview": source["overview"], "pages": source["pages"]}


def test_conversion_keeps_explicit_empty_lists_and_does_not_copy_live_metadata():
    source = json.loads((FIXTURES / "explicit-empty-guided-format-1-input.json").read_text())
    result = convert_legacy_pages(source, [{"entity_id": "light.living_room_main", "name": "Private live name", "private": "not persisted"}])
    assert "Private live name" not in json.dumps(result) and "not persisted" not in json.dumps(result)
    pages = {page["path"]: page for page in result["pages"]}
    assert pages["media"]["sections"] == []
    assert len(pages["security"]["sections"]) == 2
    assert result["legacy_page_options"]["pages"]["security"]["access_entities"] == []
    assert result["legacy_page_options"]["pages"]["media"]["players"] == []


def test_access_actions_keep_strict_access_instead_of_becoming_generic_holds():
    source = {"config_version": 1, "name": "Safe", "rooms": [], "pages": {"security": {"actions": [
        {"entity_id": "lock.safe", "name": "Door"},
        {"entity_id": "cover.safe", "device_class": "gate", "supported_features": 1},
        {"entity_id": "switch.safe", "name": "Security action"},
    ]}}}
    security = next(page for page in convert_legacy_pages(source)["pages"] if page["path"] == "security")
    actions = [section["entities"][0] for section in security["sections"]]
    assert [item["template"] for item in actions] == ["hc_access_card", "hc_access_card", "hc_access_hold_action_card"]
    assert "tap_action" not in actions[0] and "tap_action" not in actions[1]
    assert actions[2]["tap_action"]["action"] == "toggle"


@pytest.mark.parametrize("source", [{"config_version": True}, {"config_version": 2}, {"config_version": 1, "pages": []}])
def test_conversion_rejects_wrong_boundary_without_source_changes(source):
    before = deepcopy(source)
    with pytest.raises(ValueError):
        convert_legacy_pages(source)
    assert source == before


def test_conversion_keeps_saved_reading_options_when_live_metadata_is_temporarily_missing():
    source = {"config_version": 1, "name": "Safe", "rooms": [], "pages": {"energy": {"today_energy": {
        "entity_id": "sensor.safe", "variables": {"display_unit": "kWh", "display_precision": 0},
    }}}}
    before = deepcopy(source)
    result = convert_legacy_pages(source)
    energy = next(page for page in result["pages"] if page["path"] == "energy")
    options = energy["sections"][0]["entities"][0]["variables"]
    assert options["display_unit"] == "kWh" and options["display_precision"] == 0
    from custom_components.marao_dashboard.generator import _resolve_pages
    with pytest.raises(ValueError, match="source unit"):
        _resolve_pages(result)
    assert source == before


@pytest.mark.parametrize("source", ['{"name": "Safe", "future": NaN}', '{"name": "Safe", "future": Infinity}', '{"name": "Safe", "future": 1e999}', '[]', '{broken'])
def test_shared_json_parser_rejects_invalid_sources_without_file_writes(tmp_path, source):
    from custom_components.marao_dashboard.generator import parse_dashboard_config, load_dashboard_config
    path = tmp_path / "saved.json"
    path.write_text(source)
    before = path.read_bytes()
    with pytest.raises(ValueError):
        parse_dashboard_config(source)
    with pytest.raises(ValueError):
        load_dashboard_config(path)
    assert path.read_bytes() == before
