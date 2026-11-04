---
title: Navigation and current room
description: Configure destinations and follow this browser's selected room sensor.
---

Marao's floating navbar stays in one row and leaves room for the phone's safe area. When destinations do not fit, **More destinations** opens a vertical menu. Saved destinations remain reachable in their configured order.

Configure navigation once in [dashboard settings](../../start/dashboard/). Administrators can hold the bar for two seconds to open editing, settings and cache maintenance. Short taps still navigate. Regular users do not receive administrator settings or editing controls.

## Follow the current room

Enable **Current room** in Marao settings and Save. Under **Current room → This browser**, select **Area sensor for this browser**, such as `sensor.iphonix_area`. Under **Rooms and pages**, map the sensor's current Home Assistant `area_id` to an existing page in this dashboard. A person or person-to-sensor mapping is unnecessary for this mode.

The chain is **this browser/WebView → selected Area sensor → current `area_id` → mapped page**. The selected sensor is authoritative, even if an account-linked person is Away or unavailable. Marao uses the sensor's current `attributes.area_id`; registry assignment, display names and last-seen history are not current location.

The shared example below belongs inside `marao.navbar`. The sensor selection stays local and is not added to this YAML:

```yaml
current_room:
  enabled: true
  rooms:
    living_room:
      path: /marao-dashboard/living-room
    kitchen:
      path: /marao-dashboard/kitchen
```

Use the sensor's exact area IDs and your existing view paths. Settings show the saved resolution chain and a labelled, read-only draft preview. Editing shared mappings affects live navigation only after Save. Selecting a local sensor applies immediately using saved mappings, independently of Save/Cancel or closing settings.

Room mappings use the same icon, two-line summary, disclosure and options-menu rows as navigation pages. **Add room** opens the new row's page configuration. Complete it before Save or remove the unfinished row through its options menu. Saved mappings remain collapsed until opened.

## A stable shortcut

The first navbar slot remains reserved while location changes. In a known room, it uses the mapped page's name and icon; tapping it opens that room. Moving between rooms updates the shortcut without redirecting the page being read. Extremely narrow hosts put the location entry inside More with the other destinations.

A missing, unknown, unavailable or unmapped sensor, unusable area ID or deleted destination keeps a disabled neutral placeholder. Direct sensor mode does not substitute a previous room, another sensor or an Away page. Correct the indicated stage in settings. Regular users can follow their existing readable source and should ask an administrator to change it.

## Browser storage and shared accounts

The selection belongs to this browser/WebView's storage, scoped to the HA origin, dashboard and signed-in account. The account separates private preferences; it does not identify location or physical hardware. For example, an iPhone using `sensor.alex_phone_area` and a tablet using `sensor.hall_tablet_area` can share one HA account and retain different choices in their separate storage contexts. Tabs sharing the same browser storage and scope share the latest saved choice.

Reloads and normal browser, Companion app or HA restarts retain the choice while that storage survives. Another browser/profile, Companion installation, scheme/host/port or cleared site/app data needs separate setup. Private browsing and copied/restored profiles do not provide a stable physical-device identity. No cross-device synchronization or hardware detection occurs.

**Clear / Reset this selection** writes an explicitly unconfigured choice, leaving a neutral shortcut after reload. It does not reactivate an old person override. When storage fails, the selected source can apply until reload with **Not saved** feedback; it is not copied into dashboard configuration. Unreadable storage stays neutral until a deliberate choice. Unsupported newer records remain preserved and read-only; upgrade Marao before editing them. Deliberate supported replacements retain the exact previous local record in a scoped recovery entry without touching authentication or other clients' data.

## Legacy person tracking and Away

Existing person mappings and raw local person preferences remain unchanged. Without a new client preference, a readable existing setup retains its released behavior and is labelled **Legacy person tracking**. The direct sensor selector stays empty; Marao does not infer which carried device is viewing the dashboard.

After selecting or clearing a direct source, choose **Use legacy person tracking** deliberately to restore this compatibility mode. Its shared **Legacy people and location sources** mappings and local **Person / Automatic** controls remain available. Automatic matches a unique linked HA account/person, using HA person records and stable IDs when the live entity omits the link. A manual person choice overrides that association.

Only legacy mode uses person Home/Away presence and the optional `away_path`. Confirmed Away takes precedence over a lingering room reading; unknown/unavailable presence remains neutral. Create the Away page yourself and choose it in settings. These legacy shared fields and their unknown options remain intact; direct browser choices do not rewrite them.
