---
title: Card activity
description: Recorded events in a filterable Marao sheet.
---

Tap the Activity icon on Sensor and Access cards, or on a button/scene activation reading. The card action remains separate: opening Activity never operates a device. Normal light color and switch/climate chart icons keep their existing actions. Hidden icons and editor previews do not introduce another action.

The sheet uses Home Assistant’s recorded Logbook and state history, newest first. A large date separator starts each day; events show their time on a rail beside circular icons. Expand an event inline for its source and recorded details. A state change is confirmed feedback; a recorded request, when the source supplies one, remains a request. Missing feedback is never invented. The chart remains available for an affected numeric source.

Choose Today, Yesterday, Last 7 days, or a Custom range of at most 31 calendar days in Home Assistant’s configured time zone. Date and the Filters button stay visible above the scrolling timeline. Tap Filters to expand event type and other available controls; the button shows how many of these filters are active. Choosing Custom range opens its date inputs automatically. Multiple explicitly configured sources enable a source filter. Origin and initiator filters appear only when recorded metadata supports attribution; unknown origin never means a manual action. Filters are temporary and apply before the first 50 events are displayed. Load earlier reveals more matching events.

```yaml
type: custom:marao-access-card
entity: button.gate
variables:
  activity_entities:
    - binary_sensor.gate_contact
```

Only the primary entity and this explicit list are queried. History is read in bounded daily/source chunks; missing Recorder coverage cannot be reconstructed. Empty results and failed or incomplete coverage have different messages. Retry is explicit. Closing the sheet or changing account, source, dashboard or date invalidates pending results. No raw service payloads, alarm codes or privileged actor lookups are stored.

Primary sensor dates, forecasts, schedules and chart sample times remain content. Automatic Updated and scene/button last-activation labels are replaced by Activity.
