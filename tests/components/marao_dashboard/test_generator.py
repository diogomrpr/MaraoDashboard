from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from custom_components.marao_dashboard.generator import (
    MaraoDashboardLoader,
    build_base_dashboard_config,
    ensure_dashboard_config,
    load_dashboard_config,
    make_slug,
    migrate_legacy_theme,
    resolve_dashboard_config,
    write_dashboard,
)


def test_slug_generation() -> None:
    assert make_slug("Sala e Cozinha") == "sala-e-cozinha"
    assert make_slug("  Geracao Arvore  ") == "geracao-arvore"
    assert make_slug("") == "dashboard"


def test_hybrid_area_and_explicit_entities() -> None:
    config = {
        "name": "BD Mobile",
        "rooms": [
            {
                "name": "Sala",
                "area": "sala",
                "entities": {
                    "light": [
                        {
                            "entity_id": "light.manual_lamp",
                            "name": "Manual Lamp",
                        }
                    ]
                },
                "exclude": ["light.excluded"],
                "overrides": {
                    "light.area_lamp": {"name": "Area Lamp Override"},
                },
            }
        ],
    }
    registry = [
        {"entity_id": "light.area_lamp", "area_id": "sala", "name": "Area Lamp"},
        {"entity_id": "light.excluded", "area_id": "sala", "name": "Excluded"},
        {"entity_id": "cover.window", "area_id": "sala", "name": "Window"},
        {"entity_id": "automation.skip_me", "area_id": "sala", "name": "Skip"},
    ]

    resolved = resolve_dashboard_config(config, registry)
    room = resolved["rooms"][0]
    lights = room["entities_by_domain"]["light"]

    assert [entity["entity_id"] for entity in lights] == ["light.area_lamp", "light.manual_lamp"]
    assert lights[0]["name"] == "Area Lamp Override"
    assert room["entities_by_domain"]["cover"][0]["entity_id"] == "cover.window"


def test_write_dashboard_files_without_helper_entities(tmp_path: Path) -> None:
    config = {
        "name": "Generated Test",
        "overview": {"weather_entity": "sensor.weather_entity_forecast"},
        "rooms": [
            {
                "name": "Office",
                "entities": {
                    "light": ["light.office_main", "light.office_desk"],
                    "sensor": [{"entity_id": "sensor.remote_battery", "device_class": "battery"}],
                },
            }
        ],
    }

    generated = write_dashboard(config, tmp_path)
    dashboard = tmp_path / generated.slug / "dashboard.yaml"
    room_view = tmp_path / generated.slug / "views/rooms/00-office.yaml"
    source = "\n".join(path.read_text() for path in Path(tmp_path, generated.slug).rglob("*.yaml"))

    assert dashboard.exists()
    assert "theme: Marao Dashboard" in dashboard.read_text(encoding="utf-8")
    assert room_view.exists()
    assert "platform: group" not in source
    assert "light.office_main" in source
    assert "hc_battery_card" in source


def test_dashboard_json_loader_rejects_invalid_json(tmp_path: Path) -> None:
    config_path = tmp_path / "dashboard.json"
    config_path.write_text("{not json", encoding="utf-8")

    with pytest.raises(ValueError, match="Invalid dashboard JSON"):
        load_dashboard_config(config_path)


def test_dashboard_json_loader_rejects_non_object(tmp_path: Path) -> None:
    config_path = tmp_path / "dashboard.json"
    config_path.write_text("[]", encoding="utf-8")

    with pytest.raises(ValueError, match="Dashboard JSON must be an object"):
        load_dashboard_config(config_path)


def test_missing_dashboard_json_creates_starter_config(tmp_path: Path) -> None:
    config_path = tmp_path / "dashboard.json"

    config = ensure_dashboard_config(
        config_path,
        [
            {
                "entity_id": "light.kitchen_main",
                "area_id": "kitchen",
                "area_name": "Kitchen",
                "name": "Main",
            }
        ],
    )

    assert config_path.exists()
    assert config["rooms"][0]["name"] == "Kitchen"
    assert load_dashboard_config(config_path)["rooms"][0]["entities"]["light"][0][
        "entity_id"
    ] == "light.kitchen_main"


