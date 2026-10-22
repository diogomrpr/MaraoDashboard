# Design

## Shared path
Keep live/still/fullscreen playback on MaraoCamera's existing native HA path. Add `netatmo` to provider detection and existing editor suggestions; explicit selection still wins. Generated popups already forward event_provider, so no new persisted fields or output shape is necessary.

Netatmo's native browser provides media-source identifiers, thumbnails and HLS recordings but not structured event types. A small read-only adapter reads only the selected registered Netatmo camera's native HA cache, checking entity read permission before inspecting state/cache. Support both the released `netatmo_events` cache and config-entry runtime_data.events. Normalize timestamps and parent/subevent types, sort newest first and bound results to 100; never return raw cache dictionaries, transport URLs, account or person identifiers. Original provider descriptions are escaped display text.

Fetch metadata once per existing feed key. Browse each visible event's native media item for its optional thumbnail; resolve recording media only on activation. Use HA's ha-hls-player, registered through the existing native camera loader, with controls, inline playback and no autoplay. Reuse existing request invalidation, queue limits, Back restoration and availability handling; clips containing several event kinds participate in each matching filter.

## Compatibility and safety
No saved data migration, dashboard replacement, external SDK, credentials or new provider network calls. Existing Frigate/Protect and current/legacy event-card names remain intact. Only safe synthetic Netatmo fixtures on 192.168.0.28 may be exercised. The full prepare preserves current dashboard source and helper states and refuses real Netatmo integration replacement. HA does not expose Netatmo doorbell live video; available event retention and media remain provider-defined.

## Verification
Use narrow Python normalization/permission/cache tests, existing event-card and editor/generator checks, and one safe fixture playback check if needed. Install the final current package/config/fixtures once on the disposable instance. Hardware verification is explicitly unperformed; do not claim all Netatmo models or manufacturer-app-only capabilities tested.
