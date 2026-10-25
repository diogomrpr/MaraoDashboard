# Spec Delta

## MODIFIED Requirements

### Requirement: Native integration setup
Marao SHALL install as a self-contained HACS Dashboard resource using HA's native strategy, editor and storage facilities. New installations and steady-state operation SHALL require no Marao Python integration, companion process, external server, runtime CDN, development tools or third-party card installation. No new migration integration SHALL be required; the released legacy package remains a rollback artifact.

#### Scenario: First configuration
- **WHEN** an administrator installs the Dashboard resource and creates a Marao dashboard
- **THEN** the native editor creates an explicit starter from enabled visible supported entities and saves it through HA
- **AND** later restarts preserve that saved dashboard without installing or recreating a Marao integration

### Requirement: Starter discovery and limited repair
Initial discovery SHALL exclude disabled, hidden and stateless registry entries, group supported entities by entity/device area, and use a Home fallback room when only supported unassigned entities exist. No supported entities SHALL produce a valid empty starter. Discovery SHALL persist explicit membership once. Later loading, migration and resource repair SHALL preserve saved membership, including empty dashboards, without registry refill.

#### Scenario: Entities become available after an empty first setup
- **WHEN** a saved empty starter is loaded after supported entities become available
- **THEN** its empty contents remain unchanged
- **AND** an administrator can add those entities through the editor

#### Scenario: An existing user configuration is not a recognized starter
- **WHEN** migration or dashboard loading encounters that configuration
- **THEN** it preserves the source instead of resetting it from the registry

#### Scenario: First setup creates populated rooms
- **WHEN** no saved source exists and supported entities belong to HA areas
- **THEN** explicit initial room contents include optional suggestion-area associations
- **AND** subsequent registry changes do not alter that membership

#### Scenario: A saved dashboard is intentionally emptied
- **WHEN** an administrator saves empty rooms or removes all rooms and HA restarts
- **THEN** those saved choices remain authoritative even under the default dashboard name and slug

### Requirement: Administrator management API
Native dashboard writes SHALL require HA administrator authorization. Editing controls SHALL be administrator-only and validation/save failures readable. Native reads SHALL follow the disclosed HA boundary. The released legacy endpoints retire when the administrator removes the integration; no new fencing API or permanent redirect is introduced.

#### Scenario: A non-administrator attempts management
- **WHEN** a non-administrator requests a native save
- **THEN** HA denies the write and the UI exposes no editing controls
- **AND** readable native source is not represented as administrator-private

#### Scenario: An old editor bookmark is opened after removal
- **WHEN** a cached client requests the retired editor or Python endpoints
- **THEN** documentation directs the administrator to export existing drafts before removal and fully refresh/reopen afterward
- **AND** the new editor lives under the same dashboard root without a permanent server redirect

### Requirement: Content-versioned frontend registration
The Dashboard resource SHALL load one immutable content-identified graph including runtime modules, deferred editor modules, styles and workers. Assets SHALL ship with the frontend package without a runtime CDN. Steady-state registration and freshness SHALL use native HA/HACS facilities without Marao API routes. Legacy bootstraps SHALL be removed in the guided manual procedure, with export/full-refresh guidance for old clients.

#### Scenario: A frontend asset changes
- **WHEN** a completed Dashboard package deployment updates the native resource identity
- **THEN** a refreshed client loads the corresponding current graph without an integration reload or HA restart

#### Scenario: JSON is first opened after an editor asset update
- **WHEN** an administrator opens the deferred editor after refreshing
- **THEN** its module, styles and workers use the same content identity as the active frontend
- **AND** stale or external editor resources are not substituted

#### Scenario: JSON resources are prepared in the background
- **WHEN** a panel prepares JSON resources before their foreground use
- **THEN** preparation and foreground use resolve the same content and locale identities
- **AND** successful preparation is reused without duplicate module initialization or workers
- **AND** failed or obsolete preparation cannot substitute prior-version resources

#### Scenario: The editor is built for Visual startup
- **WHEN** frontend editor assets are built and checked
- **THEN** optional JSON resources remain separate from the Visual startup module and stylesheet
- **AND** background preparation does not increase approved eager asset budgets

