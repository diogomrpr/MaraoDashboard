# Integration lifecycle

## Purpose

Install and manage Marao through Home Assistant while retaining owned resources,
administrator boundaries, user configuration and restorable generated versions.

## Requirements

### Requirement: Native integration setup
Marao SHALL be a single-entry HACS custom Integration with a Home Assistant config
flow. Setup SHALL register its static assets, runtime modules, admin editor,
generation service, theme and authenticated management commands. HACS users
SHALL NOT need Node, test dependencies or manual third-party card resources.

#### Scenario: First configuration
- **WHEN** the user adds the integration
- **THEN** Marao creates its initial configuration from enabled visible
  supported entities, generates the base dashboard and patches owned configuration
- **AND** later restarts preserve the saved dashboard rather than replacing user edits

### Requirement: Starter discovery and limited repair
Initial discovery SHALL exclude disabled, hidden and stateless registry entries,
group supported entities by entity/device area, and use a Home fallback room when
only supported unassigned entities exist. No supported entities SHALL produce a
valid empty starter. Discovery SHALL persist explicit membership once. Later
setup SHALL preserve saved membership, including empty dashboards; generated-asset
repair SHALL NOT repopulate contents from the registry.

#### Scenario: Entities become available after an empty first setup
- **WHEN** setup encounters a saved empty starter and newly discovered supported entities
- **THEN** it preserves that empty configuration rather than adding rooms or entities automatically
- **AND** the administrator can add supported entities through the editor

#### Scenario: An existing user configuration is not a recognized starter
- **WHEN** setup encounters that configuration
- **THEN** it preserves the user's source instead of resetting it from the registry

#### Scenario: First setup creates populated rooms
- **WHEN** no saved configuration exists and supported entities are assigned to HA areas
- **THEN** discovery creates useful explicit room contents with optional suggestion-area associations
- **AND** subsequent registry changes do not alter that membership

#### Scenario: A saved dashboard is intentionally emptied
- **WHEN** the administrator saves an empty room or removes all rooms and restarts
- **THEN** setup preserves the saved empty contents even under the default dashboard name and slug

### Requirement: Administrator management API
The editor at `/marao-dashboard-editor` and WebSocket commands
`marao_dashboard/config/get`, `marao_dashboard/config/generate`, and
`marao_dashboard/history/restore` SHALL require administrator access. Validation
failures SHALL return readable structured errors without accepting invalid data.

#### Scenario: A non-administrator attempts management
- **WHEN** a non-administrator calls a builder management command
- **THEN** Home Assistant denies the request rather than exposing or modifying dashboard configuration

### Requirement: Content-versioned frontend registration
Marao SHALL register a no-store bootstrap under HA's network-only `/api/`
namespace. It SHALL select the installed content fingerprint before importing
runtime modules. Module dependencies, deferred editor modules, styles and workers
SHALL use the selected fingerprint's API path. Unload SHALL remove the registered
editor and owned module URLs. Assets SHALL ship with the integration and SHALL
NOT require a CDN or extra user installation.

#### Scenario: A frontend asset changes
- **WHEN** the integration reloads after deployment
- **THEN** content-versioned resource URLs change and the refreshed browser loads current workspace assets

#### Scenario: JSON is first opened after an editor asset update
- **WHEN** the administrator requests the deferred editor in the refreshed panel
- **THEN** its module, styles and workers load from bundled resources with the panel's current fingerprint path
- **AND** stale prior-version assets or external editor resources are not substituted

#### Scenario: JSON resources are prepared in the background
- **WHEN** a refreshed panel prepares JSON resources before the first tab selection
- **THEN** preparation and foreground use resolve the same versioned resource and applicable locale identities
- **AND** foreground opening reuses successful preparation without duplicate module initialization or worker instances
- **AND** a failed or obsolete preparation cannot substitute unversioned or prior-version resources

#### Scenario: The editor is built for Visual startup
- **WHEN** the integration's editor assets are generated and checked
- **THEN** optional JSON resources remain separate from the Visual startup module and stylesheet
- **AND** enabling background preparation does not increase the approved eager asset budgets

