---
title: Theme design
layout: page
parent: Development
nav_order: 0
---

# Theme Design
This code is part of a theming system where many of the styles are internal and should not be modified directly to avoid unintended consequences. However, a set of predefined variables has been provided to allow for 
customization within templates. These variables can be safely used to adjust the appearance while maintaining the integrity of the overall theme.

Its important to follow this guidelines, otherwise your template won't be accepted as an internal project template, but we are open for discussion or feedback.

## Colors

Every color mentioned in this document will be visible in this tabel.
The `Marao Dashboard` theme defines both Home Assistant `light` and `dark`
modes, so the same theme follows the frontend theme mode selected in the user
profile. Keep surfaces mode-aware and keep accents shared.

| Color value    | Variables   |
|:---------------|:---------------------|:-------------------------|
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-green"></span> `var(--primary-color)` | `#2F6B4F` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-green"></span> `var(--color-green)` | `#3F7E4B` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-red"></span> `var(--color-red)` | `#D8514B` | 
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-blue"></span> `var(--color-blue)` | `#5FA2D9` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-yellow"></span> `var(--color-yellow)` | `#F2A84A` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-purple"></span> `var(--color-purple)` | `#8A5A7B` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-orange"></span> `var(--color-orange)` | `#F2A84A` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-gold"></span> `var(--color-gold)` | `#FFD479` | 
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-gray-blue"></span> `var(--icon-color)` `var(--subtext-color)` | `#8794A8` | 
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-black"></span> `var(--primary-text-color)` | `#F5F7FA` | 

## Text

Text is a important part for your dashboard, that's why we defined a few aspects to make sure everything looks good on every view.

### Font
Marao Dashboard uses the font [Montserrat](https://fonts.google.com/specimen/Montserrat)

### Color
For all our texts use `var(--primary-text-color)`. The theme maps it to
`#17201B` in light mode and `#F5F7FA` in dark mode. You don't have to define
this in the template since it is defined in the theme file.

When using a subtext, you use the variable <span class="d-inline-block p-2 mr-1 v-align-middle bg-gray-blue"></span>`var(--subtext-color)`.

### Size and weight

| Font value    | Size   |
|:---------------|:---------------------|
| var(--font-size-primary) | `14px` |
| var(--font-size-secondary) | `12px` |
| var(--font-weight-primary) | `700` |
| var(--font-weight-primary) | `500` |
