"""Upgrade helpers for resources created by pre-0.4 Marao releases."""

from __future__ import annotations

from collections.abc import Mapping
from asyncio import run_coroutine_threadsafe
from copy import deepcopy
from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlsplit

from homeassistant.components.lovelace import LOVELACE_DATA, MODE_YAML
from homeassistant.const import CONF_ID, CONF_URL
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.collection import CHANGE_ADDED, CollectionChange
from homeassistant.helpers.json import prepare_save_json

from .const import (
    DOMAIN,
    LEGACY_CAMERA_EVENTS_MODULE,
    LEGACY_FRONTEND_MODULE,
    LEGACY_VENDOR_RESOURCE_PREFIX,
    MARAO_DASHBOARD_MODULES,
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
    normalize_resource_url(LEGACY_FRONTEND_MODULE.rsplit("/", 1)[0] + "/MaraoCards.js"),
    *(normalize_resource_url(url) for url in MARAO_DASHBOARD_MODULES),
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


@dataclass
class LegacyResourcePlan:
    resources: Any
    path: Path
    before: list[dict]
    after: list[dict]
    content: bytes

    def commit_from_thread(self) -> None:
        run_coroutine_threadsafe(self.commit(), self.resources.hass.loop).result()

    def restore_from_thread(self) -> None:
        run_coroutine_threadsafe(self.restore(), self.resources.hass.loop).result()

    async def restore(self) -> None:
        """Restore owned IDs in memory after the checkpoint restores the file."""
        removed = [item for item in self.before if item not in self.after]
        for item in removed:
            current = self.resources.data.get(item[CONF_ID])
            if current is not None and current != item:
                raise ValueError("A legacy resource changed independently during recovery")
        changes = []
        for item in removed:
            if item[CONF_ID] not in self.resources.data:
                self.resources.data[item[CONF_ID]] = deepcopy(item)
                changes.append(CollectionChange(CHANGE_ADDED, item[CONF_ID], deepcopy(item)))
        ordered = {item[CONF_ID]: self.resources.data[item[CONF_ID]] for item in self.before if item[CONF_ID] in self.resources.data}
        ordered.update(self.resources.data)
        self.resources.data.clear()
        self.resources.data.update(ordered)
        if changes:
            await self.resources.notify_changes(changes)

    async def commit(self) -> None:
        """Finish native collection cleanup before advancing the source version."""
        expected = deepcopy(self.before)
        concurrent = False
        try:
            if self.resources.async_items() != expected:
                concurrent = True
                raise ValueError("Resources changed during dashboard preflight")
            for item in self.before:
                if item in self.after:
                    continue
                await self.resources.async_delete_item(item[CONF_ID])
                expected.remove(item)
                if self.resources.async_items() != expected:
                    concurrent = True
                    raise ValueError("Resources changed during dashboard cleanup")
            await self.resources.store.async_save({"items": self.after})
            if await self.resources.hass.async_add_executor_job(self.path.read_bytes) != self.content:
                raise ValueError("Legacy resource persistence failed")
        except Exception:
            await self.restore()
            # Cancel native delayed writes before filesystem rollback can run.
            await self.resources.store.async_save({"items": self.resources.async_items() if concurrent else self.after})
            raise


async def async_plan_legacy_resources(hass: HomeAssistant) -> LegacyResourcePlan | None:
    """Capture native persisted resources for the bounded dashboard operation."""
    lovelace = hass.data[LOVELACE_DATA]
    resources = lovelace.resources
    await resources.async_get_info()
    before = deepcopy(resources.async_items())
    legacy_items = [item for item in before if isinstance(item, Mapping) and _is_legacy_resource(item.get(CONF_URL))]
    if lovelace.resource_mode == MODE_YAML:
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
        return None
    after = [item for item in before if item not in legacy_items]
    if before == after:
        async_clear_legacy_resource_issue(hass)
        return None
    if any(not item.get(CONF_ID) for item in before if item not in after):
        raise ValueError("A legacy resource has no recoverable identity")
    path = Path(resources.store.path)
    # Flush HA's earlier edits into the baseline; do not remove anything yet.
    persisted = await hass.async_add_executor_job(lambda: json.loads(path.read_bytes()) if path.exists() else None)
    if persisted is None or persisted.get("data", {}).get("items") != before:
        await resources.store.async_save({"items": before})
        persisted = json.loads(await hass.async_add_executor_job(path.read_bytes))
        if persisted.get("data", {}).get("items") != before:
            raise ValueError("Cannot retain the existing resource baseline")
    _, content = prepare_save_json({"version": resources.store.version, "minor_version": resources.store.minor_version,
                                   "key": resources.store.key, "data": {"items": after}})
    return LegacyResourcePlan(resources, path, before, after, content.encode() if isinstance(content, str) else content)


async def async_restore_legacy_resource_cache(hass: HomeAssistant) -> None:
    """Restore owned IDs after startup file recovery without overwriting user edits."""
    resources = hass.data[LOVELACE_DATA].resources
    if not resources.loaded:
        return
    path = Path(resources.store.path)
    before = json.loads(await hass.async_add_executor_job(path.read_bytes))["data"]["items"]
    after = [item for item in before if not _is_legacy_resource(item.get(CONF_URL))]
    await LegacyResourcePlan(resources, path, before, after, b"").restore()
