"""Generate Marao Dashboard dashboard YAML from dashboard definitions."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, replace
import json
import math
import os
from pathlib import Path
import re
import tempfile
import unicodedata
from typing import Any, Callable, Iterable

import yaml

from .const import (
    BASE_DASHBOARD_ICON,
    BASE_DASHBOARD_NAME,
    BASE_DASHBOARD_SLUG,
    BASE_DASHBOARD_THEME,
    DASHBOARD_KEY_PREFIX,
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

ENERGY_UNITS = {
    "mW": ("power", .001), "W": ("power", 1), "kW": ("power", 1000),
    "MW": ("power", 1e6), "GW": ("power", 1e9),
    "Wh": ("energy", 1), "kWh": ("energy", 1000), "MWh": ("energy", 1e6),
    "GWh": ("energy", 1e9), "J": ("energy", 1 / 3600), "Ws": ("energy", 1 / 3600),
    "kJ": ("energy", 1000 / 3600), "MJ": ("energy", 1e6 / 3600), "GJ": ("energy", 1e9 / 3600),
}
ENERGY_FORMAT_TEMPLATES = {
    "hc_graph_card", "hc_toggle_graph_card", "hc_sensor_card", "hc_base_card", "hc_switch_card", "hc_energy_period_card",
}

MANIFEST_NAME = ".marao-generated.json"
GENERATION_CONTRACT_VERSION = 3
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
        "overview.scenes_empty": "No scenes configured.",
        "energy.house_power": "House Power",
        "energy.month_power": "Month Power",
        "energy.today_power": "Today Power",
        "energy.month_cost": "Month Cost",
        "energy.today_cost": "Today Cost",
        "wallbox.status": "Wallbox Status",
        "wallbox.charging_power": "Charging Power",
        "wallbox.current": "Charging Current",
        "wallbox.pause_resume": "Pause / Resume",
        "security.alarm": "Alarm",
        "media.player": "Media player",
        "access.open": "Open",
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
        "overview.scenes_empty": "Nenhum cenário configurado.",
        "energy.house_power": "Potência da casa",
        "energy.month_power": "Energia do mês",
        "energy.today_power": "Energia de hoje",
        "energy.month_cost": "Custo do mês",
        "energy.today_cost": "Custo de hoje",
        "wallbox.status": "Estado do carregador",
        "wallbox.charging_power": "Potência de carregamento",
        "wallbox.current": "Corrente de carregamento",
        "wallbox.pause_resume": "Pausar / Retomar",
        "security.alarm": "Alarme",
        "media.player": "Leitor multimédia",
        "access.open": "Abrir",
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


class NativeLovelaceCard(dict):
    """User-owned configs bypass retired Marao template rewriting."""


class MaraoDashboardDumper(yaml.SafeDumper):
    """YAML dumper that avoids anchors and supports HA tags."""

    def ignore_aliases(self, data: Any) -> bool:
        return True


class MaraoDashboardLoader(yaml.SafeLoader):
    """YAML loader that retains Home Assistant include tags for comparisons."""


def _represent_tagged_scalar(dumper: yaml.Dumper, data: TaggedScalar) -> yaml.Node:
    return dumper.represent_scalar(data.tag, data.value)


MaraoDashboardDumper.add_representer(TaggedScalar, _represent_tagged_scalar)
MaraoDashboardDumper.add_representer(NativeLovelaceCard, yaml.SafeDumper.represent_dict)


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


def dashboard_config_version(config: dict[str, Any]) -> int:
    """Reject incompatible source before normalization, backup or any write."""

    if not isinstance(config, dict):
        raise ValueError("Dashboard configuration must be a JSON object")
    version = config.get("config_version", 0)
    if type(version) is not int or version < 0:
        raise ValueError("config_version must be a nonnegative integer")
    if version > DASHBOARD_CONFIG_VERSION:
        raise ValueError(
            f"Dashboard config_version {version} is newer than supported format "
            f"{DASHBOARD_CONFIG_VERSION}; update Marao before using this configuration"
        )
    return version


def _explicit_room_membership(config, registry, areas):
    """Import legacy room instructions once, without saving registry metadata."""
    known = {area["area_id"]: area.get("name") for area in areas or []}
    for entity in registry or []:
        for prefix in ("", "device_"):
            if entity.get(prefix + "area_id"):
                known.setdefault(entity[prefix + "area_id"], entity.get(prefix + "area_name"))
    for room in config.get("rooms", []):
        if not isinstance(room, dict):
            raise ValueError("Each room must be an object")
        hint = room.get("area")
        matches = ({hint} if isinstance(hint, str) and hint in known else {
            area_id for area_id, name in known.items()
            if isinstance(hint, str) and name and make_slug(hint) == make_slug(name)
        })
        if len(matches) == 1:
            room["area"] = next(iter(matches))
        if "entities" not in room and hint:
            if registry is None or len(matches) != 1:
                raise ValueError(f"Cannot import legacy room {room.get('name', '')}: area is missing or ambiguous; provide explicit entities")
            if any(_matches_area(entity, room["area"]) and "has_state" not in entity for entity in registry):
                raise ValueError("Cannot import legacy room: entity state metadata is missing; provide explicit entities")
            room["entities"] = [
                entity["entity_id"] for entity in registry
                if _matches_area(entity, room["area"])
                and _is_enabled_visible(entity) and entity.get("has_state") is True
                and str(entity.get("entity_id", "")).split(".")[0] in SUPPORTED_DOMAINS
            ]
        room.setdefault("entities", [])
        if not any(key in room for key in ("include", "exclude", "overrides")):
            continue
        def entries(spec):
            if spec is None:
                return []
            if isinstance(spec, dict):
                if "entity_id" in spec or "page" in spec or spec.get("template") == "hc_entity_group_card":
                    return [spec]
                return [entry for values in spec.values() for entry in entries(values)]
            if isinstance(spec, str):
                return [spec]
            if isinstance(spec, list):
                return spec
            raise ValueError("Legacy room selections must be entity strings, lists or grouped objects")
        selected = list(entries(room["entities"]))
        def entity_id(entry):
            return entry if isinstance(entry, str) else entry.get("entity_id") if isinstance(entry, dict) else None
        for entry in entries(room.pop("include", None)):
            indexes = [index for index, value in enumerate(selected) if entity_id(entry) and entity_id(value) == entity_id(entry)]
            if not indexes:
                selected.append(entry)
            elif isinstance(entry, dict):
                for index in indexes:
                    previous = selected[index]
                    selected[index] = {**(previous if isinstance(previous, dict) else {"entity_id": previous}), **entry}
        excluded = {entity_id(entry) for entry in entries(room.pop("exclude", None))}
        overrides = room.pop("overrides", {}) or {}
        if not isinstance(overrides, dict):
            raise ValueError("Legacy room overrides must be an object")
        room["entities"] = []
        for entry in selected:
            identifier = entity_id(entry)
            if identifier and identifier in excluded:
                continue
            override = overrides.get(identifier)
            if isinstance(override, dict):
                entry = {**(entry if isinstance(entry, dict) else {"entity_id": identifier}), **override, "entity_id": identifier}
            room["entities"].append(entry)


def _ordered_pages(config, registry, areas):
    from .page_migration import convert_legacy_pages

    for room in config.get("rooms", []):
        if not isinstance(room, dict):
            raise ValueError("Each room must be an object")
        if any(key in room for key in ("include", "exclude", "overrides")):
            raise ValueError("Current room selections use explicit entities; import legacy include/exclude/overrides before editing")
        if room.get("entities") is None:
            room["entities"] = []
    converted = convert_legacy_pages(config, registry)
    config.clear()
    config.update(converted)


DASHBOARD_CONFIG_MIGRATIONS: tuple[Callable[..., None], ...] = (_explicit_room_membership, _ordered_pages)
DASHBOARD_CONFIG_VERSION = len(DASHBOARD_CONFIG_MIGRATIONS)


def migrate_dashboard_config(
    config: dict[str, Any], registry_entities: Iterable[dict[str, Any]] | None = None,
    areas: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Convert a private copy; explicit room contents remain authoritative."""

    version = dashboard_config_version(config)
    if version == 0 and "views" in config and "title" in config and "name" not in config:
        from .page_migration import convert_native_storage_dashboard
        return convert_native_storage_dashboard(config)
    converted = deepcopy(config)
    if not isinstance(converted.get("rooms", []), list):
        raise ValueError("rooms must be a list")
    registry = list(registry_entities) if registry_entities is not None else None
    for source_version in range(version, DASHBOARD_CONFIG_VERSION):
        DASHBOARD_CONFIG_MIGRATIONS[source_version](converted, registry, areas)
        converted["config_version"] = source_version + 1
    for room in converted.get("rooms", []):
        if not isinstance(room, dict):
            raise ValueError("Each room must be an object")
        if any(key in room for key in ("include", "exclude", "overrides")):
            raise ValueError("Current room selections use explicit entities; import legacy include/exclude/overrides before editing")
        if room.get("entities") is None:
            room["entities"] = []
    if converted.get("config_version") == 2:
        normalize_config(converted)
    return converted


def parse_dashboard_config(source: str) -> dict[str, Any]:
    """Use one strict JSON boundary for files, preview and editor saves."""
    def reject_nonfinite(value):
        raise ValueError("Dashboard JSON numbers must be finite")
    def parse_float(value):
        number = float(value)
        if not math.isfinite(number):
            reject_nonfinite(value)
        return number
    try:
        config = json.loads(source, parse_constant=reject_nonfinite, parse_float=parse_float)
    except json.JSONDecodeError as err:
        raise ValueError(f"Invalid dashboard JSON at line {err.lineno}, column {err.colno}: {err.msg}") from err

    if not isinstance(config, dict):
        raise ValueError("Dashboard JSON must be an object")
    dashboard_config_version(config)
    if config.get("config_version") == 2:
        normalize_config(config)
    return config


def load_dashboard_config(path: str | Path) -> dict[str, Any]:
    """Load a dashboard JSON config without changing the file."""
    return parse_dashboard_config(Path(path).read_text(encoding="utf-8"))


def write_dashboard_config(config: dict[str, Any], path: str | Path) -> None:
    """Write a dashboard JSON config without touching generated YAML."""

    dashboard_config_version(config)
    target = Path(path)
    _write_text(target, json.dumps(config, indent=2, ensure_ascii=False) + "\n")


