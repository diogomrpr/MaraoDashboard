from __future__ import annotations

from pathlib import Path
import asyncio
import json
import shutil
import textwrap
from unittest.mock import patch
from unittest.mock import AsyncMock

import pytest
import yaml

from homeassistant.components import frontend
from homeassistant.components.lovelace import LOVELACE_DATA, MODE_YAML
from homeassistant.components.lovelace.const import CONF_RESOURCE_TYPE_WS
from homeassistant.components.lovelace.dashboard import LovelaceYAML
from homeassistant.components.frontend import DATA_EXTRA_MODULE_URL, DATA_PANELS
from homeassistant.const import CONF_URL
from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.util.yaml import load_yaml
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.marao_dashboard import (
    FRONTEND_MODULES,
    async_setup_entry,
    _generated_dashboard_needs_self_contained_repair,
    _management_payload,
    _editor_areas,
    _registry_entities,
    _restore_history,
    _save_and_generate_dashboard,
    _generate_dashboard,
    frontend_fingerprint,
    _register_websocket_commands,
    _publish_frontend,
    FRONTEND_SUBSCRIBERS,
)
from custom_components.marao_dashboard.const import (
    BASE_DASHBOARD_CREATED,
    DEFAULT_DASHBOARD_CONFIG,
    DOMAIN,
    GENERATE_DASHBOARD_SERVICE,
    MARAO_DASHBOARD_MODULES,
    MARAO_DASHBOARD_BOOTSTRAP,
)
from custom_components.marao_dashboard.legacy_migration import (
    LEGACY_RESOURCES_ISSUE_ID,
    async_plan_legacy_resources,
)
from custom_components.marao_dashboard.editor import EDITOR_CATALOG
from custom_components.marao_dashboard.generator import migrate_dashboard_config



def _room_page(config, index=0):
    return [page for page in config["pages"] if page.get("output_path", "").startswith("views/rooms/")][index]


async def test_frontend_refresh_signals(hass, hass_ws_client, hass_read_only_access_token):
    """Ordinary users receive updates, but only successful admin saves emit them."""
    hass.data.setdefault(DOMAIN, {})
    _register_websocket_commands(hass)
    _publish_frontend(hass, {"dashboard": "marao-dashboard", "fingerprint": "first"})
    viewer = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await viewer.send_json({"id": 1, "type": "marao_dashboard/frontend/subscribe"})
    assert (await viewer.receive_json())["success"]
    initial = (await viewer.receive_json())["event"]
    assert initial == {"dashboard": "marao-dashboard", "fingerprint": "first"}
    await viewer.send_json({"id": 2, "type": "marao_dashboard/config/generate", "config": "{}"})
    assert not (await viewer.receive_json())["success"]
    admin = await hass_ws_client(hass)
    with patch("custom_components.marao_dashboard._registry_entities", return_value=[]), \
         patch("custom_components.marao_dashboard._editor_areas", return_value=[]), \
         patch("custom_components.marao_dashboard._save_and_generate_dashboard", return_value={"dashboard_key": "marao-dashboard"}) as save, \
         patch("custom_components.marao_dashboard._async_refresh_dashboard", new_callable=AsyncMock), \
         patch("custom_components.marao_dashboard.list_dashboard_history", return_value=[]):
        requests = []
        for identifier in (1, 2):
            await admin.send_json({"id": identifier, "type": "marao_dashboard/config/generate", "config": "{}"})
            assert (await admin.receive_json())["success"]
            requests.append((await viewer.receive_json())["event"]["request_id"])
        assert requests[0] != requests[1]
        save.side_effect = ValueError("invalid source")
        await admin.send_json({"id": 3, "type": "marao_dashboard/config/generate", "config": "{}"})
        assert not (await admin.receive_json())["success"]
    # Failed save emitted nothing; next event is the lifecycle update, not a save.
    _publish_frontend(hass, {"dashboard": None, "fingerprint": None})
    assert (await viewer.receive_json())["event"] == {"dashboard": None, "fingerprint": None}
    _publish_frontend(hass, {"dashboard": "marao-dashboard", "fingerprint": "second"})
    assert (await viewer.receive_json())["event"] == {"dashboard": "marao-dashboard", "fingerprint": "second"}
    await viewer.send_json({"id": 3, "type": "unsubscribe_events", "subscription": 1})
    assert (await viewer.receive_json())["success"]
    assert not hass.data[DOMAIN][FRONTEND_SUBSCRIBERS]


def _room_entities(config):
    return _room_page(config)["sections"][-1].get("entities", [])


def _home_groups(config):
    return [card for section in config["pages"][0]["sections"] for card in section.get("entities", []) if card.get("template") == "md_entity_group_card"]

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


async def _persist_resource_fixture(hass, resources, hass_storage, monkeypatch):
    """Give the normally mocked resource store real files for recovery assertions."""
    store = resources.store
    original_load = store._async_load
    async def load():
        path = Path(store.path)
        if path.exists():
            hass_storage[store.key] = json.loads(await hass.async_add_executor_job(path.read_bytes))
        return await original_load()
    async def write(data):
        await hass.async_add_executor_job(store._write_data, data)
    monkeypatch.setattr(store, "_async_load", load)
    monkeypatch.setattr(store, "_async_write_data", write)
    await store.async_save({"items": resources.async_items()})


@pytest.mark.parametrize("existing_source", [False, True])
async def test_setup_route_collision_stops_before_owned_changes(hass, existing_source):
    _reset_dashboard_files(hass)
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    if existing_source:
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_text('{"name":"Dashboard","slug":"dashboard","rooms":[]}')
    configuration = Path(hass.config.path("configuration.yaml"))
    configuration.write_text("lovelace:\n  dashboards:\n    marao-dashboard:\n      mode: yaml\n      filename: manual.yaml\n")
    before = configuration.read_bytes()
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: existing_source})
    with patch("custom_components.marao_dashboard._register_services") as register:
        with pytest.raises(ValueError, match="unrelated configuration"):
            await async_setup_entry(hass, entry)
        register.assert_not_called()
    assert configuration.read_bytes() == before
    assert source.exists() == existing_source
    if existing_source:
        assert list(source.parent.iterdir()) == [source]


@pytest.mark.parametrize("operation", ["save", "generate", "dry-run"])
def test_generation_route_collision_preserves_source_output_and_history(hass, operation):
    _reset_dashboard_files(hass)
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True, exist_ok=True)
    saved = {"name": "Dashboard", "slug": "dashboard", "rooms": []}
    source.write_text(json.dumps(saved))
    output = source.parent / "dashboard"
    output.mkdir()
    (output / "manual.yaml").write_bytes(b"# exact user content\r\n")
    configuration = Path(hass.config.path("configuration.yaml"))
    configuration.write_text("lovelace:\n  dashboards:\n    marao-dashboard:\n      mode: yaml\n      filename: manual.yaml\n")
    before = {p: p.read_bytes() for p in [source, configuration, output / "manual.yaml"]}
    with pytest.raises(ValueError, match="unrelated configuration"):
        if operation == "save":
            _save_and_generate_dashboard(hass, json.dumps(saved), [])
        else:
            _generate_dashboard(hass, saved, dry_run=operation == "dry-run", registry_entities=[])
    assert all(p.read_bytes() == content for p, content in before.items())
    assert not (source.parent / ".history").exists()


@pytest.mark.parametrize("source", [
    '{"name":"Future","config_version":2,"rooms":[]}',
    '{"name":"Malformed","config_version":true,"rooms":[]}',
    '{not json',
])
async def test_setup_rejects_incompatible_source_before_owned_changes(hass, source) -> None:
    _reset_dashboard_files(hass)
    path = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(source, encoding="utf-8")
    configuration = Path(hass.config.path("configuration.yaml"))
    configuration.write_text("# unrelated configuration\n", encoding="utf-8")
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True})
    with patch("custom_components.marao_dashboard._register_services") as register:
        with pytest.raises(ValueError):
            await async_setup_entry(hass, entry)
        register.assert_not_called()
    assert path.read_text(encoding="utf-8") == source
    assert configuration.read_text(encoding="utf-8") == "# unrelated configuration\n"
    assert entry.data == {BASE_DASHBOARD_CREATED: True}
    assert list(path.parent.iterdir()) == [path]


@pytest.mark.parametrize("saved,submitted", [(1, 3), (3, 1), (True, 1)])
def test_editor_save_rejects_incompatible_format_without_replacing_baseline(
    hass, saved, submitted
) -> None:
    _reset_dashboard_files(hass)
    path = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    path.parent.mkdir(parents=True, exist_ok=True)
    original = json.dumps({"name": "Saved", "config_version": saved, "rooms": []})
    path.write_text(original, encoding="utf-8")
    source = json.dumps({"name": "Replacement", "config_version": submitted, "rooms": []})
    with pytest.raises(ValueError, match="config_version"):
        _save_and_generate_dashboard(hass, source, [])
    assert path.read_text(encoding="utf-8") == original
    assert list(path.parent.iterdir()) == [path]


