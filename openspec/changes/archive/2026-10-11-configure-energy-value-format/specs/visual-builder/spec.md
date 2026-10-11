# Spec Delta

## ADDED Requirements

### Requirement: Per-reading energy formatting controls
The shared editor SHALL offer display unit and decimal precision for energy-related numeric readings on cards, including graph/load metrics, switch power and energy-period summaries. Unit choices SHALL offer source/automatic and supported compatible units; precision SHALL offer automatic or zero through six decimal places. Settings SHALL remain card-owned across Visual/JSON switches, selector edits, duplication and generation, including generated popups.

#### Scenario: An administrator edits an energy card
- **WHEN** `kW` and two decimal places are selected for its watt-valued sensor
- **THEN** saving generates the configured equivalent reading in both card and associated numeric history presentation

#### Scenario: The same entity appears on several pages
- **WHEN** one card's display unit or precision changes
- **THEN** other cards keep their own settings and the Home Assistant entity configuration is unchanged

#### Scenario: Formatting is removed
- **WHEN** both new options are reset to automatic/default with no stored overrides
- **THEN** the card returns to its legacy display rather than persisting artificial formatting defaults

### Requirement: Energy formatting validation and localization
Invalid unit identifiers, incompatible source/target dimensions and precision outside integer zero through six SHALL produce readable validation errors before generation. Booleans, fractions and numeric strings SHALL NOT count as precision integers. Missing/unknown source units SHALL NOT authorize conversion. Monetary and other unsupported dimensions SHALL offer source units only. Controls/help/errors SHALL be localized, semantic, scalable and visibly at least 48 by 48 CSS pixels.

#### Scenario: JSON specifies invalid precision
- **WHEN** precision is `true`, `"2"`, `1.5`, negative or greater than six
- **THEN** validation identifies the invalid option without replacing the saved dashboard

#### Scenario: Energy and power are confused
- **WHEN** a watt-valued reading is configured to display in `kWh`
- **THEN** saving reports the incompatible unit instead of emitting a misleading label

#### Scenario: Unit metadata is unavailable during editing
- **WHEN** an explicitly configured conversion cannot yet be verified
- **THEN** the editor explains that source metadata is required and preserves the draft rather than guessing, silently clearing it or generating incorrect output
