"""Marao Dashboard dashboard installer integration."""

from __future__ import annotations

from asyncio import Lock, run_coroutine_threadsafe
import json
from pathlib import Path
import re
from typing import Any
from uuid import uuid4

import voluptuous as vol

from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace import LOVELACE_DATA, MODE_YAML
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er

from .config_patch import (
    patch_frontend_themes,
    patch_lovelace_dashboard,
    registered_dashboard_key,
    validate_dashboard_registration,
    remove_lovelace_dashboard,
)
from .const import (
    BASE_DASHBOARD_CREATED,
    BASE_DASHBOARD_NAME,
    BASE_DASHBOARD_SLUG,
    DASHBOARD_BASE_DIR,
    DEFAULT_DASHBOARD_CONFIG,
    DOMAIN,
    GENERATE_DASHBOARD_SERVICE,
    MANAGEMENT_PANEL_ICON,
    MANAGEMENT_PANEL_PATH,
    MANAGEMENT_PANEL_TITLE,
    LEGACY_FRONTEND_MODULE,
    LEGACY_CARD_TEST_DASHBOARD_FILE,
    LEGACY_CARD_TEST_DASHBOARD_KEY,
    MARAO_DASHBOARD_MODULES,
    MARAO_DASHBOARD_STATIC_URL,
)
from .legacy_migration import (
    LegacyResourcePlan,
    async_clear_legacy_resource_issue,
    async_plan_legacy_resources,
    async_restore_legacy_resource_cache,
)
from .frontend_assets import (
    ASSET_STATE, FrontendAssetView, FrontendBootstrapView,
    asset_snapshot, frontend_asset_url, frontend_fingerprint,
)
from .editor import EDITOR_CATALOG, display_catalog, initial_entity_ids, page_templates
from .native_storage import NativeDashboardPlan, async_find_native_dashboard, async_restore_native_cache, staged_native_dashboard
from .generator import (
    CUSTOM_START,
    GENERATION_CONTRACT_VERSION,
    MANIFEST_NAME,
    _extract_custom_cards,
    _load_generation_manifest,
    build_base_dashboard_config,
    dashboard_identity,
    load_dashboard_config,
    parse_dashboard_config,
    migrate_legacy_theme,
    migrate_dashboard_config,
    materialize_overview_groups,
    plan_dashboard,
    write_dashboard_config,
    write_dashboard,
)
from .history import (
    DASHBOARD_WRITE_LOCK,
    HISTORY_DIR_NAME,
    OPERATION_DIR_NAME,
    RECOVERY_ERROR,
    dashboard_operation,
    list_dashboard_history,
    restore_dashboard_version,
    snapshot_dashboard,
    recover_dashboard_operation,
)

