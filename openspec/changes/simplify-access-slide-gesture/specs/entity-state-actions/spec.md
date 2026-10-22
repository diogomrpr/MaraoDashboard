# Spec Delta

## ADDED Requirements

### Requirement: Full-handle classic access slide
Strict access controls SHALL show a themed rounded track and a round draggable handle without a progressing background fill. Their concise label SHALL fade with handle travel and restore on reset. The full measured handle area SHALL accept pointer/touch starts, including edges; the surrounding track SHALL NOT start a gesture. Existing horizontal-intent, cancellation, target-availability, haptic and single-dispatch completion rules SHALL remain intact.

#### Scenario: Dragging from the outside of the handle
- **WHEN** pointer or touch input begins on any part of the rendered handle, including an edge or its arrow
- **THEN** the handle can follow deliberate horizontal travel without filling the background
- **AND** a valid completion on release dispatches once, while tap/partial/vertical/cancelled gestures do not dispatch

#### Scenario: A wrapped label changes track height
- **WHEN** layout changes the handle's vertical position
- **THEN** the start target follows its measured position and covers its complete area
- **AND** starting outside that area cannot trigger an opener even if followed by full travel
