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
| Title (`md_title_card`) | Entity-free heading; name and optional icon. |
| Weather (`md_weather_card`) | Native weather entity; name, icon and `show_forecast`. |
| Room (`md_room_card`) | Destination page, optional primary light and explicit `light_entities`; name and icon. Its All off action targets only those lights. See [Room](md_room_card.md). |
| Scenes (`md_scene_collection_card`) | Ordered native scene, switch or input-boolean members, each with its own name/icon. Native scenes activate once; switches and input booleans toggle. Empty collections show a localized empty message. |
| Alarm (`md_security_card`) | Native alarm state and generated supported-mode sheet with transient PIN entry and deliberate disarm/bypass holds. |
| Access opener (`md_access_slide_action_card`) | Explicit lock, cover, button, switch or script target. A completed strict slide uses native unlock/open/press/turn-on; ordinary button/switch defaults do not change. |
| Security action (`md_access_hold_action_card`) | Selected native button, switch or input boolean; a completed 1.2-second hold presses or toggles that exact target once. |
| Reading (`md_base_card`) | Numeric sensor; name, icon, custom label/color and compatible display unit/precision. |
| Energy period (`md_energy_period_card`) | Numeric sensor; `period` is `day` or `month`, with independent name/icon and reading format. The summary and history sheet share those settings and show recorded period consumption, not the lifetime reading. |
| Media app (`md_media_app_card`) | Media player and nonempty `app_source`; name/icon. A tap selects that source once. |

Required bindings must be selected or the draft card removed before saving.
Unknown, unavailable, missing and disconnected targets use the shared neutral
state and disable entity actions. Navigation remains usable independently of
an optional entity. Names and icons belong to each card occurrence, so the same
entity can appear differently on several pages.

Access openers place the icon beside the wrapping title, above the strict slide
control. Inside the track, the action label stays beside the resting thumb even
in narrow columns; long localized labels wrap and the track grows vertically.
Light, fan and cover cards use the same header, including light/fan
variants whose slider is disabled or unsupported. Explicitly hidden titles and
icons remain hidden in pages, popups and native previews.

Media cards expose ordered Apple TV apps, remote, and optional volume target in
their card editor. An explicitly empty app list stays empty; `apple_tv: false`
keeps the generic controls. A remote volume target uses native remote commands;
a media-player volume target uses native volume services. See [Media](md_media_card.md).
Wallbox current cards expose zero through three finite current presets; an empty
list does not restore defaults.

Generated sheets use page and local card identities. Duplicating a page creates
independent identities and retargets its internal sheet links. Renaming a page
retargets known internal links; deletion requires resolving remaining links.
Supported older configurations retain compatible explicit sheet references.
Raw cards and unknown options are retained; raw sheets stay where they were
authored. Manual YAML cards must point to an actual sheet in their own view.
# Uniform access controls

Access summaries, strict openers, close/lock actions and lock/cover-targeted
guarded actions share the light/cover 174px minimum outer height and title/icon
header. Text and errors can grow beyond that baseline. Gesture and service
contracts remain unchanged. Use fixed-column sections for a continuous mixed
control grid; full-width panels belong in separate explicit sections. Raw and
automatic layouts retain their saved composition. Manual/native cards share the
minimum; `custom:marao-control-grid` provides equal rows throughout one container.

### One energy meter for today and this month

Use the same cumulative energy sensor with `period: day` and `period: month`.
For example, a meter reading 10250 kWh with boundary readings of 10240 kWh today
and 10000 kWh this month shows 10 kWh and 250 kWh. No Utility Meter is required.
Recorder sum statistics are preferred (`total` or `total_increasing` sources);
otherwise recorded counter history must establish the period baseline. Resets
are handled using the source's state class. Statistics can lag the live reading.
Missing history stays empty; partial recorded totals show an approximation mark.
Calculated cost uses that period consumption, while dedicated cost sources retain
precedence. Visible connected cards refresh at most once a minute and follow HA's
local calendar boundaries. Popup period navigation does not change the tile.
