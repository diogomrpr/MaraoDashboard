from __future__ import annotations

from pathlib import Path
import json
import shutil
import textwrap

import pytest
import yaml

from homeassistant.components import frontend
from homeassistant.components.lovelace import LOVELACE_DATA, MODE_YAML
from homeassistant.components.lovelace.const import CONF_RESOURCE_TYPE_WS
from homeassistant.components.frontend import DATA_EXTRA_MODULE_URL, DATA_PANELS
from homeassistant.const import CONF_URL
from homeassistant.helpers import area_registry as ar, entity_registry as er
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.marao_dashboard import (
    _management_payload,
    _editor_areas,
    _registry_entities,
    _restore_history,
    _save_and_generate_dashboard,
)
from custom_components.marao_dashboard.const import (
    BASE_DASHBOARD_CREATED,
    DEFAULT_DASHBOARD_CONFIG,
    DOMAIN,
    GENERATE_DASHBOARD_SERVICE,
    MARAO_DASHBOARD_MODULES,
    MARAO_DASHBOARD_STATIC_URL,
)
from custom_components.marao_dashboard.dependency_runtime import (
    DEPENDENCY_ISSUE_ID,
    LEGACY_RESOURCES_ISSUE_ID,
    async_dependency_statuses,
    async_migrate_legacy_vendor_resources,
    async_refresh_dependency_issue,
)
from custom_components.marao_dashboard.editor import EDITOR_CATALOG


def _create_area_entity(hass, area_name: str, entity_id: str) -> None:
    area = ar.async_get(hass).async_create(area_name)
    domain, object_id = entity_id.split(".", 1)
    entry = er.async_get(hass).async_get_or_create(
        domain,
        "test",
        object_id,
        suggested_object_id=object_id,
    )
    er.async_get(hass).async_update_entity(entry.entity_id, area_id=area.id)
    hass.states.async_set(entry.entity_id, "off")


def _reset_dashboard_files(hass) -> None:
    """Keep the shared Home Assistant test config isolated between test runs."""

    shutil.rmtree(hass.config.path("dashboard/MaraoDashboard"), ignore_errors=True)


async def test_setup_entry_installs_base_dashboard_once(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text(
        textwrap.dedent(
            """
            default_config:

            lovelace:
              dashboards:
                marao-dashboard-card-test:
                  mode: yaml
                  title: Card Test
                  filename: "www/community/MaraoDashboard/dashboard/MaraoDashboard/main.yaml"
            """
        ).lstrip(),
        encoding="utf-8",
    )
    _create_area_entity(hass, "Kitchen", "light.kitchen_main")
    er.async_get(hass).async_get_or_create(
        "weather",
        "test",
        "home",
        suggested_object_id="home",
    )
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={})
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    dashboard = Path(hass.config.path("dashboard/MaraoDashboard/dashboard/dashboard.yaml"))
    dashboard_json = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    generated_source = "\n".join(
        path.read_text(encoding="utf-8") for path in dashboard.parent.rglob("*.yaml")
    )
    config_source = Path(hass.config.path("configuration.yaml")).read_text(encoding="utf-8")

    stored_entry = hass.config_entries.async_get_entry(entry.entry_id)
    assert stored_entry.data[BASE_DASHBOARD_CREATED]
    assert dashboard.exists()
    assert dashboard_json.exists()
    assert json.loads(dashboard_json.read_text(encoding="utf-8"))["rooms"][0]["name"] == "Kitchen"
    assert "title: Marao Dashboard" in generated_source
    assert "weather.home" in generated_source
    assert "light.kitchen_main" in generated_source
    assert Path(hass.config.path("themes/MaraoDashboard/marao-dashboard.yaml")).exists()
    assert Path(
        hass.config.path(
            "www/community/MaraoDashboard/dashboard/MaraoDashboard/"
            "templates/internal_templates/_base_templates/hc_base_card.yaml"
        )
    ).exists()
    assert "marao-dashboard:" in config_source
    assert "marao-dashboard-card-test:" not in config_source
    assert 'filename: "dashboard/MaraoDashboard/dashboard/dashboard.yaml"' in config_source
    assert 'filename: "www/community/MaraoDashboard/dashboard/MaraoDashboard/main.yaml"' not in config_source
    assert "themes: !include_dir_merge_named themes" in config_source
    assert "extra_module_url:" not in config_source
    assert "/hacsfiles/MaraoDashboard/MaraoDashboard.js" not in config_source
    assert "resource_mode:" not in config_source
    assert "/hacsfiles/MaraoDashboard/vendor/" not in config_source
    resource_urls = {
        item[CONF_URL] for item in hass.data[LOVELACE_DATA].resources.async_items()
    }
    assert not any("/MaraoDashboard/vendor/" in url for url in resource_urls)
    assert not any("marao_dashboard_static" in url for url in resource_urls)
    assert set(MARAO_DASHBOARD_MODULES) <= set(hass.data[DATA_EXTRA_MODULE_URL].urls)
    assert all(url.startswith(MARAO_DASHBOARD_STATIC_URL) for url in MARAO_DASHBOARD_MODULES)
    assert hass.data[DOMAIN]["websocket_registered"]
    assert "marao-dashboard-editor" in hass.data[DATA_PANELS]
    history = list(
        Path(hass.config.path("dashboard/MaraoDashboard/.history")).glob("*/metadata.json")
    )
    assert len(history) == 1
    websocket_commands = hass.data["websocket_api"]
    assert "marao_dashboard/config/get" in websocket_commands
    assert "marao_dashboard/config/generate" in websocket_commands
    assert "marao_dashboard/history/restore" in websocket_commands
    assert "marao_dashboard/dependencies/recheck" in websocket_commands
    assert ir.async_get(hass).async_get_issue(DOMAIN, DEPENDENCY_ISSUE_ID) is not None


