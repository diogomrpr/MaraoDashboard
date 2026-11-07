## ADDED Requirements

### Requirement: Official galleries and isolated card proposals
Documentation SHALL render every documented scenario in order using real Marao elements and fictional HA data. Public assets SHALL come from the documented stable release. Local proposals SHALL use independent task workspaces and retain a separate implemented playground baseline.

#### Scenario: Scroll through card examples
- **WHEN** a card gallery is visible
- **THEN** every visible example and the next three offscreen examples are loaded where available
- **AND** preceding examples fill the buffer near the end, measured row space survives unloading, and popup height remains temporary

#### Scenario: Main changes during a proposal
- **WHEN** an existing preview task is reused after main changes
- **THEN** the proposal is preserved and source drift is reported
- **AND** only a reviewed conflict-aware patch may later reach main

### Requirement: Shared behavior scope before application
Card design requests SHALL default to isolated previews. Before applying altered shared behavior or separating a family from it, agents SHALL obtain an explicit consumer-scope decision. Family scope SHALL include owned details unless explicitly narrowed. Existing explicit approval for the same behavior and consumers SHALL be reused.

#### Scenario: A stepper proposal is visually approved
- **WHEN** a shared numeric stepper proposal receives visual approval
- **THEN** agents identify Climate, its details, Number and Wallbox and resolve all consumers versus family or subset before applying
- **AND** scoped implementation uses selectors or small shared extension points, without duplicating controls

#### Scenario: The final patch expands impact
- **WHEN** reconciliation introduces another consumer or changes agreed semantic scope
- **THEN** the scope decision is renewed before application
