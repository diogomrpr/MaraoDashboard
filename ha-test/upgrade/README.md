# Released configuration coverage

These are read-only compatibility fixtures, not Home Assistant deployment inputs.
`fixtures/provenance.json` records released JSON tags, commits, source paths and
hashes. `fixtures/inventory.json` records the earlier storage format and
independently authored preservation cases. The five locally available release
tags were checked against their actual committed sources when freezing these
inputs. Their expected JSON is frozen separately from the candidate converter.

`fixtures/page-model-expectations.json` records the independent format-2 page
documents for all four released JSON baselines, the accepted format-1
predecessors, explicit empty selections, complete guided-role customization and
saved Entity Groups with nested options and mixed/duplicate content, customized
installations, energy options and the legacy additive URL menu. It links
every page parity row to executable assertions and hashes input, predecessor
and complete expected documents separately. These expectations were specified
from fixed page/card literals and unchanged saved scopes; candidate conversion,
starter creation, resolution and generated candidate output did not produce
them. The focused `test_page_migration.py` compares full documents and verifies
source immutability and the public ordered 0→1→2 chain and idempotence, while
`test_page_generation.py` checks common composition,
independent popups and compatible owned filenames. The format-2 public lifecycle
uses the same conversion in setup, previews, saves, alternate sources and history
preflight. These focused checks are not live upgrade evidence; native-storage
conversion is covered by focused native HA lifecycle checks, while the complete
preserved-install scenario remains required.

`fixtures/entity-groups-expected.json` independently specifies the four released
JSON inputs' legacy Overview descriptors and popup membership. The focused
historical check compares whole descriptor lists, stable links, titles and ordered
members, and verifies preview/dry-run/generation leave original source and archive
bytes intact. Explicit group lists also retain their options through the builder,
independent of room membership and later registry changes. This is additive
predecessor coverage carried into ordinary format-2 Home cards; it does not claim
a live preserved-install release gate.

Each released JSON row also names a frozen `fixtures/generated/<tag>/` directory.
Its YAML, legacy generation manifest and `configuration.yaml` registration were
produced offline by that commit's exact generator and configuration patch, from
the frozen JSON with an empty registry and `/config` include root. Provenance
records hashes of all three historical Python sources and every output file.
These fixtures contain configuration only; historical runtime card bundles were
neither retained nor installed. The focused check regenerates each copied
baseline with the candidate, retains an independently authored manual-file
sentinel, and verifies the original source and baseline bytes remain untouched.

| Fixture | Origin | Assertions |
| --- | --- | --- |
| `v0.3.0-guided-pages.json` | Configuration literal at line 617 in the released generator test, serialized as JSON; the release did not ship a standalone dashboard JSON example | Explicit room conversion is read-only during planning; source/output stay untouched; guided energy/load defaults remain present |
| `v0.3.1-custom-navigation.json` | Released generator test literal at line 477 | Same format-1 conversion; custom page order, shortcuts and grouped entities retained |
| `v0.5.0-camera-provider.json` | Released generator test literal at line 620 | Same format-1 conversion; camera provider and media-source options retained |
| `v0.5.1-dashboard.json` | Exact bytes of the released disposable dashboard configuration | Same conversion/read-only checks; existing entity options and page configuration remain intact |
| `v0.2.0-storage-builder-input.json` / `v0.2.0-storage-dashboard.json` | Output of the verified released native storage builder with independently specified safe registry input | Distinct pre-JSON contract, full native document frozen; Independent format-2 expectation; real native HA setup, regeneration, history and failure recovery are checked in `test_native_storage_migration.py`; live release evidence remains required |
| `customized-format-0-input.json` / `customized-format-0-expected.json` | Independently authored installed-data customization overlay | Format 1 folds include/exclude/overrides into explicit selections; order, duplicates, raw cards, navigation and unknown fields remain; writable generation also canonicalizes the documented theme alias |
| `explicit-empty-input.json` / `explicit-empty-expected.json` | Independently authored deletion/emptiness overlay | Empty rooms, scenes, navigation and optional pages stay empty; no source refill |
| `preserved-custom-cards.yaml` / `unrelated-ownership.json` | Independently authored safe sentinels | Protected custom YAML and unrelated generated-directory bytes retained; registration/resource/theme sentinels are inputs for the release-only preserved-install runner |
| `energy-formatting-input.json` / `energy-formatting-expected.json` | Independently specified additive option preservation case | Explicit 0/2/6 precision, independent duplicate cards, switch legacy label, guided summary/sheet parity, unknown/raw/custom content, format-1 conversion, read-only source bytes and immutable prior archive |

