---
title: Custom cards
layout: default
---

# Custom cards

The integration loads five first-party custom elements. The builder generates
them automatically, and each one can also be used in Manual card YAML.

## Header card (`marao-header-card`)

```yaml
type: custom:marao-header-card
title: Living room
subtitle: My home
icon: mdi:sofa
back_path: /my-home/home
```

`title` is required. `subtitle`, `icon`, and `back_path` are optional. A
configured `back_path` adds a back button that navigates inside Home Assistant.

## Room card (`marao-room-card`)

```yaml
type: custom:marao-room-card
name: Living room
area_id: living_room
icon: mdi:sofa
navigation_path: /my-home/living-room
entity_count: 12
camera_count: 1
```

`name` is required. `area_id`, `icon`, `navigation_path`, `entity_count`, and
`camera_count` are optional. The card navigates only when `navigation_path` is
set. Counts are display values, not live registry queries; generated cards are
updated when the dashboard is rebuilt.

## Entity card (`marao-entity-card`)

```yaml
type: custom:marao-entity-card
entity: light.living_room
name: Main light
icon: mdi:ceiling-light
```

`entity` is required. `name` and `icon` override the entity's Home Assistant
values. The primary controls depend on the entity domain:

| Domain | Controls |
| --- | --- |
| `light`, `switch`, `fan`, `input_boolean`, `humidifier` | Toggle. |
| `lock` | Lock directly; unlock through Home Assistant's more-info dialog. |
| `cover` | Open and close. |
| `vacuum` | Start and return to base. |
| Other domains | Open Home Assistant's more-info dialog. |

Selecting the card outside a control also opens more-info.

## Camera card (`marao-camera-card`)

```yaml
type: custom:marao-camera-card
entity: camera.front_door
name: Front door
event_limit: 12
```

`entity` is required. The card displays Home Assistant's live camera stream and
opens recent events in a dialog when selected. See the [camera provider
guide](cameras.html) for all Frigate and UniFi Protect options.

## Builder card (`marao-dashboard-builder`)

```yaml
type: custom:marao-dashboard-builder
```

The builder is an administrator-only authoring tool and is not included in the
dashboard it creates. See the [builder guide](builder.html) for its options and
replacement safeguards.
