# Spec Delta

## ADDED Requirements

### Requirement: Sensor threshold list editing
The sensor-card editor SHALL offer optional threshold/color rows for numeric sensor entities with add, edit and remove controls. Each row SHALL contain a finite numeric `value` and an opaque hexadecimal `color` in `#RRGGBB` format. Localized help SHALL explain inclusive lower bounds, source units and the normal background below the first threshold. Visual editing and JSON SHALL expose the same settings.

#### Scenario: Configure humidity ranges
- **WHEN** the administrator adds rows for 40 with green and 60 with red
- **THEN** the draft contains `variables.background_thresholds` with those numeric values and colors
- **AND** only explicit Save & Generate persists the change

#### Scenario: Edit on mobile
- **WHEN** the administrator edits a threshold or chooses its color
- **THEN** the existing shared numeric and color controls have localized semantic names and full-size touch targets
- **AND** essential labels and help wrap within the mobile editor

### Requirement: Consistent sensor threshold validation
Visual/JSON acceptance, backend generation and direct runtime card configuration SHALL validate threshold rules consistently. Bounds SHALL be strictly increasing finite numbers; booleans, numeric strings, duplicates, descending bounds, missing fields and malformed colors SHALL be rejected with readable errors. A nonempty list SHALL require a sensor entity, excluding binary sensors. Invalid configuration SHALL NOT replace saved data.

#### Scenario: Invalid bounds are submitted
- **WHEN** a rule contains a nonfinite bound, a string or boolean bound, duplicate bounds or descending bounds
- **THEN** acceptance reports the invalid threshold without silently sorting, coercing or discarding rows
- **AND** the complete draft remains available for correction

#### Scenario: A color or list shape is invalid
- **WHEN** the list is not an array, a row is not an object, or its value/color is missing or malformed
- **THEN** validation identifies the problem before generation or direct runtime rendering

#### Scenario: Thresholds target a binary sensor
- **WHEN** a nonempty threshold list is configured for a binary sensor
- **THEN** validation explains that numeric sensor background thresholds require a sensor entity
- **AND** binary-state color configuration remains available unchanged

### Requirement: Preserve optional sensor threshold configuration
Opening, editing, duplicating, generating and saving sensor cards SHALL preserve valid threshold lists, row order, unknown row fields and unrelated configuration. Omitted lists SHALL remain omitted and explicitly empty lists SHALL remain empty without defaults. Existing released sensor configurations and supported aliases SHALL retain their behavior without a dashboard-format migration.

#### Scenario: Remove the final threshold
- **WHEN** the administrator removes the last rule and saves
- **THEN** the explicit empty list survives the editor/generator round trip and restores normal background behavior

#### Scenario: A sensor card is edited without changing its thresholds
- **WHEN** the administrator renames, duplicates or moves the card, or switches Visual/JSON modes
- **THEN** its threshold values, colors, order and unknown fields remain intact
- **AND** raw cards, other card occurrences and unrelated dashboard settings remain unchanged

#### Scenario: An older card omits thresholds
- **WHEN** a supported released sensor configuration is opened and saved
- **THEN** no threshold list or color default is inserted and the existing settings remain valid
