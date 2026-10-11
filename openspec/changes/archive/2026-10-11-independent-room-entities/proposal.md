# Proposal

## Why

Removing an entity from JSON does not reliably remove it from the dashboard because a room's Home Assistant area is expanded again during generation and editor snapshot conversion. Room membership must be owned by the administrator, with area discovery used for the initial dashboard and later suggestions only.

## What Changes

- Make each room's saved explicit entity list authoritative in JSON, Visual and generation. Empty lists stay empty; deleted entities do not return after tab switches, save, regeneration, registry changes or restart.
- Keep first-install discovery: create useful rooms/cards from enabled, visible, supported Home Assistant entities once, then persist independent room contents.
- Retain an optional Home Assistant area association solely for suggestions. Allow changing/clearing it without adding, moving or removing cards; do not infer membership from the room's display name.
- Replace Add card's single catalog view with **By card type** and **By entity** tabs. By entity initially suggests supported entities assigned to that room's associated area that are not already present. Search by friendly name or entity ID across all supported entities, regardless of area.
- Selecting an entity proposes its compatible Marao card and opens the existing options form prefilled; adding remains an explicit local draft action followed by Save & Generate. Custom pages reuse both tabs with global search, without room-area suggestions.
- **BREAKING:** `area` no longer adds room entities at generation time. Convert legacy sources to explicit membership with a versioned, recoverable migration. Existing explicit lists, including empty lists, take precedence over area discovery; area-only legacy rooms receive a one-time snapshot. Flatten legacy include/exclude/overrides into the explicit room document while preserving options, raw cards and unknown fields.
- Stop setup from treating a deliberately empty saved configuration as a starter needing automatic registry population. Retain repairs of generated assets without rediscovering room contents.

**Evidence, 2026-10-10:** `_resolve_entity_container` collects all area entities before applying explicit entries; `materializeAreaRoom` also seeds from the area's entities. A synthetic reproduction started with JSON containing only `light.keep`, but the current snapshot conversion produced both `light.keep` and `light.deleted`. Starter builders persist both `area` and explicit entities, and empty-starter repair can repopulate saved empty configurations. This establishes the mechanisms; the user's private configuration and other Home Assistant installation were not inspected.

**Confirmed scope:** Entity search covers any **Marao-supported entity from any room**. This does not introduce new card families for scripts/automations, continuous registry synchronization, automatic additions, bulk-import features or an external card dependency. Save remains explicit; removing an entity from one room does not remove independent references on other rooms, explicitly configured guided pages or protected raw YAML cards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: Independent room documents, two Add tabs, area suggestions and global supported-entity search.
- `dashboard-generation`: Explicit membership and compatibility conversion without recurring area expansion.
- `integration-lifecycle`: One-time starter discovery, preservation of intentional emptiness and recoverable legacy conversion.

The existing baseline's “retain older area-linked rooms until first card edit” and “repair empty starters by rediscovery” rules are deliberately superseded by this request. Unrelated layout, card/action, explicit guided-page and protected-custom-content contracts remain intact.

## Impact

Affected source: `frontend_src/editor-model.js`, `MaraoDashboardPanel.js`, `panel.css`; integration `generator.py` and `__init__.py`; schema/catalog metadata as needed; editor translations, generated editor assets, configuration/update documentation and focused model/generator/setup/browser checks. Existing administrator APIs can carry canonical configuration and migration status without adding a new endpoint. Reuse current registry/area metadata and card compatibility mapping.

The affected-card set is **every generated room card and room shortcut/summary, Overview summaries and their derived popups, plus derived Security access and Media player cards/popups**; explicit page roles and custom cards are preserved independently. This changes membership, not shared renderer geometry. Update safe Cases and realistic-page fixtures for deletion, additions and registry changes on the single `/marao-dashboard`. Keep a concrete affected-card inventory during implementation and inspect each consumer after the final check. No implementation, deployment or publication occurs during this proposal.
