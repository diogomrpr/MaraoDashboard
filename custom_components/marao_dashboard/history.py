"""Filesystem-backed dashboard version history."""

from __future__ import annotations

from datetime import UTC, datetime
from contextlib import contextmanager
from collections.abc import Callable
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
from threading import RLock
from typing import Any

from .generator import (_fsync_directory, _load_generation_manifest, _supports_native_card_output, _write_bytes, _write_text, dashboard_identity,
                        dashboard_key_for_slug, load_dashboard_config, normalize_config)
from .config_patch import patch_lovelace_dashboard, registered_dashboard_key, validate_dashboard_registration

HISTORY_DIR_NAME = ".history"
MAX_HISTORY_VERSIONS = 20
_VERSION_PATTERN = re.compile(r"^\d{8}T\d{12}Z$")
DASHBOARD_WRITE_LOCK = RLock()
OPERATION_DIR_NAME = ".operation"
RECOVERY_ERROR = (
    "Dashboard recovery failed; exact private copies remain in .history/.operation. "
    "Resolve the reported file conflict before retrying."
)


def _make_history_directory(path: Path) -> None:
    if path.is_symlink() or any(parent.is_symlink() for parent in path.parents):
        raise ValueError("Dashboard history does not use symlinked directories")
    missing = []
    parent = path
    while not parent.exists():
        missing.append(parent)
        parent = parent.parent
    path.mkdir(parents=True, mode=0o700, exist_ok=True)
    path.chmod(0o700)
    for directory in dict.fromkeys([path, *(parent.parent for parent in missing)]):
        _fsync_directory(directory)


def _flush_history_copies(root: Path) -> None:
    for path in root.rglob("*"):
        if path.is_file():
            with path.open("rb") as stream:
                os.fsync(stream.fileno())
    for directory in sorted((path for path in root.rglob("*") if path.is_dir()),
                            key=lambda path: len(path.parts), reverse=True):
        _fsync_directory(directory)
    _fsync_directory(root)


def _operation_tree(path: Path, directory: bool, excluded: tuple[str, ...] | list[str] = ()) -> dict[str, str]:
    if path.is_symlink() or any(parent.is_symlink() for parent in path.parents):
        raise ValueError("Dashboard recovery does not replace symlinked paths")
    if not path.exists():
        return {}
    if path.is_dir() != directory:
        raise ValueError("Dashboard recovery target changed between file and directory")
    paths = sorted(path.rglob("*")) if directory else [path]
    result = {}
    for item in paths:
        if item.is_symlink():
            raise ValueError("Dashboard recovery does not replace symlinked files")
        if item.is_file():
            key = item.relative_to(path).as_posix() if directory else "source"
            if key not in excluded:
                result[key] = hashlib.sha256(item.read_bytes()).hexdigest()
    return result


def _operation_file(root: Path, relative: str, directory: bool) -> Path:
    path = Path(relative)
    if path.is_absolute() or ".." in path.parts or not path.parts:
        raise ValueError("Invalid dashboard recovery file")
    if not directory and relative != "source":
        raise ValueError("Invalid dashboard recovery source")
    return root / path if directory else root


