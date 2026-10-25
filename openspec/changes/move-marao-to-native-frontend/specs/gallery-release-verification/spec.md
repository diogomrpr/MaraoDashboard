# Spec Delta

## MODIFIED Requirements

### Requirement: Current-workspace disposable preparation
Ignored disposable configuration SHALL retain its URL/admin/SSH/acknowledgment boundary. Dry-run SHALL perform no writes or HA contact. Preparation SHALL distinguish a legacy integration from the frontend-only native dashboard, deploy current applicable assets and safe fixtures, preserve one dashboard root and verify the selected installation's readiness.

#### Scenario: A frontend-only change is prepared
- **WHEN** the native dashboard installation is already compatible
- **THEN** current frontend assets are synchronized and their served identity/native readiness is verified before client refresh
- **AND** no Marao integration reload, helper reset, explicit server generation or HA restart is required
- **AND** successful assets remain installed and development evidence is not mislabeled as publication/upgrade proof

#### Scenario: Integration or fixture Python changes
- **WHEN** preparation detects restart-bound legacy removal or safe fixture code
- **THEN** it batches the necessary restart and waits for readiness before continuing
- **AND** this does not establish that ordinary later frontend updates need a restart

#### Scenario: Additional current-workspace disposable preparation contracts
- **WHEN** a contributor prepares the allowed disposable instance
- **THEN** compatible frontend preview synchronizes only frontend assets and verifies native storage/resources without requiring the removed integration
- **AND** legacy transition preparation remains explicit and cannot reset the installation used for preserved-upgrade evidence
- **AND** the single Cases view and realistic pages remain under the same `/marao-dashboard` root

### Requirement: Strict HACS boundary and reproducible assets
Reproducible staging SHALL emit a frontend Dashboard package and the self-contained offline converter. Editable source and committed assets SHALL remain aligned. Both artifact boundaries SHALL reject secrets, fixtures, synthetic media, caches and test dependencies, retain required licenses and avoid installing real-provider replacements. A frontend release SHALL NOT require an integration-version update.

#### Scenario: A fixture or credential file enters the integration tree
- **WHEN** either source or staged package boundary validation runs
- **THEN** packaging fails instead of shipping that file or its contents

#### Scenario: A new frontend package is installed
- **WHEN** a user installs the Dashboard artifact
- **THEN** it contains the entry, dependencies, styles, workers and licenses required for normal operation without Marao Python
- **AND** updating it does not publish or install a changed legacy integration package

#### Scenario: Font assets are needed without a runtime CDN
- **WHEN** the frontend or standalone converter cold-starts without external network access
- **THEN** required licensed Montserrat assets and dependency licenses ship with the applicable artifact
- **AND** the target does not request the former Google Fonts stylesheet or depend on a prior theme installation for its font assets

### Requirement: Historical upgrade fixtures and expected JSON
Upgrade coverage SHALL retain provenance-backed fixtures for every supported
released JSON format, including direct skipped-version upgrades. It SHALL assert
persisted current-format JSON against independently specified expected
transformations and preserved user data. No-op, repeat loading,
failed/interrupted migration and exact unchanged legacy-archive preservation SHALL be covered.
Missing expected coverage SHALL fail rather than silently skip.

#### Scenario: A customized historical dashboard upgrades
- **WHEN** the candidate starts with its saved older JSON, generated files and existing entry
- **THEN** the saved result has the expected format version and transformations
- **AND** names, order, selections/deletions, explicit emptiness, options, unknown fields, raw cards and protected custom YAML are preserved as specified

#### Scenario: An unchanged schema upgrades
- **WHEN** the previous release's current-format configuration needs no JSON conversion
- **THEN** its source is preserved and new assets/generated compatibility are verified without a gratuitous schema increment

#### Scenario: Migration is rerun or deliberately fails
- **WHEN** the scenario restarts/regenerates repeatedly or injects a validation/write/interruption failure using fixtures
- **THEN** idempotence, unchanged invalid/newer inputs and recoverable exact prior data are verified without false success

### Requirement: Persistent focused frontend preview
Development SHALL offer persistent preview of selected components on the real disposable dashboard or supported editor, using current installed assets and native HA components. Watch SHALL serialize rebuild, frontend sync and browser refresh while preserving route and viewport. Asset, resource and console failures SHALL remain visible. Preview SHALL NOT imply automated acceptance or release readiness.