#### Scenario: Cached bootstrap URL after an update
- **WHEN** cached dashboard HTML requests a bootstrap URL bearing an older fingerprint
- **THEN** the server selects the currently installed fingerprint without a manual cache clear
- **AND** all imported Marao assets use that fingerprint's path

#### Scenario: Stale or partially replaced asset
- **WHEN** an asset request names another fingerprint or its bytes changed after setup
- **THEN** the server rejects it without cacheable wrong-version content

#### Scenario: Public static boundary
- **WHEN** a caller requests an unlisted path or traversal through the asset endpoint
- **THEN** no file outside the reviewed frontend snapshot is returned

#### Scenario: Additional content-versioned frontend registration contracts
- **WHEN** frontend resources are loaded, updated or unregistered
- **THEN** The previous flat entry URL SHALL
remain a compatible bootstrap when requested from the server.

### Requirement: Generation service and dry run
`marao_dashboard.generate_dashboard` SHALL accept the configured JSON path,
optional dashboard key, and `dry_run`. A dry run SHALL validate and plan without
writing generated output or patching Home Assistant configuration.

#### Scenario: A configuration is checked before generation
- **WHEN** the service is called with `dry_run: true`
- **THEN** it returns the planned dashboard key/files without modifying the existing dashboard

### Requirement: Local version history and restoration
Successful generations SHALL retain local snapshots of JSON and the exact
generated dashboard directory, including custom cards, under
`dashboard/MaraoDashboard/.history`. History SHALL retain the latest 20 distinct
versions, avoid duplicate identical snapshots, and validate restore identifiers.
The current version SHALL be saved before a restore.

#### Scenario: An administrator restores an earlier version
- **WHEN** a valid stored version is selected and confirmed
- **THEN** its JSON and exact generated directory are restored together
- **AND** the previous current version remains available to undo the restoration

#### Scenario: A restore identifier is malformed or missing
- **WHEN** the requested version does not identify a valid snapshot
- **THEN** restoration reports an error rather than reading arbitrary paths or claiming success

### Requirement: Validated save and recoverable generation
Save & Generate SHALL preflight configuration before replacing saved JSON and
snapshot a valid current dashboard before regeneration. If generation fails and
that baseline exists, JSON and generated files SHALL be restored together. Failures
SHALL remain errors; an absent/invalid baseline SHALL NOT imply guaranteed rollback.

#### Scenario: Generation fails after a valid baseline was saved
- **WHEN** Save & Generate encounters a generation exception
- **THEN** it reports failure and restores the prior JSON and generated directory

### Requirement: Owned configuration and legacy migration
Theme/dashboard configuration patches and legacy resource migration SHALL preserve
unrelated settings and cards. Only exact owned legacy entries SHALL be migrated
or removed; ambiguous/manual leftovers SHALL be surfaced through the existing
Repair flow. A changed dashboard key SHALL replace only the previous owned
registration, leaving unrelated dashboards intact.

#### Scenario: A legacy resource resembles an unrelated resource
- **WHEN** migration cannot identify it as an exact owned legacy entry
- **THEN** it leaves the unrelated resource intact and reports any required manual repair

### Requirement: Bundled theme synchronization
Setup/reload SHALL synchronize bundled Marao theme files into
`themes/MaraoDashboard`; local edits to those owned copies can be replaced.
Unrelated themes SHALL be preserved.

#### Scenario: An installed Marao theme differs from the bundled theme
- **WHEN** the integration sets up or reloads
- **THEN** the owned theme copy is updated from the bundle while unrelated theme files remain intact

### Requirement: Recoverable conversion to explicit room membership
Legacy room configuration SHALL convert to explicit membership once. Existing
entity lists, including empty lists, SHALL take precedence over area expansion;
area-only legacy rooms SHALL receive one snapshot. Explicit include/exclude and
overrides SHALL retain their effective selections/options. Conversion SHALL
preserve unknown fields, raw cards, layout and navigation, retain a recoverable
baseline, be idempotent and keep dry runs and read-only previews free of writes.

