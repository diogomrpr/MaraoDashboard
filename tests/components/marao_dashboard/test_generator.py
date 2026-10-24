from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from custom_components.marao_dashboard import generator
from custom_components.marao_dashboard.generator import (
    DASHBOARD_CONFIG_VERSION,
    MaraoDashboardLoader,
    build_base_dashboard_config,
    ensure_dashboard_config,
    load_dashboard_config,
    make_slug,
    migrate_dashboard_config,
    migrate_legacy_theme,
    resolve_dashboard_config,
    plan_dashboard,
    write_dashboard,
    write_dashboard_config,
)



def _walk_generated_cards(cards):
    for card in cards:
        if isinstance(card, dict):
            yield card
            if card.get("type") in ("custom:marao-control-grid", "grid", "vertical-stack", "horizontal-stack"):
                yield from _walk_generated_cards(card.get("cards", []))


def _room_pages(config):
    return [page for page in config["pages"] if page.get("output_path", "").startswith("views/rooms/")]


def _room(config, index=0):
    page = _room_pages(config)[index]
    content = page.get("_sections", page["sections"])[-1]
    groups = {}
    for card in content.get("ordered_cards", []):
        domain = "entity_group" if card.get("template") == "md_entity_group_card" else "navigation" if card.get("page") else card["entity_id"].split(".")[0]
        groups.setdefault(domain, []).append(card)
    return {**page, **content, "entities_by_domain": groups}


def _home_groups(config):
    return [card for section in config["pages"][0].get("_sections", config["pages"][0]["sections"]) for card in section.get("ordered_cards", section.get("entities", [])) if card.get("template") == "md_entity_group_card"]


def _load_view(path):
    view = yaml.load(path.read_text(), Loader=MaraoDashboardLoader)
    root = next(parent for parent in path.parents if (parent / "dashboard.yaml").exists())
    def expand(value):
        if isinstance(value, generator.TaggedScalar):
            relative = value.value.split(str(root.name) + "/", 1)[1]
            return yaml.load((root / relative).read_text(), Loader=MaraoDashboardLoader)
        if isinstance(value, dict):
            return {key: expand(child) for key, child in value.items()}
        if isinstance(value, list):
            return [expand(child) for child in value]
        return value
    return expand(view)


def _view_source(path):
    source = path.read_text(encoding="utf-8")
    root = next(parent for parent in path.parents if (parent / "dashboard.yaml").exists())
    view = yaml.load(source, Loader=MaraoDashboardLoader)
    for card in view["cards"]:
        if isinstance(card, generator.TaggedScalar) and "/components/popups/" in card.value:
            source += (root / "components/popups" / card.value.rsplit("/", 1)[1]).read_text()
    return source

def test_slug_generation() -> None:
    assert make_slug("Sala e Cozinha") == "sala-e-cozinha"
    assert make_slug("  Geracao Arvore  ") == "geracao-arvore"
    assert make_slug("") == "dashboard"


@pytest.mark.parametrize("icon", [None, "", "mdi:palette", "marao_dashboard:back"])
def test_dashboard_brand_default_preserves_explicit_icons(icon: str | None) -> None:
    config = {"name": "Brand", "rooms": []}
    if icon is not None:
        config["icon"] = icon
    assert generator.normalize_config(config)["icon"] == (icon or "marao_dashboard:mountain")
    assert build_base_dashboard_config([])["icon"] == "marao_dashboard:mountain"


def test_json_replace_failure_retains_source_and_cleans_temporary_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "dashboard.json"
    source = b'{"name":"Before", "rooms":[]}\n'
    path.write_bytes(source)
    path.chmod(0o600)
    replace = Path.replace

    def fail_replace(temporary: Path, target: Path) -> Path:
        if target == path:
            raise OSError("Injected replace failure")
        return replace(temporary, target)

    monkeypatch.setattr(Path, "replace", fail_replace)
    with pytest.raises(OSError, match="replace failure"):
        write_dashboard_config({"name": "After", "rooms": []}, path)
    assert path.read_bytes() == source
    assert path.stat().st_mode & 0o777 == 0o600
    assert list(tmp_path.iterdir()) == [path]
    monkeypatch.setattr(Path, "replace", replace)
    write_dashboard_config({"name": "After", "rooms": []}, path)
    assert json.loads(path.read_bytes())["name"] == "After"
    assert path.stat().st_mode & 0o777 == 0o600


def test_legacy_explicit_entities_win_over_area_expansion() -> None:
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
    room = _room(resolved)
    lights = room["entities_by_domain"]["light"]

    assert [entity["entity_id"] for entity in lights] == ["light.manual_lamp"]
    assert lights[0]["name"] == "Manual Lamp"
    assert "cover" not in room["entities_by_domain"]


@pytest.mark.parametrize("selection", [[], {}, None])
def test_explicit_empty_rooms_do_not_import_area(selection):
    source = {"name": "Independent", "rooms": [{"name": "Empty", "area": "kitchen", "entities": selection}]}
    converted = migrate_dashboard_config(source, [{"entity_id": "light.new", "area_id": "kitchen", "has_state": True}])
    assert converted["config_version"] == 2
    assert _room(resolve_dashboard_config(converted))["ordered_cards"] == []
    assert converted == migrate_dashboard_config(converted)
    assert source["rooms"][0]["entities"] == selection


def test_legacy_area_snapshot_uses_effective_area_and_eligible_live_entities():
    registry = [
        {"entity_id": "light.selected", "area_id": "kitchen", "area_name": "Kitchen", "has_state": True},
        {"entity_id": "light.device", "device_area_id": "kitchen", "has_state": True},
        {"entity_id": "light.elsewhere", "area_id": "office", "device_area_id": "kitchen", "has_state": True},
        {"entity_id": "light.hidden", "area_id": "kitchen", "hidden_by": "user", "has_state": True},
        {"entity_id": "light.disabled", "area_id": "kitchen", "disabled_by": "user", "has_state": True},
        {"entity_id": "light.absent", "area_id": "kitchen", "has_state": False},
        {"entity_id": "automation.unsupported", "area_id": "kitchen", "has_state": True},
    ]
    source = {"name": "Independent", "rooms": [{"name": "Room", "area": "KITCHEN"}]}
    converted = migrate_dashboard_config(source, registry)
    assert {key: _room(converted)[key] for key in ("name", "area", "entities")} == {"name": "Room", "area": "kitchen", "entities": ["light.selected", "light.device"]}
    assert "entities" not in source["rooms"][0]
    assert migrate_dashboard_config(converted, []) == converted
    changed_registry = [{"entity_id": "light.new", "area_id": "kitchen", "has_state": True}]
    assert [entry["entity_id"] for entry in _room(resolve_dashboard_config(converted, changed_registry))["ordered_cards"]] == ["light.selected", "light.device"]


