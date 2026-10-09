---
hide_table_of_contents: true
title: Graph Card
layout: page
parent: Cards
---

# Graph Card

`hc_graph_card` shows a sensor's live numeric reading over Marao's own
24-hour background trace. The trace reads Home Assistant recorder history once
for the card, appends the current state, and needs no native history-graph card
or other frontend resource. If no numeric history is available, the current
reading remains visible and the background stays neutral.
Loading and empty history have readable status text. A failed history request
shows `History unavailable` while preserving the current reading. Unknown,
unavailable, and disconnected graph sources stay neutral; history loads again
after the source recovers.

![Graph Card Light](../../../assets/images/cards/hc_graph_card/graphcard_light.png)

## Usage

```yaml
  - type: custom:marao-card
    template: hc_graph_card
    entity: <sensor entity>
    variables:
      graph_color: <desired color>
```

## Variables

| Variable | Default | Required | Description |
|----------|---------|----------|------------|
| graph_color | Theme card text/accent color | No | Color for the graph line and fill. |
| graph_background | Transparent | No | Optional tint behind the graph, without replacing the card's state background. |
| show_graph_line | true | No | Show the graph line. |
| show_graph_fill | true | No | Show the graph fill. |
| show_icon | false | No | Show the card icon. |
