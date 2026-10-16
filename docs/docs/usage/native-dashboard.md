---
title: Native dashboard editing
layout: page
parent: Usage
nav_order: 4
---

# Native dashboard editing

Marao supports its existing builder and Home Assistant's normal dashboard editor.
Their dashboards are independent: editing one never synchronizes or replaces the other.
Native editing requires Home Assistant 2026.6 or later and the Marao integration.

## Create a native dashboard

1. Open **Settings → Dashboards → Add dashboard**.
2. Select **Marao** under Community dashboards.
3. Choose a name and an unused route. The suggested name is **Marao Native**.
4. Open the starter and use its administrator **Edit dashboard** pencil.
5. Select **Take control** in Home Assistant's dialog.

Before Take control, the starter is generated from eligible entities and areas.
Take control saves the displayed Home, Rooms and room-detail pages as ordinary
Sections views. Afterward, additions, removals, order and empty pages belong to
Home Assistant. Registry changes and Marao restarts do not refill them.

The starter applies the **Marao Dashboard** theme and floating navbar. Its pencil
is separate from navigation entries. The navbar stays in one row and places
additional destinations in a matching vertical menu above its rightmost toggle.
The native route editor accepts the complete ordered list without a count limit;
preview shows the available-width partition without navigation or shell effects. While editing, Home Assistant's
toolbar returns. Cards added to other dashboards do not change their native shell.

## Add and edit cards

Use **Add card** and select a named Marao card, or choose an entity and its compatible
Marao suggestion. Names, icons, bindings and supported options have visual controls.
Advanced options retain native structured command data; unknown fields remain
available through Home Assistant's YAML tab and survive ordinary visual edits.

Media remotes and apps, group members and filters, vacuum actions, appliance
bindings, camera providers, energy units/precision, charging presets and navigation
can be configured without the Marao builder. Ordered lists have Add, Remove and
Move up/down controls. Removing every member or app retains an explicit empty list.

Native cards automatically own their detail sheets, including climate modes,
alarm controls, access actions, camera events, media controls and history.
Duplicate instances have independent sheets. Deliberately supplied popup hashes
remain external references: configure their matching popup separately.

Editor previews cannot dispatch device services or activate the fullscreen shell.
Normal controls retain authoritative HA state, strict access slides, security holds,
availability guards and transient masked alarm codes. Alarm codes are never card settings.

    type: custom:marao-native-media-card
    entity: media_player.living_room
    apple_tv:
      remote_entity: remote.living_room
      apps:
        - source: TV
          name: Television
          icon: mdi:television
    variables:
      hc_show_background_art: true

Existing generic Marao types and public hc_* template keys continue to work.
There is no automatic conversion or copying of an existing builder dashboard.
Native starter ownership is recorded as `marao: {mode: native, version: 1}`.
Builder generation, setup repair and history restoration refuse native destinations.

## Example with the standard Home Assistant shell

The [safe native dashboard example](https://github.com/diogomrpr/MaraoDashboard/blob/main/ha-test/examples/native-dashboard.yaml)
contains Home, Devices and Energy Sections views with 20 Marao cards. It demonstrates
light and climate controls, media remotes/apps, groups, appliance bindings, automatic
detail sheets, energy history and charging presets using disposable demo entities.
Each view also includes a native Marao Navbar card with Home, Devices and Energy
links. It keeps Home Assistant's standard toolbar, view tabs and dashboard editor.
Add **Marao Navbar** from the card picker and edit its ordered routes visually.

Paste the example into an ordinary storage dashboard's raw configuration editor.
Replace its demo entities with your own bindings and update the navigation card
and navbar destinations to your dashboard route. Individual cards can then be
configured in the visual editor.
The example belongs in `ha-test/`; it is not included in the shipped integration.

## Read-only compilation

Authenticated `marao_dashboard/native/card` requests take explicit card configuration,
a live instance ID, dashboard route, language and referenced entity metadata.
They return the shared runtime card and its automatic detail sheets.
Rendering requests use `validate_units: false` so a previously saved energy card
can display the existing neutral fallback when source unit metadata disappears.
Editor requests use the default strict unit validation before accepting a change.
`marao_dashboard/native/starter` takes title, route, language, entity and area
metadata obtained through native HA APIs and returns an expanded Lovelace configuration.
Neither command writes files/storage/history or reads the saved builder dashboard.
The integration continues to require administrator access for builder writes and restore.
