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
plan without writes or HA contact. Real preparation SHALL build/deploy the current
workspace, install only safe fixtures, generate one dashboard, wait for readiness
and validate files/resources/routes/entities before recording success.

#### Scenario: A frontend-only change is prepared
- **WHEN** current assets are deployed to the allowed disposable instance
- **THEN** integration reload/browser refresh applies the fingerprinted assets without an unnecessary backend restart

#### Scenario: Integration or fixture Python changes
- **WHEN** preparation detects restart-bound code
- **THEN** it restarts the disposable HA and waits for readiness before tests continue

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
Development and release verification SHALL use the smallest covering unit/static/browser checks for implemented features, touched components and shared consumers. Icon-only controls or shared action geometry changes SHALL select relevant alignment checks; changed sliders SHALL select relevant slider checks. Test-only and documentation-only changes SHALL not trigger unrelated application suites or device actions. Visibility checks SHALL NOT replace required action, security, migration or recovery assertions.

#### Scenario: A shared icon-only media layout is edited
- **WHEN** its focused verification runs
- **THEN** alignment is checked within the runner's 0.5 CSS-pixel tolerance and representative affected components and difficult layouts are visually inspected afterward

#### Scenario: A card label changes without persistence or gesture changes
- **WHEN** the selected verification runs
- **THEN** its relevant rendering/localization and difficult text-layout checks execute
- **AND** unrelated camera, slider, reconnect, editor-save and historical live-upgrade checks do not execute

### Requirement: Mobile release matrix
Default release verification SHALL select mobile profiles appropriate to the affected UI contracts and SHALL NOT automatically run all 26 profile/theme combinations. Layout changes SHALL cover representative affected cards at 320px and relevant text/zoom, theme, portrait and landscape conditions. The existing complete mobile matrix SHALL remain available through explicitly requested comprehensive verification. Selected runs SHALL preserve isolated touch/device settings, typography and native HA compatibility.

#### Scenario: A release mobile run inspects every view and popup
- **WHEN** explicitly requested comprehensive checks encounter scrolling cards or opening sheets
- **THEN** the selected typography, theme, touch and safe-area profile remains applied

#### Scenario: A scoped release changes a popup layout
- **WHEN** default release checks execute
- **THEN** only affected popup families and representative difficult mobile profiles are inspected
- **AND** unchanged views and all 26 combinations are not automatically traversed

### Requirement: Interaction and resource verification
Selected browser checks SHALL verify the changed contract: relevant cold loads, scrolling, safe-area/navbar clearance, popup focus/scroll/close, availability/errors, external state changes, single dispatch and gesture cancellation. Connection changes SHALL retain native warning and exception assertions. Distinct interactions SHALL run once per relevant theme; device repeats SHALL target gesture or geometry differences. Failures SHALL retain screenshots and raw diagnostics; success captures SHALL be representative unless exhaustive captures were explicitly requested.

#### Scenario: A browser interaction check completes without an exception
- **WHEN** the corresponding popup is visually empty or clipped
- **THEN** the UI still fails acceptance and requires a root fix

#### Scenario: An implementation changes single-dispatch behavior
- **WHEN** focused browser verification executes
- **THEN** dispatch count and relevant cancellation paths are asserted using safe fixtures
- **AND** a visible button alone cannot satisfy the check

### Requirement: Strict HACS boundary and reproducible assets
The editor SHALL be built from `frontend_src/` into committed runtime assets and
`check:editor` SHALL detect drift. HACS staging SHALL contain only the integration;
source and staged boundaries SHALL reject fixtures, synthetic media, local caches,
test dependencies and secrets. Test providers SHALL never overwrite real providers.

#### Scenario: A fixture or credential file enters the integration tree
- **WHEN** package boundary validation runs
- **THEN** packaging fails instead of shipping it

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
