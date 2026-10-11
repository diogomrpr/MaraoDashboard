---
hide_table_of_contents: true
title: Fan Card
layout: page
parent: Cards
---

# Fan Card

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

`hc_fan_card` toggles a fan and shows a speed slider when the entity supports
speed control. Single-speed fans have only the toggle. Unknown and unavailable
entities keep their controls disabled.

![Fan Card Light](../../../assets/images/cards/hc_fan_card/fancard_light.png)

```yaml
- type: custom:marao-card
  template: hc_fan_card
  entity: fan.living_room
  variables:
    enable_slider: true
```

| Variable | Default | Description |
|----------|---------|-------------|
| enable_slider | true | Show the slider on fans that support speed control. |
| card_color | var(--color-blue) | Active card color. |
| custom_label | Empty | Prefix for the displayed state. |
