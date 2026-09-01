---
title: Camera providers
layout: default
---

# Camera providers

The Marao camera card displays Home Assistant's live stream. Selecting the feed
opens a dialog and loads recent events only then. Selecting an event opens its
clip, snapshot, or thumbnail without unmounting the live feed.

Configure and test Frigate or UniFi Protect in Home Assistant first. The card
uses Home Assistant's authenticated APIs and media source, so provider
credentials and Home Assistant access tokens do not belong in card YAML.

## Options

| Option | Default | Purpose |
| --- | --- | --- |
| `entity` | — | Required Home Assistant camera entity. |
| `name` | Entity friendly name | Optional displayed name. |
| `event_provider` | `auto` | `auto`, `frigate`, or `unifi_protect`. |
| `frigate_camera` | Entity metadata | Frigate camera name override. |
| `frigate_instance_id` | Entity metadata | Frigate integration instance override. |
| `unifi_protect_media_source` | Automatic discovery | Camera-level UniFi Protect media-source ID. |
| `event_limit` | `12` | Recent event limit from 1 to 100. |

## Frigate

The card normally reads the Frigate instance and camera name from the camera
entity. Basic configuration is often enough:

```yaml
type: custom:marao-camera-card
entity: camera.front_door
```

If the card cannot link the entity to Frigate, set both identifiers explicitly:

```yaml
type: custom:marao-camera-card
entity: camera.front_door
event_provider: frigate
frigate_camera: front_door
frigate_instance_id: frigate-main
event_limit: 12
```

Event metadata comes from the Frigate Home Assistant integration. Thumbnails,
clips, and snapshots use short-lived signed Home Assistant paths. If an event
has no recording or snapshot, the card uses its thumbnail.

## UniFi Protect

Automatic discovery matches the selected entity to Home Assistant's UniFi
Protect media source by entity, device, and name. The integration user must be
allowed to view camera media and events.

```yaml
type: custom:marao-camera-card
entity: camera.driveway
event_provider: unifi_protect
```

If automatic matching fails, copy the camera-level ID from Home Assistant's
media browser and provide it explicitly:

```yaml
type: custom:marao-camera-card
entity: camera.driveway
event_provider: unifi_protect
unifi_protect_media_source: "media-source://unifiprotect/<console_id>:browse:<camera_id>"
event_limit: 12
```

The card reads completed clips from the provider's most recent 24-hour media
folder. Thumbnails and clips are resolved through Home Assistant's media
source.

## Troubleshooting

- Confirm the camera streams correctly in Home Assistant.
- Confirm events or clips are visible through the provider integration.
- Refresh the browser after installing or updating Marao Dashboard.
- Set `event_provider` if automatic detection chooses incorrectly.
- For Frigate, verify both override identifiers against the entity metadata.
- For UniFi Protect, verify media permissions and the media-source ID.
