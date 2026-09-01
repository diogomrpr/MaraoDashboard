---
title: Dashboard dependencies
layout: page
parent: Installation
nav_order: 1.1
---

# Dashboard Dependencies

Marao Dashboard uses seven third-party dashboard projects. They are not bundled
with Marao and are not installed transitively by HACS. Install each one as its
own HACS **Dashboard** repository before generating or opening a Marao
dashboard.

## Dependency catalog

The version column is the baseline used for Marao compatibility testing. It is
not a version pin: use the current HACS release unless its upstream project
documents a Home Assistant compatibility restriction.

| Dependency | Marao feature | Tested baseline | HACS |
|:-----------|:--------------|:----------------|:-----|
| [Button Card](https://github.com/custom-cards/button-card) | Base for Marao's entity and navigation templates | 7.0.1 | [Open in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=custom-cards&repository=button-card&category=plugin) |
| [My Cards](https://github.com/AnthonMS/my-cards) | `custom:my-slider-v2` controls for lights, fans, and covers | 1.0.6 | [Open in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=AnthonMS&repository=my-cards&category=plugin) |
| [Kiosk Mode](https://github.com/NemesisRE/kiosk-mode) | Dashboard chrome settings used by Marao's main view | 14.0.1 | [Open in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=NemesisRE&repository=kiosk-mode&category=plugin) |
| [Card Mod](https://github.com/thomasloven/lovelace-card-mod) | Styling for nested graph and navigation cards | 4.2.1 | [Open in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=thomasloven&repository=lovelace-card-mod&category=plugin) |
| [Mini Graph Card](https://github.com/kalkih/mini-graph-card) | History graphs in sensor, climate, and toggle cards | 0.13.0 | [Open in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=kalkih&repository=mini-graph-card&category=plugin) |
| [Bubble Card](https://github.com/Clooos/Bubble-Card) | Room, control, media, and camera-event pop-ups | 3.2.4 | [Open in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=Clooos&repository=Bubble-Card&category=plugin) |
| [Navbar Card](https://github.com/joseluis9595/lovelace-navbar-card) | Floating navigation on generated views | 1.6.1 | [Open in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=joseluis9595&repository=lovelace-navbar-card&category=plugin) |

The builder marks each project as **Required** or **Optional** for the current
dashboard. Button Card, Navbar Card, Kiosk Mode, and Card Mod are used by the
generated dashboard foundation. My Cards, Mini Graph Card, and Bubble Card
become required only when the generated cards use sliders, graphs, or pop-ups.
Installing all seven keeps every Marao card type available.

## Installation order

1. Install and configure [HACS](https://www.hacs.xyz/docs/use/).
2. Download Button Card.
3. Download My Cards.
4. Download Card Mod.
5. Download Mini Graph Card.
6. Download Bubble Card.
7. Download Navbar Card.
8. Download Kiosk Mode.
9. Confirm the resources are loaded as described below.
10. Install Marao Dashboard as a HACS **Integration**, restart Home Assistant,
    and add the Marao Dashboard integration.

The cards do not depend on this exact sequence after installation. The order is
provided so missing resources are easy to diagnose before Marao generates its
first dashboard.

## Storage-managed resources

Storage mode is the simplest option. HACS normally adds a JavaScript-module
resource for each downloaded Dashboard repository. In Home Assistant, open
**Settings > Dashboards**, select the three-dot menu, then **Resources**. Keep
one HACS resource for each project and remove duplicate manual entries.

After installing or updating a dependency, refresh the browser. Restart Home
Assistant when HACS or the dependency's own instructions request it.

## YAML-managed resources

When `lovelace.resource_mode` is `yaml`, HACS downloads the files but cannot
maintain this list for you. Add the six card resources under `lovelace` and load
Kiosk Mode as a frontend module:

```yaml
lovelace:
  resource_mode: yaml
  resources:
    - url: /hacsfiles/button-card/button-card.js
      type: module
    - url: /hacsfiles/my-cards/my-cards.js
      type: module
    - url: /hacsfiles/lovelace-card-mod/card-mod.js
      type: module
    - url: /hacsfiles/mini-graph-card/mini-graph-card-bundle.js
      type: module
    - url: /hacsfiles/Bubble-Card/bubble-card.js
      type: module
    - url: /hacsfiles/lovelace-navbar-card/navbar-card.js
      type: module

frontend:
  extra_module_url:
    - /hacsfiles/kiosk-mode/kiosk-mode.js
```

Merge these keys into existing `lovelace` and `frontend` sections; do not create
duplicate top-level keys. Restart Home Assistant after changing
`frontend.extra_module_url`.

Card Mod can also be placed in `frontend.extra_module_url` for its optional
performance mode. If you do that, follow Card Mod's upstream instructions and
copy the exact HACS resource URL, including its `?hacstag=...` value. Keep the
Dashboard resource for Cast support and do not load two different Card Mod
URLs or versions.

## Upgrading from older Marao releases

Install all seven dependencies before removing the old resources, then:

1. In storage mode, Marao removes only legacy resource paths below
   `/hacsfiles/MaraoDashboard/vendor/` when the integration starts. It leaves
   standalone upstream resources and unrelated entries unchanged. Check the
   Resources page if an upgrade was interrupted.
2. In YAML resource mode, Marao never rewrites `lovelace.resources`. Home
   Assistant creates a Repair listing the exact legacy entries to remove; then
   add the canonical `/hacsfiles/...` entries above.
3. Remove any second `/local/...` or manually added resource for the same card.
   Keep one HACS URL per dependency.
4. Restart Home Assistant, refresh every browser or companion app, and clear
   its frontend cache if an old card version remains visible.
5. After confirming that no resource points at it, an obsolete
   `www/community/MaraoDashboard/vendor` directory can be removed.

Marao no longer owns or upgrades these seven projects. Update them from their
individual HACS pages and review their release notes when moving beyond the
tested baselines.

## Troubleshooting

### “Custom element doesn't exist”

Confirm the named dependency is downloaded in HACS and that exactly one
resource points to its `/hacsfiles/...` file. A successful download alone is not
enough for YAML resource mode; the resource list above must also be present.

### Pop-ups do not open

Verify that Bubble Card is loaded and is at least the tested baseline. Marao's
room, media, and camera-event pop-ups use `custom:bubble-card`.

### Sliders or graphs are missing

Sliders require My Cards. Graphs require Mini Graph Card and their nested
styling requires Card Mod.

### Kiosk settings have no effect

For YAML resource mode, confirm Kiosk Mode appears under
`frontend.extra_module_url`, restart Home Assistant, and then reload the
dashboard.

### Card Mod reports duplicate patching

Compare **Settings > Dashboards > Resources** with
`frontend.extra_module_url`. Remove duplicate or legacy URLs and, if using Card
Mod's performance mode, make the extra-module URL exactly match the HACS
resource URL. Clear the frontend cache after correcting it.

## Removing dependencies

Uninstalling Marao does not remove these independent HACS downloads. They may
also be used by other dashboards. Remove a dependency from HACS only after
checking that no other dashboard references its custom element, then remove any
manual YAML resource for it. See the [uninstall guide]({{ '/docs/installation/uninstall.html' | relative_url }})
for the Marao-specific cleanup.
