# Design

## Context

See `proposal.md` for motivation, evidence and affected-card scope. The baseline lifecycle already preserves meaningful saved configuration, owns specific HA registrations/resources/themes, and offers 20-version exact JSON/generated-directory history. It does not provide schema-driven upgrade orchestration.

Relevant path: HACS replaces the integration → `async_setup_entry` in `__init__.py` registers assets/editor, synchronizes themes and performs specialized repairs → `generator.py` loads/normalizes/resolves/plans/writes JSON and generated YAML → `history.py` snapshots/restores → administrator management response → `editor.py` catalog and `frontend_src/editor-model.js` schema/model → shared runtime. Generation service, Save & Generate, alternate config paths, previews/dry runs and history restore currently take different paths. `write_dashboard_config` is not atomic; existing generation is atomic per file and rollback requires a valid baseline.

The new upgrade test must not call ordinary preparation after upgrading: `ha-test/prepare.js` copies canonical fixture JSON before generation, and e2e/accessibility/alignment/slider runners all call it. Reusing these checks requires a guarded path that verifies the already-upgraded installation rather than resetting it. Python/Node regression tests and existing CI remain available for cheap checks.

## Goals / Non-Goals

**Goals:** make upgrades preserve user meaning automatically, retain recovery data before mutation, verify historical JSON and actual post-upgrade behavior, and make the distinction between development checks and release-only scenarios enforceable.

**Non-Goals:** add a general migration framework, a second editor schema engine, an HA update manager, third-party card dependencies, indefinite old-runtime compatibility, or a replacement release platform. Keep existing native controls and action-safety rules. Do not claim a finite test matrix guarantees arbitrary external/raw-card behavior.

## Decisions

### 1. Version the JSON format, not every package change

Use a top-level `config_version` with a Python current-format constant and a small ordered list of pure conversion functions in the existing configuration layer. Work on a deep copy, validate source version before applying defaults, and validate the converted result before output planning. Reject booleans, negative/fractional/string versions and unknown future versions. Preserve unknown fields unless an explicitly named old field is transformed; do not serialize only fields in the guided catalog.

Unversioned published configurations are format **0**. Newly created documents identify the current format explicitly. If this infrastructure lands before any structural migration, the current version remains 0; unversioned no-op source is not gratuitously rewritten merely to stamp a marker. Existing exact legacy-theme aliases become documented idempotent compatibility conversions under the shared preflight/backup path.

Reserve format **1** for `independent-room-entities`' explicit-membership change if that change has not landed. Both absent markers and explicit 0 then follow its 0→1 conversion; do not assign 1 to unchanged area-linked semantics. If that change lands first, reuse its marker/conversion. Each later structural/semantic change adds the next step and expected fixtures in its own change. Package `manifest.json.version` and HA `ConfigFlow.VERSION` remain separate; use HA entry migration only when its own persisted data changes.

A breaking generated-output/component contract can require regeneration without changing the JSON format. Record the generating package/schema revision in the existing generated manifest so setup can detect that upgrade work is needed and repeated reloads do not repeat it. Asset-only changes keep the existing content-fingerprinted runtime registration. Preserve public `hc_*` keys or explicitly migrate references instead of deleting old names and relying on users to fix JSON.

Alternatives rejected: checking only package version cannot identify skipped format steps; adding a schema number for every visual patch produces needless writes; frontend-only conversions cannot cover setup/services/history; a dependency-heavy migration framework is unnecessary for these small JSON documents.

### 2. Share preflight, distinguish read from commit

Centralize source-version detection/conversion and validation for all entry points:

| Entry point | Behavior |
| --- | --- |
| Existing-install setup | Inspect raw saved source first; automatically commit necessary conversion/regeneration after backup and preflight; preserve existing entry/identity and saved emptiness |
| First setup with no source | Create current-format starter through existing discovery; never use this path to recover invalid/newer saved JSON |
| `config/get` / Visual or JSON preview | Return compatible preview and localized migration information without persistence or replacing an unsaved draft |
| Save & Generate | Apply the same conversion to submitted source, preflight and preserve baseline, then commit canonical source/output |
| Generation service, including alternate paths | Same rules; persist conversion to the explicitly selected source only on successful writable generation |
| Dry run | Validate/conversion/output plan only; no backup, source, output or HA-patch writes |
| History restore | Preflight compatibility, then preserve the existing exact-source/exact-directory restore contract; next writable generation migrates the active copy |

