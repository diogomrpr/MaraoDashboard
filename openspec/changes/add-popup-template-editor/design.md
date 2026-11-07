# Design

## Context

See `proposal.md` for the user outcome. Planning baseline: commit `fa71c7a33798b32480eab41bfad6f038e8b1ebf9`. The latest approved implementation uses a native Sections canvas and native editing dialogs, a full native picker with Marao suggestions first, built-in templates, one outer persistence boundary and preserved customizations. Earlier inline-inspector evidence remains historical.

`native-card-editor.js` currently offers Automatic, existing Sections views and Edit popup. Edit popup requires a saved, clean occurrence; `popup-management.js` seeds/reconciles a separate view, and `popup-coordinator.js` follows parent saves with another verified source save. `MaraoPopupCard` already accepts child cards; `MaraoPopupView.js` mounts linked native views. `MaraoPopupLayout.js` declares ten popup roles and converts generated cards into Sections layouts. Group actions currently resolve membership through saved views, so simply adding a child-list form would leave scope and ownership inconsistent.

## Goals / Non-Goals

**Goals:** Keep editable content inside the card's own config; reuse existing automatic composition as template seeds; share native child editing and the existing modal renderer; isolate authored content from legacy reconciliation.

**Non-Goals:** A second whole-dashboard editor, a general template engine, personal template storage, arbitrary new popup families, recursive popup authoring UI, automatic retargeting of customized children or migration of all existing views. Existing supported nested native containers remain losslessly editable/preserved.

## Decisions

### 1. Add a versioned embedded content contract

Use an optional native card field shaped as:

```yaml
popup_content:
  version: 1
  mode: custom
  template: climate
  layout:
    type: sections
    max_columns: 1
    sections: []
```

`mode` is `custom` or `automatic`; `layout` retains the customized snapshot even while Automatic is selected. `template` is optional origin information, never a regeneration instruction. Template IDs are stable; removed/renamed built-ins cannot invalidate already saved layouts. Explicit empty sections remain empty. Version is independent of package, source and `marao_popup` management versions.

In custom mode, embedded content takes precedence for this occurrence over `popup_view` and legacy hashes. Keep legacy fields untouched for return to Automatic, where the previous resolution chain resumes. Reject malformed/unsupported versions visibly, including during editor round trips, without dispatching a retained legacy action as fallback. Preserve unknown keys and opaque native child configurations. Validate at the public native-card boundary, descriptor conversion, composition and runtime source resolution; ordinary conversion must carry this field without flattening it into historical generator data.

This avoids saving child content in another hidden view or inventing a template database. No package downgrade is claimed safe with new config: rollback restores the matching package and pre-change dashboard together.

### 2. Seed from the existing automatic families

Use the existing built-in registry and seed conversion. Filter by canonical parent family and, for Entity Groups, entity kind. Offer that family and Empty in one native dropdown; derive entity and image bindings from the parent settings. Missing required inputs retain the draft with a readable error. No separate entity-binding form, chooser, preview/apply confirmation or customization/mode buttons remain.

The canvas is always in native edit mode. Opening a supported automatic or linked popup prepares an independent in-memory copy without changing parent configuration. Only a real native edit materializes it into `popup_content`; a no-op save does not convert it. Explicit template selection creates a snapshot immediately, with outer Save/Cancel owning persistence.

Compute the dropdown value from canonical layout and presentation equality against the applicable built-in candidates, excluding origin metadata and object-key order. Show Custom only for a genuine content difference, including order, dimensions, visibility, opaque options or presentation. Exact restoration recovers the template name; opening/no-op saving a child does not mark it Custom. Cache candidates by parent configuration and language so ordinary state updates do not change their identity. Never regenerate saved custom children after parent or template changes.

### 3. Extend the native card editor, not the retired builder

Add a Popup settings toggle section alongside the parent settings, closed by default and mounted lazily on expansion. Use only the filtered native Template dropdown and editable canvas; retain saved Automatic/Custom and presentation data without exposing duplicate controls. Reuse `hui-view` and its native menus, Sections/grid/sortable components, picker and complete card/section dialogs through one bounded compatibility adapter. Allow native layout callbacks to update the synthetic popup document. Route `show-dialog` into locally owned native dialog instances so HA's global dialog manager cannot reuse the outer card dialog. Contain child configuration, editor-save and raw closed events. Supply native context subscriptions and real read-only dashboard choices to native card editors while preserving draft-only save callbacks. Suggest Marao entries using the native picker's existing card elements; retain its full catalog, search and By entity/By card tabs. Remove the custom child/section inspector, action toolbar, picker and section-component loader.

Use outer Save/Cancel as the sole persistence boundary, including unsaved parents. Child Save accepts its changes into the temporary popup draft; child Cancel discards them. The synthetic document contains only the popup view. Replace native full-document save callbacks with the local owner; wrap native child callbacks with layout/lifecycle guards. Restrict native destination selection to that draft and prevent nested Marao editors from starting legacy source-view transactions. Native validation and modal focus handling own invalid child edits; no invalid child is accepted into the parent. Dispose owned dialogs, imports, observers and context subscriptions on parent closure. Preserve active controls on equivalent dashboard context echoes. Native components own move/duplicate/delete, tabs, YAML and sizing; do not persist editor IDs or recreate those controls.

### 4. Resolve embedded layouts at the shared popup owner

Extend shared popup-source resolution and `mountPopupView` to accept an embedded Sections layout as well as a saved source. Reuse HA's registered view host with an occurrence-local, read-only in-memory facade; any synthetic view index is transient, cannot escape into navigation and is never persisted. Real dashboard context remains available for existing authored external references. Do not create a hidden storage view merely to reuse the renderer.

