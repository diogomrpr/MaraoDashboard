# Design

## Context

The approved isolated proposal is `8e7f693f-6480-4740-ae98-3634280a33ac`, revision 3. It reuses the Plex renderer and shared popup. Plex is an owned child of the existing Media card; its TV, profile and server mapping stay there.

## Goals / Non-Goals

Promote the reviewed rendering and expose a usable layout selector without duplicating a TV setup, introducing another renderer or changing playback. Real-device playback, additional providers and automatic dashboard rewriting are outside this release.

## Decisions

- Add optional `apple_tv.plex.display: inline|popup` to the existing Plex options editor and both schema paths. Omission resolves to inline and is not written by an unrelated save. Preserve explicit inline, popup, disabled Plex values and unknown fields.
- Media composition forwards the resolved choice through the existing internal `full` flag. Popup children force full presentation, preventing recursive compact openers. This avoids a second renderer or duplicate TV mapping.
- Keep shelf errors in returned shelf results. Root failures populate three error results; render error surfaces and explicit Retry inside each affected section. Artwork failures stay local. Playback and TV availability retain their existing action semantics.
- Promote the dedicated documentation reference and fictional browse/artwork adapter. Keep its YAML a real parent Media card config; gallery presentation follows that saved option.

## Risks / Trade-offs

- Saved mode or unknown-field loss → existing native editor round-trip and composition assertions cover both modes and omission.
- Whole-library errors returning through unexpected paths → focused model/renderer checks cover partial, total, folder and malformed-result failures.
- Installation drift → install the final versioned release candidate with the existing asset/readiness and dashboard-preservation checks.

## Migration Plan

No data migration or config-entry change. Existing released Plex configurations remain valid and render full shelves. Installation changes assets only and preserves saved dashboard data. Package recovery uses the existing matching-package/data procedure; no dashboard edits or device actions are needed for installation.
