# Proposal

## Why

The dashboard editor offers page duplication but no Duplicate action on individual card rows. Administrators must recreate a configured card or copy JSON manually to reuse it with small adjustments.

## What Changes

- Add a localized Duplicate card action to the shared visual card row for every visually editable occurrence, including Marao cards, entity groups, headings, shortcuts and embedded Home Assistant cards.
- Insert one independent copy immediately after the source in the same section/container, retaining its name and complete configuration while assigning a fresh occurrence identity and independent generated popup references.
- Keep duplication in the current local draft; existing explicit save and discard behavior applies.
- Assumptions: duplicate in place without a dialog or automatic renaming; users can subsequently edit or move the copy with existing controls.
- Non-goals: cross-page copying, clipboard workflows, bulk duplication, new editing controls for legacy raw `cards` lists, runtime card redesign or changes to save/storage contracts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: extend ordered card editing with duplication and specify configuration preservation, independent identity and draft-only behavior.

## Impact

- Shared consumers: all card rows managed by `MaraoDashboardPanel.js`, including flat pages and page sections and retained legacy container adapters. Runtime appearance and entity actions are unchanged.
- Primary implementation: `frontend_src/editor-model.js`, `frontend_src/MaraoDashboardPanel.js`, existing English/Portuguese labels, targeted editor tests and configuration documentation. Regenerate editor/distribution assets through existing build tools.
- Inspect `frontend_src/compile-dashboard.js` identity/popup derivation and the retained Python generator where applicable; use their existing descriptor contracts rather than introduce a parallel format.
- Compatibility: supported released sources remain valid; no source, config-entry or package-version migration is required. Existing descriptors, authored YAML, unknown fields, explicit emptiness, page paths, navigation and unrelated configuration remain unchanged. Only the explicitly duplicated descriptor is new.
- Planning baseline: commit `ae962afc584d8bfb4939c857cce93f5f02ffbacc`. Pre-existing untracked `frontend_src/lovelace-editor 2.js` and `ha-test/prepare-frontend 2.js` are outside this change. Coordinate packaging with the ongoing `move-marao-to-native-frontend` change without inheriting its migration scope.
