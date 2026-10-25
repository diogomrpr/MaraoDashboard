---
title: Climate Card
layout: page
parent: Cards
---

# Climate Card

The `md_climate_card` shows a large, unitless current temperature and a target
temperature stepper. Its background identifies the active HVAC mode; `off`,
`unknown`, and `unavailable` retain the neutral card background. When multiple
HVAC modes are available, the mode buttons use representative icons and labels.
Dual targets retain both values inside the rounded control and can wrap at the
range separator when enlarged text needs more space. Scalar targets keep their
existing numeric layout.

Mode and target changes appear immediately with “Updating…” while Home Assistant
confirms them. Repeated temperature steps build on the requested target, and
duplicate cards and mode popups show the same request. Current temperature and
equipment activity keep their reported values. A rejected request restores the
reported setting and shows its error; after 30 seconds without confirmation, the
card restores the reported setting and shows “Change not confirmed”.

![Climate Card Light](../../../assets/images/cards/md_climate_card/climatecard_light.png)

## Usage

```yaml
  - type: custom:marao-card
    template: md_climate_card
    entity: <climate entity>
```
## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| show_mode_buttons | true in generated mode sheets | Show mode buttons on this card. |
| mode_selector_hash | Empty | Open the configured mode popup from the card. |
| setpoint_label | Localized target temperature | Accessible name for the target stepper. |
| show_graph | false | Show a temperature history graph behind the card. |
| graph_entity | Empty | Sensor entity supplying the graph. |
| graph_color | Theme text/accent color | Graph line and fill color. |

## State colors

| HVAC mode | Theme color |
|------------|-------------|
| Heat / heating | `--color-red` |
| Cool / cooling | `--color-blue` |
| Heat/Cool | `--color-purple` |
| Auto | `--color-gold` |
| Dry / drying | `--color-yellow` |
| Fan only | `--color-green` |

## Contribution
- [ptC7H12](https://github.com/ptC7H12)

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
