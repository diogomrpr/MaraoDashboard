# Tasks

## 1. Card contract and composition

- [x] 1.1 Record the implementation starting commit, dirty state, acceptance cases and shared consumers; capture `npm run test:affected -- --snapshot /private/tmp/marao-people-presence.json` before software edits. Verify the recorded scope excludes unrelated work and includes the existing header, collection editor and native composition consumers.
- [x] 1.2 Add the People catalog identity, empty stub and shared validation for explicit unique person membership, including generic runtime configuration. Extend native composition to preserve the ordered member list without creating a popup. Verify with narrow `native-cards.test.js` assertions covering empty/valid input, malformed/duplicate/wrong-domain input, missing live entities and unchanged existing card composition.
- [x] 1.3 Document the public People configuration and HA People prerequisites in `docs/docs/usage/cards/md_people_card.md`, link the usage index and update the feature coverage map. Verify the example matches the accepted descriptor, contains fictional references only and clearly distinguishes this feature from tracking setup.

## 2. Presence display

- [x] 2.1 Implement the informational people role in `MaraoCards.js`: ordered names, HA pictures or icon overrides/fallbacks, localized Home/Away/named-place readings and independent availability. Add a small state/visibility test covering location transitions, partial failure, initial loading, missing/unknown/unavailable/disconnected states and no implicit dispatch; confirm the existing header person reading still works if its shared formatter changes.
- [x] 2.2 Add wrapping mobile list styles, content-driven native sizing and English/Portuguese labels through existing tokens/localization. Verify by code review that long names/places remain visible at narrow widths and enlarged text, both themes have non-color state cues, image failure retains the reading and no unnecessary polling/listeners survive removal. Record a short manual watch list; browser automation is not required for this presentation work.

## 3. Native configuration

- [x] 3.1 Add the person selector and ordered member name/icon editing using existing collection controls; preserve missing members, complete configs and native save/cancel ownership. Extend `native-card-editor.test.js` with independent expected data for rename, reorder, deletion to `[]`, member unknown fields and native layout/visibility preservation; verify a representative scene collection remains unchanged if shared list code is touched.
- [x] 3.2 Update `docs/docs/usage/native-card-configuration.md` for People selection, order and local overrides. Rebuild generated native/editor assets with `npm run build:editor` after the final related source edits and verify the build succeeds without hand-editing generated files.

## 4. Disposable examples and completion

- [x] 4.1 Add only the fictional person fixtures needed to demonstrate Home, Away, a named place and unavailable state under `ha-test/`, plus a Home example and one mixed-state `card-test` case on `/marao-dashboard`. Verify fixture references resolve through the existing preparation path and do not replace the current header fixture or add test data to the shipped integration tree.
- [x] 4.2 Review the actual task diff and select the smallest affected checks using the recorded snapshot and reviewed component IDs with `test:affected --since ... --tier behavior --component ... --plan`; update a missing mapping if necessary. Run the selected new/affected unit assertions serially, using focused preservation assertions for the concrete member-data risk. Confirm current evidence covers the requested states and editor round trips; do not run the full suite or browser matrix.
- [x] 4.3 Install the final batched changes and fixtures on disposable HA `192.168.0.28` with `npm run ha:sync`, preserving existing test configuration/helper state and recovery data. Verify served assets and readiness, sync any later frontend correction with `prepareFrontend()`, and leave the successful installation in place. If installation fails, retain diagnostics and explicitly report not installed / not ready for test.
- [x] 4.4 Compare the installed implementation with every requested outcome and selected evidence; fix relevant gaps and finish temporary-helper cleanup. Report the actual checks, `http://192.168.0.28:8123/marao-dashboard`, any required reload, and a concise manual watch list for names/pictures, named places, unavailable rows and phone wrapping. Optional targeted inspection stops after the requested result works; no additional campaign is implied.

## Workflow follow-up

- This proposal authorizes planning only. Begin implementation after a new apply request; keep every implementation task unchecked until completed.
- Before any separately requested push, tag or release, run unit-only `npm run verify:publish` over the entire candidate and follow the required final-candidate disposable installation gate. Additional integration/full testing requires an explicit request.
- Archive only after the implementation and required installation are complete and verified; synchronize these additive deltas after the current native-editor change so historical builder retirement text does not reintroduce obsolete authoring behavior.
