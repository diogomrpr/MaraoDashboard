## ADDED Requirements

### Requirement: Shared native configuration metadata
Native forms and the builder SHALL use the same catalog-backed option definitions. Adding native editing SHALL preserve current builder drafts, saved configuration and generated contracts.

#### Scenario: A shared option is edited in either mode
- **WHEN** an administrator sets supported energy formatting
- **THEN** both modes retain the same option semantics without synchronizing their dashboards
