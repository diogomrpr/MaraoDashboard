---
title: Washing Machine Card
layout: page
parent: Cards
---

# Washing Machine Card

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

The `hc_washing_machine_card` is used to show a washing machine binary sensor state using its native on/off or explicit running/idle contract.

## Usage

```yaml
  - type: custom:marao-card
    template: hc_washing_machine_card
    entity: <your washing machine binary sensor>
    name: Washing Machine
```

**Remember to take care of indentation**

## Variable / entry

| Variable | Default | Required | Example |
|:----------|:---------|:----------|:------------|
| <span class="entry-type-ha"></span> entity | binary_sensor.maquina_roupa | **Yes** | binary_sensor.washing_machine |
| <span class="entry-type-ha"></span> name | Maquina Roupa | No | Washing Machine |

## More info

The state marker follows the reported running/idle state; unavailable and unknown states retain their visible reason.