@pytest.mark.parametrize("registry,areas", [
    (None, [{"area_id": "kitchen", "name": "Kitchen"}]),
    ([], None),
    ([], [{"area_id": "a", "name": "Kitchen"}, {"area_id": "b", "name": "Kitchen"}]),
    ([{"entity_id": "light.unknown", "area_id": "kitchen", "area_name": "Kitchen"}], None),
])
def test_unresolvable_legacy_area_preserves_source(registry, areas):
    source = {"name": "Independent", "rooms": [{"name": "Room", "area": "Kitchen"}]}
    original = json.dumps(source)
    with pytest.raises(ValueError, match="Cannot import legacy room"):
        migrate_dashboard_config(source, registry, areas)
    assert json.dumps(source) == original


def test_known_empty_area_is_an_explicit_empty_snapshot():
    converted = migrate_dashboard_config({"name": "Independent", "rooms": [{"name": "Empty", "area": "Kitchen"}]}, [], [{"area_id": "kitchen", "name": "Kitchen"}])
    assert {key: _room(converted)[key] for key in ("name", "area", "entities")} == {"name": "Empty", "area": "kitchen", "entities": []}


def test_conversion_folds_instructions_preserving_order_options_and_raw_content():
    raw = {"type": "markdown", "content": "Protected", "extension": {"keep": [2, 1]}}
    source = {"name": "Independent", "pages": {"media": {}}, "extension": {"keep": True}, "rooms": [{
        "name": "Room", "area": "obsolete", "columns": 2,
        "entities": ["light.remove", {"page": "media", "name": "Shortcut"}, {"entity_id": "sensor.keep", "template": "md_graph_card", "variables": {"display_precision": 2}, "unknown": [2, 1]}],
        "include": {"light": [{"entity_id": "light.add", "name": "Added"}]},
        "exclude": ["light.remove"], "overrides": {"sensor.keep": {"icon": "mdi:chart-line"}}, "cards": [raw],
    }]}
    converted = migrate_dashboard_config(source)
    room = _room(converted)
    assert room["entities"] == [source["rooms"][0]["entities"][1], {**source["rooms"][0]["entities"][2], "icon": "mdi:chart-line"}, {"entity_id": "light.add", "name": "Added"}]
    assert not any(key in room for key in ("include", "exclude", "overrides"))
    assert room["cards"] == [raw] and room["columns"] == 2 and room["area"] == "obsolete"
    assert converted["extension"] == source["extension"]
    assert migrate_dashboard_config(converted) == converted
    assert "include" in source["rooms"][0]


@pytest.mark.parametrize("instruction", ["include", "exclude", "overrides"])
def test_current_format_rejects_reintroduced_room_instructions(instruction):
    with pytest.raises(ValueError, match="explicit entities"):
        resolve_dashboard_config({"name": "Independent", "config_version": 1, "rooms": [{"name": "Room", instruction: []}]})


def test_current_missing_selection_is_empty_and_metadata_cannot_add_members():
    source = {"name": "Independent", "config_version": 1, "rooms": [{"name": "Room", "area": "kitchen"}]}
    assert _room(migrate_dashboard_config(source))["entities"] == []
    assert _room(resolve_dashboard_config(source, [{"entity_id": "light.new", "area_id": "kitchen", "has_state": True}]))["ordered_cards"] == []
    source["rooms"][0]["entities"] = ["climate.selected"]
    selected = _room(resolve_dashboard_config(source, [{"entity_id": "climate.selected", "name": "Thermostat", "supported_features": 3}]))["ordered_cards"][0]
    assert selected["name"] == "Thermostat" and selected["supported_features"] == 3


@pytest.mark.parametrize("selection", ["light.selected", {"entity_id": "light.selected", "name": "Chosen"}, {"light": ["light.selected"]}])
def test_explicit_string_object_and_grouped_shapes_resolve_without_discovery(selection):
    source = {"name": "Independent", "config_version": 1, "rooms": [{"name": "Room", "area": "office", "entities": selection}]}
    registry = [{"entity_id": "light.other", "area_id": "office", "has_state": True}]
    assert [item["entity_id"] for item in _room(resolve_dashboard_config(source, registry))["ordered_cards"]] == ["light.selected"]
    assert _room(migrate_dashboard_config(source))["entities"] == selection


@pytest.mark.parametrize("removed", ["light.selected", "cover.selected", "climate.selected", "camera.selected", "lock.selected", "media_player.selected"])
def test_deletion_reaches_generated_rooms_overview_and_derived_security_media(tmp_path, removed):
    members = ["light.selected", "cover.selected", "climate.selected", "camera.selected", "lock.selected", "media_player.selected"]
    config = {"name": "Independent", "config_version": 1, "rooms": [{"name": "Room", "area": "office", "entities": [identifier for identifier in members if identifier != removed]}]}
    registry = [{"entity_id": identifier, "area_id": "office", "has_state": True} for identifier in members]
    generated = write_dashboard(config, tmp_path, registry)
    source = '\n'.join(path.read_text() for path in (tmp_path / generated.slug).rglob('*.yaml'))
    assert removed not in source
    for identifier in members:
        if identifier != removed:
            assert identifier in source
    assert config["rooms"][0]["area"] == "office"


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
    assert room_view.exists()
    generated_views = list((tmp_path / generated.slug / "views").rglob("*.yaml"))
    assert generated_views
    assert all("theme: Marao Dashboard" in view.read_text(encoding="utf-8") for view in generated_views)
    assert "platform: group" not in source
    assert "light.office_main" in source
    assert "md_battery_card" in source
    rooms_view = (tmp_path / generated.slug / "views/main/02-rooms.yaml").read_text(
        encoding="utf-8"
    )
    assert "template: md_room_card" in rooms_view
    assert "light_entities:" in rooms_view
    assert "- light.office_main" in rooms_view
    assert "- light.office_desk" in rooms_view
    shortcuts = yaml.load(rooms_view, Loader=MaraoDashboardLoader)["cards"][0]["cards"]
    assert shortcuts[0]["variables"]["light_entities"] == ["light.office_main", "light.office_desk"]
    assert shortcuts[0]["tap_action"] == {
        "action": "navigate", "navigation_path": "/marao-generated-test/room-office", "haptic": "heavy"
    }


def test_cases_use_normal_custom_page_cards_and_one_navbar(tmp_path: Path) -> None:
    cards = [
        {"type": "grid", "columns": 2, "square": False, "cards": [
            {"type": "custom:marao-card", "template": "md_switch_card", "entity": "switch.gallery_on"},
            {"type": "custom:marao-card", "template": "md_switch_card", "entity": "switch.gallery_unavailable"},
        ]},
        {"type": "custom:marao-popup-card", "hash": "#gallery-popup", "cards": [
            {"type": "custom:marao-card", "template": "md_light_card", "entity": "light.gallery"},
        ]},
    ]
    config = {
        "name": "Generated Test", "rooms": [],
        "pages": {"custom": [{"name": "Cases", "path": "card-test", "cards": cards}]},
        "navigation": ["overview", "card-test"],
    }
    generated = write_dashboard(config, tmp_path)
    write_dashboard(config, tmp_path)
    root = tmp_path / generated.slug
    dashboard = (root / "dashboard.yaml").read_text(encoding="utf-8")
    source = (root / "views/custom/00-cases.yaml").read_text(encoding="utf-8")
    view = yaml.load(source, Loader=MaraoDashboardLoader)
    assert dashboard.count("views/custom/00-cases.yaml") == 1
    assert view["path"] == "card-test"
    assert view["cards"][1:-1] == cards
    assert source.count("components/navigation/navbar.yaml") == 1
    navbar = yaml.safe_load((root / "components/navigation/navbar.yaml").read_text(encoding="utf-8"))
    assert navbar["cards"][0]["routes"][-1]["url"] == "/marao-generated-test/card-test"


