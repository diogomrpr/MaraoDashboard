# Spec Delta

## MODIFIED Requirements

### Requirement: Filterable full-width camera event timeline
Camera lists SHALL retain full-width previews with timestamps/headings above them. Providers with authoritative event types SHALL retain localized All/type filters, reachable while scrolling and applied to the complete bounded list before progressive display. Filters SHALL preserve provider order and selected state. Basic recording sources without authoritative types SHALL use localized recording labels without invented detection headings or filters.

#### Scenario: Filtering events beyond the first visible batch
- **WHEN** a provider supplies authoritative types and the user selects one represented only among older loaded metadata
- **THEN** matching events appear in provider order without requiring other types to be scrolled past
- **AND** each preview has its timestamp and type above it, outside the media

#### Scenario: Narrow phone filter bar
- **WHEN** available authoritative event types exceed the screen width
- **THEN** the bar scrolls horizontally with full-size touch controls and its selected filter remains usable

#### Scenario: Basic Netatmo recordings lack detection types
- **WHEN** native browsing supplies recording identifiers and timestamps without authoritative types
- **THEN** the list retains timestamps and localized recording labels
- **AND** no type headings or filters are inferred from provider messages

### Requirement: Netatmo camera feature parity
Marao SHALL retain available HA-native Netatmo live/still/fullscreen behavior and saved provider selection. Basic recordings SHALL use a small frontend adapter only when existing native media responses can be adapted directly. Unsupported recording support SHALL be explicit. Removing Python SHALL NOT depend on an upstream Netatmo API or replacement backend. Provider-defined unavailable features SHALL remain documented.

#### Scenario: Netatmo camera is opened
- **WHEN** a registered Netatmo camera opens its popup
- **THEN** available HA-native camera presentation remains usable independently of recording support
- **AND** its saved explicit provider selection overrides detection and survives unchanged

#### Scenario: Native recordings have a supported shape
- **WHEN** native browsing returns supported recording identifiers for the selected camera
- **THEN** a bounded newest-first basic list uses their validated numeric timestamp keys
- **AND** labels, optional previews, Back and Refresh use the shared presentation without inventing detection types

#### Scenario: Native recordings cannot be adapted directly
- **WHEN** the native source is unavailable, denied or has an unsupported response shape
- **THEN** localized recording-unavailable/error feedback appears while available native camera behavior remains
- **AND** no Marao Python command, provider cache, diagnostic export, raw webhook subscription, direct provider request or title-based type inference is used as fallback

### Requirement: Native Netatmo recording playback
When basic native recordings are available, selected media SHALL resolve on demand through HA's authenticated native APIs and use its player with visible controls, inline playback and no autoplay. Missing thumbnails SHALL NOT prevent recording access. Native authorization outcomes and shared cancellation/cleanup behavior SHALL remain authoritative.

#### Scenario: Recording is selected
- **WHEN** a user selects a supported native Netatmo recording
- **THEN** its native media identifier resolves on demand and exposes controlled playback
- **AND** Back restores the recording list without a late response replacing it

#### Scenario: Recording has no thumbnail
- **WHEN** metadata lacks an optional thumbnail
- **THEN** the recording remains selectable with localized presentation
- **AND** no provider transport URL is synthesized

#### Scenario: Recording work becomes obsolete
- **WHEN** refresh, disconnection, replacement or popup removal invalidates pending browse, preview or resolve work
- **THEN** late completion cannot replace current content or schedule more work

### Requirement: Local on-demand chart lifecycle
Detailed chart code SHALL load from project-owned Dashboard package assets only when numeric detail is opened. Repeated opens SHALL share the module load and reuse compatible history. Module/history failures SHALL have readable explicit retry without automatic loops. Unavailable sources SHALL remain neutral. Closing, source/route replacement or removal SHALL release chart resources and invalidate stale completions.

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

## ADDED Requirements

### Requirement: Netatmo native metadata conversion
The frontend adapter SHALL validate native camera/media identifiers and decimal-digit positive safe-integer epoch-second keys, preserve configured bounds and deduplicate/sort the native recording list without parsing translated titles for types or time. Known unsupported/missing fields SHALL produce explicit bounded behavior; the adapter SHALL NOT manufacture unavailable provider features.

#### Scenario: A timestamp identifier is malformed
- **WHEN** a native recording key is not decimal-digit syntax, fractional, exponential, outside positive safe-integer/date ranges or belongs to another camera
- **THEN** it is not treated as an authoritative recording for the selected camera
- **AND** unsupported input remains distinguishable from a genuine empty list

#### Scenario: Multiple records exceed the configured limit
- **WHEN** valid native recordings arrive out of order with duplicate identifiers
- **THEN** the list contains unique selected-camera records in newest-first order within the configured bound

## REMOVED Requirements

### Requirement: Permission-scoped event metadata
**Reason**: The user permits removal of Marao's custom Netatmo metadata endpoint and typed-detection/filter contract. Native media browsing does not expose equivalent types/subevents or the former custom metadata authorization boundary.
**Migration**: Preserve saved provider selection, limits and related unknown configuration fields. Retain native camera behavior and directly supported basic recordings; otherwise show explicit unavailable support. Do not reconstruct types from messages, subscribe to private/raw events, restore cached typed-event snapshots or keep a hidden backend. Other providers and sensor history are unchanged.
