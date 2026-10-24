---
hide_table_of_contents: true
title: Fan Card
layout: page
parent: Cards
---

# Fan / exhaust valve

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
| enable_slider | true | Show supported fan speed or exhaust opening control. |
| card_color | var(--color-blue) | Active card color. |
| custom_label | Empty | Prefix for the displayed state. |

Cover-backed exhaust valves use the same card with their original `cover.*`
entity. HA `damper` covers default to ventilation; select Fan / exhaust valve
explicitly for a valve reported as a shutter. An explicit Cover selection stays
unchanged. The slider describes opening (0 closed, 100 open), never motor speed.
Supported Open/Close buttons remain available when position is unsupported or
missing. Missing, null, invalid and out-of-range positions do not become zero.
Doors, garages and gates require an Access card and cannot use this presentation.

Ventilation covers remain on their configured room or custom page and are excluded
from automatic Blinds summaries/popups. Typed Cover groups use the same ventilation exclusion. Explicit ordinary Cover
choices remain in Blinds; saved membership and unknown source fields are preserved. No new overview category or navigation entry is created. Before a
downgrade, change cover-backed fan cards to `md_cover_card` or restore saved
pre-change source with its matching package. No entity or saved format changes.
