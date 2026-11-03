---
title: Popup layouts
description: Use automatic card details or edit their contents in Home Assistant.
---

Marao detail sheets slide above the navbar, scroll internally and keep the background inactive until closed. Automatic sheets follow the card's configured entities and options. Two identical card configurations still own separate automatic sheets.

## Edit a popup

As an administrator, enter Home Assistant's dashboard edit mode, edit the invoking card and select **Edit popup**. The action opens its linked **Sections** view in Home Assistant's normal editor. Normal popup sheets contain device controls without layout-editing tools.

Summary cards that reference a saved popup by hash also show **Edit popup**. The action follows that popup's existing layout view. If it has none, the first edit creates a view from the saved popup and links the popup definition itself. The summary's hash, original popup content and other cards sharing that popup are retained.

For an automatic popup, the first explicit Edit popup action creates a dedicated Sections subview and links that saved card to it. Later edits reuse the same source. Popup editing has no download, export or import step.

Save a new or modified card before editing its popup, then reopen the card editor. Unsaved card or dashboard changes keep their draft and show save-first guidance. This requires a connected ordinary storage dashboard and an unambiguous saved invoking card. Opening a popup, previewing a card or saving its normal card dialog never creates a view implicitly.

Use Home Assistant's controls to add, move, resize or remove cards and sections. Save individual card dialogs, select Done, and use the subview's back arrow or browser Back to return. Reopen the popup to see the saved layout inside the usual Marao sheet.

Managed layout updates preserve card placement, dimensions, local labels and
custom cards. Deleting a generated control or leaving a section empty is
deliberate: unrelated card-setting changes do not refill it. User visibility
conditions remain alongside Marao's configured Active only/All filter.

The invoking card's settings still manage its generated controls. For example,
changing camera popup stream or event columns updates those controls; changing
the group filter retains extra visibility conditions. Inline media and disabled
graph history retain their source for switching back to popup mode. Saving the
parent card and updating its popup are separate verified saves. Cancel changes
neither. Normal viewing never creates or repairs a source.

Managed child editors show presentation options and explain that behavior follows
the parent. Use **Make custom** for independent behavior. YAML changes to a
managed functional field are also preserved as custom controls rather than
overwritten. Deleting or detaching the last instance keeps that generated role
suppressed. Custom controls are outside future parent retargeting.

## Reuse or return to Automatic

In the invoking card's **Popup layout** field, select an existing Sections view from the same dashboard, or choose **Automatic** to restore its retained automatic configuration. The YAML setting is:

```yaml
popup_view: living-room-controls
```

The path accepts lowercase letters, digits, underscores and hyphens. The linked view owns layout and custom content; managed controls follow the parent settings while preserving local presentation. Renaming or deleting the path requires fixing the reference. Removing the reference or deleting the invoking card does not delete the source view.

Compatible owners can share a source. When one owner's settings differ, Marao
creates a preserved copy for that occurrence and retains the original source
and hashes for other owners. A direct `popup_view` takes precedence over a
retained legacy hash. Older unmarked layouts are adopted only on explicit Edit
popup when generated bindings can be proved; otherwise a managed copy preserves
their custom content. Unsupported newer metadata and ambiguous sources are errors.

Before a popup write, browser storage temporarily retains the exact original and
proposed dashboard. Confirmed or unused transactions are removed; this is not a
permanent backup archive. Storage failure prevents the write. After an uncertain
save, reopen the editor for a read-only saved-state check. Divergent changes stay
blocked without automatic rollback or retry. Stale controls remain unavailable
with readable guidance; **Updating popup…** appears only during an actual update.

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

Section scope follows the section containing the action card. `scope: all` targets the entire linked view. Buttons retain their action labels without a repeated eligibility or skipped-target sentence below them. Unavailable or unsupported targets remain excluded, and reported service errors remain visible. Access-point opening remains an individual slide action; a tap-based bulk opening control never opens doors, gates or garages. Battery groups remain read-only.
