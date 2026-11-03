# Design

## Context

See [proposal.md](proposal.md) for the product problem and affected families. The current code has two useful boundaries: `card-composition.js` computes automatic popup content from a configured card, and `MaraoPopupLayout.js` / `MaraoPopupView.js` seed and render native Sections sources. The missing boundary is ownership of generated controls after seeding.

`MaraoCardEditor` receives an ordinary HA card draft and emits complete `config-changed` events. It does not own HA's Save button or a whole-dashboard draft. Do not turn a form change into an independent dashboard write. `native-bootstrap.js` owns one controller per native root; the retained `NativeSession.subscribe` demonstrates filtering `lovelace_updated` by dashboard path. A notification must still be checked against a fresh saved document: it is not permission to replace a current editor draft.

The current download originates in `_editPopup`'s recovery callback, not HA. Removing its programmatic link click alone would leave an unwanted recovery/export feature. Remove the link, Blob URL lifecycle, export copy and callback contract together while preserving the transaction checks.

Design is required because this introduces persisted ownership data and coordination between native card saves and editable view sources. It changes neither HA's card APIs nor the frozen Python integration/generator.

## Goals / Non-Goals

**Goals:** A popup remains managed after its layout is edited; a saved functional setting has an observable effect; arbitrary custom content and native layout remain user-owned; source changes are bounded, idempotent and recoverable internally; editing requires no downloaded artifact.

**Non-Goals:** General-purpose document merging, continuously regenerating a dashboard, intercepting or patching HA classes/Save handlers, a new backup product, automatic registry discovery, or storing transient pickers as native views. No source is created simply because a card exists or a viewer opens the dashboard.

## Decisions

### 1. Keep automatic content until an explicit layout edit

Automatic mode continues to use the current composition path. Edit popup materializes a managed Sections source on first use and opens it; later edits reuse it. A view's content still appears inside the existing modal sheet. Its path is not added to Marao navbar routes, and it remains a same-dashboard subview with a return path.

This makes every supported configured popup editable without requiring an up-front migration or an independent save for every newly added card. The user's suggestion to make all popups views was conditional on simplifying the experience; eagerly creating all sources would introduce more writes without solving ownership. Universal persisted views and static snapshots were rejected. The same managed model applies whenever a view is materialized.

### 2. Record ownership on the source, not in inferred visual structure

Add `marao_popup` version 1 to managed views and an opaque `marao_popup_slot` role key to the generated card nodes. The record contains:

- The current popup family and the accepted projection of functional parent settings, excluding live entity state and registry discovery.
- Each logical slot's last generated native configuration, functional field paths and default placement anchors.
- Suppressed logical slots and retained managed-layout state for previously selected families.
- Provenance needed to distinguish a newly seeded source, an adopted released source and custom content.

Resolve owners from current `popup_view` references and same-view hash definitions through the existing occurrence/source helpers. Do not use array indexes, generated display names or runtime instance IDs as durable owner identity. Recompute exact card paths against each fresh transaction source. Ambiguous occurrences fail without writes.

A slot key describes a stable role, such as a selected member's primary control, media transport or camera events. It does not change when a card is moved, resized or renamed. Intentional duplicate instances of a slot are allowed: update their functional binding together while preserving each instance's layout. A copied marker outside its matching managed view does not claim another view's ownership. Unknown metadata versions are preserved and refused for management.

This is a new versioned frontend metadata contract, independent of `config_version`, root `marao.version` and package version. Reuse existing unknown-field preservation; no new server or dependency is needed.

### 3. Separate functional settings from layout and local presentation

Build one pure planner using the existing composition and seeding functions. Its inputs are the accepted owner configuration, current native source, previous generated baseline and supported metadata. Its result is either no change, an exact candidate document or a localized ownership/validation conflict. It must not perform I/O or call services.

