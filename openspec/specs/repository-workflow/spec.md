# Repository workflow

## Purpose

Preserve Marao's product boundaries, privacy and shared contracts while making
small, reviewable changes from an accurate specification baseline.

## Requirements

### Requirement: Contract precedence and specification lifecycle
Contributors SHALL follow applicable higher-priority instructions, root and nested
`AGENTS.md`, the dashboard quality guide, then other project documentation.
OpenSpec SHALL record existing behavior in main specs and future work in changes;
it SHALL NOT override the repository contract or imply verification from file existence.

#### Scenario: A future task is introduced
- **WHEN** a user describes a new task
- **THEN** the relevant main specs are read and the task follows the proportionate workflow
- **AND** proposed requirement changes are recorded as deltas with concrete unchecked implementation and verification tasks
- **AND** delivered, verified requirements are synchronized into main specs before archiving the completed change

#### Scenario: A planning file exists but work is unverified
- **WHEN** OpenSpec reports an artifact as done while its task checklist is incomplete
- **THEN** the change remains unfinished and SHALL NOT be archived as completed

### Requirement: Product ownership and package separation
Marao SHALL remain a complete self-contained dashboard. Shipped integration code
SHALL live in `custom_components/marao_dashboard/`, editable editor source in
`frontend_src/`, checks in `tests/`, and disposable fixtures in `ha-test/`.
Third-party Lovelace cards SHALL NOT be installed, bundled, modified or required.
Marao's identity and the README's single approved attribution SHALL be preserved.

#### Scenario: A card needs a shared control
- **WHEN** implementing or repairing a reusable input, state, popup or layout behavior
- **THEN** the existing Marao component or native HA/browser capability is reused
- **AND** no test-only asset or third-party card dependency enters the installed integration

### Requirement: Safe target and private evidence
Agents SHALL access and operate only disposable Home Assistant `192.168.0.28`.
Actions SHALL target safe helpers/templates/in-memory fixtures. Tokens, keys,
alarm codes, camera data, private entity data and secret-bearing evidence SHALL
remain outside committed source, specs, reports and shared screenshots.

#### Scenario: A development action affects an access point
- **WHEN** testing lock, gate, garage, alarm, privacy or another safety action
- **THEN** the action uses a safe disposable fixture and never a real device

#### Scenario: A diagnostic needs authentication
- **WHEN** browser, API or SSH access is prepared
- **THEN** credentials are read from ignored local configuration or the existing
  authenticated session and never placed in URLs, specification files or published output

### Requirement: Inspect scope before editing
Before editing, contributors SHALL trace the affected end-to-end path and record
the affected-card set, including every consumer of changed shared code, tokens or
layouts. A change that cannot affect cards SHALL explicitly record an empty set.
Unrelated uncommitted work SHALL be preserved.

#### Scenario: A shared slider is changed
- **WHEN** the shared value slider implementation or palette changes
- **THEN** light, fan and cover consumers and their realistic/popup/Cases variants
  are included before choosing checks or making edits

### Requirement: Coherent root fixes and aligned layers
Changes SHALL use the smallest coherent shared-root solution. Relevant builder,
validation, generator, templates, runtime, theme, translations, docs, tests and
fixtures SHALL remain aligned. Speculative frameworks and duplicate per-card
workarounds SHALL NOT be introduced.

#### Scenario: An editor option changes behavior
- **WHEN** a supported option is added or repaired
- **THEN** the editor value reaches validated generated configuration and shared
  runtime behavior, with corresponding documented and safe gallery examples

### Requirement: Focused checks and final visual inspection
Iteration and publication SHALL batch related tasks and use proportionate verification for changed contracts and shared consumers. Presentation-only development SHALL finish with current targeted visual inspection; behavior changes SHALL add the smallest covering behavioral check. Publication SHALL retain release-wide affected checks. Dependent migrations and security controls SHALL be checked early. UI batches SHALL finish with representative visual and interactive inspection. Compatible checks SHALL share visits and validated evidence SHALL be reusable without omitting required coverage. Full-suite execution and parallel test jobs SHALL require explicit user requests.

#### Scenario: Related queued tasks affect the same shared component
- **WHEN** their implementation is being completed together
- **THEN** the batch receives its selected development tier and combined final visual inspection
- **AND** the release uses the union of implemented features and affected shared consumers rather than automatically checking unrelated capabilities
- **AND** focused repairs precede final scoped verification and applicable exact-commit CI
- **AND** compatible UI changes deploy together before final inspection of representative components and relevant difficult text/zoom layouts

#### Scenario: Final inspection finds another defect
- **WHEN** an affected card fails visual or interaction inspection
- **THEN** its root cause is repaired, only checks affected by the correction rerun, and targeted inspection repeats

