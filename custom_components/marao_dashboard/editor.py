"""Declarative metadata for the guided dashboard editor."""

from __future__ import annotations

from typing import Any
from copy import deepcopy

from .generator import DASHBOARD_CONFIG_VERSION, ENERGY_UNITS, ENERGY_FORMAT_TEMPLATES


def _field(
    key: str,
    label: str,
    kind: str,
    *,
    advanced: bool = False,
    domains: list[str] | None = None,
    default: Any = None,
    description: str = "",
    multiple: bool = False,
) -> dict[str, Any]:
    field = {
        "key": key,
        "label": label,
        "kind": kind,
        "selector": kind,
        "advanced": advanced,
        "description": description,
    }
    if domains:
        field["domains"] = domains
    if default is not None:
        field["default"] = default
    if description:
        field["description"] = description
    if multiple:
        field["multiple"] = True
    return field


COMMON_CARD_FIELDS = [
    _field("card_color", "Card color", "color", advanced=True),
    _field("custom_label", "Label prefix", "text", advanced=True, description="Binary state is shown by the card and icon. Prefix-only labels are omitted; useful labels and readings remain."),
]


ENERGY_FORMAT_FIELDS = [
    _field("display_unit", "Display unit", "energy_unit", description="Auto keeps the source unit. Selecting a compatible unit converts the reading."),
    _field("display_precision", "Decimal places", "energy_precision", description="Auto trims trailing zeros. Choose 0–6 fixed decimal places."),
]