def test_room_cards_are_appended_to_generated_room_view(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {
                    "name": "Office",
                    "entities": ["light.office_main"],
                    "cards": [{"type": "markdown", "content": "Raw room card"}],
                }
            ],
        },
        tmp_path,
    )

    room_view = tmp_path / generated.slug / "views/rooms/00-office.yaml"
    source = room_view.read_text(encoding="utf-8")

    assert "type: markdown" in source
    assert "Raw room card" in source
    assert source.index("Raw room card") < source.index("components/navigation/navbar.yaml")


def test_dashboard_key_override_updates_generated_navigation(tmp_path: Path) -> None:
    generated = write_dashboard(
        {"name": "Generated Test", "rooms": [{"name": "Office", "entities": ["light.office"]}]},
        tmp_path,
        dashboard_key_override="custom-dashboard",
    )

    navbar = tmp_path / generated.slug / "components/navigation/navbar.yaml"

    assert generated.dashboard_key == "custom-dashboard"
    assert "/custom-dashboard/rooms" in navbar.read_text(encoding="utf-8")


def test_write_dashboard_localizes_generated_labels(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {
                    "name": "Office",
                    "entities": {
                        "light": ["light.office"],
                        "cover": ["cover.office_blind"],
                        "climate": ["climate.office"],
                        "sensor": [
                            {
                                "entity_id": "sensor.office_remote_battery",
                                "device_class": "battery",
                            }
                        ],
                    },
                }
            ],
        },
        tmp_path,
        language="pt-PT",
    )

    root = tmp_path / generated.slug
    source = "\n".join(path.read_text(encoding="utf-8") for path in root.rglob("*.yaml"))

    assert "label: Início" in source
    assert "label: Divisões" in source
    assert "title: Início" in source
    assert "title: Divisões" in source
    assert "name: Iluminação" in source
    assert "name: Persianas" in source
    assert "name: Climatização" in source
    assert "name: Manutenção" in source
    assert "Office Modo" in source


def test_navbar_sizes_to_routes_and_views_have_bottom_spacer(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "navigation": [{"label": "Cards", "url": "/cards", "icon": "mdi:test-tube"}],
            "rooms": [{"name": "Office", "entities": ["light.office"]}],
        },
        tmp_path,
    )

    root = tmp_path / generated.slug
    navbar_path = root / "components/navigation/navbar.yaml"
    navbar = navbar_path.read_text(encoding="utf-8")
    navbar_config = yaml.safe_load(navbar)["cards"][1]
    views = [
        root / "views/main/00-overview.yaml",
        root / "views/main/02-rooms.yaml",
        root / "views/rooms/00-office.yaml",
    ]

    assert "type: vertical-stack" in navbar
    assert "height: 128px" in navbar
    assert "type: custom:navbar-card" in navbar
    assert "tap_action: true" in navbar
    assert "url: true" in navbar
    assert navbar_config["haptic"] == {
        "double_tap_action": True,
        "hold_action": True,
        "tap_action": True,
        "url": True,
    }
    assert all(
        selector in navbar_config["styles"]
        for selector in (
            ".navbar {",
            ".navbar-card {",
            ".navbar-card.mobile.floating {",
            ".route {",
            ".button {",
        )
    )
    assert "--marao-navbar-route-size: 58px" in navbar
    assert "touch-action: none" in navbar
    for view in views:
        source = view.read_text(encoding="utf-8")
        assert "# marao:custom:start" in source
        assert source.index("# marao:custom:start") < source.index("components/navigation/navbar.yaml")


