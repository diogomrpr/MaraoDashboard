# Proposal

## Why

Energy readings cannot consistently be displayed in a chosen unit or decimal precision. Administrators need readable values such as `1.50 kW` instead of `1500 W`, with the same presentation in cards and their history sheets.

## What Changes

- Add per-reading display-unit and decimal-place settings to power/energy/cost cards and their existing numeric graph, load and switch-power presentations, wherever those cards are placed. The user confirmed that choosing a compatible unit must **convert the number**, not just replace its label.
- Offer automatic/source units or supported compatible power/energy units, and automatic precision or 0–6 decimal places. Costs retain the entity's currency and allow precision selection; this change adds no currency exchange.
- Apply the chosen conversion and precision consistently to current readings and existing numeric history labels/scales. Convert using full precision and round only displayed text; never change HA entity state, recorded values or service payloads.
- Expose settings in Visual and JSON, propagate them through generation to popups, and retain independent choices for separate cards using the same entity.
- Preserve the exact legacy presentation when neither option is configured, including existing `power_unit` label semantics. New options are additive and opt-in, so no format bump or destructive conversion is needed for this feature alone.

## Capabilities

### New Capabilities

None; use existing capability boundaries.

### Modified Capabilities

- `card-behaviors`: compatible display conversion, decimal precision, availability and unchanged source/control behavior.
- `camera-history-content`: consistent formatting of energy history and graph labels without rounding stored/chart data or extra requests.
- `visual-builder`: editable/validated per-reading formatting options with Visual/JSON preservation.

## Impact

Observed source: `MaraoCards.js` normally delegates numeric labels to HA, but switch power readings concatenate raw state and `power_unit`; `MaraoDashboard.js` energy-period cards stringify live values and chart bounds. `generator.py` preserves graph variables but `_energy_period_card` emits no formatting options. `editor.py` exposes a switch unit label but no shared conversion/precision controls. This is source inspection, not a new phone/browser finding.

Implementation reaches the shared numeric presentation in those runtime files, source-unit metadata collected in `__init__.py`, the card catalog/model/schema/panel and rebuilt assets, graph/load/period generation and popup options, translations, card/configuration documentation, focused formatter/model/generator/history checks and safe gallery/product examples. Reuse browser numeric formatting and existing components; no dependency or polling service.

**Affected-card set:** empty for planning-only edits. Implementation covers `custom:marao-energy-period-card` summaries and sheets, `hc_graph_card`, `hc_toggle_graph_card`, `hc_switch_card` power readings, and numeric `hc_sensor_card`/`hc_base_card` presentations used for energy readings, including Wallbox power graphs and their popups. Inspect unchanged defaults for these consumers as well as configured examples. Climate, control steppers/presets, percentages, weather, camera and nonnumeric states are outside the formatting scope.

Assumptions recorded for implementation: precision means fixed decimal places when explicitly chosen; initial unit choices use finite compatible multipliers, not arbitrary labels. Costs do not offer another currency without an exchange source. Coordinate with `unify-editable-page-templates` so the options remain card-owned after page conversion, and maintain the historical upgrade inventory from `ensure-safe-dashboard-upgrades`; neither pending change is declared delivered here.

Non-goals: tariffs, power-to-energy integration, currency exchange, new statistics/aggregation semantics, unit changes to HA entities or controls, global formatting of every card, framework installation, implementation or publication. Preserve historical JSON/unknown/raw/custom content; previews/dry runs remain read-only and existing recovery/history contracts remain intact.
