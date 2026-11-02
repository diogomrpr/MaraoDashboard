# Spec Delta

## ADDED Requirements

### Requirement: Native People card configuration
HA's native card picker SHALL offer Marao People as `custom:marao-people-card`, with role `md_people_card`, an empty initial `entities` list and a localized visual editor. The editor SHALL select `person.*` entities, expose the panel name, and support adding, removing, reordering and locally naming people. HA SHALL continue owning card placement, visibility, save and cancel.

#### Scenario: A user adds a People card
- **WHEN** the user selects Marao People from Add card
- **THEN** a valid empty card draft opens with a person selector and an understandable empty preview
- **AND** no existing person or dashboard card is changed automatically

#### Scenario: A household list is configured
- **WHEN** the user selects people, reorders them and edits one local display name
- **THEN** the preview and saved card reflect the chosen order and names
- **AND** the HA person's own name remains unchanged

### Requirement: Valid explicit people membership
People cards SHALL require an explicit `entities` array containing unique person entity IDs, either as strings or objects with `entity_id` and optional textual `name` and `icon`. Invalid shapes, duplicate IDs and incompatible domains SHALL produce localized configuration errors without mutating the input. Valid references to currently missing people SHALL remain saved and render as missing.

#### Scenario: Invalid membership is entered through YAML
- **WHEN** a People card contains a non-list selection, duplicate person ID, malformed member, incompatible entity domain or non-text name/icon
- **THEN** configuration reports the invalid selection without dropping or rewriting entries

#### Scenario: A selected person is temporarily absent
- **WHEN** a syntactically valid saved person entity is missing from current HA state
- **THEN** configuration retains that reference and the panel identifies the missing person
- **AND** the user can explicitly remove it through the editor

### Requirement: Lossless people editing and additive compatibility
People editing SHALL preserve membership order, local overrides, unknown card/member fields, explicit empty lists and native layout/visibility fields except for the user's requested edits. Rendering, updates and registry changes SHALL NOT repopulate selections or insert People cards into existing dashboards. Existing card configurations and historical conversion results SHALL retain their prior meaning.

#### Scenario: A local name changes alongside advanced settings
- **WHEN** a People card with member-specific unknown fields, native layout and visibility is edited visually and through YAML
- **THEN** only the requested field changes and all unrelated settings survive

#### Scenario: All people are removed
- **WHEN** the user saves an empty selection and later reloads or updates Marao
- **THEN** the explicit empty list remains empty

#### Scenario: The user cancels a draft
- **WHEN** the user changes people or names and then cancels the HA editing workflow
- **THEN** its previously saved card is unchanged

#### Scenario: An existing dashboard updates
- **WHEN** a dashboard without People cards loads with the new package
- **THEN** its existing cards, header person reading, deletions, empty selections and native configuration remain unchanged
