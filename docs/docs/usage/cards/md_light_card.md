---
title: Light Card
layout: page
parent: Cards
---

# Light Card

Normal binary states use distinct card backgrounds and a filled or outlined state marker, with a localized accessible state. Redundant state words are omitted, including when `show_state: true`; readings, metadata and useful custom labels remain. `show_state: false` retains its normal-state behavior. Prefix-only labels are omitted when their binary state text is removed.

Generated overview lighting popups list every configured light, including lights
that are off. Unknown and unavailable lights remain visible with disabled controls.
The `md_light_card` is used to turn on and off a light. You have the option to show or hide the brightness slider.
The icon and title share one header row, including when brightness is hidden or
unsupported. Long names wrap beside the icon; useful labels and the brightness
control appear below.

![light Card Light](../../../assets/images/cards/md_light_card/lightcard_light.png)

## Usage

```yaml
  - type: custom:marao-card
    template: md_light_card
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
| <span class="entry-type-marao_dashboard"></span> use_light_color | false | No | Use the reported light color as the active background |
| <span class="entry-type-marao_dashboard"></span> card_color | var(--color-gold) | No | The active card color |

## Brightness

The slider uses the entity's supported color modes to detect dimming support.
On/off-only lights have a toggle without a slider. Set `enable_slider: false` to
hide it on dimmable lights. `custom_label` adds a prefix to useful nonbinary state content or retains a substantive label on a binary card.

## Color and white temperature

For lights that support color or white temperature, tap the existing light-icon
circle to open the controls. A small palette indicator marks this button without
making the card larger. You can also hold the card for 600 ms; scrolling cancels
the hold. A body tap still uses the configured tap action or toggles the light.
Explicit hold actions, including `action: none`, take precedence, and hidden
icons remain hidden.

The Marao popup offers a color wheel, a warm-to-cool slider within the light's
reported limits, and the shared brightness control where supported. Dragging
previews the selection; releasing sends one update. Selecting a color or white
temperature turns an off light on. Opening or cancelling sends nothing. Controls
disable if the light becomes unavailable or Home Assistant disconnects.

When opened from a group popup, **Back** restores the list's scroll position.
On/off-only and brightness-only lights keep their existing card behavior.

## Layout

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

Enable **Use light color as background** in an individual light card's generator
or native editor settings to follow its reported color, including white temperature.
Text and icons automatically contrast with that color. Off and unavailable lights
remain neutral; missing color data falls back to the configured card color.
This is off by default and does not change existing saved cards.
The white-temperature slider shows its warm-to-cool gradient and thumb without a
progress fill; brightness retains its current-value fill.
