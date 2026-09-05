---
title: Marao Dashboard runtime
layout: page
parent: Installation
nav_order: 1.1
---

# Marao Dashboard runtime

Marao Dashboard no longer requires third-party Lovelace cards. The generated
dashboard uses three namespaced Marao cards and Home Assistant's native cards:

- `custom:marao-card` — generated `hc_*` card variants and controls.
- `custom:marao-navbar-card` — the floating five-entry navigation bar.
- `custom:marao-popup-card` — bottom-sheet popovers with scrolling content.
- Native Sensor and History Graph cards — metric and history graphs.

The integration registers its JavaScript through Home Assistant's frontend API.
Do not add a Marao resource manually. The theme supplies supported color and
typography variables; fullscreen header behavior is provided by Marao's own
route-scoped runtime.

Existing Button Card, Bubble Card, Card Mod, Kiosk Mode, My Cards, Mini Graph
Card, or Navbar Card installations are left alone. They may continue to serve
other dashboards, but Marao does not load, update, duplicate, or uninstall
them.

## Popup configuration

Generated popovers use this shape:

```yaml
type: custom:marao-popup-card
hash: "#room-lights"
title: Lights
height: auto
max_height: 80dvh
cards:
  - type: custom:marao-card
    template: hc_light_card
    entity: light.living_room
```

`height` may be `auto` or a fixed CSS length. The sheet always scrolls its
content, keeps a close button visible, and remains below the floating navbar.

## Navigation configuration

The navbar accepts at most five routes:

```yaml
type: custom:marao-navbar-card
routes:
  - label: Home
    icon: mdi:home-outline
    icon_selected: mdi:home
    url: /marao-dashboard/overview
```

The Marao builder enforces this limit and reports an actionable validation
error for larger explicit lists.

## Migrating from older releases

On upgrade, storage-mode resources below
`/hacsfiles/MaraoDashboard/vendor/` are removed only when they are exact Marao
legacy entries. YAML-mode resources are never rewritten; Home Assistant shows a
Repair with the exact entries to remove. Standalone resources belonging to
other projects are preserved.

Older generated dashboards are regenerated to use the Marao cards. Manually
written dashboards that use `custom:button-card` with Marao `hc_*` templates
must be rebuilt or updated by their owner; Marao does not claim the upstream
`button-card` element name.

## Troubleshooting

If a Marao card is missing, restart Home Assistant after updating the
integration and refresh the browser. Check the browser console for the exact
Marao component name; no external card resource is required.

To remove Marao, uninstall the integration and remove its generated dashboard
and theme if they are no longer wanted. Independent HACS cards and resources
are never removed by Marao.
