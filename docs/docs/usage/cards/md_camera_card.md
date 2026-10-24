---
hide_table_of_contents: true
title: Camera Card
layout: page
parent: Cards
---

# Camera Card

The existing `md_camera_card` shows Home Assistant's current still while its
native player starts muted inline live video. Playback replaces the still
automatically once the video advances; there is no new card, setting or opt-in.
A missing or failed still does not prevent live startup. Unknown, unavailable
and disconnected cameras stay neutral and clear old media. Tap an available
card to open its generated popup with live video above Frigate, UniFi Protect or Netatmo events.

Choose **Dashboard stream** (the existing camera entity) and **Popup stream** in
the builder or native card editor. Select a lower-quality camera entity for the
dashboard and a higher-quality entity for the popup. An empty Popup stream uses
the dashboard entity. Both views use exactly the selected entity; quality does
not change automatically. Home Assistant uses native WebRTC when supported, with
its normal playback fallback.

Tap the popup video to open that same stream full screen with native controls.
Rotate the device for landscape viewing and exit fullscreen to return to the
popup. Browsers that cannot enter native fullscreen use a full-window view with a close
button. OS rotation lock still applies. Unready video or unsupported viewing shows
a readable reason.

Healthy playback shows only the video and an optional slim title row above it.
The dashboard builder and native card editor expose **Title** and **Show title**
together in the basic form; `name` sets the title and
`show_name: false` removes its whole row while retaining the saved name. Titles
are visible by default and wrap when needed. Legacy camera icon, state and label
options stay stored but no longer add visible content.

Loading, buffering, an explicitly labelled `Snapshot` fallback and recovery
feedback appear inside the media area only when needed. Recording activity
alone never means that live playback has started. There is no permanent Live
or quality footer. Unsupported native video keeps the snapshot and
its readable reason. Reported failures expose **Retry** without an automatic
retry loop. If Safari or another browser rejects muted autoplay, **Start live
view** appears as exceptional recovery; tap it once to play inline without
opening the events popup or enabling audio.

Live video requires a stream supported by Home Assistant's native camera player
and the browser's codec capabilities. For UniFi Protect, configure the existing
camera entity and stream integration in Home Assistant first. Event-provider
and media-source overrides below select recorded events only. Marao does not
change Protect settings, leave privacy mode, turn cameras on or add NVR URLs.

Video stops when its card or containing sheet is hidden, the page backgrounds,
the camera becomes unavailable or the card is removed. Visibility and
availability recovery use the same automatic still-to-live path. Read-only
editor previews start no stream. See the [camera lifecycle notes](../../development/camera-live.md)
for the native bridge and verification boundary.

