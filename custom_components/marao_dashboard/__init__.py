"""Marao Dashboard dashboard installer integration."""

from __future__ import annotations

import json
from pathlib import Path
import shutil
from typing import Any

import voluptuous as vol

from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er

from .config_patch import (
    patch_frontend_themes,
    patch_lovelace_dashboard,
    remove_lovelace_dashboard,
)
from .const import (
    BASE_DASHBOARD_CREATED,
    BASE_DASHBOARD_NAME,
    BASE_DASHBOARD_SLUG,
    CARD_TEST_DASHBOARD_FILE,
    CARD_TEST_DASHBOARD_KEY,
    DASHBOARD_BASE_DIR,
    DEFAULT_DASHBOARD_CONFIG,
    DOMAIN,
    GENERATE_DASHBOARD_SERVICE,
    MANAGEMENT_PANEL_ICON,
    MANAGEMENT_PANEL_PATH,
    MANAGEMENT_PANEL_TITLE,
    LEGACY_FRONTEND_MODULE,
    MARAO_DASHBOARD_MODULES,
    MARAO_DASHBOARD_PANEL_MODULE,
    MARAO_DASHBOARD_STATIC_URL,
)
from .dependency_runtime import (
    async_clear_dependency_issues,
    async_dependency_statuses,
    async_migrate_legacy_vendor_resources,
    async_refresh_dependency_issue,
)
from .editor import EDITOR_CATALOG
from .generator import (
    build_base_dashboard_config,
    ensure_dashboard_config,
    generated_popup_files_need_repair,
    load_dashboard_config,
    make_slug,
    migrate_legacy_theme,
    plan_dashboard,
    write_dashboard_config,
    write_dashboard,
)
from .history import (
    list_dashboard_history,
    restore_dashboard_version,
    snapshot_dashboard,
)

