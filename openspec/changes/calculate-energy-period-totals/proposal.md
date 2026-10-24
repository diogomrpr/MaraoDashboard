# Proposal

## Why

The energy period tile currently shows the source sensor's raw reading while its popup calculates consumption for the selected day or month. A never-resetting energy meter therefore shows a lifetime total under a period label, requiring unnecessary daily/monthly helper entities to make the tile useful.

## What Changes

- Allow the same cumulative energy sensor to supply both daily and monthly cards, with consumption calculated for the selected HA-local calendar period.
- Make the tile and popup use consistent period consumption, including calculated-cost summaries derived from that consumption.
- Reuse Recorder statistics and existing counter-history arithmetic, retaining reset handling, units, precision, availability and honest missing/partial-history states.
- Keep existing resetting energy sensors usable; do not require or create Utility Meter helpers.
- Document source requirements and update the smallest relevant safe example and regression checks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `camera-history-content`: Change energy period semantics from displaying a presumed live period reading to deriving day/month consumption from cumulative sources consistently across tile, popup and calculated cost.

## Impact

- Affected cards: `hc_energy_period_card` / `custom:marao-energy-period-card`, including generated energy page day/month tiles, their popups, and `calculate_cost` variants. Reuse the shared consumption helpers rather than introducing a second card or parallel calculation.
- Inspect runtime loading/refresh, builder/native-editor guidance, catalog validation, generator forwarding, documentation, safe fixtures and existing energy tests. No theme redesign, new dependency, power integration, historical tariff reconstruction or helper provisioning is included.
- Preserve saved JSON/YAML, entity selections, explicit emptiness, order, unknown fields, existing options and generated keys. No persisted format or versioned migration is planned: existing `entity` and `period` options express the desired behavior. Displaying period consumption instead of lifetime readings is the intentional behavior correction.
- Observed: popup statistics already request interval `change`, while summaries use raw state and skip consumption history. Assumption: complete period totals require adequate recorded statistics/history; unavailable history cannot be reconstructed from the current meter reading alone.
- Planning only. No runtime changes or installation are performed by this change creation.
