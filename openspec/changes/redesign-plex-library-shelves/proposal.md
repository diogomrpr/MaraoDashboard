# Proposal

## Why

The Plex section currently shows small posters in a grid, and reaching movies or TV series requires opening the library browser. The user selected the **Open shelves** preview: larger covers in three independently scrolling rows, so browsing starts directly in the Apple TV card.

## What Changes

- Replace the library home presentation with three shelves, in order: **Continue Watching**, **Movies**, **TV Series**. Apply the same home layout in inline media content and automatic media popups.
- Use one horizontal rail per shelf, with native touch scrolling and visible previous/next controls. Keep vertical page/sheet scrolling available and ensure scrolling never activates a title.
- Match the selected preview: approximately 176 CSS-pixel title tiles containing 160-by-240 portrait artwork, readable wrapping titles below, restrained rounded corners, and no additional enclosing tile surface. This roughly doubles the current 88-pixel tile width while keeping the artwork's 2:3 ratio.
- Populate movie and series shelves from the selected Plex server's actual library metadata, not Recently Added recommendations or translated library names. Merge matching libraries in returned order and retain exact item identities.
- Keep one-tap movie/episode playback and Continue Watching resume behavior. TV series navigate to seasons and episodes through the existing shared browser; they do not start an arbitrary episode.
- Preserve the existing Apple TV association, Plex/Rivulet playback choice, profile context, private artwork, launch guards, errors and native media controls. Keep general library browsing available without adding a fourth home shelf.

Observed implementation: `MaraoPlex.js` currently renders an 88-pixel grid; its compact home contains Continue Watching and a Browse library button. Full browsing additionally shows Recently Added and library folders. `plexHome()` returns recommendations and folder references rather than movie/show shelf contents, and `cleanPlexNode()` currently drops `children_media_class`. The data grouping therefore needs a small behavior change alongside the presentation change.

This is a separate follow-up to [add-plex-watch-card](../add-plex-watch-card/proposal.md), whose unarchived implementation already supplies browsing and Plex/Rivulet dispatch. This proposal changes its home presentation; its playback, privacy and parent-association contracts remain prerequisites.

Non-goals: implementing the other preview variants; shipping the fictional preview posters; a new theme, backend, dependency or card type; search, sorting, genre filters, profile switching, watch-history edits, progress estimates, queues or server management; changing app shortcuts, remote behavior or configured TV bindings. This request authorizes planning only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: specify the owned Plex library's three Open shelves rows, larger portrait covers, horizontal interaction, content grouping and navigation in existing Apple TV media cards. The detailed `plex-library-playback` capability remains defined by the prerequisite Plex change until it is synchronized into the baseline.

## Impact

Affected cards: `custom:marao-media-card` / `md_media_card` when `apple_tv.plex` is enabled, and their internal `custom:marao-plex-watch-card` child. Cards with missing/false Plex settings and ordinary app shortcuts retain their current behavior.

Implementation centers on `custom_components/marao_dashboard/frontend/MaraoPlex.js` and `MaraoPlexModel.js`, with existing media composition and popup ownership reviewed as consumers. Update English/Portuguese runtime copy, the media guide, quality/coverage notes and scoped model/component checks. Reuse the existing fictional Plex examples; only adjust their metadata if needed to demonstrate grouping.

Compatibility: no new saved option, schema/default, public card type, source-format version, config-entry version or migration. Existing `apple_tv.plex` objects, unknown fields, explicit false/empty values, app order, custom actions, names, raw/custom popup content and unrelated dashboard settings remain unchanged. The historical generator and released fixtures are not rewritten. Do not replace the real TV/server associations already configured on the disposable Media page. No HA installation or device action is part of proposal creation.
