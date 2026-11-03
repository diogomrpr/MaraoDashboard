# Proposal

## Why

Editing a popup currently downloads recovery JSON, and copying an automatic popup into a native view disconnects its generated controls from later card settings. Users need editable layouts without downloads, while Marao continues to manage popup types, targets and behavior without overwriting their layout or custom cards.

## What Changes

- Remove the popup recovery download feature completely: automatic downloads, download links, export prompts and download-based error guidance. Retain internal write validation, preservation and result verification without a replacement export workflow.
- Introduce versioned management metadata for editable popup Sections views. Card settings own generated control types, targets and functional options; native views own positioning, sizes, sections, custom cards and presentation overrides.
- Reconcile managed controls after confirmed card-setting saves, including popup type changes. Preserve deliberate deletions, empty sections, compatible layout edits and unrelated custom content. Keep incompatible managed-layout customizations internally so returning to the prior popup type restores them.
- Keep Edit popup as the single authoring entry point. Automatic popups remain dynamic until their first explicit layout edit, which creates a managed source; later edits reuse it. All currently supported configured popup families use the same model. Universal up-front view creation is not required to provide editable popups and would add unnecessary dashboard writes.
- Adopt existing automatic, hash-backed and linked configurations conservatively, preserving exact content and shared references. Never infer management of arbitrary raw cards. Separate a changed owner's managed source when updating a shared view would change other cards' behavior.
- Preserve HA Save/Cancel and existing modal/action safeguards. Runtime viewing, state updates, previews and registry changes do not persist layouts or refill deleted content.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `native-dashboard-editing`: download-free popup authoring, explicit functional/layout ownership, managed-view compatibility, settings synchronization and preservation across type changes.
- `navigation-popups`: rendering managed popup sources safely during synchronization while retaining read-only viewing, native source editing and modal navigation.

## Impact

Observed baseline, 2026-11-03: commit `e613bf85422a9b749e58c0618f7f9c5327c6e2dc` plus the current uncommitted editor/popup fixes. `native-card-editor.js::_editPopup` creates a Blob and programmatically clicks its recovery link; `savePopupLayout` requires that callback. `seedPopupView` creates standalone native cards without a management baseline. `composeNativeCard` and `mountPopupView` subsequently use the saved view; they do not reconcile later parent options into it. `native-bootstrap.js` already owns the native host lifecycle, and `native-session.js` demonstrates the existing `lovelace_updated` subscription pattern.

Affected configured families: Entity Group, Scene Collection, Climate, Media, Camera, Energy Period, Graph history, Security, Access and Floor Plan, where their configuration actually owns a popup. Their summary controls, member editors, native view authoring and retained hash-backed popup definitions share the change. Transient colour pickers, confirmations, error sheets and history drill-ins remain built-in controls.

Implementation reaches `frontend_src/native-card-editor.js`, `card-composition.js`, `native-bootstrap.js`, `native-cards.js`, the shared `MaraoPopupLayout.js` / `MaraoPopupView.js` / popup runtime boundary, current EN/PT labels, focused Node checks, safe examples and popup documentation. Reuse the current renderer, composition and native HA APIs; no external cards, new framework or Python backend is proposed. The frozen Python generator and historical fixtures remain unchanged.

Compatibility: existing native card types, `popup_view`, popup hashes and source formats remain readable. Add a separately versioned managed-view record; do not repurpose package, source or root-settings versions. Older unmarked layouts require provenance-aware adoption or an explicit preserved copy, not wholesale regeneration. Unsupported newer records remain untouched. Pending internal transactions retain exact source/proposed data without downloading files. Existing shared views and custom content cannot be silently retargeted or deleted.

This change supersedes the recovery-export requirement and immutable-snapshot behavior in `simplify-popup-editing` and the earlier `use-ha-managed-popup-layouts` change. Their completed evidence stays historical. It retains their source navigation, draft preservation, safe append/bind behavior and runtime modal contracts.

Non-goals: pre-creating every possible popup on installation or page load, rewriting arbitrary user views, a general dashboard synchronization framework, new backup/export UI, inline HA editing inside live sheets, camera transport work, comprehensive testing, publication or implementation during this proposal request.
