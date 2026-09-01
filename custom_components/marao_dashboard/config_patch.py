"""Patch Home Assistant YAML config so generated dashboards are registered."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import shutil
from typing import Iterable

import yaml


@dataclass(frozen=True)
class ConfigPatchResult:
    """Result of a Home Assistant configuration patch."""

    changed: bool
    backup_path: str | None
    dashboard_key: str
    filename: str


@dataclass(frozen=True)
class FrontendPatchResult:
    """Result of a Home Assistant frontend theme patch."""

    changed: bool
    backup_path: str | None
    themes_path: str


def _quote(value: str) -> str:
    return yaml.safe_dump(value, default_style='"').strip()


def _line_indent(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def _is_top_level(line: str) -> bool:
    stripped = line.strip()
    return bool(stripped) and not stripped.startswith("#") and _line_indent(line) == 0


def _section_bounds(lines: list[str], section: str) -> tuple[int | None, int]:
    section_start = next(
        (index for index, line in enumerate(lines) if line.startswith(f"{section}:")),
        None,
    )
    if section_start is None:
        return None, len(lines)

    section_end = len(lines)
    for index in range(section_start + 1, len(lines)):
        if _is_top_level(lines[index]):
            section_end = index
            break
    return section_start, section_end


def _entry_lines(
    dashboard_key: str, title: str, icon: str, filename: str, show_in_sidebar: bool
) -> list[str]:
    return [
        f"    {dashboard_key}:\n",
        "      mode: yaml\n",
        f"      title: {_quote(title)}\n",
        f"      icon: {_quote(icon)}\n",
        f"      show_in_sidebar: {str(show_in_sidebar).lower()}\n",
        f"      filename: {_quote(filename)}\n",
    ]


def patch_lovelace_dashboard(
    config_path: str | Path,
    dashboard_key: str,
    title: str,
    icon: str,
    filename: str,
    show_in_sidebar: bool = True,
    previous_dashboard_key: str | None = None,
) -> ConfigPatchResult:
    """Add or update a YAML Lovelace dashboard entry in configuration.yaml.

    The patch is intentionally line-based so existing includes and comments remain
    intact. A timestamped backup is created only when a write is needed.
    """

    path = Path(config_path)
    source = path.read_text(encoding="utf-8") if path.exists() else ""
    lines = source.splitlines(keepends=True)
    entry = _entry_lines(dashboard_key, title, icon, filename, show_in_sidebar)

    if not lines:
        lines = ["lovelace:\n", "  dashboards:\n", *entry]
        return _write_if_changed(path, source, lines, dashboard_key, filename)

    lovelace_start, lovelace_end = _section_bounds(lines, "lovelace")
    if lovelace_start is None:
        if lines[-1] and not lines[-1].endswith("\n"):
            lines[-1] += "\n"
        lines.extend(["\n", "lovelace:\n", "  dashboards:\n", *entry])
        return _write_if_changed(path, source, lines, dashboard_key, filename)

    dashboards_start = None
    for index in range(lovelace_start + 1, lovelace_end):
        if _line_indent(lines[index]) == 2 and lines[index].lstrip().startswith("dashboards:"):
            dashboards_start = index
            break

    if dashboards_start is None:
        insert_at = lovelace_end
        lines[insert_at:insert_at] = ["  dashboards:\n", *entry]
        return _write_if_changed(path, source, lines, dashboard_key, filename)

    dashboards_end = lovelace_end
    for index in range(dashboards_start + 1, lovelace_end):
        stripped = lines[index].strip()
        if stripped and not stripped.startswith("#") and _line_indent(lines[index]) <= 2:
            dashboards_end = index
            break

    key_lines = [f"{dashboard_key}:"]
    if previous_dashboard_key and previous_dashboard_key != dashboard_key:
        key_lines.append(f"{previous_dashboard_key}:")
    existing_start = None
    for key_line in key_lines:
        for index in range(dashboards_start + 1, dashboards_end):
            if _line_indent(lines[index]) == 4 and lines[index].strip() == key_line:
                existing_start = index
                break
        if existing_start is not None:
            break

    if existing_start is None:
        lines[dashboards_end:dashboards_end] = entry
    else:
        existing_end = dashboards_end
        for index in range(existing_start + 1, dashboards_end):
            stripped = lines[index].strip()
            if stripped and not stripped.startswith("#") and _line_indent(lines[index]) <= 4:
                existing_end = index
                break
        lines[existing_start:existing_end] = entry

    return _write_if_changed(path, source, lines, dashboard_key, filename)


def remove_lovelace_dashboard(
    config_path: str | Path,
    dashboard_key: str,
    expected_filename: str,
) -> ConfigPatchResult:
    """Remove a legacy dashboard only when it still points at our file."""

    path = Path(config_path)
    source = path.read_text(encoding="utf-8") if path.exists() else ""
    lines = source.splitlines(keepends=True)
    lovelace_start, lovelace_end = _section_bounds(lines, "lovelace")
    if lovelace_start is None:
        return ConfigPatchResult(False, None, dashboard_key, expected_filename)

    dashboards_start = next(
        (
            index
            for index in range(lovelace_start + 1, lovelace_end)
            if _line_indent(lines[index]) == 2
            and lines[index].lstrip().startswith("dashboards:")
        ),
        None,
    )
    if dashboards_start is None:
        return ConfigPatchResult(False, None, dashboard_key, expected_filename)

    dashboards_end = lovelace_end
    for index in range(dashboards_start + 1, lovelace_end):
        stripped = lines[index].strip()
        if stripped and not stripped.startswith("#") and _line_indent(lines[index]) <= 2:
            dashboards_end = index
            break

    entry_start = next(
        (
            index
            for index in range(dashboards_start + 1, dashboards_end)
            if _line_indent(lines[index]) == 4
            and lines[index].strip() == f"{dashboard_key}:"
        ),
        None,
    )
    if entry_start is None:
        return ConfigPatchResult(False, None, dashboard_key, expected_filename)

    entry_end = dashboards_end
    for index in range(entry_start + 1, dashboards_end):
        stripped = lines[index].strip()
        if stripped and not stripped.startswith("#") and _line_indent(lines[index]) <= 4:
            entry_end = index
            break

    filename = next(
        (
            _unquote(line.strip().split(":", 1)[1].strip())
            for line in lines[entry_start + 1 : entry_end]
            if _line_indent(line) == 6 and line.strip().startswith("filename:")
        ),
        None,
    )
    if filename != expected_filename:
        return ConfigPatchResult(False, None, dashboard_key, expected_filename)

    del lines[entry_start:entry_end]
    return _write_if_changed(path, source, lines, dashboard_key, expected_filename)


def patch_frontend_themes(
    config_path: str | Path,
    themes_path: str = "themes",
    extra_module_urls: Iterable[str] | None = None,
    remove_extra_module_url_prefixes: Iterable[str] | None = None,
) -> FrontendPatchResult:
    """Ensure Home Assistant loads themes and frontend modules."""

    path = Path(config_path)
    source = path.read_text(encoding="utf-8") if path.exists() else ""
    lines = source.splitlines(keepends=True)
    entry = f"  themes: !include_dir_merge_named {themes_path}\n"
    modules = tuple(extra_module_urls or ())
    removed_module_prefixes = tuple(remove_extra_module_url_prefixes or ())

    if not lines:
        lines = ["frontend:\n"]

    frontend_start, frontend_end = _section_bounds(lines, "frontend")
    if frontend_start is None:
        if lines[-1] and not lines[-1].endswith("\n"):
            lines[-1] += "\n"
        lines.extend(["\n", "frontend:\n"])
        frontend_start, frontend_end = _section_bounds(lines, "frontend")

    themes_start = _find_child_key(lines, frontend_start, frontend_end, "themes")
    if themes_start is None:
        lines[frontend_end:frontend_end] = [entry]
        frontend_start, frontend_end = _section_bounds(lines, "frontend")
    elif lines[themes_start] != entry:
        lines[themes_start] = entry

    lines = _remove_string_list_items(
        lines,
        frontend_start,
        frontend_end,
        "extra_module_url",
        removed_module_prefixes,
    )
    frontend_start, frontend_end = _section_bounds(lines, "frontend")
    lines = _ensure_string_list_items(
        lines,
        frontend_start,
        frontend_end,
        "extra_module_url",
        modules,
    )
    return _write_frontend_if_changed(path, source, lines, themes_path)


def _find_child_key(
    lines: list[str], section_start: int, section_end: int, key: str
) -> int | None:
    for index in range(section_start + 1, section_end):
        if _line_indent(lines[index]) == 2 and lines[index].lstrip().startswith(f"{key}:"):
            return index
    return None


def _child_block_end(
    lines: list[str], search_start: int, section_end: int, parent_indent: int
) -> int:
    block_end = section_end
    for index in range(search_start, section_end):
        stripped = lines[index].strip()
        if stripped and not stripped.startswith("#") and _line_indent(lines[index]) <= parent_indent:
            block_end = index
            break
    return block_end


def _ensure_string_list_items(
    lines: list[str],
    section_start: int,
    section_end: int,
    key: str,
    values: tuple[str, ...],
) -> list[str]:
    if not values:
        return lines

    list_start = _find_child_key(lines, section_start, section_end, key)
    if list_start is None:
        lines[section_end:section_end] = [
            f"  {key}:\n",
            *[f"    - {_quote(value)}\n" for value in values],
        ]
        return lines

    list_end = _child_block_end(lines, list_start + 1, section_end, 2)
    _replace_marao_frontend_urls(lines, list_start + 1, list_end, values)
    existing = _existing_string_list_values(lines, list_start + 1, list_end)
    missing = [value for value in values if value not in existing]
    if missing:
        lines[list_end:list_end] = [f"    - {_quote(value)}\n" for value in missing]
    return lines


def _remove_string_list_items(
    lines: list[str],
    section_start: int,
    section_end: int,
    key: str,
    value_prefixes: tuple[str, ...],
) -> list[str]:
    """Remove integration-owned URL list items while preserving other values."""

    if not value_prefixes:
        return lines
    list_start = _find_child_key(lines, section_start, section_end, key)
    if list_start is None:
        return lines

    prefixes = tuple(value.split("?", 1)[0].rstrip("/").casefold() for value in value_prefixes)
    list_end = _child_block_end(lines, list_start + 1, section_end, 2)
    index = list_start + 1
    while index < list_end:
        stripped = lines[index].strip()
        if _line_indent(lines[index]) != 4 or not stripped.startswith("- "):
            index += 1
            continue
        value = _unquote(stripped[2:].strip()).split("?", 1)[0].rstrip("/").casefold()
        if value in prefixes:
            del lines[index]
            list_end -= 1
            continue
        index += 1

    if not any(
        _line_indent(line) == 4 and line.strip().startswith("- ")
        for line in lines[list_start + 1 : list_end]
    ):
        del lines[list_start:list_end]
    return lines


def _existing_string_list_values(lines: list[str], start: int, end: int) -> set[str]:
    values = set()
    for line in lines[start:end]:
        stripped = line.strip()
        if stripped.startswith("- "):
            values.add(_unquote(stripped[2:].strip()))
    return values


def _replace_marao_frontend_urls(
    lines: list[str], start: int, end: int, urls: Iterable[str]
) -> None:
    """Replace cache-busted Marao frontend URLs instead of accumulating them."""

    frontend_url = next(
        (url for url in urls if "/MaraoDashboard/MaraoDashboard.js?v=" in url), None
    )
    if frontend_url is None:
        return

    for index in range(start, end):
        if "/MaraoDashboard/MaraoDashboard.js?v=" not in lines[index]:
            continue
        indent = lines[index][: len(lines[index]) - len(lines[index].lstrip(" "))]
        if lines[index].lstrip().startswith("- url:"):
            lines[index] = f"{indent}- url: {_quote(frontend_url)}\n"
        elif lines[index].lstrip().startswith("- "):
            lines[index] = f"{indent}- {_quote(frontend_url)}\n"


def _unquote(value: str) -> str:
    try:
        loaded = yaml.safe_load(value)
    except yaml.YAMLError:
        return value.strip("'\"")
    return loaded if isinstance(loaded, str) else value.strip("'\"")


def _write_if_changed(
    path: Path, original: str, lines: list[str], dashboard_key: str, filename: str
) -> ConfigPatchResult:
    updated = "".join(lines)
    if updated == original:
        return ConfigPatchResult(False, None, dashboard_key, filename)

    path.parent.mkdir(parents=True, exist_ok=True)
    backup_path = None
    if path.exists():
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = path.with_name(f"{path.name}.{timestamp}.bak")
        shutil.copy2(path, backup)
        backup_path = str(backup)

    path.write_text(updated, encoding="utf-8")
    return ConfigPatchResult(True, backup_path, dashboard_key, filename)


def _write_frontend_if_changed(
    path: Path, original: str, lines: list[str], themes_path: str
) -> FrontendPatchResult:
    updated = "".join(lines)
    if updated == original:
        return FrontendPatchResult(False, None, themes_path)

    path.parent.mkdir(parents=True, exist_ok=True)
    backup_path = None
    if path.exists():
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = path.with_name(f"{path.name}.{timestamp}.bak")
        shutil.copy2(path, backup)
        backup_path = str(backup)

    path.write_text(updated, encoding="utf-8")
    return FrontendPatchResult(True, backup_path, themes_path)
