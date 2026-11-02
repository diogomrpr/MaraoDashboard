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

Keep the recovery download and reload before retrying. For conversion, use the recovery copy's saved-state check to distinguish original, converted and divergent data. Never replace an uncertain dashboard with a starter configuration. See [migration and recovery](../migration/).

## Report a reproducible problem

Include the Marao release, Home Assistant version, browser/app, expected result, observed result and a minimal sanitized card configuration. Remove tokens, alarm codes, camera media, household data and private URLs. Name the affected scenario or option so the issue can be reproduced with fictional devices.
