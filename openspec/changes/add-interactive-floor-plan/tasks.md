# Tasks

## 1. Source model and preserved compatibility

- [x] 1.1 Record the apply-time commit, dirty state, acceptance cases and shared consumers; capture `npm run test:affected -- --snapshot /private/tmp/floor-plan.json` before code changes. Verify the recorded scope preserves unrelated media/runtime/CSS work and identifies the exact new descriptor/image-ownership risks.
- [x] 1.2 Add the catalog entry, shared floor-plan model/geometry validation, entity-free role handling and JSON schema in the existing source pipeline. Verify targeted model/geometry assertions cover percentage transforms including letterboxing, light-only bindings, image-ID validation, invalid points/width/IDs, explicit empty lists and preservation of unknown fields; document the descriptor in the new card usage page.
- [x] 1.3 Connect the model to native validation/import, serialization and existing card/page copy behavior without rewriting existing source. Verify a targeted preservation assertion covers complete geometry and independent copies sharing one image, and reuse the existing frozen native-baseline compiler assertions to confirm old source/output stays unchanged. Update source-format/coverage guidance without modifying historical fixture provenance or introducing a migration.

## 2. Runtime plan and full-page composition

- [x] 2.1 Implement/register the self-contained floor-plan element with stable image/SVG/button DOM, shared theme/localization, image loading/error/retry and live on/off/neutral strip/button rendering. Verify narrow runtime assertions cover an externally updated light, color/brightness fallback, disabled unknown/unavailable/missing/disconnected targets and geometry retained across state updates.
- [x] 2.2 Connect toggle buttons and the overlapping-control Lights sheet to existing availability, haptics, exact-target dispatch, error and popup behavior. Extract only the small shared light behavior needed. Verify one activation calls the correct light once, editor/preview/background/path actions call nothing, errors remain readable and the sheet restores focus; retain a representative ordinary-light assertion for any extracted helper.
- [x] 2.3 Add explicit full-page validation/compiler composition and available-viewport/navbar sizing. Verify a narrow compiler assertion produces one top-level panel stack, preserves all navigation/popup structures, rejects conflicting visible/raw/custom content without mutation and returns to ordinary composition when disabled. Add the full-page restriction and aspect-ratio behavior to card/configuration documentation with the same group.

## 3. Visual upload and placement editor

- [x] 3.1 Add native PNG/JPEG upload/replacement to a specialized floor-plan editor, with local preview cleanup and attempt freshness guards. Verify focused editor assertions for upload rejection, late completion after cancel/replacement, prior-image retention and no deletion of shared media; document that uploads store files independently of dashboard Save and source exports contain image references only.
- [x] 3.2 Add light selection, tap placement, reversible marker dragging, rebinding/removal and strip tracing/point editing/thickness. Retain exact coordinate adjustments in JSON. Reuse shared numeric controls and translations. Verify targeted panel/geometry assertions for one accepted placement, cornered paths, cancelled drags/traces, replacement-image geometry preservation, zero entity dispatch and Visual/JSON/Save/Discard continuity; finish the same card's visual-editing guide.
- [x] 3.3 Add one synthetic room image and helper-light example under `ha-test/`, covering a realistic full-page room view plus a representative ordinary plan in the existing Cases view of `/marao-dashboard`. Have disposable preparation resolve uploaded image IDs into ignored local state rather than committed instance data. Verify the fixtures contain no real room imagery/entities, no second dashboard root and no test-only shipped assets; add the narrow floor-plan affected-check mapping.

## 4. Essential integration and handoff

- [x] 4.1 Review task hunks and select the smallest relevant scope using `test:affected -- --since /private/tmp/floor-plan.json --tier focused --component <reviewed floor-plan/editor/native-source IDs> --plan`. Focused scope is for the concrete new persisted descriptor and shared-image ownership paths, not every mapped suite. Run the selected model/panel/compiler/runtime assertions serially, rebuild editor/native assets through existing scripts and verify all agreed acceptance cases have evidence. No automatic full/browser/camera/migration campaign is required.
- [x] 4.2 Preserve the exact disposable dashboard baseline and install final applicable changes once on `192.168.0.28` using compatible frontend preparation, with fixture preparation only where the new safe examples require it. Verify current served assets/readiness, preserve unrelated configuration/helpers and leave successful assets installed. If blocked, report not installed / not ready for test.
- [x] 4.3 Compare implementation with the request and provide the test URL plus a short manual watch list: upload/replace, place/move a light, trace a cornered strip, observe real HA state/color/brightness, rotate the phone, use the dense Lights list and confirm Save/Discard. Agent browser inspection is optional; if an actual issue needs diagnosis, use one targeted existing preview visit with helper lights, retain diagnostics and finish cleanup. Report actual checks and omissions honestly.

## Workflow follow-up

- Keep planning tasks unchecked until implemented and verified. Do not treat OpenSpec validation as application acceptance.
- A later push/tag/release requires the unit-only `npm run verify:publish` gate across the release candidate and its final disposable installation; additional integration/full testing needs an explicit request.
- Archive only after implementation and required verification are complete. Rollback restores matching package and pre-feature source together and preserves HA-managed image files.

## 5. Preview-centered visual editing

- [x] 5.1 Keep placement and strip actions immediately beside the image preview. Move entity/name/icon/thickness configuration and light removal into a modal opened by a light square or the ordered light selector. Preserve settings on Cancel, restore focus and close obsolete child dialogs.
- [x] 5.2 Remove visual coordinate inputs for lights and strip points; retain dragging and exact JSON coordinates. Prevent a completed or cancelled drag from opening settings or dispatching a light action. Update usage guidance and the existing design/spec delta.
- [x] 5.3 Run the targeted editor interaction assertions, rebuild final assets and install once on disposable HA `192.168.0.28`. Leave visual review to the user with a short watch list.
