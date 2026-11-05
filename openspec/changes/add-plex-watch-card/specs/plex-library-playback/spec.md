# Spec Delta

## Purpose

Let users browse one connected Plex profile's library and resume or start a selected title on the Plex client associated with an existing Apple TV card.

## ADDED Requirements

### Requirement: One-profile library browsing
The Plex browser SHALL use one Home Assistant Plex account context and the configured server library. It SHALL expose returned movie, show, season and episode folders, with Recently Added when supplied. Browsing SHALL NOT wake a TV, launch an app, start playback or change profile.

#### Scenario: Browse while the TV is off
- **WHEN** the parent TV is off, its registered Plex client is inactive and the configured server is reachable
- **THEN** opening the browser can list the library without a device service call
- **AND** show and season tiles navigate to their descendants rather than immediately playing an arbitrary episode

#### Scenario: Large folder is opened
- **WHEN** a returned folder contains more items than fit on screen
- **THEN** every item remains reachable in returned order with bounded rendering and lazy artwork
- **AND** unrelated entity updates do not reload the folder or reset its scroll position

### Requirement: Continue Watching preserves Plex resume semantics
Continue Watching SHALL appear before general library browsing and use the connected profile's supplied recommendations. Activating an entry SHALL retain its exact content identity and resume semantics. Empty or absent recommendations SHALL have distinct readable results; the card SHALL NOT invent watch history or progress measurements.

#### Scenario: Resume an interrupted episode
- **WHEN** an entry returned by Plex includes a resume indication and the user activates it
- **THEN** the playback request preserves that entry's content ID, content type and resume indication
- **AND** playback is not replaced by a title search or forced to the beginning

#### Scenario: Server has no recommendation entries
- **WHEN** the Continue Watching folder is empty or the configured server does not expose that folder
- **THEN** the card distinguishes nothing to continue from an unavailable recommendation feature
- **AND** usable general library browsing remains available

#### Scenario: Titles are duplicated
- **WHEN** two movies or episodes have the same displayed title
- **THEN** activating one sends its returned content identity rather than selecting a title match

### Requirement: Selected Apple TV launch sequence
A completed playable-title tap SHALL provide one strong haptic and immediate launch feedback. For Plex playback it SHALL wake the selected parent Apple TV if needed, open its exact configured Plex source, discover or await the mapped Plex client, and send one playback request only when that client is usable. Already-satisfied steps SHALL NOT be repeated.

#### Scenario: Cold launch
- **WHEN** the selected Apple TV is off and Plex is not accepting playback
- **THEN** the TV receives wake and app-launch requests before playback is attempted
- **AND** client discovery occurs at most once for the attempt, playback waits for the mapped client's readiness, and one request targets that Plex client
- **AND** no other Apple TV or Plex client is actuated

#### Scenario: Plex is already ready
- **WHEN** current HA reports establish that Plex is open and its mapped client is usable
- **THEN** one tap requests the selected content without redundant power, source or scan actions

#### Scenario: Unusable parent or discovery target
- **WHEN** HA is disconnected or a service's actual target is missing, unknown or unavailable
- **THEN** that service is not dispatched and its readable availability reason is shown
- **AND** an inactive Plex client permits only the guarded wake/open/discovery stages, never an unavailable-client playback call

### Requirement: Bounded launch and authoritative results
Each launch SHALL have a 30-second readiness deadline, block overlapping play activations and stop after failure or timeout without automatic retry or fallback targets. A service acknowledgement SHALL NOT be displayed as confirmed playback; Now playing SHALL remain HA-authoritative. Existing usable media controls SHALL retain their own target guards.

#### Scenario: Client never becomes ready
- **WHEN** the readiness deadline expires before the associated client is usable
- **THEN** a readable launch-timeout result appears, pending feedback ends and no playback request is sent
- **AND** readiness listeners and timers are released; another attempt requires an explicit tap

#### Scenario: A launch step fails
- **WHEN** Home Assistant rejects wake, app launch, discovery or playback
- **THEN** the initiating card displays the reported failure and no later step runs
- **AND** a retry is not silently dispatched

