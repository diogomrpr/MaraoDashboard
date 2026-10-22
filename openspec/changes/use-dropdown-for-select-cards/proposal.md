## Why
Select cards currently render one button per option, making cards with many choices unnecessarily large.

## What Changes
Use a compact shared Marao themed dropdown for `input_select` and `select` scene cards. Preserve all options, the authoritative selected value, disabled states and exactly-once native service dispatch. No saved configuration changes.

## Capabilities
### Modified Capabilities
- `card-behaviors`: dropdown selection instead of an option-button grid.

## Impact
Shared runtime card, existing selector tests and browser-check consumers. No migration or backend change.