Order setup so invalid or incompatible saved source is detected before destructive owned-data repair. Existing repairs must use the migrated selection and must not refill saved empty rooms. This automatic upgrade policy supersedes deferred-save conversion for installed files in the earlier room-membership proposal; its read-only preview and draft safeguards remain. Record this coordination during implementation rather than creating competing conversion helpers.

`editor.py` validation and `editor-model.js` schema/model must carry the version and unknown fields through both views. Keep one local document and existing explicit-save behavior. Any new migration/status/error copy belongs in existing English/Portuguese catalogs; rebuild committed editor assets only when source changes. Do not introduce a user migration toggle.

### 3. Recover writes without claiming a global filesystem transaction

Preflight the converted source, registry requirements, routes, owned manifest paths and protected custom regions before changing the active dashboard. Stage planned output and atomically replace JSON/files through existing file operations. Retain original JSON bytes and generated files, including protected custom content, through the existing history mechanism; extend its backup metadata only as needed for schema-independent legacy snapshots and owned patches.

Use a small durable in-progress checkpoint referencing that exact baseline and the planned source/output identity. Preserve any owned HA configuration/registration/resource/theme state that the operation may change. The baseline must be retained through completion or recovery rather than pruned mid-operation. Record completion only after output, selected source and required registrations agree; never advance the JSON version on a partial operation.

On conversion/preflight failure, leave active data untouched. On write/patch failure, restore the captured affected state, report failure, and keep recovery data if restoration fails. On startup after interruption, detect the checkpoint before accepting new saves and recover the baseline before retrying the migration. Serialize upgrade/save/restore for the same dashboard and verify original-file identities before applying or undoing shared configuration patches; a concurrent unrelated user edit must not be overwritten by a wholesale stale backup.

Current per-file atomicity remains distinct from a global transaction. The checkpoint/backup covers this bounded upgrade operation; it is not a new storage framework. Invalid saved JSON still needs an exact recovery copy if diagnostic handling touches it, not normalization into a plausible starter. Recovery errors must remain errors with a clear localized Repair/management message and documented private backup location.

Archived history stays immutable. Compatibility preflight must understand older source formats without rewriting snapshots. Exact restored output must remain usable for supported historical component contracts; where that cannot be guaranteed, restoration fails before replacing the valid current dashboard and explains that conversion is needed. A compatible restored source can be previewed, then its active copy converted through normal generation. Preserve baseline history identifier validation and snapshot-before-restore behavior.

### 4. Freeze historical inputs and independent expectations

Add sanitized fixtures and a coverage manifest under `ha-test/upgrade/`; keep test orchestration/checks in `tests/`. For each released baseline, record tag/commit, schema format, generated-contract revision and fixture provenance. Local tags currently available are v0.2.0, v0.3.0, v0.3.1, v0.5.0 and v0.5.1. Verify released provenance while building the manifest; cover all distinct historical formats and preserve a no-op compatibility row for releases sharing one format. Do not silently support only the last release or delete old fixtures when regenerating Cases.

Fixtures contain old JSON, old generated output/manifest/registration metadata, protected custom content and preservation sentinels. Include explicit empty/deleted selections, area-linked shapes, include/exclude/overrides, ordered entity/object/grouped forms, custom pages/navigation, advanced/unknown fields and representative options for every supported family. Expected migrated JSON is independently authored from documented transformations, never computed by the candidate migrator or current starter builder. Compare full semantic documents with explicit allowed conversion differences; verify JSON version, persisted bytes on no-op paths, output ownership and custom-region preservation separately.

At least the latest released self-contained package is installed and proven healthy before replacement with the candidate, retaining its config entry and source/output. For older formats whose old frontend would require prohibited third-party bundles or incompatible HA, replay provenance-backed installed-state fixtures and test candidate startup directly; do not install forbidden old dependencies. Report those rows as historical-data replay rather than pretending an old browser session ran. Required rows cannot be silently skipped because tags/assets are missing.

### 5. Run the scenario only for release preparation

