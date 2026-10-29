# Tasks

## 1. Popup layout

- [x] 1.1 Change the shared media popup generator to the three-column Marao control grid, update usage documentation, and verify independent generator expectations plus the existing app-grid reflow test.

## 2. Installation

- [x] 2.1 Review the scoped diff and OpenSpec validation, then install final current changes on disposable 192.168.0.28 with one full preparation, restore saved helper state, and confirm served-asset/readiness checks.

## Verification notes

- Starting commit `036190cd3e7227c73a7608180036484bad87449b`. Camera event feed and refresh-spacing work was already dirty and was preserved outside this task’s checks.
- Two targeted generator tests passed; existing logo-only app-grid reflow test passed. OpenSpec strict validation and diff whitespace checks passed.
- Configured page columns remain unchanged; the generated popup app group alone changes to three preferred columns. App sources/order/launching and remote rows reuse existing code.
- Installed all current changes on disposable `192.168.0.28` with one preparation/restart. Served-asset/readiness checks passed. Existing test JSON was preserved (verified as serialized JSON); saved safe helper states were restored and verified. Local fixture source was restored exactly after staging the existing configuration.
- Real-phone appearance remains a manual check; no browser campaign or device matrix was run.

## App-button feedback follow-up

- [x] Add shared hover and touch-press treatment over app artwork, preserving disabled states, dispatch, sizing and reduced-motion preferences; review CSS and reuse targeted app behavior/branding checks.
- [x] Install final compatible frontend assets on disposable 192.168.0.28 with served-asset/readiness confirmation.

Baseline: `/private/tmp/marao-app-shortcut-hover-start.json`; starting commit `036190cd3e7227c73a7608180036484bad87449b`. Both page and popup app tiles share the affected MaraoCards styles; prior unrelated installed changes remain preserved.

Follow-up evidence: shared CSS review confirmed hover-capable-pointer gating, enabled-action guards, an artwork-level edge that cannot intercept taps, and shared mouse/touch press feedback without layout changes. Both selected existing media-app behavior/disabled-state and branding checks passed. No tests were added for trivial CSS declarations. Diff checks and strict OpenSpec validation passed; the native/popup scope plan has no unresolved mappings and broad checks were omitted. Final current frontend assets were installed on disposable `192.168.0.28`; served-asset/readiness checks passed. Visual pointer/phone inspection remains with the user.

## Icon-size refinement — 2026-10-28

- [x] Cap shared app surfaces at 80px square with 18px corners and center them in existing cells; preserve actions, names, ordered app sources, disabled feedback and grid capacity. Review CSS and reuse the two focused media-app checks.
- [x] Install final compatible frontend assets on disposable 192.168.0.28 and confirm served assets/readiness; hand off routine phone appearance.

Evidence: baseline `df63f39c8da1b48dd4fa9e15a7d88c4ac8386d84`, task snapshot `/private/tmp/media-app-icon-size.json`. Shared CSS overrides full-cell stretching for app surfaces only. Both existing media-app visibility/disabled and branding checks passed, strict change validation passed after retaining the baseline's additional compatibility scenario, and diff review found no interaction or saved-source changes. `prepareFrontend()` installed identity `aefe1ecb031cf5b374d34059ffbe484ee1f117eb865bcde1df77d0bca0a49db2` with served-asset/readiness checks. Prior preset-color and editor-spacing edits remain installed. No browser/phone inspection or camera checks were performed.

User size adjustment: increased the final shared surface to 80px square with 18px corners after feedback that 64px was too small. CSS review, diff checks and strict validation passed; unchanged behavior checks were reused. Final disposable installation identity is `6ea8f9631609b267b53067f7e6ed87f386ed96d1bf9bc35516665613a5b1b854`, with served assets/readiness confirmed. Phone appearance remains manual.

## Hover-shadow refinement — 2026-10-28

- [x] Replace the border over app artwork with a soft outer shadow in shared styles; retain lift, press compression, disabled-state guards and reduced-motion handling.
- [x] Review the final CSS and existing targeted app checks, rebuild assets and install on disposable `192.168.0.28` with served-asset/readiness confirmation.

Baseline: `df63f39c8da1b48dd4fa9e15a7d88c4ac8386d84`, snapshot `/private/tmp/media-app-hover.json`. Shared app-card styles cover page, popup and native hosts. Saved settings and prior unrelated changes are preserved.

Evidence: the two existing media-app artwork/disabled-state and branding checks passed. CSS review confirmed outer shadows, enabled-pointer guards, short transitions and the matching reduced-motion override. Strict change validation and whitespace checks passed. Final installation identity `b75af10efa662f4d1cac665baf183cad944c2d795b8a640ee7cc9f5d0ea5eecd` passed served-asset/readiness checks. Browser/phone appearance remains manual; no new test or fixture was added for this CSS-only adjustment.
