## ADDED Requirements

### Requirement: Navbar touch barrier
Active floating navigation SHALL block page pointer interactions and touch
scrolling across the viewport width from the navbar's top edge to the bottom.
The barrier SHALL be invisible and non-focusable. Navbar controls and higher
popups SHALL remain operable. Bounded previews SHALL omit the barrier.

#### Scenario: Touching beside or below navigation
- **WHEN** a user taps or starts a touch gesture in that strip outside navbar controls
- **THEN** underlying cards do not activate or scroll
- **AND** an open overflow menu closes

#### Scenario: Using navigation and popups
- **WHEN** a user operates a navbar control or an open popup
- **THEN** existing navigation and popup interaction remain available

#### Scenario: Previewing or leaving navigation
- **WHEN** navigation is previewed, hidden, empty or removed
- **THEN** it does not leave a viewport touch barrier
