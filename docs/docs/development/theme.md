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
| Slider track | `--slider-color` |
| Divider | `--divider-color` |
| Warning, error, success | `--warning-color`, `--error-color`, `--success-color` |

The domain palette is:

| Token | Value | Typical state |
|:--|:--|:--|
| `--color-green` | `#3F7E4B` | active/safe, fan |
| `--color-red` | `#D8514B` | heat, open access, alarm |
| `--color-blue` | `#5FA2D9` | cover, cool |
| `--color-yellow` | `#F2A84A` | dry, warning |
| `--color-purple` | `#8A5A7B` | heat/cool |
| `--color-gold` | `#FFD479` | automatic climate |

State colors belong in the shared Marao state mapping. Do not reproduce that
mapping in a generated card. Active cards pair their background with readable
text and icon treatment; inactive, loading, disabled, unknown, and unavailable
states remain distinct. Never communicate a state by color alone.

## Contrast and shape

- Verify theme changes independently in light and dark mode.
- Normal text should reach a 4.5:1 contrast ratio.
- Large text and meaningful control boundaries should reach 3:1.
- Slider tracks must contrast with their card background.
- A circular icon background must retain equal dimensions and
  `border-radius: 50%`.
- Use the shared `--ha-card-border-radius` and elevation variables.

Add a new token only when an existing semantic token cannot represent the role.
Document it here, define it for both theme modes, use it through the shared
runtime, and add the smallest focused visual regression check.
