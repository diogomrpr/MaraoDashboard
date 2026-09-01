"""Filesystem-backed dashboard version history."""

from __future__ import annotations

from datetime import UTC, datetime
import hashlib
import json
from pathlib import Path
import re
import shutil
from typing import Any

from .generator import dashboard_key_for_slug, normalize_config, write_dashboard_config

HISTORY_DIR_NAME = ".history"
MAX_HISTORY_VERSIONS = 20
_VERSION_PATTERN = re.compile(r"^\d{8}T\d{12}Z$")


def snapshot_dashboard(
    config_path: str | Path,
    output_base_dir: str | Path,
    config: dict[str, Any],
    *,
    dashboard_key: str | None = None,
    reason: str = "generation",
) -> dict[str, Any]:
    """Save a restorable copy of a dashboard, unless it matches the latest version."""

    normalized = normalize_config(config)
    base_dir = Path(output_base_dir)
    dashboard_dir = base_dir / normalized["slug"]
    fingerprint = _fingerprint(config, dashboard_dir)
    latest = list_dashboard_history(base_dir)
    if latest and latest[0].get("fingerprint") == fingerprint:
        return latest[0]

    created_at = datetime.now(UTC)
    version = created_at.strftime("%Y%m%dT%H%M%S%fZ")
    version_dir = base_dir / HISTORY_DIR_NAME / version
    version_dir.mkdir(parents=True)
    write_dashboard_config(config, version_dir / "dashboard.json")
    if dashboard_dir.is_dir():
        shutil.copytree(dashboard_dir, version_dir / "dashboard")

    metadata = {
        "version": version,
        "created_at": created_at.isoformat(),
        "name": normalized["name"],
        "slug": normalized["slug"],
        "dashboard_key": dashboard_key or dashboard_key_for_slug(normalized["slug"]),
        "reason": reason,
        "fingerprint": fingerprint,
        "has_dashboard": dashboard_dir.is_dir(),
        "config_filename": Path(config_path).name,
    }
    (version_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    _prune_history(base_dir)
    return metadata


def list_dashboard_history(output_base_dir: str | Path) -> list[dict[str, Any]]:
    """List valid dashboard versions, newest first."""

    history_dir = Path(output_base_dir) / HISTORY_DIR_NAME
    if not history_dir.is_dir():
        return []

    versions = []
    for version_dir in history_dir.iterdir():
        if not version_dir.is_dir() or not _VERSION_PATTERN.fullmatch(version_dir.name):
            continue
        try:
            metadata = json.loads(
                (version_dir / "metadata.json").read_text(encoding="utf-8")
            )
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            continue
        if isinstance(metadata, dict) and metadata.get("version") == version_dir.name:
            versions.append(metadata)
    return sorted(versions, key=lambda item: item["version"], reverse=True)


def restore_dashboard_version(
    config_path: str | Path,
    output_base_dir: str | Path,
    version: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Restore the JSON source and exact generated directory for one version."""

    if not _VERSION_PATTERN.fullmatch(version):
        raise ValueError("Invalid dashboard history version")

    base_dir = Path(output_base_dir)
    version_dir = base_dir / HISTORY_DIR_NAME / version
    try:
        metadata = json.loads((version_dir / "metadata.json").read_text(encoding="utf-8"))
        config = json.loads((version_dir / "dashboard.json").read_text(encoding="utf-8"))
    except FileNotFoundError as err:
        raise ValueError("Dashboard history version not found") from err
    except json.JSONDecodeError as err:
        raise ValueError("Dashboard history version is damaged") from err

    if not isinstance(metadata, dict) or metadata.get("version") != version:
        raise ValueError("Dashboard history metadata is invalid")
    if not isinstance(config, dict):
        raise ValueError("Dashboard history configuration is invalid")

    restored = normalize_config(config)
    current_slug = _current_slug(config_path)
    restored_dir = base_dir / restored["slug"]
    snapshot_dir = version_dir / "dashboard"

    if current_slug and current_slug != restored["slug"]:
        shutil.rmtree(base_dir / current_slug, ignore_errors=True)
    shutil.rmtree(restored_dir, ignore_errors=True)
    if snapshot_dir.is_dir():
        shutil.copytree(snapshot_dir, restored_dir)
    write_dashboard_config(config, config_path)
    return config, metadata


def _current_slug(config_path: str | Path) -> str | None:
    try:
        config = json.loads(Path(config_path).read_text(encoding="utf-8"))
        if isinstance(config, dict):
            return normalize_config(config)["slug"]
    except (FileNotFoundError, json.JSONDecodeError, OSError, ValueError):
        pass
    return None


def _fingerprint(config: dict[str, Any], dashboard_dir: Path) -> str:
    digest = hashlib.sha256(
        json.dumps(config, sort_keys=True, ensure_ascii=False).encode("utf-8")
    )
    if dashboard_dir.is_dir():
        for path in sorted(item for item in dashboard_dir.rglob("*") if item.is_file()):
            digest.update(str(path.relative_to(dashboard_dir)).encode("utf-8"))
            digest.update(path.read_bytes())
    return digest.hexdigest()


def _prune_history(output_base_dir: Path) -> None:
    for metadata in list_dashboard_history(output_base_dir)[MAX_HISTORY_VERSIONS:]:
        shutil.rmtree(
            output_base_dir / HISTORY_DIR_NAME / metadata["version"], ignore_errors=True
        )
