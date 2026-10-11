# Proposal

## Why

Page setup is split between navbar selection, Home settings, Rooms, guided-page selectors and custom-page editing. Administrators cannot consistently rename individual cards or choose their composition; one Add page flow with editable starter templates should replace those separate systems.

## What Changes

- Manage **all pages**, including Home, Rooms and room details, in the top navbar/page section. Add page creates an empty page or starts from Home, Rooms, Room, Security, Energy, Wallbox or Media templates. This scope includes the user's explicit decision to unify Home and Rooms.
- Templates populate ordinary editable cards once. Every page supports its own name, icon, path, card names/icons, entity bindings, card selection, ordering and layouts through the shared editor; deleting or changing template content never reapplies it.
- Expose currently page-only roles as reusable Marao card configurations: weather, room shortcuts with All off, native scenes, alarm/status and safe actions, energy periods/history, charging controls and media apps. Reuse existing renderers and the proposed Entity Group behavior rather than losing summaries or popups.
- Separate page management from navbar visibility. Manage more than five pages, retain at most five visible entries, and allow unpinned pages to be reached through ordinary shortcuts. Removing a navbar entry does not delete its page.
- **BREAKING configuration change, with automatic versioned migration:** replace legacy `overview`, `rooms`, named `pages.*` and `pages.custom` composition with one ordered collection of editable page containers. Preserve routes, card settings, explicit empty selections, protected/custom content and recoverable history. Existing installed dashboards must remain usable without manual rebuilding.

## Capabilities

### New Capabilities

None; reuse the existing builder, generation and lifecycle boundaries.

### Modified Capabilities

- `visual-builder`: one page manager, snapshot templates, shared card/options editor and editable page layouts for every page.
- `dashboard-generation`: canonical page containers replace special page generators while preserving all current compositions, summaries, controls, popups and navigation contracts.
- `integration-lifecycle`: recoverable conversion of historical page models and current-format first-run creation, without destructive rediscovery.

## Impact

Observed source: `frontend_src/MaraoDashboardPanel.js` separates `_renderNavigation`, `_renderPages`, `_mountOverviewForm`, room editing and `_openCustomPageDialog`; Add page currently selects an already-generated route and refuses at five entries. `editor.py` exposes separate guided fields. `generator.py` uses dedicated view functions alongside `_entity_container_cards`. Some entity objects already accept names, but visual exposure is uneven, and energy period titles are fixed. No timing or real-phone checks were run for this proposal.

Implementation reaches the editor catalog/model/schema/panel/styles and rebuilt editor assets; generator resolution, starter/setup/save/service/history compatibility; translations and configuration/card/update documentation; focused Python/Node/browser checks and safe `ha-test/` Cases/realistic pages. Reuse native grids, existing templates/components and upgrade infrastructure; no additional dependency or third-party card.

**Affected-card set:** empty for these planning-only edits. Future implementation affects every generated family, including Home groups/weather/scenes, room shortcuts and their All off action, all room/custom content, Security alarm/access/actions, Energy graph/period/load/appliance cards, Wallbox controls, Media players/apps, and every generated popup/navbar. Shared containers can affect the full Cases gallery; record the exact inventory before implementation.

Coordinate with `ensure-safe-dashboard-upgrades` (ordered conversions/recovery), `independent-room-entities` (explicit membership and suggestions) and `configurable-entity-groups` (group descriptor/summary/filter). Their unfinished plans are not shipped behavior. This change supersedes separate Home group storage and guided-page forms only when implemented; reconcile overlapping deltas before application, without modifying those proposals here.

Non-goals: template marketplace/import system, recurring area/template synchronization, arbitrary new card behavior, changes to action safety or authoritative state, new dependencies, implementation/deployment or publication in this proposal. Versioned release preparation must include historical feature coverage and the separate preserved-install upgrade gate; ordinary iteration uses focused checks.
