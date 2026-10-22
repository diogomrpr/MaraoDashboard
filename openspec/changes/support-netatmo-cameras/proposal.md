# Proposal

## Why
Netatmo cameras already expose native HA live streams, but Marao currently detects only Frigate and Protect event providers. Netatmo recordings use HLS, and its native media browser omits structured event types needed for accurate filters.

## What Changes
- Detect Netatmo automatically or through the existing explicit provider setting.
- Read the selected camera's cached metadata through an entity-permission-checked, read-only API; retain lazy native HA media browsing/resolution.
- Reuse the existing popup, event filters, incremental feed, Back/Refresh and native HLS player with inline controls and no autoplay.
- Align editors, translations, documentation and safe fixture examples. Document HA's doorbell-live and provider-retention limits.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `camera-history-content`: Netatmo provider metadata, filters and HLS recordings.

## Impact
Camera/events runtime, native and visual editors, integration read-only WebSocket registration, safe fixtures and targeted checks. Existing saved cameras, unknown fields, generated popup shape and provider aliases remain valid; no migration, new credentials, dependency or discovery reset. Hardware privacy, monitoring, siren and floodlight actions are outside the camera card's existing feature set.