SERVICE_REGISTERED = "generate_dashboard_service_registered"
WEBSOCKET_REGISTERED = "websocket_registered"
STATIC_PATH_REGISTERED = "static_path_registered"
FRONTEND_MODULES = "frontend_modules"
FRONTEND_STATE = "frontend_state"
FRONTEND_SUBSCRIBERS = "frontend_subscribers"
GENERATE_DASHBOARD_SCHEMA = vol.Schema(
    {
        vol.Optional("config_path", default=DEFAULT_DASHBOARD_CONFIG): cv.string,
        vol.Optional("dashboard_key"): cv.string,
        vol.Optional("dry_run", default=False): cv.boolean,
    }
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Marao Dashboard and create the base dashboard once."""

    async with _dashboard_operation_lock(hass):
        return await _async_setup_dashboard(hass, entry)


def _dashboard_operation_lock(hass: HomeAssistant) -> Lock:
    return hass.data.setdefault(DOMAIN, {}).setdefault("dashboard_operation_lock", Lock())


def _recover_dashboard_state(hass: HomeAssistant) -> None:
    """Recover files and the loaded native resource cache before accepting writes."""
    checkpoint = Path(hass.config.path(DASHBOARD_BASE_DIR, HISTORY_DIR_NAME, OPERATION_DIR_NAME, "operation.json"))
    lovelace = hass.data.get(LOVELACE_DATA)
    def restore_resources():
        if lovelace is not None and lovelace.resource_mode != MODE_YAML and any(
            target["path"] == lovelace.resources.store.path for target in json.loads(checkpoint.read_bytes())["targets"]
        ):
            run_coroutine_threadsafe(async_restore_legacy_resource_cache(hass), hass.loop).result()
        if lovelace is not None:
            targets = {target["path"] for target in json.loads(checkpoint.read_bytes())["targets"]}
            for dashboard in lovelace.dashboards.values():
                store = getattr(dashboard, "_store", None)
                if store is not None and store.path in targets:
                    run_coroutine_threadsafe(async_restore_native_cache(dashboard), hass.loop).result()
    recover_dashboard_operation(hass.config.path(DASHBOARD_BASE_DIR), restore_resources)


async def _async_setup_dashboard(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    source_path = _dashboard_config_path(hass)
    await hass.async_add_executor_job(_recover_dashboard_state, hass)
    source = await hass.async_add_executor_job(load_dashboard_config, source_path) if source_path.exists() else None
    native = await async_find_native_dashboard(hass, source)
    if native:
        hass.data.setdefault(DOMAIN, {})["native_dashboard"] = native[0]
    elif source is None and entry.data.get(BASE_DASHBOARD_CREATED):
        raise ValueError("The saved Marao configuration is missing; restore it before generation")
    registry_entities = _registry_entities(hass)
    areas = _editor_areas(hass)
    should_repair = await hass.async_add_executor_job(
        _should_repair_base_dashboard, hass, registry_entities, areas
    )
    legacy_resources = await async_plan_legacy_resources(hass)

    hass.data.setdefault(DOMAIN, {})
    _register_services(hass)
    hass.data[DOMAIN][ASSET_STATE] = await hass.async_add_executor_job(
        asset_snapshot, Path(__file__).parent / "frontend"
    )
    fingerprint = hass.data[DOMAIN][ASSET_STATE]["fingerprint"]
    await _async_register_static_path(hass)
    module_urls = tuple(f"{url}?v={fingerprint}" for url in MARAO_DASHBOARD_MODULES)
    for module_url in module_urls:
        frontend.add_extra_js_url(hass, module_url)
    hass.data[DOMAIN][FRONTEND_MODULES] = module_urls
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=MANAGEMENT_PANEL_PATH,
        webcomponent_name="marao-dashboard-panel",
        sidebar_title=MANAGEMENT_PANEL_TITLE,
        sidebar_icon=MANAGEMENT_PANEL_ICON,
        module_url=frontend_asset_url(fingerprint, "MaraoDashboardPanel.js"),
        require_admin=True,
        config_panel_domain=DOMAIN,
    )
    _register_websocket_commands(hass)
    if not entry.data.get(BASE_DASHBOARD_CREATED) or should_repair or native and source is None:
        config = (await hass.async_add_executor_job(load_dashboard_config, source_path)
                  if source_path.exists() else native[1] if native else build_base_dashboard_config(registry_entities))
        generated = await hass.async_add_executor_job(
            _generate_dashboard,
            hass,
            config,
            None,
            False,
            registry_entities,
            _dashboard_config_path(hass),
            "generation",
            None,
            areas,
            legacy_resources,
        )
        hass.data[DOMAIN]["base_dashboard"] = generated
        await _async_refresh_dashboard(hass, generated)
        hass.config_entries.async_update_entry(
            entry,
            data={**entry.data, BASE_DASHBOARD_CREATED: True},
        )
        if generated["legacy_gallery_removed"]:
            _remove_legacy_card_test_panel(hass)
    else:
        await hass.async_add_executor_job(_install_themes, hass, None, legacy_resources)
    if hass.services.has_service("frontend", "reload_themes"):
        await hass.services.async_call("frontend", "reload_themes", blocking=True)
    if legacy_resources:
        async_clear_legacy_resource_issue(hass)
    await hass.async_add_executor_job(_ensure_current_history, hass)
    dashboard_key = await hass.async_add_executor_job(_frontend_dashboard_key, hass)
    _publish_frontend(hass, {"fingerprint": fingerprint, "dashboard": dashboard_key})
    return True


@callback
def _remove_legacy_card_test_panel(hass: HomeAssistant) -> None:
    """Remove the retired panel only after its owned YAML patch commits."""
    frontend.async_remove_panel(
        hass, LEGACY_CARD_TEST_DASHBOARD_KEY, warn_if_unknown=False
    )
    lovelace_data = hass.data.get(LOVELACE_DATA)
    if lovelace_data:
        lovelace_data.dashboards.pop(LEGACY_CARD_TEST_DASHBOARD_KEY, None)
        lovelace_data.yaml_dashboards.pop(LEGACY_CARD_TEST_DASHBOARD_KEY, None)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Marao Dashboard."""

    async with _dashboard_operation_lock(hass):
        _publish_frontend(hass, {"fingerprint": None, "dashboard": None})
        frontend.async_remove_panel(hass, MANAGEMENT_PANEL_PATH, warn_if_unknown=False)
        for module_url in hass.data.get(DOMAIN, {}).pop(FRONTEND_MODULES, ()):
            frontend.remove_extra_js_url(hass, module_url)
        hass.data.get(DOMAIN, {}).pop("base_dashboard", None)
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove state that must not outlive the Marao config entry."""

    async_clear_legacy_resource_issue(hass)


def _register_services(hass: HomeAssistant) -> None:
    if hass.data[DOMAIN].get(SERVICE_REGISTERED):
        return

    async def generate_dashboard(call: ServiceCall) -> dict[str, Any]:
        async with _dashboard_operation_lock(hass):
            config_path = _dashboard_config_path(hass, call.data["config_path"])
            registry_entities = _registry_entities(hass)
            generated = await hass.async_add_executor_job(
                _generate_dashboard_from_path,
                hass,
                config_path,
                call.data.get("dashboard_key"),
                call.data["dry_run"],
                registry_entities,
                _editor_areas(hass),
            )
            await _async_refresh_dashboard(hass, generated)
            return generated

    hass.services.async_register(
        DOMAIN,
        GENERATE_DASHBOARD_SERVICE,
        generate_dashboard,
        schema=GENERATE_DASHBOARD_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.data[DOMAIN][SERVICE_REGISTERED] = True


def _register_websocket_commands(hass: HomeAssistant) -> None:
    """Register admin management and authenticated, read-only native compilation."""

    if hass.data[DOMAIN].get(WEBSOCKET_REGISTERED):
        return

    @websocket_api.websocket_command({"type": "marao_dashboard/frontend/subscribe"})
    @callback
    def websocket_frontend(hass, connection, msg):
        # Read-only identity is safe for ordinary authenticated dashboard users.
        listeners = hass.data[DOMAIN].setdefault(FRONTEND_SUBSCRIBERS, {})
        key = (connection, msg["id"])
        listeners[key] = lambda payload: connection.send_event(msg["id"], payload)
        connection.subscriptions[msg["id"]] = lambda: listeners.pop(key, None)
        connection.send_result(msg["id"])
        connection.send_event(msg["id"], hass.data[DOMAIN].get(FRONTEND_STATE, {}))

    websocket_api.async_register_command(hass, websocket_frontend)

    @websocket_api.require_admin
    @websocket_api.websocket_command({"type": "marao_dashboard/config/get", vol.Optional("config"): str,
                                      vol.Optional("scope", default="full"): vol.In(("full", "initial", "context", "history"))})
    @websocket_api.async_response
    async def websocket_get_config(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        scope = msg.get("scope", "full")
        try:
            if scope != "full" and "config" in msg:
                raise ValueError("Explicit source previews require the full scope")
            raw = None
            if scope == "initial":
                raw = await hass.async_add_executor_job(_management_source, hass)
            # Current documents need no discovery context for ordered conversion.
            full_context = scope in ("full", "context") or scope == "initial" and raw.get("config_version") != 2
            registry_entities = _registry_entities(hass) if full_context else None
            areas = _editor_areas(hass) if full_context else None
            payload = await hass.async_add_executor_job(
                _management_payload, hass, registry_entities, areas, msg.get("config"), scope, raw
            )
            if scope == "initial":
                ids = payload["editor"]["display_entity_ids"]
                payload["editor"]["entities"] = _registry_entities(hass, ids)
        except ValueError as err:
            connection.send_error(msg["id"], "invalid_config", str(err))
            return
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
        async with _dashboard_operation_lock(hass):
            registry_entities = _registry_entities(hass)
            try:
                generated = await hass.async_add_executor_job(
                    _save_and_generate_dashboard,
                    hass,
                    msg["config"],
                    registry_entities,
                    _editor_areas(hass),
                )
            except ValueError as err:
                connection.send_error(msg["id"], "invalid_config", str(err))
                return
            await _async_refresh_dashboard(hass, generated)
            generated["history"] = await hass.async_add_executor_job(
                list_dashboard_history, hass.config.path(DASHBOARD_BASE_DIR)
            )
            connection.send_result(msg["id"], generated)
            state = hass.data[DOMAIN].get(FRONTEND_STATE, {})
            _publish_frontend(hass, {**state, "dashboard": generated["dashboard_key"]}, uuid4().hex)

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
        async with _dashboard_operation_lock(hass):
            try:
                restored = await hass.async_add_executor_job(
                    _restore_history, hass, msg["version"]
                )
            except ValueError as err:
                connection.send_error(msg["id"], "invalid_version", str(err))
                return
            await _async_refresh_dashboard(hass, restored)
            restored["history"] = await hass.async_add_executor_job(
                list_dashboard_history, hass.config.path(DASHBOARD_BASE_DIR)
            )
            connection.send_result(msg["id"], restored)

    from .native import compile_card, compile_starter

    @websocket_api.websocket_command({
        "type": "marao_dashboard/native/card", vol.Required("config"): dict,
        vol.Required("instance"): str, vol.Required("url_path"): str,
        vol.Optional("entities", default=list): list, vol.Optional("language", default="en"): str,
        vol.Optional("validate_units", default=True): bool,
    })
    @websocket_api.async_response
    async def websocket_native_card(hass, connection, msg):
        try:
            result = await hass.async_add_executor_job(
                compile_card, msg["config"], msg["instance"], msg["url_path"], msg["entities"], msg["language"], msg["validate_units"])
        except (ValueError, TypeError, KeyError) as err:
            connection.send_error(msg["id"], "invalid_config", str(err))
            return
        connection.send_result(msg["id"], result)

    @websocket_api.websocket_command({
        "type": "marao_dashboard/native/starter", vol.Required("title"): str,
        vol.Required("url_path"): str, vol.Required("entities"): list,
        vol.Optional("areas", default=list): list, vol.Optional("language", default="en"): str,
    })
    @websocket_api.async_response
    async def websocket_native_starter(hass, connection, msg):
        try:
            result = await hass.async_add_executor_job(
                compile_starter, msg["title"], msg["url_path"], msg["entities"], msg["areas"], msg["language"])
        except (ValueError, TypeError, KeyError) as err:
            connection.send_error(msg["id"], "invalid_config", str(err))
            return
        connection.send_result(msg["id"], result)

    websocket_api.async_register_command(hass, websocket_native_card)
    websocket_api.async_register_command(hass, websocket_native_starter)
    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_generate_config)
    websocket_api.async_register_command(hass, websocket_restore_history)
    hass.data[DOMAIN][WEBSOCKET_REGISTERED] = True


def _frontend_dashboard_key(hass: HomeAssistant) -> str:
    """Resolve the owned route without exposing or changing saved configuration."""
    planned = dashboard_identity(load_dashboard_config(_dashboard_config_path(hass)))
    if native := hass.data[DOMAIN].get("native_dashboard"):
        return native.url_path
    return registered_dashboard_key(hass.config.path("configuration.yaml"), planned.filename) or planned.dashboard_key


@callback
def _publish_frontend(hass: HomeAssistant, state: dict[str, Any], request_id: str | None = None) -> None:
    hass.data[DOMAIN][FRONTEND_STATE] = state
    payload = {**state, **({"request_id": request_id} if request_id else {})}
    # Subscriptions belong to the websocket, surviving an entry reload so it can
    # deliver the new identity without a polling timer or reconnect race.
    for send in tuple(hass.data[DOMAIN].get(FRONTEND_SUBSCRIBERS, {}).values()):
        send(payload)


async def _async_refresh_dashboard(hass: HomeAssistant, result: dict[str, Any]) -> None:
    """Reload committed YAML includes and notify open dashboards through HA."""
    if result.get("dry_run") or not (lovelace := hass.data.get(LOVELACE_DATA)):
        return
    dashboard = lovelace.dashboards.get(result["dashboard_key"])
    if dashboard is None or dashboard.mode != MODE_YAML:
        return
    if filename := result.get("filename"):
        if Path(dashboard.path) != Path(hass.config.path(filename)):
            return  # A changed dashboard registration still requires HA's restart.
    # HA watches the root YAML timestamp, but generation can change only includes.
    await dashboard.async_load(force=True)


def _management_source(hass: HomeAssistant) -> dict[str, Any]:
    with DASHBOARD_WRITE_LOCK:
        _check_management_recovery(hass)
        return load_dashboard_config(_dashboard_config_path(hass))


def _check_management_recovery(hass: HomeAssistant) -> None:
    if Path(hass.config.path(DASHBOARD_BASE_DIR, HISTORY_DIR_NAME, OPERATION_DIR_NAME, "operation.json")).exists():
        raise ValueError(RECOVERY_ERROR)


def _management_payload(
    hass: HomeAssistant,
    registry_entities: list[dict[str, Any]] | None = None,
    areas: list[dict[str, Any]] | None = None,
    source: str | None = None,
    scope: str = "full",
    raw: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if scope not in ("full", "initial", "context", "history"):
        raise ValueError("Unsupported management read scope")
    if source is not None and scope != "full":
        raise ValueError("Explicit source previews require the full scope")
    with DASHBOARD_WRITE_LOCK:
        _check_management_recovery(hass)
        if scope == "history":
            return {"history": list_dashboard_history(hass.config.path(DASHBOARD_BASE_DIR))}
        config_path = _dashboard_config_path(hass)
        if raw is None:
            raw = parse_dashboard_config(source) if source is not None else load_dashboard_config(config_path)
        config = migrate_dashboard_config(raw, registry_entities, areas)
        conversion_pending = config != raw
        config = materialize_overview_groups(config, registry_entities, getattr(hass.config, "language", None) or "en")
        if scope == "context":
            return {"editor": {"catalog": EDITOR_CATALOG, "entities": registry_entities or [], "areas": areas or []},
                    "page_templates": page_templates(config, registry_entities or [])}
        planned = dashboard_identity(config)
        key = registered_dashboard_key(hass.config.path("configuration.yaml"), planned.filename)
        if native := hass.data.get(DOMAIN, {}).get("native_dashboard"):
            key = native.url_path
        payload = {
            "config": json.dumps(config, indent=2, ensure_ascii=False) + "\n",
            "conversion_pending": conversion_pending,
            "config_path": f"/config/{DEFAULT_DASHBOARD_CONFIG}",
            "dashboard_url": f"/{key or planned.dashboard_key}/{config.get('landing_page', 'overview')}",
            "editor": {
                "catalog": display_catalog() if scope == "initial" else EDITOR_CATALOG,
                "entities": [] if scope == "initial" else registry_entities or [],
                "areas": [] if scope == "initial" else areas or [],
            },
        }
        if scope == "initial":
            payload["editor"]["display_entity_ids"] = initial_entity_ids(config)
        else:
            payload["page_templates"] = page_templates(config, registry_entities or [])
            payload["history"] = list_dashboard_history(hass.config.path(DASHBOARD_BASE_DIR))
        return payload


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
        planned = dashboard_identity(config)
        key = registered_dashboard_key(hass.config.path("configuration.yaml"), planned.filename)
        if native := hass.data.get(DOMAIN, {}).get("native_dashboard"):
            key = native.url_path
    except (FileNotFoundError, ValueError):
        return
    snapshot_dashboard(
        config_path,
        hass.config.path(DASHBOARD_BASE_DIR),
        config,
        dashboard_key=key or planned.dashboard_key,
        reason="current dashboard",
    )


def _save_and_generate_dashboard(
    hass: HomeAssistant,
    source: str,
    registry_entities: list[dict[str, Any]],
    areas: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    config = parse_dashboard_config(source)

    with DASHBOARD_WRITE_LOCK:
        return _generate_dashboard(
            hass, config, None, False, registry_entities,
            _dashboard_config_path(hass), "generated from editor",
            areas=areas,
        )


def _restore_history(hass: HomeAssistant, version: str) -> dict[str, Any]:
    from .history import read_dashboard_version
    config, metadata, _ = read_dashboard_version(hass.config.path(DASHBOARD_BASE_DIR), version)
    _assert_builder_destination(hass, metadata.get("dashboard_key") or dashboard_identity(config).dashboard_key)
    _recover_dashboard_state(hass)
    config, metadata = restore_dashboard_version(
        _dashboard_config_path(hass), hass.config.path(DASHBOARD_BASE_DIR), version,
        configuration_path=hass.config.path("configuration.yaml"),
    )
    if native := hass.data.get(DOMAIN, {}).get("native_dashboard"):
        _generate_dashboard(hass, config, native.url_path, history_reason="restoration")
        config = load_dashboard_config(_dashboard_config_path(hass))
    planned = dashboard_identity(config)
    key = native.url_path if native else metadata.get("dashboard_key") or planned.dashboard_key
    return {
        "restored_version": version,
        "dashboard_key": key,
        "dashboard_url": f"/{key}/{config.get('landing_page', 'overview')}",
        "filename": planned.filename,
        "config_changed": metadata.get("config_changed", False),
    }


def _dashboard_config_path(hass: HomeAssistant, config_path: str = DEFAULT_DASHBOARD_CONFIG) -> Path:
    path = Path(config_path)
    return path if path.is_absolute() else Path(hass.config.path(config_path))


def _should_repair_base_dashboard(
    hass: HomeAssistant, registry_entities: list[dict[str, Any]],
    areas: list[dict[str, Any]] | None = None,
) -> bool:
    config_path = _dashboard_config_path(hass)
    if not config_path.exists():
        identity = dashboard_identity(build_base_dashboard_config(registry_entities))
        validate_dashboard_registration(hass.config.path("configuration.yaml"), identity.dashboard_key, identity.filename)
        return False
    with DASHBOARD_WRITE_LOCK:
        raw = load_dashboard_config(config_path)
        config = migrate_dashboard_config(raw, registry_entities, areas)
        migrate_legacy_theme(config)
        identity = dashboard_identity(config)
        existing_key = registered_dashboard_key(hass.config.path("configuration.yaml"), identity.filename)
        if native := hass.data.get(DOMAIN, {}).get("native_dashboard"):
            existing_key = native.url_path
        validate_dashboard_registration(hass.config.path("configuration.yaml"), existing_key or identity.dashboard_key, identity.filename)
        dashboard_dir = Path(hass.config.path(DASHBOARD_BASE_DIR)) / dashboard_identity(config).slug
        manifest = dashboard_dir / MANIFEST_NAME
        if manifest.exists():
            _load_generation_manifest(dashboard_dir)
        contract = json.loads(manifest.read_text()).get("generated_contract", 0) if manifest.exists() else 0
        required = (config != raw or not dashboard_dir.exists()
                    or contract != GENERATION_CONTRACT_VERSION
                    or registered_dashboard_key(hass.config.path("configuration.yaml"), LEGACY_CARD_TEST_DASHBOARD_FILE) == LEGACY_CARD_TEST_DASHBOARD_KEY
                    or _generated_dashboard_needs_self_contained_repair(dashboard_dir))
        if required:
            plan_dashboard(config, hass.config.path(DASHBOARD_BASE_DIR), registry_entities, dashboard_key_override=existing_key)
        return required


def _generated_dashboard_needs_self_contained_repair(dashboard_dir: Path) -> bool:
    """Detect old generated resources so the next setup rewrites them."""

    if not dashboard_dir.is_dir():
        return False
    owned = _load_generation_manifest(dashboard_dir) if (dashboard_dir / MANIFEST_NAME).exists() else None
    paths = (
        (dashboard_dir / relative for relative in (*owned["plain"], *owned["containers"]))
        if owned is not None else dashboard_dir.rglob("*.yaml")
    )
    for path in paths:
        if path.suffix != ".yaml":
            continue
        try:
            source = path.read_text(encoding="utf-8")
        except OSError:
            continue
        # Dormant files and protected custom cards do not belong to generated repair.
        relative = path.relative_to(dashboard_dir).as_posix()
        if owned is not None and relative in owned["containers"] and CUSTOM_START in source:
            custom = _extract_custom_cards(source, relative)
            source = source.replace(CUSTOM_START + custom, CUSTOM_START, 1)
        if any(marker in source for marker in (
            "custom:button-card",
            "custom:bubble-card",
            "custom:navbar-card",
            "button_card_templates:",
            "kiosk_mode:",
            "color_type: blank-card",
        )):
            return True
        # Older generated Energy pages could retain period cards after their
        # configured entity was cleared.  Regenerate those files on startup so
        # stale error cards are never left in an otherwise valid dashboard.
        if "custom:marao-energy-period-card" in source and re.search(
            r"type:\s*custom:marao-energy-period-card[\s\S]{0,200}entity:\s*(?:['\"]{2}|null)?\s*(?:\n|$)",
            source,
        ):
            return True
    return False


def _generate_dashboard_from_path(hass, config_path, dashboard_key, dry_run, registry_entities, areas=None):
    """Read the selected source under the same lock as its writable generation."""
    with DASHBOARD_WRITE_LOCK:
        if not dry_run:
            _recover_dashboard_state(hass)
        return _generate_dashboard(
            hass, load_dashboard_config(config_path), dashboard_key, dry_run,
            registry_entities, config_path,
            areas=areas,
        )


def _assert_builder_destination(hass, key):
    """Refuse native storage destinations before any builder mutation."""
    from .native import native_owned
    from .native_storage import _read_native_document
    lovelace = hass.data.get(LOVELACE_DATA)
    dashboard = lovelace.dashboards.get(key) if lovelace else None
    if dashboard is None or dashboard.mode != "storage":
        return
    data = getattr(dashboard, "_data", None)
    if data is None:
        try:
            data = _read_native_document(dashboard)["data"]
        except FileNotFoundError:
            data = {}
    proven_builder = dashboard is hass.data.get(DOMAIN, {}).get("native_dashboard")
    if native_owned(data.get("config"), aliases=not proven_builder) or not proven_builder:
        raise ValueError("Home Assistant owns this dashboard; the Marao builder cannot replace it")


def _generate_dashboard(
    hass: HomeAssistant,
    config: dict[str, Any],
    dashboard_key: str | None = None,
    dry_run: bool = False,
    registry_entities: list[dict[str, Any]] | None = None,
    source_config_path: Path | None = None,
    history_reason: str = "generation",
    previous_dashboard_key: str | None = None,
    areas: list[dict[str, Any]] | None = None,
    legacy_resources: LegacyResourcePlan | None = None,
) -> dict[str, Any]:
    """Generate the base dashboard and install required YAML configuration."""

    with DASHBOARD_WRITE_LOCK:
        if registry_entities is None:
            registry_entities = _registry_entities(hass)
        language = getattr(hass.config, "language", None) or "en"
        base_dir = Path(hass.config.path(DASHBOARD_BASE_DIR))
        source_config_path = source_config_path or _dashboard_config_path(hass)
        configuration_path = Path(hass.config.path("configuration.yaml"))
        if not dry_run:
            _recover_dashboard_state(hass)
        elif (base_dir / HISTORY_DIR_NAME / OPERATION_DIR_NAME / "operation.json").exists():
            raise ValueError(RECOVERY_ERROR)
        previous_filename = None
        native = hass.data.get(DOMAIN, {}).get("native_dashboard")
        if native is not None:
            if dashboard_key is not None and dashboard_key != native.url_path:
                raise ValueError("Keep the existing native dashboard route during migration")
            dashboard_key = native.url_path
        if source_config_path.exists():
            current_identity = dashboard_identity(load_dashboard_config(source_config_path))
            previous_filename = current_identity.filename
            existing_key = registered_dashboard_key(configuration_path, current_identity.filename)
            previous_dashboard_key = previous_dashboard_key or existing_key or current_identity.dashboard_key
            if dashboard_identity(config).slug == current_identity.slug and dashboard_key is None:
                dashboard_key = existing_key
        config = migrate_dashboard_config(config, registry_entities, areas)
        migrate_legacy_theme(config)
        planned = plan_dashboard(
            config,
            hass.config.path(DASHBOARD_BASE_DIR),
            registry_entities,
            dashboard_key_override=dashboard_key,
        )
        _assert_builder_destination(hass, planned.dashboard_key)
        validate_dashboard_registration(configuration_path, planned.dashboard_key, planned.filename,
                                        previous_dashboard_key, previous_filename)
        if dry_run:
            return {
                "dry_run": True,
                "dashboard_key": planned.dashboard_key,
                "dashboard_url": f"/{planned.dashboard_key}/{config['landing_page']}",
                "filename": planned.filename,
                "files": planned.files,
                "config_changed": False,
            }

        native_plan = NativeDashboardPlan.capture(native, base_dir, allow_builder_aliases=True) if native is not None else None
        output_dir = base_dir / planned.slug
        theme_dir = Path(hass.config.path("themes", "MaraoDashboard"))
        baseline = None
        current = None
        if source_config_path.exists():
            current = load_dashboard_config(source_config_path)
            previous_identity = dashboard_identity(current, previous_dashboard_key)
            previous_dashboard_key = previous_dashboard_key or previous_identity.dashboard_key
            baseline = snapshot_dashboard(
                source_config_path, base_dir, current,
                dashboard_key=previous_identity.dashboard_key, reason="before generation",
            )
        owned_plans = [plan for plan in (legacy_resources, native_plan) if plan is not None]
        def commit_owned():
            for plan in owned_plans:
                plan.commit_from_thread()
        def restore_owned():
            for plan in owned_plans:
                plan.restore_from_thread()
        with dashboard_operation(
            base_dir, source_config_path, [output_dir, theme_dir], configuration_path,
            baseline_version=baseline["version"] if baseline else None,
            owned_files=tuple(plan.path for plan in owned_plans),
            before_source_commit=commit_owned if owned_plans else None,
            restore_callback=restore_owned if owned_plans else None,
        ) as stage:
            render_base = stage[output_dir].parent / "render"
            render_base.mkdir()
            rendered_dir = render_base / planned.slug
            if stage[output_dir].exists():
                stage[output_dir].rename(rendered_dir)
            generated = write_dashboard(
                config, render_base, registry_entities,
                config_root=hass.config.config_dir,
                dashboard_key_override=dashboard_key, language=language,
            )
            if native_plan:
                native_plan.stage(staged_native_dashboard(rendered_dir, output_dir))
                stage[native_plan.path].write_bytes(native_plan.content)
            rendered_dir.rename(stage[output_dir])
            dashboard_patch = None if native is not None else patch_lovelace_dashboard(
                stage[configuration_path], generated.dashboard_key, generated.title,
                generated.icon, generated.filename,
                previous_dashboard_key=previous_dashboard_key,
                previous_filename=previous_filename,
            )
            themes_installed = _install_themes(hass, stage[theme_dir])
            frontend_patch = patch_frontend_themes(stage[configuration_path], "themes", None, [LEGACY_FRONTEND_MODULE])
            legacy_gallery = remove_lovelace_dashboard(
                stage[configuration_path], LEGACY_CARD_TEST_DASHBOARD_KEY, LEGACY_CARD_TEST_DASHBOARD_FILE,
            )
            if legacy_resources:
                stage[legacy_resources.path].write_bytes(legacy_resources.content)
            if current != config:
                write_dashboard_config(config, stage[source_config_path])
        history = snapshot_dashboard(
            source_config_path, base_dir, config,
            dashboard_key=generated.dashboard_key, reason=history_reason,
        )
        return {
            "dry_run": False,
            "dashboard_key": generated.dashboard_key,
            "dashboard_url": f"/{generated.dashboard_key}/{config['landing_page']}",
            "filename": generated.filename,
            "files": planned.files,
            "config_changed": bool(dashboard_patch and dashboard_patch.changed) or frontend_patch.changed or legacy_gallery.changed,
            "legacy_gallery_removed": legacy_gallery.changed,
            "frontend_installed": False,
            "themes_installed": themes_installed,
            "history_version": history["version"],
            "config": json.dumps(config, indent=2, ensure_ascii=False) + "\n",
        }


async def _async_register_static_path(hass: HomeAssistant) -> None:
    """Serve only Marao-owned frontend files from an integration namespace."""

    if hass.data[DOMAIN].get(STATIC_PATH_REGISTERED):
        return
    hass.http.register_view(FrontendBootstrapView())
    hass.http.register_view(FrontendAssetView())
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                MARAO_DASHBOARD_STATIC_URL,
                str(Path(__file__).parent / "frontend"),
                False,
            )
        ]
    )
    hass.data[DOMAIN][STATIC_PATH_REGISTERED] = True


def _install_themes(hass: HomeAssistant, target_dir: Path | None = None, legacy_resources: LegacyResourcePlan | None = None) -> bool:
    """Install bundled Marao Dashboard themes into Home Assistant's standard themes folder."""

    source_dir = Path(__file__).parent / "frontend" / "themes" / "MaraoDashboard"
    if not source_dir.exists():
        return False

    if target_dir is None:
        _recover_dashboard_state(hass)
        target_dir = Path(hass.config.path("themes", "MaraoDashboard"))
        configuration = Path(hass.config.path("configuration.yaml"))
        with dashboard_operation(
            hass.config.path(DASHBOARD_BASE_DIR), _dashboard_config_path(hass), [target_dir], configuration,
            owned_files=(legacy_resources.path,) if legacy_resources else (),
            before_source_commit=legacy_resources.commit_from_thread if legacy_resources else None,
            restore_callback=legacy_resources.restore_from_thread if legacy_resources else None,
        ) as stage:
            installed = _install_themes(hass, stage[target_dir])
            patched = patch_frontend_themes(stage[configuration], "themes", None, [LEGACY_FRONTEND_MODULE])
            if legacy_resources:
                stage[legacy_resources.path].write_bytes(legacy_resources.content)
        return installed or patched.changed
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


def _registry_entities(hass: HomeAssistant, entity_ids: list[str] | None = None) -> list[dict[str, Any]]:
    entity_registry = er.async_get(hass)
    device_registry = dr.async_get(hass)
    area_registry = ar.async_get(hass)
    entities = []
    registered_entity_ids: set[str] = set()

    entries = (entity_registry.entities.values() if entity_ids is None else
               (entry for entity_id in entity_ids if (entry := entity_registry.async_get(entity_id)) is not None))
    for entry in entries:
        entity_id = entry.entity_id
        registered_entity_ids.add(entity_id)
        domain = entity_id.split(".", 1)[0]
        state = hass.states.get(entity_id)
        device = device_registry.async_get(entry.device_id) if entry.device_id else None
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
                "unit_of_measurement": state.attributes.get("unit_of_measurement") if state else None,
                "supported_features": state.attributes.get("supported_features") if state else None,
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

    states = (hass.states.async_all() if entity_ids is None else
              (state for entity_id in entity_ids if (state := hass.states.get(entity_id)) is not None))
    for state in states:
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
                "unit_of_measurement": state.attributes.get("unit_of_measurement"),
                "supported_features": state.attributes.get("supported_features"),
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
