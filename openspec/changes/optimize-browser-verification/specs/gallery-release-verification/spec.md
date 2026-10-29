# Spec Delta

## MODIFIED Requirements

### Requirement: Mobile release matrix
Default release verification SHALL select mobile profiles appropriate to the affected UI contracts and SHALL NOT automatically run all 26 profile/theme combinations. Layout changes SHALL cover representative affected cards at 320px and relevant text/zoom, theme, portrait and landscape conditions. Theme-independent geometry SHALL run in one reference theme, with representative appearance and state checks in both themes; theme-dependent geometry SHALL retain the necessary additional combinations. The existing complete mobile matrix SHALL remain available through explicitly requested comprehensive verification. Selected runs SHALL preserve isolated touch/device settings, typography and native HA compatibility.

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

### Requirement: Interaction and resource verification
Selected browser checks SHALL verify the changed contract: relevant cold loads, scrolling, safe-area/navbar clearance, popup focus/scroll/close, availability/errors, external state changes, single dispatch and gesture cancellation. Connection changes SHALL retain native warning and exception assertions. Theme-independent behavior SHALL execute once in a reference theme; theme-dependent interactions SHALL run once per relevant theme, and device or engine repeats SHALL target native gesture or geometry differences. Appearance, contrast and distinct state cues SHALL retain representative coverage in both themes. Failures SHALL retain screenshots and raw diagnostics; success captures SHALL be representative unless exhaustive captures were explicitly requested.

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

#### Scenario: Native gestures need distinct coverage
- **WHEN** a changed control depends on native touch handling or engine-specific geometry
- **THEN** relevant iPhone/Android or browser-engine checks retain completion, cancellation and containment assertions
- **AND** reducing theme duplication does not silently remove those cases

## ADDED Requirements

### Requirement: Compatible browser visits
Affected verification SHALL share compatible page visits and deduplicate equivalent delegated checks while preserving every required logical assertion and relevant cold-load check. Shared visits SHALL retain diagnostics, restore mutated state between checks and remain serial by default. Incompatible saves, helper mutations or restoration SHALL keep exclusive execution and verified cleanup.

#### Scenario: Two selected families use the same gallery profile
- **WHEN** their checks share installation, route, device, theme and fixture assumptions
- **THEN** one visit executes both sets of assertions and records coverage for each family
- **AND** a failure in either family fails the selected verification

#### Scenario: An alignment command delegates to already selected geometry
- **WHEN** the delegated check has equivalent assertions and execution conditions
- **THEN** one execution satisfies both logical coverage requests
- **AND** differing options, fixtures or cold-load requirements prevent unsafe deduplication

#### Scenario: A shared visit changes state
- **WHEN** a check opens a popup or mutates a safe fixture or draft
- **THEN** restoration completes and is verified before another dependent check starts
- **AND** failed cleanup fails the visit and prevents reuse of its results

### Requirement: Reusable completed checks
Affected verification SHALL support explicit reuse of completed checks from private evidence after validating freshness, coverage, dependency identities, execution conditions and cleanup. The current required scope SHALL be computed independently. Failed, missing, stale, unsupported or invalidated checks SHALL execute again. Publication SHALL bind the combined validated proof to the clean current candidate without altering its source reports.

#### Scenario: A batch fails after an independent successful check
- **WHEN** reuse is requested and the source batch has verified cleanup and a matching successful result
- **THEN** the successful check is eligible for reuse even though the source batch failed overall
- **AND** the failed and unexecuted checks still run and determine the new batch outcome

#### Scenario: Only an unrelated dependency changes
- **WHEN** reviewed dependency mapping proves that a completed check's behavior inputs and execution conditions are unchanged
- **THEN** that check is reused while checks affected by the edit execute again
- **AND** unknown shared dependencies remain conservatively invalidating

#### Scenario: A selected input or environment changes
- **WHEN** relevant source, tests, coverage policy, dependencies, fixtures, target, Home Assistant frontend or browser identity changes
- **THEN** dependent results are invalidated
- **AND** a changed candidate receives fresh preparation or installation validation before any live result is accepted

#### Scenario: Evidence or cleanup cannot be verified
- **WHEN** evidence is malformed, tampered with, stale, unsupported, missing required artifacts or lacks verified cleanup
- **THEN** it contributes no reused pass
- **AND** invalid reuse inputs are reported explicitly while any new execution still requires safe preparation

#### Scenario: A report attempts to reduce coverage
- **WHEN** its declared requirements omit a case selected by the current coverage policy
- **THEN** the current plan still requires that case and cannot be satisfied by the edited report

#### Scenario: Publication includes reused checks
- **WHEN** all current required cases pass through fresh execution or validated reuse
- **THEN** the final report identifies each reused source result and binds all validated coverage to the clean final commit
- **AND** applicable exact-commit CI and conditional preserved-install proof remain required

### Requirement: Measurable scoped execution
Private scoped reports SHALL distinguish logical coverage from physical visits, fresh executions and reused results. They SHALL record selection and equivalence reasons, per-check durations, total wall time and capture counts. Reused results SHALL retain original execution time and provenance separately from current validation time. Reports SHALL preserve failures and representative successes without claiming unexecuted coverage or unmeasured speedups.

#### Scenario: A combined visit covers two components
- **WHEN** the report is produced
- **THEN** both components' required cases identify the shared execution and its outcome
- **AND** visit duration is counted once in execution totals

#### Scenario: An optimization is evaluated
- **WHEN** equivalent affected scopes are compared on the same disposable environment
- **THEN** reports distinguish cold execution savings, reuse savings, setup and cleanup costs
- **AND** reduced combination counts are not described as measured wall-time savings

#### Scenario: Comprehensive execution is not requested
- **WHEN** an ordinary affected batch completes
- **THEN** its report identifies omitted combinations and the reasons for equivalent coverage
- **AND** complete-matrix and historical suites remain explicitly unexecuted
