---
hide_table_of_contents: true
title: Security Card
layout: page
parent: Cards
---

# Security Card

The `md_security_card` shows Home Assistant's alarm state and opens a Marao sheet
with the arming modes supported by your panel. New cards use Dropdown: committing
an option sends that action once, including Disarm and bypass, without a hold.
Opening, browsing, dismissal and selecting the current mode send nothing.

Choose Grid for two columns of arming modes and a full-width Disarm slide below.
Ordinary arming uses a tap; bypass retains a 1.2-second hold. Disarm requires a
complete horizontal slide and release. Partial, vertical or cancelled slides send
nothing. Required codes apply to both layouts.

Existing cards without a layout retain the horizontal row, with holds for Disarm
and bypass. Loading or saving an existing card does not change that choice.


![Security Card Light](../../../assets/images/cards/md_security_card/securitycard_light.png)

## Usage

```yaml
  - type: custom:marao-card
    template: md_security_card
    entity: <your_alarm_entity>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| alarm_layout | Existing row if omitted | No | `dropdown` or `grid`; new builder cards use `dropdown`. |
| popup_hash | Generated | No | Sheet identity; generated dashboards assign one per card. |
| icon_color | var(--color-blue) | No | Color of the icon |

Generated dashboards create the alarm sheet automatically. For manual YAML,
add a Marao popup at the same hash containing a `custom:marao-card` with template
`md_alarm_controls_card` and the alarm entity.

When Home Assistant requires a code, the sheet uses a masked numeric or text
field. The code remains only in memory and clears after an attempt, closing,
target replacement or disconnection. Do not put alarm codes in dashboard JSON
or YAML. Existing unknown options survive editing but are not PIN storage.
Service acknowledgement does not change the displayed alarm state. Rejections
show a readable error with submitted codes redacted; retry requires another
explicit interaction. Unavailable, unknown, missing and disconnected panels
disable controls.
