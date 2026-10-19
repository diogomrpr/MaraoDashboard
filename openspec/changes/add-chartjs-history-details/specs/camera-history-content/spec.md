# Spec Delta

## MODIFIED Requirements

### Requirement: Project-owned background history trace
Graph-enabled cards SHALL use the shared Marao 24-hour trace from Recorder history
and authoritative live numeric state, without nested native history-graph or external
card resources. Optional line/fill/color/background tint SHALL preserve readable
primary content. Empty or failed history SHALL leave the trace neutral, not fabricate a flat line.
Compact previews SHALL remain non-interactive and provide a separate visible History control for numeric detail without replacing existing card actions.

#### Scenario: History is empty while the live sensor is valid
- **WHEN** a graph card renders
- **THEN** the current reading and any control remain usable with a localized empty state and neutral background trace

#### Scenario: A toggle graph opens history
- **WHEN** the user activates its History control
- **THEN** the numeric source's detail opens without dispatching a toggle or the configured card action
- **AND** its actual toggle target retains independent state and availability handling

### Requirement: Timeline and energy period semantics
Timelines SHALL use 24-hour Recorder transitions plus authoritative live state.
Energy period cards SHALL show the live period reading and, in their sheet, day
or month history with previous/next navigation and interactive numeric point inspection.
Navigation SHALL stop at the current period and disable while loading or unavailable.
An absent legacy energy entity SHALL render a neutral state rather than throw during card configuration.

#### Scenario: A period sheet is at the current month
- **WHEN** its navigation controls render
- **THEN** Previous is available when usable and Next cannot navigate into a future period

#### Scenario: A calendar period crosses a clock change
- **WHEN** a day or month history period is selected
- **THEN** its bounds and labels follow the Home Assistant time zone and calendar boundaries
- **AND** a daylight-saving day is not forced into a fixed 24-hour duration

## ADDED Requirements

### Requirement: Shared numeric history details
All consumers of the shared numeric graph path and energy-period sheets SHALL use consistent detail behavior in generated, native and raw-config hosts. Existing graph source, title, line/fill/color and unit/precision options SHALL retain their meaning. Detail selection and windows SHALL remain transient without changing saved source, generated YAML, popup assignments or entity actions.

#### Scenario: A configured power or climate graph is inspected
- **WHEN** its History control is activated
- **THEN** the detail uses the configured graph source and applicable presentation options
- **AND** climate controls, toggles and configured tap/hold actions retain their original behavior

#### Scenario: A card is displayed in native editor preview
- **WHEN** history controls are rendered in the preview
- **THEN** no operational detail sheet, service action or history request is started by that preview

#### Scenario: Existing saved graph configuration is loaded
- **WHEN** the new frontend renders a supported released graph or energy card
- **THEN** detail works without rewriting its configuration or adding a required option
- **AND** unknown fields, raw cards and protected custom content remain unchanged

### Requirement: Touch point inspection
Numeric details SHALL support tap selection of the nearest available recorded sample along the time axis without requiring a precise hit on the line. The selected value and timestamp SHALL appear in readable text outside the plot. Visible previous/next-reading controls SHALL provide equivalent selection and disable at the endpoints. Point selection SHALL not dispatch entity services.

#### Scenario: A finger selects a narrow peak
- **WHEN** the user taps near its time position
- **THEN** the readout identifies an actual source sample and its timestamp
- **AND** it does not report an interpolated or rounded drawing coordinate as an exact measurement

#### Scenario: Selection reaches the last reading
- **WHEN** Next reading would leave the current window
- **THEN** that control is disabled and the existing selection remains visible

#### Scenario: A valid selection receives an unrelated state update
- **WHEN** the source samples and chosen window remain applicable
- **THEN** the selected timestamp and readout remain stable instead of resetting to the newest reading

