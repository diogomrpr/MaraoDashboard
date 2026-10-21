# Spec Delta

## MODIFIED Requirements

### Requirement: Focused checks and final visual inspection
Iteration and publication SHALL batch related tasks and use the smallest checks covering implemented features, changed components and shared consumers. Dependent migrations and security controls SHALL be checked early. UI batches SHALL finish with representative visual and interactive inspection. Compatible checks SHALL share visits and validated evidence SHALL be reusable without omitting required coverage. Full-suite execution and parallel test jobs SHALL require explicit user requests.

#### Scenario: Related queued tasks affect the same shared component
- **WHEN** their implementation is being completed together
- **THEN** the batch receives one covering focused check and combined final visual inspection
- **AND** the release uses the union of implemented features and affected shared consumers rather than automatically checking unrelated capabilities
- **AND** focused repairs precede final scoped verification and applicable exact-commit CI
- **AND** compatible UI changes deploy together before final inspection of representative components and relevant difficult text/zoom layouts

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

## ADDED Requirements

### Requirement: Persistent default verification command
The repository SHALL save one affected-check command and document it in the agent contract and development guidance. Routine test commands, version hooks, publication gates and automatic CI SHALL follow the affected-only policy. Full-suite and parallel options SHALL be explicit; no automatic fallback or hidden hook SHALL invoke them.

#### Scenario: A later agent starts an implementation
- **WHEN** the agent reads the repository instructions
- **THEN** it finds the saved focused command and applies the same policy without relying on chat history

#### Scenario: A command has no known scope
- **WHEN** changed files cannot be mapped to a reliable affected-check set
- **THEN** the command identifies the unresolved scope and requests an explicit component mapping
- **AND** it neither launches the full suite nor reports an untested implementation as verified