#### Scenario: Cached bootstrap URL after an update
- **WHEN** a cached flat or API bootstrap contacts HA during migration or a migrated client checks its installed resource after handoff
- **THEN** it selects a coherent supported graph or reports explicit refresh-required guidance
- **AND** no guarantee of permanent Marao API serving or remote replacement of an offline document is claimed

#### Scenario: Stale or partially replaced asset
- **WHEN** deployment cannot supply a required asset matching the selected graph
- **THEN** loading fails visibly instead of substituting different-version bytes
- **AND** the client does not repeatedly reload or discard an unsaved draft

#### Scenario: Public static boundary
- **WHEN** the Dashboard package is staged or a caller requests a non-package path
- **THEN** source configuration, private backups, archives, credentials and development files are not exposed as frontend assets
- **AND** paths outside the installed frontend package are not served through Marao resource registration

#### Scenario: Additional content-versioned frontend registration contracts
- **WHEN** legacy resources are retired during verified handoff
- **THEN** known owned references are mapped to frontend package assets and unresolved dependencies block retirement
- **AND** duplicate owned registrations are removed without affecting unrelated resources

### Requirement: Validated save and recoverable generation
Save & Generate SHALL validate and compile before submitting the complete native source document. Compilation failure SHALL leave saved data unchanged; reported save errors SHALL retain the draft. Native save/notification semantics and simultaneous last-writer limits SHALL be disclosed without claiming disk-durability proof or compare-and-swap. Already-stale drafts SHALL be rejected. Transitional migration SHALL retain its separate exact recovery guarantees.

#### Scenario: Generation fails after a valid baseline was saved
- **WHEN** compilation fails before a native save
- **THEN** the last saved dashboard remains unchanged and the failure is reported with the draft retained
- **AND** no configuration snapshot is created to emulate the removed History feature

#### Scenario: Another client has already saved
- **WHEN** the pre-save read differs from the draft's saved baseline
- **THEN** Marao refuses the stale save and preserves an exportable draft with reload or retry guidance

#### Scenario: Two devices save simultaneously
- **WHEN** two clients check the same baseline before their native replacement saves
- **THEN** the documented native last-writer limit applies
- **AND** Marao does not claim that a digest, notification or same-browser lock provides cross-device conditional writes

#### Scenario: HA logs a storage write failure without returning it
- **WHEN** HA accepts a native save in memory and emits its native update but does not report the backing write failure to the caller
- **THEN** Marao follows the same accepted behavior as built-in dashboards without claiming that the acknowledgment, notification or readback proves disk persistence
- **AND** manual source export remains available and the transition is not blocked on a stronger native save API

### Requirement: Owned configuration and legacy migration
The manual procedure SHALL change only proven owned configuration, resources and dashboard registration. Ambiguous/manual leftovers SHALL remain intact with readable recovery guidance. Cutover SHALL preserve the existing root, view paths, landing view and sidebar metadata without replacing unrelated dashboards. Steady-state frontend saves SHALL not patch server configuration, themes or generated YAML.

#### Scenario: A legacy resource resembles an unrelated resource
- **WHEN** migration cannot prove exact ownership
- **THEN** it leaves that resource intact and reports any required manual disposition

#### Scenario: The existing route belongs to another dashboard
- **WHEN** preflight finds a conflicting or independently edited registration or target document
- **THEN** migration refuses cutover without overwriting it or creating a second product dashboard

### Requirement: Bundled theme synchronization
The frontend SHALL supply scoped Marao light/dark styling sufficient for the supported dashboard, editor and native-control appearance without server theme-file synchronization. Migration and retirement SHALL preserve existing installed named-theme copies and unrelated themes. Fresh installation SHALL work without a prior copied theme; Monaco SHALL retain its stock presentation.

#### Scenario: An installed Marao theme differs from the bundled theme
- **WHEN** a migrated dashboard loads or the legacy integration is removed
- **THEN** frontend-scoped styles supply the supported Marao appearance without replacing the installed named-theme file or unrelated themes

#### Scenario: A fresh installation has no copied theme
- **WHEN** the Dashboard resource runs with no Marao integration or installed Marao theme YAML
- **THEN** supported light/dark dashboard, editor and embedded native controls retain equivalent Marao appearance
- **AND** no server theme installer is requested

