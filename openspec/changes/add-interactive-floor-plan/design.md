# Design

## Context

See `proposal.md` for scope. The active package is the native frontend documented in `docs/docs/development/native-frontend.md`; the released legacy Python integration is frozen. The catalog is `custom_components/marao_dashboard/frontend/marao-catalog.json`; `editor-model.js` owns draft normalization, schema, validation and copy helpers. Its entity-free role set and JSON alternatives need an explicit new card descriptor. `MaraoDashboardPanel.js` dispatches specialized editors; `compile-dashboard.js` owns native view/card composition. `MaraoSource.js` keeps source format, envelope and compiler versions separate.

The current compiler generates ordinary views, section grids, popup definitions and a separate navbar host. Merely increasing an image's CSS height cannot create the requested full-page layout. `MaraoNavigation.js` owns floating navigation and viewport/safe-area behavior. `MaraoCards.js` owns shared action/error handling and popup surfaces; `MaraoLightCapabilities.js` already interprets supported modes and HA-converted RGB. Native embedded-card previews in `lovelace-editor.js` are intentionally inert.

## Goals / Non-Goals

**Goals:** one native-source descriptor, an image upload and placement editor, a stable responsive renderer, live light feedback, and explicit non-destructive full-page composition.

**Non-Goals:** a general drawing tool, arbitrary entity/service overlays, image generation, image-mask management, a third-party floor-plan dependency, or refactoring unrelated runtime families. Do not remove inertness from generic native previews to build this feature.

## Decisions

### 1. Add a dedicated card and a small shared geometry/validation module

Use catalog key `md_floor_plan_card`, compiled to a project-owned `custom:marao-floor-plan-card` implemented under the shipped frontend tree. A small `MaraoFloorPlan.js` module supplies the JSON-safe model validation and coordinate transforms used by editor and runtime; the custom element can live in a separate `MaraoFloorPlanCard.js`. Register it through the existing runtime/build graph. Keep both as vanilla HTMLElement/Shadow DOM code, using native SVG for paths and semantic HTML buttons for controls.

Proposed source descriptor:

```json
{
  "template": "md_floor_plan_card",
  "id": "living-plan",
  "name": "Living room",
  "variables": {
    "image_id": "<native HA image ID>",
    "full_page": true,
    "lights": [
      {
        "id": "wall-strip",
        "entity_id": "light.wall_strip",
        "name": "Wall strip",
        "x": 30,
        "y": 40,
        "strip": {
          "width": 6,
          "points": [{ "x": 10, "y": 15 }, { "x": 70, "y": 15 }, { "x": 70, "y": 60 }]
        }
      }
    ]
  }
}
```

`x`/`y` are finite percentages in `[0,100]`; `lights` is an ordered list, explicitly empty when desired. IDs are unique within that card, so a deep-cloned card may retain its internal light IDs while receiving a fresh card ID. Bindings accept only `light.*`; absent/unavailable registry entities are retained, not erased. Optional `strip` requires two distinct points and finite thickness in 1–32 CSS pixels (default 6). Validate all points, types, booleans and image IDs in the builder, import/native validation, compiler and runtime. Preserve unknown fields by patching known properties rather than rebuilding objects. No arbitrary SVG markup, CSS, URLs or script expressions are accepted as geometry.

A dedicated canvas is simpler than encoding controls as many raw Picture Elements YAML entries, and avoids depending on HA's internal positioning-editor callbacks. Reuse browser primitives and existing project helpers instead of adding a canvas/drawing library.

### 2. Reuse native HA image storage without claiming transactional uploads

Upload PNG/JPEG through HA's authenticated `/api/image/upload` using `hass.fetchWithAuth` and `FormData`; persist its returned ID, deriving the native original-image URL for display. Follow the server's supported image validation and upload limit, and handle validation/size failures visibly. Keep image bytes out of source JSON, package assets and external services. Use a local object URL only for transient file preview and release it on replacement/dialog teardown.

