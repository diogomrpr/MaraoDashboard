---
title: Toggle Graph Card
layout: page
parent: Cards
---

# Toggle Graph Card

`hc_toggle_graph_card` extends `hc_graph_card` with a related toggle. It keeps
the sensor's live numeric reading and project-owned 24-hour background trace,
while the card action, active treatment, and unavailable state come from
`toggle_entity` rather than the metric sensor.

## Usage

```yaml
  - type: custom:marao-card
    template: hc_toggle_graph_card
    entity: <your sensor entity>
    name: Heater
    variables:
      toggle_entity: <your switch entity>
      active_color: var(--color-orange)
```

**Remember to take care of indentation**

## Variable / entry

| Variable | Default | Required | Example |
|:----------|:---------|:----------|:------------|
| <span class="entry-type-ha"></span> entity | | **Yes** | sensor.heater_power |
| <span class="entry-type-ha"></span> name | friendly name | No | Heater |
| <span class="entry-type-marao_dashboard"></span> toggle_entity | | **Yes** | switch.heater |
| <span class="entry-type-marao_dashboard"></span> active_color | var(--primary-color) | No | var(--color-orange) |
| <span class="entry-type-marao_dashboard"></span> active_content_color | white | No | white |
| <span class="entry-type-marao_dashboard"></span> active_icon_background | var(--opacity-contrast-100) | No | var(--opacity-contrast-100) |
| <span class="entry-type-marao_dashboard"></span> inactive_background | var(--ha-card-background) | No | var(--ha-card-background) |
| <span class="entry-type-marao_dashboard"></span> inactive_name_color | var(--subtext-color) | No | var(--subtext-color) |
| <span class="entry-type-marao_dashboard"></span> inactive_state_color | var(--primary-text-color) | No | var(--primary-text-color) |
| <span class="entry-type-marao_dashboard"></span> inactive_icon_color | var(--icon-color-default) | No | var(--icon-color-default) |
| <span class="entry-type-marao_dashboard"></span> inactive_icon_background | var(--background-icon-color-default) | No | var(--background-icon-color-default) |
| <span class="entry-type-marao_dashboard"></span> show_graph_fill | true | No | true |
| <span class="entry-type-marao_dashboard"></span> show_graph_line | true | No | true |
| <span class="entry-type-marao_dashboard"></span> show_icon | true | No | true |
| <span class="entry-type-marao_dashboard"></span> graph_color | Theme card text/accent color | No | var(--color-orange) |
| <span class="entry-type-marao_dashboard"></span> graph_background | Transparent | No | rgba(255, 255, 255, 0.08) |

## More info

This card inherits the shared Marao graph behavior from `hc_graph_card`. It
requests recorder history once for the displayed sensor, appends its live
numeric state, and does not add a native history-graph card or another frontend
resource. If history is unavailable, the current reading and related toggle
remain usable while the background trace stays neutral.
