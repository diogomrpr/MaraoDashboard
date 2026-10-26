---
title: Configuration
layout: page
parent: Installation
nav_order: 1.3
---

# Configure Marao Dashboard

## Create a native dashboard

On stable HA **2026.10.0 or newer**, install the [HACS Dashboard package](downloads.md)
and refresh HA. In **Settings → Dashboards**, create an editable dashboard with
your chosen address, title, icon and sidebar/admin settings. Select Marao's
strategy through HA's dashboard configuration editor, or paste this starter into
HA's native raw configuration editor:

```yaml
strategy:
  type: custom:marao-dashboard
```

Open the generated Marao editor view to configure pages. Discovery creates a
starter only when source is absent. Later registry changes never refill saved
pages or explicit empty selections. Existing installations instead import the
**complete converter output** following the [migration guide](native-migration.md).
Do not substitute a starter for an existing source.

The internal Marao editor shares this dashboard's root and has a noncolliding
path. Administrators edit; regular users can read native dashboard source but
cannot save it. Hiding the editor is not a privacy boundary.

## Visual and JSON editing

The existing Visual builder and stock Monaco JSON editor share a complete draft.
JSON prepares during idle time or when opened; failed loading offers Retry while
retaining the draft. Visual/JSON switches, validation and preview do not save.
Unknown/raw fields, explicit emptiness, names and saved order remain intact.

Use **Save & Generate** for one explicit native HA save, **Discard** to return to
the saved source, and **Open dashboard** to view the result. Invalid source and
reported save errors retain the draft. An already changed native baseline blocks
saving and lets you export the draft; simultaneous cross-device saves retain
HA's own last-writer limit. Export before replacing or importing source.

The JSON tab uses Microsoft's standard Monaco typography, sizing, light/dark
themes and native widgets. Ctrl+F, Ctrl+H, Ctrl+Space and F1 provide its normal
search, replace, suggestions and command palette. Marao does not restyle Monaco.

**General → Show cache reset button** controls the optional main-page refresh
shortcut (`show_cache_reset: false` hides it). Automatic package checks and the
three-second navbar hold remain available. See [updating](update.md).

Marao applies its own scoped light/dark styling and bundled Montserrat font.
No global HA theme installation or theme selection is needed. Normal HA styling
returns when you leave Marao.

## Source, custom content and migration

The native document wraps complete editable source as `strategy.source_json`.
The source format remains **2**, native envelope **1** and compiler contract **1**;
these are independent of package v0.22.0. Supported historical JSON is translated
by the offline converter's incremental chain. Missing information is requested
through simple questions; malformed/unsupported newer input is refused.

Custom/native cards can live in the source. Existing protected generated YAML
must be supplied to the converter before removal; unknown files and server-only
includes/secrets cannot be recovered or evaluated by a browser. Keep private
values out of native source, which authenticated users can read. Configuration
History/Restore is removed; sensor/recorder charts still work.

In JSON, place the caret on or inside a list/object, then use **Collapse region**
or **Expand region** beside Format JSON. These controls restore editor focus and
use its normal keyboard commands. A collapsed indicator marks hidden content;
folding changes only the view. Save & Generate still validates and saves the full
document, including hidden fields. Unchanged Visual/JSON switches retain folds.

### Energy display choices

A guided Energy slot can retain its entity options while selecting a display unit
and precision. Summary and sheet share the selection:

```json
{"today_energy": {"entity_id": "sensor.example_energy", "variables": {"display_unit": "kWh", "display_precision": 2}}}
```

Direct Lovelace period cards use card-level settings:

```yaml
type: custom:marao-energy-period-card
entity: sensor.example_energy
period: day
popup: true
display_unit: kWh
display_precision: 2
```

