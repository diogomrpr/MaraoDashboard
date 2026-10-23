---
title: Focused testing
layout: page
parent: Development
nav_order: 3
---

# Focused testing

Codex uses the project `marao-testing` skill to apply this policy. See the
[workflow and skills guide](https://github.com/diogomrpr/MaraoDashboard/blob/main/openspec/README.md#codex-workflow-and-project-skills)
for task routing; the selector and evidence validator remain the source of check
selection, not a duplicate list inside the skill.

The synthetic slow-camera/HLS stress validation is retired at the user's request.
Do not run it or reintroduce it into verification plans; retain historical reports.

## Default: deliver, then hand off visual testing

The repository contract's **Verification policy: minimal by default** controls
routine AI work. The user handles visual and real-device testing. Use the smallest
check that demonstrates the requested behavior, then stop and provide a short
manual watch list. A stream playing satisfies ordinary playback acceptance.
Do not automatically run all mapped checks, add browser tooling/fixtures, or
traverse theme/device/text/zoom combinations. Broaden only for an explicit request,
a reported/observed defect, or a concrete security/data/migration/recovery risk.
Documentation/instruction-only changes need diff and changed-link review only.

Mandatory installation is separate from optional visual verification: before a
software task is called done, install its final applicable changes on disposable
HA `192.168.10.229`. Batch edits and sync once at handoff using the
[fastest compatible path](local-development.md#install-before-handing-off).
Browser overrides are not installation. Instruction/documentation-only edits need
no deployment. A failed sync means not ready for user testing.

The tiers and coverage commands below describe deliberately selected automated
verification and publication evidence. They do not make that coverage mandatory
for routine implementation or override the user's manual-testing handoff.

## Development loop

Choose verification from the actual task diff, not from every dirty file or the
word "frontend". Capture a private starting snapshot before editing:

```sh
npm run test:affected -- --snapshot /private/tmp/marao-task.json
```

The snapshot includes current tracked and nonignored untracked file identities,
including already dirty content. `--since` selects subsequent additions, edits and
deletions. Review changes made concurrently: file identities cannot attribute
individual hunks. A reviewed `--file <path>` subset can exclude other work and
reports those exclusions. Review shared-file hunks and declare `--component <id>`;
shared consumers remain in scope. Unknown mappings require resolution, never a
full-suite fallback. Do not recreate the snapshot after editing to erase scope.

| Tier | Use when | Required development evidence |
| --- | --- | --- |
| `visual` | Presentation only: labels, colors, spacing or placement; no changed behavior | Code review and a manual watch list; agent visual inspection optional. No automatic suites or mobile matrix. |
| `behavior` | Events, state or ordinary interaction behavior changes | Smallest existing targeted check or assertion demonstrating the result; hand off further visual checks. |
| `focused` | Security, saved data, migration, ownership or installation changes; deliberate broader affected verification | Existing affected unit/static/browser coverage, including relevant dispatch, cancellation, preservation and recovery assertions. |

```sh
npm run test:affected -- --since /private/tmp/marao-task.json --tier visual --component slider-headers --plan
npm run ha:preview -- --component slider-headers --watch --scenario iphone-normal --theme light
```

When deliberately running a tier, preview its selection, then run it without
`--plan`. A visual command may report that inspection is still required;
it cannot observe or certify the browser result. The runner cannot infer whether
JavaScript is cosmetic: the contributor must review the diff. `behavior` does not
prove live dispatch from offline checks; add the narrow existing assertion when
the changed behavior requires it. Never use the cheaper tiers for security or
data-preservation changes. Documentation-only work needs relevant link/spec checks,
not HA deployment.

The persistent preview synchronizes current frontend files to the compatible
disposable installation and refreshes the real HA page with native controls/icons. It opens
the smallest representative existing view containing the selected visible runtime
families, falling back to Cases; the dashboard editor uses its fixed route.
Generic shared scopes require a representative
`--family <template IDs>`; inspect editor and runtime scopes separately. Native
card-editor changes use the existing focused native-editor workflow.
Frontend sync reloads Marao when files changed. It does not reset helpers, explicitly
generate dashboards or restart HA; normal entry lifecycle may update generated
output/history. Missing or incompatible setup requires explicit `npm run ha:sync`.
Keep the test instance on the latest applicable project changes before completion.
Successful synced assets remain installed after inspection, a preview error or
closing the browser. Do not revert a successful package for cleanup unless the
project itself is reverted; safe helper restoration and failed-operation recovery
still apply. Watch updates only while running. Preview remains development evidence reused at release; it does not claim unit-test success.
See [local development](local-development.md#visual-browser-inspection).

If agent inspection is selected, inspect the changed surface once using current
assets. Include representative shared consumers and only layouts/themes relevant
to the edit; do not replay every equivalent card, typography mode or state.
Screenshots are optional. Stop when the requested result is observed, tier-required
checks pass, relevant diagnostics are clear and cleanup is complete. Broaden or
repeat only for changed inputs, a failure or a concrete unresolved concern.

Existing commands without `--tier` retain `focused` behavior for compatibility.
Publication selects unit tests for the entire candidate since the released baseline.
Task snapshots cannot narrow that unit scope. Development integration results are
reused without a fresh release campaign; broader tests require an explicit request.

## Releases: unit tests only

`npm run verify:publish -- --base <released-ref>` and `npm run verify:release`
run affected Node/Python unit tests only, serially, across the release candidate.
`test:affected -- --unit` selects the same check types for an explicit range.
Automatic Tests CI and version hooks also use `--unit`. Unlike `--offline`, this
excludes local browser fixtures and build scripts as well as HA integration tests.
Applicable exact-commit hassfest/HACS metadata validation remains in place.

Integration, camera playback, geometry, mobile and preserved-install verification
belongs to development. Reuse those results; release preparation does not demand
new screenshots, installation receipts or exact-release-commit integration reports.
Run additional changed-feature checks only when the user explicitly requests them:
`test:affected -- --base <released-ref> --component <ids>`. The comprehensive
`test:full` command and parallel execution also require explicit requests. Known
failures remain failures; never claim skipped integration checks passed.

## Explicitly selected integration coverage

Reviewed theme-independent geometry and behavior run in light; representative
appearance/state/contrast checks remain in both themes. Theme-sensitive and
unreviewed contracts retain additional combinations. Distinct text versus zoom,
native gestures, safety, preservation and cold loads remain covered. Compatible
gallery cases share visits; editor alignment aliases narrow-320 rendering/drag.

`--component control-grid` selects shared sizing, generated/native/group hosts,
preservation, alignment and safe slider/access checks. Generated container types
change, so development may check preserved-install behavior with
`npm run test:ha:upgrade -- --scope control-grid`.

```sh
npm run test:affected -- --component control-grid,verification --plan
npm run test:affected -- --component slider-headers,access-label,editor-rendering,battery-groups
npm run test:affected -- --component slider-headers,access-label,editor-rendering,battery-groups --reuse /absolute/private/report.json
npm run verify:publish -- --base <released-ref> --component control-grid --reuse /absolute/private/report.json
```

Reuse is explicit and affected-only. `--report` retains whole-proof validation
and conflicts with `--reuse`; full mode rejects reuse. Version-4 evidence records
independently required logical cases, physical route visits, capture counts,
execution/validation timings and original provenance, with atomic checkpoints.
Successful checks from a failed batch are eligible only after verified cleanup.
Failed, absent, stale or changed-input/coverage/environment checks rerun with a
recorded reason. Unsafe paths, malformed/unsupported evidence, missing artifacts
and unverified cleanup fail preflight. Reuse chains cannot refresh original age.
Shared visit duration is counted once. Historical reports remain immutable.

Every focused live batch prepares and validates the current installation; an old receipt
cannot establish current package/source/fixture identities. Cleanup, final visual
inspection, conditional upgrades, exact-commit CI and reconnect-exception expiry
are never cached. Version-3 reports retain their original whole-proof validator
and cannot supply per-check reuse.

Capture policy is `failure` by default, `review` for representative successes,
and explicitly `all` for exhaustive captures. Pixel comparisons remain assertions
even without saved images. Readiness waits for native mounts, fonts and frames,
restores touch emulation and can inspect newly mounted subtrees without repeating
whole-gallery scans for equivalent samples.

Explicit integration checks use the selected contracts and shared consumers.
Version hooks, automatic CI and publication use unit tests only; a release request
does not request integration, full-suite or parallel execution.
Every release still requires installing its final candidate, including version
metadata, on disposable `192.168.10.229` before publication. Preserve test settings
and helper state, reuse an exact matching installation, and confirm it through
normal asset/readiness checks. A failed installation blocks publication; it does
not trigger an integration-test campaign.

```sh
npm run test:affected -- --plan
npm run test:affected
```

For deliberate commit-range verification, record the starting commit and use
`--base <starting-commit>` to include completed commits as well as staged,
unstaged, deleted and untracked files. Without a base, ordinary checks compare
the working tree to HEAD. CI supplies its event range explicitly. Publication
compares the whole candidate to the previous release, even on a clean checkout.
It resolves published stable releases through the existing GitHub CLI, excluding
unpublished tags; supply `--base <verified-released-ref>` when that metadata is
unavailable. CI uses its read-only repository token for this lookup.

For shared files, review the diff and declare the component being changed:

```sh
npm run test:affected -- --base <ref> --component slider --plan
npm run test:affected -- --base <ref> --component slider
```

The selector expands slider consumers to light, fan and cover. Other components
and available options appear in `npm run test:affected -- --help`. Unknown paths
and ambiguous shared changes fail with a scope message. They never trigger a
full-suite fallback. Add the missing mapping rather than skipping the file.
Documentation-only changes need no application deployment or browser tests.

For shared light/fan/cover/access-opener title and icon layout, use
`--component slider-headers`. It selects the header geometry profiles, optional
slider variants and relevant value-slider/access interactions. Run a single
geometry profile with `npm run test:ha:alignment -- --slider-headers --scenario iphone-normal`.

Use `--component scroll` for native card-surface lifecycle changes. Its WebKit
and Chromium regressions update cards after scrolling the realistic Maintenance
sheet, its 32-card Cases counterpart and the dashboard page. They cover both
themes with selected phone, narrow, landscape and enlarged-text layouts.
Playwright WebKit is additional engine coverage, not physical iPhone proof.

In focused execution, unit/static checks run before browser work. A compatible browser batch prepares
the safe disposable installation once. Each job receives a private artifact
directory and validates the prepared assets, saved source and fixture ownership.
An ordinary batch receipt is distinct from real preserved-install upgrade proof.
Existing individual test commands remain available for focused debugging.

Focused/publication browser checks sample materially distinct affected families and options. Layout
changes select relevant normal, narrow, enlarged-text/zoom and landscape cases.
Actions still assert dispatch and cancellation; migrations still assert data
preservation and recovery. Visibility alone cannot replace those checks. Current
targeted inspection can satisfy the development visual gate without a duplicate
final visit. Save failure screenshots from automated checks; exhaustive success
screenshots require an explicit diagnostic request.

## Explicit parallel and comprehensive runs

Only run these when requested:

```sh
npm run test:affected -- --parallel
npm run test:full -- --parallel
```

Preview all registered checks without executing them with
`npm run test:full -- --plan`. Use `--offline` for CI/local offline checks only;
that result does not claim live browser or upgrade coverage.

Parallel mode allows up to three independent jobs. Browser contexts, results and
artifacts stay isolated. Builds, deployment, dashboard saves, shared helper
mutations, restarts and historical restoration remain exclusive. They cannot run
alongside dependent readers. No extra dashboard or Home Assistant instance is
created. Default execution, including mobile profile traversal, remains serial.

## Scoped releases and evidence

Ordinary browser batches use built-in SSH file hashing without a remote Python
installation. Preserved-install scenarios additionally require Python 3 and the
generator's libraries in the configured SSH shell. Missing prerequisites fail
before expensive work; the runner does not install remote tools automatically.

`npm run verify:publish` and `npm run verify:release` require affected checks and
applicable exact-commit CI. Packaging/editor asset/HACS/hassfest checks apply to
their changed inputs. Selected failures and known relevant violations block
publication. The approved native reconnect exception remains narrowly scoped,
with raw evidence and an expiry check whenever it is applied.

UI-only releases do not automatically replay historical installations. Persistence,
migration, generated-output ownership or installation changes require matching
preserved-install checks for affected baselines, independent expected data,
recovery and verified cleanup. If a shared conversion affects all supported
formats, every affected baseline is included. The comprehensive mobile/feature
and historical suite remains an explicit option.

Private versioned reports record the baseline, candidate, selected checks and
consumers, excluded checks, input hashes, timings, failures and cleanup. Unchanged
successful checks can be reused; changed code, tests, selection, target, source or
fixtures invalidate the corresponding proof. Final publication binds validated
evidence to the clean candidate commit. Focused results never mean the full suite
passed. Existing historical reports remain immutable.

### Battery groups, strict access labels and editor rendering

Use `--component battery-groups --component access-label --component editor-rendering` for the reviewed batch. Include `--component slider-headers` while the preceding header batch remains uncommitted. The selection covers aggregate/palette/problem behavior, safe gallery fixtures, strict gesture cancellation/dispatch, actual label line geometry, editor preservation, native drag and JSON continuity. Geometry compares the text glyph union with the resting thumb (4 CSS pixel center tolerance) and checks every line is contained to its right; the former stacked rule is injected to prove rejection. Access widths include 239/241px and narrow wrapped English/Portuguese labels.

Editor timing uses `node tests/measure-ha-editor.js before --fixture /private/tmp/<fixture>.json --expected-editor-sha256 <installed-hash>` and the matching `after` invocation. It never deploys. Retain the same private format-2 fixture and bind each phase to the served asset hash. Three serial cold and warm samples at normal/4× CPU report native readiness, mounted controls, startup versus interaction long tasks and two-frame interaction delay (not measured paint). First expansion and reopen costs are reported separately. Saved source must remain byte-identical.

### Progressive editor startup

The administrator `marao_dashboard/config/get` command accepts `scope`:
`full` is the compatible default (including explicit-source previews), `initial`
returns the complete editable source with compact display data, `context` bundles
catalog/entities/areas/creation templates, and `history` returns versions only.
Other scope names and scoped explicit-source combinations are rejected. All scopes
retain administrator/recovery guards and never write source or History.

Use the reviewed editor-preload scope for changes to this boundary and JSON
preparation. Its native-control readiness excludes optional transport. Context is
shared across data-dependent consumers; no per-row reads or speculative History
reads are allowed. Resource prefetch is fetch-only and advisory. Module evaluation,
schema/model and hidden-editor construction use separate idle opportunities after
native readiness, with no timeout forcing work while busy. Explicit JSON promotes
the same attempt. Browsers without an idle callback keep CPU work on demand.

`tests/editor-preload-checks.js` exercises actual panel Save/History methods with
safe local management stubs; it cannot write the installed dashboard. Existing
protected Save/Discard/Restore checks retain their independent backups/cleanup.
Observe workers from navigation, and wait for native controls rather than network
silence. Keep failure/Retry checks and resource/console assertions intact.

`tests/measure-ha-editor.js` records per-scope response bytes/durations, browser
response-decoding cost, native readiness, preparation stages and early/prepared
JSON opening. Use the same private fixture, exact served asset hash and three
serial cold/warm samples at normal and 4x CPU before/after. Frame-boundary timings
are not paint measurements. Reports are private; preserve historical files and
verify unchanged saved source and History. Empty, raw-only and alternate landing
variants are independently named fixture cases rather than artificial sentinels.

The eager panel excludes the JSON preparation implementation as well as Monaco.
`MaraoDashboardJsonPreparation.js` is a separate versioned idle-loaded module.
Portuguese labels live in `MaraoDashboardEditorLabels.js`; Portuguese startup
loads this required locale resource alongside configuration before rendering
native Visual controls. English startup does not request it. Locale failures
keep the current draft and require explicit Retry; neither split changes the
approved eager JS/CSS budgets.

The `frontend-refresh` component covers the shared navbar's three-second hold,
client recovery deadlines, platform fallbacks and unchanged auth/settings/page.
`npm run test:ha:alignment -- --frontend-refresh` runs the selected loopback
Chromium touch/WebKit pointer and native-wrapper cases, including deliberately
stale service-worker HTML, actual document/resource replacement, both themes and
narrow/text/zoom/landscape feedback geometry. The same visits check icon alignment.
This path does not prepare or replace the disposable HA dashboard. Unit bridge
adapters and browser engines do not establish physical Companion-app behavior or
haptic strength; record actual app/device inspection separately when available.
Final HA inspection verifies installed asset identities and exact preservation on
`192.168.10.229`, with private backups and without resetting an existing demo layout.
