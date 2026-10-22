## Context
Starting commit: `46f52846624f55e4678a479cf949b8252094151f`. Snapshot: `/private/tmp/marao-landscape-theme-start.json`. Existing cache-reset, dropdown and retired-test changes remain intact and outside this task's checks.

The seasonal refinement starts from the same commit with its own dirty-state snapshot, `/private/tmp/marao-seasonal-palette-start.json`. Its affected consumers are the shared domain/state theme colors, the sunny-weather accent and power/history/energy chart series; mineral surfaces, primary controls, sliders, brand exports, configuration and geometry remain unchanged.

## Decisions
Retain Névoa `#F3F3EE`, Xisto `#263338` and Encosta `#506F79`. Dark mode keeps the approved `#151D21` page, `#1D292E` surface, `#27353B` inactive card and `#A6C2CB` primary. Refine the eight domain colors to Pinhal `#39755B`, Urze `#8E5B83`, Carqueja `#D6B45C`, autumn orange `#D69A63`, earth red `#A34F48`, sky blue `#ADCBD8`, summer gold `#E2CD91` and peach `#E2B5A5`. These are UI-adjusted colors, not claims of exact photographed samples. Preserve the cleaner forest-green direction requested after the initial olive treatment, and keep yellow and orange distinct. Existing semantic state colors retain safe/warning/error roles and readable foregrounds. Pale blue domain highlights retain their dark foreground; primary/room highlights use the theme's paired primary foreground.

Keep typography, layout, interactions, custom overrides and all persisted configuration unchanged. Expand six mode-aware chart-series tokens to ten because chart lines need different contrast pairings from state-card fills. Add river teal, winter blue, rose and lilac to the existing landscape families. Resolve these shared tokens for power lines, legends and energy donuts; preserve custom graph colors. Each theme's series colors must meet at least 3:1 against their chart surface; existing normal-text pairings must retain at least 4.5:1. Retain the existing HSL fallback outside a Marao theme.

Recolor existing vector facets only; export using the existing local script. Reference photos are design sources, not bundled backgrounds. Preserve the README attribution and mountain silhouette.

For the seasonal refinement, keep the existing brand facets and exports. Use the 15-photo extraction manifest at `docs/assets/data/marao-seasonal-palette.json` as research evidence, covering all four seasons. Record each source page, direct image, credit, season and date-confidence note. A publication or hiking-event date does not establish an image's capture date; preserve explicit uncertainty and conflicting metadata. Keep sampled swatches and their area shares separate from UI-adjusted colors in the evidence report linked from theme documentation. Balance the seasonal references and inspect distinctive foliage, heather, water, snow and rock colors instead of allowing the most common sky or earth pixels to dictate every accent. Existing local image-analysis tooling is sufficient; no runtime dependency or third-party palette service is required.

## Risks / Trade-offs
- Dominant photographic colors can underrepresent small flowers or overrepresent sky and brown ground. Use extraction as evidence, then curate named color families and preserve the requested green direction.
- More chart colors do not remove the need for labels or visible state cues. Keep existing labels, legends and semantic distinctions, and check each color against its actual mode-specific surface.
- Some seasonal references have only contextual dates. State the confidence honestly; do not present all 15 as capture-date-verified.

## Verification
Use narrow existing unit checks for theme contrast, chart palette consumption and brand-export integrity. For the seasonal refinement, select only the changed theme/chart checks; unchanged brand exports do not need regeneration. Build editor/chart assets and install with compatible frontend preparation on disposable HA `192.168.0.28`. No full/mobile/camera campaign; hand off phone appearance. No persisted data or configuration migration is required.