Add an explicit `npm run test:ha:upgrade` entry point and `npm run verify:release`. The latter runs the upgrade scenario and the existing `verify:publish`, then verifies candidate identity/complete results before success. Keep `verify:publish`, `npm test`, default pytest/Node discovery, ordinary push/PR CI and the existing `preversion` hook free of the full historical/live upgrade scenario. Do not silently turn a normal version command into this expensive test; the documented release flow must invoke `verify:release` for the final candidate before a versioned tag/GitHub/HACS release. Focused migration and harness unit tests remain normal development checks.

Before remote mutation, reuse `ha-test/client.js`'s target/disposable/SSH/admin checks and backup the disposable pre-test state. Install only test-owned fixtures/providers and one dashboard at `/marao-dashboard`; historical slugs/identity variations can be covered in filesystem tests without additional active dashboard roots. Preserve unrelated HA configuration and reject real provider replacement. The scenario must not actuate real devices or update HA itself.

For each required row: provision old installed state once → capture hashes and entry identity → replace only Marao package assets → restart/reload through the real integration path → inspect persisted JSON before any manual generation or fixture copy → verify expected conversion/preservation → run existing functional checks against the preserved installation → test explicit regeneration/restart/idempotence/history paths. Inject failures through bounded test fixtures or isolated filesystem tests, not shipped test hooks. Capture failure/interruption recovery and invalid/future-version nonmutation evidence in the release run.

Add the smallest guarded “already prepared” path to existing runners. It must verify a scenario receipt with candidate fingerprint, expected saved source/output and fixture ownership, while all existing target/resource/current-asset assertions remain active. A naked skip-preparation flag or environment variable would allow false passes and is rejected. Ordinary runner defaults remain unchanged. Reuse check functions where practical; do not duplicate browser assertions in a second suite or add a framework.

Use `finally` cleanup and a retained recovery record to restore owned files, registrations, fixtures and test dashboard state on success/failure. If cleanup is incomplete, fail the gate and preserve private recovery details. Normal fresh preparation may run only after preservation/upgrade assertions finish and cleanup has been verified; it cannot be the evidence for upgrade success.

### 6. Make complete coverage auditable

The release scenario manifest maps every supported capability and materially distinct behavior to executed assertions. Check it against the editor catalog, runtime registrations, Cases inventory and baseline specs so new cards/features cannot quietly fall outside coverage. Equivalent value/color permutations need not form a Cartesian product.

| Feature group | Required upgraded-install evidence |
| --- | --- |
| Integration/admin | Existing entry retained; setup/unload/reload; services/dry-run/alternate-path handling; admin boundary regression; asset fingerprint/resources/theme synchronization and unrelated ownership preserved |
| Builder | Visual/JSON round-trip with version/unknown fields, supported options, ordering/duplicates/delete, explicit save/discard, invalid input and unsaved draft preservation; additions of candidate-only features through normal editing after preservation assertions |
| Generation/customization/history | All guided/custom pages, layouts and references; JSON→YAML options; empty/deleted sources; protected markers/owned cleanup; snapshots/exact compatible restore then migration; failure rollback |
| Cards and actions | Every catalog/runtime family and distinct options/states; summaries/partial availability, sliders/steppers, modes/media/remote/vacuum/scene/access actions; strict slide/hold cancellation, single dispatch and error handling using safe entities |
| Content | Both camera-event providers, previews/detail/back/refresh, media resource errors, graphs/toggle graphs, timelines/energy periods, empty/loading/failure and stale-request lifecycle |
| Layout/navigation | Realistic views plus Cases; popup focus/restore/inert background/internal scroll; navbar/shell behavior, both themes, 320px/iPhone/Android portrait/landscape and supported text/zoom profiles; alignment and native-density slider geometry |
| Upgrade resilience | Direct skipped-version conversion, current-format no-op, repeated setup/generation, read-only previews, bad/newer JSON, damaged markers, unavailable registry inputs, interrupted writes, backup recovery and cleanup |

Run shared behavior checks and the existing 26 mobile/theme layout combinations once on the actual preserved v0.5.1 upgrade. Check numbers and builder behavior on normal iPhone layouts in both themes; check sliders on normal iPhone and Android layouts because native touch behavior matters. The full layout matrix covers enlarged text, zoom, narrow width and landscape without replaying every behavior. Other distinct historical formats receive targeted saved-page, navigation, popup and browser/resource checks, while all seven baselines retain their complete preservation, recovery and provenance assertions. Features absent in v0.5.1 are added through normal editor operations only after old-data preservation is proven. Shared results are never relabeled as independently executed per-format results.

