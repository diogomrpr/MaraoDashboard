---
title: Cameras and recorded events
description: Choose streams and browse recent recordings from supported Home Assistant integrations.
---

Camera cards use Home Assistant's native camera stream. The dashboard camera entity also identifies its events. Optional `variables.popup_stream_entity` selects a different popup video entity, for example a higher-resolution stream; otherwise the same camera is used.

Marao does not infer a faster stream from your connection. Select explicit entities and test real playback on the device where you use the dashboard.

## One event browser

Camera popups and the standalone Camera Events card use the same browser. Add **Marao Camera Events** to combine an ordered list of camera sources. Provider settings belong to each source. Frigate, UniFi Protect and native Netatmo recordings have different available metadata; Marao does not invent missing detection types or timestamps.

Camera, Event type and Date/time filters work together over loaded records. Date choices include All loaded events, Last hour, Last 24 hours, Today, Yesterday and a custom range. Custom ranges include the start and exclude the end. Dates follow Home Assistant's timezone; ambiguous or nonexistent local times require correction.

Opening an event and returning with Back keeps the filters and list position. Refresh preserves selected filters and recalculates relative time bounds.

## Read coverage before interpreting results

The limit is per camera, defaulting to 12 and constrained to 1–100. Filtering searches that loaded recent metadata, not the provider's complete archive. Coverage messages show limits and source failures. Healthy sources remain available when another fails.

Protect can supply completed recordings without structured timestamps. Those stay under **Time unavailable** with All loaded events and are excluded from date filters. Native Netatmo basic recordings have timestamps but no inferred detection category; All types includes them.

## Columns and compatibility

Standalone event `columns` is an optional positive integer, default one. Individual camera cards use `variables.event_columns` for the popup browser. Both are internal grid preferences, separate from HA's native card width; narrow space may show fewer columns.

Existing single-camera `entity` configurations and the legacy `custom:marao-frigate-events-card` name remain supported. Use either a single camera or the ordered `cameras` list. An explicit empty list stays empty and makes no event requests.

See the [card catalog](../../cards/) for source-specific examples. Camera previews on this website use sample content; real playback and transport remain Home Assistant/device behavior.
