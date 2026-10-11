# Proposal

## Why

Deleting an individual card/entity entry currently interrupts editing with a confirmation modal, although edits remain local until Save & Generate. Remove that unnecessary step so the administrator can manage dashboard content directly.

## What Changes

- Remove confirmation for individual card/entity-entry deletion in rooms and custom pages, including page-shortcut cards using the same action.
- Remove only the selected dashboard entry immediately, mark the draft as changed, and keep Visual and JSON views consistent. Do not delete the Home Assistant entity or other occurrences of it.
- Preserve explicit Save & Generate, Discard changes, and confirmation for deleting entire rooms/custom pages or restoring history.
- Narrow the existing blanket confirmation requirement in the visual-builder spec and quality guide to allow this individual draft-editing action, as explicitly requested by the user.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: Immediate individual-entry removal without a modal, with existing local-draft and administrative replacement safeguards retained.

## Impact

- Observed implementation: `frontend_src/MaraoDashboardPanel.js` handles room and custom-page `card-delete` through one confirmation branch; preserve its existing container materialization, dirty tracking, and rendering path. Rebuild shipped editor assets after implementation.
- Update the quality guide and editor documentation; verify the behavior through a focused editor interaction check using safe data.
- Affected runtime-card set: empty. This changes editor interaction, not card rendering or generated card contracts. Validate the affected editor rows; no additional gallery card variants are needed.
- Saved-release compatibility: no JSON schema, API, generator, or migration change. Preserve surviving entries, order, options, unknown fields, and raw/custom content.
- Non-goals: deleting Home Assistant registry entities, bulk confirmation removal, undo infrastructure, automatic room synchronization changes, or publishing. The separate `independent-room-entities` proposal owns automatic re-addition behavior.
