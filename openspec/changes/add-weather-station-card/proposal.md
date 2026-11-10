# Proposal

## Why

The Weather card should present an existing set of Home Assistant weather sensors as one compact station view, including a configurable wind instrument.

## What Changes

- Add an optional `variables.station_entities` map for station sensor entity IDs. Keep the existing weather-entity card as the default.
- Show available station readings in compact, label-free instruments; pair wind speed, gusts and direction, and pair humidity with dew point.
- Use the precipitation sensor's millimeter reading to select the rainy background at 0.1 mm or more and the clear background below 0.1 mm. The background is the only visible rain-state cue.
- Add `variables.show_wind_angle`, defaulting to false, to hide or show the direction and degrees under the compass. The compass arrow continues to use the sensor value when the text is hidden.
- Exclude the device voltage sensor.

## Compatibility

Both variables are optional. Existing cards retain their weather-entity behavior; station configuration without `show_wind_angle` keeps the direction text hidden. No dashboard format migration is needed.

## Capabilities

### Modified Capabilities

- `card-behaviors`: Optional station readings, rain-background threshold and wind angle text setting.
- `visual-builder`: Expose the station map and wind angle setting through card configuration while preserving omitted/default values.

## Scope

Affected consumer: `md_weather_card`, main station variant. No popup or other card family changes.