Pass an occurrence-local content context to collection summaries and action cards. For embedded content, derive all/section scopes from saved child configurations in that context rather than a stored `popup_view` lookup. Reuse compatible-member extraction and action safety. Strip or translate only known generated view-bound bindings during template materialization; preserve unknown data. Context must remain tied to the original occurrence and cannot accidentally resolve another synthetic source. Reuse the native card host for raw HA cards rather than rewriting their types.

Retain slide-up presentation, title/close geometry, inert background, focus restoration, internal scroll and history/detail drill-ins. Continue lazy child loading, authoritative `hass` propagation, lifecycle cleanup and existing action checks. Per-occurrence invocation identity must prevent a retained external hash from intercepting embedded content.

### 5. Separate customized ownership from managed sources

Once embedded custom mode is active, child entities, commands, filters and other functional fields are independently authored. Parent changes do not reconcile them. The editor explains this next to customized content; users edit targets on the child or explicitly reapply a template. In particular, changing the parent entity must not silently retarget a customized action.

Teach managed-owner discovery/coordinator to exclude active embedded occurrences, including effective hash ownership, without breaking other legacy owners. Existing managed version-1 source behavior and family retention continue for legacy consumers. Avoid treating copied children as still managed by a former parent. Summary scope follows actual embedded children, not stale original parent membership. Automatic mode retains and restores the existing source chain without destroying the embedded snapshot.

### 6. Copy legacy content only through an explicit draft operation

Resolve the exact existing automatic, hash-backed or linked source using current identity and ambiguity guards. Copy supported native Sections layout fields and child configuration losslessly, including geometry, empty sections, visibility and opaque options. Convert only recognized management markers and view-bound summary scopes into independent embedded equivalents. Do not copy management ownership into an active synchronization contract. Preserve unrecognized content and external references unchanged; if behavior cannot be represented, refuse the copy and retain the existing linked editor.

Record the source identity/fingerprint while preparing the draft and recheck before accepting the copy into the parent edit. Do not overwrite a newer source or remove it; native HA remains responsible for ordinary card persistence. No separate source save, custom dashboard write or new write journal is needed for copying: only the parent draft changes. Existing legacy Edit popup writes keep their current transaction journal, preflight/readback and conflict recovery. Shared owners remain untouched.

Existing custom content is edited directly. Supported automatic, hash-backed and linked sources mount as editable draft-only copies without a configuration event on opening. On the first actual native edit, recheck source identity and apply the snapshot only to the current parent draft. Preserve unknown fields and original sources. Unsupported inputs remain unchanged with an inline error and explicit legacy-source access under advanced options. The duplicate Title, Columns, Height and Maximum height fields stay absent.

### 7. Align the complete native path

Editable owners: `native-card-editor.js`, native catalog registration/validation, `card-composition.js`, a small template/child-editor module as needed, `popup-management.js` and `popup-coordinator.js`. Shared owners: `MaraoPopupLayout.js`, `MaraoPopupManaged.js`, `MaraoPopupView.js`, `MaraoCards.js` and group scope helpers. Retained ordinary conversion must preserve the additive field; the frozen Python generator and archived fixtures do not change. Regenerate shipped editor assets through `npm run build:editor`.

Update EN/PT resources, popup and collection guides, applicable card examples, native architecture and capability source/check mappings. Reuse safe disposable gallery examples under `/marao-dashboard`; no shipped fake entities or separate dashboard.

## Risks / Trade-offs

- HA nested editor/view compatibility -> isolate native boundaries and provide readable YAML fallback; never silently discard a layout to make it editable.
- Persisted child data or legacy sharing could be lost -> clone drafts, preserve source references, compare independent expected documents, and fail closed on ambiguous copies or newer versions.
- Parent and child targets can intentionally differ -> make independent ownership visible; preserve safety checks and do not silently rebind children.
- Native parent save has HA's ordinary concurrency limits -> reuse that lifecycle and do not claim a new atomic dashboard-wide transaction. Legacy source writes retain their stronger existing verification.
- Preserving Sections layouts adds more structure than a flat `cards` array -> reuse one native renderer and preserve existing customization rather than flattening unsupported layout fields.

## Migration Plan

1. During implementation capture the then-current commit/dirty snapshot and reviewed consumers. Use supported saved native/released fixtures and independently authored expected documents for absence, empty content, unknown fields, legacy shared sources and version errors; never rewrite historical fixture inputs.
2. Add backward-compatible readers and validation first, then template/editor authoring. Opening dashboards or editors performs no migration or write. User-selected embedded content is the only new persisted contract.
3. Before any test authoring save, retain the exact disposable dashboard and affected owned state privately. Preflight source identity; stage draft replacements locally; let HA perform its normal save. Keep backups through failed/interrupted checks. Recovery must verify current data before restoring and preserve unrelated concurrent edits; uncertain results are reported without blind retries.
4. Run the smallest relevant serial unit checks for draft isolation, ownership, scope and data preservation. One installed-host edit/save/cancel check is justified for the native nested-editor boundary if unit evidence cannot establish it. Camera coverage remains configuration-only; playback and transport stay manual.
5. After final edits/build, install once on disposable `192.168.0.28` using direct `prepareFrontend()` when compatible. Served-asset/readiness checks establish installation. Leave assets installed; user checks template choice, customization and reopen behavior. No full/matrix testing or publication is implied.
6. If rollback is necessary, restore matching package and exact backed-up dashboard together, only after checking for concurrent changes. Never delete original shared views or archived history as cleanup. Planning itself requires no deployment.
