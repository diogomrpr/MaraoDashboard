## MODIFIED Requirements

### Requirement: Room suggestions and global entity search
The editor SHALL follow Home Assistant's live registry collections and refresh metadata when entity, area or device metadata changes, state membership changes, or the connection recovers. Related updates SHALL be coalesced rather than polling or requesting metadata for ordinary state-value changes. Native forms SHALL receive the current Home Assistant context.

#### Scenario: An entity is created while the editor is open
- **WHEN** Home Assistant exposes a newly created entity
- **THEN** it becomes searchable without reloading the editor, including in an already open entity search
- **AND** existing search text, local draft, group membership and scroll are preserved
- **AND** the entity is not added to any page automatically

#### Scenario: Metadata changes during an older request
- **WHEN** a registry update arrives while an older snapshot is loading
- **THEN** a fresh snapshot is requested after that work completes
- **AND** obsolete panel lifecycles cannot apply responses or start requests