The source must expose a compatible actual unit. Auto removes only the selected
override; `0` means zero decimals. Load, room and custom cards use the same
`variables` keys. See [unit choices and history behavior](../usage/cards/index.md#energy-reading-format).
This additive feature does not bump the configuration format or reinterpret old
`power_unit` labels.

Energy detail sheets keep day/month navigation and show consumption as vertical
bars: one per hour for a day, or one per day for a month. The selected period
follows Home Assistant's time zone, including daylight-saving changes. Missing
history stays missing rather than becoming zero; limited coverage is identified.

Use **Energy breakdown** in the visual or native editor to add energy sensors for
appliances or rooms, with optional names and separate cost sensors. Their totals
use the selected period and appear below the bars with a circular comparison.
Choose non-overlapping sensors if you want a meaningful comparison with the house
total. Direct period cards use these card-level options; generated descriptors
put the same options under `variables`:

```yaml
sub_entities:
  - entity_id: sensor.kitchen_energy
    name: Kitchen
    cost_entity: sensor.kitchen_cost
  - entity_id: sensor.heating_energy
    name: Heating
```

A dedicated cost sensor takes precedence. Otherwise Marao estimates cost using
the applicable Home Assistant Energy price per kWh. To override that price, set
`cost_per_kwh: 0.25` in Home Assistant's currency. Multiple unmatched tariffs need
an explicit override. Set `calculate_cost: true` on an energy period card to show
estimated cost from its energy sensor. Current tariffs applied to earlier days
or months are labeled estimates; they do not reconstruct past price changes.
Missing price data leaves energy usable and shows that cost is unavailable.

Graph-enabled cards expose a separate **History** (**Histórico**) control;
opening it preserves the card's existing action and does not send an entity
command. See [Inspect history](../usage/cards/md_graph_card.md#inspect-history).

Light, fan, cover and access controls use compact content-driven sizing, with
titles and useful readings beside the icon and any slider directly below.
In narrow embedded cards or with enlarged text, the header can wrap the icon below its text
to preserve readable labels and full-size controls. Marao sections reflow to fewer
columns when space is limited. A selected two-column section fits ordinary
320px, 360px and 384px phone layouts at normal or bold text size, including page
margins. Enlarged text or narrower space can use one column, and the selected
count returns when space permits. An explicit one-column choice stays one column.
Hidden fields reserve no empty region. Essential text, errors and the unchanged
strict access geometry can increase height; no fixed height clips content.

Use **Edit layout → fixed columns** for one continuous mixed section in saved
order. All Marao content families share equal heights across every row within
that section, with an 8px gap and responsive columns up to the saved maximum.
Separate sections size independently. Automatic mode retains domain order and
widths while sharing the section's height boundary. Raw cards retain their
configuration and internals; structural headings, popup definitions and navbar
keep their roles. Existing `custom:marao-control-grid` columns/cards inputs remain
supported. Native/manual cards use the compact renderer; put them in an explicitly
authored Marao grid when section-wide equality is wanted.

Select cards (`input_select` and `select`) use Marao's themed dropdown, shared
with the power-history period picker. All entity options remain in a scrollable
menu, with the current selection marked. The current selection follows Home
Assistant; large option lists do not expand the card. Escape or a tap outside
closes the menu.


### Access card behavior

Choose **Access** for locks, gates, doors or service-based access controls. Its
**Access behavior** setting selects **Automatic**, **Popup**, **Slide to open**,
**Close or lock**, or **Security hold**. Popup and close/lock require a lock or
cover. Slide supports locks, covers, buttons, switches and scripts; security hold
supports buttons, switches, toggle helpers and alarm entities. Automatic retains
the normal lock/cover popup (or inline opening for open-only doors), uses a slide
for scripts and a security hold for other service controls.

In JSON, use `"template": "md_access_card"` and, for example,
`"variables": {"access_mode": "slide"}`. Existing access opener, close/lock and
security action templates remain supported with their original defaults and can
be configured through the same behavior setting. Opening and unlocking always
require the strict slide; security holds keep their 1.2-second safeguard. The
separate Alarm card retains its full alarm controls.


### Card identifiers

New Marao card templates and owned options use `md_`, for example
`md_light_card` and `md_show_background_art`. Released `hc_` identifiers remain
supported as input aliases. The shared converter recognizes saved Marao-owned names and options, including
group members and Marao cards inside standard card containers. Keep an exact
private source/package backup before importing converted output.
Already-migrated configurations are not rewritten; previews remain read-only.
The dashboard document format stays at version 2.
Entity IDs, names, actions, third-party card YAML and unknown options are retained.
If both spellings of an owned option are present with different values, remove
that ambiguity before saving. Archived history and released source fixtures are
kept unchanged.
