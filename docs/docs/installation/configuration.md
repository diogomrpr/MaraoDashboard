---
title: Configuration
layout: page
parent: Installation
nav_order: 1.3
---

# Configure Marao Dashboard

## JSON editor

The **JSON** tab uses the standard Microsoft Monaco editor: monospace text,
syntax highlighting, line numbers, native folding arrows, minimap, search/replace,
suggestions and diagnostic widgets. It uses Monaco's default light/dark themes
and control sizes, without a Marao editor skin or a separate editing toolbar.

Use Ctrl+F to search, Ctrl+H to replace, Ctrl+Space for suggestions, F8 to navigate
issues, Shift+Alt+F to format, and Ctrl+Z / Ctrl+Shift+Z to undo/redo. On macOS use
Command+F, Command+Option+F and Command+Z / Command+Shift+Z. F1 opens Monaco's
command palette. Native context menus and gutter arrows expose its normal tools.

Suggestions use Marao's catalog, compatible entities and current page paths.
Unknown/raw options, empty lists and native command data remain editable.
Returning through Visual without edits retains text, undo history and position.
Only **Save & Generate** changes the saved dashboard; invalid JSON still blocks
Visual and Save. Editor assets and workers load locally on first use.

After installing Marao Dashboard with HACS, add the **Marao Dashboard**
integration from Home Assistant's integrations page. On first setup, the
integration creates a base dashboard JSON from your current area-assigned
entities, generates YAML from it, and patches `configuration.yaml`.

The integration then:

- Serves Marao's dashboard runtime, editor, and camera-events card directly
  from `/marao_dashboard_static` through Home Assistant's frontend and static
  APIs.
- Generates dashboard YAML under `dashboard/MaraoDashboard`.
- Copies the theme YAML under `themes/MaraoDashboard` and ensures the standard
  `frontend.themes` include is present.
- Adds a `marao-dashboard` YAML dashboard entry.

No manual Marao Lovelace resource or third-party card is required.

The generated dashboard is written to:

```text
dashboard/MaraoDashboard/dashboard/dashboard.yaml
```

The editable source of truth is:

```text
dashboard/MaraoDashboard/dashboard.json
```

## Moving cards in Visual

Drag a card's dotted handle to a position before, between or after other cards.
Keep the pointer near the screen edge to scroll. You can move cards into another
section of the same expanded page, including an empty section. Release to place
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

