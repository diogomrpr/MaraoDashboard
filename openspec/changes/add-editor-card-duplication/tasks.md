# Tasks

## 1. Independent card duplication

- [x] 1.1 Record the apply-time commit, dirty state, acceptance cases and shared row consumers; capture `npm run test:affected -- --snapshot /private/tmp/card-duplication.json` before code edits. Verify the recorded scope excludes unrelated work and preserves the planning decisions in proposal/design.
- [x] 1.2 Add the shared descriptor-copy helper in `frontend_src/editor-model.js`, retaining complete nested configuration and exact YAML while assigning a fresh occurrence ID and remapping only clone-owned popup/mode-selector definitions and their references. Extend `tests/frontend/editor-model.test.js` with independent-edit, unknown/empty data, ID and explicit-hash cases; verify these targeted assertions pass serially.
- [x] 1.3 Add a narrow assertion in `tests/frontend/native-compiler.test.js` proving duplicated popup-backed cards compile with distinct targets and source/copy settings, and fixed-column insertion order is retained. Verify compilation does not mutate the source or authored external links. Review the retained generator equivalent; if it needs changes, use the integration skill and check only that concrete discrepancy.

## 2. Shared editor action and guidance

- [x] 2.1 Add the Duplicate card row action and handler in `frontend_src/MaraoDashboardPanel.js`, with English/Portuguese accessible labels, existing strong haptics and targeted container refresh. Extend `tests/frontend/editor-panel.test.js` to verify one adjacent copy in the selected flat/section container, independent edits/removal, current coordinates and no automatic save or entity dispatch; retain existing draft save/discard handling.
- [x] 2.2 Update `docs/docs/installation/configuration.md` to explain duplicate-in-place, unchanged names and explicit save/discard. Verify the guide matches the action and source-order versus automatic-layout behavior; use existing safe gallery/realistic-page card examples rather than adding a new fixture matrix.

## 3. Essential verification and installation

- [x] 3.1 Review actual task hunks and select the smallest scope with `test:affected -- --since /private/tmp/card-duplication.json --tier behavior --component <reviewed IDs> --plan`; resolve IDs from the current coverage mapping. Run only the relevant model/panel/compiler assertions serially and rebuild editor/current distribution assets with the existing compatible build scripts. Verify exact YAML, independent generated targets, order and complete unrelated-data preservation against the spec scenarios; do not run full/browser/camera suites by default.
- [x] 3.2 Install final applicable assets once on disposable `192.168.0.28` using `prepareFrontend()` directly for a compatible frontend installation, or the current compatible sync path if native packaging requires it. Verify served assets/readiness, preserve test configuration and safe helpers, and leave the assets installed. Report any blocker as not installed / not ready for test.
- [x] 3.3 Compare each requested outcome with implementation and selected evidence. Deliver the test URL and a short manual watch list: Duplicate is reachable on mobile, the copy edits independently, popup-backed copies open the intended sheet, and explicit save/discard retains/restores the expected cards. Agent browser inspection is optional; if needed, inspect once through the existing preview helper with safe entities and stop after acceptance and cleanup.

## Workflow follow-up

- Before any later push, tag or release, run the required unit-only `npm run verify:publish` gate across that candidate; additional integration/full tests require an explicit request.
- Archive only after implementation and required verification are complete; this proposal does not authorize implementation or publication.

## Apply evidence — 2026-10-27

- Starting commit: `ae962afc584d8bfb4939c857cce93f5f02ffbacc`; dirty baselines captured before edits. Applied with the other two requested editor changes; preserved the resource-loader repair and unrelated untracked duplicate files.
- Acceptance checked with the actual panel VM regressions (including interrupted work, retained exact drafts, icon updates/tab transitions and local section/flat duplication), targeted model/compiler duplication checks and existing page-duplication assertions. An icon-markup expectation was updated for decorative `aria-hidden` and rerun successfully. No browser or exact user-navigation reproduction is claimed.
- Editor build and diff checks passed. Popup traversal is shared with page duplication; eager panel remains within the unchanged 144 KiB budget. No source format, persistence or backend migration.
- Final combined native assets installed through `prepareFrontend()` on disposable `192.168.0.28`; served-asset/readiness and unchanged-source checks passed. Installed identity: `726d8dd1792ee3535afa18483b4bda51c39b6656dbf1ec16e4286aed490bf62b`.
- Manual handoff: reload `/marao-dashboard/marao-editor`; check reopened expanded sections retain drafts and settle loading, header icons/JSON-only transfers fit on mobile, and duplicated cards edit independently with separate popup targets. No publication or additional integration/full tests performed.