def test_frontend_fingerprint_tracks_paths_and_content_but_not_caches(tmp_path: Path) -> None:
    module = tmp_path / "module.js"
    module.write_bytes(b"first")
    asset = tmp_path / "images" / "icon.svg"
    asset.parent.mkdir()
    asset.write_bytes(b"icon")
    initial = frontend_fingerprint(tmp_path)
    assert len(initial) == 16
    assert frontend_fingerprint(tmp_path) == initial

    # File creation order and timestamps must not invalidate unchanged assets.
    module.unlink()
    module.write_bytes(b"first")
    assert frontend_fingerprint(tmp_path) == initial
    for name in (".DS_Store", ".cache/temp", "__pycache__/temp", "temp.pyc", "temp.pyo"):
        cache = tmp_path / name
        cache.parent.mkdir(exist_ok=True)
        cache.write_bytes(b"ignored")
    assert frontend_fingerprint(tmp_path) == initial

    module.write_bytes(b"second")
    changed = frontend_fingerprint(tmp_path)
    assert changed != initial
    asset.rename(asset.with_name("renamed.svg"))
    renamed = frontend_fingerprint(tmp_path)
    assert renamed != changed
    module.unlink()
    assert frontend_fingerprint(tmp_path) != renamed


def test_generated_dashboard_repairs_legacy_blank_spacer(tmp_path: Path) -> None:
    dashboard_dir = tmp_path / "dashboard"
    dashboard_dir.mkdir()
    dashboard = dashboard_dir / "dashboard.yaml"

    dashboard.write_text("color_type: blank-card\n", encoding="utf-8")
    assert _generated_dashboard_needs_self_contained_repair(dashboard_dir)

    dashboard.write_text(
        "type: custom:marao-navbar-card\nroutes: []\n",
        encoding="utf-8",
    )
    assert not _generated_dashboard_needs_self_contained_repair(dashboard_dir)


def test_generated_repair_ignores_unowned_legacy_files_and_protected_cards(tmp_path: Path) -> None:
    dormant = tmp_path / "components/popups/energy_month.yaml"
    dormant.parent.mkdir(parents=True)
    dormant.write_text("type: custom:bubble-card\ncards:\n  - type: custom:button-card\n")
    (tmp_path / "dashboard.yaml").write_text("views: !include view.yaml\n")
    view = tmp_path / "view.yaml"
    source = """cards:
  # marao:generated:start
  - type: custom:marao-card
  # marao:generated:end
  # marao:custom:start
  - type: markdown
    content: "custom:button-card remains a protected note"
  # marao:custom:end
  # marao:generated-footer:start
  # marao:generated-footer:end
"""
    view.write_text(source)
    (tmp_path / ".marao-generated.json").write_text(json.dumps({
        "version": 1, "generated_contract": 2,
        "plain": ["dashboard.yaml"], "containers": ["view.yaml"],
    }))
    before = {path: path.read_bytes() for path in tmp_path.rglob("*") if path.is_file()}
    assert not _generated_dashboard_needs_self_contained_repair(tmp_path)
    assert all(path.read_bytes() == data for path, data in before.items())
    view.write_text(source.replace("type: custom:marao-card", "type: custom:button-card"))
    assert _generated_dashboard_needs_self_contained_repair(tmp_path)


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
    assert _room_page(json.loads(dashboard_json.read_text(encoding="utf-8")))["name"] == "Kitchen"
    assert "title: Marao Dashboard" in generated_source
    assert "weather.home" in generated_source
    assert "light.kitchen_main" in generated_source
    assert Path(hass.config.path("themes/MaraoDashboard/marao-dashboard.yaml")).exists()
    assert "marao-dashboard:" in config_source
    assert "marao-dashboard-card-test:" not in config_source
    assert 'filename: "dashboard/MaraoDashboard/dashboard/dashboard.yaml"' in config_source
    assert "MaraoDashboard/dashboard/MaraoDashboard/main.yaml" not in config_source
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
    module_urls = hass.data[DOMAIN][FRONTEND_MODULES]
    assert set(module_urls) <= set(hass.data[DATA_EXTRA_MODULE_URL].urls)
    assert tuple(url.split("?", 1)[0] for url in module_urls) == MARAO_DASHBOARD_MODULES
    assert all(url.startswith(MARAO_DASHBOARD_BOOTSTRAP) and "?v=" in url for url in module_urls)
    assert "marao-dashboard-card-test" not in hass.data[LOVELACE_DATA].dashboards
    assert "marao-dashboard-card-test" not in hass.data[DATA_PANELS]
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
    assert "marao_dashboard/dependencies/recheck" not in websocket_commands


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
    dashboard_json.write_text('{"name":"User JSON","slug":"dashboard","config_version":2,"landing_page":"home","pages":[{"name":"Home","path":"home","entities":[]}]}\n', encoding="utf-8")

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    config_source = Path(hass.config.path("configuration.yaml")).read_text(encoding="utf-8")
    assert dashboard.read_text(encoding="utf-8") == "user edited dashboard\n"
    assert dashboard_json.read_text(encoding="utf-8") == '{"name":"User JSON","slug":"dashboard","config_version":2,"landing_page":"home","pages":[{"name":"Home","path":"home","entities":[]}]}\n'
    assert config_source.count("marao-dashboard:") == 1
    assert "marao-dashboard-card-test:" not in config_source
    assert "/hacsfiles/MaraoDashboard/MaraoDashboard.js" not in config_source
    assert set(hass.data[DOMAIN][FRONTEND_MODULES]) <= set(hass.data[DATA_EXTRA_MODULE_URL].urls)


async def test_reload_updates_frontend_urls_and_unloads_exact_registered_version(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text(json.dumps({"config_version": 2, "name": "Marao Dashboard", "landing_page": "home", "navigation": [], "pages": [{"name": "Home", "path": "home", "entities": []}]}))
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)
    old_version, new_version = "0123456789abcdef", "fedcba9876543210"
    old_urls = {f"{url}?v={old_version}" for url in MARAO_DASHBOARD_MODULES}
    new_urls = {f"{url}?v={new_version}" for url in MARAO_DASHBOARD_MODULES}

    with patch(
        "custom_components.marao_dashboard.asset_snapshot",
        side_effect=[{"fingerprint": old_version}, {"fingerprint": new_version}],
    ) as fingerprint:
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        assert old_urls <= set(hass.data[DATA_EXTRA_MODULE_URL].urls)
        assert await hass.config_entries.async_reload(entry.entry_id)
        await hass.async_block_till_done()
        assert fingerprint.call_count == 2

    registered = set(hass.data[DATA_EXTRA_MODULE_URL].urls)
    assert not old_urls & registered
    assert new_urls <= registered
    panel = hass.data[DATA_PANELS]["marao-dashboard-editor"]
    assert panel.sidebar_icon == "marao_dashboard:mountain"
    assert panel.config["_panel_custom"]["module_url"] == f"/api/marao_dashboard/frontend/{new_version}/MaraoDashboardPanel.js?v={new_version}"
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert not new_urls & set(hass.data[DATA_EXTRA_MODULE_URL].urls)
    assert FRONTEND_MODULES not in hass.data[DOMAIN]


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

    with pytest.raises(ValueError):
        await async_setup_entry(hass, entry)
    assert Path(hass.config.path("configuration.yaml")).read_text() == "default_config:\n"

    assert dashboard_json.read_text(encoding="utf-8") == source
    assert popup.read_text(encoding="utf-8") == popup_source


