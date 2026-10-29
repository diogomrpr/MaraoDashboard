# Tasks

## 1. Role-dependent hold and maintenance actions

- [x] 1.1 Record the apply-time commit, dirty state, acceptance cases and shared native/generated/retained navbar consumers. Capture `npm run test:affected -- --snapshot /private/tmp/admin-navbar-maintenance.json` before editing, review current component mappings and verify saved source/routes/show_cache_reset need no migration. Preserve unrelated duplicate files and unfinished native-transition work.
- [x] 1.2 Branch the shared navbar hold completion using the current authenticated role, keeping regular-user direct refresh and all existing timing/cancellation/click-suppression semantics. Add localized administrator menu-hold guidance and preserve regular-user feedback. Extend the smallest existing refresh/navbar assertions to prove one admin menu without immediate action, one regular-user refresh without a menu, cancellation and unchanged short taps.
- [x] 1.3 Implement the navigation-owned native modal maintenance sheet and reuse the actual editor route and existing refresh path after owned dismissal. Add narrow navbar assertions for current role/user/dashboard rechecks, absent editor metadata, repeated activation, dismissal/focus ownership and cleanup on context/host changes. Verify stale controls cannot act, other modal protection is retained, actions dispatch once and menu display writes no source or entity state. Use fake user contexts; do not change real users or devices.

## 2. Shortcut removal and documented access

- [x] 2.1 Remove the permanent landing-page editor anchor and editor-only spacing while retaining optional cache-reset behavior for true/false/omitted show_cache_reset. Update existing navbar row assertions for no editor link, zero spacing with hidden refresh, custom roots and explicit empty routes. Verify no configured route, editor path or ordinary refresh tap changes.
- [x] 2.2 Update configuration/editor-access instructions and reconcile only the superseded permanent-link clause in the existing native-transition planning artifacts, leaving its unrelated unfinished tasks intact. Document the three-second admin menu, regular-user direct refresh and actual direct-route/bookmark fallback for empty navigation. Verify links and wording against implementation; existing safe example pages suffice without new fixtures or a gallery matrix.

## 3. Essential checks, installation and handoff

- [x] 3.1 Review actual task hunks and use `test:affected -- --since /private/tmp/admin-navbar-maintenance.json --tier behavior --component <reviewed navbar IDs> --plan` to confirm scope. Run only the selected refresh/navbar regressions serially, with focused assertions for the concrete stale-authorization/modal paths; build through existing editor/native tooling and verify size/diff checks. Do not run full, camera or broad browser/mobile suites implicitly.
- [x] 3.2 Install all final compatible assets once with `prepareFrontend()` on disposable `192.168.0.28`, preserving source/configuration/helper state; verify served-asset/readiness checks and leave successful assets installed. If blocked, report not installed / not ready for test.
- [x] 3.3 Compare every requested outcome and delta scenario with implementation and selected evidence. Provide the editor/test URL, reload instruction and a short manual watch list: admin hold opens maintenance, regular hold refreshes directly, taps remain navigation, menu closes/restores focus, and no permanent editor shortcut remains. Browser inspection is optional unless needed to diagnose native modal behavior; if selected, use one targeted safe preview visit and report actual coverage honestly.

## Workflow follow-up

- Future push/tag/release requires unit-only `npm run verify:publish`. Additional integration/full tests require an explicit request.
- Archive only completed, verified work; planning artifacts and tests alone do not establish the requested UX.

## Apply record

