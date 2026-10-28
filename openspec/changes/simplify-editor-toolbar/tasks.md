# Tasks

## 1. Simplify shared editor actions

- [x] 1.1 Record the implementation starting commit, acceptance cases and shared consumers (Visual/JSON, loading/busy, localization and native-session Apply); capture the starting dirty state with `npm run test:affected -- --snapshot /private/tmp/simplify-editor-toolbar.json`. Verify unrelated work remains outside the reviewed task diff.
- [x] 1.2 Replace the Save label with an icon, expose the leftmost Open dashboard left-arrow icon and remove the Discard icon, and remove the extra-options markup/CSS/listeners. Preserve independent pointer-path tracking, strong haptics, existing handler dispatch and disabled/confirmation behavior; verify by reviewing the complete affected shell, focus and header paths.
- [x] 1.3 Move Import/Export into a JSON-only icon toolbar outside Monaco and synchronize visibility with accepted mode transitions. Make header updates change localized names without erasing icons, including native Apply labeling. Verify the existing panel harness covers refresh and accepted/rejected tab transitions with the smallest targeted behavioral assertions; reuse existing save/import/discard checks where unchanged.
- [x] 1.4 Apply existing theme tokens and visible 48px control geometry, keeping Save/Open together when the header reflows. Update `docs/docs/installation/configuration.md` to describe the icons and JSON-only transfer controls; verify documentation against the final action layout and review CSS for the 320px mobile target. No new gallery or test fixtures are needed for this editor-only change.

## 2. Build, install and hand off

- [x] 2.1 Review the actual task diff and use `test:affected -- --since /private/tmp/simplify-editor-toolbar.json --tier behavior --component <reviewed editor IDs> --plan` to confirm scope; run only the smallest applicable existing panel assertions for changed behavior, then `npm run build:editor`. Verify checks and generated assets succeed without expanding to browser/full suites.
- [x] 2.2 Install the final compatible frontend changes once using `prepareFrontend()` from `ha-test/prepare-frontend.js` on disposable `192.168.0.28`, preserving configuration/helper state. Verify served-asset/readiness checks; if installation fails, report not installed / not ready for test.
- [x] 2.3 Compare each delta scenario with the final implementation and selected evidence. Hand off the test URL, any reload instruction and a short manual watch list: filled Open/Save icons in that order, no Discard control, JSON-only transfer icons and mobile header fit. State exactly what was checked; optional browser inspection must remain one targeted visit if needed. Leave successful assets installed.

## Workflow follow-up

- A future push, tag or release requires `npm run verify:publish` with unit-only publication coverage. Additional integration/full tests require an explicit request.
- Archive only after implementation and selected verification are complete; planning artifact status does not establish working behavior.

## Apply evidence — 2026-10-27

- Starting commit: `ae962afc584d8bfb4939c857cce93f5f02ffbacc`; dirty baselines captured before edits. Applied with the other two requested editor changes; preserved the resource-loader repair and unrelated untracked duplicate files.
- Acceptance checked with the actual panel VM regressions (including interrupted work, retained exact drafts, icon updates/tab transitions and local section/flat duplication), targeted model/compiler duplication checks and existing page-duplication assertions. An icon-markup expectation was updated for decorative `aria-hidden` and rerun successfully. No browser or exact user-navigation reproduction is claimed.
- Editor build and diff checks passed. Popup traversal is shared with page duplication; eager panel remains within the unchanged 144 KiB budget. No source format, persistence or backend migration.
- Final combined native assets installed through `prepareFrontend()` on disposable `192.168.0.28`; served-asset/readiness and unchanged-source checks passed. Installed identity: `726d8dd1792ee3535afa18483b4bda51c39b6656dbf1ec16e4286aed490bf62b`.
- Manual handoff: reload `/marao-dashboard/marao-editor`; check reopened expanded sections retain drafts and settle loading, header icons/JSON-only transfers fit on mobile, and duplicated cards edit independently with separate popup targets. No publication or additional integration/full tests performed.

User amendment: Open uses a left arrow and appears first; all header icons use Save styling; Discard is removed. Targeted header tests and the editor build pass.
