## Why

Lock Access summary cards hide Locked/Unlocked text while cover Access summaries show their current state. The user requests the same visible state for locks.

## What Changes

Keep localized current lock state on Access summaries; retain explicit state hiding, generic binary presentation, availability feedback and existing action safeguards.

## Capabilities

### Modified Capabilities

- `card-behaviors`: retain lock state text on Access summary cards.

## Impact

One shared runtime presentation predicate in MaraoCards.js, existing visibility assertions and the quality guide. Native/generated/raw instances share this path. No persisted fields, migration or service changes.
