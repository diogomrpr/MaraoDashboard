---
title: Entity Group
layout: page
parent: Cards
---

# Entity Group

An Entity Group summarizes selected lights, covers, battery sensors or
thermostats and opens their existing controls in a sheet. Opening or filtering
the sheet does not operate any member.

Choose **Entity Group** in Home Assistant’s native Add card picker. Select its type,
name, icon and **All entities** or **Active only**, then search members across
rooms. Edit each member through the usual card options. Changing type retains
every selection and identifies incompatible members; remove or correct them
before confirming. Missing or unavailable references remain saved.

```json
{
  "type": "custom:marao-entity-group-card",
  "template": "md_entity_group_card",
  "id": "living-lights",
  "name": "Living room lights",
  "icon": "mdi:lightbulb-group-outline",
  "entity_type": "light",
  "popup_filter": "active",
  "entities": [
    "light.ceiling",
    {"entity_id": "light.reading", "variables": {"enable_slider": false}}
  ]
}
```

Use this complete configuration in the card's native YAML editor. Native
Save/Cancel controls manage the draft. Per-member edits retain attached options,
explicit empty lists and order. New area entities never refill saved membership.
Nested groups and incompatible member types are rejected.

| Type | Active means | Summary |
| --- | --- | --- |
| `light` | On | Active count or All off |
| `cover` | Open or opening | Active count or All closed |
| `climate` | An enabled mode, including idle operation | Enabled count or All off |
| `battery` | A valid percentage below 20 | First usable percentage and low count |

Summary readings always consider the complete deduplicated membership. Invalid
battery readings are unavailable, never zero. All entities includes inactive and
disabled unavailable rows; Active only follows authoritative changes while open.
Eligible controls remain mounted during gestures. Removing a row cancels its
interaction and keeps focus inside the sheet. Empty selections and empty active
results have readable localized messages. Fully unknown/unavailable groups are
neutral and disabled; a usable secondary keeps a partial group reachable.

Battery-group tile colors follow the lowest valid percentage across the complete
deduplicated selection: red below 20, yellow from 20 to below 80, and green at 80
or above. The displayed percentage remains the first usable reading. A known
critical battery stays red when another member is unavailable, keeping the low
count. Partially available groups keep their normal summary and palette without
an unavailable count or member-error row. Open the sheet to see each member's
status. Complete loss or disconnection stays neutral with a concise status. Reported errors retain
their existing priority. Filtering the popup does not change severity.

The converted `overview-maintenance` group retains legacy sensors with `battery`
in their entity ID even without a battery device class. Other battery groups
require battery metadata or an explicit `md_battery_card` member template.

Lights default to Active only; other types default to All entities. Brightness,
blind position, single/dual thermostat targets and modes retain their existing
options. Battery rows are read-only. Door/garage/gate covers retain strict slide
opening and explicit safe closing, including open-only capability.

Each live card occurrence owns its automatic sheet and required member sheets.
Native duplication creates independent automatic details even when the saved
configuration is identical. An explicit external popup hash keeps its authored
target. Deleting one card releases its own details without changing another card.

After removing or editing a member, use the native card dialog's **Save**.
Cancelling leaves the saved card unchanged. Removed members remain available in
search so they can be added again. Legacy source exports retain their original
group IDs and options in conversion provenance; see the [migration guide](../../installation/native-migration.md).