def test_marao_button_actions_declare_heavy_haptics(tmp_path: Path) -> None:
    action_keys = {"tap_action", "hold_action", "double_tap_action", "press_action"}
    template_root = Path(
        "custom_components/marao_dashboard/frontend/dashboard/MaraoDashboard/"
        "templates/internal_templates"
    )

    def assert_actions(value: object, source: Path) -> int:
        action_count = 0
        if isinstance(value, dict):
            for key, child in value.items():
                if (
                    key in action_keys
                    and isinstance(child, dict)
                    and child.get("action") not in (None, "none")
                ):
                    assert child.get("haptic") == "heavy", f"{source}: {key}"
                    action_count += 1
                action_count += assert_actions(child, source)
        elif isinstance(value, list):
            for child in value:
                action_count += assert_actions(child, source)
        return action_count

    for path in template_root.rglob("*.yaml"):
        assert_actions(yaml.safe_load(path.read_text(encoding="utf-8")), path)

    generated = write_dashboard(
        {
            "name": "Haptic Test",
            "overview": {"scenes": ["scene.relax"]},
            "rooms": [
                {
                    "name": "Living Room",
                    "entities": {
                        "light": ["light.ceiling"],
                        "lock": ["lock.front_door"],
                        "media_player": [
                            {
                                "entity_id": "media_player.living_room",
                                "apple_tv": {
                                    "remote_entity": "remote.living_room",
                                    "apps": [{"name": "TV", "source": "TV"}],
                                },
                            }
                        ],
                    },
                }
            ],
            "pages": {
                "security": {"actions": ["button.panic", "switch.siren"]},
                "energy": {"house_power": "sensor.house_power"},
                "wallbox": {
                    "current_control_entity": "number.charge_current",
                    "current_presets": [6, 12],
                },
                "media": {"players": ["media_player.living_room"]},
            },
        },
        tmp_path,
    )
    generated_root = tmp_path / generated.slug
    generated_action_count = sum(
        assert_actions(
            yaml.load(path.read_text(encoding="utf-8"), Loader=MaraoDashboardLoader),
            path,
        )
        for path in generated_root.rglob("*.yaml")
    )
    assert generated_action_count > 0


def test_custom_pages_ordered_navigation_and_page_shortcuts(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "navigation": ["studio", "overview", "rooms"],
            "rooms": [
                {
                    "name": "Office",
                    "entities": {
                        "navigation": [
                            {"page": "studio", "name": "Open studio", "icon": "mdi:palette"}
                        ]
                    },
                }
            ],
            "pages": {
                "custom": [
                    {
                        "name": "Studio",
                        "path": "studio",
                        "icon": "mdi:palette",
                        "entities": {
                            "light": ["light.studio"],
                            "navigation": [{"page": "overview", "name": "Back home"}],
                        },
                    }
                ]
            },
        },
        tmp_path,
    )

    root = tmp_path / generated.slug
    custom_view = root / "views/custom/00-studio.yaml"
    room_view = root / "views/rooms/00-office.yaml"
    navbar = (root / "components/navigation/navbar.yaml").read_text(encoding="utf-8")
    dashboard = (root / "dashboard.yaml").read_text(encoding="utf-8")

    assert custom_view.exists()
    assert "views/custom/00-studio.yaml" in dashboard
    assert "light.studio" in custom_view.read_text(encoding="utf-8")
    assert "navigation_path: /marao-generated-test/overview" in custom_view.read_text(
        encoding="utf-8"
    )
    assert "navigation_path: /marao-generated-test/studio" in room_view.read_text(
        encoding="utf-8"
    )
    assert navbar.index("/marao-generated-test/studio") < navbar.index(
        "/marao-generated-test/overview"
    ) < navbar.index("/marao-generated-test/rooms")


def test_custom_page_paths_must_be_unique(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="Custom page path must be unique"):
        write_dashboard(
            {
                "name": "Generated Test",
                "rooms": [],
                "pages": {
                    "custom": [
                        {"name": "One", "path": "same"},
                        {"name": "Two", "path": "same"},
                    ]
                },
            },
            tmp_path,
        )


