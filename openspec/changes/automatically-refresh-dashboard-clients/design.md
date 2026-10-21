# Design

## Context

See proposal.md for motivation. Existing `_async_refresh_dashboard` forces HA to reload generated YAML; clients receive configuration changes but keep loaded JavaScript. The current editor WebSocket command completes generation, refreshes YAML, reads history and returns success. Frontend registration already computes a content fingerprint. MaraoFrontendRefresh already implements bounded reachability checks, platform-specific reload handling and frontend-only cache cleanup.

The navbar startup path remains available when content initialization fails. Put automatic coordination alongside this early path, not inside the camera renderer or deferred editor. Coordinate with remove-native-dashboard-authoring so this feature introduces no dependency on discontinued standalone wrappers.

## Goals / Non-Goals

**Goals:** two independent triggers feeding one existing refresh operation; ordinary-user delivery; no repeated reloads on ordinary opens; preservation of unsaved edits and stored data.

**Non-Goals:** forced OS-level cache deletion, client fleet acknowledgements, periodic polling, automatic generation on reconnect, refreshing unrelated HA pages, a first-release retrofit into already-loaded old JavaScript, or changing generator formats.

## Decisions

### Deliver refresh coordination over an authenticated subscription

Add a small read-only WebSocket subscription, proposed name `marao_dashboard/frontend/subscribe`, returning the active frontend fingerprint plus subsequent lifecycle and save notifications. Ordinary authenticated users can subscribe; the endpoint exposes no entities, configuration or secrets and has no client-supplied broadcast operation. Validate dashboard scope against the integration-owned registration. Keep generation administrator-only.

Store active identity and subscribers in the existing integration runtime state. Scope save events to the generated dashboard key and give each successful save a unique opaque request ID, even for identical content. Publish only after all processing required for a successful editor response completes. Queue the normal success result before publishing the refresh request; clients must also protect editor dirty state. Service generation and history restoration retain existing behavior and do not gain unconditional save-triggered reloads in this scope.

A dedicated subscription avoids relying on undocumented HA frontend resource-reload behavior or placing control tokens in persisted dashboard YAML. Reuse HA's supported subscription cleanup and authentication patterns. The initial subscription delivers current identity, not an old save as a new instruction. A connected client that received a save retains its pending request across temporary disconnection; a device absent during the save need not replay it later.

### Detect future frontend changes independently

Publish active identity only after successful integration setup and current asset registration. Use the existing content fingerprint, not package version. Compare it with the fingerprint of the code loaded by the client. Subscribe early; reestablish identity on WebSocket reconnect, integration reload and foreground resume, with one owned subscription and no background polling. Integration unload publishes an unavailable identity without dropping the WebSocket-owned listener; successful setup publishes the new identity. Disconnect/unsubscribe releases listeners. Foreground renewal subscribes before releasing the previous listener, avoiding a delivery gap.

A matching identity does nothing. A mismatch requests refresh, including rollback to a different fingerprint. Save-triggered refresh bypasses this comparison entirely. The first deployment still requires old sessions to load the handler; no existing configuration field makes old code invoke recovery.

### Reuse refresh execution and bound attempts

Extend the existing refresh owner with pending reasons: save request IDs and a target fingerprint. Coalesce reasons arriving before one reload; a later independent save can trigger another reload. Scope small session-storage markers by HA origin and dashboard, retaining only bounded pending/attempt state, never dashboard data or authentication. Mark an attempt before navigating so the new document cannot loop; validate target identity after reload and show failure if still stale. Distinguish preflight deferral from an actual attempted cleanup/reload.

Missing or denied coordination storage must not fall back to an unguarded reload loop: expose manual recovery instead. Manual navbar recovery remains available independently of automatic-attempt markers. Existing refresh failures remain errors, and failed native handoff retains the current bounded browser fallback. Do not blanket-delete local storage, IndexedDB, cookies or arbitrary Cache Storage entries.

