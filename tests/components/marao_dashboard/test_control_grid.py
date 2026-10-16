"""Uniform owned output with independently specified source and child expectations."""
from copy import deepcopy
import json
from pathlib import Path

import pytest

from custom_components.marao_dashboard import generator as g
from custom_components.marao_dashboard.history import snapshot_dashboard, restore_dashboard_version

FIXTURES = Path(__file__).parents[3] / "ha-test/upgrade/fixtures"


@pytest.mark.parametrize("columns", range(1, 7))
def test_fixed_mixed_controls_keep_exact_order_options_and_preferred_columns(columns):
    entries = [
        {"entity_id": "light.safe", "template": "hc_light_card", "name": "Simple", "variables": {"enable_slider": False, "future": []}},
        {"entity_id": "cover.safe", "template": "hc_cover_card", "name": "Shade"},
        {"entity_id": "lock.safe", "template": "hc_access_action_card", "name": "Lock", "variables": {"action_service": "lock.lock"}},
    ]
    source = {"config_version": 2, "name": "Controls", "landing_page": "home", "pages": [
        {"name": "Home", "path": "home", "sections": [{"columns": columns, "entities": entries}]}]}
    before = deepcopy(source)
    page = g._resolve_pages(source)["pages"][0]
    view = g._page_view(page, "", "marao-dashboard")
    assert view["cards"][0] == {"type": "custom:marao-control-grid", "columns": columns, "cards": [
        {"type": "custom:marao-card", "template": "hc_light_card", "entity": "light.safe", "name": "Simple", "variables": {"enable_slider": False, "future": []}},
        {"type": "custom:marao-card", "template": "hc_cover_card", "entity": "cover.safe", "name": "Shade"},
        {"type": "custom:marao-card", "template": "hc_access_action_card", "entity": "lock.safe", "name": "Lock", "variables": {"action_service": "lock.lock", "popup_hash": "#page-home-card-3-popup"}},
    ]}
    assert source == before


@pytest.mark.parametrize("raw", [{"type": "markdown", "content": "Keep"}, {"type": "custom:marao-card", "template": "hc_light_card", "entity": "light.raw"}])
def test_raw_provenance_and_non_control_fallback_do_not_split_or_discard(raw):
    for extra in [[], [{"entity_id": "climate.safe", "template": "hc_climate_card"}]]:
        source = {"config_version": 2, "name": "Mixed", "landing_page": "home", "pages": [{"name": "Home", "path": "home", "sections": [
            {"columns": 2, "entities": [{"entity_id": "light.safe"}, *extra], "cards": [raw]}]}]}
        before = deepcopy(source)
        view = g._page_view(g._resolve_pages(source)["pages"][0], "", "marao-dashboard")
        assert view["cards"][0]["type"] == "grid"
        assert view["cards"][0]["cards"][-1] == raw
        assert len(view["cards"][0]["cards"]) == len(extra) + 2
        assert source == before


def test_automatic_empty_and_access_popup_keep_existing_boundaries_and_actions():
    source = {"config_version": 2, "name": "Automatic", "landing_page": "home", "pages": [{"name": "Home", "path": "home", "sections": [
        {"entities": [{"entity_id": "light.safe"}, {"entity_id": "cover.safe"}]}, {"columns": 2, "entities": []}]}]}
    cards = g._page_view(g._resolve_pages(source)["pages"][0], "", "marao-dashboard")["cards"]
    assert [(card["type"], card["columns"]) for card in cards if isinstance(card, dict)] == [("custom:marao-control-grid", 1), ("custom:marao-control-grid", 2)]
    popup = g._access_popup({"entity_id": "lock.safe", "name": "Door"})
    assert popup["cards"][0]["type"] == "custom:marao-control-grid"
    assert [card["variables"]["action_service"] for card in popup["cards"][0]["cards"]] == ["lock.unlock", "lock.lock"]
    assert [card["template"] for card in popup["cards"][0]["cards"]] == ["hc_access_slide_action_card", "hc_access_action_card"]


@pytest.mark.parametrize("record", json.loads((FIXTURES / "provenance.json").read_text()), ids=lambda record: record["tag"])
def test_released_sources_preserve_source_and_generated_children(tmp_path, record):
    filename = FIXTURES / record["fixture"]
    exact = filename.read_bytes()
    source = json.loads(exact)
    expected = json.loads((FIXTURES / record["expected"].replace("-expected.json", "-format-2-expected.json")).read_text())
    assert g.migrate_dashboard_config(source) == expected
    g.plan_dashboard(source, tmp_path)
    assert not list(tmp_path.iterdir())
    result = g.write_dashboard(source, tmp_path)
    first = {p.relative_to(tmp_path): p.read_bytes() for p in tmp_path.rglob("*.yaml")}
    g.write_dashboard(source, tmp_path)
    assert first == {p.relative_to(tmp_path): p.read_bytes() for p in tmp_path.rglob("*.yaml")}
    assert filename.read_bytes() == exact and source == json.loads(exact)
    assert result.slug


def test_history_retains_exact_source_unknown_options_and_unrelated_output(tmp_path):
    source = {"config_version": 2, "name": "Controls", "slug": "controls", "landing_page": "home", "future": [], "pages": [
        {"name": "Home", "path": "home", "sections": [{"columns": 2, "entities": [{"entity_id": "light.safe", "variables": {"enable_slider": False, "unknown": []}}]}, {"entities": []}]}]}
    filename = tmp_path / "dashboard.json"; filename.write_text(json.dumps(source, indent=4) + "\n"); exact = filename.read_bytes()
    g.write_dashboard(source, tmp_path)
    sentinel = tmp_path / "controls/manual.yaml"; sentinel.write_text("manual: unchanged\n")
    saved = snapshot_dashboard(filename, tmp_path, source)
    archived = {p: p.read_bytes() for p in (tmp_path / ".history").rglob("*") if p.is_file()}
    filename.write_text(json.dumps({**source, "name": "Changed draft"}))
    restored, _ = restore_dashboard_version(filename, tmp_path, saved["version"])
    assert restored == source and filename.read_bytes() == exact and sentinel.read_text() == "manual: unchanged\n"
    assert all(p.read_bytes() == content for p, content in archived.items())
    for invalid in [{**source, "config_version": 999}, {**source, "pages": None}]:
        before = {p: p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()}
        with pytest.raises(ValueError):
            g.write_dashboard(invalid, tmp_path)
        assert before == {p: p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()}
