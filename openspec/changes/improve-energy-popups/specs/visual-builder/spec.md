## ADDED Requirements

### Requirement: Energy contributor and price editing
The builder and native energy-card editor SHALL expose ordered energy contributor
items with an energy sensor, optional name and optional cost sensor, plus optional
`cost_per_kwh` and `calculate_cost` settings. Validation, JSON schema and generation
SHALL carry the same settings. Ordinary edits SHALL preserve unknown fields and
explicit empty contributor lists; old configurations SHALL remain valid.

#### Scenario: Remove every configured contributor
- **WHEN** the user removes the last contributor and saves
- **THEN** the list remains explicitly empty through editor/generator round trips
- **AND** no discovery defaults refill it or alter unrelated card options

#### Scenario: Configure an invalid override
- **WHEN** a price override is negative, nonnumeric or nonfinite
- **THEN** validation rejects it before generating misleading cost output