#### Scenario: Only development specifications change
- **WHEN** no application or card behavior can be affected
- **THEN** tooling/specification checks cover the change without an unnecessary Home Assistant deployment, full gallery audit or full application suite

#### Scenario: The user requests a release without comprehensive tests
- **WHEN** the implemented changes are ready for publication
- **THEN** only their relevant checks and component consumers are required
- **AND** release preparation does not implicitly authorize the full suite or parallel test execution

#### Scenario: A shared layout is independent of theme colors
- **WHEN** an implementation batch selects difficult geometry profiles
- **THEN** the same geometry is not replayed in both themes without a dependency reason
- **AND** representative theme appearance and all materially distinct selected mobile/text conditions remain covered
- **AND** theme-independent interactions and geometry run in one reference theme, appearance checks cover both themes, and theme-dependent interactions run once per relevant theme
- **AND** device and engine repeats target native gesture or geometry differences

#### Scenario: A repaired batch has valid completed coverage
- **WHEN** the contributor explicitly supplies prior private evidence for reuse
- **THEN** required checks are recomputed and only failed, missing or invalidated cases execute again
- **AND** reuse never replaces required cleanup, final affected-card inspection or applicable publication validation

#### Scenario: Presentation-only development is complete
- **WHEN** the latest applicable project assets are installed on the disposable instance, show the requested result and relevant diagnostics are clear
- **THEN** targeted visual inspection is sufficient without an automated matrix or a second duplicate inspection
- **AND** only layout variants relevant to the edit are inspected
- **AND** the agent stops without broadening checks for reassurance

#### Scenario: Behavior or a sensitive contract changes
- **WHEN** an edit changes events, state, gestures, security, saved data or installation
- **THEN** the smallest relevant behavioral assertions accompany direct inspection
- **AND** security dispatch/cancellation and data preservation/recovery are not replaced by visibility

### Requirement: Observed defects remain visible
Warnings, error cards, console exceptions, failed resources, repeated requests
and duplicate service calls SHALL be treated as defects and repaired at their
root. Assertions SHALL NOT be suppressed to make verification appear successful.

#### Scenario: A native upstream defect is isolated
- **WHEN** a native HA page reproduces an exception without Marao
- **THEN** the reproduction, upstream evidence and unresolved status are recorded
- **AND** the defect is neither relabeled as a passing check nor silently allowed in future releases

### Requirement: Persistent default verification command
The repository SHALL save one affected-check command and document it in the agent contract and development guidance. The command SHALL expose visual, behavior and focused development tiers with explicit task scope. Existing invocations, version hooks, publication gates and automatic CI SHALL retain focused affected coverage. Development-only scope or reports SHALL NOT satisfy publication gates. Full-suite and parallel options SHALL be explicit; no automatic fallback or hidden hook SHALL invoke them.

#### Scenario: A later agent starts an implementation
- **WHEN** the agent reads the repository instructions
- **THEN** it finds the saved focused command and applies the same policy without relying on chat history

#### Scenario: A command has no known scope
- **WHEN** changed files cannot be mapped to a reliable affected-check set
- **THEN** the command identifies the unresolved scope and requests an explicit component mapping
- **AND** it neither launches the full suite nor reports an untested implementation as verified

### Requirement: Proportionate development workflow
Small fixes restoring documented behavior, refactors and documentation corrections SHALL use a short path without a new full OpenSpec change when requirements stay unchanged. New behavior, public or persisted contracts, migrations and substantial cross-layer work SHALL use the full OpenSpec workflow. Both paths SHALL retain scope discovery, safety, compatibility assessment and affected verification. Existing relevant changes SHALL be reused rather than duplicated.

#### Scenario: A small fix restores an existing contract
- **WHEN** a fix, refactor or documentation correction preserves documented behavior and introduces no new public or persisted contract, migration or substantial cross-layer work
- **THEN** the contributor records the objective, acceptance cases, starting commit and affected-card set, implements the focused fix and completes its selected verification tier
- **AND** no new proposal, design or delta spec is required solely to repeat the existing contract

#### Scenario: A task changes a contract
- **WHEN** the requested result adds behavior, changes a public or persisted contract, requires migration or needs substantial cross-layer work
- **THEN** the contributor creates or updates the relevant OpenSpec change before implementation
- **AND** the change records acceptance scenarios, compatibility implications and scoped verification tasks

#### Scenario: Investigation expands a small fix
- **WHEN** tracing the affected path reveals a contract change or migration
- **THEN** the contributor switches to the full workflow and records the discovered scope before implementing it
- **AND** initial short-path classification does not waive any newly applicable checks