#### Scenario: A presentation edit is saved
- **WHEN** the focused preview is watching a compatible prepared installation
- **THEN** the latest workspace frontend files are synchronized to HA and the same view refreshes
- **AND** unrelated cards and profile matrices are not traversed

#### Scenario: Preview closes
- **WHEN** the preview browser closes
- **THEN** watch stops and the last successfully synchronized assets remain installed
- **AND** no continuous background synchronization or package rollback is started

#### Scenario: Frontend preview cannot safely proceed
- **WHEN** native-dashboard or legacy-backend compatibility, ownership or an active deployment cannot be verified
- **THEN** preview stops before synchronization and explains the required preparation
- **AND** it never resets source, fixtures or helpers as a fallback

#### Scenario: Inspection fails after a successful sync
- **WHEN** a visual or browser check reports a defect in successfully synchronized current assets
- **THEN** the defect remains visible and the latest assets remain installed for correction
- **AND** routine cleanup does not restore an older package, while safe helper restoration and genuinely failed-operation recovery remain required

#### Scenario: A selected component is absent
- **WHEN** the requested preview has no matching rendered component
- **THEN** it reports missing scope rather than claiming a successful inspection

## ADDED Requirements

### Requirement: Released native-frontend migration inventory
Migration verification SHALL cover supported historical source formats and generated contracts using frozen provenance-backed inputs and independent expected targets. Modern released installations SHALL be represented explicitly rather than by freshly composed current fixtures. Coverage SHALL distinguish released-package execution, historical-data replay and current-candidate checks.

#### Scenario: Modern installation coverage is selected
- **WHEN** native-frontend migration evidence is planned
- **THEN** a v0.17.0 format-2/contract-2 baseline and provenance-verified v0.21.1 format-2/contract-3 baseline supplement existing historical native-storage/format-0/format-1 inputs, with v0.20.0 retained as older contract-3 data coverage
- **AND** a current fixture is not labeled as a frozen released installation
- **AND** an explicitly refreshed current-release baseline requires verified tag/commit/package provenance rather than assuming that repository version metadata proves publication

#### Scenario: New active feature work is integrated
- **WHEN** the implementation candidate includes additional supported options or families
- **THEN** parity expectations and the reviewed consumer inventory include them without rewriting historical provenance

### Requirement: Migration preservation and failure proof
Manual migration checks SHALL cover exact private source/output/package/archive backups, native registration/import interruption, matching rollback and unrelated concurrent edits. Invalid/future/ambiguous sources, damaged custom regions and unresolved private dependencies SHALL fail before removal.

#### Scenario: Import is interrupted after native creation
- **WHEN** the native registration exists without the accepted complete document
- **THEN** guidance inspects actual state and finishes that same import or restores matching package/data
- **AND** no duplicate root or automatic starter replaces the migration target

#### Scenario: An unrelated edit occurs
- **WHEN** actual state differs from the recorded migration changes
- **THEN** recovery preserves the independent edit and reports any conflict
- **AND** stale whole-registry and package-only restoration are rejected

### Requirement: Preserved installation handoff acceptance
Development acceptance SHALL migrate an actual preserved current released installation through the selected package path, retaining its route/source/content and unrelated state. It SHALL verify persistence after required migration restarts and operation after removal of Marao Python. Representative older contract/native-storage inputs SHALL supplement the current-release proof.

#### Scenario: The refreshed current-release installation upgrades
- **WHEN** the reviewed transition runs on disposable HA with its exact saved baseline
- **THEN** the same dashboard root/views and supported custom content work after migration and Python removal
- **AND** exact source/output/archives remain recoverable and no entity action is dispatched by migration
- **AND** the v0.21.1 baseline, or explicitly refreshed provenance-verified current release, retains its supported access/popup/spacing behavior without a gratuitous source-format increment

#### Scenario: Fresh fixture preparation is supplied instead
- **WHEN** evidence was collected only from a freshly generated native dashboard
- **THEN** it cannot satisfy preserved-install migration or rollback acceptance

### Requirement: Later frontend update without HA restart
After verified Python removal, an actual Dashboard-to-Dashboard package update SHALL demonstrate unchanged HA process/start identity, consistent new frontend resources and preserved configuration while the client refreshes. Browser overrides, a first native install or an integration reload SHALL NOT establish this result.

