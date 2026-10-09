---
hide_table_of_contents: true
title: Media Card
layout: page
parent: Cards
---

# Media Card

The `hc_media_card` shows the localized player state and opens its control popup
when tapped. Generic players have previous, play/pause and next icon controls;
unknown or unavailable players disable their actions.
Available artwork appears behind a dark overlay so the summary stays readable.
The card uses a plain background when artwork is absent, disabled or unavailable.

![Media Card Light](../../../assets/images/cards/hc_media_card/mediacard_light.png)

## Usage

```yaml
  - type: custom:marao-card
    template: hc_media_card
    entity: <media entity>
```

Generated dashboards create the corresponding popup automatically. For a
manually authored dashboard, add a Marao popup with the same `popup_hash`
as the media card.

## Apple TV

Apple TV is detected from the entity name, ID, device model, or manufacturer.
Set `apple_tv` explicitly when the automatic detection cannot identify it. Pass
the Apple TV remote and any app shortcuts in the entity configuration used by
the dashboard generator:

```json
{
  "entity_id": "media_player.living_room_apple_tv",
  "apple_tv": {
    "remote_entity": "remote.living_room_apple_tv",
    "volume_remote_entity": "remote.living_room_tv",
    "apps": [
      { "name": "YouTube", "source": "YouTube", "icon": "mdi:youtube" },
      { "name": "Plex", "source": "Plex", "icon": "mdi:plex" }
    ]
  }
}
```

App shortcuts appear first in a two-column grid. The remote below follows the Apple TV layout: back,
up, home; left, select, right; rewind, down, fast-forward; then volume,
play/pause, volume. Without `volume_remote_entity`, the normal media-player
volume services are used.

Rewind moves back 10 seconds and fast-forward moves ahead 30 seconds, using the
live playback position and staying within the media duration. Direction and
select controls support both a short press and a 1.2-second hold. A completed
hold sends one longer remote command; releasing early uses the short action,
while cancellation or moving outside the control sends neither.

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| hc_show_background_art | true | No | Show available Home Assistant artwork behind the summary. |
| hc_background_color | var(--color-purple) | No | Background when artwork is absent or disabled. |
| popup_hash | `#media` | No | Marao popup hash for manually authored dashboards. Generated dashboards set a unique value. |
