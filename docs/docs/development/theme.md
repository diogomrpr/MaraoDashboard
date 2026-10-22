---
title: Theme design
layout: page
parent: Development
nav_order: 0
---

# Theme design

The **Marao Dashboard** theme is part of the card contract. Reuse its semantic
variables instead of hard-coding a color, font, radius, or surface in an
individual template. Update light and dark modes together and follow the
[dashboard quality contract]({{ '/docs/development/dashboard-quality.html' | relative_url }}).

## Typography

Marao uses [Montserrat](https://fonts.google.com/specimen/Montserrat), followed
by the existing Roboto and system-font fallbacks. Use
`var(--primary-font-family)` and the shared size/weight tokens:

| Token | Base value |
|:--|:--|
| `--font-size-primary` | `18px` |
| `--font-size-secondary` | `16px` |
| `--font-size-state` | `12px` |
| `--font-size-caption` | `14px` |
| `--font-weight-primary` | `700` |
| `--font-weight-secondary` | `500` |

These values are the normal baseline, not fixed card geometry. Cards must grow
and wrap under bold text, 200% text, 200% browser zoom, and bold plus 200% text.
Do not shrink or transform text to preserve a fixed layout. Essential text
wraps; secondary metadata may use an ellipsis.

Use `var(--primary-text-color)` for primary copy and
`var(--subtext-color)` for secondary copy. Climate temperature values
intentionally omit degree symbols and units.

## Semantic colors

The theme supplies mode-aware surfaces and text. Always prefer the semantic
token that expresses the role:

| Purpose | Token |
|:--|:--|
| Page surface | `--primary-background-color` |
| Card surface | `--ha-card-background` |
| Marao inactive card | `--marao-card-background` |
| Primary text | `--primary-text-color` |
| Secondary text | `--subtext-color` |
| Default icon | `--icon-color` |
| Active text/icon | `--active-text-color` |
| Primary accent | `--primary-color` |
| Foreground on the primary accent | `--text-primary-color` |
| Marao value slider track | `--marao-slider-track` |
| Value slider confirmed fill | `--marao-slider-fill` |
| Disabled value slider fill | `--marao-slider-disabled-fill` |
| Value slider thumb and boundary | `--marao-slider-thumb`, `--marao-slider-thumb-border` |
| Home Assistant slider track | `--slider-color` |
| Divider | `--divider-color` |
| Warning, error, success | `--warning-color`, `--error-color`, `--success-color` |

## Marão landscape palette

Marao takes its name from Serra do Marão in Portugal. The expanded palette draws
on 15 photographs across spring, summer, autumn and winter: heather and carqueja,
forest and rivers, autumn copper, snowy ridges and mist. See the
[seasonal study, swatches and source credits]({{ '/docs/development/seasonal-palette.html' | relative_url }}).
Raw photo samples are recorded separately from the UI colors, which are adjusted
for readable light/dark pairings. Photographs are not bundled into the dashboard.

| Role | Light | Dark |
|:--|:--|:--|
| Page — Névoa / deep Xisto | `#F3F3EE` | `#151D21` |
| Surface | `#FFFFFF` | `#1D292E` |
| Inactive card | `#E7ECEA` | `#27353B` |
| Primary text | `#263338` | `#F1F3EC` |
| Secondary text | `#58696E` | `#B4C1C3` |
| Primary — Encosta | `#506F79` | `#A6C2CB` |
| Foreground on primary | `#FFFFFF` | `#17282E` |

Most surfaces stay mineral and neutral. Slate blue identifies primary controls
and selected navigation. Supporting colors remain restrained and retain their
semantic state roles:

| Token | Value | Typical state |
|:--|:--|:--|
| `--color-green` — Pinhal | `#39755B` | safe, switch, climate fan |
| `--color-red` — Terra | `#A34F48` | heat, open access, alarm |
| `--color-blue` — Céu | `#ADCBD8` | light, fan, cover, cool |
| `--color-yellow` — Carqueja | `#D6B45C` | dry, low battery |
| `--color-orange` — Cobre | `#D69A63` | moving access, arming, vacuum returning |
| `--color-purple` — Urze | `#8E5B83` | heat/cool, media |
| `--color-gold` — Palha | `#E2CD91` | automatic climate |
| `--color-peach` — Pêssego | `#E2B5A5` | existing warm surface compatibility |

State colors belong in the shared Marao state mapping. Active primary/room
surfaces use the paired primary foreground; pale blue, ochre, copper, gold and peach
state surfaces use dark text; forest-green, red and heather surfaces use white text.
Inactive, loading, disabled, unknown and unavailable states remain distinct.
Never communicate a state by color alone.

### Charts and sliders

`--marao-chart-1` through `--marao-chart-10` supply the shared sequence below.
Power lines, legends and energy donuts resolve the same tokens. Explicit chart
colors remain supported; non-Marao themes retain the existing generated fallback.
After ten series the theme sequence repeats, so labels remain essential.

| Series | Family | Light | Dark |
|:--|:--|:--|:--|
| 1 | Encosta / slate | `#506F79` | `#A6C2CB` |
| 2 | Urze / heather | `#8E5B83` | `#CCA2C4` |
| 3 | Pinhal / forest | `#39755B` | `#91C9AA` |
| 4 | Carqueja / ochre | `#947023` | `#E2CD91` |
| 5 | Cobre / earth | `#A15F43` | `#DDA582` |
| 6 | Pedra / stone | `#79776D` | `#C1BCAF` |
| 7 | Ribeira / teal | `#317F7B` | `#80C6C0` |
| 8 | Inverno / blue | `#5476A4` | `#9FBCE8` |
| 9 | Rosa / rose | `#AD4E6C` | `#E49FB4` |
| 10 | Lilás / lilac | `#77659F` | `#B9ACE0` |

Chart colors are deeper in light mode and lighter in dark mode to retain 3:1
contrast against the page, popup and card surfaces. State backgrounds have their
own foreground pairing; a pale card fill is not automatically a suitable chart line.

Value sliders share a pale mineral track (`#B4C7C9`), Névoa confirmed fill
(`#F3F3EE`) and white thumb across both modes. Persistent slate boundaries
(`#415C65`) distinguish track, fill and the independently moving thumb, including
on pale active cards. Their geometry, transparent native range input and feedback
remain unchanged. Disabled fills stay neutral (`#D8DFDB`).

## Contrast and shape

- Verify theme changes independently in light and dark mode.
- Normal text should reach a 4.5:1 contrast ratio.
- Large text and meaningful control boundaries should reach 3:1.
- Slider tracks, fills, and thumbs must have contrasting persistent boundaries
  against adjacent surfaces, including when the surfaces use pale colors.
- A circular icon background must retain equal dimensions and
  `border-radius: 50%`.
- Use the shared `--ha-card-border-radius` and elevation variables.

Add a new token only when an existing semantic token cannot represent the role.
Document it here, define it for both theme modes, use it through the shared
runtime, and add the smallest focused visual regression check.
