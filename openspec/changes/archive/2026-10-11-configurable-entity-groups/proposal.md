# Proposal

## Why

Overview's lights, covers and maintenance summaries are hard-coded from room contents, so administrators cannot choose their membership or popup filtering. Replace those special cases with a reusable Entity Group card while preserving existing summaries and member controls; include thermostats as confirmed by the user.

## What Changes

- Add the catalog card **Entity Group**, configurable on Overview, room pages and custom pages: title/icon, entity type, ordered same-type members and **All entities / Active only** popup mode. Initial types are lights, covers, battery sensors and thermostats; battery sensors form their own semantic type, not arbitrary sensors.
- Replace the static overview lights/covers/maintenance/climate implementations with this shared card and popup path. Allow multiple groups of the same type, reordering and deletion. Saved selections and explicit empty lists are authoritative and do not follow registry changes.
- Summarize the complete deduplicated membership independently of popup filtering: preserve active counts, all-inactive labels, numeric battery readings and partial availability. Keep an available secondary member reachable when the first member fails.
- Filter live authoritative state, including while a popup is open. Default lights to Active only; default other types to All entities. Define active per type, including low battery below the existing 20% warning boundary. Show a localized empty result instead of an empty or broken sheet.
- Reuse the shared popup and member renderers, retain member labels/icons/options, light brightness capability, cover positioning and thermostat mode/target controls. Door/garage/gate covers must use the existing access-safe path rather than ordinary blind controls.
- Retain compatibility with legacy configurations lacking explicit groups and existing overview hashes. Materialize editable defaults from resolved legacy membership through the accepted ordered page conversion, without writing during reads/previews. Format-2 Home stores ordinary explicit group cards; missing or empty groups stay absent. Preserve weather, scenes, unrelated pages, raw cards and protected YAML.

**Observed on 2026-10-10:** `_overview_view`, `_overview_nav_card`, `_entity_popup` and `_maintenance_popup` provide the special cases. Counts use `summaryState`; maintenance uses the first battery's numeric reading rather than a count. Read-only inspection on the disposable instance confirmed those readings and popup controls. Contrary to the user's expected lighting behavior and the existing baseline spec, the current source and popup list off lights too. Active-only lights is an intentional correction, not a claim that filtering already works. The cover popup forces `hc_cover_card` even for access covers; thermostat group titles are suppressed by the mode-sheet heuristic. Address those relevant shared-path defects when replacing the special cases.

## Capabilities

### New Capabilities

None; extend the existing builder, generation and card contracts.

### Modified Capabilities

- `visual-builder`: First-class group editing in Overview and the reusable card catalog, typed multi-entity selection and explicit filtering.
- `dashboard-generation`: Explicit groups, deterministic popup ownership and backwards-compatible defaults instead of static summary branches.
- `card-behaviors`: Group summaries, type-specific active filtering and preservation of safe member controls within the existing popup.

## Impact

Affects `editor.py`, `generator.py`, `frontend_src/editor-model.js`, `MaraoDashboardPanel.js` and rebuilt editor assets; runtime `MaraoCards.js`, localized copy in `MaraoDashboard.js`, documentation, focused tests, safe Cases and realistic page fixtures. Keep the integration self-contained; no new dependency, HA group helper or service endpoint is needed.

Affected-card set: Entity Group and its four converted overview summaries; light, cover/access, battery and climate popup members; shared navigation-summary and popup consumers if their helpers change. Inventory those consumers during implementation; room All off, scenes, other navigation cards and climate mode sheets are regression boundaries.

Entity Groups are additive descriptors in format 1. The accepted unified-page change supplies ordered 1→2 migration, moving legacy Overview groups into ordinary editable Home page cards. Missing legacy groups materialize their historical defaults once; explicit `[]` means none, and canonical missing/empty groups remain absent. Preserve historical selections, member options, public template keys, links, unknown/raw/custom content and unrelated state. Reads/previews remain unchanged on disk; writable conversion uses shared preflight, exact backups and recovery. Downgrade requires the matching package and saved source/owned-state backup.

Non-goals: mixed-type or nested groups, new device families beyond the four initial types, arbitrary aggregation formulas, bulk group actions, automatic membership synchronization, thermostat optimistic feedback, broad state/title redesign, or publication. Coordinate with `independent-room-entities`, `ensure-safe-dashboard-upgrades`, `unify-card-title-and-state-presentation` and `fix-climate-feedback-delay` without implementing their unrelated scope.