def ensure_dashboard_config(
    path: str | Path, registry_entities: Iterable[dict[str, Any]]
) -> dict[str, Any]:
    """Create a starter dashboard JSON config if it does not exist."""

    target = Path(path)
    if target.exists():
        return migrate_dashboard_config(load_dashboard_config(target), list(registry_entities))

    config = build_base_dashboard_config(list(registry_entities))
    write_dashboard_config(config, target)
    return config


def migrate_legacy_theme(config: dict[str, Any]) -> bool:
    theme = config.get("theme")
    if not isinstance(theme, str) or theme not in (
        "Marao Dashboard Gold",
        "Marao Dashboard Peach",
    ):
        return False
    config["theme"] = BASE_DASHBOARD_THEME
    return True


def normalize_config(config: dict[str, Any]) -> dict[str, Any]:
    """Normalize and validate a dashboard configuration."""

    dashboard_config_version(config)
    config = deepcopy(config)

    if "show_cache_reset" in config and not isinstance(config["show_cache_reset"], bool):
        raise ValueError("Show cache reset button must be a boolean.")

    name = str(config.get("name") or "").strip()
    if not name:
        raise ValueError("Dashboard configuration requires a non-empty name")

    if config.get("config_version") == 2:
        from .editor import EDITOR_CATALOG
        from .page_model import validate_pages

        validate_pages(config, {card["id"]: card["domains"] for card in EDITOR_CATALOG["cards"]})
        if config.get("theme") is not None and not isinstance(config["theme"], str):
            raise ValueError("theme must be a string")
        if config.get("icon") is not None and not isinstance(config["icon"], str):
            raise ValueError("icon must be a string")
        config.update(name=name, slug=make_slug(config.get("slug") or name),
                      theme=config.get("theme") or BASE_DASHBOARD_THEME,
                      icon=config.get("icon") or BASE_DASHBOARD_ICON)
        migrate_legacy_theme(config)
        return config

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

    for route in navigation or []:
        if isinstance(route, str):
            valid = bool(route.strip())
        elif isinstance(route, dict) and "page" in route:
            valid = isinstance(route["page"], str) and bool(route["page"].strip())
        else:
            valid = (isinstance(route, dict) and isinstance(route.get("url"), str) and bool(route["url"].strip())
                     and isinstance(route.get("label"), str) and bool(route["label"].strip()))
        if not valid:
            raise ValueError("Navigation entries require a page or a labeled URL")

    configured_theme = config.get("theme")
    if configured_theme is not None and not isinstance(configured_theme, str):
        raise ValueError("theme must be a string")
    theme = configured_theme or BASE_DASHBOARD_THEME
    if theme in ("Marao Dashboard Gold", "Marao Dashboard Peach"):
        theme = BASE_DASHBOARD_THEME

    normalized = {**config}
    normalized["name"] = name
    normalized["slug"] = make_slug(config.get("slug") or name)
    normalized["theme"] = theme
    normalized["icon"] = config.get("icon") or BASE_DASHBOARD_ICON
    normalized["rooms"] = rooms
    normalized["overview"] = overview
    normalized["pages"] = pages
    return normalized


def resolve_dashboard_config(
    config: dict[str, Any], registry_entities: Iterable[dict[str, Any]] | None = None
) -> dict[str, Any]:
    """Resolve rooms against HA registry/entity data and explicit overrides."""

    registry = list(registry_entities) if registry_entities is not None else None
    normalized = normalize_config(migrate_dashboard_config(config, registry))
    return _resolve_pages(normalized, registry)


