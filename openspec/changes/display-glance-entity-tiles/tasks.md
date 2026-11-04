# Tasks

## 1. Establish the implementation scope

- [x] 1.1 Capture the implementation starting commit/dirty state with `npm run test:affected -- --snapshot /private/tmp/glance-entity-tiles.json`, record the acceptance cases and review affected native/template/alias consumers; verify the snapshot exists and unrelated Activity/distribution/planning work is excluded from task edits.

## 2. Deliver the glance tile presentation

- [x] 2.1 Update the shared glance owner and glance-scoped styles in `MaraoCards.js` to show separate rounded surfaces under the optional title, with circular icon/value/name hierarchy and 8px gaps; verify through the scoped diff that one/two/three configured readings preserve order, title/icon hiding and omissions, and that no shared header/forecast/appliance selector is unintentionally changed.
- [x] 2.2 Implement the glance-local responsive capacity and common tile sizing: three across at 282px usable width with normal/bold 18px primary text, fewer columns for constrained hosts/enlarged text, wrapping content and 48px Activity controls; verify the width calculation and responsive rules by source review, using one small existing assertion only if nontrivial responsive logic is introduced. Preserve outer host sizing and configuration.
- [x] 2.3 Preserve per-reading values/status, existing aggregate problem treatment/diagnostics and explicit actions on the new visible surfaces, keeping Activity independent; verify with the smallest existing glance/Activity selection in `tests/frontend/marao-card-visibility.test.js` if markup or action composition changes, adding a regression assertion only for a concrete defect. Healthy values remain visible during partial loss and rendering dispatches no action.
- [x] 2.4 Update `docs/src/content/docs/cards/glance.mdx` and existing glance example descriptions that still describe rows; verify changed documentation/links match tile behavior and that the existing one/three/unavailable gallery and realistic-page examples remain accurate without adding a fixture matrix or new entities.

## 3. Install and hand off the final changes

- [x] 3.1 Review the actual task diff and select a minimal affected plan with `test:affected -- --since /private/tmp/glance-entity-tiles.json --tier visual --component <reviewed IDs> --plan`; resolve the component IDs from the affected map and disclose concurrent-hunk exclusions. Complete only essential selected checks, then compare every requested acceptance case with source/check evidence. Browser inspection is optional and any omitted visual checks are reported for manual review.
- [x] 3.2 Install the final compatible frontend once with `prepareFrontend()` from `ha-test/prepare-frontend.js` on disposable `192.168.0.28`; verify its compatibility/served-asset/readiness result, leave successful assets installed and hand off `/marao-dashboard` with the required reload and short manual watch list. A failed installation must be reported as not installed / not ready for test.

## Workflow follow-up

- After verified implementation, synchronize/archive `align-glance-card-styling` before this change so the earlier row requirements are replaced in the correct order; do not edit or archive either baseline during proposal creation.
- Before any separately requested push/tag/release, run the unit-only `npm run verify:publish` gate. Additional integration/full testing requires an explicit request.

## Implementation evidence

- Shared pre-edit baseline: `23c0d0e2c14eee774ac10a23ad50ae1449c31028`, snapshot `/private/tmp/marao-pending-1793824384352.json`. Existing Activity loading/layout hunks and duplicate distribution artifacts were preserved; reviewed file subsets separate the three proposals' checks.
- Passed: 36 serial navbar/settings tests, 5 Activity tests, 4 selected glance/Activity/problem tests, editor build/check, and changed documentation links. Scope plans were reviewed; their broader suggested suites were not run.
- Final frontend installed on disposable `192.168.0.28`; served-asset/readiness checks passed. No backend or shared-format migration was required.
- Manual handoff: phone tile layout/enlarged text, timeline menu/reset/custom dates, and browser/Companion sensor persistence across reloads and independent clients. No browser matrix or real Companion inspection was performed.

## 4. Follow-up: Optional reading labels

Baseline: `23c0d0e2c14eee774ac10a23ad50ae1449c31028`, snapshot `/private/tmp/marao-glance-labels-1793825412508.json`. Prior changes remain intact. Verified default/hidden/restored labels, accessible names, editor preservation, boolean validation and catalog parity with 5 targeted Node tests and 2 Python tests; editor build/check passed. The final candidate is installed on disposable `192.168.0.28` with served-asset/readiness checks. Manual label-spacing and real-device review remain with the user.

- [x] 4.1 Add the default-on `variables.show_reading_names` catalog/editor option, localized boolean validation and shared glance rendering with visually hidden semantic labels; verify default/false/true behavior, retained group title and Activity names, and preservation of authored names/options in focused existing runtime/editor/model assertions.
- [x] 4.2 Update glance documentation, capability/design and coverage guidance, rebuild generated assets and check editor/catalog parity; verify the actual diff against the follow-up snapshot and preserve all prior installed work.
- [x] 4.3 Install the final candidate on disposable `192.168.0.28`, confirm served assets/readiness and hand off the toggle/YAML setting with a short manual label-spacing watch list.