### Refresh only when safe and applicable

Only active generated-dashboard sessions execute recovery. Defer in hidden/offline states, HA edit mode, unsaved editor state, active pointer/hold/slider interactions and open control popups. Resume pending work on the corresponding state transitions rather than timers that repeatedly reload. Avoid interrupting an in-flight service interaction; do not dispatch services during recovery.

Clear pointer tracking when the document becomes hidden or leaves the page,
including a retained back/forward-cache document. Android can suspend its WebView
without delivering `pointerup` or `blur`; that missing event must not leave a
foreground update permanently deferred. Continue respecting open popups, edits
and real service interactions after the app returns.

The editor remains open to show save success; it is not itself the target dashboard. If navigation later returns to the dashboard, evaluate pending recovery then. Reuse existing dirty-state and modal/gesture ownership signals, extending their shared owner only where necessary. Localize brief updating/deferred/failure feedback through the existing refresh labels. Preserve full URL and native Android in-app reload handling.

### Validate actual delivery and fresh assets

Extend existing refresh unit and local stale-cache fixtures. Verify authenticated ordinary-user subscription, post-success emission and no emission for failure/dry run. Use two browser sessions to demonstrate one editor save refreshes another dashboard, repeated identical saves each work, and version mismatch refreshes without a save. Assert current loaded asset identity, retained route/auth/preferences/source and no unintended entity dispatch. Test deferral, overlap, storage denial and stale-after-reload failure with bounded attempts.

Use focused affected checks because authentication, lifecycle and stored-data preservation are involved. Add relevant generated gallery/realistic-page cases rather than standalone native examples. Actual Android device behavior is a separate evidence limit; browser emulation is not physical-app proof. Do not run comprehensive suites implicitly.

## Risks / Trade-offs

- Save & Generate now interrupts viewing on other devices → This is explicitly requested; show brief feedback, retain the current route and defer during editing/control interactions.
- Cache cleanup may affect HA frontend responses shared at the current origin → Reuse the existing targeted cleanup, preserve auth/settings and leave unrelated data alone.
- Update arrives while assets are unavailable → Publish after setup succeeds, preflight reachability and retain bounded manual recovery without loops.
- An identical save cannot be distinguished by content hash → Use a unique save request ID independently of frontend identity.
- Existing clients lack the handler → Clearly document the first-load boundary; do not claim that the next release can remotely execute absent code.
- Server success does not prove every device refreshed → Report generation and local recovery separately; avoid a new fleet-status system.

## Migration Plan

Implement against a fresh task snapshot, retaining unrelated work. No source/output schema or HA config-entry version changes are needed. Supported released configurations retain identity transformations and existing migration/recovery paths; do not add coordination fields to historical fixtures or rewrite archives.

Deploy coherent backend and frontend assets to disposable 192.168.0.28 for focused verification, capturing exact private backups before fixture writes. Restore any changed safe fixtures and verify unrelated dashboard data remains unchanged; leave successful current assets installed. On rollback restore matching package and any affected backed-up owned data together, preserving unrelated edits and immutable history. Coordination markers must tolerate missing/older endpoints without breaking dashboard rendering.

Before a later push/tag/release use the scoped publication gate; select preserved-install upgrade proof for the changed installation/lifecycle behavior during explicit release preparation. The current workflow creates planning artifacts only.

## Implementation verification adjustment

The user's implementation request and updated AGENTS.md replace the proposed browser campaign with minimal local checks and user phone testing. No extra gallery fixtures, browser automation or deployment is required for this turn. Use the existing frontend-refresh unit suite and targeted backend WebSocket/lifecycle assertions; record unverified device behavior explicitly. Starting commit remains `68a9deb96ffd5164949ac6c20f040beed57d654d`; dirty baseline is `/private/tmp/marao-auto-refresh-implementation.json`. Shared consumers are generated navbar/startup, refresh recovery and service-interaction completion; unrelated camera and native-authoring work is excluded.
