# Implementation progress

## Current repository decision and live HACS gate

The user selected **the existing `diogomrpr/MaraoDashboard` repository**, accepting
one-time guided manual migration on every instance. No new repository, tag or
prerelease was created. Earlier sections proposing a separate repository are
historical and superseded by this decision and the revised proposal/design/tasks.

On disposable `192.168.0.28`, supported HACS operations registered the existing
repository as Integration, removed that custom-repository registration, then
attempted to add the same repository as Dashboard (`plugin` internally). HACS
reached Plugin validation and reported:

`Repository structure for v0.21.1 is not compliant`.

This is a published-layout failure, not evidence of a permanent category lock.
The installed registration command accepts only repository/category; it strips
URL suffixes and chooses the latest stable tag before version/beta controls are
available. Thus a frontend-only prerelease does not unblock initial registration.
Complete real HACS installation/update proof remains pending an authorized
frontend-compatible stable release. No release flags, HACS implementation or
private HACS storage were changed to bypass this.

The native dashboard/source remains installed and unchanged by these probes.
Private evidence is `installed-baseline/same-repo-handoff.json` and
`same-repo-registration-probe.json` under ignored
`ha-test/.artifacts/native-frontend/`. These failures are retained, not relabeled
as installation/update success. Only the disposable instance was contacted.

The earlier unit publication attempt stopped on the preparation guard regression:
the new native branch was reached before the existing active-upgrade guard. The
guard now runs before either preparation branch; its five focused preservation
checks pass. This does not itself establish that the whole publication gate passed.

Implementation was explicitly authorized on 2026-10-25 for the complete
frontend-only transition, including the offline converter. The user requires
clarification when an unresolved decision prevents sufficient confidence.

Starting commit: `d9bda6d2e2cbce844da3e307194322b6662ca6e1`.
The task snapshot is `/private/tmp/marao-native-frontend-start.json`; private
scope/acceptance evidence is in `ha-test/.artifacts/native-frontend/scope.json`.
Unrelated duplicate files and concurrent navbar/card changes are preserved.

## Resumed implementation baseline

The user requested implementation again after the planning refresh. Resume HEAD
is `459084c120e2641b6fa1b72fc74a822cf43b310d` (v0.21.1); the fresh snapshot is
`/private/tmp/marao-native-resume-start.json`. The private scope inventory now
records all 35 catalog roles and their actual variable keys, retained consumers,
final-release/overtravel access semantics, live access-header/action presentation
and the shared navbar/page/all-sheet bottom-gap owner. Source format remains 2
and generated contract remains 3. Unrelated duplicate files are excluded.

The reviewed initial selector plan is `/private/tmp/marao-native-resume-plan.json`.
It deliberately selects the existing source/compiler foundation using reviewed
`--base HEAD --file` paths; those files predate the new snapshot and therefore
cannot be selected as new changes with `--since`. Catalog, editor, deployment and
other consumers remain in the overall scope and receive their own selected checks
as they change. This limited initial plan does not waive them. The 100 existing
targeted source/compiler/editor/canonical frontend checks passed on resume.

| Foundation gap found in review | Completion task |
| --- | --- |
| Adjacent step shape validation is incomplete; chain currently checks only object/marker shape | 2.1, 2.15 |
| Historical native adapter correctly joins at fixed format 2; retain this through future steps | 2.1, 2.9, 2.15 |
| Native JSON parsing can round unsafe integers; exact text and conversion need explicit preservation/refusal | 2.1 |
| Exported catalog/labels still duplicate Python tables; starter/templates remain Python-only | 2.2 |
| Compiler needs metadata/default/material-option parity beyond its small historical oracle | 2.3 |
| Protected generated YAML import is absent | 2.4 |
| Current Python differential test imports workspace code, not a frozen released package | 2.3, 8.1 |
| Strategy, persistence/builder adapters, converter UI, native asset graph and bridge are absent | 2.5, 2.8–2.14, groups 3–7 |

These are implementation work items, not new product decisions or reasons to
discard the useful foundations. No native cutover or new installation is claimed.

## Implemented foundations

- Shared browser-side 0→1→2 conversion, historical native-document adapter,
  format/envelope detection and exact-current-source native envelope creation.
- Browser-side page/card/navbar/popup compilation using the existing shared
  editor/YAML validators and the canonical 35-card catalog. Python's temporary
  consumers now read the same catalog/label data instead of duplicated tables.
- Proposal/design/spec reconciliation for the simple standalone converter and
  adjacent-format maintenance policy, plus a source-migration maintenance guide.
- Shared validation now tolerates absent unit metadata like the Python loader
  while rejecting known incompatible units, and permits the same optional
  header/glance bindings as Python.

## Selected evidence

