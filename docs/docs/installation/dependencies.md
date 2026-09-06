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

`height` may be `auto` or a fixed CSS length. The sheet scrolls internally,
keeps its close button visible, opens with a bottom-up animation, and remains
above the floating navbar. On wider screens it stays centered and is bounded
to the first dashboard column instead of stretching across the page.

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
error for larger explicit lists. The runtime sizes the compact floating bar
from its route count and uses the iPhone safe-area inset for its accepted
bottom position.

## Migrating from older releases

On upgrade, Marao removes only exact legacy storage-mode resources for its old
root JavaScript files and URLs below `/hacsfiles/MaraoDashboard/vendor/`. It
also removes the exact inline `/hacsfiles/MaraoDashboard/MaraoDashboard.js`
entry from `frontend.extra_module_url` when the frontend configuration can be
edited directly. YAML-mode Lovelace resources, includes, and other complex
frontend YAML are never rewritten; Home Assistant shows a Repair with the exact
entries to remove manually.

Standalone resources belonging to other projects and Google Fonts are
preserved. Marao leaves stale copied vendor files on disk and unloaded rather
than deleting files that may have been modified. After manual removal, reload
the Marao integration or restart Home Assistant to clear the Repair; reloading
Lovelace resources alone is not sufficient.

Older generated dashboards are regenerated to use the Marao cards. Manually
written dashboards that use `custom:button-card` with Marao `hc_*` templates
must be rebuilt or updated by their owner; Marao does not claim the upstream
`button-card` element name.

## Troubleshooting

If a Marao card is missing, refresh the browser and its frontend resources
after updating the integration. Restart the disposable Home Assistant only
when integration changes cannot be loaded by a refresh or reload. Check the
browser console for the exact Marao component name; no external card resource
is required. Treat every warning or failed resource as a defect to fix at its
root rather than installing a third-party card to hide it.

To remove Marao, delete its Home Assistant config entry before removing it in
HACS, then remove its generated dashboard and theme if they are no longer
wanted. Independent HACS cards and resources are never removed by Marao.
