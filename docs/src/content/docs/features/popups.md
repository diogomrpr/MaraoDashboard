---
title: Popup layouts
description: Use automatic card details or edit their contents in Home Assistant.
---

Marao detail sheets slide above the navbar, scroll internally and keep the background inactive until closed. Automatic sheets follow the card's configured entities and options. Two identical card configurations still own separate automatic sheets.

## Edit card and popup together

Open the card's normal Home Assistant editor and expand **Popup settings**. This toggle section starts collapsed each time the card editor opens. Expansion does not save or convert anything.

Popup settings contains one **Template** dropdown above an always-editable native canvas. The list contains the current card family's built-in template and **Empty**; Entity Groups are also filtered by entity type. Templates use the entities already configured on the parent card. Selecting one updates the temporary layout immediately, ready to customize.

The dropdown shows the template name only while the actual content matches it. A manual change shows **Custom**; undoing that change back to the exact template restores its name. Opening or saving a child without changes does not mark it Custom. The old model/customization buttons, Automatic/Custom mode selector, entity-binding form and extra Title, Columns, Height and Maximum height fields are absent. Existing saved layout and presentation values remain preserved.

The popup canvas uses Home Assistant's native Sections editing and menus. **Add card** opens the full native picker on its **By card** tab, with public Marao cards suggested first. Home Assistant's built-in cards and normal search remain available. Selecting a card opens its native editing dialog with Configuration, Visibility, Layout and YAML controls. Existing native/opaque cards retain their own visual or YAML editor.

Use a section's native menu → **Edit** to open its native Appearance, Visibility and YAML settings. The native canvas and menus own adding, duplicating, deleting and arranging content; there is no separate Marao editing toolbar or inline inspector.

Parent settings and the popup share the outer Home Assistant **Save** and **Cancel**. A child dialog's **Save** applies its accepted settings to the temporary popup draft; its **Cancel** discards its unaccepted edits. Native validation prevents accepting invalid child settings. Template selection, adding children and layout changes also remain temporary. The outer **Save** persists the complete card; outer **Cancel** discards all of these changes together. Shared sources remain unchanged.

Customized children own their targets and settings. Parent entity changes, registry updates and template releases do not retarget, replace or refill them. Explicit empty content stays empty.

Supported historical generic Marao cards use this same editor while retaining their stored card type and unknown options. Opening or upgrading the dashboard performs no bulk conversion.

If an older source cannot be copied losslessly, the editor shows the reason and keeps **Edit popup** under advanced options for explicit legacy-source editing. That legacy operation retains its save-first, source-identity and recovery safeguards; ordinary embedded content never creates a source view or performs a second Marao save.

## Reuse or return to Automatic

Existing same-dashboard Sections links remain supported through YAML. They are not entries in the built-in template dropdown. The linked setting is:

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

## Customize content in the opening card

The built-in catalog covers Empty, lights/covers/batteries/climate groups, Scene Collection, Climate, Media, Camera, Energy Period, Graph history, Security, Access and Floor Plan lighting. Each card sees only its compatible family and Empty. Required entities and image bindings come from that card's settings. Missing inputs show guidance and retain the draft.

Use each native child dialog's Save or Cancel for the child draft. Native duplication, deletion, arrangement and layout controls preserve unrelated fields and nested containers. Add section supports deliberate empty sections. The canvas is an authoring surface; its rendered device controls cannot operate devices.

These changes share the opening card's native Save/Cancel, even for a new unsaved card. There is no second Marao source save. Cancelling the outer card dialog discards parent and child edits together. Existing persisted `mode: automatic` snapshots remain supported without conversion on opening.

Customized children own their targets, filters, commands and options. Changing the parent or a built-in template never retargets them or restores deleted children. Entity Group summaries and embedded all/section actions derive membership from saved children, including hidden cards and excluding deleted cards. Normal availability, connection and strict access safeguards remain in effect.

Automatic and linked layouts appear as editable private drafts without saving anything on opening. The first actual layout or child change materializes an independent snapshot. Supported Sections copies preserve section fields, names, geometry, visibility, unknown fields, raw nested cards and explicit empty sections. Known managed markers are detached and summary actions become occurrence-local. The original source and other owners are unchanged. Ambiguous, newer, changed or unrepresentable sources show an error and leave the draft untouched; explicit legacy-source access remains under advanced options.

The additive configuration is:

```yaml
popup_content:
  version: 1
  mode: custom
  template: empty
  layout:
    type: sections
    title: My controls
    max_columns: 1
    sections: []
```

Version 1 is independent of the package version. Missing `popup_content` retains released behavior; unsupported content shows an error without activating a retained source. Template IDs record origin only. Keep an exact dashboard backup before authoring; rollback restores the matching package **and** pre-change dashboard together. Older packages cannot be assumed to understand embedded content.
