# Proposal

## Why

Picking up a card in Marao's Visual editor can move the page before the user intends to scroll, making placement difficult. The shared drag controller starts edge scrolling immediately after drag activation, even when the activating movement is sideways.

## What Changes

- Keep the editor's scroll position and source-row geometry steady during pointer press, initial drag activation and a stationary pickup, including handles near the sticky header or viewport bottom.
- Require deliberate additional movement toward an edge before starting automatic scrolling. Keep intentional scrolling available for long same-page moves, with live insertion feedback and complete cleanup.
- Apply the behavior in the shared drag controller for every editable card row. Preserve the existing handle, strong haptics, native scrolling outside the handle, explicit move controls and local-draft commit rules.
- Add focused pickup/edge-intent regression coverage with actual mouse and emulated mobile touch input. Extend the existing safe Cases and realistic Studio editor examples only where a distinct long-list or edge-position case is missing, and document the interaction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: Add explicit stable-pickup and deliberate-edge-scrolling requirements, refining the existing card movement behavior without changing ordering or save semantics.

## Impact

- **Planning baseline:** `f1f0f798ab1cd08da645c44c6d06169f5bfbc3a3`. Planning-only affected-card set: empty. Preserve the unrelated `add-chartjs-history-details`, `compact-section-card-layouts`, `enable-native-camera-live-view` and `preload-json-editor-in-background` changes.
- **Observed:** The user confirmed Marao's Visual editor. In an isolated Chromium page using the unchanged `editor-drag.js`, a 10 CSS pixel horizontal activation near the top or bottom produced approximately 78–98 CSS pixels of scrolling over 100 milliseconds with mouse/emulated touch; middle pickups and stationary presses stayed steady. This diagnoses the shared controller, not a completed Home Assistant or physical-phone verification. Current browser tests activate dragging without asserting scroll stability.
- **Implementation affected-card set:** Every occurrence rendered by the shared Visual editor row: catalog/template cards, entity groups, headings, scene collections, page shortcuts and independent duplicates. Runtime card rendering, native Home Assistant dashboard dragging and physical-device actions are outside scope.
- **Expected paths:** `frontend_src/editor-drag.js`, rebuilt editor assets, `tests/frontend/editor-drag.test.js`, `tests/editor-drag-checks.js`, the scoped verification map if its coverage needs adjustment, builder usage guidance, and existing safe `ha-test/` examples. Inspect panel focus handling only if a focused native-input regression demonstrates a remaining pickup jump; retain normal keyboard field reveal.
- **Compatibility:** Preserve dashboard format 2, supported released source conversions, card IDs/options/order, explicit empty selections and deletions, unknown/raw/protected content, generated structures and popup references. No persisted setting, model operation, public API, migration, generated ownership or installation change is proposed. Existing save/backup/recovery remains the only persistence boundary; live historical upgrade proof is not required for this UI-only scope.
- **Specification relationship:** The completed `add-editor-card-drag-and-drop` delta describes touch dragging and edge scrolling but is not yet in the durable `visual-builder` baseline. Add narrowly scoped requirements here, retain its existing guarantees, and leave completed artifacts/evidence unchanged; reconcile the deltas chronologically during a later requested sync/archive.
- **Non-goals:** Disabling useful edge scrolling, changing scroll speed or control geometry, locking the whole page, replacing native scrolling, introducing a drag library or timer-based hold gesture, cross-page moves, redesigning runtime sliders/security gestures, implementing other open changes, publication, or implementation in this planning turn.
