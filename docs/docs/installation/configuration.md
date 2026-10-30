---
title: Configuration
layout: page
parent: Installation
nav_order: 1.3
---

# Configure Marao Dashboard

## Create an editable Home Assistant dashboard

Install the [HACS Dashboard package](downloads.md) on supported stable Home
Assistant, then refresh HA. Create an ordinary editable dashboard in
**Settings → Dashboards** with your chosen address, title, icon and sidebar/admin
settings. Use Home Assistant's editor to add views, Sections layouts, badges and
cards. Select a named Marao card from **Add card** and configure it in the native
card dialog.

Each Marao card is independently editable and can be placed beside built-in or
other installed HA cards. Home Assistant owns card placement, resizing,
visibility, view order and saving. A Marao card on an otherwise ordinary dashboard
keeps its controls and appearance without changing the surrounding HA shell.
See [native card configuration](../usage/native-card-configuration.md) for the
specialized forms and [the card catalog](../usage/cards/index.md) for each family.

Existing Marao strategy/source dashboards require explicit conversion first.
Follow [migration and recovery](native-migration.md), retaining the matching
package and exact private source/data backup. Updating assets does not convert or
replace a saved dashboard. The former Marao Visual/Monaco builder and
**Save & Generate** workflow are retired.

## Configure shared navigation once

An optional dashboard-level `marao` settings block enables Marao's floating
navbar and scoped dashboard appearance. The same navbar appears automatically on
every view, including new or empty views and direct links to a secondary page.
No navbar card or reference is needed in each view.

Conversion prepares this block for an existing source dashboard. For a new empty
dashboard, the following complete example supplies one valid initial destination:

```yaml
marao:
  version: 1
  navbar:
    routes:
      - path: /marao-dashboard/home
        label: Home
        icon: mdi:home
  show_cache_reset: true
  show_editor_button: true
views:
  - title: Home
    path: home
    type: sections
    sections: []
```

Use your actual dashboard address and view path. **For a dashboard that already
has content, add only the `marao` block in HA's raw configuration editor and keep
all existing views and other settings.** Choose one of those existing views for
the initial destination so the navbar menu is reachable.

Administrators can then hold anywhere on the bottom navbar for three seconds and
open **Marao settings** (**Definições Marao**). Add, rename, reorder or remove
shared destinations there. Destinations can be views in this dashboard or
explicit HTTP links. A saved destination that no longer matches a current view
is identified for correction; Marao does not recreate the deleted page.

New views use the existing navbar but are not silently added to its explicit
route list. Add them in shared settings when they should be destinations. A view
absent from the list does not mark an unrelated destination as selected.

The navbar stays in one row. When the available width cannot fit all configured
destinations, **More destinations** opens a matching vertical menu. Every saved
entry remains reachable in configured order. An explicitly empty route list
stays empty and removes the navbar, including its hold target. Restore routes
through HA's raw editor if you deliberately empty it.

## Open native editing and maintenance

Administrators can use the main-page pencil or hold the navbar for three seconds
and select **Edit dashboard** (**Editar painel**). Both open Home Assistant's
native editor. Its toolbar and card controls remain available while editing;
Marao's viewing navbar and fullscreen adjustments return after editing ends.

The same administrator menu offers **Clear cache and refresh** and **Marao
settings**. Regular users retain the existing direct cache-refresh hold and do
not receive administrator editing or settings controls. Short taps still
navigate normally.

**Show cache reset button** and **Show editor button** independently control the
main-page shortcuts; omitted flags mean enabled. Hiding either shortcut leaves
navbar maintenance available while routes exist. If navigation is empty and both
shortcuts are hidden, administrators retain HA's native header/edit controls.
There is no hidden hold target or dependency on the former internal editor URL.

## Native card forms, YAML and saving

Visual fields and HA's YAML editor edit the complete card configuration. Names
are local display overrides and do not rename HA entities. Supported options,
unknown fields, native layout/visibility, actions, explicit empty lists and
structured command data survive ordinary form changes. HA's own Save/Cancel
workflow applies; there is no second Marao dashboard draft or generator save.

Use a card's Advanced options for its additional settings. Entity Groups retain
explicit ordered members and per-member configuration. Areas provide metadata;
new area members do not refill saved groups automatically. Scene collections keep
their order and local names/icons. Media cards retain remote/volume targets and
ordered app sources. Previews and configuration controls do not send commands to
selected devices.