def test_timeline_template_generates_the_native_timeline_card(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {
                    "name": "Office",
                    "entities": [
                        {
                            "entity_id": "sensor.office_state",
                            "template": "md_timeline_card",
                            "variables": {"timeline_name": "Office history"},
                        }
                    ],
                }
            ],
        },
        tmp_path,
    )

    room_view = Path(
        tmp_path, generated.slug, "views", "rooms", "00-office.yaml"
    ).read_text(encoding="utf-8")
    assert "type: custom:marao-state-timeline-card" in room_view
    assert "name: Office history" in room_view


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


@pytest.mark.parametrize("version", [None, True, False, -1, 0.5, "0", [], {}, 3])
def test_incompatible_format_leaves_source_and_output_untouched(
    tmp_path: Path, version: object
) -> None:
    config = {"name": "Saved", "config_version": version, "rooms": []}
    source = tmp_path / "dashboard.json"
    original = json.dumps(config).encode()
    source.write_bytes(original)
    output = tmp_path / "generated"
    output.mkdir()
    sentinel = output / "custom.yaml"
    sentinel.write_text("preserved", encoding="utf-8")

    for operation in (
        lambda: load_dashboard_config(source),
        lambda: ensure_dashboard_config(source, []),
        lambda: migrate_dashboard_config(config),
        lambda: plan_dashboard(config, output),
        lambda: write_dashboard(config, output),
        lambda: write_dashboard_config(config, source),
        lambda: write_dashboard_config(config, tmp_path / "absent" / "source.json"),
    ):
        with pytest.raises(ValueError, match="config_version"):
            operation()
        assert source.read_bytes() == original
        assert sentinel.read_text(encoding="utf-8") == "preserved"
        assert list(output.iterdir()) == [sentinel]
        assert not (tmp_path / "absent").exists()


@pytest.mark.parametrize("marker", [{"config_version": 2, "landing_page": "empty", "pages": [{"name": "Empty", "path": "empty", "entities": []}]}])
def test_current_format_is_a_private_idempotent_copy_without_source_writes(
    tmp_path: Path, marker: dict
) -> None:
    config = {
        "name": "Saved",
        "extension": {"ordered": ["second", "first"], "raw": {"custom": True}},
        **marker,
    }
    source = tmp_path / "dashboard.json"
    original = json.dumps(config, separators=(",", ":")).encode() + b"  \n"
    source.write_bytes(original)
    converted = migrate_dashboard_config(config)
    assert converted == config == migrate_dashboard_config(converted)
    converted["extension"]["ordered"].append("changed")
    assert config["extension"]["ordered"] == ["second", "first"]
    assert ensure_dashboard_config(source, []) == config
    plan_dashboard(config, tmp_path / "generated")
    assert source.read_bytes() == original
    assert not (tmp_path / "generated").exists()


def test_atomic_write_flushes_new_directory_ancestors(tmp_path, monkeypatch):
    directories = []
    sync = generator._fsync_directory
    def record(path):
        directories.append(path)
        sync(path)
    monkeypatch.setattr(generator, "_fsync_directory", record)
    target = tmp_path / "new" / "nested" / "source.json"
    generator._write_bytes(target, b"exact\r\n")
    assert target.read_bytes() == b"exact\r\n"
    assert directories == [target.parent, target.parent.parent, tmp_path]


def test_ordered_conversion_covers_skipped_steps_and_failure_copy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def first(config: dict, registry, areas) -> None:
        assert config.get("config_version", 0) == 0
        config["extension"]["steps"].append("first")

    def second(config: dict, registry, areas) -> None:
        assert config["config_version"] == 1
        config["extension"]["steps"].append("second")
        config.update(landing_page="empty", pages=[{"name": "Empty", "path": "empty"}])

    monkeypatch.setattr(generator, "DASHBOARD_CONFIG_MIGRATIONS", (first, second))
    monkeypatch.setattr(generator, "DASHBOARD_CONFIG_VERSION", 2)
    source = {"name": "Saved", "extension": {"steps": []}}
    expected = {
        "name": "Saved", "config_version": 2,
        "extension": {"steps": ["first", "second"]},
        "landing_page": "empty", "pages": [{"name": "Empty", "path": "empty"}],
    }
    assert migrate_dashboard_config(source) == expected
    assert migrate_dashboard_config(expected) == expected
    assert migrate_dashboard_config({
        "name": "Saved", "config_version": 1,
        "extension": {"steps": ["first"]},
    }) == expected
    assert source == {"name": "Saved", "extension": {"steps": []}}

    def failing(config: dict, registry, areas) -> None:
        config["extension"]["steps"].append("failed")
        raise ValueError("conversion failed")

    monkeypatch.setattr(generator, "DASHBOARD_CONFIG_MIGRATIONS", (first, failing))
    with pytest.raises(ValueError, match="conversion failed"):
        migrate_dashboard_config(source)
    assert source == {"name": "Saved", "extension": {"steps": []}}


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
    assert config["config_version"] == DASHBOARD_CONFIG_VERSION == 2
    assert _room(config)["name"] == "Kitchen"
    assert _room(load_dashboard_config(config_path))["entities"]["light"][0][
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
    source = _view_source(room_view)

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


def test_navbar_sizes_to_routes_and_reserves_its_own_bottom_space(tmp_path: Path) -> None:
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
    navbar_cards = yaml.safe_load(navbar)["cards"]
    navbar_config = navbar_cards[0]
    views = [
        root / "views/main/00-overview.yaml",
        root / "views/main/02-rooms.yaml",
        root / "views/rooms/00-office.yaml",
    ]

    assert "type: vertical-stack" in navbar
    assert len(navbar_cards) == 1
    assert navbar_config["type"] == "custom:marao-navbar-card"
    assert len(navbar_config["routes"]) == 3
    for view in views:
        source = view.read_text(encoding="utf-8")
        assert "# marao:custom:start" in source
        assert source.index("# marao:custom:start") < source.index("components/navigation/navbar.yaml")


def test_marao_button_actions_declare_heavy_haptics(tmp_path: Path) -> None:
    action_keys = {"tap_action", "hold_action", "double_tap_action", "press_action"}

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
    assert "sun.sun" not in room_view.read_text(encoding="utf-8")
    assert "sun.sun" not in (root / "views/main/02-rooms.yaml").read_text(encoding="utf-8")
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
    assert source.count("type: custom:marao-control-grid") == 1
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
    source = _view_source(room_view)

    assert "mode_selector_hash: '#page-room-office-card-2-modes'" in source
    assert "type: custom:marao-popup-card" in source
    assert "hash: '#page-room-office-card-2-modes'" in source
    assert "show_mode_buttons: true" in source
    assert source.index("# marao:custom:start") < source.index("components/navigation/navbar.yaml")


def test_room_graph_cards_use_the_shared_marao_background(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [
                {
                    "name": "Office",
                    "entities": [
                        {"entity_id": "sensor.power", "template": "md_graph_card"},
                        {
                            "entity_id": "switch.heater",
                            "variables": {
                                "show_graph": True,
                                "power_entity": "sensor.heater_power",
                            },
                        },
                    ],
                }
            ],
        },
        tmp_path,
    )

    source = (tmp_path / generated.slug / "views/rooms/00-office.yaml").read_text(
        encoding="utf-8"
    )

    assert "type: history-graph" not in source
    assert "template: md_graph_card" in source
    assert "template: md_switch_card" in source
    assert "sensor.power" in source
    assert "sensor.heater_power" in source
    assert "show_graph: true" in source


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
    source = _view_source(room_view)

    assert source.count("template: md_access_card") == 2
    assert "template: md_cover_card" in source
    assert "popup_hash: '#page-room-office-card-2-popup'" in source
    assert "popup_hash: '#page-room-office-card-3-popup'" in source
    assert "hash: '#page-room-office-card-2-popup'" in source
    assert "hash: '#page-room-office-card-3-popup'" in source
    assert "action_service: lock.unlock" in source
    assert "action_service: lock.lock" in source
    assert "action_service: cover.open_cover" in source
    assert "action_service: cover.close_cover" in source
    assert source.count("template: md_access_slide_action_card") == 2
    assert "template: md_access_hold_action_card" not in source
    assert source.count("template: md_access_action_card") == 2
    assert "action_requires_hold: true" not in source
    assert source.index("# marao:custom:start") < source.index("components/navigation/navbar.yaml")


