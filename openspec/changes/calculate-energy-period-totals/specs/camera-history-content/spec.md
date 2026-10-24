# Spec Delta

## MODIFIED Requirements

### Requirement: Timeline and energy period semantics
Timelines SHALL use 24-hour Recorder transitions plus authoritative live state.
Energy period cards SHALL show recorded consumption for their configured current day
or month and, in their sheet, period history with previous/next navigation and
interactive numeric point inspection. Navigation SHALL stop at the current period
and disable while loading or unavailable. An absent legacy energy entity SHALL
render a neutral state rather than throw during card configuration.

#### Scenario: A period sheet is at the current month
- **WHEN** its navigation controls render
- **THEN** Previous is available when usable and Next cannot navigate into a future period

#### Scenario: A calendar period crosses a clock change
- **WHEN** a day or month history period is selected
- **THEN** its bounds and labels follow the Home Assistant time zone and calendar boundaries
- **AND** a daylight-saving day is not forced into a fixed 24-hour duration

#### Scenario: A summary and its current-period sheet use the same source
- **WHEN** both have the same recorded coverage, source, period and display settings
- **THEN** the tile and whole-period sheet total show the same consumption
- **AND** navigating the sheet to an earlier period does not change the tile's current-period total

### Requirement: Consistent energy history presentation
Configured energy unit and precision SHALL apply consistently to current-period consumption and existing numeric labels/scales in generated history sheets. History samples SHALL convert before bounds are calculated, retaining full precision; only visible text SHALL be rounded. Chart shape and period navigation SHALL retain existing semantics. Each sample's source unit SHALL be respected, and incompatible samples SHALL NOT be combined as equivalent measurements.

#### Scenario: An energy period card and its sheet use kilowatt-hours
- **WHEN** recorded consumption for the configured period is `2500 Wh` and the card selects `kWh` with two decimal places
- **THEN** the card shows `2.50 kWh` and its sheet's numeric bounds use equivalent converted values and the same unit/precision
- **AND** a larger cumulative source state is not substituted for period consumption

#### Scenario: Different samples round to the same text
- **WHEN** full-precision history values differ but the selected display precision rounds them equally
- **THEN** chart geometry still reflects their actual converted differences rather than a fabricated flat trace

#### Scenario: A configured graph uses a distinct history entity
- **WHEN** the live entity reports watts and the history entity reports kilowatts
- **THEN** each value is converted from its own metadata to the configured compatible target before presentation

#### Scenario: Historical samples contain incompatible units
- **WHEN** a requested conversion cannot interpret some samples in the target dimension
- **THEN** the sheet reports the incompatibility without drawing a misleading mixed-unit line or altering recorded history

#### Scenario: History includes past nonnumeric states
- **WHEN** compatible numeric samples are interspersed with unknown, unavailable or other nonnumeric states
- **THEN** the card and history sheet convert the numeric samples without a unit error
- **AND** nonnumeric samples are omitted from numeric conversion without becoming zero or modifying recorded history

### Requirement: Explicit estimated energy costs
Dedicated cost sensors SHALL take precedence over estimates. Otherwise the card
MAY calculate cost from selected-period energy consumption with an explicit
nonnegative `cost_per_kwh` in HA currency or the unambiguous applicable HA Energy
grid-import tariff. Calculated cost SHALL be visibly identified as estimated,
including when current prices are applied to historical usage. `calculate_cost`
SHALL opt an energy source into a cost display without changing its recorded data.

#### Scenario: More than one unmatched tariff exists
- **WHEN** no explicit override or uniquely matched grid tariff is available
- **THEN** cost remains visibly unavailable pending explicit configuration
- **AND** usable energy data remains visible without an arbitrarily chosen price

#### Scenario: A contributor has a dedicated cost sensor
- **WHEN** the sensor provides cost for the selected period
- **THEN** that cost is used instead of multiplying energy by the current tariff

#### Scenario: Calculate cost from a lifetime energy counter
- **WHEN** the lifetime reading is `10250 kWh`, today's recorded consumption is `10 kWh` and the configured price is `0.25 EUR/kWh`
- **THEN** today's calculated-cost tile shows an estimated `2.50 EUR`
- **AND** the current-day popup uses the same recorded consumption and price instead of charging for the lifetime reading

## ADDED Requirements

### Requirement: Cumulative energy period totals
One cumulative energy sensor SHALL support both day and month cards without separate period entities. Totals SHALL use recorded interval changes with appropriate reset semantics. Existing resetting sources SHALL remain usable without source rewriting. Missing or partial history SHALL NOT become lifetime totals, invented consumption or measured zero. Readable partial totals SHALL retain the approximation marker.

#### Scenario: The same never-resetting meter supplies two cards
- **WHEN** a recorded meter reads `10250 kWh`, with valid boundary readings of `10240 kWh` at today's start and `10000 kWh` at this month's start and no resets
- **THEN** a day card shows `10 kWh` and a month card shows `250 kWh`
- **AND** neither card requires a Utility Meter helper or a resetting source

#### Scenario: An existing counter resets within the selected period
- **WHEN** a supported resetting source provides sufficient recorded statistics or valid counter baselines across a reset
- **THEN** consumption includes the valid usage on both sides of that reset without a false negative jump or double counting
- **AND** signed `total` changes retain their established signed semantics

#### Scenario: Recorder cannot establish consumption
- **WHEN** the source has a valid numeric current state but no usable statistics or counter-history baseline for the selected period
- **THEN** the tile and popup show an appropriate localized empty or unavailable-history state
- **AND** neither the current lifetime reading nor zero is presented as measured period consumption

#### Scenario: Only part of a month was recorded
- **WHEN** usable history begins after the selected month started
- **THEN** any displayed recorded subtotal retains an approximation marker in the tile and popup
- **AND** unavailable intervals remain gaps instead of being extrapolated across the month

#### Scenario: New statistics arrive while the tile remains mounted
- **WHEN** newer period statistics become available while the dashboard remains visible and connected
- **THEN** bounded refresh updates the tile without requiring the user to reopen the popup or reload the page
- **AND** unrelated state updates do not issue repeated consumption requests
- **AND** a day or month boundary switches the tile to the new HA-local period without carrying forward the previous total

#### Scenario: An existing saved card uses a resetting period source
- **WHEN** supported saved JSON, raw card YAML or generated energy cards are loaded
- **THEN** the existing entity, period, name, display settings, popup assignment and unrelated fields remain intact
- **AND** the source continues to provide the appropriate period consumption without a required new option or configuration migration