- 100 serial targeted frontend checks passed across source conversion, compiler,
  editor model and canonical page-model tests.
- 13 serial Python differential cases passed: all 11 historical page-model
  fixture cases and the realistic safe dashboard in English and Portuguese.
  The existing independent expected source JSON and explicit independent native
  output assertions remain separate from this differential oracle.
- OpenSpec strict validation passed after artifact reconciliation.
- A read-only check of disposable `192.168.0.28` found HA 2026.10.0, an existing
  YAML Marao dashboard and loaded Marao/HACS integrations. No HA data was changed.

These results do not prove complete feature parity, installation, native save
behavior, preserved migration/recovery, the offline UI or a real HACS update.
This paragraph describes the earlier foundation evidence only. The resumed work
below adds strategy, persistence, builder, converter and packaging code. The automatic bridge was dropped by the user in favor of guided manual migration. The current changes are **not installed / not ready
for test**; no native cutover or real HACS update is claimed.

## Resumed implementation evidence — current limits

- The offline HTML artifact starts cold from a local file with HTTP(S) blocked.
  Its 320px Chromium check passed download, denied-clipboard fallback, sequential
  room questions, explicit empty answers, edited earlier answers, retained answers
  through language changes, stale-output refusal, path-only private-setting
  hints, unresolved old-file refusal and literal script-looking text. No HA
  login, runtime font/script/style request or automatic browser storage is used.
- Native session tests cover exact unchanged text/opaque envelope retention,
  single-flight saves, detected stale baselines, reported failures, admin/version
  refusal, native strategy `config-changed`, explicit fresh creation, and refusal
  to replace empty/corrupt/future sources with a starter. Panel checks cover the
  injected boundary and retention of drafts on native change notifications.
- A **read-only browser probe** against disposable HA 2026.10.0 passed the actual
  strategy protocol, registry/resource/config reads, Visual builder, stock Monaco,
  JSON worker loading and a complete local strategy-settings `config-changed`
  round-trip with exact saved formatting. It used browser-only asset overrides;
  it did not install assets or perform native server saves. Durable native
  round-trip/restart and real HACS cache/update proofs remain pending.
- The installed HACS downloader was read without changing it. Dashboard download
  selection skips nested folders once it finds top-level `dist/` files. Staging
  therefore emits **flat content-identified assets** in `dist/`, plus root HACS
  metadata/license. A graph-local URL resolver is injected by esbuild; it resolves
  modules, CSS, fonts and workers without changing the global URL constructor.
  Package checks verify reproducible identities, complete flat output, stale
  staging cleanup and external-URL preservation. Do not attach a matching single
  JS release asset or rely on plugin ZIP releases. No distribution is published.
- Bundled Montserrat/OFL and scoped existing light/dark tokens replace runtime
  font-CDN/theme-install requirements. The theme helper restores original inline
  values and preserves changes made by another owner. Complete native shell and
  appearance acceptance remains pending the actual installation.
- Known old owned asset references are retained in source and resolved against
  the installed graph only at compilation. Unknown old files and retired service
  calls block conversion. Private-setting hints expose paths, never values; they
  do not establish that arbitrary content is safe. Import UI requires visibility
  review before replacing the draft. Per-install cutover review is still pending.
- Configuration History/Restore controls/calls are removed from the target
  frontend. Sensor history code remains; its focused existing checks passed.
  Legacy Python/history files are still installed and have not been retired.
- Basic Netatmo metadata now uses native registry/media browsing. Two isolated
  metadata checks passed exact camera matching, safe decimal epochs, deduplication,
  ordering, limit and absent previews/types. The old mixed metadata/HLS test was
  replaced with metadata-only assertions. No automated camera playback/transport
  test ran. Stable native provider-response verification remains separate.
- The user selected guided manual migration. Unwired Python checkpoint/preflight
  foundations and their tests were deleted; legacy Python changes were restored
  to the starting baseline. Their historical unit passes do not establish manual
  migration or recovery evidence. No automatic bridge is shipped.
- Editor lifecycle checks now cover user/root isolation, same-user draft retention,
  changed external strategy settings, full-width native editor views and unload
  protection. The nested strategy editor labels Apply separately from HA's outer
  Save. Ten selected strategy/session/package checks passed after these changes.
- Eight existing preparation checks (including two new native cases) passed:
  complete package sync and repeat no-op, source/fixture preservation, no native
  save/restart/reload, and stale serving retaining candidate plus recovery copies.
  These are isolated filesystem tests, not a live native installation receipt.
