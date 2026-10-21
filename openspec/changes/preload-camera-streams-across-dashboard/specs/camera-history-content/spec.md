# Spec Delta

## ADDED Requirements

### Requirement: Optional camera background preload configuration
Each camera card SHALL expose a localized background-preload toggle in the builder and supported native editor. `variables.preload_stream` SHALL accept booleans only; missing SHALL mean disabled without inserting a saved default. Saving SHALL preserve unrelated fields, selections and explicit false values.

#### Scenario: Existing or new card has not enabled preloading
- **WHEN** a card lacks the option or sets it to false
- **THEN** its stream retains existing on-demand startup behavior
- **AND** simply opening another page does not start a background stream for that card

#### Scenario: The user enables one camera
- **WHEN** the user saves the enabled toggle on a camera card
- **THEN** that card's option persists and other cards' options remain unchanged
- **AND** nearby localized help explains background bandwidth and device-resource use

### Requirement: Preload from any page of the active dashboard
For opted-in cards, the dashboard SHALL start the configured Dashboard stream while any page of that dashboard is open in a visible browser document, without requiring the camera page to mount first. It SHALL preload video muted and SHALL NOT preload a distinct Popup stream, events, editor previews or other dashboards' cameras. Recovery navigation SHALL remain usable during initialization.

#### Scenario: The dashboard opens directly on a page without cameras
- **WHEN** another page of the same dashboard contains an opted-in camera
- **THEN** its Dashboard stream starts in the background once dashboard configuration and HA state are available
- **AND** unselected cameras and distinct popup streams stay on demand

### Requirement: Reuse warm camera playback during dashboard navigation
Navigating between pages of the same dashboard SHALL retain an opted-in stream and reuse its ready playback when its camera card appears. Preloading and displaying that occurrence SHALL NOT start redundant players. Equivalent background requests for the same dashboard camera entity SHALL be deduplicated; ordinary independently visible cards SHALL retain correct ownership.

#### Scenario: The user visits a preloaded camera page
- **WHEN** its Dashboard stream has already reached live playback
- **THEN** the card presents that live playback without a fresh camera-session startup
- **AND** returning to another dashboard page keeps the opted-in stream warm

#### Scenario: The stream has not become ready
- **WHEN** the camera card appears before preloading finishes or browser autoplay is blocked
- **THEN** normal localized loading or recovery feedback remains available
- **AND** the card does not claim a snapshot or stalled frame is live

### Requirement: Preloaded stream lifetime is dashboard scoped
Background streams SHALL release owned resources on dashboard exit, hidden browser document, HA disconnection, unavailable camera, removal of the last opted-in owner or configuration replacement. Returning to an eligible state SHALL permit current initialization without retry loops. Removing a visible card during same-dashboard navigation SHALL NOT release its still-enabled background ownership.

#### Scenario: The tab is hidden or the user leaves Marao
- **WHEN** the document becomes hidden or navigation leaves that dashboard
- **THEN** preloaded players, signaling, timers and subscriptions are released and late work cannot attach stale media
- **AND** re-entering a visible eligible dashboard can start only its current enabled streams

#### Scenario: The preload setting changes during startup
- **WHEN** the last enabled owner is disabled, removed or assigned a different camera
- **THEN** obsolete background work is invalidated and released
- **AND** an independently visible or popup-owned session is not stopped by that cleanup

## MODIFIED Requirements

### Requirement: On-demand content and bounded requests
Secondary camera/graph/popup content SHALL load lazily where practical, except for explicitly enabled dashboard camera background preloading. Background preload SHALL apply only within its active dashboard lifetime; popup streams and event content SHALL remain on demand. Rendered graph history work SHALL remain deduplicated and usable space reserved during loading. State updates SHALL update affected components rather than rerender the entire dashboard. Disconnected or failed requests SHALL NOT enter repeated retry loops.

#### Scenario: HA disconnects while secondary content loads
- **WHEN** the component receives the outage
- **THEN** stale work is invalidated, controls disable appropriately, and no repeated failed requests are emitted

#### Scenario: Camera preload is disabled
- **WHEN** the user opens a page that does not display that camera
- **THEN** the camera retains lazy startup instead of acquiring a background session