def test_open_only_door_generates_strict_slide_without_unused_popup(tmp_path: Path) -> None:
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "rooms": [{
                "name": "Entry",
                "entities": {"cover": [{
                    "entity_id": "cover.entry_door",
                    "device_class": "door",
                    "supported_features": 1,
                }]},
            }],
        },
        tmp_path,
    )

    source = (tmp_path / generated.slug / "views/rooms/00-entry.yaml").read_text(encoding="utf-8")
    assert "template: md_access_slide_action_card" in source
    assert "template: md_access_action_card" not in source
    assert "action_label_key: access.open" in source
    assert "action_service: cover.open_cover" in source
    assert "#access-cover-entry-door" not in source


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

    source = _view_source(tmp_path / generated.slug / "views/rooms/00-living-room.yaml")
    view = _load_view(tmp_path / generated.slug / "views/rooms/00-living-room.yaml")
    popup = next(card for card in view["cards"] if card.get("hash") == "#page-room-living-room-card-2-popup")
    app_grid = next(card for card in popup["cards"] if card.get("cards", [{}])[0].get("template") == "md_media_app_card")

    assert "popup_hash: '#page-room-living-room-card-2-popup'" in source
    assert "hash: '#page-room-living-room-card-2-popup'" in source
    assert "template: md_media_app_card" in source
    assert "app_source: YouTube" in source
    assert "command: top_menu" in source
    assert "command: KEY_VOLDOWN" in source
    assert "perform_action: media_player.media_seek" in source
    assert "seek_offset: -10" in source and "seek_offset: 30" in source
    assert "[[[" not in source
    assert app_grid["type"] == "custom:marao-control-grid"
    assert app_grid["columns"] == 3
    assert all(card["show_state"] is False for card in app_grid["cards"])


def test_media_page_exposes_every_configured_player_and_its_popup(tmp_path: Path) -> None:
    players = [
        {"entity_id": "media_player.tv", "name": "Television"},
        {"entity_id": "media_player.music", "name": "Music"},
    ]
    generated = write_dashboard(
        {"name": "Generated Test", "pages": {"media": {"players": players}}},
        tmp_path,
    )
    view = _load_view(tmp_path / generated.slug / "views/main/05-media.yaml")
    controls = [card for card in _walk_generated_cards(view["cards"]) if card.get("template") == "md_media_card"]
    assert [card["entity"] for card in controls] == [player["entity_id"] for player in players]
    popups = {card["hash"] for card in view["cards"] if isinstance(card, dict) and card.get("type") == "custom:marao-popup-card"}
    assert {card["variables"]["popup_hash"] for card in controls} == popups


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

    source = _view_source(tmp_path / generated.slug / "views/rooms/00-garden.yaml")

    assert "template: md_camera_card" in source
    assert "popup_hash: '#page-room-garden-card-2-popup'" in source
    assert "hash: '#page-room-garden-card-2-popup'" in source
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

    source = _view_source(tmp_path / generated.slug / "views/rooms/00-garden.yaml")

    assert "template: md_camera_card" in source
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
                    "appliances": [{"entity_id": "sensor.dishwasher", "template": "md_dishwasher_card"}],
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
    lights_config = yaml.load(lights, Loader=MaraoDashboardLoader)
    light_cards = lights_config["cards"]
    assert [card["entity"] for card in light_cards] == ["light.living_room_main"]
    assert all(card["type"] == "custom:marao-card" for card in light_cards)
    assert "cover.living_room_blind" in covers
    room_source = (root / "views/rooms/00-living-room.yaml").read_text(encoding="utf-8")
    assert "input_boolean.holiday_mode" in room_source
    assert "input_number.target_temperature" in room_source
    assert "alarm_control_panel.home" in (root / "views/main/01-security.yaml").read_text(encoding="utf-8")
    assert "lock.front_door" in (root / "views/main/01-security.yaml").read_text(encoding="utf-8")
    assert "sensor.house_power" in (root / "views/main/03-energy.yaml").read_text(encoding="utf-8")
    energy = yaml.load((root / "views/main/03-energy.yaml").read_text(encoding="utf-8"), Loader=MaraoDashboardLoader)
    assert [card["entity"] for card in _walk_generated_cards(energy["cards"]) if card.get("type") == "custom:marao-energy-period-card"] == ["sensor.month_energy", "sensor.month_cost"]
    assert (root / "components/popups/energy_house_power.yaml").exists()
    wallbox = (root / "views/main/04-wallbox.yaml").read_text(encoding="utf-8")
    assert "template: md_wallbox_current_card" in wallbox
    assert "shortcuts:" in wallbox
    media = yaml.load(
        (root / "views/main/05-media.yaml").read_text(encoding="utf-8"),
        Loader=MaraoDashboardLoader,
    )
    app_grid = next(card for card in _walk_generated_cards(media["cards"]) if card.get("cards", [{}]) and card.get("cards", [{}])[0].get("template") == "md_media_app_card")
    assert app_grid["type"] == "custom:marao-control-grid"
    assert app_grid["columns"] == 2
    assert app_grid["cards"][0]["variables"]["app_source"] == "YouTube"
    assert app_grid["cards"][0]["show_state"] is False


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
        assert popup["type"] == "custom:marao-popup-card"
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
    assert config["pages"][0]["sections"][0]["entities"][0]["entity_id"] == "weather.home"
    assert [group["entity_type"] for group in _home_groups(config)] == ["light", "battery"]
    assert _home_groups(config)[0]["popup_filter"] == "active"
    assert [room["name"] for room in _room_pages(config)] == ["Kitchen", "Office"]
    assert _room(config, 0)["entities"]["light"][0]["entity_id"] == "light.kitchen_main"
    assert _room(config, 0)["entities"]["sensor"][0]["device_class"] == "battery"
    assert _room(config, 1)["entities"]["switch"][0]["entity_id"] == "switch.office_plug"


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

    assert config["pages"][0]["sections"] == []
    assert [room["name"] for room in _room_pages(config)] == ["Home"]
    assert _room(config, 0)["entities"]["sensor"][0]["entity_id"] == "sensor.unassigned"
    assert len(_room(config, 0)["entities"]["sensor"]) == 1


