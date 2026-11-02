# Design

## Context

See [proposal.md](proposal.md) for motivation and prerequisite changes. Design is warranted because the option crosses editor mapping, validation, composition and runtime layout.

The current `MaraoCards.js` People branch renders a semantic list with fixed 48px pictures/icons and wrapping text. `MaraoCollections.js` owns shared `peopleError` validation and per-person readings. `frontend_src/native-card-editor.js` edits collection membership through HA forms; `native-cards.js` creates empty People stubs and native sizing. `editor-model.js` invokes People validation. `card-composition.js` explicitly builds the People descriptor and currently forwards only members and optional name, so an added field needs deliberate forwarding. `tests/frontend/collections.test.js` already tests composition and preservation. Runtime state and actions are unaffected.

## Goals / Non-Goals

**Goals:** one optional persisted preference, identical validation across supported entry points, responsive rendering without configuration writes, and complete existing collection preservation.

**Non-Goals:** new containers, framework dependencies, Python discovery, starter regeneration, migrations of historical dashboards, or changes to shared control-grid geometry.

## Decisions

### Keep the option at card level

Use `columns: 1..6`, with omission interpreted as 1 only at the point of rendering/form display. Do not materialize it during unrelated edits. Native `grid_options.columns` continues controlling the card's dashboard footprint. A nested variable was considered, but top-level columns follows existing layout vocabulary and avoids confusing internal arrangement with entity settings.

Extend `peopleError` using property-presence checks so explicit null is invalid; reuse it in runtime, descriptor validation and native forms. Add a localized English/Portuguese error. Forward the option in `card-composition.js` only when present. Review the existing native config/descriptor conversions and historical raw-card preservation path for lossless passthrough; no generator default or new Python contract is needed.

### Reuse the editor's numeric control

Add a People-only localized Columns field through existing native form mapping/patching. Use the shared up/down numeric control and enforce integer bounds. Preserve complete config-changed payloads and member objects. Review `editor-labels.js` and catalog metadata where needed rather than adding a second editor implementation. Leave `native-cards.js` stub omission and content-driven sizing intact. Rebuild shipped assets with `npm run build:editor`.

### Lay out entries within the existing list

Use a CSS grid on the People list, retaining semantic DOM order and per-entry markup. Derive responsive capacity from available card width and a font-relative minimum entry width; cap it at the saved preference. Entries can stack picture and text if necessary in an exceptionally narrow host, retaining full names and places. The heading spans the full card width. Avoid fixed heights and CSS visual reordering. Use existing Montserrat and theme tokens; no new palette or theme dependency.

Prefer container-aware CSS to viewport breakpoints: native sections, popup hosts and dashboard cards have different available widths. A fixed column count was rejected because it can clip content at 320px or enlarged text. Do not reuse the interactive control-grid wrapper around individual people: they are informational entries, not independent cards.

### Keep verification small and concrete

Extend existing collection/native editor assertions for omitted and explicit preferences, invalid types/bounds, non-mutating composition and unknown-field/member preservation. Review representative scene/group consumers of shared editor paths. Update the existing fictional People example in `ha-test` and the usage documentation rather than creating a new gallery matrix. Routine visual inspection belongs to the user; watch for two-column row order, narrow/text reflow, long names and unchanged per-person availability. No camera, physical-device or broad integration checks are needed.

## Risks / Trade-offs

- Preferred columns can render fewer tracks in a narrow host → explain responsive behavior in the editor/documentation; never change the saved value.
- Composition can silently drop the preference → assert native and generic descriptor propagation with independent expected output.
- Form defaults can cause unrelated saves → retain the original presence of the property and patch only changed fields.
- Concurrent People/native-editor work → preserve existing dirty hunks and coordinate against the prerequisite changes before applying.

## Migration Plan

No versioned data migration or historical transformation is required: historical People inputs without columns produce the same one-column output; explicit new values pass through unchanged. Preserve raw/unknown fields and avoid touching archived fixtures or rewriting dashboards. This does not introduce an ownership/write transaction, so no new backup system is needed. If implementation discovers a rewriting path, stop and scope its compatibility and recovery before changing it.

After essential local checks, install final frontend assets once using `prepareFrontend()` directly on disposable `192.168.0.28`; use `ha:sync` only if an actual fixture/backend change requires full preparation. Preserve safe helper state and report readiness from installed asset checks. For recovery, restore only task-owned edits/assets while preserving unrelated changes; any saved-data rollback must use matching package and exact saved data together. Planning performs no deployment.
