"""Native storage is a distinct preserved input, never an empty starter."""
from copy import deepcopy
import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from homeassistant.components.lovelace import LOVELACE_DATA
from homeassistant.components.lovelace.dashboard import LovelaceStorage
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.marao_dashboard.generator import migrate_dashboard_config, write_dashboard

FIXTURES = Path(__file__).parents[3] / "ha-test/upgrade/fixtures"
SOURCE = json.loads((FIXTURES / "v0.2.0-storage-dashboard.json").read_text())
EXPECTED = json.loads((FIXTURES / "v0.2.0-storage-format-2-expected.json").read_text())


@pytest.mark.parametrize("document", [
    b"not valid JSON", b'{"version":true,"minor_version":1,"key":"lovelace.safe","data":{}}',
    b'{"version":1,"minor_version":2,"key":"lovelace.safe","data":{}}',
    b'{"version":1,"minor_version":1,"key":"lovelace.other","data":{}}',
    b'{"version":1,"minor_version":1,"key":"lovelace.safe","data":{},"future_envelope":true}',
])
def test_invalid_native_envelopes_stay_exact_without_platform_loader_side_effects(tmp_path, document):
    from custom_components.marao_dashboard.native_storage import _read_native_document
    file = tmp_path / "lovelace.safe"; file.write_bytes(document)
    dashboard = SimpleNamespace(_store=SimpleNamespace(path=str(file), version=1, minor_version=1, key=file.name))
    with pytest.raises(ValueError):
        _read_native_document(dashboard)
    assert file.read_bytes() == document


async def test_unrelated_native_title_does_not_establish_migration_ownership(hass, tmp_path):
    from custom_components.marao_dashboard.native_storage import async_find_native_dashboard
    file = tmp_path / "lovelace.unrelated"
    file.write_text(json.dumps({"version": 1, "minor_version": 1, "key": file.name, "data": {"config": {"title": EXPECTED["name"], "views": [{"path": "other", "cards": []}]}}}))
    unrelated = SimpleNamespace(mode="storage", _store=SimpleNamespace(path=str(file), version=1, minor_version=1, key=file.name))
    hass.data[LOVELACE_DATA] = SimpleNamespace(dashboards={"unrelated-dashboard": unrelated})
    before = file.read_bytes()
    with pytest.raises(ValueError, match="registration is missing"):
        await async_find_native_dashboard(hass, EXPECTED)
    assert file.read_bytes() == before


async def test_native_ownership_survives_source_rename_after_conversion(hass, tmp_path):
    from custom_components.marao_dashboard.native_storage import async_find_native_dashboard
    file = tmp_path / "lovelace.saved"
    config = {"title": "Original", "views": [{"path": "home", "cards": [{"type": "custom:marao-navbar-card"}]}]}
    file.write_text(json.dumps({"version": 1, "minor_version": 1, "key": file.name, "data": {"config": config}}))
    async def load(force):
        return config
    native = SimpleNamespace(mode="storage", _store=SimpleNamespace(path=str(file), version=1, minor_version=1, key=file.name), async_load=load)
    hass.data[LOVELACE_DATA] = SimpleNamespace(dashboards={"marao-dashboard": native})
    source = {**deepcopy(EXPECTED), "name": "Renamed"}
    assert await async_find_native_dashboard(hass, source) == (native, config)


def test_native_storage_matches_independent_canonical_document_without_discovery(tmp_path):
    source = deepcopy(SOURCE)
    assert migrate_dashboard_config(source) == EXPECTED
    assert source == SOURCE
    assert migrate_dashboard_config(EXPECTED) == EXPECTED
    generated = write_dashboard(source, tmp_path, dashboard_key_override="marao-dashboard")
    root = tmp_path / generated.slug
    view = (root / "views/pages/outside.yaml").read_text()
    assert "template: md_light_card" in view and "template: md_camera_card" in view
    assert "navigation_path: /marao-dashboard/home" in view
    assert "custom:marao-entity-card" not in view and "custom:marao-header-card" not in view
    assert (root / "components/popups/page-outside-card-4-popup.yaml").exists()


def test_native_unknown_raw_card_order_and_empty_view_are_preserved():
    source = deepcopy(SOURCE)
    raw = {"type": "markdown", "content": "Keep this raw card", "future": [1, 2]}
    source["views"][1]["sections"][0]["cards"].insert(1, raw)
    source["views"].append({"title": "Empty", "path": "empty", "cards": []})
    converted = migrate_dashboard_config(source)
    assert converted["legacy_storage_dashboard"] == source
    assert converted["pages"][1]["sections"][3]["cards"] == [raw]
    assert converted["pages"][-1]["sections"] == []
    assert converted["navigation"] == []


