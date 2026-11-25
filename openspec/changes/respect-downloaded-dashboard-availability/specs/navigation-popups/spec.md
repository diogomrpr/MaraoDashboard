## ADDED Requirements

### Requirement: Ownership of native linked-section controls
Linked-section controls SHALL resolve their scope from the containing native view and section, including a section host identified by its rendered configuration.

#### Scenario: The native section omits numeric indices
- **WHEN** the containing view owns the linked source and its section configuration identifies one section
- **THEN** its controls apply to that section, and a foreign or ambiguous match remains a visible configuration error
