# Proposal

## Why

The energy card's Energy breakdown section (Distribuição de energia) currently
shows every contributor's complete form at once. Long lists are difficult to scan
and make it harder to find the entity being configured.

## What Changes

- Group each energy contributor into a compact entry, initially collapsed for
  existing entries, with a recognizable name and its sensor ID in the header.
- Expand that entry's energy sensor, display name and optional cost sensor fields
  inline when its disclosure header is activated. Entries operate independently.
- Keep the existing move up/down and delete controls reachable while collapsed;
  activating them must not also toggle disclosure.
- Open a newly added entry immediately so its required sensor can be selected.
- Keep disclosure choices attached to the same entry through edits and reordering
  for the lifetime of the card configuration dialog. Disclosure alone changes no
  configuration or dirty state.

Observed: `_renderEnergySubEntities` in the shared dashboard panel mounts one
complete form per contributor. The existing page-section disclosure and compact
card rows provide reusable presentation patterns. The user confirmed inline
expansion within the current card dialog.

Planning defaults: new entries open immediately, header actions remain available,
and expansion state resets when the card dialog is reopened. These are transient
editor choices, not new saved options.

Non-goals: settings popups, new contributor fields, drag-and-drop, saved expansion
preferences, energy calculation changes, or changes to Power devices and
Background thresholds, which currently share the list renderer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: inline disclosure for individual energy contributor entries
  while preserving the existing energy contributor and price editing contract.

## Impact

Affected editor card: `md_energy_period_card` in the shared Visual card editor.
Affected dashboard runtime cards: none. The shared panel source, panel styles,
English/Portuguese labels where needed, editor documentation, existing panel tests
and generated editor assets are in scope. Both hosts of the shared panel receive
the same presentation.

The renderer is also used by power-device and threshold forms; those modes must
retain their current behavior. Validation, JSON schema, compiler/generator, energy
runtime, persisted dashboard structure and APIs need no changes. No new dependency
or migration is required.

Starting baseline: v0.23.3, commit
`38e5d69070ec8136a01c61381b44106d05179810`. Existing `sub_entities` bindings, names,
optional cost sensors, order, unknown fields, absent lists, explicit empty lists
and unrelated card options remain compatible. Opening or collapsing entries must
not rewrite the source; Cancel retains the existing private-dialog draft behavior.