#### Scenario: A legacy explicit list was edited in JSON
- **WHEN** a legacy room contains an area association and a shortened or empty entity list
- **THEN** conversion uses that list and explicit legacy adjustments without discovering omitted area entities
- **AND** the converted room retains the area as suggestion metadata only

#### Scenario: A legacy room has only an area source
- **WHEN** conversion encounters an unconverted room without an explicit list
- **THEN** it snapshots its effective supported area entities once, including applicable legacy adjustments
- **AND** subsequent conversions and registry updates do not expand it again

#### Scenario: A current-format entity property is removed
- **WHEN** the administrator deletes that property after conversion
- **THEN** it represents an empty room rather than restarting legacy discovery

#### Scenario: Conversion fails or is previewed
- **WHEN** validation fails, conversion cannot safely complete, or the request is a dry run/read-only preview
- **THEN** no saved JSON or generated output is replaced by that attempt
- **AND** failures remain readable errors with the original baseline retained

#### Scenario: Historical configuration is restored
- **WHEN** an old version containing an area-linked configuration is restored
- **THEN** the historical JSON and generated directory retain the existing exact-restore behavior
- **AND** its next edit/save follows explicit-membership conversion without rewriting the stored historical version

### Requirement: Versioned page-model conversion
Historical sources SHALL convert through ordered versions into editable pages, preserving routes/names/icons, navigation, selected cards/entities, options, layouts, explicit emptiness/deletions, unknown/raw/protected content. Derived selections SHALL resolve once under accepted room-membership rules. Ambiguous or unsupported input SHALL fail before mutation instead of resetting the dashboard.

#### Scenario: An installed dashboard uses every former guided page
- **WHEN** its configuration is upgraded
- **THEN** independent editable pages retain its alarm/access/actions, energy periods/history/loads, charging controls/presets and player/remote/app settings
- **AND** its existing routes, navbar choices and custom content remain usable

#### Scenario: Historical selections are explicitly empty
- **WHEN** conversion processes empty access/player/card selections or removed optional pages
- **THEN** those selections remain empty or absent instead of being replaced by template or registry defaults

#### Scenario: A source mixes conflicting old and new page models
- **WHEN** compatibility preflight cannot determine one unambiguous saved configuration
- **THEN** it reports a readable error without overwriting source, generated files or unrelated HA settings

#### Scenario: An already-converted source is processed again
- **WHEN** setup, preview or generation loads it
- **THEN** no page/cards are added and no discovery or format conversion repeats

### Requirement: Recoverable page migration across entry points
Setup, Save & Generate, service generation and compatible history restoration SHALL share page compatibility preflight and the existing upgrade recovery path. Writable conversion SHALL retain an exact private baseline before replacing source/output/affected owned state; failure SHALL report and recover that baseline. Previews and dry runs SHALL write nothing. Archives SHALL remain immutable; rollback SHALL restore a matching package and data baseline.

#### Scenario: Page conversion is previewed
- **WHEN** the editor reads an old source or a service performs a dry run
- **THEN** it returns compatible editable data or a readable error without modifying source, history, generated output or HA configuration
- **AND** an unsaved editor draft is not overwritten

#### Scenario: Generation fails after migration preflight
- **WHEN** a writable page conversion fails after capturing the exact baseline
- **THEN** the operation reports failure and restores the affected source, output and owned state together
- **AND** incomplete recovery remains a reported error with retained private recovery data

#### Scenario: An archived older dashboard is restored
- **WHEN** its source and generated component contracts pass compatibility preflight
- **THEN** its exact snapshot is restored without rewriting the archive and its active copy can subsequently migrate through normal writable generation
- **AND** incompatible restoration is rejected before replacing current data

### Requirement: Current-format starter creation without rediscovery
First configuration with no saved source SHALL create ordinary editable Home, Rooms and room-detail pages through the same starter/card contracts. Supported entities SHALL populate those initial snapshots once. Subsequent setup SHALL preserve saved pages, landing choice and deletions, including empty pages, rather than recreating named template pages or synchronizing their membership. Invalid saved data SHALL NOT be treated as missing first-run data.

