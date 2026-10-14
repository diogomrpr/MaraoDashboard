---
title: Editable page cards
layout: page
parent: Cards
---

# Editable page cards

Every page uses the same card picker and ordered sections. **Add page** creates
an editable snapshot from Home, Rooms, Room, Security, Energy, Wallbox or Media,
or an empty page. Later generation respects edits and removals. A template does
not keep adding its original cards. See [configuration](../../installation/configuration.md)
for page creation, landing selection and navbar pins.

| Card | Binding and editable options |
| --- | --- |
| Title (`hc_title_card`) | Entity-free heading; name and optional icon. |
| Weather (`hc_weather_card`) | Native weather entity; name, icon and `show_forecast`. |
| Room (`hc_room_card`) | Destination page, optional primary light and explicit `light_entities`; name and icon. Its All off action targets only those lights. See [Room](hc_room_card.md). |
| Scenes (`hc_scene_collection_card`) | Ordered native scene, switch or input-boolean members, each with its own name/icon. Native scenes activate once; switches and input booleans toggle. Empty collections show a localized empty message. |
| Alarm (`hc_security_card`) | Native alarm state and generated supported-mode sheet with transient PIN entry and deliberate disarm/bypass holds. |
| Access opener (`hc_access_slide_action_card`) | Explicit lock, cover, button, switch or script target. A completed strict slide uses native unlock/open/press/turn-on; ordinary button/switch defaults do not change. |
| Security action (`hc_access_hold_action_card`) | Selected native button, switch or input boolean; a completed 1.2-second hold presses or toggles that exact target once. |
| Reading (`hc_base_card`) | Numeric sensor; name, icon, custom label/color and compatible display unit/precision. |
| Energy period (`hc_energy_period_card`) | Numeric sensor; `period` is `day` or `month`, with independent name/icon and reading format. The summary and history sheet share those settings. |
| Media app (`hc_media_app_card`) | Media player and nonempty `app_source`; name/icon. A tap selects that source once. |

Required bindings must be selected or the draft card removed before saving.
Unknown, unavailable, missing and disconnected targets use the shared neutral
state and disable entity actions. Navigation remains usable independently of
an optional entity. Names and icons belong to each card occurrence, so the same
entity can appear differently on several pages.

Media cards expose ordered Apple TV apps, remote, and optional volume target in
their card editor. An explicitly empty app list stays empty; `apple_tv: false`
keeps the generic controls. A remote volume target uses native remote commands;
a media-player volume target uses native volume services. See [Media](hc_media_card.md).
Wallbox current cards expose zero through three finite current presets; an empty
list does not restore defaults.

Generated sheets use page and local card identities. Duplicating a page creates
independent identities and retargets its internal sheet links. Renaming a page
retargets known internal links; deletion requires resolving remaining links.
Supported older configurations retain compatible explicit sheet references.
Raw cards and unknown options are retained; raw sheets stay where they were
authored. Manual YAML cards must point to an actual sheet in their own view.
