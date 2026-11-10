## ADDED Requirements

### Requirement: Weather station sensor presentation
The Weather card SHALL accept an optional map of station sensor entity IDs and show available readings in a compact, label-free station view. It SHALL pair wind speed and gusts with a compass for direction, pair humidity with dew point, and ignore voltage.

#### Scenario: Existing Weather card has no station map
- **WHEN** a saved Weather card has no `station_entities` setting
- **THEN** its existing weather entity, forecast and condition presentation remain unchanged

#### Scenario: Station readings are mapped
- **WHEN** a card has configured station sensor entity IDs
- **THEN** available values appear in the compact station layout with wind and humidity readings paired with their related values
- **AND** voltage is not shown

### Requirement: Weather station rain background
The station SHALL use its mapped precipitation sensor in millimeters to select the background. Readings at or above 0.1 mm SHALL select the rainy background; lower readings SHALL select the clear background. The background alone SHALL communicate rain state.

#### Scenario: Station reaches the rain threshold
- **WHEN** the mapped precipitation sensor reports at least 0.1 mm
- **THEN** the station selects the rainy background without a text rain-status badge

#### Scenario: Station reports a trace below the threshold
- **WHEN** the mapped precipitation sensor reports less than 0.1 mm
- **THEN** the station selects the clear background without a text rain-status badge

### Requirement: Configurable wind angle text
The optional `show_wind_angle` setting SHALL default to false. When false, the station SHALL hide compass direction and degree text while the compass arrow continues to reflect the direction sensor.

#### Scenario: Wind angle text is disabled
- **WHEN** `show_wind_angle` is false and wind direction is available
- **THEN** compass direction and degree text are hidden
- **AND** the compass arrow still points to the reported wind direction

#### Scenario: Wind angle setting is omitted
- **WHEN** the station card has no `show_wind_angle` value
- **THEN** its compass point and degree text remain hidden