#### Scenario: Repeated input during launch
- **WHEN** another play activation occurs before the current attempt settles
- **THEN** it does not create overlapping service sequences or duplicate playback
- **AND** acceptance of the first request does not fabricate a Playing state

### Requirement: Launch and browse context isolation
Outstanding work SHALL be invalidated when the selected mapping, parent configuration, HA user/connection, edit/preview state or component lifecycle changes. Closing the browser SHALL cancel an unsent launch. Obsolete results SHALL NOT change current content or dispatch later actions; already completed device actions SHALL NOT be reversed automatically.

#### Scenario: TV changes while Plex opens
- **WHEN** the user switches TV or its owning card is removed/reconfigured before playback dispatch
- **THEN** the previous attempt stops and cannot later play on either television
- **AND** the new selected target requires a new explicit title activation

#### Scenario: Obsolete browse response arrives
- **WHEN** a folder request finishes after the user changes account, server, folder or card context
- **THEN** it cannot replace the current list, restore private cached content or mark a different card failed

#### Scenario: Preview or browser closure interrupts launch
- **WHEN** edit/preview begins or the browser closes before playback is sent
- **THEN** outstanding readiness work is cancelled and no further device request is dispatched
- **AND** ordinary previews never actuate a TV, scan button or Plex client

### Requirement: Private artwork and configuration
Plex credentials SHALL remain owned by Home Assistant. Card settings, exports, logs and persisted caches SHALL contain no Plex token or authenticated raw thumbnail URL. Artwork SHALL use the authenticated HA proxy boundary; absent or failed artwork SHALL retain a readable title and neutral fallback. Requests SHALL NOT follow arbitrary image hosts supplied in browse content.

#### Scenario: Plex returns a token-bearing thumbnail
- **WHEN** browse results contain a direct server image URL with credentials
- **THEN** the card uses the HA Plex image proxy instead of placing that URL in its rendered image source or saved configuration
- **AND** account/context changes release obsolete in-memory artwork and library results

#### Scenario: Artwork is absent or cannot load
- **WHEN** a title has no usable thumbnail or its image request fails
- **THEN** its readable title and neutral fallback remain available without a broken image or repeated automatic requests
- **AND** reported content failures retain the shared readable failure treatment

### Requirement: Localized accessible browser states
The browser SHALL distinguish loading, empty, unavailable and failed content, with explicit retry/back controls where useful. It SHALL use Marao's mobile theme, localized English/Portuguese text, semantic controls, wrapping essential titles and touch targets of at least 48 CSS pixels. Missing browse metadata SHALL NOT become invented readings.

#### Scenario: Library read fails
- **WHEN** Home Assistant reports a browse failure
- **THEN** the card shows a readable failure and explicit Retry or Back rather than an empty-library result
- **AND** usable controls and the selected TV identity remain inspectable

#### Scenario: Narrow mobile browser
- **WHEN** the card or sheet is displayed at 320 CSS pixels with enlarged text
- **THEN** target selection, titles, back/close and playback actions remain reachable without hover or hidden swipe actions
- **AND** state meaning remains available independently of poster color

### Requirement: Rivulet playback uses an independent Plex browsing source
`playback_app: rivulet` SHALL browse HA's selected Plex server through an optional `browse_entity` or an enabled registered Plex entity belonging to that server, independently of the playback Apple TV. It SHALL require neither a per-TV Plex playback client nor a Plex scan/source configuration. Rivulet SHALL use its selected Plex server/profile; the card SHALL explain this prerequisite and SHALL NOT claim a URL parameter switches it.

#### Scenario: Rivulet starts an interrupted episode
- **WHEN** a returned movie/episode is activated for Rivulet
- **THEN** its validated rating key becomes one `rivulet://play/<ratingKey>` URL targeting the selected Apple TV after any necessary guarded wake
- **AND** saved resume progress is delegated to Rivulet, with no Plex scan/source/client playback call

#### Scenario: No Plex session has been discovered
- **WHEN** the real server is configured but HA has no registered media player for it
- **THEN** browsing explains how playing once in Rivulet permits session discovery and offers explicit Retry
- **AND** the real server remains selected without fictional content, arbitrary other-server fallback or changes to Plex configuration/history
