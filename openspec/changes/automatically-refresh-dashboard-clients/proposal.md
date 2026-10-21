# Proposal

## Why

Android sessions can show broken cards after a Marao upgrade until the user holds the navbar to refresh frontend caches. Save & Generate already updates dashboard configuration on connected devices, but does not replace their loaded frontend code; automate recovery through two explicit triggers.

## What Changes

- Every successful editor Save & Generate sends a refresh request to connected generated-dashboard clients, even when configuration and frontend version are unchanged. Failed saves, dry runs and previews do not request refresh.
- Add a frontend-version handler so subsequent Marao updates independently trigger cache cleanup and reload when a client's loaded fingerprint differs from the server's active fingerprint. Ordinary opens with matching versions do not refresh.
- Reuse the existing frontend cache-refresh operation, preserve the current route, authentication and preferences, and defer automatic refresh while editing or interacting. Support regular signed-in dashboard users as well as administrators.
- Deduplicate requests and bound automatic attempts to prevent reload loops. Retain manual navbar recovery and readable failure feedback.
- Document that older clients without this handler may need an initial manual refresh; the proposal does not claim to retrofit already-loaded JavaScript.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `integration-lifecycle`: authenticated refresh delivery after successful editor generation, current frontend identity discovery, and safe automatic client recovery.

## Impact

Observed owners are the editor generation WebSocket handler and `_async_refresh_dashboard` in `__init__.py`, content fingerprint registration, MaraoDashboard/MaraoNavigation startup, MaraoFrontendRefresh cache cleanup, and editor dirty-state handling. Focused checks must cover event authorization/delivery, stale clients, deduplication and data preservation, plus actual generated-dashboard reloads. Reuse existing refresh fixtures and checks; no new dependency or standalone native-authoring feature is required.

Acceptance: repeated successful saves each refresh connected eligible clients once without a version condition; unsuccessful saves do not; a later frontend update refreshes mismatched clients without a save; matching versions do nothing; regular users receive the signal; dirty/hidden/offline clients defer safely; no loops, entity actions or saved-data changes occur.

No generator JSON, historical fixture, generated card contract or config-entry format migration is proposed. Existing configurations, protected content, independent dashboards and immutable history remain supported. Runtime coordination state is separate from dashboard data. Backend-only changes with identical frontend contents do not need a frontend refresh.

Planning baseline: `68a9deb96ffd5164949ac6c20f040beed57d654d`, snapshot `/private/tmp/marao-auto-refresh-proposal.json`; unrelated dirty work is preserved. The current artifact-only task affects no cards. Implementation affects generated cards collectively through shared startup/navigation and refresh, including popup and camera consumers. This proposal does not implement or publish the feature, diagnose the screenshot conclusively, or promise universal OS-level cache deletion.
