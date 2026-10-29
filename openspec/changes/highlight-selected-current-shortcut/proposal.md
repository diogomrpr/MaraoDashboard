# Proposal

## Why

The current shortcuts below a Wallbox numeric control all have colored backgrounds,
making it harder to distinguish the selected value. The user wants color reserved
for the shortcut matching the current reported value, with other choices neutral.

## What Changes

- Give unselected current shortcuts a neutral, theme-aware surface and readable
  text while retaining their existing labels and touch targets.
- Apply the existing blue, teal or gold positional accent only when that shortcut
  is selected. Preserve its existing outline and semantic pressed state so color
  is not the sole selection cue.
- Follow Home Assistant's reported value: when no shortcut matches, all shortcuts
  stay neutral; unknown, unavailable, loading and disconnected states show no
  selected accent and retain their existing interaction guards.
- Update the Number Card documentation to explain the new selected-only styling.

Observed: `MaraoCards.js` already computes `aria-pressed` from the reported state,
but unconditional and positional CSS rules color every enabled shortcut. The
current Number Card guide explicitly describes this multicolored presentation;
that documentation must change with the requested behavior.

Scope interpretation: the existing shortcut row belongs to
`md_wallbox_current_card`, which supports both `number` and `input_number`
entities. A generic `md_number_card` has no shortcut row today. This proposal
covers the existing numeric shortcuts, without adding presets to that card.
Keeping each selected shortcut's existing palette color is a planning default.

Non-goals: new shortcut settings, palette changes, numeric stepper redesign,
optimistic selection, altered service dispatch or selection matching, and changes
to unrelated buttons sharing base styles.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `value-numeric-controls`: current shortcut accents indicate the authoritative
  selection, while unselected shortcuts use neutral surfaces.

## Impact

Affected card: `md_wallbox_current_card`, including `number` and `input_number`
bindings in generated dashboards, native/manual configurations and popup hosts.
The shared runtime styles in
`custom_components/marao_dashboard/frontend/MaraoCards.js`, Number Card usage
documentation and relevant quality-guide wording are in scope. Existing Wallbox
state tests and safe Wallbox examples already cover the relevant selection states.

Starting baseline: v0.23.3, commit
`38e5d69070ec8136a01c61381b44106d05179810`. The existing `shortcuts` array,
including its order, optional or explicitly empty form, and unrelated/unknown
configuration fields remain unchanged. Editor, schema, validation, generator,
storage, services and numeric comparison contracts need no changes. No dependency,
API change, new localization string or migration is required.
