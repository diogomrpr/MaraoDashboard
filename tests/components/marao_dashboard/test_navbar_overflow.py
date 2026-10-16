"""Independent navigation expectations across saved formats, generation and history."""
from copy import deepcopy
import json
from pathlib import Path

import pytest

from custom_components.marao_dashboard import generator as g
from custom_components.marao_dashboard.history import snapshot_dashboard, restore_dashboard_version
from custom_components.marao_dashboard.native import compile_card, native_type

FIXTURE = Path(__file__).parents[2] / "frontend/navbar-overflow.fixture.json"
EXPECTED = json.loads(FIXTURE.read_text())


@pytest.mark.parametrize("count", [0, 1, 5, 6, 8])
def test_current_and_native_route_lists_round_trip_without_partition_or_mutation(tmp_path, count):
    routes = EXPECTED["routes"][:count]
    # Builder URL routes use url; native also accepts the path alias unchanged.
    builder = [{**row, "url": row.get("url", row.get("path"))} for row in routes]
    source = {"config_version": 2, "name": "Overflow", "slug": "overflow", "landing_page": "overview", "navigation": builder,
              "pages": [{"name": "Home", "path": "overview", "entities": []}, {"name": "Unpinned", "path": "unpinned", "entities": []}], "future": []}
    exact = deepcopy(source)
    for _ in range(2):
        normalized = g.normalize_config(source)
        assert g._navigation_bar(normalized, "marao-dashboard")["cards"][0]["routes"] == builder
        generated = g.write_dashboard(source, tmp_path, dashboard_key_override="marao-dashboard")
        assert (tmp_path / generated.slug / "views/pages/unpinned.yaml").exists()
    assert source == exact
    native = {"type": native_type("navbar"), "routes": deepcopy(routes), "future": []}
    before = deepcopy(native)
    assert compile_card(native, "native-overflow", "marao-dashboard")["card"] == {**native, "type": "custom:marao-navbar-card"}
    assert native == before


@pytest.mark.parametrize("version", [0, 1])
def test_legacy_explicit_routes_append_without_changing_default_selection(version):
    custom = [{**row, "url": row.get("url", row.get("path"))} for row in EXPECTED["routes"]]
    source = {"name": "Overflow", "slug": "overflow", "rooms": [], "pages": {}, "navigation": custom}
    if version:
        source["config_version"] = version
    before = deepcopy(source)
    assert g._navigation_bar(source, "marao-dashboard")["cards"][0]["routes"] == EXPECTED["legacy_automatic"] + custom
    converted = g.migrate_dashboard_config(source)
    assert converted["navigation"][-len(custom):] == custom
    assert g.migrate_dashboard_config(converted) == converted
    assert source == before
    source.pop("navigation")
    source["pages"] = {"security": {}, "energy": {}, "wallbox": {}, "media": {}}
    assert len(g._navigation_bar(source, "marao-dashboard")["cards"][0]["routes"]) == 5


def test_long_list_history_restores_exact_source_and_protected_content(tmp_path):
    routes = [{**row, "url": row.get("url", row.get("path"))} for row in EXPECTED["routes"]]
    source = {"config_version": 2, "name": "Overflow", "slug": "overflow", "landing_page": "home", "navigation": routes,
              "pages": [{"name": "Home", "path": "home", "entities": []}], "future": {"keep": []}}
    filename = tmp_path / "dashboard.json"
    filename.write_text(json.dumps(source, indent=4) + "\n")
    exact = filename.read_bytes()
    g.write_dashboard(source, tmp_path)
    custom = tmp_path / "overflow/manual.yaml"
    custom.write_text("custom: preserved exactly\n")
    saved = snapshot_dashboard(filename, tmp_path, source)
    archived = {p.relative_to(tmp_path / '.history'): p.read_bytes() for p in (tmp_path / '.history').rglob('*') if p.is_file()}
    filename.write_text(json.dumps({**source, "navigation": []}))
    restored, _ = restore_dashboard_version(filename, tmp_path, saved["version"])
    assert restored == source and filename.read_bytes() == exact
    assert custom.read_text() == "custom: preserved exactly\n"
    assert all((tmp_path / '.history' / p).read_bytes() == data for p, data in archived.items())


@pytest.mark.parametrize("routes", [None, {}, [None], [{"label": "Missing"}], [{"url": "/x", "label": ""}]])
def test_native_invalid_routes_are_rejected_without_mutating_input(routes):
    source = {"type": native_type("navbar"), "routes": routes}
    before = deepcopy(source)
    with pytest.raises(ValueError):
        compile_card(source, "native-overflow", "marao-dashboard")
    assert source == before


@pytest.mark.parametrize("version", [0, 1])
@pytest.mark.parametrize("route", [" ", {}, {"page": None}, {"url": "/x"}, {"url": " ", "label": "Bad"}])
def test_legacy_malformed_routes_preflight_without_writes(tmp_path, version, route):
    source = {"name": "Safe", "rooms": [], "navigation": [route]}
    if version:
        source["config_version"] = version
    before = deepcopy(source)
    with pytest.raises(ValueError, match="Navigation entries"):
        g.write_dashboard(source, tmp_path)
    assert source == before and not list(tmp_path.iterdir())
