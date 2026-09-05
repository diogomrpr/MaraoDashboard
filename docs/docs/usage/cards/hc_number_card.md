---
title: Number Card
layout: page
parent: Cards
---

# Number Card

The `hc_number_card` is the default card for writable `number` and `input_number` entities. It uses the same reusable up/value/down control as the climate card.

## Usage

```yaml
  - type: custom:marao-card
    template: hc_number_card
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
