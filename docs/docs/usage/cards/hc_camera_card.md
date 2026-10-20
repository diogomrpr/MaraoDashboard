---
hide_table_of_contents: true
title: Camera Card
layout: page
parent: Cards
---

# Camera Card

The existing `hc_camera_card` shows Home Assistant's current still while its
native player starts muted inline live video. Playback replaces the still
automatically once the video advances; there is no new card, setting or opt-in.
A missing or failed still does not prevent live startup. Unknown, unavailable
and disconnected cameras stay neutral and clear old media. Tap an available
card to open its generated Frigate or UniFi Protect events popup.

`Live` means video is advancing. Loading and an explicitly labelled `Snapshot`
fallback are separate states; camera recording activity alone never means that
live playback has started. Unsupported native video keeps the snapshot and
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

The camera entity should come from either the
[Frigate Home Assistant integration](https://docs.frigate.video/integrations/home-assistant/)
or the [UniFi Protect integration](https://www.home-assistant.io/integrations/unifiprotect/).
Marao detects the provider from Home Assistant, so the basic configuration is
the same for both:

```yaml
  - type: custom:marao-card
    template: hc_camera_card
    entity: camera.front_door
```

Generated dashboards create the Marao popup automatically.

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

## Manual popup

For a manually authored dashboard, pair the card with a Marao popup that
uses the same hash:

```yaml
  - type: custom:marao-card
    template: hc_camera_card
    entity: camera.front_door
    variables:
      popup_hash: "#camera-front-door"

  - type: custom:marao-popup-card
    card_type: pop-up
    hash: "#camera-front-door"
    entity: camera.front_door
    cards:
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
| popup_hash | `#camera` | No | Marao popup hash. Generated dashboards set a unique value. |
| event_provider | `auto` | No | Provider override: `frigate` or `unifiprotect`. |
| frigate_camera | Camera entity metadata | No | Frigate camera name override. |
| frigate_instance_id | Camera entity metadata | No | Frigate integration instance ID override. |
| unifi_protect_media_source | Automatic discovery | No | Full camera-level UniFi Protect media-source URI override. |
| event_limit | `12` | No | Maximum recent events to request. |

Reported media or history failures affect the whole card and keep a readable reason. Use the visible Retry or Refresh control to try again; event details also keep Back. Useful readings and actions with available targets remain usable. A failed actual control target shows a partial warning and disables that action. Problem surfaces take priority over artwork and custom colors.

### Slow connections

After live playback starts, brief buffering keeps the video frame visible with a
localized buffering label instead of covering it with a snapshot. The native
player stays mounted and resumes automatically.

For UniFi Protect, the card starts immediately with the lowest enabled, available
main stream of the same registered camera device. Keep your existing camera
entity configured: it remains the card's identity and event target. The alternate
entities need channel and resolution metadata. Marao never enables streams,
changes camera settings, uses another device or selects a package-camera view.
Missing metadata or alternate channels leave the configured stream unchanged.

The working lower tier stays selected and is labelled “Reduced quality”. Retry
also starts with the lowest eligible tier. If no stream can play, the card reports
a bounded failure. Automatic upgrades to higher quality are not included yet.
Existing downward recovery can select a newly available lower tier after sustained
trouble; this starts a new native stream. This is stream selection, not transcoding
or a guarantee of uninterrupted video.
