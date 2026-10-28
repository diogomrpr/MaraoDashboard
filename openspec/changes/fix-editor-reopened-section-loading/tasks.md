# Tasks

## 1. Repair retained page-body loading

- [x] 1.1 Record the apply-time commit, dirty state and affected shared consumers; capture `npm run test:affected -- --snapshot /private/tmp/editor-reopen.json` before code edits. Verify the scoped acceptance cases cover a retained expanded page, both pending and completed old context responses, and exact unsaved draft preservation.
- [x] 1.2 Add a narrow regression to `tests/frontend/editor-panel.test.js` using its existing VM harness and real page-body method: begin deferred metadata loading for an expanded nonlanding page, disconnect/reconnect the loaded panel and resolve requests in controlled order. Verify it fails on the current implementation because no current body work replaces the loading indicator; keep all saved source and dirty-state assertions independent of loader internals.
- [x] 1.3 Repair page-entry attempt ownership and reconnect resumption in `frontend_src/MaraoDashboardPanel.js`, invalidating interrupted work and rendering only current expanded entries. Verify the regression renders current controls, preserves draft/JSON/expansion state and issues no save or entity action; preserve shared context request deduplication and avoid a forced configuration reload.
- [x] 1.4 Cover the directly related interrupted paths in the same targeted test file: collapse/reopen during loading, late old success/rejection after a newer attempt, explicit failure/retry and metadata already ready on reconnect. Apply matching freshness guards to error/success/cleanup and clear detached body caches as needed. Verify stale completions cannot replace current controls or clear newer pending work, current failures retain localized Retry, and collapsed pages remain unmounted. Review existing configuration instructions and confirm no workaround or new documented interaction is required.

## 2. Verify and install the final repair

- [x] 2.1 Review the actual task diff and use `test:affected -- --since /private/tmp/editor-reopen.json --tier behavior --component <reviewed IDs> --plan` with current editor-loading/rendering mappings. Run only the narrow panel regressions serially and the existing editor/distribution build needed for the current installation. Verify the identified loader path and retained draft assertions pass; no full, camera or mobile-matrix run is required.
- [x] 2.2 Install all final applicable assets once on disposable `192.168.0.28`, using `prepareFrontend()` directly when compatible or the current compatible native sync path. Verify served assets/readiness and preserve existing safe fixture/configuration state. If installation fails, report not installed / not ready for test; leave successful assets installed.
- [x] 2.3 Compare the repair with the reported symptom and existing visual-builder contracts. Provide the test URL, actual evidence and a short manual watch list: reopen with a previously expanded page, retain unsaved changes and check that loading settles or offers Retry. Agent browser inspection is optional; if diagnosis still needs it, use one targeted existing preview visit with safe cards and record whether the exact user sequence was reproduced. Do not describe the offline harness as browser verification.

## Workflow follow-up

- Keep `skip_specs: true`: this repairs existing behavior without changing requirements.
- Before a separately requested push, tag or release, run the unit-only `npm run verify:publish` gate; additional integration/full testing needs an explicit request.
- Archive only after implementation, required installation and verification are complete.

## Apply evidence — 2026-10-27

- Starting commit: `ae962afc584d8bfb4939c857cce93f5f02ffbacc`; dirty baselines captured before edits. Applied with the other two requested editor changes; preserved the resource-loader repair and unrelated untracked duplicate files.
- Acceptance checked with the actual panel VM regressions (including interrupted work, retained exact drafts, icon updates/tab transitions and local section/flat duplication), targeted model/compiler duplication checks and existing page-duplication assertions. An icon-markup expectation was updated for decorative `aria-hidden` and rerun successfully. No browser or exact user-navigation reproduction is claimed.
- Editor build and diff checks passed. Popup traversal is shared with page duplication; eager panel remains within the unchanged 144 KiB budget. No source format, persistence or backend migration.
- Final combined native assets installed through `prepareFrontend()` on disposable `192.168.0.28`; served-asset/readiness and unchanged-source checks passed. Installed identity: `726d8dd1792ee3535afa18483b4bda51c39b6656dbf1ec16e4286aed490bf62b`.
- Manual handoff: reload `/marao-dashboard/marao-editor`; check reopened expanded sections retain drafts and settle loading, header icons/JSON-only transfers fit on mobile, and duplicated cards edit independently with separate popup targets. No publication or additional integration/full tests performed.
