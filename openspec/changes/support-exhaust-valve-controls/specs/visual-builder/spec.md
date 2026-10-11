# Spec Delta

## ADDED Requirements

### Requirement: Discoverable fan and exhaust-valve selection
The catalog SHALL expose `hc_fan_card` as Fan / exhaust valve, accepting fan entities and non-access covers, including shutters manually used for ventilation. Entity-based selection SHALL propose it for HA damper covers without changing entity metadata or silently adding entities. The existing slider option SHALL describe speed for fans and opening for covers. Unsupported domains and recognized access covers SHALL receive a readable compatibility error.

#### Scenario: A user adds an exhaust valve by card type
- **WHEN** they choose Fan / exhaust valve and search for a non-access shutter
- **THEN** that cover can be selected, named and configured with an optional opening slider without creating a template entity

#### Scenario: A damper is selected by entity
- **WHEN** entity-based selection encounters a `cover` with `device_class: damper` and no configured template
- **THEN** it proposes `hc_fan_card` with opening controls
- **AND** adding it remains an explicit draft action followed by Save & Generate

#### Scenario: An ordinary shutter is selected without an override
- **WHEN** an ordinary shutter has no explicit card template
- **THEN** the existing cover card remains its proposed default

#### Scenario: An incompatible entity is entered
- **WHEN** a non-fan/non-cover entity or recognized access cover is supplied to the ventilation card
- **THEN** the builder explains the incompatibility without saving a nonfunctional or unsafe card

### Requirement: Ventilation choices survive editing
The builder SHALL preserve the existing `hc_fan_card` template identifier, original entity ID, name, icon, supported variables and unrelated fields across Visual/JSON switches, editing, save and reload. Explicit exhaust presentation for a shutter SHALL survive later entity metadata refresh. Existing fan and ordinary cover configurations SHALL remain editable without forced reclassification or schema conversion.

#### Scenario: An exhaust cover is edited in JSON
- **WHEN** a cover configured with `template: hc_fan_card` and `enable_slider: false` is opened in Visual and saved
- **THEN** the same entity, fan template and disabled opening-slider choice survive together with its other configured fields

#### Scenario: Metadata refresh still reports a shutter
- **WHEN** an explicitly configured exhaust card's HA metadata reports `device_class: shutter`
- **THEN** the builder retains the user's ventilation choice rather than resetting it to Cover

#### Scenario: An older fan configuration is opened
- **WHEN** an existing fan card has no newly introduced configuration fields
- **THEN** it retains its on/off and supported speed settings without requiring a migration or re-selection
