## ADDED Requirements
### Requirement: Marao-owned identifier namespace
New owned card templates, options and generated output SHALL use `md_`. Released `hc_` aliases SHALL remain accepted. Namespace migration v1 SHALL upgrade active saved owned names during setup through existing backup/atomic-generation paths. It SHALL preserve opaque data, canonical sources, read-only previews and archived history. Conflicting owned options SHALL fail preflight.
#### Scenario: A released card is loaded
- **WHEN** a supported legacy card and its owned options use `hc_`
- **THEN** generation and rendering behave like the corresponding `md_` card without mutating the source
#### Scenario: A new card is authored
- **WHEN** a card is created or its settings edited
- **THEN** canonical `md_` identifiers are used and the correct entity/actions remain bound
#### Scenario: Historical or opaque content is encountered
- **WHEN** an archived snapshot, entity ID, custom card, unknown option or service payload contains similar text
- **THEN** namespace resolution does not rewrite that content

#### Scenario: An existing format-2 dashboard is upgraded
- **WHEN** active cards, nested group members or owned options use released hc names
- **THEN** setup persists their md equivalents without requiring a manual save
- **AND** exact source/output backups exist before replacement, with existing rollback and recovery
- **AND** a second setup makes no further source or output changes
