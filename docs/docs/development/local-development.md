---
title: Local development
layout: page
parent: Development
nav_order: 2
---

# Local development

Development and browser tests use a disposable Home Assistant instance. The
preparation command installs the current working tree, creates safe entities,
and generates one dashboard at `/marao-dashboard`. Agents working on this
repository may connect only to `192.168.0.28`; the same tools let developers
configure their own disposable instances. Never use a household or production
instance, or exercise a real security or safety device.

## Install development dependencies

Use Node.js 22 or newer and Python 3.14:

On macOS, Node 24 LTS includes npm and npx and can be installed for free with
Homebrew:

```sh
brew install node@24
```

Add `export PATH="/opt/homebrew/opt/node@24/bin:$PATH"` to your existing
`~/.zprofile` on Apple Silicon (`/usr/local/opt/node@24/bin` on Intel), preserving
its other settings. Open a fresh login shell and check `node --version`,
`npm --version`, and `npx --version`. Installing a keg-only runtime does not
require overwriting an unrelated global npm installation.

```sh
npm ci
python3.14 -m venv .venv
source .venv/bin/activate
python -m pip install -r tests/requirements.txt
npx playwright install chromium
```

HACS users do not run these commands. HACS downloads only
`custom_components/marao_dashboard/`; development tools, tests, test dependencies,
and fixtures live outside the installed integration. `npm run build:hacs` builds
the editor and stages the validated integration under
`ha-test/.cache/dist/custom_components/marao_dashboard/`.

## Configure a disposable instance

1. Start a disposable Home Assistant instance with SSH access to its configuration
   directory and take a baseline backup or VM snapshot.
2. Create a dedicated administrator user. In that user's profile, create a
   **Long-Lived Access Token**. Administrator access is required for setup,
   dashboard generation, integration reloads, and restart actions.
3. Configure key-based SSH access and accept the instance's verified host key.
   The SSH account must be able to write its Home Assistant configuration directory.
4. Copy `ha-test/local.example.json` to `ha-test/local.json`. Set its URL, token,
   SSH details, and configuration directory. Set `disposable` to `true` only
   after verifying this is the test instance.

| Setting | Meaning |
| --- | --- |
| `url` | Home Assistant base URL, including its port if needed |
| `token` | Administrator long-lived token |
| `disposable` | Explicit acknowledgement that preparation may replace Marao test fixtures and restart this instance |
| `sshHost`, `sshUser`, `sshPort` | SSH connection to the same test instance |
| `sshKeyPath` | Private-key path; relative paths resolve beside `local.json` |
| `remoteConfigPath` | Absolute Home Assistant configuration directory, usually `/config` |

`ha-test/local.json`, `ha-test/ssh/`, and `ha-test/.ssh/` are ignored. Keep tokens
and keys out of source, screenshots, and reports. API and browser tests share
this token; a Home Assistant password is not needed.

## Prepare automatic and manual tests

```sh
npm run ha:sync:dry-run
npm run ha:sync
```

The dry run inspects local configuration and reports the deployment plan without
building, writing files, or contacting Home Assistant. The real command builds
from the working tree, validates the HACS installation boundary, deploys through
SSH, installs fixture integrations and helpers, ensures Marao is configured,
and generates the realistic pages and Cases view. It waits for readiness and
checks deployed files, frontend resources, routes, and entities before succeeding.
It records successful deployment state only after these checks pass.

Every `test:ha:*` command and manual mobile preview runs the same preparation
first. Tests cannot silently use yesterday's installed code. Repeating preparation
keeps one Marao integration and one dashboard. Fixtures and generated test
configuration are owned by this workflow, so use the canonical files in the repo
for lasting changes.

| Changed files | Preparation action |
| --- | --- |
| Frontend modules, styles, fonts, images, or theme | Reload Marao; refresh the browser |
| Dashboard configuration or Cases cards | Regenerate and refresh the dashboard |
| Integration/fixture Python, manifests, backend translations, or helper definitions | Restart Home Assistant and wait for readiness |
| Initial installation or dashboard registration | Restart when required |
| Only tests or documentation | Verify current deployment; no restart |

Frontend URLs include a fingerprint of the actual frontend files. Reloading the
integration recalculates it, so the browser requests the new modules and workers.
Routine sync preserves the installed theme and reloads it when changed. Python
changes require a restart because reloading an integration does not reliably
re-import every Python module.

For manual testing, run `npm run ha:sync`, then open
`http://YOUR-TEST-HOST:8123/marao-dashboard/overview` or
`/marao-dashboard/card-test` using your configured base URL. Sync again after
an edit; there is no background watcher.

### Visual browser inspection

Use the available local browser control for navigation, mobile viewport sizing,
screenshots, semantic controls, and console inspection. Home Assistant cards use
shadow DOM; when an accessibility-index click cannot reach a control, use its
semantic browser locator (role and accessible name). Read the updated page after
navigation or opening a popup before judging its rendering.

Inspect both the realistic page and the corresponding Cases examples. Open
popups, scroll their contents, close them, and verify restored focus. Exercise
actions only on safe fixture entities. Browser inspection complements the
automated checks: an empty popup can be visibly broken without producing a
console exception. Refresh after sync and confirm the resource fingerprint
matches the workspace before attributing a problem to the current code.