def test_columns_render_an_ordered_mixed_card_grid(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {
                    "name": "Office",
                    "columns": 3,
                    "entities": [
                        "light.desk",
                        "climate.office",
                        {"page": "overview", "name": "Home"},
                    ],
                    "cards": [{"type": "markdown", "content": "Shared notes"}],
                }
            ],
        },
        tmp_path,
    )

    source = (
        tmp_path / generated.slug / "views/rooms/00-office.yaml"
    ).read_text(encoding="utf-8")
    assert source.count("type: grid") == 1
    assert "columns: 3" in source
    assert "Shared notes" in source
    assert source.index("light.desk") < source.index("climate.office") < source.index(
        "navigation_path: /marao-generated-test/overview"
    )


def test_columns_must_be_between_one_and_six(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="columns must be an integer between 1 and 6"):
        write_dashboard(
            {"name": "Generated Test", "rooms": [{"name": "Office", "columns": 7}]},
            tmp_path,
        )


def test_room_climate_card_opens_generated_mode_popup(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [{"name": "Office", "entities": ["climate.office"]}],
        },
        tmp_path,
    )

    room_view = tmp_path / generated.slug / "views/rooms/00-office.yaml"
    source = room_view.read_text(encoding="utf-8")

    assert "mode_selector_hash: '#climate-mode-climate-office'" in source
    assert "card_type: pop-up" in source
    assert "hash: '#climate-mode-climate-office'" in source
    assert "show_mode_buttons: true" in source
    assert source.index("# marao:custom:start") < source.index("components/navigation/navbar.yaml")


def test_room_access_cards_open_generated_action_popups(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {
                    "name": "Office",
                    "entities": {
                        "lock": ["lock.front_door"],
                        "cover": [
                            {"entity_id": "cover.garage_door", "device_class": "garage"},
                            {"entity_id": "cover.office_blind", "device_class": "shutter"},
                        ],
                    },
                }
            ],
        },
        tmp_path,
    )

    room_view = tmp_path / generated.slug / "views/rooms/00-office.yaml"
    source = room_view.read_text(encoding="utf-8")

    assert source.count("template: hc_access_card") == 2
    assert "template: hc_cover_card" in source
    assert "popup_hash: '#access-lock-front-door'" in source
    assert "popup_hash: '#access-cover-garage-door'" in source
    assert "hash: '#access-lock-front-door'" in source
    assert "hash: '#access-cover-garage-door'" in source
    assert "action_service: lock.unlock" in source
    assert "action_service: lock.lock" in source
    assert "action_service: cover.open_cover" in source
    assert "action_service: cover.close_cover" in source
    assert source.count("template: hc_access_slide_action_card") == 2
    assert "template: hc_access_hold_action_card" not in source
    assert source.count("template: hc_access_action_card") == 2
    assert "action_requires_hold: true" not in source
    assert source.index("# marao:custom:start") < source.index("components/navigation/navbar.yaml")


def test_room_media_card_opens_generated_apple_tv_remote_popup(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {
                    "name": "Living Room",
                    "entities": {
                        "media_player": [
                            {
                                "entity_id": "media_player.living_room_tv",
                                "apple_tv": {
                                    "remote_entity": "remote.living_room_apple_tv",
                                    "volume_remote_entity": "remote.living_room_tv",
                                    "apps": [
                                        {"name": "YouTube", "source": "YouTube", "icon": "mdi:youtube"}
                                    ],
                                },
                            }
                        ]
                    },
                }
            ],
        },
        tmp_path,
    )

    source = (tmp_path / generated.slug / "views/rooms/00-living-room.yaml").read_text(
        encoding="utf-8"
    )

    assert "popup_hash: '#media-media-player-living-room-tv'" in source
    assert "hash: '#media-media-player-living-room-tv'" in source
    assert "template: hc_media_app_card" in source
    assert "app_source: YouTube" in source
    assert "command: top_menu" in source
    assert "command: KEY_VOLDOWN" in source
    assert "perform_action: media_player.media_seek" in source


