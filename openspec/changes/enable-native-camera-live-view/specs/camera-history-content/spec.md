# Spec Delta

## MODIFIED Requirements

### Requirement: Native camera previews and event sheets
Available camera cards SHALL show live inline video using Home Assistant's native player when supported by the camera and browser. Unknown, unavailable and disconnected cameras SHALL remain neutral without old media. Audio SHALL NOT autoplay. Activating the camera's event action SHALL open its generated event sheet. Frigate and UniFi Protect events SHALL retain project-owned presentation, provider detection and documented identifier/media-source overrides.

#### Scenario: An available camera card is activated
- **WHEN** its generated popup opens
- **THEN** it shows events from the configured/native detected provider without a third-party camera card

#### Scenario: A supported camera card becomes visible
- **WHEN** an available camera with a supported live source is displayed outside an editing preview
- **THEN** the existing card shows its available still image while its native player starts muted inline live video automatically
- **AND** it switches to live playback when ready without a new card, setting or user activation unless autoplay is blocked
- **AND** the rendered media advances over time rather than remaining an image or event clip

## ADDED Requirements

### Requirement: Standard still-to-live behavior on the existing camera card
The existing `hc_camera_card` SHALL show its available HA still image while initializing native live video concurrently, then automatically replace the still with confirmed live playback in the same media area. This SHALL be standard behavior without a new card, template, mode or setting. A missing or failed still SHALL NOT block live startup. The handoff SHALL NOT require a click or remount the player.

#### Scenario: Live startup takes longer than the still image
- **WHEN** an available existing camera card has displayed its still image and native live playback is still loading
- **THEN** the still remains visible with loading feedback until live playback is confirmed
- **AND** live playback replaces it automatically without a blank intermediate state, layout jump, Play action or mode selection

#### Scenario: The still image is slow or cannot load
- **WHEN** the still image is missing, delayed or fails while native live playback initializes
- **THEN** live startup proceeds independently and the media area keeps its reserved geometry with loading feedback
- **AND** confirmed live playback appears automatically without waiting for the still image
- **AND** a late still-image completion cannot replace video that has already started

#### Scenario: A camera resumes after retry or a lifecycle restart
- **WHEN** explicit Retry or an eligible visibility/availability recovery starts a fresh live attempt for the current camera
- **THEN** the available current still is displayed while the native player initializes
- **AND** it switches automatically to confirmed live playback using the same standard behavior

### Requirement: Safari and UniFi Protect live compatibility
Live video SHALL use Home Assistant's native camera transport and authenticated camera entity. Compatible UniFi Protect streams SHALL work without provider-specific live URLs or credentials. Safari SHALL attempt muted inline autoplay; blocked autoplay SHALL expose an explicit playback action. Marao SHALL NOT enable, reconfigure or control the camera to obtain a feed.

#### Scenario: Safari can autoplay the configured Protect camera
- **WHEN** Safari displays a visible available UniFi Protect camera whose native Home Assistant stream and codec are supported
- **THEN** its still image automatically gives way to muted inline live video without a Play action, fullscreen transition or changes to Protect settings
- **AND** event-provider or recorded-media-source overrides do not replace the live source

#### Scenario: Safari blocks autoplay
- **WHEN** the native player reports that playback requires a user gesture
- **THEN** the card retains its available still and exposes an exceptional playback action of at least 48 by 48 CSS pixels with an internal accessible name
- **AND** activating it retries playback once without opening the event sheet or enabling audio automatically
- **AND** confirmed playback replaces the still automatically; no Play action is required during normal permitted autoplay

### Requirement: Explicit live playback and fallback states
Camera cards SHALL distinguish stream loading, confirmed playback, still-only fallback and reported playback failure from entity recording/activity state. A still fallback SHALL be labelled as a snapshot and SHALL NOT imply live playback. Unsupported or failed playback SHALL expose a readable localized reason and explicit recovery when retry is applicable, without an automatic retry loop.

#### Scenario: A camera exposes only a snapshot
- **WHEN** an available entity supplies a preview but its native camera path cannot provide continuous playback
- **THEN** a snapshot is explicitly identified as such and live playback is not claimed
- **AND** its existing event action remains usable

#### Scenario: Stream initialization or playback fails
- **WHEN** player loading cannot complete within its bounded initialization window or the native player reports a stream, permission or codec error
- **THEN** the shared card problem presentation shows the localized failure with an explicit Retry action where applicable
- **AND** any retained preview is labelled as a snapshot, no frozen frame is marked live, and unrelated state updates do not repeatedly retry

#### Scenario: Recording state changes while video is loading
- **WHEN** Home Assistant reports that a camera is recording but playback has not begun
- **THEN** the recording state remains authoritative without being used as evidence of successful live playback

### Requirement: Stable and bounded camera stream lifecycle

Each visible camera occurrence SHALL retain at most one active native player across ordinary entity, theme, locale and unrelated state updates. Hidden, removed, unavailable, disconnected or replaced cameras SHALL release owned playback resources and invalidate stale initialization. Editing previews SHALL remain inert. Restoring visibility or availability SHALL initialize only the current camera without a retry storm.

#### Scenario: Updates arrive during live playback
- **WHEN** unrelated states or camera metadata, theme or locale change without changing the camera identity or availability
- **THEN** the existing player continues without duplicate stream requests or playback restart

#### Scenario: The card or page becomes hidden
- **WHEN** the card is outside the visible view, the page is hidden, a containing sheet closes, or navigation removes the camera
- **THEN** its owned playback resources are released and no hidden live session remains active for that card
- **AND** making the card visible again permits one current initialization

#### Scenario: Availability or configuration changes during initialization
- **WHEN** a camera becomes unknown, unavailable, disconnected or is replaced while its player is loading
- **THEN** obsolete work cannot attach media or overwrite the current card state
- **AND** unavailable/disconnected cards retain neutral presentation without stale media

#### Scenario: Multiple cards and an editing preview use the same entity
- **WHEN** two visible runtime cards and a read-only editing preview reference one camera
- **THEN** each runtime card owns at most one player and removing one does not stop the other
- **AND** the editing preview starts no stream or device action

#### Scenario: Native signaling ends while the provider still has queued events
- **WHEN** a native WebRTC offer is unsubscribed or its camera occurrence is hidden, removed or invalidated
- **THEN** its dedicated native authenticated connection closes immediately, ending the server session without retiring a subscription on the shared dashboard connection
- **AND** pending authentication cannot start an offer after disposal, unrelated cameras and HA subscriptions remain connected, and native warnings and unexpected errors remain failures
- **AND** Home Assistant retains native transport selection and authentication without a warning filter, grace delay or transport override

### Requirement: Preserved camera configuration and independent actions
Live playback SHALL preserve existing saved camera selections, labels, options, unknown fields, raw cards, custom actions, popup hashes, provider overrides, generated structure and archived history. It SHALL require no source rewrite. Playback and retry interactions SHALL be isolated from event activation; user-facing controls SHALL remain localized, visibly touch-sized and usable at the supported mobile text and zoom sizes.

#### Scenario: An existing camera configuration is rendered
- **WHEN** an existing supported saved or manually authored camera card is opened with the updated runtime
- **THEN** that same card gains the standard automatic still-to-live behavior when supported without a replacement card, opt-in setting or source/generated event configuration change
- **AND** explicit actions and the generated event sheet retain their configured behavior

#### Scenario: A playback action is used beside the event action
- **WHEN** the user activates playback or Retry within the camera surface
- **THEN** only that action executes once and the event popup does not open
- **AND** activating the separate event action still opens the configured popup once