- Baseline: `e9840fa40de4750a2f267bca7fce02e698d3cc14`; tracked tree clean. Two unrelated duplicate files remain untouched. Snapshot: `/private/tmp/admin-navbar-maintenance.json`.
- Acceptance: admin hold opens maintenance without action, regular hold refreshes directly, taps/cancellation remain intact, stale menu actions cannot dispatch, no permanent editor link, optional refresh visibility retained.
- Shared consumers: native/generated/standalone navbar hosts and retained navigation surfaces. Existing route metadata and `show_cache_reset` are unchanged; no persisted contract or migration.
- Evidence: 44 targeted refresh/navbar assertions pass serially; editor build and byte budget pass (147455 / 147456 bytes); JavaScript syntax and diff checks pass. Both affected OpenSpec changes validate strictly. Selector reviewed `frontend-refresh` and `navbar-startup`; unrelated mapped history/gallery checks and browser matrices were not run.
- Installation: final native assets installed on disposable `192.168.0.28`; installer served-asset/readiness checks succeeded. Identity: `3b0eaa08e87c2cc9d000f81e1a1247475c1d3905b490d07a0c7e37f1375542db`. Editor: `/marao-dashboard/marao-editor`. Configuration/helper state preserved; no browser or physical-device inspection claimed.
- Final acceptance review: role dispatch, guarded exactly-once actions and cancellation are covered by targeted assertions; native dialog supplies modal inertness/focus containment, with owned dismissal/focus restoration and lifecycle guards. Code review confirms route/metadata preservation, localized controls, safe bounds, no permanent anchor and no source/entity writes on menu display. Manual handoff covers both roles, normal taps, dismissal/focus and visual appearance.

### Follow-up: off-screen Home Assistant dialog

- User reported the installed hold did not work. A targeted real-HA preview reproduced it: the navbar was ineligible because HA retains an open non-modal dialog at x=-10000. The original broad `dialog.open` guard incorrectly treated that element as modal input ownership.
- Native dialog protection now checks `:modal`; custom HA/Marao modal guards remain intact. A regression first failed against the old guard and now proves non-modal dialogs permit holds while actual modal dialogs block them. All 44 targeted refresh/navbar assertions pass.
- Final corrected assets installed on disposable `192.168.0.28` with identity `e9378aa2405784d4b00accea524e4d601bb5cdd638a60ec05a5efa9c8d8000f4`. Served assets/readiness verified through the existing frontend preview. An actual browser hold opened maintenance; Close dismissed it; a second hold and Edit dashboard reached `/marao-dashboard/marao-editor`. No source edits, saves or entity actions were exercised. Browser closed and watch cleaned up. Physical-phone and regular-user browser checks were not performed; regular-user dispatch remains covered by unit assertions.
- Earlier diagnosis retained camera request-cancellation diagnostics privately in preview artifacts, covered by the existing manual-only camera exception. The final targeted menu preview completed without browser diagnostics.

### Follow-up: editor access on every page

- [x] Reproduce missing editor metadata on nested full-page floor-plan layouts. Follow the compiler's final navbar stack through its wrappers so every generated page receives the actual dashboard/editor route; preserve administrator checks and hidden-shortcut independence.
- [x] Run the targeted strategy/menu regressions, rebuild and install final assets on disposable `192.168.0.28`, then hand off main-page and other-page hold checks.

Baseline: `df63f39c8da1b48dd4fa9e15a7d88c4ac8386d84`, snapshot `/private/tmp/navbar-edit-hold.json`. Affected consumers: generated native navigation on ordinary and full-page layouts, both landing and secondary pages. No persisted source fields, configured routes, compiler output structure or authorization rules change. The regression uses actual compiler output and first failed because the plan navbar lacked dashboard ownership metadata.

Evidence: the strategy regression passes for ordinary/full-page layouts with either landing page, administrators/regular users and hidden editor shortcuts; existing custom-root and editor-path collision assertions remain covered. The two selected landing-shortcut and maintenance authorization/ownership checks pass. Strict change validation and whitespace review pass. Rebuilt final assets installed as `e8787d8c761b7a8c6ba53b9b5518fbc007310e32e0a9e09603740adebd45730f`; installer confirmed current served assets/readiness. No browser/phone inspection was performed; manual handoff covers main-page and secondary-page navbar holds.
