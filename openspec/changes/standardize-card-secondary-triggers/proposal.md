# Proposal

## Why

The switch card adds a large History row even though the light card already provides a compact, touch-friendly pattern for secondary controls. Equivalent detail openers should use that pattern consistently without competing with primary controls or adding card height.

## What Changes

- Replace the large History row on builder-configurable switch power graphs, climate temperature graphs and toggle graphs with a semantic icon-circle entry point and the existing cancellable 600 ms default card hold when safe and not explicitly overridden.
- Keep light cards on their existing color-picker behavior. Exclude light history and all history combinations that the dashboard builder does not expose; introduce no Color/History chooser or new history settings.
- Audit every project-owned card and classify visible secondary detail/configuration openers. Use compact icon activation for additional information, retaining real primary actions, navigation, selectors, retry/recovery and content-pagination controls.
- Keep history source selection, popup Back/focus restoration, data/error handling and primary service actions unchanged. Opening details must dispatch no device action.

Observed builder support: switches expose Power graph and Power entity, climate exposes Temperature graph and Graph entity, and graph/toggle-graph cards provide graph content by definition. Light, fan, cover, base, sensor and number cards do not expose optional history configuration. The shared runtime accepts more manual combinations, which are explicitly outside this change's feature scope.

Affected set: `md_switch_card` with its builder-configured graph, `md_climate_card` with its builder-configured graph, `md_toggle_graph_card`, and the project-owned event card's textual Details openers. `md_graph_card` is a compatibility consumer with primary history activation. Light, energy-period, timeline, group/room/security/access/media and remaining families are audited compatibility consumers, not new history targets. Existing error reasons remain visible.

Non-goals: adding history to other families, changing primary card destinations, replacing real operating controls with gestures, hidden swipe actions, new builder fields, graph-data changes, camera playback work, or modifying embedded third-party/Home Assistant cards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-behaviors`: Consistent compact secondary detail activation and compatible default holds, with existing primary/security behavior preserved.
- `camera-history-content`: Compact history entry points and event-detail icons while retaining history/source/error contracts.

## Impact

Shared `MaraoCard` rendering/action binding and popup ownership in `MaraoCards.js`; detail buttons in `MaraoFrigateEventsCard.js`; existing theme/localization paths; switch/climate/graph documentation, focused gesture/action/popup assertions and current safe gallery examples. Builder catalog and generator are used to bound scope and verify unchanged propagation, not to add options.

Released v0.20.0 descriptors, graph flags/source IDs, custom actions, hidden icons, raw YAML and history stay preserved without a format migration. The main spec's existing separate visible History-control wording will be revised to describe the compact icon instead of an extra row. Manual unsupported graph combinations are not promoted, rewritten or deleted.
