"""Released input aliases stay read-only and match the current owned namespace."""
from copy import deepcopy
import pytest
from custom_components.marao_dashboard.card_names import LEGACY_TEMPLATES, canonical_card, canonical_options
from custom_components.marao_dashboard import generator as g


def test_owned_aliases_preserve_source_unknown_fields_entity_ids_and_service_data():
    old = {"template":"hc_media_card","entity_id":"media_player.hc_lounge","name":"hc_custom","variables":{"hc_show_background_art":False,"hc_background_color":"#123456","hc_custom":[]},"tap_action":{"action":"call-service","data":{"template":"hc_light_card"}}}
    before=deepcopy(old);new=canonical_card(old)
    assert new["template"]=="md_media_card" and new["variables"]["md_show_background_art"] is False
    assert new["variables"]["md_background_color"]=="#123456" and new["variables"]["hc_custom"]==[]
    assert new["entity_id"]==old["entity_id"] and new["tap_action"]==old["tap_action"] and old==before
    raw={"type":"custom:foreign-card","template":"hc_light_card","variables":{"hc_color":"red"}}
    assert canonical_card(raw) is raw
    with pytest.raises(ValueError,match="Conflicting"):
        canonical_options({"hc_color":"red","md_color":"blue"})




def test_released_pages_generate_current_cards_without_rewriting_source():
    source={"config_version":2,"name":"Safe","landing_page":"home","pages":[{"name":"Home","path":"home","entities":[{"id":"light","template":"hc_light_card","entity_id":"light.hc_safe","variables":{"enable_slider":False,"hc_card_color":"#123456","future":[]}}]}]}
    before=deepcopy(source)
    item=g._resolve_pages(source)["pages"][0]["_sections"][0]["ordered_cards"][0]
    card=g._page_card(item,"marao-dashboard")
    assert card["template"]=="md_light_card" and card["variables"]["md_card_color"]=="#123456"
    assert card["entity"]=="light.hc_safe" and card["variables"]["future"]==[] and source==before


def test_legacy_energy_templates_keep_unit_validation():
    for template in ("hc_graph_card", "md_graph_card"):
        with pytest.raises(ValueError, match="incompatible"):
            g._validate_energy_formatting({"template": template, "entity_id": "sensor.safe", "variables": {"display_unit": "kWh"}}, [{"entity_id": "sensor.safe", "unit_of_measurement": "W"}])


def test_namespace_v1_matches_independent_expected_json_and_is_read_only_idempotent(tmp_path):
    import hashlib
    import json
    from pathlib import Path
    fixtures = Path(__file__).parents[3] / 'ha-test/upgrade/fixtures'
    provenance = json.loads((fixtures / 'namespace-v1-provenance.json').read_text())
    for name, digest in provenance['sha256'].items():
        assert hashlib.sha256((fixtures / name).read_bytes()).hexdigest() == digest
    source = json.loads((fixtures / 'namespace-v1-input.json').read_text())
    expected = json.loads((fixtures / 'namespace-v1-expected.json').read_text())
    before = deepcopy(source)
    assert g.migrate_dashboard_config(source) == expected
    assert g.migrate_dashboard_config(expected) == expected
    assert source == before
    path = tmp_path / 'dashboard.json'
    exact = (json.dumps(source, indent=1) + '\r\n').encode()
    path.write_bytes(exact)
    assert g.migrate_dashboard_config(g.load_dashboard_config(path)) == expected
    assert path.read_bytes() == exact


def test_namespace_v1_conflicts_and_newer_sources_do_not_mutate_saved_data(tmp_path):
    import json
    source = {'config_version': 2, 'name': 'Safe', 'landing_page': 'home', 'pages': [{'name': 'Home', 'path': 'home', 'entities': [
        {'entity_id': 'light.safe', 'template': 'hc_light_card', 'variables': {'hc_color': 'red', 'md_color': 'blue'}},
    ]}]}
    for config in (source, {**source, 'config_version': 3}):
        before = deepcopy(config)
        path = tmp_path / 'dashboard.json'
        exact = json.dumps(config).encode(); path.write_bytes(exact)
        with pytest.raises(ValueError):
            g.migrate_dashboard_config(config)
        assert config == before and path.read_bytes() == exact
