# Proposal

## Why

Alarm controls currently render supported actions in a horizontal scrolling row. Users need a compact dropdown or an immediately visible two-column grid, with a deliberate full-width disarm slider below the grid.

## What Changes

- Add a per-alarm `variables.alarm_layout` setting with `dropdown` and `grid` choices in the dashboard builder.
- Use Marao's themed dropdown for supported arming modes and Disarm. Explicit option selection executes once, without a hold; opening, browsing or dismissing the menu does nothing. Required alarm codes still apply.
- Show all supported arming modes in a two-column grid. Keep Disarm out of that grid and place its strict slide control beneath it, spanning the full width. Custom bypass retains its security hold in grid mode.
- Reuse shared alarm controls across generated and directly authored popup instances; keep dashboard summary cards unchanged in size.
- Preserve existing saved cards: omission of the new setting retains the current horizontal row and its existing holds. New alarm cards default to dropdown. The editor offers the two requested layouts; existing cards may retain their unset legacy layout until explicitly changed.
- Record the user's explicit exception to the general security-hold rule: dropdown alarm selection needs no hold, and grid disarm uses a strict slide instead.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: configurable alarm presentation, supported-mode controls, stable layout and preserved legacy behavior.
- `entity-state-actions`: layout-specific alarm confirmation with dropdown selection or strict disarm slide, retaining other security guards.

## Impact

Affected cards are `md_security_card` and internal/direct `md_alarm_controls_card`, their generated detail sheets, shared catalog/editor fields, validation, generation, translations, documentation and safe alarm fixtures/tests. Existing `_renderAlarm`, `_sendAlarm`, dropdown and strict-slide owners should be reused rather than introducing a new card or dependency.

This is an additive format-2 option, with no source rewrite, config-entry migration or schema-version bump. Preserve legacy aliases, unknown fields, authored actions, names, entity IDs and explicit external popup ownership. Generated child controls must receive the new setting. The existing access-slide service restriction must not be broadly relaxed to support alarm disarm.

Non-goals: PIN storage, alarm-provider changes, custom mode ordering/filtering, replacing the summary card with inline controls, live-instance operation, publication, and the unrelated button-unknown-state issue. These artifacts propose future behavior; nothing is implemented or device-tested here.
