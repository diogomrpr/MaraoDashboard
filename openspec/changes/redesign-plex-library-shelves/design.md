# Design

## Context

See [proposal.md](proposal.md) for the requested outcome and [the spec delta](specs/card-behaviors/spec.md) for acceptance. On 2026-11-05 the user selected **Open shelves**, then explicitly requested a proposal with implementation deferred. No runtime or dashboard changes belong to this planning step.

The starting commit is `7b500719b6318261bd33a2bda13ce6a5e09c6341`; the working tree already includes the Plex/Rivulet feature and unrelated work. The interrupted implementation turn performed inspection and saved `/private/tmp/marao-open-shelves-start.json` only. Future implementation must capture a fresh baseline and preserve the current work.

`MaraoPlex.js` owns the internal child card, target dropdown, browsing cache, poster creation, shared popup and launch presentation. Its current `_section()` is a grid with 88-pixel tiles and 24-item batches. `_draw()` distinguishes a Continue Watching-only compact home from full recommendation/library-folder content. Unrelated HA updates already preserve the current content DOM.

`MaraoPlexModel.js` sanitizes returned nodes and owns `plexHome()`, content identity and guarded Plex/Rivulet launches. The current home returns Continue Watching, Recently Added and library descriptors; it does not load movie/show shelf contents. Sanitization discards `children_media_class`, which Home Assistant's Plex library descriptors can supply. Preserve the existing HA entity-scoped browsing and authenticated artwork boundary.

The native composition in `frontend_src/card-composition.js` embeds this child in both inline and automatic-popup media content. `native-cards.js` lazy-loads its runtime and uses automatic inline sizing. `frontend_src/plex-editor.js`, `editor-model.js` and `MaraoSource.js` already own saved settings; this presentation needs no new option or editor control. The historical Python generator is not a new execution path.

The disposable Media page now has a real Apple TV and Plex browsing entity configured. Preserve those user-authorized bindings. Actual device playback remains the user's manual check; this change authorizes no Plex configuration/history writes or agent playback.

## Goals / Non-Goals

**Goals:** Implement the chosen presentation once in the shared child, derive real movie/show shelves, keep every title reachable, and preserve selected-TV ownership and current playback semantics.

**Non-Goals:** A layout/style chooser, poster-size setting, new backend or dependency, generalized carousel framework, alternate preview designs, speculative metadata/progress, or changes to persistent configuration. The fictional preview titles and artwork are design aids only.

## Decisions

### 1. One home presentation with exactly three content shelves

Use Continue Watching, Movies and TV Series in that order wherever the library home is shown. Replace both prior compact/full home branches with the shared shelf composition. Common TV selection, Refresh, Browse library, loading/error feedback and Back remain controls rather than additional shelves. Keep the general Browse library entry as a route into the existing root-folder browser; recommendations such as Recently Added remain reachable there without a fourth home shelf.

Use the existing typography, theme surfaces, rounded cover treatment and neutral fallback. Target 176-pixel title tiles, including the existing 8-pixel padding on each side, with 160-by-240 artwork. Use about 12 pixels between tiles, title text below the artwork, and a visible play or browse cue. Do not copy the preview's fictional cover art or invent watch-progress bars. Text enlargement can increase caption/row height without stretching the poster or shrinking essential text.

**Alternative:** Styling the existing grid alone would leave Movies and TV Series behind folder tiles, so it would not deliver the selected design. The other preview variants were rejected by the user's selection.

### 2. Group library contents by returned media types

Preserve the non-sensitive `children_media_class` descriptor through `cleanPlexNode()`. Extend the home data helper to read the selected server's movie/show libraries through the existing read/cache function. Use declared movie/TV-show content classes when present; for a library with missing classification, inspect its direct returned children for movie/show types. Do not guess from translated/custom library titles. Skip known audio/photo libraries, playlists and recommendation folders as shelf sources.

Concatenate matching libraries in their returned order, retaining each library's item order. Deduplicate only identical server/content-type/content-ID references, including their existing resume meaning; different titles/editions with the same name remain distinct. Keep show nodes expandable, and preserve existing Continue Watching hub discovery or the explicitly configured hub.

A failed library read must remain a readable partial failure, with other successful shelves usable. Do not report a failed read as a successful empty library. Keep missing recommendations distinct from an empty Continue Watching folder. All reads retain the existing account/connection/config cancellation checks; no automatic retries, polling or reads that actuate a device.

Read first-level library contents only. HA may return a complete library in one response; retain its API rather than inventing server-side pagination. Existing owner-scoped in-memory reuse and bounded DOM batches are sufficient. Do not eagerly fetch all series/seasons or per-title metadata.

**Alternative:** Recently Added hubs are cheaper to browse but are incomplete libraries and do not meet the Movies/TV Series requirement. Title-based searches and a second Plex connection would change identity/privacy behavior unnecessarily.

