"""One-time conversion of predecessor page composition to ordered descriptors."""

from copy import deepcopy
import math

from .page_model import page_entries, page_sections
from .card_names import canonical_entities


def convert_native_storage_dashboard(source):
    """Import saved native selections without discovering replacement entities."""
    from . import generator as g

    if not isinstance(source.get("title"), str) or not source["title"].strip() or not isinstance(source.get("views"), list) or not source["views"]:
        raise ValueError("Native dashboard requires its saved title and nonempty views")
    if "config_version" in source or any(key in source for key in ("name", "rooms", "pages")):
        raise ValueError("Native dashboard cannot contain generator configuration")
    original = deepcopy(source)
    paths = [view.get("path") for view in source["views"] if isinstance(view, dict)]
    if len(paths) != len(source["views"]) or any(not isinstance(path, str) for path in paths) or len(set(paths)) != len(paths):
        raise ValueError("Native dashboard has missing or ambiguous view paths")
    def cards_in(view):
        if "sections" in view and "cards" in view:
            raise ValueError("Native dashboard has ambiguous view content")
        sections = view.get("sections", [{"cards": view.get("cards", [])}])
        if not isinstance(sections, list) or any(not isinstance(section, dict) or not isinstance(section.get("cards", []), list) for section in sections):
            raise ValueError("Native dashboard sections must contain saved card lists")
        return [card for section in sections for card in section.get("cards", [])]
    all_cards = {view["path"]: cards_in(view) for view in source["views"]}
    def destination(route):
        if not isinstance(route, str) or not route.startswith("/marao-dashboard/") or route.count("/") != 2:
            raise ValueError("Native navigation requires its saved Marao dashboard destination")
        target = route.rsplit("/", 1)[-1]
        if target not in paths:
            raise ValueError("Native navigation has a missing destination")
        return target
    lights = {path: [card["entity"] for card in cards if isinstance(card, dict) and card.get("type") == "custom:marao-entity-card" and str(card.get("entity", "")).startswith("light.")]
              for path, cards in all_cards.items()}
    converted = {**deepcopy(source), "config_version": 2, "name": source["title"],
                 "landing_page": paths[0], "navigation": [], "pages": [], "legacy_storage_dashboard": original}
    converted.pop("title"); converted.pop("views")
    for view in source["views"]:
        page = {"id": view["path"], "path": view["path"], "name": view.get("title") or view["path"], "sections": [],
                **{key: deepcopy(view[key]) for key in ("icon", "theme", "subview") if key in view}}
        for index, card in enumerate(all_cards[view["path"]], 1):
            if not isinstance(card, dict):
                raise ValueError("Native dashboard cards must be objects")
            kind = card.get("type")
            descriptor = {**deepcopy(card), "id": f"card-{index}"}
            if kind in ("custom:marao-header-card", "heading"):
                descriptor.update(template="md_title_card", name=card.get("title") or card.get("heading") or "")
                descriptor.pop("title", None); descriptor.pop("heading", None)
            elif kind == "custom:marao-room-card":
                route = card.get("navigation_path")
                target = destination(route)
                descriptor.update(template="md_room_card", page=target, variables={"light_entities": lights[target]})
                if lights[target]:
                    descriptor["entity_id"] = lights[target][0]
                if target == view["path"] and card.get("area_id"):
                    page["area"] = card["area_id"]
            elif kind in ("custom:marao-camera-card", "custom:marao-entity-card"):
                entity = card.get("entity")
                if not isinstance(entity, str) or "." not in entity:
                    raise ValueError("Native entity card has a missing binding")
                descriptor["entity_id"] = entity
                descriptor.pop("entity")
                try:
                    descriptor["template"] = "md_camera_card" if kind == "custom:marao-camera-card" else g._domain_template(descriptor)
                except KeyError:
                    raise ValueError("Native entity card has an unsupported binding") from None
            else:
                page["sections"].append({"columns": 1, "cards": [deepcopy(card)]})
                continue
            descriptor.pop("type", None)
            page["sections"].append({"columns": 1, "entities": [descriptor]})
            if kind == "custom:marao-header-card" and card.get("subtitle"):
                if not isinstance(card["subtitle"], str):
                    raise ValueError("Native header subtitle must be text")
                page["sections"].append({"columns": 1, "cards": [{"type": "markdown", "content": card["subtitle"]}]})
            if kind == "custom:marao-header-card" and card.get("back_path"):
                target = destination(card["back_path"])
                target_view = next(item for item in source["views"] if item["path"] == target)
                page["sections"].append({"columns": 1, "entities": [{"id": f"back-{index}", "template": "md_navigation_card", "page": target,
                    "name": target_view.get("title") or target, "icon": "mdi:arrow-left"}]})
        converted["pages"].append(page)
    g.normalize_config(converted)
    return converted