- Latest narrow passes: 23 Python compiler/template cases; 33 source/compiler/
  converter/session/dependency cases before the additional source-refusal case;
  41 editor-model/session cases including that case; 35 source/sensor-history
  cases; 71 panel/session cases before that additional case; 31 refresh cases;
  two flat-package/theme cases; two Netatmo metadata cases;
  static YAML validation (59 files). These overlapping counts are not summed.

The reviewed refreshed selector plan is
`/private/tmp/marao-native-current-plan.txt`. It includes changed shared consumers
(startup, refresh, editor, generator, camera metadata, labels and packaging) rather
than claiming a documentation-only scope. The plan is a scope inventory, not a
record that every listed suite ran. Unrelated duplicate files remain untouched;
manual-only camera transport remains excluded. Guided native creation/import and rollback,
immutable modern released baselines, preserved installation/rollback, Python
retirement and the actual next HACS Dashboard update remain required.

## Accepted native save semantics and upstream report

On 2026-10-25 the user accepted the same save behavior as built-in HA dashboards
and requested an upstream duplicate search/report. This no longer blocks the
transition. HA's native implementation has the following limits:

- [HA 2026.10.0 dashboard save](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/lovelace/dashboard.py#L135-L147)
  replaces the in-memory configuration and emits its update event before
  awaiting storage.
- [HA 2026.10.0 storage error handling](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/helpers/storage.py#L522-L541)
  logs serialization/write failures without necessarily returning them to the
  save caller. A native configuration read can return that in-memory value;
  it cannot independently verify the persisted disk bytes.
- The same dashboard-save ordering is present in the proposal's reference
  [HA 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/lovelace/dashboard.py#L135-L147).

The design, lifecycle/builder deltas and save task now explicitly follow native
semantics, retaining drafts on reported errors and providing manual JSON export.
Acknowledgment, events and native readback are not disk-durability proof. Exact
migration backups and recovery remain required; no permanent backend or HA
storage patch is introduced.

Searched open/closed Core and Frontend issues and related Core PRs for dashboard
save/storage failures, disk-full/read-only errors and configuration loss. The
related Frontend #13499 and Core #61606 describe different behavior; no matching
report was found. Opened [Core #188548](https://github.com/home-assistant/core/issues/188548)
with source links and a passing isolated fault-injection reproduction. The test
uses installed HA 2026.5.2 with HA's mocked-storage fixtures; the four relevant
method bodies are AST-identical to stable 2026.10.4, and the current dev code
retains the same error handling. It proves normal save return/update and
in-memory readback of the new value while reopening loads the previous stored
value. It is not a complete browser/WebSocket or real disk-failure test. No
storage failure was induced on the disposable instance.


## Guided manual migration decision and latest evidence

The user selected guided manual migration instead of the automatic in-place
bridge. Proposal, design, lifecycle/generation/verification deltas and tasks now
reflect exact per-instance backup, offline conversion, supported legacy removal,
native HA creation/import at the same address and guided matching rollback. Strict
OpenSpec validation passed. No new bridge/checkpoint/fencing code is retained.

The selected local batch passed 157 tests before adding the modern released-case
assertion and two additional missing-entity questions. After those changes, 78
selected source/compiler/converter/session/strategy/refresh/navbar tests passed;
these overlapping counts are not summed. Fifteen current-Python compiler/template
cases also passed. The final offline browser check passed cold local startup,
zero networking, copy/download, optional address clearing, required membership/
energy/native-binding answers, language/answer retention, corrected/repeated input
and prototype-safe question keys. Error details are optional and paths-only for
recognized failures. A final read-only actual HA 2026.10.0 probe passed strategy,
Visual/Monaco/worker and local settings emission; it made no server save.

Modern immutable data now includes verified public v0.17.0 and v0.21.1 release/tag/
peeled-commit identities, exact safe source JSON, integration-tree hashes, offline
released-generator output and fixed independent source/native targets. Hash and
whole-document comparisons passed. This does not claim live historical-package
installation or independent candidate output as a golden expectation.

Read-only inspection confirmed the disposable instance still runs released
v0.21.1 in YAML mode. A private archive on that instance captures the exact package,
source/generated/custom/history/theme/configuration and existing affected stores
(eight present roots). Before/after file hashes and permissions matched. The
private inventory and backup metadata are ignored under
`ha-test/.artifacts/native-frontend/installed-baseline/`. No active dashboard,
registration, package, helper or core state was changed; private backup creation
is not native installation. The SSH add-on has no Python, so archive tools were
used instead of the legacy Python replay helper.

A user question requests separate authorization to create public
`diogomrpr/MaraoFrontend` and publish two test prereleases for actual HACS proof.
Until that answer, no repository, tag or release is created. Native migration,
actual persisted/restart/rollback behavior, complete retained runtime and real
Dashboard-to-Dashboard update proof remain pending. Current changes remain
**not installed / not ready for test**.