| Owner | Values |
| --- | --- |
| Invoking card | Popup family/display mode, primary entity, explicitly selected managed members, forwarded functional options and action-safety bindings |
| Native view | Card order, section placement/headings, dimensions, explicit visibility, deliberate deletions, independent custom cards, local names/icons and other presentation overrides |
| Shared runtime | Live availability, capabilities, connection, current state and strict action guards |

For a compatible managed slot, replace only its enumerated functional fields from the new composition, preserving unrelated keys and user layout/presentation. Use own-property-aware comparison so omission, false, zero, null and explicit empty lists remain distinct. Untouched presentation defaults can follow new defaults; deliberately edited presentation stays local. Never deep-merge an arbitrary service/action object: replace a managed functional action as a complete validated unit.

Treat generated popup-filter visibility as an owned contribution rather than replacing the full visibility list. Record the known generated clauses so changing Active only/All replaces only those clauses and retains additional user visibility conditions. A conditionally hidden card still belongs to the configured scope; a deleted slot does not.

Missing previously generated slots mean deliberate deletion. Keep them suppressed through unrelated option changes, reloads and generator updates. Do not refill an empty section or automatically add newly discovered entities. New explicit parent selections can introduce new logical slots; removed selections remove only their managed instances. Independent custom cards are never retargeted. For Entity Groups, the native card editor exposes the explicit managed selection and group kind without a redundant primary Entity field; the active source remains authoritative for the summary/action scope, so suppressed members do not count or receive bulk actions.

In the native editor for a managed child, make the ownership clear: functional changes are made in the parent card's settings, while local presentation remains editable. Provide a small explicit Make custom action if the user needs independent functional settings; it removes that instance's management binding while retaining the complete card. Raw YAML edits to managed functional fields are preserved as custom overrides/detachment, never silently overwritten. If the last managed instance of a role is detached, treat its managed role as suppressed. This classification runs only as part of confirmed authoring, not state rendering.

A plain static view was rejected because it freezes options. Rebuilding complete Sections views was rejected because it destroys native customization. Ownership is limited to known generated slots and fields, not a general schema-independent merge engine.

### 4. Handle popup type changes as family transitions

Define family keys from functional shape, not every option: for example Entity Group plus `entity_type`, or a role's popup/inline/disabled display state. For a same-family option change, update functional fields in place. For a different family:

1. Retain the previous family's managed instances, presentation overrides, placement anchors, suppression and explicit selections in non-rendering management metadata.
2. Restore a retained branch for the new family if present, otherwise seed compatible managed slots from the valid explicit card configuration. Do not discover replacement entities.
3. Keep independent custom cards and user sections in the active view unchanged. Reuse compatible anchors and geometry; retain incompatible managed customization in its prior family branch instead of placing invalid controls in the new family.
4. Revalidate current targets, access roles and action objects before restoring a branch. Stored old service targets never override the new valid binding.

The native editor must validate a group family and its compatible explicit selection together; a retained old-family selection must not make the new family impossible to save. When returning to a prior family, offer its retained explicit selection through the normal fields and validate it before saving. A popup-to-inline/disabled change retains the source rather than deleting it. Switching back reuses the source.

Retained branches contain managed layout state, not copies of every unrelated dashboard field or a user-facing history/export feature. Unmanaged custom content stays in the current view and is not overwritten by restoring a family.

### 5. Synchronize only confirmed authoring changes

Add a narrowly scoped popup source coordinator owned by the existing native-root controller. Reuse the established `lovelace_updated` pattern, but do not revive the retired whole-dashboard editor/session. Subscribe only for an authorized connected editable storage host, filter the dashboard path, serialize work per root and dispose the subscription on owner/user/route removal.

After a notification, fetch authoritative configuration and compare it with the root's current native document and active card-dialog dirty state. An edit-mode flag alone is not a dirty draft. Changed functional projections for an already managed source produce a reconciliation plan. Layout-only saves with valid existing ownership, duplicate notifications and the coordinator's own verified save produce no further save. A confirmed explicit detachment or raw functional override can require one ownership-only update; its normalized result must be a no-op on the next notification. Coalesce notifications, then always plan against the latest accepted document; never replay a stale patch.

