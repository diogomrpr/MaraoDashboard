---
title: Number Card
layout: page
parent: Cards
---

# Number Card

The `md_number_card` is the default card for writable `number` and `input_number` entities. It uses the same reusable up/value/down control as the climate card.

## Usage

```yaml
  - type: custom:marao-card
    template: md_number_card
    entity: <your number or input_number entity>
    name: Charge Limit
```

**Remember to take care of indentation**

## Variable / entry

| Variable | Default | Required | Example |
|:----------|:---------|:----------|:------------|
| <span class="entry-type-ha"></span> entity | | **Yes** | input_number.charge_limit |
| <span class="entry-type-ha"></span> name | friendly name | No | Charge Limit |

## More info

The card reads the entity's `step`, `min`, `max`, and `unit_of_measurement` attributes. Each press changes the value by one configured step and never sends a value outside the entity limits.

Lights, covers, and fans keep their percentage sliders because those controls separately display the current progress and requested target.

The Wallbox `md_wallbox_current_card` variant presents a large current reading
(such as **12 A**) above its optional title, with the up/down buttons in a vertical
pill on the right. Configured current shortcuts remain below on neutral surfaces.
Only a shortcut matching the reported current value receives its blue, teal or
gold positional accent and selected outline. If none matches, all stay neutral.
Unavailable or disconnected shortcuts are neutral and disabled. It uses the same
entity limits, steps and service actions as the shared number control.
