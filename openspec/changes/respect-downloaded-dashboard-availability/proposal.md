## Why

The November 24, 2026 iOS capture can replay saved Home Assistant reads while the backend is unreachable. After midnight on November 25, cards requested ranges outside that capture. A local WebSocket remained connected throughout the outage.

## What Changes

- Recognize the optional companion connection signal when enabling commands and refreshing reads.
- Keep saved history, activity, forecasts and Plex folders usable. Show localized availability for missing coverage and let users revisit saved dates and folders.
- Resolve the independent linked-section warning for Home Assistant views that expose a section configuration and a containing view index.

## Capabilities

### Modified Capabilities

- `camera-history-content` adds downloaded read coverage and manual range recovery.
- `entity-state-actions` accounts for the backend state of a replaying companion.
- `navigation-popups` recognizes native section ownership on the reported Home Assistant host shapes.

## Impact

The changes affect frontend rendering, read lifecycles and device controls. Installed dashboard configurations and stored data retain their existing format.
