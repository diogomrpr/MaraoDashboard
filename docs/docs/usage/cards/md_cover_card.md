---
title: Cover Card
layout: page
parent: Cards
---

# Cover Card

The `md_cover_card` is used to control a cover, blind, or shutter. It shows the current position, opening and closing states, and a position slider.

The icon and title share one header row. Long names wrap beside the icon, with
position, movement state and the slider below.

## Usage

```yaml
  - type: custom:marao-card
    template: md_cover_card
    entity: <your cover entity>
    name: Living Room Blind
    variables:
      card_color: var(--color-blue)
```

**Remember to take care of indentation**

## Variable / entry

| Variable | Default | Required | Example |
|:----------|:---------|:----------|:------------|
| <span class="entry-type-ha"></span> entity | | **Yes** | cover.living_room_blind |
| <span class="entry-type-ha"></span> name | friendly name | No | Living Room Blind |
| <span class="entry-type-marao_dashboard"></span> card_color | var(--color-blue) | No | var(--color-blue) |

## More info

This card uses `custom:marao-card` in `position` mode. The cover entity should expose the `current_position` attribute for the percentage label and slider to work correctly.

Standard light, cover and access controls share a 174px minimum outer height,
with title and icon in the same header. Omitted sliders remain absent; essential
text and problems can increase the required height.

Use **Edit layout → fixed columns** for one continuous mixed control grid in
saved order. Eligible sections use equal rows throughout, an 8px gap and a
responsive column count up to the selected maximum. The final card keeps its
normal width. Keep full-width cameras, charts and detailed panels in separate
explicit sections. Automatic mode retains domain grouping, and raw/non-control
sections retain their existing layout. Manual/native cards share the minimum;
place eligible cards inside `custom:marao-control-grid` for whole-grid equality.

For ventilation dampers or shutters used as exhaust valves, see [Fan / exhaust valve](md_fan_card.md). This preserves the cover entity and its normalized opening direction; access covers must use Access controls.