#### Scenario: A fresh integration has no supported entities
- **WHEN** its initial source is created
- **THEN** it has a valid editable landing page without fabricated entity dependencies or warning cards

#### Scenario: An edited starter contains no cards
- **WHEN** Home Assistant restarts
- **THEN** that saved page remains empty and starter repair does not replace the user's deliberate configuration

### Requirement: Native ownership isolation
Native-owned dashboards SHALL be excluded from legacy adoption, setup repair, builder generation and history restoration. Read-only native compilation SHALL never write saved JSON, generated files, storage or history.

#### Scenario: Native output is compiled during rendering
- **WHEN** an authenticated client requests a supported native card or starter
- **THEN** complete validated configuration is returned without reading builder content or changing owned state

#### Scenario: Native data survives builder operations
- **WHEN** setup, generation or history restore runs alongside a native-owned dashboard
- **THEN** its exact persisted configuration remains unchanged

### Requirement: Explicit dashboard format versions
Dashboard JSON SHALL identify its format independently of Marao release and HA
config-entry versions. Unversioned JSON SHALL have a documented legacy version.
Only supported nonnegative integer versions SHALL be accepted, excluding booleans.
Conversions SHALL follow explicit ordered steps to the current format and be
idempotent. Unknown newer versions SHALL be rejected without rewriting source,
generated files or the version marker.

#### Scenario: A user skips intermediate Marao releases
- **WHEN** a supported older saved dashboard is opened by the candidate integration
- **THEN** all required ordered conversions produce valid current-format JSON without requiring installation of intermediate releases
- **AND** the source version and applied conversions are identifiable

#### Scenario: A future or malformed version is encountered
- **WHEN** JSON declares a newer unsupported version, a negative number, boolean, fractional number or nonnumeric marker
- **THEN** a readable compatibility error is reported without a starter reset or source/output writes

#### Scenario: Already current configuration is processed again
- **WHEN** an upgraded integration restarts or regenerates the same configuration
- **THEN** conversion makes no further semantic changes, duplicates or migration-only backups

### Requirement: Automatic preserved-install upgrade
An installed dashboard requiring conversion SHALL be upgraded automatically
through validated migration and regeneration after a recoverable pre-upgrade
backup. Setup SHALL preserve its existing HA entry and dashboard identity and
SHALL NOT replace it with registry discovery or starter defaults. A no-op upgrade
SHALL preserve current-format source. Migration alone SHALL NOT actuate entities
or require a user to recreate the integration or dashboard.

#### Scenario: HACS replaces Marao and HA restarts
- **WHEN** a saved supported legacy dashboard needs a schema or generated-contract migration
- **THEN** the existing source is backed up, converted, validated and regenerated under the same configured dashboard identity
- **AND** the migrated JSON is persisted with its completed version and the dashboard remains usable without manual JSON repair

#### Scenario: User intentionally emptied a room or optional page
- **WHEN** the installed dashboard upgrades
- **THEN** explicit empty selections, deletions and disabled pages remain authoritative and are not repopulated from current HA registry membership

### Requirement: Shared conversion across configuration entry points
Setup, editor previews/saves, generation services and historical compatibility
checks SHALL use the same format rules. Read-only previews and dry runs SHALL
not persist conversion or replace unsaved drafts. Successful writable operations
SHALL persist validated canonical JSON in the selected source file when conversion
is required. Current-format and external-path configuration SHALL receive the
same safety checks.

#### Scenario: An administrator requests a conversion preview or dry run
- **WHEN** legacy configuration is read for preview or planned without writes
- **THEN** the conversion result or error is shown while saved files and local drafts remain unchanged

#### Scenario: The same legacy JSON is supplied by two generation paths
- **WHEN** editor Save & Generate and the generation service process it successfully with the same registry inputs
- **THEN** their persisted canonical source and generated behavior agree
- **AND** an explicitly selected alternate source path is not replaced with the default dashboard JSON path

