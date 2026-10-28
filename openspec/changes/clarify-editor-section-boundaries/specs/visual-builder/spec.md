# Spec Delta

## ADDED Requirements

### Requirement: Clear Visual section boundaries
Each Visual editor section SHALL have a rounded outline, a subtle themed surface and consistent inner padding, visibly separating it from adjacent sections. Its heading and existing section controls SHALL occupy a distinct header row with a thin divider above its content. Inner card outlines SHALL remain visually subordinate to the section boundary.

#### Scenario: Several populated sections are expanded
- **WHEN** the administrator opens a page containing multiple sections
- **THEN** each section reads as one bounded group with a distinct header and visibly separated sibling containers
- **AND** individual cards remain distinguishable without competing heavy outlines

#### Scenario: Empty or flat content is shown
- **WHEN** the page contains an empty section or uses the existing flat-page representation
- **THEN** its existing editor section has the same visible boundary and header treatment
- **AND** presentation does not convert the saved format or insert any default section or card

### Requirement: Visible section action ownership
The Add card plus SHALL appear inside its owning section container after that section's card list. Add section SHALL remain outside all section containers at page-body level. Existing section tools SHALL remain in their section header, with unchanged labels, actions and touch targets.

#### Scenario: Add actions appear together
- **WHEN** the administrator reaches the end of a section or page
- **THEN** the section boundary encloses its Add card control and ends before the page-level Add section control
- **AND** each action retains its current target and draft-only behavior

### Requirement: Compact mobile section hierarchy
Section styling SHALL use Marao light/dark theme tokens and preserve readable text, visible controls of at least 48 by 48 CSS pixels, and horizontal containment at the supported mobile sizes and text scales. Normal section and card boundaries SHALL remain distinct without relying on color alone. Presentation SHALL preserve existing selection, expansion, layout and drag/drop behavior.

#### Scenario: A narrow or enlarged editor is used
- **WHEN** sections are shown at 320 CSS pixels or with enlarged text or zoom
- **THEN** headings and tools wrap within the section, content remains scrollable and controls do not shrink or become clipped
- **AND** inner padding does not force horizontal page overflow or reduce existing configured columns

#### Scenario: A section changes or a card moves
- **WHEN** an existing section is added, reordered or edited, or a card moves between sections
- **THEN** the same container treatment follows the current section and its controls
- **AND** unrelated sections, card identities, draft contents and saved output retain their existing behavior
