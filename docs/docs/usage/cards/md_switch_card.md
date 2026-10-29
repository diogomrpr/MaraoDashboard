---
hide_table_of_contents: true
title: Switch Card
layout: page
parent: Cards
---

# Switch Card

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

With the `md_switch_card` you can control your switch. It gives the ability to also show the power consumption and a graph.

![Switch Card Light](../../../assets/images/cards/md_switch_card/switchcard_light.png)

## Usage

```yaml
  - type: custom:marao-card
    template: md_switch_card
    entity: <your switch entity>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| power_entity | / | No | The entity that shows the power consumption. |
| power_unit | Entity unit or W | No | Legacy label only; does not convert the reading. New formatting takes precedence. |
| show_graph | false | No | If true, a graph will be shown as background. NOTE: It will not show if there is no Power Entity given! |
| graph_color | Muted purple chart palette | No | Graph line and fill color, with a readable contrast fallback. |
| show_graph_line | true | No | If true, a line will be shown in the graph. |
| show_graph_fill | false | No | If true, the graph will be filled. |

## Secondary power format

```yaml
- type: custom:marao-card
  template: md_switch_card
  entity: switch.example
  variables:
    power_entity: sensor.example_power
    display_unit: kW
    display_precision: 0
```

A source reading of 1500 W displays as `2 kW`; the primary switch state and action
payload remain unchanged. Without the new keys, `power_unit: kW` would only label
that reading `1500 kW`. Enabling either new key uses the actual source unit instead
of that legacy label. See [energy reading format](index.md#energy-reading-format).

## Opening history

When the builder-supported graph is enabled, tap the card's icon with its small
chart indicator to open history. You can also hold the card for 600 ms when no
explicit hold action is configured. A short tap keeps its normal card action;
opening history never toggles the device or changes a setting. Plain graph cards
also keep their normal history-opening tap unless a custom tap action replaces it.

The extra full-width History row is omitted. Loading, errors and explicit retry
remain available in the existing history/problem UI. Hidden icons stay hidden,
and a custom hold (including `action: none`) replaces the default hold. If both
entry paths are deliberately overridden, restore one to regain default access.