def test_existing_empty_base_dashboard_config_is_not_repopulated(tmp_path: Path) -> None:
    config_path = tmp_path / "dashboard.json"
    config_path.write_text(
        '{"name":"Marao Dashboard","slug":"dashboard","rooms":[]}\n',
        encoding="utf-8",
    )

    config = ensure_dashboard_config(
        config_path,
        [{"entity_id": "light.unassigned", "name": "Unassigned Lamp"}],
    )

    assert _room_pages(config) == []
    assert config_path.read_text() == '{"name":"Marao Dashboard","slug":"dashboard","rooms":[]}\n'


def test_legacy_theme_names_migrate_to_single_theme() -> None:
    config = {"name": "Marao Dashboard", "theme": "Marao Dashboard Gold", "rooms": []}

    assert migrate_legacy_theme(config)
    assert config["theme"] == "Marao Dashboard"


@pytest.mark.parametrize("theme", [[], {"name": "Unexpected"}])
def test_non_string_theme_is_rejected_without_breaking_migration(theme: object) -> None:
    config = {"name": "Marao Dashboard", "theme": theme, "rooms": []}

    assert not migrate_legacy_theme(config)
    assert config["theme"] == theme
    with pytest.raises(ValueError, match="theme must be a string"):
        resolve_dashboard_config(config)


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


def test_security_page_access_actions_reuse_safe_controls_and_unique_popups(tmp_path: Path) -> None:
    """Page actions must not turn lock/door controls into generic toggles."""
    generated = write_dashboard(
        {
            "name": "Generated Test",
            "pages": {
                "security": {
                    "access_entities": ["lock.front_door"],
                    "actions": [
                        "lock.front_door",
                        {"entity_id": "cover.garage_door", "device_class": "garage"},
                        {"entity_id": "cover.gate", "device_class": "gate", "supported_features": 1},
                        "switch.porch",
                    ],
                }
            },
        },
        tmp_path,
    )
    source = _view_source(tmp_path / generated.slug / "views/main/01-security.yaml")
    assert source.count("hash: '#page-security-card-1-popup'") == 2
    assert source.count("hash: '#page-security-card-2-popup'") == 2  # Duplicate controls own independent sheets.
    assert source.count("hash: '#page-security-card-3-popup'") == 2
    assert "#access-cover-gate" not in source  # Open-only gate uses a direct strict slide.
    assert source.count("template: md_access_slide_action_card") == 4
    assert source.count("template: md_access_action_card") == 3
    assert "template: md_access_hold_action_card" in source
    assert source.count("action: toggle") == 1  # Only the ordinary switch.
    for service in ["lock.unlock", "lock.lock", "cover.open_cover", "cover.close_cover"]:
        assert f"action_service: {service}" in source

@pytest.mark.parametrize("precision", [False, True, "0", 1.5, None, -1, 7])
def test_energy_precision_rejected_before_output(tmp_path: Path, precision: object) -> None:
    config = {"name": "Energy", "rooms": [], "pages": {"energy": {
        "today_energy": {"entity_id": "sensor.energy", "variables": {"display_precision": precision}},
    }}}
    with pytest.raises(ValueError, match="display_precision"):
        write_dashboard(config, tmp_path)
    assert not list(tmp_path.iterdir())


@pytest.mark.parametrize("source,target,accepted", [
    ("W", "kW", True), ("mW", "MW", True), ("J", "Wh", True),
    ("kWh", "GJ", True), ("Wh", "kW", False), ("EUR", "Wh", False),
    (None, "kWh", True), ("", "kWh", True), ("W", "kw", False), ("W", None, False),
])
def test_energy_conversion_uses_actual_metadata(source: str | None, target: str | None, accepted: bool) -> None:
    config = {"name": "Energy", "rooms": [{"name": "Room", "entities": [
        {"entity_id": "sensor.energy", "unit_of_measurement": "kWh", "variables": {"display_unit": target}},
    ]}]}
    registry = [{"entity_id": "sensor.energy", "unit_of_measurement": source}]
    if not accepted:
        with pytest.raises(ValueError, match="display_unit"):
            resolve_dashboard_config(config, registry)
    else:
        resolved = resolve_dashboard_config(config, registry)
        assert _room(resolved)["entities_by_domain"]["sensor"][0]["unit_of_measurement"] == source
        assert config["rooms"][0]["entities"][0]["unit_of_measurement"] == "kWh"


def test_energy_formatting_generation_and_independent_graph_sources(tmp_path: Path) -> None:
    variables = {"display_unit": "kWh", "display_precision": 0, "retained": "option"}
    config = {"name": "Energy", "rooms": [], "pages": {"energy": {
        "today_energy": {"entity_id": "sensor.energy", "variables": variables},
        "loads": [{"name": "Load", "power_entity": {"entity_id": "sensor.power", "variables": {
            "display_unit": "kW", "display_precision": 6}}, "variables": {"show_icon": False}}],
    }, "custom": [{"name": "Custom", "cards": [{"type": "custom:marao-card",
        "template": "md_graph_card", "entity": "sensor.energy", "variables": {
            "display_unit": "kWh", "graph_entity": "sensor.history"}}]}]}}
    registry = [{"entity_id": "sensor.energy", "unit_of_measurement": "Wh"},
                {"entity_id": "sensor.power", "unit_of_measurement": "W"},
                {"entity_id": "sensor.history", "unit_of_measurement": "J"}]
    resolved = resolve_dashboard_config(config, registry)
    entries = next(page for page in resolved["pages"] if page["path"] == "energy")["_sections"]
    summary = generator._page_card(entries[0]["ordered_cards"][0], "marao-energy")
    sheet = generator._page_card_popups(entries[0]["ordered_cards"][0])[0]["cards"][0]
    for card in (summary, sheet):
        assert card["display_unit"] == "kWh"
        assert card["display_precision"] == 0
        assert "retained" not in card
    load = generator._page_card(entries[1]["ordered_cards"][0], "marao-energy")
    assert load["variables"] == {"display_unit": "kW", "display_precision": 6, "show_icon": False}
    assert config["pages"]["energy"]["today_energy"]["variables"] == variables
    registry[-1]["unit_of_measurement"] = "W"
    with pytest.raises(ValueError, match="incompatible with sensor.history"):
        write_dashboard(config, tmp_path, registry)
    assert not list(tmp_path.iterdir())


