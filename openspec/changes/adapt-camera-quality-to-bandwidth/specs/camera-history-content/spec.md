# Camera content delta

## MODIFIED Requirements

### Requirement: Native camera previews and event sheets
Available camera cards SHALL start muted inline live video through Home Assistant's native camera player, retaining its WebRTC priority and native fallback. The configured dashboard entity SHALL be used exactly on startup and Retry. The generated popup SHALL show live video above provider events. Unknown, unavailable and disconnected views SHALL clear old media; brief buffering SHALL retain the native video frame.

#### Scenario: An available camera card is activated
- **WHEN** its generated popup opens
- **THEN** its configured popup stream starts above events associated with the original dashboard entity
- **AND** provider overrides, names and custom actions remain preserved

#### Scenario: A supported camera card becomes visible
- **WHEN** an available camera with a supported live source is displayed outside an editing preview
- **THEN** the existing card shows its available still image while its native player starts muted inline live video automatically
- **AND** it switches to live playback when ready without a new card, setting or user activation unless autoplay is blocked
- **AND** the rendered media advances over time rather than remaining an image or event clip

## ADDED Requirements

### Requirement: Explicit dashboard and popup streams
The dashboard builder SHALL expose a camera-domain Dashboard stream and optional Popup stream in its visual form and preserve both through Visual/JSON editing. The dashboard stream SHALL retain the existing entity field. Popup stream SHALL use `variables.popup_stream_entity`; absent, null or empty SHALL select the dashboard entity without writing a default or migrating saved data. Invalid non-camera bindings SHALL be rejected. Neither stream SHALL be silently replaced by another quality.

#### Scenario: An existing card has no popup stream
- **WHEN** it is edited or generated
- **THEN** its saved configuration remains preserved and both views use its existing camera entity

#### Scenario: A low dashboard and high popup are selected
- **WHEN** each view starts
- **THEN** it requests that exact entity through native HA playback without an adaptive HLS session, speed test or third-party card

### Requirement: Fullscreen popup video
Activating popup live video SHALL open that same video in native fullscreen (or a full-window modal fallback) with controls and landscape viewing through device rotation. Exiting SHALL return to the popup and restore controls. Closing/hiding/removing the owner SHALL release fullscreen listeners and native media resources. Failure of both fullscreen paths, or unready media, SHALL report a localized reason.

#### Scenario: Popup video enters and exits fullscreen
- **WHEN** the user taps advancing video and then exits fullscreen
- **THEN** the same native video and media session remain in the popup without creating another player or event action
