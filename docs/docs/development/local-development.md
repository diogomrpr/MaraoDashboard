---
title: Local development
layout: page
parent: Development
nav_order: 2
---

# Local development

Development and browser tests use a disposable Home Assistant instance. Full
preparation installs the current working tree, creates safe entities and generates
one dashboard at `/marao-dashboard`. Routine frontend preview syncs current frontend
files to an already compatible installation and leaves successful changes installed.
Agents working on this
repository may connect only to `192.168.10.229`; the same tools let developers
configure their own disposable instances. Never use a household or production
instance, or exercise a real security or safety device.

## Install before handing off

A completed software task includes installing all applicable current changes on
the disposable test instance `192.168.10.229`. This is required even when the user
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
only for initial setup or backend/fixture/generated-configuration changes needing
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
Deployment staging uses a fresh private system temporary folder and removes it
on success or failure. It checks the staged package against the working tree;
synchronized workspace caches are not deployment inputs. The ordinary HACS build
still writes its inspectable package under `ha-test/.cache/dist/`.

Focused live test batches use compatible preparation once and verify current
assets. The lightweight `ha:preview` synchronizes only frontend files and reloads
Marao when changed before refreshing the real HA page. It does not reset helpers,
explicitly generate dashboards or restart HA. Normal entry reload may update
generated output/history. Missing or incompatible
setup fails with an instruction to prepare explicitly; preview never silently
falls back to full preparation. Fixtures and generated test configuration belong
to the canonical files in the repo, so use those for lasting fixture changes.

| Changed files | Preparation action |
| --- | --- |
| Frontend modules, styles, fonts, images, or theme | Reload Marao; refresh the browser |
| Dashboard configuration or Cases cards | Regenerate and refresh the dashboard |
| Integration/fixture Python, manifests, backend translations, or helper definitions | Restart Home Assistant and wait for readiness |
| Initial installation or dashboard registration | Restart when required |
| Only tests or documentation | Verify current deployment; no restart |

Frontend URLs include a fingerprint of the actual frontend files. Reloading the
integration recalculates it, so the browser requests the new modules and workers.
Routine sync refreshes the bundled Marao theme copy and reloads it when changed;
local edits to `themes/MaraoDashboard` can be replaced. Unrelated themes remain
intact. Python changes require a restart because reloading an integration does not reliably
re-import every Python module.

For initial setup or backend/fixture changes, run `npm run ha:sync`, then open
`http://YOUR-TEST-HOST:8123/marao-dashboard/overview` or
`/marao-dashboard/card-test` using your configured base URL. For routine frontend
work, use the persistent preview below. It verifies backend compatibility, builds
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
Inspect editor and runtime-card scopes separately. Native card-editor changes use
the existing focused native-editor workflow; a runtime preview cannot validate them.
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

