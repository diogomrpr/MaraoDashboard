# Spec Delta

## ADDED Requirements

### Requirement: Ordered power device configuration
Graph cards SHALL expose an ordered optional Power devices list with a sensor binding and optional name in the visual builder, native editor and JSON schema. Validation SHALL reject malformed, duplicate and known incompatible bindings. Editing SHALL preserve unknown row fields, order, explicit emptiness and unrelated options. Existing saved cards SHALL continue to work without a device list or a source-format migration.

#### Scenario: Saving a customized device list
- **WHEN** devices are added, renamed, reordered or removed and the card is saved
- **THEN** every supported editor and generator preserves the selected order, names and source bindings
- **AND** an explicitly empty list remains empty without discovery filling it

#### Scenario: A cumulative energy sensor is selected as a power device
- **WHEN** available metadata identifies its unit as kWh
- **THEN** validation explains that a power sensor is required instead of estimating instantaneous power from energy totals
