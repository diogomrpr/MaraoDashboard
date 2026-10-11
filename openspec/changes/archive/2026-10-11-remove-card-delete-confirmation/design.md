# Design

## Context

See `proposal.md` for motivation and `specs/visual-builder/spec.md` for behavior.
The shared `_roomAction` branch in `frontend_src/MaraoDashboardPanel.js` gates
`card-delete` with `confirm("Delete this card?")`, then removes one entry through
`_editableContainer` and updates dirty state and Visual rendering. Room and
custom-page rows already use this branch and stop click propagation. Legacy
area-linked rooms materialize through the existing helper on their first edit.

The quality guide and baseline spec currently require confirmation broadly.
The user's explicit instruction establishes the narrow exception for individual
local entries; retain the other administrative safeguards. This short design
records that boundary and the data-preservation implications before coding.

## Goals / Non-Goals

**Goals:** Reuse the existing deletion and draft lifecycle without changing
container resolution, surviving content, or persistence boundaries.

**Non-Goals:** New undo/history infrastructure, replacement confirmation UI,
new dependencies, schema changes, or runtime-card styling.

## Decisions

1. Remove only the confirmation condition in the shared `card-delete` path.
   Preserve indexed deletion, `_editableContainer`, dirty tracking, rendering,
   button semantics, busy-state disabling, and event propagation handling.
   Separate handlers would duplicate behavior; removing all confirmations would
   extend beyond the requested individual-entry change.
2. Reuse Discard changes for recovery before saving and the existing explicit
   Save & Generate boundary for persistence. An undo stack or toast adds an
   unrequested workflow. Keep room/custom-page deletion, discard and history
   restoration confirmations intact.
3. Verify actual editor interaction and resulting document, rather than checking
   whether the source contains a confirmation string. Reuse the current frontend
   test/browser tools and safe fixture document; introduce no test framework.
4. Update the quality-guide exception and configuration documentation. The
   localized Delete label already exists; no new text, translations, API,
   validation, generator, theme, or runtime-card change is needed. Rebuild the
   bundled editor from source. The runtime-card affected set remains empty, so
   existing editor fixtures suffice without adding equivalent gallery cases.

## Risks / Trade-offs

- Accidental deletion is easier → Changes remain unsaved until explicit save;
  verify Discard restores the saved document. There is no per-entry undo.
- Indexed deletion could affect a neighboring row or duplicate occurrence →
  Exercise first/middle/last rows and repeated entity references, checking order,
  options, unknown fields, and raw/custom content against independent expected
  documents. One activation must remove one entry.
- Legacy room conversion is shared with other edits → Verify the existing
  materialization path is unchanged. Coordinate with `independent-room-entities`
  if it lands first, without implementing automatic-sync changes here.
- Existing unsaved work in the disposable editor could be overwritten → Use a
  private saved test configuration and preserve/restore the original configuration
  around any explicit save; never exercise this on another instance.

## Migration Plan

No versioned migration is required: historical configurations retain their schema
and generated contracts. There is no automatic rewrite or registry operation.
Build the editor, run the focused check, deploy only to `192.168.0.28`, and finish
with visual/interactive inspection of the affected editor rows. Restore fixture
configuration after checking save/reload. Reverting the source and generated
editor assets restores the confirmation; saved edits remain ordinary dashboard
configuration, recoverable through the existing saved-history workflow.
Release preparation and its upgrade/publication gates remain separate work.