async def test_setup_preserves_standalone_card_resources(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text(json.dumps({"config_version": 2, "name": "Marao Dashboard", "landing_page": "home", "navigation": [], "pages": [{"name": "Home", "path": "home", "entities": []}]}))
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

    registered_modules = hass.data[DOMAIN][FRONTEND_MODULES]
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    unloaded_modules = set(hass.data[DATA_EXTRA_MODULE_URL].urls)
    assert external_module in unloaded_modules
    assert not set(registered_modules) & unloaded_modules
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
    source = config_path.read_text(encoding="utf-8")
    assert await async_plan_legacy_resources(hass) is None

    assert await hass.config_entries.async_unload(entry.entry_id)
    issue_registry = ir.async_get(hass)
    assert issue_registry.async_get_issue(DOMAIN, LEGACY_RESOURCES_ISSUE_ID) is not None

    assert await hass.config_entries.async_remove(entry.entry_id) == {"require_restart": False}
    assert issue_registry.async_get_issue(DOMAIN, LEGACY_RESOURCES_ISSUE_ID) is None


async def test_storage_mode_migrates_only_legacy_marao_resources(hass, hass_storage, monkeypatch) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text(json.dumps({"config_version": 2, "name": "Marao Dashboard", "landing_page": "home", "navigation": [], "pages": [{"name": "Home", "path": "home", "entities": []}]}))
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Marao Dashboard",
        data={BASE_DASHBOARD_CREATED: True},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    resources = hass.data[LOVELACE_DATA].resources
    await _persist_resource_fixture(hass, resources, hass_storage, monkeypatch)
    redundant = []
    for url in ["/hacsfiles/MaraoDashboard/MaraoCards.js?v=old", *MARAO_DASHBOARD_MODULES]:
        redundant.append(await resources.async_create_item({CONF_URL: url, CONF_RESOURCE_TYPE_WS: "module"}))
    await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/MaraoDashboard/vendor/button-card/button-card.js?v=7",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/MaraoDashboard/MaraoFrigateEventsCard.js?v=old",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/MaraoDashboard/MaraoDashboard.js?v=old",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    standalone = await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/button-card/button-card.js?hacstag=7",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    external_lookalike = await resources.async_create_item(
        {
            CONF_URL: "https://example.com/hacsfiles/MaraoDashboard/MaraoDashboard.js",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    local_near_miss = await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/MaraoDashboard/MaraoDashboard.js.backup",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    items = {item["id"]: item for item in resources.async_items()}
    assert not {item["id"] for item in redundant} & items.keys()
    assert json.loads(Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)).read_text())["pages"] == [{"name": "Home", "path": "home", "entities": []}]
    assert standalone["id"] in items
    assert external_lookalike["id"] in items
    assert local_near_miss["id"] in items
    assert not any("/MaraoDashboard/vendor/" in item[CONF_URL] for item in items.values())
    assert not any("/MaraoDashboard/MaraoFrigateEventsCard.js" in item[CONF_URL] for item in items.values())
    assert not any(
        item[CONF_URL].split("?", 1)[0]
        == "/hacsfiles/MaraoDashboard/MaraoDashboard.js"
        for item in items.values()
    )
    assert ir.async_get(hass).async_get_issue(DOMAIN, LEGACY_RESOURCES_ISSUE_ID) is None


@pytest.mark.parametrize("boundary", ["delete", "flush", "silent-flush", "source", "interrupted", "concurrent", "cache-rollback"])
async def test_resource_cleanup_shares_exact_file_recovery_and_source_commit(hass, hass_storage, monkeypatch, boundary):
    from custom_components.marao_dashboard import history

    class Interrupted(BaseException):
        pass

    _reset_dashboard_files(hass)
    configuration = Path(hass.config.path("configuration.yaml"))
    configuration.write_text("default_config:\n# unrelated\n")
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    resources = hass.data[LOVELACE_DATA].resources
    await _persist_resource_fixture(hass, resources, hass_storage, monkeypatch)
    for url in ["/hacsfiles/MaraoDashboard/MaraoDashboard.js?v=old", "/hacsfiles/MaraoDashboard/vendor/button-card/button-card.js", "/local/unrelated-sentinel.js"]:
        await resources.async_create_item({CONF_URL: url, CONF_RESOURCE_TYPE_WS: "module"})
    await resources.store.async_save({"items": resources.async_items()})
    resource_file = Path(resources.store.path)
    resource_file.write_bytes((json.dumps(json.loads(resource_file.read_bytes()), indent=1).replace("\n", "\r\n") + "\r\n").encode())
    plan = await async_plan_legacy_resources(hass)
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    slug = json.loads(source.read_bytes())["slug"]
    exact = (json.dumps({"name": "Selected", "slug": slug, "rooms": []}) + "\r\n").encode()
    source.write_bytes(exact)
    output = source.parent / slug
    (output / "manual.txt").write_bytes(b"protected content\r\n")
    theme = Path(hass.config.path("themes/MaraoDashboard/marao-dashboard.yaml"))
    theme.write_bytes(b"Old theme:\r\n  primary-color: blue\r\n")
    before = {file: file.read_bytes() for file in [source, configuration, resource_file, theme, *output.rglob("*")] if file.is_file()}
    failed = False
    if boundary in ("delete", "concurrent"):
        original = resources.async_delete_item
        async def delete(item_id):
            nonlocal failed
            await original(item_id)
            if not failed:
                failed = True
                if boundary == "concurrent":
                    await resources.async_create_item({CONF_URL: "/local/concurrent-sentinel.js", CONF_RESOURCE_TYPE_WS: "module"})
                else:
                    raise OSError("injected deletion failure")
        monkeypatch.setattr(resources, "async_delete_item", delete)
    elif boundary == "flush":
        original = resources.store.async_save
        async def save(data):
            nonlocal failed
            if data["items"] == plan.after and not failed:
                failed = True
                raise OSError("injected persistence failure")
            await original(data)
        monkeypatch.setattr(resources.store, "async_save", save)
    elif boundary == "silent-flush":
        from homeassistant.util.file import WriteError
        original = resources.store._async_write_data
        async def silent_write(data):
            nonlocal failed
            if not failed:
                failed = True
                raise WriteError("injected native storage failure")
            await original(data)
        monkeypatch.setattr(resources.store, "_async_write_data", silent_write)
    else:
        original = history._write_bytes
        def write(file, content):
            nonlocal failed
            original(file, content)
            if file == source and not failed:
                failed = True
                if boundary == "interrupted":
                    raise Interrupted("injected interruption")
                raise OSError("injected source failure")
        monkeypatch.setattr(history, "_write_bytes", write)
    original_restore = plan.restore
    if boundary == "cache-rollback":
        async def broken_restore():
            raise ValueError("injected cache recovery failure")
        monkeypatch.setattr(plan, "restore", broken_restore)
    error = Interrupted if boundary == "interrupted" else ValueError if boundary in ("concurrent", "cache-rollback", "silent-flush") else OSError
    reason = "persistence failed" if boundary == "silent-flush" else "recovery failed" if error is ValueError else "injected"
    with pytest.raises(error, match=reason):
        await hass.async_add_executor_job(lambda: _generate_dashboard(hass, json.loads(exact), registry_entities=[], legacy_resources=plan))
    checkpoint = source.parent / ".history/.operation"
    if boundary == "concurrent":
        assert checkpoint.exists() and source.read_bytes() == exact
        assert {item[CONF_URL] for item in resources.async_items()} == {item[CONF_URL] for item in plan.before} | {"/local/concurrent-sentinel.js"}
        assert any(item[CONF_URL] == "/local/concurrent-sentinel.js" for item in json.loads(resource_file.read_bytes())["data"]["items"])
        assert (checkpoint / "operation.json").exists()
        return
    if boundary == "cache-rollback":
        assert checkpoint.exists()
        pending = {file: file.read_bytes() for file in before}
        with pytest.raises(ValueError, match="recovery failed"):
            _management_payload(hass, [])
        with pytest.raises(ValueError, match="recovery failed"):
            _generate_dashboard(hass, json.loads(exact), dry_run=True, registry_entities=[])
        assert all(file.read_bytes() == content for file, content in pending.items())
        monkeypatch.setattr(plan, "restore", original_restore)
        from custom_components.marao_dashboard import _recover_dashboard_state
        await hass.async_add_executor_job(_recover_dashboard_state, hass)
    if boundary == "interrupted":
        assert checkpoint.exists() and json.loads(source.read_bytes())["config_version"] == 2
        assert resources.async_items() == plan.after
        assert await hass.config_entries.async_unload(entry.entry_id)
        with patch("custom_components.marao_dashboard._generate_dashboard", side_effect=OSError("stop after recovery")):
            with pytest.raises(OSError, match="stop after recovery"):
                await async_setup_entry(hass, entry)
    assert all(file.read_bytes() == content for file, content in before.items())
    assert {file for file in output.rglob("*") if file.is_file()} == {file for file in before if file.is_relative_to(output)}
    assert resources.async_items() == plan.before
    assert not checkpoint.exists()


async def test_yaml_resource_mode_reports_legacy_resources_without_mutation(hass) -> None:
    _reset_dashboard_files(hass)
    config_path = Path(hass.config.path("configuration.yaml"))
    config_path.write_text("default_config:\n", encoding="utf-8")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text(json.dumps({"config_version": 2, "name": "Marao Dashboard", "landing_page": "home", "navigation": [], "pages": [{"name": "Home", "path": "home", "entities": []}]}))
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
    legacy_frontend = await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/MaraoDashboard/MaraoFrigateEventsCard.js?hacstag=old",
            CONF_RESOURCE_TYPE_WS: "module",
        }
    )
    legacy_main = await resources.async_create_item(
        {
            CONF_URL: "/hacsfiles/MaraoDashboard/MaraoDashboard.js?hacstag=old",
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
    assert await async_plan_legacy_resources(hass) is None

    items = {item["id"]: item for item in resources.async_items()}
    assert legacy["id"] in items
    assert legacy_frontend["id"] in items
    assert legacy_main["id"] in items
    assert standalone["id"] in items
    assert config_path.read_text(encoding="utf-8") == source
    assert ir.async_get(hass).async_get_issue(DOMAIN, LEGACY_RESOURCES_ISSUE_ID) is not None


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
    assert "dependencies" not in response
    assert not dashboard.exists()
    assert Path(hass.config.path("configuration.yaml")).read_text(
        encoding="utf-8"
    ) == config_source


async def test_generate_dashboard_service_writes_dashboard_and_raw_room_cards(hass) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text(json.dumps({"config_version": 2, "name": "Marao Dashboard", "landing_page": "home", "navigation": [], "pages": [{"name": "Home", "path": "home", "entities": []}]}))
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
    # The configured HA directory need not be /config. Resolve every generated
    # include with HA's own loader, including the nested room navbar include.
    resolved = await hass.async_add_executor_job(load_yaml, str(dashboard))
    office = next(view for view in resolved["views"] if view["title"] == "Office")
    section = next(card for card in office["cards"] if card.get("type") == "custom:marao-control-grid"
                   and any(child.get("entity") == "light.office_main" for child in card["cards"]))
    assert section["cards"][-1] == {"type": "markdown", "content": "Raw service card"}
    assert sum(card == {"type": "markdown", "content": "Raw service card"} for card in section["cards"]) == 1
    assert office["cards"][-1]["cards"][0]["type"] == "custom:marao-navbar-card"


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


@pytest.mark.parametrize("operation", ["editor", "service", "history"])
@pytest.mark.parametrize("members", [["cover.blinds"], []])
async def test_saved_group_removal_refreshes_cached_yaml_includes(
    hass, hass_ws_client, operation, members
):
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True, exist_ok=True)
    config = {"config_version": 2, "name": "Marao Dashboard", "slug": "dashboard",
              "landing_page": "home", "navigation": [], "pages": [{"name": "Home", "path": "home",
              "entities": [{"template": "md_entity_group_card", "id": "covers", "name": "Covers",
                            "entity_type": "cover", "entities": members}]}]}
    source.write_text(json.dumps(config))
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    baseline = _management_payload(hass)["history"][0]["version"]
    populated = json.loads(json.dumps(config))
    populated["pages"][0]["entities"][0]["entities"] = ["cover.blinds", "cover.gate"]
    await hass.async_add_executor_job(_save_and_generate_dashboard, hass, json.dumps(populated), [])
    dashboard = LovelaceYAML(hass, "marao-dashboard", {
        "filename": "dashboard/MaraoDashboard/dashboard/dashboard.yaml"})
    hass.data[LOVELACE_DATA].dashboards["marao-dashboard"] = dashboard
    assert "cover.gate" in json.dumps(await dashboard.async_load(False))
    root_mtime = Path(dashboard.path).stat().st_mtime_ns
    updates = []
    unsubscribe = hass.bus.async_listen("lovelace_updated", lambda event: updates.append(event.data))
    client = await hass_ws_client(hass)
    if operation == "service":
        source.write_text(json.dumps(config))
        await hass.services.async_call(DOMAIN, GENERATE_DASHBOARD_SERVICE, {}, blocking=True)
    else:
        message = {"type": "marao_dashboard/config/generate", "config": json.dumps(config)} if operation == "editor" else {
            "type": "marao_dashboard/history/restore", "version": baseline}
        await client.send_json({"id": 1, **message})
        result = await client.receive_json()
        assert result["success"], result
    await hass.async_block_till_done()
    current = await dashboard.async_load(False)
    group = current["views"][0]["cards"][0]["cards"][0]
    assert group["variables"]["summary_entities"] == members
    assert "cover.gate" not in json.dumps(current)
    assert Path(dashboard.path).stat().st_mtime_ns == root_mtime
    assert updates == [{"url_path": "marao-dashboard"}]
    unsubscribe()


async def test_registry_unit_metadata_uses_live_registered_and_unregistered_states(hass) -> None:
    entry = er.async_get(hass).async_get_or_create(
        "sensor", "test", "energy_meter", suggested_object_id="energy_meter"
    )
    hass.states.async_set(entry.entity_id, "2500", {"unit_of_measurement": "Wh"})
    hass.states.async_set("sensor.unregistered_cost", "12.345", {"unit_of_measurement": "EUR"})
    entities = {entity["entity_id"]: entity for entity in _registry_entities(hass)}
    assert entities[entry.entity_id]["unit_of_measurement"] == "Wh"
    assert entities["sensor.unregistered_cost"]["unit_of_measurement"] == "EUR"
    hass.states.async_set(entry.entity_id, "2.5", {"unit_of_measurement": "kWh"})
    assert next(entity for entity in _registry_entities(hass) if entity["entity_id"] == entry.entity_id)["unit_of_measurement"] == "kWh"
    hass.states.async_remove(entry.entity_id)
    assert next(entity for entity in _registry_entities(hass) if entity["entity_id"] == entry.entity_id)["unit_of_measurement"] is None


async def test_registry_device_metadata_uses_native_lookup_and_preserves_area_precedence(hass) -> None:
    config_entry = MockConfigEntry(domain=DOMAIN)
    config_entry.add_to_hass(hass)
    devices = dr.async_get(hass)
    area = ar.async_get(hass).async_create("Device fixture area")
    override = ar.async_get(hass).async_create("Entity fixture area")
    device = devices.async_get_or_create(config_entry_id=config_entry.entry_id,
        identifiers={(DOMAIN, "safe-device")}, manufacturer="Fixture", model="Synthetic")
    devices.async_update_device(device.id, area_id=area.id)
    entities = er.async_get(hass)
    entry = entities.async_get_or_create("light", "test", "safe-device-light", device_id=device.id)
    hass.states.async_set(entry.entity_id, "on")
    with patch.object(devices, "async_get", wraps=devices.async_get) as lookup:
        metadata = next(row for row in _registry_entities(hass) if row["entity_id"] == entry.entity_id)
    lookup.assert_called_once_with(device.id)
    assert metadata["device_model"] == "Synthetic"
    assert metadata["manufacturer"] == "Fixture"
    assert metadata["area_name"] == metadata["device_area_name"] == area.name
    entities.async_update_entity(entry.entity_id, area_id=override.id)
    metadata = next(row for row in _registry_entities(hass) if row["entity_id"] == entry.entity_id)
    assert metadata["area_name"] == override.name
    assert metadata["device_area_name"] == area.name


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
    assert payload["editor"]["catalog"]["config_version"] == 2
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
    card_ids = {card["id"] for card in EDITOR_CATALOG["cards"]}

    assert len(card_ids) == len(EDITOR_CATALOG["cards"])
    assert card_ids == {
        "md_title_card", "md_weather_card", "md_room_card", "md_scene_collection_card",
        "md_header_card", "md_glance_card", "md_scene_card", "md_access_action_card", "md_access_slide_action_card", "md_alarm_controls_card",
        "md_security_card", "md_access_hold_action_card", "md_base_card", "md_energy_period_card", "md_media_app_card",
        "md_entity_group_card",
        "md_access_card",
        "md_battery_card",
        "md_camera_card",
        "md_climate_card",
        "md_cover_card",
        "md_dishwasher_card",
        "md_fan_card",
        "md_graph_card",
        "md_light_card",
        "md_media_card",
        "md_navigation_card",
        "md_number_card",
        "md_sensor_card",
        "md_switch_card",
        "md_timeline_card",
        "md_toggle_graph_card",
        "md_vacuum_card",
        "md_wallbox_current_card",
        "md_washing_machine_card",
    }
    assert Path("custom_components/marao_dashboard/frontend/MaraoCards.js").exists()
    for card in EDITOR_CATALOG["cards"]:
        assert all(
            {"key", "label", "kind", "selector", "advanced", "description"}
            <= variable.keys()
            for variable in card["variables"]
        )
    for page in EDITOR_CATALOG["pages"].values():
        assert page["description"]
        assert all(
            {"key", "label", "kind", "selector", "advanced", "description"}
            <= field.keys()
            for field in page["fields"]
        )


@pytest.mark.parametrize("current", [False, True])
async def test_formatted_source_stays_editable_when_live_unit_disappears(hass, current) -> None:
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n", encoding="utf-8")
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    config = {"config_version": 1, "name": "Dashboard", "slug": "dashboard", "rooms": [], "pages": {"energy": {"today_energy": {
        "entity_id": "sensor.marao_dashboard_test_energy", "variables": {"display_unit": "kWh", "display_precision": 0},
    }}}}
    if current:
        config = migrate_dashboard_config(config)
    path = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source = json.dumps(config, indent=2) + "\n"
    path.write_text(source, encoding="utf-8")
    payload = _management_payload(hass, [])
    assert payload["conversion_pending"] is not current
    assert json.loads(payload["config"]) == migrate_dashboard_config(config)
    assert payload["dashboard_url"] == "/marao-dashboard/overview"
    assert path.read_text() == source
    _save_and_generate_dashboard(hass, source, [])
    assert json.loads(path.read_text()) == migrate_dashboard_config(config)
    if current:
        config["pages"][2]["sections"][0]["entities"][0]["variables"].pop("display_unit")
    else:
        config["pages"]["energy"]["today_energy"]["variables"].pop("display_unit")
    _save_and_generate_dashboard(hass, json.dumps(config), [])
    assert json.loads(path.read_text()) == migrate_dashboard_config(config)


async def test_setup_regenerates_contract_preserving_exact_empty_source_and_entry(hass):
    from custom_components.marao_dashboard.generator import write_dashboard
    from custom_components.marao_dashboard.history import list_dashboard_history
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n# unrelated\n")
    _create_area_entity(hass, "Kitchen", "light.upgrade_kitchen")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)); source.parent.mkdir(parents=True)
    exact = b'{\r\n "name":"Marao Dashboard", "config_version":2, "slug":"dashboard", "landing_page":"overview", "pages":[{"name":"Home","path":"overview","entities":[]}], "extension":{"keep":[2,1]}\r\n}\r\n'
    source.write_bytes(exact)
    output = source.parent / "dashboard"
    write_dashboard(json.loads(exact), source.parent, config_root=hass.config.config_dir)
    (output / "custom.txt").write_bytes(b"private customization\r\n")
    manifest = output / ".marao-generated.json"
    old = json.loads(manifest.read_text()); old.pop("generated_contract"); manifest.write_text(json.dumps(old))
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True, "extension": "retained"})
    entry.add_to_hass(hass); identifier = entry.entry_id
    assert await hass.config_entries.async_setup(identifier)
    await hass.async_block_till_done()
    assert entry.entry_id == identifier and entry.data["extension"] == "retained"
    assert source.read_bytes() == exact
    assert json.loads(manifest.read_text())["generated_contract"] == 3
    assert (output / "custom.txt").read_bytes() == b"private customization\r\n"
    assert not any(page.get("subview") for page in json.loads(source.read_bytes())["pages"])
    before = {str(p.relative_to(output)): p.read_bytes() for p in output.rglob("*") if p.is_file()}
    versions = list_dashboard_history(source.parent)
    assert await hass.config_entries.async_reload(identifier)
    await hass.async_block_till_done()
    assert source.read_bytes() == exact
    assert {str(p.relative_to(output)): p.read_bytes() for p in output.rglob("*") if p.is_file()} == before
    assert list_dashboard_history(source.parent) == versions