Native built-in cards use their own visual/YAML editors directly. Install any
additional custom resources through Home Assistant before adding their cards;
Marao does not install or replace those resources. Their appearance and behavior
belong to their respective cards.

Home Assistant manages native card duplication, moving, sections, sizing and
conditional visibility. Duplicated Marao cards have independent automatic detail
sheets. Explicit external popup references retain their configured targets.
Native page paths and explicit navbar links are maintained through HA and shared
Marao settings; the former builder's automatic page-reference repair is retired.

## Energy display and contributors

Energy cards retain period, display unit/precision and cost choices. For example:

```yaml
type: custom:marao-energy-card
entity_id: sensor.example_energy
variables:
  period: day
  display_unit: kWh
  display_precision: 2
  sub_entities:
    - entity_id: sensor.kitchen_energy
      name: Kitchen
      cost_entity: sensor.kitchen_cost
    - entity_id: sensor.heating_energy
      name: Heating
```

Choose a display unit compatible with the source's actual unit. **Auto** removes
only the selected override; precision `0` means zero decimal places. Summary and
detail share the choices. See [unit choices and history behavior](../usage/cards/index.md#energy-reading-format).

In **Energy breakdown** (**Distribuição de energia**), existing contributors
start collapsed with their name and sensor ID. Tap a heading to edit the sensor,
name and optional cost sensor inline. Rows expand independently; a new row opens
immediately. Move/delete controls remain in each header, and expansion follows a
row when reordered. Reopening the card dialog resets existing contributors to
collapsed. Expansion is presentation state and is never saved.

A dedicated cost sensor takes precedence. Otherwise Marao estimates cost using
HA's applicable Energy price per kWh. Set `calculate_cost: true` to show that
estimate, and use `cost_per_kwh` under `variables` for an explicit price override
in HA's currency when needed. Current prices applied to earlier periods remain
estimates. Missing price data leaves energy usable and identifies unavailable
cost. Choose non-overlapping contributors for meaningful comparisons.

Energy details retain day/month navigation and period totals in HA's timezone.
Missing history stays missing rather than becoming zero. Graph cards retain
ordered power-device configuration. Graph-enabled cards expose a separate
**History** control that preserves the card's ordinary action and sends no entity
command. See [Inspect history](../usage/cards/md_graph_card.md#inspect-history).

## Floor plans and media

[Floor Plan](../usage/cards/md_floor_plan_card.md) retains image upload/replacement,
visual light-button placement and illuminated strip paths. Placement tools stay
beside the image preview. Select a light marker to open its entity/name/icon
settings; numeric coordinates remain in YAML. Images are stored in HA when
uploaded, independently of applying the arrangement to the card draft.

Use the floor-plan card's full-page option in a native **Panel** view for a
viewport-filling plan with navbar clearance. HA Panel views contain one content
card. Native Sections sizing remains available for smaller embedded plans.

[Media](../usage/cards/md_media_card.md) offers Popup by default or **On dashboard**.
Inline mode includes Now playing and the existing playback/Apple TV controls.
Choose an appropriate native card width without changing other cards' layouts.

## Access controls and card compatibility

Choose **Access** for locks, gates, doors or service-based access controls.
**Access behavior** selects Automatic, Popup, Slide to open, Close or lock, or
Security hold. Existing classifications and supported bindings retain their
meaning. Opening/unlocking uses the strict slide; security holds retain the
1.2-second safeguard. The separate Alarm card retains its full alarm controls.
For example, a native Access card uses `type: custom:marao-access-card` with
`variables: {access_mode: slide}`.

Named native card types use `custom:marao-*`; the existing generic
`custom:marao-card` and supported `md_*` template identities remain compatible.
Hidden access aliases retain rendering compatibility without duplicate picker
entries. Historical `hc_*` source aliases belong to the supported conversion
path. Existing low-level runtime cards remain supported for deliberate raw use.

The native `marao.version` settings version is separate from package releases and
historical source/envelope/compiler versions. Ordinary HA configuration is the
active source after conversion. Original source, comments and unmapped data
remain in the conversion's documented provenance/recovery records; they do not
regenerate over subsequent native edits. Native configuration is readable under
HA's authenticated source boundary, even if a dashboard is hidden/admin-only.
Review private content before importing it.