### Requirement: Preserve user meaning through migration
Migration SHALL preserve user selections, exclusions, explicit emptiness,
ordering, names, overrides, navigation, page references, raw cards, unknown fields
and protected custom YAML except for documented intentional conversions.
Unrelated HA registrations, resources, themes and settings SHALL remain intact.
Ambiguous conversion inputs SHALL produce a readable error rather than guessed
device membership or silent field removal.

#### Scenario: Advanced customized configuration upgrades
- **WHEN** JSON includes entity objects/grouped forms, custom variables, raw cards, ordered pages and unknown extension fields
- **THEN** expected conversions preserve their meaning and unrelated fields remain present after editor round-trip and generation
- **AND** protected YAML custom regions and unrelated files are retained

#### Scenario: A migration requires registry data that is missing or ambiguous
- **WHEN** a legacy area-only source cannot be resolved safely
- **THEN** conversion fails readably without interpreting missing data as an empty successful migration

### Requirement: Recoverable failed or interrupted upgrade
Migration SHALL validate proposed JSON and output before replacing active data,
retain exact prior source/output and recover affected owned state after failure.
An incomplete write or restart SHALL remain recoverable without advancing the
format marker prematurely. Failures and rollback failures SHALL be reported
honestly, keep recovery data and prevent false success. Invalid existing JSON
SHALL NOT be silently reset or normalized into a starter.

#### Scenario: Conversion or regeneration fails
- **WHEN** validation, protected-region preflight or generation reports an error
- **THEN** the previous dashboard data is retained or restored, the failure is visible and no completed-migration marker is recorded
- **AND** recovery does not overwrite unrelated concurrent user changes

#### Scenario: HA stops during migration writes
- **WHEN** setup resumes with an unfinished migration
- **THEN** it detects the incomplete operation and restores or safely completes the validated operation using the retained baseline
- **AND** another restart is idempotent and does not duplicate entities or erase custom content

### Requirement: Historical restoration remains compatible
Archived snapshots SHALL remain immutable and preserve their exact JSON and
generated files. Restoration SHALL preflight format compatibility before
replacing active data. A supported legacy restore SHALL retain exact restored
source/files; its next writable migration/generation SHALL use the shared
conversion rules and retain a recoverable baseline. Unsupported or corrupt
history SHALL fail without replacing the current valid dashboard.

#### Scenario: A legacy snapshot is restored after an update
- **WHEN** the snapshot is compatible and an administrator confirms restoration
- **THEN** its exact historical source/files are restored and current-format conversion can be previewed without mutating the archive
- **AND** subsequent successful generation migrates the active copy and preserves user customizations

#### Scenario: A selected snapshot cannot be interpreted safely
- **WHEN** compatibility preflight rejects it
- **THEN** the current dashboard and archived snapshot remain unchanged and a readable recovery error is shown

### Requirement: Scoped management reads
The administrator management API SHALL support an initial visible-editor read, deferred editing-context read and History-only read while preserving the existing full response by default and existing source-preview behavior. Each scope SHALL compute and return only its required products. Scope selection SHALL retain administrator checks, recovery guards, structured errors and read-only source/history preservation.

#### Scenario: A current-format initial read is requested
- **WHEN** the editor requests only its initial visible-control data
- **THEN** the backend returns the complete authoritative source and required display context without generating creation templates, enumerating History or building a full entity/area metadata payload
- **AND** metadata collection uses the required visible entity IDs rather than a full registry collection followed by filtering

#### Scenario: Deferred context or History is requested
- **WHEN** the editor requests broader editing context or History
- **THEN** each response contains the related requested data without returning the dashboard source again
- **AND** History-only reads do not collect registry data or create templates, and context-only reads do not enumerate History

#### Scenario: An existing caller reads or previews configuration
- **WHEN** a caller omits the new scope selector or previews an explicit supported source using the existing request shape
- **THEN** it receives the existing full response and compatible conversion behavior
- **AND** unknown fields, raw content, explicit emptiness, order and saved state remain preserved

#### Scenario: Historical conversion requires metadata
- **WHEN** an initial read encounters a supported historical configuration needing entity or area context for conversion
- **THEN** the backend obtains that required context through the shared ordered conversion path before returning the complete compatible document
- **AND** conversion does not infer empty selections from deferred metadata, write saved state or rewrite archived history

