from __future__ import annotations

import json
import os
import stat
from pathlib import Path

import pytest

from custom_components.marao_dashboard.history import (
    list_dashboard_history,
    restore_dashboard_version,
    snapshot_dashboard,
)


def _config(name: str, slug: str) -> dict:
    return {"name": name, "slug": slug, "rooms": []}


def test_restore_route_collision_preflights_before_new_baseline(tmp_path):
    source = tmp_path / "dashboard.json"
    restored = _config("Previous", "previous")
    source.write_text(json.dumps(restored))
    snapshot = snapshot_dashboard(source, tmp_path, restored)
    source.write_text(json.dumps(_config("Current", "current")))
    configuration = tmp_path / "configuration.yaml"
    configuration.write_text("lovelace:\n  dashboards:\n    marao-previous:\n      mode: yaml\n      filename: manual.yaml\n")
    before = {p.relative_to(tmp_path): p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()}
    with pytest.raises(ValueError, match="unrelated configuration"):
        restore_dashboard_version(source, tmp_path, snapshot["version"], configuration_path=configuration)
    assert {p.relative_to(tmp_path): p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()} == before


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


def test_history_preserves_exact_source_bytes_and_distinguishes_formatting(tmp_path: Path) -> None:
    path = tmp_path / "dashboard.json"
    source = '{\r\n "extension": {"label": "Divisão"}, "rooms": [], "name": "Exact", "slug": "exact"\r\n}\r\n'.encode()
    path.write_bytes(source)
    config = json.loads(source)
    first = snapshot_dashboard(path, tmp_path, config)
    archive = tmp_path / ".history" / first["version"] / "dashboard.json"
    assert archive.read_bytes() == source
    path.write_text(json.dumps(config))
    second = snapshot_dashboard(path, tmp_path, config)
    assert second["version"] != first["version"]
    restore_dashboard_version(path, tmp_path, first["version"])
    assert path.read_bytes() == source
    assert archive.read_bytes() == source


def test_snapshot_rejects_concurrently_changed_source_without_writes(tmp_path: Path) -> None:
    path = tmp_path / "dashboard.json"
    path.write_text(json.dumps(_config("Current", "current")))
    with pytest.raises(ValueError, match="source changed"):
        snapshot_dashboard(path, tmp_path, _config("Stale", "stale"))
    assert not (tmp_path / ".history").exists()


@pytest.mark.parametrize("changed", ["source", "output"])
def test_snapshot_does_not_accept_a_copy_made_during_an_independent_edit(tmp_path, monkeypatch, changed):
    from custom_components.marao_dashboard import history
    config = _config("Current", "current")
    source, output = tmp_path / "dashboard.json", tmp_path / "current"
    source.write_text(json.dumps(config))
    output.mkdir()
    (output / "manual.yaml").write_text("before\n")
    copy = history.shutil.copytree
    def edit_during_copy(src, dst, *args, **kwargs):
        result = copy(src, dst, *args, **kwargs)
        if Path(src) == output:
            if changed == "source":
                source.write_text('{"name":"Independent","slug":"current","rooms":[]}')
            else:
                (output / "manual.yaml").write_text("independent\n")
        return result
    monkeypatch.setattr(history.shutil, "copytree", edit_during_copy)
    with pytest.raises(ValueError, match="changed during history snapshot"):
        snapshot_dashboard(source, tmp_path, config)
    assert list_dashboard_history(tmp_path) == []
    if changed == "source":
        assert json.loads(source.read_text())["name"] == "Independent"
    else:
        assert (output / "manual.yaml").read_text() == "independent\n"


@pytest.mark.parametrize("failure", ["output", "patch", "source"])
def test_operation_failure_restores_exact_bytes_at_each_boundary(tmp_path, monkeypatch, failure):
    from custom_components.marao_dashboard import history
    source, output, patch = tmp_path / "dashboard.json", tmp_path / "dashboard", tmp_path / "configuration.yaml"
    source.write_bytes(b'{"name":"Before"}\r\n')
    output.mkdir(); (output / "owned.yaml").write_bytes(b"old\r\n")
    (output / "private.bin").write_bytes(b"\x00\xff")
    patch.write_bytes(b"# unrelated\r\n")
    original = history._write_bytes
    target = {"output": output / "owned.yaml", "patch": patch, "source": source}[failure]
    failed = False
    def inject(path, data):
        nonlocal failed
        if path == target and not failed:
            failed = True
            raise OSError("injected write failure")
        original(path, data)
    monkeypatch.setattr(history, "_write_bytes", inject)
    with pytest.raises(OSError, match="injected"):
        with history.dashboard_operation(tmp_path, source, [output], patch) as stage:
            (stage[output] / "owned.yaml").write_bytes(b"new\n")
            (stage[output] / "new.yaml").write_bytes(b"new file\n")
            stage[patch].write_bytes(b"# new patch\n")
            stage[source].write_bytes(b'{"name":"After"}\n')
    assert source.read_bytes() == b'{"name":"Before"}\r\n'
    assert patch.read_bytes() == b"# unrelated\r\n"
    assert {p.name: p.read_bytes() for p in output.iterdir()} == {"owned.yaml": b"old\r\n", "private.bin": b"\x00\xff"}
    assert not (tmp_path / ".history/.operation").exists()


