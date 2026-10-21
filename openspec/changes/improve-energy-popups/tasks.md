# Tasks

- [x] Record starting commit `c27d3bd`, requested acceptance cases, additive
  compatibility and shared generated/native/direct energy consumers.
- [x] Carry ordered `sub_entities`, optional `cost_per_kwh` and `calculate_cost`
  through schema, validation, visual/native editors, generator and owned sheets,
  preserving existing sources, order, explicit empty lists and unknown fields.
- [x] Implement Recorder statistics and raw-history consumption intervals with
  full-precision conversion, resets, signed totals, DST and missing-data handling.
- [x] Render minimalist daily/month and hourly/day bars with exact values,
  contributor names/period totals and a compact circular comparison.
- [x] Prefer dedicated cost sensors; resolve only an explicit override or
  unambiguous HA Energy tariff and label calculated historical cost as estimated.
- [x] Update affected safe Energy examples, translations and configuration docs.
- [x] Run the smallest relevant existing checks serially, build generated assets,
  and review each requested outcome against implementation/evidence.
- [x] Install the final batch on disposable `192.168.0.28`, verify served assets
  and readiness, and hand off the test URL with a short manual watch list.

No publication is requested. A future push/tag/release requires the separate
unit-only publication gate; it does not authorize additional integration tests.

Selected evidence: existing Node history data/chart/runtime tests, energy editor
and native preservation checks, JSON catalog assertions, safe-page bindings,
Python energy validation/generation checks, and the safe demo template/history
consistency assertion passed serially. Generated editor/chart assets built;
OpenSpec strict validation and diff whitespace review passed. Historical raw
popup assertions now follow interval/missing-data semantics; their browser run
and routine phone appearance checks remain unperformed for manual handoff.
Unrelated starting visibility/theme edits were preserved and excluded from this
task's verification; their current assets are included in installation.

Installation: `npm run ha:sync` completed on disposable `192.168.0.28`, including
backend/fixture restart and current-asset/readiness checks. Existing safe helper
values were saved privately and restored after preparation. The Energy demo is
available at `/marao-dashboard/energy`; no production target was contacted.

Visual follow-up: reduced shared popup insets/gaps, removed the repeated energy
title and nested chart frame, moved axis units above whole-number ticks, and
shortened labels/navigation while retaining exact selected readings and errors.
The existing chart and energy-format Node suites passed (26 tests); syntax and
diff checks passed. `prepareFrontend()` rebuilt, installed and verified final
assets on disposable `192.168.0.28`. Phone appearance remains for user review.

Day-focus follow-up: month sheets open in the monthly overview. Bar/day-arrow
selection focuses contributor energy, actual/estimated costs and the donut on the
same cached day. The Full month button clears the bar selection and restores
monthly totals. Existing chart/runtime suites passed (28 tests), including
missing days, zero usage, selection retention and month changes. OpenSpec strict
validation passed. Browser assertions were aligned but not run.
`prepareFrontend()` rebuilt, installed and verified the final day-focus assets
on disposable `192.168.0.28`; phone appearance remains for user review.

Scroll regression: retain navigation icon nodes while updating chart selection.
Replacing the focused button's icon caused WebKit to reposition the popup.
The installed fix passed the reproduced mobile WebKit sequence: previous day,
previous again, next day and Full month each retained scrollTop 180. The existing
11 chart checks passed, including an assertion that navigation retains arrow
contents. Final assets were installed and verified with `prepareFrontend()`.
No physical phone inspection was performed.

iPhone-app follow-up: icon retention alone did not cover the user's device.
The extended WebKit test reproduced another jump when HA refreshed the card
after a day tap. Chart rendering now preserves ancestor scroll positions, and
selection also restores them after haptic feedback and the next animation frame.
Breakdown replacements are prepared off-DOM; deferred restoration is cancelled
when the chart is destroyed. All 12 chart checks passed, including simulated
haptic/refresh scroll movement. The final installed assets passed the WebKit
previous/next/reset sequence with an immediate HA refresh after each tap and a
constant scrollTop of 180. The native iPhone app remains unverified on hardware.

- [x] Prefetch four neighbouring navigable periods in each direction through
  the shared month/day loader, only after the selected period loads and paints.
- [x] Reuse cached chart/contributor data and in-flight requests, bound the cache,
  retry background failures on selection, and invalidate obsolete sources.
- [x] Verify and install the final prefetch implementation on the disposable instance.

Prefetch follow-up: baseline `c27d3bd`, dirty snapshot
`/private/tmp/marao-energy-prefetch-start.json`. Shared generated/native/direct
energy sheets use the same transient cache; persisted configuration is unchanged
and summaries do not prefetch history. Acceptance covers four periods on either
side (excluding future periods), immediate cached selection, joining pending
reads, bounded cache retention, stale/current and failure retries, invalidation,
and selected-period loading/rendering before any background request. The two
existing energy/history runtime suites pass all 44 checks, including a controlled
paint boundary assertion. Strict OpenSpec validation, syntax and whitespace
checks passed. Existing unrelated work was preserved; no broader suites or phone
inspection were run. `prepareFrontend()` installed and verified final served
assets on disposable `192.168.0.28` after the requested paint deferral was added.

