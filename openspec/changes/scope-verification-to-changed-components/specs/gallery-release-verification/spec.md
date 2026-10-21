# Spec Delta

## MODIFIED Requirements

### Requirement: Meaningful focused checks
Development and release verification SHALL use the smallest covering unit/static/browser checks for implemented features, touched components and shared consumers. Icon-only controls or shared action geometry changes SHALL select relevant alignment checks; changed sliders SHALL select relevant slider checks. Test-only and documentation-only changes SHALL not trigger unrelated application suites or device actions. Visibility checks SHALL NOT replace required action, security, migration or recovery assertions.

#### Scenario: A shared icon-only media layout is edited
- **WHEN** its focused verification runs
- **THEN** alignment is checked within the runner's 0.5 CSS-pixel tolerance and representative affected components and difficult layouts are visually inspected afterward

#### Scenario: A card label changes without persistence or gesture changes
- **WHEN** the selected verification runs
- **THEN** its relevant rendering/localization and difficult text-layout checks execute
- **AND** unrelated camera, slider, reconnect, editor-save and historical live-upgrade checks do not execute

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
Push, tag and release verification SHALL require successful checks for the complete affected change set and applicable exact-commit CI, including relevant packaging, asset, hassfest and HACS validation. Publication SHALL NOT implicitly require the full suite, full mobile matrix or unrelated preserved-install checks. Failed selected checks and known relevant violations SHALL block publication. Valid scoped evidence SHALL be reusable for unchanged inputs; an approved native exception SHALL remain explicit and time-limited.

#### Scenario: The native reconnect check still fails for a future release
- **WHEN** changed connection behavior selects that check during publication preparation
- **THEN** raw assertions and native evidence are retained
- **AND** only the explicitly approved stale-unsubscribe exception applies while its stable upstream fix remains unavailable

#### Scenario: A release contains several completed implementation batches
- **WHEN** publication scope is computed
- **THEN** all changes since the previous released baseline and their shared consumers are included
- **AND** a clean working tree cannot produce an empty scope merely because no files are currently uncommitted

#### Scenario: Candidate or selected inputs change after verification
- **WHEN** publication evidence is checked
- **THEN** stale proof is rejected and the affected scope is recomputed
- **AND** only invalidated relevant checks rerun before evidence is bound to the final commit

### Requirement: Honest evidence and limits
Reports SHALL identify selected and excluded features, components, checks, profiles, baselines, execution mode, results and durations. Focused evidence SHALL NOT be labeled full-suite success. Reports SHALL distinguish automated Chromium profiles from actual phones/Safari. VoiceOver, TalkBack, OS high contrast, desktop acceptance and real-device actuation remain outside acceptance; physical haptic strength SHALL NOT be claimed from browser automation.

#### Scenario: Only automated phone profiles were run
- **WHEN** completion is reported
- **THEN** the report identifies emulation and does not claim physical iPhone/Android testing

#### Scenario: A focused release passes
- **WHEN** verification is reported
- **THEN** omitted full-suite, matrix and historical-baseline checks are explicitly identified as not run rather than passed

## ADDED Requirements

### Requirement: Affected verification selection
A saved affected-check command SHALL derive scope from an explicit comparison baseline, changed tracked/untracked inputs and declared implemented components. It SHALL include shared consumers, deduplicate checks and print selection reasons without contacting Home Assistant in plan mode. Unknown or ambiguous scope SHALL require explicit resolution and SHALL NOT trigger the full suite or silent success.

#### Scenario: Shared slider code changes
- **WHEN** a focused plan is produced
- **THEN** light, fan and cover consumers and relevant runtime, generation and geometry checks are included
- **AND** unrelated camera and editor operations are excluded

#### Scenario: An ambiguous monolithic source file changes
- **WHEN** file paths cannot determine which shared behaviors changed
- **THEN** explicit component scope is required and its complete consumer set is retained
- **AND** the plan cannot silently omit mapped dependencies

### Requirement: Explicit comprehensive verification
The complete registered suite SHALL remain available through an explicit full-suite command, including unit/static checks, browser interactions, all mobile profiles and historical preservation/recovery scenarios. Routine commands, release requests, hooks and automatic CI SHALL NOT invoke comprehensive verification implicitly. Full-suite prerequisites SHALL be checked before expensive work; unavailable required checks SHALL fail rather than be skipped or reported successful.

#### Scenario: Only a routine test or release is requested
- **WHEN** the default command, version hook or automatic CI executes
- **THEN** affected checks execute and the comprehensive command is not invoked

#### Scenario: The user explicitly requests everything in parallel
- **WHEN** comprehensive verification is launched with parallel mode
- **THEN** all registered checks are included and safe independent jobs overlap
- **AND** conflicts and required preparation remain serialized

### Requirement: Safe optional parallel verification
Verification SHALL run serially by default. Explicit parallel mode SHALL use bounded concurrency, isolated browser contexts, private job-specific artifacts and separate process results. Shared builds, deployment, dashboard writes, restarts, helper mutations and recovery SHALL be serialized unless isolation is established. Cleanup failures and failed jobs SHALL remain failures; preparation SHALL occur once per compatible batch.

#### Scenario: Browser contexts only read independent layouts
- **WHEN** parallel mode is explicitly selected after shared preparation
- **THEN** those jobs can overlap without changing each other's data or overwriting artifacts

#### Scenario: An editor save conflicts with another browser check
- **WHEN** parallel mode schedules both jobs against the same dashboard
- **THEN** the save and affected readers execute in separate exclusive phases
- **AND** fixture restoration completes before later jobs start

### Requirement: Change-scoped preserved-install verification
Live preserved-install checks SHALL be required only when changes affect persisted data, migration, generated-output ownership or installation/upgrade behavior. They SHALL cover affected formats, independent expected data, relevant recovery and verified cleanup on the final candidate. UI-only releases SHALL NOT automatically replay historical upgrades. Comprehensive coverage SHALL remain explicit; fresh fixtures SHALL NOT replace required preserved-install proof.

#### Scenario: A change affects every supported format conversion
- **WHEN** the release scope is selected
- **THEN** preservation and recovery checks cover every affected supported baseline
- **AND** browser checks remain limited to the changed features unless comprehensive verification was explicitly requested

#### Scenario: A release changes only a card's visual presentation
- **WHEN** no persistence, ownership or installation path changed
- **THEN** relevant card checks satisfy the scoped gate without a mandatory historical upgrade replay

#### Scenario: A selected historical replay fails or cleanup is incomplete
- **WHEN** release evidence is evaluated
- **THEN** publication fails and private backup/recovery evidence is retained