def _apply_operation_target(checkpoint: Path, target: dict, restoring: bool) -> None:
    path, directory = Path(target["path"]), target["directory"]
    wanted, other = ("before", "after") if restoring else ("after", "before")
    current = _operation_tree(path, directory, target.get("excluded", []))
    for relative in sorted(target["before"].keys() | target["after"].keys()):
        expected, old = target[wanted].get(relative), target[other].get(relative)
        if expected == old:
            continue
        if current.get(relative) not in (expected, old):
            raise ValueError("Dashboard recovery stopped: an affected file was changed independently")
        destination = _operation_file(path, relative, directory)
        # Check again immediately before replacement; never undo a later user edit.
        actual = hashlib.sha256(destination.read_bytes()).hexdigest() if destination.exists() else None
        if actual not in (expected, old):
            raise ValueError("Dashboard recovery stopped: an affected file was changed independently")
        if expected is None:
            destination.unlink(missing_ok=True)
            if destination.parent.exists():
                _fsync_directory(destination.parent)
        else:
            saved = _operation_file(checkpoint / wanted / str(target["index"]), relative, directory)
            content = saved.read_bytes()
            if hashlib.sha256(content).hexdigest() != expected:
                raise ValueError("Dashboard recovery copy is damaged")
            _write_bytes(destination, content)
    if directory and target[wanted + "_exists"]:
        saved_root = checkpoint / wanted / str(target["index"])
        path.mkdir(parents=True, exist_ok=True)
        _fsync_directory(path.parent)
        for child in saved_root.rglob("*"):
            if child.is_dir():
                created = path / child.relative_to(saved_root)
                created.mkdir(parents=True, exist_ok=True)
                _fsync_directory(created.parent)
    if directory and path.exists():
        saved_root = checkpoint / wanted / str(target["index"])
        other_root = checkpoint / other / str(target["index"])
        for child in sorted(path.rglob("*"), reverse=True):
            relative = child.relative_to(path)
            if child.is_dir() and (other_root / relative).is_dir() and not (saved_root / relative).exists():
                child.rmdir()
                _fsync_directory(child.parent)
        if not target[wanted + "_exists"] and not any(path.iterdir()):
            path.rmdir()
            _fsync_directory(path.parent)


def recover_dashboard_operation(output_base_dir: str | Path, restore_callback: Callable[[], None] | None = None) -> None:
    """Recover the exact bounded baseline before accepting another operation."""
    with DASHBOARD_WRITE_LOCK:
        checkpoint = Path(output_base_dir) / HISTORY_DIR_NAME / OPERATION_DIR_NAME
        if not checkpoint.exists():
            return
        manifest_path = checkpoint / "operation.json"
        if not manifest_path.exists():
            shutil.rmtree(checkpoint)
            _fsync_directory(checkpoint.parent)
            return
        try:
            operation = json.loads(manifest_path.read_text(encoding="utf-8"))
            if operation.get("version") != 1 or operation.get("phase") not in ("prepared", "committed"):
                raise ValueError("Invalid dashboard recovery checkpoint")
            targets = operation["targets"]
            if not isinstance(targets, list) or not 1 <= len(targets) <= 6:
                raise ValueError("Invalid dashboard recovery targets")
            # Validate all identities before restoring even the first file.
            for index, target in enumerate(targets):
                if (not isinstance(target, dict) or target.get("index") != index
                        or not isinstance(target.get("path"), str) or not Path(target["path"]).is_absolute()
                        or type(target.get("directory")) is not bool):
                    raise ValueError("Invalid dashboard recovery target")
                excluded = target.get("excluded", [])
                if not isinstance(excluded, list) or any(not isinstance(item, str) for item in excluded):
                    raise ValueError("Invalid dashboard recovery exclusions")
                for item in excluded:
                    _operation_file(Path(target["path"]), item, target["directory"])
                for side in ("before", "after"):
                    if not isinstance(target.get(side), dict) or type(target.get(side + "_exists")) is not bool:
                        raise ValueError("Invalid dashboard recovery identity")
                    for relative, digest in target[side].items():
                        if not isinstance(relative, str) or not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
                            raise ValueError("Invalid dashboard recovery identity")
                        saved = _operation_file(checkpoint / side / str(index), relative, target["directory"])
                        if hashlib.sha256(saved.read_bytes()).hexdigest() != digest:
                            raise ValueError("Dashboard recovery copy is damaged")
                current = _operation_tree(Path(target["path"]), target["directory"], excluded)
                for relative in target["before"].keys() | target["after"].keys():
                    before, after = target["before"].get(relative), target["after"].get(relative)
                    if before != after and current.get(relative) not in (before, after):
                        raise ValueError("Dashboard recovery stopped: an affected file was changed independently")
            if operation["phase"] == "prepared":
                for target in reversed(targets):
                    _apply_operation_target(checkpoint, target, restoring=True)
                if restore_callback is not None:
                    restore_callback()
            else:
                for target in targets:
                    if _operation_tree(Path(target["path"]), target["directory"], target.get("excluded", [])) != target["after"]:
                        raise ValueError("Completed dashboard operation changed before cleanup")
            shutil.rmtree(checkpoint)
            _fsync_directory(checkpoint.parent)
        except Exception as err:
            raise ValueError(RECOVERY_ERROR) from err


