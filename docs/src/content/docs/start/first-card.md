---
title: Your first card
description: Configure a card visually or copy a tested example into Home Assistant.
---

Start with one existing light so you can see how configuration, preview and saving fit together.

## Use Home Assistant's editor

1. Open your dashboard and select **Edit dashboard**.
2. Choose **Add card**, search for **Marao Light**, and select your light entity.
3. Set a display name if you want one. A card name changes only that card; it does not rename the entity.
4. Choose the relevant options, then select **Save**.
5. Use Home Assistant's layout controls to position and resize the card. Select **Done** when you finish editing.

The card uses capabilities reported by the entity. A dimmable light can expose brightness controls; an on/off light does not gain dimming merely because the slider option is enabled.

The editor's **Help** icon opens that card's reference, including Camera Events. Picker names follow your Home Assistant language after HA loads; reopen the picker after changing language.

New cards prefer available entities that are not already used, then HA's fallback choices. If neither list contains a match, choose an entity in the editable setup card. Marao does not search for another device or invent an app source. By entity recommendations are deliberately conservative: specialized cards such as appliance-status cards remain available through **By card**.

Selecting a person offers **Marao People** with that person alone. For example, the fictional playground person can be written as:

```yaml
type: custom:marao-people-card
entities:
  - person.alex
```

Replace the example ID with your own existing person. The card does not add other people automatically.

## Start from a playground

Open a card in the [card catalog](../../cards/), select a behavior example and edit its settings or YAML. The preview uses fictional devices. You can try controls without signing in or operating your home.

Choose **Copy YAML**, then in Home Assistant select **Add card → Manual** and paste it. Replace example entity IDs with your own before saving. For example:

```yaml
type: custom:marao-light-card
entity_id: light.living_room
name: Living room
variables:
  enable_slider: true
```

This is a single card. Paste it in a card editor, not over the complete dashboard configuration.

## Save and revisit

Home Assistant's **Save** confirms the card dialog; **Cancel** discards its draft. Layout and visibility belong to Home Assistant. Marao's visual fields preserve unrelated configuration when you change a field, so you can combine normal fields and YAML.

Light and Fan declare their stable slider/color defaults for hosts that support effective-default comparison. Older hosts, or hosts comparing nested options literally, may still warn after an option returns to its omitted default; normal Save and Cancel remain in control.

If a card reports an unavailable entity, check the ID and the entity's state in Home Assistant. A preview can demonstrate states, but cannot confirm that a particular device supports an action. See [troubleshooting](../../help/troubleshooting/).
