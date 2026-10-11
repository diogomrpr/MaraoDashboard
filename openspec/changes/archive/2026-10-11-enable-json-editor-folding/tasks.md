# Tasks

## 1. Reproduce and restore structural folding

- [x] 1.1 Record the initially empty affected-card set and reconcile implementation order with `improve-editor-startup`. Add or extend one focused editor Playwright check using existing disposable-client guards and safe nested array/object configuration; verify it reproduces missing fold/unfold behavior on `192.168.0.28`, with private logs and no real-device actions.
- [x] 1.2 Isolate the observed runtime failure using supported fold/unfold actions, JSON worker range results and rendered hidden/visible lines versus loaded CSS. Correct the failing existing initialization/provider/rendering boundary, explicitly enable JSON folding, and verify nested/sibling independence plus keyboard fold/unfold in the focused browser check. Record the confirmed cause in the change's design; do not assume missing feature imports or introduce a replacement parser/editor.
- [x] 1.3 Reconcile the observed `sensor.*` weather fixture with the schema's `weather.*` contract at its source without suppressing validation. Verify the valid fixture has no diagnostic marker and invalid examples still report expected errors. If the correction changes a weather card, record that card in the affected set and update/check its safe Cases and realistic-page examples together.

## 2. Touch controls and document preservation

- [x] 2.1 Add localized English/Portuguese native Collapse region and Expand region buttons beside Format JSON, restore the current editor selection/focus when invoking its public actions, and disable small hover-oriented gutter controls. Update `docs/docs/installation/configuration.md` with caret-based operation. Verify commands work without hover, are harmless outside a foldable region, and buttons wrap with visible 48 × 48 CSS-pixel dimensions, semantic names and clear collapsed indicators.
- [x] 2.2 Preserve the full editor model, dirty state and edit history while folding; retain folds on unchanged Visual/JSON switches and recompute ranges after edits/format/discard/restore. Extend the focused browser regression and relevant `tests/frontend/editor-model.test.js` cases to verify unknown fields/raw cards, hidden invalid content, undo/redo, schema/entity suggestions and complete folded-content Save & Generate. Verify safe save scenarios restore the disposable configuration and leave the generated representative page complete.
- [x] 2.3 Keep folding/JSON assistance in the single locally bundled JSON entry, including the deferred module if startup improvements have landed. Rebuild owned assets and verify `npm run check:editor`, the focused editor/model checks, local worker/CSS/fingerprint loading and first/repeated JSON activation. If asset inventory changes, extend/run its existing package checks; if the startup change has landed, verify its eager budgets and absence of eager Monaco remain intact. Document the focused browser check in the local-development guide.

## 3. Final integration validation

- [x] 3.1 Dry-run and synchronize the completed workspace only to `192.168.0.28`, verify the served fingerprint, and run the focused folding checks across 320px and representative iPhone/Android portrait/landscape, both themes, normal/bold/200% text/200% zoom/bold plus 200% text. Verify layout, touch/keyboard folding, source scrolling, draft/save protection and no unexpected diagnostics, console errors, failed resources or repeated requests; fix any observed defect at its source.
- [x] 3.2 After the last edit and focused automated check, make final visual/interactive inspection of the editor and every card in the actual affected set, including any changed weather Cases and realistic-page example. Verify text/icon/control alignment, spacing, toolbar wrapping, collapsed indicators, clipping/overflow and a representative generated page; keep artifacts private and report automated-profile versus actual-phone coverage honestly. Repeat this final step after any resulting correction.

## Workflow follow-up

- This proposal authorizes planning only. Request the apply workflow before implementation; archive and sync the accepted delta only after all tasks are completed and verified.
- Before any push, tag or release, run `npm run verify:publish` successfully against the disposable instance and require the published commit's GitHub Tests, hassfest and HACS validation. Ordinary folding iteration uses focused checks, not the full suite.