The camera entity should come from the
[Frigate Home Assistant integration](https://docs.frigate.video/integrations/home-assistant/),
the [UniFi Protect integration](https://www.home-assistant.io/integrations/unifiprotect/),
or the [Netatmo integration](https://www.home-assistant.io/integrations/netatmo/).
Marao detects the provider from Home Assistant, so the basic configuration is
the same for all three:

```yaml
  - type: custom:marao-card
    template: md_camera_card
    entity: camera.front_door
```

Generated dashboards create the Marao popup automatically. For example:

```json
{
  "entity_id": "camera.front_door_low",
  "template": "md_camera_card",
  "variables": {"popup_stream_entity": "camera.front_door_high"}
}
```

## Event timeline

Events appear full width with their timestamp and type above each preview. The
filter bar stays at the top of the events section while scrolling; choose
**All** or an available type. Older entries appear as you scroll, with a
**Load more** button also available. Previews load near the visible area instead
of delaying the whole list. Opening an event and using **Back** restores the
selected filter and your position. Use **Refresh** to reload events or retry a
failed preview.

Filters cover the recent metadata returned within `event_limit` (12 by default,
rounded and clamped to 1–100), not an unlimited recording archive. Protect keeps
its native last-24-hours window and completed clips. Native Protect titles are
split into timestamp and type when recognized; other titles remain above the
preview unchanged.

## Frigate overrides

Override Frigate's identifiers when the entity metadata does not match the
configured camera, or change the number of events:

```json
{
  "entity_id": "camera.front_door",
  "variables": {
    "frigate_camera": "front",
    "frigate_instance_id": "frigate-main",
    "event_limit": 24
  }
}
```

## UniFi Protect overrides

UniFi Protect cameras are matched through Home Assistant's media browser. If a
camera is offline, in privacy mode, or cannot be matched automatically, copy its
camera-level media-source URI from Home Assistant's Media browser:

```json
{
  "entity_id": "camera.driveway_high",
  "variables": {
    "event_provider": "unifiprotect",
    "unifi_protect_media_source": "media-source://unifiprotect/<nvr_id>:browse:<camera_id>",
    "event_limit": 24
  }
}
```

Protect events come from the last 24 hours and only include completed clips.
The UniFi Protect integration user must have permission to read camera media,
and the events must be visible in Home Assistant's Media browser.

## Netatmo cameras

Configure the camera in Home Assistant's Netatmo integration first. Marao detects
it automatically; `event_provider: netatmo` is also available as an override.
Live video, dashboard/popup stream selection and fullscreen use the same native
camera player. Netatmo recordings use Home Assistant's native HLS player with
inline controls.

The event timeline includes person, vehicle, animal, motion and other types
reported by Netatmo. A recording containing several detections appears in each
matching filter. Its original description appears in the detail view. Previews
load only near the visible area and recordings resolve only when opened.
The timeline contains recent recordings already available to Home Assistant,
subject to `event_limit`, Netatmo retention, recording availability and camera
read permissions. It does not download an unlimited archive.

Home Assistant does **not** expose live streaming for Netatmo video doorbells.
Marao cannot add a live stream that the integration does not provide; available
recordings still use the event timeline. No Netatmo credentials, person IDs,
monitoring changes or direct device controls are added to the dashboard.

## Manual popup

For a manually authored dashboard, pair the card with a Marao popup that
uses the same hash:

```yaml
  - type: custom:marao-card
    template: md_camera_card
    entity: camera.front_door
    variables:
      popup_hash: "#camera-front-door"

  - type: custom:marao-popup-card
    card_type: pop-up
    hash: "#camera-front-door"
    entity: camera.front_door
    cards:
      - type: custom:marao-card
        template: md_camera_card
        entity: camera.front_door_high
        show_name: false
        tap_action:
          action: fullscreen
      - type: custom:marao-camera-events-card
        entity: camera.front_door
        limit: 12
```

Event thumbnails and clips use each integration's authenticated Home Assistant
proxy and signed media paths. No NVR password or Home Assistant access token is
added to the card configuration.

## Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| popup_stream_entity | Dashboard entity | No | Camera entity for live video above events in the generated popup. |
| popup_hash | `#camera` | No | Marao popup hash. Generated dashboards set a unique value. |
| event_provider | `auto` | No | Provider override: `frigate`, `unifiprotect` or `netatmo`. |
| frigate_camera | Camera entity metadata | No | Frigate camera name override. |
| frigate_instance_id | Camera entity metadata | No | Frigate integration instance ID override. |
| unifi_protect_media_source | Automatic discovery | No | Full camera-level UniFi Protect media-source URI override. |
| event_limit | `12` | No | Maximum recent events available to filters and scrolling (1–100). |

Reported media or history failures affect the whole card and keep a readable reason. Use the visible Retry or Refresh control to try again; event details also keep Back. Useful readings and actions with available targets remain usable. A failed actual control target shows a partial warning and disables that action. Problem surfaces take priority over artwork and custom colors.

### Slow connections

After live playback starts, brief buffering keeps the video frame visible with a
localized buffering label instead of covering it with a snapshot. The native
player stays mounted and resumes automatically.

For a slow connection, choose an enabled lower-quality camera entity as the
Dashboard stream. Select an enabled higher-quality entity for Popup stream when
more detail is needed. Marao does not enable camera entities, alter Protect
settings, estimate bandwidth or switch the chosen quality automatically.

## Preload the dashboard stream

Enable **Preload stream in background** in the camera card settings to start its
Dashboard stream when opening any page of the same dashboard. It is off by
default. Enabled streams use bandwidth and device resources on other dashboard
pages; choose a lower-quality Dashboard stream where appropriate. Popup video
and events still load only when opened. Background playback stops when leaving
that dashboard or hiding the browser tab, and resumes when eligible. Slow camera
startup or browser playback restrictions can still require loading or a tap.
