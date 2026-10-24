---
hide_table_of_contents: true
title: Header card
layout: page
parent: Cards
---

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

The `md_header_card` is used on top of your dashboard. 

The header card will always show the weather conditions and the date. Its possible to hide the air quality and person when you don't use that variable.

![Header Card Light](../../../assets/images/cards/md_header_card/headercard_light.png)

## Usage

```yaml
  - type: custom:marao-card
    template: md_header_card
    entity: weather.buienradar
    variables:
      air_quality_sensor: sensor.<airqualitysensor>
      person_entity: person.<person>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| entity | / | **Yes** | Needed for the weather condition |
| person_entity | / | No | Needed for the person card |
| air_quality_sensor | / | No | The entity for air quality|
