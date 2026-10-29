# Gallery and release verification

## Purpose

Provide a repeatable private development environment, exhaustive safe examples
and trustworthy mobile release verification against the current workspace.

## Requirements

### Requirement: Reuse the existing free development stack
Development SHALL use Node/npm, Python 3.14 in the existing virtual environment,
locked project dependencies, pinned Playwright and Chromium, and available browser
control. OpenSpec SHALL remain developer-only tooling. No new test framework,
paid browser service or weakened sandbox is required for this workflow.

#### Scenario: A fresh contributor prepares local checks
- **WHEN** the locked Node/Python dependencies and Chromium are installed
- **THEN** existing scripts provide focused tests, disposable sync and mobile inspection without HACS users installing those tools

### Requirement: Current-workspace disposable preparation
Ignored `ha-test/local.json` SHALL supply URL, administrator token, explicit
disposable acknowledgement and SSH connection. `ha:sync:dry-run` SHALL report the
plan without writes or HA contact. Full preparation SHALL build/deploy the current workspace, install safe fixtures, generate one dashboard and verify readiness.

#### Scenario: A frontend-only change is prepared
- **WHEN** the focused development preview prepares current workspace assets on the allowed disposable instance
- **THEN** frontend files are synchronized and Marao reloads when changed before the real HA page refreshes
- **AND** native HA controls and icons remain real, with no helper reset, explicit generation call or HA restart
- **AND** successful synced assets remain installed after inspection or preview closure
- **AND** its development evidence does not replace publication or upgrade checks

#### Scenario: Integration or fixture Python changes
- **WHEN** preparation detects restart-bound code
- **THEN** it restarts the disposable HA and waits for readiness before tests continue

#### Scenario: Additional current-workspace disposable preparation contracts
- **WHEN** a contributor prepares the allowed disposable instance
- **THEN** Frontend development preview SHALL synchronize only frontend files to an existing compatible installation, reload Marao when changed and verify served identities.
- **AND** It SHALL NOT reset helpers, explicitly invoke dashboard generation or restart HA.
- **AND** Normal entry reload SHALL retain its existing lifecycle, including applicable generated-output/history updates.

### Requirement: One exhaustive gallery with realistic counterparts
The disposable dashboard SHALL remain at `/marao-dashboard`, with Cases at
`card-test` and populated realistic product views. Canonical dashboard JSON,
Cases YAML, `cases.json`/`cases.js`, helpers and fake providers SHALL stay in
`ha-test/`. Every supported card and materially distinct state, option count,
behavior, popup/action/layout SHALL be visible; changed behavior SHALL also have
a representative realistic-page example. Equivalent value permutations need not form a Cartesian matrix.

#### Scenario: A supported capability is added
- **WHEN** its behavior changes the builder/runtime contract
- **THEN** canonical coverage and safe entities are updated in the same change
- **AND** both Cases and its realistic product placement exercise it

### Requirement: Meaningful focused checks
Development SHALL use the smallest check demonstrating the requested result. Presentation-only work SHALL permit code review and a short manual watch list, with agent browser inspection optional. Nontrivial logic SHALL use a small targeted assertion where useful. Concrete security, data-loss, migration and recovery risks SHALL receive focused checks.

#### Scenario: A shared icon-only media layout is edited
- **WHEN** the user explicitly requests focused integration verification
- **THEN** relevant alignment checks use the runner's 0.5 CSS-pixel tolerance
- **AND** presentation-only development may instead finish with code review and a short manual watch list

#### Scenario: A card label changes without persistence or gesture changes
- **WHEN** the selected verification runs
- **THEN** code review and a short localized-label watch list are sufficient, with optional targeted inspection
- **AND** unrelated camera, slider, reconnect, editor-save and historical live-upgrade checks do not execute

#### Scenario: Additional meaningful focused checks contracts
- **WHEN** development, integration or publication checks are selected
- **THEN** Explicitly requested integration verification of icon-only/shared action geometry SHALL select relevant alignment checks; changed sliders SHALL select relevant slider checks within that requested scope.
- **AND** Visibility SHALL NOT replace dispatch or data-preservation assertions.
- **AND** Publication SHALL use affected unit tests and applicable metadata validation, reusing development integration evidence.