EDITOR_CATALOG: dict[str, Any] = {
    "version": 1,
    "config_version": DASHBOARD_CONFIG_VERSION,
    "energy_units": ENERGY_UNITS,
    "energy_fields": ENERGY_FORMAT_FIELDS,
    "supported_domains": [
        "alarm_control_panel", "button", "scene", "weather",
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
    ],
    "cards": [
        {
            "id": "hc_title_card", "label": "Title", "icon": "mdi:format-title", "domains": [],
            "entity_optional": True, "description": "An editable heading inside any page or section.", "variables": [],
        },
        {
            "id": "hc_weather_card", "label": "Weather", "icon": "mdi:weather-partly-cloudy", "domains": ["weather", "sensor"],
            "description": "Current weather with an optional native forecast.",
            "variables": [_field("show_forecast", "Forecast", "boolean", default=True)],
        },
        {
            "id": "hc_room_card", "label": "Room shortcut", "icon": "mdi:sofa", "domains": [],
            "entity_optional": True, "page_shortcut": True,
            "description": "Open a page and switch off its explicitly selected lights.",
            "variables": [_field("light_entities", "Room lights", "entity", domains=["light"], multiple=True)],
        },
        {
            "id": "hc_scene_collection_card", "label": "Scene collection", "icon": "mdi:palette-outline", "domains": [],
            "entity_optional": True, "scene_collection": True,
            "description": "Open an ordered collection of native scenes and toggle helpers.",
            "variables": [_field("popup_hash", "Popup hash", "text", advanced=True)],
        },
        {
            "id": "hc_security_card", "label": "Alarm", "icon": "mdi:shield-home", "domains": ["alarm_control_panel"],
            "description": "Alarm state and supported controls with transient code entry.",
            "variables": [_field("popup_hash", "Popup hash", "text", advanced=True)],
        },
        {
            "id": "hc_access_slide_action_card", "label": "Access opener", "icon": "mdi:door-open",
            "domains": ["lock", "cover", "button", "switch", "script"],
            "description": "Slide deliberately to unlock or open the selected access point.",
            "variables": [],
        },
        {
            "id": "hc_access_hold_action_card", "label": "Security action", "icon": "mdi:shield-alert", "domains": ["button", "switch", "input_boolean", "alarm_control_panel"],
            "description": "A deliberate security service action with a 1.2-second hold.", "variables": [],
        },
        {
            "id": "hc_base_card", "label": "Status", "icon": "mdi:information-outline",
            "domains": ["sensor", "binary_sensor", "number", "input_number", "switch", "input_boolean"],
            "description": "A compact entity reading or status.", "variables": [*COMMON_CARD_FIELDS],
        },
        {
            "id": "hc_energy_period_card", "label": "Energy period", "icon": "mdi:chart-bar", "domains": ["sensor"],
            "description": "A day or month reading and its independently named history popup.",
            "variables": [_field("period", "Period", "energy_period", default="day"),
                          _field("popup_hash", "Popup hash", "text", advanced=True)],
        },
        {
            "id": "hc_media_app_card", "label": "Media app", "icon": "mdi:play-box-outline", "domains": ["media_player"],
            "description": "Open a configured source on the selected media player.",
            "variables": [_field("app_source", "App source", "text")],
        },
        {
            "id": "hc_camera_card",
            "label": "Camera",
            "icon": "mdi:cctv",
            "domains": ["camera"],
            "description": "Live camera feed with a generated Frigate or UniFi Protect events popup.",
            "variables": [
                _field("popup_hash", "Popup hash", "text", advanced=True),
                _field("event_provider", "Event provider", "text", advanced=True, default="auto"),
                _field("frigate_camera", "Frigate camera name", "text", advanced=True),
                _field("frigate_instance_id", "Frigate instance ID", "text", advanced=True),
                _field(
                    "unifi_protect_media_source",
                    "UniFi Protect media source",
                    "text",
                    advanced=True,
                ),
                _field("event_limit", "Event limit", "number", default=12),
            ],
        },
        {
            "id": "hc_light_card",
            "label": "Light",
            "icon": "mdi:lightbulb-outline",
            "domains": ["light"],
            "description": "Control a light and optionally show its brightness slider.",
            "variables": [
                _field("enable_slider", "Brightness slider", "boolean", default=True),
                *COMMON_CARD_FIELDS,
            ],
        },
        {
            "id": "hc_cover_card",
            "label": "Cover",
            "icon": "mdi:window-shutter",
            "domains": ["cover"],
            "description": "Open, close, and position a cover or blind.",
            "variables": [_field("card_color", "Card color", "color", advanced=True)],
        },
        {
            "id": "hc_climate_card",
            "label": "Climate",
            "icon": "mdi:thermostat",
            "domains": ["climate"],
            "description": "Control temperature, modes, and an optional history graph.",
            "variables": [
                _field("show_graph", "Temperature graph", "boolean", default=False),
                _field("graph_entity", "Graph entity", "entity", domains=["sensor"]),
                _field("show_mode_buttons", "Mode buttons", "boolean", default=True),
                _field("graph_color", "Graph color", "color", advanced=True),
                _field("setpoint_label", "Setpoint label", "text", advanced=True),
                _field("mode_selector_hash", "Mode popup hash", "text", advanced=True),
            ],
        },
        {
            "id": "hc_fan_card",
            "label": "Fan",
            "icon": "mdi:fan",
            "domains": ["fan"],
            "description": "Control a fan and optionally show its percentage slider.",
            "variables": [
                _field("enable_slider", "Speed slider", "boolean", default=True),
                *COMMON_CARD_FIELDS,
            ],
        },
        {
            "id": "hc_media_card",
            "label": "Media player",
            "icon": "mdi:television-play",
            "domains": ["media_player"],
            "description": "Media controls with artwork and generated popup controls.",
            "variables": [
                _field("hc_show_background_art", "Background artwork", "boolean", default=True),
                _field("hc_background_color", "Background color", "color", advanced=True),
                _field("popup_hash", "Popup hash", "text", advanced=True),
            ],
        },
        {
            "id": "hc_access_card",
            "label": "Access",
            "icon": "mdi:lock-outline",
            "domains": ["lock", "cover"],
            "device_classes": ["door", "garage", "gate"],
            "description": "Guided lock, door, garage, or gate controls with a popup.",
            "variables": [_field("popup_hash", "Popup hash", "text", advanced=True)],
        },
        {
            "id": "hc_sensor_card",
            "label": "Sensor",
            "icon": "mdi:access-point",
            "domains": ["sensor", "binary_sensor"],
            "description": "Show sensor state, last change, and state-aware colors.",
            "variables": [
                _field("hc_card_color", "Active color", "color"),
                _field("on_icon", "On icon", "icon", advanced=True),
                _field("off_icon", "Off icon", "icon", advanced=True),
            ],
        },
        {
            "id": "hc_switch_card",
            "label": "Switch",
            "icon": "mdi:toggle-switch-outline",
            "domains": ["switch", "input_boolean", "scene"],
            "description": "Toggle a switch with optional power usage and graph.",
            "variables": [
                _field("power_entity", "Power entity", "entity", domains=["sensor"]),
                _field("show_graph", "Power graph", "boolean", default=False),
                _field("power_unit", "Power unit", "text", advanced=True, default="W"),
                _field("active_color", "Active color", "color", advanced=True),
                _field("graph_color", "Graph color", "color", advanced=True),
                _field("show_graph_line", "Graph line", "boolean", advanced=True, default=True),
                _field("show_graph_fill", "Graph fill", "boolean", advanced=True, default=False),
            ],
        },
        {
            "id": "hc_number_card",
            "label": "Number control",
            "icon": "mdi:plus-minus",
            "domains": ["number", "input_number"],
            "description": "Increase or decrease a Home Assistant number entity.",
            "variables": [],
        },
        {
            "id": "hc_wallbox_current_card",
            "label": "Wallbox charging current",
            "icon": "mdi:ev-plug-type2",
            "domains": ["number", "input_number"],
            "description": "Large charging-current value with up/down controls and optional shortcuts.",
            "variables": [
                _field("shortcuts", "Charging shortcuts", "number_list", default=[]),
            ],
        },
        {
            "id": "hc_vacuum_card",
            "label": "Vacuum",
            "icon": "mdi:robot-vacuum",
            "domains": ["vacuum"],
            "description": "Vacuum controls with up to three room or segment actions.",
            "variables": [
                _field("icon", "Vacuum icon", "icon"),
                _field("action_1", "Action 1", "vacuum_action", advanced=True),
                _field("action_2", "Action 2", "vacuum_action", advanced=True),
                _field("action_3", "Action 3", "vacuum_action", advanced=True),
            ],
        },
        {
            "id": "hc_battery_card",
            "label": "Battery",
            "icon": "mdi:battery",
            "domains": ["sensor"],
            "device_classes": ["battery"],
            "description": "Battery percentage with green, yellow, and red states.",
            "variables": [
                _field("on_icon", "Battery icon", "icon"),
                _field("hc_card_color", "Card color", "color", advanced=True),
            ],
        },
        {
            "id": "hc_dishwasher_card",
            "label": "Dishwasher",
            "icon": "mdi:dishwasher",
            "domains": ["sensor", "input_select"],
            "description": "Operation state, progress, remaining time, and refill warnings.",
            "variables": [
                _field("progress_entity", "Progress", "entity", domains=["sensor"]),
                _field("remaining_time_entity", "Remaining time", "entity", domains=["sensor"]),
                _field("salt_entity", "Salt warning", "entity", domains=["binary_sensor", "sensor", "input_boolean"]),
                _field("rinse_aid_entity", "Rinse-aid warning", "entity", domains=["binary_sensor", "sensor", "input_boolean"]),
                _field("active_program_entity", "Active program", "entity", domains=["select", "sensor", "input_select"]),
            ],
        },
        {
            "id": "hc_washing_machine_card",
            "label": "Washing machine",
            "icon": "mdi:washing-machine",
            "domains": ["binary_sensor", "sensor"],
            "description": "A focused running-state card for a washing machine.",
            "variables": [],
        },
        {
            "id": "hc_graph_card",
            "label": "Graph",
            "icon": "mdi:chart-line",
            "domains": ["sensor", "number", "input_number"],
            "description": "A large live metric with a project-owned 24-hour background graph.",
            "variables": [
                _field("show_graph_line", "Graph line", "boolean", default=True),
                _field("show_graph_fill", "Graph fill", "boolean", default=True),
                _field("show_icon", "Show icon", "boolean", default=False),
                _field("graph_color", "Graph color", "color", advanced=True),
                _field("graph_background", "Graph background", "color", advanced=True),
                _field("history_popup", "History popup", "boolean", default=False),
                _field("popup_hash", "Popup hash", "text", advanced=True),
            ],
        },
        {
            "id": "hc_toggle_graph_card",
            "label": "Toggle graph",
            "icon": "mdi:chart-areaspline",
            "domains": ["sensor"],
            "description": "A live metric graph that also controls a related toggle.",
            "variables": [
                _field("toggle_entity", "Toggle entity", "entity", domains=["switch", "input_boolean"]),
                _field("show_graph_line", "Graph line", "boolean", default=True),
                _field("show_graph_fill", "Graph fill", "boolean", default=True),
                _field("show_icon", "Show icon", "boolean", default=True),
                _field("graph_color", "Graph color", "color", advanced=True),
                _field("active_color", "Active color", "color", advanced=True),
                _field("active_content_color", "Active content color", "color", advanced=True),
                _field("active_icon_background", "Active icon background", "color", advanced=True),
                _field("inactive_background", "Inactive background", "color", advanced=True),
                _field("inactive_name_color", "Inactive name color", "color", advanced=True),
                _field("inactive_state_color", "Inactive state color", "color", advanced=True),
                _field("inactive_icon_color", "Inactive icon color", "color", advanced=True),
                _field("inactive_icon_background", "Inactive icon background", "color", advanced=True),
            ],
        },
        {
            "id": "hc_timeline_card",
            "label": "Timeline",
            "icon": "mdi:timeline-clock-outline",
            "domains": [
                "binary_sensor",
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
            ],
            "description": "Show recent state transitions for any supported entity.",
            "variables": [_field("timeline_name", "Timeline title", "text")],
        },
        {
            "id": "hc_navigation_card",
            "label": "Page shortcut",
            "icon": "mdi:open-in-new",
            "domains": [],
            "page_shortcut": True,
            "description": "Open another generated dashboard page.",
            "variables": [
                _field("hc_label_prefix", "Label prefix", "text", advanced=True, description="Binary state is shown by the card and icon. Prefix-only labels are omitted; useful labels and readings remain."),
                _field("hc_icon_color", "Icon color", "color", advanced=True),
                _field("hc_color", "Card color", "color", advanced=True),
            ],
        },
        {
            "id": "hc_entity_group_card",
            "label": "Entity Group",
            "icon": "mdi:view-list",
            "domains": [],
            "entity_group": True,
            "description": "Summarize selected lights, covers, batteries or thermostats and open their controls.",
            "variables": [],
        },
    ],
    "pages": {
        "security": {
            "label": "Security",
            "icon": "mdi:shield-home",
            "description": "Alarm, access controls, and security actions.",
            "fields": [
                _field("alarm_entity", "Alarm", "entity", domains=["alarm_control_panel"]),
                _field("access_entities", "Access entities", "entity", domains=["lock", "cover"], multiple=True),
                _field("actions", "Actions", "entity", domains=["button", "switch", "input_boolean"], multiple=True),
            ],
        },
        "energy": {
            "label": "Energy",
            "icon": "mdi:lightning-bolt",
            "description": "Energy summaries, appliance sensors, and configurable loads.",
            "fields": [
                _field("house_power", "House power", "entity", domains=["sensor"]),
                _field("month_energy", "Month energy", "entity", domains=["sensor"]),
                _field("month_cost", "Month cost", "entity", domains=["sensor"]),
                _field("today_energy", "Today energy", "entity", domains=["sensor"]),
                _field("today_cost", "Today cost", "entity", domains=["sensor"]),
                _field("appliances", "Appliances", "entity", domains=["sensor", "binary_sensor"], multiple=True),
            ],
        },
        "wallbox": {
            "label": "Wallbox",
            "icon": "mdi:ev-station",
            "description": "Charging status, power, current, presets, and pause control.",
            "fields": [
                _field("status_entity", "Status", "entity", domains=["sensor"]),
                _field("charging_power_entity", "Charging power", "entity", domains=["sensor"]),
                _field("max_current_entity", "Maximum current", "entity", domains=["sensor", "number"]),
                _field("current_control_entity", "Current control", "entity", domains=["number", "input_number"]),
                _field("current_presets", "Current presets", "number_list", default=[6, 12, 16]),
                _field("pause_resume_entity", "Pause / resume", "entity", domains=["switch", "input_boolean"]),
            ],
        },
        "media": {
            "label": "Media",
            "icon": "mdi:television-play",
            "description": "Media players with optional Apple TV remote and app shortcuts.",
            "fields": [
                _field("players", "Media players", "entity", domains=["media_player"], multiple=True),
            ],
        },
    },
}

