# Design

## Context

See [proposal.md](proposal.md) for motivation and affected consumers. The change crosses native card authoring, guarded dashboard persistence and shared popup rendering, so a design is warranted.

The current `native-card-editor.js` receives either a dashboard document or wrapped context through `lovelace`, emits complete `config-changed` drafts, and offers a source selector. A runtime root is resolved separately by `MaraoNativeContext.js`. `MaraoPopupView.js` mounts linked content through HA's registered `hui-view` using a viewing-only facade; its runtime toolbar calls `savePopupLayout`, closes the popup, navigates and enters native editing. `MaraoCards.js` closes sheets and blocks physical actions in edit/preview mode. These protections must remain intact.

`MaraoPopupLayout.js` already provides source resolution, seeding, exact occurrence matching, append-and-bind preservation, fresh reads and recovery exports. Its current `!editMode` save guard is specific to the old runtime entry point; merely deleting that guard would not establish draft safety in a native card dialog.

`MaraoGroupDetails.js` owns both automatic group toolbars and the controls used by native `marao-summary-actions`. It creates a routine `info` element separately from the service `error` element. Removing the routine row at this owner reaches every affected toolbar without altering `summaryAction`.

The older completed popup/summary changes contain requirements not yet synchronized into baseline specs. This change adds the replacement authoring/presentation contract and explicitly supersedes their runtime-toolbar and routine-explanation clauses. Do not rewrite completed tasks or historical evidence. Reconcile those superseded clauses when specifications are eventually synchronized; archiving is outside this request.

## Goals / Non-Goals

**Goals:** One native authoring entry point for a popup, reuse of the existing source-view model, preservation of drafts and saved data, and removal of the shared repeated toolbar sentence.

**Non-Goals:** Embedding HA's editor in a live modal, weakening inert-preview protection, importing/patching HA classes, adding a second persistence format, or touching camera playback/transport. Explicit external hashes and transient drill-in sheets retain their current ownership.

## Decisions

### 1. Navigate to the native source editor

Add **Edit popup / Editar popup** beside the existing Popup layout controls in `frontend_src/native-card-editor.js`, using the same supported-owner/source rules as composition. Keep the source selector: linking an existing view and deliberately returning to Automatic remain supported. An omitted reference changes storage strategy only; it no longer makes the user discover an enable-editing step.

Resolve the real dashboard host separately from the editor's possibly document-only `lovelace` context. Keep this in the existing native context boundary and use the root's ordinary navigation/edit ownership. Resolve a valid existing source before closing the card dialog. Unsupported, missing or ambiguous contexts show a localized error and leave the editor intact.

Hash-backed summary cards use the same action. Resolve the saved `custom:marao-popup-card` with that hash only within the invoking view. Its existing `popup_view` is reused; otherwise seed from that exact saved popup and bind the source on the popup definition. Retain the invoking hash and original popup fields. The popup remains the external owner, including when shared by other cards; no runtime composition or persisted-format migration is needed. The direct layout selector remains for cards that own their reference, while hash-backed cards expose the action for their saved popup source.

Use normal native dialog dismissal/navigation through the supported host boundary after preflight; do not remove native DOM nodes, import upstream classes or synthesize clicks on HA's private shadow DOM. Keep any navigation listener/request state scoped to this editor's lifecycle so a cancelled or disconnected editor cannot navigate later. If the native dialog cannot be safely handed off on the supported host, fail readably rather than bypassing its ownership.

Alternative: native editing directly inside the popup would need a writable facade, nested editor event ownership and new modal/focus behavior. The existing source-view editor already supplies the requested sizing and placement, so that alternative adds unnecessary work.

### 2. Require a saved card before navigation or creation

The smallest safe draft policy is save-first guidance. Compare the current complete card draft with the saved invoking occurrence and compare the active dashboard document with a fresh authoritative baseline. For a new card, dirty card, unresolved dashboard draft or ambiguous match, keep the dialog and draft intact and show **Save this card/dashboard before editing its popup**, localized to the relevant condition. Do not auto-save or discard changes and do not create a pending source in the background. After the user uses HA Save, reopening the card editor exposes the same Edit popup action against that saved occurrence.

Native edit mode itself is not an unsaved draft: an unchanged saved card must be editable while the dashboard's edit toolbar is active. Keep authoring eligibility separate from the runtime `preview`/`inert` guards that stop device operations. A card preview does not independently gain the ability to mutate the dashboard.

Alternative: automatically saving a card dialog and resuming navigation would couple to HA's draft internals and blur Save/Cancel ownership. Save-first guidance preserves the current native contract without introducing a second save flow.

### 3. Reuse guarded creation only on the first explicit edit

For a clean saved owner without `popup_view`, compose its configured automatic content using the existing shared composition path and pass it to the current seed/append helpers. Seed from configured membership, not just currently visible active rows. Retain member options, explicit empty groups/sections, filtering, raw cards and sizing/visibility. Append one dedicated same-dashboard Sections subview with its originating return path and patch only the exact invoking card's reference in one native save.

Refactor `savePopupLayout` only as needed to accept a validated authoring context while the root is in edit mode. Preserve administrator, connection, storage-mode, source identity, route, stale-read and duplicate-occurrence checks. The predicate for creation must recheck both editor lifecycle/draft identity and the root's current saved document immediately before writing. Avoid a second save implementation in the editor. If the editor context changes during async work, abort before writing; do not navigate on stale completion.

Retain the exact original/proposed recovery export before writes. Confirm the saved result using authoritative configuration; after a failed acknowledgement, read back without retrying the write. An uncertain outcome keeps recovery and blocks another creation until reconciliation. Record the confirmed source path so a delayed host refresh cannot append a duplicate. Existing linked sources require no creation save and must never be refilled.

