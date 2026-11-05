# Spec Delta

## ADDED Requirements

### Requirement: Plex setup inside Apple TV options
The existing Apple TV media-card editor SHALL expose an optional Plex section for a Plex/Rivulet playback choice, returned library/recommendation folders and optional independent browse source. Plex playback additionally requires the mapped Plex client, scan-clients button and exact app source. It SHALL inherit the parent TV binding, explain the one-account prerequisite and offer no profile/token form. All settings SHALL share native edit, schema and validation behavior.

#### Scenario: Configure Plex on an existing TV card
- **WHEN** the user enables Plex in the card's Apple TV options
- **THEN** its current television, name, remote, volume and apps remain present and the user only supplies the missing Plex mapping
- **AND** setup explains that the Plex app must use the connected HA Plex account and its client must have been discovered
- **AND** confirmed settings remain local until the normal native card save

#### Scenario: Select server and Continue Watching folders
- **WHEN** HA supplies multiple server roots or recommendation discovery is ambiguous
- **THEN** the editor offers the returned folder choices and retains their stable content IDs/types
- **AND** it does not silently select a different account/server or guess a folder from its translated title

#### Scenario: Setup folder request fails
- **WHEN** Home Assistant cannot browse the selected server during setup
- **THEN** the editor shows a readable retryable error without losing chosen fields or changing the saved card
- **AND** folder browsing does not power on the TV, open Plex or start playback

### Requirement: Validate Plex mappings before saving
Plex validation SHALL reject malformed or incomplete enabled mappings, wrong entity domains, known incompatible integrations/servers and content references outside the selected server. Missing auxiliary metadata SHALL remain distinguishable from invalid configuration. Explicit external-popup combinations unsupported by automatic Plex content SHALL be rejected without rewriting them.

#### Scenario: Wrong target or library is selected
- **WHEN** an enabled Plex mapping uses a non-media-player client, a non-button discovery target or a returned folder from another server
- **THEN** validation reports the affected field before saving and keeps the previous valid configuration intact

#### Scenario: Inactive client or metadata is still loading
- **WHEN** a registered Plex client is inactive or auxiliary metadata has not loaded
- **THEN** the editor does not discard the mapping or replace it with a different client
- **AND** unavailable setup data is explained rather than treated as permission to invent a default

#### Scenario: A custom popup owns details
- **WHEN** the user enables automatic Plex content alongside an unsupported explicit custom popup override
- **THEN** the incompatibility is identified before save and the user can correct or cancel without losing either draft

### Requirement: Additive lossless Plex configuration
Missing or false Plex settings SHALL preserve the existing disabled behavior. Editors and native composition SHALL preserve supported existing configurations, unknown nested fields, explicit emptiness, app order, custom actions and unrelated card options. Opening an editor, changing TV selection at runtime or inspecting library folders SHALL NOT insert defaults or save configuration.

#### Scenario: Edit an unrelated field
- **WHEN** the user renames a media card with advanced Apple TV/Plex fields and saves
- **THEN** the Plex mapping, explicit false/empty values, app order and unknown options round-trip unchanged
- **AND** no other Apple TV card or raw dashboard content is modified

#### Scenario: Existing release has no Plex field
- **WHEN** a supported historical or current card is loaded, compiled or opened without enabling Plex
- **THEN** the original source and media behavior remain unchanged without a new format migration
- **AND** no Plex object, default app or discovered client is added

#### Scenario: Duplicate and disable a card
- **WHEN** the user duplicates a configured Apple TV card and explicitly disables Plex in one occurrence
- **THEN** the other occurrence retains its complete independent Plex mapping
- **AND** cancelled edits do not modify either saved occurrence

### Requirement: Rivulet settings preserve existing Apple TV configuration
Rivulet setup SHALL retain the parent TV/remote/apps, permit selection of a configured HA Plex server before session discovery, explain the same-server/profile prerequisite and make the browse entity optional. Missing playback choice SHALL retain existing Plex behavior.

#### Scenario: Change playback app
- **WHEN** a user explicitly chooses Rivulet and saves
- **THEN** the card stores `playback_app: rivulet` without requiring Plex playback-only fields
- **AND** unknown options and prior Plex choices remain available when switching back, while Cancel and unchanged open/save preserve the original object
