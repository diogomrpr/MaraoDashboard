---
title: Local development
layout: page
parent: Development
nav_order: 2
---

# Local development

Development and browser tests use a disposable Home Assistant instance. Full
preparation installs the current working tree and safe fixture entities. The single
ordinary HA dashboard at `/marao-dashboard` retains its saved views and card configuration.
Routine frontend preview syncs current frontend
files to an already compatible installation and leaves successful changes installed.
Agents working on this
repository may connect only to `192.168.0.28`; the same tools let developers
configure their own disposable instances. Never use a household or production
instance, or exercise a real security or safety device.

## Install before handing off

A completed software task includes installing all applicable current changes on
the disposable test instance `192.168.0.28`. This is required even when the user
will do all visual testing. Local builds and browser overrides are not deployment.
Batch edits and normally sync once at the end; repeat only for a later change,
a failed installation or a necessary diagnostic. Leave successful assets installed.
If installation fails, report **not installed / not ready for test**, not done.
Instruction/documentation/test-tool-only changes with no runtime effect need no sync.

For frontend-only work on a compatible installation, reuse the lightweight helper
without launching a preview browser:

```sh
node -e "require('./ha-test/prepare-frontend').prepareFrontend().catch(error => { console.error(error.message); process.exitCode = 1; })"
```

Use `ha:preview` instead when already inspecting the UI. Use full `npm run ha:sync`
only for initial setup or changed fixture/backend preparation needing
full preparation. Batch changes requiring a restart. The sync's current-asset and
readiness checks suffice for installation confirmation; no extra browser suite is
required. Preserve user test configuration and helper state where applicable.

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

HACS users do not run these commands. The Dashboard package downloads the flat
`dist/` frontend graph; development tools, tests and safe fixture integrations stay
outside that package. `npm run build:hacs` builds/stages the native frontend and
committed distribution graph. The frozen Python integration remains rollback/reference
source and is not installed by current Dashboard releases.

## Configure a disposable instance

1. Start a disposable Home Assistant instance with SSH access to its configuration
   directory and take a baseline backup or VM snapshot.
2. Create a dedicated administrator user. In that user's profile, create a
   **Long-Lived Access Token**. Administrator access is required for setup,
   native configuration changes, explicit conversion and fixture preparation/restarts.
3. Configure key-based SSH access and accept the instance's verified host key.
   The SSH account must be able to write its Home Assistant configuration directory.
   Preserved-upgrade checks also require `python3` in that SSH environment. If
   using an SSH add-on, include Python in its persistent additional packages;
   packages installed only in the running container may disappear on restart.
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
SSH and prepares the owned fixture integrations/helpers when needed. On a compatible
ordinary native installation it preserves saved dashboard configuration; conversion
or replacement of product pages is never an implicit frontend-sync operation. It waits for readiness and
checks deployed files, frontend resources, routes, and entities before succeeding.
It records successful deployment state only after these checks pass.
Deployment staging uses a fresh private system temporary folder and removes it
on success or failure. It checks the staged package against the working tree;
synchronized workspace caches are not deployment inputs. The ordinary HACS build
retains its inspectable native package under `ha-test/.cache/native-frontend/`.

Focused live test batches use compatible preparation once and verify current
assets. The lightweight `ha:preview` synchronizes only frontend files and refreshes
the real HA page when assets change. It does not reset helpers, convert or replace
native configuration, generate YAML, reload an integration or restart HA. Missing or incompatible
setup fails with an instruction to prepare explicitly; preview never silently
falls back to full preparation. Fixtures and owned test configuration belong
to the canonical files in the repo, so use those for lasting fixture changes.

| Changed files | Preparation action |
| --- | --- |
| Frontend modules, styles, fonts, images, or scoped theme | Sync the coherent asset graph; refresh the browser |
| Native dashboard configuration or Cases cards | Use an explicit native save or backed-up fixture/conversion operation; refresh as needed |
| Fixture Python or helper definitions requiring preparation | Prepare explicitly; restart only when changed fixture code requires it |
| Initial installation or dashboard registration | Restart when required |
| Only tests or documentation | Verify current deployment; no restart |

