---
title: Native dashboard editing
layout: page
parent: Usage
nav_order: 4
---

# Edit dashboards in Home Assistant

Marao uses Home Assistant's dashboard editor for views, sections, card placement,
sizing, visibility and raw configuration. Add a named Marao card from the native
card picker, choose its entities and configure its options in the card dialog.
Visual and YAML editing preserve unrelated options. Native Save/Cancel controls
manage the dialog; there is no separate Marao Save & Generate workflow.

Marao cards keep their controls, palette and automatic detail sheets. Duplicated
cards have independent details. An explicitly configured external popup remains
an external target. Floor plans retain image upload, visual light/strip placement
and marker-opened light settings; numeric coordinates remain in YAML. Energy
contributors start collapsed and expand inline inside the card editor.

Dashboard-wide navigation is optional and configured once. An opted-in dashboard
shows the same floating navbar on every view, including newly created or empty
views and direct links. Adding a Marao card to an ordinary dashboard does not
change Home Assistant's shell. See [configuration](../installation/configuration.md)
for shared settings and initial opt-in.

Administrators can use the pencil or hold the navbar for three seconds and select
**Edit dashboard**. Native editing restores Home Assistant's toolbar. The same
menu opens **Marao settings** for global destinations and shortcut preferences.
An explicit empty navigation list stays empty. If all Marao editing entry points
are hidden, administrators retain Home Assistant's native header/edit controls.

Existing strategy/source dashboards need explicit conversion before native
editing. Open the former Marao editor address for recovery exports, preview and
conversion guidance. Rendering an old source is read-only; it never replaces
native edits. Keep the matching old package and exact source/data backup before
conversion. See [migration](../installation/native-migration.md).

The former whole-dashboard Visual/Monaco builder, its draft tooling and automatic
page-link repair are retired. Native view paths and explicit navbar destinations
are maintained with Home Assistant and the shared Marao settings dialog.
