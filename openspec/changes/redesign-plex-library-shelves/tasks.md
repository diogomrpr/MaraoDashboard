# Tasks

## 1. Library data for the three shelves

- [x] 1.1 Capture a fresh implementation baseline and preserve returned `children_media_class` in the existing Plex sanitizer. Extend the home helper to read and group actual movie/show library children, preserving order, exact identities, resume semantics and readable partial failures. Verify a small model assertion for custom/translatable library names, missing class metadata, multiple libraries, duplicate references versus duplicate names, unrelated media types, genuine emptiness and a failed read. Document the grouping and first-level read behavior in the media guide alongside this change.

## 2. Shared Open shelves presentation

- [x] 2.1 Replace compact/full library-home grids with Continue Watching, Movies and TV Series shelves in both native media presentations. Apply the selected open treatment, approximately 176-pixel tiles and 160-by-240 covers, wrapping titles, themed fallback and localized English/Portuguese headings/empty states. Verify the three loaded-home sections and preserved absent/false configuration using the existing component/composition assertions; review native inline sizing without introducing saved options. Update the media guide's layout description.
- [x] 2.2 Implement independent native horizontal rails, visibly 48-pixel previous/next controls with localized shelf-specific names, scroll-boundary disabled states and reduced-motion-aware button scrolling. Keep the existing bounded batches with a trailing in-rail Load more action and owned listener/observer cleanup. Verify with one focused existing component assertion that scrolling/arrow/load-more interactions neither dispatch HA services nor reset another row, and that unrelated HA updates retain attached DOM/offsets. Record the shared interaction contract in the quality guide.

## 3. Existing playback, navigation and examples

- [x] 3.1 Keep playable title taps on the existing Plex/Rivulet launch path and route series/seasons through the existing shared browser. Preserve the selected TV and complete mapping when opening from inline home, reuse the current modal owner inside media popups, and restore relevant shelf positions on Back. Retain a general Browse library route to root/recommendation folders without a fourth home shelf. Verify selected-TV context, folder navigation, one-modal ownership, no device dispatch from browsing and unchanged exact resume dispatch with narrow existing component/model assertions; update navigation usage in the media guide.
- [x] 3.2 Keep the existing fictional gallery/realistic-page examples accurate for grouping and shelves, adjusting only relevant returned fixture metadata if needed. Preserve the current disposable Media card's real TV/remote/Plex bindings and all unrelated dashboard content. Verify example configuration and independently expected mapping preservation; update the existing feature-coverage entry and retain test-only content under `ha-test/`.

## 4. Selected checks and disposable installation

- [x] 4.1 Review the actual task diff and affected selector plan, run the small model/component checks introduced or changed above serially, rebuild/check generated frontend assets through the existing tools, and validate this OpenSpec change. Compare each requested layout and behavior outcome with the selected evidence; record physical playback and routine visual/phone inspection as manual rather than adding a browser campaign.
- [x] 4.2 Install final applicable assets on disposable HA `192.168.0.28`, normally once through `prepareFrontend()`; use full fixture sync only if a necessary fixture-code change requires it. Verify served assets/readiness and preservation of current configuration/helper state. Leave the update installed and provide the Media-page URL plus a short manual watch list covering three-row scrolling, cover/title sizing, movie/show classification, series Back behavior and play/resume on the chosen TV. Do not issue agent playback commands or change Plex server settings/history.

## Workflow follow-up

- Implementation was authorized by the 2026-11-05 request to implement all open proposals and is complete with the evidence below.
- Implement on top of `add-plex-watch-card`; when synchronizing specs, preserve its detailed Plex/Rivulet contracts and apply this presentation delta afterward.
- Before a later push, tag or release, run the unit-only `npm run verify:publish` gate and applicable package metadata checks across the whole candidate. Extra integration/full testing requires an explicit request.
- Archive only after implementation and the selected verification/installation are complete. A complete artifact set is not evidence that the feature is implemented.

## Implementation evidence — 2026-11-05

- Starting commit: `7b500719b6318261bd33a2bda13ce6a5e09c6341`. The dirty-state baseline is `/private/tmp/all-open-proposals.json`; existing local work was retained, including the Plex foundation, inline media/cover behavior, navbar, editor, fixtures and untracked assets. No starting file was removed. The withdrawn adaptive-header proposal remains unapplied.
- Reviewed the task diff and affected selector plan for climate, Plex, labels and popup layout. The plan is a scope aid; unchanged starting work and broad mapped suites were not added to the check run.
- Passed 123 serial Node tests across climate runtime, Plex model/shelves, native composition/editor and managed-popup preservation; six selected Glance/Plex component cases; two targeted Python model/generator cases; five selected documentation cases. `build:editor`, `check:editor`, this change's strict OpenSpec validation and whitespace review passed.
- Final `npm run ha:sync` succeeded on disposable `192.168.0.28`. The native installer checked served asset hashes, registration, installed/local assets and exact saved-dashboard preservation. Current real TV/Plex mappings and helper configuration remain in place; no device playback was requested.
- Appearance, phone gestures and physical playback remain manual checks; no browser matrix, camera transport checks, full suite or publication was performed.

Acceptance reviewed: exactly three loaded-home shelves, real first-level library metadata grouping with direct-child fallback, exact ordered identities, partial failures distinct from emptiness, open 176px tiles/160×240 covers, independent native rails/arrows/batches, gesture-click suppression, reduced-motion scrolling, lifecycle cleanup and selected-TV browsing through one modal owner. Existing Plex/Rivulet dispatch and resume checks pass. Watch rail scrolling, series Back and actual play/resume on the selected TV.
