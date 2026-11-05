# Tasks

## 1. Optional configuration and existing Apple TV editor

- [x] 1.1 Capture the implementation baseline/snapshot and confirm the supported installed HA browse command, inactive-client browse behavior, resume-ID shape and artwork proxy boundary from the relevant HA version/source. Verify the resulting contract notes use no private server data or production connection.
- [x] 1.2 Add optional `apple_tv.plex` validation/schema and carry the option through `appleTVOptions` and native composition. Verify focused editor-model/native-source assertions for wrong domains/server references, missing/false values, unknown nested fields and independently expected legacy round trips; do not regenerate released historical inputs.
- [x] 1.3 Extend the existing Apple TV options form with localized Plex mapping/folder choices, one-profile setup help and external-popup incompatibility feedback. Add focused native-card-editor assertions for normal Save/Cancel, failed reads, unchanged unrelated options and independent duplicate cards; document setup and optional fields in the media-card guide.

## 2. One-profile Plex library and private artwork

- [x] 2.1 Add the HA browse adapter for the selected server, Continue Watching and returned library descendants, preserving exact content/resume IDs and distinguishing empty, absent and failed results. Verify fictional-response unit cases for an inactive registered client, ambiguous/missing hubs, duplicate titles and stale account/folder results; document supported browsing and recommendation limitations alongside this work.
- [x] 2.2 Route poster artwork through the supported HA Plex image proxy, keeping credentials/raw authenticated URLs out of DOM sources, configuration, exports and logs. Verify focused assertions reject arbitrary hosts and retain title/fallback/error presentation without repeated requests; record the artwork/privacy boundary in development guidance.
- [x] 2.3 Implement the owned mobile Plex browser with Continue Watching first, folder/back/refresh actions, returned Recently Added, lazy posters and bounded complete item access. Verify one small component assertion for navigation/loading/empty/error handling and retained list/scroll on unrelated updates; add English/Portuguese strings and usage guidance with the component.

## 3. Wake, open and request playback

- [x] 3.1 Reuse the existing service/error/haptic primitives for the 30-second guarded launch: optional wake/source/one scan, authoritative mapped-client readiness and one exact `play_media` request. Verify focused runtime assertions for one haptic, cold/warm launch order, duplicate-input blocking, preserved resume identity and HA-authoritative Now playing; document the launch/readiness behavior in the media guide.
- [x] 3.2 Add request ownership/cancellation, explicit retry and readable step/timeout failures. Verify no subsequent dispatch after TV/config/account/connection/preview/lifecycle changes or browser closure, and verify listener/timer cleanup; retain existing app-shortcut and authored-hold behavior in the same targeted runtime checks.

## 4. Parent association and shared media presentation

- [x] 4.1 Compose the Plex child into the existing automatic-popup and inline Apple TV content and derive eligible TV choices from current dashboard card configurations, including supported nested containers. Verify native-card/composition assertions for parent preselection, inherited names/targets, one-target fallback, duplicate mappings, removed/changed owners and no implicit writes; document that associations are edited on the Apple TV cards.
- [x] 4.2 Integrate the Marao dropdown and one shared modal owner with internal library navigation, focus restoration and existing navbar/inert behavior. Verify a focused component assertion that changing TV is read-only, nested modality is avoided and app/parent actions do not also fire; update the applicable quality/coverage notes and add one fictional safe Plex example to the existing Apple TV gallery/realistic view using disposable fixtures only.

## 5. Build, selected evidence and disposable installation

- [x] 5.1 Review the actual diff and selector plan, run only the relevant narrow unit checks serially, and build/check the editor/native assets and owned-file manifest with existing tools. Verify all requested acceptance cases have selected evidence, and report unsupported or unchecked physical behavior honestly without adding a browser campaign.
- [x] 5.2 Install the final compatible frontend once with `prepareFrontend()` on disposable HA `192.168.0.28`, preserving current configuration/helper state. Verify served assets/readiness and leave them installed; deliver the test URL and a short manual watch list for Continue Watching/profile correctness, parent TV selection, poster layout and physical Apple TV wake-to-play.

## Workflow follow-up

- Implementation starts only when the user asks to apply this change; this proposal does not implement or publish the feature.
- Before any later push, tag or release containing this feature, run the unit-only `npm run verify:publish` gate and applicable package metadata checks across the whole candidate. Reuse development evidence; extra integration/full checks require an explicit request.
- Sync/archive only after implementation and its selected verification are complete. Keep any known limitation or failure explicit.

## 6. Rivulet playback and independent Plex browsing

- [x] 6.1 Add optional playback-app/browse-source validation, schema and localized native Apple TV editor controls while preserving existing Plex and unknown fields. Verify focused configuration/editor round trips.
- [x] 6.2 Resolve a read-only browser entity for the selected Plex server independently from Rivulet playback, retain Continue Watching and private artwork, and explain missing session discovery without fake fallback. Verify server isolation and credential-free identifiers.
- [x] 6.3 Route validated movie/episode selections to the chosen Apple TV with one resumable Rivulet deep link, guarded wake, haptics, cancellation and errors. Verify cold/warm launches and absence of Plex scan/source/client-play commands.
- [x] 6.4 Update media documentation/examples, build and install final assets on disposable HA, configure a real-server example preserving existing dashboard/Plex settings, and report manual session/physical-playback prerequisites.
