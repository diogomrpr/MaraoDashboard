# Proposal

## Why

The permanent administrator Edit dashboard link adds unwanted visual clutter to normal dashboard use. The navbar already has a three-second maintenance hold, so it can offer editor access on demand without another persistent control.

## What Changes

- A completed eligible navbar hold opens a small maintenance sheet for administrators, offering Edit dashboard when a configured editor route exists and Clear cache/refresh.
- Regular users keep the current direct cache-clear/refresh behavior on the same hold and never receive the maintenance menu or editor action.
- Remove the permanent landing-page editor link and its editor-only spacing. Preserve the existing optional cache-reset button and its visibility setting.
- Retain the current three-second threshold, visible progress, cancellation, strong haptics and ordinary tap/overflow behavior. Use localized menu guidance for administrators and refresh guidance for regular users.
- Preserve the actual editor route, custom dashboard roots and collision-safe editor paths. With an empty navbar, retain the documented direct-route/bookmark fallback; do not fabricate a route or restore a persistent shortcut.

Observed: `MaraoNavigation.js` binds the hold completion directly to `_refreshFrontend()` and separately prepends the permanent editor link in `_syncPageRefresh()`. `native-strategy.js` already supplies administrator-only `editor_path` and an internal editor view. Intended: branch at completion using the current authenticated user, then recheck privileges before menu actions. Assumption: admin navbar hosts without an editor route can offer refresh alone rather than inventing an editor destination.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation-popups`: role-dependent navbar hold completion, administrator maintenance sheet, matching feedback and removal of the permanent editor shortcut.
- `visual-builder`: administrator editor access through the maintenance action or retained direct route, without a permanent dashboard button.

## Impact

Shared runtime: `MaraoNavigation.js`, existing hold helper/feedback and native editor-route metadata; all native/generated navbar hosts and retained navigation surfaces. Affected runtime card family: navbar only. Reuse existing refresh and navigation actions, theme tokens and localization; no third-party cards or new persisted option.

Supported released source, `show_cache_reset`, configured routes and explicit empty navigation remain valid and unchanged. No source, envelope, compiler or entry-version migration; no backend, generator ownership or saved data change. Existing HA authorization still protects editor writes. UI removal is not an authorization boundary.

The unfinished `move-marao-to-native-frontend` delta currently requires a permanent visible admin landing-page link. This new accepted direction supersedes that access-placement clause; implementation must reconcile that exact clause without completing or archiving unrelated native-migration work. Baseline hold specifications also currently require direct refresh for every user; their role-dependent behavior is changed here.

Non-goals: changing the hold duration, repurposing route taps, removing the optional cache-reset button, adding Home-only gestures, new sidebar dashboards, automatic saving, editor authorization changes or a release.

Planning baseline: `e9840fa40de4750a2f267bca7fce02e698d3cc14` (v0.22.2). Preserve unrelated untracked duplicate source/helper files. This request creates planning artifacts only.

The subsequent `configurable-main-page-shortcuts` decision supersedes the no-permanent-shortcut placement clause: an optional administrator pencil button is enabled by default. Maintenance behavior and its guards remain unchanged.
