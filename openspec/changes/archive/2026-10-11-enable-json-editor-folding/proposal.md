# Proposal

## Why

The configuration editor cannot currently collapse JSON lists and objects, making large dashboard documents hard to navigate. Marao already embeds Monaco, the editor used by VS Code, so this should work through the existing editor rather than replacing it.

## What Changes

- Enable reliable nested array/object folding and unfolding in the existing JSON tab, with discoverable controls usable by touch and keyboard.
- Preserve formatting, schema diagnostics, entity suggestions, undo/redo, unknown fields, raw cards and the shared Visual/JSON draft. Folding changes the view only; saving retains hidden content.
- Make folding controls visible without hover and at least 48 × 48 CSS pixels, using mobile-compatible editor geometry.
- Keep this compatible with `improve-editor-startup`: retain folding in the locally bundled JSON editor without bringing Monaco back onto Visual's initial load path.
- Document the controls and add focused browser coverage using safe configuration fixtures, including nested lists. Resolve the observed weather-fixture/schema warning at its source rather than hiding diagnostics.

**Observed, 2026-10-10:** On the disposable editor's JSON tab, expanded nested arrays were visible but no folding decorations were rendered; the inspected console contained no warning/error messages. The pinned Monaco defaults enable folding but show its controls only on mouseover. Local build inspection confirms folding, formatting, suggestions and JSON contributions are included, so missing imports are not an established cause. The precise runtime cause of missing ranges/controls remains to be isolated.

**Scope assumption:** “YAML editor” refers to Marao's JSON configuration tab, whose saved document generates dashboard YAML. The tab remains JSON. This does not replace Home Assistant's native YAML editors, add direct generated-YAML editing, embed the full VS Code application or install an IDE/add-on/extensions. No new dependency, backend API or configuration migration is proposed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: Add structural JSON folding, touch-visible controls and preservation of the full local document when content is collapsed.

## Impact

Editable sources are `frontend_src/MaraoDashboardPanel.js` and `frontend_src/panel.css`, or the JSON-specific module introduced by `improve-editor-startup` if that change is applied first. Rebuild owned assets through `frontend_src/build-editor.cjs`; retain local workers, stylesheet loading and fingerprints. Relevant supporting paths are `tests/frontend/editor-model.test.js`, the existing Playwright/disposable-client workflow, safe fixtures under `ha-test/`, and `docs/docs/installation/configuration.md`.

The affected dashboard-card set is **empty**: only administrator editor behavior changes. Builder validation, generation and the generated dashboard remain authoritative and compatible. No gallery card behavior changes or duplicate Cases examples are needed; exercise representative room/raw-card configuration through the editor and verify a generated page still retains it. Private drafts, screenshots and logs must stay private. Implementation, deployment and publication have not occurred.
