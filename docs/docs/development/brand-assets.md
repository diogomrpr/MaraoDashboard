---
title: Brand assets
layout: page
parent: Development
nav_order: 7
---

# Marao brand assets

The original mountain artwork lives in
`custom_components/marao_dashboard/frontend/brand/`. These editable SVGs are
shipped outside the editor's generated `assets/` directory:

| Source | Placement |
| --- | --- |
| `logo.svg`, `logo-dark.svg` | Full mountain logo with transparent Marao lettering |
| `mark.svg`, `mark-dark.svg` | Compact name-free mark for small branding surfaces |
| `mark-monochrome.svg` | Native sidebar glyph, inheriting the surrounding text color |

The palette uses Marao blue `#7BADE6`, navy `#284D7D` and pale `#EFF6FF`.
The dark variant exchanges the navy and pale facets to retain the silhouette on
dark surfaces. The wordmark contains Montserrat-based vector outlines in an SVG
mask; the background shows through the letters. Rendering requires no font or
external artwork request.

Use the full logo at a width of at least **200 CSS pixels**. Use the compact mark
at smaller sizes, including 16px favicons, 32px marks and native sidebar icons.
Preserve each source's aspect ratio and clear space. Select the light or dark
variant for its actual background. A decorative mark beside a product heading
has empty alternative text; a standalone logo has the name Marao Dashboard.
The current documentation theme has a light page background, so its page artwork
uses the light variant; browser-tab favicons and README pictures also support
their dark backgrounds.

From the repository root, reproduce the exports with the installed browser tools:

```sh
node tests/export-brand-assets.js
node --test tests/frontend/brand-assets.test.js tests/frontend/package-boundary.test.js
```

The command renders the canonical SVGs without network resources, checks
transparency and the wordmark cutout, and replaces the derived files. Native
integration images live in `custom_components/marao_dashboard/brand/`: `icon.png`
and `dark_icon.png` are 256×256; `logo.png` and `dark_logo.png` are 520×280. Their
`@2x.png` counterparts have twice each dimension. Documentation copies live at
`docs/assets/images/{logo,logo-dark,favicon,favicon-dark}.svg`. Do not edit the
derived copies independently.

Home Assistant's [native brand support](https://developers.home-assistant.io/docs/core/integration/brand_images/)
serves the packaged PNGs through its authenticated integration branding API.
The [supported filenames](https://developers.home-assistant.io/blog/2026/02/24/brands-proxy-api/)
include light, dark and high-resolution variants. Do not add credentials or
custom image endpoints. Older Home Assistant versions and external catalogues
may retain their own artwork.

The custom icon identifier is `marao_dashboard:mountain`. It belongs only on
owned identity surfaces and absent-icon defaults. Preserve all explicitly saved
dashboard icons and functional navbar, room, device and action icons. A branding
update needs no saved-configuration migration or replacement gallery entities.
