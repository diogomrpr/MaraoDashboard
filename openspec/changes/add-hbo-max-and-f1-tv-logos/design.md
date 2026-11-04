# Design

## Context

See [proposal.md](proposal.md) for scope and [the card delta](specs/card-behaviors/spec.md) for acceptance. Inspection began at `0d5267902da0b2ab595db77af149a7a4b2f64da6`, with no tracked modifications. Other existing planning changes are unrelated.

The completed `choose-bundled-media-app-logos` change supplies the shared catalog, source-independent logo option, editor dropdowns and propagation. `MaraoMediaApps.js` currently defines eight brands and drives matching, JavaScript validation, schemas and chooser labels. Python `page_model.py` has a separate `MEDIA_APP_LOGOS` allowlist. Both need the same two additions; new form controls or generation architecture are unnecessary.

Main `card-behaviors` still lacks the completed chooser delta. This change adds requirements for the two additional brands rather than pretending the older artifacts have been synchronized or rewriting them. When syncing completed changes later, apply the chooser's requirements first, then this extension; its original eight-item description records the earlier stage rather than a permanent catalog ceiling.

## Goals / Non-Goals

**Goals:** Make both brands available through the existing catalog and every current app-shortcut presentation, using local publisher artwork and preserving launch data.

**Non-Goals:** No new dependencies, custom icon registration, matching algorithm, option fields, default writes, new launch API or household configuration access. No implementation or deployment is part of this planning workflow.

## Decisions

### 1. Extend the catalog and current validation boundary

Append `hbo-max` / **HBO Max** and `f1-tv` / **F1 TV** to the shared catalog, preserving the original eight entries and their relative order. Use local square PNG files `media-apps/hbo-max.png` and `media-apps/f1-tv.png`, following the existing App Store artwork convention. Add normal brand-surface metadata compatible with the selected artwork; keep existing neutral availability/error precedence.

Extend Python's accepted IDs in `page_model.py` at the same time. JavaScript validation and standalone/nested choices already derive from the shared catalog. `editor.py` declares the existing `app_logo` field and needs no new field. Preserve the current `variables.app_logo` and nested `logo` shapes, including omitted/empty Automatic values.

Alternative considered: user-supplied remote image URLs or one-off shortcut overrides. They would not provide the requested artwork out of the box and would bypass the existing local catalog.

### 2. Bound matching to verified names

Keep the current exact equality after lowercase/alphanumeric normalization. That already handles capitalization, spaces and punctuation, so duplicate spellings need no extra aliases.

