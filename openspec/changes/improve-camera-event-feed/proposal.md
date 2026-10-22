# Proposal

## Why

Camera events currently appear as small tiles, with their type and timestamp inside each preview. Opening the popup also resolves every preview immediately. A full-width timeline with filters and deferred media makes events easier to scan on phones and avoids unnecessary requests.

## What Changes

- Add a sticky, horizontally scrollable event-type filter bar, including All.
- Show events in one full-width column, with a compact timestamp and type heading above each preview.
- Reveal older events in small batches as the user scrolls; resolve preview media only near the viewport and reserve its dimensions while loading.
- Preserve the selected filter and feed position when returning from an event.
- Retain the existing configured event limit as the total maximum, provider ordering, authenticated media access, and explicit refresh/retry behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `camera-history-content`: Filterable full-width event timeline, progressive event display, and lazy preview loading for Frigate and UniFi Protect.

## Impact

- Shared `MaraoFrigateEventsCard.js` implementation and its `marao-camera-events-card` alias, English/Portuguese runtime labels, camera usage documentation, and targeted frontend tests.
- No persisted configuration, generator, provider API, or migration changes. Lightweight provider metadata remains bounded by the existing limit; Protect retains its native recent-events window. Live camera playback is unchanged.
