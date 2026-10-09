---
hide_table_of_contents: true
title: Navigation Card
layout: page
parent: Cards
---

# Navigation Card

`hc_navigation_card` opens a dashboard page or popup. Named navigation cards put
the title across the full width, with the state and icon beneath it. Their
slightly smaller, scalable title helps compact two-column tiles retain a single
line. Long titles and enlarged text wrap instead of clipping.

```yaml
- type: custom:marao-card
  template: hc_navigation_card
  name: Living Room
  entity: light.living_room
  icon: mdi:sofa-outline
  tap_action:
    action: navigate
    navigation_path: /marao-dashboard/living-room
  variables:
    hc_label_prefix: 'Lights: '
```

| Variable | Default | Description |
|----------|---------|-------------|
| hc_label_prefix | Empty | Prefix for the entity state. |
| hc_color | Theme card background | Custom card background. |
| hc_icon_color | Theme icon color | Custom icon color. |

An alarm entity uses Marao's shared alarm state colors unless `hc_color` is
configured. Unknown and unavailable entities use disabled, neutral cards.
For security actions, use the generated access or alarm controls, which provide
the required slide or hold gestures.
