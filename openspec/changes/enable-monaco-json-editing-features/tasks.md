# Tasks

## 1. Contextual JSON assistance and preservation

- [x] 1.1 Record the implementation starting commit and the proposal's affected configuration families; preserve unrelated work and the separate drag-and-drop change. Verify existing catalog/model/source contracts and preview scoped editor checks before editing.
- [x] 1.2 Extend catalog-driven JSON schema/completions for card/template names, basic/advanced fields, nested media/camera/group/vacuum/energy/charging options, compatible entity suggestions and current draft page paths; verify model/JSON-language tests cover contextual choices, incomplete input and refresh after page changes without inserting defaults or restricting valid custom/manual values.
- [x] 1.3 Add independently expected preservation cases using supported released/converted configurations, duplicate occurrences, unknown fields, raw cards, explicit empty selections and nested command data; verify opening assistance is read-only and accepted completions change only the intended text range, leaving ID/order/sheet-reference and existing migration/recovery contracts unchanged.
- [x] 1.4 Document schema/help coverage and opaque advanced-data boundaries in the editor development/usage guidance; verify documented suggestions are available for representative role-specific fields and existing unsupported/custom values remain editable.

## 2. Visible Monaco tools and editing continuity

- [x] 2.1 Wire visible Find/Replace and Suggestions controls plus normal keyboard shortcuts to the existing Monaco commands; add focused panel/browser tests for match count, previous/next, no matches, folded results, explicit replacement scope and undo, with no automatic save or entity dispatch.
- [x] 2.2 Configure line numbers explicitly and add readable navigable Problems using current Monaco markers; verify syntax/schema errors show their true line/column, issue selection reveals folded code, corrected text clears issues and stale worker results cannot apply to another source/model version.
- [x] 2.3 Expose Format, Undo/Redo and Expand editor through a responsive toolbar/secondary menu; verify one document/model is retained, expand/restore preserves position and dirty state, Save/tabs stay reachable and no browser fullscreen access is requested.
- [x] 2.4 Preserve unchanged Visual/JSON view state and Monaco undo history through the existing lifecycle, and dispose new subscriptions/providers on removal; verify cursor/selection/scroll/folds/history continuity, changed-Visual synchronization, explicit Discard/restore, initialization failure/retry and no duplicate editor/worker/listener creation.
- [x] 2.5 Add English/Portuguese wrapper/native-widget localization and JSON-only theme/layout styles; verify search, completion and Problems controls have readable labels and visible 48-pixel geometry in both themes. Update configuration documentation with the delivered tool behavior and shortcuts.

## 3. Gutter folding and safe examples

- [x] 3.1 Add always-visible semantic fold arrows using Monaco's existing folding actions and JSON ranges, with public glyph-margin/view-layout APIs for touch presentation; verify 48-by-48 visible buttons, non-overlapping adjacent nested controls, correct arrow state, source line numbers, keyboard operation and cleanup after scroll/edit/resize/fold/disposal without private folding APIs or duplicate small controls.
- [x] 3.2 Extend folding browser coverage to tap real gutter arrows, retain toolbar/keyboard folding, and verify sibling independence, folded diagnostics/search, unchanged dirty/source state, formatting/undo and saved hidden content. Verify geometry at 320px, landscape and required text/zoom settings.
- [x] 3.3 Update safe editor fixtures/examples using the existing Cases and realistic Studio page under `/marao-dashboard`; verify search and suggestion cases include advanced/raw/empty/nested content without new unsafe helpers or a separate dashboard. Update folding instructions, feature coverage and representative examples without adding equivalent runtime gallery variants.

## 4. Scoped integration verification

- [x] 4.1 Update `tests/verification-map.js` for any added JSON helper/assets/tests and a focused JSON editing browser selection, including relevant schema compatibility and `test:ha:alignment` checks; verify every changed path resolves through `npm run test:affected -- --plan`, JSON remains deferred during Visual-only startup, local assets are versioned and rebuilt editor assets pass reproducibility checks.
- [x] 4.2 After the batch's last edit, run the smallest covering `npm run test:affected` selection serially, using `--base <starting-commit>` for committed work or reviewed component scopes. Verify invalid JSON still blocks Visual/save, accepted edits survive explicit Save & Generate/reload, save failures preserve the draft and disposable persistence checks retain exact backups and verified cleanup.
- [x] 4.3 Deploy compatible editor assets together only to `192.168.0.28` and perform final combined inspection in both themes: representative iPhone/Android native touch typing/selection/paste, search/completion/gutter controls, narrow 320px, landscape, normal/bold/200% text/200% zoom/bold-plus-200% layouts and keyboard-reduced space. Verify no clipping, undersized controls, lost position, warnings, failed resources or duplicate requests; retain failures and representative successes, fix defects and repeat focused checks/inspection. State any real-device/Safari limitations honestly.

## 5. User-requested stock Monaco presentation

Starting commit remains `7f4241b0f36620bc82b28fe73373cec77ed54faf`; preserve the uncommitted editor implementation and unrelated maintenance/navbar/drag work. Runtime affected-card set: empty (editor presentation only). No persistence, migration, generated-output or ownership change.

- [x] 5.1 Replace the Marao editor presentation with Microsoft Monaco's stock font, themes, density, minimap, native folding arrows and search/completion/diagnostic widgets. Remove custom gutter/view zones, docked search, editor toolbar and internal CSS overrides; preserve catalog assistance, guarded diagnostics and the existing single-document/save lifecycle.
- [x] 5.2 Update the focused browser/unit checks, documentation and delta specification for the explicitly requested stock editor; retain draft/unknown-field, search/replace, native folding, typing/paste, undo and backed-up Save/reload coverage.
- [x] 5.3 Rebuild, run scoped affected checks serially, deploy only to the disposable instance and inspect the stock editor in both themes and relevant mobile/text/zoom layouts; verify cleanup and retain representative screenshots.

## Workflow follow-up

- All implementation tasks stay unchecked until completed and verified. Planning validation establishes neither product behavior nor test success.
- Before any push, tag or release, run scoped `npm run verify:publish` and applicable exact-commit Tests/hassfest/HACS checks. During explicit release preparation, reassess actual persistence/ownership/upgrade impact and require scoped `test:ha:upgrade`/`verify:release` when applicable. Reuse unchanged valid evidence; do not implicitly run full tests, parallel checks or full historical/mobile matrices.
- Sync/archive only completed, verified work when the corresponding workflow is requested. This change does not apply or close the separate card-drag proposal.
