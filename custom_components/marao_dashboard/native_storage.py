"""Retain an owned pre-JSON dashboard's native registration and saved data."""
from asyncio import run_coroutine_threadsafe
from copy import deepcopy
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import shutil

import yaml

from homeassistant.components.lovelace import LOVELACE_DATA
from homeassistant.components.lovelace.const import MODE_STORAGE
from homeassistant.helpers.json import prepare_save_json

from .generator import _write_bytes, validate_dashboard_key
from .history import _flush_history_copies, _operation_tree


def _card_types(value):
    if isinstance(value, dict):
        kind = value.get("type")
        return ({kind} if isinstance(kind, str) else set()) | set().union(*(_card_types(child) for child in value.values()))
    if isinstance(value, list):
        return set().union(*(_card_types(child) for child in value))
    return set()


def _old_builder_dashboard(config):
    found = _card_types(config.get("views")) if isinstance(config, dict) else set()
    return (isinstance(config, dict) and isinstance(config.get("views"), list)
            and bool(config["views"]) and isinstance(config["views"][0], dict) and config["views"][0].get("path") == "home"
            and "custom:marao-header-card" in found)


async def async_find_native_dashboard(hass, source=None):
    """Recognize one released builder document; ambiguity is never discovery."""
    if source is not None and "legacy_storage_dashboard" not in source:
        return None
    if LOVELACE_DATA not in hass.data:
        return None
    candidates = []
    for key, dashboard in hass.data[LOVELACE_DATA].dashboards.items():
        if key is None or dashboard.mode != MODE_STORAGE:
            continue
        try:
            # Validate persisted bytes first: HA's storage loader may relocate corrupt data.
            document = await hass.async_add_executor_job(_read_native_document, dashboard)
        except FileNotFoundError:
            if key == "marao-dashboard":
                raise ValueError("The native Marao dashboard data is missing") from None
            continue
        config = document["data"].get("config")
        owned = _old_builder_dashboard(config) or source is not None and key == "marao-dashboard" and isinstance(config, dict) and "custom:marao-navbar-card" in _card_types(config.get("views"))
        if not owned and key == "marao-dashboard":
            raise ValueError("Cannot safely import the existing native Marao dashboard")
        if owned:
            if key != "marao-dashboard":
                raise ValueError("The released native Marao dashboard requires its saved dashboard route")
            validate_dashboard_key(key)
            if await dashboard.async_load(False) != config:
                raise ValueError("Native dashboard changed before migration")
            candidates.append((dashboard, deepcopy(config)))
    if len(candidates) > 1:
        raise ValueError("Multiple native Marao dashboards require explicit recovery; no starter was created")
    if source is not None and not candidates:
        raise ValueError("The saved native Marao dashboard registration is missing")
    return candidates[0] if candidates else None


def _read_native_document(dashboard):
    path = Path(dashboard._store.path)
    if path.is_symlink():
        raise ValueError("Native dashboard storage cannot be a symlink")
    try:
        document = json.loads(path.read_bytes())
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ValueError("Native dashboard storage is invalid; restore its exact backup") from None
    if not isinstance(document, dict) or type(document.get("version")) is not int or document["version"] != dashboard._store.version or type(document.get("minor_version", 1)) is not int or document.get("minor_version", 1) != dashboard._store.minor_version or document.get("key") != dashboard._store.key or not isinstance(document.get("data"), dict):
        raise ValueError("Unsupported native dashboard storage")
    if document.keys() - {"version", "minor_version", "key", "data"}:
        raise ValueError("Unsupported native storage envelope metadata; the saved data was left unchanged")
    return document


