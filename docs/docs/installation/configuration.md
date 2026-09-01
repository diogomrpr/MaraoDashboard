---
title: Configuration
layout: page
parent: Installation
nav_order: 1.3
---

# Configure Marao Dashboard

After installing Marao Dashboard with HACS, add the **Marao Dashboard**
integration from Home Assistant's integrations page. On first setup, the
integration creates a base dashboard JSON from your current area-assigned
entities, generates YAML from it, and patches `configuration.yaml`.

The integration then:

- Serves Marao's dashboard runtime, editor, and camera-events card directly
  from `/marao_dashboard_static` through Home Assistant's frontend and static
  APIs.
- Copies the dashboard YAML template library under
  `www/community/MaraoDashboard/dashboard`.
- Copies the theme YAML under `themes/MaraoDashboard` and ensures the standard
  `frontend.themes` include is present.
- Adds a `marao-dashboard` YAML dashboard entry.

No manual Marao Lovelace resource is required.

Marao does not register or copy third-party cards. Install the
[required dashboard dependencies]({{ '/docs/installation/dependencies.html' | relative_url }})
before generating the dashboard.

The generated dashboard is written to:

```text
dashboard/MaraoDashboard/dashboard/dashboard.yaml
```

The editable source of truth is:

```text
dashboard/MaraoDashboard/dashboard.json
```

The integration adds an admin-only **Marao Dashboard Editor** page to the Home
Assistant sidebar at `/marao-dashboard-editor`. Its **Visual** tab guides you
through general settings, overview entities, rooms, cards, and optional pages
using Home Assistant entity, area, theme, and icon selectors. **Add card** first
shows the supported Marao card types, then filters the entity selector and
offers common and advanced options for that card.

Use **Add room** to start an empty room or import a snapshot of a Home Assistant
area. A snapshot copies the area's current entities into the JSON and remains
fully editable; later area changes are not synchronized. Older area-linked
rooms keep their existing behavior until their first card edit, when the editor
explains and performs the conversion to a snapshot.

The **JSON** tab edits the same document in the built-in code editor,
with validation, formatting, schema help, and entity-ID suggestions. Unknown
fields and raw Lovelace cards are preserved when switching views. Invalid JSON
must be corrected before returning to **Visual**.

Changes remain local to the editor until you select **Save & Generate**. Use
**Discard changes** to reload the saved source or **Open dashboard** to inspect
the last generated result.

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

## Minimal JSON

```json
{
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
      "icon": "mdi:sofa-outline"
    }
  ]
}
```

## Room overrides

Use `entities` or `include` to add entities, `exclude` to remove entities, and
`overrides` to customize card labels, icons, templates, or variables. Use
`cards` only for raw Lovelace cards that should be appended to that room view.

```json
{
  "name": "Marao Dashboard",
  "rooms": [
    {
      "name": "Office",
      "area": "office",
      "entities": ["light.office_desk"],
      "exclude": ["sensor.office_unused"],
      "overrides": {
        "light.office_desk": {
          "name": "Desk",
          "icon": "mdi:desk-lamp",
          "template": "hc_light_card",
          "variables": {
            "show_slider": true
          }
        }
      },
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

## Julian-style pages

Rooms are the canonical list of normal entities. The overview popups and the
Security and Media pages reuse those entities automatically, so IDs do not need
to be duplicated. Add a `pages` section only for the optional Julian main pages
and their page-specific roles.

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
Overview tiles open generated Bubble Card popups: Lights includes only `on`
lights, while Covers includes every room cover.

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

## Frontend dependencies

The seven third-party cards are independent HACS Dashboard downloads. In
storage resource mode, HACS normally registers them. In YAML resource mode,
copy the resource list from the
[dependency guide]({{ '/docs/installation/dependencies.html' | relative_url }}).
Keep only one resource URL for each custom card; duplicate resources can load
different versions of the same custom element.

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