Selected-day readout follow-up: baseline `c27d3bd`, dirty snapshot
`/private/tmp/marao-energy-readout-start.json`. All monthly energy/cost sheets now
reuse the total row for the selected date followed by its exact value. Selection
and Full month reset retain the same visible sections and typography instead of
adding/removing a separate reading row. Missing values remain an em dash, zero
remains zero, and the total returns on reset. Other history and hourly readouts
retain their existing behavior. All 12 existing chart tests pass, including the
updated visible-row/reset assertion; strict OpenSpec and whitespace checks pass.
Browser assertions were aligned but not run. `prepareFrontend()` rebuilt,
installed and verified final assets on disposable `192.168.0.28`. Native iPhone
appearance remains for user review; unrelated starting edits were preserved.

- [x] Replace generated per-family fixed heights and the shared 80dvh default
  with content-driven auto height bounded by the safe overlay below a 50px top gap.
- [x] Pin energy month/day navigation below the measured shared popup header;
  track wrapping/rotation with a lifecycle-owned ResizeObserver.
- [x] Align current gallery defaults, popup guidance and capability requirements.

Popup sizing follow-up: baseline `c27d3bd`, dirty snapshot
`/private/tmp/marao-popup-height-start.json`. Shared sheets, generated family
popups and native/generated energy consumers are affected. Saved source JSON,
raw cards, explicit custom height limits and protected YAML are preserved;
ordinary generation updates only owned presentation output. Historical upgrade
fixtures remain unchanged. The existing navbar/popup suite passed all 9 checks;
23 selected page-generation checks passed, and the updated energy/native default
assertions passed in their 2 existing parameter cases. JavaScript syntax,
OpenSpec strict validation and whitespace review passed. Browser/device layout
inspection remains for the user; no broader test matrix was selected.
Installation completed with the full preparation path on disposable
`192.168.0.28`, including the one required backend/fixture restart and verified
served assets/readiness. Safe helper state was backed up privately and restored.
The final popup/navigation changes remain installed for user testing.

Sticky spacing follow-up: baseline `c27d3bd`, dirty snapshot
`/private/tmp/marao-popup-spacing-start.json`. Increased shared popup title padding
to 20px above/12px below, and replaced the energy period row's transparent bottom
margin with 12px of opaque padding. The gap remains covered while scrolling;
existing header measurement automatically includes the extra title spacing.
All shared sheets and month/day energy/cost consumers use this presentation.
The existing 9 navbar/popup checks, syntax, strict OpenSpec and whitespace checks
passed. No browser or physical iPhone inspection was performed for this visual
follow-up. Final assets were installed and verified with `prepareFrontend()` on
disposable `192.168.0.28`; unrelated current work remains preserved.

Initial pinned-bar movement follow-up: baseline `c27d3bd`, dirty snapshot
`/private/tmp/marao-popup-fixed-start.json`. The supplied recording and a narrow
WebKit reproduction identified the period row moving from y=138 to y=137 after
just one scroll pixel. Moved its initial 8px top gap from the energy surface into
the pinned row's opaque padding, including the narrow container rule. Controls
retain their original visual spacing and no longer travel before sticking.
Native boundary bounce is explicitly retained at the user's request.
The existing 9 popup/navbar checks, syntax, strict OpenSpec and whitespace checks
passed. Final assets were installed and verified with `prepareFrontend()` on
disposable `192.168.0.28`. The reused private WebKit inspection passed at scroll
positions 0, 1, 4, 8, 16, 80, 180, the bottom, and back to 0: title y=50 and period
row y=130 throughout, with overscroll containment/bounce unchanged. Browser was
closed without changing fixtures. Native iPhone hardware remains unverified.

Responsive comparison follow-up: baseline `c27d3bd`, dirty snapshot
`/private/tmp/marao-energy-breakdown-layout-start.json`. Energy/cost detail sheets
now place the donut and readable legend in a shared row, passing the existing
`controlGridStyles()` output into the lazy chart renderer rather than copying
its breakpoint formula. The two-column/8px policy retains the shared 136px and
7.5-times-primary-font capacity rule, stacking when two cells cannot fit. Existing
zero/missing/negative cases without a donut retain a full-width list. Notes and
headings remain above the comparison. No saved configuration changed.
The existing chart/energy-format suites passed all 29 checks; syntax, whitespace
and strict OpenSpec validation passed. Current generated assets were rebuilt,
installed and verified by `prepareFrontend()` on disposable `192.168.0.28`.
Phone appearance and responsive transition review remain for the user; no new
browser matrix or broader tests were selected. Unrelated changes are preserved.

Coverage-label follow-up: baseline `c27d3bd`, dirty snapshot
`/private/tmp/marao-energy-labels-start.json`. Removed the partial-recorded-period
contributor label and incomplete-history notice from all energy/cost sheets.
Approximation markers, missing readings, estimates and actual source/history
errors remain accurate. Other numeric history charts retain their coverage
notice. Removed unused translations and aligned the guide/spec wording.
All 29 existing chart/energy-format checks passed, including limited energy data
without a visible coverage notice. Strict OpenSpec and whitespace checks passed.
`prepareFrontend()` rebuilt, installed and verified final served assets on
disposable `192.168.0.28`. No phone/browser visual inspection was performed.