def test_room_camera_card_opens_generated_frigate_events_popup(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "language": "pt",
            "rooms": [
                {
                    "name": "Garden",
                    "entities": {
                        "camera": [
                            {
                                "entity_id": "camera.front_door",
                                "variables": {
                                    "frigate_camera": "front",
                                    "frigate_instance_id": "frigate-main",
                                    "event_limit": 24,
                                },
                            }
                        ]
                    },
                }
            ],
        },
        tmp_path,
        language="pt",
    )

    source = (tmp_path / generated.slug / "views/rooms/00-garden.yaml").read_text(
        encoding="utf-8"
    )

    assert "template: hc_camera_card" in source
    assert "popup_hash: '#camera-camera-front-door'" in source
    assert "hash: '#camera-camera-front-door'" in source
    assert "type: custom:marao-camera-events-card" in source
    assert "entity: camera.front_door" in source
    assert "title: Eventos" in source
    assert "frigate_camera: front" in source
    assert "frigate_instance_id: frigate-main" in source
    assert "limit: 24" in source


def test_room_camera_card_forwards_unifi_protect_event_source(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {
                    "name": "Garden",
                    "entities": {
                        "camera": [
                            {
                                "entity_id": "camera.driveway_high",
                                "variables": {
                                    "event_provider": "unifiprotect",
                                    "unifi_protect_media_source": (
                                        "media-source://unifiprotect/nvr-1:browse:camera-1"
                                    ),
                                },
                            }
                        ]
                    },
                }
            ],
        },
        tmp_path,
    )

    source = (tmp_path / generated.slug / "views/rooms/00-garden.yaml").read_text(
        encoding="utf-8"
    )

    assert "template: hc_camera_card" in source
    assert "type: custom:marao-camera-events-card" in source
    assert "event_provider: unifiprotect" in source
    assert (
        "unifi_protect_media_source: "
        "media-source://unifiprotect/nvr-1:browse:camera-1"
    ) in source


