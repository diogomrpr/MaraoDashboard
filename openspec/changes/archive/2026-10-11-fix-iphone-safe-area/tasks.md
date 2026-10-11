# Tasks

## 1. Establish the regression cases

- [x] 1.1 Record the current affected-card inventory from the gallery and generated views, inspect the active dashboard/overlay safe-area ownership on disposable `192.168.0.28`, and capture a private baseline of first-content, sheet and navbar geometry; verify the served fingerprint and record any connection/resource defect that prevents reliable inspection.
- [x] 1.2 Extend the existing accessibility browser checks to exercise app-provided insets with zero/different browser insets and no Marao test overrides, browser-only insets, synthetic 47px/59px top values, zero values, host-padded content and live portrait/landscape updates; verify that the current runtime fails the missing-app-inset geometry case and that the fixtures do not merely check injected variables.
- [x] 1.3 Extend `tests/frontend/accessibility-profiles.test.js` for independent inset-source selection/cleanup and document the focused safe-area check in the local development guide; verify the focused profile tests pass and the documented command selects the intended cases without deploying elsewhere.

## 2. Fix shared shell and navbar clearance

- [x] 2.1 Update shared safe-area expressions in `MaraoCards.js` to use the Marao development override, locally inherited Home Assistant resolved inset and browser fallback in that order; apply top/side clearance at one active page owner, preserve normal spacing and explicit zeros, and verify app-only, browser-only, zero and already-safe-host geometry cases pass without per-model constants.
- [x] 2.2 Scope fullscreen mutations to the active dashboard and preserve/restore all changed style values and priorities on view replacement and route exit; add meaningful lifecycle regression checks to the existing navbar test coverage and verify native settings/editor layout is unchanged after repeated exit/reentry and disconnected/replaced navbar instances.
- [x] 2.3 Use the same host-aware source for existing navbar clearance, retaining the accepted bottom offset and safe landscape width; run `node --test tests/frontend/marao-navbar-card.test.js tests/frontend/accessibility-profiles.test.js` and `npm run test:ha:alignment`, then verify 48px targets, compact wrapping and last-card reachability in the focused browser cases. Update the quality guide's inset ownership guidance in the same batch.

## 3. Keep popup content within safe bounds

- [x] 3.1 Constrain the overlay's sheet area and maximum usable height to current top/side safe bounds while retaining the full-screen backdrop, configured auto/fixed heights, column-width centering and bottom clearance; extend focused browser checks and verify tall, short and open-during-rotation sheets keep their title/close control accessible without duplicate top padding, background scroll or loss of restored focus.
- [x] 3.2 Update representative auto/fixed/tall popup coverage in canonical `ha-test/` fixtures and a realistic generated-page counterpart, reusing existing safe entities and adding a full-height case only if needed; pass `node --test tests/frontend/gallery-cases.test.js` and the relevant fixture validation, verify coverage remains on `/marao-dashboard`, and document the safe-area popup behavior alongside its existing options.

## 4. Validate the integrated layout

- [x] 4.1 Run the relevant focused unit/profile/gallery and safe-area browser checks after the last edit, run `npm run ha:sync:dry-run`, synchronize only disposable `192.168.0.28`, and confirm its current frontend fingerprint; pass the added app/browser source cases, `npm run test:ha:alignment` and `npm run test:ha:accessibility`, preserving strict warning/resource/console diagnostics and both themes with the supported mobile text/zoom profiles.
- [x] 4.2 As the final validation step, visually inspect every card in the recorded affected set across the complete Cases gallery, realistic product views and affected popup contents on the disposable dashboard. Check 320px, iPhone/Android portrait/landscape, both themes, supported text/zoom modes, top/side clearance, centering, spacing, wrapping, clipping, overlap, scrolling, cold load, orientation/inset updates and route exit/reentry; fix any defects, repeat focused checks and repeat the final visual inspection before marking complete.

## Workflow follow-up

- Report automated emulation separately from actual iPhone app inspection; do not claim the other installation or a physical phone was tested. Optional user confirmation should use the disposable instance and does not replace the automated gate.
- Synchronize capability deltas and archive only after implementation and verification are complete and the archive workflow is requested.
- Before any future push, tag or release, pass `npm run verify:publish` against the disposable instance and satisfy exact-commit GitHub Tests, hassfest and HACS validation. Keep `confirm-home-assistant-reconnect-fix` and `refresh-marao-brand-identity` separate; neither is completed by this change.
