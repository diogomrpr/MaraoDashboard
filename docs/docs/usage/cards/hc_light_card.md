---
title: Light Card
layout: page
parent: Cards
---

# Light Card

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

Generated overview lighting popups list every configured light, including lights
that are off. Unknown and unavailable lights remain visible with disabled controls.
The `hc_light_card` is used to turn on and off a light. You have the option to show or hide the brightness slider.
The icon and title share one header row, including when brightness is hidden or
unsupported. Long names wrap beside the icon; useful labels and the brightness
control appear below.

![light Card Light](../../../assets/images/cards/hc_light_card/lightcard_light.png)

## Usage

```yaml
  - type: custom:marao-card
    template: hc_light_card
    entity: <your light entity>
    name: MyLight
    variables:
        enable_slider: true
```
**Remember to take care of indentation**
## Variable / entry

| Variable | Default | Required | Example|
|:----------|:---------|:----------|:------------|
| <span class="entry-type-ha"></span> entity | | **Yes** | light.livingroom |
| <span class="entry-type-ha"></span> name | friendly name | No | Livingroom Light |
| <span class="entry-type-marao_dashboard"></span> enable_slider | true | No | Show or hide the brightness slider|
| <span class="entry-type-marao_dashboard"></span> card_color | var(--color-blue) | No | The active card color |

## Brightness

The slider uses the entity's supported color modes to detect dimming support.
On/off-only lights have a toggle without a slider. Set `enable_slider: false` to
hide it on dimmable lights. `custom_label` adds a prefix to useful nonbinary state content or retains a substantive label on a binary card.

Standard light, cover and access controls share a 174px minimum outer height,
with title and icon in the same header. Omitted sliders remain absent; essential
text and problems can increase the required height.

Use **Edit layout → fixed columns** for one continuous mixed control grid in
saved order. Eligible sections use equal rows throughout, an 8px gap and a
responsive column count up to the selected maximum. The final card keeps its
normal width. Keep full-width cameras, charts and detailed panels in separate
explicit sections. Automatic mode retains domain grouping, and raw/non-control
sections retain their existing layout. Manual/native cards share the minimum;
place eligible cards inside `custom:marao-control-grid` for whole-grid equality.