Alternative: automatically materializing all views on load, ordinary card save or installation would rewrite existing dashboards, create unused views and introduce a migration. First explicit edit gives the same editable experience without those writes.

### 4. Remove runtime authoring at its shared owner

Remove `bindPopupLayoutControls` usage from the shared popup runtime and remove its obsolete toolbar implementation/labels where no longer used. Retain `mountPopupView`, reusable source/preservation helpers and native summary actions. Ordinary open/close/state updates remain read-only, including for administrators.

Keep `MaraoCards.js` native editing/preview closure, focus restoration, inert-background release, internal scrolling and column-width behavior. A source-editor handoff must close any active sheet through its owner before navigation. Newly seeded subviews retain the originating `back_path`; existing shared views keep their saved return settings, using normal native/browser back navigation to return to the origin without a new dashboard write. Reopen the invoking popup to see HA's saved content; no automatic reopen or extra modal is required.

### 5. Delete the routine toolbar row, retain errors and safety

Remove the routine `info` node and its eligible/skipped sentence from `createGroupScope` / `updateGroupScope`. Remove any empty spacing attributable to that node; keep the service-error element and its existing reporting lifecycle. Do not use CSS to hide the entire feedback area or change the action resolver merely to remove text.

Keep whole/section scope, visible labels on the buttons, semantic action/target names, minimum target sizes, haptics, busy disabling, no-eligible disabling, capability/connection checks and the explicit access-opening exclusions. Battery groups still have no bulk actions. Individual member availability/error presentation remains unchanged. No replacement diagnostic widget or hidden tooltip is added.

This deliberately replaces the earlier always-visible pre-action eligible/excluded explanation, including routine skipped-target details. It does not suppress actual service failures. Reusing the shared owner is preferred to a cover-only CSS patch because the same repeated row is generated for lights and climate and in linked native views.

### 6. Keep sources, documentation and checks aligned

- Authoring: `frontend_src/native-card-editor.js`, existing composition/validation and native context helpers. Preserve the complete `config-changed` contract; do not restore the retired whole-dashboard builder or change the frozen Python generator.
- Runtime: `MaraoPopupView.js`, `MaraoPopupLayout.js`, `MaraoCards.js`, `MaraoGroupDetails.js`. Reuse theme tokens/semantic controls; no new theme system.
- Localization: current editor labels and popup labels for Edit popup, save-first guidance, source/context failures and recovery. Retain EN/PT coverage and remove only unused runtime authoring copy.
- Documentation: `docs/src/content/docs/features/popups.md`, `features/collections.md`, `cards/entity-group.mdx`, relevant troubleshooting text and `docs/docs/development/native-frontend.md`; describe source editing and concise toolbars at their current paths.
- Examples: review the existing safe automatic/linked examples under `ha-test/` and the documentation playground. Adjust only examples affected by this behavior, reusing helpers and the one `/marao-dashboard` dashboard; do not expand the gallery matrix.
- Checks: extend `tests/frontend/popup-layout.test.js` for first-edit preservation/idempotence/stale saves and `native-card-editor.test.js` for saved-versus-draft authoring/navigation. Reuse `collections.test.js` assertions for concrete access/eligibility invariants when affected; use review for the trivial row deletion. Adapt existing mocks that carried the removed `info` node.

Select the smallest serial checks for changed authoring and the concrete data-loss risk: leaving a dirty native dialog or replacing newer dashboard data. A single targeted installed-host visit is appropriate only if the native dialog/navigation boundary cannot be established by those assertions. Do not introduce browser tooling, camera checks or a layout/theme matrix. User manual checks cover the normal edit/return/reopen experience and toolbar appearance.

## Risks / Trade-offs

- Native card editors receive different context shapes, and an editor dialog can outlive its host: resolve document and runtime host independently, validate before navigation and invalidate async work on context changes.
- Creating a source from an unresolved draft could lose data: use the explicit save-first policy and an unambiguous confirmed occurrence; never replace saved data with an editor's partial configuration.
- HA lacks compare-and-swap for native dashboard saves: retain fresh checks, a single append-and-bind operation, exact recovery and honest uncertain-save handling. These reduce but do not eliminate simultaneous-writer races.
- Removing routine skipped-target details reduces pre-action detail: keep disabling, scope semantics, individual problem states and strict access exclusions; never describe an accepted bulk call as proof every physical device moved.
- Linked source views can be shared by multiple owners: edit the existing source without cloning it and preserve the current reference selection behavior.

## Migration Plan

No automatic migration or version bump is intended. Existing automatic, linked and externally owned configurations retain their meaning on install/reload; the new entry point changes when the existing additive source write is requested. Review supported native fixtures, including the frozen v0.17.0/v0.20.0/v0.21.1 source expectations and current automatic/linked descriptors, without changing their provenance. Add independent expected append-and-bind data in the existing focused tests rather than deriving expectations from the candidate helper.

At implementation start record the current commit/dirty snapshot and task scope. Build source-owned assets, then install final applicable frontend changes once using direct `prepareFrontend()` on disposable `192.168.0.28`, preserving its dashboard and safe helper state. No dashboard seeding or reset is needed merely to install this change. Installation asset/readiness checks confirm deployment; use full `ha:sync` only if an actual fixture/setup change requires it.

Existing creation recovery retains exact original/proposed dashboard data; native frontend installation retains matching package recovery. Any rollback after a source write must restore compatible package and affected dashboard data together after checking for unrelated concurrent edits. Never delete source views on unlink/card deletion or downgrade assets alone to discard an authored layout. Keep recovery data private. Publication and archiving remain separate requests.
