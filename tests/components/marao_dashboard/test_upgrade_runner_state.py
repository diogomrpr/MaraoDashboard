"""The private release runner restores exact bounded files and refuses drift."""
import json
from pathlib import Path
import uuid

import pytest

from tests.upgrade.installed_state import backup, bounded_path, copy, main, restore, tree


def test_private_backup_restore_checks_exact_files_missing_targets_and_concurrent_edits(tmp_path):
    operation = str(uuid.uuid4())
    source = tmp_path / "dashboard/dashboard.json"; source.parent.mkdir()
    source.write_bytes(b'{"preserve":true}\r\n')
    unknown = tmp_path / "dashboard/raw.bin"; unknown.write_bytes(b"\x00\xff")
    source.chmod(0o640); unknown.chmod(0o644); source.parent.chmod(0o750)
    paths = ["dashboard", "new-owned.yaml"]
    before = backup(tmp_path, operation, paths)
    private = tmp_path / ".marao-upgrade-backups" / operation
    assert not private.stat().st_mode & 0o077
    assert not (private / "files/dashboard/dashboard.json").stat().st_mode & 0o077
    source.write_bytes(b'{"candidate":true}\n')
    added = tmp_path / "new-owned.yaml"; added.write_bytes(b"new\n")
    expected = {key: tree(tmp_path / key) for key in paths}
    source.write_bytes(b'{"concurrent":true}\n')
    with pytest.raises(ValueError, match="Concurrent"):
        restore(tmp_path, operation, expected, [])
    assert source.read_bytes() == b'{"concurrent":true}\n'
    expected = {key: tree(tmp_path / key) for key in paths}
    assert restore(tmp_path, operation, expected, []) == before
    assert source.read_bytes() == b'{"preserve":true}\r\n' and unknown.read_bytes() == b"\x00\xff"
    assert not added.exists()
    assert source.stat().st_mode & 0o777 == 0o640
    assert unknown.stat().st_mode & 0o777 == 0o644
    assert source.parent.stat().st_mode & 0o777 == 0o750
    assert not (private / "modes.json").stat().st_mode & 0o077
    assert main({"root": str(tmp_path), "operation": operation, "mode": "finish"}) == {"verified_cleanup": True}
    assert not (tmp_path / ".marao-upgrade-active.json").exists()
    assert private.exists()


def test_damaged_backup_or_ambiguous_paths_never_replace_original_state(tmp_path):
    operation = str(uuid.uuid4())
    source = tmp_path / "source.json"; source.write_text("original\n")
    backup(tmp_path, operation, ["source.json"])
    (tmp_path / ".marao-upgrade-backups" / operation / "files/source.json").write_text("damaged\n")
    with pytest.raises(ValueError, match="baseline changed"):
        restore(tmp_path, operation, {"source.json": tree(source)}, [])
    assert source.read_text() == "original\n"
    with pytest.raises(ValueError, match="earlier upgrade"):
        backup(tmp_path, str(uuid.uuid4()), ["source.json"])
    for request in [
        {"root": "/", "operation": operation, "mode": "backup", "paths": []},
        {"root": str(tmp_path), "operation": "../other", "mode": "backup", "paths": []},
    ]:
        with pytest.raises(ValueError):
            main(request)
    with pytest.raises(ValueError, match="Unsafe"):
        backup(tmp_path / "other", str(uuid.uuid4()), ["../source.json"])


def test_historical_replay_retains_exact_source_and_raw_manual_content(tmp_path):
    operation = str(uuid.uuid4())
    backup(tmp_path, operation, ["dashboard/MaraoDashboard"])
    source = '{"config_version":1,"name":"Saved","rooms":[]}\r\n'
    request = {"root": str(tmp_path), "operation": operation, "mode": "replay", "source": source, "slug": "saved",
               "output": {"dashboard.yaml": "title: Saved\r\n"}, "protected": {"manual/unrelated.yaml": "Retain\r\n"}}
    main(request)
    root = tmp_path / "dashboard/MaraoDashboard"
    assert (root / "dashboard.json").read_bytes() == source.encode()
    assert (root / "saved/manual/unrelated.yaml").read_bytes() == b"Retain\r\n"


def test_failed_restoration_swap_keeps_installed_files_and_recovery_baseline(tmp_path, monkeypatch):
    source, target = tmp_path / "baseline", tmp_path / "installed"
    source.mkdir(); target.mkdir()
    (source / "saved.json").write_bytes(b"saved\r\n")
    (target / "saved.json").write_bytes(b"candidate\n")
    replace = Path.replace
    def fail_stage(path, destination):
        if ".upgrade-copy-" in path.name:
            raise OSError("Interrupted staged replacement")
        return replace(path, destination)
    monkeypatch.setattr(Path, "replace", fail_stage)
    with pytest.raises(OSError, match="Interrupted"):
        copy(source, target)
    assert (source / "saved.json").read_bytes() == b"saved\r\n"
    assert (target / "saved.json").read_bytes() == b"candidate\n"
    assert sorted(path.name for path in tmp_path.iterdir()) == ["baseline", "installed"]


def test_upgrade_paths_refuse_symlinked_parent_directories(tmp_path):
    outside = tmp_path / "outside"; outside.mkdir()
    root = tmp_path / "config"; root.mkdir()
    (root / "dashboard").symlink_to(outside, target_is_directory=True)
    with pytest.raises(ValueError, match="Symlinked"):
        bounded_path(root, "dashboard/source.json")
    assert not list(outside.iterdir())


def test_invalid_recovery_modes_are_rejected_before_replacing_installed_files(tmp_path):
    operation = str(uuid.uuid4())
    source = tmp_path / "saved.json"; source.write_bytes(b"original")
    backup(tmp_path, operation, ["saved.json"])
    source.write_bytes(b"candidate")
    private = tmp_path / ".marao-upgrade-backups" / operation
    (private / "modes.json").write_text(json.dumps({"saved.json": {"": -1}}))
    with pytest.raises(ValueError, match="recovery mode"):
        restore(tmp_path, operation, {"saved.json": tree(source)}, [])
    assert source.read_bytes() == b"candidate"