SERVICE_REGISTERED = "generate_dashboard_service_registered"
WEBSOCKET_REGISTERED = "websocket_registered"
STATIC_PATH_REGISTERED = "static_path_registered"
GENERATE_DASHBOARD_SCHEMA = vol.Schema(
    {
        vol.Optional("config_path", default=DEFAULT_DASHBOARD_CONFIG): cv.string,
        vol.Optional("dashboard_key"): cv.string,
        vol.Optional("dry_run", default=False): cv.boolean,
    }
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Marao Dashboard and create the base dashboard once."""

    hass.data.setdefault(DOMAIN, {})
    _register_services(hass)
    config_path = hass.config.path("configuration.yaml")
    await _async_register_static_path(hass)
    for module_url in MARAO_DASHBOARD_MODULES:
        frontend.add_extra_js_url(hass, module_url)
    await hass.async_add_executor_job(_install_dashboard_assets, hass)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=MANAGEMENT_PANEL_PATH,
        webcomponent_name="marao-dashboard-panel",
        sidebar_title=MANAGEMENT_PANEL_TITLE,
        sidebar_icon=MANAGEMENT_PANEL_ICON,
        module_url=MARAO_DASHBOARD_PANEL_MODULE,
        require_admin=True,
        config_panel_domain=DOMAIN,
    )
    _register_websocket_commands(hass)
    await hass.async_add_executor_job(_install_themes, hass)
    await hass.async_add_executor_job(
        patch_frontend_themes,
        config_path,
        "themes",
        None,
        [LEGACY_FRONTEND_MODULE],
    )
    await async_migrate_legacy_vendor_resources(hass)
    registry_entities = _registry_entities(hass)
    should_repair = await hass.async_add_executor_job(
        _should_repair_base_dashboard, hass, registry_entities
    )
    if not entry.data.get(BASE_DASHBOARD_CREATED) or should_repair:
        config = await hass.async_add_executor_job(
            ensure_dashboard_config, _dashboard_config_path(hass), registry_entities
        )
        generated = await hass.async_add_executor_job(
            _generate_dashboard,
            hass,
            config,
            None,
            False,
            registry_entities,
            _dashboard_config_path(hass),
        )
        hass.data[DOMAIN]["base_dashboard"] = generated
        hass.config_entries.async_update_entry(
            entry,
            data={**entry.data, BASE_DASHBOARD_CREATED: True},
        )
    await hass.async_add_executor_job(_ensure_current_history, hass)
    await hass.async_add_executor_job(
        remove_lovelace_dashboard,
        config_path,
        CARD_TEST_DASHBOARD_KEY,
        CARD_TEST_DASHBOARD_FILE,
    )
    try:
        dependency_config = await hass.async_add_executor_job(
            load_dashboard_config, _dashboard_config_path(hass)
        )
    except (FileNotFoundError, ValueError):
        pass
    else:
        await async_refresh_dependency_issue(
            hass, dependency_config, registry_entities
        )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Marao Dashboard."""

    frontend.async_remove_panel(hass, MANAGEMENT_PANEL_PATH, warn_if_unknown=False)
    for module_url in MARAO_DASHBOARD_MODULES:
        frontend.remove_extra_js_url(hass, module_url)
    hass.data.get(DOMAIN, {}).pop("base_dashboard", None)
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove state that must not outlive the Marao config entry."""

    async_clear_dependency_issues(hass)


def _register_services(hass: HomeAssistant) -> None:
    if hass.data[DOMAIN].get(SERVICE_REGISTERED):
        return

    async def generate_dashboard(call: ServiceCall) -> dict[str, Any]:
        config_path = _dashboard_config_path(hass, call.data["config_path"])
        config = await hass.async_add_executor_job(load_dashboard_config, config_path)
        registry_entities = _registry_entities(hass)
        history_path = (
            config_path if config_path == _dashboard_config_path(hass) else None
        )
        result = await hass.async_add_executor_job(
            _generate_dashboard,
            hass,
            config,
            call.data.get("dashboard_key"),
            call.data["dry_run"],
            registry_entities,
            history_path,
        )
        dependency_helper = (
            async_dependency_statuses
            if call.data["dry_run"]
            else async_refresh_dependency_issue
        )
        result["dependencies"] = await dependency_helper(
            hass, config, registry_entities
        )
        return result

    hass.services.async_register(
        DOMAIN,
        GENERATE_DASHBOARD_SERVICE,
        generate_dashboard,
        schema=GENERATE_DASHBOARD_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.data[DOMAIN][SERVICE_REGISTERED] = True


def _register_websocket_commands(hass: HomeAssistant) -> None:
    """Register the admin-only management panel API once."""

    if hass.data[DOMAIN].get(WEBSOCKET_REGISTERED):
        return

    @websocket_api.require_admin
    @websocket_api.websocket_command({"type": "marao_dashboard/config/get"})
    @websocket_api.async_response
    async def websocket_get_config(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        registry_entities = _registry_entities(hass)
        areas = _editor_areas(hass)
        payload = await hass.async_add_executor_job(
            _management_payload, hass, registry_entities, areas
        )
        payload["dependencies"] = await async_dependency_statuses(
            hass, json.loads(payload["config"]), registry_entities
        )
        connection.send_result(msg["id"], payload)

    @websocket_api.require_admin
    @websocket_api.websocket_command(
        {
            "type": "marao_dashboard/config/generate",
            vol.Required("config"): str,
        }
    )
    @websocket_api.async_response
    async def websocket_generate_config(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        registry_entities = _registry_entities(hass)
        try:
            generated = await hass.async_add_executor_job(
                _save_and_generate_dashboard,
                hass,
                msg["config"],
                registry_entities,
            )
        except ValueError as err:
            connection.send_error(msg["id"], "invalid_config", str(err))
            return
        generated["history"] = await hass.async_add_executor_job(
            list_dashboard_history, hass.config.path(DASHBOARD_BASE_DIR)
        )
        generated["dependencies"] = await async_refresh_dependency_issue(
            hass, json.loads(msg["config"]), registry_entities
        )
        connection.send_result(msg["id"], generated)

    @websocket_api.require_admin
    @websocket_api.websocket_command(
        {
            "type": "marao_dashboard/history/restore",
            vol.Required("version"): str,
        }
    )
    @websocket_api.async_response
    async def websocket_restore_history(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        try:
            restored = await hass.async_add_executor_job(
                _restore_history, hass, msg["version"]
            )
        except ValueError as err:
            connection.send_error(msg["id"], "invalid_version", str(err))
            return
        restored["history"] = await hass.async_add_executor_job(
            list_dashboard_history, hass.config.path(DASHBOARD_BASE_DIR)
        )
        restored_config = await hass.async_add_executor_job(
            load_dashboard_config, _dashboard_config_path(hass)
        )
        registry_entities = _registry_entities(hass)
        restored["dependencies"] = await async_refresh_dependency_issue(
            hass, restored_config, registry_entities
        )
        connection.send_result(msg["id"], restored)

    @websocket_api.require_admin
    @websocket_api.websocket_command(
        {"type": "marao_dashboard/dependencies/recheck"}
    )
    @websocket_api.async_response
    async def websocket_recheck_dependencies(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        try:
            config = await hass.async_add_executor_job(
                load_dashboard_config, _dashboard_config_path(hass)
            )
        except (FileNotFoundError, ValueError) as err:
            connection.send_error(msg["id"], "invalid_config", str(err))
            return
        dependencies = await async_refresh_dependency_issue(
            hass, config, _registry_entities(hass)
        )
        connection.send_result(msg["id"], {"dependencies": dependencies})

    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_generate_config)
    websocket_api.async_register_command(hass, websocket_restore_history)
    websocket_api.async_register_command(hass, websocket_recheck_dependencies)
    hass.data[DOMAIN][WEBSOCKET_REGISTERED] = True


def _management_payload(
    hass: HomeAssistant,
    registry_entities: list[dict[str, Any]] | None = None,
    areas: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    config_path = _dashboard_config_path(hass)
    config = load_dashboard_config(config_path)
    planned = plan_dashboard(config, hass.config.path(DASHBOARD_BASE_DIR))
    return {
        "config": json.dumps(config, indent=2, ensure_ascii=False) + "\n",
        "config_path": f"/config/{DEFAULT_DASHBOARD_CONFIG}",
        "dashboard_url": f"/{planned.dashboard_key}/overview",
        "history": list_dashboard_history(hass.config.path(DASHBOARD_BASE_DIR)),
        "dependencies": [],
        "editor": {
            "catalog": EDITOR_CATALOG,
            "entities": registry_entities or [],
            "areas": areas or [],
        },
    }


def _editor_areas(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Return area metadata used by room snapshot imports."""

    areas = ar.async_get(hass).areas.values()
    return sorted(
        (
            {
                "area_id": area.id,
                "name": area.name,
                "icon": getattr(area, "icon", None),
            }
            for area in areas
        ),
        key=lambda area: area["name"].casefold(),
    )


def _ensure_current_history(hass: HomeAssistant) -> None:
    """Create a baseline version for installations that predate history support."""

    config_path = _dashboard_config_path(hass)
    try:
        config = load_dashboard_config(config_path)
        planned = plan_dashboard(config, hass.config.path(DASHBOARD_BASE_DIR))
    except (FileNotFoundError, ValueError):
        return
    snapshot_dashboard(
        config_path,
        hass.config.path(DASHBOARD_BASE_DIR),
        config,
        dashboard_key=planned.dashboard_key,
        reason="current dashboard",
    )


def _save_and_generate_dashboard(
    hass: HomeAssistant,
    source: str,
    registry_entities: list[dict[str, Any]],
) -> dict[str, Any]:
    try:
        config = json.loads(source)
    except json.JSONDecodeError as err:
        raise ValueError(
            f"Invalid dashboard JSON at line {err.lineno}, column {err.colno}: {err.msg}"
        ) from err
    if not isinstance(config, dict):
        raise ValueError("Dashboard JSON must be an object")

    base_dir = hass.config.path(DASHBOARD_BASE_DIR)
    config_path = _dashboard_config_path(hass)
    planned = plan_dashboard(config, base_dir, registry_entities)
    previous_key = None
    baseline = None
    try:
        current = load_dashboard_config(config_path)
        current_plan = plan_dashboard(current, base_dir, registry_entities)
        previous_key = current_plan.dashboard_key
        baseline = snapshot_dashboard(
            config_path,
            base_dir,
            current,
            dashboard_key=previous_key,
            reason="before generation",
        )
    except (FileNotFoundError, ValueError):
        pass

    write_dashboard_config(config, config_path)
    try:
        return _generate_dashboard(
            hass,
            config,
            planned.dashboard_key,
            False,
            registry_entities,
            config_path,
            "generated from editor",
            previous_key,
        )
    except Exception:
        if baseline:
            restore_dashboard_version(config_path, base_dir, baseline["version"])
        raise


def _restore_history(hass: HomeAssistant, version: str) -> dict[str, Any]:
    base_dir = hass.config.path(DASHBOARD_BASE_DIR)
    config_path = _dashboard_config_path(hass)
    previous_key = None
    try:
        current = load_dashboard_config(config_path)
        current_plan = plan_dashboard(current, base_dir)
        previous_key = current_plan.dashboard_key
        snapshot_dashboard(
            config_path,
            base_dir,
            current,
            dashboard_key=previous_key,
            reason="before restore",
        )
    except (FileNotFoundError, ValueError):
        pass

    config, metadata = restore_dashboard_version(config_path, base_dir, version)
    planned = plan_dashboard(config, base_dir)
    dashboard_patch = patch_lovelace_dashboard(
        hass.config.path("configuration.yaml"),
        metadata.get("dashboard_key") or planned.dashboard_key,
        planned.title,
        planned.icon,
        planned.filename,
        previous_dashboard_key=previous_key,
    )
    return {
        "restored_version": version,
        "dashboard_key": metadata.get("dashboard_key") or planned.dashboard_key,
        "dashboard_url": f"/{metadata.get('dashboard_key') or planned.dashboard_key}/overview",
        "config_changed": dashboard_patch.changed,
    }


def _dashboard_config_path(hass: HomeAssistant, config_path: str = DEFAULT_DASHBOARD_CONFIG) -> Path:
    path = Path(config_path)
    return path if path.is_absolute() else Path(hass.config.path(config_path))


def _should_repair_base_dashboard(
    hass: HomeAssistant, registry_entities: list[dict[str, Any]]
) -> bool:
    config_path = _dashboard_config_path(hass)
    if not config_path.exists():
        return False

    try:
        config = load_dashboard_config(config_path)
    except ValueError:
        return False

    changed = migrate_legacy_theme(config)
    slug = make_slug(config.get("slug") or config.get("name"))
    if generated_popup_files_need_repair(
        Path(hass.config.path(DASHBOARD_BASE_DIR)) / slug
    ):
        try:
            plan_dashboard(
                config, hass.config.path(DASHBOARD_BASE_DIR), registry_entities
            )
        except ValueError:
            if changed:
                write_dashboard_config(config, config_path)
            return False
        if changed:
            write_dashboard_config(config, config_path)
        return True

    if config.get("name") == BASE_DASHBOARD_NAME and config.get("slug") == BASE_DASHBOARD_SLUG:
        rooms_path = Path(hass.config.path(DASHBOARD_BASE_DIR, BASE_DASHBOARD_SLUG, "views", "rooms"))
        if any(
            "template: hc_access_hold_action_card" in path.read_text(encoding="utf-8")
            for path in rooms_path.glob("*.yaml")
        ):
            return True

    if (
        config.get("name") != BASE_DASHBOARD_NAME
        or config.get("slug") != BASE_DASHBOARD_SLUG
        or config.get("rooms") != []
    ):
        if changed:
            write_dashboard_config(config, config_path)
        return changed

    refreshed = build_base_dashboard_config(registry_entities)
    if not refreshed["rooms"]:
        if changed:
            write_dashboard_config(config, config_path)
        return False

    write_dashboard_config(refreshed, config_path)
    return True


def _generate_dashboard(
    hass: HomeAssistant,
    config: dict[str, Any],
    dashboard_key: str | None = None,
    dry_run: bool = False,
    registry_entities: list[dict[str, Any]] | None = None,
    source_config_path: Path | None = None,
    history_reason: str = "generation",
    previous_dashboard_key: str | None = None,
) -> dict[str, Any]:
    """Generate the base dashboard and install required YAML configuration."""

    if registry_entities is None:
        registry_entities = _registry_entities(hass)
    language = getattr(hass.config, "language", None) or "en"
    planned = plan_dashboard(
        config,
        hass.config.path(DASHBOARD_BASE_DIR),
        registry_entities,
        dashboard_key_override=dashboard_key,
    )
    if dry_run:
        return {
            "dry_run": True,
            "dashboard_key": planned.dashboard_key,
            "dashboard_url": f"/{planned.dashboard_key}/overview",
            "filename": planned.filename,
            "files": planned.files,
            "config_changed": False,
        }

    config_path = hass.config.path("configuration.yaml")
    generated = write_dashboard(
        config,
        hass.config.path(DASHBOARD_BASE_DIR),
        registry_entities,
        config_root="/config",
        dashboard_key_override=dashboard_key,
        language=language,
    )
    dashboard_patch = patch_lovelace_dashboard(
        config_path,
        generated.dashboard_key,
        generated.title,
        generated.icon,
        generated.filename,
        previous_dashboard_key=previous_dashboard_key,
    )
    result = {
        "dry_run": False,
        "dashboard_key": generated.dashboard_key,
        "dashboard_url": f"/{generated.dashboard_key}/overview",
        "filename": generated.filename,
        "files": generated.files,
        "config_changed": dashboard_patch.changed,
        "frontend_installed": False,
        "themes_installed": False,
    }
    if source_config_path is not None:
        history = snapshot_dashboard(
            source_config_path,
            hass.config.path(DASHBOARD_BASE_DIR),
            config,
            dashboard_key=generated.dashboard_key,
            reason=history_reason,
        )
        result["history_version"] = history["version"]
    return result


async def _async_register_static_path(hass: HomeAssistant) -> None:
    """Serve only Marao-owned frontend files from an integration namespace."""

    if hass.data[DOMAIN].get(STATIC_PATH_REGISTERED):
        return
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                MARAO_DASHBOARD_STATIC_URL,
                str(Path(__file__).parent / "frontend"),
                True,
            )
        ]
    )
    hass.data[DOMAIN][STATIC_PATH_REGISTERED] = True