| Brand / ID | Accepted source names | Evidence |
| --- | --- | --- |
| HBO Max / `hbo-max` | `HBO Max`, `Max`, `HBO Max: Stream Movies & TV` | Exact short source supplied by the requesting chat; the full title is on the [publisher's App Store listing](https://apps.apple.com/us/app/hbo-max-stream-movies-tv/id1666653815). WBD's [Max-to-HBO-Max announcement](https://press.wbd.com/us/media-release/warner-bros-discovery-announces-max-become-hbo-max-summer?language_content_entity=en) supports retaining the former name as an alias. |
| F1 TV / `f1-tv` | `F1 TV`, `F1 TV: Stream F1® Live` | Exact short source supplied by the requesting chat; the full title and Apple TV availability are on the [publisher's App Store listing](https://apps.apple.com/us/app/f1-tv-stream-f1-live/id1315007279?platform=tv). |

Public naming evidence was checked on 2026-11-04. The `Max` alias is a proposed compatibility mapping based on the publisher's documented rename; it is not a claim that this planning pass observed a household Apple TV reporting that value. No reverse-DNS bundle identifier was verified from primary metadata, so none is proposed. Do not guess HBO Go/HBO Now, bare `HBO`, bare `F1`, subscription-tier names or substring aliases.

An explicit valid logo selection continues to win over automatic matching. Matching changes presentation only; `source` / `app_source` and service payloads keep the exact original strings. A custom name alone must not brand an explicitly unrecognized source.

### 3. Retrieve and document publisher artwork during implementation

Use the two official App Store listings above as stable publisher/app identity references: App IDs **1666653815** (WarnerMedia Global Digital Services, LLC) and **1315007279** (Formula One Digital Media Limited). Obtain their publisher-supplied app icons from Apple's linked artwork/lookup metadata and save a square PNG at the existing 512px convention. Record the exact image URL actually used, actual retrieval date, publisher, app ID, original format and any resizing/transcoding in `media-apps/SOURCES.md`.

Retain the existing statement that brand marks belong to their respective owners and record any applicable source terms without claiming an open license. Preserve the app mark and aspect ratio; avoid a fabricated or unrelated F1-only/HBO-only logo. Metadata retrieval and image preparation are build-time maintainer work. Runtime performs no lookup, download or external image request.

Artwork binaries have not been downloaded or added during planning. If a public artwork endpoint is unavailable during implementation, use the same publisher's public linked app icon rather than an unrelated logo site; record the source actually used.

### 4. Reuse existing consumers, packaging and documentation

| Boundary | Change / review |
| --- | --- |
| `frontend/MaraoMediaApps.js`, `frontend/media-apps/` | Add the two entries, name aliases, images and provenance. |
| `page_model.py` | Extend `MEDIA_APP_LOGOS`; keep existing rejection and preservation behavior. |
| `frontend_src/card-form-tools.js`, `editor-model.js`, native editor | Existing shared choices/schemas pick up both IDs; review them and extend the enumerated-choice assertions rather than duplicate lists in UI code. |
| `card-composition.js`, `native-metadata.js`, retained Python generator/metadata mappings | Existing `logo` to `app_logo` forwarding remains applicable; preserve the mappings and confirm representative new-ID round trips. |
| `build-editor.cjs`, `build-native.cjs` | Rebuild owned assets and flat HACS files; do not hand-edit generated manifests or identity-prefixed assets. Existing recursive image copying and asset URL resolution should suffice. |
| `docs/playground/settings-options.js`, `docs/scripts/build-preview.mjs` | Existing shared choices and PNG/SVG discovery should include the additions without a new preview path. |
| `docs/examples/manifest.js`, generated Media app page | Update the actual notes/choice source, add concise examples if needed, then regenerate the card page using `docs/scripts/generate-card-pages.mjs`. Preserve the distinction between source and artwork ID. |

No theme geometry, translations of brand names or action behavior changes are needed. Existing English/Portuguese App logo and Automatic labels remain shared. Test helpers/examples stay outside shipped code, and any current example updates use safe fictional entities only.

### 5. Focus checks on the added data and its consumers

Extend existing matching/rendering and explicit-logo checks in `marao-card-visibility.test.js` with both exact names, listed aliases, no-prefix-match cases and unchanged launch payloads. Update existing chooser/validation assertions in native editor/editor-model tests and a narrow Python page-model assertion so standalone/nested new IDs pass while all prior IDs and invalid-ID behavior remain intact.

The existing HACS package test enumerates the current eight choices and resolves each image through the flat asset resolver. Extend its expected set to ten and check both new image files and retained originals. Review the docs settings-choice assertion and generated Media app page; reuse the current preview image discovery. Use only these small targeted checks serially, not all suites mapped to the shared files. No new browser harness, geometry matrix, camera playback or live source launching is needed.

## Risks / Trade-offs

- **A new choice is accepted in JavaScript but rejected by retained Python validation** → Update the allowlist together and assert both standalone and nested acceptance.
- **An overly broad alias brands another app** → Retain exact normalized matching and verify `HBO` / `F1` remain fallback cases.
- **Source layout works but HACS omits an image** → Use the current build and test every catalog image through the flat package resolver.
- **A generated docs page loses its manual updates** → Edit `docs/examples/manifest.js` notes and regenerate rather than patch only the output page.
- **Artwork URLs change** → Save the selected bytes locally and record exact provenance; runtime does not depend on those URLs.

## Migration Plan

This adds enum values to existing option fields and intentionally changes automatic appearance for newly recognized sources. It does not transform persisted JSON, generated structures, source values or historical data. All old IDs, omitted/empty overrides, explicit app-list emptiness and unknown fields remain valid. No format/config-entry version bump or historical fixture rewrite is required.

When implementation is separately authorized, rebuild the final applicable assets and perform the repository's required installation only on disposable `192.168.0.28`, using direct `prepareFrontend()` for a compatible frontend-only final diff or one `ha:sync` if the retained Python update requires full preparation. Existing helpers own backups/readiness and preservation of test configuration/helper state. No household instance is a verification target.

There is no migration to roll back. If a later disposable test deliberately saves new-logo selections, retain exact configuration/package backups and restore matching package and affected configuration together if reverting, preserving unrelated concurrent edits. The present proposal performs no build, installation, commit, release or Home Assistant access.