The follow-up source update is a separately verified native save after HA saves the card; it is not falsely described as atomic with HA's preceding card save. Preserve the native Save/Cancel mechanism. If a draft or conflict prevents synchronization, retain the pending authoring intention without writing and show guidance; Edit popup can reconcile explicitly after the draft is resolved. Do not attach a global Save monkey patch or synthesize native button clicks.

On initial page load, record the accepted baseline and detect mismatches without writing. Old drift is reconciled through explicit Edit popup. Runtime state and registry updates do not enqueue writes. There is no polling, retry loop or startup bulk conversion. This limitation keeps browsing read-only; mismatch feedback must clearly expose the required authoring action.

### 6. Preserve hash ownership and shared sources

Resolve hash-backed popups from their exact saved definition in the invoking view, including existing `popup_view` references and nested external hashes. Reuse the existing source while functional owners are compatible. Capture the actual saved content before management/adoption, not a reconstructed approximation of a customized popup.

If one owner's settings diverge from other owners of the same source, create a preserved managed copy for the uniquely identified changed occurrence and update only that occurrence's effective source reference. Leave the original view, popup definition, hashes and other users intact. A direct `popup_view` on that owner takes precedence over its retained legacy hash; the native composition boundary must use an occurrence-local invocation hash for that managed source so the old external sheet cannot intercept it. Keep nested external ownership where still valid. Preserve the original hash/configuration for a deliberate return to Automatic or a prior source.

Equal functional settings can continue sharing a view and its layout edits. Do not force one shared owner to become authoritative over incompatible others. Ambiguity blocks the transaction. Removing a parent reference never deletes a source view; deletion of unused sources remains normal explicit native authoring.

### 7. Replace export-based preservation with bounded internal transactions

Reuse the existing fresh-read, append/bind and authoritative readback boundary for both creation and reconciliation. Before writing, stage the exact original and candidate dashboard objects in one bounded pending transaction record, keyed by HA origin, user and dashboard. Use browser IndexedDB for interruption survival; retain only unresolved transactions, with no Blob URL, download/import link, notification attachment or user-managed backup archive. If staging fails, abort before writing with an ordinary localized error.

Immediately before the native save, recheck administrator, connection, route/context, clean draft, source fingerprint and current document. Perform one candidate save, then read back. An exact candidate match completes the operation even if acknowledgement failed; an exact original match is a failed write with no content replacement; another result is unresolved and must not be overwritten. After interruption, perform read-only classification first. Clear confirmed/unused pending records; keep unresolved records partitioned to their original user and do not log their contents. No automatic restore or repeated creation write is permitted.

This record is transaction data required to preserve an actual in-flight write, not a replacement backup/export feature. No long-lived archive or unrelated schedule/conversion export changes are included. HA has no global compare-and-swap; two clients can still race after preflight. Fresh checks, exact readback, deterministic planning and conflict preservation reduce that risk without claiming to eliminate it.

### 8. Keep runtime presentation and safety at the shared owner

Continue mounting saved Sections content through `mountPopupView` and using existing popup modal ownership. A matching metadata fingerprint confirms that managed bindings match saved card settings. If the source is stale, do not leave its superseded managed targets/actions usable. Withhold/disable affected managed content and expose the actual local synchronization state: loading only during an active operation, a localized blocking/error message otherwise, and Edit popup as the explicit authoring path. Do not hide service errors or present a failed update as success.

An already open obsolete sheet must close or reconcile safely before its old actions can dispatch; preserve focus and background cleanup. Native previews remain inert. Keep summary scopes derived from compatible active source cards, including hidden cards and excluding deleted ones. Retain capability checks, authoritative state, exactly-once dispatch and strict access slides. The camera work concerns stored configuration/provider forwarding only; playback/transport remains manual-only.

### 9. Align sources, documentation and focused evidence

