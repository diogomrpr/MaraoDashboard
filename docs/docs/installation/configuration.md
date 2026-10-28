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

Administrators can select **Edit dashboard** (**Editar painel**) at the top of
the landing page to open the Marao editor. This labelled link stays visible when
the optional cache reset button is hidden. Regular users do not see it.

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

Use the **Save & Generate** save icon for one explicit native HA save. The leftmost
**Open dashboard** left-arrow icon opens the saved result inside Home Assistant
without saving the draft. Header action icons share the filled circular design;
there is no Discard button. Import and Export JSON are icon buttons shown only in the
**JSON** tab; there is no extra-options dropdown.
A successful save returns to the dashboard; errors keep the editor open. Invalid source and
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

## Home Assistant cards

Choose **Add card → Home Assistant** to search Home Assistant's native picker,
including custom cards that register themselves with it. Use **Manual YAML** for
an installed card that is absent from the picker. Marao loads existing resources;
install and configure any custom card in Home Assistant first.

The card dialog uses Home Assistant's visual and YAML editors with a non-interactive
preview. Cards without a visual editor open in YAML mode. If HA's editor cannot
load, use the basic YAML text editor or Retry. Add/Update changes your local draft;
Cancel discards dialog edits. Only **Save & Generate** persists the dashboard.

Cards can be edited, moved, reordered, deleted and duplicated with other cards.
Automatic sections give them full width; fixed-column sections preserve mixed
order. Their appearance, actions, visibility and errors belong to Home Assistant.

Format-2 JSON stores the entire configuration as a string:

```json
{
  "id": "welcome",
  "template": "ha_card",
  "yaml": "type: markdown\ntitle: Welcome\ncontent: Hello from Home Assistant\n"
}
```

Place this descriptor in a page or section's `entities` list. Unchanged YAML,
including comments, survives unchanged saves. Making a visual
configuration change can reformat YAML and remove comments. Native settings and
unknown descriptor fields are retained; entity IDs and navigation paths inside
YAML are user-managed. Existing raw `cards` objects keep their current behavior.

YAML must contain one mapping with a nonempty `type`. Quote state strings such as
`"on"` and `"off"`; ordinary anchors and merges work. Duplicate keys, recursive
aliases and non-JSON values are rejected before writes. Inline configuration
instead of using `!include`, `!secret` or other file directives. A missing custom
resource remains a visible Home Assistant card error without deleting its source.
If a configured dashboard module fails to load, Marao identifies the failed
resource beside the card picker and editor while keeping available cards usable.
Failures in Home Assistant's required editor components still offer Retry and
manual YAML editing.

Use the filled circular **+** button to add a card to a page or section.
Each editor section has a rounded boundary and a header with its number in a
badge, with a columns icon and its count beside it, or an automatic-layout icon. This
layout indication stays visible when the section is collapsed. Tap the header or use its native keyboard disclosure to collapse or expand
the section independently; its tools remain available while collapsed. Sections
start expanded and retain their choice while the same draft is kept in the editor.
Fresh panels and accepted document replacements can start expanded again. Cards and their **+** button stay inside that boundary; **Add section** sits
outside the section containers and adds another section to the page.

## Duplicating cards in Visual

Use the **Duplicate card** copy icon on a card row to insert an independent copy
immediately after it in the same section or flat page. The copy keeps its name,
settings and exact embedded YAML; its generated popups have independent targets.
Editing or deleting one copy leaves the other unchanged. Duplication changes only
the draft: **Save & Generate** persists it. Fixed-column sections retain this exact order; automatic
layouts keep their existing grouping by card type.

## Moving cards in Visual

Drag a card's dotted handle to a position before, between or after other cards.
Pickup and holding still keep the page steady, including near the sticky header
or bottom edge. After pickup, move deliberately toward an edge to start scrolling;
hold there to continue. Moving away stops scrolling, and a fresh approach starts
it again. You can move cards into another section of the same expanded page,
including an empty section. Release to place
it; Escape or a cancelled gesture leaves the draft unchanged. Scrolling elsewhere
on the row works normally.

The arrows move one position at a time. **Move to section** offers a destination
section and a position before a named card or at the end, using ordinary controls.
Cards with the same entity remain separate occurrences with their own settings.
Raw Lovelace `cards` stay in their authored section and are edited in JSON.

Automatic layout still groups by type. Choose fixed columns in **Edit layout**
when you want an exact mixed order. Moving does not change section widths or
save anything until **Save & Generate**. **Discard changes** restores the saved
source. The disposable Studio example includes mixed widths, duplicate lighting
cards, independent detail sheets and an empty section for trying these moves.

## Ordered page format

Dashboard source format **2** stores every page in
one ordered `pages` array. `landing_page` names an existing page path. The
landing view is generated first; the remaining views retain their saved order.
Navbar entries are a separate ordered list of page references or labeled URLs,
without a count limit. An empty navbar list stays empty.

