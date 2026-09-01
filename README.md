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

Marao Dashboard is a HACS custom **Integration**. Its seven dashboard-card
dependencies are separate HACS **Dashboard** downloads; Marao does not package
third-party card code.

1. Install the [required dashboard dependencies](docs/docs/installation/dependencies.md).
2. Add `https://github.com/diogomrpr/MaraoDashboard` to HACS as a custom
   **Integration** repository and download Marao Dashboard.
3. Restart Home Assistant.
4. Go to **Settings > Devices & services > Add integration**, then add
   **Marao Dashboard**.
5. Open the Marao Dashboard Editor from the sidebar and generate the dashboard.

See the [full documentation](https://diogomrpr.github.io/MaraoDashboard/) for
configuration, camera-provider requirements, updates, and troubleshooting.

## Development

Install the locked Node and Python test dependencies, then run the test suite:

```sh
npm ci
python3.14 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-test.txt
npm test
```

Useful focused checks are `npm run test:static` and `npm run test:python`. The
local Home Assistant browser test, `npm run test:ha:e2e`, is opt-in and requires
the local environment described in the
[development guide](docs/docs/development/local-development.md).

Third-party dashboard dependencies must remain independently installed through
HACS. Do not copy their JavaScript bundles into this repository or a release.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Marao
Dashboard is distributed under the repository's license.

Inspired by [HaCasa](https://github.com/damianeickhoff/HaCasa).