Frontend readiness verifies the installed package identity and served files against
the current coherent hashed graph. A native dashboard is recognized from its
ordinary views and versioned Marao settings; compatible asset sync preserves that
source, registration and helper state. Scoped styles/fonts come from the package;
frontend sync does not replace named HA theme files. Only changed development fixture
Python may require a restart. An unconverted legacy installation requires the
explicit migration procedure instead of an automatic asset-only handoff.

For initial setup or backend/fixture changes, run `npm run ha:sync`, then open
`http://YOUR-TEST-HOST:8123/marao-dashboard` or
`/marao-dashboard/card-test` using your configured base URL. For routine frontend
work, use the persistent preview below. It verifies native-installation compatibility, builds
assets when needed, synchronizes frontend files and verifies the served versions.
Keep the test instance current with the latest applicable project changes before
completion. Successful assets stay installed after inspection, a preview error or
closing the browser; package rollback is not cleanup. Revert only with a project
revert or recovery of a genuinely failed operation, and still restore safe helpers
mutated by checks. Full `ha:sync` remains explicit for fresh/backend/fixture setup.
Development visual evidence does not replace required publication/upgrade proof.

### Visual browser inspection

Use the available local browser control for navigation, mobile viewport sizing,
screenshots, semantic controls, and console inspection. Home Assistant cards use
shadow DOM; when an accessibility-index click cannot reach a control, use its
semantic browser locator (role and accessible name). Read the updated page after
navigation or opening a popup before judging its rendering.

Inspect the actual changed surface on current assets. Choose the relevant Cases
example or realistic placement; inspect both only when their different hosts
matter. Open and inspect a popup when its contents/behavior changed. Exercise
actions only on safe fixture entities. Presentation-only work finishes with this
inspection; behavior changes also need their smallest covering assertion. Confirm
the loaded asset version before attributing a problem to the current code.

```sh
npm run ha:preview -- --component slider-headers --watch --scenario iphone-normal --theme light
```

The preview stays open with only selected components in scope. For generic shared
scopes such as actions, labels, connection or scroll, also choose a representative
consumer with `--family <template IDs>`; the family must belong to the scope.
Inspect native card-editor forms and runtime cards separately. Camera form changes
use the native card configuration dialog; the whole-dashboard Visual/Monaco builder
is retired. Native editing must keep its toolbar and previews inert.
`--watch` serializes and debounces frontend edits, syncs their files to HA and
refreshes the browser; it does not attempt to replace already registered
custom elements in place. Use `--once` for a bounded
headless capture of the selected examples, then inspect the private captures;
the command does not certify visual correctness. Diagnostics remain visible.
Normal interactive preview needs no screenshot or second final visit: stop once
the requested result, tier-required assertions,
relevant diagnostics and cleanup are satisfied. Add another layout/theme only
when relevant, rather than traversing the full gallery or mobile matrix.
Watch updates only while the preview is running; closing it leaves the last
successful version installed but starts no continuous background service.

Capture popups after their slide animation settles. The mobile matrix reapplies
and checks typography before each scrolling screenshot so cards loaded later
receive the selected text profile too.

The existing browser control and pinned Playwright checks require no additional
paid browser service, plugin, third-party card, or disabled sandbox. API and SSH
commands may need narrowly approved local-network access to the disposable
instance. Keep authentication in the ignored local configuration or the existing
authenticated browser session; never put tokens in browser URLs or reports.

## Focused checks and preview

Select `visual`, `behavior` or `focused` using the
[focused testing guide](focused-testing.md). Capture the task baseline before
editing; then preview the current task scope:

```sh
npm run test:affected -- --snapshot /private/tmp/marao-task.json
npm run test:affected -- --since /private/tmp/marao-task.json --tier visual --component slider-headers --plan
```