Image storage and dashboard source saving are separate operations. The upload control explains that a chosen image is stored in HA; the existing saved dashboard continues referencing its old ID until explicit Save. Cancelling or Discard restores the old reference, but does not delete the new file. Replacing, copying or deleting a card never deletes native library images: another card may share them. No automatic garbage collector or media-library management is introduced.

Associate upload/decode completion with the dialog, current card/document and an attempt token. A late result cannot overwrite a new selection or another card; a current failure retains the last usable preview and offers deliberate retry. No source previews or compiler calls upload files. Native image serving follows HA's normal URL access behavior rather than a Marao-specific private-media guarantee; do not put real house imagery or its URLs into fixtures, logs or screenshots.

### 3. Use explicit editing modes and reversible gestures

Add `frontend_src/floor-plan-editor.js`, invoked by the panel's specialized-card editor dispatch. The UI provides image upload/replace and a touch canvas with its ordered light selector and placement/strip toolbar immediately below the preview. Add light enters placement; tapping the image opens a settings modal to select its light entity, name and icon. Create accepts the new entry. Tapping an existing light square opens that modal for rebinding, renaming, icon, strip thickness and removal. Update accepts settings and Cancel preserves them. Keep the parent dialog inert until the settings modal closes, then restore focus to the light square. The ordered selector reaches overlapping markers. Dragging previews movement and commits only a completed gesture without opening a modal. Exact coordinates stay editable in JSON; no visual form exposes light or strip-point X/Y fields.

Draw strip enters a temporary tracing mode for the selected light. Image taps append points; Finish accepts at least two distinct points, Undo removes the latest point and Cancel restores the previous path. Dragging adjusts points; tapping a point exposes removal beside the preview. Removing points cannot commit an invalid one-point path. Pointer cancellation, tab/dialog close, document replacement or lifecycle loss cancels uncommitted gestures. Point handles are visibly touch-sized; tiny decorative vertices are not interactive targets.

Use a local dialog clone and existing Update/Create, Cancel, Save and Discard conventions. Canvas/preview controls never call services. Replacing the background retains all accepted geometry without rescaling/reordering its source coordinates; its new aspect ratio simply changes the displayed image bounds. English/Portuguese strings belong in current editor/runtime catalogs. Keep generic JSON schema assistance aligned with the exact descriptor.

### 4. Render stable overlays from authoritative HA state

Fit the image with its aspect ratio intact, calculate the actual displayed image rectangle, and map both HTML marker anchors and SVG path points to that rectangle. Letterbox space must not enter the percentage calculation. Keep buttons at least 48px even when the image scales down. Constrain edge buttons inside the card and use a short anchor connector where needed; retain the exact saved anchor rather than moving geometry to make controls fit.

The runtime mounts the image/paths/buttons once per accepted configuration and updates state without replacing active controls on ordinary HA events. Resize observation recalculates display geometry only. Strip strokes use non-scaling width and a simple glow; choose a visible bounded intensity from valid reported brightness. Reuse supported-mode/RGB conversion helpers and theme tokens; use the active theme color if no usable color is reported. Do not show an off path as glowing or retain an unavailable light's last active glow.

Give each button a non-color on/off icon/shape treatment, localized state/name and substantive configured label. Before each toggle, check that exact light's live availability and connection, dispatch once with strong haptics and use the project's normal readable action error/notification handling. Share the relevant light action/state helpers with existing controls at their common root if currently private to `MaraoCards.js`; avoid a second service/error policy. This is a small extraction only, not a broad runtime refactor. Custom service actions are outside this descriptor's runtime contract.

Paths and background are noninteractive during normal operation. An ordered Lights sheet uses the same configured entries and state/action handling when large buttons overlap. Reuse the existing modal surface/focus/scroll behavior, not a second popup implementation. This is a compact alternative to adding pan/zoom gestures just to reach dense markers.

### 5. Make full-page composition explicit and preserve other contents