### Requirement: Recoverable conversion to explicit room membership
Legacy room configuration SHALL convert to explicit membership once. Existing lists, including empty lists, SHALL take precedence over area expansion; area-only rooms SHALL receive one snapshot. Include/exclude and overrides SHALL retain effective selections/options. Conversion SHALL preserve unknown fields, raw cards, layout and navigation, be idempotent and keep previews write-free. Manual cutover SHALL retain an exact private recoverable baseline.

#### Scenario: A legacy explicit list was edited in JSON
- **WHEN** a legacy room contains an area association and a shortened or empty list
- **THEN** conversion uses that list and explicit adjustments without discovering omitted members
- **AND** area association becomes suggestion metadata only

#### Scenario: A legacy room has only an area source
- **WHEN** an unconverted room has no explicit list
- **THEN** conversion snapshots its effective supported area entities once with legacy adjustments
- **AND** later conversions or registry updates do not expand it

#### Scenario: A current-format entity property is removed
- **WHEN** an administrator removes that property after conversion
- **THEN** it represents an empty room rather than renewed discovery

#### Scenario: Conversion fails or is previewed
- **WHEN** validation fails, conversion is unsafe or only preview/validation is requested
- **THEN** saved native data, legacy JSON and generated files remain unchanged
- **AND** errors remain readable and any migration recovery baseline is retained

#### Scenario: Historical configuration is restored
- **WHEN** an administrator explicitly imports a supported older JSON document obtained independently from legacy recovery data
- **THEN** the ordinary import preview uses the shared explicit-membership conversion without changing any original archive
- **AND** applying that preview requires an explicit native save and does not restore a directory or recreate History/Restore

### Requirement: Recoverable page migration across entry points
The standalone converter, browser import, previews and native saves SHALL share page compatibility rules. Manual migration SHALL retain exact private source/output/package/owned-setting backups. Preview writes nothing; ordinary saves never modify legacy files/archives or offer historical restoration.

#### Scenario: Page conversion is previewed
- **WHEN** an older document is previewed locally or in the editor
- **THEN** compatible data or a readable error appears without changing originals, saved native data or the current draft

#### Scenario: Generation fails after migration preflight
- **WHEN** local compilation fails after the original installation was backed up
- **THEN** removal does not begin and exact originals remain available without any server writes

#### Scenario: An archived older dashboard is restored
- **WHEN** an administrator pastes supported JSON from an old backup
- **THEN** shared read-only conversion produces a reviewed target for explicit native save
- **AND** the archive remains unchanged and no History collection is imported

### Requirement: Current-format starter creation without rediscovery
First configuration with no saved source SHALL create ordinary editable Home, Rooms and room-detail pages through the shared starter/card contracts, populating supported initial snapshots once. Subsequent loading SHALL preserve pages, landing choice, deletions and emptiness. Invalid or missing expected legacy data SHALL not be treated as a fresh installation, and regular-user rendering SHALL not persist discovery.

#### Scenario: A fresh integration has no supported entities
- **WHEN** an administrator creates a fresh frontend-only dashboard with no supported entities
- **THEN** it has a valid editable landing page without fabricated entities or warning cards
- **AND** no integration is installed

#### Scenario: An edited starter contains no cards
- **WHEN** HA or the client restarts
- **THEN** the saved page remains empty without starter replacement

### Requirement: Native ownership isolation
Migration SHALL distinguish a proven legacy Marao dashboard from independently owned native dashboards, including retired Marao native wrappers. It SHALL preserve unrelated native documents exactly. Frontend strategy compilation SHALL be read-only and SHALL not adopt other dashboards, write files, persist conversion or recreate retired standalone authoring surfaces.

#### Scenario: Native output is compiled during rendering
- **WHEN** a client renders a supported Marao strategy source
- **THEN** validated configuration is produced without changing stored source, legacy files or archives
- **AND** retired native-card or starter compilation endpoints are not requested

#### Scenario: Native data survives builder operations
- **WHEN** migration, import or native save runs beside an independently owned dashboard
- **THEN** that dashboard's exact saved configuration remains unchanged

### Requirement: Explicit dashboard format versions
Source format, native storage envelope, compiler contract, package version and transitional config-entry version SHALL remain separate. Unversioned JSON SHALL mean the documented legacy format. Supported format markers SHALL be nonnegative integers excluding booleans; conversions SHALL be ordered and idempotent. Invalid/newer sources, envelopes or incompatible compiler requirements SHALL fail without writes, marker advancement or starter replacement.