### Requirement: Mobile release matrix
Explicitly requested integration verification SHALL select mobile profiles for affected UI contracts, preserving isolated touch/device settings, typography and native HA compatibility. Layout coverage SHALL include affected cards at 320px and relevant text/zoom, theme, portrait and landscape conditions. Theme-independent geometry SHALL use one reference theme with representative appearance/state coverage in both themes.

#### Scenario: A release mobile run inspects every view and popup
- **WHEN** explicitly requested comprehensive checks encounter scrolling cards or opening sheets
- **THEN** the selected typography, theme, touch and safe-area profile remains applied

#### Scenario: A scoped release changes a popup layout
- **WHEN** the user explicitly requests affected popup integration checks
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

### Requirement: Strict HACS boundary and reproducible assets
The editor SHALL be built from `frontend_src/` into committed runtime assets and
`check:editor` SHALL detect drift. HACS staging SHALL contain only the integration;
source and staged boundaries SHALL reject fixtures, synthetic media, local caches,
test dependencies and secrets. Test providers SHALL never overwrite real providers.

#### Scenario: A fixture or credential file enters the integration tree
- **WHEN** package boundary validation runs
- **THEN** packaging fails instead of shipping it

### Requirement: Publication gate and exact-commit CI
Push, tag and release verification SHALL require only affected unit tests across the complete change set and applicable exact-commit Tests/hassfest/HACS validation. Integration/browser/mobile/upgrade checks SHALL be reused from development without fresh report requirements and SHALL run at release only on explicit request. Publication SHALL NOT implicitly require the full suite, full mobile matrix or unrelated preserved-install checks.

#### Scenario: Verification runs after native reconnect checks are retired
- **WHEN** affected, full, upgrade or publication verification is selected
- **THEN** it does not inject the retired native HA reconnect outage or probe upstream fix delivery
- **AND** disconnected-action unit tests and ordinary failure reporting remain available

#### Scenario: A release contains several completed implementation batches
- **WHEN** publication scope is computed
- **THEN** all changes since the previous released baseline and their shared consumers are included
- **AND** a clean working tree cannot produce an empty scope merely because no files are currently uncommitted

#### Scenario: Candidate or selected inputs change after verification
- **WHEN** publication evidence is checked
- **THEN** stale proof is rejected and the affected scope is recomputed
- **AND** only invalidated relevant checks rerun before evidence is bound to the final commit

#### Scenario: Additional publication gate and exact-commit CI contracts
- **WHEN** a push, tag or release is prepared
- **THEN** Failed selected checks and known relevant violations SHALL block publication.
- **AND** Valid scoped evidence SHALL be reusable for unchanged inputs; accepted exceptions SHALL remain explicit.

### Requirement: Honest evidence and limits
Reports SHALL identify selected and excluded features, components, checks, profiles, baselines, execution mode, results and durations. Focused evidence SHALL NOT be labeled full-suite success. Reports SHALL distinguish automated Chromium profiles from actual phones/Safari. VoiceOver, TalkBack, OS high contrast, desktop acceptance and real-device actuation remain outside acceptance; physical haptic strength SHALL NOT be claimed from browser automation.

#### Scenario: Only automated phone profiles were run
- **WHEN** completion is reported
- **THEN** the report identifies emulation and does not claim physical iPhone/Android testing

#### Scenario: A focused release passes
- **WHEN** verification is reported
- **THEN** omitted full-suite, matrix and historical-baseline checks are explicitly identified as not run rather than passed

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
The complete registered suite SHALL remain available through an explicit full-suite command, including unit/static checks, browser interactions, mobile profiles and historical preservation/recovery scenarios, permanently excluding synthetic camera playback/transport, HLS, handoff and cancellation checks reserved for manual testing. Routine commands, release requests, hooks and automatic CI SHALL NOT invoke comprehensive verification implicitly.

#### Scenario: Only a routine test or release is requested
- **WHEN** the default command, version hook or automatic CI executes
- **THEN** affected checks execute and the comprehensive command is not invoked