Visual-only work needs code review and a short manual watch list; agent browser
inspection is optional. Behavior work
adds selected offline checks and the exact interaction assertion when relevant;
sensitive contracts retain focused coverage. Existing narrow check commands
remain available for deliberate use, for example:

```sh
node --test tests/frontend/marao-climate-card.test.js
pytest tests/components/marao_dashboard/test_generator.py
npm run test:ha:alignment
npm run test:ha:sliders
npm run test:ha:e2e -- --actions-only
npm run test:ha:e2e -- --ui-only --screenshots
npm run ha:preview -- --component slider-headers --scenario iphone-normal --theme light
```

The native Home Assistant reconnect outage check and upstream-fix version probe
were retired at the user's request on 2026-10-29. The `connection` scope retains
disconnected-action unit checks; full and upgrade runs do not inject that outage.

The alignment check opens the Apple TV and generic media popups and verifies that
icon-only controls are centered within 0.5 CSS pixels. It also checks the loaded resource
fingerprint, narrow layouts, action/state-label contrast in both themes, and
essential readings at 200% text. Select it only for explicitly requested focused integration verification;
publication defaults to affected unit checks and reuses development evidence.
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

For native editor changes, select the existing card editor/model assertions, such
as `tests/frontend/native-card-editor.test.js`, and the affected specialized form
checks. The shared form boundary keeps compatible selectors and preserves active
inputs across ordinary HA updates. The former `test-ha-editor.js` Visual/Monaco
checks and startup/folding measurements are historical; they are not native
editor acceptance steps. Routine appearance and real-phone testing belong to the
user. If a targeted agent inspection is needed, open the actual native card
configuration dialog on current installed assets once.

The broader local layers are `npm run test:static` and `npm run test:python`.
Static checks verify the committed editor bundle without rewriting it, run
frontend tests, stage the HACS package, and validate YAML and gallery coverage.
`npm test` uses the affected runner with existing focused defaults; inspect its
plan before execution because selected browser work can contact HA. Generated
reports, screenshots, pytest cache, and coverage belong in `tests/.artifacts/`.

Implement related queued tasks together and complete their selected development
tier after the final edit. Inspect representative affected components once.
Check migrations and shared security controls early when subsequent work depends
on them. Finish the implementation queue before the complete release
stabilization pass; repair findings with focused checks before verifying the
final candidate. Required publication and preserved-install gates still apply.

Use `--since <snapshot> --tier <visual|behavior|focused>` to exclude unchanged
pre-existing work. Review concurrent edits and disclose any `--file` exclusions;
shared files require reviewed `--component` scope. `--base <ref>` remains available
for deliberate commit ranges. Default execution is serial; full-suite and parallel
runs require explicit requests. Publication independently covers the complete
candidate with applicable exact-commit CI; development-only scope/evidence cannot
satisfy that gate. See [focused testing](focused-testing.md) for details.

## Upgrade compatibility and release preparation

Before changing persisted configuration, defaults, generated components or public
APIs, compare supported released inputs and record either preserved compatibility
or an explicit versioned migration. Preserve selections/deletions, explicit empty
lists, ordering, unknown fields, raw cards, protected YAML and unrelated HA state.
Keep dashboard format independent of release and HA config-entry versions.

Development uses focused conversion/generator/setup/history/model tests. Maintain
historical fixtures with release provenance and independently authored expected
JSON, plus a feature-to-assertion inventory. Preflight and back up exact data before
writes, retain interruption/failure recovery, keep previews/dry runs read-only and
historical archives immutable. A downgrade needs matching package and saved-data
baselines together; see the update guide.

Releases run affected unit tests only through `npm run verify:publish` (or
`verify:release` without an upgrade-report argument). Reuse integration testing
from development, including preserved-install checks where needed for concrete
migration/recovery risk. Before publishing every release, install its final package
and version metadata on disposable `192.168.0.28`, preserving test configuration
and helper state. Reuse an installation only when that exact candidate is already
installed. Installation failure blocks publication; the installer's served-asset
and readiness checks suffice. This installation does not authorize rerunning
browser, camera, mobile or historical-upgrade checks. Supplied
upgrade-report validation remains available as an opt-in; report skipped coverage
honestly and keep known failures visible.