def convert_legacy_pages(source, registry=None):
    """Keep saved selections; derive historical defaults only for absent keys."""
    from . import generator as g

    if type(source.get("config_version")) is not int or source["config_version"] != 1 or not isinstance(source.get("pages", {}), dict):
        raise ValueError("Page conversion requires dashboard format 1")
    original = deepcopy(source)
    # Conversion keeps saved reading options even if live units disappeared; writes still preflight them.
    legacy = g._resolve_legacy_config(g.normalize_config(source), list(registry or []), validate_source_units=False)
    selected_by_id = {}
    for room in original.get("rooms", []):
        for entity in page_entries(room.get("entities")):
            if entity.get("entity_id"):
                selected_by_id.setdefault(entity["entity_id"], entity)
    result = {key: value for key, value in original.items() if key not in ("overview", "rooms", "pages")}
    result.update(config_version=2, slug=legacy["slug"], theme=legacy["theme"], icon=legacy["icon"], landing_page="overview", pages=[])
    result["legacy_page_options"] = {
        **deepcopy(original.get("legacy_page_options", {})),
        "overview": deepcopy(original.get("overview", {})),
        "pages": deepcopy(original.get("pages", {})),
    }

    def page(path, name, icon, output):
        value = {"id": path, "name": name, "name_key": "nav." + ("home" if path == "overview" else path),
                 "path": path, "icon": icon, "output_path": output, "sections": []}
        result["pages"].append(value)
        return value

    def section(target, descriptors, columns=1):
        if descriptors:
            target["sections"].append({"columns": columns, "entities": descriptors})

    def card(target, value, template, name=None, icon=None, variables=None, name_key=None):
        entity = g._entities_from_values(value)[0] if value is not None else {}
        value = deepcopy(entity)
        if value.get("variables") is not None and not isinstance(value["variables"], dict):
            raise ValueError("Legacy card variables must be an object")
        value.setdefault("template", template)
        if name is not None:
            value.setdefault("name", name)
        elif entity.get("entity_id"):
            value.setdefault("name", g._friendly_name(entity["entity_id"]))
        if icon is not None:
            value.setdefault("icon", icon)
        if variables is not None:
            value["variables"] = {**variables, **value.get("variables", {})}
        if name_key and not entity.get("name"):
            value["name_key"] = name_key
        count = sum(len(part["entities"]) for part in target["sections"])
        value.setdefault("id", f"card-{count + 1}")
        return value

    home = page("overview", "Home", "mdi:home-variant", "views/main/00-overview.yaml")
    overview = original.get("overview") or {}
    if weather := overview.get("weather_entity"):
        weather_card = card(home, weather, "md_weather_card", variables={"show_forecast": True})
        if isinstance(weather, str):
            weather_card.pop("name", None)
        section(home, [weather_card])
    groups = deepcopy(overview["entity_groups"]) if "entity_groups" in overview else g._legacy_overview_groups(legacy)
    names = {"overview-lights": "overview.lights", "overview-blinds": "overview.blinds",
             "overview-climate": "overview.climate", "overview-maintenance": "overview.maintenance"}
    for group in groups:
        group["variables"] = {"popup_hash": g._entity_group_hash(group), **group.get("variables", {})}
        if "entity_groups" not in overview:
            group["name_key"] = names[group["id"]]
    if scenes := g._entities_from_values(overview.get("scenes")):
        groups.append({"id": f"card-{sum(len(part['entities']) for part in home['sections']) + len(groups) + 1}",
                       "template": "md_scene_collection_card", "name": "Scenes", "name_key": "overview.scenes",
                       "icon": "mdi:palette-outline", "entities": deepcopy(overview["scenes"]),
                       "variables": {"popup_hash": "#overview-scenes"}})
    section(home, groups, 2)
    rooms = page("rooms", "Rooms", "mdi:sofa", "views/main/02-rooms.yaml")
    room_cards = []
    for room in legacy["rooms"]:
        lights = room["entities_by_domain"].get("light", [])
        members = [entity for values in room["entities_by_domain"].values() for entity in values if entity.get("entity_id")]
        primary = (lights or members or [{}])[0].get("entity_id", "")
        room_cards.append({"id": f"card-{len(room_cards) + 1}", "template": "md_room_card",
                           **({"entity_id": primary} if primary else {}), "name": room["name"], "icon": room["icon"],
                           "page": room["path"], "variables": {"light_entities": [item["entity_id"] for item in lights], "lights_target_entity": primary}})
    # The historical Rooms grid is retained even when intentionally empty.
    rooms["sections"] = [{"columns": 2, "entities": room_cards}]

    saved_pages = original.get("pages") or {}
    if "security" in saved_pages:
        security = page("security", "Security", "mdi:shield-home", "views/main/01-security.yaml")
        options = saved_pages["security"]
        if alarm := g._page_entity(options, "alarm_entity"):
            section(security, [card(security, alarm, "md_security_card")])
        access = []
        for entity in g._page_entities(options, "access_entities", g._access_entities(legacy)):
            selected = entity if "access_entities" in options else selected_by_id.get(entity["entity_id"], {"entity_id": entity["entity_id"]})
            item = card(security, selected, "md_access_card")
            item["id"] = f"card-{sum(len(part['entities']) for part in security['sections']) + len(access) + 1}"
            access.append(item)
        section(security, access, 2)
        for entity in g._entities_from_values(options.get("actions")):
            if g._is_access_entity(entity):
                item = card(security, entity, "md_access_card")
                item["template"] = "md_access_card"
                section(security, [item])
                continue
            item = card(security, entity, "md_access_hold_action_card")
            item["template"] = "md_access_hold_action_card"
            runtime = g._page_action_card(entity)
            item.update(show_state=False, tap_action=runtime["tap_action"])
            section(security, [item])

    if "energy" in saved_pages:
        energy = page("energy", "Energy", "mdi:lightning-bolt", "views/main/03-energy.yaml")
        options = saved_pages["energy"]
        if entity := g._page_entity(options, "house_power"):
            item = card(energy, entity, "md_graph_card", "House Power", "mdi:flash",
                        {"show_graph_fill": True, "show_graph_line": True, "show_icon": True}, "energy.house_power")
            item["variables"] = {**item["variables"], "history_popup": True,
                                 "popup_hash": entity.get("variables", {}).get("popup_hash", "#energy-house-power")}
            section(energy, [item])
        for key, name, period, icon, hash_name in (
            ("month_energy", "Month Power", "month", "mdi:flash", "month-power"),
            ("today_energy", "Today Power", "day", "mdi:flash-outline", "today-power"),
            ("month_cost", "Month Cost", "month", "mdi:currency-eur", "month-cost"),
            ("today_cost", "Today Cost", "day", "mdi:cash-clock", "today-cost"),
        ):
            if entity := g._page_entity(options, key):
                section(energy, [card(energy, entity, "md_energy_period_card", name, icon,
                                     {"period": period, "popup_hash": "#energy-" + hash_name}, "energy." + hash_name.replace("-", "_"))])
        loads = []
        for load in options.get("loads", []):
            power = g._page_entity(load, "power_entity")
            if not power:
                raise ValueError("Energy load requires a power entity before page conversion")
            entity = {**power, **{key: value for key, value in load.items() if key not in ("power_entity", "toggle_entity", "variables")},
                      "variables": {**power.get("variables", {}), **load.get("variables", {})}}
            if load.get("toggle_entity"):
                entity["variables"].setdefault("toggle_entity", load["toggle_entity"])
            item = card(energy, entity, "md_toggle_graph_card" if load.get("toggle_entity") else "md_graph_card")
            item.setdefault("icon", power.get("icon"))
            item["id"] = f"card-{sum(len(part['entities']) for part in energy['sections']) + len(loads) + 1}"
            loads.append(item)
        section(energy, loads, 2)
        for entity in g._entities_from_values(options.get("appliances")):
            section(energy, [card(energy, entity, g.DOMAIN_TEMPLATES.get(entity['entity_id'].split('.')[0], "md_sensor_card"))])

    if "wallbox" in saved_pages:
        wallbox = page("wallbox", "Wallbox", "mdi:ev-station", "views/main/04-wallbox.yaml")
        options = saved_pages["wallbox"]
        if entity := g._page_entity(options, "status_entity"):
            section(wallbox, [card(wallbox, entity, "md_base_card", "Wallbox Status", "mdi:ev-station", name_key="wallbox.status")])
        metrics = []
        for key, name, icon, name_key in (("charging_power_entity", "Charging Power", "mdi:flash", "wallbox.charging_power"),
                                          ("max_current_entity", "Charging Current", "mdi:current-ac", "wallbox.current")):
            if entity := g._page_entity(options, key):
                item = card(wallbox, entity, "md_graph_card", name, icon,
                            {"show_graph_fill": True, "show_graph_line": True, "show_icon": True}, name_key)
                item["id"] = f"card-{sum(len(part['entities']) for part in wallbox['sections']) + len(metrics) + 1}"
                metrics.append(item)
        section(wallbox, metrics, 2)
        if entity := g._page_entity(options, "current_control_entity"):
            presets = options.get("current_presets", [])
            if not isinstance(presets, list) or len(presets) > 3 or any(type(value) not in (int, float) or not math.isfinite(value) for value in presets):
                raise ValueError("Charging current presets require at most three numbers")
            section(wallbox, [card(wallbox, entity, "md_wallbox_current_card", "Charging Current",
                                  variables={"shortcuts": presets}, name_key="wallbox.current")])
        if entity := g._page_entity(options, "pause_resume_entity"):
            section(wallbox, [card(wallbox, entity, "md_switch_card", "Pause / Resume", "mdi:pause-circle", name_key="wallbox.pause_resume")])

    if "media" in saved_pages:
        media = page("media", "Media", "mdi:television-play", "views/main/05-media.yaml")
        for player in g._media_players(legacy):
            # Registry metadata is runtime-only; take original selected options.
            selected = selected_by_id.get(player["entity_id"], {"entity_id": player["entity_id"]})
            if "players" in saved_pages["media"]:
                selected = next(entity for entity in g._entities_from_values(saved_pages["media"]["players"]) if entity["entity_id"] == player["entity_id"])
            section(media, [card(media, selected, "md_media_card")])
            apple_tv = g._apple_tv_options(player)
            apps = []
            for app in apple_tv["apps"] if apple_tv else []:
                item = {**deepcopy(app), "id": f"card-{sum(len(part['entities']) for part in media['sections']) + len(apps) + 1}",
                        "template": "md_media_app_card", "entity_id": player["entity_id"], "name": app.get("name") or app["source"],
                        "icon": app.get("icon") or "mdi:play-box-outline", "show_state": False,
                        "variables": {"app_source": app["source"]}}
                item.pop("source")
                apps.append(item)
            section(media, apps, 2)

    for kind, values, resolved_values, directory in (
        ("room", original.get("rooms", []), legacy["rooms"], "rooms"),
        ("custom", saved_pages.get("custom", []), legacy["pages"].get("custom", []), "custom"),
    ):
        for index, (saved, resolved) in enumerate(zip(values, resolved_values, strict=True)):
            item = deepcopy(saved)
            item.update(id=resolved["path"], path=resolved["path"], icon=resolved["icon"],
                        output_path=f"views/{directory}/{index:02d}-{g.make_slug(resolved['name'])}.yaml")
            if kind == "room":
                item["subview"] = True
            content = {key: item.pop(key) for key in ("entities", "cards", "columns") if key in item}
            item["sections"] = [
                {"columns": 1, "entities": [{"id": "page-title", "template": "md_title_card", "name": resolved["name"],
                                             "show_icon": False, "show_state": False, "tap_action": {"action": "none"}, "hold_action": {"action": "none"}}]},
                content,
            ]
            result["pages"].append(item)

    saved_navigation = original.get("navigation")
    if saved_navigation is None or saved_navigation and not any(isinstance(route, str) or route.get("page") for route in saved_navigation):
        routes = g._navigation_bar(legacy, g.dashboard_key_for_slug(legacy["slug"]))["cards"][0]["routes"]
        for route in routes:
            path = route["url"].rsplit("/", 1)[-1]
            if route not in (saved_navigation or []):
                route["page"] = path
                route["label_key"] = "nav." + ("home" if path == "overview" else path)
        result["navigation"] = routes
    for target in result["pages"]:
        for container in page_sections(target):
            if "entities" in container:
                container["entities"] = canonical_entities(container["entities"])
    return result