### Requirement: Targeted project context
Contributors SHALL read the repository contract and use the project index to load the affected capability, source map and relevant quality guidance. Durable obligations SHALL remain in canonical documentation; skill and OpenSpec context SHALL route to that material instead of repeating whole guides. Relevant shared consumers SHALL remain in scope, and unresolved dependencies SHALL trigger investigation.

#### Scenario: A task affects one frontend control
- **WHEN** the contributor establishes its implementation path
- **THEN** the affected frontend and shared-control references are read with the applicable state, action, layout and verification contracts
- **AND** unrelated release history and backend guides are not loaded by default

#### Scenario: A shared dependency is discovered
- **WHEN** targeted reading identifies additional affected consumers or contracts
- **THEN** the contributor expands the reading and check selection to cover them before editing
- **AND** reducing repeated context never permits ignoring a binding requirement

### Requirement: Project-local development skills
The repository SHALL provide three focused project-local skills for Home Assistant integration, Marao frontend development and scoped testing. They SHALL follow repository precedence, use the existing stack and load supporting references only when relevant. Official OpenSpec skills SHALL remain tool-owned and refreshable; project-specific guidance SHALL remain separate from them and from global skill/profile settings.

#### Scenario: A task selects development guidance
- **WHEN** work affects integration, frontend or verification behavior
- **THEN** only the relevant project-local skills and references are loaded
- **AND** integration guidance covers Python and native Home Assistant interfaces, frontend guidance covers Marao's existing browser components, and testing guidance routes through the existing affected-check runner

#### Scenario: Official OpenSpec skills are refreshed
- **WHEN** the installed CLI regenerates its six core skills
- **THEN** custom project skills remain intact and discoverable
- **AND** the update does not require a global custom profile or hand-edited generated skills

### Requirement: Verified task outcomes
Before reporting completion, contributors SHALL compare the requested objective and acceptance cases with the implementation and relevant evidence. Passing tests or checked OpenSpec tasks alone SHALL NOT establish that the objective was met. Completion reports SHALL identify delivered behavior, selected verification and remaining gaps without claiming omitted coverage or unmeasured speed gains.

#### Scenario: Checks pass but requested behavior is missing
- **WHEN** the final outcome review finds an unmet acceptance case
- **THEN** the task remains incomplete and the missing behavior is repaired or reported as blocked with its concrete reason
- **AND** successful unrelated checks do not substitute for that outcome

#### Scenario: A focused batch already has valid evidence
- **WHEN** the outcome review confirms the acceptance cases and unchanged selected proof
- **THEN** the contributor reuses the existing verified evidence under its normal validity rules
- **AND** the review does not automatically repeat tests or expand into comprehensive testing

### Requirement: Keep the disposable installation current
Before completing a project batch, contributors SHALL ensure disposable HA has the latest applicable project changes. Successful assets SHALL remain installed after inspection, preview failure or closure. Cleanup SHALL NOT revert the package unless the project was reverted. Safe helper restoration and failed-operation recovery SHALL remain required. Watch SHALL update only while running.

#### Scenario: Frontend inspection finishes
- **WHEN** the current frontend batch has synchronized successfully
- **THEN** inspection uses that installed version and leaves it installed afterward
- **AND** closing the preview stops watching without restoring an older package

#### Scenario: Project changes require full preparation
- **WHEN** fresh setup or backend/fixture changes make frontend-only synchronization incompatible
- **THEN** explicit full preparation brings the disposable instance to the current project before completion
- **AND** frontend preview does not silently substitute a fixture reset for its own synchronization

#### Scenario: The project is reverted
- **WHEN** an intentional project revert changes the required installed version
- **THEN** the disposable installation is synchronized to that project state
- **AND** a routine test cleanup alone is not treated as a project revert

### Requirement: Current-task verification scope
Development SHALL support a private starting snapshot of tracked and nonignored untracked file identities, including existing dirty content. Subsequent scope SHALL include additions, modifications and deletions since that snapshot. Explicit reviewed subsets SHALL disclose excluded changes. Release comparison SHALL remain independent and cover the whole candidate.

#### Scenario: A task starts in an already dirty checkout
- **WHEN** a task changes one file that already had uncommitted changes
- **THEN** that file is included and unchanged pre-existing dirty files are excluded
- **AND** shared-file component scope is reviewed from the actual task diff

#### Scenario: Concurrent work changes additional files
- **WHEN** a contributor declares a reviewed subset of the task delta
- **THEN** omitted changed files are reported as unverified by this task
- **AND** neither that subset nor the task snapshot can narrow publication checks
