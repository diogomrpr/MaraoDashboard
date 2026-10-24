# Tasks

## 1. Layout configuration and compatible generation

- [x] 1.1 Capture implementation starting commit/dirty snapshot and acceptance scope for both alarm templates and their generated/direct consumers; preserve unrelated work.
- [x] 1.2 Add the localized Dropdown/Grid catalog/editor setting and shared validation for `variables.alarm_layout`; set Dropdown only on new cards/stubs/starters. Extend targeted editor checks for valid/invalid values, existing omission and lossless unrelated-field round trips; document the setting and legacy behavior in the alarm usage page.
- [x] 1.3 Forward the owned setting into generated automatic alarm controls while preserving authored actions and external popup ownership. Extend the existing generation checks with independent expected child configuration and unchanged legacy-source assertions; do not rewrite historical inputs or protected YAML.

## 2. Shared alarm rendering and action policy

- [x] 2.1 Add the themed alarm dropdown using the existing dropdown owner and shared alarm dispatch path. Verify explicit selection sends once without a hold, while opening/browsing/dismissal/current-mode selection sends nothing; preserve required-code checks, transient cleanup, authoritative state and inert previews. Update focused security unit checks and documented dropdown confirmation behavior together.
- [x] 2.2 Add the two-column arming grid with separate full-width Disarm slide using shared strict-slide mechanics. Retain grid bypass holds and legacy row holds. Verify complete-release single dispatch, partial/vertical/outside/cancelled gesture rejection, late target/availability changes and code errors with the safe alarm tests; retain access-service authorization regressions.
- [x] 2.3 Preserve mounted inputs, active gestures/menu state and fixed state/code/error slots across ordinary HA updates. Add only the focused regression assertions needed for this layout. Update the quality guide's alarm row/hold rules and feature coverage map to describe the user's layout-specific exceptions and English/Portuguese labels.

## 3. Integrated examples and handoff

- [x] 3.1 Add compact Dropdown/Grid examples to the existing card-test gallery and one realistic Security-page example using safe alarm fixtures; retain an unset legacy example. Reuse existing fake entities and document the manual watch list for two-column labels, full-width slide and menu interaction.
- [x] 3.2 Build editor/package assets and run the smallest selected alarm/editor/generation checks for the changed security and compatibility paths. Resolve relevant failures; compare each requested outcome with the implementation and evidence. Do not run full/mobile/camera campaigns or physical-device actions.
- [x] 3.3 Install final applicable changes once on disposable `192.168.0.28`, preserving configuration and helper state, and verify served assets/readiness through the existing installer. Leave changes installed and report the URL, actual checks and manual gesture/appearance limits; installation failure means not ready for test.

## Workflow follow-up

- Implementation requires a subsequent apply request; this proposal changes no runtime code or device state.
- If publication is later requested, run unit-only `npm run verify:publish` across the candidate and satisfy the existing install/metadata gates. No release or extra integration campaign is authorized here.

## Implementation evidence — 2026-10-24

Starting commit: `77fd032fcfd5bf59df54c23dd8b9d8ffe2d2bed9`; private dirty-state baseline: `/private/tmp/marao-pending-20261024.json`. Scope: shared alarm controls/slide, catalog, builder validation/defaults, generation and safe examples. Omitted layouts retain legacy holds; new builder cards/starter snapshots explicitly select Dropdown. Security tests cover layout-specific confirmation, codes, live guards, cancellation and access-service isolation; generator assertions cover additive forwarding and source preservation. Standalone native-editor requirements are superseded by removal in the same batch. Routine dropdown/grid appearance and phone gestures are handed to the user under current AGENTS.md.

Final installation: disposable `192.168.0.28`, `/marao-dashboard/card-test`, served assets and readiness verified. Original safe helper state, exact protected raw-card settings and independently owned dashboard files/registrations were preserved. Exact recovery archives remain private on the disposable host. Focused checks, reproducible editor build and strict change validation passed. Routine phone/visual checks and all camera playback/transport checks were not run.
