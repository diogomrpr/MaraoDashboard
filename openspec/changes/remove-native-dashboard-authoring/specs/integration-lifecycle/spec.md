## ADDED Requirements

### Requirement: Retired native compilation surface
Marao SHALL NOT register the `marao_dashboard/native/card` or `marao_dashboard/native/starter` WebSocket commands, ship their dedicated compiler/catalog and frontend bundles, or request those bundles from the supported editor and generated dashboard paths. Supported generator administration APIs SHALL remain available.

#### Scenario: Request to a retired command
- **WHEN** a client requests either discontinued native compilation command
- **THEN** Home Assistant reports the normal unsupported-command response
- **AND** no dashboard configuration or registration is changed

#### Scenario: Current resources load
- **WHEN** a fresh frontend session loads Marao's editor or a generated dashboard
- **THEN** no discontinued native card, navbar, editor or catalog module is requested
- **AND** generator administration, startup and frontend recovery remain functional

### Requirement: Discontinued dashboard ownership isolation
Setup, generation and history restoration SHALL retain enough recognition of discontinued native ownership to exclude independently owned dashboards from adoption or replacement. Recognition SHALL include native ownership markers, the Marao starter strategy and native card aliases. Removal SHALL NOT delete their registrations or stored configuration.

#### Scenario: Independently owned route collision
- **WHEN** a generator operation targets a route occupied by an independently owned dashboard, including a discontinued native dashboard
- **THEN** ownership preflight rejects replacement
- **AND** the dashboard's saved data and registration remain unchanged

#### Scenario: Historical source discovery encounters discontinued authoring
- **WHEN** legacy source discovery encounters a native ownership marker, starter strategy or native card aliases
- **THEN** it does not adopt that dashboard as a historical generator source
- **AND** it leaves the original data untouched

### Requirement: Generator compatibility survives standalone removal
The removal SHALL preserve supported historical generator conversion, existing generated contracts, protected custom content, unknown fields, selections and explicit emptiness. Historical storage-backed generator support and recovery SHALL remain available even where their existing implementation names contain `native`.

#### Scenario: Upgrade a supported historical generator installation
- **WHEN** a supported storage-backed or legacy generator configuration is upgraded
- **THEN** the existing ordered conversion and validation preserve its supported content and ownership
- **AND** archived history and independently owned dashboards remain unchanged

#### Scenario: Generator operation fails after staging
- **WHEN** a generator migration or save fails after staging owned data
- **THEN** existing backup and recovery behavior protects the exact source and owned output
- **AND** unrelated dashboard data is neither replaced nor rolled back
