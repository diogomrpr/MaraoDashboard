# Spec Delta

## MODIFIED Requirements

### Requirement: Native integration setup
Marao SHALL install as a self-contained HACS Dashboard resource using ordinary HA storage-backed configuration and native authoring. Runtime, card editors and explicit conversion SHALL require no Marao Python integration, companion server, runtime CDN, development tooling or third-party card dependency. Fresh dashboard creation SHALL NOT discover or overwrite existing saved content automatically.

#### Scenario: First configuration
- **WHEN** an administrator installs the Dashboard package and opts an ordinary HA dashboard into Marao
- **THEN** native editing, Marao cards and the shared navbar are available at that dashboard's actual root
- **AND** subsequent restarts retain saved native content without generating or refilling it

### Requirement: Administrator management API
Dashboard conversion, native configuration writes and shared Marao settings changes SHALL require HA administrator authorization. Readable native source SHALL follow HA's disclosed authenticated-read boundary. Hiding controls or dashboards SHALL NOT be represented as source privacy. No retired Marao management endpoints SHALL be required.

#### Scenario: A non-administrator attempts management
- **WHEN** a non-administrator attempts a native configuration, conversion or shared-settings write
- **THEN** HA denies the write and saved content remains unchanged
- **AND** no administrator controls or secret-bearing diagnostic data are exposed

### Requirement: Validated save and recoverable generation
Native edits SHALL follow HA's save semantics. Marao-authored card/settings/conversion changes SHALL validate before writes, retain failed dialog/conversion input and reject an already changed baseline. Errors SHALL remain visible. Native acknowledgement/readback SHALL NOT be claimed as disk-durability or cross-device compare-and-swap proof; conversion SHALL have separate exact recovery data.

#### Scenario: Generation fails after a valid baseline was saved
- **WHEN** historical conversion fails validation or compilation before import
- **THEN** the prior dashboard is unchanged and the failure retains the conversion input and recovery exports

#### Scenario: An already stale settings or conversion draft is saved
- **WHEN** the saved native document differs from its captured baseline
- **THEN** Marao refuses replacement and retains the proposed data for reconciliation
- **AND** it does not merge blindly or overwrite the other writer

#### Scenario: Two devices save simultaneously
- **WHEN** both devices passed their pre-save comparison before either native write
- **THEN** HA's documented last-writer limitation applies
- **AND** Marao makes no stronger locking, transaction or durability claim

### Requirement: Explicit dashboard format versions
Historical source, native envelope/compiler contracts, ordinary-native Marao metadata and package releases SHALL have distinct documented version boundaries. Only supported valid versions SHALL be accepted. Historical conversion SHALL follow the maintained ordered chain; ordinary native documents SHALL NOT be reinterpreted as builder source. Unsupported newer data SHALL remain untouched.

#### Scenario: A user skips intermediate Marao releases
- **WHEN** a supported historical document is imported
- **THEN** the ordered conversion chain reaches valid ordinary native output without installing intermediate packages
- **AND** its source, conversion steps and target metadata version are identifiable

#### Scenario: A future or malformed version is encountered
- **WHEN** source or metadata declares an unsupported, negative, boolean, fractional or nonnumeric version
- **THEN** a readable compatibility error is reported without starter reset or data writes

#### Scenario: Already current configuration is processed again
- **WHEN** an ordinary native dashboard is reloaded, updated or reopened by the conversion tool
- **THEN** no conversion, duplicate cards or migration-only writes occur

### Requirement: Recoverable failed or interrupted upgrade
Conversion SHALL validate and stage the complete replacement before one native import, retain exact source/recovery data and protect unrelated concurrent edits. Failed or interrupted operations SHALL remain distinguishable from success and support recovery with the matching package and data. Invalid source SHALL NOT be reset into a starter, and native save acknowledgement SHALL NOT imply stronger disk guarantees.

#### Scenario: Conversion or regeneration fails
- **WHEN** validation, custom-content preflight or conversion reports an error
- **THEN** the saved dashboard is retained, the error is visible and recovery data remains available
- **AND** recovery does not overwrite unrelated concurrent changes

#### Scenario: HA stops during migration writes
- **WHEN** an administrator reopens after an interrupted conversion
- **THEN** the actual saved document is classified as original, converted or divergent before further action
- **AND** the original may be retried explicitly, the converted document is not converted twice, and a divergent document requires reconciliation
- **AND** restoration uses the matching saved package/data without automatic destructive retries

## ADDED Requirements

### Requirement: Same-root ordinary dashboard cutover
Explicit conversion SHALL retain the existing dashboard registration, root, landing view, page paths, title, icon, sidebar/admin settings and source-defined navigation. It SHALL preserve independent dashboards, resources, installed themes, legacy files and private archives. A conflicting or ambiguous target SHALL block replacement.

#### Scenario: The v0.23.4 dashboard is converted
- **WHEN** an administrator confirms a validated conversion of its source-format-2 envelope
- **THEN** ordinary native views/cards replace only that dashboard's strategy document at the same root
- **AND** its registration settings and unrelated HA configuration retain their prior values

#### Scenario: Another document now occupies the target
- **WHEN** target ownership or baseline identity cannot be established
- **THEN** conversion refuses replacement with recovery/export guidance
- **AND** no alternative product dashboard is created to bypass the conflict

### Requirement: Exact conversion recovery and provenance
Before replacing active configuration, conversion SHALL provide exact original source/envelope and embedded YAML recovery data plus the complete proposed native document. Supported active options and opaque target fields SHALL remain in the target. Unmapped source-only fields and original text SHALL remain identifiable in immutable provenance/recovery data and SHALL NOT be discarded or treated as an active generator.

#### Scenario: Source includes opaque fields and YAML comments
- **WHEN** conversion processes unknown descriptor/page fields and embedded YAML with comments
- **THEN** the recovery export retains their exact original representation and conversion reports their disposition
- **AND** active raw-card values and custom content remain in the native target
- **AND** HA's YAML editor is not claimed to preserve the original comment formatting

#### Scenario: Recovery data cannot be prepared
- **WHEN** required originals or recovery exports are missing or invalid
- **THEN** active replacement is blocked and the saved document remains unchanged

### Requirement: Persisted shared metadata compatibility
Supported HA editing and save paths SHALL retain the versioned dashboard-wide Marao settings and unrelated native fields. Resource loading SHALL validate opt-in/version before applying navigation or styling. Unsupported host capabilities SHALL produce readable guidance and block conversion without substituting a strategy or per-view navbar requirement.

#### Scenario: HA saves an unrelated native edit
- **WHEN** a card, section, view, dashboard setting or raw configuration is edited, undone/redone, saved and reloaded
- **THEN** the shared navbar settings and opaque native options retain their values
- **AND** no stale retained copy overrides a deliberate settings deletion

#### Scenario: The supported host cannot supply automatic navigation
- **WHEN** compatibility checks cannot establish automatic navbar initialization or settings retention
- **THEN** conversion and dashboard opt-in stay unavailable with a readable reason
- **AND** ordinary HA editing and saved data remain usable without hidden per-page placement

## REMOVED Requirements

### Requirement: Refresh after every successful editor generation
**Reason**: Save & Generate retires with the builder; normal native edits use HA configuration updates without forcing cache cleanup after every edit.

**Migration**: Use native dashboard updates for configuration changes and retain the existing explicit cache-refresh/package-update recovery paths independently. Conversion previews and failed writes do not trigger refresh or entity actions.
