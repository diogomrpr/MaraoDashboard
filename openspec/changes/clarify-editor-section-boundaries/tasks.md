# Tasks

## 1. Clarify the shared section presentation

- [x] 1.1 Record the apply-time commit, dirty state and acceptance cases for expanded flat/sectioned pages, empty/populated lists and current section/page actions. If using scoped automated selection, capture `npm run test:affected -- --snapshot /private/tmp/section-boundaries.json` before editing and review the current editor component IDs; verify unrelated uncommitted work is preserved.
- [x] 1.2 Add scoped section outline, rounded surface, distinct header/divider and compact content padding in `frontend_src/panel.css`; subordinate only inner card borders. Preserve existing direct-child markup and controls unless a necessary styling change is identified. Verify by reviewing the actual selectors and renderer against the delta scenarios, current mobile wrapping, 48px targets, empty drop targets and text-selection rules. No new tests are needed for CSS-only changes; use one existing targeted panel assertion only if nontrivial markup logic changes.
- [x] 1.3 Keep Add card inside each bounded section and Add section as a page-level sibling; update `docs/docs/installation/configuration.md` with the hierarchy and action ownership. Verify the wording and final markup match existing targeting and do not restore removed help text or Discard. Existing safe example pages suffice; do not add gallery fixtures or change generated dashboard presentation.

## 2. Build, install and hand off

- [x] 2.1 Review the final task diff and run `npm run build:editor` plus diff checks, confirming generated assets and existing size budgets pass. If a selector plan is used, select the visual tier for the reviewed editor scope; do not interpret its mapping as a requirement to run behavior/browser/full suites for this presentation-only change.
- [x] 2.2 Install the final compatible frontend once through `prepareFrontend()` on disposable `192.168.0.28`. Verify served-asset/readiness checks, preserve test configuration/helper state and leave successful assets installed. A failed installation must be reported as not installed / not ready for test.
- [x] 2.3 Compare each acceptance scenario with the implementation and selected evidence. Provide the editor URL and reload instruction with a short manual watch list: clear sibling boundaries, header/card contrast in both themes, Add card inside versus Add section outside, and usable padding/tools on narrow screens. Agent browser inspection is optional; if needed, use one targeted existing preview visit. Report unchecked appearance honestly and stop after essential checks and installation.

## Workflow follow-up

- Before any future push, tag or release, run the required unit-only `npm run verify:publish`; additional integration/full tests require an explicit request.
- Archive only after implementation and selected verification are complete. Planning artifacts do not establish working UI behavior.

## Apply evidence — 2026-10-27

- Starting commit `ae962afc584d8bfb4939c857cce93f5f02ffbacc`; pre-existing dirty work captured in `/private/tmp/section-boundaries.json` and preserved.
- CSS-only implementation on the shared `.page-section` container: rounded outline, themed surface, header divider, subordinate card borders and 12px/8px responsive padding. Existing markup retains Add card inside and Add section outside. Shared flat/sectioned and empty/populated consumers use this same path; text selection, wrapping, 48px controls, current layouts and unclipped feedback are preserved by source review.
- Updated configuration guidance. Editor build, unchanged asset-size gates and diff checks passed; the visual selector plan has no unresolved scope. No automated behavior suites or browser appearance inspection were run for this CSS-only change.
- Installed through `prepareFrontend()` on disposable `192.168.0.28`; served-asset/readiness checks passed with identity `1d02960890c25bba7be11200b93ff05d35f3a854d8a3db73fb49b1f248b2f766`. Existing configuration and safe helpers retained.
- Manual handoff: reload `/marao-dashboard/marao-editor`; inspect section/header/card contrast in light and dark, Add card inside versus Add section outside, and narrow-screen tool wrapping/padding. No live-instance installation or publication performed.
