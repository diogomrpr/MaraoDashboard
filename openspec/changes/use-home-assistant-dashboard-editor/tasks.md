# Tasks

Checked tasks have scoped implementation evidence; unchecked tasks remain pending. Apply this change in dependency order. The host compatibility checks in group 1 must succeed before conversion is enabled. Use existing tools on disposable `192.168.0.28`; camera playback remains manual. Group-local assertions are scoped to changed logic, not an instruction to run every mapped suite.

## 1. Native metadata and automatic-navbar compatibility

- [x] 1.1 Capture the implementation commit/dirty snapshot and reviewed affected consumers; record supported HA/frontend versions and inspect the affected test plan. Verify the scope record identifies card editors, popup composition, navbar/bootstrap and conversion without absorbing unrelated edits.
- [x] 1.2 Define versioned root `marao` metadata and validation preserving unknown native fields, explicit empty routes and existing flags; add focused model assertions for valid/unsupported versions, key collisions, opt-out and lossless patches.
- [x] 1.3 Implement the isolated critical host adapter and reuse one persistent navbar owner without per-view cards. Prove direct entry into empty Sections and full-page Panel views, automatic appearance on a new view, settings-only/role/theme updates, native edit entry/exit and disposal. Use one targeted installed check on the disposable instance; stop for design revision if HA cannot satisfy the contract.
- [x] 1.4 Verify the root settings block survives native card/section/view/dashboard-settings/raw edits, undo/redo, save and reload; document the supported host boundary and refusal behavior with the actual result. Do not enable conversion or substitute per-view placement if retention fails.

## 2. Native card contracts and shared configuration

- [x] 2.1 Add catalog-derived picker/default/editor adapters for current card families while preserving all 36 catalog identities and generic runtime types; verify supported registrations/default bindings through focused catalog/model assertions without restoring duplicate historical wrappers.
- [x] 2.2 Extract schema, patch, validation and localization helpers from panel ownership into the shared native editor; verify complete `config-changed` output, Cancel behavior, unknown/nested command fields, absent versus empty values and native layout/visibility preservation using existing editor/model tests.
- [x] 2.3 Implement native Sections sizing and retain Masonry sizing with scoped card styling; verify the sizing contracts and representative native resize/visibility behavior during the targeted installed compatibility visit. Keep grouped-control containers intentional and document native ownership of outer spacing/layout.
- [x] 2.4 Document the native Add/configure/Visual-YAML/save flow and named-card compatibility in the existing authoring/card guides; verify names/options match current catalog and no guide requires the retired dashboard builder.

## 3. Specialized editor parity

- [x] 3.1 Adapt `floor-plan-editor.js` to the shared native editor host, preserving image upload/replacement, nearby tools, marker-opened light settings, strips and YAML-only coordinates; rehome the existing focused floor-plan/model assertions and update its configuration guide.
- [x] 3.2 Move energy contributors and ordered power-device forms into native editing, retaining independent collapsed rows, open new entries, names/cost sensors, price/unit/precision settings and local draft behavior; move the meaningful existing energy draft/disclosure assertions to the surviving owner and update the energy guide.
- [x] 3.3 Carry room/group/scene membership and per-member options into native forms without discovery refill; verify explicit emptiness, order, filters and binding changes preserve attached/unknown settings through focused existing model assertions, and update the relevant group guidance.
- [x] 3.4 Carry current media/camera/remote, climate, vacuum/appliance and access/alarm form options into the shared native editor; verify structured commands, provider/popup bindings and hidden access aliases retain their values without dispatching services. Update affected card configuration examples alongside each adapter.
- [x] 3.5 Preserve Wallbox number/input_number current presets and authoritative selected-only coloring while retaining the generic number card's existing behavior; reuse the current targeted shortcut assertion and document the distinction without adding a generic numeric shortcut feature.

## 4. Self-contained details and inert previews

- [x] 4.1 Extract per-card detail composition from `compile-dashboard.js` for shared use by native cards and conversion; verify independent expected media/climate/access/alarm/camera/group/scene/energy/floor-plan detail structures and update popup ownership documentation.
- [x] 4.2 Add occurrence-owned automatic sheet lifecycle, cleanup and native duplication/move handling; verify two differently configured copies remain independent, deletion releases only its owner, and explicit external references/custom content do not gain duplicate sheets using focused popup/navigation assertions.
- [x] 4.3 Apply native edit/preview protection through nested controls, fullscreen, navigation and action dispatch; use safe fake entities and existing action tests to verify no preview service calls, cancelled access gestures and exactly-once completed runtime dispatch. Document retained runtime interaction behavior; leave camera playback/transport to manual inspection.

## 5. Shared settings, maintenance and native editing access