Use the descriptor's optional `variables.full_page` boolean; absent/false retains ordinary composition, preferably in a one-column section. No independent page-layout setting is needed for this feature. Enabling full-page validates the complete page, including collapsed sections and custom/raw content: there must be exactly one visible content card and it must be this plan. Empty sections and structural popup definitions can remain. Other visible cards, another plan or non-popup custom fragments cause a localized conflict, never automatic removal or movement.

For a valid full-page plan, compile a native `type: panel` view with one top-level native vertical stack containing the floor-plan card, retained popup structures and the existing navbar host. Bypass ordinary equal-height grid wrapping for this branch. The plan sizes to the actual available mobile viewport above the shared navbar boundary and safe areas; keep navigation and popups under their current owners. If navigation needs to expose its already measured bounds to the plan, add one narrow shared sizing signal rather than duplicate a guessed navbar height. Never route through another dashboard root or hide navigation.

Turning full-page off changes only presentation. Existing normal pages use their unchanged compilation branch and keep the same expected output. The image is contained, so differing aspect ratios can leave unused space; no cropping, stretching or runtime zoom is implied.

### 6. Add compatible fields, not a source rewrite

Supported released sources in `ha-test/upgrade/fixtures/native-baselines.json` (including v0.21.1) already exercise source-format-2 conversion and fixed expected outputs in `native-compiler.test.js`. Keep those originals/provenance immutable, and use them as preservation evidence. The new card/options are additive: no rewrite of existing source, no package/config-entry/source-version coupling and no format migration. Older packages reject the unknown card template; they must not be used to save a feature-bearing source.

Use existing native-session preview/validation, exact source export, conflict checks and failure retention. Do not introduce a new storage transaction or override HA's documented save limits. Before development writes on the disposable instance, preserve the exact dashboard baseline through the existing helper; keep the pre-feature export and matching installed package for rollback. Restore both when downgrading, retain uploaded media, and report recovery failures instead of replacing source with defaults. Historical images are not copied into versioned source fixtures; portable exports reference HA-managed assets and therefore require those images on the target HA instance.

## Risks / Trade-offs

- [Letterboxing or rotation shifts overlays] → Share one image-bounds transform between editor/runtime, with a narrow coordinate assertion and manual portrait/landscape watch list.
- [Image dimensions change on replacement] → Preserve source geometry; let the administrator reposition deliberately, without silent resets.
- [Dense/edge controls overlap or clip] → Keep visible 48px buttons, anchor connectors, editor overlap feedback and the ordered Lights sheet.
- [Upload completes after a draft was cancelled] → Attempt ownership guards; never mutate another draft or delete potentially shared media.
- [A full-page setting conceals configured cards] → Validate the complete page before save; reject conflicts without changing content.
- [Shared helper extraction affects ordinary lights] → Limit extraction to reused availability/action/error behavior and retain one representative ordinary-light assertion.

## Migration Plan

Implementation lands source/model/runtime together, then rebuilds editor and native distribution with the existing scripts. Use a synthetic room image and helper lights under `ha-test/` for one realistic room-plan page and a representative ordinary card in the existing Cases view of `/marao-dashboard`. Add no real floor plan or fake fixture asset to the shipped package tree.

Verify the new descriptor, image-failure/late-completion handling, independent copies, exact dispatch, full-page composition and unchanged released fixtures with the smallest existing targeted Node checks. Install final current assets once on disposable `192.168.0.28` through the compatible preparation helper; served-asset/readiness checks confirm installation. Agent browser automation and broad mobile matrices are not automatic requirements. If a short manual agent visit is needed, use the existing preview workflow once with helper lights only. Publication remains a separate user request and unit-only gate.

## Reference contracts

- [HA custom card contract](https://contributors.home-assistant.io/frontend/custom-ui/card/) for lifecycle, configuration, HA state and sizing.
- [HA panel view](https://www.home-assistant.io/dashboards/panel/) requires exactly one top-level card; native stacks provide the required composition.
- [HA 2026.10.0 image upload implementation](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/image_upload/__init__.py) defines supported image storage/serving behavior; use native upload handling, not a new Marao endpoint.
