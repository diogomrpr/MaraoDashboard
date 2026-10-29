# Tasks

## 1. Apply selected-only shortcut styling

- [x] 1.1 Record the implementation starting commit, dirty state and affected Wallbox shortcut consumers before editing. Verify the scope record covers `number` and `input_number` bindings and preserves unrelated work, including the separate energy-editor proposal. If scoped automated checks are selected, capture the starting `test:affected` snapshot and review the visual-tier plan.
- [x] 1.2 Adjust shortcut styles in `custom_components/marao_dashboard/frontend/MaraoCards.js` so neutral is the default and enabled selected shortcuts alone receive their existing positional accent and outline. Verify by reviewing all shortcut style rules against the spec scenarios, confirming readable themed foregrounds, unchanged touch geometry, disabled precedence and no changes to exhaust controls, numeric matching or service handlers. Reuse the existing Wallbox test as the regression reference; no new CSS-mirroring tests or browser matrix are needed for this styling-only edit.
- [x] 1.3 Update `docs/docs/usage/cards/md_number_card.md` and the Wallbox color wording in `docs/docs/development/dashboard-quality.md` to describe neutral unselected choices and the selected reported-value accent. Verify the documentation matches the final styles, links remain valid and existing safe Wallbox examples in `ha-test` still demonstrate the three-shortcut layout without configuration changes.

## 2. Install and hand off

- [x] 2.1 Review the final implementation against the acceptance scenarios, then install the applicable final frontend once on disposable Home Assistant `192.168.0.28` using `prepareFrontend()` from `ha-test/prepare-frontend.js`. Verify its compatibility, served-asset and readiness checks, leave the changes installed and provide the test URL with a short user watch list for selected, unselected and nonmatching values in the usual themes. Report actual checks and any uninspected visual behavior; no editor rebuild, full sync or browser campaign is required for a compatible runtime-only change.

## Workflow follow-up

- Before a later push, tag or release, run the unit-only `npm run verify:publish` gate for the whole publication candidate. Additional integration/full testing requires an explicit request.
