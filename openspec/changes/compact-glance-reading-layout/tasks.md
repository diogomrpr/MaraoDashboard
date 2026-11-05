# Tasks

## 1. Compact Glance presentation

- [x] 1.1 Record the implementation starting commit, acceptance cases and reviewed shared consumers; capture `npm run test:affected -- --snapshot /private/tmp/marao-compact-glance.json` before software edits and verify the task diff preserves unrelated dirty work.
- [x] 1.2 Update Glance-scoped styles in `MaraoCards.js` to name → circular icon → value/unit, using the Compact reference's scalable secondary labels, primary values, approximately 10px/8px padding, 6px internal gaps and existing 8px tile gaps. Review the resulting layout rules against the design, including wrapped-name alignment, intrinsic height, 48px icon targets, responsive columns and unchanged non-Glance consumers.
- [x] 1.3 Reconcile iconless and hidden-name grid rules together; verify by code review that all four name/icon combinations contain no empty rows, preserve semantic names and group-title independence, and retain Activity/action/availability guards. If markup or behavioral branches change, reuse the existing glance-focused visibility/Activity tests; do not add tests for CSS constants alone.
- [x] 1.4 Update the quality guide's Glance section, Glance card documentation and feature-coverage description. Review changed links and ensure the current docs describe the selected order, the existing `show_reading_names` default and compact scalable spacing without treating the preview toggle as a runtime control.
- [x] 1.5 Review existing gallery, realistic-page and documentation-playground Glance examples for accuracy; reuse long-name, three-reading, single-reading and mixed-availability examples, adding or adapting one safe names-hidden example only where needed. Verify that example data stays outside the shipped integration and all gallery navigation remains under `/marao-dashboard`.

## 2. Final installation and handoff

- [x] 2.1 Review the final task diff against the acceptance scenarios and use the visual-tier affected selector plan for reviewed files/component IDs if scoped coverage selection is needed. Code review and a short manual watch list suffice for presentation-only work; resolve any actual changed-behavior failures with the smallest existing targeted assertion, without starting a browser matrix or full suite.
- [x] 2.2 Batch-install the final applicable changes on disposable `192.168.0.28` using `prepareFrontend()` for a compatible frontend-only batch, or `npm run ha:sync` if changed fixtures/backend require full preparation. Verify successful current-asset/readiness checks and leave the final assets installed; report an installation blocker as not installed / not ready for test.
- [x] 2.3 Compare the installed implementation and selected evidence with the requested Compact order and hide-name behavior. Hand off the test URL and any reload instruction with a short watch list for long-name alignment, hidden names/icons and partial availability; distinguish review, any automated checks and checks left to the user. Do not mark implementation complete from planning status alone.

## Workflow follow-up

- Before any later push, tag or release, run the unit-only `npm run verify:publish` gate and applicable metadata checks; no integration/full campaign is implied.
- Synchronize/archive only after implementation is complete and verified. Apply this delta after the earlier Glance deltas so synchronization retains the newly selected order; preserve historical evidence unchanged.

## Implementation evidence — 2026-11-05

- Starting commit: `7b500719b6318261bd33a2bda13ce6a5e09c6341`. The dirty-state baseline is `/private/tmp/all-open-proposals.json`; existing local work was retained, including the Plex foundation, inline media/cover behavior, navbar, editor, fixtures and untracked assets. No starting file was removed. The withdrawn adaptive-header proposal remains unapplied.
- Reviewed the task diff and affected selector plan for climate, Plex, labels and popup layout. The plan is a scope aid; unchanged starting work and broad mapped suites were not added to the check run.
- Passed 123 serial Node tests across climate runtime, Plex model/shelves, native composition/editor and managed-popup preservation; six selected Glance/Plex component cases; two targeted Python model/generator cases; five selected documentation cases. `build:editor`, `check:editor`, this change's strict OpenSpec validation and whitespace review passed.
- Final `npm run ha:sync` succeeded on disposable `192.168.0.28`. The native installer checked served asset hashes, registration, installed/local assets and exact saved-dashboard preservation. Current real TV/Plex mappings and helper configuration remain in place; no device playback was requested.
- Appearance, phone gestures and physical playback remain manual checks; no browser matrix, camera transport checks, full suite or publication was performed.

Acceptance reviewed: shared scoped name/icon/value order, intrinsic aligned subgrid rows, scalable secondary names, primary wrapping values, 48px icons, all name/icon visibility combinations, independent group title and retained Activity/availability guards. Existing long-name/mixed examples and the names-hidden safe example are retained. Watch long-label alignment and hidden-name/icon spacing.
