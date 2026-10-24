# Native dashboard editing

> Historical capability: standalone native authoring is retired by `remove-native-dashboard-authoring`. The retained text records the former feature; only independent-dashboard ownership and data preservation remain current obligations.


## Purpose

Configure the complete Marao card collection in Home Assistant and transfer an independent starter to native dashboard ownership.

## Requirements

### Requirement: Native card collection
Every published Marao card family SHALL be available by name in the native card picker with compatible entity suggestions, visual configuration and layout sizing. Existing generic types SHALL remain supported.

#### Scenario: A light is added natively
- **WHEN** an administrator selects Marao Light
- **THEN** its compatible entity and brightness options are available without YAML or the Marao builder

### Requirement: Lossless visual configuration
Native forms SHALL expose supported settings and preserve unknown fields, explicit emptiness, order, names, options and structured command data across edits and Visual/YAML switches.

#### Scenario: Advanced data survives an edit
- **WHEN** a vacuum name is edited alongside structured segment parameters and unknown fields
- **THEN** only the edited field changes

### Requirement: Independent native starter
The native Community dashboard starter SHALL produce expanded themed Home, Rooms and room-detail views. Take control SHALL freeze them into ordinary HA storage; later registry changes SHALL NOT refill deleted content.

#### Scenario: A starter is taken over and emptied
- **WHEN** its cards are removed and HA restarts
- **THEN** it stays empty and the existing builder dashboard is unchanged