def _resolve_legacy_config(normalized, registry=None, *, validate_source_units=True):
    """Resolve predecessor defaults only while converting historical pages."""
    registry = registry or []
    resolved_rooms = [
        _resolve_entity_container(room, registry, kind="room")
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
    resolved = {**normalized, "rooms": resolved_rooms, "pages": pages}
    group_ids: set[str] = set()
    legacy_groups = "entity_groups" not in resolved["overview"]
    groups = _legacy_overview_groups(resolved) if legacy_groups else resolved["overview"]["entity_groups"]
    if not isinstance(groups, list):
        raise ValueError("Overview Entity Groups must be a list.")
    member_metadata = [*registry, *_all_entities(resolved)]
    resolved["overview"]["entity_groups"] = [
        _resolve_entity_group(group, member_metadata, group_ids, legacy_overview=True)
        for group in groups
    ]
    if legacy_groups:
        for group in resolved["overview"]["entity_groups"]:
            group["_legacy_overview"] = True
    for container in [*resolved_rooms, *resolved_custom]:
        groups = [
            _resolve_entity_group(group, registry, group_ids)
            for group in _entity_groups_from_spec(container.get("entities"))
        ]
        if groups:
            container["entities_by_domain"]["entity_group"] = groups
            by_id = {group["id"]: group for group in groups}
            container["ordered_cards"] = [
                by_id[item["id"]] if item.get("template") == "hc_entity_group_card" else item
                for item in container["ordered_cards"]
            ]
    popup_hashes = set()
    for group in [*resolved["overview"]["entity_groups"], *[
        group for container in [*resolved_rooms, *resolved_custom]
        for group in container["entities_by_domain"].get("entity_group", [])
    ]]:
        for popup in [_entity_group_popup(group), *_entity_group_secondary_popups(group)]:
            popup_hash = popup["hash"]
            if not isinstance(popup_hash, str) or not re.fullmatch(r"#[a-zA-Z0-9][a-zA-Z0-9_-]*", popup_hash) or popup_hash in popup_hashes:
                raise ValueError(f"Entity Group has an invalid or conflicting popup hash: {group['id']}")
            popup_hashes.add(popup_hash)
    if popup_hashes:
        def check_owned_hashes(value, owned):
            if isinstance(value, dict):
                if value.get("type") == "custom:marao-popup-card" and isinstance(value.get("hash"), str) and value["hash"] in owned:
                    raise ValueError("Entity Group popup hash conflicts with another popup.")
                for child in value.values():
                    check_owned_hashes(child, owned)
            elif isinstance(value, list):
                for child in value:
                    check_owned_hashes(child, owned)

        for container in [resolved["overview"], *resolved_rooms, *resolved_custom]:
            groups = container.get("entity_groups", container.get("entities_by_domain", {}).get("entity_group", []))
            if not groups:
                continue
            owned = {popup["hash"] for group in groups for popup in [_entity_group_popup(group), *_entity_group_secondary_popups(group)]}
            if container is resolved["overview"]:
                ordinary_cards = [_scenes_popup(resolved)] if _overview_scene_entities(resolved) else []
            else:
                ordinary = {**container, "entities_by_domain": {key: value for key, value in container["entities_by_domain"].items() if key != "entity_group"}}
                ordinary_cards = _entity_container_cards(ordinary, "", dashboard_key_for_slug(resolved["slug"]), "en")
            check_owned_hashes(ordinary_cards, owned)
    _validate_energy_formatting(resolved, registry, validate_source_units=validate_source_units)
    return resolved


def _legacy_overview_groups(config, language="en"):
    sources = {}
    for room in config["rooms"]:
        spec = room.get("entities")
        if isinstance(spec, dict) and spec.get("template") == "hc_entity_group_card":
            continue
        entries = _flatten_dict_spec(spec) if isinstance(spec, dict) and "entity_id" not in spec else _entities_from_values(spec)
        for entry in entries:
            sources.setdefault(entry["entity_id"], entry)
    groups = []
    for kind, group_id, key, icon in [
        ("light", "overview-lights", "overview.lights", "mdi:lightbulb-group-outline"),
        ("cover", "overview-blinds", "overview.blinds", "mdi:window-shutter"),
        ("climate", "overview-climate", "overview.climate", "mdi:thermostat"),
        ("battery", "overview-maintenance", "overview.maintenance", "mdi:wrench"),
    ]:
        members = _battery_entities(config) if kind == "battery" else _all_entities(config, kind)
        if members:
            selected = [deepcopy(sources.get(member["entity_id"], {"entity_id": member["entity_id"]})) for member in members]
            groups.append({"template": "hc_entity_group_card", "id": group_id, "name": _t(language, key), "icon": icon,
                           "entity_type": kind, "popup_filter": "active" if kind == "light" else "all",
                           "entities": [member["entity_id"] if len(member) == 1 else member for member in selected]})
    return groups


def materialize_overview_groups(config, registry_entities=None, language="en"):
    """Expose editable legacy defaults on a copy; no source or history writes."""
    preview = deepcopy(config)
    if isinstance(preview.get("pages"), list):
        return preview
    if "entity_groups" not in (preview.get("overview") or {}):
        resolved = _resolve_legacy_config(normalize_config(preview), list(registry_entities or []), validate_source_units=False)
        preview["overview"] = {**(preview.get("overview") or {}), "entity_groups": _legacy_overview_groups(resolved, language)}
    return preview


def _entity_groups_from_spec(spec: Any) -> list[dict[str, Any]]:
    if isinstance(spec, dict) and spec.get("template") == "hc_entity_group_card":
        return [spec]
    values = spec.values() if isinstance(spec, dict) and "entity_id" not in spec and "page" not in spec else [spec]
    return [item for value in values for item in (value if isinstance(value, list) else [value])
            if isinstance(item, dict) and item.get("template") == "hc_entity_group_card"]


def _resolve_entity_group(group, registry, used_ids, *, legacy_overview=False, canonical_page=False):
    if not isinstance(group, dict) or group.get("template") != "hc_entity_group_card":
        raise ValueError("Entity Group must be an hc_entity_group_card object.")
    group_id = group.get("id")
    if not isinstance(group_id, str) or not re.fullmatch(r"[a-z][a-z0-9_-]{0,63}", group_id):
        raise ValueError("Entity Group requires a stable safe id.")
    if group_id in used_ids:
        raise ValueError(f"Duplicate Entity Group id: {group_id}")
    kind = group.get("entity_type")
    if kind not in ("light", "cover", "battery", "climate"):
        raise ValueError(f"Choose a supported Entity Group type: {group_id}")
    reserved = {"overview-lights": "light", "overview-blinds": "cover", "overview-climate": "climate", "overview-maintenance": "battery"}
    if group_id in reserved and not (legacy_overview or canonical_page):
        raise ValueError(f"Entity Group id is reserved: {group_id}")
    if not isinstance(group.get("name"), str) or not group["name"].strip():
        raise ValueError(f"Entity Group requires a name: {group_id}")
    if group.get("icon") is not None and not isinstance(group["icon"], str):
        raise ValueError(f"Entity Group icon must be a string: {group_id}")
    if "entity_id" in group or "page" in group:
        raise ValueError(f"Entity Group cannot have a primary entity or page: {group_id}")
    popup_filter = group.get("popup_filter", "active" if kind == "light" else "all")
    if popup_filter not in ("all", "active"):
        raise ValueError(f"Entity Group requires All entities or Active only: {group_id}")
    members = group.get("entities")
    if not isinstance(members, list):
        raise ValueError(f"Entity Group entities must be a list: {group_id}")
    metadata = {item["entity_id"]: item for item in registry}
    selected = {}
    templates = {"light": {"hc_light_card", "hc_base_card"}, "cover": {"hc_cover_card", "hc_access_card"},
                 "climate": {"hc_climate_card"}, "battery": {"hc_battery_card", "hc_sensor_card", "hc_base_card"}}
    for member in members:
        source = {"entity_id": member} if isinstance(member, str) else member
        if not isinstance(source, dict) or "page" in source or "entities" in source:
            raise ValueError(f"Entity Group members must be entity strings or objects, without nesting: {group_id}")
        entity_id = source.get("entity_id")
        if not isinstance(entity_id, str) or not re.fullmatch(r"[a-z0-9_]+\.[a-z0-9_]+", entity_id):
            raise ValueError(f"Entity Group has an invalid member: {group_id}")
        if source.get("variables") is not None and not isinstance(source["variables"], dict):
            raise ValueError(f"Entity Group member options must be an object: {group_id}")
        if any(source.get(key) is not None and not isinstance(source[key], str) for key in ("name", "icon")):
            raise ValueError(f"Entity Group member name and icon must be strings: {group_id}")
        domain = entity_id.split(".", 1)[0]
        live = metadata.get(entity_id)
        if domain != ("sensor" if kind == "battery" else kind) or (
            kind == "battery" and live is not None and live.get("device_class") != "battery"
            and source.get("template") != "hc_battery_card"
            and not ((legacy_overview or canonical_page) and group_id == "overview-maintenance" and "battery" in entity_id)
        ) or (source.get("template") is not None and (not isinstance(source["template"], str) or source["template"] not in templates[kind])):
            raise ValueError(f"Entity Group has an incompatible member: {group_id}, {entity_id}")
        selected[entity_id] = {**(live or {}), **selected.get(entity_id, {}), **source}
        selected[entity_id]["name"] = source.get("name") or selected[entity_id].get("name") or _friendly_name(entity_id)
    used_ids.add(group_id)
    return {**group, "popup_filter": popup_filter, "entities": list(selected.values())}


def _validate_energy_formatting(value: Any, registry: list[dict[str, Any]], *, validate_source_units=True) -> None:
    """Validate opt-in reading options against actual live source metadata."""
    units = {entity["entity_id"]: entity.get("unit_of_measurement") for entity in registry}
    metadata = {entity["entity_id"]: entity for entity in registry}

    def visit(item: Any) -> None:
        if isinstance(item, list):
            for child in item:
                visit(child)
            return
        if not isinstance(item, dict):
            return
        direct = item.get("type") == "custom:marao-energy-period-card"
        entity_id = item.get("entity_id") or item.get("entity")
        load_source = item.get("power_entity")
        if isinstance(load_source, dict):
            load_source = load_source.get("entity_id")
        template = item.get("template") or DOMAIN_TEMPLATES.get(str(entity_id).split(".")[0])
        options = item if direct else item.get("variables", {})
        eligible = direct or (
            item.get("type") in (None, "custom:marao-card")
            and (template in ENERGY_FORMAT_TEMPLATES or load_source)
        )
        if template == "hc_graph_card" and item.get("type") in (None, "custom:marao-card") and isinstance(options, dict) and "power_devices" in options:
            from .page_model import validate_power_devices
            main = options.get("graph_entity") or entity_id
            validate_power_devices(options, main)
            if validate_source_units and options["power_devices"]:
                sources = [main, *[member["entity_id"] for member in options["power_devices"]]]
                if any(units.get(source) and ENERGY_UNITS.get(units[source], (None,))[0] != "power" for source in sources):
                    raise ValueError("Power devices require power sensors in W or kW.")
        if (direct or template == "hc_energy_period_card") and isinstance(options, dict):
            from .page_model import validate_energy_options
            validate_energy_options(options)
            if validate_source_units:
                sources = ([entity_id] if options.get("calculate_cost") else []) + [member["entity_id"] for member in options.get("sub_entities", [])]
                if any(units.get(source) and ENERGY_UNITS.get(units[source], (None,))[0] != "energy" for source in sources):
                    raise ValueError("Cost calculations and breakdowns require energy sensors.")
                for member in options.get("sub_entities", []):
                    source = metadata.get(member.get("cost_entity"), {})
                    if source.get("unit_of_measurement") in ENERGY_UNITS or source.get("device_class") not in (None, "", "monetary"):
                        raise ValueError("Cost breakdown requires monetary sensors.")
        if eligible and isinstance(options, dict) and any(key in options for key in ("display_unit", "display_precision")):
            precision = options.get("display_precision")
            if "display_precision" in options and (type(precision) is not int or not 0 <= precision <= 6):
                raise ValueError("display_precision must be an integer between 0 and 6")
            if "display_unit" in options:
                target = options["display_unit"]
                if not isinstance(target, str) or target not in ENERGY_UNITS:
                    raise ValueError("display_unit must be a supported power or energy unit")
                sources = [options.get("power_entity")] if template == "hc_switch_card" else [entity_id or load_source]
                graph_source = options.get("graph_entity") or item.get("graph_entity")
                if graph_source and template in ("hc_graph_card", "hc_toggle_graph_card"):
                    sources.append(graph_source)
                for source_id in sources:
                    if not validate_source_units:
                        continue
                    source_unit = units.get(source_id) if isinstance(source_id, str) else None
                    if source_unit not in ENERGY_UNITS:
                        raise ValueError(f"display_unit requires a supported source unit for {source_id or 'the reading'}")
                    if ENERGY_UNITS[source_unit][0] != ENERGY_UNITS[target][0]:
                        raise ValueError(f"display_unit is incompatible with {source_id}")
        for child in item.values():
            visit(child)

    visit(value)


def _resolve_entity_container(
    container: Any,
    registry: list[dict[str, Any]],
    *,
    kind: str,
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
    _merge_entity_spec(collected, container.get("entities"))
    _merge_entity_spec(collected, container.get("include"))
    for entity_id in _entity_ids_from_spec(container.get("exclude")):
        collected.pop(entity_id, None)

    overrides = container.get("overrides") if isinstance(container.get("overrides"), dict) else {}
    for entity_id, override in overrides.items():
        if entity_id in collected and isinstance(override, dict):
            collected[entity_id].update(override)

    metadata = {}
    for entity in registry:
        _add_entity(metadata, entity)
    for entity_id, selected in collected.items():
        live = metadata.get(entity_id, {})
        collected[entity_id] = {**live, **selected}
        collected[entity_id]["name"] = selected.get("name") or live.get("name") or _friendly_name(entity_id)
    units = {entity["entity_id"]: entity.get("unit_of_measurement") for entity in registry}
    for entity_id, entity in collected.items():
        # Source units are live metadata, never saved overrides or legacy labels.
        entity["unit_of_measurement"] = units.get(entity_id)

    raw_cards = container.get("cards", [])
    if raw_cards is None:
        raw_cards = []
    if not isinstance(raw_cards, list) or any(not isinstance(card, dict) for card in raw_cards):
        raise ValueError(f"{kind} cards must be a list of Lovelace card objects")

    ordered_cards = _ordered_cards_from_spec(container.get("entities"), collected, overrides)
    occurrences: dict[str, list[dict[str, Any]]] = {}
    for entity in ordered_cards:
        if entity.get("entity_id"):
            occurrences.setdefault(entity["entity_id"], []).append(entity)
    entities_by_domain: dict[str, list[dict[str, Any]]] = {}
    for entity_id in collected:
        domain = entity_id.split(".", 1)[0]
        if domain in SUPPORTED_DOMAINS:
            entities_by_domain.setdefault(domain, []).extend(occurrences[entity_id])
    shortcuts = _page_shortcuts_from_spec(container.get("entities"))
    if shortcuts:
        entities_by_domain["navigation"] = shortcuts

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


def validate_dashboard_key(key: Any) -> str:
    """Keep route keys safe for literal YAML entries and navigation paths."""
    if not isinstance(key, str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", key):
        raise ValueError("Dashboard key must be a lowercase route without spaces or path separators")
    return key


def dashboard_identity(
    config: dict[str, Any], dashboard_key_override: str | None = None,
) -> GeneratedDashboard:
    """Describe saved dashboard ownership without resolving live readings."""
    normalized = normalize_config(config)
    slug = normalized["slug"]
    return GeneratedDashboard(
        slug=slug,
        dashboard_key=validate_dashboard_key(dashboard_key_override or dashboard_key_for_slug(slug)),
        title=normalized["name"],
        icon=normalized["icon"],
        filename=f"dashboard/MaraoDashboard/{slug}/dashboard.yaml",
        files=[],
    )


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
    return replace(
        dashboard_identity(resolved, dashboard_key_override),
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
    dashboard_key = validate_dashboard_key(dashboard_key_override or dashboard_key_for_slug(slug))
    output_dir = Path(output_base_dir) / slug
    files: list[str] = []

    include_root = f"{config_root}/dashboard/MaraoDashboard/{slug}"
    if isinstance(resolved["pages"], list):
        page_paths, card_files = _page_assets(resolved, include_root, dashboard_key, language)
    else:
        page_paths, card_files = _legacy_page_assets(resolved, include_root, dashboard_key, language)
    dashboard_views = [TaggedScalar("!include", f"{include_root}/{path}") for path in page_paths]

    plain_files: dict[str, Any] = {
        "dashboard.yaml": {
            "title": resolved["name"],
            "views": dashboard_views,
        },
        "components/navigation/navbar.yaml": _navigation_bar(
            resolved, dashboard_key, language
        ),
    }
    for relative_path, view in card_files.items():
        if relative_path.startswith("views/"):
            view.setdefault("theme", resolved["theme"])

    old_manifest = _load_generation_manifest(output_dir)
    custom_cards = _preflight_custom_cards(
        output_dir,
        card_files,
        old_manifest["containers"],
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    for relative_path, data in plain_files.items():
        _write_text(output_dir / relative_path, yaml_dump(_rewrite_external_card_types(data)))
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
            {"version": 1, "generated_contract": GENERATION_CONTRACT_VERSION,
             "plain": sorted(new_plain), "containers": sorted(new_containers)},
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


def _legacy_page_assets(resolved, include_root, dashboard_key, language):
    main_views = _main_view_paths(resolved)
    room_views = _room_view_paths(resolved)
    custom_views = _custom_view_paths(resolved)

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

    return [*main_views, *room_views, *custom_views], card_files


def _generated_relative_paths(config: dict[str, Any]) -> list[str]:
    if isinstance(config.get("pages"), list):
        _, assets = _page_assets(config, "", dashboard_key_for_slug(config["slug"]))
        return ["dashboard.yaml", MANIFEST_NAME, "components/navigation/navbar.yaml", *assets]
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


def _supports_native_card_output(output_dir: Path) -> bool:
    manifest = output_dir / MANIFEST_NAME
    # Contract 3 emits user-owned native types intentionally, including retired names.
    return manifest.is_file() and json.loads(manifest.read_text()).get("generated_contract", 0) >= 3


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
    if type(manifest.get("version")) is not int or manifest["version"] != 1:
        raise ValueError("Unsupported Marao generation manifest version")
    contract = manifest.get("generated_contract", 0)
    if type(contract) is not int or not 0 <= contract <= GENERATION_CONTRACT_VERSION:
        raise ValueError("Unsupported Marao generated contract; use the matching package and data backup")
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

    _write_bytes(target, text.encode("utf-8"))


def _fsync_directory(path: Path) -> None:
    directory = os.open(path, os.O_RDONLY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


def _write_bytes(target: Path, content: bytes) -> None:
    """Replace exact bytes and flush the directory entry for crash recovery."""

    missing_parents = []
    parent = target.parent
    while not parent.exists():
        missing_parents.append(parent)
        parent = parent.parent
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", dir=target.parent,
            prefix=f".{target.name}.", suffix=".tmp", delete=False,
        ) as stream:
            temporary = Path(stream.name)
            if target.exists():
                os.fchmod(stream.fileno(), target.stat().st_mode & 0o777)
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        temporary.replace(target)
        for directory in dict.fromkeys([target.parent, *(parent.parent for parent in missing_parents)]):
            _fsync_directory(directory)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


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
    data = _rewrite_external_card_types(data)
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


def _rewrite_external_card_types(value: Any) -> Any:
    """Translate retired upstream card types in generated Marao-owned YAML."""

    if isinstance(value, NativeLovelaceCard):
        return deepcopy(dict(value))
    if isinstance(value, dict):
        return {
            key: (
                {
                    "custom:button-card": "custom:marao-card",
                    "custom:bubble-card": "custom:marao-popup-card",
                    "custom:navbar-card": "custom:marao-navbar-card",
                    "custom:my-slider": "custom:marao-card",
                    "custom:my-slider-v2": "custom:marao-card",
                    "custom:mini-graph-card": "sensor",
                }.get(item, item)
                if key == "type" and isinstance(item, str)
                else _rewrite_external_card_types(item)
            )
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_rewrite_external_card_types(item) for item in value]
    return value


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
            "supported_features": entity.get("supported_features"),
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
    starter = {
        "config_version": 1,
        "name": BASE_DASHBOARD_NAME,
        "slug": BASE_DASHBOARD_SLUG,
        "theme": BASE_DASHBOARD_THEME,
        "icon": BASE_DASHBOARD_ICON,
        "overview": overview,
        "rooms": rooms,
    }
    return migrate_dashboard_config(materialize_overview_groups(starter, entities), entities)


def _is_enabled_visible(entity: dict[str, Any]) -> bool:
    return not entity.get("disabled_by") and not entity.get("hidden_by")


def _matches_area(entity: dict[str, Any], area: str) -> bool:
    return area == (entity.get("area_id") or entity.get("device_area_id"))


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
        "unit_of_measurement": entity.get("unit_of_measurement"),
        "supported_features": entity.get("supported_features"),
        "device_model": entity.get("device_model"),
        "manufacturer": entity.get("manufacturer"),
    }


def _merge_entity_spec(target: dict[str, dict[str, Any]], spec: Any) -> None:
    if isinstance(spec, dict) and spec.get("template") == "hc_entity_group_card":
        return
    if isinstance(spec, dict) and "entity_id" not in spec and "page" not in spec:
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
            entities.append({"entity_id": value})
        elif isinstance(value, dict) and isinstance(value.get("entity_id"), str):
            entity_id = value["entity_id"]
            entities.append(
                {
                    **value,
                    "entity_id": entity_id,
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
    values = list(spec.values()) if isinstance(spec, dict) and "entity_id" not in spec and "page" not in spec and spec.get("template") != "hc_entity_group_card" else [spec]
    shortcuts: list[dict[str, Any]] = []
    for value in values:
        entries = value if isinstance(value, list) else [value]
        for entry in entries:
            if isinstance(entry, dict) and isinstance(entry.get("page"), str):
                shortcuts.append({**entry, "template": "hc_navigation_card"})
    return shortcuts


def _ordered_cards_from_spec(
    spec: Any, collected: dict[str, dict[str, Any]], overrides: dict[str, Any]
) -> list[dict[str, Any]]:
    values = list(spec.values()) if isinstance(spec, dict) and "entity_id" not in spec and "page" not in spec and spec.get("template") != "hc_entity_group_card" else [spec]
    ordered: list[dict[str, Any]] = []
    seen: set[str] = set()
    for value in values:
        entries = value if isinstance(value, list) else [value]
        for entry in entries:
            if isinstance(entry, dict) and entry.get("template") == "hc_entity_group_card":
                ordered.append(deepcopy(entry))
                continue
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
            if isinstance(entity_id, str) and entity_id in collected:
                metadata = {key: collected[entity_id].get(key) for key in (
                    "entity_id", "name", "icon", "device_class", "unit_of_measurement",
                    "supported_features", "device_model", "manufacturer",
                )}
                occurrence = {**metadata, **_entities_from_values(entry)[0]}
                if isinstance(overrides.get(entity_id), dict):
                    occurrence.update(overrides[entity_id])
                occurrence["unit_of_measurement"] = metadata["unit_of_measurement"]
                ordered.append(occurrence)
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
    if isinstance(config.get("pages"), list):
        return _page_navigation_bar(config, dashboard_key, language)
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
        ("media", "mdi:television-play", "mdi:television-play", "nav.media", "media"),
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
        # Preserve the established automatic first-five selection.
        routes = list(available.values())[:5]
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
            {
                "type": "custom:marao-navbar-card",
                "routes": routes,
                **({"show_cache_reset": config["show_cache_reset"]} if "show_cache_reset" in config else {}),
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
                "type": "custom:marao-card",
                "template": "hc_weather_card",
                "entity": weather_entity,
                "variables": {"show_forecast": True},
            }
        )

    nav_cards = [_entity_group_card(group, language) for group in overview["entity_groups"]]

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
        "type": "custom:marao-card",
        "template": "hc_navigation_card",
        "entity": ids[0],
        "name": name,
        "icon": icon,
        "variables": {"summary_entities": ids} if all(entity.split(".")[0] not in {"sensor", "input_number", "number"} for entity in ids) else {},
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
    primary = entities[0]["entity_id"] if entities else None
    return {
        **_popup_header(
            "#overview-scenes",
            primary,
            _t(language, "overview.scenes"),
            "mdi:palette-outline",
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
        "type": "custom:marao-card",
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
                "type": "custom:marao-card",
                "template": alarm.get("template") or "hc_security_card",
                "entity": alarm["entity_id"],
                "name": alarm.get("name") or _friendly_name(alarm["entity_id"]),
            }
        )

    access_entities = _page_entities(page, "access_entities", _access_entities(config))
    if access_entities:
        cards.append(
            _control_grid([_room_entity_card(entity) for entity in access_entities], 2)
        )

    action_entities = _entities_from_values(page.get("actions"))
    cards.extend(_page_action_card(entity) for entity in action_entities)
    popup_entities = {entity["entity_id"]: entity for entity in [*access_entities, *action_entities]}
    cards.extend(
        _access_popup(entity, language)
        for entity in popup_entities.values()
        if _is_access_entity(entity) and not _is_open_only_access(entity)
    )
    cards.append(TaggedScalar("!include", f"{include_root}/components/navigation/navbar.yaml"))
    return {
        "title": _t(language, "nav.security"),
        "path": "security",
        "icon": "mdi:shield-home",
        "cards": cards,
    }


def _page_action_card(entity: dict[str, Any]) -> dict[str, Any]:
    if _is_access_entity(entity):
        return _room_entity_card(entity)
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
    if service := (entity.get("variables") or {}).get("action_service"):
        action = {"action": "call-service", "service": service, "entity_id": entity["entity_id"], "haptic": "heavy"}
    card = {
        "type": "custom:marao-card",
        "template": "hc_access_hold_action_card",
        "entity": entity["entity_id"],
        "name": entity.get("name") or _friendly_name(entity["entity_id"]),
        "show_state": False,
        "variables": deepcopy(entity.get("variables") or {}),
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

    period_cards = []
    for field, title, period, icon, popup in (
        ("month_energy", "Month Power", "month", "mdi:flash", "#energy-month-power"),
        ("today_energy", "Today Power", "day", "mdi:flash-outline", "#energy-today-power"),
        ("month_cost", "Month Cost", "month", "mdi:currency-eur", "#energy-month-cost"),
        ("today_cost", "Today Cost", "day", "mdi:cash-clock", "#energy-today-cost"),
    ):
        if entity := _page_entity(page, field):
            period_cards.append(_energy_period_card(entity, title, period, icon, popup))
    if period_cards:
        cards.extend(period_cards)

    load_cards = []
    for load in page.get("loads", []):
        if not isinstance(load, dict):
            continue
        power = _page_entity(load, "power_entity")
        if not power:
            continue
        toggle_entity = load.get("toggle_entity")
        variables = {
            **(power.get("variables") if isinstance(power.get("variables"), dict) else {}),
            **(load.get("variables") if isinstance(load.get("variables"), dict) else {}),
        }
        if toggle_entity:
            variables = {"toggle_entity": toggle_entity, **variables}
        load_cards.append(
            {
                "type": "custom:marao-card",
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
    variables = dict(
        entity.get("variables") if isinstance(entity.get("variables"), dict) else {}
    )
    if entity.get("graph_entity") and not variables.get("graph_entity"):
        variables["graph_entity"] = entity["graph_entity"]
    variables = {
        "show_graph_fill": True,
        "show_graph_line": True,
        "show_icon": True,
        **variables,
    }
    card = {
        "type": "custom:marao-card",
        "template": entity.get("template") or "hc_graph_card",
        "entity": entity["entity_id"],
        "name": entity.get("name") or name,
        "icon": entity.get("icon") or icon,
        "variables": variables,
    }
    if popup_hash:
        variables["history_popup"] = True
        variables["popup_hash"] = popup_hash
        card["tap_action"] = {
            "action": "navigate",
            "navigation_path": popup_hash,
            "haptic": "heavy",
        }
    return card


def _power_history_card(entity: dict[str, Any], title: str) -> dict[str, Any]:
    options = entity.get("variables") or {}
    return {
        "type": "custom:marao-power-history-card",
        "entity": options.get("graph_entity") or entity.get("graph_entity") or entity["entity_id"],
        "name": entity.get("name") or title,
        **{key: deepcopy(options[key]) for key in ("power_devices", "display_unit", "display_precision", "graph_color") if key in options},
    }


def _energy_period_card(
    entity: dict[str, Any], title: str, period: str, icon: str, popup_hash: str | None,
    *, popup: bool = False,
) -> dict[str, Any]:
    variables = entity.get("variables")
    variables = variables if isinstance(variables, dict) else {}
    return {
        "type": "custom:marao-energy-period-card",
        **{key: value for key, value in variables.items()
           if key in ("display_unit", "display_precision", "sub_entities", "calculate_cost", "cost_per_kwh")},
        "entity": entity["entity_id"],
        "name": entity.get("name") or title,
        "period": period,
        "popup_hash": popup_hash,
        "popup": popup,
        "icon": entity.get("icon") or icon,
    }


def _energy_popups(config: dict[str, Any], language: str = "en") -> dict[str, dict[str, Any]]:
    page = _page_config(config, "energy")
    groups = {
        "energy_house_power": ("#energy-house-power", "House Power", "mdi:flash", ["house_power"]),
        "energy_month_power": ("#energy-month-power", "Month Power", "mdi:flash", ["month_energy"]),
        "energy_today_power": ("#energy-today-power", "Today Power", "mdi:flash-outline", ["today_energy"]),
        "energy_month_cost": ("#energy-month-cost", "Month Cost", "mdi:currency-eur", ["month_cost"]),
        "energy_today_cost": ("#energy-today-cost", "Today Cost", "mdi:cash-clock", ["today_cost"]),
    }
    popups: dict[str, dict[str, Any]] = {}
    for name, (popup_hash, title, icon, fields) in groups.items():
        entities = [entity for field in fields if (entity := _page_entity(page, field))]
        if entities:
            popups[name] = {
                **_popup_header(popup_hash, entities[0]["entity_id"], entities[0].get("name") or title, entities[0].get("icon") or icon),
                "cards": [
                    _energy_period_card(
                        entity,
                        title,
                        "month" if "month" in name else "day" if "today" in name else "day",
                        icon,
                        None,
                        popup=True,
                    )
                    if name != "energy_house_power"
                    else _power_history_card(entity, title)
                    for entity in entities
                ],
            }
    return popups


def _wallbox_view(config: dict[str, Any], include_root: str, language: str = "en") -> dict[str, Any]:
    page = _page_config(config, "wallbox")
    cards: list[Any] = []
    status = _page_entity(page, "status_entity")
    if status:
        cards.append(
            {
                "type": "custom:marao-card",
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
        presets = page.get("current_presets", [])
        shortcuts = presets if isinstance(presets, list) and all(isinstance(value, (int, float)) for value in presets) else []
        cards.append(
            {
                "type": "custom:marao-card",
                "template": control.get("template") or "hc_wallbox_current_card",
                "entity": control["entity_id"],
                "name": control.get("name") or "Charging Current",
                "variables": {"shortcuts": shortcuts[:3]},
            }
        )

    if pause_resume := _page_entity(page, "pause_resume_entity"):
        cards.append(
            {
                "type": "custom:marao-card",
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
    for player in players:
        cards.append(_room_entity_card(player))
        apple_tv = _apple_tv_options(player)
        apps = apple_tv["apps"] if apple_tv else []
        app_cards = [
            {
                "type": "custom:marao-card",
                "template": "hc_media_app_card",
                "entity": player["entity_id"],
                "name": app.get("name") or app["source"],
                "icon": app.get("icon") or "mdi:play-box-outline",
                "show_state": False,
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
        primary_entity = (lights or all_room_entities or [{"entity_id": ""}])[0]["entity_id"]
        room_cards.append(
            {
                "type": "custom:marao-card",
                "template": "hc_room_card",
                **({"entity": primary_entity} if primary_entity else {}),
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


def _configured_name(item, language="en"):
    key = item.get("name_key")
    if key and item.get("name") == GENERATOR_TRANSLATIONS["en"].get(key):
        return _t(language, key)
    return item.get("name") or _friendly_name(item.get("entity_id") or item.get("path") or item.get("id") or "")


def _resolve_pages(config, registry=None, *, validate_source_units=True):
    """Validate and resolve each occurrence without persisting live metadata."""
    from .editor import EDITOR_CATALOG
    from .page_model import access_template, page_entries, page_sections, validate_pages

    templates = {card["id"]: card["domains"] for card in EDITOR_CATALOG["cards"]}
    validate_pages(config, templates)
    resolved = deepcopy(config)
    resolved.setdefault("slug", make_slug(resolved["name"]))
    resolved.setdefault("theme", BASE_DASHBOARD_THEME)
    resolved.setdefault("icon", BASE_DASHBOARD_ICON)
    metadata = {entity["entity_id"]: entity for entity in registry or []}
    defaults = {**DOMAIN_TEMPLATES, "weather": "hc_weather_card", "alarm_control_panel": "hc_security_card",
                "button": "hc_access_hold_action_card", "scene": "hc_switch_card"}
    for page in resolved["pages"]:
        position = 0
        card_ids = set()
        group_ids = set()
        sections = deepcopy(page_sections(page))
        for section in sections:
            selected = []
            for source in page_entries(section.get("entities")):
                position += 1
                entity_id = source.get("entity_id")
                entity = {**metadata.get(entity_id, {}), **deepcopy(source)}
                entity["id"] = source.get("id") or f"card-{position}"
                if entity["id"] in card_ids:
                    raise ValueError(f"Page {page['name']}: conflicting local card identity {entity['id']}")
                card_ids.add(entity["id"])
                domain = str(entity_id).split(".", 1)[0]
                role = source.get("template") or ("hc_navigation_card" if source.get("page") else _domain_template(entity) if domain in DOMAIN_TEMPLATES else defaults.get(domain))
                if not role:
                    raise ValueError(f"Page {page['name']}: choose a supported template for {entity_id}")
                role = access_template({**entity, "template": role})
                entity["template"] = role
                entity["_page_instance"] = page["id"] if page.get("id") else page["path"]
                if entity_id:
                    entity["name"] = source.get("name") or metadata.get(entity_id, {}).get("name") or _friendly_name(entity_id)
                    entity["unit_of_measurement"] = metadata.get(entity_id, {}).get("unit_of_measurement")
                variables = dict(source.get("variables") or {})
                prefix = f"#page-{page['path']}-{entity['id']}"
                popup_role = role in ("hc_media_card", "hc_camera_card", "hc_entity_group_card", "hc_scene_collection_card", "hc_energy_period_card", "hc_security_card")
                if popup_role or entity_id and role not in ("hc_access_slide_action_card", "hc_access_action_card") and _is_access_entity(entity):
                    variables.setdefault("popup_hash", prefix + "-popup")
                if role == "hc_graph_card" and variables.get("history_popup"):
                    variables.setdefault("popup_hash", prefix + "-history")
                if role == "hc_climate_card":
                    variables.setdefault("mode_selector_hash", prefix + "-modes")
                entity["variables"] = variables
                if role == "hc_entity_group_card":
                    entity = _resolve_entity_group(entity, list(metadata.values()), group_ids, canonical_page=True)
                selected.append(entity)
            section["ordered_cards"] = selected
        page["_sections"] = sections
    # Historical options remain opaque and never participate in current validation.
    _validate_energy_formatting(resolved["pages"], list(metadata.values()), validate_source_units=validate_source_units)
    for page in resolved["pages"]:
        hashes = set()
        for section in page["_sections"]:
            for entity in section["ordered_cards"]:
                for popup in _page_card_popups(entity):
                    popup_hash = popup["hash"]
                    if not isinstance(popup_hash, str) or not re.fullmatch(r"#[a-zA-Z0-9][a-zA-Z0-9_-]*", popup_hash) or popup_hash in hashes:
                        raise ValueError(f"Page {page['name']}: invalid or conflicting popup hash {popup_hash}")
                    hashes.add(popup_hash)
            def check_raw(value):
                if isinstance(value, dict):
                    if value.get("type") == "custom:marao-popup-card":
                        popup_hash = value.get("hash")
                        if not isinstance(popup_hash, str) or not re.fullmatch(r"#[a-zA-Z0-9][a-zA-Z0-9_-]*", popup_hash) or popup_hash in hashes:
                            raise ValueError(f"Page {page['name']}: invalid or conflicting raw popup hash")
                        hashes.add(popup_hash)
                    for child in value.values():
                        check_raw(child)
                elif isinstance(value, list):
                    for child in value:
                        check_raw(child)
            check_raw(section.get("cards", []))
        def check_links(value):
            if isinstance(value, dict):
                links = [value.get("navigation_path")]
                if value.get("template") in ("hc_media_card", "hc_camera_card", "hc_access_card", "hc_entity_group_card", "hc_climate_card"):
                    links.extend(value.get("variables", {}).get(key) for key in ("popup_hash", "mode_selector_hash"))
                for link in links:
                    if isinstance(link, str) and link.startswith(("#page-", "#entity-group-", "#overview-", "#energy-", "#climate-mode-", "#access-", "#media-", "#camera-")) and link not in hashes:
                        raise ValueError(f"Page {page['name']}: retarget or remove missing popup link {link}")
                for child in value.values():
                    check_links(child)
            elif isinstance(value, list):
                for child in value:
                    check_links(child)
        check_links(_page_view(page, "", dashboard_key_for_slug(resolved["slug"])))
    return resolved


def _page_card(entity, dashboard_key, language="en"):
    if entity.get("template") == "ha_card":
        from .card_yaml import parse_card_yaml
        return NativeLovelaceCard(parse_card_yaml(entity.get("yaml")))
    item = {**entity, "name": _configured_name(entity, language)}
    from .page_model import access_template
    role = item["template"] = access_template(item)
    variables = item.get("variables", {})
    if role == "hc_entity_group_card":
        return _entity_group_card(item, language)
    if role == "hc_scene_collection_card":
        return {"type": "custom:marao-card", "template": "hc_navigation_card", "name": item["name"],
                "icon": item.get("icon") or "mdi:palette-outline", "show_state": False,
                "tap_action": {"action": "navigate", "navigation_path": variables["popup_hash"], "haptic": "heavy"}}
    if role == "hc_title_card":
        card = _title_card(item["name"])
    elif role == "hc_energy_period_card":
        card = _energy_period_card(item, item["name"], variables.get("period", "day"), item.get("icon") or "mdi:flash", variables["popup_hash"])
    elif item.get("page"):
        card = _page_shortcut_card(item, dashboard_key)
        card["template"] = role
    elif role in ("hc_navigation_card", "hc_room_card", "hc_header_card", "hc_glance_card") and not item.get("entity_id"):
        card = {"type": "custom:marao-card", "template": role, "variables": deepcopy(variables)}
    elif role == "hc_access_hold_action_card":
        card = _page_action_card(item)
        card["template"] = role
    elif role == "hc_access_slide_action_card":
        card = _entity_card(item)
    elif role == "hc_access_action_card":
        card = _room_entity_card(item)
    elif str(item.get("entity_id") or "").startswith("scene."):
        card = _scene_card(item)
    else:
        card = _room_entity_card(item)
    for key in ("name", "icon", "show_name", "show_icon", "show_state", "show_label", "tap_action", "hold_action", "double_tap_action"):
        if key == "name" and role == "hc_timeline_card" and variables.get("timeline_name"):
            continue
        if key == "tap_action" and item.get("page"):
            continue
        if key in item:
            card[key] = item[key]
    if role == "hc_graph_card" and variables.get("history_popup"):
        card["tap_action"] = {"action": "navigate", "navigation_path": variables["popup_hash"], "haptic": "heavy"}
    return card


def _page_card_popups(entity, language="en"):
    if entity.get("template") == "ha_card":
        return []
    item = {**entity, "name": _configured_name(entity, language)}
    from .page_model import access_template
    role = item["template"] = access_template(item)
    variables = item.get("variables", {})
    if role in ("hc_access_slide_action_card", "hc_access_action_card"):
        return []
    if role == "hc_security_card" and "tap_action" not in item:
        return [_alarm_popup(item)]
    if role == "hc_entity_group_card":
        return [_entity_group_popup(item, language), *_entity_group_secondary_popups(item, language)]
    if role == "hc_scene_collection_card":
        from .page_model import page_entries
        return [{**_popup_header(variables["popup_hash"], None, item["name"], item.get("icon") or "mdi:palette-outline"),
                 "cards": [_scene_card(member) for member in page_entries(item["entities"])] or
                          [{"type": "markdown", "content": _t(language, "overview.scenes_empty")}]}]
    if role == "hc_energy_period_card" or role == "hc_graph_card" and variables.get("history_popup"):
        if role == "hc_energy_period_card":
            card = _energy_period_card(item, item["name"], variables.get("period", "day"), item.get("icon") or "mdi:flash", None, popup=True)
        elif ENERGY_UNITS.get(item.get("unit_of_measurement"), (None,))[0] == "power" or variables.get("power_devices"):
            card = _power_history_card(item, item["name"])
        else:
            card = _energy_graph_card(item, item["name"], item.get("icon") or "mdi:flash", None)
        return [{**_popup_header(variables["popup_hash"], item["entity_id"], item["name"], item.get("icon") or "mdi:flash"), "cards": [card]}]
    if role == "hc_climate_card":
        return [_climate_mode_popup(item, language)]
    if role == "hc_media_card":
        return [_media_popup(item)]
    if role == "hc_camera_card":
        return [_camera_popup(item, language)]
    if item.get("entity_id") and _is_access_entity(item) and (not _is_open_only_access(item) or variables.get("access_mode") == "popup"):
        return [_access_popup(item, language)]
    return []


def _standard_control(card):
    if card.get("type") != "custom:marao-card":
        return False
    role = card.get("template")
    service = (card.get("variables") or {}).get("action_service") or card.get("tap_action", {}).get("service") or card.get("tap_action", {}).get("perform_action")
    if role in ("hc_light_card", "hc_fan_card", "hc_cover_card", "hc_access_card", "hc_access_slide_action_card"):
        return True
    if str(role).startswith("hc_access_") and service in ("lock.unlock", "cover.open_cover"):
        return True
    if role == "hc_access_action_card":
        return service in ("lock.lock", "cover.close_cover")
    return role == "hc_access_hold_action_card" and str(card.get("entity", "")).split(".", 1)[0] in ("lock", "cover")


def _owned_content(card):
    """Classify owned content independently of compact control composition."""
    if isinstance(card, NativeLovelaceCard):
        return False
    if not isinstance(card, dict):
        return False
    kind = card.get("type", "")
    if kind == "custom:marao-card":
        return bool(card.get("template")) and card["template"] not in ("hc_title_card", "hc_navbar_card", "hc_popup_card")
    return kind.startswith("custom:marao-native-") and not kind.endswith(("-title-card", "-navbar-card", "-popup-card")) or kind in (
        "custom:marao-timeline-card", "custom:marao-energy-period-card", "custom:marao-frigate-events-card", "custom:marao-slide-to-open")


def _control_grid(cards, columns, *, raw=False, groups=None):
    """One owner per logical section; raw siblings keep their untouched configs."""
    if cards and any(_owned_content(card) for card in cards):
        return {"type": "custom:marao-control-grid", "columns": columns, "cards": cards,
                **({"native_cards": [index for index, card in enumerate(cards) if isinstance(card, NativeLovelaceCard)]}
                   if any(isinstance(card, NativeLovelaceCard) for card in cards) else {}),
                **({"groups": groups} if groups is not None else {})}
    return {"type": "grid", "columns": columns, "square": False, "cards": cards}


def _structural_host(card):
    return isinstance(card, dict) and card.get("type") in ("custom:marao-navbar-card", "custom:marao-popup-card")


def _automatic_section(groups, raw):
    content, metadata = [], []
    for cards, columns in groups:
        if cards:
            content.extend(cards)
            metadata.append({"count": len(cards), "columns": columns})
    for card in raw:
        content.append(deepcopy(card))
        metadata.append({"count": 1, "columns": 1})
    if not content:
        return []
    if not any(_owned_content(card) for card in content):
        return content
    return [_control_grid(content, max(group["columns"] for group in metadata), groups=metadata)]


def _page_view(page, include_root, dashboard_key, language="en"):
    cards, popups = [], []
    for section in page["_sections"]:
        entries = section["ordered_cards"]
        rendered = [_page_card(entity, dashboard_key, language) for entity in entries]
        raw = deepcopy(section.get("cards", []))
        popups.extend(card for card in raw if _structural_host(card))
        raw = [card for card in raw if not _structural_host(card)]
        if section.get("columns"):
            if rendered or raw:
                content = [*rendered, *raw]
                if section["columns"] == 1 and len(content) == 1 and not _owned_content(content[0]):
                    cards.extend(content)
                else:
                    cards.append(_control_grid(content, section["columns"], raw=bool(raw)))
        else:
            # Preserve the historical automatic domain layout; fixed grids keep mixed order.
            domains = ["sensor", "binary_sensor", "camera", "lock", "cover", "climate", "fan", "switch", "input_boolean", "media_player", "vacuum", "number", "input_number", "light", "navigation", "entity_group"]
            buckets = {}
            for entity, card in zip(entries, rendered, strict=True):
                domain = "ha_card" if entity.get("template") == "ha_card" else "navigation" if entity.get("page") else "entity_group" if entity["template"] == "hc_entity_group_card" else str(entity.get("entity_id") or "").split(".", 1)[0]
                buckets.setdefault(domain, []).append(card)
            groups = [(buckets[domain], 2 if domain in ("sensor", "binary_sensor", "switch", "input_boolean", "number", "input_number", "light", "navigation", "entity_group") else 1)
                      for domain in [*domains, *(key for key in buckets if key not in domains)] if buckets.get(domain)]
            cards.extend(_automatic_section(groups, raw))
        popups.extend(popup for entity in entries for popup in _page_card_popups(entity, language))
    cards.extend(popups)
    cards.append(TaggedScalar("!include", f"{include_root}/components/navigation/navbar.yaml"))
    return {"title": _configured_name(page, language), "path": page["path"], "cards": cards,
            **{key: page[key] for key in ("icon", "theme", "subview") if key in page}}


def _page_navigation_bar(config, dashboard_key, language="en"):
    available = {page["path"]: page for page in config["pages"]}
    routes = []
    base = f"/{dashboard_key}"
    source_base = f"/{dashboard_key_for_slug(config['slug'])}"
    for entry in config.get("navigation", []):
        path = entry if isinstance(entry, str) else entry.get("page")
        if path in available:
            page = available[path]
            overrides = entry if isinstance(entry, dict) else {}
            route = {"icon": page.get("icon") or "mdi:file-outline", "icon_selected": page.get("icon") or "mdi:file-outline",
                     "label": _configured_name(page, language), **overrides, "url": f"{base}/{path}"}
            if overrides.get("label_key"):
                route["label"] = _configured_name({"name": overrides.get("label"), "name_key": overrides["label_key"]}, language)
            url = overrides.get("url")
            if url and not overrides.get("label_key") and url not in (f"{base}/{path}", f"{source_base}/{path}"):
                route["url"] = url
            routes.append(route)
        else:
            routes.append(deepcopy(entry))
    return {"type": "vertical-stack", "cards": [{"type": "custom:marao-navbar-card", "routes": routes,
            **({"show_cache_reset": config["show_cache_reset"]} if "show_cache_reset" in config else {})}]}


def _page_assets(config, include_root, dashboard_key, language="en"):
    """Use common protected containers, retaining historical owned filenames."""
    paths, assets = [], {}
    pages = config["pages"]
    ordered = [page for page in pages if page["path"] == config["landing_page"]]
    ordered.extend(page for page in pages if page["path"] != config["landing_page"])
    for page in ordered:
        path = page.get("output_path") or f"views/pages/{page.get('id') or page['path']}.yaml"
        if path in assets:
            raise ValueError("Pages resolve to the same generated view file")
        paths.append(path)
        view = _page_view(page, include_root, dashboard_key, language)
        generated_hashes = {popup["hash"] for section in page["_sections"] for entity in section["ordered_cards"]
                            for popup in _page_card_popups(entity, language)}
        secondary_paths = {}
        for section in page["_sections"]:
            for group in section["ordered_cards"]:
                if group["template"] == "hc_entity_group_card" and _entity_group_hash(group) in ("#" + group["id"], "#entity-group-" + group["id"]):
                    for index, popup in enumerate(_entity_group_secondary_popups(group, language)):
                        secondary_paths[popup["hash"]] = f"components/popups/{_entity_group_hash(group)[1:].replace('-', '_')}_{index}.yaml"
        for index, card in enumerate(view["cards"]):
            if isinstance(card, dict) and card.get("type") == "custom:marao-popup-card" and card["hash"] in generated_hashes:
                popup_hash = card["hash"]
                filename = popup_hash[1:]
                if filename.startswith(("overview-", "energy-", "entity-group-")):
                    filename = filename.replace("-", "_")
                popup_path = secondary_paths.get(popup_hash, f"components/popups/{filename}.yaml")
                if popup_path in assets:
                    popup_path = f"components/popups/{page.get('id') or page['path']}-{filename}.yaml"
                if popup_path in assets:
                    raise ValueError("Popups resolve to the same generated file")
                assets[popup_path] = card
                view["cards"][index] = TaggedScalar("!include", f"{include_root}/{popup_path}")
        view["theme"] = config["theme"]
        assets[path] = view
    return paths, assets


def _entity_container_cards(
    container: dict[str, Any], include_root: str, dashboard_key: str, language: str
) -> list[Any]:
    cards: list[Any] = [
        _title_card(container["name"]),
    ]

    def render(items):
        return [_page_shortcut_card(item, dashboard_key) if item.get("page")
                else _entity_group_card(item, language) if item.get("template") == "hc_entity_group_card"
                else _room_entity_card(item) for item in items]

    raw = [card for card in container["cards"] if not _structural_host(card)]
    if container.get("columns") and (container["ordered_cards"] or raw):
        cards.append(_control_grid(render(container["ordered_cards"]) + raw,
                                   container["columns"], raw=bool(raw)))
    else:
        groups = [(render(container["entities_by_domain"].get(domain, [])), columns)
                  for domain, columns in [("sensor", 2), ("binary_sensor", 2), ("camera", 1), ("lock", 1),
                                          ("cover", 1), ("climate", 1), ("fan", 1), ("switch", 2),
                                          ("input_boolean", 2), ("media_player", 1), ("vacuum", 1),
                                          ("number", 2), ("input_number", 2), ("light", 2),
                                          ("navigation", 2), ("entity_group", 2)]]
        cards.extend(_automatic_section(groups, raw))
    cards.extend(card for card in container["cards"] if _structural_host(card))

    for group in container["entities_by_domain"].get("entity_group", []):
        cards.append(_entity_group_popup(group, language))
        cards.extend(_entity_group_secondary_popups(group, language))
    cards.extend(
        _climate_mode_popup(entity, language)
        for entity in container["entities_by_domain"].get("climate", [])
    )
    cards.extend(
        _access_popup(entity, language)
        for domain in ("lock", "cover")
        for entity in container["entities_by_domain"].get(domain, [])
        if _is_access_entity(entity) and not _is_open_only_access(entity)
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
        "type": "custom:marao-card",
        "template": "hc_navigation_card",
        **({"entity": shortcut["entity_id"]} if shortcut.get("entity_id") else {}),
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


def _title_card(name: str) -> dict[str, Any]:
    return {
        "type": "custom:marao-card",
        "template": "hc_title_card",
        "name": name,
        "show_icon": False,
        "show_state": False,
        "tap_action": {"action": "none"},
        "hold_action": {"action": "none"},
    }


def _entity_card(entity: dict[str, Any]) -> dict[str, Any]:
    domain = entity["entity_id"].split(".", 1)[0]
    template = entity.get("template") or _domain_template(entity)
    variables = dict(
        entity.get("variables") if isinstance(entity.get("variables"), dict) else {}
    )
    if template == "hc_light_card":
        from .page_model import validate_light_options
        validate_light_options(variables)
    if entity.get("graph_entity") and not variables.get("graph_entity"):
        variables["graph_entity"] = entity["graph_entity"]
    if template == "hc_timeline_card":
        return {
            "type": "custom:marao-state-timeline-card",
            "entity": entity["entity_id"],
            "name": variables.get("timeline_name")
            or entity.get("name")
            or _friendly_name(entity["entity_id"]),
        }
    card = {
        "type": "custom:marao-card",
        "template": template,
        "entity": entity["entity_id"],
        "name": entity.get("name") or _friendly_name(entity["entity_id"]),
    }
    if entity.get("icon"):
        card["icon"] = entity["icon"]
    if variables:
        card["variables"] = variables
    elif domain == "climate":
        card["variables"] = {"show_graph": False, "show_mode_buttons": True}
    return card


def _domain_template(entity: dict[str, Any]) -> str:
    if _is_access_entity(entity):
        return "hc_access_card"
    return _sensor_template(entity) or DOMAIN_TEMPLATES[entity["entity_id"].split(".", 1)[0]]


def _alarm_popup(entity: dict[str, Any]) -> dict[str, Any]:
    name = entity.get("name") or _friendly_name(entity["entity_id"])
    popup_hash = (entity.get("variables") or {}).get("popup_hash") or f"#alarm-{make_slug(entity['entity_id'].replace('.', '-'))}"
    return {**_popup_header(popup_hash, entity["entity_id"], name, "mdi:shield-home"),
            "cards": [{"type": "custom:marao-card", "template": "hc_alarm_controls_card",
                       "entity": entity["entity_id"], "name": name}]}


def _room_entity_card(entity: dict[str, Any]) -> dict[str, Any]:
    from .page_model import access_template
    if entity.get("template"):
        entity = {**entity, "template": access_template(entity)}
    if entity.get("template") == "hc_access_action_card":
        variables = entity.get("variables") or {}
        service = variables.get("action_service") or ("lock.lock" if entity["entity_id"].startswith("lock.") else "cover.close_cover")
        return _entity_card({**entity, "variables": {**variables, "action_service": service}})
    if entity.get("template") == "hc_access_hold_action_card" and not _is_access_entity(entity):
        return _page_action_card(entity)
    if entity.get("template") == "hc_access_slide_action_card":
        return _entity_card(entity)
    if entity.get("template") == "hc_security_card" and "tap_action" not in entity:
        variables = {"popup_hash": f"#alarm-{make_slug(entity['entity_id'].replace('.', '-'))}",
                     **(entity.get("variables") or {})}
        return _entity_card({**entity, "variables": variables})
    if _is_access_entity(entity):
        if _is_open_only_access(entity) and (entity.get("variables") or {}).get("access_mode") != "popup":
            return _access_action_card(
                entity,
                name=entity.get("name") or _friendly_name(entity["entity_id"]),
                icon="mdi:door-open",
                service="cover.open_cover",
                label_key="access.open",
                requires_hold=False,
                color="var(--color-red)",
            )
        variables = {
            "popup_hash": _access_popup_hash(entity["entity_id"]),
            **(entity.get("variables") if isinstance(entity.get("variables"), dict) else {}),
        }
        return _entity_card({**entity, "template": "hc_access_card", "variables": variables})

    if not entity["entity_id"].startswith("climate."):
        if entity["entity_id"].startswith("camera."):
            variables = {
                "popup_hash": _camera_popup_hash(entity["entity_id"]),
                **(entity.get("variables") if isinstance(entity.get("variables"), dict) else {}),
            }
            return _entity_card({**entity, "variables": variables})
        if entity["entity_id"].startswith("media_player.") and entity.get("template", "hc_media_card") == "hc_media_card":
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
        "apps": options["apps"] if "apps" in options else entity.get("apple_tv_apps", []),
    }


def _media_button(
    entity_id: str,
    *,
    icon: str,
    service: str,
    name: str = "",
    data: dict[str, Any] | None = None,
    seek_offset: int | None = None,
    primary: bool = False,
    dpad: bool = False,
    hold_data: dict[str, Any] | None = None,
    target_entity_id: str | None = None,
) -> dict[str, Any]:
    target_entity_id = target_entity_id or entity_id
    card = {
        "type": "custom:marao-card",
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
            "icon": [{"width": "24px" if primary else ("42px" if dpad else "34px")}, {"color": "var(--text-primary-color,var(--active-text-color))" if primary else "var(--primary-text-color)"}],
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
    media_label = {
        "media_player.media_previous_track": "media.previous",
        "media_player.media_play_pause": "media.play_pause",
        "media_player.media_next_track": "media.next",
    }.get(service)
    if media_label:
        card["variables"] = {"action_label_key": media_label}
    if data:
        card["tap_action"]["data"] = data
    if seek_offset is not None:
        card["tap_action"]["seek_offset"] = seek_offset
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
    popup_hash = (entity.get("variables") or {}).get("popup_hash") or _media_popup_hash(entity_id)
    apple_tv = _apple_tv_options(entity)
    if not apple_tv:
        controls = [
            _media_button(entity_id, icon="mdi:skip-previous", name="Previous", service="media_player.media_previous_track"),
            _media_button(entity_id, icon="mdi:play", name="Play", service="media_player.media_play_pause", primary=True),
            _media_button(entity_id, icon="mdi:skip-next", name="Next", service="media_player.media_next_track"),
        ]
        return {
            **_popup_header(popup_hash, entity_id, name, "mdi:music"),
            "cards": [{"type": "grid", "columns": 3, "square": False, "cards": controls}],
        }

    media_controls: list[dict[str, Any]] = []
    apps = [app for app in apple_tv["apps"] if isinstance(app, dict) and app.get("source")]
    if apps:
        media_controls.append(
            {
                "type": "custom:marao-control-grid",
                "columns": 3,
                "square": False,
                "cards": [
                    {
                        "type": "custom:marao-card",
                        "template": "hc_media_app_card",
                        "entity": entity_id,
                        "name": app.get("name") or app["source"],
                        "icon": app.get("icon") or "mdi:play-box-outline",
                        "show_state": False,
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
                _media_button(entity_id, icon="mdi:rewind-10", name="Back 10 seconds", service="media_player.media_seek", seek_offset=-10),
                _remote_button(entity_id, remote_entity, "down", icon="mdi:chevron-down", dpad=True, hold=True),
                _media_button(entity_id, icon="mdi:fast-forward-30", name="Forward 30 seconds", service="media_player.media_seek", seek_offset=30),
            ]},
        ]
    )
    volume_remote = apple_tv["volume_remote_entity"]
    volume_down = _remote_button(entity_id, volume_remote, "KEY_VOLDOWN", icon="mdi:volume-minus", name="Volume down") if volume_remote and volume_remote.startswith("remote.") else _media_button(entity_id, icon="mdi:volume-minus", name="Volume down", service="media_player.volume_down", target_entity_id=volume_remote)
    volume_up = _remote_button(entity_id, volume_remote, "KEY_VOLUP", icon="mdi:volume-plus", name="Volume up") if volume_remote and volume_remote.startswith("remote.") else _media_button(entity_id, icon="mdi:volume-plus", name="Volume up", service="media_player.volume_up", target_entity_id=volume_remote)
    media_controls.append(
        {"type": "grid", "columns": 3, "square": False, "cards": [
            volume_down,
            _media_button(entity_id, icon="mdi:play", name="Play", service="media_player.media_play_pause", primary=True),
            volume_up,
        ]}
    )
    return {
        **_popup_header(popup_hash, entity_id, name, "mdi:remote-tv"),
        "cards": media_controls,
    }


def _camera_popup(entity: dict[str, Any], language: str = "en") -> dict[str, Any]:
    from .page_model import camera_popup_stream

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
            variables.get("popup_hash") or _camera_popup_hash(entity_id),
            entity_id,
            entity.get("name") or _friendly_name(entity_id),
            entity.get("icon") or "mdi:cctv",
        ),
        "cards": [{
            "type": "custom:marao-card", "template": "hc_camera_card",
            "entity": camera_popup_stream(entity_id, variables),
            "name": entity.get("name") or _friendly_name(entity_id), "show_name": False,
            "tap_action": {"action": "fullscreen"},
        }, events_card],
    }


def _is_access_entity(entity: dict[str, Any]) -> bool:
    entity_id = entity["entity_id"]
    domain = entity_id.split(".", 1)[0]
    if domain == "lock":
        return True
    if domain != "cover":
        return False
    if entity.get("template") == "hc_access_card":
        return True
    device_class = str(entity.get("device_class") or "").lower()
    name = f"{entity_id} {entity.get('name') or ''}".lower()
    return device_class in {"door", "garage", "gate"} or any(
        token in name for token in ("door", "garage", "gate")
    )


def _is_open_only_access(entity: dict[str, Any]) -> bool:
    """Recognize cover entities that expose open but no close operation."""
    if entity["entity_id"].split(".", 1)[0] != "cover" or "supported_features" not in entity:
        return False
    try:
        features = int(entity["supported_features"])
    except (TypeError, ValueError):
        return False
    return bool(features & 1) and not bool(features & 2)


def _access_action_card(
    entity: dict[str, Any],
    *,
    name: str,
    icon: str,
    service: str,
    label_key: str,
    requires_hold: bool,
    color: str,
) -> dict[str, Any]:
    return {
        "type": "custom:marao-card",
        "template": (
            "hc_access_slide_action_card"
            if service in {"lock.unlock", "cover.open_cover"}
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
                name=_t(language, "access.open"),
                icon=f"{icon}-open" if icon == "mdi:garage" else "mdi:door-open",
                service="cover.open_cover",
                label_key="access.open",
                requires_hold=False,
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

    if _is_open_only_access(entity):
        actions = actions[:1]
    popup_cards = [_control_grid(actions, 1)]
    return {
        **_popup_header((entity.get("variables") or {}).get("popup_hash") or _access_popup_hash(entity["entity_id"]), entity["entity_id"], name, icon),
        "cards": popup_cards,
    }


def _climate_mode_popup(entity: dict[str, Any], language: str = "en") -> dict[str, Any]:
    return {
        **_popup_header(
            (entity.get("variables") or {}).get("mode_selector_hash") or _climate_mode_hash(entity["entity_id"]),
            entity["entity_id"],
            f"{entity.get('name') or _friendly_name(entity['entity_id'])} {_t(language, 'climate.mode_suffix')}",
            "mdi:thermostat",
        ),
        "cards": [
            _entity_card(
                {
                    **entity,
                    "variables": {
                        "show_graph": False,
                        **(
                            entity.get("variables")
                            if isinstance(entity.get("variables"), dict)
                            else {}
                        ),
                        "show_mode_buttons": True,
                    },
                }
            )
        ],
    }


def _sensor_template(entity: dict[str, Any]) -> str | None:
    if entity["entity_id"].startswith("sensor.") and entity.get("device_class") == "battery":
        return "hc_battery_card"
    return None


def _entity_group_hash(group):
    if (group.get("variables") or {}).get("popup_hash"):
        return group["variables"]["popup_hash"]
    return "#" + (group["id"] if group["id"] in {"overview-lights", "overview-blinds", "overview-climate", "overview-maintenance"}
                  else "entity-group-" + group["id"])


def _entity_group_name(group, language):
    keys = {"light": "overview.lights", "cover": "overview.blinds", "climate": "overview.climate", "battery": "overview.maintenance"}
    return _t(language, keys[group["entity_type"]]) if group.get("_legacy_overview") else _configured_name(group, language)


def _entity_group_card(group, language="en"):
    return {"type": "custom:marao-card", "template": "hc_entity_group_card", "id": group["id"], "name": _entity_group_name(group, language),
            "icon": group.get("icon") or {"light": "mdi:lightbulb-group-outline", "cover": "mdi:window-shutter",
                                           "climate": "mdi:thermostat", "battery": "mdi:battery"}[group["entity_type"]],
            "variables": {"entity_type": group["entity_type"], "summary_entities": [member["entity_id"] for member in group["entities"]]},
            "tap_action": {"action": "navigate", "navigation_path": _entity_group_hash(group), "haptic": "heavy"}}


def _entity_group_members(group):
    members = []
    for member in group["entities"]:
        variables = dict(member.get("variables") or {})
        popup_hash = _entity_group_hash(group)
        historical = popup_hash in ("#" + group["id"], "#entity-group-" + group["id"])
        prefix = (popup_hash if group.get("_page_instance") and not historical else "#entity-group-" + group["id"]) + "-" + member["entity_id"].replace(".", "-")
        if member["entity_id"].startswith("climate."):
            variables.setdefault("mode_selector_hash", prefix + "-modes")
        if _is_access_entity(member):
            variables.setdefault("popup_hash", prefix + "-access")
        name = member.get("name") or _friendly_name(member["entity_id"])
        if group.get("_legacy_overview") and group["entity_type"] != "battery" and member.get("room_name"):
            name += " - " + member["room_name"]
        members.append({**member, "name": name, "variables": variables})
    return members


def _entity_group_popup(group, language="en"):
    name = _entity_group_name(group, language)
    return {**_popup_header(_entity_group_hash(group), None, name, group.get("icon") or "mdi:view-list"),
            "entity_group": {"id": group["id"], "entity_type": group["entity_type"], "popup_filter": group["popup_filter"],
                             "entities": [member["entity_id"] for member in group["entities"]]},
            "cards": [_room_entity_card(member) for member in _entity_group_members(group)]}


def _entity_group_secondary_popups(group, language="en"):
    return [_climate_mode_popup(member, language) if member["entity_id"].startswith("climate.") else _access_popup(member, language)
            for member in _entity_group_members(group)
            if member["entity_id"].startswith("climate.") or (_is_access_entity(member) and not _is_open_only_access(member))]


def _popup_grid(cards: list[dict[str, Any]]) -> dict[str, Any]:
    return _control_grid(cards, 1)


def _battery_entities(config: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        entity
        for entity in _all_entities(config, "sensor")
        if entity.get("device_class") == "battery" or "battery" in entity["entity_id"]
    ]


def _overview_popups(
    config: dict[str, Any], language: str = "en"
) -> dict[str, dict[str, Any]]:
    legacy_names = {"overview-lights": "overview_lights", "overview-blinds": "overview_blinds",
                    "overview-climate": "overview_climate", "overview-maintenance": "overview_maintenance"}
    popups = {}
    for group in config["overview"]["entity_groups"]:
        name = legacy_names.get(group["id"], "entity_group_" + group["id"])
        popups[name] = _entity_group_popup(group, language)
        for index, popup in enumerate(_entity_group_secondary_popups(group, language)):
            popups[f"{name}_{index}"] = popup
    if _overview_scene_entities(config):
        popups["overview_scenes"] = _scenes_popup(config, language)
    return popups


def _popup_header(
    popup_hash: str, entity_id: str, name: str, icon: str
) -> dict[str, Any]:
    return {
        "type": "custom:marao-popup-card",
        "hash": popup_hash,
        **({"entity": entity_id} if entity_id else {}),
        "name": name,
        "icon": icon,
        "show_icon": True,
        "show_name": True,
        "show_state": True,
        "height": "auto",
        "max_height": "100%",
    }
