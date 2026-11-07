---
title: People and entity collections
description: Keep explicit membership, useful summaries and safe group controls.
---

Collections retain the entities and order you choose. Adding a new entity to a Home Assistant area does not silently refill a saved collection.

## People

The People card displays selected `person.*` entities using Home Assistant's reported Home, Away or named-place state. Configure tracking in HA first. Marao does not poll for location, store live location data or add a map.

People remain in saved order, left to right and then down. Optional top-level `columns` accepts 1–6; omitting it keeps one column. Narrow widths and enlarged text may reduce the visible column count. Names and places wrap, and an unavailable person does not hide another person's location.

Pictures are used when available unless you select an icon. Failed pictures fall back to an account icon. The card is informational; the room-following navbar is a separate [navigation feature](../navigation/).

## Entity Groups

Entity Groups summarize selected lights, covers, climates or batteries and open their individual controls. Choose **All entities** or **Active only** for the sheet. Lights default to Active only; the other types default to All entities. Filtering changes presentation, not the complete configured action scope.

The card editor shows members once, using the same expandable rows as navigation settings. Drag the handle to reorder, expand a row to change its entity, display name or icon, and use its overflow menu for full card settings, move controls or deletion. **Add entity** below the list adds one compatible member without replacing existing settings. Changes share the outer card Save/Cancel. Renaming or moving members preserves their individual options; changing a member's entity keeps its section assignment.

| Group | Active means |
| --- | --- |
| Lights | On |
| Covers | Open or opening |
| Climate | An enabled mode, including idle operation |
| Batteries | A valid percentage below 20 |

Add named sections to organize members by room or floor. Each member belongs to at most one section; unassigned members stay in Other. Deleting a section keeps its members. Without sections, the flat list remains.

Whole-group and section controls act on eligible configured members. Unavailable or unsupported devices are excluded; controls with no eligible targets are disabled. Buttons show their action without a repeated eligibility sentence below them, and reported service errors remain visible. Tap-based Open all excludes doors, gates and garages; open those with their individual strict slides. Climate bulk actions do not invent a supported mode or change temperatures. Battery groups remain read-only.

Battery severity follows the lowest valid percentage, while the displayed percentage remains the first usable reading. Invalid or missing values do not become zero. A known low battery retains its warning even if another member is unavailable.

After **Edit popup**, manage the group's type, explicit member selection and filter
in the parent card; arrange sections in its native source view. A type change
uses only compatible selected members. Prior managed layout, suppressed controls
and selections are retained for returning to that type. Independent custom cards
remain in place. For example, a light group can become a cover group with selected
fake covers, then return to its light selection and resized controls. Hidden
members still count for actions; deleted controls do not. See [popup layouts](../popups/).

## Scene collections

Scene collections keep selected options in order, with local names and icons. Opening, viewing or editing a collection does not activate a scene. Confirm changes through the native card dialog's Save control.

See the individual [card references](../../cards/) for editable examples and complete configuration fields.

Groups can also use [embedded Popup content](../popups/#customize-content-in-the-opening-card). In Custom mode, saved popup children define membership independently of parent selections. Hidden children remain members; deleting a child removes it from summary scope. Built-in all/section actions operate only on their containing embedded occurrence. Switching to Automatic retains the custom snapshot. Legacy linked/managed sources keep their existing parent synchronization.
