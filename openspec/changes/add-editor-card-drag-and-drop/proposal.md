# Proposal

## Why

The Marao Dashboard Editor can reorder cards through arrows and basic browser drag events, but dragging is restricted to the existing container and has no empty-section destination. Administrators need a mobile-friendly way to reorder cards and move them between sections without deleting and recreating their configuration.

## What Changes

- Add a visible touch-friendly drag handle to every visually editable card occurrence in the Marao Visual builder, with clear insertion feedback, scrolling while dragging, and destinations before, between and after cards, including empty sections.
- Support reordering within a section and moving between sections of the same page. Treat a flat page as its existing single container. Preserve the moved occurrence, its identity, options and attached sheet references.
- Retain up/down controls and add an explicit Move to section action with a destination position, so the same operations work without dragging.
- Keep moves local until Save & Generate. Cancelled, invalid and unchanged drops leave the document and dirty state unchanged. Dragging must not activate Edit, Delete, Save or entity actions.
- Preserve existing automatic domain layout and fixed-column settings. Explain that exact mixed order is rendered by fixed-column sections; dragging never silently changes a section's layout.
- Add focused model, editor and mobile gesture coverage, localized English/Portuguese controls, safe multi-section examples and usage documentation.

Confirmed scope is the Marao Visual/JSON builder, not Home Assistant's native dashboard editor. Same-page section transfer is the scope assumption; moving across pages, multi-selection, new section/page drag behavior, a new undo system and visually editing raw Lovelace `cards` are non-goals. Raw cards remain editable through JSON and stay in their authored containers.

## Capabilities

### New Capabilities

None. Extend the existing builder capability.

### Modified Capabilities

- `visual-builder`: require touch-friendly card drag-and-drop, same-page section transfer, explicit move alternatives, cancellation and configuration-preserving local draft behavior.

## Impact

Starting commit: `7f4241b0f36620bc82b28fe73373cec77ed54faf` (v0.8.0).

Observed paths: `frontend_src/MaraoDashboardPanel.js` renders shared card rows and binds `_bindDrag`; that handler accepts only a target row in the source container. `frontend_src/editor-model.js` normalizes/serializes containers, preserves historical source shapes and materializes existing local identities after ordering edits. `generator.py` resolves page-wide card identities and sheets, preserving mixed order in fixed grids and grouping automatic layouts by domain.

Implementation is expected in that shared panel/model, `panel.css`, `editor-labels.js`, rebuilt panel assets, existing editor/model/page-generation checks, `tests/verification-map.js`, safe fixtures and documentation. No third-party drag library, runtime card implementation change, management API or new persistence format is proposed.

Affected-card set: every card occurrence exposed by the shared builder row, including catalog/template roles, entity groups, headings, scene collections and page shortcuts; duplicate references to one entity must remain independent. Generated popup-bearing families require identity/reference regression coverage. Runtime sliders, security gestures, navbar and native HA editor are not being redesigned.

Compatibility: retain dashboard format 2, existing array/grouped input compatibility, unknown fields, explicit emptiness, raw/custom content, names, ordering and historical archives. Use existing ID materialization rather than a new migration. Existing Save & Generate validation, exact backup/recovery and history behavior remain the persistence boundary. Scope live preserved-install proof during release preparation only if implementation changes persisted-format, generated ownership or upgrade behavior beyond this existing edit contract.