Ordinary browser batches use a separate private preparation receipt and isolated
job artifacts. They validate current source/assets/fixture ownership without
repeating deployment. Preserved-install receipts retain distinct provenance and
refuse reseeding while the remote upgrade marker exists. Existing complete reports
stay immutable; focused and comprehensive results are never relabeled.

## Fix or change behavior

Use the repository's
[OpenSpec guide](https://github.com/diogomrpr/MaraoDashboard/blob/main/openspec/README.md)
for targeted capability references and the `marao-ha-integration`,
`marao-ha-frontend` and `marao-testing` skills. Small repairs restoring documented
behavior, refactors and documentation corrections use the short path: inspect,
implement, complete the selected development tier and compare the result with the requested outcome.
They do not need a new OpenSpec change when requirements stay the same.

For new behavior, public/persisted contracts, migrations or substantial cross-layer
work, reuse an applicable change or create one. An explicit `$openspec-propose`
request produces artifacts for review; `$openspec-apply-change` implements an
accepted change. A direct implementation request authorizes recording necessary
artifacts and continuing through verification without another approval solely
for that paperwork. Archive only completed, verified work.
OpenSpec is free development tooling; it does not change the Home Assistant
runtime or replace the repository quality contract and application checks.

1. Trace its native card field, shared validation/composition, runtime card, shared
   control, scoped theme and translations. Fix reusable behavior in its shared source.
2. Identify affected shared consumers and capture a private task snapshot,
   preserving pre-existing dirty work and reviewing concurrent hunk ownership.
3. Edit the source files described in the
   [architecture guide]({{ '/docs/development/index.html' | relative_url }}).
   Run `npm run build:editor` after editing native editor/composition source;
   the build owns generated frontend files.
4. When supported behavior changes, add stable state examples, safe helper definitions, popup/action variants,
   and coverage entries in `ha-test/`. Place a representative example on a
   realistic native page as well as Cases when those distinct placements matter. See
   [gallery coverage]({{ '/docs/development/test-gallery.html' | relative_url }}).
5. Preview `npm run test:affected -- --since <snapshot> --tier <tier> --plan`,
   resolving shared-file scope with reviewed components. Visual work needs no
   automatic suite; behavior/focused work runs its required checks after the last
   edit. Use frontend preview for current assets and inspect representative changed
   components once. Add only relevant difficult layouts and use safe fake entities
   for actions. Docs-only work needs no HA visit.
6. Compare each requested acceptance case with the implementation and evidence;
   passing tests alone do not prove the requested outcome was delivered.

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
- **Old UI appears in preview:** save the edit and wait for sync/browser refresh,
  or reopen preview; inspect its served-asset diagnostics. Watch runs only while open.
- **Old UI appears after deployment:** rerun explicit sync and refresh the browser. The loaded resource
  fingerprint must match the prepared workspace. Clear the device's Home
  Assistant frontend cache only if a refresh still leaves an old session.
- **Legacy resource Repair:** remove only the exact legacy resource entries
  identified by the migration guide. Keep unrelated resources and themes,
  use native resource reload/refresh for current frontend resources, and follow
  the explicit legacy migration/recovery procedure for old Integration remnants.
- **Missing state example or entity:** update its canonical fixture and coverage
  entry, then prepare the affected fixtures explicitly. Preserve native user edits;
  do not replace the dashboard to hide a missing fixture.

### Controlled climate fixtures

The disposable `marao_test_climate` platform supports `ack_delay` and
`confirmation_delay` (independent finite seconds from 0 to 60), plus `behavior`:
`normal`, `reject`, `unconfirmed` or `corrected`. Defaults retain immediate
acknowledgement and confirmation. Controls apply to mode and temperature requests;
`dual_target: true` supplies the existing range thermostat. Corrected targets
shift by half a degree while preserving the range gap; corrected modes report a
different mode. Each fixture owns its state and pending jobs, which cancel on
removal. These controls live only in `ha-test/`; use safe fixtures on
`192.168.0.28`, never household equipment.

### Historical builder measurements

The retired Visual/Monaco builder was measured on 2026-10-10. Before deferred
Monaco, median cold readiness was 992ms and warm readiness 436ms; matched final
samples measured 790ms cold and 432ms warm. Those local Chromium-emulation results
are retained as historical evidence, not native editor performance claims or a
requirement to rerun startup, worker-failure or 26-profile editor checks.

Current native editors live in `frontend_src/native-card-editor.js` with shared
field/list forms in `card-form-tools.js` and the floor-plan placement editor.
Their module is lazy-loaded from the named card adapters. HA owns its native
editor presentation and save workflow; no active Marao Monaco asset is required.

A short manual watch list for changed forms is entity/name editing, preservation
of YAML-only options and native layout/visibility, floor-plan marker/strip editing,
and inline energy contributor expansion/reordering. Record what was actually
inspected; neither unit success nor this watch list claims phone visual coverage.

The safe-area regression uses `node tests/test-ha-dashboard-accessibility.js
--safe-area` on the disposable instance. It clears Marao emulation overrides
and supplies app and browser insets independently, including explicit zero and
an already-protected host. Its private geometry/capture report checks actual
content and navbar bounds rather than only checking variable values. It also
checks short, fixed and full-height sheets, the same open sheet through rotation,
current column width, background scrolling, focus restoration, last-card
reachability and native settings/editor route exit and reentry.

Before the safe-area runtime change, the 2026-10-10 app-only regression failed:
the active container resolved a 47px HA inset but had zero top padding and its
first card began at 19px. Its navbar ended at 840px in an 844px viewport, ignoring
the app's 34px bottom inset. The safe 50dvh slider sheet retained a 48px close
control. The source is current-version Chromium emulation, not a physical app.
The recorded affected set at that time was the generated dashboard and Cases: 495 nested
gallery card objects, all 34 required Marao templates, generic Marao cards,
camera-events, energy-period and state-timeline cards, native grids/entities/
stacks, 51 popup hosts and their contents, and the generated navbar. Derive current
scope from current fixtures rather than treating these dated counts as a contract.
The Cases gallery includes separate delayed, rejected, unconfirmed and corrected
single/range controls, a shared delayed mode sheet, and a delayed thermostat in
Living Room. Run `node tests/test-ha-dashboard-e2e.js --climate-only` for the
focused interaction check. Fixture reset cancels outstanding confirmation tasks
before restoring the baseline, so cleanup cannot be overwritten by a late report.
Run `npm run test:ha:climate-layout` to inspect every climate, number and Wallbox
current control on the current native pages and in their popups across the mobile
profiles and both themes only when that integration coverage is explicitly requested.
Use `-- --scenario android-text-200` for a focused
enlarged-text check. Values must stay inside the rounded controls and numeric
buttons must retain their 48-pixel touch targets.

### Navigation startup boundary

The stable `MaraoFrontend.js` resource selects one coherent versioned graph.
Critical navigation/bootstrap code reads the ordinary dashboard's single `marao`
settings block and mounts one HA-root-owned navbar before optional card content.
Direct links, empty/new views and Panel floor plans do not require a navbar card
or per-view reference. The surface survives view replacement, responds to settings
and edit-mode updates, and releases owned layout/theme/listener state on exit or
opt-out. Native editing restores HA's toolbar. An explicit empty navigation list
is preserved, with native administrative editing reachable when Marao shortcuts
are also hidden.

Use the focused navbar startup fixture to hold the optional runtime unresolved
and verify actual navigation/refresh interaction. Android desktop touch emulation
does not prove Companion native-menu behavior; record physical host versions only
when inspected. The horizontal hold surface contains no link URL target.
