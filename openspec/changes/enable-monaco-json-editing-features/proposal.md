# Proposal

## Why

Marao already embeds Monaco, but its JSON interface hides folding arrows and leaves search and other editing tools difficult to discover. Administrators editing one dashboard document need visible code-editing tools and useful configuration suggestions without changing editors or losing their draft.

## What Changes

- Keep the existing bundled Monaco editor and its single JSON document; expose Search/Replace with match counts and navigation through Monaco's native widget and keyboard shortcuts.
- Explicitly retain visible line numbers and add always-visible left-gutter arrows for expandable objects/arrays, including nested regions, using Monaco's native icons and commands.
- Improve context-aware suggestions for Marao card types, supported basic/advanced fields, entity IDs and current page paths using existing catalog/schema metadata. Suggestions assist editing without overwriting unknown/custom fields or inserting anything automatically.
- Use Monaco's native diagnostics, formatting, undo/redo and editor UI within the HA panel. No browser fullscreen permission or separate VS Code application is needed.
- Preserve cursor/selection, scroll position, folds and JSON undo history when switching tabs without a document change. Existing explicit Save & Generate, invalid-JSON protection, Discard and history behavior remain authoritative.
- Keep JSON-only features deferred until the JSON tab opens and served locally with existing versioned assets. Add English/Portuguese controls and focused mobile interaction/layout coverage.

Confirmed choice: continue with Monaco. Scope is the Marao Dashboard Editor's JSON tab. Non-goals: CodeMirror migration, embedding the VS Code workbench, multiple files/tabs, extensions, a terminal, AI completion, collaboration, automatic saves, runtime card redesign or implementing the separate drag-and-drop proposal.

## Capabilities

### New Capabilities

None; enhance the existing builder capability.

### Modified Capabilities

- `visual-builder`: visible JSON search and editing tools, contextual completions, navigable diagnostics, gutter folding and preservation of the single-document editing session.

## Impact

Starting commit: `7f4241b0f36620bc82b28fe73373cec77ed54faf` (v0.8.0). This proposal changes planning files only. Preserve the existing unrelated upgrade-task edit and `add-editor-card-drag-and-drop` artifacts.

Observed implementation: `frontend_src/json-editor.js` creates Monaco 0.56.0 with a JSON schema/worker, diagnostics and formatting, but sets `showFoldingControls: "never"`. `MaraoDashboardPanel.js` exposes Format/Collapse/Expand and defers JSON imports; its existing model is shared with Visual through `editor-model.js`. Monaco's find/suggest commands are already bundled, and line numbers use the library default. The generated schema covers entities, card names and selected fields but does not derive complete role-specific option help from the catalog.

Expected changes: JSON adapter, panel controls/lifecycle and CSS, catalog-driven schema/completion helpers, existing editor tests and safe fixtures, bundled editor assets/build checks, scoped component/check map, configuration documentation and feature coverage. No new editor dependency, backend API, filesystem access, network schema source or service-dispatch path is proposed.

Affected-card set: all published builder card/template families as JSON configurations, their nested options, groups, shortcuts and sheet references. Their runtime renderers, sliders, actions, popup composition and navbar remain unchanged. The shared editor/schema path must preserve every family without requiring equivalent runtime interactions for each.

Compatibility: no dashboard JSON format, config-entry version, generated contract, ownership or migration change. Existing released/converted documents, unknown/raw/protected content, explicit empty selections, ordering and archived history remain supported. Search, folding, diagnostics and view changes are read-only; accepted text edits use the existing explicit save and exact backup/recovery path. Release-only preserved-install proof is conditional on actual persistence/ownership/upgrade impact during implementation.

User clarification after implementation: use the default Microsoft Monaco editor.
Remove custom editor typography/themes, gutter buttons, spacing, docked search
and the separate editing toolbar. Preserve the local schema and save lifecycle.
Native Monaco sizing is an explicit user exception to Marao's UI rules inside
the code editor; surrounding app controls keep the dashboard styling.
