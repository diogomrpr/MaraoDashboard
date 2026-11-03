# Proposal

## Why

Marao already bundles the media app logos used on the disposable dashboard, but users cannot explicitly select them: artwork is inferred from the launch source. Expose that existing artwork in app shortcut configuration so every installation can choose a logo without uploading files or installing another card package.

## What Changes

- Offer a localized **App logo** chooser containing Automatic, Netflix, Spotify, YouTube, Disney+, Prime Video, Apple TV, Plex and MEO. MEO Go remains an automatic alias for MEO.
- Expose the same choices on standalone Media app cards and app entries configured through a media card's Apple TV options, including inline and popup presentation.
- Let an explicit logo override automatic artwork matching without changing the app's launch source, display name, configured fallback icon, order or actions. Returning to Automatic restores existing matching and unknown-source fallback.
- Reuse the packaged images, their provenance and the existing asset resolver; keep the choices available without external image requests or test-instance files.
- Update the media app documentation/playground and a small number of existing safe examples to explain explicit selection.

**Affected cards:** `md_media_app_card` / `custom:marao-media-app-card`, equivalent generic Marao app cards, and the app shortcuts composed by `md_media_card` / `custom:marao-media-card`.

**Non-goals:** Home Assistant's general icon picker, a global custom icon pack, additional app brands, uploads, artwork downloads, app discovery, new launch services or a redesign of media controls.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: Explicit selection of locally bundled app logos, automatic defaults, shared standalone/nested behavior and lossless configuration.

## Impact

Observed at starting commit `e613bf85422a9b749e58c0618f7f9c5327c6e2dc`: all eight assets exist in `custom_components/marao_dashboard/frontend/media-apps/` and the flat HACS `dist/` graph. `MaraoCards.js` owns automatic matching; the native editor currently exposes source/name/icon but no artwork choice. The user explicitly selected a chooser limited to app shortcuts.

Changes reach the shared brand metadata/runtime, native card editor and catalog, media app composition/validation, translations, documentation, existing safe fixtures and targeted frontend/package assertions. No external runtime dependency or Python lifecycle/API change is intended; any retained generator path that constructs app cards must preserve the new optional choice.

**Compatibility:** Add optional `variables.app_logo` to standalone app cards and `logo` to nested app entries. Omitted or empty values keep today's automatic behavior. Existing source values, custom names/icons, unknown fields, explicit empty app lists, order, native layout and actions remain intact. No dashboard-format, config-entry or automatic saved-data migration is needed; historical release fixtures stay immutable. Package versioning remains separate from these additive options.

**Acceptance:** A fresh installation lists all eight logos; a logo can be chosen for an unrelated/custom source without changing its launch payload; Automatic preserves older cards; and standalone, popup and inline shortcuts render the same chosen artwork from packaged assets.