def test_interrupted_operation_recovers_before_source_version_advances(tmp_path, monkeypatch):
    from custom_components.marao_dashboard import history
    source, output = tmp_path / "dashboard.json", tmp_path / "dashboard"
    source.write_bytes(b'{"config_version":0}\r\n')
    output.mkdir(); (output / "owned.yaml").write_bytes(b"old\n")
    original = history._write_bytes
    def interrupt(path, data):
        if path == source:
            raise SystemExit("process interruption")
        original(path, data)
    monkeypatch.setattr(history, "_write_bytes", interrupt)
    with pytest.raises(SystemExit):
        with history.dashboard_operation(tmp_path, source, [output]) as stage:
            (stage[output] / "owned.yaml").write_bytes(b"new\n")
            stage[source].write_bytes(b'{"config_version":1}\n')
    assert (output / "owned.yaml").read_bytes() == b"new\n"
    assert source.read_bytes() == b'{"config_version":0}\r\n'
    monkeypatch.setattr(history, "_write_bytes", original)
    history.recover_dashboard_operation(tmp_path)
    assert (output / "owned.yaml").read_bytes() == b"old\n"
    assert not (tmp_path / ".history/.operation").exists()


def test_recovery_keeps_private_baseline_and_does_not_clobber_independent_edit(tmp_path, monkeypatch):
    from custom_components.marao_dashboard import history
    source, output, patch = tmp_path / "dashboard.json", tmp_path / "dashboard", tmp_path / "configuration.yaml"
    source.write_bytes(b'{"name":"Before"}')
    output.mkdir(); (output / "owned.yaml").write_bytes(b"old\n")
    patch.write_bytes(b"# baseline\n")
    original = history._write_bytes
    def interrupt(path, data):
        if path == source:
            raise SystemExit()
        original(path, data)
    monkeypatch.setattr(history, "_write_bytes", interrupt)
    with pytest.raises(SystemExit):
        with history.dashboard_operation(tmp_path, source, [output], patch) as stage:
            (stage[output] / "owned.yaml").write_bytes(b"new\n")
            stage[patch].write_bytes(b"# operation\n")
            stage[source].write_bytes(b'{"name":"After"}')
    patch.write_bytes(b"# independent user edit\n")
    monkeypatch.setattr(history, "_write_bytes", original)
    with pytest.raises(ValueError, match="private copies remain"):
        history.recover_dashboard_operation(tmp_path)
    assert patch.read_bytes() == b"# independent user edit\n"
    assert (output / "owned.yaml").read_bytes() == b"new\n", "Preflight must protect every target before undoing any file"
    assert (tmp_path / ".history/.operation/before/1").read_bytes() == b"# baseline\n"


def test_preflight_exception_and_concurrent_edit_leave_active_data_untouched(tmp_path):
    from custom_components.marao_dashboard import history
    source, output = tmp_path / "dashboard.json", tmp_path / "dashboard"
    source.write_text('{"name":"Before"}')
    with pytest.raises(ValueError, match="protected custom"):
        with history.dashboard_operation(tmp_path, source, [output]):
            raise ValueError("protected custom region")
    assert not output.exists()
    assert not (tmp_path / ".history/.operation").exists()
    with pytest.raises(ValueError, match="changed during preflight"):
        with history.dashboard_operation(tmp_path, source, [output]) as stage:
            stage[source].write_text('{"name":"Candidate"}')
            source.write_text('{"name":"Independent"}')
    assert source.read_text() == '{"name":"Independent"}'
    assert not (tmp_path / ".history/.operation").exists()


def test_operation_commits_output_patch_and_source_in_order(tmp_path, monkeypatch):
    from custom_components.marao_dashboard import history
    source, output, patch = tmp_path / "dashboard.json", tmp_path / "dashboard", tmp_path / "configuration.yaml"
    original = history._write_bytes
    writes = []
    def record(path, data):
        if path in (output / "owned.yaml", patch, source):
            writes.append(path)
        original(path, data)
    monkeypatch.setattr(history, "_write_bytes", record)
    with history.dashboard_operation(tmp_path, source, [output], patch) as stage:
        stage[output].mkdir(parents=True)
        (stage[output] / "owned.yaml").write_text("new\n")
        stage[patch].parent.mkdir(parents=True, exist_ok=True)
        stage[patch].write_text("# patch\n")
        stage[source].write_text('{"config_version":0}')
    assert writes == [output / "owned.yaml", patch, source]
    assert not (tmp_path / ".history/.operation").exists()


