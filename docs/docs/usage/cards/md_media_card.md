---
hide_table_of_contents: true
title: Media Card
layout: page
parent: Cards
---

# Media Card

The `md_media_card` shows the localized player state and opens its control popup
when tapped. Generic players have previous, play/pause and next icon controls;
unknown or unavailable players disable their actions.
Available artwork appears behind a dark overlay so the summary stays readable.
The card uses a plain background when artwork is absent, disabled or unavailable.

![Media Card Light](../../../assets/images/cards/md_media_card/mediacard_light.png)

Reported media or history failures affect the whole card and keep a readable reason. Use the visible Retry or Refresh control to try again; event details also keep Back. Useful readings and actions with available targets remain usable. A failed actual control target shows a partial warning and disables that action. Problem surfaces take priority over artwork and custom colors.

## Usage

```yaml
  - type: custom:marao-card
    template: md_media_card
    entity: <media entity>
```

Generated dashboards create the corresponding popup automatically. For a
manually authored dashboard, add a Marao popup with the same `popup_hash`
as the media card.

The visual builder edits this card on any page, including its ordered apps and
remote targets. A separate `md_media_app_card` selects its configured
`variables.app_source` directly. App buttons do not inherit the Media sheet link.
Each generated card occurrence has an independent popup identity, so duplicate
pages can reuse one player with different names and options.

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

App shortcuts appear first in the same compact, responsive three-column grid used
by media-page app sections. Six apps fit in two rows on ordinary phone widths;
narrower popups reduce the column count. The remote below follows the Apple TV layout: back,
up, home; left, select, right; rewind, down, fast-forward; then volume,
play/pause, volume. Without `volume_remote_entity`, the normal media-player
volume services are used.

App shortcuts show the logo across the full square card, without a visible title
or normal player-state line. The configured app name remains the accessible button
label. Unavailable players still show a readable warning and disable launching.
Enabled app tiles show a pointer cursor, a soft theme-colored outer shadow and a slight lift
on hover. Pressing adds a softer shadow and a short compression on mouse or touch;
disabled tiles keep their neutral appearance. These cues apply to both page and
popup shortcuts.

Logo-only app sections use an 80px cell minimum, so three shortcuts fit on
ordinary phone widths while configured columns still reflow on narrower hosts.
Unavailable messages can wrap and grow the row.
YouTube, Netflix, Disney+, Prime Video, Apple TV, Plex, Spotify and MEO shortcuts automatically
use their real app icons and brand colors. MEO and MEO Go use the simple official MEO mark. Recognition uses the configured app source
(including its bundle ID), so you can keep your own display name. Icons ship with
Marao and do not require an external image service while using the dashboard.
Other apps retain their configured icon and theme colors. Existing source values,
actions and custom card colors are preserved.

Rewind moves back 10 seconds and fast-forward moves ahead 30 seconds, using the
live playback position and staying within the media duration. Direction and
select controls support both a short press and a 1.2-second hold. A completed
hold sends one longer remote command; releasing early uses the short action,
while cancellation or moving outside the control sends neither.

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| md_show_background_art | true | No | Show available Home Assistant artwork behind the summary. |
| md_background_color | var(--color-purple) | No | Background when artwork is absent or disabled. |
| popup_hash | `#media` | No | Marao popup hash for manually authored dashboards. Generated dashboards set a unique value. |

## Display controls on the dashboard

Set **Display** to **On dashboard** to show a Now playing section followed by the
existing playback controls. Configured Apple TV players also show their ordered
apps, directional remote and volume controls. A dedicated one-column section is
recommended; changing Display never changes section columns or sibling order.

Now playing follows HA's current title, artist, album/series or source details,
playback state and enabled artwork. Paused playback keeps the current item;
idle/off shows Nothing playing. Incomplete active metadata and unavailable playback
have distinct feedback. Artwork can still be disabled with the existing option.

The optional JSON setting is `variables.media_display: inline` or `popup`.
Missing means Popup and is not inserted by unrelated edits. Each occurrence can
choose independently. Switching back preserves app/remote options and restores
the popup. Explicit external popup definitions remain saved. If another authored
link still targets an automatic sheet removed by inline mode, Save reports that
link instead of silently breaking or retargeting it. Inline controls reuse the
same availability guards, errors, short/long commands and service targets as Popup.
