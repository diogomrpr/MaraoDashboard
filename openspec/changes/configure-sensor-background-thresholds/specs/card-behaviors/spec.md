# Spec Delta

## ADDED Requirements

### Requirement: Numeric sensor background thresholds
An optional `variables.background_thresholds` list on `md_sensor_card` SHALL map finite numeric lower bounds to background colors. The greatest bound less than or equal to the current finite source reading SHALL win. Comparisons SHALL use the unrounded reading in the source unit, independent of display formatting. Below the first bound, or with no rules, the existing appearance SHALL remain.

#### Scenario: Humidity crosses inclusive boundaries
- **WHEN** thresholds are 40 → green and 60 → red
- **THEN** 39.9 uses the existing background, 40 and 59.9 use green, and 60 and 80 use red
- **AND** an authoritative reading update changes the color without reloading or saving

#### Scenario: Values include zero, negatives and decimals
- **WHEN** a numeric sensor reading exactly equals a configured zero, negative or fractional lower bound
- **THEN** that threshold matches using numeric comparison rather than string order or truthiness

#### Scenario: Display precision changes
- **WHEN** a source reading is 59.96 with a threshold at 60 and the displayed value rounds to 60
- **THEN** the threshold at 60 does not match until the source reading reaches 60
- **AND** changing a supported display unit does not reinterpret stored threshold values

### Requirement: Sensor threshold availability and readable presentation
Threshold backgrounds SHALL retain readable text and icons and the configured numeric reading, unit and metadata. Missing, unknown and unavailable states and existing problem presentation SHALL take precedence over threshold colors. Nonnumeric states SHALL retain existing presentation without being coerced to zero. Binary sensor, battery and other card-family colors SHALL remain unchanged.

#### Scenario: A colored humidity sensor becomes unavailable
- **WHEN** the reading changes from 80 to unavailable, unknown or missing
- **THEN** the threshold color is removed and the existing neutral availability presentation appears

#### Scenario: A text sensor has thresholds
- **WHEN** the sensor state is nonnumeric, empty, whitespace-only or nonfinite
- **THEN** no numeric threshold color is applied and the normal state presentation remains

#### Scenario: Threshold backgrounds are light or dark
- **WHEN** a configured threshold color matches
- **THEN** foreground text and icons remain contrasting in the Marao light and dark themes
- **AND** the value and unit remain available as the non-color information

#### Scenario: An existing binary sensor or battery card is displayed
- **WHEN** the card has no sensor threshold configuration
- **THEN** its existing binary cues or battery thresholds remain unchanged