```json
{
  "config_version": 2,
  "name": "My home",
  "landing_page": "home",
  "navigation": ["home"],
  "pages": [
    {
      "id": "home",
      "name": "Home",
      "path": "home",
      "icon": "mdi:home",
      "sections": [
        {
          "columns": 1,
          "entities": [
            {"id": "heading", "template": "md_title_card", "name": "Living room"}
          ]
        },
        {
          "columns": 2,
          "entities": [
            {"id": "lamp", "entity_id": "light.living_room", "template": "md_light_card"},
            {"id": "office-link", "template": "md_navigation_card", "name": "Office", "page": "office"}
          ],
          "cards": [{"type": "markdown", "content": "A saved note"}]
        }
      ]
    },
    {"id": "office", "name": "Office", "path": "office", "area": "office", "entities": []}
  ]
}
```

A page uses either flat `entities`/`cards`/`columns` or ordered `sections`, never
both. Each section uses the same container fields. Fixed grids accept one to
six columns and retain mixed card order; omitting columns uses the existing
automatic domain layout. Empty and absent selections remain empty or absent.
Titles, shortcuts, room shortcuts, Entity Groups and scene collections may be
entity-free. Other descriptors require a compatible entity before generation;
unfinished template cards must be bound or removed.

Page paths are unique lowercase letters, numbers, underscores or hyphens.
Optional page and local card IDs start with a letter and use the same characters;
card IDs are unique within a page. Names and icons belong to that occurrence,
so editing a title does not rename a Home Assistant entity. Unknown fields,
raw cards, ordering and explicit options remain in the saved document. An
optional `area` only supplies suggestions; it does not synchronize membership.

The ordered upgrade first imports legacy room membership from format 0 to 1,
then converts format 1 to 2. Existing Home, Rooms, room, custom and optional
guided pages become ordinary descriptors. Only absent legacy selections receive
their historical defaults; explicit empty access, player and group lists win.
Old options without a current composition role remain in `legacy_page_options`
as non-operative data. Legacy `output_path` metadata stays as retained source data. Native saves do
not write generated YAML files. Supply protected YAML fragments to the offline
converter before migration; backups and read-only preview rules still apply.

Generated popup identities use the page path, local card ID and popup role.
Compatible explicit hashes are retained and checked for collisions, including
nested group popups. Migration retains historical owned filenames where
possible. Custom external URLs remain opaque; unresolved known page references
must be retargeted or removed explicitly before saving.

The admin-only **Marao Dashboard Editor** is an internal view under the same
dashboard root. Its **Visual** tab starts with the page manager. Every
page uses the same card and section controls, including Home, Rooms, Security,
Energy, Wallbox and Media. Expand a page to add, edit, remove or reorder its cards,
change section columns, and move or remove sections. Empty pages stay empty.

**Add page** offers Empty, Home, Rooms, Room, Security, Energy, Wallbox and Media.
Templates populate the new local draft once, using real available entities and
saved media preferences. Optional roles without a binding are omitted. Bind or
remove an unbound required Alarm, House Power, Charging Current or Media card
before saving. Later registry changes or repeated generation never refill a saved
page. Choose Room with a suggestion area to import its current selection once;
choosing Rooms creates independent shortcuts to the current room-page drafts.

Page order, **Landing page** and navbar order are independent. **Pin to navbar**
and **Unpin** change only the menu; unpinning retains the page and all its cards.
The navbar stays in one row. When selected routes exceed the safe screen width,
the rightmost **More destinations** button opens a matching vertical icon menu.
The menu scrolls internally for longer lists and closes on selection, a second
toggle, an outside tap or Escape. Its selected destination stays in configured
order; More indicates when the current page belongs to overflow. New pages are
pinned normally, while existing unpinned pages stay unpinned.
Renaming a path updates owned page and popup links. Duplicating regenerates local
card/popup identities and creates an unpinned copy with independent options.

**Add card** offers **By card type** and **By entity**. Search by name or entity ID
across all areas. Associated pages offer suggestions from their optional area;
changing that area leaves saved cards untouched. Opening Add refreshes metadata
once without replacing the local draft. Card options include names/icons,
entities, selected Room lights, explicit native scenes, energy periods/history,
charging presets, media apps and secondary remote bindings. Confirming an edit
changes the draft; it does not save or actuate an entity.

The **JSON** tab edits the same document, with folding, formatting, validation,
schema help and entity suggestions. Switching tabs preserves unknown fields,
raw Lovelace cards, selections, order and explicit empty or absent content.
Supported older JSON uses the shared read-only migration preview when switching
to Visual. Invalid or newer JSON remains untouched for correction. Card identities
are retained when content is edited or reordered, so existing popup links keep
pointing to the same card; an unchanged round trip retains the original shorthand.

A fresh Visual session opens only the landing page. Each page can be expanded independently; closing it releases its controls without changing the draft. New and duplicated pages open for editing. Expansion is a session preference and is never saved. Local card edits refresh their section while unrelated page controls and General inputs stay in place.

Changes remain local until **Save & Generate**. The title, save action and tabs
stay visible while scrolling. **More actions** contains Discard changes
and Open dashboard; the latter opens the saved dashboard within the app, retaining
the unsaved draft for when you return to the editor.
Individual-card deletion is immediate and local, without confirmation. Whole-page
deletion requires confirmation naming that page. The final page cannot be deleted;
landing/menu/shortcut references need an explicit replacement or removal first.
Unresolved popup links must be repaired before deleting their owning page.

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
