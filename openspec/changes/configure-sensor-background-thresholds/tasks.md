# Tasks

## 1. Optional threshold contract and preservation

- [x] 1.1 Record the implementation start commit, dirty-state snapshot, acceptance cases and affected sensor/editor/generator consumers; verify the recorded scope includes canonical aliases and sensor group members while preserving unrelated work.
- [x] 1.2 Add `background_thresholds` to the sensor catalog, Python page-model/generator validation, frontend model/JSON schema and direct runtime validation. Verify targeted assertions accept finite ascending numeric bounds and hex colors, reject malformed/duplicate/descending rules and binary targets, and retain invalid drafts with readable errors.
- [x] 1.3 Preserve lists through generation and ordinary edit/duplicate/move round trips, including unknown row fields, explicit emptiness and omitted settings. Verify independently specified v0.20.0/legacy sensor inputs remain unchanged, unrelated/raw cards stay intact, and document the optional variable contract in the sensor-card guide.

## 2. Shared sensor background appearance

- [x] 2.1 Apply the greatest inclusive matching lower bound to unrounded numeric source states in the shared sensor appearance path, retaining normal fallback and availability/problem precedence. Verify small existing runtime assertions cover 39.9/40/59.9/60, zero/negative/fractional readings, rounding independence, nonnumeric/nonfinite states and authoritative state updates; retain representative binary and battery regression assertions.
- [x] 2.2 Apply contrasting text, metadata and icon foreground to matched opaque hex backgrounds using an existing suitable helper or the smallest local contrast calculation. Verify light/dark literal examples with targeted assertions, and document source-unit comparison, below-first fallback and readable examples in the sensor guide.

## 3. Visual editing and safe examples

- [x] 3.1 Add localized threshold/color row controls using shared number and color inputs, plus add/remove controls, source-unit help and inline errors. Verify a targeted editor/model test covers add/edit/remove, empty-list persistence and Visual/JSON preservation; regenerate assets and pass `build:editor` and `check:editor`.
- [x] 3.2 Add a safe humidity threshold example to Cases and a realistic page, reusing existing disposable helpers where suitable. Update the reviewed catalog/case coverage inventory and feature documentation; verify the small gallery and upgrade-inventory consistency assertions without running browser or historical-upgrade suites.

## 4. Final integration and handoff

- [x] 4.1 Review the final task diff and selected affected-check plan, run only essential scoped assertions not already demonstrated, and verify every requested outcome against the implementation. Install the final current changes on disposable `192.168.0.28` using the fastest compatible preparation path; confirm served assets/readiness and preservation of source and safe helper state. Hand off with the test URL and a short manual watch list for boundary colors, foreground readability and mobile row editing; state any unchecked behavior honestly.

## Workflow follow-up

- This change is planning only until the user explicitly requests apply.
- Before any later requested push, tag or release, run the unit-only `npm run verify:publish` gate across the release candidate. No additional integration/full campaign is implied.
- Sync accepted delta specs and archive only after implementation and required verification are complete, through the applicable workflow.

Implementation baseline: `be49486dc38e8625f6982e524d9dd25c728755d6`; snapshot `/private/tmp/marao-three-start.json`. Three prepared changes form one batch. Existing duplicate local files and untracked planning artifacts are preserved. Acceptance and affected consumers follow this change’s specs/design, including explicit legacy/primary-action/security compatibility cases.

Essential local evidence: 333 selected Node assertions passed (sensor boundary/contrast/availability, editor row/model/JSON preservation, history/primary-action separation, event rendering and access explicit-outcome feedback); 69 Python gallery/upgrade-inventory checks plus the targeted generator threshold-preservation check passed. Editor build and reproducibility check passed. The affected-component plan is `/private/tmp/marao-three-plan.json`. No browser/phone/camera playback or full-suite campaign was run. Installation and served-asset/readiness checks passed on disposable `192.168.0.28`. Exact serialized source matched the intended owned Cases/safe humidity update, other configuration and independent dashboard bytes were preserved, and all original safe helper states were restored. Private installation confirmation: `/private/tmp/marao-three-installed.json`.

Handoff: `http://192.168.0.28:8123/marao-dashboard/card-test`; reload the page. Manual watch list: threshold boundary/background readability and row editing, access pulse/shimmer/checkmark plus phone vibration, compact history icon/hold versus short-tap behavior and popup return. Reconnect and bandwidth-adaptation changes were untouched. Concurrent `move-marao-to-native-frontend` planning artifacts were also left untouched and excluded from this implementation. No publication or archive was requested.
