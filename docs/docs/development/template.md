---
title: Template design
layout: page
parent: Development
nav_order: 1
---

# Card design
Marao card variants are rendered by the namespaced `custom:marao-card`
component. The `hc_*` template name remains the stable configuration key, but
its layout and behavior live in the Marao frontend runtime.

## Building a project template
- Add or update the relevant variant in `custom_components/marao_dashboard/frontend/MaraoCards.js`.
- Keep configuration-facing names in the existing `hc_..._card` pattern.
- Add a focused generated YAML fixture when the variant needs new data or actions.
- Test the card in the local Home Assistant dashboard and with the frontend syntax check.
- When the template and its documentation are complete, run the static and
  frontend tests and open a [pull request](https://github.com/diogomrpr/MaraoDashboard/pulls).

## Configuration contract

Cards receive a normal Lovelace card configuration. The `template` value
selects an `hc_*` variant and `variables` carries optional behavior.

```yaml
type: custom:marao-card
template: hc_sensor_card
entity: sensor.temperature
variables:
  graph_entity: sensor.temperature

```
