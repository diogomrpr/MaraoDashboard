"""Home Assistant runtime support for Marao Dashboard frontend dependencies."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

from homeassistant.components import frontend
from homeassistant.components.lovelace import LOVELACE_DATA, MODE_YAML
from homeassistant.const import CONF_ID, CONF_URL
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir

from .const import (
    DEPENDENCY_DOCUMENTATION_URL,
    DOMAIN,
    LEGACY_VENDOR_RESOURCE_PREFIX,
)
from .dependencies import dependency_statuses, normalize_resource_url
from .generator import resolve_dashboard_config

DEPENDENCY_ISSUE_ID = "missing_dashboard_dependencies"
LEGACY_RESOURCES_ISSUE_ID = "legacy_vendor_resources"
_NORMALIZED_LEGACY_VENDOR_PREFIX = normalize_resource_url(
    LEGACY_VENDOR_RESOURCE_PREFIX
).rstrip("/")


@callback
def async_clear_dependency_issues(hass: HomeAssistant) -> None:
    """Remove Repairs owned by the Marao config entry."""

    for issue_id in (DEPENDENCY_ISSUE_ID, LEGACY_RESOURCES_ISSUE_ID):
        ir.async_delete_issue(hass, DOMAIN, issue_id)


def _is_legacy_vendor_resource(url: object) -> bool:
    """Return whether a URL belongs to Marao's retired vendor directory."""

    normalized = normalize_resource_url(url)
    return normalized == _NORMALIZED_LEGACY_VENDOR_PREFIX or normalized.startswith(
        f"{_NORMALIZED_LEGACY_VENDOR_PREFIX}/"
    )


async def async_dependency_statuses(
    hass: HomeAssistant,
    config: Mapping[str, Any],
    registry_entities: Iterable[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Return the current dependency checklist without changing external resources."""

    resources = hass.data[LOVELACE_DATA].resources
    await resources.async_get_info()
    resource_urls = tuple(
        item.get(CONF_URL, "")
        for item in resources.async_items()
        if isinstance(item, Mapping)
        and not _is_legacy_vendor_resource(item.get(CONF_URL))
    )
    module_manager = hass.data.get(frontend.DATA_EXTRA_MODULE_URL)
    extra_module_urls = (
        tuple(
            url
            for url in module_manager.urls
            if not _is_legacy_vendor_resource(url)
        )
        if module_manager is not None
        else ()
    )
    dependency_config: object = config
    if registry_entities is not None:
        try:
            dependency_config = resolve_dashboard_config(
                dict(config), registry_entities
            )
        except ValueError:
            pass
    return dependency_statuses(dependency_config, resource_urls, extra_module_urls)


async def async_refresh_dependency_issue(
    hass: HomeAssistant,
    config: Mapping[str, Any],
    registry_entities: Iterable[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Refresh dependency status and its single actionable Repair."""

    statuses = await async_dependency_statuses(hass, config, registry_entities)
    not_detected = [
        item["name"]
        for item in statuses
        if item["required"] and item["status"] != "installed"
    ]
    if not_detected:
        ir.async_create_issue(
            hass,
            DOMAIN,
            DEPENDENCY_ISSUE_ID,
            is_fixable=False,
            learn_more_url=DEPENDENCY_DOCUMENTATION_URL,
            severity=ir.IssueSeverity.WARNING,
            translation_key=DEPENDENCY_ISSUE_ID,
            translation_placeholders={"dependencies": ", ".join(not_detected)},
        )
    else:
        ir.async_delete_issue(hass, DOMAIN, DEPENDENCY_ISSUE_ID)
    return statuses


async def async_migrate_legacy_vendor_resources(hass: HomeAssistant) -> int:
    """Remove only Marao-owned legacy vendor resources in storage mode."""

    lovelace = hass.data[LOVELACE_DATA]
    resources = lovelace.resources
    await resources.async_get_info()
    legacy_items = [
        item
        for item in resources.async_items()
        if isinstance(item, Mapping) and _is_legacy_vendor_resource(item.get(CONF_URL))
    ]

    if lovelace.resource_mode == MODE_YAML:
        if legacy_items:
            ir.async_create_issue(
                hass,
                DOMAIN,
                LEGACY_RESOURCES_ISSUE_ID,
                is_fixable=False,
                learn_more_url=DEPENDENCY_DOCUMENTATION_URL,
                severity=ir.IssueSeverity.WARNING,
                translation_key=LEGACY_RESOURCES_ISSUE_ID,
                translation_placeholders={
                    "resources": ", ".join(str(item[CONF_URL]) for item in legacy_items)
                },
            )
        else:
            ir.async_delete_issue(hass, DOMAIN, LEGACY_RESOURCES_ISSUE_ID)
        return 0

    removed = 0
    for item in legacy_items:
        resource_id = item.get(CONF_ID)
        if resource_id is None:
            continue
        await resources.async_delete_item(resource_id)
        removed += 1
    ir.async_delete_issue(hass, DOMAIN, LEGACY_RESOURCES_ISSUE_ID)
    return removed
