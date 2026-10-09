---
hide_table_of_contents: true
title: Scene card
layout: page
parent: Cards
---

# Scene card

Shows the options of a Home Assistant `input_select` or `select` entity as
buttons. The current option stays visibly selected, and the card supports one
or more options. Labels come directly from the entity's `options` attribute.

## Usage

Create an input selector with the choices you want, or use an existing `select`
entity. Add the card with that entity ID:

```yaml
- type: custom:marao-card
  template: hc_scene_card
  entity: input_select.room_scene
  name: Room scene
```

For example, a selector with `Relax`, `Movie`, and `Night` options produces three
buttons. Choosing **Movie** calls `input_select.select_option` once with
`option: Movie`. A `select` entity uses its corresponding `select.select_option`
action. The selection updates when Home Assistant reports the new state.

To activate lighting or other scenes, configure a Home Assistant automation
that responds to the selector changing and activates the matching scene.

## Behavior

- Buttons wrap their labels and remain at least 48 by 48 CSS pixels.
- `unknown`, `unavailable`, missing entities, and disconnected Home Assistant
  disable selection. Unknown and unavailable states stay neutral.
- A rejected action produces a readable Home Assistant notification.
- Configure option names on the Home Assistant entity; the card needs no
  numbered option variables.
