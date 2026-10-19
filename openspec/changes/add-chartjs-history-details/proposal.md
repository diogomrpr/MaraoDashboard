# Proposal

## Why

Marao's numeric graphs currently provide decorative background traces or a basic energy-period line, with no point inspection or richer mobile detail. The user selected Chart.js for a clean, modern experience: readable charts, exact values and timestamps, simple period selection and useful summaries without crowding the dashboard.

## What Changes

- Bundle Chart.js locally as a lazily loaded Marao detail renderer, using selected modules and the existing build/static-asset pipeline. Users install no extra card or frontend resource, and chart data remains in Home Assistant/the browser.
- Keep compact background previews and add a visible, localized History control for graph-enabled cards. Open an interactive detail sheet using the shared Marao popup behavior; cards already inside a sheet drill into history and return without stacking modal overlays.
- Use the same Chart.js detail renderer for existing day/month energy sheets, preserving period navigation and configured unit/precision semantics.
- Support tap-to-inspect actual readings with a timestamp/value readout outside the canvas and visible previous/next-reading controls. Preserve vertical scrolling, browser zoom, existing card actions and native slider/security gestures.
- Offer `1h`, `6h` and `24h` windows over available graph-card history; retain existing energy day/month periods and previous/next navigation. Show minimum/maximum and, for measurement series, an explicitly labeled sample average from full-resolution available values.
- Apply Marao surfaces, colors and scalable typography, sparse axes and a readable mobile layout. Preserve peaks when reducing drawn points, and represent known unavailable intervals as gaps rather than invented zeroes or smoothed readings.
- Preserve loading, empty, error, unknown and unavailable states, explicit retry, request deduplication, stale-result protection and lifecycle cleanup. Extend focused tests, safe Cases and realistic examples across generated and native card hosts.

## Capabilities

### New Capabilities

None; extend the existing history and popup capabilities.

### Modified Capabilities

- `camera-history-content`: Shared numeric history details, point selection, bounded windows, faithful data presentation, local chart delivery and lifecycle behavior.
- `navigation-popups`: Shared chart drill-in/back navigation and touch-safe chart inspection within the established modal/scroll/focus contract.

## Impact

- Planning starting commit: `c72b0d40dce4f70acd95e59b291ab7745bdb6c01`. The workspace already contains unrelated control-grid and verification work; preserve it and refresh the implementation baseline before any code edits. This request creates planning files only.
- Direct affected-card set: `hc_graph_card`, `hc_toggle_graph_card`, `hc_switch_card` with power graphs, `hc_climate_card` with temperature graphs, and graph-enabled `hc_sensor_card`/`hc_base_card`; include any other configured consumer of the same shared graph path. Also affected: `marao-energy-period-card` in summary/detail roles, all generated/native/raw-config instances and their popup hosts. Shared-popup consumers require representative regression checks for lighting/value sliders, media, entity groups, climate, access/security, camera/history and energy sheets.
- Implementation areas: editable chart source and build entry under `frontend_src/`; locally generated chart asset/license plus `MaraoCards.js` and `MaraoDashboard.js` under the shipped frontend; dependency lockfile, reproducibility/package checks, translations, safe fixtures and focused verification mappings. Reuse existing helpers; do not add a chart framework, external card or runtime CDN.
- Compatibility: existing saved JSON, template keys, options, action assignments, popup hashes, raw cards, generated YAML and ownership remain unchanged. Details use transient runtime content, not persisted chart settings or new generated popup structures. Inspect released graph/energy fixtures and independently assert unchanged source/output. No dashboard/config-entry migration or historical live replay is expected for this UI-only design; reassess if implementation would change persistence, generated ownership or installation behavior.
- Confirmed: Chart.js is the selected library; clean mobile UI and richer detail are the goal. Planning defaults: compact preview plus detail sheet; point inspection instead of drag/pinch gestures; existing Recorder data/windows rather than a new historical-data service. The prior placement question was unanswered, so the detail-sheet choice remains an explicit reviewable default.
- Non-goals: pinch/pan plugins or Hammer.js, arbitrary chart configuration, multi-series comparisons, new consumption aggregations/bar semantics, long-term-statistics integration, `7d`/`30d` numeric-card ranges, replacing binary timelines or camera content, changing entity actions, or implementing this feature during proposal creation.
