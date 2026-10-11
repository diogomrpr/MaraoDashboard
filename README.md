# Marao Dashboard

<picture>
  <source media="(max-width: 300px) and (prefers-color-scheme: dark)" srcset="custom_components/marao_dashboard/frontend/brand/mark-dark.svg">
  <source media="(max-width: 300px)" srcset="custom_components/marao_dashboard/frontend/brand/mark.svg">
  <source media="(prefers-color-scheme: dark)" srcset="custom_components/marao_dashboard/frontend/brand/logo-dark.svg">
  <img src="custom_components/marao_dashboard/frontend/brand/logo.svg" alt="Marao Dashboard mountain logo" width="312" height="168" loading="lazy">
</picture>

Marao Dashboard builds a complete, phone-friendly Home Assistant dashboard from
a visual/JSON editor. It combines editable pages and sections, reusable cards
and pop-up controls, a coordinated theme, and local version history.

## Highlights

- Add, duplicate and edit every page, section and card from an admin-only Home
  Assistant panel. Start with Home, Rooms, Security, Energy, Wallbox or Media.
- Keep explicit room membership, configure Entity Groups and energy units, and
  choose a landing page independently of the five navbar pins.
- Generate a complete YAML dashboard while preserving marked custom-card
  sections between rebuilds.
- Use a responsive Marao theme and consistent controls for common Home
  Assistant domains.
- Add live camera previews with optional Frigate or UniFi Protect event pop-ups.
- Restore recent generated dashboard versions from local history.

## Installation

Marao Dashboard is a self-contained HACS custom **Integration**. Its generated
cards, floating navigation, bottom-sheet popovers, theme, and fullscreen shell
runtime are served by Marao itself.

1. Add `https://github.com/diogomrpr/MaraoDashboard` to HACS as a custom
   **Integration** repository and download Marao Dashboard.
2. Restart Home Assistant.
3. Go to **Settings > Devices & services > Add integration**, then add
   **Marao Dashboard**.
4. Open the Marao Dashboard Editor from the sidebar and generate the dashboard.

See the [full documentation](https://diogomrpr.github.io/MaraoDashboard/) for
configuration, camera-provider requirements, updates, and troubleshooting.

## Development

The [OpenSpec guide](openspec/README.md) records the existing product contracts,
development context, and workflow for proposing and implementing future tasks.
Read it alongside `AGENTS.md` before changing behavior.

Install the locked Node and Python test dependencies:

```sh
npm ci
python3.14 -m venv .venv
source .venv/bin/activate
python -m pip install -r tests/requirements.txt
```

During development, run only the focused check for the code or card being
changed. Before a push, tag, or release, `npm run verify:publish` runs the full
suite and the local Home Assistant browser check. That check requires the
disposable environment described in the
[development guide](docs/docs/development/local-development.md) and must never
target a live Home Assistant instance. Configure its URL, administrator long-lived
token, and SSH access in the ignored `ha-test/local.json`. `npm run ha:sync`
builds and installs the current working tree, creates safe demonstration entities,
and generates the complete test dashboard. Browser tests prepare it automatically.
Versioned publication also requires the clean final candidate’s preserved-install
upgrade scenario and `verify:release`, including historical data, mobile/theme
visual inspection and verified disposable cleanup. Fresh fixture checks alone
do not establish upgrade compatibility.

Frontend changes need an integration reload and browser refresh; backend changes
need a Home Assistant restart. Preparation handles both.

Marao does not install, update, replace, or remove unrelated HACS cards.

## Repository layout

- `custom_components/marao_dashboard/` — Marao integration and packaged runtime,
  theme, and generator source.
- `frontend_src/` — editable dashboard-editor source and build scripts.
- `tests/` — automated integration, frontend, and browser checks.
- `ha-test/` — disposable-instance preparation, safe fixtures, and full Cases view.
- `openspec/` — baseline specifications, project context, and future change plans.
- `docs/` — product and development documentation.
- `.github/` — CI workflows and contribution guidance.

HACS installs only `custom_components/marao_dashboard/`. Tests, synthetic media,
test dependencies, and local credentials stay outside that directory. Package
validation checks both the HACS source and staged build. Generated development
output stays in ignored `ha-test/.cache/` and `tests/.artifacts/` directories.

## Contributing and license

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) before opening a pull request. Marao
Dashboard is distributed under the repository's license.

Inspired by [HaCasa](https://github.com/damianeickhoff/HaCasa).
