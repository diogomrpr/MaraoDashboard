# Spec Delta

## MODIFIED Requirements

### Requirement: Filterable full-width camera event timeline
Camera event lists SHALL default to one column, with previews filling their grid cells and timestamp/type headings above them, including the source camera in a multi-camera feed. A full-width header with Camera, Event type and Date/time dropdowns SHALL remain reachable while scrolling and expose selected values. Filters SHALL apply together to the complete bounded metadata before progressive display. Basic recordings without authoritative types SHALL retain recording labels without invented detection filters.

#### Scenario: Filtering events beyond the first visible batch
- **WHEN** the user selects an authoritative event type represented only among older loaded metadata
- **THEN** matching events appear without requiring other types to be scrolled past
- **AND** each preview has its timestamp and type above it, outside the media, with source identity in a multi-camera feed

#### Scenario: Narrow phone filter bar
- **WHEN** the three dropdowns or their labels cannot fit across a 320px-wide card
- **THEN** they wrap into further rows without horizontal page overflow or shrinking visible controls below 48 by 48 CSS pixels
- **AND** the header and opened options remain usable within the card or popup viewport

#### Scenario: Basic Netatmo recordings lack detection types
- **WHEN** native browsing supplies recording identifiers and timestamps without authoritative types
- **THEN** the list retains timestamps and localized recording labels
- **AND** no detections are inferred from provider messages, and the Event type dropdown retains only All types when no selected source has authoritative types

### Requirement: Progressive event previews with stable navigation
The event feed SHALL reveal older entries in small batches and load preview media only near the viewport, with reserved preview space. Each source SHALL retain its configured bounded metadata maximum. Returning from detail SHALL restore all filters, revealed entries and feed position. Pending work SHALL be bounded, deduplicated, and invalidated on replacement, refresh, disconnection or removal; failed previews SHALL remain readable without automatic retry loops.

#### Scenario: Opening a populated event feed
- **WHEN** the providers return event metadata
- **THEN** the feed becomes usable without waiting for all preview URLs to resolve
- **AND** offscreen previews are deferred until approached and older entries are progressively revealed within each source's configured maximum

#### Scenario: Returning from an older filtered event
- **WHEN** the user opens an event after selecting camera, type and date/time filters and scrolling, then activates Back
- **THEN** the same filters, revealed entries and scroll position are restored

#### Scenario: Preview finishes after refresh or removal
- **WHEN** a deferred preview request finishes after its feed was replaced or disconnected
- **THEN** it cannot alter the current feed or start further requests

### Requirement: Event detail, back and refresh
Event activation SHALL show a signed Frigate clip when available or its snapshot,
or resolved Protect clip media. Video SHALL retain controls and inline playback
without autoplay. Back SHALL restore the list and invalidate pending detail work.
Refresh SHALL explicitly retry the list; empty/error lists SHALL NOT refetch on
unrelated HA state changes. Disconnection or unavailability SHALL clear old media.

#### Scenario: The user leaves detail before media resolves
- **WHEN** Back is activated while the detail request is pending
- **THEN** its late result cannot replace the restored list

#### Scenario: Refresh with combined filters
- **WHEN** Refresh is activated on a list with selected camera, event-type and date/time filters
- **THEN** the configured sources refresh once and the selected filters remain applied
- **AND** a selected type absent from the refreshed results remains selected with an explicit empty result until the user changes it

## ADDED Requirements

### Requirement: Configurable event-list columns
The event card SHALL accept an optional positive-integer `columns` preference, defaulting to one. Individual camera configuration SHALL expose `variables.event_columns` and forward it to its popup event card. The grid SHALL use the configured count when readable and reduce it for limited width or enlarged text without changing the saved preference. Event order SHALL remain row-major; the filter header and selected detail SHALL span all columns.

#### Scenario: Several event columns are selected
- **WHEN** the card is configured with `columns: 2` and two readable cells fit
- **THEN** events appear in two columns in the same filtered reading order, each preview filling its cell with its heading above it
- **AND** filters, progressive loading, source identity and detail navigation retain their behavior

