# Design

## Context

See [proposal.md](proposal.md). The current native wrapper composes automatic sheets in `card-composition.js`; `MaraoPopupCard` owns modal/scroll/focus behavior; `MaraoGroupDetails.js` owns automatic group layout/actions. Native forms patch complete card configurations. Current native-editor deltas supersede the historical baseline's authoring-retirement note.

HA frontend source for [hui-view](https://github.com/home-assistant/frontend/blob/20260930.5/src/panels/lovelace/views/hui-view.ts), [Sections](https://github.com/home-assistant/frontend/blob/20260930.5/src/panels/lovelace/views/hui-sections-view.ts) and [section hosts](https://github.com/home-assistant/frontend/blob/20260930.5/src/panels/lovelace/sections/hui-section.ts) shows a registered host accepting hass/lovelace/index and owning native card/section creation. This is a narrow compatibility boundary, not a stable imported API. Verify the actual installed disposable host before handoff.

## Goals / Non-Goals

Use HA's saved Sections configuration and renderer once, with normal native editing on a dedicated view. No parallel grid editor, HA class imports, private shadow-root style patches, implicit conversion, production access or camera transport testing.

## Decisions

### Optional source reference and sole native ownership

Add top-level `popup_view` as a safe same-dashboard view path. Existing fields/versions retain their meaning when omitted; preserve the old automatic descriptor unchanged. Native popup owners expose Automatic plus existing non-strategy Sections views. Invalid/missing references are errors; removing the field deliberately returns to automatic layout. No implicit view creation or historical/default rewrite occurs during load, preview, conversion or updates.

Linked group membership is derived from explicit compatible principal entity bindings and supported entities lists within source section/stack cards. Ignore action targets, diagnostics, unrelated domains and structural action/heading cards. A linked group's native editor exposes its summary type and source choice, and directs membership/layout editing to the source view; it does not maintain another editable member list. Existing native visibility becomes authoritative presentation; hidden selected cards still contribute to aggregate and bulk scope.

### Native view inside the existing shell

Mount a registered `hui-view` within the popup content and supply the real source index and a read-only viewing facade of the current lovelace config. Keep editMode false and reject in-popup config writes. HA owns card wrappers, grid_options, visibility and lifecycle. Forward current hass/config on native host updates, preserving the same host through unrelated state updates; remove listeners/host ownership on close. Reuse current popup safe areas, centered column width, internal scrolling, focus trap and inert restoration. Fail readably if the native host is unavailable.

Edit layout is admin-only, closes/restores the modal, navigates to its source subview and enters the real root's native edit mode. HA owns Save/Cancel/Done; leaving editing and reopening the popup rereads that same source. No nested native editing, iframe, synthetic save button or shell patch is introduced.

### Explicit creation with exact preservation

Create editable layout is an administrator runtime action outside edit/preview. Resolve the actual invoking native card within the current source view, requiring an unambiguous exact configuration match. Create a safe unique path and one Sections subview with a back path. Seed member controls as native Marao wrapper configurations so HA can resize them, preserving names/options/unknown fields. Translate existing section boundaries and Active only behavior to native heading/cards/visibility. Generic popup content preserves opaque/native cards and order; flatten only owned grid layout when needed to expose its direct controls, retaining initial spans.

Append the new view and add `popup_view` only to that initiating card in one native save. Preflight native host compatibility, administrator/connection/current route, exact saved dashboard/card baseline and duplicate paths; retain an exact original/proposed recovery export before writes. Recheck immediately before save. Native acknowledgement/readback is not disk-durability proof. On uncertain writes retain the export, compare exact current data and refuse blind retry. Do not remove source views automatically on card deletion or reference removal. Rollback restores matching package plus exact affected dashboard data after checking unrelated concurrent changes.

### Shared scoped actions and summary state

Extract the current group toolbar into a reusable owner and seed top/section action cards referencing the source view, entity type and stable section identity. These cards derive current compatible targets from the saved native layout; never copy service-target lists into a second database. Keep explicit light/cover/climate policies, exclusions, partial results, haptics and shared native action dispatcher. Native additions/deletions affect the tile's derived summary as well as actions. Automatic groups continue through their existing renderer and semantics.

### Integration and validation

Use one small project-owned popup-view module for pure reference/seed/preservation helpers and the native runtime bridge, shared by native composition/editor and popup owner. Extend existing catalog/editor labels/schema, native context propagation, runtime registration and native build ownership only as required. Add focused native composition/editor/popup tests and independently expected preserved data. No frozen Python generator change is needed.

Check one safe linked layout on disposable HA: native half/full widths and independent heights, edit/save in HA then reopen, member scope and empty/deleted content, source error and inert edit handling. These checks address the concrete native-host and dashboard-write risks; no broad browser/device matrix is implied. Add a small Home/Cases example under `/marao-dashboard`, preserving unrelated configuration. Build and sync final frontend once after edits; only reinstall later changed assets if a concrete correction is necessary.

## Risks / Trade-offs

- HA host interfaces can change → small guarded adapter, actual installed-host check and readable unsupported state; no bundled upstream implementation.
- Native layout editing changes membership → source cards are authoritative, summary/actions recompute from saved compatible bindings, retained automatic data stays inactive.
- Concurrent or duplicate invoking cards could be overwritten → exact current-view match, stale checks, one append-and-bind save and recovery export; ambiguous matches refuse writes.
- Added native view/cards can expose HA-authorized configuration → references stay within the same dashboard and existing HA permissions; no privacy boundary is implied by a subview.
- Nested native components could affect modal input or lifetime → retain the existing shell and test close/edit/removal behavior with safe helpers.

## Migration Plan

No automatic migration, source/envelope/compiler version bump or backend change. Compare supported released native descriptors and retain unknown settings, custom content, explicit emptiness and old automatic popups. New creation uses explicit current-data preflight and exact private exports; old packages require matching saved dashboard rollback if they cannot render the new action cards/reference. Never discard a native-authored layout to downgrade assets alone. Publication remains separate and unit-only by default.

## Installed host findings

HA custom card editors receive the dashboard document directly in `lovelace`; runtime roots expose a wrapper. The shared context adapter supports the direct document and `rawConfig`/`config` wrappers, so page and popup view choices share the same source. The disposable HTTP host lacks `crypto.randomUUID`; view paths use `getRandomValues` with collision preflight. Recovery object URLs stay alive long enough for browser downloads. Confirmed saves retain their new path locally, so a delayed native refresh cannot trigger a second creation.

The installed editor also exposed an invalid empty HTML color-input warning. Optional color strings use native HA text fields to preserve unset/CSS values; required hexadecimal threshold controls keep their picker. This supporting correction changes no persisted color values.
