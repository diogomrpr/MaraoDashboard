# Spec Delta

## ADDED Requirements

### Requirement: Calendar power history and device comparison
House Power SHALL open a detailed power chart directly. A sticky day/week/month selector and period arrows SHALL show the selected calendar interval in HA's time zone and prevent future navigation. ISO weeks SHALL begin Monday. The chart SHALL preserve recorded extrema, gaps and source units without invented readings. Configured power-device traces SHALL share the chart and expose their recorded value at the selected time.

#### Scenario: Opening and navigating power history
- **WHEN** House Power or its History action is activated
- **THEN** today's detailed chart opens with visible period selection and arrows
- **AND** changing to week or month shows that calendar interval with its label, without an intermediate summary card

#### Scenario: A recorded spike occurs between ordinary readings
- **WHEN** history contains a brief high reading
- **THEN** reducing plotted data preserves the recorded extremum, without smoothing it away
- **AND** invalid or unavailable intervals remain gaps rather than fabricated zeros

#### Scenario: Comparing devices reported in different power units
- **WHEN** the house reports kW and a configured device reports W
- **THEN** their historical values convert from their own recorded units to the chart unit
- **AND** selecting a time shows each device's last recorded state at or before that time, without substituting a later reading

#### Scenario: History is missing, failed or obsolete
- **WHEN** Recorder lacks data, a request fails, or the popup changes period/closes while a request is pending
- **THEN** missing history stays empty, failures have an explicit retry, and stale completions cannot overwrite the current interval or start more requests

#### Scenario: Loading neighboring periods without delaying opening
- **WHEN** the selected day, week or month has loaded and rendered successfully
- **THEN** after yielding for paint, up to four periods in each direction load sequentially in nearest-first order, excluding future periods
- **AND** navigation reuses cached or already pending results, keeping the selected period and its nearest neighbors bounded in memory
- **AND** background failures do not replace the selected chart or loop, and stale work stops after navigation, source changes or closing

#### Scenario: Time-unit options match the dashboard theme
- **WHEN** the time-unit menu is opened
- **THEN** Day/Week/Month options use Marao theme colors and full touch targets with a non-color selected cue
- **AND** updates preserve mounted controls/focus, keyboard selection works, and Escape closes only the menu

#### Scenario: Switching time units uses warmed first pages
- **WHEN** the first visible chart has loaded and rendered
- **THEN** the current page of every time unit warms sequentially in the background before the active unit's neighboring periods
- **AND** changing unit uses its cached or pending current page, then warms that unit's four nearest periods each way without requesting future periods
- **AND** current pages stay cached while navigating another unit, with existing freshness and stale-result guards retained