### Requirement: Bounded detail windows and summaries
Numeric-card details SHALL offer 1h, 6h and 24h windows using available 24-hour history. Changing a window SHALL reuse loaded raw history without a new request solely for filtering. Details SHALL show minimum and maximum from available full-resolution numeric samples; measurement series SHALL also show a labeled sample average. No summary SHALL imply unavailable historical coverage or newly derived energy consumption.

#### Scenario: The user switches from 24h to 1h
- **WHEN** the existing history covers the requested window
- **THEN** the chart and summaries use only that window without refetching Recorder
- **AND** any selection outside the window reconciles to an available reading with its actual timestamp

#### Scenario: A measurement has irregular reporting intervals
- **WHEN** its sample average is displayed
- **THEN** it is labeled as a sample average and calculated from actual samples
- **AND** it is not presented as a time-weighted average

#### Scenario: An energy counter resets
- **WHEN** existing energy-period history is displayed
- **THEN** its recorded values and reset remain visible without treating the readings as per-period consumption bars
- **AND** a cumulative counter is not given a misleading measurement-average summary

#### Scenario: Only part of the requested period exists
- **WHEN** Recorder provides partial or no historical coverage
- **THEN** the chart shows only available data and an appropriate localized partial/empty indication
- **AND** no values are invented to complete the period

### Requirement: Faithful numeric chart presentation
Numeric charts SHALL use real time coordinates, preserve relevant extrema when reducing drawn data and derive summaries and selected readouts from full-resolution values. Known nonnumeric/unavailable intervals SHALL break the trace rather than become zero or be silently connected. An isolated reading SHALL remain an isolated reading. Formatting SHALL not change raw data or imply more precision than available.

#### Scenario: Dense history contains a brief high peak
- **WHEN** the rendered point count is reduced for mobile display
- **THEN** that peak remains represented and the full-resolution maximum remains correct

#### Scenario: A sensor becomes unavailable and recovers
- **WHEN** history includes that interval
- **THEN** the graph leaves a gap and point inspection selects actual available samples
- **AND** no zero or smoothed segment is fabricated across the unavailable interval

#### Scenario: A history response contains one reading
- **WHEN** it is rendered
- **THEN** a point and its real timestamp are shown without extending a flat line over unobserved time

### Requirement: Mobile detail readability
Details SHALL use Marao theme and scalable typography with sparse time labels and a persistent selected-reading area. Controls SHALL have visible 48px minimum dimensions and localized semantic names. At 320px, landscape and selected enlarged-text/zoom profiles, essential values and controls SHALL remain readable and contained. Climate-context values SHALL omit units visually and semantically.

#### Scenario: Text size increases in a narrow sheet
- **WHEN** controls and selected values no longer fit one row
- **THEN** they wrap or reflow without shrinking text, reducing targets or covering the plot's essential content

#### Scenario: Theme changes while detail is open
- **WHEN** light or dark mode changes
- **THEN** axes, trace, selection and surrounding text update coherently and retain readable contrast
- **AND** existing graph colors and line/fill preferences remain meaningful

### Requirement: Local on-demand chart lifecycle
Detailed chart code SHALL load from integration-owned assets only when numeric detail is opened. Repeated opens SHALL share the module load and reuse compatible history. Module/history failures SHALL have readable explicit retry without automatic loops. Unavailable sources SHALL remain neutral. Closing, source/route replacement or removal SHALL release chart resources and invalidate stale completions.

#### Scenario: Chart code fails to load
- **WHEN** a user opens numeric detail
- **THEN** a localized error and explicit Retry are displayed without breaking the summary or an unrelated card action
- **AND** no repeated automatic fetch loop starts

#### Scenario: Detail closes before an asynchronous load completes
- **WHEN** the load later resolves
- **THEN** it cannot recreate the closed chart or overwrite a newer source's detail
- **AND** chart listeners and observers do not accumulate across repeated opens

#### Scenario: A theme or precision option changes
- **WHEN** valid raw history is already loaded
- **THEN** its presentation updates without another history request solely for formatting
- **AND** the mounted chart and selected window remain stable where still applicable
