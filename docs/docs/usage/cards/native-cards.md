---
title: Native Home Assistant cards
layout: page
parent: Cards
nav_order: 0
---

# Native Home Assistant cards

In Home Assistant's dashboard editor, choose **Add card** and search for
**Marao**. Each entry is an independent card: Home Assistant owns placement,
Sections resizing, visibility, duplication and deletion. Open the card's editor
to change its entity, name, icon and specialized options. The editor preserves
native layout and visibility settings alongside Marao options.
Compact cards can be resized down to three native columns. Preferred heights
and minimum heights are separate, and smaller explicitly saved native cells
remain editable without rewriting their layout.

Named cards keep the existing descriptor fields. For example:

```yaml
type: custom:marao-light-card
entity_id: light.livingroom
name: Reading light
variables:
  enable_slider: true
grid_options:
  columns: 6
  rows: 3
```

The `template` field is optional for named cards; the type identifies it. When
present, it must match that type. Older generic runtime cards remain supported:
`custom:marao-card` uses `template: md_light_card` and `entity: light.livingroom`.
Use the named picker entry for automatic details and the native visual editor.

Changes to a card's name are local to that card. They do not rename the Home
Assistant entity. YAML editing retains unknown fields, explicit empty lists,
ordered members and structured service commands.

## Automatic details

Camera, media, climate, access, alarm, energy, graph history, entity groups,
scenes and floor plans create their own applicable detail sheets. There is no
separate popup card to add. Duplicating a card creates an independent detail
owner even when the copies retain the same saved `id`. Removing the card
removes its automatic sheets.

An explicit `variables.popup_hash` or `variables.mode_selector_hash` refers to
an authored external sheet. Keep that `custom:marao-popup-card` in the same
view. Marao does not create a competing sheet for an explicit reference. For
entity groups, an external main sheet also owns its nested details. Floor plans
can refer to an external Lights sheet using `variables.lights_popup`. Conversion
retains existing referenced or extended popup sheets as ordinary authored cards.

Card previews and native dashboard edit mode are inert. They show state without
running service actions, navigation, camera fullscreen or security controls.

## Specialized editors

The native editor retains floor-plan image upload, image-side tools and light
marker dialogs; coordinates remain YAML options. A full-page floor plan belongs
in a Panel view. Media retains inline or popup controls, ordered app shortcuts,
remote and volume targets. Energy contributors remain collapsed rows that expand
inline; graph power devices, scene members and entity-group members keep their
order and per-member settings. Existing strict access slides and holds remain
the runtime action controls.

Adding a Marao card to another dashboard applies Marao styling to that card. It
does not opt the dashboard into a shared navbar or hide Home Assistant's toolbar.
See [native dashboard setup](../native-dashboard.md) for shared navigation.

## Card types

| Card | Native type | Descriptor template | Availability |
| --- | --- | --- | --- |
| Title | `custom:marao-title-card` | `md_title_card` | Picker |
| Weather | `custom:marao-weather-card` | `md_weather_card` | Picker |
| Room shortcut | `custom:marao-room-card` | `md_room_card` | Picker |
| Scene collection | `custom:marao-scene-collection-card` | `md_scene_collection_card` | Picker |
| Alarm | `custom:marao-security-card` | `md_security_card` | Picker |
| Access | `custom:marao-access-slide-action-card` | `md_access_slide_action_card` | YAML compatibility |
| Access | `custom:marao-access-hold-action-card` | `md_access_hold_action_card` | YAML compatibility |
| Status | `custom:marao-base-card` | `md_base_card` | Picker |
| Energy period | `custom:marao-energy-card` | `md_energy_period_card` | Picker |
| Media app | `custom:marao-media-app-card` | `md_media_app_card` | Picker |
| Camera | `custom:marao-camera-card` | `md_camera_card` | Picker |
| Light | `custom:marao-light-card` | `md_light_card` | Picker |
| Cover | `custom:marao-cover-card` | `md_cover_card` | Picker |
| Climate | `custom:marao-climate-card` | `md_climate_card` | Picker |
| Fan / exhaust valve | `custom:marao-fan-card` | `md_fan_card` | Picker |
| Media player | `custom:marao-media-card` | `md_media_card` | Picker |
| Access | `custom:marao-access-card` | `md_access_card` | Picker |
| Sensor | `custom:marao-sensor-card` | `md_sensor_card` | Picker |
| Switch | `custom:marao-switch-card` | `md_switch_card` | Picker |
| Number control | `custom:marao-number-card` | `md_number_card` | Picker |
| Wallbox charging current | `custom:marao-wallbox-current-card` | `md_wallbox_current_card` | Picker |
| Vacuum | `custom:marao-vacuum-card` | `md_vacuum_card` | Picker |
| Battery | `custom:marao-battery-card` | `md_battery_card` | Picker |
| Dishwasher | `custom:marao-dishwasher-card` | `md_dishwasher_card` | Picker |
| Washing machine | `custom:marao-washing-machine-card` | `md_washing_machine_card` | Picker |
| Graph | `custom:marao-graph-card` | `md_graph_card` | Picker |
| Toggle graph | `custom:marao-toggle-graph-card` | `md_toggle_graph_card` | Picker |
| Timeline | `custom:marao-timeline-card` | `md_timeline_card` | Picker |
| Page shortcut | `custom:marao-navigation-card` | `md_navigation_card` | Picker |
| Entity Group | `custom:marao-entity-group-card` | `md_entity_group_card` | Picker |
| Alarm controls | `custom:marao-alarm-controls-card` | `md_alarm_controls_card` | Picker |
| Header | `custom:marao-header-card` | `md_header_card` | Picker |
| Glance | `custom:marao-glance-card` | `md_glance_card` | Picker |
| Scene selector | `custom:marao-scene-card` | `md_scene_card` | Picker |
| Access | `custom:marao-access-action-card` | `md_access_action_card` | YAML compatibility |
| Floor Plan | `custom:marao-floorplan-card` | `md_floor_plan_card` | Picker |
