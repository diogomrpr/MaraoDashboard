# Proposal

## Why

Marao settings present current-room controls as a flat set of forms, separate the local person choice into another popup, and make failed room resolution difficult to understand. Organize the feature in one administrator settings popup, reuse the navbar's expandable rows for room/page mappings, and make the user-to-location association explicit and reliable.

## What Changes

- Remove the dedicated Location preferences/current-room settings button and its standalone popup, without adding a replacement shortcut.
- Keep Navigation bar, Current room and Dashboard shortcuts as clear settings sections. Divide Current room into General, People and location sources, Rooms and pages, and This browser.
- Use the navbar configuration's expandable summary rows, icons, chevrons, native selectors and row actions for room-to-page mappings. Show the room and destination together; retain the keyed mapping format without adding ordering settings.
- Provide explicit person and carried-device Area sensor selection, show the linked Home Assistant account and source device when available, and explain how to repair a missing account link in HA People settings.
- Use the signed-in HA user as the automatic identity, resolve its uniquely linked person, then use that person's explicitly selected Bermuda Area sensor. Retain the browser-local person override for shared devices; do not infer the viewing phone from browser or hardware identifiers.
- Embed the browser's person selector, Automatic action and persistence feedback in This browser, with the resolved account/person/source/room/page or a specific corrective explanation. Use the same resolution rules for settings feedback and the navbar, and fix defects in this shared path rather than adding UI-only fallbacks.
- Restrict these controls to administrators, as explicitly confirmed by the user. Ordinary users retain current-room navigation and existing saved device choices but can no longer edit those choices through Marao.
- Preserve immediate local preference updates, existing storage keys and shared dashboard Save/Cancel behavior. Reject incomplete or duplicate mapping drafts, including partially filled new rows, instead of silently saving the previous mapping or ignoring the attempted addition.
- Update English/Portuguese guidance and the affected documentation and assertions.

Observed in code: shared mappings already live in dashboard settings, automatic user/person resolution already exists, and the separate popup changes only a browser/account override. Mapping forms lack subsection boundaries and navbar-style summaries; new-row callbacks ignore incomplete or duplicate additions without marking Save invalid. The reported room-detection malfunction has not been reproduced on HA, so no specific runtime root cause is claimed. Intended behavior is defined by the resolution and validation acceptance cases in the delta spec. The existing decisions to remove the extra popup/button and require administrator editing remain in force.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation-popups`: structured administrator settings, navbar-style room/page rows, explicit user/person/location-source associations, consistent resolution feedback and lossless mapping validation; one popup owns shared settings and local preferences.

## Impact

Affected card set: `custom:marao-navbar-card` and the automatic dashboard-wide navigation surface. Shared consumers include navbar route-row presentation, main-page shortcut layout, dashboard settings, shared location resolution, local preference updates, identity guidance and modal lifecycle.

Runtime ownership is in `MaraoNavigation.js`, `MaraoLocation.js` and `MaraoLocationPreferences.js`; editable popup source is `frontend_src/dashboard-settings-dialog.js`, using `location-settings.js` and `dashboard-settings.js`. Existing navbar/settings Node tests, safe navigation examples and navigation/setup/troubleshooting documentation cover this path. Rebuild the generated settings bundle through the existing build command.

Compatibility: keep version-1 `marao` settings, `navbar.current_room`, local preference key/value formats, routes, explicit emptiness, unknown fields and native dashboard content unchanged. Existing overrides remain readable for all accounts. No data conversion, generator/default change, backend endpoint, dependency or version bump is planned. The intentional access change supersedes the all-user preference UI described by the completed `add-current-room-navbar-shortcut` change; its local storage and resolution guarantees remain in force.

Non-goals: implementing a room-presence integration, automatic physical-device identification, arbitrary location-provider formats, changing Away precedence or navbar slots/overflow, regular-user refresh holds, editing HA account links, other card families or additional settings popups.
