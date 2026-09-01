"""Describe and detect Marao Dashboard frontend dependencies."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
import re
from typing import Any
from urllib.parse import unquote, urlsplit


@dataclass(frozen=True, slots=True)
class DashboardDependency:
    """One frontend project used by generated Marao dashboards."""

    id: str
    name: str
    tested_version: str
    repository: str
    hacs_url: str
    resource_patterns: tuple[str, ...]
    used_by: tuple[str, ...]


DEPENDENCIES = (
    DashboardDependency(
        "button_card",
        "Button Card",
        "7.0.1",
        "https://github.com/custom-cards/button-card",
        "https://my.home-assistant.io/redirect/hacs_repository/?owner=custom-cards&repository=button-card&category=plugin",
        ("/button-card/", "/button-card.js", "/button_card.js"),
        ("Core dashboard cards and templates",),
    ),
    DashboardDependency(
        "my_cards",
        "My Cards",
        "1.0.6",
        "https://github.com/AnthonMS/my-cards",
        "https://my.home-assistant.io/redirect/hacs_repository/?owner=AnthonMS&repository=my-cards&category=plugin",
        ("/my-cards/", "/my-cards.js"),
        ("Light, cover, and fan sliders",),
    ),
    DashboardDependency(
        "kiosk_mode",
        "Kiosk Mode",
        "14.0.1",
        "https://github.com/NemesisRE/kiosk-mode",
        "https://my.home-assistant.io/redirect/hacs_repository/?owner=NemesisRE&repository=kiosk-mode&category=plugin",
        ("/kiosk-mode/", "/kiosk-mode.js"),
        ("Dashboard header visibility",),
    ),
    DashboardDependency(
        "card_mod",
        "Card Mod",
        "4.2.1",
        "https://github.com/thomasloven/lovelace-card-mod",
        "https://my.home-assistant.io/redirect/hacs_repository/?owner=thomasloven&repository=lovelace-card-mod&category=plugin",
        ("/lovelace-card-mod/", "/card-mod.js"),
        ("Dashboard card styling",),
    ),
    DashboardDependency(
        "mini_graph_card",
        "Mini Graph Card",
        "0.13.0",
        "https://github.com/kalkih/mini-graph-card",
        "https://my.home-assistant.io/redirect/hacs_repository/?owner=kalkih&repository=mini-graph-card&category=plugin",
        ("/mini-graph-card/", "/mini-graph-card-bundle.js"),
        ("Climate, switch, and energy graphs",),
    ),
    DashboardDependency(
        "bubble_card",
        "Bubble Card",
        "3.2.4",
        "https://github.com/Clooos/Bubble-Card",
        "https://my.home-assistant.io/redirect/hacs_repository/?owner=Clooos&repository=Bubble-Card&category=plugin",
        ("/bubble-card/", "/bubble-card.js"),
        ("Entity and camera event popovers",),
    ),
    DashboardDependency(
        "navbar_card",
        "Navbar Card",
        "1.6.1",
        "https://github.com/joseluis9595/lovelace-navbar-card",
        "https://my.home-assistant.io/redirect/hacs_repository/?owner=joseluis9595&repository=lovelace-navbar-card&category=plugin",
        ("/lovelace-navbar-card/", "/navbar-card/", "/navbar-card.js"),
        ("Bottom dashboard navigation",),
    ),
)

# The generator emits these four even for an otherwise empty dashboard.
CORE_DEPENDENCY_IDS = frozenset(
    {"button_card", "navbar_card", "kiosk_mode", "card_mod"}
)

_TYPE_DEPENDENCIES = {
    "custom:my-button": "my_cards",
    "custom:my-slider": "my_cards",
    "custom:my-slider-v2": "my_cards",
    "custom:mini-graph-card": "mini_graph_card",
    "custom:bubble-card": "bubble_card",
}
_MY_CARDS_DOMAINS = frozenset({"light", "cover", "fan"})
_MY_CARDS_TEMPLATES = frozenset({"hc_light_card", "hc_cover_card", "hc_fan_card"})
_MINI_GRAPH_DOMAINS = frozenset({"climate", "switch", "input_boolean"})
_MINI_GRAPH_TEMPLATES = frozenset(
    {"hc_climate_card", "hc_graph_card", "hc_switch_card", "hc_toggle_graph_card"}
)
_GRAPH_CONFIG_KEYS = frozenset(
    {
        "actions",
        "charging_power_entity",
        "house_power",
        "loads",
        "max_current_entity",
        "month_cost",
        "month_energy",
        "pause_resume_entity",
        "power_entity",
        "today_cost",
        "today_energy",
    }
)
_POPUP_CONFIG_KEYS = frozenset(
    {"house_power", "month_cost", "month_energy", "scenes", "today_cost", "today_energy"}
)
_POPUP_DOMAINS = frozenset({"camera", "climate", "cover", "light", "lock", "media_player", "scene"})
_ENTITY_ID = re.compile(r"^([a-z_][a-z0-9_]*)\.[a-z0-9_]+$", re.IGNORECASE)


def normalize_resource_url(value: object) -> str:
    """Return a comparable, cache-buster-free resource path."""

    if not isinstance(value, str) or not (raw := value.strip()):
        return ""
    try:
        path = urlsplit(raw).path
    except ValueError:
        path = raw.split("#", 1)[0].split("?", 1)[0]
    parts = (part for part in unquote(path).replace("\\", "/").split("/") if part)
    return f"/{'/'.join(parts)}".casefold()


def _resource_url(value: object) -> object:
    return value.get("url") if isinstance(value, Mapping) else value


def detect_installed_dependencies(
    lovelace_resource_urls: Iterable[object] = (),
    frontend_extra_module_urls: Iterable[object] = (),
) -> frozenset[str]:
    """Detect dependencies from Lovelace and frontend module resource URLs."""

    urls = {
        normalized
        for values in (lovelace_resource_urls, frontend_extra_module_urls)
        for value in values
        if (normalized := normalize_resource_url(_resource_url(value)))
    }
    return frozenset(
        dependency.id
        for dependency in DEPENDENCIES
        if any(pattern in url for pattern in dependency.resource_patterns for url in urls)
    )


def _entity_domain(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    match = _ENTITY_ID.fullmatch(value.strip())
    return match.group(1).casefold() if match else None


def _has_value(value: object) -> bool:
    return value is not None and value is not False and value != "" and value != [] and value != {}


def required_dependencies(config: object) -> frozenset[str]:
    """Compute dependencies needed by a Marao dashboard config or editor model."""

    required = set(CORE_DEPENDENCY_IDS)

    def visit(value: object) -> None:
        domain = _entity_domain(value)
        if domain in _MY_CARDS_DOMAINS:
            required.add("my_cards")
        if domain in _MINI_GRAPH_DOMAINS:
            required.add("mini_graph_card")
        if domain in _POPUP_DOMAINS:
            required.add("bubble_card")
        if domain == "sensor" and isinstance(value, str) and "battery" in value.casefold():
            required.add("bubble_card")

        if isinstance(value, Mapping):
            card_type = value.get("type")
            if isinstance(card_type, str) and (
                dependency_id := _TYPE_DEPENDENCIES.get(card_type.strip().casefold())
            ):
                required.add(dependency_id)

            templates = value.get("template")
            if isinstance(templates, str):
                templates = (templates,)
            if isinstance(templates, (list, tuple)):
                normalized_templates = {
                    template.strip().casefold()
                    for template in templates
                    if isinstance(template, str)
                }
                if normalized_templates & _MY_CARDS_TEMPLATES:
                    required.add("my_cards")
                if normalized_templates & _MINI_GRAPH_TEMPLATES:
                    required.add("mini_graph_card")

            keys = {str(key).casefold() for key, item in value.items() if _has_value(item)}
            if keys & _GRAPH_CONFIG_KEYS:
                required.add("mini_graph_card")
            if keys & _POPUP_CONFIG_KEYS:
                required.add("bubble_card")
            if str(value.get("device_class") or "").casefold() == "battery" or (
                isinstance(value.get("entity_id"), str)
                and "battery" in value["entity_id"].casefold()
            ):
                required.add("bubble_card")

            resolved_container = isinstance(value.get("entities_by_domain"), Mapping)
            for key, item in value.items():
                normalized_key = str(key).casefold()
                if normalized_key == "exclude" or (
                    resolved_container
                    and normalized_key in {"entities", "include", "overrides"}
                ):
                    continue
                visit(item)
        elif isinstance(value, (list, tuple, set, frozenset)):
            for item in value:
                visit(item)

    visit(config)
    return frozenset(required)


def dependency_statuses(
    config: object,
    lovelace_resource_urls: Iterable[object] = (),
    frontend_extra_module_urls: Iterable[object] = (),
) -> list[dict[str, Any]]:
    """Return JSON-ready dependency records for a dashboard and installed URLs."""

    required = required_dependencies(config)
    installed = detect_installed_dependencies(
        lovelace_resource_urls, frontend_extra_module_urls
    )
    return [
        {
            "id": dependency.id,
            "name": dependency.name,
            "tested_version": dependency.tested_version,
            "repository": dependency.repository,
            "hacs_url": dependency.hacs_url,
            "used_by": list(dependency.used_by),
            "required": dependency.id in required,
            "status": "installed" if dependency.id in installed else "not_detected",
        }
        for dependency in DEPENDENCIES
    ]
