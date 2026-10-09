---
title: Development
layout: page
nav_order: 3
---

# Development and architecture

Marao has three connected layers: an administrator builder, a Python dashboard
generator, and a browser runtime. Home Assistant owns entity state and service
actions. Marao organizes and displays them through its own cards and controls.

## How a dashboard is built

1. The Home Assistant integration registers an administrator editor panel,
   authenticated WebSocket commands, the generation service, its static frontend
   route, and the theme. It serves installed assets from
   `/marao_dashboard_static` and versions frontend URLs from their content.
2. The editor loads the card catalog, configuration, and available entities from
   those authenticated commands. It edits the dashboard JSON and sends
   **Save & Generate** to the backend.
3. The backend validates and resolves configuration, records local history,
   and asks the generator to write Lovelace YAML. Output and history live under
   Home Assistant's `dashboard/MaraoDashboard/`; the theme lives under `themes/`.
   Protected custom-card regions survive regeneration.
4. Home Assistant loads the generated views. The Marao entry module waits for
   the native frontend before registering cards, navigation, popup controls,
   and the fullscreen shell. Cards render authoritative Home Assistant state
   and dispatch native services through shared controls.

Custom pages use the same `pages.custom` configuration interface as ordinary
user dashboards. Test preparation composes the Cases page through this interface;
production code has no gallery mode, synthetic camera provider, or fake entities.

## Source and generated files

| Location | Responsibility |
| --- | --- |
| `custom_components/marao_dashboard/` | Installed integration: setup, config flow, builder catalog, generator, history, translations, runtime, and theme |
| `frontend_src/` | Editable visual-editor source plus editor and HACS build scripts |
| `tests/` | Python/frontend tests, validation, and browser runners |
| `ha-test/` | Connection/preparation tooling, safe entities, fixture providers, realistic dashboard, and Cases coverage |
| `docs/` | Product and development documentation |
| `.github/` | Contribution guidance and CI |

Edit the visual editor in `frontend_src/MaraoDashboardPanel.js`. Its generated
panel JavaScript/CSS, worker bundles, icon font, and Monaco license are committed
under the installed frontend directory so HACS users need no Node toolchain.
Run `npm run build:editor` to regenerate them; `npm run check:editor` detects drift.
The separate Marao card, camera-event, and dashboard runtime modules and theme
are edited directly in the installed integration source.

`npm run build:hacs` stages only that integration in `ha-test/.cache/dist/` and
checks source and staged files for development-only dependencies, fixtures,
synthetic media, and credentials. HACS installs the integration directory from
the repository; it does not install the root Node/Python test dependencies.
Bundled Monaco assets are required editor runtime assets. Third-party Lovelace
cards are not dependencies and must not be bundled or modified.

## Continue development

- [Local development]({{ '/docs/development/local-development.html' | relative_url }})
  covers dependencies, token/SSH configuration, current-code deployment, reloads,
  tests, manual preview, and troubleshooting.
- [Test gallery coverage]({{ '/docs/development/test-gallery.html' | relative_url }})
  describes safe states, behavioral examples, and realistic pages.
- [Dashboard quality contract]({{ '/docs/development/dashboard-quality.html' | relative_url }})
  defines the mobile, interaction, validation, and release requirements.
- [Theme design]({{ '/docs/development/theme.html' | relative_url }}) and
  [Template design]({{ '/docs/development/template.html' | relative_url }}) describe
  reusable tokens and card variants.

Keep changes in the smallest shared layer and align builder, validation,
generation, runtime, translations, fixtures, and documentation when behavior
crosses those boundaries.
