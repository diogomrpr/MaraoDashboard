# Spec Delta

## MODIFIED Requirements

### Requirement: Scroll containment and close clearance
Sheets SHALL scroll internally without background scrolling. Content clearance
SHALL keep the close control unobstructed at enlarged text/zoom and short heights.
Scroll containment SHALL recognize native Marao sheets and preserve value-slider
touch defaults instead of cancelling the slider's touch movement. Tapping a numeric chart SHALL select a reading without capturing vertical scrolling or disabling browser zoom.

#### Scenario: A fixed-height popup is scrolled at 200% zoom
- **WHEN** the last cards reach the visible area
- **THEN** they do not overlap the close control and can still be operated

#### Scenario: A value slider is dragged inside a scrolling sheet
- **WHEN** the gesture targets the native range
- **THEN** popup containment does not prevent horizontal value changes

#### Scenario: A user scrolls over the chart
- **WHEN** a vertical touch gesture starts on the numeric plot
- **THEN** the sheet scrolls normally while the background stays still
- **AND** the gesture does not dispatch a card action or become a hidden chart pan

#### Scenario: A user inspects a reading
- **WHEN** the user taps the plot without scrolling
- **THEN** the selected reading appears outside the plot
- **AND** sheet scrolling, close clearance and page zoom remain usable

## ADDED Requirements

### Requirement: History detail drill-in navigation
Numeric history opened from an existing Marao sheet SHALL replace its visible content within one modal layer and expose Back to restore the parent content, scroll and invoking control. Opening from a dashboard SHALL use the same sheet presentation. Close, browser Back and route changes SHALL preserve focus/inert cleanup and the active dashboard root without rewriting configured popup hashes.

#### Scenario: A graph is inside a climate or group sheet
- **WHEN** its History control opens detail
- **THEN** one modal remains active and the original content is retained for return
- **AND** Back restores the parent sheet at its previous scroll position with focus on the matching History control

#### Scenario: The user closes drill-in history
- **WHEN** the sheet's Close control is activated
- **THEN** the modal closes, retained parent content is released and background usability is restored
- **AND** focus returns to the original dashboard opener where available

#### Scenario: Browser Back leaves chart detail
- **WHEN** a chart-detail navigation entry is current
- **THEN** Back returns to its prior sheet or dashboard context
- **AND** Forward restores only still-valid context within the same dashboard view without persisting chart settings

#### Scenario: The active view changes during history loading
- **WHEN** navigation replaces the owning view
- **THEN** history detail and retained parent content close and their pending work is invalidated
- **AND** focus/inert state and the normal shell remain correct after leaving Marao
