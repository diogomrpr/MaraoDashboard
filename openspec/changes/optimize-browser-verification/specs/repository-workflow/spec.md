# Spec Delta

## MODIFIED Requirements

### Requirement: Focused checks and final visual inspection
Ordinary iteration and publication SHALL batch related tasks and use the smallest checks covering implemented features, changed components and their shared consumers. Dependent migrations and security controls SHALL be checked early. UI batches SHALL deploy together for representative final visual and interactive inspection, including relevant difficult text/zoom layouts. Theme-independent interactions and geometry SHALL run in a reference theme; representative appearance checks SHALL cover both themes, and theme-dependent interactions SHALL run once per relevant theme. Device and engine repeats SHALL target native gesture or geometry differences. Compatible checks SHALL share visits, and validated completed results SHALL be reusable without omitting current required coverage. Full-suite execution and parallel test jobs SHALL require explicit user requests.

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

#### Scenario: A shared layout is independent of theme colors
- **WHEN** an implementation batch selects difficult geometry profiles
- **THEN** the same geometry is not replayed in both themes without a dependency reason
- **AND** representative theme appearance and all materially distinct selected mobile/text conditions remain covered

#### Scenario: A repaired batch has valid completed coverage
- **WHEN** the contributor explicitly supplies prior private evidence for reuse
- **THEN** required checks are recomputed and only failed, missing or invalidated cases execute again
- **AND** reuse never replaces required cleanup, final affected-card inspection or applicable publication validation