EDITOR_CATALOG["cards"].extend([
    {"id": "hc_alarm_controls_card", "label": "Alarm controls", "icon": "mdi:shield-home", "domains": ["alarm_control_panel"],
     "description": "Capability-aware alarm controls with transient PIN entry and guarded actions.", "variables": []},
    {"id": "hc_header_card", "label": "Header", "icon": "mdi:calendar", "domains": ["weather"],
     "entity_optional": True, "description": "Date, weather and optional person and air quality.",
     "variables": [_field("person_entity", "Person", "entity", domains=["person"]),
                   _field("air_quality_sensor", "Air quality", "entity", domains=["sensor"])]},
    {"id": "hc_glance_card", "label": "Glance", "icon": "mdi:view-dashboard", "domains": [],
     "entity_optional": True, "description": "Up to three independently configured readings.",
     "variables": [field for index in range(1, 4) for field in (
         _field(f"entity{index}", f"Reading {index}", "entity"),
         _field(f"entity{index}_name", f"Reading {index} name", "text"),
         _field(f"entity{index}_icon", f"Reading {index} icon", "icon"))]},
    {"id": "hc_scene_card", "label": "Scene selector", "icon": "mdi:palette", "domains": ["select", "input_select"],
     "description": "Native selector options and authoritative selection.", "variables": []},
    {"id": "hc_access_action_card", "label": "Close or lock", "icon": "mdi:lock", "domains": ["lock", "cover"],
     "description": "An explicit safe close or lock action.",
     "variables": [_field("action_service", "Action service", "text")]},
])

