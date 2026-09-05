# Marao Dashboard

Marao Dashboard builds a complete, phone-friendly Home Assistant dashboard from
a visual JSON editor. It combines generated overview and room views, reusable
cards and pop-up controls, a coordinated theme, and local version history.

## Highlights

- Edit rooms, entities, cards, and optional pages from an admin-only Home
  Assistant panel.
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

Install the locked Node and Python test dependencies:

```sh
npm ci
python3.14 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-test.txt
```

During development, run only the focused check for the code or card being
changed. Before a push, tag, or release, `npm run verify:publish` runs the full
suite and the local Home Assistant browser check. That check requires the
disposable environment described in the
[development guide](docs/docs/development/local-development.md) and must never
target a live Home Assistant instance.

Marao does not install, update, replace, or remove unrelated HACS cards.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Marao
Dashboard is distributed under the repository's license.

Inspired by [HaCasa](https://github.com/damianeickhoff/HaCasa).