#### Scenario: A user skips intermediate Marao releases
- **WHEN** a supported older source is migrated or imported
- **THEN** all required ordered conversions produce valid current source without installing intermediate releases
- **AND** the original version and conversions remain identifiable

#### Scenario: A future or malformed version is encountered
- **WHEN** a version marker is unsupported, negative, boolean, fractional or nonnumeric, or the frontend cannot satisfy the stored compiler requirement
- **THEN** a readable compatibility error appears without source, native storage, generated-file or version-marker writes

#### Scenario: Already current configuration is processed again
- **WHEN** the current source is loaded or compiled again
- **THEN** there are no semantic changes, duplicate content or repeated migration-only backups

### Requirement: Shared conversion across configuration entry points
The standalone converter, browser import/export, editor previews/saves and strategy SHALL share the same source rules. Previews/rendering SHALL not persist conversion or replace drafts. Native saves SHALL submit complete validated source under HA semantics; browser operation SHALL not write arbitrary server paths or require Node on HA.

#### Scenario: The same legacy JSON is supplied by two generation paths
- **WHEN** the same supported source and required context reach offline conversion or editor preview
- **THEN** canonical meaning/compiled behavior agree and original input remains unchanged

#### Scenario: An administrator requests a conversion preview or dry run
- **WHEN** supported older JSON is validated without saving
- **THEN** results or errors appear without changing original files, native storage or the current draft

#### Scenario: Conversion inputs change
- **WHEN** source, answers, supplied protected content or metadata changes
- **THEN** stale output is invalidated and a new preview is required before copying/importing

### Requirement: Preserve user meaning through migration
Migration SHALL preserve selections, exclusions, emptiness, order, names, overrides, navigation, references, raw cards, unknown fields and protected custom YAML except documented intentional conversions and accepted removals. Unrelated HA state SHALL remain intact. Ambiguous inputs SHALL fail before writes. Server-only YAML or private references SHALL not be evaluated into native-readable configuration or silently discarded.

#### Scenario: Advanced customized configuration upgrades
- **WHEN** source includes grouped/entity objects, variables, raw cards, ordered pages and unknown fields
- **THEN** editor round-trip and compilation preserve their meaning
- **AND** protected custom content is imported in its supported order with exact originals and unrelated files retained

#### Scenario: A migration requires registry data that is missing or ambiguous
- **WHEN** an area-only source cannot be resolved safely
- **THEN** conversion reports failure rather than interpreting missing data as an empty successful conversion

#### Scenario: Protected YAML contains server-only references
- **WHEN** custom content contains unresolved `!secret`, `!include`, unknown tags or external/non-owned file references
- **THEN** migration reports paths and reasons without evaluating private content, disclosing values or guessing a replacement
- **AND** cutover remains blocked until an explicit supported disposition preserves accepted user meaning

### Requirement: Recoverable failed or interrupted upgrade
Manual migration SHALL retain exact matching package/source/generated/custom/archive/owned-setting backups and the downloaded target before removal. Guidance SHALL inspect actual registration/content after interruption and either finish the same import or restore matching package and data. Unrelated or new native edits SHALL not be overwritten. Failed recovery SHALL remain visible with private copies retained; no automatic checkpoint, server transaction or source fence is promised.

#### Scenario: Conversion or regeneration fails
- **WHEN** validation, protected-content or dependency review refuses input
- **THEN** the existing installation stays untouched and removal does not begin

#### Scenario: HA stops during migration writes
- **WHEN** the administrator resumes
- **THEN** the existing same-root registration/content is inspected and the downloaded target is imported there or guided rollback is performed
- **AND** no duplicate dashboard, starter replacement or false completion occurs

#### Scenario: Independent state changes after backup
- **WHEN** rollback encounters unrelated or new native edits
- **THEN** those changes are preserved separately and only reviewed owned settings are restored
- **AND** a stale full registry or package-only downgrade is refused

### Requirement: Fresh Marao resource identity after refresh
After completed frontend deployment and native resource registration, a successful refresh SHALL load the current coherent entry, dependencies and deferred assets without reusing the old in-memory graph. Deployment/registration failures SHALL remain errors rather than repeated client resets. Freshness SHALL not depend on a Marao Python resource endpoint or integration reload.

