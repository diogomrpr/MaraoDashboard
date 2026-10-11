# Spec Delta

## ADDED Requirements

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
