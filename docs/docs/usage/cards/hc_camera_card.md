---
hide_table_of_contents: true
title: Camera Card
layout: page
parent: Cards
---

# Camera Card

The `hc_camera_card` shows a live Home Assistant camera feed. Tap it to open a
generated popup containing the camera's latest Frigate or UniFi Protect events;
hold it to open Home Assistant's normal more-info dialog.

The camera entity should come from either the
[Frigate Home Assistant integration](https://docs.frigate.video/integrations/home-assistant/)
or the [UniFi Protect integration](https://www.home-assistant.io/integrations/unifiprotect/).
Marao detects the provider from Home Assistant, so the basic configuration is
the same for both:

```yaml
  - type: custom:button-card
    template: hc_camera_card
    entity: camera.front_door
```

Generated dashboards create the Bubble Card popup automatically.

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

For a manually authored dashboard, pair the card with a Bubble Card popup that
uses the same hash:

```yaml
  - type: custom:button-card
    template: hc_camera_card
    entity: camera.front_door
    variables:
      popup_hash: "#camera-front-door"

  - type: custom:bubble-card
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
| popup_hash | `#camera` | No | Bubble Card popup hash. Generated dashboards set a unique value. |
| event_provider | `auto` | No | Provider override: `frigate` or `unifiprotect`. |
| frigate_camera | Camera entity metadata | No | Frigate camera name override. |
| frigate_instance_id | Camera entity metadata | No | Frigate integration instance ID override. |
| unifi_protect_media_source | Automatic discovery | No | Full camera-level UniFi Protect media-source URI override. |
| event_limit | `12` | No | Maximum recent events to request. |
