"""Declarative metadata for the guided dashboard editor."""

from __future__ import annotations

from typing import Any


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
    _field("custom_label", "Label prefix", "text", advanced=True),
]


EDITOR_CATALOG: dict[str, Any] = {
    "version": 1,
    "supported_domains": [
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
                _field("enable_slider", "Speed slider", "boolean", default=False),
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
            "domains": ["switch", "input_boolean"],
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
            "domains": ["sensor"],
            "description": "Operation state, progress, remaining time, and refill warnings.",
            "variables": [
                _field("progress_entity", "Progress", "entity", domains=["sensor"]),
                _field("remaining_time_entity", "Remaining time", "entity", domains=["sensor"]),
                _field("salt_entity", "Salt warning", "entity", domains=["binary_sensor", "sensor"]),
                _field("rinse_aid_entity", "Rinse-aid warning", "entity", domains=["binary_sensor", "sensor"]),
                _field("active_program_entity", "Active program", "entity", domains=["select", "sensor"]),
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
            "domains": ["sensor"],
            "description": "A large metric with a configurable history graph.",
            "variables": [
                _field("show_graph_line", "Graph line", "boolean", default=True),
                _field("show_graph_fill", "Graph fill", "boolean", default=True),
                _field("show_icon", "Show icon", "boolean", default=False),
                _field("graph_color", "Graph color", "color", advanced=True),
                _field("graph_background", "Background", "color", advanced=True),
            ],
        },
        {
            "id": "hc_toggle_graph_card",
            "label": "Toggle graph",
            "icon": "mdi:chart-areaspline",
            "domains": ["sensor"],
            "description": "A metric graph that also controls a related toggle.",
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
                _field("hc_label_prefix", "Label prefix", "text", advanced=True),
                _field("hc_icon_color", "Icon color", "color", advanced=True),
                _field("hc_color", "Card color", "color", advanced=True),
            ],
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
