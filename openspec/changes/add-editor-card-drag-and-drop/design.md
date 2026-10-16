# Design

## Context

See proposal.md for motivation, confirmed editor scope and affected-card set. Baseline is v0.8.0 at `7f4241b0f36620bc82b28fe73373cec77ed54faf`. The unrelated local edit to `ensure-safe-dashboard-upgrades/tasks.md` must remain untouched.

`MaraoDashboardPanel.js` renders page sections through `_renderPageManager`, `_entityList` and `_entityRow`. Whole rows are HTML-draggable; `_bindDrag` accepts card drops only when source and target container coordinates match. Empty lists have no row target. Arrow actions mutate the local model, mark dirty and rerender the Visual view.

`editor-model.js` gives normalized canonical cards a page-wide `__localId`, retains original grouped/string sources and materializes existing identities when lists change. `serializeConfig` is the Visual/JSON/save boundary. Backend `page_model.py` validation and `generator.py` resolve unique IDs and page-local sheet references. `_page_view` preserves mixed order in fixed grids and groups automatic sections by domain. Existing page-model and page-generation checks already cover identity materialization and duplicate sheet separation.

## Goals / Non-Goals

**Goals:** One configuration operation for gesture and explicit moves; reliable touch interaction; draft-only previews; preservation of existing identities and source compatibility; bounded tests of the shared path.

**Non-Goals:** A generic drag framework, dependencies on third-party cards/libraries, changing runtime card gestures, cross-page link rewriting, a new persistence schema, migration pipeline, or visual raw-card editor. HA's native dashboard editor remains independent.

## Decisions

### 1. Share an atomic model operation

Add a small model-level move operation for a card occurrence within one canonical page. Inputs identify the source section and occurrence plus a destination section and insertion boundary. Validate all coordinates and source identity before altering either list. Normalize the destination boundary after source removal for same-list moves. Return whether a real change occurred; invalid/stale inputs and equivalent positions do not mutate the model.

Move the complete existing card object, including its `__localId`, rather than rebuilding it from catalog metadata or entity ID. Reuse current serialization and identity materialization. Duplicate entities are distinct occurrences. Preserve an emptied source section, destination layout/metadata, raw `cards`, optional fields and unknown properties. The up/down actions and new Move to section action use the same operation. Existing legacy-source conversion remains unchanged; do not introduce a second source format or rediscovery path.

Alternative: independent splice logic in each event handler is smaller initially but invites downward off-by-one errors, duplicate dispatch and different preservation behavior. A generic cross-page move engine would add unnecessary reference rewriting.

### 2. Use a dedicated handle and Pointer Events

Replace whole-card HTML dragging with a visible semantic handle in the shared row. Use browser Pointer Events for touch and mouse, with pointer capture and scoped `touch-action` on the handle only. Keep normal vertical scrolling and text selection elsewhere. Start a drag only after deliberate movement; a simple tap does not move a card. Reuse existing strong haptic feedback at drag activation and successful completion where supported.

Track one ephemeral session: source page/card identity, source document revision, pointer, candidate boundary and visual feedback. Keep the model and original row mounted throughout the gesture. Use an inert, noninteractive drag indicator/placeholder, not a live card clone. Suppress only the click following a consumed gesture so releasing cannot trigger an adjacent row action. Reject another pointer and external drag payloads. Preserve any unrelated legacy room-order interaction through its existing path.

Alternative: HTML Drag and Drop is already present but does not provide the required consistent touch path. A new sortable dependency is unnecessary for these section lists and conflicts with the self-contained direction.

### 3. Make destinations explicit and scrolling bounded

Give each section list a target, including a minimum visible empty-list target. Resolve before/after boundaries from actual row geometry in automatic lists and fixed-column editor grids; cover wrapped rows and the final insertion position. Highlight the candidate with theme-aware geometry and a non-color cue. Confine accepted targets to the source page. Sections on other pages are invalid targets.

During an active drag, use one animation-frame task to scroll the actual editor scroll container near its usable edges, accounting for the sticky header and viewport changes. Recompute candidate geometry after scrolling; never cache pre-scroll rectangles. Stop at scroll bounds and clear the task on every termination path. No automatic section creation or page expansion is required; destinations are the visible sections of the expanded source page.

### 4. Keep lifecycle and persistence boundaries intact

