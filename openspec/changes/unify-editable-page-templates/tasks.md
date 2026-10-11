# Tasks

## 1. Canonical page configuration and compatibility inputs

- [x] 1.1 Confirm the delivered upgrade, independent-room and Entity Group contracts and reconcile overlapping accepted deltas before code changes; record the actual predecessor/next format versions and exact affected-card inventory, verifying no separate guided form or `overview.entity_groups` storage remains authoritative in the agreed plan.
- [x] 1.2 Define the ordered `pages`, landing reference, reusable container descriptors and optional ordered sections in Python validation and JS model/schema/serialization; add focused generator/editor-model tests for mixed layouts, entity-free descriptors, invalid paths/versions/columns/bindings, ambiguous flat-plus-section content and unknown/raw preservation; verify those selected tests pass.
- [x] 1.3 Add sanitized historical page inputs and independently authored expected canonical documents under `ha-test/upgrade/`, with release provenance and feature-to-assertion coverage for every row of the design's parity table, explicit empty/absent selections and customization sentinels; verify expectations are not produced by candidate migration or starter code and document the canonical format in the configuration guide.

## 2. Shared card and page generation

- [x] 2.1 Promote weather, room shortcuts/All off, native scene collections, alarm/status/service actions, energy periods/history and media app options through the shared catalog/editor descriptors, reusing existing templates; add catalog/generator/runtime checks for configured names/icons/bindings and action readiness/safety, update applicable card docs and verify the focused checks pass.
- [x] 2.2 Replace special page composition with common flat/section generation while preserving legacy title/subview presentation, mixed ordering, all Wallbox/media/history/group behaviors and one footer per page; add generator parity tests for every starter role, cross-page reuse and empty pages, and verify the matching cases in `test_generator.py` pass.
- [x] 2.3 Scope generated popups to page/card instances and preserve compatible explicit references; add checks for duplicate Media/Energy pages using the same entities, scene/group nested popups, rename/delete cleanup and independent configured names/options; verify focused generator and relevant popup/history runtime tests and document popup identity compatibility.

## 3. Ordered conversion and lifecycle recovery

- [x] 3.1 Implement the next ordered page-model conversion after explicit room membership, preserving the design's mapping, effective navigation and non-operative legacy options; compare complete results to independent fixtures for format-0 and predecessor inputs, explicit emptiness, missing optional pages, custom/raw/unknown content and idempotence, and verify focused migration tests pass.
- [x] 3.2 Connect conversion/current-format starter creation to setup, editor preview, Save & Generate, service/alternate sources, dry-run and compatible history preflight through the shared recovery path; add lifecycle/history tests for read-only paths, no-op reload, invalid/future/mixed source, failure/interruption recovery and immutable archives, and verify the selected tests pass without resetting saved empty pages.
- [x] 3.3 Update installation/update and development guidance for one-time snapshots, migration status/errors, exact private backups, compatible restoration and complete package-plus-data rollback; verify examples against canonical schema and recovery tests and update the historical upgrade coverage inventory for every migrated page role.

## 4. Page manager and editable starter templates

- [x] 4.1 Replace separate Overview/Rooms/guided/custom creation forms with the top page manager and one Add page flow for Empty/Home/Rooms/Room/Security/Energy/Wallbox/Media; add editor-model/panel tests for creation-only population, required draft bindings, optional omission and all-page editing, update bilingual copy and builder usage docs, and verify the focused checks pass.
- [x] 4.2 Reuse shared card and section controls for names/icons/entities/options, add/remove/reorder and page duplicate/rename; add model/panel checks for local drafts, Visual/JSON preservation, nested references and independent duplicate identities, document mixed layouts and verify the relevant editor checks plus reproducible editor build/check pass.
- [x] 4.3 Separate navbar pin/order controls from page edit/delete, permit creation of unpinned pages at five entries and provide landing selection; test unpin preservation, sixth-pin rejection, final-page rejection, named whole-page deletion and explicit reference resolution, verify focused editor/generator checks and document shortcut access to unpinned pages without restoring individual-card delete confirmation.

## 5. Safe examples and integrated mobile verification

- [x] 5.1 Update canonical Cases, safe fake entities, gallery coverage and realistic generated pages on `/marao-dashboard` for each newly editable role, mixed section layout, independent duplicated popups, renamed/removed template cards and unpinned shortcuts; verify gallery/fixture checks and focused generation checks, and align the feature coverage map with the delivered behavior.
- [x] 5.2 Extend the existing editor/browser checks for Add page → edit individual cards → save/reload, repeat generation without reinsertions, migration preview and independent duplicate pages; dry-run and sync only to `192.168.0.28`, confirm the loaded fingerprint, and verify safe interactions across 320px and representative iPhone/Android portrait/landscape, both themes and normal/bold/200% text/200% zoom/bold plus 200% text. Use existing e2e/accessibility checks for this shared-foundation change; run `npm run test:ha:alignment` when icon-only layout is affected, and report every warning/error/resource/repeated-request defect.
- [x] 5.3 After the final edit and relevant automated check, visually and interactively inspect the complete affected Cases gallery and realistic counterparts plus the page editor: all text/icons/control alignment, 48px sizing, section spacing, wrapping/clipping/scrolling, popup focus/inert/restore, states and gesture cancellation. Verify every recorded card/popup in the affected set, fix defects and repeat focused checks and this final inspection; record evidence and emulation/physical-device limits honestly.

## Workflow follow-up

- Review and archive only completed, verified work; reconcile and sync accepted overlapping capability deltas so obsolete guided-page storage/forms cannot return.
- Before any push, tag, GitHub or HACS release, pass `npm run verify:publish` against the disposable instance and exact-commit Tests, hassfest and HACS validation. Do not run publication checks merely for this proposal or every small implementation batch.
- During explicit versioned-release preparation only, run the final-candidate preserved-install upgrade gate from `ensure-safe-dashboard-upgrades`, with historical page coverage, preservation assertions and verified cleanup. Do not substitute fresh-fixture preparation or run this live upgrade scenario in routine iteration. Missing/incomplete/failed/stale upgrade evidence blocks release.
