## ADDED Requirements

### Requirement: Content-driven popup height with top clearance
All shared popups SHALL default to content-driven height up to the viewport's
available safe area, leaving at least 50 CSS pixels above the sheet or the top
safe inset when larger. Generated popup families SHALL share this behavior.
Explicit fixed/max height settings SHALL remain supported within these bounds.

#### Scenario: Short and long sheets
- **WHEN** popup content fits in a short sheet
- **THEN** the sheet retains compact bottom placement
- **WHEN** more content requires a taller sheet
- **THEN** the sheet grows up to the top clearance and scrolls internally
- **AND** the title and close button remain visible above the navbar