On release, commit once only if the session still matches the current document and valid target. Then use existing dirty-state calculation and rerender once, restoring focus/reachability to the moved occurrence. A cancellation or unchanged drop requires cleanup only. Cancel on Escape, pointer cancellation/lost capture, panel disconnect, Visual/JSON switching, save/discard/history replacement, modal opening, or document/busy-state change. Do not reinterpret a successful release's capture cleanup as a second commit.

Dragging never calls management writes or entity services. Save & Generate continues through existing server validation, backups, atomic generation and recovery; generated runtime stays unchanged until that save. A failed save keeps the draft available under current error handling. No new undo stack is introduced; Discard is the existing saved-state recovery.

### 5. Provide a tap and keyboard alternative

Retain Move up/Move down. Add a visible named Move to section action when another section exists, using existing HA form/dialog helpers to choose a destination section and insertion position. Section numbers match the existing displayed section headings; positions are described through card labels with an explicit end option. Cancellation is read-only. This offers the full move without requiring a gesture and keeps the drag handle itself free of a second hidden action.

Use `editor-labels.js` for English/Portuguese labels, instructions, result/error feedback and automatic-layout guidance. Use existing panel theme variables and Montserrat, with at least 48-by-48 visible controls. Allow actions to wrap at narrow/enlarged layouts rather than shrinking targets. No new focus-only styling or hover dependency.

### 6. Preserve layout semantics and generated contracts

Section transfers change membership; neither drag nor explicit move changes `columns`. Fixed layouts render exact mixed order; automatic sections retain established domain grouping. Show short localized guidance for automatic sections so users can choose fixed columns deliberately when exact cross-type positioning matters. Do not silently convert every edited section to a one-column grid.

Same-page moves retain page-local IDs, so implicit generated popup hashes and explicit links remain stable. Regression fixtures must verify media/climate/group/alarm/energy sheet-bearing examples, duplicates, nested vacuum data and entity-free headings/shortcuts through serialization and generation without individually testing every equivalent renderer.

## Risks / Trade-offs

- Touch capture may steal page scrolling -> isolate it to handles; verify real touch input, cancellation and ordinary scrolling on iPhone/Android profiles.
- Grid insertion and edge scrolling can select the wrong boundary -> test both directions, wrapped rows, start/end, empty lists and sticky-header geometry.
- Rerenders or draft replacements can invalidate indices -> keep source occurrence/revision checks and cancel before replacement; never mutate during preview.
- Existing identity materialization could change a sheet target -> independently assert before/after IDs, hashes and links, including cards without persisted IDs.
- More row controls may crowd small screens -> wrap semantic action groups and run alignment plus narrow/text/zoom checks.
- Automatic grouping can differ from editor list order -> preserve the published layout contract and explain fixed-column behavior at the point of editing.

## Migration Plan

No source-format or config-entry version change is planned. Unedited released sources must round-trip without new defaults/IDs; accepted moves use the existing ordered serialization and ID materialization contract. Test supported grouped/array/string inputs through their established conversion path and compare against independently authored expected moved documents. Preserve explicit empty lists, raw/protected content and immutable history.

Build the bundled panel from editable source. Deploy related assets together only to disposable `192.168.0.28`. Back up the exact source, generated output and affected state before browser persistence tests; restore and verify the baseline afterward. Existing save preflight and recovery remain authoritative, and previews/cancellations stay read-only. Rollback restores the matching package and saved source/generated/owned-state baseline together if any persistence test wrote data.

Update `tests/verification-map.js` for new helpers/test selectors rather than letting editor gestures fall outside scoped checks. Select editor model/UI, relevant page-generation/identity checks, alignment and scoped editor mobile profiles; keep security coverage focused on proof of no service dispatch and unchanged guarded configuration. Release-only preserved-install proof is conditional on actual persisted/ownership/upgrade impact; no full historical or mobile matrix is implied by this UI feature.

## Implementation record

Started at `7f4241b0f36620bc82b28fe73373cec77ed54faf`. Shared-row affected set:
all catalog/template entity cards, groups, headings, scenes and page shortcuts,
including duplicates and their generated detail sheets. Runtime renderers are
unchanged. Existing Monaco, maintenance-gallery and upgrade-task edits are retained.
The initial affected plan resolves editor model/UI, JSON, gallery and documentation;
movement-specific checks will add same-page identity/generation and gesture coverage.
Format 2, HA entry versions, migration, backup and history APIs remain unchanged.

The self-contained pointer session and section chooser add under 16 KiB to the
Visual panel. Its bounded JavaScript budget is now 144 KiB (CSS remains 32 KiB);
Monaco remains excluded from the eager import graph. No new request or dependency
is added to begin moving a card.
