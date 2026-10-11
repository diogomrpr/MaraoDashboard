---
hide_table_of_contents: true
title: Sensor Card
layout: page
parent: Cards
---

# Sensor Card

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

The `hc_sensor_card` is used to view the state of a sensor or binary sensor. It's configured to show the state of the sensor and the last updated time when Home Assistant supplies it.

![Sensor Card Light](../../../assets/images/cards/hc_sensor_card/sensorcard_light.png)

## Usage

```yaml
  - type: custom:marao-card
    template: hc_sensor_card
    entity: <sensor or binary sensor>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| hc_card_color | var(--primary-color) | No | Active background color. |
| on_icon | Entity icon | No | Icon for on or non-binary states. |
| off_icon | Entity icon | No | Icon for off states. |

## Numeric reading format

Set `variables.display_unit` to convert a compatible power/energy reading and
`variables.display_precision` to an integer from 0 to 6. Omit either key for Auto.
For example, a W sensor with `display_unit: kW` and `display_precision: 2` shows
1500 W as `1.50 kW` (punctuation follows Home Assistant). See the
[shared energy format contract](index.md#energy-reading-format) for unit choices,
raw history handling and incompatible metadata. Nonnumeric states keep their
normal presentation.
