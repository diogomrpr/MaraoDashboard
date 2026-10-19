# Spec Delta

## ADDED Requirements

### Requirement: Cross-platform client frontend refresh
An explicit frontend refresh SHALL request the current server-provided frontend on Android Companion, iOS Companion and mobile browsers. Supported native cache clearing SHALL be preferred where available; other hosts SHALL use compatible web recovery. Missing native bridges, service workers or cache APIs SHALL NOT disable refresh. Other hosts with compatible browser APIs SHALL use the web path. Complete OS/browser cache erasure SHALL NOT be claimed.

#### Scenario: Supported iOS app
- **WHEN** refresh is requested in an iOS Companion version supporting native frontend cache reset
- **THEN** the local WebView cache-reset and reload mechanism is requested
- **AND** the operation does not depend on service-worker availability

#### Scenario: Android app
- **WHEN** refresh is requested in Android Companion
- **THEN** a supported web recovery path requests fresh frontend files inside the existing app WebView
- **AND** it does not send an unsupported iOS-only reset command or intentionally open an external browser

#### Scenario: Mobile browser or other compatible host
- **WHEN** refresh is requested in a mobile browser or a host without a supported native reset bridge
- **THEN** available frontend web caches are invalidated and fresh navigation is requested through browser-compatible APIs
- **AND** the operation does not rely on a browser-specific hard-reload argument

#### Scenario: Local HTTP or unavailable APIs
- **WHEN** service-worker/cache APIs are absent, denied or unavailable on a local HTTP origin
- **THEN** refresh still attempts fresh navigation without an uncaught exception or waiting indefinitely for those APIs
- **AND** unavailable cleanup is not reported as successful complete cache deletion

### Requirement: Refresh preserves client and dashboard intent
Frontend refresh SHALL preserve sign-in, preferences, saved dashboard configuration and the current origin, page path, existing query parameters and fragment, allowing only a transient recovery parameter. It SHALL NOT clear authentication/site settings storage, regenerate configuration, call entity services or modify another device. Unsaved edits SHALL be protected by blocking refresh with readable guidance until the user saves or discards them.

#### Scenario: Current page and authentication survive
- **WHEN** a signed-in user refreshes a deep-linked page with existing query parameters and a fragment
- **THEN** the frontend returns to that same origin, page and fragment with the original query values retained
- **AND** the user remains signed in, preferences remain intact and browser history gains no duplicate page entry

#### Scenario: No server or settings mutation
- **WHEN** refresh is completed on one device
- **THEN** saved JSON, generated YAML, raw/custom content, route order, themes, HA settings and historical snapshots are unchanged
- **AND** no entity service, integration reload, server restart or cross-device cache action is dispatched

#### Scenario: Unsaved work exists
- **WHEN** refresh is requested while Home Assistant or Marao reports unsaved edits
- **THEN** localized guidance asks the user to save or discard first
- **AND** no cache eviction, native reset or navigation occurs and the draft remains unchanged

### Requirement: Bounded refresh recovery and failure
Each completed hold SHALL start at most one refresh operation per document. An absent, rejected or ineffective native handoff SHALL fall back to web recovery within a bounded interval while the same document remains active. Cache cleanup SHALL be bounded and failure SHALL NOT silently strand the user. Terminal failure SHALL show a localized readable error and permit deliberate retry. Recovery SHALL NOT automatically repeat across reloads.

#### Scenario: Native bridge accepts no action
- **WHEN** a native reset command returns without acknowledgement but the original visible document remains active beyond the handoff deadline
- **THEN** the same operation attempts web recovery once
- **AND** it does not wait forever or keep resending native commands

#### Scenario: Cleanup rejects or stalls
- **WHEN** an available frontend-cache cleanup operation rejects or exceeds its deadline
- **THEN** the error is retained for diagnostics and fresh navigation is still attempted within the overall deadline
- **AND** the UI does not claim that all caches were cleared

#### Scenario: Offline or failed recovery
- **WHEN** the server is unreachable before destructive cleanup, or a refresh attempt fails while the existing page remains available
- **THEN** a readable error is displayed without an automatic reload loop
- **AND** authentication/settings remain intact, offline detection preserves usable cached content and a later explicit retry is possible

#### Scenario: Duplicate and resumed input
- **WHEN** multiple navbar instances, repeated pointer events or a resumed background timer encounter an operation already in progress
- **THEN** no second refresh operation starts
- **AND** navigation/removal clears obsolete timers and lifecycle listeners

### Requirement: Fresh Marao resource identity after refresh
After a completed deployment and integration resource registration, a successful client refresh SHALL load the server's current content-versioned Marao entry, dependent modules and deferred assets. Recovery SHALL preserve resource version propagation and SHALL NOT reuse an old in-memory module graph. Server deployment or registration errors SHALL remain errors and SHALL NOT be disguised by repeated client resets.

#### Scenario: Server assets have changed
- **WHEN** a client with previously loaded assets refreshes after the server registers a new frontend fingerprint
- **THEN** the new document uses that current fingerprint for Marao entry and dependent assets
- **AND** opening deferred content uses the same current resource version

#### Scenario: A server deployment is incomplete
- **WHEN** the server still registers old resources or cannot serve a required current file
- **THEN** client recovery does not claim to have repaired deployment or repeatedly reload itself
- **AND** the resource failure remains visible to the relevant diagnostics/checks
