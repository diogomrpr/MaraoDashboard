# Tasks

## 1. Shared location settings

- [x] 1.1 Record implementation starting commit, dirty state, acceptance cases and reviewed navbar/settings consumers; capture `npm run test:affected -- --snapshot /private/tmp/current-room-navbar.json` and review a behavior-tier selector plan against the actual task diff. Verify unrelated native-editor/People work is excluded from task attribution.
- [x] 1.2 Extend native settings validation and Save/Cancel editing with optional `navbar.current_room` enablement, person/Area sensor associations, area/page mappings and optional Away page; verify targeted `tests/frontend/dashboard-settings.test.js` assertions for valid/invalid values, explicit emptiness, opaque-key preservation, cancellation and stale/non-admin write refusal using independently specified expected documents.
- [x] 1.3 Propagate settings through native bootstrap without per-view copies, retain exact pre-write dashboard recovery data, and document configuration in `docs/docs/installation/configuration.md`; verify absent/disabled fields preserve supported released settings and representative legacy navbar behavior without migration or generated-source rewrites.

## 2. Identity and current destination

- [x] 2.1 Add shared derived resolution from current `hass.user.id` to exactly one linked person, explicit Area sensor/current `area_id`, and a mapped native view; verify small targeted Node assertions for two owners, no/ambiguous association, missing/deleted/unmapped targets, room changes, named away zones, stale room while away, unknown/unavailable readings and disconnection. Verify no name-based guesses, last-seen fallback, automatic navigation or service calls.
- [x] 2.2 Add account/dashboard/origin-scoped local person overrides with Automatic reset, guarded storage and immediate account-context invalidation; verify targeted assertions for reload persistence, deleted override, corrupt/failed storage, account switching, no shared writes and no effects on another client. Document browser/WebView scope and selected-device limitations in `docs/docs/usage/native-dashboard.md`.
- [x] 2.3 Add the localized main-page Location preferences action and shared Marao sheet for ordinary/admin users, retaining independent cache/editor preferences and hold behavior; verify ordinary-user access, Automatic selection, readable persistence errors, modal cleanup and disabled-placeholder recovery with existing test harnesses. Review English/Portuguese accessible names and 48px controls.

## 3. Navbar rendering and examples

- [x] 3.1 Reserve the first location slot before ordinary route partitioning and render room/Away/neutral states in place; extend targeted `tests/frontend/marao-navbar-card.test.js` assertions for no ordinary routes, exact fit, overflow, two-slot and one-slot fallback, unchanged ordinary ordering, and restored original behavior when disabled. Verify location-only updates never move neighboring slots or rewrite route data.
- [x] 3.2 Reuse active-page treatment, navigation haptics and current lifecycle/preview/editing/hold guards; verify activation rechecks the current identity/room and navigates once, duplicate static destinations keep their state, and state updates do not replace focused controls or navigate by themselves. Document the permanent slot, Away behavior and narrow-host exception in usage guidance.
- [x] 3.3 Add the smallest safe fake person/Area source and representative room/Away example needed for user testing under the existing `/marao-dashboard`, reusing `ha-test/` fixtures and card-test view where useful; verify no private data or test assets enter shipped integration files and no second dashboard root is introduced.

## 4. Final installation and acceptance handoff

- [x] 4.1 Regenerate editable bundles with `npm run build:editor`, review the final task-only diff, and run only the relevant Node checks selected above serially. Verify the concrete account/local-storage/settings preservation risk with the targeted assertions; do not start full suites, browser matrices or upgrade campaigns.
- [x] 4.2 Install the final applicable assets once on disposable HA `192.168.0.28`, preserving unrelated dashboard/helper state; use `prepareFrontend()` directly for compatible frontend-only changes or `ha:sync` if changed fixtures require full preparation. Verify served-asset/readiness checks, retain installed assets, and report not installed / not ready for test if blocked.
- [x] 4.3 Compare every acceptance scenario with code and selected evidence, then hand off the test URL and a short manual watch list: room changes keep the bar stable, phone accounts resolve independently, local override/Automatic survive intended reloads, missing Bermuda signal stays neutral, and confirmed away opens the optional page on tap. State checks actually run and remaining manual coverage; no browser campaign is required for completion.

## Workflow follow-up

- Implementation begins only after a separate apply request; all tracked tasks remain unfinished at proposal time.
- Before any separately requested push/tag/release, run unit-only `npm run verify:publish` across the candidate and applicable package metadata checks; reuse development installation/testing evidence and do not infer authorization for additional integration tests.
- Archive and sync baseline specs only after completed implementation and selected verification; retain unrelated open changes and historical evidence.

## Completion evidence

Implemented in the shared owners and installed on disposable `192.168.0.28` on 2026-11-02. The final frontend sync verified current served assets; owned examples were installed with exact dashboard backup and concurrent-edit protection. Selected frontend checks passed across the batch, plus 11 focused Python configuration/generator checks. OpenSpec strict validation and whitespace review passed. Routine phone appearance/gestures and camera playback remain manual; no browser matrix, full suite, publication or production operation was performed.

Chrome follow-up (2026-11-02): verified Alex room navigation, reload persistence, Sam Away navigation and return to Automatic. Fixed the preferences sheet lifetime by mounting on the stable dashboard host and made dismissal reentrant-safe. Targeted regression passed; final served assets verified on disposable 192.168.0.28.