async def test_setup_keeps_converted_maintenance_without_battery_metadata(hass):
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n")
    _create_area_entity(hass, "Fixture", "sensor.fixture_battery")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True)
    config = {"config_version": 2, "name": "Marao Dashboard", "slug": "dashboard", "landing_page": "overview",
              "pages": [{"name": "Home", "path": "overview", "entities": [{"template": "md_entity_group_card",
                  "id": "overview-maintenance", "name": "Maintenance", "entity_type": "battery",
                  "entities": ["sensor.fixture_battery"]}]}]}
    exact = json.dumps(config, indent=2).encode() + b"\n"
    source.write_bytes(exact)
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert source.read_bytes() == exact
    assert "sensor.fixture_battery" in (source.parent / "dashboard/components/popups/page-overview-overview-maintenance-popup.yaml").read_text()


async def test_generation_waits_for_setup_before_reading_the_saved_source(hass, monkeypatch):
    from custom_components.marao_dashboard import panel_custom
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n")
    started, release = asyncio.Event(), asyncio.Event()
    original = panel_custom.async_register_panel
    async def pause_setup(*args, **kwargs):
        started.set()
        await release.wait()
        return await original(*args, **kwargs)
    monkeypatch.setattr(panel_custom, "async_register_panel", pause_setup)
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    setup = asyncio.create_task(hass.config_entries.async_setup(entry.entry_id))
    await started.wait()
    generated = asyncio.create_task(hass.services.async_call(
        DOMAIN, GENERATE_DASHBOARD_SERVICE, {"dry_run": True}, blocking=True, return_response=True,
    ))
    await asyncio.sleep(0)
    assert not generated.done()
    assert not Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)).exists()
    release.set()
    assert await setup
    assert (await generated)["dry_run"]
    await hass.async_block_till_done()


