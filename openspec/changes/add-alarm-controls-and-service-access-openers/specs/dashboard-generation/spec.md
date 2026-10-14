## ADDED Requirements

### Requirement: Owned alarm sheets and additive opener descriptors
Generated alarm cards SHALL receive independently identified Marao sheets unless an explicit authored action overrides the generated interaction. Opener descriptors SHALL retain format-2 configuration and existing lock/cover defaults. Existing selections, unknown fields, raw cards and protected custom YAML SHALL survive generation.

#### Scenario: Two pages use one alarm
- **WHEN** both pages are generated
- **THEN** each receives its own valid sheet link without storing a code

#### Scenario: An alarm has an explicit authored action
- **WHEN** its dashboard is regenerated
- **THEN** that action remains authoritative