Success screenshots are limited to representative card families, realistic pages, popup layouts and editor surfaces at normal iPhone and difficult Android zoom layouts in both themes. Automation still visits the complete gallery and checks all mobile profiles; screenshots on failure remain unconditional. Manual review covers these representative captures instead of every equivalent card and scroll segment. Internal report version 2 distinguishes shared behavior, shared full-matrix layout, targeted per-format checks and four actual visual-review rows; old exhaustive reports are not accepted as current evidence. No dashboard JSON, generated contract or public API changes.

`verify:release` validates the complete private report, then supplies it to `verify:publish`. Publication rechecks candidate identity, coverage, cleanup and the restored prepared installation before reusing its successful browser evidence. Standalone publication without that evidence runs the shared browser checks and mobile matrix. Each push/tag/release still invokes the publication gate, but the unchanged verified release candidate does not repeat its browser matrix. Evidence drift or incomplete coverage still blocks publication.

Keep private evidence under existing ignored artifact/cache locations. A result identifies baseline rows, executed feature/profile IDs, expected assertions, candidate commit plus staged-package/source hash, and cleanup status. A changed candidate invalidates the result. Final publication needs a clean final commit; a development run may help diagnostics but is not exact-commit release evidence. CI Tests/hassfest/HACS still must pass for that commit, and the unresolved reconnect bug remains a normal blocker without a new waiver.

### 7. Put the responsibilities in project-owned instructions

During implementation, add a binding “Upgrade compatibility” section to root `AGENTS.md` with these responsibilities: inspect old saved JSON and generated contracts before editing; preserve explicit intent/unknown/raw/custom content; add/reuse versioned conversions instead of resetting; back up/preflight/recover writes; keep historical expected fixtures and feature coverage current; use focused migration tests during development; require the separate release-only upgrade scenario immediately before versioned publication. Retain existing push gates and final visual validation.

Align `openspec/config.yaml`, `openspec/README.md`, project context/coverage, dashboard-quality and local-development guides so future proposals and agents record upgrade impact. Do not hand-edit tool-owned `.agents/skills/`. Update `docs/docs/installation/update.md` with automatic versus no-op upgrades, private backups, readable compatibility errors, history restore, manual complete rollback and downgrade limits. Never suggest that downgrading package assets alone safely reverses a JSON migration; restore the matching saved baseline and owned assets together.

## Risks / Trade-offs

- Migration can alter membership/order indirectly through normalization or changed defaults → independent historical expected documents, sentinels and full generation/editor/runtime checks catch silent data loss.
- Partial multi-file writes or concurrent changes can defeat naive rollback → stage/preflight, atomic replacements, bounded checkpoint, identity checks and retained recovery data; never claim a global transaction.
- Broad release coverage is slow and can disturb the disposable environment → release-only orchestration, shared checks, schema-equivalent row reuse, backups and verified cleanup.
- Older runtime packages may not execute on current HA without disallowed dependencies → use declared historical-data replay where necessary and retain at least one real previous-package in-place upgrade; report limits, do not skip formats.
- An exact historical snapshot may reference unsupported generated components → reject unsafe restoration before replacement; keep archived bytes and documented migration/recovery, rather than rewrite history silently.
- Unit tests cannot establish upgrade usability and normal preparation can conceal a failure → require preserved-source receipts and real candidate startup/browser evidence before release, with fresh checks counted separately.

## Migration Plan

Land contract/version/conversion and focused tests first, then backup/recovery and all entry-point integration, then historical fixtures and guarded runner reuse. Keep every implementation task aligned with docs/checks; no pending feature is implemented merely because its future schema is mentioned here. Reconcile the explicit-membership version reservation before shipping both changes.

During ordinary implementation run small migration/history/generator/model/harness checks, safe disposable deployment and final affected-card visual inspection; do not run the full upgrade scenario outside release preparation. The first explicit release preparation executes the full preserved-install scenario and records its final visual pass after automated checks. Until that happens, report live upgrade verification as unperformed and do not claim release readiness. Rollback uses the prior complete package plus exact pre-upgrade source/output/owned-state backup. This planning change itself neither edits `AGENTS.md` nor installs, migrates, deploys, tests HA or publishes anything.
