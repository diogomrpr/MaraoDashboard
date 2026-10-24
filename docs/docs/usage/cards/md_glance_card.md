---
hide_table_of_contents: true
title: Glance card
layout: page
parent: Cards
---

# Glance Card

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

The `md_glance_card` is used to display a summary of your entities. It's configured to show the state of the entity and the icon.
You can add minimun 1 and maximum 3 entities. The card will automatically adjust the placement of the entities.

Readings use Home Assistant's localized states and units. Unknown and unavailable
readings stay neutral without hiding the other readings. Names default to each
entity's friendly name and can be overridden with `entity1_name`, `entity2_name`,
or `entity3_name`.

![Glance Card Light](../../../assets/images/cards/md_glance_card/glancecard_light.png)

## Usage

```yaml
  - type: custom:marao-card
    template: md_glance_card
    variables:
        entity1: <Your sensor>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| entity1 | / | **Yes** | add the first entity to the card|
| entity2 | / | No | add the second entity to the card|
| entity3 | / | No | add the third entity to the card|
| entity1_name | Entity friendly name | No | label for the first reading |
| entity2_name | Entity friendly name | No | label for the second reading |
| entity3_name | Entity friendly name | No | label for the third reading |
| entity1_icon | Icon from entity itself | No | replace the icon for the first entity |
| entity2_icon | Icon from entity itself | No | replace the icon for the second entity |
| entity3_icon | Icon from entity itself | No | replace the icon for the third entity |
| entity1_icon_color: | var(--text) | No | The color of the first icon |
| entity2_icon_color: | var(--text) | No | The color of the second icon |
| entity3_icon_color: | var(--text) | No | The color of the third icon |