def test_switch_formatting_uses_secondary_unit_and_preserves_legacy_label() -> None:
    config = {"name": "Power", "rooms": [{"name": "Room", "entities": [
        {"entity_id": "switch.load", "variables": {"power_entity": "sensor.power", "power_unit": "MW",
                                                   "display_unit": "kW", "display_precision": 0}},
    ]}]}
    resolved = resolve_dashboard_config(config, [{"entity_id": "sensor.power", "unit_of_measurement": "W"}])
    entity = _room(resolved)["entities_by_domain"]["switch"][0]
    assert generator._entity_card(entity)["variables"] == config["rooms"][0]["entities"][0]["variables"]
    resolve_dashboard_config(config, [])  # A late-loading source must not block generation.
    with pytest.raises(ValueError, match="requires a supported source unit"):
        resolve_dashboard_config(config, [{"entity_id": "sensor.power", "unit_of_measurement": "EUR"}])
    del config["rooms"][0]["entities"][0]["variables"]["display_unit"]
    resolve_dashboard_config(config, [])  # Precision alone needs no guessed dimension.

@pytest.mark.parametrize("columns", [None, 1])
def test_energy_duplicate_occurrences_remain_independent(columns: int | None) -> None:
    entities = [
        {"entity_id": "sensor.energy", "template": "md_graph_card", "variables": {"display_unit": "kWh", "display_precision": 0}},
        {"entity_id": "sensor.energy", "variables": {"display_unit": "Wh", "display_precision": 6}},
        "sensor.energy",
    ]
    room = {"name": "Room", "entities": entities}
    if columns:
        room["columns"] = columns
    config = {"name": "Energy", "rooms": [room]}
    resolved = _room(resolve_dashboard_config(config, [{"entity_id": "sensor.energy", "unit_of_measurement": "Wh"}]))
    assert len(resolved["ordered_cards"]) == 3
    cards = [generator._entity_card(item) for item in resolved["entities_by_domain"]["sensor"]]
    assert cards[0]["variables"] == entities[0]["variables"]
    assert cards[1]["variables"] == entities[1]["variables"]
    assert "variables" not in cards[2]
    assert cards[0]["template"] == "md_graph_card"
    assert cards[1]["template"] == cards[2]["template"] == "md_sensor_card"


@pytest.mark.parametrize("key", ["../outside", "unsafe\nfrontend:\n  themes: changed", "Has Spaces", 12])
def test_invalid_dashboard_route_is_rejected_before_writes(tmp_path, key):
    from custom_components.marao_dashboard.generator import plan_dashboard
    config = {"name": "Route", "rooms": []}
    with pytest.raises(ValueError, match="Dashboard key"):
        plan_dashboard(config, tmp_path, dashboard_key_override=key)
    with pytest.raises(ValueError, match="Dashboard key"):
        write_dashboard(config, tmp_path, dashboard_key_override=key)
    assert not list(tmp_path.iterdir())


@pytest.mark.parametrize("kind,entity_id,metadata", [
    ("light", "light.accent", {}), ("cover", "cover.blind", {}),
    ("climate", "climate.office", {}), ("battery", "sensor.charge", {"device_class": "battery"}),
])
def test_entity_group_resolves_independently_and_preserves_member_options(kind, entity_id, metadata):
    group = {"template": "md_entity_group_card", "id": "office-group", "name": "Office", "entity_type": kind,
             "entities": [entity_id, {"entity_id": entity_id, "name": "Custom", "variables": {"future": 42}, "extension": True}],
             "future": {"keep": True}}
    config = {"config_version": 1, "name": "Groups", "rooms": [{"name": "Room", "columns": 2,
        "entities": ["light.independent", group, {"page": "overview"}], "cards": [{"type": "markdown", "content": "Raw"}]}]}
    original = json.loads(json.dumps(config))
    result = resolve_dashboard_config(config, [{"entity_id": entity_id, "name": "Live", **metadata}])
    room = _room(result)
    resolved = room["ordered_cards"][1]
    assert resolved["id"] == "office-group" and resolved["future"] == {"keep": True}
    assert resolved["popup_filter"] == ("active" if kind == "light" else "all")
    assert resolved["entities"] == [{"entity_id": entity_id, "name": "Custom", **metadata, "variables": {"future": 42}, "extension": True}]
    assert [item["entity_id"] for item in room["entities_by_domain"]["light"]] == ["light.independent"]
    assert room["ordered_cards"][2]["page"] == "overview"
    assert room["cards"] == [{"type": "markdown", "content": "Raw"}]
    assert config == original


@pytest.mark.parametrize("selection", ["direct", "list", "grouped"])
def test_empty_entity_group_keeps_identity_without_importing_room_entities(selection):
    group = {"template": "md_entity_group_card", "id": "empty-group", "name": "Empty", "entity_type": "light", "entities": []}
    entities = group if selection == "direct" else [group] if selection == "list" else {"entity_group": [group]}
    result = resolve_dashboard_config({"name": "Groups", "rooms": [{"name": "Room", "entities": entities}]})
    actual = _room(result)["ordered_cards"][0]
    assert {key: actual[key] for key in group} == group
    assert actual["popup_filter"] == "active"
    assert actual["variables"]["popup_hash"] == "#page-room-room-empty-group-popup"
    assert not any(card.get("entity_id") for card in _room(result)["ordered_cards"])


@pytest.mark.parametrize("change", [
    {"id": "../unsafe"}, {"entity_type": "sensor"}, {"popup_filter": "off"}, {"popup_filter": None},
    {"entities": ["cover.blind"]}, {"entities": [{"page": "overview"}]},
    {"entities": [{"entity_id": "light.main", "entities": []}]},
    {"entities": [{"entity_id": "light.main", "template": "md_battery_card"}]},
    {"entities": [False]}, {"entity_id": "light.main"}, {"name": ""}, {"entities": None}, {"icon": []},
    {"entities": [{"entity_id": "light.main", "template": {}}]},
    {"entities": [{"entity_id": "light.main", "variables": []}]},
])
def test_invalid_entity_group_preflights_without_writes(tmp_path, change):
    group = {"template": "md_entity_group_card", "id": "safe-group", "name": "Group", "entity_type": "light", "entities": [], **change}
    config = {"name": "Groups", "rooms": [{"name": "Room", "entities": [group]}]}
    with pytest.raises(ValueError, match="Entity Group"):
        write_dashboard(config, tmp_path)
    assert not list(tmp_path.iterdir())


def test_entity_group_ids_are_unique_across_overview_and_containers():
    group = {"template": "md_entity_group_card", "id": "same", "name": "Group", "entity_type": "light", "entities": []}
    config = {"name": "Groups", "overview": {"entity_groups": [group]}, "rooms": [{"name": "Room", "entities": [group]}]}
    with pytest.raises(ValueError, match="Duplicate Entity Group"):
        resolve_dashboard_config(config)
    group["id"] = "overview-lights"
    config["overview"]["entity_groups"] = []
    with pytest.raises(ValueError, match="reserved"):
        resolve_dashboard_config(config)


