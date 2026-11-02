# Spec Delta

## ADDED Requirements

### Requirement: Linked group view membership
An Entity Group with a linked native layout SHALL derive compatible members from explicitly saved source-view card bindings, deduplicated independently of native visibility. Native additions, moves and deletions SHALL update summary/action scope without repopulating deleted cards. Retained automatic membership SHALL remain unchanged as recovery data, not a second active editor for the linked layout.

#### Scenario: A native light is moved or deleted
- **WHEN** a compatible light card moves between source sections or is deleted
- **THEN** whole-group counts/actions reflect the saved selection and section actions follow its new placement
- **AND** cards hidden by native visibility still belong to the configured action scope

### Requirement: Linked popup group control safety
Linked group layouts SHALL retain whole-summary and section actions through reusable Marao action cards. Targets SHALL come only from compatible explicit source bindings. Shared capability, availability, disconnected, once-per-interaction and access-slide guards SHALL apply. Informational or unrelated cards SHALL NOT invent service targets.

#### Scenario: A cover layout contains access devices
- **WHEN** Open all is activated from a linked layout
- **THEN** the explicit action targets only eligible ordinary covers, with doors/gates/garages retaining their individual strict slides
- **AND** the native editor/preview dispatches no action
