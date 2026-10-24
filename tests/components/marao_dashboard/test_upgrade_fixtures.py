"""Read-only released-format and additive energy option preservation checks."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil

import pytest
import yaml

from custom_components.marao_dashboard.generator import (
    DASHBOARD_CONFIG_VERSION, MaraoDashboardLoader, load_dashboard_config, migrate_dashboard_config,
    materialize_overview_groups, migrate_legacy_theme, plan_dashboard, write_dashboard, write_dashboard_config,
)
from custom_components.marao_dashboard.history import snapshot_dashboard

FIXTURES = Path(__file__).parents[3] / "ha-test/upgrade/fixtures"
PROVENANCE = json.loads((FIXTURES / "provenance.json").read_text())
INVENTORY = json.loads((FIXTURES / "inventory.json").read_text())


@pytest.mark.parametrize("record", PROVENANCE, ids=lambda record: record["tag"])
def test_historical_groups_match_independent_descriptors_and_popup_membership(tmp_path, record):
    fixture = FIXTURES / record["fixture"]
    source = fixture.read_bytes()
    expected = json.loads((FIXTURES / "entity-groups-expected.json").read_text())["groups"][record["tag"]]
    converted = migrate_dashboard_config(json.loads(source))
    preview = materialize_overview_groups(converted)
    groups = [card for section in preview["pages"][0]["sections"] for card in section.get("entities", []) if card.get("template") == "md_entity_group_card"]
    assert [{key: group[key] for key in old} for group, old in zip(groups, expected, strict=True)] == expected
    assert "overview" not in converted and "rooms" not in converted
    active = tmp_path / "source.json"
    active.write_bytes(source)
    history = snapshot_dashboard(active, tmp_path / "history", json.loads(source))
    archive_path = tmp_path / "history/.history" / history["version"] / "dashboard.json"
    archive = archive_path.read_bytes()
    plan_dashboard(preview, tmp_path / "dry")
    assert not (tmp_path / "dry").exists()
    generated = write_dashboard(preview, tmp_path / "generated")
    for group in expected:
        filename = group["id"].replace("-", "_") + ".yaml"
        popup = yaml.load((tmp_path / "generated" / generated.slug / "components/popups" / filename).read_text(), Loader=MaraoDashboardLoader)
        assert popup["hash"] == "#" + group["id"]
        assert popup["name"] == group["name"]
        assert "entity" not in popup
        assert [card["entity"] for card in popup["cards"]] == [member if isinstance(member, str) else member["entity_id"] for member in group["entities"]]
        assert popup["entity_group"]["popup_filter"] == group["popup_filter"]
    assert fixture.read_bytes() == active.read_bytes() == source
    assert archive_path.read_bytes() == archive


@pytest.mark.parametrize("record", PROVENANCE, ids=lambda record: record["tag"])
def test_released_configs_convert_once_without_changing_historical_source(tmp_path: Path, record: dict) -> None:
    fixture = FIXTURES / record["fixture"]
    source = fixture.read_bytes()
    assert hashlib.sha256(source).hexdigest() == record["fixture_sha256"]
    config = load_dashboard_config(fixture)
    expected = json.loads((FIXTURES / record["expected"].replace("-expected.json", "-format-2-expected.json")).read_bytes())
    converted = migrate_dashboard_config(config)
    assert converted == expected == migrate_dashboard_config(converted)
    assert config == json.loads(source)
    assert converted is not config
    assert DASHBOARD_CONFIG_VERSION == 2
    plan_dashboard(config, tmp_path)
    assert fixture.read_bytes() == source
    assert not list(tmp_path.iterdir())


def test_released_json_inventory_cannot_silently_drop_a_baseline() -> None:
    assert {record["tag"] for record in PROVENANCE} == {"v0.3.0", "v0.3.1", "v0.5.0", "v0.5.1"}
    assert len(PROVENANCE) == 4
    for record in PROVENANCE:
        assert record["config_version"] == record["generated_contract"] == 0
        assert record["replay"] in ("historical-data", "previous-package")
        assert len(record["commit"]) == 40 and len(record["source_sha256"]) == 64
        assert record["fixture"] != record["expected"]
        assert hashlib.sha256((FIXTURES / record["expected"]).read_bytes()).hexdigest() == record["expected_sha256"]


@pytest.mark.parametrize("record", PROVENANCE, ids=lambda record: record["tag"])
def test_released_generated_baseline_regenerates_without_source_or_unrelated_loss(tmp_path: Path, record: dict) -> None:
    baseline = record["generated"]
    frozen = FIXTURES / baseline["directory"]
    original = {str(file.relative_to(frozen)): file.read_bytes() for file in frozen.rglob("*") if file.is_file()}
    assert {name: hashlib.sha256(value).hexdigest() for name, value in original.items()} == baseline["files"]
    assert set(baseline["source_sha256"]) == {
        "custom_components/marao_dashboard/const.py",
        "custom_components/marao_dashboard/generator.py",
        "custom_components/marao_dashboard/config_patch.py",
    }
    assert all(len(value) == 64 for value in baseline["source_sha256"].values())
    registration = yaml.load(original["configuration.yaml"], Loader=yaml.BaseLoader)["lovelace"]["dashboards"]
    assert list(registration) == [baseline["dashboard_key"]]
    assert registration[baseline["dashboard_key"]]["filename"] == baseline["filename"]
    output = tmp_path / "generated"
    active = output / baseline["slug"]
    shutil.copytree(frozen / "dashboard", active)
    manual = active / "manual/keep.yaml"
    manual.parent.mkdir()
    manual.write_bytes(b"# independent preservation sentinel\r\nmanual: retained\r\n")
    source = (FIXTURES / record["fixture"]).read_bytes()
    result = write_dashboard(json.loads(source), output)
    assert result.dashboard_key == baseline["dashboard_key"]
    assert manual.read_bytes() == b"# independent preservation sentinel\r\nmanual: retained\r\n"
    assert json.loads((active / ".marao-generated.json").read_bytes())["generated_contract"] == 3
    assert (FIXTURES / record["fixture"]).read_bytes() == source
    assert {str(file.relative_to(frozen)): file.read_bytes() for file in frozen.rglob("*") if file.is_file()} == original


def test_storage_baseline_and_preservation_inventory_are_immutable() -> None:
    assert INVENTORY["version"] == 1
    storage = INVENTORY["storage_baseline"]
    assert {storage["tag"], *(record["tag"] for record in PROVENANCE)} == {"v0.2.0", "v0.3.0", "v0.3.1", "v0.5.0", "v0.5.1"}
    assert storage["config_version"] is None
    assert storage["generated_contract"] == "native-storage-0"
    assert len(storage["commit"]) == 40 and len(storage["source_sha256"]) == 64
    for file, digest in INVENTORY["sha256"].items():
        assert hashlib.sha256((FIXTURES / file).read_bytes()).hexdigest() == digest
    native = json.loads((FIXTURES / storage["fixture"]).read_bytes())
    assert native == json.loads((FIXTURES / storage["expected"]).read_bytes())
    assert [view["path"] for view in native["views"]] == ["home", "outside"]
    assert "config_version" not in native
    assert {case["id"] for case in INVENTORY["preservation_cases"]} == {"customized-format-0", "explicit-empty"}


@pytest.mark.parametrize("case", INVENTORY["preservation_cases"], ids=lambda case: case["id"])
def test_full_expected_documents_and_owned_output_survive_generation(tmp_path: Path, case: dict) -> None:
    source = (FIXTURES / case["input"]).read_bytes()
    expected = json.loads((FIXTURES / case["expected"].replace("-expected.json", "-format-2-expected.json")).read_bytes())
    active = tmp_path / "active.json"
    active.write_bytes(source)
    raw = load_dashboard_config(active)
    converted = migrate_dashboard_config(raw)
    migrate_legacy_theme(converted)
    assert converted == expected
    assert raw == json.loads(source)
    registry = [{"entity_id": "light.marao_dashboard_test_light", "domain": "light", "area_id": "fixture-office", "has_state": True},
                {"entity_id": "light.marao_dashboard_test_room_light", "domain": "light", "area_id": "fixture-office", "has_state": True}]
    planned = plan_dashboard(converted, tmp_path / "generated", registry)
    assert not (tmp_path / "generated").exists() and active.read_bytes() == source
    output = tmp_path / "generated"
    result = write_dashboard(raw, output, registry)
    root = output / result.slug
    owned = json.loads((FIXTURES / "unrelated-ownership.json").read_bytes())
    manual = root / owned["file"]["path"]
    manual.parent.mkdir(parents=True)
    manual.write_bytes(owned["file"]["content"].encode())
    custom = (FIXTURES / "preserved-custom-cards.yaml").read_bytes()
    room_paths = sorted((root / "views/rooms").glob("*.yaml"))
    if room_paths:
        room = room_paths[0]
        room.write_bytes(room.read_bytes().replace(b"  # marao:custom:start\n", b"  # marao:custom:start\n" + custom))
    baseline = snapshot_dashboard(active, output, raw)
    archive = output / ".history" / baseline["version"]
    before = {str(file.relative_to(archive)): file.read_bytes() for file in archive.rglob("*") if file.is_file()}
    write_dashboard(converted, output, registry)
    assert manual.read_bytes() == owned["file"]["content"].encode()
    if room_paths:
        assert custom in room.read_bytes()
        empty = (root / "views/rooms/01-empty.yaml").read_text()
        assert yaml.load(empty, Loader=MaraoDashboardLoader)["path"] == "room-empty"
        assert "light.marao_dashboard_test" not in empty
    else:
        assert not room_paths and not (root / "views/main/03-energy.yaml").exists()
    assert {str(file.relative_to(archive)): file.read_bytes() for file in archive.rglob("*") if file.is_file()} == before
    assert active.read_bytes() == source and (FIXTURES / case["input"]).read_bytes() == source
    assert planned.dashboard_key == result.dashboard_key


@pytest.mark.parametrize("record", PROVENANCE, ids=lambda record: record["tag"])
def test_released_room_selections_and_navigation_survive_generation(tmp_path: Path, record: dict) -> None:
    fixture = FIXTURES / record["fixture"]
    source = fixture.read_bytes()
    assert hashlib.sha256(source).hexdigest() == record["fixture_sha256"]
    config = load_dashboard_config(fixture)
    before = json.loads(source)
    result = write_dashboard(config, tmp_path / "generated")
    output = tmp_path / "generated" / result.slug
    rooms = yaml.load((output / "views/main/02-rooms.yaml").read_text(), Loader=MaraoDashboardLoader)["cards"][0]["cards"]
    for original, card in zip(before["rooms"], rooms, strict=True):
        assert card["name"] == original["name"]
        assert card["icon"] == original.get("icon", "mdi:sofa-outline")
        members = original.get("entities", {})
        lights = members.get("light", []) if isinstance(members, dict) else [e for e in members if str(e).startswith("light.")]
        expected = [e["entity_id"] if isinstance(e, dict) else e for e in lights]
        assert card["variables"]["light_entities"] == expected
        assert card["tap_action"]["action"] == "navigate"
        assert card["tap_action"]["navigation_path"].endswith("/" + original.get("path", "room-" + original["name"].lower().replace(" ", "-")))
    saved = tmp_path / "saved.json"
    write_dashboard_config(config, saved)
    assert json.loads(saved.read_bytes()) == before
    assert fixture.read_bytes() == source


def test_manual_room_options_remain_raw_and_preview_does_not_write(tmp_path: Path) -> None:
    config = load_dashboard_config(FIXTURES / "v0.5.1-dashboard.json")
    manual = {"type": "custom:marao-card", "template": "md_room_card", "name": "Manual bedroom", "icon": "mdi:bed",
              "entity": "sensor.unrelated", "show_icon": False, "show_name": False,
              "variables": {"light_entities": ["light.first", "light.second", "light.first"], "custom_label": "Reading corner", "future_option": {"retain": True}},
              "tap_action": {"action": "navigate", "navigation_path": "/marao-dashboard/empty-room", "haptic": "heavy"},
              "extension": ["second", "first"]}
    config["rooms"][0].setdefault("cards", []).append(manual)
    config["rooms"][0]["extension"] = {"retain": True}
    source = json.dumps(config, indent=2, ensure_ascii=False) + "\n"
    active = tmp_path / "active.json"
    active.write_text(source)
    plan_dashboard(config, tmp_path / "preview")
    assert not (tmp_path / "preview").exists()
    assert active.read_text() == source
    generated = write_dashboard(config, tmp_path / "generated")
    view = next((tmp_path / "generated" / generated.slug / "views/rooms").glob("00-*.yaml"))
    cards = yaml.load(view.read_text(), Loader=MaraoDashboardLoader)["cards"]
    owned_sections = [card for card in cards if isinstance(card, dict) and card.get("type") == "custom:marao-control-grid"]
    assert any(manual in section["cards"] for section in owned_sections)
    write_dashboard_config(config, active)
    assert active.read_text() == source


def test_energy_options_and_unknown_raw_content_survive_save_generation_and_archive(tmp_path: Path) -> None:
    source = (FIXTURES / "energy-formatting-input.json").read_bytes()
    expected = json.loads((FIXTURES / "energy-formatting-format-2-expected.json").read_bytes())
    path = tmp_path / "dashboard.json"
    path.write_bytes(source)
    config = load_dashboard_config(path)
    registry = [{"entity_id": "sensor.energy", "unit_of_measurement": "Wh"},
                {"entity_id": "sensor.power", "unit_of_measurement": "W"},
                {"entity_id": "sensor.cost", "unit_of_measurement": "EUR"}]
    assert migrate_dashboard_config(config) == expected
    plan_dashboard(config, tmp_path / "generated", registry)
    assert path.read_bytes() == source
    result = write_dashboard(config, tmp_path / "generated", registry)
    output = tmp_path / "generated" / result.slug
    room = (output / "views/rooms/00-room.yaml").read_text()
    assert room.count("entity: sensor.energy") == 2
    assert "display_precision: 0" in room and "display_precision: 6" in room
    assert "Untouched raw card" in room
    assert "Custom raw card" in (output / "views/custom/00-custom.yaml").read_text()
    summary = (output / "views/main/03-energy.yaml").read_text()
    sheet = (output / "components/popups/energy_today_power.yaml").read_text()
    assert "display_unit: kWh" in summary and "display_unit: kWh" in sheet
    assert "display_precision: 0" in summary and "display_precision: 0" in sheet
    version = snapshot_dashboard(path, tmp_path / "generated", config)
    archive = tmp_path / "generated/.history" / version["version"]
    before = {str(file.relative_to(archive)): file.read_bytes() for file in archive.rglob("*") if file.is_file()}
    assert before["dashboard.json"] == source
    config = migrate_dashboard_config(config)
    write_dashboard_config(config, path)
    assert load_dashboard_config(path) == expected
    energy = next(page for page in config["pages"] if page["path"] == "energy")
    energy["sections"][0]["entities"][0]["variables"]["display_precision"] = 2
    write_dashboard(config, tmp_path / "generated", registry)
    assert {str(file.relative_to(archive)): file.read_bytes() for file in archive.rglob("*") if file.is_file()} == before
    assert (FIXTURES / "energy-formatting-input.json").read_bytes() == source
