## ADDED Requirements
### Requirement: Marao-owned identifier namespace
New owned card templates, option keys, generated output and current examples SHALL use `md_`. Released `hc_` names SHALL remain accepted compatibility inputs. Normalization SHALL preserve entity IDs, actions, unknown fields, raw third-party configurations and historical snapshots. Unchanged editor round trips SHALL retain authored source; conflicting legacy/canonical owned options SHALL report an error.
#### Scenario: A released card is loaded
- **WHEN** a supported legacy card and its owned options use `hc_`
- **THEN** generation and rendering behave like the corresponding `md_` card without mutating the source
#### Scenario: A new card is authored
- **WHEN** a card is created or its settings edited
- **THEN** canonical `md_` identifiers are used and the correct entity/actions remain bound
#### Scenario: Historical or opaque content is encountered
- **WHEN** an archived snapshot, entity ID, custom card, unknown option or service payload contains similar text
- **THEN** namespace resolution does not rewrite that content
