# Spec Delta

## ADDED Requirements

### Requirement: Concise card availability presentation
Partial Entity Group, legacy summary and room-light tiles SHALL retain normal usable counts/palettes without unavailable counts or member-warning rows. Individual availability cues SHALL omit entity names. Complete loss SHALL show only concise neutral status while retaining errors for recovery. Action guards, member-sheet statuses, availability distinctions and operational errors while usable SHALL remain intact.

#### Scenario: A group member goes unavailable
- **WHEN** at least one configured member remains usable
- **THEN** its aggregate tile keeps the usable count and normal palette without an added member-warning row
- **AND** member status remains available in its sheet and unsafe aggregate actions remain disabled

#### Scenario: An individual target has a long name
- **WHEN** its entity or an actual auxiliary target is unavailable
- **THEN** the availability cue is concise localized status text without repeating that target's name
- **AND** unavailable target actions stay disabled

#### Scenario: Retained errors coexist with complete loss
- **WHEN** a card becomes completely unavailable after an action/content error
- **THEN** only the concise availability status is displayed
- **AND** recovery can show the retained error until explicitly cleared by the existing retry/configuration rules
