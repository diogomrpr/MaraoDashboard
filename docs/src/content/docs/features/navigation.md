---
title: Navigation and current room
description: Configure destinations, follow the room you are in and keep an optional Away page.
---

Marao's floating navbar stays in one row and leaves room for the phone's safe area. When destinations do not fit, **More destinations** opens a vertical menu. Saved destinations remain reachable in their configured order.

Configure navigation once in [dashboard settings](../../start/dashboard/). Administrators can hold the bar for two seconds to open editing, settings and cache maintenance. Short taps still navigate. Regular users do not receive administrator settings or editing controls.

## Follow the current room

Enable **Current room** in Marao settings. For each person, select the Bermuda **Area** sensor for the device they carry. Map Home Assistant area IDs to existing pages in the same dashboard.

Marao automatically selects the unique `person.*` linked to the signed-in Home Assistant user. This works when each phone uses its owner's own HA account. The selected person's current Area sensor `area_id` determines the room; an entity's registered area or last-seen value is not a current location.

The example below belongs inside `marao.navbar`:

```yaml
current_room:
  enabled: true
  people:
    person.alex:
      area_sensor: sensor.alex_phone_area
  rooms:
    living_room:
      path: /marao-dashboard/living-room
    kitchen:
      path: /marao-dashboard/kitchen
  away_path: /marao-dashboard/away
```

Use the sensor's exact area IDs and your existing view paths. Configure the person's Home/Away tracking in Home Assistant as well as Bermuda's room tracking.

## A stable shortcut

The first navbar slot remains reserved while location changes. In a known room, it uses the mapped page's name and icon; tapping it opens that room. Moving between rooms changes the shortcut without redirecting the page you are reading.

If the person is confirmed outside home, the slot can open the optional **Away** page. Create that page in Home Assistant and select it in Marao settings. Choose whatever content is useful away from home; Marao does not create or populate it automatically.

Unknown, unavailable, unlinked or unmapped location keeps a disabled neutral away-style placeholder. A stale room sensor cannot override confirmed away presence. Without an Away destination, the slot remains a placeholder. Extremely narrow hosts put the location entry inside More with the other destinations.

## Shared devices

On the main page, **Location preferences** lets any signed-in user choose a person explicitly or return to **Automatic**. The override is local to this browser or WebView, dashboard and account. It does not change other devices or the shared person-to-sensor configuration.

Clearing browser storage removes the override. If storage cannot be written, the choice applies to the current session with a visible message. Bermuda follows the carried device; leaving a phone or watch behind changes the accuracy of the room shortcut.
