# Tasks

## 1. Section disclosure and numbering

- [x] 1.1 Record the starting commit, dirty state and shared consumers; review the captured `/private/tmp/collapse-editor-sections.json` baseline and confirm the requested independent disclosure and number-badge acceptance cases.
- [x] 1.2 Use native disclosure in the shared section renderer, remember collapsed retained draft sections and cancel drag on disclosure changes. Add number badges with localized accessible names and CSS chevrons. Extend existing panel regressions for independent state, page-body recreation, current numbering and exact source preservation; verify only targeted assertions, and review native control semantics without adding a browser framework.
- [x] 1.3 Document the header interaction and presentation-state lifetime in the configuration guide; verify the wording against the implementation. Build editor assets and review the scoped diff, retaining the existing size budget and unrelated work.

## 2. Installation and handoff

- [x] 2.1 Install final compatible assets on disposable `192.168.0.28` through `prepareFrontend()` and verify served-asset/readiness checks. Compare the result with each acceptance case, report actual coverage and provide the reload URL and a short manual watch list for touch/keyboard disclosure, independent section tools and badge appearance. No live changes or full/browser campaign; if installation fails, report not installed / not ready for test.

## Workflow follow-up

- Publication requires unit-only verify:publish. Archive only completed and verified work.

## Apply evidence — 2026-10-27

- Baseline commit `ae962afc584d8bfb4939c857cce93f5f02ffbacc`; dirty snapshot `/private/tmp/collapse-editor-sections.json`. Shared consumers are flat/sectioned editor pages in both native editor hosts; existing uncommitted work preserved.
- Native details/summary preserves independent presentation in a panel-local WeakSet. Headers show only the current number badge with a localized Section N name and CSS chevron. Section tools remain native buttons, and section disclosure uses the existing shared haptic path. No source format, backend, runtime-card or generation changes.
- Targeted panel regressions passed for disclosure independence, page-body recreation, current numbering, stale-toggle rejection and exact draft/dirty preservation. Existing interrupted-page regressions and shared haptic checks passed. A targeted drag regression passed for excluding collapsed sections even with retained geometry.
- Build and diff checks passed within the unchanged eager-asset budget; strict OpenSpec validation passed. No automated browser or real-device disclosure/appearance inspection is claimed.
- Final native assets installed on disposable `192.168.0.28` through `prepareFrontend()`; served-asset/readiness checks passed. Identity: `9452195574a1e4e15a6f5d079a0f9faebe442f1385158865645bddf8b663641a`.
- Manual handoff: reload `/marao-dashboard/marao-editor`; check tapping/keyboard disclosure, section-tool clicks without unintended toggles, independent collapsed sections and readable number badges on mobile. Live HA unchanged; no publication performed.
