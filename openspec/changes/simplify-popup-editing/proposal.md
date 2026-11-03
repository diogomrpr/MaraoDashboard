# Proposal

## Why

Popup layouts currently require an administrator to discover **Create editable layout** during normal dashboard use, while native edit mode closes popups and offers no direct route to their source editor. Every supported configured popup should have an obvious editing entry point in native authoring, and bulk-action buttons should not repeat their labels in an explanatory row below them.

## What Changes

- Provide one localized **Edit popup / Editar popup** action in the native card editor for supported popup owners. Open the existing linked Sections view in Home Assistant's normal editor; on the first explicit edit of automatic content, create and link that source through the same action.
- Remove **Create editable layout / Criar disposição editável** and **Edit layout** tools from normal runtime popups. Viewing, loading, previewing and ordinary card saves remain free of implicit layout creation.
- Resolve unsaved native card/dashboard changes before leaving the editor. Preserve HA's Save/Cancel ownership; never navigate away from or persist an unresolved draft silently.
- Reuse saved same-dashboard `popup_view` ownership and the current exact append-and-bind/recovery safeguards. Existing automatic and linked configurations remain valid without a bulk migration.
- Remove the persistent eligible-count/skipped-target sentence beneath whole-group and section action buttons in the shared renderer, including Open all / Close all and corresponding light/climate toolbars. Retain text on the buttons, semantic scope names, disabling, dispatch safeguards and genuine reported errors.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `native-dashboard-editing`: directly editing a configured popup from native authoring, including first-edit source creation and draft preservation.
- `navigation-popups`: runtime sheets contain product controls without authoring tools; source-editor navigation preserves modal cleanup and the owning dashboard route.
- `card-behaviors`: concise shared bulk-action toolbars retain safe scope/dispatch and errors without the repeated explanatory row.

## Impact

Planning baseline: `e613bf85422a9b749e58c0618f7f9c5327c6e2dc`, clean worktree before this change, 2026-11-02. This request authorizes planning only; implementation tasks remain unchecked.

Observed implementation: `frontend_src/native-card-editor.js::_renderPopupSelector` selects Automatic or an existing view but has no edit action. `MaraoPopupView.js::bindPopupLayoutControls` exposes authoring only outside preview/edit mode; `savePopupLayout` currently refuses all native edit contexts. `MaraoGroupDetails.js::updateGroupScope` generates the repeated eligible/skipped sentence independently of its error element.

Affected configured popup families follow the existing shared `popupRole` contract: Entity Group, Scene Collection, Climate, Media, Camera, Energy Period, Graph history, Security, Access and Floor Plan where that configuration actually owns a popup. Explicit raw popup cards remain editable through their owning native configuration/source. External hashes retain authored ownership; do not create a replacement for an external destination. Transient light pickers, history drill-ins and error sheets are not new persistent layouts. Bulk-toolbar consumers are automatic groups and linked native `marao-summary-actions` cards for lights, covers and climate; batteries remain informational.

The implementation reaches native editor/composition/context, shared popup layout helpers/runtime, shared group details, EN/PT labels, existing targeted tests, current popup/collection documentation and affected safe examples. Use existing JavaScript custom elements and HA layout ownership; no new dependency, backend change or alternative editor.

Compatibility: preserve omitted `popup_view`, valid existing links, retained automatic members/options/sections/filter, unknown fields, native sizing/visibility, raw cards, deliberate emptiness and unrelated dashboard data. First edit adds a source view and its invoking reference only after explicit authoring intent and fresh preservation checks. No source-format, native-envelope, compiler-contract or config-entry version change is intended. Exact recovery and package-plus-data rollback remain required for that write path.

This supersedes the runtime creation/edit entry points in the completed but unarchived `use-ha-managed-popup-layouts` change and the always-visible eligible/excluded explanations in `add-summary-section-controls`. Their completed evidence remains historical; their native ownership and action-safety contracts continue to apply. New requirements in this change express the replacement experience without rewriting those records.

Non-goals: inline native editing inside the live popup, automatic conversion on ordinary opening or installation, global popup migrations, a new editor, new bulk actions, removal of service errors or action guards, camera transport work, comprehensive testing, publication, or implementation in this planning request.
