# Proposal

## Why

HBO Max and F1 TV shortcuts currently fall back to generic icons because Marao's bundled app catalog contains neither brand. Ship both logos so existing shortcuts using the exact sources `HBO Max` and `F1 TV` gain appropriate artwork automatically and every installer can select them in the existing App logo chooser.

## What Changes

- Add packaged HBO Max and F1 TV artwork with stable logo IDs `hbo-max` and `f1-tv`, extending the existing eight-brand catalog to ten without reordering or changing existing entries.
- Automatically recognize the exact source names `HBO Max` and `F1 TV`, existing case/punctuation-normalized equivalents, and the verified app-name aliases documented in the design. Keep matching exact after normalization; do not guess bundle identifiers or broaden to generic HBO/F1 names.
- Offer both logos through the current standalone and nested App logo chooser and existing `variables.app_logo` / nested `logo` fields, including popup and inline media shortcuts.
- Record publisher artwork URLs, retrieval dates, app identity, permitted-use/ownership notes and any image preparation in `frontend/media-apps/SOURCES.md`, following the existing publisher/App Store artwork approach.
- Include the files in the owned-asset manifest and flat HACS distribution, update documentation, and extend existing focused matching, selection, preservation and packaging checks.

**Affected cards:** `md_media_app_card` / `custom:marao-media-app-card`, equivalent generic app cards, and the app shortcuts composed by `md_media_card` / `custom:marao-media-card`.

**Non-goals:** Additional brands, a new chooser or general icon pack, launch-service changes, remote artwork loading, dashboard migrations, production/Home Assistant household access, or any implementation/publication/deployment during this proposal workflow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: Extend bundled app logo support with HBO Max and F1 TV, verified automatic matching, existing chooser availability, local distribution and source-data preservation.

## Impact

**Observed:** At planning commit `0d5267902da0b2ab595db77af149a7a4b2f64da6`, `MaraoMediaApps.js` has eight brands and no HBO Max/F1 TV entries. The completed `choose-bundled-media-app-logos` change already implements shared matching, choices, validation and propagation; no duplicate active proposal was found. Python `page_model.py` also maintains the accepted logo IDs and must stay aligned. Existing package/editor tests and the Media app documentation enumerate the eight current choices.

**Reported context:** The requesting chat uses released v0.27.1 and reports the exact Apple TV source names `HBO Max` and `F1 TV`. This planning pass uses that supplied context and public sources only; it does not inspect household state or configuration.

**Compatibility:** Add two accepted IDs to existing option fields. Preserve all eight original IDs, Automatic, explicit overrides, custom names/icons, source strings, app order, explicit empty lists, actions, unknown fields and native layout/visibility. Automatic appearance intentionally improves for the newly recognized names; source/launch payloads and saved documents remain untouched. No dashboard format, config-entry or generated-structure migration is required. Prior release/history fixtures remain immutable.

**Dependencies:** Reuse the completed logo-chooser implementation and existing build/asset resolver. No new runtime package, card dependency or Home Assistant API is needed. Main-spec synchronization must respect that completed chooser change before this additive extension; this proposal does not rewrite its historical artifacts.

**Acceptance:** Both exact source names select bundled artwork automatically; explicit selection works in standalone and nested shortcuts; verified aliases match without overmatching unrelated apps; every selected file resolves in the installed HACS graph; and existing brands and exact launch data remain preserved.
