## ADDED Requirements

### Requirement: Automated approved preview application

Approved card-preview application SHALL use `card:apply` to promote the reviewed source patch, run selected minimal checks serially and install applicable runtime changes through the existing disposable frontend helper. Release SHALL remain separate. Agents SHALL use this command whenever the user asks to apply approved documentation previews, reusing unchanged explicit authorization.

#### Scenario: Preview is ready for application
- **WHEN** the agent has finished the component and related authoring changes and records the authorized revision, patch, tests and consumer scope
- **THEN** one apply command preflights and promotes that source selection, rebuilds, runs the selected checks and verifies applicable installation on `192.168.0.28`
- **AND** unrelated source edits, staging, dashboard configuration and helper state remain preserved

#### Scenario: Read-only plan or stale approval
- **WHEN** the agent requests a plan
- **THEN** the command reports selected files, patch digest, exclusions and conflicts without source writes or HA calls
- **AND** changed preview content, revision or consumer scope invalidates the recorded review; destination drift prevents application

#### Scenario: Application fails or is retried
- **WHEN** a build, selected check or installation fails
- **THEN** the command does not report readiness, retains exact source backups and an incomplete receipt, and releases its application lock
- **AND** a retry recognizes already-applied source without overwriting concurrent edits

#### Scenario: Unsafe input or another application
- **WHEN** a task selects traversal/symlink/private paths, arbitrary check commands, another source checkout or a target other than `192.168.0.28`, or another application holds the lock
- **THEN** the unsafe operation is refused and no competing installation is started

#### Scenario: Documentation-only application
- **WHEN** the approved source selection has no runtime effect
- **THEN** the command applies and checks that selection without building or installing HA assets