#### Scenario: Scope selection is invalid or access is unauthorized
- **WHEN** a caller supplies an unsupported scope, combines a scoped read with an incompatible explicit-source preview, or lacks administrator access
- **THEN** the request fails with the appropriate structured validation or authorization error without exposing or modifying editor data

#### Scenario: Recovery data requires attention
- **WHEN** an existing operation checkpoint prevents consistent editor access
- **THEN** scoped reads retain the existing readable recovery failure instead of returning inconsistent partial data or bypassing recovery

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

### Requirement: Refresh after every successful editor generation
Every successful Save & Generate SHALL request frontend cache cleanup and dashboard reload on connected clients viewing the affected generated dashboard, regardless of version or content equality. Failed operations, previews and dry runs SHALL NOT emit this request. Receiving a refresh SHALL NOT invoke generation or entity actions.

#### Scenario: Repeated unchanged saves
- **WHEN** an administrator successfully saves and generates twice with identical content and frontend version
- **THEN** each operation delivers a distinct refresh request to connected administrator and regular-user dashboard sessions
- **AND** each eligible session refreshes once per request without a version condition

#### Scenario: Generation does not succeed
- **WHEN** validation, generation or required post-generation processing fails, or a preview or dry run is performed
- **THEN** no automatic refresh request is emitted for that operation

### Requirement: Automatic recovery after frontend updates
Clients with the update handler SHALL compare their loaded frontend identity with the active server identity on initial connection, reconnection, return to the foreground and server update notification. A mismatch SHALL request frontend cache cleanup and reload without Save & Generate. Matching identities SHALL NOT trigger refresh merely because the dashboard opens or reconnects.

#### Scenario: Update while an app session is open
- **WHEN** a newer frontend becomes active and the client receives its identity
- **THEN** the client requests a refresh without an editor save
- **AND** a client already running that identity does not refresh for the update notification

#### Scenario: Return after an update
- **WHEN** a handler-equipped client returns from suspension or reconnects after an update
- **THEN** it checks the active server identity and refreshes if outdated

### Requirement: Safe bounded automatic frontend refresh
Automatic refresh SHALL preserve the current route including query and fragment, authentication, preferences and saved dashboard data. It SHALL defer while hidden, unreachable, editing or interacting, then resume when safe. Duplicate delivery and overlapping triggers SHALL NOT create concurrent reloads or automatic retry loops. Failures SHALL remain visible with manual recovery available.

#### Scenario: Save arrives during editing or interaction
- **WHEN** a refresh request reaches a client with unsaved edits, edit mode, an open control popup or an active gesture
- **THEN** cleanup and reload wait until those conditions are resolved
- **AND** no edits or partial gestures are discarded and no entity action is dispatched by recovery

#### Scenario: Hidden or temporarily offline client
- **WHEN** a connected client receives a request but cannot safely refresh before becoming hidden or losing connectivity
- **THEN** it retains pending work and attempts it after foreground connectivity is restored
- **AND** it does not erase useful caches while unreachable

#### Scenario: Duplicate or overlapping refresh requests
- **WHEN** a request is delivered more than once or save and version triggers overlap before completion
- **THEN** one refresh can satisfy the pending requests
- **AND** the reloaded document does not repeat already attempted work automatically

#### Scenario: Reload fails to obtain current assets
- **WHEN** one automatic recovery attempt leaves the client stale or reports failure
- **THEN** it exposes a readable recovery failure and allows manual navbar refresh
- **AND** it does not repeatedly clear caches and reload for the same request or target version

### Requirement: Authenticated refresh coordination
Refresh identity and subscription access SHALL be available to authenticated dashboard users without exposing configuration or granting generation permissions. Only successful authorized generation and integration lifecycle updates SHALL originate automatic refresh signals. Coordination SHALL NOT force reloads of unrelated dashboards or administrative pages.

#### Scenario: Regular dashboard user receives refresh
- **WHEN** a non-administrator subscribes to refresh coordination
- **THEN** the user can receive applicable signals and frontend identity
- **AND** cannot use that access to generate dashboards, read administrative configuration or broadcast refresh requests

