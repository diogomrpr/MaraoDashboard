# Spec Delta

## ADDED Requirements

### Requirement: Full-page floor-plan presentation
A floor-plan card SHALL offer an explicit full-page option that uses the available page area above the existing floating navbar. Generation SHALL keep the plan on its configured Marao page, retain every configured navigation entry and preserve popup behavior. Ordinary presentation SHALL remain the default when the option is absent or false.

#### Scenario: Open a full-page room plan
- **WHEN** a valid page contains a floor-plan card with full-page display enabled
- **THEN** the generated view gives the plan the available width and height above the safe-area-aware navbar
- **AND** the complete image fits without distortion/cropping, allowing unused space when image and viewport proportions differ
- **AND** light controls and popup sheets remain reachable

#### Scenario: Leave full-page mode
- **WHEN** the administrator disables the option and saves
- **THEN** the same card retains its image, lights and geometry in ordinary page composition
- **AND** no page, navigation entry or source field is replaced with starter content

### Requirement: Non-destructive floor-plan layout validation
Full-page mode SHALL require exactly one floor-plan content card on its page. Additional visible cards, multiple full-page plans or non-popup custom page content SHALL produce a readable validation error before writes. Structural popup definitions SHALL remain supported. Enabling the option SHALL NOT silently hide, delete or move incompatible content.

#### Scenario: A populated page enables full-page mode
- **WHEN** the page still contains another visible card or page-level custom content
- **THEN** the editor explains the conflict and requires the administrator to resolve it or disable full-page mode
- **AND** source, generated dashboard and unrelated page settings remain untouched

### Requirement: Floor-plan source and output compatibility
Generation and native editing SHALL carry complete floor-plan image references, ordered light bindings, geometry and unknown fields without mutating input. Existing released sources lacking the new card SHALL retain their source and ordinary generated composition. Invalid or unsupported sources SHALL remain untouched under existing save/preflight/recovery contracts.

#### Scenario: Round-trip a configured floor plan
- **WHEN** the accepted source is validated, previewed, saved and reopened
- **THEN** the same image reference, light order, coordinates, strip widths and empty/unknown values remain present
- **AND** preview and compilation dispatch no upload, image deletion, entity service or save

#### Scenario: Regenerate an existing released dashboard
- **WHEN** supported historical source without a Floor Plan card is loaded by the updated package
- **THEN** its source and expected ordinary output remain unchanged, without injecting a new layout option or floor-plan defaults
