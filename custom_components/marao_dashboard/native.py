"""Read-only native card and dashboard composition, using the shared generator."""

from copy import deepcopy
import re

from . import generator as g
from .editor import EDITOR_CATALOG
from .page_model import page_sections

NATIVE_MARKER = {"mode": "native", "version": 1}
DIRECT_CARDS = {
    "navbar": "custom:marao-navbar-card",
    "popup": "custom:marao-popup-card",
    "camera-events": "custom:marao-camera-events-card",
    "frigate-events": "custom:marao-frigate-events-card",
}


def native_type(role):
    return "custom:marao-native-" + role.removeprefix("hc_").removesuffix("_card").replace("_", "-") + "-card"


def native_owned(config, *, aliases=True):
    """Recognize native ownership even when its version is newer than ours."""
    if not isinstance(config, dict):
        return False
    marker = config.get("marao")
    if isinstance(marker, dict) and marker.get("mode") == "native":
        return True
    if isinstance(config.get("strategy"), dict) and config["strategy"].get("type") == "custom:marao-starter":
        return True
    def contains(value):
        if isinstance(value, dict):
            return str(value.get("type", "")).startswith("custom:marao-native-") or any(contains(child) for child in value.values())
        return isinstance(value, list) and any(contains(child) for child in value)
    return aliases and contains(config.get("views", []))


def native_catalog():
    """One serializable catalog for both native adapters and their forms."""
    catalog = deepcopy(EDITOR_CATALOG)
    for card in catalog["cards"]:
        card["type"] = native_type(card["id"])
        card["entity_optional"] = card.get("entity_optional", not card["domains"])
        if card["id"] in ("hc_timeline_card", "hc_energy_period_card"):
            card["legacy_type"] = {"hc_timeline_card": "custom:marao-state-timeline-card",
                                   "hc_energy_period_card": "custom:marao-energy-period-card"}[card["id"]]
    for family, runtime in DIRECT_CARDS.items():
        catalog["cards"].append({"id": family, "type": f"custom:marao-native-{family}-card",
                                 "runtime_type": runtime, "label": family.replace("-", " ").title(),
                                 "domains": ["camera"] if "events" in family else [],
                                 "entity_optional": family in ("navbar", "popup"), "variables": []})
    return catalog


def _registry(entities):
    if not isinstance(entities, list) or len(entities) > 20000:
        raise ValueError("Native entity metadata must be a bounded list")
    if any(not isinstance(entity, dict) or not isinstance(entity.get("entity_id"), str)
           or not re.fullmatch(r"[a-z0-9_]+\.[a-z0-9_]+", entity["entity_id"]) for entity in entities):
        raise ValueError("Invalid native entity metadata")
    return deepcopy(entities)