@contextmanager
def dashboard_operation(
    output_base_dir: str | Path,
    config_path: str | Path,
    dashboard_dirs: list[Path],
    configuration_path: str | Path | None = None,
    *,
    baseline_version: str | None = None,
    owned_files: tuple[Path, ...] = (),
    before_source_commit: Callable[[], None] | None = None,
    restore_callback: Callable[[], None] | None = None,
):
    """Stage owned output/patches, then commit the source last with recovery."""
    with DASHBOARD_WRITE_LOCK:
        recover_dashboard_operation(output_base_dir)
        checkpoint = Path(output_base_dir) / HISTORY_DIR_NAME / OPERATION_DIR_NAME
        targets = [(Path(path), True) for path in dict.fromkeys(dashboard_dirs)]
        if configuration_path is not None:
            targets.append((Path(configuration_path), False))
        targets.extend((Path(path), False) for path in owned_files)
        targets.append((Path(config_path), False))
        if len(targets) > 6 or len({path.absolute() for path, _ in targets}) != len(targets):
            raise ValueError("Invalid dashboard operation targets")
        _make_history_directory(checkpoint.parent)
        _make_history_directory(checkpoint)
        staged = {}
        records = []
        try:
            for index, (path, directory) in enumerate(targets):
                excluded = [file.relative_to(path).as_posix() for file, is_dir in targets
                            if directory and not is_dir and file.is_relative_to(path)]
                tree = _operation_tree(path, directory, excluded)
                before, after = (checkpoint / side / str(index) for side in ("before", "after"))
                if path.exists():
                    if directory:
                        shutil.copytree(path, before)
                        shutil.copytree(path, after)
                    else:
                        _write_bytes(before, path.read_bytes())
                        _write_bytes(after, path.read_bytes())
                staged[path] = after
                records.append({"index": index, "path": str(path.absolute()), "directory": directory, "excluded": excluded,
                                "before": tree, "before_exists": path.exists()})
            yield staged
            for target in records:
                stage = checkpoint / "after" / str(target["index"])
                target["after"] = _operation_tree(stage, target["directory"], target["excluded"])
                target["after_exists"] = stage.exists()
                if (_operation_tree(Path(target["path"]), target["directory"], target["excluded"]) != target["before"]
                        or Path(target["path"]).exists() != target["before_exists"]):
                    raise ValueError("Dashboard files changed during preflight")
            # Copied files and nested directory entries must precede the checkpoint.
            _flush_history_copies(checkpoint)
            operation = {"version": 1, "phase": "prepared", "baseline_version": baseline_version, "targets": records}
            _write_text(checkpoint / "operation.json", json.dumps(operation))
            try:
                for index, target in enumerate(records):
                    # Native collections must prove persistence before their file and source commit.
                    if index == len(records) - len(owned_files) - 1 and before_source_commit is not None:
                        before_source_commit()
                    _apply_operation_target(checkpoint, target, restoring=False)
                operation["phase"] = "committed"
                _write_text(checkpoint / "operation.json", json.dumps(operation))
            except Exception:
                recover_dashboard_operation(output_base_dir, restore_callback)
                raise
            shutil.rmtree(checkpoint)
            _fsync_directory(checkpoint.parent)
        except BaseException:
            if not (checkpoint / "operation.json").exists() and checkpoint.exists():
                shutil.rmtree(checkpoint)
                _fsync_directory(checkpoint.parent)
            raise


