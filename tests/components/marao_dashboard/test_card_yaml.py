"""Inline HA card preservation and validation at the generation boundary."""
from copy import deepcopy
import json
from pathlib import Path

import pytest
import yaml

from custom_components.marao_dashboard import generator as g
from custom_components.marao_dashboard.card_yaml import parse_card_yaml

FIXTURE = json.loads((Path(__file__).parents[2] / 'frontend/lovelace-cards.fixture.json').read_text())


def dashboard(columns=2):
    return {"config_version": 2, "name": "Native", "landing_page": "home", "pages": [{"name": "Home", "path": "home",
        **({"columns": columns} if columns else {}), "entities": [
            {"entity_id": "light.safe", "template": "md_light_card"},
            {"id": "external", "template": "ha_card", "yaml": FIXTURE['source'], "future": {"keep": True}}],
        "cards": [{"type": "markdown", "content": "Existing raw"}]}]}


def test_yaml_parser_preserves_native_semantics_and_merge_overrides():
    assert parse_card_yaml(FIXTURE['source']) == FIXTURE['expected']
    for source, value in FIXTURE['scalars'].items():
        assert parse_card_yaml('type: markdown\nx: ' + source)['x'] == value
    assert parse_card_yaml('type: tile\nx: off\ny: "on"') == {"type": "tile", "x": False, "y": "on"}


@pytest.mark.parametrize('source', FIXTURE['invalid'])
def test_invalid_yaml_is_rejected(source):
    with pytest.raises(ValueError):
        parse_card_yaml(source)


@pytest.mark.parametrize('columns', [None, 2])
def test_full_generation_preserves_custom_types_nested_options_and_exact_source(tmp_path, columns):
    source = dashboard(columns)
    before = deepcopy(source)
    resolved = g._resolve_pages(source)
    grid = g._page_view(resolved['pages'][0], '', 'marao-dashboard')['cards'][0]
    assert grid['cards'][1] == FIXTURE['expected']
    assert grid['native_cards'] == [1]
    if columns is None:
        assert grid['groups'][1] == {'count': 1, 'columns': 1}
    result = g.write_dashboard(source, tmp_path)
    views = [path for path in tmp_path.rglob('*.yaml') if 'views' in path.parts]
    assert views
    assert any('custom:button-card' in path.read_text() and 'custom:mini-graph-card' in path.read_text() for path in views)
    assert source == before
    assert resolved['pages'][0]['entities'][1]['yaml'] == FIXTURE['source']
    from custom_components.marao_dashboard import _generated_dashboard_needs_self_contained_repair
    assert not _generated_dashboard_needs_self_contained_repair(tmp_path / result.slug)
    from custom_components.marao_dashboard.editor import native_card_labels
    assert native_card_labels(source)[FIXTURE['source']]['type'] == FIXTURE['expected']['type']
    assert result.slug


def test_invalid_native_yaml_leaves_existing_generated_files_untouched(tmp_path):
    source = dashboard()
    g.write_dashboard(source, tmp_path)
    before = {p.relative_to(tmp_path): p.read_bytes() for p in tmp_path.rglob('*') if p.is_file()}
    source['pages'][0]['entities'][1]['yaml'] = 'type: ['
    with pytest.raises(ValueError):
        g.write_dashboard(source, tmp_path)
    assert {p.relative_to(tmp_path): p.read_bytes() for p in tmp_path.rglob('*') if p.is_file()} == before


def test_save_and_history_retain_yaml_and_invalid_save_preserves_every_file(hass):
    from custom_components.marao_dashboard import _save_and_generate_dashboard
    from custom_components.marao_dashboard.const import DEFAULT_DASHBOARD_CONFIG
    from custom_components.marao_dashboard.history import snapshot_dashboard, restore_dashboard_version

    path = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    path.parent.mkdir(parents=True, exist_ok=True)
    source = dashboard()
    path.write_text(json.dumps(source))
    _save_and_generate_dashboard(hass, json.dumps(source), [])
    saved = json.loads(path.read_text())
    assert saved['pages'][0]['entities'][1] == source['pages'][0]['entities'][1]
    version = snapshot_dashboard(path, path.parent, saved)
    before = {p: p.read_bytes() for p in path.parent.rglob('*') if p.is_file()}
    invalid = deepcopy(saved)
    invalid['pages'][0]['entities'][1]['yaml'] = 'type: ['
    with pytest.raises(ValueError):
        _save_and_generate_dashboard(hass, json.dumps(invalid), [])
    assert {p: p.read_bytes() for p in path.parent.rglob('*') if p.is_file()} == before
    changed = deepcopy(saved)
    changed['pages'][0]['entities'][1]['yaml'] = 'type: markdown\ncontent: Changed\n'
    _save_and_generate_dashboard(hass, json.dumps(changed), [])
    restored, _ = restore_dashboard_version(path, path.parent, version['version'])
    assert restored['pages'][0]['entities'][1] == source['pages'][0]['entities'][1]
