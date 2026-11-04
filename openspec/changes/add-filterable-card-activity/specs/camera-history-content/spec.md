# Spec Delta

## ADDED Requirements

### Requirement: Meaningful recorded card activity
Activity SHALL use recorded evidence from explicit sources to show semantic state changes, presses/activations, recognized problems and availability changes. Repeated reports or attribute-only updates SHALL NOT become operating events. Requests and observed results SHALL remain distinct. Numeric sensor history SHALL remain usable without invented thresholds or a claim that every sample is a physical action.

#### Scenario: A gate request and feedback are recorded
- **WHEN** a recorded opener press is followed by a linked contact reporting open
- **THEN** the timeline distinguishes the request from the reported result and identifies each source
- **AND** it does not imply the request proves movement or identify who passed through

#### Scenario: The integration supplies no physical feedback
- **WHEN** only a button press, scene activation or script request is recorded
- **THEN** the entry describes that recorded activity without inventing an Open/Closed or success/failure result

#### Scenario: A sensor changes its value
- **WHEN** a numeric or categorical sensor has recorded state changes but no Activity/Logbook entries
- **THEN** recorded history can supply value-change events with their actual units and times
- **AND** identical reports or unrelated attribute updates do not become extra semantic events

#### Scenario: History includes the starting state
- **WHEN** a response includes a pre-existing state at the selected period boundary
- **THEN** it is used only as baseline context and is not counted as a new event at the boundary
- **AND** unknown gaps or missing records do not become fabricated operations or numeric zero

### Requirement: Evidence-based activity attribution
Activity SHALL show and filter person, automation/script or other origin only when supplied by reliable permitted context. Missing origin SHALL remain unknown. Recorded command context SHALL NOT imply physical identity or confirmed completion. Displayed details SHALL exclude secrets and raw service payloads, and requests SHALL use the signed-in user's permissions.

#### Scenario: An automation is identified
- **WHEN** permitted recorded context associates an event with a named automation
- **THEN** its name can be shown and used as an origin filter without changing the recorded event's meaning

#### Scenario: Actor information is missing or forbidden
- **WHEN** a source provides no usable attribution or the account cannot resolve it
- **THEN** the UI uses unknown attribution without guessing manual operation or fetching privileged account data

#### Scenario: A recorded action contains sensitive parameters
- **WHEN** underlying metadata includes a PIN, credential or arbitrary service data
- **THEN** the activity model, visible details, persistence and shared diagnostics contain only the allowed non-sensitive event fields

### Requirement: Queried activity periods and honest coverage
Activity SHALL offer Today, Yesterday, Last 7 days and a bounded custom range in the HA time zone. Selecting a period SHALL query that period rather than only filter recent records. Queries and rendering SHALL be bounded, preserving distinct empty, failed, permission-limited, partial-source and incomplete-coverage states. Filtered counts SHALL describe known loaded coverage rather than an unverified complete archive.

#### Scenario: An older date is selected
- **WHEN** the user selects Yesterday or a custom period outside the loaded window
- **THEN** the selected sources are queried for that period and its calendar boundaries respect daylight-saving changes
- **AND** late results from the previous selection cannot replace it

#### Scenario: Recorder retention or a failed source limits results
- **WHEN** only part of the requested history is available or one linked source fails
- **THEN** available records remain visible with the actual source/coverage limitation
- **AND** a failed query is not labeled No events and missing records are not synthesized

#### Scenario: More data remains to load
- **WHEN** a query/display bound prevents the entire selected period from being represented
- **THEN** the timeline identifies incomplete coverage and offers an explicit way to continue or narrow the period
- **AND** it does not claim a complete filtered count based only on the visible page

### Requirement: Contextual activity filters
Activity SHALL combine date and event-type filters with source, origin and specific-initiator filters when supported by the selected records. Filters SHALL apply before progressive row display and expose selected state and reset behavior. Unavailable properties SHALL not be invented. Filter and range state SHALL remain transient and SHALL NOT alter saved cards or HA recording settings.

#### Scenario: The user filters combined gate sources
- **WHEN** an opener and linked sensors contain different event types and the user chooses a type/source
- **THEN** matching events across the queried metadata are shown, including matches beyond the first visible batch
- **AND** source identity prevents equal record IDs from being confused across entities

#### Scenario: A result has no origin metadata
- **WHEN** no loaded record has reliable actor or automation context
- **THEN** unsupported detailed-initiator controls are omitted and missing attribution remains distinguishable

#### Scenario: A filter is cleared or new events arrive
- **WHEN** filters are reset or new activity becomes available while the user reads older entries
- **THEN** selection and scroll behavior remain deliberate, with no automatic jump to the newest record
- **AND** returning from an expanded event retains the list context

### Requirement: Themed card activity sheet
Activity SHALL use the shared Marao modal presentation with a stationary title, close control and compact filter header above an internally scrolling newest-first timeline grouped by day. Entries SHALL use circular icons, clear labels, exact localized times and subordinate evidence/origin text with existing theme tokens. Controls SHALL remain at least 48px and usable at 320px and supported enlarged text sizes.

#### Scenario: The timeline is opened on a phone
- **WHEN** the activity icon is activated
- **THEN** one sheet appears above the navbar with inert background, contained focus, safe-area bounds and the existing centered/column-width behavior
- **AND** the date/event-type controls remain accessible while entries scroll without moving the background

#### Scenario: An event has additional details
- **WHEN** its explicit detail control is activated
- **THEN** recorded state/context details expand within the same sheet without adding operating actions or nesting another modal
- **AND** closing restores focus to the current matching icon opener

### Requirement: Activity request ownership and cleanup
Activity SHALL load on demand, cancel or invalidate obsolete work on close, source/account/dashboard change, editing, disconnection or removal, and release subscriptions/listeners. Failure SHALL provide readable feedback and explicit retry without a request loop. Editor previews SHALL remain inert and history interactions SHALL never actuate a device.

#### Scenario: A popup closes during a query
- **WHEN** a delayed result arrives after its owning context has closed or changed
- **THEN** it is discarded without altering another popup, account's cache or current selection

#### Scenario: Loading or retry fails
- **WHEN** HA rejects or cannot complete the activity request
- **THEN** the sheet reports the failure while retaining usable content and an explicit safe retry where applicable
- **AND** no service call, hidden retry loop or synthetic success event is generated
