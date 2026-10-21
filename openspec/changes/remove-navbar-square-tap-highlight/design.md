# Design

## Context

The user reports a square background on navbar activation. `MaraoNavigation.js` owns all rendered navigation: horizontal destinations and the overflow toggle are semantic buttons; overflow destinations are anchors. Both use 48px circular styling and a brief active transform/filter. There is no explicit tap-highlight or button-appearance reset. Existing callout/selection suppression targets the horizontal navbar and descendants. A browser highlight or default native button appearance is a plausible cause, not yet a reproduced diagnosis.

`frontend_src/MaraoNativeNavbar.js` delegates navigation to this renderer; generated, standalone, persistent-root and preview uses share it. The completed startup/hold work makes the navbar available before deferred content and preserves it across views. Do not move styling into that deferred content or undo semantic buttons to hide the artifact.

## Goals / Non-Goals

**Goals:** remove the reported rectangular activation background at the shared source while retaining the accepted circular active indicator and existing gestures.

**Non-Goals:** a new design, route/action changes, altered hold thresholds, new ripple/focus UI, changed geometry, global HA styling or a saved option.

## Decisions

### Localize the fix to the navigation controls

Inspect one held press on the disposable/native or local existing navbar harness to distinguish browser tap highlight, button appearance and icon-owned paint. Apply the smallest shared reset in `MaraoNavigation.js`: suppress browser tap-highlight paint and normalize button appearance where required, covering icon content and overflow controls without globally resetting other HA components. Inspect open icon rendering only if the artifact persists; do not patch `ha-icon` globally or introduce wrapper-specific fixes.

Preserve deliberate `.active` background, circular border radius, short active transform/filter, haptics and hold progress. Do not clear every background or remove the feedback that identifies the selected route. Keep semantic controls, internal accessible names, focus handling and the 48px resting geometry unchanged. CSS is preferred; alter event handling only if a reproduced cause actually requires it, in which case select behavior verification explicitly.

### Keep the rest of the end-to-end path stable

Builder/editor fields, route validation, generator/native conversion, saved order/labels/icons/paths, explicit emptiness and unknown fields need no change. No new translation or user-facing text is expected. Preserve theme tokens; inspect the same pressed states in both light and dark appearance. Popup inert/focus ownership, safe-area offsets, early loading, overflow scrolling and refresh cancellation remain shared contracts, not new implementation work.

### Inspect the transient state, not only the resting navbar

Use the existing local startup/refresh or disposable navbar tooling. Inspect pointer/touch down on an inactive icon, active icon, More toggle and overflow destination before releasing, then inspect release/cancellation. Include padding around an icon so suppressing only the icon is not mistaken for a complete fix. Representative Android Chromium and iPhone/WebKit paths cover distinct browser paint behavior; automation does not establish physical-phone/Companion behavior.

For a CSS-only change, select the visual tier and perform targeted current inspection at a narrow mobile width, with representative both-theme appearance. Verify a normal tap and the existing hold/cancel behavior still work using the same visit; reuse applicable existing interaction evidence rather than running every navbar suite. Add no tests that merely match a CSS string. If input logic/geometry changes, use the smallest covering interaction assertion and applicable focused/publish geometry coverage.

Update existing `ha-test/cases.json`/navbar gallery coverage and the realistic navbar example with a concise pressed-state inspection case; reuse current route configurations instead of adding a second gallery/dashboard. Update usage/quality guidance only where it describes the press appearance. Resolve the reviewed shared-file component scope through the existing verification map, without automatically selecting every native-card suite.

## Risks / Trade-offs

- **Artifact depends on browser-native paint** → inspect held touch states on distinct Chromium/WebKit paths; keep any unverified physical-device limit explicit.
- **Broad resets erase intended active styling or affect other controls** → scope the reset to shared navbar controls/content and retain the selected-circle check.
- **Event changes accidentally break refresh or navigation** → keep a CSS-only boundary where possible; verify actual activation/cancellation if that boundary changes.

## Compatibility and delivery

Presentation only: no saved data, public configuration, generated ownership or migration change. The application affected set is the shared navbar and generated/native/standalone/preview/overflow consumers. Capture a fresh task baseline before implementation and preserve concurrent work.

Only disposable `192.168.0.28` may be used. Leave successful current assets installed and clean up temporary safe state under the existing workflow. This planning request performs no deployment or implementation. Before any later publication, use scoped `verify:publish` and applicable exact-commit checks; this UI-only fix does not itself require historical upgrade testing or a full mobile matrix.

## Apply evidence — 2026-10-20

Starting commit: `68a9deb96ffd5164949ac6c20f040beed57d654d`; task snapshot: `/private/tmp/marao-adaptive-navbar-apply-20261020.json`. Affected consumers are the shared generated/native/standalone/persistent/preview/overflow navbar. The disposable Chromium baseline reports button appearance `auto` and inherited `rgba(0, 0, 0, 0.1)` tap highlight on both button and icon. The private held-press capture did not conclusively reproduce the user's exact square; physical Android/Companion behavior is not claimed. The fix explicitly suppresses only navbar browser paint and normalizes its buttons; interaction code is unchanged.

Current disposable frontend `cdf5a717eabe94b8` was inspected on 320px Android Chromium and 390px iPhone-shaped WebKit in light/dark navbar appearance. Active/inactive controls, icon content, More and overflow destinations had transparent browser tap paint, circular styling and unchanged 48px resting bounds. Representative held-state captures were visually inspected. Tap and Enter navigation passed; Chromium completed a real three-second refresh without navigation, while cancelled presses retained the current route. No page/console warnings/errors or HTTP failures were reported. WebKit used pointer-held captures and touch taps, not physical iPhone/Android OS gestures. Private evidence is retained with the task scope.

The reviewed visual-tier scope is docs plus `navbar-startup`, with no unresolved mappings; the separate adaptive task bookkeeping was excluded from this navbar selection. No automatic suite, publication, historical upgrade or physical-phone check was run. Fixture edits add only coverage/instructions; YAML/JSON parsing passed. Current frontend assets remain on the disposable instance; no helper or saved dashboard writes were made by the interaction inspection.