`tests/components/marao_dashboard/test_upgrade_fixtures.py` verifies the released
fixture hashes and exercises read/plan, conversion, save, generation and archive
preservation. Its inventory checks fail if a required released JSON row is
dropped or a frozen input/expectation changes without updating its digest.
The editor-model fixture check compares complete Visual/JSON round trips with
the independent expected documents, including missing optional sections and
ordered lists without a column setting. Read-only editing keeps legacy theme
aliases; successful writable generation canonicalizes the documented alias.
`node tests/test-ha-editor.js --preservation --scenario=iphone-normal` exercises
the four released JSON inputs and native storage input as local drafts through the real JSON/Visual tabs
in both themes and asserts saved source is untouched. It does not install an
old package or satisfy the live upgrade gate.

These focused checks do not run a live upgrade or establish recovery across all
owned HA state. The executable upgrade inventory and release-only runner cover registration,
resource and theme preservation; their complete live execution is still required. Native storage data
must not be passed off as format-0 generator JSON or as a compatible candidate
dashboard merely because its frozen document is readable.

Focused integration/history checks now cover the bounded source/output, owned YAML
patches, bundled theme and native resource collection operation. They retain exact
CRLF baselines, ordered resource IDs, unrelated registrations and manual files;
inject deletion, reported/silent native persistence, source, cache rollback and
interruption failures; and refuse to overwrite concurrent resource edits. Startup
and writable retries recover the loaded cache with the files. Previews and dry runs
report pending recovery without repairing it. These checks use the native HA
collection with filesystem-backed test storage; they do not establish release evidence.

`coverage.json` now maps the current catalog/options, guided-page fields, runtime
registrations, every Cases collection and the complete mobile/theme matrix to
existing focused assertions. Run `.venv/bin/python tests/upgrade_coverage.py` to
check the reviewed inventory. A new family, field, state, gallery option or
profile must extend its mapping; deleting an assertion also fails the check.
The affected-card set for the inventory/checker itself is empty.

The checker also rejects candidate-mismatched execution reports, missing formats,
baselines, profiles, failed or duplicate rows, and missing preservation/recovery/
cleanup assertions. Its unit tests use explicitly mocked reports; they do not
produce release evidence. The install assertions require a real execution of the release-only
orchestrator; its focused orchestration/backup/recovery tests are not that execution. An ordinary gallery pass cannot fill those rows
or excuse missing native-storage evidence. These focused checks do not constitute a live upgrade.

Energy formatting is additive and does not reinterpret `power_unit`. The current
format is 2. Independently specified `*-format-1-expected.json` documents cover
room conversion separately from the immutable historical expectations. Ordered page conversion has independently specified format-2 expectations; later
conversions must extend the same input/expected coverage. Earlier package versions remain
part of `ensure-safe-dashboard-upgrades`, including native YAML history before
JSON configuration existed.

The versioned release preparation gate must separately exercise a preserved
installation on the disposable instance and verify cleanup. Routine development
runs these focused file-based checks only.

Room presentation uses the same released fixtures to verify complete explicit
light lists, configured names/icons and independent navigation in generated
shortcuts. Saving retains the original configuration, and the provenance-backed
fixture bytes remain unchanged. The shared runtime supplies the compact action
and decoration without adding a persisted layout setting or format conversion.

