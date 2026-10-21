# Proposal

## Why

Marao's navbar contains the frontend reload action, so delaying or losing it also removes the user's recovery control. The user additionally reports that holding a route icon on Android displays a URL during the three-second wait and prevents refresh; navigation and recovery must become available before dashboard content and remain usable when that content stalls or fails.

## What Changes

- Make navbar startup the next implementation priority, ahead of further camera-quality work. Register minimal generated/native navigation and reload before starting optional card, history, camera-event or editor work, and activate it as soon as saved configuration is available.
- Render a native navbar from its existing validated route configuration without waiting for `marao_dashboard/native/card`, entity metadata or entity-state readiness.
- Retain one usable navbar during same-dashboard view replacement and content failures; hand over configuration without duplicate controls or reload handlers. Release it and restore normal HA chrome when leaving its owning context.
- Ensure a continuous three-second hold works on every visible part of the horizontal pill: background, padding, gaps, selected/unselected destinations, icon descendants and More. Prevent Android URL/link previews, context menus, text selection or dragging from interrupting an eligible hold. Preserve ordinary taps, keyboard activation, overflow scrolling and existing cancellation rules.
- Keep reload feedback, English/Portuguese copy, haptics and existing dirty/edit/preview/modal protections available without loading optional content modules. Preserve offline preflight, sign-in, settings, same-page recovery and current resource fingerprints.
- Add controlled delayed/failed-module and disconnected-server cases, native host coverage and long-press regression checks. Record Android browser/Companion versions only when actually inspected; desktop emulation alone does not establish that a native URL preview is gone.

Observed in source: `MaraoDashboard.js` awaits the shared cards and event module; `MaraoCards.js` awaits history-data and refresh imports; native wrappers import the catalog/shared runtime and compile every card over WebSocket; generated/native composition places a navbar after page content. The current hold implementation already has a `contextmenu` guard and CSS callout suppression. The Android failure is user-reported, has not been reproduced in this planning task, and its precise cause remains unconfirmed.

Assumption: HA's shell can run JavaScript and provide the saved dashboard/navbar configuration. "Always available" means independent of optional Marao content after that prerequisite, not recovery from a frozen browser, a failed HA bootstrap, or an uncached first visit with no server.

Non-goals: camera playback changes, a general application loader/cache manager, new dashboard options, new route slots or a new navigation design, global prevention of browser gestures, server restart/integration reload, configuration regeneration, third-party cards, automatic reload loops or production-instance access. Empty navigation remains deliberately empty.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation-popups`: Early usable navigation, continuity and bounded ownership, and an uninterrupted hold across the complete horizontal navbar and all icon/control descendants.
- `integration-lifecycle`: An independently registered, content-versioned navigation/recovery bootstrap that does not depend on optional content imports or a native-card compilation response.

## Impact

- Planning baseline: `68a9deb96ffd5164949ac6c20f040beed57d654d`, with pre-existing working-tree work preserved. Planning-only affected-card set: empty. Implementation affects generated `custom:marao-navbar-card`, native `custom:marao-native-navbar-card`, standalone/preview hosts and overflow. Shared shell, popup, route, localization and helper consumers are regression boundaries.
- Runtime: `frontend/MaraoDashboard.js`, `MaraoCards.js`, `MaraoFrontendRefresh.js` and a minimal extracted navbar/bootstrap module if needed. Native adapter/editor source remains in `frontend_src/`; generated assets must come from the existing build.
- Registration: `__init__.py`/`const.py` only as needed to register/unload versioned critical assets through existing HA APIs. Builder, Python validation/generator and templates keep their persisted contracts; existing navbar descriptors must work without regeneration.
- Compatibility: retain custom-element names, route fields/order/labels/icons, explicit emptiness, unknown keys, native editing and generated YAML, raw/protected content, historical snapshots and auth/preferences. Existing released JSON/native storage fixtures require identity preservation, not a new format migration. Resource entry changes require focused setup/reload/unload proof and, if installation behavior changes, scoped preserved-install release evidence.
- Verification/documentation: extend existing navbar/refresh/native checks, controlled local fixture, canonical gallery and one realistic page under `/marao-dashboard`, `tests/verification-map.js`, source/check inventory and usage/development guidance. No new dependencies are planned.
- This follows `refresh-frontend-from-navbar-hold` and completed `support-navbar-overflow`; it preserves their hold duration, recovery safeguards and single-row overflow behavior. The baseline spec's old five-route wording remains a separate pending synchronization issue, not permission to reinstate a cap. The earlier refresh change excluded recovery when the navbar could not execute; this change explicitly improves that boundary without claiming recovery before HA itself loads.