def test_battery_group_rejects_known_arbitrary_sensor_and_retains_missing_references():
    group = {"template": "md_entity_group_card", "id": "batteries", "name": "Battery", "entity_type": "battery", "entities": ["sensor.charge"]}
    config = {"name": "Groups", "rooms": [{"name": "Room", "entities": [group]}]}
    with pytest.raises(ValueError, match="incompatible"):
        resolve_dashboard_config(config, [{"entity_id": "sensor.charge", "device_class": "temperature"}])
    resolved = resolve_dashboard_config(config)
    assert _room(resolved)["entities_by_domain"]["entity_group"][0]["entities"][0]["entity_id"] == "sensor.charge"


@pytest.mark.parametrize("explicit", [False, True])
@pytest.mark.parametrize("device_class", [None, "battery"])
def test_legacy_maintenance_members_survive_page_conversion(tmp_path, explicit, device_class):
    member = {"entity_id": "sensor.fixture_battery", "name": "Saved battery", "variables": {"future": 42}}
    group = {"template": "md_entity_group_card", "id": "overview-maintenance", "name": "Maintenance",
             "entity_type": "battery", "entities": [member]}
    source = {"config_version": 1, "name": "Groups", "rooms": [{"name": "Room", "entities": [member]}],
              "overview": {"entity_groups": [group]} if explicit else {}}
    before = json.loads(json.dumps(source))
    registry = [{"entity_id": member["entity_id"], "device_class": device_class}]
    converted = generator.migrate_dashboard_config(source, registry)
    saved = json.loads(json.dumps(converted))
    resolved = resolve_dashboard_config(converted, registry)
    assert _home_groups(resolved)[0]["entities"][0]["entity_id"] == member["entity_id"]
    assert _home_groups(converted)[0]["entities"] == [member]
    generated = write_dashboard(converted, tmp_path, registry)
    popup = tmp_path / generated.slug / "components/popups/overview_maintenance.yaml"
    assert member["entity_id"] in popup.read_text()
    assert source == before and converted == saved
    other = json.loads(json.dumps(converted))
    _home_groups(other)[0]["id"] = "other-batteries"
    if device_class is None:
        with pytest.raises(ValueError, match="incompatible"):
            resolve_dashboard_config(other, registry)


def test_legacy_group_adapter_preserves_source_options_empty_intent_and_registry_independence():
    source = {"config_version": 1, "name": "Legacy", "rooms": [{"name": "Office", "entities": [
        {"entity_id": "light.main", "variables": {"enable_slider": False}, "future": 42},
        "cover.blind", "climate.office", {"entity_id": "sensor.office_battery", "template": "md_battery_card"},
    ]}], "overview": {"weather_entity": "weather.home", "scenes": ["scene.evening"], "extension": True}}
    original = json.loads(json.dumps(source))
    preview = generator.materialize_overview_groups(source)
    groups = preview["overview"]["entity_groups"]
    assert [group["id"] for group in groups] == ["overview-lights", "overview-blinds", "overview-climate", "overview-maintenance"]
    assert [group["popup_filter"] for group in groups] == ["active", "all", "all", "all"]
    assert groups[0]["entities"] == [{"entity_id": "light.main", "variables": {"enable_slider": False}, "future": 42}]
    assert source == original
    assert generator.materialize_overview_groups({**source, "overview": {**source["overview"], "entity_groups": []}})["overview"]["entity_groups"] == []
    assert generator.materialize_overview_groups(preview, [{"entity_id": "light.added", "area_id": "office"}]) == preview
    assert generator.materialize_overview_groups(source, language="pt")["overview"]["entity_groups"][0]["name"] == "Iluminação"


def test_reusable_group_generation_preserves_mixed_order_and_stable_scoped_popups(tmp_path):
    group = {"template": "md_entity_group_card", "id": "office-group", "name": "Office group", "entity_type": "climate",
             "entities": [{"entity_id": "climate.office", "name": "Configured thermostat", "variables": {"setpoint_label": "Target"}}]}
    other = {**group, "id": "second-group", "name": "Other group"}
    config = {"name": "Groups", "overview": {"entity_groups": []}, "rooms": [{"name": "Room", "columns": 2,
              "entities": ["light.independent", group, {"page": "overview"}, other], "cards": [{"type": "markdown", "content": "Raw"}]}],
              "pages": {"custom": [{"name": "Custom", "path": "custom", "entities": [{**group, "id": "custom-group"}]}]}}
    generated = write_dashboard(config, tmp_path)
    path = tmp_path / generated.slug / "views/rooms/00-room.yaml"
    view = _load_view(path)
    cards = view["cards"][1]["cards"]
    assert [card.get("template", card["type"]) for card in cards] == ["md_light_card", "md_entity_group_card", "md_navigation_card", "md_entity_group_card", "markdown"]
    popups = [card for card in view["cards"] if isinstance(card, dict) and card.get("type") == "custom:marao-popup-card"]
    assert len({popup["hash"] for popup in popups}) == 4
    assert next(popup for popup in popups if popup["hash"] == "#page-room-room-office-group-popup")["cards"][0]["name"] == "Configured thermostat"
    assert any(popup["hash"] == "#page-room-room-office-group-popup-climate-office-modes" for popup in popups)
    assert any(popup["hash"] == "#page-room-room-second-group-popup-climate-office-modes" for popup in popups)
    source = (tmp_path / generated.slug / "views/main/00-overview.yaml").read_text()
    assert "#overview-climate" not in source and "#overview-lights" not in source
    hashes = {popup["hash"] for popup in popups}
    config["rooms"][0]["entities"] = [other, {**group, "name": "Renamed"}]
    write_dashboard(config, tmp_path)
    updated = _load_view(path)
    assert {card["hash"] for card in updated["cards"] if isinstance(card, dict) and card.get("type") == "custom:marao-popup-card"} == hashes


def test_cover_groups_keep_access_safety_open_only_and_blind_options(tmp_path):
    group = {"template": "md_entity_group_card", "id": "covers", "name": "Access and blinds", "entity_type": "cover", "entities": [
        {"entity_id": "cover.blind", "variables": {"future": 42}},
        {"entity_id": "cover.garage", "template": "md_cover_card"}, "cover.open_only",
    ]}
    registry = [{"entity_id": "cover.blind", "device_class": "blind"}, {"entity_id": "cover.garage", "device_class": "garage"},
                {"entity_id": "cover.open_only", "device_class": "door", "supported_features": 1}]
    generated = write_dashboard({"name": "Groups", "overview": {"entity_groups": [group]}, "rooms": []}, tmp_path, registry)
    path = tmp_path / generated.slug / "components/popups/entity_group_covers.yaml"
    popup = _load_view(path)
    assert "entity" not in popup
    assert [card["template"] for card in popup["cards"]] == ["md_cover_card", "md_access_card", "md_access_slide_action_card"]
    assert popup["cards"][0]["variables"]["future"] == 42
    assert popup["cards"][1]["variables"]["popup_hash"] == "#entity-group-covers-cover-garage-access"
    assert popup["cards"][2]["variables"]["action_service"] == "cover.open_cover"
    secondary = yaml.load((path.parent / "entity_group_covers_0.yaml").read_text(), Loader=MaraoDashboardLoader)
    assert secondary["hash"] == "#entity-group-covers-cover-garage-access"
    assert secondary["cards"][0]["cards"][0]["template"] == "md_access_slide_action_card"


