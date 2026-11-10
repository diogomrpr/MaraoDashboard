## ADDED Requirements

### Requirement: Weather station card options
The Weather card's native configuration SHALL expose the optional station entity map and a localized boolean setting for the wind angle label. The boolean SHALL preserve its hidden default when omitted, and saving either setting SHALL retain unrelated card configuration.

#### Scenario: The wind angle is hidden in card settings
- **WHEN** an administrator disables the Weather card's wind angle label
- **THEN** the saved configuration contains `variables.show_wind_angle: false`
- **AND** the station renderer hides the angle text while retaining the compass direction indicator

#### Scenario: Existing station configuration is reopened
- **WHEN** an existing station card without `show_wind_angle` is opened and saved
- **THEN** the compass text remains hidden and other card settings are preserved
