# Marao Dashboard

<picture>
  <source media="(max-width: 300px) and (prefers-color-scheme: dark)" srcset="custom_components/marao_dashboard/frontend/brand/mark-dark.svg">
  <source media="(max-width: 300px)" srcset="custom_components/marao_dashboard/frontend/brand/mark.svg">
  <source media="(prefers-color-scheme: dark)" srcset="custom_components/marao_dashboard/frontend/brand/logo-dark.svg">
  <img src="custom_components/marao_dashboard/frontend/brand/logo.svg" alt="Marao Dashboard mountain logo" width="312" height="168" loading="lazy">
</picture>

Marao gives Home Assistant a mobile dashboard with configurable cards, shared
navigation, room shortcuts, pop-up controls and coordinated light/dark styling.
Use Home Assistant's native editor to arrange pages, sections and cards.

**[Documentation and live card playgrounds](https://diogomrpr.github.io/MaraoDashboard/)**

Try fictional devices, change settings or YAML, then copy a card configuration
into Home Assistant. The public site documents the matching stable release.

## Install

Requires stable Home Assistant **2025.12.0 or newer** and HACS.

1. Add `https://github.com/diogomrpr/MaraoDashboard` as a HACS custom **Dashboard** repository.
2. Download Marao and confirm one JavaScript module resource at `/hacsfiles/MaraoDashboard/MaraoFrontend.js`.
3. Refresh Home Assistant. In an editable dashboard, choose **Add card** and search for Marao.

See [installation](docs/src/content/docs/start/install.md),
[first card](docs/src/content/docs/start/first-card.md) and
[dashboard setup](docs/src/content/docs/start/dashboard.mdx).
Marao is frontend-only; it does not install a Python backend or other custom cards.

**Older installations:** an old HACS Integration entry must migrate manually;
do not update it in place. Dashboards using `strategy.source_json` need explicit
conversion for native editing. Preserve the same dashboard address and matching
package/data recovery copies. Follow [migration and recovery](docs/docs/installation/native-migration.md).

## Features

- Native Home Assistant editing, sizing and visibility, with Marao card configuration forms.
- A shared floating navbar, overflow menu, Bermuda current-room shortcut and optional Away page.
- Lights, climate, access, media, cameras, history, energy, appliances and other card families.
- Ordered People and Entity Groups, section controls and shared schedule collections.
- Automatic details or editable popup layouts backed by native Sections views.
- Floor plans with visual light placement and illuminated strip overlays.
- Public card examples with editable configuration and safe interactive scenarios.
- Installed-version metadata and a [read-only agent planner](docs/docs/development/agent-authoring.md) for editing through ha-mcp.

Native dashboard configuration is readable through Home Assistant's authenticated
configuration APIs. Hidden dashboards and administrator-only editors do not make
embedded data private; review imported raw values and recovery files accordingly.

## Develop

Read [AGENTS.md](AGENTS.md), the [OpenSpec index](openspec/README.md) and the
[development guide](docs/docs/development/index.md). Use the affected project
skills and shared components. Preserve existing configuration and unrelated work.

```sh
npm ci
npm run build:editor
```

Python checks use the pinned requirements in `tests/requirements.txt` and the
project's `.venv`. Select the smallest relevant checks using
[focused testing](docs/docs/development/focused-testing.md). Full and parallel
suites require an explicit request; camera playback/transport remains manual-only.

Install applicable final changes on the disposable Home Assistant before handoff.
Agents may use only `192.168.0.28`, with private connection details in ignored
`ha-test/local.json`. Use direct frontend preparation for compatible frontend
changes and `npm run ha:sync` for initial/fixture setup. See
[local development](docs/docs/development/local-development.md).

Before a push, tag or release, run `npm run verify:publish` for affected unit tests.
Install the exact final release candidate before publication and reuse development
integration evidence. See [packaging](docs/src/content/docs/development/packaging.md).

## Repository

- `custom_components/marao_dashboard/frontend/`: editable runtime and generated bundles.
- `frontend_src/`: native editor, composition, conversion and build source.
- `dist/`: complete flat HACS frontend graph.
- `tests/` and `ha-test/`: checks and disposable fixtures; never shipped.
- `docs/`: Starlight site, fictional examples and canonical project guidance.
- `openspec/`: specifications, context and change plans.

The retained Python integration/generator is historical reference and recovery
code, outside the frontend download. Do not hand-edit generated release assets.

## Contribute

See [CONTRIBUTING.md](.github/CONTRIBUTING.md). Marao is distributed under the
repository's license.

Inspired by [HaCasa](https://github.com/damianeickhoff/HaCasa).
