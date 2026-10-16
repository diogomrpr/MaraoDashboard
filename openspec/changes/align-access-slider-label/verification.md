# Batch implementation evidence

- Starting commit: `e300e1db04ff047fd80b3f2148bdb15e929d9755`.
- Scope: All marao-slide-to-open instances: strict access cards, normalized opening/unlocking aliases, open-only and service-based openers, page/group/popup/native hosts. Regression consumers: safe close/lock taps and ordinary light/fan/cover sliders.
- Preserve the pre-existing completed `align-slider-card-headers` implementation and all other working-tree changes. A private pre-edit patch and editor baseline assets were retained.
- Compatibility: runtime/editor presentation only; preserve saved format/defaults/options, unknown/raw/protected content, generator ownership, history and management APIs.
- User instruction: implement the entire selected batch before running any tests. Early-check tasks are therefore verified after implementation, without dropping their assertions. Baseline editor timing will be captured after implementation but before deploying the new editor.

## Results

- Removed the narrow stacking override. Labels wrap beside a fixed, vertically centered thumb. Strict-access hosts use the available Home Assistant grid row when narrow configured cells cannot contain the control; saved column preferences remain unchanged.
- Positive glyph-line geometry, below/above-240px and narrow hosts, English/Portuguese, both themes and all nine selected mobile text/layout profiles passed. Injecting the former stacked layout fails. Native safe opener completion/cancellation and availability guards passed on iPhone and Android.
- Final manual review checked the reported Security opener with a wrapped enlarged Portuguese label and its disabled neutral track, clear of the navbar, in both themes.

- Final serial affected selection: `slider-headers,battery-groups,access-label,editor-rendering`, based on the recorded starting commit. All **54/54** selected checks passed; `tests/.artifacts/verification/run-x56rXx/report.json` records `passed: true` and `verified_cleanup: true`. Current check inputs and capture hashes were revalidated after the benchmark helper correction. The previous header work remains intact.
- Rebuilt editor assets obey the existing byte/import budgets and reproducibility check. Read-only deployment preview, focused Python generation/migration coverage, fixture checks and strict validation of this change passed. Deployment and all live work used only disposable `192.168.0.28`.
- Saved formats/defaults, API and generation ownership remain unchanged. No persisted-data migration was introduced. Exact saved source/helper restoration was verified after automated preparation, timing and final inspection.
- Selected Chromium mobile emulation covers 320px, iPhone/Android portrait/landscape, normal/bold/200% text/200% zoom/bold-plus-200% and both themes. No full suite, 26-profile matrix, historical live upgrades, physical-phone or Safari inspection was run. No push, release, spec sync or archive was performed.
