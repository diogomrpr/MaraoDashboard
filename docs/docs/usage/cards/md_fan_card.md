---
hide_table_of_contents: true
title: Fan Card
layout: page
parent: Cards
---

# Fan Card

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

`md_fan_card` toggles a fan and shows a speed slider when the entity supports
speed control. Single-speed fans have only the toggle. Unknown and unavailable
entities keep their controls disabled.

The icon and title share one header row with or without a speed slider. Long
names wrap beside the icon, with useful state and controls below.

![Fan Card Light](../../../assets/images/cards/md_fan_card/fancard_light.png)

```yaml
- type: custom:marao-card
  template: md_fan_card
  entity: fan.living_room
  variables:
    enable_slider: true
```

| Variable | Default | Description |
|----------|---------|-------------|
| enable_slider | true | Show the slider on fans that support speed control. |
| card_color | var(--color-blue) | Active card color. |
| custom_label | Empty | Prefix for the displayed state. |
