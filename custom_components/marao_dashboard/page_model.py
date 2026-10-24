"""Ordered page boundaries shared by conversion and generation."""

from __future__ import annotations

import re
import math
from typing import Any

PAGE_FORMAT_VERSION = 2
FREE_CARD_ROLES = {
    "hc_title_card", "hc_navigation_card", "hc_room_card",
    "hc_entity_group_card", "hc_scene_collection_card",
    "hc_header_card", "hc_glance_card",
}
ENTITY_ID = re.compile(r"[a-z0-9_]+\.[a-z0-9_]+")
PAGE_PATH = re.compile(r"[a-z0-9][a-z0-9_-]*")
LOCAL_ID = re.compile(r"[a-z][a-z0-9_-]{0,63}")


def validate_light_options(options: dict[str, Any]) -> None:
    if "use_light_color" in options and type(options["use_light_color"]) is not bool:
        raise ValueError("Use light color as background must be a boolean.")


def camera_popup_stream(entity: str, options: dict[str, Any]) -> str:
    """Resolve the optional popup binding consistently for every generation path."""
    if "preload_stream" in options and type(options["preload_stream"]) is not bool:
        raise ValueError("Preload stream must be a boolean.")
    stream = options.get("popup_stream_entity")
    if stream in (None, ""):
        return entity
    if not isinstance(stream, str) or not ENTITY_ID.fullmatch(stream) or not stream.startswith("camera."):
        raise ValueError("Choose a camera entity for the popup stream.")
    return stream


def validate_energy_options(options: dict[str, Any]) -> None:
    """Validate optional breakdown bindings without changing saved row data."""
    if "calculate_cost" in options and type(options["calculate_cost"]) is not bool:
        raise ValueError("Calculate cost must be a boolean.")
    price = options.get("cost_per_kwh")
    if "cost_per_kwh" in options and (type(price) not in (int, float) or not math.isfinite(price) or price < 0):
        raise ValueError("Price per kWh must be a finite nonnegative number.")
    if "sub_entities" not in options:
        return
    members = options["sub_entities"]
    if not isinstance(members, list):
        raise ValueError("Energy breakdown must be a list.")
    sources = set()
    for member in members:
        if not isinstance(member, dict):
            raise ValueError("Energy breakdown entries must be objects.")
        entity = member.get("entity_id")
        if not isinstance(entity, str) or not re.fullmatch(r"sensor\.[a-z0-9_]+", entity):
            raise ValueError("Choose an energy sensor for each breakdown entry.")
        if entity in sources:
            raise ValueError("Energy breakdown sources must be unique.")
        sources.add(entity)
        if "name" in member and not isinstance(member["name"], str):
            raise ValueError("Energy breakdown names must be text.")
        cost = member.get("cost_entity")
        if cost not in (None, "") and (not isinstance(cost, str) or not re.fullmatch(r"sensor\.[a-z0-9_]+", cost)):
            raise ValueError("Choose a cost sensor for each breakdown entry.")


def validate_power_devices(options: dict[str, Any], main: str | None = None) -> None:
    """Keep ordered optional power bindings intact across generation paths."""
    if "power_devices" not in options:
        return
    members = options["power_devices"]
    if not isinstance(members, list):
        raise ValueError("Power devices must be a list.")
    seen = {main} if main else set()
    for member in members:
        if not isinstance(member, dict) or not isinstance(member.get("entity_id"), str) or not re.fullmatch(r"sensor\.[a-z0-9_]+", member["entity_id"]):
            raise ValueError("Choose a power sensor for each device.")
        if member["entity_id"] in seen:
            raise ValueError("Power devices must be unique and different from the house sensor.")
        seen.add(member["entity_id"])
        if "name" in member and not isinstance(member["name"], str):
            raise ValueError("Power device names must be text.")


def page_entries(spec: Any) -> list[dict[str, Any]]:
    """Retain mixed order and whole descriptors, including entity-free cards."""
    if spec is None:
        return []
    if isinstance(spec, str):
        return [{"entity_id": spec}]
    if isinstance(spec, list):
        return [entry for value in spec for entry in page_entries(value)]
    if isinstance(spec, dict):
        if any(key in spec for key in ("entity_id", "page", "template")):
            return [spec]
        return [entry for value in spec.values() for entry in page_entries(value)]
    raise ValueError("Page entities must be strings, descriptors, lists or grouped objects")


