"""Tests for Marao Dashboard frontend dependency detection."""

from __future__ import annotations

import json

from custom_components.marao_dashboard.dependencies import (
    CORE_DEPENDENCY_IDS,
    DEPENDENCIES,
    dependency_statuses,
    detect_installed_dependencies,
    normalize_resource_url,
    required_dependencies,
)


def test_dependency_catalog_is_canonical() -> None:
    assert [(item.id, item.tested_version) for item in DEPENDENCIES] == [
        ("button_card", "7.0.1"),
        ("my_cards", "1.0.6"),
        ("kiosk_mode", "14.0.1"),
        ("card_mod", "4.2.1"),
        ("mini_graph_card", "0.13.0"),
        ("bubble_card", "3.2.4"),
        ("navbar_card", "1.6.1"),
    ]
    assert all(item.repository.startswith("https://github.com/") for item in DEPENDENCIES)
    assert all("/redirect/hacs_repository/" in item.hacs_url for item in DEPENDENCIES)
    assert all(item.used_by and all(item.used_by) for item in DEPENDENCIES)


def test_resource_url_normalization_and_detection() -> None:
    assert normalize_resource_url(
        " HTTPS://ha.example/HACSFILES/Button-Card//button-card.js?hacstag=7#ignored "
    ) == "/hacsfiles/button-card/button-card.js"
    assert normalize_resource_url(None) == ""

    assert detect_installed_dependencies(
        [
            {"url": "/hacsfiles/button-card/button-card.js?hacstag=7"},
            "/local/button_card.js",
            "/HACSFILES/Bubble-Card/bubble-card.js#3.2.4",
            "/local/other.js?target=/mini-graph-card/mini-graph-card-bundle.js",
        ],
        ["/hacsfiles/lovelace-card-mod/card-mod.js?v=4.2.1"],
    ) == frozenset({"button_card", "bubble_card", "card_mod"})
    assert detect_installed_dependencies(["/local/button_card.js"]) == frozenset(
        {"button_card"}
    )


def test_required_dependencies_follow_dashboard_features() -> None:
    assert required_dependencies({"name": "Empty", "rooms": []}) == CORE_DEPENDENCY_IDS

    config = {
        "name": "Feature dashboard",
        "rooms": [
            {
                "name": "Living room",
                "entities": {
                    "light": ["light.ceiling"],
                    "switch": ["switch.television"],
                    "camera": [{"entity_id": "camera.entry"}],
                },
            }
        ],
    }
    assert required_dependencies(config) == frozenset(item.id for item in DEPENDENCIES)


def test_required_dependencies_understand_templates_and_guided_pages() -> None:
    assert "my_cards" in required_dependencies(
        {"rooms": [{"cards": [{"type": "custom:button-card", "template": "hc_fan_card"}]}]}
    )
    assert {"mini_graph_card", "bubble_card"} <= required_dependencies(
        {"pages": {"energy": {"house_power": "sensor.house_power"}}}
    )
    assert "bubble_card" in required_dependencies(
        {"overview": {"scenes": ["scene.relax"]}}
    )
    assert "bubble_card" in required_dependencies(
        {"rooms": [{"entities": ["sensor.phone_battery"]}]}
    )
    assert required_dependencies(
        {"rooms": [{"exclude": ["light.not_rendered"]}]}
    ) == CORE_DEPENDENCY_IDS


def test_dependency_statuses_are_json_ready() -> None:
    statuses = dependency_statuses(
        {"name": "Empty", "rooms": []},
        [
            "/hacsfiles/button-card/button-card.js",
            "/hacsfiles/kiosk-mode/kiosk-mode.js",
            "/hacsfiles/lovelace-navbar-card/navbar-card.js",
        ],
        ["/hacsfiles/lovelace-card-mod/card-mod.js"],
    )
    by_id = {item["id"]: item for item in statuses}

    assert set(statuses[0]) == {
        "hacs_url",
        "id",
        "name",
        "repository",
        "required",
        "status",
        "tested_version",
        "used_by",
    }
    assert {item["status"] for item in statuses} <= {"installed", "not_detected"}
    assert by_id["button_card"]["status"] == "installed"
    assert by_id["card_mod"]["status"] == "installed"
    assert by_id["my_cards"]["status"] == "not_detected"
    assert by_id["my_cards"]["required"] is False
    assert by_id["my_cards"]["repository"].startswith("https://github.com/")
    assert by_id["my_cards"]["used_by"] == ["Light, cover, and fan sliders"]
    assert json.loads(json.dumps(statuses)) == statuses
