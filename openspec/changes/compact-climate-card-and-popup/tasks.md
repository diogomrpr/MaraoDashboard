# Tasks

Scope and acceptance are defined in [proposal.md](proposal.md),
[design.md](design.md), and the two delta specs. Implementation was authorized by the 2026-11-05 request to implement all open proposals; completion below records implementation and installation evidence.

## 1. Settings and saved configuration

- [x] 1.1 Record the implementation starting commit, current dirty state and affected shared consumers; capture `npm run test:affected -- --snapshot /private/tmp/compact-climate-card.json` and review a scoped selector plan for the actual task diff. Verify the plan excludes unrelated existing work and does not expand into every mapped suite.
- [x] 1.2 Add `humidity_entity` and `enable_popup` to the climate catalog, native editor and shared JS/Python validation with the defaults in the design. Add English/Portuguese field/error labels and update the climate settings documentation. Verify focused native-editor/model and Python catalog/model assertions cover omitted defaults, explicit false, unresolved sensor selection, clearing only the selected field, invalid values and unrelated-field preservation.

## 2. Shared climate presentation and interaction

- [x] 2.1 Refactor the shared climate renderer into the compact readings-first composition and the shared rounded vertical selector; remove the unconditional four-row native preference while retaining authored sizes, normal full-width columns and section equal heights. Update the climate title/sizing quality-guide text. Verify code review and the relevant existing native sizing/selector assertions cover the changed contract, range targets and unchanged numeric/Wallbox consumers; retain the 150px reference with 8px vertical selector spacing as a manual watch item.
- [x] 2.2 Add the independent humidity reading and its render dependencies without extra polling. Extend the existing climate runtime tests to verify a valid reading in card/details, humidity-only updates, omitted humidity, neutral invalid/unavailable readings, selection clearing and usable primary controls. Update the climate reading documentation alongside this behavior.
- [x] 2.3 Replace climate mode dropdown presentation with 48px icon buttons, 28px MDI icons, selected non-color treatment and localized `Mode - {mode}` headings. Update climate behavior/quality documentation. Verify the targeted climate tests cover supported choices, immediate shared pending feedback, rejection, availability guards and one dispatch/haptic per activation; review one-row fitting and narrow wrapping without reducing targets.

## 3. Popup ownership and composition

- [x] 3.1 Apply the popup toggle consistently to native/JS composition, nested climate groups, Python generation and popup editor availability. Retain explicit actions, external links, saved views and the stored inline-mode option. Update popup-option documentation. Verify focused composition/generator assertions cover enabled/disabled/omitted flags and single-mode behavior; use a selected managed-popup round-trip assertion to prove off/on preserves authored source, slots and custom content without reseeding.
- [x] 3.2 Convey private climate-detail context through automatic and managed popup owners and render top readings, mode controls and the identical lower-right selector, with no new lower-left feature or placeholder. Verify focused popup/runtime assertions preserve modal lifecycle, independent duplicate-card ownership, authoritative readings and shared target behavior; preserve missing/ambiguous-source errors. Update only the necessary existing safe climate Cases, realistic example and playground examples for humidity and popup off/on, retaining all fixtures under `ha-test/`.

## 4. Final batch and handoff

- [x] 4.1 Regenerate the affected catalog/editor/frontend assets using the existing build commands and update the relevant feature-coverage entry. Run the reviewed minimal serial check selection after the final edits; inspect any legitimately changed independent historical expectations while leaving source/history fixtures immutable. Verify the resulting diff, generated asset consistency and selected checks, without adding full suites or a browser matrix.
- [x] 4.2 Compare the implementation against each requested outcome: compact card, larger current temperature, optional sensor, 8px selector margins, 48px modes with 28px icons, selected-mode heading, right-aligned identical popup selector, popup toggle and preserved custom data. Record actual evidence and any limits; code review and a user manual watch list suffice for routine visual acceptance unless a concrete observed defect needs one targeted inspection.
- [x] 4.3 Batch-install all applicable final changes on disposable HA `192.168.0.28`, using `npm run ha:sync` for backend/catalog/fixture changes and only using lightweight `prepareFrontend()` if the final batch is frontend-only and compatible. Verify current served assets/readiness, preserve safe helper state and leave the successful installation in place. Hand off `/marao-dashboard` with the short feature watch list; a failed installation remains not installed / not ready for test.

## Workflow follow-up

- Planning does not authorize implementation, baseline-spec syncing, archiving or publication.
- When implementation is requested, use the project frontend/integration/testing skills and the existing scoped checks. Do not run comprehensive or parallel tests without a separate explicit request.
- If publication is requested later, run the unit-only `npm run verify:publish` gate and required metadata checks before push/tag/release; install the final release candidate on the disposable instance before publishing. Existing development evidence is reused without adding integration/full runs.
- Sync/archive this change only when requested after implementation, selected verification and mandatory disposable installation are complete. Keep the future lower-left feature out of this first implementation.

## Implementation evidence — 2026-11-05

- Starting commit: `7b500719b6318261bd33a2bda13ce6a5e09c6341`. The dirty-state baseline is `/private/tmp/all-open-proposals.json`; existing local work was retained, including the Plex foundation, inline media/cover behavior, navbar, editor, fixtures and untracked assets. No starting file was removed. The withdrawn adaptive-header proposal remains unapplied.
- Reviewed the task diff and affected selector plan for climate, Plex, labels and popup layout. The plan is a scope aid; unchanged starting work and broad mapped suites were not added to the check run.
- Passed 123 serial Node tests across climate runtime, Plex model/shelves, native composition/editor and managed-popup preservation; six selected Glance/Plex component cases; two targeted Python model/generator cases; five selected documentation cases. `build:editor`, `check:editor`, this change's strict OpenSpec validation and whitespace review passed.
- Final `npm run ha:sync` succeeded on disposable `192.168.0.28`. The native installer checked served asset hashes, registration, installed/local assets and exact saved-dashboard preservation. Current real TV/Plex mappings and helper configuration remain in place; no device playback was requested.
- Appearance, phone gestures and physical playback remain manual checks; no browser matrix, camera transport checks, full suite or publication was performed.

Acceptance reviewed: intrinsic readings-first layout, shared right-hand target with 8px spacing, optional independent humidity (including invalid/cleared readings), icon-only supported modes and pending heading, popup enabled by omission, inline modes when disabled, preserved single-mode direct action, authored actions/views/options, and private automatic/managed detail context. Numeric and Wallbox owners retain their existing selector behavior. Watch compact spacing, mode wrapping, humidity updates and popup off/on on a phone.
