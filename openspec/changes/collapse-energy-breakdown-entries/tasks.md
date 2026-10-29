# Tasks

## 1. Record implementation scope

- [x] 1.1 Record the implementation starting commit and dirty state with `npm run test:affected -- --snapshot /private/tmp/collapse-energy-breakdown-entries.json`; identify the energy, power and threshold consumers of the shared renderer and map the spec scenarios to the reviewed diff and selected checks. Completion is a saved snapshot and an explicit scope record that excludes unrelated work.

## 2. Implement inline energy contributor groups

- [x] 2.1 Add independent native disclosure groups to the energy branch of `_renderEnergySubEntities` in `frontend_src/MaraoDashboardPanel.js`, retaining the existing three-field form. Existing entries start collapsed and headings use the specified name fallback and sensor metadata. Extend the existing `tests/frontend/editor-panel.test.js` harness to demonstrate initial collapse and independent inline expansion without another dialog.
- [x] 2.2 Keep expansion state local to the dialog and attached to each member through field replacement, moves and deletion; open added entries immediately and update headings without rebuilding the active form. Add targeted panel assertions for new entries, rename/rebind/reorder continuity, preserved form identity during field edits and reset on reopening. Verify disclosure emits no configuration-change callback or persisted state.
- [x] 2.3 Keep move up/down and delete in each header, independent of disclosure and with existing boundary guards. Extend the relevant panel assertions to verify each action affects its own member once, preserves surviving rows' values and expansion, and retains the existing private-draft, Cancel, Apply, unknown-field, order and explicit-empty-list behavior. Confirm collapsed rows remain subject to validation and the power/threshold modes retain their existing behavior.
- [x] 2.4 Adapt `frontend_src/panel.css` using existing panel patterns and theme tokens, and add any necessary English/Portuguese labels in `frontend_src/editor-labels.js`. Verify by code review that headings wrap, header actions retain visible 48-by-48 targets, native semantics remain intact and the layout can reflow at 320 CSS pixels; leave the short visual watch list for the user.
- [x] 2.5 Update energy contributor editing guidance in `docs/docs/installation/configuration.md` for collapsed groups, inline fields and new-entry behavior. Verify the documented flow matches the implementation and existing safe energy examples in `ha-test` can demonstrate it; adjust an affected example only if needed, without adding a fixture matrix.

## 3. Verify and install the completed frontend

- [x] 3.1 Review the actual implementation diff and use the snapshot with `test:affected --since ... --tier behavior --component <reviewed IDs> --plan` to select the smallest relevant existing editor-panel checks. Run those checks serially, regenerate shipped editor assets with the existing build workflow and verify no expansion data or unintended power/threshold changes enter the generated output. Resolve relevant failures before installation.
- [x] 3.2 Install the final frontend once on disposable Home Assistant `192.168.0.28` through `ha-test/prepare-frontend.js` and its `prepareFrontend()` helper, preserving the existing test configuration. Verify the helper's compatibility, served-asset and readiness results, compare the implementation and evidence with every spec scenario, and hand off the test URL plus a short manual watch list for expansion, adding, editing, reordering, deletion and narrow headers. Leave the final assets installed and report any unchecked visual behavior honestly.

## Workflow follow-up

- Keep implementation tasks unchecked until their stated result and verification are complete; proposal validation alone does not satisfy them.
- Before any later push, tag or release, run the unit-only `npm run verify:publish` gate across the whole publication candidate. Additional integration or full testing requires an explicit request.