def snapshot_dashboard(
    config_path: str | Path,
    output_base_dir: str | Path,
    config: dict[str, Any],
    *,
    dashboard_key: str | None = None,
    reason: str = "generation",
    retained_version: str | None = None,
) -> dict[str, Any]:
    """Save a restorable copy of a dashboard, unless it matches the latest version."""

    with DASHBOARD_WRITE_LOCK:
        normalized = normalize_config(config)
        base_dir = Path(output_base_dir)
        dashboard_dir = base_dir / normalized["slug"]
        source_path = Path(config_path)
        original_source = _operation_tree(source_path, False)
        original_output = _operation_tree(dashboard_dir, True)
        source = source_path.read_bytes().decode("utf-8") if source_path.exists() else json.dumps(config, indent=2, ensure_ascii=False) + "\n"
        if json.loads(source) != config:
            raise ValueError("Dashboard source changed before history snapshot")
        fingerprint = _fingerprint(source.encode("utf-8"), dashboard_dir)
        latest = list_dashboard_history(base_dir)
        if latest and latest[0].get("fingerprint") == fingerprint:
            return latest[0]

        created_at = datetime.now(UTC)
        version = created_at.strftime("%Y%m%dT%H%M%S%fZ")
        version_dir = base_dir / HISTORY_DIR_NAME / version
        _make_history_directory(version_dir.parent)
        _make_history_directory(version_dir)
        _write_text(version_dir / "dashboard.json", source)
        if dashboard_dir.is_dir():
            shutil.copytree(dashboard_dir, version_dir / "dashboard")
        if (_operation_tree(source_path, False) != original_source
                or _operation_tree(dashboard_dir, True) != original_output
                or _fingerprint(source.encode("utf-8"), version_dir / "dashboard") != fingerprint):
            raise ValueError("Dashboard changed during history snapshot; active files were not replaced")

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
        _flush_history_copies(version_dir)
        _write_text(version_dir / "metadata.json", json.dumps(metadata, indent=2, ensure_ascii=False) + "\n")
        _prune_history(base_dir, retained_version)
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


def read_dashboard_version(output_base_dir: str | Path, version: str) -> tuple[dict, dict, bytes]:
    """Preflight immutable history before preserving or replacing active data."""
    if not _VERSION_PATTERN.fullmatch(version):
        raise ValueError("Invalid dashboard history version")

    base_dir = Path(output_base_dir)
    version_dir = base_dir / HISTORY_DIR_NAME / version
    try:
        metadata = json.loads((version_dir / "metadata.json").read_text(encoding="utf-8"))
        source = (version_dir / "dashboard.json").read_bytes().decode("utf-8")
        config = json.loads(source)
    except FileNotFoundError as err:
        raise ValueError("Dashboard history version not found") from err
    except json.JSONDecodeError as err:
        raise ValueError("Dashboard history version is damaged") from err

    if not isinstance(metadata, dict) or metadata.get("version") != version:
        raise ValueError("Dashboard history metadata is invalid")
    if not isinstance(config, dict):
        raise ValueError("Dashboard history configuration is invalid")

    normalized = normalize_config(config)
    if metadata.get("slug") != normalized["slug"] or type(metadata.get("has_dashboard")) is not bool:
        raise ValueError("Dashboard history metadata is invalid")
    dashboard_identity(config, metadata.get("dashboard_key"))
    snapshot_dir = version_dir / "dashboard"
    _operation_tree(snapshot_dir, True)
    _load_generation_manifest(snapshot_dir)
    if metadata.get("fingerprint") != _fingerprint(source.encode("utf-8"), snapshot_dir):
        raise ValueError("Dashboard history copy is damaged")
    for path in [] if _supports_native_card_output(snapshot_dir) else snapshot_dir.rglob("*.yaml"):
        text = path.read_text(encoding="utf-8")
        if any(marker in text for marker in ("custom:button-card", "custom:bubble-card", "custom:navbar-card")):
            raise ValueError("Historical generated cards need conversion; restore the matching package and data backup")
    return config, metadata, source.encode("utf-8")