def test_generates_configured_julian_pages_and_derived_overview_popups(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "overview": {"scenes": ["input_boolean.holiday_mode"]},
            "rooms": [
                {
                    "name": "Living Room",
                    "entities": [
                        "light.living_room_main",
                        "cover.living_room_blind",
                        "climate.living_room",
                        "lock.front_door",
                        "input_boolean.holiday_mode",
                        "input_number.target_temperature",
                        {
                            "entity_id": "media_player.living_room_tv",
                            "apple_tv": {
                                "remote_entity": "remote.living_room_tv",
                                "apps": [{"name": "YouTube", "source": "YouTube"}],
                            },
                        },
                    ],
                }
            ],
            "pages": {
                "security": {"alarm_entity": "alarm_control_panel.home", "actions": ["button.open_door"]},
                "energy": {
                    "house_power": "sensor.house_power",
                    "month_energy": "sensor.month_energy",
                    "month_cost": "sensor.month_cost",
                    "loads": [{"power_entity": "sensor.heater_power", "toggle_entity": "switch.heater"}],
                    "appliances": [{"entity_id": "sensor.dishwasher", "template": "hc_dishwasher_card"}],
                },
                "wallbox": {
                    "status_entity": "sensor.wallbox_status",
                    "charging_power_entity": "sensor.wallbox_power",
                    "current_control_entity": "input_number.wallbox_current",
                    "pause_resume_entity": "switch.wallbox_pause",
                },
                "media": {},
            },
        },
        tmp_path,
    )

    root = tmp_path / generated.slug
    dashboard = (root / "dashboard.yaml").read_text(encoding="utf-8")
    overview = (root / "views/main/00-overview.yaml").read_text(encoding="utf-8")
    lights = (root / "components/popups/overview_lights.yaml").read_text(encoding="utf-8")
    covers = (root / "components/popups/overview_blinds.yaml").read_text(encoding="utf-8")

    for path in (
        "views/main/00-overview.yaml",
        "views/main/01-security.yaml",
        "views/main/02-rooms.yaml",
        "views/main/03-energy.yaml",
        "views/main/04-wallbox.yaml",
        "views/main/05-media.yaml",
    ):
        assert path in dashboard
        assert (root / path).exists()
    assert "navigation_path: '#overview-lights'" in overview
    assert "navigation_path: '#overview-blinds'" in overview
    assert "navigation_path: '#overview-scenes'" in overview
    assert overview.index("#overview-lights") < overview.index("#overview-blinds")
    assert overview.index("#overview-blinds") < overview.index("#overview-climate")
    assert "state: 'on'" in lights
    assert "light.living_room_main" in lights
    assert "cover.living_room_blind" in covers
    room_source = (root / "views/rooms/00-living-room.yaml").read_text(encoding="utf-8")
    assert "input_boolean.holiday_mode" in room_source
    assert "input_number.target_temperature" in room_source
    assert "alarm_control_panel.home" in (root / "views/main/01-security.yaml").read_text(encoding="utf-8")
    assert "lock.front_door" in (root / "views/main/01-security.yaml").read_text(encoding="utf-8")
    assert "sensor.house_power" in (root / "views/main/03-energy.yaml").read_text(encoding="utf-8")
    assert (root / "components/popups/energy_house_power.yaml").exists()
    assert "input_number.set_value" in (root / "views/main/04-wallbox.yaml").read_text(encoding="utf-8")
    assert "app_source: YouTube" in (root / "views/main/05-media.yaml").read_text(encoding="utf-8")


def test_overview_only_generates_standalone_popups_with_entities(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {
                    "name": "Living Room",
                    "entities": [
                        "light.living_room_main",
                        "cover.living_room_blind",
                    ],
                }
            ],
        },
        tmp_path,
    )

    root = tmp_path / generated.slug
    overview = (root / "views/main/00-overview.yaml").read_text(encoding="utf-8")

    assert "overview_lights.yaml" in overview
    assert "overview_blinds.yaml" in overview
    assert "overview_climate.yaml" not in overview
    assert "overview_maintenance.yaml" not in overview
    assert not (root / "components/popups/overview_climate.yaml").exists()
    assert not (root / "components/popups/overview_maintenance.yaml").exists()

    popup_paths = sorted((root / "components/popups").glob("*.yaml"))
    assert [path.name for path in popup_paths] == [
        "overview_blinds.yaml",
        "overview_lights.yaml",
    ]
    for path in popup_paths:
        popup = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert popup["type"] == "custom:bubble-card"
        assert popup["card_type"] == "pop-up"
        assert popup["hash"]
        assert isinstance(popup["cards"], list) and popup["cards"]


def test_regeneration_preserves_manual_cards_and_replaces_generated_cards(tmp_path: Path) -> None:
    first_config = {
        "name": "Generated Test",
        "rooms": [{"name": "Office", "entities": ["light.office_main"]}],
    }
    generated = write_dashboard(first_config, tmp_path)
    room = tmp_path / generated.slug / "views/rooms/00-office.yaml"
    source = room.read_text(encoding="utf-8")
    custom_card = "  - type: markdown\n    content: Manual office note\n"
    room.write_text(
        source.replace("  # marao:custom:start\n", "  # marao:custom:start\n" + custom_card),
        encoding="utf-8",
    )

    write_dashboard(
        {"name": "Generated Test", "rooms": [{"name": "Office", "entities": ["light.office_desk"]}]},
        tmp_path,
    )

    regenerated = room.read_text(encoding="utf-8")
    assert custom_card in regenerated
    assert "light.office_desk" in regenerated
    assert "light.office_main" not in regenerated
    assert regenerated.index("Manual office note") < regenerated.index("components/navigation/navbar.yaml")