Dashboard format **2**, being prepared for the next release, stores every page in
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
            {"id": "heading", "template": "hc_title_card", "name": "Living room"}
          ]
        },
        {
          "columns": 2,
          "entities": [
            {"id": "lamp", "entity_id": "light.living_room", "template": "hc_light_card"},
            {"id": "office-link", "template": "hc_navigation_card", "name": "Office", "page": "office"}
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
as non-operative data. Migrated `output_path` metadata retains existing owned
view filenames and their protected YAML regions; new pages use stable files
under `views/pages/`. Backups and read-only preview rules still apply.

Generated popup identities use the page path, local card ID and popup role.
Compatible explicit hashes are retained and checked for collisions, including
nested group popups. Migration retains historical owned filenames where
possible. Custom external URLs remain opaque; unresolved known page references
must be retargeted or removed explicitly before saving.

The integration adds an admin-only **Marao Dashboard Editor** at
`/marao-dashboard-editor`. Its **Visual** tab starts with the page manager. Every
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
Supported older JSON uses the backend's read-only migration preview when switching
to Visual. Invalid or newer JSON remains untouched for correction. Card identities
are retained when content is edited or reordered, so existing popup links keep
pointing to the same card; an unchanged round trip retains the original shorthand.

A fresh Visual session opens only the landing page. Each page can be expanded independently; closing it releases its controls without changing the draft. New and duplicated pages open for editing. Expansion is a session preference and is never saved. Local card edits refresh their section while unrelated page controls and General inputs stay in place.

Changes remain local until **Save & Generate**. The title, save action and tabs
stay visible while scrolling. **More actions** contains History, Discard changes
and Open dashboard; the latter opens the saved dashboard in another tab.
Individual-card deletion is immediate and local, without confirmation. Whole-page
deletion requires confirmation naming that page. The final page cannot be deleted;
landing/menu/shortcut references need an explicit replacement or removal first.
Unresolved popup links must be repaired before deleting their owning page.

The development candidate uses dashboard format **2**. Format 0 imports legacy
room membership first; format 1 then becomes the ordered page model. Dashboard
format, package version and Home Assistant config-entry version are separate.
Only a successful writable generation persists conversion. The update guide
explains exact backups, compatible history restoration and complete rollback.

Each successful generation is saved under
`dashboard/MaraoDashboard/.history`. Select **History** to access the latest 20 versions,
including the JSON and the exact dashboard directory with preserved custom
cards. Select **Restore** beside a version to restore both. The current version
is saved before a restore, so you can also undo a restoration.

You can alternatively edit `dashboard.json` with a file editor, then call the
Home Assistant service `marao_dashboard.generate_dashboard` to regenerate the
YAML. Generated YAML may be overwritten; customize the JSON instead.

```yaml
service: marao_dashboard.generate_dashboard
data:
  config_path: dashboard/MaraoDashboard/dashboard.json
```

Use `dry_run: true` to validate the JSON and see the planned dashboard key/files
without writing generated YAML or patching `configuration.yaml`.

## Legacy format 0/1 input examples

```json
{
  "config_version": 1,
  "name": "Marao Dashboard",
  "slug": "dashboard",
  "theme": "Marao Dashboard",
  "icon": "mdi:home",
  "overview": {
    "weather_entity": "weather.home"
  },
  "rooms": [
    {
      "name": "Living Room",
      "area": "living_room",
      "entities": ["light.living_room"],
      "icon": "mdi:sofa-outline"
    }
  ]
}
```

## Legacy room overrides

Edit `entities` to add or remove cards. Entity objects customize labels, icons,
templates and variables. `area` never adds entities during generation. Use
`cards` only for raw Lovelace cards that should be appended to that room view.

```json
{
  "config_version": 1,
  "name": "Marao Dashboard",
  "rooms": [
    {
      "name": "Office",
      "area": "office",
      "entities": [
        {
          "entity_id": "light.office_desk",
          "name": "Desk",
          "icon": "mdi:desk-lamp",
          "template": "hc_light_card",
          "variables": {
            "show_slider": true
          }
        }
      ],
      "cards": [
        {
          "type": "markdown",
          "content": "Office notes"
        }
      ]
    }
  ]
}
```

The dashboard is not regenerated automatically on every restart. After adding
entities or changing layout, update `dashboard.json` and call the service again.

## Legacy guided-page input

These objects are accepted as older input and converted once. Security and Media
receive their historical selections only when the relevant older field is absent;
explicit empty lists stay empty. Legacy Home groups become ordinary editable Home
cards. Format-2 pages use the ordered example above and never rediscover composition
from `legacy_page_options` or refill an absent card list.

```json
{
  "name": "Home",
  "overview": {
    "weather_entity": "weather.home",
    "scenes": ["input_boolean.holiday_mode"]
  },
  "rooms": [
    {
      "name": "Living room",
      "icon": "mdi:sofa-outline",
      "entities": [
        "light.living_room_main",
        "cover.living_room_blind",
        "lock.front_door",
        {
          "entity_id": "media_player.living_room_tv",
          "apple_tv": {
            "remote_entity": "remote.living_room_apple_tv",
            "apps": [{"name": "YouTube", "source": "YouTube", "icon": "mdi:youtube"}]
          }
        }
      ]
    }
  ],
  "pages": {
    "security": {
      "alarm_entity": "alarm_control_panel.home",
      "actions": [{"entity_id": "button.open_building_door", "name": "Open building door"}]
    },
    "energy": {
      "house_power": "sensor.house_power",
      "month_energy": "sensor.energy_month",
      "month_cost": "sensor.energy_cost_month",
      "today_energy": "sensor.energy_today",
      "today_cost": "sensor.energy_cost_today",
      "loads": [
        {
          "power_entity": "sensor.water_heater_power",
          "toggle_entity": "switch.water_heater",
          "name": "Water heater",
          "icon": "mdi:water-boiler"
        }
      ],
      "appliances": [{"entity_id": "sensor.dishwasher_state", "template": "hc_dishwasher_card"}]
    },
    "wallbox": {
      "status_entity": "sensor.wallbox_status",
      "charging_power_entity": "sensor.wallbox_power",
      "max_current_entity": "number.wallbox_max_current",
      "current_control_entity": "input_number.wallbox_current",
      "current_presets": [6, 12, 16],
      "pause_resume_entity": "switch.wallbox_pause_resume"
    },
    "media": {}
  }
}
```

`security.access_entities` and `media.players` are optional replacement lists.
When absent, Security derives locks and door/garage/gate covers from rooms, and
Media derives room media players. `media.players` supports the same entity
fields as rooms plus `remote_entity`, `volume_remote_entity`, and `apps`.

The generator always produces the Overview and Rooms views. It produces
Security, Energy, Wallbox, and Media only when that object exists in `pages`.
Overview tiles open generated Marao popups: Lights includes only `on`
lights by default; each Entity Group can instead choose All entities. Covers,
battery sensors and thermostats default to All entities. Add groups through the
same card catalog on room/custom pages; see the [Entity Group guide](../usage/cards/hc_entity_group_card.md)
for the descriptor, activity definitions, member options and popup ownership.
Energy period readings occupy full-width cards so enlarged numbers remain intact.
Saved selections, values, ordering and popup actions are preserved.

## Keep hand-written cards across regeneration

Generated views and overview/energy popups contain a protected block like this:

```yaml
cards:
  # marao:generated:start
  # generated cards
  # marao:generated:end
  # marao:custom:start
  # Add custom Lovelace cards here.
  # marao:custom:end
  # marao:generated-footer:start
  # navigation bar
  # marao:generated-footer:end
```

Put hand-written cards between `marao:custom:start` and
`marao:custom:end`, keeping their normal two-space YAML indentation. The
generator replaces only its marked regions and leaves the custom block intact;
the footer keeps the navigation bar below your cards. Do not edit or remove the
marker comments. If they are damaged, generation stops without writing files.

The first marker-aware generation adopts an existing unmarked view only when it
exactly matches the old generated output. If it differs, generation refuses to
overwrite it because it cannot safely distinguish manual cards; move manual
cards into a backup, regenerate, then paste them into the custom block.

## Navigation bar layout

Generated views include `components/navigation/navbar.yaml` as the last card.
That include owns both the bottom spacer and the floating navigation bar, so the
last dashboard card can scroll above the action bar. Do not add a separate
bottom spacer in views; keep custom room `cards` before the generated navbar.

## Frontend runtime

The integration registers its Marao card runtime through Home Assistant's
frontend API. Generated graphs use Marao's project-owned background graph, and
the floating navbar hides the top header while this dashboard is active.

## Restart and open

1. Restart Home Assistant after the integration patches `configuration.yaml`.
2. Select **Marao Dashboard** in the sidebar.
3. Select **Marao Dashboard** in your Home Assistant profile theme settings.
   Leave the theme mode on automatic/system so Home Assistant uses the light
   mode during the day/system light mode and dark mode at night/system dark mode.

If the dashboard does not appear, check that `configuration.yaml` contains:

```yaml
lovelace:
  dashboards:
    marao-dashboard:
      mode: yaml
      title: Marao Dashboard
      icon: mdi:home
      show_in_sidebar: true
      filename: dashboard/MaraoDashboard/dashboard/dashboard.yaml
```

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