def test_checkpoint_follows_flushed_copies_and_private_directories(tmp_path, monkeypatch):
    from custom_components.marao_dashboard import history
    source, output = tmp_path / "dashboard.json", tmp_path / "dashboard"
    source.write_text('{"name":"Before"}')
    (output / "nested").mkdir(parents=True)
    (output / "nested" / "owned.yaml").write_bytes(b"before\r\n")
    flushed = set()
    sync, write = os.fsync, history._write_text
    def record(fd):
        identity = os.fstat(fd)
        flushed.add((identity.st_dev, identity.st_ino))
        sync(fd)
    def checkpoint(path, data):
        if path.name == "operation.json":
            root = path.parent
            for saved in [root.parent, root, *root.rglob("*")]:
                identity = saved.stat()
                assert (identity.st_dev, identity.st_ino) in flushed, f"Unflushed recovery path: {saved.name}"
            assert stat.S_IMODE(root.stat().st_mode) == 0o700
            assert stat.S_IMODE(root.parent.stat().st_mode) == 0o700
        write(path, data)
    monkeypatch.setattr(os, "fsync", record)
    monkeypatch.setattr(history, "_write_text", checkpoint)
    with history.dashboard_operation(tmp_path, source, [output]) as stage:
        (stage[output] / "nested" / "owned.yaml").write_bytes(b"after\n")
        stage[source].write_text('{"name":"After"}')
    assert source.read_text() == '{"name":"After"}'
    assert not (tmp_path / ".history/.operation").exists()


def test_retained_copy_flush_failure_leaves_active_source_and_output_untouched(tmp_path, monkeypatch):
    from custom_components.marao_dashboard import history
    source, output = tmp_path / "dashboard.json", tmp_path / "dashboard"
    source.write_bytes(b'{"name":"Before"}\r\n')
    output.mkdir()
    (output / "owned.yaml").write_bytes(b"before\r\n")
    def fail(_):
        raise OSError("retained-copy flush failed")
    monkeypatch.setattr(history, "_flush_history_copies", fail)
    with pytest.raises(OSError, match="retained-copy flush failed"):
        with history.dashboard_operation(tmp_path, source, [output]) as stage:
            (stage[output] / "owned.yaml").write_bytes(b"after\n")
            stage[source].write_text('{"name":"After"}')
    assert source.read_bytes() == b'{"name":"Before"}\r\n'
    assert (output / "owned.yaml").read_bytes() == b"before\r\n"
    assert not (tmp_path / ".history/.operation").exists()


@pytest.mark.parametrize("target", ["source", "output"])
def test_snapshot_rejects_symlinks_before_creating_history(tmp_path, target):
    config = _config("Dashboard", "dashboard")
    source = tmp_path / "dashboard.json"
    source.write_text(json.dumps(config))
    output = tmp_path / "dashboard"
    output.mkdir()
    saved = tmp_path / "manual.yaml"
    saved.write_text("exact unrelated bytes\n")
    if target == "source":
        original = source.rename(tmp_path / "saved.json")
        source.symlink_to(original)
    else:
        (output / "linked.yaml").symlink_to(saved)
    with pytest.raises(ValueError, match="symlinked"):
        snapshot_dashboard(source, tmp_path, config)
    assert not (tmp_path / ".history").exists()
    assert saved.read_text() == "exact unrelated bytes\n"


@pytest.mark.parametrize("damage", ["source", "output", "future_format", "future_contract", "old_cards"])
def test_history_compatibility_rejects_before_active_replacement(tmp_path, damage):
    from custom_components.marao_dashboard import history
    from custom_components.marao_dashboard.generator import write_dashboard
    source = tmp_path / "dashboard.json"
    config = _config("Before", "before")
    source.write_text(json.dumps(config))
    write_dashboard(config, tmp_path)
    archived = snapshot_dashboard(source, tmp_path, config)
    archive = tmp_path / ".history" / archived["version"]
    if damage in ("source", "future_format"):
        old = json.loads((archive / "dashboard.json").read_text())
        old["name"] = "Changed"
        if damage == "future_format": old["config_version"] = 999
        (archive / "dashboard.json").write_text(json.dumps(old))
    elif damage == "future_contract":
        manifest = archive / "dashboard/.marao-generated.json"
        value = json.loads(manifest.read_text()); value["generated_contract"] = 999
        manifest.write_text(json.dumps(value))
    else:
        (archive / "dashboard/dashboard.yaml").write_text("type: custom:button-card\n" if damage == "old_cards" else "damaged\n")
    before = {str(p.relative_to(tmp_path)): p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()}
    with pytest.raises(ValueError):
        restore_dashboard_version(source, tmp_path, archived["version"])
    assert {str(p.relative_to(tmp_path)): p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()} == before