def test_damaged_card_markers_abort_without_overwriting_files(tmp_path: Path) -> None:
    generated = write_dashboard(
        {"name": "Generated Test", "rooms": [{"name": "Office", "entities": ["light.office"]}]},
        tmp_path,
    )
    room = tmp_path / generated.slug / "views/rooms/00-office.yaml"
    damaged = room.read_text(encoding="utf-8").replace("  # marao:custom:end\n", "")
    room.write_text(damaged, encoding="utf-8")

    with pytest.raises(ValueError, match="markers are missing or damaged"):
        write_dashboard(
            {"name": "Generated Test", "rooms": [{"name": "Office", "entities": ["light.office_desk"]}]},
            tmp_path,
        )

    assert room.read_text(encoding="utf-8") == damaged


def test_adopts_an_unchanged_legacy_generated_view(tmp_path: Path) -> None:
    config = {"name": "Generated Test", "rooms": [{"name": "Office", "entities": ["light.office"]}]}
    generated = write_dashboard(config, tmp_path)
    root = tmp_path / generated.slug
    room = root / "views/rooms/00-office.yaml"
    legacy = "\n".join(
        line
        for line in room.read_text(encoding="utf-8").splitlines()
        if "marao:" not in line and "Add custom Lovelace cards here." not in line
    ) + "\n"
    room.write_text(legacy, encoding="utf-8")
    (root / ".marao-generated.json").unlink()

    write_dashboard(config, tmp_path)

    assert "# marao:custom:start" in room.read_text(encoding="utf-8")


def test_adopts_a_parseable_pre_manifest_dashboard_from_an_older_generator(
    tmp_path: Path,
) -> None:
    config = {
        "name": "Generated Test",
        "rooms": [{"name": "Office", "entities": ["light.office"]}],
    }
    generated = write_dashboard(config, tmp_path)
    root = tmp_path / generated.slug
    room = root / "views/rooms/00-office.yaml"
    legacy = "\n".join(
        line
        for line in room.read_text(encoding="utf-8").splitlines()
        if "marao:" not in line and "Add custom Lovelace cards here." not in line
    ).replace("columns: 2", "columns: 1") + "\n"
    room.write_text(legacy, encoding="utf-8")
    (root / ".marao-generated.json").unlink()

    write_dashboard(config, tmp_path)

    migrated = room.read_text(encoding="utf-8")
    assert "# marao:custom:start" in migrated
    assert "columns: 2" in migrated


def test_regeneration_removes_only_stale_managed_view_without_custom_cards(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {"name": "Office", "entities": ["light.office"]},
                {"name": "Guest", "entities": ["light.guest"]},
            ],
        },
        tmp_path,
    )
    guest_view = tmp_path / generated.slug / "views/rooms/01-guest.yaml"
    assert guest_view.exists()

    write_dashboard(
        {"name": "Generated Test", "rooms": [{"name": "Office", "entities": ["light.office"]}]},
        tmp_path,
    )

    assert not guest_view.exists()


def test_regeneration_keeps_custom_cards_in_a_stale_view(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {"name": "Office", "entities": ["light.office"]},
                {"name": "Guest", "entities": ["light.guest"]},
            ],
        },
        tmp_path,
    )
    guest_view = tmp_path / generated.slug / "views/rooms/01-guest.yaml"
    guest_view.write_text(
        guest_view.read_text(encoding="utf-8").replace(
            "  # marao:custom:start\n",
            "  # marao:custom:start\n  - type: markdown\n    content: Keep this\n",
        ),
        encoding="utf-8",
    )

    write_dashboard(
        {"name": "Generated Test", "rooms": [{"name": "Office", "entities": ["light.office"]}]},
        tmp_path,
    )

    stale_source = guest_view.read_text(encoding="utf-8")
    assert "Keep this" in stale_source
    assert "light.guest" not in stale_source


