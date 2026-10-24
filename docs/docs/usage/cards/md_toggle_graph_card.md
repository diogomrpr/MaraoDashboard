---
title: Toggle Graph Card
layout: page
parent: Cards
---

# Toggle Graph Card

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

`md_toggle_graph_card` extends `md_graph_card` with a related toggle. It keeps
the sensor's live numeric reading and project-owned 24-hour background trace,
while the card action, active treatment, and unavailable state come from
`toggle_entity` rather than the metric sensor.

Reported media or history failures affect the whole card and keep a readable reason. Use the visible Retry or Refresh control to try again; event details also keep Back. Useful readings and actions with available targets remain usable. A failed actual control target shows a partial warning and disables that action. Problem surfaces take priority over artwork and custom colors.

## Usage

```yaml
  - type: custom:marao-card
    template: md_toggle_graph_card
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

This card inherits the shared Marao graph behavior from `md_graph_card`. It
requests recorder history once for the displayed sensor, appends its live
numeric state, and does not add a native history-graph card or another frontend
resource. If history is unavailable, the current reading and related toggle
remain usable while the background trace stays neutral.

Use the separate **History** (**Histórico**) control for
[exact readings and timestamps](md_graph_card.md#inspect-history). Opening or
navigating history does not activate the card's toggle.

## Numeric reading format

Set `variables.display_unit` to convert a compatible power/energy reading and
`variables.display_precision` to an integer from 0 to 6. Omit either key for Auto.
For example, a W sensor with `display_unit: kW` and `display_precision: 2` shows
1500 W as `1.50 kW` (punctuation follows Home Assistant). See the
[shared energy format contract](index.md#energy-reading-format) for unit choices,
raw history handling and incompatible metadata. Nonnumeric states keep their
normal presentation.
