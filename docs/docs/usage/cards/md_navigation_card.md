---
hide_table_of_contents: true
title: Navigation Card
layout: page
parent: Cards
---

# Navigation Card

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

`md_navigation_card` opens a dashboard page or popup. Named navigation cards put
the title across the full width, with the state and icon beneath it. Their
slightly smaller, scalable title helps compact two-column tiles retain a single
line. Long titles and enlarged text wrap instead of clipping.

```yaml
- type: custom:marao-card
  template: md_navigation_card
  name: Living Room
  entity: light.living_room
  icon: mdi:sofa-outline
  tap_action:
    action: navigate
    navigation_path: /marao-dashboard/living-room
  variables:
    md_label_prefix: 'Lights: '
```

| Variable | Default | Description |
|----------|---------|-------------|
| md_label_prefix | Empty | Prefix for the entity state. |
| md_color | Theme card background | Custom card background. |
| md_icon_color | Theme icon color | Custom icon color. |

An alarm entity uses Marao's shared alarm state colors unless `md_color` is
configured. Unknown and unavailable entities use disabled, neutral cards.
For security actions, use the generated access or alarm controls, which provide
the required slide or hold gestures.