#### Scenario: Server assets have changed
- **WHEN** an outdated client refreshes after the installed native resource identity changes
- **THEN** entry, dependent and deferred assets use the current coherent identity

#### Scenario: A server deployment is incomplete
- **WHEN** resources remain stale or a current required file is unavailable
- **THEN** recovery reports that failure without claiming deployment was repaired or repeatedly reloading

### Requirement: Refresh after every successful editor generation
Marao SHALL consume HA's native configuration updates for the affected dashboard, including unchanged saves, with bounded client recovery. Native events SHALL NOT be presented as independent disk-durability proof. Marao SHALL NOT add success notifications for reported save errors, previews or validation. Receiving an update SHALL not generate configuration or dispatch entity actions.

#### Scenario: Repeated unchanged saves
- **WHEN** an administrator successfully saves identical source twice
- **THEN** both native save operations notify affected administrator and ordinary dashboard sessions under HA's native semantics
- **AND** eligible sessions process each native update without requiring a package-version change

#### Scenario: Generation does not succeed
- **WHEN** compilation fails, HA reports a save error, or only a preview/validation is performed
- **THEN** Marao emits no additional successful-save refresh signal
- **AND** HA-originated events retain their native semantics, including possible notification before a backing storage failure

### Requirement: Automatic recovery after frontend updates
Clients SHALL check loaded identity against installed native resource/release identity at startup, reconnect, foreground return and applicable native updates. A mismatch SHALL request safe bounded refresh or report refresh-required guidance without Save & Generate. Matching identity SHALL not cause refresh merely on entry or reconnect. Detection SHALL not depend on Marao subscriptions or aggressive polling.

#### Scenario: Update while an app session is open
- **WHEN** a client learns that a new frontend identity is installed
- **THEN** it requests recovery without an editor save
- **AND** an already-current client does not refresh for that update

#### Scenario: Return after an update
- **WHEN** a client returns from suspension or reconnects
- **THEN** it checks installed identity and safely refreshes or exposes actionable refresh guidance if outdated

### Requirement: Authenticated refresh coordination
Refresh identity and native configuration notifications SHALL be usable by authenticated dashboard users without granting write privileges or exposing private migration data. Applicable native saves/resource updates SHALL coordinate recovery only for the affected dashboard. Native-readable source SHALL follow the disclosed authorization model; no custom Python subscription or administrator-only hidden storage SHALL be required.

#### Scenario: Regular dashboard user receives refresh
- **WHEN** a non-administrator observes applicable native dashboard/resource notifications
- **THEN** frontend identity and recovery work without permission to save or broadcast a privileged Marao update
- **AND** private migration backups and legacy archive bytes are not disclosed

#### Scenario: User is on another page
- **WHEN** an update arrives outside the affected dashboard
- **THEN** the unrelated page is not forcibly reloaded
- **AND** pending applicable recovery is considered on dashboard entry

### Requirement: First deployment and compatibility boundary
Transition SHALL preserve supported source meaning, protected content, historical inputs and independent dashboards while explicitly retiring configuration History and Python APIs. Documentation SHALL distinguish migration, committed saves and client recovery, explain legacy URL retirement and state that already-loaded clients need current code for recovery. An offline cached document SHALL not be claimed remotely replaceable.

#### Scenario: Older session has no handler
- **WHEN** migration encounters an old client lacking current recovery code
- **THEN** manual recovery or the next reachable page load is the documented bootstrap path
- **AND** legacy removal does not begin while required target assets or known legacy dependencies remain unresolved

#### Scenario: A legacy session returns after route retirement
- **WHEN** a cached client still requests a removed Python bootstrap after legacy removal
- **THEN** one complete HA shell refresh or app reopen is the documented transition recovery path
- **AND** a lightweight draft export/error surface protects unsaved work, no permanent compatibility server is added, and this one-time limitation is distinguished from later frontend-only updates

#### Scenario: Client cannot recover after a committed save
- **WHEN** native save succeeds but client cleanup or reload fails
- **THEN** the accepted native save is not rolled back for the client failure, which is reported separately
- **AND** that failure does not restore legacy files or alter archives

