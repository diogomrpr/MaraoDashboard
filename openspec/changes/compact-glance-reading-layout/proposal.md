# Proposal

## Why

Glance currently places each reading's name below its icon and value. The user selected the Compact mockup: a quieter name at the top, a circular icon below it, then the emphasized value and unit, with the ability to hide names.

## What Changes

- Adopt the Compact layout for every Glance reading: centered **name → icon → value/unit**, with tight internal spacing and a separate rounded tile for each reading.
- Retain equal-width tiles, 8px gaps, the transparent group, optional group title, and responsive one-to-three-reading layout.
- Reuse the existing `variables.show_reading_names` option: names are visible by default; false removes the visible name row and its space while retaining semantic names and saved labels.
- Keep 48px circular icon/Activity targets and existing authoritative values, availability feedback, action guards and Activity behavior.
- Align the quality guide, Glance documentation and existing examples with the selected design during implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: specify the selected compact Glance hierarchy and its visible/hidden-name presentation within the existing Header, glance and forecast detail requirement.

## Impact

**Planning baseline:** `7b500719b6318261bd33a2bda13ce6a5e09c6341`, with unrelated uncommitted runtime, editor, media, cover and navbar work preserved. This proposal changes planning artifacts only; its current implementation affected-card set is empty.

**Intended affected-card set:** `md_glance_card`, including `custom:marao-glance-card`, manual/template cards, native editor previews, generated dashboards, popup hosts and the documentation playground. Shared reading markup also serves other families; their order and geometry must stay unchanged.

**Observed:** `MaraoCards.js` already owns the individual rounded tiles and hidden-name rendering. The catalog, native editor, model validation and documentation already expose the label toggle. The current visual order is icon → value → name. The completed `display-glance-entity-tiles` change and quality guide describe that earlier order; this proposal intentionally supersedes that order only. It does not alter or relabel historical completion evidence.

**Compatibility:** preserve all existing configuration keys, defaults, names, icons, units, explicit hiding, reading order, unknown fields, raw cards, HA layout fields, protected YAML and history. Existing configurations receive the new visual order without saving or regeneration. No persisted format, generator output structure, migration, new option, package-version change or dependency is proposed.

**Non-goals:** add runtime layout variants or a names toggle inside the dashboard card; change other card families, Activity queries, services, state formatting, navbar or popup behavior; implement, deploy or publish during this planning request.