async def test_setup_and_generation_preserve_registered_custom_route_and_history(hass):
    from custom_components.marao_dashboard.generator import write_dashboard
    from custom_components.marao_dashboard.config_patch import patch_lovelace_dashboard
    from custom_components.marao_dashboard.history import list_dashboard_history
    from custom_components.marao_dashboard import _generate_dashboard_from_path
    _reset_dashboard_files(hass)
    configuration = Path(hass.config.path("configuration.yaml"))
    configuration.write_text("default_config:\n# unrelated\n")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)); source.parent.mkdir(parents=True)
    exact = b'{"name":"My dashboard","config_version":2,"slug":"dashboard","landing_page":"overview","pages":[{"name":"Home","path":"overview","entities":[]}],"keep":[2,1]}\r\n'
    source.write_bytes(exact)
    result = write_dashboard(json.loads(exact), source.parent, dashboard_key_override="chosen-route")
    patch_lovelace_dashboard(configuration, result.dashboard_key, result.title, result.icon, result.filename)
    manifest = source.parent / "dashboard/.marao-generated.json"
    legacy = json.loads(manifest.read_bytes()); legacy.pop("generated_contract"); manifest.write_text(json.dumps(legacy))
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert source.read_bytes() == exact
    assert _management_payload(hass)["dashboard_url"] == "/chosen-route/overview"
    assert "marao-dashboard:" not in configuration.read_text()
    before = configuration.read_bytes()
    assert _generate_dashboard_from_path(hass, source, None, True, [])["dashboard_key"] == "chosen-route"
    assert configuration.read_bytes() == before and source.read_bytes() == exact
    assert _save_and_generate_dashboard(hass, exact.decode(), [])["dashboard_key"] == "chosen-route"
    versions = list_dashboard_history(source.parent)
    assert all(version["dashboard_key"] == "chosen-route" for version in versions)
    from custom_components.marao_dashboard import _restore_history
    assert _restore_history(hass, versions[-1]["version"])["dashboard_key"] == "chosen-route"
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert source.read_bytes() == exact
    assert _management_payload(hass)["dashboard_url"] == "/chosen-route/overview"


async def test_generation_alternate_source_shares_canonical_conversion_and_dry_run_is_read_only(hass):
    from custom_components.marao_dashboard import _generate_dashboard_from_path
    _reset_dashboard_files(hass)
    configuration = Path(hass.config.path("configuration.yaml")); configuration.write_text("default_config:\n")
    base = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)); base.parent.mkdir(parents=True)
    config = {"name": "Compatibility", "slug": "dashboard", "theme": "Marao Dashboard Gold", "rooms": [], "extension": {"raw": [2, 1]}}
    source = json.dumps(config, indent=3) + "\r\n"
    alternate = Path(hass.config.path("alternate-dashboard.json")); alternate.write_bytes(source.encode())
    before_configuration = configuration.read_bytes()
    result = _generate_dashboard_from_path(hass, alternate, None, True, [])
    assert result["dry_run"]
    assert alternate.read_bytes() == source.encode() and configuration.read_bytes() == before_configuration
    assert not (base.parent / ".history").exists() and not (base.parent / "dashboard").exists()
    _generate_dashboard_from_path(hass, alternate, None, False, [])
    converted = alternate.read_bytes()
    expected = migrate_dashboard_config(config)
    expected["theme"] = "Marao Dashboard"
    assert json.loads(converted) == expected
    assert not base.exists(), "Alternate generation must not create the default source"
    _save_and_generate_dashboard(hass, source, [])
    assert base.read_bytes() == converted
    output = base.parent / "dashboard"
    before_output = {str(p.relative_to(output)): p.read_bytes() for p in output.rglob("*") if p.is_file()}
    _generate_dashboard_from_path(hass, alternate, None, False, [])
    assert alternate.read_bytes() == converted
    assert {str(p.relative_to(output)): p.read_bytes() for p in output.rglob("*") if p.is_file()} == before_output


async def test_legacy_restore_preview_then_generation_keeps_archive_immutable(hass):
    from custom_components.marao_dashboard.generator import write_dashboard
    from custom_components.marao_dashboard.history import snapshot_dashboard
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)); source.parent.mkdir(parents=True)
    legacy = {"name": "Legacy", "slug": "dashboard", "theme": "Marao Dashboard Gold", "rooms": [], "unknown": {"raw": [2, 1]}}
    exact = (json.dumps(legacy, indent=3) + "\r\n").encode()
    source.write_bytes(exact)
    write_dashboard(legacy, source.parent, config_root=hass.config.config_dir)
    archived = snapshot_dashboard(source, source.parent, legacy)
    archive = source.parent / ".history" / archived["version"]
    expected_archive = {str(p.relative_to(archive)): p.read_bytes() for p in archive.rglob("*") if p.is_file()}
    _save_and_generate_dashboard(hass, json.dumps({**legacy, "name": "Current", "theme": "Marao Dashboard"}), [])
    _restore_history(hass, archived["version"])
    assert source.read_bytes() == exact
    preview = _management_payload(hass)
    assert preview["conversion_pending"]
    assert json.loads(preview["config"]) == migrate_dashboard_config(legacy)
    assert source.read_bytes() == exact, "Preview must not persist conversion"
    _save_and_generate_dashboard(hass, exact.decode(), [])
    assert json.loads(source.read_bytes()) == {**migrate_dashboard_config(legacy), "theme": "Marao Dashboard"}
    assert {str(p.relative_to(archive)): p.read_bytes() for p in archive.rglob("*") if p.is_file()} == expected_archive


