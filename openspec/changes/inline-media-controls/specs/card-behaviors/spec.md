# Spec Delta

## ADDED Requirements

### Requirement: Media display choice
Media card settings SHALL offer localized Popup and On dashboard choices per card. Popup SHALL remain the default when the display setting is omitted. The choice SHALL round-trip through Visual and JSON editing without changing the player's identity, app order, remote targets, explicit actions or unrelated fields. Unsupported display values SHALL produce a readable validation error.

#### Scenario: Existing card has no display setting
- **WHEN** an existing supported media card is opened, compiled or edited without changing Display
- **THEN** it retains its current popup behavior without inserting a default field or rewriting unrelated saved content

#### Scenario: Display is saved and reopened
- **WHEN** an administrator selects On dashboard for one media card and saves
- **THEN** that card reopens with On dashboard selected while another instance can independently retain Popup
- **AND** changing back to Popup preserves its app and remote configuration

#### Scenario: An invalid display value is supplied
- **WHEN** a media card supplies an unsupported display value
- **THEN** validation reports the error before replacing saved source or generating a partially usable dashboard

### Requirement: Inline media control panel
On dashboard SHALL show player information and the existing applicable media controls directly within the page, without first opening a popup. Generic players SHALL show supported playback controls; configured Apple TV players SHALL also show their ordered app shortcuts, directional remote and volume controls. Inline presentation SHALL have no close button, overlay, background inertness or scroll lock.

#### Scenario: An Apple TV card is inline
- **WHEN** a page contains an On dashboard Apple TV media card with configured apps and remote targets
- **THEN** its player information, apps and remote controls are immediately visible and operable in page order
- **AND** opening the page sends no media or remote command

#### Scenario: A generic player is inline
- **WHEN** a generic player uses On dashboard
- **THEN** its player information and applicable playback controls appear without inventing Apple TV apps or a directional remote

#### Scenario: Section settings remain authored
- **WHEN** a media card changes display mode
- **THEN** its section membership, section columns, sibling order and unrelated card configuration remain unchanged
- **AND** its expanded content reflows at the available width with controls at least 48px square

### Requirement: Media action parity across presentations
Popup and inline presentations SHALL use the same configured app sources, actual remote and volume targets, bounded seeking and short/long command semantics. A completed interaction SHALL dispatch once, while preview, cancellation and unavailable or disconnected actual targets SHALL not dispatch. Reported failures SHALL remain readable and state SHALL remain authoritative.

#### Scenario: The same remote is used in either presentation
- **WHEN** a configured directional remote control receives a short activation or completed hold
- **THEN** it sends the same single short or long command to the configured target in either presentation
- **AND** cancellation sends neither command

#### Scenario: A separate volume target is unavailable
- **WHEN** an inline card's volume target becomes unavailable while its player remains usable
- **THEN** its volume actions disable and the target problem remains readable without disabling unrelated usable controls

#### Scenario: An expanded panel is previewed
- **WHEN** controls are activated in an editor preview or inert edit context
- **THEN** no app, playback, volume or remote service is dispatched

### Requirement: Live now playing section
The inline panel SHALL include a distinct Now playing card or section above its controls. It SHALL show HA-reported current media title, available artist or other media details, playback state and available enabled artwork. Updates SHALL follow authoritative reports without remounting controls. Missing metadata, no current media and unavailable playback SHALL have distinct readable presentation without inventing or retaining a stale current item.

#### Scenario: The current item changes
- **WHEN** Home Assistant reports a new media title, artist, source or artwork for the inline player
- **THEN** Now playing updates to the reported item while the apps and remote controls stay mounted
- **AND** an active remote hold is not cancelled by the metadata update

#### Scenario: Playback is paused
- **WHEN** Home Assistant reports paused playback with current media information
- **THEN** the reported item remains visible with a localized Paused state

#### Scenario: Nothing is playing
- **WHEN** the player reports no current media, including idle or off playback
- **THEN** the section shows a localized Nothing playing state without displaying a previous title or artwork as current

#### Scenario: Active playback has incomplete metadata
- **WHEN** the player reports active playback without a media title or artwork
- **THEN** its reported playback state remains visible with available details or a localized metadata fallback
- **AND** it does not invent a title or imply that nothing is playing

#### Scenario: The player becomes unavailable
- **WHEN** the inline player becomes unknown, unavailable or disconnected
- **THEN** neutral readable problem feedback replaces its current-item presentation and applicable controls remain guarded

#### Scenario: Artwork is disabled
- **WHEN** the saved artwork option is false or no usable artwork exists
- **THEN** the section uses the normal themed surface while retaining available current media text and playback state

## MODIFIED Requirements

### Requirement: Standalone native detail parity
Native cards SHALL own automatic detail sheets with existing media, climate, alarm, access, camera, group and history behavior. Duplicate cards SHALL have independent automatic sheets; explicit external popup references SHALL not create extra sheets. Media cards explicitly set to On dashboard SHALL show their media controls inline without creating or opening an unused automatic media sheet.

#### Scenario: Duplicate media cards open details
- **WHEN** differently configured instances are opened
- **THEN** each exposes its own remote and app options without popup collisions

#### Scenario: One duplicate is inline
- **WHEN** two cards use the same player and only one is set to On dashboard
- **THEN** the inline card renders its own configured controls in the page while the Popup card retains its independently configured sheet

#### Scenario: External popup content exists
- **WHEN** a card's display choice changes
- **THEN** explicitly authored external popup definitions and references remain preserved in saved source
- **AND** inline presentation does not automatically open or duplicate that external popup

#### Scenario: A removed automatic popup still has an authored link
- **WHEN** switching to On dashboard would remove an automatic media popup targeted by another authored link
- **THEN** preflight reports the unresolved link before saving rather than deleting, retargeting or silently breaking the link