#### Scenario: A migrated installation receives its next frontend release
- **WHEN** the next package is installed through the tested HACS Dashboard path
- **THEN** the dashboard obtains the new entry and deferred assets while HA remains running
- **AND** no Marao Python endpoint, integration reload or HA restart is needed

### Requirement: Native source privacy and authorization proof
Tests SHALL verify admin-only native writes, native configuration read visibility, explicit migration disclosure, and refusal to publish unresolved private/unknown content or server-only references. A hidden/admin-only interface SHALL NOT be accepted as a private data store. Reports SHALL use redacted paths/reasons without publishing source secrets.

#### Scenario: A regular user requests native dashboard configuration
- **WHEN** source is stored in the strategy document
- **THEN** evidence records HA's actual read visibility instead of claiming the former admin-only source boundary
- **AND** unauthorized writes fail

#### Scenario: Protected YAML references private configuration
- **WHEN** source contains secret/include tags, unknown tags, legacy private envelopes or unresolved non-owned references
- **THEN** migration blocks pending a reviewed safe disposition without exposing, deleting or silently expanding their values

### Requirement: Legacy client and asset retirement proof
Verification SHALL distinguish already released legacy clients from native Dashboard updates. The manual procedure SHALL require draft export and stopping old editors before removal, plus full-refresh/reopen guidance afterward. No new backend redirect/fence SHALL be promised. Native deferred graph/draft/reconnect checks SHALL protect ordinary later updates without loops or mixed registrations.

#### Scenario: An offline legacy client returns after removal
- **WHEN** its cached document requests the removed Python bootstrap
- **THEN** a full HA refresh/reopen is the documented recovery path
- **AND** obsolete endpoint errors are not hidden or claimed to have passed

#### Scenario: Unsaved legacy work exists
- **WHEN** manual removal is prepared
- **THEN** it must first be exported and editing stopped on all clients
- **AND** retained released code is not claimed to provide a new migration fence

### Requirement: Retained feature and removal acceptance
Selected migration verification SHALL cover every retained card family and materially different option, builder operation, route/popup, availability/error and safe action path. It SHALL separately prove History removal, unchanged old archives and native-only Netatmo behavior. Existing test layers and compatible visits SHALL be reused; unrelated comprehensive suites are not implied.

#### Scenario: The frontend-only candidate is exercised
- **WHEN** the reviewed safe gallery and realistic-page cases execute
- **THEN** native controls retain correct targeting, single dispatch, security gesture cancellation and preserved configuration
- **AND** Visual/JSON/Monaco, import/export, save/discard and embedded HA cards retain their supported behavior

#### Scenario: Native access output uses current gesture behavior
- **WHEN** safe touch/pointer tests finish within or beyond the track's right edge after horizontal intent
- **THEN** the final release position governs one dispatch while incomplete, reversed, out-of-lane and cancelled gestures still dispatch nothing
- **AND** current sending/accepted/skipped/error and authoritative-state behavior is retained without claiming physical outcome or vibration proof

#### Scenario: Native styling uses current popup and navigation layout
- **WHEN** selected existing checks inspect the migrated access popup and navbar at the affected mobile layouts
- **THEN** the growing access header, one live state/icon, leading action icons, opening slider label and centered close/lock text retain current appearance without replacing an active slider
- **AND** navbar positioning, fallback page clearance and every popup/detail/color sheet use the same 24px-minimum/doubled-lowered-iPhone-offset bottom-gap calculation

#### Scenario: Removed features are inspected
- **WHEN** the builder saves and Netatmo opens under the new frontend
- **THEN** no configuration History/Restore or custom Netatmo endpoint is called
- **AND** old archives are unchanged, sensor/energy history remains supported and missing Netatmo types are not invented

### Requirement: Manual-only camera transport during migration
The expanded migration campaign SHALL keep camera playback/transport, HLS, slow-link, handoff and cancellation validation manual-only. Automated camera checks SHALL cover configuration, provider metadata, permissions, preservation and obsolete-result logic without synthetic playback. Existing approved exceptions SHALL remain explicit rather than become passing results.

#### Scenario: The migration test campaign is selected
- **WHEN** its automated checks are planned or executed
- **THEN** no camera playback/transport gate is added through upgrade, broad regression or packaging paths
- **AND** non-camera failures and retained camera data/security failures remain actionable