- Editable sources: `frontend_src/native-card-editor.js`, `card-composition.js`, `native-cards.js`, `native-bootstrap.js` and small popup planner/coordinator modules as needed. Use the frontend/testing skills during implementation.
- Shared sources: `MaraoPopupLayout.js`, `MaraoPopupView.js`, `MaraoNativeContext.js` and the existing popup/card runtime. Regenerate their bundled consumers with `npm run build:editor`; do not hand-edit minified output.
- Validation/conversion: reuse native card/source validation and ordered composition; teach `ordinary-model.js` to preserve the new metadata in future conversions without rewriting historical fixtures or the frozen Python generator.
- UI/localization: remove popup export labels, styles, Blob cleanup and export-based errors from current EN/PT resources. Explain managed functional fields and custom ownership concisely; retain normal popup themes and geometry.
- Documentation: update popup/collection guides, applicable card references, troubleshooting and `native-frontend.md`. Keep older completed change evidence historical; later spec sync must reconcile the superseded immutable-view/export clauses.
- Evidence: extend existing native editor, popup layout, native composition and bootstrap assertions for no-download creation/failure, a saved camera option, a family transition with custom cards, deletion persistence, shared-source isolation, uncertain writes and rejected writes while dirty. Add independently specified expected native documents and a small safe example; no new gallery matrix.

## Risks / Trade-offs

- Ownership errors could overwrite user work -> management requires supported metadata or proven historical provenance; raw/unknown content remains custom and untouched.
- A parent save and source save are separate -> stale source actions are protected until verification; conflicts stay visible and use explicit authoring reconciliation.
- A shared source can have incompatible owners -> fork only the uniquely changed owner and retain original references; reject ambiguity.
- Type changes can invalidate overrides -> retain per-family managed customization, preserve independent custom cards and validate every restored target/action.
- Browser storage can be unavailable -> fail the write before mutation; do not reinstate a download requirement. Internal pending records are bounded, user-partitioned and cleared after confirmed results.
- Event/host compatibility varies -> isolate notification, current-document and dirty-dialog access at the native boundary. Prove the supported installed-host behavior before relying on it; unsupported hosts retain existing data and fail readably rather than bypassing drafts.

## Migration Plan

1. Record the implementation baseline and task snapshot, preserving all current unrelated work. Review current native examples and provenance-backed v0.17.0/v0.20.0/v0.21.1 inputs to establish old descriptor/hash behavior; do not edit those immutable fixtures.
2. Install code that reads both unmarked and version-1 managed sources. Installation and ordinary viewing perform no dashboard migration. Existing Automatic and authored hash destinations retain current behavior.
3. First explicit Edit popup creates metadata for new sources. For older sources, adopt only generated roles that can be proven from retained owner data and supported historical generation. Preserve user edits. Ambiguous raw layouts remain untouched; prepare a separate managed copy only through the explicit authoring operation, retaining the original source and all unclassified content.
4. Synchronize already managed sources after confirmed authoring saves through the bounded internal transaction. Add small expected transformation fixtures for adoption, type transition, shared divergence and interrupted writes. Validate unsupported newer inputs without modification.
5. Regenerate assets and install the final implementation on disposable `192.168.0.28` through direct `prepareFrontend()` unless a concrete fixture/setup change needs full preparation. Reuse current configuration and helper state. A single targeted native edit/save/return check is sufficient if needed for the event boundary; no full, mobile-matrix or camera transport campaign is implied.
6. For unresolved operations, rollback uses the retained exact transaction source only after checking for concurrent edits, with the compatible package and affected data restored together. Completed native edits are user data: clearing a confirmed pending record does not promise permanent undo history. Development checks retain private before/after configuration for their own cleanup; do not roll back unrelated changes or remove user source views as cleanup. Retained family metadata restores managed customization when its type returns, not arbitrary old dashboard versions. Never require the user to download a recovery file. Publication and archiving remain separate requests.