def compile_card(config, instance, url_path, entities=None, language="en", validate_units=True):
    """Compile explicit client input only; never read or write installed data."""
    if not isinstance(config, dict):
        raise ValueError("Native card configuration must be an object")
    if not isinstance(instance, str) or not re.fullmatch(r"[a-z][a-z0-9_-]{0,47}", instance):
        raise ValueError("Invalid native card instance")
    g.validate_dashboard_key(url_path)
    catalog = {card["type"]: card for card in native_catalog()["cards"]}
    spec = catalog.get(config.get("type"))
    if not spec:
        raise ValueError("Choose a supported native Marao card")
    if spec.get("runtime_type"):
        runtime = {**deepcopy(config), "type": spec["runtime_type"]}
        if spec["id"] == "navbar" and (not isinstance(runtime.get("routes", []), list) or len(runtime.get("routes", [])) > 5):
            raise ValueError("Marao navbar supports at most five routes")
        if spec["id"] == "navbar" and any(not isinstance(route, dict) or not isinstance(route.get("url") or route.get("path"), str)
                                         or not (route.get("url") or route.get("path")) or not isinstance(route.get("label"), str) or not route["label"].strip()
                                         for route in runtime.get("routes", [])):
            raise ValueError("Navigation entries require a destination and label")
        if "events" in spec["id"]:
            if not isinstance(runtime.get("entity"), str) or not re.fullmatch(r"camera\.[a-z0-9_]+", runtime["entity"]):
                raise ValueError("Choose a camera entity")
            if "name" in config:
                runtime["title"] = config["name"]
        if spec["id"] == "popup":
            if not isinstance(runtime.get("hash"), str) or not re.fullmatch(r"#[a-zA-Z0-9][a-zA-Z0-9_-]*", runtime["hash"]):
                raise ValueError("Choose a valid popup hash")
            if not isinstance(runtime.get("cards", []), list) or any(not isinstance(card, dict) for card in runtime.get("cards", [])):
                raise ValueError("Popup cards must be a list of objects")
        return {"card": runtime, "popups": []}
    variables = deepcopy(config.get("variables", {}))
    if not isinstance(variables, dict):
        raise ValueError("Native card variables must be an object")
    role = spec["id"]
    registry = _registry(entities or [])
    entry = {**deepcopy(config), "template": role, "id": instance}
    entry.pop("type", None)
    if entity := entry.pop("entity", None):
        entry["entity_id"] = entity
    # External references remain authored; automatic identities belong to this instance.
    external = bool(variables.get("popup_hash") or role == "hc_climate_card" and variables.get("mode_selector_hash"))
    action = config.get("tap_action")
    external = external or isinstance(action, dict) and (
        action.get("action") == "none" or action.get("action") == "navigate" and str(action.get("navigation_path", "")).startswith("#"))
    prefix = "#" + instance
    if not external:
        metadata = next((item for item in registry if item["entity_id"] == entry.get("entity_id")), {})
        owns_popup = role in ("hc_security_card", "hc_entity_group_card", "hc_scene_collection_card", "hc_energy_period_card", "hc_media_card", "hc_camera_card")
        owns_popup = owns_popup or role == "hc_graph_card" and variables.get("history_popup")
        owns_popup = owns_popup or entry.get("entity_id") and role not in ("hc_access_slide_action_card", "hc_access_action_card") and g._is_access_entity({**metadata, **entry})
        if owns_popup:
            variables["popup_hash"] = prefix + "-popup"
        if role == "hc_climate_card":
            variables["mode_selector_hash"] = prefix + "-modes"
    entry["variables"] = variables
    if role == "hc_entity_group_card":
        entry.setdefault("entity_type", "light")
        entry.setdefault("entities", [])
        entry.setdefault("name", spec["label"])
    if role == "hc_scene_collection_card":
        entry.setdefault("entities", [])
    if role == "hc_access_action_card":
        service = variables.get("action_service") or ("lock.lock" if str(entity).startswith("lock.") else "cover.close_cover")
        if service not in ("lock.lock", "cover.close_cover"):
            raise ValueError("Use an access opener slide for opening or unlocking")
        variables["action_service"] = service
        variables.setdefault("action_label_key", "common.lock" if service == "lock.lock" else "common.close")
    _validate_actions(entry, registry)
    source = {"config_version": 2, "name": "Native", "landing_page": "home", "navigation": ["home"],
              "pages": [{"name": "Home", "path": "home", "entities": [entry]}]}
    if entry.get("page") and entry["page"] != "home":
        source["pages"].append({"name": "Destination", "path": entry["page"], "entities": []})
    resolved = g._resolve_pages(source, registry, validate_source_units=validate_units)
    item = resolved["pages"][0]["_sections"][0]["ordered_cards"][0]
    _validate_actions(item, registry)
    runtime = g._page_card(item, url_path, language)
    # Runtime tolerates opaque presentation options; controlled generated fields win.
    runtime = {**deepcopy(config), **runtime,
               "variables": {**deepcopy(config.get("variables", {})), **runtime.get("variables", {})}}
    if role == "hc_security_card" and "tap_action" not in config and variables.get("popup_hash"):
        runtime["variables"] = {**runtime.get("variables", {}), "popup_hash": variables["popup_hash"]}
        runtime["tap_action"] = {"action": "navigate", "navigation_path": variables["popup_hash"], "haptic": "heavy"}
    popups = [] if external else g._page_card_popups(item, language)
    return {"card": runtime, "popups": popups}