def test_restore_keeps_selected_oldest_archive_during_baseline_pruning(tmp_path, monkeypatch):
    from custom_components.marao_dashboard import history
    source = tmp_path / "dashboard.json"
    first = _config("First", "dashboard"); source.write_text(json.dumps(first))
    version = snapshot_dashboard(source, tmp_path, first)
    monkeypatch.setattr(history, "MAX_HISTORY_VERSIONS", 1)
    source.write_text(json.dumps(_config("Current", "dashboard")))
    restored, _ = restore_dashboard_version(source, tmp_path, version["version"])
    assert restored == first
    assert (tmp_path / ".history" / version["version"] / "dashboard.json").exists()


def test_failed_rollback_retains_recovery_data_and_reports_failure(tmp_path, monkeypatch):
    from custom_components.marao_dashboard import history
    source, output, patch = tmp_path / "dashboard.json", tmp_path / "dashboard", tmp_path / "configuration.yaml"
    source.write_text('{"name":"Before"}')
    output.mkdir(); (output / "owned.yaml").write_text("old\n")
    patch.write_text("# baseline\n")
    original = history._write_bytes
    def fail(path, data):
        if path == patch or (path == output / "owned.yaml" and data == b"old\n"):
            raise OSError("write/rollback failure")
        original(path, data)
    monkeypatch.setattr(history, "_write_bytes", fail)
    with pytest.raises(ValueError, match="recovery failed"):
        with history.dashboard_operation(tmp_path, source, [output], patch) as stage:
            (stage[output] / "owned.yaml").write_text("new\n")
            stage[patch].write_text("# new patch\n")
            stage[source].write_text('{"name":"After"}')
    assert (output / "owned.yaml").read_text() == "new\n"
    assert source.read_text() == '{"name":"Before"}'
    assert (tmp_path / ".history/.operation/before/0/owned.yaml").read_text() == "old\n"
    monkeypatch.setattr(history, "_write_bytes", original)
    history.recover_dashboard_operation(tmp_path)
    assert (output / "owned.yaml").read_text() == "old\n"


@pytest.mark.parametrize("duplicate", [True, False])
def test_operation_rejects_duplicate_or_unbounded_targets_before_staging(tmp_path, duplicate):
    from custom_components.marao_dashboard import history
    source = tmp_path / "dashboard.json"
    source.write_bytes(b'{"name":"Before"}\r\n')
    owned = (source,) if duplicate else tuple(tmp_path / f"extra-{index}.json" for index in range(6))
    with pytest.raises(ValueError, match="Invalid dashboard operation targets"):
        with history.dashboard_operation(tmp_path, source, [], owned_files=owned):
            pytest.fail("Invalid operation reached its mutation body")
    assert source.read_bytes() == b'{"name":"Before"}\r\n'
    assert not (tmp_path / ".history").exists()


def test_interruption_after_source_commit_rolls_back_on_restart(tmp_path, monkeypatch):
    from custom_components.marao_dashboard import history
    source = tmp_path / "dashboard.json"; source.write_bytes(b'{"name":"Before"}\r\n')
    original = history._write_text
    def interrupt(path, text):
        if path.name == "operation.json" and json.loads(text)["phase"] == "committed":
            raise SystemExit()
        original(path, text)
    monkeypatch.setattr(history, "_write_text", interrupt)
    with pytest.raises(SystemExit):
        with history.dashboard_operation(tmp_path, source, []) as stage:
            stage[source].write_text('{"name":"After"}')
    assert source.read_text() == '{"name":"After"}'
    history.recover_dashboard_operation(tmp_path)
    assert source.read_bytes() == b'{"name":"Before"}\r\n'


def test_alternate_source_inside_output_is_still_committed_last(tmp_path, monkeypatch):
    from custom_components.marao_dashboard import history
    output = tmp_path / "dashboard"; output.mkdir()
    source = output / "alternate.json"; source.write_text('{"name":"Before"}')
    (output / "owned.yaml").write_text("old\n")
    writes = []; original = history._write_bytes
    def record(path, data):
        if path in (source, output / "owned.yaml"): writes.append(path)
        original(path, data)
    monkeypatch.setattr(history, "_write_bytes", record)
    with history.dashboard_operation(tmp_path, source, [output]) as stage:
        (stage[output] / "owned.yaml").write_text("new\n")
        stage[source].write_text('{"name":"After"}')
    assert writes == [output / "owned.yaml", source]
    assert source.read_text() == '{"name":"After"}'
    assert not (tmp_path / ".history/.operation").exists()
