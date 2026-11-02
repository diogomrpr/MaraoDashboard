---
title: Popup layouts
description: Use automatic card details or edit their contents in Home Assistant.
---

Marao detail sheets slide above the navbar, scroll internally and keep the background inactive until closed. Automatic sheets follow the card's configured entities and options. Two identical card configurations still own separate automatic sheets.

## Make a layout editable

As an administrator, open a popup and select **Create editable layout**. Marao copies its current content once into a dedicated Home Assistant **Sections** subview and links the invoking card to it. Download and keep the recovery JSON containing the original and proposed dashboard.

This requires a connected ordinary storage dashboard and an unambiguous saved invoking card. Opening a popup, previewing a card or saving its normal card dialog never creates a view implicitly.

Choose **Edit layout** to open the source subview. Use Home Assistant's normal controls to add, move, resize or remove cards and sections. Save individual card dialogs, select Done, and use the subview's back arrow to return. The popup then displays the saved layout inside the usual Marao sheet.

## Reuse or return to Automatic

In the invoking card's **Popup layout** field, select an existing Sections view from the same dashboard, or choose **Automatic** to restore its retained automatic configuration. The YAML setting is:

```yaml
popup_view: living-room-controls
```

The path accepts lowercase letters, digits, underscores and hyphens. The linked view owns its content, sizes, visibility and sections; Marao does not regenerate it. Renaming or deleting the path requires fixing the reference. Removing the reference or deleting the invoking card does not delete the source view.

Explicit external popup hashes retain their existing ownership. Missing, ambiguous or unsupported views show an error instead of silently choosing another view. If a save cannot be confirmed, keep the recovery file and reload before retrying.

## Entity Groups and section actions

An Entity Group with a linked layout derives compatible members from saved cards in the view. Moving or deleting member cards changes the scope. Hidden cards still count as configured members. The original automatic membership, sections and filter are retained for switching back to Automatic.

Generated summary controls can target a section or the whole view:

```yaml
type: custom:marao-summary-actions
popup_view: living-room-controls
entity_type: light
scope: section
grid_options:
  columns: 12
  rows: auto
```

Section scope follows the section containing the action card. `scope: all` targets the entire linked view. Controls report eligible and excluded targets. Access-point opening remains an individual slide action; a tap-based bulk opening control never opens doors, gates or garages. Battery groups remain read-only.
