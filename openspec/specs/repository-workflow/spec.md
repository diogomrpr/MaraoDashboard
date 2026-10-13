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
- **THEN** the relevant main specs are read and proposed requirement changes are
  recorded as deltas with concrete unchecked implementation and verification tasks
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
Ordinary iteration and publication SHALL batch related tasks and use the smallest checks covering implemented features, changed components and their shared consumers. Dependent migrations and security controls SHALL be checked early. UI batches SHALL deploy together for representative final visual and interactive inspection, including relevant difficult text/zoom layouts. Distinct interactions SHALL run once per relevant theme, with device repeats only for gesture or geometry differences. Full-suite execution and parallel test jobs SHALL require explicit user requests.

#### Scenario: Related queued tasks affect the same shared component
- **WHEN** their implementation is being completed together
- **THEN** the batch receives one covering focused check and combined final visual inspection
- **AND** the release uses the union of implemented features and affected shared consumers rather than automatically checking unrelated capabilities
- **AND** focused repairs precede final scoped verification and applicable exact-commit CI

#### Scenario: Final inspection finds another defect
- **WHEN** an affected card fails visual or interaction inspection
- **THEN** its root cause is repaired, the focused check reruns, and final inspection repeats

#### Scenario: Only development specifications change
- **WHEN** no application or card behavior can be affected
- **THEN** tooling/specification checks cover the change without an unnecessary Home Assistant deployment, full gallery audit or full application suite

#### Scenario: The user requests a release without comprehensive tests
- **WHEN** the implemented changes are ready for publication
- **THEN** only their relevant checks and component consumers are required
- **AND** release preparation does not implicitly authorize the full suite or parallel test execution

### Requirement: Observed defects remain visible
Warnings, error cards, console exceptions, failed resources, repeated requests
and duplicate service calls SHALL be treated as defects and repaired at their
root. Assertions SHALL NOT be suppressed to make verification appear successful.

#### Scenario: A native upstream defect is isolated
- **WHEN** a native HA page reproduces an exception without Marao
- **THEN** the reproduction, upstream evidence and unresolved status are recorded
- **AND** the defect is neither relabeled as a passing check nor silently allowed in future releases

### Requirement: Persistent default verification command
The repository SHALL save one affected-check command and document it in the agent contract and development guidance. Routine test commands, version hooks, publication gates and automatic CI SHALL follow the affected-only policy. Full-suite and parallel options SHALL be explicit; no automatic fallback or hidden hook SHALL invoke them.

#### Scenario: A later agent starts an implementation
- **WHEN** the agent reads the repository instructions
- **THEN** it finds the saved focused command and applies the same policy without relying on chat history

#### Scenario: A command has no known scope
- **WHEN** changed files cannot be mapped to a reliable affected-check set
- **THEN** the command identifies the unresolved scope and requests an explicit component mapping
- **AND** it neither launches the full suite nor reports an untested implementation as verified