def restore_dashboard_version(
    config_path: str | Path,
    output_base_dir: str | Path,
    version: str,
    *,
    configuration_path: str | Path | None = None,
    previous_dashboard_key: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Restore exact compatible source/output and its owned registration together."""
    with DASHBOARD_WRITE_LOCK:
        recover_dashboard_operation(output_base_dir)
        config, metadata, source = read_dashboard_version(output_base_dir, version)
        base_dir, config_path = Path(output_base_dir), Path(config_path)
        restored = normalize_config(config)
        restored_dir = base_dir / restored["slug"]
        snapshot_dir = base_dir / HISTORY_DIR_NAME / version / "dashboard"
        directories = [restored_dir]
        baseline = None
        previous_filename = None
        if config_path.exists():
            current = load_dashboard_config(config_path)
            current_identity = dashboard_identity(current)
            if configuration_path is not None:
                current_identity = dashboard_identity(current, registered_dashboard_key(configuration_path, current_identity.filename))
            previous_dashboard_key = previous_dashboard_key or current_identity.dashboard_key
            previous_filename = current_identity.filename
        if configuration_path is not None:
            planned = dashboard_identity(config, metadata.get("dashboard_key"))
            validate_dashboard_registration(configuration_path, planned.dashboard_key, planned.filename,
                                            previous_dashboard_key, previous_filename)
        if config_path.exists():
            baseline = snapshot_dashboard(config_path, base_dir, current, dashboard_key=current_identity.dashboard_key, reason="before restore", retained_version=version)
            directories.append(base_dir / current_identity.slug)
        with dashboard_operation(
            base_dir, config_path, directories, configuration_path,
            baseline_version=baseline["version"] if baseline else None,
        ) as stage:
            for directory in dict.fromkeys(directories):
                if stage[directory].exists():
                    shutil.rmtree(stage[directory])
            if snapshot_dir.is_dir():
                shutil.copytree(snapshot_dir, stage[restored_dir])
            _write_bytes(stage[config_path], source)
            if configuration_path is not None:
                planned = dashboard_identity(config)
                patch = patch_lovelace_dashboard(
                    stage[Path(configuration_path)], metadata.get("dashboard_key") or planned.dashboard_key,
                    planned.title, planned.icon, planned.filename,
                    previous_dashboard_key=previous_dashboard_key,
                    previous_filename=previous_filename,
                )
                metadata["config_changed"] = patch.changed
        return config, metadata


def _fingerprint(source: bytes, dashboard_dir: Path) -> str:
    digest = hashlib.sha256(source)
    if dashboard_dir.is_dir():
        for path in sorted(item for item in dashboard_dir.rglob("*") if item.is_file()):
            digest.update(str(path.relative_to(dashboard_dir)).encode("utf-8"))
            digest.update(path.read_bytes())
    return digest.hexdigest()


def _prune_history(output_base_dir: Path, retained_version: str | None = None) -> None:
    checkpoint = output_base_dir / HISTORY_DIR_NAME / OPERATION_DIR_NAME / "operation.json"
    pinned = json.loads(checkpoint.read_text()).get("baseline_version") if checkpoint.exists() else None
    for metadata in list_dashboard_history(output_base_dir)[MAX_HISTORY_VERSIONS:]:
        if metadata["version"] in (pinned, retained_version):
            continue
        shutil.rmtree(
            output_base_dir / HISTORY_DIR_NAME / metadata["version"], ignore_errors=True
        )
