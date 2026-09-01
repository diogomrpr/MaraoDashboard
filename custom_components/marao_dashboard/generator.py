"""Generate Marao Dashboard dashboard YAML from dashboard definitions."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import re
import unicodedata
from typing import Any, Iterable

import yaml

from .const import (
    BASE_DASHBOARD_ICON,
    BASE_DASHBOARD_NAME,
    BASE_DASHBOARD_SLUG,
    BASE_DASHBOARD_THEME,
    DASHBOARD_KEY_PREFIX,
    MARAO_DASHBOARD_TEMPLATE_INCLUDE,
)

SUPPORTED_DOMAINS = {
    "binary_sensor",
    "camera",
    "climate",
    "cover",
    "fan",
    "input_boolean",
    "input_number",
    "light",
    "lock",
    "media_player",
    "number",
    "sensor",
    "switch",
    "vacuum",
}

DOMAIN_TEMPLATES = {
    "binary_sensor": "hc_sensor_card",
    "camera": "hc_camera_card",
    "climate": "hc_climate_card",
    "cover": "hc_cover_card",
    "fan": "hc_fan_card",
    "input_boolean": "hc_switch_card",
    "input_number": "hc_number_card",
    "light": "hc_light_card",
    "lock": "hc_access_card",
    "media_player": "hc_media_card",
    "number": "hc_number_card",
    "sensor": "hc_sensor_card",
    "switch": "hc_switch_card",
    "vacuum": "hc_vacuum_card",
}

MANIFEST_NAME = ".marao-generated.json"
GENERATED_START = "  # marao:generated:start\n"
GENERATED_END = "  # marao:generated:end\n"
CUSTOM_START = "  # marao:custom:start\n"
CUSTOM_END = "  # marao:custom:end\n"
FOOTER_START = "  # marao:generated-footer:start\n"
FOOTER_END = "  # marao:generated-footer:end\n"

GENERATOR_TRANSLATIONS = {
    "en": {
        "nav.home": "Home",
        "nav.security": "Security",
        "nav.rooms": "Rooms",
        "nav.energy": "Energy",
        "nav.wallbox": "Wallbox",
        "nav.media": "Media",
        "overview.lights": "Lights",
        "overview.blinds": "Blinds",
        "overview.climate": "Climate",
        "overview.maintenance": "Maintenance",
        "overview.scenes": "Scenes",
        "common.open": "Open",
        "common.close": "Close",
        "common.lock": "Lock",
        "common.unlock": "Unlock",
        "camera.events": "Events",
        "climate.mode_suffix": "Mode",
    },
    "pt": {
        "nav.home": "Início",
        "nav.security": "Segurança",
        "nav.rooms": "Divisões",
        "nav.energy": "Energia",
        "nav.wallbox": "Wallbox",
        "nav.media": "Multimédia",
        "overview.lights": "Iluminação",
        "overview.blinds": "Persianas",
        "overview.climate": "Climatização",
        "overview.maintenance": "Manutenção",
        "overview.scenes": "Cenários",
        "common.open": "Abrir",
        "common.close": "Fechar",
        "common.lock": "Trancar",
        "common.unlock": "Destrancar",
        "camera.events": "Eventos",
        "climate.mode_suffix": "Modo",
    },
}


class TaggedScalar:
    """YAML scalar with a Home Assistant tag."""

    def __init__(self, tag: str, value: str) -> None:
        self.tag = tag
        self.value = value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, TaggedScalar) and (self.tag, self.value) == (
            other.tag,
            other.value,
        )

    def __repr__(self) -> str:
        return f"TaggedScalar({self.tag!r}, {self.value!r})"


class MaraoDashboardDumper(yaml.SafeDumper):
    """YAML dumper that avoids anchors and supports HA tags."""

    def ignore_aliases(self, data: Any) -> bool:
        return True


class MaraoDashboardLoader(yaml.SafeLoader):
    """YAML loader that retains Home Assistant include tags for comparisons."""


def _represent_tagged_scalar(dumper: yaml.Dumper, data: TaggedScalar) -> yaml.Node:
    return dumper.represent_scalar(data.tag, data.value)


MaraoDashboardDumper.add_representer(TaggedScalar, _represent_tagged_scalar)


def _construct_tagged_scalar(
    loader: yaml.Loader, tag_suffix: str, node: yaml.Node
) -> TaggedScalar:
    if not isinstance(node, yaml.ScalarNode):
        raise ValueError("Marao include tags must be scalar values")
    return TaggedScalar(f"!{tag_suffix}", loader.construct_scalar(node))


MaraoDashboardLoader.add_multi_constructor("!", _construct_tagged_scalar)


@dataclass(frozen=True)
class GeneratedDashboard:
    """Generated dashboard files."""

    slug: str
    dashboard_key: str
    title: str
    icon: str
    filename: str
    files: list[str]


def make_slug(value: Any) -> str:
    """Create a stable URL/file-safe slug."""

    text = unicodedata.normalize("NFKD", str(value or "dashboard"))
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "dashboard"


def dashboard_key_for_slug(slug: str) -> str:
    """Return the Lovelace dashboard key for a generated slug."""

    return f"{DASHBOARD_KEY_PREFIX}-{slug}"


def yaml_dump(data: Any) -> str:
    """Dump YAML with stable formatting."""

    return yaml.dump(
        data,
        Dumper=MaraoDashboardDumper,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
        width=1000,
    )


def load_dashboard_config(path: str | Path) -> dict[str, Any]:
    """Load a dashboard JSON config from disk."""

    try:
        config = json.loads(Path(path).read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        raise ValueError(f"Invalid dashboard JSON: {err.msg}") from err

    if not isinstance(config, dict):
        raise ValueError("Dashboard JSON must be an object")
    return config


def write_dashboard_config(config: dict[str, Any], path: str | Path) -> None:
    """Write a dashboard JSON config without touching generated YAML."""

    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def ensure_dashboard_config(
    path: str | Path, registry_entities: Iterable[dict[str, Any]]
) -> dict[str, Any]:
    """Create a starter dashboard JSON config if it does not exist."""

    target = Path(path)
    if target.exists():
        config = load_dashboard_config(target)
        if migrate_legacy_theme(config):
            write_dashboard_config(config, target)
        registry = list(registry_entities)
        if _is_empty_base_dashboard_config(config):
            refreshed = build_base_dashboard_config(registry)
            if refreshed["rooms"]:
                write_dashboard_config(refreshed, target)
                return refreshed
        return config

    config = build_base_dashboard_config(list(registry_entities))
    write_dashboard_config(config, target)
    return config


def _is_empty_base_dashboard_config(config: dict[str, Any]) -> bool:
    return (
        config.get("name") == BASE_DASHBOARD_NAME
        and config.get("slug") == BASE_DASHBOARD_SLUG
        and config.get("rooms") == []
    )


def migrate_legacy_theme(config: dict[str, Any]) -> bool:
    if config.get("theme") not in {"Marao Dashboard Gold", "Marao Dashboard Peach"}:
        return False
    config["theme"] = BASE_DASHBOARD_THEME
    return True


def normalize_config(config: dict[str, Any]) -> dict[str, Any]:
    """Normalize and validate a dashboard configuration."""

    if not isinstance(config, dict):
        raise ValueError("Dashboard configuration must be a JSON object")

    name = str(config.get("name") or "").strip()
    if not name:
        raise ValueError("Dashboard configuration requires a non-empty name")

    rooms = config.get("rooms", [])
    if not isinstance(rooms, list):
        raise ValueError("rooms must be a list")

    overview = config.get("overview", {})
    if overview is None:
        overview = {}
    if not isinstance(overview, dict):
        raise ValueError("overview must be an object")

    pages = config.get("pages", {})
    if pages is None:
        pages = {}
    if not isinstance(pages, dict):
        raise ValueError("pages must be an object")
    for page_name in ("security", "energy", "wallbox", "media"):
        if page_name in pages and not isinstance(pages[page_name], dict):
            raise ValueError(f"pages.{page_name} must be an object")
    custom_pages = pages.get("custom", [])
    if custom_pages is None:
        custom_pages = []
    if not isinstance(custom_pages, list):
        raise ValueError("pages.custom must be a list")
    if any(not isinstance(page, dict) for page in custom_pages):
        raise ValueError("Each custom page must be an object")

    navigation = config.get("navigation")
    if navigation is not None and not isinstance(navigation, list):
        raise ValueError("navigation must be a list")
    if isinstance(navigation, list) and any(
        not isinstance(item, (str, dict)) for item in navigation
    ):
        raise ValueError("navigation entries must be page paths or route objects")

    theme = config.get("theme") or BASE_DASHBOARD_THEME
    if theme in {"Marao Dashboard Gold", "Marao Dashboard Peach"}:
        theme = BASE_DASHBOARD_THEME

    normalized = {**config}
    normalized["name"] = name
    normalized["slug"] = make_slug(config.get("slug") or name)
    normalized["theme"] = theme
    normalized["icon"] = config.get("icon") or "mdi:view-dashboard"
    normalized["rooms"] = rooms
    normalized["overview"] = overview
    normalized["pages"] = pages
    return normalized


def resolve_dashboard_config(
    config: dict[str, Any], registry_entities: Iterable[dict[str, Any]] | None = None
) -> dict[str, Any]:
    """Resolve rooms against HA registry/entity data and explicit overrides."""

    normalized = normalize_config(config)
    registry = list(registry_entities or [])
    resolved_rooms = [
        _resolve_entity_container(room, registry, kind="room", allow_area=True)
        for room in normalized["rooms"]
    ]
    resolved_custom = [
        _resolve_entity_container(page, registry, kind="custom page")
        for page in normalized["pages"].get("custom", [])
    ]

    used_paths = {"overview", "rooms", "security", "energy", "wallbox", "media"}
    used_paths.update(room["path"] for room in resolved_rooms)
    for page in resolved_custom:
        if page["path"] in used_paths:
            raise ValueError(f"Custom page path must be unique: {page['path']}")
        used_paths.add(page["path"])

    pages = {**normalized["pages"]}
    if "custom" in pages or resolved_custom:
        pages["custom"] = resolved_custom
    return {**normalized, "rooms": resolved_rooms, "pages": pages}


def _resolve_entity_container(
    container: Any,
    registry: list[dict[str, Any]],
    *,
    kind: str,
    allow_area: bool = False,
) -> dict[str, Any]:
    if not isinstance(container, dict):
        raise ValueError(f"Each {kind} must be an object")
    name = str(container.get("name") or "").strip()
    if not name:
        raise ValueError(f"Each {kind} requires a name")
    columns = container.get("columns")
    if columns is not None and (
        isinstance(columns, bool)
        or not isinstance(columns, int)
        or columns < 1
        or columns > 6
    ):
        raise ValueError(f"{kind} columns must be an integer between 1 and 6")

    collected: dict[str, dict[str, Any]] = {}
    area = container.get("area") if allow_area else None
    if area:
        for entity in registry:
            if _matches_area(entity, str(area)):
                _add_entity(collected, entity)

    _merge_entity_spec(collected, container.get("entities"))
    _merge_entity_spec(collected, container.get("include"))
    for entity_id in _entity_ids_from_spec(container.get("exclude")):
        collected.pop(entity_id, None)

    overrides = container.get("overrides") if isinstance(container.get("overrides"), dict) else {}
    for entity_id, override in overrides.items():
        if entity_id in collected and isinstance(override, dict):
            collected[entity_id].update(override)

    raw_cards = container.get("cards", [])
    if raw_cards is None:
        raw_cards = []
    if not isinstance(raw_cards, list) or any(not isinstance(card, dict) for card in raw_cards):
        raise ValueError(f"{kind} cards must be a list of Lovelace card objects")

    entities_by_domain: dict[str, list[dict[str, Any]]] = {}
    for entity in collected.values():
        domain = entity["entity_id"].split(".", 1)[0]
        if domain in SUPPORTED_DOMAINS:
            entities_by_domain.setdefault(domain, []).append(entity)
    shortcuts = _page_shortcuts_from_spec(container.get("entities"))
    if shortcuts:
        entities_by_domain["navigation"] = shortcuts
    ordered_cards = _ordered_cards_from_spec(container.get("entities"), collected)

    path = container.get("path") or (f"room-{make_slug(name)}" if kind == "room" else make_slug(name))
    if kind != "room":
        path = make_slug(path)
    return {
        **container,
        "name": name,
        "path": path,
        "icon": container.get("icon") or ("mdi:sofa-outline" if kind == "room" else "mdi:file-outline"),
        "cards": raw_cards,
        "entities_by_domain": entities_by_domain,
        "ordered_cards": ordered_cards,
    }


def plan_dashboard(
    config: dict[str, Any],
    output_base_dir: str | Path,
    registry_entities: Iterable[dict[str, Any]] | None = None,
    dashboard_key_override: str | None = None,
) -> GeneratedDashboard:
    """Validate a config and return the files that would be generated."""

    resolved = resolve_dashboard_config(config, registry_entities)
    slug = resolved["slug"]
    output_dir = Path(output_base_dir) / slug
    paths = _generated_relative_paths(resolved)
    return GeneratedDashboard(
        slug=slug,
        dashboard_key=dashboard_key_override or dashboard_key_for_slug(slug),
        title=resolved["name"],
        icon=resolved["icon"],
        filename=f"dashboard/MaraoDashboard/{slug}/dashboard.yaml",
        files=[str(output_dir / path) for path in paths],
    )


def write_dashboard(
    config: dict[str, Any],
    output_base_dir: str | Path,
    registry_entities: Iterable[dict[str, Any]] | None = None,
    config_root: str = "/config",
    dashboard_key_override: str | None = None,
    language: str = "en",
) -> GeneratedDashboard:
    """Generate and write a complete Marao Dashboard dashboard folder."""

    resolved = resolve_dashboard_config(config, registry_entities)
    slug = resolved["slug"]
    dashboard_key = dashboard_key_override or dashboard_key_for_slug(slug)
    output_dir = Path(output_base_dir) / slug
    output_dir.mkdir(parents=True, exist_ok=True)

    files: list[str] = []

    include_root = f"{config_root}/dashboard/MaraoDashboard/{slug}"
    main_views = _main_view_paths(resolved)
    room_views = _room_view_paths(resolved)
    custom_views = _custom_view_paths(resolved)

    plain_files: dict[str, Any] = {
        "dashboard.yaml": {
            "title": resolved["name"],
            "theme": resolved["theme"],
            "button_card_templates": TaggedScalar(
                "!include_dir_merge_named", MARAO_DASHBOARD_TEMPLATE_INCLUDE
            ),
            "kiosk_mode": {
                "non_admin_settings": {
                    "hide_header": True,
                    "ignore_entity_settings": True,
                },
                "mobile_settings": {"hide_header": True},
            },
            "views": [
                TaggedScalar("!include", f"{include_root}/{path}")
                for path in [*main_views, *room_views, *custom_views]
            ],
        },
        "components/navigation/navbar.yaml": _navigation_bar(
            resolved, dashboard_key, language
        ),
    }
    card_files: dict[str, dict[str, Any]] = {
        "views/main/00-overview.yaml": _overview_view(
            resolved, include_root, dashboard_key, language
        ),
        "views/main/02-rooms.yaml": _rooms_view(
            resolved, include_root, dashboard_key, language
        ),
    }
    for popup_name, popup in _overview_popups(resolved, language).items():
        card_files[f"components/popups/{popup_name}.yaml"] = popup

    pages = resolved["pages"]
    if "security" in pages:
        card_files["views/main/01-security.yaml"] = _security_view(
            resolved, include_root, language
        )
    if "energy" in pages:
        card_files["views/main/03-energy.yaml"] = _energy_view(
            resolved, include_root, language
        )
        for popup_name, popup in _energy_popups(resolved, language).items():
            card_files[f"components/popups/{popup_name}.yaml"] = popup
    if "wallbox" in pages:
        card_files["views/main/04-wallbox.yaml"] = _wallbox_view(
            resolved, include_root, language
        )
    if "media" in pages:
        card_files["views/main/05-media.yaml"] = _media_view(
            resolved, include_root, language
        )

    for index, room in enumerate(resolved["rooms"]):
        card_files[room_views[index]] = _room_view(
            resolved, room, include_root, dashboard_key, language
        )
    for index, page in enumerate(resolved["pages"].get("custom", [])):
        card_files[custom_views[index]] = _custom_page_view(
            resolved, page, include_root, dashboard_key, language
        )

    old_manifest = _load_generation_manifest(output_dir)
    custom_cards = _preflight_custom_cards(
        output_dir,
        card_files,
        old_manifest["containers"],
    )

    for relative_path, data in plain_files.items():
        _write_text(output_dir / relative_path, yaml_dump(data))
        files.append(str(output_dir / relative_path))

    for relative_path, data in card_files.items():
        _write_text(
            output_dir / relative_path,
            _render_card_container(data, custom_cards.get(relative_path, "")),
        )
        files.append(str(output_dir / relative_path))

    new_plain = set(plain_files)
    new_containers = set(card_files)
    for relative_path in old_manifest["plain"]:
        target = output_dir / relative_path
        if relative_path not in new_plain and target.is_file():
            target.unlink()
    for relative_path in old_manifest["containers"]:
        target = output_dir / relative_path
        if relative_path not in new_containers and target.is_file():
            custom = custom_cards.get(relative_path, "")
            if _has_custom_cards(custom):
                _write_text(target, _clear_generated_cards(target.read_text(encoding="utf-8")))
            else:
                target.unlink()

    _write_text(
        output_dir / MANIFEST_NAME,
        json.dumps(
            {"version": 1, "plain": sorted(new_plain), "containers": sorted(new_containers)},
            indent=2,
        )
        + "\n",
    )
    files.append(str(output_dir / MANIFEST_NAME))

    return GeneratedDashboard(
        slug=slug,
        dashboard_key=dashboard_key,
        title=resolved["name"],
        icon=resolved["icon"],
        filename=f"dashboard/MaraoDashboard/{slug}/dashboard.yaml",
        files=files,
    )


def _generated_relative_paths(config: dict[str, Any]) -> list[str]:
    paths = [
        "dashboard.yaml",
        MANIFEST_NAME,
        "components/navigation/navbar.yaml",
        *_main_view_paths(config),
        *_room_view_paths(config),
        *_custom_view_paths(config),
    ]
    paths.extend(
        f"components/popups/{name}.yaml" for name in _overview_popups(config)
    )
    if "energy" in config.get("pages", {}):
        paths.extend(f"components/popups/{name}.yaml" for name in _energy_popups(config))
    return paths


def _main_view_paths(config: dict[str, Any]) -> list[str]:
    pages = config.get("pages", {})
    paths = ["views/main/00-overview.yaml"]
    if "security" in pages:
        paths.append("views/main/01-security.yaml")
    paths.append("views/main/02-rooms.yaml")
    for name, filename in (("energy", "03-energy"), ("wallbox", "04-wallbox"), ("media", "05-media")):
        if name in pages:
            paths.append(f"views/main/{filename}.yaml")
    return paths


def _custom_view_paths(config: dict[str, Any]) -> list[str]:
    return [
        f"views/custom/{index:02d}-{make_slug(page['name'])}.yaml"
        for index, page in enumerate(config.get("pages", {}).get("custom", []))
    ]


def _load_generation_manifest(output_dir: Path) -> dict[str, list[str]]:
    target = output_dir / MANIFEST_NAME
    if not target.is_file():
        return {"plain": [], "containers": []}
    try:
        manifest = json.loads(target.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        raise ValueError(f"Invalid Marao generation manifest: {err.msg}") from err
    if not isinstance(manifest, dict):
        raise ValueError("Invalid Marao generation manifest")
    paths: dict[str, list[str]] = {}
    for key in ("plain", "containers"):
        values = manifest.get(key, [])
        if not isinstance(values, list):
            raise ValueError("Invalid Marao generation manifest")
        paths[key] = []
        for value in values:
            if not isinstance(value, str):
                raise ValueError("Invalid Marao generation manifest path")
            path = Path(value)
            if not path.parts or path.is_absolute() or ".." in path.parts:
                raise ValueError("Invalid Marao generation manifest path")
            paths[key].append(value)
    return paths


def _write_text(target: Path, text: str) -> None:
    """Atomically write a generated file without touching unrelated paths."""

    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(f".{target.name}.tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(target)


def _preflight_custom_cards(
    output_dir: Path,
    generated_cards: dict[str, dict[str, Any]],
    previous_containers: Iterable[str],
) -> dict[str, str]:
    custom_cards: dict[str, str] = {}
    previous = set(previous_containers)
    for relative_path in dict.fromkeys([*generated_cards, *previous]):
        target = output_dir / relative_path
        if not target.is_file():
            continue
        source = target.read_text(encoding="utf-8")
        if all(marker in source for marker in (GENERATED_START, CUSTOM_START, FOOTER_START)):
            custom_cards[relative_path] = _extract_custom_cards(source, relative_path)
        elif relative_path not in previous and relative_path in generated_cards and (
            _matches_legacy_card_file(source, generated_cards[relative_path])
            or not previous
            and _is_unmarked_legacy_card_file(source)
        ):
            # The editor snapshots pre-marker dashboards before this one-time migration.
            custom_cards[relative_path] = ""
        else:
            raise ValueError(
                f"Cannot safely regenerate {relative_path}: Marao card markers are missing or damaged"
            )
    return custom_cards


def _matches_legacy_card_file(source: str, expected: dict[str, Any]) -> bool:
    try:
        return yaml.load(source, Loader=MaraoDashboardLoader) == expected
    except (ValueError, yaml.YAMLError):
        return False


def _is_unmarked_legacy_card_file(source: str) -> bool:
    if "marao:" in source:
        return False
    try:
        data = yaml.load(source, Loader=MaraoDashboardLoader)
    except (ValueError, yaml.YAMLError):
        return False
    return isinstance(data, dict) and isinstance(data.get("cards"), list)


def _extract_custom_cards(source: str, relative_path: str) -> str:
    markers = (GENERATED_START, GENERATED_END, CUSTOM_START, CUSTOM_END, FOOTER_START, FOOTER_END)
    if any(source.count(marker) != 1 for marker in markers):
        raise ValueError(
            f"Cannot safely regenerate {relative_path}: Marao card markers are missing or damaged"
        )
    custom_start = source.index(CUSTOM_START) + len(CUSTOM_START)
    custom_end = source.index(CUSTOM_END)
    if custom_start > custom_end:
        raise ValueError(f"Cannot safely regenerate {relative_path}: invalid custom card marker order")
    return source[custom_start:custom_end]


def _render_card_container(data: dict[str, Any], custom_cards: str) -> str:
    cards = list(data.get("cards") or [])
    footer_cards: list[Any] = []
    if cards and _is_navigation_include(cards[-1]):
        footer_cards = [cards.pop()]
    header = yaml_dump({key: value for key, value in data.items() if key != "cards"})
    custom = custom_cards or "  # Add custom Lovelace cards here.\n"
    return (
        f"{header}cards:\n"
        f"{GENERATED_START}{_indent_cards(cards)}{GENERATED_END}"
        f"{CUSTOM_START}{custom}{CUSTOM_END}"
        f"{FOOTER_START}{_indent_cards(footer_cards)}{FOOTER_END}"
    )


def _is_navigation_include(card: Any) -> bool:
    return isinstance(card, TaggedScalar) and card.tag == "!include" and "navigation/navbar.yaml" in card.value


def _indent_cards(cards: list[Any]) -> str:
    if not cards:
        return ""
    return "".join(f"  {line}\n" if line else "\n" for line in yaml_dump(cards).rstrip("\n").splitlines())


def _has_custom_cards(custom_cards: str) -> bool:
    return any(
        line.strip() and not line.lstrip().startswith("#")
        for line in custom_cards.splitlines()
    )


def _clear_generated_cards(source: str) -> str:
    for start, end in ((GENERATED_START, GENERATED_END), (FOOTER_START, FOOTER_END)):
        content_start = source.index(start) + len(start)
        content_end = source.index(end)
        source = source[:content_start] + source[content_end:]
    return source


def _room_view_paths(config: dict[str, Any]) -> list[str]:
    return [
        f"views/rooms/{index:02d}-{make_slug(room['name'])}.yaml"
        for index, room in enumerate(config["rooms"])
    ]


def build_base_dashboard_config(registry_entities: Iterable[dict[str, Any]]) -> dict[str, Any]:
    """Build the fixed Marao Dashboard dashboard config from current Home Assistant entities."""

    entities = list(registry_entities)
    rooms: list[dict[str, Any]] = []
    area_entities: dict[str, list[dict[str, Any]]] = {}
    area_names: dict[str, str] = {}
    fallback_entities: dict[str, list[dict[str, Any]]] = {}

    for entity in entities:
        entity_id = str(entity.get("entity_id") or "")
        if "." not in entity_id or not _is_enabled_visible(entity):
            continue
        if entity.get("has_state") is False:
            continue

        domain = entity_id.split(".", 1)[0]
        if domain not in SUPPORTED_DOMAINS:
            continue

        area_id = entity.get("area_id") or entity.get("device_area_id")
        area_name = entity.get("area_name") or entity.get("device_area_name")
        item = {
            "entity_id": entity_id,
            "name": entity.get("name") or _friendly_name(entity_id),
            "icon": entity.get("icon"),
            "device_class": entity.get("device_class"),
        }
        if area_id and area_name:
            key = str(area_id)
            area_names[key] = str(area_name)
            area_entities.setdefault(key, []).append(item)
        else:
            fallback_entities.setdefault(domain, []).append(item)

    for area_id, area_name in sorted(area_names.items(), key=lambda item: make_slug(item[1])):
        entities_by_domain: dict[str, list[dict[str, Any]]] = {}
        for entity in sorted(area_entities.get(area_id, []), key=lambda item: item["entity_id"]):
            domain = entity["entity_id"].split(".", 1)[0]
            entities_by_domain.setdefault(domain, []).append(entity)

        if not entities_by_domain:
            continue

        rooms.append(
            {
                "name": area_name,
                "area": area_id,
                "path": f"room-{make_slug(area_name)}",
                "icon": "mdi:sofa-outline",
                "entities": entities_by_domain,
            }
        )

    if not rooms and fallback_entities:
        rooms.append(
            {
                "name": "Home",
                "path": "home",
                "icon": "mdi:home-outline",
                "entities": {
                    domain: sorted(values, key=lambda item: item["entity_id"])
                    for domain, values in sorted(fallback_entities.items())
                },
            }
        )

    weather_entity = next(
        (
            entity["entity_id"]
            for entity in entities
            if str(entity.get("entity_id") or "").startswith("weather.")
            and _is_enabled_visible(entity)
        ),
        None,
    )

    overview = {"weather_entity": weather_entity} if weather_entity else {}
    return {
        "name": BASE_DASHBOARD_NAME,
        "slug": BASE_DASHBOARD_SLUG,
        "theme": BASE_DASHBOARD_THEME,
        "icon": BASE_DASHBOARD_ICON,
        "overview": overview,
        "rooms": rooms,
    }


def _is_enabled_visible(entity: dict[str, Any]) -> bool:
    return not entity.get("disabled_by") and not entity.get("hidden_by")


def _matches_area(entity: dict[str, Any], area: str) -> bool:
    candidates = {
        entity.get("area_id"),
        entity.get("area_name"),
        entity.get("device_area_id"),
        entity.get("device_area_name"),
    }
    return area in candidates or make_slug(area) in {make_slug(item) for item in candidates if item}


def _add_entity(target: dict[str, dict[str, Any]], entity: dict[str, Any]) -> None:
    entity_id = str(entity.get("entity_id") or "")
    if "." not in entity_id:
        return
    domain = entity_id.split(".", 1)[0]
    if domain not in SUPPORTED_DOMAINS:
        return
    target[entity_id] = {
        "entity_id": entity_id,
        "name": entity.get("name") or _friendly_name(entity_id),
        "icon": entity.get("icon"),
        "device_class": entity.get("device_class"),
        "device_model": entity.get("device_model"),
        "manufacturer": entity.get("manufacturer"),
    }


def _merge_entity_spec(target: dict[str, dict[str, Any]], spec: Any) -> None:
    if isinstance(spec, dict):
        for domain, values in spec.items():
            if domain in SUPPORTED_DOMAINS:
                for entity in _entities_from_values(values):
                    if entity["entity_id"].split(".", 1)[0] == domain:
                        target[entity["entity_id"]] = entity
            else:
                for entity in _entities_from_values(values):
                    target[entity["entity_id"]] = entity
    else:
        for entity in _entities_from_values(spec):
            target[entity["entity_id"]] = entity


def _entities_from_values(values: Any) -> list[dict[str, Any]]:
    if values is None:
        return []
    if isinstance(values, (str, dict)):
        values = [values]
    if not isinstance(values, list):
        return []

    entities = []
    for value in values:
        if isinstance(value, str):
            entities.append({"entity_id": value, "name": _friendly_name(value)})
        elif isinstance(value, dict) and isinstance(value.get("entity_id"), str):
            entity_id = value["entity_id"]
            entities.append(
                {
                    **value,
                    "entity_id": entity_id,
                    "name": value.get("name") or _friendly_name(entity_id),
                }
            )
    return entities


def _entity_ids_from_spec(spec: Any) -> set[str]:
    return {entity["entity_id"] for entity in _entities_from_values(spec)} | {
        entity["entity_id"] for entity in _flatten_dict_spec(spec)
    }


def _flatten_dict_spec(spec: Any) -> list[dict[str, Any]]:
    if not isinstance(spec, dict):
        return []
    entities = []
    for value in spec.values():
        entities.extend(_entities_from_values(value))
    return entities


def _page_shortcuts_from_spec(spec: Any) -> list[dict[str, Any]]:
    values = list(spec.values()) if isinstance(spec, dict) else [spec]
    shortcuts: list[dict[str, Any]] = []
    for value in values:
        entries = value if isinstance(value, list) else [value]
        for entry in entries:
            if isinstance(entry, dict) and isinstance(entry.get("page"), str):
                shortcuts.append({**entry, "template": "hc_navigation_card"})
    return shortcuts


def _ordered_cards_from_spec(
    spec: Any, collected: dict[str, dict[str, Any]]
) -> list[dict[str, Any]]:
    values = list(spec.values()) if isinstance(spec, dict) else [spec]
    ordered: list[dict[str, Any]] = []
    seen: set[str] = set()
    for value in values:
        entries = value if isinstance(value, list) else [value]
        for entry in entries:
            if isinstance(entry, dict) and isinstance(entry.get("page"), str):
                ordered.append({**entry, "template": "hc_navigation_card"})
                continue
            entity_id = (
                entry
                if isinstance(entry, str)
                else entry.get("entity_id")
                if isinstance(entry, dict)
                else None
            )
            if isinstance(entity_id, str) and entity_id in collected and entity_id not in seen:
                ordered.append(collected[entity_id])
                seen.add(entity_id)
    ordered.extend(entity for entity_id, entity in collected.items() if entity_id not in seen)
    return ordered


def _friendly_name(entity_id: str) -> str:
    name = entity_id.split(".", 1)[-1]
    return name.replace("_", " ").title()


def _t(language: str, key: str) -> str:
    normalized = str(language or "en").lower()
    normalized = normalized if normalized in GENERATOR_TRANSLATIONS else normalized.split("-", 1)[0]
    catalog = GENERATOR_TRANSLATIONS.get(normalized, GENERATOR_TRANSLATIONS["en"])
    return catalog.get(key, GENERATOR_TRANSLATIONS["en"].get(key, key))


def _all_entities(config: dict[str, Any], domain: str | None = None) -> list[dict[str, Any]]:
    entities: list[dict[str, Any]] = []
    seen = set()
    for room in config["rooms"]:
        domains = [domain] if domain else list(room["entities_by_domain"])
        for current_domain in domains:
            for entity in room["entities_by_domain"].get(current_domain, []):
                entity_id = entity.get("entity_id")
                if entity_id and entity_id not in seen:
                    entities.append({**entity, "room_name": room["name"]})
                    seen.add(entity_id)
    return entities


def _first_entity(config: dict[str, Any], domain: str) -> str | None:
    entities = _all_entities(config, domain)
    return entities[0]["entity_id"] if entities else None


def _navigation_bar(config: dict[str, Any], dashboard_key: str, language: str = "en") -> dict[str, Any]:
    base = f"/{dashboard_key}"
    available = {
        "overview": {
            "icon": "mdi:home-variant-outline",
            "icon_selected": "mdi:home-variant",
            "label": _t(language, "nav.home"),
            "url": f"{base}/overview",
        }
    }
    for page_name, icon, selected_icon, label_key, path in (
        ("security", "mdi:shield-home-outline", "mdi:shield-home", "nav.security", "security"),
        ("rooms", "mdi:sofa-outline", "mdi:sofa", "nav.rooms", "rooms"),
        ("energy", "mdi:lightning-bolt-outline", "mdi:lightning-bolt", "nav.energy", "energy"),
        ("wallbox", "mdi:ev-plug-type2", "mdi:ev-plug-type2", "nav.wallbox", "wallbox"),
        ("media", "mdi:television-play-outline", "mdi:television-play", "nav.media", "media"),
    ):
        if page_name == "rooms" or page_name in config.get("pages", {}):
            available[path] = {
                "icon": icon,
                "icon_selected": selected_icon,
                "label": _t(language, label_key),
                "url": f"{base}/{path}",
            }
    for page in config.get("pages", {}).get("custom", []):
        available[page["path"]] = {
            "icon": page["icon"],
            "icon_selected": page["icon"],
            "label": page["name"],
            "url": f"{base}/{page['path']}",
        }

    configured = config.get("navigation")
    if configured is None:
        routes = list(available.values())
    else:
        explicit = any(
            isinstance(item, str)
            or isinstance(item, dict)
            and item.get("page")
            for item in configured
        )
        routes = [] if explicit else list(available.values())
        for route in configured:
            page_path = route if isinstance(route, str) else route.get("page") if isinstance(route, dict) else None
            if page_path in available:
                routes.append(available[page_path])
            elif isinstance(route, dict) and route.get("url") and route.get("label"):
                routes.append(route)
    return {
        "type": "vertical-stack",
        "cards": [
            _action_bar_spacer(),
            {
                "type": "custom:navbar-card",
                "haptic": {
                    "double_tap_action": True,
                    "hold_action": True,
                    "tap_action": True,
                    "url": True,
                },
                "mobile": {"mode": "floating", "show_labels": False},
                "desktop": {
                    "min_width": 1024,
                    "mode": "floating",
                    "position": "bottom",
                    "show_labels": False,
                },
                "routes": routes,
                "styles": """