for _card in EDITOR_CATALOG["cards"]:
    if _card["id"] in ("hc_base_card", "hc_media_app_card", "hc_access_slide_action_card", "hc_access_hold_action_card", "hc_access_action_card"):
        _card["variables"].extend([
            _field("action_color", "Action color", "color", advanced=True),
            _field("action_label", "Action label", "text", advanced=True),
            _field("action_label_key", "Action translation key", "text", advanced=True),
        ])
    if _card["id"] in ENERGY_FORMAT_TEMPLATES:
        _card["variables"].extend(ENERGY_FORMAT_FIELDS)


def page_templates(config: dict[str, Any], entities: list[dict[str, Any]]) -> dict[str, Any]:
    """Take a creation-only snapshot; never fill or change a saved page."""
    from .generator import _friendly_name, _apple_tv_options, _is_access_entity, GENERATOR_TRANSLATIONS
    from .page_model import page_entries, page_sections

    def bound(role, name, entity=None, **extra):
        return {"template": role, "name": name, **({"entity_id": entity} if entity else {}), **extra}

    def container(icon, cards, columns=1):
        return {"icon": icon, "columns": columns, "entities": cards}

    available = [entity for entity in entities if entity.get("has_state") is True and not entity.get("disabled_by") and not entity.get("hidden_by")]
    def first(domain, suffix=None, device_class=None):
        return next((entity["entity_id"] for entity in available if entity["entity_id"].startswith(domain + ".")
                     and (not suffix or entity["entity_id"].endswith(suffix)) and (not device_class or entity.get("device_class") == device_class)), None)

    weather = first("weather")
    home_sections = [{"columns": 1, "entities": [{"template": "hc_weather_card", "entity_id": weather, "variables": {"show_forecast": True}}]}] if weather else []
    groups = []
    for kind, domain, label, icon in (("light", "light", "overview.lights", "mdi:lightbulb-group-outline"),
                                      ("cover", "cover", "overview.blinds", "mdi:window-shutter"),
                                      ("climate", "climate", "overview.climate", "mdi:thermostat"),
                                      ("battery", "sensor", "overview.maintenance", "mdi:wrench")):
        members = [entity["entity_id"] for entity in available if entity["entity_id"].startswith(domain + ".") and (kind != "battery" or entity.get("device_class") == "battery")]
        if members:
            groups.append({"template": "hc_entity_group_card", "id": "starter-" + kind, "name": GENERATOR_TRANSLATIONS["en"][label], "name_key": label,
                           "icon": icon, "entity_type": kind, "popup_filter": "active" if kind == "light" else "all", "entities": members})
    scenes = [entity["entity_id"] for entity in available if entity["entity_id"].startswith("scene.")]
    if scenes:
        groups.append({"template": "hc_scene_collection_card", "name": "Scenes", "name_key": "overview.scenes", "icon": "mdi:palette-outline", "entities": scenes})
    if groups:
        home_sections.append({"columns": 2, "entities": groups})
    room_links = []
    if isinstance(config.get("pages"), list):
        for page in config["pages"]:
            if not (page.get("area") or page.get("subview")):
                continue
            entries = [entry for section in page_sections(page) for entry in page_entries(section.get("entities"))]
            lights = [entry["entity_id"] for entry in entries if str(entry.get("entity_id") or "").startswith("light.")]
            for entry in entries:
                if entry.get("template") == "hc_entity_group_card" and entry.get("entity_type") == "light":
                    lights.extend(member["entity_id"] for member in page_entries(entry["entities"]))
            primary = next(iter(lights), None) or next((entry.get("entity_id") for entry in entries if entry.get("entity_id")), None)
            room_links.append({"template": "hc_room_card", "name": page["name"], "icon": page.get("icon") or "mdi:sofa", "page": page["path"],
                               **({"entity_id": primary} if primary else {}), "variables": {"light_entities": list(dict.fromkeys(lights))}})
    power = first("sensor", device_class="power")
    energy = [bound("hc_graph_card", "House Power", power, name_key="energy.house_power", icon="mdi:flash", variables={"history_popup": True, "show_icon": True})]
    for suffix, name, key, period, icon in (("month_energy", "Month Power", "energy.month_power", "month", "mdi:flash"),
                                           ("today_energy", "Today Power", "energy.today_power", "day", "mdi:flash-outline"),
                                           ("month_cost", "Month Cost", "energy.month_cost", "month", "mdi:currency-eur"),
                                           ("today_cost", "Today Cost", "energy.today_cost", "day", "mdi:cash-clock")):
        if entity := first("sensor", suffix=suffix):
            energy.append(bound("hc_energy_period_card", name, entity, name_key=key, icon=icon, variables={"period": period}))
    wallbox = []
    for suffix, role, name, key, icon in (("wallbox_status", "hc_base_card", "Wallbox Status", "wallbox.status", "mdi:ev-station"),
                                        ("wallbox_power", "hc_graph_card", "Charging Power", "wallbox.charging_power", "mdi:flash"),
                                        ("wallbox_maximum_current", "hc_graph_card", "Charging Current", "wallbox.current", "mdi:current-ac")):
        if entity := first("sensor", suffix=suffix):
            wallbox.append(bound(role, name, entity, name_key=key, icon=icon))
    current = first("number", suffix="wallbox_current") or first("input_number", suffix="wallbox_current")
    wallbox.append(bound("hc_wallbox_current_card", "Charging Current", current, name_key="wallbox.current", variables={"shortcuts": [6, 12, 16]}))
    if pause := first("switch", suffix="wallbox_pause") or first("input_boolean", suffix="wallbox_pause"):
        wallbox.append(bound("hc_switch_card", "Pause / Resume", pause, name_key="wallbox.pause_resume", icon="mdi:pause-circle"))
    selected_players = {}
    for page in config.get("pages", []) if isinstance(config.get("pages"), list) else []:
        for section in page_sections(page):
            for entry in page_entries(section.get("entities")):
                if str(entry.get("entity_id") or "").startswith("media_player.") and entry.get("template") in (None, "hc_media_card"):
                    selected_players.setdefault(entry["entity_id"], entry)
    players = []
    for entity in available:
        if not entity["entity_id"].startswith("media_player."):
            continue
        selected = deepcopy(selected_players.get(entity["entity_id"], {}))
        player = {**bound("hc_media_card", entity.get("name") or _friendly_name(entity["entity_id"]), entity["entity_id"]), **selected}
        players.append(player)
        if options := _apple_tv_options({**entity, **selected}):
            player["apple_tv"] = {**deepcopy(selected.get("apple_tv") or {}), **deepcopy(options)}
            for app in options["apps"]:
                players.append({**deepcopy(app), "template": "hc_media_app_card", "entity_id": entity["entity_id"],
                                "name": app.get("name") or app["source"], "variables": {"app_source": app["source"]}})
                players[-1].pop("source", None)
    security = [bound("hc_security_card", "Alarm", first("alarm_control_panel"), name_key="security.alarm")]
    security.extend(bound("hc_access_card", entity.get("name") or _friendly_name(entity["entity_id"]), entity["entity_id"])
                    for entity in available if _is_access_entity(entity))
    security.extend(bound("hc_access_hold_action_card", entity.get("name") or _friendly_name(entity["entity_id"]), entity["entity_id"])
                    for entity in available if entity["entity_id"].startswith("button."))
    return deepcopy({
        "empty": container("mdi:file-outline", []), "home": {"icon": "mdi:home-variant", "sections": home_sections},
        "rooms": container("mdi:sofa", room_links, 2),
        "room": {"icon": "mdi:sofa-outline", "subview": True, "sections": [
            {"columns": 1, "entities": [bound("hc_title_card", "Room", id="page-title")]}, {"entities": []}]},
        "security": container("mdi:shield-home", security),
        "energy": container("mdi:lightning-bolt", energy), "wallbox": container("mdi:ev-station", wallbox),
        "media": container("mdi:television-play", players or [bound("hc_media_card", "Media player", name_key="media.player")]),
    })
