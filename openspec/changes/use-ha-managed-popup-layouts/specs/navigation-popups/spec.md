# Spec Delta

## ADDED Requirements

### Requirement: HA-managed popup view rendering
A linked popup SHALL render its saved same-dashboard Sections view through HA's native layout host, retaining card sizing, ordering and visibility. Marao SHALL retain its modal shell, internal scrolling, safe-area/column-width placement, title, close and focus lifecycle. Different card heights SHALL remain independent rather than inheriting automatic group equalization.

#### Scenario: A saved source is shown as a popup
- **WHEN** a linked popup opens
- **THEN** its native cards use the source's configured grid spans within the available popup width
- **AND** closing releases content/listeners, background inertness and focus normally

### Requirement: Popup view source errors and inert editing
Missing, ambiguous, unsupported or non-Sections popup references SHALL show a localized readable error without modifying data or falling back to generated defaults. Native edit/preview mode SHALL prevent popup/device actions. Native source changes SHALL refresh the linked content from HA; unrelated state updates SHALL preserve mounted inputs and controls.

#### Scenario: A source is deleted or renamed
- **WHEN** a saved popup reference no longer resolves uniquely
- **THEN** the popup explains the source problem and leaves the card/view data untouched

#### Scenario: Editing takes ownership
- **WHEN** the source is opened in native editing or its owner is removed
- **THEN** the popup closes safely and cannot intercept or dispatch editor interactions
