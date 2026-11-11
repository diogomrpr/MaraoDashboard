## ADDED Requirements

### Requirement: Weather station card options
The Weather card's native configuration SHALL expose each of the ten supported station readings as an optional, localized Home Assistant sensor entity selector instead of a YAML/object field. The selectors SHALL read and write the existing `variables.station_entities` map. The editor SHALL also expose a localized boolean setting for the wind angle label. The boolean SHALL preserve its hidden default when omitted, and saving either setting SHALL retain unrelated card configuration.

#### Scenario: The wind angle is hidden in card settings
- **WHEN** an administrator disables the Weather card's wind angle label
- **THEN** the saved configuration contains `variables.show_wind_angle: false`
- **AND** the station renderer hides the angle text while retaining the compass direction indicator

#### Scenario: Existing station configuration is reopened
- **WHEN** an existing station card without `show_wind_angle` is opened and saved
- **THEN** the compass text remains hidden and other card settings are preserved

#### Scenario: Station sensors are edited individually
- **WHEN** an existing station card is opened in the native editor
- **THEN** temperature, humidity, dew point, pressure, precipitation, wind speed, gust, direction, illuminance and UV each have a sensor-only entity dropdown populated from the saved mapping
- **AND** changing or clearing one selection preserves other mappings, unknown fields and unrelated card settings
- **AND** clearing the last sensor retains an explicit empty map, while leaving untouched selectors does not create a map on weather-entity cards
