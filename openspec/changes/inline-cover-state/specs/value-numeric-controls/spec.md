## ADDED Requirements

### Requirement: Inline ordinary cover state
Ordinary cover cards SHALL show a larger wrapping name and bold localized authoritative state inside a supported position bar. State SHALL float left while it fits before the target thumb, otherwise right if it fits there; if neither fits, it SHALL wrap in the roomier side with a left tie-break. They SHALL omit the duplicate subtitle, preserve custom labels and state hiding, and never shrink the thumb. Covers without a position bar SHALL retain state below the name.

#### Scenario: The left side can contain the label
- **WHEN** there is room for the complete label including its padding before the target thumb
- **THEN** the state floats against the left edge even if the right side has more room
- **AND** the text continues to reflect Home Assistant's authoritative state

#### Scenario: The left side becomes too narrow
- **WHEN** the thumb leaves too little room for the label on the left and the right side can contain it
- **THEN** the label floats against the right edge without overlapping the thumb

#### Scenario: Neither side can contain the complete label
- **WHEN** a narrow track or enlarged localized label cannot fit beside the thumb on either side
- **THEN** the full label wraps in the roomier side, preferring left on a tie
- **AND** the bar can grow without shrinking or overlapping the thumb

#### Scenario: Text metrics or available width change
- **WHEN** a state label, font or track width changes
- **THEN** the placement is recalculated from the actual label width and thumb position
- **AND** passive placement changes dispatch no service and emit no haptics

#### Scenario: Confirmed reports refresh a mounted slider
- **WHEN** an ordinary cover reports a new state or position
- **THEN** the visible state and semantic range description refresh while the compatible mounted range and its binding remain intact

#### Scenario: Position or visible state is unsupported
- **WHEN** a cover lacks position support or its configuration explicitly hides state
- **THEN** the unsupported bar is absent or the state stays hidden respectively
- **AND** availability guards and readable problem feedback retain their existing behavior
