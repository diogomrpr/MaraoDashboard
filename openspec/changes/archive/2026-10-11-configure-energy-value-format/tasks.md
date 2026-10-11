# Tasks

## 1. Shared conversion and numeric presentation

- [x] 1.1 Record the exact affected-card inventory and add the shared opt-in conversion/formatting helper in the existing runtime, with explicit finite numeric guards and the design's power/energy factors; verify focused tests for W↔kW, Wh↔kWh, J↔Wh, case-sensitive mW/MW, signed/zero readings, fixed 0/2/6 decimals, automatic formatting, locale punctuation and invalid/incompatible values, and document the two keys and unit choices in card usage guidance.
- [x] 1.2 Route period, graph/toggle-graph, energy sensor/base and switch secondary-power displays through the helper only when configured; verify selected shared-card/history tests prove unchanged default/legacy `power_unit`, climate/control/nonnumeric behavior, independent duplicate-card options and unchanged state/service payloads, and update switch/graph examples with conversion versus label-only precedence.

## 2. History values and option propagation

- [x] 2.1 Retain unit-bearing raw numeric Recorder samples in the existing request/cache, derive unrounded converted bounds/geometry and formatted labels for period sheets and compatible graph sources; add focused history tests for mixed supported units, missing/incompatible metadata, rounding without flattening, formatting-only rerender without refetch/period reset and stale-result/availability cleanup, verify they pass and document original-record preservation and failure behavior.
- [x] 2.2 Add source-unit metadata to the existing live-state collection/resolution and carry formatting options through graph/load, energy-period and popup generation, validating their shape and source compatibility before writes; add metadata/lifecycle and generator checks for guided object slots, room/custom consumers, summary/sheet parity and separately bound graph sources, verify the focused `test_init.py`/`test_generator.py` cases and update configuration/direct-component examples. Use actual source metadata rather than legacy labels or assumed units.

## 3. Builder and saved compatibility

- [x] 3.1 Add shared catalog/schema/Visual controls for compatible source/target units and Auto/0–6 precision on the applicable readings, preserving explicit zero and resetting Auto by removing only its override; add editor-model/panel tests for draft errors, Visual/JSON round trips, retained selector options, duplicates and unit changes, update localized EN/PT help/errors and verify focused tests plus `npm run build:editor` and `npm run check:editor` pass.
- [x] 3.2 Add provenance-backed no-op released configuration fixtures and independent expected documents for new option preservation through save/generation and accepted page-model conversion; verify focused compatibility checks preserve unknown/raw/custom content, source bytes on read-only paths and immutable archives without a format bump, update the upgrade coverage inventory and document no automatic reinterpretation of `power_unit`.

## 4. Safe examples and final inspection

- [x] 4.1 Update canonical Cases, safe numeric/history fixtures and coverage plus realistic Energy/Wallbox/room examples for converted/source units, distinct precision, positive/negative/zero, currency precision, unavailable and incompatible metadata, summaries and sheets; verify the relevant gallery/fixture checks and document the new examples, keeping all views under `/marao-dashboard` without a Cartesian set of equivalent values.
- [x] 4.2 Dry-run and sync only to `192.168.0.28`, confirm current loaded assets and verify focused browser/editor checks for save/reload, per-card independence, period navigation and bounded requests. Cover affected content at 320px and representative iPhone/Android portrait/landscape, both themes and normal/bold/200% text/200% zoom/bold plus 200% text; record any warnings/errors/resources/repeated requests as defects and use `npm run test:ha:alignment` only if icon-only layout changes.
- [x] 4.3 After the last edit and focused automated check, visually and interactively inspect every card/popup in the affected set, including unchanged defaults and configured examples, for aligned values/units, readable decimals, wrapping, clipping, spacing, controls and popup behavior; fix defects, rerun the focused check and repeat this final inspection, recording evidence and honest emulation/physical-device limits.

## Workflow follow-up

- Review and archive only after the tracked implementation and verification tasks are complete. Coordinate option preservation with `unify-editable-page-templates` without treating its unfinished behavior as shipped.
- Pass `npm run verify:publish` against the disposable instance before any push, tag or GitHub/HACS release, with exact-commit Tests, hassfest and HACS validation; do not run the full publication suite for ordinary small edits or this proposal.
- During explicit final-candidate versioned-release preparation only, run the separate preserved-install upgrade gate with historical formatting/default coverage and verified cleanup. Keep the live historical scenario out of routine iteration and never substitute fresh fixtures for upgrade evidence.
