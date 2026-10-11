# Spec Delta

## ADDED Requirements

### Requirement: Release-only preserved-install upgrade gate
A dedicated upgrade scenario SHALL run only during explicit release preparation
immediately before versioned publication. It SHALL be required in addition to
the existing publication gate and SHALL not run automatically in normal tests,
push/PR checks or non-release stabilization. An existing installation SHALL be
upgraded without reseeding its source, removing its HA entry or regenerating a
fresh starter. Upgrade failure SHALL block release.

#### Scenario: Routine tests or branch publication run
- **WHEN** ordinary unit/static/browser checks, default CI or the existing push gate execute
- **THEN** the full upgrade scenario is not invoked

#### Scenario: A versioned release is about to be tagged or published
- **WHEN** release verification executes
- **THEN** the preserved-install upgrade scenario and existing publication checks pass for the candidate before publication proceeds
- **AND** successful fresh-install checks alone cannot satisfy upgrade verification

### Requirement: Historical upgrade fixtures and expected JSON
Upgrade coverage SHALL retain provenance-backed fixtures for every supported
released JSON format, including direct skipped-version upgrades. It SHALL assert
persisted current-format JSON against independently specified expected
transformations and preserved user data. No-op, repeat restart/generation,
failed/interrupted migration and legacy history restoration SHALL be covered.
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

### Requirement: Complete post-upgrade functional coverage
The upgrade scenario SHALL cover every supported Marao feature through an
explicit feature-to-scenario inventory: integration/admin/editor operations,
generation/history/customization, pages/navigation/popups, every card family and
material option/state/action, camera/history content, themes/mobile layouts and
safe interactions. Existing checks SHALL inspect the upgraded dashboard before
any fresh-fixture preparation.

#### Scenario: An upgraded dashboard is checked end to end
- **WHEN** browser and configuration checks run on the preserved installation
- **THEN** all applicable historical features retain their configured behavior and the candidate's supported features remain usable
- **AND** tests exercise Visual/JSON round-trip/save/discard, generated references, history, safe actions/cancellation, availability, content, resources and mobile profiles

#### Scenario: A new feature is introduced later
- **WHEN** the released feature inventory grows
- **THEN** its applicable historical/new-feature-on-upgraded-install scenarios and expected configuration are added
- **AND** unmapped or unexecuted supported behavior prevents the release gate passing

#### Scenario: Test preparation tries to replace migrated configuration
- **WHEN** a browser check would run fresh-fixture provisioning against the upgraded installation
- **THEN** upgrade verification fails or uses a guarded preserved-install path instead
- **AND** reseeded output cannot be reported as evidence that migration succeeded

#### Scenario: A historical configuration contains an unsupported raw extension
- **WHEN** it is migrated and round-tripped through the editor
- **THEN** its raw configuration is preserved without inventing executable support or silently dropping fields

### Requirement: Private isolated upgrade execution and recovery
Upgrade execution SHALL use only disposable `192.168.0.28` and safe fixtures,
with private backups and evidence. It SHALL preserve the pre-test environment,
modify only declared test-owned state, and restore that environment on success
or failure. Cleanup failure SHALL fail the gate and retain recovery instructions.
The scenario SHALL NOT upgrade HA itself, install third-party cards or overwrite
real providers. Only one test dashboard root SHALL be active.

#### Scenario: A historical upgrade scenario completes or aborts
- **WHEN** its cleanup runs
- **THEN** prior test configuration, owned files/registrations and fixture state are restored and verified
- **AND** failures remain reported with private recovery artifacts rather than being converted into success

### Requirement: Candidate-specific release evidence
Upgrade results SHALL identify baseline releases/formats, candidate commit and
package/source fingerprint, expected JSON assertions, feature/profile coverage
and recovery status. A missing, failed, incomplete or stale result SHALL block
versioned publication. Candidate changes SHALL invalidate prior results. Reports
SHALL distinguish automated profiles from physical-device checks and SHALL NOT
expose private configuration, credentials or media.

#### Scenario: Candidate files change after a successful run
- **WHEN** versioned publication is attempted
- **THEN** the old result does not satisfy the gate and release preparation reruns verification for the changed candidate

#### Scenario: Only part of the upgrade matrix completed
- **WHEN** one baseline, feature, profile or cleanup check is missing or failed
- **THEN** the release report states the incomplete coverage and publication remains blocked
