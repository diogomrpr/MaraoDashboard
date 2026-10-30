# Marao Dashboard

<picture>
  <source media="(max-width: 300px) and (prefers-color-scheme: dark)" srcset="custom_components/marao_dashboard/frontend/brand/mark-dark.svg">
  <source media="(max-width: 300px)" srcset="custom_components/marao_dashboard/frontend/brand/mark.svg">
  <source media="(prefers-color-scheme: dark)" srcset="custom_components/marao_dashboard/frontend/brand/logo-dark.svg">
  <img src="custom_components/marao_dashboard/frontend/brand/logo.svg" alt="Marao Dashboard mountain logo" width="312" height="168" loading="lazy">
</picture>

Marao Dashboard provides phone-friendly Home Assistant cards, pop-up controls,
a shared floating navbar and a coordinated light/dark appearance. Use Home
Assistant’s native editor for pages, sections, sizing and visibility.

## Dashboard editing changes in v0.24.0

Existing strategy dashboards need an explicit one-time conversion to use Home
Assistant's editor. Back up the matching package and HA data, update Marao, then
open the former editor page to prepare conversion and download recovery files.
Convert at the same dashboard address. Existing sources render read-only until
conversion; ordinary native dashboards need no conversion. See the
[migration guide](docs/docs/installation/native-migration.md).

## Breaking change in v0.22.0

Marao is now a frontend-only HACS **Dashboard** package, using Home Assistant's
native dashboard storage. **Existing Integration installations must migrate
manually. Do not select Update on the old Integration entry.** Keep the same
repository and dashboard address; follow the [migration and rollback guide](docs/docs/installation/native-migration.md).

Download [marao-converter.html](https://github.com/diogomrpr/MaraoDashboard/releases/download/v0.23.4/marao-converter.html),
open it locally, paste your old JSON and select Translate. It works without
Home Assistant or a server and asks only for missing information. Keep an exact
private package/data backup before removing anything. The one-time migration
needs a Home Assistant restart. Later Dashboard updates need a client refresh.

Configuration History/Restore is removed; sensor charts remain. Netatmo supports
basic native recordings without typed detection filters. Native dashboard source
is readable by authenticated Home Assistant users; review private values before
importing, even when the dashboard is hidden or restricted to administrators.

## Highlights

- Edit pages, sections, card sizes and visibility in Home Assistant’s native editor.
- Upload a floor plan and place light buttons and illuminated strip overlays visually.
- Keep media controls in their popup or show them directly on the dashboard.
- Keep explicit room membership, Entity Groups, energy units and custom content.
- Use project-owned cards, floating navigation, popovers and scoped styling.
- Configure navigation once and display it automatically on every dashboard page.
- Save ordinary Home Assistant dashboard configuration with no Marao Python backend.
- Convert supported historical JSON through one maintained incremental converter.

## Installation

Requires stable Home Assistant **2026.10.0 or newer** and HACS.
Existing users must complete the [migration guide](docs/docs/installation/native-migration.md) first.

1. Add `https://github.com/diogomrpr/MaraoDashboard` to HACS as a custom
   **Dashboard** repository and download Marao Dashboard.
2. Verify the JavaScript module resource
   `/hacsfiles/MaraoDashboard/MaraoFrontend.js` is registered once, then refresh HA.
   YAML-managed resources use `lovelace.reload_resources` after editing the list.
3. Create an editable dashboard in **Settings → Dashboards** and add Marao cards
   through its native picker. Enable shared navigation using the small settings
   block in the [configuration guide](docs/docs/installation/configuration.md).
   Existing strategy dashboards use explicit conversion with recovery exports.

See the [full documentation](https://diogomrpr.github.io/MaraoDashboard/) for setup,
configuration, camera-provider requirements, updates and troubleshooting.

## Development

The [Codex workflow and project skills](openspec/README.md#codex-workflow-and-project-skills)
cover HA integration, frontend development and scoped testing. Follow `AGENTS.md`
and the affected capability specs: small existing-behavior repairs use the short
path; new behavior and substantial changes use OpenSpec.

Install the locked Node and Python test dependencies:

```sh
npm ci
python3.14 -m venv .venv
source .venv/bin/activate
python -m pip install -r tests/requirements.txt
```

During development, run only the focused check for the code or card being
changed. Before a push, tag, or release, `npm run verify:publish` runs the scoped
checks for the affected components. Browser checks require the
disposable environment described in the
[development guide](docs/docs/development/local-development.md) and must never
target a live Home Assistant instance. Configure its URL, administrator long-lived
token, and SSH access in the ignored `ha-test/local.json`. `npm run ha:sync`
builds and installs the current working tree. On a migrated dashboard, frontend
preparation preserves saved source and does not reset fixtures or restart HA.
Publication runs affected unit tests only. Install the final release candidate,
including version metadata, on the disposable instance before publishing.
Reuse development browser and upgrade results; additional integration, full-suite
and complete mobile-matrix testing require an explicit request. Changes to saved
data or generated ownership still need appropriate compatibility and recovery
verification during development.

Frontend updates need a browser refresh. The development-only Python fixtures
may need a restart when their code changes; they are not part of the product.

Marao does not install, update, replace, or remove unrelated HACS cards.

## Repository layout

- `custom_components/marao_dashboard/` — editable runtime source and frozen legacy
  integration/generator reference for compatibility and rollback.
- `dist/` — generated HACS Dashboard files; no Python is installed by this package.
- `frontend_src/` — editable dashboard-editor source and build scripts.
- `tests/` — automated integration, frontend, and browser checks.
- `ha-test/` — disposable-instance preparation, safe fixtures, and full Cases view.
- `openspec/` — baseline specifications, project context, and future change plans.
- `docs/` — product and development documentation.
- `.github/` — CI workflows and contribution guidance.

HACS installs the flat frontend graph from `dist/`. Tests, synthetic media, test
dependencies and local credentials are not shipped. Editable runtime sources and
the frozen legacy integration remain in `custom_components/marao_dashboard/`;
generated development output stays in ignored cache/artifact directories.

## Contributing and license

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) before opening a pull request. Marao
Dashboard is distributed under the repository's license.

Inspired by [HaCasa](https://github.com/damianeickhoff/HaCasa).
