# Tasks

## 1. Configuration and editor

- [x] 1.1 Record the apply starting commit, acceptance cases and shared consumers; capture `npm run test:affected -- --snapshot /private/tmp/marao-people-columns.json` before software edits. Verify the reviewed scope preserves unrelated dirty work and accounts for the People/native-editor prerequisite changes.
- [x] 1.2 Extend shared People validation, descriptor composition and native form data/patching for optional integer `columns` 1–6; preserve omission and independently authored native layout. Verify with small additions to existing collection/native-editor tests covering valid bounds, invalid types/null, non-mutating composition, explicit empty membership and unknown fields.
- [x] 1.3 Add the People-only localized Columns control using the existing numeric up/down control; rebuild shipped editor assets with `npm run build:editor`. Verify an edit emits the complete config with the chosen preference and unrelated name edits preserve omission; review representative scene/group consumers for accidental changes.
- [x] 1.4 Document the option, default and distinction from `grid_options.columns` in `docs/docs/usage/cards/md_people_card.md`. Verify its fictional YAML example matches validation and explains responsive reduction.

## 2. Responsive rendering

- [x] 2.1 Change the existing People list to a responsive internal grid capped at the configured preference. Verify by code review that row-major DOM order, pictures, text wrapping, content-driven height, independent availability and informational-only behavior remain intact, including default/empty cases.
- [x] 2.2 Update existing safe People gallery and realistic-page examples in `ha-test` to demonstrate a multi-column card and retain an omitted-option example where available. Verify fictional entity references and avoid expanding a layout matrix; update existing feature coverage/source mappings if their affected paths change.

## 3. Scoped verification and installation

- [x] 3.1 Review the actual task diff and select the existing People/native-editor component IDs with `test:affected --since /private/tmp/marao-people-columns.json --tier behavior --component <reviewed IDs> --plan`. Run only the smallest relevant existing assertions serially; verify bounds, propagation and lossless round trips against explicit expected output. Report exclusions and any failures honestly.
- [x] 3.2 Install final applicable changes once on disposable `192.168.0.28` using direct `prepareFrontend()` for compatible frontend-only work, or `ha:sync` if fixture changes require full preparation. Verify served assets/readiness, preserve helper state and leave current assets installed; a blocked installation means not ready for test.
- [x] 3.3 Compare implementation and selected evidence with every acceptance scenario. Hand off the test URL and a short manual watch list covering column selection/save, row order, narrow/enlarged-text reflow and long names/locations. Browser inspection is optional; do not add broad integration or camera checks.

## Workflow follow-up

- Archive only after implementation and selected verification are complete; coordinate prerequisite deltas before syncing baseline specs.
- Before any separately authorized push, tag or release, run unit-only `npm run verify:publish`; additional integration/full tests require an explicit request.

## Completion evidence

Implemented in the shared owners and installed on disposable `192.168.0.28` on 2026-11-02. The final frontend sync verified current served assets; owned examples were installed with exact dashboard backup and concurrent-edit protection. Selected frontend checks passed across the batch, plus 11 focused Python configuration/generator checks. OpenSpec strict validation and whitespace review passed. Routine phone appearance/gestures and camera playback remain manual; no browser matrix, full suite, publication or production operation was performed.

Chrome follow-up (2026-11-02): visually verified two-column Alex/Sam then Jules/Taylor order and independent unavailable styling. Renamed the person-specific neutral class to avoid generic error-grid placement. Collection checks passed; final served assets verified on disposable 192.168.0.28.