## Preserved-install browser entry point

All browser runners that use `ha-test/prepare.js` can inspect already prepared
upgrade data through `MARAO_UPGRADE_RECEIPT=/absolute/private/receipt.json`.
This is an internal runner contract, not a skip-preparation switch. The upgrade
orchestrator must first retain a private pre-test backup, verify fixture ownership,
and create `/config/.marao-upgrade-active.json` (using the configured HA directory)
with its UUID `operation_id`. It creates the receipt only after independent
preservation assertions succeed. The explicit `tests/test-ha-upgrade.js` runner produces this receipt after
checking original data against frozen independent expectations and adding newer
features through the ordinary editor; it does not reseed the migrated source.

The receipt is a regular local file with permissions `0600`; symlinks and public
files are rejected. Its fields are:

- `version: 1`, UUID `operation_id`, ISO `created_at` less than 24 hours old,
  exact `target` origin and `remote_config_path`, `dashboard_key: marao-dashboard`
  and the existing integration `entry_id`.
- `candidate`, obtained from `candidateIdentity()`: current commit, SHA-256 of
  the sorted integration file/digest mapping, frontend/editor/fixture/test/harness
  fingerprints, and historical inventory digest. Candidate changes invalidate it.
- Exact `source_sha256` and independently specified `expected_config`. A receipt
  must not manufacture its expectation by reading whatever happens to be installed.
- `output.slug` and the full `output.files` relative-path/SHA-256 mapping, including
  `.marao-generated.json`, generated views and protected/manual files.
- Complete `fixture_domains` inventory and `fixture_files` path/digest mapping for
  the safe helper package and any test-owned `www/marao-upgrade-*.js` sentinels.

`verifyPrepared()` checks the active operation, source/output bytes, absence of
unfinished dashboard recovery, installed candidate/provider bytes and ownership,
persisted semantic expectation, entry identity, admin access, native configuration
directory, one dashboard/Cases view, fixture entities, current editor/served assets
and absence of stale owned resource registrations. It rereads installed identities
at the end to catch concurrent changes. Browser resource and current-asset checks
remain enabled. This path never deploys, copies fixtures, resets entities, generates
the dashboard or recovers an operation itself.

Normal preparation fails before reseeding if the remote active-upgrade marker
exists and the receipt environment variable is missing or empty. Cleanup must
restore and verify the pre-test environment before removing that marker. An orphan
marker is a recovery blocker, not permission to delete it and continue. A guarded
dry run validates local receipt/candidate identity only and does not contact HA.

Focused `upgrade-prepared` tests cover rejected/missing/stale receipts, candidate
and installed-data drift, symlinks, source/output/fixture/asset/entry identity,
read-only snapshot execution and the missing-receipt reseeding barrier. These
mocked/filesystem checks do not establish a completed live preserved upgrade.

## Final candidate evidence check

During explicitly authorized release preparation, run
`npm run verify:release -- /absolute/private/upgrade-report.json` for the clean
final commit. This command checks evidence, runs the existing `verify:publish`
checks and rejects any subsequent candidate or report changes. It does not
produce upgrade evidence, publish anything or replace the separate historical upgrade producer. `npm run test:ha:upgrade` implements the separate producer; a complete live report,
including native-storage conversion and recovery, remains required for the final candidate.

The report must be a private regular file (`0600`) with the existing execution
fields checked by `tests/upgrade_coverage.py`: `version`, `candidate`, `target`,
`formats`, `baselines`, complete passing `runs` and `install_assertions`.
Additionally it requires `kind: preserved-install-upgrade`, a UUID `operation_id`,
valid `started_at` and `completed_at` timestamps, and `verified_cleanup: true`.
Report and coverage versions are 2. Shared behavior and the full mobile matrix
run once on `generator-json-0`; other distinct formats need targeted saved-page
checks and all seven baselines retain independent preservation/recovery.
`visual_reviews` must contain exactly four passing rows: normal iPhone and
Android 200% zoom, each in light/dark, on the preserved latest-release upgrade,
with `source: preserved-install`. These rows
record actual final review of the upgraded data before verified cleanup; normal
fresh preparation or mocked tests cannot supply them.