### Requirement: Independent navigation and recovery bootstrap
Marao SHALL initialize navigation and recovery through a minimal critical path independent of optional cards, recorder history, media, event providers and editors. Localized feedback, gesture ownership and draft/recovery protections SHALL work without those modules. Optional failures SHALL remain diagnosable without disabling navigation or triggering reload loops, and no critical function SHALL depend on Marao Python.

#### Scenario: A content dependency is withheld
- **WHEN** optional requests are blocked after HA supplies the saved navbar configuration
- **THEN** the navbar initializes, shows localized hold progress and requests explicit recovery independently
- **AND** optional loading follows critical registration without delaying configuration or interactions

#### Scenario: Content initialization rejects
- **WHEN** optional initialization fails after navigation is ready
- **THEN** affected content retains resource/error evidence and readable failure feedback
- **AND** navigation remains usable without an unhandled rejection terminating startup

#### Scenario: Recovery is attempted while offline
- **WHEN** a completed hold cannot verify reachability
- **THEN** localized retry feedback preserves usable caches, sign-in and preferences
- **AND** no automatic reload, server mutation, integration restart or entity action occurs

#### Scenario: Unsaved work exists before optional modules load
- **WHEN** recovery is requested while the host reports unsaved edits
- **THEN** localized save/discard guidance blocks eviction and navigation
- **AND** draft protection works without the optional editor bundle

### Requirement: Compatible versioned critical resources
Critical and deferred assets SHALL share an immutable frontend identity and preserve the accepted navbar contracts. Transition SHALL replace only owned registrations and explicitly retire old entry URLs. Loading/refresh SHALL not rewrite source, archives or preferences, regenerate files or introduce third-party runtime dependencies. Only one implementation SHALL own each existing custom-element name.

#### Scenario: An existing installation loads the new frontend
- **WHEN** an accepted legacy installation completes native migration and loads its frontend package
- **THEN** navbar types, route order, labels, icons, options, unknown fields and deliberate empty navigation remain usable
- **AND** no further source conversion or regeneration is required merely to refresh assets

#### Scenario: Frontend assets change
- **WHEN** a refreshed document follows updated native resource registration
- **THEN** critical and deferred assets share the current identity and one implementation owns each navbar element and refresh operation

#### Scenario: Integration registration ends or is replaced
- **WHEN** manual removal retires the legacy integration
- **THEN** legacy editor/module/coordination registrations are removed while the native frontend resource remains usable without Python
- **AND** unrelated HA settings and resources remain intact

#### Scenario: Explicit recovery completes
- **WHEN** an explicit hold successfully refreshes a correctly deployed frontend
- **THEN** the client returns to the same origin, path, query and fragment with sign-in and preferences retained
- **AND** saved source, protected/raw content and all legacy source/output/archive bytes remain unchanged

## ADDED Requirements

### Requirement: Guided preserved-install migration
The user-selected guided manual migration SHALL preserve the existing root, source meaning, routes and settings using exact private backups and the standalone converter before removal. Native dashboard creation and JSON import SHALL be explicit separate steps through supported HA UI. Migration SHALL not actuate entities or install intermediate Marao releases. The accepted one-time restart SHALL be distinguished from later restart-free updates.

#### Scenario: An existing installation migrates manually
- **WHEN** the administrator exports drafts, backs up the instance and converts its JSON
- **THEN** the reviewed target is downloaded before legacy removal, and native creation/import uses the recorded original address/settings
- **AND** no automatic bridge, discovery replacement or private HACS storage edit is required

#### Scenario: A room was intentionally emptied
- **WHEN** the source converts and imports
- **THEN** emptiness, deletions and disabled pages remain authoritative


### Requirement: Adjacent source-format migration chain
All source consumers SHALL share adjacent N→N+1 conversions with validated results, historical defaults, supplied context and unchanged original input. Steps SHALL preserve explicit choices, emptiness and unknown data. Historical native documents SHALL use a distinct adapter. Source formats SHALL remain separate from other version axes; compatible additions SHALL require no artificial migration.

#### Scenario: A user skips several source formats
- **WHEN** a supported historical document is converted to current
- **THEN** the shared engine runs every required adjacent step without intermediate package installation
- **AND** missing required context is requested through the same simple UI without repeatedly asking for supplied answers

