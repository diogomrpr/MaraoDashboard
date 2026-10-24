## ADDED Requirements

### Requirement: Optional light-color card background
Individual light cards SHALL expose a boolean `use_light_color` option in generator and native editors, disabled when omitted. Enabled on lights SHALL use valid HA-reported RGB with contrasting text and icons. Other states SHALL retain existing neutral/problem presentation. Missing color data SHALL fall back to the state palette. Configuration SHALL preserve explicit false and unrelated options.

#### Scenario: Light color changes
- **WHEN** an enabled on light reports a new color or white temperature
- **THEN** its card background follows HA's converted RGB without adding rows or changing size

#### Scenario: Existing card is opened
- **WHEN** the option is absent or false
- **THEN** the existing configured active color remains unchanged

### Requirement: White-temperature scale
The white-temperature slider SHALL retain its warm-to-cool gradient and independent thumb without a progress fill. Brightness SHALL retain its current-value fill.

#### Scenario: Temperature is adjusted
- **WHEN** the user drags the temperature thumb
- **THEN** the full gradient remains visible and the existing single-update-on-release behavior remains unchanged