async def test_setup_imports_legacy_area_once_and_retains_exact_baseline(hass):
    from custom_components.marao_dashboard.history import list_dashboard_history
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n")
    _create_area_entity(hass, "Kitchen", "light.snapshot_selected")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)); source.parent.mkdir(parents=True)
    exact = b'{"name":"Saved","rooms":[{"name":"Kitchen","area":"Kitchen"}],"unknown":[2,1]}\r\n'
    source.write_bytes(exact)
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    saved = json.loads(source.read_bytes())
    assert saved["config_version"] == 2 and saved["unknown"] == [2, 1]
    assert _room_entities(saved) == ["light.snapshot_selected"]
    versions = list_dashboard_history(source.parent)
    assert any((source.parent / ".history" / version["version"] / "dashboard.json").read_bytes() == exact for version in versions)
    registry = er.async_get(hass)
    registry.async_remove("light.snapshot_selected")
    hass.states.async_remove("light.snapshot_selected")
    area = ar.async_get(hass).areas[_room_page(saved)["area"]]
    added = registry.async_get_or_create("light", "test", "snapshot_new", suggested_object_id="snapshot_new")
    registry.async_update_entity(added.entity_id, area_id=area.id)
    hass.states.async_set(added.entity_id, "off")
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert json.loads(source.read_bytes()) == saved
    _save_and_generate_dashboard(hass, source.read_text(), _registry_entities(hass), _editor_areas(hass))
    view = next((source.parent / "saved/views/rooms").glob("*.yaml")).read_text()
    assert "light.snapshot_selected" in view and added.entity_id not in view


async def test_unresolved_legacy_area_stops_setup_before_owned_changes(hass):
    _reset_dashboard_files(hass)
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)); source.parent.mkdir(parents=True)
    exact = b'{"name":"Saved","rooms":[{"name":"Lost","area":"missing"}]}\r\n'
    source.write_bytes(exact)
    configuration = Path(hass.config.path("configuration.yaml")); configuration.write_text("# unrelated\n")
    with patch("custom_components.marao_dashboard._register_services") as register:
        with pytest.raises(ValueError, match="Cannot import legacy room"):
            await async_setup_entry(hass, MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True}))
        register.assert_not_called()
    assert source.read_bytes() == exact and configuration.read_text() == "# unrelated\n"
    assert list(source.parent.iterdir()) == [source]


def test_legacy_area_preview_dry_run_and_service_use_one_conversion(hass):
    from custom_components.marao_dashboard import _generate_dashboard_from_path
    _reset_dashboard_files(hass)
    source = Path(hass.config.path("alternate.json"))
    exact = b'{"name":"Selected","rooms":[{"name":"Kitchen","area":"Kitchen"}]}\r\n'
    source.write_bytes(exact)
    configuration = Path(hass.config.path("configuration.yaml")); configuration.write_text("# unrelated\n")
    metadata = [{"entity_id": "light.snapshot", "area_id": "kitchen", "area_name": "Kitchen", "has_state": True}]
    areas = [{"area_id": "kitchen", "name": "Kitchen"}]
    assert _generate_dashboard_from_path(hass, source, None, True, metadata, areas)["dry_run"]
    assert source.read_bytes() == exact and configuration.read_text() == "# unrelated\n"
    _generate_dashboard_from_path(hass, source, None, False, metadata, areas)
    saved = json.loads(source.read_bytes())
    assert saved["config_version"] == 2 and _room_entities(saved) == ["light.snapshot"]
    before = source.read_bytes()
    _generate_dashboard_from_path(hass, source, None, False, [], [])
    assert source.read_bytes() == before


def test_failed_converted_render_keeps_active_source_and_baseline_exact(hass):
    _reset_dashboard_files(hass)
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)); source.parent.mkdir(parents=True)
    exact = b'{"name":"Selected","rooms":[{"name":"Empty","entities":[]}]}\r\n'
    source.write_bytes(exact)
    configuration = Path(hass.config.path("configuration.yaml")); configuration.write_text("# unrelated\n")
    with patch("custom_components.marao_dashboard.write_dashboard", side_effect=ValueError("render failed")):
        with pytest.raises(ValueError, match="render failed"):
            _save_and_generate_dashboard(hass, exact.decode(), [])
    assert source.read_bytes() == exact and configuration.read_text() == "# unrelated\n"
    archives = list((source.parent / ".history").glob("*/dashboard.json"))
    assert archives and all(path.read_bytes() == exact for path in archives)
    assert not (source.parent / "selected").exists()


@pytest.mark.parametrize("boundary", ["theme", "configuration", "source", "frontend-preflight", "gallery-preflight", "interrupted"])
def test_generation_theme_boundary_recovers_exact_source_output_and_owned_patches(hass, monkeypatch, boundary):
    from custom_components.marao_dashboard import history
    import custom_components.marao_dashboard as integration

    _reset_dashboard_files(hass)
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True)
    source.write_bytes(b'{"name":"Selected","rooms":[]}\r\n')
    output = source.parent / "selected"
    output.mkdir()
    (output / "manual.txt").write_bytes(b"exact custom content\r\n")
    configuration = Path(hass.config.path("configuration.yaml"))
    configuration.write_bytes(("# unrelated configuration\r\n"
        "lovelace:\r\n  dashboards:\r\n"
        f"    {integration.LEGACY_CARD_TEST_DASHBOARD_KEY}:\r\n"
        f"      mode: yaml\r\n      filename: {integration.LEGACY_CARD_TEST_DASHBOARD_FILE}\r\n").encode())
    theme = Path(hass.config.path("themes/MaraoDashboard/marao-dashboard.yaml"))
    theme.parent.mkdir(parents=True, exist_ok=True)
    theme.write_bytes(b"Old theme:\r\n  primary-color: blue\r\n")
    (theme.parent / "manual.yaml").write_bytes(b"Manual theme:\r\n  primary-color: red\r\n")
    files = [source, configuration, *output.rglob("*"), *theme.parent.rglob("*")]
    before = {file: file.read_bytes() for file in files if file.is_file()}
    if boundary in ("frontend-preflight", "gallery-preflight"):
        name = "patch_frontend_themes" if boundary == "frontend-preflight" else "remove_lovelace_dashboard"
        original = getattr(integration, name)
        def fail(*args, **kwargs):
            original(*args, **kwargs)
            raise OSError("injected patch preflight failure")
        monkeypatch.setattr(integration, name, fail)
    else:
        original = history._write_bytes
        target = {"theme": theme, "configuration": configuration, "source": source, "interrupted": source}[boundary]
        failed = False
        def fail(path, data):
            nonlocal failed
            original(path, data)
            if path == target and not failed:
                failed = True
                if boundary == "interrupted":
                    raise KeyboardInterrupt("injected interruption")
                raise OSError("injected commit failure")
        monkeypatch.setattr(history, "_write_bytes", fail)
    with pytest.raises(KeyboardInterrupt if boundary == "interrupted" else OSError, match="injected"):
        _generate_dashboard(hass, json.loads(source.read_bytes()), registry_entities=[])
    if boundary == "interrupted":
        assert (source.parent / ".history/.operation/operation.json").exists()
        assert json.loads(source.read_bytes())["config_version"] == 2
        assert theme.read_bytes() != before[theme]
        history.recover_dashboard_operation(source.parent)
    assert all(file.read_bytes() == content for file, content in before.items())
    assert {file for file in output.rglob("*") if file.is_file()} == {output / "manual.txt"}
    assert {file for file in theme.parent.rglob("*") if file.is_file()} == {file for file in before if file.is_relative_to(theme.parent)}
    assert not (source.parent / ".history/.operation").exists()


def test_theme_only_sync_and_dry_run_preserve_saved_source_and_unrelated_themes(hass):
    from custom_components.marao_dashboard import _install_themes

    _reset_dashboard_files(hass)
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True)
    exact = b'{"config_version":1,"name":"Selected","rooms":[]}\r\n'
    source.write_bytes(exact)
    configuration = Path(hass.config.path("configuration.yaml"))
    configuration.write_bytes(b"# unrelated\r\n")
    manual = Path(hass.config.path("themes/OtherTheme/manual.yaml"))
    manual.parent.mkdir(parents=True, exist_ok=True)
    manual.write_bytes(b"Other theme:\r\n  primary-color: red\r\n")
    theme = Path(hass.config.path("themes/MaraoDashboard/marao-dashboard.yaml"))
    theme_before = theme.read_bytes() if theme.exists() else None
    _generate_dashboard(hass, json.loads(exact), dry_run=True, registry_entities=[])
    assert source.read_bytes() == exact and configuration.read_bytes() == b"# unrelated\r\n"
    assert (theme.read_bytes() if theme.exists() else None) == theme_before
    assert not (source.parent / ".history").exists()
    _install_themes(hass)
    installed = theme.read_bytes()
    patched = configuration.read_bytes()
    assert source.read_bytes() == exact
    assert manual.read_bytes() == b"Other theme:\r\n  primary-color: red\r\n"
    assert not _install_themes(hass)
    assert source.read_bytes() == exact and configuration.read_bytes() == patched and theme.read_bytes() == installed
    assert not (source.parent / ".history/.operation").exists()


