## ADDED Requirements

### Requirement: Generator-only verification selection
Development and publication selectors SHALL exclude discontinued standalone-native authoring suites and fixtures. Assertions for surviving shared behavior and independently owned data SHALL remain covered through generated-dashboard or focused ownership cases. Tests of Home Assistant player internals, native gestures and historical generator storage SHALL NOT be removed solely because their names contain `native`.

#### Scenario: Shared component check selection
- **WHEN** reviewed changes to camera, grid, navigation or shared rendering select affected checks
- **THEN** the plan excludes retired standalone editor, starter and adapter checks
- **AND** it retains applicable generated behavior, safety, ownership and migration checks

#### Scenario: Generated fixture coverage
- **WHEN** the disposable test dashboard is prepared for supported product and gallery verification
- **THEN** it provides generated examples under the single `/marao-dashboard` root without standalone-native example views
- **AND** materially distinct shared interaction assertions formerly exercised only by native examples have generated or focused ownership coverage

### Requirement: Evidence of reduced verification scope
The removal SHALL record comparable affected-check selections before and after implementation using the same reviewed representative component scopes. Evidence SHALL identify eliminated native-only checks and retained shared assertions. It SHALL NOT claim execution-time savings without measurement or trigger comprehensive verification implicitly.

#### Scenario: Compare selection plans
- **WHEN** the removal is verified
- **THEN** evidence compares the selected logical checks for equivalent component scopes before and after removal
- **AND** explains retained coverage for generated editing, rendering, popups, navigation, camera playback and ownership protection

#### Scenario: Scoped implementation acceptance
- **WHEN** the change is accepted for implementation completion
- **THEN** focused affected checks and current targeted disposable-instance observations demonstrate the supported generator workflow and absence of retired requests or authoring entries
- **AND** independently owned saved data is verified unchanged
- **AND** no full suite or exhaustive mobile matrix is required unless explicitly requested