- [x] 5.1 Add the localized shared Marao settings dialog and guarded baseline-preserving native save; verify one edit reaches every page, unresolved destinations are shown, new unlisted pages add no routes/false selection, and stale/non-admin writes preserve saved data.
- [x] 5.2 Redirect administrator pencil/maintenance Edit dashboard to native HA editing and add shared settings access; verify administrator-menu versus regular-user refresh behavior, flags, cancellation, modal guards and exactly-once actions with existing navigation tests.
- [x] 5.3 Preserve the visible native header/edit fallback when navigation is empty and both main-page shortcuts are hidden; verify editing remains reachable and opt-out/exit restores unrelated HA shell/style state. Document raw-editor opt-in with one valid current-view route, preserving existing views, subsequent visual shared-settings editing and raw-editor recovery after deliberate empty navigation.
- [x] 5.4 Adapt the existing safe realistic pages and relevant `card-test` examples under the same dashboard root to demonstrate native card configuration and shared navigation; review fixture differences for retained helper/configuration state instead of adding a new dashboard or device matrix.

## 6. Explicit conversion, provenance and recovery

- [x] 6.1 Extend the existing ordered source/converter chain with ordinary-native target output and input classification; add a provenance-backed v0.23.4 envelope fixture with independently specified target expectations covering paths/landing/order, empty sections, fixed/resolved layouts, raw cards and same-entity occurrences. Verify unsupported/newer input and already-native documents remain untouched.
- [x] 6.2 Implement source-to-target accounting and inert migration provenance for opaque source-only fields and original YAML text; verify active raw/custom popup content is retained and exact original source/envelope/comments remain recoverable. Update the migration guide to explain active options, provenance, authenticated source visibility and YAML formatting limits.
- [x] 6.3 Add exact recovery/proposed-output exports and explicit staged import with current-baseline/privilege/single-flight checks; verify invalid source, unresolved private dependencies, missing recovery data, key/root collisions and stale drafts cannot replace saved configuration. Document matching package/data backups and HA's simultaneous-save/disk-acknowledgement limits.
- [x] 6.4 Implement original/converted/divergent recovery classification and repeat-import behavior; use focused failure assertions to verify interrupted or uncertain writes do not trigger destructive retries or reconvert native edits. Document rollback using the matching package/data and preservation of subsequent native work before restoration.
- [x] 6.5 Reuse the preserved-install backup/upgrade helpers for one focused migration/recovery check on `192.168.0.28`, justified by active persisted-document replacement. Verify exact originals, unchanged registration/root/settings/helpers, independent saved-state comparison, native edit retention after reload, failure classification and matching rollback/reapply. Preserve recovery evidence; finish with the final converted dashboard, not a fresh fixture reset.

## 7. Builder retirement, distribution and guidance

- [x] 7.1 Replace legacy strategy/editor entry points with read-only rendering and explicit conversion/export/native-editor guidance; verify old editor bookmarks cannot mount an active builder or rewrite converted native data, and document the transition at the existing native-authoring URL.
- [x] 7.2 Remove panel/Monaco authoring imports/build entries after retained forms and details have moved; rebuild the editor/runtime/converter/HACS graph and verify package tests find no retired active-builder dependency, missing current asset or new Python/third-party runtime dependency. Keep required historical readers and frozen rollback reference.
- [x] 7.3 Adapt `prepareFrontend()`/native readiness and safe fixture preparation to recognize ordinary converted dashboards without implicit conversion, source replacement or helper reset; verify the existing installer/readiness assertions and update local-development instructions.
- [x] 7.4 Align README, configuration/card/migration docs, project guidance and source/check maps with the single native workflow and retired builder tests; review changed links and the affected selector plan. Record supersession of completed builder/native-retirement deltas so later spec synchronization cannot revive removed obligations.

## 8. Final integration and handoff

- [x] 8.1 Review the final diff and requested outcomes against completed group-local evidence; run only the remaining essential affected checks serially and resolve relevant failures. Reuse successful host/migration evidence unless final edits invalidate it; do not run full/mobile/theme/camera-transport campaigns.
- [x] 8.2 Install final applicable assets on disposable HA after final edits using `prepareFrontend()`; use full preparation only for genuinely changed fixtures/setup. Verify current served assets/readiness and retained ordinary source, leaving the converted dashboard/helpers installed at `/marao-dashboard` with no redundant unchanged reinstall.
- [x] 8.3 Hand off the native test URL/reload guidance and a short manual watch list for native sizing/visibility, floor-plan/energy editing, duplicate popup ownership and all-page navbar behavior. Identify actual checks, manual camera/phone coverage and any remaining limitation honestly.

## Workflow follow-up

- Archive/sync only after implementation and the selected checks are complete; apply this delta after superseded builder changes and reconcile baseline historical notices/purposes.
- A later explicit push/tag/release request runs `npm run verify:publish` across the whole candidate, serial unit checks only, plus applicable package metadata checks and final-candidate installation. Reuse development integration evidence; publication is outside this implementation checklist.