@pytest.mark.parametrize("owned", [True, False])
async def test_setup_stages_retired_gallery_cleanup_and_preserves_repurposed_route(hass, owned):
    import custom_components.marao_dashboard as integration

    _reset_dashboard_files(hass)
    configuration = Path(hass.config.path("configuration.yaml"))
    configuration.write_text("# unrelated configuration\n")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True)
    config = {"name": "Selected", "config_version": 1, "rooms": []}
    source.write_bytes((json.dumps(config) + "\r\n").encode())
    _generate_dashboard(hass, config, registry_entities=[])
    integration.patch_lovelace_dashboard(
        configuration, integration.LEGACY_CARD_TEST_DASHBOARD_KEY, "Retired", "mdi:test-tube",
        integration.LEGACY_CARD_TEST_DASHBOARD_FILE if owned else "manual/repurposed.yaml",
    )
    before = source.read_bytes()
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)
    with patch("custom_components.marao_dashboard._remove_legacy_card_test_panel") as remove:
        assert await hass.config_entries.async_setup(entry.entry_id)
        assert remove.call_count == int(owned)
    assert source.read_bytes() == before
    assert (integration.LEGACY_CARD_TEST_DASHBOARD_KEY in configuration.read_text()) is not owned
    assert "# unrelated configuration" in configuration.read_text()
    assert not integration._should_repair_base_dashboard(hass, [], [])
    assert not (source.parent / ".history/.operation").exists()


def test_legacy_area_management_preview_is_canonical_and_read_only(hass):
    _reset_dashboard_files(hass)
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)); source.parent.mkdir(parents=True)
    exact = b'{"name":"Selected","rooms":[{"name":"Kitchen","area":"Kitchen"}]}\r\n'
    source.write_bytes(exact)
    metadata = [{"entity_id": "light.snapshot", "area_id": "kitchen", "area_name": "Kitchen", "has_state": True}]
    areas = [{"area_id": "kitchen", "name": "Kitchen"}]
    preview = _management_payload(hass, metadata, areas)
    assert preview["conversion_pending"]
    shown_room = _room_page(json.loads(preview["config"]))
    assert shown_room["name"] == "Kitchen" and shown_room["area"] == "kitchen"
    assert shown_room["sections"][-1]["entities"] == ["light.snapshot"]
    assert source.read_bytes() == exact and list(source.parent.iterdir()) == [source]
    Path(hass.config.path("configuration.yaml")).write_text("# unrelated\n")
    result = _save_and_generate_dashboard(hass, exact.decode(), metadata, areas)
    assert result["config"].encode() == source.read_bytes()
    assert json.loads(result["config"])["config_version"] == 2


def test_group_page_conversion_preview_is_read_only_and_saved_groups_stay_independent(hass):
    _reset_dashboard_files(hass)
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)); source.parent.mkdir(parents=True)
    config = {"config_version": 1, "name": "Selected", "rooms": [{"name": "Kitchen", "entities": [
        {"entity_id": "light.snapshot", "variables": {"enable_slider": False}, "future": True},
    ]}], "overview": {"future": 42}}
    exact = (json.dumps(config, indent=3) + "\r\n").encode(); source.write_bytes(exact)
    preview = _management_payload(hass, [])
    assert preview["conversion_pending"]
    shown = json.loads(preview["config"])
    assert _home_groups(shown)[0]["entities"] == config["rooms"][0]["entities"]
    assert shown["legacy_page_options"]["overview"]["future"] == 42
    assert source.read_bytes() == exact and list(source.parent.iterdir()) == [source]
    Path(hass.config.path("configuration.yaml")).write_text("# unrelated\n")
    _save_and_generate_dashboard(hass, preview["config"], [])
    assert json.loads(source.read_bytes()) == shown
    assert json.loads(_management_payload(hass, [{"entity_id": "light.new", "area_id": "kitchen", "has_state": True}])["config"]) == shown


def _scoped_source(hass):
    _reset_dashboard_files(hass)
    Path(hass.config.path('configuration.yaml')).write_text('default_config:\n')
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True, exist_ok=True)
    config = {'config_version': 2, 'name': 'Scoped safe', 'landing_page': 'studio', 'navigation': [],
              'future': {'empty': []}, 'pages': [
                  {'name': 'Home', 'path': 'home', 'entities': ['light.unopened']},
                  {'name': 'Studio', 'path': 'studio', 'sections': [
                      {'entities': ['light.registered', {'entity_id': 'sensor.unregistered'},
                                    {'entity_id': 'light.missing'}, {'page': 'home'},
                                    {'template': 'md_entity_group_card', 'id': 'safe-group', 'name': 'Group',
                                     'entity_type': 'light', 'entities': ['light.member']}],
                       'cards': [{'type': 'markdown', 'entity': 'light.raw', 'content': 'Keep'}]},
                      {'entities': []}]}]}
    source.write_text(json.dumps(config, indent=2) + '\n')
    return source, config


def test_management_scopes_select_products_before_optional_work(hass):
    from custom_components.marao_dashboard.editor import display_catalog
    source, config = _scoped_source(hass)
    exact = source.read_bytes()
    with patch('custom_components.marao_dashboard.page_templates', side_effect=AssertionError('Optional templates')), \
         patch('custom_components.marao_dashboard.list_dashboard_history', side_effect=AssertionError('Optional History')):
        initial = _management_payload(hass, scope='initial')
    assert json.loads(initial['config']) == config
    assert set(initial) == {'config', 'conversion_pending', 'config_path', 'dashboard_url', 'editor'}
    assert initial['editor']['display_entity_ids'] == ['light.missing', 'light.registered', 'sensor.unregistered']
    assert initial['editor']['catalog'] == display_catalog()
    assert all(set(card) <= {'id', 'label', 'entity_optional', 'domains', 'device_classes'}
               for card in initial['editor']['catalog']['cards'])
    assert initial['dashboard_url'].endswith('/studio')
    with patch('custom_components.marao_dashboard.list_dashboard_history', side_effect=AssertionError('Optional History')):
        context = _management_payload(hass, [], [], scope='context')
    assert set(context) == {'editor', 'page_templates'}
    assert context['editor'] == {'catalog': EDITOR_CATALOG, 'entities': [], 'areas': []}
    with patch('custom_components.marao_dashboard.load_dashboard_config', side_effect=AssertionError('Optional source')), \
         patch('custom_components.marao_dashboard.page_templates', side_effect=AssertionError('Optional templates')):
        assert _management_payload(hass, scope='history') == {'history': []}
    assert source.read_bytes() == exact
    assert not Path(hass.config.path('dashboard/MaraoDashboard/.history')).exists()


@pytest.mark.parametrize('entities,cards', [([], []), ([], [{'type': 'markdown', 'content': 'Raw'}])])
def test_initial_empty_and_raw_landing_pages_need_no_entity_sentinel(hass, entities, cards):
    from custom_components.marao_dashboard.editor import initial_entity_ids
    source, config = _scoped_source(hass)
    config['pages'][1] = {'name': 'Studio', 'path': 'studio', 'entities': entities, 'cards': cards}
    source.write_text(json.dumps(config))
    assert initial_entity_ids(config) == []
    assert _management_payload(hass, scope='initial')['editor']['display_entity_ids'] == []


async def test_initial_metadata_uses_only_keyed_registry_and_state_lookups(hass):
    _create_area_entity(hass, 'Safe area', 'light.registered')
    hass.states.async_set('sensor.unregistered', '12', {'friendly_name': 'Safe unregistered', 'device_class': 'temperature'})
    registry = er.async_get(hass)
    entries = registry.entities
    class NoWalk:
        def values(self):
            raise AssertionError('Full registry walk')
        def get_entry(self, entity_id):
            return entries.get_entry(entity_id)
    with patch.object(registry, 'entities', NoWalk()), \
         patch.object(type(hass.states), 'async_all', side_effect=AssertionError('Full state walk')):
        result = _registry_entities(hass, ['light.registered', 'sensor.unregistered', 'light.missing'])
    assert [item['entity_id'] for item in result] == ['light.registered', 'sensor.unregistered']
    assert result[0]['area_name'] == 'Safe area'
    assert result[1]['name'] == 'Safe unregistered'
    assert result[1]['device_class'] == 'temperature'
    assert result[1]['has_state'] is True


