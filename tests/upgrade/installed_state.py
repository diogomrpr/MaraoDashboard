"""Private, bounded disposable-state backup and historical replay for release tests."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import uuid


def digest(data):
    return hashlib.sha256(data).hexdigest()


def tree(path):
    if path.is_symlink():
        raise ValueError("Symlinked upgrade state")
    if not path.exists():
        return None
    if path.is_file():
        return {"": digest(path.read_bytes())}
    result = {}
    for file in sorted(path.rglob("*")):
        if file.is_symlink():
            raise ValueError("Symlinked upgrade state")
        if file.is_file() and "__pycache__" not in file.parts and file.suffix not in (".pyc", ".pyo"):
            result[file.relative_to(path).as_posix()] = digest(file.read_bytes())
    return result


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    staged = path.with_name(path.name + ".upgrade-stage")
    with staged.open("wb") as stream:
        os.chmod(staged, 0o600)
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    staged.replace(path)


def json_write(path, value):
    write(path, (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode())


def remove(path):
    if path.is_dir() and not path.is_symlink():
        shutil.rmtree(path)
    elif path.exists() or path.is_symlink():
        path.unlink()


def copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    staged = target.with_name(target.name + ".upgrade-copy-" + str(uuid.uuid4()))
    previous = target.with_name(target.name + ".upgrade-previous-" + str(uuid.uuid4()))
    try:
        if source.is_dir():
            shutil.copytree(source, staged, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo"))
        elif source.exists():
            shutil.copy2(source, staged)
        if target.is_dir():
            target.replace(previous)
        if staged.exists():
            staged.replace(target)
        else:
            remove(target)
    except BaseException:
        if previous.exists():
            previous.replace(target)
        raise
    finally:
        remove(staged)
    remove(previous)


def bounded_path(root, relative):
    path = Path(relative)
    if path.is_absolute() or not path.parts or ".." in path.parts:
        raise ValueError("Unsafe upgrade path")
    result = root / path
    if any(parent.is_symlink() for parent in (result, *result.parents) if parent == root or root in parent.parents):
        raise ValueError("Symlinked upgrade state")
    return result


def backup(root, operation, paths):
    marker = root / ".marao-upgrade-active.json"
    if marker.exists() or marker.is_symlink():
        raise ValueError("An earlier upgrade operation needs recovery")
    destination = root / ".marao-upgrade-backups" / operation
    destination.mkdir(parents=True, mode=0o700)
    os.chmod(destination.parent, 0o700)
    baseline = {}
    modes = {}
    for relative in paths:
        source = bounded_path(root, relative)
        baseline[relative] = tree(source)
        if baseline[relative] is not None:
            modes[relative] = {"": source.stat().st_mode & 0o777}
            if source.is_dir():
                modes[relative].update({file.relative_to(source).as_posix(): file.stat().st_mode & 0o777
                                        for file in source.rglob("*") if "__pycache__" not in file.parts and file.suffix not in (".pyc", ".pyo")})
            copy(source, destination / "files" / relative)
    for file in destination.rglob("*"):
        file.chmod(0o700 if file.is_dir() else 0o600)
    if any(tree(bounded_path(root, key)) != value for key, value in baseline.items()):
        raise ValueError("Disposable state changed during backup")
    json_write(destination / "modes.json", modes)
    json_write(destination / "baseline.json", baseline)
    json_write(marker, {"operation_id": operation})
    return baseline


def restore(root, operation, expected, new_paths):
    destination = root / ".marao-upgrade-backups" / operation
    baseline = json.loads((destination / "baseline.json").read_bytes())
    # The orchestrator checked ownership and unrelated state before supplying this CAS.
    if any(tree(bounded_path(root, key)) != value for key, value in expected.items()):
        raise ValueError("Concurrent disposable edit; retained private recovery backup")
    for relative in baseline:
        saved = destination / "files" / relative
        if tree(saved) != baseline[relative]:
            raise ValueError("Private recovery baseline changed")
    modes = json.loads((destination / "modes.json").read_bytes())
    for relative, entries in modes.items():
        if relative not in baseline or not isinstance(entries, dict):
            raise ValueError("Invalid private recovery modes")
        for child, mode in entries.items():
            if not isinstance(child, str) or type(mode) is not int or not 0 <= mode <= 0o777:
                raise ValueError("Invalid private recovery mode")
            saved = destination / "files" / relative
            if child:
                saved = bounded_path(saved, child)
            if not saved.exists():
                raise ValueError("Private recovery mode path changed")
    for relative in baseline:
        copy(destination / "files" / relative, bounded_path(root, relative))
    for relative, entries in modes.items():
        target = bounded_path(root, relative)
        for child, mode in entries.items():
            (bounded_path(target, child) if child else target).chmod(mode)
    for relative in new_paths:
        if relative not in baseline:
            remove(bounded_path(root, relative))
    if any(tree(bounded_path(root, key)) != value for key, value in baseline.items()):
        raise ValueError("Disposable restoration verification failed")
    return baseline


def replay(root, source, output, slug, protected, native_key=None):
    base = root / "dashboard/MaraoDashboard"
    remove(base)
    base.mkdir(parents=True)
    if native_key is None:
        write(base / "dashboard.json", source.encode())
    else:
        file = root / ".storage" / native_key
        document = json.loads(file.read_bytes())
        document["data"]["config"] = json.loads(source)
        json_write(file, document)
    for relative, content in output.items():
        write(bounded_path(base / slug, relative), content.encode())
    for relative, content in protected.items():
        write(bounded_path(base / slug, relative), content.encode())
    return {"source": tree(base / "dashboard.json"), "output": tree(base / slug)}


def snapshot(root, paths, slug=None):
    result = {"files": {relative: tree(bounded_path(root, relative)) for relative in paths}}
    base = root / "dashboard/MaraoDashboard"
    if (base / "dashboard.json").exists():
        result["source_bytes"] = (base / "dashboard.json").read_text()
    if slug:
        result["output"] = tree(base / slug)
    histories = base / ".history"
    result["history"] = {file.name: tree(file) for file in histories.iterdir() if file.is_dir() and not file.name.startswith(".")} if histories.exists() else {}
    result["recovering"] = (histories / ".operation").exists()
    return result


def main(request):
    root = Path(request["root"])
    if not root.is_absolute() or str(root) == "/" or ".." in root.parts:
        raise ValueError("Invalid disposable configuration root")
    # The SSH add-on exposes Core's /config through a /homeassistant alias.
    root = root.resolve(strict=True)
    if not root.is_dir() or root == Path("/"):
        raise ValueError("Invalid disposable configuration root")
    if str(uuid.UUID(request["operation"])) != request["operation"]:
        raise ValueError("Invalid private upgrade operation identity")
    mode = request["mode"]
    if mode == "backup":
        return backup(root, request["operation"], request["paths"])
    marker = root / ".marao-upgrade-active.json"
    if json.loads(marker.read_bytes())["operation_id"] != request["operation"]:
        raise ValueError("Upgrade operation identity changed")
    if mode == "snapshot":
        result = snapshot(root, request["paths"], request.get("slug"))
        result["documents"] = {relative: json.loads(bounded_path(root, relative).read_bytes())
                               for relative in request.get("documents", []) if bounded_path(root, relative).exists()}
        return result
    if mode == "restore":
        return restore(root, request["operation"], request["expected"], request["new_paths"])
    if mode == "replay":
        return replay(root, request["source"], request["output"], request["slug"], request["protected"], request.get("native_key"))
    if mode == "finish":
        baseline = json.loads((root / ".marao-upgrade-backups" / request["operation"] / "baseline.json").read_bytes())
        if any(tree(bounded_path(root, key)) != value for key, value in baseline.items() if not key.startswith(".storage/")):
            raise ValueError("Restored disposable files changed before cleanup completed")
        marker.unlink()
        return {"verified_cleanup": True}
    raise ValueError("Unknown upgrade operation")


if __name__ == "__main__":
    try:
        print(json.dumps(main(json.load(sys.stdin))))
    except Exception:
        print("Private disposable upgrade operation failed; retain its recovery backup", file=sys.stderr)
        raise
