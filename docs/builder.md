---
title: Dashboard builder
layout: default
---

# Dashboard builder

Add the visual builder as a Manual card on a temporary or existing dashboard:

```yaml
type: custom:marao-dashboard-builder
```

Every setting is optional. You can provide initial values when you add the
card:

```yaml
type: custom:marao-dashboard-builder
title: My home
url_path: my-home
areas:
  - living_room
  - kitchen
```

| Option | Default | Purpose |
| --- | --- | --- |
| `title` | `Marao Home` | Initial dashboard title. |
| `url_path` | `marao-dashboard` | Initial dashboard URL path. |
| `areas` | All areas | Area IDs initially selected in the builder. |

## Registry preview

The builder reads Home Assistant's area, device, entity, and dashboard
registries. It includes entities assigned directly to a selected area or to a
device in that area. Disabled, hidden, and unassigned entities are skipped.

All areas are selected initially unless `areas` is configured. The preview
shows the selected area, entity, and camera counts before anything is written.
You can change the title, URL path, and area selection in the card.

URL paths are converted to lowercase hyphenated paths. An empty path becomes
`marao-dashboard`; a single word such as `home` becomes `home-dashboard`.

## Generated dashboard

Selecting **Create dashboard** saves a storage-mode Lovelace dashboard with the
chosen title and the **Marao Dashboard** theme. Its views use Home Assistant's
Sections layout:

- `home` is an overview with a Marao header and one room card per selected
  area;
- each selected area gets its own Sections view with a header, room summary,
  and domain grids;
- camera entities use `custom:marao-camera-card`;
- all other assigned entities use `custom:marao-entity-card`.

The room cards contain entity and camera counts captured when the dashboard is
built. Rebuild the dashboard to refresh those counts or its registry-derived
cards.

## Permissions and replacement

Dashboard creation requires a Home Assistant administrator account. If the URL
path already belongs to a storage-mode dashboard, the builder shows a separate
replacement checkbox and keeps the action disabled until it is selected. The
replacement writes the complete configuration for that dashboard.

YAML-mode dashboards cannot be replaced. The builder never changes another URL
path and never edits `configuration.yaml`.
