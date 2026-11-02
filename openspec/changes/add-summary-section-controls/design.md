# Design

## Context

See [proposal.md](proposal.md) for scope and the planning baseline. Current `frontend_src/native-card-editor.js::_renderGroup` edits a flat `entities` list and `popup_filter`. `editor-model.js` validates membership and supplies schemas. `card-composition.js::groupPopups` emits flat member cards plus `entity_group` metadata; `MaraoPopupCard` in the shipped `MaraoCards.js` reconciles children by entity ID. Native automatic sheets already have occurrence-local ownership and inert previews.

The completed `use-home-assistant-dashboard-editor` change supersedes the historical native-authoring retirement notice and Python/builder descriptions in older baseline documents. This work extends current ordinary HA cards; it does not create or regenerate HA views or restore the retired whole-dashboard builder.

## Goals / Non-Goals

Goals: one shared member-section model and action resolver for all summary hosts, additive persistence and scope-correct explicit dispatch. Non-goals are listed in the proposal; section headings are structural UI, not equal-height entity cards or independent HA layout sections.

## Decisions

### Preserve one membership list

Add optional `summary_sections: [{id, name, entities: [entity_id, ...]}]` to the Entity Group descriptor/native config. `entities` remains the authoritative ordered list of member descriptors and options. Section arrays are assignment references; within-section presentation follows the master member order, section order follows `summary_sections`. IDs use the existing safe group-ID syntax and are unique within the card. Empty sections persist. No sections or `[]` yields the existing flat list. With sections present, unassigned members appear in localized Other, which gets the same scoped actions. Reject duplicate assignments and nonmember references; a configured entity missing from HA remains valid saved data.

This avoids duplicating member options or introducing nested groups. Deleting a section releases assignments; deleting a member removes its references in the same draft. Renaming/reordering changes neither identities nor membership. Do not silently normalize invalid YAML into a valid different selection.

### Compose once, reconcile by stable identity

Pass section metadata through descriptor/native conversion, validation/schema, `card-composition.js` and retained JS compilation paths. Extend the shared group sheet with a top toolbar, followed by section heading/toolbar/member hosts. Retain keyed children during state/filter updates; only move existing nodes when placement changes. Section headings/toolbars remain when Active only yields no rows, so Turn on all is available even when all lights are off. Preserve focus containment/restoration, internal scrolling, navbar clearance and occurrence-local automatic sheets. Explicit external popup references retain authored ownership; shared popup configurations carrying group metadata use the same renderer.

Use existing semantic buttons, press feedback, error presentation, Montserrat and theme tokens. Allow wrapping at 320px and enlarged text; keep controls visibly at least 48px. Put new EN/PT runtime copy in the shared runtime labels and authoring copy in the existing editor labels. Do not add a competing offline banner or optimistic physical-state model.

### Resolve explicit scope independently of visible rows

Build the scope from complete configured membership or its section references, deduplicate, and then evaluate live connection, state, action capabilities and existing access classification. Do not use currently rendered children, HA area/floor targets, all-domain targets, arbitrary member action overrides or discovered entities. Show eligible counts and readable excluded-target details beside the initiating toolbar before activation. Re-evaluate on activation to exclude newly unavailable targets. Empty eligibility disables that control. This partial-action policy is specific to summary toolbars and does not change the room-card All off contract.

Lights use `light.turn_on`/`light.turn_off`; covers use `cover.open_cover`/`cover.close_cover` for members advertising the corresponding capability. Open all excludes every access-classified member, including explicit access presentation, not just obvious garage device classes. Explain their individual-slide requirement; preserve strict slides and safe close controls. Close all includes access covers only when safe closing is supported. Never convert a bulk tap into access opening.

Climate uses native power actions where supported by the existing per-member capability rules. For a single directly startable mode, reuse the existing explicit mode request path; multi-mode devices without a supported native power-on path are excluded rather than choosing a mode. Reuse shared climate pending/reconciliation for requests; targets and measurements remain unchanged. Battery groups have sections without actions.

Batch compatible targets by explicit domain/service/data. Issue each target/action pair once for one completed activation; one UI interaction may need several service calls for heterogeneous climate capabilities. Guard duplicate submission while that scope is dispatching, acknowledge immediately, and preserve authoritative HA observations. Retain reported failures at their initiating scope, use existing notification/error conventions, and show partial accepted/failed batches when known. No automatic retry or compensating rollback of physical actions. User retries are explicit new interactions. HA service acceptance is not physical success proof.

### Keep persistence additive and authoring native

Extend `_renderGroup` with section management and member assignment controls using the existing native editor/forms. Preserve unknown section/member/card fields and explicit emptiness through native descriptor adapters, visual changes, YAML and conversion. Scope metadata must survive the shared JS compiler; frozen Python generation is not a second implementation target. Update the shipped catalog only where needed to expose settings, avoiding generated-only fixes.

Review supported released flat native cards, converted legacy overview groups and format-2 groups. Expected transformation: absent metadata stays absent, `[]` stays empty, member descriptors and unknown fields stay byte-equivalent where not deliberately edited; runtime-only normalization is read-only. New settings require no migration of existing data and no source/envelope/config-entry version bump. Retain separate compiler-contract versioning; change it only if an actual incompatible output boundary is demonstrated before implementation.

## Risks / Trade-offs

- Hidden inactive members might surprise users → labels/counts describe complete configured scope, independent of filtering.
- Partial capability/availability means All cannot reach every member → explain excluded targets before dispatch and show reported failures without claiming success.
- Access devices can be mixed into cover groups → reuse shared access classification at dispatch; no tap-based access-opening target can escape it.
- Section reconciliation could remount a dragged control or lose focus → retain keyed children and existing cancellation/focus rules when rows become ineligible.
- New fields could be lost in a native adapter → targeted round-trip expectations cover native config, shared composition and converted groups.

## Migration Plan

No automatic persisted rewrite is planned. During implementation capture the dirty-state snapshot, then prove additive round trips with independently specified expected data for supported historical/current groups. Do not edit immutable historical fixtures; add current expectations. Native Save/Cancel owns draft persistence, with validation before save and existing error handling retaining drafts. No backend/file migration or new write transaction is introduced.

Before disposable installation/export changes, preserve exact current dashboard data and matching package through the existing preparation/recovery facilities. Stage/preflight affected changes and leave unrelated HA settings/helper state intact. If installation or save fails, retain drafts/backups, report recovery failures and restore matching package plus saved data when rollback is required; never downgrade package assets while leaving incompatible new metadata in place.

## Verification and documentation

Implementation uses the smallest relevant existing tests: `tests/frontend/native-card-editor.test.js` for assignment and lossless edits, `native-cards.test.js` for composition/ownership/inert previews, `marao-card-visibility.test.js` or its existing runtime harness for filter-independent dispatch/access exclusions/errors, and the existing model/conversion tests for additive round trips. Add only concrete missing behavioral assertions; run serially with reviewed `test:affected` scope, not every suite mentioned here.

Update [Entity Group documentation](../../../docs/docs/usage/cards/md_entity_group_card.md), native card configuration guidance and safe `ha-test/` examples with one two-floor lighting summary and one mixed-capability cover summary, reusing helpers. During implementation install the final applicable assets on disposable `192.168.0.28` using direct `prepareFrontend()` when compatible, or `ha:sync` only when required. Leave manual checks for toolbar placement/wrapping, section order, per-section effects and explicit cover actions. No browser campaign, camera checks, real-device actuation, publication or deployment occurs for this planning request.
