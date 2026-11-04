# Proposal

## Why

The activity timeline popup currently renders its Date filter as a native browser select, so it does not match Marao's dropdown controls. Reusing Marao's shared dropdown will give timeline filters the same themed presentation, visible selection, and touch interaction as the rest of the dashboard.

## What Changes

- Replace the native list-filter helper in the activity timeline with the existing Marao dropdown. Date is the requested entry point; Event type, optional Source, Origin, and Initiator use the same helper and will follow it for consistency.
- Preserve Today, Yesterday, Last 7 days, and Custom range, including Home Assistant time-zone handling and the existing 31-day custom-range bound. Keep From/Through as date inputs.
- Keep the displayed value and selected menu item synchronized after selection, reset, and dynamically refreshed filter options. Selecting a different date period triggers the existing query once; dismissing a menu does not change a filter.
- Close and dispose dropdowns when their filter panel hides, their options are replaced, or the timeline closes, using the shared dropdown's existing viewport positioning and interaction behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `camera-history-content`: require Marao dropdowns for activity timeline list filters, with coherent selection/reset behavior and popup-scoped lifecycle cleanup.

## Impact

- Shared owner: `custom_components/marao_dashboard/frontend/MaraoActivity.js`, using `MaraoDropdown.js` and its stylesheet rather than a new dropdown implementation.
- Affected consumers: the activity popup exposed by sensor, access, switch, scene, and glance cards and their supported aliases. The shared activity renderer owns the change; individual card implementations should not duplicate it.
- Tests: narrow existing activity/dropdown checks for selection, reset, dynamic options, and cleanup. Update the existing activity documentation to describe the control consistently.
- Compatibility: this changes transient UI only. Saved card configuration, generated dashboards, recording/history data, public APIs, source permissions, and migration versions remain unchanged; no migration or new dependency is required.
- Non-goals: a custom calendar, new date presets or filtering semantics, changes to numeric-history charts, camera-event filters, energy period pickers, or unrelated settings proposals.
- Existing local edits to `MaraoActivity.js` are outside this proposal's implementation and must be preserved when applying it.