The gate uses private temporary copies for coverage checking and removes those
copies even when validation fails. It never removes the original report or a
historical backup. Its focused filesystem/mocked tests check rejection, drift,
cleanup and isolation from ordinary scripts and CI; they are not release evidence.

## Release-only producer

Prepare and stabilize the safe current fixtures before the clean final commit.
Then run `npm run test:ha:upgrade`; the producer itself performs only reads until
its private pre-test backup is retained and the active operation marker exists.
It verifies current installed package/provider/helper ownership, installs the
actual locally verified v0.5.1 package and checks its browser health, replaces
only package assets, and exercises all released/supported native-storage and
JSON formats through real integration setup. Historical identity variants keep
the single `/marao-dashboard` root; frozen files remain unchanged. Older rows
are explicitly historical-data replay.

Each row compares the complete persisted document with its frozen independent
expectation before manual generation or additions. It checks exact source/output
through another restart, retained entry identity, protected YAML/manual files,
unrelated registration/resource/theme sentinels and immutable history. Bounded
filesystem failure/interruption tests run separately for every baseline without
shipped fault hooks. Newer features are added after preservation through the
ordinary JSON/Visual editor; historical pages remain ordered and retain their
selections/options and protected filenames under explicitly edited page paths.
Historical bindings may remain absent and neutral only when backed by that
row's frozen expectation; overlap with non-fixture entities is rejected.
Original historical source and independent expectations remain untouched during
installation and preservation checks. Before browser checks, the ordinary editor
extension maps non-gallery historical references into the absent
`marao_dashboard_upgrade_` namespace, preserving their already converted names
and options. Each private row records frozen/replay hashes and the exact browser
binding map. Gallery entities retain their names, and the actual v0.5.1 source
remains byte-exact. All seven intended browser bindings are checked before the
first remote write and again before each installation; an existing isolated name
also blocks the run. Historical controls never operate unrelated entities.

The disposable SSH environment requires Python 3 with its standard library for
private backup and recovery. The configured root may use the SSH add-on's
`/config` alias; links inside owned state remain rejected.

Preservation, second-restart and recovery checks for the historical data run
before the latest-release shared browser matrix, so a cheap compatibility failure
stops the run early. Active and repeated output fingerprints are retained privately.
Current generation manifests define repair ownership: dormant, unreferenced old
files and protected custom blocks remain preserved and do not trigger regeneration.

The producer runs the complete automated layout matrix once with guarded
receipts, normal-profile shared behaviors and targeted other-format browser
checks. Success images are representative samples; failures retain screenshots. Its
private operation directory records executed checks, immutable captures and
candidate identity. After all checks it waits for a private `visual-review.json`
attestation for actual review of the four declared representative visual rows,
tied to immutable capture hashes. Other profiles/formats are automated evidence,
not invented manual reviews. An agent or developer must inspect those captures; the runner never
manufactures passing visual rows. It then restores and verifies the pre-test
files, integration identity and controlled helper states, and removes the marker
only after cleanup succeeds. Failure retains private backups and a failed report;
concurrent unrelated edits stop restoration rather than overwrite them. The
report is accepted only after `verify:release` and exact-commit CI pass.
`verify:publish -- --upgrade-report /absolute/private/report.json` validates that
report and all capture hashes, rechecks the restored original prepared install
without reseeding, and rechecks the native-exception expiry before reusing browser
evidence. Local tests still run. Changed or incomplete evidence cannot enable reuse.

The user-approved native HA reconnect exception is diagnosed separately, retains
raw failed e2e assertions and exact stale-subscription evidence, and expires when
the upstream fix reaches a stable frontend. Other failures still block release.
No real preserved-install run is claimed by this implementation documentation.
