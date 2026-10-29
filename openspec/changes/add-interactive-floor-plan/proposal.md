# Proposal

## Why

Users need to control lights by their physical location on a room image, including strips that visibly illuminate along their installed path. Marao can embed native Picture Elements cards, but has no dedicated floor-plan authoring flow or page-filling floor-plan layout.

## What Changes

- Add a self-contained Floor Plan card: upload a room image, select light entities, tap to place their buttons, and drag to reposition them. Allow editing names/icons, changing bindings and removing buttons.
- Let each light optionally have a strip path drawn by tapping successive points, including corners. Support adjusting points and thickness without editing the original image or preparing illumination overlays.
- Buttons toggle their exact light and show its authoritative current state. Strips show a dim path when off, glow when on and follow HA-reported brightness/color where supported. Missing, unknown, unavailable or disconnected lights show neutral unavailable feedback and cannot be toggled.
- Offer a full-page display option that fits the plan above the existing navbar without distortion or cropping. Keep positions anchored to the image across resizing and rotation. Retain ordinary one-column card placement as the default.
- Keep drawing and positioning exclusive to the editor; editing never actuates lights. Arrangements use the existing draft, Save and Discard workflow. Image files use HA's native upload storage; uploading a file does not save the dashboard.
- Preserve configured positions and light bindings when replacing the image, letting the user adjust them deliberately afterward.

Confirmed scope: upload an existing image, toggle lights with live state, trace strips visually, and support full-page presentation. Proposed defaults: PNG/JPEG input, percentage coordinates, one button per configured light entry with an optional strip path, and button-only runtime interaction; the drawn path is visual feedback.

Non-goals: drawing walls, CAD/SVG authoring, automatic lamp detection, photorealistic wall illumination, transparent image masks, animated effects, multi-floor navigation, arbitrary device/service actions, runtime pan/zoom controls, brightness/color editing, third-party cards or a new backend. Dense placements remain adjustable in the editor with visible touch-sized controls and overlap feedback; a compact Lights list keeps every toggle reachable when overlays overlap on a small screen.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: image upload/replacement, visual light placement, strip tracing and complete draft/configuration preservation.
- `card-behaviors`: image-backed light toggles, current-state buttons, strip-state rendering and shared failure/action rules.
- `dashboard-generation`: explicit full-page floor-plan composition with retained navigation and safe rejection of incompatible page contents.

## Impact

- New card family: `md_floor_plan_card`, rendered by a project-owned floor-plan custom element. Shared consumers include catalog/schema/validation, the Visual/JSON builder, native strategy/compiler, duplicate/move handling, navigation sizing and light state/action helpers.
- Active sources: `frontend_src/`, shipped runtime/catalog/localization under `custom_components/marao_dashboard/frontend/`, native distribution builds, relevant usage/source-format documentation, targeted Node tests and disposable fixtures under `ha-test/`. The frozen legacy Python integration is not extended.
- Compatibility: additive descriptors/options in current source format 2; existing released sources and their compiled output remain unchanged. No automatic migration, discovery or new defaults are applied to old dashboards. Older packages do not understand the new card; rollback uses the pre-feature source and matching package rather than silently stripping it. Preserve image files, unknown fields, empty selections, raw content and unrelated settings.
- Planning baseline: `df63f39c8da1b48dd4fa9e15a7d88c4ac8386d84`. Existing runtime/CSS/number-card/test edits and media-control planning are unrelated work to preserve. This proposal authorizes no code changes, installation or publication.
