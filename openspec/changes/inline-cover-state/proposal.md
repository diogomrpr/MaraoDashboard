# Inline cover state

## Why

Moving the current cover state into its position bar gives the name more prominence without repeating the state beneath it.

## What Changes

- Show the bold localized state against the left edge while it fits before the target thumb, otherwise use the right edge. When neither side fits, wrap in the roomier side. Keep this placement current during dragging, confirmed reports and text/font/width changes.
- Enlarge the cover name and remove its duplicate state row when a position bar is supported.
- Retain custom labels, state hiding, availability feedback and state below the name for covers without a position bar.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `value-numeric-controls`: inline cover state and larger cover names.

## Impact

Shared runtime in `MaraoCards.js` and `MaraoSlider.js`, cover documentation and focused existing Node checks. All ordinary cover card hosts share the renderer. Other slider families keep their presentation. Persisted configuration, actions, supported capabilities, migration and generation remain compatible.