#### Scenario: A future migration is added
- **WHEN** the next source format is introduced
- **THEN** the previous→next conversion and independently specified expectations are added while earlier step expectations remain valid
- **AND** every historical fixture still passes through the complete chain without changing historical defaults to the latest catalog
- **AND** changes to existing structure or meaning advance the source format while package, HA storage, native-envelope and compiler versions remain distinct

#### Scenario: A step is absent or fails
- **WHEN** the chain has a gap, conflicting step or failed conversion/validation
- **THEN** no successful partial output or version advancement is exposed and original source remains unchanged

### Requirement: Strict frontend-only steady state
After handoff, all retained Marao authoring and runtime capabilities SHALL function using the Dashboard package and native HA APIs with no installed Marao Python package, config entry, custom endpoint or background process. Routine frontend updates SHALL require at most client refresh, not HA restart or integration reload. Transitional restarts SHALL be separately documented.

#### Scenario: Python is absent
- **WHEN** the legacy integration has been removed and Marao Python endpoints are unavailable
- **THEN** supported editing, native persistence, navigation, controls and content operate without requesting that backend
- **AND** no permanent fallback integration or external runtime is installed

#### Scenario: A later normal update is installed
- **WHEN** an already-migrated installation receives another Dashboard package through the real supported HACS path
- **THEN** current assets and retained source work while the HA process/start identity remains unchanged
- **AND** no Marao integration reload, generated-file preparation or browser override substitutes for installation

### Requirement: Separate HACS distribution handoff
The frontend SHALL have a HACS Dashboard repository identity distinct from the legacy Integration identity. Users SHALL obtain/verify the complete frontend artifact before legacy removal and enable its resource after removing obsolete bootstrap registration. New users install it directly. Supported HACS/resource operations SHALL be used without category mutation or private HACS storage edits. Frontend releases SHALL not create legacy integration updates.

#### Scenario: The integration is already installed
- **WHEN** an administrator migrates manually
- **THEN** exact backups and converted JSON precede removal, followed by the accepted restart and native import at the recorded root
- **AND** Python absence and persisted native operation are verified before declaring success

#### Scenario: Frontend installation is incomplete
- **WHEN** required assets or resource cannot be verified
- **THEN** migration stops with exact originals retained and guided recovery available

### Requirement: Capability and dependency preflight
Before cutover, the documented inventory and artifact checks SHALL verify supported stable HA/native storage, strategy/editor/resource and theme behavior, source/route ownership and target assets. It SHALL inventory detectable consumers of retired APIs and document external-discovery limits. Missing capabilities or unresolved workflows SHALL block handoff until a concrete supported replacement or administrator-approved removal exists.

#### Scenario: A saved automation uses file-based generation
- **WHEN** preflight detects that dependency or the administrator declares an external caller
- **THEN** its replacement or removal is reviewed explicitly before the integration retires
- **AND** a closed-browser service is not falsely described as replaced by interactive import/export

#### Scenario: A native capability is unsupported
- **WHEN** the actual stable installation cannot satisfy a retained capability or manual import cannot preserve the supported source/settings
- **THEN** migration stays blocked with a readable reason rather than adding a permanent backend

### Requirement: Explicit native configuration visibility
Migration SHALL disclose that authenticated HA configuration reads can expose the complete stored source, including hidden/admin-only dashboards. It SHALL require administrator acknowledgment and reviewed disposition of unresolved private content before cutover. Known-sensitive inspection SHALL not claim exhaustive secret detection. Unknown fields SHALL not be silently exposed, redacted, dropped or relocated.

#### Scenario: Source contains unresolved private content
- **WHEN** preflight or administrator review identifies a privacy requirement incompatible with native storage
- **THEN** cutover is blocked without logging sensitive values or silently modifying the source
- **AND** proceeding requires an equivalent native capability or a separate explicit approved contract change

#### Scenario: An ordinary user requests native configuration
- **WHEN** a migrated dashboard's configuration is read under HA's native authorization model
- **THEN** its source visibility matches the acknowledged disclosure
- **AND** migration backups and legacy archives remain private and are not stored in that document

