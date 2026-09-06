"""Upgrade helpers for resources created by pre-0.4 Marao releases."""

from __future__ import annotations

from collections.abc import Mapping
from urllib.parse import unquote, urlsplit

from homeassistant.components.lovelace import LOVELACE_DATA, MODE_YAML
from homeassistant.const import CONF_ID, CONF_URL
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir

from .const import (
    DOMAIN,
    LEGACY_CAMERA_EVENTS_MODULE,
    LEGACY_FRONTEND_MODULE,
    LEGACY_VENDOR_RESOURCE_PREFIX,
    MIGRATION_DOCUMENTATION_URL,
)

LEGACY_RESOURCES_ISSUE_ID = "legacy_vendor_resources"


def normalize_resource_url(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        return ""
    try:
        path = urlsplit(value.strip()).path
    except ValueError:
        path = value.split("?", 1)[0].split("#", 1)[0]
    return f"/{'/'.join(part for part in unquote(path).replace('\\', '/').split('/') if part)}".casefold()


_NORMALIZED_PREFIX = normalize_resource_url(LEGACY_VENDOR_RESOURCE_PREFIX).rstrip("/")
_NORMALIZED_LEGACY_MODULES = {
    normalize_resource_url(LEGACY_FRONTEND_MODULE),
    normalize_resource_url(LEGACY_CAMERA_EVENTS_MODULE),
}


@callback
def async_clear_legacy_resource_issue(hass: HomeAssistant) -> None:
    ir.async_delete_issue(hass, DOMAIN, LEGACY_RESOURCES_ISSUE_ID)


def _is_legacy_resource(url: object) -> bool:
    if not isinstance(url, str) or not url.strip():
        return False
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return False
    if parts.scheme or parts.netloc or not parts.path.startswith("/"):
        return False
    normalized = normalize_resource_url(url)
    return (
        normalized in _NORMALIZED_LEGACY_MODULES
        or normalized == _NORMALIZED_PREFIX
        or normalized.startswith(f"{_NORMALIZED_PREFIX}/")
    )


async def async_migrate_legacy_resources(hass: HomeAssistant) -> int:
    """Remove only resources owned by legacy Marao releases in storage mode."""

    resources = hass.data[LOVELACE_DATA].resources
    await resources.async_get_info()
    legacy_items = [
        item for item in resources.async_items()
        if isinstance(item, Mapping) and _is_legacy_resource(item.get(CONF_URL))
    ]
    if hass.data[LOVELACE_DATA].resource_mode == MODE_YAML:
        if legacy_items:
            ir.async_create_issue(
                hass, DOMAIN, LEGACY_RESOURCES_ISSUE_ID, is_fixable=False,
                learn_more_url=MIGRATION_DOCUMENTATION_URL,
                severity=ir.IssueSeverity.WARNING,
                translation_key=LEGACY_RESOURCES_ISSUE_ID,
                translation_placeholders={"resources": ", ".join(str(item[CONF_URL]) for item in legacy_items)},
            )
        else:
            async_clear_legacy_resource_issue(hass)
        return 0
    for item in legacy_items:
        if item.get(CONF_ID) is not None:
            await resources.async_delete_item(item[CONF_ID])
    async_clear_legacy_resource_issue(hass)
    return len(legacy_items)
