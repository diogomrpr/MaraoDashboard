# Spec Delta

## ADDED Requirements

### Requirement: Plex Watch card belongs to an Apple TV media card
An enabled Plex Watch card SHALL be an owned child of an existing Apple TV media card, inheriting its device target, name and presentation. It SHALL expose Continue Watching and library access in automatic popup and inline content. It SHALL NOT require a second TV configuration or alter existing app-shortcut actions.

#### Scenario: Open Plex from a configured Apple TV card
- **WHEN** the user opens the Plex browser from the Living Room Apple TV card
- **THEN** Living Room is selected automatically using that parent's configured Plex mapping
- **AND** the user does not have to choose the same television again

#### Scenario: Change media presentation
- **WHEN** a configured Apple TV card changes between automatic Popup and On dashboard
- **THEN** both presentations use its same Plex settings, Continue Watching behavior and playback mapping
- **AND** existing app, remote, volume and Now playing controls retain their current behavior

#### Scenario: Ordinary source shortcut is activated
- **WHEN** the user taps an existing Plex app shortcut
- **THEN** its configured source-launch action remains unchanged
- **AND** the new library entry is a distinct control that does not also trigger the shortcut or parent card action

#### Scenario: Plex is not configured
- **WHEN** an existing media card omits Plex settings, explicitly disables them or is a generic non-Apple TV player
- **THEN** it retains its existing content and actions without an extra Plex card, network request or inserted configuration default

### Requirement: Apple TV selection uses existing card associations
The Plex browser SHALL identify its playback TV visibly. With multiple eligible Apple TV card mappings for the same Plex library/account context, it SHALL offer Marao's dropdown using configured names and exact mappings. Opening from a parent SHALL select that parent, independent of a prior browser's choice. Selection alone SHALL NOT actuate or save anything.

#### Scenario: Switch to another configured TV
- **WHEN** Living Room and Bedroom Apple TV cards have eligible Plex mappings and the user selects Bedroom
- **THEN** the browser displays Bedroom and uses its complete mapping for the next explicit playback action
- **AND** it neither copies settings between the cards nor sends an immediate device request

#### Scenario: Open a different parent later
- **WHEN** the browser previously selected Bedroom and is subsequently opened from Living Room
- **THEN** Living Room is the initial target rather than the remembered Bedroom selection

#### Scenario: Only one target or no dashboard context exists
- **WHEN** the parent is the sole eligible target or the surrounding dashboard configuration is unavailable
- **THEN** the browser clearly labels that parent TV without requiring a redundant choice
- **AND** it does not discover arbitrary media players or infer another TV by name

#### Scenario: Configured cards share a name or target
- **WHEN** eligible card occurrences have identical names or duplicate mappings
- **THEN** names are disambiguated by their card/view context and only identical complete mappings are deduplicated
- **AND** differing Plex clients are never silently treated as interchangeable

#### Scenario: Selected card disappears
- **WHEN** the selected card is removed or its mapping changes during an open browser session
- **THEN** pending launch work is cancelled and playback requires a current explicit selection
- **AND** the browser does not silently choose a replacement TV

### Requirement: Plex details retain popup ownership
Plex library details SHALL reuse the shared modal lifecycle with internal folder navigation, focus containment/restoration, background inertness and navbar clearance. Only one sheet SHALL own modality. Explicit authored popup layouts SHALL remain unchanged; unsupported combinations SHALL be explained and rejected before a new Plex configuration is saved.

#### Scenario: Browse from an automatic media popup
- **WHEN** the user opens library details and then navigates between folders or closes the browser
- **THEN** one modal owner retains internal scrolling and back navigation, with focus restored to the surviving relevant opener
- **AND** a second active modal does not trap the user or leave the dashboard inert

#### Scenario: Enable Plex while custom details own the popup
- **WHEN** a media card has an explicit external/custom popup override and the user tries to enable automatic Plex content
- **THEN** the editor explains that automatic Popup or On dashboard is required and blocks that incompatible save
- **AND** its prior configuration, custom popup contents and unsaved Plex choices are preserved for correction or cancellation

### Requirement: Rivulet remains associated with its Apple TV card
Plex Watch SHALL use the existing Apple TV association and shared target dropdown for either playback app.

#### Scenario: Switch between Plex and Rivulet televisions
- **WHEN** compatible cards share one Plex server but use different playback apps
- **THEN** selecting a TV uses its complete playback mapping without changing another card or starting a device action