#### Scenario: The user explicitly requests everything in parallel
- **WHEN** comprehensive verification is launched with parallel mode
- **THEN** all registered checks are included and safe independent jobs overlap
- **AND** conflicts and required preparation remain serialized

#### Scenario: Additional explicit comprehensive verification contracts
- **WHEN** routine or comprehensive verification is requested
- **THEN** Full-suite prerequisites SHALL be checked before expensive work; unavailable required checks SHALL fail rather than be skipped or reported successful.

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
Development checks for concrete persisted-data, migration, generated-ownership or installation risks SHALL cover affected expected data and recovery. Live preserved-install checks SHALL be scoped to a concrete upgrade risk or an explicit user request. Release preparation SHALL reuse development results without requiring a fresh integration report.

#### Scenario: A change affects every supported format conversion
- **WHEN** development checks or explicitly requested upgrade verification are selected
- **THEN** preservation and recovery checks cover the affected supported inputs
- **AND** browser checks remain limited to the changed features unless comprehensive verification was explicitly requested

#### Scenario: A release changes only a card's visual presentation
- **WHEN** no persistence, ownership or installation path changed
- **THEN** affected unit tests and applicable metadata checks satisfy the publication gate, with final-candidate installation but no mandatory historical upgrade replay

#### Scenario: A selected historical replay fails or cleanup is incomplete
- **WHEN** release evidence is evaluated
- **THEN** publication fails and private backup/recovery evidence is retained

#### Scenario: Additional change-scoped preserved-install verification contracts
- **WHEN** a concrete upgrade risk or explicit upgrade request is assessed
- **THEN** Explicitly requested upgrade verification SHALL preserve the existing installation, exact backups and test configuration; fresh fixture preparation SHALL NOT replace preservation evidence.
- **AND** Comprehensive coverage SHALL remain explicit.

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
Affected verification SHALL support explicit reuse of completed checks from private evidence after validating freshness, coverage, dependency identities, execution conditions and cleanup. The current required scope SHALL be computed independently. Failed, missing, stale, unsupported or invalidated checks SHALL execute again.

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
- **AND** applicable exact-commit CI remains required; new preserved-install proof is not an ordinary release prerequisite

#### Scenario: Additional reusable completed checks contracts
- **WHEN** completed private evidence is supplied for reuse
- **THEN** Publication SHALL run its unit gate across the complete candidate and reuse development integration results without requiring new reports; validating an explicitly supplied report SHALL preserve its source evidence.

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
- **WHEN** backend compatibility, ownership or an active deployment cannot be verified
- **THEN** preview stops before synchronization and explains the required preparation
- **AND** it never resets source, fixtures or helpers as a fallback

#### Scenario: Inspection fails after a successful sync
- **WHEN** a visual or browser check reports a defect in successfully synchronized current assets
- **THEN** the defect remains visible and the latest assets remain installed for correction
- **AND** routine cleanup does not restore an older package, while safe helper restoration and genuinely failed-operation recovery remain required

#### Scenario: A selected component is absent
- **WHEN** the requested preview has no matching rendered component
- **THEN** it reports missing scope rather than claiming a successful inspection

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

### Requirement: Unit-only release default
Release preparation, version hooks and automatic Tests CI SHALL run only affected
Node/Python unit tests across the candidate. They SHALL reuse integration testing
from development without requiring fresh browser, camera, geometry, mobile or
preserved-install evidence. Additional integration or full testing SHALL require
an explicit user request. Known failures SHALL remain reported as failures.
Applicable exact-commit hassfest/HACS metadata checks SHALL remain available.

#### Scenario: A tested camera or migration change is released
- **WHEN** the user requests an ordinary release
- **THEN** affected unit tests run without additional integration tests or browser launch
- **AND** no new integration report or historical-upgrade campaign is required; the final candidate and version metadata are installed once on disposable 192.168.0.28 before publication, reusing an exact matching installation

#### Scenario: The user explicitly requests further changed-feature testing
- **WHEN** additional integration testing is explicitly requested
- **THEN** the existing affected-component commands remain available
- **AND** the full registered suite runs only on an explicit comprehensive request