@pytest.mark.parametrize('scope', ['full', 'initial', 'context', 'history'])
async def test_scoped_websocket_admin_recovery_and_preview_contract(hass, hass_ws_client, hass_read_only_access_token, scope):
    from custom_components.marao_dashboard import _register_websocket_commands
    source, config = _scoped_source(hass)
    exact = source.read_bytes()
    hass.data.setdefault(DOMAIN, {})
    _register_websocket_commands(hass)
    client = await hass_ws_client(hass)
    await client.send_json({'id': 1, 'type': 'marao_dashboard/config/get', 'scope': scope})
    result = await client.receive_json()
    assert result['success'], result
    if scope == 'full':
        full = result['result']
        await client.send_json({'id': 2, 'type': 'marao_dashboard/config/get', 'config': json.dumps(config)})
        preview = await client.receive_json()
        assert preview['result'] == full
    else:
        await client.send_json({'id': 2, 'type': 'marao_dashboard/config/get', 'scope': scope, 'config': json.dumps(config)})
        invalid = await client.receive_json()
        assert invalid['success'] is False and invalid['error']['code'] == 'invalid_config'
    checkpoint = Path(hass.config.path('dashboard/MaraoDashboard/.history/.operation/operation.json'))
    checkpoint.parent.mkdir(parents=True, exist_ok=True)
    checkpoint.write_text('{}')
    await client.send_json({'id': 3, 'type': 'marao_dashboard/config/get', 'scope': scope})
    recovery = await client.receive_json()
    assert not recovery['success'] and recovery['error']['code'] == 'invalid_config'
    checkpoint.unlink()
    non_admin = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await non_admin.send_json({'id': 1, 'type': 'marao_dashboard/config/get', 'scope': scope})
    denied = await non_admin.receive_json()
    assert not denied['success'] and denied['error']['code'] == 'unauthorized'
    assert source.read_bytes() == exact


async def test_invalid_management_scope_is_a_websocket_validation_error(hass, hass_ws_client):
    from custom_components.marao_dashboard import _register_websocket_commands
    _scoped_source(hass)
    hass.data.setdefault(DOMAIN, {})
    _register_websocket_commands(hass)
    client = await hass_ws_client(hass)
    await client.send_json({'id': 1, 'type': 'marao_dashboard/config/get', 'scope': 'other'})
    result = await client.receive_json()
    assert not result['success'] and result['error']['code'] == 'invalid_format'


async def test_canonical_initial_websocket_never_collects_optional_products(hass, hass_ws_client):
    from custom_components.marao_dashboard import _register_websocket_commands
    _scoped_source(hass)
    _create_area_entity(hass, 'Safe area', 'light.registered')
    hass.states.async_set('sensor.unregistered', '12', {'friendly_name': 'Safe reading'})
    hass.data.setdefault(DOMAIN, {})
    _register_websocket_commands(hass)
    client = await hass_ws_client(hass)
    def selective(target, ids=None):
        assert ids == ['light.missing', 'light.registered', 'sensor.unregistered']
        return _registry_entities(target, ids)
    with patch('custom_components.marao_dashboard._registry_entities', side_effect=selective) as registry, \
         patch('custom_components.marao_dashboard._editor_areas', side_effect=AssertionError('Full areas')), \
         patch('custom_components.marao_dashboard.page_templates', side_effect=AssertionError('Optional templates')), \
         patch('custom_components.marao_dashboard.list_dashboard_history', side_effect=AssertionError('Optional History')):
        await client.send_json({'id': 1, 'type': 'marao_dashboard/config/get', 'scope': 'initial'})
        result = await client.receive_json()
    assert result['success'], result
    assert registry.call_count == 1
    assert [entity['entity_id'] for entity in result['result']['editor']['entities']] == ['light.registered', 'sensor.unregistered']


def test_scoped_initial_preserves_independent_released_conversion_and_saved_bytes(hass):
    source, _ = _scoped_source(hass)
    fixtures = Path(__file__).parents[3] / 'ha-test/upgrade/fixtures'
    historical = (fixtures / 'v0.5.1-dashboard.json').read_bytes()
    expected = json.loads((fixtures / 'v0.5.1-dashboard-format-2-expected.json').read_text())
    source.write_bytes(historical)
    baseline = Path(hass.config.path('dashboard/MaraoDashboard/.history/20261010T180000000000Z/fixture.json'))
    baseline.parent.mkdir(parents=True)
    baseline.write_bytes(historical)
    for scope in ['full', 'initial']:
        result = _management_payload(hass, [], [], scope=scope)
        assert json.loads(result['config']) == expected
        assert result['conversion_pending'] is True
    assert source.read_bytes() == historical and baseline.read_bytes() == historical


@pytest.mark.parametrize("unit", [None, "", "kWh"])
async def test_setup_repairs_formatted_energy_without_ready_unit_metadata(hass, unit):
    _reset_dashboard_files(hass)
    Path(hass.config.path("configuration.yaml")).write_text("default_config:\n")
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    source.parent.mkdir(parents=True)
    config = {"config_version": 2, "name": "Dashboard", "slug": "dashboard", "landing_page": "energy",
              "pages": [{"name": "Energy", "path": "energy", "entities": [{"template": "md_graph_card",
                  "entity_id": "sensor.startup_energy", "variables": {"display_unit": "kWh", "display_precision": 0}}]}]}
    exact = json.dumps(config, indent=2) + "\n"
    source.write_text(exact)
    if unit is not None:
        hass.states.async_set("sensor.startup_energy", "unavailable", {"unit_of_measurement": unit})
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert source.read_text() == exact
    assert (source.parent / "dashboard/dashboard.yaml").exists()


def _namespace_v1_baseline(hass):
    from custom_components.marao_dashboard.generator import write_dashboard
    fixtures = Path(__file__).parents[3] / 'ha-test/upgrade/fixtures'
    raw = json.loads((fixtures / 'namespace-v1-input.json').read_text())
    expected = json.loads((fixtures / 'namespace-v1-expected.json').read_text())
    _reset_dashboard_files(hass)
    Path(hass.config.path('configuration.yaml')).write_text('default_config:\n# keep unrelated config\n')
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)); source.parent.mkdir(parents=True)
    exact = (json.dumps(raw, indent=1) + '\r\n').encode(); source.write_bytes(exact)
    write_dashboard(raw, source.parent, config_root=hass.config.config_dir)
    output = source.parent / 'dashboard'
    (output / 'private-custom.txt').write_bytes(b'untouched customization\r\n')
    return source, exact, expected, output


async def test_setup_migrates_owned_hc_names_with_exact_backup_and_no_repeat_writes(hass):
    from custom_components.marao_dashboard.history import list_dashboard_history
    source, exact, expected, output = _namespace_v1_baseline(hass)
    before = {str(p.relative_to(output)): p.read_bytes() for p in output.rglob('*') if p.is_file()}
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)
    preview = _management_payload(hass, [])
    assert preview['conversion_pending'] is True
    assert json.loads(preview['config']) == expected
    assert source.read_bytes() == exact
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert json.loads(source.read_bytes()) == expected
    assert (output / 'private-custom.txt').read_bytes() == b'untouched customization\r\n'
    versions = list_dashboard_history(source.parent)
    baseline = next(source.parent / '.history' / v['version'] for v in versions
                    if (source.parent / '.history' / v['version'] / 'dashboard.json').read_bytes() == exact)
    assert {str(p.relative_to(baseline / 'dashboard')): p.read_bytes() for p in (baseline / 'dashboard').rglob('*') if p.is_file()} == before
    migrated = source.read_bytes()
    after = {str(p.relative_to(output)): p.read_bytes() for p in output.rglob('*') if p.is_file()}
    snapshots = {str(p.relative_to(source.parent / '.history')): p.read_bytes() for p in (source.parent / '.history').rglob('*') if p.is_file()}
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert source.read_bytes() == migrated
    assert {str(p.relative_to(output)): p.read_bytes() for p in output.rglob('*') if p.is_file()} == after
    assert {str(p.relative_to(source.parent / '.history')): p.read_bytes() for p in (source.parent / '.history').rglob('*') if p.is_file()} == snapshots


async def test_namespace_upgrade_rolls_back_exact_source_and_output_after_commit_failure(hass, monkeypatch):
    from custom_components.marao_dashboard import history
    import custom_components.marao_dashboard as integration
    source, exact, _, output = _namespace_v1_baseline(hass)
    before = {str(p.relative_to(output)): p.read_bytes() for p in output.rglob('*') if p.is_file()}
    configuration = Path(hass.config.path('configuration.yaml')).read_bytes()
    apply = history._apply_operation_target
    def fail_after_source_commit(checkpoint, target, *, restoring):
        apply(checkpoint, target, restoring=restoring)
        if not restoring and target['path'] == str(source.absolute()):
            raise OSError('Injected namespace commit failure')
    monkeypatch.setattr(history, '_apply_operation_target', fail_after_source_commit)
    with pytest.raises(OSError, match='Injected namespace commit failure'):
        integration._generate_dashboard(hass, json.loads(exact), registry_entities=[])
    assert source.read_bytes() == exact
    assert {str(p.relative_to(output)): p.read_bytes() for p in output.rglob('*') if p.is_file()} == before
    assert Path(hass.config.path('configuration.yaml')).read_bytes() == configuration
    assert not (source.parent / '.history/.operation').exists()
    assert any(p.read_bytes() == exact for p in (source.parent / '.history').glob('*/dashboard.json'))