Capture popups after their slide animation settles. The mobile matrix reapplies
and checks typography before each scrolling screenshot so cards loaded later
receive the selected text profile too.

The existing browser control and pinned Playwright checks require no additional
paid browser service, plugin, third-party card, or disabled sandbox. API and SSH
commands may need narrowly approved local-network access to the disposable
instance. Keep authentication in the ignored local configuration or the existing
authenticated browser session; never put tokens in browser URLs or reports.

## Focused checks and preview

Run the smallest relevant check during normal development. For example:

```sh
node --test tests/frontend/marao-climate-card.test.js
pytest tests/components/marao_dashboard/test_generator.py
npm run test:ha:alignment
npm run test:ha:sliders
npm run test:ha:e2e -- --actions-only
npm run test:ha:e2e -- --ui-only --screenshots
npm run test:ha:e2e -- --disconnect-only
npm run ha:preview:accessibility -- --scenario iphone-normal --theme light
```

The alignment check opens the Apple TV and generic media popups and verifies that
icon-only controls are centered within 0.5 CSS pixels. It also checks the loaded resource
fingerprint, narrow layouts, action/state-label contrast in both themes, and
essential readings at 200% text. Use it whenever an icon-only action or its shared layout changes.
The slider check covers only light, fan, and cover value sliders across the mobile
profiles and both themes. It checks endpoint alignment, distinct surfaces,
contrast, confirmed versus target values, and one service call per completed
interaction. Its screenshots stay in the ignored local artifact directory.
The preview opens a headed browser and keeps it open until you close it.

Preview profiles are `iphone-normal`, `iphone-bold`, `iphone-text-200`,
`iphone-page-zoom-200`, `iphone-bold-text-200`, their `android-` equivalents,
`narrow-320`, `iphone-landscape`, and `android-landscape`. Choose `light` or
`dark` with `--theme`. Chromium emulation covers mobile layout, touch, safe areas,
text scaling, and zoom reflow. It does not establish that a physical phone was
tested. VoiceOver, TalkBack, and OS high contrast are outside the current gate.

All browser checks share current iPhone/Android metadata in
`tests/mobile-devices.js`, while keeping the agreed 390 × 844 and 360 × 800 CSS
viewports. Keep that metadata current when upgrading Playwright: older iOS
user agents can select Home Assistant's legacy frontend and introduce native
warnings unrelated to the dashboard layout.

The broader local layers are `npm run test:static` and `npm run test:python`.
Static checks verify the committed editor bundle without rewriting it, run
frontend tests, stage the HACS package, and validate YAML and gallery coverage.
`npm test` runs these local layers without contacting Home Assistant. Generated
reports, screenshots, pytest cache, and coverage belong in `tests/.artifacts/`.

Run `npm run verify:publish` during final stabilization or before a push, tag,
GitHub release, or HACS release. It includes all local tests plus end-to-end and
mobile browser checks, icon alignment, and value-slider geometry and real
pointer interactions. The mobile matrix prepares once and runs independent
browser contexts in batches of three. CI runs local checks; it does not have test-instance
credentials. GitHub Tests, hassfest, and HACS checks must pass for a published
commit. After the last code edit and automated check, visually inspect every
affected card on the disposable dashboard as required by the
[quality contract]({{ '/docs/development/dashboard-quality.html' | relative_url }}).

## Add or change a feature

1. Trace its builder field, Python validation/generation, runtime card, shared
   control, theme, and translations. Fix reusable behavior in its shared source.
2. Identify all cards affected by shared code or layout changes.
3. Edit the source files described in the
   [architecture guide]({{ '/docs/development/index.html' | relative_url }}).
   Run `npm run build:editor` after editing the visual editor source.
4. Add stable state examples, safe helper definitions, popup/action variants,
   and coverage entries in `ha-test/`. Place a representative example on a
   realistic generated page as well as Cases. See
   [gallery coverage]({{ '/docs/development/test-gallery.html' | relative_url }}).
5. Add the smallest regression check, run it, sync, and inspect the affected
   cards and interactions. Use only the fake entities for actions.

## Troubleshooting

- **Authentication fails:** check the base URL and that the token is current and
  belongs to an administrator. Replace it in the ignored configuration; do not
  paste it into a command, report, or issue.
- **SSH fails:** check the key path, verified host key, port, account, and write
  access to `remoteConfigPath`. The API and SSH targets must be the same instance.
- **A fixture provider conflicts:** use a clean disposable instance. Preparation
  must not overwrite a real provider integration with a fake one.
- **Sync or readiness fails:** read the reported phase and fix it, then rerun.
  A failed run does not establish a successful deployment. Check the disposable
  instance's logs locally, keeping credentials and private data out of reports.
- **Old UI appears:** rerun sync and refresh the browser. The loaded resource
  fingerprint must match the prepared workspace. Clear the device's Home
  Assistant frontend cache only if a refresh still leaves an old session.
- **Legacy resource Repair:** remove only the exact legacy resource entries
  listed by Marao. Keep unrelated resources and Google Fonts. Reload Marao or
  restart after a manual YAML edit; a Lovelace resource reload alone does not
  clear the Repair.
- **Missing state example or entity:** update its canonical fixture and coverage
  entry, then prepare again. Do not hand-edit the generated dashboard to mask it.
