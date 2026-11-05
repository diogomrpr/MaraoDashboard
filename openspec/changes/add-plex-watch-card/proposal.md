# Proposal

## Why

Marao can open the Plex app from an Apple TV card, but cannot browse a Plex library or resume a title from Continue Watching. Users should choose something to watch from the Apple TV card they already use, without configuring the same television again in an unrelated card.

## What Changes

- Add an opt-in Plex Watch card/section owned by the existing `md_media_card` Apple TV configuration, available in its automatic Popup and On dashboard presentations. Opening it selects that parent television automatically. Authored external popup layouts remain unchanged; unsupported combinations are explained before enabling Plex.
- Keep each Apple TV's playback app choice (Plex by default or Rivulet) alongside its current remote and app settings. Plex playback retains its client mapping; Rivulet uses an Apple TV content deep link. When several compatible Apple TV cards exist in the dashboard, offer a Marao dropdown using their configured names and mappings; one television needs only a clear target label.
- Use one Plex profile: the account context provided by the selected Home Assistant Plex integration. Show Continue Watching first, with direct resume actions, and provide library browsing for movies, shows, seasons and episodes, plus Recently Added where supplied by Plex.
- Start a selected title with one tap and strong haptics: wake the selected Apple TV if necessary, open its configured Plex source, discover/wait for the associated Plex client, and send one playback request. Show readable launch progress and failures.
- Reuse Home Assistant's authenticated media browsing, Plex actions and image proxy. Preserve the existing app shortcut's launch behavior and Marao's shared dropdown, popup, state/error and media-control contracts.
- Expose the optional Plex settings through the existing Apple TV card editor, validation and schema. Opening or saving unrelated settings must preserve the original card and its unknown options.

Confirmed scope is one profile, Continue Watching, Apple TV selection and association with existing Apple TV cards. The proposed presentation is an owned child card, rather than a separate top-level television configuration. The single profile defaults to HA's connected Plex account; arbitrary managed-profile selection is outside this change.

Non-goals: profile switching or automatic HA-user-to-Plex-user mapping; a Plex login/token form; direct browser-to-Plex networking; a new Python backend; unrelated media services; full-text server search, downloads, watch-history editing or queue management; changing existing app shortcuts; automatic dashboard rearrangement; or publishing this feature as part of the pending media-fix release.

## Capabilities

### New Capabilities

- `plex-library-playback`: browse one connected Plex profile's library and recommendation folders, resume selected content using Plex or Rivulet on the associated Apple TV, and own launch lifecycle, private artwork and failures.

### Modified Capabilities

- `card-behaviors`: associate the optional Plex Watch card with existing Apple TV media cards and inherit their target context in popup and inline layouts.
- `visual-builder`: edit and preserve Plex mappings inside the existing Apple TV options, with capability-aware setup and no duplicate TV configuration.

## Impact

Affected cards: `md_media_card` and its shared Apple TV composition, plus a new owned Plex browser child. Existing `md_media_app_card` source shortcuts remain compatible and retain their actions, artwork, order and dimensions. Generic media players and media cards without Plex settings retain their current behavior.

Implementation follows the current native frontend: `frontend_src/card-form-tools.js`, `native-card-editor.js`, `editor-model.js`, `card-composition.js`, the native dashboard context, and shared runtime actions. Add a project-owned vanilla JavaScript Plex component, English/Portuguese text, media documentation and narrow existing editor/composition/runtime checks. Use HA's Plex and Apple TV integrations; add no third-party card or runtime dependency. The legacy Python generator/integration is frozen and is not a new Plex execution path.

Compatibility is additive: an optional `apple_tv.plex` object, with no source-format, config-entry or package-version change in this proposal. Existing releases and historical sources require no migration; absence and explicit disablement remain unchanged, as do unknown fields, names, entity bindings, apps, raw YAML, custom popup ownership and unrelated HA settings. New configuration is saved only through an explicit native card edit. The implementation must confirm this with independently expected round trips and unchanged legacy output, without rewriting archived/released fixtures.

## Authorized Rivulet extension — 2026-11-05

Add `playback_app: rivulet` to `apple_tv.plex`, preserving omitted/default Plex behavior. Browse the configured real server through any registered HA Plex media player for that server, optionally selected with `browse_entity`; this is a read-only browser bridge, not the playback destination. Rivulet needs no per-TV Plex client, discovery button or Plex app source. HA 2026.10 still requires a registered media player for browsing, so explain how playing once in Rivulet permits HA session discovery. With no registered bridge, retain the real server selection and explain setup instead of substituting fictional media. Rivulet must use the same server/profile as HA. No backend or server configuration change is added.