Visual work needs current inspection without an automatic suite. Behavior work
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
npm run test:ha:e2e -- --disconnect-only
npm run ha:preview -- --component slider-headers --scenario iphone-normal --theme light
```

The alignment check opens the Apple TV and generic media popups and verifies that
icon-only controls are centered within 0.5 CSS pixels. It also checks the loaded resource
fingerprint, narrow layouts, action/state-label contrast in both themes, and
essential readings at 200% text. Select it for affected focused/publication
verification; a presentation-only development edit may use targeted inspection.
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

After `ha:sync`, run `node tests/test-ha-editor.js --header --delete --startup --fold --weather` for the
focused editor check, adding `--matrix` for the supported mobile/theme/text
profiles. It asserts actual scrolling before pinned-header geometry, uses safe
local drafts, checks explicit Save/reload and restores the original disposable
source bytes. Backup, diagnostics and screenshots stay in ignored
`tests/.artifacts/editor/`. History generated by those explicit saves stays
immutable. Editor UI changes do not affect runtime cards, and no gallery reseed
runs inside this check. Add `--surfaces` to capture General/Overview, pages, menus, settled
native dialogs and loading/retry feedback. The folding implementation also
corrected the safe weather fixture to the native `weather.*` domain; `--weather`
inspects its affected Weather/Header Cases and realistic Overview example.
The editor's shared form boundary constrains native entity-picker
minimum widths and retains 48px clear controls without replacing HA selectors.

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
and version metadata on disposable `192.168.10.229`, preserving test configuration
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

1. Trace its builder field, Python validation/generation, runtime card, shared
   control, theme, and translations. Fix reusable behavior in its shared source.
2. Identify affected shared consumers and capture a private task snapshot,
   preserving pre-existing dirty work and reviewing concurrent hunk ownership.
3. Edit the source files described in the
   [architecture guide]({{ '/docs/development/index.html' | relative_url }}).
   Run `npm run build:editor` after editing the visual editor source.
4. When supported behavior changes, add stable state examples, safe helper definitions, popup/action variants,
   and coverage entries in `ha-test/`. Place a representative example on a
   realistic generated page as well as Cases. See
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
  listed by Marao. Keep unrelated resources and Google Fonts. Reload Marao or
  restart after a manual YAML edit; a Lovelace resource reload alone does not
  clear the Repair.
- **Missing state example or entity:** update its canonical fixture and coverage
  entry, then prepare again. Do not hand-edit the generated dashboard to mask it.

### Controlled climate fixtures

The disposable `marao_test_climate` platform supports `ack_delay` and
`confirmation_delay` (independent finite seconds from 0 to 60), plus `behavior`:
`normal`, `reject`, `unconfirmed` or `corrected`. Defaults retain immediate
acknowledgement and confirmation. Controls apply to mode and temperature requests;
`dual_target: true` supplies the existing range thermostat. Corrected targets
shift by half a degree while preserving the range gap; corrected modes report a
different mode. Each fixture owns its state and pending jobs, which cancel on
removal. These controls live only in `ha-test/`; use safe fixtures on
`192.168.10.229`, never household equipment.

### Editor startup measurements

Run `node tests/measure-ha-editor.js before` on the prepared disposable instance
for three cold and three warm iPhone-profile samples. Readiness requires the
populated, enabled General name input and entity rows. The ignored JSON report
records panel definition, shell, management response, Visual DOM, native-control
readiness, resource sizes/counts and long tasks without response bodies/tokens.
On 2026-10-10, before deferring Monaco, median cold readiness was 992ms
(shell-to-ready 415ms; management 258ms); warm readiness was 436ms
(shell-to-ready 303ms; management 236ms). These Chromium-emulation measurements
are local to the disposable instance, not physical-phone performance claims.

The Visual panel and deferred JSON editor have separate editable entries in
`frontend_src/MaraoDashboardPanel.js` and `frontend_src/json-editor.js`. The build
owns their generated JavaScript/CSS, local workers, hashed fonts and license.
Its import graph rejects eager Monaco and enforces 144 KiB JavaScript / 32 KiB
CSS budgets. JSON assets and workers carry the current panel fingerprint.
The JSON tab uses stock Monaco presentation: default monospace typography,
`vs`/`vs-dark` themes, native gutter folding, minimap, search, suggestions and
inline diagnostic widgets. Do not add custom gutter widgets, line-spacing view
zones, docked search or internal widget CSS. This is the user's explicit editor
exception to Marao typography/touch geometry; surrounding app controls retain
Marao's UI rules. `ariaContainerElement` keeps native announcements in the styled
shadow root, and `editContext: false` retains reliable textarea typing/paste.

Local catalog/schema assistance and URI/version/request-guarded diagnostics live
in `json-editor.js` and `json-language.js`; they add no editor presentation.
Shared `$defs` and disjoint template branches keep large documents manageable.
The installed Portuguese NLS pack has empty entries; `json-locale.js` supplies
exposed native-widget strings before initialization. Review its pinned message
indices when updating Monaco. Remote schema requests remain disabled.

`ha-test/json-editor-example.json` uses existing Studio/Cases entities with
unknown/raw/empty/nested values. Run `node tests/test-ha-editor.js --json-tools
--scenario=iphone-normal`; `--json-save` adds exact backed-up Save/reload and
restoration. The `json-editor` component selects focused mobile/text/zoom checks.
Initial configuration and JSON loading expose English/Portuguese status and an
explicit Retry action; ordinary HA updates do not repeatedly retry failures.
Visual stays usable during JSON loading, and delayed completion respects the
latest draft and requested tab. Leaving the panel disposes the editor; reopening
recreates it from the retained draft.

After the final editor build, matched measurements gave cold readiness 790ms
(shell-to-ready 352ms; management 247ms), and warm readiness 432ms
(shell-to-ready 315ms; management 247ms). Cold startup improved; the warm
samples varied and showed essentially unchanged performance. Run `node tests/measure-ha-editor.js after` for a
matched comparison after deployment. The JSON module pays its own first-open
cost, separately from Visual readiness.

The read-only larger-document sample repeats safe rooms five times (102 entity
rows): median synchronous Visual rendering was 15ms cold / 13ms warm and complete native-form
readiness was 180ms cold / 145ms warm. The management response remains the main
part of the shell-to-ready gap; these samples did not establish another Visual
rendering bottleneck that warrants changing the native controls or backend API.
First JSON activation measured 452ms cold / 115ms warm; a repeated switch took
10ms cold / 9ms warm. The check asserts that no JSON asset loads before JSON is requested
and saved configuration is unchanged.

The focused editor check injects one failed module, stylesheet and worker request
in separate browser contexts, verifies explicit Retry and keeps the deliberately
failed-resource evidence private. Normal interactions must have zero browser
warnings/errors/failed resources. Monaco's JSON worker bridge registers features
before standalone services initialize; its worker error event makes initial
failure recoverable. The build applies one checked clipboard guard to the pinned
Monaco implementation: on HTTP the unavailable Clipboard API cannot install its
iPhone workaround, so existing native copy/paste fallbacks remain usable.
Folding uses public editor actions and JSON worker ranges, with touch controls
instead of small hover gutter targets. `--weather` inspects only Weather/Header
examples on Overview and Cases after the native weather fixture correction.

The final 26-profile editor check covers both themes, all mobile text/zoom
profiles, saved-source restoration, native dialogs and deferred-asset retries.
Native HA/Web Awesome typography inherits Marao's scalable tokens; exported
input parts and selected-picker row tokens retain space for enlarged labels,
including label line heights that scale with their text.
Use `--scenario=iphone-bold-text-200` for a focused two-theme editor iteration.

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
The affected set is the full current generated dashboard and Cases: 495 nested
gallery card objects, all 34 required Marao templates, generic Marao cards,
camera-events, energy-period and state-timeline cards, native grids/entities/
stacks, 51 popup hosts and their contents, and the generated navbar. Keep this
inventory derived from `cases.json`/expanded fixtures rather than treating these
dated counts as a fixed contract.
The Cases gallery includes separate delayed, rejected, unconfirmed and corrected
single/range controls, a shared delayed mode sheet, and a delayed thermostat in
Living Room. Run `node tests/test-ha-dashboard-e2e.js --climate-only` for the
focused interaction check. Fixture reset cancels outstanding confirmation tasks
before restoring the baseline, so cleanup cannot be overwritten by a late report.
Run `npm run test:ha:climate-layout` to inspect every climate, number and Wallbox
current control on the generated pages and in their popups across the mobile
profiles and both themes. Use `-- --scenario android-text-200` for a focused
enlarged-text check. Values must stay inside the rounded controls and numeric
buttons must retain their 48-pixel touch targets.

### Navigation startup boundary

`MaraoDashboard.js` retains its public versioned entry URL. It registers
`MaraoNavigation.js` and the lean native navbar before requesting optional
`MaraoRuntime.js` content. Navbar state comes from existing view configuration;
no server card compilation, entity metadata or persisted route cache is required.
The stable HA-root surface survives view replacement and is released on exit or
explicit removal. Moved shared helpers retain their exports and popup guards.

Use the focused navbar startup fixture to hold the optional runtime unresolved
and verify actual navigation/refresh interaction. Android desktop touch emulation
does not prove Companion native-menu behavior; record physical host versions only
when inspected. The horizontal hold surface contains no link URL target.