def _install_dashboard_assets(hass: HomeAssistant) -> bool:
    """Install the Marao YAML template library used by generated dashboards."""

    source_dir = Path(__file__).parent / "frontend" / "dashboard"
    if not source_dir.exists():
        return False

    target_dir = Path(hass.config.path("www/community/MaraoDashboard/dashboard"))
    changed = False

    for source_file in source_dir.rglob("*"):
        if not source_file.is_file():
            continue
        relative_path = source_file.relative_to(source_dir)
        target_file = target_dir / relative_path
        source = source_file.read_bytes()
        if target_file.exists() and target_file.read_bytes() == source:
            continue
        target_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_file, target_file)
        changed = True

    return changed


def _install_themes(hass: HomeAssistant) -> bool:
    """Install bundled Marao Dashboard themes into Home Assistant's standard themes folder."""

    source_dir = Path(__file__).parent / "frontend" / "themes" / "MaraoDashboard"
    if not source_dir.exists():
        return False

    target_dir = Path(hass.config.path("themes", "MaraoDashboard"))
    changed = False
    target_dir.mkdir(parents=True, exist_ok=True)

    for source_file in source_dir.glob("*.yaml"):
        target_file = target_dir / source_file.name
        source = source_file.read_bytes()
        if target_file.exists() and target_file.read_bytes() == source:
            continue
        target_file.write_bytes(source)
        changed = True

    return changed


