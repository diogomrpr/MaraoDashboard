---
title: Entity Group
layout: page
parent: Cards
---

# Entity Group

An Entity Group summarizes selected lights, covers, battery sensors or
thermostats and opens their existing controls in a sheet. Opening or filtering
the sheet does not operate any member.

Choose **Entity Group** in Add card, or add a group in Overview. Select its type,
name, icon and **All entities** or **Active only**, then search members across
rooms. Edit each member through the usual card options. Changing type retains
every selection and identifies incompatible members; remove or correct them
before confirming. Missing or unavailable references remain saved.

```json
{
  "template": "hc_entity_group_card",
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

Put descriptors in `overview.entity_groups` or room/custom-page `entities`.
Automatic layouts also accept an `entity_group` bucket; fixed-column lists
preserve groups between ordinary cards and shortcuts. Each group requires a
unique stable ID: names and order can change without changing its sheet link.
Duplicating a room/custom page creates new group IDs. Nested groups and mixed
types are rejected before writes. Repeated members merge in configured order;
separate groups and ordinary room cards keep independent selections/options.

| Type | Active means | Summary |
| --- | --- | --- |
| `light` | On | Active count or All off |
| `cover` | Open or opening | Active count or All closed |
| `climate` | An enabled mode, including idle operation | Enabled count or All off |
| `battery` | A valid percentage below 20 | First usable percentage, low count and availability count |

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
critical battery stays red when another member is unavailable, with both low and
unavailable details visible. Noncritical partial groups keep their warning
surface; complete loss or disconnection stays neutral. Reported errors retain
their existing priority. Filtering the popup does not change severity.

The converted `overview-maintenance` group retains legacy sensors with `battery`
in their entity ID even without a battery device class. Other battery groups
require battery metadata or an explicit `hc_battery_card` member template.

Lights default to Active only; other types default to All entities. Brightness,
blind position, single/dual thermostat targets and modes retain their existing
options. Battery rows are read-only. Door/garage/gate covers retain strict slide
opening and explicit safe closing, including open-only capability.

Groups own their sheets and required member sheets. Ordinary generated hashes
derive from stable IDs; reserved Overview IDs preserve its released links.
Conflicting explicit member popup hashes are rejected. Keep groups' IDs distinct
and retain matching member hashes when editing advanced options.

When `overview.entity_groups` is absent, released room selections supply editable
defaults through one shared adapter. Viewing them leaves saved source/history
untouched and the draft clean. Save & Generate persists the reviewed selections;
explicit `[]` suppresses defaults. Saved explicit membership never follows later
registry changes. Downgrading requires the matching prior package and exact
source/generated/owned-state backup, as described in the update guide.

After removing a member, choose **Update**, then **Save & Generate**. The saved
dashboard refreshes immediately; no waiting period or browser cache clearing is
needed. Removed members remain available in search results so they can be added
again. A changed dashboard registration requires the restart reported by the editor.