#### Scenario: User is on another page
- **WHEN** a signal arrives while the user is outside the affected generated dashboard
- **THEN** the current page is not forcibly reloaded
- **AND** pending applicable recovery is considered when the generated dashboard is entered

### Requirement: First deployment and compatibility boundary
The feature SHALL preserve existing generator formats, protected content, historical migrations and independent dashboards. Documentation SHALL state that clients running code without the new handler need to load it before automatic recovery is available; refresh success SHALL be distinguished from successful generation.

#### Scenario: Older session has no handler
- **WHEN** the first release containing automatic recovery is installed
- **THEN** already-loaded older clients are not claimed to respond automatically
- **AND** the manual navbar refresh remains the bootstrap recovery path

#### Scenario: Client cannot recover after a committed save
- **WHEN** generation succeeds but a client's cache cleanup or reload fails
- **THEN** generation remains committed and the client recovery failure is reported separately
- **AND** no saved source, generated output or history is rolled back because of that client failure

### Requirement: Independent navigation and recovery bootstrap
Marao SHALL initialize navigation and frontend recovery through a minimal critical path independent of optional cards, history, media, event providers and editors. Localized feedback, gesture ownership and recovery protections SHALL work on that path. An optional-resource failure SHALL remain diagnosable without disabling the critical surface or triggering automatic reload loops.

#### Scenario: A content dependency is withheld
- **WHEN** optional module requests are blocked after HA provides a saved navbar configuration
- **THEN** the navbar can initialize, show localized hold progress and request explicit recovery without those modules
- **AND** optional loading starts only after the critical navigation/recovery components are registered, without delaying their configuration or interaction

#### Scenario: Content initialization rejects
- **WHEN** optional content initialization fails after navigation is ready
- **THEN** its resource/error evidence is retained and the affected content exposes readable failure feedback
- **AND** navigation remains usable without an unhandled rejection terminating the critical startup path

#### Scenario: Recovery is attempted while offline
- **WHEN** an eligible hold completes but the bounded server-reachability check fails
- **THEN** localized retry feedback is displayed and usable cached content, sign-in and preferences are preserved
- **AND** there is no automatic reload, integration restart, server mutation or entity service call

#### Scenario: Unsaved work exists before optional modules load
- **WHEN** frontend recovery is requested while the host reports unsaved edits
- **THEN** recovery is blocked with localized save/discard guidance before cache eviction or navigation
- **AND** the protection does not depend on loading an optional editor bundle

### Requirement: Compatible versioned critical resources
The critical bootstrap and its dependencies SHALL use the server's current content fingerprint and retain existing entry URLs and generated/native navbar contracts. Setup, reload and unload SHALL preserve owned-resource lifecycle behavior. Startup optimization SHALL NOT rewrite saved dashboards, preferences or historical data, require dashboard regeneration, or introduce third-party runtime dependencies.

#### Scenario: An existing installation loads the new frontend
- **WHEN** an unchanged released generated or native dashboard loads after the new package is correctly registered
- **THEN** its existing navbar type, ordered routes, labels, icons, options and unknown configuration fields remain usable without regeneration or source conversion
- **AND** intentionally empty navigation remains empty

#### Scenario: Frontend assets change
- **WHEN** a refreshed document loads after the server registers updated frontend contents
- **THEN** critical and deferred Marao assets use the same current fingerprint
- **AND** only one implementation owns each existing navbar custom-element name and its refresh operation

#### Scenario: Integration registration ends or is replaced
- **WHEN** the integration reloads or unloads
- **THEN** owned frontend entry registrations are replaced or removed through the existing lifecycle without duplicate or orphaned registrations
- **AND** unrelated resources and HA settings remain untouched

#### Scenario: Explicit recovery completes
- **WHEN** a successful hold refreshes a correctly deployed frontend
- **THEN** the existing bounded native/web recovery returns to the same origin, path, query and fragment with sign-in and preferences retained
- **AND** saved source, generated output, protected custom content and historical snapshots are unchanged