def _registry_entities(hass: HomeAssistant) -> list[dict[str, Any]]:
    entity_registry = er.async_get(hass)
    device_registry = dr.async_get(hass)
    area_registry = ar.async_get(hass)
    entities = []
    registered_entity_ids: set[str] = set()

    for entry in entity_registry.entities.values():
        entity_id = entry.entity_id
        registered_entity_ids.add(entity_id)
        domain = entity_id.split(".", 1)[0]
        state = hass.states.get(entity_id)
        device = device_registry.devices.get(entry.device_id) if entry.device_id else None
        area_id = entry.area_id or (device.area_id if device else None)
        area = area_registry.areas.get(area_id) if area_id else None
        device_area = area_registry.areas.get(device.area_id) if device and device.area_id else None

        entities.append(
            {
                "entity_id": entity_id,
                "domain": domain,
                "has_state": state is not None,
                "state": state.state if state else None,
                "name": entry.name or entry.original_name or (state.name if state else None),
                "icon": entry.icon or (state.attributes.get("icon") if state else None),
                "device_class": state.attributes.get("device_class") if state else None,
                "device_model": device.model if device else None,
                "manufacturer": device.manufacturer if device else None,
                "area_id": area_id,
                "area_name": area.name if area else None,
                "device_area_id": device.area_id if device else None,
                "device_area_name": device_area.name if device_area else None,
                "disabled_by": getattr(entry, "disabled_by", None),
                "hidden_by": getattr(entry, "hidden_by", None),
            }
        )

    for state in hass.states.async_all():
        if state.entity_id in registered_entity_ids:
            continue
        entities.append(
            {
                "entity_id": state.entity_id,
                "domain": state.domain,
                "has_state": True,
                "state": state.state,
                "name": state.name,
                "icon": state.attributes.get("icon"),
                "device_class": state.attributes.get("device_class"),
                "device_model": None,
                "manufacturer": None,
                "area_id": None,
                "area_name": None,
                "device_area_id": None,
                "device_area_name": None,
                "disabled_by": None,
                "hidden_by": None,
            }
        )

    return sorted(entities, key=lambda entity: entity["entity_id"])
