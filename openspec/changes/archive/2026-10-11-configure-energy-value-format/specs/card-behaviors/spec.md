# Spec Delta

## ADDED Requirements

### Requirement: Compatible energy display units
Numeric power and energy readings SHALL allow source units or supported compatible target units per card. Selecting a target SHALL convert the value using its actual source unit before presentation; power and energy SHALL NOT be interconverted. Monetary readings SHALL retain their source currency. Formatting SHALL NOT change HA state, entity units, recorded values or action payloads.

#### Scenario: Watts are displayed as kilowatts
- **WHEN** an energy graph reads `1500 W` and the chosen unit is `kW`
- **THEN** its displayed numeric value is `1.5` with the `kW` unit rather than `1500 kW`

#### Scenario: Two cards use the same entity
- **WHEN** one selects `Wh` and the other `kWh` for an entity reporting `2500 Wh`
- **THEN** each retains its own equivalent display of `2500 Wh` and `2.5 kWh`
- **AND** the entity state remains `2500` in `Wh`

#### Scenario: Cost precision is configured
- **WHEN** a cost sensor reports `12.345 EUR` with two decimal places selected
- **THEN** it displays the rounded value in the same currency without implying an exchange rate

### Requirement: Energy decimal precision
Energy-related numeric readings SHALL support automatic precision or an integer from zero through six decimal places. Explicit precision SHALL use exactly that many localized decimal places, after conversion, without changing numeric data or rounding twice. Zero and negative readings SHALL remain valid; rounded negative zero SHALL display as zero. Unknown, unavailable, loading and nonnumeric values SHALL NOT become numeric zero.

#### Scenario: A converted reading uses fixed precision
- **WHEN** `1500 W` is displayed in `kW` with precision two
- **THEN** it displays `1.50 kW` in English and `1,50 kW` in Portuguese

#### Scenario: A signed reading rounds to zero
- **WHEN** an exported-power reading of `-0.0004 kW` uses three decimal places
- **THEN** its formatted value is zero without a minus sign and the underlying signed value is preserved

#### Scenario: A source is unavailable or nonnumeric
- **WHEN** formatting is configured and its state is unavailable, unknown or invalid numeric text
- **THEN** its readable nonnumeric state remains visible and no `0`, `NaN` or misleading unit-converted value is fabricated

### Requirement: Opt-in energy formatting compatibility
With no new formatting options, existing displays SHALL remain unchanged, including legacy switch `power_unit` label behavior. New unit/precision options SHALL override only their configured reading, independently of primary toggle state and controls. Missing, changed or incompatible source units SHALL NOT be guessed or mislabeled; explicit conversion failure SHALL show a readable error and retain the original source reading.

#### Scenario: An older dashboard has only a power unit label
- **WHEN** it loads without new formatting options
- **THEN** its existing label and number are retained without an implicit conversion or saved-JSON rewrite

#### Scenario: A switch configures its power reading
- **WHEN** its secondary power sensor uses the new unit and precision options
- **THEN** only that reading changes presentation and its switch action, service target and availability guards remain unchanged

#### Scenario: A source unit changes incompatibly
- **WHEN** a card configured for `kWh` receives a source measured in `W`
- **THEN** it reports the incompatible display configuration and shows the original source value/unit instead of relabeling power as energy
