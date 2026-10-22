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

The mountain facets use Encosta mist blue `#A6C2CB`, slate `#506F79` and
Névoa `#F3F3EE`, matching the Serra do Marão landscape theme.
The dark variant exchanges the slate and pale facets to retain the silhouette on
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
custom image endpoints.

HACS update entities currently construct a direct public-CDN URL for the
integration icon (`https://brands.home-assistant.io/_/marao_dashboard/icon.png`),
bypassing Home Assistant's packaged-brand API. A missing public catalogue entry
therefore shows **icon not available** even when local integration branding works.
The supported modern integration setup is the packaged `brand/` directory,
which Marao already provides. HACS needs to consume Home Assistant's local brands
API for installed custom integrations. A maintainer confirmed in
[HACS issue 5402](https://github.com/hacs/integration/issues/5402)
on 2026-10-16 that this is fixed in the Marketplace integration planned for
Home Assistant 2026.11; this is an upstream statement, not a locally verified
upgrade result. Do not submit
new assets to the legacy custom-integration catalogue as the recommended fix,
patch HACS from Marao, or silently override HACS entity state. Changing the local
iconset or exporting the same packaged files again cannot repair that external
lookup. See the
[HACS image lookup](https://github.com/hacs/integration/blob/main/custom_components/hacs/update.py#L64-L72)
and [Home Assistant brand serving](https://contributors.home-assistant.io/core/integrations/brands/).

The custom icon identifier is `marao_dashboard:mountain`. It belongs only on
owned identity surfaces and absent-icon defaults. Preserve all explicitly saved
dashboard icons and functional navbar, room, device and action icons. A branding
update needs no saved-configuration migration or replacement gallery entities.

## Media app shortcut artwork

Bundled `frontend/media-apps/` artwork is served locally. YouTube, Disney+, Prime
Video and Plex use 512-pixel publisher PNGs retrieved through Apple’s public Lookup
API on 2026-10-21. Apple TV retains its existing PNG; MEO uses the official blue
and white MEO vector mark without the Go lettering. Netflix uses a flat
vector rendition of its N symbol; Spotify uses its official green vector icon.
The directory’s `SOURCES.md` records the artwork references. App names and logos belong to their
respective owners. They identify the configured app; they do not imply affiliation.
The dashboard serves these files locally and performs no runtime App Store lookup.

- [Netflix](https://apps.apple.com/pt/app/netflix/id363590051) — `com.netflix.Netflix`.
- [YouTube](https://apps.apple.com/pt/app/youtube/id544007664) — `com.google.ios.youtube`.
- [Disney+](https://apps.apple.com/pt/app/disney/id1446075923) — `com.disney.disneyplus`.
- [Amazon Prime Video](https://apps.apple.com/pt/app/amazon-prime-video/id545519333) — `com.amazon.aiv.AIVApp`.
- [Apple TV](https://apps.apple.com/pt/app/apple-tv/id1174078549) — `com.apple.tv`.
- [Spotify brand resources](https://developer.spotify.com/documentation/design) — `Spotify`, `com.spotify.client`, `com.spotify.Spotify`.
- [Plex: Find Movies and TV Shows](https://apps.apple.com/pt/app/plex-find-movies-and-tv-shows/id383457673) — `com.plexapp.plex`.

- [MEO Go](https://apps.apple.com/pt/app/meo-go/id394637480?platform=tv) — `pt.sapo.mobile.iphone.tmn.meomobile`, also recognized as `MEO` or `MEO Go`.