def page_sections(page: dict[str, Any]) -> list[dict[str, Any]]:
    if "sections" not in page:
        return [page]
    if any(key in page for key in ("entities", "cards", "columns")):
        raise ValueError("A page cannot mix sections with flat entities, cards or columns")
    sections = page["sections"]
    if not isinstance(sections, list) or any(not isinstance(section, dict) for section in sections):
        raise ValueError("Page sections must be a list of objects")
    if any("sections" in section for section in sections):
        raise ValueError("Page sections cannot contain nested sections")
    return sections


def validate_pages(config: dict[str, Any], templates: dict[str, list[str]]) -> set[str]:
    """Preflight canonical structure and owned links without changing source."""
    if type(config.get("config_version")) is not int or config["config_version"] != PAGE_FORMAT_VERSION:
        raise ValueError("Ordered pages require dashboard format 2")
    if not isinstance(config.get("name"), str) or not config["name"].strip():
        raise ValueError("Dashboard configuration requires a non-empty name")
    if any(key in config for key in ("overview", "rooms")):
        raise ValueError("Mixed legacy and canonical page configuration")
    pages = config.get("pages")
    if not isinstance(pages, list) or not pages:
        raise ValueError("Keep at least one page")
    paths, page_ids, output_paths, references = set(), set(), set(), []
    for page in pages:
        if not isinstance(page, dict) or not isinstance(page.get("name"), str) or not page["name"].strip():
            raise ValueError("Each page requires a name")
        path = page.get("path")
        if not isinstance(path, str) or not PAGE_PATH.fullmatch(path) or path in paths:
            raise ValueError("Each page requires a unique safe path")
        paths.add(path)
        output_path = page.get("output_path")
        if output_path is not None:
            if not isinstance(output_path, str) or not re.fullmatch(r"views/(?:[a-z0-9_-]+/)*[a-z0-9_-]+\.yaml", output_path) or output_path in output_paths:
                raise ValueError("Page output paths must be safe unique view files")
            output_paths.add(output_path)
        identity = page.get("id")
        if identity is not None:
            if not isinstance(identity, str) or not LOCAL_ID.fullmatch(identity) or identity in page_ids:
                raise ValueError("Each page identity must be safe and unique")
            page_ids.add(identity)
        if "subview" in page and type(page["subview"]) is not bool:
            raise ValueError("Page subview must be a boolean")
        if any(page.get(key) is not None and not isinstance(page[key], str) for key in ("icon", "area")):
            raise ValueError("Page icon and area must be strings")
        identities = set()
        for section in page_sections(page):
            columns = section.get("columns")
            if columns is not None and (type(columns) is not int or not 1 <= columns <= 6):
                raise ValueError("Columns must be an integer between 1 and 6")
            raw = section.get("cards", [])
            if not isinstance(raw, list) or any(not isinstance(card, dict) for card in raw):
                raise ValueError("Raw cards must be a list of Lovelace card objects")
            for card in page_entries(section.get("entities")):
                identity = card.get("id")
                if identity is not None:
                    if not isinstance(identity, str) or not LOCAL_ID.fullmatch(identity) or identity in identities:
                        raise ValueError("Each local card identity must be safe and unique within its page")
                    identities.add(identity)
                role, entity = card.get("template"), card.get("entity_id")
                if role is not None and (not isinstance(role, str) or role not in templates):
                    raise ValueError("Choose a supported page card template")
                if entity is not None and (not isinstance(entity, str) or not ENTITY_ID.fullmatch(entity)):
                    raise ValueError("Page card entity_id must be a valid entity")
                if role not in FREE_CARD_ROLES and not entity and "page" not in card:
                    raise ValueError(f"Page {page['name']}, card {identity or role or entity or 'draft'}: bind or remove the draft card before generation")
                if entity and role not in FREE_CARD_ROLES and role in templates and entity.split(".", 1)[0] not in templates[role]:
                    raise ValueError(f"Page {page['name']}, card {identity or role}: binding is incompatible with its template")
                if any(card.get(key) is not None and not isinstance(card[key], str) for key in ("name", "icon")):
                    raise ValueError("Card name and icon must be strings")
                if card.get("variables") is not None and not isinstance(card["variables"], dict):
                    raise ValueError("Card options must be an object")
                options = card.get("variables") or {}
                if role == "hc_graph_card":
                    validate_power_devices(options, options.get("graph_entity") or entity)
                if role == "hc_vacuum_card":
                    for key in ("action_1", "action_2", "action_3"):
                        action = options.get(key)
                        if isinstance(action, dict) and "data" in action and not isinstance(action["data"], dict):
                            raise ValueError("Vacuum action data must be an object")
                if role == "hc_access_slide_action_card":
                    opener = {"lock": "lock.unlock", "cover": "cover.open_cover", "button": "button.press",
                              "switch": "switch.turn_on", "script": "script.turn_on"}.get((entity or "").split(".")[0])
                    if not opener or options.get("action_service", opener) != opener:
                        raise ValueError("Access opener must use its selected entity's native opening service")
                    if any(key in card and (not isinstance(card[key], dict) or card[key].get("action", "none") != "none")
                           for key in ("tap_action", "hold_action", "double_tap_action")):
                        raise ValueError("Access openers use only the strict slide")
                if role == "hc_energy_period_card" and options.get("period", "day") not in ("day", "month"):
                    raise ValueError("Energy period must be day or month")
                if role == "hc_energy_period_card":
                    validate_energy_options(options)
                if role == "hc_wallbox_current_card" and "shortcuts" in options:
                    presets = options["shortcuts"]
                    if not isinstance(presets, list) or len(presets) > 3 or any(type(value) not in (int, float) or not math.isfinite(value) for value in presets):
                        raise ValueError("Charging shortcuts require at most three finite numbers")
                if role == "hc_light_card":
                    validate_light_options(options)
                if role == "hc_camera_card":
                    camera_popup_stream(entity, options)
                if role == "hc_room_card" and "light_entities" in options:
                    lights = options["light_entities"]
                    if not isinstance(lights, list) or any(not isinstance(light, str) or not ENTITY_ID.fullmatch(light) or not light.startswith("light.") for light in lights):
                        raise ValueError("Room lights must be an explicit list of light entities")
                if role == "hc_media_app_card" and (not isinstance(options.get("app_source"), str) or not options["app_source"].strip()):
                    raise ValueError("Media app requires an explicit source")
                if role == "hc_access_hold_action_card" and "tap_action" in card:
                    action = card["tap_action"]
                    button = entity and entity.startswith("button.")
                    valid = isinstance(action, dict) and (
                        button and action.get("action") == "perform-action" and action.get("perform_action") == "button.press"
                        and action.get("target") == {"entity_id": entity}
                        or not button and action.get("action") == "toggle"
                    )
                    if not valid:
                        raise ValueError("Security action must control its selected entity with the native service")
                apple_tv = card.get("apple_tv")
                if apple_tv is not None and apple_tv is not False:
                    if not isinstance(apple_tv, dict):
                        raise ValueError("Apple TV options must be an object or false")
                    for key in ("remote_entity", "volume_remote_entity"):
                        binding = apple_tv.get(key)
                        domains = ("remote",) if key == "remote_entity" else ("remote", "media_player")
                        if binding is not None and (not isinstance(binding, str) or not ENTITY_ID.fullmatch(binding) or binding.split(".", 1)[0] not in domains):
                            raise ValueError("Choose a compatible media remote entity")
                    apps = apple_tv.get("apps", [])
                    if not isinstance(apps, list) or any(not isinstance(app, dict) or not isinstance(app.get("source"), str) or not app["source"].strip() for app in apps):
                        raise ValueError("Media apps require an explicit ordered list of sources")
                if "page" in card:
                    references.append(card["page"])
                elif role in ("hc_navigation_card", "hc_room_card"):
                    action = card.get("tap_action")
                    if not isinstance(action, dict) or action.get("action") not in ("navigate", "none"):
                        raise ValueError("Choose a destination for the page shortcut")
                if role == "hc_scene_collection_card":
                    members = card.get("entities")
                    if not isinstance(members, list):
                        raise ValueError("Scene collection entities must be an explicit list")
                    for member in page_entries(members):
                        binding = member.get("entity_id")
                        if not isinstance(binding, str) or not ENTITY_ID.fullmatch(binding) or binding.split(".", 1)[0] not in ("scene", "switch", "input_boolean"):
                            raise ValueError("Scene collection members must be native scenes or toggle entities")
    if not isinstance(config.get("landing_page"), str) or config["landing_page"] not in paths:
        raise ValueError("Select an existing landing page")
    navigation = config.get("navigation", [])
    if not isinstance(navigation, list):
        raise ValueError("Navigation must be a list")
    for route in navigation:
        if isinstance(route, str):
            references.append(route)
        elif isinstance(route, dict) and "page" in route:
            references.append(route["page"])
        elif not isinstance(route, dict) or not isinstance(route.get("url"), str) or not isinstance(route.get("label"), str):
            raise ValueError("Navigation entries require a page or a labeled URL")
    if any(not isinstance(reference, str) or reference not in paths for reference in references):
        raise ValueError("Retarget or remove references to missing pages")
    return paths