:host {
  --navbar-border-radius: 999px;
  --marao-navbar-route-size: 58px;
}
.navbar {
  align-items: center;
}
.navbar-card {
  box-sizing: border-box !important;
  justify-content: center !important;
  width: fit-content !important;
  max-width: calc(100vw - 24px) !important;
  padding-left: 16px !important;
  padding-right: 16px !important;
  gap: 0 !important;
}
.navbar-card.mobile.floating {
  margin-bottom: 18px;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
  touch-action: none;
}
.route {
  flex: 0 0 var(--marao-navbar-route-size);
  width: var(--marao-navbar-route-size);
  min-width: var(--marao-navbar-route-size);
}
.button {
  width: 40px;
  max-width: 40px;
  height: 40px;
  border-radius: 50%;
}
""".strip(),
            },
        ],
    }


def _overview_view(
    config: dict[str, Any], include_root: str, dashboard_key: str, language: str = "en"
) -> dict[str, Any]:
    cards: list[Any] = []
    overview = config.get("overview") if isinstance(config.get("overview"), dict) else {}
    weather_entity = overview.get("weather_entity")
    if weather_entity:
        cards.append(
            {
                "type": "custom:button-card",
                "template": "hc_weather_card",
                "entity": weather_entity,
                "variables": {"show_forecast": True},
            }
        )

    nav_cards = []
    for domain, title, icon, popup_hash in [
        ("light", _t(language, "overview.lights"), "mdi:lightbulb-group-outline", "#overview-lights"),
        ("cover", _t(language, "overview.blinds"), "mdi:window-shutter", "#overview-blinds"),
        ("climate", _t(language, "overview.climate"), "mdi:thermostat", "#overview-climate"),
    ]:
        entities = _all_entities(config, domain)
        if entities:
            nav_cards.append(_overview_nav_card(title, icon, entities, popup_hash))

    battery_entities = _battery_entities(config)
    if battery_entities:
        nav_cards.append(
            _overview_nav_card(
                _t(language, "overview.maintenance"),
                "mdi:wrench",
                battery_entities,
                "#overview-maintenance",
            )
        )

    scene_entities = _overview_scene_entities(config)
    if scene_entities:
        nav_cards.append(
            _overview_nav_card(
                _t(language, "overview.scenes"),
                "mdi:palette-outline",
                scene_entities,
                "#overview-scenes",
            )
        )

    if nav_cards:
        cards.append({"type": "grid", "columns": 2, "square": False, "cards": nav_cards})

    for popup in _overview_popups(config, language):
        cards.append(TaggedScalar("!include", f"{include_root}/components/popups/{popup}.yaml"))

    cards.append(TaggedScalar("!include", f"{include_root}/components/navigation/navbar.yaml"))
    return {"title": _t(language, "nav.home"), "path": "overview", "icon": "mdi:home-variant", "cards": cards}


def _overview_nav_card(
    name: str, icon: str, entities: list[dict[str, Any]], navigation_path: str
) -> dict[str, Any]:
    ids = [entity["entity_id"] for entity in entities]
    return {
        "type": "custom:button-card",
        "template": "hc_navigation_card",
        "entity": ids[0],
        "name": name,
        "icon": icon,
        "label": _count_label_js(ids),
        "styles": {
            "icon": [{"color": "var(--color-orange)"}],
        },
        "tap_action": {
            "action": "navigate",
            "navigation_path": navigation_path,
            "haptic": "heavy",
        },
    }


def _overview_scene_entities(config: dict[str, Any]) -> list[dict[str, Any]]:
    overview = config.get("overview", {})
    return _entities_from_values(overview.get("scenes")) if isinstance(overview, dict) else []


def _scenes_popup(config: dict[str, Any], language: str = "en") -> dict[str, Any]:
    entities = _overview_scene_entities(config)
    primary = entities[0]["entity_id"] if entities else "sun.sun"
    return {
        **_popup_header(
            "#overview-scenes",
            primary,
            _t(language, "overview.scenes"),
            "mdi:palette-outline",
            "520px",
        ),
        "cards": [_scene_card(entity) for entity in entities],
    }


def _scene_card(entity: dict[str, Any]) -> dict[str, Any]:
    domain = entity["entity_id"].split(".", 1)[0]
    action = {"action": "toggle", "haptic": "heavy"}
    if domain == "scene":
        action = {
            "action": "perform-action",
            "perform_action": "scene.turn_on",
            "target": {"entity_id": entity["entity_id"]},
            "haptic": "heavy",
        }
    return {
        "type": "custom:button-card",
        "template": entity.get("template") or "hc_switch_card",
        "entity": entity["entity_id"],
        "name": entity.get("name") or _friendly_name(entity["entity_id"]),
        "icon": entity.get("icon") or "mdi:palette-outline",
        "tap_action": action,
    }


def _page_config(config: dict[str, Any], name: str) -> dict[str, Any]:
    pages = config.get("pages", {})
    page = pages.get(name, {}) if isinstance(pages, dict) else {}
    return page if isinstance(page, dict) else {}


def _page_entity(page: dict[str, Any], key: str) -> dict[str, Any] | None:
    entities = _entities_from_values(page.get(key))
    return entities[0] if entities else None


def _page_entities(
    page: dict[str, Any], key: str, default: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    return _entities_from_values(page[key]) if key in page else default


def _access_entities(config: dict[str, Any]) -> list[dict[str, Any]]:
    return [entity for entity in _all_entities(config) if _is_access_entity(entity)]


def _security_view(config: dict[str, Any], include_root: str, language: str = "en") -> dict[str, Any]:
    page = _page_config(config, "security")
    cards: list[Any] = []
    alarm = _page_entity(page, "alarm_entity")
    if alarm:
        cards.append(
            {
                "type": "custom:button-card",
                "template": alarm.get("template") or "hc_security_card",
                "entity": alarm["entity_id"],
                "name": alarm.get("name") or _friendly_name(alarm["entity_id"]),
            }
        )

    access_entities = _page_entities(page, "access_entities", _access_entities(config))
    if access_entities:
        cards.append(
            {
                "type": "grid",
                "columns": 2,
                "square": False,
                "cards": [_room_entity_card(entity) for entity in access_entities],
            }
        )

    cards.extend(_page_action_card(entity) for entity in _entities_from_values(page.get("actions")))
    cards.extend(_access_popup(entity, language) for entity in access_entities if _is_access_entity(entity))
    cards.append(TaggedScalar("!include", f"{include_root}/components/navigation/navbar.yaml"))
    return {
        "title": _t(language, "nav.security"),
        "path": "security",
        "icon": "mdi:shield-home",
        "cards": cards,
    }


def _page_action_card(entity: dict[str, Any]) -> dict[str, Any]:
    domain = entity["entity_id"].split(".", 1)[0]
    if domain == "button":
        action = {
            "action": "perform-action",
            "perform_action": "button.press",
            "target": {"entity_id": entity["entity_id"]},
            "haptic": "heavy",
        }
    else:
        action = {"action": "toggle", "haptic": "heavy"}
    card = {
        "type": "custom:button-card",
        "template": entity.get("template") or "hc_switch_card",
        "entity": entity["entity_id"],
        "name": entity.get("name") or _friendly_name(entity["entity_id"]),
        "show_state": False,
        "tap_action": action,
    }
    if entity.get("icon"):
        card["icon"] = entity["icon"]
    return card


def _energy_view(config: dict[str, Any], include_root: str, language: str = "en") -> dict[str, Any]:
    page = _page_config(config, "energy")
    cards: list[Any] = []
    house_power = _page_entity(page, "house_power")
    if house_power:
        cards.append(
            _energy_graph_card(
                house_power, "House Power", "mdi:flash", "#energy-house-power"
            )
        )

    for fields, title in (
        (("month_energy", "month_cost"), "Month"),
        (("today_energy", "today_cost"), "Today"),
    ):
        summary_cards = [
            _energy_graph_card(
                entity,
                f"{title} {'Power' if field.endswith('energy') else 'Cost'}",
                "mdi:calendar-month-outline" if title == "Month" else "mdi:calendar-today-outline",
                f"#energy-{'month' if title == 'Month' else 'today'}",
            )
            for field in fields
            if (entity := _page_entity(page, field))
        ]
        if summary_cards:
            cards.append({"type": "grid", "columns": 2, "square": False, "cards": summary_cards})

    load_cards = []
    for load in page.get("loads", []):
        if not isinstance(load, dict):
            continue
        power = _page_entity(load, "power_entity")
        if not power:
            continue
        toggle_entity = load.get("toggle_entity")
        variables = load.get("variables") if isinstance(load.get("variables"), dict) else {}
        if toggle_entity:
            variables = {"toggle_entity": toggle_entity, **variables}
        load_cards.append(
            {
                "type": "custom:button-card",
                "template": load.get("template") or (
                    "hc_toggle_graph_card" if toggle_entity else "hc_graph_card"
                ),
                "entity": power["entity_id"],
                "name": load.get("name") or power.get("name") or _friendly_name(power["entity_id"]),
                "icon": load.get("icon") or power.get("icon"),
                "variables": variables,
            }
        )
    if load_cards:
        cards.append({"type": "grid", "columns": 2, "square": False, "cards": load_cards})

    cards.extend(_entity_card(entity) for entity in _entities_from_values(page.get("appliances")))
    for popup_name in _energy_popups(config, language):
        cards.append(TaggedScalar("!include", f"{include_root}/components/popups/{popup_name}.yaml"))
    cards.append(TaggedScalar("!include", f"{include_root}/components/navigation/navbar.yaml"))
    return {"title": _t(language, "nav.energy"), "path": "energy", "icon": "mdi:lightning-bolt", "cards": cards}


def _energy_graph_card(
    entity: dict[str, Any], name: str, icon: str, popup_hash: str | None
) -> dict[str, Any]:
    card = {
        "type": "custom:button-card",
        "template": entity.get("template") or "hc_graph_card",
        "entity": entity["entity_id"],
        "name": entity.get("name") or name,
        "icon": entity.get("icon") or icon,
        "variables": {"show_graph_fill": True, "show_graph_line": True, "show_icon": True},
    }
    if popup_hash:
        card["tap_action"] = {
            "action": "navigate",
            "navigation_path": popup_hash,
            "haptic": "heavy",
        }
    return card


def _energy_popups(config: dict[str, Any], language: str = "en") -> dict[str, dict[str, Any]]:
    page = _page_config(config, "energy")
    groups = {
        "energy_house_power": ("#energy-house-power", "House Power", "mdi:flash", ["house_power"]),
        "energy_month": ("#energy-month", "Month Energy", "mdi:calendar-month-outline", ["month_energy", "month_cost"]),
        "energy_today": ("#energy-today", "Today Energy", "mdi:calendar-today-outline", ["today_energy", "today_cost"]),
    }
    popups: dict[str, dict[str, Any]] = {}
    for name, (popup_hash, title, icon, fields) in groups.items():
        entities = [entity for field in fields if (entity := _page_entity(page, field))]
        if entities:
            popups[name] = {
                **_popup_header(popup_hash, entities[0]["entity_id"], title, icon, "720px"),
                "cards": [_energy_graph_card(entity, title, icon, None) for entity in entities],
            }
    return popups


def _wallbox_view(config: dict[str, Any], include_root: str, language: str = "en") -> dict[str, Any]:
    page = _page_config(config, "wallbox")
    cards: list[Any] = []
    status = _page_entity(page, "status_entity")
    if status:
        cards.append(
            {
                "type": "custom:button-card",
                "template": status.get("template") or "hc_base_card",
                "entity": status["entity_id"],
                "name": status.get("name") or "Wallbox Status",
                "icon": status.get("icon") or "mdi:ev-station",
            }
        )

    metrics = []
    for key, name, icon in (
        ("charging_power_entity", "Charging Power", "mdi:flash"),
        ("max_current_entity", "Charging Current", "mdi:current-ac"),
    ):
        if entity := _page_entity(page, key):
            metrics.append(_energy_graph_card(entity, name, icon, ""))
    if metrics:
        cards.append({"type": "grid", "columns": 2, "square": False, "cards": metrics})

    control = _page_entity(page, "current_control_entity")
    if control:
        cards.append(
            {
                "type": "custom:button-card",
                "template": control.get("template") or "hc_number_card",
                "entity": control["entity_id"],
                "name": control.get("name") or "Charging Current",
            }
        )
        presets = page.get("current_presets", [6, 12, 16])
        if isinstance(presets, list) and all(isinstance(value, (int, float)) for value in presets):
            service = "input_number.set_value" if control["entity_id"].startswith("input_number.") else "number.set_value"
            cards.append(
                {
                    "type": "grid",
                    "columns": min(max(len(presets), 1), 3),
                    "square": False,
                    "cards": [
                        {
                            "type": "custom:button-card",
                            "entity": control["entity_id"],
                            "name": f"{value:g} A",
                            "show_state": False,
                            "show_icon": False,
                            "tap_action": {
                                "action": "perform-action",
                                "perform_action": service,
                                "target": {"entity_id": control["entity_id"]},
                                "data": {"value": value},
                                "haptic": "heavy",
                            },
                        }
                        for value in presets
                    ],
                }
            )

    if pause_resume := _page_entity(page, "pause_resume_entity"):
        cards.append(
            {
                "type": "custom:button-card",
                "template": pause_resume.get("template") or "hc_switch_card",
                "entity": pause_resume["entity_id"],
                "name": pause_resume.get("name") or "Pause / Resume",
                "icon": pause_resume.get("icon") or "mdi:pause-circle",
            }
        )
    cards.append(TaggedScalar("!include", f"{include_root}/components/navigation/navbar.yaml"))
    return {"title": _t(language, "nav.wallbox"), "path": "wallbox", "icon": "mdi:ev-station", "cards": cards}


def _media_players(config: dict[str, Any]) -> list[dict[str, Any]]:
    page = _page_config(config, "media")
    return _page_entities(page, "players", _all_entities(config, "media_player"))


def _media_view(config: dict[str, Any], include_root: str, language: str = "en") -> dict[str, Any]:
    players = _media_players(config)
    cards: list[Any] = []
    if players:
        cards.append(_room_entity_card(players[0]))
    for player in players:
        apple_tv = _apple_tv_options(player)
        apps = apple_tv["apps"] if apple_tv else []
        app_cards = [
            {
                "type": "custom:button-card",
                "template": "hc_media_app_card",
                "entity": player["entity_id"],
                "name": app.get("name") or app["source"],
                "icon": app.get("icon") or "mdi:play-box-outline",
                "variables": {"app_source": app["source"]},
            }
            for app in apps
            if isinstance(app, dict) and app.get("source")
        ]
        if app_cards:
            cards.append({"type": "grid", "columns": 2, "square": False, "cards": app_cards})
    cards.extend(_media_popup(player) for player in players)
    cards.append(TaggedScalar("!include", f"{include_root}/components/navigation/navbar.yaml"))
    return {"title": _t(language, "nav.media"), "path": "media", "icon": "mdi:television-play", "cards": cards}


def _rooms_view(
    config: dict[str, Any], include_root: str, dashboard_key: str, language: str = "en"
) -> dict[str, Any]:
    base = f"/{dashboard_key}"
    cards: list[Any] = []
    room_cards = []
    for room in config["rooms"]:
        lights = room["entities_by_domain"].get("light", [])
        all_room_entities = [
            entity
            for values in room["entities_by_domain"].values()
            for entity in values
            if entity.get("entity_id")
        ]
        primary_entity = (lights or all_room_entities or [{"entity_id": "sun.sun"}])[0]["entity_id"]
        room_cards.append(
            {
                "type": "custom:button-card",
                "template": "hc_room_card",
                "entity": primary_entity,
                "name": room["name"],
                "icon": room["icon"],
                "variables": {
                    "light_entities": [entity["entity_id"] for entity in lights],
                    "lights_target_entity": primary_entity,
                },
                "tap_action": {
                    "action": "navigate",
                    "navigation_path": f"{base}/{room['path']}",
                    "haptic": "heavy",
                },
            }
        )
    cards.append({"type": "grid", "columns": 2, "square": False, "cards": room_cards})
    cards.append(TaggedScalar("!include", f"{include_root}/components/navigation/navbar.yaml"))
    return {"title": _t(language, "nav.rooms"), "path": "rooms", "icon": "mdi:sofa", "cards": cards}


def _room_view(
    config: dict[str, Any],
    room: dict[str, Any],
    include_root: str,
    dashboard_key: str,
    language: str = "en",
) -> dict[str, Any]:
    return {
        "title": room["name"],
        "path": room["path"],
        "subview": True,
        "cards": _entity_container_cards(room, include_root, dashboard_key, language),
    }


def _custom_page_view(
    config: dict[str, Any],
    page: dict[str, Any],
    include_root: str,
    dashboard_key: str,
    language: str = "en",
) -> dict[str, Any]:
    return {
        "title": page["name"],
        "path": page["path"],
        "icon": page["icon"],
        "cards": _entity_container_cards(page, include_root, dashboard_key, language),
    }


def _entity_container_cards(
    container: dict[str, Any], include_root: str, dashboard_key: str, language: str
) -> list[Any]:
    cards: list[Any] = [
        _title_card(container["name"]),
    ]

    if container.get("columns") and (container["ordered_cards"] or container["cards"]):
        cards.append(
            {
                "type": "grid",
                "columns": container["columns"],
                "square": False,
                "cards": [
                    _page_shortcut_card(item, dashboard_key)
                    if item.get("page")
                    else _room_entity_card(item)
                    for item in container["ordered_cards"]
                ]
                + container["cards"],
            }
        )
    else:
        for domain, columns in [
            ("sensor", 2),
            ("binary_sensor", 2),
            ("camera", 1),
            ("lock", 1),
            ("cover", 1),
            ("climate", 1),
            ("fan", 1),
            ("switch", 2),
            ("input_boolean", 2),
            ("media_player", 1),
            ("vacuum", 1),
            ("number", 2),
            ("input_number", 2),
            ("light", 2),
            ("navigation", 2),
        ]:
            entities = container["entities_by_domain"].get(domain, [])
            if entities:
                cards.append(
                    {
                        "type": "grid",
                        "columns": columns,
                        "square": False,
                        "cards": [
                            _page_shortcut_card(entity, dashboard_key)
                            if domain == "navigation"
                            else _room_entity_card(entity)
                            for entity in entities
                        ],
                    }
                )

    if not container.get("columns"):
        cards.extend(container["cards"])
    cards.extend(
        _climate_mode_popup(entity, language)
        for entity in container["entities_by_domain"].get("climate", [])
    )
    cards.extend(
        _access_popup(entity, language)
        for domain in ("lock", "cover")
        for entity in container["entities_by_domain"].get(domain, [])
        if _is_access_entity(entity)
    )
    cards.extend(
        _media_popup(entity)
        for entity in container["entities_by_domain"].get("media_player", [])
    )
    cards.extend(
        _camera_popup(entity, language)
        for entity in container["entities_by_domain"].get("camera", [])
    )
    cards.append(TaggedScalar("!include", f"{include_root}/components/navigation/navbar.yaml"))
    return cards


def _page_shortcut_card(shortcut: dict[str, Any], dashboard_key: str) -> dict[str, Any]:
    card = {
        "type": "custom:button-card",
        "template": "hc_navigation_card",
        "entity": shortcut.get("entity_id") or "sun.sun",
        "name": shortcut.get("name") or _friendly_name(shortcut["page"]),
        "icon": shortcut.get("icon") or "mdi:open-in-new",
        "show_label": False,
        "tap_action": {
            "action": "navigate",
            "navigation_path": f"/{dashboard_key}/{shortcut['page']}",
            "haptic": "heavy",
        },
    }
    if isinstance(shortcut.get("variables"), dict):
        card["variables"] = shortcut["variables"]
    return card


def _action_bar_spacer() -> dict[str, Any]:
    return {
        "type": "custom:button-card",
        "color_type": "blank-card",
        "styles": {"card": [{"height": "128px"}]},
    }


def _title_card(name: str) -> dict[str, Any]:
    return {
        "type": "custom:button-card",
        "name": name,
        "tap_action": {"action": "none"},
        "hold_action": {"action": "none"},
        "styles": {
            "card": [
                {"background": "none"},
                {"box-shadow": "none"},
                {"padding": 0},
                {"margin-bottom": "20px"},
            ],
            "grid": [{"grid-template-areas": "'n'"}, {"grid-template-columns": "1fr"}],
            "name": [
                {"justify-self": "start"},
                {"font-weight": 800},
                {"font-size": "25px"},
            ],
        },
    }


def _entity_card(entity: dict[str, Any]) -> dict[str, Any]:
    domain = entity["entity_id"].split(".", 1)[0]
    template = entity.get("template") or _domain_template(entity)
    card = {
        "type": "custom:button-card",
        "template": template,
        "entity": entity["entity_id"],
        "name": entity.get("name") or _friendly_name(entity["entity_id"]),
    }
    if entity.get("icon"):
        card["icon"] = entity["icon"]
    variables = entity.get("variables")
    if isinstance(variables, dict):
        card["variables"] = variables
    elif domain == "climate":
        card["variables"] = {"show_graph": False, "show_mode_buttons": True}
    return card


def _domain_template(entity: dict[str, Any]) -> str:
    if _is_access_entity(entity):
        return "hc_access_card"
    return _sensor_template(entity) or DOMAIN_TEMPLATES[entity["entity_id"].split(".", 1)[0]]


def _room_entity_card(entity: dict[str, Any]) -> dict[str, Any]:
    if _is_access_entity(entity):
        variables = {
            "popup_hash": _access_popup_hash(entity["entity_id"]),
            **(entity.get("variables") if isinstance(entity.get("variables"), dict) else {}),
        }
        return _entity_card({**entity, "variables": variables})

    if not entity["entity_id"].startswith("climate."):
        if entity["entity_id"].startswith("camera."):
            variables = {
                "popup_hash": _camera_popup_hash(entity["entity_id"]),
                **(entity.get("variables") if isinstance(entity.get("variables"), dict) else {}),
            }
            return _entity_card({**entity, "variables": variables})
        if entity["entity_id"].startswith("media_player."):
            variables = {
                "popup_hash": _media_popup_hash(entity["entity_id"]),
                **(entity.get("variables") if isinstance(entity.get("variables"), dict) else {}),
            }
            return _entity_card({**entity, "variables": variables})
        return _entity_card(entity)

    variables = {
        "show_graph": False,
        "mode_selector_hash": _climate_mode_hash(entity["entity_id"]),
        **(entity.get("variables") if isinstance(entity.get("variables"), dict) else {}),
    }
    return _entity_card({**entity, "variables": variables})


def _climate_mode_hash(entity_id: str) -> str:
    return f"#climate-mode-{make_slug(entity_id.replace('.', '-'))}"


def _access_popup_hash(entity_id: str) -> str:
    return f"#access-{make_slug(entity_id.replace('.', '-'))}"


def _media_popup_hash(entity_id: str) -> str:
    return f"#media-{make_slug(entity_id.replace('.', '-'))}"


def _camera_popup_hash(entity_id: str) -> str:
    return f"#camera-{make_slug(entity_id.replace('.', '-'))}"


def _apple_tv_options(entity: dict[str, Any]) -> dict[str, Any] | None:
    configured = entity.get("apple_tv")
    if configured is False:
        return None
    options = configured if isinstance(configured, dict) else {}
    identity = " ".join(
        str(entity.get(key) or "")
        for key in ("entity_id", "name", "model", "device_model", "manufacturer")
    ).lower()
    if not configured and str(entity.get("media_type") or "").lower() != "apple_tv" and not any(
        token in identity for token in ("apple tv", "apple_tv", "appletv")
    ):
        return None

    object_id = entity["entity_id"].split(".", 1)[1]
    return {
        "remote_entity": options.get("remote_entity") or entity.get("remote_entity") or f"remote.{object_id}",
        "volume_remote_entity": options.get("volume_remote_entity") or entity.get("volume_remote_entity"),
        "apps": options.get("apps") or entity.get("apple_tv_apps") or [],
    }


def _media_button(
    entity_id: str,
    *,
    icon: str,
    service: str,
    name: str = "",
    data: dict[str, Any] | None = None,
    primary: bool = False,
    dpad: bool = False,
    hold_data: dict[str, Any] | None = None,
    target_entity_id: str | None = None,
) -> dict[str, Any]:
    target_entity_id = target_entity_id or entity_id
    card = {
        "type": "custom:button-card",
        "entity": entity_id,
        "name": name,
        "icon": icon,
        "show_name": False,
        "show_state": False,
        "show_label": False,
        "tap_action": {
            "action": "perform-action",
            "perform_action": service,
            "target": {"entity_id": target_entity_id},
            "haptic": "heavy",
        },
        "styles": {
            "grid": [{"grid-template-areas": "'i'"}],
            "card": [
                {"height": "88px" if dpad else "90px"},
                {"padding": 0 if dpad else "14px 10px"},
                {"border-radius": "30px" if dpad else "28px"},
                {"background": "var(--primary-color)" if primary else "var(--ha-card-background)"},
                {"box-shadow": "var(--ha-card-box-shadow)"},
            ],
            "icon": [{"width": "24px" if primary else ("42px" if dpad else "34px")}, {"color": "var(--active-text-color)" if primary else "var(--primary-text-color)"}],
            "img_cell": [
                {"width": "100%" if dpad else "52px"},
                {"height": "100%" if dpad else "52px"},
                {"border-radius": "50%" if not dpad else "0"},
                {"background": "none" if dpad else "var(--opacity-contrast-100)"},
                {"justify-self": "center"},
                {"align-self": "center"},
            ],
        },
    }
    if data:
        card["tap_action"]["data"] = data
    if hold_data is not None:
        card["hold_action"] = {
            "action": "perform-action",
            "perform_action": service,
            "target": {"entity_id": target_entity_id},
            "data": hold_data,
            "haptic": "heavy",
        }
    return card


def _remote_button(
    media_entity: str,
    remote_entity: str,
    command: str,
    *,
    icon: str,
    name: str = "",
    primary: bool = False,
    dpad: bool = False,
    hold: bool = False,
) -> dict[str, Any]:
    hold_data = {"command": command, "hold_secs": 1} if hold else None
    return _media_button(
        media_entity,
        icon=icon,
        name=name,
        service="remote.send_command",
        data={"command": command},
        primary=primary,
        dpad=dpad,
        hold_data=hold_data,
        target_entity_id=remote_entity,
    )


def _media_popup(entity: dict[str, Any]) -> dict[str, Any]:
    entity_id = entity["entity_id"]
    name = entity.get("name") or _friendly_name(entity_id)
    apple_tv = _apple_tv_options(entity)
    if not apple_tv:
        controls = [
            _media_button(entity_id, icon="mdi:skip-previous", name="Previous", service="media_player.media_previous_track"),
            _media_button(entity_id, icon="mdi:play", name="Play", service="media_player.media_play_pause", primary=True),
            _media_button(entity_id, icon="mdi:skip-next", name="Next", service="media_player.media_next_track"),
        ]
        return {
            **_popup_header(_media_popup_hash(entity_id), entity_id, name, "mdi:music", "420px"),
            "cards": [{"type": "grid", "columns": 3, "square": False, "cards": controls}],
        }

    media_controls: list[dict[str, Any]] = []
    apps = [app for app in apple_tv["apps"] if isinstance(app, dict) and app.get("source")]
    if apps:
        media_controls.append(
            {
                "type": "grid",
                "columns": 2,
                "square": False,
                "cards": [
                    {
                        "type": "custom:button-card",
                        "template": "hc_media_app_card",
                        "entity": entity_id,
                        "name": app.get("name") or app["source"],
                        "icon": app.get("icon") or "mdi:play-box-outline",
                        "variables": {"app_source": app["source"]},
                    }
                    for app in apps
                ],
            }
        )

    remote_entity = apple_tv["remote_entity"]
    media_controls.extend(
        [
            {"type": "grid", "columns": 3, "square": False, "cards": [
                _remote_button(entity_id, remote_entity, "menu", icon="mdi:arrow-u-left-top", name="Back"),
                _remote_button(entity_id, remote_entity, "up", icon="mdi:chevron-up", dpad=True, hold=True),
                _remote_button(entity_id, remote_entity, "top_menu", icon="mdi:home-outline", name="Home"),
            ]},
            {"type": "grid", "columns": 3, "square": False, "cards": [
                _remote_button(entity_id, remote_entity, "left", icon="mdi:chevron-left", dpad=True, hold=True),
                _remote_button(entity_id, remote_entity, "select", icon="mdi:checkbox-blank-circle", primary=True, dpad=True, hold=True),
                _remote_button(entity_id, remote_entity, "right", icon="mdi:chevron-right", dpad=True, hold=True),
            ]},
            {"type": "grid", "columns": 3, "square": False, "cards": [
                _media_button(entity_id, icon="mdi:rewind-10", name="Back 10 seconds", service="media_player.media_seek", data={"seek_position": "[[[ const position = Number(entity?.attributes?.media_position ?? 0); const updatedAt = entity?.attributes?.media_position_updated_at; const elapsed = entity?.state === 'playing' && updatedAt ? Math.max((Date.now() - Date.parse(updatedAt)) / 1000, 0) : 0; return Math.max(Math.round(position + elapsed - 10), 0); ]]]"}),
                _remote_button(entity_id, remote_entity, "down", icon="mdi:chevron-down", dpad=True, hold=True),
                _media_button(entity_id, icon="mdi:fast-forward-30", name="Forward 30 seconds", service="media_player.media_seek", data={"seek_position": "[[[ const position = Number(entity?.attributes?.media_position ?? 0); const updatedAt = entity?.attributes?.media_position_updated_at; const elapsed = entity?.state === 'playing' && updatedAt ? Math.max((Date.now() - Date.parse(updatedAt)) / 1000, 0) : 0; const target = Math.round(position + elapsed + 30); const duration = Number(entity?.attributes?.media_duration); return Number.isFinite(duration) ? Math.min(target, duration) : target; ]]]"}),
            ]},
        ]
    )
    volume_remote = apple_tv["volume_remote_entity"]
    volume_down = _remote_button(entity_id, volume_remote, "KEY_VOLDOWN", icon="mdi:volume-minus", name="Volume down") if volume_remote else _media_button(entity_id, icon="mdi:volume-minus", name="Volume down", service="media_player.volume_down")
    volume_up = _remote_button(entity_id, volume_remote, "KEY_VOLUP", icon="mdi:volume-plus", name="Volume up") if volume_remote else _media_button(entity_id, icon="mdi:volume-plus", name="Volume up", service="media_player.volume_up")
    media_controls.append(
        {"type": "grid", "columns": 3, "square": False, "cards": [
            volume_down,
            _media_button(entity_id, icon="mdi:play", name="Play", service="media_player.media_play_pause", primary=True),
            volume_up,
        ]}
    )
    return {
        **_popup_header(_media_popup_hash(entity_id), entity_id, name, "mdi:remote-tv", "780px"),
        "cards": media_controls,
    }


def _camera_popup(entity: dict[str, Any], language: str = "en") -> dict[str, Any]:
    entity_id = entity["entity_id"]
    variables = entity.get("variables") if isinstance(entity.get("variables"), dict) else {}
    events_card: dict[str, Any] = {
        "type": "custom:marao-camera-events-card",
        "entity": entity_id,
        "title": _t(language, "camera.events"),
    }
    for option in (
        "event_provider",
        "frigate_camera",
        "frigate_instance_id",
        "unifi_protect_media_source",
    ):
        value = entity.get(option) or variables.get(option)
        if value:
            events_card[option] = value
    event_limit = entity.get("event_limit") or variables.get("event_limit")
    if event_limit:
        events_card["limit"] = event_limit

    return {
        **_popup_header(
            _camera_popup_hash(entity_id),
            entity_id,
            entity.get("name") or _friendly_name(entity_id),
            entity.get("icon") or "mdi:cctv",
            "780px",
        ),
        "cards": [events_card],
    }


def _is_access_entity(entity: dict[str, Any]) -> bool:
    entity_id = entity["entity_id"]
    domain = entity_id.split(".", 1)[0]
    if domain == "lock":
        return True
    if domain != "cover":
        return False
    device_class = str(entity.get("device_class") or "").lower()
    name = f"{entity_id} {entity.get('name') or ''}".lower()
    return device_class in {"door", "garage", "gate"} or any(
        token in name for token in ("door", "garage", "gate")
    )


def _access_action_card(
    entity: dict[str, Any],
    *,
    name: str,
    icon: str,
    service: str,
    label_key: str,
    requires_hold: bool,
    color: str,
    requires_slide: bool = False,
) -> dict[str, Any]:
    return {
        "type": "custom:button-card",
        "template": (
            "hc_access_slide_action_card"
            if requires_slide
            else ("hc_access_hold_action_card" if requires_hold else "hc_access_action_card")
        ),
        "entity": entity["entity_id"],
        "name": name,
        "icon": icon,
        "variables": {
            "action_service": service,
            "action_requires_hold": requires_hold,
            "action_label_key": label_key,
            "action_color": color,
        },
    }


def _access_popup(entity: dict[str, Any], language: str = "en") -> dict[str, Any]:
    domain = entity["entity_id"].split(".", 1)[0]
    name = entity.get("name") or _friendly_name(entity["entity_id"])
    if domain == "lock":
        actions = [
            _access_action_card(
                entity,
                name=_t(language, "common.unlock"),
                icon="mdi:lock-open-variant",
                service="lock.unlock",
                label_key="common.unlock",
                requires_hold=False,
                requires_slide=True,
                color="var(--color-red)",
            ),
            _access_action_card(
                entity,
                name=_t(language, "common.lock"),
                icon="mdi:lock",
                service="lock.lock",
                label_key="common.lock",
                requires_hold=False,
                color="var(--color-green)",
            ),
        ]
        icon = "mdi:lock"
    else:
        device_class = str(entity.get("device_class") or "").lower()
        icon = "mdi:garage" if device_class == "garage" else "mdi:door"
        actions = [
            _access_action_card(
                entity,
                name=_t(language, "common.open"),
                icon=f"{icon}-open" if icon == "mdi:garage" else "mdi:door-open",
                service="cover.open_cover",
                label_key="common.open",
                requires_hold=False,
                requires_slide=True,
                color="var(--color-red)",
            ),
            _access_action_card(
                entity,
                name=_t(language, "common.close"),
                icon=icon if icon == "mdi:garage" else "mdi:door-closed",
                service="cover.close_cover",
                label_key="common.close",
                requires_hold=False,
                color="var(--color-green)",
            ),
        ]

    popup_cards = [{"type": "grid", "columns": 1, "square": False, "cards": actions}]
    return {
        **_popup_header(_access_popup_hash(entity["entity_id"]), entity["entity_id"], name, icon, "420px"),
        "cards": popup_cards,
    }


def _climate_mode_popup(entity: dict[str, Any], language: str = "en") -> dict[str, Any]:
    return {
        **_popup_header(
            _climate_mode_hash(entity["entity_id"]),
            entity["entity_id"],
            f"{entity.get('name') or _friendly_name(entity['entity_id'])} {_t(language, 'climate.mode_suffix')}",
            "mdi:thermostat",
            "620px",
        ),
        "cards": [
            _entity_card(
                {
                    **entity,
                    "variables": {
                        "show_graph": False,
                        "show_mode_buttons": True,
                        **(
                            entity.get("variables")
                            if isinstance(entity.get("variables"), dict)
                            else {}
                        ),
                    },
                }
            )
        ],
    }


def _sensor_template(entity: dict[str, Any]) -> str | None:
    if entity["entity_id"].startswith("sensor.") and entity.get("device_class") == "battery":
        return "hc_battery_card"
    return None


def _entity_popup(config: dict[str, Any], domain: str, language: str = "en") -> dict[str, Any]:
    entities = _all_entities(config, domain)
    names = {
        "light": ("#overview-lights", _t(language, "overview.lights"), "mdi:lightbulb-group-outline", "920px"),
        "climate": ("#overview-climate", _t(language, "overview.climate"), "mdi:thermostat", "760px"),
        "cover": ("#overview-blinds", _t(language, "overview.blinds"), "mdi:window-shutter", "820px"),
    }
    popup_hash, name, icon, height = names[domain]
    primary = entities[0]["entity_id"] if entities else "sun.sun"
    entity_cards = []
    for entity in entities:
        popup_entity = {**entity, "name": f"{entity['name']} - {entity['room_name']}"}
        if domain == "cover":
            popup_entity["template"] = "hc_cover_card"
        card = _entity_card(popup_entity)
        if domain == "light":
            entity_cards.append(
                {
                    "type": "conditional",
                    "conditions": [{"entity": entity["entity_id"], "state": "on"}],
                    "card": card,
                }
            )
        else:
            entity_cards.append(card)
    cards = entity_cards if domain == "climate" else [_popup_grid(entity_cards)]
    return {**_popup_header(popup_hash, primary, name, icon, height), "cards": cards}


def _maintenance_popup(config: dict[str, Any], language: str = "en") -> dict[str, Any]:
    entities = _battery_entities(config)
    primary = entities[0]["entity_id"] if entities else "sun.sun"
    return {
        **_popup_header(
            "#overview-maintenance",
            primary,
            _t(language, "overview.maintenance"),
            "mdi:wrench",
            "680px",
        ),
        "cards": [
            {
                **_popup_grid([_entity_card(entity) for entity in entities]),
            }
        ],
    }


def _popup_grid(cards: list[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "grid", "columns": 1, "square": False, "cards": cards}


def _battery_entities(config: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        entity
        for entity in _all_entities(config, "sensor")
        if entity.get("device_class") == "battery" or "battery" in entity["entity_id"]
    ]


def _overview_popups(
    config: dict[str, Any], language: str = "en"
) -> dict[str, dict[str, Any]]:
    popups = {
        name: _entity_popup(config, domain, language)
        for name, domain in (
            ("overview_lights", "light"),
            ("overview_blinds", "cover"),
            ("overview_climate", "climate"),
        )
        if _all_entities(config, domain)
    }
    if _battery_entities(config):
        popups["overview_maintenance"] = _maintenance_popup(config, language)
    if _overview_scene_entities(config):
        popups["overview_scenes"] = _scenes_popup(config, language)
    return popups


def _popup_header(
    popup_hash: str, entity_id: str, name: str, icon: str, height: str
) -> dict[str, Any]:
    return {
        "type": "custom:bubble-card",
        "card_type": "pop-up",
        "hash": popup_hash,
        "button_type": "state",
        "entity": entity_id,
        "name": name,
        "icon": icon,
        "show_icon": True,
        "show_name": True,
        "show_state": True,
        "scrolling_effect": False,
        "close_by_clicking_outside": True,
        "styles": (
            ".bubble-pop-up,\n"
            ".bubble-pop-up-container {\n"
            "  overscroll-behavior: contain !important;\n"
            "  touch-action: pan-y !important;\n"
            "}\n"
            ".bubble-pop-up-container {\n"
            "  height: 100% !important;\n"
            "  align-items: stretch !important;\n"
            "  align-content: start !important;\n"
            "  justify-content: flex-start !important;\n"
            "}\n"
            ".bubble-pop-up {\n"
            "  position: fixed !important;\n"
            "  inset: auto 0 0 0 !important;\n"
            f"  height: min({height}, 80vh) !important;\n"
            "  max-height: 80vh !important;\n"
            "  margin: 0 !important;\n"
            "  overflow-y: auto !important;\n"
            "}\n"
            ".bubble-pop-up-container > .bubble-cards-container,\n"
            ".bubble-pop-up-container > ha-sortable {\n"
            "  align-self: stretch !important;\n"
            "  margin-top: 16px !important;\n"
            "}\n"
        ),
    }


def _count_label_js(entity_ids: list[str]) -> str:
    ids = ", ".join(repr(entity_id) for entity_id in entity_ids)
    return (
        "[[[\n"
        f"  const ids = [{ids}];\n"
        "  const active = ids.filter((id) => {\n"
        "    const state = states[id]?.state;\n"
        "    return state && !['off', 'closed', 'closing', 'unavailable', 'unknown'].includes(state);\n"
        "  }).length;\n"
        "  const t = window.MaraoDashboard?.localize || ((key, _hass, values = {}) => key === 'common.active_count' ? `${values.count} active` : 'All off');\n"
        "  return active ? t('common.active_count', hass, { count: active }) : t('common.all_off', hass);\n"
        "]]]\n"
    )
