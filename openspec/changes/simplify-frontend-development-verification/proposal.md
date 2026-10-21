# Proposal

## Why

Small presentation edits inherit automated browser matrices, all unfinished work in the checkout, and fixture preparation. A targeted visual inspection should finish ordinary cosmetic work while release verification continues to cover the complete candidate.

## What Changes

- Separate visual, behavior and focused development verification; presentation-only work finishes with current targeted inspection.
- Capture the task's starting file identities, including dirty files, and select its subsequent changes instead of unrelated earlier work. Permit an explicitly reviewed file subset for concurrent work.
- Reuse the component map and safe gallery for a persistent focused preview, with serialized frontend asset sync and optional watch/reload. Keep the disposable instance on the latest project changes after inspection; revert its code only when the project is reverted.
- Replace contradictory agent/docs instructions and define a concrete stopping condition.
- Keep publication verification separate: development-only scope and inspection reports cannot satisfy release gates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `repository-workflow`: proportionate development tiers, current-task scope and completion criteria.
- `gallery-release-verification`: targeted persistent preview and frontend-only preparation, distinct from publication proof.

## Impact

Development scripts under `tests/` and `ha-test/`, package commands, agent skills and canonical workflow documentation. Affected product-card set: empty; this changes tooling, not shipped rendering. Existing dashboard JSON, component keys, generated structures, saved selections and published verification reports remain compatible. No application migration is required. No new framework, second dashboard, production access, automatic full suite or package release is included.
