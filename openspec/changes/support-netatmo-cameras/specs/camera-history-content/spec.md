## ADDED Requirements

### Requirement: Netatmo camera feature parity
Marao SHALL support the Netatmo camera integration's available live/still/fullscreen path and recorded events through the existing generated camera popup. Explicit provider selection SHALL override registry/device detection. Provider-defined unavailable features, including doorbell live video, SHALL be documented rather than fabricated.

#### Scenario: Netatmo camera is opened
- **WHEN** a registered Netatmo camera opens its popup
- **THEN** its available native video and bounded newest-first event feed appear without credentials or third-party cards
- **AND** filters, event headings, lazy previews, Back and Refresh use the existing shared presentation

### Requirement: Permission-scoped event metadata
Netatmo metadata SHALL be read only for the selected registered camera after checking the requesting user's read permission. Responses SHALL contain normalized event time/types, optional-thumbnail presence and native media-source identifiers, without raw provider transport URLs or account/person IDs. Missing provider data SHALL yield a readable error.

#### Scenario: Camera permission is denied
- **WHEN** an authenticated user requests metadata for a camera they cannot read
- **THEN** no provider cache or camera state is returned

#### Scenario: Recording contains multiple detections
- **WHEN** Netatmo reports several event types in one recording
- **THEN** that recording appears under each relevant filter with its authoritative timestamp

### Requirement: Native Netatmo recording playback
Netatmo recordings SHALL resolve through HA media sources and play using HA's native HLS player with visible controls and inline playback, without autoplay. Missing optional thumbnails SHALL not prevent recording playback. Stale/disconnected work SHALL retain the existing event-card cancellation and cleanup behavior.

#### Scenario: Recording is selected
- **WHEN** a user opens a Netatmo event
- **THEN** the recording resolves on demand and exposes controlled HLS playback
- **AND** Back restores the event feed without a late response replacing it
