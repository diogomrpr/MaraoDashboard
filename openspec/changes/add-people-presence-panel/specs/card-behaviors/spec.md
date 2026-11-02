# Spec Delta

## ADDED Requirements

### Requirement: Explicit people presence panel
Marao SHALL provide a People card displaying every explicitly selected `person.*` entity in saved order. Each entry SHALL show its local display name or HA name, an HA picture or fallback icon, and visible location text. An empty selection SHALL show a localized empty state without discovering or inserting people.

#### Scenario: Several people are selected
- **WHEN** the card contains three selected people
- **THEN** all three names and location readings appear directly in saved order without opening another view or popup
- **AND** an absent or failed picture uses a fallback icon without hiding the person or location

#### Scenario: The selection is empty or changes elsewhere in HA
- **WHEN** a saved card has an empty list or another person is later added to HA
- **THEN** the saved list remains unchanged and an empty list displays No people selected in the current language

### Requirement: Authoritative person location labels
People cards SHALL display `home` as localized Home, `not_home` as localized Away, and other usable reported place states by their readable name. They SHALL update from HA person state without deriving presence from coordinates, tracker priority, elapsed time or other selected people. Place names SHALL remain meaningful user-authored text.

#### Scenario: A person moves between places
- **WHEN** HA changes a selected person's state from `home` to `not_home` to `Work`
- **THEN** that entry updates to Home, Away and Work respectively in the current UI language
- **AND** other people retain their own readings and order

#### Scenario: The named place is not currently in the zone registry
- **WHEN** HA reports a usable named place for a selected person without a matching zone entity
- **THEN** its reported place remains visible instead of being reduced to Away

#### Scenario: The person has no coordinates
- **WHEN** HA reports a usable home, away or named-place state without latitude or longitude
- **THEN** the same location label is shown without requiring coordinate data

### Requirement: Independent people availability
People cards SHALL distinguish initial loading, missing entities, `unknown` and `unavailable` with localized neutral readings. Failure of one person SHALL NOT hide valid readings for others or imply that the failed person is away. On disconnection, entries SHALL use neutral connection treatment and retain HA's native connection warning without inferring a new location or age-based staleness.

#### Scenario: Only one selected person is unavailable
- **WHEN** one person is unavailable while another reports Home and another reports Work
- **THEN** each remains visible with its own reading and the unavailable entry is neutral

#### Scenario: State is loading or cannot be read
- **WHEN** HA state has not loaded, a selected entity is absent, or its state is unknown or unavailable
- **THEN** the corresponding entry identifies Loading, Entity missing, Unknown or Unavailable rather than Home or Away

#### Scenario: HA disconnects and reconnects
- **WHEN** HA disconnects with previously known person states
- **THEN** the card adopts neutral connection treatment and HA's native warning remains available
- **AND** reconnection resumes the current reported readings without modifying saved membership

### Requirement: Readable mobile people presentation
People cards SHALL use Marao typography and theme tokens, with visible location text that does not rely on color or a tooltip. Names and locations SHALL wrap at 320 CSS pixels and enlarged text without horizontal page scrolling or lost people. The card SHALL allow content-driven height and preserve configured order across state updates.

#### Scenario: Long names and places appear on a narrow screen
- **WHEN** several entries have long names or place labels on a 320 CSS-pixel viewport or with 200% text
- **THEN** all essential text remains readable by wrapping and the panel grows vertically as needed
- **AND** the light and dark appearances retain visible non-color location cues

### Requirement: Informational presence privacy
People cards SHALL read existing HA states without changing persons, trackers, zones or devices. Rendering and ordinary interaction SHALL NOT initiate tracking, service calls, location polling or history requests. They SHALL persist only configuration references and display choices, without copying live locations, coordinates, pictures or tracking identifiers into saved configuration or diagnostics.

#### Scenario: The panel is displayed, previewed or tapped
- **WHEN** the panel receives state, appears in an editor preview or is tapped
- **THEN** it displays information without a service call or location-data request
- **AND** ordinary picture rendering does not add a tracking or map provider

#### Scenario: A person changes location while the editor is open
- **WHEN** live person data changes and the user saves a display-name edit
- **THEN** the saved card contains the requested configuration edit without a snapshot of that person's live data
