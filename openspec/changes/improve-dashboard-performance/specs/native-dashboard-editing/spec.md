## ADDED Requirements

### Requirement: Fetch conversion history on demand

An ordinary dashboard that archives its conversion history SHALL keep all native views, raw cards and unrelated settings editable in Home Assistant. Its saved configuration SHALL identify the archived conversion record by a version, byte length and SHA-256 checksum. The ordinary dashboard and settings opening paths SHALL work without fetching that record.

#### Scenario: An administrator reduces the size of an existing converted dashboard

- **WHEN** the administrator downloads the original dashboard and chooses to archive its conversion history
- **THEN** Marao stages the archive, reads it back, verifies its contents and checks that the dashboard is still current before saving the reference
- **AND** the saved native views, ordering and unknown fields remain identical

#### Scenario: An administrator exports a converted dashboard after native edits

- **WHEN** the administrator requests an export with recovery data
- **THEN** Marao reads the current saved dashboard and its matching archive on demand and returns a self-contained export
- **AND** a missing archive or checksum mismatch prevents a successful export

#### Scenario: An older dashboard is opened

- **WHEN** a user opens a dashboard with its original embedded conversion history
- **THEN** Marao honors its released format and makes no conversion or archive writes

### Requirement: Keep editing and optional features off the ordinary first-card path

Ordinary card startup SHALL provide the registration and validation required by Home Assistant and the renderer for the current card. Full editing forms and dashboard settings SHALL load through their respective open actions. Visible cards, direct specialty routes, immediate gestures and navigation recovery SHALL continue to function when optional modules have yet to load.

#### Scenario: A user opens an ordinary view directly

- **WHEN** Home Assistant opens the view
- **THEN** Marao can present its first interactive card without fetching the full editor, settings, migration, detailed history or dishwasher controls
- **AND** a directly requested specialty can load its renderer while unrelated background features wait for the initial presentation

#### Scenario: A popup or editor opens while other modules are still loading

- **WHEN** the user activates a popup or opens editing
- **THEN** the associated handler loads the required feature, retains the correct owning card and preserves the user's current saved configuration