#### Scenario: An individual camera popup has a column preference
- **WHEN** a camera card is configured with `variables.event_columns: 2`
- **THEN** its popup passes `columns: 2` to the same shared event component
- **AND** the live stream, popup scope and unrelated event/provider settings remain unchanged

#### Scenario: Narrow width or enlarged text reduces the grid
- **WHEN** the configured count would make event content or full-size touch targets unreadable
- **THEN** the grid uses fewer columns while preserving every event and the configured preference
- **AND** it restores the preferred count when space permits without refetching metadata solely for reflow

#### Scenario: Column settings are omitted or invalid
- **WHEN** a supported saved event card or camera card omits its event-column option
- **THEN** it retains one column without inserting a saved default or changing existing generated output
- **WHEN** an explicit column value is zero, negative, fractional or otherwise invalid
- **THEN** configuration reports a localized validation error rather than silently changing the value

### Requirement: Shared single-camera and multi-camera event browser
The existing camera events component SHALL support both an explicitly configured multi-camera dashboard feed and the events area of an individual camera popup. Both contexts and the legacy event-card alias SHALL share the same filter, feed, preview and detail behavior. A camera popup SHALL restrict the component to its owning camera while preserving its separate live video.

#### Scenario: The same browser is used in both contexts
- **WHEN** a dashboard card contains several camera sources and an individual camera opens its popup
- **THEN** both contexts provide the same event browsing controls and detail behavior
- **AND** the popup's Camera dropdown shows its single selected camera and cannot expose another camera

#### Scenario: Browsing recorded events
- **WHEN** a camera, event-type or date/time filter changes
- **THEN** the event list updates without starting a live stream, changing camera settings or dispatching an entity service
- **AND** filter changes remain local to that component occurrence

### Requirement: Explicit camera sources and legacy event compatibility
The component SHALL accept either its existing single `entity` with existing provider overrides or an explicit ordered `cameras` list of source objects. Existing public types and options SHALL retain their meaning. List membership SHALL NOT expand through discovery. Missing sources or an explicitly empty list SHALL NOT select cameras automatically. Conflicting nonempty single/list inputs or malformed source entries SHALL produce a configuration error.

#### Scenario: A released single-camera card is loaded
- **WHEN** a saved current or legacy event-card type specifies `entity`, provider overrides and `limit`
- **THEN** it uses the shared one-source browser without a saved rewrite
- **AND** the limit retains its default of 12 and finite rounding/clamping to 1–100

#### Scenario: Several sources are configured
- **WHEN** a valid multi-camera card loads with `limit: 12`
- **THEN** each configured camera contributes at most 12 records before filtering
- **AND** camera filter options follow the explicit source order, retaining locally configured names and per-source provider overrides

#### Scenario: The source list is explicitly empty
- **WHEN** the last source is removed and the saved configuration contains `cameras: []`
- **THEN** the component shows localized setup guidance and makes no provider request
- **AND** later HA registry changes do not add cameras

### Requirement: Combined camera and event-type filters
Camera filtering SHALL offer All cameras and each configured camera in a multi-camera feed. Event type filtering SHALL offer All types and types supplied by authoritative metadata for the selected camera scope. Camera, type and date/time selections SHALL combine by intersection. A selected type SHALL NOT silently reset when absent from a new scope. All types SHALL include basic recordings without detection metadata.

#### Scenario: Filters are combined
- **WHEN** the user selects one camera, Person and Today
- **THEN** only that camera's records with authoritative Person metadata and known timestamps within today's HA-local interval are displayed
- **AND** records outside any selected condition are excluded even if their previews were previously visible

#### Scenario: The selected camera has no requested type
- **WHEN** Person is selected and the Camera filter changes to a source exposing only basic recordings
- **THEN** the result is explicitly empty with Person retained as the selected unavailable choice
- **AND** selecting All types reveals the basic recordings without inventing a Person classification

