# Proposal

## Why

The editor gives Save & Generate a long text button while hiding Open dashboard behind an extra-options dropdown. Import/export shortcuts in that same dropdown add clutter outside their relevant JSON editing context.

## What Changes

- Replace the visible Save & Generate label with a save icon, retaining its localized accessible name, current validation, feedback and explicit-save behavior.
- Put a left-arrow Open dashboard control immediately before Save in the persistent header, available in both Visual and JSON.
- Remove the extra-options dropdown and the Discard button. Give all header action icons the same filled circular design as Save.
- Show icon-only Import JSON and Export JSON buttons only when the JSON tab is active, outside Monaco's native surface.
- Keep all action controls visibly at least 48 by 48 CSS pixels and update names without replacing their icons.

Observed: `MaraoDashboardPanel.js` currently puts import, export, discard and open in the dropdown; `_updateHeader()` replaces action text on updates. User clarification: the header has Open first and Save second, with no Discard control. Open dashboard retains its existing same-app navigation to the saved result.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: Specify the direct icon action layout and JSON-only import/export placement in the persistent header.

## Impact

- Editor shell, header updates and event wiring in `frontend_src/MaraoDashboardPanel.js`; related layout in `frontend_src/panel.css`; rebuilt shipped editor assets.
- Existing editor-panel checks and the editor instructions in `docs/docs/installation/configuration.md`.
- Shared consumers: Visual and JSON modes, initial/loading/busy states, language updates and the native-session apply-label branch of the shared panel.
- Affected runtime card set: empty. No generator, templates, runtime cards, entity actions or gallery fixtures change.
- Compatibility: supported saved releases, source JSON, unknown fields, ordering, generated structures and public APIs remain unchanged. No versioned migration is required. Import review, export semantics and source preservation remain intact.
- Non-goals: changes to Monaco internals, import/export formats, save/navigation semantics, history, runtime navbar overflow, backend APIs, publication or broad automated UI coverage.

Planning baseline: `ae962afc584d8bfb4939c857cce93f5f02ffbacc`. Existing untracked duplicate source/helper files and `add-editor-card-duplication` planning are unrelated and must be preserved.
