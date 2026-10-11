"""Independent canonical input and trust-boundary checks."""
import json
from copy import deepcopy
from pathlib import Path

import pytest

from custom_components.marao_dashboard.page_model import page_entries, validate_pages

SOURCE = json.loads((Path(__file__).parents[2] / "frontend/canonical-pages.fixture.json").read_text())
TEMPLATES = {role: [] for role in ("hc_title_card", "hc_room_card", "hc_navigation_card", "hc_scene_collection_card", "hc_entity_group_card")}
TEMPLATES.update({"hc_weather_card": ["weather"], "hc_light_card": ["light"]})


def test_page_model_preserves_all_scopes_and_explicit_empty_or_absent_content():
    before = deepcopy(SOURCE)
    assert validate_pages(SOURCE, TEMPLATES) == {"home", "office", "empty", "absent"}
    assert SOURCE == before
    entries = page_entries(SOURCE["pages"][0]["sections"][1]["entities"])
    assert [entry["template"] for entry in entries] == ["hc_room_card", "hc_scene_collection_card", "hc_entity_group_card"]
    assert entries[1]["entities"][0]["extension"] is True
    assert page_entries(SOURCE["pages"][1]["entities"])[0] == {"entity_id": "sensor.safe"}
    assert page_entries({"custom": {"template": "hc_title_card", "name": "Title"}}) == [{"template": "hc_title_card", "name": "Title"}]


@pytest.mark.parametrize("change", [
    lambda c: c.update(config_version=True),
    lambda c: c.update(config_version=3),
    lambda c: c.update(overview={}),
    lambda c: c.update(pages=[]),
    lambda c: c.update(landing_page="removed"),
    lambda c: c["pages"][1].update(path="home"),
    lambda c: c["pages"][1].update(path="../office"),
    lambda c: c["pages"][1].update(id="home"),
    lambda c: c["pages"][0].update(entities=[]),
    lambda c: c["pages"][0]["sections"][0].update(sections=[]),
    lambda c: c["pages"][0]["sections"][0].update(columns=True),
    lambda c: c["pages"][0]["sections"][0].update(columns=7),
    lambda c: c["pages"][2].update(cards=["markdown"]),
    lambda c: c["pages"][2].update(entities=[True]),
    lambda c: c["pages"][0]["sections"][1]["entities"][0].update(id="weather"),
    lambda c: c["pages"][0]["sections"][0]["entities"][1].pop("entity_id"),
    lambda c: c["pages"][0]["sections"][0]["entities"][1].update(entity_id="light.safe"),
    lambda c: c["pages"][0]["sections"][0]["entities"][1].update(template="hc_unrecognized_card"),
    lambda c: c["pages"][0]["sections"][0]["entities"][1].update(variables=[]),
    lambda c: c["pages"][0]["sections"][1]["entities"][0].update(page="removed"),
    lambda c: c["pages"][0]["sections"][1]["entities"][0].pop("page"),
    lambda c: c.update(navigation=["removed"]),
    lambda c: c.update(navigation=["home"] * 6),
    lambda c: c["pages"][0]["sections"][1]["entities"][1].update(entities=["lock.safe"]),
])
def test_page_model_rejects_invalid_source_without_mutating_it(change):
    config = deepcopy(SOURCE)
    change(config)
    before = deepcopy(config)
    with pytest.raises(ValueError):
        validate_pages(config, TEMPLATES)
    assert config == before


def test_page_model_accepts_empty_page_without_reinsertion():
    config = {"config_version": 2, "name": "Quiet", "landing_page": "quiet", "navigation": [], "pages": [{"name": "Quiet", "path": "quiet"}]}
    assert validate_pages(config, TEMPLATES) == {"quiet"}
    assert "entities" not in config["pages"][0]


@pytest.mark.parametrize("card,message", [
    ({"template": "hc_energy_period_card", "entity_id": "sensor.safe", "variables": {"period": "year"}}, "period"),
    ({"template": "hc_wallbox_current_card", "entity_id": "number.safe", "variables": {"shortcuts": [True]}}, "shortcuts"),
    ({"template": "hc_wallbox_current_card", "entity_id": "number.safe", "variables": {"shortcuts": [float("inf")]}}, "shortcuts"),
    ({"template": "hc_wallbox_current_card", "entity_id": "number.safe", "variables": {"shortcuts": [1, 2, 3, 4]}}, "shortcuts"),
    ({"template": "hc_media_app_card", "entity_id": "media_player.safe", "variables": {"app_source": " "}}, "source"),
    ({"template": "hc_room_card", "page": "home", "variables": {"light_entities": ["switch.safe"]}}, "Room lights"),
    ({"template": "hc_media_card", "entity_id": "media_player.safe", "apple_tv": {"remote_entity": "lock.safe"}}, "remote"),
    ({"template": "hc_media_card", "entity_id": "media_player.safe", "apple_tv": {"apps": [{"name": "Missing source"}]}}, "sources"),
    ({"template": "hc_access_hold_action_card", "entity_id": "button.safe", "tap_action": {"action": "perform-action", "perform_action": "lock.unlock", "target": {"entity_id": "lock.safe"}}}, "Security action"),
])
def test_promoted_card_options_are_validated_at_the_shared_boundary(card, message):
    from custom_components.marao_dashboard.editor import EDITOR_CATALOG
    templates = {item["id"]: item["domains"] for item in EDITOR_CATALOG["cards"]}
    config = {"config_version": 2, "name": "Safe", "landing_page": "home", "pages": [{"name": "Home", "path": "home", "entities": [card]}]}
    before = deepcopy(config)
    with pytest.raises(ValueError, match=message):
        validate_pages(config, templates)
    assert config == before
