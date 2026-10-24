# Tasks

## 1. Shared period consumption and summaries

- [x] 1.1 Record the implementation starting commit and dirty-state snapshot, then select the reviewed energy/history behavior scope with `test:affected --plan`. Confirm the affected consumers include generated day/month tiles, raw/native hosts, popups and calculated-cost variants; preserve unrelated concurrent work.
- [x] 1.2 Extend the existing energy period loader and summary renderer to use selected-period consumption from Recorder statistics or valid reset-aware counter history. Reuse existing conversion/bucket helpers; keep contributors, neighboring periods and chart modules out of summary-only loading. Update `tests/frontend/marao-energy-format.test.js` with one-source day/month examples proving `10 kWh` today and `250 kWh` this month, tile/popup agreement, unit/precision preservation and resetting-source compatibility; run only the relevant existing Node checks serially.
- [x] 1.3 Calculate estimated tile costs from period consumption, retaining dedicated-cost precedence, tariff validation and estimate markers. Replace the existing raw-source/no-history cost expectation with a regression proving `10 kWh` at `0.25 EUR/kWh` produces estimated `2.50 EUR` despite a `10250 kWh` lifetime state; verify the targeted cost test passes.
- [x] 1.4 Preserve empty, partial, loading, error/retry and availability behavior without falling back to lifetime state or invented zero. Add small assertions to the existing energy/history tests for missing baselines, partial-month approximation, valid zero, signed totals and source replacement; verify known consumption survives an unrelated price failure.
- [x] 1.5 Add bounded visible/connected current-period refresh and HA-local day/month rollover using the existing freshness policy and cleanup guards. Extend the existing card lifecycle test with controlled time to verify newer statistics update a mounted tile, unrelated `hass` updates do not refetch, stale completions are ignored, and removal/editor preview cannot leave timers or requests running.
- [x] 1.6 Update the existing card documentation and necessary English/Portuguese catalog/editor guidance with a same-source day/month example, statistics metadata requirements, recording lag and missing-history limits. Review generator/native/editor forwarding and affected released configuration fixtures to confirm no new required option or source migration; add a narrow preservation assertion only if those paths change. Update the smallest existing safe gallery/product-page example to demonstrate the paired cards from one cumulative fake source, keeping all fixtures under `ha-test/` and the existing `/marao-dashboard` root. Verify changed documentation links and example configuration agree with the implementation.

## 2. Install and hand off

- [x] 2.1 Review the final task diff against the starting snapshot and selected acceptance cases, build only affected generated frontend assets, and install the final applicable batch on disposable `192.168.0.28`. Use `prepareFrontend()` directly for compatible frontend-only work, or `npm run ha:sync` if changed backend/fixtures require it. Verify served assets/readiness, retain user configuration/helper state, and report the test URL, actual targeted checks and a brief watch list for period totals, popup agreement and rollover. Do not mark implementation ready for testing if installation fails.

## Workflow follow-up

- Implementation begins only when the user asks to apply this change. All tracked tasks remain unchecked until completed with evidence.
- A later push, tag or release requires the unit-only `npm run verify:publish` publication gate. No full suite, browser matrix or camera playback checks are implied by this plan.
- Archive only after implementation, essential checks and disposable installation are complete; keep unfinished work out of baseline specs.

## Implementation evidence — 2026-10-24

Starting commit: `77fd032fcfd5bf59df54c23dd8b9d8ffe2d2bed9`; private dirty-state baseline: `/private/tmp/marao-pending-20261024.json`. Scope: shared energy summaries, popups, tariff formatting, history lifecycle and safe source examples. Existing source/period/formatting forwarding remains unchanged; no persisted format or migration was added. The day/month and estimated-cost regression uses one lifetime counter. Energy/history checks cover missing data, signed/reset arithmetic, rollover, stale completions and removal; summary loads exclude contributors and chart modules. Safe product/gallery examples share a cumulative source. Routine visuals remain a user watch list under the current AGENTS.md policy.

Final installation: disposable `192.168.0.28`, `/marao-dashboard/card-test`, served assets and readiness verified. Original safe helper state, exact protected raw-card settings and independently owned dashboard files/registrations were preserved. Exact recovery archives remain private on the disposable host. Focused checks, reproducible editor build and strict change validation passed. Routine phone/visual checks and all camera playback/transport checks were not run.