def _validate_actions(entry, registry=None):
    """Native configuration cannot turn an access or alarm safeguard into a tap."""
    role = entry["template"]
    for key in ("tap_action", "hold_action", "double_tap_action"):
        action = entry.get(key)
        if action is not None and not isinstance(action, dict):
            raise ValueError("Native actions must be objects")
        if not action:
            continue
        service = action.get("perform_action") or action.get("service")
        bound = entry.get("entity_id")
        data = action.get("data") or action.get("service_data") or {}
        if not isinstance(data, dict):
            raise ValueError("Native action data must be an object")
        target = action.get("target", {}).get("entity_id") if isinstance(action.get("target"), dict) else None
        target = target or action.get("entity_id") or data.get("entity_id") or bound
        targets = target if isinstance(target, list) else [target]
        metadata = next((item for item in registry or [] if item["entity_id"] == bound), {})
        if action.get("action") == "toggle" and any(
            str(entity).startswith("lock.") or str(entity).startswith("cover.") and (
                role == "hc_access_card" or str(next((item.get("device_class") for item in registry or [] if item["entity_id"] == entity), "")).lower() in ("door", "garage", "gate"))
            for entity in targets
        ):
            raise ValueError("Opening and unlocking require the access opener slide")
        specific_target = (action.get("target") is None or isinstance(action["target"], dict) and not (action["target"].keys() - {"entity_id"}))
        specific_target = specific_target and not ({"area_id", "device_id"} & data.keys())
        ordinary_cover = (role == "hc_cover_card" and str(bound).startswith("cover.") and targets == [bound]
                          and specific_target and str(metadata.get("device_class") or "").lower() not in ("door", "garage", "gate"))
        if service in ("lock.unlock", "lock.open") or service in ("cover.open_cover", "cover.toggle") and not ordinary_cover:
            raise ValueError("Opening and unlocking require the access opener slide")
        if service in ("alarm_control_panel.alarm_disarm", "alarm_control_panel.alarm_arm_custom_bypass"):
            raise ValueError("Use the alarm detail controls for guarded alarm actions")
        if role == "hc_access_action_card" and action.get("action") not in ("none",):
            raise ValueError("Close and lock cards use their explicit safe service")


def compile_starter(title, url_path, entities, areas=None, language="en"):
    g.validate_dashboard_key(url_path)
    if not isinstance(title, str) or not title.strip():
        raise ValueError("Native dashboard requires a title")
    registry = _registry(entities)
    if not isinstance(areas or [], list) or any(not isinstance(area, dict) or not isinstance(area.get("area_id"), str)
                                              or not isinstance(area.get("name"), str) for area in areas or []):
        raise ValueError("Native area metadata must be a list of named areas")
    area_names = {area["area_id"]: area["name"] for area in areas or []}
    for entity in registry:
        if entity.get("area_id") in area_names:
            entity.setdefault("area_name", area_names[entity["area_id"]])
    source = g.build_base_dashboard_config(registry)
    source["name"] = title
    resolved = g._resolve_pages(source, registry)
    views = []
    routes = g._page_navigation_bar(resolved, url_path, language)["cards"][0]["routes"]
    for page in resolved["pages"]:
        sections = []
        for section in page["_sections"]:
            cards = []
            for item in section["ordered_cards"]:
                descriptor = {key: deepcopy(value) for key, value in item.items()
                              if key not in ("_page_instance", "unit_of_measurement", "supported_features", "device_class")}
                descriptor["type"] = native_type(descriptor.pop("template"))
                if entity := descriptor.pop("entity_id", None):
                    descriptor["entity"] = entity
                descriptor.pop("id", None)
                for key in ("popup_hash", "mode_selector_hash"):
                    descriptor.get("variables", {}).pop(key, None)
                descriptor["grid_options"] = {"columns": 6 if section.get("columns") == 2 else 12, "rows": "auto"}
                cards.append(descriptor)
            cards.extend(deepcopy(section.get("cards", [])))
            if cards:
                sections.append({"type": "grid", "cards": cards})
        sections.append({"type": "grid", "cards": [{"type": "custom:marao-native-navbar-card", "routes": deepcopy(routes), "native": True}]})
        views.append({"type": "sections", "title": g._configured_name(page, language), "path": page["path"],
                      "theme": resolved["theme"], "sections": sections,
                      **{key: page[key] for key in ("icon", "subview") if key in page}})
    return {"config": {"title": title, "marao": deepcopy(NATIVE_MARKER), "views": views}}