### 3. Use native horizontal rails with explicit controls

Replace `_section()`'s grid with a single flex rail, contained horizontal overflow, fixed poster/tile width and native touch scrolling. Use gentle proximity snapping, not mandatory page snapping. Keep vertical gestures native and avoid pointer capture or gesture recognizers. A touch scroll must never become a completed play activation.

Each shelf heading has visibly 48-by-48 previous/next icon buttons with localized shelf-specific semantic names. Move by one tile plus its gap; derive disabled boundaries from current scroll extent. Scrolling and arrow actions are local presentation interactions, with shared press/haptic feedback for completed button presses and no HA services. Respect reduced-motion preferences for programmatic scrolling.

Reuse the existing 24-item rendering batches. Place the explicit Load more affordance at the end of its rail rather than below it as another content row; appending preserves the current horizontal offset. Do not add automatic library requests on scroll. Own any resize/scroll observers through the card/section lifecycle and release them on redraw/removal. Unrelated HA updates continue to update status without rebuilding rows or moving scroll positions.

**Alternative:** Rendering every title immediately would discard the current bounded rendering contract. A slider/carousel dependency or custom swipe engine is unnecessary for ordinary browser scrolling.

### 4. Keep folder browsing inside the existing modal owner

Movie and Continue Watching episode/movie taps continue to call the existing launch owner. No new service path is introduced, and scroll arrows or Browse library never start a wake/open/scan sequence.

From inline home, a TV-series tile opens the existing library sheet at that series with the currently selected TV and its complete Plex mapping. The inline home remains in place, retaining all rail offsets. From an automatic media popup, navigate to seasons/episodes inside that same sheet, with Back to the three-shelf home and restored offsets. Keep selected TV context when creating the child browser; do not revert to the original parent after a user has selected another configured TV.

Generic Browse library uses the same folder navigation and supports the returned root/recommendation folders. Folder details can reuse the same rail treatment, but are not required to fabricate three category rows. Preserve focus restoration, background inertness, navbar clearance, errors, preview cancellation and the existing one-modal limit.

**Alternative:** Directly replacing the inline home with a series would hide the other shelves and complicate return navigation. A second popup inside the media sheet would violate the existing modal contract.

### 5. Keep saved configuration and shared consumers unchanged

No new card setting, public type, API, package version or migration is required. Leave missing/false `apple_tv.plex`, unknown fields, explicit emptiness, configured app order, custom actions and authored external popup ownership untouched. Review both native compositions and their sizing; change only a relevant shared sizing assumption if the three-shelf content needs it. Do not rewrite released historical fixtures or saved dashboards for a visual default change.

Use English/Portuguese labels in `MaraoPlexModel.js` for shelf names, empty results and arrow semantics. Update `docs/src/content/docs/cards/media.mdx`, the media section of the quality guide and the existing feature-coverage entry. Reuse `ha-test/custom_components/marao_test_media/plex_library.py` and the existing gallery examples; adjust only relevant fictional metadata if necessary. Keep fixtures out of shipped assets.

## Risks / Trade-offs

- **Large libraries increase first-level read cost:** Read through HA once per owner context, skip known unrelated types, retain bounded rendering/lazy artwork, and load nested folders only on demand. No benchmark campaign is required.
- **Partial or missing media metadata:** Use declared classes and direct-child types; retain readable errors and genuine empty results instead of name-based guesses or fabricated data.
- **Horizontal rails inside a vertically scrolling sheet:** Use browser-native scrolling and local 48-pixel arrow controls; preserve the sheet's current scroll/focus ownership.
- **State updates or folder navigation reset position:** Keep the existing no-redraw-on-unrelated-state behavior and retain/restore relevant rail offsets on returning from detail browsing.
- **Unarchived prerequisite specifications:** Implement after `add-plex-watch-card`; when syncing specs, apply its detailed library/playback contracts first, then this presentation delta. This change does not mark pending physical playback checks as passed.

## Migration Plan

There is no saved-data conversion. During later implementation, run the smallest model/component assertions needed for grouping, scroll behavior and retained target context; rebuild through the existing tools. Install the final compatible frontend once with `prepareFrontend()` on disposable `192.168.0.28`, preserving its current dashboard/helper state. Use full fixture sync only if a necessary fixture code change requires it. Installation asset/readiness checks suffice for deployment confirmation.

Hand off a short manual watch list: the three rails, cover sizing and title wrapping, movie/series grouping, series Back behavior, and normal play/resume on the chosen TV. Routine phone/real-device testing belongs to the user; no new browser campaign or physical actuation is required for implementation. A later push/tag/release remains subject to the repository's unit-only publication gates.

Rollback is the previous compatible frontend package; there is no paired data migration. Never replace the existing dashboard, Plex configuration or user-authorized real-device bindings to roll back this presentation.