### Requirement: HA-local date and time filtering
Date/time filtering SHALL offer All loaded events by default, Last hour, Last 24 hours, Today, Yesterday and Custom range with start/end date and time. Calendar bounds and labels SHALL use HA's configured time zone; relative windows SHALL use elapsed time. Filtering SHALL use authoritative numeric timestamps and a start-inclusive, end-exclusive interval. Invalid or ambiguous custom bounds SHALL produce readable feedback before changing the active filter.

#### Scenario: A calendar day crosses daylight saving
- **WHEN** Today or Yesterday includes a clock change in HA's time zone
- **THEN** filtering uses that calendar day's actual boundaries, including 23-hour or 25-hour days
- **AND** a browser in a different time zone shows the same HA-local interval and event times

#### Scenario: A custom interval is applied or cancelled
- **WHEN** a valid custom start/end pair is applied
- **THEN** the dropdown summarizes the selected interval and all filters apply together
- **AND** an event at the start is included and an event at the end is excluded
- **WHEN** the custom editor is cancelled or its bounds are invalid, reversed or ambiguous during a clock change
- **THEN** the previously applied range remains unchanged and invalid input has readable correction guidance

#### Scenario: A relative interval is refreshed
- **WHEN** Last hour or Last 24 hours is selected or explicitly refreshed
- **THEN** its bounds are anchored to that interaction's current instant
- **AND** unrelated HA updates do not move the interval or trigger requests

### Requirement: Honest bounded event coverage
Date/time filters SHALL operate on the complete loaded bounded metadata without claiming an archive search. The component SHALL state applicable source limits and unsupported timestamp coverage. Records without authoritative timestamps SHALL remain available under All loaded events but SHALL NOT be guessed into a time-filtered result. Unsupported or uncovered intervals SHALL remain distinguishable from a verified complete interval containing no events.

#### Scenario: A source supplies only a localized date title
- **WHEN** an event has display date text but no validated machine-readable timestamp
- **THEN** All loaded events retains the event and its supplied text
- **AND** a time-filtered view excludes it with localized timestamp-coverage feedback rather than parsing the title or silently declaring no events

#### Scenario: The chosen interval predates the loaded list
- **WHEN** a bounded recent source cannot establish coverage for Yesterday or a custom interval
- **THEN** the view identifies the result as limited to loaded recent events
- **AND** no unsupported provider pagination, direct NVR request or unlimited backfill is initiated

### Requirement: Source-aware merged ordering and event identity
Combined feeds SHALL order timestamped records newest first with deterministic ties. Records lacking authoritative timestamps SHALL occupy a separately labeled undated group in configured-source and native-provider order. Event identity and preview/detail resolution SHALL include the camera and provider source, so identical provider event IDs cannot mix media between sources. Single-source native ordering SHALL remain preserved.

#### Scenario: Two sources reuse an event identifier
- **WHEN** two cameras or Frigate instances supply the same event ID
- **THEN** both records remain independently selectable with their camera names
- **AND** each preview and detail resolves through its own source, including after filtering or a different source completes loading

#### Scenario: Timestamped and undated sources are combined
- **WHEN** several sources finish in a different order from their configured order
- **THEN** known timestamps determine the dated feed order, with stable ties
- **AND** undated records remain in their labeled group without an invented timestamp or a claim of chronological placement

### Requirement: Independent source availability and failures
Loading, empty, failed, unknown and unavailable sources SHALL be tracked separately. Healthy sources SHALL remain usable while another loads or fails, with readable source-specific status and explicit retry through Refresh. Losing a source SHALL clear its old media and invalidate its pending work without clearing healthy siblings. HA disconnection SHALL neutralize the whole component and respect HA's native connection warning.

#### Scenario: One configured camera fails
- **WHEN** one source is unavailable, denied or reports a provider error while another succeeds
- **THEN** successful events remain browsable and the affected camera has a localized neutral or error status as appropriate
- **AND** unrelated state updates do not repeatedly request the failed source

#### Scenario: A source is removed while its media is resolving
- **WHEN** configuration replacement removes or changes that camera
- **THEN** its pending response cannot enter the current list, update another camera's preview or start detail playback
- **AND** remaining current sources retain their own results
