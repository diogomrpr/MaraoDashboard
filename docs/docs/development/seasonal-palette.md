---
title: Seasonal palette research
layout: page
parent: Development
---

# Seasonal palette research

This refinement uses **15 downloaded and visually inspected Marão photographs**:
three spring references, four summer, four autumn and four winter. It keeps the
mineral base and cleaner forest green, makes yellow and orange distinct, and adds
river teal, winter blue, rose and lilac to the shared chart sequence.

![Twenty-four representative UI swatches]({{ '/assets/images/marao-seasonal-palette.svg' | relative_url }})

## Method and skills

We inspected public [Pascal image-analysis](https://github.com/pascalorg/skills/blob/main/image-analysis/SKILL.md),
[Pascal contrast-check](https://github.com/pascalorg/skills/blob/main/contrast-check/SKILL.md),
[Omarchy theme-maker](https://github.com/AIowa-LLC/awesome-omarchy-themes/blob/main/skills/omarchy-theme-maker/SKILL.md)
and [color-palette-mcp](https://github.com/aka-kika/color-palette-extractor-mcp/blob/main/.skills/color-palette-mcp/SKILL.md).
Their useful common workflow is extraction, visual curation, semantic assignment
and measured contrast. No third-party skill or extraction dependency was installed;
this study used existing Pillow tooling rather than executing downloaded scripts.

Each photo was proportionally reduced to at most 480 pixels and quantized to
12 colors with median cut. Separate hue-family median samples at up to 320 pixels
helped recover small accents that dominant-pixel extraction missed. These filters
identify colors, not plants or objects; clothing, roads and black borders are not
palette inspiration. The summer rock accent analysis excludes its letterbox.
Photos were reviewed by season rather than pooled into a single image-size-weighted
palette. This is a curated sample, not a statistical survey of the mountain.

The [raw swatches, hue-family samples and provenance]({{ '/assets/data/marao-seasonal-palette.json' | relative_url }})
are separate from the adjusted UI colors. For example:

| Observed sample | Raw color | UI interpretation |
|:--|:--|:--|
| Pink-red flowering slope, Amarante Magazine | `#9E506B` | Deeper Urze `#8E5B83`; rose series `#AD4E6C` |
| Póvoa summer foliage | `#5A7748` | Cooler Pinhal `#39755B`, preserving the requested clean green |
| Marão autumn leaves | `#90562B` | Lighter Cobre `#D69A63` for dark text on a state surface |
| Autumn woodland gold | `#CBA943` | Carqueja `#D6B45C`; deeper `#947023` for a light-mode chart line |
| Winter fog | `#BBBBC4` | Cool mineral neutrals and a separated lilac series |
| Summer ridge sky | `#799BD2` | Deeper blue `#5476A4`, with `#9FBCE8` for dark-mode charts |

Names are landscape associations, not claims that every hue comes from a single
species or an exact sampled pixel. River teal and lilac are deliberate extensions
of the observed cool families. The base slate, mist and schist remain stable so
extra colors do not turn every card into an accent. There is no automatic seasonal
switching. Status still uses text/icons as well as color.

## Reference set and confidence

Capture dates are distinguished from upload dates and event dates. The two spring
promotional/editorial images and the summer trail-gallery images do not expose
independently verified capture dates. Autumn photos share one photographer and
one day; winter photos share one trip. These are explicit limits of the sample.

| Season | Photo / source | Seasonal evidence | Credit |
|:--|:--|:--|:--|
| Spring | [Flowering Marão slope](https://amarantemagazine.sapo.pt/sociedade/o-marao-aqui-tao-perto/) | Published 23 May 2021; flowers captioned, capture date unknown | Amarante Magazine |
| Spring | [Marão from Alto de Espinho](https://commons.wikimedia.org/wiki/File:Serra_do_Marão_mês_de_Maio.jpg) | 18 May 2018; author caption | Sanjorgepinho |
| Spring | [Fervença / Marão promotional gallery](https://greentrekker.pt/agenda/primavera-no-bosque-de-fervenca/) | Spring activity gallery; individual capture date unconfirmed | GreenTrekker |
| Summer | [High rocky viewpoint](https://www.wikiloc.com/hiking-trails/serra-do-marao-mafomedes-fraga-da-ermida-senhora-da-serra-142821394) | Recorded August 2023; gallery date, individual capture unconfirmed | STrilhos |
| Summer | [Póvoa stream](https://www.wikiloc.com/hiking-trails/fonte-da-ribeira-com-partida-em-parque-de-merendas-da-povoa-220855883) | Recorded July 2025; gallery date, individual capture unconfirmed | Joana Pocahontas |
| Summer | [Ansiães rock slopes](https://www.flickr.com/photos/_ferman_/7687046452/) | 18 July 2012; explicit capture date | FerMan |
| Summer | [Teixeira valley](https://www.wikiloc.com/hiking-trails/serra-do-marao-mafomedes-fraga-da-ermida-senhora-da-serra-142821394) | Recorded August 2023; gallery date, individual capture unconfirmed | STrilhos |
| Autumn | [Gold and copper leaves](https://www.flickr.com/photos/vribeiro/54300471351/) | 27 November 2016; photographer date | Vítor Ribeiro |
| Autumn | [Pine and lichen](https://www.flickr.com/photos/vribeiro/54929381106/) | 27 November 2016; explicit capture date | Vítor Ribeiro |
| Autumn | [Pines and distant ridges](https://www.flickr.com/photos/vribeiro/54796248891/) | 27 November 2016; explicit capture date | Vítor Ribeiro |
| Autumn | [Deciduous woodland](https://www.flickr.com/photos/vribeiro/54654749170/) | 27 November 2016; explicit capture date | Vítor Ribeiro |
| Winter | [Fog and upland heath](https://rawtraveller.blogs.sapo.pt/a-descoberta-da-serra-do-marao-nao-825) | Last weekend February 2023 per photographer narrative | Raw Traveller |
| Winter | [Pines beside the mountain road](https://rawtraveller.blogs.sapo.pt/a-descoberta-da-serra-do-marao-nao-825) | Last weekend February 2023 per photographer narrative | Raw Traveller |
| Winter | [Snow-covered ridge](https://rawtraveller.blogs.sapo.pt/a-descoberta-da-serra-do-marao-nao-825) | Last weekend February 2023 per photographer narrative | Raw Traveller |
| Winter | [Forest shadows](https://rawtraveller.blogs.sapo.pt/a-descoberta-da-serra-do-marao-nao-825) | Last weekend February 2023 per photographer narrative | Raw Traveller |

Original image URLs and licensing notes are in the raw-data file. All photographs
were used as local research references, not bundled into the dashboard or this
site. The Commons May photo is CC BY-SA 4.0; the other photographs have no verified
redistribution permission in this study.

## Application

The [theme guide]({{ '/docs/development/theme.html' | relative_url }}) records the
final token mappings. Eight domain colors remain compatible with existing cards;
ten mode-aware chart families are shared by power lines, legends and energy
breakdowns. Explicit configured chart colors still override the defaults.

The existing contrast checks cover normal text at 4.5:1 and chart marks/slider
boundaries at 3:1 against their actual theme surfaces. Color distinguishability
also depends on the device and viewer; legends and labels remain necessary,
especially with many series. No new configuration, migration or saved-data
conversion is involved.