@pytest.mark.parametrize("change", [
    lambda value: value.update(views=[]),
    lambda value: value["views"][1].pop("path"),
    lambda value: value["views"][1].update(path="home"),
    lambda value: value["views"][0]["sections"][1]["cards"][0].update(navigation_path="/marao-dashboard/missing"),
    lambda value: value["views"][1]["sections"][1]["cards"][1].pop("entity"),
    lambda value: value["views"][0].update(cards=[]),
    lambda value: value["views"][0]["sections"][1]["cards"][0].update(navigation_path="https://example.org/outside"),
    lambda value: value["views"][1]["sections"][0]["cards"][0].update(back_path="/another-dashboard/home"),
    lambda value: value["views"][1]["sections"][0]["cards"][0].update(back_path=42),
    lambda value: value["views"][1]["sections"][2]["cards"][1].update(entity="unsupported.safe"),
])
def test_native_invalid_inputs_fail_before_writes_and_remain_exact(tmp_path, change):
    source = deepcopy(SOURCE); change(source)
    before = deepcopy(source)
    with pytest.raises(ValueError):
        write_dashboard(source, tmp_path)
    assert source == before and not list(tmp_path.iterdir())


@pytest.mark.parametrize("fail_source", [False, True])
async def test_installed_native_dashboard_uses_real_setup_and_recovers_source_failure(hass, monkeypatch, fail_source):
    from custom_components.marao_dashboard import _generate_dashboard, _restore_history
    from custom_components.marao_dashboard import history
    from custom_components.marao_dashboard.const import BASE_DASHBOARD_CREATED, DEFAULT_DASHBOARD_CONFIG, DOMAIN
    import shutil

    base = Path(hass.config.path("dashboard/MaraoDashboard"))
    shutil.rmtree(base, ignore_errors=True)
    configuration = Path(hass.config.path("configuration.yaml"))
    configuration.write_text("default_config:\n# unrelated native sentinel\n")
    assert await async_setup_component(hass, "lovelace", {})
    native = LovelaceStorage(hass, {"id": "marao-native", "url_path": "marao-dashboard", "title": SOURCE["title"], "mode": "storage", "icon": "mdi:home", "show_in_sidebar": True, "require_admin": False})
    store = native._store
    async def write(data):
        await hass.async_add_executor_job(store._write_data, data)
    monkeypatch.setattr(store, "_async_write_data", write)
    await store.async_save({"config": deepcopy(SOURCE), "future": {"keep": True}})
    native._data = {"config": deepcopy(SOURCE), "future": {"keep": True}}
    hass.data[LOVELACE_DATA].dashboards["marao-dashboard"] = native
    original_native = Path(store.path).read_bytes()
    entry = MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={BASE_DASHBOARD_CREATED: True})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    source = Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG))
    assert json.loads(source.read_bytes()) == EXPECTED
    assert native._data["future"] == {"keep": True}
    assert "custom:marao-camera-card" not in json.dumps(await native.async_load(False))
    assert "custom:marao-popup-card" in json.dumps(await native.async_load(False))
    assert "marao-dashboard:" not in configuration.read_text()
    assert "# unrelated native sentinel" in configuration.read_text()
    assert any(file.read_bytes() == original_native for file in (base / ".native-backups").rglob(store.key))
    before_source, before_native = source.read_bytes(), Path(store.path).read_bytes()
    before_cache = deepcopy(native._data)
    changed = deepcopy(EXPECTED); changed["pages"][0]["name"] = "Changed home"
    if fail_source:
        original_write = history._write_bytes
        def fail(path, content):
            if Path(path) == source and json.loads(content)["pages"][0]["name"] == "Changed home":
                raise OSError("Native migration source failure")
            return original_write(path, content)
        monkeypatch.setattr(history, "_write_bytes", fail)
        with pytest.raises(OSError, match="source failure"):
            await hass.async_add_executor_job(_generate_dashboard, hass, changed)
        assert source.read_bytes() == before_source
        assert Path(store.path).read_bytes() == before_native and native._data == before_cache
        monkeypatch.setattr(history, "_write_bytes", original_write)
    else:
        await hass.async_add_executor_job(_generate_dashboard, hass, EXPECTED)
        assert source.read_bytes() == before_source and Path(store.path).read_bytes() == before_native
        version = history.list_dashboard_history(base)[0]["version"]
        archive = base / ".history" / version / "dashboard.json"
        archived_bytes = archive.read_bytes()
        await hass.async_add_executor_job(_generate_dashboard, hass, changed)
        assert (await native.async_load(False))["views"][0]["title"] == "Changed home"
        await hass.async_add_executor_job(_restore_history, hass, version)
        assert json.loads(source.read_bytes()) == EXPECTED
        assert (await native.async_load(False))["views"][0]["title"] == "Home"
        assert archive.read_bytes() == archived_bytes


async def test_missing_existing_install_source_never_creates_discovery_defaults(hass):
    from custom_components.marao_dashboard import async_setup_entry
    from custom_components.marao_dashboard.const import BASE_DASHBOARD_CREATED, DEFAULT_DASHBOARD_CONFIG, DOMAIN
    import shutil

    shutil.rmtree(hass.config.path("dashboard/MaraoDashboard"), ignore_errors=True)
    entry = MockConfigEntry(domain=DOMAIN, data={BASE_DASHBOARD_CREATED: True})
    with pytest.raises(ValueError, match="saved Marao configuration is missing"):
        await async_setup_entry(hass, entry)
    assert not Path(hass.config.path(DEFAULT_DASHBOARD_CONFIG)).exists()
