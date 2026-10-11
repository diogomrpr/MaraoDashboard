---
title: Room Card
layout: page
parent: Cards
---

# Room Card

`hc_room_card` opens a room and provides one circular lights-off button at the
lower left. The button is at least 48 × 48 CSS pixels, has a localized action
name that includes the room, and dispatches `light.turn_off` once for every
unique selected light. It does not open the room or turn lights on.

```yaml
- type: custom:marao-card
  template: hc_room_card
  name: Bedroom
  icon: mdi:bed
  variables:
    light_entities:
      - light.bedroom_ceiling
      - light.bedroom_reading
  tap_action:
    action: navigate
    navigation_path: /marao-dashboard/bedroom
    haptic: heavy
```

Only `variables.light_entities` determines lighting membership. Neither the
primary `entity` nor legacy `lights_target_entity` adds a light. Any available
selected light being on activates the normal room background. Empty lists have
no lighting state or lights-off button.
Normal lighting has no visible status/count row or binary cue. Its localized
accessible summary still reports the selected lights, and deliberate custom
labels remain visible. This presentation applies only to room cards.

Missing, unknown or unavailable selected lights and a disconnected Home Assistant
produce a readable neutral problem and disable the lights-off button. A partial
group retains its known active-light information. The configured navigation
destination remains usable independently of the lights, including for empty
rooms. The button checks current connection and target availability when pressed.

The title uses the full content width and wraps with long names or enlarged
text. The configured icon is decoration below the title: it has no circular
badge or separate action, and its right and bottom edges are intentionally
cropped. Tapping that area follows the room's navigation. Cards grow to retain
readable labels and problems, using the existing Marao light and dark palette.

`show_icon: false` (or `variables.show_icon: false`) hides the decoration.
`show_name: false` hides the title. Custom labels, meaningful readings, raw
options and explicit navigation actions retain their existing configuration.
No new layout setting or dashboard format is required.
