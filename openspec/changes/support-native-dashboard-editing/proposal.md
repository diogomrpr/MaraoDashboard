# Proposal

## Why

Marao cards already render in Lovelace but lack native configuration forms and rely on builder-generated detail sheets. Users should be able to configure the complete card collection through Home Assistant without giving up the current builder or card functionality.

## What Changes

- Add named native card adapters, a shared catalog-backed visual editor and self-contained detail sheets.
- Add a read-only starter compiler and Community dashboard strategy; Take control transfers its expanded composition to ordinary HA storage.
- Preserve Marao theme/navbar presentation with accessible native editing and inert editor previews.
- Explicitly isolate native ownership from builder generation, legacy import, repair and restore.
- Cover all supported options, security controls, preservation, safe fixtures and scoped checks.

## Capabilities

### New Capabilities
- `native-dashboard-editing`: native card selection, visual configuration, starter creation and HA ownership.

### Modified Capabilities
- `integration-lifecycle`: read-only compiler and native ownership exclusion.
- `dashboard-generation`: independent expanded native starter output.
- `visual-builder`: shared catalog coverage and unchanged builder ownership.
- `card-behaviors`: standalone detail-sheet parity and inert previews.
- `navigation-popups`: native edit access and scoped shell behavior.

## Impact

Starting commit: `56309f23ea9b99a099a8952f6d030a7d08abba84`. Preserve the unrelated edit to `ensure-safe-dashboard-upgrades/tasks.md`. The artifact-only affected-card set is empty; implementation affects every published Marao card family, detail sheet, navbar and shared interaction consumer.

Compatibility is additive: retain builder format 2, existing generated contract, `hc_*` keys, raw/unknown fields, protected YAML and immutable history. New native documents carry ownership version 1 and do not migrate existing dashboards. Native UI targets HA 2026.6+. No third-party cards, automatic post-takeover discovery, copying/conversion/synchronization, exhaust-valve work, publication or comprehensive testing are included.