### Requirement: Versioned native source document
Native storage SHALL contain one authoritative versioned Marao source document with a distinct compiler compatibility requirement and no configuration-history collection. Current source text SHALL be preserved on no-conversion migration; exact original bytes SHALL remain in private recovery when conversion is needed. Rendering SHALL compile in memory without persisting migrations or rediscovery.

#### Scenario: A current-format source is migrated without conversion
- **WHEN** the converter prepares its native document
- **THEN** the complete source text is retained along with all supported and unknown values
- **AND** repeated loading does not reformat, discover content or write a new version

#### Scenario: A regular user opens older supported source
- **WHEN** in-memory conversion is possible
- **THEN** rendering uses shared compatibility rules without persisting a new source or envelope
- **AND** canonical persistence requires an explicit authorized native save

### Requirement: Durable migration handoff and recovery
Guided manual handoff SHALL use private integrity-checked matching packages and exact source/output/archive/owned-setting recovery data before legacy removal. The administrator SHALL export open drafts and stop editing, record original dashboard settings, retain converted JSON, remove the old integration/registration through supported paths and import through native HA UI at that root. The interruption window and necessary restart SHALL be documented without claiming atomic activation.

#### Scenario: Handoff is interrupted
- **WHEN** removal, restart, native creation or import is interrupted
- **THEN** guidance identifies actual current state and safely completes the same target or restores the exact matching package/data
- **AND** private originals and downloaded target remain available until verification

#### Scenario: Exact rollback is requested
- **WHEN** the administrator restores the old installation
- **THEN** matching package, source/generated/custom files and owned settings are restored together after reviewing changes
- **AND** unrelated HA/HACS state and newly edited native data are not silently overwritten

### Requirement: Legacy archives remain untouched
Existing configuration-history archives SHALL remain byte- and mode-preserved legacy data. Migration recovery SHALL be separate from product history. The frontend SHALL neither create snapshots nor enumerate, import, restore, prune or delete those archives. Sensor/recorder history and camera recording content SHALL remain separate supported features subject to their own contracts.

#### Scenario: An installation contains old snapshots
- **WHEN** it migrates, saves natively, refreshes, updates or removes the legacy integration
- **THEN** original archive bytes and permissions remain unchanged
- **AND** no snapshots are copied into native configuration or browser storage and no History/Restore UI is offered

#### Scenario: Recorder history is opened
- **WHEN** a supported numeric or energy history surface requests native HA recorder data
- **THEN** configuration-history removal does not disable that feature

## REMOVED Requirements

### Requirement: Automatic preserved-install upgrade
**Reason**: The user selected guided manual migration instead of a new automatic in-place bridge.
**Migration**: Export drafts and take exact private matching package/data backups, convert locally, remove the old integration/YAML registration and import through native HA UI at the same root. Retain guided retry/rollback and prove the later HACS update separately.

### Requirement: Generation service and dry run
**Reason**: Strict frontend-only operation cannot retain an always-available Python service that reads source paths or writes server files.
**Migration**: Browser import/export, write-free preview/validation and explicit native Save & Generate replace the interactive workflow. Dependent automations/tools require a reviewed replacement or administrator-approved removal before cutover. Legacy commands retire with the integration; export drafts and stop old editors before removal.

### Requirement: Local version history and restoration
**Reason**: The user explicitly removed configuration version history, snapshot creation and historical restoration from the new product.
**Migration**: Preserve all existing archive bytes and modes as untouched legacy data without importing them into native or browser storage. Keep separate private migration recovery and document complete matching package-plus-data rollback; do not present it as ongoing History/Restore.

### Requirement: Historical restoration remains compatible
**Reason**: Product historical restoration is explicitly retired with configuration History; old compatibility promises cannot imply a surviving restore endpoint or UI.
**Migration**: Leave archived JSON and generated files unchanged. Explicitly supplied old JSON can use ordinary read-only import compatibility, but native save never restores an archived directory. Whole-install migration recovery restores matching package and data only under the bounded recovery contract.

### Requirement: Scoped management reads
**Reason**: The Python management-read API and History-only scope retire with the legacy integration.
**Migration**: The frontend reads the native source and obtains required display/registry metadata through native HA APIs while retaining validation, draft preservation and deferred editor context. It never requests product History. Released legacy reads retain their existing authorization until removal; native-readable source follows the explicit visibility disclosure.
