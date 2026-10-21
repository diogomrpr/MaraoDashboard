# Spec Delta

## MODIFIED Requirements

### Requirement: Scroll containment and close clearance
Sheets SHALL scroll internally without background scrolling and keep the close control unobstructed at enlarged text/zoom and short heights. Containment SHALL recognize native Marao sheets, preserve value-slider touch defaults and leave native sheet movement to the browser, including initial zero-vertical movement and boundary reversals. CSS SHALL contain native-sheet overscroll. The backdrop SHALL remain guarded without cancelling touches inside the sheet.

#### Scenario: A fixed-height popup is scrolled at 200% zoom
- **WHEN** the last cards reach the visible area
- **THEN** they do not overlap the close control and can still be operated

#### Scenario: A value slider is dragged inside a scrolling sheet
- **WHEN** the gesture targets the native range
- **THEN** popup containment does not prevent horizontal value changes
- **AND** the browser retains native touch handling for initial zero-vertical movement and boundary reversals
