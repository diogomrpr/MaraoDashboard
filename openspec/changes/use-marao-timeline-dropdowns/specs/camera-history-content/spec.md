# Spec Delta

## ADDED Requirements

### Requirement: Marao dropdowns in the activity timeline

Activity timeline list filters SHALL use Marao's themed dropdown presentation and interaction. Date, Event type, and applicable Source, Origin, and Initiator filters SHALL show their current value in the trigger and selected menu item. Controls SHALL retain localized names, semantic selection, strong press feedback, and visible touch targets of at least 48 by 48 CSS pixels.

#### Scenario: Open the Date filter
- **WHEN** a user opens the Date dropdown in an activity timeline popup
- **THEN** it shows localized Today, Yesterday, Last 7 days, and Custom range choices in the Marao theme
- **AND** the current period is visibly selected and exposed as selected to assistive technology

#### Scenario: Additional list filters are available
- **WHEN** the activity timeline exposes Event type, Source, Origin, or Initiator filters
- **THEN** those list filters use the same Marao dropdown presentation and current-selection behavior as Date
- **AND** only the previously supported filter choices are offered

### Requirement: Activity filter selection stays synchronized

Changing a timeline dropdown SHALL update its displayed selection and apply the existing filter behavior once. Reset SHALL restore Today and the unfiltered choices. Date presets, HA-local period boundaries, the custom-range limit, and From/Through date inputs SHALL retain their existing behavior. Filter selections SHALL remain transient and SHALL NOT modify saved configuration or recording settings.

#### Scenario: Select a different date period
- **WHEN** a user selects a different Date choice
- **THEN** the trigger and selected menu item reflect that choice
- **AND** one date-selection callback requests the existing selected-period query
- **AND** selecting the already-current choice or dismissing the menu does not request another query

#### Scenario: Use and reset a custom range
- **WHEN** a user selects Custom range
- **THEN** the filter panel exposes the existing From/Through date inputs with the existing HA-time-zone and maximum-31-calendar-day validation
- **WHEN** the user resets filters
- **THEN** Date shows Today, the other filters show their unfiltered choices, and the custom date inputs are hidden
- **AND** the existing Today query runs once

#### Scenario: Refresh data-derived choices
- **WHEN** newly loaded activity changes the available Origin or Initiator choices
- **THEN** a still-supported selection remains selected in the trigger and menu
- **AND** a selection no longer supported by those results returns to the unfiltered choice
- **AND** the displayed filter count and results agree with the effective selections

### Requirement: Timeline dropdowns respect popup ownership

Timeline dropdown menus SHALL remain reachable within the visible viewport and follow Marao's shared dismissal and keyboard behavior. Hiding their containing filter panel SHALL close affected menus. Replacing controls or closing the timeline SHALL also release removed controls' owned listeners. Closing or dismissing a menu SHALL NOT change filters, trigger queries, or dispatch device actions.

#### Scenario: Dismiss a menu inside the timeline
- **WHEN** a user dismisses an open filter dropdown using Escape or an outside press
- **THEN** the menu closes without changing its selection or querying activity
- **AND** Escape returns focus to its trigger while the timeline remains open
- **AND** the timeline retains its existing modal focus and background-inert behavior

#### Scenario: Show a dropdown near the sheet edge
- **WHEN** a filter dropdown opens near a viewport or scrolling-sheet boundary
- **THEN** its choices use the shared floating and scrolling behavior without being clipped by the timeline content
- **AND** the selected choice remains reachable

#### Scenario: Remove a dropdown owner
- **WHEN** a filter panel hides, a data-derived control is replaced, or the timeline closes
- **THEN** each affected open menu closes and its removed controls release their owned dropdown listeners
- **AND** later viewport, pointer, and query events do not operate the removed controls
