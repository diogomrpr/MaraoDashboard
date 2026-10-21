# Why

The current Energy summaries are useful, but their popup history does not make
consumption per hour/day or its contributors easy to compare. Keep current power,
month energy/cost and today energy/cost, and make the detail sheets explain those
totals with simple bars and a configurable breakdown.

# What Changes

- Show one vertical consumption/cost bar per calendar day in month sheets and per
  elapsed hour in day sheets, with readable exact values and existing navigation.
- Add ordered `sub_entities` with an energy sensor, optional display name and
  separate optional cost sensor. Show period energy and cost below the chart, plus
  a compact circular comparison of the configured contributors.
- Prefer exact cost sensors. Otherwise estimate from the matching Home Assistant
  Energy price per kWh or an explicit card `cost_per_kwh` override; identify
  estimates and unsupported/ambiguous price configurations visibly.
- Add `calculate_cost` for displaying a period energy source as estimated cost.
  Preserve old cards, options, explicit empty lists and unrelated unknown fields.

Observed: energy period cards already share a runtime and calendar navigation.
The user's selected day granularity is hourly; each breakdown item can supply
separate energy and cost sensors. Current/dynamic tariffs applied to historical
usage are estimates, not historical tariff reconstruction.

Non-goals: changing power summaries, creating utility meters, inventing missing
consumption, billing reconciliation, adding third-party cards, or a full test
campaign. Suggested future comparisons or alerts are not implemented here.

# Capabilities

## Modified Capabilities

- `camera-history-content`: Calendar consumption bars, exact selection,
  contributor totals and explicit incomplete/estimated results.
- `visual-builder`: Ordered energy contributor configuration and optional price
  override/calculated-cost settings through existing visual/native editors.

# Impact

Starting commit: `c27d3bd`. Shared consumers: builder-generated and native
`hc_energy_period_card`, direct `custom:marao-energy-period-card`, and their
automatically owned sheets. Affected paths are editor descriptors/validation,
generator/native forwarding, shared history data/runtime, translations, safe
Energy examples, usage documentation and focused unit checks.

All new configuration is optional and additive. Existing released sources and
their format versions remain valid; absent contributor lists keep the chart-only
sheet, and an explicit empty list remains empty. There is no persisted conversion
or change to source/dashboard ownership. Current installation is preserved and
updated only on disposable HA `192.168.0.28` after essential checks.
