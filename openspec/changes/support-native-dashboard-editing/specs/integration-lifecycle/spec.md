## ADDED Requirements

### Requirement: Native ownership isolation
Native-owned dashboards SHALL be excluded from legacy adoption, setup repair, builder generation and history restoration. Read-only native compilation SHALL never write saved JSON, generated files, storage or history.

#### Scenario: Native output is compiled during rendering
- **WHEN** an authenticated client requests a supported native card or starter
- **THEN** complete validated configuration is returned without reading builder content or changing owned state

#### Scenario: Native data survives builder operations
- **WHEN** setup, generation or history restore runs alongside a native-owned dashboard
- **THEN** its exact persisted configuration remains unchanged
