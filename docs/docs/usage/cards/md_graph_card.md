---
hide_table_of_contents: true
title: Graph Card
layout: page
parent: Cards
---

# Graph Card

`md_graph_card` shows a sensor's live numeric reading over Marao's own
24-hour background trace. Its muted purple color and low opacity keep labels and
icons prominent. The trace reads Home Assistant recorder history once
for the card, appends the current state, and needs no native history-graph card
or other frontend resource. If no numeric history is available, the current
reading remains visible and the background stays neutral.
Temporary Home Assistant shell moves retain the same card’s pending request and settled history, including failures. Results finishing after removal are discarded; source and connection changes still invalidate history.

Loading and empty history have readable status text. A failed history request
shows `History unavailable` while preserving the current reading. Unknown,
unavailable, and disconnected graph sources stay neutral; history loads again
after the source recovers.

![Graph Card Light](../../../assets/images/cards/md_graph_card/graphcard_light.png)

Reported media or history failures affect the whole card and keep a readable reason. Use the visible Retry or Refresh control to try again; event details also keep Back. Useful readings and actions with available targets remain usable. A failed actual control target shows a partial warning and disables that action. Problem surfaces take priority over artwork and custom colors.

## Usage

```yaml
  - type: custom:marao-card
    template: md_graph_card
    entity: <sensor entity>
    variables:
      graph_color: <desired color>
```

## Variables

| Variable | Default | Required | Description |
|----------|---------|----------|------------|
| graph_color | Muted purple chart palette | No | Color for the graph line and fill, with a readable contrast fallback. |
| graph_background | Transparent | No | Optional tint behind the graph, without replacing the card's state background. |
| show_graph_line | true | No | Show the graph line. |
| show_graph_fill | true | No | Show the graph fill. |
| show_icon | false | No | Show the card icon. |

## Numeric reading format

Set `variables.display_unit` to convert a compatible power/energy reading and
`variables.display_precision` to an integer from 0 to 6. Omit either key for Auto.
For example, a W sensor with `display_unit: kW` and `display_precision: 2` shows
1500 W as `1.50 kW` (punctuation follows Home Assistant). See the
[shared energy format contract](index.md#energy-reading-format) for unit choices,
raw history handling and incompatible metadata. Nonnumeric states keep their
normal presentation.

## Inspect history

Use **History** (**Histórico** in Portuguese) to open exact readings and timestamps
in a mobile sheet. Choose 1h, 6h or 24h without another Recorder request; tap along
the time axis or use Previous/Next reading. Minimum/maximum use full-resolution
samples. Measurement series also show a labeled sample average; counters do not.
Known unavailable intervals stay gaps and a single sample stays a point.

Details load bundled Chart.js only when opened. A graph inside a sheet uses the
same modal layer; Back restores its parent and scroll position. Existing card
actions remain independent. Climate readings intentionally omit units. Empty,
partial and failed history remain explicit, with Retry after a failure. These
windows use retained Recorder data; no long-term statistics, consumption totals
or pinch/zoom plugin are added. Saved graph options and generated configuration
retain their meaning.

## House power history

With **History popup** enabled on a power graph, opening the card or **History**
shows the detailed power chart directly. The time-unit dropdown and its options
use the dashboard theme, with a checkmark for the current unit. Choose **Day**, **Week** or **Month**
and use the arrows to move between calendar periods. The selector and period
stay visible while scrolling. Weeks start Monday, using Home Assistant's time
zone. Future periods are disabled.

After the selected chart loads and paints, the current day, week and month
load in the background, then the nearest four periods in each direction for
the selected unit, excluding the future. Changing unit reuses its warmed current
page and starts preloading that unit's neighbors. Current pages stay cached while
you navigate other units. Navigation reuses cached or pending history; accumulating
periods refresh on return when their snapshot is over a minute old.

The chart requests recorded state changes and preserves peaks when reducing
points for display. It shows actual available Recorder data, including gaps;
it cannot recover readings Home Assistant has already purged. Enable Recorder
for the house and device sensors and retain enough history for the periods you
want to inspect. Energy counters in kWh cannot provide instantaneous power.

Edit the House Power card and add **Power devices** in the builder or native
card editor. Pick each device's power sensor (W/kW), optionally rename it, and
reorder the list as needed. The device lines share the house chart. Tap a time
to see the reported state for each device at that moment; selected-device
readings are resolved from Recorder rather than guessed from reduced plot points.
Configured devices need not account for the complete house total.

```json
{
  "template": "md_graph_card",
  "entity_id": "sensor.house_power",
  "variables": {
    "history_popup": true,
    "power_devices": [
      {"entity_id": "sensor.kitchen_power", "name": "Kitchen"},
      {"entity_id": "sensor.heating_power", "name": "Heating"}
    ]
  }
}
```

Omit `power_devices` or save an empty list for only the house trace. Existing
unit and decimal-place settings apply to the chart and device readings.

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
