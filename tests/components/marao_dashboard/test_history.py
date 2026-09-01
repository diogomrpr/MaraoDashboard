from __future__ import annotations

import json
from pathlib import Path

import pytest

from custom_components.marao_dashboard.history import (
    list_dashboard_history,
    restore_dashboard_version,
    snapshot_dashboard,
)


def _config(name: str, slug: str) -> dict:
    return {"name": name, "slug": slug, "rooms": []}


def test_snapshot_and_restore_json_and_exact_dashboard_directory(tmp_path: Path) -> None:
    base_dir = tmp_path / "MaraoDashboard"
    config_path = base_dir / "dashboard.json"
    first = _config("First Dashboard", "first")
    config_path.parent.mkdir(parents=True)
    config_path.write_text(json.dumps(first), encoding="utf-8")
    first_dir = base_dir / "first"
    first_dir.mkdir()
    (first_dir / "dashboard.yaml").write_text("title: First\n", encoding="utf-8")
    (first_dir / "manual-card.yaml").write_text("manual card\n", encoding="utf-8")

    version = snapshot_dashboard(config_path, base_dir, first)

    second = _config("Second Dashboard", "second")
    config_path.write_text(json.dumps(second), encoding="utf-8")
    second_dir = base_dir / "second"
    second_dir.mkdir()
    (second_dir / "dashboard.yaml").write_text("title: Second\n", encoding="utf-8")

    restored_config, metadata = restore_dashboard_version(
        config_path, base_dir, version["version"]
    )

    assert restored_config == first
    assert metadata["name"] == "First Dashboard"
    assert json.loads(config_path.read_text(encoding="utf-8")) == first
    assert (first_dir / "dashboard.yaml").read_text(encoding="utf-8") == "title: First\n"
    assert (first_dir / "manual-card.yaml").read_text(encoding="utf-8") == "manual card\n"
    assert not second_dir.exists()


def test_identical_latest_snapshot_is_reused(tmp_path: Path) -> None:
    base_dir = tmp_path / "MaraoDashboard"
    config_path = base_dir / "dashboard.json"
    config = _config("Dashboard", "dashboard")
    config_path.parent.mkdir(parents=True)
    config_path.write_text(json.dumps(config), encoding="utf-8")
    dashboard_dir = base_dir / "dashboard"
    dashboard_dir.mkdir()
    (dashboard_dir / "dashboard.yaml").write_text("title: Dashboard\n", encoding="utf-8")

    first = snapshot_dashboard(config_path, base_dir, config, reason="first")
    second = snapshot_dashboard(config_path, base_dir, config, reason="second")

    assert second["version"] == first["version"]
    assert len(list_dashboard_history(base_dir)) == 1


def test_restore_rejects_invalid_version_path(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="Invalid dashboard history version"):
        restore_dashboard_version(tmp_path / "dashboard.json", tmp_path, "../dashboard")