async def test_setup_entry_marker_prevents_regeneration(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    _create_area_entity(hass, "Kitchen", "light.kitchen_main")
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={})
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    dashboard = Path(hass.config.path("dashboard/MaraoDashboard/dashboard/dashboard.yaml"))
    dashboard_json = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    dashboard.write_text("user edited dashboard\n", encoding="utf-8")
    dashboard_json.write_text('{"name":"User JSON","rooms":[]}\n', encoding="utf-8")

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    config_source = Path(hass.config.path("configuration.yaml")).read_text(encoding="utf-8")
    assert dashboard.read_text(encoding="utf-8") == "user edited dashboard\n"
    assert dashboard_json.read_text(encoding="utf-8") == '{"name":"User JSON","rooms":[]}\n'
    assert config_source.count("marao-dashboard:") == 1
    assert "marao-dashboard-card-test:" not in config_source
    assert "/hacsfiles/MaraoDashboard/MaraoDashboard.js" not in config_source
    assert set(MARAO_DASHBOARD_MODULES) <= set(hass.data[DATA_EXTRA_MODULE_URL].urls)


@pytest.mark.parametrize(
    "invalid_config",
    [
        {"name": "User JSON", "rooms": "not-a-list"},
        {"name": "User JSON", "rooms": [], "theme": []},
        {"name": "User JSON", "rooms": [], "theme": {"name": "Unexpected"}},
    ],
)
async def test_setup_preserves_malformed_but_loadable_user_config(
    hass, invalid_config: dict[str, object]
) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text(
        "default_config:\n", encoding="utf-8"
    )
    dashboard_json = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    dashboard_json.parent.mkdir(parents=True)
    source = json.dumps(invalid_config, separators=(",", ":")) + "\n"
    dashboard_json.write_text(source, encoding="utf-8")
    output_dir = dashboard_json.parent / "user-json"
    popup = output_dir / "components" / "popups" / "overview_climate.yaml"
    popup.parent.mkdir(parents=True)
    popup_source = """type: custom:bubble-card
card_type: pop-up
hash: '#overview-climate'
cards:
  # marao:generated:start
  # marao:generated:end
  # marao:custom:start
  # marao:custom:end
  # marao:generated-footer:start
  # marao:generated-footer:end
"""
    popup.write_text(popup_source, encoding="utf-8")
    (output_dir / ".marao-generated.json").write_text(
        json.dumps(
            {
                "version": 1,
                "plain": [],
                "containers": ["components/popups/overview_climate.yaml"],
            }
        ),
        encoding="utf-8",
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Marao Dashboard",
        data={BASE_DASHBOARD_CREATED: True},
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert dashboard_json.read_text(encoding="utf-8") == source
    assert popup.read_text(encoding="utf-8") == popup_source


async def test_setup_repairs_comment_only_generated_popup(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text(
        "default_config:\n", encoding="utf-8"
    )
    _create_area_entity(hass, "Kitchen", "climate.kitchen")
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={})
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    popup = Path(
        hass.config.path(
            "dashboard/MaraoDashboard/dashboard/components/popups/overview_climate.yaml"
        )
    )
    source = popup.read_text(encoding="utf-8")
    generated_start = "  # marao:generated:start\n"
    generated_end = "  # marao:generated:end\n"
    content_start = source.index(generated_start) + len(generated_start)
    content_end = source.index(generated_end)
    popup.write_text(source[:content_start] + source[content_end:], encoding="utf-8")
    assert yaml.safe_load(popup.read_text(encoding="utf-8"))["cards"] is None

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    repaired = yaml.safe_load(popup.read_text(encoding="utf-8"))
    assert isinstance(repaired["cards"], list)
    assert repaired["cards"]


async def test_setup_removes_stale_comment_only_generated_popup(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text(
        "default_config:\n", encoding="utf-8"
    )
    _create_area_entity(hass, "Kitchen", "climate.kitchen")
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={})
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    popup = Path(
        hass.config.path(
            "dashboard/MaraoDashboard/dashboard/components/popups/overview_climate.yaml"
        )
    )
    source = popup.read_text(encoding="utf-8")
    generated_start = "  # marao:generated:start\n"
    generated_end = "  # marao:generated:end\n"
    content_start = source.index(generated_start) + len(generated_start)
    content_end = source.index(generated_end)
    popup.write_text(source[:content_start] + source[content_end:], encoding="utf-8")

    dashboard_json = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    config = json.loads(dashboard_json.read_text(encoding="utf-8"))
    config["rooms"] = []
    dashboard_json.write_text(json.dumps(config), encoding="utf-8")
    er.async_get(hass).async_remove("climate.kitchen")
    hass.states.async_remove("climate.kitchen")

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    overview = Path(
        hass.config.path("dashboard/MaraoDashboard/dashboard/views/main/00-overview.yaml")
    )
    assert not popup.exists()
    assert "overview_climate.yaml" not in overview.read_text(encoding="utf-8")


async def test_setup_preserves_standalone_card_resources(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    resources = hass.data[LOVELACE_DATA].resources
    button = await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/button-card/button-card.js",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    unrelated = await resources.async_create_item(
        {
            CONF_URL: "/local/unrelated-card.js",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    external_module = "/hacsfiles/lovelace-card-mod/card-mod.js"
    frontend.add_extra_js_url(hass, external_module)

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    unloaded_modules = set(hass.data[DATA_EXTRA_MODULE_URL].urls)
    assert external_module in unloaded_modules
    assert not set(MARAO_DASHBOARD_MODULES) & unloaded_modules
    assert "marao-dashboard-editor" not in hass.data[DATA_PANELS]
    assert {item["id"] for item in resources.async_items()} >= {
        button["id"],
        unrelated["id"],
    }
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    items = {item["id"]: item for item in resources.async_items()}
    assert items[button["id"]][CONF_URL] == "/hacsfiles/button-card/button-card.js"
    assert items[unrelated["id"]][CONF_URL] == "/local/unrelated-card.js"
    assert not any("/MaraoDashboard/vendor/" in item[CONF_URL] for item in items.values())


async def test_remove_entry_clears_repairs_but_unload_preserves_them(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text(
        "default_config:\n", encoding="utf-8"
    )
    config_path = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(
        '{"name":"Marao Dashboard","slug":"dashboard","rooms":[]}\n',
        encoding="utf-8",
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Marao Dashboard",
        data={BASE_DASHBOARD_CREATED: True},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    resources = hass.data[LOVELACE_DATA].resources
    await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/MaraoDashboard/vendor/button-card/button-card.js",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    hass.data[LOVELACE_DATA].resource_mode = MODE_YAML
    assert await async_migrate_legacy_vendor_resources(hass) == 0

    issue_registry = ir.async_get(hass)
    assert issue_registry.async_get_issue(DOMAIN, DEPENDENCY_ISSUE_ID) is not None
    assert issue_registry.async_get_issue(DOMAIN, LEGACY_RESOURCES_ISSUE_ID) is not None

    assert await hass.config_entries.async_unload(entry.entry_id)
    assert issue_registry.async_get_issue(DOMAIN, DEPENDENCY_ISSUE_ID) is not None
    assert issue_registry.async_get_issue(DOMAIN, LEGACY_RESOURCES_ISSUE_ID) is not None

    assert await hass.config_entries.async_remove(entry.entry_id) == {"require_restart": False}
    assert issue_registry.async_get_issue(DOMAIN, DEPENDENCY_ISSUE_ID) is None
    assert issue_registry.async_get_issue(DOMAIN, LEGACY_RESOURCES_ISSUE_ID) is None


async def test_storage_mode_migrates_only_legacy_vendor_resources(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Marao Dashboard",
        data={BASE_DASHBOARD_CREATED: True},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    resources = hass.data[LOVELACE_DATA].resources
    await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/MaraoDashboard/vendor/button-card/button-card.js?v=7",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    standalone = await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/button-card/button-card.js?hacstag=7",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    items = {item["id"]: item for item in resources.async_items()}
    assert standalone["id"] in items
    assert not any("/MaraoDashboard/vendor/" in item[CONF_URL] for item in items.values())
    assert ir.async_get(hass).async_get_issue(DOMAIN, LEGACY_RESOURCES_ISSUE_ID) is None


async def test_yaml_resource_mode_reports_legacy_resources_without_mutation(hass) -> None:
    _reset_dashboard_files(hass)
    config_path = Path(hass.config.path("configuration.yaml"))
    config_path.write_text("default_config:\n", encoding="utf-8")
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Marao Dashboard",
        data={BASE_DASHBOARD_CREATED: True},
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    resources = hass.data[LOVELACE_DATA].resources
    legacy = await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/MaraoDashboard/vendor/Bubble-Card/bubble-card.js",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    standalone = await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/button-card/button-card.js",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    hass.data[LOVELACE_DATA].resource_mode = MODE_YAML
    source = config_path.read_text(encoding="utf-8")
    statuses = await async_dependency_statuses(
        hass, {"name": "Marao Dashboard", "rooms": []}
    )
    by_id = {item["id"]: item for item in statuses}

    assert await async_migrate_legacy_vendor_resources(hass) == 0

    items = {item["id"]: item for item in resources.async_items()}
    assert legacy["id"] in items
    assert standalone["id"] in items
    assert by_id["button_card"]["status"] == "installed"
    assert by_id["bubble_card"]["status"] == "not_detected"
    assert config_path.read_text(encoding="utf-8") == source
    assert ir.async_get(hass).async_get_issue(DOMAIN, LEGACY_RESOURCES_ISSUE_ID) is not None


async def test_dependency_statuses_resolve_area_linked_rooms(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text(
        "default_config:\n", encoding="utf-8"
    )
    _create_area_entity(hass, "Kitchen", "light.kitchen_main")
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Marao Dashboard",
        data={BASE_DASHBOARD_CREATED: True},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    config = {"name": "Areas", "rooms": [{"name": "Kitchen", "area": "Kitchen"}]}
    statuses = await async_dependency_statuses(
        hass, config, _registry_entities(hass)
    )
    required = {item["id"] for item in statuses if item["required"]}
    assert {"my_cards", "bubble_card"} <= required
    assert "mini_graph_card" not in required

    config["rooms"][0].update(
        {
            "entities": ["light.kitchen_main"],
            "exclude": ["light.kitchen_main"],
        }
    )
    excluded_statuses = await async_dependency_statuses(
        hass, config, _registry_entities(hass)
    )
    assert {
        item["id"] for item in excluded_statuses if item["required"]
    } == {"button_card", "navbar_card", "kiosk_mode", "card_mod"}


async def test_dependency_repair_clears_after_required_resources_are_detected(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    config = {"name": "Marao Dashboard", "slug": "dashboard", "rooms": []}
    config_path = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(json.dumps(config), encoding="utf-8")
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Marao Dashboard",
        data={BASE_DASHBOARD_CREATED: True},
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert ir.async_get(hass).async_get_issue(DOMAIN, DEPENDENCY_ISSUE_ID) is not None

    resources = hass.data[LOVELACE_DATA].resources
    for url in (
        "/hacsfiles/button-card/button-card.js?hacstag=7",
        "/hacsfiles/lovelace-navbar-card/navbar-card.js",
        "/hacsfiles/kiosk-mode/kiosk-mode.js",
    ):
        await resources.async_create_item(
            {CONF_URL: url, CONF_RESOURCE_TYPE_WS: "module"}
        )
    frontend.add_extra_js_url(
        hass, "/hacsfiles/lovelace-card-mod/card-mod.js?hacstag=4"
    )

    statuses = await async_refresh_dependency_issue(hass, config)
    by_id = {item["id"]: item for item in statuses}
    assert all(by_id[item]["status"] == "installed" for item in (
        "button_card", "navbar_card", "kiosk_mode", "card_mod"
    ))
    assert by_id["my_cards"]["required"] is False
    assert by_id["my_cards"]["status"] == "not_detected"
    assert ir.async_get(hass).async_get_issue(DOMAIN, DEPENDENCY_ISSUE_ID) is None


async def test_generate_dashboard_service_dry_run_does_not_write(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    _create_area_entity(hass, "Kitchen", "light.kitchen_main")
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={})
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    custom_config = Path(hass.config.path("dashboard/MaraoDashboard/custom.json"))
    custom_config.write_text('{"name":"Dry Run","slug":"dry-run","rooms":[]}\n', encoding="utf-8")
    dashboard = Path(hass.config.path("dashboard/MaraoDashboard/dry-run/dashboard.yaml"))
    config_source = Path(hass.config.path("configuration.yaml")).read_text(
        encoding="utf-8"
    )
    issue_before = ir.async_get(hass).async_get_issue(DOMAIN, DEPENDENCY_ISSUE_ID)
    assert issue_before is not None

    response = await hass.services.async_call(
        DOMAIN,
        GENERATE_DASHBOARD_SERVICE,
        {"config_path": "dashboard/MaraoDashboard/custom.json", "dry_run": True},
        blocking=True,
        return_response=True,
    )

    assert response["dry_run"]
    assert response["dashboard_key"] == "marao-dry-run"
    assert "dashboard/MaraoDashboard/dry-run/dashboard.yaml" in response["filename"]
    assert len(response["dependencies"]) == 7
    assert not dashboard.exists()
    assert Path(hass.config.path("configuration.yaml")).read_text(
        encoding="utf-8"
    ) == config_source
    issue_after = ir.async_get(hass).async_get_issue(DOMAIN, DEPENDENCY_ISSUE_ID)
    assert issue_after is not None
    assert issue_after.translation_placeholders == issue_before.translation_placeholders


async def test_generate_dashboard_service_writes_dashboard_and_raw_room_cards(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    custom_config = Path(hass.config.path("dashboard/MaraoDashboard/service.json"))
    custom_config.parent.mkdir(parents=True, exist_ok=True)
    custom_config.write_text(
        json.dumps(
            {
                "name": "Service Dashboard",
                "slug": "service-dashboard",
                "rooms": [
                    {
                        "name": "Office",
                        "entities": ["light.office_main"],
                        "cards": [{"type": "markdown", "content": "Raw service card"}],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    response = await hass.services.async_call(
        DOMAIN,
        GENERATE_DASHBOARD_SERVICE,
        {"config_path": "dashboard/MaraoDashboard/service.json"},
        blocking=True,
        return_response=True,
    )

    dashboard = Path(hass.config.path("dashboard/MaraoDashboard/service-dashboard/dashboard.yaml"))
    room = Path(hass.config.path("dashboard/MaraoDashboard/service-dashboard/views/rooms/00-office.yaml"))
    config_source = Path(hass.config.path("configuration.yaml")).read_text(encoding="utf-8")

    assert not response["dry_run"]
    assert dashboard.exists()
    assert "title: Service Dashboard" in dashboard.read_text(encoding="utf-8")
    assert "Raw service card" in room.read_text(encoding="utf-8")
    assert "marao-service-dashboard:" in config_source
    assert config_source.count("marao-service-dashboard:") == 1


async def test_management_editor_generates_and_restores_version(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    _create_area_entity(hass, "Kitchen", "light.kitchen_main")
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={})
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    dashboard_dir = Path(hass.config.path("dashboard/MaraoDashboard/dashboard"))
    manual_file = dashboard_dir / "manual-card.yaml"
    manual_file.write_text("manual card before generation\n", encoding="utf-8")
    original = _management_payload(hass)
    edited = json.loads(original["config"])
    edited["name"] = "Edited Dashboard"

    generated = await hass.async_add_executor_job(
        _save_and_generate_dashboard,
        hass,
        json.dumps(edited),
        _registry_entities(hass),
    )
    history = _management_payload(hass)["history"]
    baseline = next(item for item in history if item["reason"] == "before generation")

    assert generated["dashboard_url"] == "/marao-dashboard/overview"
    assert json.loads(_management_payload(hass)["config"])["name"] == "Edited Dashboard"
    assert manual_file.read_text(encoding="utf-8") == "manual card before generation\n"

    restored = await hass.async_add_executor_job(_restore_history, hass, baseline["version"])

    assert restored["dashboard_url"] == "/marao-dashboard/overview"
    assert json.loads(_management_payload(hass)["config"])["name"] == "Marao Dashboard"
    assert manual_file.read_text(encoding="utf-8") == "manual card before generation\n"


async def test_management_payload_includes_editor_context(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    _create_area_entity(hass, "Kitchen", "light.kitchen_main")
    hass.states.async_set("sensor.unregistered_temperature", "21", {"friendly_name": "Temperature"})
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={})
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    payload = _management_payload(hass, _registry_entities(hass), _editor_areas(hass))

    assert payload["editor"]["catalog"]["version"] == 1
    assert payload["editor"]["areas"] == [
        {"area_id": payload["editor"]["areas"][0]["area_id"], "name": "Kitchen", "icon": None}
    ]
    entity = next(
        item
        for item in payload["editor"]["entities"]
        if item["entity_id"] == "light.kitchen_main"
    )
    assert entity["area_name"] == "Kitchen"
    assert entity["state"] == "off"
    unregistered = next(
        item
        for item in payload["editor"]["entities"]
        if item["entity_id"] == "sensor.unregistered_temperature"
    )
    assert unregistered["name"] == "Temperature"
    assert unregistered["state"] == "21"


def test_editor_catalog_maps_to_installed_templates() -> None:
    template_dir = Path(
        "custom_components/marao_dashboard/frontend/dashboard/MaraoDashboard/templates/internal_templates"
    )
    card_ids = {card["id"] for card in EDITOR_CATALOG["cards"]}

    assert len(card_ids) == len(EDITOR_CATALOG["cards"])
    assert card_ids == {
        "hc_access_card",
        "hc_battery_card",
        "hc_camera_card",
        "hc_climate_card",
        "hc_cover_card",
        "hc_dishwasher_card",
        "hc_fan_card",
        "hc_graph_card",
        "hc_light_card",
        "hc_media_card",
        "hc_navigation_card",
        "hc_number_card",
        "hc_sensor_card",
        "hc_switch_card",
        "hc_timeline_card",
        "hc_toggle_graph_card",
        "hc_vacuum_card",
        "hc_washing_machine_card",
    }
    for card in EDITOR_CATALOG["cards"]:
        template_path = template_dir / f"{card['id']}.yaml"
        assert template_path.exists()
        assert all(
            {"key", "label", "kind", "selector", "advanced", "description"}
            <= variable.keys()
            for variable in card["variables"]
        )
        template = yaml.safe_load(template_path.read_text(encoding="utf-8"))[card["id"]]
        declared_variables = set(template.get("variables", {}))
        catalog_variables = {variable["key"] for variable in card["variables"]}
        assert declared_variables <= catalog_variables
    for page in EDITOR_CATALOG["pages"].values():
        assert page["description"]
        assert all(
            {"key", "label", "kind", "selector", "advanced", "description"}
            <= field.keys()
            for field in page["fields"]
        )