def staged_native_dashboard(rendered, installed):
    """Resolve generated includes from staging without reading stale output."""
    rendered, installed = Path(rendered), Path(installed)
    class Loader(yaml.SafeLoader):
        pass
    def load(file):
        return yaml.load(file.read_text(), Loader=Loader)
    def include(loader, node):
        path = Path(loader.construct_scalar(node))
        if not path.is_absolute() or not path.is_relative_to(installed):
            raise ValueError("Native migration requires an owned generated include")
        relative = path.relative_to(installed)
        if ".." in relative.parts:
            raise ValueError("Unsafe generated include")
        return load(rendered / relative)
    Loader.add_constructor("!include", include)
    config = load(rendered / "dashboard.yaml")
    if not isinstance(config, dict) or not isinstance(config.get("views"), list):
        raise ValueError("Native migration produced invalid dashboard output")
    return config


@dataclass
class NativeDashboardPlan:
    dashboard: object
    path: Path
    before: bytes
    data: dict
    after: dict | None = None
    content: bytes | None = None

    @classmethod
    def capture(cls, dashboard, base_dir):
        path = Path(dashboard._store.path)
        if path.is_symlink():
            raise ValueError("Native dashboard storage cannot be a symlink")
        before = path.read_bytes()
        document = _read_native_document(dashboard)
        data = document["data"]
        if data != dashboard._data:
            raise ValueError("Native dashboard changed independently before migration")
        base_dir = Path(base_dir)
        config_root = base_dir.parents[1]
        configuration = config_root / "configuration.yaml"
        theme = config_root / "themes/MaraoDashboard"
        identity = {"native": hashlib.sha256(before).hexdigest(), "configuration": _operation_tree(configuration, False),
                    "theme": _operation_tree(theme, True)}
        backup = base_dir / ".native-backups" / hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
        backup.mkdir(parents=True, exist_ok=True, mode=0o700)
        retained = backup / path.name
        if retained.exists() and retained.read_bytes() != before:
            raise ValueError("Native dashboard recovery copy changed")
        if not retained.exists():
            _write_bytes(retained, before)
        retained.chmod(0o600)
        for file in (configuration,):
            if file.exists() and not (backup / file.name).exists():
                _write_bytes(backup / file.name, file.read_bytes())
                (backup / file.name).chmod(0o600)
        if theme.exists() and not (backup / "theme").exists():
            shutil.copytree(theme, backup / "theme")
            for file in (backup / "theme").rglob("*"):
                file.chmod(0o700 if file.is_dir() else 0o600)
        metadata = backup / "identity.json"
        content = (json.dumps(identity, sort_keys=True) + "\n").encode()
        if metadata.exists() and metadata.read_bytes() != content:
            raise ValueError("Native dashboard recovery identity changed")
        if not metadata.exists():
            _write_bytes(metadata, content)
            metadata.chmod(0o600)
        if _operation_tree(configuration, False) != identity["configuration"] or _operation_tree(theme, True) != identity["theme"] or path.read_bytes() != before:
            raise ValueError("Native owned state changed during backup")
        _flush_history_copies(backup)
        return cls(dashboard, path, before, deepcopy(data))

    def stage(self, config):
        self.after = {**deepcopy(self.data), "config": deepcopy(config)}
        store = self.dashboard._store
        _, content = prepare_save_json({"version": store.version, "minor_version": store.minor_version, "key": store.key, "data": self.after})
        self.content = content.encode() if isinstance(content, str) else content

    def commit_from_thread(self):
        run_coroutine_threadsafe(self.commit(), self.dashboard.hass.loop).result()

    async def commit(self):
        if self.after is None or self.dashboard._data != self.data or self.path.read_bytes() != self.before:
            raise ValueError("Native dashboard changed during preflight")
        await self.dashboard.async_save(self.after["config"])
        if self.path.read_bytes() != self.content:
            raise ValueError("Native dashboard persistence failed")

    def restore_from_thread(self):
        run_coroutine_threadsafe(async_restore_native_cache(self.dashboard), self.dashboard.hass.loop).result()


async def async_restore_native_cache(dashboard):
    document = json.loads(Path(dashboard._store.path).read_bytes())
    dashboard._data = document["data"]
    dashboard._json_config = None
    dashboard._config_updated()
