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
