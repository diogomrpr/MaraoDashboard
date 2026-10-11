# Mobile theme and layout spec delta

## ADDED Requirements

### Requirement: Dynamic iPhone safe-area clearance
Marao dashboard content SHALL remain clear of the iPhone notch and status area using the current host/app or browser safe-area information. Top and side clearance SHALL adapt to device and orientation changes without a model-specific constant or user setting. Existing content spacing SHALL be preserved, and safe-area clearance already supplied by the host SHALL NOT be applied a second time.

#### Scenario: App inset differs from the browser inset
- **WHEN** the Home Assistant iPhone app provides a positive top safe-area inset while the browser environment reports zero
- **THEN** the first dashboard content stays below the app-reported unsafe region
- **AND** the behavior works without a development-only inset override

#### Scenario: Different iPhone cutout sizes
- **WHEN** the current top safe-area value changes between two different positive sizes
- **THEN** the dashboard clearance follows the reported value without selecting a hardcoded phone model

#### Scenario: Rotation moves the unsafe region
- **WHEN** an iPhone rotates from portrait to landscape and reports nonzero left or right insets
- **THEN** dashboard content stays within the updated side boundaries and obsolete portrait clearance is removed
- **AND** usable width and essential text reflow are retained

#### Scenario: Browser supplies the safe area
- **WHEN** no host/app inset is available and the browser reports a nonzero safe area
- **THEN** the dashboard uses that browser value for clearance

#### Scenario: Host already reserves the unsafe region
- **WHEN** the host positions the dashboard within the safe area before Marao applies its layout
- **THEN** Marao retains the existing safe content position without adding a second notch-height gap

#### Scenario: No unsafe region
- **WHEN** an iPhone or supported Android layout has zero effective top and side insets
- **THEN** Marao adds no notch-specific top or side gap
- **AND** ordinary page spacing, touch targets and scrolling remain usable
