# Spec Delta

## ADDED Requirements

### Requirement: Configurable people columns
People cards SHALL accept optional top-level integer `columns` from 1 through 6, defaulting to one when absent. Entries SHALL fill rows in saved order, left to right then down. The preference SHALL control the layout inside the card independently of native dashboard placement.

#### Scenario: Two columns are selected
- **WHEN** five people are configured with `columns: 2` and sufficient width
- **THEN** the card displays two entries in each of its first two rows and the fifth entry in the final row, preserving saved order

#### Scenario: An existing card omits columns
- **WHEN** a People card without `columns` loads
- **THEN** it retains its single-column presentation without rewriting saved configuration

#### Scenario: An incomplete row or empty list is rendered
- **WHEN** fewer people than columns are selected or the list is empty
- **THEN** every selected person appears once and an empty list retains its localized empty state without invented people

### Requirement: Readable responsive people columns
People cards SHALL reduce rendered columns below the saved preference when necessary to keep pictures, names and locations contained and readable at 320 CSS pixels and enlarged text. All entries SHALL remain visible in saved order, with wrapping text and content-driven height. Responsive reflow SHALL NOT change the saved preference or person state semantics.

#### Scenario: The available width shrinks
- **WHEN** a multi-column People card cannot fit readable entries in its current host
- **THEN** it reflows to fewer columns without horizontal page scrolling, clipped names or lost locations
- **AND** widening the host restores the preferred count when space permits

#### Scenario: Text is enlarged or state changes
- **WHEN** text is enlarged to 200% or a person's location becomes a long named place or unavailable
- **THEN** entries wrap and remain readable, each person's availability remains independent, and no service call is dispatched
