# Tasks

## 1. Card movement and preservation

- [x] 1.1 Record the implementation starting commit and shared-row affected-card set from proposal.md; confirm the unrelated upgrade-task edit remains untouched and preview `test:affected` scope for editor model/UI and relevant generation checks.
- [x] 1.2 Add one validated same-page model move operation and route existing card up/down actions through it; verify independent expected results for upward/downward moves, before/after/end insertion, empty destinations, source-empty preservation, invalid/stale coordinates and unchanged positions in model/panel tests.
- [x] 1.3 Extend existing canonical/legacy-source serialization and page-generation regression fixtures for moved duplicate entities, cards without persisted IDs, media/climate/group/alarm/energy sheets, headings/shortcuts, nested vacuum command data, unknown options, empty lists and raw/protected content; verify stable IDs/hashes/links, untouched no-op sources and unchanged fixed/automatic layout semantics with focused compatibility checks before UI deployment.
- [x] 1.4 Document the move operation's boundaries and compatibility expectations beside the relevant model tests/source comments; verify the source format, HA entry version, migration code and existing backup/history contracts require no changes, or explicitly revise the impact assessment before making such changes.

## 2. Touch interaction and explicit moves

- [x] 2.1 Add a visible 48-by-48 semantic drag handle and Pointer Events session to the shared card row, replacing whole-card HTML dragging; verify touch and mouse activation, no movement on a tap, ordinary non-handle scrolling, distinct duplicate occurrences and no accidental row/entity actions in focused panel/browser coverage.
- [x] 2.2 Add section-level drop targets, empty-section targets, before/between/after feedback and bounded edge scrolling; verify actual list/grid geometry in both directions, wrapped grid rows, final positions and scrolling beneath the sticky header through native pointer/touch input.
- [x] 2.3 Commit through the shared move operation once on valid release and clean up on cancellation, lost capture, Escape, disconnect, tab/document/busy changes and modal opening; verify cancelled/no-op drops preserve the draft and dirty state and leave no capture, overlay, animation task, duplicate move or unexpected request.
- [x] 2.4 Add Move to section with destination position through existing form/dialog helpers; verify tap/keyboard operation matches drag results, cancellation is read-only, single-section pages expose no unusable transfer action and focus returns to the moved occurrence.
- [x] 2.5 Add English/Portuguese instructions, feedback and automatic-layout guidance in the shared label catalog, and wrap action geometry using existing theme/typography conventions; verify localized labels, 48-pixel controls, normal/bold/200% text/200% zoom/bold-plus-200% layouts and icon alignment without overflow.
- [x] 2.6 Update builder usage documentation and safe editor/gallery fixtures with a realistic page containing populated and empty sections, mixed widths and duplicate/popup-bearing cards; verify all examples use safe helpers under `/marao-dashboard`, raw cards remain in place and supported options are preserved without expanding equivalent gallery cases.

## 3. Integrated verification and review

- [x] 3.1 Update `tests/verification-map.js` to select new movement helpers, model tests and scoped editor gesture/layout cases, including relevant generated-identity checks and `test:ha:alignment`; verify `npm run test:affected -- --plan` resolves every changed path and avoids unrelated/full-suite work. Rebuild bundled editor assets and verify reproducibility with the existing editor-asset check.
- [x] 3.2 After the batch's last edit, run the smallest covering `npm run test:affected` selection serially (use `--base <starting-commit>` for committed work or reviewed component scopes). Verify moves through Visual/JSON, Save & Generate, reload, repeated generation, Discard and save-error retention, with explicit no-write/no-service assertions before save and exact disposable backup/cleanup verification.
- [x] 3.3 Deploy compatible UI assets together only to `192.168.0.28` and perform the final combined representative inspection: both themes, iPhone/Android touch gestures and cancellation, narrow 320px, landscape and required text/zoom layouts. Verify source/destination geometry, scrolling, explicit moves, preserved sheets and browser/resource/request diagnostics; retain failures and representative success captures only. Fix observed defects and repeat focused checks and affected inspection.

## Workflow follow-up

- These tasks remain unchecked until implemented and verified. Planning completion does not establish product behavior or test success.
- Before any push, tag or release, run scoped `npm run verify:publish` and applicable exact-commit Tests/hassfest/HACS checks. During explicit versioned release preparation, reassess actual persistence/ownership/upgrade impact and run scoped `test:ha:upgrade` plus `verify:release` when required; reuse unchanged valid evidence. A UI-only change does not automatically require historical live upgrades, full tests or a full mobile matrix.
- Sync/archive this change only after implementation, review and required verification are complete and the user requests the corresponding workflow.
