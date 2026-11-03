---
title: Troubleshooting
description: Resolve loading, configuration, location, history and editing problems.
---

Start with the visible error and the affected entity. Keep a copy of the configuration before changing it. A reported failure is useful information; hiding the card does not resolve its cause.

## Marao does not appear in Add card

Confirm HACS installed the **Dashboard** package, the `MaraoFrontend.js` resource is registered once as a JavaScript module, and the complete release files are present. Refresh Home Assistant or reopen the companion app after an update. An old Integration installation needs [migration](../migration/), not an in-place category change.

If the resource fails to load, check the browser's reported URL and status. Do not add a second resource URL to compensate for an incomplete installation.

## A card is unknown or unavailable

Check its exact `entity_id` in Home Assistant and confirm that the entity itself works. A missing reference is retained so it can be corrected; it is not silently replaced with another device. A disconnected Home Assistant disables device actions until the connection returns.

Some options require capabilities the device must expose. Slider settings cannot add brightness or position support, and open-only access points correctly omit closing.

## A popup or link opens the wrong place

Check the dashboard address and view path. Native page renaming does not automatically repair explicit navbar links or `popup_view` references. A popup layout must be an unambiguous Sections view in the same dashboard. Choose **Automatic** in the card's Popup layout field to use the retained automatic content.

To edit popup content, use **Edit popup** in its saved card's native editor. Save new or modified cards first and reopen their editor. Save-first guidance retains unresolved drafts; a missing or ambiguous linked source is an error, not a request to regenerate the view.

Popup editing does not download a file. If settings and controls differ, stale
controls are disabled until a confirmed update or explicit Edit popup succeeds.
Resolve other unsaved drafts first. Browser storage must be available to stage a
write. If a save cannot be confirmed, reopen the editor to check the saved state;
divergent data remains blocked without rollback or repeated writes.

## The current-room shortcut shows a placeholder

Confirm all of the following:

1. Current room is enabled in Marao settings.
2. The signed-in user has a uniquely linked Home Assistant person, or you selected a person in Location preferences.
3. That person has a configured Bermuda Area sensor.
4. The sensor exposes the current room's `area_id` and that ID maps to an existing page.
5. The person is currently home. Confirmed away presence takes priority over a stale room reading.

The placeholder deliberately keeps the navbar stable. Unknown or unavailable presence is not treated as confirmed Away. See [current room](../../features/navigation/).

## Camera events are missing from a filter

Filters search the loaded recent metadata, not the provider's full archive. The event limit applies per camera. Read the source coverage and failure messages: a healthy source can remain usable while another fails.

Protect records without a structured timestamp appear under **Time unavailable** only with All loaded events. Native Netatmo recordings do not have inferred detection types; select All types to include them. Date ranges use Home Assistant's timezone. A custom time that is missing or ambiguous during a daylight-saving change must be corrected.

Real camera playback uses Home Assistant's native transport. Verify the selected camera works there and check the dashboard versus popup stream entity. The website's examples do not test your stream or network.

## History or energy values are empty

Check that the selected entities have recorder/history or statistics data for the requested interval. Missing data stays missing rather than becoming zero. Display units must be compatible with the actual source unit. A missing price can leave energy usable while estimated cost is unavailable.

## A schedule cannot be edited

Schedule administration requires an administrator, supported UI-managed automation/helper APIs and recognized owned records. Customized, partial or newer records can become read-only. Export recovery data and review the native automation and traces before reconciling. Do not delete helpers by display name or repeatedly retry an ambiguous resource write.

## A save or conversion cannot be confirmed

For conversion, keep its recovery download and use the recovery copy's saved-state
check to distinguish original, converted and divergent data. Popup edits instead
use a temporary internal browser transaction and provide no recovery download.
Never replace an uncertain dashboard with a starter configuration. See
[migration and recovery](../migration/).

## Report a reproducible problem

Include the Marao release, Home Assistant version, browser/app, expected result, observed result and a minimal sanitized card configuration. Remove tokens, alarm codes, camera media, household data and private URLs. Name the affected scenario or option so the issue can be reproduced with fictional devices.