def test_build_base_dashboard_config_groups_enabled_area_entities() -> None:
    config = build_base_dashboard_config(
        [
            {
                "entity_id": "light.kitchen_main",
                "area_id": "kitchen",
                "area_name": "Kitchen",
                "name": "Main",
            },
            {
                "entity_id": "sensor.kitchen_battery",
                "area_id": "kitchen",
                "area_name": "Kitchen",
                "device_class": "battery",
            },
            {
                "entity_id": "switch.office_plug",
                "area_id": "office",
                "area_name": "Office",
            },
            {
                "entity_id": "weather.home",
            },
        ]
    )

    assert config["name"] == "Marao Dashboard"
    assert config["slug"] == "dashboard"
    assert config["overview"] == {"weather_entity": "weather.home"}
    assert [room["name"] for room in config["rooms"]] == ["Kitchen", "Office"]
    assert config["rooms"][0]["entities"]["light"][0]["entity_id"] == "light.kitchen_main"
    assert config["rooms"][0]["entities"]["sensor"][0]["device_class"] == "battery"
    assert config["rooms"][1]["entities"]["switch"][0]["entity_id"] == "switch.office_plug"


def test_build_base_dashboard_config_skips_unsupported_disabled_hidden() -> None:
    config = build_base_dashboard_config(
        [
            {
                "entity_id": "automation.unsupported",
                "area_id": "kitchen",
                "area_name": "Kitchen",
            },
            {
                "entity_id": "light.disabled",
                "area_id": "kitchen",
                "area_name": "Kitchen",
                "disabled_by": "user",
            },
            {
                "entity_id": "switch.hidden",
                "area_id": "kitchen",
                "area_name": "Kitchen",
                "hidden_by": "user",
            },
            {
                "entity_id": "sensor.unassigned",
            },
            {
                "entity_id": "sensor.stale",
                "has_state": False,
            },
            {
                "entity_id": "weather.disabled",
                "disabled_by": "user",
            },
        ]
    )

    assert config["overview"] == {}
    assert [room["name"] for room in config["rooms"]] == ["Home"]
    assert config["rooms"][0]["entities"]["sensor"][0]["entity_id"] == "sensor.unassigned"
    assert len(config["rooms"][0]["entities"]["sensor"]) == 1


def test_existing_empty_base_dashboard_config_refreshes_when_entities_exist(tmp_path: Path) -> None:
    config_path = tmp_path / "dashboard.json"
    config_path.write_text(
        '{"name":"Marao Dashboard","slug":"dashboard","rooms":[]}\n',
        encoding="utf-8",
    )

    config = ensure_dashboard_config(
        config_path,
        [{"entity_id": "light.unassigned", "name": "Unassigned Lamp"}],
    )

    assert [room["name"] for room in config["rooms"]] == ["Home"]
    assert json.loads(config_path.read_text(encoding="utf-8"))["rooms"][0]["entities"]["light"][
        0
    ]["entity_id"] == "light.unassigned"


def test_legacy_theme_names_migrate_to_single_theme() -> None:
    config = {"name": "Marao Dashboard", "theme": "Marao Dashboard Gold", "rooms": []}

    assert migrate_legacy_theme(config)
    assert config["theme"] == "Marao Dashboard"


def test_write_empty_base_dashboard(tmp_path: Path) -> None:
    generated = write_dashboard(build_base_dashboard_config([]), tmp_path)

    source = "\n".join(path.read_text() for path in Path(tmp_path, generated.slug).rglob("*.yaml"))
    assert generated.dashboard_key == "marao-dashboard"
    assert generated.filename == "dashboard/MaraoDashboard/dashboard/dashboard.yaml"
    assert "title: Marao Dashboard" in source
    assert "views/main/00-overview.yaml" in source


def test_invalid_config() -> None:
    with pytest.raises(ValueError):
        resolve_dashboard_config({"rooms": []})
