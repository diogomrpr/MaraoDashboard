# Spec Delta

## MODIFIED Requirements

### Requirement: Meaningful focused checks
Development and release verification SHALL use the smallest covering unit/static/browser checks for implemented features, touched components and shared consumers. Icon-only controls and shared action geometry SHALL select alignment checks; changed sliders SHALL select slider checks. Test-only and documentation-only changes SHALL not trigger unrelated application suites or device actions. Visibility checks SHALL NOT replace required action, security, migration or recovery assertions.

#### Scenario: A shared icon-only media layout is edited
- **WHEN** its focused verification runs
- **THEN** alignment is checked within the runner's 0.5 CSS-pixel tolerance and representative affected components and difficult layouts are visually inspected afterward

#### Scenario: A card label changes without persistence or gesture changes
- **WHEN** the selected verification runs
- **THEN** its relevant rendering/localization and difficult text-layout checks execute
- **AND** unrelated camera, slider, reconnect, editor-save and historical live-upgrade checks do not execute

#### Scenario: Additional meaningful focused checks contracts
- **WHEN** development, integration or publication checks are selected
- **THEN** Explicitly requested integration verification of icon-only/shared action geometry SHALL select relevant alignment checks; changed sliders SHALL select relevant slider checks within that requested scope.
- **AND** Visibility SHALL NOT replace dispatch or data-preservation assertions.
- **AND** Publication SHALL use affected unit tests and applicable metadata validation, reusing development integration evidence.

### Requirement: Mobile release matrix
Default release verification SHALL select mobile profiles for affected UI contracts, preserving isolated touch/device settings, typography and native HA compatibility. Layout coverage SHALL include affected cards at 320px and relevant text/zoom, theme, portrait and landscape conditions. Theme-independent geometry SHALL use one reference theme with representative appearance/state coverage in both themes. The full matrix SHALL remain available only through explicit comprehensive verification.

#### Scenario: A release mobile run inspects every view and popup
- **WHEN** explicitly requested comprehensive checks encounter scrolling cards or opening sheets
- **THEN** the selected typography, theme, touch and safe-area profile remains applied

#### Scenario: A scoped release changes a popup layout
- **WHEN** default release checks execute
- **THEN** only affected popup families and representative difficult mobile profiles are inspected
- **AND** unchanged views and all 26 combinations are not automatically traversed

#### Scenario: A layout has no theme-dependent geometry
- **WHEN** an affected family requires nine geometry profiles and independent appearance checks
- **THEN** the plan covers those nine profiles in one reference theme and a representative appearance run in the other theme
- **AND** it does not require all eighteen profile/theme combinations for the same geometry assertions

#### Scenario: A theme changes the measured layout
- **WHEN** theme-dependent typography, control rendering or another layout input affects an assertion
- **THEN** the plan includes the affected theme/profile combinations and records their selection reason
- **AND** an unreviewed dependency retains conservative coverage rather than being assumed equivalent

#### Scenario: Text scaling and browser zoom are relevant
- **WHEN** a layout change selects enlarged-text and zoom coverage
- **THEN** 200% text and 200% browser zoom remain distinct cases
- **AND** selected normal, bold and bold-plus-200% text cases are not removed merely because one enlarged case passes

#### Scenario: Additional mobile release matrix contracts
- **WHEN** the user explicitly requests mobile integration verification
- **THEN** The full matrix SHALL remain available only through explicit comprehensive verification.

### Requirement: Interaction and resource verification
Selected browser checks SHALL verify the changed contract: relevant cold loads, scrolling, safe-area/navbar clearance, popup focus/scroll/close, availability/errors, external state changes, single dispatch and gesture cancellation. Connection changes SHALL retain native warning and exception assertions. Failures SHALL retain screenshots and raw diagnostics; success captures SHALL be representative unless exhaustive captures were explicitly requested.

#### Scenario: A browser interaction check completes without an exception
- **WHEN** the corresponding popup is visually empty or clipped
- **THEN** the UI still fails acceptance and requires a root fix

#### Scenario: An implementation changes single-dispatch behavior
- **WHEN** focused browser verification executes
- **THEN** dispatch count and relevant cancellation paths are asserted using safe fixtures
- **AND** a visible button alone cannot satisfy the check

#### Scenario: State transitions do not depend on viewport size
- **WHEN** threshold, preservation or dispatch checks share behavior across selected geometry profiles
- **THEN** representative behavior runs retain all distinct assertions
- **AND** geometry-only runs inspect appropriate fixed states without replaying the entire transition sequence
- **AND** theme-independent behavior runs once in a reference theme while theme-dependent interactions run once per relevant theme
- **AND** appearance, contrast and distinct state cues retain representative coverage in both themes

#### Scenario: Native gestures need distinct coverage
- **WHEN** a changed control depends on native touch handling or engine-specific geometry
- **THEN** relevant iPhone/Android or browser-engine checks retain completion, cancellation and containment assertions
- **AND** reducing theme duplication does not silently remove those cases
- **AND** device and engine repeats target native gesture or geometry differences

### Requirement: Publication gate and exact-commit CI
Pushes, tags and releases SHALL require successful checks for all affected changes and applicable exact-commit CI, including relevant packaging, assets, hassfest and HACS. Publication SHALL NOT implicitly require full-suite, full-matrix or unrelated preserved-install checks. Failed selected checks and known relevant violations SHALL block publication. Valid scoped evidence SHALL be reusable for unchanged inputs; approved native exceptions SHALL remain explicit and time-limited.

#### Scenario: Verification runs after native reconnect checks are retired
- **WHEN** affected, full, upgrade or publication verification is selected
- **THEN** it does not inject the retired native HA reconnect outage or probe upstream fix delivery
- **AND** disconnected-action unit tests and ordinary failure reporting remain available

#### Scenario: A release contains several completed implementation batches
- **WHEN** publication scope is computed
- **THEN** all changes since the previous released baseline and their shared consumers are included
- **AND** a clean working tree cannot produce an empty scope merely because no files are currently uncommitted

#### Scenario: Additional publication gate and exact-commit CI contracts
- **WHEN** a push, tag or release is prepared
- **THEN** Failed selected checks and known relevant violations SHALL block publication.
- **AND** Valid scoped evidence SHALL be reusable for unchanged inputs; accepted exceptions SHALL remain explicit.

#### Scenario: Candidate or selected inputs change after verification
- **WHEN** publication evidence is checked
- **THEN** stale proof is rejected and the affected scope is recomputed
- **AND** only invalidated relevant checks rerun before evidence is bound to the final commit
