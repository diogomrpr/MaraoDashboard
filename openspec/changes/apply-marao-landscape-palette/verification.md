# Verification

- Starting commit: `46f52846624f55e4678a479cf949b8252094151f`. Task snapshot: `/private/tmp/marao-landscape-theme-start.json`; reviewed task hunks exclude earlier cache-reset, dropdown and slow-camera retirement work.
- Shared consumers reviewed: theme surfaces and text, navbar/room primary pairings, light/fan/cover and climate state fills, slider boundaries, popup backgrounds, power/energy charts, vector branding and documentation.
- The selector plan maps all changed files, including native brand exports now routed to packaging. Its generic `labels` inspection hint is resolved by the reviewed room, light, climate, numeric and energy consumers; no browser campaign is implied by this scope aid.
- Four existing brand-suite checks passed, including a new shared-theme assertion for light/dark text, all state foreground families, neutral/warning/error messages, six chart lines and slider boundaries. The first run identified an insufficient slider boundary against pale blue; deepening it to `#415C65` resolved the failure.
- Two targeted chart checks passed: shared colors across power lines/legends/donuts and mode changes; existing custom series colors and power trace behavior remain supported.
- Built editor/chart assets. Existing local brand export script regenerated eight transparent PNGs and four documentation SVGs, retaining silhouette, wordmark transparency and no external artwork requests. Brand integrity checks passed after export.
- Strict OpenSpec validation and diff whitespace review passed.
- Phone/browser appearance, comprehensive integration/mobile tests, camera tests and release publication were not performed. The retired synthetic slow-camera validation was not run.

- Installed final package and brand metadata on disposable HA `192.168.0.28`, one restart. Current served-asset/readiness checks passed: frontend `e9635fd5f16765e2`, HA `2026.10.0`. Dashboard source bytes preserved; 195 safe helper states restored. Receipt: `/private/tmp/marao-landscape-theme-install.json`.
- Manual watch list: active room/nav and light/climate card text, slider track/fill/thumb distinction, power lines and energy donut colors in both theme modes. Reload the test page if it was already open.

## Cooler green revision

Starting commit remains `46f52846624f55e4678a479cf949b8252094151f`; snapshot `/private/tmp/marao-cooler-green-start.json`. Acceptance: replace the yellow/olive green with cooler forest green, keep white state-card labels readable, and align chart/success accents and documentation in both modes. Shared consumers: safe/switch/fan states, chart series 3, success feedback and documentation swatches.

Replaced olive with Pinhal `#3F745B`; dark chart/success accents use `#9BC9AE`. The existing light/dark contrast assertion passed. Installed through compatible frontend sync on disposable HA `192.168.0.28`; served-asset/readiness checks passed with frontend `b23dd4eac488b440` (receipt `/private/tmp/marao-cooler-green-installed.json`). No browser/phone inspection or unrelated tests performed.
