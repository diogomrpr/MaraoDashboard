# Marao Dashboard

Marao Dashboard is a complete Home Assistant dashboard system. It includes a
visual builder, responsive custom cards, a coordinated light and dark theme,
and camera event support for Frigate and UniFi Protect.

## What it includes

- A visual builder that creates a storage-mode dashboard from Home Assistant
  areas and entities.
- Overview and room views generated with the modern Sections layout.
- Five first-party elements: `marao-dashboard-builder`, `marao-header-card`,
  `marao-room-card`, `marao-entity-card`, and `marao-camera-card`.
- A light and dark theme registered by the integration.
- Live camera feeds with recent Frigate or UniFi Protect events in a popover.
- No edits to `configuration.yaml` and no bundled third-party card libraries.

## Install with HACS

1. In HACS, open **Custom repositories**.
2. Add `https://github.com/diogomrpr/MaraoDashboard` as an **Integration**.
3. Download Marao Dashboard and restart Home Assistant.
4. Go to **Settings → Devices & services → Add integration** and select
   **Marao Dashboard**.
5. Refresh the browser so Home Assistant loads the cards and theme.

## Build a dashboard

Add a Manual card to any temporary or existing dashboard:

```yaml
type: custom:marao-dashboard-builder
```

Choose the areas to include, enter a title and URL path, then review and create
the dashboard. The builder requires a Home Assistant administrator account. It
only writes after **Create dashboard** is selected, and it requires an explicit
confirmation before replacing an existing dashboard.

## Use the cards directly

Every card can also be added by hand. For example:

```yaml
type: custom:marao-entity-card
entity: light.living_room
```

```yaml
type: custom:marao-camera-card
entity: camera.front_door
```

The camera card normally detects Frigate or UniFi Protect automatically. See
the [camera guide](docs/cameras.md) for provider overrides.

## Documentation

- [Installation](docs/installation.md)
- [Dashboard builder](docs/builder.md)
- [Custom cards](docs/cards.md)
- [Theme](docs/theme.md)
- [Frigate and UniFi Protect cameras](docs/cameras.md)
- [Development](docs/development.md)

## License

Marao Dashboard is distributed under the repository's MIT license.

Inspired by [HaCasa](https://github.com/damianeickhoff/HaCasa).