def test_overview_group_type_change_retains_reserved_link_identity():
    group = {"template": "md_entity_group_card", "id": "overview-lights", "name": "Blinds", "entity_type": "cover", "entities": ["cover.blind"]}
    resolved = resolve_dashboard_config({"name": "Groups", "rooms": [], "overview": {"entity_groups": [group]}})
    assert generator._entity_group_card(_home_groups(resolved)[0])["tap_action"]["navigation_path"] == "#overview-lights"


@pytest.mark.parametrize("popup_hash", ["#entity-group-controls", "#unsafe/hash", "#entity-group-controls-climate-a_b-modes"])
def test_group_owned_popup_hashes_preflight_collisions_and_unsafe_links(tmp_path, popup_hash):
    group = {"template": "md_entity_group_card", "id": "controls", "name": "Controls", "entity_type": "climate", "entities": [
        "climate.a_b", {"entity_id": "climate.other", "variables": {"mode_selector_hash": popup_hash}},
    ]}
    with pytest.raises(ValueError, match="popup hash"):
        write_dashboard({"name": "Groups", "rooms": [], "overview": {"entity_groups": [group]}}, tmp_path)
    assert not list(tmp_path.iterdir())


def test_group_secondary_hashes_distinguish_underscores():
    group = {"template": "md_entity_group_card", "id": "controls", "name": "Controls", "entity_type": "climate", "entities": ["climate.a_b", "climate.ab"]}
    resolved = resolve_dashboard_config({"name": "Groups", "rooms": [], "overview": {"entity_groups": [group]}})
    popups = generator._entity_group_secondary_popups(_home_groups(resolved)[0])
    assert [popup["hash"] for popup in popups] == ["#entity-group-controls-climate-a_b-modes", "#entity-group-controls-climate-ab-modes"]


@pytest.mark.parametrize("other", [
    {"entities": [{"entity_id": "climate.other", "variables": {"mode_selector_hash": "#entity-group-controls"}}]},
    {"cards": [{"type": "custom:marao-popup-card", "hash": "#entity-group-controls", "cards": []}]},
])
def test_group_rejects_other_generated_and_raw_popup_collisions_before_writes(tmp_path, other):
    group = {"template": "md_entity_group_card", "id": "controls", "name": "Controls", "entity_type": "light", "entities": []}
    with pytest.raises(ValueError, match="conflicts with another popup"):
        write_dashboard({"name": "Groups", "rooms": [{"name": "Room", **other, "entities": [group, *other.get("entities", [])]}], "overview": {"entity_groups": []}}, tmp_path)
    assert not list(tmp_path.iterdir())


def test_legacy_custom_climate_hash_remains_usable_in_distinct_owning_views(tmp_path):
    source = {"name": "Legacy", "config_version": 1, "rooms": [{"name": "Room", "entities": [
        {"entity_id": "climate.office", "variables": {"mode_selector_hash": "#custom-modes", "future": True}},
    ]}]}
    preview = generator.materialize_overview_groups(source)
    assert preview["overview"]["entity_groups"][0]["entities"] == source["rooms"][0]["entities"]
    write_dashboard(preview, tmp_path)


def test_alarm_layout_forwarding_is_additive_and_validation_is_shared():
    from copy import deepcopy
    from custom_components.marao_dashboard.generator import _alarm_popup
    from custom_components.marao_dashboard.page_model import validate_pages
    from custom_components.marao_dashboard.editor import EDITOR_CATALOG
    templates = {card["id"]: card["domains"] for card in EDITOR_CATALOG["cards"]}
    for layout in (None, "dropdown", "grid", "invalid"):
        card = {"id": "alarm", "template": "md_security_card", "entity_id": "alarm_control_panel.safe", "name": "Alarm", "variables": {"future": 42}}
        if layout is not None:
            card["variables"]["alarm_layout"] = layout
        original = deepcopy(card)
        config = {"name": "Safe", "config_version": 2, "pages": [{"path": "home", "name": "Home", "entities": [card]}], "landing_page": "home"}
        if layout == "invalid":
            with pytest.raises(ValueError, match="dropdown or grid"):
                validate_pages(config, templates)
            continue
        validate_pages(config, templates)
        child = _alarm_popup(card)["cards"][0]
        assert child.get("variables", {}) == ({"alarm_layout": layout} if layout else {})
        assert card == original


def test_exhaust_defaults_explicit_choices_and_blinds_membership_preserve_source():
    from copy import deepcopy
    from custom_components.marao_dashboard.generator import _domain_template, _entity_card, _legacy_overview_groups
    damper = {"entity_id": "cover.airflow", "device_class": "damper", "name": "Airflow"}
    assert _domain_template(damper) == "md_fan_card"
    assert _entity_card(damper)["template"] == "md_fan_card"
    explicit = {**damper, "template": "md_cover_card", "variables": {"future": 42}}
    assert _entity_card(explicit)["template"] == "md_cover_card"
    shutter = {"entity_id": "cover.blind", "template": "md_fan_card", "variables": {"enable_slider": False, "future": 42}}
    original = deepcopy(shutter)
    assert _entity_card(shutter)["variables"] == original["variables"]
    assert shutter == original
    ordinary = {"entity_id": "cover.window"}
    config = {"rooms": [{"name": "Room", "entities": [damper, shutter, ordinary], "entities_by_domain": {"cover": [damper, shutter, ordinary]}}]}
    groups = _legacy_overview_groups(config)
    assert next(group for group in groups if group["entity_type"] == "cover")["entities"] == ["cover.window"]
    with pytest.raises(ValueError, match="access card"):
        _entity_card({**shutter, "device_class": "garage"})
    with pytest.raises(ValueError, match="access card"):
        _entity_card({**shutter, "name": "Door"})


def test_cover_group_uses_one_ventilation_filter_without_rewriting_explicit_members():
    from copy import deepcopy
    from custom_components.marao_dashboard.generator import _resolve_entity_group, _entity_group_card, _entity_group_popup
    group = {"id": "blinds", "name": "Blinds", "template": "md_entity_group_card", "entity_type": "cover", "popup_filter": "all", "entities": ["cover.damper", {"entity_id": "cover.shutter", "template": "md_fan_card"}, {"entity_id": "cover.explicit", "template": "md_cover_card"}]}
    original = deepcopy(group)
    resolved = _resolve_entity_group(group, [{"entity_id": "cover.damper", "device_class": "damper"}, {"entity_id": "cover.explicit", "device_class": "damper"}], set())
    assert _entity_group_card(resolved)["variables"]["summary_entities"] == ["cover.explicit"]
    popup = _entity_group_popup(resolved)
    assert popup["entity_group"]["entities"] == ["cover.explicit"]
    assert group == original
