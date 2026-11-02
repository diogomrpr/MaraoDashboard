# Proposal

## Why

The People card currently displays its members in a single vertical list. Users should be able to choose a more compact arrangement without placing each person in a separate card.

## What Changes

- Add optional top-level `columns` to People cards, exposed in the native visual editor and YAML and preserved through descriptor composition.
- Use an integer preference from 1 through 6, defaulting to 1 when omitted. This follows the existing grid range; the range and responsive interpretation are planning assumptions.
- Lay people out in saved order, left to right and then down, using the preferred column count when space permits and fewer columns when needed for readable content.
- Retain pictures, wrapping names and locations, independent availability and the informational-only contract.
- Document the setting and update existing safe People examples and targeted checks.

Non-goals: changing dashboard placement (`grid_options.columns`), adding person actions, tracking, maps, discovery or new layout settings to other families.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: configurable responsive columns inside the People card.
- `native-dashboard-editing`: visual/YAML configuration, validation and lossless preservation of People columns.

## Impact

Affected card set: `md_people_card` / `custom:marao-people-card`, including its generic `custom:marao-card` composition. Relevant owners are `MaraoCards.js`, `MaraoCollections.js`, native editor/form mapping, descriptor validation and `card-composition.js`. Rebuild shipped editor assets from `frontend_src`; reuse theme tokens and localized labels. Shared collection consumers (scene collections and entity groups) retain their settings.

Observed foundation: the working tree already contains the People implementation and the completed but unarchived `add-people-presence-panel` change. Its requirements remain prerequisites; this change adds columns without treating that pending work as published baseline. The baseline native-editing spec has a retirement notice; the active `use-home-assistant-dashboard-editor` change restores native authoring. Coordinate with those changes rather than reviving the retired starter or rewriting their artifacts.

Compatibility is additive: configurations omitting `columns` retain one column without a persisted rewrite, and explicit member selections, emptiness, order, names, icons, unknown fields, raw/native layout and visibility survive edits. No source-format, package-version or config-entry-version migration is proposed. Older packages are not expected to render the new option; upgrades must preserve it as authored data. No Python discovery/generator defaults or historical fixture rewrites are intended; review generic composition passthrough during implementation.

Planning baseline: commit `cf4662333dd6223c761e698f4131a197d67e19a7`; existing dirty application and planning work is outside this change and must be preserved. Planning creates documentation only and requires no installation.
