---
title: Cover Card
layout: page
parent: Cards
---

# Cover Card

The `hc_cover_card` is used to control a cover, blind, or shutter. It shows the current position, opening and closing states, and a position slider.

## Usage

```yaml
  - type: custom:button-card
    template: hc_cover_card
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

This card uses `custom:my-slider-v2` in `position` mode. The cover entity should expose the `current_position` attribute for the percentage label and slider to work correctly.
