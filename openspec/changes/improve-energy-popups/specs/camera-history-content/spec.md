## ADDED Requirements

### Requirement: Energy interval consumption bars
Energy period sheets SHALL show minimalist vertical bars of interval consumption
or cost: one per HA-local calendar day in a month, and one per elapsed hour in a
day. Exact interval values SHALL be readable outside the graphic. Current power,
month/today energy and cost summaries and existing period navigation SHALL remain.

#### Scenario: Scroll an energy period sheet
- **WHEN** the user scrolls through an energy or cost sheet
- **THEN** the active month/day label and both period arrows remain pinned below the popup title
- **AND** the pinned controls account for title wrapping and orientation changes
- **AND** opaque bottom spacing keeps scrolling content clear of the pinned controls
- **AND** the period controls remain stationary from the first scroll pixel without scrolling through an initial gap

#### Scenario: Inspect a daylight-saving day
- **WHEN** a day sheet opens for a local day containing 23 or 25 hours
- **THEN** the bars cover those actual hours without inventing or merging an hour
- **AND** a month sheet uses calendar-day boundaries in the same HA timezone

#### Scenario: Recorder has missing or reset counter data
- **WHEN** statistics or counter history contain unavailable intervals or missing baselines
- **THEN** unavailable consumption is distinguished from measured zero and partial totals retain the approximation marker
- **AND** energy sheets omit the incomplete-history and partial-recorded-period text labels
- **AND** resets use the new counter reading while signed total deltas remain signed
- **AND** a multi-bucket gap is not filled by fabricated uniform consumption

### Requirement: Configured energy contributors
An energy period card SHALL accept an optional ordered `sub_entities` list with
required energy `entity_id` and optional `name` and `cost_entity`. Its sheet SHALL
show contributor names, selected-period energy and available cost beneath the
chart. A circular comparison SHALL supplement readable numeric values and SHALL
NOT imply that overlapping or incomplete configured sensors exhaust the total.

#### Scenario: Responsive circular comparison and legend
- **WHEN** two columns fit under the existing card width and text-size capacity rule
- **THEN** the circular comparison and legend appear beside each other
- **WHEN** only one column fits
- **THEN** they stack vertically with readable wrapping values
- **AND** a breakdown without a circular comparison retains a full-width legend

#### Scenario: Select a previous month
- **WHEN** the user navigates to a previous month
- **THEN** the chart and every configured contributor use that same month
- **AND** current live sensor readings are not presented as historical totals

#### Scenario: Focus on a day and restore the monthly overview
- **WHEN** the user selects a day bar or uses the daily navigation arrows
- **THEN** the selected bar and the circular contributor breakdown use that same day
- **AND** the existing total row shows the selected date before its value without adding a readout row or pushing the chart down
- **AND** each contributor's energy and actual or estimated cost use the selected day's interval
- **WHEN** the user presses Full month on the left of the daily navigation row
- **THEN** the bar selection clears and the readout and contributor breakdown return to the whole month
- **AND** missing daily data stays missing instead of falling back to monthly totals

### Requirement: Explicit estimated energy costs
Dedicated cost sensors SHALL take precedence over estimates. Otherwise the card
MAY calculate cost from energy with an explicit nonnegative `cost_per_kwh` in HA
currency or the unambiguous applicable HA Energy grid-import tariff. Calculated
cost SHALL be visibly identified as estimated, including when current prices are
applied to historical usage. `calculate_cost` SHALL opt an energy source into a
cost display without changing its recorded data.

#### Scenario: More than one unmatched tariff exists
- **WHEN** no explicit override or uniquely matched grid tariff is available
- **THEN** cost remains visibly unavailable pending explicit configuration
- **AND** usable energy data remains visible without an arbitrarily chosen price

#### Scenario: A contributor has a dedicated cost sensor
- **WHEN** the sensor provides cost for the selected period
- **THEN** that cost is used instead of multiplying energy by the current tariff

### Requirement: Nearby energy periods load in the background
Month and day sheets SHALL share a bounded prefetch/cache implementation for the
nearest four navigable periods in each direction. Prefetch SHALL include chart
and contributor data without blocking the selected period or requesting future
periods. Summary cards SHALL NOT prefetch historical data.

#### Scenario: Navigate nearby months or days
- **WHEN** a selected period finishes loading successfully
- **THEN** the selected period renders and gets a paint opportunity before prefetch begins
- **AND** the four earlier and four later non-future months or days load in the background, nearest first
- **WHEN** the user selects a cached period
- **THEN** its chart and breakdown render immediately without an intermediate loading frame
- **AND** selecting an in-flight period shares that request instead of duplicating it
- **AND** the cache window follows navigation and discards periods outside that window

#### Scenario: Stale or failed background data
- **WHEN** a prefetched period failed to load and is later selected
- **THEN** the loader retries it and reports a persistent failure for that selected period
- **WHEN** sources, source availability or HA timezone change, or the card is removed
- **THEN** cached data is invalidated and old background responses cannot replace the selected data or schedule more work
- **WHEN** the user returns to the current period after its cached data is over one minute old
- **THEN** that period is refreshed
