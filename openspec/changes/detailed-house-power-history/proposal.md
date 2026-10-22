# Proposal

## Why

House Power currently opens another summary card, while its detailed history is limited to a rolling day. Users cannot inspect calendar days, weeks or months, see recorded spikes clearly, or compare contributing devices at the same time.

## What Changes

- Open a detailed power line chart directly from House Power and its History action.
- Use a theme-styled in-page menu with native buttons for day/week/month, including selected-state and keyboard/focus handling.
- Warm the current page of every time unit after the selected chart renders, keeping those pages while navigating another unit.
- Keep a day/week/month selector and previous/next period navigation visible at the top of the popup; disable future periods.
- Show recorded readings with straight segments, preserve extrema when reducing plotted points, and leave unavailable history as gaps.
- Add an ordered Power devices list of power sensors and optional names in the visual builder, native editor and JSON model. Plot their traces alongside the house total and show their readings for the selected time.
- Load the nearest four periods in each direction in the background after the selected period is rendered, consistently for day/week/month.
- Reuse existing units, authenticated Recorder history, shared popup behavior and chart implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `camera-history-content`: Calendar power-history navigation and device comparison.
- `visual-builder`: Configure and preserve ordered power-device bindings.

## Impact

Graph-popup generation, shared history renderer/data utilities, runtime card registration, editor catalog/forms/schema/validation, translations, documentation and targeted tests. No third-party dependency or persisted-format version change. Existing configurations work with an empty device list; all existing selections, units, names, unknown fields, raw cards, protected YAML and archived history remain intact. Available detail depends on Recorder retention; no energy-to-power estimates or invented readings are introduced.
